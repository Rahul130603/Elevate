import test from 'node:test';
import assert from 'node:assert/strict';
import { NEWS_TARGET } from '../services/newsService.js';
test('news worker proxy targets local FastAPI only',()=>{
  assert.equal(new URL(NEWS_TARGET).hostname,'127.0.0.1');
});
