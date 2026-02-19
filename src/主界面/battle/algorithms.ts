// ═══════════════════════════════════════════════════════════════
//  核心算法 — 点数计算 & 拼点协议 & 伤害结算
// ═══════════════════════════════════════════════════════════════

import {
    type CardData,
    CardType,
    type ClashResult,
    type DamageCalculationContext,
    EffectType,
    type EntityStats,
    type PointCalculationContext,
} from '../types';
import {
    findEffect,
    getEffectStacks,
    hasEffect,
    reduceEffectStacks,
    removeEffect,
} from './effects';

// ═══════════════════════════════════════════════════════════════
//  A. 最终点数计算
// ═══════════════════════════════════════════════════════════════

/**
 * 计算最终点数
 * FinalPoint = (BaseDice * Multiplier + Addition) * BuffMod * RelicMod + BuffAdd + RelicAdd
 */
export function calculateFinalPoint(ctx: PointCalculationContext): number {
  const { baseDice, card, entityEffects, relicModifiers } = ctx;

  // Step 1-2: 卡牌基础计算
  let point = baseDice * card.calculation.multiplier + card.calculation.addition;

  // Step 3: 蓄力加成
  const chargeStacks = entityEffects.find(e => e.type === EffectType.CHARGE)?.stacks ?? 0;
  if (chargeStacks > 0) point += chargeStacks;

  // Step 4-5: 全局乘算修正
  point *= relicModifiers.globalMultiplier;

  // Step 6-7: 全局加算修正
  point += relicModifiers.globalAddition;

  return Math.max(0, Math.floor(point));
}

// ═══════════════════════════════════════════════════════════════
//  B. 拼点对撞协议
// ═══════════════════════════════════════════════════════════════

/**
 * 判断两张卡牌是否进入拼点流程
 * 1. 物理 vs 物理  2. 魔法 vs 魔法  3. 闪避 vs (物理|魔法)  4. 功能牌默认不拼点
 */
export function shouldClash(
  playerCard: CardData,
  enemyCard: CardData,
  forceClashFunction: boolean = false,
): boolean {
  const p = playerCard.type;
  const e = enemyCard.type;

  if (p === CardType.FUNCTION || e === CardType.FUNCTION) return forceClashFunction;
  if (p === e) return true;
  if (p === CardType.DODGE && (e === CardType.PHYSICAL || e === CardType.MAGIC)) return true;
  if (e === CardType.DODGE && (p === CardType.PHYSICAL || p === CardType.MAGIC)) return true;

  return false;
}

/**
 * 执行拼点结算
 * 常规：点大胜。闪避：闪避方点数 < 对方 = 闪避成功
 */
export function resolveClash(
  playerCard: CardData,
  enemyCard: CardData,
  playerPoint: number,
  enemyPoint: number,
): ClashResult {
  const isPlayerDodge = playerCard.type === CardType.DODGE;
  const isEnemyDodge = enemyCard.type === CardType.DODGE;

  // 玩家闪避
  if (isPlayerDodge && !isEnemyDodge) {
    if (playerPoint < enemyPoint) {
      return { outcome: 'dodge_success', playerFinalPoint: playerPoint, enemyFinalPoint: enemyPoint, message: `闪避成功！(${playerPoint} < ${enemyPoint})` };
    }
    return { outcome: 'enemy_win', playerFinalPoint: playerPoint, enemyFinalPoint: enemyPoint, message: `闪避失败！(${playerPoint} ≥ ${enemyPoint})` };
  }
  // 敌人闪避
  if (isEnemyDodge && !isPlayerDodge) {
    if (enemyPoint < playerPoint) {
      return { outcome: 'dodge_success', playerFinalPoint: playerPoint, enemyFinalPoint: enemyPoint, message: `敌方闪避成功！(${enemyPoint} < ${playerPoint})` };
    }
    return { outcome: 'player_win', playerFinalPoint: playerPoint, enemyFinalPoint: enemyPoint, message: `敌方闪避失败！(${enemyPoint} ≥ ${playerPoint})` };
  }
  // 常规
  if (playerPoint > enemyPoint) {
    return { outcome: 'player_win', playerFinalPoint: playerPoint, enemyFinalPoint: enemyPoint, message: `拼点胜利！(${playerPoint} > ${enemyPoint})` };
  } else if (enemyPoint > playerPoint) {
    return { outcome: 'enemy_win', playerFinalPoint: playerPoint, enemyFinalPoint: enemyPoint, message: `拼点失败！(${playerPoint} < ${enemyPoint})` };
  }
  return { outcome: 'draw', playerFinalPoint: playerPoint, enemyFinalPoint: enemyPoint, message: `势均力敌！(${playerPoint})` };
}

// ═══════════════════════════════════════════════════════════════
//  C. 伤害计算
// ═══════════════════════════════════════════════════════════════

/**
 * 原始伤害（未经防御修正）
 * relative: FinalPoint * scale + scaleAddition
 * fixed:    value
 * mixed:    baseValue + FinalPoint * scale + scaleAddition
 */
