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

type MenuSkinName =
  | 'menuBattle'
  | 'menuCleanse'
  | 'menuChest'
  | 'menuShop'
  | 'menuIdol'
  | 'menuEvent'
  | 'menuMap'
  | 'menuRebirth';

type MainButtonSkinName = SkinName | MenuSkinName;

const props = defineProps<{ skin: MainButtonSkinName }>();

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

const menuAtlasUrl =
  'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E4%B8%BB%E7%95%8C%E9%9D%A2/%E8%8F%9C%E5%8D%95%E6%8C%89%E9%92%AE.png?v=20261008-menu-buttons';

// The new atlas has two columns and four rows. These crops trim the transparent
// gutters around each wide action button while keeping its original aspect ratio.
const menuCrops: Record<MenuSkinName, readonly [number, number, number, number]> = {
  menuBattle: [70, 82, 810, 166],
  menuCleanse: [893, 82, 810, 166],
  menuChest: [70, 266, 810, 166],
  menuShop: [893, 266, 810, 166],
  menuIdol: [70, 450, 810, 166],
  menuEvent: [893, 450, 810, 166],
  menuMap: [70, 636, 810, 166],
  menuRebirth: [893, 636, 810, 166],
};

const atlasSize = 1254;
const gridEdges = [0, 314, 627, 941, 1254] as const;

const skinStyle = computed<CSSProperties>(() => {
  const menuCrop = menuCrops[props.skin as MenuSkinName];
  if (menuCrop) {
    const [x, y, width, height] = menuCrop;
    const atlasWidth = 1774;
    const atlasHeight = 887;
    return {
      backgroundImage: `url("${menuAtlasUrl}")`,
      backgroundSize: `${(atlasWidth / width) * 100}% ${(atlasHeight / height) * 100}%`,
      backgroundPosition: `${(x / (atlasWidth - width)) * 100}% ${(y / (atlasHeight - height)) * 100}%`,
    };
  }

  const [column, row] = cells[props.skin as SkinName];
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
