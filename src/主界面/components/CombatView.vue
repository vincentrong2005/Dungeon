<template>
  <div
    class="w-full bg-black/80 text-dungeon-paper font-ui relative overflow-hidden select-none"
    :class="screenShake ? 'animate-shake' : ''"
    :style="{ aspectRatio: '16/9' }"
  >
    <!-- Background -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(60,40,30,0.4),_#000000_90%)] z-0"></div>
    <div
      class="absolute inset-0 opacity-30 z-0 mix-blend-overlay bg-[length:200px] bg-repeat"
      style="background-image: url('https://www.transparenttextures.com/patterns/dark-matter.png')"
    ></div>

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
          <DungeonDice :value="combatState.enemyDice" :rolling="isRolling" color="red" size="md" />
        </div>

        <!-- Enemy Portrait -->
        <div class="relative w-full h-full">
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-12 bg-black/80 blur-xl"></div>
          <div
            class="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-96 bg-[#1a0f08] border-2 border-red-900/50 rounded-lg shadow-[0_0_40px_rgba(153,27,27,0.3)] flex items-center justify-center overflow-hidden"
          >
            <Skull class="w-48 h-48 text-red-900/30" />
            <div class="absolute inset-0 bg-gradient-to-t from-red-950/80 to-transparent"></div>
          </div>
        </div>

        <!-- Enemy Status Bar -->
        <div class="mt-4 w-72 bg-black/80 border border-red-900/30 p-3 rounded shadow-lg backdrop-blur-sm z-10">
          <div class="flex justify-between text-sm text-red-400 font-bold mb-1">
            <span>深渊潜行者</span>
            <span>{{ enemyStats.hp }}/{{ enemyStats.maxHp }} HP</span>
          </div>
          <div class="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
            <div
              class="h-full bg-red-700 transition-all duration-500"
              :style="{ width: `${(enemyStats.hp / enemyStats.maxHp) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Player Position: Bottom Left -->
      <div class="absolute bottom-[20%] left-[5%] md:bottom-[25%] md:left-[10%] w-64 h-80 flex flex-col items-center justify-end z-20">
        <!-- Player Dice -->
        <div v-if="!showClashAnimation" class="absolute -top-24 left-1/2 -translate-x-1/2 z-20 animate-float" style="animation-delay: 1s">
          <DungeonDice :value="combatState.playerDice" :rolling="isRolling" color="gold" size="md" />
        </div>

        <!-- Player Portrait -->
        <div class="relative w-full h-full">
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/80 blur-xl"></div>
          <div
            class="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-64 bg-[#1a0f08] border-2 border-dungeon-gold/50 rounded-lg shadow-[0_0_30px_rgba(212,175,55,0.2)] flex items-center justify-center overflow-hidden"
          >
            <div class="size-20 bg-dungeon-gold/20 blur-2xl rounded-full"></div>
            <div class="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-dungeon-gold/10 to-transparent"></div>
          </div>
        </div>

        <!-- Player Status Bar -->
        <div class="mt-2 w-60 bg-black/90 border border-dungeon-gold/50 p-2 rounded shadow-xl backdrop-blur-sm z-10">
          <div class="flex justify-between text-xs text-dungeon-gold font-bold mb-1">
            <span>冒险者</span>
            <div class="flex space-x-3">
              <span class="text-dungeon-blood drop-shadow-sm">{{ playerStats.hp }} HP</span>
              <span class="text-blue-400 drop-shadow-sm">{{ playerStats.mp }} MP</span>
            </div>
          </div>
          <div class="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden mb-1">
            <div
              class="h-full bg-dungeon-blood transition-all duration-500"
              :style="{ width: `${(playerStats.hp / playerStats.maxHp) * 100}%` }"
            ></div>
          </div>
          <div class="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-600 transition-all duration-500"
              :style="{ width: `${(playerStats.mp / playerStats.maxMp) * 100}%` }"
            ></div>
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
            :class="shatteringTarget === 'player' ? 'animate-shatter' : 'animate-clash-left'"
          >
            <DungeonDice
              :value="combatState.playerDice"
              :rolling="false"
              color="gold"
              size="lg"
              class-name="shadow-[0_0_50px_#d4af37]"
            />
          </div>

          <!-- Enemy Dice Flying In -->
          <div
            class="absolute left-1/2 ml-[-0.5rem] transition-all duration-300"
            :class="shatteringTarget === 'enemy' ? 'animate-shatter' : 'animate-clash-right'"
          >
            <DungeonDice
              :value="combatState.enemyDice"
              :rolling="false"
              color="red"
              size="lg"
              class-name="shadow-[0_0_50px_#ff0000]"
            />
          </div>
        </div>

        <!-- Clash Result Banner -->
        <div
          v-if="clashResult && !showClashAnimation"
          class="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/80 py-6 border-y border-dungeon-gold/50 backdrop-blur-md flex flex-col items-center justify-center z-50"
        >
          <h1
            class="text-4xl font-heading mb-2"
            :class="
              clashResult.winner === 'player'
                ? 'text-green-400'
                : clashResult.winner === 'enemy'
                  ? 'text-red-500'
                  : 'text-gray-400'
            "
          >
            {{
              clashResult.winner === 'player'
                ? '>>> 压制成功 <<<'
                : clashResult.winner === 'enemy'
                  ? '>>> 遭到反击 <<<'
                  : '>>> 势均力敌 <<<'
            }}
          </h1>
          <p class="text-dungeon-paper font-ui tracking-wider">{{ clashResult.message }}</p>
        </div>
      </div>

      <!-- Bottom Bar: Hand & Piles -->
      <div
        class="pointer-events-auto min-h-[180px] w-full bg-gradient-to-t from-black via-black/80 to-transparent flex items-end justify-center pb-8 px-4 space-x-4 relative"
      >
        <!-- Center: Hand Cards -->
        <div class="flex space-x-6 items-end mb-4 z-40">
          <div
            v-for="(card, idx) in combatState.playerHand"
            :key="`${card.id}-${idx}`"
            class="transition-all duration-500 origin-bottom"
            :class="handCardClass(card)"
          >
            <DungeonCard
              :card="card"
              :disabled="combatState.phase !== CombatPhase.PLAYER_ACTION && combatState.playerSelectedCard?.id !== card.id"
              @click="handleCardSelect(card)"
            />
          </div>
        </div>

        <!-- Right Corner: Deck & Discard Piles -->
        <div class="absolute right-6 bottom-6 flex space-x-3 z-50">
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

    <!-- Log Feed Overlay -->
    <div class="absolute top-4 left-4 z-40 w-64 pointer-events-none opacity-80">
      <div class="space-y-1 text-[10px] font-mono text-gray-400">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          v-for="(l, i) in combatState.logs"
          :key="i"
          class="bg-black/50 p-1 rounded border-l-2 border-gray-700"
          v-html="l"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Layers, Skull, Trash2, X as XIcon } from 'lucide-vue-next';
