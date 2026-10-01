# Tiny Dungeon — Fase 5: ritmo "redondo", offline v2, hunts livres e sprites escolhíveis

> **Como usar (Claude Code):** parte do commit `8d02d02` (189 testes passando, `tsc` limpo, hunts/economia/kits/acelerar já aplicados). Implemente **A → B → C → D**, rode `npm test` e `npm run build` ao fim de cada bloco e **atualize** (não apague) os testes que fixam números antigos. Nomes de arquivos e funções foram conferidos nesse commit. Números marcados **[calculado]** saem das fórmulas abaixo; **[medido]** vêm da sessão real do jogador (Hunt Analyzer).

## 0. Decisões do jogador (fonte desta fase)

1. **Primeira evolução (Tier 1) na metade do dia**, "sem muito mistério", para o jogador ter a satisfação de gerar o personagem e só então investir na progressão. → alvo **~8 h** de treino (a meta é "até 12 h"; 8 h dá folga).
2. **Depois do Tier 1 a subida é uma porta lenta e cada vez mais difícil (exponencial).** Outros sistemas (codex, equipamentos, proficiências, charms) ajudam a ficar forte.
3. **Hunts sem bloqueio:** o jogador pode entrar em qualquer hunt, mesmo sem o nível recomendado.
4. **Offline:** libera **25% da hunt mais avançada** e continua treinando skills; **duas vagas de skill** por personagem; se o jogador não escolher e fechar, vale **as 2 últimas escolhidas**.
5. **Sprites:** o jogador escolhe **qual sprite** cada personagem usa (já existe um, `necromancer`).

**Interpretações adotadas (mude uma constante se estiverem erradas):** "hunt mais avançada" = a de maior nível em que o grupo já derrotou o boss; "25%" = XP e ouro (sem loot); cada vaga treina no ritmo cheio; "metade do dia" = 8 h de treino contando o offline.

## 1. Estado atual e achados da sessão real [medido]

Sessão: 11 h 46 min simulados (aceleração), 685 ciclos, 7.386 monstros, 685 chefes, **0 derrotas**.

| Métrica | Valor | Leitura |
|---|---|---|
| XP | 487 mil, **41 mil/h** | ~1,5× o alvo de 28 mil/h da Floresta Sombria; nível ≈ 16 com 11,8 h |
| Tempo por ciclo | ~62 s | o plano estimava ~88 s; o grupo está mais forte que o previsto |
| Ouro | 315 mil, **27 mil/h** | igual ao previsto (476 g por ciclo), mas **sem onde gastar** |
| Consumíveis | 15 usados, custo 342 g | **0,1%** do ouro; a meta era ≤ 45% |
| Dano recebido | 121 mil (~177 por ciclo) | hunt fácil para o grupo com equipamento |
| Cura realizada | 0 | o kit do Squire não tem cura (esperado) |

Os dois últimos itens (dificuldade e economia) estão no **Anexo**; **não implementar agora**.

---

## A. Ritmo: Tier 1 em ~8 h e parede exponencial depois

### A1. Um botão para a porta do Tier 1

Em `src/game/rpg/curves.ts`, substituir o `132` fixo por uma constante ajustável em teste:

```ts
export const TIER1_HOURS = 8;                       // horas de treino até skill 25 (24 h/dia contando offline)
export const POST_GATE_GROWTH = 1.3;                // custo de cada nível após a porta cresce ×1,3
export const GATE_SKILL = 25;                       // porta do Tier 1
const GATE_LEVELS = GATE_SKILL - 10;                // 15 níveis (10 -> 25)

export const paceA = () =>
  (runtime.tier1Hours * 3600 * TRIES_PER_SECOND) / sumPow(PACE_POWER, GATE_LEVELS);
```

