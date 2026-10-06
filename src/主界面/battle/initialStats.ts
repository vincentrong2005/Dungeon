import type { EntityStats, InitialEntityStats } from '../types';

export function resolveInitialEntityStats(stats: InitialEntityStats): EntityStats {
  return {
    ...stats,
    effects: stats.effects.map(effect => ({
      ...effect,
      stacks: typeof effect.stacks === 'number'
        ? effect.stacks
        : Math.max(0, Math.ceil(stats.maxHp * effect.stacks.maxHpRatio)),
      restrictedTypes: effect.restrictedTypes ? [...effect.restrictedTypes] : undefined,
    })),
  };
}
