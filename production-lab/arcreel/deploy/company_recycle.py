"""Archive only this actor's project files before the native delete completes."""
import hashlib
import os
from pathlib import Path
import shutil
import sqlite3
import uuid


def preflight_delete(database=Path('/state/arcreel.db'), recycle=Path('/fg-recycle')):
    with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as db:
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if 'tasks' not in tables or 'agent_sessions' not in tables:
            raise RuntimeError('任务状态尚未就绪，工程未删除')
        for table in ('tasks', 'agent_sessions'):
            columns = {row[1] for row in db.execute('PRAGMA table_info("' + table + '")')}
            if 'status' not in columns:
                raise RuntimeError('任务状态无法确认，工程未删除')
            if db.execute('SELECT 1 FROM "' + table + '" WHERE status IN (?,?,?,?,?,?,?) LIMIT 1',
                          ('running', 'queued', 'pending', 'generating', 'submitted', 'processing', 'waiting_approval')).fetchone():
                raise RuntimeError('请等待当前制作任务或 Agent 结束后删除工程')
    if recycle.is_symlink() or (recycle / '.fg-recycle-ready').read_text() != 'FG actor recycle v1\n':
        raise RuntimeError('NAS 回收目录未就绪，工程未删除')
    probe = recycle / ('.probe-' + uuid.uuid4().hex)
    try:
        with probe.open('xb') as stream:
            stream.write(b'FG archive write check'); stream.flush(); os.fsync(stream.fileno())
    finally:
        probe.unlink(missing_ok=True)


def inventory(root):
    result = {}
    for item in sorted(root.rglob('*')):
        relative = str(item.relative_to(root))
        if item.is_symlink():
            result[relative] = ('link', os.readlink(item))
        elif item.is_file():
            digest = hashlib.sha256()
            with item.open('rb') as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(chunk)
            result[relative] = ('file', digest.hexdigest())
        elif item.is_dir():
            result[relative] = ('directory', '')
        else:
            raise ValueError('工程包含不支持归档的特殊文件')
    return result


def archive_project(source, workspace=Path('/workspace'), recycle=Path('/fg-recycle')):
    source, workspace, recycle = Path(source), Path(workspace), Path(recycle)
    if source.is_symlink() or source.resolve().parent != workspace.resolve():
        raise ValueError('只允许归档本账户的工程目录')
    if not source.is_dir():
        raise FileNotFoundError(source)
    if recycle.is_symlink() or not recycle.is_dir():
        raise RuntimeError('NAS recycle/arcreel 尚未挂载，工程未删除')
    if (recycle / '.fg-recycle-ready').read_text() != 'FG actor recycle v1\n':
        raise RuntimeError('NAS 回收目录标记无效，工程未删除')
    identity = source.name + '-' + uuid.uuid4().hex
    temporary = recycle / ('.pending-' + identity)
    destination = recycle / identity
    before = inventory(source)
    # The actor's media and archive use separate bind mounts, so rename alone
    # returns EXDEV. Verify a complete copy before removing the source tree.
    shutil.copytree(source, temporary, symlinks=True)
    if inventory(temporary) != before or inventory(source) != before:
        raise RuntimeError('工程归档校验未通过，原工程仍保留')
    temporary.rename(destination)
    try:
        shutil.rmtree(source)
    except OSError:
        # A partial source removal must not roll back records onto incomplete
        # media. The verified full archive remains authoritative and recoverable.
        shutil.copytree(destination, source, symlinks=True, dirs_exist_ok=True)
        raise
    return destination


def install():
    from lib.project.project_manager import ProjectManager

    def delete(self, name):
        archive_project(self.get_project_path(name))

    ProjectManager.delete_project_directory = delete
