import { Math as PhaserMath, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { CHARACTER_SPRITES, mapKey, characterAnimationKey, spriteTexturesReady, type CharacterDirection } from '../assets';
import { gameStore } from '../core/GameStore';
import { runtime } from '../rpg/runtime';
import type { GameFx } from '../core/GameEngine';
import type { Character, HuntStatus } from '../core/types';
import { CLASSES } from '../data/classes';
import { MONSTERS } from '../data/monsters';
import { wavePositions } from '../systems/waves';
import { bossIdOf, huntWaves } from '../data/hunts';
import { characterStats } from '../systems/progression';
import { combatFormation, dominantDirection, entranceFormation, stairFormation, type ArenaPoint } from './movement';

type HeroBody=Phaser.GameObjects.Sprite|Phaser.GameObjects.Rectangle;
type HeroView={container:Phaser.GameObjects.Container;spriteId:string;body:HeroBody;sprite?:Phaser.GameObjects.Sprite;name:Phaser.GameObjects.Text;hpBg:Phaser.GameObjects.Rectangle;hp:Phaser.GameObjects.Rectangle;manaBg:Phaser.GameObjects.Rectangle;mana:Phaser.GameObjects.Rectangle;effects:Phaser.GameObjects.Text;direction:CharacterDirection;moveTween?:Phaser.Tweens.Tween;walking:boolean};
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
  private previousStatus:HuntStatus='idle';
  private previousWave=-1;
  private previousCycle=-1;
  private visualPaused=false;
  private arena!:Phaser.GameObjects.Image;
  private arenaHunt='';

  /** Janela de 900×500: escala 900/largura e corte central de 500 px de altura (mesma conta para todos os mapas). */
  private fitArena(){const a=this.arena;const scale=900/a.width;const crop=500/scale;a.setCrop(0,(a.height-crop)/2,a.width,crop).setScale(scale);}
  private applyArena(huntId:string){if(huntId===this.arenaHunt)return;this.arenaHunt=huntId;this.arena.setTexture(mapKey(huntId));this.arena.setCrop();this.fitArena();}

  constructor(){super('Game');}

  create(){
    const {width,height}=this.scale;
    this.cameras.main.setBackgroundColor('#090d13');

    this.arena=this.add.image(width/2,345,mapKey(gameStore.getSnapshot().huntId));this.arenaHunt=gameStore.getSnapshot().huntId;this.fitArena();
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
    this.events.once('shutdown',()=>{this.unsubscribe?.();this.unsubscribeFx?.();this.cancelAllHeroMovement();this.heroes.clear();this.enemies.clear();this.floatLanes.clear();});
    this.renderState();
    EventBus.emit('current-scene-ready',this);
  }

  update(_time:number,delta:number){gameStore.advance(delta,runtime.huntSpeed);}

  private renderState(){
    const state=gameStore.getSnapshot();
    this.applyArena(state.huntId);
    const WAVES=huntWaves(state.huntId);
    const team=state.team.map(id=>state.characters.find(c=>c.id===id)).filter(Boolean) as Character[];
    const previousStatus=this.previousStatus;
    const waveChanged=state.wave!==this.previousWave||state.cycle!==this.previousCycle;
    this.progress.setText(`Ciclo ${state.cycle+1}  ·  Wave ${state.wave+1}/${WAVES.length} — ${WAVES[state.wave].name}`);
    this.status.setText(state.message);
    this.stairs.setVisible(state.status==='transition'&&state.wave<WAVES.length-1);
    const transitioning=state.status==='transition'||state.status==='recovering';
    this.transitionBanner.setVisible(transitioning);
    if(state.status==='recovering')this.transitionText.setText(`EQUIPE DERROTADA\nRecuperação: ${Math.max(0,Math.ceil(state.transitionMs/1000))}s`);
    else if(state.status==='transition')this.transitionText.setText(state.wave===WAVES.length-1?`${MONSTERS[bossIdOf(state.huntId)].name.toUpperCase()} DERROTADO\nRecompensas coletadas`:'WAVE CONCLUÍDA\nA escada foi aberta');

    for(const [id,v] of this.heroes)if(!team.some(c=>c.id===id)){this.destroyHero(v);this.heroes.delete(id);}
    const created:string[]=[];
    const entrances=entranceFormation(team);
    team.forEach(c=>{
      let v=this.heroes.get(c.id);
      if(!v){v=this.createHero(c,entrances.get(c.id)!);this.heroes.set(c.id,v);created.push(c.id);}
      if(v.spriteId!==c.spriteId)this.swapBody(v,c);
      const stats=characterStats(c,state);
      v.name.setText(`${c.name} · Nv ${c.profile.level}${c.hp<=0?'  ☠':''}`);
      v.hp.displayWidth=90*Math.max(0,c.hp/stats.maxHp);v.mana.displayWidth=90*Math.max(0,c.mana/stats.maxMana);
      v.effects.setText(c.effects.map(e=>e.type).join(' · '));v.body.setAlpha(c.hp>0?1:.25);
    });

    const activeIds=new Set(state.monsters.map(m=>m.uid));
    for(const [id,v] of this.enemies)if(!activeIds.has(id)){this.destroyMonster(v);this.enemies.delete(id);}
    const layout=wavePositions(Math.max(state.monsters.length,state.waveInfo?.total??0));
    state.monsters.forEach((m,i)=>{
      const {x,y}=layout[i];const def=MONSTERS[m.defId];let v=this.enemies.get(m.uid);
      if(!v){const hpBg=this.add.rectangle(x-50,y-54,100,9,0x35171b,.95).setOrigin(0,.5).setDepth(5);v={body:this.add.circle(x,y,(def.boss?38:29)*(layout.length>12?.9:1),def.color).setStrokeStyle(2,0xf0e3cd).setDepth(5),name:this.add.text(x,y+45,def.name,{fontSize:'12px',color:'#fff',stroke:'#090b0e',strokeThickness:4}).setOrigin(.5).setDepth(6),hpBg,hp:this.add.rectangle(x-50,y-54,100,7,0xd45a5f).setOrigin(0,.5).setDepth(6)};this.enemies.set(m.uid,v);}
      v.hp.displayWidth=100*Math.max(0,m.hp/m.maxHp);v.body.setVisible(m.alive);v.name.setText(`${def.name}${(m.statuses?.burn?` 🔥×${m.statuses.burn.stacks}`:'')}${(m.statuses?.frozen?' ❄':'')}${(m.statuses?.stunned?' ✦':'')}`);v.body.setStrokeStyle(2,m.statuses?.frozen?0x8fd8ff:m.statuses?.burn?0xff8c3a:0xf0e3cd);v.hp.setVisible(m.alive);v.hpBg.setVisible(m.alive);v.name.setAlpha(m.alive?1:.3);
    });

    if(state.status==='paused'&&!this.visualPaused){this.tweens.pauseAll();this.anims.pauseAll();this.visualPaused=true;}
    else if(state.status!=='paused'&&this.visualPaused){this.tweens.resumeAll();this.anims.resumeAll();this.visualPaused=false;}

    if(state.status==='idle'&&previousStatus!=='idle')this.resetHeroesToEntrance(team);
    else if(state.status==='running'&&(previousStatus==='idle'||previousStatus==='transition'||previousStatus==='recovering'||waveChanged))this.beginWave(team);
    else if(state.status==='transition'&&previousStatus==='running')this.leaveWave(team,state.wave===WAVES.length-1,state.transitionMs);
    else if(state.status==='recovering'&&previousStatus==='running')this.moveHeroes(team,entranceFormation(team),Math.min(1400,state.transitionMs));
    else if(state.status==='running'&&created.length){const formation=combatFormation(team);for(const id of created){const view=this.heroes.get(id),point=formation.get(id);if(view&&point)this.moveHero(view,point,900,()=>this.faceNearestEnemy(view));}}

    if(state.status==='running')for(const c of team){const view=this.heroes.get(c.id);if(view&&!view.walking&&c.hp>0)this.faceNearestEnemy(view);}
    this.previousStatus=state.status;this.previousWave=state.wave;this.previousCycle=state.cycle;
  }

  /** Sprite escolhido, só se os 8 PNGs carregaram; senão undefined e o herói é um bloco colorido. */
  private spriteAsset(spriteId:string){const asset=CHARACTER_SPRITES[spriteId];return asset&&spriteTexturesReady(this.textures,asset)?asset:undefined;}
  private makeBody(character:Character):{body:HeroBody;sprite?:Phaser.GameObjects.Sprite}{
    const asset=this.spriteAsset(character.spriteId);
    if(asset){const sprite=this.add.sprite(0,0,asset.frames.down[0]).setOrigin(...asset.origin).setScale(asset.scale);return {body:sprite,sprite};}
    return {body:this.add.rectangle(0,0,38,54,CLASSES[character.classId].color).setStrokeStyle(2,0xe4ddcf)};
  }
  /** Troca o corpo do herói (sprite escolhido depois de criado) mantendo posição, barras e nome. */
  private swapBody(view:HeroView,character:Character){
    view.container.remove(view.body,true);
    const {body,sprite}=this.makeBody(character);
    view.container.addAt(body,0);view.body=body;view.sprite=sprite;view.spriteId=character.spriteId;
    this.setDirection(view,view.direction,view.walking);
  }
  private createHero(character:Character,point:ArenaPoint):HeroView{
    const {body,sprite}=this.makeBody(character);
    const hpBg=this.add.rectangle(-45,-54,90,8,0x32171c,.95).setOrigin(0,.5);
    const manaBg=this.add.rectangle(-45,-43,90,6,0x152443,.95).setOrigin(0,.5);
    const hp=this.add.rectangle(-45,-54,90,6,0xc9535d).setOrigin(0,.5);
    const mana=this.add.rectangle(-45,-43,90,4,0x557bd0).setOrigin(0,.5);
    const name=this.add.text(0,40,'',{fontSize:'12px',color:'#fff',stroke:'#090b0e',strokeThickness:4,align:'center'}).setOrigin(.5);
    const effects=this.add.text(0,58,'',{fontSize:'10px',color:'#9ce0af',stroke:'#080a0c',strokeThickness:3}).setOrigin(.5);
    const container=this.add.container(point.x,point.y,[body,hpBg,manaBg,hp,mana,name,effects]).setDepth(6+point.y/1000);
    return {container,spriteId:character.spriteId,body,sprite,name,hpBg,hp,manaBg,mana,effects,direction:'down',walking:false};
  }

  private beginWave(team:Character[]){
    const entrances=entranceFormation(team),combat=combatFormation(team);
    for(const character of team){const view=this.heroes.get(character.id),start=entrances.get(character.id),target=combat.get(character.id);if(!view||!start||!target)continue;this.stopHero(view);view.container.setPosition(start.x,start.y).setVisible(true);this.moveHero(view,target,1050,()=>this.faceNearestEnemy(view));}
  }

  private leaveWave(team:Character[],boss:boolean,transitionMs:number){
    const targets=boss?entranceFormation(team):stairFormation(team);
    this.moveHeroes(team,targets,Math.max(250,Math.min(boss?1450:850,transitionMs)));
  }

  private moveHeroes(team:Character[],targets:Map<string,ArenaPoint>,duration:number){
    for(const character of team){const view=this.heroes.get(character.id),target=targets.get(character.id);if(view&&target)this.moveHero(view,target,duration);}
  }

  private moveHero(view:HeroView,target:ArenaPoint,duration:number,onComplete?:()=>void){
    this.stopHero(view);
    if(runtime.huntSpeed>5){view.container.setPosition(target.x,target.y).setDepth(6+target.y/1000);onComplete?.();return;}
    const direction=dominantDirection({x:view.container.x,y:view.container.y},target,view.direction);
    const distance=PhaserMath.Distance.Between(view.container.x,view.container.y,target.x,target.y);
    if(distance<1){this.setDirection(view,direction,false);onComplete?.();return;}
    view.walking=true;this.setDirection(view,direction,true);
    view.moveTween=this.tweens.add({targets:view.container,x:target.x,y:target.y,duration,ease:'Sine.easeInOut',onUpdate:()=>view.container.setDepth(6+view.container.y/1000),onComplete:()=>{view.moveTween=undefined;view.walking=false;this.setDirection(view,direction,false);onComplete?.();}});
  }

  private setDirection(view:HeroView,direction:CharacterDirection,walking:boolean){
    view.direction=direction;if(!view.sprite)return;
    const character=[...this.heroes.entries()].find(([,candidate])=>candidate===view)?.[0];
    const spriteId=character?gameStore.getSnapshot().characters.find(c=>c.id===character)?.spriteId:undefined;
    const asset=spriteId?this.spriteAsset(spriteId):undefined;if(!asset)return;
    if(walking)view.sprite.play(characterAnimationKey(spriteId!,direction),true);
    else{view.sprite.stop();view.sprite.setTexture(asset.frames[direction][0]);}
  }

  private faceNearestEnemy(view:HeroView){const target=[...this.enemies.values()].find(enemy=>enemy.body.visible);if(target)this.setDirection(view,dominantDirection({x:view.container.x,y:view.container.y},{x:target.body.x,y:target.body.y},view.direction),false);}

  private resetHeroesToEntrance(team:Character[]){
    const formation=entranceFormation(team);for(const character of team){const view=this.heroes.get(character.id),point=formation.get(character.id);if(!view||!point)continue;this.stopHero(view);this.tweens.killTweensOf(view.container);this.tweens.killTweensOf(view.body);view.container.setPosition(point.x,point.y).setDepth(6+point.y/1000);this.setDirection(view,'up',false);}
  }

  private stopHero(view:HeroView){view.moveTween?.stop();view.moveTween=undefined;view.walking=false;if(view.sprite)view.sprite.stop();}
  private cancelAllHeroMovement(){for(const view of this.heroes.values()){this.stopHero(view);this.tweens.killTweensOf(view.container);this.tweens.killTweensOf(view.body);}}

  private animateFx(fx:GameFx){
    const source=this.entity(fx.source),target=this.entity(fx.target);
    if(fx.type==='attack'&&source){
      const hero=fx.source?this.heroes.get(fx.source):undefined;
      if(hero&&target)this.setDirection(hero,dominantDirection({x:hero.container.x,y:hero.container.y},{x:target.x,y:target.y},hero.direction),hero.walking);
      if(target){const projectile=this.add.circle(source.x,source.y-18,5,0xf2ce72).setDepth(10).setStrokeStyle(2,0xffffff,.8);this.tweens.add({targets:projectile,x:target.x,y:target.y,duration:150,ease:'Quad.easeIn',onComplete:()=>projectile.destroy()});}
      const attackBody=hero?.body??source;const dx=target?PhaserMath.Clamp(target.x-source.x,-8,8):0;const dy=target?PhaserMath.Clamp(target.y-source.y,-8,8):-8;
      this.tweens.add({targets:attackBody,x:attackBody.x+dx,y:attackBody.y+dy,duration:70,yoyo:true,ease:'Sine.easeOut'});
    }
    if(fx.type==='damage'&&target){const body=this.entityBody(fx.target)??target;const originalX=body.x;this.tweens.add({targets:body,x:originalX+5,duration:45,yoyo:true,repeat:2,onComplete:()=>body.setX(originalX)});this.floatText(fx.target??'',target.x,target.y-42,`-${fx.value??0}`,'#ff7d7d');}
    if(fx.type==='heal'&&target){const pulse=this.add.circle(target.x,target.y,22,0x62dd94,.18).setStrokeStyle(3,0x8ff0b1).setDepth(9);this.tweens.add({targets:pulse,scale:1.8,alpha:0,duration:520,onComplete:()=>pulse.destroy()});this.floatText(fx.target??'',target.x,target.y-42,`+${fx.value??0}`,'#82f0aa');}
    if(fx.type==='death'&&target){for(let i=0;i<7;i++){const shard=this.add.circle(target.x,target.y,3,0xdcc89c).setDepth(10);const angle=(Math.PI*2/7)*i;this.tweens.add({targets:shard,x:target.x+Math.cos(angle)*45,y:target.y+Math.sin(angle)*45,alpha:0,duration:480,onComplete:()=>shard.destroy()});}this.tweens.add({targets:target,alpha:0,scale:.55,duration:260});}
    if(fx.type==='drop'&&fx.text)this.floatText('drop',this.scale.width/2,565,fx.text,'#ffd36e');
    if((fx.type==='stairs'||fx.type==='recovery')&&fx.text){this.transitionBanner.setAlpha(0).setVisible(true);this.tweens.add({targets:this.transitionBanner,alpha:1,duration:220});}
  }

  private entity(id?:string):Phaser.GameObjects.Components.Transform|undefined{if(!id)return undefined;return this.heroes.get(id)?.container??this.enemies.get(id)?.body;}
  private entityBody(id?:string):HeroBody|Phaser.GameObjects.Arc|undefined{if(!id)return undefined;return this.heroes.get(id)?.body??this.enemies.get(id)?.body;}
  private floatText(lane:string,x:number,y:number,text:string,color:string){const offset=(this.floatLanes.get(lane)??0)%3;this.floatLanes.set(lane,offset+1);const label=this.add.text(x+(offset-1)*16,y-offset*13,text,{fontFamily:'Arial Black',fontSize:'17px',color,stroke:'#08090b',strokeThickness:5}).setOrigin(.5).setDepth(15);this.tweens.add({targets:label,y:label.y-38,alpha:0,duration:850,ease:'Cubic.easeOut',onComplete:()=>label.destroy()});}
  private destroyHero(v:HeroView){this.stopHero(v);v.container.destroy(true);}
  private destroyMonster(v:MonsterView){Object.values(v).forEach(o=>o.destroy());}
}
