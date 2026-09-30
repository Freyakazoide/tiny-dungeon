# Tiny Dungeon — Itens de classe, Tier 1 (catálogo expandido)

> Substitui a versão anterior. **675 itens** base: 15 classes × 9 slots × 5 opções. Os dados completos estão em `items-tier1.json` (mesmo conteúdo, pronto para importar). Os números foram reequilibrados em relação à versão de 15 itens.

---

## 1. Regras

### 1.1 Quem pode usar cada item
- Cada item tem `classes: [...]` com ids de classe. O personagem pode equipar o item se **qualquer** id da lista estiver no seu `classPath`.
- **Itens de classe Tier 1 servem para todas as subclasses dela.** Um Glaciomante (ou qualquer subclasse do Mago) usa tudo o que é de Mago, porque o Mago continua no caminho dele.
- **Itens de subclasse (Tier 2) listam só o id da subclasse.** Só essa subclasse equipa. (Catálogo Tier 2 na próxima etapa.)
- Alguns itens Tier 1 são **compartilhados** entre classes (seção 4), como o Machado de Batalha (Guerreiro e Mestre Rúnico).
- Squire não equipa itens de classe.

### 1.2 Slots
Arma 1 mão · Arma 2 mãos · Mão secundária · Elmo · Armadura · Calças · Botas · Amuleto · Anel.

- Arma de 2 mãos bloqueia a mão secundária. **Exceção:** a *Aljava* (`offhandKind: quiver`) funciona com as armas de 2 mãos do Caçador.
- `offhandKind`: **shield** (dá Arm), **focus** (livro, orbe, tambor, totem…, sem Arm), **dual** (arma gêmea, só com arma de 1 mão) e **quiver**.
- O **Monge** luta com *Luvas* (arma de 1 mão) e pode usar talismã na mão secundária; o Bastão é de 2 mãos.

### 1.3 Duas camadas independentes
| Camada | O que define | Varia como |
|---|---|---|
| Qualidade da base | bônus fixo + passiva | Padrão · Superior · BiS |
| Classificação | atributos aleatórios | Comum 0 · Incomum 2 · Rara 3 · Lendária 4 · Mítica 5 |

### 1.4 Escada de cada slot (5 opções)
As 5 opções de cada slot seguem a ordem: **Padrão, Padrão, Superior, Superior, BiS**.

| Opção | Bônus fixo arma 1M | arma 2M | Demais slots | Arm (× base) | Passiva |
|---|---|---|---|---|---|
| 1 e 2 (Padrão) | +2 | +3 | +1 | ×1,0 / ×1,2 | nenhuma |
| 3 (Superior) | +3 | +4 | +2 | ×1,5 | 1 efeito (≈ nível 9 de um atributo) |
| 4 (Superior) | +4 +1 extra | +5 +1 extra | +2 | ×1,8 | 2 efeitos |
| 5 (BiS) | +5 +1 extra | +6 +1 extra | +3 | ×2,2 | 2 efeitos fortes |

- O bônus fixo é **+N níveis de proficiência** (Melee, Distância, Defesa, Magia ou elemento). Nenhum bônus cai em proficiência bloqueada de qualquer classe que use o item (validado pelo gerador).
- Itens com nome próprio de passiva (`mechanic`) têm uma regra especial e não têm o bônus numérico automático.

### 1.5 Arm por categoria de armadura (opção 1)
| Categoria | Elmo | Armadura | Calças | Botas | Escudo |
|---|---|---|---|---|---|
| Pesada | 5 | 12 | 8 | 4 | 10 |
| Média | 4 | 8 | 6 | 3 | 7 |
| Leve | 2 | 5 | 3 | 2 | 4 |

### 1.6 Atributos aleatórios (resumo)
Sorteio entre os 55 códigos do catálogo de talentos; nível inicial de 1 a 3, teto 12, forja soma 1 a 3; valor = `nível × unitPerRank × 0,33`. Peso 3 para o que combina com a classe, 1 para utilidade, 0,25 para ofensa que a classe não usa, 0 para elemento ou tries bloqueados.

Legenda das proficiências: **Mel** Melee · **Dist** Distância · **Def** Defesa · **Mag** Magia · **Fogo · Gelo · Ene · Ter · Ven · Sag · Mor · Fís · Psi**.

---

## 2. Catálogo por classe


### Guerreiro · armadura pesada


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Espada Longa *(também Guardião, Mestre Rúnico)* | Padrão | +2 Mel | — | — |
| 2 | Gládio de Legionário | Padrão | +2 Mel | — | — |
| 3 | Sabre do Comandante | Superior | +3 Mel | — | Dano crítico +9% |
| 4 | Espada Bastarda de Aço Negro | Superior | +4 Mel, +1 Def | — | Dano em área +6%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Lâmina do Campeão Imortal | BiS | +5 Mel, +1 Fís | — | Dano contra chefes e elites +9%; Velocidade de ataque +4% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Machado de Batalha *(também Mestre Rúnico)* | Padrão | +3 Mel | — | — |
| 2 | Montante de Guerra | Padrão | +3 Mel | — | — |
| 3 | Fendedor de Hordas | Superior | +4 Mel | — | +10% de dano em área |
| 4 | Alabarda do Cerco | Superior | +5 Mel, +1 Def | — | Dano em área +6%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Ceifador Carmesim | BiS | +6 Mel, +1 Fís | — | Cada abate: +2% de dano por 10 s (até 10×) |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Escudo de Torre *(também Guardião)* `shield` | Padrão | +1 Def | 10 | — |
| 2 | Broquel de Ferro `shield` | Padrão | +1 Def | 12 | — |
| 3 | Escudo de Aço Reforçado `shield` | Superior | +2 Def | 15 | Resistência +1,8% |
| 4 | Escudo do Legionário `shield` | Superior | +2 Def | 18 | Espinhos (dano refletido) +6%; Defesa +4% |
| 5 | Muralha Viva `shield` | BiS | +3 Def | 22 | Roubo de vida +2,4%; HP máximo +8% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Elmo de Ferro | Padrão | +1 Def | 5 | — |
| 2 | Elmo de Legionário | Padrão | +1 Mel | 6 | — |
| 3 | Elmo Chifrudo | Superior | +2 Def | 8 | XP ganho +4,5% |
| 4 | Elmo do Campeão | Superior | +2 Mel | 9 | Ouro ganho +6%; Eficácia das poções +6% |
| 5 | Coroa de Guerra do Invicto | BiS | +3 Def | 11 | Chance de drop +9%; Tries em Melee +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Couraça de Aço | Padrão | +1 Def | 12 | — |
| 2 | Cota de Placas | Padrão | +1 Fís | 14 | — |
| 3 | Peitoral do Veterano | Superior | +2 Def | 18 | Resistência +1,8% |
| 4 | Armadura de Escamas de Dragão | Superior | +2 Fís | 22 | Espinhos (dano refletido) +6%; Defesa +4% |
| 5 | Couraça do Invicto | BiS | +3 Def | 26 | Abaixo de 30% de HP: −15% de dano recebido |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Grevas de Aço | Padrão | +1 Mel | 8 | — |
| 2 | Calças de Malha Pesada | Padrão | +1 Def | 10 | — |
| 3 | Grevas do Veterano | Superior | +2 Mel | 12 | Resistência +1,8% |
| 4 | Couraceiras do Campeão | Superior | +2 Def | 14 | HP máximo +8%; Dano corpo a corpo +3% |
| 5 | Grevas do Titã | BiS | +3 Mel | 18 | Defesa +12%; Chance de crítico +2% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Campanha | Padrão | +1 Fís | 4 | — |
| 2 | Botas de Ferro | Padrão | +1 Mel | 5 | — |
| 3 | Botas do Marchador | Superior | +2 Fís | 6 | Chance de drop +4,5% |
| 4 | Sabatons do Campeão | Superior | +2 Mel | 7 | Eficácia das poções +12%; Peso de aggro +6% |
| 5 | Sabatons do Conquistador | BiS | +3 Fís | 9 | Tries em Melee +12%; Defesa +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Insígnia de Guerra | Padrão | +1 Mel | — | — |
| 2 | Colar de Dentes de Lobo | Padrão | +1 Def | — | — |
| 3 | Medalha de Valor | Superior | +2 Mel | — | Dano crítico +9% |
| 4 | Gorjal do Comandante | Superior | +2 Def | — | Dano em área +6%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Coração do Guerreiro Eterno | BiS | +3 Mel | — | Dano contra chefes e elites +9%; Velocidade de ataque +4% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Sinete do Veterano | Padrão | +1 Def | — | — |
| 2 | Anel de Ferro | Padrão | +1 Mel | — | — |
| 3 | Anel da Fúria Contida | Superior | +2 Fís | — | Chance de drop +4,5% |
| 4 | Anel do Campeão | Superior | +2 Def | — | Eficácia das poções +12%; Peso de aggro +6% |
| 5 | Anel do Rei Guerreiro | BiS | +3 Mel | — | Tries em Melee +12%; Dano corpo a corpo +6% |