- `runtime.ts` ganha `tier1Hours: TIER1_HOURS` e `postGateGrowth: POST_GATE_GROWTH` (memória apenas). Como `runtime` já importa de `data/balance`, criar as duas constantes em `data/balance.ts` e importá-las nos dois lugares (evita ciclo de import).
- `PACE_A` deixa de ser `const` e vira a função `paceA()` (ajustar os usos, hoje em `triesForNextLevel`).
- `dev.paceHours(n)` e `dev.postGateGrowth(g)` em `devTools.ts`, para ajustar o ritmo **sem editar código** durante playtest (chamam `engine.devScaleChanged()`).

### A2. Nova `triesForNextLevel` (potência até a porta, exponencial depois)

```ts
export const triesForNextLevel = (id: ProficiencyId, level: number) => {
  const effort = PROFICIENCIES[id].effort;
  if (level < GATE_SKILL) {                                        // 10 -> 25: lei de potência (como hoje)
    const j = Math.max(1, level - 9);
    return Math.max(1, Math.round(paceA() * effort * j ** PACE_POWER));
  }
  const lastGateLevel = paceA() * GATE_LEVELS ** PACE_POWER;      // custo de sair do nível 24
  return Math.max(1, Math.round(lastGateLevel * effort * runtime.postGateGrowth ** (level - (GATE_SKILL - 1))));
};
```

Continuidade: sair do nível 25 custa `custo(24) × 1,3`, sair do 26 custa `custo(24) × 1,3²`, e assim por diante. `cumulativeTries`, `hoursToReach`, `remainingTries`, `etaSeconds` e o ETA da UI não mudam (só dependem de `triesForNextLevel`).

### A3. Gates das subclasses (`rpg/classTree.ts`)

| Onde | Antes | Depois |
|---|---|---|
| `tier1(...)`: skill | 25 | 25 (igual) |
| `hybrid(...)` e `counted(...)`: skill | 35 | 35 (igual) |
| `pure(...)`: skill | 40 | **38** |

Motivo: com o crescimento exponencial, 2 × (skill 35) fica equivalente a **skill 38** (paridade de tempo total treinando em sequência). Níveis de personagem (10 e 25) não mudam; **o nível não deve ser o gargalo**. Com 41 mil XP/h, um jogador de 8 h por dia (mais o offline a 25%) chega ao nível 25 em ~5 dias (~4 dias com as hunts seguintes, que rendem mais). Isso fica na mesma faixa da skill 35 (3,7 dias) e da 38 (8 dias): observe em playtest e, se o nível 25 travar o Tier 2, baixe o requisito de nível do Tier 2 (`T2_LEVEL`) para 20.

### A4. Tabelas esperadas [calculado] (24 h/dia contando offline, 0,5 try/s)

**Até o Tier 1 (`TIER1_HOURS = 8`):**

| Nível | Tries | Tempo |
|---|---|---|
| 10 → 11 | 12 | ~23 s |
| 14 → 15 (5º nível) | 290 | ~9,7 min |
| 19 → 20 | 1.160 | ~39 min |
| 24 → 25 (último) | 2.613 | ~1,45 h |
| **Porta (skill 25)** | 14.400 | **8 h** |

Alternativas se 8 h ainda parecer muito ou pouco: **6 h** (1º nível 17 s, último 1,09 h) · **12 h** (1º nível 35 s, último 2,18 h).

**Depois do Tier 1 (`POST_GATE_GROWTH = 1,3`):**

| Skill | Dias acumulados | Comentário |
|---|---|---|
| 30 | 1,0 | ainda no primeiro dia |
| 35 | 3,7 | híbrida: 7,4 dias em sequência, 3,7 dias com as duas vagas offline em paralelo |
| 38 | 8,0 | pura (paridade com a híbrida em sequência: 7,4 dias) |
| 40 | 13,5 | |
| 45 | 50 | a "parede" |
| 50 | 185 | |

Alternativas para `POST_GATE_GROWTH`: **1,25** (skill 40 em 8,6 d; 50 em 80 d) · **1,35** (40 em 21 d; 50 em 423 d) · **1,40** (40 em 33 d; 50 em 953 d).

Aviso: com **duas vagas offline**, quem treina os dois elementos de uma híbrida em paralelo termina na metade do tempo. É um bônus para quem joga offline; se não for desejado, subir o gate da híbrida para 38 e o da pura para 40.

