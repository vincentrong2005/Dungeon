export const MAP_ROUTE_COUNT = 4;
export const MAP_HEIGHT = 9;
export const MAP_WIDTH = 6;

export const MAP_ROOM_TYPES = ['战斗房', '宝箱房', '商店房', '温泉房', '神像房', '事件房', '陷阱房'] as const;
export type MapRoomType = (typeof MAP_ROOM_TYPES)[number];

export interface MapRoomNode {
  x: number;
  房间类型: MapRoomType;
}

export type DungeonMap = MapRoomNode[][];

const ROOM_WEIGHTS: Record<MapRoomType, number> = {
  战斗房: 35,
  宝箱房: 2,
  商店房: 24,
  温泉房: 12,
  神像房: 16,
  事件房: 0,
  陷阱房: 2,
};

const clampX = (value: number): number => Math.max(1, Math.min(MAP_WIDTH, Math.floor(value)));

const shuffled = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
};

const keyFor = (y: number, x: number): string => `${y}:${x}`;

const createInitialRow = (random: () => number): number[] =>
  Array.from({ length: MAP_ROUTE_COUNT }, () => 1 + Math.floor(random() * MAP_WIDTH)).sort((a, b) => a - b);

/**
 * Build one ordered row at a time. The recursive backtracking is the
 * intersection of each route's physical step range and the boundary created
 * by its left neighbour. A final right-neighbour check keeps the row ordered.
 */
const createNextRow = (previous: number[], random: () => number): number[] | null => {
  const next = Array<number>(MAP_ROUTE_COUNT).fill(0);

  const visit = (routeIndex: number, leftBoundary: number): boolean => {
    if (routeIndex >= MAP_ROUTE_COUNT) return true;

    const previousX = previous[routeIndex]!;
    const physicalMin = Math.max(1, previousX - 1);
    const physicalMax = Math.min(MAP_WIDTH, previousX + 1);
    const lowerBound = Math.max(physicalMin, leftBoundary);
    const candidates = shuffled(
      Array.from({ length: physicalMax - lowerBound + 1 }, (_, offset) => lowerBound + offset),
      random,
    );

    for (const candidate of candidates) {
      next[routeIndex] = candidate;
      if (visit(routeIndex + 1, candidate)) return true;
    }

    next[routeIndex] = 0;
    return false;
  };

  return visit(0, 1) ? next : null;
};

const assignRoomTypes = (rows: number[][], random: () => number): DungeonMap => {
  const assigned = new Map<string, MapRoomType>();
  let shopCount = 0;

  for (let rowIndex = 0; rowIndex < MAP_HEIGHT; rowIndex += 1) {
    const y = rowIndex + 1;
    const uniqueXs = Array.from(new Set(rows[rowIndex]!));
    for (const x of uniqueXs) {
      const key = keyFor(y, x);
      if (y === 5) {
        assigned.set(key, '宝箱房');
        continue;
      }

      const weightedTypes = MAP_ROOM_TYPES.map(type => ({
        type,
        weight: type === '商店房' && (y <= 5 || shopCount >= 2) ? 0 : ROOM_WEIGHTS[type],
      })).filter(item => item.weight > 0);
      const totalWeight = weightedTypes.reduce((sum, item) => sum + item.weight, 0);
      let roll = random() * totalWeight;
      let selected: MapRoomType = '战斗房';
      for (const item of weightedTypes) {
        roll -= item.weight;
        if (roll <= 0) {
          selected = item.type;
          break;
        }
      }
      assigned.set(key, selected);
      if (selected === '商店房') shopCount += 1;
    }
  }

  return Array.from({ length: MAP_ROUTE_COUNT }, (_, routeIndex) =>
    Array.from({ length: MAP_HEIGHT }, (_, rowIndex) => {
      const x = rows[rowIndex]![routeIndex]!;
      return {
        x,
        房间类型: assigned.get(keyFor(rowIndex + 1, x)) ?? '战斗房',
      };
    }),
  );
};

const hasDuplicateRoute = (map: DungeonMap): boolean => {
  const keys = new Set(map.map(route => route.map(node => node.x).join(',')));
  return keys.size !== map.length;
};

export const generateDungeonMap = (random: () => number = Math.random): DungeonMap => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const rows: number[][] = [createInitialRow(random)];
    let failed = false;
    for (let rowIndex = 1; rowIndex < MAP_HEIGHT; rowIndex += 1) {
      const nextRow = createNextRow(rows[rowIndex - 1]!, random);
      if (!nextRow) {
        failed = true;
        break;
      }
      rows.push(nextRow);
    }
    if (failed) continue;

    const typedMap = assignRoomTypes(rows, random);
    if (!hasDuplicateRoute(typedMap)) return typedMap;
  }

  const fallbackRows = Array.from({ length: MAP_HEIGHT }, (_, index) =>
    Array.from({ length: MAP_ROUTE_COUNT }, (_, routeIndex) => clampX(routeIndex + 1 + (index % 2))),
  );
  return assignRoomTypes(fallbackRows, random);
};

