// Research utility: inert local text inspection and evidence capture, never automatic approval.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { sources, frozen, localDay } from './core.mjs';
import { createFetcher,archive } from './retrieval.mjs';
import { root,writeJSON } from './storage.mjs';
const [cmd,...args]=process.argv.slice(2);
if(cmd==='capture') {
  if(frozen(localDay())) throw new Error('Frozen');
  const fetcher=createFetcher();
  const entries=JSON.parse(await fs.readFile(path.resolve(args[0]),'utf8'));
  const results=[];
  for(const {sourceId,url} of entries) {
    try {const e=await archive(url,sources.find(s=>s.id===sourceId),fetcher);delete e.bytes;results.push(e);console.log(JSON.stringify(e));}
    catch(e) {results.push({sourceId,url,error:e.message});console.log(url,e.message);}
  }
  await writeJSON('data/research-captures.json',results);
} else if(cmd==='inspect') {
  const file=path.resolve(args[0]);
  if(file.endsWith('.pdf')) {
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const document=await getDocument({data:new Uint8Array(await fs.readFile(file)),isEvalSupported:false,useSystemFonts:false}).promise;
    const pages=[];
    for(let n=1;n<=document.numPages;n++) {const page=await document.getPage(n);const text=await page.getTextContent();pages.push({page:n,text:text.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('')});}
    await writeJSON(`data/text/${path.basename(file)}.json`,pages);
    for(const p of pages) if(!args[1] || p.text.toLowerCase().includes(args[1].toLowerCase())) console.log(`PAGE ${p.page}\n${p.text}`);
    await document.cleanup();
  } else {
    const $=load(await fs.readFile(file,'utf8'));
    if(args[1]==='links') { $('a[href]').each((_,e)=>{const u=$(e).attr('href');if(/pdf|sondage|poll|2026/i.test(u)) console.log($(e).text().trim().slice(0,80),u);}); }
    else { $('script,style,nav,footer,header').remove();console.log($('main,article').first().text()||$('body').text()); }
  }
}
