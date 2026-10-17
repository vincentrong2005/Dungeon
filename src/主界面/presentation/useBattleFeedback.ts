import { onMounted, onUnmounted, ref, watch } from 'vue';
import { ACTION_SOUNDS, battleSounds, BATTLE_SOUNDS, CARD_HIT_EFFECTS, TIMELINES, type BattleEffectName } from './feedbackRegistry';
import type { CardType } from '../types';
import { battleEffectsEnabled, playSfx, preloadSfx, stopSfx } from '../sfx';

export interface BattleFeedbackEntry {
  id: number;
  effect: BattleEffectName;
  target: string;
  phase: 'apply' | 'proc' | 'blocked';
  duration: number;
  created: number;
}

export function effectDuration(effect: BattleEffectName) {
  return effect === 'stun' ? 0.65 : TIMELINES[effect].totalFrames / TIMELINES[effect].fps;
}

export function useBattleFeedback() {
  const entries = ref<BattleFeedbackEntry[]>([]);
  const owner = {};
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let nextId = 0;
  let active = false;
  let suspended = false;

  function clear() {
    entries.value = [];
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    stopSfx(owner);
  }

  function remove(id: number) {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    entries.value = entries.value.filter(entry => entry.id !== id);
  }

  function effect(effectName: BattleEffectName, target: string, phase: BattleFeedbackEntry['phase'] = 'proc') {
    if (!active || suspended || document.hidden || phase === 'apply') return;
    const now = performance.now();
    // Every settlement is a separate event, including simultaneous sides and rapid multi-hits.
    playSfx(battleSounds(effectName), { owner, priority: effectName === 'clash' ? 3 : 2 });
    if (!battleEffectsEnabled.value) return;
    if (entries.value.length >= 24) {
      const expendable = entries.value.find(entry => entry.phase !== 'proc');
      if (!expendable && phase !== 'proc') return;
      remove((expendable ?? entries.value[0])!.id);
    }
    const entry: BattleFeedbackEntry = {
      id: ++nextId, effect: effectName, target, phase,
      duration: effectDuration(effectName), created: now,
    };
    entries.value = [...entries.value, entry];
    timers.set(entry.id, setTimeout(() => remove(entry.id), entry.duration * 1000 + 40));
  }

  function action(name: keyof typeof ACTION_SOUNDS) {
    if (active && !suspended) playSfx(ACTION_SOUNDS[name], { owner, priority: 1, key: `action:${name}` });
  }

  function hit(type: CardType, target: string) {
    const effectName = CARD_HIT_EFFECTS[type];
    if (effectName) effect(effectName, target);
  }

  const prepare = () => preloadSfx(BATTLE_SOUNDS, { required: true });

  function stop() { suspended = true; clear(); }
  function onVisibility() { if (document.hidden) clear(); }
  onMounted(() => {
    active = true;
    document.addEventListener('visibilitychange', onVisibility);
  });
  watch(battleEffectsEnabled, enabled => { if (!enabled) { entries.value = []; for (const timer of timers.values()) clearTimeout(timer); timers.clear(); } });
  onUnmounted(() => { active = false; stop(); document.removeEventListener('visibilitychange', onVisibility); });
  return { entries, effect, action, hit, prepare, stop };
}
