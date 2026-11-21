<template>
  <div class="dg-minigame gacha-minigame">
    <div class="dg-skin-panel dg-minigame__panel">
      <header class="dg-minigame__header">
        <div class="dg-skin-title">扭蛋机</div>
        <span class="dg-skin-divider" aria-hidden="true"></span>
        <div class="dg-skin-hint mt-1">用运气，换取难以言喻的惊喜</div>
        <div class="dg-minigame__gold" :title="`当前金币 ${gold}`">
          <img :src="coinIcon" alt="" aria-hidden="true" />
          <span>{{ gold }}</span>
        </div>
      </header>

      <div class="dg-minigame__body">
        <div class="gacha-layout">
          <!-- 左右两台扭蛋机 -->
          <section
            v-for="machine in machines"
            :key="machine.id"
            class="gacha-machine"
            :class="{ 'is-big': machine.id === 'big', 'is-working': activeMachine === machine.id }"
          >
            <div class="gacha-machine__art">
              <img :src="machineArt(machine)" :alt="machine.label" />
            </div>
            <div class="gacha-machine__plate">
              <div class="dg-skin-option__title">{{ machineTitle(machine) }}</div>
              <div class="gacha-machine__subtitle">{{ machineSubtitle(machine) }}</div>
              <ul class="gacha-machine__prizes" :aria-label="`${machineTitle(machine)}可能扭出的奖励`">
                <li v-for="prize in uniquePrizes(machine)" :key="`${machine.id}-${prize.id}`" :title="prize.label">
                  <img :src="iconUrl(prize.icon)" :alt="prize.label" />
                </li>
              </ul>
              <button type="button" class="dg-skin-btn dg-minigame__cta" :disabled="!canPull(machine)" @click="pull(machine)">
                <img :src="coinIcon" alt="" aria-hidden="true" />
                {{ activeMachine === machine.id ? '扭蛋滚落中…' : `投币 ${machine.cost}` }}
              </button>
            </div>
          </section>

          <!-- 中间：出货口与本次所得 -->
          <div class="gacha-tray">
            <section class="dg-minigame__block gacha-outlet" aria-live="polite">
              <div class="dg-minigame__block-title">出货口</div>
              <div class="gacha-outlet__stage">
                <div v-if="activeMachine" :key="`drop-${pullCount}`" class="gacha-capsule is-dropping">
                  <img :src="capsuleUrl(activeMachine)" alt="" aria-hidden="true" />
                </div>
                <div
                  v-else-if="lastResult"
                  :key="`result-${pullCount}`"
                  class="gacha-prize"
                  :class="{ 'is-curse': lastResult.prize.prize.kind === 'curse' }"
                >
                  <img
                    class="gacha-prize__burst"
                    :src="capsuleUrl(lastResult.machine.id, lastResult.prize.prize.kind === 'curse')"
                    alt=""
                    aria-hidden="true"
                  />
                  <img class="gacha-prize__icon" :src="iconUrl(lastResult.prize.icon)" alt="" aria-hidden="true" />
                  <span class="gacha-prize__machine">{{ machineTitle(lastResult.machine) }}</span>
                  <span class="gacha-prize__label">{{ lastResult.prize.label }}</span>
                </div>
                <div v-else class="gacha-outlet__hint">投币转动旋钮，<br />扭蛋会从这里滚出来。</div>
              </div>
            </section>

            <section class="dg-minigame__block gacha-history-block">
              <div class="dg-minigame__block-title">本次扭到{{ history.length > 0 ? `（${history.length}）` : '' }}</div>
              <ul v-if="history.length > 0" class="gacha-history">
                <li v-for="entry in recentHistory" :key="`history-${entry.index}`" :title="entry.prize.label">
                  <img :src="iconUrl(entry.prize.icon)" :alt="entry.prize.label" />
                </li>
              </ul>
              <div v-else class="gacha-history__empty">还没有扭到任何东西。</div>
            </section>
          </div>
        </div>
      </div>

      <footer class="dg-minigame__footer">
        <button type="button" class="dg-skin-btn-ghost" :disabled="activeMachine !== null" @click="emit('exit')">离开</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { minigameArtUrl, minigameIconUrl, type MinigameIconKey } from '../../events/minigameAssets';
