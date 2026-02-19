// ═══════════════════════════════════════════════════════════════
//  效果/Buff 系统 — 注册表与逻辑
// ═══════════════════════════════════════════════════════════════

import {
  type CardData,
  type CardType,
  type EffectInstance,
  type EffectPolarity,
  type EntityStats,
  EffectType,
} from '../types';

// ── 效果定义注册表 ────────────────────────────────────────────

/** 效果触发时机 */
export type EffectTiming =
  | 'onTurnStart'    // 回合开始
  | 'onTurnEnd'      // 回合结束
  | 'onBeforeDamage'  // 受到伤害前（防御侧）
  | 'onAfterDamage'  // 受到伤害后
  | 'onBeforeAttack' // 发起攻击前（攻击侧）
  | 'onAfterAttack'  // 发起攻击后
  | 'onClash'        // 拼点时
  | 'onDiceRoll'     // 骰子投掷时
  | 'onCardPlay'     // 出牌时（检查限制）
  | 'passive';       // 被动（持续生效，不需显式触发）

/** 效果定义（元数据） */
export interface EffectDefinition {
  type: EffectType;
  name: string;
  polarity: EffectPolarity;
  /** 该效果在哪些时机触发 */
  timings: EffectTiming[];
  /** 是否可叠加层数 */
  stackable: boolean;
  /** 最大叠加层数（0 = 无限制） */
  maxStacks: number;
  /** 描述文本 */
  description: string;
}

// ── 效果注册表 ────────────────────────────────────────────────

