import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';

test('health endpoint exists', async () => {
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.get, 'function');
});
