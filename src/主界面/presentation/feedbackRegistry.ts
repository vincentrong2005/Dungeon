import facing from './effectFacing.json';
import timelines from './effectTimelines.json';
import catalog from './feedbackCatalog.json';
import feedbackMedia from './feedbackSounds.json';
import { CardType } from '../types';

export interface FeedbackSound {
  path: string;
  volume: number;
  rate: number;
  start?: number;
  end?: number;
}

export type TimelineEffectName = keyof typeof timelines;
export type BattleEffectName = TimelineEffectName | 'stun';
export type UiSound = 'select' | 'confirm' | 'cancel' | 'invalid';

type FeedbackSoundKey = keyof typeof feedbackMedia.sounds;
const soundsOf = (key: FeedbackSoundKey): FeedbackSound[] => feedbackMedia.sounds[key] ?? [];

export const UI_SOUNDS: Record<UiSound, FeedbackSound[]> = {
  select: soundsOf('uiSelect'),
  confirm: soundsOf('uiConfirm'),
  cancel: soundsOf('uiCancel'),
  invalid: soundsOf('uiInvalid'),
};

export const ACTION_SOUNDS = {
  roll: soundsOf('roll'),
  clashResult: soundsOf('clashResult'),
  draw: soundsOf('draw'),
} satisfies Record<string, FeedbackSound[]>;

export const CARD_HIT_SOUNDS: Partial<Record<CardType, FeedbackSound[]>> = {
  [CardType.PHYSICAL]: timelines.physicalHit.sounds,
  [CardType.MAGIC]: timelines.magicHit.sounds,
};

export const CARD_HIT_EFFECTS: Partial<Record<CardType, BattleEffectName>> = {
  [CardType.PHYSICAL]: 'physicalHit',
  [CardType.MAGIC]: 'magicHit',
};

export const TIMELINES = timelines;
const isTimelineEffect = (value: unknown): value is TimelineEffectName => typeof value === 'string' && value in timelines;

export const battleSounds = (effect: BattleEffectName): FeedbackSound[] => (
  effect === 'stun' ? []
    : effect === 'clash' ? TIMELINES.clash.sounds.map(sound => ({ ...sound, volume: sound.volume * 0.6 }))
      : effect === 'cold' ? TIMELINES.cold.sounds.map(sound => ({ ...sound, volume: sound.volume * 0.4 }))
        : effect === 'manaDrain' ? TIMELINES.manaDrain.sounds.map(sound => ({ ...sound, volume: sound.volume * 0.75 }))
          : TIMELINES[effect].sounds
);

export const EFFECT_SCALES: Partial<Record<BattleEffectName, number>> = { burn: 0.5, cold: 0.5 };

/**
 * 特效的水平运动方向（scripts/measure-feedback-facing.py 测得的画面重心位移，正数 = 从左向右）。
 * 原作技能图集按「我方在右、敌人在左」制作，在本项目中命中右侧敌人时需要镜像。
 */
const FACING_THRESHOLD = 60;
export const shouldMirrorEffect = (effect: BattleEffectName, target: string): boolean => {
  const dx = (facing as Record<string, number>)[effect] ?? 0;
  if (Math.abs(dx) < FACING_THRESHOLD) return false;
  const towardRight = target !== 'player';
  return towardRight ? dx < 0 : dx > 0;
};
export const STUN_IMAGE = { path: feedbackMedia.images.stun, x: 0, y: 0, width: 200, height: 200 };

/**
 * 命中特效的「击中时刻」（秒）：取特效内最晚开始的音效（击打声通常标记击中瞬间），至少 0.2 秒。
 * 战斗中先播放特效、等到击中时刻再结算伤害，让伤害数字与画面同步。
 */
export const effectImpactSeconds = (effect: BattleEffectName): number => {
  if (effect === 'stun') return 0.2;
  const latest = TIMELINES[effect].sounds.reduce((max, sound) => Math.max(max, sound.start ?? 0), 0);
  return Math.min(1.2, Math.max(0.2, latest));
};

/** 进入战斗时必须加载完成的核心反馈（状态结算、拼点、命中） */
export const CORE_EFFECTS: BattleEffectName[] = [
  'clash', 'burn', 'poison', 'bleed', 'cold', 'shock', 'armor', 'bind', 'manaDrain', 'slime', 'heart', 'heal',
  'hypnosis', 'physicalHit', 'magicHit', 'stun',
];
export const BATTLE_EFFECTS: BattleEffectName[] = [...Object.keys(TIMELINES) as TimelineEffectName[], 'stun'];

