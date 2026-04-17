import { EFFECT_REGISTRY } from './effects';
import type { CardManaDrainConfig, CardSelfDamageConfig, CardTraits, EffectPolarity, EffectType } from '../types';

export interface CardGlossaryEntry {
  key: string;
  label: string;
  description: string;
  source: 'effect' | 'trait' | 'keyword';
  effectType?: EffectType;
  polarity?: EffectPolarity | 'trait';
}

interface CardKeywordInput {
  negativeEffect?: string | null;
  manaDrain?: number | CardManaDrainConfig | null;
  swarmAttack?: boolean;
  excape?: boolean;
  selfDamage?: number | CardSelfDamageConfig | null;
}

const TRAIT_LABELS = {
  combo: '连击',
  draw: '过牌',
  unplayable: '无法打出',
  destroyOnClashWin: '销毁',
  purgeOnUse: '移除',
  insertCardsToEnemyDeck: '插入',
} as const;

const getTraitDescription = (traits: CardTraits, key: keyof typeof TRAIT_LABELS): string => {
  switch (key) {
    case 'combo':
      return '打出后不消耗本回合常规行动次数。';
    case 'draw':
      return '打出后额外抽1张牌，通常与连击联动。';
    case 'unplayable':
      return '这张牌不能直接打出。';
    case 'destroyOnClashWin':
      return '拼点胜利时，临时移除对方本次拼点失败的卡牌。';
    case 'purgeOnUse':
      return '打出后自我销毁，不进入弃牌堆。';
    case 'insertCardsToEnemyDeck': {
      const names = traits.insertCardsToEnemyDeck?.join('、') ?? '';
      return names ? `打出后向对方牌库插入：${names}。` : '打出后向对方牌库插入指定卡牌。';
    }
    default:
      return '';
  }
};

const findNonOverlappingEntries = (text: string, entries: CardGlossaryEntry[]): CardGlossaryEntry[] => {
  if (!text.trim()) return [];
  const matchedRanges: Array<{ start: number; end: number }> = [];
  const result: CardGlossaryEntry[] = [];

  for (const entry of [...entries].sort((a, b) => b.label.length - a.label.length)) {
    let cursor = text.indexOf(entry.label);
    while (cursor !== -1) {
      const nextRange = { start: cursor, end: cursor + entry.label.length };
      const overlaps = matchedRanges.some((range) => nextRange.start < range.end && nextRange.end > range.start);
      if (!overlaps) {
        matchedRanges.push(nextRange);
        result.push(entry);
        break;
      }
      cursor = text.indexOf(entry.label, cursor + 1);
    }
  }

  return result.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'));
};

const uniqGlossaryEntries = (entries: CardGlossaryEntry[]): CardGlossaryEntry[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.key)) return false;
    seen.add(entry.key);
    return true;
  });
};

export const getCardTraitGlossaryEntries = (traits: CardTraits | null | undefined): CardGlossaryEntry[] => {
  if (!traits) return [];

  const entries: CardGlossaryEntry[] = [];
  if (traits.combo) {
    entries.push({
      key: 'trait:combo',
      label: TRAIT_LABELS.combo,
      description: getTraitDescription(traits, 'combo'),
      source: 'trait',
      polarity: 'trait',
    });
  }
  if (traits.draw) {
    entries.push({
      key: 'trait:draw',
      label: TRAIT_LABELS.draw,
      description: getTraitDescription(traits, 'draw'),
      source: 'trait',
      polarity: 'trait',
    });
  }
  if (traits.reroll === 'self') {
    entries.push({
      key: 'trait:reroll:self',
      label: '重掷自己',
      description: '打出时会重掷自己的骰子。',
      source: 'trait',
      polarity: 'trait',
    });
  } else if (traits.reroll === 'enemy') {
    entries.push({
      key: 'trait:reroll:enemy',
      label: '重掷对手',
      description: '打出时会重掷对手的骰子。',
      source: 'trait',
      polarity: 'trait',
    });
  }
  if (traits.unplayable) {
    entries.push({
      key: 'trait:unplayable',
      label: TRAIT_LABELS.unplayable,
      description: getTraitDescription(traits, 'unplayable'),
      source: 'trait',
      polarity: 'trait',
    });
  }
  if (traits.destroyOnClashWin) {
    entries.push({
      key: 'trait:destroyOnClashWin',
      label: TRAIT_LABELS.destroyOnClashWin,
      description: getTraitDescription(traits, 'destroyOnClashWin'),
      source: 'trait',
      polarity: 'trait',
    });
  }
  if (traits.purgeOnUse) {
    entries.push({
      key: 'trait:purgeOnUse',
      label: TRAIT_LABELS.purgeOnUse,
      description: getTraitDescription(traits, 'purgeOnUse'),
      source: 'trait',
      polarity: 'trait',
    });
  }
  if (traits.insertCardsToEnemyDeck && traits.insertCardsToEnemyDeck.length > 0) {
    entries.push({
      key: 'trait:insertCardsToEnemyDeck',
      label: TRAIT_LABELS.insertCardsToEnemyDeck,
      description: getTraitDescription(traits, 'insertCardsToEnemyDeck'),
      source: 'trait',
      polarity: 'trait',
    });
  }

  return entries;
};

