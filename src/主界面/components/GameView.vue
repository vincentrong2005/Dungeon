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
      <SidebarIcon :icon="Box" label="物品" tooltip-side="right" :active="activeModal === 'relics'" @click="activeModal = 'relics'" />
      <SidebarIcon :icon="MapIcon" label="地图" tooltip-side="right" :active="activeModal === 'map'" @click="activeModal = 'map'" />
      <SidebarIcon
        :icon="magicBookSidebarIcon"
        :label="canEditMagicBooks ? '魔法书' : '魔法书（锁定）'"
        tooltip-side="right"
        :active="canEditMagicBooks && activeModal === 'magicBooks'"
        :disabled="!canEditMagicBooks"
        @click="openMagicBookModal"
      />
    </div>

    <!-- Right sidebar: save/load only (reroll & edit moved into panel) -->
    <div class="absolute top-6 right-4 z-50 flex flex-col space-y-4">
      <SidebarIcon
        :icon="Maximize"
        label="全屏模式"
        tooltip-side="left"
        @click="toggleFullScreen"
      />
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
              <p v-if="isStreamingEnabled && gameStore.isGenerating && gameStore.streamingText" class="whitespace-pre-wrap text-dungeon-paper/60">
                {{ gameStore.streamingText }}
              </p>
              <!-- Final main text -->
              <div v-else class="story-rich-text">
                <p v-for="line in storyMainLines" :key="line.key" :class="['story-line', `story-line-level-${line.level}`]">
                  <template v-if="line.segments.length > 0">
                    <span
                      v-for="segment in line.segments"
                      :key="segment.key"
                      :class="{
                        'story-segment-muted': segment.type === 'muted',
                        'story-segment-quote': segment.type === 'quote',
                      }"
                    >
                      {{ segment.text }}
                    </span>
                  </template>
                  <span v-else class="story-line-empty">&nbsp;</span>
                </p>

                <div v-if="storyTucaoSections.length > 0" class="story-tucao-section-list">
                  <div v-for="(section, sectionIndex) in storyTucaoSections" :key="section.key" class="story-tucao-wrap">
                    <button class="story-tucao-toggle" type="button" @click="toggleTucao(section.key)">
                      {{
                        isTucaoExpanded(section.key)
                          ? `收起脑内剧场 ${sectionIndex + 1}`
                          : `🎮 此方的脑内剧场 ${sectionIndex + 1}`
                      }}
                    </button>
                    <Transition name="tucao-expand">
                      <div v-if="isTucaoExpanded(section.key)" class="story-tucao-panel">
                        <p
                          v-for="line in section.lines"
                          :key="line.key"
                          :class="['story-line', `story-line-level-${line.level}`]"
                        >
                          <template v-if="line.segments.length > 0">
                            <span
                              v-for="segment in line.segments"
                              :key="segment.key"
                              :class="{
                                'story-segment-muted': segment.type === 'muted',
                                'story-segment-quote': segment.type === 'quote',
                              }"
                            >
                              {{ segment.text }}
                            </span>
                          </template>
                          <span v-else class="story-line-empty">&nbsp;</span>
                        </p>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>
            </div>

            <!-- Options Section -->
            <div v-if="!gameStore.isGenerating && (gameStore.options.length > 0 || gameStore.hasOptionE || gameStore.hasLeave || gameStore.hasRebirth)" class="mt-8 flex flex-col space-y-3">
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

              <!-- [Rebirth] Reset Button -->
              <div v-if="gameStore.hasRebirth" class="mt-4">
                <div class="text-center text-red-300/70 text-xs font-ui tracking-widest uppercase mb-3">
                  ─── 回溯 ───
                </div>
                <div class="flex justify-center">
                  <button
                    class="group relative px-7 py-3 rounded-lg border-2 font-heading text-sm tracking-wider
                           transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                           bg-red-950/45 border-red-500/60 text-red-100
                           shadow-[0_0_14px_rgba(239,68,68,0.35)] hover:shadow-[0_0_20px_rgba(248,113,113,0.5)]"
                    :disabled="gameStore.isGenerating"
                    @click="handleRebirthClick"
                  >
                    <span class="text-base mr-2">⟲</span>
                    回溯重生
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="hotSpringCleanseMessage"
              :key="`spring-cleanse-${hotSpringCleanseMessage.id}`"
              class="spring-cleanse-float"
            >
              {{ hotSpringCleanseMessage.text }}
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

    <DungeonModal
      title="魔法书"
      :is-open="activeModal === 'magicBooks'"
      panel-class="max-w-[92rem] max-h-[94%]"
      @close="activeModal = null"
    >
      <div class="w-full max-w-[90rem] mx-auto flex flex-col gap-4">
        <div
          v-if="carryableMagicBookNames.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-h-[72vh] overflow-y-auto custom-scrollbar pr-1"
        >
          <button
            v-for="bookName in carryableMagicBookNames"
            :key="`magic-book-${bookName}`"
            type="button"
            class="relative rounded-lg border p-3 text-left transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-[#130c08]/80"
            :class="carriedMagicBookSet.has(bookName)
              ? 'border-dungeon-gold/80 shadow-[0_0_20px_rgba(212,175,55,0.45)] ring-1 ring-dungeon-gold/70'
              : 'border-dungeon-brown/70 hover:border-dungeon-gold/45'"
            :disabled="isUpdatingMagicBooks"
            @click="toggleMagicBook(bookName)"
          >
            <div
              class="relative w-full overflow-hidden rounded-md border"
              :class="carriedMagicBookSet.has(bookName) ? 'border-dungeon-gold/60' : 'border-dungeon-brown/60'"
            >
              <img
                :src="getMagicBookCoverUrl(bookName)"
                :alt="`${bookName} 魔法书封面`"
                class="w-full [aspect-ratio:832/1216] object-cover transition-all duration-300"
                :class="carriedMagicBookSet.has(bookName)
                  ? 'brightness-100 saturate-110'
                  : 'brightness-50 saturate-60'"
                loading="lazy"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/38"></div>
              <div class="absolute inset-x-2 top-2 z-10">
                <div class="magic-book-title text-center truncate text-[22px]">{{ bookName }}之书</div>
              </div>
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
                <option value="'MaShanZheng', 'KaiTi', serif">马善政体</option>
                <option value="'MagicBookTitle', 'KaiTi', serif">江湖琅琊体</option>
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

            <div class="flex items-center justify-between">
              <label class="text-dungeon-paper/70 text-sm font-ui">背景音乐</label>
              <select
                v-model="selectedBgmTrackId"
                :disabled="bgmTracks.length === 0"
                class="bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper text-sm px-3 py-1.5 rounded focus:outline-none focus:border-dungeon-gold font-ui disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option v-if="bgmTracks.length === 0" value="">暂无可用曲目</option>
                <option v-for="track in bgmTracks" :key="track.id" :value="track.id">
                  {{ track.name }}
                </option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <label class="text-dungeon-paper/70 text-sm font-ui">背景音乐音量</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="bgmVolumePercent"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  class="w-28 accent-dungeon-gold"
                />
                <span class="text-dungeon-paper font-ui text-sm w-14 text-center">{{ bgmVolumePercent }}%</span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <label class="text-dungeon-paper/70 text-sm font-ui">启用流式传输</label>
              <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  v-model="isStreamingEnabled"
                  type="checkbox"
                  class="h-4 w-4 accent-dungeon-gold"
                />
                <span class="text-dungeon-paper text-sm font-ui">{{ isStreamingEnabled ? '开启' : '关闭' }}</span>
              </label>
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

    <!-- Shop Overlay -->
    <Transition name="combat-fade">
      <div v-if="showShopView" class="absolute inset-0 z-[94] bg-black">
        <img
          :src="shopBackgroundUrl"
          class="absolute inset-0 h-full w-full object-cover"
          alt="商店背景"
        />
        <div class="absolute inset-0 bg-black/22"></div>

        <img
          v-if="!isMerchantDefeated"
          :src="shopMerchantPortraitUrl"
          class="pointer-events-none absolute left-0 bottom-0 z-[99] h-[92vh] max-h-[1216px] w-auto object-contain"
          alt="沐芯兰"
        />

        <div class="shop-layout absolute inset-y-0 right-0 z-[96] flex items-center px-4 md:px-7">
          <div class="shop-panel ml-auto w-full max-w-[48rem] h-[84vh] max-h-[860px]">
            <div class="shop-panel-head">
              <div class="font-heading text-xl text-amber-100">沐芯兰的商店</div>
            </div>

            <div class="shop-goods-grid custom-scrollbar">
              <button
                v-for="item in shopProducts"
                :key="item.key"
                type="button"
                class="shop-item-card"
                :class="{ 'is-sold': item.sold }"
                :disabled="item.sold || shopBuying"
                @click="buyShopProduct(item)"
                @mouseenter="showShopProductTooltip($event, item)"
                @mouseleave="hideRelicTooltip"
                @focus="showShopProductTooltip($event, item)"
                @blur="hideRelicTooltip"
                @touchstart.passive="handleShopProductTouchStart($event, item)"
                @touchend="handleRelicTouchEnd"
                @touchcancel="handleRelicTouchEnd"
              >
                <div class="shop-item-icon-wrap">
                  <Box class="shop-item-icon" />
                </div>
                <div class="shop-item-price">
                  <Coins class="size-3.5" />
                  <span>{{ item.finalPrice }}</span>
                </div>
              </button>

              <div
                v-if="shopProducts.length === 0"
                class="rounded border border-amber-200/15 bg-black/25 py-10 text-center text-sm text-amber-100/65"
              >
                暂无可售商品
              </div>
            </div>

            <div class="shop-panel-foot">
              <button
                class="shop-rob-btn px-5 py-2 font-ui text-xs tracking-wider text-amber-50"
                :disabled="shopBuying || gameStore.isGenerating || shopRobbing || isMerchantDefeated"
                :style="{ opacity: shopRobBtnOpacity }"
                @click="handleShopRobClick"
              >
                抢夺
              </button>
              <button
                class="shop-exit-btn px-7 py-3 font-ui text-sm tracking-wider text-amber-50"
                :disabled="shopBuying || gameStore.isGenerating || shopRobbing"
                @click="exitShop"
              >
                退出商店
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Treasure Chest Overlay -->
    <Transition name="combat-fade">
      <div v-if="showChestView" class="absolute inset-0 z-[95] bg-black">
        <img
          :src="chestBackgroundUrl"
          class="absolute inset-0 h-full w-full object-cover"
          alt="宝箱界面背景"
          @load="handleChestBgLoaded"
        />

        <div
          v-if="chestStage === 'opened'"
          class="pointer-events-none absolute inset-0"
        >
          <div class="chest-reward-anchor">
            <button
              v-if="chestRewardRelic && chestRewardVisible"
              type="button"
              class="pointer-events-auto chest-reward-btn"
              :class="{ 'is-collected': chestRewardCollected }"
              :disabled="chestCollecting || chestRewardCollected"
              @click="collectChestReward"
              @mouseenter="showChestRewardTooltip"
              @mouseleave="hideRelicTooltip"
              @focus="showChestRewardTooltip"
              @blur="hideRelicTooltip"
              @touchstart.passive="handleChestRewardTouchStart"
              @touchend="handleRelicTouchEnd"
              @touchcancel="handleRelicTouchEnd"
            >
              <Box class="chest-reward-icon" />
            </button>
          </div>

          <div class="pointer-events-auto chest-portals-anchor w-full">
            <div class="flex justify-center gap-4 flex-wrap">
              <button
                v-for="(portal, i) in chestPortalChoices"
                :key="`chest-portal-${i}`"
                class="portal-btn group relative flex flex-col items-center justify-center
                       w-24 h-24 rounded-lg border-2 backdrop-blur-sm
                       transition-all duration-500 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                :style="{
                  backgroundColor: portal.bgColor,
                  borderColor: portal.borderColor,
                  boxShadow: `0 0 15px ${portal.glowColor}, 0 0 30px ${portal.glowColor}40`,
                }"
                :disabled="chestCollecting"
                @click="handleChestPortalClick(portal)"
              >
                <div
                  class="absolute inset-0 rounded-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500"
                  :style="{ boxShadow: `inset 0 0 20px ${portal.glowColor}60` }"
                ></div>
                <span class="text-2xl mb-1 relative z-10 drop-shadow-lg">{{ portal.icon }}</span>
                <span
                  class="text-[10px] font-ui tracking-wide relative z-10 text-center leading-tight"
                  :style="{ color: portal.textColor }"
                >{{ portal.label }}</span>
                <div
                  class="absolute inset-1 rounded-md border border-dashed opacity-30 group-hover:opacity-70
                         animate-[spin_8s_linear_infinite] transition-opacity"
                  :style="{ borderColor: portal.borderColor }"
                ></div>
              </button>
            </div>
          </div>
        </div>

        <button
          v-if="chestStage === 'closed'"
          type="button"
          aria-label="开启宝箱"
          class="absolute left-1/2 top-1/2 h-[42vh] max-h-[360px] min-h-[220px] w-[36vw] max-w-[540px] min-w-[260px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-2xl border-0 bg-transparent p-0 opacity-0"
          :disabled="chestRolling"
          @click="handleChestCenterClick"
        ></button>
      </div>
    </Transition>

    <!-- Idol Overlay -->
    <Transition name="combat-fade">
      <div
        v-if="showIdolView"
        class="absolute inset-0 z-[96] bg-black overflow-hidden"
        @pointermove="handleIdolDicePointerMove"
        @pointerup="handleIdolDicePointerUp"
        @pointercancel="handleIdolDicePointerUp"
      >
        <img
          :src="idolBackgroundUrl"
          class="absolute inset-0 h-full w-full object-cover"
          alt="神像界面背景"
        />

        <div class="idol-layout absolute inset-0 z-[97]">
          <div class="idol-slots-row">
            <div class="idol-slot-wrap">
              <div class="idol-slot-hint">增加1倍点数的生命上限</div>
              <div
                ref="idolSlotMaxHpRef"
                class="idol-slot"
                :class="{
                  'is-preview': idolSnapPreviewTarget === 'maxHp',
                  'is-selected': idolAssignedTarget === 'maxHp',
                }"
              ></div>
            </div>
            <div class="idol-slot-wrap">
              <div class="idol-slot-hint">增加1倍点数的初始魔力</div>
              <div
                ref="idolSlotMpRef"
                class="idol-slot"
                :class="{
                  'is-preview': idolSnapPreviewTarget === 'mp',
                  'is-selected': idolAssignedTarget === 'mp',
                }"
              ></div>
            </div>
            <div class="idol-slot-wrap">
              <div class="idol-slot-hint">增加2倍点数的金币</div>
              <div
                ref="idolSlotGoldRef"
                class="idol-slot"
                :class="{
                  'is-preview': idolSnapPreviewTarget === 'gold',
                  'is-selected': idolAssignedTarget === 'gold',
                }"
              ></div>
            </div>
          </div>

          <div ref="idolDiceStageRef" class="idol-dice-stage">
            <div
              ref="idolDiceRef"
              class="idol-dice-draggable"
              :class="{ 'is-locked': idolDiceRolling }"
              :style="{ transform: `translate(${idolDicePosition.x}px, ${idolDicePosition.y}px)` }"
              @pointerdown="handleIdolDicePointerDown"
            >
              <DungeonDice
                :value="idolDiceValue"
                :rolling="idolDiceRolling"
                color="gold"
                size="lg"
                :rolling-min="idolDiceMin"
                :rolling-max="idolDiceMax"
              />
            </div>
          </div>
        </div>

        <button
          class="idol-exit-btn absolute right-5 bottom-5 z-[98] px-6 py-3 font-ui text-sm tracking-wider text-amber-50"
          :disabled="gameStore.isGenerating"
          @click="exitIdolView"
        >
          退出
        </button>
      </div>
    </Transition>

    <!-- Victory Card Reward Overlay -->
    <Transition name="combat-fade">
      <div v-if="showVictoryRewardView" class="absolute inset-0 z-[102] bg-black/90">
        <div class="absolute inset-0 p-6 md:p-10 flex items-center justify-center">
          <div class="w-full max-w-6xl rounded-xl border border-dungeon-gold/35 bg-[#0f0906]/95 p-5 md:p-7 shadow-[0_0_28px_rgba(212,175,55,0.2)]">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <div class="font-heading text-xl text-dungeon-gold">战胜奖励</div>
                <div class="text-xs text-dungeon-paper/65 mt-1">
                  {{ victoryRewardStage === 'pick' ? '请选择 1 张奖励卡牌' : '选择要替换的卡组槽位（共9槽）' }}
                </div>
              </div>
              <button
                class="px-4 py-2 rounded border border-dungeon-brown text-dungeon-paper/75 hover:border-dungeon-gold/50"
                :disabled="rewardApplying"
                @click="exitVictoryRewardFlow"
              >
                退出
              </button>
            </div>

            <template v-if="victoryRewardStage === 'pick'">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <button
                  v-for="card in victoryRewardOptions"
                  :key="`reward-option-${card.id}`"
                  type="button"
                  class="rounded-lg border border-dungeon-brown/50 bg-[#160d08]/75 p-3 transition-all hover:border-dungeon-gold/60 hover:scale-[1.01]"
                  @click="pickVictoryRewardCard(card)"
                >
                  <div class="flex justify-center">
                    <DungeonCard :card="card" disabled />
                  </div>
                  <div class="mt-2 text-center text-xs text-dungeon-gold/90">选择此卡</div>
                </button>
              </div>
            </template>

            <template v-else>
              <div class="mb-4 rounded border border-dungeon-gold/25 bg-black/20 p-3">
                <div class="text-xs text-dungeon-paper/70 mb-2">已选择奖励卡：</div>
                <div class="flex justify-center">
                  <DungeonCard v-if="selectedVictoryRewardCard" :card="selectedVictoryRewardCard" disabled />
                </div>
              </div>

              <div
                v-if="rewardReplaceEntries.length === 0"
                class="rounded border border-dungeon-brown/50 bg-black/20 p-4 text-center"
              >
                <div class="text-sm text-dungeon-paper/70">当前卡组为空，将奖励卡加入卡组。</div>
                <button
                  type="button"
                  class="mt-3 px-4 py-2 rounded border border-dungeon-gold/45 text-dungeon-gold hover:bg-dungeon-gold/10 disabled:opacity-50"
                  :disabled="rewardApplying"
                  @click="replaceDeckCardWithReward(0)"
                >
                  加入卡组
                </button>
              </div>

              <div
                v-if="rewardReplaceEntries.length > 0"
                class="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[52vh] overflow-y-auto custom-scrollbar pr-1"
              >
                <button
                  v-for="entry in rewardReplaceEntries"
                  :key="`reward-replace-${entry.idx}`"
                  type="button"
                  class="rounded border border-dungeon-brown/50 bg-[#160d08]/65 p-3 text-left transition-colors hover:border-dungeon-gold/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="rewardApplying"
                  @click="replaceDeckCardWithReward(entry.idx)"
                >
                  <div class="text-[11px] text-dungeon-paper/65 mb-2">槽位 {{ entry.idx + 1 }}</div>
                  <div class="flex justify-center">
                    <DungeonCard v-if="entry.card" :card="entry.card" disabled />
                    <div v-else class="w-[180px] h-[250px] rounded border border-dungeon-brown/45 flex items-center justify-center text-xs text-dungeon-paper/55">
                      {{ entry.name || '空槽位' }}
                    </div>
                  </div>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>

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
  Lock,
  Map as MapIcon,
  Maximize,
  Scroll,
  Send,
  Settings as SettingsIcon,
} from 'lucide-vue-next';
import { getAllCards, resolveCardNames } from '../battle/cardRegistry';
import { getAllEnemyNames, getEnemyByName } from '../battle/enemyRegistry';
import { getAllRelics, getRelicByName, type RelicData } from '../battle/relicRegistry';
import { bgmTrackId, bgmTracks, bgmVolume, setBgmTrack, setBgmVolume } from '../bgm';
import { FLOOR_MAP, getFloorForArea, getNextFloor } from '../floor';
import { toggleFullScreen } from '../fullscreen';
import { useGameStore } from '../gameStore';
import { CardType, EffectType, type CardData } from '../types';
import CombatView from './CombatView.vue';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';
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
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          disabled: props.disabled,
          class: [
            'w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 shadow-lg border relative group disabled:cursor-not-allowed',
            props.disabled
              ? 'bg-[#120d0a] text-dungeon-paper/35 border-dungeon-brown/70'
              : props.active
              ? 'bg-dungeon-gold text-black border-dungeon-paper shadow-[0_0_15px_#d4af37]'
              : 'bg-[#1a0f08] text-dungeon-gold-dim border-dungeon-brown hover:bg-dungeon-brown hover:text-dungeon-gold hover:border-dungeon-gold/50',
          ],
          onClick: () => {
            if (!props.disabled) {
              emit('click');
            }
          },
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
const showShopView = ref(false);
const showIdolView = ref(false);
const shopProducts = ref<ShopProduct[]>([]);
const shopBuying = ref(false);
const shopSpentGold = ref(0);
const shopPurchasedItems = ref<Array<{ name: string; rarity: string; price: number }>>([]);
const shopRobClickCount = ref(0);
const shopRobbing = ref(false);
const showChestView = ref(false);
const chestStage = ref<'closed' | 'opened' | 'mimic'>('closed');
const chestRolling = ref(false);
const chestRewardRelic = ref<RelicData | null>(null);
const chestRewardCollected = ref(false);
const chestCollecting = ref(false);
const chestRewardVisible = ref(false);
const chestOpenedBgReady = ref(false);
const chestPortalChoices = ref<PortalChoice[]>([]);
const hotSpringCleanseMessage = ref<{ id: number; text: string } | null>(null);
const idolDiceValue = ref(1);
const idolDiceRolling = ref(false);
const idolAssignedTarget = ref<IdolBlessingTarget | null>(null);
const idolSnapPreviewTarget = ref<IdolBlessingTarget | null>(null);
const idolDicePosition = ref({ x: 0, y: 0 });
const idolDiceStageRef = ref<HTMLElement | null>(null);
const idolDiceRef = ref<HTMLElement | null>(null);
const idolSlotMaxHpRef = ref<HTMLElement | null>(null);
const idolSlotMpRef = ref<HTMLElement | null>(null);
const idolSlotGoldRef = ref<HTMLElement | null>(null);
const idolDragPointerId = ref<number | null>(null);
const idolDragStart = ref({ x: 0, y: 0 });
const idolDragStartPos = ref({ x: 0, y: 0 });
const combatTestStep = ref<'deck' | 'enemy'>('deck');
const selectedTestDeck = ref<string[]>([]);
const selectedTestEnemy = ref('');
const selectedTestRelicCounts = ref<Record<string, number>>({});
const selectedCardCategoryTab = ref('全部');
const selectedRelicCategoryTab = ref('全部');
const activeCombatContext = ref<'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest'>('normal');
const pendingCombatNarrative = ref<{
  id: string;
  context: 'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest';
  win: boolean;
  enemyName: string;
  text: string;
} | null>(null);
const dispatchedCombatNarrativeIds = new Set<string>();
const showVictoryRewardView = ref(false);
const victoryRewardStage = ref<'pick' | 'replace'>('pick');
const victoryRewardOptions = ref<CardData[]>([]);
const selectedVictoryRewardCard = ref<CardData | null>(null);
const rewardApplying = ref(false);
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
let chestMimicTimer: ReturnType<typeof setTimeout> | null = null;
let chestRewardFadeTimer: ReturnType<typeof setTimeout> | null = null;
let shopRobTimer: ReturnType<typeof setTimeout> | null = null;
let hotSpringCleanseTimer: ReturnType<typeof setTimeout> | null = null;
let idolRollTimer: ReturnType<typeof setTimeout> | null = null;
let relicTooltipLongPressTimer: ReturnType<typeof setTimeout> | null = null;
let relicTooltipAutoHideTimer: ReturnType<typeof setTimeout> | null = null;
let hotSpringCleanseMessageId = 0;

