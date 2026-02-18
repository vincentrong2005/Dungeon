<template>
  <div
    class="w-full h-screen bg-[#050505] font-body text-dungeon-paper overflow-hidden relative"
  >
    <!-- Sidebar: Individual Icons Top-Left (no back button, settings already has exit) -->
    <div class="absolute top-6 left-6 z-50 flex flex-col space-y-4">
      <SidebarIcon :icon="MapIcon" label="地图" tooltip-side="right" :active="activeModal === 'map'" @click="activeModal = 'map'" />
      <SidebarIcon :icon="Scroll" label="卡组" tooltip-side="right" :active="activeModal === 'deck'" @click="activeModal = 'deck'" />
      <SidebarIcon :icon="Box" label="物品" tooltip-side="right" :active="activeModal === 'relics'" @click="activeModal = 'relics'" />
      <SidebarIcon
        :icon="SettingsIcon"
        label="设置"
        tooltip-side="right"
        :active="activeModal === 'settings'"
        @click="activeModal = 'settings'"
      />
    </div>

    <!-- Sidebar: Right side icons (top right) -->
    <div class="absolute top-4 right-4 z-50 flex items-center gap-2">
      <!-- Fullscreen (small) -->
      <button
        class="w-8 h-8 rounded flex items-center justify-center
               bg-dungeon-dark/60 border border-dungeon-brown/50 text-dungeon-gold-dim
               hover:bg-dungeon-brown hover:text-dungeon-gold hover:border-dungeon-gold/50
               transition-all duration-300"
        title="全屏模式"
        @click="toggleFullScreen"
      >
        <Maximize class="size-4" />
      </button>
    </div>

    <!-- Right sidebar: save/load only (reroll & edit moved into panel) -->
    <div class="absolute top-14 right-4 z-50 flex flex-col space-y-4">
      <SidebarIcon
        :icon="BookOpen"
        label="读档"
        tooltip-side="left"
        :active="gameStore.isSaveLoadOpen"
        @click="openSaveLoad"
      />
    </div>

    <!-- Main Content Area -->
    <div class="h-full w-full flex flex-col items-center">
      <div
        class="w-full flex flex-col pt-6 pb-24 px-4 md:px-12 md:pl-24 transition-all duration-300 h-full"
        :style="{ maxWidth: textSettings.containerWidth + 'px' }"
      >
        <!-- Story Text Area -->
        <div
          class="flex-1 bg-dungeon-dark/80 border border-dungeon-brown rounded-t-lg shadow-2xl backdrop-blur-sm p-6 md:p-10 overflow-y-auto min-h-0 custom-scrollbar relative"
        >
          <!-- Decorative Corners -->
          <div class="absolute top-2 left-2 w-4 h-4 border-t border-l border-dungeon-gold/30"></div>
          <div class="absolute top-2 right-2 w-4 h-4 border-t border-r border-dungeon-gold/30"></div>

          <!-- Loading Indicator -->
          <div v-if="gameStore.isGenerating" class="flex items-center gap-3 mb-4">
            <div class="flex gap-1">
              <span class="w-2 h-2 bg-dungeon-gold rounded-full animate-bounce" style="animation-delay: 0s"></span>
              <span class="w-2 h-2 bg-dungeon-gold rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
              <span class="w-2 h-2 bg-dungeon-gold rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
            </div>
            <span class="text-dungeon-gold/60 font-ui text-sm">正在生成...</span>
          </div>

          <!-- Edit Mode -->
          <div v-if="gameStore.isEditing" class="flex flex-col h-full">
            <textarea
              v-model="gameStore.editingText"
              class="flex-1 w-full bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper rounded p-4 resize-none focus:outline-none focus:border-dungeon-gold focus:ring-1 focus:ring-dungeon-gold/50 font-ui custom-scrollbar"
              :style="{
                fontSize: textSettings.fontSize + 'px',
                lineHeight: textSettings.lineHeight,
                fontFamily: textSettings.fontFamily,
              }"
            ></textarea>
            <!-- Edit Actions -->
            <div class="flex justify-end gap-3 mt-4">
              <button
                class="px-5 py-2 text-sm font-ui text-gray-400 border border-gray-700 rounded
                       hover:bg-gray-800 transition-colors"
                @click="gameStore.cancelEdit()"
              >
                取消
              </button>
              <button
                class="px-5 py-2 text-sm font-ui text-dungeon-gold border border-dungeon-gold/40 rounded
                       hover:bg-dungeon-gold/10 transition-colors
                       shadow-[0_0_8px_rgba(212,175,55,0.15)]"
                @click="gameStore.saveEdit()"
              >
                确认更改
              </button>
            </div>
          </div>

          <!-- Normal View (not editing) -->
          <template v-else>
            <!-- Story Content -->
            <div
              class="prose prose-invert max-w-none prose-p:text-dungeon-paper tracking-wide"
              :style="{
                fontSize: textSettings.fontSize + 'px',
                lineHeight: textSettings.lineHeight,
                fontFamily: textSettings.fontFamily,
              }"
            >
              <!-- Streaming text (during generation) -->
              <p v-if="gameStore.isGenerating && gameStore.streamingText" class="whitespace-pre-wrap text-dungeon-paper/60">
                {{ gameStore.streamingText }}
              </p>
              <!-- Final main text -->
              <p v-else class="whitespace-pre-wrap">{{ displayText }}</p>
            </div>

            <!-- Options Section -->
            <div v-if="!gameStore.isGenerating && gameStore.options.length > 0" class="mt-8 flex flex-col space-y-3">
              <div
                class="h-[1px] w-full bg-gradient-to-r from-transparent via-dungeon-gold/20 to-transparent mb-2"
              ></div>
              <button
                v-for="(option, i) in gameStore.options"
                :key="i"
                class="w-full text-left px-5 py-3 bg-dungeon-dark/60 hover:bg-dungeon-brown/40
                       text-dungeon-paper/80 hover:text-dungeon-paper
                       rounded border border-dungeon-brown/50 hover:border-dungeon-gold/40
                       font-ui text-sm tracking-wide
                       transition-all duration-300
                       hover:shadow-[0_0_12px_rgba(212,175,55,0.08)]
                       hover:translate-x-1"
                @click="handleOptionClick(option)"
              >
                {{ option }}
              </button>
            </div>

            <!-- Error Display -->
            <div v-if="gameStore.error" class="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded text-red-300 font-ui text-sm">
              {{ gameStore.error }}
            </div>
          </template>
        </div>

        <!-- Input Area -->
        <div class="bg-[#0f0f0f] border-x border-b border-dungeon-brown rounded-b-lg p-4 flex items-center space-x-4 shrink-0">
          <div class="flex-1 relative">
            <input
              v-model="inputText"
              type="text"
              :disabled="gameStore.isGenerating"
              :placeholder="gameStore.isGenerating ? '等待回复中...' : '输入你的行动...'"
              class="w-full bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper px-4 py-3 rounded focus:outline-none focus:border-dungeon-gold focus:ring-1 focus:ring-dungeon-gold/50 font-ui placeholder-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @keydown.enter="handleSendInput"
            />
          </div>
          <button
            class="p-3 bg-[#1a0f08] border border-dungeon-gold/30 hover:bg-dungeon-brown hover:border-dungeon-gold text-dungeon-gold rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="gameStore.isGenerating"
            @click="handleSendInput"
          >
            <Send class="size-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Player Status HUD (Bottom Left) - Collapsible -->
    <div class="absolute bottom-6 left-6 z-50 flex flex-col gap-2 select-none">
      <!-- Toggle Button -->
      <button
        class="w-10 h-10 rounded-lg flex items-center justify-center
               bg-dungeon-dark/90 border border-dungeon-gold/30 text-dungeon-gold-dim
               hover:bg-dungeon-brown hover:text-dungeon-gold hover:border-dungeon-gold/50
               transition-all duration-300 shadow-lg backdrop-blur-md"
        :title="isStatusOpen ? '收起状态栏' : '展开状态栏'"
        @click="isStatusOpen = !isStatusOpen"
      >
        <component :is="isStatusOpen ? ChevronDown : Activity" class="size-5" />
      </button>

      <!-- Expandable Status Panel -->
      <Transition name="status-slide">
        <div
          v-if="isStatusOpen"
          class="relative p-4 bg-dungeon-dark/90 border border-dungeon-gold/30 rounded-xl backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8)]"
        >
          <!-- Decorative Elements -->
          <div class="absolute -top-1 -left-1 size-2 bg-dungeon-gold rotate-45 border border-black"></div>
          <div class="absolute -bottom-1 -right-1 size-2 bg-dungeon-gold rotate-45 border border-black"></div>
          <div class="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-dungeon-gold/50 to-transparent"></div>

          <!-- HP & MP: Container-fill style -->
          <div class="flex items-end gap-4 mb-3">
            <!-- HP Heart Container -->
            <div class="flex flex-col items-center gap-1">
              <div class="stat-container-heart" :title="`HP: ${displayHp}/${displayMaxHp}`">
                <svg viewBox="0 0 64 64" class="w-14 h-14">
                  <defs>
                    <clipPath id="heartClip">
                      <path d="M32 56 C32 56, 6 40, 6 22 C6 12, 14 4, 24 4 C28 4, 31 6, 32 9 C33 6, 36 4, 40 4 C50 4, 58 12, 58 22 C58 40, 32 56, 32 56Z" />
                    </clipPath>
                    <filter id="hpGlow">
                      <feGaussianBlur stdDeviation="2" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="hpGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stop-color="#8a0e0e" />
                      <stop offset="50%" stop-color="#cc2222" />
                      <stop offset="100%" stop-color="#ee4444" />
                    </linearGradient>
                  </defs>
                  <!-- Heart outline (dark) -->
                  <path
                    d="M32 56 C32 56, 6 40, 6 22 C6 12, 14 4, 24 4 C28 4, 31 6, 32 9 C33 6, 36 4, 40 4 C50 4, 58 12, 58 22 C58 40, 32 56, 32 56Z"
                    fill="#1a0808"
                    stroke="#5c1a1a"
                    stroke-width="1.5"
                  />
                  <!-- Fill level (clipped to heart) -->
                  <g clip-path="url(#heartClip)">
                    <rect
                      x="0"
                      :y="64 - (hpPercent / 100) * 60"
                      width="64"
                      :height="(hpPercent / 100) * 60"
                      fill="url(#hpGradient)"
                      filter="url(#hpGlow)"
                      class="transition-all duration-700 ease-out"
                    />
                  </g>
                  <!-- Highlight -->
                  <ellipse cx="22" cy="18" rx="5" ry="4" fill="rgba(255,255,255,0.12)" transform="rotate(-20,22,18)" />
                </svg>
              </div>
              <span class="text-[10px] font-ui text-dungeon-paper/80 tracking-wide">
                <span class="text-[#cc3333] font-bold">{{ displayHp }}</span>
                <span class="text-gray-600">/{{ displayMaxHp }}</span>
              </span>
            </div>

            <!-- MP Crystal Container -->
            <div class="flex flex-col items-center gap-1">
              <div class="stat-container-mana" :title="`MP: ${displayMp}`">
                <svg viewBox="0 0 64 64" class="w-14 h-14">
                  <defs>
                    <clipPath id="manaClip">
                      <path d="M32 4 L54 24 L32 60 L10 24 Z" />
                    </clipPath>
                    <filter id="mpGlow">
                      <feGaussianBlur stdDeviation="2" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="mpGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stop-color="#1a1a8a" />
                      <stop offset="50%" stop-color="#3344cc" />
                      <stop offset="100%" stop-color="#5566ee" />
                    </linearGradient>
                  </defs>
                  <!-- Crystal outline -->
                  <path
                    d="M32 4 L54 24 L32 60 L10 24 Z"
                    fill="#080818"
                    stroke="#1a1a5c"
                    stroke-width="1.5"
                  />
                  <!-- Fill level -->
                  <g clip-path="url(#manaClip)">
                    <rect
                      x="0"
                      :y="64 - (mpPercent / 100) * 60"
                      width="64"
                      :height="(mpPercent / 100) * 60"
                      fill="url(#mpGradient)"
                      filter="url(#mpGlow)"
                      class="transition-all duration-700 ease-out"
                    />
                  </g>
                  <!-- Highlight -->
                  <polygon points="26,14 32,8 38,14 32,20" fill="rgba(255,255,255,0.1)" />
                </svg>
              </div>
              <span class="text-[10px] font-ui text-dungeon-paper/80 tracking-wide">
                <span class="text-blue-400 font-bold">{{ displayMp }}</span>
              </span>
            </div>
          </div>

          <!-- Divider -->
          <div class="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-dungeon-gold/20 to-transparent"></div>

          <!-- Dice Range Row -->
          <div class="flex items-center justify-between px-1 mb-2">
            <div class="flex items-center gap-2 text-dungeon-paper/70">
              <Dices class="size-4 text-dungeon-gold-dim drop-shadow-sm" />
              <span class="font-ui text-sm tracking-wide">
                <span class="text-dungeon-paper font-bold">{{ displayMinDice }}</span>
                <span class="text-gray-500">~</span>
                <span class="text-dungeon-paper font-bold">{{ displayMaxDice }}</span>
              </span>
            </div>
            <span class="text-[10px] text-[#5c3a21] uppercase tracking-widest font-bold">Dice</span>
          </div>

          <!-- Gold Row -->
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2 text-dungeon-gold">
              <Coins class="size-4 drop-shadow-sm" />
              <span
                class="font-heading text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-[#f9e6a0] to-dungeon-gold-dim drop-shadow-sm"
              >
                {{ displayGold }}
              </span>
            </div>
            <span class="text-[10px] text-[#5c3a21] uppercase tracking-widest font-bold">Gold</span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Modals -->
    <DungeonModal title="地牢地图" :is-open="activeModal === 'map'" @close="activeModal = null">
      <div
        class="w-full h-64 bg-[#1a0f08] border border-dungeon-gold/20 flex items-center justify-center rounded"
      >
        <span class="font-heading text-dungeon-gold/30 text-2xl">MAP_RENDER_TARGET</span>
      </div>
    </DungeonModal>

    <DungeonModal title="符文卡组 (当前)" :is-open="activeModal === 'deck'" @close="activeModal = null">
      <div class="grid grid-cols-3 gap-8 overflow-y-auto max-h-[60%] p-4">
        <div v-for="(card, i) in STARTING_DECK" :key="i" class="hover:scale-105 transition-transform flex justify-center">
          <DungeonCard :card="card" disabled />
        </div>
      </div>
    </DungeonModal>

    <DungeonModal title="圣遗物" :is-open="activeModal === 'relics'" @close="activeModal = null" />

    <!-- Settings Modal -->
    <DungeonModal title="系统设置" :is-open="activeModal === 'settings'" @close="activeModal = null">
      <div class="flex flex-col space-y-6 w-full max-w-lg mx-auto">
        <!-- Text Display Settings Section -->
        <div>
          <h3 class="font-heading text-dungeon-gold text-sm tracking-widest mb-4 uppercase">正文显示</h3>
          <div class="space-y-4">
            <!-- Font Size -->
            <div class="flex items-center justify-between">
              <label class="text-dungeon-paper/70 text-sm font-ui">字体大小</label>
              <div class="flex items-center gap-2">
                <button class="w-7 h-7 rounded border border-dungeon-brown text-dungeon-gold-dim hover:border-dungeon-gold hover:text-dungeon-gold text-sm" @click="textSettings.fontSize = Math.max(12, textSettings.fontSize - 1)">−</button>
                <span class="text-dungeon-paper font-ui text-sm w-10 text-center">{{ textSettings.fontSize }}px</span>
                <button class="w-7 h-7 rounded border border-dungeon-brown text-dungeon-gold-dim hover:border-dungeon-gold hover:text-dungeon-gold text-sm" @click="textSettings.fontSize = Math.min(28, textSettings.fontSize + 1)">+</button>
              </div>
            </div>

            <!-- Line Height -->
            <div class="flex items-center justify-between">
              <label class="text-dungeon-paper/70 text-sm font-ui">行间距</label>
              <div class="flex items-center gap-2">
                <button class="w-7 h-7 rounded border border-dungeon-brown text-dungeon-gold-dim hover:border-dungeon-gold hover:text-dungeon-gold text-sm" @click="textSettings.lineHeight = Math.max(1.2, +(textSettings.lineHeight - 0.1).toFixed(1))">−</button>
                <span class="text-dungeon-paper font-ui text-sm w-10 text-center">{{ textSettings.lineHeight }}</span>
                <button class="w-7 h-7 rounded border border-dungeon-brown text-dungeon-gold-dim hover:border-dungeon-gold hover:text-dungeon-gold text-sm" @click="textSettings.lineHeight = Math.min(3.0, +(textSettings.lineHeight + 0.1).toFixed(1))">+</button>
              </div>
            </div>

            <!-- Font Family -->
            <div class="flex items-center justify-between">
              <label class="text-dungeon-paper/70 text-sm font-ui">字体样式</label>
              <select
                v-model="textSettings.fontFamily"
                class="bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper text-sm px-3 py-1.5 rounded focus:outline-none focus:border-dungeon-gold font-ui"
              >
                <option value="'Cinzel', serif">Cinzel (默认)</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'MedievalSharp', cursive">MedievalSharp</option>
                <option value="serif">Serif</option>
                <option value="sans-serif">Sans-serif</option>
                <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
                <option value="'SimSun', serif">宋体</option>
                <option value="'KaiTi', serif">楷体</option>
              </select>
            </div>

            <!-- Container Width -->
            <div class="flex items-center justify-between">
              <label class="text-dungeon-paper/70 text-sm font-ui">正文框宽度</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="textSettings.containerWidth"
                  type="range"
                  min="600"
                  max="1600"
                  step="50"
                  class="w-28 accent-dungeon-gold"
                />
                <span class="text-dungeon-paper font-ui text-sm w-14 text-center">{{ textSettings.containerWidth }}px</span>
              </div>
            </div>
          </div>
        </div>

        <div class="h-[1px] w-full bg-dungeon-gold/20"></div>

        <!-- System Section -->
        <div>
          <h3 class="font-heading text-dungeon-gold text-sm tracking-widest mb-4 uppercase">系统</h3>
          <div class="grid grid-cols-2 gap-4">
            <button
              class="p-3 border border-dungeon-gold/30 hover:bg-dungeon-brown text-dungeon-gold text-sm rounded"
              @click="toggleFullScreen"
            >
              切换全屏模式
            </button>
            <button
              class="p-3 border border-red-900/50 hover:bg-red-950/30 text-red-500 text-sm rounded"
              @click="$emit('backToSplash')"
            >
              退出到标题
            </button>
          </div>
        </div>
      </div>
    </DungeonModal>

    <!-- Save/Load Panel -->
    <SaveLoadPanel
      :is-open="gameStore.isSaveLoadOpen"
      :entries="gameStore.saveEntries"
      @close="gameStore.isSaveLoadOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
    Activity,
    BookOpen,
    Box,
    ChevronDown,
    Coins,
    Dices,
    Map as MapIcon,
    Maximize,
    Scroll,
    Send,
    Settings as SettingsIcon,
} from 'lucide-vue-next';
import { STARTING_DECK } from '../constants';
import { useGameStore } from '../gameStore';
import DungeonCard from './DungeonCard.vue';
import DungeonModal from './DungeonModal.vue';
import SaveLoadPanel from './SaveLoadPanel.vue';

