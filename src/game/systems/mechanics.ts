import type { Character, GameState, MonsterRuntime } from '../core/types';
import { TALENT_NODES } from '../data/talentTrees';

/**
 * Mecânicas dos Majors e Keystones das grades de talento. Cada texto do catálogo vira uma lista de efeitos declarativos (`Eff`);
 * o motor (core/mech.ts) executa os efeitos nos ganchos de combate. Texto sem entrada aqui continua "Em breve".
 */
export type Eff =
  | { k: 'dmg'; vs: 'boss' | 'bossElite' | 'low' | 'full' | 'ctrl' | 'critBoss' | 'basic' | 'basicArmed' | 'spell' | 'goldScaled' | 'element' | 'crit'; pct: number; thr?: number; el?: string }
  | { k: 'firstBoss'; mult: number }
  | { k: 'firstStrike'; mult: number }
  | { k: 'bossForceCrit'; n: number }
  | { k: 'critReady'; every: number }
  | { k: 'lostHp'; per: number; step: number; max: number }
  | { k: 'streak'; on: 'hit' | 'kill' | 'crit' | 'cast'; dmg?: number; aspd?: number; per: number; max: number; dur: number }
  | { k: 'killBurst'; n: number; window: number; aspd: number; dur: number }
  | { k: 'taken'; pct: number; below?: number; tank?: boolean }
  | { k: 'takenStack'; per: number; max: number; dur: number }
  | { k: 'teamTaken'; pct: number; below?: number; row?: 'back' | 'same' }
  | { k: 'dodge'; chance?: number; quiet?: number }
  | { k: 'reflect'; chance: number; pct: number; heal?: number }
  | { k: 'once'; when: 'lowhp' | 'avgLow' | 'start' | 'firstHit' | 'fatal' | 'noMana'; below?: number; do: 'shield' | 'heal' | 'invuln' | 'surviveFatal' | 'absorbHit' | 'teamHeal' | 'revive' | 'mana' | 'regen' | 'buff' | 'takenBuff' | 'volley'; pct?: number; dur?: number; dmg?: number }
  | { k: 'onKill'; heal?: number; mana?: number; cd?: number; critOnly?: boolean; bossBuff?: { dmg: number; dur: number }; bossGold?: number; bossDrop?: number; goldMult?: number; extraGold?: number }
  | { k: 'onCrit'; heal?: number; volley?: number; burn?: boolean; double?: number; buff?: { aspd?: number; dmg?: number; dur: number; max: number } }
  | { k: 'every'; n: number; on: 'basic' | 'cast'; do: 'volley' | 'crit' | 'strike' | 'stun' | 'haste' | 'doubleNext' | 'mana'; pct?: number }
  | { k: 'proc'; chance: number; do: 'repeat' | 'second' | 'volley' | 'freeCast' | 'castAgain' | 'castReset'; pct?: number; noCd?: boolean }
  | { k: 'echo'; pct: number }
  | { k: 'cleave'; targets: number; pct: number }
  | { k: 'periodic'; every: number; do: 'volley' | 'teamBuff' | 'selfBuff' | 'gold' | 'regenTeam'; pct?: number; dur?: number; dmg?: number; aspd?: number; taken?: number }
  | { k: 'manaCost'; pct: number }
  | { k: 'quietRegen'; after: number; hp: number }
  | { k: 'lowRegen'; below: number; hp: number }
  | { k: 'heals'; overflowShield?: number; splash?: number; areaMult?: number; autoShield?: { below: number; pct: number; cd: number } }
  | { k: 'buffs'; durMult?: number; heal?: number }
  | { k: 'execute'; below: number }
  | { k: 'goldDouble'; chance: number }
  | { k: 'bossGold'; mult: number }
  | { k: 'bossDrop'; chance: number }
  | { k: 'potionSave'; chance: number }
  | { k: 'basicStat'; stat: 'magicPower' | 'defense'; pct: number }
  | { k: 'ctrlMana'; pct: number }
  | { k: 'ignoreResist'; pct?: number; element?: string }
  | { k: 'teamDmgFirst'; pct: number }
  | { k: 'teamDmgBoss'; pct: number }
  | { k: 'passive' }
  | { k: 'noHitStreak'; n: number; dmg: number; dur: number; max: number }
  | { k: 'elemLeech'; element: string; heal?: number; mana?: number; ally?: boolean; critOnly?: boolean }
  | { k: 'stealth'; sec: number }
  | { k: 'poisonOnHit'; stacks: number; doubleAt?: number }
  | { k: 'burnOnHit'; chance: number }
  | { k: 'ignoreDef'; chance: number; crit?: boolean }
  | { k: 'trainFocus'; pct: number }
  | { k: 'buffsTeam' }
  | { k: 'buffCdr'; pct: number }
  | { k: 'missFirst'; chance: number }
  | { k: 'dotDur'; pct: number }
  | { k: 'dotBoost'; pct: number }
  | { k: 'cursedLeech'; pct: number }
  | { k: 'dotSpread'; on: 'expire' | 'death' | 'tick'; n: number }
  | { k: 'dotAll' }
  | { k: 'dotCross' }
  | { k: 'deathBlast'; pct: number }
  | { k: 'aoeAgain'; chance: number }
  | { k: 'potion'; share?: number; buff?: number }
  | { k: 'transmute'; kind: 'strong' | 'weak' }
  | { k: 'lootGold'; pct: number }
  | { k: 'ctrlExtra'; chance: number; n: number }
  | { k: 'ccResist'; pct: number }
  | { k: 'confuse'; on: 'control' | 'crit' | 'periodic'; every?: number; dur: number; element?: string }
  | { k: 'regenMult'; pct: number }
  | { k: 'regenDef' }
  | { k: 'healRegen'; dur: number; pct: number }
  | { k: 'stunClear' }
  | { k: 'elemStun'; element: string; chance: number; dur: number }
  | { k: 'pendingHit'; pct: number }
  | { k: 'focusSwap'; dmg: number; dur: number }
  | { k: 'bleed'; on: 'crit' | 'hit'; pct: number; dur: number }
  | { k: 'elemCount'; level: number; per: number }
  | { k: 'aoeStun'; dur: number }
  | { k: 'bossKillStack'; per: number }
  | { k: 'decoy'; chance: number }
  | { k: 'summon'; every: number; pct: number; target: 'first' | 'all' | 'strong' | 'low'; window?: number }
  | { k: 'skeletons'; pct: number; max: number }
  | { k: 'skeletonHeal'; pct: number }
  | { k: 'turrets'; n: number; pct: number }
  | { k: 'turretRate'; pct: number }
  | { k: 'armorBreak'; on: 'aoe' | 'hit' | 'poisoned' | 'crit'; pct: number; dur: number; max?: number; element?: string }
  | { k: 'debuffRandom'; every: number }
  | { k: 'dmgPerStack'; vs: 'boss'; per: number }
  | { k: 'teamAspd'; pct: number }
  | { k: 'buffHalfCost' }
  | { k: 'manaShield' }
  | { k: 'basicOrb'; pct: number; heal: number }
  | { k: 'onCastBuff'; dmg: number; dur: number }
  | { k: 'hpScale'; per: number; step: number }
  | { k: 'heavyHit'; dmg: number }
  | { k: 'teamSpellDmg'; pct: number }
  | { k: 'shieldExpire'; mana: number }
  | { k: 'shieldShare'; pct: number }
  | { k: 'shieldDur'; pct: number }
  | { k: 'glyph'; pct: number; delay: number }
  | { k: 'stunExtra'; sec: number }
  | { k: 'groundFire' }
  | { k: 'teamThorns'; pct: number }
  | { k: 'healedBarrier'; pct: number }
  | { k: 'buffMana'; pct: number }
  | { k: 'firstSpellCrit' }
  | { k: 'shareBuffs' }
  | { k: 'bossCtrl' };