import { rollWeighted, type GachaMachine, type WeightedPrize } from '../../events/minigames';

const props = defineProps<{
  machines: readonly GachaMachine[];
  gold: number;
  busy?: boolean;
}>();

const emit = defineEmits<{
  pull: [machine: GachaMachine, prize: WeightedPrize];
  exit: [];
}>();

const iconUrl = (key: MinigameIconKey) => minigameIconUrl(key);
const coinIcon = minigameIconUrl('coin');

const MACHINE_TEXT: Record<GachaMachine['id'], { title: string; subtitle: string }> = {
  small: { title: '精密小扭蛋机', subtitle: '小巧精密 · 每次 2 金币' },
  big: { title: '限金大型扭蛋机', subtitle: '镀金重器 · 大奖与风险并存' },
};
const machineTitle = (machine: GachaMachine) => MACHINE_TEXT[machine.id].title;
const machineSubtitle = (machine: GachaMachine) => MACHINE_TEXT[machine.id].subtitle;
const machineArt = (machine: GachaMachine) => minigameArtUrl(machine.id === 'big' ? 'gachaBig' : 'gachaSmall');
const capsuleUrl = (machineId: GachaMachine['id'], cursed = false) =>
  minigameArtUrl(cursed ? 'capsuleCrimson' : machineId === 'big' ? 'capsuleGold' : 'capsuleViolet');

/** 同一图标只展示一次，作为「可能扭出」的预览 */
const uniquePrizes = (machine: GachaMachine) => {
  const seen = new Set<MinigameIconKey>();
  return machine.prizes.filter(prize => (seen.has(prize.icon) ? false : (seen.add(prize.icon), true)));
};

const activeMachine = ref<GachaMachine['id'] | null>(null);
const lastResult = ref<{ machine: GachaMachine; prize: WeightedPrize } | null>(null);
const history = ref<WeightedPrize[]>([]);
/** 只展示最近 24 个，避免连抽很多次后把出货口撑出屏幕 */
const HISTORY_LIMIT = 24;
const recentHistory = computed(() =>
  history.value.slice(-HISTORY_LIMIT).map((prize, offset) => ({ prize, index: Math.max(0, history.value.length - HISTORY_LIMIT) + offset })),
);
const pullCount = ref(0);

const canPull = (machine: GachaMachine) => activeMachine.value === null && !props.busy && props.gold >= machine.cost;

const pull = (machine: GachaMachine) => {
  if (!canPull(machine)) return;
  const prize = rollWeighted(machine.prizes);
  pullCount.value += 1;
  activeMachine.value = machine.id;
  lastResult.value = null;
  window.setTimeout(() => {
    activeMachine.value = null;
    lastResult.value = { machine, prize };
    history.value = [...history.value, prize];
    emit('pull', machine, prize);
  }, 1300);
};
</script>

<style scoped>
.gacha-minigame {
  --dg-minigame-glow: rgba(90, 20, 70, 0.45);
}

/* 左机 | 出货口 | 右机，整体按主体高度铺满 */
.gacha-layout {
  display: grid;
  height: 100%;
  gap: 1.6rem;
  grid-template-areas: 'left tray right';
  grid-template-columns: minmax(0, 1fr) clamp(13rem, 20cqw, 17rem) minmax(0, 1fr);
}

@media (max-width: 760px) {
  .gacha-layout {
    height: auto;
    grid-template-areas: 'left' 'right' 'tray';
    grid-template-columns: minmax(0, 1fr);
  }
}

.gacha-machine {
  display: flex;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  grid-area: left;
}

.gacha-machine.is-big {
  grid-area: right;
}

.gacha-machine__art {
  position: relative;
  width: 100%;
  min-height: 0;
  flex: 1;
}

.gacha-machine__art img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.7));
  object-fit: contain;
  object-position: 50% 100%;
  transform-origin: 50% 100%;
}

