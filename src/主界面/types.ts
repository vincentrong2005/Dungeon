// ═══════════════════════════════════════════════════════════════
//  核心战斗系统 — 数据类型定义
// ═══════════════════════════════════════════════════════════════

// ── 卡牌类型枚举 ──────────────────────────────────────────────
export enum CardType {
  PHYSICAL = '物理',
  MAGIC = '魔法',
  FUNCTION = '功能',
  DODGE = '闪避',
  CURSE = '诅咒',
}

export type CardRarity = '普通' | '稀有';

// ── 伤害逻辑模式 ──────────────────────────────────────────────
/** 伤害计算模式 */
export type DamageMode = 'relative' | 'fixed' | 'mixed';

/**
 * 伤害逻辑定义
 * - relative: 伤害 = FinalPoint * scale + scaleAddition
 * - fixed:    伤害 = value（固定值，与点数无关）
 * - mixed:    伤害 = baseValue + FinalPoint * scale + scaleAddition
 */
export interface DamageLogic {
  mode: DamageMode;
  /** relative / mixed: 乘算系数，伤害 += FinalPoint * scale */
  scale?: number;
  /** relative / mixed: 加算值，伤害 += scaleAddition */
  scaleAddition?: number;
  /** fixed: 固定伤害值 */
  value?: number;
  /** mixed: 基础伤害值（与点数无关的底数） */
  baseValue?: number;
}

// ── 卡牌特性 ──────────────────────────────────────────────────
export type RerollTarget = 'self' | 'enemy' | 'none';

export interface CardTraits {
  /** 连击：打出后不消耗本回合常规行动次数 */
  combo: boolean;
  /** 重掷目标 */
  reroll: RerollTarget;
  /** 过牌：配合连击实现快速过牌 */
  draw: boolean;
  /** 无法打出（通常用于诅咒卡）。 */
  unplayable?: boolean;
  /** 销毁：拼点胜利时，临时移除对方拼点失败的卡牌（仅本次战斗生效）。 */
  destroyOnClashWin?: boolean;
  /** 插入：卡牌生效后向对方牌库插入指定卡牌。 */
  insertCardsToEnemyDeck?: string[];
  /** 移除：打出后自我销毁（不进入弃牌堆）。 */
  purgeOnUse?: boolean;
}

// ── 卡牌点数计算参数 ──────────────────────────────────────────
export interface CardCalculation {
  /** 点数乘算系数，默认 1.0 */
  multiplier: number;
  /** 点数加算值，默认 0 */
  addition: number;
}

// ── 卡牌附带效果（打出时触发） ─────────────────────────────────

/** 效果数值来源 */
export type EffectValueMode = 'fixed' | 'point_scale' | 'max_hp_percent';
/** 卡牌附带效果触发时机 */
export type CardEffectTrigger = 'on_use' | 'on_dodge_success' | 'on_opponent_skip';

/** 卡牌打出时附带的效果 */
export interface CardEffect {
  /** 触发时机（默认 on_use） */
  triggers?: CardEffectTrigger[];

  /** 效果类别 */
  kind:
    | 'apply_buff'     // 为目标施加 Buff/Debuff
    | 'heal'           // 回复生命
    | 'restore_mana'   // 回复魔力
    | 'cleanse';       // 清除自身指定类型的 Debuff

  // ── apply_buff 专用 ──
  /** 施加的效果类型（kind = apply_buff 时必填） */
  effectType?: EffectType;
  /** 目标：self = 使用者，enemy = 对方 */
  target?: 'self' | 'enemy';
  /** 束缚专用：限制的卡牌类型 */
  restrictedTypes?: CardType[];

  // ── 数值计算 ──
  /** 数值模式：fixed = 固定值，point_scale = FinalPoint * scale，max_hp_percent = 目标最大生命值 * scale */
  valueMode: EffectValueMode;
  /** fixed 模式下的固定值 */
  fixedValue?: number;
  /** point_scale / max_hp_percent 模式下的系数 */
  scale?: number;

  // ── cleanse 专用 ──
  /** 要清除的 Debuff 类型列表（kind = cleanse 时使用，为空则清除全部） */
  cleanseTypes?: EffectType[];
}

