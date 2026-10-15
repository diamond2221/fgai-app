#!/usr/bin/env bash

# Share the archive lifecycle across deployment, rollback and NAS recreation.
# 部署、回滚和 NAS 重建共用归档生命周期，先确认跟随连接再替换容器。
fg_app_archive_container() {
  local project="$1" containers
  # Archive exited containers too; ambiguous service instances must not be guessed.
  # 归档也包含已退出容器；同一服务存在多个候选时拒绝猜测，避免遗漏或误归档。
  containers="$(run_with_timeout 5 docker ps -a \
    --filter "label=com.docker.compose.project=$project" \
    --filter "label=com.docker.compose.service=app" --format '{{.ID}}')" || return 1
  if [[ "$containers" == *$'\n'* ]]; then
    printf 'App archive: multiple App containers found for project %s; recreation must defer\n' "$project" >&2
    return 1
  fi
  printf '%s' "$containers"
}

fg_app_archive_start() {
  local container="$1" reason="$2" root="$3" attempt running
  FG_APP_ARCHIVE_PID=""
  FG_APP_ARCHIVE_STAGE=""
  [[ -n "$container" ]] || return 0
  (umask 077; mkdir -p "$root") || return 1
  FG_APP_ARCHIVE_STAGE="$(mktemp -d "$root/.app-follow.XXXXXX")" || return 1
  /usr/bin/python3 - "$container" "$reason" "$root" "$FG_APP_ARCHIVE_STAGE" "$$" <<'PY' &
import datetime
import os
import re
import selectors
import signal
import subprocess
import sys
import time

os.umask(0o077)
container, reason, root, stage, parent = sys.argv[1:]
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
basename = f"app-{stamp}-{container[:12]}-{reason}-{os.getpid()}"
temporary = os.path.join(stage, "stream")
ready = os.path.join(stage, "ready")
status = os.path.join(stage, "status")
process = None
cancelled = False

def cancel(signum, frame):
    global cancelled
    cancelled = True

def stop_cli():
    # This isolated group contains only our docker logs CLI, never a daemon or container.
    # 独立进程组只含本次 docker logs CLI，禁止向 daemon 或容器发送信号。
    if process is None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        process.wait(timeout=1)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=1)

signal.signal(signal.SIGTERM, cancel)
signal.signal(signal.SIGINT, cancel)
success = False
failure = "capture incomplete"
buffer = b""
try:
    with open(temporary, "wb") as output:
        output.write(f"# container={container}\n# reason={reason}\n".encode())
        output.flush()
        # A separate CLI watchdog survives a capture-worker crash and bounds orphaned CLI lifetime.
        # 独立 CLI watchdog 即使归档 worker 崩溃也限制子进程寿命，进程组仅含本次 CLI。
        watchdog = (
            "import os,signal,subprocess,sys;"
            "signal.signal(signal.SIGALRM,lambda *_: os.killpg(os.getpgrp(),signal.SIGKILL));"
            "signal.alarm(150);"
            "p=subprocess.Popen(sys.argv[1:]);"
            "sys.exit(p.wait())"
        )
        process = subprocess.Popen(
            [sys.executable, "-c", watchdog, "docker", "logs", "--follow", "--timestamps", container],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True,
        )
        with open(os.path.join(stage, "cli-started"), "w") as marker:
            marker.write(str(process.pid))
        deadline = time.monotonic() + 150
        selector = selectors.DefaultSelector()
        selector.register(process.stdout, selectors.EVENT_READ)
        ended = False
        while time.monotonic() < deadline and not cancelled:
            try:
                os.kill(int(parent), 0)
            except ProcessLookupError:
                failure = "archive owner exited"
                break
            for key, _ in selector.select(timeout=0.2):
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    ended = True
                    break
                buffer += chunk
                rows = buffer.split(b"\n")
                buffer = rows.pop()
                for row in rows:
                    if re.match(rb"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z\s", row):
                        output.write(row + b"\n")
                        output.flush()
                        if not os.path.exists(ready):
                            with open(ready, "w") as marker:
                                marker.write("connected")
            if ended:
                code = process.wait(timeout=1)
                success = code == 0 and not buffer
                failure = f"docker logs exit={code}; incomplete-line={bool(buffer)}"
                break
        else:
            failure = "capture cancelled" if cancelled else "capture deadline exceeded"
        selector.close()
        stop_cli()
        output.write(("# capture_status=" + ("complete" if success else "partial") + "\n").encode())
        output.flush()
        os.fsync(output.fileno())
    destination = os.path.join(root, basename + (".log" if success else "-partial.log"))
    os.replace(temporary, destination)
    if success and not os.path.exists(ready):
        with open(ready, "w") as marker:
            marker.write("normal EOF")
    if not success:
        print(f"App archive: partial capture retained at {destination}: {failure}", file=sys.stderr)
    with open(status, "w") as result:
        result.write("0" if success else "1")
