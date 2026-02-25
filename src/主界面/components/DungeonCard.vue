<template>
  <!-- Face Down Card -->
  <div
    v-if="faceDown"
    class="w-40 h-60 rounded-xl bg-[#252030] border-2 border-[#3a3040] shadow-xl relative overflow-hidden group transition-transform duration-300 hover:-translate-y-2"
    :class="className"
  >
    <div class="absolute inset-2 flex items-center justify-center border border-[#4a2e1a] opacity-50">
      <div class="size-16 rounded-full border-2 border-[#5c3a21] opacity-30"></div>
    </div>
  </div>

  <!-- Face Up Card -->
  <div
    v-else
    class="relative w-40 h-60 rounded-xl shadow-2xl transition-all duration-300 transform bg-[#16121e] border-2 cursor-pointer"
    :class="[
      typeColorClass,
      isRareCard ? 'rare-card-glow' : '',
      selected ? 'ring-4 ring-dungeon-gold -translate-y-6 scale-105 z-20' : 'hover:-translate-y-2 hover:z-10',
      disabled ? 'opacity-80 !cursor-default' : '',
      className,
    ]"
    @click="!disabled && $emit('click')"
  >
    <!-- Header -->
    <div class="absolute top-0 left-0 w-full p-2 flex justify-between items-start z-10">
      <div
        class="w-6 h-6 rounded-full bg-purple-700/80 text-white font-bold text-[10px] flex items-center justify-center border border-purple-400/40 shadow-md"
        :class="!showManaBadge ? 'opacity-0' : ''"
      >
        {{ card.manaCost }}
      </div>
      <div class="bg-black/60 p-1 rounded-full border border-white/10">
        <component :is="typeIcon" class="size-5" :class="typeIconColor" />
      </div>
    </div>

    <!-- Image Placeholder -->
    <div
      class="absolute top-8 left-2 right-2 h-24 bg-black/50 rounded-lg border border-white/5 flex items-center justify-center overflow-hidden"
    >
      <div class="size-full opacity-60" :class="typeGradient"></div>
      <span class="absolute font-heading text-white/20 text-4xl select-none">
        {{ displayInitial }}
      </span>
    </div>

    <!-- Content -->
    <div class="absolute bottom-0 left-0 w-full p-3 z-10 flex flex-col justify-end">
      <h3
        class="text-dungeon-paper font-heading font-bold text-sm tracking-wide mb-1 text-center drop-shadow-md"
      >
        {{ displayName }}
      </h3>
      <div
        class="bg-[#0d0d10]/85 border border-white/10 p-2 rounded-lg text-[10px] text-gray-300 font-ui leading-tight min-h-[50px] flex items-center justify-center text-center"
      >
        {{ displayDescription }}
      </div>
      <div class="mt-1 text-center text-white/50 font-bold text-[10px] font-ui tracking-wider">
        {{ displayTypeText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleHelp, Footprints, RefreshCcw, Skull, Sparkles, Sword } from 'lucide-vue-next';
import { type CardData, CardType } from '../types';

const props = withDefaults(
  defineProps<{
    card: CardData;
    disabled?: boolean;
    selected?: boolean;
    faceDown?: boolean;
    isEnemy?: boolean;
    className?: string;
    maskLevel?: 'none' | 'partial' | 'full';
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

const typeColorClass = computed(() => {
  if (props.maskLevel === 'full') {
    return 'border-gray-600 bg-gray-900/40';
  }
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return 'border-red-900 bg-red-950/30';
    case CardType.MAGIC:
      return 'border-purple-900 bg-purple-950/30';
    case CardType.FUNCTION:
      return 'border-yellow-800 bg-yellow-950/30';
    case CardType.DODGE:
      return 'border-emerald-900 bg-emerald-950/30';
    case CardType.CURSE:
      return 'border-black bg-black/70';
    default:
      return 'border-gray-700 bg-gray-800';
  }
});

const typeIcon = computed(() => {
  if (props.maskLevel === 'full') {
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
    case CardType.CURSE:
      return Skull;
    default:
      return Sword;
  }
});

const typeIconColor = computed(() => {
  if (props.maskLevel === 'full') {
    return 'text-gray-400';
  }
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return 'text-red-400';
    case CardType.MAGIC:
      return 'text-purple-400';
    case CardType.FUNCTION:
      return 'text-yellow-400';
    case CardType.DODGE:
      return 'text-emerald-400';
    case CardType.CURSE:
      return 'text-zinc-300';
    default:
      return 'text-gray-400';
  }
});

const cardStrengthLabel = computed(() => {
  const dl = props.card.damageLogic;
  switch (dl.mode) {
    case 'relative': return `倍率 ${dl.scale ?? 1}x`;
    case 'fixed':    return dl.value ? `固伤 ${dl.value}` : '特殊';
    case 'mixed':    return `${dl.baseValue ?? 0}+${dl.scale ?? 1}x`;
    default:         return '特殊';
  }
});

const typeGradient = computed(() => {
  if (props.maskLevel === 'full') {
    return 'bg-gradient-to-tr from-gray-700 to-black';
  }
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return 'bg-gradient-to-tr from-red-900 to-black';
    case CardType.MAGIC:
      return 'bg-gradient-to-tr from-purple-900 to-black';
    case CardType.FUNCTION:
      return 'bg-gradient-to-tr from-yellow-900 to-black';
    case CardType.DODGE:
      return 'bg-gradient-to-tr from-emerald-900 to-black';
    case CardType.CURSE:
      return 'bg-gradient-to-tr from-zinc-900 to-black';
    default:
      return 'bg-gradient-to-tr from-gray-800 to-black';
  }
});

const displayName = computed(() => (props.maskLevel === 'none' ? props.card.name : '???'));
const displayDescription = computed(() => (props.maskLevel === 'none' ? props.card.description : '???'));
const displayTypeText = computed(() => (props.maskLevel === 'full' ? '?' : props.card.type));
const displayInitial = computed(() => (displayName.value[0] ?? '?'));
const showManaBadge = computed(() => (
  props.maskLevel !== 'full'
  && props.card.type === CardType.MAGIC
  && props.card.manaCost > 0
));
const isRareCard = computed(() => props.card.rarity === '稀有');
</script>

<style scoped>
.rare-card-glow {
  position: relative;
}

.rare-card-glow::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: 1px solid rgba(250, 204, 21, 0.48);
  box-shadow:
    0 0 8px rgba(250, 204, 21, 0.4),
    0 0 16px rgba(245, 158, 11, 0.24);
  pointer-events: none;
}
</style>
