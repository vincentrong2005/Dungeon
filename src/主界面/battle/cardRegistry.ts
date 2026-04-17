// ═══════════════════════════════════════════════════════════════
//  卡牌库 — 所有卡牌的中央注册表
//  UI 从 MVU 变量 _技能（string[]）中读取卡名，
//  再用 getCardByName() 查找对应 CardData。
// ═══════════════════════════════════════════════════════════════

import { CardType, EffectType, type CardData } from '../types';

/**
 * =====================================================================
 * 卡牌编写条件（请在新增/修改卡牌时严格对照）
 * =====================================================================
 * 1) 费用规则
 *    - 仅 `CardType.MAGIC` 使用 `manaCost`。
 *    - 其他类型（PHYSICAL / FUNCTION / DODGE）固定 `manaCost: 0`。
 *
 * 2) 点数与伤害是两条链路，不要混写
 *    - 点数：`calculation = { multiplier, addition }`
 *      公式：FinalPoint = floor(BaseDice * multiplier + addition + 其他点数修正)
 *    - 伤害：`damageLogic`
 *      relative: damage = floor(FinalPoint * scale + scaleAddition)
 *      fixed:    damage = floor(value)
 *      mixed:    damage = floor(baseValue + FinalPoint * scale + scaleAddition)
 *
 * 3) “+N”语义约定
 *    - 若描述是“点数+N”，应写在 `calculation.addition = N`。
 *    - 若描述是“伤害+N”，应写在 `damageLogic.scaleAddition = N`
 *      （或使用 mixed/fixed，按设计意图表达）。
 *
 * 4) 数值取整规则
 *    - 所有战斗数值按向下取整（floor）结算，避免小数。
 *
 * 5) 攻击段数规则
 *    - 攻击牌应填写 `hitCount`（默认建议为 1）。
 *    - 多段伤害统一通过 `hitCount` 结算，不要在 UI 里硬编码重复攻击。
 *
 * 6) 描述同步规则
 *    - description 必须与实际字段一致（尤其是点数+N 与 伤害+N）。
 * =====================================================================
 */

// ── 基础卡牌定义 ────────────────────────────────────────────────

/** 普通物理攻击 */
const 普通物理攻击: CardData = {
  id: 'basic_physical',
  name: '普通物理攻击',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数的伤害',
};

/** 普通物理攻击+1 */
const 普通物理攻击加1: CardData = {
  id: 'basic_physical_plus_1',
  name: '普通物理攻击+1',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+1，造成1倍最终点数的伤害',
};

/** 普通物理攻击+2 */
const 普通物理攻击加2: CardData = {
  id: 'basic_physical_plus_2',
  name: '普通物理攻击+2',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+2，造成1倍最终点数的伤害',
};

/** 普通物理攻击+4 */
const 普通物理攻击加4: CardData = {
  id: 'basic_physical_plus_4',
  name: '普通物理攻击+4',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 4 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+4，造成1倍最终点数的伤害',
};

/** 双刃剑：点数+1，0.5倍伤害，2连击 */
const 双刃剑: CardData = {
  id: 'modao_double_blade',
  name: '双刃剑',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 2,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+1，造成0.5倍点数伤害，2连击',
};

/** 普通魔法攻击 */
const 普通魔法攻击: CardData = {
  id: 'basic_magic',
  name: '普通魔法攻击',
  type: CardType.MAGIC,
  category: '基础',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗2MP，造成1.5倍点数的伤害',
};

/** 聚焦魔法攻击 */
const 聚焦魔法攻击: CardData = {
  id: 'focus_magic_attack',
  name: '聚焦魔法攻击',
  type: CardType.MAGIC,
  category: '基础',
  rarity: '普通',
  manaCost: 3,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗3MP，骰子点数*1.5，造成1倍最终点数的伤害',
};

/** 普通护盾 */
const 普通护盾: CardData = {
  id: 'basic_shield',
  name: '普通护盾',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.ARMOR,
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0, // 护甲层数 = FinalPoint * 1.0
    },
  ],
  description: '点数+1，获得1倍点数的护甲',
};

/** 压势：根据自身骰子点数减少对方骰子点数 */
const 压势: CardData = {
  id: 'basic_point_suppress',
  name: '压势',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '根据自身骰子点数减少对方骰子点数',
};

/** 普通闪避 */
const 普通闪避: CardData = {
  id: 'basic_dodge',
  name: '普通闪避',
  type: CardType.DODGE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '闪避',
};

/** 休眠：增加0.6倍点数的护甲与生命值 */
const 休眠: CardData = {
  id: 'basic_rest',
  name: '休眠',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 0.6 },
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 0.6 },
  ],
  description: '增加0.6倍点数的护甲与0.6倍点数的生命值',
};

/** 侧身闪避：点数-1，闪避 */
const 侧身闪避: CardData = {
  id: 'basic_side_step_dodge',
  name: '侧身闪避',
  type: CardType.DODGE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数-1，闪避',
};

/** 存在消除：点数*0，闪避 */
const 存在消除: CardData = {
  id: 'basic_existence_erasure',
  name: '存在消除',
  type: CardType.DODGE,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*0，闪避',
};

/** 吐纳法：闪避，若闪避成功则回复1倍点数的生命值 */
const 吐纳法: CardData = {
  id: 'basic_breathing_technique',
  name: '吐纳法',
  type: CardType.DODGE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'heal',
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，若闪避成功则回复1倍点数的生命值',
};

/** 虚实步法：重掷，闪避 */
const 虚实步法: CardData = {
  id: 'basic_void_step',
  name: '虚实步法',
  type: CardType.DODGE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'self', draw: false },
  cardEffects: [],
  description: '重掷，闪避',
};

// ── 魔导体系卡牌 ────────────────────────────────────────────────

/** 镜面幻像：点数+2，闪避，若闪避成功为自己施加1层结界 */
const 镜面幻像: CardData = {
  id: 'basic_mirror_phantom',
  name: '镜面幻像',
  type: CardType.DODGE,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.BARRIER,
      target: 'self',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+2，闪避，若闪避成功为自己施加1层结界',
};

/** 魔力偏移：闪避，若闪避成功则回复1倍点数的魔力 */
const 魔力偏移: CardData = {
  id: 'basic_mana_shift',
  name: '魔力偏移',
  type: CardType.DODGE,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'restore_mana',
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，若闪避成功则回复1倍点数的魔力',
};

/** 零域闪步：闪避，闪避成功后下回合的魔法牌消耗为0（结算逻辑在 CombatView） */
const 零域闪步: CardData = {
  id: 'modao_zero_domain_dodge',
  name: '零域闪步',
  type: CardType.DODGE,
  category: '魔导',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '闪避，闪避成功后下回合的魔法牌消耗为0',
};

/** 魔剑：造成1倍点数伤害并回复等量实际伤害魔力（结算逻辑在 CombatView） */
const 魔剑: CardData = {
  id: 'modao_magic_sword',
  name: '魔剑',
  type: CardType.PHYSICAL,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害，并回复等同本次实际伤害的魔力',
};

/** 导路采样：点数，回复1.5倍点数魔力 */
const 导路采样: CardData = {
  id: 'modao_route_sampling',
  name: '导路采样',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [{ kind: 'restore_mana', target: 'self', valueMode: 'point_scale', scale: 1.5 }],
  description: '回复1.5倍点数魔力',
};

/** 织式备份：1MP，1倍伤害；在手牌中时使手牌内魔法牌费用-1（结算逻辑在 CombatView） */
const 织式备份: CardData = {
  id: 'modao_weave_backup',
  name: '织式备份',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 1,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗1MP，造成1倍点数伤害；当此卡在手牌中时，手牌中所有魔法牌魔力消耗-1',
};

/** 魔压提纯：自身MP翻倍（最多+20）（结算逻辑在 CombatView） */
const 魔压提纯: CardData = {
  id: 'modao_mana_purify',
  name: '魔压提纯',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '将自身当前魔力翻倍（最多额外获得20点）',
};

/** 魔力飓风：造成(12-点数)伤害（结算逻辑在 CombatView） */
const 魔力飓风: CardData = {
  id: 'modao_mana_hurricane',
  name: '魔力飓风',
  type: CardType.MAGIC,
  category: '基础',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成(12-点数)伤害',
};

/** 回声回灌：造成1倍伤害，目标每有1层群集额外造成1次伤害（结算逻辑在 CombatView） */
const 回声回灌: CardData = {
  id: 'modao_echo_feedback',
  name: '回声回灌',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 3,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害；敌方每有1层群集，额外造成1次伤害',
};

/** 逆相咏唱：0.7倍伤害并施加1层禁言 */
const 逆相咏唱: CardData = {
  id: 'modao_inverse_chant',
  name: '逆相咏唱',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '稀有',
  manaCost: 1,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.7, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成0.7倍点数伤害并施加1层禁言',
};

/** 奥术裂枪：点数*1.2，1倍伤害；MP≥8时额外消耗4MP追加一次2倍伤害（结算逻辑在 CombatView） */
const 奥术裂枪: CardData = {
  id: 'modao_arcane_lance',
  name: '奥术裂枪',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.2, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.2，造成1倍点数伤害；若当前MP≥8，再消耗4MP追加一次2倍伤害',
};

/** 魔导序曲：8MP，点数*1.5，2倍伤害；每次抽到该牌时其费用-1（结算逻辑在 CombatView） */
const 魔导序曲: CardData = {
  id: 'modao_overture',
  name: '魔导序曲',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 8,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 2.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗8MP，点数*1.5，造成2倍点数伤害；每次抽到该牌时该牌费用-1',
};

/** 法环坍缩：1.5倍伤害；额外消耗自身至多20MP，每消耗4MP追加1次伤害（结算逻辑在 CombatView） */
const 法环坍缩: CardData = {
  id: 'modao_ring_collapse',
  name: '法环坍缩',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1.5倍点数伤害；额外消耗自身至多20MP，每消耗4MP追加1次伤害',
};

/** 棱镜贯流：0.9倍伤害；按当前MP提高伤害倍率（结算逻辑在 CombatView） */
const 棱镜贯流: CardData = {
  id: 'modao_prism_flow',
  name: '棱镜贯流',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.9, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成0.9倍点数伤害；每有2点当前MP，伤害额外+0.3倍（上限+2.1倍）',
};

/** 导能屏障：消耗魔力转护甲，连击（结算逻辑在 CombatView） */
const 导能屏障: CardData = {
  id: 'modao_energy_barrier',
  name: '导能屏障',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗自身至多5MP；每消耗1MP：自身护甲+2，连击',
};

/** 魔力轰炸：8MP，点数+15，1倍伤害*/
const 魔力轰炸: CardData = {
  id: 'modao_mana_bombard',
  name: '魔力轰炸',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '稀有',
  manaCost: 8,
  calculation: { multiplier: 1.0, addition: 15 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗8MP，点数+15，造成1倍点数伤害',
};

/** 涌流：回复魔力并叠加寒冷，连击 */
const 涌流: CardData = {
  id: 'modao_flow',
  name: '涌流',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'restore_mana', target: 'self', valueMode: 'fixed', fixedValue: 2 },
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '自身增加2点魔力与1层寒冷，连击',
};

/** 透支魔力：大量回魔并叠加法力枯竭，连击 */
const 透支魔力: CardData = {
  id: 'modao_overdraw',
  name: '透支魔力',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'restore_mana', target: 'self', valueMode: 'fixed', fixedValue: 10 },
    { kind: 'apply_buff', effectType: EffectType.MANA_DRAIN, target: 'self', valueMode: 'fixed', fixedValue: 3 },
  ],
  description: '自身增加10点魔力与3层法力枯竭，连击',
};

/** 魔甲：获得等同当前魔力值的护甲（结算逻辑在 CombatView） */
const 魔甲: CardData = {
  id: 'modao_mana_armor',
  name: '魔甲',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '自身增加等同当前魔力点数的护甲',
};

/** 魔力增强：消耗等同点数的魔力并转化为增伤（结算逻辑在 CombatView） */
const 魔力增强: CardData = {
  id: 'modao_wager',
  name: '魔力增强',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗1倍点数的魔力，获得1倍点数的增伤。若魔力不足则增强失败。',
};

// ── 燃烧体系卡牌 ────────────────────────────────────────────────

/** 火花烙印：敌方燃烧+1，我方点数-3，连击 */
const 火花烙印: CardData = {
  id: 'burn_spark_mark',
  name: '火花烙印',
  type: CardType.FUNCTION,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -3 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '敌方燃烧+1，我方点数-3，连击',
};

/** 焦油泼洒：敌方燃烧+1，自身燃烧+2，连击 */
const 焦油泼洒: CardData = {
  id: 'burn_tar_splash',
  name: '焦油泼洒',
  type: CardType.FUNCTION,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '敌方燃烧+1，自身燃烧+2，连击',
};

/** 焚风术：造成0.5倍最终点数+目标燃烧层数的伤害 */
const 焚风术: CardData = {
  id: 'burn_scorch_wind',
  name: '焚风术',
  type: CardType.MAGIC,
  category: '燃烧',
  rarity: '普通',
  manaCost: 3,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '对敌方造成0.5倍最终点数+目标当前燃烧层数的伤害',
};

/** 烧伤：点数-2，造成1倍最终点数伤害，易伤+1 */
const 烧伤: CardData = {
  id: 'burn_scorch',
  name: '烧伤',
  type: CardType.MAGIC,
  category: '燃烧',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: -2 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数-2，造成1倍最终点数伤害并施加易伤+1',
};

/** 烈焰打击：1倍最终点数伤害并附加燃烧+1 */
const 烈焰打击: CardData = {
  id: 'burn_flame_strike',
  name: '烈焰打击',
  type: CardType.PHYSICAL,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成1倍最终点数伤害并附加燃烧+1',
};

/** 灼魂飞弹：1倍最终点数伤害并附加燃烧+2 */
const 灼魂飞弹: CardData = {
  id: 'burn_soul_bolt',
  name: '灼魂飞弹',
  type: CardType.MAGIC,
  category: '燃烧',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '造成1倍最终点数伤害并附加燃烧+2',
};

/** 焚身突刺：点数*2，造成0.6倍最终点数伤害并附加燃烧+2 */
const 焚身突刺: CardData = {
  id: 'burn_body_lunge',
  name: '焚身突刺',
  type: CardType.PHYSICAL,
  category: '燃烧',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.6, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '点数*2，造成0.6倍最终点数伤害并附加燃烧+2',
};

/** 爆燃术：点数*0.8，造成目标燃烧层数伤害并施加1倍最终点数燃烧 */
const 爆燃术: CardData = {
  id: 'burn_detonation',
  name: '爆燃术',
  type: CardType.MAGIC,
  category: '燃烧',
  rarity: '普通',
  manaCost: 6,
  calculation: { multiplier: 0.8, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数*0.8，造成目标燃烧层数伤害，并施加1倍最终点数的燃烧',
};

/** 炎狱判决：敌方每有2层燃烧点数+1，造成1倍最终点数伤害 */
const 炎狱判决: CardData = {
  id: 'burn_inferno_judgement',
  name: '炎狱判决',
  type: CardType.MAGIC,
  category: '燃烧',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '敌方每有2层燃烧点数额外+1，随后造成1倍最终点数伤害',
};

/** 炼狱波及：自身燃烧+1，自身结界+1，连击*/
const 炼狱波及: CardData = {
  id: 'burn_hell_waves',
  name: '炼狱波及',
  type: CardType.FUNCTION,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.BARRIER, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '自身燃烧+1，自身结界+1，连击',
};

/** 临界沸腾：按2:1消耗目标寒冷/燃烧并造成真实伤害（结算逻辑在 CombatView 中） */
const 临界沸腾: CardData = {
  id: 'burn_critical_boil',
  name: '临界沸腾',
  type: CardType.MAGIC,
  category: '燃烧',
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '以2:1比例消耗目标寒冷/燃烧，并造成4倍所消耗燃烧层数的真实伤害',
};

/** 炭化转化：清除自身燃烧并按层数回魔（结算逻辑在 CombatView 中） */
const 炭化转化: CardData = {
  id: 'burn_char_convert',
  name: '炭化转化',
  type: CardType.FUNCTION,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '清除自身燃烧并按层数回复魔力',
};

/** 大日焚：施加燃烧并使目标燃烧翻倍（翻倍逻辑在 CombatView） */
const 大日焚: CardData = {
  id: 'burn_kindle',
  name: '大日焚',
  type: CardType.MAGIC,
  category: '燃烧',
  rarity: '稀有',
  manaCost: 8,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '消耗8MP，附加0.5倍点数燃烧并使对手燃烧层数翻倍',
};

/** 火遁：闪避成功后施加0.7倍点数燃烧 */
const 火遁: CardData = {
  id: 'burn_fire_dodge',
  name: '火遁',
  type: CardType.DODGE,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.BURN,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 0.7,
    },
  ],
  description: '闪避，若闪避成功则施加0.7倍点数的燃烧',
};

// ── 严寒体系卡牌 ────────────────────────────────────────────────

