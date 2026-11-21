import { CardType, EffectType, type CardData } from '../types';

/**
 * 事件类卡牌（category: '事件'）。
 * 不进入战斗奖励 / 商店等常规卡池，只能通过事件结局获得。
 * 依赖特殊结算的卡牌在 CombatView 中按 id 补充（见 EVENT_CARD_ID）。
 */

export const EVENT_CARD_CATEGORY = '事件';

export const EVENT_CARD_ID = {
  LUCKY_COIN: 'event_lucky_coin',
  JAILER_WHIP: 'event_jailer_whip',
  HOLY_LIGHT: 'event_holy_light',
  GUILT: 'event_guilt',
  DEBT: 'event_debt',
} as const;

/** 幸运币：原始点数随机×2或×0.5，连击（倍率在 CombatView 中按 id 结算） */
const 幸运币: CardData = {
  id: EVENT_CARD_ID.LUCKY_COIN,
  name: '幸运币',
  type: CardType.FUNCTION,
  category: EVENT_CARD_CATEGORY,
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [],
  description: '原始点数随机×2或×0.5，连击',
};

/** 狱卒的鞭子：点数+10，造成1倍点数伤害，打出后自身获得1层敏感 */
const 狱卒的鞭子: CardData = {
  id: EVENT_CARD_ID.JAILER_WHIP,
  name: '狱卒的鞭子',
  type: CardType.PHYSICAL,
  category: EVENT_CARD_CATEGORY,
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 10 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数+10，造成1倍点数伤害，打出后自身获得1层敏感',
};

/** 圣光：消耗6，点数×3，造成1倍点数伤害，群攻，无视闪避，打出后自身获得1层圣痕 */
const 圣光: CardData = {
  id: EVENT_CARD_ID.HOLY_LIGHT,
  name: '圣光',
  type: CardType.MAGIC,
  category: EVENT_CARD_CATEGORY,
  rarity: '稀有',
  manaCost: 6,
  calculation: { multiplier: 3.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.STIGMATA, target: 'self', valueMode: 'fixed', fixedValue: 1 },
  ],
  description: '点数×3，造成1倍点数伤害，群攻，无视闪避，打出后自身获得1层圣痕',
  ignoreDodge: true,
  swarmAttack: true,
};

/** 愧疚：诅咒，无法打出；在温泉中会被净化为【空白】（其他诅咒在温泉中先被净化为愧疚） */
const 愧疚: CardData = {
  id: EVENT_CARD_ID.GUILT,
  name: '愧疚',
  type: CardType.CURSE,
  category: EVENT_CARD_CATEGORY,
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, unplayable: true },
  cardEffects: [],
  description: '无法打出。可在温泉中被净化为【空白】',
};

/** 债务：诅咒，无法打出；回合结束时若仍在手中，金币-1（在 CombatView 中按 id 结算） */
const 债务: CardData = {
  id: EVENT_CARD_ID.DEBT,
  name: '债务',
  type: CardType.CURSE,
  category: EVENT_CARD_CATEGORY,
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false, unplayable: true },
  cardEffects: [],
  description: '无法打出。回合结束时若仍在手中，金币-1',
};

// ── 七原罪 ───────────────────────────────────────────────────────
// 事件类卡牌，但带有对应罪书体系的"隐藏卡池"属性（见 poolCategory）。
// 持有对应罪书圣遗物时"共鸣"：原罪副作用被削弱或改写（见 resonatedSideEffect；傲慢共鸣后改为无视拼点）。
// 依赖战斗时机的效果在 CombatView 中按 SIN_CARD_ID 结算。

export const SIN_CARD_ID = {
  ARROGANCE: 'event_sin_arrogance',
  ENVY: 'event_sin_envy',
  WRATH: 'event_sin_wrath',
  SLOTH: 'event_sin_sloth',
  GREED: 'event_sin_greed',
  GLUTTONY: 'event_sin_gluttony',
  LUST: 'event_sin_lust',
} as const;

const sinCard = (card: Omit<CardData, 'category' | 'rarity'>): CardData => ({
  ...card,
  category: EVENT_CARD_CATEGORY,
  rarity: '稀有',
});

const 原罪傲慢 = sinCard({
  id: SIN_CARD_ID.ARROGANCE,
  name: '原罪·傲慢',
  type: CardType.MAGIC,
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 3.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成3倍点数伤害',
  sin: {
    sin: '傲慢',
    bookRelicId: 'modao_arrogance_book',
    bookRelicName: '傲慢之书',
    poolCategory: '魔导',
    sideEffect: '若本次拼点即将获胜，则无视拼点，双方卡牌都会生效',
    resonanceNote: '无视拼点',
  },
});

const 原罪嫉妒 = sinCard({
  id: SIN_CARD_ID.ENVY,
  name: '原罪·嫉妒',
  type: CardType.DODGE,
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '闪避；闪避成功且敌方最大点数高于我方时，敌方最大点数-1',
  sin: {
    sin: '嫉妒',
    bookRelicId: 'system_shadow_relic_02',
    bookRelicName: '嫉妒之书',
    poolCategory: '暗影',
    sideEffect: '打出后敌方最小点数+1',
    resonatedSideEffect: '打出后敌方获得2层蓄力',
  },
});

const 原罪暴怒 = sinCard({
  id: SIN_CARD_ID.WRATH,
  name: '原罪·暴怒',
  type: CardType.PHYSICAL,
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害；本场战斗每受到1次伤害，点数+1',
  sin: {
    sin: '暴怒',
    bookRelicId: 'system_destruction_relic_01',
    bookRelicName: '暴怒之书',
    poolCategory: '破坏',
    sideEffect: '打出后自身获得X层燃烧（X为点数加成的一半）',
    resonatedSideEffect: '打出后自身获得1层燃烧',
  },
});

