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

const EFFECT_REGISTRY_RAW: Record<EffectType, EffectDefinition> = {
  [EffectType.BARRIER]: {
    type: EffectType.BARRIER,
    name: '结界',
    polarity: 'buff',
    timings: ['onBeforeDamage'],
    stackable: true,
    maxStacks: 0,
    description: '抵挡任何来源的伤害判定。触发后层数-1',
  },
  [EffectType.ARMOR]: {
    type: EffectType.ARMOR,
    name: '护甲',
    polarity: 'buff',
    timings: ['onBeforeDamage', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '在最终伤害结算阶段减去等量数值',
  },
  [EffectType.BIND]: {
    type: EffectType.BIND,
    name: '束缚',
    polarity: 'debuff',
    timings: ['onCardPlay', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '无法使用物理与闪避卡牌。每回合结束层数-1',
  },
  [EffectType.DEVOUR]: {
    type: EffectType.DEVOUR,
    name: '被吞食',
    polarity: 'debuff',
    timings: ['onCardPlay'],
    stackable: false,
    maxStacks: 1,
    description: '点数限制：若骰子基础点数≤3，禁用物理/魔法/闪避卡牌。',
  },
  [EffectType.POISON]: {
    type: EffectType.POISON,
    name: '中毒',
    polarity: 'debuff',
    timings: ['onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '每回合结束时，增加等量层数的中毒量，中毒层数-1',
  },
  [EffectType.POISON_AMOUNT]: {
    type: EffectType.POISON_AMOUNT,
    name: '中毒量',
    polarity: 'special',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '回合开始时若中毒量≥当前生命值，则造成等量真实伤害并清空中毒量',
  },
  [EffectType.CORROSION]: {
    type: EffectType.CORROSION,
    name: '侵蚀',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '达到30层时，目标生命上限归零并立即死亡（无视复活）',
  },
  [EffectType.BURN]: {
    type: EffectType.BURN,
    name: '燃烧',
    polarity: 'debuff',
    timings: ['onTurnStart', 'onClash'],
    stackable: true,
    maxStacks: 0,
    description: '每回合减少等量层数的生命。己方拼点成功时消失',
  },
  [EffectType.BLEED]: {
    type: EffectType.BLEED,
    name: '流血',
    polarity: 'debuff',
    timings: ['onClash', 'onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '拼点时造成等量层数的真实伤害。每回合-1',
  },
  [EffectType.VULNERABLE]: {
    type: EffectType.VULNERABLE,
    name: '易伤',
    polarity: 'debuff',
    timings: ['onBeforeDamage'],
    stackable: true,
    maxStacks: 0,
    description: '每次受到伤害的伤害增加等量层数',
  },
  [EffectType.ORGASM]: {
    type: EffectType.ORGASM,
    name: '性兴奋',
    polarity: 'debuff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时，施加等同当前层数的疲劳',
  },
  [EffectType.BRAND_MARK]: {
    type: EffectType.BRAND_MARK,
    name: '烙印',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '维罗妮卡的烙印。该效果本身无直接作用',
  },
  [EffectType.OBEDIENCE_BRAND]: {
    type: EffectType.OBEDIENCE_BRAND,
    name: '服从烙印',
    polarity: 'trait',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '每次受到直接伤害时给攻击者施加1层烙印；每次攻击直接命中后，按目标烙印层数回复生命',
  },
  [EffectType.DAMAGE_BOOST]: {
    type: EffectType.DAMAGE_BOOST,
    name: '增伤',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '自身直接攻击造成的伤害增加等量层数',
  },
  [EffectType.IGNORE_DODGE]: {
    type: EffectType.IGNORE_DODGE,
    name: '无视闪避',
    polarity: 'buff',
    timings: ['onCardPlay'],
    stackable: true,
    maxStacks: 0,
    description: '每次使用物理或魔法牌时，令该牌无视闪避并消耗1层',
  },
  [EffectType.WEAKEN]: {
    type: EffectType.WEAKEN,
    name: '虚弱',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '自身直接攻击造成的伤害减少等量层数',
  },
  [EffectType.REGEN]: {
    type: EffectType.REGEN,
    name: '生命回复',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时回复等量层数的生命',
  },
  [EffectType.DAMAGE_LIMIT]: {
    type: EffectType.DAMAGE_LIMIT,
    name: '限伤',
    polarity: 'buff',
    timings: ['onBeforeDamage'],
    stackable: true,
    maxStacks: 0,
    description: '单次受到的非真实伤害最多为当前层数',
  },
  [EffectType.SELF_REPAIR]: {
    type: EffectType.SELF_REPAIR,
    name: '自修复',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '回合开始时若生命低于50%，按层数回复生命并随机移除等量元素debuff；每累计3层回复计数，自身增加2层生命上限削减',
  },
  [EffectType.IRIS_AMBER]: {
    type: EffectType.IRIS_AMBER,
    name: '虹膜：琥珀',
    polarity: 'buff',
    timings: ['onBeforeDamage'],
    stackable: false,
    maxStacks: 1,
    description: '受到的伤害减少50%',
  },
  [EffectType.IRIS_SCARLET]: {
    type: EffectType.IRIS_SCARLET,
    name: '虹膜：猩红',
    polarity: 'buff',
    timings: ['onBeforeDamage'],
    stackable: false,
    maxStacks: 1,
    description: '受到的伤害增加25%',
  },
  [EffectType.WHITE_TURBID]: {
    type: EffectType.WHITE_TURBID,
    name: '白浊',
    polarity: 'mixed',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时为对手回复等量层数生命，并施加等量层数侵蚀',
  },
  [EffectType.IGNITE_AURA]: {
    type: EffectType.IGNITE_AURA,
    name: '施加燃烧',
    polarity: 'mixed',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时为战斗双方施加一层燃烧',
  },
  [EffectType.STUN]: {
    type: EffectType.STUN,
    name: '眩晕',
    polarity: 'debuff',
    timings: ['onTurnStart', 'onTurnEnd'],
    stackable: false,
    maxStacks: 1,
    description: '无法执行任何出牌或拼点行动。一回合后消失',
  },
  [EffectType.CHARGE]: {
    type: EffectType.CHARGE,
    name: '蓄力',
    polarity: 'buff',
    timings: ['onDiceRoll'],
    stackable: true,
    maxStacks: 0,
    description: '下一次投掷骰子时增加等量层数的点数并清空全部层数',
  },
  [EffectType.FATIGUE]: {
    type: EffectType.FATIGUE,
    name: '疲劳',
    polarity: 'debuff',
    timings: ['onDiceRoll'],
    stackable: true,
    maxStacks: 0,
    description: '下一次投掷骰子时减少等量层数的点数并清空全部层数',
  },
  [EffectType.SCALE_POWDER]: {
    type: EffectType.SCALE_POWDER,
    name: '鳞粉',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '使用闪避卡牌时，点数增加等同层数的数值',
  },
  [EffectType.COLD]: {
    type: EffectType.COLD,
    name: '寒冷',
    polarity: 'debuff',
    timings: ['onBeforeAttack', 'onAfterAttack'],
    stackable: true,
    maxStacks: 0,
    description: '降低造成的伤害数值。攻击结算后层数减半',
  },
  [EffectType.TEMPERATURE_DIFF]: {
    type: EffectType.TEMPERATURE_DIFF,
    name: '温差',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '每次获得寒冷时，额外增加等同温差层数的寒冷；每次受到燃烧伤害时，额外增加等同温差层数的伤害',
  },
  [EffectType.NON_LIVING]: {
    type: EffectType.NON_LIVING,
    name: '非生物',
    polarity: 'trait',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '免疫流血与中毒效果；若收到流血或中毒，改为受到1点真实伤害',
  },
  [EffectType.NON_ENTITY]: {
    type: EffectType.NON_ENTITY,
    name: '非实体',
    polarity: 'trait',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '受到物理伤害减少50%，受到魔法伤害增加50%',
  },
  [EffectType.ILLUSORY_BODY]: {
    type: EffectType.ILLUSORY_BODY,
    name: '虚幻之躯',
    polarity: 'trait',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '受到物理伤害减少50%',
  },
  [EffectType.TEMP_MAX_HP]: {
    type: EffectType.TEMP_MAX_HP,
    name: '临时生命上限',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '本场战斗内每层提高1点最大生命值',
  },
  [EffectType.MAX_HP_REDUCTION]: {
    type: EffectType.MAX_HP_REDUCTION,
    name: '生命上限削减',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '每层立即使最大生命值-1',
  },
  [EffectType.POINT_GROWTH_BIG]: {
    type: EffectType.POINT_GROWTH_BIG,
    name: '点数成长（大）',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每3回合，自身最大骰子点数+1',
  },
  [EffectType.POINT_GROWTH_SMALL]: {
    type: EffectType.POINT_GROWTH_SMALL,
    name: '点数成长（小）',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每3回合，自身最小骰子点数+1',
  },
  [EffectType.MANA_DRAIN]: {
    type: EffectType.MANA_DRAIN,
    name: '法力枯竭',
    polarity: 'debuff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时强制将当前法力值清零。每回合-1',
  },
  [EffectType.MANA_SPRING]: {
    type: EffectType.MANA_SPRING,
    name: '魔力源泉',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时自身增加等量层数的魔力',
  },
  [EffectType.SWARM]: {
    type: EffectType.SWARM,
    name: '群集',
    polarity: 'buff',
    timings: ['onAfterDamage'],
    stackable: true,
    maxStacks: 0,
    description: '生命值≤0时，消耗1层并恢复至生命上限',
  },
  [EffectType.BLOOD_COCOON]: {
    type: EffectType.BLOOD_COCOON,
    name: '血茧',
    polarity: 'buff',
    timings: ['onAfterDamage'],
    stackable: true,
    maxStacks: 0,
    description: '生命值≤0时，消耗1层并恢复至50%生命',
  },
  [EffectType.INDOMITABLE]: {
    type: EffectType.INDOMITABLE,
    name: '不屈',
    polarity: 'buff',
    timings: ['onAfterDamage'],
    stackable: true,
    maxStacks: 0,
    description: '生命值≤0时，消耗1层并恢复至1点生命',
  },
  [EffectType.PEEP_FORBIDDEN]: {
    type: EffectType.PEEP_FORBIDDEN,
    name: '虚实不明',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '对方骰子点数UI显示会随机偏移',
  },
  [EffectType.BLIND_ASH]: {
    type: EffectType.BLIND_ASH,
    name: '思绪被扰乱',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '自身骰子点数UI显示会随机偏移',
  },
  [EffectType.COGNITIVE_INTERFERENCE]: {
    type: EffectType.COGNITIVE_INTERFERENCE,
    name: '敌意隐藏',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '无法识别对方意图卡',
  },
  [EffectType.UNSEEABLE]: {
    type: EffectType.UNSEEABLE,
    name: '无法直视',
    polarity: 'trait',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '开局施加1层虚实不明与敌意隐藏；每回合开始为对手补上缺失的虚实不明/敌意隐藏',
  },
  [EffectType.MEMORY_FOG]: {
    type: EffectType.MEMORY_FOG,
    name: '视野模糊',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: false,
    maxStacks: 1,
    description: '自身手牌名称与描述被隐藏',
  },
  [EffectType.SILENCE]: {
    type: EffectType.SILENCE,
    name: '禁言',
    polarity: 'debuff',
    timings: ['onCardPlay', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '无法使用魔法卡牌。每回合结束层数-1',
  },
  [EffectType.CONTROLLED]: {
    type: EffectType.CONTROLLED,
    name: '被操控',
    polarity: 'debuff',
    timings: ['onCardPlay', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '每回合只能使用与对手意图同类型卡牌。每回合结束层数-1',
  },
  [EffectType.STURDY]: {
    type: EffectType.STURDY,
    name: '坚固',
    polarity: 'buff',
    timings: ['onBeforeDamage', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '每次受到伤害时固定减伤，持续1回合并在回合结束清空',
  },
  [EffectType.SHIELD_BARRIER]: {
    type: EffectType.SHIELD_BARRIER,
    name: '屏障',
    polarity: 'buff',
    timings: ['onBeforeDamage'],
    stackable: true,
    maxStacks: 0,
    description: '每次受到伤害时固定减伤',
  },
  [EffectType.SHOCK]: {
    type: EffectType.SHOCK,
    name: '电击',
    polarity: 'debuff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '每次法力减少时，受到等同层数的生命损失，随后层数减半',
  },
  [EffectType.FLAME_ATTACH]: {
    type: EffectType.FLAME_ATTACH,
    name: '火焰附加',
    polarity: 'buff',
    timings: ['onAfterAttack'],
    stackable: true,
    maxStacks: 0,
    description: '攻击卡命中后为对手施加燃烧',
  },
  [EffectType.POISON_ATTACH]: {
    type: EffectType.POISON_ATTACH,
    name: '毒素附加',
    polarity: 'buff',
    timings: ['onAfterAttack'],
    stackable: true,
    maxStacks: 0,
    description: '魔法卡命中后为对手施加中毒',
  },
  [EffectType.TOXIN_SPREAD]: {
    type: EffectType.TOXIN_SPREAD,
    name: '毒素蔓延',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '对手每次打出物理牌时，获得等量层数的中毒',
  },
  [EffectType.AMBUSH]: {
    type: EffectType.AMBUSH,
    name: '伏击',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '对手每次打出物理或闪避牌时，对其施加1层束缚并消耗1层自身层数',
  },
  [EffectType.FROST_ATTACH]: {
    type: EffectType.FROST_ATTACH,
    name: '冰霜附加',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时为对手施加寒冷',
  },
  [EffectType.BLOODBLADE_ATTACH]: {
    type: EffectType.BLOODBLADE_ATTACH,
    name: '血刃附加',
    polarity: 'buff',
    timings: ['onClash'],
    stackable: true,
    maxStacks: 0,
    description: '拼点时为对手施加流血',
  },
  [EffectType.LIGHTNING_ATTACH]: {
    type: EffectType.LIGHTNING_ATTACH,
    name: '雷电附加',
    polarity: 'buff',
    timings: ['onClash'],
    stackable: true,
    maxStacks: 0,
    description: '每次成功闪避时为对手施加电击',
  },
  [EffectType.THORNS]: {
    type: EffectType.THORNS,
    name: '荆棘',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '每次受到直接伤害时，反弹等同于层数的伤害',
  },
  [EffectType.CO_DAMAGE]: {
    type: EffectType.CO_DAMAGE,
    name: '共损',
    polarity: 'buff',
    timings: ['passive', 'onTurnEnd'],
    stackable: true,
    maxStacks: 0,
    description: '将自身当前回合受到的所有非真实伤害返还给敌方，回合结束时层数-1',
  },
  [EffectType.BLOODLINE]: {
    type: EffectType.BLOODLINE,
    name: '血族',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '造成直接伤害或触发对方流血伤害后，回复2倍等量生命；受到来自对方的治疗时改为等量真实伤害',
  },
  [EffectType.CONTRACT_CURSE]: {
    type: EffectType.CONTRACT_CURSE,
    name: '契约诅咒',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '无视一切复活手段',
  },
  [EffectType.INK_CREATION]: {
    type: EffectType.INK_CREATION,
    name: '笔墨造物',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '攻击造成伤害后附加1倍点数侵蚀；受到燃烧伤害后追加等量真实伤害',
  },
  [EffectType.MIND_READ]: {
    type: EffectType.MIND_READ,
    name: '读心',
    polarity: 'buff',
    timings: ['passive'],
    stackable: true,
    maxStacks: 0,
    description: '读取玩家的意图',
  },
  [EffectType.ELEMENTAL_ADAPTATION]: {
    type: EffectType.ELEMENTAL_ADAPTATION,
    name: '元素适应体',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时，若自身有元素debuff，则随机移除2层并回复2点生命',
  },
  [EffectType.ELEMENTAL_CORTEX]: {
    type: EffectType.ELEMENTAL_CORTEX,
    name: '元素皮层',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始时，若自身有元素debuff，则随机移除1层并回复1点生命',
  },
  [EffectType.MATERIALIZATION]: {
    type: EffectType.MATERIALIZATION,
    name: '实体化',
    polarity: 'buff',
    timings: ['onTurnStart'],
    stackable: true,
    maxStacks: 0,
    description: '每回合开始层数-1；归零后清除非实体、生命回满，并使最小/最大骰子点数+4',
  },
};

const EFFECT_REGISTRY_ORDER_REQUESTED: readonly EffectType[] = [
  EffectType.ARMOR,
  EffectType.POISON_AMOUNT,
  EffectType.TEMP_MAX_HP,
  EffectType.MAX_HP_REDUCTION,
  EffectType.BURN,
  EffectType.COLD,
  EffectType.POISON,
  EffectType.BLEED,
  EffectType.SHOCK,
  EffectType.TEMPERATURE_DIFF,
  EffectType.CORROSION,
  EffectType.VULNERABLE,
  EffectType.BRAND_MARK,
  EffectType.DAMAGE_BOOST,
  EffectType.IGNORE_DODGE,
  EffectType.WEAKEN,
  EffectType.DAMAGE_LIMIT,
  EffectType.CHARGE,
  EffectType.FATIGUE,
  EffectType.SCALE_POWDER,
  EffectType.BARRIER,
  EffectType.STURDY,
  EffectType.SHIELD_BARRIER,
  EffectType.INDOMITABLE,
  EffectType.MANA_SPRING,
  EffectType.REGEN,
  EffectType.SELF_REPAIR,
  EffectType.IRIS_AMBER,
  EffectType.IRIS_SCARLET,
  EffectType.FLAME_ATTACH,
  EffectType.FROST_ATTACH,
  EffectType.POISON_ATTACH,
  EffectType.BLOODBLADE_ATTACH,
  EffectType.LIGHTNING_ATTACH,
  EffectType.BLOOD_COCOON,
  EffectType.ORGASM,
  EffectType.BIND,
  EffectType.DEVOUR,
  EffectType.STUN,
  EffectType.BIND,
  EffectType.SILENCE,
  EffectType.CONTROLLED,
  EffectType.MANA_DRAIN,
  EffectType.CO_DAMAGE,
  EffectType.PEEP_FORBIDDEN,
  EffectType.BLIND_ASH,
  EffectType.COGNITIVE_INTERFERENCE,
  EffectType.UNSEEABLE,
  EffectType.MEMORY_FOG,
  EffectType.SWARM,
  EffectType.WHITE_TURBID,
  EffectType.AMBUSH,
  EffectType.THORNS,
  EffectType.BLOODLINE,
  EffectType.CONTRACT_CURSE,
  EffectType.IGNITE_AURA,
  EffectType.NON_LIVING,
  EffectType.NON_ENTITY,
  EffectType.ILLUSORY_BODY,
  EffectType.OBEDIENCE_BRAND,
  EffectType.POINT_GROWTH_SMALL,
  EffectType.POINT_GROWTH_BIG,
  EffectType.TOXIN_SPREAD,
  EffectType.INK_CREATION,
  EffectType.MIND_READ,
  EffectType.ELEMENTAL_CORTEX,
  EffectType.ELEMENTAL_ADAPTATION,
  EffectType.MATERIALIZATION,
];

const effectRegistryOrderDeduped: EffectType[] = [];
const effectRegistryOrderSeen = new Set<EffectType>();
for (const type of EFFECT_REGISTRY_ORDER_REQUESTED) {
  if (!(type in EFFECT_REGISTRY_RAW)) continue;
  if (effectRegistryOrderSeen.has(type)) continue;
  effectRegistryOrderSeen.add(type);
  effectRegistryOrderDeduped.push(type);
}
for (const type of Object.keys(EFFECT_REGISTRY_RAW) as EffectType[]) {
  if (effectRegistryOrderSeen.has(type)) continue;
  effectRegistryOrderSeen.add(type);
  effectRegistryOrderDeduped.push(type);
}

export const EFFECT_REGISTRY: Record<EffectType, EffectDefinition> = effectRegistryOrderDeduped.reduce(
  (acc, type) => {
    acc[type] = EFFECT_REGISTRY_RAW[type];
    return acc;
  },
  {} as Record<EffectType, EffectDefinition>,
);

/**
 * 状态显示顺序：使用 EFFECT_REGISTRY 的声明顺序作为全局唯一顺序来源。
 * 这样战斗界面、图鉴等处可以保持一致。
 */
export const EFFECT_DISPLAY_ORDER: readonly EffectType[] = Object.keys(EFFECT_REGISTRY) as EffectType[];
const EFFECT_DISPLAY_ORDER_INDEX = new Map<EffectType, number>(
  EFFECT_DISPLAY_ORDER.map((type, index) => [type, index]),
);

const getEffectPolaritySortRank = (type: EffectType): number => {
  const polarity = EFFECT_REGISTRY[type]?.polarity;
  if (polarity === 'trait') return 0;
  if (polarity === 'buff') return 1;
  if (polarity === 'debuff') return 2;
  return 3;
};

export function getEffectDisplayOrder(type: EffectType): number {
  const baseOrder = EFFECT_DISPLAY_ORDER_INDEX.get(type) ?? Number.MAX_SAFE_INTEGER;
  return getEffectPolaritySortRank(type) * 1000 + baseOrder;
}

// 元素debuff分组：用于随机附加、转换、翻倍等效果
export const ELEMENTAL_DEBUFF_TYPES: EffectType[] = [
  EffectType.COLD,
  EffectType.BURN,
  EffectType.POISON,
  EffectType.BLEED,
  EffectType.SHOCK,
];

const DECAY_GRACE_EFFECT_TYPES = new Set<EffectType>([
  EffectType.BIND,
  EffectType.SILENCE,
  EffectType.STUN,
  EffectType.CONTROLLED,
  EffectType.BLEED,
  EffectType.CO_DAMAGE,
]);

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
 * 自动处理：非生物免疫流血/中毒，并将其转化为1点真实伤害
 */
export function applyEffect(
  entity: EntityStats,
  type: EffectType,
  stacks: number = 1,
  options?: { restrictedTypes?: CardType[]; source?: string; lockDecayThisTurn?: boolean },
): boolean {
  const normalizedStacks = Math.max(0, Math.floor(stacks));
  if (normalizedStacks <= 0) return false;

  // 非生物：免疫流血/中毒，改为受到1点真实伤害
  if (hasEffect(entity, EffectType.NON_LIVING)) {
    if (type === EffectType.POISON || type === EffectType.BLEED) {
      entity.hp = Math.max(0, entity.hp - 1);
      return false; // 不施加状态
    }
  }

  const def = EFFECT_REGISTRY[type];
  const existing = findEffect(entity, type);
  let nextStacks = normalizedStacks;

  if (type === EffectType.COLD) {
    const temperatureDiffStacks = getEffectStacks(entity, EffectType.TEMPERATURE_DIFF);
    if (temperatureDiffStacks > 0) {
      nextStacks += temperatureDiffStacks;
    }
  }

  if (type === EffectType.IRIS_AMBER) {
    removeEffect(entity, EffectType.IRIS_SCARLET);
  }
  if (type === EffectType.IRIS_SCARLET) {
    removeEffect(entity, EffectType.IRIS_AMBER);
  }

  // 生命上限削减：施加时立即降低最大生命值（最低为0）
  if (type === EffectType.MAX_HP_REDUCTION) {
    const maxReducible = Math.max(0, entity.maxHp);
    if (maxReducible <= 0) return false;
    nextStacks = Math.min(nextStacks, maxReducible);
    entity.maxHp -= nextStacks;
    entity.hp = Math.min(entity.hp, entity.maxHp);
  }

  if (existing) {
    if (def.stackable) {
      const prevStacks = existing.stacks;
      existing.stacks += nextStacks;
      if (def.maxStacks > 0) {
        existing.stacks = Math.min(existing.stacks, def.maxStacks);
      }
      if (type === EffectType.TEMP_MAX_HP) {
        const actualAdded = Math.max(0, existing.stacks - prevStacks);
        if (actualAdded > 0) {
          entity.maxHp += actualAdded;
        }
      }
    }
    if (type === EffectType.CORROSION && existing.stacks >= 30) {
      entity.maxHp = 0;
      entity.hp = 0;
    }
    return true;
  }

  // 新增效果
  const instanceStacks = def.maxStacks > 0 ? Math.min(nextStacks, def.maxStacks) : nextStacks;
  if (type === EffectType.TEMP_MAX_HP && instanceStacks > 0) {
    entity.maxHp += instanceStacks;
  }
  const instance: EffectInstance = {
    type,
    stacks: instanceStacks,
    polarity: def.polarity,
    lockDecayThisTurn: DECAY_GRACE_EFFECT_TYPES.has(type)
      ? !!options?.lockDecayThisTurn
      : undefined,
    restrictedTypes: type === EffectType.BIND ? undefined : options?.restrictedTypes,
    source: options?.source,
  };
  entity.effects.push(instance);
  if (type === EffectType.CORROSION && instance.stacks >= 30) {
    entity.maxHp = 0;
    entity.hp = 0;
  }
  return true;
}

/**
 * 移除实体身上的指定效果
 */
export function removeEffect(entity: EntityStats, type: EffectType): void {
  const effect = findEffect(entity, type);
  if (!effect) return;
  if (type === EffectType.TEMP_MAX_HP && effect.stacks > 0) {
    entity.maxHp = Math.max(0, entity.maxHp - effect.stacks);
    entity.hp = Math.min(entity.hp, entity.maxHp);
  }
  entity.effects = entity.effects.filter(e => e.type !== type);
}

/**
 * 减少效果层数（降至 0 时自动移除）
 */
export function reduceEffectStacks(entity: EntityStats, type: EffectType, amount: number = 1): void {
  const effect = findEffect(entity, type);
  if (!effect) return;
  if (type === EffectType.TEMP_MAX_HP) {
    const removed = Math.min(effect.stacks, Math.max(0, Math.floor(amount)));
    if (removed <= 0) return;
    effect.stacks -= removed;
    entity.maxHp = Math.max(0, entity.maxHp - removed);
    entity.hp = Math.min(entity.hp, entity.maxHp);
    if (effect.stacks <= 0) {
      entity.effects = entity.effects.filter(e => e.type !== type);
    }
    return;
  }
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
  opponentHpChange: number;
  isStunned: boolean;
  logs: string[];
  /** 需要为对手施加的效果（施加燃烧用） */
  applyToOpponent: Array<{ type: EffectType; stacks: number }>;
}

/**
 * 处理回合开始时所有效果触发
 * 调用顺序：中毒 → 燃烧 → 流血(-1) → 生命回复 → 性兴奋 → 元素适应体 → 元素皮层 → 实体化 → 白浊 → 施加燃烧 → 眩晕检查 → 魔力源泉 → 法力枯竭(最后清零)
 */
export function processOnTurnStart(entity: EntityStats): TurnStartResult {
  const result: TurnStartResult = {
    hpChange: 0,
    mpChange: 0,
    trueDamage: 0,
    opponentHpChange: 0,
    isStunned: false,
    logs: [],
    applyToOpponent: [],
  };

  // 中毒量
  const poisonAmount = getEffectStacks(entity, EffectType.POISON_AMOUNT);
  if (poisonAmount > 0) {
    if (poisonAmount >= entity.hp) {
      result.trueDamage += poisonAmount;
      removeEffect(entity, EffectType.POISON_AMOUNT);
      result.logs.push(`[中毒量] 中毒量(${poisonAmount}) ≥ 当前生命(${entity.hp})，造成 ${poisonAmount} 真实伤害并清空中毒量！`);
    }
  }

  // 燃烧
  const burnStacks = getEffectStacks(entity, EffectType.BURN);
  if (burnStacks > 0) {
    let burnDamage = burnStacks;
    const vulnerableStacks = getEffectStacks(entity, EffectType.VULNERABLE);
    if (vulnerableStacks > 0) {
      burnDamage += vulnerableStacks;
      result.logs.push(`[易伤] 燃烧伤害 +${vulnerableStacks}。`);
    }
    const temperatureDiffStacks = getEffectStacks(entity, EffectType.TEMPERATURE_DIFF);
    if (temperatureDiffStacks > 0) {
      burnDamage += temperatureDiffStacks;
      result.logs.push(`[温差] 燃烧伤害 +${temperatureDiffStacks}。`);
    }
    result.hpChange -= burnDamage;
    result.logs.push(`[燃烧] 损失 ${burnDamage} 点生命。`);
  }

  // 流血每回合 -1
  const bleedEffect = findEffect(entity, EffectType.BLEED);
  if (bleedEffect && bleedEffect.stacks > 0) {
    if (bleedEffect.lockDecayThisTurn) {
      bleedEffect.lockDecayThisTurn = false;
      result.logs.push('[流血] 新施加，本回合不衰减。');
    } else {
      reduceEffectStacks(entity, EffectType.BLEED);
      result.logs.push('[流血] 层数衰减。');
    }
  }

  // 生命回复
  const regenStacks = getEffectStacks(entity, EffectType.REGEN);
  if (regenStacks > 0) {
    result.hpChange += regenStacks;
    result.logs.push(`[生命回复] 回复 ${regenStacks} 点生命。`);
  }

  // 自修复：生命低于50%时，按层数回复生命并随机移除等量元素debuff；每累计3层回复计数增加2层生命上限削减
  const selfRepair = findEffect(entity, EffectType.SELF_REPAIR);
  if (selfRepair && selfRepair.stacks > 0 && entity.hp < entity.maxHp * 0.5) {
    const selfRepairStacks = Math.max(0, Math.floor(selfRepair.stacks));
    result.hpChange += selfRepairStacks;
    result.logs.push(`[自修复] 生命低于50%，回复 ${selfRepairStacks} 点生命。`);

    const removedByType = new Map<EffectType, number>();
    let remainToRemove = selfRepairStacks;
    while (remainToRemove > 0) {
      const available = ELEMENTAL_DEBUFF_TYPES.filter((type) => getEffectStacks(entity, type) > 0);
      if (available.length === 0) break;
      const picked = available[Math.floor(Math.random() * available.length)]!;
      reduceEffectStacks(entity, picked, 1);
      removedByType.set(picked, (removedByType.get(picked) ?? 0) + 1);
      remainToRemove -= 1;
    }
    const removedSummary = [...removedByType.entries()]
      .map(([type, count]) => `${EFFECT_REGISTRY[type]?.name ?? type} -${count}`)
      .join('，');
    if (removedSummary.length > 0) {
      result.logs.push(`[自修复] 随机移除元素debuff：${removedSummary}。`);
    } else {
      result.logs.push('[自修复] 未检测到可移除的元素debuff。');
    }

    const previousCount = Math.max(0, Math.floor(selfRepair.runtimeCounter ?? 0));
    const nextCount = previousCount + selfRepairStacks;
    selfRepair.runtimeCounter = nextCount;
    const triggerCount = Math.floor(nextCount / 3) - Math.floor(previousCount / 3);
    if (triggerCount > 0) {
      const maxHpReductionStacks = triggerCount * 2;
      const applied = applyEffect(entity, EffectType.MAX_HP_REDUCTION, maxHpReductionStacks, { source: 'effect:self_repair' });
      if (applied) {
        result.logs.push(`[自修复] 累计回复计数触发 ${triggerCount} 次：自身获得 ${maxHpReductionStacks} 层生命上限削减。`);
      }
    }
  }

  // 性兴奋：每回合开始时施加等同层数的疲劳
  const orgasmStacks = getEffectStacks(entity, EffectType.ORGASM);
  if (orgasmStacks > 0) {
    applyEffect(entity, EffectType.FATIGUE, orgasmStacks, { source: 'effect:orgasm' });
    result.logs.push(`[性兴奋] 触发：施加 ${orgasmStacks} 层疲劳。`);
  }

  // 元素适应体：有元素debuff时，随机移除2层并回复2点生命
  const elementalAdaptationStacks = getEffectStacks(entity, EffectType.ELEMENTAL_ADAPTATION);
  if (elementalAdaptationStacks > 0) {
    const hasElementalDebuff = ELEMENTAL_DEBUFF_TYPES.some((type) => getEffectStacks(entity, type) > 0);
    if (hasElementalDebuff) {
      const removedByType = new Map<EffectType, number>();
      let remainToRemove = 2;
      while (remainToRemove > 0) {
        const available = ELEMENTAL_DEBUFF_TYPES.filter((type) => getEffectStacks(entity, type) > 0);
        if (available.length === 0) break;
        const picked = available[Math.floor(Math.random() * available.length)]!;
        reduceEffectStacks(entity, picked, 1);
        removedByType.set(picked, (removedByType.get(picked) ?? 0) + 1);
        remainToRemove -= 1;
      }

      result.hpChange += 2;
      const removedSummary = [...removedByType.entries()]
        .map(([type, count]) => `${EFFECT_REGISTRY[type]?.name ?? type} -${count}`)
        .join('，');
      if (removedSummary.length > 0) {
        result.logs.push(`[元素适应体] 随机移除元素debuff：${removedSummary}；回复 2 点生命。`);
      } else {
        result.logs.push('[元素适应体] 回复 2 点生命。');
      }
    }
  }

  // 元素皮层：有元素debuff时，随机移除1层并回复1点生命
  const elementalCortexStacks = getEffectStacks(entity, EffectType.ELEMENTAL_CORTEX);
  if (elementalCortexStacks > 0) {
    const hasElementalDebuff = ELEMENTAL_DEBUFF_TYPES.some((type) => getEffectStacks(entity, type) > 0);
    if (hasElementalDebuff) {
      const available = ELEMENTAL_DEBUFF_TYPES.filter((type) => getEffectStacks(entity, type) > 0);
      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)]!;
        reduceEffectStacks(entity, picked, 1);
        result.logs.push(`[元素皮层] 随机移除元素debuff：${EFFECT_REGISTRY[picked]?.name ?? picked} -1；回复 1 点生命。`);
      } else {
        result.logs.push('[元素皮层] 回复 1 点生命。');
      }
      result.hpChange += 1;
    }
  }

  // 实体化：每回合-1；归零后清除非实体、生命回满、骰子范围+4
  const materializationEffect = findEffect(entity, EffectType.MATERIALIZATION);
  if (materializationEffect && materializationEffect.stacks > 0) {
    materializationEffect.stacks -= 1;
    if (materializationEffect.stacks <= 0) {
      removeEffect(entity, EffectType.MATERIALIZATION);
      removeEffect(entity, EffectType.NON_ENTITY);
      const healToFull = Math.max(0, entity.maxHp - entity.hp);
      if (healToFull > 0) {
        result.hpChange += healToFull;
      }
      entity.minDice += 4;
      entity.maxDice += 4;
      result.logs.push(`[实体化] 完成：清除非实体，生命恢复至上限，骰子范围提升（${entity.minDice}-${entity.maxDice}）。`);
    } else {
      result.logs.push(`[实体化] 层数衰减，剩余 ${materializationEffect.stacks}。`);
    }
  }

  // 白浊：为对手回复生命并施加侵蚀（无论是否实际回复到生命）
  const whiteTurbidStacks = getEffectStacks(entity, EffectType.WHITE_TURBID);
  if (whiteTurbidStacks > 0) {
    result.opponentHpChange += whiteTurbidStacks;
    result.applyToOpponent.push({ type: EffectType.CORROSION, stacks: whiteTurbidStacks });
    result.logs.push(`[白浊] 为对手回复 ${whiteTurbidStacks} 点生命并施加 ${whiteTurbidStacks} 层侵蚀。`);
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

  // 法力枯竭（在回合开始的其它法力变动后结算）
  if (hasEffect(entity, EffectType.MANA_DRAIN)) {
    const projectedMp = Math.max(0, entity.mp + result.mpChange);
    if (projectedMp > 0) {
      result.mpChange -= projectedMp;
    }
    result.logs.push(`[法力枯竭] 法力值被清零。`);
    reduceEffectStacks(entity, EffectType.MANA_DRAIN);
  }

  // 冰霜附加
  const frostAttachStacks = getEffectStacks(entity, EffectType.FROST_ATTACH);
  if (frostAttachStacks > 0) {
    result.applyToOpponent.push({ type: EffectType.COLD, stacks: frostAttachStacks });
    result.logs.push(`[冰霜附加] 为对手施加 ${frostAttachStacks} 层寒冷。`);
  }

  return result;
}

/**
 * 处理回合结束时所有效果触发
 * 调用顺序：束缚(-1) → 护甲(减半) → 禁言(-1) → 被操控(-1) → 眩晕(-1)
 */
export function processOnTurnEnd(entity: EntityStats): string[] {
  const logs: string[] = [];

  // 中毒：转化为中毒量，然后中毒-1
  const poisonStacks = getEffectStacks(entity, EffectType.POISON);
  if (poisonStacks > 0) {
    applyEffect(entity, EffectType.POISON_AMOUNT, poisonStacks);
    reduceEffectStacks(entity, EffectType.POISON, 1);
    logs.push(`[中毒] 本回合中毒量 +${poisonStacks}，中毒层数衰减 1。`);
  }

  // 束缚
  const bindEffect = findEffect(entity, EffectType.BIND);
  if (bindEffect && bindEffect.stacks > 0) {
    if (bindEffect.lockDecayThisTurn) {
      bindEffect.lockDecayThisTurn = false;
      logs.push('[束缚] 新施加，本回合不衰减。');
    } else {
      reduceEffectStacks(entity, EffectType.BIND);
      logs.push(`[束缚] 层数衰减。`);
    }
  }

  // 共损
  const coDamageEffect = findEffect(entity, EffectType.CO_DAMAGE);
  if (coDamageEffect && coDamageEffect.stacks > 0) {
    if (coDamageEffect.lockDecayThisTurn) {
      coDamageEffect.lockDecayThisTurn = false;
      logs.push('[共损] 新施加，本回合不衰减。');
    } else {
      reduceEffectStacks(entity, EffectType.CO_DAMAGE);
      logs.push('[共损] 层数衰减。');
    }
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

  // 禁言
  const silenceEffect = findEffect(entity, EffectType.SILENCE);
  if (silenceEffect && silenceEffect.stacks > 0) {
    if (silenceEffect.lockDecayThisTurn) {
      silenceEffect.lockDecayThisTurn = false;
      logs.push('[禁言] 新施加，本回合不衰减。');
    } else {
      reduceEffectStacks(entity, EffectType.SILENCE);
      logs.push(`[禁言] 层数衰减。`);
    }
  }

  // 被操控
  const controlledEffect = findEffect(entity, EffectType.CONTROLLED);
  if (controlledEffect && controlledEffect.stacks > 0) {
    if (controlledEffect.lockDecayThisTurn) {
      controlledEffect.lockDecayThisTurn = false;
      logs.push('[被操控] 新施加，本回合不衰减。');
    } else {
      reduceEffectStacks(entity, EffectType.CONTROLLED);
      logs.push('[被操控] 层数衰减。');
    }
  }

  // 坚固：1回合后清空
  if (hasEffect(entity, EffectType.STURDY)) {
    removeEffect(entity, EffectType.STURDY);
    logs.push(`[坚固] 回合结束后清空。`);
  }

  // 眩晕
  const stunEffect = findEffect(entity, EffectType.STUN);
  if (stunEffect && stunEffect.stacks > 0) {
    if (stunEffect.lockDecayThisTurn) {
      stunEffect.lockDecayThisTurn = false;
      logs.push('[眩晕] 新施加，本回合不衰减。');
    } else {
      reduceEffectStacks(entity, EffectType.STUN);
      logs.push(`[眩晕] 层数衰减。`);
    }
  }

  return logs;
}

// ═══════════════════════════════════════════════════════════════
//  卡牌使用限制检查
// ═══════════════════════════════════════════════════════════════

/**
 * 检查指定卡牌是否可使用（考虑束缚、被吞食效果）
 */
export function canPlayCard(
  entity: EntityStats,
  card: CardData,
  baseRawDice: number,
  options?: { controlledExpectedType?: CardType | null },
): { allowed: boolean; reason?: string } {
  // 无法打出
  if (card.traits.unplayable) {
    return { allowed: false, reason: '该卡牌当前无法打出。' };
  }

  // 眩晕：完全不能出牌
  if (hasEffect(entity, EffectType.STUN)) {
    return { allowed: false, reason: '眩晕状态，无法行动。' };
  }

  // 束缚：固定限制物理/闪避
  const bindEffect = findEffect(entity, EffectType.BIND);
  if (bindEffect) {
    const restrictedTypes = ['物理', '闪避'] as CardType[];
    if (restrictedTypes.includes(card.type)) {
      return { allowed: false, reason: `束缚中，无法使用${card.type}类型卡牌。` };
    }
  }

  // 被吞食：基础骰值≤3 时禁用物理/魔法/闪避
  if (hasEffect(entity, EffectType.DEVOUR) && baseRawDice <= 3) {
    if (
      card.type === '物理' as CardType
      || card.type === '魔法' as CardType
      || card.type === '闪避' as CardType
    ) {
      return { allowed: false, reason: `被吞食效果生效（基础骰值≤3），无法使用${card.type}卡牌。` };
    }
  }

  // 法力不足（仅魔法卡有费用）
  if (card.type === ('魔法' as CardType) && card.manaCost > entity.mp) {
    return { allowed: false, reason: `法力不足（需要${card.manaCost}，当前${entity.mp}）。` };
  }

  // 禁言：禁用魔法
  if (card.type === ('魔法' as CardType) && hasEffect(entity, EffectType.SILENCE)) {
    return { allowed: false, reason: '禁言中，无法使用魔法卡牌。' };
  }

  // 被操控：只能使用与对手意图同类型卡牌
  if (hasEffect(entity, EffectType.CONTROLLED) && options?.controlledExpectedType) {
    if (card.type !== options.controlledExpectedType) {
      return { allowed: false, reason: `被操控中，仅可使用${options.controlledExpectedType}卡牌或跳过。` };
    }
  }

  return { allowed: true };
}
