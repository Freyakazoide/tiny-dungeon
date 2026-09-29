import type { ClassId, TalentDef } from '../core/types';

const names: Record<ClassId, string[]> = {
  knight:['Vigor','Muralha','Mestre da Lâmina','Fortaleza','Contra-ataque','Guardião'],
  monk:['Disciplina','Punhos de Aço','Fluxo','Combo','Evasão','Transcendência'],
  paladin:['Precisão','Fé','Mira Mortal','Luz Protetora','Aljava','Julgamento'],
  necromancer:['Conhecimento Proibido','Reserva Sombria','Canalização','Impacto Fúnebre','Barreira Óssea','Mestre da Morte'],
  druid:['Vitalidade','Seiva','Crescimento','Espinhos','Renovação','Avatar']
};
const effects: TalentDef['effect'][] = ['hp','attack','defense','mana','crit','cooldown'];
export const TALENTS: TalentDef[] = (Object.keys(names) as ClassId[]).flatMap(classId => names[classId].map((name,i) => ({
  id:`${classId}_talent_${i}`, classId, name, description:`${i===5?'Talento mestre':'Aprimoramento'} de ${name.toLowerCase()}.`, max:i===5?1:3,
  requires:i>1?`${classId}_talent_${Math.floor((i-2)/2)}`:undefined, effect:effects[i], value:[.08,.06,.06,.09,.025,.05][i]
})));
