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
        class="w-full flex flex-col pt-2 pb-2 px-4 md:px-12 md:pl-24 transition-all duration-300 h-full"
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
            <div v-if="!gameStore.isGenerating && (gameStore.options.length > 0 || gameStore.hasOptionE || gameStore.hasLeave)" class="mt-8 flex flex-col space-y-3">
              <div
                class="h-[1px] w-full bg-gradient-to-r from-transparent via-dungeon-gold/20 to-transparent mb-2"
              ></div>

              <!-- A-D Normal Options -->
              <button
                v-for="(option, i) in gameStore.options"
                :key="'opt-' + i"
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

              <!-- E Option: Special Room Action Button -->
              <button
                v-if="gameStore.hasOptionE && specialOptionConfig"
                class="w-full text-center px-6 py-4 rounded-lg border-2 font-heading text-base tracking-wider
                       transition-all duration-400 hover:scale-[1.02] active:scale-[0.98]"
                :style="{
                  backgroundColor: specialOptionConfig.bgColor,
                  borderColor: specialOptionConfig.borderColor,
                  color: specialOptionConfig.textColor,
                  boxShadow: `0 0 20px ${specialOptionConfig.glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                }"
                @click="handleSpecialOption"
              >
                <span class="text-xl mr-2">{{ specialOptionConfig.icon }}</span>
                {{ specialOptionConfig.label }}
              </button>

              <!-- [Leave] Portal System -->
              <div v-if="gameStore.hasLeave && portalChoices.length > 0" class="mt-4">
                <div class="text-center text-dungeon-gold/40 text-xs font-ui tracking-widest uppercase mb-3">
                  ─── 传送门 ───
                </div>
                <div class="flex justify-center gap-4">
                  <button
                    v-for="(portal, i) in portalChoices"
                    :key="'portal-' + i"
                    class="portal-btn group relative flex flex-col items-center justify-center
                           w-24 h-24 rounded-lg border-2 backdrop-blur-sm
                           transition-all duration-500 hover:scale-110
                           active:scale-95"
                    :style="{
                      backgroundColor: portal.bgColor,
                      borderColor: portal.borderColor,
                      boxShadow: `0 0 15px ${portal.glowColor}, 0 0 30px ${portal.glowColor}40`,
                    }"
                    @click="handlePortalClick(portal)"
                  >
                    <!-- Portal glow ring -->
                    <div
                      class="absolute inset-0 rounded-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500"
                      :style="{ boxShadow: `inset 0 0 20px ${portal.glowColor}60` }"
                    ></div>
                    <!-- Portal icon -->
                    <span class="text-2xl mb-1 relative z-10 drop-shadow-lg">{{ portal.icon }}</span>
                    <!-- Portal label -->
                    <span
                      class="text-[10px] font-ui tracking-wide relative z-10 text-center leading-tight"
                      :style="{ color: portal.textColor }"
                    >{{ portal.label }}</span>
                    <!-- Animated ring -->
                    <div
                      class="absolute inset-1 rounded-md border border-dashed opacity-30 group-hover:opacity-70
                             animate-[spin_8s_linear_infinite] transition-opacity"
                      :style="{ borderColor: portal.borderColor }"
                    ></div>
                  </button>
                </div>
              </div>
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

    <DungeonModal title="符文卡组" :is-open="activeModal === 'deck'" @close="activeModal = null">
      <div v-if="resolvedDeck.length > 0" class="grid grid-cols-3 gap-8 overflow-y-auto max-h-[60%] p-4">
        <div v-for="(card, i) in resolvedDeck" :key="i" class="hover:scale-105 transition-transform flex justify-center">
          <DungeonCard :card="card" disabled />
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-12 gap-4">
        <Scroll class="size-12 text-dungeon-gold/20" />
        <span class="font-ui text-dungeon-paper/40 text-sm">卡组为空 — 尚未装备技能卡</span>
      </div>
    </DungeonModal>

    <DungeonModal title="圣遗物" :is-open="activeModal === 'relics'" @close="activeModal = null">
      <div v-if="relicEntries.length > 0" class="grid grid-cols-4 sm:grid-cols-6 gap-1 p-2 overflow-y-auto max-h-[60%]">
        <div
          v-for="relic in relicEntries"
          :key="relic.name"
          class="relative flex flex-col items-center p-1"
          :title="relic.name"
        >
          <div class="relative">
            <Box class="size-8 text-dungeon-gold/70" />
            <span class="absolute -bottom-1 -right-3 font-ui text-dungeon-gold/80 text-[10px] bg-dungeon-dark/70 border border-dungeon-brown/30 rounded px-0.5 leading-tight">x{{ relic.count }}</span>
          </div>
          <span class="font-heading text-dungeon-gold text-[10px] text-center mt-0.5 leading-tight truncate w-full">{{ relic.name }}</span>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-12 gap-4">
        <Box class="size-12 text-dungeon-gold/20" />
        <span class="font-ui text-dungeon-paper/40 text-sm">尚未获得圣遗物</span>
      </div>
    </DungeonModal>

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
            <button
              class="p-3 border border-amber-600/40 hover:bg-amber-900/20 text-amber-400 text-sm rounded col-span-2"
              @click="enterCombatTest"
            >
              ⚔ 进入战斗测试
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

    <!-- Combat Overlay -->
    <Transition name="combat-fade">
      <div v-if="showCombat" class="absolute inset-0 z-[100] bg-black">
        <CombatView
          class="w-full h-full"
          :enemy-name="combatEnemyName"
          :player-deck="resolvedDeck"
          :initial-player-stats="{
            hp: displayHp,
            maxHp: displayMaxHp,
            mp: displayMp,
            minDice: displayMinDice || 1,
            maxDice: displayMaxDice || 6,
            effects: [{ type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' as const }],
          }"
          @end-combat="handleCombatEnd"
        />
        <!-- Exit combat button -->
        <button
          class="absolute top-4 right-4 z-[110] px-4 py-2 bg-red-950/80 border border-red-700/50 text-red-300 text-sm rounded-lg
                 hover:bg-red-900/80 hover:border-red-600 transition-all backdrop-blur-sm"
          @click="showCombat = false"
        >
          ✕ 退出战斗
        </button>
      </div>
    </Transition>
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
import { resolveCardNames } from '../battle/cardRegistry';
import { getEnemyByName } from '../battle/enemyRegistry';
import { toggleFullScreen } from '../fullscreen';
import { useGameStore } from '../gameStore';
import { type CardData, EffectType } from '../types';
import CombatView from './CombatView.vue';
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
const showCombat = ref(false);
const combatEnemyName = ref('');

// ── Resolved deck from MVU _技能 via card registry ──
const resolvedDeck = computed<CardData[]>(() => {
  const skills: string[] = gameStore.statData._技能 ?? [];
  return resolveCardNames(skills.filter((s) => s !== ''));
});

// ── Resolved relics from MVU _圣遗物 ──
// Format: { relicName: count } e.g. { "圣杯": 2, "毒药": 3 }
const relicEntries = computed(() => {
  const raw: Record<string, number> = gameStore.statData._圣遗物 ?? {};
  return Object.entries(raw)
    .filter(([name, count]) => name && count > 0)
    .map(([name, count]) => ({ name, count }));
});

// ── Text display settings (reactive, persisted) ──
const textSettings = reactive({
  fontSize: 21,
  lineHeight: 2.0,
  fontFamily: "'Cinzel', serif",
  containerWidth: 1300,
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
  // Strip the "A. " / "B. " / etc. prefix, paste content into input box
  const stripped = option.replace(/^[A-D]\.\s*/i, '');
  inputText.value = stripped;
};

// ── Room type config for E option ──
interface RoomConfig {
  label: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
}

const ROOM_TYPE_CONFIG: Record<string, RoomConfig> = {
  '战斗房': { label: '战斗', icon: '⚔', bgColor: 'rgba(185,28,28,0.25)', borderColor: '#dc2626', textColor: '#fca5a5', glowColor: '#dc262680' },
  '领主房': { label: '战斗', icon: '⚔', bgColor: 'rgba(185,28,28,0.3)',  borderColor: '#ef4444', textColor: '#fca5a5', glowColor: '#ef444480' },
  '宝箱房': { label: '打开宝箱', icon: '📦', bgColor: 'rgba(161,98,7,0.25)',  borderColor: '#eab308', textColor: '#fde68a', glowColor: '#eab30880' },
  '商店房': { label: '打开商店', icon: '🛒', bgColor: 'rgba(21,128,61,0.25)', borderColor: '#22c55e', textColor: '#bbf7d0', glowColor: '#22c55e80' },
  '温泉房': { label: '清除诅咒', icon: '💧', bgColor: 'rgba(8,145,178,0.25)',  borderColor: '#06b6d4', textColor: '#a5f3fc', glowColor: '#06b6d480' },
  '神像房': { label: '膜拜', icon: '🙏', bgColor: 'rgba(126,34,206,0.25)', borderColor: '#a855f7', textColor: '#e9d5ff', glowColor: '#a855f780' },
};

// E option: no button for 事件房 / 陷阱房
const specialOptionConfig = computed<RoomConfig | null>(() => {
  if (!gameStore.hasOptionE) return null;
  const roomType = gameStore.statData._当前房间类型 as string;
  if (!roomType) return null;
  if (roomType === '事件房' || roomType === '陷阱房') return null;
  return ROOM_TYPE_CONFIG[roomType] ?? null;
});

const handleSpecialOption = () => {
  toastr.info('功能开发中...');
};

// ══════════════════════════════════════════════════════════════
//  [Leave] Portal System — Floor/Area Logic
// ══════════════════════════════════════════════════════════════

const FLOOR_MAP: Record<string, string[]> = {
  '第一层': ['魔女的小窝', '粘液之沼', '发情迷雾森林', '喷精泉眼', '触手菌窟', '肉欲食人花圃'],
  '第二层': ['禁忌图书馆', '呻吟阅览室', '催情墨染湖', '性癖记录馆', '淫乱教职工宿舍'],
  '第三层': ['欲望监狱', '吸血鬼古堡', '调教审判庭', '触手水牢', '人偶工坊'],
  '第四层': ['虚空宫殿', '镜之舞厅', '双子寝宫', '春梦回廊', '极乐宴会厅'],
  '第五层': ['交媾祭坛', '圣水之海', '苦修之路', '神谕淫纹室', '女神的产房'],
};
const FLOOR_ORDER = ['第一层', '第二层', '第三层', '第四层', '第五层'];

function getFloorForArea(area: string): string | null {
  for (const [floor, areas] of Object.entries(FLOOR_MAP)) {
    if (areas.includes(area)) return floor;
  }
  return null;
}

function getNextFloor(currentFloor: string): string | null {
  const idx = FLOOR_ORDER.indexOf(currentFloor);
  if (idx < 0 || idx >= FLOOR_ORDER.length - 1) return null;
  return FLOOR_ORDER[idx + 1];
}

// ── Portal visuals ──
const PORTAL_ROOM_TYPES = ['战斗房', '宝箱房', '商店房', '温泉房', '神像房', '事件房', '陷阱房'];

interface PortalVisual { icon: string; bgColor: string; borderColor: string; textColor: string; glowColor: string; }

const PORTAL_ROOM_VISUALS: Record<string, PortalVisual> = {
  '战斗房': { icon: '⚔️', bgColor: 'rgba(127,29,29,0.5)',  borderColor: '#991b1b', textColor: '#fca5a5', glowColor: '#dc2626' },
  '宝箱房': { icon: '💎', bgColor: 'rgba(113,63,18,0.5)',  borderColor: '#a16207', textColor: '#fde68a', glowColor: '#eab308' },
  '商店房': { icon: '🏪', bgColor: 'rgba(20,83,45,0.5)',   borderColor: '#166534', textColor: '#bbf7d0', glowColor: '#22c55e' },
  '温泉房': { icon: '♨️', bgColor: 'rgba(22,78,99,0.5)',   borderColor: '#155e75', textColor: '#a5f3fc', glowColor: '#06b6d4' },
  '神像房': { icon: '🗿', bgColor: 'rgba(88,28,135,0.5)',  borderColor: '#7e22ce', textColor: '#e9d5ff', glowColor: '#a855f7' },
  '事件房': { icon: '❓', bgColor: 'rgba(63,63,70,0.5)',   borderColor: '#52525b', textColor: '#d4d4d8', glowColor: '#71717a' },
  '陷阱房': { icon: '⚠️', bgColor: 'rgba(124,45,18,0.5)',  borderColor: '#9a3412', textColor: '#fed7aa', glowColor: '#ea580c' },
  '领主房': { icon: '👑', bgColor: 'rgba(127,29,29,0.6)',  borderColor: '#dc2626', textColor: '#fca5a5', glowColor: '#ef4444' },
};
const AREA_PORTAL_VISUAL: PortalVisual = {
  icon: '🌀', bgColor: 'rgba(79,70,229,0.5)', borderColor: '#6366f1', textColor: '#c7d2fe', glowColor: '#818cf8',
};

interface PortalChoice {
  label: string;
  roomType: string;
  areaName?: string;
  floorName?: string;
  isFloorTransition: boolean;
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
}

let cachedPortals: PortalChoice[] = [];
let cachedPortalFingerprint = '';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePortals(): PortalChoice[] {
  const currentArea = (gameStore.statData._当前区域 as string) || '';
  const currentRoomType = (gameStore.statData._当前房间类型 as string) || '';
  const stats = (gameStore.statData.$统计 as any) || {};
  const roomsPassed: number = stats.当前层已过房间 ?? 0;

  const isStartArea = currentArea === '魔女的小窝';
  const isBossRoom = currentRoomType === '领主房';

  // ── Special: 魔女的小窝 or 领主房 → next floor area portals ──
  if (isStartArea || isBossRoom) {
    let targetFloor: string | null = null;
    if (isStartArea) {
      targetFloor = '第一层';
    } else {
      const currentFloor = getFloorForArea(currentArea);
      if (currentFloor) targetFloor = getNextFloor(currentFloor);
    }
    if (targetFloor && FLOOR_MAP[targetFloor]) {
      const candidates = FLOOR_MAP[targetFloor].filter(a => a !== currentArea);
      const picked = shuffle(candidates).slice(0, 3);
      return picked.map(areaName => ({
        label: areaName,
        roomType: '',
        areaName,
        floorName: targetFloor!,
        isFloorTransition: true,
        ...AREA_PORTAL_VISUAL,
      }));
    }
  }

  // ── Boss room probability: rooms >= 5 → (rooms - 4) * 10% ──
  if (roomsPassed >= 5) {
    const bossChance = (roomsPassed - 4) * 0.1;
    if (Math.random() < bossChance) {
      const vis = PORTAL_ROOM_VISUALS['领主房'];
      return [{ label: '领主房', roomType: '领主房', isFloorTransition: false, ...vis }];
    }
  }

  // ── Normal: 1-3 random room portals (20%/40%/40%) ──
  const roll = Math.random();
  const count = roll < 0.2 ? 1 : roll < 0.6 ? 2 : 3;
  const picked = shuffle(PORTAL_ROOM_TYPES).slice(0, count);
  return picked.map(rt => ({ label: rt, roomType: rt, isFloorTransition: false, ...PORTAL_ROOM_VISUALS[rt] }));
}

// 使用状态指纹实现响应式更新：当区域/房间类型/hasLeave 变化时重新生成传送门
const portalChoices = computed<PortalChoice[]>(() => {
  if (!gameStore.hasLeave) {
    cachedPortals = [];
    cachedPortalFingerprint = '';
    return [];
  }
  // 构建状态指纹：区域 + 房间类型 + 统计，任何变化都重新生成
  const area = (gameStore.statData._当前区域 as string) || '';
  const roomType = (gameStore.statData._当前房间类型 as string) || '';
  const rooms = ((gameStore.statData.$统计 as any)?.当前层已过房间 ?? 0);
  const fingerprint = `${area}|${roomType}|${rooms}`;
  if (fingerprint !== cachedPortalFingerprint) {
    cachedPortalFingerprint = fingerprint;
    cachedPortals = generatePortals();
  }
  return cachedPortals;
});

// ── Room type → $统计 field mapping ──
const ROOM_STAT_KEY: Record<string, string> = {
  '战斗房': '累计经过战斗', '宝箱房': '累计经过宝箱', '商店房': '累计经过商店',
  '温泉房': '累计经过温泉', '神像房': '累计经过神像', '事件房': '累计经过事件', '陷阱房': '累计经过陷阱',
};

const handlePortalClick = async (portal: PortalChoice) => {
  if (gameStore.isGenerating) return;
  try {
    const lastId = getLastMessageId();
    if (lastId < 0) return;
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: lastId });
    if (!mvuData?.stat_data) return;
    const sd = mvuData.stat_data;
    if (!sd.$统计) sd.$统计 = {};

    if (portal.isFloorTransition) {
      // ── Floor transition: update area, reset room counter, first room = 宝箱房 ──
      sd._当前区域 = portal.areaName!;
      sd._当前房间类型 = '宝箱房';
      sd.$统计.当前层已过房间 = 0;
      gameStore.statData._当前区域 = portal.areaName!;
      gameStore.statData._当前房间类型 = '宝箱房';
      if (!gameStore.statData.$统计) gameStore.statData.$统计 = {} as any;
      (gameStore.statData.$统计 as any).当前层已过房间 = 0;
      await Mvu.replaceMvuData(mvuData, { type: 'message', message_id: lastId });
      console.info(`[Portal] Floor transition → area: ${portal.areaName}, first room: 宝箱房`);
      gameStore.sendAction(`<user>选择了继续前进，进入了${portal.areaName}的宝箱房`);
    } else {
      // ── Normal room transition: update room type + stats ──
      sd._当前房间类型 = portal.roomType;
      sd.$统计.当前层已过房间 = (sd.$统计.当前层已过房间 ?? 0) + 1;
      sd.$统计.累计已过房间 = (sd.$统计.累计已过房间 ?? 0) + 1;
      const statKey = ROOM_STAT_KEY[portal.roomType];
      if (statKey) sd.$统计[statKey] = (sd.$统计[statKey] ?? 0) + 1;
      gameStore.statData._当前房间类型 = portal.roomType;
      if (!gameStore.statData.$统计) gameStore.statData.$统计 = {} as any;
      const ls = gameStore.statData.$统计 as any;
      ls.当前层已过房间 = sd.$统计.当前层已过房间;
      ls.累计已过房间 = sd.$统计.累计已过房间;
      if (statKey) ls[statKey] = sd.$统计[statKey];
      await Mvu.replaceMvuData(mvuData, { type: 'message', message_id: lastId });
      console.info(`[Portal] Room → type: ${portal.roomType}, rooms: ${sd.$统计.当前层已过房间}`);
      gameStore.sendAction(`<user>选择了继续前进，进入了${portal.roomType}的房间`);
    }
  } catch (err) {
    console.error('[Portal] Error:', err);
  }
};


const openSaveLoad = () => {
  gameStore.loadSaveEntries();
  gameStore.isSaveLoadOpen = !gameStore.isSaveLoadOpen;
};

// toggleFullScreen imported from '../fullscreen'

// ── Combat Test ──
const enterCombatTest = () => {
  activeModal.value = null;
  // 刷新 MVU 数据以确保读取最新值
  gameStore.loadStatData();
  // 从 MVU 读取 _对手名称
  const name = gameStore.statData._对手名称;
  if (!name) {
    gameStore.error = '未检测到 _对手名称 变量，无法进入战斗';
    return;
  }
  const enemyDef = getEnemyByName(name);
  if (!enemyDef) {
    gameStore.error = `未在敌人库中找到「${name}」，请检查敌人注册表`;
    return;
  }
  combatEnemyName.value = name;
  showCombat.value = true;
};

const handleCombatEnd = (win: boolean) => {
  showCombat.value = false;
  console.log('[Combat] Result:', win ? 'WIN' : 'LOSE');
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

/* Combat overlay transition */
.combat-fade-enter-active,
.combat-fade-leave-active {
  transition: opacity 0.4s ease;
}
.combat-fade-enter-from,
.combat-fade-leave-to {
  opacity: 0;
}
</style>
