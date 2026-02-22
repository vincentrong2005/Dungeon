<template>
  <div
    class="w-full h-screen bg-[#050505] font-body text-dungeon-paper overflow-hidden relative"
  >
    <!-- Dynamic Background -->
    <div class="absolute inset-0 z-0">
      <img
        v-if="bgImageUrl"
        :src="bgImageUrl"
        class="absolute inset-0 w-full h-full object-cover"
        alt=""
        @error="onBgError"
      />
      <div class="absolute inset-0" :style="{ backgroundColor: `rgba(0,0,0,${bgOverlayOpacity})` }"></div>
    </div>

    <!-- Sidebar: Individual Icons Top-Left (no back button, settings already has exit) -->
    <div class="absolute top-6 left-6 z-50 flex flex-col space-y-4">
      <SidebarIcon
        :icon="SettingsIcon"
        label="设置"
        tooltip-side="right"
        :active="activeModal === 'settings'"
        @click="activeModal = 'settings'"
      />
      <SidebarIcon :icon="Scroll" label="卡组" tooltip-side="right" :active="activeModal === 'deck'" @click="activeModal = 'deck'" />
      <SidebarIcon
        :icon="Book"
        label="魔法书"
        tooltip-side="right"
        :active="activeModal === 'magicBooks'"
        @click="activeModal = 'magicBooks'"
      />
      <SidebarIcon :icon="Box" label="物品" tooltip-side="right" :active="activeModal === 'relics'" @click="activeModal = 'relics'" />
      <SidebarIcon :icon="MapIcon" label="地图" tooltip-side="right" :active="activeModal === 'map'" @click="activeModal = 'map'" />
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
      <SidebarIcon
        :icon="FileText"
        label="变量更新"
        tooltip-side="left"
        :active="isVariableUpdateOpen"
        @click="openVariableUpdate"
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
        <div class="bg-[#0f0f0f] border-x border-b border-dungeon-brown rounded-b-lg p-4 shrink-0">
          <div class="relative w-full">
            <input
              v-model="inputText"
              type="text"
              :disabled="gameStore.isGenerating"
              :placeholder="gameStore.isGenerating ? '等待回复中...' : '输入你的行动...'"
              class="w-full bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper px-4 py-3 pr-14 rounded focus:outline-none focus:border-dungeon-gold focus:ring-1 focus:ring-dungeon-gold/50 font-ui placeholder-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @keydown.enter="handleSendInput"
            />
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#1a0f08] border border-dungeon-gold/30 hover:bg-dungeon-brown hover:border-dungeon-gold text-dungeon-gold rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="gameStore.isGenerating"
              @click="handleSendInput"
            >
              <Send class="size-5" />
            </button>
          </div>
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

    <DungeonModal title="魔法书" :is-open="activeModal === 'magicBooks'" @close="activeModal = null">
      <div class="w-full max-w-xl mx-auto flex flex-col gap-4">
        <div class="rounded border border-dungeon-gold/25 bg-dungeon-dark/40 px-3 py-2 text-xs text-dungeon-paper/70">
          <span class="text-dungeon-gold/90">基础</span>
          魔法书默认携带并自动进入牌库，无需手动选择。
        </div>
        <div
          v-if="carryableMagicBookNames.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[58vh] overflow-y-auto custom-scrollbar pr-1"
        >
          <button
            v-for="bookName in carryableMagicBookNames"
            :key="`magic-book-${bookName}`"
            type="button"
            class="rounded border p-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="carriedMagicBookSet.has(bookName)
              ? 'border-dungeon-gold/70 bg-dungeon-brown/50 text-dungeon-gold'
              : 'border-dungeon-brown/60 bg-[#1a0f08]/70 text-dungeon-paper hover:border-dungeon-gold/50'"
            :disabled="isUpdatingMagicBooks"
            @click="toggleMagicBook(bookName)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-heading text-sm tracking-wide truncate">{{ bookName }}</span>
              <span
                class="text-[10px] rounded border px-1.5 py-0.5"
                :class="carriedMagicBookSet.has(bookName)
                  ? 'border-dungeon-gold/70 text-dungeon-gold'
                  : 'border-dungeon-brown/70 text-dungeon-paper/60'"
              >
                {{ carriedMagicBookSet.has(bookName) ? '已携带' : '未携带' }}
              </span>
            </div>
            <div class="mt-2 text-[11px] text-dungeon-paper/70">
              含 {{ getMagicBookCardCount(bookName) }} 张可用卡牌
            </div>
          </button>
        </div>
        <div v-else class="rounded border border-dungeon-brown/60 bg-dungeon-dark/40 py-8 text-center text-sm text-dungeon-paper/50">
          当前没有可选的附加魔法书。
        </div>
      </div>
    </DungeonModal>

    <DungeonModal title="圣遗物" :is-open="activeModal === 'relics'" @close="activeModal = null">
      <div v-if="relicEntries.length > 0" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-6 gap-y-6 p-4 overflow-y-auto max-h-[60%]">
        <button
          v-for="relic in relicEntries"
          :key="relic.name"
          type="button"
          class="relative flex flex-col items-center p-1.5 rounded border border-dungeon-brown/30 bg-[#1a0f08]/35 hover:border-dungeon-gold/40 transition-colors focus:outline-none focus:border-dungeon-gold/60"
          @mouseenter="showRelicTooltip($event, relic)"
          @mouseleave="hideRelicTooltip"
          @focus="showRelicTooltip($event, relic)"
          @blur="hideRelicTooltip"
          @touchstart.passive="handleRelicTouchStart($event, relic)"
          @touchend="handleRelicTouchEnd"
          @touchcancel="handleRelicTouchEnd"
        >
          <div class="relative">
            <Box class="size-9 text-dungeon-gold/75" />
            <span class="absolute -bottom-1 -right-3 font-ui text-dungeon-gold/80 text-[10px] bg-dungeon-dark/70 border border-dungeon-brown/30 rounded px-0.5 leading-tight">x{{ relic.count }}</span>
          </div>
          <span class="font-heading text-dungeon-gold text-[11px] text-center mt-1 leading-relaxed truncate w-full">{{ relic.name }}</span>
        </button>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-12 gap-4">
        <Box class="size-12 text-dungeon-gold/20" />
        <span class="font-ui text-dungeon-paper/40 text-sm">尚未获得圣遗物</span>
      </div>
    </DungeonModal>
    <div
      v-if="relicTooltip"
      class="fixed z-[220] pointer-events-none relic-tooltip"
      :style="{ left: `${relicTooltip.x}px`, top: `${relicTooltip.y}px` }"
    >
      <div class="relic-tooltip-name">{{ relicTooltip.name }}</div>
      <div class="relic-tooltip-meta">{{ relicTooltip.rarity }}｜{{ relicTooltip.category }}｜拥有 {{ relicTooltip.count }}</div>
      <div class="relic-tooltip-effect">{{ relicTooltip.effect }}</div>
      <div class="relic-tooltip-desc">{{ relicTooltip.description }}</div>
    </div>

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

            <!-- Background Clarity -->
            <div class="flex items-center justify-between">
              <label class="text-dungeon-paper/70 text-sm font-ui">背景清晰度</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="bgOverlayOpacity"
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  class="w-28 accent-dungeon-gold"
                />
                <span class="text-dungeon-paper font-ui text-sm w-14 text-center">{{ Math.round((1 - bgOverlayOpacity) * 100) }}%</span>
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
              @click="openCombatTestBuilder"
            >
              ⚔ 进入战斗测试
            </button>
          </div>
        </div>
      </div>
    </DungeonModal>

    <!-- Combat Test Builder Modal -->
    <DungeonModal title="战斗测试配置" :is-open="activeModal === 'combatTestBuilder'" @close="activeModal = null">
      <div class="flex flex-col gap-4 w-full max-w-4xl">
        <template v-if="combatTestStep === 'deck'">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-dungeon-gold text-sm tracking-widest uppercase">步骤1：组建卡组（9张）</h3>
            <span class="text-xs font-ui text-dungeon-paper/70">{{ selectedTestDeck.length }}/9</span>
          </div>

          <div class="rounded border border-dungeon-brown/60 bg-dungeon-dark/50 p-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-[11px] text-dungeon-paper/70">已选卡牌（点击移除）</span>
              <span class="text-[11px] text-dungeon-gold/80">{{ selectedTestDeck.length }}/9</span>
            </div>
            <div class="max-h-52 overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
              <button
                v-for="entry in selectedTestDeckCards"
                :key="`selected-card-${entry.idx}`"
                class="w-full text-left flex items-stretch gap-2 rounded border border-dungeon-gold/20 bg-[#1a0f08]/70 px-2 py-2 hover:border-dungeon-gold/50 transition-colors"
                @click="removeCardFromTestDeck(entry.idx)"
              >
                <span class="w-1.5 rounded" :class="getCardCategoryStripClass(entry.card.category)"></span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-heading text-dungeon-gold truncate">{{ entry.card.name }}</span>
                    <span class="text-[10px] px-1 rounded border" :class="getCardTypeBadgeClass(entry.card.type)">{{ entry.card.type }}</span>
                    <span class="text-[10px] px-1 rounded border border-white/15 text-dungeon-paper/60">{{ entry.card.category }}</span>
                  </div>
                  <div class="mt-1 text-[10px] text-dungeon-paper/70 truncate" :title="entry.card.description">{{ entry.card.description }}</div>
                </div>
                <span class="text-[10px] text-red-300/85 shrink-0 self-center">移除</span>
              </button>
              <div
                v-if="selectedTestDeckCards.length === 0"
                class="rounded border border-dungeon-brown/40 bg-black/20 py-6 text-center text-xs text-dungeon-paper/40"
              >
                尚未选择卡牌
              </div>
            </div>
            <div class="mt-2 grid grid-cols-9 gap-1">
              <div
                v-for="idx in 9"
                :key="`deck-slot-${idx}`"
                class="h-2 rounded border"
                :class="idx <= selectedTestDeck.length
                  ? 'bg-dungeon-gold/70 border-dungeon-gold/60'
                  : 'bg-black/20 border-dungeon-brown/40'"
              ></div>
            </div>
          </div>

          <div class="max-h-[42vh] overflow-y-auto rounded border border-dungeon-brown/60 bg-dungeon-dark/40 p-3 custom-scrollbar">
            <div class="space-y-3">
              <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  v-for="category in cardCategoryTabsForTest"
                  :key="`card-tab-${category}`"
                  class="h-7 px-3 rounded border text-xs shrink-0 transition-colors"
                  :class="selectedCardCategoryTab === category
                    ? 'bg-dungeon-gold/20 border-dungeon-gold/70 text-dungeon-gold'
                    : 'bg-[#1a0f08]/80 border-dungeon-brown/70 text-dungeon-paper/70 hover:border-dungeon-gold/50 hover:text-dungeon-gold/90'"
                  @click="selectedCardCategoryTab = category"
                >
                  {{ category }}
                </button>
              </div>
              <div
                v-for="group in filteredCardCategoryGroupsForTest"
                :key="`card-category-${group.category}`"
                class="rounded border border-dungeon-brown/40 bg-[#110a06]/40 p-2"
              >
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-heading text-[11px] tracking-wider uppercase text-dungeon-gold/90">{{ group.category }}</h4>
                  <span class="text-[10px] text-dungeon-paper/50">{{ group.cards.length }} 张</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <button
                    v-for="card in group.cards"
                    :key="`all-card-${group.category}-${card.id}`"
                    class="hover:scale-105 transition-transform flex flex-col items-center rounded border border-dungeon-brown/40 bg-[#1a0f08]/50 p-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="selectedTestDeck.length >= 9"
                    @click="addCardToTestDeck(card.name)"
                  >
                    <DungeonCard :card="card" disabled />
                    <span class="mt-1 text-[10px] text-dungeon-gold/80">点击加入</span>
                  </button>
                </div>
              </div>
              <div
                v-if="filteredCardCategoryGroupsForTest.length === 0"
                class="rounded border border-dungeon-brown/40 bg-black/20 py-6 text-center text-xs text-dungeon-paper/40"
              >
                当前分类暂无可选卡牌
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 rounded border border-dungeon-brown text-dungeon-paper/70 hover:border-dungeon-gold/50"
              @click="activeModal = null"
            >
              取消
            </button>
            <button
              class="px-4 py-2 rounded border border-dungeon-gold/40 text-dungeon-gold hover:bg-dungeon-brown disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="selectedTestDeck.length !== 9"
              @click="confirmCombatTestDeck"
            >
              下一步：选择魔物
            </button>
          </div>
        </template>

        <template v-else>
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-dungeon-gold text-sm tracking-widest uppercase">步骤2：选择魔物</h3>
            <span class="text-xs font-ui text-dungeon-paper/70">已选卡组: 9张｜圣遗物: {{ selectedRelicTotalCount }} 件</span>
          </div>

          <div class="max-h-[42vh] overflow-y-auto rounded border border-dungeon-brown/60 bg-dungeon-dark/40 p-2 custom-scrollbar">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
              <button
                v-for="enemyName in allEnemyNamesForTest"
                :key="`enemy-${enemyName}`"
                class="text-left px-3 py-2 rounded border text-xs transition-colors"
                :class="selectedTestEnemy === enemyName
                  ? 'border-dungeon-gold bg-dungeon-brown/60 text-dungeon-gold'
                  : 'border-dungeon-brown/60 bg-[#1a0f08] text-dungeon-paper hover:border-dungeon-gold/60'"
                @click="selectedTestEnemy = enemyName"
              >
                {{ enemyName }}
              </button>
            </div>
          </div>

          <div class="rounded border border-dungeon-brown/60 bg-dungeon-dark/40 p-3">
            <div class="mb-2 flex items-center justify-between">
              <h4 class="font-heading text-dungeon-gold text-xs tracking-wider uppercase">圣遗物自选</h4>
              <span class="text-[11px] text-dungeon-paper/60">将同步写入 MVU `_圣遗物`</span>
            </div>
            <div class="max-h-[28vh] overflow-y-auto custom-scrollbar pr-1">
              <div class="space-y-2">
                <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                  <button
                    v-for="category in relicCategoryTabsForTest"
                    :key="`relic-tab-${category}`"
                    class="h-7 px-3 rounded border text-xs shrink-0 transition-colors"
                    :class="selectedRelicCategoryTab === category
                      ? 'bg-dungeon-gold/20 border-dungeon-gold/70 text-dungeon-gold'
                      : 'bg-[#1a0f08]/80 border-dungeon-brown/70 text-dungeon-paper/70 hover:border-dungeon-gold/50 hover:text-dungeon-gold/90'"
                    @click="selectedRelicCategoryTab = category"
                  >
                    {{ category }}
                  </button>
                </div>
                <div
                  v-for="group in filteredRelicCategoryGroupsForTest"
                  :key="`relic-category-${group.category}`"
                  class="rounded border border-dungeon-brown/40 bg-[#110a06]/40 p-2"
                >
                  <div class="mb-2 flex items-center justify-between">
                    <h5 class="font-heading text-[11px] tracking-wider uppercase text-dungeon-gold/90">{{ group.category }}</h5>
                    <span class="text-[10px] text-dungeon-paper/50">{{ group.relics.length }} 件</span>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div
                      v-for="relic in group.relics"
                      :key="`test-relic-${group.category}-${relic.id}`"
                      class="rounded border border-dungeon-brown/50 bg-[#1a0f08]/70 p-2"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <div class="text-xs font-heading text-dungeon-gold truncate">{{ relic.name }}</div>
                          <div class="text-[10px] text-dungeon-paper/60">{{ relic.rarity }}</div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          <button
                            class="h-6 w-6 rounded border border-dungeon-brown text-dungeon-paper/70 hover:border-dungeon-gold"
                            @click="decreaseSelectedRelic(relic.name)"
                          >
                            -
                          </button>
                          <span class="w-6 text-center text-xs text-dungeon-gold">{{ getSelectedTestRelicCount(relic.name) }}</span>
                          <button
                            class="h-6 w-6 rounded border border-dungeon-gold/40 text-dungeon-gold hover:bg-dungeon-brown"
                            @click="increaseSelectedRelic(relic.name)"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div class="mt-1 text-[10px] text-dungeon-paper/70 leading-relaxed">{{ relic.effect }}</div>
                    </div>
                  </div>
                </div>
                <div
                  v-if="filteredRelicCategoryGroupsForTest.length === 0"
                  class="rounded border border-dungeon-brown/40 bg-black/20 py-6 text-center text-xs text-dungeon-paper/40"
                >
                  当前分类暂无可选圣遗物
                </div>
              </div>
            </div>
          </div>

          <label class="flex items-center gap-2 px-3 py-2 rounded border border-dungeon-brown/60 bg-dungeon-dark/40 text-sm text-dungeon-paper/80">
            <input v-model="combatTestStartAt999" type="checkbox" class="accent-amber-500" />
            <span>本场测试启用 999 开局（敌我双方 HP/MP=999）</span>
          </label>

          <div class="flex justify-between gap-3">
            <button
              class="px-4 py-2 rounded border border-dungeon-brown text-dungeon-paper/70 hover:border-dungeon-gold/50"
              @click="combatTestStep = 'deck'"
            >
              返回改卡组
            </button>
            <button
              class="px-4 py-2 rounded border border-amber-600/40 text-amber-400 hover:bg-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!selectedTestEnemy"
              @click="confirmCombatTestEnemyAndStart"
            >
              开始战斗测试
            </button>
          </div>
        </template>
      </div>
    </DungeonModal>

    <!-- Save/Load Panel -->
    <SaveLoadPanel
      :is-open="gameStore.isSaveLoadOpen"
      :entries="gameStore.saveEntries"
      @close="gameStore.isSaveLoadOpen = false"
    />

    <!-- Variable Update Viewer -->
    <DungeonModal title="变量更新" :is-open="isVariableUpdateOpen" @close="isVariableUpdateOpen = false">
      <div
        v-if="gameStore.variableUpdateText"
        class="custom-scrollbar border-dungeon-brown/50 bg-dungeon-dark/60 max-h-[60vh]
               overflow-y-auto rounded border p-4"
      >
        <pre class="text-dungeon-paper/80 font-ui text-sm break-words whitespace-pre-wrap">{{ gameStore.variableUpdateText }}</pre>
      </div>
      <div v-else class="text-dungeon-paper/60 font-ui py-8 text-center text-sm">
        当前楼层没有检测到变量更新标签（&lt;UpdateVariable&gt; 或 &lt;update&gt;）。
      </div>
    </DungeonModal>

    <!-- Combat Overlay -->
    <Transition name="combat-fade">
      <div v-if="showCombat" class="absolute inset-0 z-[100] bg-black">
        <CombatView
          class="w-full h-full"
          :enemy-name="combatEnemyName"
          :player-deck="resolvedDeck"
          :player-relics="combatRelicMap"
          :test-start-at-999="combatTestStartAt999CurrentBattle"
          :initial-player-stats="{
            hp: displayHp,
            maxHp: displayMaxHp,
            mp: displayMp,
            minDice: displayMinDice || 1,
            maxDice: displayMaxDice || 6,
            effects: [{ type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' as const }],
          }"
          @end-combat="handleCombatEnd"
          @open-deck="activeModal = 'deck'"
          @open-relics="activeModal = 'relics'"
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
    Book,
    BookOpen,
    Box,
    ChevronDown,
    Coins,
    Dices,
    FileText,
    Map as MapIcon,
    Maximize,
    Scroll,
    Send,
    Settings as SettingsIcon,
} from 'lucide-vue-next';
import { getAllCards, resolveCardNames } from '../battle/cardRegistry';
import { getAllEnemyNames, getEnemyByName } from '../battle/enemyRegistry';
import { getAllRelics, getRelicByName, type RelicData } from '../battle/relicRegistry';
import { toggleFullScreen } from '../fullscreen';
import { useGameStore } from '../gameStore';
import { CardType, type CardData, EffectType } from '../types';
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
const isVariableUpdateOpen = ref(false);
const isStatusOpen = ref(true);
const showCombat = ref(false);
const combatEnemyName = ref('');
const combatTestStep = ref<'deck' | 'enemy'>('deck');
const selectedTestDeck = ref<string[]>([]);
const selectedTestEnemy = ref('');
const selectedTestRelicCounts = ref<Record<string, number>>({});
const selectedCardCategoryTab = ref('全部');
const selectedRelicCategoryTab = ref('全部');
const relicTooltip = ref<{
  x: number;
  y: number;
  name: string;
  rarity: string;
  category: string;
  count: number;
  effect: string;
  description: string;
} | null>(null);
const combatTestStartAt999 = ref(false);
const combatTestStartAt999CurrentBattle = ref(false);
let relicTooltipLongPressTimer: ReturnType<typeof setTimeout> | null = null;
let relicTooltipAutoHideTimer: ReturnType<typeof setTimeout> | null = null;

