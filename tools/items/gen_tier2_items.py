#!/usr/bin/env python3
"""Gera src/game/data/items-tier2.json: 6 itens de classe por especialização (540 no total), com o mesmo formato de items-tier1.json.

Cada especialização ganha: arma de 1 mão (Superior), arma de 2 mãos (BiS), mão secundária (Superior), armadura (BiS), amuleto (BiS) e anel (Superior),
com bônus de proficiência e efeitos tirados do estilo da especialização (mesmas reservas de efeitos da grade de talentos).
Uso (da raiz): python3 tools/items/gen_tier2_items.py
"""
import json
import os
import sys

HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(HERE, '..', 'classes'))
from gen_tier2 import pools_for  # noqa: E402
from specs import SPECS  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TREES = json.load(open(os.path.join(ROOT, 'src/game/data/talent-trees.json')))
EFFECTS = TREES['effects']

# classe: (arma 1 mão, arma 2 mãos, secundária (nome, tipo), armadura (nome, categoria), amuleto, anel)  — gênero: 'f' ou 'm'
KIT = {
    'guerreiro': (('Espada', 'f'), ('Montante', 'm'), (('Escudo', 'm'), 'shield'), (('Armadura', 'f'), 'heavy'), ('Insígnia', 'f'), ('Sinete', 'm')),
    'guardiao': (('Maça', 'f'), ('Alabarda', 'f'), (('Escudo', 'm'), 'shield'), (('Couraça', 'f'), 'heavy'), ('Medalhão', 'm'), ('Anel', 'm')),
    'ladino': (('Adaga', 'f'), ('Alfanje', 'm'), (('Adaga Gêmea', 'f'), 'dual'), (('Gibão', 'm'), 'medium'), ('Talismã', 'm'), ('Anel', 'm')),
    'cacador': (('Besta', 'f'), ('Arco Longo', 'm'), (('Aljava', 'f'), 'quiver'), (('Couro', 'm'), 'medium'), ('Pingente', 'm'), ('Anel', 'm')),
    'mago': (('Varinha', 'f'), ('Cajado', 'm'), (('Foco', 'm'), 'focus'), (('Manto', 'm'), 'light'), ('Colar', 'm'), ('Anel', 'm')),
    'clerigo': (('Maça Sagrada', 'f'), ('Cajado', 'm'), (('Escudo Sagrado', 'm'), 'shield'), (('Hábito', 'm'), 'medium'), ('Símbolo', 'm'), ('Anel', 'm')),
    'bardo': (('Flauta', 'f'), ('Alaúde', 'm'), (('Lira', 'f'), 'focus'), (('Casaco', 'm'), 'light'), ('Medalhão', 'm'), ('Anel', 'm')),
    'monge': (('Manopla', 'f'), ('Bastão', 'm'), (('Conta', 'f'), 'focus'), (('Kimono', 'm'), 'medium'), ('Colar', 'm'), ('Anel', 'm')),
    'bruxo': (('Punhal', 'm'), ('Cajado', 'm'), (('Grimório', 'm'), 'focus'), (('Manto', 'm'), 'light'), ('Amuleto', 'm'), ('Anel', 'm')),
    'alquimista': (('Frasco', 'm'), ('Mangual', 'm'), (('Alambique', 'm'), 'focus'), (('Avental', 'm'), 'light'), ('Vidro', 'm'), ('Anel', 'm')),
    'mercenario': (('Lâmina', 'f'), ('Machado', 'm'), (('Escudo', 'm'), 'shield'), (('Cota', 'f'), 'heavy'), ('Bolsa', 'f'), ('Anel', 'm')),
    'mestre_runico': (('Espada Rúnica', 'f'), ('Bastão', 'm'), (('Pedra', 'f'), 'focus'), (('Cota', 'f'), 'medium'), ('Glifo', 'm'), ('Anel', 'm')),
    'ilusionista': (('Varinha', 'f'), ('Cajado', 'm'), (('Espelho', 'm'), 'focus'), (('Manto', 'm'), 'light'), ('Véu', 'm'), ('Anel', 'm')),
    'druida': (('Cajado', 'm'), ('Bastão', 'm'), (('Totem', 'm'), 'focus'), (('Couraça', 'f'), 'medium'), ('Pingente', 'm'), ('Anel', 'm')),
    'artilheiro': (('Pistola', 'f'), ('Rifle', 'm'), (('Pistola Gêmea', 'f'), 'dual'), (('Colete', 'm'), 'medium'), ('Bússola', 'f'), ('Anel', 'm')),
}
ARM = {'light': 5, 'medium': 8, 'heavy': 12}
BIS_WORD = {'f': ['Lendária', 'Suprema', 'Imortal', 'Ancestral', 'Eterna', 'Soberana'], 'm': ['Lendário', 'Supremo', 'Imortal', 'Ancestral', 'Eterno', 'Soberano']}


