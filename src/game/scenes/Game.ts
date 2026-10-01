import { GameObjects, Math as PhaserMath, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import type { CharacterDirection } from '../assets';
import { gameStore } from '../core/GameStore';
import { runtime } from '../rpg/runtime';
import type { GameFx } from '../core/GameEngine';
import type { Character, HuntStatus } from '../core/types';
import { MONSTERS } from '../data/monsters';
import { bossIdOf, huntWaves } from '../data/hunts';
import { characterStats } from '../systems/progression';
import { ART } from '../art/data';
import { ART_SCALE, ARENA, BACK_ROW, BOSS_CELL, CANVAS_H, cellCenter, cellKey, engagementSlots, entranceCells, formationCells, inArena, isBoxFull, spawnCells, stairCells, unitAnchor, type Cell } from '../art/geometry';
import { lookKey, type Look } from '../art/look';
import { characterTexture, characterWalkAnim, ensureLookTextures, mapTexture, monsterTexture } from '../art/textures';
import { dominantDirection, type ArenaPoint } from './movement';

const BAR_W=56,SPRITE_PX=32*ART_SCALE;
type HeroView={container:Phaser.GameObjects.Container;look:Look;key:string;body:Phaser.GameObjects.Sprite;name:Phaser.GameObjects.Text;hpBg:Phaser.GameObjects.Rectangle;hp:Phaser.GameObjects.Rectangle;manaBg:Phaser.GameObjects.Rectangle;mana:Phaser.GameObjects.Rectangle;effects:Phaser.GameObjects.Text;direction:CharacterDirection;moveTween?:Phaser.Tweens.Tween;walking:boolean};
type MonsterView={body:Phaser.GameObjects.Arc|Phaser.GameObjects.Sprite;name:Phaser.GameObjects.Text;hpBg:Phaser.GameObjects.Rectangle;hp:Phaser.GameObjects.Rectangle;art?:string;height:number;facing:CharacterDirection;barW:number;barDy:number;nameDy:number;big:boolean;cell:Cell;slot?:Cell;tween?:Phaser.Tweens.Tween;moving:boolean};

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

  /** O mapa inteiro é o canvas: 512×320 de arte ×2 = 1024×640, sem corte. */
  private applyArena(huntId:string){if(huntId===this.arenaHunt)return;this.arenaHunt=huntId;this.arena.setTexture(mapTexture(huntId));}

  constructor(){super('Game');}

  /** Posições em pixels (âncora de pés) a partir das células de geometria. */
  private points(cells:Map<string,{c:number;r:number}>):Map<string,ArenaPoint>{return new Map([...cells].map(([id,cell])=>[id,unitAnchor(cell)]));}
  private combatPoints(team:Character[]){return this.points(formationCells(team));}
  private entrancePoints(team:Character[]){return this.points(entranceCells(team.map(c=>c.id)));}
  private stairPoints(team:Character[]){return this.points(stairCells(team.map(c=>c.id)));}

  create(){
    const {width}=this.scale;
    this.cameras.main.setBackgroundColor('#090d13');

    this.arena=this.add.image(0,0,mapTexture(gameStore.getSnapshot().huntId)).setOrigin(0).setScale(ART_SCALE);this.arenaHunt=gameStore.getSnapshot().huntId;

    // Os textos saem do meio da arena: título e progresso na faixa da parede de cima; status na da parede de baixo.
    this.add.text(36,22,'TINY DUNGEON',{fontFamily:'Georgia',fontSize:'20px',color:'#f0d79a',stroke:'#0b0c0f',strokeThickness:4}).setOrigin(0,.5).setDepth(8);
    this.progress=this.add.text(260,22,'',{fontFamily:'Georgia',fontSize:'14px',color:'#e3ddd0',stroke:'#080b10',strokeThickness:4}).setOrigin(0,.5).setDepth(8);
    this.status=this.add.text(width/2,CANVAS_H-26,'',{fontSize:'14px',color:'#e7cf95',stroke:'#05070a',strokeThickness:4,wordWrap:{width:850},align:'center'}).setOrigin(.5).setDepth(8);

    const glow=this.add.circle(0,0,52,0xe2bd62,.16).setStrokeStyle(3,0xf3cf70,.7);
    const stairLines:Phaser.GameObjects.Rectangle[]=[];
    for(let i=0;i<5;i++)stairLines.push(this.add.rectangle(0,-18+i*9,84-i*10,5,0xe8ca79).setStrokeStyle(1,0x5d4218));
    const stairLabel=this.add.text(0,35,'DESCENDO…',{fontFamily:'Georgia',fontSize:'13px',color:'#ffe4a0',stroke:'#12100b',strokeThickness:3}).setOrigin(.5);
    this.stairs=this.add.container(width/2,112,[glow,...stairLines,stairLabel]).setDepth(7).setScale(.7).setVisible(false);
    this.tweens.add({targets:glow,alpha:{from:.08,to:.3},scale:{from:.85,to:1.12},duration:650,yoyo:true,repeat:-1});

    const bannerBg=this.add.rectangle(0,0,430,58,0x0a0d12,.86).setStrokeStyle(2,0xd1ad58,.8);
    this.transitionText=this.add.text(0,0,'',{fontFamily:'Georgia',fontSize:'19px',color:'#f1d796',align:'center',stroke:'#050608',strokeThickness:4}).setOrigin(.5);
    this.transitionBanner=this.add.container(width/2,CANVAS_H/2,[bannerBg,this.transitionText]).setDepth(12).setVisible(false);

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
    const entrances=this.entrancePoints(team);
    team.forEach(c=>{
      let v=this.heroes.get(c.id);
      if(!v){v=this.createHero(c,entrances.get(c.id)!);this.heroes.set(c.id,v);created.push(c.id);}
      if(v.key!==lookKey(c.look))this.swapLook(v,c);
      const stats=characterStats(c,state);
      v.name.setText(`${c.name} · Nv ${c.profile.level}${c.hp<=0?'  ☠':''}`);
      v.hp.displayWidth=BAR_W*Math.max(0,c.hp/stats.maxHp);v.mana.displayWidth=BAR_W*Math.max(0,c.mana/stats.maxMana);
      v.effects.setText(c.effects.map(e=>e.type).join(' · '));v.body.setAlpha(c.hp>0?1:.25);
    });

    const activeIds=new Set(state.monsters.map(m=>m.uid));
    for(const [id,v] of this.enemies)if(!activeIds.has(id)){this.destroyMonster(v);this.enemies.delete(id);}
    const total=Math.max(state.monsters.length,state.waveInfo?.total??0),hasBoss=state.monsters.some(m=>MONSTERS[m.defId].boss);
    const cells=spawnCells(total,hasBoss);let next=hasBoss?1:0;
    state.monsters.forEach(m=>{
      const def=MONSTERS[m.defId];const cell=def.boss&&hasBoss?cells[0]??BOSS_CELL:cells[next++]??cells[cells.length-1];
      let v=this.enemies.get(m.uid);
      if(!v){v=this.createMonster(m.defId,cell);this.enemies.set(m.uid,v);}
      v.hp.displayWidth=v.barW*Math.max(0,m.hp/m.maxHp);v.body.setVisible(m.alive);v.name.setVisible(m.alive);v.hpBg.setVisible(m.alive);v.hp.setVisible(m.alive);
      v.name.setText(`${def.name}${(m.statuses?.burn?` 🔥×${m.statuses.burn.stacks}`:'')}${(m.statuses?.frozen?' ❄':'')}${(m.statuses?.stunned?' ✦':'')}`);
      if(v.body instanceof GameObjects.Arc)v.body.setStrokeStyle(2,m.statuses?.frozen?0x8fd8ff:m.statuses?.burn?0xff8c3a:0xf0e3cd);
      else v.body.setTint(m.statuses?.frozen?0x9fdcff:m.statuses?.burn?0xffb070:0xffffff);
      v.name.setAlpha(m.alive?1:.3);
    });
    if(state.status==='running')this.approachHeroes(team);
    this.faceMonsters(team);

    if(state.status==='paused'&&!this.visualPaused){this.tweens.pauseAll();this.anims.pauseAll();this.visualPaused=true;}
    else if(state.status!=='paused'&&this.visualPaused){this.tweens.resumeAll();this.anims.resumeAll();this.visualPaused=false;}

    if(state.status==='idle'&&previousStatus!=='idle')this.resetHeroesToEntrance(team);
    else if(state.status==='running'&&(previousStatus==='idle'||previousStatus==='transition'||previousStatus==='recovering'||waveChanged))this.beginWave(team);
    else if(state.status==='transition'&&previousStatus==='running')this.leaveWave(team,state.wave===WAVES.length-1,state.transitionMs);
    else if(state.status==='recovering'&&previousStatus==='running')this.moveHeroes(team,this.entrancePoints(team),Math.min(1400,state.transitionMs));
    else if(state.status==='running'&&created.length){const formation=this.combatPoints(team);for(const id of created){const view=this.heroes.get(id),point=formation.get(id);if(view&&point)this.moveHero(view,point,900,()=>this.faceNearestEnemy(view));}}

    if(state.status==='running')for(const c of team){const view=this.heroes.get(c.id);if(view&&!view.walking&&c.hp>0)this.faceNearestEnemy(view);}
    this.previousStatus=state.status;this.previousWave=state.wave;this.previousCycle=state.cycle;
  }

  private inUseLooks(){return new Set([...this.heroes.values()].map(v=>v.key));}
  /** Cria o herói com a animação do `look`: sprite de 24×32 de arte ×2, âncora nos pés (0,5; 1). */
  private createHero(character:Character,point:ArenaPoint):HeroView{
    const look=ensureLookTextures(this,character.look,this.inUseLooks());
    const body=this.add.sprite(0,0,characterTexture(look,'down',1)).setOrigin(.5,1).setScale(ART_SCALE);
    const top=-SPRITE_PX;
    const hpBg=this.add.rectangle(-BAR_W/2,top-8,BAR_W,8,0x32171c,.95).setOrigin(0,.5);
    const manaBg=this.add.rectangle(-BAR_W/2,top+1-8+9,BAR_W,6,0x152443,.95).setOrigin(0,.5);
    const hp=this.add.rectangle(-BAR_W/2,top-8,BAR_W,6,0xc9535d).setOrigin(0,.5);
    const mana=this.add.rectangle(-BAR_W/2,top-8+9,BAR_W,4,0x557bd0).setOrigin(0,.5);
    const name=this.add.text(0,top-24,'',{fontSize:'11px',color:'#fff',stroke:'#090b0e',strokeThickness:4,align:'center'}).setOrigin(.5);
    const effects=this.add.text(0,8,'',{fontSize:'10px',color:'#9ce0af',stroke:'#080a0c',strokeThickness:3}).setOrigin(.5);
    const container=this.add.container(point.x,point.y,[body,hpBg,manaBg,hp,mana,name,effects]).setDepth(6+point.y/1000);
    return {container,look,key:lookKey(look),body,name,hpBg,hp,manaBg,mana,effects,direction:'down',walking:false};
  }
  /** Trocar a aparência troca a textura/animação do mesmo objeto de cena (sem recriar). */
  private swapLook(view:HeroView,character:Character){
    view.look=ensureLookTextures(this,character.look,this.inUseLooks());view.key=lookKey(view.look);
    this.setDirection(view,view.direction,view.walking);
  }

  private createMonster(defId:string,cell:{c:number;r:number}):MonsterView{
    const def=MONSTERS[defId],art=ART.meta.find(m=>m.tipo==='monstro'&&m.monstroId===defId);
    const big=art?.celulas==='2x2'||(!!def.boss&&!art);
    if(art){
      const a=unitAnchor(cell,big?{w:2,h:2}:{w:1,h:1}),h=art.altura*ART_SCALE,barW=big?100:BAR_W;
      const body=this.add.sprite(a.x,a.y,monsterTexture(art.id,'down',1)).setOrigin(.5,1).setScale(ART_SCALE).setDepth(5+a.y/1000);
      const hpBg=this.add.rectangle(a.x-barW/2,a.y-h-8,barW,9,0x35171b,.95).setOrigin(0,.5).setDepth(5);
      const hp=this.add.rectangle(a.x-barW/2,a.y-h-8,barW,7,0xd45a5f).setOrigin(0,.5).setDepth(6);
      const name=this.add.text(a.x,a.y-h-22,def.name,{fontSize:'11px',color:'#fff',stroke:'#090b0e',strokeThickness:4}).setOrigin(.5).setDepth(6);
      return {body,name,hpBg,hp,art:art.id,height:h,facing:'down',barW,barDy:-h-8,nameDy:-h-22,big,cell,moving:false};
    }
    // Sem arte em CSV: o círculo de sempre, no centro da célula (o chefe no centro do bloco 2×2).
    const c=cellCenter(cell),x=big?c.x+32:c.x,y=big?c.y+32:c.y,radius=big?38:24,barW=big?100:BAR_W;
    const hpBg=this.add.rectangle(x-barW/2,y-radius-14,barW,9,0x35171b,.95).setOrigin(0,.5).setDepth(5);
    const body=this.add.circle(x,y,radius,def.color).setStrokeStyle(2,0xf0e3cd).setDepth(5);
    const name=this.add.text(x,y+radius+10,def.name,{fontSize:'11px',color:'#fff',stroke:'#090b0e',strokeThickness:4}).setOrigin(.5).setDepth(6);
    const hp=this.add.rectangle(x-barW/2,y-radius-14,barW,7,0xd45a5f).setOrigin(0,.5).setDepth(6);
    return {body,name,hpBg,hp,height:radius*2,facing:'down',barW,barDy:-radius-14,nameDy:radius+10,big,cell,moving:false};
  }
  /** Posição do corpo do monstro (âncora dos pés com arte; centro no círculo) para uma célula. */
  private bodyPoint(v:MonsterView,cell:Cell):ArenaPoint{
    if(v.art)return unitAnchor(cell,v.big?{w:2,h:2}:{w:1,h:1});
    const c=cellCenter(cell);return v.big?{x:c.x+32,y:c.y+32}:c;
  }
  private setMonsterPos(v:MonsterView,x:number,y:number){
    v.body.setPosition(x,y).setDepth(5+y/1000);
    v.hpBg.setPosition(x-v.barW/2,y+v.barDy);v.hp.setPosition(x-v.barW/2,y+v.barDy);v.name.setPosition(x,y+v.nameDy);
  }
  /**
   * Os monstros avançam do ponto de nascimento até a "box" do tanque (as 8 células ao redor dele); quando as 8 vagas
   * acabam, os que sobram vão para a backline. Só visual: o combate não depende de posição.
   */
  private approachHeroes(team:Character[]){
    const formation=formationCells(team);if(!formation.size)return;
    const alive=team.filter(c=>c.hp>0&&formation.has(c.id));if(!alive.length)return;
    const tank=alive.find(c=>c.isTank&&c.row==='front')??alive.find(c=>c.row==='front')??alive[0];
    const back=alive.filter(c=>c.row==='back'&&c.id!==tank.id);
    const occupied=new Set<string>([...formation.values()].map(cellKey));
    const pending:MonsterView[]=[];
    for(const v of this.enemies.values()){
      if(v.slot){for(let dc=0;dc<(v.big?2:1);dc++)for(let dr=0;dr<(v.big?2:1);dr++)occupied.add(cellKey({c:v.slot.c+dc,r:v.slot.r+dr}));}
      else if(v.body.visible)pending.push(v);
    }
    // ocupa também as células de nascimento de quem ainda não saiu do lugar
    for(const v of this.enemies.values())if(!v.slot){for(let dc=0;dc<(v.big?2:1);dc++)for(let dr=0;dr<(v.big?2:1);dr++)occupied.add(cellKey({c:v.cell.c+dc,r:v.cell.r+dr}));}
    const targetCell=formation.get(tank.id)!;
    for(const v of pending){
      let slot:Cell|undefined;
      if(v.big){
        const c0=Math.max(0,Math.min(ARENA.cols-2,targetCell.c-1)),block={c:c0,r:Math.max(0,targetCell.r-3)};
        slot=block;for(let dc=0;dc<2;dc++)for(let dr=0;dr<2;dr++)occupied.add(cellKey({c:block.c+dc,r:block.r+dr}));
      }else{
        for(const key of [cellKey(v.cell)])occupied.delete(key);
        const from=v.cell,tankFull=isBoxFull(targetCell,occupied);
        const targets=[...(tankFull?[]:[targetCell]),...back.map(b=>formation.get(b.id)!),...(tankFull&&!back.length?[targetCell]:[])];
        for(const t of targets){const slots=engagementSlots(t,occupied,from).filter(c=>c.r<BACK_ROW+1&&inArena(c));if(slots.length){slot=slots[0];break;}}
        occupied.add(cellKey(slot??v.cell));
      }
      if(!slot)continue;
      v.slot=slot;this.walkMonster(v,this.bodyPoint(v,slot));
    }
  }
  /** Caminha até o destino (2 poses alternando, olhando para o lado do movimento); acima de ×5 teleporta. */
  private walkMonster(v:MonsterView,to:ArenaPoint){
    v.tween?.stop();
    const from={x:v.body.x,y:v.body.y},dist=PhaserMath.Distance.Between(from.x,from.y,to.x,to.y);
    if(dist<1)return;
    if(runtime.huntSpeed>5){this.setMonsterPos(v,to.x,to.y);return;}
    const dir=dominantDirection(from,to,'down');v.facing=dir;v.moving=true;
    const sprite=v.art&&v.body instanceof GameObjects.Sprite?v.body:undefined,start=this.time.now;
    const state={t:0};
    v.tween=this.tweens.add({targets:state,t:1,duration:Math.min(2600,dist*9+500),ease:'Sine.easeInOut',
      onUpdate:()=>{this.setMonsterPos(v,from.x+(to.x-from.x)*state.t,from.y+(to.y-from.y)*state.t);if(sprite&&v.art)sprite.setTexture(monsterTexture(v.art,dir,(Math.floor((this.time.now-start)/170)%2===0?1:2)));},
      onComplete:()=>{v.moving=false;v.tween=undefined;this.setMonsterPos(v,to.x,to.y);if(sprite&&v.art)sprite.setTexture(monsterTexture(v.art,v.facing,1));}});
  }
  /** Monstros com arte olham para o herói vivo mais próximo (`down` por padrão). */
  private faceMonsters(team:Character[]){
    const targets=team.filter(c=>c.hp>0).map(c=>this.heroes.get(c.id)).filter((v):v is HeroView=>!!v);
    for(const m of this.enemies.values()){
      if(!m.art||m.moving||!(m.body instanceof GameObjects.Sprite))continue;
      const from={x:m.body.x,y:m.body.y-m.height/2};
      const near=targets.sort((a,b)=>PhaserMath.Distance.Between(from.x,from.y,a.container.x,a.container.y)-PhaserMath.Distance.Between(from.x,from.y,b.container.x,b.container.y))[0];
      const dir=near?dominantDirection(from,{x:near.container.x,y:near.container.y-32},'down'):'down';
      if(dir!==m.facing){m.facing=dir;m.body.setTexture(monsterTexture(m.art,dir,1));}
    }
  }

  private beginWave(team:Character[]){
    const entrances=this.entrancePoints(team),combat=this.combatPoints(team);
    for(const character of team){const view=this.heroes.get(character.id),start=entrances.get(character.id),target=combat.get(character.id);if(!view||!start||!target)continue;this.stopHero(view);view.container.setPosition(start.x,start.y).setVisible(true);this.moveHero(view,target,1050,()=>this.faceNearestEnemy(view));}
  }

  private leaveWave(team:Character[],boss:boolean,transitionMs:number){
    const targets=boss?this.entrancePoints(team):this.stairPoints(team);
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

  /** Andando: animação de 2 poses; parado: pose 1 da direção. */
  private setDirection(view:HeroView,direction:CharacterDirection,walking:boolean){
    view.direction=direction;
    if(walking)view.body.play(characterWalkAnim(view.look,direction),true);
    else{view.body.stop();view.body.setTexture(characterTexture(view.look,direction,1));}
  }

  private faceNearestEnemy(view:HeroView){const target=[...this.enemies.values()].find(enemy=>enemy.body.visible);if(target){const p=this.focusOf(target.body,target.height);this.setDirection(view,dominantDirection({x:view.container.x,y:view.container.y-SPRITE_PX/2},p,view.direction),false);}}

  private resetHeroesToEntrance(team:Character[]){
    const formation=this.entrancePoints(team);for(const character of team){const view=this.heroes.get(character.id),point=formation.get(character.id);if(!view||!point)continue;this.stopHero(view);this.tweens.killTweensOf(view.container);this.tweens.killTweensOf(view.body);view.container.setPosition(point.x,point.y).setDepth(6+point.y/1000);this.setDirection(view,'up',false);}
  }

  private stopHero(view:HeroView){view.moveTween?.stop();view.moveTween=undefined;view.walking=false;view.body.stop();}
  private cancelAllHeroMovement(){for(const view of this.heroes.values()){this.stopHero(view);this.tweens.killTweensOf(view.container);this.tweens.killTweensOf(view.body);}}

  /** Centro visual: heróis e monstros com arte têm âncora nos pés (sobe meia altura); o círculo já está no centro. */
  private focusOf(body:Phaser.GameObjects.Arc|Phaser.GameObjects.Sprite,height:number){return body instanceof GameObjects.Sprite?{x:body.x,y:body.y-height/2}:{x:body.x,y:body.y};}
  private focus(id?:string):ArenaPoint|undefined{
    if(!id)return undefined;
    const hero=this.heroes.get(id);if(hero)return {x:hero.container.x,y:hero.container.y-SPRITE_PX/2};
    const m=this.enemies.get(id);return m?this.focusOf(m.body,m.height):undefined;
  }

  private animateFx(fx:GameFx){
    const source=this.focus(fx.source),target=this.focus(fx.target);
    if(fx.type==='attack'&&source){
      const hero=fx.source?this.heroes.get(fx.source):undefined,monster=fx.source?this.enemies.get(fx.source):undefined;
      if(hero&&target)this.setDirection(hero,dominantDirection({x:hero.container.x,y:hero.container.y-SPRITE_PX/2},target,hero.direction),hero.walking);
      if(monster?.art&&target&&monster.body instanceof GameObjects.Sprite){const dir=dominantDirection(source,target,'down');monster.facing=dir;monster.body.setTexture(monsterTexture(monster.art,dir,1));}
      if(target){const projectile=this.add.circle(source.x,source.y,5,0xf2ce72).setDepth(10).setStrokeStyle(2,0xffffff,.8);this.tweens.add({targets:projectile,x:target.x,y:target.y,duration:150,ease:'Quad.easeIn',onComplete:()=>projectile.destroy()});}
      const attackBody=hero?.body??monster?.body;if(attackBody){const dx=target?PhaserMath.Clamp(target.x-source.x,-8,8):0;const dy=target?PhaserMath.Clamp(target.y-source.y,-8,8):-8;
        this.tweens.add({targets:attackBody,x:attackBody.x+dx,y:attackBody.y+dy,duration:70,yoyo:true,ease:'Sine.easeOut'});}
    }
    if(fx.type==='damage'&&target){const body=this.entityBody(fx.target);if(body){const originalX=body.x;this.tweens.add({targets:body,x:originalX+5,duration:45,yoyo:true,repeat:2,onComplete:()=>body.setX(originalX)});}this.floatText(fx.target??'',target.x,target.y-42,`-${fx.value??0}`,'#ff7d7d');}
    if(fx.type==='heal'&&target){const pulse=this.add.circle(target.x,target.y,22,0x62dd94,.18).setStrokeStyle(3,0x8ff0b1).setDepth(9);this.tweens.add({targets:pulse,scale:1.8,alpha:0,duration:520,onComplete:()=>pulse.destroy()});this.floatText(fx.target??'',target.x,target.y-42,`+${fx.value??0}`,'#82f0aa');}
    if(fx.type==='death'&&target){for(let i=0;i<7;i++){const shard=this.add.circle(target.x,target.y,3,0xdcc89c).setDepth(10);const angle=(Math.PI*2/7)*i;this.tweens.add({targets:shard,x:target.x+Math.cos(angle)*45,y:target.y+Math.sin(angle)*45,alpha:0,duration:480,onComplete:()=>shard.destroy()});}const t=this.entity(fx.target);if(t)this.tweens.add({targets:t,alpha:0,scale:.55,duration:260});}
    if(fx.type==='drop'&&fx.text)this.floatText('drop',this.scale.width/2,CANVAS_H-60,fx.text,'#ffd36e');
    if((fx.type==='stairs'||fx.type==='recovery')&&fx.text){this.transitionBanner.setAlpha(0).setVisible(true);this.tweens.add({targets:this.transitionBanner,alpha:1,duration:220});}
  }

  private entity(id?:string):Phaser.GameObjects.Components.Transform|undefined{if(!id)return undefined;return this.heroes.get(id)?.container??this.enemies.get(id)?.body;}
  private entityBody(id?:string):Phaser.GameObjects.Sprite|Phaser.GameObjects.Arc|undefined{if(!id)return undefined;return this.heroes.get(id)?.body??this.enemies.get(id)?.body;}
  private floatText(lane:string,x:number,y:number,text:string,color:string){const offset=(this.floatLanes.get(lane)??0)%3;this.floatLanes.set(lane,offset+1);const label=this.add.text(x+(offset-1)*16,y-offset*13,text,{fontFamily:'Arial Black',fontSize:'17px',color,stroke:'#08090b',strokeThickness:5}).setOrigin(.5).setDepth(15);this.tweens.add({targets:label,y:label.y-38,alpha:0,duration:850,ease:'Cubic.easeOut',onComplete:()=>label.destroy()});}
  private destroyHero(v:HeroView){this.stopHero(v);v.container.destroy(true);}
  private destroyMonster(v:MonsterView){v.tween?.stop();v.body.destroy();v.name.destroy();v.hpBg.destroy();v.hp.destroy();}
}