/** 霜痕斩：0.6倍伤害，施加1倍点数寒冷 */
const 霜痕斩: CardData = {
  id: 'yanhan_frostmark_slash',
  name: '霜痕斩',
  type: CardType.PHYSICAL,
  category: '严寒',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.6, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '造成0.6倍点数伤害，并施加1倍点数的寒冷',
};

/** 寒域校准：自身护甲并施加固定寒冷 */
const 寒域校准: CardData = {
  id: 'yanhan_coldfield_calibration',
  name: '寒域校准',
  type: CardType.FUNCTION,
  category: '严寒',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1 },
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '为自身提供1倍点数护甲，并为敌方施加2层寒冷',
};

/** 折光回避：闪避成功时施加寒冷 */
const 折光回避: CardData = {
  id: 'yanhan_refraction_evade',
  name: '折光回避',
  type: CardType.DODGE,
  category: '严寒',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.COLD,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避。若闪避成功，则施加1倍点数的寒冷',
};

/** 回授冻轮：造成伤害并施加寒冷，按敌方寒冷层数获得护甲（护甲逻辑在 CombatView） */
const 回授冻轮: CardData = {
  id: 'yanhan_feedback_freeze_wheel',
  name: '回授冻轮',
  type: CardType.MAGIC,
  category: '严寒',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '造成1倍点数伤害并施加1倍点数寒冷，获得对方寒冷层数的护甲',
};

/** 冷室复写：将敌方当前寒冷翻倍并造成1倍点数伤害（翻倍逻辑在 CombatView） */
const 冷室复写: CardData = {
  id: 'yanhan_cold_chamber_duplicate',
  name: '冷室复写',
  type: CardType.MAGIC,
  category: '严寒',
  rarity: '普通',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '将敌方当前寒冷翻倍，并造成1倍点数伤害',
};

/** 温差效应：0.5倍伤害并施加1层温差 */
const 温差效应: CardData = {
  id: 'yanhan_temperature_effect',
  name: '温差效应',
  type: CardType.MAGIC,
  category: '严寒',
  rarity: '稀有',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.TEMPERATURE_DIFF, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成0.5倍点数伤害，并施加1层温差',
};

/** 压差循环：消耗护甲并转化为寒冷与回蓝，连击（结算逻辑在 CombatView） */
const 压差循环: CardData = {
  id: 'yanhan_pressure_cycle',
  name: '压差循环',
  type: CardType.FUNCTION,
  category: '严寒',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗自身最多10点护甲，每消耗2点：敌方寒冷+2且自身回1MP，连击',
};

/** 冷源整流：消耗寒冷并回复生命（结算逻辑在 CombatView） */
const 冷源整流: CardData = {
  id: 'yanhan_cold_source_rectifier',
  name: '冷源整流',
  type: CardType.FUNCTION,
  category: '严寒',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗敌方至多10层寒冷，自身回复等量生命',
};

/** 零界裁定：阈值控制与施加寒冷（阈值逻辑在 CombatView） */
const 零界裁定: CardData = {
  id: 'yanhan_zero_boundary_verdict',
  name: '零界裁定',
  type: CardType.MAGIC,
  category: '严寒',
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '若敌方寒冷≥10则消耗10层寒冷并施加眩晕1回合，同时独立施加1倍点数寒冷',
};

/** 霜爆：施加寒冷并按目标寒冷层数造成伤害（伤害逻辑在 CombatView） */
const 霜爆: CardData = {
  id: 'yanhan_frost_burst',
  name: '霜爆',
  type: CardType.MAGIC,
  category: '严寒',
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '增加1倍点数的寒冷，并造成对方当前寒冷层数的伤害',
};

/** 复咒：下一张魔法牌结算两次，连击（结算逻辑在 CombatView） */
const 复咒: CardData = {
  id: 'yanhan_spell_echo',
  name: '复咒',
  type: CardType.FUNCTION,
  category: '严寒',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [],
  description: '下一张魔法牌结算两次，连击',
};

// ── 血池体系卡牌 ────────────────────────────────────────────────

/** 刺络放血：造成1倍点数伤害，敌方流血+1 */
const 刺络放血: CardData = {
  id: 'bloodpool_venesection',
  name: '刺络放血',
  type: CardType.PHYSICAL,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成1倍点数伤害，敌方流血+1',
};

/** 赤潮压制：造成1倍点数伤害，敌方流血+2 */
const 赤潮压制: CardData = {
  id: 'bloodpool_crimson_suppress',
  name: '赤潮压制',
  type: CardType.MAGIC,
  category: '血池',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '消耗2MP，造成1倍点数伤害，敌方流血+2',
};

/** 疼痛反馈：造成1倍点数伤害；本场战斗自身每受到1次伤害，伤害+1（加伤结算在 CombatView） */
const 疼痛反馈: CardData = {
  id: 'bloodpool_pain_feedback',
  name: '疼痛反馈',
  type: CardType.PHYSICAL,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害；当前战斗自己每收到一次伤害，伤害+1',
};

/** 放血：自伤2，回复2点魔力，连击 */
const 放血: CardData = {
  id: 'bloodpool_bloodletting',
  name: '放血',
  type: CardType.FUNCTION,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [{ kind: 'restore_mana', target: 'self', valueMode: 'fixed', fixedValue: 2 }],
  selfDamage: 2,
  description: '自伤2，回复2点魔力，连击',
};

/** 噬血劈斩：造成1倍点数伤害，并回复0.5倍造成伤害量的生命 */
const 噬血劈斩: CardData = {
  id: 'bloodpool_siphon_slash',
  name: '噬血劈斩',
  type: CardType.PHYSICAL,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害，并回复0.5倍造成伤害量的生命',
};

/** 血池扩容：造成1倍点数伤害，并增加等同伤害量的临时生命上限 */
const 血池扩容: CardData = {
  id: 'bloodpool_vital_reservoir',
  name: '血池扩容',
  type: CardType.MAGIC,
  category: '血池',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗2MP，造成1倍点数伤害，并增加等同造成伤害量的临时生命上限',
};

/** 活性血池：回复0.6倍点数生命，并增加0.6倍点数的临时生命上限 */
const 活性血池: CardData = {
  id: 'bloodpool_active_reservoir',
  name: '活性血池',
  type: CardType.FUNCTION,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 0.6 },
    { kind: 'apply_buff', effectType: EffectType.TEMP_MAX_HP, target: 'self', valueMode: 'point_scale', scale: 0.6 },
  ],
  description: '回复0.6倍点数的生命和0.6倍点数的临时生命上限',
};

/** 裂伤：点数x1.5，造成1倍点数伤害，自伤3 */
const 裂伤: CardData = {
  id: 'bloodpool_laceration',
  name: '裂伤',
  type: CardType.PHYSICAL,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  selfDamage: 3,
  description: '点数x1.5，造成1倍点数伤害，自伤3',
};

/** 脉搏拳：生命为双数时点数-4，单数时点数+4 */
const 脉搏拳: CardData = {
  id: 'bloodpool_pulse_fist',
  name: '脉搏拳',
  type: CardType.PHYSICAL,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '生命为双数时点数-4，单数时点数+4，造成1倍最终点数伤害',
};

/** 生命汲取：低血量时点数+2，造成真实伤害并回复等量生命 */
const 生命汲取: CardData = {
  id: 'bloodpool_life_drain',
  name: '生命汲取',
  type: CardType.MAGIC,
  category: '血池',
  rarity: '普通',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗6MP，自身血量低于50%时点数+2，造成1倍点数真实伤害并恢复等量生命值',
};

/** 驭血术：先给自身施加4层流血，再按流血层数提升点数 */
const 驭血术: CardData = {
  id: 'bloodpool_blood_control',
  name: '驭血术',
  type: CardType.MAGIC,
  category: '血池',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'self', valueMode: 'fixed', fixedValue: 4 },
  ],
  description: '消耗2MP，为自身施加4层流血。每拥有1层流血点数+1，造成1倍最终点数伤害',
};

/** 回升：恢复生命、获得流血，连击并过牌 */
const 回升: CardData = {
  id: 'bloodpool_recover',
  name: '回升',
  type: CardType.FUNCTION,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: true },
  cardEffects: [
    { kind: 'heal', target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '恢复1点生命，获得1层流血，连击，过牌',
};

/** 血之刃：自身流血+2，按已损生命额外加伤 */
const 血之刃: CardData = {
  id: 'bloodpool_blood_blade',
  name: '血之刃',
  type: CardType.PHYSICAL,
  category: '血池',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '为自身施加2层流血，造成1倍点数伤害，自身每损失1点生命值伤害+1',
};

/** 逆刃：获得坚固，并在本回合受击时施加流血 */
const 逆刃: CardData = {
  id: 'bloodpool_reverse_edge',
  name: '逆刃',
  type: CardType.FUNCTION,
  category: '血池',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.STURDY, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '自身获得1倍点数的坚固，本回合被击中时施加对方4层流血',
};

/** 血筑：增加临时生命上限并按已损失生命获得护甲（护甲逻辑在 CombatView） */
const 血筑: CardData = {
  id: 'bloodpool_life_wall',
  name: '血筑',
  type: CardType.FUNCTION,
  category: '血池',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.TEMP_MAX_HP, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '增加1倍点数的临时生命上限，并增加当前已损失血量点护甲',
};

/** 血债重击：自伤3并造成1倍点数伤害；每损失3点生命，点数+1；固定施加3层流血 */
const 血债重击: CardData = {
  id: 'bloodpool_blood_debt_strike',
  name: '血债重击',
  type: CardType.PHYSICAL,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  selfDamage: 3,
  description: '自伤3并造成1倍点数伤害；每损失3点生命，点数+1，固定施加3层流血',
};

/** 赤痕爆裂：点数*2，造成2倍伤害；触发对方1次流血并赋予0.5倍点数流血，自身流血+2 */
const 赤痕爆裂: CardData = {
  id: 'bloodpool_scar_burst',
  name: '赤痕爆裂',
  type: CardType.MAGIC,
  category: '血池',
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 2, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '消耗6MP，点数*2，造成2倍伤害，触发对方1次流血并赋予0.5倍点数流血，自身流血+2',
};

/** 血位倒转：互换双方当前生命百分比 */
const 血位倒转: CardData = {
  id: 'bloodpool_ratio_inversion',
  name: '血位倒转',
  type: CardType.MAGIC,
  category: '血池',
  rarity: '稀有',
  manaCost: 9,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗9MP，互换双方当前生命值百分比',
};

/** 血脉迁葬：转移自身流血并连续触发对方流血3次 */
const 血脉迁葬: CardData = {
  id: 'bloodpool_bleed_transfusion',
  name: '血脉迁葬',
  type: CardType.MAGIC,
  category: '血池',
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗6MP，将自身流血全部转移给对方，并连续触发对方流血3次',
};

/** 血影回身：点数+1，闪避成功时回复0.4倍点数生命并施加1层流血 */
const 血影回身: CardData = {
  id: 'bloodpool_blood_shadow_dodge',
  name: '血影回身',
  type: CardType.DODGE,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'heal',
      target: 'self',
      valueMode: 'point_scale',
      scale: 0.4,
    },
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.BLEED,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+1，闪避。若闪避成功，回复0.4倍点数生命并施加1层流血',
};

/** 血幕回避：闪避成功后给对方施加3层流血 */
const 血幕回避: CardData = {
  id: 'bloodpool_blood_curtain_dodge',
  name: '血幕回避',
  type: CardType.DODGE,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.BLEED,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 3,
    },
  ],
  description: '闪避。若闪避成功，给对方施加3层流血',
};

/** 血契护壁：自伤3并转化为高额护甲 */
const 血契护壁: CardData = {
  id: 'bloodpool_blood_pact_bulwark',
  name: '血契护壁',
  type: CardType.FUNCTION,
  category: '血池',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.5 },
  ],
  selfDamage: 3,
  description: '自伤3点生命，获得1.5倍点数护甲，连击',
};

// ── 敌人卡牌定义 ────────────────────────────────────────────────

/** 滑腻触手：点数+2，造成1倍最终点数伤害并附加1层束缚 */
const 滑腻触手: CardData = {
  id: 'enemy_mimic_slimy_tentacle',
  name: '滑腻触手',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+2，造成1倍最终点数伤害并附加1层束缚',
};

/** 灵巧长舌：点数*1.3，造成1.5倍最终点数伤害 */
const 灵巧长舌: CardData = {
  id: 'enemy_mimic_agile_tongue',
  name: '灵巧长舌',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.3, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.3，造成1.5倍最终点数的伤害',
};

/** 血盆大口：造成1倍最终点数伤害，附加被吞食+1，双方易伤+2 */
const 血盆大口: CardData = {
  id: 'enemy_mimic_maw',
  name: '血盆大口',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.DEVOUR, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '造成1倍最终点数的伤害与1层被吞食，对双方附加2层易伤',
};

/** 挤压：点数*3，造成0.4倍最终点数伤害 */
const 挤压: CardData = {
  id: 'enemy_mimic_crush',
  name: '挤压',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 3.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.4, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*3，造成0.4倍最终点数伤害',
};

/** 消化：点数+2，施加0.5倍点数中毒 */
const 消化: CardData = {
  id: 'enemy_mimic_digest',
  name: '消化',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数+2，施加0.5倍点数中毒',
};

/** 催情粉：造成0.5倍点数伤害，并施加易伤+1 */
const 催情鳞粉: CardData = {
  id: 'enemy_moth_aphro_powder',
  name: '催情粉',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成0.5倍最终点数伤害，并施加易伤+1',
};

/** 敏感化标记：造成0.5倍点数伤害，并施加1倍点数寒冷 */
const 敏感化标记: CardData = {
  id: 'enemy_moth_sensitive_mark',
  name: '敏感化标记',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '造成0.5倍最终点数伤害，并施加1倍最终点数的寒冷',
};

/** 荧光信息素：获得1倍点数蓄力 */
const 荧光信息素: CardData = {
  id: 'enemy_moth_pheromone',
  name: '荧光信息素',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CHARGE, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '自身增加1倍最终点数的蓄力',
};

/** 群体效应：造成1倍点数伤害；群集每层额外造成一次同等伤害（结算逻辑在 CombatView） */
const 群体效应: CardData = {
  id: 'enemy_moth_swarm_burst',
  name: '群体效应',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗6MP，造成1倍最终点数伤害；自身每有1层群集额外造成一次同等伤害',
};

/** 敏感点侦察：为自己施加0.5倍点数护甲，为敌人施加1层易伤 */
const 蜜蜂敏感点侦察: CardData = {
  id: 'enemy_blissbee_sensitive_scout',
  name: '敏感点侦察',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 0.5 },
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '为自己施加0.5倍点数护甲，为敌人施加1层易伤',
};

/** 催情尾针：造成0.5倍点数伤害；若敌人有易伤则额外施加2层中毒（结算逻辑在 CombatView） */
const 蜜蜂催情尾针: CardData = {
  id: 'enemy_blissbee_aphro_stinger',
  name: '催情尾针',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成0.5倍点数伤害，若敌人有易伤，则额外施加2层中毒',
};

/** 精准采集：点数*1.5，造成0.5倍点数伤害；若敌人有中毒则额外施加0.5倍点数电击（结算逻辑在 CombatView） */
const 蜜蜂精准采集: CardData = {
  id: 'enemy_blissbee_precise_harvest',
  name: '精准采集',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.5，造成0.5倍点数伤害，若敌人有中毒，则额外造成0.5倍点数的电击',
};

/** 高压喷射：无直接效果，但附带负面效果“[信息素]” */
const 高压喷射: CardData = {
  id: 'enemy_pollen_high_pressure_spray',
  name: '高压喷射',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '带有负面效果“[信息素]”',
  negativeEffect: '[信息素]',
};

/** 渗透：功能，为对方增加1倍点数的侵蚀 */
const 渗透: CardData = {
  id: 'enemy_pollen_infiltration',
  name: '渗透',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '为对方增加1倍点数的“侵蚀”',
};

/** 敏感化：施加0.5倍点数的燃烧与易伤，连击 */
const 敏感化: CardData = {
  id: 'enemy_peeping_eye_sensitization',
  name: '敏感化',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '施加0.5倍点数的燃烧与易伤，连击',
};

/** 扫描：消耗2MP，点数+3，造成1倍点数伤害并施加1倍点数易伤 */
const 扫描: CardData = {
  id: 'enemy_peeping_eye_scan',
  name: '扫描',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 3 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+3，造成1倍点数伤害，并施加1倍点数易伤',
};

/** 羞耻灼烧：消耗3MP，点数*1.5，造成0.5倍点数伤害并施加1倍点数燃烧 */
const 羞耻灼烧: CardData = {
  id: 'enemy_peeping_eye_shame_burn',
  name: '羞耻灼烧',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 3,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数*1.5，造成0.5倍点数伤害，并施加1倍点数燃烧',
};

/** 升空躲避：点数-2，闪避 */
const 升空躲避: CardData = {
  id: 'enemy_peeping_eye_ascend_dodge',
  name: '升空躲避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -2 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数-2，闪避',
};

