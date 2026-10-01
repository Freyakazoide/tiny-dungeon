import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Corridor';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game, Scale } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#14110c',
    // Arte em pixels: sem suavização. O mapa inteiro é o canvas (32×20 tiles ×2).
    render: { pixelArt: true, antialias: false },
    scale: { mode: Scale.RESIZE, autoCenter: Scale.NO_CENTER, width: 1024, height: 640 },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
