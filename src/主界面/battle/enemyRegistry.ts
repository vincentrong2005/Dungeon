import { type CardData, EffectType, type EnemyAIContext, type EnemyDefinition } from '../types';
import { getAllCards } from './cardRegistry';
import { ELEMENTAL_DEBUFF_TYPES } from './effects';

function pickCardById(ctx: EnemyAIContext, id: string): CardData {
  return ctx.deck.find((c) => c.id === id) ?? ctx.deck[0]!;
}

function weightedRandom<T>(options: { value: T; weight: number }[]): T {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let roll = Math.random() * total;
  for (const opt of options) {
    roll -= opt.weight;
    if (roll <= 0) return opt.value;
  }
  return options[options.length - 1]!.value;
}

const CARD_BY_ID = new Map<string, CardData>(getAllCards().map((card) => [card.id, card]));
const requireCardById = (id: string): CardData => {
  const card = CARD_BY_ID.get(id);
  if (!card) {
    throw new Error(`[enemyRegistry] Missing card id: ${id}`);
  }
  return card;
};
const buildDeckById = (ids: string[]) => ids.map((id) => requireCardById(id));

const 沐芯兰名称 = '沐芯兰';
const 宝箱怪名称 = '宝箱怪';

const MUXINLAN_CARD = {
  CUNNING: 'enemy_muxinlan_cunning',
  FORCED: 'enemy_muxinlan_forced_acquisition',
  LIQUIDATION: 'enemy_muxinlan_liquidation',
  REAGENT: 'enemy_muxinlan_unstable_reagent',
  LIQUID_FIRE: 'enemy_muxinlan_liquid_fire',
  SLIME: 'enemy_muxinlan_activated_slime',
  TAKE_IT: 'enemy_muxinlan_take_it',
  PREMIUM: 'enemy_muxinlan_premium_shield',
  AMBUSH: 'enemy_muxinlan_set_ambush',
} as const;

const MIMIC_CARD = {
  TENTACLE: 'enemy_mimic_slimy_tentacle',
  TONGUE: 'enemy_mimic_agile_tongue',
  MAW: 'enemy_mimic_maw',
  CRUSH: 'enemy_mimic_crush',
  DIGEST: 'enemy_mimic_digest',
} as const;

const SWAMP_LURKER_CARD = {
  CHARGE: 'enemy_charge',
  NUMB_SPREAD: 'enemy_swamp_numb_spread',
  FLUID_WRAP: 'enemy_swamp_fluid_wrap',
  CORRODE: 'enemy_swamp_corrode',
} as const;

const MIMIC_BUBBLE_CARD = {
  APHRO_GAS: 'enemy_mimicbubble_aphro_gas',
  ELASTIC_ADSORB: 'enemy_mimicbubble_elastic_adsorb',
  IRIDESCENT_FLOAT: 'enemy_mimicbubble_iridescent_float',
} as const;

const MIST_SPRITE_CARD = {
  ILLUSION_LURE: 'enemy_mist_sprite_illusion_lure',
} as const;

const VINEWALKER_CARD = {
  LURK: 'enemy_vinewalker_lurk',
  LIGHTNING_AMBUSH: 'enemy_vinewalker_lightning_ambush',
  PARALYTIC_TOXIN: 'enemy_vinewalker_paralytic_toxin',
  LUBRICATED_SHRINK: 'enemy_vinewalker_lubricated_shrink',
} as const;

const SPRING_SPIRIT_CARD = {
  LIQUEFIED_INFILTRATION: 'enemy_springspirit_liquefied_infiltration',
  INTERNAL_MANIPULATION: 'enemy_springspirit_internal_manipulation',
  UNDEAD_CONDENSE: 'enemy_springspirit_undead_condense',
  SILENT_INFILTRATION: 'enemy_springspirit_silent_infiltration',
} as const;

