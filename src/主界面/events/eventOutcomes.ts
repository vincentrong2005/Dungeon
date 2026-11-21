import { BRAND_BY_NEGATIVE_STATUS } from '../battle/enchantRegistry';
import { EVENT_RELIC_ID } from '../battle/eventRelics';
import { EVENT_CARD_ID, SIN_CARDS, pickSinCardsForCurseBloom } from '../battle/eventCards';
import type { RelicData } from '../battle/relicRegistry';
import { toStatusModifierEffect, type CombatModifierInput } from '../combatModifiers';
import type { EventVerdict } from '../eventRegistry';
import { normalizeDungeonMap, replaceFutureRoomsWithBattle, rerollNextRowRooms, MAP_ROUTE_COUNT } from '../map';
import { countNegativeStatusesWithStacks, getCleansableNegativeStatuses, parseNegativeStatus } from '../negativeStatusRegistry';
import { CardType, EffectType, type CardData } from '../types';
import {
  pickCardOptions,
  pickCardOptionsWithRareChance,
  pickMany,
  pickOne,
  pickRandomCurseName,
  pickRelics,
  type PresetOption,
  type Random,
  type SettlementDraft,
  type SettlementPools,
  type SettlementStep,
} from './eventSettlement';

/**
 * 各事件结局的奖励与代价（以世界书条目「结局」段为准，数值见 docs/事件结局奖励表.md）。
 *
 * - apply：判定写入后立即结算（无需玩家操作）
 * - action：结局后显示的结算按钮
 *     steps    → 打开结算面板逐步处理（选卡、选槽位、领取圣遗物……）
 *     battle   → 与 _对手名称 中预先抽定的对象战斗（context 'event'）
 *     minigame → 打开小游戏
 * 结算产生的说明会写入 $事件结算通知，随下一条 user 楼层注入给 LLM。
 */

export type MinigameKind = '大转盘' | '扭蛋机' | '占卜';

export interface OutcomeContext {
  draft: SettlementDraft;
  pools: SettlementPools;
  floor: number;
  /** 进入事件房时抽定的出场对象（_对手名称） */
  opponent: string;
  random: Random;
  /** apply 与 action 之间传递的小数据（保存在 $事件操作.数据 中） */
  memo: Record<string, unknown>;
}

export type OutcomeAction =
  | { type: 'steps'; label: string; build: (ctx: OutcomeContext) => SettlementStep[] }
  | { type: 'battle'; label: string; lord?: boolean; noPenalty?: boolean }
  | { type: 'minigame'; label: string; game: MinigameKind; plays?: number };

export interface EventOutcomeSpec {
  apply?: (ctx: OutcomeContext) => void;
  action?: OutcomeAction;
  /** apply 之后判断是否还需要结算按钮（缺省为需要） */
  actionWhen?: (ctx: OutcomeContext) => boolean;
}

// ── 公共片段 ──────────────────────────────────────────────────────

const relicStep = (title: string, relics: RelicData[]): SettlementStep[] =>
  relics.length > 0 ? [{ kind: 'relic', title, relics }] : [{ kind: 'info', title, lines: ['没有可领取的圣遗物了。'] }];

const randomRelicSteps = (ctx: OutcomeContext, rarity: RelicData['rarity'] | '宝箱', title: string): SettlementStep[] =>
  relicStep(title, pickRelics(ctx.pools, rarity, 1, { random: ctx.random }));

const eventRelicSteps = (ctx: OutcomeContext, relicId: string, title: string): SettlementStep[] => {
  const relic = ctx.pools.resolveRelic(relicId);
  return relicStep(title, relic ? [relic] : []);
};

const EVENT_CARD_NAME_BY_ID: Readonly<Record<string, string>> = {
  [EVENT_CARD_ID.LUCKY_COIN]: '幸运币',
  [EVENT_CARD_ID.JAILER_WHIP]: '狱卒的鞭子',
  [EVENT_CARD_ID.HOLY_LIGHT]: '圣光',
};

const fixedCardSteps = (ctx: OutcomeContext, cardId: string, title: string): SettlementStep[] => {
  const name = EVENT_CARD_NAME_BY_ID[cardId];
  const card: CardData | undefined = name ? ctx.pools.resolveCard(name) : undefined;
  return card ? [{ kind: 'cardPick', title, options: [card] }] : [{ kind: 'info', title, lines: ['未找到对应卡牌。'] }];
};

const curseSteps = (ctx: OutcomeContext, title: string, curseName?: string): SettlementStep[] => {
  const name = curseName ?? pickRandomCurseName(ctx.pools, ctx.random);
  return name ? [{ kind: 'curse', title, curseName: name }] : [];
};

const ownedSkillNames = (ctx: OutcomeContext) => ctx.draft.skills.filter(Boolean);