const T = (text: string, ...effects: Eff[]): [string, Eff[]] => [text, effects];

/** texto do catálogo → efeitos (a mesma frase vale em todas as grades que a usam). */
const TEXT_EFFECTS: Record<string, Eff[]> = Object.fromEntries([
  // ---------------------------------------------------------------- Tier 1
  T('Ataques corpo a corpo golpeiam com fúria crescente.', { k: 'streak', on: 'hit', dmg: 1, per: .02, max: 10, dur: 6 }),
  T('Abaixo de 40% de HP, recebe −15% de dano.', { k: 'taken', pct: .15, below: .4 }),
  T('20% de chance de devolver 100% do golpe ao atacante.', { k: 'reflect', chance: .2, pct: 1 }),
  T('Ao chegar a 30% de HP, ganha escudo de 25% do HP máx. (1× por wave).', { k: 'once', when: 'lowhp', below: .3, do: 'shield', pct: .25 }),
  T('Aliados da linha de trás recebem −15% de dano enquanto o Guardião estiver vivo.', { k: 'teamTaken', pct: .15, row: 'back' }),
  T('Todo 5º ataque é crítico garantido.', { k: 'every', n: 5, on: 'basic', do: 'crit' }),
  T('Alvos abaixo de 30% de HP recebem +25% de dano extra.', { k: 'dmg', vs: 'low', thr: .3, pct: .25 }),
  T('O primeiro golpe em cada monstro é crítico com dano ×2.', { k: 'firstStrike', mult: 2 }),
  T('O primeiro alvo de cada wave recebe +25% de dano de toda a equipe.', { k: 'teamDmgFirst', pct: .25 }),
  T('A cada 8 disparos, uma salva atinge todos os inimigos.', { k: 'every', n: 8, on: 'basic', do: 'volley', pct: .6 }),
  T('Recupera 2% do HP máx. por abate.', { k: 'onKill', heal: .02 }),
  T('Abater um monstro reinicia 30% da recarga de todas as magias.', { k: 'onKill', cd: .3 }),
  T('Magias custam −10% de mana.', { k: 'manaCost', pct: .1 }),
  T('Ao ficar sem mana, recupera 30% dela (1× por wave).', { k: 'once', when: 'noMana', do: 'mana', pct: .3 }),
  T('Magias do elemento em foco têm 15% de chance de não gastar mana nem entrar em recarga.', { k: 'proc', chance: .15, do: 'freeCast', noCd: true }),
  T('Cura de alvo único cura também 40% no 2º aliado mais ferido.', { k: 'heals', splash: .4 }),
  T('Aliados abaixo de 30% de HP recebem −20% de dano.', { k: 'teamTaken', pct: .2, below: .3 }),
  T('Curas excedentes viram escudo (até 20% do HP do alvo).', { k: 'heals', overflowShield: .2 }),
  T('Uma vez por wave, revive um aliado derrotado com 40% de HP.', { k: 'once', when: 'avgLow', do: 'revive', pct: .4 }),
  T('A cada 30 s, a equipe ganha +30% de ataque e velocidade por 6 s.', { k: 'periodic', every: 30, do: 'teamBuff', dmg: .3, aspd: .3, dur: 6 }),
  T('10% de chance de atacar de novo.', { k: 'proc', chance: .1, do: 'repeat' }),
  T('A cada 5 golpes, uma onda de chi atinge todos os inimigos.', { k: 'every', n: 5, on: 'basic', do: 'volley', pct: .7 }),
  T('Sem sofrer dano por 5 s: recupera 1% de HP por segundo.', { k: 'quietRegen', after: 5, hp: .01 }),
  T('Combos de 10 golpes liberam um Punho do Dragão (300% do dano).', { k: 'every', n: 10, on: 'basic', do: 'strike', pct: 3 }),
  T('Abates restauram 5% de mana.', { k: 'onKill', mana: .05 }),
  T('Poções têm 15% de chance de não serem consumidas.', { k: 'potionSave', chance: .15 }),
  T('Chefes e elites recebem +25% de dano extra.', { k: 'dmg', vs: 'bossElite', pct: .25 }),
  T('Cada 1.000 de ouro ganho concede +0,5% de dano (até 25%).', { k: 'dmg', vs: 'goldScaled', pct: .005 }),
  T('Ataques contra alvos com HP cheio causam +20%.', { k: 'dmg', vs: 'full', pct: .2 }),
  T('Chefes sempre deixam um item extra.', { k: 'bossDrop', chance: 1 }),
  T('Abater um chefe paga um bônus de ouro igual a 10 abates comuns.', { k: 'onKill', bossGold: 10 }),
  T('Ataques básicos causam +30% do poder mágico como dano elemental.', { k: 'basicStat', stat: 'magicPower', pct: .3 }),
  T('Uma vez por wave, um golpe fatal deixa o portador com 20% de HP.', { k: 'once', when: 'fatal', do: 'surviveFatal', pct: .2 }),
  T('Ataques têm 10% de chance de liberar uma explosão rúnica.', { k: 'proc', chance: .1, do: 'volley', pct: .8 }),
  T('Barreiras absorvem o primeiro golpe de cada wave.', { k: 'once', when: 'firstHit', do: 'absorbHit' }),
  T('A cada 10 s, uma runa concede +20% de dano e −10% de dano recebido por 6 s.', { k: 'periodic', every: 10, do: 'selfBuff', dmg: .2, taken: .1, dur: 6 }),
  T('Controlar um alvo restaura 3% de mana.', { k: 'ctrlMana', pct: .03 }),
  T('Após 10 s sem ser atingido, o próximo golpe é evitado.', { k: 'dodge', quiet: 10 }),
  T('+25% de dano corpo a corpo e +25% de poder mágico ao mesmo tempo.', { k: 'dmg', vs: 'basic', pct: .25 }, { k: 'dmg', vs: 'spell', pct: .25 }),
  T('Ao cair abaixo de 40% de HP, regenera 3% por segundo por 5 s.', { k: 'once', when: 'lowhp', below: .4, do: 'regen', pct: .03, dur: 5 }),
  T('Uma vez por wave, uma explosão de vida cura toda a equipe em 25% do HP.', { k: 'once', when: 'avgLow', do: 'teamHeal', pct: .25 }),
  T('A cada 6 ataques, uma salva atinge todos os inimigos com 80% do dano.', { k: 'every', n: 6, on: 'basic', do: 'volley', pct: .8 }),
  T('Mísseis de proteção reduzem em 10% o dano da linha de trás.', { k: 'teamTaken', pct: .1, row: 'back' }),
  T('Críticos causam uma explosão de fogo em área.', { k: 'onCrit', volley: .4 }),
  T('Uma torreta ataca junto com a equipe (30% do dano do Artilheiro).', { k: 'turrets', n: 1, pct: .3 }),
  T('A cada 20 s, uma barragem de mísseis atinge todos os inimigos (250% do dano).', { k: 'periodic', every: 20, do: 'volley', pct: 2.5 }),
  // ---------------------------------------------------------------- Tier 2 (entregues)
  T('Ataques básicos atingem todos os inimigos.', { k: 'every', n: 1, on: 'basic', do: 'volley', pct: .5 }),
  T('Cada morte em sequência aumenta o dano em 5% (até 10×).', { k: 'streak', on: 'kill', dmg: 1, per: .05, max: 10, dur: 8 }),
  T('Ao abater 5 inimigos em 10 s, entra em frenesi (+30% de velocidade por 8 s).', { k: 'killBurst', n: 5, window: 10, aspd: .3, dur: 8 }),
  T('Dano +1% para cada 2% de HP perdido (até +50%).', { k: 'lostHp', per: 2, step: .01, max: .5 }),
  T('Abates curam 3% do HP máx.', { k: 'onKill', heal: .03 }),
  T('Uma vez por wave, sobrevive a um golpe fatal com 1 de HP.', { k: 'once', when: 'fatal', do: 'surviveFatal', pct: 0 }),
  T('Aura em área cura 1% do HP máx. por segundo e reduz em 8% o dano da equipe.', { k: 'periodic', every: 1, do: 'regenTeam', pct: .01 }, { k: 'teamTaken', pct: .08 }),
  T('Curas em aliados com HP cheio viram escudo.', { k: 'heals', overflowShield: 1 }),
  T('Aliados abaixo de 25% de HP recebem −30% de dano.', { k: 'teamTaken', pct: .3, below: .25 }),
  T('Devolve 60% do dano recebido em forma de dano de Morte.', { k: 'reflect', chance: 1, pct: .6 }),
  T('O dano refletido cura o Cavaleiro Negro.', { k: 'reflect', chance: 0, pct: 0, heal: .5 }),
  T('Ao cair abaixo de 30% de HP, libera uma onda de Morte em todos os inimigos.', { k: 'once', when: 'lowhp', below: .3, do: 'volley', dmg: 3 }),
  T('Alvo único: +40% de dano contra alvos abaixo de 30% de HP.', { k: 'dmg', vs: 'low', thr: .3, pct: .4 }),
  T('Contra chefes, os 3 primeiros golpes são críticos.', { k: 'bossForceCrit', n: 3 }),
  T('Abates críticos reiniciam a recarga de todas as magias.', { k: 'onKill', cd: 1, critOnly: true }),
  T('Desvia de 20% dos golpes recebidos.', { k: 'dodge', chance: .2 }),
  T('Cria um duplo que ataca com 40% do dano do Ladino.', { k: 'echo', pct: .4 }),
  T('Uma vez por wave, fica invulnerável por 3 s.', { k: 'once', when: 'lowhp', below: .4, do: 'invuln', dur: 3 }),
  T('Sem se mover por 5 s, o próximo tiro é crítico garantido.', { k: 'critReady', every: 5 }),
  T('Tiros críticos perfuram e atingem o alvo de trás.', { k: 'onCrit', volley: 1 }),
  T('Escudo automático em aliados abaixo de 40% de HP.', { k: 'heals', autoShield: { below: .4, pct: .15, cd: 15 } }),
  T('Curas em área rendem +50%.', { k: 'heals', areaMult: .5 }),
  T('Uma vez por wave, uma prece cura toda a equipe até 60% do HP.', { k: 'once', when: 'avgLow', do: 'teamHeal', pct: .6 }),
  T('Críticos incendeiam o alvo com fogo sagrado.', { k: 'onCrit', burn: true }),
  T('Alvos abaixo de 25% de HP são abatidos por um raio sagrado.', { k: 'execute', below: .25 }),
  T('A cada 15 s, um bombardeio atinge todos os inimigos.', { k: 'periodic', every: 15, do: 'volley', pct: 1.5 }),
  T('O primeiro chefe de cada ciclo recebe +50% de dano de toda a equipe.', { k: 'teamDmgBoss', pct: .5 }),
  T('Chefes pagam ouro em dobro.', { k: 'bossGold', mult: 2 }),
  T('Chefes abatidos deixam um troféu extra.', { k: 'bossDrop', chance: 1 }),
  T('Ataques básicos têm 20% de chance de se repetir.', { k: 'proc', chance: .2, do: 'repeat' }),
  T('Cada abate paga +5% de ouro por acúmulo (até 10).', { k: 'onKill', goldMult: .05 }),
  T('A cada 30 s, um saque extra paga o ouro de 20 monstros comuns.', { k: 'periodic', every: 30, do: 'gold', pct: 20 }),
  T('Críticos reforçam a lâmina (+5% de dano por 6 s, acumula 5×).', { k: 'onCrit', buff: { dmg: .05, dur: 6, max: 5 } }),
  T('A cada 10 s, a lâmina explode em runas (200% do dano em área).', { k: 'periodic', every: 10, do: 'volley', pct: 2 }),
  T('Absorve o dano de um golpe por wave.', { k: 'once', when: 'firstHit', do: 'absorbHit' }),
  T('Cria clones que desviam 25% do dano recebido.', { k: 'taken', pct: .25 }),
  T('Devolve 50% do dano recebido como dano psíquico.', { k: 'reflect', chance: 1, pct: .5 }),
  T('Críticos aumentam a velocidade de ataque em 10% por 5 s.', { k: 'onCrit', buff: { aspd: .1, dur: 5, max: 1 } }),
  T('Ao cair abaixo de 30% de HP, entra em forma primal (+40% de dano por 8 s).', { k: 'once', when: 'lowhp', below: .3, do: 'buff', dmg: .4, dur: 8 }),
  T('Uma vez por wave, uma árvore ancestral cura e protege a equipe por 10 s.', { k: 'once', when: 'avgLow', do: 'teamHeal', pct: .3 }),
  T('Duas torretas autônomas atacam no chão (30% do dano cada).', { k: 'turrets', n: 2, pct: .3 }),
  T('Até 4 torretas ao mesmo tempo, com 40% do dano cada.', { k: 'turrets', n: 4, pct: .4 }),
  T('Dispara mísseis em todos os inimigos a cada 8 s.', { k: 'periodic', every: 8, do: 'volley', pct: .8 }),
  T('Mísseis perseguem alvos abaixo de 30% de HP.', { k: 'summon', every: 3, pct: 1.5, target: 'low' }),
  T('Uma vez por wave, o traje sobrecarrega e absorve 50% do dano por 5 s.', { k: 'once', when: 'lowhp', below: .4, do: 'takenBuff', pct: .5, dur: 5 }),
  // ---------------------------------------------------------------- Majors das grades novas (por efeito dominante)
  T('Golpes corpo a corpo têm 15% de chance de acertar duas vezes.', { k: 'proc', chance: .15, do: 'repeat' }),
  T('Disparos têm 15% de chance de perfurar e acertar outro inimigo.', { k: 'proc', chance: .15, do: 'second' }),
  T('Magias de dano têm 10% de chance de não gastar mana.', { k: 'proc', chance: .1, do: 'freeCast' }),
  T('A cada 10 ataques, o próximo é instantâneo.', { k: 'every', n: 10, on: 'basic', do: 'haste' }),
  T('Críticos têm 10% de chance de causar dano dobrado.', { k: 'onCrit', double: .1 }),
  T('Abaixo de 50% de vida, recupera 1% da vida por segundo.', { k: 'lowRegen', below: .5, hp: .01 }),
  T('Cada golpe recebido reduz o próximo em 3% (até 15%).', { k: 'takenStack', per: .03, max: .15, dur: 6 }),
  T('Ganha uma barreira de 10% da vida ao entrar numa wave.', { k: 'once', when: 'start', do: 'shield', pct: .1 }),
  T('Recupera 10% da mana ao derrotar um inimigo.', { k: 'onKill', mana: .1 }),
  T('Ao lançar uma magia, 15% de chance de zerar a recarga de outra.', { k: 'proc', chance: .15, do: 'castReset' }),
  T('Reflete 25% do dano recebido como dano de espinhos.', { k: 'reflect', chance: 1, pct: .25 }),
  T('Curas excedentes viram barreira (até 20% da vida).', { k: 'heals', overflowShield: .2 }),
  T('Contra chefes, o primeiro ataque de cada wave causa +50% de dano.', { k: 'firstBoss', mult: 1.5 }),
  T('Buffs que você aplica também curam 2% da vida dos aliados.', { k: 'buffs', heal: .02 }),
  T('Inimigos controlados recebem 10% mais dano.', { k: 'dmg', vs: 'ctrl', pct: .1 }),
  T('Cada inimigo abatido tem 8% de chance de dropar ouro em dobro.', { k: 'goldDouble', chance: .08 }),
  T('Chefes têm +10% de chance de dropar equipamento.', { k: 'bossDrop', chance: .1 }),
  // ---------------------------------------------------------------- Keystones das grades novas
  T('Cada magia de dano aumenta em 5% o dano da seguinte (até 5 acúmulos).', { k: 'streak', on: 'cast', dmg: 1, per: .05, max: 5, dur: 12 }),
  T('A cada 10 magias, a próxima causa o dobro do dano.', { k: 'every', n: 10, on: 'cast', do: 'doubleNext' }),
  T('Buffs que você aplica duram 50% mais.', { k: 'buffs', durMult: .5 }),
  T('Magias ignoram a resistência elemental do alvo.', { k: 'ignoreResist' }),
  T('Abater um chefe concede +20% de dano por 30 s.', { k: 'onKill', bossBuff: { dmg: .2, dur: 30 } }),
  T('Aliados na mesma linha recebem 10% menos dano.', { k: 'teamTaken', pct: .1, row: 'same' }),
  T('Cada 5º golpe seguido atordoa o alvo por 1 s.', { k: 'every', n: 5, on: 'basic', do: 'stun' }),
  T('Abaixo de 30% de vida, recebe 30% menos dano.', { k: 'taken', pct: .3, below: .3 }),
  T('Aliados recebem 8% menos dano enquanto você está vivo.', { k: 'teamTaken', pct: .08 }),
  T('Parte da defesa vira dano nos ataques básicos.', { k: 'basicStat', stat: 'defense', pct: .5 }),
  T('Críticos concedem +5% de velocidade por 5 s (até 5 acúmulos).', { k: 'onCrit', buff: { aspd: .05, dur: 5, max: 5 } }),
  T('Cada inimigo abatido tem 10% de chance de dar ouro em dobro.', { k: 'goldDouble', chance: .1 }),
  T('Os ataques básicos giram e acertam até 3 inimigos.', { k: 'every', n: 1, on: 'basic', do: 'volley', pct: .6 }),
  T('Críticos em chefes causam +50% de dano.', { k: 'dmg', vs: 'critBoss', pct: .5 }),
  T('Ataques básicos têm 25% de chance de disparar duas vezes.', { k: 'proc', chance: .25, do: 'repeat' }),
  T('Abaixo de 40% de vida, ganha uma barreira de 20% da vida.', { k: 'once', when: 'lowhp', below: .4, do: 'shield', pct: .2 }),
  T('Buffs que você aplica também curam 3% da vida dos aliados.', { k: 'buffs', heal: .03 }),
  T('Buffs de equipe duram 30% mais.', { k: 'buffs', durMult: .3 }),
  T('A cada 10 golpes, o próximo acerta 3 vezes.', { k: 'every', n: 10, on: 'basic', do: 'strike', pct: 2 }),
  T('Recupera 1% de vida por segundo fora de combate imediato.', { k: 'quietRegen', after: 3, hp: .01 }),
  T('Cada golpe recebido reduz o dano do próximo em 2% (até 20%).', { k: 'takenStack', per: .02, max: .2, dur: 6 }),
  T('Inimigos abaixo de 15% de vida morrem instantaneamente.', { k: 'execute', below: .15 }),
  T('Ataques básicos têm 20% de chance de lançar um frasco extra.', { k: 'proc', chance: .2, do: 'repeat' }),
  T('Golpes contra alvos abaixo de 25% de vida causam +40% de dano.', { k: 'dmg', vs: 'low', thr: .25, pct: .4 }),
  T('Cada ferida sofrida aumenta a defesa em 1% (até 15%).', { k: 'takenStack', per: .01, max: .15, dur: 8 }),
  T('Aliados feridos recebem 10% menos dano.', { k: 'teamTaken', pct: .1, below: .99 }),
  T('Runas de buff duram o dobro.', { k: 'buffs', durMult: 1 }),
  T('Magias têm 10% de chance de se duplicar.', { k: 'proc', chance: .1, do: 'castAgain' }),
  T('Críticos explodem e atingem inimigos próximos.', { k: 'onCrit', volley: .5 }),
  T('Contra chefes, o primeiro tiro de cada wave causa o triplo.', { k: 'firstBoss', mult: 3 }),
  T('Cada tiro seguido aumenta a velocidade em 2% (até 30%).', { k: 'streak', on: 'hit', aspd: 1, per: .02, max: 15, dur: 4 }),
  // ---------------------------------------------------------------- restante do catálogo
  T('Conclui o treino básico: bônus permanentes de HP, defesa e dano corpo a corpo.', { k: 'passive' }),
  T('Críticos causam dano devastador; +25% contra chefes.', { k: 'dmg', vs: 'crit', pct: .2 }, { k: 'dmg', vs: 'critBoss', pct: .25 }),
  T('Como Tanque, recebe 75% dos golpes e −10% de dano recebido.', { k: 'taken', pct: .1, tank: true }),
  T('A cada 10 golpes sem sofrer dano: +10% de dano por 8 s (acumula até 3×).', { k: 'noHitStreak', n: 10, dmg: .1, dur: 8, max: 3 }),
  T('Como Tanque, recebe 75% dos golpes (em vez de 65%).', { k: 'passive' }),
  T('Dano Sagrado cura o aliado com menos HP.', { k: 'elemLeech', element: 'holy', heal: .25, ally: true }),
  T('Dano Sagrado crítico cura o aliado com menos HP.', { k: 'elemLeech', element: 'holy', heal: .5, ally: true, critOnly: true }),
  T('Após abater um monstro, o Ladino some do radar por 2 s.', { k: 'stealth', sec: 2 }),
  T('Ataques aplicam veneno cumulativo.', { k: 'poisonOnHit', stacks: 1 }),
  T('Críticos à distância atravessam a armadura.', { k: 'ignoreDef', chance: 1, crit: true }),
  T('+10% de dano nas demais magias elementais equipadas.', { k: 'dmg', vs: 'spell', pct: .1 }),
  T('O treino do elemento em foco rende +40% de tries.', { k: 'trainFocus', pct: 40 }),
  T('Buffs de ataque e defesa afetam toda a equipe.', { k: 'buffsTeam' }),
  T('Buffs ativos reduzem a recarga das magias da equipe em 10%.', { k: 'buffCdr', pct: .1 }),
  T('Monstros têm 10% de chance de errar o primeiro ataque.', { k: 'missFirst', chance: .1 }),
  T('Uma vez por wave, a equipe ganha todos os buffs ativos do Bardo por 8 s.', { k: 'shareBuffs' }),
  T('Combos completos restauram mana.', { k: 'every', n: 5, on: 'basic', do: 'mana', pct: .05 }),
  T('Efeitos contínuos duram +30%.', { k: 'dotDur', pct: .3 }),
  T('Cura 20% mais ao roubar vida de alvos amaldiçoados.', { k: 'cursedLeech', pct: .2 }),
  T('Dano de Morte cura 10% do dano causado e restaura mana.', { k: 'elemLeech', element: 'death', heal: .1, mana: .01 }),
  T('Maldições se espalham para 1 alvo adjacente ao expirar.', { k: 'dotSpread', on: 'expire', n: 1 }),
  T('15% de chance de o acerto em área explodir de novo.', { k: 'aoeAgain', chance: .15 }),
  T('Poções repassam 25% do efeito aos aliados.', { k: 'potion', share: .25 }),
  T('Alvos envenenados têm −10% de defesa.', { k: 'armorBreak', on: 'poisoned', pct: .1, dur: 1 }),
  T('Uma vez por wave, transmuta o inimigo mais forte (−30% de HP, +100% de ouro).', { k: 'transmute', kind: 'strong' }),
  T('15% de chance de o controle afetar +1 alvo.', { k: 'ctrlExtra', chance: .15, n: 1 }),
  T('Efeitos de controle sofridos duram −30%.', { k: 'ccResist', pct: .3 }),
  T('Monstros controlados atacam os próprios aliados.', { k: 'confuse', on: 'control', dur: 3 }),
  T('A regeneração da equipe rende +50%; magias de Terra curam 10% do dano.', { k: 'regenMult', pct: .5 }, { k: 'elemLeech', element: 'earth', heal: .1 }),
  T('Magias de Terra têm 15% de chance de enraizar por 1,5 s.', { k: 'elemStun', element: 'earth', chance: .15, dur: 1.5 }),
  T('Magias de área atingem também os inimigos da fila de espera.', { k: 'pendingHit', pct: .25 }),
  T('Trocar o elemento em foco concede +15% de dano por 8 s.', { k: 'focusSwap', dmg: .15, dur: 8 }),
  T('Trocar o elemento em foco concede +20% de dano por 10 s.', { k: 'focusSwap', dmg: .2, dur: 10 }),
  T('Críticos aplicam sangramento por 4 s.', { k: 'bleed', on: 'crit', pct: .25, dur: 4 }),
  T('Dano elemental aumenta 3% para cada elemento acima do nível 20.', { k: 'elemCount', level: 20, per: .03 }),
  T('Ataques físicos têm 10% de chance de ignorar a defesa do alvo.', { k: 'ignoreDef', chance: .1 }),
  T('Pisões atordoam todos os inimigos por 1 s.', { k: 'aoeStun', dur: 1 }),
  T('Veneno acumula até 10 vezes e dobra o dano no último acúmulo.', { k: 'poisonOnHit', stacks: 1, doubleAt: 10 }),
  T('Tiros ignoram a defesa do alvo.', { k: 'ignoreDef', chance: 1 }),
  T('Invoca um pet tanque que absorve 30% dos golpes.', { k: 'decoy', chance: .3 }),
  T('O pet e o caçador atacam em conjunto com bônus de dano em área.', { k: 'summon', every: 4, pct: .35, target: 'all' }),
  T('Uma vez por wave, invoca uma segunda fera por 15 s.', { k: 'summon', every: 2, pct: .6, target: 'first', window: 15 }),
  T('Cada chefe diferente abatido concede +2% de dano permanente.', { k: 'bossKillStack', per: .02 }),
  T('Potencializa dano de terra.', { k: 'dmg', vs: 'element', el: 'earth', pct: .1 }),
  T('Dano Sagrado aplica um debuff de −15% de defesa.', { k: 'armorBreak', on: 'hit', pct: .15, dur: 6, element: 'holy' }),
  T('Potencializa dano sagrado.', { k: 'dmg', vs: 'element', el: 'holy', pct: .1 }),
  T('A primeira magia de cada wave sempre acerta crítico.', { k: 'firstSpellCrit' }),
  T('Curas feitas em você também dão barreira aos aliados.', { k: 'healedBarrier', pct: .3 }),
  T('Barreiras de equipe duram 40% mais.', { k: 'shieldDur', pct: .4 }),
  T('Aumenta a velocidade de ataque e de conjuração de toda a equipe.', { k: 'teamAspd', pct: .1 }),
  T('Buffs renovados pela metade do custo de mana.', { k: 'buffHalfCost' }),
  T('Todos os buffs do Bardo afetam a equipe inteira sem limite.', { k: 'buffsTeam' }),
  T('Debuffs aleatórios em área a cada 10 s.', { k: 'debuffRandom', every: 10 }),
  T('Críticos psíquicos confundem o alvo.', { k: 'confuse', on: 'crit', dur: 3, element: 'psychic' }),
  T('A cada 20 s, todos os inimigos ficam confusos por 3 s.', { k: 'confuse', on: 'periodic', every: 20, dur: 3 }),
  T('Inimigos controlados recebem 15% mais dano.', { k: 'dmg', vs: 'ctrl', pct: .15 }),
  T('Curas em grupo também concedem regeneração por 5 s.', { k: 'healRegen', dur: 5, pct: .02 }),
  T('Potencializa dano psíquico.', { k: 'dmg', vs: 'element', el: 'psychic', pct: .1 }),
  T('Curas em grupo também removem atordoamentos dos aliados.', { k: 'stunClear' }),
  T('Ataques disparam projéteis de energia com roubo de vida.', { k: 'basicOrb', pct: .4, heal: .3 }),
  T('Mana cheia converte o excedente em escudo.', { k: 'manaShield' }),
  T('Gastar mana concede dano extra por 4 s.', { k: 'onCastBuff', dmg: .1, dur: 4 }),
  T('O dano escala com o HP máximo (+1% de dano para cada 5% de HP máx. bônus).', { k: 'hpScale', per: .05, step: .01 }),
  T('Golpes reduzem a defesa do alvo em 5% (acumula 4×).', { k: 'armorBreak', on: 'hit', pct: .05, dur: 6, max: .2 }),
  T('Ao sofrer um golpe crítico, o próximo ataque causa +100% de dano.', { k: 'heavyHit', dmg: 1 }),
  T('Potencializa dano físico (magia).', { k: 'dmg', vs: 'element', el: 'physical', pct: .1 }),
  T('Armas equipadas concedem +10% de dano aos golpes desarmados.', { k: 'dmg', vs: 'basicArmed', pct: .1 }),
  T('Invoca esqueletos dos monstros derrotados (30% do dano do Bruxo).', { k: 'skeletons', pct: .3, max: 3 }),
  T('Esqueletos curam o Bruxo ao causar dano.', { k: 'skeletonHeal', pct: .15 }),
  T('Até 6 esqueletos ao mesmo tempo, com 60% do dano do Bruxo.', { k: 'skeletons', pct: .6, max: 6 }),
  T('Pragas contagiam os alvos vizinhos ao morrer.', { k: 'dotSpread', on: 'death', n: 2 }),
  T('Chefes sofrem +2% de dano por acúmulo de peste (até 10).', { k: 'dmgPerStack', vs: 'boss', per: .02 }),
  T('Todo inimigo da wave recebe a praga do primeiro alvo contaminado.', { k: 'dotAll' }),
  T('Potencializa dano de morte.', { k: 'dmg', vs: 'element', el: 'death', pct: .1 }),
  T('Magias de morte ignoram 20% da resistência do alvo.', { k: 'ignoreResist', pct: .2, element: 'death' }),
  T('Potencializa dano de veneno.', { k: 'dmg', vs: 'element', el: 'poison', pct: .1 }),
  T('O dano contínuo cresce com o poder mágico.', { k: 'dotBoost', pct: .3 }),
  T('Dano contínuo se espalha para inimigos próximos.', { k: 'dotSpread', on: 'tick', n: 1 }),
  T('Explosões quebram a armadura (−20% de defesa).', { k: 'armorBreak', on: 'aoe', pct: .2, dur: 8 }),
  T('Bombas críticas explodem duas vezes.', { k: 'onCrit', double: 1 }),
  T('Poções concedem um buff de atributos de 20 s.', { k: 'potion', buff: .1 }),
  T('Loot comum é transmutado em ouro extra.', { k: 'lootGold', pct: .3 }),
  T('Uma vez por wave, transmuta um inimigo em ouro (exceto chefes).', { k: 'transmute', kind: 'weak' }),
  T('Curas deixam uma regeneração de 3 s nos aliados.', { k: 'healRegen', dur: 3, pct: .02 }),
  T('Quando um inimigo morre com veneno, explode causando dano aos vizinhos.', { k: 'deathBlast', pct: 1.2 }),
  T('Dano de fogo e veneno se somam como dano contínuo.', { k: 'dotCross' }),
  T('Golpes pesados quebram a defesa do alvo em 20% por 5 s.', { k: 'armorBreak', on: 'crit', pct: .2, dur: 5 }),
  T('Aplica um elemento fraco ao grupo (+10% de dano elemental).', { k: 'teamSpellDmg', pct: .1 }),
  T('Escudos expirados devolvem 20% do valor como mana.', { k: 'shieldExpire', mana: .2 }),
  T('Escudos são compartilhados com toda a equipe (50% do valor).', { k: 'shieldShare', pct: .5 }),
  T('Magias deixam um glifo que explode 3 s depois.', { k: 'glyph', pct: .5, delay: 3 }),
  T('Inimigos atordoados ficam 1 s a mais sob efeito.', { k: 'stunExtra', sec: 1 }),
  T('Runas de fogo deixam o chão em chamas por 4 s.', { k: 'groundFire' }),
  T('Clones explodem ao expirar, causando dano psíquico em área.', { k: 'periodic', every: 12, do: 'volley', pct: 1.2 }),
  T('Monstros afetados atacam uns aos outros.', { k: 'confuse', on: 'control', dur: 3 }),
  T('O controle atinge +2 alvos.', { k: 'ctrlExtra', chance: 1, n: 2 }),
  T('Chefes sofrem metade da duração de controle, mas ficam vulneráveis (+15% de dano).', { k: 'dmg', vs: 'boss', pct: .15 }, { k: 'bossCtrl' }),
  T('Inimigos atordoados recebem 25% mais dano psíquico.', { k: 'dmg', vs: 'ctrl', pct: .25 }),
  T('Buffs de equipe também restauram um pouco de mana.', { k: 'buffMana', pct: .05 }),
  T('Magias psíquicas têm 20% de chance de atordoar com choque.', { k: 'elemStun', element: 'psychic', chance: .2, dur: 1.5 }),
  T('Ataques causam sangramento (dano contínuo).', { k: 'bleed', on: 'hit', pct: .15, dur: 4 }),
  T('Curas contínuas na equipe (2% do HP por segundo por 6 s).', { k: 'healRegen', dur: 6, pct: .02 }),
  T('A regeneração aumenta com a defesa.', { k: 'regenDef' }),
  T('Curas deixam uma regeneração que dura 6 s.', { k: 'healRegen', dur: 6, pct: .02 }),
  T('A cada 8 s uma fera invocada ataca o inimigo mais forte.', { k: 'summon', every: 8, pct: 1.8, target: 'strong' }),
  T('Inimigos que atacam o grupo sofrem dano de espinhos.', { k: 'teamThorns', pct: .15 }),
  T('Veneno se espalha ao matar um inimigo.', { k: 'dotSpread', on: 'death', n: 2 }),
  T('Torretas disparam +30% mais rápido.', { k: 'turretRate', pct: .3 }),
  T('Tiros de fogo aplicam combustão que se acumula.', { k: 'burnOnHit', chance: .35 }),
]);


