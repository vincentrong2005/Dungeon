import { EffectType } from './types';

/**
 * 限时 / 本层 / 领主战修正（`$战斗修正`）。
 *
 * 每项 { 来源, 对象, 效果, 数值, 范围, 剩余 }：
 *   - 对象：自身 / 敌方 / 双方
 *   - 范围：下N场（跨层，按场数递减）/ 本层下N场（按场数递减，离开本层清除）/ 本层 / 本层领主战 / 本层非领主战
 *   - 效果：护甲、回复生命（开局）、魔力（开局）、最小点数、最大点数、最小点数下限、吸血（造成伤害时回复）、
 *           奖励刷新、金币倍率、临时淫文（随机若干张卡）、进房回复（每进入一个房间）、`状态·<效果名>`（开局获得的状态层数）
 * 永久效果应做成事件圣遗物；这里只放有时限的效果。
 */

export const COMBAT_MODIFIER_TARGETS = ['自身', '敌方', '双方'] as const;
export type CombatModifierTarget = (typeof COMBAT_MODIFIER_TARGETS)[number];

export const COMBAT_MODIFIER_SCOPES = ['下N场', '本层下N场', '本层', '本层领主战', '本层非领主战'] as const;
export type CombatModifierScope = (typeof COMBAT_MODIFIER_SCOPES)[number];

export const STATUS_MODIFIER_PREFIX = '状态·';

export type CombatModifierEffect =
  | '护甲'
  | '回复生命'
  | '魔力'
  | '最小点数'
  | '最大点数'
  | '最小点数下限'
  | '吸血'
  | '奖励刷新'
  | '金币倍率'
  | '临时淫文'
  | '进房回复'
  | `${typeof STATUS_MODIFIER_PREFIX}${string}`;

export interface CombatModifier {
  来源: string;
  对象: CombatModifierTarget;
  效果: CombatModifierEffect;
  数值: number;
  范围: CombatModifierScope;
  /** 仅「下N场 / 本层下N场」使用：剩余场数 */
  剩余: number;
}

export type CombatModifierInput = Omit<CombatModifier, '来源' | '剩余'> & { 剩余?: number };

const EFFECT_TYPE_VALUES = new Set<string>(Object.values(EffectType));

export const toStatusModifierEffect = (effectType: EffectType): CombatModifierEffect =>
  `${STATUS_MODIFIER_PREFIX}${effectType}`;

const parseStatusEffectType = (effect: string): EffectType | null => {
  if (!effect.startsWith(STATUS_MODIFIER_PREFIX)) return null;
  const name = effect.slice(STATUS_MODIFIER_PREFIX.length);
  return EFFECT_TYPE_VALUES.has(name) ? (name as EffectType) : null;
};

const isCounted = (scope: CombatModifierScope) => scope === '下N场' || scope === '本层下N场';

export const normalizeCombatModifiers = (value: unknown): CombatModifier[] => {
  if (!Array.isArray(value)) return [];
  const result: CombatModifier[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const target = COMBAT_MODIFIER_TARGETS.includes(item.对象 as CombatModifierTarget) ? (item.对象 as CombatModifierTarget) : '自身';
    const scope = COMBAT_MODIFIER_SCOPES.includes(item.范围 as CombatModifierScope) ? (item.范围 as CombatModifierScope) : '下N场';
    const effect = typeof item.效果 === 'string' ? item.效果.trim() : '';
    const amount = Number(item.数值);
    const remaining = Math.floor(Number(item.剩余));
    if (!effect || !Number.isFinite(amount)) continue;
    if (isCounted(scope) && !(remaining > 0)) continue;
    result.push({
      来源: typeof item.来源 === 'string' ? item.来源 : '',
      对象: target,
      效果: effect as CombatModifierEffect,
      数值: amount,
      范围: scope,
      剩余: isCounted(scope) ? remaining : 0,
    });
  }
  return result;
};

export const createCombatModifier = (source: string, input: CombatModifierInput): CombatModifier => ({
  来源: source,
  对象: input.对象,
  效果: input.效果,
  数值: input.数值,
  范围: input.范围,
  剩余: isCounted(input.范围) ? Math.max(1, Math.floor(input.剩余 ?? 1)) : 0,
});

const appliesToBattle = (modifier: CombatModifier, isLordBattle: boolean): boolean => {
  if (modifier.效果 === '进房回复') return false;
  if (modifier.范围 === '本层领主战') return isLordBattle;
  if (modifier.范围 === '本层非领主战') return !isLordBattle;
  return true;
};

export interface BattleSideModifiers {
  armor: number;
  heal: number;
  mana: number;
  minDice: number;
  maxDice: number;
  /** 最小点数下限（0 = 无）：最小点数低于它时提升至它，最大点数低于它时也提升至它 */
  minDiceFloor: number;
  lifesteal: number;
  effects: Array<{ type: EffectType; stacks: number }>;
}

export interface ResolvedBattleModifiers {
  /** 本场生效的来源（用于战斗日志） */
  sources: string[];
  player: BattleSideModifiers;
  enemy: BattleSideModifiers & { hpMultiplier: number };
  rewardRefreshBonus: number;
  goldMultiplier: number;
  tempYinwenCount: number;
}

const emptySide = (): BattleSideModifiers => ({
  armor: 0,
  heal: 0,
  mana: 0,
  minDice: 0,
  maxDice: 0,
  minDiceFloor: 0,
  lifesteal: 0,
  effects: [],
});

export const createEmptyBattleModifiers = (): ResolvedBattleModifiers => ({
  sources: [],
  player: emptySide(),
  enemy: { ...emptySide(), hpMultiplier: 1 },
  rewardRefreshBonus: 0,
  goldMultiplier: 1,
  tempYinwenCount: 0,
});

