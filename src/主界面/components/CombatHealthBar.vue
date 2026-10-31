<template>
  <div
    class="combat-health-bar"
    :class="{ 'combat-health-bar--compact': compact }"
    :data-health-bar-side="side"
  >
    <span v-if="!compact" class="combat-health-bar__label">HP</span>
    <div
      class="combat-health-bar__track"
      :class="{
        'combat-health-bar__track--impact': impactActive,
        'combat-health-bar__track--heavy-impact': heavyImpactActive,
      }"
      role="progressbar"
      :aria-label="ariaLabel"
      aria-valuemin="0"
      :aria-valuemax="ariaMax"
      :aria-valuenow="ariaNow"
    >
      <div
        v-if="swarmWidthRatio > RATIO_EPSILON"
        class="combat-health-bar__layer combat-health-bar__swarm"
        :style="swarmStyle"
        aria-hidden="true"
      ></div>
      <div
        v-if="damageTrailVisible"
        class="combat-health-bar__layer combat-health-bar__damage-trail"
        :style="damageTrailStyle"
        aria-hidden="true"
      ></div>
      <div
        v-if="armorWidthRatio > RATIO_EPSILON"
        class="combat-health-bar__layer combat-health-bar__armor"
        :style="armorStyle"
        aria-hidden="true"
      ></div>
      <div
        class="combat-health-bar__layer combat-health-bar__fill"
        :style="fillStyle"
        aria-hidden="true"
      ></div>
      <div
        v-if="healLeadVisible"
        class="combat-health-bar__layer combat-health-bar__heal-lead"
        :style="healLeadStyle"
        aria-hidden="true"
      ></div>
      <div
        v-if="poisonRatio > RATIO_EPSILON"
        class="combat-health-bar__layer combat-health-bar__poison"
        :style="poisonStyle"
        aria-hidden="true"
      ></div>
      <div
        class="combat-health-bar__flash"
        :class="{ 'combat-health-bar__flash--active': flashActive }"
        aria-hidden="true"
      ></div>
    </div>
    <span v-if="!compact" class="combat-health-bar__value">{{ valueText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

const RATIO_EPSILON = 0.0001;
// 血条反馈使用固定时长，不随战斗流程加速。
const DAMAGE_HOLD_MS = 350;
const DAMAGE_FOLLOW_MS = 450;
const HIT_SHAKE_MS = 270;
const HEAVY_HIT_SHAKE_MS = 420;
const HIT_FLASH_MS = 80;
const ARMOR_TRANSITION_MS = 180;
const SWARM_TRANSITION_MS = 300;
const POISON_TRANSITION_MS = 300;

const props = withDefaults(defineProps<{
  side: 'player' | 'enemy';
  hp: number;
  maxHp: number;
  armor?: number;
  swarmHp?: number | null;
  poisonAmount?: number;
  valueText?: string;
  impactToken?: number;
  compact?: boolean;
}>(), {
  armor: 0,
  swarmHp: null,
  poisonAmount: 0,
  valueText: '',
  impactToken: 0,
  compact: false,
});

const clampRatio = (value: number): number => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const hpRatio = (hp: number, maxHp: number): number => (
  maxHp > 0 ? clampRatio(hp / maxHp) : 0
);
const reducedMotion = typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

const displayHpRatio = ref(hpRatio(props.hp, props.maxHp));
const damageTrailRatio = ref<number | null>(null);
const healLeadRatio = ref<number | null>(null);
const healLeadStartRatio = ref(0);
const damageTrailVisible = ref(false);
const healLeadVisible = ref(false);
const damageTrailSettling = ref(false);
const healLeadSettling = ref(false);
const hpTransitioning = ref(false);
const impactActive = ref(false);
const heavyImpactActive = ref(false);
const flashActive = ref(false);
let damageHoldTimer: ReturnType<typeof setTimeout> | null = null;
let damageFollowTimer: ReturnType<typeof setTimeout> | null = null;
let healTimer: ReturnType<typeof setTimeout> | null = null;
let impactTimer: ReturnType<typeof setTimeout> | null = null;
let flashTimer: ReturnType<typeof setTimeout> | null = null;
let animationToken = 0;
let impactAnimationToken = 0;

const clearTimer = (timer: ReturnType<typeof setTimeout> | null): null => {
  if (timer) clearTimeout(timer);
  return null;
};

const clearDamageAnimation = () => {
  damageHoldTimer = clearTimer(damageHoldTimer);
  damageFollowTimer = clearTimer(damageFollowTimer);
  damageTrailSettling.value = false;
  damageTrailRatio.value = null;
  damageTrailVisible.value = false;
};

const clearHealAnimation = () => {
  healTimer = clearTimer(healTimer);
  healLeadRatio.value = null;
  healLeadStartRatio.value = 0;
  healLeadVisible.value = false;
  healLeadSettling.value = false;
  hpTransitioning.value = false;
};

const triggerImpact = (heavy = false) => {
  const token = ++impactAnimationToken;
  impactTimer = clearTimer(impactTimer);
  flashTimer = clearTimer(flashTimer);
  impactActive.value = false;
  heavyImpactActive.value = false;
  flashActive.value = false;
  requestAnimationFrame(() => {
    if (token !== impactAnimationToken) return;
    impactActive.value = true;
    heavyImpactActive.value = heavy;
    flashActive.value = true;
    impactTimer = setTimeout(() => {
      if (token !== impactAnimationToken) return;
      impactActive.value = false;
      heavyImpactActive.value = false;
    }, heavy ? HEAVY_HIT_SHAKE_MS : HIT_SHAKE_MS);
    flashTimer = setTimeout(() => {
      if (token === impactAnimationToken) flashActive.value = false;
    }, HIT_FLASH_MS);
  });
};

const resetVisualState = (nextHp: number, nextMaxHp: number) => {
  animationToken += 1;
  clearDamageAnimation();
  clearHealAnimation();
  displayHpRatio.value = hpRatio(nextHp, nextMaxHp);
};

const settleDamage = (token: number, nextRatio: number) => {
  if (token !== animationToken) return;
  damageTrailSettling.value = true;
  damageTrailRatio.value = nextRatio;
  damageFollowTimer = setTimeout(() => {
    if (token !== animationToken) return;
    damageTrailRatio.value = null;
    damageTrailVisible.value = false;
    damageTrailSettling.value = false;
  }, DAMAGE_FOLLOW_MS + 20);
};

const animateDamage = (previousRatio: number, nextRatio: number, heavy: boolean) => {
  animationToken += 1;
  const token = animationToken;
  clearHealAnimation();
  damageHoldTimer = clearTimer(damageHoldTimer);
  damageFollowTimer = clearTimer(damageFollowTimer);
  damageTrailSettling.value = false;
  const trailStart = Math.max(previousRatio, displayHpRatio.value, damageTrailRatio.value ?? 0);
  displayHpRatio.value = nextRatio;
  damageTrailRatio.value = trailStart > nextRatio + RATIO_EPSILON ? trailStart : null;
  damageTrailVisible.value = damageTrailRatio.value !== null;
  triggerImpact(heavy);
  if (!damageTrailVisible.value) return;
  if (reducedMotion) {
    clearDamageAnimation();
    return;
  }
  damageHoldTimer = setTimeout(() => settleDamage(token, nextRatio), DAMAGE_HOLD_MS);
};

const animateHeal = (nextRatio: number) => {
  animationToken += 1;
  const token = animationToken;
  clearDamageAnimation();
  const startRatio = displayHpRatio.value;
  if (nextRatio <= startRatio + RATIO_EPSILON || reducedMotion) {
    clearHealAnimation();
    displayHpRatio.value = nextRatio;
    return;
  }
  healLeadStartRatio.value = startRatio;
  healLeadRatio.value = nextRatio;
  healLeadVisible.value = true;
  hpTransitioning.value = true;
  requestAnimationFrame(() => {
    if (token !== animationToken) return;
    displayHpRatio.value = nextRatio;
    healLeadSettling.value = true;
    healLeadRatio.value = startRatio;
  });
  healTimer = setTimeout(() => {
    if (token !== animationToken) return;
    displayHpRatio.value = nextRatio;
    healLeadRatio.value = null;
    healLeadVisible.value = false;
    healLeadSettling.value = false;
    hpTransitioning.value = false;
  }, DAMAGE_FOLLOW_MS + 20);
};

watch(
  () => [props.hp, props.maxHp] as const,
  ([nextHp, nextMaxHp], [previousHp, previousMaxHp]) => {
    if (nextMaxHp !== previousMaxHp) {
      resetVisualState(nextHp, nextMaxHp);
      return;
    }
    const previousRatio = hpRatio(previousHp, previousMaxHp);
    const nextRatio = hpRatio(nextHp, nextMaxHp);
    if (nextRatio < previousRatio - RATIO_EPSILON) {
      animateDamage(previousRatio, nextRatio, previousHp - nextHp > nextMaxHp * 0.25);
    } else if (nextRatio > previousRatio + RATIO_EPSILON) {
      animateHeal(nextRatio);
    }
  },
  { flush: 'sync' },
);

watch(() => props.impactToken, (next, previous) => {
  if (next !== previous) triggerImpact();
}, { flush: 'sync' });

const armorRatio = computed(() => (
  props.maxHp > 0 ? Math.max(0, props.armor) / props.maxHp : 0
));
const swarmWidthRatio = computed(() => (
  props.maxHp > 0 ? clampRatio(Math.max(0, props.swarmHp ?? 0) / props.maxHp) : 0
));
const armorStartRatio = computed(() => displayHpRatio.value);
const armorWidthRatio = computed(() => Math.min(armorRatio.value, Math.max(0, 1 - armorStartRatio.value)));
const poisonRatio = computed(() => (
  props.maxHp > 0 ? clampRatio(Math.max(0, props.poisonAmount) / props.maxHp) : 0
));
const transitionDuration = `${DAMAGE_FOLLOW_MS}ms`;
const armorTransitionDuration = `${ARMOR_TRANSITION_MS}ms`;
const swarmTransitionDuration = `${SWARM_TRANSITION_MS}ms`;
const poisonTransitionDuration = `${POISON_TRANSITION_MS}ms`;

const fillStyle = computed(() => ({
  width: `${displayHpRatio.value * 100}%`,
  transitionDuration: hpTransitioning.value ? transitionDuration : '0ms',
}));
const damageTrailStyle = computed(() => ({
  left: `${displayHpRatio.value * 100}%`,
  width: `${Math.max(0, damageTrailRatio.value! - displayHpRatio.value) * 100}%`,
  transitionDuration: damageTrailSettling.value ? transitionDuration : '0ms',
}));
const healLeadStyle = computed(() => ({
  left: `${healLeadStartRatio.value * 100}%`,
  width: `${Math.max(0, healLeadRatio.value! - healLeadStartRatio.value) * 100}%`,
  transitionDuration: healLeadSettling.value ? transitionDuration : '0ms',
}));
const armorStyle = computed(() => ({
  left: `${armorStartRatio.value * 100}%`,
  width: `${armorWidthRatio.value * 100}%`,
  transitionDuration: reducedMotion ? '0ms' : armorTransitionDuration,
}));
const swarmStyle = computed(() => ({
  width: `${swarmWidthRatio.value * 100}%`,
  transitionDuration: reducedMotion ? '0ms' : swarmTransitionDuration,
}));
const poisonStyle = computed(() => ({
  width: `${poisonRatio.value * 100}%`,
  transitionDuration: reducedMotion ? '0ms' : poisonTransitionDuration,
}));
const ariaMax = computed(() => Math.max(0, Math.floor(props.maxHp)));
const ariaNow = computed(() => Math.max(0, Math.min(ariaMax.value, Math.floor(props.hp))));
const valueText = computed(() => props.valueText || `${ariaNow.value}/${ariaMax.value}`);
const ariaLabel = computed(() => `生命值 ${valueText.value}`);

onUnmounted(() => {
  animationToken += 1;
  impactAnimationToken += 1;
  damageHoldTimer = clearTimer(damageHoldTimer);
  damageFollowTimer = clearTimer(damageFollowTimer);
  healTimer = clearTimer(healTimer);
  impactTimer = clearTimer(impactTimer);
  flashTimer = clearTimer(flashTimer);
});
</script>

<style scoped>
.combat-health-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 0.375rem;
}

.combat-health-bar__label {
  width: 1.5rem;
  flex: none;
  color: #ff6666;
  font-size: 0.625rem;
  font-weight: 700;
}

.combat-health-bar__track {
  position: relative;
  flex: 1 1 auto;
  height: 0.625rem;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(127, 29, 29, 0.2);
  border-radius: 999px;
  background: #1a0a0a;
}

.combat-health-bar__layer,
.combat-health-bar__flash {
  position: absolute;
  inset-block: 0;
  border-radius: 0;
  pointer-events: none;
}

.combat-health-bar__layer {
  left: 0;
  overflow: hidden;
  transform-origin: left center;
  transition-property: left, width;
  transition-timing-function: cubic-bezier(0.22, 0.8, 0.25, 1);
}

.combat-health-bar__swarm {
  z-index: 5;
  background: linear-gradient(180deg, rgba(248, 113, 113, 0.18), rgba(251, 146, 146, 0.3));
  box-shadow: inset 0 0 0.25rem rgba(254, 202, 202, 0.22);
}

.combat-health-bar__damage-trail {
  z-index: 10;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(226, 232, 240, 0.82));
  box-shadow: 0 0 0.45rem rgba(255, 255, 255, 0.55);
}

