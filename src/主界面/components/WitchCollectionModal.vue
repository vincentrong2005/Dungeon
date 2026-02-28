<template>
  <DungeonModal
    title="魔女的收藏"
    :is-open="isOpen"
    panel-class="codex-single-modal !max-w-[min(96vw,1500px)] !max-h-[94%]"
    @close="$emit('close')"
  >
    <div class="codex-root">
      <!-- Decorative top glow line -->
      <div class="codex-top-glow"></div>

      <header class="top-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="top-nav-btn"
          :class="{ active: activeTab === tab.id }"
          @click="setMainTab(tab.id)"
        >
          <span class="top-nav-btn-text">{{ tab.label }}</span>
        </button>
      </header>

      <div class="book-layout">
        <aside class="side-nav">
          <div class="side-title">{{ sideTitle }}</div>
          <div class="side-divider"></div>
          <button
            v-for="item in sideItems"
            :key="`${activeTab}-${item.key}`"
            type="button"
            class="side-btn"
            :class="{ active: currentFilter === item.key }"
            @click="setFilter(item.key)"
          >
            {{ item.label }}
          </button>

        </aside>

        <section class="book-shell">
          <Transition :name="flipName" mode="out-in">
            <article :key="pageKey" class="book-page">
              <div v-if="activeTab === 'cards'" class="card-grid">
                <DungeonCard
                  v-for="card in pagedCards"
                  :key="`card-${card.id}`"
                  :card="card"
                  :disabled="true"
                  :mask-level="encounteredCardIds.has(card.id) ? 'none' : 'full'"
                />
              </div>

              <div v-else-if="activeTab === 'relics'" class="entry-grid">
                <article v-for="relic in pagedRelics" :key="`relic-${relic.id}`" class="entry-card">
                  <div class="entry-title">{{ encounteredRelicIds.has(relic.id) ? relic.name : '???' }}</div>
                  <div class="entry-meta">{{ encounteredRelicIds.has(relic.id) ? `${relic.category} · ${relic.rarity}` : '??? · ???' }}</div>
                  <p class="entry-desc">{{ encounteredRelicIds.has(relic.id) ? relic.effect : '???' }}</p>
                </article>
              </div>

              <div v-else-if="activeTab === 'status'" class="entry-grid">
                <article v-for="effect in pagedEffects" :key="`effect-${effect.type}`" class="entry-card">
                  <div class="effect-row">
                    <span class="effect-icon">
                      <i
                        v-if="encounteredEffectTypes.has(effect.type) && effect.faClass"
                        :class="[effect.faClass, 'text-[14px] leading-none']"
                        :style="effect.faStyle"
                        aria-hidden="true"
                      ></i>
                      <span v-else>?</span>
                    </span>
                    <div class="entry-title">{{ encounteredEffectTypes.has(effect.type) ? effect.name : '???' }}</div>
                  </div>
                  <div class="entry-meta">{{ encounteredEffectTypes.has(effect.type) ? effect.kind : '???' }}</div>
                  <p class="entry-desc">{{ encounteredEffectTypes.has(effect.type) ? (effect.description || '暂无说明') : '???' }}</p>
                </article>
              </div>

              <div v-else class="enemy-grid">
                <article v-for="enemy in pagedEnemies" :key="enemy.name" class="entry-card enemy-card">
                  <div class="enemy-head">
                    <div class="portrait">
                      <img
                        v-if="encounteredEnemyNames.has(enemy.name) && !portraitErrorMap[enemy.name]"
                        :src="portraitMap[enemy.name] || enemy.fallbackPortraitUrl"
                        :alt="`${enemy.name}立绘`"
                        class="portrait-img"
                        loading="lazy"
                        @error="markPortraitError(enemy.name)"
                      />
                      <div v-else class="portrait-fallback">?</div>
                    </div>
                    <div class="enemy-head-text">
                      <div class="entry-title">{{ encounteredEnemyNames.has(enemy.name) ? enemy.name : '???' }}</div>
                      <div class="entry-meta">
                        {{
                          encounteredEnemyNames.has(enemy.name)
                            ? `第${enemy.floorLabel}层 · ${enemy.areaLabel}`
                            : `第${enemy.floorLabel}层 · ???`
                        }}
                      </div>
                    </div>
                  </div>
                  <div class="entry-meta">
                    {{
                      encounteredEnemyNames.has(enemy.name)
                        ? `HP ${enemy.stats.hp}/${enemy.stats.maxHp} · MP ${enemy.stats.mp} · 骰子 ${enemy.stats.minDice}~${enemy.stats.maxDice}`
                        : 'HP ??? · MP ??? · 骰子 ???'
                    }}
                  </div>
                  <p class="entry-desc">
                    {{
                      encounteredEnemyNames.has(enemy.name)
                        ? `卡牌：${enemy.deckCardNames.join('、') || '无'}`
                        : '卡牌：???'
                    }}
                  </p>
                </article>
              </div>

              <div class="page-foot">
                <button type="button" class="bookmark bookmark-prev" :disabled="currentPage <= 1" @click="prevPage">
                  ◀
                </button>
                <span class="page-indicator">第 {{ currentPage }} / {{ totalPages }} 页</span>
                <button type="button" class="bookmark bookmark-next" :disabled="currentPage >= totalPages" @click="nextPage">
                  下一页
                </button>
              </div>
            </article>
          </Transition>
        </section>
      </div>
    </div>
  </DungeonModal>