export const getCardEffectGlossaryEntries = (text: string): CardGlossaryEntry[] => {
  const effectEntries: CardGlossaryEntry[] = Object.values(EFFECT_REGISTRY).map((effect) => ({
    key: `effect:${effect.type}`,
    label: effect.name,
    description: effect.description,
    source: 'effect',
    effectType: effect.type,
    polarity: effect.polarity,
  }));
  return findNonOverlappingEntries(text, effectEntries);
};

export const getCardKeywordGlossaryEntries = (
  text: string,
  input: CardKeywordInput = {},
): CardGlossaryEntry[] => {
  const keywordEntries: CardGlossaryEntry[] = [
    {
      key: 'keyword:negativeEffect',
      label: '负面效果',
      description: '卡牌生效后会记录对应负面状态，并在战斗结束后写回玩家的长期负面状态。',
      source: 'keyword',
      polarity: 'debuff',
    },
    {
      key: 'keyword:manaDrain',
      label: '法力汲取',
      description: '吸收对方对应数值的法力并恢复自身；若对方法力不足，不足部分会改为扣除对方生命。',
      source: 'keyword',
      polarity: 'mixed',
    },
    {
      key: 'keyword:swarmAttack',
      label: '群攻',
      description: '对目标造成伤害时，会永久减少其本场战斗中“群集”可恢复的生命值。',
      source: 'keyword',
      polarity: 'special',
    },
    {
      key: 'keyword:excape',
      label: '逃离',
      description: '打出后会立刻结束战斗，通常不会获得金币或卡牌奖励。',
      source: 'keyword',
      polarity: 'special',
    },
    {
      key: 'keyword:selfDamage',
      label: '自伤',
      description: '卡牌生效后会对自己造成伤害；部分效果会改为削减生命上限。',
      source: 'keyword',
      polarity: 'debuff',
    },
  ];

  const matchedEntries = findNonOverlappingEntries(text, keywordEntries);
  const propertyEntries: CardGlossaryEntry[] = [];

  if (input.negativeEffect) {
    propertyEntries.push(keywordEntries[0]!);
  }
  if (input.manaDrain !== undefined && input.manaDrain !== null) {
    propertyEntries.push(keywordEntries[1]!);
  }
  if (input.swarmAttack) {
    propertyEntries.push(keywordEntries[2]!);
  }
  if (input.excape) {
    propertyEntries.push(keywordEntries[3]!);
  }
  if (input.selfDamage !== undefined && input.selfDamage !== null) {
    propertyEntries.push(keywordEntries[4]!);
  }

  return uniqGlossaryEntries([...matchedEntries, ...propertyEntries]);
};

export const collectCardGlossaryEntries = (input: {
  title?: string;
  description?: string;
  traits?: CardTraits | null;
  negativeEffect?: string | null;
  manaDrain?: number | CardManaDrainConfig | null;
  swarmAttack?: boolean;
  excape?: boolean;
  selfDamage?: number | CardSelfDamageConfig | null;
}): CardGlossaryEntry[] => {
  const text = [input.title ?? '', input.description ?? ''].filter(Boolean).join(' ');
  const effectEntries = getCardEffectGlossaryEntries(text);
  const keywordEntries = getCardKeywordGlossaryEntries(text, {
    negativeEffect: input.negativeEffect,
    manaDrain: input.manaDrain,
    swarmAttack: input.swarmAttack,
    excape: input.excape,
    selfDamage: input.selfDamage,
  });
  const traitEntries = getCardTraitGlossaryEntries(input.traits);
  return uniqGlossaryEntries([...effectEntries, ...keywordEntries, ...traitEntries]);
};
