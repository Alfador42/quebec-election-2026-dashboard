import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {legerTable,pallasTable} from '../pipeline/parsers.mjs';
import {discoverLinks} from '../pipeline/retrieval.mjs';
// Archived factual table fixtures; no live requests. The full archived PDF remains the authority.
const read=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}`,import.meta.url)));
test('Léger selects decided column rather than all respondent or historical column',()=>{const r=legerTable(read('leger-table.json'));assert.equal(r.reportedValues.PQ,'29%');assert.equal(r.sampleSize,1008);assert.equal(r.baseN,859);assert.equal(r.undecided,9);});
test('Pallas selects provincial total and preserves decimals',()=>{const r=pallasTable(read('pallas-table.json'));assert.equal(r.reportedValues.CAQ,'23.6%');assert.equal(r.reportedValues.PQ,'28.8%');assert.equal(r.baseN,1040);});
test('changed headings, missing party and duplicate tables fail closed',()=>{const p=read('leger-table.json');assert.throws(()=>legerTable([...p,...p]));assert.throws(()=>legerTable([{...p[0],text:p[0].text.replace('VOTEP .','FEDERAL .')} ]));assert.throws(()=>legerTable([{...p[0],text:p[0].text.replace('Le Parti Québécois','Unknown party')} ]));});
test('RSS discovers unseen publisher as a review lead',()=>{const r=discoverLinks('<rss><channel><item><title>Québec poll</title><link>https://new-firm.example/quebec</link></item></channel></rss>','https://qc125.com/',{});assert.equal(r[0].kind,'new-source-candidate');assert.equal(r[0].title,'Québec poll');});