/** 记忆投影：消耗3MP，点数+3，施加1倍点数侵蚀 */
const 记忆投影: CardData = {
  id: 'enemy_shame_shadow_memory_projection',
  name: '记忆投影',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 3,
  calculation: { multiplier: 1.0, addition: 3 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+3，施加1倍点数侵蚀',
};

/** 附身提线：点数+2，造成0.8倍点数伤害并施加1层束缚 */
const 附身提线: CardData = {
  id: 'enemy_shame_shadow_possession_strings',
  name: '附身提线',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 0.8, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+2，造成0.8倍点数伤害，施加1层束缚',
};

/** 羞耻进食：回复1倍点数生命与魔力 */
const 羞耻进食: CardData = {
  id: 'enemy_shame_shadow_shame_feast',
  name: '羞耻进食',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'restore_mana', target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '回复1倍点数生命与魔力',
};

/** 黑镜规避：闪避；若闪避成功或对方跳过回合，对方施加1.5倍点数侵蚀 */
const 黑镜规避: CardData = {
  id: 'enemy_shame_shadow_black_mirror_evasion',
  name: '黑镜规避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.5,
    },
  ],
  description: '闪避；若闪避成功或对方跳过回合，对方施加1.5倍点数侵蚀',
};

/** 敏感点开发：点数+1，施加0.5倍点数易伤 */
const 敏感点开发: CardData = {
  id: 'enemy_fallen_scholar_sensitive_development',
  name: '敏感点开发',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数+1，施加0.5倍点数易伤',
};

/** 固定实验体：造成1倍点数伤害，并施加1层束缚 */
const 固定实验体: CardData = {
  id: 'enemy_fallen_scholar_restrained_subject',
  name: '固定实验体',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '造成1倍点数伤害，并施加1层束缚',
};

/** 学术洗脑：消耗3MP，造成0.7倍点数伤害，2连击，施加1层禁言 */
const 学术洗脑: CardData = {
  id: 'enemy_fallen_scholar_academic_brainwash',
  name: '学术洗脑',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 3,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.7, scaleAddition: 0 },
  hitCount: 2,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成0.7倍点数的伤害，2连击，施加1层禁言',
};

/** 协同实验：点数*1.5，造成0.6倍点数伤害；若目标有束缚或禁言，额外施加0.5倍点数中毒（额外效果在 CombatView） */
const 协同实验: CardData = {
  id: 'enemy_fallen_scholar_cooperative_experiment',
  name: '协同实验',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.6, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.5，造成0.6倍点数伤害；若目标有束缚或禁言，额外施加0.5倍点数中毒',
};

/** 冷静评估：闪避；若闪避成功或对方跳过回合，回复1倍点数生命并回复1点魔力 */
const 冷静评估: CardData = {
  id: 'enemy_fallen_scholar_calm_assessment',
  name: '冷静评估',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'heal',
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0,
    },
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'restore_mana',
      target: 'self',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '闪避；若闪避成功或对方跳过回合，回复1倍点数生命并回复1点魔力',
};

/** 穿体冲击：点数+1，施加1倍点数生命上限削减 */
const 穿体冲击: CardData = {
  id: 'enemy_dorm_ghost_phase_impact',
  name: '穿体冲击',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.MAX_HP_REDUCTION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '点数+1，施加1倍点数生命上限削减',
};

/** 命令低语：消耗2MP，施加1层禁言与1倍点数生命上限削减 */
const 命令低语: CardData = {
  id: 'enemy_dorm_ghost_command_whisper',
  name: '命令低语',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    {
      kind: 'apply_buff',
      effectType: EffectType.MAX_HP_REDUCTION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '施加1层禁言与1倍点数的生命上限削减',
};

/** 多体共鸣：消耗4MP，点数*1.5，施加0.5倍点数中毒与生命上限削减 */
const 多体共鸣: CardData = {
  id: 'enemy_dorm_ghost_multi_resonance',
  name: '多体共鸣',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
    {
      kind: 'apply_buff',
      effectType: EffectType.MAX_HP_REDUCTION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 0.5,
    },
  ],
  description: '点数*1.5，施加0.5倍点数中毒与生命上限削减',
};

/** 墨潮束缚：点数+1，造成0.5倍点数伤害，并施加1层束缚与0.5倍点数侵蚀 */
const 墨潮束缚: CardData = {
  id: 'enemy_ink_blob_ink_tide_bind',
  name: '墨潮束缚',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数+1，造成0.5倍点数伤害，并施加1层束缚与0.5倍点数的侵蚀',
};

/** 液膜渗入：消耗2MP，点数*1.5，造成0.5倍点数伤害，并施加0.5倍点数疲劳与0.5倍点数侵蚀 */
const 液膜渗入: CardData = {
  id: 'enemy_ink_blob_fluid_infiltration',
  name: '液膜渗入',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.FATIGUE, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数*1.5，造成0.5倍点数伤害，并施加0.5倍点数疲劳与0.5倍点数侵蚀',
};

/** 墨幕规避：闪避，若闪避成功或对方跳过回合，则施加1倍点数侵蚀 */
const 墨幕规避: CardData = {
  id: 'enemy_ink_blob_ink_curtain_evasion',
  name: '墨幕规避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合，则施加1倍点数侵蚀',
};

/** 淫文刻写：功能牌，施加1倍点数易伤，并附带负面效果[淫纹] */
const 淫文刻写: CardData = {
  id: 'enemy_tentacle_quill_lust_script',
  name: '淫文刻写',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '施加1倍点数的易伤，并附带负面效果[淫纹]',
  negativeEffect: '[淫纹]',
};

/** 笔尖缠写：点数+1，造成0.5倍点数伤害，并施加1倍点数侵蚀 */
const 笔尖缠写: CardData = {
  id: 'enemy_tentacle_quill_tip_entangle',
  name: '笔尖缠写',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+1，造成0.5倍点数伤害，并施加1倍点数侵蚀',
};

/** 敏感批注：消耗2MP，点数*1.5，造成0.5倍点数伤害，3连击 */
const 敏感批注: CardData = {
  id: 'enemy_tentacle_quill_sensitive_note',
  name: '敏感批注',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 3,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.5，造成0.5倍点数伤害，3连击',
};

/** 羽旋规避：闪避，若闪避成功或对方跳过回合，则施加1倍点数侵蚀 */
const 羽旋规避: CardData = {
  id: 'enemy_tentacle_quill_plume_evasion',
  name: '羽旋规避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避；若闪避成功或对方跳过回合，则施加1倍点数侵蚀',
};

/** 信息素：诅咒，点数-1，连击，移除 */
const 信息素: CardData = {
  id: 'curse_pheromone',
  name: '信息素',
  type: CardType.CURSE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false, purgeOnUse: true },
  cardEffects: [],
  description: '点数-1，连击，移除',
};

/** 静默伪装：为自身施加1层伏击，并获得1倍点数护甲 */
const CHAIR_MIMIC_SILENT_DISGUISE: CardData = {
  id: 'enemy_chair_mimic_silent_disguise',
  name: '静默伪装',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.AMBUSH, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '为自身施加1层伏击，并获得1倍点数护甲',
};

/** 扶手束缚：点数+1，造成1倍点数伤害并施加1层束缚 */
const CHAIR_MIMIC_ARMREST_BIND: CardData = {
  id: 'enemy_chair_mimic_armrest_bind',
  name: '扶手束缚',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+1，造成1倍点数伤害并施加1层束缚',
};

/** 坐垫侵袭：造成1倍点数伤害并施加1倍点数疲劳；若目标已有束缚，额外施加0.5倍点数中毒 */
const CHAIR_MIMIC_CUSHION_ASSAULT: CardData = {
  id: 'enemy_chair_mimic_cushion_assault',
  name: '坐垫侵袭',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.FATIGUE, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '造成1倍点数伤害并施加1倍点数疲劳；若目标已有束缚，额外施加0.5倍点数的中毒',
};

/** 靠背诱导：闪避，若闪避成功或对方跳过回合，则施加1层禁言与1倍点数易伤 */
const CHAIR_MIMIC_BACKREST_LURE: CardData = {
  id: 'enemy_chair_mimic_backrest_lure',
  name: '靠背诱导',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.SILENCE,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.VULNERABLE,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合，则施加1层禁言与1倍点数的易伤',
};

/** 桌沿攀附：点数+2，造成1倍点数伤害并施加1层易伤 */
const DESK_TENTACLE_TABLE_EDGE_CLING: CardData = {
  id: 'enemy_desk_tentacle_table_edge_cling',
  name: '桌沿攀附',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数+2，造成1倍点数伤害并施加1层易伤',
};

/** 无声缠绕：闪避，若闪避成功或对方跳过回合，则施加1层束缚 */
const DESK_TENTACLE_SILENT_ENTANGLE: CardData = {
  id: 'enemy_desk_tentacle_silent_entangle',
  name: '无声缠绕',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合，则施加1层束缚',
};

/** 钩爪撕扯：造成1倍点数伤害并附加0.5倍点数流血 */
const PATROL_BAT_CLAW_REND: CardData = {
  id: 'enemy_patrol_bat_claw_rend',
  name: '钩爪撕扯',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '造成1倍点数的伤害并附加0.5倍点数的流血',
};

/** 金属尖啸：点数*2，为自身增加1倍点数蓄力 */
const PATROL_BAT_METAL_SCREECH: CardData = {
  id: 'enemy_patrol_bat_metal_screech',
  name: '金属尖啸',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CHARGE, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数*2，为自身增加1倍点数的蓄力',
};

/** 标记：点数*2，造成0.1倍点数伤害，附带负面效果[被标记]，无视闪避 */
const PATROL_BAT_MARK: CardData = {
  id: 'enemy_patrol_bat_mark',
  name: '标记',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.1, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  negativeEffect: '[被标记]',
  ignoreDodge: true,
  description: '点数*2，造成0.1倍点数伤害，附带负面效果[被标记]，无视闪避',
};

/** 飞离：功能，触发后立即结束战斗 */
const PATROL_BAT_FLY_AWAY: CardData = {
  id: 'enemy_patrol_bat_fly_away',
  name: '飞离',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  excape: true,
  description: '逃离',
};

/** 盘旋：点数-1，闪避，若闪避成功施加1倍点数流血 */
const PATROL_BAT_CIRCLING: CardData = {
  id: 'enemy_patrol_bat_circling',
  name: '盘旋',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.BLEED,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '点数-1，闪避，若闪避成功施加1倍点数的流血',
};

/** 寄生钻入：点数+1，造成0.5倍点数伤害，附带负面效果[被寄生] */
const SHAME_LEECH_PARASITIC_DRILL: CardData = {
  id: 'enemy_shame_leech_parasitic_drill',
  name: '寄生钻入',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  negativeEffect: '[被寄生]',
  description: '点数+1，造成0.5倍点数伤害，附带负面效果[被寄生]',
};

/** 精神冲击：施加1层眩晕 */
const WITNESS_WORM_MENTAL_SHOCK: CardData = {
  id: 'enemy_witness_worm_mental_shock',
  name: '精神冲击',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 3,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.STUN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加1层眩晕',
};

/** 退走：功能，触发后立即结束战斗 */
const WITNESS_WORM_RETREAT: CardData = {
  id: 'enemy_witness_worm_retreat',
  name: '退走',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  excape: true,
  description: '逃离',
};

/** 体内繁殖：自身获得1层群集，并为目标施加1倍点数中毒 */
const SHAME_LEECH_INTERNAL_BREEDING: CardData = {
  id: 'enemy_shame_leech_internal_breeding',
  name: '体内繁殖',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SWARM, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '自身获得1层群集，并为目标施加1倍点数的中毒',
};

/** 羞耻放大：施加1倍点数中毒与1层性兴奋 */
const SHAME_LEECH_SHAME_AMPLIFY: CardData = {
  id: 'enemy_shame_leech_shame_amplify',
  name: '羞耻放大',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.ORGASM, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加1倍点数中毒与1层性兴奋',
};

/** 累积催情：施加1层性兴奋，为自身施加1层毒素蔓延 */
const PARASITIC_LEECH_CUMULATIVE_APHRO: CardData = {
  id: 'enemy_parasitic_leech_cumulative_aphro',
  name: '累积催情',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ORGASM, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.TOXIN_SPREAD, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加1层性兴奋，为自身施加1层毒素蔓延',
};

/** 掠食轻咬：点数+1，造成0.5倍点数伤害，并施加0.5倍点数中毒 */
const BLOOD_BAT_PREDATORY_NIBBLE: CardData = {
  id: 'enemy_blood_bat_predatory_nibble',
  name: '掠食轻咬',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数+1，造成0.5倍点数伤害，并施加0.5倍点数中毒',
};

/** 超声波刺激：消耗1MP，造成0.5倍点数伤害并施加0.5倍点数性兴奋 */
const BLOOD_BAT_ULTRASONIC_STIMULUS: CardData = {
  id: 'enemy_blood_bat_ultrasonic_stimulus',
  name: '超声波刺激',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 1,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ORGASM, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '造成0.5倍点数伤害并施加0.5倍点数的性兴奋',
};

/** 群体共鸣：消耗4MP，点数*1.5，施加1层性兴奋与0.5倍点数疲劳（每层群集额外结算一次，额外逻辑在 CombatView） */
const BLOOD_BAT_SWARM_RESONANCE: CardData = {
  id: 'enemy_blood_bat_swarm_resonance',
  name: '群体共鸣',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ORGASM, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.FATIGUE, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数*1.5，施加1层性兴奋与0.5倍点数的疲劳，自身每有1层群集则额外结算一次',
};

/** 低空盘旋：点数-1，闪避；若闪避成功或对方跳过回合，施加1层性兴奋 */
const BLOOD_BAT_LOW_GLIDE: CardData = {
  id: 'enemy_blood_bat_low_glide',
  name: '低空盘旋',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.ORGASM,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数-1，闪避；若闪避成功或对方跳过回合，施加1层性兴奋',
};

/** 献礼微笑：施加2层性兴奋 */
const BLOOD_SERVANT_OFFERING_SMILE: CardData = {
  id: 'enemy_blood_servant_offering_smile',
  name: '献礼微笑',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ORGASM, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '施加2层“性兴奋”',
};

/** 邀请：点数+1，施加1倍点数疲劳 */
const BLOOD_SERVANT_INVITATION: CardData = {
  id: 'enemy_blood_servant_invitation',
  name: '邀请',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.FATIGUE, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+1，施加1倍点数的“疲劳”',
};

/** 牵引：施加1倍点数侵蚀 */
const BLOOD_SERVANT_LURE: CardData = {
  id: 'enemy_blood_servant_lure',
  name: '牵引',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '施加1倍点数的侵蚀',
};

/** 嗅探：为自身施加1倍点数蓄力 */
const NIGHTMARE_STEED_SNIFF: CardData = {
  id: 'enemy_nightmare_steed_sniff',
  name: '嗅探',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CHARGE, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '为自身施加1倍点数的蓄力',
};

/** 烙蹄奔踏：造成1倍点数伤害，施加0.5倍点数燃烧 */
const NIGHTMARE_STEED_BRANDED_STOMP: CardData = {
  id: 'enemy_nightmare_steed_branded_stomp',
  name: '烙蹄奔踏',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '造成1倍点数伤害，施加0.5倍点数燃烧',
};

/** 甩鞍捕获：造成0.8倍点数伤害，施加1层束缚 */
const NIGHTMARE_STEED_SADDLE_CAPTURE: CardData = {
  id: 'enemy_nightmare_steed_saddle_capture',
  name: '甩鞍捕获',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.8, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '造成0.8倍点数伤害，施加1层束缚',
};

/** 迷尘：为对手施加1层敌意隐藏 */
const NIGHTMARE_STEED_MIST_DUST: CardData = {
  id: 'enemy_nightmare_steed_mist_dust',
  name: '迷尘',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.COGNITIVE_INTERFERENCE,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '为对手施加1层敌意隐藏',
};

/** 无面威慑：施加1层虚实不明与敌意隐藏 */
const EXECUTIONER_PUPPET_FACELESS_INTIMIDATION: CardData = {
  id: 'enemy_executioner_puppet_faceless_intimidation',
  name: '无面威慑',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '施加1层虚实不明与敌意隐藏',
};

/** 刑具变化：增加自身最大点数和最小点数1点 */
const EXECUTIONER_PUPPET_TOOL_SHIFT: CardData = {
  id: 'enemy_executioner_puppet_tool_shift',
  name: '刑具变化',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '增加自身最大点数和最小点数1点',
};

/** 行刑：点数随机-2~+2，造成1倍物理伤害（结算逻辑在 CombatView） */
const EXECUTIONER_PUPPET_EXECUTION: CardData = {
  id: 'enemy_executioner_puppet_execution',
  name: '行刑',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数随机-2~+2，造成1倍物理伤害',
};

/** 避让：闪避，若闪避成功则为自身增加1倍点数的增伤 */
const EXECUTIONER_PUPPET_EVADE: CardData = {
  id: 'enemy_executioner_puppet_evade',
  name: '避让',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.DAMAGE_BOOST,
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，若闪避成功则为自身增加1倍点数的增伤',
};

