import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const config = name => JSON.parse(readFileSync(new URL(`../config/${name}.json`, import.meta.url)));
export const parties = config('parties');
export const pollsters = config('pollsters');
export const election = config('election');
export const methodology = config('methodology');
export const sources = config('sources');
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : stable(value)).digest('hex');
export const fold = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function registryId(value, registry) {
  const item = registry.find(p => [p.id, p.name, ...p.aliases].some(n => fold(n) === fold(value)));
  if (!item) throw new Error(`Unknown registry value: ${value}`);
  return item.id;
}
export function dateDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date: ${value}`);
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0,10) !== value) throw new Error(`Impossible date: ${value}`);
  return ms / 86400000;
}
export function localDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:election.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export const frozen = day => dateDay(day) > dateDay(election.electionDay);
export function percentage(raw) {
  if (typeof raw === 'number') { if (Number.isFinite(raw) && raw >= 0 && raw <= 100) return raw; }
  if (typeof raw === 'string' && /^\s*\d{1,3}(?:[.,]\d+)?\s*%?\s*$/.test(raw)) {
    const n = Number(raw.replace('%','').replace(',','.').trim());
    if (n <= 100) return n;
  }
  throw new Error(`Invalid percentage: ${raw}`);
}
export function normalize(input, today = localDay()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {poll:input,errors:['Poll must be an object'],warnings:[]};
  const p = structuredClone(input), errors = [], warnings = [];
  if(!Array.isArray(p.sources)) p.sources=[];
  if(!Array.isArray(p.blocks)) p.blocks=[];
  const check = (condition, issue) => { if (!condition) errors.push(issue); };
  try { p.pollsterId = registryId(p.pollster, pollsters); } catch (e) { errors.push(e.message); }
  check(p.jurisdiction === 'CA-QC', 'Wrong jurisdiction');
  try {
    const start = dateDay(p.fieldStart), end = dateDay(p.fieldEnd), pub = dateDay(p.publicationDate);
    check(start <= end && end <= pub && pub <= dateDay(today), 'Invalid date order or future publication');
    check(start >= dateDay(election.historyStart), 'Outside historical scope');
    p.midpoint = (start + end) / 2;
  } catch (e) { errors.push(e.message); }
  check(Number.isInteger(p.sampleSize) && p.sampleSize > 0, 'Missing or invalid sample size');
  check(typeof p.mode === 'string' && p.mode.length > 0 && p.mode !== 'unknown', 'Missing methodology');
  check(typeof p.population === 'string' && p.population.length > 0, 'Missing population');
  check(['all','decided','decided-leaning'].includes(p.basis), 'Unknown respondent basis');
  check(['actual','hypothetical'].includes(p.scenario), 'Unknown scenario');
  check(typeof p.question === 'string' && p.question.length > 0, 'Missing question description');
  check(typeof p.extraction?.method === 'string' && !!p.extraction?.locator, 'Missing extraction method or locator');
  check(Array.isArray(p.sources) && p.sources.length > 0, 'Missing provenance');
  for (const s of p.sources ?? []) {
    if(!s || typeof s!=='object') {errors.push('Malformed source');continue;}
    try { const u = new URL(s.url); check(u.protocol === 'https:', 'Non-HTTPS source'); } catch { errors.push('Invalid source URL'); }
    check(/^[a-f0-9]{64}$/.test(s.evidenceHash ?? ''), 'Missing evidence hash');
    check(['primary','secondary'].includes(s.role), 'Invalid source role');
  }
  check(Array.isArray(p.blocks) && p.blocks.length > 0, 'Missing result blocks');
  for (const block of p.blocks ?? []) {
    if(!block || typeof block!=='object' || Array.isArray(block)) {errors.push('Malformed block');continue;}
    block.values = {};
    check(['province','region','demographic'].includes(block.geography?.level), 'Unknown geography');
    check(typeof block.geography?.label === 'string', 'Missing geography label');
    check(Array.isArray(block.dimensions), 'Missing dimensions');
    check(['voting-intention','sovereignty','leader-preference','other'].includes(block.questionType), 'Unknown question type');
    check(['all','decided','decided-leaning'].includes(block.basis), 'Unknown block basis');
    if (block.questionType !== 'voting-intention') continue;
    for (const [label, raw] of Object.entries(block.reportedValues ?? {})) {
      try {
        const id = registryId(label, parties);
        if (id in block.values) errors.push(`Duplicate party alias: ${id}`);
        block.values[id] = percentage(raw);
      } catch (e) { errors.push(e.message); }
    }
    const total = Object.values(block.values).reduce((a,b) => a+b, 0);
    block.reportedTotal = total;
    if (block.basis !== 'all' && Math.abs(total-100) > methodology.totalTolerance) errors.push(`Unexpected total: ${total}`);
    else if (total !== 100) warnings.push(`Reported total ${total}; values preserved without rescaling`);
    if (!('OTHER' in block.values)) warnings.push('Other not reported; no residual inferred');
  }
  const provincial = (p.blocks ?? []).filter(b=>b&&isProvincial(b));
  if (p.scenario === 'actual' && provincial.length !== 1) errors.push('Expected exactly one provincial voting-intention block');
  if (provincial.length === 1) {
    check(provincial[0].basis === p.basis, 'Conflicting block and poll basis');
    for (const id of methodology.requiredParties) check(id in provincial[0].values, `Missing principal party: ${id}`);
  }
  if (p.undecided !== null && p.undecided !== undefined) { try { percentage(p.undecided); } catch(e) { errors.push(e.message); } }
  if (p.marginOfError?.value !== null && p.marginOfError?.value !== undefined) {
    try { percentage(p.marginOfError.value); } catch(e) { errors.push(e.message); }
    check(p.marginOfError.applicability === 'reported-probability', 'Actual margin cannot be a panel comparison');
  }
  return {poll:p, errors:[...new Set(errors)], warnings:[...new Set(warnings)]};
}
export const isProvincial = b => b.questionType === 'voting-intention' && b.geography?.level === 'province' && b.geography.label === 'Québec' && b.dimensions?.length === 0;
export const identity = p => hash([p.pollsterId,p.jurisdiction,p.fieldStart,p.fieldEnd,p.sampleSize]).slice(0,24);
export function substantive(p) {
  const {sources,extraction,pollster,blocks,...rest} = p;
  return {...rest,blocks:blocks.map(({reportedValues,...b})=>b)};
}
export function candidateMatch(p, events) {
  const id = identity(p);
  const exact = events.find(e => e.id === id);
  if (exact) return {event:exact, kind:stable(substantive(exact.revisions.find(r=>r.id===exact.activeRevisionId).poll)) === stable(substantive(p)) ? 'duplicate' : 'conflict'};
  const near = events.find(e => {
    const old = e.revisions.find(r => r.id === e.activeRevisionId).poll;
    if (p.sources.some(s=>e.sources.some(t=>s.url===t.url))) return true;
    if (old.pollsterId !== p.pollsterId) return false;
    const overlaps = dateDay(p.fieldStart) <= dateDay(old.fieldEnd) && dateDay(p.fieldEnd) >= dateDay(old.fieldStart);
    return overlaps || Math.abs(dateDay(p.publicationDate)-dateDay(old.publicationDate)) <= 2;
  });
  return near ? {event:near, kind:'possible-duplicate'} : {kind:'new'};
}
function mergeSources(a,b) { return [...new Map([...a,...b].map(s=>[`${s.url}:${s.evidenceHash}`,s])).values()].sort((x,y)=>stable(x).localeCompare(stable(y))); }
export function ingest(state, input, {now=new Date().toISOString(), reviewed=false, reviewer=null, reason=null}={}) {
  const {poll,errors,warnings} = normalize(input,localDay(new Date(now)));
  let match = errors.length ? {kind:'invalid'} : candidateMatch(poll,state.events);
  if (match.kind === 'duplicate') {
    match.event.sources = mergeSources(match.event.sources,poll.sources);
    match.event.lastVerifiedAt = now;
    return {kind:'duplicate',id:match.event.id};
  }
  if (errors.length || !reviewed || !reviewer || !reason || ['conflict','possible-duplicate'].includes(match.kind)) {
    const id = hash(poll).slice(0,24);
    if (!state.reviews.some(r=>r.id===id)) state.reviews.push({id,status:'pending',kind:match.kind,eventId:match.event?.id ?? null,firstDiscoveredAt:now,poll,errors,warnings});
    return {kind:'review',id};
  }
  const id = identity(poll), revisionId = hash(poll);
  state.events.push({id,firstDiscoveredAt:now,lastVerifiedAt:now,sources:poll.sources,activeRevisionId:revisionId,revisions:[{id:revisionId,poll,acceptedAt:now,reviewer,reason,supersedes:null,warnings}]});
  state.events.sort((a,b)=>a.id.localeCompare(b.id));
  state.lastVerifiedUpdateAt=now;
  return {kind:'accepted',id};
}
export function resolveReview(state,id,{action,reviewer,reason,eventId=null,now=new Date().toISOString()}) {
  if (!reviewer || !reason) throw new Error('Reviewer and reason are required');
  const item=state.reviews.find(r=>r.id===id && r.status==='pending');
  if (!item) throw new Error('Pending review not found');
  if (action==='reject') { item.status='rejected'; }
  else {
    const checked=normalize(item.poll,localDay(new Date(now)));
    if (checked.errors.length) throw new Error(`Cannot accept invalid data: ${checked.errors.join('; ')}`);
    if (action==='revision') {
      const event=state.events.find(e=>e.id===(eventId ?? item.eventId));
      if(!event) throw new Error('Revision target required');
      const revisionId=hash(checked.poll);
      if(!event.revisions.some(r=>r.id===revisionId)) event.revisions.push({id:revisionId,poll:checked.poll,acceptedAt:now,reviewer,reason,supersedes:event.activeRevisionId,warnings:checked.warnings});
      event.activeRevisionId=revisionId; event.lastVerifiedAt=now; event.sources=mergeSources(event.sources,checked.poll.sources);
    } else if(action==='distinct') {
      if(state.events.some(e=>e.id===identity(checked.poll))) throw new Error('Exact identity already exists; resolve as revision');
      const id=identity(checked.poll), revisionId=hash(checked.poll);
      state.events.push({id,firstDiscoveredAt:item.firstDiscoveredAt,lastVerifiedAt:now,sources:checked.poll.sources,activeRevisionId:revisionId,revisions:[{id:revisionId,poll:checked.poll,acceptedAt:now,reviewer,reason,supersedes:null,warnings:checked.warnings}]});
    } else throw new Error('Use reject, revision or distinct');
    item.status='resolved'; state.lastVerifiedUpdateAt=now;
  }
  item.decision={action,reviewer,reason,eventId,at:now};
}
export function average(events,day,model=methodology) {
  const d=dateDay(day), eligible=[];
  for(const event of [...events].sort((a,b)=>a.id.localeCompare(b.id))) {
    const revision=event.revisions.find(r=>r.id===event.activeRevisionId), p=revision.poll;
    const block=p.blocks.find(isProvincial), age=d-p.midpoint;
    if(!block || p.scenario!=='actual' || p.jurisdiction!=='CA-QC' || !model.allowedBases.includes(block.basis) || model.requiredParties.some(k=>!(k in block.values))) continue;
    if(dateDay(p.publicationDate)>d || dateDay(p.fieldEnd)>d || age<0 || age>model.maxAgeDays) continue;
    eligible.push({eventId:event.id,revisionId:revision.id,pollsterId:p.pollsterId,ageDays:age,rawWeight:Math.sqrt(Math.min(p.sampleSize,model.sampleCap))*2**(-age/model.halfLifeDays),values:block.values});
  }
  const firmIds=[...new Set(eligible.map(p=>p.pollsterId))];
  for(const id of firmIds) {
    const group=eligible.filter(p=>p.pollsterId===id), sum=group.reduce((a,p)=>a+p.rawWeight,0), budget=Math.max(...group.map(p=>p.rawWeight));
    for(const p of group) {p.firmBudget=budget;p.weight=p.rawWeight/sum*budget;}
  }
  const total=eligible.reduce((a,p)=>a+p.weight,0);
  for(const p of eligible) p.weight/=total;
  const values={},coverage={},contributions={};
  for(const party of parties) {
    const reported=eligible.filter(p=>party.id in p.values), sum=reported.reduce((a,p)=>a+p.weight,0);
    coverage[party.id]={polls:reported.length,weight:sum,firms:new Set(reported.map(p=>p.pollsterId)).size};
    contributions[party.id]=reported.map(p=>({eventId:p.eventId,revisionId:p.revisionId,weight:p.weight/sum,reported:p.values[party.id],contribution:p.values[party.id]*p.weight/sum}));
    values[party.id]=firmIds.length>=model.minimumFirms && coverage[party.id].firms>=model.minimumFirms ? contributions[party.id].reduce((a,c)=>a+c.contribution,0) : null;
  }
  return {date:day,version:model.version,status:firmIds.length>=model.minimumFirms?'available':'insufficient-firms',firmCount:firmIds.length,pollCount:eligible.length,values,coverage,contributions,polls:eligible};
}
export function buildDataset(state,end=localDay()) {
  const final=end>election.electionDay?election.electionDay:end, series=[];
  for(let day=dateDay(election.historyStart);day<=dateDay(final);day++) series.push(average(state.events,new Date(day*86400000).toISOString().slice(0,10)));
  const canonical=state.events.map(e=>({id:e.id,activeRevisionId:e.activeRevisionId,revisions:e.revisions})).sort((a,b)=>a.id.localeCompare(b.id));
  return {election,parties,methodology,datasetHash:hash(canonical),asOf:final,coverageStatus:'partial-backfill',lastVerifiedUpdateAt:state.lastVerifiedUpdateAt,series,events:[...state.events].sort((a,b)=>a.id.localeCompare(b.id)),health:state.health,reviews:state.reviews.map(({poll,...r})=>({...r,pollster:poll?.pollster})),discoveries:state.discoveries,runs:state.runs.slice(-10)};
}