// --- Dynamic Background ---
const bgIsLordFallback = ref(false);
const bgImageError = ref(false);
const HF_BG_BASE = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF';
const bgArea = computed(() => (gameStore.statData._当前区域 as string) || '');
const bgRoomType = computed(() => (gameStore.statData._当前房间类型 as string) || '');
const bgImageUrl = computed(() => {
  if (!bgArea.value || bgImageError.value) return '';
  const isLord = bgRoomType.value === '领主' && !bgIsLordFallback.value;
  const suffix = isLord ? `${bgArea.value}_领主` : bgArea.value;
  return `${HF_BG_BASE}/${encodeURIComponent(suffix)}.png`;
});
function onBgError() {
  if (bgRoomType.value === '领主' && !bgIsLordFallback.value) {
    bgIsLordFallback.value = true;
  } else {
    bgImageError.value = true;
  }
}

const BG_OPACITY_KEY = 'dungeon.bg_overlay_opacity';
const bgOverlayOpacity = ref(parseFloat(localStorage.getItem(BG_OPACITY_KEY) ?? '0.5'));
watch(bgOverlayOpacity, (v) => localStorage.setItem(BG_OPACITY_KEY, String(v)));

const allCardsForTest = computed(() => getAllCards().filter(card => card.category !== '敌人'));
const CATEGORY_ORDER: Record<string, number> = {
  基础: 0,
  燃烧: 1,
};
const compareCategory = (a: string, b: string) => {
  const orderA = CATEGORY_ORDER[a] ?? 999;
  const orderB = CATEGORY_ORDER[b] ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  return a.localeCompare(b, 'zh-Hans-CN');
};
const cardCategoryGroupsForTest = computed<Array<{ category: string; cards: CardData[] }>>(() => {
  const grouped = new Map<string, CardData[]>();
  for (const card of allCardsForTest.value) {
    if (!grouped.has(card.category)) {
      grouped.set(card.category, []);
    }
    grouped.get(card.category)!.push(card);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => compareCategory(a, b))
    .map(([category, cards]) => ({
      category,
      cards: [...cards].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
    }));
});
const cardCategoryTabsForTest = computed<string[]>(() => [
  '全部',
  ...cardCategoryGroupsForTest.value.map((group) => group.category),
]);
const filteredCardCategoryGroupsForTest = computed<Array<{ category: string; cards: CardData[] }>>(() => {
  if (selectedCardCategoryTab.value === '全部') return cardCategoryGroupsForTest.value;
  return cardCategoryGroupsForTest.value.filter((group) => group.category === selectedCardCategoryTab.value);
});
const magicBookCardCountMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  for (const card of allCardsForTest.value) {
    map[card.category] = (map[card.category] ?? 0) + 1;
  }
  return map;
});
const carryableMagicBookNames = computed<string[]>(() => (
  cardCategoryGroupsForTest.value
    .map((group) => group.category)
    .filter((category) => category !== '基础')
));
const rawCarriedMagicBooks = computed<string[]>(() => {
  const raw = gameStore.statData._携带的魔法书;
  if (!Array.isArray(raw)) return [];
  return raw.filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
});
const carriedMagicBooks = computed<string[]>(() => {
  const available = new Set(carryableMagicBookNames.value);
  return rawCarriedMagicBooks.value.filter((name) => available.has(name));
});
const carriedMagicBookSet = computed(() => new Set(carriedMagicBooks.value));
const isUpdatingMagicBooks = ref(false);
const getMagicBookCardCount = (bookName: string) => magicBookCardCountMap.value[bookName] ?? 0;
const toggleMagicBook = async (bookName: string) => {
  if (isUpdatingMagicBooks.value) return;
  const current = rawCarriedMagicBooks.value;
  const nextBooks = current.includes(bookName)
    ? current.filter((name) => name !== bookName)
    : [...current, bookName];
  isUpdatingMagicBooks.value = true;
  await gameStore.updateStatDataFields({
    _携带的魔法书: Array.from(new Set(nextBooks)),
  });
  isUpdatingMagicBooks.value = false;
};
const cardByNameForTest = computed(() => {
  const map = new Map<string, CardData>();
  for (const card of allCardsForTest.value) {
    map.set(card.name, card);
  }
  return map;
});
const selectedTestDeckCards = computed(() =>
  selectedTestDeck.value
    .map((cardName, idx) => ({ idx, card: cardByNameForTest.value.get(cardName) }))
    .filter((entry): entry is { idx: number; card: CardData } => entry.card !== undefined),
);
const allEnemyNamesForTest = computed(() => getAllEnemyNames());
const baseRelicsForTest = computed<readonly RelicData[]>(() => (
  [...getAllRelics()].sort((a, b) => {
    const categoryDiff = compareCategory(a.category, b.category);
    if (categoryDiff !== 0) return categoryDiff;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  })
));
const relicCategoryGroupsForTest = computed<Array<{ category: string; relics: RelicData[] }>>(() => {
  const grouped = new Map<string, RelicData[]>();
  for (const relic of baseRelicsForTest.value) {
    if (!grouped.has(relic.category)) {
      grouped.set(relic.category, []);
    }
    grouped.get(relic.category)!.push(relic);
  }
  return Array.from(grouped.entries()).map(([category, relics]) => ({
    category,
    relics,
  }));
});
const relicCategoryTabsForTest = computed<string[]>(() => [
  '全部',
  ...relicCategoryGroupsForTest.value.map((group) => group.category),
]);
const filteredRelicCategoryGroupsForTest = computed<Array<{ category: string; relics: RelicData[] }>>(() => {
  if (selectedRelicCategoryTab.value === '全部') return relicCategoryGroupsForTest.value;
  return relicCategoryGroupsForTest.value.filter((group) => group.category === selectedRelicCategoryTab.value);
});

