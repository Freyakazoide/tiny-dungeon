# Tiny Dungeon — Fase 6: afinidade de treino por classe e talentos em grade (Squire + 15 classes + 46 subclasses)

> **Como usar (Claude Code):** este arquivo especifica o sistema. Os **dados completos** (2.664 nós, posições, arestas, efeitos, custos e regras) estão em **`talent-trees.json`**; coloque-o em `src/game/data/talent-trees.json` e importe. As seções finais (catálogo) são a versão legível do mesmo JSON. Implemente **A → B → C → D**, rode `npm test` e `npm run build` ao fim de cada bloco, **atualize** (não apague) testes que fixam números antigos e não regenere os dados à mão: se algo precisar mudar, mude o JSON e os testes de integridade (seção B10) dirão o que quebrou.

## 0. Decisões do jogador (fonte desta fase)

1. **Multiplicadores de treino aprovados** (Especialista ×1,5 · Afim ×1,25/×1,0 · Fora ×0,4 · Bloqueada ×0) e a regra do Tier 2 (**+0,25** nas proficiências da porta da subclasse).
2. **Grade de talentos muito maior**, no estilo do Baiak Idle: nós ligados por arestas, **dependência entre nós**, ranks até 10, nós grandes dourados (**Major**) e um nó central grande (**Keystone**). **Majors maiores** que a proposta anterior.
3. **Talentos para todas as classes e subclasses:** Squire, 15 classes Tier 1 e 46 subclasses Tier 2.
4. Pontos: mantida a ideia de "1 por nível + bônus a cada 10 níveis", **dobrada** para sustentar a grade maior (ver B3).

---

## A. Afinidade de treino por classe

Cada classe multiplica as **tries** recebidas por proficiência (online, offline e no ETA). O **Squire treina tudo ×1,0**. O multiplicador vale **depois de evoluir**; o que foi treinado antes fica salvo.

| Categoria | Multiplicador | Efeito |
|---|---|---|
| **Especialista** | ×1,5 | ~⅓ menos tempo |
| **Afim+** | ×1,25 | ~20% menos tempo |
| **Afim** | ×1,0 | normal |
| **Fora** | ×0,4 | 2,5× mais lento |
| **Bloqueada** | ×0 | não treina: o nível já ganho **congela** e a proficiência não pode ser vaga offline nem foco |

### A1. Tabela por classe (Tier 1)

| Classe | Especialista ×1,5 | Afim+ ×1,25 | Afim ×1,0 | Fora ×0,4 | Bloqueadas ×0 |
|---|---|---|---|---|---|
| **Guerreiro** | Melee | — | Defesa, Físico | Ranged, Magia | Fogo, Gelo, Energia, Terra, Veneno, Sagrado, Morte, Psíquico |
| **Guardião** | Defesa | — | Melee, Sagrado, Morte | Ranged, Magia, Físico | Fogo, Gelo, Energia, Terra, Veneno, Psíquico |
| **Ladino** | Melee | — | Veneno, Morte, Físico | Ranged, Defesa, Magia | Fogo, Gelo, Energia, Terra, Sagrado, Psíquico |
| **Caçador** | Ranged | — | Terra, Físico | Melee, Defesa, Magia | Fogo, Gelo, Energia, Veneno, Sagrado, Morte, Psíquico |
| **Mago** | Magia | Fogo, Gelo, Energia, Terra, Veneno, Sagrado, Morte, Físico, Psíquico | — | Melee, Ranged, Defesa | — |
| **Clérigo** | Sagrado | — | Defesa, Magia | Melee, Ranged, Terra, Físico | Fogo, Gelo, Energia, Veneno, Morte, Psíquico |
| **Bardo** | Magia | Psíquico | Sagrado | Melee, Ranged, Defesa, Energia, Terra | Fogo, Gelo, Veneno, Morte, Físico |
| **Monge** | Físico | Melee | Defesa, Magia | Ranged, Terra, Sagrado | Fogo, Gelo, Energia, Veneno, Morte, Psíquico |
| **Bruxo** | Morte | Veneno | Magia | Melee, Ranged, Defesa, Gelo, Psíquico | Fogo, Energia, Terra, Sagrado, Físico |
| **Alquimista** | Veneno | — | Ranged, Magia, Fogo | Melee, Defesa, Terra, Morte, Físico | Gelo, Energia, Sagrado, Psíquico |
| **Mercenário** | Melee | — | Defesa, Físico | Ranged, Magia | Fogo, Gelo, Energia, Terra, Veneno, Sagrado, Morte, Psíquico |
| **Mestre Rúnico** | Magia | Melee | Defesa, Fogo, Energia | Ranged, Gelo, Terra, Físico | Veneno, Sagrado, Morte, Psíquico |
| **Ilusionista** | Psíquico | Magia | Energia | Melee, Ranged, Defesa, Gelo | Fogo, Terra, Veneno, Sagrado, Morte, Físico |
| **Druida** | Terra | Melee, Magia | Veneno | Ranged, Defesa, Gelo, Físico | Fogo, Energia, Sagrado, Morte, Psíquico |
| **Artilheiro** | Ranged | Energia | Defesa, Fogo, Físico | Melee, Magia | Gelo, Terra, Veneno, Sagrado, Morte, Psíquico |

### A2. Tier 2: +0,25 nas proficiências da porta (teto ×1,75)

A subclasse **herda** a tabela da classe-pai e soma **+0,25** em cada proficiência que é requisito dela (nunca há requisito Fora ou Bloqueado; isso é validado por teste).

| Subclasse | Classe | Porta (proficiências) | Multiplicadores efetivos |
|---|---|---|---|
| Piromante | Mago | Fogo | Fogo ×1,5 |
| Criomante | Mago | Gelo | Gelo ×1,5 |
| Eletromante | Mago | Energia | Energia ×1,5 |
| Geomante | Mago | Terra | Terra ×1,5 |
| Miasmante | Mago | Veneno | Veneno ×1,5 |
| Teurgo | Mago | Sagrado | Sagrado ×1,5 |
| Lich | Mago | Morte | Morte ×1,5 |
| Cinético | Mago | Físico | Físico ×1,5 |
| Psionista | Mago | Psíquico | Psíquico ×1,5 |
| Infernalista | Mago | Fogo, Morte | Fogo ×1,5, Morte ×1,5 |
| Tempestuoso | Mago | Energia, Terra | Energia ×1,5, Terra ×1,5 |
| Glaciomante de Impacto | Mago | Gelo, Físico | Gelo ×1,5, Físico ×1,5 |
| Flagelo Miasmático | Mago | Morte, Veneno | Morte ×1,5, Veneno ×1,5 |
| Inquisidor Mental | Mago | Sagrado, Psíquico | Sagrado ×1,5, Psíquico ×1,5 |
| Bio-Geomante | Mago | Terra, Veneno | Terra ×1,5, Veneno ×1,5 |
| Arcanista de Plasma | Mago | Fogo, Energia | Fogo ×1,5, Energia ×1,5 |
| Singularista | Mago | Físico, Energia | Físico ×1,5, Energia ×1,5 |
| Dominador Sombrio | Mago | Psíquico, Morte | Psíquico ×1,5, Morte ×1,5 |
| Gladiador | Guerreiro | Melee | Melee ×1,75 |
| Berserker | Guerreiro | Melee | Melee ×1,75 |
| Paladino | Guardião | Defesa, Sagrado | Defesa ×1,75, Sagrado ×1,25 |
| Cavaleiro Negro | Guardião | Defesa, Morte | Defesa ×1,75, Morte ×1,25 |
| Assassino | Ladino | Melee | Melee ×1,75 |
| Mestre das Sombras | Ladino | Melee, Morte | Melee ×1,75, Morte ×1,25 |
| Atirador de Elite | Caçador | Ranged | Ranged ×1,75 |
| Mestre das Feras | Caçador | Ranged, Terra | Ranged ×1,75, Terra ×1,25 |
| Sumo Sacerdote | Clérigo | Sagrado | Sagrado ×1,75 |
| Inquisidor | Clérigo | Sagrado, Magia | Sagrado ×1,75, Magia ×1,25 |
| Maestro | Bardo | Magia | Magia ×1,75 |
| Menestrel do Caos | Bardo | Magia, Psíquico | Magia ×1,75, Psíquico ×1,5 |
| Mestre do Chi | Monge | Físico, Magia | Físico ×1,75, Magia ×1,25 |
| Punho de Ferro | Monge | Físico, Defesa | Físico ×1,75, Defesa ×1,25 |
| Necromante | Bruxo | Morte | Morte ×1,75 |
| Epidemiologista | Bruxo | Veneno | Veneno ×1,5 |
| Mestre Bombardeiro | Alquimista | Ranged, Fogo | Ranged ×1,25, Fogo ×1,25 |
| Transmutador | Alquimista | Veneno | Veneno ×1,75 |
| Caçador de Recompensas | Mercenário | Melee | Melee ×1,75 |
| Corsário | Mercenário | Melee | Melee ×1,75 |
| Forjador de Lâminas | Mestre Rúnico | Magia, Melee | Magia ×1,75, Melee ×1,5 |
| Guardião das Runas | Mestre Rúnico | Magia, Defesa | Magia ×1,75, Defesa ×1,25 |
| Mestre dos Espelhos | Ilusionista | Psíquico, Magia | Psíquico ×1,75, Magia ×1,5 |
| Hipnotizador | Ilusionista | Psíquico | Psíquico ×1,75 |
| Forma Feral | Druida | Terra, Melee | Terra ×1,75, Melee ×1,5 |
| Guardião da Natureza | Druida | Terra, Magia | Terra ×1,75, Magia ×1,5 |
| Engenheiro de Torretas | Artilheiro | Ranged, Energia | Ranged ×1,75, Energia ×1,5 |
| Exotraje | Artilheiro | Ranged, Defesa | Ranged ×1,75, Defesa ×1,25 |

### A3. Efeito no tempo (ritmo atual: `TIER1_HOURS = 8`, `POST_GATE_GROWTH = 1,3`; 24 h/dia contando offline)

Dias para chegar em cada skill treinando **só depois de evoluir** (o custo base vem de `triesForNextLevel`):

| Skill | ×1,0 | ×1,25 | ×1,5 | ×1,75 |
|---|---|---|---|---|
| 35 | 3,68 d | 2,95 d | 2,46 d | 2,11 d |
| 38 | 8,01 d | 6,41 d | 5,34 d | 4,58 d |
| 40 | 13,49 d | 10,79 d | 8,99 d | 7,71 d |
| 45 | 49,88 d | 39,91 d | 33,26 d | 28,5 d |
| 50 | 185,02 d | 148,01 d | 123,34 d | 105,72 d |

### A4. Especificação de engine

- Novo `src/game/rpg/affinity.ts`: `AFFINITY: Record<nodeId, Record<ProficiencyId, number>>` gerado a partir de `talent-trees.json > affinity` (chaves `tier1` e `tier2`). `affinityFor(profile, prof)` devolve `1` para Squire; para Tier 1, a tabela da classe; para Tier 2, a da subclasse.
- `gainTries(profile, id, amount)`: `amount × affinityFor(profile, id) × (1 + talentBonus(t_<id>) / 100)`. Multiplicador `0` = ignora (não altera `lastTrained`).
- `etaSeconds`, `remainingTries` e o ETA da UI recebem o multiplicador (proficiência bloqueada mostra **"bloqueada"**).
- Offline: `offlineTargets` e o histórico ignoram proficiências bloqueadas; se as duas vagas caírem em bloqueadas, treinam as próximas do histórico e por fim as últimas treinadas **não bloqueadas**.
- **Foco elemental** (online): se o elemento em foco é bloqueado, casts continuam causando dano mas **não treinam**; mostrar "Bloqueada para {classe}" no painel.
- **Classes (guia):** cada cartão de classe mostra a linha "Especialista em … · Afim … · Bloqueia …".
- Testes: (1) Bardo em Morte: `gainTries` não muda nada e `level` fica congelado; (2) Guerreiro em Melee rende 1,5× as tries do Squire; (3) Piromante em Fogo rende ×1,5 (Mago ×1,25 + 0,25); (4) `hoursToReach` do Guerreiro 25→38 em Melee ≈ 1/1,5 do valor base; (5) toda proficiência de porta de subclasse tem multiplicador ≥ 1,0.

---

## B. Sistema de talentos em grade

### B1. Conceitos

- Cada nó da árvore de classes tem **uma grade própria** de talentos: **Squire** (17 nós), **cada classe Tier 1** (63 nós) e **cada subclasse Tier 2** (37 nós). Uma grade abre quando o personagem entra naquele nó; o **caminho inteiro (`classPath`) continua ativo**, então tudo o que foi comprado antes segue valendo.
- **Pontos são um só pool** por personagem: qualquer grade do caminho pode gastá-los.
- A grade é um **grafo**: cada nó tem `parents` (nós da linha de baixo). Para comprar um nó é preciso cumprir a regra de **desbloqueio** e a **trava de linha** (ver B4). A raiz (**Origem**) é grátis e concedida ao entrar na classe.
- Visual (igual à referência): **círculos** por categoria de efeito, **Major** = anel dourado grande, **Keystone** = círculo grande rosa no topo, **Origem** = dourado embaixo.

### B2. Tipos de nó, ranks e custos

| Tipo | Squire (T0) | Classe (T1) | Subclasse (T2) |
|---|---|---|---|
| **Minor** | 5 ranks · 1 pt/rank | 10 ranks · 1 pt/rank | 10 ranks · 1 pt/rank |
| **Notable** | 3 ranks · 2 pts/rank | 5 ranks · 2 pts/rank | 5 ranks · 3 pts/rank |
| **Major** | 1 rank · **8 pts** | 1 rank · **12 pts** | 1 rank · **18 pts** |
| **Keystone** | — | 1 rank · **20 pts** | 1 rank · **30 pts** |
| Escala de efeito | ×1,0 | ×1,0 | ×1,25 nos Minors e Notables |

- **Efeito por rank:** o Minor usa a unidade do catálogo (B7); o **Notable rende 2,5×** por rank; Major e Keystone têm valores **fixos** (rank único) e uma **mecânica** (texto) que entra em fases (B9).
- Custo para zerar uma árvore: T0 = 84 pts · T1 = 638 pts · T2 = 416 pts (não é para completar: são **escolhas**).

### B3. Pontos por personagem

```ts
export const pointsAt = (level: number) => 2 * level + 5 * Math.floor(level / 10);   // 2 por nível + 5 a cada 10 níveis
```

| Nível | 10 | 15 | 20 | 25 | 30 | 40 | 50 | 60 | 75 |
|---|---|---|---|---|---|---|---|---|---|
| Pontos | 25 | 35 | 50 | 60 | 75 | 100 | 125 | 150 | 185 |

`gastos = Σ rank × custoPorRank` (todas as grades); `disponíveis = pointsAt(level) − gastos`. Bônus futuros (codex, charms) podem somar em `pointsAt`.

### B4. Regras de compra

Para comprar +1 rank no nó **N** (sempre só o rank seguinte, nunca acima de `maxRank`):

1. `disponíveis ≥ custoPorRank`.
2. **Desbloqueio** (`unlock`): pelo menos `unlock.parents` dos `parents` de N com `rank ≥ unlock.parentMinRank`:
   - **Minor:** 1 pai com rank ≥ 1 · **Notable:** 1 pai com rank ≥ 5 · **Major:** 2 pais com rank ≥ 5 · **Keystone:** 2 pais com rank ≥ 5 **e** 2 Majors comprados na árvore.