</template>

<script setup lang="ts">
import { getAllCards } from '../battle/cardRegistry';
import { EFFECT_REGISTRY } from '../battle/effects';
import { getAllEnemyNames, getEnemyByName } from '../battle/enemyRegistry';
import { getAllRelics } from '../battle/relicRegistry';
import { loadCodexState } from '../codexStore';
import { getLocalFolderImagePaths } from '../localAssetManifest';
import { CardType, EffectType as ET, type EffectType } from '../types';
import DungeonCard from './DungeonCard.vue';
import DungeonModal from './DungeonModal.vue';

type TabId = 'cards' | 'relics' | 'enemies' | 'status';
type StatusKind = '正面' | '负面' | '被动';
type NavItem = { key: string; label: string };

const props = defineProps<{ isOpen: boolean }>();
defineEmits<{ close: [] }>();

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'cards', label: '卡牌' },
  { id: 'relics', label: '圣遗物' },
  { id: 'enemies', label: '敌人' },
  { id: 'status', label: '状态' },
];

const CARD_TYPE_ORDER: Record<string, number> = {
  [CardType.PHYSICAL]: 0,
  [CardType.MAGIC]: 1,
  [CardType.FUNCTION]: 2,
  [CardType.DODGE]: 3,
  [CardType.CURSE]: 4,
};
const RELIC_RARITY_ORDER: Record<string, number> = { 普通: 0, 稀有: 1, 传奇: 2 };
const PAGE_SIZE: Record<TabId, number> = { cards: 9, relics: 20, enemies: 8, status: 20 };

const activeTab = ref<TabId>('cards');
const currentPage = ref(1);
const flipName = ref<'flip-next' | 'flip-prev'>('flip-next');
const codex = ref(loadCodexState());

const cardFilter = ref('全部');
const relicFilter = ref('全部');
const enemyFloorFilter = ref('全部');
const statusFilter = ref<'全部' | StatusKind>('全部');

const refreshCodex = () => {
  codex.value = loadCodexState();
};

const encounteredCardIds = computed(() => new Set(codex.value.cards));
const encounteredRelicIds = computed(() => new Set(codex.value.relics));
const encounteredEffectTypes = computed(() => new Set(codex.value.effects));
const encounteredEnemyNames = computed(() => new Set(codex.value.enemies.map((enemy) => enemy.name)));

