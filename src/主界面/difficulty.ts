import { EffectType } from './types';

export type DifficultyOption = '简单' | '普通' | '困难' | '地狱' | '自定义';

export interface DifficultyOptionMeta {
  value: DifficultyOption;
  label: string;
  locked?: boolean;
}

export const DIFFICULTY_OPTIONS: DifficultyOptionMeta[] = [
  { value: '简单', label: '简单' },
  { value: '普通', label: '普通' },
  { value: '困难', label: '困难' },
  { value: '地狱', label: '地狱' },
  { value: '自定义', label: '自定义', locked: true },
];

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

export function getDifficultyHpMultiplier(difficulty: DifficultyOption, floor: number): number {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  switch (difficulty) {
    case '简单':
      return 0.8;
    case '困难':
      return 1 + 0.1 * safeFloor;
    case '地狱':
      return 1 + 0.2 * safeFloor;
    case '普通':
    case '自定义':
    default:
      return 1;
  }
}

export function shouldRestoreFullHpOnBattleStart(difficulty: DifficultyOption): boolean {
  return difficulty === '简单';
}

export function shouldGrantLordTurnBoost(difficulty: DifficultyOption): boolean {
  return difficulty === '困难' || difficulty === '地狱';
}

export function getLordTurnBoostInterval(difficulty: DifficultyOption): number | null {
  switch (difficulty) {
    case '困难':
      return 5;
    case '地狱':
      return 4;
    default:
      return null;
  }
}

export function shouldApplyHellStartingDebuff(difficulty: DifficultyOption): boolean {
  return difficulty === '地狱';
}

export function getDifficultyPreviewLines(difficulty: DifficultyOption, floor: number): string[] {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  switch (difficulty) {
    case '简单':
      return [
        '进入战斗时回复至满血。',
        '敌人血量系数：0.8。',
      ];
    case '困难':
      return [
        '领主每 5 个回合获得 1 层“增伤”。',
        `敌人血量系数：1 + 0.1 × 楼层数，当前楼层为 ${safeFloor}，本层系数 ${getDifficultyHpMultiplier(difficulty, safeFloor).toFixed(1)}。`,
      ];
    case '地狱':
      return [
        '领主每 4 个回合获得 1 层“增伤”。',
        '每场战斗开始时，随机获得 1 层“虚实不明 / 思绪被扰乱 / 敌意隐藏 / 视野模糊”中的一种 debuff。',
        `敌人血量系数：1 + 0.2 × 楼层数，当前楼层为 ${safeFloor}，本层系数 ${getDifficultyHpMultiplier(difficulty, safeFloor).toFixed(1)}。`,
      ];
    case '自定义':
      return [
        '自定义难度暂未开放，当前先锁定。',
      ];
    case '普通':
    default:
      return [
        '无额外战斗修正。',
        '敌人血量系数：1.0。',
      ];
  }
}
