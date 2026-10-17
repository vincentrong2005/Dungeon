<template>
  <div ref="host" class="battle-fx-layer" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { gsap } from 'gsap';
import { Application, Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { BATTLE_TEXTURES, EFFECT_SCALES, STUN_IMAGE, TIMELINES } from '../presentation/feedbackRegistry';
import { feedbackAssetUrl } from '../presentation/mediaAssets';
import { sampleEffectFrame, type EffectFrame, type EffectLayer } from '../presentation/timeline';
import type { BattleFeedbackEntry } from '../presentation/useBattleFeedback';

const props = defineProps<{ entries: BattleFeedbackEntry[] }>();
const host = ref<HTMLDivElement | null>(null);
let app: Application | null = null;
let disposed = false;
let ready = false;
const active = new Map<number, { container: Container; animation: gsap.core.Tween }>();
const loading = new Map<string, Promise<Texture | null>>();
const cropped = new Map<string, Texture>();
let preparation: Promise<void> | null = null;
let rendererReady = false;
const initializing = new Set<number>();
const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadTexture(path: string) {
  const cached = loading.get(path);
  if (cached) return cached;
  const task = Assets.load<Texture>({ src: feedbackAssetUrl(path), parser: 'loadTextures' })
    .catch(error => { loading.delete(path); console.debug('[feedback] Texture unavailable:', path, error); return null; });
  loading.set(path, task);
  return task;
}

function targetBounds(target: string) {
  const root = host.value?.parentElement;
  const overlay = host.value;
  if (!root || !overlay) return null;
  const origin = overlay.getBoundingClientRect();
  const scaleX = origin.width / overlay.clientWidth;
  const scaleY = origin.height / overlay.clientHeight;
  if (!scaleX || !scaleY) return null;
  const element = [...root.querySelectorAll<HTMLElement>('[data-feedback-target]')].find(item => item.dataset.feedbackTarget === target);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: (rect.left - origin.left + rect.width * 0.5) / scaleX,
    y: (rect.top - origin.top + rect.height * 0.5) / scaleY,
    width: rect.width / scaleX, height: rect.height / scaleY,
  };
}

function remove(id: number) {
  const item = active.get(id);
  if (!item) return;
  item.animation.kill();
  item.container.destroy({ children: true });
  active.delete(id);
}

function positionEffectSprite(sprite: Sprite, frame: EffectFrame, centered: boolean) {
  sprite.anchor.set(centered ? 0.5 : 0);
  sprite.position.set(frame.x + (centered ? frame.width / 2 : 0), frame.y + (centered ? frame.height / 2 : 0));
  sprite.scale.set(1);
  sprite.width = Math.abs(frame.width);
  sprite.height = Math.abs(frame.height);
  if (frame.width < 0) sprite.scale.x *= -1;
  if (frame.height < 0) sprite.scale.y *= -1;
  if (frame.flip) {
    sprite.scale.x *= -1;
    if (!centered) sprite.x += frame.width;
  }
}

function effectVerticalOffset(effect: BattleFeedbackEntry['effect'], target: string, height: number) {
  if (effect === 'burn') return height * 0.35;
  if (target === 'player' && (effect === 'armor' || effect === 'bind')) return height * 0.22;
  return 0;
}

