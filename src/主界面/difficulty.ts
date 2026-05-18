import { EffectType } from './types';

export type DifficultyOption = '简单' | '普通' | '困难' | '地狱' | '自定义';
export type CustomDifficultyInfluence =
  | '目盲'
  | '黑暗'
  | '愚笨'
  | '迷雾'
  | '资源稀缺'
  | '黑手烙印'
  | '体柔身轻'
  | '魔力匮乏'
  | '资源丰盛'
  | '肉装魔女'
  | '自愈体质'
  | '聪慧过人'
  | '家族传承'
  | '神圣加护'
  | '简单'
  | '普通'
  | '困难'
  | '地狱';

export interface DifficultyOptionMeta {
  value: DifficultyOption;
  label: string;
  locked?: boolean;
}

export interface CustomDifficultyInfluenceMeta {
  value: CustomDifficultyInfluence;
  label: string;
  description: string;
  exclusiveWith?: CustomDifficultyInfluence[];
}

export interface CustomDifficultyInfluenceGroup {
  title: string;
  options: CustomDifficultyInfluenceMeta[];
}

export const DIFFICULTY_OPTIONS: DifficultyOptionMeta[] = [
  { value: '简单', label: '简单' },
  { value: '普通', label: '普通' },
  { value: '困难', label: '困难' },
  { value: '地狱', label: '地狱' },
  { value: '自定义', label: '自定义' },
];

export const CUSTOM_DIFFICULTY_BASE_OPTIONS: Array<Exclude<DifficultyOption, '自定义'>> = [
  '简单',
  '普通',
  '困难',
  '地狱',
];

export const CUSTOM_DIFFICULTY_INFLUENCE_GROUPS: CustomDifficultyInfluenceGroup[] = [
  {
    title: '诅咒类',
    options: [
      { value: '目盲', label: '目盲', description: '无法看清自己的点数' },
      { value: '黑暗', label: '黑暗', description: '无法看清对方的点数' },
      { value: '愚笨', label: '愚笨', description: '无法看清自己的手牌' },
      { value: '迷雾', label: '迷雾', description: '无法看清敌方的手牌' },
    ],
  },
  {
    title: '减益类',
    options: [
      { value: '资源稀缺', label: '资源稀缺', description: '宝箱只会出现 1 个宝物。', exclusiveWith: ['资源丰盛'] },
      { value: '黑手烙印', label: '黑手烙印', description: '战斗开始时在抽牌堆中加入 1 张黑手印。' },
      { value: '体柔身轻', label: '体柔身轻', description: '初始生命上限减半。', exclusiveWith: ['肉装魔女'] },
      { value: '魔力匮乏', label: '魔力匮乏', description: '战斗开始时为自身附加 1 层法力枯竭。' },
    ],
  },
  {
    title: '增益类',
    options: [
      { value: '资源丰盛', label: '资源丰盛', description: '宝箱必定出现 2 个宝物。', exclusiveWith: ['资源稀缺'] },
      { value: '肉装魔女', label: '肉装魔女', description: '初始生命上限翻倍。', exclusiveWith: ['体柔身轻'] },
      { value: '自愈体质', label: '自愈体质', description: '战斗胜利后回复至满生命值。' },
      { value: '聪慧过人', label: '聪慧过人', description: '战斗后卡牌奖励刷新次数 +1，可与银色卡牌叠加。' },
      { value: '家族传承', label: '家族传承', description: '最小/最大骰子点数+2。' },
      { value: '神圣加护', label: '神圣加护', description: '免疫敌方卡牌附带的负面状态。' },
    ],
  },
  {
    title: '难度类',
    options: [
      { value: '简单', label: '简单', description: '采用简单难度的战斗影响。' },
      { value: '普通', label: '普通', description: '采用普通难度的战斗影响。' },
      { value: '困难', label: '困难', description: '采用困难难度的战斗影响。' },
      { value: '地狱', label: '地狱', description: '采用地狱难度的战斗影响。' },
    ],
  },
];

const CUSTOM_DIFFICULTY_INFLUENCE_VALUES = new Set<CustomDifficultyInfluence>(
  CUSTOM_DIFFICULTY_INFLUENCE_GROUPS.flatMap(group => group.options.map(option => option.value)),
);
const CUSTOM_DIFFICULTY_BASE_SET = new Set<CustomDifficultyInfluence>(CUSTOM_DIFFICULTY_BASE_OPTIONS);

export const HELL_STARTING_DEBUFFS: EffectType[] = [
  EffectType.PEEP_FORBIDDEN,
  EffectType.BLIND_ASH,
  EffectType.COGNITIVE_INTERFERENCE,
  EffectType.MEMORY_FOG,
];

