import { describe, expect, it } from 'vitest';
import { analyzerMetrics, createAnalyzer } from './analyzer';

describe('Hunt Analyzer',()=>{
  it('calcula taxas e lucro sem misturar ouro com valor estimado do loot',()=>{
    const analyzer=createAnalyzer(1);Object.assign(analyzer,{activeMs:1_800_000,xp:600,gold:120,damage:900,lootValue:75,suppliesValue:20,kills:{skeleton:3,bone_king:1},suppliesUsed:{health_potion:2}});
    const metrics=analyzerMetrics(analyzer);
    expect(metrics.xpPerHour).toBe(1200);expect(metrics.goldPerHour).toBe(240);expect(metrics.dps).toBe(.5);expect(metrics.monsters).toBe(4);expect(metrics.supplies).toBe(2);expect(metrics.estimatedProfit).toBe(175);
  });
});
