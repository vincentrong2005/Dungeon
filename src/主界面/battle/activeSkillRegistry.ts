import { CardType, type ActiveSkillData } from '../types';

const 重来: ActiveSkillData = {
  id: 'active_basic_reroll_self',
  name: '重来！',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 1,
  description: '重掷自己的骰子',
};

const 你也重来: ActiveSkillData = {
  id: 'active_basic_reroll_enemy',
  name: '你也重来！',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 1,
  description: '重掷对手的骰子',
};

const 抽牌: ActiveSkillData = {
  id: 'active_basic_draw',
  name: '抽牌',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 2,
  Cooldown: 1,
  description: '抽一张牌，若手牌满三张则随机替换一张',
};

const 防御: ActiveSkillData = {
  id: 'active_basic_guard',
  name: '防御！',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  description: '增加2点护甲',
};

const 增幅: ActiveSkillData = {
  id: 'active_basic_boost',
  name: '增幅',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 1,
  Cooldown: 1,
  description: '我方骰子点数+1',
};

const 削弱: ActiveSkillData = {
  id: 'active_basic_weaken',
  name: '削弱',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  description: '敌方骰子点数-1',
};

const 走光: ActiveSkillData = {
  id: 'active_basic_expose',
  name: '走光',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 2,
  description: '使敌人的点数+3',
};

const 弹刀: ActiveSkillData = {
  id: 'active_basic_parry_blade',
  name: '弹刀',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 7,
  description: '获得持续1回合的1层结界',
};

const 涂鸦: ActiveSkillData = {
  id: 'active_basic_graffiti',
  name: '涂鸦',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 4,
  description: '将双方的骰子点数设为6',
};

const 疾跑: ActiveSkillData = {
  id: 'active_basic_sprint',
  name: '疾跑',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  Cooldown: 0,
  maxUses: 4,
  description: '抽一张牌，若手牌满三张则随机替换一张。每场战斗仅限4次。',
};

const 洗牌魔法: ActiveSkillData = {
  id: 'active_basic_shuffle_magic',
  name: '洗牌魔法',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  Cooldown: 3,
  description: '重新抽取你的卡牌',
};

const 无限增幅魔法: ActiveSkillData = {
  id: 'active_basic_infinite_amp_magic',
  name: '无限增幅魔法',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 1,
  Cooldown: 0,
  description: '点数+1，每使用一次本主动技，本主动技本回合法力消耗+1',
};

const 老虎机: ActiveSkillData = {
  id: 'active_basic_slot_machine',
  name: '老虎机',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 1,
  Cooldown: 0,
  description: '重掷双方骰子，每使用一次本主动技，本主动技本回合法力消耗+1',
};

const 和平: ActiveSkillData = {
  id: 'active_basic_peace',
  name: '和平',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 2,
  Cooldown: 3,
  description: '将双方的骰子点数设为0',
};

const 黄金宝箱: ActiveSkillData = {
  id: 'active_basic_golden_chest',
  name: '黄金宝箱',
  type: CardType.ACTIVE,
  category: '基础',
  rarity: '稀有',
  manaCost: 1,
  Cooldown: 2,
  description: '将手牌在本场战斗中替换为牌库中的随机稀有卡牌',
};

const ACTIVE_SKILL_REGISTRY: readonly ActiveSkillData[] = [
  重来,
  你也重来,
  抽牌,
  防御,
  增幅,
  削弱,
  走光,
  弹刀,
  涂鸦,
  疾跑,
  洗牌魔法,
  无限增幅魔法,
  老虎机,
  和平,
  黄金宝箱,
];

const ACTIVE_SKILL_BY_NAME = new Map<string, ActiveSkillData>(
  ACTIVE_SKILL_REGISTRY.map((skill) => [skill.name, skill]),
);

const ACTIVE_SKILL_BY_ID = new Map<string, ActiveSkillData>(
  ACTIVE_SKILL_REGISTRY.map((skill) => [skill.id, skill]),
);

export const getAllActiveSkills = (): ActiveSkillData[] => ACTIVE_SKILL_REGISTRY.map((skill) => ({ ...skill }));

export const getActiveSkillByName = (name: string): ActiveSkillData | null => {
  const skill = ACTIVE_SKILL_BY_NAME.get(name);
  return skill ? { ...skill } : null;
};

export const getActiveSkillById = (id: string): ActiveSkillData | null => {
  const skill = ACTIVE_SKILL_BY_ID.get(id);
  return skill ? { ...skill } : null;
};

export const resolveActiveSkillNames = (names: string[]): ActiveSkillData[] => names
  .map((name) => getActiveSkillByName(name))
  .filter((skill): skill is ActiveSkillData => Boolean(skill));
