import { Scene } from 'phaser';
import { ensureArtTextures } from '../art/textures';

/** Não há mais imagens a carregar: a arte vem de CSV e as texturas (mapas e monstros) são desenhadas aqui, de forma síncrona. */
export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        this.add.rectangle(512, 320, 1024, 640, 0x14110c);
    }

    create ()
    {
        ensureArtTextures(this);
        this.scene.start('Game');
    }
}
