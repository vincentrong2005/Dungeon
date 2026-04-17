<template>
  <div
    ref="rootRef"
    class="relative"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @touchstart.passive="handleTouchStart"
    @touchend="clearLongPress"
    @touchcancel="clearLongPress"
    @touchmove.passive="handleTouchMove"
    @click="handleSurfaceClick"
  >
    <div
      class="relative overflow-hidden rounded-lg"
      :class="[surfaceClass, compact ? 'max-h-[44px] p-1.5 text-[10px]' : 'max-h-[76px] p-2 text-[10px]']"
    >
      <div
        class="overflow-y-auto whitespace-pre-wrap"
        :class="[centered ? 'flex items-center justify-center text-center' : '', descClass]"
      >
        <div>{{ description }}</div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showTooltip"
        ref="tooltipRef"
        class="card-rules-side-tooltip fixed z-[240] w-[220px] overflow-y-auto space-y-2"
        :style="tooltipStyle"
        @mouseenter="handleTooltipMouseEnter"
        @mouseleave="handleTooltipMouseLeave"
      >
        <div
          v-for="entry in glossaryEntries"
          :key="entry.key"
          class="card-rules-side-tooltip-entry"
          :class="entryToneClass(entry)"
        >
          <div class="card-rules-side-tooltip-head">
            <div class="card-rules-side-tooltip-name">{{ entry.label }}</div>
            <i
              v-if="entry.effectType && getEffectFontAwesomeClass(entry.effectType)"
              :class="[getEffectFontAwesomeClass(entry.effectType)!, 'card-rules-side-tooltip-icon']"
              :style="getEffectFontAwesomeStyle(entry.effectType)"
            ></i>
          </div>
          <div class="card-rules-side-tooltip-desc">{{ entry.description }}</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { collectCardGlossaryEntries, type CardGlossaryEntry } from '../battle/cardTextGlossary';
import { getEffectFontAwesomeClass, getEffectFontAwesomeStyle } from '../effectIconRegistry';
import type { CardManaDrainConfig, CardSelfDamageConfig, CardTraits } from '../types';

const props = withDefaults(
  defineProps<{
    title?: string;
    description: string;
    traits?: CardTraits | null;
    negativeEffect?: string | null;
    manaDrain?: number | CardManaDrainConfig | null;
    swarmAttack?: boolean;
    excape?: boolean;
    selfDamage?: number | CardSelfDamageConfig | null;
    compact?: boolean;
    centered?: boolean;
    surfaceClass?: string;
    descClass?: string;
  }>(),
  {
    title: '',
    traits: null,
    negativeEffect: null,
    manaDrain: null,
    swarmAttack: false,
    excape: false,
    selfDamage: null,
    compact: false,
    centered: true,
    surfaceClass: 'border border-white/10 bg-[#0d0d10]/85 text-gray-300 font-ui leading-tight',
    descClass: '',
  },
);

const rootRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const hoverVisible = ref(false);
const tooltipHoverVisible = ref(false);
const pinnedVisible = ref(false);
const suppressNextClick = ref(false);
const tooltipStyle = ref<Record<string, string>>({});

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let tooltipUpdateRaf = 0;

const TOOLTIP_WIDTH = 220;
const TOOLTIP_GAP = 10;
const VIEWPORT_MARGIN = 12;

const getBoundaryRect = (root: HTMLElement): DOMRect => {
  const boundary = root.closest('[data-card-tooltip-boundary]');
  if (boundary instanceof HTMLElement) {
    return boundary.getBoundingClientRect();
  }

  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
};

const glossaryEntries = computed(() => collectCardGlossaryEntries({
  title: props.title,
  description: props.description,
  traits: props.traits,
  negativeEffect: props.negativeEffect,
  manaDrain: props.manaDrain,
  swarmAttack: props.swarmAttack,
  excape: props.excape,
  selfDamage: props.selfDamage,
}));
const hasGlossary = computed(() => glossaryEntries.value.length > 0);
const showTooltip = computed(() => hasGlossary.value && (hoverVisible.value || tooltipHoverVisible.value || pinnedVisible.value));

const entryToneClass = (entry: CardGlossaryEntry): string => {
  switch (entry.polarity) {
    case 'buff':
      return 'card-rules-side-tooltip-entry--buff';
    case 'debuff':
      return 'card-rules-side-tooltip-entry--debuff';
    case 'mixed':
      return 'card-rules-side-tooltip-entry--mixed';
    case 'special':
      return 'card-rules-side-tooltip-entry--special';
    case 'trait':
    default:
      return 'card-rules-side-tooltip-entry--trait';
  }
};

const clearLongPressTimer = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

const clearLongPress = () => {
  clearLongPressTimer();
};