const allCards = computed(() => (
  getAllCards().slice().sort((a, b) => {
    const categoryComp = a.category.localeCompare(b.category, 'zh-Hans-CN');
    if (categoryComp !== 0) return categoryComp;
    const typeComp = (CARD_TYPE_ORDER[a.type] ?? 99) - (CARD_TYPE_ORDER[b.type] ?? 99);
    if (typeComp !== 0) return typeComp;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  })
));
const cardCategories = computed(() => Array.from(new Set(allCards.value.map((card) => card.category))).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')));
const filteredCards = computed(() => (cardFilter.value === '全部' ? allCards.value : allCards.value.filter((card) => card.category === cardFilter.value)));

const allRelics = computed(() => (
  getAllRelics().slice().sort((a, b) => {
    const rarityComp = (RELIC_RARITY_ORDER[a.rarity] ?? 99) - (RELIC_RARITY_ORDER[b.rarity] ?? 99);
    if (rarityComp !== 0) return rarityComp;
    const categoryComp = a.category.localeCompare(b.category, 'zh-Hans-CN');
    if (categoryComp !== 0) return categoryComp;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  })
));
const relicCategories = computed(() => Array.from(new Set(allRelics.value.map((relic) => relic.category))).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')));
const filteredRelics = computed(() => (relicFilter.value === '全部' ? allRelics.value : allRelics.value.filter((relic) => relic.category === relicFilter.value)));

const effectKind = (polarity?: string): StatusKind => {
  if (polarity === 'buff') return '正面';
  if (polarity === 'debuff') return '负面';
  return '被动';
};
const EFFECT_FA_ICON_CLASS: Partial<Record<EffectType, string>> = {
  [ET.BARRIER]: 'fa-brands fa-fediverse',
  [ET.ARMOR]: 'fa-solid fa-shield-halved',
  [ET.BIND]: 'fa-solid fa-link',
  [ET.DEVOUR]: 'fa-brands fa-optin-monster',
  [ET.POISON]: 'fa-solid fa-virus',
  [ET.POISON_AMOUNT]: 'fa-solid fa-bacterium',
  [ET.CORROSION]: 'fa-brands fa-cloudscale',
  [ET.BURN]: 'fa-solid fa-fire',
  [ET.BLEED]: 'fa-solid fa-droplet',
  [ET.VULNERABLE]: 'fa-brands fa-linode',
  [ET.DAMAGE_BOOST]: 'fa-brands fa-superpowers',
  [ET.REGEN]: 'fa-brands fa-medrt',
  [ET.WHITE_TURBID]: 'fa-solid fa-droplet',
  [ET.IGNITE_AURA]: 'fa-solid fa-fire-flame-simple',
  [ET.STUN]: 'fa-solid fa-ban',
  [ET.CHARGE]: 'fa-solid fa-exclamation',
  [ET.FATIGUE]: 'fa-solid fa-bed',
  [ET.COLD]: 'fa-regular fa-snowflake',
  [ET.TEMPERATURE_DIFF]: 'fa-brands fa-empire',
  [ET.NON_LIVING]: 'fa-solid fa-skull',
  [ET.NON_ENTITY]: 'fa-solid fa-ghost',
  [ET.ILLUSORY_BODY]: 'fa-solid fa-ghost',
  [ET.TEMP_MAX_HP]: 'fa-solid fa-heart',
  [ET.MAX_HP_REDUCTION]: 'fa-solid fa-heart-pulse',
  [ET.POINT_GROWTH_BIG]: 'fa-solid fa-dice fa-lg',
  [ET.POINT_GROWTH_SMALL]: 'fa-solid fa-dice fa-sm',
  [ET.MANA_DRAIN]: 'fa-solid fa-battery-empty',
  [ET.MANA_SPRING]: 'fa-brands fa-drupal',
  [ET.SWARM]: 'fa-solid fa-bugs',
  [ET.BLOOD_COCOON]: 'fa-brands fa-battle-net',
  [ET.INDOMITABLE]: 'fa-solid fa-shield',
  [ET.PEEP_FORBIDDEN]: 'fa-solid fa-eye',
  [ET.BLIND_ASH]: 'fa-regular fa-eye-slash',
  [ET.COGNITIVE_INTERFERENCE]: 'fa-solid fa-hamsa',
  [ET.MEMORY_FOG]: 'fa-brands fa-phabricator',
  [ET.SILENCE]: 'fa-solid fa-circle-xmark',
  [ET.STURDY]: 'fa-solid fa-user-shield',
  [ET.SHOCK]: 'fa-solid fa-bolt',
  [ET.FLAME_ATTACH]: 'fa-solid fa-flask-vial',
  [ET.POISON_ATTACH]: 'fa-solid fa-flask-vial',
  [ET.TOXIN_SPREAD]: 'fa-brands fa-hornbill',
  [ET.AMBUSH]: 'fa-solid fa-user-secret',
  [ET.FROST_ATTACH]: 'fa-solid fa-flask-vial',
  [ET.BLOODBLADE_ATTACH]: 'fa-solid fa-flask-vial',
  [ET.LIGHTNING_ATTACH]: 'fa-solid fa-flask-vial',
  [ET.THORNS]: 'fa-solid fa-leaf',
};
const EFFECT_FA_ICON_STYLE: Partial<Record<EffectType, Record<string, string>>> = {
  [ET.FLAME_ATTACH]: { color: 'rgb(255, 64, 64)' },
  [ET.POISON_ATTACH]: { color: 'rgb(81, 255, 116)' },
  [ET.FROST_ATTACH]: { color: 'rgb(108, 230, 255)' },
  [ET.BLOODBLADE_ATTACH]: { color: 'rgb(176, 0, 0)' },
  [ET.LIGHTNING_ATTACH]: { color: 'rgb(201, 69, 255)' },
  [ET.TEMP_MAX_HP]: { color: 'rgb(255, 120, 150)' },
  [ET.ILLUSORY_BODY]: {
    '--fa-primary-color': 'rgb(255, 255, 255)',
    '--fa-secondary-color': 'rgb(255, 255, 255)',
  },
};
const getEffectFontAwesomeClass = (type: EffectType): string | null => EFFECT_FA_ICON_CLASS[type] ?? null;
const getEffectFontAwesomeStyle = (type: EffectType): Record<string, string> | undefined => EFFECT_FA_ICON_STYLE[type];
const allEffects = computed(() => (
  Object.entries(EFFECT_REGISTRY)
    .map(([type, def]) => ({
      type,
      name: def.name,
      description: def.description ?? '',
      kind: effectKind(def.polarity),
      faClass: getEffectFontAwesomeClass(type as EffectType),
      faStyle: getEffectFontAwesomeStyle(type as EffectType),
    }))
    .sort((a, b) => {
      const order: Record<StatusKind, number> = { 正面: 0, 负面: 1, 被动: 2 };
      const kindComp = (order[a.kind] ?? 99) - (order[b.kind] ?? 99);
      if (kindComp !== 0) return kindComp;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    })
));
const filteredEffects = computed(() => (statusFilter.value === '全部' ? allEffects.value : allEffects.value.filter((effect) => effect.kind === statusFilter.value)));

const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const ENEMY_FLOOR_HINT: Record<string, number> = {
  沐芯兰: 1,
  宝箱怪: 1,
  游荡粘液球: 1,
  荧光蛾: 1,
  根须潜行者: 1,
  沼泽潜伏者: 1,
  拟态气泡怪: 1,
  迷雾精怪: 1,
  藤蔓行者: 1,
  泉水精魄: 1,
  潜伏触手怪: 1,
  穴居触手: 1,
  极乐蜜蜂: 1,
  花粉喷射者: 1,
  普莉姆: 1,
  宁芙: 1,
  温蒂尼: 1,
  玛塔: 1,
  罗丝: 1,
};

const allEnemies = computed(() => (
  getAllEnemyNames().map((name) => {
    const encounters = codex.value.enemies.filter((entry) => entry.name === name);
    const floor = ENEMY_FLOOR_HINT[name] ?? (encounters[0]?.floor ?? 0);
    const areaLabel = encounters[0]?.area ?? '未知区域';
    const def = getEnemyByName(name, Math.max(1, floor)) ?? getEnemyByName(name, 1);
    const stats = def?.stats ?? { hp: 0, maxHp: 0, mp: 0, minDice: 0, maxDice: 0 };
    return {
      name,
      floor,
      floorLabel: floor > 0 ? String(floor) : '未知',
      areaLabel,
      fallbackPortraitUrl: `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E9%AD%94%E7%89%A9/${encodeURIComponent(name)}.png`,
      stats: {
        hp: stats.hp,
        maxHp: stats.maxHp,
        mp: stats.mp,
        minDice: stats.minDice,
        maxDice: stats.maxDice,
      },
      deckCardNames: def?.deck?.map((card) => card.name) ?? [],
    };
  }).sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  })
));
const enemyFloorItems = computed<NavItem[]>(() => {
  const floors = Array.from(new Set(allEnemies.value.map((enemy) => enemy.floorLabel))).sort((a, b) => (a === '未知' ? 1 : b === '未知' ? -1 : Number(a) - Number(b)));
  return [{ key: '全部', label: '全部' }, ...floors.map((floor) => ({ key: floor, label: floor === '未知' ? '未知' : `第${floor}层` }))];
});
const filteredEnemies = computed(() => {
  if (enemyFloorFilter.value === '全部') return allEnemies.value;
  return allEnemies.value.filter((enemy) => enemy.floorLabel === enemyFloorFilter.value);
});

