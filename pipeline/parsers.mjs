// Bounded extractors: schema changes fail closed. These produce candidates, never acceptance decisions.
import {fold} from './core.mjs';
const tokens=s=>[...s.matchAll(/\d+(?:[.,]\d+)?\s*%/g)].map(m=>m[0].replace(/\s/g,''));
export function legerTable(pages) {
  const tables=pages.filter(p=>/Intentions de vote au provincial\s*\(2\/2\)/i.test(p.text)&&/VOTEP\s*\./.test(p.text)&&/Total\s+Québec\s+Total\s+Électeurs/i.test(p.text));
  if(tables.length!==1) throw new Error('Expected one actual VOTEP provincial table with explicit total and decided columns');
  const page=tables[0], rows={};
  const names=[['PQ',/Le Parti Québécois[^\n]*\d+%[^\n]*/],['CAQ',/La Coalition Avenir Québec[^\n]*\d+%[^\n]*/],['PLQ',/Le Parti libéral du Québec[^\n]*\d+%[^\n]*/],['PCQ',/Le Parti conservateur du Québec[^\n]*\d+%[^\n]*/],['QS',/Le Parti Québec solidaire[^\n]*\d+%[^\n]*/],['OTHER',/Un autre parti[^\n]*\d+%[^\n]*/]];
  for(const [id,pattern] of names) {
    const row=page.text.match(pattern)?.[0], values=row?tokens(row):[];
    if(values.length<3) throw new Error(`Missing/changed Léger row ${id}`);
    rows[id]=values[1];
  }
  const base=page.text.match(/n absolu=\s*([\d ]+?)\s{2,}(\d+)/);
  if(!base) throw new Error('Missing Léger sample bases');
  const undecided=page.text.match(/Ne sait pas\s+(\d+(?:[.,]\d+)?)%/);
  return {page:page.page,reportedValues:rows,sampleSize:Number(base[1].replace(/ /g,'')),baseN:Number(base[2]),basis:'decided-leaning',undecided:undecided?Number(undecided[1]):null};
}
export function pallasTable(pages) {
  const tables=pages.filter(p=>/Si une élection provinciale/.test(p.text)&&/\(décidés et enclins\)\s*\[1\]/.test(p.text));
  if(tables.length!==1) throw new Error('Expected one Pallas decided-and-leaning provincial table');
  const page=tables[0], rows={};
  for(const id of ['CAQ','PLQ','QS','PQ','PCQ']) {
    const match=page.text.match(new RegExp(`(?:^|\\n)${id},[\\s\\S]*?(\\d+(?:[.,]\\d+)?%)`));
    if(!match) throw new Error(`Missing Pallas row ${id}`);rows[id]=match[1];
  }
  const other=page.text.match(/Autre Parti\s+(\d+(?:[.,]\d+)?%)/);
  if(!other) throw new Error('Missing Pallas Other row');rows.OTHER=other[1];
  const base=page.text.match(/Fréquence\s+non\s+pondérée\s+(\d+)/);
  if(!base) throw new Error('Missing Pallas base');
  return {page:page.page,reportedValues:rows,baseN:Number(base[1]),basis:'decided-leaning'};
}
export function articleMetadata(html,load) {
  const $=load(html),time=$('meta').toArray().find(e=>$(e).attr('property')==='article:published_time');
  return {title:$('h1').first().text().trim(),published:time?$(time).attr('content')?.slice(0,10):$('time').first().attr('datetime')?.slice(0,10),text:$('article').first().text().replace(/\s+/g,' ').trim()};
}
