import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isPublicDemo,publicDemoMainPathAllowed} from '../lib/auth/public-demo';
test('public demo is identified on the server and legacy company areas remain inaccessible',()=>{
 assert.equal(isPublicDemo('TEST@BEVA.COM'),true);
 assert.equal(isPublicDemo('member@beva.com'),false);
 for(const path of ['/chat','/projects','/api/chat','/api/creator/canvases','/api/local/storage/content','/api/production-lab','/api/admin','/me'])assert.equal(publicDemoMainPathAllowed(path),false,path);
 for(const path of ['/api/auth/session','/api/auth/signout','/workspace'])assert.equal(publicDemoMainPathAllowed(path),true,path);
});
