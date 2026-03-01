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

const ACTIVE_SKILL_REGISTRY: readonly ActiveSkillData[] = [
  重来,
  你也重来,
  抽牌,
  防御,
  增幅,
  削弱,
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
