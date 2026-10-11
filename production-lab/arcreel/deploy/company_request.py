"""Give each SDK operation an identity and retain its FG task for billing."""
from contextvars import ContextVar
from uuid import uuid4
import re

fg_task = ContextVar('fg_task', default=None)

def install_video_settlement(ledger):
    """Carry the returned job identity out of Ark's worker thread into settlement.

    asyncio.to_thread copies context into the worker, but does not copy changes
    back. The backend result is the durable identity used for both generation
    and resume; never infer a task from another concurrent request.
    """
    original = ledger._settlement_from_result

    def settlement(call_type, result, **kwargs):
        value = original(call_type, result, **kwargs)
        if call_type == 'video':
            task_id = getattr(result, 'task_id', None)
            valid = isinstance(task_id, str) and re.fullmatch(
                r'(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})', task_id)
            fg_task.set(task_id if valid else None)
        return value

    ledger._settlement_from_result = settlement

def sdk_operation_env(env, base):
    """The Claude SDK sends from its Node subprocess, outside Python httpx."""
    if env.get('ANTHROPIC_BASE_URL', '').rstrip('/') not in (base, base + '/v1'):
        return env
    lines = [line for line in env.get('ANTHROPIC_CUSTOM_HEADERS', '').splitlines()
             if line.split(':', 1)[0].strip().lower() != 'x-fg-operation-id']
    # One SDK process keeps this ID across transport retries. The gateway also
    # hashes the request body, so distinct tool turns retain distinct FG tasks.
    return {**env, 'ANTHROPIC_CUSTOM_HEADERS': '\n'.join([
        *lines, 'x-fg-operation-id: ' + str(uuid4())])}

def install_sdk(base):
    from server.agent_runtime.options_assembler import OptionsAssembler
    original = OptionsAssembler.build

    async def build(self, *args, **kwargs):
        options = await original(self, *args, **kwargs)
        options.env = sdk_operation_env(options.env or {}, base)
        return options

    OptionsAssembler.build = build

def install(base, capability=''):
    import httpx
    original = httpx.AsyncClient.send
    original_sync = httpx.Client.send

    def prepare(request, kwargs):
        managed = str(request.url).startswith(base + '/v1/')
        if capability and request.method == 'GET' and str(request.url).startswith(base + '/v1/media/'):
            request.headers['authorization'] = 'Bearer ' + capability
            kwargs['follow_redirects'] = False
        if managed and request.method == 'POST':
            # The request object retains its identity if a transport reuses it.
            # A deliberate new generation, even with identical text, is new.
            if 'x-fg-operation-id' not in request.headers:
                request.headers['x-fg-operation-id'] = str(uuid4())
            fg_task.set(None)
        return managed

    def remember(request, response, managed):
        if managed and response.headers.get('x-fg-task-id'):
            fg_task.set(response.headers['x-fg-task-id'])
        return response

    async def send(self, request, **kwargs):
        managed = prepare(request, kwargs)
        response = await original(self, request, **kwargs)
        return remember(request, response, managed)

    def send_sync(self, request, **kwargs):
        # Ark's video SDK uses httpx.Client from its worker thread. It needs the
        # same admission identity as the asynchronous image/text adapters.
        managed = prepare(request, kwargs)
        response = original_sync(self, request, **kwargs)
        return remember(request, response, managed)

    httpx.AsyncClient.send = send
    httpx.Client.send = send_sync
