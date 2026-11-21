import { EffectType } from '../types';
import type { RelicData } from './relicRegistry';

/**
 * 事件类圣遗物（category: '事件'）。
 * 不进入宝箱 / 商店 / 战斗掉落的常规奖励池，只能通过事件结局获得；可以带负面效果。
 * 依赖战斗外或特殊时机的效果按 id 在其它位置补充：
 *   - 拍卖铭牌：GameView 战斗胜利金币
 *   - 替身人偶 / 灵魂人偶：CombatView 生命归零复活
 *   - 暴食者之胃：GameView 被动生命上限
 *   - 脐带：GameView 进入房间回复生命
 */

export const EVENT_RELIC_ID = {
  SLIME_HATCHLING: 'event_slime_hatchling',
  AUCTION_TAG: 'event_auction_tag',
  MYCELIUM_HEART: 'event_mycelium_heart',
  BLOOD_CHALICE: 'event_blood_chalice',
  STAND_IN_DOLL: 'event_stand_in_doll',
  SOUL_DOLL: 'event_soul_doll',
  GLUTTON_STOMACH: 'event_glutton_stomach',
  UMBILICAL_CORD: 'event_umbilical_cord',
} as const;

/** 拍卖铭牌：每场战斗胜利额外获得的金币 */
export const AUCTION_TAG_GOLD_PER_WIN = 2;
/** 暴食者之胃：生命上限加成 */
export const GLUTTON_STOMACH_MAX_HP_BONUS = 30;
/** 脐带：每进入一个房间回复的生命 */
export const UMBILICAL_CORD_HEAL_PER_ROOM = 5;

export const EVENT_RELICS: readonly RelicData[] = [
  {
    id: EVENT_RELIC_ID.SLIME_HATCHLING,
    name: '幼体史莱姆',
    category: '事件',
    rarity: '稀有',
    effect: '开局护甲、生命回复与性兴奋',
    description: '战斗开局获得20点护甲、1层生命回复与1层高潮。',
    hooks: {
      onBattleStart: ({ addArmor, addStatusEffect, addLog }) => {
        addArmor('player', 20);
        addStatusEffect('player', EffectType.REGEN, 1);
        addStatusEffect('player', EffectType.ORGASM, 1);
        addLog('[幼体史莱姆] 获得20点护甲、1层生命回复与1层高潮。');
      },
    },
  },
  {
    id: EVENT_RELIC_ID.AUCTION_TAG,
    name: '拍卖铭牌',
    category: '事件',
    rarity: '普通',
    effect: '战斗胜利额外获得金币',
    description: `每场战斗胜利额外获得${AUCTION_TAG_GOLD_PER_WIN}金币。`,
  },
  {
    id: EVENT_RELIC_ID.MYCELIUM_HEART,
    name: '菌丝之心',
    category: '事件',
    rarity: '普通',
    effect: '敌方开局中毒，自身开局性兴奋',
    description: '战斗开局使敌方获得3层中毒；自身获得1层高潮。',
    hooks: {
      onBattleStart: ({ addStatusEffect, addLog }) => {
        addStatusEffect('enemy', EffectType.POISON, 3);
        addStatusEffect('player', EffectType.ORGASM, 1);
        addLog('[菌丝之心] 敌方获得3层中毒，自身获得1层高潮。');
      },
    },
  },
  {
    id: EVENT_RELIC_ID.BLOOD_CHALICE,
    name: '血酒杯',
    category: '事件',
    rarity: '稀有',
    effect: '造成伤害时回复生命，开局流血',
    description: '造成伤害时回复2点生命；战斗开局获得3层流血。',
    hooks: {
      onBattleStart: ({ addStatusEffect, addLog }) => {
        addStatusEffect('player', EffectType.BLEED, 3);
        addLog('[血酒杯] 自身获得3层流血。');
      },
      onAfterHitDealt: ({ sourceSide, actualDamage, heal }) => {
        if (sourceSide !== 'player' || actualDamage <= 0) return;
        heal('player', 2);
      },
    },
  },
  {
    id: EVENT_RELIC_ID.STAND_IN_DOLL,
    name: '替身人偶',
    category: '事件',
    rarity: '稀有',
    effect: '死亡时以1点生命复活，随后碎裂',
    description: '首次在战斗中生命归零时，以1点生命复活；触发后失去本圣遗物。',
    uniqueAcquisition: true,
  },
  {
    id: EVENT_RELIC_ID.SOUL_DOLL,
    name: '灵魂人偶',
    category: '事件',
    rarity: '稀有',
    effect: '死亡时回满生命复活，随后碎裂；复活时魔力枯竭',
    description: '首次在战斗中生命归零时，回满生命复活，并在复活的那一回合获得1层魔力枯竭；触发后失去本圣遗物。',
    uniqueAcquisition: true,
  },
  {
    id: EVENT_RELIC_ID.GLUTTON_STOMACH,
    name: '暴食者之胃',
    category: '事件',
    rarity: '稀有',
    effect: '生命上限大幅提升，首回合点数必为最小',
    description: `生命上限+${GLUTTON_STOMACH_MAX_HP_BONUS}；第一回合投掷点数必定为最小点数。`,
    uniqueAcquisition: true,
    hooks: {
      onTurnStart: ({ turn, self, state, addLog }) => {
        if (turn === 1) {
          state.savedMaxDice = self.maxDice;
          self.maxDice = self.minDice;
          addLog('[暴食者之胃] 第一回合点数必定为最小点数。');
        } else if (turn === 2 && typeof state.savedMaxDice === 'number') {
          self.maxDice = Math.max(self.minDice, state.savedMaxDice);
          delete state.savedMaxDice;
        }
      },
    },
  },
  {
    id: EVENT_RELIC_ID.UMBILICAL_CORD,
    name: '脐带',
    category: '事件',
    rarity: '稀有',
    effect: '进入房间回复生命，开局失去魔力',
    description: `每进入一个房间回复${UMBILICAL_CORD_HEAL_PER_ROOM}点生命；战斗开局魔力-3。`,
    uniqueAcquisition: true,
    hooks: {
      onBattleStart: ({ self, spendMana, addLog }) => {
        const loss = Math.min(3, Math.max(0, Math.floor(self.mp)));
        if (loss > 0 && spendMana('player', loss, '脐带')) addLog(`[脐带] 魔力 -${loss}。`);
      },
    },
  },
];
