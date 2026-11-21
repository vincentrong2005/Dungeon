import { EffectType } from './types';

/**
 * 负面状态注册表。
 *
 * 负面状态存放在 `$负面状态`（字符串数组）中，形如 `[淫纹]`；可叠加的状态形如 `[3墨染]`。
 * 新增一个负面状态只需在 NEGATIVE_STATUS_DEFINITIONS 中加一条定义：
 *   - description：状态栏展示的说明
 *   - hotSpring：温泉净化时的处理（默认移除 / 豁免 / 降级为另一个状态）
 *   - persistOnRebirth：重生后是否保留
 *   - onBattleStart / onTurnStart：战斗效果（由 CombatView 统一调用）
 * 获得途径（事件、战斗败北、卡牌负面效果……）不写在这里，任何地方都可以用 addNegativeStatus 写入。
 * 同时记得在世界书中补充同名的 [状态] 条目，供 LLM 描写剧情。
 */

export interface NegativeStatusBattleContext {
  /** 叠加层数（非叠加状态恒为 1） */
  stacks: number;
  turn: number;
  enemyName: string;
  applyEffect: (effectType: EffectType, stacks: number, options?: { lockDecayThisTurn?: boolean }) => boolean;
  /** 向自身牌库随机插入卡牌，返回实际插入的数量（找不到卡牌定义时为 0） */
  insertCards: (cardName: string, count: number) => number;
  restoreMana: (amount: number) => number;
  /** 直接失去生命（真实伤害）；nonLethal 时最多降到 1 点 */
  loseHp: (amount: number, options?: { nonLethal?: boolean }) => number;
  random: () => number;
  log: (message: string) => void;
}

export type HotSpringBehavior = 'remove' | 'exempt' | { degradeTo: string };

export interface NegativeStatusDefinition {
  /** 状态名（不含方括号与层数），如 '淫纹'、'墨染' */
  key: string;
  /** 可叠加：以 [N名称] 形式存储，多个同名状态取最大层数 */
  stackable?: boolean;
  description: string | ((stacks: number) => string);
  hotSpring?: HotSpringBehavior;
  persistOnRebirth?: boolean;
  onBattleStart?: (ctx: NegativeStatusBattleContext) => void;
  onTurnStart?: (ctx: NegativeStatusBattleContext) => void;
}

const status = (definition: NegativeStatusDefinition) => definition;

/** [逾期]：生效楼层与非战斗节点被追缴的概率 */
export const OVERDUE_FLOOR = 2;
export const OVERDUE_BATTLE_CHANCE = 0.2;

