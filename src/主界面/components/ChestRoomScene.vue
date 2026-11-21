<template>
  <div
    ref="rootEl"
    class="chest-room"
    :class="rootClasses"
    @contextmenu.prevent="handleContextMenu"
    @touchstart.passive="handleTouchStart"
    @touchmove.passive="handleTouchMove"
    @touchend="cancelLongPress"
    @touchcancel="cancelLongPress"
  >
    <div ref="stageEl" class="chest-room__stage">
      <img class="chest-room__bg" :src="CHEST_ROOM_ASSETS.background" alt="" draggable="false" />
      <div class="chest-room__ambient" aria-hidden="true"></div>

      <div class="chest-room__chest">
        <button
          v-if="stage === 'closed'"
          type="button"
          class="chest-room__hit"
          aria-label="开启宝箱"
          :disabled="rolling || phase !== 'idle'"
          @click="handleOpenClick"
        ></button>
        <div class="chest-room__shadow" aria-hidden="true"></div>
        <div class="chest-room__mouth-glow" aria-hidden="true"></div>
        <div ref="bodyEl" class="chest-room__body">
          <div class="chest-room__sprites">
            <img
              v-for="sprite in SPRITES"
              :key="sprite.key"
              class="chest-room__sprite"
              :class="{ 'is-shown': shownSprite === sprite.key }"
              :src="sprite.src"
              alt=""
              draggable="false"
            />
          </div>
          <span class="chest-room__seam" aria-hidden="true"></span>
          <span class="chest-room__eyes" :style="{ '--risk': String(riskLevel) }" aria-hidden="true">
            <i></i>
            <i></i>
          </span>
        </div>
        <img
          v-if="burstOn"
          :key="`burst-${burstKey}`"
          class="chest-room__burst"
          :class="{ 'is-red': burstRed }"
          :src="CHEST_ROOM_ASSETS.burst"
          alt=""
          aria-hidden="true"
        />
        <template v-if="dustOn">
          <img
            v-for="(src, i) in CHEST_ROOM_ASSETS.dust"
            :key="`dust-${dustKey}-${i}`"
            class="chest-room__dust"
            :data-index="i"
            :src="src"
            alt=""
            aria-hidden="true"
          />
        </template>
      </div>

      <div v-if="orbs.length > 0" class="chest-room__rewards">
        <div
          v-for="orb in orbs"
          :key="orb.key"
          class="chest-orb"
          :class="[
            orb.toneClass,
            {
              'is-waiting': phase === 'opening' && !orbsLaunching,
              'is-launching': phase === 'opening' && orbsLaunching,
              'is-returning': phase === 'closing',
              'is-collected': orb.collected,
              'is-flying': orb.collected && flyingFlags[orb.index],
            },
          ]"
          :style="orb.style"
        >
          <div class="chest-orb__track-x">
            <div class="chest-orb__track-y">
              <span class="chest-orb__pillar" aria-hidden="true"></span>
              <span class="chest-orb__halo" aria-hidden="true"></span>
              <div class="chest-orb__float">
                <button
                  type="button"
                  class="chest-orb__btn"
                  :class="{ 'is-awaiting-confirm': isAwaiting(orb.index) }"
                  :aria-label="`${orb.name}，${orb.rarity}圣遗物`"
                  :disabled="collecting || orb.collected || phase !== 'idle'"
                  @click.stop="emit('reward-click', $event, orb.index)"
                  @mouseenter="emit('reward-enter', $event, orb.index)"
                  @focus="emit('reward-enter', $event, orb.index)"
                  @mouseleave="emit('reward-leave')"
                  @blur="emit('reward-leave')"
                  @touchstart.stop.passive="emit('reward-touchstart', $event, orb.index)"
                  @touchend.stop="emit('reward-touchend')"
                  @touchcancel.stop="emit('reward-touchend')"
                >
                  <img class="chest-orb__img" :src="orb.src" alt="" draggable="false" />
                </button>
              </div>
              <span v-if="isAwaiting(orb.index)" class="chest-orb__confirm">再次点击获取</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chest-room__vignette" aria-hidden="true"></div>
      <div
        v-if="burstOn"
        :key="`flash-${flashKey}`"
        class="chest-room__flash"
        :class="{ 'is-red': burstRed }"
        aria-hidden="true"
      ></div>
    </div>

    <svg
      v-if="pressRing"
      class="chest-room__press-ring"
      :style="{ left: `${pressRing.x}px`, top: `${pressRing.y}px` }"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <circle class="chest-room__press-track" cx="32" cy="32" r="26" />
      <circle class="chest-room__press-fill" cx="32" cy="32" r="26" />
    </svg>

    <Transition name="chest-room-fade">
      <button
        v-if="completionReady && stage === 'opened' && phase === 'idle'"
        type="button"
        class="chest-room__finish"
        :disabled="finishDisabled"
        @click="emit('finish')"
      >
        打开地图，选择下一目的地
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { RelicData } from '../battle/relicRegistry';
import { CHEST_ROOM_ASSETS } from '../chestRoomAssets';

