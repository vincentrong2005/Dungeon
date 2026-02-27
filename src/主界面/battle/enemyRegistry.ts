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

const INFILTRATOR_TENTACLE_CARD = {
  TREMOR_SENSE: 'enemy_root_tremor_sense',
  INFILTRATE_CLIMB: 'enemy_root_infiltrate_climb',
  LURK: 'enemy_vinewalker_lurk',
  LIGHTNING_AMBUSH: 'enemy_vinewalker_lightning_ambush',
} as const;

const CAVE_TENTACLE_CARD = {
  INFILTRATE_CLIMB: 'enemy_root_infiltrate_climb',
  LIGHTNING_AMBUSH: 'enemy_vinewalker_lightning_ambush',
  SWARM_BURST: 'enemy_moth_swarm_burst',
} as const;

const BLISS_BEE_CARD = {
  SENSITIVE_SCOUT: 'enemy_blissbee_sensitive_scout',
  APHRO_STINGER: 'enemy_blissbee_aphro_stinger',
  PRECISE_HARVEST: 'enemy_blissbee_precise_harvest',
  SWARM_BURST: 'enemy_moth_swarm_burst',
} as const;

const POLLEN_SPRAYER_CARD = {
  HIGH_PRESSURE_SPRAY: 'enemy_pollen_high_pressure_spray',
  INFILTRATION: 'enemy_pollen_infiltration',
} as const;

const PRIM_CARD = {
  EMBRACE: 'enemy_prim_embrace',
  FLUID_EVASION: 'enemy_prim_fluid_evasion',
  DIGEST_CARESS: 'enemy_prim_digest_caress',
  ENTITY_CLONE: 'enemy_prim_entity_clone',
} as const;

const NYMPH_CARD = {
  LUST_HALLUCINATION: 'enemy_nymph_lust_hallucination',
  MISTY_SWIRL: 'enemy_nymph_misty_swirl',
  MENTAL_SHOCK: 'enemy_nymph_mental_shock',
  MISCHIEF: 'enemy_nymph_mischief',
  GIANT_PROJECTION: 'enemy_nymph_giant_projection',
  BASIC_PHYSICAL: 'basic_physical',
} as const;

const UNDINE_CARD = {
  EARTH_ESSENCE: 'enemy_undine_earth_essence',
  LOVING_WHIP: 'enemy_undine_loving_whip',
  DOTING_EMBRACE: 'enemy_undine_doting_embrace',
  ESSENCE_INFUSION: 'enemy_undine_essence_infusion',
  PSYCHIC_ASSIMILATION: 'enemy_undine_psychic_assimilation',
  EARTH_LIQUID: 'enemy_undine_earth_liquid',
} as const;

const MATA_CARD = {
  MATRIARCH_INVITATION: 'enemy_mata_matriarch_invitation',
  UNDER_SKIRT_TENTACLE: 'enemy_mata_under_skirt_tentacle',
  FUNGAL_REPAIR: 'enemy_mata_fungal_repair',
  FALSE_SMILE: 'enemy_mata_false_smile',
} as const;