/** 七原罪卡：random 为随机一张，choose 为全部未拥有的原罪卡任选；都已拥有时降级为稀有圣遗物 */
const sinCardSteps = (ctx: OutcomeContext, mode: 'random' | 'choose', title: string): SettlementStep[] => {
  const owned = new Set(ownedSkillNames(ctx));
  const unowned = SIN_CARDS.filter(card => !owned.has(card.name));
  if (unowned.length === 0) {
    ctx.draft.notice('七种原罪都已拥有，改为获得一件稀有圣遗物');
    return randomRelicSteps(ctx, '稀有', title);
  }
  const options = mode === 'random' ? [pickOne(unowned, ctx.random)!] : unowned;
  return [{ kind: 'cardPick', title, options }];
};

const activePickSteps = (
  ctx: OutcomeContext,
  count: number,
  rarity: '普通' | '稀有',
  title: string,
  temporarySource?: string,
): SettlementStep[] => {
  const pool = ctx.pools.rewardActiveSkills;
  const preferred = pool.filter(skill => skill.rarity === rarity);
  const options = pickMany(preferred, count, ctx.random);
  if (options.length < count) {
    const used = new Set(options.map(skill => skill.id));
    options.push(...pickMany(pool.filter(skill => !used.has(skill.id)), count - options.length, ctx.random));
  }
  if (options.length === 0) return [{ kind: 'info', title, lines: ['没有可获得的主动技了。'] }];
  return [{ kind: 'activePick', title, options, ...(temporarySource ? { temporarySource } : {}) }];
};

const isCurseCardName = (ctx: OutcomeContext, name: string) => ctx.pools.resolveCard(name)?.type === CardType.CURSE;

const curseSlots = (ctx: OutcomeContext): number[] =>
  ctx.draft.skills.map((name, index) => (name && isCurseCardName(ctx, name) ? index : -1)).filter(index => index >= 0);

const brandableStatuses = (draft: SettlementDraft): string[] =>
  getCleansableNegativeStatuses(draft.statuses).filter(raw => Boolean(BRAND_BY_NEGATIVE_STATUS[parseNegativeStatus(raw).key]));

const addModifiers = (draft: SettlementDraft, source: string, modifiers: CombatModifierInput[]) => {
  for (const modifier of modifiers) draft.addModifier(source, modifier);
};

const status = (effectType: EffectType) => toStatusModifierEffect(effectType);

/** 地图：当前层已走过的行数 */
const currentMapY = (draft: SettlementDraft): number =>
  Array.isArray(draft.originalStatData.$路径) ? draft.originalStatData.$路径.length : 0;

// ── 预设：校规 / 菜品 ────────────────────────────────────────────

const MILD_SCHOOL_RULES: PresetOption[] = [
  {
    id: 'rule_sensitive',
    label: '全员敏感守则',
    description: '本层战斗中，双方开局获得2层敏感',
    modifiers: [{ 对象: '双方', 效果: status(EffectType.VULNERABLE), 数值: 2, 范围: '本层' }],
  },
  {
    id: 'rule_armor',
    label: '护身条例',
    description: '本层战斗中，双方开局获得50点护甲',
    modifiers: [{ 对象: '双方', 效果: '护甲', 数值: 50, 范围: '本层' }],
  },
  {
    id: 'rule_regen',
    label: '健康作息守则',
    description: '本层战斗中，双方开局获得2层生命回复',
    modifiers: [{ 对象: '双方', 效果: status(EffectType.REGEN), 数值: 2, 范围: '本层' }],
  },
];

const STRICT_SCHOOL_RULES: PresetOption[] = [
  {
    id: 'rule_no_dodge',
    label: '禁止闪避令',
    description: '本层战斗中，双方的物理与魔法牌无视闪避',
    modifiers: [{ 对象: '双方', 效果: status(EffectType.IGNORE_DODGE), 数值: 99, 范围: '本层' }],
  },
  {
    id: 'rule_dice_cap',
    label: '点数管制令',
    description: '本层战斗中，双方最大点数-2',
    modifiers: [{ 对象: '双方', 效果: '最大点数', 数值: -2, 范围: '本层' }],
  },
  {
    id: 'rule_frenzy',
    label: '狂热课堂令',
    description: '本层战斗中，双方最小点数不得低于5（最大点数低于5时也提升至5）',
    modifiers: [{ 对象: '双方', 效果: '最小点数下限', 数值: 5, 范围: '本层' }],
  },
];

const ROYAL_DISHES: PresetOption[] = [
  {
    id: 'dish_roast',
    label: '蜜汁烤肉',
    description: '本层领主战开局获得50点护甲',
    modifiers: [{ 对象: '自身', 效果: '护甲', 数值: 50, 范围: '本层领主战' }],
  },
  {
    id: 'dish_jelly',
    label: '颤巍巍的果冻',
    description: '本层领主战开局获得3层生命回复',
    modifiers: [{ 对象: '自身', 效果: status(EffectType.REGEN), 数值: 3, 范围: '本层领主战' }],
  },
  {
    id: 'dish_soup',
    label: '水晶盏浓汤',
    description: '本层领主战开局魔力+5',
    modifiers: [{ 对象: '自身', 效果: '魔力', 数值: 5, 范围: '本层领主战' }],
  },
];

