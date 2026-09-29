import { Scene, Textures } from 'phaser';
import { HUNTS, type HuntDef } from '../data/hunts';
import { spriteTexturesReady } from '../assets';
import { CHARACTER_ANIMATION_FPS, mapKey, mapPath, CHARACTER_DIRECTIONS, CHARACTER_SPRITES, characterAnimationKey, characterFramePath } from '../assets';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
        for(const hunt of HUNTS)this.load.image(mapKey(hunt.id), mapPath(hunt.map));
        this.load.on('loaderror',(file:Phaser.Loader.File)=>{if(!file.key.startsWith('character-'))console.warn(`Mapa ausente ou inválido (${file.key}): esperado public/assets/${file.src??file.url} — 1448×1086 PNG. Usando placeholder.`);});
        for(const [spriteId, asset] of Object.entries(CHARACTER_SPRITES)){
            for(const direction of CHARACTER_DIRECTIONS){
                asset.frames[direction].forEach((key,index)=>this.load.image(key,characterFramePath(spriteId,direction,(index+1) as 1|2)));
            }
        }
    }

    create ()
    {
        for(const hunt of HUNTS)if(!this.textures.exists(mapKey(hunt.id)))this.makePlaceholder(hunt);
        for(const [spriteId, asset] of Object.entries(CHARACTER_SPRITES)){
            // Sprite com PNG ausente não anima nem quebra: o personagem cai no bloco colorido (Game.ts confere as texturas).
            if(!spriteTexturesReady(this.textures,asset)){console.warn(`Sprite "${spriteId}" incompleto: esperado public/assets/characters/${spriteId}/{down,up,left,right}_{1,2}.png. Usando o bloco colorido.`);continue;}
            for(const direction of CHARACTER_DIRECTIONS){
                for(const key of asset.frames[direction])this.textures.get(key).setFilter(Textures.FilterMode.NEAREST);
                const key=characterAnimationKey(spriteId,direction);
                if(!this.anims.exists(key))this.anims.create({key,frames:asset.frames[direction].map(frameKey=>({key:frameKey})),frameRate:CHARACTER_ANIMATION_FPS,repeat:-1});
            }
        }

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Game');
    }

    /** Arena provisória (1448×1086, mesma proporção dos mapas): cor da hunt, moldura e o nome. Permite jogar antes de existir arte. */
    private makePlaceholder(hunt: HuntDef)
    {
        const texture=this.textures.createCanvas(mapKey(hunt.id),1448,1086);
        if(!texture)return;
        const ctx=texture.getContext();
        const css=`#${hunt.color.toString(16).padStart(6,'0')}`;
        ctx.fillStyle='#0a1120';ctx.fillRect(0,0,1448,1086);
        ctx.fillStyle=css;ctx.fillRect(150,170,1148,746);
        ctx.strokeStyle='#d1ad58';ctx.lineWidth=10;ctx.strokeRect(150,170,1148,746);
        ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fillRect(150,170,1148,746);
        ctx.fillStyle='#f0d79a';ctx.font='bold 64px Georgia, serif';ctx.textAlign='center';
        ctx.fillText(hunt.name.toUpperCase(),724,560);
        ctx.font='28px Georgia, serif';ctx.fillStyle='#c9bfa8';ctx.fillText('placeholder — falta public/assets/maps/'+hunt.map+'.png',724,615);
        texture.refresh();
    }
}