watch(cardCategoryTabsForTest, (tabs) => {
  if (!tabs.includes(selectedCardCategoryTab.value)) {
    selectedCardCategoryTab.value = '全部';
  }
}, { immediate: true });
watch(relicCategoryTabsForTest, (tabs) => {
  if (!tabs.includes(selectedRelicCategoryTab.value)) {
    selectedRelicCategoryTab.value = '全部';
  }
}, { immediate: true });

const getCardTypeBadgeClass = (type: CardType) => {
  switch (type) {
    case CardType.PHYSICAL:
      return 'border-red-500/50 text-red-300 bg-red-900/20';
    case CardType.MAGIC:
      return 'border-blue-500/50 text-blue-300 bg-blue-900/20';
    case CardType.FUNCTION:
      return 'border-yellow-500/50 text-yellow-300 bg-yellow-900/20';
    case CardType.DODGE:
      return 'border-emerald-500/50 text-emerald-300 bg-emerald-900/20';
    default:
      return 'border-white/30 text-dungeon-paper/80 bg-white/5';
  }
};

const getCardCategoryStripClass = (category: string) => {
  switch (category) {
    case '基础':
      return 'bg-dungeon-gold/80';
    case '燃烧':
      return 'bg-orange-500/85';
    default:
      return 'bg-indigo-400/80';
  }
};

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
    .map(([name, count]) => {
      const relic = getRelicByName(name);
      return {
        name,
        count,
        rarity: relic?.rarity ?? '普通',
        category: relic?.category ?? '基础',
        effect: relic?.effect ?? '',
        description: relic?.description ?? relic?.effect ?? '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
});

type RelicEntryView = (typeof relicEntries.value)[number];

const clearRelicTooltipTimers = () => {
  if (relicTooltipLongPressTimer) {
    clearTimeout(relicTooltipLongPressTimer);
    relicTooltipLongPressTimer = null;
  }
  if (relicTooltipAutoHideTimer) {
    clearTimeout(relicTooltipAutoHideTimer);
    relicTooltipAutoHideTimer = null;
  }
};

const showRelicTooltipForTarget = (target: HTMLElement, relic: RelicEntryView) => {
  const rect = target.getBoundingClientRect();
  const tooltipWidth = 240;
  const margin = 8;
  const x = Math.max(margin, Math.min(rect.left + rect.width / 2, window.innerWidth - tooltipWidth - margin));
  const y = Math.max(margin, rect.top - margin);
  relicTooltip.value = {
    x,
    y,
    name: relic.name,
    rarity: relic.rarity,
    category: relic.category,
    count: relic.count,
    effect: relic.effect,
    description: relic.description,
  };
};

const showRelicTooltip = (event: MouseEvent | FocusEvent, relic: RelicEntryView) => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  clearRelicTooltipTimers();
  showRelicTooltipForTarget(target, relic);
};