export const NEGATIVE_STATUS_DEFINITIONS: readonly NegativeStatusDefinition[] = [
  // ── 战斗效果类 ──────────────────────────────────────────────
  status({
    key: '信息素',
    description: '每场战斗开始时向你的牌库随机插入3张【信息素】。',
    onBattleStart: ctx => {
      const inserted = ctx.insertCards('信息素', 3);
      ctx.log(inserted > 0 ? '开局向牌库插入了3张【信息素】。' : '未找到【信息素】卡牌定义。');
    },
  }),
  status({
    key: '淫纹',
    description: '每场战斗开始时，你获得3层中毒。',
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.POISON, 3)) ctx.log('开局获得了3层中毒。');
    },
  }),
  status({
    key: '淫乱知识',
    description: '每场战斗开始时向你的牌库随机插入1张【档案污页】。',
    persistOnRebirth: true,
    onBattleStart: ctx => {
      const inserted = ctx.insertCards('档案污页', 1);
      ctx.log(inserted > 0 ? '开局向牌库插入了1张【档案污页】。' : '未找到【档案污页】卡牌定义。');
    },
  }),
  status({
    key: '被标记',
    description: '当前楼层后续最多3个非战斗节点会替换为战斗房；每场战斗开始时获得2层敏感。',
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.VULNERABLE, 2)) ctx.log('开局获得了2层敏感。');
    },
  }),
  status({
    key: '被寄生',
    description: '每场战斗开始时，你获得1层性兴奋。',
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.ORGASM, 1)) ctx.log('开局获得了1层性兴奋。');
    },
  }),
  status({
    key: '深层寄生',
    description: '每场战斗开始时，你获得2层性兴奋。温泉净化后退化为[被寄生]。',
    hotSpring: { degradeTo: '[被寄生]' },
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.ORGASM, 2)) ctx.log('开局获得了2层性兴奋。');
    },
  }),
  status({
    key: '鳞粉',
    description: '每场战斗开始时，你获得1层鳞粉。',
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.SCALE_POWDER, 1)) ctx.log('开局获得了1层鳞粉。');
    },
  }),
  status({
    key: '沉沦',
    description: '每场战斗第3回合开始时，你获得1层眩晕。',
    onTurnStart: ctx => {
      if (ctx.turn !== 3) return;
      if (ctx.applyEffect(EffectType.STUN, 1, { lockDecayThisTurn: true })) ctx.log('第3回合为自身施加了1层眩晕。');
    },
  }),
  status({
    key: '灵魂受损',
    description: '灵魂被梦魔双子所吞噬一部分，只有打败梦魔双子后才能净化。每场战斗开始时，你获得3层魔力枯竭。',
    hotSpring: 'exempt',
    persistOnRebirth: true,
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.MANA_DRAIN, 3)) ctx.log('开局获得了3层魔力枯竭。');
    },
  }),
  status({
    key: '血族印记',
    description: '被伊丽莎白支配后留下的烙印，后续剧情会体现其持续影响。',
    persistOnRebirth: true,
    onBattleStart: ctx => {
      if (ctx.enemyName !== '伊丽莎白') return;
      if (ctx.applyEffect(EffectType.ORGASM, 10)) ctx.log('面对伊丽莎白时，开局获得了10层性兴奋。');
    },
  }),
  status({
    key: '身体改造',
    description: '战斗中每5回合，你获得1层敏感并回复2点魔力。',
    onTurnStart: ctx => {
      if (ctx.turn <= 0 || ctx.turn % 5 !== 0) return;
      ctx.applyEffect(EffectType.VULNERABLE, 1);
      const restored = ctx.restoreMana(2);
      ctx.log(`第${ctx.turn}回合获得1层敏感，回复${restored}点魔力。`);
    },
  }),
  status({
    key: '被记录',
    description: '每场战斗开始时，你获得1层虚弱。',
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.WEAKEN, 1)) ctx.log('开局获得了1层虚弱。');
    },
  }),
  status({
    key: '鞭痕',
    description: '每场战斗开始时受到4点真实伤害（不会致死）。',
    onBattleStart: ctx => {
      const lost = ctx.loseHp(4, { nonLethal: true });
      ctx.log(`开局受到${lost}点真实伤害。`);
    },
  }),
  status({
    key: '迷失',
    description: '每场战斗开局有33%概率获得1层眩晕。',
    onTurnStart: ctx => {
      if (ctx.turn !== 1 || ctx.random() >= 0.33) return;
      if (ctx.applyEffect(EffectType.STUN, 1, { lockDecayThisTurn: true })) ctx.log('开局陷入迷失，获得了1层眩晕。');
    },
  }),
  status({
    key: '孕育',
    description: '每场战斗开始时，你获得2层虚弱。分娩后消失，无法在温泉中净化。',
    hotSpring: 'exempt',
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.WEAKEN, 2)) ctx.log('开局获得了2层虚弱。');
    },
  }),
  status({
    key: '墨染',
    stackable: true,
    description: stacks => `每场战斗开始时，你获得${stacks}层敏感。`,
    onBattleStart: ctx => {
      if (ctx.applyEffect(EffectType.VULNERABLE, ctx.stacks)) ctx.log(`开局获得了${ctx.stacks}层敏感。`);
    },
  }),
  // 圣痕的战斗效果由 GameView 的开局效果注入（combatInitialPlayerEffects），这里只登记描述
  status({
    key: '圣痕',
    stackable: true,
    description: stacks => `每场战斗开始时，你获得${stacks}层圣痕。`,
  }),

  // ── 地图效果类（效果在 gameStore / GameView 中按名称处理）──────────────
  status({
    key: '逾期',
    description: '第二层剩余的非战斗节点有20%概率被书魔追缴，强制变为战斗房。离开第二层后解除。',
  }),

  // ── 剧情类（无战斗效果）──────────────────────────────────────
  status({ key: '败北', description: '在地牢中战败，沦为俘虏。' }),
  status({ key: '催淫', description: '因中毒量hp归零，后续剧情会体现身体被药性支配。' }),
  status({ key: '神经肌肉失调', description: '因电击hp归零，后续剧情会体现神经损伤与痉挛。' }),
  status({ key: '被侵蚀', description: '曾因侵蚀hp归零，后续剧情会体现身体被操控。' }),
  status({ key: '蛾翼印记', description: '被梦魔双子击败后的印记。' }),
  status({
    key: '人格排泄',
    description: '被灌入人格排泄剂，理性与意识融化凝结为人格果冻，灵魂被禁锢于排泄出的果冻中，肉体沦为空壳。',
    hotSpring: 'exempt',
  }),
];

