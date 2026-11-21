// 圣遗物统一图标：按稀有度区分的魔法光球（宝箱房 / 商店 / 背包 / 图鉴 / 提示框等所有圣遗物场景共用）
import type { RelicRarity } from './battle/relicRegistry';

const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';

const toOrbUrl = (name: string) =>
  `${IMAGE_CDN_ROOT}/${encodeURIComponent(`地牢/素材库/宝箱房/${name}.webp`).replace(/%2F/g, '/')}`;

export const RELIC_ORB_URLS: Readonly<Record<RelicRarity, string>> = {
  普通: toOrbUrl('光球-普通'),
  稀有: toOrbUrl('光球-稀有'),
  传奇: toOrbUrl('光球-传奇'),
};

/** 稀有度未知或不在表内时回退为普通光球 */
export const getRelicOrbUrl = (rarity: string | null | undefined): string =>
  RELIC_ORB_URLS[rarity as RelicRarity] ?? RELIC_ORB_URLS.普通;