type ChestStage = 'closed' | 'opened' | 'mimic';
type ScenePhase = 'idle' | 'opening' | 'closing' | 'mimic';

const props = defineProps<{
  stage: ChestStage;
  rewards: readonly RelicData[];
  collectedFlags: readonly boolean[];
  rewardVisible: boolean;
  closeCount: number;
  rolling: boolean;
  collecting: boolean;
  completionReady: boolean;
  finishDisabled: boolean;
  isTouch: boolean;
  pendingRewardIndex: number | null;
}>();

const emit = defineEmits<{
  open: [];
  'close-request': [];
  finish: [];
  'reward-click': [event: MouseEvent, index: number];
  'reward-enter': [event: MouseEvent | FocusEvent, index: number];
  'reward-leave': [];
  'reward-touchstart': [event: TouchEvent, index: number];
  'reward-touchend': [];
}>();

const SPRITES = [
  { key: 'closed', src: CHEST_ROOM_ASSETS.chestClosed },
  { key: 'opened', src: CHEST_ROOM_ASSETS.chestOpened },
  { key: 'mimic', src: CHEST_ROOM_ASSETS.chestMimic },
] as const;

/* ---------- 场景坐标（相对 16:9 舞台，单位：宽 cqw / 高 cqh） ---------- */
/** 宝箱口（奖励飞出 / 收回的起点） */
const CHEST_MOUTH = { x: 50.5, y: 40 };
/** 奖励悬停高度 */
const ORB_Y = 69;
/** 领取后飞向左下角状态栏 */
const ORB_COLLECT_TARGET = { x: 5, y: 95 };
const ORB_LAUNCH_STAGGER_MS = 140;
const ORB_LAUNCH_MS = 900;
const LONG_PRESS_MS = 2000;
/** 关闭刷新次数 → 缝隙里红眼的可见度（宝箱怪风险提示） */
const RISK_LEVELS = [0, 0.25, 0.5, 0.75, 1];

const rootEl = ref<HTMLElement | null>(null);
const stageEl = ref<HTMLElement | null>(null);
const bodyEl = ref<HTMLElement | null>(null);

const phase = ref<ScenePhase>('idle');
const shownSprite = ref<ChestStage>(props.stage);
const seamBoost = ref(false);
const seamRed = ref(false);
const orbsLaunching = ref(false);
const burstKey = ref(0);
const burstRed = ref(false);
const dustKey = ref(0);
const flashKey = ref(0);
/** 一次性特效层：播完即移出 DOM */
const burstOn = ref(false);
const dustOn = ref(false);
const flyingFlags = ref<boolean[]>([]);
const pressRing = ref<{ x: number; y: number } | null>(null);

const reducedMotion =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const riskLevel = computed(() => {
  if (phase.value === 'mimic') return 1;
  return RISK_LEVELS[Math.max(0, Math.min(RISK_LEVELS.length - 1, Math.floor(props.closeCount)))] ?? 0;
});

const rootClasses = computed(() => ({
  'is-closed': shownSprite.value === 'closed',
  'is-opened': shownSprite.value === 'opened',
  'is-mimic': shownSprite.value === 'mimic',
  'phase-mimic': phase.value === 'mimic',
  'is-seam-boost': seamBoost.value,
  'is-seam-red': seamRed.value,
}));

const isAwaiting = (index: number) =>
  props.isTouch && props.pendingRewardIndex === index && !props.collectedFlags[index];

/* ---------- 奖励光球 ---------- */
interface OrbView {
  key: string;
  index: number;
  name: string;
  rarity: RelicData['rarity'];
  toneClass: 'is-common' | 'is-rare' | 'is-legendary';
  src: string;
  collected: boolean;
  style: Record<string, string>;
}

const RARITY_TONE_CLASS: Record<RelicData['rarity'], OrbView['toneClass']> = {
  普通: 'is-common',
  稀有: 'is-rare',
  传奇: 'is-legendary',
};