### A5. Testes de aceite

1. `hoursToReach(id, 10, 25)` ≈ 8 h (±1%) para **todas** as 13 proficiências com `TIER1_HOURS = 8`; muda proporcionalmente com `runtime.tier1Hours = 12`.
2. `triesForNextLevel('melee', 10) === 12`, `('melee', 24) === 2613`, e `('melee', 25) === Math.round(2613 × 1,3)` (±1).
3. `hoursToReach(id, 10, 35) / 24` ≈ 3,7; `(10, 38) / 24` ≈ 8,0; `(10, 40) / 24` ≈ 13,5; `(10, 50) / 24` ≈ 185 (±2%).
4. Custo monotônico crescente entre 10 e 100 e sem `Infinity`/`NaN`.
5. A tela mostra números grandes formatados (`compact`) e o ETA em dias/meses (`formatEta` ganha "Xmeses" acima de 60 dias).
6. Os testes de `rpg.test.ts`, `phase2/phase3/tier1/tier2/balance.test.ts` que fixavam 132 h, 5,5 dias, 24,5/42/49 dias ou a pura em 40 são atualizados; a árvore segue com 62 nós e 46 subclasses.
7. Saves de teste com tries acima do novo limite normalizam no próximo `gainTries`.

---

## B. Hunts sem bloqueio

- `GameEngine.selectHunt(id, opts)`: **remover a checagem de `minLevel`**; continuar exigindo `status === 'idle'` e id válido. O parâmetro `ignoreLock` pode ser removido (e os usos no `dev`).
- `HuntDef.minLevel` passa a ser "nível mínimo sugerido" (usado só para aviso). Manter o campo.
- `HuntSelector.tsx`: nenhum cartão fica desabilitado por nível. Mostrar **"Recomendado: nível N"** e uma etiqueta:
  - **Tranquila** se o nível médio da party ≥ `recommendedLevel + 3`;
  - **Adequada** entre `recommendedLevel − 2` e `+2`;
  - **Arriscada** se a média < `recommendedLevel − 2`;
  - **Suicida** se a média < `recommendedLevel − 8`.
- Confirmação leve ao selecionar "Suicida" ("O grupo provavelmente será derrotado. Continuar?").
- O ciclo de recuperação (`recovering`) já cobre a derrota; nada a mudar.
- Testes: `hunts.test.ts` que esperava recusa por nível passa a esperar **aceite**; teste da etiqueta de risco pelos limites acima.

---

## C. Offline v2: 2 vagas por personagem e 25% da hunt mais avançada

### C1. Modelo (`rpg/profile.ts`)

```ts
offlineTargets: [ProficiencyId | null, ProficiencyId | null];   // substitui offlineTarget
offlineHistory: ProficiencyId[];                                // últimas escolhidas, mais recente primeiro (máx. 6, sem repetir)
lastTrained?: ProficiencyId;  prevTrained?: ProficiencyId;      // últimas duas treinadas de fato
```

- Migração de save: `offlineTargets = [offlineTarget ?? null, null]`, `offlineHistory = offlineTarget ? [offlineTarget] : []`; remover `offlineTarget`.
- `gainTries` mantém `lastTrained` e passa a guardar também `prevTrained` (a anterior, diferente da atual).
- `GameEngine.setOfflineTarget(id, slot, target)` (slot 0 ou 1): grava a vaga e empurra `target` para o começo de `offlineHistory` (remove duplicata, corta em 6). Vaga `null` = "não escolhida".
- **Foco elemental online** (regra existente): passa a ser o **primeiro elemento** entre `offlineTargets`; se nenhum for elemento, o elemento da primeira magia elemental equipada.

### C2. Quais proficiências treinam offline (`applyOfflineTraining`)

Ordem de decisão, sempre com **até 2 proficiências distintas**:

1. as duas vagas escolhidas (`offlineTargets`, ignorando `null`);
2. se sobrar vaga: as primeiras de `offlineHistory` que ainda não estão na lista;
3. se ainda sobrar: `lastTrained`, depois `prevTrained`.