const addToSide = (side: BattleSideModifiers, effect: string, amount: number) => {
  const statusType = parseStatusEffectType(effect);
  if (statusType) {
    const existing = side.effects.find(entry => entry.type === statusType);
    if (existing) existing.stacks += amount;
    else side.effects.push({ type: statusType, stacks: amount });
    return;
  }
  switch (effect) {
    case '护甲':
      side.armor += amount;
      break;
    case '回复生命':
      side.heal += amount;
      break;
    case '魔力':
      side.mana += amount;
      break;
    case '最小点数':
      side.minDice += amount;
      break;
    case '最大点数':
      side.maxDice += amount;
      break;
    case '最小点数下限':
      side.minDiceFloor = Math.max(side.minDiceFloor, Math.floor(amount));
      break;
    case '吸血':
      side.lifesteal += amount;
      break;
    default:
      break;
  }
};

/** 汇总一场战斗生效的全部修正 */
export const resolveBattleModifiers = (
  list: readonly CombatModifier[],
  options: { isLordBattle: boolean },
): ResolvedBattleModifiers => {
  const resolved = createEmptyBattleModifiers();
  const sources = new Set<string>();
  for (const modifier of list) {
    if (!appliesToBattle(modifier, options.isLordBattle)) continue;
    if (modifier.来源) sources.add(modifier.来源);
    if (modifier.效果 === '奖励刷新') {
      resolved.rewardRefreshBonus += Math.max(0, Math.floor(modifier.数值));
      continue;
    }
    if (modifier.效果 === '金币倍率') {
      resolved.goldMultiplier *= Math.max(0, modifier.数值);
      continue;
    }
    if (modifier.效果 === '临时淫文') {
      resolved.tempYinwenCount += Math.max(0, Math.floor(modifier.数值));
      continue;
    }
    if (modifier.对象 === '自身' || modifier.对象 === '双方') addToSide(resolved.player, modifier.效果, modifier.数值);
    if (modifier.对象 === '敌方' || modifier.对象 === '双方') addToSide(resolved.enemy, modifier.效果, modifier.数值);
  }
  resolved.sources = Array.from(sources);
  return resolved;
};

export const hasAnyBattleModifier = (resolved: ResolvedBattleModifiers): boolean =>
  resolved.sources.length > 0 || resolved.enemy.hpMultiplier !== 1;

/** 一场战斗结束后：计数类修正递减（归零移除），领主战修正在领主战后移除 */
export const consumeBattleModifiers = (
  list: readonly CombatModifier[],
  options: { isLordBattle: boolean },
): CombatModifier[] => {
  const next: CombatModifier[] = [];
  for (const modifier of list) {
    if (!appliesToBattle(modifier, options.isLordBattle)) {
      next.push({ ...modifier });
      continue;
    }
    if (isCounted(modifier.范围)) {
      const remaining = modifier.剩余 - 1;
      if (remaining > 0) next.push({ ...modifier, 剩余: remaining });
      continue;
    }
    if (modifier.范围 === '本层领主战') continue;
    next.push({ ...modifier });
  }
  return next;
};

/** 离开本层：清除所有限本层的修正 */
export const expireFloorCombatModifiers = (list: readonly CombatModifier[]): CombatModifier[] =>
  list.filter(modifier => modifier.范围 === '下N场').map(modifier => ({ ...modifier }));

/** 每进入一个房间的生命回复（如脐带连接·暂时供养） */
export const getRoomEntryHealFromModifiers = (list: readonly CombatModifier[]): number =>
  list
    .filter(modifier => modifier.效果 === '进房回复')
    .reduce((sum, modifier) => sum + Math.max(0, Math.floor(modifier.数值)), 0);

const describeEffect = (effect: string, amount: number): string => {
  const statusType = parseStatusEffectType(effect);
  if (statusType) return `开局获得${amount}层${statusType}`;
  const signed = amount >= 0 ? `+${amount}` : `${amount}`;
  switch (effect) {
    case '护甲':
      return `开局获得${amount}点护甲`;
    case '回复生命':
      return `开局回复${amount}点生命`;
    case '魔力':
      return `开局魔力${signed}`;
    case '最小点数':
      return `最小点数${signed}`;
    case '最大点数':
      return `最大点数${signed}`;
    case '最小点数下限':
      return `最小点数不得低于${amount}（最大点数低于${amount}时也提升至${amount}）`;
    case '吸血':
      return `造成伤害时回复${amount}点生命`;
    case '奖励刷新':
      return `战斗奖励刷新次数+${amount}`;
    case '金币倍率':
      return `战斗金币×${amount}`;
    case '临时淫文':
      return `随机${amount}张卡临时获得【淫文】`;
    case '进房回复':
      return `每进入一个房间回复${amount}点生命`;
    default:
      return `${effect}${signed}`;
  }
};

const describeScope = (modifier: CombatModifier): string => {
  switch (modifier.范围) {
    case '下N场':
      return `接下来${modifier.剩余}场战斗`;
    case '本层下N场':
      return `本层接下来${modifier.剩余}场战斗`;
    case '本层':
      return modifier.效果 === '进房回复' ? '本层内' : '本层战斗';
    case '本层领主战':
      return '本层领主战';
    case '本层非领主战':
      return '本层领主战以外的战斗';
  }
};

const describeTarget = (target: CombatModifierTarget): string =>
  target === '自身' ? '' : target === '敌方' ? '敌方' : '双方';

/** 状态栏展示文本，例如「[御膳] 本层领主战：开局获得30点护甲」 */
export const describeCombatModifier = (modifier: CombatModifier): string =>
  `${modifier.来源 ? `[${modifier.来源}] ` : ''}${describeScope(modifier)}：${describeTarget(modifier.对象)}${describeEffect(modifier.效果, modifier.数值)}`;
