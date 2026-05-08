import { CardType, EffectType, type CardData, type EntityStats } from '../types';

export type RelicRarity = '普通' | '稀有' | '传奇';
export type RelicCategory = '基础' | '魔导' | '燃烧' | '严寒' | '血池';

export type RelicSide = 'player' | 'enemy';
export type RelicFloatKind = 'shield' | 'mana' | 'heal';

export interface RelicApplyEffectOptions {
  restrictedTypes?: CardType[];
  source?: string;
  lockDecayThisTurn?: boolean;
  durationTurns?: number;
}

interface RelicSharedHookContext {
  count: number;
  side: RelicSide;
  self: EntityStats;
  opponent: EntityStats;
  state: Record<string, unknown>;
  turn: number;
  playedPhysicalOrMagicThisTurn: boolean;
  previousTurnMana: number;
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
  spendMana: (side: RelicSide, amount: number, reason: string) => boolean;
  heal: (
    side: RelicSide,
    amount: number,
    options?: { overflowToArmor?: boolean },
  ) => { healed: number; overflow: number };
  addRerollCharges: (side: RelicSide, amount: number) => void;
  getRerollCharges: (side: RelicSide) => number;
}

export type RelicLifecycleHookContext = RelicSharedHookContext;

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

export interface RelicDirectDamageHookContext extends RelicSharedHookContext {
  sourceSide?: RelicSide;
  targetSide: RelicSide;
  source?: EntityStats;
  target: EntityStats;
  card?: CardData;
  damage: number;
  isTrueDamage: boolean;
  reason: string;
}

export interface RelicActiveSkillHookContext extends RelicSharedHookContext {
  skill: Pick<CardData, 'id' | 'name'>;
  rerollSelfDice: () => { before: number; after: number };
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
  onBeforeDirectDamage?: (ctx: RelicDirectDamageHookContext) => void;
  onAfterHitDealt?: (ctx: RelicHitHookContext) => void;
  onAfterHitTaken?: (ctx: RelicHitHookContext) => void;
  onAfterActiveSkill?: (ctx: RelicActiveSkillHookContext) => void;
}

export interface RelicData {
  id: string;
  name: string;
  rarity: RelicRarity;
  category: RelicCategory;
  effect: string;
  description: string;
  uniqueAcquisition?: boolean;
  hooks?: RelicHooks;
}

export interface ResolvedRelicEntry {
  relic: RelicData;
  count: number;
}