const sideTitle = computed(() => {
  if (activeTab.value === 'cards') return '体系';
  if (activeTab.value === 'relics') return '体系';
  if (activeTab.value === 'enemies') return '楼层';
  return '状态';
});
const sideItems = computed<NavItem[]>(() => {
  if (activeTab.value === 'cards') return [{ key: '全部', label: '全部' }, ...cardCategories.value.map((category) => ({ key: category, label: category }))];
  if (activeTab.value === 'relics') return [{ key: '全部', label: '全部' }, ...relicCategories.value.map((category) => ({ key: category, label: category }))];
  if (activeTab.value === 'enemies') return enemyFloorItems.value;
  return [{ key: '全部', label: '全部' }, { key: '正面', label: '正面' }, { key: '负面', label: '负面' }, { key: '被动', label: '被动' }];
});
const currentFilter = computed(() => {
  if (activeTab.value === 'cards') return cardFilter.value;
  if (activeTab.value === 'relics') return relicFilter.value;
  if (activeTab.value === 'enemies') return enemyFloorFilter.value;
  return statusFilter.value;
});

const totalItems = computed(() => {
  if (activeTab.value === 'cards') return filteredCards.value.length;
  if (activeTab.value === 'relics') return filteredRelics.value.length;
  if (activeTab.value === 'enemies') return filteredEnemies.value.length;
  return filteredEffects.value.length;
});
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / PAGE_SIZE[activeTab.value])));
const pageKey = computed(() => `${activeTab.value}-${currentFilter.value}-${currentPage.value}`);
const pageStart = computed(() => (currentPage.value - 1) * PAGE_SIZE[activeTab.value]);
const pageEnd = computed(() => pageStart.value + PAGE_SIZE[activeTab.value]);

