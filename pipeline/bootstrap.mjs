// Reviewed first-session extractions. Values come from archived tables, not the UI.
// Re-running is safe: immutable submissions are content addressed and ingestion deduplicates.
import {promises as fs} from 'node:fs';
import {load} from 'cheerio';
import {legerTable,pallasTable,articleMetadata} from './parsers.mjs';
import {readJSON,writeJSON,withLock} from './storage.mjs';
import {hash,ingest,buildDataset} from './core.mjs';
const retrievals=await Promise.all((await fs.readdir('data/retrievals')).map(f=>readJSON(`data/retrievals/${f}`)));
const evidence=prefix=>{const r=retrievals.find(r=>r.sha256.startsWith(prefix));if(!r)throw new Error(`Missing capture ${prefix}`);return r;};
const source=r=>({url:r.url,role:r.role,evidenceHash:r.sha256});
const pdfPages=async prefix=>readJSON(`data/text/${evidence(prefix).sha256}.pdf.json`);
const standard={jurisdiction:'CA-QC',scenario:'actual',question:'Provincial party voting intention if an election were held today, including a leaner follow-up.',basis:'decided-leaning',notes:[]};
const block=(values,baseN)=>({questionType:'voting-intention',geography:{level:'province',label:'Québec',definition:'Entire province, not a regional subsample'},dimensions:[],baseN,basis:'decided-leaning',reportedValues:values});
const inputs=[];
const specifications=[
  ['79d59a10','/dernieres-nouvelles-intentions-vote-quebec-janvier-2026/','2026-01-27','2026-01-29'],
  ['ce41fcf7','/quebec-politique-volonte-changement-baisse-appui-a-la-souverainete/','2026-02-27','2026-03-02'],
  ['fdb300f9','/intentions-de-vote-au-quebec-lutte-a-trois-mai-2026/','2026-05-15','2026-05-18'],
  ['5ae1a7f6','/dernieres-nouvelles-intentions-de-vote-au-quebec-le-pq-reste-en-tete-mais-rien-nest-encore-joue/','2026-06-12','2026-06-15'],
  ['fc97a472','/intentions-de-vote-au-quebec-11-aout-2026/','2026-08-07','2026-08-09'],
  ['bc3d119b','/dernieres-nouvelles-intentions-de-vote-au-quebec-pq-en-tete-caq-deuxieme-rang/','2026-08-28','2026-08-31'],
  ['afa6b798','/dernieres-nouvelles-le-vote-se-stabilise-mais-une-forte-volonte-de-changement-demeure/','2026-09-04','2026-09-06']
];
for(const [prefix,suffix,fieldStart,fieldEnd] of specifications) {
  const report=evidence(prefix),article=retrievals.find(r=>r.url==='https://leger360.com/fr'+suffix);
  if(!article) throw new Error(`Missing publication evidence ${suffix}`);
  const published=articleMetadata(await fs.readFile(article.file),load).published;
  const parsed=legerTable(await pdfPages(prefix));
  inputs.push({...standard,pollster:'Léger',sponsor:fieldStart>='2026-08-01'?'Sondage Léger/Le Journal/TVA':'Sondage Léger/Québecor',publicationDate:published,publicationDateBasis:'primary article publication metadata',fieldStart,fieldEnd,sampleSize:parsed.sampleSize,mode:'Online panel (LEO)',population:'Québec residents aged 18 and over eligible to vote',undecided:parsed.undecided,marginOfError:{value:null,confidence:null,applicability:'not-applicable',note:'Non-probability online panel. The source gives a probability-sample comparison only; no actual sampling margin is assigned.'},notes:['Values from the total decided column, following the leaner question. All-respondent and hypothetical leadership columns are excluded.','Undecided refers to the reported Ne sait pas row, excluding refusal and non-voting responses.','Field dates come from report methodology; publication date comes from the primary release, not the report cover or secondary tracker date.'],extraction:{method:'reviewed-pdf-table',version:'leger-table-1',locator:`PDF page ${parsed.page}, VOTEP table, total decided column; methodology page and linked article publication metadata`},sources:[source(report),source(article)],blocks:[block(parsed.reportedValues,parsed.baseN)]});
}
const pallas=evidence('683b0a66'),pt=pallasTable(await pdfPages('683b0a66'));
inputs.push({...standard,pollster:'Pallas Data',sponsor:null,publicationDate:'2026-09-07',publicationDateBasis:'primary release date',fieldStart:'2026-09-05',fieldEnd:'2026-09-05',sampleSize:1100,mode:'IVR telephone (landline and mobile)',population:'Québec residents aged 18 and over',undecided:7.5,marginOfError:{value:3,confidence:95,applicability:'reported-probability',note:'Reported full-sample margin; subgroup margins are larger.'},notes:['Use decimal results from the original decided-and-leaning table rather than rounded release headline values.','Undecided 7.5% is from the pre-leaner all-voter table on page 8; after the leaner question, 4.6% remains undecided on page 10.','Report dated September 6; website release dated September 7. Sponsor not identified conclusively in the report methodology.'],extraction:{method:'reviewed-pdf-table',version:'pallas-table-1',locator:'PDF pages 3 (method), 8/10 (undecided bases), 12 (total decided and leaning); primary release date'},sources:[source(pallas),source(evidence('6a7f1c7d'))],blocks:[block(pt.reportedValues,pt.baseN)]});
const liaison=evidence('1b9a48c9');
inputs.push({...standard,pollster:'Liaison Strategies',sponsor:null,publicationDate:'2026-05-05',publicationDateBasis:'dated primary release',fieldStart:'2026-04-26',fieldEnd:'2026-04-27',sampleSize:1000,mode:'IVR telephone (random digit dialing)',population:'Québec respondents; primary release does not specify age eligibility',undecided:null,marginOfError:{value:3.1,confidence:95,applicability:'reported-probability',note:'Full-sample reported margin, 19 times out of 20.'},notes:['Provincial paragraph only; the immediately following federal figures are excluded.','Age eligibility and sponsor not stated in retrieved HTML; preserve this limitation.','PDF attachment retrieval was blocked by robots.txt; accepted values are explicitly stated in the primary HTML release.'],extraction:{method:'reviewed-primary-html',version:'manual-1',locator:'Release dated May 5: provincial voting paragraph and following sample/methodology paragraph'},sources:[source(liaison)],blocks:[block({PQ:'32%',PLQ:'32%',CAQ:'16%',PCQ:'11%',QS:'7%',OTHER:'2%'},null)]});
const innovative=evidence('ec36e02c');
inputs.push({...standard,pollster:'Innovative Research',sponsor:null,publicationDate:'2026-02-20',publicationDateBasis:'primary article publication metadata',fieldStart:'2026-01-16',fieldEnd:'2026-02-01',sampleSize:651,mode:'Online panel (Canada 20/20 and Lucid)',population:'Québec citizens aged 18 and over',undecided:10,marginOfError:{value:null,confidence:null,applicability:'not-applicable',note:'Non-probability panel; report says a sampling margin cannot be calculated.'},notes:['Use actual unweighted sample 651, not the weighted total 600 shown in earlier tables.','Decided base n=521 is as labelled on page 37; weighted versus unweighted status of that base is not stated there.','Green (PVQ) is a separate category and is not folded into Other.','Undecided is the reported all-respondent figure from page 33. Secondary field dates/sample totals differ from original methodology.'],extraction:{method:'reviewed-pdf-chart',version:'manual-1',locator:'PDF page 37 decided vote chart, page 45 methodology, page 33 undecided; primary article date'},sources:[source(innovative),source(evidence('8a1f5f69'))],blocks:[block({PLQ:'26%',CAQ:'14%',PQ:'31%',QS:'6%',PVQ:'4%',PCQ:'18%',OTHER:'1%'},521)]});
await withLock(async()=>{
  const state=await readJSON('data/state.json');
  for(const input of inputs) {
    for(const s of input.sources) {const r=retrievals.find(r=>r.url===s.url&&r.sha256===s.evidenceHash);if(!r||hash(await fs.readFile(r.file))!==s.evidenceHash)throw new Error('Evidence mismatch');}
    await writeJSON(`data/submissions/${hash(input)}.json`,input);
    console.log(input.pollster,input.fieldEnd,ingest(state,input,{reviewed:true,reviewer:'Codex primary-source review 2026-09-12',reason:'Original table/chart visually verified; metadata checked against primary methodology and release date. See extraction locator and notes.'}));
  }
  await writeJSON('data/state.json',state);await writeJSON('public/data/dashboard.json',buildDataset(state));
});