def slug(text):
    table = str.maketrans('áàâãäéèêëíìîïóòôõöúùûüçñ ', 'aaaaaeeeeiiiiooooouuuucn_')
    return ''.join(ch for ch in text.lower().translate(table) if ch.isalnum() or ch == '_')


def effects_for(spec, count, mult, offset):
    pool = pools_for(spec)
    codes = [c for lane in 'ACB' for c in pool[lane]]
    out = []
    for i in range(count):
        code = codes[(offset + i * 2) % len(codes)]
        unit = EFFECTS[code]['unitPerRank']
        value = round(min(unit * mult, {'crit': 5, 'aspd': 5, 'cdr': 4, 'res': 5}.get(code, 14)), 1)
        out.append({'code': code, 'value': value})
    return out


def passive(effects):
    return '; '.join(f"{EFFECTS[e['code']]['label']} +{str(e['value']).replace('.', ',').rstrip('0').rstrip(',')}%" for e in effects)


def main():
    items = []
    for spec_index, spec in enumerate(SPECS):
        w1, w2, off, body, amu, ring = KIT[spec['parent']]
        main_skill = (list(spec['skills']) or ['magic'])[0]
        second = (list(spec['skills']) + ['magic', 'defense'])[1] if len(spec['skills']) > 1 else None
        offset = spec_index
        name = spec['name']
        bis_pick = spec_index % 6
        rows = [
            ('w1', 'weapon', 'superior', w1, 3, 1, None, None, 1),
            ('w2', 'weapon', 'bis', w2, 5, 2, None, None, 2),
            ('off', 'offhand', 'superior', off[0], 3, 1, off[1], body[1], None),
            ('body', 'armor', 'bis', body[0], 4, 2, None, body[1], None),
            ('amu', 'amulet', 'bis', amu, 4, 2, None, None, None),
            ('ring', 'ring', 'superior', ring, 3, 1, None, None, None),
        ]
        for index, (group, slot, quality, noun, bonus, n_eff, offhand_kind, armor_cat, hands) in enumerate(rows):
            noun_name, gender = noun
            title = f'{noun_name} de {name}' if quality == 'superior' else f'{noun_name} {BIS_WORD[gender][bis_pick]} de {name}'
            mult = 3.0 if quality == 'superior' else 3.4
            effects = effects_for(spec, n_eff, mult, offset + index)
            fixed = {main_skill: bonus}
            if quality == 'bis' and second:
                fixed[second] = 1
            item = dict(id=f'{spec["id"]}.{slug(noun_name)}_{index}', name=title, slot=slot, slotGroup=group, index=5 + index, quality=quality, classes=[spec['id']], fixed=fixed)
            if hands: item['hands'] = hands
            if offhand_kind: item['offhandKind'] = offhand_kind
            if armor_cat:
                item['armorCategory'] = armor_cat
                item['arm'] = ARM[armor_cat] + (10 if quality == 'bis' else 6) if group in ('body', 'off') else None
                if item['arm'] is None: del item['arm']
            item['effects'] = effects; item['passive'] = passive(effects)
            items.append(item)
    out = {'version': 1, 'items': items}
    with open(os.path.join(ROOT, 'src/game/data/items-tier2.json'), 'w') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    names = [i['name'] for i in items]
    assert len(set(names)) == len(names) and len({i['id'] for i in items}) == len(items)
    print(f'{len(items)} itens de especialização.')


if __name__ == '__main__':
    main()
