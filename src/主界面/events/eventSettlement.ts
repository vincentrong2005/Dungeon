import {
  ENCHANT_SLOT_COUNT,
  canEnchantCard,
  getEnchantInfo,
  isRefineMaxed,
  normalizeEnchantList,
  resolveNextEnchantKey,
  type EnchantRequest,
} from '../battle/enchantRegistry';
import type { RelicData, RelicRarity } from '../battle/relicRegistry';
import {
  createCombatModifier,
  describeCombatModifier,
  normalizeCombatModifiers,
  type CombatModifier,
  type CombatModifierInput,
} from '../combatModifiers';
import {
  addNegativeStatus,
  cleanseSingleNegativeStatus,
  normalizeNegativeStatusList,
  parseNegativeStatus,
  removeNegativeStatus,
} from '../negativeStatusRegistry';
import { CardType, type ActiveSkillData, type CardData, type CardRarity } from '../types';

/**
 * 事件结局结算的公共层：
 *   - SettlementDraft：在 stat_data 快照上做修改，并自动记录给 LLM 的结算说明；最后一次性导出变更字段
 *   - SettlementStep：需要玩家操作的结算步骤（由 EventSettlementModal 逐个处理）
 *   - SettlementPools：选卡 / 圣遗物 / 主动技等候选池（由 GameView 提供）
 */

// ── 新变量的数据结构 ──────────────────────────────────────────────

export interface DelayedReward {
  来源: string;
  剩余房间: number;
  /** 奖励类型：'稀有圣遗物' | '传奇圣遗物' */
  奖励: string;
  /** 发放时一并移除的负面状态，如 '孕育' */
  移除状态: string;
}

export interface TemporaryReplacement {
  来源: string;
  字段: '_技能' | '$主动';
  槽位: number;
  原名: string;
  原附魔: string;
  现名: string;
}

export const EVENT_ACTION_PHASES = ['', '待结算', '待操作', '已完成'] as const;
export type EventActionPhase = (typeof EVENT_ACTION_PHASES)[number];

export interface EventActionState {
  事件: string;
  结局: string;
  阶段: EventActionPhase;
  /** 小游戏等需要跨刷新保存的数据（JSON 字符串） */
  数据: string;
}

export const EMPTY_EVENT_ACTION_STATE: EventActionState = { 事件: '', 结局: '', 阶段: '', 数据: '' };

export const normalizeEventActionState = (value: unknown): EventActionState => {
  if (!value || typeof value !== 'object') return { ...EMPTY_EVENT_ACTION_STATE };
  const raw = value as Record<string, unknown>;
  const phase = EVENT_ACTION_PHASES.includes(raw.阶段 as EventActionPhase) ? (raw.阶段 as EventActionPhase) : '';
  return {
    事件: typeof raw.事件 === 'string' ? raw.事件 : '',
    结局: typeof raw.结局 === 'string' ? raw.结局 : '',
    阶段: phase,
    数据: typeof raw.数据 === 'string' ? raw.数据 : '',
  };
};

