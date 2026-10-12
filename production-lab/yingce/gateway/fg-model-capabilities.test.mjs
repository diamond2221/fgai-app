import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {capabilities} from './fg-model-capabilities.mjs';
const specs=JSON.parse(fs.readFileSync(new URL('./model-specs.json',import.meta.url)));
const profile=id=>capabilities(specs.find(s=>s.id===id));
test('official profiles cover every configured model without reseller parameter fallbacks',()=>{
 for(const spec of specs){
  assert.deepEqual(capabilities({...spec,price:{capabilities:{params:{duration:{values:[999]},resolution:{values:['invalid']},aspectRatio:{values:['invalid']}}}}}),capabilities(spec),spec.id);
 }
});
test('different official model contracts remain distinct',()=>{
 assert.equal(profile('wan3.0-video').video.duration.values.at(-1),30);
 assert.equal(profile('dreamina-seedance-2-5-filter-off').video.duration.values.at(-1),30);
 assert.equal(profile('doubao-seedance-2-0-fast-filter-off').video.duration.values.at(-1),15);
 assert.deepEqual(profile('doubao-seedance-2-0-fast-filter-off').video.resolutions,['480p','720p']);
 assert.equal(profile('dola-seedream-5-0-pro-260628').image.references.maxImages,10);
 assert.ok(profile('dola-seedream-5-0-pro-260628').image.size.presets.some(p=>p.tier==='1.5k'));
 assert.ok(profile('gemini-3.1-flash-image-preview').image.size.values.includes('1:8'));
 assert.ok(!profile('gemini-3-pro-image-preview').image.size.values.includes('1:8'));
 assert.ok(!profile('gpt-image-2').image.quality.values.includes('xhigh'));
 assert.ok(profile('gpt-image-2.5-flare').image.quality.values.includes('xhigh'));
 assert.equal(profile('happyhorse-1.1-r2v').video.references.minImageSide,400);
 assert.deepEqual(profile('happyhorse-1.1-i2v').video.ratios,['adaptive']);
});
