import { CardType, EffectType, type CardData, type EntityStats } from '../types';

export type RelicRarity = '普通' | '稀有' | '传奇';
export type RelicCategory = '基础' | '燃烧';

export type RelicSide = 'player' | 'enemy';
export type RelicFloatKind = 'shield' | 'mana' | 'heal';

export interface RelicApplyEffectOptions {
  restrictedTypes?: CardType[];
  source?: string;
  lockDecayThisTurn?: boolean;
}

interface RelicSharedHookContext {
  count: number;
  side: RelicSide;
  self: EntityStats;
  opponent: EntityStats;
  state: Record<string, unknown>;
  addLog: (message: string) => void;
  hasRelic: (id: string) => boolean;
  getRelicCount: (id: string) => number;
  addStatusEffect: (
    side: RelicSide,
    effectType: EffectType,
    stacks: number,
    options?: RelicApplyEffectOptions,
  ) => boolean;
  addArmor: (side: RelicSide, amount: number) => number;
  restoreMana: (side: RelicSide, amount: number) => number;
  heal: (
    side: RelicSide,
    amount: number,
    options?: { overflowToArmor?: boolean },
  ) => { healed: number; overflow: number };
  addRerollCharges: (side: RelicSide, amount: number) => void;
  getRerollCharges: (side: RelicSide) => number;
}

export interface RelicLifecycleHookContext extends RelicSharedHookContext {}

export interface RelicPointHookContext {
  count: number;
  side: RelicSide;
  card: CardData;
  baseDice: number;
  currentPoint: number;
  self: EntityStats;
  opponent: EntityStats;
  state: Record<string, unknown>;
  isPreview: boolean;
  addLog: (message: string) => void;
  hasRelic: (id: string) => boolean;
  getRelicCount: (id: string) => number;
}

export interface RelicDiceClickHookContext {
  count: number;
  side: RelicSide;
  currentDice: number;
  minDice: number;
  maxDice: number;
  state: Record<string, unknown>;
  roll: (min: number, max: number) => number;
  consumeRerollCharge: (side: RelicSide, amount?: number) => boolean;
  getRerollCharges: (side: RelicSide) => number;
  addLog: (message: string) => void;
}

export interface RelicBeforeApplyEffectHookContext extends RelicSharedHookContext {
  targetSide: RelicSide;
  target: EntityStats;
  effectType: EffectType;
  stacks: number;
  source?: string;
  restrictedTypes?: CardType[];
}

export interface RelicBurnDamageHookContext extends RelicSharedHookContext {
  targetSide: RelicSide;
  target: EntityStats;
  turn: number;
  burnStacks: number;
  damage: number;
  isTrueDamage: boolean;
}

export interface RelicAfterBurnDamageTakenHookContext extends RelicSharedHookContext {
  targetSide: RelicSide;
  target: EntityStats;
  turn: number;
  burnStacks: number;
  damage: number;
  isTrueDamage: boolean;
}

export interface RelicHitHookContext extends RelicSharedHookContext {
  sourceSide: RelicSide;
  targetSide: RelicSide;
  source: EntityStats;
  target: EntityStats;
  card: CardData;
  finalPoint: number;
  hitIndex: number;
  hitCount: number;
  attemptedDamage: number;
  actualDamage: number;
}

export interface RelicHooks {
  onBattleStart?: (ctx: RelicLifecycleHookContext) => void;
  onTurnStart?: (ctx: RelicLifecycleHookContext) => void;
  onTurnEnd?: (ctx: RelicLifecycleHookContext) => void;
  onDeckShuffle?: (ctx: RelicLifecycleHookContext) => void;
  modifyFinalPoint?: (ctx: RelicPointHookContext) => number;
  onDiceClick?: (ctx: RelicDiceClickHookContext) => number | null;
  onBeforeApplyEffect?: (ctx: RelicBeforeApplyEffectHookContext) => boolean | void;
  onBeforeBurnDamage?: (ctx: RelicBurnDamageHookContext) => void;
  onAfterBurnDamageTaken?: (ctx: RelicAfterBurnDamageTakenHookContext) => void;
  onAfterHitDealt?: (ctx: RelicHitHookContext) => void;
  onAfterHitTaken?: (ctx: RelicHitHookContext) => void;
}