export const normalizeDelayedRewards = (value: unknown): DelayedReward[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map(item => ({
          来源: typeof item.来源 === 'string' ? item.来源 : '',
          剩余房间: Math.max(0, Math.floor(Number(item.剩余房间) || 0)),
          奖励: typeof item.奖励 === 'string' ? item.奖励 : '',
          移除状态: typeof item.移除状态 === 'string' ? item.移除状态 : '',
        }))
        .filter(item => item.奖励)
    : [];

export const normalizeTemporaryReplacements = (value: unknown): TemporaryReplacement[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map(item => ({
          来源: typeof item.来源 === 'string' ? item.来源 : '',
          字段: item.字段 === '$主动' ? ('$主动' as const) : ('_技能' as const),
          槽位: Math.max(0, Math.floor(Number(item.槽位) || 0)),
          原名: typeof item.原名 === 'string' ? item.原名 : '',
          原附魔: typeof item.原附魔 === 'string' ? item.原附魔 : '',
          现名: typeof item.现名 === 'string' ? item.现名 : '',
        }))
        .filter(item => item.现名)
    : [];

export const normalizeNoticeList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

// ── 候选池 ──────────────────────────────────────────────────────

export interface SettlementPools {
  floor: number;
  /** 基础 + 已携带魔法书体系 */
  carriedCategories: string[];
  /** 全部可作为奖励的卡牌（不含敌人卡、事件卡、起始基础卡） */
  rewardableCards: CardData[];
  /** 当前可用的主动技奖励池 */
  rewardActiveSkills: ActiveSkillData[];
  /** 圣遗物奖励池（已排除事件类与已拥有的稀有/传奇） */
  relicPool: RelicData[];
  /** 随机诅咒牌池 */
  curseNames: string[];
  /** 四张普通基础牌（净化诅咒用） */
  basicCardNames: string[];
  resolveCard: (name: string) => CardData | undefined;
  resolveRelic: (key: string) => RelicData | undefined;
  resolveActive: (name: string) => ActiveSkillData | undefined;
  getEnemyDeck: (enemyName: string) => CardData[];
}

export type Random = () => number;

export const pickOne = <T>(items: readonly T[], random: Random = Math.random): T | null =>
  items.length > 0 ? items[Math.floor(random() * items.length)]! : null;

export const pickMany = <T>(items: readonly T[], count: number, random: Random = Math.random): T[] => {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  }
  return picked;
};

/** 宝箱稀有度：普通 80% / 稀有 15% / 传奇 5% */
export const rollChestRarity = (random: Random = Math.random): RelicRarity => {
  const roll = random();
  if (roll < 0.8) return '普通';
  if (roll < 0.95) return '稀有';
  return '传奇';
};

export const RARITY_ORDER: readonly RelicRarity[] = ['普通', '稀有', '传奇'];

export const nextRarity = (rarity: RelicRarity): RelicRarity =>
  RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, RARITY_ORDER.indexOf(rarity) + 1)]!;

/** 按稀有度抽取圣遗物；该稀有度无货时退回任意稀有度 */
export const pickRelics = (
  pools: SettlementPools,
  rarity: RelicRarity | '宝箱',
  count: number,
  options: { excludeIds?: Iterable<string>; random?: Random } = {},
): RelicData[] => {
  const random = options.random ?? Math.random;
  const used = new Set(options.excludeIds ?? []);
  const picked: RelicData[] = [];
  for (let i = 0; i < count; i += 1) {
    const target = rarity === '宝箱' ? rollChestRarity(random) : rarity;
    const available = pools.relicPool.filter(relic => !used.has(relic.id));
    const relic = pickOne(available.filter(item => item.rarity === target), random) ?? pickOne(available, random);
    if (!relic) break;
    used.add(relic.id);
    picked.push(relic);
  }
  return picked;
};

export const pickRandomCurseName = (pools: SettlementPools, random: Random = Math.random): string | null =>
  pickOne(pools.curseNames.filter(name => Boolean(pools.resolveCard(name))), random);

/** 从卡池中抽取 count 张不重复的卡；指定稀有度无货时用另一稀有度补齐 */
export const pickCardOptions = (
  cards: readonly CardData[],
  count: number,
  options: { rarity?: CardRarity; excludeNames?: Iterable<string>; random?: Random } = {},
): CardData[] => {
  const random = options.random ?? Math.random;
  const exclude = new Set(options.excludeNames ?? []);
  const available = cards.filter(card => !exclude.has(card.name) && card.type !== CardType.CURSE);
  const preferred = options.rarity ? available.filter(card => card.rarity === options.rarity) : available;
  const picked = pickMany(preferred, count, random);
  if (picked.length < count) {
    const pickedNames = new Set(picked.map(card => card.name));
    picked.push(...pickMany(available.filter(card => !pickedNames.has(card.name)), count - picked.length, random));
  }
  return picked;
};

