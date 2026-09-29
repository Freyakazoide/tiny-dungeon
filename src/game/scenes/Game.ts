import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { ASSETS } from '../assets';
import { gameStore } from '../core/GameStore';
import type { GameFx } from '../core/GameEngine';
import { CLASSES } from '../data/classes';
import { MONSTERS, WAVES } from '../data/monsters';
import { characterStats } from '../systems/progression';

type HeroView={body:Phaser.GameObjects.Rectangle;name:Phaser.GameObjects.Text;hpBg:Phaser.GameObjects.Rectangle;hp:Phaser.GameObjects.Rectangle;manaBg:Phaser.GameObjects.Rectangle;mana:Phaser.GameObjects.Rectangle;effects:Phaser.GameObjects.Text};
type MonsterView={body:Phaser.GameObjects.Arc;name:Phaser.GameObjects.Text;hpBg:Phaser.GameObjects.Rectangle;hp:Phaser.GameObjects.Rectangle};

export class Game extends Scene {
  private heroes=new Map<string,HeroView>();
  private enemies=new Map<string,MonsterView>();
  private floatLanes=new Map<string,number>();
  private unsubscribe?:()=>void;
  private unsubscribeFx?:()=>void;
  private progress!:Phaser.GameObjects.Text;
  private status!:Phaser.GameObjects.Text;
  private stairs!:Phaser.GameObjects.Container;
  private transitionBanner!:Phaser.GameObjects.Container;
  private transitionText!:Phaser.GameObjects.Text;

  constructor(){super('Game');}

  create(){
    const {width,height}=this.scale;
    this.cameras.main.setBackgroundColor('#090d13');

    const arena=this.add.image(width/2,345,ASSETS.arena.key);
    const arenaScale=900/arena.width;const cropHeight=500/arenaScale;
    arena.setCrop(0,(arena.height-cropHeight)/2,arena.width,cropHeight).setScale(arenaScale);
    this.add.rectangle(width/2,345,900,500,0x000000,0).setStrokeStyle(3,0x766543).setDepth(2);
    this.add.rectangle(width/2,345,900,500,0x07101a,.14).setDepth(1);

    this.add.text(width/2,28,'TINY DUNGEON',{fontFamily:'Georgia',fontSize:'27px',color:'#f0d79a',stroke:'#0b0c0f',strokeThickness:5}).setOrigin(.5).setDepth(8);
    this.progress=this.add.text(width/2,62,'',{fontFamily:'Georgia',fontSize:'16px',color:'#e3ddd0',stroke:'#080b10',strokeThickness:4}).setOrigin(.5).setDepth(8);
    this.status=this.add.text(width/2,height-22,'',{fontSize:'14px',color:'#e7cf95',stroke:'#05070a',strokeThickness:4,wordWrap:{width:850},align:'center'}).setOrigin(.5).setDepth(8);

    const glow=this.add.circle(0,0,52,0xe2bd62,.16).setStrokeStyle(3,0xf3cf70,.7);
    const stairLines:Phaser.GameObjects.Rectangle[]=[];
    for(let i=0;i<5;i++)stairLines.push(this.add.rectangle(0,-18+i*9,84-i*10,5,0xe8ca79).setStrokeStyle(1,0x5d4218));
    const stairLabel=this.add.text(0,35,'DESCENDO…',{fontFamily:'Georgia',fontSize:'13px',color:'#ffe4a0',stroke:'#12100b',strokeThickness:3}).setOrigin(.5);
    this.stairs=this.add.container(width/2,140,[glow,...stairLines,stairLabel]).setDepth(7).setVisible(false);
    this.tweens.add({targets:glow,alpha:{from:.08,to:.3},scale:{from:.85,to:1.12},duration:650,yoyo:true,repeat:-1});

    const bannerBg=this.add.rectangle(0,0,430,58,0x0a0d12,.86).setStrokeStyle(2,0xd1ad58,.8);
    this.transitionText=this.add.text(0,0,'',{fontFamily:'Georgia',fontSize:'19px',color:'#f1d796',align:'center',stroke:'#050608',strokeThickness:4}).setOrigin(.5);
    this.transitionBanner=this.add.container(width/2,345,[bannerBg,this.transitionText]).setDepth(12).setVisible(false);

    this.unsubscribe=gameStore.subscribe(()=>this.renderState());
    this.unsubscribeFx=gameStore.onFx(fx=>this.animateFx(fx));
    this.events.once('shutdown',()=>{this.unsubscribe?.();this.unsubscribeFx?.();this.heroes.clear();this.enemies.clear();this.floatLanes.clear();});
    this.renderState();
    EventBus.emit('current-scene-ready',this);
  }