// ── 消耗品 ──────────────────────────────────────────────────────

const CONSUMABLES = {
  slimeGel: { name: '史莱姆凝胶', description: '小史莱姆吐出的晶莹凝胶，敷在伤口上能迅速愈合。', heal: 10 },
  snack: { name: '点心', description: '厨师长硬塞的精致点心，吃下能恢复体力。', heal: 12 },
  sprayFruit: { name: '喷浆果', description: '会喷出温热浆汁的果实，吃下能恢复体力。', heal: 8 },
  cottonDoll: { name: '药棉人偶', description: '塞满止痛药棉的试作人偶，拆开敷在伤口上能缓解伤痛。', heal: 10 },
} as const;

const addConsumable = (draft: SettlementDraft, key: keyof typeof CONSUMABLES, count = 1) => {
  const item = CONSUMABLES[key];
  draft.addConsumable(item.name, item.description, item.heal, count);
};

// ── 配置 ────────────────────────────────────────────────────────

const yinwenBrandOutcomes = (eventName: string): Partial<Record<EventVerdict, EventOutcomeSpec>> => ({
  结局一: { apply: ({ draft }) => draft.addStatus('淫纹') },
  结局二: {
    apply: ({ draft }) => draft.addStatus('淫纹'),
    action: {
      type: 'steps',
      label: '符文刻入招式',
      build: () => [{ kind: 'enchant', title: `${eventName}：选择一张卡刻入【淫文】`, enchant: '淫文' }],
    },
  },
  结局三: {
    apply: ({ draft }) => draft.addStatus('淫纹'),
    action: { type: 'steps', label: '领取赠礼', build: ctx => randomRelicSteps(ctx, '稀有', `${eventName}：淫纹室的赠礼`) },
  },
});

