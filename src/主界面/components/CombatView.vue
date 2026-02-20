<template>
  <div
    class="combat-root w-full h-full bg-black/80 text-dungeon-paper font-ui relative overflow-hidden select-none"
    :class="screenShake ? 'animate-shake' : ''"
    :style="combatRootStyle"
  >
    <!-- Background -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(60,40,30,0.4),_#000000_90%)] z-0"></div>
    <div
      class="absolute inset-0 opacity-30 z-0 mix-blend-overlay bg-[length:200px] bg-repeat"
      style="background-image: url('https://www.transparenttextures.com/patterns/dark-matter.png')"
    ></div>

    <!-- Top Left: Settings -->
    <div class="absolute top-4 left-4 z-50 pointer-events-auto">
      <button
        class="px-3 py-1.5 bg-[#1a0f08]/90 border border-dungeon-gold/40 rounded text-xs text-dungeon-gold flex items-center gap-2 hover:border-dungeon-gold"
        @click="settingsOpen = !settingsOpen"
      >
        <Settings2 class="size-4" />
        <span>设置</span>
      </button>
      <div
        v-if="settingsOpen"
        class="mt-2 w-48 bg-black/85 border border-dungeon-gold/30 rounded p-3 text-xs text-dungeon-paper"
      >
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input v-model="battleSpeedUp" type="checkbox" class="accent-dungeon-gold" />
          <span>战斗加速（2x）</span>
        </label>
      </div>
    </div>

    <!-- Battlefield Layer -->
    <div class="absolute inset-0 z-10 pointer-events-none">
      <!-- Enemy Position: Top Right -->
      <div class="absolute top-[5%] right-[5%] md:top-[8%] md:right-[10%] w-96 h-[32rem] flex flex-col items-center justify-end group transition-transform duration-1000">
        <!-- Enemy Intent Card -->
        <div
          v-if="combatState.enemyIntentCard"
          class="absolute -left-48 top-20"
        >
          <div class="relative">
            <div class="absolute -top-6 left-0 bg-red-900/80 text-white text-xs px-2 py-1 rounded border border-red-500/30">
              敌方意图
            </div>
            <div class="rotate-[-5deg] scale-90 shadow-[0_0_20px_rgba(255,0,0,0.2)]">
              <DungeonCard :card="combatState.enemyIntentCard" is-enemy disabled />
            </div>
          </div>
        </div>

        <!-- Enemy Dice -->
        <div v-if="!showClashAnimation" class="absolute -left-12 bottom-32 z-20 animate-float">
          <DungeonDice :value="displayEnemyDice" :rolling="isRolling" color="red" size="md" />
        </div>

        <!-- Enemy Portrait -->
        <div class="relative w-full h-full">
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-12 bg-black/80 blur-xl"></div>
          <div
            class="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-96 bg-[#1a0f08] rounded-lg shadow-[0_0_40px_rgba(153,27,27,0.3)] flex items-center justify-center overflow-hidden"
          >
            <Skull class="w-48 h-48 text-red-900/30" />
            <div class="absolute inset-0 bg-gradient-to-t from-red-950/80 to-transparent"></div>
          </div>
        </div>

        <!-- Enemy Status Bar -->
        <div class="relative overflow-visible mt-4 w-72 bg-black/80 border border-red-900/30 p-3 rounded shadow-lg backdrop-blur-sm z-10">
          <div class="flex justify-between text-sm text-red-400 font-bold mb-1">
            <span>{{ enemyDisplayName }}</span>
          </div>
          <div class="pointer-events-none absolute inset-0 z-30 overflow-visible">
            <div
              v-for="popup in floatingNumbersFor('enemy')"
              :key="popup.id"
              class="combat-float-number absolute text-xl font-extrabold tracking-wide"
              :class="popup.colorClass"
              :style="{
                left: `calc(50% + ${popup.leftOffset}px)`,
                top: `${popup.topOffset}px`,
                animationDuration: `${popup.duration}ms`,
              }"
            >
              {{ popup.text }}
            </div>
          </div>
          <!-- Armor Shield -->
          <div v-if="enemyArmor > 0" class="flex items-center gap-1 mb-1">
            <span class="text-[10px] text-yellow-400">🛡️</span>
            <span class="text-[10px] text-yellow-300 font-bold">{{ enemyArmor }}</span>
          </div>
          <!-- HP Bar -->
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-red-400 font-bold w-6">HP</span>
            <div class="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
              <div
                class="h-full bg-red-700 transition-all duration-500"
                :style="withTransition({ width: `${enemyStats.maxHp > 0 ? (enemyStats.hp / enemyStats.maxHp) * 100 : 0}%` }, 500)"
              ></div>
            </div>
            <span class="text-[10px] text-red-300 w-14 text-right">{{ enemyStats.hp }}/{{ enemyStats.maxHp }}</span>
          </div>
          <!-- MP Bar -->
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-blue-400 font-bold w-6">MP</span>
            <div class="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-600 transition-all duration-500"
                :style="withTransition({ width: `${Math.min((enemyStats.mp / 20) * 100, 100)}%` }, 500)"
              ></div>
            </div>
            <span class="text-[10px] text-blue-300 w-14 text-right">{{ enemyStats.mp }}</span>
          </div>
          <!-- Dice Range -->
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-gray-400 font-bold w-6">🎲</span>
            <span class="text-[10px] text-red-300">{{ enemyStats.minDice }} ~ {{ enemyStats.maxDice }}</span>
          </div>
          <!-- Buffs/Debuffs -->
          <div v-if="enemyStats.effects.length > 0" class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="(eff, i) in enemyStats.effects"
              :key="i"
              class="text-[9px] px-1.5 py-0.5 rounded-full border font-bold"
              :class="effectPillClass(eff.polarity)"
              :title="getEffectDescription(eff.type)"
            >
              {{ getEffectName(eff.type) }}
              <template v-if="eff.stacks > 1">x{{ eff.stacks }}</template>
            </span>
          </div>
        </div>
      </div>

      <!-- Player Position: Bottom Left -->
      <div class="absolute bottom-[20%] left-[5%] md:bottom-[25%] md:left-[10%] w-64 h-80 flex flex-col items-center justify-end z-20 translate-y-28 md:translate-y-32">
        <!-- Player Dice -->
        <div v-if="!showClashAnimation" class="absolute -top-24 left-1/2 -translate-x-1/2 z-20 animate-float" style="animation-delay: 1s">
          <DungeonDice :value="displayPlayerDice" :rolling="isRolling" color="gold" size="md" />
        </div>

        <!-- Player Portrait -->
        <div class="relative w-full h-full">
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/80 blur-xl"></div>
          <div
            class="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-64 bg-[#1a0f08] rounded-lg shadow-[0_0_30px_rgba(212,175,55,0.2)] flex items-center justify-center overflow-hidden"
          >
            <div class="size-20 bg-dungeon-gold/20 blur-2xl rounded-full"></div>
            <div class="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-dungeon-gold/10 to-transparent"></div>
          </div>
        </div>

        <!-- Player Status Bar -->
        <div class="relative overflow-visible mt-2 w-60 bg-black/90 border border-dungeon-gold/50 p-2 rounded shadow-xl backdrop-blur-sm z-10">
          <div class="flex justify-between text-xs text-dungeon-gold font-bold mb-1">
            <span>冒险者</span>
          </div>
          <div class="pointer-events-none absolute inset-0 z-30 overflow-visible">
            <div
              v-for="popup in floatingNumbersFor('player')"
              :key="popup.id"
              class="combat-float-number absolute text-xl font-extrabold tracking-wide"
              :class="popup.colorClass"
              :style="{
                left: `calc(50% + ${popup.leftOffset}px)`,
                top: `${popup.topOffset}px`,
                animationDuration: `${popup.duration}ms`,
              }"
            >
              {{ popup.text }}
            </div>
          </div>
          <!-- Armor Shield -->
          <div v-if="playerArmor > 0" class="flex items-center gap-1 mb-1">
            <span class="text-[10px] text-yellow-400">🛡️</span>
            <span class="text-[10px] text-yellow-300 font-bold">{{ playerArmor }}</span>
          </div>
          <!-- HP Bar -->
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-dungeon-blood font-bold w-6">HP</span>
            <div class="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden">
              <div
                class="h-full bg-dungeon-blood transition-all duration-500"
                :style="withTransition({ width: `${playerStats.maxHp > 0 ? (playerStats.hp / playerStats.maxHp) * 100 : 0}%` }, 500)"
              ></div>
            </div>
            <span class="text-[10px] text-dungeon-blood w-14 text-right">{{ playerStats.hp }}/{{ playerStats.maxHp }}</span>
          </div>
          <!-- MP Bar -->
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-blue-400 font-bold w-6">MP</span>
            <div class="flex-1 h-1 bg-gray-900 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-600 transition-all duration-500"
                :style="withTransition({ width: `${Math.min((playerStats.mp / 20) * 100, 100)}%` }, 500)"
              ></div>
            </div>
            <span class="text-[10px] text-blue-300 w-14 text-right">{{ playerStats.mp }}</span>
          </div>
          <!-- Dice Range -->
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-gray-400 font-bold w-6">🎲</span>
            <span class="text-[10px] text-dungeon-gold">{{ playerStats.minDice }} ~ {{ playerStats.maxDice }}</span>
          </div>
          <!-- Buffs/Debuffs -->
          <div v-if="playerStats.effects.length > 0" class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="(eff, i) in playerStats.effects"
              :key="i"
              class="text-[9px] px-1.5 py-0.5 rounded-full border font-bold"
              :class="effectPillClass(eff.polarity)"
              :title="getEffectDescription(eff.type)"
            >
              {{ getEffectName(eff.type) }}
              <template v-if="eff.stacks > 1">x{{ eff.stacks }}</template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- UI Layer (HUD) -->
    <div class="absolute inset-0 z-30 flex flex-col pointer-events-none">
      <!-- Center: Clash Zone -->
      <div class="flex-1 flex items-center justify-center relative">
        <!-- Clash Animation Stage -->
        <div v-if="showClashAnimation" class="relative w-full h-64 flex items-center justify-center z-50">
          <!-- Player Dice Flying In -->
          <div
            class="absolute right-1/2 mr-[-0.5rem] transition-all duration-300"
            :class="shatteringTarget === 'player' || shatteringTarget === 'both' ? 'animate-shatter' : 'animate-clash-left'"
            :style="transitionStyle(300)"
          >
            <DungeonDice
              :value="displayPlayerDice"
              :rolling="false"
              color="gold"
              size="lg"
              class-name="shadow-[0_0_50px_#d4af37]"
            />
          </div>

          <!-- Enemy Dice Flying In -->
          <div
            class="absolute left-1/2 ml-[-0.5rem] transition-all duration-300"
            :class="shatteringTarget === 'enemy' || shatteringTarget === 'both' ? 'animate-shatter' : 'animate-clash-right'"
            :style="transitionStyle(300)"
          >
            <DungeonDice
              :value="displayEnemyDice"
              :rolling="false"
              color="red"
              size="lg"
              class-name="shadow-[0_0_50px_#ff0000]"
            />
          </div>
        </div>

      </div>

      <!-- Bottom Bar: Hand & Piles -->
      <div
        class="pointer-events-auto min-h-[180px] w-full flex items-end justify-center pb-8 px-4 space-x-4 relative"
      >
        <!-- Center: Hand Cards -->
        <div class="flex space-x-6 items-end mb-4 z-40">
          <div
            v-for="(card, idx) in combatState.playerHand"
            :key="`${card.id}-${idx}`"
            class="transition-all duration-500 origin-bottom"
            :class="handCardClass(card)"
            :style="transitionStyle(500)"
            @mouseenter="handlePlayerCardHoverStart(card)"
            @mouseleave="handlePlayerCardHoverEnd"
            @touchstart.passive="handlePlayerCardTouchStart(card)"
            @touchend="handlePlayerCardTouchEnd"
            @touchcancel="handlePlayerCardTouchEnd"
          >
            <DungeonCard
              :card="card"
              :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT && combatState.playerSelectedCard !== card"
              @click="handleCardSelect(card, idx)"
            />
          </div>
        </div>

        <!-- Right Corner: Skip + Deck/Discard -->
        <div class="absolute right-6 bottom-6 flex flex-col items-end gap-2 z-50">
          <button
            class="h-8 px-4 bg-[#1a0f08] border border-amber-700/60 rounded text-xs text-amber-300 hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT"
            @click="handleSkipTurn"
          >
            跳过回合
          </button>

          <div class="flex space-x-3">
            <div class="relative group">
              <button
                class="w-16 h-16 bg-[#1a0f08] border border-dungeon-brown rounded-lg flex flex-col items-center justify-center hover:border-dungeon-gold transition-colors shadow-lg"
                @click="overlayOpen = 'deck'"
              >
                <Layers class="size-6 text-dungeon-gold" />
                <span class="text-[10px] text-gray-400 mt-1">{{ combatState.playerDeck.length }}</span>
              </button>
              <div
                class="absolute -top-8 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                牌库
              </div>
            </div>

            <div class="relative group">
              <button
                class="w-16 h-16 bg-[#1a0f08] border border-dungeon-brown rounded-lg flex flex-col items-center justify-center hover:border-gray-500 transition-colors shadow-lg"
                @click="overlayOpen = 'discard'"
              >
                <Trash2 class="size-6 text-gray-500" />
                <span class="text-[10px] text-gray-400 mt-1">{{ combatState.discardPile.length }}</span>
              </button>
              <div
                class="absolute -top-8 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                弃牌堆
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Log Feed Overlay: top-right, below parent "退出战斗" button -->
      <div class="absolute right-0 top-16 z-40 pointer-events-auto select-none">
        <div class="flex items-start">
          <button
            class="h-8 px-2 rounded-l border border-r-0 border-gray-700 bg-black/80 text-[10px] text-gray-300 hover:text-white"
            :title="logsCollapsed ? '展开日志' : '折叠日志'"
            @click="logsCollapsed = !logsCollapsed"
          >
            {{ logsCollapsed ? '日志 ◀' : '日志 ▶' }}
          </button>
          <div
            v-if="!logsCollapsed"
            class="w-80 max-h-44 overflow-y-auto space-y-1 border border-r-0 border-gray-700 bg-black/70 p-1 text-[10px] font-mono text-gray-300"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-for="(l, i) in combatState.logs"
              :key="i"
              class="bg-black/60 p-1 rounded border-l-2 border-gray-700"
              v-html="l"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Deck/Discard Overlay -->
    <div
      v-if="overlayOpen"
      class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
      @click="overlayOpen = null"
    >
      <div
        class="bg-[#1a0f08] border border-dungeon-gold/30 p-6 rounded-xl max-w-2xl w-full max-h-[80%] flex flex-col relative"
        @click.stop
      >
        <div class="flex justify-between items-center mb-4 border-b border-dungeon-brown pb-2">
          <h3 class="font-heading text-xl text-dungeon-gold">
            {{ overlayOpen === 'deck' ? '当前牌库' : '弃牌堆' }}
          </h3>
          <button @click="overlayOpen = null">
            <XIcon class="size-6 hover:text-red-500" />
          </button>
        </div>
        <div class="overflow-y-auto grid grid-cols-4 gap-4 p-2">
          <div
            v-for="(card, i) in overlayOpen === 'deck' ? combatState.playerDeck : combatState.discardPile"
            :key="i"
            class="scale-75 origin-top-left"
          >
            <DungeonCard :card="card" disabled />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { Layers, Settings2, Skull, Trash2, X as XIcon } from 'lucide-vue-next';