### Guardião · armadura pesada


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Maça de Guarda | Padrão | +2 Def | — | — |
| 2 | Espada de Sentinela | Padrão | +2 Def | — | — |
| 3 | Martelo do Juramento | Superior | +3 Def | — | +15% de peso de aggro; escudo de 5% do HP no início da wave |
| 4 | Maça do Bastião | Superior | +4 Def, +1 Mel | — | Dano corpo a corpo +6%; Dano contra chefes e elites +3% |
| 5 | Martelo do Último Juramento | BiS | +5 Def, +1 Sag | — | Chance de crítico +3%; Dano corpo a corpo +6% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Lança de Sentinela | Padrão | +3 Def | — | — |
| 2 | Alabarda de Guarda | Padrão | +3 Def | — | — |
| 3 | Maça do Protetor | Superior | +4 Def | — | Dano contra chefes e elites +4,5% |
| 4 | Pique do Bastião | Superior | +5 Def, +1 Mel | — | Dano corpo a corpo +6%; Dano contra chefes e elites +3% |
| 5 | Lança do Guardião Eterno | BiS | +6 Def, +1 Mor | — | Chance de crítico +3%; Dano corpo a corpo +6% |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Escudo Bastião *(também Guerreiro)* `shield` | Padrão | +1 Def | 10 | — |
| 2 | Escudo da Guarda Real `shield` | Padrão | +1 Def | 12 | — |
| 3 | Escudo do Protetor `shield` | Superior | +2 Def | 15 | Resistência +1,8% |
| 4 | Égide de Sentinela `shield` | Superior | +2 Def | 18 | Força de escudos +8%; Cura recebida +4% |
| 5 | Égide de Adamante `shield` | BiS | +3 Def | 22 | +12% de espinhos; 1× por wave, golpe fatal deixa 15% de HP |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Elmo de Sentinela | Padrão | +1 Def | 5 | — |
| 2 | Elmo da Guarda | Padrão | +1 Def | 6 | — |
| 3 | Capacete do Protetor | Superior | +2 Def | 8 | Eficácia das poções +9% |
| 4 | Elmo do Bastião | Superior | +2 Def | 9 | XP ganho +6%; Potência dos buffs +3% |
| 5 | Elmo do Guardião Eterno | BiS | +3 Def | 11 | Tries em Defesa +12%; Defesa +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Peitoral do Bastião | Padrão | +1 Def | 12 | — |
| 2 | Couraça da Guarda | Padrão | +1 Sag | 14 | — |
| 3 | Armadura do Sentinela | Superior | +2 Def | 18 | Resistência +1,8% |
| 4 | Peitoral de Adamante | Superior | +2 Sag | 22 | Força de escudos +8%; Cura recebida +4% |
| 5 | Armadura do Último Bastião | BiS | +3 Def | 26 | +20% de cura recebida; escudo de 15% do HP a cada 20 s |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Grevas do Bastião | Padrão | +1 Def | 8 | — |
| 2 | Grevas da Guarda | Padrão | +1 Mor | 10 | — |
| 3 | Couraceiras do Protetor | Superior | +2 Def | 12 | Espinhos (dano refletido) +4,5% |
| 4 | Grevas de Adamante | Superior | +2 Mor | 14 | Força de escudos +8%; HP máximo +4% |
| 5 | Grevas do Muro Vivo | BiS | +3 Def | 18 | Resistência +3,5%; Defesa +8% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas do Juramento | Padrão | +1 Mor | 4 | — |
| 2 | Botas da Guarda | Padrão | +1 Sag | 5 | — |
| 3 | Botas do Protetor | Superior | +2 Mor | 6 | Tries em Defesa +6% |
| 4 | Sabatons de Adamante | Superior | +2 Sag | 7 | Potência dos buffs +6%; HP máximo +4% |
| 5 | Sabatons do Inabalável | BiS | +3 Mor | 9 | Defesa +12%; Resistência +2,4% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Medalhão do Protetor | Padrão | +1 Def | — | — |
| 2 | Símbolo da Guarda | Padrão | +1 Sag | — | — |
| 3 | Amuleto do Escudo | Superior | +2 Mor | — | Dano contra chefes e elites +4,5% |
| 4 | Medalhão do Juramento | Superior | +2 Def | — | Eficácia das poções +12%; Tries em Defesa +4% |
| 5 | Coração do Bastião | BiS | +3 Sag | — | XP ganho +9%; Potência dos buffs +6% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel da Promessa | Padrão | +1 Sag | — | — |
| 2 | Anel da Guarda | Padrão | +1 Def | — | — |
| 3 | Sinete do Protetor | Superior | +2 Mor | — | Tries em Defesa +6% |
| 4 | Anel do Juramento Eterno | Superior | +2 Sag | — | Potência dos buffs +6%; Chance de crítico +1% |
| 5 | Anel do Inabalável | BiS | +3 Def | — | Dano corpo a corpo +9%; Dano contra chefes e elites +6% |

### Ladino · armadura média


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Adaga de Aço | Padrão | +2 Mel | — | — |
| 2 | Punhal de Assassino | Padrão | +2 Mel | — | — |
| 3 | Lâmina Serpente | Superior | +3 Mel | — | Ataques têm 10% de chance de envenenar (+15% dano contínuo) |
| 4 | Adaga do Crepúsculo | Superior | +4 Mel, +1 Ven | — | Velocidade de ataque +4%; Dano contra chefes e elites +3% |
| 5 | Presa da Noite | BiS | +5 Mel, +1 Mor | — | +40% de dano crítico; crítico reduz 10% das recargas |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Alfanje Curvo | Padrão | +3 Mel | — | — |
| 2 | Sabre Sombrio de Duas Mãos | Padrão | +3 Mel | — | — |
| 3 | Foice das Sombras | Superior | +4 Mel | — | Dano crítico +9% |
| 4 | Ceifa-Garganta | Superior | +5 Mel, +1 Mor | — | Velocidade de ataque +4%; Dano contra chefes e elites +3% |
| 5 | Lâmina do Eclipse | BiS | +6 Mel, +1 Ven | — | Dano contra alvos abaixo de 30% de HP +12%; Dano contínuo +8% |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Adaga Gêmea `dual` | Padrão | +1 Mel | — | — |
| 2 | Punhal de Parry `dual` | Padrão | +1 Mor | — | — |
| 3 | Lâmina Gêmea Serpente `dual` | Superior | +2 Mel | — | XP ganho +4,5% |
| 4 | Adaga Sombra Gêmea `dual` | Superior | +2 Mor | — | Tries em Melee +8%; Dano corpo a corpo +3% |
| 5 | Presa Gêmea da Noite `dual` | BiS | +3 Mel | — | Eficácia das poções +18%; Chance de crítico +2% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Capuz de Couro | Padrão | +1 Mel | 4 | — |
| 2 | Máscara de Sombra | Padrão | +1 Fís | 5 | — |
| 3 | Capuz do Assassino | Superior | +2 Mel | 6 | Ouro ganho +4,5% |
| 4 | Capuz do Crepúsculo | Superior | +2 Fís | 7 | Chance de drop +6%; Tries em Melee +4% |
| 5 | Máscara do Mestre Ladrão | BiS | +3 Mel | 9 | XP ganho +9%; Eficácia das poções +12% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Gibão Sombrio | Padrão | +1 Fís | 8 | — |
| 2 | Couro Negro | Padrão | +1 Ven | 10 | — |
| 3 | Manto do Sicário | Superior | +2 Fís | 12 | Resistência +1,8% |
| 4 | Armadura de Couro de Serpente | Superior | +2 Ven | 14 | Redução de aggro +12%; HP máximo +4% |
| 5 | Manto do Mestre Ladrão | BiS | +3 Fís | 18 | −25% de peso de aggro; 1º golpe de cada wave é crítico garantido |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Couro | Padrão | +1 Ven | 6 | — |
| 2 | Calças Silenciosas | Padrão | +1 Mel | 7 | — |
| 3 | Calças do Sicário | Superior | +2 Ven | 9 | Resistência +1,8% |
| 4 | Calças de Couro de Serpente | Superior | +2 Mel | 11 | Defesa +8%; Dano corpo a corpo +3% |
| 5 | Calças do Ladrão Fantasma | BiS | +3 Ven | 13 | HP máximo +12%; Chance de crítico +2% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas Silenciosas | Padrão | +1 Mor | 3 | — |
| 2 | Botas de Couro Macio | Padrão | +1 Mel | 4 | — |
| 3 | Botas do Sicário | Superior | +2 Mor | 4 | XP ganho +4,5% |
| 4 | Botas Passo de Sombra | Superior | +2 Mel | 5 | Tries em Melee +8%; HP máximo +4% |
| 5 | Botas do Fantasma | BiS | +3 Mor | 7 | Eficácia das poções +18%; Defesa +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Talismã do Gatuno | Padrão | +1 Mel | — | — |
| 2 | Colar de Presa | Padrão | +1 Mor | — | — |
| 3 | Amuleto do Sicário | Superior | +2 Mel | — | Dano crítico +9% |
| 4 | Pingente de Veneno | Superior | +2 Mor | — | Velocidade de ataque +4%; Dano contra chefes e elites +3% |
| 5 | Amuleto da Lua Nova | BiS | +3 Mel | — | Dano contra alvos abaixo de 30% de HP +12%; Dano contínuo +8% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel Peçonhento | Padrão | +1 Ven | — | — |
| 2 | Anel do Gatuno | Padrão | +1 Mor | — | — |
| 3 | Anel da Adaga | Superior | +2 Mel | — | XP ganho +4,5% |
| 4 | Anel do Crepúsculo | Superior | +2 Ven | — | Tries em Melee +8%; Dano corpo a corpo +3% |
| 5 | Anel das Mil Facadas | BiS | +3 Mor | — | Eficácia das poções +18%; Chance de crítico +2% |

