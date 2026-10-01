#!/usr/bin/env python3
"""Gera, a partir de specs.py, as 90 especializações do jogo:
  src/game/rpg/tier2Specs.ts   (nós da árvore, passivas)
  src/game/data/specSpells.ts  (uma magia por especialização)
  src/game/data/talent-trees.json (grades dos nós novos, afinidade de treino; remove os nós antigos do Mago)
Uso (da raiz): python3 tools/classes/gen_tier2.py
"""
import copy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from specs import SPECS  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JSON_PATH = os.path.join(ROOT, 'src', 'game', 'data', 'talent-trees.json')

KIT = dict(mago='mage', guerreiro='knight', guardiao='guardian', ladino='rogue', cacador='hunter', clerigo='paladin', bardo='bard', monge='monk', bruxo='necromancer',
           alquimista='alchemist', mercenario='mercenary', mestre_runico='runemaster', ilusionista='illusionist', druida='druid', artilheiro='gunner')
OLD_MAGE = ['piromante', 'criomante', 'eletromante', 'geomante', 'miasmante', 'teurgo', 'lich', 'cinetico', 'psionista', 'infernalista', 'tempestuoso', 'glaciomante_de_impacto',
            'flagelo_miasmatico', 'inquisidor_mental', 'bio_geomante', 'arcanista_de_plasma', 'singularista', 'dominador_sombrio']
# As 28 especializações que já tinham árvore própria (entregue em talent-trees.json): não são regeneradas.
ORIGINAL = ['gladiador', 'berserker', 'paladino', 'cavaleiro_negro', 'assassino', 'mestre_das_sombras', 'atirador_de_elite', 'mestre_das_feras', 'sumo_sacerdote', 'inquisidor',
            'maestro', 'menestrel_do_caos', 'mestre_do_chi', 'punho_de_ferro', 'necromante', 'epidemiologista', 'mestre_bombardeiro', 'transmutador', 'cacador_de_recompensas',
            'corsario', 'forjador_de_laminas', 'guardiao_das_runas', 'mestre_dos_espelhos', 'hipnotizador', 'forma_feral', 'guardiao_da_natureza', 'engenheiro_de_torretas', 'exotraje']
ELEMENTS = ['fire', 'ice', 'energy', 'earth', 'poison', 'holy', 'death', 'physical', 'psychic']

STAT_TEXT = dict(maxHp='de vida', maxMana='de mana máxima', attack='de ataque', defense='de defesa', attackSpeed='de velocidade de ataque', crit='de chance de crítico',
                 resistance='de resistência', magicPower='de poder mágico', focusMagicDamage='de dano das magias do elemento em foco',
                 burnOnFireHit='de chance de queimar em magias de fogo', iceBarrier='do dano de gelo vira barreira', plasmaCrit='de crítico em magias de fogo e energia')


def passive_text(effects):
    parts = []
    for eff, v in effects:
        pct = round(v * 100)
        parts.append(f'{pct}% de recarga mais rápida' if eff == 'cooldown' else f'+{pct}% {STAT_TEXT[eff]}')
    return ', '.join(parts[:-1]) + (' e ' if len(parts) > 1 else '') + parts[-1] + '.'


