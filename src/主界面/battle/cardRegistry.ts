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
      scale: 1.0,           // 护甲层数 = FinalPoint * 1.0
    },
  ],
  description: '点数+1，获得1倍点数的护甲',
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

/** 镜面幻像：点数+2，闪避，若闪避成功为自己施加1层结界 */
const 镜面幻像: CardData = {
  id: 'basic_mirror_phantom',
  name: '镜面幻像',
  type: CardType.DODGE,
  category: '基础',
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
  category: '基础',
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

// ── 魔导体系卡牌 ────────────────────────────────────────────────

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

/** 双刃剑：点数+1，0.5倍伤害，2连击 */
const 双刃剑: CardData = {
  id: 'modao_double_blade',
  name: '双刃剑',
  type: CardType.PHYSICAL,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 2,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+1，造成0.5倍点数伤害，2连击',
};

/** 导路采样：点数+1，回复1倍点数魔力 */
const 导路采样: CardData = {
  id: 'modao_route_sampling',
  name: '导路采样',
  type: CardType.FUNCTION,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'restore_mana', target: 'self', valueMode: 'point_scale', scale: 1.0 },
  ],
  description: '回复1倍点数魔力',
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

/** 魔力飓风：造成(12-点数)伤害，并按额外消耗魔力追加攻击次数（结算逻辑在 CombatView） */
const 魔力飓风: CardData = {
  id: 'modao_mana_hurricane',
  name: '魔力飓风',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成(12-点数)伤害；额外消耗自身至多9MP，每消耗3MP追加1次攻击',
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

/** 奥术裂枪：点数*1.5，1倍伤害；MP≥8时额外消耗4MP追加一次1.5倍伤害（结算逻辑在 CombatView） */
const 奥术裂枪: CardData = {
  id: 'modao_arcane_lance',
  name: '奥术裂枪',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.5，造成1倍点数伤害；若当前MP≥8，再消耗4MP追加一次1.5倍伤害',
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

/** 棱镜贯流：0.8倍伤害；按当前MP提高伤害倍率（结算逻辑在 CombatView） */
const 棱镜贯流: CardData = {
  id: 'modao_prism_flow',
  name: '棱镜贯流',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.8, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成0.8倍点数伤害；每有2点当前MP，伤害额外+0.2倍（上限+1.2倍）',
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

/** 魔力轰炸：8MP，点数*2，1倍伤害，3连击 */
const 魔力轰炸: CardData = {
  id: 'modao_mana_bombard',
  name: '魔力轰炸',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '稀有',
  manaCost: 8,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 3,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗8MP，点数*2，造成1倍点数伤害，3连击',
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

/** 烈焰打击：0.5倍最终点数伤害并附加燃烧+1 */
const 烈焰打击: CardData = {
  id: 'burn_flame_strike',
  name: '烈焰打击',
  type: CardType.PHYSICAL,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成0.5倍最终点数伤害并附加燃烧+1',
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

/** 焚身突刺：点数*2，造成0.6倍最终点数伤害并附加燃烧+1 */
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
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数*2，造成0.6倍最终点数伤害并附加燃烧+1',
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

/** 炼狱波及：双方燃烧+2，自身结界+1 */
const 炼狱波及: CardData = {
  id: 'burn_hell_waves',
  name: '炼狱波及',
  type: CardType.FUNCTION,
  category: '燃烧',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'self', valueMode: 'fixed', fixedValue: 2 },
    { kind: 'apply_buff', effectType: EffectType.BARRIER, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '双方燃烧+2，自身结界+1',
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
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 0.8 },
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '无伤害。为自身提供0.8倍点数护甲，并为敌方施加2层寒冷',
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

/** 回授冻轮：施加寒冷并按敌方当前寒冷获得护甲（护甲逻辑在 CombatView） */
const 回授冻轮: CardData = {
  id: 'yanhan_feedback_freeze_wheel',
  name: '回授冻轮',
  type: CardType.MAGIC,
  category: '严寒',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.COLD, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '造成0.5倍点数伤害并施加0.5倍点数寒冷，获得floor(敌方当前寒冷/2)护甲',
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

/** 压差循环：消耗护甲并转化为寒冷与回蓝（结算逻辑在 CombatView） */
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
  description: '消耗自身最多10点护甲，每消耗2点：敌方寒冷+1且自身回1MP，连击',
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
  description: '消耗敌方至多4层寒冷，自身回复等量生命',
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

// ── 血池体系卡牌 ────────────────────────────────────────────────

/** 刺络放血：造成0.6倍点数伤害，敌方流血+1 */
const 刺络放血: CardData = {
  id: 'bloodpool_venesection',
  name: '刺络放血',
  type: CardType.PHYSICAL,
  category: '血池',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.6, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BLEED, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '造成0.6倍点数伤害，敌方流血+1',
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
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗6MP，互换双方当前生命值百分比',
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

/** 血影回身：点数+1，闪避成功时回复0.5倍点数生命并施加1层流血 */
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
      scale: 0.5,
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
  description: '点数+1，闪避。若闪避成功，回复0.5倍点数生命并施加1层流血',
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
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

/** 血盆大口：造成1倍最终点数伤害，附加吞食+1，双方易伤+2 */
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
  description: '造成1倍最终点数的伤害与1层吞食，对双方附加2层易伤',
};

/** 挤压：点数*3，造成0.5倍最终点数伤害 */
const 挤压: CardData = {
  id: 'enemy_mimic_crush',
  name: '挤压',
  type: CardType.PHYSICAL,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 3.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*3，造成0.5倍最终点数伤害',
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

/** 渗透：为对方增加1倍点数的侵蚀 */
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
  description: '为对方增加1倍点数的侵蚀',
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
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

/** 迷雾缭绕：点数+1，无伤害，施加2层中毒并插入性爱幻觉 */
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
  description: '点数+1，无伤害，造成2层中毒并插入“性爱幻觉”',
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

/** 巨大化投影：移除自身的虚幻之躯，获得1倍点数护甲，最小点数+2，最大点数+4（结算逻辑在 CombatView） */
const 巨大化投影: CardData = {
  id: 'enemy_nymph_giant_projection',
  name: '巨大化投影',
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
  description: '移除自身的“虚幻之躯”，获得1倍点数护甲，最小点数+2，最大点数+4',
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数+1，造成0.5倍点数伤害并施加1层束缚',
};

/** 流体包裹：点数+2，造成0.5倍点数伤害，若玩家已被束缚，则施加吞食 */
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
  description: '点数+2，造成0.5倍点数伤害，若玩家已被束缚，则施加吞食',
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

/** 催情气体：点数*1.5，无伤害，施加1层中毒与1层束缚 */
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数*1.5，无伤害，施加1层中毒与1层束缚',
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
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

/** 大地精华：诅咒，打出后自身增加2点侵蚀，连击，抽牌，移除 */
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
  description: '打出后自身增加2点侵蚀，连击，抽牌，移除',
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '造成1倍点数的伤害并施加1层束缚',
};

/** 精华灌注：消耗1MP，无伤害，施加1倍点数侵蚀并插入大地精华 */
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
  description: '无伤害，施加1倍点数侵蚀，并插入“大地精华”',
};

/** 精神同化：消耗5MP，无伤害，点数*2，施加1倍点数侵蚀 */
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
  description: '无伤害，点数*2，施加1倍点数的侵蚀',
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
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
      restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
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

/** 生命汲取：造成1倍点数伤害，若目标有束缚则回复1倍点数生命（结算逻辑在 CombatView） */
const 生命汲取: CardData = {
  id: 'enemy_rose_life_drain',
  name: '生命汲取',
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

/** 粘液闪避 — 与普通闪避完全一致 */
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
  cardEffects: [],
  description: '若敌方攻击点数高于我方，则敌方攻击无效',
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
      scale: 1.0,           // 回复量 = FinalPoint * 1.0
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
  description: '点数-2，连击，抽1张牌',
};

/** 惑心咒：开局仅使用一次，为对手施加窥视禁忌与认知干涉（结算逻辑在 CombatView） */
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
  description: '为对手施加1层窥视禁忌与1层认知干涉',
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
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 2.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*2，移除对方所有元素debuff，每移除1层造成2点真实伤害',
};

/** 不稳定试剂：点数*1.5，造成0.5倍最终点数伤害并随机附加元素debuff（结算逻辑在 CombatView） */
const 不稳定试剂: CardData = {
  id: 'enemy_muxinlan_unstable_reagent',
  name: '不稳定试剂',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.5，造成0.5倍最终点数伤害，并随机附加一种元素debuff',
};

/** 液态火：点数*1.5，无伤害，将对方寒冷按1:1转化为燃烧（结算逻辑在 CombatView） */
const 液态火: CardData = {
  id: 'enemy_muxinlan_liquid_fire',
  name: '液态火',
  type: CardType.MAGIC,
  category: '敌人',
  rarity: '普通',
  manaCost: 4,
  calculation: { multiplier: 1.5, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数*1.5，无伤害，将对方所有寒冷按1:1转化为燃烧',
};

/** 活化粘液：点数+3，无伤害，随机将对方一种已有元素debuff层数翻倍（结算逻辑在 CombatView） */
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
  description: '点数+3，无伤害，随机将对方一个已有元素debuff层数翻倍',
};

/** 等价交换：向对方牌库插入炼金废料，并按点数回复自身生命 */
const 等价交换: CardData = {
  id: 'enemy_muxinlan_take_it',
  name: '等价交换',
  type: CardType.FUNCTION,
  category: '敌人',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, insertCardsToEnemyDeck: ['炼金废料'] },
  cardEffects: [
    { kind: 'heal', valueMode: 'point_scale', scale: 2.0, target: 'self' },
  ],
  description: '插入一张炼金废料到对方牌库，同时回复2倍点数的生命',
};

/** 溢价护盾：增加自身x层坚固与x点魔力，x为对方魔力值（结算逻辑在 CombatView） */
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
  description: '增加自身x层坚固与x点魔力，x为对方魔力值',
};

/** 设下埋伏：点数*0.5，闪避。若对方跳过回合，则为对方施加一层法力枯竭 */
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
      triggers: ['on_opponent_skip'],
      kind: 'apply_buff',
      effectType: EffectType.MANA_DRAIN,
      target: 'enemy',
      valueMode: 'fixed',
      fixedValue: 1,
    },
  ],
  description: '点数*0.5，闪避。若对方跳过回合，则为对方施加1层法力枯竭',
};