const hideRelicTooltip = () => {
  clearRelicTooltipTimers();
  relicTooltip.value = null;
};

const handleRelicTouchStart = (event: TouchEvent, relic: RelicEntryView) => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  clearRelicTooltipTimers();
  relicTooltipLongPressTimer = setTimeout(() => {
    showRelicTooltipForTarget(target, relic);
    relicTooltipAutoHideTimer = setTimeout(() => {
      relicTooltip.value = null;
      relicTooltipAutoHideTimer = null;
    }, 1800);
  }, 320);
};

const handleRelicTouchEnd = () => {
  if (relicTooltipLongPressTimer) {
    clearTimeout(relicTooltipLongPressTimer);
    relicTooltipLongPressTimer = null;
  }
};

const combatRelicMap = computed<Record<string, number>>(() => {
  const raw: Record<string, number> = gameStore.statData._圣遗物 ?? {};
  const normalized: Record<string, number> = {};
  for (const [name, value] of Object.entries(raw)) {
    const count = Math.max(0, Math.floor(Number(value ?? 0)));
    if (!name || count <= 0) continue;
    normalized[name] = count;
  }
  return normalized;
});

watch(activeModal, (modal) => {
  if (modal === 'magicBooks') {
    gameStore.loadStatData();
  }
  if (modal !== 'relics') {
    hideRelicTooltip();
  }
});

