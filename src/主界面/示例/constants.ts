import { CardData, CardType, EntityStats } from './types';

export const INITIAL_PLAYER_STATS: EntityStats = {
  hp: 50,
  maxHp: 50,
  mp: 20,
  maxMp: 20,
  gold: 100,
  buffs: [],
  minDice: 1,
  maxDice: 6,
};

export const INITIAL_ENEMY_STATS: EntityStats = {
  hp: 60,
  maxHp: 60,
  mp: 15,
  maxMp: 15,
  gold: 20,
  buffs: [],
  minDice: 2, // Slightly stronger minimum
  maxDice: 6,
};

// Initial Deck of 9 Cards
export const STARTING_DECK: CardData[] = [
  { id: 'c1', name: '锈蚀铁剑', type: CardType.PHYSICAL, cost: 0, value: 6, description: '基础物理攻击。' },
  { id: 'c2', name: '锈蚀铁剑', type: CardType.PHYSICAL, cost: 0, value: 6, description: '基础物理攻击。' },
  { id: 'c3', name: '侧身闪避', type: CardType.DODGE, cost: 1, value: 0, description: '若敌方点数高于我方，则敌方攻击失效。' },
  { id: 'c4', name: '火球术', type: CardType.MAGIC, cost: 3, value: 12, description: '强大的火焰魔法。' },
  { id: 'c5', name: '专注', type: CardType.ACTION, cost: 0, value: 0, description: '恢复5点魔法值。' },
  { id: 'c6', name: '重击', type: CardType.PHYSICAL, cost: 2, value: 10, description: '强力的物理一击。' },
  { id: 'c7', name: '魔法护盾', type: CardType.MAGIC, cost: 2, value: 5, description: '抵挡下一次伤害。' },
  { id: 'c8', name: '暗影步', type: CardType.DODGE, cost: 2, value: 0, description: '若敌方点数高于我方，则敌方攻击失效并造成5点反伤。' },
  { id: 'c9', name: '匕首投掷', type: CardType.PHYSICAL, cost: 1, value: 4, description: '快速的物理攻击。' },
];

export const ENEMY_DECK: CardData[] = [
  { id: 'e1', name: '利爪撕扯', type: CardType.PHYSICAL, cost: 0, value: 8, description: '野兽的攻击。' },
  { id: 'e2', name: '黑暗低语', type: CardType.MAGIC, cost: 2, value: 10, description: '精神攻击。' },
  { id: 'e3', name: '咆哮', type: CardType.ACTION, cost: 0, value: 0, description: '下回合伤害提升。' },
];