// ── 卡牌注册表 ──────────────────────────────────────────────────

/**
 * 全部卡牌以 name 为键存储。
 * 后续新增卡牌只需在此处添加并注册即可。
 */
const CARD_REGISTRY: ReadonlyMap<string, CardData> = new Map<string, CardData>([
  [普通物理攻击.name, 普通物理攻击],
  [普通物理攻击加1.name, 普通物理攻击加1],
  [普通物理攻击加2.name, 普通物理攻击加2],
  [普通物理攻击加4.name, 普通物理攻击加4],
  [普通魔法攻击.name, 普通魔法攻击],
  [聚焦魔法攻击.name, 聚焦魔法攻击],
  [普通护盾.name, 普通护盾],
  [普通闪避.name, 普通闪避],
  [休眠.name, 休眠],
  [侧身闪避.name, 侧身闪避],
  [存在消除.name, 存在消除],
  [吐纳法.name, 吐纳法],
  [虚实步法.name, 虚实步法],
  [镜面幻像.name, 镜面幻像],
  [魔力偏移.name, 魔力偏移],
  [魔剑.name, 魔剑],
  [双刃剑.name, 双刃剑],
  [导路采样.name, 导路采样],
  [织式备份.name, 织式备份],
  [魔压提纯.name, 魔压提纯],
  [魔力飓风.name, 魔力飓风],
  [回声回灌.name, 回声回灌],
  [逆相咏唱.name, 逆相咏唱],
  [奥术裂枪.name, 奥术裂枪],
  [法环坍缩.name, 法环坍缩],
  [棱镜贯流.name, 棱镜贯流],
  [导能屏障.name, 导能屏障],
  [魔力轰炸.name, 魔力轰炸],
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
  [霜痕斩.name, 霜痕斩],
  [寒域校准.name, 寒域校准],
  [折光回避.name, 折光回避],
  [回授冻轮.name, 回授冻轮],
  [冷室复写.name, 冷室复写],
  [温差效应.name, 温差效应],
  [压差循环.name, 压差循环],
  [冷源整流.name, 冷源整流],
  [零界裁定.name, 零界裁定],
  [刺络放血.name, 刺络放血],
  [赤潮压制.name, 赤潮压制],
  [噬血劈斩.name, 噬血劈斩],
  [血池扩容.name, 血池扩容],
  [活性血池.name, 活性血池],
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
  [普莉姆拥抱.name, 普莉姆拥抱],
  [普莉姆流体规避.name, 普莉姆流体规避],
  [普莉姆消化性爱抚.name, 普莉姆消化性爱抚],
  [实体分身.name, 实体分身],
  [性爱幻觉.name, 性爱幻觉],
  [迷雾缭绕.name, 迷雾缭绕],
  [精神震荡.name, 精神震荡],
  [恶作剧.name, 恶作剧],
  [巨大化投影.name, 巨大化投影],
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
  [生命汲取.name, 生命汲取],
  [花蜜调教.name, 花蜜调教],
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
]);

// ── 公共 API ────────────────────────────────────────────────────

/** 根据卡名查找卡牌数据，不存在则返回 undefined */
export function getCardByName(name: string): CardData | undefined {
  return CARD_REGISTRY.get(name);
}

/** 批量将卡名数组转换为 CardData 数组（跳过未找到的卡名） */
export function resolveCardNames(names: string[]): CardData[] {
  return names
    .map((n) => CARD_REGISTRY.get(n))
    .filter((c): c is CardData => c !== undefined);
}

/** 获取卡牌库中所有卡牌名称 */
export function getAllCardNames(): string[] {
  return [...CARD_REGISTRY.keys()];
}

/** 获取卡牌库中所有卡牌数据 */
export function getAllCards(): CardData[] {
  return [...CARD_REGISTRY.values()];
}