export interface RelicData {
  id: string;
  name: string;
  rarity: RelicRarity;
  category: RelicCategory;
  effect: string;
  description: string;
  hooks?: RelicHooks;
}

export interface ResolvedRelicEntry {
  relic: RelicData;
  count: number;
}

const getStacks = (entity: EntityStats, effectType: EffectType) => (
  entity.effects.find((eff) => eff.type === effectType)?.stacks ?? 0
);

const RELIC_LIST: readonly RelicData[] = [
  {
    id: 'lucky_coin_small',
    name: '幸运硬币（小）',
    rarity: '普通',
    category: '基础',
    effect: '最小骰子点数 +1',
    description: '战斗开始时，最小骰子点数 +1。',
    hooks: {
      onBattleStart: ({ count, self, addLog }) => {
        self.minDice += count;
        addLog(`[幸运硬币（小）] 最小骰子点数 +${count}。`);
      },
    },
  },
  {
    id: 'lucky_coin_large',
    name: '幸运硬币（大）',
    rarity: '普通',
    category: '基础',
    effect: '最大骰子点数 +1',
    description: '战斗开始时，最大骰子点数 +1。',
    hooks: {
      onBattleStart: ({ count, self, addLog }) => {
        self.maxDice += count;
        addLog(`[幸运硬币（大）] 最大骰子点数 +${count}。`);
      },
    },
  },
  {
    id: 'red_notebook',
    name: '红色笔记',
    rarity: '普通',
    category: '基础',
    effect: '打出物理卡牌时最终点数 +1',
    description: '每次打出物理卡牌时，最终点数 +1。',
    hooks: {
      modifyFinalPoint: ({ card, currentPoint, count }) => {
        if (card.type !== CardType.PHYSICAL) return currentPoint;
        return currentPoint + count;
      },
    },
  },
  {
    id: 'blue_notebook',
    name: '蓝色笔记',
    rarity: '普通',
    category: '基础',
    effect: '打出魔法卡牌时最终点数 +1',
    description: '每次打出魔法卡牌时，最终点数 +1。',
    hooks: {
      modifyFinalPoint: ({ card, currentPoint, count }) => {
        if (card.type !== CardType.MAGIC) return currentPoint;
        return currentPoint + count;
      },
    },
  },
  {
    id: 'yellow_notebook',
    name: '黄色笔记',
    rarity: '普通',
    category: '基础',
    effect: '打出功能卡牌时最终点数 +1',
    description: '每次打出功能卡牌时，最终点数 +1。',
    hooks: {
      modifyFinalPoint: ({ card, currentPoint, count }) => {
        if (card.type !== CardType.FUNCTION) return currentPoint;
        return currentPoint + count;
      },
    },
  },
  {
    id: 'green_notebook',
    name: '绿色笔记',
    rarity: '普通',
    category: '基础',
    effect: '打出闪避卡牌时最终点数 -1',
    description: '每次打出闪避卡牌时，最终点数 -1。',
    hooks: {
      modifyFinalPoint: ({ card, currentPoint, count }) => {
        if (card.type !== CardType.DODGE) return currentPoint;
        return currentPoint - count;
      },
    },
  },
  {
    id: 'mana_residue',
    name: '魔力残渣',
    rarity: '普通',
    category: '基础',
    effect: '回合结束时，若自身魔力等于 0，则魔力 +1',
    description: '每回合结束时，若魔力为 0，则回复 1 点魔力。',
    hooks: {
      onTurnEnd: ({ count, side, self, restoreMana, addLog }) => {
        if (self.mp !== 0) return;
        const restored = restoreMana(side, count);
        if (restored > 0) {
          addLog(`[魔力残渣] 魔力为 0，回复 ${restored} 点魔力。`);
        }
      },
    },
  },
  {
    id: 'sanctuary_amulet',
    name: '庇护符',
    rarity: '普通',
    category: '基础',
    effect: '战斗开始时，获得一层“不屈”',
    description: '战斗开始时，获得 1 层不屈。',
    hooks: {
      onBattleStart: ({ count, side, addStatusEffect, addLog }) => {
        if (addStatusEffect(side, EffectType.INDOMITABLE, count, { source: 'relic:sanctuary_amulet' })) {
          addLog(`[庇护符] 获得 ${count} 层不屈。`);
        }
      },
    },
  },
  {
    id: 'simple_charm',
    name: '简易护符',
    rarity: '普通',
    category: '基础',
    effect: '每回合开始时，给自身增加 1 点护甲',
    description: '每回合开始时，获得 1 点护甲。',
    hooks: {
      onTurnStart: ({ count, side, addArmor, addLog }) => {
        const gained = addArmor(side, count);
        if (gained > 0) {
          addLog(`[简易护符] 获得 ${gained} 点护甲。`);
        }
      },
    },
  },
  {
    id: 'reset_button',
    name: '重置按钮',
    rarity: '普通',
    category: '基础',
    effect: '每场战斗增加 6 次重掷自身骰子的机会',
    description: '战斗开始时获得 6 次重掷机会；有次数时点击自己的骰子可重掷。',
    hooks: {
      onBattleStart: ({ count, side, addRerollCharges, getRerollCharges, addLog }) => {
        const gained = count * 6;
        addRerollCharges(side, gained);
        addLog(`[重置按钮] 获得 ${gained} 次重掷（当前 ${getRerollCharges(side)}）。`);
      },
      onDiceClick: ({ count, side, minDice, maxDice, roll, consumeRerollCharge, getRerollCharges, addLog }) => {
        if (count <= 0) return null;
        if (!consumeRerollCharge(side, 1)) return null;
        const value = roll(minDice, maxDice);
        addLog(`[重置按钮] 触发重掷，剩余 ${getRerollCharges(side)} 次。`);
        return value;
      },
    },
  },
  {
    id: 'energy_candy',
    name: '能量糖果',
    rarity: '普通',
    category: '基础',
    effect: '每当洗牌（弃牌堆重入抽牌堆）时，回复 1 点魔力',
    description: '每次洗牌时，回复 1 点魔力。',
    hooks: {
      onDeckShuffle: ({ count, side, restoreMana, addLog }) => {
        const restored = restoreMana(side, count);
        if (restored > 0) {
          addLog(`[能量糖果] 洗牌触发，回复 ${restored} 点魔力。`);
        }
      },
    },
  },
  {
    id: 'simple_shield',
    name: '简易护盾',
    rarity: '普通',
    category: '基础',
    effect: '战斗开始时获得 10 点护甲',
    description: '战斗开始时，获得 10 点护甲。',
    hooks: {
      onBattleStart: ({ count, side, addArmor, addLog }) => {
        const gained = addArmor(side, 10 * count);
        if (gained > 0) {
          addLog(`[简易护盾] 获得 ${gained} 点护甲。`);
        }
      },
    },
  },
  {
    id: 'pure_water',
    name: '洁净之水',
    rarity: '普通',
    category: '基础',
    effect: '战斗开始时回复 8 点血量，多余回复转化为等量护甲',
    description: '战斗开始时，回复 8 点生命；溢出治疗转化为等量护甲。',
    hooks: {
      onBattleStart: ({ count, side, heal, addLog }) => {
        const { healed, overflow } = heal(side, 8 * count, { overflowToArmor: true });
        addLog(`[洁净之水] 回复 ${healed} 点生命，转化 ${overflow} 点护甲。`);
      },
    },
  },
  {
    id: 'oily_grease',
    name: '易燃油脂',
    rarity: '普通',
    category: '燃烧',
    effect: '战斗中首次命中敌人时为敌人施加 2 层燃烧',
    description: '本场战斗首次命中敌人时，为敌人施加 2 层燃烧。',
    hooks: {
      onAfterHitDealt: ({ count, side, targetSide, actualDamage, state, addStatusEffect, addLog }) => {
        if (targetSide === side) return;
        if (actualDamage <= 0) return;
        if (state['triggered'] === true) return;
        state['triggered'] = true;
        const stacks = 2 * count;
        if (addStatusEffect(targetSide, EffectType.BURN, stacks, { source: 'relic:oily_grease' })) {
          addLog(`[易燃油脂] 首次命中触发，对敌人施加 ${stacks} 层燃烧。`);
        }
      },
    },
  },
  {
    id: 'sunglasses',
    name: '墨镜',
    rarity: '稀有',
    category: '燃烧',
    effect: '自身免疫眩晕，开局时为对手施加一回合眩晕',
    description: '自身不会被施加眩晕；战斗开始时使对手眩晕 1 回合。',
    hooks: {
      onBattleStart: ({ count, side, addStatusEffect, addLog }) => {
        const targetSide: RelicSide = side === 'player' ? 'enemy' : 'player';
        if (addStatusEffect(targetSide, EffectType.STUN, Math.max(1, count), { source: 'relic:sunglasses' })) {
          addLog('[墨镜] 战斗开始使对手进入眩晕。');
        }
      },
      onBeforeApplyEffect: ({ side, targetSide, effectType, addLog }) => {
        if (targetSide !== side) return;
        if (effectType !== EffectType.STUN) return;
        addLog('[墨镜] 免疫眩晕。');
        return false;
      },
    },
  },
  {
    id: 'flame_ring',
    name: '火焰圆环',
    rarity: '稀有',
    category: '燃烧',
    effect: '自身受到敌人物理攻击时，对来源施加 1 层燃烧',
    description: '每次受到敌人物理攻击时，对来源施加 1 层燃烧。',
    hooks: {
      onAfterHitTaken: ({ count, side, sourceSide, targetSide, card, addStatusEffect, addLog }) => {
        if (targetSide !== side) return;
        if (sourceSide === side) return;
        if (card.type !== CardType.PHYSICAL) return;
        if (addStatusEffect(sourceSide, EffectType.BURN, count, { source: 'relic:flame_ring' })) {
          addLog(`[火焰圆环] 反击施加 ${count} 层燃烧。`);
        }
      },
    },
  },
  {
    id: 'fire_slime',
    name: '火焰史莱姆',
    rarity: '稀有',
    category: '燃烧',
    effect: '自己收到的燃烧伤害恒定为 2（优先于烈阳护符）',
    description: '自身受到燃烧伤害时，伤害固定为 2，并覆盖烈阳护符对自身的下限。',
    hooks: {
      onBeforeBurnDamage: (ctx) => {
        if (ctx.targetSide !== ctx.side) return;
        if (ctx.damage === 2) return;
        ctx.damage = 2;
      },
    },
  },
  {
    id: 'ember_seed',
    name: '余烬火种',
    rarity: '稀有',
    category: '燃烧',
    effect: '敌人最少拥有与余烬火种数量相同的燃烧层数',
    description: '战斗期间会维持敌人燃烧层数下限，最低值等于余烬火种数量。',
    hooks: {
      onBattleStart: ({ count, side, opponent, addStatusEffect, addLog }) => {
        const targetSide: RelicSide = side === 'player' ? 'enemy' : 'player';
        const current = getStacks(opponent, EffectType.BURN);
        const minimum = Math.max(1, count);
        const need = minimum - current;
        if (need > 0 && addStatusEffect(targetSide, EffectType.BURN, need, { source: 'relic:ember_seed' })) {
          addLog(`[余烬火种] 维持敌方至少 ${minimum} 层燃烧。`);
        }
      },
      onTurnStart: ({ count, side, opponent, addStatusEffect, addLog }) => {
        const targetSide: RelicSide = side === 'player' ? 'enemy' : 'player';
        const current = getStacks(opponent, EffectType.BURN);
        const minimum = Math.max(1, count);
        const need = minimum - current;
        if (need > 0 && addStatusEffect(targetSide, EffectType.BURN, need, { source: 'relic:ember_seed' })) {
          addLog(`[余烬火种] 维持敌方至少 ${minimum} 层燃烧。`);
        }
      },
    },
  },
  {
    id: 'phoenix_feather',
    name: '不死鸟之羽',
    rarity: '稀有',
    category: '燃烧',
    effect: '若玩家受到燃烧伤害，下一张打出的卡牌点数 +1',
    description: '玩家受到燃烧伤害后，下一张打出的卡牌点数 +1。',
    hooks: {
      onAfterBurnDamageTaken: ({ count, side, targetSide, damage, state, addLog }) => {
        if (targetSide !== side) return;
        if (damage <= 0) return;
        const current = Number(state['nextCardPointBonus'] ?? 0);
        const add = 1 * count;
        state['nextCardPointBonus'] = current + add;
        addLog(`[不死鸟之羽] 充能：下一张卡牌点数 +${current + add}。`);
      },
      modifyFinalPoint: ({ side, currentPoint, state, isPreview, addLog }) => {
        if (side !== 'player') return currentPoint;
        const bonus = Math.max(0, Math.floor(Number(state['nextCardPointBonus'] ?? 0)));
        if (bonus <= 0) return currentPoint;
        if (!isPreview) {
          state['nextCardPointBonus'] = 0;
          addLog(`[不死鸟之羽] 触发，点数 +${bonus}。`);
        }
        return currentPoint + bonus;
      },
    },
  },
  {
    id: 'rekindle_core',
    name: '复燃核心',
    rarity: '稀有',
    category: '燃烧',
    effect: '若玩家受到燃烧伤害，自身回复 1 点魔力',
    description: '每次玩家受到燃烧伤害时，回复 1 点魔力。',
    hooks: {
      onAfterBurnDamageTaken: ({ count, side, targetSide, damage, restoreMana, addLog }) => {
        if (targetSide !== side) return;
        if (damage <= 0) return;
        const restored = restoreMana(side, count);
        if (restored > 0) {
          addLog(`[复燃核心] 触发，回复 ${restored} 点魔力。`);
        }
      },
    },
  },
  {
    id: 'everlasting_fuel',
    name: '不灭薪柴',
    rarity: '传奇',
    category: '燃烧',
    effect: '结算燃烧伤害时，改为造成等量真实伤害',
    description: '燃烧伤害改为真实伤害（无视护甲与结界）。',
    hooks: {
      onBeforeBurnDamage: (ctx) => {
        if (ctx.damage <= 0) return;
        ctx.isTrueDamage = true;
      },
    },
  },
  {
    id: 'sun_charm',
    name: '烈阳护符',
    rarity: '传奇',
    category: '燃烧',
    effect: '双方收到的燃烧伤害最少为当前回合数',
    description: '双方受到燃烧伤害时，伤害至少为护符数量*当前回合数。',
    hooks: {
      onBeforeBurnDamage: (ctx) => {
        if (ctx.targetSide === ctx.side && ctx.hasRelic('fire_slime')) {
          return;
        }
        const minDamage = Math.max(1, ctx.turn * Math.max(1, ctx.count));
        if (ctx.damage >= minDamage) return;
        ctx.damage = minDamage;
      },
    },
  },
];