// ── 卡牌数据 ──────────────────────────────────────────────────
export interface CardData {
  id: string;
  name: string;
  type: CardType;
  /** 卡牌类别（大分类）：基础、敌人、火魔法、冰魔法等 */
  category: string;
  /** 稀有度 */
  rarity: CardRarity;
  /** 法力消耗（仅 Type == 魔法 时有效，其余为 0） */
  manaCost: number;
  /** 点数计算参数 */
  calculation: CardCalculation;
  /** 伤害逻辑 */
  damageLogic: DamageLogic;
  /** 攻击段数（仅攻击牌生效，默认1） */
  hitCount?: number;
  /** 特性开关 */
  traits: CardTraits;
  /** 打出时附带的效果列表（按顺序执行） */
  cardEffects: CardEffect[];
  /** 描述文本 */
  description: string;
  /** 负面效果：卡牌生效后记录到战斗后写入的 _负面状态（仅对玩家结算） */
  negativeEffect?: string;
  /** 法力汲取：卡牌生效后吸收对方对应数值法力并恢复自身；不足部分改为扣除对方生命 */
  manaDrain?: number;
  /** 无视闪避：对闪避牌时不进入闪避拼点，直接生效 */
  ignoreDodge?: boolean;
  /**
   * 自伤：卡牌生效后对自己造成伤害（真实伤害或生命上限削减）
   * - number：固定生命伤害
   * - object：可配置固定/百分比 + 生命/生命上限
   */
  selfDamage?: number | CardSelfDamageConfig;
  /** 卡牌图片（可选） */
  image?: string;
}

/** 自伤配置 */
export interface CardSelfDamageConfig {
  /** 数值（fixed=固定值；percent=百分比数值，例如 50 表示 50%） */
  value: number;
  /** fixed=固定值；percent=百分比 */
  mode?: 'fixed' | 'percent';
  /** hp=生命值；maxHp=生命上限 */
  target?: 'hp' | 'maxHp';
}