defineEmits<{
  backToSplash: [];
}>();

const SidebarIcon = defineComponent({
  props: {
    icon: { type: Object, required: true },
    active: { type: Boolean, default: false },
    label: { type: String, default: '' },
    tooltipSide: { type: String, default: 'right' },
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          class: [
            'w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg border relative group',
            props.active
              ? 'bg-dungeon-gold text-black border-dungeon-paper shadow-[0_0_15px_#d4af37]'
              : 'bg-[#1a0f08] text-dungeon-gold-dim border-dungeon-brown hover:bg-dungeon-brown hover:text-dungeon-gold hover:border-dungeon-gold/50',
          ],
          onClick: () => emit('click'),
        },
        [
          h(props.icon as any, { class: 'size-6' }),
          props.label
            ? h(
                'div',
                {
                  class: [
                    'absolute bg-black/90 text-dungeon-paper text-xs px-2 py-1 rounded border border-dungeon-brown opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none',
                    props.tooltipSide === 'left' ? 'right-14' : 'left-14',
                  ],
                },
                props.label,
              )
            : null,
        ],
      );
  },
});

const gameStore = useGameStore();
const activeModal = ref<string | null>(null);
const inputText = ref('');
const isStatusOpen = ref(true);

// ── Text display settings (reactive, persisted) ──
const textSettings = reactive({
  fontSize: 16,
  lineHeight: 2.0,
  fontFamily: "'Cinzel', serif",
  containerWidth: 1024,
});