const DEFINITION_BY_KEY = new Map(NEGATIVE_STATUS_DEFINITIONS.map(definition => [definition.key, definition]));

export interface ParsedNegativeStatus {
  raw: string;
  key: string;
  stacks: number;
  definition: NegativeStatusDefinition | undefined;
}

/** 解析单个状态字符串：'[淫纹]' → { key: '淫纹', stacks: 1 }；'[3墨染]' → { key: '墨染', stacks: 3 } */
export const parseNegativeStatus = (raw: string): ParsedNegativeStatus => {
  const text = raw.trim();
  const inner = text.replace(/^\[/, '').replace(/\]$/, '');
  const stackMatch = inner.match(/^(\d+)(.+)$/);
  if (stackMatch) {
    const key = stackMatch[2]!.trim();
    const definition = DEFINITION_BY_KEY.get(key);
    if (definition?.stackable) {
      return { raw: text, key, stacks: Math.max(0, Math.floor(Number(stackMatch[1]))), definition };
    }
  }
  return { raw: text, key: inner, stacks: 1, definition: DEFINITION_BY_KEY.get(inner) };
};

export const formatNegativeStatus = (key: string, stacks = 1): string => {
  const definition = DEFINITION_BY_KEY.get(key);
  return definition?.stackable ? `[${Math.max(0, Math.floor(stacks))}${key}]` : `[${key}]`;
};

export const normalizeNegativeStatusList = (value: unknown): string[] => {
  const normalizeArray = (arr: unknown[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of arr) {
      if (typeof item !== 'string') continue;
      const normalized = item.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
    return result;
  };

  if (Array.isArray(value)) return normalizeArray(value);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return normalizeArray(parsed);
    } catch {
      // no-op
    }
    return normalizeArray(trimmed.split(/\r?\n|、|；|;|\|/g));
  }

  return [];
};

/** 某个可叠加状态的当前层数（取最大值）；不可叠加的状态存在即为 1 */
export const getNegativeStatusStacks = (statuses: readonly string[], key: string): number =>
  statuses.reduce((max, raw) => {
    const parsed = parseNegativeStatus(raw);
    return parsed.key === key ? Math.max(max, parsed.stacks) : max;
  }, 0);

export const hasNegativeStatus = (statuses: readonly string[], key: string): boolean =>
  getNegativeStatusStacks(statuses, key) > 0;

/**
 * 添加负面状态。可叠加状态默认在原有层数上累加（mode: 'add'），也可以直接覆盖（mode: 'set'）。
 * 不可叠加状态已存在时不重复添加。
 */