const updateTooltipPosition = () => {
  if (typeof window === 'undefined') return;
  const root = rootRef.value;
  const tooltip = tooltipRef.value;
  if (!root || !tooltip || !showTooltip.value) return;

  const rootRect = root.getBoundingClientRect();
  const boundaryRect = getBoundaryRect(root);
  const boundaryLeft = boundaryRect.left + VIEWPORT_MARGIN;
  const boundaryRight = boundaryRect.right - VIEWPORT_MARGIN;
  const boundaryTop = boundaryRect.top + VIEWPORT_MARGIN;
  const boundaryBottom = boundaryRect.bottom - VIEWPORT_MARGIN;
  const availableWidth = Math.max(160, boundaryRight - boundaryLeft);
  const tooltipWidth = Math.min(TOOLTIP_WIDTH, availableWidth);
  const maxHeight = Math.max(160, boundaryBottom - boundaryTop);
  const tooltipHeight = Math.min(tooltip.offsetHeight || 0, maxHeight);

  let left = rootRect.right + TOOLTIP_GAP;
  if (left + tooltipWidth > boundaryRight) {
    left = rootRect.left - tooltipWidth - TOOLTIP_GAP;
  }
  left = Math.min(
    Math.max(boundaryLeft, left),
    Math.max(boundaryLeft, boundaryRight - tooltipWidth),
  );

  let top = rootRect.top;
  if (top + tooltipHeight > boundaryBottom) {
    top = boundaryBottom - tooltipHeight;
  }
  top = Math.max(boundaryTop, top);

  tooltipStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(tooltipWidth)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
  };
};

const scheduleTooltipPosition = () => {
  if (typeof window === 'undefined') return;
  if (tooltipUpdateRaf) {
    cancelAnimationFrame(tooltipUpdateRaf);
  }
  tooltipUpdateRaf = window.requestAnimationFrame(() => {
    tooltipUpdateRaf = 0;
    updateTooltipPosition();
  });
};

const handleMouseEnter = () => {
  if (!hasGlossary.value) return;
  hoverVisible.value = true;
  scheduleTooltipPosition();
};

const handleMouseLeave = () => {
  hoverVisible.value = false;
};

const handleTooltipMouseEnter = () => {
  tooltipHoverVisible.value = true;
};

const handleTooltipMouseLeave = () => {
  tooltipHoverVisible.value = false;
};

const handleTouchStart = () => {
  if (!hasGlossary.value) return;
  clearLongPressTimer();
  longPressTimer = setTimeout(() => {
    pinnedVisible.value = true;
    suppressNextClick.value = true;
    scheduleTooltipPosition();
  }, 420);
};

const handleTouchMove = () => {
  clearLongPressTimer();
};

const handleSurfaceClick = (event: MouseEvent) => {
  if (!suppressNextClick.value) return;
  suppressNextClick.value = false;
  event.preventDefault();
  event.stopPropagation();
};

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!pinnedVisible.value) return;
  const root = rootRef.value;
  const tooltip = tooltipRef.value;
  if (!root || !(event.target instanceof Node)) return;
  if (root.contains(event.target) || tooltip?.contains(event.target)) return;
  pinnedVisible.value = false;
};

watch(showTooltip, async (visible) => {
  if (!visible) {
    tooltipHoverVisible.value = false;
    tooltipStyle.value = {};
    return;
  }
  await nextTick();
  updateTooltipPosition();
  scheduleTooltipPosition();
});

onMounted(() => {
  if (typeof document === 'undefined') return;
  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  document.addEventListener('scroll', scheduleTooltipPosition, true);
  window.addEventListener('resize', scheduleTooltipPosition);
});

onBeforeUnmount(() => {
  clearLongPressTimer();
  if (typeof window !== 'undefined' && tooltipUpdateRaf) {
    cancelAnimationFrame(tooltipUpdateRaf);
  }
  if (typeof document === 'undefined') return;
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  document.removeEventListener('scroll', scheduleTooltipPosition, true);
  window.removeEventListener('resize', scheduleTooltipPosition);
});
</script>

<style scoped>
.card-rules-side-tooltip-entry {
  border-radius: 0.6rem;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.42),
    inset 0 0 0 1px rgba(255, 214, 170, 0.06);
  padding: 0.7rem 0.8rem;
}

.card-rules-side-tooltip-entry--buff {
  border: 2px solid rgba(51, 110, 92, 0.96);
  background:
    linear-gradient(180deg, rgba(29, 69, 58, 0.97), rgba(15, 37, 33, 0.97)),
    rgba(13, 27, 23, 0.98);
}

.card-rules-side-tooltip-entry--debuff {
  border: 2px solid rgba(126, 71, 54, 0.95);
  background:
    linear-gradient(180deg, rgba(84, 42, 32, 0.96), rgba(42, 22, 18, 0.96)),
    rgba(33, 17, 15, 0.98);
}

.card-rules-side-tooltip-entry--trait {
  border: 2px solid rgba(96, 78, 135, 0.95);
  background:
    linear-gradient(180deg, rgba(58, 42, 91, 0.96), rgba(30, 22, 50, 0.96)),
    rgba(24, 18, 38, 0.98);
}

.card-rules-side-tooltip-entry--mixed {
  border: 2px solid rgba(132, 102, 47, 0.96);
  background:
    linear-gradient(180deg, rgba(92, 65, 25, 0.96), rgba(45, 31, 14, 0.96)),
    rgba(34, 24, 10, 0.98);
}

.card-rules-side-tooltip-entry--special {
  border: 2px solid rgba(92, 98, 116, 0.95);
  background:
    linear-gradient(180deg, rgba(48, 53, 69, 0.96), rgba(23, 26, 36, 0.96)),
    rgba(16, 18, 26, 0.98);
}

.card-rules-side-tooltip-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.card-rules-side-tooltip-name {
  color: rgba(255, 225, 187, 0.98);
  font-size: 13px;
  line-height: 1.15;
  font-weight: 800;
}

.card-rules-side-tooltip-icon {
  font-size: 14px;
  line-height: 1;
}

.card-rules-side-tooltip-desc {
  margin-top: 0.4rem;
  color: rgba(245, 235, 225, 0.95);
  font-size: 11px;
  line-height: 1.5;
}
</style>