/** 骨鞭：点数+1，造成1倍点数伤害，并施加0.5倍点数电击 */
const PUNISHMENT_PUPPET_BONE_WHIP: CardData = {
  id: 'enemy_punishment_puppet_bone_whip',
  name: '骨鞭',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数+1，造成1倍点数伤害，并施加0.5倍点数电击',
};

/** 吸盘压制：施加0.5倍点数电击与1层虚弱，并获得0.5倍点数护甲 */
const PUNISHMENT_PUPPET_SUCTION_SUPPRESS: CardData = {
  id: 'enemy_punishment_puppet_suction_suppress',
  name: '吸盘压制',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
    { kind: 'apply_buff', effectType: EffectType.WEAKEN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '施加0.5倍点数电击与1层虚弱，回复自身0.5倍点数护甲',
};

/** 过载执行：点数+2，造成0.8倍点数伤害，2连击，并施加1倍点数电击 */
const PUNISHMENT_PUPPET_OVERLOAD_EXECUTE: CardData = {
  id: 'enemy_punishment_puppet_overload_execute',
  name: '过载执行',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 5,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 0.8, scaleAddition: 0 },
  hitCount: 2,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+2，造成0.8倍点数伤害，2连击，施加1倍点数电击',
};

/** 影袭：点数-1，闪避；若闪避成功或对方跳过回合，造成1倍点数伤害（伤害分支在 CombatView） */
const SHADOW_JAILER_SHADOW_ASSAULT: CardData = {
  id: 'enemy_shadow_jailer_shadow_assault',
  name: '影袭',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数-1，闪避；若闪避成功或对方跳过回合，造成1倍点数的伤害',
};

/** 执法锁拿：造成1.5倍点数伤害，并施加1层虚弱 */
const SHADOW_JAILER_ENFORCEMENT_LOCK: CardData = {
  id: 'enemy_shadow_jailer_enforcement_lock',
  name: '执法锁拿',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.WEAKEN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成1.5倍点数伤害，并施加1层虚弱',
};

/** 刺麻鞭挞：造成1倍点数伤害，并施加1倍点数电击 */
const SHADOW_JAILER_NUMBING_WHIP: CardData = {
  id: 'enemy_shadow_jailer_numbing_whip',
  name: '刺麻鞭挞',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '造成1倍点数伤害，并施加1倍点数电击',
};

/** 形态切换：按是否拥有虚幻之躯切换形态（结算逻辑在 CombatView） */
const SHADOW_JAILER_FORM_SHIFT: CardData = {
  id: 'enemy_shadow_jailer_form_shift',
  name: '形态切换',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [],
  description: '切换形态，连击',
};

/** 倒刺缠握：点数+2，造成0.6倍点数伤害，并施加1层束缚 */
const THORN_CRAWLER_BARBED_GRASP: CardData = {
  id: 'enemy_thorncrawler_barbed_grasp',
  name: '倒刺缠握',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 0.6, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+2，造成0.6倍点数伤害，并施加1层束缚',
};

/** 神经刺鸣：造成0.5倍点数伤害，并施加0.5倍点数电击；若目标已有束缚，额外施加1倍点数电击与疲劳（额外效果在 CombatView） */
const THORN_CRAWLER_NEURAL_PIERCE: CardData = {
  id: 'enemy_thorncrawler_neural_pierce',
  name: '神经刺鸣',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '造成0.5倍点数伤害，并施加0.5倍点数的电击；若目标已有束缚，额外施加1倍点数电击与疲劳',
};

/** 毒素脉冲：点数*1.5，法力汲取1，施加1倍点数电击；若目标已有束缚，额外施加1层束缚（额外效果在 CombatView） */
const THORN_CRAWLER_TOXIN_PULSE: CardData = {
  id: 'enemy_thorncrawler_toxin_pulse',
  name: '毒素脉冲',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  manaDrain: 3,
  description: '点数*1.5，法力汲取3，施加1倍点数电击；若目标已有束缚，额外施加1层束缚',
};

/** 入侵：物理，无直接伤害，施加1倍点数的侵蚀 */
const 入侵: CardData = {
  id: 'enemy_ink_slime_invasion',
  name: '入侵',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '施加1倍点数的侵蚀',
};

/** 凝聚：回复1倍点数生命并为自身施加1层群集 */
const 凝聚: CardData = {
  id: 'enemy_ink_slime_condense',
  name: '凝聚',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.SWARM, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '回复1倍点数的生命值并为自身施加1层群集',
};

/** 拥抱：点数+1，造成1倍点数伤害并施加1层束缚 */
const 普莉姆拥抱: CardData = {
  id: 'enemy_prim_embrace',
  name: '拥抱',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+1，造成1倍点数的伤害并施加1层束缚',
};

/** 流体规避：点数-1，闪避 */
const 普莉姆流体规避: CardData = {
  id: 'enemy_prim_fluid_evasion',
  name: '流体规避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.POISON,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '点数-1，闪避，若闪避成功或对方跳过回合，则为对方施加1倍点数的中毒',
};

/** 消化性爱抚：消耗4MP，施加3点中毒 */
const 普莉姆消化性爱抚: CardData = {
  id: 'enemy_prim_digest_caress',
  name: '消化性爱抚',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'fixed', fixedValue: 3 },
  ],
  description: '施加3点中毒',
};

/** 实体分身：自伤50%生命上限，回复1倍点数生命，获得1层群集 */
const 实体分身: CardData = {
  id: 'enemy_prim_entity_clone',
  name: '实体分身',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.MAX_HP_REDUCTION,
      target: 'self',
      valueMode: 'max_hp_percent',
      scale: 0.5,
    },
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.SWARM, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '自伤50%生命上限，回复1倍点数的生命，获得1层群集',
};

/** 性爱幻觉：诅咒，无法打出 */
const 性爱幻觉: CardData = {
  id: 'enemy_nymph_lust_hallucination',
  name: '性爱幻觉',
  type: CardType.CURSE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, unplayable: true },
  cardEffects: [],
  description: '无法打出',
};

/** 迷雾缭绕：点数+1，施加2层中毒并插入性爱幻觉 */
const 迷雾缭绕: CardData = {
  id: 'enemy_nymph_misty_swirl',
  name: '迷雾缭绕',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, insertCardsToEnemyDeck: ['性爱幻觉'] },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '点数+1，造成2层中毒并插入“性爱幻觉”',
};

/** 精神震荡：消耗6MP，点数+2，造成1倍点数伤害并施加1层易伤 */
const 精神震荡: CardData = {
  id: 'enemy_nymph_mental_shock',
  name: '精神震荡',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数+2，造成1倍点数的伤害并施加1层易伤',
};

/** 恶作剧：闪避，若闪避成功或对方跳过回合，对对方施加1倍点数的电击 */
const 恶作剧: CardData = {
  id: 'enemy_nymph_mischief',
  name: '恶作剧',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.SHOCK,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合，对对方施加1倍点数的电击',
};

/** 巨大化投影：点数+2，移除自身的虚幻之躯，获得2倍点数生命与护甲，最小点数+2，最大点数+4（结算逻辑在 CombatView） */
const 巨大化投影: CardData = {
  id: 'enemy_nymph_giant_projection',
  name: '巨大化投影',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 2.0 },
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 2.0 },
  ],
  description: '点数+2，移除自身的“虚幻之躯”，获得2倍点数生命与护甲，最小点数+2，最大点数+4',
};

/** 血刺丛生：造成0.3倍点数伤害，5连击；每击有50%概率施加2层流血（概率逻辑在 CombatView） */
const 血刺丛生: CardData = {
  id: 'enemy_elizabeth_blood_thorns',
  name: '血刺丛生',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.3, scaleAddition: 0 },
  hitCount: 5,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成0.3倍点数伤害，5连击。每击有50%概率施加2层流血',
};

/** 凝血成兵：点数*1.5，自伤5，造成0.4倍点数伤害，3连击 */
const 凝血成兵: CardData = {
  id: 'enemy_elizabeth_coagulate_soldier',
  name: '凝血成兵',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.4, scaleAddition: 0 },
  hitCount: 3,
  traits: { combo: false, reroll: 'none', draw: false },
  selfDamage: 5,
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.DAMAGE_BOOST, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数*1.5，自伤5，造成0.4倍点数伤害，3连击，并为自身施加1层增伤',
};

/** 蝙蝠突袭：法力汲取6 */
const 蝙蝠突袭: CardData = {
  id: 'enemy_elizabeth_bat_raid',
  name: '蝙蝠突袭',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  manaDrain: 6,
  cardEffects: [],
  description: '法力汲取6',
};

/** 沸血律动：消耗4MP，点数+2，造成1倍点数真实伤害并施加0.5倍点数流血（真实伤害逻辑在 CombatView） */
const 沸血律动: CardData = {
  id: 'enemy_elizabeth_boiling_blood_pulse',
  name: '沸血律动',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数+2，造成1倍点数的真实伤害并施加0.5倍点数的流血',
};

/** 血液停滞：消耗2MP，施加1倍点数流血，并触发一次目标流血（触发逻辑在 CombatView） */
const 血液停滞: CardData = {
  id: 'enemy_elizabeth_blood_stasis',
  name: '血液停滞',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '施加1倍点数的流血，并触发一次目标流血',
};

/** 血雾化身：为自身施加40%生命上限的生命上限削减与1层虚幻之躯，然后恢复至满血 */
const 血雾化身: CardData = {
  id: 'enemy_elizabeth_blood_mist_avatar',
  name: '血雾化身',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.MAX_HP_REDUCTION,
      target: 'self',
      valueMode: 'max_hp_percent',
      scale: 0.4,
    },
    {
      kind: 'apply_buff',
      effectType: EffectType.ILLUSORY_BODY,
      target: 'self',
      valueMode: 'fixed',
      fixedValue: 1,
    },
    {
      kind: 'heal',
      target: 'self',
      valueMode: 'max_hp_percent',
      scale: 1,
    },
  ],
  description: '为自身施加40%生命上限的生命上限削减与1层虚幻之躯，然后恢复至满血',
};

/** 静肃宣告：消耗2MP，造成1倍点数伤害并施加2层禁言；若目标已有禁言则额外施加1层束缚（额外效果在 CombatView） */
const 静肃宣告: CardData = {
  id: 'enemy_hilvy_silent_decree',
  name: '静肃宣告',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '造成1倍点数伤害并施加2层禁言；若目标已有禁言，则额外施加1层束缚',
};

/** 纸刃切割：点数+1，造成1倍点数伤害，并施加1倍点数流血 */
const 纸刃切割: CardData = {
  id: 'enemy_hilvy_paper_blade_cut',
  name: '纸刃切割',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+1，造成1倍点数伤害，并施加1倍点数的流血',
};

/** 哑剧牵引：消耗3MP，点数*1.5，造成1倍点数伤害并施加2层被操控；若目标已有禁言则回复自身1倍点数魔力（额外效果在 CombatView） */
const 哑剧牵引: CardData = {
  id: 'enemy_hilvy_mime_pull',
  name: '哑剧牵引',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 3,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CONTROLLED, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '点数*1.5，造成1倍点数伤害，并施加2层被操控；若目标已有禁言，则回复自身1倍点数的魔力',
};

/** 失声：消耗4MP，点数+3，造成1倍点数伤害并施加2层禁言；若目标已有禁言则额外施加1层性兴奋（额外效果在 CombatView） */
const 失声: CardData = {
  id: 'enemy_hilvy_aphonia',
  name: '失声',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 3 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '点数+3，造成1倍点数伤害，并施加2层禁言；若目标已有禁言，则额外施加1层性兴奋',
};

/** 静夜规避：闪避；若闪避成功或对方跳过回合，则施加1倍点数流血 */
const 静夜规避: CardData = {
  id: 'enemy_hilvy_silent_night_evasion',
  name: '静夜规避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.BLEED,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避；若闪避成功或对方跳过回合，则施加1倍点数流血',
};

/** 沉默终章：消耗6MP，点数*2，造成1倍点数伤害，施加1倍点数流血、5层禁言与2层被操控，无视闪避 */
const 沉默终章: CardData = {
  id: 'enemy_hilvy_silent_finale',
  name: '沉默终章',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 5 },
    { kind: 'apply_buff', effectType: EffectType.CONTROLLED, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  ignoreDodge: true,
  description: '点数*2，造成1倍点数伤害，施加1倍点数流血、5层禁言与2层被操控；无视闪避',
};

/** 淫墨誓约：诅咒，无法打出 */
const 淫墨誓约: CardData = {
  id: 'enemy_ink_lord_ink_vow',
  name: '淫墨誓约',
  type: CardType.CURSE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, unplayable: true },
  cardEffects: [],
  description: '无法打出',
};

/** 肃静宣言：造成1倍点数伤害，施加1层禁言 */
const 尤斯蒂娅肃静宣言: CardData = {
  id: 'enemy_yustia_silent_proclamation',
  name: '肃静宣言',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成1倍点数伤害，施加1层禁言',
};

/** 罪责具现：造成1倍点数伤害并清空对方寒冷，每清空1层则增加1点造成的伤害（结算逻辑在 CombatView） */
const 罪责具现: CardData = {
  id: 'enemy_yustia_guilt_manifest',
  name: '罪责具现',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害并清空对方寒冷，每清空1层则增加1点造成的伤害',
};

/** 真言鳞粉：消耗6，点数额外增加对方当前魔力值，造成1倍点数伤害，施加1层鳞粉。清空对方魔力，每清除1点则施加2层寒冷（结算逻辑在 CombatView） */
const 真言鳞粉: CardData = {
  id: 'enemy_yustia_trueword_scale_powder',
  name: '真言鳞粉',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SCALE_POWDER, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '消耗6，点数额外增加对方当前魔力值，造成1倍点数伤害，施加1层鳞粉。清空对方魔力，每清除1点则施加2层寒冷',
};

/** 精神施压：施加1倍点数寒冷与1层鳞粉 */
const 精神施压: CardData = {
  id: 'enemy_yustia_mental_pressure',
  name: '精神施压',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.SCALE_POWDER, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加1倍点数寒冷与1层鳞粉',
};

/** 鳞粉结界：为自身施加2层结界 */
const 鳞粉结界: CardData = {
  id: 'enemy_yustia_scale_powder_barrier',
  name: '鳞粉结界',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BARRIER, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '为自身施加2层结界',
};

/** 墨痕敕令：消耗1MP，点数+1，造成0.5倍点数伤害并施加1层被操控 */
const 墨痕敕令: CardData = {
  id: 'enemy_ink_lord_ink_brand_decree',
  name: '墨痕敕令',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 1,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CONTROLLED, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数+1，造成0.5倍点数伤害并施加1层被操控',
};
/** 触手缠绕：点数*1.2，造成1倍点数伤害并施加1层束缚 */
const 触手缠绕: CardData = {
  id: 'enemy_ink_lord_tentacle_entangle',
  name: '触手缠绕',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.2, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数*1.2，造成1倍点数伤害并施加1层束缚',
};

/** 强制书写：附带负面效果[淫纹]并施加1层被操控；若目标有束缚则额外施加1倍点数侵蚀（额外效果在 CombatView） */
const 强制书写: CardData = {
  id: 'enemy_ink_lord_forced_script',
  name: '强制书写',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CONTROLLED, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  negativeEffect: '[淫纹]',
  description: '附带负面效果[淫纹]并施加1层被操控；若目标有束缚则额外施加1倍点数的侵蚀',
};

/** 墨池规避：闪避；若闪避成功或对方跳过回合，施加1倍点数侵蚀 */
const 墨池规避: CardData = {
  id: 'enemy_ink_lord_ink_pool_evasion',
  name: '墨池规避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避；若闪避成功或对方跳过回合，施加1倍点数侵蚀',
};

/** 黑潮灌注：消耗6MP，点数*2，造成0.5倍点数伤害并施加0.5倍点数侵蚀；若目标已有被操控，则额外插入3张淫墨誓约（额外效果在 CombatView） */
const 黑潮灌注: CardData = {
  id: 'enemy_ink_lord_black_tide_infusion',
  name: '黑潮灌注',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数*2，造成0.5倍点数伤害并施加0.5倍点数侵蚀；若目标已有被操控，则额外插入3张“淫墨誓约”',
};

/** 档案污页：诅咒，无法打出 */
const 档案污页: CardData = {
  id: 'enemy_akasha_archive_smudge',
  name: '档案污页',
  type: CardType.CURSE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, unplayable: true },
  cardEffects: [],
  description: '无法打出',
};

/** 欲望检索：对目标施加1层易伤，并回复自身2倍点数生命 */
const 欲望检索: CardData = {
  id: 'enemy_akasha_desire_retrieval',
  name: '欲望检索',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 2.0 },
  ],
  description: '对目标施加1层易伤，回复自身2倍点数的生命',
};

/** 钉缚：造成1.5倍点数伤害 */
const 钉缚: CardData = {
  id: 'enemy_akasha_pin_bind',
  name: '钉缚',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1.5倍点数伤害',
};

