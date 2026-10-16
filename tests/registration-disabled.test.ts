import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/auth/signup/route';

test('public signup is rejected before parsing credentials or creating accounts', async () => {
  const response = await POST();
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /暂不开放注册/);
  assert.equal(response.headers.get('set-cookie'), null);
});