# ------------------------------------------------------------ magias
TEMPLATES = {
    'st': dict(target='enemy', kind='damage', power=1.85, mana=14, cooldown=5, text='Dano forte em um alvo.'),
    'big': dict(target='enemy', kind='damage', power=2.4, mana=22, cooldown=9, text='Golpe devastador em um alvo.'),
    'aoe': dict(target='allEnemies', kind='damage', power=1.25, mana=22, cooldown=8, text='Dano em todos os inimigos.'),
    'stun': dict(target='enemy', kind='damage', power=1.3, mana=16, cooldown=8, stun=2, text='Dano e atordoamento de 2 s.'),
    'heal': dict(target='ally', kind='heal', power=1.6, mana=14, cooldown=5, text='Cura forte em um aliado.'),
    'teamheal': dict(target='allAllies', kind='heal', power=.9, mana=26, cooldown=10, text='Cura toda a equipe.'),
    'shield': dict(target='self', kind='shield', power=42, mana=14, cooldown=9, duration=6, text='Barreira pessoal.'),
    'teamshield': dict(target='allAllies', kind='shield', power=28, mana=26, cooldown=12, duration=6, text='Barreira para toda a equipe.'),
    'buff': dict(target='self', kind='buff', power=.3, mana=14, cooldown=10, duration=7, text='Aumenta o ataque por alguns segundos.'),
    'teambuff': dict(target='allAllies', kind='buff', power=.28, mana=22, cooldown=11, duration=8, text='Aumenta o ataque da equipe.'),
    'defbuff': dict(target='self', kind='buff', power=.22, mana=14, cooldown=10, duration=7, text='Aumenta a defesa por alguns segundos.'),
    'teamdef': dict(target='allAllies', kind='buff', power=.22, mana=22, cooldown=11, duration=8, text='Aumenta a defesa da equipe.'),
}

# ------------------------------------------------------------ talentos
SKILL_POOL = {
    'melee': dict(A=['melee', 'aspd', 'crit'], B=['hp', 'def'], C=['t_melee', 'cdr']),
    'ranged': dict(A=['ranged', 'crit', 'aspd'], B=['hp', 'res'], C=['t_ranged', 'cdr']),
    'defense': dict(A=['thorns', 'aggro_up', 'def'], B=['hp', 'res', 'shield'], C=['t_defense', 'heal']),
    'magic': dict(A=['magic', 'critdmg', 'aoe'], B=['mana', 'mregen'], C=['t_magic', 'cdr', 'e_focus']),
    'holy': dict(A=['e_holy', 'heal'], B=['healrec', 'shield'], C=['t_holy', 'buffpow']),
}
for e in ELEMENTS:
    SKILL_POOL.setdefault(e, dict(A=[f'e_{e}'], B=[], C=[f't_{e}']))
COUNTER_POOL = {
    'crits': dict(A=['critdmg']), 'bossCrits': dict(A=['boss']), 'damageTaken': dict(B=['thorns', 'res']), 'healingDone': dict(A=['heal'], B=['healrec']),
    'buffsApplied': dict(C=['buffpow', 'buffdur']), 'dotDamage': dict(A=['dot']), 'supportPotionsUsed': dict(C=['potion']), 'bossKills': dict(A=['boss'], C=['drop']),
    'goldEarned': dict(C=['gold']), 'controlSpells': dict(C=['ccdur', 'aoe']),
}
DEFAULT_POOL = dict(A=['crit', 'critdmg', 'aspd'], B=['hp', 'res', 'def'], C=['cdr', 'mana', 'xp'])
NAMES = {
    'melee': ['Mestre das Armas', 'Golpe Firme', 'Lâmina Afiada'], 'ranged': ['Mira Firme', 'Tiro Certeiro', 'Olho de Águia'], 'magic': ['Poder Arcano', 'Mente Afiada', 'Fluxo Mágico'],
    'aspd': ['Mãos Ágeis', 'Frenesi', 'Ritmo Veloz'], 'crit': ['Olho Clínico', 'Ponto Fraco', 'Golpe Certeiro'], 'critdmg': ['Golpe Cruel', 'Impacto Brutal', 'Dor Aguda'],
    'hp': ['Vigor', 'Pele Dura', 'Fôlego de Ferro'], 'def': ['Guarda Firme', 'Couraça', 'Postura Sólida'], 'res': ['Mente Calma', 'Véu Protetor', 'Resiliência'],
    'mana': ['Reserva Arcana', 'Poço de Mana', 'Foco Sereno'], 'mregen': ['Chi Fluente', 'Respiração Arcana', 'Maré de Mana'], 'cdr': ['Mestre do Tempo', 'Ritmo Curto', 'Pressa Calculada'],
    'aoe': ['Alcance Ampliado', 'Devastação em Área', 'Onda Expansiva'], 'thorns': ['Espinhos', 'Retaliação', 'Pele Espinhosa'], 'aggro_up': ['Provocação', 'Chamariz', 'Olhar Desafiador'],
    'shield': ['Barreira Viva', 'Escudo Firme', 'Proteção Etérea'], 'heal': ['Mãos Curativas', 'Toque Gentil', 'Cura Rápida'], 'healrec': ['Corpo Receptivo', 'Bênção Recebida', 'Alma Aberta'],
    'buffpow': ['Aura Potente', 'Inspiração', 'Canto Forte'], 'buffdur': ['Aura Duradoura', 'Eco Persistente', 'Ritmo Longo'], 'dot': ['Praga Persistente', 'Corrosão', 'Ferida Aberta'],
    'boss': ['Caçador de Chefes', 'Foco no Alvo Maior', 'Quebra-Reis'], 'drop': ['Faro de Tesouro', 'Olho de Saque', 'Sorte do Caçador'], 'gold': ['Bolsa Cheia', 'Mãos de Ouro', 'Lucro Certo'],
    'potion': ['Alquimia de Campo', 'Frascos Frescos', 'Poção Eficaz'], 'ccdur': ['Controle Firme', 'Grilhões Longos', 'Prisão Mental'], 'xp': ['Aprendiz Voraz', 'Lições da Luta', 'Experiência Viva'],
    'e_focus': ['Foco Elemental', 'Sintonia', 'Elemento Dominante'], 'lifesteal': ['Sede de Sangue', 'Dreno Vital', 'Vampirismo'], 'exec': ['Golpe de Misericórdia', 'Finalizador', 'Sentença'],
}
for e, label in [('fire', 'Fogo'), ('ice', 'Gelo'), ('energy', 'Energia'), ('earth', 'Terra'), ('poison', 'Veneno'), ('holy', 'Luz'), ('death', 'Morte'), ('physical', 'Impacto'), ('psychic', 'Mente')]:
    NAMES[f'e_{e}'] = [f'Dom de {label}', f'Poder de {label}', f'Essência de {label}']
    NAMES[f't_{e}'] = [f'Treino de {label}', f'Estudo de {label}', f'Prática de {label}']
