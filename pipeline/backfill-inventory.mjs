import {promises as fs} from 'node:fs';
import {load} from 'cheerio';
import {readJSON,writeJSON} from './storage.mjs';
import {hash} from './core.mjs';
const state=await readJSON('data/state.json'),rows=[];
for(const file of await fs.readdir('data/retrievals')) {
  const r=await readJSON(`data/retrievals/${file}`);
  if(r.sourceId!=='lequebecvote'||!r.url.includes('/sondages/'))continue;
  const $=load(await fs.readFile(r.file));
  const references=$('a[href]').toArray().map(el=>$(el).attr('href')).filter(u=>/^https:\/\//.test(u));
  const matches=state.events.filter(e=>e.sources.some(s=>references.includes(s.url))).map(e=>e.id);
  rows.push({id:hash(r.url).slice(0,24),inventoryUrl:r.url,inventoryTitle:$('h1').first().text().trim(),evidenceHash:r.sha256,referenceUrls:[...new Set(references)],status:matches.length?'linked-to-accepted-source':'needs-primary-reconciliation',possibleAcceptedEvents:matches,note:'Inventory row dates are retained as labels only; not interpreted as fieldwork end or publication date.'});
}
await writeJSON('data/backfill-inventory.json',[...new Map(rows.map(r=>[r.id,r])).values()].sort((a,b)=>a.inventoryUrl.localeCompare(b.inventoryUrl)));
console.log(`${rows.length} historical source leads inventoried`);
