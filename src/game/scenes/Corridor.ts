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
import { TOMBSTONE_TEXTURE, TRAP_TEXTURE, cellTexture, characterTexture, characterWalkAnim, ensureLookTextures, monsterTexture, obstacleTexture, type CellKind } from '../art/textures';
import type { FxKind } from '../systems/spellFx';
import { CHUNK_LEN, FLOOR_CHUNKS, RunPlan } from '../run/plan';
import { newCamera, stepCamera, relevantFoes, safeArea } from '../run/camera';
import { aggroGroups, freeNear, homePoint, radiusOf, RADIUS, ringPoint } from '../run/world';
import { perp } from '../run/geom';
import { playAttackFx } from './effects';
import { dominantDirection, stableDirection, type ArenaPoint } from './movement';

/**
 * Cena do corredor procedural. O mundo é uma grade de células de 64 px (x, y em células, y para baixo) e o mapa tem curvas de verdade: a
 * câmera segue o grupo livremente (um pouco à frente, na direção do caminho). Chão, parede e preenchimento de pedra cobrem a tela inteira;
 * só o que a câmera enxerga existe como objeto (reaproveitado ao andar). O tamanho do jogo acompanha a janela (modo RESIZE).
 */
const SPRITE_PX = 32 * ART_SCALE, BAR_W = 56;
type HeroView = { container: Phaser.GameObjects.Container; look: Look; key: string; body: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text; direction: CharacterDirection; walking: boolean; dead?: boolean; last?: { x: number; y: number } };
type MonsterView = { body: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text; hpBg: Phaser.GameObjects.Rectangle; hp: Phaser.GameObjects.Rectangle; art?: string; height: number; facing: CharacterDirection; barW: number; barDy: number; nameDy: number; big: boolean; last?: { x: number; y: number } };
const px = (v: number) => v * CELL_PX;

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
  private cam = newCamera();
  private camView = { w: 20, h: 11 };
  private title!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerUntil = 0;
  private visualPaused = false;
  private debug?: Phaser.GameObjects.Graphics;
  private debugLabels: GameObjects.Text[] = [];
  private telegraph?: Phaser.GameObjects.Graphics;
  private shotsG?: Phaser.GameObjects.Graphics;
  private focusG?: Phaser.GameObjects.Graphics;
  private stairsG?: Phaser.GameObjects.Graphics;
  /** a cena foi desligada/destruída: nada mais deve tocar nos objetos dela */
  private dead = false;

  constructor() { super('Game'); }

  create() {
    this.cameras.main.setBackgroundColor('#1b222b');
    this.title = this.add.text(20, 14, '', { fontFamily: 'Georgia', fontSize: '15px', color: '#f0d79a', stroke: '#0b0c0f', strokeThickness: 4 }).setScrollFactor(0).setDepth(100);
    this.status = this.add.text(0, 0, '', { fontSize: '14px', color: '#e7cf95', stroke: '#05070a', strokeThickness: 4, wordWrap: { width: 850 }, align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(100);
    const bg = this.add.rectangle(0, 0, 470, 58, 0x0a0d12, .86).setStrokeStyle(2, 0xd1ad58, .8);
    this.bannerText = this.add.text(0, 0, '', { fontFamily: 'Georgia', fontSize: '19px', color: '#f1d796', align: 'center', stroke: '#050608', strokeThickness: 4 }).setOrigin(.5);
    this.banner = this.add.container(0, 0, [bg, this.bannerText]).setScrollFactor(0).setDepth(101).setVisible(false);
    this.input.keyboard?.on('keydown-F3', (e: KeyboardEvent) => { e.preventDefault(); if (this.debug) { this.debug.destroy(); this.debug = undefined; this.debugLabels.forEach(t => t.destroy()); this.debugLabels = []; } else this.debug = this.add.graphics().setDepth(60); });
    this.telegraph = this.add.graphics().setDepth(3);
    this.shotsG = this.add.graphics().setDepth(40);
    this.stairsG = this.add.graphics().setDepth(1);   // escada do fim do andar, no chão
    this.focusG = this.add.graphics().setDepth(4);   // abaixo dos bonecos: anéis no chão
    this.layoutHud();
    this.scale.on('resize', () => this.layoutHud());
    this.dead = false;
    this.unsubscribe = gameStore.subscribe(() => { if (!this.dead) this.renderState(); });
    this.unsubscribeFx = gameStore.onFx(fx => { if (!this.dead) this.animateFx(fx); });
    if (import.meta.env.DEV) { (window as unknown as { __scene?: unknown }).__scene = this; (window as unknown as { __fx?: unknown }).__fx = (kind: FxKind, a: ArenaPoint, b: ArenaPoint) => playAttackFx(this, kind, a, b); }
    // Fechar o jogo (ex.: "apagar tudo" volta à criação e desmonta a arena) destrói a cena sem passar por 'shutdown': solta as
    // inscrições nos dois eventos, senão o estado novo mandaria escrever em textos já destruídos.
    const cleanup = () => { this.dead = true; this.unsubscribe?.(); this.unsubscribeFx?.(); this.heroes.clear(); this.enemies.clear(); this.tiles.clear(); this.props.clear(); this.floatLanes.clear(); this.debug = undefined; this.debugLabels = []; };
    this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
    this.renderState();
    EventBus.emit('current-scene-ready', this);
  }
  private layoutHud() {
    const { width, height } = this.scale;
    this.status.setPosition(width / 2, height - 22).setWordWrapWidth(Math.min(850, width - 40));
    this.banner.setPosition(width / 2, height / 2 - 120);
  }

  update(_time: number, delta: number) {
    if (this.dead) return;
    gameStore.advance(delta, runtime.huntSpeed);
    this.drawWorld(gameStore.getSnapshot(), delta);
    this.drawTelegraphs(gameStore.getSnapshot());
    this.drawShots(gameStore.getSnapshot());
    this.drawFocus(gameStore.getSnapshot());
    if (this.debug) this.drawDebug(gameStore.getSnapshot());
    if (this.bannerUntil && this.time.now > this.bannerUntil && gameStore.getSnapshot().status !== 'recovering') { this.bannerUntil = 0; this.banner.setVisible(false); }
  }

  /** Plano (puro) da run atual; sem run (parado), uma pré-visualização fixa da hunt. */
  private planFor(state: GameState) {
    const seed = state.run?.seed ?? 1, floor = state.run?.floor ?? 0, key = `${seed}:${state.huntId}:${floor}`;
    if (key !== this.planKey || !this.plan) { const first = !!this.plan; this.plan = new RunPlan({ seed, huntId: state.huntId, capped: true, floor }); this.planKey = key; this.clearWorld(); if (first && state.run) this.cameras.main.fadeIn(900, 0, 0, 0); }
    return this.plan;
  }
  private clearWorld() { for (const t of this.tiles.values()) t.destroy(); for (const p of this.props.values()) p.destroy(); this.tiles.clear(); this.props.clear(); this.cam.init = false; }
  /** Posição (x, y) de um herói: da run, ou a formação de parada na entrada. */
  private heroPos(state: GameState, c: Character, index: number) {
    const p = state.run?.pos[c.id]; if (p) return p;
    const plan = this.planFor(state); plan.ensure(0);
    const base = plan.pathPoint(c.row === 'back' ? 1 : 4), off = (index - (state.team.length - 1) / 2) * 1.25;
    return freeNear(plan, { x: base.x, y: base.y + off });
  }

  private livingHeroPoints(state: GameState) {
    return state.team.map(id => state.characters.find(c => c.id === id)).filter((c): c is Character => !!c && c.hp > 0).map((c, i) => state.run?.pos[c.id] ?? this.heroPos(state, c, i));
  }
  /** Câmera e blocos do que aparece na tela: chão, parede (com tocha) e pedra de preenchimento; obstáculos por cima. */
  private drawWorld(state: GameState, delta = 16) {
    const plan = this.planFor(state), anchor = state.run?.anchor ?? 4, cam = this.cameras.main, { width, height } = this.scale;
    plan.ensure(plan.indexAt(anchor));
    // câmera: segue a ação (heróis vivos + inimigos relevantes) misturada com a âncora, com suavização e safe screen area (ver run/camera.ts)
    const here = plan.pathPoint(anchor), fwd = plan.forwardAt(anchor), heroes = this.livingHeroPoints(state), foes = state.monsters.filter(m => m.alive && m.x !== undefined).map(m => ({ x: m.x!, y: m.y! }));
    this.camView = { w: width / CELL_PX, h: height / CELL_PX };
    const inCombat = relevantFoes(heroes, foes).length > 0 || !!state.run?.windups?.length;
    stepCamera(this.cam, { anchor: here, fwd, heroes, foes, inCombat, view: this.camView, dt: delta / 1000, speed: runtime.huntSpeed });
    cam.setScroll(Math.round(px(this.cam.x) - width / 2), Math.round(px(this.cam.y) - height / 2));
    const huntId = state.huntId, x0 = Math.floor(cam.scrollX / CELL_PX) - 1, x1 = Math.ceil((cam.scrollX + width) / CELL_PX) + 1, y0 = Math.floor(cam.scrollY / CELL_PX) - 1, y1 = Math.ceil((cam.scrollY + height) / CELL_PX) + 1;
    const keep = new Set<string>(), propKeep = new Set<string>();
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const kind = plan.cellKind(cx, cy); let tex: CellKind;
      if (kind) { const h = (cx * 7 + cy * 13) & 15; tex = h === 0 ? 'floor1' : h === 1 ? 'floor2' : h === 2 ? 'floor3' : 'floor0'; }
      else if (plan.cellKind(cx, cy + 1)) tex = ((cx * 5 + cy) % 9 + 9) % 9 === 0 ? 'torch' : 'wall';
      else tex = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]].some(([dx, dy]) => plan.cellKind(cx + dx, cy + dy)) ? 'top' : 'fill';
      const key = `${cx},${cy}`; keep.add(key);
      const texture = cellTexture(huntId, tex), have = this.tiles.get(key);
      if (!have) this.tiles.set(key, this.add.image(px(cx), px(cy), texture).setOrigin(0).setScale(ART_SCALE).setDepth(0));
      else if (have.texture.key !== texture) have.setTexture(texture);
      if (kind === 3) {
        propKeep.add(key);
        if (!this.props.has(key)) this.props.set(key, this.add.image(px(cx), px(cy), TRAP_TEXTURE).setOrigin(0).setScale(ART_SCALE).setDepth(2));
      }
      if (kind === 2) {
        propKeep.add(key);
        if (!this.props.has(key)) { const tex2 = obstacleTexture(obstacleArt(huntId, { c: cx, r: cy })); if (this.textures.exists(tex2)) this.props.set(key, this.add.image(px(cx + .5), px(cy + 1), tex2).setOrigin(.5, 1).setScale(ART_SCALE).setDepth(4 + cy / 1000)); }
      }
    }
    for (const [key, img] of this.tiles) if (!keep.has(key)) { img.destroy(); this.tiles.delete(key); }
    for (const [key, img] of this.props) if (!propKeep.has(key)) { img.destroy(); this.props.delete(key); }
    this.drawStairs(state, plan);
  }

  /** Escada do fim do andar: degraus descendo para o escuro; apagada até o chefe cair, depois acende. */
  private drawStairs(state: GameState, plan: RunPlan) {
    const g = this.stairsG; if (!g) return; g.clear(); if (!state.run) return;
    const st = plan.stairs(), lit = state.run.lastTrigger >= FLOOR_CHUNKS - 1 && !state.run.open && !state.monsters.some(m => m.alive), pulse = lit ? .75 + .25 * Math.sin(this.time.now / 300) : .5;
    const f = st.fwd, sd = { x: -f.y, y: f.x }, quad = (c: number, w: number, d: number, col: number, a: number) => { const o = (u: number, v: number) => ({ x: px(st.x + f.x * u + sd.x * v), y: px(st.y + f.y * u + sd.y * v) }); const a1 = o(c, -w), b1 = o(c + d, -w), c1 = o(c + d, w), d1 = o(c, w); g.fillStyle(col, a).fillTriangle(a1.x, a1.y, b1.x, b1.y, c1.x, c1.y).fillTriangle(a1.x, a1.y, c1.x, c1.y, d1.x, d1.y); };
    quad(-.4, 2.3, 4.2, 0x0b0d12, 1);
    for (let k = 0; k < 5; k++) quad(-.2 + k * .7, 2 - k * .12, .62, lit ? 0xd8c27a : 0x6b6a62, (lit ? .95 : .8) - k * .13);
    if (lit) { g.lineStyle(3, 0xffe9a0, pulse).strokeCircle(px(st.x + f.x * 1.2), px(st.y + f.y * 1.2), px(2.6)); }
  }

  /** Golpes avisados: círculo vermelho no chão que enche até o dano cair (quem sair de dentro a tempo não apanha). */
  private drawTelegraphs(state: GameState) {
    const g = this.telegraph; if (!g) return; g.clear();
    for (const w of state.run?.windups ?? []) {
      const k = 1 - Math.max(0, w.t) / w.total, r = px(w.r);
      g.fillStyle(0xd23a2a, .16 + .12 * k).fillCircle(px(w.x), px(w.y), r);
      g.fillStyle(0xe85a3a, .22 + .2 * k).fillCircle(px(w.x), px(w.y), r * k);
      g.lineStyle(3, 0xff7a5a, .55 + .4 * k).strokeCircle(px(w.x), px(w.y), r);
    }
  }

  /** Leitura do combate (fora do F3): anel avermelhado no chão sob o alvo principal do grupo e anel duplo azul sob o invasor da backline (alvo de peel). Discreto, pulsa devagar. */
  private drawFocus(state: GameState) {
    const g = this.focusG; if (!g) return; g.clear();
    const run = state.run, f = run?.focus; if (!run || !f || state.status !== 'running') return;
    const pulse = .55 + .25 * Math.sin(this.time.now / 260);
    const ring = (uid: string | undefined, color: number, rings: number) => {
      const m = uid ? state.monsters.find(x => x.alive && x.uid === uid && x.x !== undefined) : undefined; if (!m) return;
      const r = px(radiusOf(m)) + 3, cx = px(m.x!), cy = px(m.y!) + CELL_PX * .3;
      for (let i = 0; i < rings; i++) g.lineStyle(i ? 1.5 : 2.5, color, pulse * (i ? .7 : 1)).strokeEllipse(cx, cy, (r + i * 5) * 2, (r + i * 5) * 1.1);
    };
    if (f.primaryId !== f.peelId) ring(f.primaryId, 0xff6a4a, 1);
    ring(f.peelId, 0x4ac8ff, 2);
  }
  /** Projéteis em voo (flechas, tiros): um traço claro com a ponta na posição atual. */
  private drawShots(state: GameState) {
    const g = this.shotsG; if (!g) return; g.clear();
    for (const sh of state.run?.shots ?? []) { g.lineStyle(3, 0xfff1c0, .95).lineBetween(px(sh.x - sh.vx * .55), px(sh.y - sh.vy * .55), px(sh.x), px(sh.y)); g.fillStyle(0xffffff, 1).fillCircle(px(sh.x), px(sh.y), 3); }
  }

  /** F3: corpos (círculos de colisão), anel de 8 vagas, vaga de cada monstro e uma linha de cada um até o herói que ele está atacando. */
  private drawDebug(state: GameState) {
    const g = this.debug!, run = state.run; g.clear(); if (!run) return;
    const team = state.team.map(id => state.characters.find(c => c.id === id)).filter((c): c is Character => !!c && c.hp > 0), colors = [0xf0c24b, 0x5fd0ff, 0xb48cff, 0x7be08a];
    const colorOf = (id: string) => colors[Math.max(0, team.findIndex(c => c.id === id)) % colors.length];
    const rank = aggroGroups(team);
    const sa = safeArea({ x: this.cam.x, y: this.cam.y }, this.camView); g.lineStyle(2, 0x6ee7a8, .55).strokeRect(px(sa.x0), px(sa.y0), px(sa.x1 - sa.x0), px(sa.y1 - sa.y0));   // safe screen area
    team.forEach(c => {
      const p = run.pos[c.id]; if (!p) return; const col = colorOf(c.id), tier = rank.findIndex(gr => gr.includes(c));
      g.lineStyle(2, col, .95).strokeCircle(px(p.x), px(p.y), px(RADIUS.unit));
      for (let k = 0; k < 8; k++) { const q = ringPoint(p, k); g.lineStyle(1, col, tier === 0 ? .8 : .35).strokeCircle(px(q.x), px(q.y), px(RADIUS.unit)); }
    });
    this.drawDebugAi(state, team, colorOf);
    for (const m of state.monsters) {
      if (!m.alive || m.x === undefined || m.y === undefined) continue;
      g.lineStyle(2, 0xff5a4a, .95).strokeCircle(px(m.x), px(m.y), px(radiusOf(m)));
      if (m.slot) { const col = colorOf(m.slot.hero), hp = run.pos[m.slot.hero]; g.lineStyle(2, col, .9).lineBetween(px(m.x), px(m.y), px(m.slot.x), px(m.slot.y)); if (hp) g.lineStyle(1, col, .5).lineBetween(px(m.slot.x), px(m.slot.y), px(hp.x), px(hp.y)); g.fillStyle(col, 1).fillCircle(px(m.slot.x), px(m.slot.y), 4); }
    }
  }

  /** F3 (IA): por herói o estado, o alvo (linha), o destino guardado, o ponto de descanso e a zona de roam; no grupo, o alvo principal (anel vermelho) e o de peel (anel ciano). */
  private drawDebugAi(state: GameState, team: Character[], colorOf: (id: string) => number) {
    const g = this.debug!, run = state.run!, plan = this.plan; if (!plan) return;
    const side = perp(plan.forwardAt(run.anchor)), foeOf = (uid?: string) => uid ? state.monsters.find(m => m.alive && m.uid === uid && m.x !== undefined) : undefined;
    const ring = (uid: string | undefined, color: number, extra: number) => { const m = foeOf(uid); if (m) g.lineStyle(3, color, .95).strokeCircle(px(m.x!), px(m.y!), px(radiusOf(m) + extra)); };
    ring(run.focus?.primaryId, 0xff3b30, .35); ring(run.focus?.peelId, 0x30d5ff, .6);
    team.forEach((c, i) => {
      const p = run.pos[c.id], ai = run.ai?.[c.id]; if (!p) return; const col = colorOf(c.id), home = homePoint(plan, run.anchor, team, c, side);
      g.lineStyle(1, col, .5).strokeCircle(px(home.x), px(home.y), px(.35)); g.lineStyle(1, col, .25).strokeCircle(px(home.x), px(home.y), px(c.isTank ? 5 : c.row === 'back' ? 5.5 : 6));
      if (ai?.dest) { g.lineStyle(1, col, .7).lineBetween(px(p.x), px(p.y), px(ai.dest.x), px(ai.dest.y)); g.fillStyle(col, .9).fillRect(px(ai.dest.x) - 3, px(ai.dest.y) - 3, 6, 6); }
      const t = foeOf(ai?.targetId); if (t) g.lineStyle(1, 0xff5a4a, .55).lineBetween(px(p.x), px(p.y), px(t.x!), px(t.y!));
      let label = this.debugLabels[i]; if (!label) { label = this.add.text(0, 0, '', { fontSize: '10px', color: '#ffffff', backgroundColor: '#000000aa' }).setDepth(61); this.debugLabels[i] = label; }
      const lock = ai && ai.targetLockUntil > (run.clock ?? 0) ? '🔒' : '';
      label.setText(`${c.name} ${ai?.state ?? '-'}${lock}${run.focus?.primaryId && ai?.targetId === run.focus.primaryId ? ' ★' : ''}`).setPosition(px(p.x) - 24, px(p.y) - 34).setVisible(true);
    });
    for (let i = team.length; i < this.debugLabels.length; i++) this.debugLabels[i].setVisible(false);
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
      v.name.setText(`${c.name}${c.hp <= 0 ? '  ☠' : ''}`);
      if (c.hp <= 0 && !v.dead) { v.dead = true; v.body.stop(); v.body.setTexture(TOMBSTONE_TEXTURE).setAlpha(1); }   // lápide no lugar onde caiu
      else if (c.hp > 0 && v.dead) { v.dead = false; v.walking = true; this.setDirection(v, 'down', false); v.last = undefined; }
      const moved = v.last ? Math.hypot(pos.x - v.last.x, pos.y - v.last.y) > .004 : false;
      v.container.setPosition(px(pos.x), px(pos.y)).setDepth(6 + pos.y / 1000);
      // parado, olha para o alvo da IA (travado por ~1 s) e só vira de lado depois de 0,6 s olhando para o outro lado (nada de virar esquerda/direita toda hora)
      const aiTarget = state.run?.ai?.[c.id]?.targetId, locked = aiTarget ? state.monsters.find(m => m.alive && m.uid === aiTarget && m.x !== undefined) : undefined;
      const foe = locked ?? state.monsters.filter(m => m.alive && m.x !== undefined).sort((a, b) => Math.hypot(a.x! - pos.x, a.y! - pos.y) - Math.hypot(b.x! - pos.x, b.y! - pos.y))[0];
      const fwd = this.plan?.forwardAt(state.run?.anchor ?? 4) ?? { x: -1, y: 0 };
      const dir: CharacterDirection = moved && v.last ? dominantDirection({ x: px(v.last.x), y: px(v.last.y) }, { x: px(pos.x), y: px(pos.y) }, v.direction) : foe ? this.holdFacing(v, stableDirection({ x: px(pos.x), y: px(pos.y) }, { x: px(foe.x!), y: px(foe.y!) }, v.direction)) : dominantDirection({ x: 0, y: 0 }, fwd, 'left');
      if (!v.dead) this.setDirection(v, dir, moved && c.hp > 0);
      v.last = { x: pos.x, y: pos.y };
    });

    const ids = new Set(state.monsters.filter(m => m.x !== undefined).map(m => m.uid));
    for (const [id, v] of this.enemies) if (!ids.has(id)) { this.destroyMonster(v); this.enemies.delete(id); }
    for (const m of state.monsters) {
      if (m.x === undefined || m.y === undefined) continue;
      let v = this.enemies.get(m.uid); if (!v) { v = this.createMonster(m.defId); this.enemies.set(m.uid, v); }
      const def = MONSTERS[m.defId], x = px(m.x), y = px(m.y) + CELL_PX * .36, moved = v.last ? Math.hypot(m.x - v.last.x, m.y - v.last.y) > .004 : false;
      this.setMonsterPos(v, x, y);
      v.hp.displayWidth = v.barW * Math.max(0, m.hp / m.maxHp);
      for (const o of [v.body, v.name, v.hpBg, v.hp]) o.setVisible(m.alive);
      v.name.setText(`${def.name}${m.statuses?.burn ? ` 🔥×${m.statuses.burn.stacks}` : ''}${m.statuses?.frozen ? ' ❄' : ''}${m.statuses?.stunned ? ' ✦' : ''}`);
      if (v.body instanceof GameObjects.Arc) v.body.setStrokeStyle(2, m.statuses?.frozen ? 0x8fd8ff : m.statuses?.burn ? 0xff8c3a : 0xf0e3cd);
      else if (v.art) {
        v.body.setTint(m.statuses?.frozen ? 0x9fdcff : m.statuses?.burn ? 0xffb070 : 0xffffff);
        const hero = state.team.map(id => state.run?.pos[id]).filter((p): p is { x: number; y: number } => !!p).sort((a, b) => Math.hypot(a.x - m.x!, a.y - m.y!) - Math.hypot(b.x - m.x!, b.y - m.y!))[0];
        const dir: CharacterDirection = hero ? dominantDirection({ x: px(m.x), y: px(m.y) }, { x: px(hero.x), y: px(hero.y) }, v.facing) : v.facing;
        v.facing = dir; v.body.setTexture(monsterTexture(v.art, dir, moved && Math.floor(this.time.now / 170) % 2 === 0 ? 2 : 1));
      }
      v.last = { x: m.x, y: m.y };
    }
    if (state.status === 'paused' && !this.visualPaused) { this.tweens.pauseAll(); this.anims.pauseAll(); this.visualPaused = true; }
    else if (state.status !== 'paused' && this.visualPaused) { this.tweens.resumeAll(); this.anims.resumeAll(); this.visualPaused = false; }
  }

  private createHero(c: Character): HeroView {
    const look = ensureLookTextures(this, c.look, new Set([...this.heroes.values()].map(h => h.key)));
    const body = this.add.sprite(0, CELL_PX * .36, characterTexture(look, 'left', 1)).setOrigin(.5, 1).setScale(ART_SCALE);
    const name = this.add.text(0, CELL_PX * .36 + 13, '', { fontSize: '11px', color: '#fff', stroke: '#090b0e', strokeThickness: 4, align: 'center' }).setOrigin(.5);
    return { container: this.add.container(0, 0, [body, name]), look, key: lookKey(look), body, name, direction: 'left', walking: false };
  }
  /** Quem está parado só troca a direção para onde olha depois de 0,6 s pedindo a mesma troca. */
  private holdFacing(view: HeroView, want: CharacterDirection): CharacterDirection {
    const now = this.time.now, v = view as HeroView & { faceWant?: CharacterDirection; faceSince?: number };
    if (want === view.direction) { v.faceWant = undefined; return want; }
    if (v.faceWant !== want) { v.faceWant = want; v.faceSince = now; }
    return now - (v.faceSince ?? now) >= 600 ? want : view.direction;
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
    v.body.setPosition(x, v.art ? y : y - v.height / 2).setDepth(5 + y / 100000);
    const by = v.art ? y : y - v.height / 2;
    v.hpBg.setPosition(x - v.barW / 2, by + v.barDy).setDepth(20); v.hp.setPosition(x - v.barW / 2, by + v.barDy).setDepth(21); v.name.setPosition(x, by + v.nameDy).setDepth(21);
  }
  private destroyMonster(v: MonsterView) { v.body.destroy(); v.name.destroy(); v.hpBg.destroy(); v.hp.destroy(); }

  private focusOf(body: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite, height: number) { return body instanceof GameObjects.Sprite ? { x: body.x, y: body.y - height / 2 } : { x: body.x, y: body.y }; }
  private focus(id?: string): ArenaPoint | undefined {
    if (!id) return undefined;
    const hero = this.heroes.get(id); if (hero) return { x: hero.container.x, y: hero.container.y + CELL_PX * .36 - SPRITE_PX / 2 };
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
      else if (target && !fx.shot) { const projectile = this.add.circle(source.x, source.y, 5, 0xf2ce72).setDepth(10).setStrokeStyle(2, 0xffffff, .8); this.tweens.add({ targets: projectile, x: target.x, y: target.y, duration: 150, ease: 'Quad.easeIn', onComplete: () => projectile.destroy() }); }
      const body = hero?.body ?? monster?.body;
      if (body && target) { const dx = PhaserMath.Clamp(target.x - source.x, -8, 8); this.tweens.add({ targets: body, x: body.x + dx, duration: 70, yoyo: true, ease: 'Sine.easeOut' }); }
    }
    if (fx.type === 'damage' && target) { const body = this.entityBody(fx.target); if (body) { const x0 = body.x; this.tweens.add({ targets: body, x: x0 + 5, duration: 45, yoyo: true, repeat: 2, onComplete: () => body.setX(x0) }); } this.floatText(fx.target ?? '', target.x, target.y - 42, `-${fx.value ?? 0}`, '#ff7d7d'); }
    if (fx.type === 'heal' && target) { const pulse = this.add.circle(target.x, target.y, 22, 0x62dd94, .18).setStrokeStyle(3, 0x8ff0b1).setDepth(9); this.tweens.add({ targets: pulse, scale: 1.8, alpha: 0, duration: 520, onComplete: () => pulse.destroy() }); this.floatText(fx.target ?? '', target.x, target.y - 42, `+${fx.value ?? 0}`, '#82f0aa'); }
    if (fx.type === 'revive' && target) { const glow = this.add.circle(target.x, target.y, 18, 0xf5e6a8, .5).setStrokeStyle(3, 0xfff3c4).setDepth(12); this.tweens.add({ targets: glow, scale: 3, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => glow.destroy() }); this.floatText(fx.target ?? 'revive', target.x, target.y - 30, fx.text ?? 'Revive!', '#ffe9a0'); }
    if (fx.type === 'death' && target) { for (let i = 0; i < 7; i++) { const shard = this.add.circle(target.x, target.y, 3, 0xdcc89c).setDepth(10), angle = Math.PI * 2 / 7 * i; this.tweens.add({ targets: shard, x: target.x + Math.cos(angle) * 45, y: target.y + Math.sin(angle) * 45, alpha: 0, duration: 480, onComplete: () => shard.destroy() }); } }
    if (fx.type === 'drop' && fx.text) { const l = this.add.text(this.scale.width / 2, this.scale.height - 60, fx.text, { fontFamily: 'Arial Black', fontSize: '15px', color: '#ffd36e', stroke: '#08090b', strokeThickness: 5 }).setOrigin(.5).setScrollFactor(0).setDepth(100); this.tweens.add({ targets: l, y: l.y - 30, alpha: 0, duration: 1400, onComplete: () => l.destroy() }); }
    if ((fx.type === 'stairs' || fx.type === 'wave') && fx.text) { this.bannerText.setText(fx.text); this.banner.setVisible(true).setAlpha(1); this.bannerUntil = this.time.now + (fx.type === 'wave' ? 1600 : 2200); }
    if (fx.type === 'recovery') { this.bannerUntil = 0; }
  }
}