/** 催眠书页：造成0.5倍点数伤害，插入1张档案污页，并附带负面状态[淫乱知识] */
const 催眠书页: CardData = {
  id: 'enemy_akasha_hypnosis_page',
  name: '催眠书页',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false, insertCardsToEnemyDeck: ['档案污页'] },
  cardEffects: [],
  negativeEffect: '[淫乱知识]',
  description: '造成0.5倍点数伤害，插入1张“档案污页”，附带负面状态[淫乱知识]',
};

/** 欲望实体化：消耗3MP，点数+2，造成1倍点数伤害并施加0.5倍点数易伤 */
const 欲望实体化: CardData = {
  id: 'enemy_akasha_desire_materialization',
  name: '欲望实体化',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数+2，造成1倍点数伤害并施加0.5倍点数易伤',
};

/** 审阅规避：点数-1，闪避；若闪避成功或对方跳过回合，施加2倍点数寒冷 */
const 审阅规避: CardData = {
  id: 'enemy_akasha_review_evasion',
  name: '审阅规避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.COLD,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 2.0,
    },
  ],
  description: '点数-1，闪避；若闪避成功或对方跳过回合，施加2倍点数的寒冷',
};

/** 终页定论：消耗8MP，点数*3，造成0.4倍点数伤害，3连击，并施加1层眩晕 */
const 终页定论: CardData = {
  id: 'enemy_akasha_final_verdict',
  name: '终页定论',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '稀有',
  manaCost: 8,
  calculation: { multiplier: 3.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.4, scaleAddition: 0 },
  hitCount: 3,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.STUN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数*3，造成0.4倍点数伤害，3连击，并施加1层眩晕',
};

/** 固守：回复1倍点数生命与1倍点数护甲 */
const 固守: CardData = {
  id: 'enemy_dorothy_hold_ground',
  name: '固守',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '回复1倍点数生命与护甲',
};

/** 鞭戒：点数+1，造成1倍点数伤害，2连击，并施加0.5倍点数侵蚀 */
const 鞭戒: CardData = {
  id: 'enemy_dorothy_whip_discipline',
  name: '鞭戒',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 2,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数+1，造成1倍点数伤害，2连击，施加0.5倍点数侵蚀',
};

/** 声音支配：点数*1.5，造成1倍点数伤害，并施加0.5倍点数侵蚀 */
const 声音支配: CardData = {
  id: 'enemy_dorothy_voice_domination',
  name: '声音支配',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数*1.5，造成1倍点数伤害，并施加0.5倍点数侵蚀',
};

/** 罚站：点数-2，闪避；若闪避成功或对方跳过回合，施加1倍点数侵蚀 */
const 罚站: CardData = {
  id: 'enemy_dorothy_hallway_stand',
  name: '罚站',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -2 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '点数-2，闪避；若闪避成功或对方跳过回合，施加1倍点数侵蚀',
};

/** 倒刺乱舞：造成0.4倍点数伤害，3连击，并施加0.5倍点数流血 */
const 倒刺乱舞: CardData = {
  id: 'enemy_veronica_barbed_flurry',
  name: '倒刺乱舞',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.4, scaleAddition: 0 },
  hitCount: 3,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '造成0.4倍点数伤害，3连击，并施加0.5倍点数流血',
};

/** 骨鞭缠绕：点数+1，造成0.5倍点数伤害，并施加0.5倍点数流血与1层束缚 */
const 骨鞭缠绕: CardData = {
  id: 'enemy_veronica_bone_whip_bind',
  name: '骨鞭缠绕',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+1，造成0.5倍点数伤害，并施加0.5倍点数流血与1层束缚',
};

/** 折磨循环：消耗6MP，点数*2，造成0.2倍点数伤害，2连击，并结算目标流血1次（结算逻辑在 CombatView） */
const 折磨循环: CardData = {
  id: 'enemy_veronica_torment_cycle',
  name: '折磨循环',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 6,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.2, scaleAddition: 0 },
  hitCount: 2,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗6MP，点数*2，造成0.2倍点数伤害，2连击，并结算目标流血1次',
};

/** 狂暴化：获得1层增伤与3层无视闪避 */
const 狂暴化: CardData = {
  id: 'enemy_veronica_berserk',
  name: '狂暴化',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.DAMAGE_BOOST, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.IGNORE_DODGE, target: 'self', valueMode: 'fixed', fixedValue: 3 },
  ],
  description: '获得1层增伤与3层无视闪避',
};

/** 震动感知：为自身增加1.5倍点数护甲 */
const 震动感知: CardData = {
  id: 'enemy_root_tremor_sense',
  name: '震动感知',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.5 },
  ],
  description: '为自身增加1.5倍最终点数的护甲',
};

/** 润滑分泌：为敌方增加0.5倍点数的中毒 */
const 润滑分泌: CardData = {
  id: 'enemy_root_lube_secretion',
  name: '润滑分泌',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '为敌方增加0.5倍最终点数的中毒',
};

/** 渗透攀爬：造成1倍点数伤害并附加1回合束缚（当回合不衰减） */
const 渗透攀爬: CardData = {
  id: 'enemy_root_infiltrate_climb',
  name: '渗透攀爬',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '造成1倍最终点数伤害，并为敌方附加1回合束缚',
};

/** 冲撞 — 游荡粘液球等魔物的基础物理攻击 */
const 冲撞: CardData = {
  id: 'enemy_charge',
  name: '冲撞',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+1，造成1倍最终点数的伤害',
};

/** 无感蔓延：点数+1，造成0.5倍点数伤害并施加1层束缚 */
const 无感蔓延: CardData = {
  id: 'enemy_swamp_numb_spread',
  name: '无感蔓延',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+1，造成0.5倍点数伤害并施加1层束缚',
};

/** 流体包裹：点数+2，造成0.5倍点数伤害，若玩家已被束缚，则施加被吞食 */
const 流体包裹: CardData = {
  id: 'enemy_swamp_fluid_wrap',
  name: '流体包裹',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.DEVOUR, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数+2，造成0.5倍点数伤害，若玩家已被束缚，则施加被吞食',
};

/** 选择性溶解：施加2层中毒 */
const 选择性溶解: CardData = {
  id: 'enemy_swamp_corrode',
  name: '选择性溶解',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '施加2层中毒',
};

/** 催情气体：点数*1.5，施加1层中毒与1层束缚 */
const 催情气体: CardData = {
  id: 'enemy_mimicbubble_aphro_gas',
  name: '催情气体',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数*1.5，施加1层中毒与1层束缚',
};

/** 弹性吸附：自身增加1倍点数的护甲，为对方施加1层中毒 */
const 弹性吸附: CardData = {
  id: 'enemy_mimicbubble_elastic_adsorb',
  name: '弹性吸附',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '自身增加1倍点数的护甲，为对方施加1层中毒',
};

/** 虹色漂浮：闪避，若闪避成功或对方跳过回合则施加1层束缚 */
const 虹色漂浮: CardData = {
  id: 'enemy_mimicbubble_iridescent_float',
  name: '虹色漂浮',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合则施加1层束缚',
};

/** 幻象诱导：闪避，若闪避成功或对方跳过回合，则施加2层生命上限削减 */
const 幻象诱导: CardData = {
  id: 'enemy_mist_sprite_illusion_lure',
  name: '幻象诱导',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.MAX_HP_REDUCTION,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 2,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合，则对对方施加2层生命上限削减',
};

/** 幽灵幻象：闪避，若闪避成功或对方跳过回合，则施加5层生命上限削减 */
const 幽灵幻象: CardData = {
  id: 'enemy_whisper_ghost_phantom',
  name: '幽灵幻象',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.MAX_HP_REDUCTION,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 5,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合，则施加5层生命上限削减',
};

/** 知识低语：消耗2MP，施加1倍点数的生命上限衰减 */
const 知识低语: CardData = {
  id: 'enemy_whisper_ghost_knowledge_whisper',
  name: '知识低语',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.MAX_HP_REDUCTION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '施加1倍点数的生命上限衰减',
};

/** 禁忌知识：消耗10MP，点数*3，施加1倍点数的侵蚀 */
const 禁忌知识: CardData = {
  id: 'enemy_whisper_ghost_forbidden_knowledge',
  name: '禁忌知识',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 10,
  calculation: { multiplier: 3.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '点数*3，施加1倍点数的侵蚀',
};

/** 被动增敏：法力汲取6 */
const 被动增敏: CardData = {
  id: 'enemy_whisper_ghost_passive_sensitization',
  name: '被动增敏',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  manaDrain: 6,
  description: '法力汲取6',
};

/** 行间诱惑：消耗4MP，点数+2，造成0.4倍伤害并施加1倍点数的侵蚀 */
const 行间诱惑: CardData = {
  id: 'enemy_book_demon_between_lines_temptation',
  name: '行间诱惑',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 0.4, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '点数+2，造成0.4倍伤害并施加1倍点数的侵蚀',
};

/** 墨迹触手：点数+1，造成1倍伤害并施加1层束缚 */
const 墨迹触手: CardData = {
  id: 'enemy_book_demon_ink_tentacle',
  name: '墨迹触手',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+1，造成1倍伤害并施加1层束缚',
};

/** 低语教唆：施加1层眩晕 */
const 低语教唆: CardData = {
  id: 'enemy_book_demon_whisper_incitement',
  name: '低语教唆',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.STUN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加1层眩晕',
};

/** 知识渴望：点数-1，闪避，若闪避成功施加1层禁言 */
const 知识渴望: CardData = {
  id: 'enemy_book_demon_knowledge_thirst',
  name: '知识渴望',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.SILENCE,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数-1，闪避，若闪避成功施加1层禁言',
};

/** 束缚丝：造成1倍点数伤害，并赋予1层束缚 */
const 束缚丝: CardData = {
  id: 'enemy_judgment_spider_binding_silk',
  name: '束缚丝',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BIND, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成1倍点数伤害，赋予1层束缚',
};

/** 传导丝：施加1倍点数电击，并触发一次目标身上的电击（触发逻辑在 CombatView） */
const 传导丝: CardData = {
  id: 'enemy_judgment_spider_conduction_silk',
  name: '传导丝',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '施加1倍点数电击并触发一次目标身上的电击',
};

/** 麻痹螯刺：点数+2，施加1倍点数电击 */
const 麻痹螯刺: CardData = {
  id: 'enemy_judgment_spider_paralytic_pincer',
  name: '麻痹螯刺',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+2，造成1倍点数电击',
};

/** 设伏：点数-1，闪避，若闪避成功或对方跳过回合，则为自身施加1层伏击 */
const 设伏: CardData = {
  id: 'enemy_judgment_spider_set_ambush',
  name: '设伏',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.AMBUSH,
      target: 'self',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数-1，闪避，若闪避成功或对方跳过回合，则为自身施加1层伏击',
};

/** 神经兴奋刺丝：施加0.5倍点数中毒与1层性兴奋 */
const ABYSS_JELLYFISH_NEURAL_EXCITE_FILAMENT: CardData = {
  id: 'enemy_abyss_jellyfish_neural_excite_filament',
  name: '神经兴奋刺丝',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
    { kind: 'apply_buff', effectType: EffectType.ORGASM, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加0.5倍点数中毒与1层性兴奋',
};

/** 迂回：为自身添加1倍点数护甲与蓄力 */
const ABYSS_JELLYFISH_CIRCUITOUS: CardData = {
  id: 'enemy_abyss_jellyfish_circuitous',
  name: '迂回',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.CHARGE, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '为自身添加1倍点数护甲与蓄力',
};

/** 全身包裹：造成0.5倍点数中毒与1层被吞食，为自身施加2层易伤 */
const ABYSS_JELLYFISH_FULL_WRAP: CardData = {
  id: 'enemy_abyss_jellyfish_full_wrap',
  name: '全身包裹',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
    { kind: 'apply_buff', effectType: EffectType.DEVOUR, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '造成0.5倍点数中毒与1层被吞食，为自身施加2层易伤',
};

/** 毒素分泌：造成1倍点数中毒 */
const ABYSS_JELLYFISH_TOXIN_SECRETION: CardData = {
  id: 'enemy_abyss_jellyfish_toxin_secretion',
  name: '毒素分泌',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '造成1倍点数中毒',
};

/** 群体围猎：点数+自身群集数，造成1倍点数伤害并施加自身群集数层束缚，自身群集+1 */
const STITCHED_SPIDER_PACK_HUNT: CardData = {
  id: 'enemy_stitched_spider_pack_hunt',
  name: '群体围猎',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SWARM, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数+自身群集数，造成1倍点数伤害并施加自身群集数层束缚，自身群集+1',
};

/** 精密注射：施加1倍点数电击，法力汲取1 */
const STITCHED_SPIDER_PRECISE_INJECTION: CardData = {
  id: 'enemy_stitched_spider_precise_injection',
  name: '精密注射',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  manaDrain: 1,
  description: '造成1倍点数电击，法力汲取1',
};

/** 召集：为自身增加等同自身群集层数的蓄力（结算逻辑在 CombatView） */
const 丝线召集: CardData = {
  id: 'enemy_silk_puppet_rally',
  name: '召集',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '为自身增加等同自身群集层数的蓄力',
};

/** 扑倒：造成1倍点数伤害，施加99层束缚；若拼点失败，自身最大骰子点数+1 */
const 丝线扑倒: CardData = {
  id: 'enemy_silk_puppet_pounce',
  name: '扑倒',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BIND, target: 'enemy', valueMode: 'fixed', fixedValue: 99 },
  ],
  description: '造成1倍点数伤害，施加99层束缚；若拼点失败，自身最大骰子点数+1',
};

/** 合力制服：点数+自身群集数，造成1倍点数伤害 */
const 合力制服: CardData = {
  id: 'enemy_silk_puppet_cooperative_subdue',
  name: '合力制服',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+自身群集数，造成1倍点数伤害',
};

/** 弱点侦察：施加1层易伤 */
const 弱点侦察: CardData = {
  id: 'enemy_tester_weakness_scout',
  name: '弱点侦察',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加1层易伤',
};

/** 逻辑分析：增加自身1点最大点数和最小点数 */
const 逻辑分析: CardData = {
  id: 'enemy_tester_logic_analysis',
  name: '逻辑分析',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '增加自身1点最大点数和最小点数',
};

/** 后撤闪避：闪避，闪避成功后为自身施加1层增伤 */
const 后撤闪避: CardData = {
  id: 'enemy_tester_backstep_dodge',
  name: '后撤闪避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.DAMAGE_BOOST,
      target: 'self',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '闪避，闪避成功后为自身施加1层增伤',
};

/** 完成分析，虹膜切替：移除自身虹膜：琥珀，为自身施加1层虹膜：猩红并增加自身3点最大与最小骰子点数 */
const 完成分析虹膜切替: CardData = {
  id: 'enemy_tester_complete_analysis_iris_shift',
  name: '完成分析，虹膜切替',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '移除自身虹膜：琥珀，为自身施加1层虹膜：猩红并增加自身3点最大与最小骰子点数',
};

/** 超关节绞杀：点数*1.2，造成1倍物理伤害，无视闪避 */
const 超关节绞杀: CardData = {
  id: 'enemy_tester_hyperjoint_strangle',
  name: '超关节绞杀',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.2, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  ignoreDodge: true,
  description: '点数*1.2，造成1倍物理伤害，无视闪避',
};

/** 多重鞭腿：造成0.5倍点数伤害，3连击 */
const 多重鞭腿: CardData = {
  id: 'enemy_tester_multi_whip_kick',
  name: '多重鞭腿',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 3,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成0.5倍点数伤害，3连击',
};

/** 柔和缠绕：法力汲取5，施加2层束缚 */
const 柔和缠绕: CardData = {
  id: 'enemy_kraken_gentle_entangle',
  name: '柔和缠绕',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BIND, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  manaDrain: 5,
  description: '法力汲取5，施加2层束缚',
};

/** 三重鞭打：造成0.5倍点数伤害，3连击 */
const 三重鞭打: CardData = {
  id: 'enemy_kraken_triple_whiplash',
  name: '三重鞭打',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 3,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成0.5倍点数伤害，3连击',
};

/** 独占：点数*2，造成1倍点数伤害；若目标拥有不屈，则移除目标1层不屈（额外效果在 CombatView） */
const 独占: CardData = {
  id: 'enemy_kraken_exclusive',
  name: '独占',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*2，造成1倍点数伤害；若目标拥有不屈，则移除目标1层不屈',
};

/** 深海粘液：消耗4，造成0.8倍点数伤害，施加0.5倍点数中毒；若对手处于束缚状态，额外施加1层虚弱（额外效果在 CombatView） */
const 深海粘液: CardData = {
  id: 'enemy_kraken_deep_sea_slime',
  name: '深海粘液',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.8, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '造成0.8倍点数伤害，施加0.5倍点数中毒；若对手处于束缚状态，额外施加1层虚弱',
};

/** 墨汁幻境：消耗2，施加3层中毒与1层视野模糊 */
const 墨汁幻境: CardData = {
  id: 'enemy_kraken_ink_illusion',
  name: '墨汁幻境',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'fixed', fixedValue: 3 },
    { kind: 'apply_buff', effectType: EffectType.MEMORY_FOG, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加3层中毒与1层视野模糊',
};

/** 水牢禁锢：消耗8，点数*3，造成0.4倍点数伤害，施加1倍点数寒冷与1层禁言 */
const 水牢禁锢: CardData = {
  id: 'enemy_kraken_water_prison',
  name: '水牢禁锢',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '稀有',
  manaCost: 8,
  calculation: { multiplier: 3.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.4, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数*3，造成0.4倍点数伤害，施加1倍点数寒冷与1层禁言',
};

/** 丝线侵蚀：法力汲取3，拼点失败后施加3层侵蚀（额外效果在 CombatView） */
const 丝线侵蚀: CardData = {
  id: 'enemy_doll_silk_corrosion',
  name: '丝线侵蚀',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  manaDrain: 3,
  description: '法力汲取3，拼点失败后施加3层侵蚀',
};

/** 丝线接管：消耗4，点数*1.5，施加5层侵蚀与2层虚弱；目标每有8层侵蚀则额外施加1层被操控（额外效果在 CombatView） */
const 丝线接管: CardData = {
  id: 'enemy_doll_silk_takeover',
  name: '丝线接管',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'fixed', fixedValue: 5 },
    { kind: 'apply_buff', effectType: EffectType.WEAKEN, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '消耗4，点数*1.5，施加5层侵蚀与2层虚弱；目标每有8层侵蚀则额外施加1层被操控',
};

/** 定格·清醒人偶：消耗8，点数*2，施加0.7倍点数侵蚀与1层眩晕 */
const 定格清醒人偶: CardData = {
  id: 'enemy_doll_frozen_awake_puppet',
  name: '定格·清醒人偶',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 8,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 0.7 },
    { kind: 'apply_buff', effectType: EffectType.STUN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '消耗8，点数*2，施加0.7倍点数侵蚀与1层眩晕',
};

/** 感官同步：获得1层共损、自修复与不屈 */
const 感官同步: CardData = {
  id: 'enemy_doll_sensory_sync',
  name: '感官同步',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CO_DAMAGE, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.SELF_REPAIR, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.INDOMITABLE, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '获得1层共损、自修复与不屈',
};

/** 木偶舞步：闪避，若闪避成功或对方跳过回合则清除自身所有元素debuff */
const 木偶舞步: CardData = {
  id: 'enemy_doll_mannequin_step',
  name: '木偶舞步',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'cleanse',
      target: 'self',
      valueMode: 'fixed',
      fixedValue: 0,
      cleanseTypes: [EffectType.COLD, EffectType.BURN, EffectType.POISON, EffectType.BLEED, EffectType.SHOCK],
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合则清除自身所有元素debuff',
};

/** 提线舞步：闪避，若闪避成功或对方跳过回合则反击造成1倍点数的侵蚀 */
const 提线舞步: CardData = {
  id: 'enemy_doll_string_step',
  name: '提线舞步',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合则反击造成1倍点数的侵蚀',
};

/** 潜伏：给自己添加1层伏击 */
const 潜伏: CardData = {
  id: 'enemy_vinewalker_lurk',
  name: '潜伏',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.AMBUSH, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '给自己添加1层伏击',
};

/** 闪电伏击：造成1倍点数伤害，且本场首次使用时点数+4（结算逻辑在 CombatView） */
const 闪电伏击: CardData = {
  id: 'enemy_vinewalker_lightning_ambush',
  name: '闪电伏击',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害，若这是本次战斗首次使用该牌，则点数+4',
};

/** 麻痹毒素：造成0.5倍点数伤害并施加1倍点数的寒冷与电击 */
const 麻痹毒素: CardData = {
  id: 'enemy_vinewalker_paralytic_toxin',
  name: '麻痹毒素',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '造成0.5倍点数伤害并施加1倍点数的寒冷与电击',
};

/** 润滑收缩：闪避，若闪避成功或对方跳过回合，则为自身施加1倍点数的蓄力 */
const 润滑收缩: CardData = {
  id: 'enemy_vinewalker_lubricated_shrink',
  name: '润滑收缩',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.CHARGE,
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，若闪避成功或对方跳过回合，则为自身施加1倍点数的蓄力',
};

/** 液化渗透：施加3层侵蚀与1层束缚 */
const 液化渗透: CardData = {
  id: 'enemy_springspirit_liquefied_infiltration',
  name: '液化渗透',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'fixed', fixedValue: 3 },
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '施加3层侵蚀与1层束缚',
};

/** 体内操控：将对方侵蚀翻倍，最多增加10（结算逻辑在 CombatView） */
const 体内操控: CardData = {
  id: 'enemy_springspirit_internal_manipulation',
  name: '体内操控',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '将对方的侵蚀翻倍，最多增加10',
};

/** 不死凝聚：清除自身随机一种元素debuff并回复1倍点数生命（结算逻辑在 CombatView） */
const 不死凝聚: CardData = {
  id: 'enemy_springspirit_undead_condense',
  name: '不死凝聚',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '清除自身随机一种元素debuff并回复1倍点数生命',
};

/** 无声渗入：闪避，闪避成功后为对手增加2层侵蚀 */
const 无声渗入: CardData = {
  id: 'enemy_springspirit_silent_infiltration',
  name: '无声渗入',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'apply_buff',
      effectType: EffectType.CORROSION,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 2,
    },
  ],
  description: '闪避，闪避成功后为对手增加2层侵蚀',
};

