import { promises as fs } from 'node:fs';
import path from 'node:path';
import { localDay,frozen,hash,buildDataset,ingest,resolveReview,sources } from './core.mjs';
import { readJSON,writeJSON,withLock,root } from './storage.mjs';
import { checkSources,createFetcher,archive } from './retrieval.mjs';

const [command='build',...args]=process.argv.slice(2);
const option=(key,fallback=null)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
async function verifyEvidence(poll) {
  for(const source of poll.sources??[]) {
    const files=await fs.readdir(path.join(root,'data/evidence'));
    const name=files.find(f=>f.startsWith(source.evidenceHash+'.'));
    if(!name || hash(await fs.readFile(path.join(root,'data/evidence',name)))!==source.evidenceHash) throw new Error(`Evidence missing or corrupt: ${source.url}`);
    const retrievalNames=await fs.readdir(path.join(root,'data/retrievals'));
    let matched=false;
    for(const name of retrievalNames) {const r=await readJSON(`data/retrievals/${name}`);if(r.url===source.url && r.sha256===source.evidenceHash) {matched=true;break;}}
    if(!matched) throw new Error(`No retrieval links URL to evidence: ${source.url}`);
  }
}
await withLock(async()=>{
  const state=await readJSON('data/state.json'), today=localDay();
  if(command==='update') {
    if(frozen(today)) {console.log(JSON.stringify({status:'frozen',date:today}));return;}
    const startedAt=new Date().toISOString();
    const outcomes=await checkSources(state);
    await fs.mkdir(path.join(root,'data/inbox'),{recursive:true});
    for(const file of (await fs.readdir(path.join(root,'data/inbox'))).filter(f=>f.endsWith('.json')).sort()) {
      const raw=await fs.readFile(path.join(root,'data/inbox',file),'utf8');
      try {
        const input=JSON.parse(raw);await verifyEvidence(input);
        await writeJSON(`data/submissions/${hash(input)}.json`,input);
        ingest(state,input,{now:startedAt});
      }catch(e){
        const id=hash(raw).slice(0,24);
        if(!state.reviews.some(r=>r.id===id))state.reviews.push({id,status:'pending',kind:'invalid-submission',firstDiscoveredAt:startedAt,file,errors:[e.message],warnings:[]});
      }
    }
    const successes=outcomes.filter(s=>s.status==='ok').length;
    state.runs.push({startedAt,finishedAt:new Date().toISOString(),date:today,status:successes===outcomes.length?'ok':successes?'partial':'failed',successfulSources:successes,failedSources:outcomes.length-successes});
    await writeJSON('data/state.json',state);
    await writeJSON('public/data/dashboard.json',buildDataset(state,today));
    if(!successes) process.exitCode=1;
  } else if(command==='build') {
    const end=option('--as-of',today);
    await writeJSON('public/data/dashboard.json',buildDataset(state,end));
    console.log(`Built through ${end}: ${state.events.length} accepted polling events`);
  } else if(command==='capture') {
    if(frozen(today)) throw new Error('Network capture is frozen after election day');
    const source=sources.find(s=>s.id===args[0]);if(!source) throw new Error('Unknown source');
    const e=await archive(args[1],source,createFetcher());delete e.bytes;console.log(JSON.stringify(e,null,2));
  } else if(command==='ingest') {
    const input=JSON.parse(await fs.readFile(path.resolve(args[0]),'utf8'));
    await verifyEvidence(input);
    const result=ingest(state,input,{reviewed:args.includes('--accept'),reviewer:option('--reviewer'),reason:option('--reason')});
    // Retain original extraction even if invalid or a duplicate.
    await writeJSON(`data/submissions/${hash(input)}.json`,input);
    await writeJSON('data/state.json',state);console.log(JSON.stringify(result));
  } else if(command==='review') {
    if(!args[0]) {console.log(JSON.stringify(state.reviews.filter(r=>r.status==='pending'),null,2));return;}
    const item=state.reviews.find(r=>r.id===args[0]);
    if(!item?.poll) {
      if(!item || item.status!=='pending' || option('--action')!=='reject' || !option('--reviewer') || !option('--reason')) throw new Error('Notice dismissal requires --action reject, --reviewer and --reason; numerical corrections require a fresh extraction');
      item.status='rejected';item.decision={action:'reject',reviewer:option('--reviewer'),reason:option('--reason'),at:new Date().toISOString()};
      await writeJSON('data/state.json',state);return;
    }
    await verifyEvidence(item.poll);
    resolveReview(state,args[0],{action:option('--action'),reviewer:option('--reviewer'),reason:option('--reason'),eventId:option('--event')});
    await writeJSON('data/state.json',state);
  } else throw new Error(`Unknown command: ${command}`);
});
