import { CardType, EffectType, type CardData, type CardEnchantHitEffect, type CardEnchantInfo } from '../types';

/**
 * 卡牌附魔（含升级）。
 *
 * `_附魔` 是与 `_技能` 一一对应的 9 元字符串数组，'' 表示无附魔。规则：
 *   - 每张卡最多 1 个附魔，新附魔覆盖旧附魔；对已精炼的卡再次精炼会升级（最高 3 级）。
 *   - 槽位被奖励卡 / 诅咒替换时附魔清空（见 reconcileEnchantsForSkillChange）；变异保留附魔，复制会一并复制附魔。
 *   - 诅咒牌不可附魔。
 *   - 临时附魔（仅本场战斗）不写入 _附魔，由战斗修正在构建卡组时临时附加。
 */

export const ENCHANT_SLOT_COUNT = 9;
export const REFINE_ENCHANT = '精炼';
export const YINWEN_ENCHANT = '淫文';
export const BRAND_ENCHANT_PREFIX = '刑印·';
export const MAX_REFINE_LEVEL = 3;

const REFINE_LEVEL_LABELS = ['Ⅰ', 'Ⅱ', 'Ⅲ'] as const;

export type EnchantRequest = typeof REFINE_ENCHANT | typeof YINWEN_ENCHANT | `${typeof BRAND_ENCHANT_PREFIX}${string}`;

interface BrandDefinition {
  /** 刑印名（存为 `刑印·<名>`） */
  name: string;
  description: string;
  hitEffect?: CardEnchantHitEffect;
  manaOnHit?: number;
}

/** 刑印：原负面状态让你开局承受什么，刑印就让被命中的敌人承受什么 */
const BRAND_DEFINITIONS: readonly BrandDefinition[] = [
  { name: '中毒', description: '命中时敌方获得1层中毒', hitEffect: { effectType: EffectType.POISON, stacks: 1 } },
  { name: '敏感', description: '命中时敌方获得1层敏感', hitEffect: { effectType: EffectType.VULNERABLE, stacks: 1 } },
  { name: '性兴奋', description: '命中时敌方获得1层性兴奋', hitEffect: { effectType: EffectType.ORGASM, stacks: 1 } },
  { name: '虚弱', description: '命中时敌方获得1层虚弱', hitEffect: { effectType: EffectType.WEAKEN, stacks: 1 } },
  { name: '鳞粉', description: '命中时敌方获得1层鳞粉', hitEffect: { effectType: EffectType.SCALE_POWDER, stacks: 1 } },
  { name: '流血', description: '命中时敌方获得1层流血', hitEffect: { effectType: EffectType.BLEED, stacks: 1 } },
  { name: '眩晕', description: '命中时有20%概率使敌方眩晕', hitEffect: { effectType: EffectType.STUN, stacks: 1, chance: 0.2 } },
  { name: '魔力', description: '命中时自身回复1点魔力', manaOnHit: 1 },
];

const BRAND_BY_NAME = new Map(BRAND_DEFINITIONS.map(brand => [brand.name, brand]));

/** 负面状态（不含方括号与层数） → 刑印名。未登记的状态不能转化为刑印。 */
export const BRAND_BY_NEGATIVE_STATUS: Readonly<Record<string, string>> = {
  淫纹: '中毒',
  被标记: '敏感',
  墨染: '敏感',
  被寄生: '性兴奋',
  深层寄生: '性兴奋',
  信息素: '性兴奋',
  被记录: '虚弱',
  淫乱知识: '虚弱',
  鳞粉: '鳞粉',
  鞭痕: '流血',
  血族印记: '流血',
  沉沦: '眩晕',
  迷失: '眩晕',
  身体改造: '魔力',
};

export const getBrandEnchantKeyForStatus = (statusKey: string): string | null => {
  const brand = BRAND_BY_NEGATIVE_STATUS[statusKey];
  return brand ? `${BRAND_ENCHANT_PREFIX}${brand}` : null;
};

const parseRefineLevel = (key: string): number => {
  if (!key.startsWith(REFINE_ENCHANT)) return 0;
  const index = REFINE_LEVEL_LABELS.indexOf(key.slice(REFINE_ENCHANT.length) as (typeof REFINE_LEVEL_LABELS)[number]);
  return index >= 0 ? index + 1 : 0;
};

const refineKey = (level: number): string =>
  `${REFINE_ENCHANT}${REFINE_LEVEL_LABELS[Math.max(1, Math.min(MAX_REFINE_LEVEL, level)) - 1]}`;

