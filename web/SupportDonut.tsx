import {useState} from 'react';

type Party={id:string;name:string;color:string};
export function SupportDonut({parties,values}:{parties:Party[];values:Record<string,number|null>}) {
  const [focused,setFocused]=useState<string|null>(null);
  const available=parties.every(p=>values[p.id]!=null && Number.isFinite(values[p.id]) && values[p.id]!>=0);
  const total=parties.reduce((sum,p)=>sum+(values[p.id]??0),0);
  const leader=[...parties].sort((a,b)=>(values[b.id]??0)-(values[a.id]??0))[0];
  const selected=parties.find(p=>p.id===focused)??leader;
  let offset=0;
  const slices=parties.map(p=>{const fraction=available&&total>0?values[p.id]!/total:0;const start=offset;offset+=fraction*100;return {p,fraction,start};});
  return <figure className="support-donut">
    <svg viewBox="0 0 260 260" role="group" aria-label="Calculated polling average: relative support among the five principal parties">
      <ellipse className="donut-shadow" cx="130" cy="148" rx="112" ry="105" aria-hidden="true"/>
      <g transform="translate(0 9)" className="donut-depth" aria-hidden="true">{slices.filter(s=>s.fraction>0).map(({p,fraction,start})=><circle key={p.id} cx="130" cy="130" r="100" pathLength="100" fill="none" stroke={p.color} strokeWidth="34" strokeDasharray={fraction*100+' '+(100-fraction*100)} strokeDashoffset={-start} transform="rotate(-90 130 130)"/>)}</g>
      <circle className="donut-track" cx="130" cy="130" r="100" fill="none" strokeWidth="34"/>
      {available&&total>0&&slices.map(({p,fraction,start})=>{
        return fraction>0?<circle key={p.id} className="donut-slice" cx="130" cy="130" r="100" pathLength="100" fill="none" stroke={p.color} strokeWidth={focused===p.id?40:34} strokeDasharray={fraction*100+' '+(100-fraction*100)} strokeDashoffset={-start} transform="rotate(-90 130 130)" tabIndex={0} role="img" aria-label={p.name+': '+values[p.id]!.toFixed(1)+' percent, calculated average'} onMouseEnter={()=>setFocused(p.id)} onMouseLeave={()=>setFocused(null)} onFocus={()=>setFocused(p.id)} onBlur={()=>setFocused(null)}><title>{p.name+': '+values[p.id]!.toFixed(1)+'%'}</title></circle>:null;
      })}
      {available&&<g aria-hidden="true" className="donut-rim" fill="none" strokeWidth="1.5"><circle cx="130" cy="130" r="116"/><circle cx="130" cy="130" r="84"/></g>}
      <text x="130" y="99" textAnchor="middle" className="donut-kicker">{available?(focused?'POLLING AVERAGE':'CURRENT LEADER'):'POLLING AVERAGE'}</text>
      <text x="130" y="137" textAnchor="middle" className="donut-party" fill={available?selected.color:'#617180'}>{available?selected.id:'—'}</text>
      <text x="130" y="172" textAnchor="middle" className="donut-value">{available?values[selected.id]!.toFixed(1)+'%':'Unavailable'}</text>
    </svg>
    <figcaption><strong>Five-party comparison</strong>{available?'Slices are scaled to these parties’ combined support. Labels show original estimates; Other and additional parties are excluded.':'Insufficient evidence to draw a support breakdown.'}</figcaption>
  </figure>;
}