for k, label in [('melee', 'Combate'), ('ranged', 'Pontaria'), ('defense', 'Defesa'), ('magic', 'Magia')]:
    NAMES[f't_{k}'] = [f'Treino de {label}', f'Estudo de {label}', f'Prática de {label}']


MAJOR_TEXT = {
    'melee': 'Golpes corpo a corpo têm 15% de chance de acertar duas vezes.', 'ranged': 'Disparos têm 15% de chance de perfurar e acertar outro inimigo.',
    'magic': 'Magias de dano têm 10% de chance de não gastar mana.', 'aspd': 'A cada 10 ataques, o próximo é instantâneo.', 'crit': 'Críticos têm 10% de chance de causar dano dobrado.',
    'critdmg': 'Críticos aplicam sangramento por 4 s.', 'hp': 'Abaixo de 50% de vida, recupera 1% da vida por segundo.', 'def': 'Cada golpe recebido reduz o próximo em 3% (até 15%).',
    'res': 'Ganha uma barreira de 10% da vida ao entrar numa wave.', 'mana': 'Recupera 10% da mana ao derrotar um inimigo.', 'cdr': 'Ao lançar uma magia, 15% de chance de zerar a recarga de outra.',
    'aoe': 'Magias de área atingem também os inimigos da fila de espera.', 'thorns': 'Reflete 25% do dano recebido como dano de espinhos.', 'aggro_up': 'Inimigos atacam você primeiro por 4 s ao entrar na wave.',
    'heal': 'Curas excedentes viram barreira (até 20% da vida).', 'shield': 'Barreiras duram o dobro enquanto houver aliados feridos.', 'dot': 'Dano contínuo se espalha para um inimigo vizinho.',
    'boss': 'Contra chefes, o primeiro ataque de cada wave causa +50% de dano.', 'buffpow': 'Buffs que você aplica também curam 2% da vida dos aliados.', 'buffdur': 'Buffs renovados mantêm 50% do tempo restante.',
    'ccdur': 'Inimigos controlados recebem 10% mais dano.', 'gold': 'Cada inimigo abatido tem 8% de chance de dropar ouro em dobro.', 'drop': 'Chefes têm +10% de chance de dropar equipamento.',
    'e_focus': 'Trocar o elemento em foco concede +15% de dano por 8 s.',
}