const pagedCards = computed(() => filteredCards.value.slice(pageStart.value, pageEnd.value));
const pagedRelics = computed(() => filteredRelics.value.slice(pageStart.value, pageEnd.value));
const pagedEffects = computed(() => filteredEffects.value.slice(pageStart.value, pageEnd.value));
const pagedEnemies = computed(() => filteredEnemies.value.slice(pageStart.value, pageEnd.value));

const setMainTab = (tab: TabId) => {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  flipName.value = 'flip-next';
  currentPage.value = 1;
};
const setFilter = (key: string) => {
  if (activeTab.value === 'cards') cardFilter.value = key;
  if (activeTab.value === 'relics') relicFilter.value = key;
  if (activeTab.value === 'enemies') enemyFloorFilter.value = key;
  if (activeTab.value === 'status') statusFilter.value = key as '全部' | StatusKind;
  flipName.value = 'flip-next';
  currentPage.value = 1;
};
const prevPage = () => {
  if (currentPage.value <= 1) return;
  flipName.value = 'flip-prev';
  currentPage.value -= 1;
};
const nextPage = () => {
  if (currentPage.value >= totalPages.value) return;
  flipName.value = 'flip-next';
  currentPage.value += 1;
};

watch(totalPages, (pages) => {
  currentPage.value = Math.min(Math.max(1, currentPage.value), pages);
});