import { applyDamageToEntity, calculateFinalDamage, calculateFinalPoint } from '../battle/algorithms';
import { EFFECT_REGISTRY, applyEffect, getEffectStacks, processOnTurnEnd, processOnTurnStart, reduceEffectStacks, removeEffect } from '../battle/effects';
import { getEnemyByName } from '../battle/enemyRegistry';
import { type CardData, type CombatState, type EffectPolarity, type EffectType, type EnemyAIContext, type EntityStats, CardType, CombatPhase, EffectType as ET } from '../types';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';

const props = defineProps<{
  initialPlayerStats: EntityStats;
  enemyName: string;
  playerDeck: CardData[];
}>();

const emit = defineEmits<{
  endCombat: [win: boolean, finalStats: EntityStats];
}>();

// --- Enemy Loading ---
const enemyDef = getEnemyByName(props.enemyName);
const enemyDisplayName = enemyDef?.name ?? props.enemyName;

// AI flags — mutable state for enemy AI decisions (e.g. hasUsedHeal)
const aiFlags = reactive<Record<string, any>>({});

// --- State ---
const playerStats = ref<EntityStats>({ ...props.initialPlayerStats });
const enemyStats = ref<EntityStats>(
  enemyDef
    ? { ...enemyDef.stats, effects: [...enemyDef.stats.effects] }
    : { hp: 1, maxHp: 1, mp: 0, minDice: 1, maxDice: 1, effects: [] },
);

