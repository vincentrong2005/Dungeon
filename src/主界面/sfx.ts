import { readonly, ref } from 'vue';
import { ACTION_SOUNDS, UI_SOUNDS, type FeedbackSound, type UiSound } from './presentation/feedbackRegistry';
import { fetchFeedbackAsset } from './presentation/mediaAssets';

const volumeState = ref(0.45);
const mutedState = ref(false);
const effectsState = ref(true);
export const sfxVolume = readonly(volumeState);
export const sfxMuted = readonly(mutedState);
export const battleEffectsEnabled = readonly(effectsState);

let context: AudioContext | null = null;
let output: GainNode | null = null;
let initialized = false;
let generation = 0;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();
const groups = new Set<{ owner: object | undefined; priority: number; nodes: AudioBufferSourceNode[]; stop: () => void }>();
const recent = new Map<string, number>();
let gestureSound: UiSound | 'none' | null = null;
let gestureActive = false;
let gestureSilent = false;
let gestureTimer: ReturnType<typeof setTimeout> | null = null;

const persist = (key: string, value: unknown) => {
  try { localStorage.setItem(`dungeon.feedback.${key}`, String(value)); } catch { /* Storage may be unavailable in an iframe. */ }
};

const gainValue = () => mutedState.value ? 0 : volumeState.value;
export function setSfxVolume(value: number) {
  volumeState.value = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  persist('volume', volumeState.value);
  if (output && context) output.gain.setValueAtTime(gainValue(), context.currentTime);
  if (volumeState.value === 0) stopSfx();
}
export function setSfxMuted(value: boolean) {
  mutedState.value = value;
  persist('muted', value);
  if (output && context) output.gain.setValueAtTime(gainValue(), context.currentTime);
  if (value) stopSfx();
}
export function setBattleEffectsEnabled(value: boolean) {
  effectsState.value = value;
  persist('effects', value);
}

function ensureContext() {
  if (context) return context;
  if (typeof AudioContext === 'undefined') return null;
  context = new AudioContext();
  output = context.createGain();
  output.gain.value = gainValue();
  output.connect(context.destination);
  return context;
}

export function unlockSfx() {
  const audio = ensureContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => undefined);
}

async function loadSound(path: string): Promise<AudioBuffer | null> {
  const audio = context;
  if (!audio) return null;
  const cached = buffers.get(path);
  if (cached) return cached;
  const existing = pending.get(path);
  if (existing) return existing;
  const stamp = generation;
  const task = fetchFeedbackAsset(path).then(bytes => audio.decodeAudioData(bytes)).then(buffer => {
    if (stamp !== generation) return null;
    buffers.set(path, buffer);
    return buffer;
  }).catch(error => {
    if (stamp === generation) {
      console.debug('[feedback] Audio unavailable:', path, error);
    }
    return null;
  }).finally(() => { if (stamp === generation) pending.delete(path); });
  pending.set(path, task);
  return task;
}

export async function preloadSfx(sounds: readonly FeedbackSound[], options: { required?: boolean } = {}) {
  ensureContext();
  const paths = [...new Set(sounds.map(sound => sound.path))];
  const loaded = await Promise.all(paths.map(path => loadSound(path)));
  const missing = paths.filter((_path, index) => !loaded[index]);
  if (options.required && missing.length) throw new Error(`音效加载失败: ${missing.join(', ')}`);
}

export function stopSfx(owner?: object) {
  for (const group of [...groups]) if (!owner || group.owner === owner) group.stop();
}

