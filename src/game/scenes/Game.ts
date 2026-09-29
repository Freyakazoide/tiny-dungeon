import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { gameStore } from '../core/GameStore';
import { CLASSES } from '../data/classes';
import { MONSTERS, WAVES } from '../data/monsters';
import { characterStats } from '../systems/progression';
import type { GameFx } from '../core/GameEngine';

type HeroView={body:Phaser.GameObjects.Rectangle;name:Phaser.GameObjects.Text;hp:Phaser.GameObjects.Rectangle;mana:Phaser.GameObjects.Rectangle;effects:Phaser.GameObjects.Text};
type MonsterView={body:Phaser.GameObjects.Arc;name:Phaser.GameObjects.Text;hp:Phaser.GameObjects.Rectangle};

// A cena agora somente desenha o estado e anima eventos. As três waves originais vivem em data/monsters.ts.
export class Game extends Scene {
  private heroes=new Map<string,HeroView>(); private enemies=new Map<string,MonsterView>(); private unsubscribe?:()=>void; private unsubscribeFx?:()=>void;
  private progress!:Phaser.GameObjects.Text; private status!:Phaser.GameObjects.Text; private stairs!:Phaser.GameObjects.Container;
  constructor(){super('Game');}
  create(){
    const {width,height}=this.scale;this.cameras.main.setBackgroundColor('#0c111a');
    this.add.rectangle(width/2,height/2,940,600,0x121b27).setStrokeStyle(2,0x5f5034);
    this.add.rectangle(width/2,325,900,370,0x1c2934).setStrokeStyle(2,0x344758);
    this.add.text(width/2,35,'TINY DUNGEON',{fontFamily:'Georgia',fontSize:'28px',color:'#e8d6a7'}).setOrigin(.5);
    this.progress=this.add.text(width/2,72,'',{fontSize:'17px',color:'#c3cad5'}).setOrigin(.5);
    this.status=this.add.text(width/2,height-44,'',{fontSize:'16px',color:'#d7be7c',wordWrap:{width:850},align:'center'}).setOrigin(.5);
    const stairLines=[] as Phaser.GameObjects.Rectangle[];for(let i=0;i<5;i++)stairLines.push(this.add.rectangle(0,i*9,100-i*12,5,0xc0a66b));
    this.stairs=this.add.container(width/2,500,[...stairLines,this.add.text(0,-24,'ESCADA ABERTA',{fontSize:'14px',color:'#f2db9b'}).setOrigin(.5)]).setVisible(false);
    this.unsubscribe=gameStore.subscribe(()=>this.renderState());this.unsubscribeFx=gameStore.onFx(fx=>this.animateFx(fx));
    this.events.once('shutdown',()=>{this.unsubscribe?.();this.unsubscribeFx?.();this.heroes.clear();this.enemies.clear();});
    this.renderState();EventBus.emit('current-scene-ready',this);
  }
  update(_time:number,delta:number){gameStore.tick(delta);}
  private renderState(){
    const state=gameStore.getSnapshot();const team=state.team.map(id=>state.characters.find(c=>c.id===id)).filter(Boolean) as typeof state.characters;
    this.progress.setText(`Ciclo ${state.cycle+1} · Wave ${state.wave+1}/${WAVES.length} — ${WAVES[state.wave].name}`);this.status.setText(state.message);this.stairs.setVisible(state.status==='transition');
    for(const [id,v] of this.heroes)if(!team.some(c=>c.id===id)){v.body.destroy();v.name.destroy();v.hp.destroy();v.mana.destroy();v.effects.destroy();this.heroes.delete(id);}
    team.forEach((c,i)=>{let v=this.heroes.get(c.id);const x=115+i*145,y=310;if(!v){v={body:this.add.rectangle(x,y,42,64,CLASSES[c.classId].color).setStrokeStyle(2,0xd9e0e8),name:this.add.text(x,y+52,'',{fontSize:'13px',color:'#fff',align:'center'}).setOrigin(.5),hp:this.add.rectangle(x-45,y-51,90,7,0xbd4e55).setOrigin(0,.5),mana:this.add.rectangle(x-45,y-40,90,5,0x4f75cb).setOrigin(0,.5),effects:this.add.text(x,y+76,'',{fontSize:'11px',color:'#95d7aa'}).setOrigin(.5)};this.heroes.set(c.id,v);}const stats=characterStats(c,state);v.name.setText(`${c.name} · Lv ${c.level}${c.hp<=0?' ☠':''}`);v.hp.displayWidth=90*Math.max(0,c.hp/stats.maxHp);v.mana.displayWidth=90*Math.max(0,c.mana/stats.maxMana);v.effects.setText(c.effects.map(e=>e.type).join(' · '));v.body.setAlpha(c.hp>0?1:.25);});
    const activeIds=new Set(state.monsters.map(m=>m.uid));for(const [id,v] of this.enemies)if(!activeIds.has(id)){v.body.destroy();v.name.destroy();v.hp.destroy();this.enemies.delete(id);}
    state.monsters.forEach((m,i)=>{let v=this.enemies.get(m.uid);const x=700+(i%2)*145,y=270+Math.floor(i/2)*130;const def=MONSTERS[m.defId];if(!v){v={body:this.add.circle(x,y,def.boss?42:31,def.color).setStrokeStyle(2,0xe4d6bd),name:this.add.text(x,y+52,def.name,{fontSize:'13px',color:'#fff'}).setOrigin(.5),hp:this.add.rectangle(x-48,y-52,96,8,0xd05258).setOrigin(0,.5)};this.enemies.set(m.uid,v);}v.hp.displayWidth=96*Math.max(0,m.hp/m.maxHp);v.body.setVisible(m.alive);v.hp.setVisible(m.alive);v.name.setAlpha(m.alive?1:.35);});
  }
  private animateFx(fx:GameFx){const source=this.heroes.get(fx.source??'')?.body;if(fx.type==='attack'&&source)this.tweens.add({targets:source,x:source.x+18,duration:90,yoyo:true});if(fx.type==='damage'&&fx.target){const target=this.enemies.get(fx.target)?.body??this.heroes.get(fx.target)?.body;if(target){target.setAlpha(.25);this.time.delayedCall(90,()=>target.active&&target.setAlpha(1));this.floatText(target.x,target.y-55,`-${fx.value}`, '#ff7777');}}if(fx.type==='heal'&&fx.target){const t=this.heroes.get(fx.target)?.body;if(t)this.floatText(t.x,t.y-55,`+${fx.value}`,'#70e69a');}if(fx.type==='drop'&&fx.text)this.floatText(this.scale.width/2,555,fx.text,'#f1c96c');}
  private floatText(x:number,y:number,text:string,color:string){const label=this.add.text(x,y,text,{fontSize:'14px',color}).setOrigin(.5).setDepth(10);this.tweens.add({targets:label,y:y-28,alpha:0,duration:900,onComplete:()=>label.destroy()});}
}