function create沐芯兰Definition(currentFloor: number): EnemyDefinition {
  const floor = Math.max(1, Math.floor(currentFloor));
  return {
    name: 沐芯兰名称,
    stats: {
      hp: 20 + 30 * floor,
      maxHp: 20 + 30 * floor,
      mp: 2 * floor,
      minDice: 1 + floor,
      maxDice: 6 + floor,
      effects: [
        { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
        { type: EffectType.FLAME_ATTACH, stacks: 1, polarity: 'buff' },
        { type: EffectType.POISON_ATTACH, stacks: 1, polarity: 'buff' },
        { type: EffectType.FROST_ATTACH, stacks: 1, polarity: 'buff' },
        { type: EffectType.BLOODBLADE_ATTACH, stacks: 1, polarity: 'buff' },
        { type: EffectType.LIGHTNING_ATTACH, stacks: 1, polarity: 'buff' },
      ],
    },
    deck: buildDeckById([
      MUXINLAN_CARD.CUNNING,
      MUXINLAN_CARD.FORCED,
      MUXINLAN_CARD.LIQUIDATION,
      MUXINLAN_CARD.REAGENT,
      MUXINLAN_CARD.LIQUID_FIRE,
      MUXINLAN_CARD.SLIME,
      MUXINLAN_CARD.TAKE_IT,
      MUXINLAN_CARD.PREMIUM,
      MUXINLAN_CARD.AMBUSH,
    ]),
    selectCard(ctx: EnemyAIContext) {
      if (!ctx.flags.muxinlanOpenedWithCunning) {
        ctx.flags.muxinlanOpenedWithCunning = true;
        return pickCardById(ctx, MUXINLAN_CARD.CUNNING);
      }

      const getStacks = (t: EffectType) => ctx.playerStats.effects.find((e) => e.type === t)?.stacks ?? 0;
      const elementalTotal = ELEMENTAL_DEBUFF_TYPES
        .reduce((sum, type) => sum + getStacks(type), 0);
      if (elementalTotal >= 12) {
        return pickCardById(ctx, MUXINLAN_CARD.LIQUIDATION);
      }

      if (ctx.enemyStats.mp > 4) {
        const highMpPool = [MUXINLAN_CARD.REAGENT, MUXINLAN_CARD.LIQUID_FIRE, MUXINLAN_CARD.SLIME] as const;
        const chosen = highMpPool[Math.floor(Math.random() * highMpPool.length)]!;
        return pickCardById(ctx, chosen);
      }

      const lowMpPool = [MUXINLAN_CARD.FORCED, MUXINLAN_CARD.TAKE_IT, MUXINLAN_CARD.PREMIUM, MUXINLAN_CARD.AMBUSH] as const;
      const chosen = lowMpPool[Math.floor(Math.random() * lowMpPool.length)]!;
      return pickCardById(ctx, chosen);
    },
  };
}

function create宝箱怪Definition(currentFloor: number): EnemyDefinition {
  const floor = Math.max(1, Math.floor(currentFloor));
  return {
    name: 宝箱怪名称,
    stats: {
      hp: 20 * floor,
      maxHp: 20 * floor,
      mp: 0,
      minDice: floor,
      maxDice: 5 + 2 * floor,
      effects: [],
    },
    deck: buildDeckById([
      MIMIC_CARD.TENTACLE,
      MIMIC_CARD.TONGUE,
      MIMIC_CARD.MAW,
      MIMIC_CARD.CRUSH,
      MIMIC_CARD.DIGEST,
    ]),
    selectCard(ctx: EnemyAIContext) {
      const playerHasDevour = ctx.playerStats.effects.some((e) => e.type === EffectType.DEVOUR && e.stacks > 0);
      if (playerHasDevour) {
        const devourPool = [MIMIC_CARD.CRUSH, MIMIC_CARD.DIGEST] as const;
        const chosen = devourPool[Math.floor(Math.random() * devourPool.length)]!;
        return pickCardById(ctx, chosen);
      }

      const normalPool = [MIMIC_CARD.TENTACLE, MIMIC_CARD.TONGUE, MIMIC_CARD.MAW] as const;
      const chosen = normalPool[Math.floor(Math.random() * normalPool.length)]!;
      return pickCardById(ctx, chosen);
    },
  };
}

const 游荡粘液球: EnemyDefinition = {
  name: '游荡粘液球',
  stats: {
    hp: 12,
    maxHp: 12,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [{ type: EffectType.REGEN, stacks: 1, polarity: 'buff' }],
  },
  deck: buildDeckById(['enemy_charge', 'enemy_slime_dodge', 'enemy_heal']),
  selectCard(ctx: EnemyAIContext) {
    const hpRatio = ctx.enemyStats.hp / ctx.enemyStats.maxHp;
    if (hpRatio <= 0.4 && !ctx.flags.hasUsedHeal) {
      ctx.flags.hasUsedHeal = true;
      return pickCardById(ctx, 'enemy_heal');
    }

    const chosen = weightedRandom<string>([
      { value: 'enemy_charge', weight: 70 },
      { value: 'enemy_slime_dodge', weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 荧光蛾: EnemyDefinition = {
  name: '荧光蛾',
  stats: {
    hp: 5,
    maxHp: 5,
    mp: 1,
    minDice: 1,
    maxDice: 4,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
      { type: EffectType.SWARM, stacks: 3, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    'enemy_moth_aphro_powder',
    'enemy_moth_sensitive_mark',
    'enemy_moth_pheromone',
    'enemy_moth_swarm_burst',
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 6) {
      return pickCardById(ctx, 'enemy_moth_swarm_burst');
    }

    const normalCards = ['enemy_moth_aphro_powder', 'enemy_moth_sensitive_mark', 'enemy_moth_pheromone'] as const;
    const chosen = normalCards[Math.floor(Math.random() * normalCards.length)]!;
    return pickCardById(ctx, chosen);
  },
};

const 根须潜行者: EnemyDefinition = {
  name: '根须潜行者',
  stats: {
    hp: 8,
    maxHp: 8,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [{ type: EffectType.SWARM, stacks: 2, polarity: 'buff' }],
  },
  deck: buildDeckById(['enemy_root_tremor_sense', 'enemy_root_lube_secretion', 'enemy_root_infiltrate_climb']),
  selectCard(ctx: EnemyAIContext) {
    const pool = ['enemy_root_tremor_sense', 'enemy_root_lube_secretion', 'enemy_root_infiltrate_climb'] as const;
    const chosen = pool[Math.floor(Math.random() * pool.length)]!;
    return pickCardById(ctx, chosen);
  },
};

const 沼泽潜伏者: EnemyDefinition = {
  name: '沼泽潜伏者',
  stats: {
    hp: 15,
    maxHp: 15,
    mp: 0,
    minDice: 1,
    maxDice: 6,
    effects: [{ type: EffectType.REGEN, stacks: 1, polarity: 'buff' }],
  },
  deck: buildDeckById([
    SWAMP_LURKER_CARD.CHARGE,
    SWAMP_LURKER_CARD.NUMB_SPREAD,
    SWAMP_LURKER_CARD.FLUID_WRAP,
    SWAMP_LURKER_CARD.CORRODE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const playerHasDevour = ctx.playerStats.effects.some((e) => e.type === EffectType.DEVOUR && e.stacks > 0);
    if (playerHasDevour) {
      return pickCardById(ctx, SWAMP_LURKER_CARD.CORRODE);
    }

    const playerHasBind = ctx.playerStats.effects.some((e) => e.type === EffectType.BIND && e.stacks > 0);
    if (playerHasBind) {
      return pickCardById(ctx, SWAMP_LURKER_CARD.FLUID_WRAP);
    }

    const chosen = weightedRandom<string>([
      { value: SWAMP_LURKER_CARD.CHARGE, weight: 30 },
      { value: SWAMP_LURKER_CARD.NUMB_SPREAD, weight: 70 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 拟态气泡怪: EnemyDefinition = {
  name: '拟态气泡怪',
  stats: {
    hp: 15,
    maxHp: 15,
    mp: 0,
    minDice: 2,
    maxDice: 4,
    effects: [{ type: EffectType.TOXIN_SPREAD, stacks: 1, polarity: 'buff' }],
  },
  deck: buildDeckById([
    MIMIC_BUBBLE_CARD.APHRO_GAS,
    MIMIC_BUBBLE_CARD.ELASTIC_ADSORB,
    MIMIC_BUBBLE_CARD.IRIDESCENT_FLOAT,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const chosen = weightedRandom<string>([
      { value: MIMIC_BUBBLE_CARD.APHRO_GAS, weight: 50 },
      { value: MIMIC_BUBBLE_CARD.ELASTIC_ADSORB, weight: 30 },
      { value: MIMIC_BUBBLE_CARD.IRIDESCENT_FLOAT, weight: 20 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 迷雾精怪: EnemyDefinition = {
  name: '迷雾精怪',
  stats: {
    hp: 4,
    maxHp: 4,
    mp: 0,
    minDice: 1,
    maxDice: 1,
    effects: [
      { type: EffectType.NON_ENTITY, stacks: 1, polarity: 'trait' },
      { type: EffectType.NON_LIVING, stacks: 1, polarity: 'trait' },
      { type: EffectType.SWARM, stacks: 2, polarity: 'buff' },
      { type: EffectType.POINT_GROWTH_BIG, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([MIST_SPRITE_CARD.ILLUSION_LURE]),
  selectCard(ctx: EnemyAIContext) {
    return pickCardById(ctx, MIST_SPRITE_CARD.ILLUSION_LURE);
  },
};

const 藤蔓行者: EnemyDefinition = {
  name: '藤蔓行者',
  stats: {
    hp: 16,
    maxHp: 16,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [],
  },
  deck: buildDeckById([
    VINEWALKER_CARD.LURK,
    VINEWALKER_CARD.LIGHTNING_AMBUSH,
    VINEWALKER_CARD.PARALYTIC_TOXIN,
    VINEWALKER_CARD.LUBRICATED_SHRINK,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (!ctx.flags.vinewalkerOpenedWithLurk) {
      ctx.flags.vinewalkerOpenedWithLurk = true;
      return pickCardById(ctx, VINEWALKER_CARD.LURK);
    }

    const playerHasBind = ctx.playerStats.effects.some((e) => e.type === EffectType.BIND && e.stacks > 0);
    if (playerHasBind) {
      return pickCardById(ctx, VINEWALKER_CARD.PARALYTIC_TOXIN);
    }

    const selfHasAmbush = ctx.enemyStats.effects.some((e) => e.type === EffectType.AMBUSH && e.stacks > 0);
    if (!selfHasAmbush) {
      return pickCardById(ctx, VINEWALKER_CARD.LURK);
    }

    const chosen = weightedRandom<string>([
      { value: VINEWALKER_CARD.LIGHTNING_AMBUSH, weight: 75 },
      { value: VINEWALKER_CARD.LUBRICATED_SHRINK, weight: 25 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 泉水精魄: EnemyDefinition = {
  name: '泉水精魄',
  stats: {
    hp: 20,
    maxHp: 20,
    mp: 0,
    minDice: 1,
    maxDice: 6,
    effects: [
      { type: EffectType.NON_LIVING, stacks: 1, polarity: 'trait' },
      { type: EffectType.NON_ENTITY, stacks: 1, polarity: 'trait' },
    ],
  },
  deck: buildDeckById([
    SPRING_SPIRIT_CARD.LIQUEFIED_INFILTRATION,
    SPRING_SPIRIT_CARD.INTERNAL_MANIPULATION,
    SPRING_SPIRIT_CARD.UNDEAD_CONDENSE,
    SPRING_SPIRIT_CARD.SILENT_INFILTRATION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const selfHasElementalDebuff = ELEMENTAL_DEBUFF_TYPES
      .some((type) => ctx.enemyStats.effects.some((e) => e.type === type && e.stacks > 0));

    if (!selfHasElementalDebuff) {
      const chosen = weightedRandom<string>([
        { value: SPRING_SPIRIT_CARD.LIQUEFIED_INFILTRATION, weight: 50 },
        { value: SPRING_SPIRIT_CARD.SILENT_INFILTRATION, weight: 30 },
        { value: SPRING_SPIRIT_CARD.INTERNAL_MANIPULATION, weight: 20 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: SPRING_SPIRIT_CARD.LIQUEFIED_INFILTRATION, weight: 40 },
      { value: SPRING_SPIRIT_CARD.SILENT_INFILTRATION, weight: 25 },
      { value: SPRING_SPIRIT_CARD.INTERNAL_MANIPULATION, weight: 15 },
      { value: SPRING_SPIRIT_CARD.UNDEAD_CONDENSE, weight: 20 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const STATIC_ENEMY_REGISTRY: ReadonlyMap<string, EnemyDefinition> = new Map<string, EnemyDefinition>([
  [游荡粘液球.name, 游荡粘液球],
  [荧光蛾.name, 荧光蛾],
  [根须潜行者.name, 根须潜行者],
  [沼泽潜伏者.name, 沼泽潜伏者],
  [拟态气泡怪.name, 拟态气泡怪],
  [迷雾精怪.name, 迷雾精怪],
  [藤蔓行者.name, 藤蔓行者],
  [泉水精魄.name, 泉水精魄],
]);

const ENEMY_NAME_ORDER: readonly string[] = [
  沐芯兰名称,
  宝箱怪名称,
  ...STATIC_ENEMY_REGISTRY.keys(),
];

export function getEnemyByName(name: string, currentFloor: number = 1): EnemyDefinition | undefined {
  if (name === 沐芯兰名称) {
    return create沐芯兰Definition(currentFloor);
  }
  if (name === 宝箱怪名称) {
    return create宝箱怪Definition(currentFloor);
  }
  return STATIC_ENEMY_REGISTRY.get(name);
}

export function getAllEnemyNames(): string[] {
  return [...ENEMY_NAME_ORDER];
}