// --- Effect display helpers ---
const getEffectName = (type: EffectType): string => {
  return EFFECT_REGISTRY[type]?.name ?? String(type);
};
const getEffectDescription = (type: EffectType): string => {
  return EFFECT_REGISTRY[type]?.description ?? '';
};
const effectPillClass = (polarity: EffectPolarity): string => {
  switch (polarity) {
    case 'buff':    return 'bg-green-900/60 border-green-500/40 text-green-300';
    case 'debuff':  return 'bg-red-900/60 border-red-500/40 text-red-300';
    case 'trait':   return 'bg-gray-800/60 border-gray-500/40 text-gray-300';
    case 'mixed':   return 'bg-purple-900/60 border-purple-500/40 text-purple-300';
    case 'special': return 'bg-yellow-900/60 border-yellow-500/40 text-yellow-300';
    default:        return 'bg-gray-800/60 border-gray-500/40 text-gray-300';
  }
};

// --- Armor computed ---
const playerArmor = computed(() => {
  const eff = playerStats.value.effects.find(e => e.type === ET.ARMOR);
  return eff?.stacks ?? 0;
});
const enemyArmor = computed(() => {
  const eff = enemyStats.value.effects.find(e => e.type === ET.ARMOR);
  return eff?.stacks ?? 0;
});