.combat-health-bar__armor {
  z-index: 20;
  border-left: 1px solid rgba(255, 255, 255, 0.95);
  background:
    repeating-linear-gradient(-35deg, rgba(255, 255, 255, 0.58) 0 0.25rem, rgba(124, 58, 237, 0.32) 0.25rem 0.5rem),
    linear-gradient(180deg, #eef2ff 0%, #c4b5fd 52%, #64748b 100%);
  background-size: 240% 100%, 100% 100%;
  background-position: 0 0, 0 0;
  animation: combat-health-armor-sheen 1.35s linear infinite;
  box-shadow: inset 0 0 0.35rem rgba(255, 255, 255, 0.68), 0 0 0.42rem rgba(167, 139, 250, 0.58);
}

.combat-health-bar__fill {
  z-index: 30;
  background: linear-gradient(90deg, #cc2200, #ee3311);
}

.combat-health-bar__heal-lead {
  z-index: 40;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.88), rgba(134, 239, 172, 0.98));
  box-shadow: 0 0 0.45rem rgba(74, 222, 128, 0.75);
}

.combat-health-bar__poison {
  z-index: 50;
  opacity: 0.72;
  background-image:
    linear-gradient(180deg, rgba(16, 185, 129, 0.24), rgba(22, 163, 74, 0.72)),
    repeating-linear-gradient(-25deg, rgba(255, 255, 255, 0.18) 0 0.625rem, rgba(255, 255, 255, 0) 0.625rem 1.25rem);
  background-size: 100% 100%, 220% 100%;
  animation: combat-health-poison-wave 2.1s linear infinite;
}