const selectedRelicTotalCount = computed(() => (
  Object.values(selectedTestRelicCounts.value).reduce((sum, value) => sum + Math.max(0, Math.floor(value)), 0)
));

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

interface FloorMonsterConfig {
  common: string[];
  uniqueByArea: Record<string, string[]>;
}

// 基于 EJS魔物.txt 的楼层怪物池；结合区域条目标注的“特有魔物”建立区域限制
const FLOOR_MONSTER_CONFIG: Record<string, FloorMonsterConfig> = {
  '第一层': {
    common: ['游荡粘液球', '荧光蛾', '根须潜行者'],
    uniqueByArea: {
      '粘液之沼': ['沼泽潜伏者', '拟态气泡怪'],
      '发情迷雾森林': ['迷雾精怪', '藤蔓行者'],
      '喷精泉眼': ['泉水精魄', '潜伏触手怪'],
      '触手菌窟': ['穴居触手'],
      '肉欲食人花圃': ['极乐蜜蜂', '花粉喷射者'],
    },
  },
  '第二层': {
    common: ['浮游书页', '墨痕鼠', '低语幽灵'],
    uniqueByArea: {
      '禁忌图书馆': ['书魔', '墨水史莱姆'],
      '呻吟阅览室': ['椅子拟态怪', '桌面触手'],
      '催情墨染湖': ['墨团怪', '触手羽毛笔'],
      '性癖记录馆': ['窥视之眼', '羞耻阴影'],
      '淫乱教职工宿舍': ['堕落学者', '宿舍幽灵'],
    },
  },
  '第三层': {
    common: ['巡逻铁蝠', '荆棘匍匐者', '影牢使魔'],
    uniqueByArea: {
      '欲望监狱': ['刺链蛇', '惩戒傀儡', '羞耻蛭'],
      '吸血鬼古堡': ['血蝙蝠', '血仆', '梦魇驹'],
      '调教审判庭': ['审判蛛', '证词虫', '刽子手偶'],
      '触手水牢': ['深渊水母', '寄生水蛭'],
      '人偶工坊': ['缝合蜘蛛', '丝线傀儡', '测试者'],
    },
  },
  '第四层': {
    common: ['虚空游光', '面具侍从', '空间裂隙虫'],
    uniqueByArea: {
      '虚空宫殿': ['肉壁蠕虫'],
      '镜之舞厅': ['镜像分身', '碎镜蝠'],
      '双子寝宫': ['梦魇蛾', '枕头精'],
      '春梦回廊': ['画框捕食者'],
      '极乐宴会厅': ['侍宴者'],
    },
  },
  '第五层': {
    common: ['祈祷烛灵', '圣痕蝶', '忏悔天使'],
    uniqueByArea: {
      '交媾祭坛': ['祭司傀儡', '神恩触手'],
      '圣水之海': ['圣水水母', '深渊鱼群', '圣水精灵'],
      '苦修之路': ['晶体刺猬', '苦修幽灵'],
      '神谕淫纹室': ['符文精灵', '光球守卫'],
      '女神的产房': ['胎儿魔物', '脐带触手'],
    },
  },
};

