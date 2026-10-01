import type { Cell } from '../art/geometry';

/** Desenhos de obstáculo de cada hunt (arte/obstaculos/<id>.csv); cada célula usa um deles pela posição. */
export const HUNT_OBSTACLES: Record<string, string[]> = {
  catacumbas: ['pilar', 'rocha'], floresta_sombria: ['toco', 'rocha'], pantano_toxico: ['toco', 'rocha'], minas_esquecidas: ['rocha', 'caixote'],
  fortaleza_de_gelo: ['gelo', 'rocha'], vulcao_ardente: ['rocha', 'pilar'], templo_profano: ['pilar', 'pilar'],
};
export const obstacleArt = (huntId: string, cell: Cell) => { const set = HUNT_OBSTACLES[huntId] ?? HUNT_OBSTACLES.catacumbas; return set[(cell.c + cell.r) % set.length]; };