@media (max-width: 760px) {
  .gacha-machine__art {
    height: 15rem;
    flex: none;
  }
}

.gacha-machine.is-working .gacha-machine__art img {
  animation: gacha-shake 0.32s ease-in-out 3;
}

@keyframes gacha-shake {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-1.5deg) translateY(-2px);
  }
  75% {
    transform: rotate(1.5deg) translateY(-2px);
  }
}

.gacha-machine__plate {
  display: flex;
  width: 100%;
  max-width: 24rem;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  margin-top: -0.3rem;
  padding: 0.55rem 0.8rem 0.7rem;
  border: 1px solid rgba(201, 161, 96, 0.38);
  background:
    linear-gradient(180deg, rgba(60, 30, 40, 0.55), rgba(14, 9, 12, 0.9)),
    rgba(10, 7, 9, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.08);
  text-align: center;
}

.gacha-machine.is-big .gacha-machine__plate {
  border-color: rgba(240, 208, 138, 0.6);
  box-shadow: 0 0 18px rgba(240, 190, 90, 0.18), inset 0 1px 0 rgba(255, 220, 160, 0.12);
}

.gacha-machine__subtitle {
  color: var(--dg-text-muted);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
}

.gacha-machine__prizes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.15rem;
}

.gacha-machine__prizes img {
  width: 1.8rem;
  height: 1.8rem;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7));
  object-fit: contain;
}

/* ── 中间出货口 ── */
.gacha-tray {
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  gap: 0.7rem;
  grid-area: tray;
}

.gacha-outlet__stage {
  display: flex;
  min-height: 11rem;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.gacha-outlet__hint {
  color: var(--dg-text-muted);
  font-size: 0.85rem;
  line-height: 1.7;
}

.gacha-capsule img {
  width: 5rem;
  height: 5rem;
}

.gacha-capsule.is-dropping {
  animation: gacha-drop 1.2s cubic-bezier(0.3, 0, 0.5, 1) both;
}

@keyframes gacha-drop {
  0% {
    opacity: 0;
    transform: translateY(-5rem) rotate(0deg);
  }
  45% {
    opacity: 1;
    transform: translateY(0) rotate(220deg);
  }
  60% {
    transform: translateY(-0.9rem) rotate(260deg);
  }
  75% {
    transform: translateY(0) rotate(300deg);
  }
  88% {
    transform: translateY(-0.25rem) rotate(330deg) scale(1.05);
  }
  100% {
    transform: translateY(0) rotate(360deg) scale(1.12);
  }
}

.gacha-prize {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  animation: dg-minigame-pop 0.45s ease-out both;
}

.gacha-prize__burst {
  position: absolute;
  top: 0;
  left: 50%;
  width: 5.4rem;
  height: 5.4rem;
  opacity: 0;
  animation: gacha-burst 0.6s ease-out both;
  pointer-events: none;
  transform: translateX(-50%);
}

@keyframes gacha-burst {
  from {
    opacity: 0.9;
    transform: translateX(-50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) scale(1.9);
  }
}

.gacha-prize__icon {
  width: 5.4rem;
  height: 5.4rem;
  filter: drop-shadow(0 0 12px rgba(255, 220, 150, 0.6));
}

.gacha-prize.is-curse .gacha-prize__icon {
  filter: drop-shadow(0 0 12px rgba(217, 70, 239, 0.7));
}

.gacha-prize__machine {
  color: var(--dg-text-muted);
  font-size: 0.75rem;
}

.gacha-prize__label {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1.1rem;
  line-height: 1.35;
}

.gacha-prize.is-curse .gacha-prize__label {
  color: #f0b9f5;
}

.gacha-history {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.gacha-history img {
  width: 1.8rem;
  height: 1.8rem;
  object-fit: contain;
}

.gacha-history__empty {
  color: var(--dg-text-faint);
  font-size: 0.8rem;
}

@media (prefers-reduced-motion: reduce) {
  .gacha-machine.is-working .gacha-machine__art img,
  .gacha-capsule.is-dropping {
    animation: none;
  }
}
</style>