interface ShopProduct {
  key: string;
  relic: RelicData;
  basePrice: number;
  finalPrice: number;
  sold: boolean;
}

type CombatContext = 'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest';
type IdolBlessingTarget = 'maxHp' | 'mp' | 'gold';
interface IdolBlessingConfig {
  target: IdolBlessingTarget;
  slotLabel: string;
  statueName: string;
  rewardText: (dice: number) => string;
}
interface IdolSnapCandidate {
  target: IdolBlessingTarget;
  distance: number;
  snapX: number;
  snapY: number;
}

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

const CHEST_BG_CLOSED = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%AE%9D%E7%AE%B11.png';
const CHEST_BG_OPENED = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%AE%9D%E7%AE%B12.png';
const CHEST_BG_MIMIC = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%AE%9D%E7%AE%B13.png';
const SHOP_BG_URL = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%95%86%E5%BA%97.png';
const SHOP_MERCHANT_PORTRAIT_URL = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E9%AD%94%E7%89%A9/%E6%B2%90%E8%8A%AF%E5%85%B0/%E6%B2%90%E8%8A%AF%E5%85%B04.png';
const IDOL_BG_URL = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E7%A5%9E%E5%83%8F.png';
const idolBackgroundUrl = IDOL_BG_URL;
const shopBackgroundUrl = SHOP_BG_URL;
const shopMerchantPortraitUrl = SHOP_MERCHANT_PORTRAIT_URL;
const chestBackgroundUrl = computed(() => {
  if (chestStage.value === 'opened') return CHEST_BG_OPENED;
  if (chestStage.value === 'mimic') return CHEST_BG_MIMIC;
  return CHEST_BG_CLOSED;
});
const IDOL_BLESSING_CONFIG: Record<IdolBlessingTarget, IdolBlessingConfig> = {
  maxHp: {
    target: 'maxHp',
    slotLabel: '生命上限',
    statueName: '生命神像',
    rewardText: (dice) => `生命上限+${dice}`,
  },
  mp: {
    target: 'mp',
    slotLabel: '初始魔力',
    statueName: '魔力神像',
    rewardText: (dice) => `魔量+${dice}`,
  },
  gold: {
    target: 'gold',
    slotLabel: '金币',
    statueName: '财富神像',
    rewardText: (dice) => `金币+${dice * 2}`,
  },
};
const IDOL_SNAP_DISTANCE = 112;

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
const MAGIC_BOOK_COVER_BASE = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E9%AD%94%E6%B3%95%E4%B9%A6%E5%B0%81%E9%9D%A2';
const getMagicBookCoverUrl = (bookName: string) => `${MAGIC_BOOK_COVER_BASE}/${encodeURIComponent(bookName)}.png`;
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
const selectableRelicPool = computed<RelicData[]>(() => {
  const categorySet = new Set<string>(['基础', ...carriedMagicBooks.value]);
  let pool = getAllRelics().filter((relic) => categorySet.has(relic.category));
  if (pool.length === 0) {
    pool = getAllRelics().filter((relic) => relic.category === '基础');
  }
  return [...pool];
});
const muxinlanFavor = computed<number>(() => {
  const roles = (gameStore.statData.角色 ?? {}) as Record<string, any>;
  const raw = Number(roles?.['沐芯兰']?.['好感度'] ?? 0);
  const safe = Number.isFinite(raw) ? raw : 0;
  return Math.max(-1000, Math.min(1000, safe));
});
const shopDiscountRate = computed(() => Math.max(0, Math.min(1000, muxinlanFavor.value)) * 0.0002);
const shopRobBtnOpacity = computed(() => {
  const revealed = Math.min(5, shopRobClickCount.value);
  return (0.32 + revealed * 0.13).toFixed(2);
});
const parseMerchantDefeatedValue = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
};
const isMerchantDefeated = computed(() => parseMerchantDefeatedValue(gameStore.statData._是否已击败商人));
const canEditMagicBooks = computed(() => (
  ((gameStore.statData._当前区域 as string) || '') === '魔女的小窝'
));
const magicBookSidebarIcon = computed(() => (canEditMagicBooks.value ? Book : Lock));
const isUpdatingMagicBooks = ref(false);
const openMagicBookModal = () => {
  if (!canEditMagicBooks.value) return;
  activeModal.value = 'magicBooks';
};
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
const rewardCardPool = computed<CardData[]>(() => {
  const categorySet = new Set<string>(['基础', ...carriedMagicBooks.value]);
  const filtered = allCardsForTest.value.filter((card) => categorySet.has(card.category));
  if (filtered.length > 0) return filtered;
  return [...allCardsForTest.value];
});
const rewardReplaceEntries = computed<Array<{ idx: number; name: string; card: CardData | null }>>(() => {
  const raw = Array.isArray(gameStore.statData._技能) ? (gameStore.statData._技能 as string[]) : [];
  return raw.slice(0, 9).map((name, idx) => ({
    idx,
    name,
    card: cardByNameForTest.value.get(name) ?? null,
  }));
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
    case CardType.CURSE:
      return 'border-violet-500/50 text-violet-300 bg-violet-900/20';
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
const chestRewardEntry = computed<RelicEntryView | null>(() => {
  const relic = chestRewardRelic.value;
  if (!relic) return null;
  return {
    name: relic.name,
    count: 1,
    rarity: relic.rarity,
    category: relic.category,
    effect: relic.effect,
    description: relic.description ?? relic.effect ?? '',
  };
});

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

const showChestRewardTooltip = (event: MouseEvent | FocusEvent) => {
  if (!chestRewardEntry.value) return;
  showRelicTooltip(event, chestRewardEntry.value);
};

const handleChestRewardTouchStart = (event: TouchEvent) => {
  if (!chestRewardEntry.value) return;
  handleRelicTouchStart(event, chestRewardEntry.value);
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
watch(canEditMagicBooks, (editable) => {
  if (!editable && activeModal.value === 'magicBooks') {
    activeModal.value = null;
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

const isStreamingEnabled = computed<boolean>({
  get: () => gameStore.useStreaming,
  set: (value) => gameStore.setUseStreaming(value),
});

const selectedBgmTrackId = computed<string>({
  get: () => bgmTrackId.value,
  set: (value) => setBgmTrack(value),
});

const bgmVolumePercent = computed<number>({
  get: () => Math.round(bgmVolume.value * 100),
  set: (value) => setBgmVolume(value / 100),
});

// ── Computed display values from MVU stat_data ──
const displayText = computed(() =>
  gameStore.mainText || '未能检测到正文标签，推测为空回/截断，请查看控制台输出',
);

type StoryInlineSegmentType = 'text' | 'muted' | 'quote';

interface StoryInlineSegment {
  key: string;
  type: StoryInlineSegmentType;
  text: string;
}

interface StoryLineBlock {
  type: 'line';
  key: string;
  level: 0 | 1 | 2 | 3 | 4;
  segments: StoryInlineSegment[];
}

interface StoryTucaoSection {
  key: string;
  lines: StoryLineBlock[];
}

interface StoryContentState {
  lines: StoryLineBlock[];
  tucaoSections: StoryTucaoSection[];
}

const inlineMarkRegex = /(\*[^*\r\n]+\*|“[^”\r\n]+”|「[^」\r\n]+」|"[^"\r\n]+"|'[^'\r\n]+')/g;
const headerMarkRegex = /^(#{1,4})\s*(.*)$/;
const tucaoOpenTagRegex = /<\s*tucao(?:\s+[^>]*)?>/gi;
const tucaoCloseTagRegex = /<\s*\/\s*tucao\s*>/gi;
const tucaoExpandedState = ref<Record<string, boolean>>({});

function isQuotedText(text: string): boolean {
  const value = text.trim();
  if (value.length < 2) return false;
  return (
    /^“[^”\r\n]+”$/.test(value)
    || /^「[^」\r\n]+」$/.test(value)
    || /^"[^"\r\n]+"$/.test(value)
    || /^'[^'\r\n]+'$/.test(value)
  );
}

function normalizeTucaoMarkers(text: string): string {
  return text
    // HTML entity forms: &lt;tucao&gt;...&lt;/tucao&gt;
    .replace(/&lt;\s*tucao(?:\s+[^&]*?)?&gt;/gi, '<tucao>')
    .replace(/&lt;\s*\/\s*tucao\s*&gt;/gi, '</tucao>')
    // Alternate bracket forms: [tucao]...[/tucao]
    .replace(/\[\s*tucao\s*]/gi, '<tucao>')
    .replace(/\[\s*\/\s*tucao\s*]/gi, '</tucao>')
    // Chinese tag alias: <吐槽>...</吐槽>
    .replace(/<\s*吐槽(?:\s+[^>]*)?>/gi, '<tucao>')
    .replace(/<\s*\/\s*吐槽\s*>/gi, '</tucao>');
}

function parseInlineSegments(line: string, keyPrefix: string): StoryInlineSegment[] {
  if (!line) return [];
  const segments: StoryInlineSegment[] = [];
  let lastIndex = 0;
  let segmentIndex = 0;
  let match: RegExpExecArray | null;

  inlineMarkRegex.lastIndex = 0;
  while ((match = inlineMarkRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        key: `${keyPrefix}-seg-${segmentIndex}`,
        type: 'text',
        text: line.slice(lastIndex, match.index),
      });
      segmentIndex += 1;
    }

    const markedText = match[0];
    if (markedText.startsWith('*') && markedText.endsWith('*')) {
      const innerText = markedText.slice(1, -1);
      if (isQuotedText(innerText)) {
        segments.push({
          key: `${keyPrefix}-seg-${segmentIndex}`,
          type: 'quote',
          text: innerText,
        });
      } else {
        segments.push({
          key: `${keyPrefix}-seg-${segmentIndex}`,
          type: 'muted',
          text: innerText,
        });
      }
    } else if (isQuotedText(markedText)) {
      segments.push({
        key: `${keyPrefix}-seg-${segmentIndex}`,
        type: 'quote',
        text: markedText,
      });
    } else {
      segments.push({
        key: `${keyPrefix}-seg-${segmentIndex}`,
        type: 'quote',
        text: markedText,
      });
    }
    segmentIndex += 1;
    lastIndex = inlineMarkRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    segments.push({
      key: `${keyPrefix}-seg-${segmentIndex}`,
      type: 'text',
      text: line.slice(lastIndex),
    });
  }

  return segments;
}

function parseStoryLine(line: string, key: string): StoryLineBlock {
  const match = headerMarkRegex.exec(line);
  let level: 0 | 1 | 2 | 3 | 4 = 0;
  let content = line;

  if (match) {
    level = match[1].length as 1 | 2 | 3 | 4;
    content = match[2];
  }

  return {
    type: 'line',
    key,
    level,
    segments: parseInlineSegments(content, key),
  };
}

function parseTextLines(text: string, keyPrefix: string): StoryLineBlock[] {
  if (text.length === 0) return [];
  return text.split('\n').map((line, index) => parseStoryLine(line, `${keyPrefix}-line-${index}`));
}

function parseStoryContent(text: string): StoryContentState {
  const normalized = normalizeTucaoMarkers(text).replace(/\r\n/g, '\n');
  const lines: StoryLineBlock[] = [];
  const tucaoSections: StoryTucaoSection[] = [];
  let cursor = 0;
  let sectionIndex = 0;
  let openMatch: RegExpExecArray | null;

  tucaoOpenTagRegex.lastIndex = 0;
  while ((openMatch = tucaoOpenTagRegex.exec(normalized)) !== null) {
    const openStart = openMatch.index;
    const openEnd = tucaoOpenTagRegex.lastIndex;

    const plainPart = normalized.slice(cursor, openStart);
    lines.push(...parseTextLines(plainPart, `story-${sectionIndex}-plain-${cursor}`));

    tucaoCloseTagRegex.lastIndex = openEnd;
    const closeMatch = tucaoCloseTagRegex.exec(normalized);
    const contentEnd = closeMatch ? closeMatch.index : normalized.length;
    const nextCursor = closeMatch ? tucaoCloseTagRegex.lastIndex : normalized.length;

    const tucaoContent = normalized.slice(openEnd, contentEnd).replace(/^\n+/, '').replace(/\n+$/, '');
    const tucaoKey = `story-tucao-${sectionIndex}-${openStart}`;
    const parsedTucaoLines = parseTextLines(tucaoContent, tucaoKey);
    if (parsedTucaoLines.length > 0) {
      tucaoSections.push({
        key: tucaoKey,
        lines: parsedTucaoLines,
      });
    }

    cursor = nextCursor;
    tucaoOpenTagRegex.lastIndex = cursor;
    sectionIndex += 1;

    // Missing closing tag: consume to end once.
    if (!closeMatch) {
      break;
    }
  }

  const tail = normalized.slice(cursor);
  lines.push(...parseTextLines(tail, `story-tail-${cursor}`));

  return {
    lines,
    tucaoSections,
  };
}

const storyContentState = computed<StoryContentState>(() => parseStoryContent(displayText.value));
const storyMainLines = computed<StoryLineBlock[]>(() => storyContentState.value.lines);
const storyTucaoSections = computed<StoryTucaoSection[]>(() => storyContentState.value.tucaoSections);

watch(storyTucaoSections, (sections) => {
  const validKeys = new Set(
    sections.map(section => section.key),
  );
  const nextState: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(tucaoExpandedState.value)) {
    if (validKeys.has(key)) {
      nextState[key] = value;
    }
  }
  tucaoExpandedState.value = nextState;
}, { immediate: true });

const isTucaoExpanded = (key: string) => Boolean(tucaoExpandedState.value[key]);
const toggleTucao = (key: string) => {
  tucaoExpandedState.value[key] = !isTucaoExpanded(key);
};

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
const idolDiceMin = computed(() => Math.max(1, toNonNegativeInt(displayMinDice.value, 1)));
const idolDiceMax = computed(() => Math.max(idolDiceMin.value, toNonNegativeInt(displayMaxDice.value, 6)));

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
const idolRewardSummary = computed(() => {
  const target = idolAssignedTarget.value;
  if (!target) return null;
  const config = IDOL_BLESSING_CONFIG[target];
  const dice = idolDiceValue.value;
  const amount = target === 'gold' ? dice * 2 : dice;
  return {
    target,
    statueName: config.statueName,
    amount,
    rewardText: config.rewardText(dice),
  };
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

const REBIRTH_STARTER_DECK = [
  '普通物理攻击', '普通物理攻击', '普通物理攻击',
  '普通魔法攻击', '普通魔法攻击',
  '普通护盾', '普通护盾',
  '普通闪避', '普通闪避',
];
const HOT_SPRING_CLEANSE_ACTION_TEXT = '<user>浸泡在暖泉中，污秽正悄然消融。（负面效果已全部消除）';
const HOT_SPRING_CLEANSE_LINES = [
  '泉水洗去了你身上的污秽，灵魂重获纯净。',
  '温热的泉水带走了不详的气息，你感到前所未有的轻松。',
  '诅咒已随水波逝去，你的身心焕然一新。',
  '尘垢尽落，灵台清明。',
];

const toNonNegativeInt = (value: unknown, fallback: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
};

const buildRebirthResetFields = (): Record<string, any> => {
  const initialMaxHp = Math.max(1, toNonNegativeInt(gameStore.statData.$初始血量上限, 10));
  const initialMp = toNonNegativeInt(gameStore.statData.$初始魔量, 1);
  const initialGold = toNonNegativeInt(gameStore.statData.$初始金币, 0);
  const currentSkillPoints = toNonNegativeInt(gameStore.statData.$技能点, 0);
  const currentFloor = Math.max(1, toNonNegativeInt(gameStore.statData._楼层数, 1));
  const rebirthSkillPointGain = Math.floor((currentFloor * (currentFloor + 1)) / 2);
  return {
    _血量: initialMaxHp,
    _血量上限: initialMaxHp,
    _魔量: initialMp,
    _金币: initialGold,
    $技能点: currentSkillPoints + rebirthSkillPointGain,
    _技能: [...REBIRTH_STARTER_DECK],
    _负面状态: [],
    $被动: '',
    $主动: ['', ''],
    _圣遗物: {},
    $最大点数: 6,
    $最小点数: 1,
    _楼层数: 1,
    _当前区域: '魔女的小窝',
    _当前房间类型: '',
    _当前事件: '',
    _对手名称: '',
    _是否已击败商人: false,
    $统计: {
      当前层已过房间: 0,
      累计已过房间: 0,
      累计经过战斗: 0,
      累计经过温泉: 0,
      累计经过宝箱: 0,
      累计经过商店: 0,
      累计经过神像: 0,
      累计经过事件: 0,
      累计经过陷阱: 0,
    },
  };
};

const handleRebirthClick = () => {
  if (gameStore.isGenerating) return;
  showCombat.value = false;
  showVictoryRewardView.value = false;
  closeShopView();
  closeChestView();
  closeIdolView();
  pendingCombatNarrative.value = null;
  gameStore.setPendingCombatMvuChanges(null);
  gameStore.setPendingStatDataChanges(buildRebirthResetFields());
  gameStore.sendAction('<user>在死亡边缘触发了回溯，回到了魔女的小窝。当前状态已重置为初始值，请基于回溯后的状态继续剧情。');
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
  if (isTreasureRoomContext.value) return ROOM_TYPE_CONFIG['宝箱房'];
  if (isShopContext.value) return ROOM_TYPE_CONFIG['商店房'];
  const roomType = gameStore.statData._当前房间类型 as string;
  if (!roomType) return null;
  if (roomType === '事件房' || roomType === '陷阱房') return null;
  return ROOM_TYPE_CONFIG[roomType] ?? null;
});

const isTreasureRoomContext = computed(() => {
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  const area = ((gameStore.statData._当前区域 as string) || '').trim();
  return roomType === '宝箱房' || area === '宝箱' || area === '宝箱房';
});
const isShopContext = computed(() => {
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  const area = ((gameStore.statData._当前区域 as string) || '').trim();
  return roomType === '商店房' || area === '商店';
});
const isHotSpringRoomContext = computed(() => {
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  return roomType === '温泉房';
});
const isIdolRoomContext = computed(() => {
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  return roomType === '神像房';
});
const isCombatRoomContext = computed(() => {
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  return roomType === '战斗房' || roomType === '领主房';
});

const sanitizeCombatLogLine = (line: string) => {
  return line
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatCombatLogs = (logs: string[]) => {
  const ordered = [...logs]
    .reverse()
    .map(sanitizeCombatLogLine)
    .filter((line) => line.length > 0);
  if (ordered.length === 0) return '（战斗日志为空）';
  return ordered.join('\n');
};

const buildCombatNarrative = (win: boolean, enemyName: string, context: CombatContext, logs: string[]) => {
  const outcomeLine = win
    ? `<user>战斗结果：[胜利]，<user>战胜了${enemyName}。`
    : `<user>战斗结果：[败北]，<user>被${enemyName}击败。`;
  const contextLine = context === 'shopRobbery'
    ? '<user>本次战斗发生在抢夺商店的冲突中。'
    : context === 'chestMimic'
    ? '<user>本次战斗发生在宝箱怪伏击中。'
    : context === 'combatTest'
    ? '<user>本次战斗来自战斗测试。'
    : '<user>本次战斗发生在地牢探索途中。';
  const followupLine = win
    ? '<user>请根据以下完整战斗日志继续剧情，并体现胜利后的后续发展。'
    : '<user>请根据以下完整战斗日志继续剧情，并体现战败后的后续发展。';
  return `${outcomeLine}\n${contextLine}\n${followupLine}\n<user>战斗日志（时间顺序）：\n${formatCombatLogs(logs)}`;
};

const sendCombatNarrativeOnce = (narrative: { id: string }, text: string) => {
  if (dispatchedCombatNarrativeIds.has(narrative.id)) return;
  if (gameStore.isGenerating) return;
  dispatchedCombatNarrativeIds.add(narrative.id);
  gameStore.sendAction(text);
};

const queueCombatMvuSync = (win: boolean, finalStats: unknown, negativeEffects: string[]) => {
  const hpRaw = Number((finalStats as { hp?: unknown } | null | undefined)?.hp);
  const hasHp = Number.isFinite(hpRaw);
  const floorRaw = Number(gameStore.statData._楼层数 ?? 1);
  const floor = Number.isFinite(floorRaw) ? Math.max(1, Math.floor(floorRaw)) : 1;
  const goldReward = 3 + (2 * floor);
  const normalizedNegativeEffects = negativeEffects
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  gameStore.setPendingCombatMvuChanges({
    hp: hasHp ? Math.max(0, Math.floor(hpRaw)) : undefined,
    addDefeatMark: !win,
    goldDelta: win ? goldReward : undefined,
    negativeStatusesAdd: normalizedNegativeEffects,
  });
};

const applyMerchantDefeatedShopState = () => {
  for (const item of shopProducts.value) {
    item.finalPrice = 0;
  }
};

const pickUniqueRewardCard = (
  pool: CardData[],
  usedIds: Set<string>,
): CardData | null => {
  const candidates = pool.filter((card) => !usedIds.has(card.id));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
};

const startVictoryRewardFlow = () => {
  const pool = rewardCardPool.value;
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  const isLordRoom = roomType === '领主房';

  const normalPool = pool.filter((card) => card.rarity === '普通');
  const rarePool = pool.filter((card) => card.rarity === '稀有');
  const options: CardData[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < 3; i++) {
    const pickRare = isLordRoom || Math.random() < 0.1;
    const targetPool = pickRare ? rarePool : normalPool;
    const picked = pickUniqueRewardCard(targetPool, usedIds);
    if (!picked) continue;
    options.push(picked);
    usedIds.add(picked.id);
  }

  if (options.length === 0) return false;
  victoryRewardOptions.value = options;
  selectedVictoryRewardCard.value = null;
  victoryRewardStage.value = 'pick';
  showVictoryRewardView.value = true;
  return true;
};

const finalizeVictoryRewardFlow = () => {
  showVictoryRewardView.value = false;
  victoryRewardStage.value = 'pick';
  victoryRewardOptions.value = [];
  selectedVictoryRewardCard.value = null;
  rewardApplying.value = false;
  const narrative = pendingCombatNarrative.value;
  if (!narrative) return;
  if (narrative.context === 'shopRobbery') return;
  pendingCombatNarrative.value = null;
  sendCombatNarrativeOnce(narrative, narrative.text);
};

const exitVictoryRewardFlow = () => {
  finalizeVictoryRewardFlow();
};

const pickVictoryRewardCard = (card: CardData) => {
  selectedVictoryRewardCard.value = card;
  victoryRewardStage.value = 'replace';
};

const replaceDeckCardWithReward = async (idx: number) => {
  if (!selectedVictoryRewardCard.value || rewardApplying.value) return;
  const raw = Array.isArray(gameStore.statData._技能)
    ? [...(gameStore.statData._技能 as string[])].slice(0, 9)
    : [];
  if (raw.length === 0) {
    raw.push(selectedVictoryRewardCard.value.name);
  } else if (idx >= 0 && idx < raw.length) {
    raw[idx] = selectedVictoryRewardCard.value.name;
  } else {
    return;
  }
  rewardApplying.value = true;
  const ok = await gameStore.updateStatDataFields({ _技能: raw });
  rewardApplying.value = false;
  if (!ok) return;
  finalizeVictoryRewardFlow();
};

const getRarityBasePrice = (rarity: RelicData['rarity']) => {
  if (rarity === '传奇') return 15;
  if (rarity === '稀有') return 10;
  return 5;
};

const formatRarityLabel = (rarity: RelicData['rarity']) => (rarity === '传奇' ? '传说' : rarity);

const rollShopRarity = (): RelicData['rarity'] => {
  const r = Math.random();
  if (r < 0.8) return '普通';
  if (r < 0.95) return '稀有';
  return '传奇';
};

const toRelicTooltipEntry = (relic: RelicData): RelicEntryView => ({
  name: relic.name,
  count: 1,
  rarity: relic.rarity,
  category: relic.category,
  effect: relic.effect,
  description: relic.description ?? relic.effect ?? '',
});

const showShopProductTooltip = (event: MouseEvent | FocusEvent, item: ShopProduct) => {
  showRelicTooltip(event, toRelicTooltipEntry(item.relic));
};

const handleShopProductTouchStart = (event: TouchEvent, item: ShopProduct) => {
  handleRelicTouchStart(event, toRelicTooltipEntry(item.relic));
};

const generateShopProducts = () => {
  const pool = [...selectableRelicPool.value];
  const favorForCount = Math.max(0, muxinlanFavor.value);
  const targetCount = Math.max(0, 3 + Math.floor(favorForCount / 200));
  const count = Math.min(targetCount, pool.length);
  const usedNames = new Set<string>();
  const discountRate = shopDiscountRate.value;
  const next: ShopProduct[] = [];

  for (let i = 0; i < count; i++) {
    const targetRarity = rollShopRarity();
    let candidates = pool.filter((relic) => !usedNames.has(relic.name) && relic.rarity === targetRarity);
    if (candidates.length === 0) {
      candidates = pool.filter((relic) => !usedNames.has(relic.name));
    }
    if (candidates.length === 0) break;
    const relic = pickOne(candidates);
    if (!relic) break;
    usedNames.add(relic.name);

    const basePrice = getRarityBasePrice(relic.rarity);
    const finalPrice = isMerchantDefeated.value ? 0 : Math.max(1, Math.ceil(basePrice * (1 - discountRate)));
    next.push({
      key: `${relic.id}-${i}`,
      relic,
      basePrice,
      finalPrice,
      sold: false,
    });
  }

  shopProducts.value = next;
};

const openShopView = () => {
  hideRelicTooltip();
  clearShopRobTimer();
  shopBuying.value = false;
  shopSpentGold.value = 0;
  shopPurchasedItems.value = [];
  shopRobClickCount.value = 0;
  shopRobbing.value = false;
  generateShopProducts();
  if (isMerchantDefeated.value) {
    applyMerchantDefeatedShopState();
  }
  showShopView.value = true;
};

const closeShopView = () => {
  hideRelicTooltip();
  clearShopRobTimer();
  shopBuying.value = false;
  shopRobbing.value = false;
  showShopView.value = false;
};

const buildNextRelicInventory = (pickedRelic: RelicData): Record<string, number> => {
  const rawRelics = gameStore.statData._圣遗物 ?? {};
  const nextRelics: Record<string, number> = {};
  for (const [name, value] of Object.entries(rawRelics as Record<string, number>)) {
    const count = Math.max(0, Math.floor(Number(value ?? 0)));
    if (!name || count <= 0) continue;
    nextRelics[name] = count;
  }
  nextRelics[pickedRelic.name] = (nextRelics[pickedRelic.name] ?? 0) + 1;
  return nextRelics;
};

const buyShopProduct = async (item: ShopProduct) => {
  if (shopBuying.value || item.sold) return;
  const currentGold = Math.max(0, Math.floor(Number(gameStore.statData._金币 ?? 0)));
  if (currentGold < item.finalPrice) {
    return;
  }

  shopBuying.value = true;
  const nextGold = currentGold - item.finalPrice;
  const nextRelics = buildNextRelicInventory(item.relic);
  const ok = await gameStore.updateStatDataFields({
    _金币: nextGold,
    _圣遗物: nextRelics,
  });
  shopBuying.value = false;
  if (!ok) return;

  item.sold = true;
  shopSpentGold.value += item.finalPrice;
  shopPurchasedItems.value.push({
    name: item.relic.name,
    rarity: formatRarityLabel(item.relic.rarity),
    price: item.finalPrice,
  });
  hideRelicTooltip();
};

const exitShop = () => {
  if (shopBuying.value || gameStore.isGenerating || shopRobbing.value) return;
  const purchased = [...shopPurchasedItems.value];
  const total = shopSpentGold.value;
  const narrative = pendingCombatNarrative.value;
  closeShopView();
  if (narrative && narrative.context === 'shopRobbery' && narrative.win) {
    const lootedText = purchased.length > 0
      ? `<user>我在失守的货架上拿走了${purchased.map((item) => `${item.name}（${item.rarity}）`).join('，')}。`
      : '<user>我没有额外拿走商店货架上的物品。';
    const report = `${narrative.text}\n${lootedText}\n<user>我离开了商店，请基于战斗结果、战斗日志与离店行为继续后续剧情。`;
    pendingCombatNarrative.value = null;
    sendCombatNarrativeOnce(narrative, report);
    return;
  }

  if (purchased.length === 0) return;
  const purchasedText = purchased.map((item) => `${item.name}（${item.rarity}）`).join('，');
  gameStore.sendAction(`<user>从沐芯兰处购买了${purchasedText}，总共花费${total}枚金币。`);
};

const handleShopRobClick = async () => {
  if (shopBuying.value || gameStore.isGenerating || shopRobbing.value || isMerchantDefeated.value) return;
  if (shopRobClickCount.value < 5) {
    shopRobClickCount.value += 1;
    return;
  }

  shopRobbing.value = true;
  const ok = await gameStore.updateStatDataFields({ _对手名称: '沐芯兰' });
  if (!ok) {
    shopRobbing.value = false;
    return;
  }

  clearShopRobTimer();
  shopRobTimer = setTimeout(() => {
    closeShopView();
    combatEnemyName.value = '沐芯兰';
    activeCombatContext.value = 'shopRobbery';
    showCombat.value = true;
    shopRobTimer = null;
  }, 1000);
};

const clearShopRobTimer = () => {
  if (!shopRobTimer) return;
  clearTimeout(shopRobTimer);
  shopRobTimer = null;
};

const clearChestMimicTimer = () => {
  if (!chestMimicTimer) return;
  clearTimeout(chestMimicTimer);
  chestMimicTimer = null;
};

const clearChestRewardFadeTimer = () => {
  if (!chestRewardFadeTimer) return;
  clearTimeout(chestRewardFadeTimer);
  chestRewardFadeTimer = null;
};

const clearHotSpringCleanseTimer = () => {
  if (!hotSpringCleanseTimer) return;
  clearTimeout(hotSpringCleanseTimer);
  hotSpringCleanseTimer = null;
};

const showHotSpringCleanseText = () => {
  const text = pickOne(HOT_SPRING_CLEANSE_LINES) ?? HOT_SPRING_CLEANSE_LINES[0]!;
  const messageId = ++hotSpringCleanseMessageId;
  hotSpringCleanseMessage.value = { id: messageId, text };
  clearHotSpringCleanseTimer();
  hotSpringCleanseTimer = setTimeout(() => {
    if (hotSpringCleanseMessage.value?.id === messageId) {
      hotSpringCleanseMessage.value = null;
    }
    hotSpringCleanseTimer = null;
  }, 2600);
};

const useHotSpringCleanse = () => {
  showHotSpringCleanseText();
  gameStore.setPendingStatDataChanges({ _负面状态: [] });
  gameStore.sendAction(HOT_SPRING_CLEANSE_ACTION_TEXT);
};

onUnmounted(() => {
  clearShopRobTimer();
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  clearHotSpringCleanseTimer();
  clearIdolRollTimer();
});

const handleChestBgLoaded = () => {
  if (!showChestView.value) return;
  if (chestStage.value !== 'opened') return;
  if (chestBackgroundUrl.value !== CHEST_BG_OPENED) return;
  chestOpenedBgReady.value = true;
  if (chestRewardRelic.value && !chestRewardCollected.value) {
    chestRewardVisible.value = true;
  }
};

const openChestView = () => {
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  chestStage.value = 'closed';
  chestRolling.value = false;
  chestRewardRelic.value = null;
  chestRewardCollected.value = false;
  chestCollecting.value = false;
  chestRewardVisible.value = false;
  chestOpenedBgReady.value = false;
  chestPortalChoices.value = [];
  showChestView.value = true;
};

const closeChestView = () => {
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  hideRelicTooltip();
  showChestView.value = false;
  chestRolling.value = false;
  chestRewardVisible.value = false;
  chestOpenedBgReady.value = false;
};

const clearIdolRollTimer = () => {
  if (!idolRollTimer) return;
  clearTimeout(idolRollTimer);
  idolRollTimer = null;
};

const clampNumber = (value: number, min: number, max: number) => {
  if (max <= min) return min;
  return Math.max(min, Math.min(max, value));
};

const rollIdolDiceValue = () => {
  const min = idolDiceMin.value;
  const max = idolDiceMax.value;
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getIdolSlotElement = (target: IdolBlessingTarget) => {
  if (target === 'maxHp') return idolSlotMaxHpRef.value;
  if (target === 'mp') return idolSlotMpRef.value;
  return idolSlotGoldRef.value;
};

const getIdolSnapCandidate = (x: number, y: number): IdolSnapCandidate | null => {
  const stageEl = idolDiceStageRef.value;
  const diceEl = idolDiceRef.value;
  if (!stageEl || !diceEl) return null;

  const stageRect = stageEl.getBoundingClientRect();
  const diceRect = diceEl.getBoundingClientRect();
  const maxX = Math.max(0, stageRect.width - diceRect.width);
  const maxY = Math.max(0, stageRect.height - diceRect.height);
  const diceCenterX = x + (diceRect.width / 2);
  const diceCenterY = y + (diceRect.height / 2);

  let best: IdolSnapCandidate | null = null;
  const targets: IdolBlessingTarget[] = ['maxHp', 'mp', 'gold'];
  for (const target of targets) {
    const slotEl = getIdolSlotElement(target);
    if (!slotEl) continue;
    const slotRect = slotEl.getBoundingClientRect();
    const slotCenterX = (slotRect.left - stageRect.left) + (slotRect.width / 2);
    const slotCenterY = (slotRect.top - stageRect.top) + (slotRect.height / 2);
    const distance = Math.hypot(slotCenterX - diceCenterX, slotCenterY - diceCenterY);
    const snapX = clampNumber(slotCenterX - (diceRect.width / 2), 0, maxX);
    const snapY = clampNumber(slotCenterY - (diceRect.height / 2), 0, maxY);
    if (!best || distance < best.distance) {
      best = { target, distance, snapX, snapY };
    }
  }

  if (!best || best.distance > IDOL_SNAP_DISTANCE) return null;
  return best;
};

const placeIdolDiceAtStart = () => {
  const stageEl = idolDiceStageRef.value;
  const diceEl = idolDiceRef.value;
  if (!stageEl || !diceEl) return;
  const stageRect = stageEl.getBoundingClientRect();
  const diceRect = diceEl.getBoundingClientRect();
  const maxX = Math.max(0, stageRect.width - diceRect.width);
  const maxY = Math.max(0, stageRect.height - diceRect.height);
  const x = Math.max(0, (stageRect.width - diceRect.width) / 2);
  const y = clampNumber(stageRect.height * 0.72, 0, maxY);
  idolDicePosition.value = { x: clampNumber(x, 0, maxX), y };
  idolSnapPreviewTarget.value = null;
};

const openIdolView = () => {
  if (gameStore.isGenerating) return;
  clearIdolRollTimer();
  idolAssignedTarget.value = null;
  idolSnapPreviewTarget.value = null;
  idolDragPointerId.value = null;
  idolDiceValue.value = idolDiceMin.value;
  idolDiceRolling.value = true;
  showIdolView.value = true;
  idolRollTimer = setTimeout(() => {
    idolDiceValue.value = rollIdolDiceValue();
    idolDiceRolling.value = false;
    idolRollTimer = null;
    requestAnimationFrame(() => {
      placeIdolDiceAtStart();
    });
  }, 520);
};

const closeIdolView = () => {
  clearIdolRollTimer();
  idolDragPointerId.value = null;
  showIdolView.value = false;
};

const handleIdolDicePointerDown = (event: PointerEvent) => {
  if (!showIdolView.value || idolDiceRolling.value) return;
  const diceEl = idolDiceRef.value;
  if (!diceEl) return;
  idolAssignedTarget.value = null;
  idolDragPointerId.value = event.pointerId;
  idolDragStart.value = { x: event.clientX, y: event.clientY };
  idolDragStartPos.value = { ...idolDicePosition.value };
  diceEl.setPointerCapture(event.pointerId);
};

const handleIdolDicePointerMove = (event: PointerEvent) => {
  if (!showIdolView.value) return;
  if (idolDragPointerId.value !== event.pointerId) return;
  const stageEl = idolDiceStageRef.value;
  const diceEl = idolDiceRef.value;
  if (!stageEl || !diceEl) return;

  const stageRect = stageEl.getBoundingClientRect();
  const diceRect = diceEl.getBoundingClientRect();
  const maxX = Math.max(0, stageRect.width - diceRect.width);
  const maxY = Math.max(0, stageRect.height - diceRect.height);
  const dx = event.clientX - idolDragStart.value.x;
  const dy = event.clientY - idolDragStart.value.y;
  const nextX = clampNumber(idolDragStartPos.value.x + dx, 0, maxX);
  const nextY = clampNumber(idolDragStartPos.value.y + dy, 0, maxY);
  idolDicePosition.value = { x: nextX, y: nextY };
  const candidate = getIdolSnapCandidate(nextX, nextY);
  idolSnapPreviewTarget.value = candidate?.target ?? null;
};

const handleIdolDicePointerUp = (event: PointerEvent) => {
  if (!showIdolView.value) return;
  if (idolDragPointerId.value !== event.pointerId) return;
  const diceEl = idolDiceRef.value;
  if (diceEl) {
    diceEl.releasePointerCapture(event.pointerId);
  }
  const candidate = getIdolSnapCandidate(idolDicePosition.value.x, idolDicePosition.value.y);
  if (candidate) {
    idolAssignedTarget.value = candidate.target;
    idolSnapPreviewTarget.value = candidate.target;
    idolDicePosition.value = { x: candidate.snapX, y: candidate.snapY };
  } else {
    idolAssignedTarget.value = null;
    idolSnapPreviewTarget.value = null;
  }
  idolDragPointerId.value = null;
};

const buildIdolPendingFields = () => {
  const reward = idolRewardSummary.value;
  if (!reward) return null;

  const currentMaxHp = toNonNegativeInt(gameStore.statData._血量上限, 10);
  const currentMp = toNonNegativeInt(gameStore.statData._魔量, 1);
  const currentGold = toNonNegativeInt(gameStore.statData._金币, 0);
  if (reward.target === 'maxHp') {
    return { _血量上限: currentMaxHp + reward.amount };
  }
  if (reward.target === 'mp') {
    return { _魔量: currentMp + reward.amount };
  }
  return { _金币: currentGold + reward.amount };
};

const exitIdolView = () => {
  if (gameStore.isGenerating) return;
  const reward = idolRewardSummary.value;
  closeIdolView();
  if (!reward) {
    gameStore.sendAction('<user>没有膜拜任何一座神像，选择了直接离开。');
    return;
  }
  const fields = buildIdolPendingFields();
  if (fields) {
    gameStore.setPendingStatDataChanges(fields);
  }
  gameStore.sendAction(`<user>选择膜拜了${reward.statueName}并获得了${reward.rewardText}。`);
};

const pickChestRewardRelic = (): RelicData | null => {
  const candidatePool = [...selectableRelicPool.value];
  if (candidatePool.length === 0) return null;

  const rarityRoll = Math.random();
  const targetRarity = rarityRoll < 0.6 ? '普通' : rarityRoll < 0.9 ? '稀有' : '传奇';
  let rarityPool = candidatePool.filter((relic) => relic.rarity === targetRarity);
  if (rarityPool.length === 0) {
    rarityPool = candidatePool;
  }
  return pickOne(rarityPool);
};

const collectChestReward = () => {
  if (!chestRewardRelic.value || chestRewardCollected.value || chestCollecting.value) return;
  chestCollecting.value = true;
  // 这里只记录“已领取”，不改当前楼层 MVU；实际写入延迟到点击传送门时排队到下一层 user 楼层
  chestRewardCollected.value = true;
  chestCollecting.value = false;
  clearChestRewardFadeTimer();
  chestRewardFadeTimer = setTimeout(() => {
    chestRewardVisible.value = false;
    hideRelicTooltip();
    chestRewardFadeTimer = null;
  }, 260);
};

const handleChestCenterClick = async () => {
  if (chestRolling.value || chestStage.value !== 'closed') return;
  chestRolling.value = true;
  const openSuccess = Math.random() < 0.9;

  if (openSuccess) {
    chestStage.value = 'opened';
    chestOpenedBgReady.value = false;
    chestRewardVisible.value = false;
    const reward = pickChestRewardRelic();
    if (!reward) {
      chestRolling.value = false;
      return;
    }
    chestRewardRelic.value = reward;
    chestRewardCollected.value = false;
    chestCollecting.value = false;
    chestPortalChoices.value = generateChestLeavePortals();
    if (chestOpenedBgReady.value) {
      chestRewardVisible.value = true;
    }
    chestRolling.value = false;
    return;
  }

  chestStage.value = 'mimic';
  await gameStore.updateStatDataFields({ _对手名称: '宝箱怪' });
  clearChestMimicTimer();
  chestMimicTimer = setTimeout(() => {
    showChestView.value = false;
    combatEnemyName.value = '宝箱怪';
    activeCombatContext.value = 'chestMimic';
    showCombat.value = true;
    chestMimicTimer = null;
  }, 1000);
};

const startCombatFromSpecialOption = async () => {
  let enemyName = ((gameStore.statData._对手名称 as string) || '').trim();
  if (!enemyName) {
    const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
    const area = ((gameStore.statData._当前区域 as string) || '').trim();
    enemyName = roomType === '领主房'
      ? (pickLordMonsterByArea(area) ?? '')
      : (pickBattleMonsterByArea(area) ?? '');
    if (!enemyName) {
      toastr.warning('当前未找到可战斗的对手。');
      return;
    }
    const ok = await gameStore.updateStatDataFields({ _对手名称: enemyName });
    if (!ok) return;
  }
  combatEnemyName.value = enemyName;
  activeCombatContext.value = 'normal';
  showCombat.value = true;
};

const handleSpecialOption = async () => {
  if (isTreasureRoomContext.value) {
    openChestView();
    return;
  }
  if (isShopContext.value) {
    openShopView();
    return;
  }
  if (isHotSpringRoomContext.value) {
    useHotSpringCleanse();
    return;
  }
  if (isIdolRoomContext.value) {
    openIdolView();
    return;
  }
  if (isCombatRoomContext.value) {
    await startCombatFromSpecialOption();
    return;
  }
  toastr.info('功能开发中...');
};

// ══════════════════════════════════════════════════════════════
//  [Leave] Portal System — Floor/Area Logic
// ══════════════════════════════════════════════════════════════

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

// 领主顺序严格按 FLOOR_MONSTER_CONFIG 的区域顺序映射。
const LORD_MONSTER_ORDER: string[] = [
  '普莉姆', '宁芙', '温蒂尼', '玛塔', '罗丝', '厄休拉',
  '希尔薇', '因克', '阿卡夏', '多萝西', '维罗妮卡',
  '伊丽莎白', '尤斯蒂娅', '克拉肯', '布偶',
  '赛琳娜', '米拉', '梦魔双子', '贝希摩斯',
  '佩恩', '西格尔', '摩尔', '利维坦', '奥赛罗', '盖亚',
];

const LORD_MONSTER_BY_AREA: Record<string, string> = (() => {
  const areaOrder: string[] = [];
  for (const floorConfig of Object.values(FLOOR_MONSTER_CONFIG)) {
    areaOrder.push(...Object.keys(floorConfig.uniqueByArea));
  }

  const mapping: Record<string, string> = {};
  for (let i = 0; i < areaOrder.length; i += 1) {
    const area = areaOrder[i]!;
    const lordName = LORD_MONSTER_ORDER[i];
    if (lordName) {
      mapping[area] = lordName;
    }
  }
  return mapping;
})();

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

function pickLordMonsterByArea(area: string): string | null {
  const lordName = LORD_MONSTER_BY_AREA[area];
  if (!lordName) return null;
  return lordName;
}

// ── Portal visuals ──
const PORTAL_ROOM_TYPES = ['战斗房', '宝箱房', '商店房', '温泉房', '神像房', '事件房', '陷阱房'];
const PORTAL_ROOM_WEIGHTS: Record<string, number> = {
  '战斗房': 50,
  '宝箱房': 20,
  '商店房': 5,
  '温泉房': 10,
  '神像房': 10,
  '事件房': 0,
  '陷阱房': 5,
};
const TRAP_POOL_BY_AREA: Record<string, string[]> = {
  '粘液之沼': ['粘液深坑', '史莱姆的温床'],
  '发情迷雾森林': ['迷雾漩涡', '活体树洞', '树精的共生茧'],
  '喷精泉眼': ['间歇性喷泉', '深水陷阱', '圣泉倒灌'],
  '肉欲食人花圃': ['诱惑陷阱', '粘性花蜜池'],
  '触手菌窟': ['孢子爆炸', '活体陷阱'],

  '禁忌图书馆': ['幻境之书', '禁言束缚'],
  // 呻吟阅览室：无陷阱（传送门中会移除陷阱房）
  '催情墨染湖': ['强制纹身', '墨汁洗礼', '沉溺之爱'],
  '性癖记录馆': ['公开处刑'],
  '淫乱教职工宿舍': ['催眠广播', '强制派对'],

  '欲望监狱': ['自动拘束床', '审讯室陷阱', '矫正项圈'],
  '吸血鬼古堡': ['魅惑血雾', '血契房间'],
  '调教审判庭': ['真言之椅', '雷霆忏悔席'],
  '触手水牢': ['伪装平台', '嵌墙活体标本'],
  '人偶工坊': ['丝线操控', '强制装配台'],

  '虚空宫殿': ['重力反转', '维度分割展台'],
  '镜之舞厅': ['镜像置换', '自我对峙', '无尽回廊'],
  '双子寝宫': ['永恒春梦', '梦境具现', '双子的探访'],
  '春梦回廊': ['记忆囚笼', '梦魇骑行'],
  '极乐宴会厅': ['欲望之酒', '暴食者的终宴'],

  '交媾祭坛': ['神圣跪拜', '献祭仪式'],
  '圣水之海': ['圣水灌注', '溺亡的极乐', '依赖成瘾'],
  '苦修之路': ['感官过载', '镜中诱惑', '跌倒的代价'],
  '神谕淫纹室': ['强制烙印', '欲望显现', '连锁反应'],
  '女神的产房': ['强制受孕', '母性陷阱', '子宫回归'],
};

const ALL_TRAPS = Object.values(TRAP_POOL_BY_AREA).flat();

const pickTrapByArea = (area: string): string | null => {
  const pool = TRAP_POOL_BY_AREA[area] ?? [];
  if (pool.length > 0) return pickOne(pool);
  if (ALL_TRAPS.length > 0) return pickOne(ALL_TRAPS);
  return null;
};

const getAvailablePortalRoomTypes = (currentArea: string) => {
  if (parseMerchantDefeatedValue(gameStore.statData._是否已击败商人)) {
    const withoutShop = PORTAL_ROOM_TYPES.filter((type) => type !== '商店房');
    if (currentArea === '呻吟阅览室') {
      return withoutShop.filter((type) => type !== '陷阱房');
    }
    return withoutShop;
  }
  if (currentArea === '呻吟阅览室') {
    return PORTAL_ROOM_TYPES.filter((type) => type !== '陷阱房');
  }
  return [...PORTAL_ROOM_TYPES];
};

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

function rollPortalCount(): number {
  const roll = Math.random();
  // 传送门数量概率：1/2/3 = 30% / 50% / 20%
  return roll < 0.3 ? 1 : roll < 0.8 ? 2 : 3;
}

function pickWeightedRoomTypes(roomTypes: string[], count: number): string[] {
  const picked: string[] = [];
  if (roomTypes.length === 0 || count <= 0) return picked;

  // 允许可重复抽取：每次都从同一候选池按权重抽取，不移除已抽中的房间类型
  const weightedPool = roomTypes.map((type) => ({
    type,
    weight: Math.max(0, PORTAL_ROOM_WEIGHTS[type] ?? 0),
  }));
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);

  while (picked.length < count) {
    let selected: string;
    if (totalWeight <= 0) {
      selected = pickOne(roomTypes) ?? roomTypes[0]!;
    } else {
      let roll = Math.random() * totalWeight;
      selected = weightedPool[weightedPool.length - 1]!.type;
      for (const item of weightedPool) {
        roll -= item.weight;
        if (roll <= 0) {
          selected = item.type;
          break;
        }
      }
    }

    picked.push(selected);
  }

  return picked;
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

  // ── Boss room probability: rooms >= 7 → (rooms - 6) * 30% ──
  if (roomsPassed >= 7) {
    const bossChance = (roomsPassed - 6) * 0.3;
    if (Math.random() < bossChance) {
      const vis = PORTAL_ROOM_VISUALS['领主房'];
      return [{ label: '领主房', roomType: '领主房', isFloorTransition: false, ...vis }];
    }
  }

  // ── Normal: 1-3 weighted room portals (30%/50%/20%, with replacement) ──
  const availableRoomTypes = getAvailablePortalRoomTypes(currentArea);
  if (availableRoomTypes.length === 0) return [];
  const count = rollPortalCount();
  const picked = pickWeightedRoomTypes(availableRoomTypes, count);
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
  const merchantDefeated = parseMerchantDefeatedValue(gameStore.statData._是否已击败商人);
  const fingerprint = `${area}|${roomType}|${rooms}|${merchantDefeated ? 1 : 0}`;
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

interface QueuedPortalAction {
  actionText: string;
  enterText: string;
  pendingStatDataFields?: Record<string, any>;
}

const buildQueuedPortalAction = (portal: PortalChoice): QueuedPortalAction => {
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
    const enterText = `进入了${portal.areaName}的宝箱房`;
    return {
      enterText,
      actionText: `<user>选择了继续前进，${enterText}`,
    };
  }

  // 记录待应用变量：进入新房间，更新统计
  const incrementKeys = ['当前层已过房间', '累计已过房间'];
  const statKey = ROOM_STAT_KEY[portal.roomType];
  if (statKey) incrementKeys.push(statKey);
  const currentArea = (gameStore.statData._当前区域 as string) || '';
  const encounterMonster = portal.roomType === '领主房'
    ? pickLordMonsterByArea(currentArea)
    : portal.roomType === '战斗房'
      ? pickBattleMonsterByArea(currentArea)
      : null;
  const trapName = portal.roomType === '陷阱房'
    ? pickTrapByArea(currentArea)
    : null;
  const trapHpAfterDamage = portal.roomType === '陷阱房'
    ? Math.max(1, toNonNegativeInt(gameStore.statData._血量, 1) - 5)
    : undefined;
  let pendingStatDataFields: Record<string, any> | undefined;
  if (portal.roomType === '陷阱房') {
    pendingStatDataFields = {
      _当前事件: trapName ?? '',
      _血量: trapHpAfterDamage,
    };
  } else if (portal.roomType === '温泉房') {
    const maxHp = Math.max(
      1,
      toNonNegativeInt(gameStore.statData._血量上限, toNonNegativeInt(gameStore.statData._血量, 1)),
    );
    pendingStatDataFields = {
      _血量: maxHp,
    };
  }

  gameStore.setPendingPortalChanges({
    roomType: portal.roomType,
    incrementKeys,
    enemyName: encounterMonster ?? '',
  });
  console.info(`[Portal] Room transition queued → type: ${portal.roomType}`);

  const enterText = (portal.roomType === '战斗房' || portal.roomType === '领主房') && encounterMonster
    ? `进入了${portal.roomType}并遭遇了${encounterMonster}`
    : portal.roomType === '陷阱房' && trapName
      ? `进入了${portal.roomType}的房间，当前陷阱房为${trapName}`
      : `进入了${portal.roomType}的房间`;

  return {
    enterText,
    actionText: `<user>选择了继续前进，${enterText}`,
    pendingStatDataFields,
  };
};

function generateChestLeavePortals(): PortalChoice[] {
  const generated = generatePortals();
  if (generated.length > 0) return generated;

  const currentArea = (gameStore.statData._当前区域 as string) || '';
  const availableRoomTypes = getAvailablePortalRoomTypes(currentArea);
  if (availableRoomTypes.length === 0) return [];
  const count = rollPortalCount();
  const picked = pickWeightedRoomTypes(availableRoomTypes, count);
  return picked.map(rt => ({ label: rt, roomType: rt, isFloorTransition: false, ...PORTAL_ROOM_VISUALS[rt] }));
}

const handlePortalClick = async (portal: PortalChoice) => {
  if (gameStore.isGenerating) return;
  const { actionText, pendingStatDataFields } = buildQueuedPortalAction(portal);
  gameStore.setPendingStatDataChanges(pendingStatDataFields ?? null);
  gameStore.sendAction(actionText);
};

const handleChestPortalClick = async (portal: PortalChoice) => {
  if (gameStore.isGenerating || chestCollecting.value || chestStage.value !== 'opened') return;
  const { actionText, enterText, pendingStatDataFields } = buildQueuedPortalAction(portal);
  const collectedRelic = chestRewardCollected.value ? chestRewardRelic.value : null;
  const mergedPendingStatDataFields: Record<string, any> = {
    ...(pendingStatDataFields ?? {}),
  };
  if (collectedRelic) {
    // 宝箱奖励遵循与传送门一致的“延迟写入”策略：仅在点击传送门时排队到下一层 user 楼层
    const nextRelics = buildNextRelicInventory(collectedRelic);
    mergedPendingStatDataFields._圣遗物 = nextRelics;
  }
  gameStore.setPendingStatDataChanges(Object.keys(mergedPendingStatDataFields).length > 0 ? mergedPendingStatDataFields : null);

  const relicName = collectedRelic?.name ?? '';
  closeChestView();
  if (relicName) {
    gameStore.sendAction(`<user>打开了箱子并从中获取了圣遗物${relicName}，随后离开了当前房间并进入了下一个房间，<user>${enterText}`);
    return;
  }
  gameStore.sendAction(actionText);
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
  activeCombatContext.value = 'combatTest';
  combatTestStartAt999CurrentBattle.value = combatTestStartAt999.value;
  showCombat.value = true;
};

const handleCombatEnd = async (win: boolean, finalStats: unknown, logs: string[], negativeEffects: string[]) => {
  const context = activeCombatContext.value;
  const enemyName = combatEnemyName.value || ((gameStore.statData._对手名称 as string) || '未知敌人');
  pendingCombatNarrative.value = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    context,
    win,
    enemyName,
    text: buildCombatNarrative(win, enemyName, context, logs ?? []),
  };

  queueCombatMvuSync(win, finalStats, negativeEffects ?? []);

  showCombat.value = false;
  showVictoryRewardView.value = false;
  combatTestStartAt999CurrentBattle.value = false;
  activeCombatContext.value = 'normal';

  if (!win) {
    closeShopView();
    const narrative = pendingCombatNarrative.value;
    pendingCombatNarrative.value = null;
    if (narrative) {
      sendCombatNarrativeOnce(narrative, narrative.text);
    }
    console.log('[Combat] Result:', 'LOSE');
    return;
  }

  if (context === 'shopRobbery' && enemyName === '沐芯兰') {
    const ok = await gameStore.updateStatDataFields({ _是否已击败商人: true });
    if (ok) {
      shopRobbing.value = false;
      showShopView.value = true;
      applyMerchantDefeatedShopState();
    } else if (pendingCombatNarrative.value) {
      pendingCombatNarrative.value.context = 'normal';
    }
  }

  const hasRewardOptions = startVictoryRewardFlow();
  if (!hasRewardOptions) {
    finalizeVictoryRewardFlow();
  }
  console.log('[Combat] Result:', 'WIN');
};

onBeforeUnmount(() => {
  clearShopRobTimer();
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  clearHotSpringCleanseTimer();
  clearIdolRollTimer();
});
</script>

<style scoped>
@font-face {
  font-family: 'MaShanZheng';
  src: url('../font/MaShanZheng-Regular.ttf') format('truetype');
  font-display: swap;
}

@font-face {
  font-family: 'MagicBookTitle';
  src: url('../font/平方赖江湖琅琊体.ttf') format('truetype');
  font-display: swap;
}

.magic-book-title {
  font-family: 'MaShanZheng', 'KaiTi', serif;
  color: rgba(253, 230, 138, 0.95);
  letter-spacing: 0.04em;
  text-shadow:
    0 1px 1px rgba(0, 0, 0, 0.9),
    0 0 10px rgba(212, 175, 55, 0.35);
}

.story-rich-text {
  display: flex;
  flex-direction: column;
  gap: 0.34em;
}

.story-line {
  margin: 0;
  white-space: pre-wrap;
}

.story-line-empty {
  display: inline-block;
  min-height: 1em;
}

.story-line-level-1 {
  font-size: 1.55em;
  line-height: 1.45;
  font-weight: 700;
  color: rgba(245, 222, 179, 0.96);
}

.story-line-level-2 {
  font-size: 1.34em;
  line-height: 1.5;
  font-weight: 700;
  color: rgba(245, 222, 179, 0.9);
}

.story-line-level-3 {
  font-size: 1.2em;
  line-height: 1.58;
  font-weight: 600;
  color: rgba(245, 222, 179, 0.86);
}

.story-line-level-4 {
  font-size: 1.12em;
  line-height: 1.64;
  font-weight: 600;
  color: rgba(245, 222, 179, 0.8);
}

.story-segment-muted {
  color: rgba(156, 163, 175, 0.95);
}

.story-segment-quote {
  color: #1d4ed8;
}

.story-tucao-section-list {
  margin-top: 0.66rem;
}

.story-tucao-wrap {
  margin: 0.26rem 0 0.34rem;
}

.story-tucao-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 9999px;
  border: 1px solid rgba(251, 191, 36, 0.45);
  background: rgba(48, 31, 20, 0.84);
  color: rgba(252, 211, 77, 0.96);
  font-size: 0.72em;
  letter-spacing: 0.02em;
  padding: 0.22rem 0.64rem;
  transition: all 0.2s ease;
}

.story-tucao-toggle:hover {
  color: rgba(254, 240, 138, 0.98);
  border-color: rgba(252, 211, 77, 0.78);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.32);
}

.story-tucao-panel {
  margin-top: 0.6rem;
  border-radius: 0.92rem;
  border: 1px solid rgba(244, 114, 182, 0.42);
  background:
    linear-gradient(160deg, rgba(255, 249, 252, 0.9), rgba(255, 243, 250, 0.82)),
    radial-gradient(circle at 6% 3%, rgba(244, 114, 182, 0.24), transparent 52%);
  color: rgba(126, 60, 138, 0.95);
  padding: 0.95rem 1.05rem;
  box-shadow:
    0 0 14px rgba(244, 114, 182, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.story-tucao-panel .story-line {
  color: rgba(126, 60, 138, 0.95);
}

.story-tucao-panel .story-segment-muted {
  color: rgba(154, 126, 168, 0.9);
}

.story-tucao-panel .story-segment-quote {
  color: rgba(30, 58, 138, 0.92);
}

.tucao-expand-enter-active,
.tucao-expand-leave-active {
  transition: all 0.22s ease;
}

.tucao-expand-enter-from,
.tucao-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

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

.relic-tooltip-desc {
  margin-top: 0.28rem;
  color: rgba(209, 213, 219, 0.9);
  font-size: 10px;
  line-height: 1.35;
}

.chest-reward-anchor {
  position: absolute;
  left: 51%;
  top: 56.5%;
  transform: translate(-50%, -50%);
}

.chest-portals-anchor {
  position: absolute;
  left: 50%;
  bottom: 1.75rem;
  transform: translateX(-50%);
}

.chest-reward-icon {
  width: 6.5rem;
  height: 6.5rem;
  color: rgba(252, 211, 77, 0.98);
  transition: transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
  filter:
    drop-shadow(0 0 14px rgba(251, 191, 36, 0.8))
    drop-shadow(0 0 28px rgba(245, 158, 11, 0.55))
    drop-shadow(0 8px 24px rgba(0, 0, 0, 0.65));
}

.chest-reward-btn {
  border: 0;
  border-radius: 9999px;
  background: transparent;
  padding: 0.25rem;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.chest-reward-btn:hover .chest-reward-icon {
  transform: scale(1.05);
}

.chest-reward-btn.is-collected {
  opacity: 1;
}

.chest-reward-btn.is-collected .chest-reward-icon {
  opacity: 0;
  transform: scale(0.82);
  filter:
    drop-shadow(0 0 8px rgba(251, 191, 36, 0.45))
    drop-shadow(0 0 16px rgba(245, 158, 11, 0.25))
    drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));
}

.shop-panel {
  border: 1px solid rgba(217, 119, 6, 0.4);
  border-radius: 0.9rem;
  background:
    linear-gradient(145deg, rgba(23, 14, 8, 0.92), rgba(35, 21, 11, 0.9)),
    radial-gradient(circle at 70% 10%, rgba(180, 83, 9, 0.2), transparent 52%);
  box-shadow:
    0 0 28px rgba(180, 83, 9, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  padding: 1.1rem 1.2rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.shop-layout {
  left: 30%;
}

.shop-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  border-bottom: 1px solid rgba(245, 158, 11, 0.25);
  padding-bottom: 0.55rem;
}

.shop-goods-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 1rem;
  row-gap: 1.28rem;
  margin-top: 1.44rem;
  padding-right: 0.15rem;
  align-content: start;
}

.shop-item-card {
  border: 0;
  border-radius: 0.55rem;
  background: transparent;
  width: 100%;
  min-height: 132px;
  padding: 0.28rem 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  transition: transform 0.2s ease, opacity 0.25s ease, filter 0.2s ease;
}

.shop-item-card:hover {
  transform: translateY(-1px) scale(1.02);
  filter: brightness(1.04);
}

.shop-item-card.is-sold {
  opacity: 0.18;
  pointer-events: none;
}

.shop-item-icon-wrap {
  margin-top: 0;
}

.shop-item-icon {
  width: 3.4rem;
  height: 3.4rem;
  color: rgba(251, 191, 36, 0.98);
  filter: drop-shadow(0 0 11px rgba(245, 158, 11, 0.65));
}

.shop-item-price {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid rgba(245, 158, 11, 0.55);
  border-radius: 9999px;
  padding: 0.14rem 0.5rem;
  color: rgba(255, 237, 213, 0.96);
  background: rgba(38, 22, 11, 0.82);
  font-size: 10px;
}

.shop-panel-foot {
  margin-top: 0.35rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shop-rob-btn {
  border-radius: 9999px;
  border: 1px solid rgba(251, 191, 36, 0.5);
  background:
    radial-gradient(circle at 22% 20%, rgba(255, 237, 213, 0.16), transparent 45%),
    linear-gradient(120deg, rgba(41, 24, 12, 0.8), rgba(92, 47, 14, 0.75) 50%, rgba(34, 19, 9, 0.82));
  box-shadow:
    0 0 10px rgba(245, 158, 11, 0.25),
    inset 0 1px 0 rgba(255, 237, 213, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.shop-rob-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 0 14px rgba(245, 158, 11, 0.42),
    inset 0 1px 0 rgba(255, 237, 213, 0.2);
}

.shop-rob-btn:disabled {
  cursor: not-allowed;
}

.shop-exit-btn {
  border-radius: 9999px;
  border: 1px solid rgba(251, 191, 36, 0.72);
  background:
    radial-gradient(circle at 22% 20%, rgba(255, 237, 213, 0.22), transparent 45%),
    linear-gradient(120deg, rgba(41, 24, 12, 0.94), rgba(92, 47, 14, 0.92) 50%, rgba(34, 19, 9, 0.95));
  box-shadow:
    0 0 14px rgba(245, 158, 11, 0.45),
    0 0 30px rgba(180, 83, 9, 0.35),
    inset 0 1px 0 rgba(255, 237, 213, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.shop-exit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 0 18px rgba(251, 191, 36, 0.62),
    0 0 36px rgba(217, 119, 6, 0.42),
    inset 0 1px 0 rgba(255, 237, 213, 0.24);
}

.shop-exit-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.spring-cleanse-float {
  position: absolute;
  left: 50%;
  bottom: 1.25rem;
  max-width: min(90%, 860px);
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.96);
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: clamp(1rem, 1.9vw, 1.35rem);
  line-height: 1.45;
  text-align: center;
  pointer-events: none;
  z-index: 28;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.75),
    0 0 14px rgba(255, 255, 255, 0.22);
  animation: spring-cleanse-float-up 2.6s ease-out forwards;
}

@keyframes spring-cleanse-float-up {
  0% {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  14% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50px);
  }
}

.idol-layout {
  pointer-events: none;
}

.idol-slots-row {
  position: absolute;
  left: 50%;
  bottom: 28vh;
  transform: translateX(-50%);
  width: min(920px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(0.9rem, 2.8vw, 2.2rem);
  align-items: center;
  justify-items: center;
  pointer-events: none;
}

.idol-slot {
  width: clamp(4.8rem, 7.2vw, 6.9rem);
  height: clamp(4.2rem, 6.6vw, 6.1rem);
  clip-path: polygon(50% 0%, 94% 25%, 94% 75%, 50% 100%, 6% 75%, 6% 25%);
  border: 2px solid rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow:
    0 0 12px rgba(255, 255, 255, 0.35),
    0 0 26px rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
  position: relative;
}

.idol-slot-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.52rem;
  pointer-events: none;
}

.idol-slot.is-preview {
  border-color: rgba(253, 224, 71, 1);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 0 20px rgba(253, 224, 71, 0.5),
    0 0 36px rgba(253, 224, 71, 0.35);
}

.idol-slot.is-selected {
  border-color: rgba(255, 255, 255, 1);
  background: rgba(255, 255, 255, 1);
  box-shadow:
    0 0 24px rgba(255, 255, 255, 0.55),
    0 0 40px rgba(253, 224, 71, 0.35);
}

.idol-slot-hint {
  position: relative;
  color: rgba(240, 249, 255, 0.95);
  font-size: clamp(0.95rem, 1.6vw, 1.28rem);
  font-weight: 700;
  white-space: nowrap;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.7),
    0 0 8px rgba(148, 163, 184, 0.35);
  animation: idolHintFloat 3.4s ease-in-out infinite;
  z-index: 3;
}

.idol-dice-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.idol-dice-draggable {
  position: absolute;
  left: 0;
  top: 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: transform 0.08s linear;
  pointer-events: auto;
}

.idol-dice-draggable:active {
  cursor: grabbing;
}

.idol-dice-draggable.is-locked {
  cursor: default;
  opacity: 0.88;
}

@keyframes idolHintFloat {
  0%,
  100% {
    transform: translateY(0px);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

.idol-exit-btn {
  border-radius: 9999px;
  border: 1px solid rgba(196, 136, 255, 0.72);
  background:
    radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.18), transparent 48%),
    linear-gradient(120deg, rgba(44, 20, 74, 0.94), rgba(86, 38, 138, 0.9) 50%, rgba(27, 12, 48, 0.95));
  box-shadow:
    0 0 14px rgba(168, 85, 247, 0.45),
    0 0 28px rgba(109, 40, 217, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.idol-exit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 0 18px rgba(196, 136, 255, 0.58),
    0 0 34px rgba(147, 51, 234, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.idol-exit-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .shop-layout {
    left: 2%;
    right: 2%;
  }

  .shop-panel {
    height: 82vh;
    max-height: none;
    padding: 0.9rem;
  }

  .shop-goods-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 0.7rem;
    row-gap: 0.95rem;
    margin-top: 1.2rem;
  }

  .chest-reward-anchor {
    left: 46%;
    top: 57.5%;
  }

  .chest-portals-anchor {
    bottom: 1.1rem;
  }

  .idol-slots-row {
    width: calc(100vw - 24px);
    bottom: 31vh;
    gap: 0.4rem;
  }

  .idol-slot {
    width: 4.4rem;
    height: 3.9rem;
  }

  .idol-slot-hint {
    font-size: 0.72rem;
  }

  .idol-exit-btn {
    right: 0.9rem;
    bottom: 0.8rem;
    padding: 0.55rem 1rem;
  }
}
</style>