async function start(entry: BattleFeedbackEntry) {
  const renderer = app;
  if (!renderer || initializing.has(entry.id)) return;
  initializing.add(entry.id);
  const stun = entry.effect === 'stun';
  const timeline = stun ? null : TIMELINES[entry.effect as keyof typeof TIMELINES];
  const imageSources = timeline?.images ?? [null, STUN_IMAGE];
  await Promise.all(imageSources.filter(image => image !== null).map(image => loadTexture(image.path)));
  initializing.delete(entry.id);
  if (disposed || !ready || !props.entries.some(current => current.id === entry.id)) return;
  const elapsed = (performance.now() - entry.created) / 1000;
  if (elapsed >= entry.duration) return;
  const container = new Container();
  const layers: EffectLayer[] = timeline?.layers ?? [{ frames: [
    { index: 0, interpolate: true, x: -64, y: -110, width: 128, height: 128, rotation: 0, alpha: 1, imageSource: 1, flip: false, blend: 0 },
    { index: 18, interpolate: true, x: -64, y: -110, width: 128, height: 128, rotation: 180, alpha: 0, imageSource: 1, flip: false, blend: 0 },
  ] }];
  const displays: { container: Container; sprite: Sprite }[] = [];
  for (const layer of layers) {
    const group = new Container();
    const sprite = new Sprite();
    group.addChild(sprite);
    (layer.parent === undefined ? container : displays[layer.parent]!.container).addChild(group);
    displays.push({ container: group, sprite });
  }
  renderer.stage.addChild(container);
  const state = { progress: elapsed / entry.duration };
  function draw() {
    const bounds = targetBounds(entry.target);
    if (!bounds || !host.value) { container.visible = false; return; }
    container.visible = true;
    container.position.set(bounds.x, bounds.y + effectVerticalOffset(entry.effect, entry.target, bounds.height));
    const size = Math.max(96, Math.min(280, bounds.height * 0.7, host.value.clientWidth * 0.42));
    const scale = size / (stun ? 180 : 512) * (EFFECT_SCALES[entry.effect] ?? 1);
    container.scale.set(scale);
    // Drain travels toward the opponent, so mirror its trajectory for the left-side player.
    if (entry.effect === 'manaDrain' && entry.target === 'player') container.scale.x *= -1;
    container.alpha = entry.phase === 'blocked' ? 0.35 : 1;
    if (reducedMotion) container.alpha *= 0.5;
    layers.forEach((layer, index) => {
      const frame = sampleEffectFrame(layer.frames, state.progress * ((timeline?.totalFrames ?? 19) - 1));
      const { container: group, sprite } = displays[index]!;
      group.visible = !!frame;
      if (!frame) return;
      group.position.set(0);
      group.angle = 0;
      group.alpha = 1;
      // The original engine keeps child transforms even when the parent has no image.
      const isGroup = frame.imageSource === 0;
      const display = isGroup ? group : sprite;
      display.position.set(frame.x, frame.y);
      display.angle = reducedMotion ? 0 : frame.rotation;
      display.alpha = frame.alpha;
      if (isGroup) { sprite.visible = false; return; }
      const source = imageSources[frame.imageSource];
      const base = source && Assets.get<Texture>(feedbackAssetUrl(source.path));
      if (!source || !base) { sprite.visible = false; return; }
      sprite.visible = true;
      const key = `${source.path}:${source.x}:${source.y}:${source.width}:${source.height}`;
      let texture = cropped.get(key);
      if (!texture) {
        texture = new Texture({ source: base.source, frame: new Rectangle(-source.x, -source.y, source.width, source.height) });
        cropped.set(key, texture);
      }
      sprite.texture = texture;
      positionEffectSprite(sprite, frame, stun);
    });
  }
  const animation = gsap.to(state, {
    progress: 1, duration: Math.max(0.01, entry.duration - elapsed), ease: 'none',
    onUpdate: draw, onComplete: () => remove(entry.id),
  });
  active.set(entry.id, { container, animation });
  draw();
}

function synchronize() {
  if (!ready) return;
  for (const id of active.keys()) if (!props.entries.some(entry => entry.id === id)) remove(id);
  for (const entry of props.entries) if (!active.has(entry.id)) void start(entry);
}
watch(() => props.entries, synchronize);
function prepare(): Promise<void> {
  if (preparation) return preparation;
  preparation = (async () => {
    if (!rendererReady) {
      const renderer = new Application();
      app = renderer;
      await renderer.init({ resizeTo: host.value!, backgroundAlpha: 0, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, antialias: false });
      if (disposed) { renderer.destroy(true, { children: true }); throw new Error('Battle disposed'); }
      host.value!.appendChild(renderer.canvas);
      rendererReady = true;
    }
    const textures = await Promise.all(BATTLE_TEXTURES.map(loadTexture));
    const missing = BATTLE_TEXTURES.filter((_path, index) => !textures[index]);
    if (missing.length) throw new Error(`特效加载失败: ${missing.join(', ')}`);
    if (disposed) throw new Error('Battle disposed');
    ready = true;
    synchronize();
  })().catch(error => { preparation = null; throw error; });
  return preparation;
}
defineExpose({ prepare });
onMounted(() => { void prepare().catch(() => undefined); });
onUnmounted(() => {
  disposed = true;
  for (const id of [...active.keys()]) remove(id);
  for (const texture of cropped.values()) texture.destroy(false);
  cropped.clear();
  if (rendererReady) app?.destroy(true, { children: true });
  ready = false;
});
</script>

<style scoped>
.battle-fx-layer { position: absolute; inset: 0; z-index: 20; overflow: hidden; pointer-events: none; }
.battle-fx-layer :deep(canvas) { display: block; width: 100%; height: 100%; }
</style>
