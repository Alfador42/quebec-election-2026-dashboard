import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {hash,normalize,buildDataset,ingest} from '../pipeline/core.mjs';
const state=JSON.parse(readFileSync(new URL('../data/state.json',import.meta.url)));
test('accepted dataset validates and every source has matching immutable bytes',()=>{
  const files=readdirSync(new URL('../data/evidence/',import.meta.url));
  for(const event of state.events) for(const revision of event.revisions) {
    assert.deepEqual(normalize(revision.poll,'2026-10-05').errors,[]);
    for(const source of revision.poll.sources) {
      const file=files.find(f=>f.startsWith(source.evidenceHash+'.'));assert.ok(file,source.url);
      assert.equal(hash(readFileSync(new URL(`../data/evidence/${file}`,import.meta.url))),source.evidenceHash);
    }
  }
});
test('repeated production submissions do not change historical averages or event count',()=>{
  const copy=structuredClone(state),before=buildDataset(copy,'2026-10-05');
  for(const event of state.events) {
    const p=event.revisions.find(r=>r.id===event.activeRevisionId).poll;
    assert.equal(ingest(copy,p,{now:'2026-10-05T23:59:00Z'}).kind,'duplicate');
  }
  const after=buildDataset(copy,'2026-10-05');
  assert.equal(copy.events.length,state.events.length);assert.equal(before.datasetHash,after.datasetHash);assert.deepEqual(before.series,after.series);
});