const enemyDeck = enemyDef ? [...enemyDef.deck] : [];

// dummy card to prevent crash if enemy has no cards
const PASS_CARD: CardData = {
  id: 'pass', name: '跳过', type: CardType.FUNCTION, category: '基础', manaCost: 0,
  calculation: { multiplier: 0, addition: 0 }, damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false }, cardEffects: [], description: '无行动'
};

const combatState = ref<CombatState>({
  turn: 1,
  phase: CombatPhase.TURN_START,
  actionsRemaining: 1,
  playerBaseDice: 1,
  enemyBaseDice: 1,
  playerHand: [],
  playerDeck: [...props.playerDeck].sort(() => Math.random() - 0.5),
  discardPile: [],
  enemyDeck: [...enemyDeck],
  enemyDiscard: [],
  enemyIntentCard: null,
  enemyPredictedPoint: 0,
  playerSelectedCard: null,
  lastPlayedCard: null,
  logs: [`战斗开始！遭遇了 <span class="text-red-500 font-bold">${enemyDisplayName}</span>`],
});

const isRolling = ref(false);
const showClashAnimation = ref(false);
const shatteringTarget = ref<'player' | 'enemy' | 'both' | null>(null);
const screenShake = ref(false);
const overlayOpen = ref<'deck' | 'discard' | null>(null);
const settingsOpen = ref(false);
const battleSpeedUp = ref(false);
const logsCollapsed = ref(true);

type BattleSide = 'player' | 'enemy';
type FloatingNumberKind = 'physical' | 'magic' | 'shield' | 'heal' | 'mana';

interface FloatingNumberEntry {
  id: number;
  side: BattleSide;
  text: string;
  colorClass: string;
  leftOffset: number;
  topOffset: number;
  duration: number;
}

const SPEED_SETTING_KEY = 'dungeon.combat.speed_up';
const speedMultiplier = computed(() => (battleSpeedUp.value ? 2 : 1));
const combatRootStyle = computed(() => ({ '--combat-speed-multiplier': String(speedMultiplier.value) }));
const floatingNumbers = ref<FloatingNumberEntry[]>([]);
const previewPlayerDice = ref<number | null>(null);
const previewEnemyDice = ref<number | null>(null);
const displayPlayerDice = computed(() => previewPlayerDice.value ?? combatState.value.playerBaseDice);
const displayEnemyDice = computed(() => previewEnemyDice.value ?? combatState.value.enemyBaseDice);
let hoverPreviewTimer: ReturnType<typeof setTimeout> | null = null;
let floatingNumberId = 0;

// Default relic modifiers (no relics yet)
const NO_RELIC_MOD = { globalMultiplier: 1, globalAddition: 0 };

// --- Helpers ---
const scaleDuration = (ms: number) => Math.max(60, Math.floor(ms / speedMultiplier.value));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, scaleDuration(ms)));
const transitionStyle = (ms: number) => ({ transitionDuration: `${scaleDuration(ms)}ms` });
const withTransition = (style: Record<string, string>, ms: number) => ({
  ...style,
  transitionDuration: `${scaleDuration(ms)}ms`,
});

const floatingColors: Record<FloatingNumberKind, string> = {
  physical: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.85)]',
  magic: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.85)]',
  shield: 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.85)]',
  heal: 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.85)]',
  mana: 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.85)]',
};

const floatingNumbersFor = (side: BattleSide) => floatingNumbers.value.filter((entry) => entry.side === side);

const resolveTargetSide = (source: BattleSide, target: 'self' | 'enemy') => {
  if (target === 'self') return source;
  return source === 'player' ? 'enemy' : 'player';
};

const clearDicePreview = () => {
  previewPlayerDice.value = null;
  previewEnemyDice.value = null;
  if (hoverPreviewTimer) {
    clearTimeout(hoverPreviewTimer);
    hoverPreviewTimer = null;
  }
};

const getCardFinalPoint = (source: 'player' | 'enemy', card: CardData, baseDice: number) => {
  const attacker = source === 'player' ? playerStats.value : enemyStats.value;
  const defender = source === 'player' ? enemyStats.value : playerStats.value;

  let finalPoint = calculateFinalPoint({
    baseDice,
    card,
    entityEffects: attacker.effects,
    relicModifiers: NO_RELIC_MOD,
  });

  // 卡牌专属点数修正：敌方每有2层燃烧，点数+1
  if (card.id === 'burn_inferno_judgement') {
    finalPoint += Math.floor(getEffectStacks(defender, ET.BURN) / 2);
  }

  return Math.max(0, Math.floor(finalPoint));
};

const getCardPreviewPoint = (source: 'player' | 'enemy', card: CardData, baseDice: number) => {
  return getCardFinalPoint(source, card, baseDice);
};

const handlePlayerCardHoverStart = (card: CardData) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  previewPlayerDice.value = getCardPreviewPoint('player', card, combatState.value.playerBaseDice);
};

const handlePlayerCardHoverEnd = () => {
  previewPlayerDice.value = null;
};