export const normalizeDungeonMap = (value: unknown): DungeonMap => {
  if (!Array.isArray(value) || value.length !== MAP_ROUTE_COUNT) return [];
  const routes: DungeonMap = [];
  for (const route of value) {
    if (!Array.isArray(route) || route.length !== MAP_HEIGHT) return [];
    const normalized: MapRoomNode[] = [];
    for (const node of route) {
      if (!node || typeof node !== 'object') return [];
      const raw = node as Record<string, unknown>;
      const x = Number(raw.x);
      const roomType = raw.房间类型;
      if (!Number.isInteger(x) || x < 1 || x > MAP_WIDTH || typeof roomType !== 'string') return [];
      if (!(MAP_ROOM_TYPES as readonly string[]).includes(roomType)) return [];
      normalized.push({ x, 房间类型: roomType as MapRoomType });
    }
    routes.push(normalized);
  }
  return routes;
};

export const replaceFutureRoomsWithBattle = (
  map: DungeonMap,
  currentY: number,
  random: () => number = Math.random,
): DungeonMap => {
  const nextMap = map.map(route => route.map(node => ({ ...node })));
  const candidates = new Map<string, { y: number; x: number }>();
  for (const route of nextMap) {
    for (let index = 0; index < route.length; index += 1) {
      const y = index + 1;
      const node = route[index]!;
      if (y > currentY && node.房间类型 !== '战斗房') {
        candidates.set(keyFor(y, node.x), { y, x: node.x });
      }
    }
  }

  for (const candidate of shuffled(Array.from(candidates.values()), random).slice(0, 3)) {
    for (const route of nextMap) {
      const node = route[candidate.y - 1];
      if (node?.x === candidate.x) node.房间类型 = '战斗房';
    }
  }
  return nextMap;
};

export const validateDungeonMap = (map: DungeonMap): string[] => {
  const errors: string[] = [];
  if (map.length !== MAP_ROUTE_COUNT) errors.push(`路线数量应为 ${MAP_ROUTE_COUNT}`);
  for (const [routeIndex, route] of map.entries()) {
    if (route.length !== MAP_HEIGHT) {
      errors.push(`路线 ${routeIndex + 1} 节点数量应为 ${MAP_HEIGHT}`);
      continue;
    }
    for (let index = 0; index < route.length; index += 1) {
      const node = route[index]!;
      const y = index + 1;
      if (!Number.isInteger(node.x) || node.x < 1 || node.x > MAP_WIDTH) errors.push(`路线 ${routeIndex + 1} y=${y} 横坐标越界`);
      if (!(MAP_ROOM_TYPES as readonly string[]).includes(node.房间类型)) errors.push(`路线 ${routeIndex + 1} y=${y} 房间类型非法`);
      if (index > 0 && Math.abs(node.x - route[index - 1]!.x) > 1) {
        errors.push(`路线 ${routeIndex + 1} y=${y} 步长越界`);
      }
    }
  }
  for (let rowIndex = 0; rowIndex < MAP_HEIGHT; rowIndex += 1) {
    const row = map.map(route => route[rowIndex]?.x ?? 0);
    if (row.some((x, index) => index > 0 && x < row[index - 1]!)) errors.push(`y=${rowIndex + 1} 路线顺序反转`);
  }
  for (let rowIndex = 0; rowIndex < MAP_HEIGHT - 1; rowIndex += 1) {
    for (let leftRoute = 0; leftRoute < map.length; leftRoute += 1) {
      for (let rightRoute = leftRoute + 1; rightRoute < map.length; rightRoute += 1) {
        const leftFrom = map[leftRoute]?.[rowIndex]?.x;
        const leftTo = map[leftRoute]?.[rowIndex + 1]?.x;
        const rightFrom = map[rightRoute]?.[rowIndex]?.x;
        const rightTo = map[rightRoute]?.[rowIndex + 1]?.x;
        if (
          leftFrom !== undefined &&
          leftTo !== undefined &&
          rightFrom !== undefined &&
          rightTo !== undefined &&
          ((leftFrom < rightFrom && leftTo > rightTo) || (leftFrom > rightFrom && leftTo < rightTo))
        ) {
          errors.push(`y=${rowIndex + 1}->${rowIndex + 2} 路线交叉`);
        }
      }
    }
  }
  return errors;
};