### Caçador · armadura média


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Besta de Mão | Padrão | +2 Dist | — | — |
| 2 | Besta de Mão Reforçada | Padrão | +2 Dist | — | — |
| 3 | Besta de Mão do Patrulheiro | Superior | +3 Dist | — | Dano crítico +9% |
| 4 | Besta de Mão de Precisão | Superior | +4 Dist, +1 Ter | — | Velocidade de ataque +4%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Besta de Mão do Falcão Real | BiS | +5 Dist, +1 Ter | — | Dano contra chefes e elites +9%; Dano em área +6% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Arco de Caça | Padrão | +3 Dist | — | — |
| 2 | Besta Pesada | Padrão | +3 Dist | — | — |
| 3 | Arco Longo de Teixo | Superior | +4 Dist | — | +12% de dano contra chefes e elites |
| 4 | Arco Composto do Patrulheiro | Superior | +5 Dist, +1 Ter | — | Velocidade de ataque +4%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Tempestade Alada | BiS | +6 Dist, +1 Fís | — | A cada 8 s, a próxima flecha atinge todos os alvos (60% do dano) |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Aljava de Caça `quiver` | Padrão | +1 Dist | — | — |
| 2 | Aljava de Couro Batido `quiver` | Padrão | +1 Dist | — | — |
| 3 | Aljava do Patrulheiro `quiver` | Superior | +2 Dist | — | XP ganho +4,5% |
| 4 | Aljava de Penas de Águia `quiver` | Superior | +2 Dist | — | Tries em Ranged +8%; Eficácia das poções +6% |
| 5 | Aljava Infinita `quiver` | BiS | +3 Dist | — | Valor de venda +9%; Dano à distância +6% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Chapéu de Patrulheiro | Padrão | +1 Dist | 4 | — |
| 2 | Capuz de Couro Verde | Padrão | +1 Ter | 5 | — |
| 3 | Chapéu de Penas | Superior | +2 Dist | 6 | Chance de drop +4,5% |
| 4 | Capuz do Caçador de Elite | Superior | +2 Ter | 7 | Ouro ganho +6%; Tries em Ranged +4% |
| 5 | Coroa do Olho de Águia | BiS | +3 Dist | 9 | XP ganho +9%; Valor de venda +6% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Couro Batido | Padrão | +1 Ter | 8 | — |
| 2 | Gibão de Caça | Padrão | +1 Fís | 10 | — |
| 3 | Couro de Lobo Cinzento | Superior | +2 Ter | 12 | Resistência +1,8% |
| 4 | Couro de Wyvern | Superior | +2 Fís | 14 | Redução de aggro +12%; Defesa +4% |
| 5 | Manto do Caçador Fantasma | BiS | +3 Ter | 18 | +20% de dano em alvos abaixo de 30% de HP |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Caça | Padrão | +1 Dist | 6 | — |
| 2 | Calças de Couro Verde | Padrão | +1 Ter | 7 | — |
| 3 | Calças do Patrulheiro | Superior | +2 Dist | 9 | Defesa +6% |
| 4 | Calças de Wyvern | Superior | +2 Ter | 11 | HP máximo +8%; Chance de crítico +1% |
| 5 | Calças do Olho de Águia | BiS | +3 Dist | 13 | Dano à distância +9%; Dano crítico +12% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Trilha | Padrão | +1 Fís | 3 | — |
| 2 | Botas de Caça | Padrão | +1 Dist | 4 | — |
| 3 | Botas do Rastreador | Superior | +2 Fís | 4 | XP ganho +4,5% |
| 4 | Botas de Wyvern | Superior | +2 Dist | 5 | Tries em Ranged +8%; Eficácia das poções +6% |
| 5 | Botas do Vento Silencioso | BiS | +3 Fís | 7 | Valor de venda +9%; HP máximo +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Pingente de Presa | Padrão | +1 Dist | — | — |
| 2 | Amuleto de Garra | Padrão | +1 Ter | — | — |
| 3 | Colar de Penas | Superior | +2 Dist | — | Dano crítico +9% |
| 4 | Amuleto do Rastreador | Superior | +2 Ter | — | Velocidade de ataque +4%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Olho de Águia Dourado | BiS | +3 Dist | — | Dano contra chefes e elites +9%; Dano em área +6% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel do Falcão | Padrão | +1 Ter | — | — |
| 2 | Anel de Pena | Padrão | +1 Dist | — | — |
| 3 | Anel do Rastreador | Superior | +2 Fís | — | XP ganho +4,5% |
| 4 | Anel da Mira Perfeita | Superior | +2 Ter | — | Tries em Ranged +8%; Eficácia das poções +6% |
| 5 | Anel da Caçada Final | BiS | +3 Dist | — | Valor de venda +9%; Dano à distância +6% |

### Mago · armadura leve


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Varinha de Carvalho *(também Bardo, Ilusionista)* | Padrão | +2 Mag | — | — |
| 2 | Varinha de Cristal | Padrão | +2 Mag | — | — |
| 3 | Varinha de Ébano Arcana | Superior | +3 Mag | — | Dano crítico +9% |
| 4 | Varinha do Erudito | Superior | +4 Mag, +1 Fogo | — | Redução de recarga +4%; Dano do elemento em foco +3% |
| 5 | Varinha da Estrela Cadente | BiS | +5 Mag, +1 Gelo | — | Dano em área +9%; Dano contra chefes e elites +6% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Cajado Arcano *(também Mestre Rúnico, Druida)* | Padrão | +3 Mag | — | — |
| 2 | Cajado de Cristal | Padrão | +3 Mag | — | — |
| 3 | Cajado do Aprendiz Prodígio | Superior | +4 Mag | — | −8% de recarga das magias |
| 4 | Cajado do Erudito | Superior | +5 Mag, +1 Fogo | — | Redução de recarga +4%; Dano do elemento em foco +3% |
| 5 | Cajado da Convergência | BiS | +6 Mag, +1 Gelo | — | Cada magia lançada: +3% de dano mágico por 6 s (até 8×) |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Grimório de Aprendiz `focus` | Padrão | +1 Mag | — | — |
| 2 | Orbe de Cristal `focus` | Padrão | +1 Fogo | — | — |
| 3 | Tomo do Erudito `focus` | Superior | +2 Gelo | — | XP ganho +4,5% |
| 4 | Grimório Arcano `focus` | Superior | +2 Ene | — | Chance de drop +6%; Eficácia das poções +6% |
| 5 | Orbe da Convergência `focus` | BiS | +3 Ter | — | Ouro ganho +9%; Dano mágico +6% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Chapéu de Mago | Padrão | +1 Mag | 2 | — |
| 2 | Capuz Arcano | Padrão | +1 Gelo | 2 | — |
| 3 | Chapéu de Estrelas | Superior | +2 Ene | 3 | Regeneração de mana +12% |
| 4 | Coroa do Erudito | Superior | +2 Ter | 4 | Tries em Magia +8%; Chance de drop +3% |
| 5 | Tiara do Arquimago | BiS | +3 Fogo | 4 | XP ganho +9%; Ouro ganho +6% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Manto Arcano | Padrão | +1 Mag | 5 | — |
| 2 | Túnica de Seda Mágica | Padrão | +1 Ene | 6 | — |
| 3 | Manto do Erudito | Superior | +2 Ter | 8 | HP máximo +6% |
| 4 | Manto Astral | Superior | +2 Fogo | 9 | Resistência +2,4%; Mana máxima +4% |
| 5 | Manto do Arquimago | BiS | +3 Gelo | 11 | +25% de regeneração de mana; abaixo de 20% de mana, restaura 30% (1× por wave) |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Seda | Padrão | +1 Mag | 3 | — |
| 2 | Calças Arcanas | Padrão | +1 Ter | 4 | — |
| 3 | Calças do Erudito | Superior | +2 Fogo | 4 | HP máximo +6% |
| 4 | Calças Astrais | Superior | +2 Gelo | 5 | Força de escudos +8%; Dano mágico +3% |
| 5 | Calças do Arquimago | BiS | +3 Ene | 7 | Mana máxima +12%; Chance de crítico +2% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Sandálias Arcanas | Padrão | +1 Mag | 2 | — |
| 2 | Botas de Seda | Padrão | +1 Ven | 2 | — |
| 3 | Botas do Erudito | Superior | +2 Sag | 3 | XP ganho +4,5% |
| 4 | Botas Astrais | Superior | +2 Mor | 4 | Chance de drop +6%; Eficácia das poções +6% |
| 5 | Sandálias do Arquimago | BiS | +3 Fís | 4 | Ouro ganho +9%; Mana máxima +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Colar de Cristal | Padrão | +1 Mag | — | — |
| 2 | Amuleto de Mana | Padrão | +1 Psi | — | — |
| 3 | Pingente do Erudito | Superior | +2 Mor | — | Dano crítico +9% |
| 4 | Amuleto Astral | Superior | +2 Ven | — | Redução de recarga +4%; Dano do elemento em foco +3% |
| 5 | Olho do Arquimago | BiS | +3 Sag | — | Dano em área +9%; Dano contra chefes e elites +6% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Foco | Padrão | +1 Mag | — | — |
| 2 | Anel de Mana | Padrão | +1 Fís | — | — |
| 3 | Anel do Erudito | Superior | +2 Psi | — | XP ganho +4,5% |
| 4 | Anel Astral | Superior | +2 Fogo | — | Chance de drop +6%; Eficácia das poções +6% |
| 5 | Anel da Convergência | BiS | +3 Gelo | — | Ouro ganho +9%; Dano mágico +6% |