.combat-health-bar__flash {
  z-index: 60;
  background: rgba(255, 255, 255, 0.95);
  opacity: 0;
}

.combat-health-bar__flash--active {
  animation: combat-health-hit-flash 0.08s linear both;
}

.combat-health-bar__value {
  width: 3.5rem;
  flex: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.625rem;
  text-align: right;
}

.combat-health-bar--compact {
  display: block;
  margin-bottom: 0;
}

.combat-health-bar--compact .combat-health-bar__track {
  width: 100%;
  height: 100%;
  min-height: 0.25rem;
  border: 0;
}

@keyframes combat-health-hit-shake {
  0% { transform: translate3d(0, 0, 0); }
  14% { transform: translate3d(-3px, 1px, 0); }
  28% { transform: translate3d(2.5px, -1px, 0); }
  44% { transform: translate3d(-2px, 0.5px, 0); }
  62% { transform: translate3d(1.25px, -0.25px, 0); }
  80% { transform: translate3d(-0.5px, 0, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

@keyframes combat-health-hit-flash {
  0% { opacity: 0; }
  15% { opacity: 0.9; }
  100% { opacity: 0; }
}

@keyframes combat-health-poison-wave {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 0, 220% 0; }
}

@keyframes combat-health-armor-sheen {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 0, 240% 0; }
}

.combat-health-bar__track--impact {
  animation: combat-health-hit-shake 0.27s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.combat-health-bar__track--heavy-impact {
  animation: combat-health-heavy-shake 0.42s cubic-bezier(0.26, 0.8, 0.22, 1) both;
}

@keyframes combat-health-heavy-shake {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  14% { transform: translate3d(-6px, 2px, 0) scale(1.04); }
  30% { transform: translate3d(5px, -2px, 0) scale(0.98); }
  48% { transform: translate3d(-4px, 1px, 0) scale(1.025); }
  68% { transform: translate3d(2px, -1px, 0) scale(0.995); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .combat-health-bar__layer,
  .combat-health-bar__flash,
  .combat-health-bar__track--impact,
  .combat-health-bar__track--heavy-impact,
  .combat-health-bar__swarm,
  .combat-health-bar__poison,
  .combat-health-bar__armor {
    animation: none;
    transition-duration: 0ms !important;
  }
}
</style>