const portraitMap = ref<Record<string, string>>({});
const portraitErrorMap = ref<Record<string, boolean>>({});
const folderCache = new Map<string, string[]>();
const folderPromise = new Map<string, Promise<string[]>>();
const fetchFolderImages = async (folderPath: string): Promise<string[]> => {
  if (folderCache.has(folderPath)) return folderCache.get(folderPath)!;
  if (folderPromise.has(folderPath)) return folderPromise.get(folderPath)!;
  const task = (async () => {
    const images = getLocalFolderImagePaths(folderPath);
    folderCache.set(folderPath, images);
    return images;
  })();
  folderPromise.set(folderPath, task);
  try {
    return await task;
  } finally {
    folderPromise.delete(folderPath);
  }
};
const ensurePortraits = async () => {
  if (activeTab.value !== 'enemies') return;
  const targets = pagedEnemies.value.filter((enemy) => encounteredEnemyNames.value.has(enemy.name));
  await Promise.all(targets.map(async (enemy) => {
    if (portraitMap.value[enemy.name]) return;
    const images = await fetchFolderImages(`地牢/魔物/${enemy.name}`);
    const chosen = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : null;
    portraitMap.value[enemy.name] = chosen ? `${IMAGE_CDN_ROOT}/${encodeURIComponent(chosen).replace(/%2F/g, '/')}` : enemy.fallbackPortraitUrl;
  }));
};
const markPortraitError = (name: string) => {
  portraitErrorMap.value[name] = true;
};

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    refreshCodex();
    currentPage.value = 1;
    void ensurePortraits();
  },
  { immediate: true },
);

watch([activeTab, currentPage, enemyFloorFilter], () => {
  if (!props.isOpen) return;
  void ensurePortraits();
});
</script>

<style scoped>
/* ── Root ── */
.codex-root {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  position: relative;
}

/* ── Decorative Top Glow ── */
.codex-top-glow {
  height: 1px;
  background: linear-gradient(90deg, transparent 5%, rgba(212, 175, 55, 0.5) 30%, rgba(160, 50, 50, 0.4) 50%, rgba(212, 175, 55, 0.5) 70%, transparent 95%);
  margin-bottom: 0.2rem;
  border-radius: 1px;
  box-shadow: 0 0 12px rgba(160, 50, 50, 0.2), 0 0 6px rgba(212, 175, 55, 0.25);
}

/* ── Top Navigation ── */
.top-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
}

.top-nav-btn {
  position: relative;
  border: 1px solid rgba(180, 83, 9, 0.4);
  background: linear-gradient(135deg, rgba(22, 12, 10, 0.85), rgba(14, 8, 6, 0.9));
  color: rgba(240, 220, 190, 0.85);
  border-radius: 0.6rem;
  font-size: 0.82rem;
  padding: 0.4rem 1.1rem;
  letter-spacing: 0.15em;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
}

.top-nav-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(212, 175, 55, 0.06));
  opacity: 0;
  transition: opacity 0.3s;
}

.top-nav-btn:hover::before {
  opacity: 1;
}

.top-nav-btn:hover {
  border-color: rgba(212, 175, 55, 0.55);
  color: rgba(255, 248, 220, 0.95);
  box-shadow: 0 0 14px rgba(212, 175, 55, 0.15);
}