const handlePlayerCardTouchStart = (card: CardData) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (hoverPreviewTimer) clearTimeout(hoverPreviewTimer);
  hoverPreviewTimer = setTimeout(() => {
    previewPlayerDice.value = getCardPreviewPoint('player', card, combatState.value.playerBaseDice);
  }, 260);
};

const handlePlayerCardTouchEnd = () => {
  if (hoverPreviewTimer) {
    clearTimeout(hoverPreviewTimer);
    hoverPreviewTimer = null;
  }
  previewPlayerDice.value = null;
};

const pushFloatingNumber = (side: BattleSide, value: number, kind: FloatingNumberKind, sign: '+' | '-' = '+') => {
  const amount = Math.max(0, Math.floor(value));
  if (amount <= 0) return;

  const id = ++floatingNumberId;
  // Extend popup lifetime by ~50% for better readability.
  const duration = scaleDuration(1350);
  floatingNumbers.value.push({
    id,
    side,
    text: `${sign}${amount}`,
    colorClass: floatingColors[kind],
    leftOffset: Math.floor((Math.random() - 0.5) * 120),
    topOffset: 24 + Math.floor(Math.random() * 20),
    duration,
  });

  setTimeout(() => {
    floatingNumbers.value = floatingNumbers.value.filter((entry) => entry.id !== id);
  }, duration);
};

const log = (msg: string) => {
  combatState.value.logs = [msg, ...combatState.value.logs].slice(0, 5);
};

onMounted(() => {
  battleSpeedUp.value = localStorage.getItem(SPEED_SETTING_KEY) === '1';
});
watch(battleSpeedUp, (enabled) => {
  localStorage.setItem(SPEED_SETTING_KEY, enabled ? '1' : '0');
});

const drawCards = (count: number, currentDeck: CardData[], currentDiscard: CardData[]) => {
  let deck = [...currentDeck];
  let discard = [...currentDiscard];
  const drawn: CardData[] = [];

  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = [...discard].sort(() => Math.random() - 0.5);
      discard = [];
      log('<span class="text-yellow-500">弃牌堆已洗入牌库。</span>');
    }
    const card = deck.pop();
    if (card) drawn.push(card);
  }
  return { drawn, newDeck: deck, newDiscard: discard };
};

const handCardClass = (card: CardData) => {
  const selected = combatState.value.playerSelectedCard;
  const isSelected = selected === card;
  const isNotSelected = selected && !isSelected;
  const isActionPhase = combatState.value.phase === CombatPhase.PLAYER_INPUT;

  return [
    isSelected ? '-translate-y-12 scale-110 z-50 ring-2 ring-dungeon-gold rounded-lg shadow-[0_0_30px_#d4af37]' : '',
    isNotSelected ? 'opacity-30 scale-90 translate-y-8 grayscale' : 'hover:scale-110 hover:-translate-y-4 hover:z-50',
    !isActionPhase && !isSelected ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer',
  ];
};

// --- Enemy AI Card Selection ---
function selectEnemyCard(): CardData {
  // 眩晕中的敌方本回合直接跳过
  if (getEffectStacks(enemyStats.value, ET.STUN) > 0) {
    log('<span class="text-gray-400">敌方处于眩晕，跳过回合。</span>');
    return PASS_CARD;
  }

  if (combatState.value.enemyDeck.length === 0) {
    if (combatState.value.enemyDiscard.length === 0) return PASS_CARD; // Fallback
    combatState.value.enemyDeck = [...combatState.value.enemyDiscard].sort(() => Math.random() - 0.5);
    combatState.value.enemyDiscard = [];
  }

  if (enemyDef) {
    // Use the enemy's custom AI logic
    const ctx: EnemyAIContext = {
      enemyStats: enemyStats.value,
      playerStats: playerStats.value,
      deck: combatState.value.enemyDeck,
      turn: combatState.value.turn,
      flags: aiFlags,
    };
    return enemyDef.selectCard(ctx);
  }

  // Fallback: random selection (should never happen with proper registry)
  const idx = Math.floor(Math.random() * combatState.value.enemyDeck.length);
  return combatState.value.enemyDeck[idx]!;
}

// --- Phase Management ---

const startTurn = () => {
  clearDicePreview();
  combatState.value.phase = CombatPhase.DRAW_PHASE;
  combatState.value.playerSelectedCard = null;
  combatState.value.enemyIntentCard = null;
  isRolling.value = true;
  shatteringTarget.value = null;
  showClashAnimation.value = false;

  setTimeout(() => {
    const pRoll = Math.floor(Math.random() * (playerStats.value.maxDice - playerStats.value.minDice + 1)) + playerStats.value.minDice;
    const eRoll = Math.floor(Math.random() * (enemyStats.value.maxDice - enemyStats.value.minDice + 1)) + enemyStats.value.minDice;

    isRolling.value = false;
    combatState.value.playerBaseDice = pRoll;
    combatState.value.enemyBaseDice = eRoll;
    combatState.value.phase = CombatPhase.DRAW_PHASE;
    log(`掷骰结果：我方 [${pRoll}] vs 敌方 [${eRoll}]`);
  }, scaleDuration(1500));
};

