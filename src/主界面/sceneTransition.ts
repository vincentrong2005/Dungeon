// 场景转场（墨迹滴落 → 全黑停留 → 墨迹散开）
// 用法：await runSceneTransition(async () => { ...切换场景、加载资源... })
// - 覆盖动画（01→11）播完后执行 task；task 期间以及新场景图片加载完成前，画面停在全黑的 11 帧；
// - 然后播放揭幕动画（21→33）。
// - 转场进行中再次调用会直接执行 task（不叠加动画）；未挂载转场层或用户偏好减少动态效果时同样直接执行。
import { nextTick, reactive } from 'vue';

export type SceneTransitionPhase = 'idle' | 'cover' | 'hold' | 'reveal';

export const sceneTransitionState = reactive({
  phase: 'idle' as SceneTransitionPhase,
  /** 每次转场递增，供转场层重启动画 */
  run: 0,
});

/** 覆盖 / 揭幕动画的最长等待（防止转场层异常时卡死） */
const PHASE_TIMEOUT_MS = 2500;
/** 新场景图片加载的最长等待 */
const IMAGE_WAIT_TIMEOUT_MS = 6000;

let hostCount = 0;
let active = false;
let phaseDone: (() => void) | null = null;

export const registerSceneTransitionHost = () => {
  hostCount += 1;
  return () => {
    hostCount = Math.max(0, hostCount - 1);
  };
};

/** 由转场层在覆盖或揭幕动画播放完毕时调用 */
export const notifySceneTransitionPhaseDone = () => {
  const done = phaseDone;
  phaseDone = null;
  done?.();
};

export const isSceneTransitionActive = () => active;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const playPhase = (phase: 'cover' | 'reveal') =>
  new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      phaseDone = null;
      resolve();
    }, PHASE_TIMEOUT_MS);
    phaseDone = () => {
      clearTimeout(timer);
      resolve();
    };
    sceneTransitionState.phase = phase;
  });

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

/** 等待当前可见的图片加载完成（新场景的背景、立绘等），超时后放行 */
const waitForVisibleImages = async () => {
  await nextTick();
  await nextFrame();
  await nextFrame();
  const pending = Array.from(document.images).filter(img => !img.complete && img.getClientRects().length > 0);
  if (pending.length === 0) return;
  await Promise.race([
    Promise.all(
      pending.map(
        img =>
          new Promise<void>(resolve => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    ),
    new Promise<void>(resolve => setTimeout(resolve, IMAGE_WAIT_TIMEOUT_MS)),
  ]);
};

export async function runSceneTransition<T>(task: () => T | Promise<T>): Promise<T> {
  if (active || hostCount === 0 || prefersReducedMotion()) return await task();
  active = true;
  sceneTransitionState.run += 1;
  try {
    await playPhase('cover');
    sceneTransitionState.phase = 'hold';
    const result = await task();
    await waitForVisibleImages();
    return result;
  } finally {
    await playPhase('reveal');
    sceneTransitionState.phase = 'idle';
    active = false;
  }
}