### Clérigo · armadura média


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Maça Sagrada | Padrão | +2 Sag | — | — |
| 2 | Maça da Fé | Padrão | +2 Sag | — | — |
| 3 | Cetro da Misericórdia | Superior | +3 Sag | — | +15% de poder de cura |
| 4 | Maça do Peregrino Santo | Superior | +4 Sag, +1 Mag | — | Chance de crítico +2%; Dano Sagrado +3% |
| 5 | Martelo da Aurora | BiS | +5 Sag, +1 Def | — | Redução de recarga +6%; Dano mágico +6% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Cajado de Peregrino | Padrão | +3 Sag | — | — |
| 2 | Cajado da Fé | Padrão | +3 Sag | — | — |
| 3 | Cajado do Sacerdote | Superior | +4 Sag | — | Poder de cura +6% |
| 4 | Bordão Consagrado | Superior | +5 Sag, +1 Mag | — | Chance de crítico +2%; Dano Sagrado +3% |
| 5 | Cajado do Amanhecer | BiS | +6 Sag, +1 Def | — | Cura excedente vira escudo (até 20% do HP); +10% de poder de cura |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Livro de Orações *(também Bardo)* `focus` | Padrão | +1 Sag | — | — |
| 2 | Escudo de Fé `shield` | Padrão | +1 Def | 8 | — |
| 3 | Relicário Sagrado `focus` | Superior | +2 Sag | — | Regeneração de mana +12% |
| 4 | Escudo do Peregrino `shield` | Superior | +2 Def | 13 | Cura recebida +8%; Força de escudos +4% |
| 5 | Escudo da Aurora `shield` | BiS | +3 Sag | 15 | Defesa +12%; HP máximo +8% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Mitra de Fé | Padrão | +1 Sag | 4 | — |
| 2 | Capuz Consagrado | Padrão | +1 Mag | 5 | — |
| 3 | Mitra do Sacerdote | Superior | +2 Sag | 6 | Potência dos buffs +4,5% |
| 4 | Coroa de Luz | Superior | +2 Mag | 7 | Duração dos buffs +12%; Tries em Sagrado +4% |
| 5 | Halo do Amanhecer | BiS | +3 Sag | 9 | Regeneração de mana +24%; Eficácia das poções +12% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Hábito Consagrado | Padrão | +1 Def | 8 | — |
| 2 | Túnica Sagrada | Padrão | +1 Sag | 10 | — |
| 3 | Vestes do Sacerdote | Superior | +2 Def | 12 | Resistência +1,8% |
| 4 | Armadura de Luz | Superior | +2 Sag | 14 | Cura recebida +8%; Força de escudos +4% |
| 5 | Vestes da Graça | BiS | +3 Def | 18 | Aliados abaixo de 30% de HP recebem −20% de dano |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Peregrino | Padrão | +1 Mag | 6 | — |
| 2 | Calças Consagradas | Padrão | +1 Def | 7 | — |
| 3 | Calças do Sacerdote | Superior | +2 Mag | 9 | Resistência +1,8% |
| 4 | Calças de Luz | Superior | +2 Def | 11 | HP máximo +8%; Dano Sagrado +3% |
| 5 | Calças da Graça | BiS | +3 Mag | 13 | Força de escudos +12%; Dano mágico +6% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Sandálias Sagradas | Padrão | +1 Sag | 3 | — |
| 2 | Botas de Peregrino | Padrão | +1 Mag | 4 | — |
| 3 | Botas do Sacerdote | Superior | +2 Sag | 4 | Regeneração de mana +12% |
| 4 | Botas de Luz | Superior | +2 Mag | 5 | Tries em Sagrado +8%; Força de escudos +4% |
| 5 | Sandálias da Graça | BiS | +3 Sag | 7 | Eficácia das poções +18%; HP máximo +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Símbolo Sagrado | Padrão | +1 Sag | — | — |
| 2 | Crucifixo de Prata | Padrão | +1 Mag | — | — |
| 3 | Medalhão da Fé | Superior | +2 Sag | — | Poder de cura +6% |
| 4 | Amuleto de Luz | Superior | +2 Mag | — | Chance de crítico +2%; Potência dos buffs +3% |
| 5 | Relíquia da Aurora | BiS | +3 Sag | — | Redução de recarga +6%; Duração dos buffs +12% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Bênção | Padrão | +1 Mag | — | — |
| 2 | Anel de Prata | Padrão | +1 Sag | — | — |
| 3 | Anel do Sacerdote | Superior | +2 Def | — | Regeneração de mana +12% |
| 4 | Anel de Luz | Superior | +2 Mag | — | Tries em Sagrado +8%; Dano Sagrado +3% |
| 5 | Anel da Graça Divina | BiS | +3 Sag | — | Eficácia das poções +18%; Dano mágico +6% |

### Bardo · armadura leve


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Flauta de Prata | Padrão | +2 Mag | — | — |
| 2 | Violino Afinado | Padrão | +2 Mag | — | — |
| 3 | Flauta Encantada | Superior | +3 Mag | — | Potência dos buffs +4,5% |
| 4 | Bandolim do Trovador | Superior | +4 Mag, +1 Psi | — | Redução de recarga +4%; Dano mágico +3% |
| 5 | Lira Celeste | BiS | +5 Mag, +1 Sag | — | Chance de crítico +3%; Dano Psíquico +6% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Alaúde de Guerra | Padrão | +3 Mag | — | — |
| 2 | Harpa de Batalha | Padrão | +3 Mag | — | — |
| 3 | Alaúde Harmônico | Superior | +4 Mag | — | +12% de potência dos buffs |
| 4 | Harpa Encantada | Superior | +5 Mag, +1 Psi | — | Redução de recarga +4%; Dano mágico +3% |
| 5 | Lira do Crescendo | BiS | +6 Mag, +1 Sag | — | Buffs ativos reduzem 8% da recarga das magias da equipe; +20% de duração dos buffs |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Tamborim `focus` | Padrão | +1 Psi | — | — |
| 2 | Pandeiro Encantado `focus` | Padrão | +1 Mag | — | — |
| 3 | Címbalos de Guerra `focus` | Superior | +2 Psi | — | XP ganho +4,5% |
| 4 | Tambor do Maestro `focus` | Superior | +2 Mag | — | Ouro ganho +6%; Dano mágico +3% |
| 5 | Sino do Crescendo `focus` | BiS | +3 Psi | — | Tries em Magia +12%; Dano Psíquico +6% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Chapéu de Menestrel | Padrão | +1 Mag | 2 | — |
| 2 | Boina de Trovador | Padrão | +1 Psi | 2 | — |
| 3 | Chapéu de Penas Coloridas | Superior | +2 Mag | 3 | Duração dos buffs +9% |
| 4 | Chapéu do Virtuose | Superior | +2 Psi | 4 | Potência dos buffs +6%; Ouro ganho +3% |
| 5 | Coroa do Maestro | BiS | +3 Mag | 4 | XP ganho +9%; Tries em Magia +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Casaco de Trovador | Padrão | +1 Psi | 5 | — |
| 2 | Colete de Palco | Padrão | +1 Sag | 6 | — |
| 3 | Casaca do Virtuose | Superior | +2 Psi | 8 | Resistência +1,8% |
| 4 | Casaco Encantado | Superior | +2 Sag | 9 | Regeneração de mana +16%; Força de escudos +4% |
| 5 | Casaca do Maestro | BiS | +3 Psi | 11 | A cada 30 s, a equipe ganha +15% de ataque e velocidade por 6 s |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Palco | Padrão | +1 Sag | 3 | — |
| 2 | Calças de Trovador | Padrão | +1 Mag | 4 | — |
| 3 | Calças do Virtuose | Superior | +2 Sag | 4 | Força de escudos +6% |
| 4 | Calças Encantadas | Superior | +2 Mag | 5 | HP máximo +8%; Dano Psíquico +3% |
| 5 | Calças do Maestro | BiS | +3 Sag | 7 | Dano mágico +9%; Potência dos buffs +6% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Dança | Padrão | +1 Mag | 2 | — |
| 2 | Sapatos de Palco | Padrão | +1 Psi | 2 | — |
| 3 | Botas do Virtuose | Superior | +2 Mag | 3 | XP ganho +4,5% |
| 4 | Botas Encantadas | Superior | +2 Psi | 4 | Ouro ganho +6%; HP máximo +4% |
| 5 | Botas do Maestro | BiS | +3 Mag | 4 | Tries em Magia +12%; Força de escudos +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Medalhão de Canções | Padrão | +1 Mag | — | — |
| 2 | Flauta de Pingente | Padrão | +1 Sag | — | — |
| 3 | Colar do Virtuose | Superior | +2 Mag | — | Potência dos buffs +4,5% |
| 4 | Amuleto Harmônico | Superior | +2 Sag | — | Redução de recarga +4%; Duração dos buffs +6% |
| 5 | Medalhão do Maestro | BiS | +3 Mag | — | Chance de crítico +3%; XP ganho +6% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Afinação | Padrão | +1 Psi | — | — |
| 2 | Anel do Trovador | Padrão | +1 Mag | — | — |
| 3 | Anel do Virtuose | Superior | +2 Psi | — | XP ganho +4,5% |
| 4 | Anel Harmônico | Superior | +2 Mag | — | Ouro ganho +6%; Dano mágico +3% |
| 5 | Anel do Crescendo | BiS | +3 Psi | — | Tries em Magia +12%; Dano Psíquico +6% |

