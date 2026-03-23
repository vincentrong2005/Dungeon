import { CardType, EffectType, type CardData, type EnemyAIContext, type EnemyDefinition } from '../types';
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

const pickRandomCard = (cards: CardData[]): CardData | null => (
  cards.length > 0 ? cards[Math.floor(Math.random() * cards.length)]! : null
);

const selectCardByMindRead = (ctx: EnemyAIContext): CardData => {
  const hand = (ctx.playerHand ?? []).slice(0, 3);
  const hasPhysical = hand.some((card) => card.type === CardType.PHYSICAL);
  const hasMagic = hand.some((card) => card.type === CardType.MAGIC);
  const hasDodge = hand.some((card) => card.type === CardType.DODGE);

  const handKey = `${hasPhysical ? 1 : 0}${hasMagic ? 1 : 0}${hasDodge ? 1 : 0}`;
  let preferredType: CardType;
  switch (handKey) {
    case '111': preferredType = CardType.FUNCTION; break;
    case '110': preferredType = CardType.DODGE; break;
    case '101': preferredType = CardType.MAGIC; break;
    case '100': preferredType = CardType.MAGIC; break;
    case '011': preferredType = CardType.PHYSICAL; break;
    case '010': preferredType = CardType.PHYSICAL; break;
    case '001': preferredType = CardType.FUNCTION; break;
    default: preferredType = CardType.MAGIC; break;
  }

  const cardsByType = (type: CardType) => ctx.deck.filter((card) => card.type === type);
  const playableMagicCards = cardsByType(CardType.MAGIC).filter((card) => card.manaCost <= ctx.enemyStats.mp);

  if (preferredType === CardType.MAGIC) {
    const pickedMagic = pickRandomCard(playableMagicCards);
    if (pickedMagic) return pickedMagic;
    const pickedPhysical = pickRandomCard(cardsByType(CardType.PHYSICAL));
    if (pickedPhysical) return pickedPhysical;
  } else {
    const pickedPreferred = pickRandomCard(cardsByType(preferredType));
    if (pickedPreferred) return pickedPreferred;
  }

  const fallback =
    pickRandomCard(cardsByType(CardType.PHYSICAL))
    ?? pickRandomCard(cardsByType(CardType.DODGE))
    ?? pickRandomCard(cardsByType(CardType.FUNCTION))
    ?? pickRandomCard(playableMagicCards)
    ?? pickRandomCard(ctx.deck);
  return fallback ?? ctx.deck[0]!;
};

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

const PATROL_BAT_CARD = {
  CLAW_REND: 'enemy_patrol_bat_claw_rend',
  METAL_SCREECH: 'enemy_patrol_bat_metal_screech',
  MARK: 'enemy_patrol_bat_mark',
  FLY_AWAY: 'enemy_patrol_bat_fly_away',
  CIRCLING: 'enemy_patrol_bat_circling',
} as const;

const SHAME_LEECH_CARD = {
  PARASITIC_DRILL: 'enemy_shame_leech_parasitic_drill',
  INTERNAL_BREEDING: 'enemy_shame_leech_internal_breeding',
  SHAME_AMPLIFY: 'enemy_shame_leech_shame_amplify',
} as const;

const PARASITIC_LEECH_CARD = {
  PARASITIC_DRILL: 'enemy_shame_leech_parasitic_drill',
  INTERNAL_BREEDING: 'enemy_shame_leech_internal_breeding',
  CUMULATIVE_APHRO: 'enemy_parasitic_leech_cumulative_aphro',
} as const;

const WITNESS_WORM_CARD = {
  PARASITIC_DRILL: 'enemy_shame_leech_parasitic_drill',
  MENTAL_SHOCK: 'enemy_witness_worm_mental_shock',
  RETREAT: 'enemy_witness_worm_retreat',
} as const;

const BLOOD_BAT_CARD = {
  PREDATORY_NIBBLE: 'enemy_blood_bat_predatory_nibble',
  ULTRASONIC_STIMULUS: 'enemy_blood_bat_ultrasonic_stimulus',
  SWARM_RESONANCE: 'enemy_blood_bat_swarm_resonance',
  LOW_GLIDE: 'enemy_blood_bat_low_glide',
} as const;

const BLOOD_SERVANT_CARD = {
  OFFERING_SMILE: 'enemy_blood_servant_offering_smile',
  INVITATION: 'enemy_blood_servant_invitation',
  LURE: 'enemy_blood_servant_lure',
} as const;

const NIGHTMARE_STEED_CARD = {
  SNIFF: 'enemy_nightmare_steed_sniff',
  BRANDED_STOMP: 'enemy_nightmare_steed_branded_stomp',
  SADDLE_CAPTURE: 'enemy_nightmare_steed_saddle_capture',
  MIST_DUST: 'enemy_nightmare_steed_mist_dust',
} as const;

const PUNISHMENT_PUPPET_CARD = {
  BONE_WHIP: 'enemy_punishment_puppet_bone_whip',
  SUCTION_SUPPRESS: 'enemy_punishment_puppet_suction_suppress',
  OVERLOAD_EXECUTE: 'enemy_punishment_puppet_overload_execute',
} as const;

const EXECUTIONER_PUPPET_CARD = {
  FACELESS_INTIMIDATION: 'enemy_executioner_puppet_faceless_intimidation',
  TOOL_SHIFT: 'enemy_executioner_puppet_tool_shift',
  EXECUTION: 'enemy_executioner_puppet_execution',
  EVADE: 'enemy_executioner_puppet_evade',
} as const;

const SHADOW_JAILER_CARD = {
  SHADOW_ASSAULT: 'enemy_shadow_jailer_shadow_assault',
  ENFORCEMENT_LOCK: 'enemy_shadow_jailer_enforcement_lock',
  NUMBING_WHIP: 'enemy_shadow_jailer_numbing_whip',
  FORM_SHIFT: 'enemy_shadow_jailer_form_shift',
} as const;

const THORN_CRAWLER_CARD = {
  BARBED_GRASP: 'enemy_thorncrawler_barbed_grasp',
  NEURAL_PIERCE: 'enemy_thorncrawler_neural_pierce',
  TOXIN_PULSE: 'enemy_thorncrawler_toxin_pulse',
} as const;

const SPINE_CHAIN_SNAKE_CARD = {
  LURK: 'enemy_vinewalker_lurk',
  BARBED_GRASP: 'enemy_thorncrawler_barbed_grasp',
  NEURAL_PIERCE: 'enemy_thorncrawler_neural_pierce',
  TOXIN_PULSE: 'enemy_thorncrawler_toxin_pulse',
} as const;

const PEEPING_EYE_CARD = {
  SENSITIZATION: 'enemy_peeping_eye_sensitization',
  SCAN: 'enemy_peeping_eye_scan',
  SHAME_BURN: 'enemy_peeping_eye_shame_burn',
  ASCEND_DODGE: 'enemy_peeping_eye_ascend_dodge',
} as const;

const SHAME_SHADOW_CARD = {
  MEMORY_PROJECTION: 'enemy_shame_shadow_memory_projection',
  POSSESSION_STRINGS: 'enemy_shame_shadow_possession_strings',
  SHAME_FEAST: 'enemy_shame_shadow_shame_feast',
  BLACK_MIRROR_EVASION: 'enemy_shame_shadow_black_mirror_evasion',
} as const;

const FALLEN_SCHOLAR_CARD = {
  SENSITIVE_DEVELOPMENT: 'enemy_fallen_scholar_sensitive_development',
  RESTRAINED_SUBJECT: 'enemy_fallen_scholar_restrained_subject',
  ACADEMIC_BRAINWASH: 'enemy_fallen_scholar_academic_brainwash',
  COOPERATIVE_EXPERIMENT: 'enemy_fallen_scholar_cooperative_experiment',
  CALM_ASSESSMENT: 'enemy_fallen_scholar_calm_assessment',
} as const;

const DORM_GHOST_CARD = {
  PHASE_IMPACT: 'enemy_dorm_ghost_phase_impact',
  COMMAND_WHISPER: 'enemy_dorm_ghost_command_whisper',
  MULTI_RESONANCE: 'enemy_dorm_ghost_multi_resonance',
  PHANTOM: 'enemy_whisper_ghost_phantom',
} as const;

const CHAIR_MIMIC_CARD = {
  SILENT_DISGUISE: 'enemy_chair_mimic_silent_disguise',
  ARMREST_BIND: 'enemy_chair_mimic_armrest_bind',
  CUSHION_ASSAULT: 'enemy_chair_mimic_cushion_assault',
  BACKREST_LURE: 'enemy_chair_mimic_backrest_lure',
} as const;

