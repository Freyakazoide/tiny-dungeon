import type { CSSProperties } from 'react';
import { pct } from './format';

export function ProgressBar({value,max,tone='xp',label,detail,compact=false}:{value:number;max:number;tone?:'hp'|'mana'|'xp'|'skill';label?:string;detail?:string;compact?:boolean}){
  const percent=pct(value,max);
  return <div className={`progress ${tone} ${compact?'compact':''}`} title={`${Math.round(percent)}%`}>
    {(label||detail)&&<div className="progress-meta"><span>{label}</span><span>{detail}</span></div>}
    <div className="progress-track"><i style={{'--progress':`${percent}%`} as CSSProperties}/><b>{Math.round(percent)}%</b></div>
  </div>;
}