.top-nav-btn.active {
  border-color: rgba(212, 175, 55, 0.75);
  background: linear-gradient(135deg, rgba(60, 20, 18, 0.85), rgba(40, 14, 12, 0.9));
  color: rgba(255, 248, 220, 0.98);
  box-shadow: 0 0 18px rgba(212, 175, 55, 0.3), 0 0 6px rgba(160, 50, 50, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.top-nav-btn-text {
  position: relative;
  z-index: 1;
}

/* ── Shared button styles ── */
.side-btn,
.bookmark {
  border: 1px solid rgba(180, 83, 9, 0.3);
  background: rgba(14, 8, 6, 0.5);
  color: rgba(240, 220, 190, 0.8);
  border-radius: 0.5rem;
  transition: all 0.25s ease;
  cursor: pointer;
}

.side-btn:hover,
.bookmark:hover:not(:disabled) {
  border-color: rgba(212, 175, 55, 0.5);
  color: rgba(255, 248, 220, 0.95);
  background: rgba(60, 20, 18, 0.4);
}

.side-btn.active {
  border-color: rgba(212, 175, 55, 0.75);
  background: linear-gradient(135deg, rgba(100, 30, 25, 0.35), rgba(60, 20, 18, 0.5));
  color: rgba(255, 248, 220, 0.98);
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.2), inset 0 0 8px rgba(160, 50, 50, 0.08);
}

/* ── Book Layout ── */
.book-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0.85rem;
  min-height: 68vh;
}

/* ── Side Navigation ── */
.side-nav {
  border: 1px solid rgba(180, 83, 9, 0.28);
  border-radius: 1rem;
  background: linear-gradient(170deg, rgba(30, 16, 14, 0.88), rgba(16, 8, 7, 0.92));
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  position: relative;
  overflow-y: auto;
  max-height: 72vh;
}

.side-nav::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: radial-gradient(ellipse at 50% -20%, rgba(212, 175, 55, 0.06), transparent 70%);
  pointer-events: none;
  border-radius: 1rem 1rem 0 0;
}

.side-title {
  color: rgba(212, 175, 55, 0.95);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
  padding: 0.15rem 0.3rem;
  position: relative;
  z-index: 1;
}

.side-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(180, 83, 9, 0.35), rgba(212, 175, 55, 0.2), transparent);
  margin: 0.15rem 0;
}

.side-btn {
  font-size: 0.82rem;
  text-align: left;
  padding: 0.42rem 0.65rem;
  position: relative;
  z-index: 1;
}

.side-btn-area {
  font-size: 0.72rem;
  padding-left: 0.8rem;
}

/* ── Book Shell & Page ── */
.book-shell {
  border: 1px solid rgba(180, 83, 9, 0.28);
  border-radius: 1rem;
  background: linear-gradient(170deg, rgba(26, 14, 12, 0.7), rgba(14, 8, 6, 0.85));
  padding: 0.75rem;
  position: relative;
}

.book-shell::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: radial-gradient(ellipse at 30% -10%, rgba(212, 175, 55, 0.05), transparent 60%);
  pointer-events: none;
  border-radius: 1rem 1rem 0 0;
}

.book-page {
  border: 1px solid rgba(180, 83, 9, 0.2);
  border-radius: 0.85rem;
  background:
    radial-gradient(circle at 15% 5%, rgba(160, 50, 50, 0.08), transparent 35%),
    radial-gradient(circle at 85% 95%, rgba(212, 175, 55, 0.05), transparent 35%),
    rgba(12, 7, 6, 0.75);
  padding: 0.85rem 0.85rem 3.6rem;
  min-height: 62vh;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* ── Content Grids ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  justify-items: center;
  flex: 1;
  align-content: start;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
  gap: 0.65rem;
  flex: 1;
  align-content: start;
}

.enemy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.7rem;
  flex: 1;
  align-content: start;
}