export function playSfx(
  sounds: readonly FeedbackSound[],
  options: { owner?: object; priority?: number; key?: string } = {},
) {
  const audio = context;
  if (!audio || audio.state !== 'running' || document.hidden || gainValue() <= 0 || !sounds.length) return;
  const now = performance.now();
  if (options.key && now - (recent.get(options.key) ?? -Infinity) < 80) return;
  const decoded = sounds.map(sound => buffers.get(sound.path));
  if (decoded.some(buffer => !buffer)) {
    void preloadSfx(sounds);
    return;
  }
  const priority = options.priority ?? 1;
  while (groups.size >= 24 || [...groups].reduce((sum, group) => sum + group.nodes.length, 0) + sounds.length > 48) {
    const lowest = [...groups].sort((a, b) => a.priority - b.priority)[0];
    if (!lowest || lowest.priority > priority) return;
    lowest.stop();
  }
  if (options.key) {
    recent.set(options.key, now);
    if (recent.size > 64) recent.delete(recent.keys().next().value!);
  }
  const group = { owner: options.owner, priority, nodes: [] as AudioBufferSourceNode[], stop: () => {} };
  const gainNodes: GainNode[] = [];
  let remaining = sounds.length;
  group.stop = () => {
    for (const node of group.nodes) { try { node.stop(); } catch { /* Already stopped. */ } node.disconnect(); }
    for (const gain of gainNodes) gain.disconnect();
    groups.delete(group);
  };
  groups.add(group);
  sounds.forEach((sound, index) => {
    const node = audio.createBufferSource();
    const gain = audio.createGain();
    node.buffer = decoded[index]!;
    node.playbackRate.value = sound.rate;
    node.connect(gain);
    gain.connect(output!);
    gainNodes.push(gain);
    group.nodes.push(node);
    const start = audio.currentTime + 0.005 + (sound.start ?? 0);
    const duration = Math.min(node.buffer.duration / sound.rate, (sound.end ?? Infinity) - (sound.start ?? 0));
    gain.gain.setValueAtTime(sound.volume, start);
    if (Number.isFinite(duration)) {
      gain.gain.setValueAtTime(sound.volume, start + Math.max(0, duration - 0.02));
      gain.gain.linearRampToValueAtTime(0, start + duration);
    }
    node.onended = () => { if (--remaining === 0) group.stop(); };
    node.start(start);
    node.stop(start + duration);
  });
}

export function playUiSfx(sound: UiSound | 'none') {
  // A silent selection can still report a rejected action during the same click.
  if (gestureActive) { if (!gestureSilent || sound === 'invalid') gestureSound = sound; return; }
  if (sound !== 'none') playSfx(UI_SOUNDS[sound], { priority: 2, key: `ui:${sound}` });
}

function handleClick(event: MouseEvent) {
  unlockSfx();
  const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-ui-sound], button, [role="button"]') : null;
  const specified = element?.dataset.uiSound;
  gestureSilent = !!element?.closest('[data-ui-sound="none"]');
  const sound = gestureSilent ? 'none' : specified && specified in UI_SOUNDS ? specified as UiSound : 'select';
  gestureActive = true;
  gestureSound = element && !element.matches(':disabled, [aria-disabled="true"]') ? sound : 'none';
  if (gestureTimer) clearTimeout(gestureTimer);
  gestureTimer = setTimeout(() => {
    gestureTimer = null;
    const selected = gestureSound;
    gestureActive = false;
    gestureSilent = false;
    gestureSound = null;
    if (selected && selected !== 'none') playSfx(UI_SOUNDS[selected], { priority: 2, key: `ui:${selected}` });
  }, 0);
}

function onVisibility() { if (document.hidden) stopSfx(); }
export function initializeSfx() {
  if (initialized) return;
  initialized = true;
  try {
    const raw = localStorage.getItem('dungeon.feedback.volume');
    const parsed = raw === null ? 0.45 : Number(raw);
    volumeState.value = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.45;
    mutedState.value = localStorage.getItem('dungeon.feedback.muted') === 'true';
    effectsState.value = localStorage.getItem('dungeon.feedback.effects') !== 'false';
  } catch { /* Use defaults when storage is unavailable. */ }
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', unlockSfx, true);
  document.addEventListener('visibilitychange', onVisibility);
  void preloadSfx([...Object.values(UI_SOUNDS).flat(), ...Object.values(ACTION_SOUNDS).flat()]);
}

export function disposeSfx() {
  generation++;
  initialized = false;
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', unlockSfx, true);
  document.removeEventListener('visibilitychange', onVisibility);
  stopSfx();
  if (gestureTimer) clearTimeout(gestureTimer);
  gestureTimer = null;
  gestureActive = false;
  gestureSilent = false;
  gestureSound = null;
  void context?.close().catch(() => undefined);
  context = null;
  output = null;
  buffers.clear();
  pending.clear();
  recent.clear();
}