// ── 效果/Buff 类型枚举 ───────────────────────────────────────
export enum EffectType {
  /** 结界 — 伤害免疫，触发后层数 -1 */
  BARRIER = '结界',
  /** 护甲 — 伤害减免 */
  ARMOR = '护甲',
  /** 束缚 — 限制指定类型卡牌使用 */
  BIND = '束缚',
  /** 吞食 — 基础点数 ≤3 时禁用物理/闪避 */
  DEVOUR = '吞食',
  /** 中毒 — 致死判定 */
  POISON = '中毒',
  /** 中毒量 — 与当前生命比较的判定值 */
  POISON_AMOUNT = '\u4e2d\u6bd2\u91cf',
  /** 侵蚀 — 达到30层时将目标生命上限归0（无视复活） */
  CORROSION = '侵蚀',
  /** 燃烧 — 每回合固定减少生命 */
  BURN = '燃烧',
  /** 流血 — 拼点时造成真实伤害 */
  BLEED = '流血',
  /** 易伤 — 增加受到伤害的系数（加算） */
  VULNERABLE = '易伤',
  /** 生命回复 — 每回合回复生命 */
  REGEN = '生命回复',
  /** 白浊 — 每回合开始时为对手回复生命并施加侵蚀 */
  WHITE_TURBID = '白浊',
  /** 施加燃烧 — 每回合为双方施加一层燃烧 */
  IGNITE_AURA = '施加燃烧',
  /** 眩晕 — 无法执行任何行动 */
  STUN = '眩晕',
  /** 蓄力 — 下次骰子点数增加 */
  CHARGE = '蓄力',
  /** 疲劳 — 下次骰子点数减少并清空层数 */
  FATIGUE = '疲劳',
  /** 寒冷 — 降低造成的伤害，攻击后层数减半 */
  COLD = '寒冷',
  /** 非生物 — 免疫流血与中毒 */
  NON_LIVING = '非生物',
  /** 非实体 — 受到物理伤害减半，受到魔法伤害增加50%（仅直接伤害） */
  NON_ENTITY = '非实体',
  /** 虚幻之躯 — 受到物理伤害减半（仅直接伤害） */
  ILLUSORY_BODY = '虚幻之躯',
  /** 生命上限削减 — 立即降低最大生命值 */
  MAX_HP_REDUCTION = '生命上限削减',
  /** 点数成长（大）— 每3回合最大骰子点数+1 */
  POINT_GROWTH_BIG = '点数成长（大）',
  /** 点数成长（小）— 每3回合最小骰子点数+1 */
  POINT_GROWTH_SMALL = '点数成长（小）',
  /** 法力枯竭 — 每回合清零法力 */
  MANA_DRAIN = '法力枯竭',
  /** 魔力源泉 — 每回合开始魔力+层数 */
  MANA_SPRING = '魔力源泉',
  /** 群集 — 生命值归零时消耗1层并复活至满血 */
  SWARM = '群集',
  /** 不屈 — 生命值归零时消耗1层并恢复至1点生命 */
  INDOMITABLE = '不屈',
  /** 窥视禁忌 — 仅在出牌阶段干扰对方骰子UI显示（永久debuff） */
  PEEP_FORBIDDEN = '窥视禁忌',
  /** 盲目之蚀 — 仅在出牌阶段干扰自身骰子UI显示（永久debuff） */
  BLIND_ASH = '盲目之蚀',
  /** 认知干涉 — 仅在出牌阶段隐藏对方意图卡信息（永久debuff） */
  COGNITIVE_INTERFERENCE = '认知干涉',
  /** 失忆迷雾 — 仅在出牌阶段隐藏自身手牌名称/描述（永久debuff） */
  MEMORY_FOG = '失忆迷雾',
  /** 禁言 — 无法使用魔法卡牌，每回合结束层数-1 */
  SILENCE = '禁言',
  /** 坚固 — 每次受击固定减伤，持续1回合（回合结束清空） */
  STURDY = '坚固',
  /** 电击 — 每次法力减少时，损失等同层数生命并层数-1 */
  SHOCK = '电击',
  /** 火焰附加 — 攻击卡命中后为对手施加燃烧 */
  FLAME_ATTACH = '火焰附加',
  /** 毒素附加 — 魔法卡命中后为对手施加中毒 */
  POISON_ATTACH = '毒素附加',
  /** 毒素蔓延 — 对手每次打出物理牌时获得中毒 */
  TOXIN_SPREAD = '毒素蔓延',
  /** 伏击 — 对手打出物理/闪避牌时施加1层束缚，触发后自身层数-1 */
  AMBUSH = '伏击',
  /** 冰霜附加 — 每回合开始时为对手施加寒冷 */
  FROST_ATTACH = '冰霜附加',
  /** 血刃附加 — 拼点时为对手施加流血 */
  BLOODBLADE_ATTACH = '血刃附加',
  /** 雷电附加 — 每次成功闪避时为对手施加电击 */
  LIGHTNING_ATTACH = '雷电附加',
  /** 荆棘 — 反弹50%物理直接伤害 */
  THORNS = '荆棘',
}

/** 效果极性分类 */
export type EffectPolarity = 'buff' | 'debuff' | 'mixed' | 'trait' | 'special';

// ── 效果运行时实例 ────────────────────────────────────────────
export interface EffectInstance {
  type: EffectType;
  /** 当前层数 / 强度 */
  stacks: number;
  /** 效果极性 */
  polarity: EffectPolarity;
  /** 本回合新施加，回合结束时先不衰减（用于束缚等） */
  lockDecayThisTurn?: boolean;
  /**
   * 束缚特有：限制的卡牌类型列表
   * 例如 ['物理', '闪避'] 表示该束缚禁止使用物理和闪避牌
   */
  restrictedTypes?: CardType[];
  /** 效果来源标识（可选，调试/追溯用） */
  source?: string;
}

// ── 游戏阶段枚举 ──────────────────────────────────────────────
export enum GamePhase {
  EXPLORE = 'EXPLORE',
  COMBAT = 'COMBAT',
}