  update(_time:number,delta:number){gameStore.tick(delta);}

  private renderState(){
    const state=gameStore.getSnapshot();
    const team=state.team.map(id=>state.characters.find(c=>c.id===id)).filter(Boolean) as typeof state.characters;
    this.progress.setText(`Ciclo ${state.cycle+1}  ·  Wave ${state.wave+1}/${WAVES.length} — ${WAVES[state.wave].name}`);
    this.status.setText(state.message);
    this.stairs.setVisible(state.status==='transition');
    const transitioning=state.status==='transition'||state.status==='recovering';
    this.transitionBanner.setVisible(transitioning);
    if(state.status==='recovering')this.transitionText.setText(`EQUIPE DERROTADA\nRecuperação: ${Math.max(0,Math.ceil(state.transitionMs/1000))}s`);
    else if(state.status==='transition')this.transitionText.setText(state.wave===WAVES.length-1?'REI DOS OSSOS DERROTADO\nRecompensas coletadas':'WAVE CONCLUÍDA\nA escada foi aberta');

    for(const [id,v] of this.heroes)if(!team.some(c=>c.id===id)){this.destroyHero(v);this.heroes.delete(id);}
    team.forEach((c,i)=>{
      const x=332+i*120,y=468;let v=this.heroes.get(c.id);
      if(!v){
        const hpBg=this.add.rectangle(x-45,y-54,90,8,0x32171c,.95).setOrigin(0,.5).setDepth(5);
        const manaBg=this.add.rectangle(x-45,y-43,90,6,0x152443,.95).setOrigin(0,.5).setDepth(5);
        v={body:this.add.rectangle(x,y,38,54,CLASSES[c.classId].color).setStrokeStyle(2,0xe4ddcf).setDepth(5),name:this.add.text(x,y+40,'',{fontSize:'12px',color:'#fff',stroke:'#090b0e',strokeThickness:4,align:'center'}).setOrigin(.5).setDepth(6),hpBg,hp:this.add.rectangle(x-45,y-54,90,6,0xc9535d).setOrigin(0,.5).setDepth(6),manaBg,mana:this.add.rectangle(x-45,y-43,90,4,0x557bd0).setOrigin(0,.5).setDepth(6),effects:this.add.text(x,y+58,'',{fontSize:'10px',color:'#9ce0af',stroke:'#080a0c',strokeThickness:3}).setOrigin(.5).setDepth(6)};
        this.heroes.set(c.id,v);
      }
      const stats=characterStats(c,state);v.name.setText(`${c.name} · Nv ${c.level}${c.hp<=0?'  ☠':''}`);v.hp.displayWidth=90*Math.max(0,c.hp/stats.maxHp);v.mana.displayWidth=90*Math.max(0,c.mana/stats.maxMana);v.effects.setText(c.effects.map(e=>e.type).join(' · '));v.body.setAlpha(c.hp>0?1:.25);
    });

    const activeIds=new Set(state.monsters.map(m=>m.uid));
    for(const [id,v] of this.enemies)if(!activeIds.has(id)){this.destroyMonster(v);this.enemies.delete(id);}
    state.monsters.forEach((m,i)=>{
      const x=452+i*120,y=222;const def=MONSTERS[m.defId];let v=this.enemies.get(m.uid);
      if(!v){
        const hpBg=this.add.rectangle(x-50,y-54,100,9,0x35171b,.95).setOrigin(0,.5).setDepth(5);
        v={body:this.add.circle(x,y,def.boss?38:29,def.color).setStrokeStyle(2,0xf0e3cd).setDepth(5),name:this.add.text(x,y+45,def.name,{fontSize:'12px',color:'#fff',stroke:'#090b0e',strokeThickness:4}).setOrigin(.5).setDepth(6),hpBg,hp:this.add.rectangle(x-50,y-54,100,7,0xd45a5f).setOrigin(0,.5).setDepth(6)};
        this.enemies.set(m.uid,v);
      }
      v.hp.displayWidth=100*Math.max(0,m.hp/m.maxHp);v.body.setVisible(m.alive);v.hp.setVisible(m.alive);v.hpBg.setVisible(m.alive);v.name.setAlpha(m.alive?1:.3);
    });
  }

