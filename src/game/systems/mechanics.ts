import type { Character, GameState, MonsterRuntime } from '../core/types';
import { TALENT_NODES } from '../data/talentTrees';

/**
 * Mecânicas dos Majors e Keystones das grades de talento. Cada texto do catálogo vira uma lista de efeitos declarativos (`Eff`);
 * o motor (core/mech.ts) executa os efeitos nos ganchos de combate. Texto sem entrada aqui continua "Em breve".
 */
export type Eff =
  | { k: 'dmg'; vs: 'boss' | 'bossElite' | 'low' | 'full' | 'ctrl' | 'critBoss' | 'basic' | 'spell' | 'goldScaled'; pct: number; thr?: number }
  | { k: 'firstBoss'; mult: number }
  | { k: 'firstStrike'; mult: number }
  | { k: 'bossForceCrit'; n: number }
  | { k: 'critReady'; every: number }
  | { k: 'lostHp'; per: number; step: number; max: number }
  | { k: 'streak'; on: 'hit' | 'kill' | 'crit' | 'cast'; dmg?: number; aspd?: number; per: number; max: number; dur: number }
  | { k: 'killBurst'; n: number; window: number; aspd: number; dur: number }
  | { k: 'taken'; pct: number; below?: number }
  | { k: 'takenStack'; per: number; max: number; dur: number }
  | { k: 'teamTaken'; pct: number; below?: number; row?: 'back' | 'same' }
  | { k: 'dodge'; chance?: number; quiet?: number }
  | { k: 'reflect'; chance: number; pct: number; heal?: number }
  | { k: 'once'; when: 'lowhp' | 'avgLow' | 'start' | 'firstHit' | 'fatal' | 'noMana'; below?: number; do: 'shield' | 'heal' | 'invuln' | 'surviveFatal' | 'absorbHit' | 'teamHeal' | 'revive' | 'mana' | 'regen' | 'buff' | 'takenBuff' | 'volley'; pct?: number; dur?: number; dmg?: number }
  | { k: 'onKill'; heal?: number; mana?: number; cd?: number; critOnly?: boolean; bossBuff?: { dmg: number; dur: number }; bossGold?: number; bossDrop?: number; goldMult?: number; extraGold?: number }
  | { k: 'onCrit'; heal?: number; volley?: number; burn?: boolean; double?: number; buff?: { aspd?: number; dmg?: number; dur: number; max: number } }
  | { k: 'every'; n: number; on: 'basic' | 'cast'; do: 'volley' | 'crit' | 'strike' | 'stun' | 'haste' | 'doubleNext'; pct?: number }
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
  | { k: 'ignoreResist' }
  | { k: 'teamDmgFirst'; pct: number }
  | { k: 'teamDmgBoss'; pct: number };

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
  T('Uma torreta ataca junto com a equipe (30% do dano do Artilheiro).', { k: 'echo', pct: .3 }),
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
  T('Duas torretas autônomas atacam no chão (30% do dano cada).', { k: 'echo', pct: .6 }),
  T('Até 4 torretas ao mesmo tempo, com 40% do dano cada.', { k: 'echo', pct: 1 }),
  T('Dispara mísseis em todos os inimigos a cada 8 s.', { k: 'periodic', every: 8, do: 'volley', pct: .8 }),
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