### Monge · armadura média


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Luvas de Combate | Padrão | +2 Fís | — | — |
| 2 | Ataduras de Ferro | Padrão | +2 Fís | — | — |
| 3 | Garras de Tigre | Superior | +3 Fís | — | Velocidade de ataque +3% |
| 4 | Punhos do Dragão Menor | Superior | +4 Fís, +1 Mel | — | +10% de velocidade de ataque |
| 5 | Luvas do Sétimo Céu | BiS | +5 Fís, +1 Mag | — | A cada 5 ataques, golpe extra de 150% de dano |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Bastão de Bambu | Padrão | +3 Fís | — | — |
| 2 | Bo de Carvalho | Padrão | +3 Fís | — | — |
| 3 | Bastão do Monge Errante | Superior | +4 Fís | — | Velocidade de ataque +3% |
| 4 | Bastão Celestial | Superior | +5 Fís, +1 Mel | — | Chance de crítico +2%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Bastão do Dragão Dourado | BiS | +6 Fís, +1 Mag | — | Dano crítico +18%; Dano Físico (magia) +6% |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Talismã de Oração `focus` | Padrão | +1 Mag | — | — |
| 2 | Contas de Mão `focus` | Padrão | +1 Def | — | — |
| 3 | Selo do Templo `focus` | Superior | +2 Mag | — | Eficácia das poções +9% |
| 4 | Sino do Templo `focus` | Superior | +2 Def | — | Chance de drop +6%; Dano corpo a corpo +3% |
| 5 | Orbe do Chi `focus` | BiS | +3 Mag | — | Dano Físico (magia) +9%; Velocidade de ataque +4% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Bandana de Treino | Padrão | +1 Fís | 4 | — |
| 2 | Faixa de Seda | Padrão | +1 Mel | 5 | — |
| 3 | Capuz do Templo | Superior | +2 Fís | 6 | Tries em Físico +6% |
| 4 | Faixa do Mestre | Superior | +2 Mel | 7 | XP ganho +6%; Chance de drop +3% |
| 5 | Coroa do Chi | BiS | +3 Fís | 9 | Eficácia das poções +18%; HP máximo +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Kimono de Combate | Padrão | +1 Def | 8 | — |
| 2 | Túnica de Treino | Padrão | +1 Fís | 10 | — |
| 3 | Hábito do Templo | Superior | +2 Def | 12 | Resistência +1,8% |
| 4 | Kimono do Mestre | Superior | +2 Fís | 14 | Roubo de vida +1,6%; HP máximo +4% |
| 5 | Kimono do Mestre Supremo | BiS | +3 Def | 18 | +20% de cura recebida; 4% de roubo de vida |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Treino | Padrão | +1 Mel | 6 | — |
| 2 | Calças de Combate | Padrão | +1 Fís | 7 | — |
| 3 | Calças do Templo | Superior | +2 Mel | 9 | Resistência +1,8% |
| 4 | Calças do Mestre | Superior | +2 Fís | 11 | Defesa +8%; Dano Físico (magia) +3% |
| 5 | Calças do Dragão | BiS | +3 Mel | 13 | HP máximo +12%; Dano corpo a corpo +6% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Sandálias de Monge | Padrão | +1 Fís | 3 | — |
| 2 | Botas de Pano | Padrão | +1 Def | 4 | — |
| 3 | Sandálias do Templo | Superior | +2 Fís | 4 | Eficácia das poções +9% |
| 4 | Botas do Mestre | Superior | +2 Def | 5 | Chance de drop +6%; Defesa +4% |
| 5 | Sandálias do Vento | BiS | +3 Fís | 7 | HP máximo +12%; Resistência +2,4% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Contas de Meditação | Padrão | +1 Fís | — | — |
| 2 | Colar de Madeira | Padrão | +1 Mag | — | — |
| 3 | Amuleto do Templo | Superior | +2 Fís | — | Velocidade de ataque +3% |
| 4 | Colar do Mestre | Superior | +2 Mag | — | Chance de crítico +2%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Contas do Sétimo Céu | BiS | +3 Fís | — | Dano crítico +18%; Tries em Físico +8% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Disciplina | Padrão | +1 Mag | — | — |
| 2 | Anel de Jade | Padrão | +1 Fís | — | — |
| 3 | Anel do Templo | Superior | +2 Mel | — | Eficácia das poções +9% |
| 4 | Anel do Mestre | Superior | +2 Mag | — | Chance de drop +6%; Dano corpo a corpo +3% |
| 5 | Anel do Chi Perfeito | BiS | +3 Fís | — | Dano Físico (magia) +9%; Velocidade de ataque +4% |

### Bruxo · armadura leve


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Adaga Ritual *(também Ladino)* | Padrão | +2 Mor | — | — |
| 2 | Punhal Sacrificial | Padrão | +2 Mor | — | — |
| 3 | Lâmina da Cripta | Superior | +3 Mor | — | Dano contínuo +6% |
| 4 | Adaga de Osso Negro | Superior | +4 Mor, +1 Ven | — | Dano contra alvos abaixo de 30% de HP +8%; Chance de crítico +1% |
| 5 | Faca do Último Sacrifício | BiS | +5 Mor, +1 Mag | — | Roubo de vida +2,4%; Dano de Morte +6% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Cajado de Osso | Padrão | +3 Mor | — | — |
| 2 | Cajado Sombrio | Padrão | +3 Mor | — | — |
| 3 | Cajado do Ceifador | Superior | +4 Mor | — | +20% de dano contínuo |
| 4 | Bordão do Necromante | Superior | +5 Mor, +1 Ven | — | Dano contra alvos abaixo de 30% de HP +8%; Chance de crítico +1% |
| 5 | Foice da Colheita Eterna | BiS | +6 Mor, +1 Mag | — | Magias de Morte curam 6% do dano causado |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Grimório Proibido `focus` | Padrão | +1 Mor | — | — |
| 2 | Crânio Ritual `focus` | Padrão | +1 Mag | — | — |
| 3 | Tomo da Cripta `focus` | Superior | +2 Mor | — | XP ganho +4,5% |
| 4 | Lanterna de Almas `focus` | Superior | +2 Mag | — | Chance de drop +6%; Dano mágico +3% |
| 5 | Grimório das Mil Almas `focus` | BiS | +3 Mor | — | Dano de Morte +9%; Dano contínuo +8% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Capuz de Cultista | Padrão | +1 Mor | 2 | — |
| 2 | Máscara de Osso | Padrão | +1 Ven | 2 | — |
| 3 | Capuz da Cripta | Superior | +2 Mor | 3 | Regeneração de mana +12% |
| 4 | Coroa de Ossos | Superior | +2 Ven | 4 | Tries em Morte +8%; Chance de drop +3% |
| 5 | Capuz do Lich Menor | BiS | +3 Mor | 4 | XP ganho +9%; HP máximo +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Manto Fúnebre | Padrão | +1 Ven | 5 | — |
| 2 | Túnica de Cultista | Padrão | +1 Mor | 6 | — |
| 3 | Manto da Cripta | Superior | +2 Ven | 8 | Resistência +1,8% |
| 4 | Manto de Almas | Superior | +2 Mor | 9 | Força de escudos +8%; Mana máxima +4% |
| 5 | Mortalha do Lich Menor | BiS | +3 Ven | 11 | +25% de dano em alvos abaixo de 30% de HP |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Cultista | Padrão | +1 Mag | 3 | — |
| 2 | Calças Fúnebres | Padrão | +1 Mor | 4 | — |
| 3 | Calças da Cripta | Superior | +2 Mag | 4 | Mana máxima +6% |
| 4 | Calças de Almas | Superior | +2 Mor | 5 | HP máximo +8%; Dano mágico +3% |
| 5 | Calças do Lich Menor | BiS | +3 Mag | 7 | Dano de Morte +9%; Dano contínuo +8% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Cinzas | Padrão | +1 Mor | 2 | — |
| 2 | Botas Fúnebres | Padrão | +1 Ven | 2 | — |
| 3 | Botas da Cripta | Superior | +2 Mor | 3 | XP ganho +4,5% |
| 4 | Botas de Almas | Superior | +2 Ven | 4 | Chance de drop +6%; Mana máxima +4% |
| 5 | Botas do Lich Menor | BiS | +3 Mor | 4 | HP máximo +12%; Resistência +2,4% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Amuleto de Crânio | Padrão | +1 Mor | — | — |
| 2 | Colar de Ossos | Padrão | +1 Mag | — | — |
| 3 | Amuleto da Cripta | Superior | +2 Mor | — | Dano contínuo +6% |
| 4 | Colar de Almas | Superior | +2 Mag | — | Dano contra alvos abaixo de 30% de HP +8%; Chance de crítico +1% |
| 5 | Filactério Menor | BiS | +3 Mor | — | Roubo de vida +2,4%; Regeneração de mana +16% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel Sombrio | Padrão | +1 Ven | — | — |
| 2 | Anel de Osso | Padrão | +1 Mor | — | — |
| 3 | Anel da Cripta | Superior | +2 Mag | — | XP ganho +4,5% |
| 4 | Anel de Almas | Superior | +2 Ven | — | Chance de drop +6%; Dano mágico +3% |
| 5 | Anel do Sacrifício Eterno | BiS | +3 Mor | — | Dano de Morte +9%; Dano contínuo +8% |