import { ENEMY_DECK, INITIAL_ENEMY_STATS, STARTING_DECK } from '../constants';
import { type CardData, type CombatState, type EntityStats, CardType, CombatPhase } from '../types';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';

const props = defineProps<{
  initialPlayerStats: EntityStats;
}>();

const emit = defineEmits<{
  endCombat: [win: boolean, finalStats: EntityStats];
}>();

// --- State ---
const playerStats = ref<EntityStats>({ ...props.initialPlayerStats });
const enemyStats = ref<EntityStats>({ ...INITIAL_ENEMY_STATS });

const combatState = ref<CombatState>({
  turn: 1,
  phase: CombatPhase.INIT,
  playerDice: 1,
  enemyDice: 1,
  playerHand: [],
  playerDeck: [...STARTING_DECK].sort(() => Math.random() - 0.5),
  discardPile: [],
  enemyIntentCard: null,
  playerSelectedCard: null,
  logs: ['战斗开始！遭遇了一只 <span class="text-red-500 font-bold">深渊潜行者</span>'],
});

const isRolling = ref(false);
const clashResult = ref<{ message: string; winner: 'player' | 'enemy' | 'tie' | null } | null>(null);
const showClashAnimation = ref(false);
const shatteringTarget = ref<'player' | 'enemy' | null>(null);
const screenShake = ref(false);
const overlayOpen = ref<'deck' | 'discard' | null>(null);

// --- Helpers ---
const log = (msg: string) => {
  combatState.value.logs = [msg, ...combatState.value.logs].slice(0, 5);
};

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
  const isSelected = selected?.id === card.id;
  const isNotSelected = selected && !isSelected;
  const isActionPhase = combatState.value.phase === CombatPhase.PLAYER_ACTION;

  return [
    isSelected ? '-translate-y-12 scale-110 z-50 ring-2 ring-dungeon-gold rounded-lg shadow-[0_0_30px_#d4af37]' : '',
    isNotSelected ? 'opacity-30 scale-90 translate-y-8 grayscale' : 'hover:scale-110 hover:-translate-y-4 hover:z-50',
    !isActionPhase && !isSelected ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer',
  ];
};

// --- Phase Management ---

const startTurn = () => {
  combatState.value.phase = CombatPhase.ROLL_PHASE;
  combatState.value.playerSelectedCard = null;
  combatState.value.enemyIntentCard = null;
  isRolling.value = true;
  shatteringTarget.value = null;
  showClashAnimation.value = false;
  clashResult.value = null;

  setTimeout(() => {
    const pRoll = Math.floor(Math.random() * (playerStats.value.maxDice - playerStats.value.minDice + 1)) + playerStats.value.minDice;
    const eRoll = Math.floor(Math.random() * (enemyStats.value.maxDice - enemyStats.value.minDice + 1)) + enemyStats.value.minDice;

    isRolling.value = false;
    combatState.value.playerDice = pRoll;
    combatState.value.enemyDice = eRoll;
    combatState.value.phase = CombatPhase.DRAW_PHASE;
    log(`掷骰结果：我方 [${pRoll}] vs 敌方 [${eRoll}]`);
  }, 1500);
};

