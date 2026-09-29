export const ASSETS = {
  background: { key:'dungeon-bg', path:'assets/bg.png' },
  // Registro central: substitua os paths por PNGs autorais sem tocar nas cenas.
  characters: { knight:'shape:rect', monk:'shape:rect', paladin:'shape:rect', sorcerer:'shape:rect', druid:'shape:rect' },
  monsters: { skeleton:'shape:circle', ghoul:'shape:circle', bone_king:'shape:circle' },
  effects: { hit:'shape:flash', heal:'shape:text', drop:'shape:text', stairs:'shape:lines' }
} as const;