export const effectTexturePaths = (effect: BattleEffectName): string[] => (
  effect === 'stun' ? [STUN_IMAGE.path]
    : [...new Set(TIMELINES[effect].images.flatMap(image => image ? [image.path] : []))]
);

/** 核心贴图：战斗开始前预载，缺失视为加载失败 */
export const BATTLE_TEXTURES = [...new Set(CORE_EFFECTS.flatMap(effectTexturePaths))];
/** 全部贴图：其余特效首次触发时按需加载 */
export const ALL_BATTLE_TEXTURES = [...new Set(BATTLE_EFFECTS.flatMap(effectTexturePaths))];
export const BATTLE_SOUNDS = [
  ...CORE_EFFECTS.flatMap(battleSounds),
  ...Object.values(CARD_HIT_SOUNDS).flat(),
  ...Object.values(ACTION_SOUNDS).flat(),
  ...Object.values(UI_SOUNDS).flat(),
];
export const ALL_BATTLE_SOUNDS = [
  ...BATTLE_EFFECTS.flatMap(battleSounds),
  ...BATTLE_SOUNDS,
];

// ── 卡牌、主动技、状态、圣遗物到特效的映射 ──

/** hit = 命中造成伤害时；use = 结算后；dodge = 闪避成功时；clashFail = 拼点失败时 */
export type CardFeedbackTrigger = 'hit' | 'use' | 'dodge' | 'clashFail';
export type FeedbackTarget = 'self' | 'enemy';
/** 主动技可同时作用于双方 */
export type ActiveFeedbackTarget = FeedbackTarget | 'both';
export interface CardFeedback {
  effect: TimelineEffectName;
  on: CardFeedbackTrigger;
  target: FeedbackTarget;
  /** 只在本场战斗第一次使用时播放（如「认知互换」的特殊效果只在首次使用时生效） */
  once: boolean;
}

const CARD_FEEDBACK = new Map<string, CardFeedback>();
for (const [name, entry] of Object.entries(catalog.cards as Record<string, string[]>)) {
  const [effect, on = 'hit', target, flag] = entry;
  if (!isTimelineEffect(effect)) continue;
  const trigger = (on === 'use' || on === 'dodge' || on === 'clashFail' ? on : 'hit') as CardFeedbackTrigger;
  CARD_FEEDBACK.set(name, {
    effect,
    on: trigger,
    target: target === 'self' || target === 'enemy' ? target : trigger === 'hit' ? 'enemy' : 'self',
    once: flag === 'once',
  });
}

const ACTIVE_FEEDBACK = new Map<string, { effect: TimelineEffectName; target: ActiveFeedbackTarget }>();
for (const [name, [effect, target]] of Object.entries(catalog.actives as Record<string, string[]>)) {
  if (!isTimelineEffect(effect)) continue;
  ACTIVE_FEEDBACK.set(name, { effect, target: target === 'enemy' || target === 'both' ? target : 'self' });
}

const STATUS_FEEDBACK = new Map<string, TimelineEffectName>();
for (const [status, effect] of Object.entries(catalog.statuses as Record<string, string>)) {
  if (isTimelineEffect(effect)) STATUS_FEEDBACK.set(status, effect);
}

const RELIC_FEEDBACK = new Map<string, TimelineEffectName>();
for (const [relic, effect] of Object.entries(catalog.relics as Record<string, string>)) {
  if (isTimelineEffect(effect)) RELIC_FEEDBACK.set(relic, effect);
}

export type FeedbackEvent = keyof typeof catalog.events;
export const EVENT_EFFECTS = Object.fromEntries(
  Object.entries(catalog.events).filter(([, effect]) => isTimelineEffect(effect)),
) as Record<FeedbackEvent, TimelineEffectName>;

export const cardFeedback = (card: { name: string } | null | undefined): CardFeedback | null => (
  card ? CARD_FEEDBACK.get(card.name) ?? null : null
);
export const activeSkillFeedback = (skill: { name: string } | null | undefined) => (
  skill ? ACTIVE_FEEDBACK.get(skill.name) ?? null : null
);
export const statusFeedback = (status: string): TimelineEffectName | null => STATUS_FEEDBACK.get(status) ?? null;
export const relicFeedback = (relicName: string): TimelineEffectName | null => RELIC_FEEDBACK.get(relicName) ?? null;
export const FEEDBACK_CATALOG_NAMES = {
  cards: [...CARD_FEEDBACK.keys()],
  actives: [...ACTIVE_FEEDBACK.keys()],
  statuses: [...STATUS_FEEDBACK.keys()],
  relics: [...RELIC_FEEDBACK.keys()],
};
