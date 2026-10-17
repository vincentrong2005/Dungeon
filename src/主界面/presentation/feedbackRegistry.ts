import timelines from './effectTimelines.json';
import { CardType } from '../types';

export interface FeedbackSound {
  path: string;
  volume: number;
  rate: number;
  start?: number;
  end?: number;
}

export type BattleEffectName = keyof typeof timelines | 'stun';
export type UiSound = 'select' | 'confirm' | 'cancel' | 'invalid';

export const UI_SOUNDS: Record<UiSound, FeedbackSound[]> = {
  select: [{ path: 'audio/se/menu/Select_1.ogg', volume: 0.3, rate: 0.5 }],
  confirm: [{ path: 'audio/se/menu/Cancel_1.ogg', volume: 0.3, rate: 0.9 }],
  cancel: [{ path: 'audio/se/menu/Confirm_3.ogg', volume: 0.3, rate: 1 }],
  invalid: [{ path: 'audio/se/menu/Disable_2.ogg', volume: 0.3, rate: 1 }],
};

export const ACTION_SOUNDS = {
  roll: [{ path: 'audio/se/menu/Unwield_1.ogg', volume: 1, rate: 1.5 }],
  clashResult: [{ path: 'audio/se/menu/Unwield_1.ogg', volume: 0.6, rate: 1.5 }],
  draw: [{ path: 'audio/se/action/Turn_book_fast.ogg', volume: 1, rate: 1 }],
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
export const battleSounds = (effect: BattleEffectName): FeedbackSound[] => (
  effect === 'stun' ? []
    : effect === 'clash' ? TIMELINES.clash.sounds.map(sound => ({ ...sound, volume: sound.volume * 0.6 }))
      : effect === 'cold' ? TIMELINES.cold.sounds.map(sound => ({ ...sound, volume: sound.volume * 0.4 }))
        : effect === 'manaDrain' ? TIMELINES.manaDrain.sounds.map(sound => ({ ...sound, volume: sound.volume * 0.75 }))
          : TIMELINES[effect].sounds
);

export const EFFECT_SCALES: Partial<Record<BattleEffectName, number>> = { burn: 0.5, cold: 0.5 };
export const STUN_IMAGE = { path: 'image/动画/晕.png', x: 0, y: 0, width: 200, height: 200 };
export const BATTLE_EFFECTS: BattleEffectName[] = [...Object.keys(TIMELINES) as (keyof typeof TIMELINES)[], 'stun'];
export const BATTLE_TEXTURES = [...new Set([
  ...Object.values(TIMELINES).flatMap(timeline => timeline.images.flatMap(image => image ? [image.path] : [])),
  STUN_IMAGE.path,
])];
export const BATTLE_SOUNDS = [
  ...BATTLE_EFFECTS.flatMap(battleSounds),
  ...Object.values(CARD_HIT_SOUNDS).flat(),
  ...Object.values(ACTION_SOUNDS).flat(),
  ...Object.values(UI_SOUNDS).flat(),
];
