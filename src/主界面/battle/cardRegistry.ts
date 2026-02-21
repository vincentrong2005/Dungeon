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
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数的伤害',
};

/** 普通物理攻击+2 */
const 普通物理攻击加2: CardData = {
  id: 'basic_physical_plus_2',
  name: '普通物理攻击+2',
  type: CardType.PHYSICAL,
  category: '基础',
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
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
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
  description: '获得1倍点数的护甲',
};

/** 普通闪避 */
const 普通闪避: CardData = {
  id: 'basic_dodge',
  name: '普通闪避',
  type: CardType.DODGE,
  category: '基础',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '若敌方攻击点数高于我方，则敌方攻击无效',
};

// ── 燃烧体系卡牌 ────────────────────────────────────────────────

/** 火花烙印：敌方燃烧+1，我方点数-1，连击 */
const 火花烙印: CardData = {
  id: 'burn_spark_mark',
  name: '火花烙印',
  type: CardType.FUNCTION,
  category: '燃烧',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: -1 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '敌方燃烧+1，我方点数-1，连击',
};

/** 焦油泼洒：敌方燃烧+2，自身燃烧+2，连击 */
const 焦油泼洒: CardData = {
  id: 'burn_tar_splash',
  name: '焦油泼洒',
  type: CardType.FUNCTION,
  category: '燃烧',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'enemy', valueMode: 'fixed', fixedValue: 2 },
    { kind: 'apply_buff', effectType: EffectType.BURN, target: 'self', valueMode: 'fixed', fixedValue: 2 },
  ],
  description: '敌方燃烧+2，自身燃烧+2，连击',
};

/** 焚风术：造成0.5倍最终点数+目标燃烧层数的伤害 */
const 焚风术: CardData = {
  id: 'burn_scorch_wind',
  name: '焚风术',
  type: CardType.MAGIC,
  category: '燃烧',
  manaCost: 2,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 0.5, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '对敌方造成0.5倍最终点数伤害并叠加目标当前燃烧层数',
};

/** 烧伤：点数-2，造成1倍最终点数伤害，易伤+1 */
const 烧伤: CardData = {
  id: 'burn_scorch',
  name: '烧伤',
  type: CardType.MAGIC,
  category: '燃烧',
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
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
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
  manaCost: 2,
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

/** 炭化转化：清除自身燃烧并按层数回魔（结算逻辑在 CombatView 中） */
const 炭化转化: CardData = {
  id: 'burn_char_convert',
  name: '炭化转化',
  type: CardType.FUNCTION,
  category: '燃烧',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '清除自身燃烧并按层数回复魔力',
};

// ── 敌人卡牌定义 ────────────────────────────────────────────────

/** 催情鳞粉：造成0.5倍点数伤害，并施加易伤+1 */
const 催情鳞粉: CardData = {
  id: 'enemy_moth_aphro_powder',
  name: '催情鳞粉',
  type: CardType.PHYSICAL,
  category: '敌人',
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
  manaCost: 6,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '消耗6MP，造成1倍最终点数伤害；自身每有1层群集额外造成一次同等伤害',
};

/** 震动感知：为自身增加2倍点数护甲 */
const 震动感知: CardData = {
  id: 'enemy_root_tremor_sense',
  name: '震动感知',
  type: CardType.FUNCTION,
  category: '敌人',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.ARMOR, target: 'self', valueMode: 'point_scale', scale: 2.0 },
  ],
  description: '为自身增加2倍最终点数的护甲',
};

/** 润滑分泌：为敌方增加0.5倍点数的中毒 */
const 润滑分泌: CardData = {
  id: 'enemy_root_lube_secretion',
  name: '润滑分泌',
  type: CardType.FUNCTION,
  category: '敌人',
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
      restrictedTypes: [CardType.PHYSICAL, CardType.MAGIC, CardType.FUNCTION, CardType.DODGE],
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
  manaCost: 0,
  calculation: { multiplier: 1, addition: 1 },
  damageLogic: { mode: 'relative', scale: 1, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数+1，造成1倍最终点数的伤害',
};

/** 粘液闪避 — 与普通闪避完全一致 */
const 粘液闪避: CardData = {
  id: 'enemy_slime_dodge',
  name: '粘液闪避',
  type: CardType.DODGE,
  category: '敌人',
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

// ── 卡牌注册表 ──────────────────────────────────────────────────

/**
 * 全部卡牌以 name 为键存储。
 * 后续新增卡牌只需在此处添加并注册即可。
 */
const CARD_REGISTRY: ReadonlyMap<string, CardData> = new Map<string, CardData>([
  [普通物理攻击.name, 普通物理攻击],
  [普通物理攻击加2.name, 普通物理攻击加2],
  [普通物理攻击加4.name, 普通物理攻击加4],
  [普通魔法攻击.name, 普通魔法攻击],
  [聚焦魔法攻击.name, 聚焦魔法攻击],
  [普通护盾.name, 普通护盾],
  [普通闪避.name, 普通闪避],
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
  [炭化转化.name, 炭化转化],
  [催情鳞粉.name, 催情鳞粉],
  [敏感化标记.name, 敏感化标记],
  [荧光信息素.name, 荧光信息素],
  [群体效应.name, 群体效应],
  [震动感知.name, 震动感知],
  [润滑分泌.name, 润滑分泌],
  [渗透攀爬.name, 渗透攀爬],
  [冲撞.name, 冲撞],
  [粘液闪避.name, 粘液闪避],
  [回复.name, 回复],
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