Cada proficiência recebe `seconds × TRIES_PER_SECOND × OFFLINE_RATE × runtime.trainScale` tries (**no ritmo cheio**, independentes). Justificativa: online, arma (por tempo) e elemento (por cast) já treinam em paralelo. `OfflineResult` passa a ser uma lista `{ target, tries, levelsGained }[]`.

### C3. Recompensa da hunt offline

Constantes em `rpg/offline.ts`: `OFFLINE_HUNT_SHARE = 0.25` (ajustável por `dev.offlineShare(x)`), `OFFLINE_CAP_S = 24 h` (igual), `REF_MIN_ACTIVE_MS = 10 min`.

**Estatística por hunt** (novo, salva no estado): `GameState.huntStats: Record<huntId, { activeMs: number; xp: number; gold: number; bossKills: number }>`.
- Somar em `tick` (`activeMs`, em tempo simulado, o mesmo do Analyzer) e em `kill` (`xp` por personagem, `gold`, `bossKills` quando `def.boss`), usando `state.huntId`.
- Migração: `huntStats ??= {}`.

**Hunt de referência** = a de **maior índice em `HUNTS`** com `huntStats[id].bossKills ≥ 1` (padrão: Catacumbas).

**Taxas da hunt de referência:**
- `xpPerHour = xp / (activeMs / 3.600.000)`, `goldPerHour` idem, se `activeMs ≥ REF_MIN_ACTIVE_MS`;
- senão usar a referência estática do `HuntDef` (novos campos `refXpPerHour`, `refGoldPerHour`):

| Hunt | `refXpPerHour` | `refGoldPerHour` |
|---|---|---|
| Catacumbas | 24.000 | 5.000 |
| Floresta Sombria | 28.000 | 20.000 |
| Pântano Tóxico | 35.000 | 24.000 |
| Minas Esquecidas | 44.000 | 27.000 |
| Fortaleza de Gelo | 55.000 | 30.000 |
| Vulcão Ardente | 69.000 | 32.000 |
| Templo Profano | 86.000 | 34.000 |

**Crédito** (`GameEngine.applyOffline(gapSeconds)`), com `hours = min(gap, cap) / 3600`:
- **XP:** cada personagem da **equipe** ganha `OFFLINE_HUNT_SHARE × xpPerHour × hours` via `gainExperience` (níveis e pontos de talento sobem como no combate);
- **Ouro:** `state.gold += OFFLINE_HUNT_SHARE × goldPerHour × hours`;
- **Sem loot, sem contadores e sem alterar o Analyzer** (para não poluir XP/h e "monstros derrotados").
- Depois do crédito, `end()` (a caçada já é encerrada hoje).

### C4. UI

- `ProficiencyGrid` (`RpgPanels.tsx`): trocar o seletor único por **dois** ("Vaga 1" e "Vaga 2"), ambos com a opção "— (usar as últimas escolhidas)". Abaixo, uma linha: **"Se você fechar agora, treinam: {A} e {B}"**, calculada pelas regras da C2.
- Selo "Offline" nas proficiências das vagas escolhidas (já existe para uma; passa a aceitar duas).
- **Relatório de retorno** (`offlineReport`): "A hunt mais avançada (**{hunt}**) rendeu 25% durante {duração}", por personagem `+{XP} XP (+N níveis)`, ouro total, e por vaga `+{tries} tries em {proficiência} (+N níveis)`. Estender o tipo `OfflineReport` com `hunt`, `xp`, `gold` e a lista de vagas.

### C5. Testes de aceite