const getStacks = (entity: EntityStats, effectType: EffectType) =>
  entity.effects.find(eff => eff.type === effectType)?.stacks ?? 0;

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
    rarity: '稀有',
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
    id: 'basic_flowing_light_ring',
    name: '流光指环',
    rarity: '传奇',
    category: '基础',
    effect: '战斗中打出的第一张功能牌连击',
    description: '战斗中打出的第一张功能牌连击。',
  },
  {
    id: 'basic_four_color_notebook',
    name: '四色笔记',
    rarity: '传奇',
    category: '基础',
    effect: '打出物理/魔法/功能牌时点数+1，打出闪避牌时点数-1',
    description: '打出物理、魔法、功能牌时，点数+1；打出闪避牌时，点数-1。',
    hooks: {
      modifyFinalPoint: ({ card, currentPoint, count }) => {
        const stacks = Math.max(0, Math.floor(count));
        if (card.type === CardType.DODGE) return currentPoint - stacks;
        if (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC || card.type === CardType.FUNCTION) {
          return currentPoint + stacks;
        }
        return currentPoint;
      },
    },
  },
  {
    id: 'mana_residue',
    name: '魔力残渣',
    rarity: '普通',
    category: '基础',
    effect: '每回合结束时，若魔力小于等于2，则回复1点魔力',
    description: '每回合结束时，若魔力小于等于 2，则回复 1 点魔力。',
    hooks: {
      onTurnEnd: ({ count, side, self, restoreMana, addLog }) => {
        if (self.mp > 2) return;
        const restored = restoreMana(side, count);
        if (restored > 0) {
          addLog(`[魔力残渣] 魔力小于等于 2，回复 ${restored} 点魔力。`);
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
    id: 'basic_unbinding_rope',
    name: '解缚绳',
    rarity: '普通',
    category: '基础',
    effect: '每场战斗免疫1次束缚',
    description: '每场战斗免疫1次束缚。',
    hooks: {
      onBeforeApplyEffect: ({ count, side, targetSide, effectType, state, addLog }) => {
        if (targetSide !== side || effectType !== EffectType.BIND) return;
        const key = 'remainingBindImmunity';
        if (typeof state[key] !== 'number') {
          state[key] = Math.max(0, Math.floor(count));
        }
        const remaining = Math.max(0, Math.floor(Number(state[key] ?? 0)));
        if (remaining <= 0) return;
        state[key] = remaining - 1;
        addLog(`[解缚绳] 免疫本次束缚（剩余 ${remaining - 1} 次）。`);
        return false;
      },
    },
  },
  {
    id: 'basic_open_speech_book',
    name: '开言书',
    rarity: '普通',
    category: '基础',
    effect: '每场战斗免疫1次禁言',
    description: '每场战斗免疫1次禁言。',
    hooks: {
      onBeforeApplyEffect: ({ count, side, targetSide, effectType, state, addLog }) => {
        if (targetSide !== side || effectType !== EffectType.SILENCE) return;
        const key = 'remainingSilenceImmunity';
        if (typeof state[key] !== 'number') {
          state[key] = Math.max(0, Math.floor(count));
        }
        const remaining = Math.max(0, Math.floor(Number(state[key] ?? 0)));
        if (remaining <= 0) return;
        state[key] = remaining - 1;
        addLog(`[开言书] 免疫本次禁言（剩余 ${remaining - 1} 次）。`);
        return false;
      },
    },
  },
  {
    id: 'basic_life_pendant',
    name: '生命吊坠',
    rarity: '普通',
    category: '基础',
    effect: '战斗开始时获得5点临时生命上限，回复血量时，额外回复1点生命',
    description: '战斗开始时获得5点临时生命上限，回复血量时，额外回复1点生命。',
    hooks: {
      onBattleStart: ({ count, side, addStatusEffect, addLog }) => {
        const stacks = 5 * Math.max(0, Math.floor(count));
        if (stacks <= 0) return;
        if (addStatusEffect(side, EffectType.TEMP_MAX_HP, stacks, { source: 'relic:basic_life_pendant' })) {
          addLog(`[生命吊坠] 获得 ${stacks} 点临时生命上限。`);
        }
      },
    },
  },
  {
    id: 'basic_gyroscope',
    name: '陀螺',
    rarity: '稀有',
    category: '基础',
    effect: '使用主动技后，重掷自身',
    description: '使用主动技后，重掷自身。',
    hooks: {
      onAfterActiveSkill: ({ count, skill, rerollSelfDice, addLog }) => {
        const times = Math.max(0, Math.floor(count));
        for (let i = 0; i < times; i++) {
          const { before, after } = rerollSelfDice();
          addLog(`[陀螺] 使用主动技【${skill.name}】后，重掷自身：${before} → ${after}。`);
        }
      },
    },
  },
  {
    id: 'basic_elemental_pendant',
    name: '元素吊坠',
    rarity: '稀有',
    category: '基础',
    effect: '战斗开始时，获得1层元素皮层',
    description: '战斗开始时，获得1层元素皮层。',
    uniqueAcquisition: true,
    hooks: {
      onBattleStart: ({ side, addStatusEffect, addLog }) => {
        if (addStatusEffect(side, EffectType.ELEMENTAL_CORTEX, 1, { source: 'relic:basic_elemental_pendant' })) {
          addLog('[元素吊坠] 获得 1 层元素皮层。');
        }
      },
    },
  },
  {
    id: 'basic_amplification_star',
    name: '增幅星',
    rarity: '传奇',
    category: '基础',
    effect: '出牌后，双方点数*1.5',
    description: '出牌后，双方点数*1.5。',
  },
  {
    id: 'basic_colored_glass_ball',
    name: '异色玻璃球',
    rarity: '普通',
    category: '基础',
    effect: '重掷后，造成2点伤害',
    description: '重掷后，造成2点伤害。',
  },
  {
    id: 'basic_parry_shield',
    name: '招架盾',
    rarity: '普通',
    category: '基础',
    effect: '回合结束时，若护甲大于等于6，则造成4点伤害',
    description: '回合结束时，若护甲大于等于6，则造成4点伤害。',
  },
  {
    id: 'basic_pudding',
    name: '布丁',
    rarity: '普通',
    category: '基础',
    effect: '重掷后，回复1点生命',
    description: '重掷后，回复1点生命。',
  },
  {
    id: 'basic_microscope',
    name: '微缩镜',
    rarity: '稀有',
    category: '基础',
    effect: '减少敌方15%生命值上限',
    description: '减少敌方15%生命值上限。',
    hooks: {
      onBattleStart: ({ count, opponent, addLog }) => {
        const loss = Math.max(1, Math.floor(opponent.maxHp * 0.15 * Math.max(1, Math.floor(count))));
        opponent.maxHp = Math.max(1, opponent.maxHp - loss);
        opponent.hp = Math.min(opponent.hp, opponent.maxHp);
        addLog(`[微缩镜] 敌方生命上限降低 ${loss}。`);
      },
    },
  },
  {
    id: 'basic_energy_fruit',
    name: '能量果',
    rarity: '稀有',
    category: '基础',
    effect: '初始魔力翻倍',
    description: '初始魔力翻倍。',
    uniqueAcquisition: true,
    hooks: {
      onBattleStart: ({ self, addLog }) => {
        const before = Math.max(0, Math.floor(self.mp));
        self.mp = before * 2;
        addLog(`[能量果] 初始魔力 ${before} → ${self.mp}。`);
      },
    },
  },
  {
    id: 'basic_cheat_silver_coin',
    name: '作弊银币',
    rarity: '稀有',
    category: '基础',
    effect: '重掷自身后，点数必定为6',
    description: '重掷自身后，点数必定为6。',
    uniqueAcquisition: true,
  },
  {
    id: 'basic_silver_mirror',
    name: '银镜',
    rarity: '稀有',
    category: '基础',
    effect: '本场战斗中，若你出的牌与上一张牌相同，点数*1.5',
    description: '本场战斗中，若你出的牌与上一张牌相同，点数*1.5。',
    hooks: {
      onBattleStart: ({ state }) => {
        state['previousPlayedCardId'] = null;
      },
      modifyFinalPoint: ({ card, currentPoint, state, count }) => {
        if (card.type === CardType.ACTIVE) return currentPoint;
        if (state['previousPlayedCardId'] !== card.id) return currentPoint;
        return currentPoint * 1.5 ** Math.max(1, Math.floor(count));
      },
    },
  },
  {
    id: 'basic_cycle_needle',
    name: '循环针',
    rarity: '稀有',
    category: '基础',
    effect: '打出法术牌后，有50%概率返还已消耗的法力',
    description: '打出法术牌后，有50%概率返还已消耗的法力。',
    uniqueAcquisition: true,
  },
  {
    id: 'basic_acceleration_clock',
    name: '加速时钟',
    rarity: '传奇',
    category: '基础',
    effect: '每回合减少主动技能冷却1回合，冷却为1的主动技可以使用2次',
    description: '每回合减少主动技能冷却1回合，冷却为1的主动技可以使用2次。',
  },
  {
    id: 'basic_eerie_orb',
    name: '诡珠',
    rarity: '传奇',
    category: '基础',
    effect: '自身掷出的点数只会是最小或最大点数',
    description: '自身掷出的点数只会是最小或最大点数。',
  },
  {
    id: 'basic_magic_ring',
    name: '魔戒',
    rarity: '传奇',
    category: '基础',
    effect: '物理与魔法牌将会进行拼点',
    description: '物理与魔法牌将会进行拼点。',
  },
  {
    id: 'basic_shriveled_hand',
    name: '干瘪之手',
    rarity: '传奇',
    category: '基础',
    effect: '乘除不再触发，加减触发2次',
    description: '乘除不再触发，加减触发2次。',
  },
  {
    id: 'simple_charm',
    name: '简易护符',
    rarity: '普通',
    category: '基础',
    effect: '每两回合开始时，给自身增加 1 点护甲',
    description: '每两回合开始时，获得 1 点护甲。',
    hooks: {
      onTurnStart: ({ count, side, state, addArmor, addLog }) => {
        const turnCounter = Math.max(0, Math.floor(Number(state.turnCounter ?? 0))) + 1;
        state.turnCounter = turnCounter;
        if (turnCounter % 2 !== 0) return;
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
    effect: '每当洗牌（弃牌堆重入抽牌堆）时，回复 1 点魔力与生命',
    description: '每次洗牌时，回复 1 点魔力与生命。',
    hooks: {
      onDeckShuffle: ({ count, side, restoreMana, heal, addLog }) => {
        const restored = restoreMana(side, count);
        const { healed } = heal(side, count);
        if (restored > 0 || healed > 0) {
          addLog(`[能量糖果] 洗牌触发，回复 ${restored} 点魔力与 ${healed} 点生命。`);
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
    id: 'base_rainbow_card',
    name: '彩虹卡牌',
    rarity: '普通',
    category: '基础',
    effect: '普通敌人额外掉落1张卡牌奖励',
    description: '战胜普通敌人时，奖励卡牌选项额外+1。',
    uniqueAcquisition: true,
  },
  {
    id: 'base_silver_card',
    name: '银色卡牌',
    rarity: '稀有',
    category: '基础',
    effect: '普通敌人卡牌奖励可刷新1次',
    description: '战胜普通敌人后，在选卡界面可使用一次“刷新奖励”。',
    uniqueAcquisition: true,
  },
  {
    id: 'base_golden_card',
    name: '金色卡牌',
    rarity: '稀有',
    category: '基础',
    effect: '普通敌人掉落卡牌有10%概率为稀有',
    description: '战胜普通敌人时，每个奖励位有10%概率直接生成稀有卡牌。',
    uniqueAcquisition: true,
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
    name: '火焰护符',
    rarity: '稀有',
    category: '燃烧',
    effect: '自己受到的燃烧伤害恒定为 1（优先于烈阳护符）',
    description: '自身受到燃烧伤害时，伤害固定为 1，并覆盖烈阳护符对自身的下限。',
    hooks: {
      onBeforeBurnDamage: ctx => {
        if (ctx.targetSide !== ctx.side) return;
        if (ctx.damage === 1) return;
        ctx.damage = 1;
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
    id: 'burn_heat_exchange_fin',
    name: '热交换鳍片',
    rarity: '普通',
    category: '燃烧',
    effect: '每次自身燃烧减少时，获得5护甲',
    description: '每当自身燃烧层数减少时，获得5点护甲。',
  },
  {
    id: 'burn_reverse_circuit',
    name: '逆燃回路',
    rarity: '稀有',
    category: '燃烧',
    effect: '回合开始若你有燃烧，失去1生命并回1MP（每回合1次）',
    description: '每回合开始时，若你拥有燃烧，则失去1点生命并回复1点魔力。',
  },
  {
    id: 'everlasting_fuel',
    name: '不灭薪柴',
    rarity: '传奇',
    category: '燃烧',
    effect: '结算燃烧伤害时，改为造成等量真实伤害',
    description: '燃烧伤害改为真实伤害（无视护甲与结界）。',
    hooks: {
      onBeforeBurnDamage: ctx => {
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
      onBeforeBurnDamage: ctx => {
        if (ctx.targetSide === ctx.side && ctx.hasRelic('fire_slime')) {
          return;
        }
        const minDamage = Math.max(1, ctx.turn * Math.max(1, ctx.count));
        if (ctx.damage >= minDamage) return;
        ctx.damage = minDamage;
      },
    },
  },
  {
    id: 'burn_star_core',
    name: '星之核',
    rarity: '稀有',
    category: '燃烧',
    effect: '初始魔力减半，战斗中第一张法术牌结算2次',
    description: '初始魔力减半，战斗中第一张法术牌结算2次。',
    hooks: {
      onBattleStart: ({ self, state, addLog }) => {
        state['firstMagicResolved'] = false;
        const before = Math.max(0, Math.floor(self.mp));
        self.mp = Math.floor(before / 2);
        addLog(`[星之核] 初始魔力 ${before} → ${self.mp}。`);
      },
    },
  },
  {
    id: 'burn_flame_lantern',
    name: '火焰灯笼',
    rarity: '稀有',
    category: '燃烧',
    effect: '拼点失败或跳过回合后，施加对方2层燃烧',
    description: '拼点失败或跳过回合后，施加对方2层燃烧。',
  },
  {
    id: 'burn_gloom_purple_light',
    name: '幽幽紫光',
    rarity: '稀有',
    category: '燃烧',
    effect: '拼点失败或跳过回合导致敌方燃烧消失时，使其受到2倍燃烧层数的真实伤害',
    description: '拼点失败或跳过回合导致敌方燃烧消失时，使其受到2倍燃烧层数的真实伤害。',
  },
  {
    id: 'burn_circling_glow',
    name: '环绕火光',
    rarity: '稀有',
    category: '燃烧',
    effect: '若自身或对方拥有寒冷时，对方最终点数-1；若自身或对方拥有燃烧时，我方最终点数+1',
    description: '若自身或对方拥有寒冷时，对方最终点数-1；若自身或对方拥有燃烧时，我方最终点数+1。',
    hooks: {
      modifyFinalPoint: ({ currentPoint, self, opponent }) => {
        const hasBurn = getStacks(self, EffectType.BURN) > 0 || getStacks(opponent, EffectType.BURN) > 0;
        return hasBurn ? currentPoint + 1 : currentPoint;
      },
    },
  },
  {
    id: 'burn_black_hourglass',
    name: '黑沙漏',
    rarity: '稀有',
    category: '燃烧',
    effect: '回合开始时，施加1层温差、燃烧与寒冷',
    description: '回合开始时，施加1层温差、燃烧与寒冷。',
    hooks: {
      onTurnStart: ({ count, side, addStatusEffect }) => {
        const targetSide: RelicSide = side === 'player' ? 'enemy' : 'player';
        const stacks = Math.max(1, Math.floor(count));
        addStatusEffect(targetSide, EffectType.TEMPERATURE_DIFF, stacks, { source: 'relic:burn_black_hourglass' });
        addStatusEffect(targetSide, EffectType.BURN, stacks, { source: 'relic:burn_black_hourglass' });
        addStatusEffect(targetSide, EffectType.COLD, stacks, { source: 'relic:burn_black_hourglass' });
      },
    },
  },
  {
    id: 'burn_will_o_wisp_chain',
    name: '鬼火锁链',
    rarity: '传奇',
    category: '燃烧',
    effect: '若对方本回合至少受到过2次伤害，则下回合点数*1.5',
    description: '若对方本回合至少受到过2次伤害，则下回合点数*1.5。',
    hooks: {
      modifyFinalPoint: ({ currentPoint, state, count }) => {
        if (!state['nextTurnPointBoost']) return currentPoint;
        return currentPoint * 1.5 ** Math.max(1, Math.floor(count));
      },
    },
  },
  {
    id: 'modao_light_shield',
    name: '轻薄护盾',
    rarity: '普通',
    category: '魔导',
    effect: '战斗开始时自身获得1层结界',
    description: '战斗开始时，获得1层结界。',
    hooks: {
      onBattleStart: ({ count, side, addStatusEffect, addLog }) => {
        if (addStatusEffect(side, EffectType.BARRIER, count, { source: 'relic:modao_light_shield' })) {
          addLog(`[轻薄护盾] 获得 ${count} 层结界。`);
        }
      },
    },
  },
  {
    id: 'modao_dagger_pendant',
    name: '匕首吊坠',
    rarity: '普通',
    category: '魔导',
    effect: '战斗开始时自身获得1层增伤',
    description: '战斗开始时，获得1层增伤。',
    hooks: {
      onBattleStart: ({ count, side, addStatusEffect, addLog }) => {
        if (addStatusEffect(side, EffectType.DAMAGE_BOOST, count, { source: 'relic:modao_dagger_pendant' })) {
          addLog(`[匕首吊坠] 获得 ${count} 层增伤。`);
        }
      },
    },
  },
  {
    id: 'modao_magic_lens',
    name: '魔法镜片',
    rarity: '普通',
    category: '魔导',
    effect: '战斗开始时给予对方1层易伤',
    description: '战斗开始时，对敌方施加1层易伤。',
    hooks: {
      onBattleStart: ({ count, side, addStatusEffect, addLog }) => {
        const targetSide: RelicSide = side === 'player' ? 'enemy' : 'player';
        if (addStatusEffect(targetSide, EffectType.VULNERABLE, count, { source: 'relic:modao_magic_lens' })) {
          addLog(`[魔法镜片] 对敌方施加 ${count} 层易伤。`);
        }
      },
    },
  },
  {
    id: 'modao_thorn_armguard',
    name: '荆棘臂甲',
    rarity: '稀有',
    category: '魔导',
    effect: '若自身被造成0点伤害，则为对方施加1层易伤',
    description: '若自身被造成0点伤害，则为对方施加1层易伤。',
    hooks: {
      onTurnStart: ({ state }) => {
        state['triggeredThisTurn'] = false;
      },
      onAfterHitTaken: ({ side, targetSide, sourceSide, attemptedDamage, actualDamage, state, addStatusEffect, addLog }) => {
        if (targetSide !== side || !sourceSide || sourceSide === side) return;
        if (actualDamage > 0 || attemptedDamage <= 0) return;
        if (state['triggeredThisTurn']) return;
        state['triggeredThisTurn'] = true;
        if (addStatusEffect(sourceSide, EffectType.VULNERABLE, 1, { source: 'relic:modao_thorn_armguard' })) {
          addLog('[荆棘臂甲] 本次受击伤害为0，对方获得1层易伤。');
        }
      },
    },
  },
  {
    id: 'modao_pain_ring',
    name: '苦痛戒指',
    rarity: '稀有',
    category: '魔导',
    effect: '双方受到的魔法伤害+3',
    description: '双方受到的魔法伤害+3。',
    hooks: {
      onBeforeDirectDamage: ctx => {
        if (ctx.card?.type !== CardType.MAGIC || ctx.damage <= 0) return;
        ctx.damage += 3 * Math.max(0, Math.floor(ctx.count));
      },
    },
  },
  {
    id: 'modao_pain_prism',
    name: '苦痛棱镜',
    rarity: '稀有',
    category: '魔导',
    effect: '双方受到的魔法伤害不会低于回合数',
    description: '双方受到的魔法伤害不会低于回合数。',
    hooks: {
      onBeforeDirectDamage: ctx => {
        if (ctx.card?.type !== CardType.MAGIC || ctx.damage <= 0) return;
        const minimum = Math.max(1, Math.floor(ctx.turn) * Math.max(1, Math.floor(ctx.count)));
        if (ctx.damage < minimum) {
          ctx.damage = minimum;
        }
      },
    },
  },
  {
    id: 'modao_defense_doll',
    name: '防御玩偶',
    rarity: '稀有',
    category: '魔导',
    effect: '被击中前，消耗1点法力获得2点护甲',
    description: '被击中前，消耗1点法力获得2点护甲。',
    hooks: {
      onBeforeDirectDamage: ({ count, side, targetSide, sourceSide, card, damage, spendMana, addArmor, addLog }) => {
        if (targetSide !== side || sourceSide === side) return;
        if (card?.type !== CardType.PHYSICAL && card?.type !== CardType.MAGIC) return;
        if (damage <= 0) return;
        const times = Math.max(0, Math.floor(count));
        let gained = 0;
        for (let i = 0; i < times; i++) {
          if (!spendMana(side, 1, '防御玩偶')) break;
          gained += addArmor(side, 2);
        }
        if (gained > 0) {
          addLog(`[防御玩偶] 被击中前消耗魔力，获得 ${gained} 点护甲。`);
        }
      },
    },
  },
  {
    id: 'modao_potential_jellyfish',
    name: '电势水母',
    rarity: '稀有',
    category: '魔导',
    effect: '本回合魔力与上回合魔力每差3，获得1层持续1回合的增伤',
    description: '本回合魔力与上回合魔力每差3，获得1层持续1回合的增伤。',
    hooks: {
      onTurnStart: ({ count, side, self, previousTurnMana, addStatusEffect, addLog }) => {
        const delta = Math.abs(Math.max(0, Math.floor(self.mp)) - Math.max(0, Math.floor(previousTurnMana)));
        const stacks = Math.floor(delta / 3) * Math.max(0, Math.floor(count));
        if (stacks <= 0) return;
        if (addStatusEffect(side, EffectType.DAMAGE_BOOST, stacks, {
          source: 'relic:modao_potential_jellyfish',
          durationTurns: 1,
        })) {
          addLog(`[电势水母] 魔力差 ${delta}，获得 ${stacks} 层持续1回合的增伤。`);
        }
      },
    },
  },
  {
    id: 'modao_rune_capacitor',
    name: '法纹电容',
    rarity: '稀有',
    category: '魔导',
    effect: '若本回合没有使用物理/魔法牌，则每拥有1层增伤回复1点魔量',
    description: '若本回合没有使用物理/魔法牌，则每拥有1层增伤回复1点魔量。',
    hooks: {
      onTurnEnd: ({ count, side, self, state, playedPhysicalOrMagicThisTurn, restoreMana, addLog }) => {
        if (playedPhysicalOrMagicThisTurn) return;
        const snapshot = state['damageBoostStacksBeforeTurnEnd'];
        const boostStacks = typeof snapshot === 'number'
          ? Math.max(0, Math.floor(snapshot))
          : Math.max(0, getStacks(self, EffectType.DAMAGE_BOOST));
        if (boostStacks <= 0) return;
        const restored = restoreMana(side, boostStacks * Math.max(0, Math.floor(count)));
        if (restored > 0) {
          addLog(`[法纹电容] 本回合未使用物理/魔法牌，按 ${boostStacks} 层增伤回复 ${restored} 点魔力。`);
        }
      },
    },
  },
  {
    id: 'modao_drain_rune',
    name: '汲取符文',
    rarity: '稀有',
    category: '魔导',
    effect: '回合结束时，若对方法力高于自身，法力汲取1',
    description: '回合结束时，若对方法力高于自身，法力汲取1。',
  },
  {
    id: 'modao_blue_scarf',
    name: '蓝色围巾',
    rarity: '稀有',
    category: '魔导',
    effect: '受到的物理伤害+1，受到的魔法伤害减半',
    description: '受到的物理伤害+1，受到的魔法伤害减半。',
    uniqueAcquisition: true,
    hooks: {
      onBeforeDirectDamage: ctx => {
        if (ctx.targetSide !== ctx.side || !ctx.card || ctx.damage <= 0) return;
        if (ctx.card.type === CardType.PHYSICAL) {
          ctx.damage += 1;
        } else if (ctx.card.type === CardType.MAGIC) {
          ctx.damage = Math.floor(ctx.damage / 2);
        }
      },
    },
  },
  {
    id: 'modao_fluorescent_pendant',
    name: '荧光吊坠',
    rarity: '稀有',
    category: '魔导',
    effect: '使用魔法牌后，本回合受到的物理伤害-4',
    description: '使用魔法牌后，本回合受到的物理伤害-4。',
    hooks: {
      onTurnStart: ({ state }) => {
        state['physicalReductionThisTurn'] = 0;
      },
      onBeforeDirectDamage: ctx => {
        if (ctx.targetSide !== ctx.side || ctx.card?.type !== CardType.PHYSICAL || ctx.damage <= 0) return;
        const reduction = Math.max(0, Math.floor(Number(ctx.state['physicalReductionThisTurn'] ?? 0)));
        if (reduction <= 0) return;
        ctx.damage = Math.max(0, ctx.damage - reduction);
      },
    },
  },
  {
    id: 'modao_lightning_orb',
    name: '闪电魔球',
    rarity: '稀有',
    category: '魔导',
    effect: '回合结束时，消耗2点魔力获得1层增伤',
    description: '回合结束时，消耗2点魔力获得1层增伤。',
  },
  {
    id: 'modao_water_shield',
    name: '水形盾',
    rarity: '稀有',
    category: '魔导',
    effect: '自身每有5点法力，受到的伤害-1，上限-4',
    description: '自身每有5点法力，受到的伤害-1，上限-4。',
    uniqueAcquisition: true,
    hooks: {
      onBeforeDirectDamage: ctx => {
        if (ctx.targetSide !== ctx.side || ctx.damage <= 0) return;
        const reduction = Math.min(4, Math.floor(Math.max(0, ctx.self.mp) / 5));
        if (reduction > 0) {
          ctx.damage = Math.max(0, ctx.damage - reduction);
        }
      },
    },
  },
  {
    id: 'modao_wooden_staff',
    name: '原木法杖',
    rarity: '传奇',
    category: '魔导',
    effect: '使用法术牌后，本场战斗法术卡牌点数+1，上限+4',
    description: '使用法术牌后，本场战斗法术卡牌点数+1，上限+4。',
    hooks: {
      onBattleStart: ({ state }) => {
        state['magicPointBonus'] = 0;
      },
      modifyFinalPoint: ({ card, currentPoint, state }) => {
        if (card.type !== CardType.MAGIC) return currentPoint;
        return currentPoint + Math.max(0, Math.floor(Number(state['magicPointBonus'] ?? 0)));
      },
    },
  },
  {
    id: 'modao_great_mage_staff',
    name: '大魔导法杖',
    rarity: '传奇',
    category: '魔导',
    effect: '回合开始时，自身每有5点法力获得1层蓄，上限4层',
    description: '回合开始时，自身每有5点法力获得1层蓄，上限4层。',
    hooks: {
      onTurnStart: ({ count, side, self, addStatusEffect, addLog }) => {
        const stacks = Math.min(4, Math.floor(Math.max(0, self.mp) / 5)) * Math.max(1, Math.floor(count));
        if (stacks <= 0) return;
        if (addStatusEffect(side, EffectType.CHARGE, stacks, { source: 'relic:modao_great_mage_staff' })) {
          addLog(`[大魔导法杖] 获得 ${stacks} 层蓄力。`);
        }
      },
    },
  },
  {
    id: 'modao_tracking_mark',
    name: '追踪印记',
    rarity: '传奇',
    category: '魔导',
    effect: '使用法术牌时，若最终点数大于等于10，则无视闪避',
    description: '使用法术牌时，若最终点数大于等于10，则无视闪避。',
  },
  {
    id: 'modao_stabilizer_pin',
    name: '稳压回针',
    rarity: '普通',
    category: '魔导',
    effect: '单次回蓝≥3时，获得1护甲（每回合至多2次）',
    description: '当你单次回复至少3点魔力时，获得1点护甲（每回合最多触发2次）。',
  },
  {
    id: 'modao_scale_ring',
    name: '刻度环',
    rarity: '普通',
    category: '魔导',
    effect: '每3回合回复1MP',
    description: '每逢第3/6/9...回合开始时，回复1点魔力。',
  },
  {
    id: 'modao_inverse_codex',
    name: '反相法典',
    rarity: '稀有',
    category: '魔导',
    effect: '回合开始若MP<=5，本回合打出魔法牌时点数+2',
    description: '每回合开始时，若你当前MP≤5，则本回合打出魔法牌点数+2。',
    hooks: {
      onTurnStart: ({ count, self, state, addLog }) => {
        const active = self.mp <= 5 && count > 0;
        state['enabledThisTurn'] = active;
        if (active) {
          addLog(`[反相法典] 本回合激活：魔法牌点数 +${count * 2}。`);
        }
      },
      modifyFinalPoint: ({ card, currentPoint, state, count }) => {
        if (card.type !== CardType.MAGIC) return currentPoint;
        if (!state['enabledThisTurn']) return currentPoint;
        return currentPoint + 2 * count;
      },
    },
  },
  {
    id: 'modao_arcane_host',
    name: '魔导主机',
    rarity: '稀有',
    category: '魔导',
    effect: '手牌中的第2张魔法牌魔力消耗-2（最低0）',
    description: '按手牌从左到右计数，第2张魔法牌的魔力消耗-2（最低为0）。',
  },
  {
    id: 'modao_magic_doll',
    name: '魔法玩偶',
    rarity: '稀有',
    category: '魔导',
    effect: '每回合结束时，消耗1MP造成2点伤害',
    description: '每回合结束时，若有足够魔力则消耗1点魔力并对敌方造成2点伤害。',
  },
  {
    id: 'modao_witch_hat',
    name: '魔女的帽子',
    rarity: '传奇',
    category: '魔导',
    effect: '打出魔法牌时点数x1.5；打出物理牌时点数x0.5',
    description: '每次打出魔法牌点数乘1.5；打出物理牌点数乘0.5。',
    hooks: {
      modifyFinalPoint: ({ card, currentPoint, count }) => {
        if (card.type === CardType.MAGIC) {
          return currentPoint * 1.5 ** Math.max(1, count);
        }
        if (card.type === CardType.PHYSICAL) {
          return currentPoint * 0.5 ** Math.max(1, count);
        }
        return currentPoint;
      },
    },
  },
  {
    id: 'yanhan_low_temp_engraver',
    name: '低温刻刀',
    rarity: '普通',
    category: '严寒',
    effect: '打出功能牌时，敌方寒冷+1',
    description: '每次打出功能牌后，使敌方获得1层寒冷。',
  },
  {
    id: 'yanhan_reverse_phase_shell',
    name: '反相壳层',
    rarity: '普通',
    category: '严寒',
    effect: '本回合若受伤≥4，回合末对敌寒冷+2',
    description: '若玩家本回合累计受到至少4点伤害，则回合结束时对敌方施加2层寒冷。',
  },
  {
    id: 'yanhan_small_iceberg',
    name: '小冰山',
    rarity: '稀有',
    category: '严寒',
    effect: '第一回合为双方施加等同于自身最大点数的寒冷，随后每6个回合触发1次',
    description: '第一回合为双方施加等同于自身最大点数的寒冷，随后每6个回合触发1次。',
    hooks: {
      onTurnStart: ({ count, turn, side, self, opponent, addStatusEffect, addLog }) => {
        if (turn !== 1 && (turn - 1) % 6 !== 0) return;
        const selfStacks = Math.max(0, Math.floor(self.maxDice)) * Math.max(1, Math.floor(count));
        const opponentStacks = Math.max(0, Math.floor(opponent.maxDice)) * Math.max(1, Math.floor(count));
        if (selfStacks <= 0 && opponentStacks <= 0) return;
        const targetSide: RelicSide = side === 'player' ? 'enemy' : 'player';
        addStatusEffect(side, EffectType.COLD, selfStacks, { source: 'relic:yanhan_small_iceberg' });
        addStatusEffect(targetSide, EffectType.COLD, opponentStacks, { source: 'relic:yanhan_small_iceberg' });
        addLog(`[小冰山] 我方获得 ${selfStacks} 层寒冷，敌方获得 ${opponentStacks} 层寒冷。`);
      },
    },
  },
  {
    id: 'yanhan_ice_wine_bottle',
    name: '寒冰酒瓶',
    rarity: '普通',
    category: '严寒',
    effect: '回合开始时，若敌方寒冷层数少于5，则施加1层寒冷',
    description: '回合开始时，若敌方寒冷层数少于5，则施加1层寒冷。',
    hooks: {
      onTurnStart: ({ count, side, opponent, addStatusEffect, addLog }) => {
        if (getStacks(opponent, EffectType.COLD) >= 5) return;
        const targetSide: RelicSide = side === 'player' ? 'enemy' : 'player';
        if (addStatusEffect(targetSide, EffectType.COLD, Math.max(1, Math.floor(count)), { source: 'relic:yanhan_ice_wine_bottle' })) {
          addLog('[寒冰酒瓶] 敌方寒冷少于5层，追加寒冷。');
        }
      },
    },
  },
  {
    id: 'yanhan_ghost_bone',
    name: '幽灵骨',
    rarity: '稀有',
    category: '严寒',
    effect: '敌方触发寒冷后，受到三分之一寒冷层数的伤害',
    description: '敌方触发寒冷后，受到三分之一寒冷层数的伤害。',
    uniqueAcquisition: true,
  },
  {
    id: 'yanhan_ghost_hand',
    name: '幽灵手',
    rarity: '稀有',
    category: '严寒',
    effect: '若本回合没有受到伤害，施加1层寒冷与疲劳',
    description: '若本回合没有受到伤害，施加1层寒冷与疲劳。',
  },
  {
    id: 'yanhan_ice_core',
    name: '冰核',
    rarity: '稀有',
    category: '严寒',
    effect: '法术卡牌命中对方时，施加1层寒冷',
    description: '法术卡牌命中对方时，施加1层寒冷。',
    hooks: {
      onAfterHitDealt: ({ count, side, targetSide, card, actualDamage, addStatusEffect, addLog }) => {
        if (targetSide === side || card.type !== CardType.MAGIC || actualDamage <= 0) return;
        if (addStatusEffect(targetSide, EffectType.COLD, Math.max(1, Math.floor(count)), { source: 'relic:yanhan_ice_core' })) {
          addLog('[冰核] 法术命中，施加寒冷。');
        }
      },
    },
  },
  {
    id: 'yanhan_frost_storage_plate',
    name: '凝霜蓄板',
    rarity: '普通',
    category: '严寒',
    effect: '敌方寒冷减少时，我方护甲+1',
    description: '每当敌方寒冷层数减少时，我方获得1点护甲。',
  },
  {
    id: 'yanhan_cold_abyss_rift',
    name: '寒渊裂隙',
    rarity: '稀有',
    category: '严寒',
    effect: '敌方寒冷减少时，对敌方造成2点真实伤害',
    description: '每当敌方寒冷层数减少时，对敌方造成2点真实伤害。',
  },
  {
    id: 'yanhan_freeze_pump',
    name: '冻结泵',
    rarity: '普通',
    category: '严寒',
    effect: '每次施加寒冷时，自身获得1护甲（每回合上限2）',
    description: '当你对敌方施加寒冷时，自身获得1点护甲（每回合最多触发2次）。',
  },
  {
    id: 'yanhan_seal_circuit',
    name: '封存回路',
    rarity: '稀有',
    category: '严寒',
    effect: '回合结束护甲减半后，将损失护甲的1/3在下回合开始转为MP',
    description: '回合结束时，按护甲减半损失值的1/3存储能量，并在下回合开始时转化为魔力。',
  },
  {
    id: 'yanhan_freeze_flow_core',
    name: '冻流泵芯',
    rarity: '稀有',
    category: '严寒',
    effect: '单次获得护甲≥5时，额外回蓝+1（每回合1次）',
    description: '当你单次获得至少5点护甲时，额外回复1点魔力（每回合最多触发1次）。',
  },
  {
    id: 'bloodpool_blood_pool',
    name: '血池',
    rarity: '传奇',
    category: '血池',
    effect: '战斗胜利时若生命≤50%回复12；进入领主房时生命回满',
    description: '战斗胜利后若生命值不高于50%，回复12点生命；进入领主房时立即回满生命。',
  },
  {
    id: 'bloodpool_heart_mark',
    name: '心脏印记',
    rarity: '稀有',
    category: '血池',
    effect: '受到伤害回复1点生命（中毒/侵蚀除外，每回合最多2次）',
    description: '当你受到伤害时回复1点生命值（中毒与侵蚀伤害除外，每回合最多触发2次）。',
    hooks: {
      onTurnStart: ({ state }) => {
        state['triggeredThisTurn'] = 0;
      },
    },
  },
  {
    id: 'bloodpool_skin_mark',
    name: '皮肤印记',
    rarity: '稀有',
    category: '血池',
    effect: '每次受伤减少1点伤害（每回合最多2次）',
    description: '每次受到伤害时减少1点伤害（每回合最多触发2次）。',
  },
  {
    id: 'bloodpool_pulse_mark',
    name: '脉搏印记',
    rarity: '稀有',
    category: '血池',
    effect: '回合开始自损2点真实伤害；回合结束回复2点生命',
    description: '每回合开始时对自己造成2点真实伤害；每回合结束时回复2点生命。',
    hooks: {
      onTurnEnd: ({ count, side, heal, addLog }) => {
        const { healed } = heal(side, 2 * count);
        if (healed > 0) {
          addLog(`[脉搏印记] 回合结束回复 ${healed} 点生命。`);
        }
      },
    },
  },
  {
    id: 'bloodpool_fat_mark',
    name: '脂肪印记',
    rarity: '稀有',
    category: '血池',
    effect: '战斗开始时回复30%生命上限；溢出治疗的50%转化为临时生命上限',
    description: '战斗开始时，回复30%生命上限的生命。回复生命时，溢出的生命回复会转化为50%临时生命上限。',
    hooks: {
      onBattleStart: ({ count, side, self, heal, addLog }) => {
        const amount = Math.max(0, Math.floor(self.maxHp * 0.3 * Math.max(1, Math.floor(count))));
        const { healed, overflow } = heal(side, amount);
        addLog(`[脂肪印记] 战斗开始回复 ${healed} 点生命${overflow > 0 ? `，溢出 ${overflow} 点` : ''}。`);
      },
    },
  },
  {
    id: 'bloodpool_kidney_mark',
    name: '肾印记',
    rarity: '稀有',
    category: '血池',
    effect: '每受伤3次，获得1层增伤',
    description: '每受伤3次，获得1层增伤。',
  },
  {
    id: 'bloodpool_lung_mark',
    name: '肺印记',
    rarity: '稀有',
    category: '血池',
    effect: '被敌方卡牌命中并失去生命时，回复1点法力并获得1点护甲',
    description: '被敌方卡牌命中并失去生命时，回复1点法力并获得1点护甲。',
    hooks: {
      onAfterHitTaken: ({ count, side, targetSide, sourceSide, card, actualDamage, restoreMana, addArmor, addLog }) => {
        if (targetSide !== side || sourceSide === side) return;
        if (card.type !== CardType.PHYSICAL && card.type !== CardType.MAGIC) return;
        if (actualDamage <= 0) return;
        const stacks = Math.max(1, Math.floor(count));
        const restored = restoreMana(side, stacks);
        const armorGained = addArmor(side, stacks);
        addLog(`[肺印记] 受击失去生命，回复 ${restored} 点法力并获得 ${armorGained} 点护甲。`);
      },
    },
  },
  {
    id: 'bloodpool_liver_mark',
    name: '肝印记',
    rarity: '稀有',
    category: '血池',
    effect: '回合结束减少1点中毒量；每损失20点生命值受到的伤害-1',
    description: '每回合结束时减少1点中毒量，每损失20点生命值受到的伤害-1。',
  },
  {
    id: 'bloodpool_stomach_mark',
    name: '胃印记',
    rarity: '稀有',
    category: '血池',
    effect: '战斗结束后最大生命值+1',
    description: '每次战斗结束后，最大生命值永久+1。',
  },
  {
    id: 'bloodpool_strawberry',
    name: '小小草莓',
    rarity: '普通',
    category: '血池',
    effect: '最大生命值+7',
    description: '最大生命值增加7点。',
  },
  {
    id: 'bloodpool_pear',
    name: '小小梨',
    rarity: '稀有',
    category: '血池',
    effect: '最大生命值+10',
    description: '最大生命值增加10点。',
  },
  {
    id: 'bloodpool_mango',
    name: '小小芒果',
    rarity: '传奇',
    category: '血池',
    effect: '最大生命值+13',
    description: '最大生命值增加13点。',
  },
  {
    id: 'bloodpool_crimson_plasma',
    name: '凝血导管',
    rarity: '普通',
    category: '血池',
    effect: '战斗中的回复效果增加25%',
    description: '战斗中造成的生命回复效果提高25%。',
  },
  {
    id: 'bloodpool_crimson_membrane',
    name: '赤膜增殖囊',
    rarity: '稀有',
    category: '血池',
    effect: '每2回合增长1点临时生命上限',
    description: '每经过2个己方回合开始，获得1点临时生命上限。',
    hooks: {
      onBattleStart: ({ state }) => {
        state['turnCounter'] = 0;
      },
      onTurnStart: ({ count, side, state, addStatusEffect, addLog }) => {
        const turnCounter = Math.max(0, Math.floor(Number(state['turnCounter'] ?? 0))) + 1;
        state['turnCounter'] = turnCounter;
        if (turnCounter % 2 !== 0) return;
        const gain = Math.max(1, Math.floor(count));
        if (addStatusEffect(side, EffectType.TEMP_MAX_HP, gain, { source: 'relic:bloodpool_crimson_membrane' })) {
          addLog(`[赤膜增殖囊] 第 ${turnCounter} 回合触发，临时生命上限 +${gain}。`);
        }
      },
    },
  },
  {
    id: 'bloodpool_hemostatic_valve',
    name: '凝血限流阀',
    rarity: '稀有',
    category: '血池',
    effect: '自己每次受到的伤害不能超过10点',
    description: '单次受到的伤害上限为10点。',
  },
  {
    id: 'bloodpool_reflow_mark',
    name: '回流刻印',
    rarity: '稀有',
    category: '血池',
    effect: '每回复一次生命值，当前回合点数+1（每回合最多2次）',
    description: '每当你在当前回合回复一次生命值，本回合后续卡牌点数+1（每回合最多触发2次）。',
    hooks: {
      onTurnStart: ({ state }) => {
        state['healTriggersThisTurn'] = 0;
      },
      modifyFinalPoint: ({ currentPoint, state, isPreview, addLog }) => {
        const bonus = Math.max(0, Math.floor(Number(state['healTriggersThisTurn'] ?? 0)));
        if (bonus <= 0) return currentPoint;
        if (!isPreview) {
          addLog(`[回流刻印] 本次点数 +${bonus}。`);
        }
        return currentPoint + bonus;
      },
    },
  },
  {
    id: 'bloodpool_clash_point_mark',
    name: '骰蚀刻印',
    rarity: '稀有',
    category: '血池',
    effect: '拼点成功时给对方施加1层流血',
    description: '每次拼点成功时，对手获得1层流血。',
  },
  {
    id: 'bloodpool_first_bleed_feast',
    name: '噬血水蛭',
    rarity: '普通',
    category: '血池',
    effect: '敌人首次受到流血伤害时，我方回复等量生命',
    description: '每场战斗中，敌人第一次受到流血伤害时，你回复等量生命值。',
  },
  {
    id: 'bloodpool_halfline_resonance',
    name: '半阈共振核',
    rarity: '传奇',
    category: '血池',
    effect: '拼点失败时对对方施加3层流血；自身生命跨越50%阈值时触发敌方流血一次',
    description: '拼点失败时对对方施加3层流血，每次你的生命值在50%阈值上下跨越时，立即触发一次敌方流血伤害。',
  },
  {
    id: 'bloodpool_red_headband',
    name: '红色头带',
    rarity: '传奇',
    category: '血池',
    effect: '拥有流血时最终点数+1，生命低于50%时最终点数*1.3',
    description: '拥有流血时，最终点数+1，生命低于50%时，最终点数*1.3。',
  },
  {
    id: 'bloodpool_eerie_miniature_painting',
    name: '诡异微型画作',
    rarity: '传奇',
    category: '血池',
    effect: '战斗开始时对对方施加4层流血；对方触发燃烧或中毒时触发1次流血',
    description: '战斗开始时对对方施加4层流血，当对方触发燃烧或中毒时，触发1次流血效果。',
    hooks: {
      onBattleStart: ({ count, side, addStatusEffect, addLog }) => {
        const targetSide: RelicSide = side === 'player' ? 'enemy' : 'player';
        const stacks = 4 * Math.max(1, Math.floor(count));
        if (addStatusEffect(targetSide, EffectType.BLEED, stacks, {
          source: 'relic:bloodpool_eerie_miniature_painting',
          lockDecayThisTurn: true,
        })) {
          addLog(`[诡异微型画作] 战斗开始，对敌方施加 ${stacks} 层流血。`);
        }
      },
    },
  },
  {
    id: 'bloodpool_eerie_statue',
    name: '诡异雕像',
    rarity: '传奇',
    category: '血池',
    effect: '使用行动牌时对对方施加1层流血；拼点不再触发对方流血；回合结束触发1次对方流血',
    description: '使用行动牌时对对方施加1层流血，拼点不再触发对方流血效果，回合结束时触发1次对方的流血效果。',
  },
  {
    id: 'bloodpool_horror_record',
    name: '惊悚唱片',
    rarity: '传奇',
    category: '血池',
    effect: '回合开始时对双方施加1层流血；流血会被易伤影响',
    description: '回合开始时对双方施加1层流血，流血现在会被易伤影响。',
    hooks: {
      onTurnStart: ({ count, addStatusEffect, addLog }) => {
        const stacks = Math.max(1, Math.floor(count));
        const playerApplied = addStatusEffect('player', EffectType.BLEED, stacks, {
          source: 'relic:bloodpool_horror_record',
          lockDecayThisTurn: true,
        });
        const enemyApplied = addStatusEffect('enemy', EffectType.BLEED, stacks, {
          source: 'relic:bloodpool_horror_record',
          lockDecayThisTurn: true,
        });
        if (playerApplied || enemyApplied) {
          addLog(`[惊悚唱片] 回合开始，对双方施加 ${stacks} 层流血。`);
        }
      },
    },
  },
  {
    id: 'bloodpool_bloodstained_blade',
    name: '染血刃',
    rarity: '传奇',
    category: '血池',
    effect: '被物理/魔法牌命中时为对方施加1层流血；使用物理/魔法牌命中时触发1次对方流血',
    description: '被物理/魔法牌命中时为对方施加1层流血，使用物理/魔法牌命中时触发1次对方的流血。',
    hooks: {
      onAfterHitTaken: ({ count, side, targetSide, sourceSide, card, attemptedDamage, addStatusEffect, addLog }) => {
        if (targetSide !== side || !sourceSide || sourceSide === side) return;
        if (card.type !== CardType.PHYSICAL && card.type !== CardType.MAGIC) return;
        if (attemptedDamage <= 0) return;
        const stacks = Math.max(1, Math.floor(count));
        if (addStatusEffect(sourceSide, EffectType.BLEED, stacks, {
          source: 'relic:bloodpool_bloodstained_blade',
          lockDecayThisTurn: true,
        })) {
          addLog(`[染血刃] 被命中时，为对方施加 ${stacks} 层流血。`);
        }
      },
    },
  },
  {
    id: 'bloodpool_fetal_cocoon',
    name: '胎生血茧',
    rarity: '传奇',
    category: '血池',
    effect: '战斗开始时受到一次50%当前生命值的真实伤害，并获得1层血茧',
    description: '战斗开始时，自身受到一次50%当前生命值的真实伤害，并获得1层血茧。',
    hooks: {
      onBattleStart: ({ count, side, self, addStatusEffect, addLog }) => {
        const currentHp = Math.max(0, Math.floor(self.hp));
        const trueDamage = currentHp > 0 ? Math.max(1, Math.floor(currentHp * 0.5)) : 0;
        if (trueDamage > 0) {
          self.hp = Math.max(0, self.hp - trueDamage);
          addLog(`[胎生血茧] 战斗开始：受到 ${trueDamage} 点真实伤害。`);
        }
        const cocoonStacks = Math.max(1, Math.floor(count));
        if (addStatusEffect(side, EffectType.BLOOD_COCOON, cocoonStacks, { source: 'relic:bloodpool_fetal_cocoon' })) {
          addLog(`[胎生血茧] 获得 ${cocoonStacks} 层血茧。`);
        }
      },
    },
  },
  {
    id: 'bloodpool_critical_rebound',
    name: '危线回流',
    rarity: '稀有',
    category: '血池',
    effect: '战斗中首次生命低于一半时，回复10点生命',
    description: '每场战斗中，第一次生命值低于50%时，立即回复10点生命。',
  },
];

const RELIC_BY_ID = new Map(RELIC_LIST.map(relic => [relic.id, relic]));
const RELIC_BY_NAME = new Map(RELIC_LIST.map(relic => [relic.name, relic]));
const RELIC_NAME_ALIASES = new Map<string, string>([
  ['火焰史莱姆', '火焰护符'],
  ['草莓', '小小草莓'],
  ['梨', '小小梨'],
  ['芒果', '小小芒果'],
]);

export function getAllRelics(): readonly RelicData[] {
  return RELIC_LIST;
}

export function getRelicById(id: string): RelicData | undefined {
  return RELIC_BY_ID.get(id);
}

export function getRelicByName(name: string): RelicData | undefined {
  const normalizedName = RELIC_NAME_ALIASES.get(name) ?? name;
  return RELIC_BY_NAME.get(normalizedName);
}

export function getRelicsByCategory(category: RelicCategory): readonly RelicData[] {
  return RELIC_LIST.filter(relic => relic.category === category);
}

export function resolveRelicMap(raw: Record<string, number> | null | undefined): ResolvedRelicEntry[] {
  if (!raw || typeof raw !== 'object') return [];

  const aggregated = new Map<string, ResolvedRelicEntry>();

  for (const [key, value] of Object.entries(raw)) {
    const count = Math.max(0, Math.floor(Number(value ?? 0)));
    if (!key || count <= 0) continue;

    const normalizedKey = RELIC_NAME_ALIASES.get(key) ?? key;
    const relic = RELIC_BY_ID.get(key) ?? RELIC_BY_NAME.get(normalizedKey);
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
