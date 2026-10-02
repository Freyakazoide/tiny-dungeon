# Arte de itens por partes

Itens (e, depois, personagens) são montados por código a partir de **partes** que guardam **papéis**, e recoloridos por **material**. Ninguém precisa desenhar pixel: para ter variedade basta combinar partes e materiais.

Onde ver: `npm run dev` e abrir `http://localhost:8080/arte.html` → seção **Oficina de itens**. Código em `src/game/art/gear/`.

## 1. Papéis (`roles.ts`)

| Letra | Papel | Uso |
|---|---|---|
| `o` | linha interna | traço escuro dentro da peça (cor `deep` do material) |
| `s` | sombra | baixo/direita |
| `b` | base | cor principal |
| `h` | brilho | cima/esquerda |
| `p` | specular | ponto de luz; só aparece em material de brilho forte/médio |
| `e` | emissivo | runas e brilho mágico (cor `emissive` do material) |

O **contorno externo não é desenhado**: sai da silhueta final. Pixel de borda embaixo/direita recebe o contorno **profundo** (`deep`) do material vizinho; em cima/esquerda recebe o **lateral colorido** (`rim`). A luz vem de cima e da esquerda.

## 2. Materiais (`materials.ts`)

Cada material é uma rampa `deep · rim · shadow · base · highlight · specular · emissive?` com hue shifting (ouro: marrom-avermelhado → laranja → dourado → amarelo → quase branco), mais `tipo` (metal, cristal, orgânico, magia) e `brilho` (forte 100% / médio 50% / nenhum 0% do specular). Hoje: ferro, ferro enferrujado, aço negro, prata, ouro, bronze, couro, couro vermelho, madeira, madeira negra, osso, cristal arcano, luz solar, essência funesta, ferrugem. Um teste garante que cada rampa escurece/clareia na ordem certa.

## 3. Partes e famílias

- Uma **parte** (`swords.ts`, `bows.ts`, `staffs.ts`) é uma grade de papéis + **âncoras** (pontos de encaixe, ex.: `base` da lâmina, `up`/`down` da guarda, `top`/`bottom` do cabo). O teste confere que toda âncora cai em pixel pintado.
- Um **gabarito** (`catalog.ts`) diz que slots a família tem e como se encaixam (âncora de uma parte na âncora de outra). Espada: lâmina, guarda, cabo, pomo, efeito. Arco: braço (o de baixo é o de cima espelhado), punho, corda (linha entre as pontas) e efeito. Cajado: haste, ponteira, engaste, gema e efeito.
- **Efeitos** (runas, veio mágico, ferrugem, faíscas, chamas…) são partes que se alinham a um slot-alvo: `dentro` só pinta onde o alvo tem pixel, `fora` só onde está vazio, `livre` por cima.
- **Curadoria**: `materiais`, `tipos`, `exigeEmissivo`, `incompativel` e `desde` (raridade mínima) numa parte barram combinações ruins (runas em ferro, crânio com garras…). O sorteio e o Estúdio usam a mesma regra (`recipeIssues`).

## 4. Receita = item

`Recipe` = família + `{ slot: { parte, material } }`. Raridade vira receita (`recipes.ts`): `recipeForSeed(familia, raridade, semente)` sorteia partes liberadas para a raridade e materiais do conjunto dela; a mesma semente dá sempre o mesmo item. Há também as quatro armas de prova (`PLAN_RECIPES`) e a escada da espada (comum → lendária).

`gearDataUrl(receita, escala)` devolve o PNG com cache pela chave visual (`recipeKey`).

## 5. Como acrescentar

- **Material novo:** uma linha em `MATERIALS` (rampa + tipo + brilho). Entra no Estúdio sozinho; para entrar no sorteio, coloque o id em `POOLS`.
- **Parte nova:** acrescente em `swords.ts`/`bows.ts`/`staffs.ts` (grade + âncoras). `npx vitest run src/game/art/gear` valida e monta todas as combinações.
- **Família nova:** partes + um gabarito em `TEMPLATES`.

## 6. Ainda não feito

Escudos, elmos e armaduras; personagem em camadas (corpo, cabelo, roupa, arma, offhand, detalhe da classe) com âncoras por quadro de animação; ligar os ícones do jogo (`ItemIcon`) às receitas.
