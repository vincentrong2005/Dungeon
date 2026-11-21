// 宝箱房场景素材（固定背景 + 对齐的三态宝箱精灵 + 特效层）。CDN 与 D:\SillyTavern_Image 素材库同步。
import { RELIC_ORB_URLS } from './relicOrbs';

const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const CHEST_ASSET_DIR = '地牢/素材库/宝箱房';

const toChestAssetUrl = (name: string) =>
  `${IMAGE_CDN_ROOT}/${encodeURIComponent(`${CHEST_ASSET_DIR}/${name}.webp`).replace(/%2F/g, '/')}`;

export const CHEST_ROOM_ASSETS = {
  background: toChestAssetUrl('宝箱房背景'),
  chestClosed: toChestAssetUrl('宝箱-关闭'),
  chestOpened: toChestAssetUrl('宝箱-开启'),
  chestMimic: toChestAssetUrl('宝箱-宝箱怪'),
  burst: toChestAssetUrl('开箱光爆'),
  dust: [toChestAssetUrl('尘埃1'), toChestAssetUrl('尘埃2'), toChestAssetUrl('尘埃3')],
  orbs: RELIC_ORB_URLS,
} as const;

/** 进入宝箱房前需要预加载的全部图片 */
export const CHEST_ROOM_PRELOAD_URLS: readonly string[] = [
  CHEST_ROOM_ASSETS.background,
  CHEST_ROOM_ASSETS.chestClosed,
  CHEST_ROOM_ASSETS.chestOpened,
  CHEST_ROOM_ASSETS.chestMimic,
  CHEST_ROOM_ASSETS.burst,
  ...CHEST_ROOM_ASSETS.dust,
  ...Object.values(CHEST_ROOM_ASSETS.orbs),
];
