import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleReply} from './turn-stream.mjs';
test('incremental replies do not expose JSON actions or incomplete escapes',()=>{
 assert.equal(visibleReply('{"reply":"你好\\n世'),'你好\n世');
 assert.equal(visibleReply('{"reply":"\\u4f60\\u'),'你');
 assert.equal(visibleReply('{"reply":"已收到","actions":[{"type":"delete"}]}'),'已收到');
 assert.equal(visibleReply('{"act'),'');assert.equal(visibleReply('你好'),'你好');
});