/** 每张卡独立按概率决定稀有度（宿舍的姐妹·夜间侍奉：每张 15% 稀有） */
export const pickCardOptionsWithRareChance = (
  cards: readonly CardData[],
  count: number,
  rareChance: number,
  random: Random = Math.random,
): CardData[] => {
  const picked: CardData[] = [];
  for (let i = 0; i < count; i += 1) {
    const rarity: CardRarity = random() < rareChance ? '稀有' : '普通';
    const next = pickCardOptions(cards, 1, { rarity, excludeNames: picked.map(card => card.name), random })[0];
    if (next) picked.push(next);
  }
  return picked;
};

// ── 变异 ────────────────────────────────────────────────────────

export type TransformMode =
  /** 同体系、同稀有度的随机另一张（欲之熔炉·血肉重铸） */
  | { type: 'sameCategorySameRarity' }
  /** 同体系候选 N 选 1（补考） */
  | { type: 'pickSameCategory'; rarity: CardRarity; count: number }
  /** 随机体系（含未携带体系）的稀有卡（鞭笞重铸·十鞭） */
  | { type: 'randomCategoryRare' }
  /** 同体系的随机稀有卡（鞭笞重铸·求鞭） */
  | { type: 'sameCategoryRare' };

const isTransformableCategory = (category: string) => category !== '敌人' && category !== '事件';

/** 根据被变异的卡生成候选（随机型只返回 1 张） */
export const buildTransformCandidates = (
  card: CardData,
  mode: TransformMode,
  pools: SettlementPools,
  random: Random = Math.random,
): CardData[] => {
  const sourceCategory = isTransformableCategory(card.category)
    ? card.category
    : (pickOne(pools.carriedCategories, random) ?? '基础');
  const sameCategory = pools.rewardableCards.filter(item => item.category === sourceCategory && item.name !== card.name);
  switch (mode.type) {
    case 'sameCategorySameRarity':
      return pickCardOptions(sameCategory, 1, { rarity: card.rarity, random });
    case 'pickSameCategory':
      return pickCardOptions(sameCategory, mode.count, { rarity: mode.rarity, random });
    case 'sameCategoryRare':
      return pickCardOptions(sameCategory, 1, { rarity: '稀有', random });
    case 'randomCategoryRare': {
      const categories = Array.from(new Set(pools.rewardableCards.map(item => item.category))).filter(isTransformableCategory);
      const category = pickOne(categories, random) ?? sourceCategory;
      const pool = pools.rewardableCards.filter(item => item.category === category && item.name !== card.name);
      return pickCardOptions(pool, 1, { rarity: '稀有', random });
    }
  }
};

// ── 结算步骤 ────────────────────────────────────────────────────

export interface PresetOption {
  id: string;
  label: string;
  description: string;
  modifiers: CombatModifierInput[];
}

export type StatusChoiceMode =
  /** 移除 1 个可净化的负面状态 */
  | 'remove'
  /** 移除 1 个状态并转为一张卡的【刑印】 */
  | 'brand'
  /** 把 1 个状态改写为 [淫纹] */
  | 'rewriteYinwen';

export type SettlementStep =
  | { kind: 'relic'; title: string; relics: RelicData[] }
  | { kind: 'curse'; title: string; curseName: string }
  | { kind: 'cardPick'; title: string; options: CardData[]; temporarySource?: string }
  | { kind: 'cardTransform'; title: string; mode: TransformMode }
  | { kind: 'cardCopy'; title: string }
  | { kind: 'enchant'; title: string; enchant: EnchantRequest }
  | { kind: 'statusChoice'; title: string; mode: StatusChoiceMode; candidates: string[] }
  | { kind: 'relicSell'; title: string; multiplier: number }
  | { kind: 'relicTrade'; title: string; tierUp: boolean }
  | { kind: 'activePick'; title: string; options: ActiveSkillData[]; temporarySource?: string }
  | { kind: 'presetPick'; title: string; options: PresetOption[]; source: string }
  | { kind: 'info'; title: string; lines: string[] };

// ── 结算草稿 ────────────────────────────────────────────────────

export interface SettlementEnvironment {
  floor: number;
  /** 由基础生命上限与圣遗物库存计算实际生命上限（含被动加成与难度修正） */
  effectiveMaxHp: (baseMaxHp: number, relics: Record<string, number>) => number;
}