// 当前规则：70% 抽普通魔物，30% 抽区域特有魔物（若存在）
const COMMON_MONSTER_RATE_BY_FLOOR: Record<string, number> = {
  '第一层': 0.7,
  '第二层': 0.7,
  '第三层': 0.7,
  '第四层': 0.7,
  '第五层': 0.7,
};

function pickOne<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickBattleMonsterByArea(area: string): string | null {
  const floor = getFloorForArea(area) ?? '第一层';
  const config = FLOOR_MONSTER_CONFIG[floor];
  if (!config) return null;

  const commonPool = config.common;
  const uniquePool = config.uniqueByArea[area] ?? [];
  const commonRate = COMMON_MONSTER_RATE_BY_FLOOR[floor] ?? 0.7;

  let pool: string[] = [];
  if (commonPool.length === 0 && uniquePool.length === 0) return null;
  if (commonPool.length === 0) {
    pool = uniquePool;
  } else if (uniquePool.length === 0) {
    pool = commonPool;
  } else {
    pool = Math.random() < commonRate ? commonPool : uniquePool;
  }

  return pickOne(pool);
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

  if (portal.isFloorTransition) {
    // 记录待应用变量：进入新区域，首个房间为宝箱房，重置房间计数
    gameStore.setPendingPortalChanges({
      area: portal.areaName!,
      roomType: '宝箱房',
      resetRoomCounter: true,
      // 新区域首个房间同样计入统计：宝箱房 +1、累计总房间 +1、当层房间 +1
      incrementKeys: ['当前层已过房间', '累计已过房间', '累计经过宝箱'],
      enemyName: '',
    });
    console.info(`[Portal] Floor transition queued → area: ${portal.areaName}, first room: 宝箱房`);
    gameStore.sendAction(`<user>选择了继续前进，进入了${portal.areaName}的宝箱房`);
  } else {
    // 记录待应用变量：进入新房间，更新统计
    const incrementKeys = ['当前层已过房间', '累计已过房间'];
    const statKey = ROOM_STAT_KEY[portal.roomType];
    if (statKey) incrementKeys.push(statKey);
    const currentArea = (gameStore.statData._当前区域 as string) || '';
    const encounterMonster = portal.roomType === '战斗房'
      ? pickBattleMonsterByArea(currentArea)
      : null;

    gameStore.setPendingPortalChanges({
      roomType: portal.roomType,
      incrementKeys,
      enemyName: encounterMonster ?? '',
    });
    console.info(`[Portal] Room transition queued → type: ${portal.roomType}`);
    if (portal.roomType === '战斗房' && encounterMonster) {
      gameStore.sendAction(`<user>选择了继续前进，进入了${portal.roomType}并遭遇了${encounterMonster}`);
    } else {
      gameStore.sendAction(`<user>选择了继续前进，进入了${portal.roomType}的房间`);
    }
  }
};


