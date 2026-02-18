<template>
  <!-- Face Down Card -->
  <div
    v-if="faceDown"
    class="w-40 h-60 rounded-lg bg-dungeon-brown border-2 border-[#5c3a21] shadow-xl relative overflow-hidden group transition-transform duration-300 hover:-translate-y-2"
    :class="className"
  >
    <div class="absolute inset-2 flex items-center justify-center border border-[#4a2e1a] opacity-50">
      <div class="size-16 rounded-full border-2 border-[#5c3a21] opacity-30"></div>
    </div>
  </div>

  <!-- Face Up Card -->
  <div
    v-else
    class="relative w-40 h-60 rounded-lg shadow-2xl transition-all duration-300 transform bg-[#1a110d] border-2 cursor-pointer"
    :class="[
      typeColorClass,
      selected ? 'ring-4 ring-dungeon-gold -translate-y-6 scale-105 z-20' : 'hover:-translate-y-2 hover:z-10',
      disabled ? 'opacity-80 !cursor-default' : '',
      className,
    ]"
    @click="!disabled && $emit('click')"
  >
    <!-- Header -->
    <div class="absolute top-0 left-0 w-full p-2 flex justify-between items-start z-10">
      <div
        class="bg-black/60 px-2 py-0.5 rounded text-dungeon-gold font-bold font-heading text-xs border border-dungeon-gold/30"
        :class="card.type !== CardType.MAGIC ? 'opacity-0' : ''"
      >
        MP {{ card.cost }}
      </div>
      <div class="bg-black/60 p-1 rounded-full border border-white/10">
        <component :is="typeIcon" class="size-5" :class="typeIconColor" />
      </div>
    </div>

    <!-- Image Placeholder -->
    <div
      class="absolute top-8 left-2 right-2 h-24 bg-black/40 rounded border border-white/5 flex items-center justify-center overflow-hidden"
    >
      <div class="size-full opacity-60" :class="typeGradient"></div>
      <span class="absolute font-heading text-white/20 text-4xl select-none">
        {{ card.name[0] }}
      </span>
    </div>

    <!-- Content -->
    <div class="absolute bottom-0 left-0 w-full p-3 z-10 flex flex-col justify-end">
      <h3
        class="text-dungeon-paper font-heading font-bold text-sm tracking-wide mb-1 text-center drop-shadow-md"
      >
        {{ card.name }}
      </h3>
      <div
        class="bg-[#0f0f0f]/80 border border-dungeon-gold/20 p-2 rounded text-[10px] text-gray-300 font-ui leading-tight min-h-[50px] flex items-center justify-center text-center"
      >
        {{ card.description }}
      </div>
      <div class="mt-1 text-center text-dungeon-gold font-bold text-xs font-ui">
        {{ card.type }} · {{ card.value > 0 ? `强度 ${card.value}` : '特殊' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Footprints, RefreshCcw, Sparkles, Sword } from 'lucide-vue-next';
import { type CardData, CardType } from '../types';

const props = withDefaults(
  defineProps<{
    card: CardData;
    disabled?: boolean;
    selected?: boolean;
    faceDown?: boolean;
    isEnemy?: boolean;
    className?: string;
  }>(),
  {
    disabled: false,
    selected: false,
    faceDown: false,
    isEnemy: false,
    className: '',
  },
);

defineEmits<{
  click: [];
}>();

const typeColorClass = computed(() => {
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return 'border-red-900 bg-red-950/30';
    case CardType.MAGIC:
      return 'border-purple-900 bg-purple-950/30';
    case CardType.ACTION:
      return 'border-emerald-900 bg-emerald-950/30';
    case CardType.DODGE:
      return 'border-blue-900 bg-blue-950/30';
    default:
      return 'border-gray-700 bg-gray-800';
  }
});

const typeIcon = computed(() => {
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return Sword;
    case CardType.MAGIC:
      return Sparkles;
    case CardType.ACTION:
      return RefreshCcw;
    case CardType.DODGE:
      return Footprints;
    default:
      return Sword;
  }
});

const typeIconColor = computed(() => {
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return 'text-red-400';
    case CardType.MAGIC:
      return 'text-purple-400';
    case CardType.ACTION:
      return 'text-emerald-400';
    case CardType.DODGE:
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
});

const typeGradient = computed(() => {
  switch (props.card.type) {
    case CardType.PHYSICAL:
      return 'bg-gradient-to-tr from-red-900 to-black';
    case CardType.MAGIC:
      return 'bg-gradient-to-tr from-purple-900 to-black';
    case CardType.DODGE:
      return 'bg-gradient-to-tr from-blue-900 to-black';
    default:
      return 'bg-gradient-to-tr from-emerald-900 to-black';
  }
});
</script>