/* ── Entry Cards ── */
.entry-card {
  border: 1px solid rgba(180, 83, 9, 0.28);
  border-left: 2px solid rgba(212, 175, 55, 0.4);
  border-radius: 0.6rem;
  background: linear-gradient(135deg, rgba(24, 12, 10, 0.65), rgba(14, 8, 6, 0.75));
  padding: 0.6rem 0.65rem;
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
}

.entry-card:hover {
  border-color: rgba(212, 175, 55, 0.4);
  border-left-color: rgba(212, 175, 55, 0.65);
  box-shadow: 0 0 16px rgba(160, 50, 50, 0.08), 0 2px 8px rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}

.entry-title {
  color: rgba(255, 248, 220, 0.95);
  font-size: 0.88rem;
  line-height: 1.15rem;
  font-weight: 500;
}

.entry-meta {
  margin-top: 0.18rem;
  color: rgba(212, 175, 55, 0.8);
  font-size: 0.72rem;
  line-height: 1rem;
  letter-spacing: 0.04em;
}

.entry-desc {
  margin-top: 0.25rem;
  color: rgba(240, 220, 190, 0.68);
  font-size: 0.75rem;
  line-height: 1.05rem;
}

/* ── Effect Row ── */
.effect-row {
  display: flex;
  align-items: center;
  gap: 0.42rem;
}

.effect-icon {
  width: 1.3rem;
  display: inline-flex;
  justify-content: center;
  font-size: 1rem;
}

/* ── Enemy Card ── */
.enemy-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.2rem;
}

.portrait {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 0.55rem;
  border: 1px solid rgba(212, 175, 55, 0.4);
  overflow: hidden;
  background: rgba(12, 7, 6, 0.6);
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(160, 50, 50, 0.12);
  transition: all 0.3s ease;
}

.enemy-card:hover .portrait {
  border-color: rgba(212, 175, 55, 0.7);
  box-shadow: 0 0 14px rgba(212, 175, 55, 0.25);
}

.portrait-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.portrait-fallback {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(212, 175, 55, 0.7);
  font-size: 1.1rem;
  font-weight: bold;
}

.enemy-head-text {
  min-width: 0;
}

/* ── Page Footer ── */
.page-foot {
  position: absolute;
  left: 0.85rem;
  right: 0.85rem;
  bottom: 0.7rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.bookmark {
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem 0.5rem 0.2rem 0.2rem;
  font-size: 0.76rem;
  letter-spacing: 0.05em;
}

.bookmark:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.bookmark-next {
  background: linear-gradient(180deg, rgba(120, 40, 35, 0.4), rgba(80, 25, 20, 0.6));
  border-color: rgba(180, 83, 9, 0.4);
}

.bookmark-next:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(140, 50, 40, 0.5), rgba(100, 35, 28, 0.7));
  box-shadow: 0 0 12px rgba(212, 175, 55, 0.2);
}

.page-indicator {
  color: rgba(212, 175, 55, 0.88);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
}

/* ── Page Flip Animation ── */
.flip-next-enter-active,
.flip-next-leave-active,
.flip-prev-enter-active,
.flip-prev-leave-active {
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.flip-next-enter-from {
  opacity: 0;
  transform: perspective(1200px) rotateY(-10deg) translateX(14px);
}

.flip-next-leave-to {
  opacity: 0;
  transform: perspective(1200px) rotateY(8deg) translateX(-12px);
}

.flip-prev-enter-from {
  opacity: 0;
  transform: perspective(1200px) rotateY(10deg) translateX(-14px);
}

.flip-prev-leave-to {
  opacity: 0;
  transform: perspective(1200px) rotateY(-8deg) translateX(12px);
}

/* ── Responsive ── */
@media (max-width: 980px) {
  .book-layout {
    grid-template-columns: 1fr;
  }

  .side-nav {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    max-height: none;
  }

  .side-title {
    width: 100%;
  }

  .side-divider {
    width: 100%;
    margin: 0.1rem 0;
  }

  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