const openSaveLoad = () => {
  gameStore.loadSaveEntries();
  gameStore.isSaveLoadOpen = !gameStore.isSaveLoadOpen;
};

const openVariableUpdate = () => {
  isVariableUpdateOpen.value = !isVariableUpdateOpen.value;
};

// toggleFullScreen imported from '../fullscreen'

// ── Combat Test ──
const getSelectedTestRelicCount = (name: string) => {
  return Math.max(0, Math.floor(selectedTestRelicCounts.value[name] ?? 0));
};

const setSelectedTestRelicCount = (name: string, next: number) => {
  const value = Math.max(0, Math.floor(next));
  if (value <= 0) {
    delete selectedTestRelicCounts.value[name];
    return;
  }
  selectedTestRelicCounts.value[name] = value;
};

const increaseSelectedRelic = (name: string) => {
  setSelectedTestRelicCount(name, getSelectedTestRelicCount(name) + 1);
};

const decreaseSelectedRelic = (name: string) => {
  setSelectedTestRelicCount(name, getSelectedTestRelicCount(name) - 1);
};

const buildSelectedRelicPayload = (): Record<string, number> => {
  const next: Record<string, number> = {};
  for (const relic of baseRelicsForTest.value) {
    const count = getSelectedTestRelicCount(relic.name);
    if (count > 0) {
      next[relic.name] = count;
    }
  }
  return next;
};

