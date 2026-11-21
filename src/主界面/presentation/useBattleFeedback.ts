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
  /** 多段命中排队：同一目标的同名特效按 STAGGER_GAP 依次播放，而不是叠在同一时刻 */
  const queued = new Set<ReturnType<typeof setTimeout>>();
  const nextSlot = new Map<string, number>();
  let nextId = 0;
  let active = false;
  let suspended = false;

  function clear() {
    entries.value = [];
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    for (const timer of queued) clearTimeout(timer);
    queued.clear();
    nextSlot.clear();
    stopSfx(owner);
  }

  function remove(id: number) {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    entries.value = entries.value.filter(entry => entry.id !== id);
  }

  const STAGGER_GAP = 200;
  const STAGGER_LIMIT = 1000;

  function effect(
    effectName: BattleEffectName,
    target: string,
    phase: BattleFeedbackEntry['phase'] = 'proc',
    options: { minor?: boolean } = {},
  ) {
    if (!active || suspended || document.hidden || phase === 'apply') return;
    const now = performance.now();
    // 次要特效（状态施加、圣遗物）在目标已有其它特效时让路
    if (options.minor && entries.value.some(entry => entry.target === target && now - entry.created < 400)) return;
    // 同一目标的同名特效（多段命中）依次错开播放，每段都能看清；排队过长时丢弃多出的部分
    const key = `${effectName}|${target}`;
    const slot = nextSlot.get(key) ?? 0;
    if (now < slot) {
      const delay = slot - now;
      if (delay > STAGGER_LIMIT) return;
      nextSlot.set(key, slot + STAGGER_GAP);
      const timer = setTimeout(() => {
        queued.delete(timer);
        if (active && !suspended && !document.hidden) start(effectName, target, phase);
      }, delay);
      queued.add(timer);
      return;
    }
    nextSlot.set(key, now + STAGGER_GAP);
    start(effectName, target, phase);
  }

  function start(effectName: BattleEffectName, target: string, phase: BattleFeedbackEntry['phase']) {
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

  function hit(type: CardType, target: string, override?: BattleEffectName | null) {
    const effectName = override ?? CARD_HIT_EFFECTS[type];
    if (effectName) effect(effectName, target);
  }

  const prepare = () => preloadSfx(BATTLE_SOUNDS, { required: true });
  /** 预热本场战斗可能用到的非核心特效音效（失败不影响战斗） */
  const warm = (effects: readonly BattleEffectName[]) => preloadSfx(effects.flatMap(battleSounds));

  function stop() { suspended = true; clear(); }
  function onVisibility() { if (document.hidden) clear(); }
  onMounted(() => {
    active = true;
    document.addEventListener('visibilitychange', onVisibility);
  });
  watch(battleEffectsEnabled, enabled => { if (!enabled) { entries.value = []; for (const timer of timers.values()) clearTimeout(timer); timers.clear(); } });
  onUnmounted(() => { active = false; stop(); document.removeEventListener('visibilitychange', onVisibility); });
  return { entries, effect, action, hit, prepare, warm, stop };
}