/** 大地精华：诅咒，打出后自身增加2点侵蚀，连击，过牌，移除 */
const 大地精华: CardData = {
  id: 'enemy_undine_earth_essence',
  name: '大地精华',
  type: CardType.CURSE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: true, purgeOnUse: true },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '打出后自身增加2点侵蚀，连击，过牌，移除',
};

/** 慈爱之鞭：造成0.5倍点数伤害并施加3层侵蚀 */
const 慈爱之鞭: CardData = {
  id: 'enemy_undine_loving_whip',
  name: '慈爱之鞭',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'fixed', fixedValue: 3 },
  ],
  description: '造成0.5倍点数的伤害并施加3层侵蚀',
};

/** 溺爱之拥：造成1倍点数伤害并施加1层束缚 */
const 溺爱之拥: CardData = {
  id: 'enemy_undine_doting_embrace',
  name: '溺爱之拥',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '造成1倍点数的伤害并施加1层束缚',
};

/** 精华灌注：消耗1MP，施加1倍点数侵蚀并插入大地精华 */
const 精华灌注: CardData = {
  id: 'enemy_undine_essence_infusion',
  name: '精华灌注',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 1,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, insertCardsToEnemyDeck: ['大地精华'] },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '施加1倍点数侵蚀，并插入“大地精华”',
};

/** 精神同化：消耗5MP，点数*2，施加1倍点数侵蚀 */
const 精神同化: CardData = {
  id: 'enemy_undine_psychic_assimilation',
  name: '精神同化',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 5,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CORROSION, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数*2，施加1倍点数的侵蚀',
};

/** 大地原液：回复2倍点数生命，清除自身元素debuff，并为双方施加1层生命回复 */
const 大地原液: CardData = {
  id: 'enemy_undine_earth_liquid',
  name: '大地原液',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'heal', target: 'self', valueMode: 'point_scale', scale: 2.0 },
    {
      kind: 'cleanse',
      target: 'self',
      valueMode: 'fixed',
      fixedValue: 0,
      cleanseTypes: [EffectType.COLD, EffectType.BURN, EffectType.POISON, EffectType.BLEED, EffectType.SHOCK],
    },
    { kind: 'apply_buff', effectType: EffectType.REGEN, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.REGEN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '为自身回复2倍点数的生命值，清除自身所有元素debuff并为双方赋予1层生命回复',
};

/** 主母的邀请：造成0.5倍点数伤害并施加4层中毒 */
const 主母的邀请: CardData = {
  id: 'enemy_mata_matriarch_invitation',
  name: '主母的邀请',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'fixed', fixedValue: 4 },
  ],
  description: '造成0.5倍点数伤害并施加4层中毒',
};

/** 裙下触手：点数+2，造成0.4倍点数伤害，施加1层束缚与1倍点数中毒 */
const 裙下触手: CardData = {
  id: 'enemy_mata_under_skirt_tentacle',
  name: '裙下触手',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 0.4, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
    { kind: 'apply_buff', effectType: EffectType.POISON, target: 'enemy', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+2，造成0.4倍点数伤害、1层束缚与1倍点数的中毒',
};

/** 菌群修复：清空对方中毒量，并按清空层数转化治疗与生命上限削减（结算逻辑在 CombatView） */
const 菌群修复: CardData = {
  id: 'enemy_mata_fungal_repair',
  name: '菌群修复',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '清空对方的中毒量，每清空2层则为自身回复2点血量并为对方施加1层生命上限削减',
};

/** 虚伪笑容：闪避，若闪避成功或对方跳过回合后，为自己施加2倍点数的蓄力 */
const 虚伪笑容: CardData = {
  id: 'enemy_mata_false_smile',
  name: '虚伪笑容',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.CHARGE,
      target: 'self',
      valueMode: 'point_scale',
      scale: 2.0,
    },
  ],
  description: '闪避，闪避成功或对方跳过回合后，为自己施加2倍点数的蓄力',
};

/** 植物统御：造成0.5倍点数伤害并施加99层束缚 */
const 植物统御: CardData = {
  id: 'enemy_rose_plant_dominion',
  name: '植物统御',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 99,
    },
  ],
  description: '造成0.5倍点数伤害并施加99层束缚',
};

/** 王志鞭挞：造成1倍点数伤害，若目标有束缚则伤害+2（结算逻辑在 CombatView） */
const 王志鞭挞: CardData = {
  id: 'enemy_rose_wangzhi_whip',
  name: '王志鞭挞',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数的伤害，若目标有束缚，则伤害+2',
};

/** 血染：造成1倍点数伤害，若目标有束缚则回复1倍点数生命（结算逻辑在 CombatView） */
const 血染: CardData = {
  id: 'enemy_rose_life_drain',
  name: '血染',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数的伤害，若目标有束缚，则回复自身1倍点数的生命',
};

/** 花蜜调教：获得1倍点数护甲，若目标有束缚则施加1倍点数中毒（结算逻辑在 CombatView） */
const 花蜜调教: CardData = {
  id: 'enemy_rose_nectar_discipline',
  name: '花蜜调教',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '获得1倍点数的护甲，若目标有束缚，则赋予目标1倍点数的中毒',
};

/** 禁言术：消耗1MP，造成0.5倍点数伤害并施加1层禁言 */
const 禁言术: CardData = {
  id: 'enemy_ursula_silence_spell',
  name: '禁言术',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 1,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成0.5倍点数的伤害并施加1层“禁言”',
};

/** 淫纹拓印：消耗6MP，点数*1.5，造成0.2倍伤害，5连击，再施加0.5倍点数易伤 */
const 淫纹拓印: CardData = {
  id: 'enemy_ursula_lust_imprint',
  name: '淫纹拓印',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 6,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.2, scaleAddition: 0 },
  hitCount: 5,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '点数*1.5，造成0.2倍伤害，5连击。再施加0.5倍点数的“易伤”',
};

/** 束缚法：造成0.8倍点数伤害并施加3层束缚 */
const 束缚法: CardData = {
  id: 'enemy_ursula_binding_law',
  name: '束缚法',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.8, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 3,
    },
  ],
  description: '造成0.8倍点数的伤害并施加3层束缚',
};

/** 教鞭惩罚：点数+2，造成1倍点数伤害；若目标有束缚则额外施加0.5倍点数易伤（条件部分在 CombatView） */
const 教鞭惩罚: CardData = {
  id: 'enemy_ursula_whip_punish',
  name: '教鞭惩罚',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 2 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+2，造成1倍点数的伤害；若敌人有“束缚”则额外施加0.5倍点数的“易伤”',
};

/** 言出法随：施加0.5倍点数的电击与1层禁言 */
const 言出法随: CardData = {
  id: 'enemy_ursula_commandment',
  name: '言出法随',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.SHOCK, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
    { kind: 'apply_buff', effectType: EffectType.SILENCE, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '施加0.5倍点数的“电击”与1层“禁言”',
};

/** 依附：造成1倍点数伤害并施加1层束缚 */
const 依附: CardData = {
  id: 'enemy_floating_page_attach',
  name: '依附',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'apply_buff',
      effectType: EffectType.BIND,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '造成1倍点数伤害与1层束缚',
};

/** 感官灌输：消耗4MP，点数*1.5，造成0.5倍点数伤害并附加等同于目标侵蚀层数的中毒（结算逻辑在 CombatView） */
const 感官灌输: CardData = {
  id: 'enemy_floating_page_sensory_infusion',
  name: '感官灌输',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.5，造成0.5倍点数伤害，并施加等同于目标侵蚀层数的中毒',
};

/** 强制代入：消耗2MP，点数+1，造成1.5倍伤害；若目标拥有束缚则附加1层敌意隐藏（结算逻辑在 CombatView） */
const 强制代入: CardData = {
  id: 'enemy_floating_page_forced_immersion',
  name: '强制代入',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+1，造成1.5倍伤害，若目标拥有束缚则附加1层敌意隐藏',
};

/** 胆小：点数-1，闪避，若闪避成功则增加1点最大骰子值（结算逻辑在 CombatView） */
const 胆小: CardData = {
  id: 'enemy_inkmouse_cowardice',
  name: '胆小',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数-1，闪避，闪避成功后增加1点骰子最大值',
};

/** 逃窜：点数-1，闪避，若闪避成功则逃离（逃离逻辑在 CombatView） */
const 逃窜: CardData = {
  id: 'enemy_inkmouse_runaway',
  name: '逃窜',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数-1，闪避，若闪避成功则逃离',
};

/** 墨水爆裂：消耗2MP，造成3点伤害；若发生拼点则拼点时施加3层中毒（拼点效果在 CombatView） */
const 墨水爆裂: CardData = {
  id: 'enemy_inkmouse_ink_burst',
  name: '墨水爆裂',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 3 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_clash'],
      kind: 'apply_buff',
      effectType: EffectType.POISON,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 3,
    },
  ],
  description: '造成3点伤害，若发生拼点则拼点时施加3层中毒',
};

/** 液化再生：自身增加1层生命上限削减与0.5倍点数的群集 */
const 液化再生: CardData = {
  id: 'enemy_inkmouse_liquefy_regen',
  name: '液化再生',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.MAX_HP_REDUCTION, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.SWARM, target: 'self', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '自身增加1层生命上限削减与0.5倍点数的群集',
};

/** 粘液闪避：闪避，若闪避成功则回复1倍点数生命 */
const 粘液闪避: CardData = {
  id: 'enemy_slime_dodge',
  name: '粘液闪避',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success'],
      kind: 'heal',
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0,
    },
  ],
  description: '闪避，闪避成功后回复1倍点数生命',
};

/** 回复 — 回复自身掷出点数等量的血量 */
const 回复: CardData = {
  id: 'enemy_heal',
  name: '回复',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      kind: 'heal',
      target: 'self',
      valueMode: 'point_scale',
      scale: 1.0, // 回复量 = FinalPoint * 1.0
    },
  ],
  description: '回复1倍点数的生命值',
};

/** 炼金废料：诅咒卡，污染牌库并附带抽牌 */
const 炼金废料: CardData = {
  id: 'curse_alchemy_waste',
  name: '炼金废料',
  type: CardType.CURSE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -2 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: true },
  cardEffects: [],
  description: '点数-2，连击，过牌',
};

/** 惑心咒：开局仅使用一次，为对手施加虚实不明与敌意隐藏（结算逻辑在 CombatView） */
const 惑心咒: CardData = {
  id: 'enemy_muxinlan_cunning',
  name: '惑心咒',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '为对手施加1层虚实不明与1层敌意隐藏',
};

/** 强制收购：造成0.5倍最终点数的伤害，销毁 */
const 强制收购: CardData = {
  id: 'enemy_muxinlan_forced_acquisition',
  name: '强制收购',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false, destroyOnClashWin: true },
  cardEffects: [],
  description: '造成0.5倍最终点数的伤害，销毁',
};

/** 清算：点数*2，移除对方所有元素debuff并按层数造成真实伤害（结算逻辑在 CombatView） */
const 清算: CardData = {
  id: 'enemy_muxinlan_liquidation',
  name: '清算',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*2，移除对方所有元素debuff，每移除1层造成2点真实伤害',
};

/** 不稳定试剂：点数*1.5，造成0.4倍最终点数伤害，3连击；每次命中随机附加一种元素debuff 1层（结算逻辑在 CombatView） */
const 不稳定试剂: CardData = {
  id: 'enemy_muxinlan_unstable_reagent',
  name: '不稳定试剂',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.4, scaleAddition: 0 },
  hitCount: 3,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.5，造成0.4倍最终点数伤害，3连击；每次命中随机附加1层元素debuff',
};

/** 液态火：施加1倍点数寒冷，然后将对方所有寒冷按1:1转化为燃烧（结算逻辑在 CombatView） */
const 液态火: CardData = {
  id: 'enemy_muxinlan_liquid_fire',
  name: '液态火',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '施加1倍点数寒冷，然后将对方所有寒冷按1:1转化为燃烧',
};

