export interface EffectFrame {
  index: number;
  interpolate: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  alpha: number;
  imageSource: number;
  flip: boolean;
  blend: number;
}

export interface EffectLayer {
  frames: readonly EffectFrame[];
  parent?: number;
}

export function sampleEffectFrame(frames: readonly EffectFrame[], position: number): EffectFrame | null {
  if (!frames.length || position < frames[0]!.index) return null;
  let index = 0;
  while (index + 1 < frames.length && frames[index + 1]!.index <= position) index++;
  const from = frames[index]!;
  const to = frames[index + 1];
  if (!to || !to.interpolate) return from;
  const t = Math.max(0, Math.min(1, (position - from.index) / (to.index - from.index)));
  const result = { ...from };
  for (const key of ['x', 'y', 'width', 'height', 'rotation', 'alpha'] as const) {
    result[key] = from[key] + (to[key] - from[key]) * t;
  }
  result.imageSource = Math.round(from.imageSource + (to.imageSource - from.imageSource) * t);
  return result;
}