3. **Trava de linha** (`rowGate`): `pontosInvestidosNestaArvore ≥ rowGate` (antes desta compra). Serve para impedir "pular" direto para o topo.

| Árvore | Linha → pontos investidos exigidos |
|---|---|
| Squire (T0) | linha 3: 4 · linha 4: 8 |
| Classe (T1) | linha 4: 6 · linha 5: 12 · linha 6: 24 · linha 7: 36 · linha 8: 48 · linha 9: 64 · linha 10: 80 · linha 11: 104 · linha 12: 140 |
| Subclasse (T2) | linha 3: 4 · linha 4: 10 · linha 5: 20 · linha 6: 32 · linha 7: 44 · linha 8: 70 |

**Reembolso:** só por **respec total** (por grade ou de tudo), com custo em ouro (ralo de economia): `respecGold = round(25 × investidos^1,6)`: 40 pts ≈ 9 mil · 100 pts ≈ 40 mil · 200 pts ≈ 120 mil. Respec devolve todos os pontos e mantém a Origem.

### B5. Quando cada Major/Keystone fica ao alcance (custo mínimo de pré-requisitos + trava de linha + o próprio nó)

| Grade | Primeiro Major | Último Major | Keystone |
|---|---|---|---|
| Squire (T0) | 16 pts (nível 8) | — | — |
| Classe (T1) | 36 pts (nível 16) | 92 pts (nível 39) | 160 pts (nível 65) |
| Subclasse (T2) | 30–30 pts | 31–31 pts | 113–113 pts |

(Níveis calculados com `pointsAt`. Como os pontos são um pool único, quem já gastou nas grades anteriores tem menos livres: o Tier 2 abre no nível 25 com **60 pontos** no total.) A primeira evolução (nível ~15) já dá **35 pontos**: o suficiente para o **primeiro Major do Tier 1** perto do nível 16.

### B6. Formato dos dados (`talent-trees.json`)

```jsonc
{ "version": 1,
  "config": { "pointsPerLevel": 2, "milestoneEvery": 10, "milestoneBonus": 5, "notableMult": 2.5, "templates": {...}, "respec": {...} },
  "effects": { "melee": { "label": "Dano corpo a corpo", "unitPerRank": 1.5, "category": "offense", "engine": "novo" }, ... },
  "affinity": { "tier1": { "guerreiro": { "melee": 1.5, ... } }, "tier2": { "piromante": { "fire": 1.5, ... } } },
  "trees": { "guerreiro": {
     "tier": 1, "name": "Guerreiro", "lanes": { "A": "Lâmina", "B": "Couraça" }, "gates": { "4": 6, ... },
     "totalCost": 638, "nodeCount": 63, "unlockPoints": {...}, "unlockLevels": {...},
     "nodes": [ { "id": "guerreiro.r6c1", "name": "Fúria Marcial", "kind": "major", "x": 1, "y": 6, "lane": "A",
                  "maxRank": 1, "costPerRank": 12, "rowGate": 24,
                  "effects": [ { "code": "melee", "perRank": 30 }, { "code": "crit", "perRank": 8 } ],
                  "parents": ["guerreiro.r5c0", "guerreiro.r5c1", "guerreiro.r5c2"],
                  "unlock": { "parents": 2, "parentMinRank": 5 },
                  "mechanic": { "id": "guerreiro.major.r6c1", "text": "Ataques corpo a corpo golpeiam com fúria crescente." } }, ... ] } } }
```

- `x` (0–6) e `y` (0 = base) são coordenadas de grade; a UI escala `x` e `y` para pixels. `perRank` está em **pontos percentuais** (`crit: 8` = +8 p.p. de chance de crítico).
- IDs são estáveis: `arvore.rYcX`. Salve no personagem apenas **`talentRanks: Record<nodeId, number>`**.
- Todos os Majors e Keystones têm `mechanic.id` estável; o engine mantém `MECHANICS_IMPLEMENTED: Set<string>` (B9).

### B7. Catálogo de efeitos e como aplicar

`talentTotals(character) = Σ rank × perRank` por código, somando **todas as grades do caminho**. Recalcular ao comprar, respecar, evoluir e subir de nível; guardar em cache no personagem (não persistir).