// ── 战斗阶段枚举（状态机） ────────────────────────────────────
export enum CombatPhase {
  /** 回合开始：触发回合开始效果 */
  TURN_START = 'TURN_START',
  /** 抽牌阶段 */
  DRAW_PHASE = 'DRAW_PHASE',
  /** 敌人意图预告 */
  INTENT_PREVIEW = 'INTENT_PREVIEW',
  /** 玩家出牌输入 */
  PLAYER_INPUT = 'PLAYER_INPUT',
  /** 结算阶段 */
  RESOLUTION = 'RESOLUTION',
  /** 弃牌阶段 */
  DISCARD_PHASE = 'DISCARD_PHASE',
  /** 回合结束：触发回合结束效果 */
  TURN_END = 'TURN_END',
  /** 战斗胜利 */
  WIN = 'WIN',
  /** 战斗失败 */
  LOSE = 'LOSE',
}

// ── 实体属性 ──────────────────────────────────────────────────
export interface EntityStats {
  hp: number;
  maxHp: number;
  mp: number;
  /** 骰子范围 */
  minDice: number;
  maxDice: number;
  /** 当前身上的效果列表 */
  effects: EffectInstance[];
}

// ── 拼点结果 ──────────────────────────────────────────────────
export type ClashOutcome = 'player_win' | 'enemy_win' | 'draw' | 'dodge_success' | 'no_clash';

export interface ClashResult {
  outcome: ClashOutcome;
  playerFinalPoint: number;
  enemyFinalPoint: number;
  message: string;
}

// ── 战斗状态（完整运行时快照） ─────────────────────────────────
export interface CombatState {
  turn: number;
  phase: CombatPhase;
  /** 本回合剩余常规行动次数 */
  actionsRemaining: number;

  // 骰子
  playerBaseDice: number;
  enemyBaseDice: number;

  // 牌区
  playerHand: CardData[];
  playerDeck: CardData[];
  discardPile: CardData[];

  // 敌人
  enemyDeck: CardData[];
  enemyDiscard: CardData[];
  enemyIntentCard: CardData | null;
  enemyPredictedPoint: number;

  // 玩家选牌
  playerSelectedCard: CardData | null;

  // 上一张打出的牌（用于"复制上一张"等特殊效果）
  lastPlayedCard: CardData | null;

  // 战斗日志
  logs: string[];
}

// ── 圣遗物修正接口（框架预留） ────────────────────────────────
export interface RelicModifiers {
  /** 全局乘算 */
  globalMultiplier: number;
  /** 全局加算 */
  globalAddition: number;
}

// ── 点数计算上下文 ────────────────────────────────────────────
export interface PointCalculationContext {
  baseDice: number;
  card: CardData;
  entityEffects: EffectInstance[];
  relicModifiers: RelicModifiers;
}

// ── 伤害计算上下文 ────────────────────────────────────────────
export interface DamageCalculationContext {
  finalPoint: number;
  card: CardData;
  attackerEffects: EffectInstance[];
  defenderEffects: EffectInstance[];
  relicModifiers: RelicModifiers;
  /** 是否为真实伤害（无视防御） */
  isTrueDamage?: boolean;
}

// ── 敌人 AI 与定义 ────────────────────────────────────────────

/** 敌人 AI 决策上下文 — 提供完整战斗状态 */
export interface EnemyAIContext {
  /** 敌人自身属性（含 effects） */
  enemyStats: Readonly<EntityStats>;
  /** 玩家属性（含 effects） */
  playerStats: Readonly<EntityStats>;
  /** 当前可用牌 */
  deck: CardData[];
  /** 当前回合数 */
  turn: number;
  /**
   * 自定义状态标记（各敌人自行使用）
   * 例如 { hasUsedHeal: false } 表示是否已使用过回复
   */
  flags: Record<string, any>;
}

/**
 * 敌人出牌选择函数
 * 每个敌人拥有完全独立的判定逻辑，
 * 可根据双方血量、蓝量、效果状态、回合数等任意条件决策。
 */
export type EnemyAISelectCard = (ctx: EnemyAIContext) => CardData;

/** 敌人定义 */
export interface EnemyDefinition {
  /** 敌人名称（注册表键） */
  name: string;
  /** 基础属性 */
  stats: EntityStats;
  /** 敌人的牌组 */
  deck: CardData[];
  /** 独立的出牌 AI 函数 */
  selectCard: EnemyAISelectCard;
}