const RELIC_BY_ID = new Map(RELIC_LIST.map((relic) => [relic.id, relic]));
const RELIC_BY_NAME = new Map(RELIC_LIST.map((relic) => [relic.name, relic]));

export function getAllRelics(): readonly RelicData[] {
  return RELIC_LIST;
}

export function getRelicById(id: string): RelicData | undefined {
  return RELIC_BY_ID.get(id);
}

export function getRelicByName(name: string): RelicData | undefined {
  return RELIC_BY_NAME.get(name);
}

export function getRelicsByCategory(category: RelicCategory): readonly RelicData[] {
  return RELIC_LIST.filter((relic) => relic.category === category);
}

export function resolveRelicMap(raw: Record<string, number> | null | undefined): ResolvedRelicEntry[] {
  if (!raw || typeof raw !== 'object') return [];

  const aggregated = new Map<string, ResolvedRelicEntry>();

  for (const [key, value] of Object.entries(raw)) {
    const count = Math.max(0, Math.floor(Number(value ?? 0)));
    if (!key || count <= 0) continue;

    const relic = RELIC_BY_ID.get(key) ?? RELIC_BY_NAME.get(key);
    if (!relic) continue;

    const existing = aggregated.get(relic.id);
    if (existing) {
      existing.count += count;
    } else {
      aggregated.set(relic.id, { relic, count });
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => a.relic.name.localeCompare(b.relic.name, 'zh-Hans-CN'));
}