| Código | Rótulo | Unid./rank (Minor) | Como aplica | Teto | Engine |
|---|---|---|---|---|---|
| `melee` | Dano corpo a corpo | 1,5 | multiplica o dano dos ataques básicos corpo a corpo | — | novo |
| `ranged` | Dano à distância | 1,5 | multiplica o dano dos ataques básicos à distância | — | novo |
| `magic` | Dano mágico | 1,5 | multiplica o dano de todas as magias (`magicPower`) | — | existe |
| `e_fire` | Dano de Fogo | 1,5 | multiplica o dano das magias de Fogo | — | novo |
| `e_ice` | Dano de Gelo | 1,5 | multiplica o dano das magias de Gelo | — | novo |
| `e_energy` | Dano de Energia | 1,5 | multiplica o dano das magias de Energia | — | novo |
| `e_earth` | Dano de Terra | 1,5 | multiplica o dano das magias de Terra | — | novo |
| `e_poison` | Dano de Veneno | 1,5 | multiplica o dano das magias de Veneno | — | novo |
| `e_holy` | Dano Sagrado | 1,5 | multiplica o dano das magias de Sagrado | — | novo |
| `e_death` | Dano de Morte | 1,5 | multiplica o dano das magias de Morte | — | novo |
| `e_physical` | Dano Físico (magia) | 1,5 | multiplica o dano das magias de Físico | — | novo |
| `e_psychic` | Dano Psíquico | 1,5 | multiplica o dano das magias de Psíquico | — | novo |
| `e_focus` | Dano do elemento em foco | 1,5 | multiplica o dano das magias do elemento em foco | — | novo |
| `crit` | Chance de crítico | 0,5 | soma p.p. à chance de crítico | 75% total | existe |
| `critdmg` | Dano crítico | 3 | soma ao multiplicador de crítico (base 1,65 → 1,65 + x/100) | multiplicador ≤ ×4,0 | novo |
| `aspd` | Velocidade de ataque | 1 | multiplica a velocidade de ataque | +100% | existe |
| `aoe` | Dano em área | 1,5 | multiplica o dano de ataques e magias que atingem 2+ alvos | — | novo |
| `boss` | Dano contra chefes e elites | 1,5 | multiplica o dano contra chefes e elites | — | novo |
| `exec` | Dano contra alvos abaixo de 30% de HP | 2 | multiplica o dano contra alvos abaixo de 30% de HP | — | novo |
| `dot` | Dano contínuo | 2 | multiplica o dano de efeitos contínuos | — | novo |
| `cdr` | Redução de recarga | 1 | reduz a recarga das magias | 50% | existe |
| `mregen` | Regeneração de mana | 4 | multiplica a regeneração de mana | +300% | novo |
| `mana` | Mana máxima | 2 | multiplica a mana máxima | — | existe |
| `hp` | HP máximo | 2 | multiplica o HP máximo | — | existe |
| `def` | Defesa | 2 | multiplica a defesa | — | existe |
| `res` | Resistência | 0,6 | soma à resistência | 60% total | existe |
| `heal` | Poder de cura | 2 | multiplica a cura feita | — | existe |
| `healrec` | Cura recebida | 2 | multiplica a cura recebida | — | novo |
| `shield` | Força de escudos | 2 | multiplica os escudos gerados | — | novo |
| `thorns` | Espinhos (dano refletido) | 1,5 | reflete x% do dano recebido ao atacante | 100% | novo |
| `aggro_up` | Peso de aggro | 3 | aumenta o peso no sorteio de alvo (`pickMonsterTarget`) | +100% | novo |
| `aggro_down` | Redução de aggro | 3 | reduz o peso no sorteio de alvo | −80% | novo |
| `lifesteal` | Roubo de vida | 0,4 | cura x% do dano causado | 25% | novo |
| `potion` | Eficácia das poções | 3 | multiplica a cura das poções usadas | — | novo |
| `xp` | XP ganho | 1,5 | multiplica o XP ganho | — | novo |
| `gold` | Ouro ganho | 1,5 | multiplica o ouro ganho | — | novo |
| `drop` | Chance de drop | 1,5 | multiplica a chance de drop | — | novo |
| `sell` | Valor de venda | 1,5 | multiplica o valor de venda | — | novo |
| `buffdur` | Duração dos buffs | 3 | multiplica a duração dos buffs | — | novo |
| `buffpow` | Potência dos buffs | 1,5 | multiplica a potência dos buffs | — | novo |
| `ccdur` | Duração de controle | 3 | multiplica a duração de controle | — | novo |
| `t_focus` | Tries no elemento em foco | 2 | multiplica as tries do elemento em foco | +150% | novo |
| `t_melee` | Tries em Melee | 2 | multiplica as tries recebidas em Melee (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_ranged` | Tries em Ranged | 2 | multiplica as tries recebidas em Ranged (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_defense` | Tries em Defesa | 2 | multiplica as tries recebidas em Defesa (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_magic` | Tries em Magia | 2 | multiplica as tries recebidas em Magia (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_fire` | Tries em Fogo | 2 | multiplica as tries recebidas em Fogo (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_ice` | Tries em Gelo | 2 | multiplica as tries recebidas em Gelo (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_energy` | Tries em Energia | 2 | multiplica as tries recebidas em Energia (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_earth` | Tries em Terra | 2 | multiplica as tries recebidas em Terra (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_poison` | Tries em Veneno | 2 | multiplica as tries recebidas em Veneno (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_holy` | Tries em Sagrado | 2 | multiplica as tries recebidas em Sagrado (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_death` | Tries em Morte | 2 | multiplica as tries recebidas em Morte (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_physical` | Tries em Físico | 2 | multiplica as tries recebidas em Físico (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |
| `t_psychic` | Tries em Psíquico | 2 | multiplica as tries recebidas em Psíquico (junto da afinidade: `× afinidade × (1 + x/100)`) | +150% | novo |

- "existe" = já há estatística equivalente no engine (mapear); "novo" = precisa de campo/cálculo novo.
- Efeitos somam **dentro do mesmo código**; entre códigos diferentes o efeito é multiplicativo com o resto do sistema (equipamento, buffs).

### B8. Interface

Dentro de **Personagem → Talentos** (a aba de topo continua a mesma):

- **Abas de grade:** uma por nó do caminho (Squire, Classe, Subclasse), a atual em destaque; grades futuras aparecem esmaecidas com "abre ao evoluir".
- **Canvas SVG** com pan (arrastar) e zoom (roda/pinça); nós desenhados nas coordenadas `x`,`y` (linha 0 embaixo); **arestas acesas** quando os dois nós têm rank ≥ 1 (como na referência).
- **Aparência do nó:** cor por `category` (ofensa vermelho, vida verde, defesa azul, especial rosa, utilidade âmbar, treino ciano); rótulo `rank/máx`; Major com anel dourado e Keystone grande no topo; nó comprável ganha brilho; nó bloqueado, opacidade baixa.
- **Tooltip:** nome, `rank atual/máx`, efeito **do rank seguinte** e o **acumulado**, custo, e uma lista **do que falta** (`"Precisa de 2 vizinhos em 5/10"`, `"Investir mais 12 pts nesta grade"`, `"Precisa de 2 Majors"`). Majors e Keystone mostram a **mecânica** com a etiqueta **"Em breve"** enquanto `mechanic.id` não estiver em `MECHANICS_IMPLEMENTED`.
- **Ações:** clique = +1 rank; `Shift`+clique = comprar tudo o que o saldo permitir; `Ctrl`+clique em um nó grande = confirmar antes.
- **Cabeçalho:** pontos disponíveis / gastos, botão **Respec** (mostra o custo em ouro e pede confirmação), **busca por efeito** (digite "crítico" e os nós com `crit`/`critdmg` acendem) e um resumo "Bônus ativos" (`talentTotals` formatado, ordenado por categoria).
- Mobile: zoom por pinça, toque longo para o tooltip.

### B9. Fases de implementação das mecânicas dos Majors e Keystones

Cada Major/Keystone tem uma parte **numérica** (`effects`, aplicada de imediato por `talentTotals`) e um **texto de mecânica** (`mechanic`). São **214 mecânicas** (1 do Squire, 75 do Tier 1, 138 do Tier 2). **Implementar só a parte numérica agora** e liberar as mecânicas por prioridade:

1. Squire e as 3 classes jogáveis do Tier 1 (**Guerreiro, Caçador, Mago**): 1 + 5 + 5 + 5 = 16 mecânicas.
2. Subclasses do Mago já com passivas no jogo (**Piromante, Criomante, Arcanista de Plasma**): 9 mecânicas.
3. As demais, à medida que o kit da classe for liberado (a classe fica "Em breve" até lá; ver decisão de evolução irreversível).

Enquanto a mecânica não existir, a UI mostra **"Em breve"** e **não vende** a promessa no tooltip principal (o bônus numérico continua sendo real).

### B10. Migração e integridade

- **Talentos antigos:** ao carregar um save antigo, **reembolsar** tudo (zerar `talents` do sistema antigo), preencher `talentRanks = {}` e conceder a Origem de cada nó do caminho. Manter o antigo `talents.ts` só até a migração rodar.
- **Validação de save** (`validateGameState`): para cada `talentRanks[nodeId]`: o nó existe, `rank ≤ maxRank`, a árvore pertence ao `classPath`, e **reproduzindo as compras em ordem topológica** (linha crescente) todas as regras de B4 são satisfeitas; senão o personagem volta a zero talentos (não invalida o save inteiro).
- **Backup antigo importado** com talentos do modelo antigo: migração acima.

**Testes de integridade dos dados** (`talentTrees.test.ts`, lendo o JSON):
1. 62 árvores: 1 Squire + 15 Tier 1 + 46 Tier 2; IDs únicos; toda subclasse aponta para uma classe existente.
2. Todo nó (exceto a Origem) tem ≥ 1 pai, e todos os pais estão em linha inferior; toda a grade é alcançável a partir da Origem.
3. Todo código de efeito existe em `effects`; `t_*` e `e_*` nunca referem proficiência **bloqueada** para a classe da árvore.
4. Contagem por tipo (T1: 47 Minors, 10 Notables, 4 Majors, 1 Keystone; T2: 29, 4, 2, 1; T0: 14, 1, 1, 0) e `totalCost` iguais aos do JSON.
5. `unlockPoints` recalculado por um solver no teste confere com o JSON.
6. Compras: comprar um Major sem 2 pais em 5 falha; comprar acima do `rowGate` falha; respec devolve exatamente os pontos gastos.
7. `talentTotals` para um conjunto conhecido de ranks bate com a soma manual.

---

## C. Visão geral das grades

| Grade | Nós | Minors | Notables | Majors | Keystone | Custo total |
|---|---|---|---|---|---|---|
| Squire | 17 | 14 | 1 | 1 | 0 | 84 |
| Cada classe Tier 1 (×15) | 63 | 47 | 10 | 4 | 1 | 638 |
| Cada subclasse Tier 2 (×46) | 37 | 29 | 4 | 2 | 1 | 416 |

Total: **62 grades · 2.664 nós**.

Layout (colunas 0–6, linha 0 = Origem): ramo A à esquerda (x 0–2), ramo B à direita (x 4–6), centro (x 3) com os nós de **treino de proficiência** e utilidade; Majors nas linhas 6 e 10 (T1) ou 4 (T2); Keystone no topo. Veja `preview-guerreiro.png` e `preview-piromante.png`.

---

## D. Catálogo das grades

### D0. Squire (Tier 0)

### Squire

- **Ramo A — Treino Marcial** (esquerda): dano corpo a corpo, dano à distância, chance de crítico, velocidade de ataque.
- **Ramo B — Resistência** (direita): HP máximo, defesa, resistência, mana máxima.
- **Centro** (treino e utilidade): tries em Melee, tries em Ranged.
- **Notables** (×2,5 por rank): Sabedoria de Batalha (linha 2, coluna 3: +3,75% XP ganho por rank).
- **Major — Determinação do Escudeiro** (8 pts · linha 4, coluna 3): +20% HP máximo, +15% defesa, +15% dano corpo a corpo. *Conclui o treino básico: bônus permanentes de HP, defesa e dano corpo a corpo.*

### D1. Classes (Tier 1)

### Guerreiro (Tier 1)

- **Ramo A — Lâmina** (esquerda): dano corpo a corpo, velocidade de ataque, chance de crítico, dano crítico, dano em área, dano contra chefes e elites, dano contra alvos abaixo de 30% de HP, tries em Melee.
- **Ramo B — Couraça** (direita): HP máximo, defesa, resistência, cura recebida, peso de aggro, espinhos (dano refletido), eficácia das poções, tries em Defesa.
- **Centro** (treino e utilidade): tries em Melee, tries em Defesa, tries em Físico, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Disciplina de Melee (linha 2, coluna 3: +5% de tries em Melee por rank); Mestre das Armas (linha 4, coluna 0: +3,75% dano corpo a corpo por rank); Muralha (linha 4, coluna 6: +5% defesa por rank); Frenesi (linha 5, coluna 1: +2,5% velocidade de ataque por rank); Coração de Ferro (linha 5, coluna 5: +5% HP máximo por rank); Golpe Devastador (linha 7, coluna 2: +7,5% dano crítico por rank); Resistência Ancestral (linha 7, coluna 4: +1,5% resistência por rank); Carrasco (linha 9, coluna 0: +5% dano contra alvos abaixo de 30% de HP por rank); Voz do Comando (linha 9, coluna 6: +7,5% de peso de aggro por rank); Sabedoria de Batalha (linha 11, coluna 3: +3,75% XP ganho por rank).
- **Major — Fúria Marcial** (12 pts · linha 6, coluna 1): +30% dano corpo a corpo, +8% chance de crítico, +15% velocidade de ataque. *Ataques corpo a corpo golpeiam com fúria crescente.*
- **Major — Inabalável** (12 pts · linha 6, coluna 5): +35% HP máximo, +20% defesa. *Abaixo de 40% de HP, recebe −15% de dano.*
- **Major — Golpe Devastador** (12 pts · linha 10, coluna 2): +60% dano crítico, +25% dano contra chefes e elites. *Críticos causam dano devastador; +25% contra chefes.*
- **Major — Postura de Ferro** (12 pts · linha 10, coluna 4): +12% resistência, +25% de peso de aggro. *Como Tanque, recebe 75% dos golpes e −10% de dano recebido.*
- **Keystone — Lenda do Campo de Batalha** (20 pts): +40% dano corpo a corpo, +40% HP máximo, +25% defesa, +4% roubo de vida. *A cada 10 golpes sem sofrer dano: +10% de dano por 8 s (acumula até 3×).*

### Guardião (Tier 1)

- **Ramo A — Bastião** (esquerda): defesa, HP máximo, resistência, força de escudos, peso de aggro, espinhos (dano refletido), cura recebida, tries em Defesa.
- **Ramo B — Retaliação** (direita): espinhos (dano refletido), roubo de vida, dano Sagrado, dano de Morte, dano corpo a corpo, velocidade de ataque, chance de crítico, tries em Melee.
- **Centro** (treino e utilidade): tries em Defesa, tries em Melee, tries em Sagrado, tries em Morte, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Disciplina de Defesa (linha 2, coluna 3: +5% de tries em Defesa por rank); Muralha (linha 4, coluna 0: +5% defesa por rank); Coroa de Espinhos (linha 4, coluna 6: +3,75% espinhos (dano refletido) por rank); Coração de Ferro (linha 5, coluna 1: +5% HP máximo por rank); Vampirismo (linha 5, coluna 5: +1% roubo de vida por rank); Resistência Ancestral (linha 7, coluna 2: +1,5% resistência por rank); Domínio Sagrado (linha 7, coluna 4: +3,75% dano Sagrado por rank); Voz do Comando (linha 9, coluna 0: +7,5% de peso de aggro por rank); Domínio da Morte (linha 9, coluna 6: +3,75% dano de Morte por rank); Sorte do Saqueador (linha 11, coluna 3: +3,75% chance de drop por rank).
- **Major — Muralha Viva** (12 pts · linha 6, coluna 1): +40% defesa, +25% de peso de aggro. *Como Tanque, recebe 75% dos golpes (em vez de 65%).*
- **Major — Contra-Golpe** (12 pts · linha 6, coluna 5): +30% espinhos (dano refletido), +15% dano corpo a corpo. *20% de chance de devolver 100% do golpe ao atacante.*
- **Major — Bastião Inquebrável** (12 pts · linha 10, coluna 2): +40% HP máximo, +12% resistência. *Ao chegar a 30% de HP, ganha escudo de 25% do HP máx. (1× por wave).*
- **Major — Vingança Sagrada** (12 pts · linha 10, coluna 4): +30% dano Sagrado, +5% roubo de vida. *Dano Sagrado cura o aliado com menos HP.*
- **Keystone — Baluarte Eterno** (20 pts): +50% HP máximo, +30% defesa, +15% resistência. *Aliados da linha de trás recebem −15% de dano enquanto o Guardião estiver vivo.*

### Ladino (Tier 1)

- **Ramo A — Lâmina Rápida** (esquerda): velocidade de ataque, chance de crítico, dano crítico, dano corpo a corpo, dano contra alvos abaixo de 30% de HP, dano contra chefes e elites, dano contínuo, tries em Melee.
- **Ramo B — Sombra** (direita): redução de aggro, HP máximo, resistência, dano contra alvos abaixo de 30% de HP, dano contínuo, dano de Veneno, dano de Morte, tries em Morte.
- **Centro** (treino e utilidade): tries em Melee, tries em Morte, tries em Veneno, tries em Físico, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Disciplina de Melee (linha 2, coluna 3: +5% de tries em Melee por rank); Frenesi (linha 4, coluna 0: +2,5% velocidade de ataque por rank); Manto das Sombras (linha 4, coluna 6: −7,5% de aggro por rank); Instinto Assassino (linha 5, coluna 1: +1,25% chance de crítico por rank); Sofrimento Prolongado (linha 5, coluna 5: +5% dano contínuo por rank); Golpe Devastador (linha 7, coluna 2: +7,5% dano crítico por rank); Domínio do Veneno (linha 7, coluna 4: +3,75% dano de Veneno por rank); Carrasco (linha 9, coluna 0: +5% dano contra alvos abaixo de 30% de HP por rank); Domínio da Morte (linha 9, coluna 6: +3,75% dano de Morte por rank); Toque de Midas (linha 11, coluna 3: +3,75% ouro ganho por rank).
- **Major — Dança das Lâminas** (12 pts · linha 6, coluna 1): +25% velocidade de ataque, +10% chance de crítico. *Todo 5º ataque é crítico garantido.*
- **Major — Passos de Sombra** (12 pts · linha 6, coluna 5): −30% de aggro, +8% resistência. *Após abater um monstro, o Ladino some do radar por 2 s.*
- **Major — Golpe Traiçoeiro** (12 pts · linha 10, coluna 2): +70% dano crítico, +25% dano contra alvos abaixo de 30% de HP. *Alvos abaixo de 30% de HP recebem +25% de dano extra.*
- **Major — Veneno Letal** (12 pts · linha 10, coluna 4): +40% dano contínuo, +25% dano de Veneno. *Ataques aplicam veneno cumulativo.*
- **Keystone — Mestre Assassino** (20 pts): +15% chance de crítico, +80% dano crítico, +20% velocidade de ataque. *O primeiro golpe em cada monstro é crítico com dano ×2.*

### Caçador (Tier 1)

- **Ramo A — Precisão** (esquerda): dano à distância, chance de crítico, dano crítico, velocidade de ataque, dano contra chefes e elites, dano contra alvos abaixo de 30% de HP, dano em área, tries em Ranged.
- **Ramo B — Caçada** (direita): HP máximo, defesa, resistência, XP ganho, chance de drop, dano contra chefes e elites, tries em Terra, dano de Terra.
- **Centro** (treino e utilidade): tries em Ranged, tries em Terra, tries em Físico, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Disciplina de Ranged (linha 2, coluna 3: +5% de tries em Ranged por rank); Mestre do Arco (linha 4, coluna 0: +3,75% dano à distância por rank); Sabedoria de Batalha (linha 4, coluna 6: +3,75% XP ganho por rank); Instinto Assassino (linha 5, coluna 1: +1,25% chance de crítico por rank); Sorte do Saqueador (linha 5, coluna 5: +3,75% chance de drop por rank); Golpe Devastador (linha 7, coluna 2: +7,5% dano crítico por rank); Matador de Gigantes (linha 7, coluna 4: +3,75% dano contra chefes e elites por rank); Frenesi (linha 9, coluna 0: +2,5% velocidade de ataque por rank); Coração de Ferro (linha 9, coluna 6: +5% HP máximo por rank); Toque de Midas (linha 11, coluna 3: +3,75% ouro ganho por rank).
- **Major — Tiro Letal** (12 pts · linha 6, coluna 1): +12% chance de crítico, +60% dano crítico. *Críticos à distância atravessam a armadura.*
- **Major — Marca do Caçador** (12 pts · linha 6, coluna 5): +35% dano contra chefes e elites, +15% XP ganho. *O primeiro alvo de cada wave recebe +25% de dano de toda a equipe.*
- **Major — Chuva de Flechas Perfeita** (12 pts · linha 10, coluna 2): +40% dano em área, +15% velocidade de ataque. *A cada 8 disparos, uma salva atinge todos os inimigos.*
- **Major — Instinto Selvagem** (12 pts · linha 10, coluna 4): +30% HP máximo, +20% chance de drop, +25% dano de Terra. *Recupera 2% do HP máx. por abate.*
- **Keystone — Predador Supremo** (20 pts): +40% dano à distância, +15% chance de crítico, +30% dano contra chefes e elites. *Abater um monstro reinicia 30% da recarga de todas as magias.*

### Mago (Tier 1)

- **Ramo A — Poder Arcano** (esquerda): dano mágico, redução de recarga, mana máxima, regeneração de mana, chance de crítico, dano crítico, dano em área, dano contra chefes e elites.
- **Ramo B — Domínio Elemental** (direita): dano do elemento em foco, dano de Fogo, dano de Gelo, dano de Energia, dano de Terra, dano de Veneno, dano Sagrado, dano de Morte, dano Psíquico.
- **Centro** (treino e utilidade): tries em Magia, tries em Fogo, tries em Gelo, tries em Energia, tries em Terra, tries em Veneno, tries em Sagrado, tries em Morte, tries em Psíquico.
- **Notables** (×2,5 por rank): Disciplina de Magia (linha 2, coluna 3: +5% de tries em Magia por rank); Sabedoria Arcana (linha 4, coluna 0: +3,75% dano mágico por rank); Maestria do Foco (linha 4, coluna 6: +3,75% dano do elemento em foco por rank); Mestre do Tempo (linha 5, coluna 1: −2,5% de recarga por rank); Maestria do Foco (linha 5, coluna 5: +3,75% dano do elemento em foco por rank); Poço de Mana (linha 7, coluna 2: +5% mana máxima por rank); Disciplina do Foco (linha 7, coluna 4: +5% de tries no elemento em foco por rank); Instinto Assassino (linha 9, coluna 0: +1,25% chance de crítico por rank); Domínio da Mente (linha 9, coluna 6: +3,75% dano Psíquico por rank); Disciplina do Foco (linha 11, coluna 3: +5% de tries no elemento em foco por rank).
- **Major — Arquimago** (12 pts · linha 6, coluna 1): −20% de recarga, +25% dano mágico. *Magias custam −10% de mana.*
- **Major — Convergência** (12 pts · linha 6, coluna 5): +40% dano do elemento em foco. *+10% de dano nas demais magias elementais equipadas.*
- **Major — Reserva Infinita** (12 pts · linha 10, coluna 2): +50% mana máxima, +40% regeneração de mana. *Ao ficar sem mana, recupera 30% dela (1× por wave).*
- **Major — Sintonia Perfeita** (12 pts · linha 10, coluna 4): +40% de tries no elemento em foco, +20% dano do elemento em foco. *O treino do elemento em foco rende +40% de tries.*
- **Keystone — Ascensão Arcana** (20 pts): +45% dano mágico, −20% de recarga, +40% mana máxima. *Magias do elemento em foco têm 15% de chance de não gastar mana nem entrar em recarga.*

### Clérigo (Tier 1)

- **Ramo A — Cura** (esquerda): poder de cura, cura recebida, regeneração de mana, redução de recarga, mana máxima, eficácia das poções, potência dos buffs, tries em Sagrado.
- **Ramo B — Proteção** (direita): força de escudos, defesa, HP máximo, resistência, dano Sagrado, potência dos buffs, redução de aggro, tries em Defesa.
- **Centro** (treino e utilidade): tries em Sagrado, tries em Magia, tries em Defesa, XP ganho, ouro ganho, valor de venda.
- **Notables** (×2,5 por rank): Disciplina de Sagrado (linha 2, coluna 3: +5% de tries em Sagrado por rank); Fonte de Vida (linha 4, coluna 0: +5% poder de cura por rank); Fortaleza Arcana (linha 4, coluna 6: +5% força de escudos por rank); Fonte Interior (linha 5, coluna 1: +10% regeneração de mana por rank); Resistência Ancestral (linha 5, coluna 5: +1,5% resistência por rank); Mestre do Tempo (linha 7, coluna 2: −2,5% de recarga por rank); Domínio Sagrado (linha 7, coluna 4: +3,75% dano Sagrado por rank); Poço de Mana (linha 9, coluna 0: +5% mana máxima por rank); Coração de Ferro (linha 9, coluna 6: +5% HP máximo por rank); Sabedoria de Batalha (linha 11, coluna 3: +3,75% XP ganho por rank).
- **Major — Milagre** (12 pts · linha 6, coluna 1): +40% poder de cura, −10% de recarga. *Cura de alvo único cura também 40% no 2º aliado mais ferido.*
- **Major — Bênção Duradoura** (12 pts · linha 6, coluna 5): +40% força de escudos, +10% resistência. *Aliados abaixo de 30% de HP recebem −20% de dano.*
- **Major — Fé Inabalável** (12 pts · linha 10, coluna 2): +30% cura recebida, +40% regeneração de mana. *Curas excedentes viram escudo (até 20% do HP do alvo).*
- **Major — Ira Divina** (12 pts · linha 10, coluna 4): +40% dano Sagrado, +8% chance de crítico. *Dano Sagrado crítico cura o aliado com menos HP.*
- **Keystone — Avatar da Luz** (20 pts): +50% poder de cura, +40% dano Sagrado, +15% resistência. *Uma vez por wave, revive um aliado derrotado com 40% de HP.*

### Bardo (Tier 1)

- **Ramo A — Canção** (esquerda): duração dos buffs, potência dos buffs, redução de recarga, regeneração de mana, mana máxima, dano mágico, poder de cura, tries em Magia.
- **Ramo B — Mente** (direita): dano Psíquico, duração de controle, XP ganho, ouro ganho, tries em Psíquico, dano Sagrado, tries em Sagrado, redução de aggro.
- **Centro** (treino e utilidade): tries em Magia, tries em Psíquico, tries em Sagrado, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Disciplina de Magia (linha 2, coluna 3: +5% de tries em Magia por rank); Canção Eterna (linha 4, coluna 0: +7,5% duração dos buffs por rank); Domínio da Mente (linha 4, coluna 6: +3,75% dano Psíquico por rank); Sinfonia (linha 5, coluna 1: +3,75% potência dos buffs por rank); Domínio da Vontade (linha 5, coluna 5: +7,5% duração de controle por rank); Mestre do Tempo (linha 7, coluna 2: −2,5% de recarga por rank); Disciplina de Psíquico (linha 7, coluna 4: +5% de tries em Psíquico por rank); Fonte Interior (linha 9, coluna 0: +10% regeneração de mana por rank); Sabedoria de Batalha (linha 9, coluna 6: +3,75% XP ganho por rank); Toque de Midas (linha 11, coluna 3: +3,75% ouro ganho por rank).
- **Major — Hino de Guerra** (12 pts · linha 6, coluna 1): +30% potência dos buffs, +40% duração dos buffs. *Buffs de ataque e defesa afetam toda a equipe.*
- **Major — Finale** (12 pts · linha 6, coluna 5): +25% potência dos buffs, +15% velocidade de ataque. *A cada 30 s, a equipe ganha +30% de ataque e velocidade por 6 s.*
- **Major — Crescendo Eterno** (12 pts · linha 10, coluna 2): −20% de recarga, +40% regeneração de mana. *Buffs ativos reduzem a recarga das magias da equipe em 10%.*
- **Major — Voz Cativante** (12 pts · linha 10, coluna 4): +25% XP ganho, +25% ouro ganho, +30% duração de controle. *Monstros têm 10% de chance de errar o primeiro ataque.*
- **Keystone — Maestro Supremo** (20 pts): +40% potência dos buffs, +50% duração dos buffs, −15% de recarga. *Uma vez por wave, a equipe ganha todos os buffs ativos do Bardo por 8 s.*

### Monge (Tier 1)

- **Ramo A — Punho** (esquerda): velocidade de ataque, dano corpo a corpo, chance de crítico, dano crítico, roubo de vida, dano contra alvos abaixo de 30% de HP, dano Físico (magia), tries em Físico.
- **Ramo B — Chi** (direita): HP máximo, defesa, regeneração de mana, mana máxima, resistência, poder de cura, eficácia das poções, tries em Defesa.
- **Centro** (treino e utilidade): tries em Físico, tries em Melee, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Disciplina de Físico (linha 2, coluna 3: +5% de tries em Físico por rank); Frenesi (linha 4, coluna 0: +2,5% velocidade de ataque por rank); Coração de Ferro (linha 4, coluna 6: +5% HP máximo por rank); Mestre das Armas (linha 5, coluna 1: +3,75% dano corpo a corpo por rank); Fonte Interior (linha 5, coluna 5: +10% regeneração de mana por rank); Instinto Assassino (linha 7, coluna 2: +1,25% chance de crítico por rank); Muralha (linha 7, coluna 4: +5% defesa por rank); Domínio do Impacto (linha 9, coluna 0: +3,75% dano Físico (magia) por rank); Resistência Ancestral (linha 9, coluna 6: +1,5% resistência por rank); Disciplina de Melee (linha 11, coluna 3: +5% de tries em Melee por rank).
- **Major — Mil Punhos** (12 pts · linha 6, coluna 1): +30% velocidade de ataque, +6% chance de crítico. *10% de chance de atacar de novo.*
- **Major — Corpo e Espírito** (12 pts · linha 6, coluna 5): +6% roubo de vida, +20% dano mágico. *Combos completos restauram mana.*
- **Major — Chi Explosivo** (12 pts · linha 10, coluna 2): +35% dano Físico (magia), +40% dano crítico. *A cada 5 golpes, uma onda de chi atinge todos os inimigos.*
- **Major — Meditação Profunda** (12 pts · linha 10, coluna 4): +40% HP máximo, +60% regeneração de mana, +10% resistência. *Sem sofrer dano por 5 s: recupera 1% de HP por segundo.*
- **Keystone — Punho do Dragão** (20 pts): +40% dano corpo a corpo, +20% velocidade de ataque, +30% dano Físico (magia). *Combos de 10 golpes liberam um Punho do Dragão (300% do dano).*

### Bruxo (Tier 1)

- **Ramo A — Maldição** (esquerda): dano contínuo, dano de Morte, dano mágico, redução de recarga, dano crítico, dano contra alvos abaixo de 30% de HP, dano contra chefes e elites, tries em Morte.
- **Ramo B — Pacto** (direita): roubo de vida, mana máxima, HP máximo, resistência, dano de Veneno, regeneração de mana, redução de aggro, eficácia das poções.
- **Centro** (treino e utilidade): tries em Morte, tries em Veneno, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Disciplina de Morte (linha 2, coluna 3: +5% de tries em Morte por rank); Sofrimento Prolongado (linha 4, coluna 0: +5% dano contínuo por rank); Vampirismo (linha 4, coluna 6: +1% roubo de vida por rank); Domínio da Morte (linha 5, coluna 1: +3,75% dano de Morte por rank); Poço de Mana (linha 5, coluna 5: +5% mana máxima por rank); Mestre do Tempo (linha 7, coluna 2: −2,5% de recarga por rank); Domínio do Veneno (linha 7, coluna 4: +3,75% dano de Veneno por rank); Carrasco (linha 9, coluna 0: +5% dano contra alvos abaixo de 30% de HP por rank); Resistência Ancestral (linha 9, coluna 6: +1,5% resistência por rank); Disciplina de Veneno (linha 11, coluna 3: +5% de tries em Veneno por rank).
- **Major — Maldição Ancestral** (12 pts · linha 6, coluna 1): +50% dano contínuo, +25% dano de Morte. *Efeitos contínuos duram +30%.*
- **Major — Pacto de Sangue** (12 pts · linha 6, coluna 5): +8% roubo de vida, +25% HP máximo. *Cura 20% mais ao roubar vida de alvos amaldiçoados.*
- **Major — Colheita de Almas** (12 pts · linha 10, coluna 2): +35% dano de Morte, +25% dano contra chefes e elites. *Abates restauram 5% de mana.*
- **Major — Pacto Sombrio** (12 pts · linha 10, coluna 4): +40% mana máxima, +50% regeneração de mana. *Dano de Morte cura 10% do dano causado e restaura mana.*
- **Keystone — Senhor das Maldições** (20 pts): +60% dano contínuo, +40% dano de Morte, −15% de recarga. *Maldições se espalham para 1 alvo adjacente ao expirar.*

### Alquimista (Tier 1)

- **Ramo A — Bombas** (esquerda): dano à distância, dano em área, dano de Veneno, dano de Fogo, dano contínuo, chance de crítico, dano crítico, tries em Veneno.
- **Ramo B — Poções** (direita): eficácia das poções, regeneração de mana, HP máximo, defesa, poder de cura, cura recebida, redução de recarga, ouro ganho.
- **Centro** (treino e utilidade): tries em Veneno, tries em Ranged, tries em Fogo, XP ganho, ouro ganho, valor de venda.
- **Notables** (×2,5 por rank): Disciplina de Veneno (linha 2, coluna 3: +5% de tries em Veneno por rank); Devastação em Área (linha 4, coluna 0: +3,75% dano em área por rank); Alquimia Avançada (linha 4, coluna 6: +7,5% eficácia das poções por rank); Domínio do Veneno (linha 5, coluna 1: +3,75% dano de Veneno por rank); Coração de Ferro (linha 5, coluna 5: +5% HP máximo por rank); Mestre do Arco (linha 7, coluna 2: +3,75% dano à distância por rank); Fonte de Vida (linha 7, coluna 4: +5% poder de cura por rank); Domínio do Fogo (linha 9, coluna 0: +3,75% dano de Fogo por rank); Mestre do Tempo (linha 9, coluna 6: −2,5% de recarga por rank); Comerciante Astuto (linha 11, coluna 3: +3,75% valor de venda por rank).
- **Major — Explosão em Cadeia** (12 pts · linha 6, coluna 1): +40% dano em área, +25% dano de Fogo. *15% de chance de o acerto em área explodir de novo.*
- **Major — Panaceia** (12 pts · linha 6, coluna 5): +50% eficácia das poções, +25% poder de cura. *Poções repassam 25% do efeito aos aliados.*
- **Major — Ácido Corrosivo** (12 pts · linha 10, coluna 2): +40% dano de Veneno, +30% dano contínuo. *Alvos envenenados têm −10% de defesa.*
- **Major — Frasco Infinito** (12 pts · linha 10, coluna 4): −20% de recarga, +40% regeneração de mana, +20% ouro ganho. *Poções têm 15% de chance de não serem consumidas.*
- **Keystone — Grande Obra** (20 pts): +60% eficácia das poções, +40% dano de Veneno, +30% dano em área. *Uma vez por wave, transmuta o inimigo mais forte (−30% de HP, +100% de ouro).*

### Mercenário (Tier 1)

- **Ramo A — Combate** (esquerda): dano corpo a corpo, chance de crítico, dano crítico, dano contra chefes e elites, dano contra alvos abaixo de 30% de HP, velocidade de ataque, HP máximo, tries em Melee.
- **Ramo B — Contrato** (direita): ouro ganho, chance de drop, valor de venda, XP ganho, defesa, HP máximo, eficácia das poções, tries em Defesa.
- **Centro** (treino e utilidade): tries em Melee, tries em Defesa, tries em Físico, ouro ganho, chance de drop, valor de venda.
- **Notables** (×2,5 por rank): Disciplina de Melee (linha 2, coluna 3: +5% de tries em Melee por rank); Mestre das Armas (linha 4, coluna 0: +3,75% dano corpo a corpo por rank); Toque de Midas (linha 4, coluna 6: +3,75% ouro ganho por rank); Matador de Gigantes (linha 5, coluna 1: +3,75% dano contra chefes e elites por rank); Sorte do Saqueador (linha 5, coluna 5: +3,75% chance de drop por rank); Golpe Devastador (linha 7, coluna 2: +7,5% dano crítico por rank); Comerciante Astuto (linha 7, coluna 4: +3,75% valor de venda por rank); Carrasco (linha 9, coluna 0: +5% dano contra alvos abaixo de 30% de HP por rank); Sabedoria de Batalha (linha 9, coluna 6: +3,75% XP ganho por rank); Toque de Midas (linha 11, coluna 3: +3,75% ouro ganho por rank).
- **Major — Executor de Contratos** (12 pts · linha 6, coluna 1): +40% dano contra chefes e elites, +20% dano corpo a corpo. *Chefes e elites recebem +25% de dano extra.*
- **Major — Rei do Ouro** (12 pts · linha 6, coluna 5): +40% ouro ganho, +15% chance de drop. *Cada 1.000 de ouro ganho concede +0,5% de dano (até 25%).*
- **Major — Golpe Pesado** (12 pts · linha 10, coluna 2): +35% dano corpo a corpo, +40% dano crítico. *Ataques contra alvos com HP cheio causam +20%.*
- **Major — Butim Farto** (12 pts · linha 10, coluna 4): +30% chance de drop, +30% valor de venda, +15% XP ganho. *Chefes sempre deixam um item extra.*
- **Keystone — Lenda Mercenária** (20 pts): +50% ouro ganho, +40% dano contra chefes e elites, +25% dano corpo a corpo. *Abater um chefe paga um bônus de ouro igual a 10 abates comuns.*

### Mestre Rúnico (Tier 1)

- **Ramo A — Guerra** (esquerda): dano corpo a corpo, dano mágico, velocidade de ataque, chance de crítico, dano crítico, dano de Fogo, dano de Energia, tries em Melee.
- **Ramo B — Proteção** (direita): defesa, força de escudos, HP máximo, resistência, mana máxima, regeneração de mana, redução de recarga, tries em Defesa.
- **Centro** (treino e utilidade): tries em Magia, tries em Melee, tries em Defesa, tries em Fogo, tries em Energia, XP ganho.
- **Notables** (×2,5 por rank): Disciplina de Magia (linha 2, coluna 3: +5% de tries em Magia por rank); Mestre das Armas (linha 4, coluna 0: +3,75% dano corpo a corpo por rank); Fortaleza Arcana (linha 4, coluna 6: +5% força de escudos por rank); Sabedoria Arcana (linha 5, coluna 1: +3,75% dano mágico por rank); Muralha (linha 5, coluna 5: +5% defesa por rank); Frenesi (linha 7, coluna 2: +2,5% velocidade de ataque por rank); Poço de Mana (linha 7, coluna 4: +5% mana máxima por rank); Domínio do Fogo (linha 9, coluna 0: +3,75% dano de Fogo por rank); Resistência Ancestral (linha 9, coluna 6: +1,5% resistência por rank); Disciplina de Energia (linha 11, coluna 3: +5% de tries em Energia por rank).
- **Major — Arma Encantada** (12 pts · linha 6, coluna 1): +35% dano mágico, +25% dano corpo a corpo. *Ataques básicos causam +30% do poder mágico como dano elemental.*
- **Major — Glifo Supremo** (12 pts · linha 6, coluna 5): +40% força de escudos, +25% defesa. *Uma vez por wave, um golpe fatal deixa o portador com 20% de HP.*
- **Major — Runa Ardente** (12 pts · linha 10, coluna 2): +30% dano de Fogo, +30% dano de Energia. *Ataques têm 10% de chance de liberar uma explosão rúnica.*
- **Major — Barreira Rúnica** (12 pts · linha 10, coluna 4): +15% resistência, +30% HP máximo, +30% mana máxima. *Barreiras absorvem o primeiro golpe de cada wave.*
- **Keystone — Grande Runa** (20 pts): +40% dano mágico, +30% dano corpo a corpo, +30% força de escudos. *A cada 10 s, uma runa concede +20% de dano e −10% de dano recebido por 6 s.*

### Ilusionista (Tier 1)

- **Ramo A — Ilusão** (esquerda): dano Psíquico, duração de controle, redução de aggro, dano mágico, redução de recarga, chance de crítico, dano contra alvos abaixo de 30% de HP, tries em Psíquico.
- **Ramo B — Mente** (direita): mana máxima, regeneração de mana, resistência, HP máximo, defesa, dano de Energia, tries em Magia, XP ganho.
- **Centro** (treino e utilidade): tries em Psíquico, tries em Magia, tries em Energia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Disciplina de Psíquico (linha 2, coluna 3: +5% de tries em Psíquico por rank); Domínio da Mente (linha 4, coluna 0: +3,75% dano Psíquico por rank); Poço de Mana (linha 4, coluna 6: +5% mana máxima por rank); Domínio da Vontade (linha 5, coluna 1: +7,5% duração de controle por rank); Fonte Interior (linha 5, coluna 5: +10% regeneração de mana por rank); Mestre do Tempo (linha 7, coluna 2: −2,5% de recarga por rank); Resistência Ancestral (linha 7, coluna 4: +1,5% resistência por rank); Sabedoria Arcana (linha 9, coluna 0: +3,75% dano mágico por rank); Coração de Ferro (linha 9, coluna 6: +5% HP máximo por rank); Disciplina de Magia (linha 11, coluna 3: +5% de tries em Magia por rank).
- **Major — Mestre das Ilusões** (12 pts · linha 6, coluna 1): +50% duração de controle, +25% dano Psíquico. *15% de chance de o controle afetar +1 alvo.*
- **Major — Domínio Mental** (12 pts · linha 6, coluna 5): −20% de recarga, +25% dano Psíquico. *Controlar um alvo restaura 3% de mana.*
- **Major — Espelhos** (12 pts · linha 10, coluna 2): −40% de aggro, +20% defesa. *Após 10 s sem ser atingido, o próximo golpe é evitado.*
- **Major — Véu da Mente** (12 pts · linha 10, coluna 4): +15% resistência, +40% mana máxima, +40% regeneração de mana. *Efeitos de controle sofridos duram −30%.*
- **Keystone — Grande Ilusão** (20 pts): +45% dano Psíquico, +60% duração de controle, −15% de recarga. *Monstros controlados atacam os próprios aliados.*

### Druida (Tier 1)

- **Ramo A — Natureza** (esquerda): dano de Terra, poder de cura, cura recebida, HP máximo, dano mágico, redução de recarga, regeneração de mana, tries em Terra.
- **Ramo B — Adaptação** (direita): dano corpo a corpo, velocidade de ataque, defesa, resistência, roubo de vida, chance de crítico, dano de Veneno, tries em Melee.
- **Centro** (treino e utilidade): tries em Terra, tries em Melee, tries em Magia, tries em Veneno, XP ganho, chance de drop.
- **Notables** (×2,5 por rank): Disciplina de Terra (linha 2, coluna 3: +5% de tries em Terra por rank); Domínio da Terra (linha 4, coluna 0: +3,75% dano de Terra por rank); Mestre das Armas (linha 4, coluna 6: +3,75% dano corpo a corpo por rank); Fonte de Vida (linha 5, coluna 1: +5% poder de cura por rank); Frenesi (linha 5, coluna 5: +2,5% velocidade de ataque por rank); Renovação (linha 7, coluna 2: +5% cura recebida por rank); Muralha (linha 7, coluna 4: +5% defesa por rank); Coração de Ferro (linha 9, coluna 0: +5% HP máximo por rank); Vampirismo (linha 9, coluna 6: +1% roubo de vida por rank); Disciplina de Magia (linha 11, coluna 3: +5% de tries em Magia por rank).
- **Major — Coração da Floresta** (12 pts · linha 6, coluna 1): +40% poder de cura, +30% cura recebida. *A regeneração da equipe rende +50%; magias de Terra curam 10% do dano.*
- **Major — Forma Selvagem** (12 pts · linha 6, coluna 5): +25% dano corpo a corpo, +25% dano mágico. *+25% de dano corpo a corpo e +25% de poder mágico ao mesmo tempo.*
- **Major — Fúria da Terra** (12 pts · linha 10, coluna 2): +40% dano de Terra, +25% dano em área. *Magias de Terra têm 15% de chance de enraizar por 1,5 s.*
- **Major — Pele de Casca** (12 pts · linha 10, coluna 4): +30% defesa, +12% resistência, +5% roubo de vida. *Ao cair abaixo de 40% de HP, regenera 3% por segundo por 5 s.*
- **Keystone — Avatar da Natureza** (20 pts): +40% dano de Terra, +40% poder de cura, +40% HP máximo. *Uma vez por wave, uma explosão de vida cura toda a equipe em 25% do HP.*

### Artilheiro (Tier 1)

- **Ramo A — Balística** (esquerda): dano à distância, velocidade de ataque, chance de crítico, dano em área, dano crítico, dano contra chefes e elites, dano de Fogo, tries em Ranged.
- **Ramo B — Engenharia** (direita): defesa, HP máximo, mana máxima, dano de Energia, ouro ganho, valor de venda, redução de recarga, tries em Energia.
- **Centro** (treino e utilidade): tries em Ranged, tries em Energia, tries em Defesa, tries em Fogo, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Disciplina de Ranged (linha 2, coluna 3: +5% de tries em Ranged por rank); Mestre do Arco (linha 4, coluna 0: +3,75% dano à distância por rank); Muralha (linha 4, coluna 6: +5% defesa por rank); Frenesi (linha 5, coluna 1: +2,5% velocidade de ataque por rank); Coração de Ferro (linha 5, coluna 5: +5% HP máximo por rank); Devastação em Área (linha 7, coluna 2: +3,75% dano em área por rank); Domínio da Energia (linha 7, coluna 4: +3,75% dano de Energia por rank); Instinto Assassino (linha 9, coluna 0: +1,25% chance de crítico por rank); Toque de Midas (linha 9, coluna 6: +3,75% ouro ganho por rank); Disciplina de Energia (linha 11, coluna 3: +5% de tries em Energia por rank).
- **Major — Saraivada** (12 pts · linha 6, coluna 1): +40% dano em área, +20% velocidade de ataque. *A cada 6 ataques, uma salva atinge todos os inimigos com 80% do dano.*
- **Major — Blindagem** (12 pts · linha 6, coluna 5): +35% defesa, +30% HP máximo. *Mísseis de proteção reduzem em 10% o dano da linha de trás.*
- **Major — Munição Explosiva** (12 pts · linha 10, coluna 2): +30% dano de Fogo, +50% dano crítico. *Críticos causam uma explosão de fogo em área.*
- **Major — Torre Automática** (12 pts · linha 10, coluna 4): +30% dano de Energia, +20% dano à distância. *Uma torreta ataca junto com a equipe (30% do dano do Artilheiro).*
- **Keystone — Arsenal Supremo** (20 pts): +45% dano à distância, +35% dano em área, +20% velocidade de ataque. *A cada 20 s, uma barragem de mísseis atinge todos os inimigos (250% do dano).*

### D2. Subclasses (Tier 2)

#### Mago

### Piromante (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano de Fogo, dano crítico, dano contínuo, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Fogo, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio do Fogo (linha 2, coluna 3: +4,69% dano de Fogo por rank); Disciplina de Fogo (linha 5, coluna 2: +6,25% de tries em Fogo por rank); Sofrimento Prolongado (linha 5, coluna 4: +6,25% dano contínuo por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Combustão Acumulativa** (18 pts · linha 4, coluna 2): +50% dano contínuo, +30% dano de Fogo. *Acertos de fogo aplicam Combustão (até 5 acúmulos).*
- **Major — Inferno Devorador** (18 pts · linha 4, coluna 4): +40% dano em área, +30% dano de Fogo. *Magias de fogo em área aplicam 2 acúmulos de Combustão.*
- **Keystone — Avatar do Fogo** (30 pts): +60% dano de Fogo, +12% chance de crítico, +50% dano contínuo. *Combustão explode ao expirar, causando o dano restante de uma vez.*

### Criomante (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano de Gelo, dano crítico, duração de controle, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Gelo, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio do Gelo (linha 2, coluna 3: +4,69% dano de Gelo por rank); Disciplina de Gelo (linha 5, coluna 2: +6,25% de tries em Gelo por rank); Domínio da Vontade (linha 5, coluna 4: +9,38% duração de controle por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Barreira de Gelo** (18 pts · linha 4, coluna 2): +50% força de escudos, +30% HP máximo. *20% do dano de gelo vira barreira temporária (máx. 30% do HP).*
- **Major — Congelamento Profundo** (18 pts · linha 4, coluna 4): +60% duração de controle, +30% dano de Gelo. *Alvos congelados sofrem +20% de dano físico.*
- **Keystone — Avatar do Inverno** (30 pts): +60% dano de Gelo, −20% de recarga, +40% força de escudos. *Uma vez por wave, congela todos os inimigos por 3 s.*

### Eletromante (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano de Energia, dano crítico, dano em área, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Energia, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio da Energia (linha 2, coluna 3: +4,69% dano de Energia por rank); Disciplina de Energia (linha 5, coluna 2: +6,25% de tries em Energia por rank); Devastação em Área (linha 5, coluna 4: +4,69% dano em área por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Cadeia de Relâmpagos** (18 pts · linha 4, coluna 2): +45% dano em área, +30% dano de Energia. *Raios saltam para +2 alvos com 60% do dano.*
- **Major — Sobrecarga** (18 pts · linha 4, coluna 4): +15% chance de crítico, −20% de recarga. *Cada crítico reduz a recarga das magias em 0,5 s.*
- **Keystone — Avatar da Tempestade** (30 pts): +60% dano de Energia, +15% chance de crítico, +60% dano crítico. *Críticos atordoam o alvo por 1,5 s.*

### Geomante (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano de Terra, dano crítico, dano em área, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Terra, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio da Terra (linha 2, coluna 3: +4,69% dano de Terra por rank); Disciplina de Terra (linha 5, coluna 2: +6,25% de tries em Terra por rank); Devastação em Área (linha 5, coluna 4: +4,69% dano em área por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Pele de Pedra** (18 pts · linha 4, coluna 2): +45% defesa, +15% resistência. *Dano recebido é reduzido em proporção ao nível de Terra.*
- **Major — Terremoto** (18 pts · linha 4, coluna 4): +45% dano em área, +30% dano de Terra. *Magias de Terra petrificam os alvos por 1 s.*
- **Keystone — Avatar da Montanha** (30 pts): +60% dano de Terra, +50% HP máximo, +40% defesa. *Imune a atordoamento e recebe −10% de dano.*

### Miasmante (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano de Veneno, dano crítico, dano contínuo, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Veneno, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio do Veneno (linha 2, coluna 3: +4,69% dano de Veneno por rank); Disciplina de Veneno (linha 5, coluna 2: +6,25% de tries em Veneno por rank); Sofrimento Prolongado (linha 5, coluna 4: +6,25% dano contínuo por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Corrosão Sem Limite** (18 pts · linha 4, coluna 2): +60% dano contínuo, +30% dano de Veneno. *O veneno aplicado não tem limite de acúmulo contra chefes.*
- **Major — Armadura Corroída** (18 pts · linha 4, coluna 4): +40% dano contra chefes e elites, +30% dano de Veneno. *Alvos envenenados têm −20% de defesa.*
- **Keystone — Avatar da Peste** (30 pts): +60% dano de Veneno, +70% dano contínuo, −15% de recarga. *O veneno se espalha para alvos próximos.*

### Teurgo (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano Sagrado, dano crítico, poder de cura, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Sagrado, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio Sagrado (linha 2, coluna 3: +4,69% dano Sagrado por rank); Disciplina de Sagrado (linha 5, coluna 2: +6,25% de tries em Sagrado por rank); Fonte de Vida (linha 5, coluna 4: +6,25% poder de cura por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Radiância Curativa** (18 pts · linha 4, coluna 2): +50% poder de cura, +30% dano Sagrado. *15% de todo dano Sagrado cura o aliado com menor HP.*
- **Major — Julgamento** (18 pts · linha 4, coluna 4): +45% dano Sagrado, +12% chance de crítico. *Dano Sagrado causa +50% contra mortos-vivos.*
- **Keystone — Avatar da Luz** (30 pts): +60% dano Sagrado, +50% poder de cura, +20% resistência. *Uma vez por wave, uma explosão de luz cura a equipe em 20% do HP.*

### Lich (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano de Morte, dano crítico, roubo de vida, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Morte, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio da Morte (linha 2, coluna 3: +4,69% dano de Morte por rank); Disciplina de Morte (linha 5, coluna 2: +6,25% de tries em Morte por rank); Vampirismo (linha 5, coluna 4: +1,25% roubo de vida por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Drenagem Massiva** (18 pts · linha 4, coluna 2): +10% roubo de vida, +30% dano de Morte. *Feitiços de Morte drenam vida em área.*
- **Major — Legião dos Mortos** (18 pts · linha 4, coluna 4): +40% dano de Morte, +30% dano contínuo. *Inimigos mortos por feitiços de Morte viram lacaios por 10 s.*
- **Keystone — Avatar da Morte** (30 pts): +60% dano de Morte, +12% roubo de vida, +40% HP máximo. *Ao morrer, retorna com 30% de HP (1× por wave).*

### Cinético (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano Físico (magia), dano crítico, dano em área, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Físico, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio do Impacto (linha 2, coluna 3: +4,69% dano Físico (magia) por rank); Disciplina de Físico (linha 5, coluna 2: +6,25% de tries em Físico por rank); Devastação em Área (linha 5, coluna 4: +4,69% dano em área por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Onda de Choque** (18 pts · linha 4, coluna 2): +45% dano Físico (magia), +30% dano em área. *Repele a horda e causa dano de impacto.*
- **Major — Penetração Cinética** (18 pts · linha 4, coluna 4): +40% dano Físico (magia), +50% dano crítico. *Ignora 30% da resistência mágica natural dos monstros.*
- **Keystone — Avatar da Força** (30 pts): +60% dano Físico (magia), +40% dano em área, +12% chance de crítico. *Impactos empurram os inimigos e reduzem seu ataque em 10%.*

### Psionista (Tier 2, de Mago)

- **Ramo A — Poder** (esquerda): dano Psíquico, dano crítico, duração de controle, chance de crítico, dano mágico.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Psíquico, tries em Magia, dano do elemento em foco, XP ganho, ouro ganho.
- **Notables** (×2,5 por rank): Domínio da Mente (linha 2, coluna 3: +4,69% dano Psíquico por rank); Disciplina de Psíquico (linha 5, coluna 2: +6,25% de tries em Psíquico por rank); Domínio da Vontade (linha 5, coluna 4: +9,38% duração de controle por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Mente Estilhaçada** (18 pts · linha 4, coluna 2): +45% dano Psíquico, +40% duração de controle. *Dano psíquico ignora armadura.*
- **Major — Frenesi** (18 pts · linha 4, coluna 4): +50% duração de controle, +25% dano em área. *Monstros afetados atacam uns aos outros.*
- **Keystone — Avatar da Mente** (30 pts): +60% dano Psíquico, −20% de recarga, +60% duração de controle. *Uma vez por wave, todos os inimigos atacam os próprios aliados por 4 s.*

### Infernalista (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano de Fogo, dano de Morte, dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Fogo, tries em Morte, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio do Fogo (linha 2, coluna 3: +4,69% dano de Fogo por rank); Domínio da Morte (linha 5, coluna 2: +4,69% dano de Morte por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Chamas Negras** (18 pts · linha 4, coluna 2): +35% dano de Fogo, +35% dano de Morte. *Queimadura que drena a vida dos inimigos e cura o Mago.*
- **Major — Ceifador Ígneo** (18 pts · linha 4, coluna 4): +50% dano contínuo, +8% roubo de vida. *Alvos em chamas negras não regeneram vida.*
- **Keystone — Senhor das Chamas Negras** (30 pts): +50% dano de Fogo, +50% dano de Morte, +10% roubo de vida. *Abates em chamas negras explodem em área.*

### Tempestuoso (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano de Energia, dano de Terra, dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Energia, tries em Terra, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio da Energia (linha 2, coluna 3: +4,69% dano de Energia por rank); Domínio da Terra (linha 5, coluna 2: +4,69% dano de Terra por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Tempestade Magnética** (18 pts · linha 4, coluna 2): +45% dano em área, +30% dano de Energia. *Atrai e atordoa hordas inteiras.*
- **Major — Solo Trovejante** (18 pts · linha 4, coluna 4): +35% dano de Terra, +40% duração de controle. *O chão eletrificado causa dano contínuo aos inimigos.*
- **Keystone — Olho da Tempestade** (30 pts): +50% dano de Energia, +50% dano de Terra, +40% dano em área. *Uma tempestade permanente cobre a arena e causa dano periódico.*

### Glaciomante de Impacto (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano de Gelo, dano Físico (magia), dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Gelo, tries em Físico, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio do Gelo (linha 2, coluna 3: +4,69% dano de Gelo por rank); Domínio do Impacto (linha 5, coluna 2: +4,69% dano Físico (magia) por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Lança de Gelo Maciço** (18 pts · linha 4, coluna 2): +35% dano de Gelo, +35% dano Físico (magia). *Lanças causam dano físico e congelam o alvo no impacto.*
- **Major — Estilhaço Sísmico** (18 pts · linha 4, coluna 4): +60% dano crítico, +30% dano em área. *Alvos congelados que morrem estilhaçam causando dano em área.*
- **Keystone — Colosso de Gelo** (30 pts): +50% dano de Gelo, +50% dano Físico (magia), +40% força de escudos. *Ganha uma armadura de gelo que absorve 30% do HP máx.*

### Flagelo Miasmático (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano de Morte, dano de Veneno, dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Morte, tries em Veneno, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio da Morte (linha 2, coluna 3: +4,69% dano de Morte por rank); Domínio do Veneno (linha 5, coluna 2: +4,69% dano de Veneno por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Praga Necrótica** (18 pts · linha 4, coluna 2): +55% dano contínuo, +30% dano de Morte. *Monstro que morre envenenado explode e espalha o veneno pela sala.*
- **Major — Miasma Letal** (18 pts · linha 4, coluna 4): +35% dano de Veneno, +30% dano contra chefes e elites. *Chefes envenenados perdem 1% do HP máx. por segundo.*
- **Keystone — Arauto da Peste** (30 pts): +50% dano de Morte, +50% dano de Veneno, +60% dano contínuo. *Toda morte espalha a Praga Necrótica automaticamente.*

### Inquisidor Mental (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano Sagrado, dano Psíquico, dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Sagrado, tries em Psíquico, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio Sagrado (linha 2, coluna 3: +4,69% dano Sagrado por rank); Domínio da Mente (linha 5, coluna 2: +4,69% dano Psíquico por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Julgamento Divino** (18 pts · linha 4, coluna 2): +35% dano Sagrado, +35% dano Psíquico. *Dano psíquico massivo e silêncio nas habilidades especiais de chefes.*
- **Major — Purificação Mental** (18 pts · linha 4, coluna 4): +50% duração de controle, +30% poder de cura. *Cura a equipe de efeitos de controle.*
- **Keystone — Grande Inquisidor Mental** (30 pts): +50% dano Sagrado, +50% dano Psíquico, −15% de recarga. *Chefes julgados sofrem +25% de dano de toda a equipe.*

### Bio-Geomante (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano de Terra, dano de Veneno, dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Terra, tries em Veneno, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio da Terra (linha 2, coluna 3: +4,69% dano de Terra por rank); Domínio do Veneno (linha 5, coluna 2: +4,69% dano de Veneno por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Pântano Ácido** (18 pts · linha 4, coluna 2): +35% dano de Terra, +35% dano de Veneno. *Transforma o solo em pântano que desacelera os monstros e reduz sua defesa.*
- **Major — Raízes Venenosas** (18 pts · linha 4, coluna 4): +50% duração de controle, +40% dano contínuo. *Alvos enraizados recebem veneno em dobro.*
- **Keystone — Senhor do Pântano** (30 pts): +50% dano de Terra, +50% dano de Veneno, +40% HP máximo. *O pântano cura a equipe em 1% do HP por segundo.*

### Arcanista de Plasma (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano de Fogo, dano de Energia, dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Fogo, tries em Energia, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio do Fogo (linha 2, coluna 3: +4,69% dano de Fogo por rank); Domínio da Energia (linha 5, coluna 2: +4,69% dano de Energia por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Feixe de Plasma** (18 pts · linha 4, coluna 2): +35% dano de Fogo, +35% dano de Energia. *Feixes de plasma com velocidade extrema de conjuração.*
- **Major — Fusão Crítica** (18 pts · linha 4, coluna 4): +15% chance de crítico, +80% dano crítico. *Críticos de plasma causam dano triplo.*
- **Keystone — Núcleo Estelar** (30 pts): +50% dano de Fogo, +50% dano de Energia, −25% de recarga. *A cada 15 s, libera uma explosão estelar em todos os inimigos.*

### Singularista (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano Físico (magia), dano de Energia, dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Físico, tries em Energia, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio do Impacto (linha 2, coluna 3: +4,69% dano Físico (magia) por rank); Domínio da Energia (linha 5, coluna 2: +4,69% dano de Energia por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Singularidade** (18 pts · linha 4, coluna 2): +35% dano Físico (magia), +35% dano de Energia. *Puxa todos os monstros para um único ponto e os esmaga.*
- **Major — Gravidade Crescente** (18 pts · linha 4, coluna 4): +50% dano em área, +40% duração de controle. *Quanto mais monstros na singularidade, maior o dano.*
- **Keystone — Horizonte de Eventos** (30 pts): +50% dano Físico (magia), +50% dano de Energia, +40% dano em área. *Uma vez por wave, absorve um chefe por 3 s.*

### Dominador Sombrio (Tier 2, de Mago)

- **Ramo A — Fusão** (esquerda): dano Psíquico, dano de Morte, dano crítico, chance de crítico, dano em área.
- **Ramo B — Sustentação** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Psíquico, tries em Morte, dano do elemento em foco, tries em Magia, XP ganho.
- **Notables** (×2,5 por rank): Domínio da Mente (linha 2, coluna 3: +4,69% dano Psíquico por rank); Domínio da Morte (linha 5, coluna 2: +4,69% dano de Morte por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Sabedoria Arcana (linha 7, coluna 3: +4,69% dano mágico por rank).
- **Major — Controle Mental** (18 pts · linha 4, coluna 2): +35% dano Psíquico, +35% dano de Morte. *Assume o controle de um monstro de elite por 12 s para lutar pelo grupo.*
- **Major — Servos Sombrios** (18 pts · linha 4, coluna 4): +40% dano contínuo, +50% duração de controle. *Monstros controlados explodem ao fim do efeito.*
- **Keystone — Rei das Sombras** (30 pts): +50% dano Psíquico, +50% dano de Morte, +10% roubo de vida. *Pode controlar 2 monstros ao mesmo tempo.*

#### Guerreiro

### Gladiador (Tier 2, de Guerreiro)

- **Ramo A — Arena** (esquerda): dano em área, velocidade de ataque, dano crítico, chance de crítico, dano corpo a corpo.
- **Ramo B — Vigor** (direita): HP máximo, defesa, resistência, roubo de vida, espinhos (dano refletido).
- **Centro** (treino e utilidade): tries em Melee, tries em Defesa, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Frenesi (linha 2, coluna 3: +3,12% velocidade de ataque por rank); Devastação em Área (linha 5, coluna 2: +4,69% dano em área por rank); Golpe Devastador (linha 5, coluna 4: +9,38% dano crítico por rank); Mestre das Armas (linha 7, coluna 3: +4,69% dano corpo a corpo por rank).
- **Major — Arena Sangrenta** (18 pts · linha 4, coluna 2): +45% dano em área, +25% velocidade de ataque. *Ataques básicos atingem todos os inimigos.*
- **Major — Espetáculo** (18 pts · linha 4, coluna 4): +70% dano crítico, +12% chance de crítico. *Cada morte em sequência aumenta o dano em 5% (até 10×).*
- **Keystone — Campeão da Arena** (30 pts): +50% dano corpo a corpo, +30% velocidade de ataque, +40% dano em área. *Ao abater 5 inimigos em 10 s, entra em frenesi (+30% de velocidade por 8 s).*

### Berserker (Tier 2, de Guerreiro)

- **Ramo A — Fúria** (esquerda): dano corpo a corpo, dano crítico, dano contra alvos abaixo de 30% de HP, velocidade de ataque, roubo de vida.
- **Ramo B — Resistência** (direita): HP máximo, resistência, defesa, espinhos (dano refletido), cura recebida.
- **Centro** (treino e utilidade): tries em Melee, tries em Defesa, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre das Armas (linha 2, coluna 3: +4,69% dano corpo a corpo por rank); Carrasco (linha 5, coluna 2: +6,25% dano contra alvos abaixo de 30% de HP por rank); Vampirismo (linha 5, coluna 4: +1,25% roubo de vida por rank); Coração de Ferro (linha 7, coluna 3: +6,25% HP máximo por rank).
- **Major — Fúria Sangrenta** (18 pts · linha 4, coluna 2): +60% dano corpo a corpo, +15% velocidade de ataque. *Dano +1% para cada 2% de HP perdido (até +50%).*
- **Major — Sede de Sangue** (18 pts · linha 4, coluna 4): +12% roubo de vida, +25% velocidade de ataque. *Abates curam 3% do HP máx.*
- **Keystone — Berserker Imortal** (30 pts): +55% dano corpo a corpo, +60% HP máximo, +12% roubo de vida. *Uma vez por wave, sobrevive a um golpe fatal com 1 de HP.*

#### Guardião

### Paladino (Tier 2, de Guardião)

- **Ramo A — Fortaleza** (esquerda): defesa, HP máximo, resistência, força de escudos, cura recebida.
- **Ramo B — Fé** (direita): dano Sagrado, poder de cura, cura recebida, potência dos buffs, redução de recarga.
- **Centro** (treino e utilidade): tries em Defesa, tries em Sagrado, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Muralha (linha 2, coluna 3: +6,25% defesa por rank); Coração de Ferro (linha 5, coluna 2: +6,25% HP máximo por rank); Fonte de Vida (linha 5, coluna 4: +6,25% poder de cura por rank); Domínio Sagrado (linha 7, coluna 3: +4,69% dano Sagrado por rank).
- **Major — Aura Sagrada** (18 pts · linha 4, coluna 2): +40% poder de cura, +40% potência dos buffs. *Aura em área cura 1% do HP máx. por segundo e reduz em 8% o dano da equipe.*
- **Major — Escudo da Fé** (18 pts · linha 4, coluna 4): +60% força de escudos, +15% resistência. *Curas em aliados com HP cheio viram escudo.*
- **Keystone — Cavaleiro da Luz** (30 pts): +50% defesa, +40% poder de cura, +40% dano Sagrado. *Aliados abaixo de 25% de HP recebem −30% de dano.*

### Cavaleiro Negro (Tier 2, de Guardião)

- **Ramo A — Bastião Negro** (esquerda): defesa, HP máximo, resistência, roubo de vida, espinhos (dano refletido).
- **Ramo B — Sombra** (direita): dano de Morte, roubo de vida, espinhos (dano refletido), dano corpo a corpo, chance de crítico.
- **Centro** (treino e utilidade): tries em Defesa, tries em Morte, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Muralha (linha 2, coluna 3: +6,25% defesa por rank); Coração de Ferro (linha 5, coluna 2: +6,25% HP máximo por rank); Coroa de Espinhos (linha 5, coluna 4: +4,69% espinhos (dano refletido) por rank); Vampirismo (linha 7, coluna 3: +1,25% roubo de vida por rank).
- **Major — Retaliação Sombria** (18 pts · linha 4, coluna 2): +60% espinhos (dano refletido), +30% dano de Morte. *Devolve 60% do dano recebido em forma de dano de Morte.*
- **Major — Sangue Negro** (18 pts · linha 4, coluna 4): +12% roubo de vida, +40% HP máximo. *O dano refletido cura o Cavaleiro Negro.*
- **Keystone — Cavaleiro do Abismo** (30 pts): +50% defesa, +40% dano de Morte, +12% roubo de vida. *Ao cair abaixo de 30% de HP, libera uma onda de Morte em todos os inimigos.*

#### Ladino

### Assassino (Tier 2, de Ladino)

- **Ramo A — Execução** (esquerda): chance de crítico, dano crítico, velocidade de ataque, dano contra alvos abaixo de 30% de HP, dano contra chefes e elites.
- **Ramo B — Sombra** (direita): redução de aggro, HP máximo, resistência, dano contínuo, roubo de vida.
- **Centro** (treino e utilidade): tries em Melee, tries em Morte, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Instinto Assassino (linha 2, coluna 3: +1,56% chance de crítico por rank); Golpe Devastador (linha 5, coluna 2: +9,38% dano crítico por rank); Carrasco (linha 5, coluna 4: +6,25% dano contra alvos abaixo de 30% de HP por rank); Matador de Gigantes (linha 7, coluna 3: +4,69% dano contra chefes e elites por rank).
- **Major — Golpe Mortal** (18 pts · linha 4, coluna 2): +90% dano crítico, +40% dano contra alvos abaixo de 30% de HP. *Alvo único: +40% de dano contra alvos abaixo de 30% de HP.*
- **Major — Burst Letal** (18 pts · linha 4, coluna 4): +18% chance de crítico, +40% dano contra chefes e elites. *Contra chefes, os 3 primeiros golpes são críticos.*
- **Keystone — Lâmina Silenciosa** (30 pts): +20% chance de crítico, +100% dano crítico, +40% dano contra chefes e elites. *Abates críticos reiniciam a recarga de todas as magias.*

### Mestre das Sombras (Tier 2, de Ladino)

- **Ramo A — Lâmina Sombria** (esquerda): velocidade de ataque, chance de crítico, dano de Morte, dano crítico, dano contínuo.
- **Ramo B — Furtividade** (direita): redução de aggro, defesa, HP máximo, resistência, roubo de vida.
- **Centro** (treino e utilidade): tries em Melee, tries em Morte, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Frenesi (linha 2, coluna 3: +3,12% velocidade de ataque por rank); Instinto Assassino (linha 5, coluna 2: +1,56% chance de crítico por rank); Domínio da Morte (linha 5, coluna 4: +4,69% dano de Morte por rank); Manto das Sombras (linha 7, coluna 3: −9,38% de aggro por rank).
- **Major — Esquiva Sombria** (18 pts · linha 4, coluna 2): +40% defesa, −50% de aggro. *Desvia de 20% dos golpes recebidos.*
- **Major — Duplo de Sombra** (18 pts · linha 4, coluna 4): +30% velocidade de ataque, +30% dano de Morte. *Cria um duplo que ataca com 40% do dano do Ladino.*
- **Keystone — Senhor das Sombras** (30 pts): +30% velocidade de ataque, −60% de aggro, +40% dano de Morte. *Uma vez por wave, fica invulnerável por 3 s.*

#### Caçador

### Atirador de Elite (Tier 2, de Caçador)

- **Ramo A — Mira** (esquerda): dano à distância, chance de crítico, dano crítico, dano contra chefes e elites, velocidade de ataque.
- **Ramo B — Campo** (direita): HP máximo, defesa, resistência, XP ganho, chance de drop.
- **Centro** (treino e utilidade): tries em Ranged, tries em Terra, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre do Arco (linha 2, coluna 3: +4,69% dano à distância por rank); Instinto Assassino (linha 5, coluna 2: +1,56% chance de crítico por rank); Golpe Devastador (linha 5, coluna 4: +9,38% dano crítico por rank); Matador de Gigantes (linha 7, coluna 3: +4,69% dano contra chefes e elites por rank).
- **Major — Tiro Perfurante** (18 pts · linha 4, coluna 2): +50% dano à distância, +70% dano crítico. *Tiros ignoram a defesa do alvo.*
- **Major — Foco Absoluto** (18 pts · linha 4, coluna 4): +20% chance de crítico, +40% dano contra chefes e elites. *Sem se mover por 5 s, o próximo tiro é crítico garantido.*
- **Keystone — Olho de Falcão** (30 pts): +55% dano à distância, +20% chance de crítico, +100% dano crítico. *Tiros críticos perfuram e atingem o alvo de trás.*

### Mestre das Feras (Tier 2, de Caçador)

- **Ramo A — Matilha** (esquerda): dano à distância, dano de Terra, velocidade de ataque, HP máximo, defesa.
- **Ramo B — Instinto** (direita): HP máximo, defesa, resistência, XP ganho, chance de drop.
- **Centro** (treino e utilidade): tries em Ranged, tries em Terra, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre do Arco (linha 2, coluna 3: +4,69% dano à distância por rank); Domínio da Terra (linha 5, coluna 2: +4,69% dano de Terra por rank); Coração de Ferro (linha 5, coluna 4: +6,25% HP máximo por rank); Frenesi (linha 7, coluna 3: +3,12% velocidade de ataque por rank).
- **Major — Companheiro Feroz** (18 pts · linha 4, coluna 2): +60% HP máximo, +40% de peso de aggro. *Invoca um pet tanque que absorve 30% dos golpes.*
- **Major — Matilha** (18 pts · linha 4, coluna 4): +40% dano à distância, +40% dano em área. *O pet e o caçador atacam em conjunto com bônus de dano em área.*
- **Keystone — Senhor das Feras** (30 pts): +40% dano de Terra, +50% HP máximo, +40% dano à distância. *Uma vez por wave, invoca uma segunda fera por 15 s.*

#### Clérigo

### Sumo Sacerdote (Tier 2, de Clérigo)

- **Ramo A — Milagres** (esquerda): poder de cura, cura recebida, regeneração de mana, redução de recarga, mana máxima.
- **Ramo B — Prevenção** (direita): força de escudos, resistência, HP máximo, defesa, potência dos buffs.
- **Centro** (treino e utilidade): tries em Sagrado, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Fonte de Vida (linha 2, coluna 3: +6,25% poder de cura por rank); Renovação (linha 5, coluna 2: +6,25% cura recebida por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Fortaleza Arcana (linha 7, coluna 3: +6,25% força de escudos por rank).
- **Major — Cura em Massa** (18 pts · linha 4, coluna 2): +60% poder de cura, −20% de recarga. *Curas em área rendem +50%.*
- **Major — Prevenção** (18 pts · linha 4, coluna 4): +60% força de escudos, +15% resistência. *Escudo automático em aliados abaixo de 40% de HP.*
- **Keystone — Sumo Sacerdote da Luz** (30 pts): +60% poder de cura, +40% cura recebida, +60% regeneração de mana. *Uma vez por wave, uma prece cura toda a equipe até 60% do HP.*

### Inquisidor (Tier 2, de Clérigo)

- **Ramo A — Punição** (esquerda): dano Sagrado, dano corpo a corpo, chance de crítico, dano crítico, dano mágico.
- **Ramo B — Zelo** (direita): HP máximo, defesa, resistência, dano contra alvos abaixo de 30% de HP, dano contra chefes e elites.
- **Centro** (treino e utilidade): tries em Sagrado, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Domínio Sagrado (linha 2, coluna 3: +4,69% dano Sagrado por rank); Instinto Assassino (linha 5, coluna 2: +1,56% chance de crítico por rank); Carrasco (linha 5, coluna 4: +6,25% dano contra alvos abaixo de 30% de HP por rank); Matador de Gigantes (linha 7, coluna 3: +4,69% dano contra chefes e elites por rank).
- **Major — Punição Sagrada** (18 pts · linha 4, coluna 2): +50% dano Sagrado, +40% dano contra chefes e elites. *Dano Sagrado aplica um debuff de −15% de defesa.*
- **Major — Chama da Fé** (18 pts · linha 4, coluna 4): +70% dano crítico, +12% chance de crítico. *Críticos incendeiam o alvo com fogo sagrado.*
- **Keystone — Flagelo da Heresia** (30 pts): +55% dano Sagrado, +40% dano contra alvos abaixo de 30% de HP, +15% chance de crítico. *Alvos abaixo de 25% de HP são abatidos por um raio sagrado.*

#### Bardo

### Maestro (Tier 2, de Bardo)

- **Ramo A — Regência** (esquerda): duração dos buffs, potência dos buffs, redução de recarga, regeneração de mana, mana máxima.
- **Ramo B — Apoio** (direita): HP máximo, defesa, resistência, poder de cura, cura recebida.
- **Centro** (treino e utilidade): tries em Magia, tries em Sagrado, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Canção Eterna (linha 2, coluna 3: +9,38% duração dos buffs por rank); Sinfonia (linha 5, coluna 2: +4,69% potência dos buffs por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Fonte Interior (linha 7, coluna 3: +12,5% regeneração de mana por rank).
- **Major — Regência** (18 pts · linha 4, coluna 2): +60% potência dos buffs, +25% velocidade de ataque. *Aumenta a velocidade de ataque e de conjuração de toda a equipe.*
- **Major — Ária Prolongada** (18 pts · linha 4, coluna 4): +80% duração dos buffs, −20% de recarga. *Buffs renovados pela metade do custo de mana.*
- **Keystone — Maestro Absoluto** (30 pts): +70% potência dos buffs, +80% duração dos buffs, −20% de recarga. *Todos os buffs do Bardo afetam a equipe inteira sem limite.*

### Menestrel do Caos (Tier 2, de Bardo)

- **Ramo A — Dissonância** (esquerda): dano Psíquico, duração de controle, chance de crítico, dano crítico, dano em área.
- **Ramo B — Improviso** (direita): redução de aggro, HP máximo, defesa, resistência, redução de recarga.
- **Centro** (treino e utilidade): tries em Magia, tries em Psíquico, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Domínio da Mente (linha 2, coluna 3: +4,69% dano Psíquico por rank); Domínio da Vontade (linha 5, coluna 2: +9,38% duração de controle por rank); Instinto Assassino (linha 5, coluna 4: +1,56% chance de crítico por rank); Devastação em Área (linha 7, coluna 3: +4,69% dano em área por rank).
- **Major — Melodia Caótica** (18 pts · linha 4, coluna 2): +60% duração de controle, +40% dano em área. *Debuffs aleatórios em área a cada 10 s.*
- **Major — Dissonância** (18 pts · linha 4, coluna 4): +45% dano Psíquico, +12% chance de crítico. *Críticos psíquicos confundem o alvo.*
- **Keystone — Menestrel Supremo do Caos** (30 pts): +55% dano Psíquico, +70% duração de controle, −20% de recarga. *A cada 20 s, todos os inimigos ficam confusos por 3 s.*

#### Monge

### Mestre do Chi (Tier 2, de Monge)

- **Ramo A — Projéteis de Chi** (esquerda): dano Físico (magia), dano mágico, chance de crítico, dano crítico, regeneração de mana.
- **Ramo B — Meditação** (direita): mana máxima, regeneração de mana, HP máximo, resistência, redução de recarga.
- **Centro** (treino e utilidade): tries em Físico, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Domínio do Impacto (linha 2, coluna 3: +4,69% dano Físico (magia) por rank); Sabedoria Arcana (linha 5, coluna 2: +4,69% dano mágico por rank); Fonte Interior (linha 5, coluna 4: +12,5% regeneração de mana por rank); Instinto Assassino (linha 7, coluna 3: +1,56% chance de crítico por rank).
- **Major — Projéteis de Chi** (18 pts · linha 4, coluna 2): +50% dano Físico (magia), +40% dano mágico. *Ataques disparam projéteis de energia com roubo de vida.*
- **Major — Fluxo Interior** (18 pts · linha 4, coluna 4): +80% regeneração de mana, +50% mana máxima. *Mana cheia converte o excedente em escudo.*
- **Keystone — Ascensão do Chi** (30 pts): +55% dano Físico (magia), +45% dano mágico, +10% roubo de vida. *Gastar mana concede dano extra por 4 s.*

### Punho de Ferro (Tier 2, de Monge)

- **Ramo A — Punho** (esquerda): dano corpo a corpo, velocidade de ataque, chance de crítico, dano crítico, roubo de vida.
- **Ramo B — Corpo de Aço** (direita): HP máximo, defesa, resistência, cura recebida, espinhos (dano refletido).
- **Centro** (treino e utilidade): tries em Físico, tries em Defesa, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre das Armas (linha 2, coluna 3: +4,69% dano corpo a corpo por rank); Frenesi (linha 5, coluna 2: +3,12% velocidade de ataque por rank); Coração de Ferro (linha 5, coluna 4: +6,25% HP máximo por rank); Muralha (linha 7, coluna 3: +6,25% defesa por rank).
- **Major — Corpo de Aço** (18 pts · linha 4, coluna 2): +60% HP máximo, +40% defesa. *O dano escala com o HP máximo (+1% de dano para cada 5% de HP máx. bônus).*
- **Major — Punhos de Ferro** (18 pts · linha 4, coluna 4): +50% dano corpo a corpo, +20% velocidade de ataque. *Golpes reduzem a defesa do alvo em 5% (acumula 4×).*
- **Keystone — Punho Inquebrável** (30 pts): +55% dano corpo a corpo, +60% HP máximo, +40% defesa. *Ao sofrer um golpe crítico, o próximo ataque causa +100% de dano.*

#### Bruxo

### Necromante (Tier 2, de Bruxo)

- **Ramo A — Necromancia** (esquerda): dano de Morte, dano contínuo, dano mágico, redução de recarga, dano crítico.
- **Ramo B — Sangue** (direita): roubo de vida, HP máximo, mana máxima, resistência, eficácia das poções.
- **Centro** (treino e utilidade): tries em Morte, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Domínio da Morte (linha 2, coluna 3: +4,69% dano de Morte por rank); Sofrimento Prolongado (linha 5, coluna 2: +6,25% dano contínuo por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Vampirismo (linha 7, coluna 3: +1,25% roubo de vida por rank).
- **Major — Exército de Ossos** (18 pts · linha 4, coluna 2): +45% dano de Morte, +30% dano em área. *Invoca esqueletos dos monstros derrotados (30% do dano do Bruxo).*
- **Major — Pacto de Sangue** (18 pts · linha 4, coluna 4): +12% roubo de vida, +40% HP máximo. *Esqueletos curam o Bruxo ao causar dano.*
- **Keystone — Senhor dos Mortos** (30 pts): +55% dano de Morte, +50% dano contínuo, +10% roubo de vida. *Até 6 esqueletos ao mesmo tempo, com 60% do dano do Bruxo.*

### Epidemiologista (Tier 2, de Bruxo)

- **Ramo A — Contágio** (esquerda): dano de Veneno, dano contínuo, dano em área, redução de recarga, dano contra chefes e elites.
- **Ramo B — Reserva** (direita): HP máximo, resistência, mana máxima, regeneração de mana, eficácia das poções.
- **Centro** (treino e utilidade): tries em Veneno, tries em Morte, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Domínio do Veneno (linha 2, coluna 3: +4,69% dano de Veneno por rank); Sofrimento Prolongado (linha 5, coluna 2: +6,25% dano contínuo por rank); Devastação em Área (linha 5, coluna 4: +4,69% dano em área por rank); Matador de Gigantes (linha 7, coluna 3: +4,69% dano contra chefes e elites por rank).
- **Major — Praga Contagiosa** (18 pts · linha 4, coluna 2): +60% dano contínuo, +40% dano em área. *Pragas contagiam os alvos vizinhos ao morrer.*
- **Major — Peste Virulenta** (18 pts · linha 4, coluna 4): +45% dano de Veneno, +35% dano contra chefes e elites. *Chefes sofrem +2% de dano por acúmulo de peste (até 10).*
- **Keystone — Pandemia** (30 pts): +70% dano contínuo, +50% dano de Veneno, +40% dano em área. *Todo inimigo da wave recebe a praga do primeiro alvo contaminado.*

#### Alquimista

### Mestre Bombardeiro (Tier 2, de Alquimista)

- **Ramo A — Explosivos** (esquerda): dano à distância, dano de Fogo, dano em área, chance de crítico, dano crítico.
- **Ramo B — Suprimentos** (direita): HP máximo, defesa, resistência, eficácia das poções, mana máxima.
- **Centro** (treino e utilidade): tries em Ranged, tries em Fogo, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre do Arco (linha 2, coluna 3: +4,69% dano à distância por rank); Domínio do Fogo (linha 5, coluna 2: +4,69% dano de Fogo por rank); Devastação em Área (linha 5, coluna 4: +4,69% dano em área por rank); Golpe Devastador (linha 7, coluna 3: +9,38% dano crítico por rank).
- **Major — Bomba Perfurante** (18 pts · linha 4, coluna 2): +50% dano em área, +40% dano à distância. *Explosões quebram a armadura (−20% de defesa).*
- **Major — Detonação em Cadeia** (18 pts · linha 4, coluna 4): +45% dano de Fogo, +70% dano crítico. *Bombas críticas explodem duas vezes.*
- **Keystone — Bombardeiro Supremo** (30 pts): +55% dano em área, +45% dano de Fogo, +45% dano à distância. *A cada 15 s, um bombardeio atinge todos os inimigos.*

### Transmutador (Tier 2, de Alquimista)

- **Ramo A — Transmutação** (esquerda): dano de Veneno, eficácia das poções, potência dos buffs, poder de cura, redução de recarga.
- **Ramo B — Comércio** (direita): XP ganho, ouro ganho, chance de drop, valor de venda, HP máximo.
- **Centro** (treino e utilidade): tries em Veneno, tries em Magia, XP ganho, ouro ganho, valor de venda.
- **Notables** (×2,5 por rank): Alquimia Avançada (linha 2, coluna 3: +9,38% eficácia das poções por rank); Sinfonia (linha 5, coluna 2: +4,69% potência dos buffs por rank); Fonte de Vida (linha 5, coluna 4: +6,25% poder de cura por rank); Sorte do Saqueador (linha 7, coluna 3: +4,69% chance de drop por rank).
- **Major — Transmutação** (18 pts · linha 4, coluna 2): +60% potência dos buffs, +60% eficácia das poções. *Poções concedem um buff de atributos de 20 s.*
- **Major — Alquimia Rentável** (18 pts · linha 4, coluna 4): +40% chance de drop, +40% ouro ganho. *Loot comum é transmutado em ouro extra.*
- **Keystone — Pedra Filosofal** (30 pts): +70% eficácia das poções, +50% chance de drop, +50% ouro ganho. *Uma vez por wave, transmuta um inimigo em ouro (exceto chefes).*

#### Mercenário

### Caçador de Recompensas (Tier 2, de Mercenário)

- **Ramo A — Caça** (esquerda): dano corpo a corpo, dano contra chefes e elites, dano contra alvos abaixo de 30% de HP, dano crítico, chance de crítico.
- **Ramo B — Recompensa** (direita): ouro ganho, chance de drop, valor de venda, XP ganho, HP máximo.
- **Centro** (treino e utilidade): tries em Melee, tries em Defesa, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre das Armas (linha 2, coluna 3: +4,69% dano corpo a corpo por rank); Matador de Gigantes (linha 5, coluna 2: +4,69% dano contra chefes e elites por rank); Carrasco (linha 5, coluna 4: +6,25% dano contra alvos abaixo de 30% de HP por rank); Toque de Midas (linha 7, coluna 3: +4,69% ouro ganho por rank).
- **Major — Marcado para Morrer** (18 pts · linha 4, coluna 2): +70% dano contra chefes e elites, +35% dano corpo a corpo. *O primeiro chefe de cada ciclo recebe +50% de dano de toda a equipe.*
- **Major — Recompensa Dobrada** (18 pts · linha 4, coluna 4): +60% ouro ganho, +30% chance de drop. *Chefes pagam ouro em dobro.*
- **Keystone — Lenda dos Caçadores** (30 pts): +80% dano contra chefes e elites, +45% dano corpo a corpo, +50% ouro ganho. *Chefes abatidos deixam um troféu extra.*

### Corsário (Tier 2, de Mercenário)

- **Ramo A — Abordagem** (esquerda): dano corpo a corpo, velocidade de ataque, chance de crítico, ouro ganho, dano crítico.
- **Ramo B — Butim** (direita): ouro ganho, chance de drop, valor de venda, HP máximo, defesa.
- **Centro** (treino e utilidade): tries em Melee, tries em Defesa, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre das Armas (linha 2, coluna 3: +4,69% dano corpo a corpo por rank); Frenesi (linha 5, coluna 2: +3,12% velocidade de ataque por rank); Instinto Assassino (linha 5, coluna 4: +1,56% chance de crítico por rank); Toque de Midas (linha 7, coluna 3: +4,69% ouro ganho por rank).
- **Major — Ataques Duplos** (18 pts · linha 4, coluna 2): +40% velocidade de ataque, +35% dano corpo a corpo. *Ataques básicos têm 20% de chance de se repetir.*
- **Major — Saque** (18 pts · linha 4, coluna 4): +70% ouro ganho, +30% chance de drop. *Cada abate paga +5% de ouro por acúmulo (até 10).*
- **Keystone — Rei dos Mares** (30 pts): +80% ouro ganho, +30% velocidade de ataque, +40% dano corpo a corpo. *A cada 30 s, um saque extra paga o ouro de 20 monstros comuns.*

#### Mestre Rúnico

### Forjador de Lâminas (Tier 2, de Mestre Rúnico)

- **Ramo A — Lâmina Rúnica** (esquerda): dano corpo a corpo, dano mágico, velocidade de ataque, dano de Fogo, chance de crítico.
- **Ramo B — Forja** (direita): defesa, HP máximo, mana máxima, resistência, força de escudos.
- **Centro** (treino e utilidade): tries em Magia, tries em Melee, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre das Armas (linha 2, coluna 3: +4,69% dano corpo a corpo por rank); Sabedoria Arcana (linha 5, coluna 2: +4,69% dano mágico por rank); Frenesi (linha 5, coluna 4: +3,12% velocidade de ataque por rank); Instinto Assassino (linha 7, coluna 3: +1,56% chance de crítico por rank).
- **Major — Lâmina Elemental** (18 pts · linha 4, coluna 2): +45% dano corpo a corpo, +40% dano mágico. *Aplica um elemento fraco ao grupo (+10% de dano elemental).*
- **Major — Forja Viva** (18 pts · linha 4, coluna 4): +30% velocidade de ataque, +12% chance de crítico. *Críticos reforçam a lâmina (+5% de dano por 6 s, acumula 5×).*
- **Keystone — Mestre Forjador** (30 pts): +55% dano corpo a corpo, +50% dano mágico, +20% velocidade de ataque. *A cada 10 s, a lâmina explode em runas (200% do dano em área).*

### Guardião das Runas (Tier 2, de Mestre Rúnico)

- **Ramo A — Barreira** (esquerda): força de escudos, defesa, resistência, HP máximo, mana máxima.
- **Ramo B — Fluxo Rúnico** (direita): dano mágico, redução de recarga, regeneração de mana, mana máxima, dano de Energia.
- **Centro** (treino e utilidade): tries em Magia, tries em Defesa, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Fortaleza Arcana (linha 2, coluna 3: +6,25% força de escudos por rank); Resistência Ancestral (linha 5, coluna 2: +1,88% resistência por rank); Mestre do Tempo (linha 5, coluna 4: −3,12% de recarga por rank); Fonte Interior (linha 7, coluna 3: +12,5% regeneração de mana por rank).
- **Major — Barreira de Absorção** (18 pts · linha 4, coluna 2): +70% força de escudos, +20% resistência. *Absorve o dano de um golpe por wave.*
- **Major — Runa Eterna** (18 pts · linha 4, coluna 4): −25% de recarga, +60% regeneração de mana. *Escudos expirados devolvem 20% do valor como mana.*
- **Keystone — Guardião Supremo** (30 pts): +80% força de escudos, +20% resistência, +50% HP máximo. *Escudos são compartilhados com toda a equipe (50% do valor).*

#### Ilusionista

### Mestre dos Espelhos (Tier 2, de Ilusionista)

- **Ramo A — Espelhos** (esquerda): redução de aggro, defesa, HP máximo, resistência, dano Psíquico.
- **Ramo B — Reflexo** (direita): dano mágico, redução de recarga, mana máxima, regeneração de mana, duração de controle.
- **Centro** (treino e utilidade): tries em Psíquico, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Manto das Sombras (linha 2, coluna 3: −9,38% de aggro por rank); Muralha (linha 5, coluna 2: +6,25% defesa por rank); Domínio da Mente (linha 5, coluna 4: +4,69% dano Psíquico por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Clones** (18 pts · linha 4, coluna 2): −60% de aggro, +40% defesa. *Cria clones que desviam 25% do dano recebido.*
- **Major — Reflexo** (18 pts · linha 4, coluna 4): +50% espinhos (dano refletido), +40% dano Psíquico. *Devolve 50% do dano recebido como dano psíquico.*
- **Keystone — Mestre dos Espelhos Infinitos** (30 pts): −70% de aggro, +50% defesa, +45% dano Psíquico. *Clones explodem ao expirar, causando dano psíquico em área.*

### Hipnotizador (Tier 2, de Ilusionista)

- **Ramo A — Transe** (esquerda): dano Psíquico, duração de controle, chance de crítico, dano crítico, dano em área.
- **Ramo B — Foco** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, resistência.
- **Centro** (treino e utilidade): tries em Psíquico, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Domínio da Mente (linha 2, coluna 3: +4,69% dano Psíquico por rank); Domínio da Vontade (linha 5, coluna 2: +9,38% duração de controle por rank); Devastação em Área (linha 5, coluna 4: +4,69% dano em área por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Transe** (18 pts · linha 4, coluna 2): +80% duração de controle, +40% dano Psíquico. *Monstros afetados atacam uns aos outros.*
- **Major — Sugestão Profunda** (18 pts · linha 4, coluna 4): +45% dano em área, −25% de recarga. *O controle atinge +2 alvos.*
- **Keystone — Mestre da Hipnose** (30 pts): +55% dano Psíquico, +90% duração de controle, +40% dano em área. *Chefes sofrem metade da duração de controle, mas ficam vulneráveis (+15% de dano).*

#### Druida

### Forma Feral (Tier 2, de Druida)

- **Ramo A — Garras** (esquerda): dano corpo a corpo, velocidade de ataque, chance de crítico, roubo de vida, dano crítico.
- **Ramo B — Instinto** (direita): HP máximo, defesa, resistência, dano de Terra, cura recebida.
- **Centro** (treino e utilidade): tries em Terra, tries em Melee, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre das Armas (linha 2, coluna 3: +4,69% dano corpo a corpo por rank); Frenesi (linha 5, coluna 2: +3,12% velocidade de ataque por rank); Instinto Assassino (linha 5, coluna 4: +1,56% chance de crítico por rank); Vampirismo (linha 7, coluna 3: +1,25% roubo de vida por rank).
- **Major — Garras Sangrentas** (18 pts · linha 4, coluna 2): +55% dano corpo a corpo, +10% roubo de vida. *Ataques causam sangramento (dano contínuo).*
- **Major — Instinto Selvagem** (18 pts · linha 4, coluna 4): +35% velocidade de ataque, +12% chance de crítico. *Críticos aumentam a velocidade de ataque em 10% por 5 s.*
- **Keystone — Fera Ancestral** (30 pts): +60% dano corpo a corpo, +30% velocidade de ataque, +12% roubo de vida. *Ao cair abaixo de 30% de HP, entra em forma primal (+40% de dano por 8 s).*

### Guardião da Natureza (Tier 2, de Druida)

- **Ramo A — Renovação** (esquerda): poder de cura, cura recebida, dano de Terra, regeneração de mana, redução de recarga.
- **Ramo B — Casca** (direita): HP máximo, defesa, resistência, força de escudos, dano mágico.
- **Centro** (treino e utilidade): tries em Terra, tries em Magia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Fonte de Vida (linha 2, coluna 3: +6,25% poder de cura por rank); Renovação (linha 5, coluna 2: +6,25% cura recebida por rank); Coração de Ferro (linha 5, coluna 4: +6,25% HP máximo por rank); Muralha (linha 7, coluna 3: +6,25% defesa por rank).
- **Major — Renovação** (18 pts · linha 4, coluna 2): +60% poder de cura, +40% cura recebida. *Curas contínuas na equipe (2% do HP por segundo por 6 s).*
- **Major — Casca Espessa** (18 pts · linha 4, coluna 4): +50% defesa, +50% HP máximo. *A regeneração aumenta com a defesa.*
- **Keystone — Espírito da Floresta** (30 pts): +70% poder de cura, +45% dano de Terra, +50% HP máximo. *Uma vez por wave, uma árvore ancestral cura e protege a equipe por 10 s.*

#### Artilheiro

### Engenheiro de Torretas (Tier 2, de Artilheiro)

- **Ramo A — Torretas** (esquerda): dano à distância, dano em área, dano de Energia, chance de crítico, dano crítico.
- **Ramo B — Reator** (direita): mana máxima, regeneração de mana, redução de recarga, HP máximo, defesa.
- **Centro** (treino e utilidade): tries em Ranged, tries em Energia, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Mestre do Arco (linha 2, coluna 3: +4,69% dano à distância por rank); Devastação em Área (linha 5, coluna 2: +4,69% dano em área por rank); Domínio da Energia (linha 5, coluna 4: +4,69% dano de Energia por rank); Mestre do Tempo (linha 7, coluna 3: −3,12% de recarga por rank).
- **Major — Torreta Dupla** (18 pts · linha 4, coluna 2): +50% dano à distância, +40% dano em área. *Duas torretas autônomas atacam no chão (30% do dano cada).*
- **Major — Sobrecarga do Reator** (18 pts · linha 4, coluna 4): +50% dano de Energia, −25% de recarga. *Torretas disparam +30% mais rápido.*
- **Keystone — Engenheiro Chefe** (30 pts): +55% dano à distância, +50% dano de Energia, +45% dano em área. *Até 4 torretas ao mesmo tempo, com 40% do dano cada.*

### Exotraje (Tier 2, de Artilheiro)

- **Ramo A — Blindagem** (esquerda): defesa, HP máximo, resistência, força de escudos, peso de aggro.
- **Ramo B — Arsenal** (direita): dano à distância, dano em área, dano de Fogo, dano crítico, velocidade de ataque.
- **Centro** (treino e utilidade): tries em Ranged, tries em Defesa, XP ganho, ouro ganho, chance de drop.
- **Notables** (×2,5 por rank): Muralha (linha 2, coluna 3: +6,25% defesa por rank); Coração de Ferro (linha 5, coluna 2: +6,25% HP máximo por rank); Devastação em Área (linha 5, coluna 4: +4,69% dano em área por rank); Domínio do Fogo (linha 7, coluna 3: +4,69% dano de Fogo por rank).
- **Major — Armadura Pesada** (18 pts · linha 4, coluna 2): +60% defesa, +50% HP máximo. *Dispara mísseis em todos os inimigos a cada 8 s.*
- **Major — Mísseis Teleguiados** (18 pts · linha 4, coluna 4): +50% dano em área, +40% dano de Fogo. *Mísseis perseguem alvos abaixo de 30% de HP.*
- **Keystone — Exotraje Supremo** (30 pts): +60% defesa, +60% HP máximo, +45% dano em área. *Uma vez por wave, o traje sobrecarrega e absorve 50% do dano por 5 s.*

---

## E. Ordem de implementação e riscos

| Ordem | Bloco | Esforço | Observação |
|---|---|---|---|
| 1 | **A — Afinidade** | S | uma tabela + um multiplicador em `gainTries`/ETA; atualizar testes de ritmo por classe |
| 2 | **B1–B4, B6 — Núcleo do grafo** (carregar JSON, `talentRanks`, regras de compra, `pointsAt`, respec) | M | lógica pura, testável sem UI |
| 3 | **B7 — `talentTotals` e aplicação dos efeitos** (existentes primeiro, "novos" por família) | L | ordem sugerida: hp/def/res/mana/aspd/crit/cdr/heal/magic → melee/ranged/e_*/critdmg/aoe/boss/exec → thorns/aggro/lifesteal/dot → xp/gold/drop/sell/potion → treino (`t_*`) |
| 4 | **B8 — Interface da grade** | L | canvas SVG com pan/zoom, tooltip e busca |
| 5 | **B10 — Migração** | S | reembolsar talentos antigos e validar saves |
| 6 | **B9 — Mecânicas dos Majors/Keystones** por prioridade | L (contínuo) | começar por Guerreiro, Caçador, Mago |

Riscos:

- **Volume de conteúdo:** 214 mecânicas. Mitigação: numérico primeiro, mecânica sob demanda, "Em breve" na UI.
- **Balanceamento:** os efeitos "novos" (crítico dano, aggro, treino) precisam de tetos (B7) e de uma passada com o harness de balanceamento **com talentos comprados** (ex.: 60 pontos no nível 25).
- **Economia de pontos:** dobrar os pontos muda o poder do personagem; se o jogo ficar fácil demais, reduza `pointsPerLevel` para 1,5 ou eleve os `rowGate`; ambos estão em dados.
- **Treino por talento** (`t_*`) e afinidade se multiplicam: teto de +150% nos talentos evita quebrar o ritmo (Tier 1 continuaria em ≥ 3 h).
- **Saves antigos:** a migração de talentos zera os pontos gastos; avisar o jogador na primeira carga ("Seus talentos foram reembolsados").

