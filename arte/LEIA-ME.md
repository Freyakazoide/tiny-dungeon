# Arte do Tiny Dungeon em CSV

Tudo aqui é editável no Excel/Sheets. O jogo lê estes arquivos e desenha a arte na hora (não há PNG).

| Arquivo ou pasta | O que é |
|---|---|
| `palette.csv` | `chave,cor,nome`. Cada cor tem **1 caractere** de chave. `.` é transparente. |
| `personagens/<id>/<direção>_<1|2>.csv` | Quadros do personagem: direções `down`, `up`, `right` (e `left`, que é o `right` espelhado, a menos que exista um `left_N.csv`), 2 poses cada. |
| `monstros/<id>/...` | Mesma convenção dos personagens. |
| `tiles/<conjunto>/<nome>.csv` | Tiles de 16×16. |
| `mapas/<hunt>.csv` | Sala da hunt: grade de **nomes de tiles** (32×20). |
| `tilesets.csv` | Recolore os tiles da Catacumbas para outras hunts (`1=#46603a;...`). |
| `cores.csv` | As opções dos carrosséis de cor do personagem: `regiao,id,nome,cor`. Pode acrescentar linhas. |
| `regioes.csv` | Quais chaves da paleta cada região pinta e como (`base`, `claro`, `escuro`). |
| `meta.csv` | Tamanho, células ocupadas e `monstro_id` do jogo. |

## Regras da grade
- Cada célula é uma chave de `palette.csv`. O **contorno escuro de 1 px é automático** (só nas células transparentes ao lado do desenho): deixe **pelo menos 1 px de margem** em volta.
- Personagens e monstros comuns: **24×32**. Chefe: **40×51** (ocupa 2×2 células). Os 2 a 4 últimos pixels de baixo ficam vazios de propósito (o pé fica um pouco acima do fundo da célula).
- Chaves das **regiões de cor** do personagem: **pele** = `p` `P`, **cabelo** = `a` `A`, **armadura** = `b` `B` `c`. As demais (aço, madeira, ouro, couro) são fixas.
- Pose 1 e pose 2 do mesmo sentido: o jogo alterna as duas para dar o efeito de andar.

## Como fazer cada coisa
- **Nova cor de pele, cabelo ou armadura:** acrescente uma linha em `cores.csv` (o `id` não pode repetir dentro da região).
- **Novo monstro:** copie uma pasta de `monstros/`, renomeie, edite as chaves e acrescente uma linha em `meta.csv`.
- **Nova sala:** crie `mapas/<id da hunt>.csv` com os nomes dos arquivos de `tiles/`.
- **Mudar a cor de uma hunt:** linha em `tilesets.csv`.


> Itens (armas) não usam estes CSV: são montados por partes e materiais em código. Veja `docs/arte-por-partes.md` e a seção **Oficina de itens** do estúdio (`/arte.html`).