except Exception as error:
    print(f"App archive: capture failed: {error}", file=sys.stderr)
    try:
        stop_cli()
    except Exception as cleanup_error:
        print(f"App archive: CLI cleanup failed: {cleanup_error}", file=sys.stderr)
    # Publish complete records already captured even when finalization itself failed.
    # 即使收尾异常也发布已捕获的完整行，发布失败才保留隐藏 staging 并明确记录。
    try:
        if os.path.exists(temporary):
            with open(temporary, "ab") as output:
                output.write(b"# capture_status=partial\n")
                output.flush()
                os.fsync(output.fileno())
            destination = os.path.join(root, basename + "-partial.log")
            os.replace(temporary, destination)
            print(f"App archive: partial capture retained at {destination}", file=sys.stderr)
        else:
            print(f"App archive: no unpublished capture remains at {stage}", file=sys.stderr)
    except Exception as publication_error:
        print(f"App archive: partial publication failed; staging remains at {stage}: {publication_error}", file=sys.stderr)
    try:
        with open(status, "w") as result:
            result.write("1")
    except Exception as status_error:
        print(f"App archive: cannot record failure status at {stage}: {status_error}", file=sys.stderr)
PY
  FG_APP_ARCHIVE_PID=$!
  for attempt in {1..50}; do
    if [[ -f "$FG_APP_ARCHIVE_STAGE/status" ]]; then
      [[ "$(<"$FG_APP_ARCHIVE_STAGE/status")" == 0 && -f "$FG_APP_ARCHIVE_STAGE/ready" ]] && return 0
      break
    fi
    [[ -f "$FG_APP_ARCHIVE_STAGE/ready" ]] && return 0
    sleep 0.1
  done
  # Docker CLI exposes no empty-stream acknowledgment: confirm empty history and live control plane.
  # Docker CLI 没有空流连接确认；空历史场景以受限历史读取、同容器运行状态及跟随进程存活确认。
  if [[ ! -f "$FG_APP_ARCHIVE_STAGE/status" && -f "$FG_APP_ARCHIVE_STAGE/cli-started" ]] \
    && run_with_timeout 5 docker logs --tail 1 --timestamps "$container" > "$FG_APP_ARCHIVE_STAGE/history" 2>&1 \
    && [[ ! -s "$FG_APP_ARCHIVE_STAGE/history" ]] \
    && running="$(run_with_timeout 5 docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null)" \
    && [[ "$running" == true && ! -f "$FG_APP_ARCHIVE_STAGE/status" ]] \
    && kill -0 "$FG_APP_ARCHIVE_PID" 2>/dev/null; then
    printf 'App archive: empty history confirmed for running container %s; follow process remains active (best effort)\n' "$container" >&2
    return 0
  fi
  [[ -f "$FG_APP_ARCHIVE_STAGE/ready" && ! -f "$FG_APP_ARCHIVE_STAGE/status" ]] && return 0
  printf 'App archive: follow readiness unavailable for %s; recreation must defer\n' "$container" >&2
  fg_app_archive_cancel
  return 1
}

fg_app_archive_finish() {
  local status=1 attempt
  [[ -n "${FG_APP_ARCHIVE_PID:-}" ]] || return 0
  # The worker enforces a 150-second deadline; it always closes only its own CLI tree.
  # worker 限制 150 秒期限，只清理自己启动的 CLI 进程树，不停止生产服务。
  for attempt in {1..155}; do
    [[ -f "$FG_APP_ARCHIVE_STAGE/status" ]] && break
    kill -0 "$FG_APP_ARCHIVE_PID" 2>/dev/null || break
    sleep 1
  done
  if [[ ! -f "$FG_APP_ARCHIVE_STAGE/status" ]] && kill -0 "$FG_APP_ARCHIVE_PID" 2>/dev/null; then
    printf 'App archive: finish deadline exceeded; capture remains incomplete\n' >&2
    fg_app_archive_cancel
    return 1
  fi
  wait "$FG_APP_ARCHIVE_PID" || true
  [[ -f "$FG_APP_ARCHIVE_STAGE/status" ]] && status="$(<"$FG_APP_ARCHIVE_STAGE/status")"
  FG_APP_ARCHIVE_PID=""
  [[ "$status" == 0 ]]
}

fg_app_archive_cancel() {
  local attempt
  [[ -n "${FG_APP_ARCHIVE_PID:-}" ]] || return 0
  kill -TERM "$FG_APP_ARCHIVE_PID" 2>/dev/null || true
  for attempt in {1..30}; do
    kill -0 "$FG_APP_ARCHIVE_PID" 2>/dev/null || break
    sleep 0.1
  done
  if kill -0 "$FG_APP_ARCHIVE_PID" 2>/dev/null; then
    kill -KILL "$FG_APP_ARCHIVE_PID" 2>/dev/null || true
  fi
  wait "$FG_APP_ARCHIVE_PID" 2>/dev/null || true
  FG_APP_ARCHIVE_PID=""
}