/** Mecânica (id do nó) → efeitos. Montada a partir do catálogo de talentos. */
export const MECHANIC_EFFECTS = new Map<string, Eff[]>();
for (const { node } of TALENT_NODES.values()) if (node.mechanic && TEXT_EFFECTS[node.mechanic.text]) MECHANIC_EFFECTS.set(node.mechanic.id, TEXT_EFFECTS[node.mechanic.text]);
export const MECHANICS_DONE = new Set(MECHANIC_EFFECTS.keys());

/** Para testes: força a lista de efeitos de um personagem, ignorando os talentos. */
export const mechanicsTestHook: { override?: (c: Character) => Eff[] | undefined } = {};

const cache = new Map<string, { stamp: string; eff: Eff[] }>();
/** Efeitos ativos do personagem: os dos Majors/Keystones com rank comprado. */
export function effectsOf(c: Character): Eff[] {
  const forced = mechanicsTestHook.override?.(c); if (forced) return forced;
  const keys = Object.keys(c.talentRanks); let stamp = `${keys.length}`; for (const k of keys) stamp += `|${k}:${c.talentRanks[k]}`;
  const hit = cache.get(c.id); if (hit && hit.stamp === stamp) return hit.eff;
  const eff: Eff[] = [];
  for (const [id, rank] of Object.entries(c.talentRanks)) if (rank > 0) { const node = TALENT_NODES.get(id)?.node; const list = node?.mechanic && MECHANIC_EFFECTS.get(node.mechanic.id); if (list) eff.push(...list); }
  cache.set(c.id, { stamp, eff }); return eff;
}
export type { GameState, MonsterRuntime };