1. Duas vagas distintas recebem tries iguais a `seconds × 0,5` cada; vagas iguais contam uma vez.
2. Sem vagas, com `offlineHistory = [fire, melee, ice]`: treinam `fire` e `melee`.
3. Sem vagas nem histórico: treinam `lastTrained` e `prevTrained`.
4. Gap de 10 h com hunt de referência Floresta (`xpPerHour = 40.000` medido): cada personagem ganha `0,25 × 40.000 × 10 = 100.000` XP; ouro = `0,25 × goldPerHour × 10`.
5. Referência = maior hunt com chefe derrotado; entrar numa hunt sem derrotar o chefe **não** a torna referência.
6. Menos de 10 min ativos na hunt: usa a referência estática.
7. Gap de 60 h credita só 24 h (teto).
8. `analyzer.kills` e `analyzer.xp` **não** mudam com o offline; `huntStats` também não.
9. Save antigo (com `offlineTarget`) migra para `offlineTargets = [alvo, null]`.

---

## D. Sprites escolhíveis por personagem

### D1. Registro de sprites (novo `src/game/data/sprites.ts`)

```ts
export interface SpriteDef { id: string; name: string; scale: number; origin: readonly [number, number]; }
export const SPRITES: SpriteDef[] = [
  { id: 'necromancer', name: 'Necromante', scale: 0.18, origin: [0.5, 0.88] },
  // novos: acrescentar uma linha por sprite pronto
];
export const DEFAULT_SPRITE = 'block';   // bloco colorido da classe (o "sem arte" de hoje)
```

- `assets.ts`: `CHARACTER_SPRITES` passa a ser derivado de `SPRITES` (chave = `spriteId`, **não mais `ClassId`**); `characterFramePath(spriteId, direction, frame)` e `characterAnimationKey(spriteId, direction)` usam o id do sprite. Remover `ASSETS.characters` por classe.
- `Preloader.ts` (linhas 42–55): carregar e animar **todos** os sprites do registro; arquivo ausente **não** pode quebrar (o `loaderror` já existe para mapas; estender para sprites): o personagem cai no bloco colorido.
- `Game.ts` (linhas ~123 e ~165): trocar `CHARACTER_SPRITES[character.classId]` por `CHARACTER_SPRITES[character.spriteId]`. **Hoje o sprite `necromancer` não aparece para ninguém**, porque a busca é por `classId` e todos são `squire`.

### D2. Estado

- `Character.spriteId: string` (padrão na criação: `SPRITES[índice % SPRITES.length].id`, ou `'block'` se o registro estiver vazio).
- Migração: `spriteId ??= padrão`. Validação: id desconhecido cai em `'block'`, sem invalidar o save.
- `GameEngine.setSprite(charId, spriteId)`: livre e gratuito (cosmético), aceita `'block'` ou id do registro.
- **A evolução de classe nunca muda o sprite.**

### D3. UI

- `CreationScreen.tsx`: em cada card de personagem, um **seletor de sprite** (miniatura de `down_1.png` de cada sprite + opção "Bloco") ao lado de nome, arma, posição e elemento. Prévia do escolhido.
- `CharacterPanel.tsx` (aba Ficha): o mesmo seletor para trocar depois.
- Componente compartilhado `SpritePicker` (grade de miniaturas, seleção destacada, `aria-label` com o nome).

### D4. Formato do pacote de sprite (para gerar as imagens)

Pasta: `public/assets/characters/<id>/`. **8 arquivos PNG** com estes nomes exatos:

```
down_1.png   down_2.png     (de frente)
up_1.png     up_2.png       (de costas)
left_1.png   left_2.png     (olhando para a esquerda)
right_1.png  right_2.png    (olhando para a direita)
```

- Fundo **transparente** (RGBA), personagem inteiro, pés **centralizados na base**, uma escala única para os 8 quadros.
- Tamanho de referência (o do `necromancer`): entre **220–252 px de largura e 328–351 px de altura**. Manter algo próximo para que `scale: 0.18` sirva; outro tamanho pede outro `scale` no registro.
- Os dois quadros de cada direção são os passos da animação (6 quadros/s).
- Sugestão de ids para gerar (escolha à vontade; cosmético, independente de classe): `necromancer` (já existe), `squire`, `knight`, `archer`, `mage`, `monk`, `rogue`, `cleric`, `druid`, `bard`, `alchemist`, `mercenary`.