// ── Computed display values from MVU stat_data ──
const displayText = computed(() =>
  gameStore.mainText || '正在等待冒险开始...\n\n输入你的行动或选择一个选项来开始游戏。',
);

// HP: _血量 / _血量上限, HP 不能超过上限
const displayHp = computed(() => {
  const hp = gameStore.statData._血量 ?? 10;
  const maxHp = gameStore.statData._血量上限 ?? 10;
  return Math.min(hp, maxHp);
});
const displayMaxHp = computed(() => gameStore.statData._血量上限 ?? 10);

// MP: _魔量 only, no max variable. Visual cap at 20.
const displayMp = computed(() => gameStore.statData._魔量 ?? 1);

// Gold
const displayGold = computed(() => gameStore.statData._金币 ?? 0);

// Dice range
const displayMinDice = computed(() => gameStore.statData.$最小点数 ?? 0);
const displayMaxDice = computed(() => gameStore.statData.$最大点数 ?? 0);

const hpPercent = computed(() => {
  const max = displayMaxHp.value;
  return max > 0 ? Math.min((displayHp.value / max) * 100, 100) : 100;
});

// MP visual fill: cap at 20 for display
const mpPercent = computed(() => {
  const mp = displayMp.value;
  const visualMax = 20;
  return Math.min((mp / visualMax) * 100, 100);
});

