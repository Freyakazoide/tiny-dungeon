import type { ClassId, TalentDef, TalentEffect } from '../core/types';

export const TALENT_CONFIG={respecGoldPerPoint:75} as const;
export const TALENT_EFFECT_NAMES:Record<TalentEffect,string>={maxHp:'Vida máxima',maxMana:'Mana máxima',attack:'Ataque físico',defense:'Defesa',attackSpeed:'Velocidade de ataque',crit:'Chance crítica',resistance:'Resistência',magicPower:'Poder mágico',cooldown:'Recarga de magias',healing:'Cura e regeneração',magicDamage:'Dano mágico'};
type TalentSeed=Omit<TalentDef,'id'|'classId'>;
const req=(classId:ClassId,index:number,rank=1)=>[{talentId:`${classId}_talent_${index}`,rank}];
const talent=(classId:ClassId,index:number,seed:TalentSeed):TalentDef=>({id:`${classId}_talent_${index}`,classId,...seed});

const trees:Record<ClassId,TalentDef[]>={
  hunter:[
    talent('hunter',0,{name:'Precisão',description:'Aprimora o dano dos disparos à distância.',icon:'◎',tier:1,column:0,max:3,requiredLevel:2,effect:'attack',value:.07}),
    talent('hunter',1,{name:'Reserva de Flechas',description:'Expande a reserva de mana usada nas habilidades.',icon:'✧',tier:1,column:1,max:3,requiredLevel:2,effect:'maxMana',value:.09}),
    talent('hunter',2,{name:'Mira Mortal',description:'Eleva a chance de acertos críticos com ataques e disparos.',icon:'⌖',tier:2,column:0,max:3,requiredLevel:5,requires:req('hunter',0),effect:'crit',value:.025}),
    talent('hunter',3,{name:'Sobrevivência',description:'Aumenta a vida para aguentar os golpes que escapam do tanque.',icon:'♥',tier:2,column:1,max:3,requiredLevel:5,requires:req('hunter',1),effect:'maxHp',value:.07}),
    talent('hunter',4,{name:'Aljava',description:'Permite ataques à distância mais rápidos e constantes.',icon:'➶',tier:3,column:0,max:3,requiredLevel:9,requires:req('hunter',2,2),effect:'attackSpeed',value:.05}),
    talent('hunter',5,{name:'Foco do Caçador',description:'Reduz a recarga das habilidades.',icon:'⚖',tier:3,column:1,max:1,requiredLevel:9,requires:req('hunter',3,2),effect:'cooldown',value:.12})
  ],
  mage:[
    talent('mage',0,{name:'Conhecimento Arcano',description:'Amplifica o poder utilizado por todas as magias.',icon:'✦',tier:1,column:0,max:3,requiredLevel:2,effect:'magicPower',value:.08}),
    talent('mage',1,{name:'Reserva Arcana',description:'Expande a mana disponível para rituais prolongados.',icon:'◆',tier:1,column:1,max:3,requiredLevel:2,effect:'maxMana',value:.1}),
    talent('mage',2,{name:'Canalização',description:'Reduz o intervalo necessário entre conjurações.',icon:'◌',tier:2,column:0,max:3,requiredLevel:5,requires:req('mage',0),effect:'cooldown',value:.05}),
    talent('mage',3,{name:'Impacto Arcano',description:'Aumenta diretamente o dano causado por magias.',icon:'✹',tier:2,column:1,max:3,requiredLevel:5,requires:req('mage',1),effect:'magicDamage',value:.08}),
    talent('mage',4,{name:'Véu Arcano',description:'Fortalece a resistência contra ataques recebidos.',icon:'▰',tier:3,column:0,max:3,requiredLevel:9,requires:req('mage',2,2),effect:'resistance',value:.025}),
    talent('mage',5,{name:'Mestre Arcano',description:'Concentra poder mágico extremo nas conjurações.',icon:'♛',tier:3,column:1,max:1,requiredLevel:9,requires:req('mage',3,2),effect:'magicPower',value:.15})
  ],
  squire:[
    talent('squire',0,{name:'Resistência',description:'Treino de campo que aumenta a vida para aguentar mais golpes.',icon:'♥',tier:1,column:0,max:3,requiredLevel:2,effect:'maxHp',value:.07}),
    talent('squire',1,{name:'Guarda Firme',description:'Melhora a postura defensiva e a defesa contra golpes.',icon:'⬟',tier:1,column:1,max:3,requiredLevel:2,effect:'defense',value:.06}),
    talent('squire',2,{name:'Golpe Treinado',description:'Refina a técnica e aumenta o dano físico.',icon:'⚔',tier:2,column:0,max:3,requiredLevel:5,requires:req('squire',0),effect:'attack',value:.06}),
    talent('squire',3,{name:'Couraça',description:'Reduz o dano que atravessa a armadura.',icon:'▣',tier:2,column:1,max:3,requiredLevel:5,requires:req('squire',1),effect:'resistance',value:.02}),
    talent('squire',4,{name:'Olho Aberto',description:'Aumenta a chance de acertos críticos.',icon:'✦',tier:3,column:0,max:3,requiredLevel:9,requires:req('squire',2,2),effect:'crit',value:.02}),
    talent('squire',5,{name:'Fôlego',description:'Reduz a recarga das habilidades.',icon:'◌',tier:3,column:1,max:1,requiredLevel:9,requires:req('squire',3,2),effect:'cooldown',value:.1})
  ],
  knight:[
    talent('knight',0,{name:'Vigor',description:'Fortalece o corpo para suportar mais dano nas linhas de frente.',icon:'♥',tier:1,column:0,max:3,requiredLevel:2,effect:'maxHp',value:.08}),
    talent('knight',1,{name:'Muralha',description:'Aprimora a proteção da armadura e a defesa contra golpes.',icon:'⬟',tier:1,column:1,max:3,requiredLevel:2,effect:'defense',value:.07}),
    talent('knight',2,{name:'Mestre da Lâmina',description:'Transforma disciplina marcial em dano físico adicional.',icon:'⚔',tier:2,column:0,max:3,requiredLevel:5,requires:req('knight',0),effect:'attack',value:.07}),
    talent('knight',3,{name:'Fortaleza',description:'Reduz o dano que atravessa a armadura pesada.',icon:'▣',tier:2,column:1,max:3,requiredLevel:5,requires:req('knight',1),effect:'resistance',value:.025}),
    talent('knight',4,{name:'Contra-ataque',description:'Aumenta a chance de golpes físicos decisivos.',icon:'✦',tier:3,column:0,max:3,requiredLevel:9,requires:req('knight',2,2),effect:'crit',value:.02}),
    talent('knight',5,{name:'Guardião',description:'Reduz a recarga das técnicas defensivas e ofensivas.',icon:'⌛',tier:3,column:1,max:1,requiredLevel:9,requires:req('knight',3,2),effect:'cooldown',value:.12})
  ],
  monk:[
    talent('monk',0,{name:'Disciplina',description:'Aumenta a vida e a capacidade de permanecer em combate.',icon:'◉',tier:1,column:0,max:3,requiredLevel:2,effect:'maxHp',value:.06}),
    talent('monk',1,{name:'Punhos de Aço',description:'Amplifica o dano físico dos ataques desarmados.',icon:'✊',tier:1,column:1,max:3,requiredLevel:2,effect:'attack',value:.07}),
    talent('monk',2,{name:'Fluxo',description:'Acelera a sequência de ataques básicos.',icon:'≋',tier:2,column:0,max:3,requiredLevel:5,requires:req('monk',0),effect:'attackSpeed',value:.06}),
    talent('monk',3,{name:'Combo',description:'Melhora o impacto acumulado das combinações de golpes.',icon:'×',tier:2,column:1,max:3,requiredLevel:5,requires:req('monk',1),effect:'attack',value:.06}),
    talent('monk',4,{name:'Evasão',description:'Aumenta a resistência e a sobrevivência em combates longos.',icon:'◇',tier:3,column:0,max:3,requiredLevel:9,requires:req('monk',2,2),effect:'resistance',value:.025}),
    talent('monk',5,{name:'Transcendência',description:'Concentração absoluta para golpes críticos mais frequentes.',icon:'☯',tier:3,column:1,max:1,requiredLevel:9,requires:req('monk',3,2),effect:'crit',value:.08})
  ],
  paladin:[
    talent('paladin',0,{name:'Precisão',description:'Aprimora o dano dos disparos à distância.',icon:'◎',tier:1,column:0,max:3,requiredLevel:2,effect:'attack',value:.07}),
    talent('paladin',1,{name:'Fé',description:'Expande a reserva de mana usada em suporte e ofensiva.',icon:'✧',tier:1,column:1,max:3,requiredLevel:2,effect:'maxMana',value:.09}),
    talent('paladin',2,{name:'Mira Mortal',description:'Eleva a chance de acertos críticos com ataques e disparos.',icon:'⌖',tier:2,column:0,max:3,requiredLevel:5,requires:req('paladin',0),effect:'crit',value:.025}),
    talent('paladin',3,{name:'Luz Protetora',description:'Fortalece curas e recursos de suporte aos aliados.',icon:'☀',tier:2,column:1,max:3,requiredLevel:5,requires:req('paladin',1),effect:'healing',value:.1}),
    talent('paladin',4,{name:'Aljava',description:'Permite ataques à distância mais rápidos e constantes.',icon:'➶',tier:3,column:0,max:3,requiredLevel:9,requires:req('paladin',2,2),effect:'attackSpeed',value:.05}),
    talent('paladin',5,{name:'Julgamento',description:'Reduz a recarga das habilidades de dano e suporte.',icon:'⚖',tier:3,column:1,max:1,requiredLevel:9,requires:req('paladin',3,2),effect:'cooldown',value:.12})
  ],
  necromancer:[
    talent('necromancer',0,{name:'Conhecimento Proibido',description:'Amplifica o poder utilizado por todas as magias.',icon:'☠',tier:1,column:0,max:3,requiredLevel:2,effect:'magicPower',value:.08}),
    talent('necromancer',1,{name:'Reserva Sombria',description:'Expande a mana disponível para rituais prolongados.',icon:'◆',tier:1,column:1,max:3,requiredLevel:2,effect:'maxMana',value:.1}),
    talent('necromancer',2,{name:'Canalização',description:'Reduz o intervalo necessário entre conjurações.',icon:'◌',tier:2,column:0,max:3,requiredLevel:5,requires:req('necromancer',0),effect:'cooldown',value:.05}),
    talent('necromancer',3,{name:'Impacto Fúnebre',description:'Aumenta diretamente o dano causado por magias.',icon:'✹',tier:2,column:1,max:3,requiredLevel:5,requires:req('necromancer',1),effect:'magicDamage',value:.08}),
    talent('necromancer',4,{name:'Barreira Óssea',description:'Fortalece a resistência contra ataques recebidos.',icon:'▰',tier:3,column:0,max:3,requiredLevel:9,requires:req('necromancer',2,2),effect:'resistance',value:.025}),
    talent('necromancer',5,{name:'Mestre da Morte',description:'Concentra poder mágico extremo nas conjurações.',icon:'♛',tier:3,column:1,max:1,requiredLevel:9,requires:req('necromancer',3,2),effect:'magicPower',value:.15})
  ],
  druid:[
    talent('druid',0,{name:'Vitalidade',description:'Aumenta a vida para sustentar a equipe por mais tempo.',icon:'❧',tier:1,column:0,max:3,requiredLevel:2,effect:'maxHp',value:.07}),
    talent('druid',1,{name:'Seiva',description:'Expande a mana necessária para magia natural.',icon:'●',tier:1,column:1,max:3,requiredLevel:2,effect:'maxMana',value:.09}),
    talent('druid',2,{name:'Crescimento',description:'Amplifica curas e efeitos de regeneração.',icon:'♣',tier:2,column:0,max:3,requiredLevel:5,requires:req('druid',0),effect:'healing',value:.1}),
    talent('druid',3,{name:'Espinhos',description:'Aumenta a resistência enquanto protege o grupo.',icon:'✣',tier:2,column:1,max:3,requiredLevel:5,requires:req('druid',1),effect:'resistance',value:.025}),
    talent('druid',4,{name:'Renovação',description:'Fortalece ainda mais curas e regenerações prolongadas.',icon:'↻',tier:3,column:0,max:3,requiredLevel:9,requires:req('druid',2,2),effect:'healing',value:.08}),
    talent('druid',5,{name:'Avatar',description:'Libera a força ofensiva da natureza nas magias.',icon:'✺',tier:3,column:1,max:1,requiredLevel:9,requires:req('druid',3,2),effect:'magicDamage',value:.15})
  ]
};

export const TALENTS=Object.values(trees).flat();
export const talentById=(id:string)=>TALENTS.find(talent=>talent.id===id);
export const talentsForClass=(classId:ClassId)=>trees[classId];