### D5. Testes de aceite

1. Cada `SpriteDef` gera 8 caminhos (`4 direções × 2 quadros`) e chaves de animação únicas; `assets.test.ts` cobre isso.
2. O jogo abre e roda com o registro contendo um sprite cujos PNGs **não existem** (cai no bloco, sem exceção).
3. `setSprite` altera só o personagem escolhido; evoluir de classe mantém o `spriteId`.
4. Save antigo sem `spriteId` carrega com o padrão.
5. Na criação, três personagens podem ter três sprites diferentes (ou o mesmo).

---

## E. Roteiro de teste manual (com acelerar hunt)

1. `npm run dev`; criar party com sprites/armas/elementos diferentes; escolher **Vaga 1 = Melee** e **Vaga 2 = Fogo** em um personagem.
2. Ativar **×25** e jogar: conferir a barra de Melee (primeiro nível em ~23 s de tempo simulado) e o ETA "faltam ~X para a porta do Tier 1 (Melee 25)".
3. Em ~8 h simulados (~20 min a ×25), abrir a aba **Classes**: Guerreiro/Caçador/Mago liberados para evoluir (nível ≥ 10 e skill 25).
4. Selecionar uma hunt **acima do nível**: deve aceitar com etiqueta "Arriscada/Suicida" (com confirmação no segundo caso).
5. Derrotar o chefe da Floresta; fechar a aba por alguns minutos (ou `dev.setLastSeen(10)` e recarregar): relatório mostra a hunt de referência, +25% de XP e ouro, tries nas duas vagas e a caçada encerrada.
6. Deixar as vagas vazias, fechar e reabrir: treinam as 2 últimas escolhidas.
7. `dev.paceHours(12)`: barras e ETA se recalculam; `dev.postGateGrowth(1.4)`: skill 45 mostra "~6 meses".

---

## F. Ordem e riscos

| Ordem | Bloco | Esforço | Observação |
|---|---|---|---|
| 1 | **A — Ritmo** | S | uma função e 3 constantes; atualizar testes |
| 2 | **B — Hunts livres** | S | remover uma checagem e ajustar o seletor |
| 3 | **C — Offline v2** | M | mexe em `profile`, `GameEngine`, `GameStore`, UI e migração |
| 4 | **D — Sprites** | M | mexe em `assets`, `Preloader`, `Game.ts`, criação e ficha |

Riscos: (1) mudança de `PACE_A` para função exige atualizar todos os usos e os testes de `balance`; (2) `offlineTarget` → `offlineTargets` é migração de save (considerar zerar saves de teste); (3) `COUNTER_TARGETS` continuam placeholders e a subclasse de Tier 2 agora chega em dias, então **recalibrar** com o Analyzer (críticos/h, dano sofrido/h, etc.) antes de abrir para outras pessoas.

---

## Anexo — Achados do Analyzer (NÃO implementar agora)

1. **Dificuldade:** 0 derrotas, 15 consumíveis em 685 ciclos, ~177 de dano por ciclo. O grupo equipado com o conjunto da Floresta (e nível ~16 em hunt de nível 8–13) passeia. Próximo passo: rodar o harness **com equipamento e nível reais** e subir HP/ataque dos monstros até o custo de poções voltar à faixa (≥ 15% do ouro por wave e HP mínimo ≤ 60%).
2. **Economia:** 315 mil de ouro (27 mil/h) sem sumidouro; poções custaram 0,1%. Antes de abrir para testadores: preços do Ferreiro por faixa, respec de talentos mais caro, upgrades de equipamento, taxas de recrutamento; e decidir se o ouro offline precisa de teto de estoque.
3. **XP acima do previsto:** 41 mil/h contra 28 mil/h projetados (ciclo de 62 s contra 88 s). O nível avança ~1,5× mais rápido que o desenho; recalibrar `XP` por monstro **junto** com o item 1 (monstros mais fortes reduzem o XP/h naturalmente).
4. **Cura = 0:** o kit do Squire não cura; ok até o Clérigo/Druida existirem.