// Watch for INIT phase
watch(
  () => combatState.value.phase,
  (phase) => {
    if (phase === CombatPhase.INIT) {
      setTimeout(() => startTurn(), 1000);
    }
  },
  { immediate: true },
);

// Watch for DRAW_PHASE
watch(
  [() => combatState.value.phase, isRolling],
  ([phase, rolling]) => {
    if (phase === CombatPhase.DRAW_PHASE && !rolling) {
      const eCard = ENEMY_DECK[Math.floor(Math.random() * ENEMY_DECK.length)];
      const { drawn, newDeck, newDiscard } = drawCards(3, combatState.value.playerDeck, combatState.value.discardPile);

      combatState.value.enemyIntentCard = eCard;
      combatState.value.playerHand = drawn;
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      combatState.value.phase = CombatPhase.PLAYER_ACTION;
    }
  },
);

// Handle Card Select
const handleCardSelect = (card: CardData) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_ACTION) return;

  if (card.type === CardType.MAGIC) {
    if (playerStats.value.mp < card.cost) {
      log('<span class="text-red-400">魔力不足！</span>');
      return;
    }
    playerStats.value.mp -= card.cost;
  }

  combatState.value.playerSelectedCard = card;
  combatState.value.phase = CombatPhase.RESOLUTION;
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

  let pSuccess = true;
  let eSuccess = true;
  let resultMsg = '';
  let clashWinner: 'player' | 'enemy' | 'tie' | null = null;

  if (shouldClash) {
    showClashAnimation.value = true;
    await new Promise((r) => setTimeout(r, 600));

    screenShake.value = true;
    setTimeout(() => (screenShake.value = false), 500);

    if (pCard.type === eCard.type) {
      if (pDice > eDice) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '拼点胜利！';
      } else if (eDice > pDice) {
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
      if (eDice > pDice) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '闪避成功！';
      } else {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '闪避失败！';
      }
    } else if (eCard.type === CardType.DODGE) {
      if (pDice > eDice) {
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
      shatteringTarget.value = 'player';
      setTimeout(() => (shatteringTarget.value = 'enemy'), 100);
    }

    clashResult.value = { message: resultMsg, winner: clashWinner };

    await new Promise((r) => setTimeout(r, 1500));
    showClashAnimation.value = false;
  } else {
    await new Promise((r) => setTimeout(r, 500));
    log('<span class="text-gray-400">双方卡牌互不干扰，直接结算。</span>');
    pSuccess = true;
    eSuccess = true;
  }

  // Execution Phase
  const executeCard = (source: 'player' | 'enemy', card: CardData) => {
    if (source === 'player') {
      if (card.type === CardType.ACTION) {
        if (card.id === 'c5') playerStats.value.mp = Math.min(playerStats.value.maxMp, playerStats.value.mp + 5);
        log(`我方使用了【${card.name}】`);
      } else if (card.type !== CardType.DODGE) {
        enemyStats.value.hp = Math.max(0, enemyStats.value.hp - card.value);
        log(`我方【${card.name}】造成 ${card.value} 点伤害`);
      }
    } else {
      if (card.type === CardType.ACTION) {
        log(`敌方使用了【${card.name}】`);
      } else if (card.type !== CardType.DODGE) {
        playerStats.value.hp = Math.max(0, playerStats.value.hp - card.value);
        log(`敌方【${card.name}】造成 ${card.value} 点伤害`);
      }
    }
  };

  interface ActionEntry {
    source: 'player' | 'enemy';
    card: CardData;
    type: CardType;
  }

  const queue: ActionEntry[] = [];
  if (pSuccess) queue.push({ source: 'player', card: pCard, type: pCard.type });
  if (eSuccess) queue.push({ source: 'enemy', card: eCard, type: eCard.type });

  const typePriority = (t: CardType) => {
    if (t === CardType.ACTION) return 3;
    if (t === CardType.MAGIC) return 2;
    if (t === CardType.PHYSICAL) return 1;
    return 0;
  };

  queue.sort((a, b) => typePriority(b.type) - typePriority(a.type));

  for (const action of queue) {
    executeCard(action.source, action.card);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Cleanup
  combatState.value.discardPile = [...combatState.value.discardPile, ...combatState.value.playerHand];
  combatState.value.playerHand = [];
  combatState.value.turn += 1;
  combatState.value.phase = CombatPhase.INIT;
};

// Watch for RESOLUTION phase
watch(
  () => combatState.value.phase,
  (phase) => {
    if (
      phase === CombatPhase.RESOLUTION &&
      combatState.value.playerSelectedCard &&
      combatState.value.enemyIntentCard &&
      !showClashAnimation.value &&
      !clashResult.value
    ) {
      resolveCombat(
        combatState.value.playerSelectedCard,
        combatState.value.enemyIntentCard,
        combatState.value.playerDice,
        combatState.value.enemyDice,
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