const DESK_TENTACLE_CARD = {
  SILENT_DISGUISE: 'enemy_chair_mimic_silent_disguise',
  ARMREST_BIND: 'enemy_chair_mimic_armrest_bind',
  TABLE_EDGE_CLING: 'enemy_desk_tentacle_table_edge_cling',
  SILENT_ENTANGLE: 'enemy_desk_tentacle_silent_entangle',
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

const URSULA_CARD = {
  SILENCE_SPELL: 'enemy_ursula_silence_spell',
  LUST_IMPRINT: 'enemy_ursula_lust_imprint',
  BINDING_LAW: 'enemy_ursula_binding_law',
  WHIP_PUNISH: 'enemy_ursula_whip_punish',
  COMMANDMENT: 'enemy_ursula_commandment',
} as const;

const HILVY_CARD = {
  SILENT_DECREE: 'enemy_hilvy_silent_decree',
  PAPER_BLADE_CUT: 'enemy_hilvy_paper_blade_cut',
  MIME_PULL: 'enemy_hilvy_mime_pull',
  APHONIA: 'enemy_hilvy_aphonia',
  SILENT_NIGHT_EVASION: 'enemy_hilvy_silent_night_evasion',
  SILENT_FINALE: 'enemy_hilvy_silent_finale',
} as const;

const ELIZABETH_CARD = {
  BLOOD_THORNS: 'enemy_elizabeth_blood_thorns',
  COAGULATE_SOLDIER: 'enemy_elizabeth_coagulate_soldier',
  BAT_RAID: 'enemy_elizabeth_bat_raid',
  BOILING_BLOOD_PULSE: 'enemy_elizabeth_boiling_blood_pulse',
  BLOOD_STASIS: 'enemy_elizabeth_blood_stasis',
  BLOOD_MIST_AVATAR: 'enemy_elizabeth_blood_mist_avatar',
} as const;

const INK_LORD_CARD = {
  INK_BRAND_DECREE: 'enemy_ink_lord_ink_brand_decree',
  TENTACLE_ENTANGLE: 'enemy_ink_lord_tentacle_entangle',
  FORCED_SCRIPT: 'enemy_ink_lord_forced_script',
  INK_POOL_EVASION: 'enemy_ink_lord_ink_pool_evasion',
  BLACK_TIDE_INFUSION: 'enemy_ink_lord_black_tide_infusion',
} as const;

const AKASHA_CARD = {
  DESIRE_RETRIEVAL: 'enemy_akasha_desire_retrieval',
  PIN_BIND: 'enemy_akasha_pin_bind',
  HYPNOSIS_PAGE: 'enemy_akasha_hypnosis_page',
  DESIRE_MATERIALIZATION: 'enemy_akasha_desire_materialization',
  REVIEW_EVASION: 'enemy_akasha_review_evasion',
  FINAL_VERDICT: 'enemy_akasha_final_verdict',
} as const;

const DOROTHY_CARD = {
  HOLD_GROUND: 'enemy_dorothy_hold_ground',
  WHIP_DISCIPLINE: 'enemy_dorothy_whip_discipline',
  VOICE_DOMINATION: 'enemy_dorothy_voice_domination',
  HALLWAY_STAND: 'enemy_dorothy_hallway_stand',
} as const;

const VERONICA_CARD = {
  BARBED_FLURRY: 'enemy_veronica_barbed_flurry',
  BONE_WHIP_BIND: 'enemy_veronica_bone_whip_bind',
  BLOOD_DEBT_STRIKE: 'bloodpool_blood_debt_strike',
  TORMENT_CYCLE: 'enemy_veronica_torment_cycle',
  BERSERK: 'enemy_veronica_berserk',
} as const;

const FLOATING_PAGE_CARD = {
  ATTACH: 'enemy_floating_page_attach',
  SENSORY_INFUSION: 'enemy_floating_page_sensory_infusion',
  FORCED_IMMERSION: 'enemy_floating_page_forced_immersion',
} as const;

const INK_MOUSE_CARD = {
  CHARGE: 'enemy_charge',
  COWARDICE: 'enemy_inkmouse_cowardice',
  RUNAWAY: 'enemy_inkmouse_runaway',
  INK_BURST: 'enemy_inkmouse_ink_burst',
  LIQUEFY_REGEN: 'enemy_inkmouse_liquefy_regen',
} as const;

const INK_SLIME_CARD = {
  CHARGE: 'enemy_charge',
  INFILTRATION: 'enemy_ink_slime_invasion',
  CONDENSE: 'enemy_ink_slime_condense',
  SLIME_DODGE: 'enemy_slime_dodge',
} as const;

const INK_BLOB_CARD = {
  INK_TIDE_BIND: 'enemy_ink_blob_ink_tide_bind',
  FLUID_INFILTRATION: 'enemy_ink_blob_fluid_infiltration',
  INK_CURTAIN_EVASION: 'enemy_ink_blob_ink_curtain_evasion',
} as const;

const TENTACLE_QUILL_CARD = {
  LUST_SCRIPT: 'enemy_tentacle_quill_lust_script',
  TIP_ENTANGLE: 'enemy_tentacle_quill_tip_entangle',
  SENSITIVE_NOTE: 'enemy_tentacle_quill_sensitive_note',
  PLUME_EVASION: 'enemy_tentacle_quill_plume_evasion',
} as const;

const WHISPER_GHOST_CARD = {
  PHANTOM: 'enemy_whisper_ghost_phantom',
  KNOWLEDGE_WHISPER: 'enemy_whisper_ghost_knowledge_whisper',
  FORBIDDEN_KNOWLEDGE: 'enemy_whisper_ghost_forbidden_knowledge',
  PASSIVE_SENSITIZATION: 'enemy_whisper_ghost_passive_sensitization',
} as const;

const BOOK_DEMON_CARD = {
  BETWEEN_LINES_TEMPTATION: 'enemy_book_demon_between_lines_temptation',
  INK_TENTACLE: 'enemy_book_demon_ink_tentacle',
  WHISPER_INCITEMENT: 'enemy_book_demon_whisper_incitement',
  KNOWLEDGE_THIRST: 'enemy_book_demon_knowledge_thirst',
} as const;

const JUDGMENT_SPIDER_CARD = {
  BINDING_SILK: 'enemy_judgment_spider_binding_silk',
  CONDUCTION_SILK: 'enemy_judgment_spider_conduction_silk',
  PARALYTIC_PINCER: 'enemy_judgment_spider_paralytic_pincer',
  LURK: 'enemy_vinewalker_lurk',
  SET_AMBUSH: 'enemy_judgment_spider_set_ambush',
} as const;

const STITCHED_SPIDER_CARD = {
  SET_AMBUSH: 'enemy_judgment_spider_set_ambush',
  PARALYTIC_TOXIN: 'enemy_vinewalker_paralytic_toxin',
  PACK_HUNT: 'enemy_stitched_spider_pack_hunt',
  PRECISE_INJECTION: 'enemy_stitched_spider_precise_injection',
} as const;

const ABYSS_JELLYFISH_CARD = {
  NEURAL_EXCITE_FILAMENT: 'enemy_abyss_jellyfish_neural_excite_filament',
  CIRCUITOUS: 'enemy_abyss_jellyfish_circuitous',
  FULL_WRAP: 'enemy_abyss_jellyfish_full_wrap',
  TOXIN_SECRETION: 'enemy_abyss_jellyfish_toxin_secretion',
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
        { type: EffectType.ELEMENTAL_ADAPTATION, stacks: 1, polarity: 'buff' },
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

const PATROL_BAT_ENEMY: EnemyDefinition = {
  name: '巡逻铁蝠',
  stats: {
    hp: 20,
    maxHp: 20,
    mp: 0,
    minDice: 3,
    maxDice: 4,
    effects: [
      { type: EffectType.SELF_REPAIR, stacks: 1, polarity: 'buff' },
      { type: EffectType.SWARM, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    PATROL_BAT_CARD.CLAW_REND,
    PATROL_BAT_CARD.METAL_SCREECH,
    PATROL_BAT_CARD.MARK,
    PATROL_BAT_CARD.FLY_AWAY,
    PATROL_BAT_CARD.CIRCLING,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.flags.patrolBatMarkHit) {
      return pickCardById(ctx, PATROL_BAT_CARD.FLY_AWAY);
    }

    if (ctx.flags.patrolBatLastEnemyCardId === PATROL_BAT_CARD.METAL_SCREECH) {
      return pickCardById(ctx, PATROL_BAT_CARD.MARK);
    }

    const playerHasBleed = ctx.playerStats.effects.some((e) => e.type === EffectType.BLEED && e.stacks > 0);
    if (playerHasBleed || ctx.turn === 6) {
      return pickCardById(ctx, PATROL_BAT_CARD.METAL_SCREECH);
    }

    const chosen = weightedRandom<string>([
      { value: PATROL_BAT_CARD.CLAW_REND, weight: 70 },
      { value: PATROL_BAT_CARD.CIRCLING, weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 羞耻蛭: EnemyDefinition = {
  name: '羞耻蛭',
  defeatNegativeStatus: '[被寄生]',
  stats: {
    hp: 4,
    maxHp: 4,
    mp: 2,
    minDice: 2,
    maxDice: 4,
    effects: [
      { type: EffectType.SWARM, stacks: 3, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    SHAME_LEECH_CARD.PARASITIC_DRILL,
    SHAME_LEECH_CARD.INTERNAL_BREEDING,
    SHAME_LEECH_CARD.SHAME_AMPLIFY,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (!ctx.flags.shameLeechParasiticDrillHit) {
      return pickCardById(ctx, SHAME_LEECH_CARD.PARASITIC_DRILL);
    }

    if (ctx.enemyStats.mp >= 2) {
      const chosen = weightedRandom<string>([
        { value: SHAME_LEECH_CARD.SHAME_AMPLIFY, weight: 70 },
        { value: SHAME_LEECH_CARD.INTERNAL_BREEDING, weight: 30 },
      ]);
      return pickCardById(ctx, chosen);
    }

    return pickCardById(ctx, SHAME_LEECH_CARD.INTERNAL_BREEDING);
  },
};

const 寄生水蛭: EnemyDefinition = {
  name: '寄生水蛭',
  defeatNegativeStatus: '[被寄生]',
  stats: {
    hp: 6,
    maxHp: 6,
    mp: 0,
    minDice: 2,
    maxDice: 4,
    effects: [
      { type: EffectType.SWARM, stacks: 3, polarity: 'buff' },
      { type: EffectType.POINT_GROWTH_BIG, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    PARASITIC_LEECH_CARD.PARASITIC_DRILL,
    PARASITIC_LEECH_CARD.INTERNAL_BREEDING,
    PARASITIC_LEECH_CARD.CUMULATIVE_APHRO,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.flags.shameLeechParasiticDrillHit) {
      const chosen = weightedRandom<string>([
        { value: PARASITIC_LEECH_CARD.CUMULATIVE_APHRO, weight: 40 },
        { value: PARASITIC_LEECH_CARD.INTERNAL_BREEDING, weight: 60 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: PARASITIC_LEECH_CARD.PARASITIC_DRILL, weight: 70 },
      { value: PARASITIC_LEECH_CARD.CUMULATIVE_APHRO, weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 证词虫: EnemyDefinition = {
  name: '证词虫',
  defeatNegativeStatus: '[被寄生]',
  stats: {
    hp: 3,
    maxHp: 3,
    mp: 0,
    minDice: 2,
    maxDice: 4,
    effects: [
      { type: EffectType.SWARM, stacks: 4, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    WITNESS_WORM_CARD.PARASITIC_DRILL,
    WITNESS_WORM_CARD.MENTAL_SHOCK,
    WITNESS_WORM_CARD.RETREAT,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.flags.shameLeechParasiticDrillHit) {
      return pickCardById(ctx, WITNESS_WORM_CARD.RETREAT);
    }

    if (ctx.enemyStats.mp >= 3) {
      return pickCardById(ctx, WITNESS_WORM_CARD.MENTAL_SHOCK);
    }

    return pickCardById(ctx, WITNESS_WORM_CARD.PARASITIC_DRILL);
  },
};

const 缝合蜘蛛: EnemyDefinition = {
  name: '缝合蜘蛛',
  stats: {
    hp: 18,
    maxHp: 18,
    mp: 0,
    minDice: 3,
    maxDice: 5,
    effects: [
      { type: EffectType.SWARM, stacks: 3, polarity: 'buff' },
      { type: EffectType.SELF_REPAIR, stacks: 5, polarity: 'buff' },
      { type: EffectType.NON_LIVING, stacks: 1, polarity: 'trait' },
    ],
  },
  deck: buildDeckById([
    STITCHED_SPIDER_CARD.SET_AMBUSH,
    STITCHED_SPIDER_CARD.PARALYTIC_TOXIN,
    STITCHED_SPIDER_CARD.PACK_HUNT,
    STITCHED_SPIDER_CARD.PRECISE_INJECTION,
  ]),
  defeatNegativeStatus: '[神经肌肉失调]',
  selectCard(ctx: EnemyAIContext) {
    const chosen = weightedRandom<string>([
      { value: STITCHED_SPIDER_CARD.SET_AMBUSH, weight: 20 },
      { value: STITCHED_SPIDER_CARD.PARALYTIC_TOXIN, weight: 30 },
      { value: STITCHED_SPIDER_CARD.PACK_HUNT, weight: 20 },
      { value: STITCHED_SPIDER_CARD.PRECISE_INJECTION, weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 血蝙蝠: EnemyDefinition = {
  name: '血蝙蝠',
  stats: {
    hp: 22,
    maxHp: 22,
    mp: 0,
    minDice: 2,
    maxDice: 6,
    effects: [
      { type: EffectType.SWARM, stacks: 4, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    BLOOD_BAT_CARD.PREDATORY_NIBBLE,
    BLOOD_BAT_CARD.ULTRASONIC_STIMULUS,
    BLOOD_BAT_CARD.SWARM_RESONANCE,
    BLOOD_BAT_CARD.LOW_GLIDE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 4) {
      return pickCardById(ctx, BLOOD_BAT_CARD.SWARM_RESONANCE);
    }

    if (ctx.enemyStats.mp >= 1) {
      const chosen = weightedRandom<string>([
        { value: BLOOD_BAT_CARD.PREDATORY_NIBBLE, weight: 40 },
        { value: BLOOD_BAT_CARD.ULTRASONIC_STIMULUS, weight: 40 },
        { value: BLOOD_BAT_CARD.LOW_GLIDE, weight: 20 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: BLOOD_BAT_CARD.PREDATORY_NIBBLE, weight: 70 },
      { value: BLOOD_BAT_CARD.LOW_GLIDE, weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 血仆: EnemyDefinition = {
  name: '血仆',
  stats: {
    hp: 75,
    maxHp: 75,
    mp: 0,
    minDice: 2,
    maxDice: 4,
    effects: [
      { type: EffectType.WHITE_TURBID, stacks: 1, polarity: 'mixed' },
      { type: EffectType.REGEN, stacks: 5, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    BLOOD_SERVANT_CARD.OFFERING_SMILE,
    BLOOD_SERVANT_CARD.INVITATION,
    BLOOD_SERVANT_CARD.LURE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn === 1) {
      return pickCardById(ctx, BLOOD_SERVANT_CARD.OFFERING_SMILE);
    }

    const chosen = weightedRandom<string>([
      { value: BLOOD_SERVANT_CARD.INVITATION, weight: 50 },
      { value: BLOOD_SERVANT_CARD.LURE, weight: 50 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 梦魇驹: EnemyDefinition = {
  name: '梦魇驹',
  stats: {
    hp: 110,
    maxHp: 110,
    mp: 0,
    minDice: 3,
    maxDice: 7,
    effects: [
      { type: EffectType.SHIELD_BARRIER, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    NIGHTMARE_STEED_CARD.SNIFF,
    NIGHTMARE_STEED_CARD.BRANDED_STOMP,
    NIGHTMARE_STEED_CARD.SADDLE_CAPTURE,
    NIGHTMARE_STEED_CARD.MIST_DUST,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn === 1) {
      return pickCardById(ctx, NIGHTMARE_STEED_CARD.SNIFF);
    }
    if (ctx.turn === 2) {
      return pickCardById(ctx, NIGHTMARE_STEED_CARD.BRANDED_STOMP);
    }
    if (ctx.turn === 3) {
      return pickCardById(ctx, NIGHTMARE_STEED_CARD.MIST_DUST);
    }
    const chosen = weightedRandom<string>([
      { value: NIGHTMARE_STEED_CARD.SNIFF, weight: 50 },
      { value: NIGHTMARE_STEED_CARD.BRANDED_STOMP, weight: 40 },
      { value: NIGHTMARE_STEED_CARD.SADDLE_CAPTURE, weight: 10 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 惩戒傀儡: EnemyDefinition = {
  name: '惩戒傀儡',
  stats: {
    hp: 72,
    maxHp: 72,
    mp: 0,
    minDice: 3,
    maxDice: 6,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.THORNS, stacks: 1, polarity: 'buff' },
      { type: EffectType.SHIELD_BARRIER, stacks: 3, polarity: 'buff' },
      { type: EffectType.SELF_REPAIR, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    PUNISHMENT_PUPPET_CARD.BONE_WHIP,
    PUNISHMENT_PUPPET_CARD.SUCTION_SUPPRESS,
    PUNISHMENT_PUPPET_CARD.OVERLOAD_EXECUTE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 5) {
      const chosen = weightedRandom<string>([
        { value: PUNISHMENT_PUPPET_CARD.BONE_WHIP, weight: 35 },
        { value: PUNISHMENT_PUPPET_CARD.OVERLOAD_EXECUTE, weight: 45 },
        { value: PUNISHMENT_PUPPET_CARD.SUCTION_SUPPRESS, weight: 20 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: PUNISHMENT_PUPPET_CARD.BONE_WHIP, weight: 75 },
      { value: PUNISHMENT_PUPPET_CARD.SUCTION_SUPPRESS, weight: 25 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 刽子手偶: EnemyDefinition = {
  name: '刽子手偶',
  stats: {
    hp: 90,
    maxHp: 90,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.NON_LIVING, stacks: 1, polarity: 'trait' },
      { type: EffectType.SELF_REPAIR, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    EXECUTIONER_PUPPET_CARD.FACELESS_INTIMIDATION,
    EXECUTIONER_PUPPET_CARD.TOOL_SHIFT,
    EXECUTIONER_PUPPET_CARD.EXECUTION,
    EXECUTIONER_PUPPET_CARD.EVADE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn === 1) {
      return pickCardById(ctx, EXECUTIONER_PUPPET_CARD.FACELESS_INTIMIDATION);
    }

    const chosen = weightedRandom<string>([
      { value: EXECUTIONER_PUPPET_CARD.TOOL_SHIFT, weight: 15 },
      { value: EXECUTIONER_PUPPET_CARD.EXECUTION, weight: 55 },
      { value: EXECUTIONER_PUPPET_CARD.EVADE, weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 影牢使魔: EnemyDefinition = {
  name: '影牢使魔',
  stats: {
    hp: 70,
    maxHp: 70,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.ILLUSORY_BODY, stacks: 1, polarity: 'trait' },
    ],
  },
  deck: buildDeckById([
    SHADOW_JAILER_CARD.SHADOW_ASSAULT,
    SHADOW_JAILER_CARD.ENFORCEMENT_LOCK,
    SHADOW_JAILER_CARD.NUMBING_WHIP,
    SHADOW_JAILER_CARD.FORM_SHIFT,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn % 3 === 0 && ctx.flags.shadowJailerFormShiftTurn !== ctx.turn) {
      ctx.flags.shadowJailerFormShiftTurn = ctx.turn;
      return pickCardById(ctx, SHADOW_JAILER_CARD.FORM_SHIFT);
    }

    const chosen = weightedRandom<string>([
      { value: SHADOW_JAILER_CARD.ENFORCEMENT_LOCK, weight: 30 },
      { value: SHADOW_JAILER_CARD.NUMBING_WHIP, weight: 30 },
      { value: SHADOW_JAILER_CARD.SHADOW_ASSAULT, weight: 40 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 荆棘匍匐者: EnemyDefinition = {
  name: '荆棘匍匐者',
  stats: {
    hp: 70,
    maxHp: 70,
    mp: 0,
    minDice: 3,
    maxDice: 4,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.POINT_GROWTH_BIG, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    THORN_CRAWLER_CARD.BARBED_GRASP,
    THORN_CRAWLER_CARD.NEURAL_PIERCE,
    THORN_CRAWLER_CARD.TOXIN_PULSE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const playerHasBind = ctx.playerStats.effects.some((e) => e.type === EffectType.BIND && e.stacks > 0);

    if (playerHasBind && ctx.enemyStats.mp >= 2) {
      return pickCardById(ctx, THORN_CRAWLER_CARD.TOXIN_PULSE);
    }

    if (playerHasBind) {
      return pickCardById(ctx, THORN_CRAWLER_CARD.NEURAL_PIERCE);
    }

    return pickCardById(ctx, THORN_CRAWLER_CARD.BARBED_GRASP);
  },
};

const 刺链蛇: EnemyDefinition = {
  name: '刺链蛇',
  stats: {
    hp: 80,
    maxHp: 80,
    mp: 0,
    minDice: 2,
    maxDice: 3,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.POINT_GROWTH_BIG, stacks: 1, polarity: 'buff' },
      { type: EffectType.POINT_GROWTH_SMALL, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    SPINE_CHAIN_SNAKE_CARD.LURK,
    SPINE_CHAIN_SNAKE_CARD.BARBED_GRASP,
    SPINE_CHAIN_SNAKE_CARD.NEURAL_PIERCE,
    SPINE_CHAIN_SNAKE_CARD.TOXIN_PULSE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (!ctx.flags.spineChainSnakeOpenedWithLurk) {
      ctx.flags.spineChainSnakeOpenedWithLurk = true;
      return pickCardById(ctx, SPINE_CHAIN_SNAKE_CARD.LURK);
    }

    const playerHasBind = ctx.playerStats.effects.some((e) => e.type === EffectType.BIND && e.stacks > 0);
    const selfHasAmbush = ctx.enemyStats.effects.some((e) => e.type === EffectType.AMBUSH && e.stacks > 0);

    if (playerHasBind && ctx.enemyStats.mp >= 2) {
      return pickCardById(ctx, SPINE_CHAIN_SNAKE_CARD.TOXIN_PULSE);
    }

    if (playerHasBind) {
      const chosen = weightedRandom<string>([
        { value: SPINE_CHAIN_SNAKE_CARD.NEURAL_PIERCE, weight: 70 },
        { value: SPINE_CHAIN_SNAKE_CARD.BARBED_GRASP, weight: 30 },
      ]);
      return pickCardById(ctx, chosen);
    }

    if (!selfHasAmbush) {
      const chosen = weightedRandom<string>([
        { value: SPINE_CHAIN_SNAKE_CARD.BARBED_GRASP, weight: 55 },
        { value: SPINE_CHAIN_SNAKE_CARD.LURK, weight: 45 },
      ]);
      return pickCardById(ctx, chosen);
    }

    if (ctx.enemyStats.mp >= 2) {
      const chosen = weightedRandom<string>([
        { value: SPINE_CHAIN_SNAKE_CARD.BARBED_GRASP, weight: 45 },
        { value: SPINE_CHAIN_SNAKE_CARD.NEURAL_PIERCE, weight: 35 },
        { value: SPINE_CHAIN_SNAKE_CARD.TOXIN_PULSE, weight: 20 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: SPINE_CHAIN_SNAKE_CARD.BARBED_GRASP, weight: 60 },
      { value: SPINE_CHAIN_SNAKE_CARD.NEURAL_PIERCE, weight: 40 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 窥视之眼: EnemyDefinition = {
  name: '窥视之眼',
  stats: {
    hp: 8,
    maxHp: 8,
    mp: 2,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
      { type: EffectType.SWARM, stacks: 3, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    PEEPING_EYE_CARD.SENSITIZATION,
    PEEPING_EYE_CARD.SCAN,
    PEEPING_EYE_CARD.SHAME_BURN,
    PEEPING_EYE_CARD.ASCEND_DODGE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn % 4 === 0) {
      return pickCardById(ctx, PEEPING_EYE_CARD.SENSITIZATION);
    }

    if (ctx.enemyStats.mp >= 3) {
      const chosen = weightedRandom<string>([
        { value: PEEPING_EYE_CARD.SCAN, weight: 30 },
        { value: PEEPING_EYE_CARD.SHAME_BURN, weight: 45 },
        { value: PEEPING_EYE_CARD.ASCEND_DODGE, weight: 25 },
      ]);
      return pickCardById(ctx, chosen);
    }

    return pickCardById(ctx, PEEPING_EYE_CARD.ASCEND_DODGE);
  },
};

const 羞耻阴影: EnemyDefinition = {
  name: '羞耻阴影',
  stats: {
    hp: 24,
    maxHp: 24,
    mp: 0,
    minDice: 1,
    maxDice: 3,
    effects: [
      { type: EffectType.NON_ENTITY, stacks: 1, polarity: 'trait' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.MATERIALIZATION, stacks: 6, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    SHAME_SHADOW_CARD.MEMORY_PROJECTION,
    SHAME_SHADOW_CARD.POSSESSION_STRINGS,
    SHAME_SHADOW_CARD.SHAME_FEAST,
    SHAME_SHADOW_CARD.BLACK_MIRROR_EVASION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn % 4 === 0) {
      return pickCardById(ctx, SHAME_SHADOW_CARD.SHAME_FEAST);
    }

    if (ctx.enemyStats.mp >= 3) {
      const chosen = weightedRandom<string>([
        { value: SHAME_SHADOW_CARD.MEMORY_PROJECTION, weight: 55 },
        { value: SHAME_SHADOW_CARD.POSSESSION_STRINGS, weight: 30 },
        { value: SHAME_SHADOW_CARD.BLACK_MIRROR_EVASION, weight: 15 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: SHAME_SHADOW_CARD.BLACK_MIRROR_EVASION, weight: 45 },
      { value: SHAME_SHADOW_CARD.POSSESSION_STRINGS, weight: 55 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 堕落学者: EnemyDefinition = {
  name: '堕落学者',
  stats: {
    hp: 40,
    maxHp: 40,
    mp: 0,
    minDice: 3,
    maxDice: 6,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    FALLEN_SCHOLAR_CARD.SENSITIVE_DEVELOPMENT,
    FALLEN_SCHOLAR_CARD.RESTRAINED_SUBJECT,
    FALLEN_SCHOLAR_CARD.ACADEMIC_BRAINWASH,
    FALLEN_SCHOLAR_CARD.COOPERATIVE_EXPERIMENT,
    FALLEN_SCHOLAR_CARD.CALM_ASSESSMENT,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn === 1) {
      return pickCardById(ctx, FALLEN_SCHOLAR_CARD.SENSITIVE_DEVELOPMENT);
    }

    if (ctx.enemyStats.mp >= 3) {
      const chosen = weightedRandom<string>([
        { value: FALLEN_SCHOLAR_CARD.ACADEMIC_BRAINWASH, weight: 60 },
        { value: FALLEN_SCHOLAR_CARD.RESTRAINED_SUBJECT, weight: 25 },
        { value: FALLEN_SCHOLAR_CARD.CALM_ASSESSMENT, weight: 15 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const playerHasBind = ctx.playerStats.effects.some((e) => e.type === EffectType.BIND && e.stacks > 0);
    if (playerHasBind) {
      const chosen = weightedRandom<string>([
        { value: FALLEN_SCHOLAR_CARD.COOPERATIVE_EXPERIMENT, weight: 60 },
        { value: FALLEN_SCHOLAR_CARD.RESTRAINED_SUBJECT, weight: 25 },
        { value: FALLEN_SCHOLAR_CARD.CALM_ASSESSMENT, weight: 15 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: FALLEN_SCHOLAR_CARD.RESTRAINED_SUBJECT, weight: 40 },
      { value: FALLEN_SCHOLAR_CARD.SENSITIVE_DEVELOPMENT, weight: 35 },
      { value: FALLEN_SCHOLAR_CARD.CALM_ASSESSMENT, weight: 25 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 宿舍幽灵: EnemyDefinition = {
  name: '宿舍幽灵',
  stats: {
    hp: 35,
    maxHp: 35,
    mp: 0,
    minDice: 1,
    maxDice: 1,
    effects: [
      { type: EffectType.NON_ENTITY, stacks: 1, polarity: 'trait' },
      { type: EffectType.NON_LIVING, stacks: 1, polarity: 'trait' },
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
      { type: EffectType.POINT_GROWTH_BIG, stacks: 1, polarity: 'buff' },
      { type: EffectType.POINT_GROWTH_SMALL, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    DORM_GHOST_CARD.PHASE_IMPACT,
    DORM_GHOST_CARD.COMMAND_WHISPER,
    DORM_GHOST_CARD.MULTI_RESONANCE,
    DORM_GHOST_CARD.PHANTOM,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 4) {
      return pickCardById(ctx, DORM_GHOST_CARD.MULTI_RESONANCE);
    }

    if (ctx.enemyStats.mp >= 2) {
      const chosen = weightedRandom<string>([
        { value: DORM_GHOST_CARD.COMMAND_WHISPER, weight: 45 },
        { value: DORM_GHOST_CARD.PHASE_IMPACT, weight: 35 },
        { value: DORM_GHOST_CARD.PHANTOM, weight: 20 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: DORM_GHOST_CARD.PHASE_IMPACT, weight: 65 },
      { value: DORM_GHOST_CARD.PHANTOM, weight: 35 },
    ]);
    return pickCardById(ctx, chosen);
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
  defeatNegativeStatus: '[被侵蚀]',
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

const 厄休拉: EnemyDefinition = {
  name: '厄休拉',
  stats: {
    hp: 100,
    maxHp: 100,
    mp: 3,
    minDice: 3,
    maxDice: 8,
    effects: [
      { type: EffectType.INK_CREATION, stacks: 1, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    URSULA_CARD.SILENCE_SPELL,
    URSULA_CARD.LUST_IMPRINT,
    URSULA_CARD.BINDING_LAW,
    URSULA_CARD.WHIP_PUNISH,
    URSULA_CARD.COMMANDMENT,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const playerHasSilence = ctx.playerStats.effects.some((e) => e.type === EffectType.SILENCE && e.stacks > 0);
    if (ctx.enemyStats.mp >= 6 && playerHasSilence) {
      return pickCardById(ctx, URSULA_CARD.LUST_IMPRINT);
    }

    const playerHasBind = ctx.playerStats.effects.some((e) => e.type === EffectType.BIND && e.stacks > 0);
    if (playerHasBind) {
      const chosen = weightedRandom<string>([
        { value: URSULA_CARD.SILENCE_SPELL, weight: 20 },
        { value: URSULA_CARD.BINDING_LAW, weight: 20 },
        { value: URSULA_CARD.WHIP_PUNISH, weight: 50 },
        { value: URSULA_CARD.COMMANDMENT, weight: 10 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: URSULA_CARD.SILENCE_SPELL, weight: 40 },
      { value: URSULA_CARD.BINDING_LAW, weight: 30 },
      { value: URSULA_CARD.COMMANDMENT, weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 希尔薇: EnemyDefinition = {
  name: '希尔薇',
  stats: {
    hp: 100,
    maxHp: 100,
    mp: 0,
    minDice: 3,
    maxDice: 7,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    HILVY_CARD.SILENT_DECREE,
    HILVY_CARD.PAPER_BLADE_CUT,
    HILVY_CARD.MIME_PULL,
    HILVY_CARD.APHONIA,
    HILVY_CARD.SILENT_NIGHT_EVASION,
    HILVY_CARD.SILENT_FINALE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const playerHasSilence = ctx.playerStats.effects.some((e) => e.type === EffectType.SILENCE && e.stacks > 0);
    if (ctx.enemyStats.mp >= 6 && playerHasSilence) {
      return pickCardById(ctx, HILVY_CARD.SILENT_FINALE);
    }

    if (ctx.enemyStats.mp >= 4) {
      const chosen = weightedRandom<string>([
        { value: HILVY_CARD.SILENT_DECREE, weight: 15 },
        { value: HILVY_CARD.MIME_PULL, weight: 15 },
        { value: HILVY_CARD.APHONIA, weight: 15 },
        { value: HILVY_CARD.SILENT_NIGHT_EVASION, weight: 25 },
        { value: HILVY_CARD.PAPER_BLADE_CUT, weight: 30 },
      ]);
      return pickCardById(ctx, chosen);
    }

    if (ctx.enemyStats.mp >= 3) {
      const chosen = weightedRandom<string>([
        { value: HILVY_CARD.SILENT_DECREE, weight: 20 },
        { value: HILVY_CARD.MIME_PULL, weight: 20 },
        { value: HILVY_CARD.SILENT_NIGHT_EVASION, weight: 25 },
        { value: HILVY_CARD.PAPER_BLADE_CUT, weight: 35 },
      ]);
      return pickCardById(ctx, chosen);
    }

    if (ctx.enemyStats.mp >= 2) {
      const chosen = weightedRandom<string>([
        { value: HILVY_CARD.SILENT_DECREE, weight: 30 },
        { value: HILVY_CARD.SILENT_NIGHT_EVASION, weight: 30 },
        { value: HILVY_CARD.PAPER_BLADE_CUT, weight: 40 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: HILVY_CARD.SILENT_NIGHT_EVASION, weight: 35 },
      { value: HILVY_CARD.PAPER_BLADE_CUT, weight: 65 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 伊丽莎白: EnemyDefinition = {
  name: '伊丽莎白',
  defeatNegativeStatus: ['[催淫]', '[血族印记]'],
  stats: {
    hp: 250,
    maxHp: 250,
    mp: 0,
    minDice: 6,
    maxDice: 10,
    effects: [
      { type: EffectType.BLOODLINE, stacks: 1, polarity: 'buff' },
      { type: EffectType.CONTRACT_CURSE, stacks: 1, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    ELIZABETH_CARD.BLOOD_THORNS,
    ELIZABETH_CARD.COAGULATE_SOLDIER,
    ELIZABETH_CARD.BAT_RAID,
    ELIZABETH_CARD.BOILING_BLOOD_PULSE,
    ELIZABETH_CARD.BLOOD_STASIS,
    ELIZABETH_CARD.BLOOD_MIST_AVATAR,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const hasIllusoryBody = ctx.enemyStats.effects.some((e) => e.type === EffectType.ILLUSORY_BODY && e.stacks > 0);
    const isBelowSixtyPercentHp = ctx.enemyStats.maxHp > 0 && (ctx.enemyStats.hp * 5) < (ctx.enemyStats.maxHp * 3);
    if (isBelowSixtyPercentHp && !hasIllusoryBody) {
      return pickCardById(ctx, ELIZABETH_CARD.BLOOD_MIST_AVATAR);
    }

    if (ctx.enemyStats.mp >= 4) {
      const chosen = weightedRandom<string>([
        { value: ELIZABETH_CARD.BLOOD_THORNS, weight: 25 },
        { value: ELIZABETH_CARD.COAGULATE_SOLDIER, weight: 15 },
        { value: ELIZABETH_CARD.BOILING_BLOOD_PULSE, weight: 30 },
        { value: ELIZABETH_CARD.BLOOD_STASIS, weight: 30 },
      ]);
      return pickCardById(ctx, chosen);
    }

    if (ctx.enemyStats.mp >= 2) {
      const chosen = weightedRandom<string>([
        { value: ELIZABETH_CARD.BLOOD_THORNS, weight: 40 },
        { value: ELIZABETH_CARD.COAGULATE_SOLDIER, weight: 20 },
        { value: ELIZABETH_CARD.BLOOD_STASIS, weight: 40 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: ELIZABETH_CARD.BLOOD_THORNS, weight: 20 },
      { value: ELIZABETH_CARD.COAGULATE_SOLDIER, weight: 20 },
      { value: ELIZABETH_CARD.BAT_RAID, weight: 60 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 因克: EnemyDefinition = {
  name: '因克',
  defeatNegativeStatus: '[被侵蚀]',
  stats: {
    hp: 100,
    maxHp: 100,
    mp: 1,
    minDice: 3,
    maxDice: 6,
    effects: [
      { type: EffectType.NON_ENTITY, stacks: 1, polarity: 'trait' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.INK_CREATION, stacks: 1, polarity: 'buff' },
      { type: EffectType.ELEMENTAL_CORTEX, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    INK_LORD_CARD.INK_BRAND_DECREE,
    INK_LORD_CARD.TENTACLE_ENTANGLE,
    INK_LORD_CARD.FORCED_SCRIPT,
    INK_LORD_CARD.INK_POOL_EVASION,
    INK_LORD_CARD.BLACK_TIDE_INFUSION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const playerHasControlled = ctx.playerStats.effects.some((e) => e.type === EffectType.CONTROLLED && e.stacks > 0);
    if ((ctx.enemyStats.mp >= 6 && playerHasControlled) || ctx.enemyStats.mp >= 10) {
      return pickCardById(ctx, INK_LORD_CARD.BLACK_TIDE_INFUSION);
    }

    const playerHasBind = ctx.playerStats.effects.some((e) => e.type === EffectType.BIND && e.stacks > 0);
    if (playerHasBind) {
      const chosen = weightedRandom<string>([
        { value: INK_LORD_CARD.FORCED_SCRIPT, weight: 50 },
        { value: INK_LORD_CARD.INK_BRAND_DECREE, weight: 20 },
        { value: INK_LORD_CARD.TENTACLE_ENTANGLE, weight: 20 },
        { value: INK_LORD_CARD.INK_POOL_EVASION, weight: 10 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: INK_LORD_CARD.INK_BRAND_DECREE, weight: 35 },
      { value: INK_LORD_CARD.TENTACLE_ENTANGLE, weight: 35 },
      { value: INK_LORD_CARD.INK_POOL_EVASION, weight: 30 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 阿卡夏: EnemyDefinition = {
  name: '阿卡夏',
  stats: {
    hp: 90,
    maxHp: 90,
    mp: 0,
    minDice: 3,
    maxDice: 7,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
      { type: EffectType.MIND_READ, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    AKASHA_CARD.DESIRE_RETRIEVAL,
    AKASHA_CARD.PIN_BIND,
    AKASHA_CARD.HYPNOSIS_PAGE,
    AKASHA_CARD.DESIRE_MATERIALIZATION,
    AKASHA_CARD.REVIEW_EVASION,
    AKASHA_CARD.FINAL_VERDICT,
  ]),
  selectCard(ctx: EnemyAIContext) {
    return selectCardByMindRead(ctx);
  },
};

const 多萝西: EnemyDefinition = {
  name: '多萝西',
  stats: {
    hp: 120,
    maxHp: 120,
    mp: 0,
    minDice: 5,
    maxDice: 8,
    effects: [
      { type: EffectType.REGEN, stacks: 1, polarity: 'buff' },
      { type: EffectType.WHITE_TURBID, stacks: 1, polarity: 'mixed' },
    ],
  },
  deck: buildDeckById([
    DOROTHY_CARD.HOLD_GROUND,
    DOROTHY_CARD.WHIP_DISCIPLINE,
    DOROTHY_CARD.VOICE_DOMINATION,
    DOROTHY_CARD.HALLWAY_STAND,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const chosen = weightedRandom<string>([
      { value: DOROTHY_CARD.HOLD_GROUND, weight: 25 },
      { value: DOROTHY_CARD.WHIP_DISCIPLINE, weight: 25 },
      { value: DOROTHY_CARD.VOICE_DOMINATION, weight: 25 },
      { value: DOROTHY_CARD.HALLWAY_STAND, weight: 25 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 维罗妮卡: EnemyDefinition = {
  name: '维罗妮卡',
  stats: {
    hp: 200,
    maxHp: 200,
    mp: 0,
    minDice: 4,
    maxDice: 10,
    effects: [
      { type: EffectType.OBEDIENCE_BRAND, stacks: 1, polarity: 'trait' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    VERONICA_CARD.BARBED_FLURRY,
    VERONICA_CARD.BONE_WHIP_BIND,
    VERONICA_CARD.BLOOD_DEBT_STRIKE,
    VERONICA_CARD.TORMENT_CYCLE,
    VERONICA_CARD.BERSERK,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const hpRatio = ctx.enemyStats.maxHp > 0 ? ctx.enemyStats.hp / ctx.enemyStats.maxHp : 0;
    const playerHasBleed = ctx.playerStats.effects.some((e) => e.type === EffectType.BLEED && e.stacks > 0);
    const berserkNotUsed = ctx.flags.veronicaBerserkUsed !== true;
    const canUseBerserkNow = ctx.deck.some((card) => card.id === VERONICA_CARD.BERSERK);

    if (berserkNotUsed && hpRatio < 0.5 && canUseBerserkNow) {
      ctx.flags.veronicaBerserkUsed = true;
      return pickCardById(ctx, VERONICA_CARD.BERSERK);
    }

    if (ctx.enemyStats.mp >= 6 && playerHasBleed) {
      const chosen = weightedRandom<string>([
        { value: VERONICA_CARD.BARBED_FLURRY, weight: 30 },
        { value: VERONICA_CARD.BONE_WHIP_BIND, weight: 20 },
        { value: VERONICA_CARD.TORMENT_CYCLE, weight: 50 },
      ]);
      return pickCardById(ctx, chosen);
    }

    if (hpRatio < 0.75) {
      const chosen = weightedRandom<string>([
        { value: VERONICA_CARD.BARBED_FLURRY, weight: 40 },
        { value: VERONICA_CARD.BONE_WHIP_BIND, weight: 30 },
        { value: VERONICA_CARD.BLOOD_DEBT_STRIKE, weight: 30 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: VERONICA_CARD.BARBED_FLURRY, weight: 60 },
      { value: VERONICA_CARD.BONE_WHIP_BIND, weight: 40 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 浮游书页: EnemyDefinition = {
  name: '浮游书页',
  stats: {
    hp: 2,
    maxHp: 2,
    mp: 0,
    minDice: 1,
    maxDice: 4,
    effects: [
      { type: EffectType.SWARM, stacks: 8, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
      { type: EffectType.INK_CREATION, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    FLOATING_PAGE_CARD.ATTACH,
    FLOATING_PAGE_CARD.SENSORY_INFUSION,
    FLOATING_PAGE_CARD.FORCED_IMMERSION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const playerCorrosion = ctx.playerStats.effects.find((e) => e.type === EffectType.CORROSION)?.stacks ?? 0;
    const playerHasBind = ctx.playerStats.effects.some((e) => e.type === EffectType.BIND && e.stacks > 0);
    if (ctx.enemyStats.mp >= 4 && playerCorrosion >= 3) {
      return pickCardById(ctx, FLOATING_PAGE_CARD.SENSORY_INFUSION);
    }
    if (ctx.enemyStats.mp >= 2 && playerHasBind) {
      return pickCardById(ctx, FLOATING_PAGE_CARD.FORCED_IMMERSION);
    }
    return pickCardById(ctx, FLOATING_PAGE_CARD.ATTACH);
  },
};

const 墨痕鼠: EnemyDefinition = {
  name: '墨痕鼠',
  stats: {
    hp: 6,
    maxHp: 6,
    mp: 0,
    minDice: 2,
    maxDice: 4,
    effects: [
      { type: EffectType.SWARM, stacks: 4, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.INK_CREATION, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    INK_MOUSE_CARD.CHARGE,
    INK_MOUSE_CARD.COWARDICE,
    INK_MOUSE_CARD.RUNAWAY,
    INK_MOUSE_CARD.INK_BURST,
    INK_MOUSE_CARD.LIQUEFY_REGEN,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const selfSwarm = ctx.enemyStats.effects.find((e) => e.type === EffectType.SWARM)?.stacks ?? 0;
    if (selfSwarm <= 0 && ctx.enemyStats.maxHp <= 1) {
      return pickCardById(ctx, INK_MOUSE_CARD.RUNAWAY);
    }
    if (selfSwarm <= 1 && ctx.enemyStats.maxHp > 1) {
      return pickCardById(ctx, INK_MOUSE_CARD.LIQUEFY_REGEN);
    }
    if (ctx.enemyStats.mp >= 2) {
      return pickCardById(ctx, INK_MOUSE_CARD.INK_BURST);
    }
    const chosen = weightedRandom<string>([
      { value: INK_MOUSE_CARD.CHARGE, weight: 75 },
      { value: INK_MOUSE_CARD.COWARDICE, weight: 25 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 低语幽灵: EnemyDefinition = {
  name: '低语幽灵',
  stats: {
    hp: 30,
    maxHp: 30,
    mp: 0,
    minDice: 3,
    maxDice: 6,
    effects: [
      { type: EffectType.NON_ENTITY, stacks: 1, polarity: 'trait' },
      { type: EffectType.NON_LIVING, stacks: 1, polarity: 'trait' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    WHISPER_GHOST_CARD.PHANTOM,
    WHISPER_GHOST_CARD.KNOWLEDGE_WHISPER,
    WHISPER_GHOST_CARD.FORBIDDEN_KNOWLEDGE,
    WHISPER_GHOST_CARD.PASSIVE_SENSITIZATION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 10) {
      return pickCardById(ctx, WHISPER_GHOST_CARD.FORBIDDEN_KNOWLEDGE);
    }

    if (ctx.turn % 4 === 0) {
      return pickCardById(ctx, WHISPER_GHOST_CARD.PASSIVE_SENSITIZATION);
    }

    if (ctx.enemyStats.mp >= 2) {
      const chosen = weightedRandom<string>([
        { value: WHISPER_GHOST_CARD.KNOWLEDGE_WHISPER, weight: 70 },
        { value: WHISPER_GHOST_CARD.PHANTOM, weight: 30 },
      ]);
      return pickCardById(ctx, chosen);
    }

    return pickCardById(ctx, WHISPER_GHOST_CARD.PHANTOM);
  },
};

const 墨水史莱姆: EnemyDefinition = {
  name: '墨水史莱姆',
  stats: {
    hp: 10,
    maxHp: 10,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.SWARM, stacks: 3, polarity: 'buff' },
      { type: EffectType.INK_CREATION, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    INK_SLIME_CARD.CHARGE,
    INK_SLIME_CARD.INFILTRATION,
    INK_SLIME_CARD.CONDENSE,
    INK_SLIME_CARD.SLIME_DODGE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const selfSwarm = ctx.enemyStats.effects.find((e) => e.type === EffectType.SWARM)?.stacks ?? 0;
    if (selfSwarm <= 1) {
      const chosen = weightedRandom<string>([
        { value: INK_SLIME_CARD.CHARGE, weight: 20 },
        { value: INK_SLIME_CARD.INFILTRATION, weight: 20 },
        { value: INK_SLIME_CARD.CONDENSE, weight: 30 },
        { value: INK_SLIME_CARD.SLIME_DODGE, weight: 30 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: INK_SLIME_CARD.CHARGE, weight: 30 },
      { value: INK_SLIME_CARD.INFILTRATION, weight: 30 },
      { value: INK_SLIME_CARD.SLIME_DODGE, weight: 40 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 墨团怪: EnemyDefinition = {
  name: '墨团怪',
  stats: {
    hp: 16,
    maxHp: 16,
    mp: 0,
    minDice: 2,
    maxDice: 6,
    effects: [
      { type: EffectType.NON_ENTITY, stacks: 1, polarity: 'trait' },
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.INK_CREATION, stacks: 1, polarity: 'buff' },
      { type: EffectType.SWARM, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    INK_BLOB_CARD.INK_TIDE_BIND,
    INK_BLOB_CARD.FLUID_INFILTRATION,
    INK_BLOB_CARD.INK_CURTAIN_EVASION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.enemyStats.mp >= 2) {
      const chosen = weightedRandom<string>([
        { value: INK_BLOB_CARD.FLUID_INFILTRATION, weight: 70 },
        { value: INK_BLOB_CARD.INK_TIDE_BIND, weight: 15 },
        { value: INK_BLOB_CARD.INK_CURTAIN_EVASION, weight: 15 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: INK_BLOB_CARD.INK_TIDE_BIND, weight: 55 },
      { value: INK_BLOB_CARD.INK_CURTAIN_EVASION, weight: 45 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 触手羽毛笔: EnemyDefinition = {
  name: '触手羽毛笔',
  stats: {
    hp: 18,
    maxHp: 18,
    mp: 6,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
      { type: EffectType.INK_CREATION, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    TENTACLE_QUILL_CARD.LUST_SCRIPT,
    TENTACLE_QUILL_CARD.TIP_ENTANGLE,
    TENTACLE_QUILL_CARD.SENSITIVE_NOTE,
    TENTACLE_QUILL_CARD.PLUME_EVASION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn === 3) {
      return pickCardById(ctx, TENTACLE_QUILL_CARD.LUST_SCRIPT);
    }

    if (ctx.enemyStats.mp >= 2) {
      const chosen = weightedRandom<string>([
        { value: TENTACLE_QUILL_CARD.TIP_ENTANGLE, weight: 25 },
        { value: TENTACLE_QUILL_CARD.SENSITIVE_NOTE, weight: 50 },
        { value: TENTACLE_QUILL_CARD.PLUME_EVASION, weight: 25 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: TENTACLE_QUILL_CARD.TIP_ENTANGLE, weight: 60 },
      { value: TENTACLE_QUILL_CARD.PLUME_EVASION, weight: 40 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 书魔: EnemyDefinition = {
  name: '书魔',
  stats: {
    hp: 30,
    maxHp: 30,
    mp: 20,
    minDice: 3,
    maxDice: 5,
    effects: [
      { type: EffectType.INK_CREATION, stacks: 1, polarity: 'buff' },
      { type: EffectType.MANA_SPRING, stacks: 2, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    BOOK_DEMON_CARD.BETWEEN_LINES_TEMPTATION,
    BOOK_DEMON_CARD.INK_TENTACLE,
    BOOK_DEMON_CARD.WHISPER_INCITEMENT,
    BOOK_DEMON_CARD.KNOWLEDGE_THIRST,
  ]),
  selectCard(ctx: EnemyAIContext) {
    const chosen = weightedRandom<string>([
      { value: BOOK_DEMON_CARD.BETWEEN_LINES_TEMPTATION, weight: 35 },
      { value: BOOK_DEMON_CARD.INK_TENTACLE, weight: 35 },
      { value: BOOK_DEMON_CARD.WHISPER_INCITEMENT, weight: 10 },
      { value: BOOK_DEMON_CARD.KNOWLEDGE_THIRST, weight: 20 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const CHAIR_MIMIC_ENEMY: EnemyDefinition = {
  name: '椅子拟态怪',
  stats: {
    hp: 32,
    maxHp: 32,
    mp: 0,
    minDice: 2,
    maxDice: 5,
    effects: [
      { type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    CHAIR_MIMIC_CARD.SILENT_DISGUISE,
    CHAIR_MIMIC_CARD.ARMREST_BIND,
    CHAIR_MIMIC_CARD.CUSHION_ASSAULT,
    CHAIR_MIMIC_CARD.BACKREST_LURE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn === 1 || ctx.turn % 4 === 0) {
      return pickCardById(ctx, CHAIR_MIMIC_CARD.SILENT_DISGUISE);
    }

    if (ctx.enemyStats.mp < 2) {
      const lowManaChoice = weightedRandom<string>([
        { value: CHAIR_MIMIC_CARD.ARMREST_BIND, weight: 60 },
        { value: CHAIR_MIMIC_CARD.BACKREST_LURE, weight: 40 },
      ]);
      return pickCardById(ctx, lowManaChoice);
    }

    const chosen = weightedRandom<string>([
      { value: CHAIR_MIMIC_CARD.ARMREST_BIND, weight: 30 },
      { value: CHAIR_MIMIC_CARD.BACKREST_LURE, weight: 20 },
      { value: CHAIR_MIMIC_CARD.CUSHION_ASSAULT, weight: 50 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 桌面触手: EnemyDefinition = {
  name: '桌面触手',
  stats: {
    hp: 28,
    maxHp: 28,
    mp: 0,
    minDice: 1,
    maxDice: 4,
    effects: [],
  },
  deck: buildDeckById([
    DESK_TENTACLE_CARD.SILENT_DISGUISE,
    DESK_TENTACLE_CARD.ARMREST_BIND,
    DESK_TENTACLE_CARD.TABLE_EDGE_CLING,
    DESK_TENTACLE_CARD.SILENT_ENTANGLE,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.turn === 1) {
      return pickCardById(ctx, DESK_TENTACLE_CARD.SILENT_DISGUISE);
    }

    const hasAmbush = ctx.enemyStats.effects.some((e) => e.type === EffectType.AMBUSH && e.stacks > 0);
    if (!hasAmbush) {
      const chosen = weightedRandom<string>([
        { value: DESK_TENTACLE_CARD.SILENT_DISGUISE, weight: 50 },
        { value: DESK_TENTACLE_CARD.TABLE_EDGE_CLING, weight: 15 },
        { value: DESK_TENTACLE_CARD.ARMREST_BIND, weight: 15 },
        { value: DESK_TENTACLE_CARD.SILENT_ENTANGLE, weight: 20 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: DESK_TENTACLE_CARD.TABLE_EDGE_CLING, weight: 30 },
      { value: DESK_TENTACLE_CARD.ARMREST_BIND, weight: 30 },
      { value: DESK_TENTACLE_CARD.SILENT_ENTANGLE, weight: 40 },
    ]);
    return pickCardById(ctx, chosen);
  },
};

const 审判蛛: EnemyDefinition = {
  name: '审判蛛',
  stats: {
    hp: 70,
    maxHp: 70,
    mp: 0,
    minDice: 3,
    maxDice: 6,
    effects: [
      { type: EffectType.MIND_READ, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    JUDGMENT_SPIDER_CARD.BINDING_SILK,
    JUDGMENT_SPIDER_CARD.CONDUCTION_SILK,
    JUDGMENT_SPIDER_CARD.PARALYTIC_PINCER,
    JUDGMENT_SPIDER_CARD.LURK,
    JUDGMENT_SPIDER_CARD.SET_AMBUSH,
  ]),
  selectCard(ctx: EnemyAIContext) {
    return selectCardByMindRead(ctx);
  },
};

const 深渊水母: EnemyDefinition = {
  name: '深渊水母',
  stats: {
    hp: 85,
    maxHp: 85,
    mp: 0,
    minDice: 2,
    maxDice: 6,
    effects: [
      { type: EffectType.TOXIN_SPREAD, stacks: 1, polarity: 'buff' },
    ],
  },
  deck: buildDeckById([
    ABYSS_JELLYFISH_CARD.NEURAL_EXCITE_FILAMENT,
    ABYSS_JELLYFISH_CARD.CIRCUITOUS,
    ABYSS_JELLYFISH_CARD.FULL_WRAP,
    ABYSS_JELLYFISH_CARD.TOXIN_SECRETION,
  ]),
  selectCard(ctx: EnemyAIContext) {
    if (ctx.flags.abyssJellyfishFullWrapHit) {
      return pickCardById(ctx, ABYSS_JELLYFISH_CARD.TOXIN_SECRETION);
    }

    if (ctx.flags.abyssJellyfishLastEnemyCardId === ABYSS_JELLYFISH_CARD.CIRCUITOUS) {
      const chosen = weightedRandom<string>([
        { value: ABYSS_JELLYFISH_CARD.NEURAL_EXCITE_FILAMENT, weight: 35 },
        { value: ABYSS_JELLYFISH_CARD.FULL_WRAP, weight: 65 },
      ]);
      return pickCardById(ctx, chosen);
    }

    const chosen = weightedRandom<string>([
      { value: ABYSS_JELLYFISH_CARD.NEURAL_EXCITE_FILAMENT, weight: 60 },
      { value: ABYSS_JELLYFISH_CARD.CIRCUITOUS, weight: 40 },
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
  [PATROL_BAT_ENEMY.name, PATROL_BAT_ENEMY],
  [羞耻蛭.name, 羞耻蛭],
  [寄生水蛭.name, 寄生水蛭],
  [证词虫.name, 证词虫],
  [缝合蜘蛛.name, 缝合蜘蛛],
  [血蝙蝠.name, 血蝙蝠],
  [血仆.name, 血仆],
  [梦魇驹.name, 梦魇驹],
  [刽子手偶.name, 刽子手偶],
  [惩戒傀儡.name, 惩戒傀儡],
  [影牢使魔.name, 影牢使魔],
  [荆棘匍匐者.name, 荆棘匍匐者],
  [刺链蛇.name, 刺链蛇],
  [窥视之眼.name, 窥视之眼],
  [羞耻阴影.name, 羞耻阴影],
  [堕落学者.name, 堕落学者],
  [宿舍幽灵.name, 宿舍幽灵],
  [CHAIR_MIMIC_ENEMY.name, CHAIR_MIMIC_ENEMY],
  [桌面触手.name, 桌面触手],
  [审判蛛.name, 审判蛛],
  [深渊水母.name, 深渊水母],
  [普莉姆.name, 普莉姆],
  [宁芙.name, 宁芙],
  [温蒂尼.name, 温蒂尼],
  [玛塔.name, 玛塔],
  [罗丝.name, 罗丝],
  [厄休拉.name, 厄休拉],
  [希尔薇.name, 希尔薇],
  [伊丽莎白.name, 伊丽莎白],
  [因克.name, 因克],
  [阿卡夏.name, 阿卡夏],
  [多萝西.name, 多萝西],
  [维罗妮卡.name, 维罗妮卡],
  [浮游书页.name, 浮游书页],
  [墨痕鼠.name, 墨痕鼠],
  [低语幽灵.name, 低语幽灵],
  [墨水史莱姆.name, 墨水史莱姆],
  [墨团怪.name, 墨团怪],
  [触手羽毛笔.name, 触手羽毛笔],
  [书魔.name, 书魔],
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
