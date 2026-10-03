<template>
  <!-- Face Down Card -->
  <div
    v-if="faceDown"
    class="dungeon-card relative w-40 h-60 shadow-xl transition-transform duration-300 hover:-translate-y-2"
    :class="className"
  >
    <CardFrameSkin :type="frameType" />
    <div class="card-face card-face--back">
      <CircleHelp class="size-8 text-white/35" />
    </div>
  </div>

  <!-- Face Up Card -->
  <div
    v-else
    class="dungeon-card relative w-40 h-60 cursor-pointer shadow-2xl transition-all duration-300"
    :class="[
      `card-tone--${frameType}`,
      isRareCard ? 'rare-card-glow' : '',
      hasGluttonyEnchant ? 'gluttony-card-glow' : '',
      selected ? 'ring-4 ring-dungeon-gold -translate-y-6 scale-105 z-20' : 'hover:-translate-y-2 hover:z-10',
      disabled ? 'opacity-80 !cursor-default' : '',
      className,
    ]"
    @click="!disabled && $emit('click')"
  >
    <CardFrameSkin :type="frameType" />
    <div class="card-face">
      <div class="card-face-heading">
        <span v-if="showManaBadge" class="card-face-cost">{{ card.manaCost }}</span>
        <h3 class="card-face-name" :title="displayName">{{ displayName }}</h3>
      </div>
      <div class="card-face-emblem">
        <component :is="typeIcon" class="card-face-icon" />
      </div>
      <CardRulesPanel
        class="card-face-rules"
        :title="displayName"
        :description="displayDescription"
        :traits="maskLevel === 'none' ? card.traits : null"
        :negative-effect="maskLevel === 'none' ? (card.negativeEffect ?? null) : null"
        :mana-drain="maskLevel === 'none' ? (card.manaDrain ?? null) : null"
        :swarm-attack="maskLevel === 'none' ? card.swarmAttack === true : false"
        :excape="maskLevel === 'none' ? card.excape === true : false"
        :self-damage="maskLevel === 'none' ? (card.selfDamage ?? null) : null"
        :gluttony-enchanted="hasGluttonyEnchant"
        surface-class="card-face-rules-surface"
      />
      <div class="card-face-type">{{ displayTypeText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleHelp, Footprints, RefreshCcw, Skull, Sparkles, Sword, Zap } from 'lucide-vue-next';
import { type CardData, CardType } from '../types';
import CardRulesPanel from './CardRulesPanel.vue';
import CardFrameSkin, { type CardFrameType } from './CardFrameSkin.vue';

const props = withDefaults(
  defineProps<{
    card: CardData;
    disabled?: boolean;
    selected?: boolean;
    faceDown?: boolean;
    isEnemy?: boolean;
    className?: string;
    maskLevel?: 'none' | 'partial' | 'full' | 'void';
  }>(),
  {
    disabled: false,
    selected: false,
    faceDown: false,
    isEnemy: false,
    className: '',
    maskLevel: 'none',
  },
);

defineEmits<{
  click: [];
}>();

const frameType = computed<CardFrameType>(() => {
  switch (props.card.type) {
    case CardType.MAGIC:
      return 'magic';
    case CardType.FUNCTION:
      return 'function';
    case CardType.ACTIVE:
      return 'active';
    case CardType.DODGE:
      return 'dodge';
    case CardType.CURSE:
      return 'curse';
    case CardType.PHYSICAL:
    default:
      return 'physical';
  }
});

const typeIcon = computed(() => {
  if (props.maskLevel === 'full' || props.maskLevel === 'void') {
    return CircleHelp;
  }
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return Sword;
    case CardType.MAGIC:
      return Sparkles;
    case CardType.FUNCTION:
      return RefreshCcw;
    case CardType.DODGE:
      return Footprints;
    case CardType.ACTIVE:
      return Zap;
    case CardType.CURSE:
      return Skull;
    default:
      return Sword;
  }
});

const displayName = computed(() => (props.maskLevel === 'none' ? props.card.name : '???'));
const displayDescription = computed(() => (props.maskLevel === 'none' ? props.card.description : '???'));
const displayTypeText = computed(() =>
  props.maskLevel === 'full' || props.maskLevel === 'void' ? '?' : props.card.type,
);
const showManaBadge = computed(
  () =>
    props.maskLevel === 'none' &&
    (props.card.type === CardType.MAGIC || props.card.type === CardType.ACTIVE) &&
    props.card.manaCost > 0,
);
const isRareCard = computed(() => props.maskLevel === 'none' && props.card.rarity === '稀有');
const hasGluttonyEnchant = computed(() => props.maskLevel === 'none' && props.card.gluttonyEnchanted === true);
</script>

<style scoped>
.dungeon-card {
  isolation: isolate;
  --card-accent: 240, 117, 99;
}

.card-tone--magic { --card-accent: 102, 183, 255; }
.card-tone--function { --card-accent: 243, 182, 76; }
.card-tone--dodge { --card-accent: 121, 204, 128; }
.card-tone--curse { --card-accent: 168, 110, 218; }
.card-tone--active { --card-accent: 218, 226, 244; }

.card-face {
  position: absolute;
  z-index: 2;
  inset: 22% 21% 24%;
  display: flex;
  min-height: 0;
  flex-direction: column;
  align-items: stretch;
  border-radius: 5px;
  background: linear-gradient(165deg, rgba(28, 26, 34, 0.93), rgba(9, 9, 15, 0.97));
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 10px rgba(var(--card-accent), 0.15);
  color: #f7f0e6;
}

.card-face--back {
  align-items: center;
  justify-content: center;
}

.card-face-heading {
  position: relative;
  display: flex;
  min-height: 31px;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border-bottom: 1px solid rgba(var(--card-accent), 0.36);
}

.card-face-cost {
  position: absolute;
  top: -5px;
  left: -7px;
  display: grid;
  width: 19px;
  height: 19px;
  place-items: center;
  border: 1px solid rgba(var(--card-accent), 0.7);
  border-radius: 50%;
  background: #171520;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.card-face-name {
  display: -webkit-box;
  overflow: hidden;
  max-height: 28px;
  margin: 0;
  text-align: center;
  overflow-wrap: anywhere;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  text-shadow: 0 1px 2px #000;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-face-emblem {
  display: grid;
  height: 37px;
  flex: 0 0 37px;
  place-items: center;
  background: radial-gradient(ellipse, rgba(var(--card-accent), 0.24), transparent 72%);
}

.card-face-icon {
  width: 23px;
  height: 23px;
  color: rgb(var(--card-accent));
  filter: drop-shadow(0 2px 3px #000);
}

.card-face-rules {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.card-face-rules :deep(.card-face-rules-surface) {
  height: 100%;
  max-height: none;
  padding: 2px 3px;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.27);
  color: #e7e0d7;
  font-size: 9px;
  line-height: 1.25;
}

.card-face-rules :deep(.card-face-rules-surface > div) {
  height: 100%;
  max-height: none;
  scrollbar-width: thin;
}

.card-face-type {
  flex: 0 0 14px;
  border-top: 1px solid rgba(var(--card-accent), 0.3);
  color: rgb(var(--card-accent));
  font-size: 9px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
}

.rare-card-glow::after {
  content: '';
  position: absolute;
  inset: 12% 13%;
  z-index: 5;
  border-radius: 10px;
  box-shadow: 0 0 18px rgba(250, 204, 21, 0.3);
  pointer-events: none;
}

.gluttony-card-glow {
  filter: drop-shadow(0 0 9px rgba(168, 85, 247, 0.55));
}

</style>
