export const FLOOR_MAP: Record<string, string[]> = {
  第一层: ['魔女的小窝', '粘液之沼', '发情迷雾森林', '喷精泉眼', '触手菌窟', '肉欲食人花圃'],
  第二层: ['禁忌图书馆', '呻吟阅览室', '催情墨染湖', '性癖记录馆', '淫乱教职工宿舍'],
  第三层: ['欲望监狱', '吸血鬼古堡', '调教审判庭', '触手水牢', '人偶工坊'],
  第四层: ['虚空宫殿', '镜之舞厅', '双子寝宫', '春梦回廊', '极乐宴会厅'],
  第五层: ['交媾祭坛', '圣水之海', '苦修之路', '神谕淫纹室', '女神的产房'],
};

export const FLOOR_ORDER = ['第一层', '第二层', '第三层', '第四层', '第五层'] as const;

const FLOOR_NUMBER_MAP: Record<string, number> = {
  第一层: 1,
  第二层: 2,
  第三层: 3,
  第四层: 4,
  第五层: 5,
};

export function getFloorForArea(area: string): string | null {
  for (const [floorName, areas] of Object.entries(FLOOR_MAP)) {
    if (areas.includes(area)) return floorName;
  }
  return null;
}

export function getNextFloor(currentFloor: string): string | null {
  const idx = FLOOR_ORDER.indexOf(currentFloor as (typeof FLOOR_ORDER)[number]);
  if (idx < 0 || idx >= FLOOR_ORDER.length - 1) return null;
  return FLOOR_ORDER[idx + 1];
}

export function getFloorNumberForArea(area: string): number {
  const floorName = getFloorForArea(area);
  if (!floorName) return 1;
  return FLOOR_NUMBER_MAP[floorName] ?? 1;
}

