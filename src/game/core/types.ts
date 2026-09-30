import type { ProficiencyId } from '../rpg/proficiencies';
import type { ProgressProfile } from '../rpg/profile';
export type ClassId = 'squire' | 'hunter' | 'mage' | 'knight' | 'monk' | 'paladin' | 'necromancer' | 'druid';
export type CharacterRow = 'front' | 'back';
export type Slot = 'helmet' | 'armor' | 'legs' | 'boots' | 'weapon' | 'offhand' | 'amulet' | 'ring';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type HuntStatus = 'idle' | 'running' | 'paused' | 'transition' | 'recovering';
export type ItemKind = 'equipment' | 'loot' | 'supply';

export interface Stats { maxHp: number; maxMana: number; attack: number; defense: number; attackSpeed: number; crit: number; resistance: number; magicPower: number; }
export interface SpellCondition { hpBelow?: number; minEnemies?: number; allyInjured?: boolean; manaAbove?: number; }
export interface HelperConfig { hpPotionAt: number; manaPotionAt: number; healAllies: boolean; autoSupplies: boolean; defensiveAmuletAt: number; emergencyAt: number; outOfSupplies: 'continue' | 'end'; }
export interface Character {
  id: string; name: string; classId: ClassId; profile: ProgressProfile;
  /** Linha de combate e tanque (no máximo um por grupo): definem a posição no mapa e quem apanha. */
  row: CharacterRow; isTank: boolean;
  /** Sprite cosmético escolhido ('block' = bloco colorido da classe); a evolução de classe nunca o muda. */
  spriteId: string;
  hp: number; mana: number; equipment: Partial<Record<Slot, string>>;
  spellSlots: string[]; spellConditions: Record<string, SpellCondition>; /** Ranks comprados nas grades de talentos (id do nó -> rank), Origem incluída; os pontos livres são derivados do nível. */
  talentRanks: Record<string, number>;
  cooldowns: Record<string, number>; effects: ActiveEffect[]; helper: HelperConfig;
}
export interface ActiveEffect { id: string; type: 'regen' | 'shield' | 'buffAttack' | 'buffDefense'; value: number; remaining: number; tick?: number; source?: string; }
export interface MonsterDef { id: string; name: string; hp: number; attack: number; defense: number; speed: number; xp: number; gold: [number, number]; color: number; boss?: boolean; loot: LootEntry[]; location: string;
  /** Afinidade elemental (bloco 8): dano de magia do elemento ×1,30 se fraco, ×0,70 se resiste. */
  element?: ProficiencyId; weak?: ProficiencyId[]; resist?: ProficiencyId[]; hunt?: string; }
/** Status ativos (segundos restantes); Combustão empilha até 5 e guarda quem aplicou, para creditar o dano contínuo. */
export interface MonsterStatuses { burn?: { stacks: number; remaining: number; power: number; source: string; acc: number }; frozen?: number; stunned?: number; }
export interface MonsterRuntime { uid: string; defId: string; hp: number; maxHp: number; cooldown: number; alive: boolean; statuses?: MonsterStatuses; }
export interface WaveDef { name: string; monsters: string[]; }
export interface SpellDef { id: string; classId: ClassId; name: string; level: number; mana: number; cooldown: number; target: 'enemy' | 'allEnemies' | 'self' | 'ally' | 'allAllies'; power: number; kind: 'damage' | 'heal' | 'regen' | 'shield' | 'buff'; duration?: number; description: string; element?: ProficiencyId; universal?: boolean;
  /** Combustão aplicada por acerto, e segundos de congelamento/atordoamento. */
  burnStacks?: number; freeze?: number; stun?: number;
  /** Magia de subclasse: só disponível se o nó estiver no caminho da classe. */
  node?: string; }
export interface ItemDef { id: string; name: string; kind: ItemKind; rarity: Rarity; value: number; /** preço de compra no Ferreiro (a venda vale `value`) */ price?: number; slot?: Slot; classIds?: ClassId[]; level?: number; stats?: Partial<Stats>; trains?: 'melee' | 'ranged'; supply?: 'health' | 'mana'; amount?: number; }
export interface LootEntry { itemId: string; chance: number; min: number; max: number; }
export interface InventoryStack { itemId: string; quantity: number; }
export interface InventoryState { bp: InventoryStack[]; loot: InventoryStack[]; supply: InventoryStack[]; capacity: { bp: number; loot: number; supply: number }; }
export interface Analyzer { startedAt: number; activeMs: number; xp: number; gold: number; damage: number; damageTaken: number; healing: number; byCharacter: Record<string, number>; byMonster: Record<string, number>; kills: Record<string, number>; bosses: number; loot: Record<string, number>; lootValue: number; suppliesValue: number; suppliesUsed: Record<string, number>; cycles: number; defeats: number; }
export interface CodexEntry { kills: number; discoveredLoot: string[]; claimed: number[]; }
export interface CharmDef { id: string; name: string; cost: number; milestone: number; effect: 'damage' | 'resistance' | 'recovery' | 'experience'; value: number; }
/** Retorno de uma sessão offline: XP/ouro da hunt de referência (25%) e tries nas vagas de treino. */
export interface OfflineReport {
  seconds: number; /** a caçada que estava salva foi encerrada ao voltar */ huntEnded?: boolean;
  hunt?: string; share?: number; gold?: number;
  entries: { name: string; xp: number; levelsGained: number; training: { target: ProficiencyId; tries: number; levelsGained: number }[] }[];
}
export interface GameState {
  version: 1; status: HuntStatus; autoAdvance: boolean; wave: number; cycle: number; transitionMs: number;
  characters: Character[]; team: string[]; monsters: MonsterRuntime[]; inventory: InventoryState;
  gold: number; charmPoints: number; charmSlots: number; equippedCharms: string[]; unlockedCharms: string[];
  codex: Record<string, CodexEntry>; analyzer: Analyzer; history: Analyzer[]; message: string; lastSavedAt: number;
  /** Hunt atual (padrão 'catacumbas'). */
  huntId: string;
  /** Estatística por hunt (tempo ativo simulado, XP por personagem, ouro, chefes): base da taxa do crédito offline. */
  huntStats: Record<string, { activeMs: number; xp: number; gold: number; bossKills: number }>;
  offlineReport?: OfflineReport;
}