// ── Actions ──
const handleSendInput = () => {
  if (!inputText.value.trim() || gameStore.isGenerating) return;
  gameStore.sendAction(inputText.value);
  inputText.value = '';
};

const handleOptionClick = (option: string) => {
  if (gameStore.isGenerating) return;
  gameStore.sendAction(option);
};

const openSaveLoad = () => {
  gameStore.loadSaveEntries();
  gameStore.isSaveLoadOpen = !gameStore.isSaveLoadOpen;
};

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};
</script>

<style scoped>
.status-slide-enter-active,
.status-slide-leave-active {
  transition: all 0.3s ease;
}
.status-slide-enter-from,
.status-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Heart container glow effect */
.stat-container-heart {
  filter: drop-shadow(0 0 6px rgba(180, 20, 20, 0.4));
  transition: filter 0.3s ease;
}
.stat-container-heart:hover {
  filter: drop-shadow(0 0 12px rgba(200, 30, 30, 0.7));
}

/* Mana container glow effect */
.stat-container-mana {
  filter: drop-shadow(0 0 6px rgba(50, 50, 200, 0.4));
  transition: filter 0.3s ease;
}
.stat-container-mana:hover {
  filter: drop-shadow(0 0 12px rgba(60, 60, 230, 0.7));
}
</style>
