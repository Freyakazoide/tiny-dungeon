import { Scene, Textures } from 'phaser';
import { ASSETS, CHARACTER_ANIMATION_FPS, CHARACTER_DIRECTIONS, CHARACTER_SPRITES, characterAnimationKey, characterFramePath } from '../assets';
import type { ClassId } from '../core/types';

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
        this.load.image(ASSETS.arena.key, ASSETS.arena.path);
        for(const [classId, asset] of Object.entries(CHARACTER_SPRITES) as [ClassId, NonNullable<(typeof CHARACTER_SPRITES)[ClassId]>][]){
            for(const direction of CHARACTER_DIRECTIONS){
                asset.frames[direction].forEach((key,index)=>this.load.image(key,characterFramePath(classId,direction,(index+1) as 1|2)));
            }
        }
    }

    create ()
    {
        for(const [classId, asset] of Object.entries(CHARACTER_SPRITES) as [ClassId, NonNullable<(typeof CHARACTER_SPRITES)[ClassId]>][]){
            for(const direction of CHARACTER_DIRECTIONS){
                for(const key of asset.frames[direction])this.textures.get(key).setFilter(Textures.FilterMode.NEAREST);
                const key=characterAnimationKey(classId,direction);
                if(!this.anims.exists(key))this.anims.create({key,frames:asset.frames[direction].map(frameKey=>({key:frameKey})),frameRate:CHARACTER_ANIMATION_FPS,repeat:-1});
            }
        }

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Game');
    }
}