// Watch for INIT phase
watch(
  () => combatState.value.phase,
  (phase) => {
     if (phase === CombatPhase.TURN_START) {
      // Process turn-start effects (poison, burn, mana spring, etc.)
      if (combatState.value.turn > 1) {
        for (const [side, label, stats] of [['player', '我方', playerStats], ['enemy', '敌方', enemyStats]] as const) {
          const result = processOnTurnStart(stats.value);
          let turnStartLogs = result.logs;
          // 燃烧伤害单独提示，并支持结界抵挡一次非真实伤害
          const burnLog = result.logs.find((entry) => entry.includes('[燃烧]'));
          if (burnLog) {
            const burnMatch = burnLog.match(/损失\s+(\d+)\s+点生命/);
            const burnDamage = burnMatch ? Number(burnMatch[1]) : 0;
            if (burnDamage > 0 && getEffectStacks(stats.value, ET.BARRIER) > 0) {
              reduceEffectStacks(stats.value, ET.BARRIER, 1);
              result.hpChange += burnDamage;
              turnStartLogs = result.logs.filter((entry) => entry !== burnLog);
              log(`<span class="text-gray-400 text-[9px]">${label}: [结界] 抵挡了 ${burnDamage} 点燃烧伤害。</span>`);
            } else if (burnDamage > 0) {
              pushFloatingNumber(side, burnDamage, 'magic', '-');
            }
          }

          if (result.hpChange !== 0) {
            const hpBefore = stats.value.hp;
            stats.value.hp = Math.max(0, Math.min(stats.value.maxHp, stats.value.hp + result.hpChange));
            const hpDelta = stats.value.hp - hpBefore;
            if (hpDelta > 0) {
              pushFloatingNumber(side, hpDelta, 'heal', '+');
            }
          }
          if (result.mpChange !== 0) {
            const mpBefore = stats.value.mp;
            stats.value.mp = Math.max(0, stats.value.mp + result.mpChange);
            const mpDelta = stats.value.mp - mpBefore;
            if (mpDelta > 0) {
              pushFloatingNumber(side, mpDelta, 'mana', '+');
            }
          }
          if (result.trueDamage > 0) stats.value.hp = Math.max(0, stats.value.hp - result.trueDamage);
          for (const l of turnStartLogs) {
            log(`<span class="text-gray-400 text-[9px]">${label}: ${l}</span>`);
          }
        }
      }
      setTimeout(() => startTurn(), scaleDuration(1000));
    }
  },
  { immediate: true },
);

// Watch for DRAW_PHASE
watch(
  [() => combatState.value.phase, isRolling],
  ([phase, rolling]) => {
    if (phase === CombatPhase.DRAW_PHASE && !rolling) {
      // Use enemy AI to select card
      const eCard = selectEnemyCard();
      const { drawn, newDeck, newDiscard } = drawCards(3, combatState.value.playerDeck, combatState.value.discardPile);

      combatState.value.enemyIntentCard = eCard;
      combatState.value.playerHand = drawn;
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      combatState.value.phase = CombatPhase.PLAYER_INPUT;
    }
  },
);

// Handle Card Select
const handleCardSelect = (card: CardData, handIdx: number) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (handIdx < 0 || handIdx >= combatState.value.playerHand.length) return;
  if (combatState.value.playerHand[handIdx]?.id !== card.id) return;

  if (card.type === CardType.MAGIC) {
    if (playerStats.value.mp < card.manaCost) {
      log('<span class="text-red-400">魔力不足！</span>');
      return;
    }
    playerStats.value.mp -= card.manaCost;
  }

  // 出牌后立即离开手牌（卡牌“消失”），并进入弃牌堆
  const [played] = combatState.value.playerHand.splice(handIdx, 1);
  if (!played) return;
  clearDicePreview();
  combatState.value.discardPile.push(played);
  combatState.value.playerSelectedCard = played;
  combatState.value.phase = CombatPhase.RESOLUTION;
};

const handleSkipTurn = () => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (!combatState.value.enemyIntentCard) return;

  clearDicePreview();
  combatState.value.playerSelectedCard = PASS_CARD;
  combatState.value.phase = CombatPhase.RESOLUTION;
  log('<span class="text-gray-400">你选择了跳过当前回合。</span>');
};

// Clashable check
const isClashable = (t1: CardType, t2: CardType): boolean => {
  if (t1 === CardType.PHYSICAL && t2 === CardType.PHYSICAL) return true;
  if (t1 === CardType.MAGIC && t2 === CardType.MAGIC) return true;
  if (t1 === CardType.DODGE && (t2 === CardType.PHYSICAL || t2 === CardType.MAGIC)) return true;
  if (t2 === CardType.DODGE && (t1 === CardType.PHYSICAL || t1 === CardType.MAGIC)) return true;
  return false;
};