const getOrbSlotX = (index: number, total: number) => {
  if (total <= 1) return CHEST_MOUTH.x;
  if (total === 2) return index === 0 ? 40 : 61;
  const span = 34;
  return CHEST_MOUTH.x - span / 2 + (span / (total - 1)) * index;
};

const buildOrbs = (rewards: readonly RelicData[], flags: readonly boolean[]): OrbView[] =>
  rewards.map((relic, index) => {
    const x = getOrbSlotX(index, rewards.length);
    return {
      key: `${relic.id}-${index}`,
      index,
      name: relic.name,
      rarity: relic.rarity,
      toneClass: RARITY_TONE_CLASS[relic.rarity] ?? 'is-common',
      src: CHEST_ROOM_ASSETS.orbs[relic.rarity] ?? CHEST_ROOM_ASSETS.orbs.普通,
      collected: Boolean(flags[index]),
      style: {
        left: `${x}%`,
        top: `${ORB_Y}%`,
        '--dx': `${CHEST_MOUTH.x - x}cqw`,
        '--dy': `${CHEST_MOUTH.y - ORB_Y}cqh`,
        '--fx': `${ORB_COLLECT_TARGET.x - x}cqw`,
        '--fy': `${ORB_COLLECT_TARGET.y - ORB_Y}cqh`,
        '--delay': `${index * ORB_LAUNCH_STAGGER_MS}ms`,
        '--float-delay': `${-index * 1.3}s`,
      },
    };
  });

/** 父组件在关闭宝箱时会立即清空奖励，这里保留快照用于“收回”动画 */
const returningSnapshot = ref<OrbView[]>([]);

const orbs = computed<OrbView[]>(() => {
  if (phase.value === 'closing') return returningSnapshot.value;
  if (props.stage !== 'opened' || !props.rewardVisible) return [];
  return buildOrbs(props.rewards, props.collectedFlags);
});

watch(
  () => props.rewards,
  () => {
    flyingFlags.value = [];
  },
);

watch(
  () => props.collectedFlags.slice(),
  (next, prev) => {
    next.forEach((flag, index) => {
      if (flag && !prev[index]) flyingFlags.value[index] = true;
    });
  },
);

/* ---------- 时间线 ---------- */
let timers: ReturnType<typeof setTimeout>[] = [];

const later = (ms: number, fn: () => void) => {
  timers.push(setTimeout(fn, ms));
};

/** 特效不随阶段时间线清除（换阶段时也应播完），单独计时 */
let burstTimer: ReturnType<typeof setTimeout> | null = null;
let dustTimer: ReturnType<typeof setTimeout> | null = null;

const fireBurst = (red: boolean) => {
  burstRed.value = red;
  burstKey.value += 1;
  flashKey.value += 1;
  burstOn.value = true;
  if (burstTimer) clearTimeout(burstTimer);
  burstTimer = setTimeout(() => {
    burstOn.value = false;
    burstTimer = null;
  }, 1000);
};

const fireDust = () => {
  dustKey.value += 1;
  dustOn.value = true;
  if (dustTimer) clearTimeout(dustTimer);
  dustTimer = setTimeout(() => {
    dustOn.value = false;
    dustTimer = null;
  }, 1100);
};

const clearTimeline = () => {
  timers.forEach(timer => clearTimeout(timer));
  timers = [];
};

const play = (el: HTMLElement | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
  if (!el || reducedMotion || typeof el.animate !== 'function') return;
  el.animate(frames, options);
};

const shakeFrames = (amplitude: number, steps: number): Keyframe[] => {
  const frames: Keyframe[] = [{ transform: 'translate(0, 0) rotate(0deg)' }];
  for (let i = 1; i < steps; i += 1) {
    const grow = i / steps;
    const sign = i % 2 === 0 ? 1 : -1;
    frames.push({
      transform: `translate(${sign * amplitude * grow}px, ${-amplitude * 0.35 * grow}px) rotate(${sign * amplitude * 0.28 * grow}deg)`,
    });
  }
  frames.push({ transform: 'translate(0, 0) rotate(0deg)' });
  return frames;
};

