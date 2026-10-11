"""Free transport checks: no provider credentials or paid requests."""
import asyncio
import unittest
import httpx
from company_request import install, fg_task, sdk_operation_env, install_video_settlement
from types import SimpleNamespace

BASE = 'http://fg-gateway:3010/internal/arcreel/test'
install(BASE, 'fixture-capability')

class RequestTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_ledger_success_inherits_native_video_identity(self):
        import lib.billing.ledger as ledger
        original = ledger._settlement_from_result
        try:
            install_video_settlement(ledger)
            identity = 'c0899265137bd30a97aff5ed86b6a2b0'
            call = ledger.LedgerCall(1, call_type='video', service_tier='default')
            call.success(SimpleNamespace(task_id=identity, usage_tokens=None,
                                         generate_audio=False, duration_seconds=4))
            async def write():
                return fg_task.get(), call._settlement.billed_duration_seconds
            self.assertEqual(await asyncio.create_task(write()), (identity, 4))
        finally:
            ledger._settlement_from_result = original

    async def test_video_thread_result_reaches_settlement_and_resume_without_cross_task_leak(self):
        ledger = SimpleNamespace(_settlement_from_result=lambda kind, result, **kw: (kind, result))
        install_video_settlement(ledger)
        ids = ['a'*32, 'b'*32]

        async def settle(task_id):
            fg_task.set('unrelated')
            await asyncio.to_thread(fg_task.set, task_id)
            self.assertEqual(fg_task.get(), 'unrelated')
            result = SimpleNamespace(task_id=task_id)
            self.assertEqual(ledger._settlement_from_result('video', result), ('video', result))
            async def write():
                await asyncio.sleep(0)
                return fg_task.get()
            return await asyncio.create_task(write())

        self.assertEqual(await asyncio.gather(*(settle(i) for i in ids)), ids)
        self.assertNotIn(fg_task.get(), ids)
        fg_task.set(ids[0])
        ledger._settlement_from_result('video', SimpleNamespace(task_id='unknown-provider-task'))
        self.assertIsNone(fg_task.get())
        fg_task.set(ids[1])
        ledger._settlement_from_result('image', SimpleNamespace())
        self.assertEqual(fg_task.get(), ids[1])
    def test_synchronous_ark_submit_keeps_operation_identity_and_task(self):
        seen = []

        def respond(request):
            seen.append(request.headers.get('x-fg-operation-id'))
            return httpx.Response(200, headers={'x-fg-task-id': 'video-task'}, json={})

        with httpx.Client(transport=httpx.MockTransport(respond)) as client:
            request = client.build_request('POST', BASE+'/v1/contents/generations/tasks', json={})
            client.send(request)
            self.assertEqual(fg_task.get(), 'video-task')
            client.send(request)
            client.post(BASE+'/v1/contents/generations/tasks', json={})
            client.post(BASE+'-other/v1/contents/generations/tasks', json={})
        self.assertIsNotNone(seen[0])
        self.assertEqual(seen[0], seen[1])
        self.assertNotEqual(seen[1], seen[2])
        self.assertIsNone(seen[3])

    def test_sdk_process_identity_preserves_headers_and_unrelated_providers(self):
        source = {'ANTHROPIC_BASE_URL': BASE, 'ANTHROPIC_CUSTOM_HEADERS': 'x-fixture: preserved\nx-fg-operation-id: stale'}
        first = sdk_operation_env(source, BASE)
        second = sdk_operation_env(source, BASE)
        self.assertIn('x-fixture: preserved', first['ANTHROPIC_CUSTOM_HEADERS'])
        self.assertNotIn('stale', first['ANTHROPIC_CUSTOM_HEADERS'])
        self.assertEqual(first['ANTHROPIC_CUSTOM_HEADERS'].count('x-fg-operation-id:'), 1)
        self.assertNotEqual(first['ANTHROPIC_CUSTOM_HEADERS'], second['ANTHROPIC_CUSTOM_HEADERS'])
        self.assertIn('stale', source['ANTHROPIC_CUSTOM_HEADERS'])
        other = {'ANTHROPIC_BASE_URL': BASE+'-other'}
        self.assertIs(sdk_operation_env(other, BASE), other)

    async def test_download_auth_never_reaches_another_actor_or_external_url(self):
        seen = []
        def respond(request):
            seen.append(request.headers.get('authorization'))
            return httpx.Response(200)
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            await client.get(BASE+'/v1/media/result')
            await client.get(BASE+'-other/v1/media/result')
            await client.get('http://other/result')
        self.assertEqual(seen, ['Bearer fixture-capability', None, None])

    async def test_explicit_regeneration_and_transport_replay(self):
        seen = []
        def respond(request):
            seen.append(request.headers.get('x-fg-operation-id'))
            return httpx.Response(200, headers={'x-fg-task-id': 'owned-task'}, json={})
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            request = client.build_request('POST', BASE+'/v1/images/generations', json={'prompt':'same'})
            await client.send(request)
            self.assertEqual(fg_task.get(), 'owned-task')
            await client.send(request)
            await client.post(BASE+'/v1/images/generations', json={'prompt':'same'})
            self.assertEqual(seen[0], seen[1])
            self.assertNotEqual(seen[1], seen[2])
            await client.get('http://unrelated/health')
            self.assertIsNone(seen[3])

if __name__ == '__main__':
    unittest.main()