def pools_for(spec):
    pool = {'A': [], 'B': [], 'C': []}
    for skill in spec['skills']:
        for lane, codes in SKILL_POOL[skill].items():
            pool[lane] += [c for c in codes if c not in pool[lane]]
    if spec['elements']:
        pool['A'] += ['e_focus']; pool['C'] += ['t_magic']
    for lane, codes in COUNTER_POOL.get(spec['counter'], {}).items():
        pool[lane] += [c for c in codes if c not in pool[lane]]
    for lane in 'ABC':
        pool[lane] += [c for c in DEFAULT_POOL[lane] if c not in pool[lane]]
    return pool


def build_tree(spec, skeleton, effects):
    tree = copy.deepcopy(skeleton)
    sid, pool, used = spec['id'], pools_for(spec), {}
    tree['name'] = spec['name']; tree['parent'] = spec['parent']
    ids = {n['id']: n['id'].replace('gladiador', sid) for n in tree['nodes']}
    counters = {'A': 0, 'B': 0, 'C': 0}
    all_codes = pool['A'] + pool['C'] + pool['B']
    big = 0
    for n in tree['nodes']:
        n['id'] = ids[n['id']]; n['parents'] = [ids[p] for p in n['parents']]
        if n['kind'] == 'root':
            continue
        old = n['effects']
        lane = n['lane'] if n['lane'] in 'ABC' else 'C'
        new = []
        for i, eff in enumerate(old):
            factor = eff['perRank'] / effects[eff['code']]['unitPerRank'] if eff['code'] in effects else 1
            if n['kind'] in ('major', 'keystone'):
                code = all_codes[(big + i) % len(all_codes)]
            else:
                code = pool[lane][counters[lane] % len(pool[lane])]; counters[lane] += 1
            value = effects[code]['unitPerRank'] * factor
            if n['kind'] in ('major', 'keystone'):
                value = min(value, {'crit': 12, 'aspd': 30, 'cdr': 25}.get(code, 70))
            new.append({'code': code, 'perRank': round(value, 3)})
        if n['kind'] in ('major', 'keystone'):
            big += 2
        n['effects'] = new
        code0 = new[0]['code']
        variant = used.get(code0, 0); used[code0] = variant + 1
        names = NAMES.get(code0, [effects[code0]['label']])
        n['name'] = names[variant % len(names)] + ('' if variant < len(names) else ' II')
        if n['kind'] == 'keystone':
            ks = spec['keystone'] or (f'Apoteose: {spec["name"]}', f'O auge do caminho do {spec["name"]}: todos os bônus se potencializam.')
            n['name'] = ks[0]; n['mechanic'] = {'id': f'{sid}.keystone', 'text': ks[1]}
        elif n['kind'] == 'major':
            n['name'] = f'{names[0]} Superior'
            n['mechanic'] = {'id': n['id'].replace(f'{sid}.', f'{sid}.major.', 1), 'text': MAJOR_TEXT.get(code0, f'Potencializa {effects[code0]["label"].lower()}.')}
    return tree


def affinity_for(spec, tier1):
    """Regra dos dados: Tier 2 = afinidade do pai, com +0,25 (teto 1,75) só nas proficiências da porta."""
    base = dict(tier1[spec['parent']])
    for skill in spec['skills']:
        base[skill] = min(1.75, base.get(skill, 0) + .25)
    return base