const sceneShake = (amplitude: number, duration: number) =>
  play(
    stageEl.value,
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${amplitude}px, ${-amplitude * 0.6}px)` },
      { transform: `translate(${-amplitude * 0.8}px, ${amplitude * 0.5}px)` },
      { transform: `translate(${amplitude * 0.5}px, ${amplitude * 0.3}px)` },
      { transform: `translate(${-amplitude * 0.25}px, 0)` },
      { transform: 'translate(0, 0)' },
    ],
    { duration, easing: 'ease-out' },
  );

const finishPhase = () => {
  phase.value = 'idle';
  orbsLaunching.value = false;
  seamBoost.value = false;
  returningSnapshot.value = [];
};

const runOpening = () => {
  clearTimeline();
  phase.value = 'opening';
  shownSprite.value = 'closed';
  seamBoost.value = true;
  orbsLaunching.value = false;
  play(bodyEl.value, shakeFrames(2.6, 9), { duration: 440, easing: 'ease-in' });

  later(400, () => fireBurst(false));
  later(470, () => {
    shownSprite.value = 'opened';
    seamBoost.value = false;
    play(
      bodyEl.value,
      [
        { transform: 'scale(1.045, 0.955)' },
        { transform: 'scale(0.985, 1.025)', offset: 0.45 },
        { transform: 'scale(1, 1)' },
      ],
      { duration: 460, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
    );
  });
  later(600, () => {
    orbsLaunching.value = true;
  });
  const total = 600 + ORB_LAUNCH_MS + ORB_LAUNCH_STAGGER_MS * Math.max(0, props.rewards.length - 1) + 80;
  later(total, finishPhase);
};

const runClosing = (snapshot: OrbView[]) => {
  clearTimeline();
  returningSnapshot.value = snapshot.filter(orb => !orb.collected);
  phase.value = 'closing';
  shownSprite.value = 'opened';
  later(320, () => {
    shownSprite.value = 'closed';
    fireDust();
    play(
      bodyEl.value,
      [
        { transform: 'scale(1, 1)' },
        { transform: 'scale(1.035, 0.95)', offset: 0.3 },
        { transform: 'scale(0.99, 1.015)', offset: 0.65 },
        { transform: 'scale(1, 1)' },
      ],
      { duration: 380, easing: 'ease-out' },
    );
    sceneShake(4, 280);
  });
  later(1050, finishPhase);
};

const runMimic = () => {
  clearTimeline();
  phase.value = 'mimic';
  shownSprite.value = 'closed';
  seamRed.value = true;
  seamBoost.value = true;
  play(bodyEl.value, shakeFrames(4.2, 13), { duration: 640, easing: 'ease-in' });

  later(600, () => {
    fireBurst(true);
    shownSprite.value = 'mimic';
    seamBoost.value = false;
    play(
      bodyEl.value,
      [
        { transform: 'scale(0.94, 1.04)' },
        { transform: 'scale(1.07, 0.96)', offset: 0.35 },
        { transform: 'scale(0.99, 1.01)', offset: 0.7 },
        { transform: 'scale(1, 1)' },
      ],
      { duration: 520, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
    );
    sceneShake(9, 460);
  });
  later(1300, () => {
    phase.value = 'idle';
    seamRed.value = false;
  });
};

/** 关闭前最后一次可见的奖励（用于收回动画） */
let lastVisibleOrbs: OrbView[] = [];
watch(
  orbs,
  value => {
    if (phase.value !== 'closing' && value.length > 0) lastVisibleOrbs = value;
  },
  { immediate: true },
);

watch(
  () => props.stage,
  (next, prev) => {
    if (next === prev) return;
    if (prev === 'closed' && next === 'opened') {
      runOpening();
      return;
    }
    if (prev === 'opened' && next === 'closed') {
      runClosing(lastVisibleOrbs);
      lastVisibleOrbs = [];
      return;
    }
    if (prev === 'closed' && next === 'mimic') {
      runMimic();
      return;
    }
    clearTimeline();
    finishPhase();
    seamRed.value = false;
    shownSprite.value = next;
  },
);

/* ---------- 交互 ---------- */
const handleOpenClick = () => {
  if (props.rolling || phase.value !== 'idle' || props.stage !== 'closed') return;
  emit('open');
};

const canRequestClose = () => props.stage === 'opened' && phase.value === 'idle' && !props.collecting;

const handleContextMenu = () => {
  if (canRequestClose()) emit('close-request');
};

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let pressOrigin: { x: number; y: number } | null = null;

const cancelLongPress = () => {
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = null;
  pressOrigin = null;
  pressRing.value = null;
};

const handleTouchStart = (event: TouchEvent) => {
  cancelLongPress();
  if (!canRequestClose() || event.touches.length !== 1) return;
  const touch = event.touches[0];
  const root = rootEl.value;
  if (root) {
    // 界面整体被缩放：把屏幕坐标换算回组件内的布局坐标
    const rect = root.getBoundingClientRect();
    const scale = root.offsetWidth > 0 ? rect.width / root.offsetWidth : 1;
    pressRing.value = { x: (touch.clientX - rect.left) / scale, y: (touch.clientY - rect.top) / scale };
  }
  pressOrigin = { x: touch.clientX, y: touch.clientY };
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    pressOrigin = null;
    pressRing.value = null;
    if (canRequestClose()) emit('close-request');
  }, LONG_PRESS_MS);
};

const handleTouchMove = (event: TouchEvent) => {
  if (!pressOrigin) return;
  const touch = event.touches[0];
  if (!touch) return;
  if (Math.hypot(touch.clientX - pressOrigin.x, touch.clientY - pressOrigin.y) > 14) cancelLongPress();
};

onBeforeUnmount(() => {
  clearTimeline();
  if (burstTimer) clearTimeout(burstTimer);
  if (dustTimer) clearTimeout(dustTimer);
  cancelLongPress();
});
</script>

<style scoped>
.chest-room {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #05030a;
  container-type: size;
  user-select: none;
  -webkit-touch-callout: none;
}

/* 16:9 舞台，按 cover 方式铺满；所有图层都以它为坐标系，保证与基座对齐 */
.chest-room__stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: max(100cqw, calc(100cqh * 16 / 9));
  aspect-ratio: 16 / 9;
  translate: -50% -50%;
  container-type: size;
}

.chest-room__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

/* ---------- 环境光：基座上的光池，随状态变色 ---------- */
.chest-room__ambient {
  position: absolute;
  left: 50.5%;
  top: 60%;
  width: 42cqw;
  height: 20cqh;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 196, 120, 0.42), rgba(255, 170, 90, 0.12) 60%, transparent);
  mix-blend-mode: screen;
  opacity: 0.45;
  pointer-events: none;
  transition:
    opacity 0.7s ease,
    filter 0.7s ease;
  animation: chest-ambient-breathe 5.5s ease-in-out infinite;
}

.chest-room.is-opened .chest-room__ambient {
  opacity: 0.85;
}

.chest-room.is-mimic .chest-room__ambient {
  opacity: 0.9;
  filter: hue-rotate(-40deg) saturate(1.8);
}

/* ---------- 宝箱 ---------- */
.chest-room__chest {
  position: absolute;
  left: 50.5%;
  bottom: 37.6%;
  width: 24cqw;
  aspect-ratio: 507 / 485;
  translate: -50% 0;
}

.chest-room__hit {
  position: absolute;
  inset: 8% 4% 0;
  z-index: 3;
  border: 0;
  border-radius: 12%;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.chest-room__hit:disabled {
  cursor: default;
}

.chest-room__hit:focus-visible {
  outline: 2px solid rgba(255, 214, 140, 0.55);
  outline-offset: 4px;
}

.chest-room__hit:hover:not(:disabled) ~ .chest-room__body .chest-room__sprites,
.chest-room__hit:focus-visible ~ .chest-room__body .chest-room__sprites {
  filter: brightness(1.1) drop-shadow(0 0 1.2cqw rgba(255, 196, 110, 0.35));
}

.chest-room__hit:hover:not(:disabled) ~ .chest-room__body .chest-room__seam {
  opacity: 0.85;
}

.chest-room__shadow {
  position: absolute;
  left: 50%;
  bottom: -3%;
  width: 104%;
  height: 12%;
  translate: -50% 0;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.28) 55%, transparent);
  pointer-events: none;
}

.chest-room__body {
  position: absolute;
  inset: 0;
  transform-origin: 50% 100%;
  pointer-events: none;
}

.chest-room__sprites {
  position: absolute;
  inset: 0;
  transition: filter 0.25s ease;
}

.chest-room.is-mimic .chest-room__sprites {
  transform-origin: 50% 100%;
  animation: chest-mimic-breathe 2.8s ease-in-out infinite;
}

.chest-room__sprite {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.14s linear;
}

.chest-room__sprite.is-shown {
  opacity: 1;
}

/* 开启后从箱口升起的暖光 */
.chest-room__mouth-glow {
  position: absolute;
  left: 52%;
  top: 40%;
  width: 92%;
  height: 70%;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 226, 160, 0.55), rgba(255, 180, 90, 0.18) 55%, transparent);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
}

.chest-room.is-opened .chest-room__mouth-glow {
  opacity: 1;
  animation: chest-mouth-breathe 4.2s ease-in-out infinite;
}

/* 箱盖缝隙的漏光 */
.chest-room__seam {
  position: absolute;
  left: 50%;
  top: 58%;
  width: 74%;
  height: 7%;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 232, 170, 0.95), rgba(255, 186, 90, 0.45) 50%, transparent);
  mix-blend-mode: screen;
  opacity: 0.4;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  animation: chest-seam-pulse 4s ease-in-out infinite;
}

.chest-room:not(.is-closed) .chest-room__seam {
  opacity: 0;
  animation: none;
}

.chest-room.is-seam-boost .chest-room__seam {
  opacity: 1;
  transform: scale(1.18, 1.6);
  animation: none;
}

.chest-room.is-seam-red .chest-room__seam {
  background: radial-gradient(closest-side, rgba(255, 120, 110, 0.95), rgba(200, 20, 30, 0.5) 50%, transparent);
}

/* 宝箱怪风险提示：缝隙里偶尔闪过的红眼 */
.chest-room__eyes {
  position: absolute;
  inset: 0;
  opacity: var(--risk, 0);
  pointer-events: none;
}

.chest-room:not(.is-closed) .chest-room__eyes {
  display: none;
}

.chest-room__eyes i {
  position: absolute;
  top: 57.5%;
  width: 3.4%;
  height: 1.9%;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, #ffd6cf, #ff3b30 45%, rgba(190, 0, 20, 0) 100%);
  box-shadow: 0 0 0.6cqw rgba(255, 40, 40, 0.8);
  opacity: 0;
  animation: chest-eyes-blink 6.5s ease-in-out infinite;
}

.chest-room__eyes i:first-child {
  left: 43.5%;
}

.chest-room__eyes i:last-child {
  left: 57%;
}

.chest-room.phase-mimic .chest-room__eyes i {
  opacity: 1;
  animation: none;
}

/* ---------- 特效 ---------- */
.chest-room__burst {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 230%;
  aspect-ratio: 1;
  translate: -50% -50%;
  mix-blend-mode: screen;
  pointer-events: none;
  animation: chest-burst 0.95s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

.chest-room__burst.is-red {
  filter: hue-rotate(-48deg) saturate(2.2) brightness(0.9);
}

.chest-room__dust {
  position: absolute;
  bottom: -6%;
  width: 70%;
  translate: -50% 0;
  transform-origin: 50% 100%;
  opacity: 0;
  pointer-events: none;
  animation: chest-dust 1s ease-out both;
}

.chest-room__dust[data-index='0'] {
  left: 10%;
  --dust-shift: -28%;
}

.chest-room__dust[data-index='1'] {
  left: 50%;
  bottom: -10%;
  --dust-shift: 0%;
  animation-delay: 40ms;
}

.chest-room__dust[data-index='2'] {
  left: 90%;
  --dust-shift: 28%;
  animation-delay: 20ms;
}

.chest-room__flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 45% 45% at 50.5% 40%, rgba(255, 236, 190, 0.75), rgba(255, 200, 120, 0.2) 55%, transparent 80%);
  mix-blend-mode: screen;
  pointer-events: none;
  animation: chest-flash 0.7s ease-out both;
}

.chest-room__flash.is-red {
  background: radial-gradient(ellipse 55% 55% at 50.5% 40%, rgba(255, 90, 80, 0.7), rgba(170, 0, 20, 0.3) 55%, transparent 85%);
}

.chest-room__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 70% at 50% 45%, transparent 40%, rgba(120, 0, 12, 0.42) 78%, rgba(36, 0, 4, 0.82) 100%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s ease;
}

.chest-room.is-mimic .chest-room__vignette {
  opacity: 1;
  animation: chest-vignette-pulse 2.8s ease-in-out infinite;
}

/* ---------- 奖励光球 ---------- */
.chest-room__rewards {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.chest-orb {
  --orb-color: rgba(255, 186, 110, 0.9);
  --orb-glow: rgba(255, 150, 60, 0.45);
  position: absolute;
  width: 8.4cqw;
  aspect-ratio: 1;
  translate: -50% -50%;
}

.chest-orb.is-rare {
  --orb-color: rgba(206, 156, 255, 0.92);
  --orb-glow: rgba(150, 80, 255, 0.5);
}

.chest-orb.is-legendary {
  --orb-color: rgba(255, 222, 130, 0.95);
  --orb-glow: rgba(255, 190, 60, 0.6);
}

.chest-orb__track-x,
.chest-orb__track-y,
.chest-orb__float {
  position: absolute;
  inset: 0;
}

.chest-orb__float {
  animation: chest-orb-float 3.6s ease-in-out var(--float-delay, 0s) infinite;
}

.chest-orb__pillar {
  position: absolute;
  left: 50%;
  bottom: 50%;
  width: 38%;
  height: 34cqh;
  translate: -50% 0;
  transform-origin: 50% 100%;
  background: linear-gradient(0deg, var(--orb-color), transparent);
  -webkit-mask: linear-gradient(90deg, transparent, #000 35%, #000 65%, transparent);
  mask: linear-gradient(90deg, transparent, #000 35%, #000 65%, transparent);
  filter: blur(0.25cqw);
  mix-blend-mode: screen;
  opacity: 0.55;
  pointer-events: none;
  animation: chest-orb-pillar 3s ease-in-out infinite;
}

.chest-orb.is-common .chest-orb__pillar {
  opacity: 0.32;
}

.chest-orb__halo {
  position: absolute;
  inset: -45%;
  border-radius: 50%;
  background: radial-gradient(closest-side, var(--orb-glow), transparent);
  mix-blend-mode: screen;
  opacity: 0.8;
  pointer-events: none;
  animation: chest-orb-halo 3.6s ease-in-out infinite;
}

.chest-orb__btn {
  position: absolute;
  inset: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;
}

.chest-orb__btn:hover:not(:disabled),
.chest-orb__btn:focus-visible,
.chest-orb__btn.is-awaiting-confirm {
  outline: none;
  transform: scale(1.08);
  filter: brightness(1.15) drop-shadow(0 0 0.8cqw var(--orb-color));
}

.chest-orb__btn:disabled {
  cursor: default;
}

.chest-orb__img {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0.4cqw 0.6cqw rgba(0, 0, 0, 0.55));
}

.chest-orb__confirm {
  position: absolute;
  left: 50%;
  top: calc(100% + 0.6cqw);
  translate: -50% 0;
  white-space: nowrap;
  border: 1px solid rgba(201, 161, 96, 0.6);
  background: rgba(14, 9, 18, 0.88);
  color: var(--dg-gold-bright, #f3d9a0);
  font-family: var(--dg-font-title, serif);
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  padding: 0.2rem 0.6rem;
  pointer-events: none;
}

/* 开箱：从箱口抛出（X 匀速、Y 抛物线），落地后才显示光柱 */
.chest-orb.is-waiting {
  visibility: hidden;
}

.chest-orb.is-launching .chest-orb__track-x {
  animation: chest-orb-launch-x 900ms cubic-bezier(0.25, 0.55, 0.45, 1) var(--delay) both;
}

.chest-orb.is-launching .chest-orb__track-y {
  animation: chest-orb-launch-y 900ms linear var(--delay) both;
}

.chest-orb.is-launching .chest-orb__pillar,
.chest-orb.is-launching .chest-orb__halo {
  animation: chest-orb-reveal 0.45s ease-out calc(var(--delay) + 760ms) both;
}

.chest-orb.is-launching .chest-orb__btn {
  pointer-events: none;
}

/* 关箱刷新：光球被吸回箱口 */
.chest-orb.is-returning .chest-orb__track-x {
  animation: chest-orb-return-x 340ms ease-in both;
}

.chest-orb.is-returning .chest-orb__track-y {
  animation: chest-orb-return-y 340ms ease-in both;
}

.chest-orb.is-returning .chest-orb__pillar,
.chest-orb.is-returning .chest-orb__halo {
  animation: chest-fade-out 0.18s ease-out both;
}

/* 领取：飞向左下角状态栏 */
.chest-orb.is-collected {
  visibility: hidden;
}

.chest-orb.is-flying {
  visibility: visible;
}

.chest-orb.is-flying .chest-orb__btn {
  pointer-events: none;
}

.chest-orb.is-flying .chest-orb__track-x {
  animation: chest-orb-fly-x 0.7s cubic-bezier(0.55, 0, 0.75, 0.45) both;
}

.chest-orb.is-flying .chest-orb__track-y {
  animation: chest-orb-fly-y 0.7s ease-in both;
}

.chest-orb.is-flying .chest-orb__pillar,
.chest-orb.is-flying .chest-orb__halo {
  animation: chest-fade-out 0.25s ease-out both;
}

/* ---------- 长按关箱进度环 ---------- */
.chest-room__press-ring {
  position: absolute;
  z-index: 5;
  width: 64px;
  height: 64px;
  translate: -50% -50%;
  rotate: -90deg;
  pointer-events: none;
}

.chest-room__press-track,
.chest-room__press-fill {
  fill: none;
  stroke-width: 3;
}

.chest-room__press-track {
  stroke: rgba(255, 236, 200, 0.18);
}

.chest-room__press-fill {
  stroke: rgba(255, 210, 130, 0.92);
  stroke-linecap: round;
  stroke-dasharray: 163.4;
  stroke-dashoffset: 163.4;
  filter: drop-shadow(0 0 3px rgba(255, 190, 90, 0.7));
  animation: chest-press-fill 2s linear both;
}

/* ---------- 完成按钮（主要按钮框） ---------- */
.chest-room__finish {
  position: absolute;
  left: 50%;
  bottom: clamp(2rem, 8cqh, 5.5rem);
  z-index: 4;
  min-width: 24rem;
  translate: -50% 0;
  border-style: solid;
  border-width: 0 30px;
  border-image-source: var(--dg-img-button);
  border-image-slice: 0 80 fill;
  border-image-repeat: stretch;
  background: none;
  color: var(--dg-gold-bright, #f3d9a0);
  font-family: var(--dg-font-title, serif);
  font-size: 1.3rem;
  letter-spacing: 0.16em;
  padding: 1rem 2rem;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
  transition: filter 0.18s ease;
}

.chest-room__finish:hover:not(:disabled),
.chest-room__finish:focus-visible {
  outline: none;
  filter: brightness(1.15) drop-shadow(0 0 6px rgba(232, 170, 70, 0.35));
}

.chest-room__finish:disabled {
  cursor: wait;
  filter: grayscale(0.6) brightness(0.7);
}

.chest-room-fade-enter-active,
.chest-room-fade-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.chest-room-fade-enter-from,
.chest-room-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ---------- keyframes ---------- */
@keyframes chest-ambient-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes chest-mouth-breathe {
  0%,
  100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

@keyframes chest-seam-pulse {
  0%,
  100% {
    opacity: 0.28;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes chest-eyes-blink {
  0%,
  72%,
  100% {
    opacity: 0;
  }
  78%,
  86% {
    opacity: 1;
  }
  82% {
    opacity: 0.35;
  }
}

@keyframes chest-mimic-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.012, 1.018);
  }
}

@keyframes chest-vignette-pulse {
  0%,
  100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

@keyframes chest-burst {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-8deg);
  }
  20% {
    opacity: 1;
    transform: scale(0.85) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: scale(1.35) rotate(6deg);
  }
}

@keyframes chest-flash {
  0% {
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes chest-dust {
  0% {
    opacity: 0;
    transform: translateX(0) scale(0.5, 0.4);
  }
  22% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translateX(var(--dust-shift)) scale(1.25, 1.1);
  }
}

@keyframes chest-orb-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.7cqh);
  }
}

@keyframes chest-orb-pillar {
  0%,
  100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.92);
  }
}

@keyframes chest-orb-halo {
  0%,
  100% {
    opacity: 0.8;
  }
  50% {
    opacity: 0.55;
  }
}

/* 只给起点：终点自动取各自的常态值，动画结束后无跳变 */
@keyframes chest-orb-reveal {
  from {
    opacity: 0;
    transform: scaleY(0.2);
  }
}

@keyframes chest-fade-out {
  to {
    opacity: 0;
  }
}

@keyframes chest-orb-launch-x {
  from {
    transform: translateX(var(--dx));
  }
  to {
    transform: translateX(0);
  }
}

@keyframes chest-orb-launch-y {
  0% {
    opacity: 0;
    transform: translateY(var(--dy)) scale(0.25);
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
  }
  10% {
    opacity: 1;
  }
  42% {
    transform: translateY(calc(var(--dy) - 15cqh)) scale(0.9);
    animation-timing-function: cubic-bezier(0.55, 0, 0.85, 0.45);
  }
  82% {
    transform: translateY(0) scale(1.04, 0.94);
    animation-timing-function: ease-out;
  }
  91% {
    transform: translateY(-1.4cqh) scale(0.98, 1.02);
    animation-timing-function: ease-in;
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes chest-orb-return-x {
  to {
    transform: translateX(var(--dx));
  }
}

@keyframes chest-orb-return-y {
  0% {
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(var(--dy)) scale(0.2);
  }
}

@keyframes chest-orb-fly-x {
  to {
    transform: translateX(var(--fx));
  }
}

@keyframes chest-orb-fly-y {
  0% {
    transform: translateY(0) scale(1);
  }
  25% {
    transform: translateY(-3cqh) scale(1.12);
  }
  85% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(var(--fy)) scale(0.22);
  }
}

@keyframes chest-press-fill {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chest-room *,
  .chest-room *::before,
  .chest-room *::after {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