  private animateFx(fx:GameFx){
    const source=this.entity(fx.source);const target=this.entity(fx.target);
    if(fx.type==='attack'&&source){
      if(target){const projectile=this.add.circle(source.x,source.y,5,0xf2ce72).setDepth(10).setStrokeStyle(2,0xffffff,.8);this.tweens.add({targets:projectile,x:target.x,y:target.y,duration:150,ease:'Quad.easeIn',onComplete:()=>projectile.destroy()});}
      this.tweens.add({targets:source,y:source.y-10,duration:75,yoyo:true,ease:'Sine.easeOut'});
    }
    if(fx.type==='damage'&&target){
      const originalX=target.x;this.tweens.add({targets:target,x:originalX+5,duration:45,yoyo:true,repeat:2,onComplete:()=>target.setX(originalX)});
      this.floatText(fx.target??'',target.x,target.y-42,`-${fx.value??0}`,'#ff7d7d');
    }
    if(fx.type==='heal'&&target){
      const pulse=this.add.circle(target.x,target.y,22,0x62dd94,.18).setStrokeStyle(3,0x8ff0b1).setDepth(9);this.tweens.add({targets:pulse,scale:1.8,alpha:0,duration:520,onComplete:()=>pulse.destroy()});
      this.floatText(fx.target??'',target.x,target.y-42,`+${fx.value??0}`,'#82f0aa');
    }
    if(fx.type==='death'&&target){for(let i=0;i<7;i++){const shard=this.add.circle(target.x,target.y,3,0xdcc89c).setDepth(10);const angle=(Math.PI*2/7)*i;this.tweens.add({targets:shard,x:target.x+Math.cos(angle)*45,y:target.y+Math.sin(angle)*45,alpha:0,duration:480,onComplete:()=>shard.destroy()});}this.tweens.add({targets:target,alpha:0,scale:.55,duration:260});}
    if(fx.type==='drop'&&fx.text)this.floatText('drop',this.scale.width/2,565,fx.text,'#ffd36e');
    if((fx.type==='stairs'||fx.type==='recovery')&&fx.text){this.transitionBanner.setAlpha(0).setVisible(true);this.tweens.add({targets:this.transitionBanner,alpha:1,duration:220});}
  }

  private entity(id?:string){if(!id)return undefined;return this.heroes.get(id)?.body??this.enemies.get(id)?.body;}
  private floatText(lane:string,x:number,y:number,text:string,color:string){const offset=(this.floatLanes.get(lane)??0)%3;this.floatLanes.set(lane,offset+1);const label=this.add.text(x+(offset-1)*16,y-offset*13,text,{fontFamily:'Arial Black',fontSize:'17px',color,stroke:'#08090b',strokeThickness:5}).setOrigin(.5).setDepth(15);this.tweens.add({targets:label,y:label.y-38,alpha:0,duration:850,ease:'Cubic.easeOut',onComplete:()=>label.destroy()});}
  private destroyHero(v:HeroView){Object.values(v).forEach(o=>o.destroy());}
  private destroyMonster(v:MonsterView){Object.values(v).forEach(o=>o.destroy());}
}
