// ═══════════════════════════════════════════════════════════════
//  敌人库 — 所有敌人的中央注册表
//  战斗界面从 MVU 变量 _对手名称 中读取敌人名，
//  再用 getEnemyByName() 查找对应 EnemyDefinition。
// ═══════════════════════════════════════════════════════════════

import { EffectType, type EnemyAIContext, type EnemyDefinition } from '../types';
import { getCardByName } from './cardRegistry';

// ── 工具函数 ──────────────────────────────────────────────────

/** 从可用牌组中按名称取牌，找不到则返回牌组第一张 */
function pickCard(ctx: EnemyAIContext, name: string) {
  return ctx.deck.find(c => c.name === name) ?? ctx.deck[0]!;
}

/** 按概率从加权选项中随机选择 */
function weightedRandom<T>(options: { value: T; weight: number }[]): T {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let roll = Math.random() * total;
  for (const opt of options) {
    roll -= opt.weight;
    if (roll <= 0) return opt.value;
  }
  return options[options.length - 1]!.value;
}

// ═══════════════════════════════════════════════════════════════
//  敌人定义
// ═══════════════════════════════════════════════════════════════

// ── 游荡粘液球 ────────────────────────────────────────────────

const 游荡粘液球: EnemyDefinition = {
  name: '游荡粘液球',

  stats: {
    hp: 12,
    maxHp: 12,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.REGEN, stacks: 1, polarity: 'buff' },
    ],
  },

  deck: [
    getCardByName('冲撞')!,
    getCardByName('粘液闪避')!,
    getCardByName('回复')!,
  ],

  /**
   * AI 逻辑：
   * - HP > 40%：70% 冲撞 / 30% 粘液闪避
   * - HP 首次 ≤ 40%（flags.hasUsedHeal !== true）：使用回复
   * - HP ≤ 40% 且已用过回复：回退到冲撞/粘液闪避
   */
  selectCard(ctx: EnemyAIContext) {
    const hpRatio = ctx.enemyStats.hp / ctx.enemyStats.maxHp;

    if (hpRatio <= 0.4 && !ctx.flags.hasUsedHeal) {
      ctx.flags.hasUsedHeal = true;
      return pickCard(ctx, '回复');
    }

    const chosen = weightedRandom([
      { value: '冲撞', weight: 70 },
      { value: '粘液闪避', weight: 30 },
    ]);
    return pickCard(ctx, chosen);
  },
};

// ── 荧光蛾 ────────────────────────────────────────────────────

const 荧光蛾: EnemyDefinition = {
  name: '荧光蛾',

  stats: {
    hp: 5,
    maxHp: 5,
    mp: 1,
    minDice: 1,
    maxDice: 4,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
      { type: EffectType.SWARM, stacks: 3, polarity: 'buff' },
    ],
  },

  deck: [
    getCardByName('催情鳞粉')!,
    getCardByName('敏感化标记')!,
    getCardByName('荧光信息素')!,
    getCardByName('群体效应')!,
  ],

  /**
   * AI 逻辑：
   * - MP >= 6：使用【群体效应】
   * - MP < 6：从【催情鳞粉 / 敏感化标记 / 荧光信息素】中等概率随机一张
   */
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 6) {
      return pickCard(ctx, '群体效应');
    }

    const normalCards = ['催情鳞粉', '敏感化标记', '荧光信息素'] as const;
    const chosen = normalCards[Math.floor(Math.random() * normalCards.length)]!;
    return pickCard(ctx, chosen);
  },
};

// ── 根须潜行者 ────────────────────────────────────────────────

const 根须潜行者: EnemyDefinition = {
  name: '根须潜行者',

  stats: {
    hp: 10,
    maxHp: 10,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.SWARM, stacks: 2, polarity: 'buff' },
    ],
  },

  deck: [
    getCardByName('震动感知')!,
    getCardByName('润滑分泌')!,
    getCardByName('渗透攀爬')!,
  ],

  /** AI 逻辑：三张卡等概率随机使用一张 */
  selectCard(ctx: EnemyAIContext) {
    const pool = ['震动感知', '润滑分泌', '渗透攀爬'] as const;
    const chosen = pool[Math.floor(Math.random() * pool.length)]!;
    return pickCard(ctx, chosen);
  },
};

// ── 敌人注册表 ────────────────────────────────────────────────

/**
 * 全部敌人以 name 为键存储。
 * 后续新增敌人只需在此处添加并注册即可。
 */
const ENEMY_REGISTRY: ReadonlyMap<string, EnemyDefinition> = new Map<string, EnemyDefinition>([
  [游荡粘液球.name, 游荡粘液球],
  [荧光蛾.name, 荧光蛾],
  [根须潜行者.name, 根须潜行者],
]);

// ── 公共 API ────────────────────────────────────────────────────

/** 根据名称查找敌人定义，不存在则返回 undefined */
export function getEnemyByName(name: string): EnemyDefinition | undefined {
  return ENEMY_REGISTRY.get(name);
}

/** 获取所有已注册的敌人名称 */
export function getAllEnemyNames(): string[] {
  return [...ENEMY_REGISTRY.keys()];
}