interface ConsumableEntry {
  名字: string;
  描述: string;
  回复: number;
}

interface InventoryItemEntry {
  名字: string;
  描述: string;
}

const toInt = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

const cloneDeepJson = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null)) as T;

const normalizeRelicMap = (value: unknown): Record<string, number> => {
  const result: Record<string, number> = {};
  if (!value || typeof value !== 'object') return result;
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (key && n > 0) result[key] = n;
  }
  return result;
};

const normalizeConsumables = (value: unknown): ConsumableEntry[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map(item => ({
          名字: String(item.名字 ?? ''),
          描述: String(item.描述 ?? ''),
          回复: Math.max(0, Math.floor(Number(item.回复) || 0)),
        }))
    : [];

const normalizeItems = (value: unknown): InventoryItemEntry[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map(item => ({ 名字: String(item.名字 ?? ''), 描述: String(item.描述 ?? '') }))
    : [];

export class SettlementDraft {
  hp: number;
  baseMaxHp: number;
  mana: number;
  gold: number;
  minDice: number;
  maxDice: number;
  statuses: string[];
  skills: string[];
  enchants: string[];
  actives: string[];
  relics: Record<string, number>;
  consumables: ConsumableEntry[];
  items: InventoryItemEntry[];
  modifiers: CombatModifier[];
  delayed: DelayedReward[];
  tempReplacements: TemporaryReplacement[];
  extraFields: Record<string, any> = {};
  /** 给 LLM 的结算说明（逐条） */
  notices: string[] = [];
  /** 提交后需要强制替换进卡组的诅咒牌 */
  curses: string[] = [];
  /** 本次新增的圣遗物（提交时需要触发获得效果） */
  addedRelics: RelicData[] = [];

  private readonly original: Record<string, any>;
  private readonly env: SettlementEnvironment;

  constructor(statData: Record<string, any>, env: SettlementEnvironment) {
    this.env = env;
    this.original = cloneDeepJson(statData ?? {});
    const sd = this.original;
    const inventory = sd.携带的物品 && typeof sd.携带的物品 === 'object' ? sd.携带的物品 : {};
    this.baseMaxHp = Math.max(1, toInt(sd._血量上限, 20));
    this.hp = Math.max(0, toInt(sd._血量, this.baseMaxHp));
    this.mana = Math.max(0, toInt(sd.$魔量, 1));
    this.gold = Math.max(0, toInt(sd._金币, 0));
    this.minDice = Math.max(1, toInt(sd.$最小点数, 1));
    this.maxDice = Math.max(this.minDice, toInt(sd.$最大点数, 6));
    this.statuses = normalizeNegativeStatusList(sd.$负面状态);
    this.skills = Array.from({ length: ENCHANT_SLOT_COUNT }, (_, i) => String((sd._技能 ?? [])[i] ?? ''));
    this.enchants = normalizeEnchantList(sd._附魔);
    this.actives = Array.from({ length: 2 }, (_, i) => String((sd.$主动 ?? [])[i] ?? ''));
    this.relics = normalizeRelicMap(inventory._圣遗物);
    this.consumables = normalizeConsumables(inventory.消耗品);
    this.items = normalizeItems(inventory.物品);
    this.modifiers = normalizeCombatModifiers(sd.$战斗修正);
    this.delayed = normalizeDelayedRewards(sd.$延迟奖励);
    this.tempReplacements = normalizeTemporaryReplacements(sd.$临时替换);
  }

  get floor(): number {
    return this.env.floor;
  }

  get maxHp(): number {
    return Math.max(1, this.env.effectiveMaxHp(this.baseMaxHp, this.relics));
  }

  get originalStatData(): Readonly<Record<string, any>> {
    return this.original;
  }

  notice(text: string) {
    const line = text.trim();
    if (line) this.notices.push(line);
  }

  // ── 生命 / 属性 ──
  heal(amount: number) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, Math.floor(amount)));
    if (this.hp > before) this.notice(`生命 ${before} → ${this.hp}`);
  }

  healPercentOfMax(ratio: number) {
    this.heal(Math.round(this.maxHp * ratio));
  }

  healToFull() {
    this.heal(this.maxHp);
  }

  /** 失去生命（事件不致死，最低保留 1 点） */
  loseHp(amount: number) {
    const before = this.hp;
    this.hp = Math.max(Math.min(before, 1), this.hp - Math.max(0, Math.floor(amount)));
    if (this.hp < before) this.notice(`失去${before - this.hp}点生命（${before} → ${this.hp}）`);
  }

  loseHpPercentOfCurrent(ratio: number) {
    this.loseHp(Math.floor(this.hp * ratio));
  }

  changeMaxHp(delta: number) {
    const value = Math.trunc(delta);
    if (value === 0) return;
    const beforeMax = this.maxHp;
    this.baseMaxHp = Math.max(1, this.baseMaxHp + value);
    if (value > 0) this.hp += value;
    this.hp = Math.min(this.hp, this.maxHp);
    this.notice(`生命上限 ${beforeMax} → ${this.maxHp}`);
  }

  /** 按当前生命上限的百分比增减（-0.25 = 减少 25%） */
  changeMaxHpPercent(ratio: number) {
    const delta = ratio < 0 ? -Math.max(1, Math.round(this.maxHp * -ratio)) : Math.max(1, Math.round(this.maxHp * ratio));
    this.changeMaxHp(delta);
  }

  changeMana(delta: number) {
    const before = this.mana;
    this.mana = Math.max(0, this.mana + Math.trunc(delta));
    if (this.mana !== before) this.notice(`魔量 ${before} → ${this.mana}`);
  }

  changeGold(delta: number) {
    const before = this.gold;
    this.gold = Math.max(0, this.gold + Math.trunc(delta));
    const actual = this.gold - before;
    if (actual > 0) this.notice(`获得${actual}金币`);
    if (actual < 0) this.notice(`失去${-actual}金币`);
  }

  changeMinDice(delta: number) {
    const before = this.minDice;
    this.minDice = Math.max(1, this.minDice + Math.trunc(delta));
    this.maxDice = Math.max(this.minDice, this.maxDice);
    if (this.minDice !== before) this.notice(`最小点数 ${before} → ${this.minDice}`);
  }

  // ── 负面状态 ──
  addStatus(key: string, stacks = 1) {
    const before = this.statuses;
    this.statuses = addNegativeStatus(this.statuses, key, stacks);
    if (this.statuses.length !== before.length || this.statuses.some((raw, i) => raw !== before[i])) {
      this.notice(`获得负面状态[${key}]${stacks > 1 ? `×${stacks}` : ''}`);
    }
  }

  hasStatus(key: string): boolean {
    return this.statuses.some(raw => parseNegativeStatus(raw).key === key);
  }

  removeStatusByKey(key: string) {
    if (!this.hasStatus(key)) return;
    this.statuses = removeNegativeStatus(this.statuses, key);
    this.notice(`负面状态[${key}]消失`);
  }

  /** 整条移除某个状态（不降级），用于改写类效果 */
  dropStatus(raw: string) {
    this.statuses = this.statuses.filter(item => item !== raw);
  }

  /** 按温泉规则净化单个状态（可降级的会降级） */
  cleanseStatus(raw: string) {
    const before = this.statuses;
    this.statuses = cleanseSingleNegativeStatus(this.statuses, raw);
    if (this.statuses.length !== before.length || this.statuses.some((item, i) => item !== before[i])) {
      this.notice(`负面状态${raw}被移除`);
    }
  }

  // ── 物品 ──
  addConsumable(name: string, description: string, healAmount: number, count = 1) {
    for (let i = 0; i < count; i += 1) {
      this.consumables.push({ 名字: name, 描述: description, 回复: Math.max(0, Math.floor(healAmount)) });
    }
    this.notice(`获得消耗品【${name}】×${count}（每个回复${healAmount}点生命）`);
  }

  ownedRelicCount(relic: Pick<RelicData, 'id' | 'name'>): number {
    return Math.max(this.relics[relic.name] ?? 0, this.relics[relic.id] ?? 0);
  }

  addRelic(relic: RelicData) {
    this.relics = { ...this.relics, [relic.name]: (this.relics[relic.name] ?? 0) + 1 };
    this.addedRelics.push(relic);
    this.notice(`获得圣遗物【${relic.name}】（${relic.rarity}）`);
  }

  /** 移除库存中的一件圣遗物（按库存键） */
  removeRelicKey(key: string, label?: string) {
    const count = this.relics[key] ?? 0;
    if (count <= 0) return false;
    const next = { ...this.relics };
    if (count <= 1) delete next[key];
    else next[key] = count - 1;
    this.relics = next;
    this.notice(`交出了圣遗物【${label ?? key}】`);
    return true;
  }

  // ── 卡组 ──
  isCurseSlot(slot: number, resolveCard: (name: string) => CardData | undefined): boolean {
    const card = resolveCard(this.skills[slot] ?? '');
    return card?.type === CardType.CURSE;
  }

  /** 替换卡组槽位；keepEnchant 为 true 时保留附魔（变异） */
  setSkill(slot: number, name: string, options: { keepEnchant?: boolean; silent?: boolean } = {}) {
    if (slot < 0 || slot >= ENCHANT_SLOT_COUNT) return;
    const before = this.skills[slot] ?? '';
    this.skills = this.skills.map((item, i) => (i === slot ? name : item));
    if (!options.keepEnchant) this.enchants = this.enchants.map((item, i) => (i === slot ? '' : item));
    if (!options.silent) {
      this.notice(before ? `卡组第${slot + 1}槽【${before}】变为【${name}】` : `卡组第${slot + 1}槽加入【${name}】`);
    }
  }

  copySkill(from: number, to: number) {
    const name = this.skills[from] ?? '';
    if (!name || from === to) return;
    const before = this.skills[to] ?? '';
    this.skills = this.skills.map((item, i) => (i === to ? name : item));
    this.enchants = this.enchants.map((item, i) => (i === to ? (this.enchants[from] ?? '') : item));
    this.notice(`复制了【${name}】，覆盖了第${to + 1}槽的【${before || '空槽位'}】`);
  }

  /** 附魔：精炼叠加升级，其余覆盖。返回是否生效 */
  enchantSlot(slot: number, request: EnchantRequest, resolveCard: (name: string) => CardData | undefined): boolean {
    const card = resolveCard(this.skills[slot] ?? '');
    if (!canEnchantCard(card)) return false;
    const current = this.enchants[slot] ?? '';
    if (request === '精炼' && isRefineMaxed(current)) return false;
    const next = resolveNextEnchantKey(current, request);
    this.enchants = this.enchants.map((item, i) => (i === slot ? next : item));
    const info = getEnchantInfo(next);
    this.notice(`【${this.skills[slot]}】获得附魔【${next}】${info ? `（${info.description}）` : ''}`);
    return true;
  }

  setActive(slot: number, name: string) {
    if (slot < 0 || slot > 1) return;
    const before = this.actives[slot] ?? '';
    this.actives = this.actives.map((item, i) => (i === slot ? name : item));
    this.notice(before ? `主动技【${before}】替换为【${name}】` : `获得主动技【${name}】`);
  }

  addTemporaryReplacement(entry: TemporaryReplacement) {
    this.tempReplacements = [...this.tempReplacements, entry];
  }

  queueCurse(curseName: string) {
    this.curses.push(curseName);
    this.notice(`被迫将一张卡替换为诅咒【${curseName}】（替换哪张由玩家选择）`);
  }

  // ── 限时效果 ──
  addModifier(source: string, input: CombatModifierInput, options: { silent?: boolean } = {}) {
    const modifier = createCombatModifier(source, input);
    this.modifiers = [...this.modifiers, modifier];
    if (!options.silent) this.notice(`获得限时效果：${describeCombatModifier(modifier)}`);
  }

  addDelayedReward(reward: DelayedReward) {
    this.delayed = [...this.delayed, { ...reward }];
  }

  setExtraField(key: string, value: any) {
    this.extraFields[key] = cloneDeepJson(value);
  }

  /** 导出与原始 stat_data 不同的字段 */
  toFields(): Record<string, any> {
    const sd = this.original;
    const fields: Record<string, any> = {};
    const differs = (a: unknown, b: unknown) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
    const setIfChanged = (key: string, next: unknown, previous: unknown) => {
      if (differs(next, previous)) fields[key] = cloneDeepJson(next);
    };

    setIfChanged('_血量', this.hp, toInt(sd._血量, this.hp));
    setIfChanged('_血量上限', this.baseMaxHp, toInt(sd._血量上限, this.baseMaxHp));
    setIfChanged('$魔量', this.mana, toInt(sd.$魔量, this.mana));
    setIfChanged('_金币', this.gold, toInt(sd._金币, this.gold));
    setIfChanged('$最小点数', this.minDice, toInt(sd.$最小点数, this.minDice));
    setIfChanged('$最大点数', this.maxDice, toInt(sd.$最大点数, this.maxDice));
    setIfChanged('$负面状态', this.statuses, normalizeNegativeStatusList(sd.$负面状态));
    const skillsChanged = differs(this.skills, Array.from({ length: ENCHANT_SLOT_COUNT }, (_, i) => String((sd._技能 ?? [])[i] ?? '')));
    const enchantsChanged = differs(this.enchants, normalizeEnchantList(sd._附魔));
    if (skillsChanged) fields._技能 = [...this.skills];
    // 卡组变化时总是显式写出附魔，避免统一写入口再按卡名变化清空（变异需要保留附魔）
    if (skillsChanged || enchantsChanged) fields._附魔 = [...this.enchants];
    setIfChanged('$主动', this.actives, Array.from({ length: 2 }, (_, i) => String((sd.$主动 ?? [])[i] ?? '')));

    const inventory = sd.携带的物品 && typeof sd.携带的物品 === 'object' ? sd.携带的物品 : {};
    if (
      differs(this.relics, normalizeRelicMap(inventory._圣遗物)) ||
      differs(this.consumables, normalizeConsumables(inventory.消耗品)) ||
      differs(this.items, normalizeItems(inventory.物品))
    ) {
      fields.携带的物品 = { 物品: cloneDeepJson(this.items), _圣遗物: { ...this.relics }, 消耗品: cloneDeepJson(this.consumables) };
    }
    setIfChanged('$战斗修正', this.modifiers, normalizeCombatModifiers(sd.$战斗修正));
    setIfChanged('$延迟奖励', this.delayed, normalizeDelayedRewards(sd.$延迟奖励));
    setIfChanged('$临时替换', this.tempReplacements, normalizeTemporaryReplacements(sd.$临时替换));
    for (const [key, value] of Object.entries(this.extraFields)) fields[key] = cloneDeepJson(value);
    return fields;
  }
}