export const addNegativeStatus = (
  statuses: readonly string[],
  key: string,
  stacks = 1,
  mode: 'add' | 'set' = 'add',
): string[] => {
  const definition = DEFINITION_BY_KEY.get(key);
  if (!definition?.stackable) {
    return hasNegativeStatus(statuses, key) ? [...statuses] : [...statuses, formatNegativeStatus(key)];
  }
  const current = getNegativeStatusStacks(statuses, key);
  const next = mode === 'add' ? current + stacks : stacks;
  const rest = statuses.filter(raw => parseNegativeStatus(raw).key !== key);
  return next > 0 ? [...rest, formatNegativeStatus(key, next)] : rest;
};

export const removeNegativeStatus = (statuses: readonly string[], key: string): string[] =>
  statuses.filter(raw => parseNegativeStatus(raw).key !== key);

export const describeNegativeStatus = (raw: string): string | undefined => {
  const parsed = parseNegativeStatus(raw);
  const description = parsed.definition?.description;
  if (!description) return undefined;
  return typeof description === 'function' ? description(parsed.stacks) : description;
};

/** 温泉净化：移除可净化的状态，豁免的保留，可降级的替换为降级后的状态 */
export const applyHotSpringCleanse = (statuses: readonly string[]): string[] => {
  const result: string[] = [];
  for (const raw of statuses) {
    const behavior = parseNegativeStatus(raw).definition?.hotSpring ?? 'remove';
    if (behavior === 'exempt') {
      result.push(raw);
    } else if (typeof behavior === 'object' && !result.includes(behavior.degradeTo)) {
      result.push(behavior.degradeTo);
    }
  }
  return result;
};

/** 单个状态的温泉净化方式（未登记的状态默认可移除） */
export const getHotSpringBehavior = (raw: string): HotSpringBehavior =>
  parseNegativeStatus(raw).definition?.hotSpring ?? 'remove';

/** 可被净化的状态（排除豁免类），按原顺序返回原始字符串 */
export const getCleansableNegativeStatuses = (statuses: readonly string[]): string[] =>
  statuses.filter(raw => getHotSpringBehavior(raw) !== 'exempt');

/** 净化单个状态：可降级的替换为降级状态，豁免的保持不变，其余整条移除 */
export const cleanseSingleNegativeStatus = (statuses: readonly string[], raw: string): string[] => {
  const behavior = getHotSpringBehavior(raw);
  if (behavior === 'exempt') return [...statuses];
  const index = statuses.indexOf(raw);
  if (index < 0) return [...statuses];
  const rest = statuses.filter((_, i) => i !== index);
  if (typeof behavior === 'object' && !rest.includes(behavior.degradeTo)) {
    rest.splice(index, 0, behavior.degradeTo);
  }
  return rest;
};

/** 负面状态总数：可叠加状态按层数计（[3墨染] 计 3 个） */
export const countNegativeStatusesWithStacks = (statuses: readonly string[]): number =>
  statuses.reduce((sum, raw) => sum + Math.max(1, parseNegativeStatus(raw).stacks), 0);

/** 温泉净化是否会改变当前状态列表 */
export const isHotSpringCleansable = (statuses: readonly string[]): boolean => {
  const next = applyHotSpringCleanse(statuses);
  return next.length !== statuses.length || next.some((raw, index) => raw !== statuses[index]);
};

/** 重生后保留的负面状态 */
export const getRebirthRetainedNegativeStatuses = (statuses: readonly string[]): string[] =>
  statuses.filter(raw => parseNegativeStatus(raw).definition?.persistOnRebirth === true);

/** 依次触发战斗开局 / 回合开始效果 */
export const runNegativeStatusBattleHooks = (
  hook: 'onBattleStart' | 'onTurnStart',
  statuses: readonly string[],
  createContext: (parsed: ParsedNegativeStatus) => NegativeStatusBattleContext,
): void => {
  const handled = new Set<string>();
  for (const raw of statuses) {
    const parsed = parseNegativeStatus(raw);
    const handler = parsed.definition?.[hook];
    if (!handler || handled.has(parsed.key) || parsed.stacks <= 0) continue;
    handled.add(parsed.key);
    const stacks = parsed.definition?.stackable ? getNegativeStatusStacks(statuses, parsed.key) : 1;
    handler(createContext({ ...parsed, stacks }));
  }
};