const 原罪怠惰 = sinCard({
  id: SIN_CARD_ID.SLOTH,
  name: '原罪·怠惰',
  type: CardType.FUNCTION,
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '回合结束时若在手牌中，获得2倍点数的护甲。打出无效果',
  sin: {
    sin: '怠惰',
    bookRelicId: 'burn_sloth_book',
    bookRelicName: '怠惰之书',
    poolCategory: '燃烧',
    sideEffect: '回合结束时若在手牌中，我方最大点数-1',
    resonatedSideEffect: '回合结束时若在手牌中，我方获得2层疲劳',
  },
});

const 原罪贪婪 = sinCard({
  id: SIN_CARD_ID.GREED,
  name: '原罪·贪婪',
  type: CardType.PHYSICAL,
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '点数无视一切修正，等于当前金币数（含临时金币），造成1倍点数伤害',
  sin: {
    sin: '贪婪',
    bookRelicId: 'system_wealth_relic_15',
    bookRelicName: '贪婪之书',
    poolCategory: '财富',
    sideEffect: '打出后失去10%金币',
    resonatedSideEffect: '打出后失去1金币',
  },
});

const 原罪暴食 = sinCard({
  id: SIN_CARD_ID.GLUTTONY,
  name: '原罪·暴食',
  type: CardType.PHYSICAL,
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '造成1倍点数伤害并回复等量生命；本场每打出1次，伤害倍率+0.5',
  sin: {
    sin: '暴食',
    bookRelicId: 'bloodpool_gluttony_book',
    bookRelicName: '暴食之书',
    poolCategory: '血池',
    sideEffect: '每回合结束多受到5%当前生命的真实伤害(可叠加)',
    resonatedSideEffect: '每回合结束多受到2%当前生命的真实伤害(可叠加)',
  },
});

const 原罪色欲 = sinCard({
  id: SIN_CARD_ID.LUST,
  name: '原罪·色欲',
  type: CardType.FUNCTION,
  manaCost: 0,
  calculation: { multiplier: 1.0, addition: 0 },
  damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: true, reroll: 'none', draw: false },
  cardEffects: [
    { kind: 'apply_buff', effectType: EffectType.VULNERABLE, target: 'enemy', valueMode: 'point_scale', scale: 0.5 },
  ],
  description: '敌方获得0.5倍点数层敏感，连击',
  sin: {
    sin: '色欲',
    bookRelicId: 'alchemy_lust_book',
    bookRelicName: '色欲之书',
    poolCategory: '炼金',
    sideEffect: '自身获得等量敏感',
    resonatedSideEffect: '自身获得1层敏感',
  },
});

export const SIN_CARDS: readonly CardData[] = [原罪傲慢, 原罪嫉妒, 原罪暴怒, 原罪怠惰, 原罪贪婪, 原罪暴食, 原罪色欲];

/** 领主战奖励：每个奖励槽变为原罪卡牌的概率 */
export const SIN_REWARD_SLOT_CHANCE = 0.05;

export const isSinCard = (card: Pick<CardData, 'sin'> | null | undefined): boolean => Boolean(card?.sin);

/** 是否与对应罪书共鸣：圣遗物库存（键可能是名称或 id）中持有对应罪书 */
export const isSinResonatedByInventory = (
  card: Pick<CardData, 'sin'>,
  relicInventory: Record<string, unknown> | null | undefined,
): boolean => {
  if (!card.sin || !relicInventory) return false;
  const count = (key: string) => Math.max(0, Math.floor(Number(relicInventory[key] ?? 0)) || 0);
  return count(card.sin.bookRelicName) > 0 || count(card.sin.bookRelicId) > 0;
};

/** 卡组中尚未拥有的原罪卡（每种原罪最多 1 张） */
const unownedSinCards = (ownedCardNames: readonly string[]): CardData[] => {
  const owned = new Set(ownedCardNames.map(name => String(name ?? '').trim()));
  return SIN_CARDS.filter(card => !owned.has(card.name));
};

/** 领主战奖励候选：携带的魔法书体系对应的、尚未拥有的原罪卡 */
export const getSinRewardCandidates = (
  carriedCategories: readonly string[],
  ownedCardNames: readonly string[],
): CardData[] => {
  const categories = new Set(carriedCategories);
  return unownedSinCards(ownedCardNames).filter(card => card.sin && categories.has(card.sin.poolCategory));
};

/**
 * 诅咒绽放（净化与堕落·蜜池）：为 count 张诅咒各挑一张不重复的原罪卡；
 * 七种都已拥有后不再变异（返回的数量可能少于 count）。
 */
export const pickSinCardsForCurseBloom = (
  ownedCardNames: readonly string[],
  count: number,
  random: () => number = Math.random,
): CardData[] => {
  const pool = unownedSinCards(ownedCardNames);
  const picked: CardData[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  }
  return picked;
};

export const EVENT_CARDS: readonly CardData[] = [幸运币, 狱卒的鞭子, 圣光, 愧疚, 债务, ...SIN_CARDS];

/**
 * 温泉「净化诅咒」分两段：任意诅咒 → 【愧疚】，【愧疚】再净化 → 【空白】。
 * 返回净化后的卡名；不是诅咒（isCurse 为 false）时返回 null。
 * isCurse 由调用方提供（按卡牌注册表判定类型），避免本文件反向依赖 cardRegistry。
 */
export const resolveHotSpringCursePurify = (name: string, isCurse: (name: string) => boolean): string | null => {
  const key = name.trim();
  if (!key) return null;
  if (key === 愧疚.name) return '空白';
  return isCurse(key) ? 愧疚.name : null;
};