/** 把结算说明包装为一条注入 user 楼层的文本 */
export const formatEventSettlementNotice = (eventName: string, verdictLabel: string, lines: readonly string[]): string | null => {
  const content = lines.map(line => line.trim()).filter(Boolean);
  if (content.length === 0) return null;
  return [`事件【${eventName}】${verdictLabel}结算：`, ...content.map(line => `- ${line}`)].join('\n');
};

export const EVENT_SETTLEMENT_NOTICE_FOOTER =
  '以上结果已由系统写入变量（生命、金币、卡组、圣遗物、消耗品、负面状态等），正文只需按剧情描写，不要再修改或重复添加这些变量。';

export const buildEventSettlementBlock = (notices: readonly string[]): string | null => {
  const active = notices.map(item => item.trim()).filter(Boolean);
  if (active.length === 0) return null;
  return `<事件结算>\n${active.join('\n\n')}\n${EVENT_SETTLEMENT_NOTICE_FOOTER}\n</事件结算>`;
};

/** 卡组中某张卡的显示名（含附魔） */
export const describeSlot = (draft: SettlementDraft, slot: number): string => {
  const name = draft.skills[slot] ?? '';
  const enchant = draft.enchants[slot] ?? '';
  return enchant ? `${name}（${enchant}）` : name;
};