def ts_str(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def write_ts():
    rows, passives, spells = [], [], []
    for s in SPECS:
        skills = ', '.join(f'{k}: {v}' for k, v in s['skills'].items())
        extra = (f", counter: '{s['counter']}'" if s['counter'] else '') + (f", elements: {{ count: {s['elements'][0]}, level: {s['elements'][1]} }}" if s['elements'] else '')
        rows.append(f"  {{ id: '{s['id']}', name: {ts_str(s['name'])}, parent: '{s['parent']}', kind: '{s['kind']}', skills: {{ {skills} }}{extra}, tagline: {ts_str(s['tagline'])} }},")
        pn, eff = s['passive']
        effs = ', '.join(f"{{ effect: '{e}', value: {v} }}" for e, v in eff)
        passives.append(f"  {s['id']}: {{ name: {ts_str(pn)}, description: {ts_str(passive_text(eff))}, effects: [{effs}] }},")
        sn, tpl, element = s['spell']
        t = TEMPLATES[tpl]
        fields = [f"id: '{s['id']}_spell'", f"classId: '{KIT[s['parent']]}'", f"node: '{s['id']}'", f"name: {ts_str(sn)}", "level: 1", f"mana: {t['mana']}", f"cooldown: {t['cooldown']}",
                  f"target: '{t['target']}'", f"power: {t['power']}", f"kind: '{t['kind']}'"]
        if 'duration' in t: fields.append(f"duration: {t['duration']}")
        if 'stun' in t: fields.append(f"stun: {t['stun']}")
        if element: fields.append(f"element: '{element}'")
        fields.append(f"description: {ts_str(t['text'])}")
        spells.append('  { ' + ', '.join(fields) + ' },')
    with open(os.path.join(ROOT, 'src/game/rpg/tier2Specs.ts'), 'w') as f:
        f.write("""// GERADO por tools/classes/gen_tier2.py a partir de tools/classes/specs.py. Não edite à mão.
import type { CounterId } from './profile';
import type { ProficiencyId } from './proficiencies';

/** 90 especializações (Tier 2): 15 classes × 6 (3 puras + 3 híbridas). P = pura · C = pura com contador de menor nível · H = híbrida · E = N elementos livres (Mago). */
export interface SpecRow { id: string; name: string; parent: string; kind: 'P' | 'C' | 'H' | 'E'; skills: Partial<Record<ProficiencyId, number>>; counter?: CounterId; elements?: { count: number; level: number }; tagline: string; }
export const TIER2_SPECS: SpecRow[] = [
""" + '\n'.join(rows) + """
];

export interface SpecPassive { name: string; description: string; effects: { effect: string; value: number }[]; }
export const SPEC_PASSIVES: Record<string, SpecPassive> = {
""" + '\n'.join(passives) + "\n};\n")
    with open(os.path.join(ROOT, 'src/game/data/specSpells.ts'), 'w') as f:
        f.write("""// GERADO por tools/classes/gen_tier2.py a partir de tools/classes/specs.py. Não edite à mão.
import type { SpellDef } from '../core/types';

/** Uma magia por especialização: entra no kit do pai, mas só fica disponível com o nó no caminho da classe. */
export const SPEC_SPELLS: SpellDef[] = [
""" + '\n'.join(spells) + "\n];\n")


def write_json():
    data = json.load(open(JSON_PATH))
    trees, aff = data['trees'], data['affinity']
    skeleton = copy.deepcopy(trees['gladiador'])
    existing = set(ORIGINAL)
    for old in OLD_MAGE:
        trees.pop(old, None); aff['tier2'].pop(old, None)
    for s in SPECS:
        if s['id'] in existing:
            aff['tier2'][s['id']] = aff['tier2'].get(s['id'], affinity_for(s, aff['tier1']))
            continue
        trees[s['id']] = build_tree(s, skeleton, data['effects'])
        aff['tier2'][s['id']] = affinity_for(s, aff['tier1'])
    # ordem estável: tier 0/1 como estão, depois as especializações na ordem da tabela
    ordered = {k: v for k, v in trees.items() if v['tier'] < 2}
    for s in SPECS:
        ordered[s['id']] = trees[s['id']]
    data['trees'] = ordered
    with open(JSON_PATH, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f'{len(SPECS)} especializações; {sum(1 for s in SPECS if s["id"] not in existing)} árvores novas.')


if __name__ == '__main__':
    write_ts()
    write_json()