export function normalizeDifficulty(value: unknown): DifficultyOption {
  if (typeof value !== 'string') return '普通';
  const matched = DIFFICULTY_OPTIONS.find(option => option.value === value.trim());
  return matched?.value ?? '普通';
}

export function normalizeCustomDifficultyInfluences(value: unknown): CustomDifficultyInfluence[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<CustomDifficultyInfluence>();
  const result: CustomDifficultyInfluence[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim() as CustomDifficultyInfluence;
    if (!CUSTOM_DIFFICULTY_INFLUENCE_VALUES.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function getCustomDifficultyBaseDifficulty(influences: unknown): Exclude<DifficultyOption, '自定义'> {
  const normalized = normalizeCustomDifficultyInfluences(influences);
  for (let i = normalized.length - 1; i >= 0; i -= 1) {
    const item = normalized[i];
    if (item && CUSTOM_DIFFICULTY_BASE_SET.has(item)) {
      return item as Exclude<DifficultyOption, '自定义'>;
    }
  }
  return '普通';
}

export function hasCustomDifficultyInfluence(influences: unknown, influence: CustomDifficultyInfluence): boolean {
  return normalizeCustomDifficultyInfluences(influences).includes(influence);
}

export function getEffectiveDifficulty(
  difficulty: DifficultyOption,
  customInfluences?: unknown,
): Exclude<DifficultyOption, '自定义'> {
  return difficulty === '自定义' ? getCustomDifficultyBaseDifficulty(customInfluences) : difficulty;
}

export function getDifficultyHpMultiplier(
  difficulty: DifficultyOption,
  floor: number,
  customInfluences?: unknown,
): number {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  switch (getEffectiveDifficulty(difficulty, customInfluences)) {
    case '简单':
      return 0.8;
    case '困难':
      return 1 + 0.2 * safeFloor;
    case '地狱':
      return Math.pow(1.2, 2 * safeFloor);
    case '普通':
    default:
      return 1;
  }
}

export function shouldRestoreFullHpOnBattleStart(difficulty: DifficultyOption, customInfluences?: unknown): boolean {
  return getEffectiveDifficulty(difficulty, customInfluences) === '简单';
}

export function shouldGrantLordTurnBoost(difficulty: DifficultyOption, customInfluences?: unknown): boolean {
  const effectiveDifficulty = getEffectiveDifficulty(difficulty, customInfluences);
  return effectiveDifficulty === '困难' || effectiveDifficulty === '地狱';
}

export function getLordTurnBoostInterval(difficulty: DifficultyOption, customInfluences?: unknown): number | null {
  switch (getEffectiveDifficulty(difficulty, customInfluences)) {
    case '困难':
      return 5;
    case '地狱':
      return 4;
    default:
      return null;
  }
}

export function shouldApplyHellStartingDebuff(difficulty: DifficultyOption, customInfluences?: unknown): boolean {
  return getEffectiveDifficulty(difficulty, customInfluences) === '地狱';
}

export function getDifficultyPreviewLines(
  difficulty: DifficultyOption,
  floor: number,
  customInfluences?: unknown,
): string[] {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  switch (difficulty) {
    case '简单':
      return ['进入战斗时回复至满血。', '敌人血量系数：0.8。'];
    case '困难':
      return [
        '领主每 5 个回合获得 1 层“增伤”。',
        `敌人血量系数：1 + 0.2 × 楼层数，当前楼层为 ${safeFloor}，本层系数 ${getDifficultyHpMultiplier(difficulty, safeFloor).toFixed(1)}。`,
      ];
    case '地狱':
      return [
        '领主每 4 个回合获得 1 层“增伤”。',
        '每场战斗开始时，随机获得 1 层“虚实不明 / 思绪被扰乱 / 敌意隐藏 / 视野模糊”中的一种 debuff。',
        `敌人血量系数：1.2 ^ (2 × 楼层数)，当前楼层为 ${safeFloor}，本层系数 ${getDifficultyHpMultiplier(difficulty, safeFloor, customInfluences).toFixed(1)}。`,
      ];
    case '自定义': {
      const normalized = normalizeCustomDifficultyInfluences(customInfluences);
      const baseDifficulty = getCustomDifficultyBaseDifficulty(normalized);
      const extraInfluences = normalized.filter(item => !CUSTOM_DIFFICULTY_BASE_SET.has(item));
      return [
        `难度基准：${baseDifficulty}。`,
        extraInfluences.length > 0 ? `已启用影响：${extraInfluences.join('、')}。` : '未启用额外自定义影响。',
        ...getDifficultyPreviewLines(baseDifficulty, safeFloor),
      ];
    }
    case '普通':
    default:
      return ['无额外战斗修正。', '敌人血量系数：1.0。'];
  }
}