export const EFFECT_REGISTRY: Record<EffectType, EffectDefinition> = {
  [EffectType.BARRIER]: {
    type: EffectType.BARRIER,
    name: '结界',
    polarity: 'buff',
    timings: ['onBeforeDamage'],
    stackable: true,
    maxStacks: 0,
    description: '伤害免疫：抵挡任何来源的伤害判定。触发后层数-1。',
  },
  [EffectType.ARMOR]: {
    type: EffectType.ARMOR,
    name: '护甲',
    polarity: 'buff',
    timings: ['onBeforeDamage', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '伤害减免：在最终伤害结算阶段减去等量数值。',
  },
  [EffectType.BIND]: {
    type: EffectType.BIND,
    name: '束缚',
    polarity: 'debuff',
    timings: ['onCardPlay', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '行为限制：无法使用指定类型卡牌。每回合结束层数-1。',
  },
  [EffectType.DEVOUR]: {
    type: EffectType.DEVOUR,
    name: '吞食',
    polarity: 'debuff',
    timings: ['onCardPlay'],
    stackable: false,
    maxStacks: 1,
    description: '点数限制：若骰子基础点数≤3，禁用物理/闪避卡牌。',
  },
  [EffectType.POISON]: {
    type: EffectType.POISON,
    name: '中毒',
    polarity: 'debuff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '致死判定：每回合开始增加中毒量，若≥当前生命值则造成等量真实伤害。每回合-1。',
  },
  [EffectType.BURN]: {
    type: EffectType.BURN,
    name: '燃烧',
    polarity: 'debuff',
    timings: ['onTurnStart', 'onClash'],
    stackable: true,
    maxStacks: 0,
    description: '血量流失：每回合减少等量层数的生命。己方拼点成功时消失。',
  },
  [EffectType.BLEED]: {
    type: EffectType.BLEED,
    name: '流血',
    polarity: 'debuff',
    timings: ['onClash', 'onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '真实伤害：拼点时造成等量层数的真实伤害。每回合-1。',
  },
  [EffectType.VULNERABLE]: {
    type: EffectType.VULNERABLE,
    name: '易伤',
    polarity: 'debuff',
    timings: ['onBeforeDamage'],
    stackable: true,
    maxStacks: 0,
    description: '伤害放大：增加受到伤害的结算系数（加算）。',
  },
  [EffectType.REGEN]: {
    type: EffectType.REGEN,
    name: '生命回复',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '持续回血：每回合开始时回复等量层数的生命。',
  },
  [EffectType.IGNITE_AURA]: {
    type: EffectType.IGNITE_AURA,
    name: '施加燃烧',
    polarity: 'mixed',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '环境效果：每回合开始时为战斗双方施加一层燃烧。',
  },
  [EffectType.STUN]: {
    type: EffectType.STUN,
    name: '眩晕',
    polarity: 'debuff',
    timings: ['onTurnStart', 'onTurnEnd'],
    stackable: false,
    maxStacks: 1,
    description: '行动剥夺：无法执行任何出牌或拼点行动。一回合后消失。',
  },
  [EffectType.CHARGE]: {
    type: EffectType.CHARGE,
    name: '蓄力',
    polarity: 'buff',
    timings: ['onDiceRoll', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '点数增益：下一次投掷骰子时点数直接增加对应数值。一回合后消失。',
  },
  [EffectType.COLD]: {
    type: EffectType.COLD,
    name: '寒冷',
    polarity: 'debuff',
    timings: ['onBeforeAttack', 'onAfterAttack'],
    stackable: true,
    maxStacks: 0,
    description: '威力削弱：降低造成的伤害数值。攻击结算后层数减半。',
  },
  [EffectType.NON_LIVING]: {
    type: EffectType.NON_LIVING,
    name: '非生物',
    polarity: 'trait',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '异常免疫：完全免疫流血与中毒效果。',
  },
  [EffectType.MANA_DRAIN]: {
    type: EffectType.MANA_DRAIN,
    name: '法力枯竭',
    polarity: 'debuff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '资源封锁：每回合开始时强制将当前法力值清零。每回合-1。',
  },
  [EffectType.MANA_SPRING]: {
    type: EffectType.MANA_SPRING,
    name: '魔力源泉',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时自身魔力+层数，无时限。',
  },
};

// ═══════════════════════════════════════════════════════════════
//  效果工具函数
// ═══════════════════════════════════════════════════════════════

/**
 * 查找实体身上指定类型的效果
 */
export function findEffect(entity: EntityStats, type: EffectType): EffectInstance | undefined {
  return entity.effects.find(e => e.type === type);
}

/**
 * 检查实体是否拥有指定效果
 */
export function hasEffect(entity: EntityStats, type: EffectType): boolean {
  return entity.effects.some(e => e.type === type && e.stacks > 0);
}

/**
 * 获取效果层数（无效果返回 0）
 */
export function getEffectStacks(entity: EntityStats, type: EffectType): number {
  const effect = findEffect(entity, type);
  return effect ? effect.stacks : 0;
}

/**
 * 为实体施加效果（叠加或新增）
 * 自动处理：非生物免疫流血/中毒
 */
export function applyEffect(
  entity: EntityStats,
  type: EffectType,
  stacks: number = 1,
  options?: { restrictedTypes?: CardType[]; source?: string },
): boolean {
  // 非生物免疫检查
  if (hasEffect(entity, EffectType.NON_LIVING)) {
    if (type === EffectType.POISON || type === EffectType.BLEED) {
      return false; // 免疫
    }
  }

  const def = EFFECT_REGISTRY[type];
  const existing = findEffect(entity, type);

  if (existing) {
    if (def.stackable) {
      existing.stacks += stacks;
      if (def.maxStacks > 0) {
        existing.stacks = Math.min(existing.stacks, def.maxStacks);
      }
    }
    // 更新束缚的限制类型
    if (type === EffectType.BIND && options?.restrictedTypes) {
      existing.restrictedTypes = options.restrictedTypes;
    }
    return true;
  }

  // 新增效果
  const instance: EffectInstance = {
    type,
    stacks: def.maxStacks > 0 ? Math.min(stacks, def.maxStacks) : stacks,
    polarity: def.polarity,
    restrictedTypes: options?.restrictedTypes,
    source: options?.source,
  };
  entity.effects.push(instance);
  return true;
}

/**
 * 移除实体身上的指定效果
 */
export function removeEffect(entity: EntityStats, type: EffectType): void {
  entity.effects = entity.effects.filter(e => e.type !== type);
}

/**
 * 减少效果层数（降至 0 时自动移除）
 */
export function reduceEffectStacks(entity: EntityStats, type: EffectType, amount: number = 1): void {
  const effect = findEffect(entity, type);
  if (!effect) return;
  effect.stacks -= amount;
  if (effect.stacks <= 0) {
    removeEffect(entity, type);
  }
}

// ═══════════════════════════════════════════════════════════════
//  回合效果结算（按触发时机）
// ═══════════════════════════════════════════════════════════════

/** 回合开始效果结算结果 */
export interface TurnStartResult {
  hpChange: number;
  mpChange: number;
  trueDamage: number;
  isStunned: boolean;
  logs: string[];
  /** 需要为对手施加的效果（施加燃烧用） */
  applyToOpponent: Array<{ type: EffectType; stacks: number }>;
}

/**
 * 处理回合开始时所有效果触发
 * 调用顺序：法力枯竭 → 中毒 → 燃烧 → 流血(-1) → 生命回复 → 施加燃烧 → 眩晕检查
 */
export function processOnTurnStart(entity: EntityStats): TurnStartResult {
  const result: TurnStartResult = {
    hpChange: 0,
    mpChange: 0,
    trueDamage: 0,
    isStunned: false,
    logs: [],
    applyToOpponent: [],
  };

  // 法力枯竭
  if (hasEffect(entity, EffectType.MANA_DRAIN)) {
    result.mpChange = -entity.mp;
    result.logs.push(`[法力枯竭] 法力值被清零。`);
    reduceEffectStacks(entity, EffectType.MANA_DRAIN);
  }

  // 中毒
  const poisonStacks = getEffectStacks(entity, EffectType.POISON);
  if (poisonStacks > 0) {
    if (poisonStacks >= entity.hp) {
      result.trueDamage += poisonStacks;
      result.logs.push(`[中毒] 中毒量(${poisonStacks}) ≥ 当前生命(${entity.hp})，造成 ${poisonStacks} 真实伤害！`);
    }
    reduceEffectStacks(entity, EffectType.POISON);
  }

  // 燃烧
  const burnStacks = getEffectStacks(entity, EffectType.BURN);
  if (burnStacks > 0) {
    result.hpChange -= burnStacks;
    result.logs.push(`[燃烧] 损失 ${burnStacks} 点生命。`);
  }

  // 流血每回合 -1
  if (hasEffect(entity, EffectType.BLEED)) {
    reduceEffectStacks(entity, EffectType.BLEED);
    result.logs.push(`[流血] 层数衰减。`);
  }

  // 生命回复
  const regenStacks = getEffectStacks(entity, EffectType.REGEN);
  if (regenStacks > 0) {
    result.hpChange += regenStacks;
    result.logs.push(`[生命回复] 回复 ${regenStacks} 点生命。`);
  }

  // 施加燃烧 → 为双方施加一层燃烧
  const igniteStacks = getEffectStacks(entity, EffectType.IGNITE_AURA);
  if (igniteStacks > 0) {
    applyEffect(entity, EffectType.BURN, 1);
    result.applyToOpponent.push({ type: EffectType.BURN, stacks: 1 });
    result.logs.push(`[施加燃烧] 为战斗双方各施加 1 层燃烧。`);
  }

  // 眩晕
  if (hasEffect(entity, EffectType.STUN)) {
    result.isStunned = true;
    result.logs.push(`[眩晕] 本回合无法行动！`);
  }

  // 魔力源泉
  const manaSpringStacks = getEffectStacks(entity, EffectType.MANA_SPRING);
  if (manaSpringStacks > 0) {
    result.mpChange += manaSpringStacks;
    result.logs.push(`[魔力源泉] 魔力 +${manaSpringStacks}。`);
  }

  return result;
}

/**
 * 处理回合结束时所有效果触发
 * 调用顺序：束缚(-1) → 护甲(减半) → 蓄力(清除) → 眩晕(清除)
 */
export function processOnTurnEnd(entity: EntityStats): string[] {
  const logs: string[] = [];

  // 束缚
  if (hasEffect(entity, EffectType.BIND)) {
    reduceEffectStacks(entity, EffectType.BIND);
    logs.push(`[束缚] 层数衰减。`);
  }

  // 护甲每回合减半
  const armorEffect = findEffect(entity, EffectType.ARMOR);
  if (armorEffect && armorEffect.stacks > 0) {
    armorEffect.stacks = Math.floor(armorEffect.stacks / 2);
    if (armorEffect.stacks <= 0) {
      removeEffect(entity, EffectType.ARMOR);
    }
    logs.push(`[护甲] 层数减半。`);
  }

  // 蓄力消失
  if (hasEffect(entity, EffectType.CHARGE)) {
    removeEffect(entity, EffectType.CHARGE);
    logs.push(`[蓄力] 效果消失。`);
  }

  // 眩晕消失
  if (hasEffect(entity, EffectType.STUN)) {
    removeEffect(entity, EffectType.STUN);
    logs.push(`[眩晕] 效果消失。`);
  }

  return logs;
}

// ═══════════════════════════════════════════════════════════════
//  卡牌使用限制检查
// ═══════════════════════════════════════════════════════════════

/**
 * 检查指定卡牌是否可使用（考虑束缚、吞食效果）
 */
export function canPlayCard(
  entity: EntityStats,
  card: CardData,
  baseDice: number,
): { allowed: boolean; reason?: string } {
  // 眩晕：完全不能出牌
  if (hasEffect(entity, EffectType.STUN)) {
    return { allowed: false, reason: '眩晕状态，无法行动。' };
  }

  // 束缚：检查卡牌类型限制
  const bindEffect = findEffect(entity, EffectType.BIND);
  if (bindEffect && bindEffect.restrictedTypes?.includes(card.type)) {
    return { allowed: false, reason: `束缚中，无法使用${card.type}类型卡牌。` };
  }

  // 吞食：骰子≤3 时禁用物理/闪避
  if (hasEffect(entity, EffectType.DEVOUR) && baseDice <= 3) {
    if (card.type === '物理' as CardType || card.type === '闪避' as CardType) {
      return { allowed: false, reason: `吞食效果生效（骰子≤3），无法使用${card.type}卡牌。` };
    }
  }

  // 法力不足
  if (card.manaCost > entity.mp) {
    return { allowed: false, reason: `法力不足（需要${card.manaCost}，当前${entity.mp}）。` };
  }

  return { allowed: true };
}
