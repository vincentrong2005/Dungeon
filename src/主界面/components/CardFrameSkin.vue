<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <span class="card-frame-skin" :class="{ 'card-frame-skin--rare': rare }" :style="frameStyle" aria-hidden="true"></span>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

export type CardFrameType = 'physical' | 'magic' | 'function' | 'dodge' | 'curse' | 'active';

const props = defineProps<{ type: CardFrameType; rare?: boolean }>();

const atlasUrl =
  'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E6%88%98%E6%96%97%E7%95%8C%E9%9D%A2/%E5%8D%A1%E7%89%8C%E8%BE%B9%E6%A1%86.png?v=20261003-six-frames';

const frameBoxes: Record<CardFrameType, readonly [number, number, number, number]> = {
  physical: [64, 2, 384, 551],
  magic: [486, 2, 408, 551],
  function: [59, 552, 391, 558],
  dodge: [475, 555, 425, 557],
  curse: [47, 1110, 413, 554],
  active: [481, 1112, 417, 552],
};

const atlasWidth = 940;
const atlasHeight = 1672;

const frameStyle = computed<CSSProperties>(() => {
  const [x, y, width, height] = frameBoxes[props.type];
  return {
    backgroundImage: `url("${atlasUrl}")`,
    backgroundSize: `${(atlasWidth / width) * 100}% ${(atlasHeight / height) * 100}%`,
    backgroundPosition: `${(x / (atlasWidth - width)) * 100}% ${(y / (atlasHeight - height)) * 100}%`,
  };
});
</script>

<style scoped>
.card-frame-skin {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: block;
  background-repeat: no-repeat;
  pointer-events: none;
  user-select: none;
}

.card-frame-skin--rare {
  filter: drop-shadow(0 0 3px rgba(255, 214, 100, 0.72)) drop-shadow(0 0 8px rgba(255, 169, 34, 0.32));
}
</style>