/** 解析附魔值为卡牌附魔信息；非法值返回 null */
export const getEnchantInfo = (key: string): CardEnchantInfo | null => {
  const text = String(key ?? '').trim();
  if (!text) return null;
  const refineLevel = parseRefineLevel(text);
  if (refineLevel > 0) {
    return { key: text, label: text, description: `点数+${refineLevel}` };
  }
  if (text === YINWEN_ENCHANT) {
    return {
      key: text,
      label: YINWEN_ENCHANT,
      description: '命中时敌方获得1层敏感',
      hitEffect: { effectType: EffectType.VULNERABLE, stacks: 1 },
    };
  }
  if (text.startsWith(BRAND_ENCHANT_PREFIX)) {
    const brand = BRAND_BY_NAME.get(text.slice(BRAND_ENCHANT_PREFIX.length));
    if (!brand) return null;
    return {
      key: text,
      label: text,
      description: brand.description,
      ...(brand.hitEffect ? { hitEffect: { ...brand.hitEffect } } : {}),
      ...(brand.manaOnHit ? { manaOnHit: brand.manaOnHit } : {}),
    };
  }
  return null;
};

export const isValidEnchantKey = (key: string): boolean => getEnchantInfo(key) !== null;

/** 诅咒牌不可附魔 */
export const canEnchantCard = (card: Pick<CardData, 'type'> | null | undefined): boolean =>
  Boolean(card) && card!.type !== CardType.CURSE;

/** 在已有附魔上施加新附魔：精炼叠加升级（最高 3 级），其余直接覆盖 */
export const resolveNextEnchantKey = (current: string, request: EnchantRequest): string => {
  if (request === REFINE_ENCHANT) {
    const level = parseRefineLevel(String(current ?? '').trim());
    return refineKey(level + 1);
  }
  return request;
};

/** 精炼是否已满级（满级时再次精炼无效果） */
export const isRefineMaxed = (current: string): boolean => parseRefineLevel(String(current ?? '').trim()) >= MAX_REFINE_LEVEL;

export const normalizeEnchantList = (value: unknown): string[] => {
  const raw = Array.isArray(value) ? value : [];
  return Array.from({ length: ENCHANT_SLOT_COUNT }, (_, index) => {
    const item = raw[index];
    return typeof item === 'string' && isValidEnchantKey(item) ? item.trim() : '';
  });
};

const normalizeSkillList = (value: unknown): string[] => {
  const raw = Array.isArray(value) ? value : [];
  return Array.from({ length: ENCHANT_SLOT_COUNT }, (_, index) => String(raw[index] ?? '').trim());
};

/**
 * `_技能` 变化而 `_附魔` 未被显式写入时调用：槽位卡名变化即视为被替换，附魔清空。
 * 变异 / 复制等需要保留附魔的操作会在同一次写入中显式给出 `_附魔`，不会走到这里。
 */
export const reconcileEnchantsForSkillChange = (
  previousSkills: unknown,
  nextSkills: unknown,
  previousEnchants: unknown,
): string[] => {
  const before = normalizeSkillList(previousSkills);
  const after = normalizeSkillList(nextSkills);
  const enchants = normalizeEnchantList(previousEnchants);
  return enchants.map((enchant, index) => (enchant && before[index] === after[index] ? enchant : ''));
};

/**
 * 对一组 stat_data 写入做附魔校正（gameStore 的统一写入口调用）：
 * 写入了 `_技能` 却没有写 `_附魔` 时，按槽位卡名变化清空附魔；返回需要额外合并的字段。
 */
export const buildEnchantReconcileFields = (
  previousStatData: Record<string, any> | null | undefined,
  fields: Record<string, any>,
): Record<string, any> | null => {
  if (!fields || !Object.prototype.hasOwnProperty.call(fields, '_技能')) return null;
  if (Object.prototype.hasOwnProperty.call(fields, '_附魔')) return null;
  const previousEnchants = normalizeEnchantList(previousStatData?._附魔);
  if (previousEnchants.every(enchant => !enchant)) return null;
  const next = reconcileEnchantsForSkillChange(previousStatData?._技能, fields._技能, previousEnchants);
  return next.some((enchant, index) => enchant !== previousEnchants[index]) ? { _附魔: next } : null;
};

/** 返回带附魔的卡牌副本（精炼直接加到点数加算上，命中效果由 CombatView 读取 card.enchant 结算） */
export const applyEnchantToCard = (card: CardData, key: string, options: { temporary?: boolean } = {}): CardData => {
  const info = getEnchantInfo(key);
  if (!info || !canEnchantCard(card)) return card;
  const refineLevel = parseRefineLevel(info.key);
  const enchant: CardEnchantInfo = { ...info, ...(options.temporary ? { temporary: true } : {}) };
  return {
    ...card,
    calculation: refineLevel > 0
      ? { ...card.calculation, addition: card.calculation.addition + refineLevel }
      : { ...card.calculation },
    enchant,
  };
};

/** 附魔说明（卡面与选卡界面共用） */
export const formatEnchantText = (enchant: Pick<CardEnchantInfo, 'label' | 'description' | 'temporary'>): string =>
  `${enchant.temporary ? '临时' : ''}【${enchant.label}】${enchant.description}`;