// Resolution
const resolveCombat = async (pCard: CardData, eCard: CardData, pDice: number, eDice: number) => {
  const shouldClash = isClashable(pCard.type, eCard.type);
  const enemySkippedTurn = eCard.id === PASS_CARD.id;
  const pClashPoint = getCardPreviewPoint('player', pCard, pDice);
  const eClashPoint = getCardPreviewPoint('enemy', eCard, eDice);

  const clearPlayerBurn = (reason: string) => {
    const burnStacks = getEffectStacks(playerStats.value, ET.BURN);
    if (burnStacks <= 0) return;
    removeEffect(playerStats.value, ET.BURN);
    log(`<span class="text-orange-300">${reason} 我方燃烧清空（${burnStacks}层）。</span>`);
  };

  if (enemySkippedTurn) {
    clearPlayerBurn('敌方跳过回合。');
  }

  let pSuccess = true;
  let eSuccess = true;
  let resultMsg = '';
  let clashWinner: 'player' | 'enemy' | 'tie' | null = null;

  if (shouldClash) {
    previewPlayerDice.value = pClashPoint;
    previewEnemyDice.value = eClashPoint;
    showClashAnimation.value = true;
    await wait(600);

    screenShake.value = true;
    setTimeout(() => (screenShake.value = false), scaleDuration(500));

    if (pCard.type === eCard.type) {
      if (pClashPoint > eClashPoint) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '拼点胜利！';
      } else if (eClashPoint > pClashPoint) {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '拼点失败！';
      } else {
        pSuccess = false;
        eSuccess = false;
        clashWinner = 'tie';
        resultMsg = '势均力敌！';
      }
    } else if (pCard.type === CardType.DODGE) {
      if (eClashPoint > pClashPoint) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '闪避成功！';
      } else {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '闪避失败！';
      }
    } else if (eCard.type === CardType.DODGE) {
      if (pClashPoint > eClashPoint) {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '攻击被闪避！';
      } else {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '敌方闪避失败！';
      }
    }

    if (clashWinner === 'player') shatteringTarget.value = 'enemy';
    else if (clashWinner === 'enemy') shatteringTarget.value = 'player';
    else if (clashWinner === 'tie') {
      shatteringTarget.value = 'both';
    }

    if (resultMsg) {
      log(`<span class="text-gray-300">${resultMsg}</span>`);
    }

    if (clashWinner === 'player') {
      clearPlayerBurn('拼点胜利。');
    }

    await wait(650);
    showClashAnimation.value = false;
    clearDicePreview();
  } else {
    await wait(500);
    log('<span class="text-gray-400">双方卡牌互不干扰，直接结算。</span>');
    pSuccess = true;
    eSuccess = true;
  }

  // Execution Phase — use algorithms.ts for proper damage calculation
  const executeCard = (source: 'player' | 'enemy', card: CardData, baseDice: number) => {
    const attacker = source === 'player' ? playerStats.value : enemyStats.value;
    const defender = source === 'player' ? enemyStats.value : playerStats.value;
    const label = source === 'player' ? '我方' : '敌方';
    const defenderSide = source === 'player' ? 'enemy' : 'player';

    // Calculate final point for this card
    const finalPoint = getCardFinalPoint(source, card, baseDice);

    const syncCurrentPointForUi = () => {
      if (card.type !== CardType.FUNCTION || card.id === PASS_CARD.id) return;
      const nextPoint = Math.max(0, Math.floor(finalPoint));
      if (source === 'player') {
        if (combatState.value.playerBaseDice !== nextPoint) {
          combatState.value.playerBaseDice = nextPoint;
          log(`<span class="text-dungeon-gold/80">我方当前点数调整为 ${nextPoint}</span>`);
        }
      } else if (combatState.value.enemyBaseDice !== nextPoint) {
        combatState.value.enemyBaseDice = nextPoint;
      }
    };

    const applyCardEffects = () => {
      let hasEffect = false;

      for (const ce of card.cardEffects) {
        const targetKey = ce.target ?? 'self';
        const targetEntity = targetKey === 'self' ? attacker : defender;
        const targetSide = resolveTargetSide(source, targetKey);

        if (ce.kind === 'heal') {
          const healAmount = ce.valueMode === 'point_scale'
            ? Math.floor(finalPoint * (ce.scale ?? 1))
            : Math.floor(ce.fixedValue ?? 0);
          const beforeHp = targetEntity.hp;
          targetEntity.hp = Math.min(targetEntity.maxHp, targetEntity.hp + healAmount);
          const actualHeal = targetEntity.hp - beforeHp;
          if (actualHeal > 0) {
            pushFloatingNumber(targetSide, actualHeal, 'heal', '+');
          }
          log(`<span class="text-green-400">${label}【${card.name}】回复了 ${healAmount} 点生命</span>`);
          hasEffect = true;
        } else if (ce.kind === 'apply_buff') {
          const stacks = ce.valueMode === 'point_scale'
            ? Math.floor(finalPoint * (ce.scale ?? 1))
            : Math.floor(ce.fixedValue ?? 1);
          applyEffect(targetEntity, ce.effectType!, stacks);
          if (ce.effectType === ET.ARMOR) {
            pushFloatingNumber(targetSide, stacks, 'shield', '+');
          }
          log(`<span class="text-yellow-400">${label}【${card.name}】获得了 ${stacks} 层${EFFECT_REGISTRY[ce.effectType!]?.name ?? ce.effectType}</span>`);
          hasEffect = true;
        } else if (ce.kind === 'restore_mana') {
          const restoreAmount = ce.valueMode === 'point_scale'
            ? Math.floor(finalPoint * (ce.scale ?? 1))
            : Math.floor(ce.fixedValue ?? 0);
          const beforeMp = targetEntity.mp;
          targetEntity.mp = Math.max(0, targetEntity.mp + restoreAmount);
          const actualRestore = targetEntity.mp - beforeMp;
          if (actualRestore > 0) {
            pushFloatingNumber(targetSide, actualRestore, 'mana', '+');
          }
          log(`<span class="text-blue-400">${label}【${card.name}】回复了 ${restoreAmount} 点魔力</span>`);
          hasEffect = true;
        } else if (ce.kind === 'cleanse') {
          const cleanseTargets = ce.cleanseTypes && ce.cleanseTypes.length > 0
            ? ce.cleanseTypes
            : targetEntity.effects.map((eff) => eff.type);
          for (const et of cleanseTargets) {
            removeEffect(targetEntity, et);
          }
          log(`<span class="text-cyan-300">${label}【${card.name}】清除了负面效果</span>`);
          hasEffect = true;
        }
      }

      return hasEffect;
    };

    if (card.type === CardType.FUNCTION) {
      if (card.id === 'burn_char_convert') {
        const burned = getEffectStacks(attacker, ET.BURN);
        syncCurrentPointForUi();
        if (burned > 0) {
          removeEffect(attacker, ET.BURN);
          attacker.mp += burned;
          pushFloatingNumber(source, burned, 'mana', '+');
          log(`<span class="text-blue-400">${label}【${card.name}】清除了 ${burned} 层燃烧并回复了 ${burned} 点魔力</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未检测到燃烧层数</span>`);
        }
        return;
      }

      // Process card effects (heal, apply_buff, restore_mana, cleanse)
      syncCurrentPointForUi();
      const hasEffect = applyCardEffects();
      if (!hasEffect) {
        // Fallback for special function cards (e.g. MP recovery)
        if (card.id === 'c5') {
          attacker.mp += 5;
          pushFloatingNumber(source, 5, 'mana', '+');
        }
        log(`${label}使用了【${card.name}】`);
      }
    } else if (card.type !== CardType.DODGE) {
      const burnStacksOnDefender = getEffectStacks(defender, ET.BURN);

      // Attack card: calculate damage through the full pipeline
      let cardForCalculation = card;
      const customDamage =
        card.id === 'burn_scorch_wind'
          ? Math.floor(finalPoint * 0.5) + burnStacksOnDefender
          : card.id === 'burn_detonation'
            ? Math.floor(burnStacksOnDefender)
            : null;

      if (customDamage !== null) {
        cardForCalculation = {
          ...card,
          damageLogic: { mode: 'fixed', value: Math.floor(customDamage) },
        };
      }

      const { damage, logs: dmgLogs } = calculateFinalDamage({
        finalPoint,
        card: cardForCalculation,
        attackerEffects: attacker.effects,
        defenderEffects: defender.effects,
        relicModifiers: NO_RELIC_MOD,
      });
      const { actualDamage, logs: applyLogs } = applyDamageToEntity(defender, damage, false);
      log(`${label}【${card.name}】点数${finalPoint}，造成 <span class="text-red-400 font-bold">${actualDamage}</span> 点伤害`);
      if (actualDamage > 0) {
        const damageKind: FloatingNumberKind = card.type === CardType.MAGIC ? 'magic' : 'physical';
        pushFloatingNumber(defenderSide, actualDamage, damageKind, '-');
      }

      // 攻击牌结算后同样触发附带效果（燃烧、易伤等）
      applyCardEffects();

      for (const dl of [...dmgLogs, ...applyLogs]) {
        log(`<span class="text-gray-500 text-[9px]">${dl}</span>`);
      }
    }
  };

  interface ActionEntry {
    source: 'player' | 'enemy';
    card: CardData;
    type: CardType;
    baseDice: number;
  }

  const queue: ActionEntry[] = [];
  let deferredEnemyAction: ActionEntry | null = null;
  if (pSuccess) queue.push({ source: 'player', card: pCard, type: pCard.type, baseDice: pDice });
  if (eSuccess) {
    const enemyAction: ActionEntry = { source: 'enemy', card: eCard, type: eCard.type, baseDice: eDice };
    if (pCard.traits.combo) {
      // 连击过程中，敌方行动延后到“连击结束”时再结算一次
      deferredEnemyAction = enemyAction;
    } else {
      queue.push(enemyAction);
    }
  }

  const typePriority = (t: CardType) => {
    if (t === CardType.FUNCTION) return 3;
    if (t === CardType.MAGIC) return 2;
    if (t === CardType.PHYSICAL) return 1;
    return 0;
  };

  queue.sort((a, b) => typePriority(b.type) - typePriority(a.type));

  for (const action of queue) {
    executeCard(action.source, action.card, action.baseDice);
    await wait(500);
  }

  // 连击：本次打出后，若带 draw 则补抽 1 张；并允许继续从剩余手牌出牌
  if (pCard.traits.combo) {
    if (pCard.traits.draw) {
      const { drawn, newDeck, newDiscard } = drawCards(1, combatState.value.playerDeck, combatState.value.discardPile);
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      combatState.value.playerHand = [...combatState.value.playerHand, ...drawn];
    }

    if (combatState.value.playerHand.length > 0 && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
      combatState.value.playerSelectedCard = null;
      combatState.value.phase = CombatPhase.PLAYER_INPUT;
      log('<span class="text-dungeon-gold/80">连击触发：可继续出牌</span>');
      return;
    }

    // 连击无法继续时，再补结算一次敌方行动
    if (deferredEnemyAction && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
      executeCard(deferredEnemyAction.source, deferredEnemyAction.card, deferredEnemyAction.baseDice);
      await wait(500);
    }
  }

  // End-of-turn effect processing (armor halving, stun clear, etc.)
  const pEndLogs = processOnTurnEnd(playerStats.value);
  const eEndLogs = processOnTurnEnd(enemyStats.value);
  for (const l of [...pEndLogs, ...eEndLogs]) {
    log(`<span class="text-gray-500 text-[9px]">${l}</span>`);
  }

  // Cleanup
  combatState.value.discardPile = [...combatState.value.discardPile, ...combatState.value.playerHand];
  combatState.value.playerHand = [];
  combatState.value.turn += 1;
  combatState.value.phase = CombatPhase.TURN_START;
};

