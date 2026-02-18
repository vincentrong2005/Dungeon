export enum CardType {
  PHYSICAL = '物理',
  MAGIC = '魔法',
  ACTION = '行动',
  DODGE = '闪避',
}

export enum GamePhase {
  EXPLORE = 'EXPLORE',
  COMBAT = 'COMBAT',
}

export enum CombatPhase {
  INIT = 'INIT',
  ROLL_PHASE = 'ROLL_PHASE',
  DRAW_PHASE = 'DRAW_PHASE',
  PLAYER_ACTION = 'PLAYER_ACTION',
  RESOLUTION = 'RESOLUTION',
  WIN = 'WIN',
  LOSE = 'LOSE',
}

export interface CardData {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  value: number;
  description: string;
  image?: string;
}

export interface EntityStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  buffs: string[];
  minDice: number;
  maxDice: number;
}

export interface CombatState {
  turn: number;
  phase: CombatPhase;
  playerDice: number;
  enemyDice: number;
  playerHand: CardData[];
  playerDeck: CardData[];
  discardPile: CardData[];
  enemyIntentCard: CardData | null;
  playerSelectedCard: CardData | null;
  logs: string[];
}