/** 活化粘液：点数+3，随机将对方一种已有元素debuff层数翻倍（结算逻辑在 CombatView） */
const 活化粘液: CardData = {
  id: 'enemy_muxinlan_activated_slime',
  name: '活化粘液',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 3 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+3，随机将对方一个已有元素debuff层数翻倍',
};

/** 等价交换：点数+1，向对方牌库插入炼金废料，并按2倍点数回复自身生命 */
const 等价交换: CardData = {
  id: 'enemy_muxinlan_take_it',
  name: '等价交换',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, insertCardsToEnemyDeck: ['炼金废料', '炼金废料'] },
  cardEffects: [{ kind: 'heal', valueMode: 'point_scale', scale: 2.0, target: 'self' }],
  description: '点数+1，插入两张炼金废料到对方牌库，同时回复2倍点数的生命',
};

/** 溢价护盾：增加自身1层共损与x点魔力，x为对方魔力值（结算逻辑在 CombatView） */
const 溢价护盾: CardData = {
  id: 'enemy_muxinlan_premium_shield',
  name: '溢价护盾',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '增加自身1层共损与x点魔力，x为对方魔力值',
};

/** 设下埋伏：点数*0.5，闪避。若闪避成功或对方跳过回合，则为对方施加一层法力枯竭 */
const 设下埋伏: CardData = {
  id: 'enemy_muxinlan_set_ambush',
  name: '设下埋伏',
  type: CardType.DODGE,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 0.5, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    {
      triggers: ['on_dodge_success', 'on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.MANA_DRAIN,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数*0.5，闪避。若闪避成功或对方跳过回合，则为对方施加1层法力枯竭',
};

// ── 卡牌注册表 ──────────────────────────────────────────────────

/**
 * 全部卡牌以 name 为键存储。
 * 后续新增卡牌只需在此处添加并注册即可。
 */
/** 空白：连击，过牌 */
const 空白: CardData = {
  id: 'basic_blank',
  name: '空白',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: true },
  cardEffects: [],
  description: '连击，过牌',
};

/** 法力涌动：回复1倍点数的魔力，获得2层坚固 */
const 法力涌动: CardData = {
  id: 'basic_mana_surge',
  name: '法力涌动',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'restore_mana', target: 'self', valueMode: 'point_scale', scale: 1.0 },
    { kind: 'apply_buff', effectType: EffectType.STURDY, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '回复1倍点数的魔力，获得2层坚固',
};

/** 蓄力：点数+1，获得1倍点数的蓄力 */
const 蓄力: CardData = {
  id: 'basic_charge',
  name: '蓄力',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CHARGE, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数+1，获得1倍点数的蓄力',
};

/** 守护：获得1倍点数护甲，本轮护甲不触发减半 */
const 守护: CardData = {
  id: 'basic_guard',
  name: '守护',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '获得1倍点数护甲，本轮护甲不触发减半',
};

/** 魔力扩容：点数-1，本场战斗最大骰子点数+1，获得1倍点数护甲 */
const 魔力扩容: CardData = {
  id: 'basic_mana_expand',
  name: '魔力扩容',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '点数-1，本场战斗最大骰子点数+1，获得1倍点数护甲',
};

/** 驱散：回复2点生命，清除自身元素负面状态 */
const 驱散: CardData = {
  id: 'basic_dispel',
  name: '驱散',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'heal', target: 'self', valueMode: 'fixed', fixedValue: 2 },
    {
      kind: 'cleanse',
      target: 'self',
      valueMode: 'fixed',
      fixedValue: 0,
      cleanseTypes: [EffectType.COLD, EffectType.BURN, EffectType.POISON, EffectType.BLEED, EffectType.SHOCK],
    },
  ],
  description: '回复2点生命，清除自身元素负面状态',
};

/** 元素攻击：造成1点伤害，施加1倍点数的随机元素负面状态 */
const 元素攻击: CardData = {
  id: 'basic_element_attack',
  name: '元素攻击',
  type: CardType.MAGIC,
  category: '基础',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 1 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1点伤害，施加1倍点数的随机元素负面状态',
};

/** 闪光术：造成1倍点数伤害，无视闪避，群攻 */
const 闪光术: CardData = {
  id: 'basic_flash_spell',
  name: '闪光术',
  type: CardType.MAGIC,
  category: '基础',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害，无视闪避，群攻',
  ignoreDodge: true,
  swarmAttack: true,
};

/** 尖锐攻击：若自身为卡组中仅有的物理卡牌，则点数+3。造成1倍点数伤害。 */
const 尖锐攻击: CardData = {
  id: 'basic_sharp_attack',
  name: '尖锐攻击',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '若自身为卡组中仅有的物理卡牌，则点数+3。造成1倍点数伤害。',
};

/** 锯齿攻击：造成1倍点数伤害，每次使用后锯齿攻击在本场战斗的点数+2，上限+4 */
const 锯齿攻击: CardData = {
  id: 'basic_jagged_attack',
  name: '锯齿攻击',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害，每次使用后锯齿攻击在本场战斗的点数+2，上限+4',
};

/** 袭击：若这是本场战斗首次使用该卡牌，则点数+4。造成1倍点数伤害。 */
const 袭击: CardData = {
  id: 'basic_raid_attack',
  name: '袭击',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '若这是本场战斗首次使用该卡牌，则点数+4。造成1倍点数伤害。',
};

/** 柔劲：点数-10后再*-1，造成1倍点数伤害 */
const 柔劲: CardData = {
  id: 'basic_soft_force',
  name: '柔劲',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: -1, addition: 10 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数-10后再*-1，造成1倍点数伤害',
};

/** 针对性斩击：若对方为领主，则点数+4。造成1倍点数伤害。 */
const 针对性斩击: CardData = {
  id: 'basic_targeted_slash',
  name: '针对性斩击',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '若对方为领主，则点数+4。造成1倍点数伤害。',
};

/** 潜行：若手牌中没有物理或魔法卡牌，则点数-3。闪避。 */
const 潜行: CardData = {
  id: 'basic_stealth',
  name: '潜行',
  type: CardType.DODGE,
  category: '基础',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '若手牌中没有物理或魔法卡牌，则点数-3。闪避。',
};

/** 虚弱魔法：点数-1，根据我方点数减少对方等量点数，连击 */
const 虚弱魔法: CardData = {
  id: 'basic_weak_magic',
  name: '虚弱魔法',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数-1，根据我方点数减少对方等量点数，连击',
};

/** 瞬发盾：获得1倍点数护甲，连击，重掷 */
const 瞬发盾: CardData = {
  id: 'basic_instant_shield',
  name: '瞬发盾',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'self', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '获得1倍点数护甲，连击，重掷',
};

/** 浓缩精华：获得1倍点数蓄力，连击，重掷 */
const 浓缩精华: CardData = {
  id: 'basic_condensed_essence',
  name: '浓缩精华',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'self', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.CHARGE, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '获得1倍点数蓄力，连击，重掷',
};

/** 空白的空白：点数+1，连击，过牌。本回合内每出1张牌，点数+1 */
const 空白的空白: CardData = {
  id: 'basic_blank_of_blank',
  name: '空白的空白',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: true },
  cardEffects: [],
  description: '点数+1，连击，过牌。本回合内每出1张牌，点数+1',
};

/** 巨石魔法：点数*2.5，造成0.6倍点数伤害，群攻 */
const 巨石魔法: CardData = {
  id: 'basic_boulder_magic',
  name: '巨石魔法',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 2.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.6, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*2.5，造成0.6倍点数伤害，群攻',
  swarmAttack: true,
};

/** 粘液斩击：增加点数直至超过对方最终点数，造成1倍点数伤害 */
const 粘液斩击: CardData = {
  id: 'basic_slime_axe',
  name: '粘液斩击',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '增加点数直至超过对方最终点数，造成1倍点数伤害',
};

/** 生死决断：若投掷点数为4，则点数*4，造成1倍点数伤害 */
const 生死决断: CardData = {
  id: 'basic_life_death_judgement',
  name: '生死决断',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '若投掷点数为4，则点数*4，造成1倍点数伤害',
};

/** 猩红镰刀：本场战斗中第一次使用时，点数*2。造成1倍点数伤害，施加4层流血 */
const 猩红镰刀: CardData = {
  id: 'basic_scarlet_scythe',
  name: '猩红镰刀',
  type: CardType.PHYSICAL,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'fixed', fixedValue: 4 },
  ],
  description: '本场战斗中第一次使用时，点数*2。造成1倍点数伤害，施加4层流血',
};

/** 认知互换：首次使用时，将自身所有负面状态转移给对方。点数+3，获得1倍点数护甲。 */
const 认知互换: CardData = {
  id: 'basic_cognitive_swap',
  name: '认知互换',
  type: CardType.FUNCTION,
  category: '基础',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 3 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '本场战斗中第一次使用时，将自身所有负面状态转移给对方。点数+3，获得1倍点数护甲。',
};

/** 杖击：最终点数不会低于原始点数，造成1倍点数伤害，回复2点魔力 */
const 杖击: CardData = {
  id: 'modao_staff_strike',
  name: '杖击',
  type: CardType.PHYSICAL,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [{ kind: 'restore_mana', target: 'self', valueMode: 'fixed', fixedValue: 2 }],
  description: '最终点数不会低于原始点数，造成1倍点数伤害，回复2点魔力',
};

/** 魔差：造成1倍点数伤害，伤害额外增加本回合魔力与上回合魔力之差的绝对值 */
const 魔差: CardData = {
  id: 'modao_magic_delta',
  name: '魔差',
  type: CardType.PHYSICAL,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害，伤害额外增加本回合魔力与上回合魔力之差的绝对值',
};

/** 魔力球：消耗6MP，点数*2，造成1倍点数伤害。若拼点成功则返还6点魔力 */
const 魔力球: CardData = {
  id: 'modao_mana_orb',
  name: '魔力球',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 6,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗6MP，点数*2，造成1倍点数伤害。若拼点成功则返还6点魔力',
};

/** 法力汲取：法力汲取1倍点数 */
const 法力汲取: CardData = {
  id: 'modao_mana_drain',
  name: '法力汲取',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  manaDrain: { mode: 'point_scale', scale: 1.0 },
  description: '法力汲取1倍点数',
};

/** 魔力亲和：获得0.5倍点数护甲，1层增伤与1层魔力源泉 */
const 魔力亲和: CardData = {
  id: 'modao_mana_affinity',
  name: '魔力亲和',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 0.5 },
    { kind: 'apply_buff', effectType: EffectType.DAMAGE_BOOST, target: 'self', valueMode: 'fixed', fixedValue: 1 },
    { kind: 'apply_buff', effectType: EffectType.MANA_SPRING, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '获得0.5倍点数护甲，1层增伤与1层魔力源泉',
};

/** 注能：获得2层增伤1回合，连击 */
const 注能: CardData = {
  id: 'modao_note_energy',
  name: '注能',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [],
  description: '获得2层增伤1回合，连击',
};

/** 风筝：闪避，下回合使用法术牌时点数+2 */
const 风筝: CardData = {
  id: 'modao_kite',
  name: '风筝',
  type: CardType.DODGE,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '闪避，下回合使用法术牌时点数+2',
};

/** 符文大剑：牌库中每有1张法术牌点数+2，造成1倍点数伤害 */
const 符文大剑: CardData = {
  id: 'modao_rune_greatsword',
  name: '符文大剑',
  type: CardType.PHYSICAL,
  category: '魔导',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '牌库中每有1张法术牌点数+2，造成1倍点数伤害',
};