// Watch for RESOLUTION phase
watch(
  () => combatState.value.phase,
  (phase) => {
    if (
      phase === CombatPhase.RESOLUTION &&
      combatState.value.playerSelectedCard &&
      combatState.value.enemyIntentCard &&
      !showClashAnimation.value
    ) {
      resolveCombat(
        combatState.value.playerSelectedCard,
        combatState.value.enemyIntentCard,
        combatState.value.playerBaseDice,
        combatState.value.enemyBaseDice,
      );
    }
  },
);

// Win/Lose check
watch(
  [() => playerStats.value.hp, () => enemyStats.value.hp],
  ([pHp, eHp]) => {
    if (pHp <= 0) emit('endCombat', false, playerStats.value);
    else if (eHp <= 0) emit('endCombat', true, playerStats.value);
  },
);
</script>

<style scoped>
.combat-float-number {
  animation-name: combat-float-up;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  line-height: 1;
}

@keyframes combat-float-up {
  0% {
    opacity: 0;
    transform: translate(-50%, 0) scale(0.85);
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -42px) scale(1.05);
  }
}

.combat-root :deep(.animate-float) {
  animation-duration: calc(6s / var(--combat-speed-multiplier));
}

.combat-root :deep(.animate-clash-left),
.combat-root :deep(.animate-clash-right),
.combat-root :deep(.animate-shatter) {
  animation-duration: calc(0.6s / var(--combat-speed-multiplier));
}

.combat-root :deep(.animate-shake) {
  animation-duration: calc(0.5s / var(--combat-speed-multiplier));
}
</style>