const ROSE_CARD = {
  PLANT_DOMINION: 'enemy_rose_plant_dominion',
  WANGZHI_WHIP: 'enemy_rose_wangzhi_whip',
  LIFE_DRAIN: 'enemy_rose_life_drain',
  NECTAR_DISCIPLINE: 'enemy_rose_nectar_discipline',
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
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
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

const 潜伏触手怪: EnemyDefinition = {
  name: '潜伏触手怪',
  stats: {
    hp: 20,
    maxHp: 20,
    mp: 0,
    minDice: 3,
    maxDice: 5,
    effects: [],
  },
  deck: buildDeckById([
    INFILTRATOR_TENTACLE_CARD.TREMOR_SENSE,
    INFILTRATOR_TENTACLE_CARD.INFILTRATE_CLIMB,
    INFILTRATOR_TENTACLE_CARD.LURK,
    INFILTRATOR_TENTACLE_CARD.LIGHTNING_AMBUSH,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (!ctx.flags.infiltratorTentacleOpenedWithLightningAmbush) {
      ctx.flags.infiltratorTentacleOpenedWithLightningAmbush = true;
      return pickCardById(ctx, INFILTRATOR_TENTACLE_CARD.LIGHTNING_AMBUSH);
    }

    const selfHasAmbush = ctx.enemyStats.effects.some((e) => e.type === EffectType.AMBUSH && e.stacks > 0);
    if (!selfHasAmbush) {
      const chosen = weightedRandom<string>([
        { value: INFILTRATOR_TENTACLE_CARD.TREMOR_SENSE, weight: 20 },
        { value: INFILTRATOR_TENTACLE_CARD.INFILTRATE_CLIMB, weight: 20 },
        { value: INFILTRATOR_TENTACLE_CARD.LURK, weight: 40 },
        { value: INFILTRATOR_TENTACLE_CARD.LIGHTNING_AMBUSH, weight: 20 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: INFILTRATOR_TENTACLE_CARD.TREMOR_SENSE, weight: 35 },
      { value: INFILTRATOR_TENTACLE_CARD.INFILTRATE_CLIMB, weight: 35 },
      { value: INFILTRATOR_TENTACLE_CARD.LIGHTNING_AMBUSH, weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 穴居触手: EnemyDefinition = {
  name: '穴居触手',
  stats: {
    hp: 2,
    maxHp: 2,
    mp: 0,
    minDice: 2,
    maxDice: 4,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.SWARM, stacks: 5, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    CAVE_TENTACLE_CARD.INFILTRATE_CLIMB,
    CAVE_TENTACLE_CARD.LIGHTNING_AMBUSH,
    CAVE_TENTACLE_CARD.SWARM_BURST,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 6) {
      return pickCardById(ctx, CAVE_TENTACLE_CARD.SWARM_BURST);
    }

    if (!ctx.flags.caveTentacleOpenedWithLightningAmbush) {
      ctx.flags.caveTentacleOpenedWithLightningAmbush = true;
      return pickCardById(ctx, CAVE_TENTACLE_CARD.LIGHTNING_AMBUSH);
    }

    const chosen = Math.random() < 0.5
      ? CAVE_TENTACLE_CARD.INFILTRATE_CLIMB
      : CAVE_TENTACLE_CARD.LIGHTNING_AMBUSH;
    return pickCardById(ctx, chosen);
  },
};

const 极乐蜜蜂: EnemyDefinition = {
  name: '极乐蜜蜂',
  stats: {
    hp: 4,
    maxHp: 4,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.SWARM, stacks: 3, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    BLISS_BEE_CARD.SENSITIVE_SCOUT,
    BLISS_BEE_CARD.APHRO_STINGER,
    BLISS_BEE_CARD.PRECISE_HARVEST,
    BLISS_BEE_CARD.SWARM_BURST,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 6) {
      return pickCardById(ctx, BLISS_BEE_CARD.SWARM_BURST);
    }

    const playerHasPoison = ctx.playerStats.effects.some((e) => e.type === EffectType.POISON && e.stacks > 0);
    if (playerHasPoison) {
      const chosen = weightedRandom<string>([
        { value: BLISS_BEE_CARD.SENSITIVE_SCOUT, weight: 20 },
        { value: BLISS_BEE_CARD.APHRO_STINGER, weight: 30 },
        { value: BLISS_BEE_CARD.PRECISE_HARVEST, weight: 50 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const playerHasVulnerable = ctx.playerStats.effects.some((e) => e.type === EffectType.VULNERABLE && e.stacks > 0);
    if (playerHasVulnerable) {
      const chosen = weightedRandom<string>([
        { value: BLISS_BEE_CARD.SENSITIVE_SCOUT, weight: 20 },
        { value: BLISS_BEE_CARD.APHRO_STINGER, weight: 80 },
      ]);
      return pickCardById(ctx, chosen);
    }

    return pickCardById(ctx, BLISS_BEE_CARD.SENSITIVE_SCOUT);
  },
};

const POLLEN_SPRAYER_ENEMY: EnemyDefinition = {
  name: '\u82b1\u7c89\u55b7\u5c04\u8005',
  stats: {
    hp: 10,
    maxHp: 10,
    mp: 0,
    minDice: 2,
    maxDice: 3,
    effects: [],
  },
  deck: buildDeckById([
    POLLEN_SPRAYER_CARD.HIGH_PRESSURE_SPRAY,
    POLLEN_SPRAYER_CARD.INFILTRATION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (!ctx.flags.pollenSprayerOpenedWithHighPressureSpray) {
      ctx.flags.pollenSprayerOpenedWithHighPressureSpray = true;
      return pickCardById(ctx, POLLEN_SPRAYER_CARD.HIGH_PRESSURE_SPRAY);
    }
    return pickCardById(ctx, POLLEN_SPRAYER_CARD.INFILTRATION);
  },
};

const 普莉姆: EnemyDefinition = {
  name: '普莉姆',
  stats: {
    hp: 25,
    maxHp: 25,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.REGEN, stacks: 2, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    PRIM_CARD.EMBRACE,
    PRIM_CARD.FLUID_EVASION,
    PRIM_CARD.DIGEST_CARESS,
    PRIM_CARD.ENTITY_CLONE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const selfHasSwarm = ctx.enemyStats.effects.some((e) => e.type === EffectType.SWARM && e.stacks > 0);
    if (ctx.enemyStats.hp < ctx.enemyStats.maxHp * 0.5 && !selfHasSwarm) {
      return pickCardById(ctx, PRIM_CARD.ENTITY_CLONE);
    }

    if (ctx.enemyStats.mp >= 4) {
      return pickCardById(ctx, PRIM_CARD.DIGEST_CARESS);
    }

    const chosen = weightedRandom<string>([
      { value: PRIM_CARD.EMBRACE, weight: 65 },
      { value: PRIM_CARD.FLUID_EVASION, weight: 35 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 宁芙: EnemyDefinition = {
  name: '宁芙',
  stats: {
    hp: 45,
    maxHp: 45,
    mp: 0,
    minDice: 1,
    maxDice: 3,
    effects: [
      { type: EffectType.ILLUSORY_BODY, stacks: 1, polarity: 'trait' },
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    NYMPH_CARD.MISTY_SWIRL,
    NYMPH_CARD.MENTAL_SHOCK,
    NYMPH_CARD.MISCHIEF,
    NYMPH_CARD.GIANT_PROJECTION,
    NYMPH_CARD.BASIC_PHYSICAL,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (!ctx.flags.nymphUsedGiantProjection && ctx.enemyStats.hp < ctx.enemyStats.maxHp * 0.5) {
      ctx.flags.nymphUsedGiantProjection = true;
      return pickCardById(ctx, NYMPH_CARD.GIANT_PROJECTION);
    }

    if (ctx.enemyStats.mp >= 6) {
      return pickCardById(ctx, NYMPH_CARD.MENTAL_SHOCK);
    }

    const selfHasIllusoryBody = ctx.enemyStats.effects.some((e) => e.type === EffectType.ILLUSORY_BODY && e.stacks > 0);
    if (selfHasIllusoryBody) {
      const chosen = weightedRandom<string>([
        { value: NYMPH_CARD.MISTY_SWIRL, weight: 40 },
        { value: NYMPH_CARD.MISCHIEF, weight: 60 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: NYMPH_CARD.MISTY_SWIRL, weight: 50 },
      { value: NYMPH_CARD.BASIC_PHYSICAL, weight: 50 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 温蒂尼: EnemyDefinition = {
  name: '温蒂尼',
  stats: {
    hp: 40,
    maxHp: 40,
    mp: 0,
    minDice: 3,
    maxDice: 8,
    effects: [
      { type: EffectType.WHITE_TURBID, stacks: 1, polarity: 'mixed' },
      { type: EffectType.REGEN, stacks: 1, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    UNDINE_CARD.LOVING_WHIP,
    UNDINE_CARD.DOTING_EMBRACE,
    UNDINE_CARD.ESSENCE_INFUSION,
    UNDINE_CARD.PSYCHIC_ASSIMILATION,
    UNDINE_CARD.EARTH_LIQUID,
    UNDINE_CARD.EARTH_ESSENCE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (!ctx.flags.undineUsedEarthLiquid && ctx.enemyStats.hp < ctx.enemyStats.maxHp * 0.5) {
      ctx.flags.undineUsedEarthLiquid = true;
      return pickCardById(ctx, UNDINE_CARD.EARTH_LIQUID);
    }

    if (ctx.enemyStats.mp >= 5) {
      return pickCardById(ctx, UNDINE_CARD.PSYCHIC_ASSIMILATION);
    }

    if (ctx.enemyStats.mp >= 1) {
      const chosen = weightedRandom<string>([
        { value: UNDINE_CARD.LOVING_WHIP, weight: 30 },
        { value: UNDINE_CARD.DOTING_EMBRACE, weight: 30 },
        { value: UNDINE_CARD.ESSENCE_INFUSION, weight: 40 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: UNDINE_CARD.LOVING_WHIP, weight: 50 },
      { value: UNDINE_CARD.DOTING_EMBRACE, weight: 50 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 玛塔: EnemyDefinition = {
  name: '玛塔',
  stats: {
    hp: 20,
    maxHp: 20,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.SWARM, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    MATA_CARD.MATRIARCH_INVITATION,
    MATA_CARD.UNDER_SKIRT_TENTACLE,
    MATA_CARD.FUNGAL_REPAIR,
    MATA_CARD.FALSE_SMILE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const playerPoisonAmount = ctx.playerStats.effects
      .find((e) => e.type === EffectType.POISON_AMOUNT)?.stacks ?? 0;
    if (ctx.enemyStats.hp < ctx.enemyStats.maxHp * 0.5 && playerPoisonAmount >= 5) {
      return pickCardById(ctx, MATA_CARD.FUNGAL_REPAIR);
    }

    const chosen = weightedRandom<string>([
      { value: MATA_CARD.MATRIARCH_INVITATION, weight: 30 },
      { value: MATA_CARD.UNDER_SKIRT_TENTACLE, weight: 30 },
      { value: MATA_CARD.FALSE_SMILE, weight: 40 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 罗丝: EnemyDefinition = {
  name: '罗丝',
  stats: {
    hp: 40,
    maxHp: 40,
    mp: 0,
    minDice: 1,
    maxDice: 6,
    effects: [
      { type: EffectType.THORNS, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    ROSE_CARD.PLANT_DOMINION,
    ROSE_CARD.WANGZHI_WHIP,
    ROSE_CARD.LIFE_DRAIN,
    ROSE_CARD.NECTAR_DISCIPLINE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (!ctx.flags.roseOpenedWithPlantDominion) {
      ctx.flags.roseOpenedWithPlantDominion = true;
      return pickCardById(ctx, ROSE_CARD.PLANT_DOMINION);
    }

    const chosen = weightedRandom<string>([
      { value: ROSE_CARD.PLANT_DOMINION, weight: 25 },
      { value: ROSE_CARD.WANGZHI_WHIP, weight: 25 },
      { value: ROSE_CARD.LIFE_DRAIN, weight: 25 },
      { value: ROSE_CARD.NECTAR_DISCIPLINE, weight: 25 },
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
  [潜伏触手怪.name, 潜伏触手怪],
  [穴居触手.name, 穴居触手],
  [极乐蜜蜂.name, 极乐蜜蜂],
  [POLLEN_SPRAYER_ENEMY.name, POLLEN_SPRAYER_ENEMY],
  [普莉姆.name, 普莉姆],
  [宁芙.name, 宁芙],
  [温蒂尼.name, 温蒂尼],
  [玛塔.name, 玛塔],
  [罗丝.name, 罗丝],
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
