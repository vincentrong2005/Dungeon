<template>
  <div
    class="relative flex items-center justify-center drop-shadow-xl transition-all duration-300"
    :class="[rolling ? 'animate-bounce' : '', className]"
  >
    <div class="relative flex items-center justify-center" :class="sizeClass">
      <svg
        viewBox="0 0 100 100"
        class="absolute inset-0 size-full"
        style="filter: drop-shadow(0 5px 5px rgba(0, 0, 0, 0.6))"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
            <template v-if="color === 'gold'">
              <stop offset="0%" stop-color="#f9e6a0" />
              <stop offset="50%" stop-color="#d4af37" />
              <stop offset="100%" stop-color="#8a7122" />
            </template>
            <template v-else>
              <stop offset="0%" stop-color="#fca5a5" />
              <stop offset="50%" stop-color="#ef4444" />
              <stop offset="100%" stop-color="#7f1d1d" />
            </template>
          </linearGradient>
        </defs>
        <polygon
          points="50 2, 93 25, 93 75, 50 98, 7 75, 7 25"
          :fill="`url(#${gradientId})`"
          :stroke="borderColor"
          stroke-width="3"
        />
        <polygon
          points="50 8, 87 29, 87 71, 50 92, 13 71, 13 29"
          fill="none"
          :stroke="borderColor"
          stroke-width="1"
          opacity="0.4"
        />
      </svg>
      <span
        class="relative z-10 font-heading font-bold drop-shadow-sm"
        :class="[textColor, numberSizeClass]"
      >
        {{ displayValue }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value: number;
    rolling: boolean;
    color?: 'gold' | 'red';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }>(),
  {
    color: 'gold',
    size: 'md',
    className: '',
  },
);

const displayValue = ref(1);
let interval: ReturnType<typeof setInterval> | null = null;

const gradientId = `grad-${props.color}-${Math.random().toString(36).substr(2, 9)}`;

const sizeClass = computed(() => {
  const map = { sm: 'w-12 h-12', md: 'w-20 h-20', lg: 'w-32 h-32' };
  return map[props.size];
});

const numberSizeClass = computed(() => {
  const map = { sm: 'text-xl', md: 'text-3xl', lg: 'text-6xl' };
  return map[props.size];
});

const borderColor = computed(() => (props.color === 'gold' ? '#4d331f' : '#2a0505'));
const textColor = computed(() => (props.color === 'gold' ? 'text-[#2c1a0e]' : 'text-[#2c0e0e]'));

watch(
  () => [props.rolling, props.value],
  ([rolling]) => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    if (rolling) {
      interval = setInterval(() => {
        displayValue.value = Math.floor(Math.random() * 6) + 1;
      }, 80);
    } else {
      displayValue.value = props.value;
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>
