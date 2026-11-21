import { Schema } from '../schema';

/**
 * 一键更新变量结构：把旧存档缺少的新变量按 schema 的默认值补进最新楼层。
 *
 * 只补「缺失的键」，不改动已有的值：
 *   - 普通对象（如 $统计、携带的物品、$事件操作）逐层比较，缺哪个键补哪个；
 *   - 记录类对象（如 角色、_圣遗物）默认值为空对象，不会补出任何键；
 *   - 数组、字符串、数字等叶子值只在整项缺失时补默认值。
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null)) as T;

let cachedDefaults: Record<string, unknown> | null = null;

/** schema 的全部默认值（等同于一份全新存档的 stat_data）；只计算一次，调用方拿到的是副本 */
export const getVariableDefaults = (): Record<string, unknown> => {
  cachedDefaults ??= Schema.parse({}) as Record<string, unknown>;
  return cloneJson(cachedDefaults);
};

const collectMissing = (current: Record<string, unknown>, defaults: Record<string, unknown>, prefix: string, out: string[]) => {
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      out.push(path);
      continue;
    }
    const value = current[key];
    if (isPlainObject(defaultValue) && Object.keys(defaultValue).length > 0 && isPlainObject(value)) {
      collectMissing(value, defaultValue, path, out);
    }
  }
};

/** 当前 stat_data 相比最新变量结构缺少的变量路径；stat_data 为空（尚未开局）时返回空列表 */
export const findMissingVariables = (statData: unknown): string[] => {
  if (!isPlainObject(statData) || Object.keys(statData).length === 0) return [];
  const missing: string[] = [];
  collectMissing(statData, getVariableDefaults(), '', missing);
  return missing;
};

const fillMissing = (current: Record<string, unknown>, defaults: Record<string, unknown>) => {
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      current[key] = cloneJson(defaultValue);
      continue;
    }
    const value = current[key];
    if (isPlainObject(defaultValue) && Object.keys(defaultValue).length > 0 && isPlainObject(value)) {
      fillMissing(value, defaultValue);
    }
  }
};

export interface VariableMigrationResult {
  /** 需要写回的顶层字段（只包含补了新变量的那些） */
  fields: Record<string, unknown>;
  /** 补上的变量路径 */
  added: string[];
  /** 补全后仍不符合最新结构的地方（例如旧版遗留的非法值），仅用于提示 */
  issues: string[];
}

export const buildVariableMigration = (statData: unknown): VariableMigrationResult => {
  const current = isPlainObject(statData) ? statData : {};
  const added = findMissingVariables(current);
  if (added.length === 0) return { fields: {}, added, issues: [] };

  const next = cloneJson(current);
  fillMissing(next, getVariableDefaults());
  const touchedTopKeys = new Set(added.map(path => path.split('.')[0]!));
  const fields: Record<string, unknown> = {};
  for (const key of touchedTopKeys) fields[key] = next[key];

  const parsed = Schema.safeParse(next);
  const issues = parsed.success
    ? []
    : parsed.error.issues.slice(0, 8).map(issue => `${issue.path.join('.') || '(根)'}：${issue.message}`);
  return { fields, added, issues };
};
