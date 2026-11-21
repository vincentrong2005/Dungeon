/**
 * 小游戏美术素材（图床：地牢/素材库/小游戏）。
 * 本地预览时可在全局设置 __DUNGEON_MINIGAME_ASSET_BASE__ 指向本地目录，素材审核通过后再上传图床。
 */

const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const MINIGAME_ASSET_DIR = '地牢/素材库/小游戏';
const STAT_ICON_DIR = '地牢/素材库/通用UI/属性图标';

const encodeRepoPath = (repoPath: string) => repoPath.split('/').map(encodeURIComponent).join('/');

const getPreviewBase = (): string | undefined =>
  (globalThis as { __DUNGEON_MINIGAME_ASSET_BASE__?: string }).__DUNGEON_MINIGAME_ASSET_BASE__;

export const minigameAssetUrl = (file: string): string => {
  const base = getPreviewBase();
  return base ? `${base}/${encodeURIComponent(file)}` : `${IMAGE_CDN_ROOT}/${encodeRepoPath(`${MINIGAME_ASSET_DIR}/${file}`)}`;
};

/** 已在图床上的属性图标（骰子等），小游戏直接复用 */
const statIconUrl = (name: string) => `${IMAGE_CDN_ROOT}/${encodeRepoPath(`${STAT_ICON_DIR}/${name}.webp`)}`;

export type MinigameIconKey =
  | 'coin'
  | 'coins'
  | 'elixir'
  | 'rubyHeart'
  | 'amethyst'
  | 'chest'
  | 'candy'
  | 'hourglass'
  | 'prank'
  | 'crown'
  | 'cardBack'
  | 'curseCard'
  | 'dice';

const ICON_FILES: Record<Exclude<MinigameIconKey, 'dice'>, string> = {
  coin: '图标-金币.webp',
  coins: '图标-金币堆.webp',
  elixir: '图标-治疗药剂.webp',
  rubyHeart: '图标-红宝石之心.webp',
  amethyst: '图标-紫水晶.webp',
  chest: '图标-宝箱.webp',
  candy: '图标-兔耳软糖.webp',
  hourglass: '图标-空沙漏.webp',
  prank: '图标-恶作剧.webp',
  crown: '图标-头奖王冠.webp',
  cardBack: '图标-卡牌.webp',
  curseCard: '图标-诅咒卡.webp',
};

export const minigameIconUrl = (key: MinigameIconKey): string =>
  key === 'dice' ? statIconUrl('骰子') : minigameAssetUrl(ICON_FILES[key]);

export const MINIGAME_ART = {
  wheelRing: '转盘-外环.webp',
  wheelHub: '转盘-轴心.webp',
  gachaSmall: '扭蛋机-精密小扭蛋机.webp',
  gachaBig: '扭蛋机-限金大型扭蛋机.webp',
  capsuleViolet: '扭蛋-紫.webp',
  capsuleGold: '扭蛋-金.webp',
  capsuleCrimson: '扭蛋-红.webp',
  magicCircle: '占卜-魔法阵.webp',
  sealedTile: '占卜-封印格.webp',
} as const;

export const minigameArtUrl = (key: keyof typeof MINIGAME_ART): string => minigameAssetUrl(MINIGAME_ART[key]);

/** 全部素材文件名（上传图床 / 预加载用） */
export const ALL_MINIGAME_ASSET_FILES: readonly string[] = [...Object.values(ICON_FILES), ...Object.values(MINIGAME_ART)];
