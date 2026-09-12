import { promises as fs } from 'node:fs';
import path from 'node:path';
import robotsParser from 'robots-parser';
import { load } from 'cheerio';
import { hash, sources } from './core.mjs';
import { root, writeJSON } from './storage.mjs';

const agent='QuebecPollingDashboard/0.1';
export function assertURL(value,hosts) {
  const u=new URL(value);
  if(u.protocol!=='https:' || u.username || u.password || (u.port && u.port!=='443') || !hosts.includes(u.hostname)) throw new Error(`Unapproved source URL: ${value}`);
  return u;
}
export function createFetcher({fetchImpl=fetch,delay=ms=>new Promise(r=>setTimeout(r,ms)),spacing=1500}={}) {
  const robots=new Map(), last=new Map();
  async function request(url,hosts,headers={},hops=0,isRobots=false) {
    const u=assertURL(url,hosts);
    if(hops>4) throw new Error('Too many redirects');
    const wait=Math.max(0,(last.get(u.hostname)??0)+spacing-Date.now());
    if(wait) await delay(wait);
    last.set(u.hostname,Date.now());
    const response=await fetchImpl(url,{headers:{'user-agent':agent,...headers},signal:AbortSignal.timeout(25000),redirect:'manual'});
    if([301,302,303,307,308].includes(response.status)) {
      const next=new URL(response.headers.get('location'),url).href;
      if(!isRobots) await allowed(next,hosts);
      return request(next,hosts,headers,hops+1,isRobots);
    }
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const maxBytes=12*1024*1024;
    if(Number(response.headers.get('content-length'))>maxBytes) throw new Error('Response exceeds byte limit');
    const chunks=[];let size=0;
    for await(const chunk of response.body) {size+=chunk.length;if(size>maxBytes) {await response.body.cancel?.().catch(()=>{});throw new Error('Response exceeds byte limit');}chunks.push(chunk);}
    return {bytes:Buffer.concat(chunks),finalUrl:url,status:response.status,contentType:response.headers.get('content-type')??'application/octet-stream'};
  }
  async function allowed(url,hosts) {
    const u=assertURL(url,hosts);
    if(!robots.has(u.origin)) {
      // No permission inference on timeouts, 403 or missing robots: hold source for review.
      const rules=await request(`${u.origin}/robots.txt`,hosts,{},0,true);
      const text=rules.bytes.toString('utf8');
      if(/<html/i.test(text)) throw new Error('robots.txt returned HTML');
      robots.set(u.origin,robotsParser(`${u.origin}/robots.txt`,text));
    }
    const parser=robots.get(u.origin);
    if(parser.isAllowed(url,agent)===false) throw new Error('Blocked by robots.txt');
    const crawlDelay=Number(parser.getCrawlDelay(agent));
    if(Number.isFinite(crawlDelay) && crawlDelay>0) {
      if(crawlDelay>60) throw new Error('Source crawl delay requires deferred scheduling');
      const wait=Math.max(0,(last.get(u.hostname)??0)+crawlDelay*1000-Date.now());if(wait) await delay(wait);
    }
  }
  return async (url,hosts)=>{await allowed(url,hosts);return request(url,hosts);};
}
export async function archive(url,source,fetcher,now=new Date().toISOString()) {
  const result=await fetcher(url,source.hosts);
  const digest=hash(result.bytes), ext=result.contentType.includes('pdf')?'pdf':result.contentType.includes('html')?'html':'txt';
  const file=`data/evidence/${digest}.${ext}`;
  await fs.mkdir(path.join(root,'data/evidence'),{recursive:true});
  try {await fs.writeFile(path.join(root,file),result.bytes,{flag:'wx'});} catch(e) {if(e.code!=='EEXIST') throw e;}
  const evidence={url,finalUrl:result.finalUrl,sourceId:source.id,role:source.role,retrievedAt:now,sha256:digest,contentType:result.contentType,byteLength:result.bytes.length,file,status:result.status};
  await writeJSON(`data/retrievals/${hash([url,now,digest])}.json`,evidence);
  return {...evidence,bytes:result.bytes};
}
export function discoverLinks(html,base,source) {
  const $=load(html), found=[];
  $('a[href],link[type="application/rss+xml"]').each((_,el)=>{
    const label=$(el).text().replace(/\s+/g,' ').trim(), href=$(el).attr('href');
    try {
      const u=new URL(href,base);u.hash='';
      if(u.protocol!=='https:' || u.username || u.password) return;
      const relevant=/qu[eé]bec|sondage|pallas|synopsis|leger|léger|mainstreet|liaison|innovative|ipsos|angus|poll|\.pdf(?:$|\?)/i.test(`${label} ${u.pathname}`);
      if(!relevant || /facebook|twitter|linkedin|instagram|youtube|mailto/i.test(u.hostname)) return;
      const known=sources.find(s=>s.hosts.includes(u.hostname));
      found.push({id:hash(u.href).slice(0,24),url:u.href,title:label.slice(0,350),sourceId:known?.id??null,discoveredFrom:base,kind:known?'release-candidate':'new-source-candidate',status:'pending',role:known?.role??'unknown'});
    }catch{}
  });
  if(/<(?:rss|feed)(?:\s|>)/i.test(html)) {
    const xml=load(html,{xmlMode:true});
    xml('item,entry').each((_,entry)=>{
      const title=xml(entry).find('title').text();
      const href=xml(entry).find('link').attr('href')||xml(entry).find('link').text();
      try {const u=new URL(href,base);if(u.protocol!=='https:')return;const known=sources.find(s=>s.hosts.includes(u.hostname));found.push({id:hash(u.href).slice(0,24),url:u.href,title:title.slice(0,350),sourceId:known?.id??null,discoveredFrom:base,kind:known?'release-candidate':'new-source-candidate',status:'pending',role:known?.role??'unknown'});}catch{}
    });
  }
  return [...new Map(found.map(v=>[v.id,v])).values()].sort((a,b)=>a.url.localeCompare(b.url));
}
export async function checkSources(state,{fetcher=createFetcher(),now=new Date().toISOString(),registry=sources}={}) {
  const outcomes=[];
  for(const source of registry.filter(s=>s.enabled)) {
    const monitored=state.events.flatMap(e=>e.sources??[]).filter(s=>{try{return source.hosts.includes(new URL(s.url).hostname);}catch{return false;}}).map(s=>s.url);
    for(const url of [...new Set([...source.urls,...monitored])]) {
      try {
        const evidence=await archive(url,source,fetcher,now);
        const html=evidence.bytes.toString('utf8');
        const title=load(html)('title').text();
        const isPdf=evidence.contentType.includes('pdf'),isText=/html|xml/.test(evidence.contentType);
        if((!isPdf&&!isText) || /captcha|verify you are human|checking your browser|just a moment/i.test(title)) throw new Error('Unexpected content or bot challenge');
        const leads=isPdf?[]:discoverLinks(html,url,source);
        for(const lead of leads) if(!state.discoveries.some(d=>d.id===lead.id)) state.discoveries.push({...lead,firstDiscoveredAt:now,evidenceHash:evidence.sha256});
        // A changed source is a reviewable source change, not an automatic numerical correction.
        for(const event of state.events) {
          const revision=event.revisions?.find(r=>r.id===event.activeRevisionId);
          const same=(revision?.poll?.sources??event.sources).filter(s=>s.url===url);
          if(same.length && !same.some(s=>s.evidenceHash===evidence.sha256)) {
            const id=hash([event.id,url,evidence.sha256]).slice(0,24);
            if(!state.reviews.some(r=>r.id===id)) state.reviews.push({id,kind:'source-changed',eventId:event.id,status:'pending',firstDiscoveredAt:now,url,evidenceHash:evidence.sha256,errors:[],warnings:['Source bytes changed; verify relevant table before revising data']});
          } else if(same.length) event.lastVerifiedAt=now;
        }
        const result={sourceId:source.id,url,lastCheckedAt:now,lastSuccessAt:now,status:'ok',evidenceHash:evidence.sha256,leads:leads.length};
        outcomes.push(result);console.log(JSON.stringify(result));
      } catch(e) {
        const previous=state.health.find(h=>h.url===url);
        const result={sourceId:source.id,url,lastCheckedAt:now,lastSuccessAt:previous?.lastSuccessAt??null,status:'failed',error:e.message};
        outcomes.push(result);console.log(JSON.stringify(result));
      }
    }
  }
  state.health=outcomes;
  return outcomes;
}
