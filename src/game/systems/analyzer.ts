import type { Analyzer } from '../core/types';

export function createAnalyzer(now=Date.now()):Analyzer{
  return {startedAt:now,activeMs:0,xp:0,gold:0,damage:0,damageTaken:0,healing:0,byCharacter:{},byMonster:{},kills:{},bosses:0,loot:{},lootValue:0,suppliesValue:0,suppliesUsed:{},cycles:0,defeats:0};
}

export function analyzerMetrics(analyzer:Analyzer){
  const activeSeconds=Math.max(0,analyzer.activeMs/1000);
  const activeHours=activeSeconds/3600;
  const perHour=(value:number)=>activeHours>0?value/activeHours:0;
  return {
    activeSeconds,
    xpPerHour:perHour(analyzer.xp),
    goldPerHour:perHour(analyzer.gold),
    dps:activeSeconds>0?analyzer.damage/activeSeconds:0,
    monsters:Object.values(analyzer.kills).reduce((total,count)=>total+count,0),
    supplies:Object.values(analyzer.suppliesUsed).reduce((total,count)=>total+count,0),
    estimatedProfit:analyzer.gold+analyzer.lootValue-analyzer.suppliesValue
  };
}

export function hasAnalyzerActivity(analyzer:Analyzer){
  return analyzer.activeMs>0||analyzer.xp>0||analyzer.gold>0||analyzer.damage>0||analyzer.damageTaken>0||analyzer.healing>0||Object.keys(analyzer.loot).length>0||Object.keys(analyzer.suppliesUsed).length>0;
}