export function calculateRawDamage(finalPoint: number, card: CardData): number {
  const dl = card.damageLogic;
  switch (dl.mode) {
    case 'relative': return finalPoint * (dl.scale ?? 1) + (dl.scaleAddition ?? 0);
    case 'fixed':    return dl.value ?? 0;
    case 'mixed':    return (dl.baseValue ?? 0) + finalPoint * (dl.scale ?? 1) + (dl.scaleAddition ?? 0);
    default:         return 0;
  }
}

/**
 * 最终伤害（考虑攻防效果）
 * 链路：原始 → 寒冷减 → 易伤增 → 真实伤害跳过防御 → 结界 → 护甲
 */
export function calculateFinalDamage(ctx: DamageCalculationContext): { damage: number; isTrueDamage: boolean; logs: string[] } {
  const logs: string[] = [];
  let damage = calculateRawDamage(ctx.finalPoint, ctx.card);
  logs.push(`原始伤害: ${Math.floor(damage)}`);

  const isTrueDamage = ctx.isTrueDamage ?? false;

  // 寒冷减伤
  const cold = ctx.attackerEffects.find(e => e.type === EffectType.COLD)?.stacks ?? 0;
  if (cold > 0) { damage -= cold; logs.push(`[寒冷] -${cold}`); }

  // 易伤增伤
  const vuln = ctx.defenderEffects.find(e => e.type === EffectType.VULNERABLE)?.stacks ?? 0;
  if (vuln > 0) { damage += vuln; logs.push(`[易伤] +${vuln}`); }

  if (isTrueDamage) {
    logs.push(`真实伤害，无视防御。`);
    return { damage: Math.max(0, Math.floor(damage)), isTrueDamage: true, logs };
  }

  // 结界
  if (ctx.defenderEffects.some(e => e.type === EffectType.BARRIER && e.stacks > 0)) {
    logs.push(`[结界] 伤害被完全抵挡！`);
    return { damage: 0, isTrueDamage: false, logs };
  }

  // 护甲的实际消耗由 applyDamageToEntity 处理，这里只做预览提示
  const armor = ctx.defenderEffects.find(e => e.type === EffectType.ARMOR)?.stacks ?? 0;
  if (armor > 0) { logs.push(`[护甲] 对方有 ${armor} 层护甲`); }

  return { damage: Math.max(0, Math.floor(damage)), isTrueDamage: false, logs };
}

/**
 * 应用伤害到实体（含效果层数消耗），返回实际伤害
 */
export function applyDamageToEntity(target: EntityStats, damage: number, isTrueDamage: boolean): { actualDamage: number; logs: string[] } {
  const logs: string[] = [];
  if (!isTrueDamage) {
    if (hasEffect(target, EffectType.BARRIER) && damage > 0) {
      reduceEffectStacks(target, EffectType.BARRIER);
      logs.push(`[结界] 层数-1。`);
      return { actualDamage: 0, logs };
    }
    const ae = findEffect(target, EffectType.ARMOR);
    if (ae && ae.stacks > 0 && damage > 0) {
      const c = Math.min(ae.stacks, damage);
      ae.stacks -= c; damage -= c;
      if (ae.stacks <= 0) removeEffect(target, EffectType.ARMOR);
      logs.push(`[护甲] 消耗${c}，剩余伤害${damage}。`);
    }
  }
  const actual = Math.min(damage, target.hp);
  target.hp -= actual;
  logs.push(`受到${actual}点伤害(HP: ${target.hp}/${target.maxHp})。`);
  return { actualDamage: actual, logs };
}

// ═══════════════════════════════════════════════════════════════
//  D. 拼点附带效果 & 攻击后效果
// ═══════════════════════════════════════════════════════════════

/** 拼点时：流血(真实伤害), 燃烧(胜方清除) */
export function processClashEffects(winner: EntityStats, loser: EntityStats): string[] {
  const logs: string[] = [];
  const bleed = getEffectStacks(loser, EffectType.BLEED);
  if (bleed > 0) { loser.hp -= bleed; logs.push(`[流血] 败方受${bleed}真实伤害。`); }
  if (hasEffect(winner, EffectType.BURN)) { removeEffect(winner, EffectType.BURN); logs.push(`[燃烧] 胜方燃烧消失。`); }
  return logs;
}

/** 攻击后：蓄力清除, 寒冷减半 */
export function processPostAttackEffects(attacker: EntityStats): string[] {
  const logs: string[] = [];
  if (hasEffect(attacker, EffectType.CHARGE)) { removeEffect(attacker, EffectType.CHARGE); logs.push(`[蓄力] 已消费。`); }
  const ce = findEffect(attacker, EffectType.COLD);
  if (ce && ce.stacks > 0) {
    ce.stacks = Math.floor(ce.stacks / 2);
    if (ce.stacks <= 0) removeEffect(attacker, EffectType.COLD);
    logs.push(`[寒冷] 层数减半。`);
  }
  return logs;
}

// ═══════════════════════════════════════════════════════════════
//  E. 骰子工具
// ═══════════════════════════════════════════════════════════════

export function rollDice(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
