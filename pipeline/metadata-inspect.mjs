import fs from 'node:fs';
import {load} from 'cheerio';
import {articleMetadata} from './parsers.mjs';
for(const f of fs.readdirSync('data/evidence').filter(x=>x.endsWith('.html'))) {
  const m=articleMetadata(fs.readFileSync('data/evidence/'+f),load);
  if(/intention|Pallas.*Qu|Legault.s Resignation/i.test(m.title)) console.log(f,JSON.stringify({...m,text:m.text.slice(0,250)}));
}
