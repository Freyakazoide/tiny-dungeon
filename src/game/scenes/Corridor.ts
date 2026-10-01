import { GameObjects, Math as PhaserMath, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import type { CharacterDirection } from '../assets';
import { gameStore } from '../core/GameStore';
import { runtime } from '../rpg/runtime';
import type { GameFx } from '../core/GameEngine';
import type { Character, GameState } from '../core/types';
import { MONSTERS } from '../data/monsters';
import { HUNT_BY_ID } from '../data/hunts';
import { ART } from '../art/data';
import { ART_SCALE, CELL_PX } from '../art/geometry';
import { obstacleArt } from '../data/obstacles';
import { lookKey, type Look } from '../art/look';
import { cellTexture, characterTexture, characterWalkAnim, ensureLookTextures, monsterTexture, obstacleTexture, type CellKind } from '../art/textures';
import type { FxKind } from '../systems/spellFx';
import { BAND, CHUNK_LEN, RunPlan } from '../run/plan';
import { playAttackFx } from './effects';
import { dominantDirection, type ArenaPoint } from './movement';

/**
 * Cena do corredor procedural. Mundo em células de 64 px: o grupo anda para o lado de `d` crescente, que na tela é a ESQUERDA
 * (x do mundo = −d × 64). A câmera acompanha o grupo (x fixo à direita, y suave nas rampas). Os blocos de chão e parede são
 * criados só para o que a câmera vê e descartados atrás dela.
 */
const W = 1024, H = 640, HERO_X = 760, SPRITE_PX = 32 * ART_SCALE, BAR_W = 56;
const wx = (d: number) => -d * CELL_PX, wy = (y: number) => y * CELL_PX;
type HeroView = { container: Phaser.GameObjects.Container; look: Look; key: string; body: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text; direction: CharacterDirection; walking: boolean; last?: { d: number; y: number } };
type MonsterView = { body: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text; hpBg: Phaser.GameObjects.Rectangle; hp: Phaser.GameObjects.Rectangle; art?: string; height: number; facing: CharacterDirection; barW: number; barDy: number; nameDy: number; big: boolean; last?: { d: number; y: number } };

export class Game extends Scene {
  private heroes = new Map<string, HeroView>();
  private enemies = new Map<string, MonsterView>();
  private tiles = new Map<string, Phaser.GameObjects.Image>();
  private props = new Map<string, Phaser.GameObjects.Image>();
  private floatLanes = new Map<string, number>();
  private unsubscribe?: () => void;
  private unsubscribeFx?: () => void;
  private plan?: RunPlan;
  private planKey = '';
  private camY = 0;
  private title!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerUntil = 0;
  private visualPaused = false;

  constructor() { super('Game'); }

  create() {
    this.cameras.main.setBackgroundColor('#090d13');
    this.title = this.add.text(20, 14, '', { fontFamily: 'Georgia', fontSize: '15px', color: '#f0d79a', stroke: '#0b0c0f', strokeThickness: 4 }).setScrollFactor(0).setDepth(100);
    this.status = this.add.text(W / 2, H - 22, '', { fontSize: '14px', color: '#e7cf95', stroke: '#05070a', strokeThickness: 4, wordWrap: { width: 850 }, align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(100);
    const bg = this.add.rectangle(0, 0, 470, 58, 0x0a0d12, .86).setStrokeStyle(2, 0xd1ad58, .8);
    this.bannerText = this.add.text(0, 0, '', { fontFamily: 'Georgia', fontSize: '19px', color: '#f1d796', align: 'center', stroke: '#050608', strokeThickness: 4 }).setOrigin(.5);
    this.banner = this.add.container(W / 2, H / 2 - 120, [bg, this.bannerText]).setScrollFactor(0).setDepth(101).setVisible(false);
    this.unsubscribe = gameStore.subscribe(() => this.renderState());
    this.unsubscribeFx = gameStore.onFx(fx => this.animateFx(fx));
    if (import.meta.env.DEV) { (window as unknown as { __scene?: unknown }).__scene = this; (window as unknown as { __fx?: unknown }).__fx = (kind: FxKind, a: ArenaPoint, b: ArenaPoint) => playAttackFx(this, kind, a, b); }
    this.events.once('shutdown', () => { this.unsubscribe?.(); this.unsubscribeFx?.(); this.heroes.clear(); this.enemies.clear(); this.tiles.clear(); this.props.clear(); this.floatLanes.clear(); });
    this.renderState();
    EventBus.emit('current-scene-ready', this);
  }

  update(_time: number, delta: number) {
    gameStore.advance(delta, runtime.huntSpeed);
    this.drawWorld(gameStore.getSnapshot());
    if (this.bannerUntil && this.time.now > this.bannerUntil && gameStore.getSnapshot().status !== 'recovering') { this.bannerUntil = 0; this.banner.setVisible(false); }
  }

  /** Plano (puro) da run atual; sem run (parado), uma pré-visualização fixa da hunt. */
  private planFor(state: GameState) {
    const seed = state.run?.seed ?? 1, key = `${seed}:${state.huntId}`;
    if (key !== this.planKey || !this.plan) { this.plan = new RunPlan({ seed, huntId: state.huntId }); this.planKey = key; this.clearWorld(); }
    return this.plan;
  }
  private clearWorld() { for (const t of this.tiles.values()) t.destroy(); for (const p of this.props.values()) p.destroy(); this.tiles.clear(); this.props.clear(); }
  /** Posição (d, y) de um herói: da run, ou a formação de parada. */
  private heroPos(state: GameState, c: Character, index: number) {
    const p = state.run?.pos[c.id]; if (p) return p;
    const plan = this.planFor(state), top = plan.floorAtD(4);
    return { d: c.row === 'back' ? 1 : 4, y: top + BAND / 2 + (index - (state.team.length - 1) / 2) * 1.4 };
  }

  /** Câmera, chão, paredes e obstáculos: só o que aparece na tela. */
  private drawWorld(state: GameState) {
    const plan = this.planFor(state), anchor = state.run?.anchor ?? 4, cam = this.cameras.main;
    const top = plan.floorAtD(anchor) + BAND / 2;
    this.camY += (top - this.camY) * .08; if (!this.camY) this.camY = top;
    cam.setScroll(wx(anchor) - HERO_X, wy(this.camY) - H / 2);
    const dmin = Math.floor(anchor - (W - HERO_X) / CELL_PX) - 2, dmax = Math.ceil(anchor + HERO_X / CELL_PX) + 2, huntId = state.huntId;
    const keep = new Set<string>();
    for (let c = Math.max(0, dmin); c <= dmax; c++) {
      const t = plan.floorAtD(c);
      for (let r = t - 3; r <= t + BAND + 1; r++) {
        let kind: CellKind | undefined;
        if (r >= t && r < t + BAND) { const h = (c * 7 + r * 13) % 10; kind = h === 0 ? 'floor1' : h === 1 ? 'floor2' : h === 2 ? 'floor3' : 'floor0'; }
        else if (r === t - 1) kind = c % 6 === 2 ? 'torch' : 'wall';
        else if (r === t - 2 || r === t + BAND) kind = 'top';
        if (!kind) continue;
        const key = `${c},${r}`; keep.add(key);
        const have = this.tiles.get(key);
        if (!have) this.tiles.set(key, this.add.image(wx(c + 1), wy(r), cellTexture(huntId, kind)).setOrigin(0).setScale(ART_SCALE).setDepth(0));
        else if (have.texture.key !== cellTexture(huntId, kind)) have.setTexture(cellTexture(huntId, kind));
      }
    }
    for (const [key, img] of this.tiles) if (!keep.has(key)) { img.destroy(); this.tiles.delete(key); }
    const propKeep = new Set<string>();
    for (let i = plan.indexAt(Math.max(0, dmin)); i <= plan.indexAt(Math.max(0, dmax)); i++) for (const o of plan.chunk(i).obstacles) {
      const d = plan.chunk(i).start + o.c; if (d < dmin || d > dmax) continue;
      const key = `${d},${o.r}`; propKeep.add(key);
      if (!this.props.has(key)) { const tex = obstacleTexture(obstacleArt(huntId, { c: d, r: o.r })); if (this.textures.exists(tex)) this.props.set(key, this.add.image(wx(d + .5), wy(o.r + 1), tex).setOrigin(.5, 1).setScale(ART_SCALE).setDepth(4 + o.r / 1000)); }
    }
    for (const [key, img] of this.props) if (!propKeep.has(key)) { img.destroy(); this.props.delete(key); }
  }

  private renderState() {
    const state = gameStore.getSnapshot(), hunt = HUNT_BY_ID[state.huntId];
    const team = state.team.map(id => state.characters.find(c => c.id === id)).filter(Boolean) as Character[];
    this.title.setText(`${hunt?.name ?? ''}  ·  Ciclo ${state.cycle + 1}  ·  ${state.run ? `${Math.floor(state.run.anchor)} m  ·  trecho ${Math.floor(state.run.anchor / CHUNK_LEN) + 1}` : 'parado'}`);
    this.status.setText(state.message);
    if (state.status === 'recovering') { this.bannerText.setText(`EQUIPE DERROTADA\nRecuperação: ${Math.max(0, Math.ceil(state.transitionMs / 1000))}s`); this.banner.setVisible(true); }
    else if (!this.bannerUntil) this.banner.setVisible(false);

    for (const [id, v] of this.heroes) if (!team.some(c => c.id === id)) { v.container.destroy(true); this.heroes.delete(id); }
    team.forEach((c, i) => {
      const pos = this.heroPos(state, c, i);
      let v = this.heroes.get(c.id); if (!v) { v = this.createHero(c); this.heroes.set(c.id, v); }
      if (v.key !== lookKey(c.look)) { v.look = ensureLookTextures(this, c.look, new Set([...this.heroes.values()].map(h => h.key))); v.key = lookKey(v.look); }
      v.name.setText(`${c.name}${c.hp <= 0 ? '  ☠' : ''}`); v.body.setAlpha(c.hp > 0 ? 1 : .25);
      const moved = v.last ? Math.hypot(pos.d - v.last.d, (pos.y - v.last.y)) > .004 : false;
      v.container.setPosition(wx(pos.d), wy(pos.y)).setDepth(6 + pos.y / 1000);
      const near = [...this.nearest(state, pos)];
      const dir: CharacterDirection = moved && v.last ? dominantDirection({ x: wx(v.last.d), y: wy(v.last.y) }, { x: wx(pos.d), y: wy(pos.y) }, 'left') : near.length ? dominantDirection({ x: wx(pos.d), y: wy(pos.y) }, { x: wx(near[0].d), y: wy(near[0].y) }, 'left') : 'left';
      this.setDirection(v, dir, moved && c.hp > 0); v.last = { d: pos.d, y: pos.y };
    });

    const ids = new Set(state.monsters.filter(m => m.d !== undefined).map(m => m.uid));
    for (const [id, v] of this.enemies) if (!ids.has(id)) { this.destroyMonster(v); this.enemies.delete(id); }
    for (const m of state.monsters) {
      if (m.d === undefined || m.y === undefined) continue;
      let v = this.enemies.get(m.uid); if (!v) { v = this.createMonster(m.defId); this.enemies.set(m.uid, v); }
      const def = MONSTERS[m.defId], x = wx(m.d), y = wy(m.y), moved = v.last ? Math.hypot(m.d - v.last.d, m.y - v.last.y) > .004 : false;
      this.setMonsterPos(v, x, y);
      v.hp.displayWidth = v.barW * Math.max(0, m.hp / m.maxHp);
      for (const o of [v.body, v.name, v.hpBg, v.hp]) o.setVisible(m.alive);
      v.name.setText(`${def.name}${m.statuses?.burn ? ` 🔥×${m.statuses.burn.stacks}` : ''}${m.statuses?.frozen ? ' ❄' : ''}${m.statuses?.stunned ? ' ✦' : ''}`);
      if (v.body instanceof GameObjects.Arc) v.body.setStrokeStyle(2, m.statuses?.frozen ? 0x8fd8ff : m.statuses?.burn ? 0xff8c3a : 0xf0e3cd);
      else if (v.art) {
        v.body.setTint(m.statuses?.frozen ? 0x9fdcff : m.statuses?.burn ? 0xffb070 : 0xffffff);
        const hero = state.team.map(id => state.run?.pos[id]).filter(Boolean).sort((a, b) => Math.hypot(a!.d - m.d!, a!.y - m.y!) - Math.hypot(b!.d - m.d!, b!.y - m.y!))[0];
        const dir: CharacterDirection = hero ? dominantDirection({ x, y }, { x: wx(hero.d), y: wy(hero.y) }, 'right') : 'right';
        v.facing = dir; v.body.setTexture(monsterTexture(v.art, dir, moved && Math.floor(this.time.now / 170) % 2 === 0 ? 2 : 1));
      }
      v.last = { d: m.d, y: m.y };
    }
    if (state.status === 'paused' && !this.visualPaused) { this.tweens.pauseAll(); this.anims.pauseAll(); this.visualPaused = true; }
    else if (state.status !== 'paused' && this.visualPaused) { this.tweens.resumeAll(); this.anims.resumeAll(); this.visualPaused = false; }
  }
  /** Monstros vivos do mais perto para o mais longe de uma posição. */
  private *nearest(state: GameState, p: { d: number; y: number }) {
    const list = state.monsters.filter(m => m.alive && m.d !== undefined).sort((a, b) => Math.hypot(a.d! - p.d, a.y! - p.y) - Math.hypot(b.d! - p.d, b.y! - p.y));
    for (const m of list) yield { d: m.d!, y: m.y! };
  }

  private createHero(c: Character): HeroView {
    const look = ensureLookTextures(this, c.look, new Set([...this.heroes.values()].map(h => h.key)));
    const body = this.add.sprite(0, 0, characterTexture(look, 'left', 1)).setOrigin(.5, 1).setScale(ART_SCALE);
    const name = this.add.text(0, 13, '', { fontSize: '11px', color: '#fff', stroke: '#090b0e', strokeThickness: 4, align: 'center' }).setOrigin(.5);
    return { container: this.add.container(0, 0, [body, name]), look, key: lookKey(look), body, name, direction: 'left', walking: false };
  }
  private setDirection(view: HeroView, direction: CharacterDirection, walking: boolean) {
    if (view.direction === direction && view.walking === walking) return;
    view.direction = direction; view.walking = walking;
    if (walking) view.body.play(characterWalkAnim(view.look, direction), true); else { view.body.stop(); view.body.setTexture(characterTexture(view.look, direction, 1)); }
  }
  private artTop(id: string) { const g = ART.sprites.monstros[id]?.down_1; if (!g) return 0; const row = g.findIndex(r => r.some(k => k !== '.')); return Math.max(0, row) * ART_SCALE; }
  private createMonster(defId: string): MonsterView {
    const def = MONSTERS[defId], art = ART.meta.find(m => m.tipo === 'monstro' && m.monstroId === defId), big = art?.celulas === '2x2' || (!!def.boss && !art);
    if (art) {
      const h = art.altura * ART_SCALE - this.artTop(art.id), barW = big ? 100 : BAR_W;
      const body = this.add.sprite(0, 0, monsterTexture(art.id, 'right', 1)).setOrigin(.5, 1).setScale(ART_SCALE);
      const hpBg = this.add.rectangle(0, 0, barW, 9, 0x35171b, .95).setOrigin(0, .5).setDepth(5), hp = this.add.rectangle(0, 0, barW, 7, 0xd45a5f).setOrigin(0, .5).setDepth(6);
      const name = this.add.text(0, 0, def.name, { fontSize: '11px', color: '#fff', stroke: '#090b0e', strokeThickness: 4 }).setOrigin(.5).setDepth(6);
      return { body, name, hpBg, hp, art: art.id, height: h, facing: 'right', barW, barDy: -h - 8, nameDy: -h - 22, big };
    }
    const radius = big ? 38 : 24, barW = big ? 100 : BAR_W;
    const hpBg = this.add.rectangle(0, 0, barW, 9, 0x35171b, .95).setOrigin(0, .5).setDepth(5), body = this.add.circle(0, 0, radius, def.color).setStrokeStyle(2, 0xf0e3cd).setDepth(5);
    const name = this.add.text(0, 0, def.name, { fontSize: '11px', color: '#fff', stroke: '#090b0e', strokeThickness: 4 }).setOrigin(.5).setDepth(6), hp = this.add.rectangle(0, 0, barW, 7, 0xd45a5f).setOrigin(0, .5).setDepth(6);
    return { body, name, hpBg, hp, height: radius * 2, facing: 'right', barW, barDy: -radius - 14, nameDy: radius + 10, big };
  }
  private setMonsterPos(v: MonsterView, x: number, y: number) {
    v.body.setPosition(x, v.art ? y : y - v.height / 2).setDepth(5 + y / 1000);
    const by = v.art ? y : y - v.height / 2;
    v.hpBg.setPosition(x - v.barW / 2, by + v.barDy).setDepth(20); v.hp.setPosition(x - v.barW / 2, by + v.barDy).setDepth(21); v.name.setPosition(x, by + v.nameDy).setDepth(21);
  }
  private destroyMonster(v: MonsterView) { v.body.destroy(); v.name.destroy(); v.hpBg.destroy(); v.hp.destroy(); }

  private focusOf(body: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite, height: number) { return body instanceof GameObjects.Sprite ? { x: body.x, y: body.y - height / 2 } : { x: body.x, y: body.y }; }
  private focus(id?: string): ArenaPoint | undefined {
    if (!id) return undefined;
    const hero = this.heroes.get(id); if (hero) return { x: hero.container.x, y: hero.container.y - SPRITE_PX / 2 };
    const m = this.enemies.get(id); return m ? this.focusOf(m.body, m.height) : undefined;
  }
  private entityBody(id?: string) { return id ? this.heroes.get(id)?.body ?? this.enemies.get(id)?.body : undefined; }
  private floatText(lane: string, x: number, y: number, text: string, color: string) {
    const offset = (this.floatLanes.get(lane) ?? 0) % 3; this.floatLanes.set(lane, offset + 1);
    const label = this.add.text(x + (offset - 1) * 16, y - offset * 13, text, { fontFamily: 'Arial Black', fontSize: '17px', color, stroke: '#08090b', strokeThickness: 5 }).setOrigin(.5).setDepth(30);
    this.tweens.add({ targets: label, y: label.y - 38, alpha: 0, duration: 850, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }
  private animateFx(fx: GameFx) {
    const source = this.focus(fx.source), target = this.focus(fx.target);
    if (fx.type === 'attack' && source) {
      const hero = fx.source ? this.heroes.get(fx.source) : undefined, monster = fx.source ? this.enemies.get(fx.source) : undefined;
      if (fx.fx) { const aims = (fx.targets?.length ? fx.targets : fx.target ? [fx.target] : []).map(id => this.focus(id)).filter((p): p is ArenaPoint => !!p); aims.forEach((p, i) => this.time.delayedCall(i * 70, () => playAttackFx(this, fx.fx!, source, p))); }
      else if (target) { const projectile = this.add.circle(source.x, source.y, 5, 0xf2ce72).setDepth(10).setStrokeStyle(2, 0xffffff, .8); this.tweens.add({ targets: projectile, x: target.x, y: target.y, duration: 150, ease: 'Quad.easeIn', onComplete: () => projectile.destroy() }); }
      const body = hero?.container ?? monster?.body;
      if (body && target) { const dx = PhaserMath.Clamp(target.x - source.x, -8, 8); this.tweens.add({ targets: hero?.body ?? body, x: (hero?.body ?? body).x + dx, duration: 70, yoyo: true, ease: 'Sine.easeOut' }); }
    }
    if (fx.type === 'damage' && target) { const body = this.entityBody(fx.target); if (body) { const x0 = body.x; this.tweens.add({ targets: body, x: x0 + 5, duration: 45, yoyo: true, repeat: 2, onComplete: () => body.setX(x0) }); } this.floatText(fx.target ?? '', target.x, target.y - 42, `-${fx.value ?? 0}`, '#ff7d7d'); }
    if (fx.type === 'heal' && target) { const pulse = this.add.circle(target.x, target.y, 22, 0x62dd94, .18).setStrokeStyle(3, 0x8ff0b1).setDepth(9); this.tweens.add({ targets: pulse, scale: 1.8, alpha: 0, duration: 520, onComplete: () => pulse.destroy() }); this.floatText(fx.target ?? '', target.x, target.y - 42, `+${fx.value ?? 0}`, '#82f0aa'); }
    if (fx.type === 'death' && target) { for (let i = 0; i < 7; i++) { const shard = this.add.circle(target.x, target.y, 3, 0xdcc89c).setDepth(10), angle = Math.PI * 2 / 7 * i; this.tweens.add({ targets: shard, x: target.x + Math.cos(angle) * 45, y: target.y + Math.sin(angle) * 45, alpha: 0, duration: 480, onComplete: () => shard.destroy() }); } }
    if (fx.type === 'drop' && fx.text) { const l = this.add.text(W / 2, H - 60, fx.text, { fontFamily: 'Arial Black', fontSize: '15px', color: '#ffd36e', stroke: '#08090b', strokeThickness: 5 }).setOrigin(.5).setScrollFactor(0).setDepth(100); this.tweens.add({ targets: l, y: l.y - 30, alpha: 0, duration: 1400, onComplete: () => l.destroy() }); }
    if ((fx.type === 'stairs' || fx.type === 'wave') && fx.text) { this.bannerText.setText(fx.text); this.banner.setVisible(true).setAlpha(1); this.bannerUntil = this.time.now + (fx.type === 'wave' ? 1600 : 2200); }
    if (fx.type === 'recovery') { this.bannerUntil = 0; }
  }
}