export const EVENT_OUTCOMES: Readonly<Record<string, Partial<Record<EventVerdict, EventOutcomeSpec>>>> = {
  // ════════ 全楼层 ════════
  无名拘束台: {
    结局一: { apply: ({ draft, floor }) => draft.changeGold(3 + floor) },
    结局二: { action: { type: 'steps', label: '打开暗格', build: ctx => randomRelicSteps(ctx, '普通', '无名拘束台：暗格中的物品') } },
    结局三: {
      apply: ({ draft }) => draft.addStatus('身体改造'),
      action: { type: 'steps', label: '打开核心暗格', build: ctx => randomRelicSteps(ctx, '稀有', '无名拘束台：核心暗格中的遗物') } },
  },
  欲之熔炉: {
    结局一: {
      action: {
        type: 'steps',
        label: '重铸能力',
        build: () => [{ kind: 'cardTransform', title: '欲之熔炉：选择一张卡投入熔炉重铸（变为同体系的另一张）', mode: { type: 'sameCategorySameRarity' } }],
      },
    },
    结局二: {
      apply: ({ draft }) => draft.changeMana(-2),
      action: { type: 'steps', label: '淬炼能力', build: () => [{ kind: 'enchant', title: '欲之熔炉：选择一张卡【精炼】', enchant: '精炼' }] },
    },
  },
  漫游的领主: {
    结局一: { apply: ({ draft, floor }) => draft.changeGold(5 + 2 * floor) },
    结局三: { action: { type: 'battle', label: '迎战领主', lord: true } },
  },
  空间褶皱: {
    结局二: {
      apply: ({ draft, random }) => {
        const map = normalizeDungeonMap(draft.originalStatData.$地图);
        if (map.length !== MAP_ROUTE_COUNT) return;
        const result = rerollNextRowRooms(map, currentMapY(draft), random);
        if (!result.changed) return;
        draft.setExtraField('$地图', result.map);
        draft.notice('前方下一排房间的类型被重新洗牌');
      },
    },
  },
  迷失的冒险者: {
    结局一: { action: { type: 'steps', label: '磨炼技艺', build: () => [{ kind: 'enchant', title: '迷失的冒险者：选择一张卡【精炼】', enchant: '精炼' }] } },
    结局二: {
      action: {
        type: 'steps',
        label: '搜刮遗物',
        build: ctx => [
          ...randomRelicSteps(ctx, '宝箱', '迷失的冒险者：遗骸旁的圣遗物'),
          ...curseSteps(ctx, '迷失的冒险者：沉重的愧疚', '愧疚'),
        ],
      },
    },
    结局三: { apply: ({ draft }) => draft.healPercentOfMax(0.3) },
  },
  大转盘: { 结局二: { action: { type: 'minigame', label: '转动转盘', game: '大转盘' } } },
  扭蛋机: { 结局二: { action: { type: 'minigame', label: '投币扭蛋', game: '扭蛋机' } } },
  占卜: {
    结局二: {
      apply: ({ draft }) => draft.changeGold(-10),
      action: { type: 'minigame', label: '开始占卜', game: '占卜', plays: 3 },
    },
    结局三: {
      apply: ({ draft }) => draft.queueCurse('债务'),
      action: { type: 'minigame', label: '开始占卜', game: '占卜', plays: 6 },
    },
  },

  // ════════ 第一层 ════════
  寄生共生: {
    结局一: { apply: ({ draft }) => draft.heal(6) },
    结局二: {
      apply: ({ draft }) => draft.addStatus('被寄生'),
      action: { type: 'steps', label: '借用能力', build: ctx => activePickSteps(ctx, 1, '普通', '寄生共生：幼体借给你的能力') },
    },
    结局三: {
      apply: ({ draft }) => draft.addStatus('深层寄生'),
      action: { type: 'steps', label: '挑选能力', build: ctx => activePickSteps(ctx, 3, '稀有', '寄生共生：从幼体的能力中挑选一项') },
    },
  },
  黏人的幼体: {
    结局一: { apply: ({ draft }) => addConsumable(draft, 'slimeGel') },
    结局二: { apply: ({ draft }) => draft.addModifier('幼体史莱姆', { 对象: '自身', 效果: '回复生命', 数值: 10, 范围: '下N场', 剩余: 3 }) },
    结局三: { action: { type: 'steps', label: '收留幼体', build: ctx => eventRelicSteps(ctx, EVENT_RELIC_ID.SLIME_HATCHLING, '黏人的幼体') } },
  },
  发情季: {
    结局一: { apply: ({ draft }) => draft.addStatus('信息素') },
    结局二: { action: { type: 'battle', label: '迎战魔物' } },
    结局三: {
      apply: ({ draft, random }) => {
        const map = normalizeDungeonMap(draft.originalStatData.$地图);
        if (map.length === MAP_ROUTE_COUNT) {
          draft.setExtraField('$地图', replaceFutureRoomsWithBattle(map, currentMapY(draft), random));
          draft.notice('本层后续3个非战斗房间变为战斗房');
        }
        draft.addModifier('发情季', { 对象: '自身', 效果: '奖励刷新', 数值: 1, 范围: '本层下N场', 剩余: 3 });
        draft.addModifier('发情季', { 对象: '自身', 效果: '金币倍率', 数值: 2, 范围: '本层下N场', 剩余: 3 });
      },
    },
  },
  沼泽盲摸: {
    结局一: { action: { type: 'steps', label: '收下硬币', build: ctx => fixedCardSteps(ctx, EVENT_CARD_ID.LUCKY_COIN, '沼泽盲摸：古怪的硬币') } },
    结局二: {
      action: {
        type: 'steps',
        label: '看清摸到的东西',
        build: ctx => {
          if (ctx.random() < 0.5) {
            ctx.draft.notice('粘液褪去，摸出的是一件宝物');
            return randomRelicSteps(ctx, '普通', '沼泽盲摸：摸出的宝物');
          }
          ctx.draft.notice('粘液褪去，摸出的是一份诅咒');
          return curseSteps(ctx, '沼泽盲摸：缠上身的诅咒');
        },
      },
    },
    结局三: {
      action: {
        type: 'steps',
        label: '查看池底的收获',
        build: ctx => [...randomRelicSteps(ctx, '稀有', '沼泽盲摸：池底的宝物'), ...curseSteps(ctx, '沼泽盲摸：缠上身的诅咒')],
      },
    },
  },

  // ════════ 第二层 ════════
  禁书抄写: {
    结局一: { apply: ({ draft }) => draft.addModifier('禁书抄写', { 对象: '自身', 效果: '临时淫文', 数值: 1, 范围: '下N场', 剩余: 1 }) },
    结局二: {
      apply: ({ draft }) => draft.addStatus('淫纹'),
      action: { type: 'steps', label: '禁文入招', build: () => [{ kind: 'enchant', title: '禁书抄写：选择一张卡刻入【淫文】', enchant: '淫文' }] },
    },
    结局三: {
      apply: ({ draft }) => {
        draft.addStatus('淫纹');
        draft.addStatus('淫乱知识');
      },
      action: {
        type: 'steps',
        label: '禁文入招',
        build: () => [
          { kind: 'enchant', title: '禁书抄写：选择一张卡【精炼】', enchant: '精炼' },
          { kind: 'enchant', title: '禁书抄写：另选一张卡刻入【淫文】', enchant: '淫文' },
        ],
      },
    },
  },
  校规修订: {
    结局一: { apply: ({ draft }) => draft.addModifier('校规修订', { 对象: '自身', 效果: '护甲', 数值: 20, 范围: '本层下N场', 剩余: 1 }) },
    结局二: {
      action: {
        type: 'steps',
        label: '盖章生效',
        build: () => [{ kind: 'presetPick', title: '校规修订：选择要写下的温和校规', options: MILD_SCHOOL_RULES, source: '校规修订' }],
      },
    },
    结局三: {
      action: {
        type: 'steps',
        label: '盖章生效',
        build: () => [{ kind: 'presetPick', title: '校规修订：选择要写下的大胆校规', options: STRICT_SCHOOL_RULES, source: '校规修订' }],
      },
    },
  },
  补考: {
    结局一: { apply: ({ draft }) => draft.addStatus('被记录') },
    结局二: {
      action: {
        type: 'steps',
        label: '修订招式',
        build: () => [{ kind: 'cardTransform', title: '补考：选择一张卡，从三张同体系卡中选一张取代它', mode: { type: 'pickSameCategory', rarity: '普通', count: 3 } }],
      },
    },
    结局三: {
      apply: ({ draft }) => draft.addStatus('被记录'),
      action: {
        type: 'steps',
        label: '修订招式',
        build: () => [{ kind: 'cardTransform', title: '补考：选择一张卡，从三张同体系稀有卡中选一张取代它', mode: { type: 'pickSameCategory', rarity: '稀有', count: 3 } }],
      },
    },
  },

  // ════════ 第三层 ════════
  奴隶拍卖: {
    结局一: { apply: ({ draft }) => draft.changeGold(-5) },
    结局二: { action: { type: 'steps', label: '寄卖宝物', build: () => [{ kind: 'relicSell', title: '奴隶拍卖：选择一件圣遗物委托拍卖（成交价为商店价格的1.5倍）', multiplier: 1.5 }] } },
    结局三: {
      apply: ({ draft, floor }) => {
        draft.changeGold(10 + 5 * floor);
        draft.addStatus('被标记');
      },
      action: { type: 'steps', label: '戴上铭牌', build: ctx => eventRelicSteps(ctx, EVENT_RELIC_ID.AUCTION_TAG, '奴隶拍卖：成交铭牌') },
    },
  },
  刑罚转化: {
    结局一: { apply: ({ draft }) => draft.healPercentOfMax(0.3) },
    结局二: {
      action: {
        type: 'steps',
        label: '逼出污秽',
        build: ({ draft }) => {
          const candidates = getCleansableNegativeStatuses(draft.statuses);
          if (candidates.length > 0) return [{ kind: 'statusChoice', title: '刑罚转化：选择要被逼出的污秽', mode: 'remove', candidates }];
          draft.notice('身上没有污秽可逼出，刑罚改为淬炼了招式');
          return [{ kind: 'enchant', title: '刑罚转化：选择一张卡【精炼】', enchant: '精炼' }];
        },
      },
    },
    结局三: {
      action: {
        type: 'steps',
        label: '烙下刑印',
        build: ({ draft }) => {
          const candidates = brandableStatuses(draft);
          if (candidates.length > 0) return [{ kind: 'statusChoice', title: '刑罚转化：选择要凝成刑印的污秽', mode: 'brand', candidates }];
          draft.notice('身上没有可凝成刑印的污秽，刑罚改为淬炼了招式');
          return [{ kind: 'enchant', title: '刑罚转化：选择一张卡【精炼】', enchant: '精炼' }];
        },
      },
    },
  },
  鞭笞重铸: {
    结局一: { apply: ({ draft }) => draft.addModifier('鞭笞重铸', { 对象: '自身', 效果: '护甲', 数值: 30, 范围: '下N场', 剩余: 3 }) },
    结局二: {
      action: {
        type: 'steps',
        label: '重铸招式',
        build: () => [{ kind: 'cardTransform', title: '鞭笞重铸：选择一张卡，重铸为随机流派的稀有招式', mode: { type: 'randomCategoryRare' } }],
      },
    },
    结局三: {
      apply: ({ draft }) => draft.addStatus('鞭痕'),
      action: {
        type: 'steps',
        label: '重铸招式',
        build: () => [{ kind: 'cardTransform', title: '鞭笞重铸：选择一张卡，重铸为同流派的稀有招式', mode: { type: 'sameCategoryRare' } }],
      },
    },
  },
  代刑: {
    结局一: { apply: ({ draft }) => draft.loseHp(5) },
    结局二: {
      apply: ({ draft }) => draft.loseHpPercentOfCurrent(0.5),
      action: { type: 'steps', label: '收下宝物', build: ctx => randomRelicSteps(ctx, '稀有', '代刑：女囚藏起的宝物') },
    },
    结局三: {
      apply: ({ draft }) => {
        draft.changeGold(6);
        draft.addStatus('被标记');
      },
      action: { type: 'steps', label: '接过鞭子', build: ctx => fixedCardSteps(ctx, EVENT_CARD_ID.JAILER_WHIP, '代刑：狱卒的入伙礼') },
    },
  },

  // ════════ 第四层 ════════
  假面互换: {
    结局一: { apply: ({ draft }) => draft.changeGold(8) },
    结局二: { action: { type: 'steps', label: '交换信物', build: () => [{ kind: 'relicTrade', title: '假面互换：选择一件圣遗物交给贵族（换回同稀有度的随机一件）', tierUp: false }] } },
    结局三: {
      apply: ({ draft }) => draft.addStatus('迷失'),
      action: { type: 'steps', label: '交换信物', build: () => [{ kind: 'relicTrade', title: '假面互换：选择一件圣遗物交给贵族（换回高一阶稀有度的随机一件）', tierUp: true }] },
    },
  },
  借梦: {
    结局一: { apply: ({ draft }) => draft.heal(8) },
    结局二: {
      action: {
        type: 'steps',
        label: '留下梦中的招式',
        build: ctx => monsterCardSteps(ctx, '借梦：从梦中带回一个招式（离开本层时归还）', '借梦'),
      },
    },
    结局三: {
      apply: ({ draft }) => draft.addStatus('鳞粉'),
      action: { type: 'steps', label: '留下梦中的招式', build: ctx => monsterCardSteps(ctx, '借梦：从梦中带回一个招式（永久）') },
    },
  },
  御膳: {
    结局一: { apply: ({ draft }) => addConsumable(draft, 'snack') },
    结局二: {
      action: {
        type: 'steps',
        label: '品鉴菜肴',
        build: () => [{ kind: 'presetPick', title: '御膳：选择要品尝的一道菜（余韵在本层领主战中生效）', options: ROYAL_DISHES, source: '御膳' }],
      },
    },
    结局三: {
      apply: ({ draft }) => {
        for (const dish of ROYAL_DISHES) addModifiers(draft, `御膳·${dish.label}`, dish.modifiers);
        draft.addModifier('御膳·吃撑', { 对象: '自身', 效果: status(EffectType.WEAKEN), 数值: 2, 范围: '本层非领主战' });
      },
    },
  },
  七宗罪: {
    结局一: { action: { type: 'steps', label: '接受罪书', build: ctx => sinCardSteps(ctx, 'random', '七宗罪：选择了你的罪书') } },
    结局二: {
      apply: ({ draft }) => draft.changeMaxHpPercent(-0.25),
      action: { type: 'steps', label: '挑选罪书', build: ctx => sinCardSteps(ctx, 'choose', '七宗罪：亲手挑选一本罪书') },
    },
  },

  // ════════ 第五层 ════════
  圣痕授予: {
    结局一: { apply: ({ draft }) => draft.addModifier('神的失望', { 对象: '自身', 效果: status(EffectType.WEAKEN), 数值: 2, 范围: '下N场', 剩余: 1 }) },
    结局二: {
      apply: ({ draft }) => {
        draft.addStatus('圣痕', 1);
        draft.changeMana(5);
      },
    },
    结局三: {
      apply: ({ draft }) => draft.addStatus('圣痕', 3),
      action: { type: 'steps', label: '握住圣光', build: ctx => fixedCardSteps(ctx, EVENT_CARD_ID.HOLY_LIGHT, '圣痕授予：天使留下的圣光') },
    },
  },
  献贞: {
    结局一: { apply: ({ draft }) => draft.heal(10) },
    结局二: { action: { type: 'steps', label: '接过回礼', build: ctx => randomRelicSteps(ctx, '稀有', '献贞：神的回礼') } },
    结局三: {
      apply: ({ draft }) =>
        draft.notice('请在本轮正文后按剧情改写 主角信息.贞操（若贞操已经失去，则改写另一项她仍保留的「第一次」）'),
      action: { type: 'steps', label: '接过神器', build: ctx => randomRelicSteps(ctx, '传奇', '献贞：神赐的神器') },
    },
  },
  神之种: {
    结局一: { apply: ({ draft }) => draft.changeGold(12) },
    结局二: {
      apply: ({ draft }) => {
        draft.addStatus('孕育');
        draft.addDelayedReward({ 来源: '神之种', 剩余房间: 3, 奖励: '稀有圣遗物', 移除状态: '孕育' });
        draft.notice('三个房间之后将分娩出一件神赐之物');
      },
    },
    结局三: {
      apply: ({ draft }) => {
        draft.addStatus('孕育');
        draft.addStatus('信息素');
        draft.addDelayedReward({ 来源: '神之种', 剩余房间: 3, 奖励: '传奇圣遗物', 移除状态: '孕育' });
        draft.notice('三个房间之后将分娩出一件神器');
      },
    },
  },
  净化与堕落: {
    结局一: {
      action: {
        type: 'steps',
        label: '掬水洗去污秽',
        build: ({ draft }) => {
          const candidates = getCleansableNegativeStatuses(draft.statuses);
          return candidates.length > 0
            ? [{ kind: 'statusChoice', title: '净化与堕落：选择要洗去的污秽', mode: 'remove', candidates }]
            : [{ kind: 'info', title: '净化与堕落', lines: ['身上没有可以洗去的污秽。'] }];
        },
      },
    },
    结局二: {
      apply: ctx => {
        const slots = curseSlots(ctx);
        if (slots.length === 0) {
          ctx.draft.changeMaxHpPercent(0.2);
          return;
        }
        for (const slot of slots) {
          const basic = pickOne(ctx.pools.basicCardNames, ctx.random) ?? '普通物理攻击';
          ctx.draft.setSkill(slot, basic);
        }
        ctx.draft.changeMaxHpPercent(-0.25);
      },
    },
    结局三: {
      apply: ctx => {
        ctx.draft.addStatus('沉沦');
        const slots = curseSlots(ctx);
        if (slots.length === 0) return;
        ctx.memo.bloomed = true;
        const owned = ownedSkillNames(ctx).filter(name => !isCurseCardName(ctx, name));
        const sins = pickSinCardsForCurseBloom(owned, slots.length, ctx.random);
        sins.forEach((sin, index) => ctx.draft.setSkill(slots[index]!, sin.name));
        if (sins.length < slots.length) ctx.draft.notice('七种原罪已满，其余诅咒没有绽放');
      },
      // 有诅咒时已在 apply 中批量绽放；没有诅咒时先种下一份诅咒再令其绽放 = 获得一张原罪卡
      actionWhen: ({ memo }) => !memo.bloomed,
      action: { type: 'steps', label: '让诅咒绽放', build: ctx => sinCardSteps(ctx, 'random', '净化与堕落：蜜池种下的原罪') },
    },
  },

  // ════════ 区域事件 ════════
  喷浆果丛: {
    结局一: { apply: ({ draft }) => addConsumable(draft, 'sprayFruit', 1) },
    结局二: {
      apply: ({ draft }) => {
        addConsumable(draft, 'sprayFruit', 3);
        draft.loseHp(5);
      },
    },
    结局三: {
      apply: ({ draft }) => {
        addConsumable(draft, 'sprayFruit', 5);
        draft.loseHpPercentOfCurrent(0.5);
      },
    },
  },
  菌丝传讯: {
    结局一: { apply: ({ draft }) => draft.loseHp(3) },
    结局二: {
      apply: ({ draft }) => {
        draft.healToFull();
        draft.addStatus('信息素');
      },
    },
    结局三: { action: { type: 'steps', label: '接入网络', build: ctx => eventRelicSteps(ctx, EVENT_RELIC_ID.MYCELIUM_HEART, '菌丝传讯') } },
  },
  禁书借阅: {
    结局一: { apply: ({ draft }) => draft.addModifier('禁书借阅', { 对象: '自身', 效果: '魔力', 数值: 1, 范围: '下N场', 剩余: 1 }) },
    结局二: { action: { type: 'steps', label: '挑选禁书', build: ctx => activePickSteps(ctx, 3, '普通', '禁书借阅：挑选一本禁书（离开本层时归还）', '禁书借阅') } },
    结局三: {
      apply: ({ draft }) => draft.addStatus('逾期'),
      action: { type: 'steps', label: '挑选禁书', build: ctx => activePickSteps(ctx, 3, '普通', '禁书借阅：挑选一本禁书（永久据为己有）') },
    },
  },
  墨纹改写: {
    结局一: { apply: ({ draft }) => draft.heal(6) },
    结局二: {
      action: {
        type: 'steps',
        label: '改写印记',
        build: ({ draft }) => {
          const candidates = getCleansableNegativeStatuses(draft.statuses).filter(raw => parseNegativeStatus(raw).key !== '淫纹');
          if (candidates.length > 0) return [{ kind: 'statusChoice', title: '墨纹改写：选择要改写为淫纹的印记', mode: 'rewriteYinwen', candidates }];
          draft.heal(6);
          return [{ kind: 'info', title: '墨纹改写', lines: ['身上没有可改写的印记，湖水洗去了疲惫。'] }];
        },
      },
    },
    结局三: {
      apply: ({ draft }) => {
        const cleared = getCleansableNegativeStatuses(draft.statuses);
        const count = countNegativeStatusesWithStacks(cleared);
        if (count <= 0) {
          draft.heal(6);
          return;
        }
        draft.statuses = draft.statuses.filter(raw => !cleared.includes(raw));
        draft.notice(`擦去了全部印记：${cleared.join('、')}`);
        draft.addStatus('墨染', count * 2);
      },
    },
  },
  宿舍的姐妹: {
    结局一: { apply: ({ draft }) => draft.heal(10) },
    结局二: {
      action: {
        type: 'steps',
        label: '学习技艺',
        build: ctx => {
          const categories = new Set(ctx.pools.carriedCategories);
          const options = pickCardOptions(ctx.pools.rewardableCards.filter(card => categories.has(card.category)), 3, { rarity: '普通', random: ctx.random });
          return [{ kind: 'cardPick', title: '宿舍的姐妹：挑选一门技艺', options }];
        },
      },
    },
    结局三: {
      action: {
        type: 'steps',
        label: '学习私藏技艺',
        build: ctx => {
          const categories = new Set(ctx.pools.carriedCategories);
          const foreign = ctx.pools.rewardableCards.filter(card => !categories.has(card.category));
          const pool = foreign.length > 0 ? foreign : ctx.pools.rewardableCards;
          return [{ kind: 'cardPick', title: '宿舍的姐妹：挑选一门私藏技艺', options: pickCardOptionsWithRareChance(pool, 4, 0.15, ctx.random) }];
        },
      },
    },
  },
  感官剥夺室: {
    结局一: { apply: ({ draft }) => draft.addModifier('感官剥夺室', { 对象: '自身', 效果: '最小点数', 数值: 1, 范围: '下N场', 剩余: 1 }) },
    结局二: {
      apply: ({ draft }) => {
        draft.addModifier('感官剥夺室', { 对象: '自身', 效果: '最小点数', 数值: 1, 范围: '本层' });
        draft.addModifier('感官剥夺室', { 对象: '自身', 效果: '最大点数', 数值: -1, 范围: '本层' });
      },
    },
    结局三: {
      apply: ({ draft }) => {
        draft.changeMinDice(1);
        draft.addModifier('感官剥夺室', { 对象: '自身', 效果: '最大点数', 数值: -1, 范围: '本层' });
      },
    },
  },
  活体酒窖: {
    结局一: { apply: ({ draft }) => draft.addModifier('血酒', { 对象: '自身', 效果: '吸血', 数值: 1, 范围: '下N场', 剩余: 1 }) },
    结局二: { apply: ({ draft }) => draft.addModifier('血酒', { 对象: '自身', 效果: '吸血', 数值: 1, 范围: '下N场', 剩余: 3 }) },
    结局三: {
      apply: ({ draft }) => draft.addStatus('血族印记'),
      action: { type: 'steps', label: '收下酒杯', build: ctx => eventRelicSteps(ctx, EVENT_RELIC_ID.BLOOD_CHALICE, '活体酒窖：酒桶的荣誉') },
    },
  },
  罪与罚天平: {
    结局一: { apply: ({ draft }) => draft.changeGold(-10) },
    结局二: {
      apply: ({ draft }) => {
        const count = countNegativeStatusesWithStacks(draft.statuses);
        draft.notice(`天平称出${count}份罪孽`);
        draft.changeGold(5 * count);
      },
      actionWhen: ({ draft }) => countNegativeStatusesWithStacks(draft.statuses) >= 3,
      action: { type: 'steps', label: '领取赦免之礼', build: ctx => randomRelicSteps(ctx, '宝箱', '罪与罚天平：额外的赦免之礼') },
    },
  },
  替身人偶: {
    结局一: { apply: ({ draft }) => addConsumable(draft, 'cottonDoll') },
    结局二: {
      apply: ({ draft }) => draft.loseHp(15),
      action: { type: 'steps', label: '领取人偶', build: ctx => eventRelicSteps(ctx, EVENT_RELIC_ID.STAND_IN_DOLL, '替身人偶') },
    },
    结局三: {
      apply: ({ draft }) => {
        draft.changeMaxHp(-10);
        draft.changeMana(-2);
      },
      action: { type: 'steps', label: '领取人偶', build: ctx => eventRelicSteps(ctx, EVENT_RELIC_ID.SOUL_DOLL, '替身人偶：灵魂人偶') },
    },
  },
  镜中他我: {
    结局一: { apply: ({ draft }) => draft.changeMaxHp(8) },
    结局二: { action: { type: 'steps', label: '映照招式', build: () => [{ kind: 'cardCopy', title: '镜中他我：选择要映照的招式，再选择被倒影取代的槽位' }] } },
  },
  共梦: {
    结局一: { apply: ({ draft }) => draft.changeMaxHp(8) },
    结局二: { action: { type: 'battle', label: '梦中交手', noPenalty: true } },
  },
  暴食契约: {
    结局一: { apply: ({ draft }) => draft.heal(8) },
    结局二: {
      apply: ({ draft }) => {
        draft.changeMaxHp(15);
        draft.changeMana(-2);
      },
    },
    结局三: { action: { type: 'steps', label: '接受暴食之胃', build: ctx => eventRelicSteps(ctx, EVENT_RELIC_ID.GLUTTON_STOMACH, '暴食契约') } },
  },
  强制烙印: yinwenBrandOutcomes('强制烙印'),
  欲望显现: yinwenBrandOutcomes('欲望显现'),
  脐带连接: {
    结局一: { apply: ({ draft }) => draft.heal(30) },
    结局二: { apply: ({ draft }) => draft.addModifier('脐带连接', { 对象: '自身', 效果: '进房回复', 数值: 10, 范围: '本层' }) },
    结局三: { action: { type: 'steps', label: '接受脐带', build: ctx => eventRelicSteps(ctx, EVENT_RELIC_ID.UMBILICAL_CORD, '脐带连接') } },
  },
};

function monsterCardSteps(ctx: OutcomeContext, title: string, temporarySource?: string): SettlementStep[] {
  const deck = ctx.pools.getEnemyDeck(ctx.opponent);
  const unique = Array.from(new Map(deck.map(card => [card.name, card])).values()).filter(card => card.type !== CardType.CURSE);
  const options = pickMany(unique, 3, ctx.random);
  if (options.length === 0) return [{ kind: 'info', title, lines: [`没能从【${ctx.opponent || '魔物'}】的梦里带回任何招式。`] }];
  return [{ kind: 'cardPick', title: `${title}·${ctx.opponent}`, options, ...(temporarySource ? { temporarySource } : {}) }];
}

export const getEventOutcomeSpec = (eventName: string, verdict: EventVerdict): EventOutcomeSpec | null =>
  EVENT_OUTCOMES[eventName]?.[verdict] ?? null;