### Alquimista · armadura leve


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Frasco Corrosivo | Padrão | +2 Ven | — | — |
| 2 | Frasco de Ácido | Padrão | +2 Ven | — | — |
| 3 | Frasco Instável | Superior | +3 Ven | — | +15% de dano contínuo; +15% de eficácia das poções |
| 4 | Retorta Fervente | Superior | +4 Ven, +1 Fogo | — | Dano em área +6%; Dano de Veneno +3% |
| 5 | Athanor da Pedra Filosofal | BiS | +5 Ven, +1 Mag | — | Alvos envenenados recebem +10% de dano de todas as fontes |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Lançador de Frascos | Padrão | +3 Dist | — | — |
| 2 | Mangual de Reagentes | Padrão | +3 Dist | — | — |
| 3 | Bastão de Destilação | Superior | +4 Dist | — | Dano à distância +4,5% |
| 4 | Lançador Pressurizado | Superior | +5 Dist, +1 Ven | — | Dano em área +6%; Dano de Veneno +3% |
| 5 | Alambique de Guerra | BiS | +6 Dist, +1 Fogo | — | Chance de crítico +3%; Dano contínuo +8% |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Bolsa de Reagentes `focus` | Padrão | +1 Mag | — | — |
| 2 | Cinto de Frascos `focus` | Padrão | +1 Ven | — | — |
| 3 | Bolsa de Elixires `focus` | Superior | +2 Mag | — | Valor de venda +4,5% |
| 4 | Caldeirão Portátil `focus` | Superior | +2 Ven | — | Chance de drop +6%; Dano de Veneno +3% |
| 5 | Bolsa da Pedra Filosofal `focus` | BiS | +3 Mag | — | Tries em Veneno +12%; Dano contínuo +8% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Óculos de Laboratório | Padrão | +1 Ven | 2 | — |
| 2 | Máscara de Gás | Padrão | +1 Fogo | 2 | — |
| 3 | Capuz de Destilador | Superior | +2 Ven | 3 | Eficácia das poções +9% |
| 4 | Óculos de Alquimista Mestre | Superior | +2 Fogo | 4 | Ouro ganho +6%; Chance de drop +3% |
| 5 | Coroa do Grão-Mestre | BiS | +3 Ven | 4 | Valor de venda +9%; Tries em Veneno +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Avental de Couro | Padrão | +1 Fogo | 5 | — |
| 2 | Avental Reforçado | Padrão | +1 Ven | 6 | — |
| 3 | Jaleco de Destilador | Superior | +2 Fogo | 8 | Defesa +6% |
| 4 | Avental de Dragão | Superior | +2 Ven | 9 | Mana máxima +8%; Resistência +1,2% |
| 5 | Avental do Grão-Mestre | BiS | +3 Fogo | 11 | +40% de eficácia das poções; +10% de ouro |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Oficina | Padrão | +1 Dist | 3 | — |
| 2 | Calças Resistentes a Ácido | Padrão | +1 Fogo | 4 | — |
| 3 | Calças de Destilador | Superior | +2 Dist | 4 | Resistência +1,8% |
| 4 | Calças de Escama | Superior | +2 Fogo | 5 | HP máximo +8%; Dano contínuo +4% |
| 5 | Calças do Grão-Mestre | BiS | +3 Dist | 7 | Dano de Veneno +9%; Dano à distância +6% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Borracha | Padrão | +1 Ven | 2 | — |
| 2 | Botas Resistentes | Padrão | +1 Mag | 2 | — |
| 3 | Botas de Destilador | Superior | +2 Ven | 3 | Valor de venda +4,5% |
| 4 | Botas de Escama | Superior | +2 Mag | 4 | Chance de drop +6%; HP máximo +4% |
| 5 | Botas do Grão-Mestre | BiS | +3 Ven | 4 | Tries em Veneno +12%; Resistência +2,4% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Vidro de Essência | Padrão | +1 Ven | — | — |
| 2 | Frasco Pingente | Padrão | +1 Dist | — | — |
| 3 | Colar de Elixir | Superior | +2 Ven | — | Dano à distância +4,5% |
| 4 | Amuleto do Destilador | Superior | +2 Dist | — | Dano em área +6%; Eficácia das poções +6% |
| 5 | Essência da Pedra Filosofal | BiS | +3 Ven | — | Chance de crítico +3%; Ouro ganho +6% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Catalisador | Padrão | +1 Fogo | — | — |
| 2 | Anel de Cobre | Padrão | +1 Ven | — | — |
| 3 | Anel do Destilador | Superior | +2 Mag | — | Valor de venda +4,5% |
| 4 | Anel de Mercúrio | Superior | +2 Fogo | — | Chance de drop +6%; Dano de Veneno +3% |
| 5 | Anel da Transmutação | BiS | +3 Ven | — | Tries em Veneno +12%; Dano contínuo +8% |

### Mercenário · armadura pesada


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Espada de Aluguel | Padrão | +2 Mel | — | — |
| 2 | Espada Curta de Soldado | Padrão | +2 Mel | — | — |
| 3 | Sabre de Ouro | Superior | +3 Mel | — | +10% de ouro ganho |
| 4 | Espada do Capitão | Superior | +4 Mel, +1 Def | — | Dano crítico +12%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Lâmina do Contrato Eterno | BiS | +5 Mel, +1 Fís | — | +25% de dano contra chefes e elites; chefes deixam um item extra |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Martelo de Guerra *(também Guerreiro)* | Padrão | +3 Mel | — | — |
| 2 | Machado de Mercenário | Padrão | +3 Mel | — | — |
| 3 | Montante do Capitão | Superior | +4 Mel | — | Dano contra chefes e elites +4,5% |
| 4 | Alabarda de Cerco | Superior | +5 Mel, +1 Fís | — | Dano crítico +12%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Martelo do Saqueador de Reis | BiS | +6 Mel, +1 Def | — | Velocidade de ataque +6%; Dano corpo a corpo +6% |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Escudo de Mercenário `shield` | Padrão | +1 Def | 10 | — |
| 2 | Broquel de Soldado `shield` | Padrão | +1 Def | 12 | — |
| 3 | Escudo do Capitão `shield` | Superior | +2 Def | 15 | Resistência +1,8% |
| 4 | Escudo Dourado `shield` | Superior | +2 Def | 18 | Roubo de vida +1,6%; HP máximo +4% |
| 5 | Escudo do Contrato Eterno `shield` | BiS | +3 Def | 22 | Defesa +12%; Resistência +2,4% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Elmo de Soldado | Padrão | +1 Mel | 5 | — |
| 2 | Elmo de Aço Simples | Padrão | +1 Def | 6 | — |
| 3 | Elmo do Capitão | Superior | +2 Mel | 8 | Ouro ganho +4,5% |
| 4 | Elmo Dourado | Superior | +2 Def | 9 | Chance de drop +6%; Valor de venda +3% |
| 5 | Elmo do Senhor da Guerra | BiS | +3 Mel | 11 | XP ganho +9%; Eficácia das poções +12% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Cota de Malha | Padrão | +1 Def | 12 | — |
| 2 | Couraça de Soldado | Padrão | +1 Fís | 14 | — |
| 3 | Couraça do Capitão | Superior | +2 Def | 18 | Resistência +1,8% |
| 4 | Armadura Dourada | Superior | +2 Fís | 22 | Roubo de vida +1,6%; HP máximo +4% |
| 5 | Armadura do Capitão | BiS | +3 Def | 26 | +10% de XP, +15% de ouro, −10% de dano recebido |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Grevas de Soldado | Padrão | +1 Mel | 8 | — |
| 2 | Calças de Malha | Padrão | +1 Def | 10 | — |
| 3 | Grevas do Capitão | Superior | +2 Mel | 12 | HP máximo +6% |
| 4 | Grevas Douradas | Superior | +2 Def | 14 | Defesa +8%; Chance de crítico +1% |
| 5 | Grevas do Senhor da Guerra | BiS | +3 Mel | 18 | Dano corpo a corpo +9%; Dano contra chefes e elites +6% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Marcha | Padrão | +1 Fís | 4 | — |
| 2 | Botas de Soldado | Padrão | +1 Mel | 5 | — |
| 3 | Botas do Capitão | Superior | +2 Fís | 6 | XP ganho +4,5% |
| 4 | Botas Douradas | Superior | +2 Mel | 7 | Valor de venda +6%; Defesa +4% |
| 5 | Botas do Senhor da Guerra | BiS | +3 Fís | 9 | Eficácia das poções +18%; HP máximo +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Bolsa de Moedas | Padrão | +1 Mel | — | — |
| 2 | Medalha de Soldo | Padrão | +1 Def | — | — |
| 3 | Amuleto do Capitão | Superior | +2 Mel | — | Dano contra chefes e elites +4,5% |
| 4 | Colar de Ouro | Superior | +2 Def | — | Dano crítico +12%; Dano contra alvos abaixo de 30% de HP +4% |
| 5 | Cofre do Senhor da Guerra | BiS | +3 Mel | — | Velocidade de ataque +6%; Ouro ganho +6% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Contrato | Padrão | +1 Def | — | — |
| 2 | Anel de Soldo | Padrão | +1 Mel | — | — |
| 3 | Anel do Capitão | Superior | +2 Fís | — | XP ganho +4,5% |
| 4 | Anel de Ouro Maciço | Superior | +2 Def | — | Valor de venda +6%; Dano corpo a corpo +3% |
| 5 | Anel do Último Contrato | BiS | +3 Mel | — | Eficácia das poções +18%; Chance de crítico +2% |