/** 大狂风：消耗2MP，点数*0.5，造成（7-点数）伤害，额外消耗自身至多16MP，每消耗2MP追加1次伤害 */
const 大狂风: CardData = {
  id: 'modao_great_gale',
  name: '大狂风',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '稀有',
  manaCost: 2,
  calculation: { multiplier: 0.5, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗2MP，点数*0.5，造成（7-点数）伤害，额外消耗自身至多16MP，每消耗2MP追加1次伤害',
};

/** 大毁灭魔法：消耗12MP，点数*3，增伤具有五倍效果，造成1倍点数伤害，群攻 */
const 大毁灭魔法: CardData = {
  id: 'modao_big_destruction',
  name: '大毁灭魔法',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '稀有',
  manaCost: 12,
  calculation: { multiplier: 3.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  swarmAttack: true,
  description: '消耗12MP，点数*3，增伤具有五倍效果，造成1倍点数伤害，群攻',
};

/** 深海之约：回复1倍点数魔力，连击，过牌 */
const 深海之约: CardData = {
  id: 'modao_deep_sea_pact',
  name: '深海之约',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: true },
  cardEffects: [{ kind: 'restore_mana', target: 'self', valueMode: 'point_scale', scale: 1.0 }],
  description: '回复1倍点数魔力，连击，过牌',
};

/** 棱镜魔法：回复1.5倍点数魔力，本回合被法术牌击中时免疫此伤害并反弹 */
const 棱镜魔法: CardData = {
  id: 'modao_prism_magic',
  name: '棱镜魔法',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '稀有',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [{ kind: 'restore_mana', target: 'self', valueMode: 'point_scale', scale: 1.5 }],
  description: '回复1.5倍点数魔力，本回合被法术牌击中时免疫此伤害并反弹',
};

Object.assign(炎狱判决, {
  rarity: '稀有',
  manaCost: 2,
  description: '敌方每有1层燃烧点数额外+1，造成1倍最终点数伤害',
});

Object.assign(临界沸腾, {
  description: '以2:1比例消耗目标寒冷/燃烧，并造成8倍所消耗燃烧层数的真实伤害',
});

const 冰锥: CardData = {
  id: 'yanhan_ice_spike',
  name: '冰锥',
  type: CardType.PHYSICAL,
  category: '严寒',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '对方每有2点寒冷点数额外+1，清除对方的寒冷，造成1倍最终点数伤害',
};

const CARD_REGISTRY: ReadonlyMap<string, CardData> = new Map<string, CardData>([
  [空白.name, 空白],
  [法力涌动.name, 法力涌动],
  [蓄力.name, 蓄力],
  [守护.name, 守护],
  [魔力扩容.name, 魔力扩容],
  [驱散.name, 驱散],
  [元素攻击.name, 元素攻击],
  [闪光术.name, 闪光术],
  [尖锐攻击.name, 尖锐攻击],
  [锯齿攻击.name, 锯齿攻击],
  [袭击.name, 袭击],
  [柔劲.name, 柔劲],
  [针对性斩击.name, 针对性斩击],
  [潜行.name, 潜行],
  [虚弱魔法.name, 虚弱魔法],
  [瞬发盾.name, 瞬发盾],
  [浓缩精华.name, 浓缩精华],
  [空白的空白.name, 空白的空白],
  [巨石魔法.name, 巨石魔法],
  [粘液斩击.name, 粘液斩击],
  [生死决断.name, 生死决断],
  [猩红镰刀.name, 猩红镰刀],
  [认知互换.name, 认知互换],
  [杖击.name, 杖击],
  [魔差.name, 魔差],
  [魔力球.name, 魔力球],
  [法力汲取.name, 法力汲取],
  [魔力亲和.name, 魔力亲和],
  [注能.name, 注能],
  [风筝.name, 风筝],
  [符文大剑.name, 符文大剑],
  [大狂风.name, 大狂风],
  [大毁灭魔法.name, 大毁灭魔法],
  [深海之约.name, 深海之约],
  [棱镜魔法.name, 棱镜魔法],
  [普通物理攻击.name, 普通物理攻击],
  [普通物理攻击加1.name, 普通物理攻击加1],
  [普通物理攻击加2.name, 普通物理攻击加2],
  [普通物理攻击加4.name, 普通物理攻击加4],
  [双刃剑.name, 双刃剑],
  [普通魔法攻击.name, 普通魔法攻击],
  [聚焦魔法攻击.name, 聚焦魔法攻击],
  [普通护盾.name, 普通护盾],
  [压势.name, 压势],
  [普通闪避.name, 普通闪避],
  [休眠.name, 休眠],
  [侧身闪避.name, 侧身闪避],
  [存在消除.name, 存在消除],
  [吐纳法.name, 吐纳法],
  [虚实步法.name, 虚实步法],
  [镜面幻像.name, 镜面幻像],
  [魔力偏移.name, 魔力偏移],
  [零域闪步.name, 零域闪步],
  [魔剑.name, 魔剑],
  [导路采样.name, 导路采样],
  [织式备份.name, 织式备份],
  [魔压提纯.name, 魔压提纯],
  [魔力飓风.name, 魔力飓风],
  [回声回灌.name, 回声回灌],
  [逆相咏唱.name, 逆相咏唱],
  [奥术裂枪.name, 奥术裂枪],
  [魔导序曲.name, 魔导序曲],
  [法环坍缩.name, 法环坍缩],
  [棱镜贯流.name, 棱镜贯流],
  [导能屏障.name, 导能屏障],
  [魔力轰炸.name, 魔力轰炸],
  [涌流.name, 涌流],
  [透支魔力.name, 透支魔力],
  [魔甲.name, 魔甲],
  [魔力增强.name, 魔力增强],
  [火花烙印.name, 火花烙印],
  [焦油泼洒.name, 焦油泼洒],
  [焚风术.name, 焚风术],
  [烧伤.name, 烧伤],
  [烈焰打击.name, 烈焰打击],
  [灼魂飞弹.name, 灼魂飞弹],
  [焚身突刺.name, 焚身突刺],
  [爆燃术.name, 爆燃术],
  [炎狱判决.name, 炎狱判决],
  [炼狱波及.name, 炼狱波及],
  [临界沸腾.name, 临界沸腾],
  [炭化转化.name, 炭化转化],
  [大日焚.name, 大日焚],
  [火遁.name, 火遁],
  [霜痕斩.name, 霜痕斩],
  [寒域校准.name, 寒域校准],
  [折光回避.name, 折光回避],
  [回授冻轮.name, 回授冻轮],
  [冷室复写.name, 冷室复写],
  [温差效应.name, 温差效应],
  [压差循环.name, 压差循环],
  [冷源整流.name, 冷源整流],
  [零界裁定.name, 零界裁定],
  [霜爆.name, 霜爆],
  [复咒.name, 复咒],
  [刺络放血.name, 刺络放血],
  [赤潮压制.name, 赤潮压制],
  [疼痛反馈.name, 疼痛反馈],
  [放血.name, 放血],
  [噬血劈斩.name, 噬血劈斩],
  [血池扩容.name, 血池扩容],
  [活性血池.name, 活性血池],
  [裂伤.name, 裂伤],
  [脉搏拳.name, 脉搏拳],
  [生命汲取.name, 生命汲取],
  [驭血术.name, 驭血术],
  [回升.name, 回升],
  [血之刃.name, 血之刃],
  [逆刃.name, 逆刃],
  [血筑.name, 血筑],
  [血债重击.name, 血债重击],
  [赤痕爆裂.name, 赤痕爆裂],
  [血位倒转.name, 血位倒转],
  [血脉迁葬.name, 血脉迁葬],
  [血影回身.name, 血影回身],
  [血幕回避.name, 血幕回避],
  [血契护壁.name, 血契护壁],
  [滑腻触手.name, 滑腻触手],
  [灵巧长舌.name, 灵巧长舌],
  [血盆大口.name, 血盆大口],
  [挤压.name, 挤压],
  [消化.name, 消化],
  [催情鳞粉.name, 催情鳞粉],
  [敏感化标记.name, 敏感化标记],
  [荧光信息素.name, 荧光信息素],
  [群体效应.name, 群体效应],
  [蜜蜂敏感点侦察.name, 蜜蜂敏感点侦察],
  [蜜蜂催情尾针.name, 蜜蜂催情尾针],
  [蜜蜂精准采集.name, 蜜蜂精准采集],
  [高压喷射.name, 高压喷射],
  [渗透.name, 渗透],
  [敏感化.name, 敏感化],
  [扫描.name, 扫描],
  [羞耻灼烧.name, 羞耻灼烧],
  [升空躲避.name, 升空躲避],
  [记忆投影.name, 记忆投影],
  [附身提线.name, 附身提线],
  [羞耻进食.name, 羞耻进食],
  [黑镜规避.name, 黑镜规避],
  [敏感点开发.name, 敏感点开发],
  [固定实验体.name, 固定实验体],
  [学术洗脑.name, 学术洗脑],
  [柔和缠绕.name, 柔和缠绕],
  [三重鞭打.name, 三重鞭打],
  [独占.name, 独占],
  [深海粘液.name, 深海粘液],
  [墨汁幻境.name, 墨汁幻境],
  [水牢禁锢.name, 水牢禁锢],
  [协同实验.name, 协同实验],
  [冷静评估.name, 冷静评估],
  [丝线侵蚀.name, 丝线侵蚀],
  [丝线接管.name, 丝线接管],
  [定格清醒人偶.name, 定格清醒人偶],
  [感官同步.name, 感官同步],
  [木偶舞步.name, 木偶舞步],
  [提线舞步.name, 提线舞步],
  [穿体冲击.name, 穿体冲击],
  [命令低语.name, 命令低语],
  [多体共鸣.name, 多体共鸣],
  [墨潮束缚.name, 墨潮束缚],
  [液膜渗入.name, 液膜渗入],
  [墨幕规避.name, 墨幕规避],
  [淫文刻写.name, 淫文刻写],
  [笔尖缠写.name, 笔尖缠写],
  [敏感批注.name, 敏感批注],
  [羽旋规避.name, 羽旋规避],
  [CHAIR_MIMIC_SILENT_DISGUISE.name, CHAIR_MIMIC_SILENT_DISGUISE],
  [CHAIR_MIMIC_ARMREST_BIND.name, CHAIR_MIMIC_ARMREST_BIND],
  [CHAIR_MIMIC_CUSHION_ASSAULT.name, CHAIR_MIMIC_CUSHION_ASSAULT],
  [CHAIR_MIMIC_BACKREST_LURE.name, CHAIR_MIMIC_BACKREST_LURE],
  [DESK_TENTACLE_TABLE_EDGE_CLING.name, DESK_TENTACLE_TABLE_EDGE_CLING],
  [DESK_TENTACLE_SILENT_ENTANGLE.name, DESK_TENTACLE_SILENT_ENTANGLE],
  [入侵.name, 入侵],
  [凝聚.name, 凝聚],
  [普莉姆拥抱.name, 普莉姆拥抱],
  [普莉姆流体规避.name, 普莉姆流体规避],
  [普莉姆消化性爱抚.name, 普莉姆消化性爱抚],
  [实体分身.name, 实体分身],
  [性爱幻觉.name, 性爱幻觉],
  [信息素.name, 信息素],
  [迷雾缭绕.name, 迷雾缭绕],
  [精神震荡.name, 精神震荡],
  [恶作剧.name, 恶作剧],
  [巨大化投影.name, 巨大化投影],
  [血刺丛生.name, 血刺丛生],
  [凝血成兵.name, 凝血成兵],
  [蝙蝠突袭.name, 蝙蝠突袭],
  [沸血律动.name, 沸血律动],
  [血液停滞.name, 血液停滞],
  [血雾化身.name, 血雾化身],
  [静肃宣告.name, 静肃宣告],
  [纸刃切割.name, 纸刃切割],
  [哑剧牵引.name, 哑剧牵引],
  [失声.name, 失声],
  [静夜规避.name, 静夜规避],
  [沉默终章.name, 沉默终章],
  [淫墨誓约.name, 淫墨誓约],
  [墨痕敕令.name, 墨痕敕令],
  [触手缠绕.name, 触手缠绕],
  [强制书写.name, 强制书写],
  [墨池规避.name, 墨池规避],
  [黑潮灌注.name, 黑潮灌注],
  [档案污页.name, 档案污页],
  [欲望检索.name, 欲望检索],
  [钉缚.name, 钉缚],
  [催眠书页.name, 催眠书页],
  [欲望实体化.name, 欲望实体化],
  [审阅规避.name, 审阅规避],
  [终页定论.name, 终页定论],
  [固守.name, 固守],
  [鞭戒.name, 鞭戒],
  [声音支配.name, 声音支配],
  [罚站.name, 罚站],
  [倒刺乱舞.name, 倒刺乱舞],
  [骨鞭缠绕.name, 骨鞭缠绕],
  [折磨循环.name, 折磨循环],
  [狂暴化.name, 狂暴化],
  [震动感知.name, 震动感知],
  [润滑分泌.name, 润滑分泌],
  [渗透攀爬.name, 渗透攀爬],
  [冲撞.name, 冲撞],
  [无感蔓延.name, 无感蔓延],
  [流体包裹.name, 流体包裹],
  [选择性溶解.name, 选择性溶解],
  [催情气体.name, 催情气体],
  [弹性吸附.name, 弹性吸附],
  [虹色漂浮.name, 虹色漂浮],
  [幻象诱导.name, 幻象诱导],
  [幽灵幻象.name, 幽灵幻象],
  [知识低语.name, 知识低语],
  [禁忌知识.name, 禁忌知识],
  [被动增敏.name, 被动增敏],
  [行间诱惑.name, 行间诱惑],
  [墨迹触手.name, 墨迹触手],
  [低语教唆.name, 低语教唆],
  [知识渴望.name, 知识渴望],
  [ABYSS_JELLYFISH_NEURAL_EXCITE_FILAMENT.name, ABYSS_JELLYFISH_NEURAL_EXCITE_FILAMENT],
  [ABYSS_JELLYFISH_CIRCUITOUS.name, ABYSS_JELLYFISH_CIRCUITOUS],
  [ABYSS_JELLYFISH_FULL_WRAP.name, ABYSS_JELLYFISH_FULL_WRAP],
  [ABYSS_JELLYFISH_TOXIN_SECRETION.name, ABYSS_JELLYFISH_TOXIN_SECRETION],
  [束缚丝.name, 束缚丝],
  [传导丝.name, 传导丝],
  [麻痹螯刺.name, 麻痹螯刺],
  [设伏.name, 设伏],
  [STITCHED_SPIDER_PACK_HUNT.name, STITCHED_SPIDER_PACK_HUNT],
  [STITCHED_SPIDER_PRECISE_INJECTION.name, STITCHED_SPIDER_PRECISE_INJECTION],
  [丝线召集.name, 丝线召集],
  [丝线扑倒.name, 丝线扑倒],
  [合力制服.name, 合力制服],
  [弱点侦察.name, 弱点侦察],
  [逻辑分析.name, 逻辑分析],
  [后撤闪避.name, 后撤闪避],
  [完成分析虹膜切替.name, 完成分析虹膜切替],
  [超关节绞杀.name, 超关节绞杀],
  [多重鞭腿.name, 多重鞭腿],
  [尤斯蒂娅肃静宣言.name, 尤斯蒂娅肃静宣言],
  [罪责具现.name, 罪责具现],
  [真言鳞粉.name, 真言鳞粉],
  [精神施压.name, 精神施压],
  [鳞粉结界.name, 鳞粉结界],
  [潜伏.name, 潜伏],
  [闪电伏击.name, 闪电伏击],
  [麻痹毒素.name, 麻痹毒素],
  [润滑收缩.name, 润滑收缩],
  [液化渗透.name, 液化渗透],
  [体内操控.name, 体内操控],
  [不死凝聚.name, 不死凝聚],
  [无声渗入.name, 无声渗入],
  [大地精华.name, 大地精华],
  [慈爱之鞭.name, 慈爱之鞭],
  [溺爱之拥.name, 溺爱之拥],
  [精华灌注.name, 精华灌注],
  [精神同化.name, 精神同化],
  [大地原液.name, 大地原液],
  [主母的邀请.name, 主母的邀请],
  [裙下触手.name, 裙下触手],
  [菌群修复.name, 菌群修复],
  [虚伪笑容.name, 虚伪笑容],
  [植物统御.name, 植物统御],
  [王志鞭挞.name, 王志鞭挞],
  [血染.name, 血染],
  [花蜜调教.name, 花蜜调教],
  [禁言术.name, 禁言术],
  [淫纹拓印.name, 淫纹拓印],
  [束缚法.name, 束缚法],
  [教鞭惩罚.name, 教鞭惩罚],
  [言出法随.name, 言出法随],
  [依附.name, 依附],
  [感官灌输.name, 感官灌输],
  [强制代入.name, 强制代入],
  [胆小.name, 胆小],
  [逃窜.name, 逃窜],
  [墨水爆裂.name, 墨水爆裂],
  [液化再生.name, 液化再生],
  [粘液闪避.name, 粘液闪避],
  [回复.name, 回复],
  [炼金废料.name, 炼金废料],
  [惑心咒.name, 惑心咒],
  [强制收购.name, 强制收购],
  [清算.name, 清算],
  [不稳定试剂.name, 不稳定试剂],
  [液态火.name, 液态火],
  [活化粘液.name, 活化粘液],
  [等价交换.name, 等价交换],
  [溢价护盾.name, 溢价护盾],
  [设下埋伏.name, 设下埋伏],
  [PATROL_BAT_CLAW_REND.name, PATROL_BAT_CLAW_REND],
  [PATROL_BAT_METAL_SCREECH.name, PATROL_BAT_METAL_SCREECH],
  [PATROL_BAT_MARK.name, PATROL_BAT_MARK],
  [PATROL_BAT_FLY_AWAY.name, PATROL_BAT_FLY_AWAY],
  [PATROL_BAT_CIRCLING.name, PATROL_BAT_CIRCLING],
  [SHAME_LEECH_PARASITIC_DRILL.name, SHAME_LEECH_PARASITIC_DRILL],
  [WITNESS_WORM_MENTAL_SHOCK.name, WITNESS_WORM_MENTAL_SHOCK],
  [WITNESS_WORM_RETREAT.name, WITNESS_WORM_RETREAT],
  [SHAME_LEECH_INTERNAL_BREEDING.name, SHAME_LEECH_INTERNAL_BREEDING],
  [SHAME_LEECH_SHAME_AMPLIFY.name, SHAME_LEECH_SHAME_AMPLIFY],
  [PARASITIC_LEECH_CUMULATIVE_APHRO.name, PARASITIC_LEECH_CUMULATIVE_APHRO],
  [BLOOD_BAT_PREDATORY_NIBBLE.name, BLOOD_BAT_PREDATORY_NIBBLE],
  [BLOOD_BAT_ULTRASONIC_STIMULUS.name, BLOOD_BAT_ULTRASONIC_STIMULUS],
  [BLOOD_BAT_SWARM_RESONANCE.name, BLOOD_BAT_SWARM_RESONANCE],
  [BLOOD_BAT_LOW_GLIDE.name, BLOOD_BAT_LOW_GLIDE],
  [BLOOD_SERVANT_OFFERING_SMILE.name, BLOOD_SERVANT_OFFERING_SMILE],
  [BLOOD_SERVANT_INVITATION.name, BLOOD_SERVANT_INVITATION],
  [BLOOD_SERVANT_LURE.name, BLOOD_SERVANT_LURE],
  [NIGHTMARE_STEED_SNIFF.name, NIGHTMARE_STEED_SNIFF],
  [NIGHTMARE_STEED_BRANDED_STOMP.name, NIGHTMARE_STEED_BRANDED_STOMP],
  [NIGHTMARE_STEED_SADDLE_CAPTURE.name, NIGHTMARE_STEED_SADDLE_CAPTURE],
  [NIGHTMARE_STEED_MIST_DUST.name, NIGHTMARE_STEED_MIST_DUST],
  [EXECUTIONER_PUPPET_FACELESS_INTIMIDATION.name, EXECUTIONER_PUPPET_FACELESS_INTIMIDATION],
  [EXECUTIONER_PUPPET_TOOL_SHIFT.name, EXECUTIONER_PUPPET_TOOL_SHIFT],
  [EXECUTIONER_PUPPET_EXECUTION.name, EXECUTIONER_PUPPET_EXECUTION],
  [EXECUTIONER_PUPPET_EVADE.name, EXECUTIONER_PUPPET_EVADE],
  [PUNISHMENT_PUPPET_BONE_WHIP.name, PUNISHMENT_PUPPET_BONE_WHIP],
  [PUNISHMENT_PUPPET_SUCTION_SUPPRESS.name, PUNISHMENT_PUPPET_SUCTION_SUPPRESS],
  [PUNISHMENT_PUPPET_OVERLOAD_EXECUTE.name, PUNISHMENT_PUPPET_OVERLOAD_EXECUTE],
  [SHADOW_JAILER_SHADOW_ASSAULT.name, SHADOW_JAILER_SHADOW_ASSAULT],
  [SHADOW_JAILER_ENFORCEMENT_LOCK.name, SHADOW_JAILER_ENFORCEMENT_LOCK],
  [SHADOW_JAILER_NUMBING_WHIP.name, SHADOW_JAILER_NUMBING_WHIP],
  [SHADOW_JAILER_FORM_SHIFT.name, SHADOW_JAILER_FORM_SHIFT],
  [THORN_CRAWLER_BARBED_GRASP.name, THORN_CRAWLER_BARBED_GRASP],
  [THORN_CRAWLER_NEURAL_PIERCE.name, THORN_CRAWLER_NEURAL_PIERCE],
  [THORN_CRAWLER_TOXIN_PULSE.name, THORN_CRAWLER_TOXIN_PULSE],
  [冰锥.name, 冰锥],
]);

// ── 公共 API ────────────────────────────────────────────────────

/** 根据卡名查找卡牌数据，不存在则返回 undefined */
export function getCardByName(name: string): CardData | undefined {
  return CARD_REGISTRY.get(name);
}

/** 批量将卡名数组转换为 CardData 数组（跳过未找到的卡名） */
export function resolveCardNames(names: string[]): CardData[] {
  return names.map(n => CARD_REGISTRY.get(n)).filter((c): c is CardData => c !== undefined);
}

/** 获取卡牌库中所有卡牌名称 */
export function getAllCardNames(): string[] {
  return [...CARD_REGISTRY.keys()];
}

/** 获取卡牌库中所有卡牌数据 */
export function getAllCards(): CardData[] {
  return [...CARD_REGISTRY.values()];
}