const openCombatTestBuilder = () => {
  gameStore.loadStatData();
  const availableCardNames = new Set(allCardsForTest.value.map(c => c.name));
  const availableRelicNames = new Set(baseRelicsForTest.value.map((relic) => relic.name));
  const presetDeck = Array.isArray(gameStore.statData._技能)
    ? (gameStore.statData._技能 as string[]).filter((name) => availableCardNames.has(name)).slice(0, 9)
    : [];
  const presetRelicsRaw: Record<string, number> = gameStore.statData._圣遗物 ?? {};
  const presetRelics: Record<string, number> = {};
  for (const [name, value] of Object.entries(presetRelicsRaw)) {
    if (!availableRelicNames.has(name)) continue;
    const count = Math.max(0, Math.floor(Number(value ?? 0)));
    if (count <= 0) continue;
    presetRelics[name] = count;
  }

  selectedTestDeck.value = [...presetDeck];
  selectedTestEnemy.value = '';
  selectedTestRelicCounts.value = presetRelics;
  selectedCardCategoryTab.value = '全部';
  selectedRelicCategoryTab.value = '全部';
  combatTestStartAt999.value = false;
  combatTestStep.value = 'deck';
  activeModal.value = 'combatTestBuilder';
};

const addCardToTestDeck = (cardName: string) => {
  if (selectedTestDeck.value.length >= 9) return;
  selectedTestDeck.value.push(cardName);
};

const removeCardFromTestDeck = (index: number) => {
  if (index < 0 || index >= selectedTestDeck.value.length) return;
  selectedTestDeck.value.splice(index, 1);
};

const confirmCombatTestDeck = async () => {
  if (selectedTestDeck.value.length !== 9) {
    gameStore.error = '请先组满9张测试卡组。';
    return;
  }
  const ok = await gameStore.updateStatDataFields({
    _技能: [...selectedTestDeck.value],
  });
  if (!ok) return;

  if (allEnemyNamesForTest.value.length === 0) {
    gameStore.error = '当前没有可用魔物，请先在 enemyRegistry 注册敌人。';
    return;
  }
  combatTestStep.value = 'enemy';
};

const confirmCombatTestEnemyAndStart = async () => {
  if (!selectedTestEnemy.value) {
    gameStore.error = '请先选择一个魔物。';
    return;
  }
  const enemyDef = getEnemyByName(selectedTestEnemy.value);
  if (!enemyDef) {
    gameStore.error = `未在敌人库中找到「${selectedTestEnemy.value}」`;
    return;
  }
  const ok = await gameStore.updateStatDataFields({
    _对手名称: selectedTestEnemy.value,
    _圣遗物: buildSelectedRelicPayload(),
  });
  if (!ok) return;

  activeModal.value = null;
  combatEnemyName.value = selectedTestEnemy.value;
  combatTestStartAt999CurrentBattle.value = combatTestStartAt999.value;
  showCombat.value = true;
};

const handleCombatEnd = (win: boolean) => {
  showCombat.value = false;
  combatTestStartAt999CurrentBattle.value = false;
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

.relic-tooltip {
  width: 15rem;
  transform: translate(-50%, calc(-100% - 8px));
  background: rgba(8, 10, 16, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42);
  padding: 0.5rem 0.6rem;
}

.relic-tooltip-name {
  color: rgba(255, 255, 255, 0.95);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.relic-tooltip-meta {
  margin-top: 0.25rem;
  color: rgba(250, 204, 21, 0.9);
  font-size: 10px;
  line-height: 1.2;
}

.relic-tooltip-effect {
  margin-top: 0.35rem;
  color: rgba(229, 231, 235, 0.95);
  font-size: 10px;
  line-height: 1.35;
}

.relic-tooltip-desc {
  margin-top: 0.28rem;
  color: rgba(209, 213, 219, 0.9);
  font-size: 10px;
  line-height: 1.35;
}
</style>