### Mestre Rúnico · armadura média


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Espada Rúnica | Padrão | +2 Mag | — | — |
| 2 | Sabre Gravado | Padrão | +2 Mag | — | — |
| 3 | Espada de Glifos | Superior | +3 Mag | — | Chance de crítico +1,5% |
| 4 | Lâmina Encantada Rúnica | Superior | +4 Mag, +1 Mel | — | Dano em área +6%; Dano mágico +3% |
| 5 | Lâmina do Primeiro Glifo | BiS | +5 Mag, +1 Fogo | — | A cada 10 s, runa dá +20% de dano e −10% de dano recebido por 6 s |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Bastão Gravado | Padrão | +3 Mag | — | — |
| 2 | Machado Rúnico | Padrão | +3 Mag | — | — |
| 3 | Martelo de Runas | Superior | +4 Mag | — | +12% de dano mágico e +12% de dano corpo a corpo |
| 4 | Montante de Glifos | Superior | +5 Mag, +1 Mel | — | Dano em área +6%; Dano mágico +3% |
| 5 | Martelo do Glifo Supremo | BiS | +6 Mag, +1 Ene | — | Redução de recarga +6%; Dano corpo a corpo +6% |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Tomo de Runas `focus` | Padrão | +1 Mag | — | — |
| 2 | Escudo Gravado `shield` | Padrão | +1 Def | 8 | — |
| 3 | Tomo de Glifos `focus` | Superior | +2 Mag | — | Potência dos buffs +4,5% |
| 4 | Escudo Rúnico Ancestral `shield` | Superior | +2 Def | 13 | Resistência +2,4%; Defesa +4% |
| 5 | Tomo do Glifo Supremo `focus` | BiS | +3 Mag | — | Dano mágico +9%; Chance de crítico +2% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Elmo Rúnico | Padrão | +1 Mag | 4 | — |
| 2 | Capuz Gravado | Padrão | +1 Fogo | 5 | — |
| 3 | Elmo de Glifos | Superior | +2 Mag | 6 | Regeneração de mana +12% |
| 4 | Elmo Rúnico Ancestral | Superior | +2 Fogo | 7 | Tries em Magia +8%; XP ganho +3% |
| 5 | Coroa do Glifo Supremo | BiS | +3 Mag | 9 | Potência dos buffs +9%; Defesa +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Cota Gravada | Padrão | +1 Def | 8 | — |
| 2 | Couraça Rúnica | Padrão | +1 Mag | 10 | — |
| 3 | Cota de Glifos | Superior | +2 Def | 12 | HP máximo +6% |
| 4 | Couraça Rúnica Ancestral | Superior | +2 Mag | 14 | Resistência +2,4%; Defesa +4% |
| 5 | Couraça do Glifo Supremo | BiS | +3 Def | 18 | +25% de força de escudos; 1× por wave, golpe fatal deixa 20% de HP |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Grevas Rúnicas | Padrão | +1 Mel | 6 | — |
| 2 | Calças Gravadas | Padrão | +1 Ene | 7 | — |
| 3 | Grevas de Glifos | Superior | +2 Mel | 9 | HP máximo +6% |
| 4 | Grevas Rúnicas Ancestrais | Superior | +2 Ene | 11 | Força de escudos +8%; Dano mágico +3% |
| 5 | Grevas do Glifo Supremo | BiS | +3 Mel | 13 | Defesa +12%; Dano corpo a corpo +6% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Glifos | Padrão | +1 Ene | 3 | — |
| 2 | Botas Gravadas | Padrão | +1 Fogo | 4 | — |
| 3 | Botas Rúnicas | Superior | +2 Ene | 4 | Potência dos buffs +4,5% |
| 4 | Botas Rúnicas Ancestrais | Superior | +2 Fogo | 5 | XP ganho +6%; Força de escudos +4% |
| 5 | Botas do Glifo Supremo | BiS | +3 Ene | 7 | Defesa +12%; HP máximo +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Pedra de Runa | Padrão | +1 Mag | — | — |
| 2 | Amuleto Gravado | Padrão | +1 Mel | — | — |
| 3 | Colar de Glifos | Superior | +2 Mag | — | Chance de crítico +1,5% |
| 4 | Runa Ancestral | Superior | +2 Mel | — | Dano em área +6%; Regeneração de mana +8% |
| 5 | Runa do Glifo Supremo | BiS | +3 Mag | — | Redução de recarga +6%; Tries em Magia +8% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Glifo | Padrão | +1 Fogo | — | — |
| 2 | Anel Gravado | Padrão | +1 Mag | — | — |
| 3 | Anel Rúnico | Superior | +2 Ene | — | Potência dos buffs +4,5% |
| 4 | Anel Rúnico Ancestral | Superior | +2 Fogo | — | XP ganho +6%; Dano corpo a corpo +3% |
| 5 | Anel do Glifo Supremo | BiS | +3 Mag | — | Dano mágico +9%; Chance de crítico +2% |

### Ilusionista · armadura leve


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Varinha de Ilusão | Padrão | +2 Psi | — | — |
| 2 | Varinha de Miragem | Padrão | +2 Psi | — | — |
| 3 | Cetro do Espelho Quebrado | Superior | +3 Psi | — | +15% de duração de controle |
| 4 | Cetro das Mil Faces | Superior | +4 Psi, +1 Mag | — | Redução de recarga +4%; Dano Psíquico +3% |
| 5 | Varinha do Sonho Eterno | BiS | +5 Psi, +1 Ene | — | Chance de crítico +3%; Dano mágico +6% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Cajado de Espelho | Padrão | +3 Psi | — | — |
| 2 | Cajado de Miragem | Padrão | +3 Psi | — | — |
| 3 | Cajado das Sombras Falsas | Superior | +4 Psi | — | Duração de controle +9% |
| 4 | Cajado do Devaneio | Superior | +5 Psi, +1 Mag | — | Redução de recarga +4%; Dano Psíquico +3% |
| 5 | Orbe da Mente Estilhaçada | BiS | +6 Psi, +1 Ene | — | Dano psíquico ignora armadura; +30% de duração de controle |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Esfera Enganadora `focus` | Padrão | +1 Mag | — | — |
| 2 | Espelho de Mão `focus` | Padrão | +1 Psi | — | — |
| 3 | Orbe de Miragem `focus` | Superior | +2 Mag | — | Tries em Psíquico +6% |
| 4 | Espelho Rachado `focus` | Superior | +2 Psi | — | XP ganho +6%; Dano mágico +3% |
| 5 | Espelho dos Mil Rostos `focus` | BiS | +3 Mag | — | Dano Psíquico +9%; Redução de recarga +4% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Máscara de Ilusão | Padrão | +1 Psi | 2 | — |
| 2 | Capuz de Miragem | Padrão | +1 Mag | 2 | — |
| 3 | Máscara de Teatro | Superior | +2 Psi | 3 | Duração de controle +9% |
| 4 | Véu do Devaneio | Superior | +2 Mag | 4 | Regeneração de mana +16%; XP ganho +3% |
| 5 | Máscara dos Mil Rostos | BiS | +3 Psi | 4 | Tries em Psíquico +12%; HP máximo +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Manto Cambiante | Padrão | +1 Mag | 5 | — |
| 2 | Túnica de Miragem | Padrão | +1 Psi | 6 | — |
| 3 | Manto de Espelhos | Superior | +2 Mag | 8 | Redução de aggro +9% |
| 4 | Manto do Devaneio | Superior | +2 Psi | 9 | Resistência +2,4%; HP máximo +4% |
| 5 | Manto dos Mil Rostos | BiS | +3 Mag | 11 | −30% de peso de aggro; 10% de chance de miragem que absorve o golpe |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Véu | Padrão | +1 Psi | 3 | — |
| 2 | Calças de Miragem | Padrão | +1 Ene | 4 | — |
| 3 | Calças de Espelhos | Superior | +2 Psi | 4 | Redução de aggro +9% |
| 4 | Calças do Devaneio | Superior | +2 Ene | 5 | Força de escudos +8%; Dano Psíquico +3% |
| 5 | Calças dos Mil Rostos | BiS | +3 Psi | 7 | HP máximo +12%; Dano mágico +6% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Chinelas de Névoa | Padrão | +1 Ene | 2 | — |
| 2 | Botas de Miragem | Padrão | +1 Psi | 2 | — |
| 3 | Botas de Espelhos | Superior | +2 Ene | 3 | Tries em Psíquico +6% |
| 4 | Botas do Devaneio | Superior | +2 Psi | 4 | XP ganho +6%; Força de escudos +4% |
| 5 | Botas dos Mil Rostos | BiS | +3 Ene | 4 | HP máximo +12%; Redução de aggro +12% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Amuleto do Véu | Padrão | +1 Psi | — | — |
| 2 | Colar de Miragem | Padrão | +1 Mag | — | — |
| 3 | Espelho Pingente | Superior | +2 Psi | — | Duração de controle +9% |
| 4 | Amuleto do Devaneio | Superior | +2 Mag | — | Redução de recarga +4%; Regeneração de mana +8% |
| 5 | Olho dos Mil Rostos | BiS | +3 Psi | — | Chance de crítico +3%; Tries em Psíquico +8% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel Fantasma | Padrão | +1 Mag | — | — |
| 2 | Anel de Miragem | Padrão | +1 Psi | — | — |
| 3 | Anel de Espelho | Superior | +2 Ene | — | Tries em Psíquico +6% |
| 4 | Anel do Devaneio | Superior | +2 Mag | — | XP ganho +6%; Dano mágico +3% |
| 5 | Anel dos Mil Rostos | BiS | +3 Psi | — | Dano Psíquico +9%; Redução de recarga +4% |

