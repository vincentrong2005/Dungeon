<template>
  <span class="main-button-skin" :style="skinStyle" aria-hidden="true"></span>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

type SkinName =
  | 'settings'
  | 'deck'
  | 'inventory'
  | 'bonds'
  | 'map'
  | 'magicBook'
  | 'magicHat'
  | 'fullscreen'
  | 'load'
  | 'variableUpdate'
  | 'help'
  | 'collapse'
  | 'expand'
  | 'statusDetails'
  | 'lock'
  | 'close';

const props = defineProps<{ skin: SkinName }>();

const atlasUrl =
  'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E4%B8%BB%E7%95%8C%E9%9D%A2/%E6%8C%89%E9%92%AE%E5%9B%BE%E6%A0%87.png?v=20261003-atlas16';

const cells: Record<SkinName, readonly [number, number]> = {
  settings: [0, 0],
  deck: [1, 0],
  inventory: [2, 0],
  bonds: [3, 0],
  map: [0, 1],
  magicBook: [1, 1],
  magicHat: [2, 1],
  fullscreen: [3, 1],
  load: [0, 2],
  variableUpdate: [1, 2],
  help: [2, 2],
  collapse: [3, 2],
  expand: [0, 3],
  statusDetails: [1, 3],
  lock: [2, 3],
  close: [3, 3],
};

const atlasSize = 1254;
const gridEdges = [0, 314, 627, 941, 1254] as const;

const skinStyle = computed<CSSProperties>(() => {
  const [column, row] = cells[props.skin];
  const x = gridEdges[column];
  const y = gridEdges[row];
  const width = gridEdges[column + 1] - x;
  const height = gridEdges[row + 1] - y;
  return {
    backgroundImage: `url("${atlasUrl}")`,
    backgroundSize: `${(atlasSize / width) * 100}% ${(atlasSize / height) * 100}%`,
    backgroundPosition: `${(x / (atlasSize - width)) * 100}% ${(y / (atlasSize - height)) * 100}%`,
  };
});
</script>

<style scoped>
.main-button-skin {
  position: absolute;
  inset: 0;
  display: block;
  background-repeat: no-repeat;
  pointer-events: none;
}
</style>