### Druida · armadura média


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Cajado Curto de Carvalho | Padrão | +2 Ter | — | — |
| 2 | Varinha de Galho | Padrão | +2 Ter | — | — |
| 3 | Foice de Colheita | Superior | +3 Ter | — | Poder de cura +6% |
| 4 | Cetro de Raiz Viva | Superior | +4 Ter, +1 Mag | — | Dano contínuo +8%; Dano de Terra +3% |
| 5 | Galho do Coração da Floresta | BiS | +5 Ter, +1 Mel | — | Dano em área +9%; Dano mágico +6% |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Bastão de Raiz | Padrão | +3 Ter | — | — |
| 2 | Cajado de Carvalho | Padrão | +3 Ter | — | — |
| 3 | Bastão do Carvalho Ancestral | Superior | +4 Ter | — | +15% de poder de cura |
| 4 | Cajado de Espinhos | Superior | +5 Ter, +1 Mag | — | Dano contínuo +8%; Dano de Terra +3% |
| 5 | Cajado Coração da Floresta | BiS | +6 Ter, +1 Ven | — | Regeneração da equipe +40%; magias de Terra curam 10% do dano |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Totem de Madeira `focus` | Padrão | +1 Mag | — | — |
| 2 | Escudo de Casca `shield` | Padrão | +1 Ter | 8 | — |
| 3 | Totem de Osso de Fera `focus` | Superior | +2 Mag | — | Eficácia das poções +9% |
| 4 | Totem da Floresta `focus` | Superior | +2 Ter | — | Chance de drop +6%; Dano mágico +3% |
| 5 | Totem do Ancião `focus` | BiS | +3 Mag | — | Dano de Terra +9%; Poder de cura +8% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Coroa de Folhas | Padrão | +1 Ter | 4 | — |
| 2 | Capuz de Musgo | Padrão | +1 Mag | 5 | — |
| 3 | Elmo de Chifres | Superior | +2 Ter | 6 | Regeneração de mana +12% |
| 4 | Coroa de Flores | Superior | +2 Mag | 7 | Tries em Terra +8%; Chance de drop +3% |
| 5 | Coroa do Ancião | BiS | +3 Ter | 9 | Eficácia das poções +18%; HP máximo +8% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Couraça de Casca | Padrão | +1 Mel | 8 | — |
| 2 | Túnica de Folhas | Padrão | +1 Ter | 10 | — |
| 3 | Couro de Urso | Superior | +2 Mel | 12 | Resistência +1,8% |
| 4 | Couraça de Raízes | Superior | +2 Ter | 14 | Defesa +8%; HP máximo +4% |
| 5 | Manto do Guardião Silvestre | BiS | +3 Mel | 18 | +12% de HP máximo; +20% de cura recebida |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças de Fibra | Padrão | +1 Ter | 6 | — |
| 2 | Calças de Folhas | Padrão | +1 Ven | 7 | — |
| 3 | Calças de Couro de Urso | Superior | +2 Ter | 9 | Resistência +1,8% |
| 4 | Calças de Raízes | Superior | +2 Ven | 11 | Cura recebida +8%; Dano de Terra +3% |
| 5 | Calças do Guardião Silvestre | BiS | +3 Ter | 13 | HP máximo +12%; Dano mágico +6% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Musgo | Padrão | +1 Ven | 3 | — |
| 2 | Botas de Fibra | Padrão | +1 Ter | 4 | — |
| 3 | Botas de Couro de Urso | Superior | +2 Ven | 4 | Eficácia das poções +9% |
| 4 | Botas de Raízes | Superior | +2 Ter | 5 | Chance de drop +6%; Cura recebida +4% |
| 5 | Botas do Guardião Silvestre | BiS | +3 Ven | 7 | HP máximo +12%; Resistência +2,4% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Pingente de Semente | Padrão | +1 Ter | — | — |
| 2 | Colar de Garras | Padrão | +1 Mag | — | — |
| 3 | Amuleto de Presa de Urso | Superior | +2 Ter | — | Poder de cura +6% |
| 4 | Colar de Flores | Superior | +2 Mag | — | Dano contínuo +8%; Regeneração de mana +8% |
| 5 | Semente do Ancião | BiS | +3 Ter | — | Dano em área +9%; Tries em Terra +8% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Raiz | Padrão | +1 Mag | — | — |
| 2 | Anel de Galho | Padrão | +1 Ter | — | — |
| 3 | Anel de Garra | Superior | +2 Mel | — | Eficácia das poções +9% |
| 4 | Anel de Flor | Superior | +2 Mag | — | Chance de drop +6%; Dano mágico +3% |
| 5 | Anel do Ancião | BiS | +3 Ter | — | Dano de Terra +9%; Poder de cura +8% |

### Artilheiro · armadura média


**Arma 1 mão**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Pistola de Sílex | Padrão | +2 Dist | — | — |
| 2 | Pistola de Duelo | Padrão | +2 Dist | — | — |
| 3 | Pistola de Repetição | Superior | +3 Dist | — | Chance de crítico +1,5% |
| 4 | Revólver Cromado | Superior | +4 Dist, +1 Ene | — | Velocidade de ataque +4%; Dano crítico +6% |
| 5 | Canhão de Mão Tesla | BiS | +5 Dist, +1 Fogo | — | +8% de chance de crítico; tiros em linha acertam 2 alvos |

**Arma 2 mãos**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Rifle de Batalha | Padrão | +3 Dist | — | — |
| 2 | Mosquete de Cano Longo | Padrão | +3 Dist | — | — |
| 3 | Rifle de Bobina | Superior | +4 Dist | — | +12% de dano em área |
| 4 | Carabina Pesada | Superior | +5 Dist, +1 Ene | — | Velocidade de ataque +4%; Dano crítico +6% |
| 5 | Canhão de Ombro Protótipo | BiS | +6 Dist, +1 Fogo | — | Dano em área +9%; Dano à distância +6% |

**Mão secundária**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Pistola Auxiliar `dual` | Padrão | +1 Dist | — | — |
| 2 | Pistola Gêmea `dual` | Padrão | +1 Ene | — | — |
| 3 | Repetidora Auxiliar `dual` | Superior | +2 Dist | — | Chance de drop +4,5% |
| 4 | Revólver Gêmeo `dual` | Superior | +2 Ene | — | XP ganho +6%; Dano à distância +3% |
| 5 | Canhão de Mão Gêmeo `dual` | BiS | +3 Dist | — | Valor de venda +9%; Dano de Energia +6% |

**Elmo**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Capacete de Artilheiro | Padrão | +1 Dist | 4 | — |
| 2 | Óculos de Piloto | Padrão | +1 Def | 5 | — |
| 3 | Capacete Reforçado | Superior | +2 Dist | 6 | Tries em Ranged +6% |
| 4 | Elmo de Bobina | Superior | +2 Def | 7 | Ouro ganho +6%; XP ganho +3% |
| 5 | Capacete do Protótipo | BiS | +3 Dist | 9 | Chance de drop +9%; Valor de venda +6% |

**Armadura**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Colete Reforçado | Padrão | +1 Def | 8 | — |
| 2 | Casaco de Artilheiro | Padrão | +1 Fís | 10 | — |
| 3 | Colete de Placas Leves | Superior | +2 Def | 12 | Resistência +1,8% |
| 4 | Armadura de Bobina | Superior | +2 Fís | 14 | Força de escudos +8%; HP máximo +4% |
| 5 | Exoesqueleto Protótipo | BiS | +3 Def | 18 | +25% de defesa; escudo de 20% do HP (1× por wave) |

**Calças**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Calças Reforçadas | Padrão | +1 Ene | 6 | — |
| 2 | Calças de Artilheiro | Padrão | +1 Dist | 7 | — |
| 3 | Calças de Placas Leves | Superior | +2 Ene | 9 | HP máximo +6% |
| 4 | Calças de Bobina | Superior | +2 Dist | 11 | Defesa +8%; Dano de Energia +3% |
| 5 | Calças do Protótipo | BiS | +3 Ene | 13 | Dano à distância +9%; Chance de crítico +2% |

**Botas**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Botas de Trincheira | Padrão | +1 Fís | 3 | — |
| 2 | Botas de Artilheiro | Padrão | +1 Def | 4 | — |
| 3 | Botas Reforçadas | Superior | +2 Fís | 4 | Chance de drop +4,5% |
| 4 | Botas de Bobina | Superior | +2 Def | 5 | XP ganho +6%; Defesa +4% |
| 5 | Botas do Protótipo | BiS | +3 Fís | 7 | Valor de venda +9%; HP máximo +8% |

**Amuleto**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Bússola de Artilheiro | Padrão | +1 Dist | — | — |
| 2 | Medalhão de Pólvora | Padrão | +1 Ene | — | — |
| 3 | Lente de Mira | Superior | +2 Dist | — | Chance de crítico +1,5% |
| 4 | Amuleto de Bobina | Superior | +2 Ene | — | Velocidade de ataque +4%; Dano crítico +6% |
| 5 | Núcleo do Protótipo | BiS | +3 Dist | — | Dano em área +9%; Tries em Ranged +8% |

**Anel**

| # | Item | Qualidade | Bônus fixo | Arm | Passiva |
|---|---|---|---|---|---|
| 1 | Anel de Pólvora | Padrão | +1 Fogo | — | — |
| 2 | Anel de Latão | Padrão | +1 Dist | — | — |
| 3 | Anel de Mira | Superior | +2 Ene | — | Chance de drop +4,5% |
| 4 | Anel de Bobina | Superior | +2 Fogo | — | XP ganho +6%; Dano à distância +3% |
| 5 | Anel do Protótipo | BiS | +3 Dist | — | Valor de venda +9%; Dano de Energia +6% |

---

## 3. Itens compartilhados entre classes Tier 1

| Item | Dono | Também usam |
|---|---|---|
| Espada Longa | Guerreiro | Guardião, Mestre Rúnico |
| Machado de Batalha | Guerreiro | Mestre Rúnico |
| Escudo de Torre | Guerreiro | Guardião |
| Martelo de Guerra | Mercenário | Guerreiro |
| Escudo Bastião | Guardião | Guerreiro |
| Adaga Ritual | Bruxo | Ladino |
| Varinha de Carvalho | Mago | Bardo, Ilusionista |
| Cajado Arcano | Mago | Mestre Rúnico, Druida |
| Livro de Orações | Clérigo | Bardo |

---

## 4. Testes de integridade sugeridos
1. Todo item tem 1 ou mais `classes` existentes; nomes e ids únicos.
2. Nenhum `fixed` cai em proficiência com multiplicador ×0 de qualquer classe listada.
3. Arma 2M nunca coexiste com mão secundária, exceto `quiver` do Caçador.
4. `offhandKind: dual` só com arma de 1 mão.
5. `canEquip(char, item)`: verdadeiro se `item.classes` cruza `char.classPath`.
6. Sorteio de atributo nunca escolhe código com peso 0 para a classe do personagem.

## 5. Pendências
- Catálogo Tier 2 (exclusivos por subclasse).
- Chances de drop por qualidade e classificação.
- Forja.
