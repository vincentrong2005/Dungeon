<template>
  <div ref="viewportRef" class="ui-viewport">
    <div class="ui-stage" :style="stageStyle">
      <div class="ui-stage-content w-full h-full bg-[#050505] font-body text-dungeon-paper overflow-hidden relative">
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

        <div v-if="showLandscapeHint" class="landscape-hint-overlay">
          <div class="landscape-hint-card">
            <div class="landscape-hint-title">建议横屏体验</div>
            <div class="landscape-hint-desc">
              当前主界面使用固定舞台布局，横屏时按钮和正文会更完整。你也可以继续保持竖屏。
            </div>
            <div class="landscape-hint-actions">
              <button type="button" class="landscape-hint-btn" @click="dismissLandscapeHint">继续竖屏</button>
            </div>
          </div>
        </div>

        <!-- Sidebar: Individual Icons Top-Left (no back button, settings already has exit) -->
        <div class="absolute top-8 left-8 z-50 flex flex-col space-y-4 ui-buttons-left">
          <SidebarIcon
            :icon="SettingsIcon"
            label="设置"
            tooltip-side="right"
            :active="activeModal === 'settings'"
            @click="activeModal = 'settings'"
          />
          <SidebarIcon
            :icon="Scroll"
            label="卡组"
            tooltip-side="right"
            :active="activeModal === 'deck'"
            @click="activeModal = 'deck'"
          />
          <SidebarIcon
            :icon="Box"
            label="背包"
            tooltip-side="right"
            :active="activeModal === 'statusDetails' && playerDetailTab === 'inventory'"
            @click="openInventoryModal('items')"
          />
          <SidebarIcon
            :icon="Users"
            label="羁绊"
            tooltip-side="right"
            :active="activeModal === 'bonds'"
            @click="activeModal = 'bonds'"
          />
          <SidebarIcon
            :icon="MapIcon"
            label="地图"
            tooltip-side="right"
            :active="activeModal === 'map'"
            @click="activeModal = 'map'"
          />
          <SidebarIcon
            :icon="magicBookSidebarIcon"
            :label="canEditMagicBooks ? '魔法书' : '魔法书（锁定）'"
            tooltip-side="right"
            :active="canEditMagicBooks && activeModal === 'magicBooks'"
            :highlight="canEditMagicBooks"
            :disabled="!canEditMagicBooks"
            @click="openMagicBookModal"
          />
          <SidebarIcon
            :icon="magicHatSidebarIcon"
            :label="canEditMagicBooks ? '魔法帽' : '魔法帽（锁定）'"
            tooltip-side="right"
            :active="canEditMagicBooks && activeModal === 'magicHat'"
            :highlight="canEditMagicBooks"
            :disabled="!canEditMagicBooks"
            @click="openMagicHatModal"
          />
        </div>

        <!-- Right sidebar: save/load only (reroll & edit moved into panel) -->
        <div class="absolute top-8 right-8 z-50 flex flex-col space-y-4 ui-buttons-right">
          <SidebarIcon :icon="Maximize" label="全屏模式" tooltip-side="left" @click="toggleFullScreen" />
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
        <div class="h-full min-h-0 w-full flex flex-col items-center">
          <div
            class="w-full min-h-0 flex flex-col pt-2 pb-[7.8rem] px-4 md:px-12 md:pl-24 transition-all duration-300 h-full"
            :style="{ maxWidth: textSettings.containerWidth + 'px' }"
          >
            <!-- Story Text Area -->
            <div
              ref="storyTextContainerRef"
              class="flex-1 bg-dungeon-dark/80 border border-dungeon-brown rounded-t-lg shadow-2xl backdrop-blur-sm p-6 md:p-10 overflow-y-auto min-h-0 custom-scrollbar relative"
            >
              <!-- Decorative Corners -->
              <div class="absolute top-2 left-2 w-4 h-4 border-t border-l border-dungeon-gold/30"></div>
              <div class="absolute top-2 right-2 w-4 h-4 border-t border-r border-dungeon-gold/30"></div>
              <div class="story-floor-indicator pointer-events-none select-none">
                消息楼层 第 {{ currentTavernFloorNumber }} 层
              </div>

              <!-- Loading Indicator -->
              <div v-if="gameStore.isGenerating" class="flex items-center gap-3 mb-4">
                <div class="flex gap-1">
                  <span class="w-2 h-2 bg-dungeon-gold rounded-full animate-bounce" style="animation-delay: 0s"></span>
                  <span
                    class="w-2 h-2 bg-dungeon-gold rounded-full animate-bounce"
                    style="animation-delay: 0.2s"
                  ></span>
                  <span
                    class="w-2 h-2 bg-dungeon-gold rounded-full animate-bounce"
                    style="animation-delay: 0.4s"
                  ></span>
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
                    class="px-5 py-2 text-sm font-ui text-gray-400 border border-gray-700 rounded hover:bg-gray-800 transition-colors"
                    @click="gameStore.cancelEdit()"
                  >
                    取消
                  </button>
                  <button
                    class="px-5 py-2 text-sm font-ui text-dungeon-gold border border-dungeon-gold/40 rounded hover:bg-dungeon-gold/10 transition-colors shadow-[0_0_8px_rgba(212,175,55,0.15)]"
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
                  <p
                    v-if="isStreamingEnabled && gameStore.isGenerating && gameStore.streamingText"
                    class="whitespace-pre-wrap text-dungeon-paper/85"
                  >
                    {{ streamingDisplayText }}
                  </p>
                  <!-- Final main text -->
                  <div v-else class="story-rich-text">
                    <template v-for="line in storyMainLines" :key="line.key">
                      <!-- Image block (inline at original position) -->
                      <div v-if="getImageBlockForLine(line)" class="image-block-inline">
                        <span class="image-tag-sr-only">{{ getImageBlockForLine(line)!.openTag }}</span
                        >{{ getImageBlockForLine(line)!.innerContent
                        }}<span class="image-tag-sr-only">{{ getImageBlockForLine(line)!.closeTag }}</span>
                      </div>
                      <!-- Normal text line -->
                      <p v-else :class="['story-line', `story-line-level-${line.level}`]">
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
                    </template>

                    <div v-if="storyTucaoSections.length > 0" class="story-tucao-section-list">
                      <div
                        v-for="(section, sectionIndex) in storyTucaoSections"
                        :key="section.key"
                        class="story-tucao-wrap"
                      >
                        <button class="story-tucao-toggle" type="button" @click="toggleTucao(section.key)">
                          {{
                            isTucaoExpanded(section.key)
                              ? `收起脑内剧场 ${Number(sectionIndex) + 1}`
                              : `🎮 此方的脑内剧场 ${Number(sectionIndex) + 1}`
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
                <div
                  v-if="
                    !gameStore.isGenerating &&
                    (gameStore.options.length > 0 || gameStore.hasOptionE || gameStore.hasLeave || gameStore.hasRebirth)
                  "
                  class="mt-8 flex flex-col space-y-3 ui-action-buttons"
                >
                  <div
                    class="h-[1px] w-full bg-gradient-to-r from-transparent via-dungeon-gold/20 to-transparent mb-2"
                  ></div>

                  <!-- A-D Normal Options -->
                  <button
                    v-for="(option, i) in gameStore.options"
                    :key="'opt-' + i"
                    class="w-full text-left px-5 py-3 bg-dungeon-dark/60 hover:bg-dungeon-brown/40 text-dungeon-paper/80 hover:text-dungeon-paper rounded border border-dungeon-brown/50 hover:border-dungeon-gold/40 font-ui text-sm tracking-wide transition-all duration-300 hover:shadow-[0_0_12px_rgba(212,175,55,0.08)] hover:translate-x-1"
                    :style="optionButtonTextStyle"
                    @click="handleOptionClick(option)"
                  >
                    {{ option }}
                  </button>

                  <!-- E Option: Special Room Action Button -->
                  <button
                    v-if="gameStore.hasOptionE && specialOptionConfig"
                    class="w-full text-center px-6 py-4 rounded-lg border-2 font-heading text-base tracking-wider transition-all duration-400 hover:scale-[1.02] active:scale-[0.98]"
                    :style="[
                      specialOptionButtonTextStyle,
                      {
                        backgroundColor: specialOptionConfig.bgColor,
                        borderColor: specialOptionConfig.borderColor,
                        color: specialOptionConfig.textColor,
                        boxShadow: `0 0 20px ${specialOptionConfig.glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                      },
                    ]"
                    @click="handleSpecialOption"
                  >
                    <span class="text-xl mr-2 inline-flex items-center justify-center" aria-hidden="true">
                      <i :class="specialOptionConfig.icon"></i>
                    </span>
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
                        class="portal-btn group relative flex flex-col items-center justify-center rounded-lg border-2 backdrop-blur-sm transition-all duration-500 hover:scale-110 active:scale-95"
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
                        <span class="portal-btn__icon mb-1 relative z-10 drop-shadow-lg">{{ portal.icon }}</span>
                        <!-- Portal label -->
                        <span
                          class="portal-btn__label font-ui tracking-wide relative z-10 text-center"
                          :style="{ color: portal.textColor }"
                          >{{ portal.label }}</span
                        >
                        <!-- Animated ring -->
                        <div
                          class="absolute inset-1 rounded-md border border-dashed opacity-30 group-hover:opacity-70 animate-[spin_8s_linear_infinite] transition-opacity"
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
                        class="group relative px-7 py-3 rounded-lg border-2 font-heading text-sm tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-red-950/45 border-red-500/60 text-red-100 shadow-[0_0_14px_rgba(239,68,68,0.35)] hover:shadow-[0_0_20px_rgba(248,113,113,0.5)]"
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
                <div
                  v-if="gameStore.error"
                  class="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded text-red-300 font-ui text-sm"
                >
                  {{ gameStore.error }}
                </div>
              </template>
            </div>
          </div>
        </div>
        <!-- Input Area (Stage-Anchored) -->
        <div class="ui-input-anchor absolute left-0 right-0 bottom-0 z-[60] pb-2">
          <div class="w-full mx-auto px-4 md:px-12 md:pl-24" :style="{ maxWidth: textSettings.containerWidth + 'px' }">
            <div class="ui-input-shell bg-[#0f0f0f] border-x border-b border-dungeon-brown rounded-b-lg p-3">
              <div class="w-full flex items-stretch gap-2">
                <input
                  v-model="inputText"
                  type="text"
                  :disabled="gameStore.isGenerating"
                  :placeholder="inputPlaceholder"
                  class="ui-input-field flex-1 h-[4.5rem] bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper text-[1.5rem] leading-tight px-5 rounded-lg focus:outline-none focus:border-dungeon-gold focus:ring-1 focus:ring-dungeon-gold/50 font-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  @keydown.enter="handleSendInput"
                />
                <div v-if="isButtonCompletionEnabled" ref="buttonCompletionMenuRef" class="ui-option-completion-wrap">
                  <button
                    type="button"
                    class="ui-option-completion-trigger h-[4.5rem] px-4 flex items-center justify-center gap-2 shrink-0"
                    :disabled="gameStore.isGenerating"
                    :aria-expanded="optionCompletionMenuOpen"
                    aria-haspopup="menu"
                    @click="toggleOptionCompletionMenu"
                  >
                    <span class="ui-option-completion-trigger__label">按钮补全</span>
                    <ChevronDown class="size-4 transition-transform duration-200" :class="optionCompletionMenuOpen ? 'rotate-180' : ''" />
                  </button>
                  <Transition name="option-completion-menu">
                    <div v-if="optionCompletionMenuOpen" class="ui-option-completion-menu" role="menu">
                      <button
                        v-for="item in optionCompletionMenuItems"
                        :key="item.key"
                        type="button"
                        class="ui-option-completion-item"
                        :class="{ 'is-disabled': item.disabled }"
                        :disabled="item.disabled || gameStore.isGenerating"
                        @click="handleOptionCompletionItemClick(item.key)"
                      >
                        <span class="ui-option-completion-item__label">{{ item.label }}</span>
                        <span class="ui-option-completion-item__tag">{{ item.marker }}</span>
                      </button>
                    </div>
                  </Transition>
                </div>
                <button
                  class="ui-send-button h-[4.5rem] min-w-[4.5rem] px-3 flex items-center justify-center shrink-0"
                  :disabled="gameStore.isGenerating"
                  @click="handleSendInput"
                >
                  <Send class="size-7" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Player Status HUD (Bottom Left) -->
        <div class="absolute bottom-8 left-8 z-[70] flex flex-col gap-2 select-none ui-status-hud">
          <div class="flex items-center gap-2">
            <button
              class="w-10 h-10 rounded-lg flex items-center justify-center bg-dungeon-dark/90 border border-dungeon-gold/30 text-dungeon-gold-dim hover:bg-dungeon-brown hover:text-dungeon-gold hover:border-dungeon-gold/50 transition-all duration-300 shadow-lg backdrop-blur-md"
              :title="isStatusOpen ? '折叠状态栏' : '展开状态栏'"
              @click="isStatusOpen = !isStatusOpen"
            >
              <ChevronDown class="size-5 transition-transform duration-200" :class="isStatusOpen ? '' : '-rotate-90'" />
            </button>

            <button
              class="w-10 h-10 rounded-lg flex items-center justify-center bg-dungeon-dark/90 border border-dungeon-gold/30 text-dungeon-gold-dim hover:bg-dungeon-brown hover:text-dungeon-gold hover:border-dungeon-gold/50 transition-all duration-300 shadow-lg backdrop-blur-md"
              title="打开详细状态栏"
              @click="openStatusDetailsModal()"
            >
              <FileText class="size-5" />
            </button>
          </div>

          <Transition name="status-slide">
            <div
              v-if="isStatusOpen"
              class="relative p-4 bg-dungeon-dark/90 border border-dungeon-gold/30 rounded-xl backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            >
              <!-- Decorative Elements -->
              <div class="absolute -top-1 -left-1 size-2 bg-dungeon-gold rotate-45 border border-black"></div>
              <div class="absolute -bottom-1 -right-1 size-2 bg-dungeon-gold rotate-45 border border-black"></div>
              <div
                class="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-dungeon-gold/50 to-transparent"
              ></div>

              <!-- HP & MP: Container-fill style -->
              <div class="flex items-end gap-4 mb-3">
                <!-- HP Heart Container -->
                <div class="flex flex-col items-center gap-1">
                  <div class="stat-container-heart" :title="`HP: ${displayHp}/${displayMaxHp}`">
                    <svg viewBox="0 0 64 64" class="w-14 h-14">
                      <defs>
                        <clipPath id="heartClip">
                          <path
                            d="M32 56 C32 56, 6 40, 6 22 C6 12, 14 4, 24 4 C28 4, 31 6, 32 9 C33 6, 36 4, 40 4 C50 4, 58 12, 58 22 C58 40, 32 56, 32 56Z"
                          />
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
                      <ellipse
                        cx="22"
                        cy="18"
                        rx="5"
                        ry="4"
                        fill="rgba(255,255,255,0.12)"
                        transform="rotate(-20,22,18)"
                      />
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
                      <path d="M32 4 L54 24 L32 60 L10 24 Z" fill="#080818" stroke="#1a1a5c" stroke-width="1.5" />
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
              <div
                class="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-dungeon-gold/20 to-transparent"
              ></div>

              <!-- Dice Range Row -->
              <div class="flex items-center justify-between px-1 mb-2">
                <div class="flex items-center gap-2 text-dungeon-paper/70">
                  <Dices class="size-4 text-dungeon-gold-dim drop-shadow-sm" />
                  <span class="font-ui text-sm tracking-wide">
                    <span class="text-dungeon-paper font-bold">{{ effectiveDisplayMinDice }}</span>
                    <span class="text-gray-500">~</span>
                    <span class="text-dungeon-paper font-bold">{{ effectiveDisplayMaxDice }}</span>
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

        <input
          ref="playerPortraitUploadInputRef"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          class="hidden"
          @change="handlePlayerPortraitUpload"
        />

        <!-- Modals -->
        <DungeonModal
          title="详细状态栏"
          :is-open="activeModal === 'statusDetails'"
          panel-class="max-w-6xl"
          @close="activeModal = null"
        >
          <div class="player-detail-modal">
            <div class="player-detail-portrait-panel">
              <div class="player-detail-portrait-shell">
                <img
                  v-if="playerStatusPortraitUrl && !playerStatusPortraitError"
                  :src="playerStatusPortraitUrl"
                  alt="主角立绘"
                  class="player-detail-portrait-image"
                  @error="playerStatusPortraitError = true"
                />
                <div v-else class="player-detail-portrait-fallback">{{ playerDisplayName.slice(0, 1) || '主' }}</div>
              </div>
              <div class="player-detail-nameplate">
                <div class="player-detail-name">{{ playerDisplayName }}</div>
                <div class="player-detail-subtitle">详细状态记录</div>
              </div>
              <div class="player-detail-upload-actions">
                <button type="button" class="player-detail-upload-btn" @click="openPlayerPortraitUploadDialog">
                  <Upload class="size-4" />
                  上传自定义立绘
                </button>
                <button
                  type="button"
                  class="player-detail-upload-btn player-detail-upload-btn--ghost"
                  :disabled="!playerCustomPortraitUrl"
                  @click="resetCustomPlayerPortrait"
                >
                  <RotateCcw class="size-4" />
                  恢复默认立绘
                </button>
              </div>
              <div class="player-detail-upload-hint">请上传无背景、扣过图的纯立绘。</div>
            </div>

            <div class="player-detail-data-panel custom-scrollbar">
              <div class="player-detail-tabbar">
                <button
                  type="button"
                  class="player-detail-tab"
                  :class="{ 'player-detail-tab--active': playerDetailTab === 'status' }"
                  @click="playerDetailTab = 'status'"
                >
                  状态
                </button>
                <button
                  type="button"
                  class="player-detail-tab"
                  :class="{ 'player-detail-tab--active': playerDetailTab === 'inventory' }"
                  @click="playerDetailTab = 'inventory'"
                >
                  背包
                </button>
              </div>

              <template v-if="playerDetailTab === 'status'">
                <section class="player-detail-section">
                  <div class="player-detail-section-title">基础数值</div>
                  <div class="player-detail-stat-grid">
                    <div class="player-detail-stat-card">
                      <span class="player-detail-stat-label">生命值</span>
                      <span class="player-detail-stat-value player-detail-stat-value--hp"
                        >{{ displayHp }}/{{ displayMaxHp }}</span
                      >
                    </div>
                    <div class="player-detail-stat-card">
                      <span class="player-detail-stat-label">魔量</span>
                      <span class="player-detail-stat-value player-detail-stat-value--mp">{{ displayMp }}</span>
                    </div>
                    <div class="player-detail-stat-card">
                      <span class="player-detail-stat-label">金币</span>
                      <span class="player-detail-stat-value player-detail-stat-value--gold">{{ displayGold }}</span>
                    </div>
                    <div class="player-detail-stat-card">
                      <span class="player-detail-stat-label">骰子范围</span>
                      <span class="player-detail-stat-value"
                        >{{ effectiveDisplayMinDice }} ~ {{ effectiveDisplayMaxDice }}</span
                      >
                    </div>
                  </div>
                </section>

                <section class="player-detail-section">
                  <div class="player-detail-section-head">
                    <div class="player-detail-section-title">负面状态</div>
                    <div class="player-detail-section-meta">{{ negativeStatusEntries.length }} 项</div>
                  </div>
                  <div v-if="negativeStatusEntries.length === 0" class="player-detail-empty">当前没有负面状态。</div>
                  <div v-else class="player-detail-negative-list">
                    <div
                      v-for="entry in negativeStatusEntries"
                      :key="`detail-negative-${entry.name}`"
                      class="player-detail-negative-item"
                    >
                      <div class="player-detail-negative-name">{{ entry.name }}</div>
                      <div class="player-detail-negative-desc">{{ entry.description }}</div>
                    </div>
                  </div>
                </section>

                <section class="player-detail-section">
                  <div class="player-detail-section-title">主角信息</div>
                  <div class="player-detail-info-grid">
                    <div
                      v-for="entry in playerInfoEntries"
                      :key="`player-info-${entry.label}`"
                      class="player-detail-info-item"
                      :class="{ 'player-detail-info-item--multiline': entry.multiline }"
                    >
                      <div class="player-detail-info-label">{{ entry.label }}</div>
                      <div
                        class="player-detail-info-value"
                        :class="{ 'player-detail-info-value--multiline': entry.multiline }"
                      >
                        {{ entry.value }}
                      </div>
                    </div>
                  </div>
                </section>
              </template>

              <template v-else>
                <section class="player-detail-section">
                  <div class="player-detail-section-head">
                    <div class="player-detail-section-title">背包</div>
                    <div class="player-detail-section-meta">共 {{ totalInventoryEntryCount }} 项</div>
                  </div>

                  <div class="player-detail-subtabbar">
                    <button
                      type="button"
                      class="player-detail-subtab"
                      :class="{ 'player-detail-subtab--active': playerDetailInventoryTab === 'items' }"
                      @click="playerDetailInventoryTab = 'items'"
                    >
                      物品（{{ inventoryItems.length }}）
                    </button>
                    <button
                      type="button"
                      class="player-detail-subtab"
                      :class="{ 'player-detail-subtab--active': playerDetailInventoryTab === 'relics' }"
                      @click="playerDetailInventoryTab = 'relics'"
                    >
                      圣遗物（{{ relicEntries.length }}）
                    </button>
                    <button
                      type="button"
                      class="player-detail-subtab"
                      :class="{ 'player-detail-subtab--active': playerDetailInventoryTab === 'consumables' }"
                      @click="playerDetailInventoryTab = 'consumables'"
                    >
                      消耗品（{{ inventoryConsumables.length }}）
                    </button>
                  </div>

                  <template v-if="playerDetailInventoryTab === 'items'">
                    <div v-if="inventoryItems.length === 0" class="player-detail-empty">当前没有携带任何物品。</div>
                    <div v-else class="player-detail-bag-list">
                      <article
                        v-for="(item, index) in inventoryItems"
                        :key="`inventory-item-${item.名字}-${index}`"
                        class="player-detail-bag-card"
                      >
                        <div class="player-detail-bag-copy">
                          <div class="player-detail-bag-name">{{ item.名字 }}</div>
                          <div class="player-detail-bag-desc">{{ item.描述 || '暂无描述。' }}</div>
                        </div>
                        <div class="player-detail-bag-actions">
                          <button
                            type="button"
                            class="player-detail-bag-btn player-detail-bag-btn--danger"
                            :disabled="inventoryActionDisabled"
                            @click="discardInventoryItem(index)"
                          >
                            丢弃
                          </button>
                        </div>
                      </article>
                    </div>
                  </template>

                  <template v-else-if="playerDetailInventoryTab === 'relics'">
                    <div
                      v-if="relicEntries.length > 0"
                      class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-6 gap-y-6 mt-4"
                    >
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
                          <span
                            class="absolute -bottom-1 -right-3 font-ui text-dungeon-gold/80 text-[10px] bg-dungeon-dark/70 border border-dungeon-brown/30 rounded px-0.5 leading-tight"
                            >x{{ relic.count }}</span
                          >
                        </div>
                        <span
                          class="font-heading text-dungeon-gold text-[11px] text-center mt-1 leading-relaxed truncate w-full"
                          >{{ relic.name }}</span
                        >
                      </button>
                    </div>
                    <div v-else class="player-detail-empty">尚未获得圣遗物。</div>
                  </template>

                  <template v-else>
                    <div v-if="inventoryConsumables.length === 0" class="player-detail-empty">
                      当前没有携带任何消耗品。
                    </div>
                    <div v-else class="player-detail-bag-list">
                      <article
                        v-for="(consumable, index) in inventoryConsumables"
                        :key="`inventory-consumable-${consumable.名字}-${index}`"
                        class="player-detail-bag-card player-detail-bag-card--consumable"
                      >
                        <div class="player-detail-bag-copy">
                          <div class="player-detail-bag-head">
                            <div class="player-detail-bag-name">{{ consumable.名字 }}</div>
                            <div class="player-detail-bag-tags">
                              <span v-if="consumable.回复 !== 0" class="player-detail-bag-tag player-detail-bag-tag--heal">
                                回复 {{ formatSignedNumber(consumable.回复) }}
                              </span>
                            </div>
                          </div>
                          <div class="player-detail-bag-desc">{{ consumable.描述 || '暂无描述。' }}</div>
                        </div>
                        <div class="player-detail-bag-actions">
                          <button
                            type="button"
                            class="player-detail-bag-btn"
                            :disabled="inventoryActionDisabled"
                            @click="useConsumable(index)"
                          >
                            使用
                          </button>
                          <button
                            type="button"
                            class="player-detail-bag-btn player-detail-bag-btn--danger"
                            :disabled="inventoryActionDisabled"
                            @click="discardConsumable(index)"
                          >
                            丢弃
                          </button>
                        </div>
                      </article>
                    </div>
                  </template>
                </section>
              </template>
            </div>
          </div>
        </DungeonModal>

        <DungeonModal
          title="地牢地图"
          :is-open="activeModal === 'map'"
          panel-class="max-w-5xl"
          @close="activeModal = null"
        >
          <div class="map-modal">
            <section class="map-hero">
              <div class="map-hero__copy">
                <div class="map-hero__eyebrow">Cartography Archive</div>
                <div class="map-hero__title">地牢地图</div>
                <div class="map-hero__desc">
                  记录本层推进顺序。拖拽平移、滚轮缩放，最新抵达的房间会以高亮标记。
                </div>
              </div>
              <div class="map-hero__chips">
                <div class="map-hero__chip">
                  <span class="map-hero__chip-label">已走房间</span>
                  <span class="map-hero__chip-value">{{ currentFloorPath.length }}</span>
                </div>
                <div class="map-hero__chip">
                  <span class="map-hero__chip-label">当前房型</span>
                  <span class="map-hero__chip-value">{{ mapCurrentRoomLabel }}</span>
                </div>
                <div class="map-hero__chip">
                  <span class="map-hero__chip-label">缩放比例</span>
                  <span class="map-hero__chip-value">{{ mapZoomPercent }}</span>
                </div>
              </div>
            </section>
            <div class="map-toolbar">
              <div class="map-summary">
                <span>本层路径：<span class="map-summary-highlight">{{ currentFloorPath.length }}</span> 房</span>
                <span class="map-summary-divider">|</span>
                <span>统计计数：<span class="map-summary-highlight">{{ currentLayerRoomCount }}</span> 房</span>
                <span class="map-summary-divider">|</span>
                <span>操作提示：拖拽查看细节</span>
              </div>
              <div class="map-controls">
                <button type="button" class="map-control-btn" @click="handleMapZoomOut">-</button>
                <button type="button" class="map-control-btn" @click="handleMapZoomIn">+</button>
                <button type="button" class="map-control-btn map-control-btn--wide" @click="handleMapResetView">
                  重置视图
                </button>
              </div>
            </div>
            <div v-if="currentFloorPath.length === 0" class="map-empty">本层暂无路径记录</div>
            <div
              v-else
              ref="mapViewportRef"
              class="map-viewport"
              @wheel.prevent="handleMapWheel"
              @pointerdown="handleMapPointerDown"
              @pointermove="handleMapPointerMove"
              @pointerup="handleMapPointerUp"
              @pointercancel="handleMapPointerUp"
            >
              <div class="map-canvas" :style="mapCanvasStyle">
                <svg
                  class="map-links"
                  :width="mapContentWidth"
                  :height="mapContentHeight"
                  :viewBox="`0 0 ${mapContentWidth} ${mapContentHeight}`"
                >
                  <line
                    v-for="line in mapPathLines"
                    :key="line.key"
                    :x1="line.x1"
                    :y1="line.y1"
                    :x2="line.x2"
                    :y2="line.y2"
                    stroke="rgba(0,0,0,0.9)"
                    stroke-width="4"
                    stroke-linecap="round"
                  />
                </svg>
                <div
                  v-for="node in mapPathNodes"
                  :key="`path-node-${node.index}`"
                  class="map-room-cell"
                  :class="{ 'map-room-cell--latest': node.isLatest }"
                  :style="node.style"
                >
                  <span v-if="node.isLatest" class="map-room-pulse"></span>
                  <span class="map-room-icon">{{ node.icon }}</span>
                  <span class="map-room-label">{{ node.label }}</span>
                  <span class="map-room-step">{{ node.index + 1 }}</span>
                </div>
              </div>
            </div>
          </div>
        </DungeonModal>

        <DungeonModal
          title="羁绊"
          :is-open="activeModal === 'bonds'"
          panel-class="max-w-4xl"
          @close="activeModal = null"
        >
          <div v-if="bondEntries.length > 0" class="bond-list custom-scrollbar max-h-[64vh] overflow-y-auto pr-1">
            <div v-for="entry in bondEntries" :key="`bond-${entry.name}`" class="bond-row">
              <button
                type="button"
                class="bond-portrait-frame bond-portrait-frame--clickable"
                @click="openBondPortraitPreview(entry)"
              >
                <img
                  v-if="!bondPortraitErrors[entry.name]"
                  :src="entry.portraitUrl"
                  :alt="`${entry.name} 立绘`"
                  class="bond-portrait-image"
                  loading="lazy"
                  @error="handleBondPortraitError(entry.name)"
                />
                <div v-else class="bond-portrait-fallback">{{ entry.name.slice(0, 1) }}</div>
              </button>
              <div class="bond-affection-wrap">
                <div class="bond-affection-head">
                  <span class="bond-role-name">{{ entry.name }}</span>
                  <span
                    class="bond-affection-value"
                    :class="entry.affection >= 0 ? 'bond-affection-value--positive' : 'bond-affection-value--negative'"
                    >{{ formatBondAffection(entry.affection) }} / 200</span
                  >
                </div>
                <div class="bond-affection-track">
                  <div
                    class="bond-affection-fill"
                    :class="entry.affection >= 0 ? 'bond-affection-fill--positive' : 'bond-affection-fill--negative'"
                    :style="{ width: `${Math.round(entry.affectionAbsRatio * 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center gap-3 py-12">
            <Users class="size-12 text-dungeon-gold/20" />
            <span class="font-ui text-sm text-dungeon-paper/50">暂无可显示的羁绊角色</span>
          </div>
        </DungeonModal>
        <Teleport to="body">
          <Transition name="combat-fade">
            <div
              v-if="bondPortraitPreview"
              class="fixed inset-0 z-[230] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
              @click="closeBondPortraitPreview"
            >
              <div class="bond-preview-panel" @click.stop>
                <img
                  :src="bondPortraitPreview.url"
                  :alt="`${bondPortraitPreview.name} 立绘大图`"
                  class="bond-preview-image"
                />
                <div class="bond-preview-footer">
                  <span class="bond-preview-name">{{ bondPortraitPreview.name }}</span>
                  <button type="button" class="bond-preview-close-btn" @click="closeBondPortraitPreview">关闭</button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <DungeonModal title="符文卡组" :is-open="activeModal === 'deck'" @close="activeModal = null">
          <div v-if="resolvedDeck.length > 0" class="grid grid-cols-3 gap-8 overflow-y-auto max-h-[60%] p-4">
            <div
              v-for="(card, i) in resolvedDeck"
              :key="i"
              class="hover:scale-105 transition-transform flex justify-center"
            >
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
          <div class="magic-books-layout">
            <section class="magic-books-hero">
              <div class="magic-books-hero__copy">
                <div class="magic-books-hero__eyebrow">Arcane Library</div>
                <div class="magic-books-hero__title">魔法书藏馆</div>
                <div class="magic-books-hero__desc">
                  这里管理附加魔法书与开局主动技能。附加书影响卡池结构，主动槽决定你每场战斗的起手工具。
                </div>
              </div>
              <div class="magic-books-hero__chips">
                <div class="magic-books-hero__chip">
                  <span class="magic-books-hero__chip-label">已携带魔法书</span>
                  <span class="magic-books-hero__chip-value">{{ magicBookCarryCount }}</span>
                </div>
                <div class="magic-books-hero__chip">
                  <span class="magic-books-hero__chip-label">可选书库</span>
                  <span class="magic-books-hero__chip-value">{{ carryableMagicBookNames.length }}</span>
                </div>
                <div class="magic-books-hero__chip">
                  <span class="magic-books-hero__chip-label">已装主动槽</span>
                  <span class="magic-books-hero__chip-value">{{ startingActiveEquippedCount }}/2</span>
                </div>
              </div>
            </section>

            <div class="magic-books-tabs">
              <button
                type="button"
                class="magic-books-tab"
                :class="
                  magicBooksNavTab === 'books'
                    ? 'is-active'
                    : ''
                "
                @click="magicBooksNavTab = 'books'"
              >
                附加魔法书
              </button>
              <button
                type="button"
                class="magic-books-tab"
                :class="
                  magicBooksNavTab === 'active'
                    ? 'is-active'
                    : ''
                "
                @click="magicBooksNavTab = 'active'"
              >
                主动
              </button>
            </div>

            <template v-if="magicBooksNavTab === 'books'">
              <div
                v-if="carryableMagicBookNames.length > 0"
                class="magic-books-grid custom-scrollbar"
              >
                <button
                  v-for="bookName in carryableMagicBookNames"
                  :key="`magic-book-${bookName}`"
                  type="button"
                  class="magic-book-card"
                  :class="{ 'is-equipped': carriedMagicBookSet.has(bookName) }"
                  :disabled="isUpdatingMagicBooks"
                  @click="toggleMagicBook(bookName)"
                >
                  <div
                    class="magic-book-card__cover"
                    :class="carriedMagicBookSet.has(bookName) ? 'border-dungeon-gold/60' : 'border-dungeon-brown/60'"
                  >
                    <img
                      :src="getMagicBookCoverUrl(bookName)"
                      :alt="`${bookName} 魔法书封面`"
                      class="magic-book-card__image"
                      :class="
                        carriedMagicBookSet.has(bookName) ? 'brightness-100 saturate-110' : 'brightness-50 saturate-60'
                      "
                      loading="lazy"
                    />
                    <div class="magic-book-card__shade"></div>
                    <div class="magic-book-card__header">
                      <span class="magic-book-card__badge">
                        {{ carriedMagicBookSet.has(bookName) ? '已携带' : '待装配' }}
                      </span>
                    </div>
                    <div class="magic-book-card__title-wrap">
                      <div class="magic-book-title text-center truncate text-[22px]">{{ bookName }}之书</div>
                    </div>
                  </div>
                  <div class="magic-book-card__footer">
                    <span class="magic-book-card__footer-title">{{ bookName }}</span>
                    <span class="magic-book-card__footer-action">
                      {{ carriedMagicBookSet.has(bookName) ? '点击卸下' : '点击携带' }}
                    </span>
                  </div>
                </button>
              </div>
              <div
                v-else
                class="magic-books-empty"
              >
                当前没有可选的附加魔法书。
              </div>
            </template>

            <template v-else>
              <div class="magic-books-active-panel">
                <div class="magic-books-active-panel__head">
                  <div>
                    <div class="magic-books-active-panel__title">起始主动槽</div>
                    <div class="magic-books-active-panel__desc">
                      先选中要编辑的槽位，再从下方技能库中指定一张开局主动技能。
                    </div>
                  </div>
                  <div class="magic-books-active-panel__badge">当前编辑槽位：{{ selectedStartingActiveSlot + 1 }}</div>
                </div>
                <div class="magic-books-slot-grid">
                  <button
                    v-for="entry in startingActiveSkillEntries"
                    :key="`starting-active-slot-${entry.idx}`"
                    type="button"
                    class="magic-books-slot-card"
                    :class="
                      selectedStartingActiveSlot === entry.idx
                        ? 'is-selected'
                        : ''
                    "
                    :disabled="isUpdatingStartingActiveSkills"
                    @click="selectedStartingActiveSlot = entry.idx"
                  >
                    <div
                      v-if="entry.skill"
                      class="magic-books-slot-card__top"
                    >
                      <div class="magic-books-slot-card__mana">
                        {{ entry.skill.manaCost }}
                      </div>
                      <div class="magic-books-slot-card__tag">主动</div>
                    </div>
                    <div class="magic-books-slot-card__art">
                      <div class="magic-books-slot-card__art-glow"></div>
                      <span class="magic-books-slot-card__art-letter">{{ entry.skill?.name?.[0] ?? '槽' }}</span>
                    </div>
                    <div class="magic-books-slot-card__body">
                      <div class="magic-books-slot-card__name">
                        {{ entry.skill?.name ?? `主动槽位 ${entry.idx + 1}` }}
                      </div>
                      <div class="magic-books-slot-card__desc">
                        {{ entry.skill?.description ?? '空主动槽位，点击下方技能卡可装备到此槽位。' }}
                      </div>
                      <div class="magic-books-slot-card__state">
                        {{ selectedStartingActiveSlot === entry.idx ? '当前编辑中' : `槽位 ${entry.idx + 1}` }}
                      </div>
                    </div>
                  </button>
                </div>
                <div class="magic-books-active-panel__actions">
                  <button
                    type="button"
                    class="magic-books-clear-btn"
                    :disabled="isUpdatingStartingActiveSkills"
                    @click="clearStartingActiveSkill(selectedStartingActiveSlot)"
                  >
                    清空当前槽位
                  </button>
                </div>
              </div>

              <div class="magic-books-skill-grid custom-scrollbar">
                <button
                  v-for="skill in startingActiveSkillOptions"
                  :key="`starting-active-skill-${skill.id}`"
                  type="button"
                  class="magic-books-skill-card"
                  :class="[
                    skill.rarity === '稀有' ? 'rare-active-skill-card' : '',
                    { 'is-equipped': isSkillEquippedInStartingActive(skill.name) },
                  ]"
                  :disabled="isUpdatingStartingActiveSkills"
                  @click="setStartingActiveSkill(skill)"
                >
                  <div class="magic-books-skill-card__top">
                    <div class="magic-books-skill-card__mana">
                      {{ skill.manaCost }}
                    </div>
                    <div class="magic-books-skill-card__tag">主动</div>
                  </div>
                  <div class="magic-books-skill-card__art">
                    <div class="magic-books-skill-card__art-glow"></div>
                    <span class="magic-books-skill-card__art-letter">{{ skill.name[0] }}</span>
                  </div>
                  <div class="magic-books-skill-card__body">
                    <div class="magic-books-skill-card__name">
                      {{ skill.name }}
                    </div>
                    <div class="magic-books-skill-card__desc">
                      {{ skill.description }}
                    </div>
                    <div class="magic-books-skill-card__meta">
                      <span>CD {{ skill.Cooldown }}</span>
                      <span :class="isSkillEquippedInStartingActive(skill.name) ? 'text-dungeon-gold' : 'text-white/55'">
                        {{ isSkillEquippedInStartingActive(skill.name) ? '已装备' : '点击装备' }}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </template>
          </div>
        </DungeonModal>

        <DungeonModal
          title="魔法帽"
          :is-open="activeModal === 'magicHat'"
          panel-class="max-w-3xl"
          @close="activeModal = null"
        >
          <div class="magic-hat-layout">
            <section class="magic-hat-hero">
              <div class="magic-hat-hero__mesh"></div>
              <div class="magic-hat-hero__content">
                <div class="magic-hat-hero__copy">
                  <div class="magic-hat-hero__eyebrow">Arcane Atelier</div>
                  <div class="magic-hat-hero__title">魔法帽工坊</div>
                  <div class="magic-hat-hero__desc">
                    在这里校准开局资源与试炼强度。困难及以上难度会让领主随回合逐渐变强。
                  </div>
                </div>
                <div class="magic-hat-hero__chips">
                  <div class="magic-hat-hero__chip">
                    <span class="magic-hat-hero__chip-label">当前难度</span>
                    <span class="magic-hat-hero__chip-value">{{ magicHatDifficulty }}</span>
                  </div>
                  <div class="magic-hat-hero__chip">
                    <span class="magic-hat-hero__chip-label">楼层参照</span>
                    <span class="magic-hat-hero__chip-value">{{ magicHatDifficultyFloor }} 层</span>
                  </div>
                  <div class="magic-hat-hero__chip">
                    <span class="magic-hat-hero__chip-label">可用技能点</span>
                    <span class="magic-hat-hero__chip-value">{{ magicHatSkillPoints }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="magic-hat-section">
              <div class="magic-hat-section__head">
                <div>
                  <div class="magic-hat-section__title">难度调节</div>
                  <div class="magic-hat-section__subtitle">
                    仅影响局内战斗，不会改动你已经购买或升级过的成长项。
                  </div>
                </div>
                <span class="magic-hat-section__badge">自定义暂未开放</span>
              </div>

              <div class="magic-hat-difficulty-layout">
                <div class="magic-hat-difficulty-grid">
                  <button
                    v-for="option in magicHatDifficultyOptions"
                    :key="`magic-hat-difficulty-${option.value}`"
                    type="button"
                    class="magic-hat-difficulty-card"
                    :class="[
                      getMagicHatDifficultyClass(option.value),
                      {
                        'is-active': magicHatDifficulty === option.value,
                        'is-locked': option.locked,
                        'is-wide': option.value === '自定义',
                      },
                    ]"
                    :disabled="isUpdatingMagicHatDifficulty || option.locked"
                    @click="setMagicHatDifficulty(option.value)"
                  >
                    <div class="magic-hat-difficulty-card__head">
                      <span class="magic-hat-difficulty-card__name">{{ option.label }}</span>
                      <span class="magic-hat-difficulty-card__state">
                        {{ option.locked ? '锁定' : magicHatDifficulty === option.value ? '已启用' : '可切换' }}
                      </span>
                    </div>
                    <div class="magic-hat-difficulty-card__desc">
                      {{ getMagicHatDifficultyBlurb(option.value) }}
                    </div>
                    <div class="magic-hat-difficulty-card__footer">
                      <span class="magic-hat-difficulty-card__footer-text">
                        {{ option.locked ? '功能预留中' : '切换后下场战斗立即生效' }}
                      </span>
                    </div>
                  </button>
                </div>

                <div class="magic-hat-preview">
                  <div class="magic-hat-preview__label">当前效果预览</div>
                  <div class="magic-hat-preview__difficulty">{{ magicHatDifficulty }}</div>
                  <div class="magic-hat-preview__list">
                    <div
                      v-for="line in magicHatDifficultyPreviewLines"
                      :key="`magic-hat-difficulty-line-${line}`"
                      class="magic-hat-preview__item"
                    >
                      {{ line }}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="magic-hat-section">
              <div class="magic-hat-section__head magic-hat-section__head--compact">
                <div>
                  <div class="magic-hat-section__title">起始增幅</div>
                  <div class="magic-hat-section__subtitle">
                    这部分决定你每次开局的底子，技能点会永久消耗。
                  </div>
                </div>
                <div class="magic-hat-points-card">
                  <span class="magic-hat-points-card__label">技能点存量</span>
                  <span class="magic-hat-points-card__value">{{ magicHatSkillPoints }}</span>
                </div>
              </div>

              <div class="magic-hat-track-grid">
                <article
                  v-for="track in magicHatTracks"
                  :key="`magic-hat-${track.id}`"
                  class="magic-hat-track-card"
                  :class="getMagicHatTrackClass(track.id)"
                >
                  <div class="magic-hat-track-card__top">
                    <div>
                      <div class="magic-hat-track-card__kicker">{{ getMagicHatTrackKicker(track.id) }}</div>
                      <div class="magic-hat-track-card__title">{{ track.label }}</div>
                    </div>
                    <div class="magic-hat-track-card__rune">{{ getMagicHatTrackRune(track.id) }}</div>
                  </div>

                  <div class="magic-hat-track-card__stats">
                    <div class="magic-hat-track-card__stat">
                      <span class="magic-hat-track-card__stat-label">当前值</span>
                      <span class="magic-hat-track-card__stat-value">{{ track.currentValue }}</span>
                    </div>
                    <div class="magic-hat-track-card__stat">
                      <span class="magic-hat-track-card__stat-label">等级</span>
                      <span class="magic-hat-track-card__stat-value">{{ track.currentLevel }}/{{ track.maxLevel }}</span>
                    </div>
                  </div>

                  <div class="magic-hat-track-card__bar">
                    <div
                      class="magic-hat-track-card__bar-fill"
                      :class="track.barClass"
                      :style="{ width: `${track.progressPercent}%` }"
                    ></div>
                  </div>

                  <div class="magic-hat-track-card__hint">
                    {{ track.isMax ? '已达到可升级上限' : `下一级提升至 ${track.nextValue}` }}
                  </div>

                  <button
                    type="button"
                    class="magic-hat-track-card__action"
                    :class="{ 'is-disabled': track.isMax }"
                    :disabled="isUpgradingMagicHat || track.isMax"
                    @click="upgradeMagicHatStat(track.id)"
                  >
                    <span class="magic-hat-track-card__action-label">{{ track.isMax ? '已满级' : '立即升级' }}</span>
                    <span class="magic-hat-track-card__action-cost">
                      {{ track.isMax ? '该项已封顶' : `消耗 ${track.nextCost} 技能点` }}
                    </span>
                  </button>
                </article>
              </div>
            </section>
          </div>
        </DungeonModal>

        <Teleport to="body">
          <div
            v-if="relicTooltip"
            class="fixed z-[220] pointer-events-none relic-tooltip"
            :style="{ left: `${relicTooltip.x}px`, top: `${relicTooltip.y}px` }"
          >
            <div class="relic-tooltip-name">{{ relicTooltip.name }}</div>
            <div class="relic-tooltip-desc">{{ relicTooltip.description }}</div>
          </div>
        </Teleport>

        <!-- Settings Modal -->
        <DungeonModal
          title="系统设置"
          :is-open="activeModal === 'settings'"
          @close="
            activeModal = null;
            closeSettingsHelp();
          "
        >
          <div class="settings-panel flex flex-col space-y-5 w-full max-w-2xl mx-auto">
            <div class="settings-nav">
              <button
                type="button"
                class="settings-nav-btn"
                :class="{ 'is-active': settingsNavTab === 'text' }"
                @click="settingsNavTab = 'text'"
              >
                正文框设置
              </button>
              <button
                type="button"
                class="settings-nav-btn"
                :class="{ 'is-active': settingsNavTab === 'music' }"
                @click="settingsNavTab = 'music'"
              >
                背景音乐
              </button>
              <button
                type="button"
                class="settings-nav-btn"
                :class="{ 'is-active': settingsNavTab === 'ai' }"
                @click="settingsNavTab = 'ai'"
              >
                AI回复
              </button>
              <button
                type="button"
                class="settings-nav-btn"
                :class="{ 'is-active': settingsNavTab === 'summary' }"
                @click="settingsNavTab = 'summary'"
              >
                总结
              </button>
            </div>
            <section v-if="settingsNavTab === 'text'" class="settings-section settings-section--text">
              <h3 class="settings-section-title">正文框设置</h3>
              <div class="space-y-4">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">字体大小</label>
                  <div class="flex items-center gap-2 sm:shrink-0">
                    <button
                      class="settings-stepper-btn"
                      @click="textSettings.fontSize = Math.max(12, textSettings.fontSize - 1)"
                    >
                      −
                    </button>
                    <span class="text-dungeon-paper font-ui text-sm w-12 text-center"
                      >{{ textSettings.fontSize }}px</span
                    >
                    <button
                      class="settings-stepper-btn"
                      @click="textSettings.fontSize = Math.min(40, textSettings.fontSize + 1)"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">行间距</label>
                  <div class="flex items-center gap-2 sm:shrink-0">
                    <button
                      class="settings-stepper-btn"
                      @click="textSettings.lineHeight = Math.max(1.2, +(textSettings.lineHeight - 0.1).toFixed(1))"
                    >
                      −
                    </button>
                    <span class="text-dungeon-paper font-ui text-sm w-12 text-center">{{
                      textSettings.lineHeight
                    }}</span>
                    <button
                      class="settings-stepper-btn"
                      @click="textSettings.lineHeight = Math.min(3.0, +(textSettings.lineHeight + 0.1).toFixed(1))"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">字体样式</label>
                  <select
                    v-model="textSettings.fontFamily"
                    class="settings-select bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper text-sm px-3 py-1.5 rounded focus:outline-none focus:border-dungeon-gold font-ui sm:min-w-[14rem]"
                  >
                    <option value="'Cinzel', serif">Cinzel (默认)</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'MedievalSharp', cursive">MedievalSharp</option>
                    <option value="'MaShanZheng', 'KaiTi', serif">马善政体</option>
                    <option value="'MagicBookTitle', 'KaiTi', serif">江湖琅琶体</option>
                    <option value="serif">Serif</option>
                    <option value="sans-serif">Sans-serif</option>
                    <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
                    <option value="'SimSun', serif">宋体</option>
                    <option value="'KaiTi', serif">楷体</option>
                  </select>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">正文框宽度</label>
                  <div class="flex items-center gap-2 sm:shrink-0">
                    <input
                      v-model.number="textSettings.containerWidth"
                      type="range"
                      min="600"
                      max="1600"
                      step="50"
                      class="w-32 accent-dungeon-gold"
                    />
                    <span class="text-dungeon-paper font-ui text-sm w-16 text-center"
                      >{{ textSettings.containerWidth }}px</span
                    >
                  </div>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">背景清晰度</label>
                  <div class="flex items-center gap-2 sm:shrink-0">
                    <input
                      v-model.number="bgOverlayOpacity"
                      type="range"
                      min="0"
                      max="0.8"
                      step="0.05"
                      class="w-32 accent-dungeon-gold"
                    />
                    <span class="text-dungeon-paper font-ui text-sm w-16 text-center"
                      >{{ Math.round((1 - bgOverlayOpacity) * 100) }}%</span
                    >
                  </div>
                </div>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">自动回顶</label>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isAutoScrollTopOnReplyEnabled }"
                    :aria-checked="isAutoScrollTopOnReplyEnabled"
                    role="switch"
                    @click="isAutoScrollTopOnReplyEnabled = !isAutoScrollTopOnReplyEnabled"
                  >
                    <span class="settings-switch-track">
                      <span class="settings-switch-label settings-switch-label--off">关</span>
                      <span class="settings-switch-label settings-switch-label--on">开</span>
                      <span class="settings-switch-thumb"></span>
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section v-else-if="settingsNavTab === 'music'" class="settings-section settings-section--music">
              <h3 class="settings-section-title">背景音乐</h3>
              <div class="space-y-4">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">背景音乐</label>
                  <select
                    v-model="selectedBgmTrackId"
                    :disabled="bgmTracks.length === 0"
                    class="settings-select bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper text-sm px-3 py-1.5 rounded focus:outline-none focus:border-dungeon-gold font-ui disabled:opacity-50 disabled:cursor-not-allowed sm:min-w-[14rem]"
                  >
                    <option v-if="bgmTracks.length === 0" value="">暂无可用曲目</option>
                    <option v-for="track in bgmTracks" :key="track.id" :value="track.id">
                      {{ track.name }}
                    </option>
                  </select>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">背景音乐音量</label>
                  <div class="flex items-center gap-2 sm:shrink-0">
                    <input
                      v-model.number="bgmVolumePercent"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      class="w-32 accent-dungeon-gold"
                    />
                    <span class="text-dungeon-paper font-ui text-sm w-16 text-center">{{ bgmVolumePercent }}%</span>
                  </div>
                </div>
              </div>
            </section>

            <section v-else-if="settingsNavTab === 'ai'" class="settings-section settings-section--ai">
              <h3 class="settings-section-title">AI回复</h3>
              <div class="space-y-4">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">启用流式传输</label>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isStreamingEnabled }"
                    :aria-checked="isStreamingEnabled"
                    role="switch"
                    @click="isStreamingEnabled = !isStreamingEnabled"
                  >
                    <span class="settings-switch-track">
                      <span class="settings-switch-label settings-switch-label--off">关</span>
                      <span class="settings-switch-label settings-switch-label--on">开</span>
                      <span class="settings-switch-thumb"></span>
                    </span>
                  </button>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">禁止匹配思维链内XML标签</label>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isForbidMatchingXmlInsideThinkEnabled }"
                    :aria-checked="isForbidMatchingXmlInsideThinkEnabled"
                    role="switch"
                    @click="isForbidMatchingXmlInsideThinkEnabled = !isForbidMatchingXmlInsideThinkEnabled"
                  >
                    <span class="settings-switch-track">
                      <span class="settings-switch-label settings-switch-label--off">关</span>
                      <span class="settings-switch-label settings-switch-label--on">开</span>
                      <span class="settings-switch-thumb"></span>
                    </span>
                  </button>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-dungeon-paper/70 text-sm font-ui">按钮补全</label>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isButtonCompletionEnabled }"
                    :aria-checked="isButtonCompletionEnabled"
                    role="switch"
                    @click="isButtonCompletionEnabled = !isButtonCompletionEnabled"
                  >
                    <span class="settings-switch-track">
                      <span class="settings-switch-label settings-switch-label--off">关</span>
                      <span class="settings-switch-label settings-switch-label--on">开</span>
                      <span class="settings-switch-thumb"></span>
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section v-else class="settings-section settings-section--summary">
              <h3 class="settings-section-title">总结</h3>
              <div class="space-y-4">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>自动总结</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('autoSummaryEnabled')"
                      @mouseleave="closeSettingsHelp('autoSummaryEnabled')"
                      @focus="openSettingsHelp('autoSummaryEnabled')"
                      @blur="closeSettingsHelp('autoSummaryEnabled')"
                      @touchstart.passive="startSettingsHelpTouch('autoSummaryEnabled')"
                      @touchend="endSettingsHelpTouch('autoSummaryEnabled')"
                      @touchcancel="endSettingsHelpTouch('autoSummaryEnabled')"
                      @click.stop.prevent="toggleSettingsHelp('autoSummaryEnabled')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'autoSummaryEnabled'" class="settings-help-popover">
                        {{ settingsHelpText.autoSummaryEnabled }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isAutoSummaryEnabled }"
                    :aria-checked="isAutoSummaryEnabled"
                    role="switch"
                    @click="isAutoSummaryEnabled = !isAutoSummaryEnabled"
                  >
                    <span class="settings-switch-track">
                      <span class="settings-switch-label settings-switch-label--off">关</span>
                      <span class="settings-switch-label settings-switch-label--on">开</span>
                      <span class="settings-switch-thumb"></span>
                    </span>
                  </button>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>总结层数</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('summaryVisibleWindow')"
                      @mouseleave="closeSettingsHelp('summaryVisibleWindow')"
                      @focus="openSettingsHelp('summaryVisibleWindow')"
                      @blur="closeSettingsHelp('summaryVisibleWindow')"
                      @touchstart.passive="startSettingsHelpTouch('summaryVisibleWindow')"
                      @touchend="endSettingsHelpTouch('summaryVisibleWindow')"
                      @touchcancel="endSettingsHelpTouch('summaryVisibleWindow')"
                      @click.stop.prevent="toggleSettingsHelp('summaryVisibleWindow')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'summaryVisibleWindow'" class="settings-help-popover">
                        {{ settingsHelpText.summaryVisibleWindow }}
                      </div>
                    </Transition>
                  </div>
                  <div class="flex items-center gap-2 sm:shrink-0">
                    <input
                      v-model.lazy.number="summaryVisibleWindowValue"
                      type="number"
                      min="1"
                      max="60"
                      inputmode="numeric"
                      :disabled="!isAutoSummaryEnabled"
                      class="w-20 bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper text-sm px-3 py-1.5 rounded focus:outline-none focus:border-dungeon-gold font-ui disabled:opacity-45 disabled:cursor-not-allowed"
                    />
                    <span class="text-dungeon-paper font-ui text-sm">层</span>
                  </div>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>总结按钮</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('manualSummary')"
                      @mouseleave="closeSettingsHelp('manualSummary')"
                      @focus="openSettingsHelp('manualSummary')"
                      @blur="closeSettingsHelp('manualSummary')"
                      @touchstart.passive="startSettingsHelpTouch('manualSummary')"
                      @touchend="endSettingsHelpTouch('manualSummary')"
                      @touchcancel="endSettingsHelpTouch('manualSummary')"
                      @click.stop.prevent="toggleSettingsHelp('manualSummary')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'manualSummary'" class="settings-help-popover">
                        {{ settingsHelpText.manualSummary }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    class="settings-primary-btn sm:shrink-0"
                    :disabled="!isAutoSummaryEnabled || gameStore.isGenerating || isManualSummaryRunning"
                    @click="handleManualSummary"
                  >
                    {{ isManualSummaryRunning ? '补全中...' : '补全当前总结' }}
                  </button>
                </div>

                <div class="settings-summary-divider"></div>

                <h4 class="settings-subsection-title">大总结设定</h4>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>总结范围设置</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('bigSummaryRange')"
                      @mouseleave="closeSettingsHelp('bigSummaryRange')"
                      @focus="openSettingsHelp('bigSummaryRange')"
                      @blur="closeSettingsHelp('bigSummaryRange')"
                      @touchstart.passive="startSettingsHelpTouch('bigSummaryRange')"
                      @touchend="endSettingsHelpTouch('bigSummaryRange')"
                      @touchcancel="endSettingsHelpTouch('bigSummaryRange')"
                      @click.stop.prevent="toggleSettingsHelp('bigSummaryRange')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'bigSummaryRange'" class="settings-help-popover">
                        {{ settingsHelpText.bigSummaryRange }}
                      </div>
                    </Transition>
                  </div>
                  <div class="flex items-center gap-2 sm:shrink-0">
                    <input
                      v-model.lazy.number="bigSummaryRangeStart"
                      type="number"
                      inputmode="numeric"
                      class="settings-summary-range-input"
                    />
                    <span class="text-dungeon-paper/70 text-sm">-</span>
                    <input
                      v-model.lazy.number="bigSummaryRangeEnd"
                      type="number"
                      inputmode="numeric"
                      class="settings-summary-range-input"
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>大总结字数</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('bigSummaryWords')"
                      @mouseleave="closeSettingsHelp('bigSummaryWords')"
                      @focus="openSettingsHelp('bigSummaryWords')"
                      @blur="closeSettingsHelp('bigSummaryWords')"
                      @touchstart.passive="startSettingsHelpTouch('bigSummaryWords')"
                      @touchend="endSettingsHelpTouch('bigSummaryWords')"
                      @touchcancel="endSettingsHelpTouch('bigSummaryWords')"
                      @click.stop.prevent="toggleSettingsHelp('bigSummaryWords')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'bigSummaryWords'" class="settings-help-popover">
                        {{ settingsHelpText.bigSummaryWords }}
                      </div>
                    </Transition>
                  </div>
                  <div class="flex items-center gap-2 sm:shrink-0">
                    <input
                      v-model.lazy.number="bigSummaryMinWords"
                      type="number"
                      min="50"
                      max="10000"
                      inputmode="numeric"
                      class="settings-summary-range-input"
                    />
                    <span class="text-dungeon-paper/70 text-sm">-</span>
                    <input
                      v-model.lazy.number="bigSummaryMaxWords"
                      type="number"
                      min="50"
                      max="10000"
                      inputmode="numeric"
                      class="settings-summary-range-input"
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                      <span>当前可总结条目</span>
                      <button
                        type="button"
                        class="settings-help-trigger"
                        @mouseenter="openSettingsHelp('bigSummaryEntries')"
                        @mouseleave="closeSettingsHelp('bigSummaryEntries')"
                        @focus="openSettingsHelp('bigSummaryEntries')"
                        @blur="closeSettingsHelp('bigSummaryEntries')"
                        @touchstart.passive="startSettingsHelpTouch('bigSummaryEntries')"
                        @touchend="endSettingsHelpTouch('bigSummaryEntries')"
                        @touchcancel="endSettingsHelpTouch('bigSummaryEntries')"
                        @click.stop.prevent="toggleSettingsHelp('bigSummaryEntries')"
                      >
                        ?
                      </button>
                      <Transition name="settings-help-fade">
                        <div v-if="activeSettingsHelp === 'bigSummaryEntries'" class="settings-help-popover">
                          {{ settingsHelpText.bigSummaryEntries }}
                        </div>
                      </Transition>
                    </div>
                    <span class="text-dungeon-paper/55 text-xs font-ui"
                      >当前选中 {{ selectedBigSummaryEntryCount }} 条</span
                    >
                  </div>
                  <div class="settings-summary-list">
                    <div v-if="isBigSummaryEntriesLoading" class="settings-summary-list-empty">加载中...</div>
                    <div v-else-if="bigSummaryChronicleEntries.length === 0" class="settings-summary-list-empty">
                      暂无可总结条目
                    </div>
                    <div v-else class="space-y-1 pr-1">
                      <div
                        v-for="entry in bigSummaryChronicleEntries"
                        :key="`big-summary-entry-${entry.index}`"
                        class="settings-summary-item"
                        :class="{ 'is-selected': isEntryWithinBigSummaryRange(entry.index) }"
                      >
                        <span class="settings-summary-item-index">{{ entry.index }}.</span>
                        <span class="settings-summary-item-text">{{ entry.summary }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end">
                  <button
                    class="settings-primary-btn"
                    :disabled="!canGenerateBigSummary"
                    @click="handleGenerateBigSummary"
                  >
                    {{ isBigSummaryGenerating ? '总结中...' : '生成大总结' }}
                  </button>
                </div>
              </div>
            </section>

            <div class="settings-system-actions">
              <h3 class="settings-section-title settings-section-title--neutral">系统</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button class="settings-action-btn settings-action-btn--gold" @click="toggleFullScreen">
                  切换全屏模式
                </button>
                <button class="settings-action-btn settings-action-btn--danger" @click="$emit('backToSplash')">
                  退出到标题
                </button>
                <button
                  class="settings-action-btn sm:col-span-2"
                  :class="isCombatTestUnlocked ? 'settings-action-btn--accent' : 'settings-action-btn--locked'"
                  :title="isCombatTestUnlocked ? '进入战斗测试' : '作者测试用'"
                  @click="handleCombatTestButtonClick"
                >
                  {{ isCombatTestUnlocked ? '⚔ 进入战斗测试' : '作者测试用' }}
                </button>
              </div>
            </div>
          </div>
        </DungeonModal>

        <DungeonModal title="大总结结果确认" :is-open="!!bigSummaryDraft" @close="closeBigSummaryDraft">
          <div v-if="bigSummaryDraft" class="flex flex-col gap-4 w-full">
            <div class="text-sm text-dungeon-paper/75 font-ui">
              已生成范围 {{ bigSummaryDraft.rangeStart }}-{{ bigSummaryDraft.rangeEnd }} 的大总结（共
              {{ bigSummaryDraft.entryCount }} 条来源）。
            </div>
            <textarea
              v-model="bigSummaryDraft.editedSummary"
              class="settings-big-summary-result settings-big-summary-editor"
              rows="12"
            ></textarea>
            <div class="flex items-center justify-between gap-3">
              <button
                v-if="isBigSummaryDraftEdited"
                class="settings-action-btn settings-action-btn--gold"
                :disabled="isBigSummaryApplying"
                @click="restoreBigSummaryDraft"
              >
                还原原文
              </button>
              <div class="flex items-center gap-3 ml-auto">
                <button
                  class="settings-action-btn settings-action-btn--danger"
                  :disabled="isBigSummaryApplying"
                  @click="closeBigSummaryDraft"
                >
                  否，关闭
                </button>
                <button class="settings-primary-btn" :disabled="isBigSummaryApplying" @click="confirmApplyBigSummary">
                  {{ isBigSummaryApplying ? '覆盖中...' : '是，覆盖条目' }}
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
                        <span class="text-[10px] px-1 rounded border" :class="getCardTypeBadgeClass(entry.card.type)">{{
                          entry.card.type
                        }}</span>
                        <span class="text-[10px] px-1 rounded border border-white/15 text-dungeon-paper/60">{{
                          entry.card.category
                        }}</span>
                      </div>
                      <div class="mt-1 text-[10px] text-dungeon-paper/70 truncate" :title="entry.card.description">
                        {{ entry.card.description }}
                      </div>
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
                    :class="
                      idx <= selectedTestDeck.length
                        ? 'bg-dungeon-gold/70 border-dungeon-gold/60'
                        : 'bg-black/20 border-dungeon-brown/40'
                    "
                  ></div>
                </div>
              </div>

              <div
                class="max-h-[42vh] overflow-y-auto rounded border border-dungeon-brown/60 bg-dungeon-dark/40 p-3 custom-scrollbar"
              >
                <div class="space-y-3">
                  <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                    <button
                      v-for="category in cardCategoryTabsForTest"
                      :key="`card-tab-${category}`"
                      class="h-7 px-3 rounded border text-xs shrink-0 transition-colors"
                      :class="
                        selectedCardCategoryTab === category
                          ? 'bg-dungeon-gold/20 border-dungeon-gold/70 text-dungeon-gold'
                          : 'bg-[#1a0f08]/80 border-dungeon-brown/70 text-dungeon-paper/70 hover:border-dungeon-gold/50 hover:text-dungeon-gold/90'
                      "
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
                      <h4 class="font-heading text-[11px] tracking-wider uppercase text-dungeon-gold/90">
                        {{ group.category }}
                      </h4>
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

              <div class="mt-4 rounded border border-dungeon-brown/60 bg-dungeon-dark/40 p-3">
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-heading text-dungeon-gold text-xs tracking-wider uppercase">测试主动技</h4>
                  <span class="text-[11px] text-dungeon-paper/60">作者测试可选择全部主动技</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    v-for="entry in testActiveSkillEntries"
                    :key="`test-active-slot-${entry.idx}`"
                    class="rounded border border-dungeon-brown/50 bg-[#1a0f08]/70 p-3"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="text-xs font-heading text-dungeon-gold">槽位 {{ entry.idx + 1 }}</div>
                        <div class="text-[11px] text-dungeon-paper/75">{{ entry.skill?.name ?? '未选择主动技' }}</div>
                      </div>
                      <button
                        class="px-2 py-1 rounded border border-dungeon-brown/60 text-[11px] text-dungeon-paper/70 hover:border-dungeon-gold/45"
                        @click="clearTestActiveSkill(entry.idx)"
                      >
                        清空
                      </button>
                    </div>
                    <div class="mt-2 text-[10px] text-dungeon-paper/60 min-h-[30px]">
                      {{ entry.skill?.description ?? '从下方列表选择一个主动技装入该槽位。' }}
                    </div>
                    <div class="mt-3 max-h-40 overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
                      <button
                        v-for="skill in activeSkillsForBattle"
                        :key="`test-active-pick-${entry.idx}-${skill.id}`"
                        class="w-full text-left rounded border px-2 py-1.5 text-[11px] transition-colors"
                        :class="
                          entry.name === skill.name
                            ? 'border-dungeon-gold/70 bg-dungeon-gold/10 text-dungeon-gold'
                            : 'border-dungeon-brown/50 bg-[#110a06]/50 text-dungeon-paper/75 hover:border-dungeon-gold/45'
                        "
                        @click="setTestActiveSkill(entry.idx, skill)"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span class="truncate">{{ skill.name }}</span>
                          <span class="shrink-0 text-[10px] text-dungeon-paper/50">{{ skill.rarity }}</span>
                        </div>
                      </button>
                    </div>
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
                <span class="text-xs font-ui text-dungeon-paper/70"
                  >已选卡组: 9张｜圣遗物: {{ selectedRelicTotalCount }} 件</span
                >
              </div>

              <div
                class="max-h-[42vh] overflow-y-auto rounded border border-dungeon-brown/60 bg-dungeon-dark/40 p-2 custom-scrollbar"
              >
                <div class="space-y-2">
                  <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                    <button
                      v-for="floorLabel in combatTestEnemyFloorTabs"
                      :key="`combat-test-floor-${floorLabel}`"
                      class="h-7 px-3 rounded border text-xs shrink-0 transition-colors"
                      :class="
                        selectedEnemyFloorForTest === floorLabel
                          ? 'bg-dungeon-gold/20 border-dungeon-gold/70 text-dungeon-gold'
                          : 'bg-[#1a0f08]/80 border-dungeon-brown/70 text-dungeon-paper/70 hover:border-dungeon-gold/50 hover:text-dungeon-gold/90'
                      "
                      @click="setCombatTestEnemyFloorFilter(floorLabel)"
                    >
                      {{ floorLabel }}
                    </button>
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <button
                      v-for="enemy in filteredEnemyEntriesForTest"
                      :key="`enemy-${enemy.name}`"
                      class="text-left px-3 py-2 rounded border text-xs transition-colors"
                      :class="
                        selectedTestEnemy === enemy.name
                          ? 'border-dungeon-gold bg-dungeon-brown/60 text-dungeon-gold'
                          : 'border-dungeon-brown/60 bg-[#1a0f08] text-dungeon-paper hover:border-dungeon-gold/60'
                      "
                      @click="selectedTestEnemy = enemy.name"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span class="truncate">{{ enemy.name }}</span>
                        <span class="text-[10px] text-dungeon-paper/55 shrink-0">{{ enemy.floorLabel }}</span>
                      </div>
                    </button>
                  </div>
                  <div
                    v-if="filteredEnemyEntriesForTest.length === 0"
                    class="rounded border border-dungeon-brown/40 bg-black/20 py-6 text-center text-xs text-dungeon-paper/40"
                  >
                    当前楼层分类暂无可选魔物
                  </div>
                </div>
              </div>

              <div class="rounded border border-dungeon-brown/60 bg-dungeon-dark/40 p-3">
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-heading text-dungeon-gold text-xs tracking-wider uppercase">圣遗物自选</h4>
                  <span class="text-[11px] text-dungeon-paper/60">将同步写入 MVU `携带的物品._圣遗物`</span>
                </div>
                <div class="max-h-[28vh] overflow-y-auto custom-scrollbar pr-1">
                  <div class="space-y-2">
                    <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                      <button
                        v-for="category in relicCategoryTabsForTest"
                        :key="`relic-tab-${category}`"
                        class="h-7 px-3 rounded border text-xs shrink-0 transition-colors"
                        :class="
                          selectedRelicCategoryTab === category
                            ? 'bg-dungeon-gold/20 border-dungeon-gold/70 text-dungeon-gold'
                            : 'bg-[#1a0f08]/80 border-dungeon-brown/70 text-dungeon-paper/70 hover:border-dungeon-gold/50 hover:text-dungeon-gold/90'
                        "
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
                        <h5 class="font-heading text-[11px] tracking-wider uppercase text-dungeon-gold/90">
                          {{ group.category }}
                        </h5>
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
                              <span class="w-6 text-center text-xs text-dungeon-gold">{{
                                getSelectedTestRelicCount(relic.name)
                              }}</span>
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

              <label
                class="flex items-center gap-2 px-3 py-2 rounded border border-dungeon-brown/60 bg-dungeon-dark/40 text-sm text-dungeon-paper/80"
              >
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
          @rollback="resetTransientUiState"
        />

        <!-- Variable Update Viewer -->
        <DungeonModal title="变量更新" :is-open="isVariableUpdateOpen" @close="isVariableUpdateOpen = false">
          <div class="variable-update-panel">
            <div class="variable-update-head">
              <FileText class="variable-update-head-icon" />
              <div>
                <div class="variable-update-title">本层变量同步记录</div>
                <div class="variable-update-subtitle">识别标签：&lt;UpdateVariable&gt; / &lt;update&gt;</div>
              </div>
            </div>
            <div v-if="gameStore.variableUpdateText" class="variable-update-body custom-scrollbar">
              <pre class="variable-update-content">{{ gameStore.variableUpdateText }}</pre>
            </div>
            <div v-else class="variable-update-empty">当前楼层没有检测到变量更新标签。</div>
          </div>
        </DungeonModal>

        <!-- Shop Overlay -->
        <Transition name="combat-fade">
          <div v-if="showShopView" class="absolute inset-0 z-[94] bg-black">
            <img :src="shopBackgroundUrl" class="absolute inset-0 h-full w-full object-cover" alt="商店背景" />
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
          <div
            v-if="showChestView"
            class="absolute inset-0 z-[95] bg-black"
            @contextmenu.prevent="handleChestContextMenu"
            @touchstart.passive="handleChestTouchStart"
            @touchend="handleChestTouchEnd"
            @touchcancel="handleChestTouchEnd"
          >
            <img
              :src="chestBackgroundUrl"
              class="absolute inset-0 h-full w-full object-cover"
              alt="宝箱界面背景"
              @load="handleChestBgLoaded"
            />

            <div v-if="chestStage === 'opened'" class="pointer-events-none absolute inset-0">
              <div
                v-if="chestRewardVisible && chestRewardRelics.length > 0"
                class="chest-reward-anchor"
                :class="{ 'is-multi': chestRewardRelics.length > 1 }"
              >
                <button
                  v-for="(relic, i) in chestRewardRelics"
                  :key="`chest-reward-${relic.id}-${i}`"
                  type="button"
                  class="pointer-events-auto chest-reward-btn"
                  :class="{
                    'is-collected': chestRewardCollectedFlags[i],
                    'is-awaiting-confirm': isTouchViewport && pendingChestRewardIndex === i && !chestRewardCollectedFlags[i],
                  }"
                  :disabled="chestCollecting || chestRewardCollectedFlags[i]"
                  @click.stop="handleChestRewardClick($event, i)"
                  @mouseenter="showChestRewardTooltip($event, i)"
                  @mouseleave="hideRelicTooltip"
                  @focus="showChestRewardTooltip($event, i)"
                  @blur="hideRelicTooltip"
                  @touchstart.stop.passive="handleChestRewardTouchStart($event, i)"
                  @touchend.stop="handleRelicTouchEnd"
                  @touchcancel.stop="handleRelicTouchEnd"
                >
                  <Box class="chest-reward-icon" />
                  <span
                    v-if="isTouchViewport && pendingChestRewardIndex === i && !chestRewardCollectedFlags[i]"
                    class="chest-reward-confirm-hint"
                  >
                    再次点击获取
                  </span>
                </button>
              </div>

              <div class="pointer-events-auto chest-portals-anchor w-full">
                <div class="flex justify-center gap-4 flex-wrap">
                  <button
                    v-for="(portal, i) in chestPortalChoices"
                    :key="`chest-portal-${i}`"
                    class="portal-btn group relative flex flex-col items-center justify-center rounded-lg border-2 backdrop-blur-sm transition-all duration-500 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <span class="portal-btn__icon mb-1 relative z-10 drop-shadow-lg">{{ portal.icon }}</span>
                    <span
                      class="portal-btn__label font-ui tracking-wide relative z-10 text-center"
                      :style="{ color: portal.textColor }"
                      >{{ portal.label }}</span
                    >
                    <div
                      class="absolute inset-1 rounded-md border border-dashed opacity-30 group-hover:opacity-70 animate-[spin_8s_linear_infinite] transition-opacity"
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
            <img :src="idolBackgroundUrl" class="absolute inset-0 h-full w-full object-cover" alt="神像界面背景" />

            <div class="idol-layout absolute inset-0 z-[97]">
              <div class="idol-slots-row">
                <div class="idol-slot-wrap">
                  <div class="idol-slot-hint">增加1.5倍点数的生命上限</div>
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
              <div
                class="w-full max-w-6xl origin-center scale-[1.3] rounded-xl border border-dungeon-gold/35 bg-[#0f0906]/95 p-5 md:p-7 shadow-[0_0_28px_rgba(212,175,55,0.2)]"
              >
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div class="font-heading text-xl text-dungeon-gold">战胜奖励</div>
                    <div class="text-xs text-dungeon-paper/65 mt-1">
                      {{
                        victoryRewardStage === 'pick'
                          ? '请选择 1 张奖励（卡牌或主动技能）'
                          : victoryRewardStage === 'replaceActive'
                            ? '选择要替换的主动技能槽位（共2槽）'
                            : '选择要替换的卡组槽位（共9槽）'
                      }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="canRefreshVictoryReward"
                      class="px-4 py-2 rounded border border-sky-500/50 text-sky-200 hover:bg-sky-500/10 disabled:opacity-50"
                      :disabled="rewardApplying"
                      @click="refreshVictoryRewardOptions"
                    >
                      刷新奖励
                    </button>
                    <button
                      class="px-4 py-2 rounded border border-dungeon-brown text-dungeon-paper/75 hover:border-dungeon-gold/50"
                      :disabled="rewardApplying"
                      @click="exitVictoryRewardFlow"
                    >
                      退出
                    </button>
                  </div>
                </div>

                <template v-if="victoryRewardStage === 'pick'">
                  <div class="flex flex-wrap justify-center gap-5">
                    <button
                      v-for="reward in victoryRewardOptions"
                      :key="`reward-option-${reward.id}`"
                      type="button"
                      class="w-[220px] rounded-lg border border-dungeon-brown/50 bg-[#160d08]/75 p-3 transition-all hover:border-dungeon-gold/60 hover:scale-[1.01]"
                      @click="pickVictoryRewardCard(reward)"
                    >
                      <div class="mb-2 text-center text-[11px] text-dungeon-paper/75">
                        {{ getVictoryRewardTypeText(reward) }}
                      </div>
                      <div class="flex justify-center">
                        <DungeonCard v-if="!isActiveSkillReward(reward)" :card="reward" disabled />
                        <ActiveSkillCard
                          v-else
                          :skill="reward"
                          :footer-right-text="`${reward.category} · ${reward.rarity}`"
                          footer-right-tone="default"
                        />
                      </div>
                      <div class="mt-2 text-center text-xs text-dungeon-gold/90">选择此卡</div>
                    </button>
                  </div>
                </template>

                <template v-else-if="victoryRewardStage === 'replaceDeck' || victoryRewardStage === 'replaceActive'">
                  <div class="mb-4 rounded border border-dungeon-gold/25 bg-black/20 p-3">
                    <div class="text-xs text-dungeon-paper/70 mb-2">
                      已选择奖励{{
                        selectedVictoryRewardCard && isActiveSkillReward(selectedVictoryRewardCard)
                          ? '主动技能'
                          : '卡牌'
                      }}：
                    </div>
                    <div class="flex justify-center">
                      <DungeonCard
                        v-if="selectedVictoryRewardCard && !isActiveSkillReward(selectedVictoryRewardCard)"
                        :card="selectedVictoryRewardCard"
                        disabled
                      />
                      <ActiveSkillCard
                        v-else-if="selectedVictoryRewardCard && isActiveSkillReward(selectedVictoryRewardCard)"
                        :skill="selectedVictoryRewardCard"
                        :footer-right-text="`${selectedVictoryRewardCard.category} · ${selectedVictoryRewardCard.rarity}`"
                        footer-right-tone="default"
                      />
                    </div>
                  </div>

                  <div
                    v-if="victoryRewardStage === 'replaceDeck' && rewardDeckReplaceEntries.length === 0"
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
                    v-if="victoryRewardStage === 'replaceDeck' && rewardDeckReplaceEntries.length > 0"
                    class="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[52vh] overflow-y-auto custom-scrollbar pr-1"
                  >
                    <button
                      v-for="entry in rewardDeckReplaceEntries"
                      :key="`reward-replace-${entry.idx}`"
                      type="button"
                      class="rounded border border-dungeon-brown/50 bg-[#160d08]/65 p-3 text-left transition-colors hover:border-dungeon-gold/60 disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="rewardApplying"
                      @click="replaceDeckCardWithReward(entry.idx)"
                    >
                      <div class="text-[11px] text-dungeon-paper/65 mb-2">槽位 {{ entry.idx + 1 }}</div>
                      <div class="flex justify-center">
                        <DungeonCard v-if="entry.card" :card="entry.card" disabled />
                        <div
                          v-else
                          class="w-[180px] h-[250px] rounded border border-dungeon-brown/45 flex items-center justify-center text-xs text-dungeon-paper/55"
                        >
                          {{ entry.name || '空槽位' }}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div v-if="victoryRewardStage === 'replaceActive'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      v-for="entry in rewardActiveReplaceEntries"
                      :key="`reward-active-replace-${entry.idx}`"
                      type="button"
                      class="rounded border border-dungeon-brown/50 bg-[#160d08]/65 p-3 text-left transition-colors hover:border-dungeon-gold/60 disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="rewardApplying"
                      @click="replaceActiveSkillWithReward(entry.idx)"
                    >
                      <div class="text-[11px] text-dungeon-paper/65 mb-2">主动槽位 {{ entry.idx + 1 }}</div>
                      <div class="flex justify-center">
                        <ActiveSkillCard
                          v-if="entry.skill"
                          :skill="entry.skill"
                          :footer-right-text="`${entry.skill.category} · ${entry.skill.rarity}`"
                          footer-right-tone="default"
                        />
                        <ActiveSkillCard
                          v-else
                          :skill="null"
                          :empty-label="entry.name || '空主动槽位'"
                        />
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
              :player-active-skills="resolvedActiveSkills"
              :player-relics="combatRelicMap"
              :player-portrait-override-url="playerBattlePortraitUrl"
              :test-start-at-999="combatTestStartAt999CurrentBattle"
              :track-discovery="activeCombatContext !== 'combatTest'"
              :ui-font-family="textSettings.fontFamily"
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
              @open-relics="openInventoryModal('relics')"
            />
            <!-- Exit combat button -->
            <button
              class="absolute top-4 right-4 z-[110] px-4 py-2 bg-red-950/80 border border-red-700/50 text-red-300 text-sm rounded-lg hover:bg-red-900/80 hover:border-red-600 transition-all backdrop-blur-sm"
              @click="showCombat = false"
            >
              ✕ 退出战斗
            </button>
          </div>
        </Transition>

        <OpeningInfoEntryView
          v-if="props.showOpeningEntry && !renderOpeningEntryAsViewportOverlay"
          :background-url="props.openingEntryBackgroundUrl"
          :loading="props.openingEntryLoading"
          :error="props.openingEntryError"
          @back-to-splash="emit('backToSplash')"
          @submit="emit('submitOpeningEntry', $event)"
        />
      </div>
    </div>

    <OpeningInfoEntryView
      v-if="renderOpeningEntryAsViewportOverlay"
      :background-url="props.openingEntryBackgroundUrl"
      :loading="props.openingEntryLoading"
      :error="props.openingEntryError"
      @back-to-splash="emit('backToSplash')"
      @submit="emit('submitOpeningEntry', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import {
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
  RotateCcw,
  Scroll,
  Send,
  Settings as SettingsIcon,
  Upload,
  Users,
} from 'lucide-vue-next';
import { hasAuthorTestAccess, unlockAuthorTestAccess, verifyAuthorTestPassword } from '../authorTestAccess';
import { getAllActiveSkills, resolveActiveSkillNames } from '../battle/activeSkillRegistry';
import { getAllCards, resolveCardNames } from '../battle/cardRegistry';
import { getAllEnemyNames, getEnemyByName } from '../battle/enemyRegistry';
import { getAllRelics, getRelicById, getRelicByName, type RelicData } from '../battle/relicRegistry';
import { bgmTrackId, bgmTracks, bgmVolume, setBgmTrack, setBgmVolume } from '../bgm';
import { recordEncounteredCards, recordEncounteredRelics } from '../codexStore';
import {
  DIFFICULTY_OPTIONS,
  getDifficultyPreviewLines,
  normalizeDifficulty,
  shouldRestoreFullHpOnBattleStart,
  type DifficultyOption,
} from '../difficulty';
import { FLOOR_MAP, getFloorForArea, getNextFloor } from '../floor';
import { toggleFullScreen } from '../fullscreen';
import { useGameStore } from '../gameStore';
import { getLocalFolderFirstImagePath, getLocalFolderImagePaths } from '../localAssetManifest';
import type { OpeningInfoSubmission } from '../openingProfile';
import { CardType, EffectType, type ActiveSkillData, type CardData } from '../types';
import ActiveSkillCard from './ActiveSkillCard.vue';
import CombatView from './CombatView.vue';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';
import DungeonModal from './DungeonModal.vue';
import OpeningInfoEntryView from './OpeningInfoEntryView.vue';
import SaveLoadPanel from './SaveLoadPanel.vue';

const props = withDefaults(
  defineProps<{
    showOpeningEntry?: boolean;
    openingEntryBackgroundUrl?: string;
    openingEntryLoading?: boolean;
    openingEntryError?: string | null;
  }>(),
  {
    showOpeningEntry: false,
    openingEntryBackgroundUrl: '',
    openingEntryLoading: false,
    openingEntryError: null,
  },
);

const emit = defineEmits<{
  backToSplash: [];
  submitOpeningEntry: [payload: OpeningInfoSubmission];
}>();

const SidebarIcon = defineComponent({
  props: {
    icon: { type: Object, required: true },
    active: { type: Boolean, default: false },
    label: { type: String, default: '' },
    tooltipSide: { type: String, default: 'right' },
    disabled: { type: Boolean, default: false },
    highlight: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          disabled: props.disabled,
          class: [
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg border relative group backdrop-blur-sm disabled:cursor-not-allowed',
            props.disabled
              ? 'bg-[#120d0a] text-dungeon-paper/35 border-dungeon-brown/70'
              : props.active
                ? props.highlight
                  ? 'bg-dungeon-gold text-[#221507] border-amber-100 shadow-[0_0_18px_rgba(212,175,55,0.68)]'
                  : 'bg-[#e3be63] text-[#221507] border-amber-100 shadow-[0_0_14px_rgba(212,175,55,0.52)]'
                : props.highlight
                  ? 'bg-[#1d130b]/95 text-dungeon-gold border-dungeon-gold/70 shadow-[0_0_11px_rgba(212,175,55,0.42)] hover:bg-[#2a180c] hover:text-amber-100 hover:border-dungeon-gold hover:-translate-y-0.5 hover:shadow-[0_0_14px_rgba(212,175,55,0.46)]'
                  : 'bg-[#1a0f08]/95 text-dungeon-gold-dim border-dungeon-brown/90 hover:bg-[#28170c] hover:text-dungeon-gold hover:border-dungeon-gold/60 hover:-translate-y-0.5 hover:shadow-[0_0_10px_rgba(212,175,55,0.22)]',
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
                    'absolute bg-[#0b0908]/95 text-dungeon-paper/90 text-xs px-2.5 py-1.5 rounded-md border border-dungeon-brown/85 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none',
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

const WizardHatIcon = defineComponent({
  setup() {
    return () => h('i', { class: 'fa-solid fa-hat-wizard text-[20px]' });
  },
});

const gameStore = useGameStore();
const STAGE_BASE_WIDTH = 1920;
const STAGE_BASE_HEIGHT = 1080;
const viewportRef = ref<HTMLElement | null>(null);
const storyTextContainerRef = ref<HTMLElement | null>(null);
const viewportWidth = ref(STAGE_BASE_WIDTH);
const viewportHeight = ref(STAGE_BASE_HEIGHT);
const isTouchViewport = ref(false);
const landscapeHintDismissed = ref(false);
let viewportResizeObserver: ResizeObserver | null = null;

const updateViewportMetrics = () => {
  if (typeof window === 'undefined') return;

  const viewportRect = viewportRef.value?.getBoundingClientRect();
  const docEl = document.documentElement;
  const docWidth = docEl?.clientWidth ?? 0;
  const docHeight = docEl?.clientHeight ?? 0;
  const visualViewport = window.visualViewport;

  viewportWidth.value =
    viewportRect && viewportRect.width > 0
      ? viewportRect.width
      : docWidth > 0
        ? docWidth
        : (visualViewport?.width ?? window.innerWidth);
  viewportHeight.value =
    viewportRect && viewportRect.height > 0
      ? viewportRect.height
      : docHeight > 0
        ? docHeight
        : (visualViewport?.height ?? window.innerHeight);
  isTouchViewport.value = window.matchMedia('(pointer: coarse)').matches;
};
const handleViewportResize = () => {
  updateViewportMetrics();
};
const stageScale = computed(() => {
  if (viewportWidth.value <= 0 || viewportHeight.value <= 0) return 1;
  return Math.min(viewportWidth.value / STAGE_BASE_WIDTH, viewportHeight.value / STAGE_BASE_HEIGHT, 1);
});
const stageStyle = computed(() => ({
  transform: `translate(-50%, -50%) scale(${stageScale.value})`,
}));
const currentTavernFloorNumber = computed<number>(() => {
  // 绑定到 gameStore 的响应式状态，确保消息刷新时会重新取最新 message_id
  void gameStore.mainText;
  void gameStore.currentSummary;
  void gameStore.options.length;
  void gameStore.isGenerating;
  void gameStore.streamingText;

  const lastMessageId = Number(getLastMessageId());
  if (!Number.isFinite(lastMessageId) || lastMessageId < 0) return 0;
  return Math.floor(lastMessageId);
});
const showLandscapeHint = computed(
  () => isTouchViewport.value && viewportHeight.value > viewportWidth.value && !landscapeHintDismissed.value,
);
const renderOpeningEntryAsViewportOverlay = computed(
  () => props.showOpeningEntry && isTouchViewport.value && viewportHeight.value > viewportWidth.value,
);
const activeModal = ref<string | null>(null);
type PlayerDetailTab = 'status' | 'inventory';
type PlayerDetailInventoryTab = 'items' | 'relics' | 'consumables';
const playerDetailTab = ref<PlayerDetailTab>('status');
const playerDetailInventoryTab = ref<PlayerDetailInventoryTab>('items');
const isUpdatingInventory = ref(false);
const inputText = ref('');
const inputWaitingDotsStep = ref(1);
let inputWaitingDotsTimer: number | null = null;
const inputPlaceholder = computed(() =>
  gameStore.isGenerating ? `等待回复中${'.'.repeat(inputWaitingDotsStep.value)}` : '输入你的行动',
);
type ButtonCompletionMenuKey = 'special' | 'leave' | 'rebirth';
const buttonCompletionMenuRef = ref<HTMLElement | null>(null);
const optionCompletionMenuOpen = ref(false);
const closeOptionCompletionMenu = () => {
  optionCompletionMenuOpen.value = false;
};
const toggleOptionCompletionMenu = () => {
  if (!isButtonCompletionEnabled.value || gameStore.isGenerating) return;
  optionCompletionMenuOpen.value = !optionCompletionMenuOpen.value;
};
const dismissLandscapeHint = () => {
  landscapeHintDismissed.value = true;
};
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
const shopEntrySpentGold = ref(0);
const shopEntryPurchasedCount = ref(0);
const shopRobClickCount = ref(0);
const shopRobbing = ref(false);
const shopSessionKey = ref<string | null>(null);
const showChestView = ref(false);
const chestStage = ref<'closed' | 'opened' | 'mimic'>('closed');
const chestRolling = ref(false);
const chestRewardRelics = ref<RelicData[]>([]);
const chestRewardCollectedFlags = ref<boolean[]>([]);
const chestCollecting = ref(false);
const chestRewardVisible = ref(false);
const chestOpenedBgReady = ref(false);
const chestPortalChoices = ref<PortalChoice[]>([]);
const chestRewardCountFixed = ref<number | null>(null);
const chestCloseCount = ref(0);
const chestForceMimicNextOpen = ref(false);
const pendingChestRewardIndex = ref<number | null>(null);
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
const isCombatTestUnlocked = ref(hasAuthorTestAccess());
const selectedTestDeck = ref<string[]>([]);
const selectedTestEnemy = ref('');
const selectedEnemyFloorForTest = ref('全部');
const selectedTestRelicCounts = ref<Record<string, number>>({});
const selectedCardCategoryTab = ref('全部');
const selectedRelicCategoryTab = ref('全部');
const activeCombatContext = ref<'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest'>('normal');
const pendingCombatNarrative = ref<{
  id: string;
  context: 'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest';
  outcome: 'win' | 'lose' | 'escape';
  enemyName: string;
  text: string;
} | null>(null);
const dispatchedCombatNarrativeIds = new Set<string>();
const showVictoryRewardView = ref(false);
type VictoryRewardItem = CardData | ActiveSkillData;
type VictoryRewardStage = 'pick' | 'replaceDeck' | 'replaceActive';
const victoryRewardStage = ref<VictoryRewardStage>('pick');
const victoryRewardOptions = ref<VictoryRewardItem[]>([]);
const selectedVictoryRewardCard = ref<VictoryRewardItem | null>(null);
const rewardApplying = ref(false);
const rewardRefreshUsed = ref(false);
const rewardIsNormalEnemy = ref(false);
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
const selectedTestActiveSkills = ref<string[]>(['', '']);
let chestMimicTimer: ReturnType<typeof setTimeout> | null = null;
let chestRewardFadeTimer: ReturnType<typeof setTimeout> | null = null;
let chestCloseLongPressTimer: ReturnType<typeof setTimeout> | null = null;
let chestRewardConfirmTimer: ReturnType<typeof setTimeout> | null = null;
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

interface InventoryItemEntry {
  名字: string;
  描述: string;
}

interface InventoryConsumableEntry extends InventoryItemEntry {
  回复: number;
}

interface CarriedInventoryPayload {
  物品: InventoryItemEntry[];
  _圣遗物: Record<string, number>;
  消耗品: InventoryConsumableEntry[];
}

type CombatContext = 'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest';
type CombatOutcome = 'win' | 'lose' | 'escape';
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

interface PersistedShopProduct {
  key: string;
  relicId: string;
  basePrice: number;
  finalPrice: number;
  sold: boolean;
}

interface PersistedChestState {
  stage: 'closed' | 'opened' | 'mimic';
  rolling: boolean;
  rewardRelicIds: string[];
  rewardCollectedFlags: boolean[];
  collecting: boolean;
  rewardVisible: boolean;
  openedBgReady: boolean;
  portalChoices: PortalChoice[];
  rewardCountFixed: number | null;
  closeCount: number;
  forceMimicNextOpen: boolean;
}

interface PersistedShopState {
  products: PersistedShopProduct[];
  spentGold: number;
  purchasedItems: Array<{ name: string; rarity: string; price: number }>;
  robClickCount: number;
  robbing: boolean;
}

interface PersistedIdolState {
  diceValue: number;
  diceRolling: boolean;
  assignedTarget: IdolBlessingTarget | null;
  snapPreviewTarget: IdolBlessingTarget | null;
  dicePosition: { x: number; y: number };
}

interface PersistedVictoryState {
  stage: VictoryRewardStage;
  optionRewardIds: string[];
  selectedRewardId: string | null;
  refreshUsed: boolean;
  isNormalEnemy: boolean;
}

interface PersistedOverlaySnapshot {
  version: 1;
  active: 'none' | 'shop' | 'chest' | 'idol' | 'victoryReward';
  shop?: PersistedShopState;
  chest?: PersistedChestState;
  idol?: PersistedIdolState;
  victory?: PersistedVictoryState;
}

const OVERLAY_STATE_KEY = 'dungeon.ui.overlay_state.v1';
const PLAYER_CUSTOM_PORTRAIT_KEY = 'dungeon.player.custom_portrait.v1';
const isRestoringOverlayState = ref(false);

const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const HF_USER_DIR = '地牢/user';
const HF_MONSTER_DIR = '地牢/魔物';
const BOSS_FOLDER_NAMES = new Set([
  '普莉姆',
  '宁芙',
  '温蒂尼',
  '玛塔',
  '罗丝',
  '厄休拉',
  '希尔薇',
  '因克',
  '阿卡夏',
  '多萝西',
  '维罗妮卡',
  '伊丽莎白',
  '尤斯蒂娅',
  '克拉肯',
  '布偶',
  '赛琳娜',
  '米拉',
  '梦魔双子',
  '贝希摩斯',
  '佩恩',
  '西格尔',
  '摩尔',
  '利维坦',
  '奥赛罗',
  '盖亚',
]);
const bondFolderImageCache = new Map<string, string[]>();
const bondFolderImagePromiseCache = new Map<string, Promise<string[]>>();
const bondPortraitUrls = ref<Record<string, string>>({});
const bondPortraitErrors = ref<Record<string, boolean>>({});
const bondPortraitFallbackTried = ref<Record<string, boolean>>({});
const bondPortraitLoadTasks = new Map<string, Promise<void>>();
const bondPortraitPreview = ref<{ name: string; url: string } | null>(null);
let bondPortraitLoaderDisposed = false;
const playerPortraitUploadInputRef = ref<HTMLInputElement | null>(null);
const defaultPlayerPortraitUrl = ref('');
const playerCustomPortraitUrl = ref('');
const playerStatusPortraitError = ref(false);

const readStoredCustomPlayerPortrait = (): string => {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(PLAYER_CUSTOM_PORTRAIT_KEY) ?? '';
};

const normalizeRepoPath = (path: string) => path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
const encodeRepoPath = (path: string) =>
  normalizeRepoPath(path)
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/');
const toResolveUrl = (repoPath: string) => `${IMAGE_CDN_ROOT}/${encodeRepoPath(repoPath)}`;
const pickRandom = <T,>(items: T[]): T | null =>
  items.length > 0 ? items[Math.floor(Math.random() * items.length)]! : null;

const fetchFolderImages = async (repoFolderPath: string): Promise<string[]> => {
  const folder = normalizeRepoPath(repoFolderPath);
  const cached = bondFolderImageCache.get(folder);
  if (cached) return cached;
  const pending = bondFolderImagePromiseCache.get(folder);
  if (pending) return pending;

  const task = (async () => {
    const images = getLocalFolderImagePaths(folder);
    bondFolderImageCache.set(folder, images);
    return images;
  })();

  bondFolderImagePromiseCache.set(folder, task);
  try {
    return await task;
  } finally {
    bondFolderImagePromiseCache.delete(folder);
  }
};

const resolveRandomPortrait = async (folderPath: string, fallbackFilePath: string): Promise<string> => {
  const images = await fetchFolderImages(folderPath);
  const randomPath = pickRandom(images);
  const firstPath = getLocalFolderFirstImagePath(folderPath);
  return randomPath ? toResolveUrl(randomPath) : firstPath ? toResolveUrl(firstPath) : toResolveUrl(fallbackFilePath);
};

const resolvePortraitFolderByName = (characterName: string): string => {
  const trimmedName = characterName.trim();
  if (trimmedName === '苏菲' || trimmedName === '玩家') return HF_USER_DIR;
  return `${HF_MONSTER_DIR}/${trimmedName}`;
};

const tryFallbackBondPortrait = async (characterName: string): Promise<boolean> => {
  const folderPath = resolvePortraitFolderByName(characterName);
  const firstPath = getLocalFolderFirstImagePath(folderPath);
  if (!firstPath) return false;

  const nextUrl = toResolveUrl(firstPath);
  if (bondPortraitUrls.value[characterName] === nextUrl) return false;

  bondPortraitUrls.value = {
    ...bondPortraitUrls.value,
    [characterName]: nextUrl,
  };
  bondPortraitErrors.value = {
    ...bondPortraitErrors.value,
    [characterName]: false,
  };
  return true;
};

const resolveCharacterPortraitUrl = async (characterName: string): Promise<string> => {
  const trimmedName = characterName.trim();
  if (trimmedName === '苏菲' || trimmedName === '玩家') {
    return resolveRandomPortrait(HF_USER_DIR, `${HF_USER_DIR}/立绘.png`);
  }
  const folderPath = `${HF_MONSTER_DIR}/${trimmedName}`;
  const fallbackPath = `${HF_MONSTER_DIR}/${trimmedName}.png`;
  if (BOSS_FOLDER_NAMES.has(trimmedName)) {
    return resolveRandomPortrait(folderPath, fallbackPath);
  }
  const folderImages = await fetchFolderImages(folderPath);
  const randomEnemy = pickRandom(folderImages);
  return randomEnemy ? toResolveUrl(randomEnemy) : toResolveUrl(fallbackPath);
};

const initPlayerPortraitPreviewUrl = async () => {
  playerCustomPortraitUrl.value = readStoredCustomPlayerPortrait();
  playerStatusPortraitError.value = false;
  defaultPlayerPortraitUrl.value = await resolveCharacterPortraitUrl('玩家');
};

const playerBattlePortraitUrl = computed(() => playerCustomPortraitUrl.value || defaultPlayerPortraitUrl.value || '');
const playerStatusPortraitUrl = computed(() => playerBattlePortraitUrl.value);
const playerDisplayName = computed(() => {
  const profile = gameStore.statData.主角信息;
  const name = typeof profile?.姓名 === 'string' ? profile.姓名.trim() : '';
  return name || '主角';
});

const normalizeProfileValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || '未填写';
  }
  return '未填写';
};

const playerInfoEntries = computed(() => {
  const profile = (gameStore.statData.主角信息 ?? {}) as Record<string, unknown>;
  const orderedKeys = [
    '种族',
    '姓名',
    '年龄',
    '贞操',
    '天赋',
    '外貌',
    '特征',
    '身高',
    '体重',
    '胸围',
    '臀部',
    '小穴',
    '屁穴',
    '敏感点',
    '背景故事',
  ];
  return orderedKeys.map(label => ({
    label,
    value:
      label === '身高' && typeof profile[label] === 'number' && Number.isFinite(profile[label] as number)
        ? `${profile[label]}cm`
        : normalizeProfileValue(profile[label]),
    multiline: label === '背景故事',
  }));
});

const normalizeInventoryText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeInventoryItems = (value: unknown): InventoryItemEntry[] => {
  if (!Array.isArray(value)) return [];
  const result: InventoryItemEntry[] = [];
  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== 'object') continue;
    const entry = rawEntry as Record<string, unknown>;
    const 名字 = normalizeInventoryText(entry.名字);
    if (!名字) continue;
    result.push({
      名字,
      描述: normalizeInventoryText(entry.描述),
    });
  }
  return result;
};

const normalizeInventoryConsumables = (value: unknown): InventoryConsumableEntry[] => {
  if (!Array.isArray(value)) return [];
  const result: InventoryConsumableEntry[] = [];
  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== 'object') continue;
    const entry = rawEntry as Record<string, unknown>;
    const 名字 = normalizeInventoryText(entry.名字);
    if (!名字) continue;

    const 回复原值 = Number(entry.回复);
    const nextEntry: InventoryConsumableEntry = {
      名字,
      描述: normalizeInventoryText(entry.描述),
      回复: Number.isFinite(回复原值) ? Math.trunc(回复原值) : 0,
    };

    result.push(nextEntry);
  }
  return result;
};

const normalizeRelicInventoryMap = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [name, rawCount] of Object.entries(value as Record<string, unknown>)) {
    const normalizedName = normalizeInventoryText(name);
    const count = Math.max(0, Math.floor(Number(rawCount ?? 0)));
    if (!normalizedName || count <= 0) continue;
    result[normalizedName] = count;
  }
  return result;
};

const cloneInventoryItemEntry = (entry: InventoryItemEntry): InventoryItemEntry => ({
  名字: entry.名字,
  描述: entry.描述,
});

const cloneInventoryConsumableEntry = (entry: InventoryConsumableEntry): InventoryConsumableEntry => ({
  名字: entry.名字,
  描述: entry.描述,
  回复: entry.回复,
});

const carriedInventory = computed<CarriedInventoryPayload>(() => {
  const rawInventory =
    gameStore.statData.携带的物品 && typeof gameStore.statData.携带的物品 === 'object'
      ? (gameStore.statData.携带的物品 as Record<string, unknown>)
      : {};

  return {
    物品: normalizeInventoryItems(rawInventory.物品),
    _圣遗物: normalizeRelicInventoryMap(rawInventory._圣遗物),
    消耗品: normalizeInventoryConsumables(rawInventory.消耗品),
  };
});

const inventoryItems = computed(() => carriedInventory.value.物品);
const inventoryConsumables = computed(() => carriedInventory.value.消耗品);
const inventoryRelicMap = computed(() => carriedInventory.value._圣遗物);

const buildCarriedInventoryPayload = (overrides: Partial<CarriedInventoryPayload> = {}): CarriedInventoryPayload => ({
  物品: (overrides.物品 ?? inventoryItems.value).map(cloneInventoryItemEntry),
  _圣遗物: { ...(overrides._圣遗物 ?? inventoryRelicMap.value) },
  消耗品: (overrides.消耗品 ?? inventoryConsumables.value).map(cloneInventoryConsumableEntry),
});

const buildInventoryUpdateFields = (overrides: Partial<CarriedInventoryPayload> = {}): Record<string, any> => ({
  携带的物品: buildCarriedInventoryPayload(overrides),
});

const openPlayerPortraitUploadDialog = () => {
  playerPortraitUploadInputRef.value?.click();
};

const handlePlayerPortraitUpload = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toastr.warning('请选择图片文件。');
    input.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    toastr.warning('图片请控制在 2MB 以内，以免无法保存到本地。');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : '';
    if (!result) {
      toastr.warning('立绘读取失败，请重试。');
      input.value = '';
      return;
    }
    try {
      localStorage.setItem(PLAYER_CUSTOM_PORTRAIT_KEY, result);
      playerCustomPortraitUrl.value = result;
      playerStatusPortraitError.value = false;
      toastr.success('自定义立绘已更新。');
    } catch (error) {
      console.warn('[GameView] Failed to persist custom portrait:', error);
      toastr.error('立绘保存失败，可能是图片过大或浏览器存储空间不足。');
    } finally {
      input.value = '';
    }
  };
  reader.onerror = () => {
    toastr.error('立绘读取失败，请重试。');
    input.value = '';
  };
  reader.readAsDataURL(file);
};

const resetCustomPlayerPortrait = () => {
  localStorage.removeItem(PLAYER_CUSTOM_PORTRAIT_KEY);
  playerCustomPortraitUrl.value = '';
  playerStatusPortraitError.value = false;
  toastr.info('已恢复默认立绘。');
};

const clampBondAffection = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-200, Math.min(200, Math.floor(n)));
};

const bondRoleEntries = computed<Array<{ name: string; affection: number }>>(() => {
  const rolesRaw = gameStore.statData.角色;
  if (!rolesRaw || typeof rolesRaw !== 'object') return [];
  return Object.entries(rolesRaw as Record<string, any>)
    .filter(([name]) => typeof name === 'string' && name.trim().length > 0)
    .map(([name, payload]) => ({
      name: name.trim(),
      affection: clampBondAffection((payload as Record<string, unknown>)?.好感度),
    }))
    .sort((a, b) => {
      if (a.affection !== b.affection) return b.affection - a.affection;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
});

const getBondPortraitUrl = (characterName: string) =>
  bondPortraitUrls.value[characterName] ?? toResolveUrl(`${HF_MONSTER_DIR}/${characterName}.png`);

const bondEntries = computed(() =>
  bondRoleEntries.value.map(entry => ({
    ...entry,
    portraitUrl: getBondPortraitUrl(entry.name),
    affectionAbsRatio: Math.min(1, Math.abs(entry.affection) / 200),
  })),
);

const ensureBondPortraitLoaded = async (characterName: string) => {
  if (bondPortraitUrls.value[characterName]) return;
  const pending = bondPortraitLoadTasks.get(characterName);
  if (pending) {
    await pending;
    return;
  }
  const task = (async () => {
    const url = await resolveCharacterPortraitUrl(characterName);
    if (bondPortraitLoaderDisposed) return;
    bondPortraitUrls.value = {
      ...bondPortraitUrls.value,
      [characterName]: url,
    };
    bondPortraitErrors.value = {
      ...bondPortraitErrors.value,
      [characterName]: false,
    };
    bondPortraitFallbackTried.value = {
      ...bondPortraitFallbackTried.value,
      [characterName]: false,
    };
  })();
  bondPortraitLoadTasks.set(characterName, task);
  try {
    await task;
  } finally {
    bondPortraitLoadTasks.delete(characterName);
  }
};

const handleBondPortraitError = (characterName: string) => {
  void (async () => {
    if (!bondPortraitFallbackTried.value[characterName]) {
      bondPortraitFallbackTried.value = {
        ...bondPortraitFallbackTried.value,
        [characterName]: true,
      };
      const recovered = await tryFallbackBondPortrait(characterName);
      if (recovered) return;
    }
    bondPortraitErrors.value = {
      ...bondPortraitErrors.value,
      [characterName]: true,
    };
  })();
};

const formatBondAffection = (affection: number) => (affection > 0 ? `+${affection}` : String(affection));
const openBondPortraitPreview = (entry: { name: string; portraitUrl: string }) => {
  if (bondPortraitErrors.value[entry.name]) return;
  bondPortraitPreview.value = {
    name: entry.name,
    url: entry.portraitUrl,
  };
};
const closeBondPortraitPreview = () => {
  bondPortraitPreview.value = null;
};

// --- Dynamic Background ---
const bgIsLordFallback = ref(false);
const bgImageError = ref(false);
const HF_BG_BASE = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF`;
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
watch(bgOverlayOpacity, v => localStorage.setItem(BG_OPACITY_KEY, String(v)));

const CHEST_BG_CLOSED = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%AE%9D%E7%AE%B11.png`;
const CHEST_BG_OPENED = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%AE%9D%E7%AE%B12.png`;
const CHEST_BG_MIMIC = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%AE%9D%E7%AE%B13.png`;
const SHOP_BG_URL = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%95%86%E5%BA%97.png`;
const SHOP_MERCHANT_PORTRAIT_URL = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E9%AD%94%E7%89%A9/%E6%B2%90%E8%8A%AF%E5%85%B0/%E6%B2%90%E8%8A%AF%E5%85%B04.png`;
const IDOL_BG_URL = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E7%A5%9E%E5%83%8F.png`;
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
    rewardText: dice => `生命上限+${Math.floor(dice * 1.5)}`,
  },
  mp: {
    target: 'mp',
    slotLabel: '初始魔力',
    statueName: '魔力神像',
    rewardText: dice => `魔量+${dice}`,
  },
  gold: {
    target: 'gold',
    slotLabel: '金币',
    statueName: '财富神像',
    rewardText: dice => `金币+${dice * 2}`,
  },
};
const IDOL_SNAP_DISTANCE = 112;

const allCardsForTest = computed(() => getAllCards().filter(card => card.category !== '敌人'));
const cardByIdMap = computed(() => {
  const map = new Map<string, CardData>();
  for (const card of getAllCards()) {
    map.set(card.id, card);
  }
  return map;
});
const relicByIdMap = computed(() => {
  const map = new Map<string, RelicData>();
  for (const relic of getAllRelics()) {
    map.set(relic.id, relic);
  }
  return map;
});
const CATEGORY_ORDER: Record<string, number> = {
  基础: 0,
  魔导: 1,
  燃烧: 2,
  严寒: 3,
  血池: 4,
};
const compareCategory = (a: string, b: string) => {
  const orderA = CATEGORY_ORDER[a] ?? 999;
  const orderB = CATEGORY_ORDER[b] ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  return a.localeCompare(b, 'zh-Hans-CN');
};
const CARD_TYPE_ORDER_FOR_TEST: Record<CardType, number> = {
  [CardType.PHYSICAL]: 0,
  [CardType.MAGIC]: 1,
  [CardType.FUNCTION]: 2,
  [CardType.DODGE]: 3,
  [CardType.ACTIVE]: 4,
  [CardType.CURSE]: 5,
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
      cards: [...cards].sort((a, b) => {
        const typeOrderA = CARD_TYPE_ORDER_FOR_TEST[a.type] ?? 999;
        const typeOrderB = CARD_TYPE_ORDER_FOR_TEST[b.type] ?? 999;
        if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
      }),
    }));
});
const cardCategoryTabsForTest = computed<string[]>(() => [
  '全部',
  ...cardCategoryGroupsForTest.value.map(group => group.category),
]);
const filteredCardCategoryGroupsForTest = computed<Array<{ category: string; cards: CardData[] }>>(() => {
  if (selectedCardCategoryTab.value === '全部') return cardCategoryGroupsForTest.value;
  return cardCategoryGroupsForTest.value.filter(group => group.category === selectedCardCategoryTab.value);
});
const MAGIC_BOOK_COVER_BASE = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E9%AD%94%E6%B3%95%E4%B9%A6%E5%B0%81%E9%9D%A2`;
const getMagicBookCoverUrl = (bookName: string) => `${MAGIC_BOOK_COVER_BASE}/${encodeURIComponent(bookName)}.png`;
const carryableMagicBookNames = computed<string[]>(() =>
  cardCategoryGroupsForTest.value.map(group => group.category).filter(category => category !== '基础'),
);
const rawCarriedMagicBooks = computed<string[]>(() => {
  const raw = gameStore.statData._携带的魔法书;
  if (!Array.isArray(raw)) return [];
  return raw.filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
});
const carriedMagicBooks = computed<string[]>(() => {
  const available = new Set(carryableMagicBookNames.value);
  return rawCarriedMagicBooks.value.filter(name => available.has(name));
});
const carriedMagicBookSet = computed(() => new Set(carriedMagicBooks.value));
const magicBookCarryCount = computed(() => carriedMagicBooks.value.length);
const isSingleAcquisitionRelic = (relic: RelicData) => relic.rarity === '传奇' || relic.uniqueAcquisition === true;
const ownedSingleAcquisitionRelicNameSet = computed<Set<string>>(() => {
  const rawInventory = inventoryRelicMap.value;
  const owned = new Set<string>();
  for (const relic of getAllRelics()) {
    if (!isSingleAcquisitionRelic(relic)) continue;
    const countByName = Math.max(0, Math.floor(Number(rawInventory[relic.name] ?? 0)));
    const countById = Math.max(0, Math.floor(Number(rawInventory[relic.id] ?? 0)));
    const countByLegacyName = (LEGACY_RELIC_NAMES_BY_ID[relic.id] ?? []).reduce((sum, name) => {
      return sum + Math.max(0, Math.floor(Number(rawInventory[name] ?? 0)));
    }, 0);
    if (countByName > 0 || countById > 0 || countByLegacyName > 0) {
      owned.add(relic.name);
    }
  }
  return owned;
});
const selectableRelicPool = computed<RelicData[]>(() => {
  const categorySet = new Set<string>(['基础', ...carriedMagicBooks.value]);
  let pool = getAllRelics().filter(relic => categorySet.has(relic.category));
  if (pool.length === 0) {
    pool = getAllRelics().filter(relic => relic.category === '基础');
  }
  const ownedSingleAcquisitionNames = ownedSingleAcquisitionRelicNameSet.value;
  pool = pool.filter(relic => !isSingleAcquisitionRelic(relic) || !ownedSingleAcquisitionNames.has(relic.name));
  return [...pool];
});
const muxinlanFavor = computed<number>(() => {
  const roles = (gameStore.statData.角色 ?? {}) as Record<string, any>;
  const raw = Number(roles?.['沐芯兰']?.['好感度'] ?? 0);
  const safe = Number.isFinite(raw) ? raw : 0;
  return Math.max(-200, Math.min(200, safe));
});
const shopDiscountRate = computed(() => Math.max(0, Math.min(200, muxinlanFavor.value)) * 0.001);
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
const isMerchantDefeated = computed(() => parseMerchantDefeatedValue(gameStore.statData.$是否已击败商人));
const canEditMagicBooks = computed(() => ((gameStore.statData._当前区域 as string) || '') === '魔女的小窝');
const magicBookSidebarIcon = computed(() => (canEditMagicBooks.value ? Book : Lock));
const magicHatSidebarIcon = computed(() => (canEditMagicBooks.value ? WizardHatIcon : Lock));
const isUpdatingMagicBooks = ref(false);
const magicBooksNavTab = ref<'books' | 'active'>('books');
const selectedStartingActiveSlot = ref(0);
const isUpdatingStartingActiveSkills = ref(false);
const isUpgradingMagicHat = ref(false);
const isUpdatingMagicHatDifficulty = ref(false);
type MagicHatUpgradeType = 'hp' | 'mp' | 'gold';
type MagicHatTrackView = {
  id: MagicHatUpgradeType;
  label: string;
  currentValue: number;
  currentLevel: number;
  maxLevel: number;
  nextValue: number;
  nextCost: number;
  isMax: boolean;
  progressPercent: number;
  barClass: string;
};
const MAGIC_HAT_DIFFICULTY_BLURBS: Record<DifficultyOption, string> = {
  简单: '进入战斗回满血，敌人血量降低，适合稳妥铺垫。',
  普通: '标准试炼节奏，敌我都不额外倾斜。',
  困难: '楼层越高敌人越硬，领主还会在战斗中持续增伤。',
  地狱: '高压试炼，领主成长更快，开局还会附带随机负面状态。',
  自定义: '预留给后续更细的难度拼装，当前暂时锁定。',
};
const MAGIC_HAT_TRACK_META: Record<MagicHatUpgradeType, { kicker: string; rune: string }> = {
  hp: { kicker: '容错', rune: '血' },
  mp: { kicker: '启动', rune: '魔' },
  gold: { kicker: '成型', rune: '财' },
};
const getMagicHatDifficultyBlurb = (difficulty: DifficultyOption) => MAGIC_HAT_DIFFICULTY_BLURBS[difficulty];
const getMagicHatDifficultyClass = (difficulty: DifficultyOption) => {
  switch (difficulty) {
    case '简单':
      return 'is-simple';
    case '普通':
      return 'is-normal';
    case '困难':
      return 'is-hard';
    case '地狱':
      return 'is-hell';
    default:
      return 'is-custom';
  }
};
const getMagicHatTrackClass = (type: MagicHatUpgradeType) => `is-${type}`;
const getMagicHatTrackKicker = (type: MagicHatUpgradeType) => MAGIC_HAT_TRACK_META[type].kicker;
const getMagicHatTrackRune = (type: MagicHatUpgradeType) => MAGIC_HAT_TRACK_META[type].rune;
const getSafeInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};
const inventoryActionDisabled = computed(() => isUpdatingInventory.value || gameStore.isGenerating);
const totalInventoryEntryCount = computed(
  () => inventoryItems.value.length + relicEntries.value.length + inventoryConsumables.value.length,
);
const openStatusDetailsModal = () => {
  gameStore.loadStatData();
  playerDetailTab.value = 'status';
  activeModal.value = 'statusDetails';
};
const openInventoryModal = (tab: PlayerDetailInventoryTab = 'items') => {
  gameStore.loadStatData();
  playerDetailTab.value = 'inventory';
  playerDetailInventoryTab.value = tab;
  activeModal.value = 'statusDetails';
};
const readInitialMaxHpForUpgrade = () => {
  return Math.max(1, getSafeInt(gameStore.statData.$初始血量上限, 20));
};
const calcUpgradeLevel = (value: number, base: number, step: number, maxLevel: number) => {
  const level = Math.floor((value - base) / step);
  return Math.max(0, Math.min(maxLevel, level));
};
const magicHatDifficultyOptions = DIFFICULTY_OPTIONS;
const magicHatDifficulty = computed<DifficultyOption>(() => normalizeDifficulty(gameStore.statData.$难度));
const magicHatDifficultyFloor = computed(() => Math.max(1, toNonNegativeInt(gameStore.statData._楼层数, 1)));
const magicHatDifficultyPreviewLines = computed(() =>
  getDifficultyPreviewLines(magicHatDifficulty.value, magicHatDifficultyFloor.value),
);
const magicHatSkillPoints = computed(() => getSafeInt(gameStore.statData.$技能点, 0));
const magicHatTracks = computed<MagicHatTrackView[]>(() => {
  const hpValue = readInitialMaxHpForUpgrade();
  const mpValue = Math.max(1, getSafeInt(gameStore.statData.$初始魔量, 1));
  const goldValue = getSafeInt(gameStore.statData.$初始金币, 0);

  const hpLevel = calcUpgradeLevel(hpValue, 20, 2, 5);
  const mpLevel = calcUpgradeLevel(mpValue, 1, 1, 3);
  const goldLevel = calcUpgradeLevel(goldValue, 0, 2, 5);

  const hpIsMax = hpLevel >= 5;
  const mpIsMax = mpLevel >= 3;
  const goldIsMax = goldLevel >= 5;

  return [
    {
      id: 'hp',
      label: '初始生命上限',
      currentValue: hpValue,
      currentLevel: hpLevel,
      maxLevel: 5,
      nextValue: hpIsMax ? hpValue : 20 + (hpLevel + 1) * 2,
      nextCost: hpIsMax ? 0 : [1, 3, 6, 10, 15][hpLevel]!,
      isMax: hpIsMax,
      progressPercent: (hpLevel / 5) * 100,
      barClass: 'bg-gradient-to-r from-rose-500/85 to-red-400/85',
    },
    {
      id: 'mp',
      label: '初始魔量',
      currentValue: mpValue,
      currentLevel: mpLevel,
      maxLevel: 3,
      nextValue: mpIsMax ? mpValue : 1 + (mpLevel + 1),
      nextCost: mpIsMax ? 0 : [5, 10, 15][mpLevel]!,
      isMax: mpIsMax,
      progressPercent: (mpLevel / 3) * 100,
      barClass: 'bg-gradient-to-r from-sky-500/85 to-blue-400/85',
    },
    {
      id: 'gold',
      label: '初始金币',
      currentValue: goldValue,
      currentLevel: goldLevel,
      maxLevel: 5,
      nextValue: goldIsMax ? goldValue : (goldLevel + 1) * 2,
      nextCost: goldIsMax ? 0 : [2, 4, 6, 8, 10][goldLevel]!,
      isMax: goldIsMax,
      progressPercent: (goldLevel / 5) * 100,
      barClass: 'bg-gradient-to-r from-amber-500/85 to-yellow-300/85',
    },
  ];
});
const openMagicBookModal = () => {
  if (!canEditMagicBooks.value) return;
  magicBooksNavTab.value = 'books';
  selectedStartingActiveSlot.value = 0;
  activeModal.value = 'magicBooks';
};
const openMagicHatModal = () => {
  if (!canEditMagicBooks.value) return;
  activeModal.value = 'magicHat';
};
const setMagicHatDifficulty = async (difficulty: DifficultyOption) => {
  if (!canEditMagicBooks.value || difficulty === '自定义') return;
  if (isUpdatingMagicHatDifficulty.value) return;
  if (magicHatDifficulty.value === difficulty) return;

  isUpdatingMagicHatDifficulty.value = true;
  const ok = await gameStore.updateStatDataFields({ $难度: difficulty });
  isUpdatingMagicHatDifficulty.value = false;
  if (!ok) {
    toastr.warning('难度切换失败，请稍后重试。');
    return;
  }

  toastr.success(`难度已切换为【${difficulty}】。`);
};
const toggleMagicBook = async (bookName: string) => {
  if (isUpdatingMagicBooks.value) return;
  const current = rawCarriedMagicBooks.value;
  const nextBooks = current.includes(bookName) ? current.filter(name => name !== bookName) : [...current, bookName];
  isUpdatingMagicBooks.value = true;
  await gameStore.updateStatDataFields({
    _携带的魔法书: Array.from(new Set(nextBooks)),
  });
  isUpdatingMagicBooks.value = false;
};
const formatSignedNumber = (value: number) => (value > 0 ? `+${value}` : String(value));
const discardInventoryItem = async (index: number) => {
  if (inventoryActionDisabled.value) return;
  const item = inventoryItems.value[index];
  if (!item) return;

  isUpdatingInventory.value = true;
  const ok = await gameStore.updateStatDataFields(
    buildInventoryUpdateFields({
      物品: inventoryItems.value.filter((_, idx) => idx !== index),
    }),
  );
  isUpdatingInventory.value = false;
  if (!ok) {
    toastr.warning('丢弃物品失败，请稍后重试。');
    return;
  }
  toastr.info(`已丢弃物品【${item.名字}】。`);
};
const discardConsumable = async (index: number) => {
  if (inventoryActionDisabled.value) return;
  const consumable = inventoryConsumables.value[index];
  if (!consumable) return;

  isUpdatingInventory.value = true;
  const ok = await gameStore.updateStatDataFields(
    buildInventoryUpdateFields({
      消耗品: inventoryConsumables.value.filter((_, idx) => idx !== index),
    }),
  );
  isUpdatingInventory.value = false;
  if (!ok) {
    toastr.warning('丢弃消耗品失败，请稍后重试。');
    return;
  }
  toastr.info(`已丢弃消耗品【${consumable.名字}】。`);
};
const useConsumable = async (index: number) => {
  if (inventoryActionDisabled.value) return;
  const consumable = inventoryConsumables.value[index];
  if (!consumable) return;

  const nextConsumables = inventoryConsumables.value.filter((_, idx) => idx !== index);
  const updates: Record<string, any> = buildInventoryUpdateFields({ 消耗品: nextConsumables });
  const maxHp = Math.max(1, Math.floor(Number(gameStore.statData._血量上限 ?? 1)) || 1);
  const currentHpRaw = Number(gameStore.statData._血量 ?? maxHp);
  const currentHp = Number.isFinite(currentHpRaw) ? Math.min(maxHp, Math.max(1, Math.floor(currentHpRaw))) : maxHp;
  const healAmount = Math.max(0, Math.trunc(consumable.回复));
  const nextHp = Math.max(1, Math.min(maxHp, currentHp + healAmount));
  updates._血量 = nextHp;

  isUpdatingInventory.value = true;
  const ok = await gameStore.updateStatDataFields(updates);
  isUpdatingInventory.value = false;
  if (!ok) {
    toastr.warning('使用消耗品失败，请稍后重试。');
    return;
  }

  toastr.success(`已使用【${consumable.名字}】：生命 ${currentHp} → ${nextHp}。`);
};
const upgradeMagicHatStat = async (id: MagicHatUpgradeType) => {
  if (!canEditMagicBooks.value) return;
  if (isUpgradingMagicHat.value) return;

  const track = magicHatTracks.value.find(item => item.id === id);
  if (!track || track.isMax) return;

  if (magicHatSkillPoints.value < track.nextCost) {
    toastr.warning('技能点不足，无法升级。');
    return;
  }

  const updates: Record<string, any> = {
    $技能点: magicHatSkillPoints.value - track.nextCost,
  };

  if (id === 'hp') {
    updates['$初始血量上限'] = track.nextValue;
    updates._血量上限 = track.nextValue;
    updates._血量 = track.nextValue;
  } else if (id === 'mp') {
    updates['$初始魔量'] = track.nextValue;
    updates.$魔量 = Math.max(getSafeInt(gameStore.statData.$魔量, 0), track.nextValue);
  } else {
    updates['$初始金币'] = track.nextValue;
    updates._金币 = Math.max(getSafeInt(gameStore.statData._金币, 0), track.nextValue);
  }

  isUpgradingMagicHat.value = true;
  const ok = await gameStore.updateStatDataFields(updates);
  isUpgradingMagicHat.value = false;
  if (!ok) {
    toastr.warning('升级失败，请稍后重试。');
    return;
  }

  toastr.info(`${track.label} 已升级至 ${track.nextValue}。`);
};
const cardByNameForTest = computed(() => {
  const map = new Map<string, CardData>();
  for (const card of allCardsForTest.value) {
    map.set(card.name, card);
  }
  return map;
});
const activeSkillsForBattle = computed(() => getAllActiveSkills());
const activeSkillByIdMap = computed(() => {
  const map = new Map<string, ActiveSkillData>();
  for (const skill of activeSkillsForBattle.value) {
    map.set(skill.id, skill);
  }
  return map;
});
const activeSkillByNameMap = computed(() => {
  const map = new Map<string, ActiveSkillData>();
  for (const skill of activeSkillsForBattle.value) {
    map.set(skill.name, skill);
  }
  return map;
});
const INITIAL_ACTIVE_SKILL_IDS = new Set<string>([
  'active_basic_reroll_self',
  'active_basic_reroll_enemy',
  'active_basic_draw',
  'active_basic_guard',
  'active_basic_boost',
  'active_basic_weaken',
]);
const startingActiveSkillOptions = computed<ActiveSkillData[]>(() =>
  activeSkillsForBattle.value.filter(skill => INITIAL_ACTIVE_SKILL_IDS.has(skill.id)),
);
const startingActiveSkillEntries = computed<Array<{ idx: number; name: string; skill: ActiveSkillData | null }>>(() => {
  const raw = Array.isArray(gameStore.statData.$主动) ? [...(gameStore.statData.$主动 as string[])].slice(0, 2) : [];
  while (raw.length < 2) raw.push('');
  return raw.map((name, idx) => ({
    idx,
    name,
    skill: activeSkillByNameMap.value.get(name) ?? null,
  }));
});
const startingActiveEquippedCount = computed(() => startingActiveSkillEntries.value.filter(entry => Boolean(entry.name)).length);
const isSkillEquippedInStartingActive = (skillName: string): boolean =>
  startingActiveSkillEntries.value.some(entry => entry.name === skillName);
const setStartingActiveSkill = async (skill: ActiveSkillData) => {
  if (isUpdatingStartingActiveSkills.value) return;
  const slot = Math.max(0, Math.min(1, Math.floor(selectedStartingActiveSlot.value)));
  const next = startingActiveSkillEntries.value.map(entry => entry.name);
  const conflictSlot = next.findIndex((name, idx) => name === skill.name && idx !== slot);
  if (conflictSlot >= 0) {
    const previous = next[slot] ?? '';
    next[conflictSlot] = previous;
  }
  next[slot] = skill.name;
  while (next.length < 2) next.push('');

  isUpdatingStartingActiveSkills.value = true;
  const ok = await gameStore.updateStatDataFields({ $主动: next.slice(0, 2) });
  isUpdatingStartingActiveSkills.value = false;
  if (!ok) {
    toastr.warning('主动技能更新失败，请稍后重试。');
  }
};
const clearStartingActiveSkill = async (slotIdx: number) => {
  if (isUpdatingStartingActiveSkills.value) return;
  const slot = Math.max(0, Math.min(1, Math.floor(slotIdx)));
  const next = startingActiveSkillEntries.value.map(entry => entry.name);
  while (next.length < 2) next.push('');
  next[slot] = '';

  isUpdatingStartingActiveSkills.value = true;
  const ok = await gameStore.updateStatDataFields({ $主动: next.slice(0, 2) });
  isUpdatingStartingActiveSkills.value = false;
  if (!ok) {
    toastr.warning('主动技能更新失败，请稍后重试。');
  }
};
const EXCLUDED_VICTORY_REWARD_CARD_IDS = new Set<string>([
  'basic_physical',
  'basic_magic',
  'basic_shield',
  'basic_dodge',
]);
const EXCLUDED_VICTORY_REWARD_ACTIVE_SKILL_IDS = new Set<string>([
  'active_basic_reroll_self',
  'active_basic_reroll_enemy',
  'active_basic_draw',
  'active_basic_guard',
  'active_basic_boost',
  'active_basic_weaken',
]);
const rewardCardPool = computed<CardData[]>(() => {
  const categorySet = new Set<string>(['基础', ...carriedMagicBooks.value]);
  const filtered = allCardsForTest.value.filter(
    card => categorySet.has(card.category) && !EXCLUDED_VICTORY_REWARD_CARD_IDS.has(card.id),
  );
  if (filtered.length > 0) return filtered;
  return allCardsForTest.value.filter(card => !EXCLUDED_VICTORY_REWARD_CARD_IDS.has(card.id));
});
const rewardActiveSkillPool = computed<ActiveSkillData[]>(() => {
  const categorySet = new Set<string>(['基础', ...carriedMagicBooks.value]);
  const filtered = activeSkillsForBattle.value.filter(
    skill => categorySet.has(skill.category) && !EXCLUDED_VICTORY_REWARD_ACTIVE_SKILL_IDS.has(skill.id),
  );
  if (filtered.length > 0) return filtered;
  return activeSkillsForBattle.value.filter(
    skill => skill.category === '基础' && !EXCLUDED_VICTORY_REWARD_ACTIVE_SKILL_IDS.has(skill.id),
  );
});
const rewardDeckReplaceEntries = computed<Array<{ idx: number; name: string; card: CardData | null }>>(() => {
  const raw = Array.isArray(gameStore.statData._技能) ? (gameStore.statData._技能 as string[]) : [];
  return raw.slice(0, 9).map((name, idx) => ({
    idx,
    name,
    card: cardByNameForTest.value.get(name) ?? null,
  }));
});
const rewardActiveReplaceEntries = computed<Array<{ idx: number; name: string; skill: ActiveSkillData | null }>>(() => {
  const raw = Array.isArray(gameStore.statData.$主动) ? [...(gameStore.statData.$主动 as string[])].slice(0, 2) : [];
  while (raw.length < 2) raw.push('');
  return raw.map((name, idx) => ({
    idx,
    name,
    skill: activeSkillByNameMap.value.get(name) ?? null,
  }));
});
const testActiveSkillEntries = computed<Array<{ idx: number; name: string; skill: ActiveSkillData | null }>>(() => {
  const raw = [...selectedTestActiveSkills.value].slice(0, 2);
  while (raw.length < 2) raw.push('');
  return raw.map((name, idx) => ({
    idx,
    name,
    skill: activeSkillByNameMap.value.get(name) ?? null,
  }));
});
const setTestActiveSkill = (slotIdx: number, skill: ActiveSkillData) => {
  const slot = Math.max(0, Math.min(1, Math.floor(slotIdx)));
  const next = [...selectedTestActiveSkills.value].slice(0, 2);
  while (next.length < 2) next.push('');
  const conflictSlot = next.findIndex((name, idx) => name === skill.name && idx !== slot);
  if (conflictSlot >= 0) {
    next[conflictSlot] = next[slot] ?? '';
  }
  next[slot] = skill.name;
  selectedTestActiveSkills.value = next;
};
const clearTestActiveSkill = (slotIdx: number) => {
  const slot = Math.max(0, Math.min(1, Math.floor(slotIdx)));
  const next = [...selectedTestActiveSkills.value].slice(0, 2);
  while (next.length < 2) next.push('');
  next[slot] = '';
  selectedTestActiveSkills.value = next;
};
const selectedTestDeckCards = computed(() =>
  selectedTestDeck.value
    .map((cardName, idx) => ({ idx, card: cardByNameForTest.value.get(cardName) }))
    .filter((entry): entry is { idx: number; card: CardData } => entry.card !== undefined),
);
const SPECIAL_TEST_ENEMY_NAMES = new Set(['沐芯兰', '宝箱怪']);
const parseFloorNumberForTest = (floorLabel: string): number | null => {
  const trimmed = floorLabel.trim();
  const numericMatch = trimmed.match(/^第(\d+)层$/);
  if (numericMatch) {
    const parsed = Number(numericMatch[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const namedMap: Record<string, number> = {
    第一层: 1,
    第二层: 2,
    第三层: 3,
    第四层: 4,
    第五层: 5,
  };
  return namedMap[trimmed] ?? null;
};
const enemyFloorLabelRankForTest = (floorLabel: string): number => {
  if (floorLabel === '特殊') return 9000;
  if (floorLabel === '未知') return 10000;
  const parsed = parseFloorNumberForTest(floorLabel);
  return parsed ?? 10000;
};
const enemyFloorMapForTest = computed(() => {
  const map = new Map<string, number>();

  for (const [floorLabel, config] of Object.entries(FLOOR_MONSTER_CONFIG)) {
    const floorNumber = parseFloorNumberForTest(floorLabel);
    if (!floorNumber) continue;
    const floorEnemies = [...config.common, ...Object.values(config.uniqueByArea).flat()];
    for (const enemyName of floorEnemies) {
      if (!map.has(enemyName)) {
        map.set(enemyName, floorNumber);
      }
    }
  }

  for (const [area, lordName] of Object.entries(LORD_MONSTER_BY_AREA)) {
    const floorLabel = getFloorForArea(area) ?? '';
    const floorNumber = parseFloorNumberForTest(floorLabel);
    if (!floorNumber || map.has(lordName)) continue;
    map.set(lordName, floorNumber);
  }

  return map;
});
const allEnemyEntriesForTest = computed<Array<{ name: string; floorLabel: string; floorRank: number }>>(() =>
  getAllEnemyNames()
    .map(name => {
      if (SPECIAL_TEST_ENEMY_NAMES.has(name)) {
        return { name, floorLabel: '特殊', floorRank: enemyFloorLabelRankForTest('特殊') };
      }
      const floorNumber = enemyFloorMapForTest.value.get(name) ?? null;
      if (!floorNumber) {
        return { name, floorLabel: '未知', floorRank: enemyFloorLabelRankForTest('未知') };
      }
      const floorLabel = `第${floorNumber}层`;
      return { name, floorLabel, floorRank: enemyFloorLabelRankForTest(floorLabel) };
    })
    .sort((a, b) => {
      if (a.floorRank !== b.floorRank) return a.floorRank - b.floorRank;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    }),
);
const combatTestEnemyFloorTabs = computed<string[]>(() => {
  const floorLabels = Array.from(new Set(allEnemyEntriesForTest.value.map(entry => entry.floorLabel)));
  floorLabels.sort((a, b) => enemyFloorLabelRankForTest(a) - enemyFloorLabelRankForTest(b));
  return ['全部', ...floorLabels];
});
const filteredEnemyEntriesForTest = computed(() => {
  if (selectedEnemyFloorForTest.value === '全部') return allEnemyEntriesForTest.value;
  return allEnemyEntriesForTest.value.filter(entry => entry.floorLabel === selectedEnemyFloorForTest.value);
});
const allEnemyNamesForTest = computed(() => allEnemyEntriesForTest.value.map(entry => entry.name));
const baseRelicsForTest = computed<readonly RelicData[]>(() =>
  [...getAllRelics()].sort((a, b) => {
    const categoryDiff = compareCategory(a.category, b.category);
    if (categoryDiff !== 0) return categoryDiff;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  }),
);
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
  ...relicCategoryGroupsForTest.value.map(group => group.category),
]);
const filteredRelicCategoryGroupsForTest = computed<Array<{ category: string; relics: RelicData[] }>>(() => {
  if (selectedRelicCategoryTab.value === '全部') return relicCategoryGroupsForTest.value;
  return relicCategoryGroupsForTest.value.filter(group => group.category === selectedRelicCategoryTab.value);
});

watch(
  cardCategoryTabsForTest,
  tabs => {
    if (!tabs.includes(selectedCardCategoryTab.value)) {
      selectedCardCategoryTab.value = '全部';
    }
  },
  { immediate: true },
);
watch(
  relicCategoryTabsForTest,
  tabs => {
    if (!tabs.includes(selectedRelicCategoryTab.value)) {
      selectedRelicCategoryTab.value = '全部';
    }
  },
  { immediate: true },
);
watch(
  bondRoleEntries,
  entries => {
    const names = entries.map(entry => entry.name);
    const keepSet = new Set(names);

    const nextUrls: Record<string, string> = {};
    for (const [name, url] of Object.entries(bondPortraitUrls.value)) {
      if (keepSet.has(name)) {
        nextUrls[name] = url;
      }
    }
    if (Object.keys(nextUrls).length !== Object.keys(bondPortraitUrls.value).length) {
      bondPortraitUrls.value = nextUrls;
    }

    const nextErrors: Record<string, boolean> = {};
    for (const [name, hasError] of Object.entries(bondPortraitErrors.value)) {
      if (keepSet.has(name)) {
        nextErrors[name] = hasError;
      }
    }
    if (Object.keys(nextErrors).length !== Object.keys(bondPortraitErrors.value).length) {
      bondPortraitErrors.value = nextErrors;
    }

    const nextFallbackTried: Record<string, boolean> = {};
    for (const [name, tried] of Object.entries(bondPortraitFallbackTried.value)) {
      if (keepSet.has(name)) {
        nextFallbackTried[name] = tried;
      }
    }
    if (Object.keys(nextFallbackTried).length !== Object.keys(bondPortraitFallbackTried.value).length) {
      bondPortraitFallbackTried.value = nextFallbackTried;
    }

    for (const name of names) {
      if (!bondPortraitUrls.value[name]) {
        void ensureBondPortraitLoaded(name);
      }
    }
  },
  { immediate: true, deep: true },
);

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
    case CardType.ACTIVE:
      return 'border-zinc-300/70 text-zinc-100 bg-zinc-100/10';
    case CardType.CURSE:
      return 'border-violet-500/50 text-violet-300 bg-violet-900/20';
    default:
      return 'border-white/30 text-dungeon-paper/80 bg-white/5';
  }
};

const isActiveSkillReward = (item: VictoryRewardItem | null | undefined): item is ActiveSkillData =>
  Boolean(item && item.type === CardType.ACTIVE);

const getVictoryRewardTypeText = (item: VictoryRewardItem) => (isActiveSkillReward(item) ? '主动技能' : '卡牌');

const getCardCategoryStripClass = (category: string) => {
  switch (category) {
    case '基础':
      return 'bg-dungeon-gold/80';
    case '魔导':
      return 'bg-violet-400/85';
    case '燃烧':
      return 'bg-orange-500/85';
    case '严寒':
      return 'bg-sky-400/85';
    case '血池':
      return 'bg-rose-500/85';
    default:
      return 'bg-indigo-400/80';
  }
};

// ── Resolved deck from MVU _技能 via card registry ──
const resolvedDeck = computed<CardData[]>(() => {
  const skills: string[] = gameStore.statData._技能 ?? [];
  return resolveCardNames(skills.filter(s => s !== ''));
});
const resolvedActiveSkills = computed<ActiveSkillData[]>(() => {
  const skills = activeCombatContext.value === 'combatTest'
    ? selectedTestActiveSkills.value
    : (Array.isArray(gameStore.statData.$主动) ? (gameStore.statData.$主动 as string[]) : []);
  return resolveActiveSkillNames(skills.filter(s => s !== ''));
});

// ── Resolved relics from MVU 携带的物品._圣遗物 ──
// Format: { relicName: count } e.g. { "圣杯": 2, "毒药": 3 }
const relicEntries = computed(() => {
  const raw = inventoryRelicMap.value;
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
const LEGACY_RELIC_NAMES_BY_ID: Record<string, string[]> = {
  bloodpool_strawberry: ['草莓'],
  bloodpool_pear: ['梨'],
  bloodpool_mango: ['芒果'],
};
const getOwnedRelicCountById = (id: string): number => {
  const relic = getAllRelics().find(entry => entry.id === id);
  if (!relic) return 0;
  const raw = inventoryRelicMap.value;
  const byName = Number(raw[relic.name] ?? 0);
  const byId = Number(raw[id] ?? 0);
  const byLegacyName = (LEGACY_RELIC_NAMES_BY_ID[id] ?? []).reduce((sum, name) => {
    const value = Number(raw[name] ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const safeByName = Number.isFinite(byName) ? byName : 0;
  const safeById = Number.isFinite(byId) ? byId : 0;
  return Math.max(0, Math.floor(Math.max(safeByName, safeById, byLegacyName)));
};
const BLOODPOOL_PASSIVE_MAX_HP_RELICS: Array<{ id: string; bonus: number }> = [
  { id: 'bloodpool_strawberry', bonus: 7 },
  { id: 'bloodpool_pear', bonus: 10 },
  { id: 'bloodpool_mango', bonus: 13 },
];
const RELIC_DICE_RANGE_BONUS_CONFIG = {
  min: [{ id: 'lucky_coin_small', bonus: 1 }],
  max: [{ id: 'lucky_coin_large', bonus: 1 }],
} as const;
const bloodpoolPassiveMaxHpBonus = computed(() =>
  BLOODPOOL_PASSIVE_MAX_HP_RELICS.reduce((sum, item) => {
    return sum + getOwnedRelicCountById(item.id) * item.bonus;
  }, 0),
);
const canRefreshVictoryReward = computed(
  () =>
    showVictoryRewardView.value &&
    victoryRewardStage.value === 'pick' &&
    rewardIsNormalEnemy.value &&
    !rewardRefreshUsed.value &&
    getOwnedRelicCountById('base_silver_card') > 0,
);
const chestRewardEntries = computed<RelicEntryView[]>(() =>
  chestRewardRelics.value.map(relic => ({
    name: relic.name,
    count: 1,
    rarity: relic.rarity,
    category: relic.category,
    effect: relic.effect,
    description: relic.description ?? relic.effect ?? '',
  })),
);

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
  const centerX = rect.left + rect.width / 2;
  const minX = margin + tooltipWidth / 2;
  const maxX = window.innerWidth - margin - tooltipWidth / 2;
  const x = Math.max(minX, Math.min(centerX, maxX));
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

const showChestRewardTooltip = (event: MouseEvent | FocusEvent, index: number) => {
  const entry = chestRewardEntries.value[index];
  if (!entry) return;
  showRelicTooltip(event, entry);
};

const handleChestRewardTouchStart = (event: TouchEvent, index: number) => {
  const entry = chestRewardEntries.value[index];
  if (!entry) return;
  handleRelicTouchStart(event, entry);
};

const clearChestRewardConfirmTimer = () => {
  if (!chestRewardConfirmTimer) return;
  clearTimeout(chestRewardConfirmTimer);
  chestRewardConfirmTimer = null;
};

const resetChestRewardConfirmation = (hideTooltip = true) => {
  clearChestRewardConfirmTimer();
  pendingChestRewardIndex.value = null;
  if (hideTooltip) {
    hideRelicTooltip();
  }
};

const previewChestRewardForTouch = (target: HTMLElement, index: number) => {
  const entry = chestRewardEntries.value[index];
  if (!entry) return;
  clearChestRewardConfirmTimer();
  showRelicTooltipForTarget(target, entry);
  pendingChestRewardIndex.value = index;
  chestRewardConfirmTimer = setTimeout(() => {
    if (pendingChestRewardIndex.value === index) {
      pendingChestRewardIndex.value = null;
      hideRelicTooltip();
    }
    chestRewardConfirmTimer = null;
  }, 2200);
};

const handleChestRewardClick = (event: MouseEvent, index: number) => {
  if (chestCollecting.value) return;
  if (index < 0 || index >= chestRewardRelics.value.length) return;
  if (chestRewardCollectedFlags.value[index]) return;

  if (!isTouchViewport.value) {
    collectChestReward(index);
    return;
  }

  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;

  if (pendingChestRewardIndex.value === index) {
    resetChestRewardConfirmation(false);
    collectChestReward(index);
    hideRelicTooltip();
    return;
  }

  previewChestRewardForTouch(target, index);
};

const combatRelicMap = computed<Record<string, number>>(() => ({ ...inventoryRelicMap.value }));

watch(
  resolvedDeck,
  cards => {
    if (!Array.isArray(cards) || cards.length === 0) return;
    recordEncounteredCards(cards.map(card => card.id));
  },
  { immediate: true },
);

watch(
  relicEntries,
  entries => {
    if (!Array.isArray(entries) || entries.length === 0) return;
    const ids = entries.map(entry => getRelicByName(entry.name)?.id ?? '').filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    recordEncounteredRelics(ids);
  },
  { immediate: true },
);

watch(
  () => chestRewardRelics.value,
  relics => {
    if (!Array.isArray(relics) || relics.length === 0) return;
    recordEncounteredRelics(relics.map(relic => relic.id));
  },
  { deep: false },
);

watch(
  () => shopProducts.value,
  products => {
    if (!Array.isArray(products) || products.length === 0) return;
    recordEncounteredRelics(products.map(item => item.relic.id));
  },
  { deep: false },
);

watch(
  () => victoryRewardOptions.value,
  cards => {
    if (!Array.isArray(cards) || cards.length === 0) return;
    recordEncounteredCards(cards.map(card => card.id));
  },
  { deep: false },
);

watch(activeModal, modal => {
  if (modal === 'magicBooks' || modal === 'magicHat') {
    gameStore.loadStatData();
  }
  if (modal === 'settings') {
    void refreshBigSummaryChronicleEntries();
  }
  if (modal === 'map') {
    nextTick(() => centerMapOnLatestNode(true));
  }
  if (modal !== 'bonds') {
    closeBondPortraitPreview();
  }
  if (modal !== 'statusDetails') {
    hideRelicTooltip();
  }
  if (modal !== 'settings') {
    closeSettingsHelp();
    closeBigSummaryDraft();
  }
});
watch([playerDetailTab, playerDetailInventoryTab], ([tab, inventoryTab]) => {
  if (tab !== 'inventory' || inventoryTab !== 'relics') {
    hideRelicTooltip();
  }
});
watch(canEditMagicBooks, editable => {
  if (!editable && (activeModal.value === 'magicBooks' || activeModal.value === 'magicHat')) {
    activeModal.value = null;
  }
});

const selectedRelicTotalCount = computed(() =>
  Object.values(selectedTestRelicCounts.value).reduce((sum, value) => sum + Math.max(0, Math.floor(value)), 0),
);

// ── Text display settings (reactive, persisted) ──
type TextSettingsState = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  containerWidth: number;
};

type SettingsNavTab = 'text' | 'music' | 'ai' | 'summary';
type SettingsHelpKey =
  | 'autoSummaryEnabled'
  | 'summaryVisibleWindow'
  | 'manualSummary'
  | 'bigSummaryRange'
  | 'bigSummaryWords'
  | 'bigSummaryEntries';

const TEXT_SETTINGS_KEY = 'dungeon.text_settings.v1';
const AUTO_SCROLL_TOP_ON_REPLY_KEY = 'dungeon.auto_scroll_top_on_reply.v1';
const DEFAULT_TEXT_SETTINGS: TextSettingsState = {
  fontSize: 26,
  lineHeight: 2.0,
  fontFamily: "'Cinzel', serif",
  containerWidth: 1300,
};
const TEXT_FONT_FAMILY_OPTIONS = new Set<string>([
  "'Cinzel', serif",
  "'Inter', sans-serif",
  "'MedievalSharp', cursive",
  "'MaShanZheng', 'KaiTi', serif",
  "'MagicBookTitle', 'KaiTi', serif",
  'serif',
  'sans-serif',
  "'Microsoft YaHei', sans-serif",
  "'SimSun', serif",
  "'KaiTi', serif",
]);

const clampTextSettingNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const normalizeTextSettings = (value: unknown): TextSettingsState => {
  const candidate = value && typeof value === 'object' ? (value as Partial<TextSettingsState>) : {};
  const normalizedFontFamily =
    typeof candidate.fontFamily === 'string' && TEXT_FONT_FAMILY_OPTIONS.has(candidate.fontFamily)
      ? candidate.fontFamily
      : DEFAULT_TEXT_SETTINGS.fontFamily;
  return {
    fontSize: Math.round(clampTextSettingNumber(candidate.fontSize, 12, 40, DEFAULT_TEXT_SETTINGS.fontSize)),
    lineHeight: Number(
      clampTextSettingNumber(candidate.lineHeight, 1.2, 3.0, DEFAULT_TEXT_SETTINGS.lineHeight).toFixed(1),
    ),
    fontFamily: normalizedFontFamily,
    containerWidth:
      Math.round(
        clampTextSettingNumber(candidate.containerWidth, 600, 1600, DEFAULT_TEXT_SETTINGS.containerWidth) / 50,
      ) * 50,
  };
};

const readTextSettings = (): TextSettingsState => {
  try {
    const raw = localStorage.getItem(TEXT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_TEXT_SETTINGS };
    return normalizeTextSettings(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_TEXT_SETTINGS };
  }
};

const persistTextSettings = (value: TextSettingsState) => {
  try {
    localStorage.setItem(TEXT_SETTINGS_KEY, JSON.stringify(normalizeTextSettings(value)));
  } catch {
    // Ignore persistence errors in restricted environments
  }
};

const readAutoScrollTopOnReplyEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(AUTO_SCROLL_TOP_ON_REPLY_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
};

const persistAutoScrollTopOnReplyEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(AUTO_SCROLL_TOP_ON_REPLY_KEY, String(enabled));
  } catch {
    // Ignore persistence errors in restricted environments
  }
};

const textSettings = reactive<TextSettingsState>(readTextSettings());
const isAutoScrollTopOnReplyEnabled = ref(readAutoScrollTopOnReplyEnabled());

const optionButtonFontSize = computed(() =>
  Math.round(clampTextSettingNumber(textSettings.fontSize * (14 / DEFAULT_TEXT_SETTINGS.fontSize), 11, 18, 14)),
);

const optionButtonTextStyle = computed(() => ({
  fontSize: `${optionButtonFontSize.value}px`,
  lineHeight: '1.6',
}));

const specialOptionButtonFontSize = computed(() =>
  Math.round(clampTextSettingNumber(textSettings.fontSize * (16 / DEFAULT_TEXT_SETTINGS.fontSize), 13, 20, 16)),
);

const specialOptionButtonTextStyle = computed(() => ({
  fontSize: `${specialOptionButtonFontSize.value}px`,
  lineHeight: '1.5',
}));

watch(
  textSettings,
  value => {
    persistTextSettings({
      fontSize: value.fontSize,
      lineHeight: value.lineHeight,
      fontFamily: value.fontFamily,
      containerWidth: value.containerWidth,
    });
  },
  { deep: true },
);

watch(isAutoScrollTopOnReplyEnabled, enabled => {
  persistAutoScrollTopOnReplyEnabled(enabled);
});

const isStreamingEnabled = computed<boolean>({
  get: () => gameStore.useStreaming,
  set: value => gameStore.setUseStreaming(value),
});

const isForbidMatchingXmlInsideThinkEnabled = computed<boolean>({
  get: () => gameStore.forbidMatchingXmlInsideThink,
  set: value => gameStore.setForbidMatchingXmlInsideThink(value),
});

const isButtonCompletionEnabled = computed<boolean>({
  get: () => gameStore.buttonCompletionEnabled,
  set: value => gameStore.setButtonCompletionEnabled(value),
});

watch(isButtonCompletionEnabled, enabled => {
  if (!enabled) {
    closeOptionCompletionMenu();
  }
});

const isAutoSummaryEnabled = computed<boolean>({
  get: () => gameStore.autoSummaryEnabled,
  set: value => {
    void gameStore.setAutoSummaryEnabled(value);
  },
});

const summaryVisibleWindowValue = computed<number>({
  get: () => gameStore.summaryVisibleWindow,
  set: value => {
    void gameStore.setSummaryVisibleWindow(value);
  },
});

type BigSummaryDraft = {
  originalSummary: string;
  editedSummary: string;
  rangeStart: number;
  rangeEnd: number;
  entryCount: number;
};

const settingsNavTab = ref<SettingsNavTab>('text');
const isManualSummaryRunning = ref(false);
const normalizeIntegerInput = (value: number, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const BIG_SUMMARY_SETTINGS_KEY = 'dungeon.big_summary_settings.v1';
const DEFAULT_BIG_SUMMARY_SETTINGS = {
  rangeStart: 1,
  rangeEnd: 50,
  minWords: 400,
  maxWords: 700,
};

const normalizeBigSummarySettings = (value: unknown) => {
  const candidate =
    value && typeof value === 'object'
      ? (value as Partial<{ rangeStart: number; rangeEnd: number; minWords: number; maxWords: number }>)
      : {};
  return {
    rangeStart: normalizeIntegerInput(
      candidate.rangeStart ?? DEFAULT_BIG_SUMMARY_SETTINGS.rangeStart,
      DEFAULT_BIG_SUMMARY_SETTINGS.rangeStart,
      0,
      999999,
    ),
    rangeEnd: normalizeIntegerInput(
      candidate.rangeEnd ?? DEFAULT_BIG_SUMMARY_SETTINGS.rangeEnd,
      DEFAULT_BIG_SUMMARY_SETTINGS.rangeEnd,
      0,
      999999,
    ),
    minWords: normalizeIntegerInput(
      candidate.minWords ?? DEFAULT_BIG_SUMMARY_SETTINGS.minWords,
      DEFAULT_BIG_SUMMARY_SETTINGS.minWords,
      50,
      10000,
    ),
    maxWords: normalizeIntegerInput(
      candidate.maxWords ?? DEFAULT_BIG_SUMMARY_SETTINGS.maxWords,
      DEFAULT_BIG_SUMMARY_SETTINGS.maxWords,
      50,
      10000,
    ),
  };
};

const readBigSummarySettings = () => {
  try {
    const raw = localStorage.getItem(BIG_SUMMARY_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_BIG_SUMMARY_SETTINGS };
    return normalizeBigSummarySettings(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_BIG_SUMMARY_SETTINGS };
  }
};

const persistBigSummarySettings = (value: {
  rangeStart: number;
  rangeEnd: number;
  minWords: number;
  maxWords: number;
}) => {
  try {
    localStorage.setItem(BIG_SUMMARY_SETTINGS_KEY, JSON.stringify(normalizeBigSummarySettings(value)));
  } catch {
    // Ignore persistence errors in restricted environments
  }
};

const initialBigSummarySettings = readBigSummarySettings();
const bigSummaryRangeStart = ref(initialBigSummarySettings.rangeStart);
const bigSummaryRangeEnd = ref(initialBigSummarySettings.rangeEnd);
const bigSummaryMinWords = ref(initialBigSummarySettings.minWords);
const bigSummaryMaxWords = ref(initialBigSummarySettings.maxWords);
const bigSummaryChronicleEntries = ref<Array<{ index: number; summary: string }>>([]);
const isBigSummaryEntriesLoading = ref(false);
const isBigSummaryGenerating = ref(false);
const isBigSummaryApplying = ref(false);
const bigSummaryDraft = ref<BigSummaryDraft | null>(null);

watch(settingsNavTab, tab => {
  if (tab === 'summary' && activeModal.value === 'settings') {
    void refreshBigSummaryChronicleEntries();
  }
});

const activeSettingsHelp = ref<SettingsHelpKey | null>(null);
let settingsHelpTouchTimer: number | null = null;
const settingsHelpText: Record<SettingsHelpKey, string> = {
  autoSummaryEnabled:
    '关闭后不会再把每层楼的 <sum> 自动写入总结条目，并且会清空该条目内容，从而停止这部分提示词注入；重新打开后会按历史楼层重新生成。',
  summaryVisibleWindow:
    '该项参数为会将正文完整发送给AI的楼层层数：设置越高，AI对于过往记忆细节越清晰，token数也会增加；设置越低，会降低AI对于过往记忆细节回想，但token数会显著下降。',
  manualSummary:
    '点击后自动补全当前存档的总结至总结条目，用于切换存档或世界书更新后使用（注意！会覆盖大总结内容且不可逆！没事别点。）。',
  bigSummaryRange:
    '决定本次会抽取哪些小总结条目来合并。起始和结束编号都会包含在内，建议每次总结条目在50以内',
  bigSummaryWords:
    '用于约束大总结的目标篇幅。',
  bigSummaryEntries:
    '这里展示自动总结条目中当前可用于合并的所有小总结，并高亮你选中范围内的条目，方便确认本次大总结到底会覆盖哪些内容。',
};

const openSettingsHelp = (key: SettingsHelpKey) => {
  activeSettingsHelp.value = key;
};

const closeSettingsHelp = (key?: SettingsHelpKey) => {
  if (!key || activeSettingsHelp.value === key) {
    activeSettingsHelp.value = null;
  }
};

const normalizedBigSummaryRange = computed<{ start: number; end: number } | null>(() => {
  if (bigSummaryChronicleEntries.value.length === 0) return null;
  const minIndex = bigSummaryChronicleEntries.value[0].index;
  const maxIndex = bigSummaryChronicleEntries.value[bigSummaryChronicleEntries.value.length - 1].index;
  const start = normalizeIntegerInput(bigSummaryRangeStart.value, minIndex, minIndex, maxIndex);
  const end = normalizeIntegerInput(bigSummaryRangeEnd.value, maxIndex, minIndex, maxIndex);
  if (start <= end) return { start, end };
  return { start: end, end: start };
});

const selectedBigSummaryEntryCount = computed<number>(() => {
  const range = normalizedBigSummaryRange.value;
  if (!range) return 0;
  return bigSummaryChronicleEntries.value.filter(entry => entry.index >= range.start && entry.index <= range.end)
    .length;
});

const canGenerateBigSummary = computed<boolean>(
  () =>
    bigSummaryChronicleEntries.value.length > 0 &&
    selectedBigSummaryEntryCount.value > 0 &&
    !gameStore.isGenerating &&
    !isBigSummaryGenerating.value &&
    !isBigSummaryApplying.value,
);

const isBigSummaryDraftEdited = computed<boolean>(() => {
  const draft = bigSummaryDraft.value;
  if (!draft) return false;
  return draft.editedSummary !== draft.originalSummary;
});

const isEntryWithinBigSummaryRange = (index: number): boolean => {
  const range = normalizedBigSummaryRange.value;
  if (!range) return false;
  return index >= range.start && index <= range.end;
};

const refreshBigSummaryChronicleEntries = async () => {
  isBigSummaryEntriesLoading.value = true;
  try {
    const entries = await gameStore.loadAutoSummaryChronicleEntries();
    bigSummaryChronicleEntries.value = entries;
    if (entries.length === 0) return;

    const minIndex = entries[0].index;
    const maxIndex = entries[entries.length - 1].index;
    bigSummaryRangeStart.value = normalizeIntegerInput(bigSummaryRangeStart.value, minIndex, minIndex, maxIndex);
    bigSummaryRangeEnd.value = normalizeIntegerInput(bigSummaryRangeEnd.value, maxIndex, minIndex, maxIndex);
  } finally {
    isBigSummaryEntriesLoading.value = false;
  }
};

const handleGenerateBigSummary = async () => {
  if (!canGenerateBigSummary.value) return;
  isBigSummaryGenerating.value = true;
  try {
    const result = await gameStore.generateBigSummary({
      rangeStart: bigSummaryRangeStart.value,
      rangeEnd: bigSummaryRangeEnd.value,
      minWords: bigSummaryMinWords.value,
      maxWords: bigSummaryMaxWords.value,
    });
    bigSummaryDraft.value = {
      originalSummary: result.summary,
      editedSummary: result.summary,
      rangeStart: result.rangeStart,
      rangeEnd: result.rangeEnd,
      entryCount: result.entryCount,
    };
    toastr.success('大总结生成完成，请确认是否覆盖。');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    toastr.error(`大总结失败：${message}`);
  } finally {
    isBigSummaryGenerating.value = false;
  }
};

const closeBigSummaryDraft = () => {
  if (isBigSummaryApplying.value) return;
  bigSummaryDraft.value = null;
};

const restoreBigSummaryDraft = () => {
  const draft = bigSummaryDraft.value;
  if (!draft) return;
  draft.editedSummary = draft.originalSummary;
};

const confirmApplyBigSummary = async () => {
  const draft = bigSummaryDraft.value;
  if (!draft || isBigSummaryApplying.value) return;

  isBigSummaryApplying.value = true;
  try {
    const result = await gameStore.applyBigSummary({
      rangeStart: draft.rangeStart,
      rangeEnd: draft.rangeEnd,
      summaryText: draft.editedSummary,
    });
    toastr.success(`大总结已覆盖到第 ${result.mergedIndex} 条，并完成范围合并。`);
    bigSummaryDraft.value = null;
    await refreshBigSummaryChronicleEntries();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    toastr.error(`覆盖失败：${message}`);
  } finally {
    isBigSummaryApplying.value = false;
  }
};

watch(
  [bigSummaryRangeStart, bigSummaryRangeEnd, bigSummaryMinWords, bigSummaryMaxWords],
  () => {
    persistBigSummarySettings({
      rangeStart: bigSummaryRangeStart.value,
      rangeEnd: bigSummaryRangeEnd.value,
      minWords: bigSummaryMinWords.value,
      maxWords: bigSummaryMaxWords.value,
    });
  },
  { deep: false },
);

const normalizeVictoryRewardStage = (stage: string | undefined): VictoryRewardStage => {
  switch (stage) {
    case 'replaceActive':
      return 'replaceActive';
    case 'replaceDeck':
    case 'replace':
      return 'replaceDeck';
    default:
      return 'pick';
  }
};

const toggleSettingsHelp = (key: SettingsHelpKey) => {
  activeSettingsHelp.value = activeSettingsHelp.value === key ? null : key;
};

const startSettingsHelpTouch = (key: SettingsHelpKey) => {
  if (settingsHelpTouchTimer !== null) {
    window.clearTimeout(settingsHelpTouchTimer);
  }
  settingsHelpTouchTimer = window.setTimeout(() => {
    activeSettingsHelp.value = key;
    settingsHelpTouchTimer = null;
  }, 360);
};

const endSettingsHelpTouch = (key: SettingsHelpKey) => {
  if (settingsHelpTouchTimer !== null) {
    window.clearTimeout(settingsHelpTouchTimer);
    settingsHelpTouchTimer = null;
  }
  if (activeSettingsHelp.value === key) {
    activeSettingsHelp.value = null;
  }
};

const handleManualSummary = async () => {
  if (gameStore.isGenerating || isManualSummaryRunning.value) return;
  if (!gameStore.autoSummaryEnabled) {
    toastr.warning('请先开启自动总结，再执行手动补全。');
    return;
  }
  isManualSummaryRunning.value = true;
  try {
    const writtenCount = await gameStore.rebuildAutoSummaryChronicleFromMessages();
    if (writtenCount < 0) {
      toastr.error('手动总结失败，请查看控制台日志。');
      return;
    }
    if (writtenCount === 0) {
      toastr.warning('未找到可重建的总结条目或自动总结条目。');
      await refreshBigSummaryChronicleEntries();
      return;
    }
    toastr.success(`手动总结完成，已覆盖写入 ${writtenCount} 条。`);
    await refreshBigSummaryChronicleEntries();
  } finally {
    isManualSummaryRunning.value = false;
  }
};

const selectedBgmTrackId = computed<string>({
  get: () => bgmTrackId.value,
  set: value => setBgmTrack(value),
});

const bgmVolumePercent = computed<number>({
  get: () => Math.round(bgmVolume.value * 100),
  set: value => setBgmVolume(value / 100),
});

/** Strip entire <image>…</image> blocks – used only for streaming preview */
const stripImageBlocks = (text: string) =>
  text
    .replace(/<\s*(?:image|img)(?:\s[^>]*)?>[\s\S]*?<\/\s*(?:image|img)\s*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ── Image-block placeholder system ──
const IMAGE_PLACEHOLDER = '__IMG_BLOCK_';

interface InlineImageBlock {
  openTag: string;
  innerContent: string;
  closeTag: string;
}

/** Replace <image>…</image> blocks with placeholder markers, preserving positions */
const processedMainText = computed<{ text: string; imageBlocks: InlineImageBlock[] }>(() => {
  const raw = gameStore.mainText || '未能检测到正文标签，推测为空回/截断，请查看控制台输出';
  const blocks: InlineImageBlock[] = [];
  const imageRe = /<\s*(?:image|img)(?:\s[^>]*)?>[\s\S]*?<\/\s*(?:image|img)\s*>/gi;
  const replaced = raw.replace(imageRe, fullMatch => {
    const idx = blocks.length;
    const openEnd = fullMatch.indexOf('>') + 1;
    const closeStart = fullMatch.lastIndexOf('<');
    blocks.push({
      openTag: fullMatch.slice(0, openEnd),
      innerContent: fullMatch.slice(openEnd, closeStart),
      closeTag: fullMatch.slice(closeStart),
    });
    return `\n${IMAGE_PLACEHOLDER}${idx}\n`;
  });
  return { text: replaced.replace(/\n{3,}/g, '\n\n').trim(), imageBlocks: blocks };
});

// ── Computed display values from MVU stat_data ──
const streamingDisplayText = computed(() => stripImageBlocks(gameStore.streamingText || ''));
const displayText = computed(() => processedMainText.value.text);

/** Check if a story line is an image-block placeholder; return the block data if so */
function getImageBlockForLine(line: StoryLineBlock): InlineImageBlock | null {
  if (line.segments.length !== 1) return null;
  const txt = line.segments[0].text.trim();
  if (!txt.startsWith(IMAGE_PLACEHOLDER)) return null;
  const idx = parseInt(txt.slice(IMAGE_PLACEHOLDER.length), 10);
  if (Number.isNaN(idx)) return null;
  return processedMainText.value.imageBlocks[idx] ?? null;
}

type MapRoomVisual = {
  icon: string;
  fill: string;
  border: string;
  text: string;
};
type MapPathNodeView = {
  key: string;
  index: number;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  icon: string;
  label: string;
  isLatest: boolean;
  style: Record<string, string>;
};
type MapPathLineView = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const MAP_PATH_COLUMNS = 6;
const MAP_CELL_SIZE = 62;
const MAP_CELL_GAP = 32;
const MAP_MIN_SCALE = 0.6;
const MAP_MAX_SCALE = 2.6;
const MAP_SCALE_STEP = 0.14;
const MAP_ROOM_VISUAL_BY_LABEL: Record<string, MapRoomVisual> = {
  战斗: { icon: '⚔️', fill: 'rgba(153,27,27,0.78)', border: '#ef4444', text: '#fecaca' },
  领主: { icon: '👑', fill: 'rgba(127,29,29,0.84)', border: '#f87171', text: '#ffe4e6' },
  宝箱: { icon: '💎', fill: 'rgba(133,77,14,0.78)', border: '#f59e0b', text: '#fef3c7' },
  商店: { icon: '🏪', fill: 'rgba(20,83,45,0.78)', border: '#34d399', text: '#dcfce7' },
  温泉: { icon: '♨️', fill: 'rgba(12,74,110,0.78)', border: '#38bdf8', text: '#e0f2fe' },
  神像: { icon: '🗿', fill: 'rgba(88,28,135,0.78)', border: '#c084fc', text: '#f3e8ff' },
  事件: { icon: '❓', fill: 'rgba(63,63,70,0.78)', border: '#a1a1aa', text: '#f4f4f5' },
  陷阱: { icon: '⚠️', fill: 'rgba(124,45,18,0.78)', border: '#fb923c', text: '#ffedd5' },
};

const currentFloorPath = computed<string[]>(() => {
  const rawPath = Array.isArray(gameStore.statData.$路径)
    ? gameStore.statData.$路径
    : ((gameStore.statData.$统计 as any)?.$路径 ?? null);
  if (!Array.isArray(rawPath)) return [];
  return rawPath
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0);
});
const currentLayerRoomCount = computed<number>(() => {
  const rawCount = Number((gameStore.statData.$统计 as any)?.当前层已过房间 ?? 0);
  if (!Number.isFinite(rawCount)) return 0;
  return Math.max(0, Math.floor(rawCount));
});
const mapViewportRef = ref<HTMLElement | null>(null);
const mapScale = ref(1);
const mapOffsetX = ref(0);
const mapOffsetY = ref(0);
const mapDragPointerId = ref<number | null>(null);
const mapDragStartClient = ref({ x: 0, y: 0 });
const mapDragStartOffset = ref({ x: 0, y: 0 });
const mapZoomPercent = computed(() => `${Math.round(mapScale.value * 100)}%`);
const mapCurrentRoomLabel = computed(() => currentFloorPath.value[currentFloorPath.value.length - 1] ?? '未记录');

const mapPathNodes = computed<MapPathNodeView[]>(() => {
  const step = MAP_CELL_SIZE + MAP_CELL_GAP;
  return currentFloorPath.value.map((label, index) => {
    const row = Math.floor(index / MAP_PATH_COLUMNS);
    const positionInRow = index % MAP_PATH_COLUMNS;
    const col = row % 2 === 0 ? positionInRow : MAP_PATH_COLUMNS - 1 - positionInRow;
    const x = col * step;
    const y = row * step;
    const visual = MAP_ROOM_VISUAL_BY_LABEL[label] ?? {
      icon: '◻',
      fill: 'rgba(39,39,42,0.78)',
      border: '#a1a1aa',
      text: '#f4f4f5',
    };
    return {
      key: `node-${index}-${label}`,
      index,
      x,
      y,
      centerX: x + MAP_CELL_SIZE / 2,
      centerY: y + MAP_CELL_SIZE / 2,
      icon: visual.icon,
      label,
      isLatest: index === currentFloorPath.value.length - 1,
      style: {
        left: `${x}px`,
        top: `${y}px`,
        background: visual.fill,
        borderColor: visual.border,
        color: visual.text,
      },
    };
  });
});
const mapContentWidth = computed<number>(() => (MAP_PATH_COLUMNS - 1) * (MAP_CELL_SIZE + MAP_CELL_GAP) + MAP_CELL_SIZE);
const mapContentHeight = computed<number>(() => {
  const total = mapPathNodes.value.length;
  const rowCount = total > 0 ? Math.floor((total - 1) / MAP_PATH_COLUMNS) + 1 : 1;
  return (rowCount - 1) * (MAP_CELL_SIZE + MAP_CELL_GAP) + MAP_CELL_SIZE;
});
const mapPathLines = computed<MapPathLineView[]>(() => {
  const nodes = mapPathNodes.value;
  if (nodes.length <= 1) return [];
  const lines: MapPathLineView[] = [];
  for (let i = 1; i < nodes.length; i += 1) {
    const prev = nodes[i - 1]!;
    const curr = nodes[i]!;
    lines.push({
      key: `line-${i - 1}-${i}`,
      x1: prev.centerX,
      y1: prev.centerY,
      x2: curr.centerX,
      y2: curr.centerY,
    });
  }
  return lines;
});
const mapCanvasStyle = computed<Record<string, string>>(() => ({
  width: `${mapContentWidth.value}px`,
  height: `${mapContentHeight.value}px`,
  transform: `translate(${mapOffsetX.value}px, ${mapOffsetY.value}px) scale(${mapScale.value})`,
  transformOrigin: '0 0',
}));

const clampMapScale = (value: number) => Math.max(MAP_MIN_SCALE, Math.min(MAP_MAX_SCALE, value));
const centerMapOnLatestNode = (resetScale: boolean = false) => {
  const viewport = mapViewportRef.value;
  if (!viewport) return;
  if (resetScale) {
    mapScale.value = 1;
  }
  const latest = mapPathNodes.value[mapPathNodes.value.length - 1];
  const focusX = latest ? latest.centerX : mapContentWidth.value / 2;
  const focusY = latest ? latest.centerY : mapContentHeight.value / 2;
  mapOffsetX.value = viewport.clientWidth / 2 - focusX * mapScale.value;
  mapOffsetY.value = viewport.clientHeight / 2 - focusY * mapScale.value;
};
const zoomMap = (delta: number) => {
  const viewport = mapViewportRef.value;
  const nextScale = clampMapScale(mapScale.value + delta);
  if (nextScale === mapScale.value) return;
  if (!viewport) {
    mapScale.value = nextScale;
    return;
  }
  const centerX = viewport.clientWidth / 2;
  const centerY = viewport.clientHeight / 2;
  const worldX = (centerX - mapOffsetX.value) / mapScale.value;
  const worldY = (centerY - mapOffsetY.value) / mapScale.value;
  mapScale.value = nextScale;
  mapOffsetX.value = centerX - worldX * nextScale;
  mapOffsetY.value = centerY - worldY * nextScale;
};
const handleMapZoomIn = () => zoomMap(MAP_SCALE_STEP);
const handleMapZoomOut = () => zoomMap(-MAP_SCALE_STEP);
const handleMapResetView = () => centerMapOnLatestNode(true);
const handleMapWheel = (event: WheelEvent) => {
  zoomMap(event.deltaY < 0 ? MAP_SCALE_STEP : -MAP_SCALE_STEP);
};
const handleMapPointerDown = (event: PointerEvent) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  mapDragPointerId.value = event.pointerId;
  mapDragStartClient.value = { x: event.clientX, y: event.clientY };
  mapDragStartOffset.value = { x: mapOffsetX.value, y: mapOffsetY.value };
  target.setPointerCapture(event.pointerId);
};
const handleMapPointerMove = (event: PointerEvent) => {
  if (mapDragPointerId.value !== event.pointerId) return;
  const dx = event.clientX - mapDragStartClient.value.x;
  const dy = event.clientY - mapDragStartClient.value.y;
  mapOffsetX.value = mapDragStartOffset.value.x + dx;
  mapOffsetY.value = mapDragStartOffset.value.y + dy;
};
const handleMapPointerUp = (event: PointerEvent) => {
  if (mapDragPointerId.value !== event.pointerId) return;
  const target = event.currentTarget as HTMLElement | null;
  if (target) {
    target.releasePointerCapture(event.pointerId);
  }
  mapDragPointerId.value = null;
};
watch(
  () => currentFloorPath.value.length,
  () => {
    if (activeModal.value === 'map') {
      nextTick(() => centerMapOnLatestNode(false));
    }
  },
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
    /^“[^”\r\n]+”$/.test(value) ||
    /^「[^」\r\n]+」$/.test(value) ||
    /^"[^"\r\n]+"$/.test(value) ||
    /^'[^'\r\n]+'$/.test(value)
  );
}

function normalizeTucaoMarkers(text: string): string {
  return (
    text
      // HTML entity forms: &lt;tucao&gt;...&lt;/tucao&gt;
      .replace(/&lt;\s*tucao(?:\s+[^&]*?)?&gt;/gi, '<tucao>')
      .replace(/&lt;\s*\/\s*tucao\s*&gt;/gi, '</tucao>')
      // Alternate bracket forms: [tucao]...[/tucao]
      .replace(/\[\s*tucao\s*]/gi, '<tucao>')
      .replace(/\[\s*\/\s*tucao\s*]/gi, '</tucao>')
      // Chinese tag alias: <吐槽>...</吐槽>
      .replace(/<\s*吐槽(?:\s+[^>]*)?>/gi, '<tucao>')
      .replace(/<\s*\/\s*吐槽\s*>/gi, '</tucao>')
  );
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

watch(
  storyTucaoSections,
  sections => {
    const validKeys = new Set(sections.map(section => section.key));
    const nextState: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(tucaoExpandedState.value)) {
      if (validKeys.has(key)) {
        nextState[key] = value;
      }
    }
    tucaoExpandedState.value = nextState;
  },
  { immediate: true },
);

const isTucaoExpanded = (key: string) => Boolean(tucaoExpandedState.value[key]);
const toggleTucao = (key: string) => {
  tucaoExpandedState.value[key] = !isTucaoExpanded(key);
};

// HP: _血量 / _血量上限, HP 不能超过上限
const displayHp = computed(() => {
  const hp = toNonNegativeInt(gameStore.statData._血量, 10);
  const maxHp = displayMaxHp.value;
  return Math.min(hp, maxHp);
});
const displayMaxHp = computed(() => {
  const baseMaxHp = toNonNegativeInt(gameStore.statData._血量上限, 10);
  return Math.max(1, baseMaxHp + bloodpoolPassiveMaxHpBonus.value);
});
const nextFloorRecoveryHpAfterLord = computed(() => {
  const recoveryFloor = Math.max(1, Math.min(displayMaxHp.value, Math.round(displayMaxHp.value * 0.7)));
  return Math.max(displayHp.value, recoveryFloor);
});

// MP: $魔量 only, no max variable. Visual cap at 20.
const displayMp = computed(() => gameStore.statData.$魔量 ?? 1);

// Gold
const displayGold = computed(() => gameStore.statData._金币 ?? 0);

// Dice range
const displayMinDice = computed(() => gameStore.statData.$最小点数 ?? 0);
const displayMaxDice = computed(() => gameStore.statData.$最大点数 ?? 0);
const relicMinDiceBonus = computed(() =>
  RELIC_DICE_RANGE_BONUS_CONFIG.min.reduce((sum, item) => {
    return sum + getOwnedRelicCountById(item.id) * item.bonus;
  }, 0),
);
const relicMaxDiceBonus = computed(() =>
  RELIC_DICE_RANGE_BONUS_CONFIG.max.reduce((sum, item) => {
    return sum + getOwnedRelicCountById(item.id) * item.bonus;
  }, 0),
);
const effectiveDisplayMinDice = computed(() => {
  const baseMin = toNonNegativeInt(displayMinDice.value, 1);
  return Math.max(1, baseMin + relicMinDiceBonus.value);
});
const effectiveDisplayMaxDice = computed(() => {
  const baseMax = toNonNegativeInt(displayMaxDice.value, 6);
  const withRelic = baseMax + relicMaxDiceBonus.value;
  return Math.max(effectiveDisplayMinDice.value, withRelic);
});
const normalizeNegativeStatusList = (value: unknown): string[] => {
  const normalizeArray = (arr: unknown[]) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of arr) {
      if (typeof item !== 'string') continue;
      const normalized = item.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
    return result;
  };

  if (Array.isArray(value)) return normalizeArray(value);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return normalizeArray(parsed);
    } catch {
      // no-op
    }
    return normalizeArray(trimmed.split(/\r?\n|、|；|;|\|/g));
  }

  return [];
};
const REBIRTH_PERSISTENT_NEGATIVE_STATUSES = new Set<string>(['[淫乱知识]', '[血族印记]']);
const HOT_SPRING_CLEANSE_EXEMPT_NEGATIVE_STATUSES = new Set<string>(['[人格排泄]']);

const NEGATIVE_STATUS_DESCRIPTION_MAP: Record<string, string> = {
  '[信息素]': '每场战斗开始时向你的牌库随机插入3张【信息素】。',
  '[淫纹]': '每场战斗开始时，你获得3层中毒。',
  '[淫乱知识]': '每场战斗开始时向你的牌库随机插入1张【档案污页】。',
  '[被标记]': '战斗房出现概率大幅增加，且每场战斗开始时你获得2层易伤。',
  '[被寄生]': '每场战斗开始时，你获得1层性兴奋。',
  '[败北]': '在地牢中战败，沦为俘虏。',
  '[催淫]': '因中毒量hp归零，后续剧情会体现身体被药性支配。',
  '[神经肌肉失调]': '因电击hp归零，后续剧情会体现神经损伤与痉挛。',
  '[被侵蚀]': '曾因侵蚀hp归零，后续剧情会体现身体被操控。',
  '[血族印记]': '被伊丽莎白支配后留下的烙印，后续剧情会体现其持续影响。',
  '[人格排泄]': '被灌入人格排泄剂，理性与意识融化凝结为人格果冻，灵魂被禁锢于排泄出的果冻中，肉体沦为空壳。',
};
const negativeStatusEntries = computed(() =>
  normalizeNegativeStatusList(gameStore.statData.$负面状态).map(name => ({
    name,
    description:
      NEGATIVE_STATUS_DESCRIPTION_MAP[name] ??
      '如果你看到了这串字，且你没有动变量，那么说明你遇到bug了，请反馈给作者。',
  })),
);
const idolDiceMin = computed(() => Math.max(1, toNonNegativeInt(effectiveDisplayMinDice.value, 1)));
const idolDiceMax = computed(() => Math.max(idolDiceMin.value, toNonNegativeInt(effectiveDisplayMaxDice.value, 6)));

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
  const amount = target === 'gold' ? dice * 2 : target === 'maxHp' ? Math.floor(dice * 1.5) : dice;
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
  '普通物理攻击',
  '普通物理攻击',
  '普通物理攻击',
  '普通魔法攻击',
  '普通魔法攻击',
  '普通护盾',
  '普通护盾',
  '普通闪避',
  '普通闪避',
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
  const currentNegativeStatuses = normalizeNegativeStatusList(gameStore.statData.$负面状态);
  const retainedNegativeStatuses = currentNegativeStatuses.filter(status =>
    REBIRTH_PERSISTENT_NEGATIVE_STATUSES.has(status),
  );
  return {
    _血量: initialMaxHp,
    _血量上限: initialMaxHp,
    $魔量: initialMp,
    _金币: initialGold,
    $技能点: currentSkillPoints + rebirthSkillPointGain,
    _技能: [...REBIRTH_STARTER_DECK],
    $负面状态: retainedNegativeStatuses,
    $被动: '',
    $主动: ['', ''],
    携带的物品: {
      物品: [],
      _圣遗物: {},
      消耗品: [],
    },
    $最大点数: 6,
    $最小点数: 1,
    _楼层数: 1,
    _当前区域: '魔女的小窝',
    _当前房间类型: '',
    $当前事件: '',
    _对手名称: '',
    $是否已击败商人: false,
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
    $路径: [],
  };
};

const resetTransientUiState = () => {
  activeModal.value = null;
  playerDetailTab.value = 'status';
  playerDetailInventoryTab.value = 'items';
  isVariableUpdateOpen.value = false;
  showCombat.value = false;
  showVictoryRewardView.value = false;
  closeShopView();
  closeChestView();
  closeIdolView();
  pendingCombatNarrative.value = null;
  hideRelicTooltip();
  closeBondPortraitPreview();
  closeSettingsHelp();
  clearHotSpringCleanseTimer();
  hotSpringCleanseMessage.value = null;
  requestAnimationFrame(() => updateViewportMetrics());
};

const handleRebirthClick = () => {
  if (gameStore.isGenerating) return;
  resetTransientUiState();
  gameStore.setPendingCombatMvuChanges(null);
  gameStore.setPendingStatDataChanges(buildRebirthResetFields());
  gameStore.sendAction(
    '<user>在死亡边缘触发了回溯，回到了魔女的小窝。当前状态已重置为初始值，请基于回溯后的状态继续剧情。',
  );
};

const isButtonCompletionTargetVisible = (target: ButtonCompletionMenuKey): boolean => {
  switch (target) {
    case 'special':
      return Boolean(gameStore.hasOptionE);
    case 'leave':
      return Boolean(gameStore.hasLeave);
    case 'rebirth':
      return Boolean(gameStore.hasRebirth);
  }
};

const handleOptionCompletionItemClick = async (target: ButtonCompletionMenuKey) => {
  if (gameStore.isGenerating) return;

  if (target === 'special' && !currentRoomSpecialOptionConfig.value) {
    closeOptionCompletionMenu();
    toastr.warning('当前房间没有可补全的特殊选项。');
    return;
  }

  const wasVisible = isButtonCompletionTargetVisible(target);
  gameStore.showManualButtonCompletion(target);

  if (target === 'leave') {
    await nextTick();
    if (portalChoices.value.length === 0) {
      gameStore.hideManualButtonCompletion('leave');
      closeOptionCompletionMenu();
      toastr.warning('当前状态没有可显示的传送门选项。');
      return;
    }
  }

  closeOptionCompletionMenu();

  if (wasVisible) {
    toastr.success('对应按钮已经在当前界面显示。');
    return;
  }

  const successText =
    target === 'special'
      ? '已补全当前房间特殊选项按钮。'
      : target === 'leave'
        ? '已补全传送门按钮。'
        : '已补全重生按钮。';
  toastr.success(successText);
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
  宝箱房: {
    label: '打开宝箱',
    icon: 'fa-solid fa-gem',
    bgColor: 'rgba(161,98,7,0.25)',
    borderColor: '#eab308',
    textColor: '#fde68a',
    glowColor: '#eab30880',
  },
  战斗房: {
    label: '战斗',
    icon: 'fa-solid fa-khanda',
    bgColor: 'rgba(185,28,28,0.25)',
    borderColor: '#dc2626',
    textColor: '#fca5a5',
    glowColor: '#dc262680',
  },
  领主房: {
    label: '战斗',
    icon: 'fa-brands fa-fulcrum',
    bgColor: 'rgba(185,28,28,0.3)',
    borderColor: '#ef4444',
    textColor: '#fca5a5',
    glowColor: '#ef444480',
  },
  商店房: {
    label: '打开商店',
    icon: 'fa-solid fa-store',
    bgColor: 'rgba(21,128,61,0.25)',
    borderColor: '#22c55e',
    textColor: '#bbf7d0',
    glowColor: '#22c55e80',
  },
  温泉房: {
    label: '清除诅咒',
    icon: 'fa-solid fa-spa',
    bgColor: 'rgba(8,145,178,0.25)',
    borderColor: '#06b6d4',
    textColor: '#a5f3fc',
    glowColor: '#06b6d480',
  },
  神像房: {
    label: '膜拜',
    icon: 'fa-solid fa-person-praying',
    bgColor: 'rgba(126,34,206,0.25)',
    borderColor: '#a855f7',
    textColor: '#e9d5ff',
    glowColor: '#a855f780',
  },
};

const currentRoomSpecialOptionConfig = computed<RoomConfig | null>(() => {
  if (isTreasureRoomContext.value) return ROOM_TYPE_CONFIG['宝箱房'];
  if (isShopContext.value) return ROOM_TYPE_CONFIG['商店房'];
  const roomType = gameStore.statData._当前房间类型 as string;
  if (!roomType) return null;
  if (roomType === '事件房' || roomType === '陷阱房') return null;
  return ROOM_TYPE_CONFIG[roomType] ?? null;
});

// E option: no button for 事件房 / 陷阱房
const specialOptionConfig = computed<RoomConfig | null>(() => {
  if (!gameStore.hasOptionE) return null;
  return currentRoomSpecialOptionConfig.value;
});

const optionCompletionMenuItems = computed<
  Array<{ key: ButtonCompletionMenuKey; label: string; marker: string; disabled: boolean }>
>(() => [
  {
    key: 'special',
    label: '当前房间特殊选项',
    marker: 'E',
    disabled: !currentRoomSpecialOptionConfig.value,
  },
  {
    key: 'leave',
    label: '传送门选项',
    marker: '[Leave]',
    disabled: false,
  },
  {
    key: 'rebirth',
    label: '重生选项',
    marker: '[Rebirth]',
    disabled: false,
  },
]);

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
    .filter(line => line.length > 0);
  if (ordered.length === 0) return '（战斗日志为空）';
  return ordered.join('\n');
};

const buildCombatNarrative = (outcome: CombatOutcome, enemyName: string, context: CombatContext, logs: string[]) => {
  const outcomeLine =
    outcome === 'win'
      ? `<user>战斗结果：[胜利]，<user>战胜了${enemyName}。`
      : outcome === 'lose'
        ? `<user>战斗结果：[败北]，<user>被${enemyName}击败。`
        : '<user>战斗结果：[脱离]，一方逃离战斗。';
  const contextLine =
    context === 'shopRobbery'
      ? '<user>本次战斗发生在抢夺商店的冲突中。'
      : context === 'chestMimic'
        ? '<user>本次战斗发生在宝箱怪伏击中。'
        : context === 'combatTest'
          ? '<user>本次战斗来自战斗测试。'
          : '<user>本次战斗发生在地牢探索途中。';
  const followupLine =
    outcome === 'win'
      ? '<user>请根据以下完整战斗日志继续剧情，并体现胜利后的后续发展。'
      : outcome === 'lose'
        ? '<user>请根据以下完整战斗日志继续剧情，并体现战败后的后续发展。'
        : '<user>请根据以下完整战斗日志继续剧情，并体现脱离战斗后的后续发展。';
  return `${outcomeLine}\n${contextLine}\n${followupLine}\n<user>战斗日志（时间顺序）：\n${formatCombatLogs(logs)}`;
};

const sendCombatNarrativeOnce = (narrative: { id: string }, text: string) => {
  if (dispatchedCombatNarrativeIds.has(narrative.id)) return;
  if (gameStore.isGenerating) return;
  dispatchedCombatNarrativeIds.add(narrative.id);
  gameStore.sendAction(text);
};

const queueCombatMvuSync = (outcome: CombatOutcome, finalStats: unknown, negativeEffects: string[]) => {
  const win = outcome === 'win';
  const lose = outcome === 'lose';
  const hpRaw = Number((finalStats as { hp?: unknown } | null | undefined)?.hp);
  const hasHp = Number.isFinite(hpRaw);
  const finalMaxHpRaw = Number((finalStats as { maxHp?: unknown } | null | undefined)?.maxHp);
  const hasFinalMaxHp = Number.isFinite(finalMaxHpRaw);
  const floorRaw = Number(gameStore.statData._楼层数 ?? 1);
  const floor = Number.isFinite(floorRaw) ? Math.max(1, Math.floor(floorRaw)) : 1;
  const goldReward = 2 + floor;
  const bloodPoolCount = getOwnedRelicCountById('bloodpool_blood_pool');
  const stomachMarkCount = getOwnedRelicCountById('bloodpool_stomach_mark');
  const baseMaxHp = toNonNegativeInt(gameStore.statData._血量上限, 10);
  const stomachBonus = Math.max(0, stomachMarkCount);
  const passiveMaxHpBonus = bloodpoolPassiveMaxHpBonus.value;
  const normalizedNegativeEffects = negativeEffects
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  let nextHp = hasHp ? Math.max(0, Math.floor(hpRaw)) : undefined;

  if (win && nextHp !== undefined && bloodPoolCount > 0) {
    const combatMaxHp = hasFinalMaxHp
      ? Math.max(1, Math.floor(finalMaxHpRaw))
      : Math.max(1, baseMaxHp + passiveMaxHpBonus);
    if (nextHp <= Math.floor(combatMaxHp * 0.5)) {
      const maxHpAfterBattle = Math.max(1, baseMaxHp + stomachBonus + passiveMaxHpBonus);
      nextHp = Math.min(maxHpAfterBattle, nextHp + 12 * bloodPoolCount);
    }
  }

  if (stomachBonus > 0) {
    gameStore.mergePendingStatDataChanges({
      _血量上限: Math.max(1, baseMaxHp + stomachBonus),
    });
  }

  gameStore.setPendingCombatMvuChanges({
    hp: nextHp,
    addDefeatMark: lose,
    goldDelta: win ? goldReward : undefined,
    negativeStatusesAdd: normalizedNegativeEffects,
  });
};

const applyMerchantDefeatedShopState = () => {
  for (const item of shopProducts.value) {
    item.finalPrice = 0;
  }
};

const pickUniqueRewardItem = (pool: VictoryRewardItem[], usedIds: Set<string>): VictoryRewardItem | null => {
  const candidates = pool.filter(item => !usedIds.has(item.id));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
};

const buildVictoryRewardOptions = (): VictoryRewardItem[] => {
  const pool: VictoryRewardItem[] = [...rewardCardPool.value, ...rewardActiveSkillPool.value];
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  const isLordRoom = roomType === '领主房';
  const isNormalEnemy = roomType === '战斗房';
  rewardIsNormalEnemy.value = isNormalEnemy;

  const hasRainbowCard = isNormalEnemy && getOwnedRelicCountById('base_rainbow_card') > 0;
  const hasGoldenCard = isNormalEnemy && getOwnedRelicCountById('base_golden_card') > 0;
  const optionCount = 3 + (hasRainbowCard ? 1 : 0);
  const rareChance = isLordRoom ? 1 : hasGoldenCard ? 0.05 : 0.02;

  const normalPool = pool.filter(item => item.rarity === '普通');
  const rarePool = pool.filter(item => item.rarity === '稀有');
  const options: VictoryRewardItem[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < optionCount; i++) {
    const pickRare = isLordRoom || Math.random() < rareChance;
    const primaryPool = pickRare ? rarePool : normalPool;
    let picked = pickUniqueRewardItem(primaryPool, usedIds);
    if (!picked) {
      picked = pickUniqueRewardItem(pool, usedIds);
    }
    if (!picked) continue;
    options.push(picked);
    usedIds.add(picked.id);
  }

  return options;
};

const startVictoryRewardFlow = () => {
  const options = buildVictoryRewardOptions();

  if (options.length === 0) return false;
  rewardRefreshUsed.value = false;
  victoryRewardOptions.value = options;
  selectedVictoryRewardCard.value = null;
  victoryRewardStage.value = 'pick';
  showVictoryRewardView.value = true;
  return true;
};

const refreshVictoryRewardOptions = () => {
  if (!canRefreshVictoryReward.value || rewardApplying.value) return;
  const options = buildVictoryRewardOptions();
  if (options.length === 0) return;
  rewardRefreshUsed.value = true;
  victoryRewardOptions.value = options;
  selectedVictoryRewardCard.value = null;
  victoryRewardStage.value = 'pick';
};

const finalizeVictoryRewardFlow = () => {
  showVictoryRewardView.value = false;
  victoryRewardStage.value = 'pick';
  victoryRewardOptions.value = [];
  selectedVictoryRewardCard.value = null;
  rewardApplying.value = false;
  rewardRefreshUsed.value = false;
  rewardIsNormalEnemy.value = false;
  const narrative = pendingCombatNarrative.value;
  pendingCombatNarrative.value = null;
  if (!narrative) return;
  if (narrative.context === 'shopRobbery') return;
  sendCombatNarrativeOnce(narrative, narrative.text);
};

const exitVictoryRewardFlow = () => {
  finalizeVictoryRewardFlow();
};

const pickVictoryRewardCard = (card: VictoryRewardItem) => {
  selectedVictoryRewardCard.value = card;
  victoryRewardStage.value = isActiveSkillReward(card) ? 'replaceActive' : 'replaceDeck';
};

const replaceDeckCardWithReward = (idx: number) => {
  if (!selectedVictoryRewardCard.value || rewardApplying.value || isActiveSkillReward(selectedVictoryRewardCard.value))
    return;
  const raw = Array.isArray(gameStore.statData._技能) ? [...(gameStore.statData._技能 as string[])].slice(0, 9) : [];
  if (raw.length === 0) {
    raw.push(selectedVictoryRewardCard.value.name);
  } else if (idx >= 0 && idx < raw.length) {
    raw[idx] = selectedVictoryRewardCard.value.name;
  } else {
    return;
  }
  rewardApplying.value = true;
  gameStore.mergePendingStatDataChanges({ _技能: raw });
  finalizeVictoryRewardFlow();
};

const replaceActiveSkillWithReward = (idx: number) => {
  if (!selectedVictoryRewardCard.value || rewardApplying.value || !isActiveSkillReward(selectedVictoryRewardCard.value))
    return;
  if (idx < 0 || idx > 1) return;
  const raw = Array.isArray(gameStore.statData.$主动) ? [...(gameStore.statData.$主动 as string[])].slice(0, 2) : [];
  while (raw.length < 2) raw.push('');
  raw[idx] = selectedVictoryRewardCard.value.name;
  rewardApplying.value = true;
  gameStore.mergePendingStatDataChanges({ $主动: raw });
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
  const targetCount = Math.max(0, 3 + Math.floor(favorForCount / 40));
  const count = Math.min(targetCount, pool.length);
  const usedNames = new Set<string>();
  const discountRate = shopDiscountRate.value;
  const next: ShopProduct[] = [];

  for (let i = 0; i < count; i++) {
    const targetRarity = rollShopRarity();
    let candidates = pool.filter(relic => !usedNames.has(relic.name) && relic.rarity === targetRarity);
    if (candidates.length === 0) {
      candidates = pool.filter(relic => !usedNames.has(relic.name));
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

const getCurrentShopSessionKey = (): string => {
  const area = ((gameStore.statData._当前区域 as string) || '').trim();
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  const floor = Math.max(1, toNonNegativeInt(gameStore.statData._楼层数, 1));
  const roomsPassed = Math.max(0, toNonNegativeInt((gameStore.statData.$统计 as any)?.当前层已过房间, 0));
  return `${floor}|${area}|${roomType}|${roomsPassed}`;
};

const resetShopSession = () => {
  shopSessionKey.value = null;
  shopProducts.value = [];
  shopSpentGold.value = 0;
  shopPurchasedItems.value = [];
  shopEntrySpentGold.value = 0;
  shopEntryPurchasedCount.value = 0;
  shopRobClickCount.value = 0;
  shopRobbing.value = false;
};

const openShopView = () => {
  hideRelicTooltip();
  clearShopRobTimer();
  shopBuying.value = false;
  const nextSessionKey = getCurrentShopSessionKey();
  const shouldRebuild = shopSessionKey.value !== nextSessionKey || shopProducts.value.length === 0;
  if (shouldRebuild) {
    shopSessionKey.value = nextSessionKey;
    shopSpentGold.value = 0;
    shopPurchasedItems.value = [];
    shopEntrySpentGold.value = 0;
    shopEntryPurchasedCount.value = 0;
    shopRobClickCount.value = 0;
    shopRobbing.value = false;
    generateShopProducts();
  }
  // Record a per-opening baseline. Exit only commits purchases made after this point.
  shopEntrySpentGold.value = shopSpentGold.value;
  shopEntryPurchasedCount.value = shopPurchasedItems.value.length;
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

const buildNextRelicInventory = (
  pickedRelic: RelicData,
  baseInventory?: Record<string, number>,
): Record<string, number> => {
  const rawRelics = baseInventory ?? inventoryRelicMap.value;
  const nextRelics: Record<string, number> = {};
  for (const [name, value] of Object.entries(rawRelics as Record<string, number>)) {
    const count = Math.max(0, Math.floor(Number(value ?? 0)));
    if (!name || count <= 0) continue;
    nextRelics[name] = count;
  }
  if (pickedRelic.rarity === '传奇') {
    const existingByName = Math.max(0, Math.floor(Number(nextRelics[pickedRelic.name] ?? 0)));
    const existingById = Math.max(0, Math.floor(Number(nextRelics[pickedRelic.id] ?? 0)));
    if (existingByName > 0 || existingById > 0) {
      return nextRelics;
    }
  }
  nextRelics[pickedRelic.name] = (nextRelics[pickedRelic.name] ?? 0) + 1;
  return nextRelics;
};

const buyShopProduct = (item: ShopProduct) => {
  if (shopBuying.value || item.sold) return;
  const baseGold = Math.max(0, Math.floor(Number(gameStore.statData._金币 ?? 0)));
  const currentGold = Math.max(0, baseGold - shopSpentGold.value);
  if (currentGold < item.finalPrice) {
    return;
  }

  shopBuying.value = true;
  item.sold = true;
  shopSpentGold.value += item.finalPrice;
  shopPurchasedItems.value.push({
    name: item.relic.name,
    rarity: formatRarityLabel(item.relic.rarity),
    price: item.finalPrice,
  });
  hideRelicTooltip();
  shopBuying.value = false;
};

const exitShop = () => {
  if (shopBuying.value || gameStore.isGenerating || shopRobbing.value) return;
  const purchasedStartIndex = Math.max(0, Math.min(shopEntryPurchasedCount.value, shopPurchasedItems.value.length));
  const purchased = shopPurchasedItems.value.slice(purchasedStartIndex).map(item => ({ ...item }));
  const total = Math.max(0, shopSpentGold.value - shopEntrySpentGold.value);
  if (purchased.length > 0) {
    const baseGold = Math.max(0, Math.floor(Number(gameStore.statData._金币 ?? 0)));
    const nextGold = Math.max(0, baseGold - total);
    let nextRelics: Record<string, number> = inventoryRelicMap.value;
    for (const item of purchased) {
      const relic = getRelicByName(item.name);
      if (relic) {
        nextRelics = buildNextRelicInventory(relic, nextRelics);
      } else {
        const fallbackNext: Record<string, number> = {};
        for (const [name, value] of Object.entries(nextRelics as Record<string, number>)) {
          const count = Math.max(0, Math.floor(Number(value ?? 0)));
          if (!name || count <= 0) continue;
          fallbackNext[name] = count;
        }
        fallbackNext[item.name] = (fallbackNext[item.name] ?? 0) + 1;
        nextRelics = fallbackNext;
      }
    }
    gameStore.mergePendingStatDataChanges({
      _金币: nextGold,
      ...buildInventoryUpdateFields({ _圣遗物: nextRelics }),
    });
  }
  const narrative = pendingCombatNarrative.value;
  closeShopView();
  if (narrative && narrative.context === 'shopRobbery' && narrative.outcome === 'win') {
    const lootedText =
      purchased.length > 0
        ? `<user>我在失守的货架上拿走了${purchased.map(item => `${item.name}（${item.rarity}）`).join('，')}。`
        : '<user>我没有额外拿走商店货架上的物品。';
    const report = `${narrative.text}\n${lootedText}\n<user>我离开了商店，请基于战斗结果、战斗日志与离店行为继续后续剧情。`;
    pendingCombatNarrative.value = null;
    sendCombatNarrativeOnce(narrative, report);
    return;
  }

  if (purchased.length === 0) return;
  const purchasedText = purchased.map(item => `${item.name}（${item.rarity}）`).join('，');
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
    void (async () => {
      const launched = await launchCombat('沐芯兰', 'shopRobbery');
      if (launched) {
        closeShopView();
      } else {
        shopRobbing.value = false;
      }
      shopRobTimer = null;
    })();
  }, 1000);
};

const clearShopRobTimer = () => {
  if (!shopRobTimer) return;
  clearTimeout(shopRobTimer);
  shopRobTimer = null;
};

const preparePlayerForCombatStart = async (roomTypeOverride?: string): Promise<boolean> => {
  const difficulty = normalizeDifficulty(gameStore.statData.$难度);
  const roomType = typeof roomTypeOverride === 'string'
    ? roomTypeOverride.trim()
    : ((gameStore.statData._当前房间类型 as string) || '').trim();
  const bloodPoolCount = getOwnedRelicCountById('bloodpool_blood_pool');
  const shouldFullHeal =
    shouldRestoreFullHpOnBattleStart(difficulty)
    || (roomType === '领主房' && bloodPoolCount > 0);
  if (!shouldFullHeal) return true;

  const fullHp = displayMaxHp.value;
  const currentHp = toNonNegativeInt(gameStore.statData._血量, fullHp);
  if (currentHp >= fullHp) return true;
  return await gameStore.updateStatDataFields({ _血量: fullHp });
};

const launchCombat = async (
  enemyName: string,
  context: CombatContext,
  options?: {
    roomTypeOverride?: string;
    testStartAt999?: boolean;
  },
): Promise<boolean> => {
  const ready = await preparePlayerForCombatStart(options?.roomTypeOverride);
  if (!ready) return false;

  combatEnemyName.value = enemyName;
  activeCombatContext.value = context;
  combatTestStartAt999CurrentBattle.value = Boolean(options?.testStartAt999);
  showCombat.value = true;
  return true;
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

const clearChestCloseLongPressTimer = () => {
  if (!chestCloseLongPressTimer) return;
  clearTimeout(chestCloseLongPressTimer);
  chestCloseLongPressTimer = null;
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
  const retainedNegativeStatuses = normalizeNegativeStatusList(gameStore.statData.$负面状态).filter(status =>
    HOT_SPRING_CLEANSE_EXEMPT_NEGATIVE_STATUSES.has(status),
  );
  gameStore.setPendingStatDataChanges({ $负面状态: retainedNegativeStatuses });
  gameStore.sendAction(HOT_SPRING_CLEANSE_ACTION_TEXT);
};

onUnmounted(() => {
  clearShopRobTimer();
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  clearChestCloseLongPressTimer();
  clearChestRewardConfirmTimer();
  clearHotSpringCleanseTimer();
  clearIdolRollTimer();
  closeOptionCompletionMenu();
  closeSettingsHelp();
});

const handleChestBgLoaded = () => {
  if (!showChestView.value) return;
  if (chestStage.value !== 'opened') return;
  if (chestBackgroundUrl.value !== CHEST_BG_OPENED) return;
  chestOpenedBgReady.value = true;
  const hasUncollectedReward = chestRewardRelics.value.some((_, idx) => !chestRewardCollectedFlags.value[idx]);
  if (hasUncollectedReward) {
    chestRewardVisible.value = true;
  }
};

const openChestView = () => {
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  clearChestCloseLongPressTimer();
  clearChestRewardConfirmTimer();
  chestStage.value = 'closed';
  chestRolling.value = false;
  chestRewardRelics.value = [];
  chestRewardCollectedFlags.value = [];
  chestCollecting.value = false;
  chestRewardVisible.value = false;
  chestOpenedBgReady.value = false;
  chestPortalChoices.value = [];
  chestRewardCountFixed.value = null;
  chestCloseCount.value = 0;
  chestForceMimicNextOpen.value = false;
  pendingChestRewardIndex.value = null;
  showChestView.value = true;
};

const closeChestView = () => {
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  clearChestCloseLongPressTimer();
  resetChestRewardConfirmation();
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

  const scale = stageScale.value > 0 ? stageScale.value : 1;
  const stageRect = stageEl.getBoundingClientRect();
  const diceRect = diceEl.getBoundingClientRect();
  const stageWidth = stageEl.clientWidth || stageRect.width / scale;
  const stageHeight = stageEl.clientHeight || stageRect.height / scale;
  const diceWidth = diceRect.width / scale;
  const diceHeight = diceRect.height / scale;
  const maxX = Math.max(0, stageWidth - diceWidth);
  const maxY = Math.max(0, stageHeight - diceHeight);
  const diceCenterX = x + diceWidth / 2;
  const diceCenterY = y + diceHeight / 2;

  let best: IdolSnapCandidate | null = null;
  const targets: IdolBlessingTarget[] = ['maxHp', 'mp', 'gold'];
  for (const target of targets) {
    const slotEl = getIdolSlotElement(target);
    if (!slotEl) continue;
    const slotRect = slotEl.getBoundingClientRect();
    const slotWidth = slotRect.width / scale;
    const slotHeight = slotRect.height / scale;
    const slotCenterX = (slotRect.left - stageRect.left) / scale + slotWidth / 2;
    const slotCenterY = (slotRect.top - stageRect.top) / scale + slotHeight / 2;
    const distance = Math.hypot(slotCenterX - diceCenterX, slotCenterY - diceCenterY);
    const snapX = clampNumber(slotCenterX - diceWidth / 2, 0, maxX);
    const snapY = clampNumber(slotCenterY - diceHeight / 2, 0, maxY);
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
  const scale = stageScale.value > 0 ? stageScale.value : 1;
  const stageRect = stageEl.getBoundingClientRect();
  const diceRect = diceEl.getBoundingClientRect();
  const stageWidth = stageEl.clientWidth || stageRect.width / scale;
  const stageHeight = stageEl.clientHeight || stageRect.height / scale;
  const diceWidth = diceRect.width / scale;
  const diceHeight = diceRect.height / scale;
  const maxX = Math.max(0, stageWidth - diceWidth);
  const maxY = Math.max(0, stageHeight - diceHeight);
  const x = Math.max(0, (stageWidth - diceWidth) / 2);
  const y = clampNumber(stageHeight * 0.72, 0, maxY);
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

  const scale = stageScale.value > 0 ? stageScale.value : 1;
  const stageRect = stageEl.getBoundingClientRect();
  const diceRect = diceEl.getBoundingClientRect();
  const stageWidth = stageEl.clientWidth || stageRect.width / scale;
  const stageHeight = stageEl.clientHeight || stageRect.height / scale;
  const diceWidth = diceRect.width / scale;
  const diceHeight = diceRect.height / scale;
  const maxX = Math.max(0, stageWidth - diceWidth);
  const maxY = Math.max(0, stageHeight - diceHeight);
  const dx = (event.clientX - idolDragStart.value.x) / scale;
  const dy = (event.clientY - idolDragStart.value.y) / scale;
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
  const currentMp = toNonNegativeInt(gameStore.statData.$魔量, 1);
  const currentGold = toNonNegativeInt(gameStore.statData._金币, 0);
  if (reward.target === 'maxHp') {
    return { _血量上限: currentMaxHp + reward.amount };
  }
  if (reward.target === 'mp') {
    return { $魔量: currentMp + reward.amount };
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

const rollChestRewardRarity = (): RelicData['rarity'] => {
  const rarityRoll = Math.random();
  if (rarityRoll < 0.8) return '普通';
  if (rarityRoll < 0.95) return '稀有';
  return '传奇';
};

const rollChestRewardCount = (): number => (Math.random() < 0.8 ? 1 : 2);

const pickChestRewardRelics = (count: number): RelicData[] => {
  const candidatePool = [...selectableRelicPool.value];
  if (candidatePool.length === 0 || count <= 0) return [];

  const picked: RelicData[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const targetRarity = rollChestRewardRarity();
    let candidates = candidatePool.filter(relic => relic.rarity === targetRarity && !usedIds.has(relic.id));
    if (candidates.length === 0) {
      candidates = candidatePool.filter(relic => !usedIds.has(relic.id));
    }
    if (candidates.length === 0) {
      candidates = candidatePool.filter(relic => relic.rarity === targetRarity);
    }
    if (candidates.length === 0) {
      candidates = candidatePool;
    }
    const relic = pickOne(candidates);
    if (!relic) break;
    usedIds.add(relic.id);
    picked.push(relic);
  }

  return picked;
};

const queueChestMimicCombatTransition = () => {
  clearChestMimicTimer();
  chestMimicTimer = setTimeout(() => {
    void (async () => {
      const launched = await launchCombat('宝箱怪', 'chestMimic');
      if (launched) {
        showChestView.value = false;
        chestRolling.value = false;
        chestRewardVisible.value = false;
      }
      chestMimicTimer = null;
    })();
  }, 1000);
};

const closeOpenedChestForRefresh = () => {
  if (chestStage.value !== 'opened' || chestRolling.value || chestCollecting.value) return;
  const hasCollectedAnyReward = chestRewardCollectedFlags.value.some(flag => flag);
  if (hasCollectedAnyReward) {
    toastr.info('已领取过圣遗物，当前宝箱不能关闭刷新。');
    return;
  }
  chestCloseCount.value += 1;
  if (chestCloseCount.value >= 2) {
    chestForceMimicNextOpen.value = true;
  }
  clearChestRewardFadeTimer();
  resetChestRewardConfirmation();
  chestStage.value = 'closed';
  chestRolling.value = false;
  chestCollecting.value = false;
  chestRewardVisible.value = false;
  chestOpenedBgReady.value = false;
  chestRewardRelics.value = [];
  chestRewardCollectedFlags.value = [];
  chestPortalChoices.value = [];
};

const handleChestContextMenu = () => {
  closeOpenedChestForRefresh();
};

const handleChestTouchStart = () => {
  if (chestStage.value !== 'opened') return;
  clearChestCloseLongPressTimer();
  chestCloseLongPressTimer = setTimeout(() => {
    closeOpenedChestForRefresh();
    chestCloseLongPressTimer = null;
  }, 2000);
};

const handleChestTouchEnd = () => {
  clearChestCloseLongPressTimer();
};

const collectChestReward = (index: number) => {
  if (chestCollecting.value) return;
  if (index < 0 || index >= chestRewardRelics.value.length) return;
  if (chestRewardCollectedFlags.value[index]) return;
  resetChestRewardConfirmation(false);
  chestCollecting.value = true;
  chestRewardCollectedFlags.value[index] = true;
  chestCollecting.value = false;

  const allCollected =
    chestRewardCollectedFlags.value.length > 0 && chestRewardCollectedFlags.value.every(flag => flag);
  if (!allCollected) return;

  clearChestRewardFadeTimer();
  chestRewardFadeTimer = setTimeout(() => {
    chestRewardVisible.value = false;
    hideRelicTooltip();
    chestRewardFadeTimer = null;
  }, 260);
};

const handleChestCenterClick = async () => {
  if (chestRolling.value || chestStage.value !== 'closed') return;
  resetChestRewardConfirmation();
  chestRolling.value = true;

  const forcedMimic = chestForceMimicNextOpen.value;
  const openSuccess = !forcedMimic && Math.random() < 0.9;

  if (openSuccess) {
    chestStage.value = 'opened';
    chestOpenedBgReady.value = false;
    chestRewardVisible.value = false;
    const rewardCount = chestRewardCountFixed.value ?? rollChestRewardCount();
    chestRewardCountFixed.value = rewardCount;
    const rewards = pickChestRewardRelics(rewardCount);
    if (rewards.length === 0) {
      chestRolling.value = false;
      return;
    }
    chestRewardRelics.value = rewards;
    chestRewardCollectedFlags.value = rewards.map(() => false);
    chestCollecting.value = false;
    chestPortalChoices.value = generateChestLeavePortals();
    if (chestOpenedBgReady.value) {
      chestRewardVisible.value = true;
    }
    chestRolling.value = false;
    return;
  }

  chestForceMimicNextOpen.value = false;
  chestStage.value = 'mimic';
  chestCollecting.value = false;
  chestRewardVisible.value = false;
  chestPortalChoices.value = [];
  await gameStore.updateStatDataFields({ _对手名称: '宝箱怪' });
  queueChestMimicCombatTransition();
};

const startCombatFromSpecialOption = async () => {
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  const area = ((gameStore.statData._当前区域 as string) || '').trim();

  let enemyName = ((gameStore.statData._对手名称 as string) || '').trim();
  if (!enemyName) {
    enemyName = roomType === '领主房' ? (pickLordMonsterByArea(area) ?? '') : (pickBattleMonsterByArea(area) ?? '');
    if (!enemyName) {
      toastr.warning('当前未找到可战斗的对手。');
      return;
    }
    const ok = await gameStore.updateStatDataFields({ _对手名称: enemyName });
    if (!ok) return;
  }
  await launchCombat(enemyName, 'normal', { roomTypeOverride: roomType });
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

const buildOverlaySnapshot = (): PersistedOverlaySnapshot | null => {
  if (showChestView.value) {
    return {
      version: 1,
      active: 'chest',
      chest: {
        stage: chestStage.value,
        rolling: chestRolling.value,
        rewardRelicIds: chestRewardRelics.value.map(relic => relic.id),
        rewardCollectedFlags: chestRewardRelics.value.map((_, idx) => Boolean(chestRewardCollectedFlags.value[idx])),
        collecting: chestCollecting.value,
        rewardVisible: chestRewardVisible.value,
        openedBgReady: chestOpenedBgReady.value,
        portalChoices: chestPortalChoices.value.map(portal => ({ ...portal })),
        rewardCountFixed: chestRewardCountFixed.value,
        closeCount: chestCloseCount.value,
        forceMimicNextOpen: chestForceMimicNextOpen.value,
      },
    };
  }
  if (showShopView.value) {
    return {
      version: 1,
      active: 'shop',
      shop: {
        products: shopProducts.value.map(item => ({
          key: item.key,
          relicId: item.relic.id,
          basePrice: item.basePrice,
          finalPrice: item.finalPrice,
          sold: item.sold,
        })),
        spentGold: shopSpentGold.value,
        purchasedItems: shopPurchasedItems.value.map(item => ({ ...item })),
        robClickCount: shopRobClickCount.value,
        robbing: shopRobbing.value,
      },
    };
  }
  if (showIdolView.value) {
    return {
      version: 1,
      active: 'idol',
      idol: {
        diceValue: idolDiceValue.value,
        diceRolling: idolDiceRolling.value,
        assignedTarget: idolAssignedTarget.value,
        snapPreviewTarget: idolSnapPreviewTarget.value,
        dicePosition: { ...idolDicePosition.value },
      },
    };
  }
  if (showVictoryRewardView.value) {
    return {
      version: 1,
      active: 'victoryReward',
      victory: {
        stage: victoryRewardStage.value,
        optionRewardIds: victoryRewardOptions.value.map(item => item.id),
        selectedRewardId: selectedVictoryRewardCard.value?.id ?? null,
        refreshUsed: rewardRefreshUsed.value,
        isNormalEnemy: rewardIsNormalEnemy.value,
      },
    };
  }
  return null;
};

const persistOverlaySnapshot = () => {
  if (isRestoringOverlayState.value) return;
  const snapshot = buildOverlaySnapshot();
  if (!snapshot) {
    localStorage.removeItem(OVERLAY_STATE_KEY);
    return;
  }
  try {
    localStorage.setItem(OVERLAY_STATE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage write failure
  }
};

const resolvePersistedPortalChoices = (choices: unknown): PortalChoice[] => {
  if (!Array.isArray(choices)) return [];
  const resolved: PortalChoice[] = [];
  for (const entry of choices) {
    if (!entry || typeof entry !== 'object') continue;
    const portal = entry as Partial<PortalChoice>;
    if (
      typeof portal.label !== 'string' ||
      typeof portal.roomType !== 'string' ||
      typeof portal.icon !== 'string' ||
      typeof portal.bgColor !== 'string' ||
      typeof portal.borderColor !== 'string' ||
      typeof portal.textColor !== 'string' ||
      typeof portal.glowColor !== 'string'
    ) {
      continue;
    }
    resolved.push({
      label: portal.label,
      roomType: portal.roomType,
      areaName: typeof portal.areaName === 'string' ? portal.areaName : undefined,
      floorName: typeof portal.floorName === 'string' ? portal.floorName : undefined,
      isFloorTransition: Boolean(portal.isFloorTransition),
      icon: portal.icon,
      bgColor: portal.bgColor,
      borderColor: portal.borderColor,
      textColor: portal.textColor,
      glowColor: portal.glowColor,
    });
  }
  return resolved;
};

const restoreOverlaySnapshot = () => {
  const raw = localStorage.getItem(OVERLAY_STATE_KEY);
  if (!raw) return;

  let parsed: PersistedOverlaySnapshot | null = null;
  try {
    parsed = JSON.parse(raw) as PersistedOverlaySnapshot;
  } catch {
    localStorage.removeItem(OVERLAY_STATE_KEY);
    return;
  }
  if (!parsed || parsed.version !== 1) {
    localStorage.removeItem(OVERLAY_STATE_KEY);
    return;
  }

  isRestoringOverlayState.value = true;
  try {
    if (parsed.active === 'chest' && parsed.chest) {
      const relics = parsed.chest.rewardRelicIds
        .map(id => relicByIdMap.value.get(id) ?? getRelicById(id))
        .filter((relic): relic is RelicData => Boolean(relic));
      showChestView.value = true;
      chestStage.value = parsed.chest.stage;
      chestRolling.value = Boolean(parsed.chest.rolling);
      chestRewardRelics.value = relics;
      chestRewardCollectedFlags.value = relics.map((_, idx) => Boolean(parsed.chest?.rewardCollectedFlags[idx]));
      chestCollecting.value = false;
      chestRewardVisible.value = Boolean(parsed.chest.rewardVisible);
      chestOpenedBgReady.value = Boolean(parsed.chest.openedBgReady);
      chestPortalChoices.value = resolvePersistedPortalChoices(parsed.chest.portalChoices);
      chestRewardCountFixed.value =
        parsed.chest.rewardCountFixed === null
          ? null
          : Math.max(1, Math.min(2, toNonNegativeInt(parsed.chest.rewardCountFixed, 1)));
      chestCloseCount.value = toNonNegativeInt(parsed.chest.closeCount, 0);
      chestForceMimicNextOpen.value = Boolean(parsed.chest.forceMimicNextOpen);
      if (chestStage.value === 'mimic') {
        queueChestMimicCombatTransition();
      }
      return;
    }

    if (parsed.active === 'shop' && parsed.shop) {
      const products: ShopProduct[] = [];
      for (const [idx, product] of parsed.shop.products.entries()) {
        const relic = relicByIdMap.value.get(product.relicId) ?? getRelicById(product.relicId);
        if (!relic) continue;
        products.push({
          key: product.key || `${relic.id}-${idx}`,
          relic,
          basePrice: Math.max(0, toNonNegativeInt(product.basePrice, 0)),
          finalPrice: Math.max(0, toNonNegativeInt(product.finalPrice, 0)),
          sold: Boolean(product.sold),
        });
      }
      showShopView.value = true;
      shopProducts.value = products;
      shopSpentGold.value = Math.max(0, toNonNegativeInt(parsed.shop.spentGold, 0));
      shopPurchasedItems.value = Array.isArray(parsed.shop.purchasedItems)
        ? parsed.shop.purchasedItems
            .filter(item => item && typeof item.name === 'string')
            .map(item => ({
              name: item.name,
              rarity: typeof item.rarity === 'string' ? item.rarity : '普通',
              price: Math.max(0, toNonNegativeInt(item.price, 0)),
            }))
        : [];
      shopRobClickCount.value = Math.max(0, toNonNegativeInt(parsed.shop.robClickCount, 0));
      shopRobbing.value = Boolean(parsed.shop.robbing);
      shopSessionKey.value = getCurrentShopSessionKey();
      shopBuying.value = false;
      return;
    }

    if (parsed.active === 'idol' && parsed.idol) {
      showIdolView.value = true;
      idolDiceValue.value = clampNumber(
        toNonNegativeInt(parsed.idol.diceValue, idolDiceMin.value),
        idolDiceMin.value,
        idolDiceMax.value,
      );
      idolDiceRolling.value = false;
      idolAssignedTarget.value = parsed.idol.assignedTarget;
      idolSnapPreviewTarget.value = parsed.idol.snapPreviewTarget;
      idolDicePosition.value = {
        x: Number.isFinite(parsed.idol.dicePosition?.x) ? parsed.idol.dicePosition.x : 0,
        y: Number.isFinite(parsed.idol.dicePosition?.y) ? parsed.idol.dicePosition.y : 0,
      };
      idolDragPointerId.value = null;
      return;
    }

    if (parsed.active === 'victoryReward' && parsed.victory) {
      const victoryData = parsed.victory as PersistedVictoryState & {
        optionCardIds?: string[];
        selectedCardId?: string | null;
        stage?: VictoryRewardStage | 'replace';
      };
      const optionIds = Array.isArray(victoryData.optionRewardIds)
        ? victoryData.optionRewardIds
        : Array.isArray(victoryData.optionCardIds)
          ? victoryData.optionCardIds
          : [];
      const options = optionIds
        .map(id => cardByIdMap.value.get(id) ?? activeSkillByIdMap.value.get(id))
        .filter((item): item is VictoryRewardItem => Boolean(item));
      if (options.length === 0) {
        localStorage.removeItem(OVERLAY_STATE_KEY);
        return;
      }
      const selectedId = victoryData.selectedRewardId ?? victoryData.selectedCardId ?? null;
      const restoredStage = normalizeVictoryRewardStage(victoryData.stage);
      showVictoryRewardView.value = true;
      victoryRewardStage.value = restoredStage;
      victoryRewardOptions.value = options;
      selectedVictoryRewardCard.value = selectedId
        ? (cardByIdMap.value.get(selectedId) ?? activeSkillByIdMap.value.get(selectedId) ?? null)
        : null;
      rewardApplying.value = false;
      rewardRefreshUsed.value = Boolean(parsed.victory.refreshUsed);
      rewardIsNormalEnemy.value = Boolean(parsed.victory.isNormalEnemy);
      return;
    }

    localStorage.removeItem(OVERLAY_STATE_KEY);
  } finally {
    isRestoringOverlayState.value = false;
  }
};

watch(
  [
    showChestView,
    showShopView,
    showIdolView,
    showVictoryRewardView,
    chestStage,
    chestRolling,
    chestRewardRelics,
    chestRewardCollectedFlags,
    chestCollecting,
    chestRewardVisible,
    chestOpenedBgReady,
    chestPortalChoices,
    chestRewardCountFixed,
    chestCloseCount,
    chestForceMimicNextOpen,
    shopProducts,
    shopSpentGold,
    shopPurchasedItems,
    shopRobClickCount,
    shopRobbing,
    idolDiceValue,
    idolDiceRolling,
    idolAssignedTarget,
    idolSnapPreviewTarget,
    idolDicePosition,
    victoryRewardStage,
    victoryRewardOptions,
    selectedVictoryRewardCard,
    rewardRefreshUsed,
    rewardIsNormalEnemy,
  ],
  () => {
    persistOverlaySnapshot();
  },
  { deep: true },
);

const handleButtonCompletionOutsidePointerDown = (event: PointerEvent) => {
  if (!optionCompletionMenuOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (buttonCompletionMenuRef.value?.contains(target)) return;
  closeOptionCompletionMenu();
};

onMounted(() => {
  restoreOverlaySnapshot();
  void initPlayerPortraitPreviewUrl();
  nextTick(() => {
    updateViewportMetrics();
    if (typeof ResizeObserver !== 'undefined' && viewportRef.value) {
      viewportResizeObserver = new ResizeObserver(() => {
        updateViewportMetrics();
      });
      viewportResizeObserver.observe(viewportRef.value);
    }
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleViewportResize, { passive: true });
    window.addEventListener('orientationchange', handleViewportResize, { passive: true });
    window.visualViewport?.addEventListener('resize', handleViewportResize, { passive: true });
    document.addEventListener('fullscreenchange', handleViewportResize);
    document.addEventListener('pointerdown', handleButtonCompletionOutsidePointerDown);
    inputWaitingDotsTimer = window.setInterval(() => {
      if (!gameStore.isGenerating) return;
      inputWaitingDotsStep.value = (inputWaitingDotsStep.value % 3) + 1;
    }, 420);
  }
});

watch(
  () => gameStore.isGenerating,
  (isGenerating, wasGenerating) => {
    if (isGenerating) {
      closeOptionCompletionMenu();
    }
    if (!isGenerating) {
      inputWaitingDotsStep.value = 1;
      if (wasGenerating && isAutoScrollTopOnReplyEnabled.value) {
        nextTick(() => {
          const container = storyTextContainerRef.value;
          if (!container) return;
          container.scrollTop = 0;
        });
      }
    }
  },
);

// ══════════════════════════════════════════════════════════════
//  [Leave] Portal System — Floor/Area Logic
// ══════════════════════════════════════════════════════════════

interface FloorMonsterConfig {
  common: string[];
  uniqueByArea: Record<string, string[]>;
}

// 基于 EJS魔物.txt 的楼层怪物池；结合区域条目标注的“特有魔物”建立区域限制
const FLOOR_MONSTER_CONFIG: Record<string, FloorMonsterConfig> = {
  第一层: {
    common: ['游荡粘液球', '荧光蛾', '根须潜行者'],
    uniqueByArea: {
      粘液之沼: ['沼泽潜伏者', '拟态气泡怪'],
      发情迷雾森林: ['迷雾精怪', '藤蔓行者'],
      喷精泉眼: ['泉水精魄', '潜伏触手怪'],
      触手菌窟: ['穴居触手'],
      肉欲食人花圃: ['极乐蜜蜂', '花粉喷射者'],
    },
  },
  第二层: {
    common: ['浮游书页', '墨痕鼠', '低语幽灵'],
    uniqueByArea: {
      禁忌图书馆: ['书魔', '墨水史莱姆'],
      呻吟阅览室: ['椅子拟态怪', '桌面触手'],
      催情墨染湖: ['墨团怪', '触手羽毛笔'],
      性癖记录馆: ['窥视之眼', '羞耻阴影'],
      淫乱教职工宿舍: ['堕落学者', '宿舍幽灵'],
    },
  },
  第三层: {
    common: ['巡逻铁蝠', '荆棘匍匐者', '影牢使魔'],
    uniqueByArea: {
      欲望监狱: ['刺链蛇', '惩戒傀儡', '羞耻蛭'],
      吸血鬼古堡: ['血蝙蝠', '血仆', '梦魇驹'],
      调教审判庭: ['审判蛛', '证词虫', '刽子手偶'],
      触手水牢: ['深渊水母', '寄生水蛭'],
      人偶工坊: ['缝合蜘蛛', '丝线傀儡', '测试者'],
    },
  },
  第四层: {
    common: ['虚空游光', '面具侍从', '空间裂隙虫'],
    uniqueByArea: {
      虚空宫殿: ['肉壁蠕虫'],
      镜之舞厅: ['镜像分身', '碎镜蝠'],
      双子寝宫: ['梦魇蛾', '枕头精'],
      春梦回廊: ['画框捕食者'],
      极乐宴会厅: ['侍宴者'],
    },
  },
  第五层: {
    common: ['祈祷烛灵', '圣痕蝶', '忏悔天使'],
    uniqueByArea: {
      交媾祭坛: ['祭司傀儡', '神恩触手'],
      圣水之海: ['圣水水母', '深渊鱼群', '圣水精灵'],
      苦修之路: ['晶体刺猬', '苦修幽灵'],
      神谕淫纹室: ['符文精灵', '光球守卫'],
      女神的产房: ['胎儿魔物', '脐带触手'],
    },
  },
};

// 领主顺序严格按 FLOOR_MONSTER_CONFIG 的区域顺序映射。
const LORD_MONSTER_ORDER: string[] = [
  '普莉姆',
  '宁芙',
  '温蒂尼',
  '玛塔',
  '罗丝',
  '厄休拉',
  '希尔薇',
  '因克',
  '阿卡夏',
  '多萝西',
  '维罗妮卡',
  '伊丽莎白',
  '尤斯蒂娅',
  '克拉肯',
  '布偶',
  '赛琳娜',
  '米拉',
  '梦魔双子',
  '贝希摩斯',
  '佩恩',
  '西格尔',
  '摩尔',
  '利维坦',
  '奥赛罗',
  '盖亚',
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

function pickOne<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickBattleMonsterByArea(area: string): string | null {
  const floor = getFloorForArea(area) ?? '第一层';
  const config = FLOOR_MONSTER_CONFIG[floor];
  if (!config) return null;

  // 等概率：普通池 + 当前区域特有池 合并后随机（去重避免重复项改变概率）
  const mergedPool = Array.from(new Set([...config.common, ...(config.uniqueByArea[area] ?? [])]));
  return pickOne(mergedPool);
}

function pickLordMonsterByArea(area: string): string | null {
  const lordName = LORD_MONSTER_BY_AREA[area];
  if (!lordName) return null;
  return lordName;
}

// ── Portal visuals ──
const PORTAL_ROOM_TYPES = ['战斗房', '宝箱房', '商店房', '温泉房', '神像房', '事件房', '陷阱房'];
const PORTAL_ROOM_WEIGHTS: Record<string, number> = {
  战斗房: 35,
  宝箱房: 20,
  商店房: 12,
  温泉房: 12,
  神像房: 16,
  事件房: 0,
  陷阱房: 5,
};
const TRAP_POOL_BY_AREA: Record<string, string[]> = {
  粘液之沼: ['粘液深坑', '史莱姆的温床'],
  发情迷雾森林: ['迷雾漩涡', '活体树洞', '树精的共生茧'],
  喷精泉眼: ['间歇性喷泉', '深水陷阱', '圣泉倒灌'],
  肉欲食人花圃: ['诱惑陷阱', '粘性花蜜池'],
  触手菌窟: ['孢子爆炸', '活体陷阱'],

  禁忌图书馆: ['幻境之书', '禁言束缚'],
  // 呻吟阅览室：无陷阱（传送门中会移除陷阱房）
  催情墨染湖: ['强制纹身', '墨汁洗礼', '沉溺之爱'],
  性癖记录馆: ['公开处刑'],
  淫乱教职工宿舍: ['催眠广播', '强制派对'],

  欲望监狱: ['自动拘束床', '审讯室陷阱', '矫正项圈'],
  吸血鬼古堡: ['魅惑血雾', '血契房间'],
  调教审判庭: ['真言之椅', '雷霆忏悔席'],
  触手水牢: ['伪装平台', '嵌墙活体标本'],
  人偶工坊: ['丝线操控', '强制装配台'],

  虚空宫殿: ['重力反转', '维度分割展台'],
  镜之舞厅: ['镜像置换', '自我对峙', '无尽回廊'],
  双子寝宫: ['永恒春梦', '梦境具现', '双子的探访'],
  春梦回廊: ['记忆囚笼', '梦魇骑行'],
  极乐宴会厅: ['欲望之酒', '暴食者的终宴'],

  交媾祭坛: ['神圣跪拜', '献祭仪式'],
  圣水之海: ['圣水灌注', '溺亡的极乐', '依赖成瘾'],
  苦修之路: ['感官过载', '镜中诱惑', '跌倒的代价'],
  神谕淫纹室: ['强制烙印', '欲望显现', '连锁反应'],
  女神的产房: ['强制受孕', '母性陷阱', '子宫回归'],
};

const ALL_TRAPS = Object.values(TRAP_POOL_BY_AREA).flat();
const NO_CONSECUTIVE_PORTAL_ROOM_TYPES = new Set(['宝箱房', '神像房']);
const PATH_LABEL_TO_ROOM_TYPE: Record<string, string> = {
  战斗: '战斗房',
  宝箱: '宝箱房',
  商店: '商店房',
  温泉: '温泉房',
  神像: '神像房',
  事件: '事件房',
  陷阱: '陷阱房',
  领主: '领主房',
};

const pickTrapByArea = (area: string): string | null => {
  const pool = TRAP_POOL_BY_AREA[area] ?? [];
  if (pool.length > 0) return pickOne(pool);
  if (ALL_TRAPS.length > 0) return pickOne(ALL_TRAPS);
  return null;
};

const getCurrentFloorPathLabels = (): string[] => {
  const path = gameStore.statData.$路径;
  if (!Array.isArray(path)) return [];
  return path.map(item => (typeof item === 'string' ? item.trim() : '')).filter(item => item.length > 0);
};

const getLastPathRoomType = (pathLabels: string[]): string => {
  const lastLabel = pathLabels[pathLabels.length - 1] ?? '';
  return PATH_LABEL_TO_ROOM_TYPE[lastLabel] ?? '';
};

const getAvailablePortalRoomTypes = (currentArea: string, currentRoomType: string) => {
  const pathLabels = getCurrentFloorPathLabels();
  const effectiveCurrentRoomType = currentRoomType.trim() || getLastPathRoomType(pathLabels);
  const hasShopThisFloor = pathLabels.includes('商店') || effectiveCurrentRoomType === '商店房';

  let availableRoomTypes = [...PORTAL_ROOM_TYPES];

  if (parseMerchantDefeatedValue(gameStore.statData.$是否已击败商人) || hasShopThisFloor) {
    availableRoomTypes = availableRoomTypes.filter(type => type !== '商店房');
  }
  if (currentArea === '呻吟阅览室') {
    availableRoomTypes = availableRoomTypes.filter(type => type !== '陷阱房');
  }
  if (NO_CONSECUTIVE_PORTAL_ROOM_TYPES.has(effectiveCurrentRoomType)) {
    availableRoomTypes = availableRoomTypes.filter(type => type !== effectiveCurrentRoomType);
  }

  return availableRoomTypes;
};

interface PortalVisual {
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
}

const PORTAL_ROOM_VISUALS: Record<string, PortalVisual> = {
  战斗房: {
    icon: '⚔️',
    bgColor: 'rgba(127,29,29,0.5)',
    borderColor: '#991b1b',
    textColor: '#fca5a5',
    glowColor: '#dc2626',
  },
  宝箱房: {
    icon: '💎',
    bgColor: 'rgba(113,63,18,0.5)',
    borderColor: '#a16207',
    textColor: '#fde68a',
    glowColor: '#eab308',
  },
  商店房: {
    icon: '🏪',
    bgColor: 'rgba(20,83,45,0.5)',
    borderColor: '#166534',
    textColor: '#bbf7d0',
    glowColor: '#22c55e',
  },
  温泉房: {
    icon: '♨️',
    bgColor: 'rgba(22,78,99,0.5)',
    borderColor: '#155e75',
    textColor: '#a5f3fc',
    glowColor: '#06b6d4',
  },
  神像房: {
    icon: '🗿',
    bgColor: 'rgba(88,28,135,0.5)',
    borderColor: '#7e22ce',
    textColor: '#e9d5ff',
    glowColor: '#a855f7',
  },
  事件房: {
    icon: '❓',
    bgColor: 'rgba(63,63,70,0.5)',
    borderColor: '#52525b',
    textColor: '#d4d4d8',
    glowColor: '#71717a',
  },
  陷阱房: {
    icon: '⚠️',
    bgColor: 'rgba(124,45,18,0.5)',
    borderColor: '#9a3412',
    textColor: '#fed7aa',
    glowColor: '#ea580c',
  },
  领主房: {
    icon: '👑',
    bgColor: 'rgba(127,29,29,0.6)',
    borderColor: '#dc2626',
    textColor: '#fca5a5',
    glowColor: '#ef4444',
  },
};
const AREA_PORTAL_VISUAL: PortalVisual = {
  icon: '🌀',
  bgColor: 'rgba(79,70,229,0.5)',
  borderColor: '#6366f1',
  textColor: '#c7d2fe',
  glowColor: '#818cf8',
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
  // 传送门数量概率：1/2/3 = 45% / 40% / 15%
  return roll < 0.45 ? 1 : roll < 0.85 ? 2 : 3;
}

const NEGATIVE_STATUS_MARKED = '[被标记]';
const MARKED_BATTLE_ROOM_WEIGHT = 95;

function pickWeightedRoomTypes(roomTypes: string[], count: number): string[] {
  const picked: string[] = [];
  if (roomTypes.length === 0 || count <= 0) return picked;
  const hasMarkedNegativeStatus = normalizeNegativeStatusList(gameStore.statData.$负面状态).includes(
    NEGATIVE_STATUS_MARKED,
  );

  // 允许可重复抽取：每次都从同一候选池按权重抽取，不移除已抽中的房间类型
  const weightedPool = roomTypes.map(type => ({
    type,
    weight:
      type === '战斗房' && hasMarkedNegativeStatus
        ? MARKED_BATTLE_ROOM_WEIGHT
        : Math.max(0, PORTAL_ROOM_WEIGHTS[type] ?? 0),
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
  const availableRoomTypes = getAvailablePortalRoomTypes(currentArea, currentRoomType);
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
  const rooms = (gameStore.statData.$统计 as any)?.当前层已过房间 ?? 0;
  const merchantDefeated = parseMerchantDefeatedValue(gameStore.statData.$是否已击败商人);
  const hasMarkedNegativeStatus = normalizeNegativeStatusList(gameStore.statData.$负面状态).includes(
    NEGATIVE_STATUS_MARKED,
  );
  const pathFingerprint = getCurrentFloorPathLabels().join('>');
  const fingerprint = `${area}|${roomType}|${rooms}|${merchantDefeated ? 1 : 0}|${hasMarkedNegativeStatus ? 1 : 0}|${pathFingerprint}`;
  if (fingerprint !== cachedPortalFingerprint) {
    cachedPortalFingerprint = fingerprint;
    cachedPortals = generatePortals();
  }
  return cachedPortals;
});

// ── Room type → $统计 field mapping ──
const ROOM_STAT_KEY: Record<string, string> = {
  战斗房: '累计经过战斗',
  宝箱房: '累计经过宝箱',
  商店房: '累计经过商店',
  温泉房: '累计经过温泉',
  神像房: '累计经过神像',
  事件房: '累计经过事件',
  陷阱房: '累计经过陷阱',
};
const getPathLabelByRoomType = (roomType: string): string =>
  roomType.endsWith('房') ? roomType.slice(0, -1) : roomType;

interface QueuedPortalAction {
  actionText: string;
  enterText: string;
  pendingStatDataFields?: Record<string, any>;
}

const buildQueuedPortalAction = (portal: PortalChoice): QueuedPortalAction => {
  if (portal.isFloorTransition) {
    const currentRoomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
    const pendingStatDataFields = currentRoomType === '领主房'
      ? {
          // 仅写入“下一层 user 楼层”的待应用变量，不直接修改当前领主房楼层。
          _血量: nextFloorRecoveryHpAfterLord.value,
        }
      : undefined;
    // 记录待应用变量：进入新区域，首个房间为宝箱房，重置房间计数
    gameStore.setPendingPortalChanges({
      area: portal.areaName!,
      roomType: '宝箱房',
      resetRoomCounter: true,
      resetPath: true,
      // 新区域首个房间同样计入统计：宝箱房 +1、累计总房间 +1、当层房间 +1
      incrementKeys: ['当前层已过房间', '累计已过房间', '累计经过宝箱'],
      appendPathLabel: '宝箱',
      enemyName: '',
    });
    console.info(`[Portal] Floor transition queued → area: ${portal.areaName}, first room: 宝箱房`);
    const enterText = `进入了${portal.areaName}的宝箱房`;
    return {
      enterText,
      actionText: `<user>选择了继续前进，${enterText}`,
      pendingStatDataFields,
    };
  }

  // 记录待应用变量：进入新房间，更新统计
  const incrementKeys = ['当前层已过房间', '累计已过房间'];
  const statKey = ROOM_STAT_KEY[portal.roomType];
  if (statKey) incrementKeys.push(statKey);
  const currentArea = (gameStore.statData._当前区域 as string) || '';
  const encounterMonster =
    portal.roomType === '领主房'
      ? pickLordMonsterByArea(currentArea)
      : portal.roomType === '战斗房'
        ? pickBattleMonsterByArea(currentArea)
        : null;
  const trapName = portal.roomType === '陷阱房' ? pickTrapByArea(currentArea) : null;
  const trapHpAfterDamage =
    portal.roomType === '陷阱房' ? Math.max(1, toNonNegativeInt(gameStore.statData._血量, 1) - 5) : undefined;
  let pendingStatDataFields: Record<string, any> | undefined;
  if (portal.roomType === '陷阱房') {
    pendingStatDataFields = {
      $当前事件: trapName ?? '',
      _血量: trapHpAfterDamage,
    };
  } else if (portal.roomType === '温泉房') {
    const maxHp = Math.max(1, displayMaxHp.value);
    pendingStatDataFields = {
      _血量: maxHp,
    };
  }

  gameStore.setPendingPortalChanges({
    roomType: portal.roomType,
    incrementKeys,
    appendPathLabel: getPathLabelByRoomType(portal.roomType),
    enemyName: encounterMonster ?? '',
  });
  console.info(`[Portal] Room transition queued → type: ${portal.roomType}`);

  const enterText =
    (portal.roomType === '战斗房' || portal.roomType === '领主房') && encounterMonster
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
  const currentRoomType = (gameStore.statData._当前房间类型 as string) || '';
  const availableRoomTypes = getAvailablePortalRoomTypes(currentArea, currentRoomType);
  if (availableRoomTypes.length === 0) return [];
  const count = rollPortalCount();
  const picked = pickWeightedRoomTypes(availableRoomTypes, count);
  return picked.map(rt => ({ label: rt, roomType: rt, isFloorTransition: false, ...PORTAL_ROOM_VISUALS[rt] }));
}

const handlePortalClick = async (portal: PortalChoice) => {
  if (gameStore.isGenerating) return;
  resetShopSession();
  const { actionText, pendingStatDataFields } = buildQueuedPortalAction(portal);
  gameStore.setPendingStatDataChanges(pendingStatDataFields ?? null);
  gameStore.sendAction(actionText);
};

const handleChestPortalClick = async (portal: PortalChoice) => {
  if (gameStore.isGenerating || chestCollecting.value || chestStage.value !== 'opened') return;
  resetShopSession();
  const { actionText, enterText, pendingStatDataFields } = buildQueuedPortalAction(portal);
  const collectedRelics = chestRewardRelics.value.filter((_, idx) => chestRewardCollectedFlags.value[idx]);
  const mergedPendingStatDataFields: Record<string, any> = {
    ...(pendingStatDataFields ?? {}),
  };
  if (collectedRelics.length > 0) {
    // 宝箱奖励遵循与传送门一致的“延迟写入”策略：仅在点击传送门时排队到下一层 user 楼层
    let nextRelics: Record<string, number> = inventoryRelicMap.value;
    for (const relic of collectedRelics) {
      nextRelics = buildNextRelicInventory(relic, nextRelics);
    }
    Object.assign(mergedPendingStatDataFields, buildInventoryUpdateFields({ _圣遗物: nextRelics }));
  }
  gameStore.setPendingStatDataChanges(
    Object.keys(mergedPendingStatDataFields).length > 0 ? mergedPendingStatDataFields : null,
  );

  const relicNameText = collectedRelics.map(relic => relic.name).join('、');
  closeChestView();
  if (relicNameText) {
    gameStore.sendAction(
      `<user>打开了箱子并从中获取了圣遗物${relicNameText}，随后离开了当前房间并进入了下一个房间，<user>${enterText}`,
    );
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

const handleCombatTestButtonClick = async () => {
  if (isCombatTestUnlocked.value) {
    openCombatTestBuilder();
    return;
  }

  const password = window.prompt('请输入作者测试密码');
  if (password === null) return;

  const verified = await verifyAuthorTestPassword(password);
  if (!verified) {
    toastr.error('密码错误。');
    return;
  }

  unlockAuthorTestAccess();
  isCombatTestUnlocked.value = true;
  toastr.success('作者测试已解锁，魔女的收藏现已开放全图鉴。');
  openCombatTestBuilder();
};

const openCombatTestBuilder = () => {
  gameStore.loadStatData();
  const availableCardNames = new Set(allCardsForTest.value.map(c => c.name));
  const availableRelicNames = new Set(baseRelicsForTest.value.map(relic => relic.name));
  const presetDeck = Array.isArray(gameStore.statData._技能)
    ? (gameStore.statData._技能 as string[]).filter(name => availableCardNames.has(name)).slice(0, 9)
    : [];
  const presetRelicsRaw = inventoryRelicMap.value;
  const presetRelics: Record<string, number> = {};
  for (const [name, value] of Object.entries(presetRelicsRaw)) {
    if (!availableRelicNames.has(name)) continue;
    const count = Math.max(0, Math.floor(Number(value ?? 0)));
    if (count <= 0) continue;
    presetRelics[name] = count;
  }

  selectedTestDeck.value = [...presetDeck];
  const presetActives = Array.isArray(gameStore.statData.$主动)
    ? [...(gameStore.statData.$主动 as string[])].filter(name => activeSkillByNameMap.value.has(name)).slice(0, 2)
    : [];
  while (presetActives.length < 2) presetActives.push('');
  selectedTestActiveSkills.value = presetActives;
  selectedTestEnemy.value = '';
  selectedEnemyFloorForTest.value = '全部';
  selectedTestRelicCounts.value = presetRelics;
  selectedCardCategoryTab.value = '全部';
  selectedRelicCategoryTab.value = '全部';
  combatTestStartAt999.value = false;
  combatTestStep.value = 'deck';
  activeModal.value = 'combatTestBuilder';
};

const setCombatTestEnemyFloorFilter = (floorLabel: string) => {
  selectedEnemyFloorForTest.value = floorLabel;
  if (!selectedTestEnemy.value) return;
  const stillVisible = filteredEnemyEntriesForTest.value.some(entry => entry.name === selectedTestEnemy.value);
  if (!stillVisible) {
    selectedTestEnemy.value = '';
  }
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
    ...buildInventoryUpdateFields({ _圣遗物: buildSelectedRelicPayload() }),
  });
  if (!ok) return;

  activeModal.value = null;
  await launchCombat(selectedTestEnemy.value, 'combatTest', {
    testStartAt999: combatTestStartAt999.value,
  });
};

const handleCombatEnd = async (
  outcome: CombatOutcome,
  finalStats: unknown,
  logs: string[],
  negativeEffects: string[],
) => {
  const context = activeCombatContext.value;
  const enemyName = combatEnemyName.value || (gameStore.statData._对手名称 as string) || '未知敌人';
  pendingCombatNarrative.value = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    context,
    outcome,
    enemyName,
    text: buildCombatNarrative(outcome, enemyName, context, logs ?? []),
  };

  queueCombatMvuSync(outcome, finalStats, negativeEffects ?? []);

  showCombat.value = false;
  showVictoryRewardView.value = false;
  combatTestStartAt999CurrentBattle.value = false;
  activeCombatContext.value = 'normal';

  if (outcome !== 'win') {
    closeShopView();
    const narrative = pendingCombatNarrative.value;
    pendingCombatNarrative.value = null;
    if (narrative) {
      sendCombatNarrativeOnce(narrative, narrative.text);
    }
    console.log('[Combat] Result:', outcome.toUpperCase());
    return;
  }

  if (context === 'shopRobbery' && enemyName === '沐芯兰') {
    const ok = await gameStore.updateStatDataFields({ $是否已击败商人: true });
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
  viewportResizeObserver?.disconnect();
  viewportResizeObserver = null;
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleViewportResize);
    window.removeEventListener('orientationchange', handleViewportResize);
    window.visualViewport?.removeEventListener('resize', handleViewportResize);
    document.removeEventListener('fullscreenchange', handleViewportResize);
    document.removeEventListener('pointerdown', handleButtonCompletionOutsidePointerDown);
    if (inputWaitingDotsTimer !== null) {
      window.clearInterval(inputWaitingDotsTimer);
      inputWaitingDotsTimer = null;
    }
    if (settingsHelpTouchTimer !== null) {
      window.clearTimeout(settingsHelpTouchTimer);
      settingsHelpTouchTimer = null;
    }
  }
  bondPortraitLoaderDisposed = true;
  clearShopRobTimer();
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  clearChestCloseLongPressTimer();
  clearHotSpringCleanseTimer();
  clearIdolRollTimer();
});
</script>

<style scoped>
.ui-viewport {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background: #050505;
}

.ui-stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1920px;
  height: 1080px;
  transform: translate(-50%, -50%);
  transform-origin: center center;
}

.ui-stage-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.ui-buttons-left {
  transform: scale(1.2);
  transform-origin: top left;
}

.ui-buttons-right {
  transform: scale(1.2);
  transform-origin: top right;
}

.ui-action-buttons {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.portal-btn {
  width: 7.8rem;
  height: 7.8rem;
}

.portal-btn__icon {
  font-size: 1.7rem;
  line-height: 1;
}

.portal-btn__label {
  max-width: 6.2rem;
  font-size: 0.72rem;
  line-height: 1.2;
}

.ui-input-shell {
  background: radial-gradient(circle at 15% 10%, rgba(251, 191, 36, 0.06), transparent 46%), #0f0f0f;
}

.ui-input-anchor {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}

.ui-input-field::placeholder {
  color: rgba(213, 197, 170, 0.74);
}

.ui-option-completion-wrap {
  position: relative;
  flex-shrink: 0;
}

.ui-option-completion-trigger {
  min-width: 8.75rem;
  border-radius: 0.72rem;
  border: 1px solid rgba(212, 175, 55, 0.34);
  background:
    linear-gradient(180deg, rgba(62, 38, 15, 0.92), rgba(27, 16, 9, 0.96)),
    radial-gradient(circle at 20% 18%, rgba(251, 191, 36, 0.12), transparent 48%);
  color: rgba(246, 219, 144, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 6px 16px rgba(0, 0, 0, 0.34);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.ui-option-completion-trigger:hover:not(:disabled),
.ui-option-completion-trigger:focus-visible {
  border-color: rgba(251, 191, 36, 0.82);
  color: rgba(254, 243, 199, 0.98);
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 0 14px rgba(251, 191, 36, 0.24),
    0 8px 18px rgba(0, 0, 0, 0.4);
}

.ui-option-completion-trigger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.ui-option-completion-trigger__label {
  font-size: 0.96rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.ui-option-completion-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.55rem);
  z-index: 10;
  display: flex;
  min-width: 14.5rem;
  flex-direction: column;
  gap: 0.35rem;
  border-radius: 0.95rem;
  border: 1px solid rgba(212, 175, 55, 0.34);
  background:
    linear-gradient(180deg, rgba(22, 14, 8, 0.98), rgba(14, 10, 8, 0.98)),
    radial-gradient(circle at 18% 14%, rgba(251, 191, 36, 0.1), transparent 46%);
  padding: 0.45rem;
  box-shadow:
    0 16px 30px rgba(0, 0, 0, 0.44),
    0 0 22px rgba(251, 191, 36, 0.1);
  backdrop-filter: blur(16px);
}

.ui-option-completion-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  background: rgba(44, 26, 12, 0.72);
  color: rgba(236, 225, 200, 0.92);
  padding: 0.85rem 0.95rem;
  text-align: left;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease;
}

.ui-option-completion-item:hover:not(:disabled),
.ui-option-completion-item:focus-visible {
  border-color: rgba(251, 191, 36, 0.5);
  background: rgba(74, 43, 17, 0.88);
  color: rgba(255, 247, 224, 0.98);
  transform: translateX(-1px);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.12);
}

.ui-option-completion-item.is-disabled,
.ui-option-completion-item:disabled {
  cursor: not-allowed;
  background: rgba(33, 22, 15, 0.58);
  color: rgba(189, 171, 135, 0.48);
  box-shadow: none;
}

.ui-option-completion-item__label {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
}

.ui-option-completion-item__tag {
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid rgba(251, 191, 36, 0.26);
  background: rgba(251, 191, 36, 0.08);
  color: rgba(251, 220, 144, 0.96);
  padding: 0.2rem 0.55rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.option-completion-menu-enter-active,
.option-completion-menu-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.option-completion-menu-enter-from,
.option-completion-menu-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

.ui-send-button {
  transform: none;
  border-radius: 0.72rem;
  border: 1px solid rgba(212, 175, 55, 0.4);
  background: radial-gradient(circle at 28% 18%, rgba(251, 191, 36, 0.12), transparent 52%), rgba(28, 15, 8, 0.94);
  color: rgba(251, 191, 36, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 6px 16px rgba(0, 0, 0, 0.34);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.ui-send-button:hover:not(:disabled),
.ui-send-button:focus-visible {
  border-color: rgba(251, 191, 36, 0.82);
  color: rgba(254, 243, 199, 0.98);
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 0 14px rgba(251, 191, 36, 0.24),
    0 8px 18px rgba(0, 0, 0, 0.4);
}

.ui-send-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.ui-status-hud {
  transform: scale(1.2);
  transform-origin: bottom left;
}

@media (max-width: 900px) {
  .ui-option-completion-trigger {
    min-width: 6rem;
    padding-left: 0.95rem;
    padding-right: 0.95rem;
  }

  .ui-option-completion-trigger__label {
    font-size: 0.82rem;
    letter-spacing: 0.03em;
  }

  .ui-option-completion-menu {
    min-width: 12.5rem;
  }
}

.story-floor-indicator {
  position: absolute;
  top: 0.9rem;
  right: 1.55rem;
  z-index: 8;
  color: rgba(251, 191, 36, 0.95);
  padding: 0;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.08em;
}

.landscape-hint-overlay {
  position: absolute;
  inset: 0;
  z-index: 180;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(3, 4, 8, 0.72);
  backdrop-filter: blur(4px);
}

.landscape-hint-card {
  width: min(92vw, 28rem);
  border-radius: 0.9rem;
  border: 1px solid rgba(212, 175, 55, 0.42);
  background: radial-gradient(circle at 18% 12%, rgba(251, 191, 36, 0.14), transparent 56%), rgba(15, 11, 10, 0.94);
  padding: 0.95rem 1rem;
  box-shadow:
    0 8px 26px rgba(0, 0, 0, 0.45),
    0 0 18px rgba(212, 175, 55, 0.2);
}

.landscape-hint-title {
  color: rgba(252, 211, 77, 0.95);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.landscape-hint-desc {
  margin-top: 0.55rem;
  color: rgba(229, 231, 235, 0.92);
  font-size: 0.8rem;
  line-height: 1.55;
}

.landscape-hint-actions {
  margin-top: 0.8rem;
  display: flex;
  justify-content: flex-end;
}

.landscape-hint-btn {
  border-radius: 0.5rem;
  border: 1px solid rgba(212, 175, 55, 0.45);
  background: rgba(62, 28, 16, 0.84);
  color: rgba(253, 230, 138, 0.96);
  font-size: 0.75rem;
  padding: 0.44rem 0.8rem;
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}

.landscape-hint-btn:hover {
  border-color: rgba(245, 208, 102, 0.9);
  background: rgba(93, 40, 21, 0.86);
}

@media (hover: hover) and (pointer: fine) {
  .ui-viewport {
    min-height: max(100vh, 56.25vw);
    min-height: max(100dvh, 56.25vw);
  }
}

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

.magic-books-layout {
  width: 100%;
  max-width: 90rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.magic-books-hero,
.magic-books-active-panel {
  position: relative;
  overflow: hidden;
  border-radius: 1.1rem;
  border: 1px solid rgba(212, 175, 55, 0.22);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 28%),
    radial-gradient(circle at left top, rgba(251, 191, 36, 0.12), transparent 32%),
    linear-gradient(145deg, rgba(30, 18, 12, 0.96), rgba(14, 9, 7, 0.94));
  box-shadow:
    inset 0 1px 0 rgba(255, 236, 201, 0.05),
    0 18px 34px rgba(0, 0, 0, 0.28);
}

.magic-books-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(16rem, 1fr);
  gap: 1rem;
  padding: 1.2rem 1.25rem;
}

.magic-books-hero__eyebrow {
  color: rgba(251, 191, 36, 0.8);
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.magic-books-hero__title {
  margin-top: 0.35rem;
  color: rgba(255, 229, 184, 0.98);
  font-family: 'Cinzel', serif;
  font-size: clamp(1.5rem, 2vw, 2rem);
  letter-spacing: 0.04em;
}

.magic-books-hero__desc {
  margin-top: 0.55rem;
  max-width: 38rem;
  color: rgba(237, 226, 205, 0.76);
  font-size: 0.88rem;
  line-height: 1.65;
}

.magic-books-hero__chips {
  display: grid;
  gap: 0.7rem;
}

.magic-books-hero__chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.95rem;
  border-radius: 0.92rem;
  border: 1px solid rgba(212, 175, 55, 0.16);
  background: rgba(5, 4, 5, 0.42);
  backdrop-filter: blur(8px);
}

.magic-books-hero__chip-label {
  color: rgba(214, 211, 209, 0.7);
  font-size: 0.74rem;
}

.magic-books-hero__chip-value {
  color: rgba(255, 224, 163, 0.97);
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
}

.magic-books-tabs {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.magic-books-tab {
  min-width: 8.2rem;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(120, 85, 56, 0.68);
  background: rgba(22, 13, 8, 0.72);
  color: rgba(231, 223, 212, 0.7);
  font-size: 0.77rem;
  letter-spacing: 0.08em;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.magic-books-tab:hover,
.magic-books-tab:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.46);
  color: rgba(255, 236, 201, 0.94);
}

.magic-books-tab.is-active {
  border-color: rgba(251, 191, 36, 0.78);
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(120, 53, 15, 0.24)),
    rgba(22, 13, 8, 0.8);
  color: rgba(255, 224, 163, 0.98);
  box-shadow:
    inset 0 0 0 1px rgba(251, 191, 36, 0.16),
    0 10px 20px rgba(0, 0, 0, 0.18);
}

.magic-books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16.2rem, 17.6rem));
  justify-content: center;
  gap: 1.05rem;
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.magic-books-skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, 10rem);
  justify-content: center;
  gap: 1rem;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.magic-book-card,
.magic-books-skill-card,
.magic-books-slot-card {
  position: relative;
  overflow: hidden;
  text-align: left;
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.magic-book-card {
  width: min(100%, 17.6rem);
  justify-self: center;
  padding: 0.7rem;
  border-radius: 1rem;
  border: 1px solid rgba(120, 85, 56, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 28%),
    rgba(18, 12, 8, 0.84);
  box-shadow:
    inset 0 1px 0 rgba(255, 236, 201, 0.04),
    0 14px 24px rgba(0, 0, 0, 0.24);
}

.magic-book-card:hover,
.magic-book-card:focus-visible,
.magic-books-skill-card:hover,
.magic-books-skill-card:focus-visible,
.magic-books-slot-card:hover,
.magic-books-slot-card:focus-visible {
  outline: none;
  transform: translateY(-3px);
}

.magic-book-card:hover,
.magic-book-card:focus-visible {
  border-color: rgba(251, 191, 36, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 236, 201, 0.04),
    0 16px 28px rgba(0, 0, 0, 0.28);
}

.magic-book-card.is-equipped,
.magic-books-skill-card.is-equipped,
.magic-books-slot-card.is-selected {
  border-color: rgba(251, 191, 36, 0.76);
  box-shadow:
    inset 0 0 0 1px rgba(251, 191, 36, 0.16),
    0 0 0 1px rgba(251, 191, 36, 0.08),
    0 16px 28px rgba(0, 0, 0, 0.3);
}

.magic-book-card__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 832 / 1216;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.85rem;
  border: 1px solid rgba(120, 85, 56, 0.6);
  background:
    radial-gradient(circle at 50% 22%, rgba(255, 245, 200, 0.08), transparent 30%),
    rgba(4, 5, 8, 0.88);
}

.magic-book-card__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition:
    transform 0.28s ease,
    filter 0.28s ease;
}

.magic-book-card:hover .magic-book-card__image,
.magic-book-card:focus-visible .magic-book-card__image {
  transform: scale(1.03);
}

.magic-book-card__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.08) 45%, rgba(0, 0, 0, 0.42));
}

.magic-book-card__header,
.magic-book-card__title-wrap {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1;
}

.magic-book-card__header {
  top: 0;
  padding: 0.75rem;
  display: flex;
  justify-content: flex-end;
}

.magic-book-card__badge {
  padding: 0.24rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 236, 201, 0.14);
  background: rgba(0, 0, 0, 0.34);
  color: rgba(251, 237, 203, 0.84);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
}

.magic-book-card__title-wrap {
  top: 0.65rem;
  padding: 0 0.8rem;
}

.magic-book-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.72rem;
  padding: 0 0.2rem;
}

.magic-book-card__footer-title {
  color: rgba(255, 239, 205, 0.92);
  font-family: 'Cinzel', serif;
  font-size: 0.86rem;
}

.magic-book-card__footer-action {
  color: rgba(212, 175, 55, 0.84);
  font-size: 0.72rem;
}

.magic-books-empty {
  border-radius: 0.95rem;
  border: 1px dashed rgba(120, 85, 56, 0.66);
  background: rgba(18, 10, 7, 0.72);
  color: rgba(214, 211, 209, 0.58);
  text-align: center;
  font-size: 0.86rem;
  padding: 3rem 1rem;
}

.magic-books-active-panel {
  padding: 1rem 1.05rem 1.1rem;
}

.magic-books-active-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.magic-books-active-panel__title {
  color: rgba(255, 224, 163, 0.95);
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  letter-spacing: 0.05em;
}

.magic-books-active-panel__desc {
  margin-top: 0.3rem;
  color: rgba(231, 223, 212, 0.65);
  font-size: 0.8rem;
  line-height: 1.55;
}

.magic-books-active-panel__badge {
  flex-shrink: 0;
  padding: 0.48rem 0.78rem;
  border-radius: 999px;
  border: 1px solid rgba(212, 175, 55, 0.18);
  background: rgba(0, 0, 0, 0.24);
  color: rgba(241, 225, 186, 0.82);
  font-size: 0.74rem;
}

.magic-books-slot-grid {
  margin-top: 0.95rem;
  display: grid;
  grid-template-columns: repeat(2, 10rem);
  justify-content: center;
  gap: 1rem;
}

.magic-books-slot-card,
.magic-books-skill-card {
  width: 10rem;
  height: 15rem;
  min-height: 15rem;
  justify-self: center;
  border-radius: 1rem;
  border: 1px solid rgba(120, 85, 56, 0.72);
  background:
    radial-gradient(circle at top right, rgba(147, 51, 234, 0.16), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 26%),
    rgba(18, 14, 24, 0.95);
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.24);
}

.magic-books-slot-card__top,
.magic-books-skill-card__top {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem;
  z-index: 1;
}

.magic-books-slot-card__mana,
.magic-books-skill-card__mana {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  border: 1px solid rgba(216, 180, 254, 0.35);
  background: rgba(109, 40, 217, 0.76);
  color: rgba(255, 255, 255, 0.96);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.magic-books-slot-card__tag,
.magic-books-skill-card__tag {
  padding: 0.25rem 0.58rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.34);
  color: rgba(244, 244, 245, 0.86);
  font-size: 0.66rem;
}

.magic-books-slot-card__art,
.magic-books-skill-card__art {
  position: relative;
  height: 5.6rem;
  margin: 2.7rem 0.6rem 0;
  border-radius: 0.9rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
}

.magic-books-slot-card__art-glow,
.magic-books-skill-card__art-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(245, 245, 245, 0.34), rgba(145, 145, 168, 0.08) 58%, rgba(11, 9, 16, 0.84));
}

.magic-books-slot-card__art-letter,
.magic-books-skill-card__art-letter {
  position: relative;
  color: rgba(255, 255, 255, 0.2);
  font-family: 'Cinzel', serif;
  font-size: 2.15rem;
  line-height: 1;
}

.magic-books-slot-card__body,
.magic-books-skill-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
  padding: 0.72rem;
}

.magic-books-slot-card__name,
.magic-books-skill-card__name {
  color: rgba(255, 239, 205, 0.96);
  font-family: 'Cinzel', serif;
  font-size: 0.84rem;
  text-align: center;
}

.magic-books-slot-card__desc,
.magic-books-skill-card__desc {
  min-height: 3rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(13, 13, 16, 0.78);
  color: rgba(212, 212, 216, 0.84);
  font-size: 0.62rem;
  line-height: 1.45;
  padding: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.magic-books-slot-card__state,
.magic-books-skill-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.6rem;
}

.magic-books-slot-card__state {
  justify-content: center;
  letter-spacing: 0.06em;
}

.magic-books-active-panel__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.8rem;
}

.magic-books-clear-btn {
  padding: 0.58rem 0.9rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(120, 85, 56, 0.68);
  background: rgba(22, 13, 8, 0.68);
  color: rgba(231, 223, 212, 0.74);
  font-size: 0.76rem;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background-color 0.18s ease;
}

.magic-books-clear-btn:hover,
.magic-books-clear-btn:focus-visible {
  outline: none;
  border-color: rgba(251, 191, 36, 0.46);
  color: rgba(255, 236, 201, 0.92);
}

.story-rich-text {
  display: flex;
  flex-direction: column;
  gap: 0.34em;
}

/* Inline image block – the external image script will replace its content with a button */
.image-block-inline {
  margin: 0;
  white-space: pre-wrap;
}

/* Visually hide <image>/<img> tag text while keeping it in the DOM for external script */
.image-tag-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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

.status-negative-screen {
  width: 24rem;
  max-width: min(72vw, 24rem);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-negative-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.1rem 0.1rem 0.2rem;
}

.status-negative-title {
  color: rgba(245, 222, 179, 0.92);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.status-negative-count {
  color: rgba(156, 163, 175, 0.95);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}

.status-negative-empty {
  border-radius: 0.52rem;
  border: 1px dashed rgba(156, 163, 175, 0.45);
  background: rgba(17, 24, 39, 0.45);
  color: rgba(209, 213, 219, 0.85);
  text-align: center;
  font-size: 0.75rem;
  padding: 0.65rem 0.6rem;
}

.status-negative-list {
  max-height: 12.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-right: 0.15rem;
}

.status-negative-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 0.56rem;
  border: 1px solid rgba(251, 113, 133, 0.5);
  background: linear-gradient(120deg, rgba(69, 10, 10, 0.82), rgba(31, 41, 55, 0.72));
  padding: 0.46rem 0.56rem;
}

.status-negative-name {
  min-width: 5.6rem;
  flex-shrink: 0;
  color: rgba(253, 186, 116, 0.98);
  font-size: 0.73rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.status-negative-desc {
  color: rgba(229, 231, 235, 0.92);
  font-size: 0.7rem;
  line-height: 1.35;
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

.player-detail-modal {
  display: grid;
  grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
  gap: 1rem;
  min-height: 34rem;
}

.player-detail-portrait-panel {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.9rem;
  height: 100%;
  padding: 1rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(217, 119, 6, 0.22);
  background:
    radial-gradient(circle at 24% 18%, rgba(217, 119, 6, 0.24), transparent 42%),
    linear-gradient(180deg, rgba(35, 23, 16, 0.96), rgba(12, 9, 8, 0.94));
}

.player-detail-portrait-shell {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  align-self: center;
  width: min(100%, 19rem);
  max-width: 100%;
  aspect-ratio: 3 / 5;
  max-height: min(56vh, 34rem);
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background:
    radial-gradient(circle at 50% 18%, rgba(251, 191, 36, 0.18), transparent 40%),
    linear-gradient(180deg, rgba(27, 20, 17, 0.85), rgba(8, 6, 5, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 18px 40px rgba(0, 0, 0, 0.35);
}

.player-detail-portrait-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
}

.player-detail-portrait-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 6rem;
  font-family: var(--font-heading, inherit);
  color: rgba(251, 191, 36, 0.22);
}

.player-detail-nameplate {
  padding: 0.8rem 0.95rem;
  border-radius: 0.95rem;
  border: 1px solid rgba(217, 119, 6, 0.25);
  background: rgba(15, 10, 8, 0.72);
}

.player-detail-name {
  font-family: var(--font-heading, inherit);
  font-size: 1.35rem;
  letter-spacing: 0.08em;
  color: rgba(254, 243, 199, 0.96);
}

.player-detail-subtitle {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(245, 222, 179, 0.55);
}

.player-detail-upload-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.player-detail-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(251, 191, 36, 0.42);
  background: linear-gradient(180deg, rgba(91, 57, 23, 0.96), rgba(43, 26, 12, 0.98));
  color: rgba(254, 243, 199, 0.96);
  transition: all 0.18s ease;
}

.player-detail-upload-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(252, 211, 77, 0.78);
  color: rgba(255, 251, 235, 0.98);
}

.player-detail-upload-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.player-detail-upload-btn--ghost {
  background: rgba(20, 16, 13, 0.88);
  border-color: rgba(245, 158, 11, 0.2);
  color: rgba(245, 222, 179, 0.82);
}

.player-detail-upload-hint {
  margin-top: auto;
  font-size: 0.76rem;
  line-height: 1.55;
  color: rgba(214, 211, 209, 0.7);
}

.player-detail-data-panel {
  max-height: 42rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-right: 0.35rem;
}

.player-detail-tabbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.player-detail-tab,
.player-detail-subtab {
  border-radius: 999px;
  border: 1px solid rgba(180, 83, 9, 0.35);
  background: rgba(18, 12, 10, 0.9);
  color: rgba(231, 229, 228, 0.78);
  transition: all 0.18s ease;
}

.player-detail-tab {
  min-height: 2.4rem;
  padding: 0.55rem 1rem;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.player-detail-subtab {
  min-height: 2.15rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.76rem;
}

.player-detail-tab:hover,
.player-detail-subtab:hover {
  border-color: rgba(245, 158, 11, 0.62);
  color: rgba(255, 251, 235, 0.94);
}

.player-detail-tab--active,
.player-detail-subtab--active {
  border-color: rgba(245, 158, 11, 0.75);
  background: linear-gradient(180deg, rgba(120, 53, 15, 0.92), rgba(69, 26, 3, 0.96));
  color: rgba(254, 243, 199, 0.98);
  box-shadow: 0 0 18px rgba(245, 158, 11, 0.14);
}

.player-detail-section {
  padding: 1rem;
  border-radius: 1.1rem;
  border: 1px solid rgba(217, 119, 6, 0.18);
  background: linear-gradient(180deg, rgba(26, 20, 18, 0.96), rgba(13, 11, 11, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.player-detail-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.player-detail-section-title {
  font-family: var(--font-heading, inherit);
  font-size: 1rem;
  letter-spacing: 0.08em;
  color: rgba(253, 230, 138, 0.94);
}

.player-detail-section-meta {
  font-size: 0.75rem;
  color: rgba(245, 222, 179, 0.52);
}

.player-detail-subtabbar {
  margin-top: 0.95rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.player-detail-stat-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.player-detail-stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.9rem 1rem;
  border-radius: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(10, 10, 10, 0.32);
}

.player-detail-stat-label {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(212, 212, 216, 0.58);
}

.player-detail-stat-value {
  font-family: var(--font-heading, inherit);
  font-size: 1.3rem;
  color: rgba(250, 245, 230, 0.96);
}

.player-detail-stat-value--hp {
  color: rgba(252, 165, 165, 0.96);
}

.player-detail-stat-value--mp {
  color: rgba(147, 197, 253, 0.98);
}

.player-detail-stat-value--gold {
  color: rgba(253, 224, 71, 0.98);
}

.rare-active-skill-card {
  position: relative;
}

.rare-active-skill-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: 1px solid rgba(250, 204, 21, 0.56);
  box-shadow:
    0 0 8px rgba(250, 204, 21, 0.38),
    0 0 18px rgba(245, 158, 11, 0.22);
  pointer-events: none;
}

.player-detail-empty {
  margin-top: 0.8rem;
  border-radius: 0.95rem;
  border: 1px dashed rgba(251, 113, 133, 0.28);
  padding: 0.95rem 1rem;
  color: rgba(212, 212, 216, 0.72);
  text-align: center;
}

.player-detail-negative-list {
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.player-detail-negative-item {
  border-radius: 0.95rem;
  border: 1px solid rgba(251, 113, 133, 0.25);
  background: linear-gradient(120deg, rgba(69, 10, 10, 0.62), rgba(24, 24, 27, 0.58));
  padding: 0.85rem 0.95rem;
}

.player-detail-negative-name {
  color: rgba(253, 186, 116, 0.98);
  font-size: 0.84rem;
  font-weight: 700;
}

.player-detail-negative-desc {
  margin-top: 0.35rem;
  color: rgba(228, 228, 231, 0.88);
  font-size: 0.8rem;
  line-height: 1.5;
}

.player-detail-bag-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.player-detail-bag-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(135deg, rgba(26, 16, 10, 0.92), rgba(12, 10, 9, 0.96));
  padding: 0.95rem 1rem;
}

.player-detail-bag-card--consumable {
  border-color: rgba(59, 130, 246, 0.22);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(28, 25, 23, 0.94));
}

.player-detail-bag-copy {
  min-width: 0;
  flex: 1;
}

.player-detail-bag-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.player-detail-bag-name {
  color: rgba(253, 230, 138, 0.96);
  font-family: var(--font-heading, inherit);
  font-size: 0.95rem;
  line-height: 1.35;
}

.player-detail-bag-desc {
  margin-top: 0.4rem;
  color: rgba(231, 229, 228, 0.84);
  font-size: 0.82rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.player-detail-bag-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.player-detail-bag-tag {
  border-radius: 999px;
  padding: 0.24rem 0.58rem;
  font-size: 0.68rem;
  line-height: 1.3;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.player-detail-bag-tag--heal {
  border-color: rgba(16, 185, 129, 0.38);
  background: rgba(6, 78, 59, 0.34);
  color: rgba(167, 243, 208, 0.96);
}

.player-detail-bag-tag--cleanse {
  border-color: rgba(96, 165, 250, 0.38);
  background: rgba(30, 41, 59, 0.54);
  color: rgba(191, 219, 254, 0.96);
}

.player-detail-bag-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-shrink: 0;
}

.player-detail-bag-btn {
  min-width: 4.5rem;
  min-height: 2.15rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 158, 11, 0.38);
  background: rgba(18, 12, 10, 0.92);
  color: rgba(254, 243, 199, 0.92);
  font-size: 0.76rem;
  transition: all 0.18s ease;
}

.player-detail-bag-btn:hover:not(:disabled) {
  border-color: rgba(252, 211, 77, 0.72);
  color: rgba(255, 251, 235, 0.98);
}

.player-detail-bag-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.player-detail-bag-btn--danger {
  border-color: rgba(248, 113, 113, 0.32);
  color: rgba(254, 202, 202, 0.92);
}

.player-detail-bag-btn--danger:hover:not(:disabled) {
  border-color: rgba(248, 113, 113, 0.64);
}

.player-detail-info-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.player-detail-info-item {
  border-radius: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 10, 10, 0.26);
  padding: 0.85rem 0.95rem;
}

.player-detail-info-label {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(245, 222, 179, 0.54);
}

.player-detail-info-value {
  margin-top: 0.4rem;
  color: rgba(245, 245, 244, 0.95);
  font-size: 0.92rem;
  line-height: 1.55;
  word-break: break-word;
}

.player-detail-info-value--multiline {
  white-space: pre-wrap;
}

.player-detail-info-item--multiline {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .player-detail-modal {
    grid-template-columns: minmax(0, 1fr);
  }

  .player-detail-portrait-shell {
    width: min(100%, 22rem);
    max-height: min(48vh, 28rem);
  }

  .player-detail-stat-grid,
  .player-detail-info-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .player-detail-bag-card,
  .player-detail-bag-head {
    flex-direction: column;
  }

  .player-detail-bag-actions,
  .player-detail-bag-tags {
    justify-content: flex-start;
  }
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

.map-modal {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.map-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(16rem, 1fr);
  gap: 1rem;
  padding: 1.05rem 1.15rem;
  border-radius: 1rem;
  border: 1px solid rgba(212, 175, 55, 0.2);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 28%),
    radial-gradient(circle at 12% 16%, rgba(251, 191, 36, 0.14), transparent 32%),
    linear-gradient(145deg, rgba(29, 18, 11, 0.96), rgba(12, 9, 7, 0.94));
  box-shadow:
    inset 0 1px 0 rgba(255, 236, 201, 0.05),
    0 16px 30px rgba(0, 0, 0, 0.24);
}

.map-hero__eyebrow {
  color: rgba(251, 191, 36, 0.78);
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.map-hero__title {
  margin-top: 0.35rem;
  color: rgba(255, 229, 184, 0.98);
  font-family: 'Cinzel', serif;
  font-size: clamp(1.45rem, 2vw, 1.95rem);
}

.map-hero__desc {
  margin-top: 0.52rem;
  color: rgba(237, 226, 205, 0.74);
  font-size: 0.86rem;
  line-height: 1.62;
}

.map-hero__chips {
  display: grid;
  gap: 0.65rem;
}

.map-hero__chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.78rem 0.88rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(212, 175, 55, 0.16);
  background: rgba(6, 5, 4, 0.42);
}

.map-hero__chip-label {
  color: rgba(214, 211, 209, 0.68);
  font-size: 0.74rem;
}

.map-hero__chip-value {
  color: rgba(255, 224, 163, 0.97);
  font-family: 'Cinzel', serif;
  font-size: 0.96rem;
}

.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.15rem 0.1rem 0;
}

.map-summary {
  color: rgba(245, 222, 179, 0.72);
  font-size: 12px;
  letter-spacing: 0.04em;
  line-height: 1.55;
}

.map-summary-highlight {
  color: rgba(251, 191, 36, 0.95);
  font-weight: 700;
}

.map-summary-divider {
  margin: 0 0.4rem;
  color: rgba(245, 222, 179, 0.4);
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.map-control-btn {
  height: 2.15rem;
  min-width: 2.15rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(217, 119, 6, 0.42);
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(120, 53, 15, 0.18)),
    rgba(24, 13, 8, 0.82);
  color: rgba(253, 230, 138, 0.92);
  font-size: 12px;
  padding: 0 0.7rem;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.map-control-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.72);
  color: rgba(254, 243, 199, 0.98);
  background: rgba(58, 32, 18, 0.82);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
}

.map-control-btn--wide {
  min-width: 5.4rem;
}

.map-empty {
  height: 17rem;
  border-radius: 0.9rem;
  border: 1px dashed rgba(217, 119, 6, 0.4);
  background:
    radial-gradient(circle at 18% 16%, rgba(120, 53, 15, 0.24), transparent 54%),
    rgba(18, 10, 7, 0.76);
  color: rgba(245, 222, 179, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.map-viewport {
  position: relative;
  height: 18rem;
  border-radius: 1rem;
  border: 1px solid rgba(217, 119, 6, 0.35);
  background:
    radial-gradient(circle at 18% 16%, rgba(120, 53, 15, 0.24), transparent 54%),
    radial-gradient(circle at 86% 84%, rgba(30, 41, 59, 0.34), transparent 58%), rgba(16, 10, 8, 0.86);
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  box-shadow:
    inset 0 1px 0 rgba(255, 236, 201, 0.05),
    0 14px 26px rgba(0, 0, 0, 0.26);
}

.map-viewport:active {
  cursor: grabbing;
}

.map-viewport::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 2.8rem 2.8rem;
  opacity: 0.4;
  pointer-events: none;
}

.map-canvas {
  position: absolute;
  left: 0;
  top: 0;
}

.map-links {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}

.map-room-cell {
  position: absolute;
  width: 62px;
  height: 62px;
  border-radius: 0.9rem;
  border: 2px solid rgba(255, 255, 255, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.18rem;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    0 6px 16px rgba(0, 0, 0, 0.35);
}

.map-room-cell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.06), transparent 46%);
  pointer-events: none;
}

.map-room-cell--latest {
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.16),
    0 0 0 1px rgba(251, 191, 36, 0.12),
    0 12px 24px rgba(0, 0, 0, 0.34);
}

.map-room-pulse {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 224, 163, 0.74);
  box-shadow:
    0 0 16px rgba(251, 191, 36, 0.38),
    inset 0 0 12px rgba(255, 224, 163, 0.14);
}

.map-room-icon {
  position: relative;
  font-size: 1.3rem;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
}

.map-room-label {
  position: relative;
  max-width: 86%;
  font-size: 0.58rem;
  line-height: 1.2;
  text-align: center;
  opacity: 0.86;
}

.map-room-step {
  position: absolute;
  right: 5px;
  bottom: 5px;
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}

.bond-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.bond-row {
  display: flex;
  align-items: stretch;
  gap: 0.9rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(212, 175, 55, 0.22);
  background:
    linear-gradient(140deg, rgba(20, 12, 8, 0.95), rgba(30, 19, 12, 0.9)),
    radial-gradient(circle at 85% 0%, rgba(212, 175, 55, 0.12), transparent 48%);
  padding: 0.72rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 10px 22px rgba(0, 0, 0, 0.34);
}

.bond-portrait-frame {
  width: clamp(4.9rem, 16vw, 6.3rem);
  min-width: clamp(4.9rem, 16vw, 6.3rem);
  height: clamp(4.9rem, 15vw, 6.3rem);
  border-radius: 0.7rem;
  overflow: hidden;
  border: 1px solid rgba(212, 175, 55, 0.45);
  background: rgba(11, 8, 6, 0.9);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 10px 20px rgba(0, 0, 0, 0.45);
}

.bond-portrait-frame--clickable {
  cursor: zoom-in;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.bond-portrait-frame--clickable:hover {
  transform: translateY(-1px) scale(1.02);
  border-color: rgba(251, 191, 36, 0.66);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 14px 24px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(251, 191, 36, 0.28);
}

.bond-portrait-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bond-portrait-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(212, 175, 55, 0.88);
  font-size: 1.3rem;
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  background: radial-gradient(circle at 50% 35%, rgba(212, 175, 55, 0.24), rgba(21, 13, 9, 0.94));
}

.bond-affection-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.44rem;
  min-width: 0;
}

.bond-affection-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.bond-role-name {
  color: rgba(255, 243, 214, 0.95);
  font-size: 1rem;
  letter-spacing: 0.03em;
  font-family: 'MagicBookTitle', 'KaiTi', serif;
}

.bond-affection-value {
  font-size: 0.9rem;
  font-weight: 700;
  font-family: 'Cinzel', 'Microsoft YaHei', sans-serif;
}

.bond-affection-value--positive {
  color: rgba(253, 186, 116, 0.95);
}

.bond-affection-value--negative {
  color: rgba(125, 211, 252, 0.96);
}

.bond-affection-track {
  position: relative;
  height: 0.72rem;
  border-radius: 9999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(90deg, rgba(26, 42, 58, 0.72), rgba(26, 18, 14, 0.72)), rgba(7, 7, 10, 0.72);
}

.bond-affection-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.25s ease;
}

.bond-affection-fill--positive {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.92), rgba(251, 191, 36, 0.95)), rgba(245, 158, 11, 0.9);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.4);
}

.bond-affection-fill--negative {
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.9), rgba(56, 189, 248, 0.96)), rgba(14, 165, 233, 0.9);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.34);
}

.bond-preview-panel {
  width: min(86vw, 1100px);
  max-height: 90vh;
  border-radius: 0.95rem;
  overflow: hidden;
  border: 1px solid rgba(212, 175, 55, 0.42);
  background: rgba(10, 8, 7, 0.95);
  box-shadow:
    0 20px 56px rgba(0, 0, 0, 0.62),
    0 0 36px rgba(251, 191, 36, 0.22);
}

.bond-preview-image {
  display: block;
  width: 100%;
  max-height: calc(90vh - 3.2rem);
  object-fit: contain;
  background: radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.08), rgba(8, 7, 6, 0.95) 62%);
}

.bond-preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border-top: 1px solid rgba(212, 175, 55, 0.28);
  padding: 0.52rem 0.72rem;
  background: rgba(21, 13, 9, 0.94);
}

.bond-preview-name {
  color: rgba(255, 243, 214, 0.94);
  font-size: 0.96rem;
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  letter-spacing: 0.03em;
}

.bond-preview-close-btn {
  border-radius: 9999px;
  border: 1px solid rgba(212, 175, 55, 0.5);
  background: rgba(17, 11, 8, 0.8);
  color: rgba(251, 191, 36, 0.95);
  padding: 0.18rem 0.72rem;
  font-size: 0.78rem;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    color 0.2s ease;
}

.bond-preview-close-btn:hover {
  border-color: rgba(251, 191, 36, 0.82);
  color: rgba(254, 240, 138, 0.98);
  transform: translateY(-1px);
}

.chest-reward-anchor {
  position: absolute;
  left: 51%;
  top: 56.5%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.72rem;
}

.chest-reward-anchor.is-multi {
  gap: 1.2rem;
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
  transition:
    transform 0.2s ease,
    opacity 0.2s ease,
    filter 0.2s ease;
  filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 28px rgba(245, 158, 11, 0.55))
    drop-shadow(0 8px 24px rgba(0, 0, 0, 0.65));
}

.chest-reward-btn {
  border: 0;
  border-radius: 9999px;
  background: transparent;
  padding: 0.25rem;
  position: relative;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.chest-reward-btn.is-awaiting-confirm .chest-reward-icon {
  transform: scale(1.08);
  filter: drop-shadow(0 0 18px rgba(251, 191, 36, 0.95)) drop-shadow(0 0 34px rgba(245, 158, 11, 0.62))
    drop-shadow(0 8px 24px rgba(0, 0, 0, 0.65));
}

.chest-reward-btn:hover .chest-reward-icon {
  transform: scale(1.05);
}

.chest-reward-confirm-hint {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translate(-50%, 0.35rem);
  white-space: nowrap;
  border-radius: 9999px;
  border: 1px solid rgba(251, 191, 36, 0.55);
  background: rgba(15, 10, 6, 0.92);
  color: rgba(255, 235, 170, 0.98);
  padding: 0.16rem 0.52rem;
  font-size: 0.7rem;
  line-height: 1.2;
  box-shadow:
    0 0 12px rgba(245, 158, 11, 0.3),
    0 4px 14px rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.chest-reward-btn.is-collected {
  opacity: 1;
}

.chest-reward-btn.is-collected .chest-reward-icon {
  opacity: 0;
  transform: scale(0.82);
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.45)) drop-shadow(0 0 16px rgba(245, 158, 11, 0.25))
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
  transition:
    transform 0.2s ease,
    opacity 0.25s ease,
    filter 0.2s ease;
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
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
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
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
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
  bottom: 28%;
  transform: translateX(-50%);
  width: min(920px, calc(100% - 48px));
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
  align-items: center;
  justify-items: center;
  pointer-events: none;
}

.idol-slot {
  width: 7.4rem;
  aspect-ratio: 1;
  clip-path: polygon(50% 2%, 93% 25%, 93% 75%, 50% 98%, 7% 75%, 7% 25%);
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.4), rgba(226, 232, 240, 0.14)),
    radial-gradient(
      circle at 50% 35%,
      rgba(255, 255, 255, 0.62),
      rgba(255, 255, 255, 0.1) 60%,
      rgba(148, 163, 184, 0.06) 100%
    );
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: blur(8px) saturate(1.15);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.16),
    0 12px 28px rgba(15, 23, 42, 0.28),
    0 0 18px rgba(255, 255, 255, 0.12);
  transition: all 0.2s ease;
  position: relative;
}

.idol-slot::before,
.idol-slot::after {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: inherit;
  pointer-events: none;
}

.idol-slot::before {
  inset: 9%;
  border: 1px solid rgba(255, 255, 255, 0.34);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.03));
  opacity: 0.92;
}

.idol-slot::after {
  inset: 17%;
  background:
    radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0) 62%),
    linear-gradient(180deg, rgba(191, 219, 254, 0.18), rgba(255, 255, 255, 0));
  opacity: 0.85;
}

.idol-slot-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.68rem;
  pointer-events: none;
}

.idol-slot.is-preview {
  border-color: rgba(253, 224, 71, 0.96);
  background:
    linear-gradient(145deg, rgba(255, 248, 220, 0.58), rgba(255, 255, 255, 0.18)),
    radial-gradient(
      circle at 50% 35%,
      rgba(255, 250, 205, 0.68),
      rgba(255, 255, 255, 0.08) 64%,
      rgba(250, 204, 21, 0.08) 100%
    );
  box-shadow:
    inset 0 0 0 1px rgba(253, 224, 71, 0.18),
    0 0 22px rgba(253, 224, 71, 0.44),
    0 0 38px rgba(253, 224, 71, 0.26);
}

.idol-slot.is-selected {
  border-color: rgba(255, 255, 255, 0.98);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.74), rgba(241, 245, 249, 0.22)),
    radial-gradient(
      circle at 50% 35%,
      rgba(255, 255, 255, 0.78),
      rgba(255, 255, 255, 0.12) 64%,
      rgba(250, 204, 21, 0.1) 100%
    );
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    0 0 26px rgba(255, 255, 255, 0.4),
    0 0 44px rgba(253, 224, 71, 0.26);
}

.idol-slot-hint {
  position: relative;
  color: rgba(240, 249, 255, 0.95);
  font-size: 1.08rem;
  font-weight: 700;
  white-space: nowrap;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.7),
    0 0 8px rgba(148, 163, 184, 0.35);
  animation: idolHintFloat 3.8s ease-in-out infinite;
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
  will-change: transform;
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
    opacity: 0.94;
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.68),
      0 0 8px rgba(148, 163, 184, 0.32);
  }
  50% {
    transform: translateY(-1px);
    opacity: 1;
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.72),
      0 0 14px rgba(226, 232, 240, 0.44);
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
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
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

.variable-update-panel {
  border-radius: 0.95rem;
  border: 1px solid rgba(92, 62, 38, 0.78);
  background:
    radial-gradient(circle at 14% 8%, rgba(251, 191, 36, 0.08), transparent 48%),
    linear-gradient(180deg, rgba(20, 12, 8, 0.94), rgba(9, 6, 5, 0.86));
  padding: 0.9rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 24px rgba(0, 0, 0, 0.2);
}

.variable-update-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}

.variable-update-head-icon {
  width: 1.05rem;
  height: 1.05rem;
  color: rgba(232, 194, 111, 0.94);
}

.variable-update-title {
  color: rgba(232, 194, 111, 0.98);
  font-size: 0.84rem;
  letter-spacing: 0.04em;
  font-family: 'Inter', sans-serif;
}

.variable-update-subtitle {
  color: rgba(214, 211, 209, 0.72);
  font-size: 0.7rem;
  margin-top: 0.08rem;
  font-family: 'Inter', sans-serif;
}

.variable-update-body {
  max-height: 58vh;
  overflow-y: auto;
  border-radius: 0.72rem;
  border: 1px solid rgba(120, 85, 56, 0.6);
  background: rgba(10, 9, 8, 0.7);
  padding: 0.75rem;
}

.variable-update-content {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: rgba(231, 229, 228, 0.86);
  font-size: 0.84rem;
  line-height: 1.58;
  font-family: 'Inter', sans-serif;
}

.variable-update-empty {
  border-radius: 0.72rem;
  border: 1px dashed rgba(120, 85, 56, 0.58);
  background: rgba(17, 24, 39, 0.3);
  color: rgba(214, 211, 209, 0.76);
  text-align: center;
  font-size: 0.82rem;
  padding: 1.1rem 0.9rem;
  font-family: 'Inter', sans-serif;
}

.settings-panel {
  width: 100%;
}

.settings-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.settings-nav-btn {
  border-radius: 0.56rem;
  border: 1px solid rgba(120, 85, 56, 0.75);
  padding: 0.42rem 0.78rem;
  background: rgba(20, 12, 8, 0.82);
  color: rgba(214, 211, 209, 0.78);
  font-family: 'Inter', sans-serif;
  font-size: 0.76rem;
  letter-spacing: 0.02em;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.settings-nav-btn:hover,
.settings-nav-btn:focus-visible {
  outline: none;
  border-color: rgba(212, 175, 55, 0.62);
  color: rgba(250, 237, 205, 0.94);
  background: rgba(40, 22, 11, 0.82);
  transform: translateY(-1px);
}

.settings-nav-btn.is-active {
  border-color: rgba(245, 158, 11, 0.86);
  color: rgba(255, 231, 170, 0.98);
  background: radial-gradient(circle at 15% 10%, rgba(245, 158, 11, 0.14), transparent 58%), rgba(72, 31, 13, 0.85);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.14);
}

.settings-section {
  border-radius: 1rem;
  border: 1px solid rgba(92, 62, 38, 0.78);
  padding: 1rem;
  background: linear-gradient(180deg, rgba(20, 12, 8, 0.94), rgba(9, 6, 5, 0.86));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 24px rgba(0, 0, 0, 0.2);
}

.settings-system-actions {
  border-top: 1px solid rgba(212, 175, 55, 0.18);
  padding-top: 1.1rem;
}

.settings-section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.95rem;
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.settings-section-title::before,
.settings-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  opacity: 0.95;
}

.settings-section--text .settings-section-title {
  color: rgba(232, 194, 111, 0.96);
}

.settings-section--text .settings-section-title::before,
.settings-section--text .settings-section-title::after {
  background: linear-gradient(90deg, transparent, rgba(232, 194, 111, 0.78), transparent);
}

.settings-section--music .settings-section-title {
  color: rgba(134, 239, 172, 0.94);
}

.settings-section--music .settings-section-title::before,
.settings-section--music .settings-section-title::after {
  background: linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.75), transparent);
}

.settings-section--ai .settings-section-title {
  color: rgba(125, 211, 252, 0.94);
}

.settings-section--ai .settings-section-title::before,
.settings-section--ai .settings-section-title::after {
  background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.74), transparent);
}

.settings-section--summary .settings-section-title {
  color: rgba(251, 191, 114, 0.94);
}

.settings-section--summary .settings-section-title::before,
.settings-section--summary .settings-section-title::after {
  background: linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.76), transparent);
}

.settings-section-title--neutral {
  color: rgba(212, 175, 55, 0.88);
}

.settings-section-title--neutral::before,
.settings-section-title--neutral::after {
  background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4), transparent);
}

.settings-select {
  max-width: 100%;
}

.settings-stepper-btn {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.45rem;
  border: 1px solid rgba(212, 175, 55, 0.3);
  background: radial-gradient(circle at 26% 20%, rgba(251, 191, 36, 0.12), transparent 55%), rgba(26, 15, 8, 0.88);
  color: rgba(212, 175, 55, 0.86);
  font-size: 0.92rem;
  line-height: 1;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.settings-stepper-btn:hover,
.settings-stepper-btn:focus-visible {
  outline: none;
  border-color: rgba(251, 191, 36, 0.78);
  color: rgba(254, 240, 138, 0.98);
  background: rgba(56, 34, 18, 0.92);
  transform: translateY(-1px);
}

.settings-switch {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.settings-switch:focus-visible {
  outline: none;
}

.settings-switch-track {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  width: 5.8rem;
  height: 2.2rem;
  border-radius: 0.72rem;
  border: 1px solid rgba(212, 175, 55, 0.32);
  background: linear-gradient(180deg, rgba(34, 21, 14, 0.98), rgba(18, 12, 9, 0.94));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 8px 16px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.settings-switch:hover .settings-switch-track,
.settings-switch:focus-visible .settings-switch-track {
  border-color: rgba(251, 191, 36, 0.54);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 0 12px rgba(212, 175, 55, 0.12);
}

.settings-switch-label {
  position: relative;
  z-index: 1;
  text-align: center;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  transition: color 0.18s ease;
}

.settings-switch-label--off {
  color: rgba(245, 222, 179, 0.9);
}

.settings-switch-label--on {
  color: rgba(212, 175, 55, 0.54);
}

.settings-switch-thumb {
  position: absolute;
  left: 0.17rem;
  top: 0.17rem;
  width: 2.58rem;
  height: 1.84rem;
  border-radius: 0.56rem;
  border: 1px solid rgba(212, 175, 55, 0.34);
  background:
    radial-gradient(circle at 35% 30%, rgba(251, 191, 36, 0.14), transparent 58%),
    linear-gradient(180deg, rgba(82, 49, 28, 0.98), rgba(56, 33, 20, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 4px 10px rgba(0, 0, 0, 0.28);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.settings-switch.is-on .settings-switch-thumb {
  transform: translateX(2.88rem);
  border-color: rgba(251, 191, 36, 0.62);
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 247, 200, 0.18), transparent 58%),
    linear-gradient(180deg, rgba(158, 98, 32, 0.98), rgba(114, 65, 22, 0.96));
}

.settings-switch.is-on .settings-switch-label--off {
  color: rgba(212, 175, 55, 0.46);
}

.settings-switch.is-on .settings-switch-label--on {
  color: rgba(255, 243, 214, 0.96);
}

.settings-primary-btn {
  border-radius: 0.58rem;
  border: 1px solid rgba(217, 119, 6, 0.55);
  background: radial-gradient(circle at 18% 12%, rgba(251, 191, 36, 0.16), transparent 52%), rgba(69, 26, 3, 0.64);
  color: rgba(252, 211, 77, 0.96);
  font-family: 'Inter', sans-serif;
  font-size: 0.84rem;
  padding: 0.52rem 1.04rem;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.settings-primary-btn:hover:not(:disabled),
.settings-primary-btn:focus-visible {
  outline: none;
  border-color: rgba(245, 158, 11, 0.8);
  color: rgba(255, 237, 213, 0.98);
  transform: translateY(-1px);
  box-shadow: 0 0 14px rgba(251, 146, 60, 0.22);
}

.settings-primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.settings-action-btn {
  border-radius: 0.68rem;
  border-width: 1px;
  padding: 0.76rem 0.95rem;
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  letter-spacing: 0.03em;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.settings-action-btn:hover,
.settings-action-btn:focus-visible {
  outline: none;
  transform: translateY(-1px);
}

.settings-action-btn--gold {
  border-color: rgba(212, 175, 55, 0.38);
  background: rgba(40, 22, 11, 0.72);
  color: rgba(232, 194, 111, 0.94);
}

.settings-action-btn--gold:hover,
.settings-action-btn--gold:focus-visible {
  border-color: rgba(245, 208, 102, 0.72);
  background: rgba(58, 31, 16, 0.82);
  color: rgba(255, 243, 214, 0.98);
  box-shadow: 0 0 14px rgba(212, 175, 55, 0.16);
}

.settings-action-btn--danger {
  border-color: rgba(127, 29, 29, 0.6);
  background: rgba(69, 10, 10, 0.34);
  color: rgba(248, 113, 113, 0.92);
}

.settings-action-btn--danger:hover,
.settings-action-btn--danger:focus-visible {
  border-color: rgba(220, 38, 38, 0.75);
  background: rgba(127, 29, 29, 0.4);
  color: rgba(254, 202, 202, 0.98);
  box-shadow: 0 0 14px rgba(220, 38, 38, 0.14);
}

.settings-action-btn--accent {
  border-color: rgba(217, 119, 6, 0.56);
  background: radial-gradient(circle at 12% 10%, rgba(251, 191, 36, 0.14), transparent 50%), rgba(69, 26, 3, 0.48);
  color: rgba(251, 191, 36, 0.94);
}

.settings-action-btn--accent:hover,
.settings-action-btn--accent:focus-visible {
  border-color: rgba(251, 146, 60, 0.8);
  background: rgba(120, 53, 15, 0.45);
  color: rgba(254, 243, 199, 0.98);
  box-shadow: 0 0 16px rgba(251, 146, 60, 0.18);
}

.settings-action-btn--locked {
  border-color: rgba(115, 115, 115, 0.5);
  background: rgba(38, 38, 38, 0.72);
  color: rgba(212, 212, 212, 0.9);
}

.settings-action-btn--locked:hover,
.settings-action-btn--locked:focus-visible {
  border-color: rgba(163, 163, 163, 0.7);
  background: rgba(64, 64, 64, 0.82);
  color: rgba(245, 245, 245, 0.98);
  box-shadow: 0 0 14px rgba(163, 163, 163, 0.12);
}

.settings-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: min(100%, 24rem);
}

.settings-help-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  border: 1px solid rgba(212, 175, 55, 0.38);
  background: rgba(26, 15, 8, 0.9);
  color: rgba(232, 194, 111, 0.92);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.settings-help-trigger:hover,
.settings-help-trigger:focus-visible {
  outline: none;
  border-color: rgba(232, 194, 111, 0.82);
  color: rgba(255, 231, 170, 0.98);
  background: rgba(56, 37, 22, 0.95);
  transform: translateY(-1px);
}

.settings-help-popover {
  position: absolute;
  left: 0;
  top: calc(100% + 0.55rem);
  z-index: 30;
  width: min(22rem, 78vw);
  padding: 0.75rem 0.85rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(212, 175, 55, 0.24);
  background: rgba(8, 6, 5, 0.96);
  color: rgba(237, 226, 205, 0.92);
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 0.78rem;
  line-height: 1.55;
  letter-spacing: 0.01em;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(8px);
}

.settings-help-fade-enter-active,
.settings-help-fade-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.settings-help-fade-enter-from,
.settings-help-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.settings-summary-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.6), transparent);
  margin: 0.25rem 0;
}

.settings-subsection-title {
  color: rgba(251, 191, 114, 0.94);
  font-family: 'Cinzel', serif;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-summary-range-input {
  width: 5.5rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(120, 85, 56, 0.85);
  background: rgba(26, 15, 8, 0.94);
  color: rgba(237, 226, 205, 0.96);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  padding: 0.36rem 0.56rem;
}

.settings-summary-range-input:focus-visible {
  outline: none;
  border-color: rgba(245, 158, 11, 0.76);
}

.settings-summary-list {
  max-height: 13.5rem;
  overflow-y: auto;
  border-radius: 0.68rem;
  border: 1px solid rgba(120, 85, 56, 0.6);
  background: rgba(10, 7, 6, 0.72);
  padding: 0.5rem;
}

.settings-summary-list-empty {
  border-radius: 0.5rem;
  border: 1px dashed rgba(120, 85, 56, 0.52);
  color: rgba(214, 211, 209, 0.62);
  text-align: center;
  font-size: 0.78rem;
  padding: 0.8rem 0.6rem;
}

.settings-summary-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border-radius: 0.48rem;
  border: 1px solid rgba(120, 85, 56, 0.36);
  background: rgba(26, 15, 8, 0.52);
  color: rgba(222, 211, 190, 0.9);
  padding: 0.36rem 0.5rem;
  font-size: 0.76rem;
  line-height: 1.45;
}

.settings-summary-item.is-selected {
  border-color: rgba(245, 158, 11, 0.72);
  background: rgba(120, 53, 15, 0.34);
  box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.18);
}

.settings-summary-item-index {
  min-width: 2.1rem;
  color: rgba(245, 158, 11, 0.88);
  font-family: 'Inter', sans-serif;
  font-weight: 700;
}

.settings-summary-item-text {
  white-space: normal;
  word-break: break-word;
}

.settings-big-summary-result {
  max-height: 22rem;
  overflow-y: auto;
  border-radius: 0.8rem;
  border: 1px solid rgba(120, 85, 56, 0.72);
  background: rgba(9, 6, 5, 0.9);
  color: rgba(237, 226, 205, 0.95);
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 0.85rem;
  padding: 0.9rem 1rem;
}

.settings-big-summary-editor {
  width: 100%;
  resize: vertical;
  min-height: 15rem;
  max-height: none;
}

.settings-big-summary-editor:focus-visible {
  outline: none;
  border-color: rgba(245, 158, 11, 0.76);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.26);
}

.magic-hat-layout {
  width: 100%;
  max-width: 60rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.magic-hat-hero,
.magic-hat-section {
  position: relative;
  overflow: hidden;
  border-radius: 1.1rem;
  border: 1px solid rgba(212, 175, 55, 0.22);
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 34%),
    linear-gradient(145deg, rgba(33, 19, 12, 0.96), rgba(15, 9, 6, 0.94));
  box-shadow:
    inset 0 1px 0 rgba(255, 236, 201, 0.05),
    0 18px 34px rgba(0, 0, 0, 0.28);
}

.magic-hat-hero {
  padding: 1.2rem 1.25rem;
}

.magic-hat-hero__mesh {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 16% 22%, rgba(251, 191, 36, 0.12), transparent 22%),
    radial-gradient(circle at 82% 30%, rgba(59, 130, 246, 0.11), transparent 20%),
    linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.03) 48%, transparent 100%);
  pointer-events: none;
}

.magic-hat-hero__content {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(16rem, 1fr);
  gap: 1rem;
  align-items: stretch;
}

.magic-hat-hero__eyebrow {
  color: rgba(251, 191, 36, 0.8);
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.magic-hat-hero__title {
  margin-top: 0.4rem;
  color: rgba(255, 230, 180, 0.98);
  font-family: 'Cinzel', serif;
  font-size: clamp(1.45rem, 2vw, 1.95rem);
  letter-spacing: 0.04em;
}

.magic-hat-hero__desc {
  margin-top: 0.55rem;
  max-width: 34rem;
  color: rgba(237, 226, 205, 0.76);
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 0.88rem;
  line-height: 1.65;
}

.magic-hat-hero__chips {
  display: grid;
  gap: 0.7rem;
}

.magic-hat-hero__chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(212, 175, 55, 0.16);
  background: rgba(8, 6, 5, 0.5);
  backdrop-filter: blur(8px);
}

.magic-hat-hero__chip-label {
  color: rgba(214, 211, 209, 0.7);
  font-size: 0.74rem;
  letter-spacing: 0.04em;
}

.magic-hat-hero__chip-value {
  color: rgba(255, 224, 163, 0.96);
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
}

.magic-hat-section {
  padding: 1.1rem 1.15rem 1.2rem;
}

.magic-hat-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.magic-hat-section__head--compact {
  align-items: center;
}

.magic-hat-section__title {
  color: rgba(255, 224, 163, 0.96);
  font-family: 'Cinzel', serif;
  font-size: 1.05rem;
  letter-spacing: 0.06em;
}

.magic-hat-section__subtitle {
  margin-top: 0.35rem;
  color: rgba(231, 223, 212, 0.63);
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 0.8rem;
  line-height: 1.55;
}

.magic-hat-section__badge {
  flex-shrink: 0;
  padding: 0.5rem 0.86rem;
  border-radius: 999px;
  border: 1px solid rgba(212, 175, 55, 0.22);
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(120, 53, 15, 0.18)),
    rgba(0, 0, 0, 0.24);
  color: rgba(241, 225, 186, 0.84);
  font-size: 0.74rem;
  box-shadow: inset 0 1px 0 rgba(255, 236, 201, 0.06);
}

.magic-hat-difficulty-layout {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(15rem, 0.9fr);
  gap: 0.95rem;
}

.magic-hat-difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.magic-hat-difficulty-card {
  position: relative;
  display: flex;
  flex-direction: column;
  text-align: left;
  min-height: 7.25rem;
  padding: 0.9rem 0.95rem;
  border-radius: 1rem;
  border: 1px solid rgba(120, 85, 56, 0.62);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 42%),
    rgba(12, 9, 7, 0.72);
  color: rgba(237, 226, 205, 0.85);
  overflow: hidden;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.magic-hat-difficulty-card::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 236, 201, 0.28), transparent);
  opacity: 0.9;
}

.magic-hat-difficulty-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.04), transparent 42%);
  pointer-events: none;
}

.magic-hat-difficulty-card:hover,
.magic-hat-difficulty-card:focus-visible {
  outline: none;
  transform: translateY(-2px);
  border-color: rgba(251, 191, 36, 0.52);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.24),
    0 0 0 1px rgba(251, 191, 36, 0.08);
}

.magic-hat-difficulty-card.is-active {
  border-color: rgba(251, 191, 36, 0.72);
  box-shadow:
    inset 0 0 0 1px rgba(251, 191, 36, 0.16),
    0 0 0 1px rgba(251, 191, 36, 0.08),
    0 14px 24px rgba(0, 0, 0, 0.28);
}

.magic-hat-difficulty-card.is-wide {
  grid-column: 1 / -1;
  min-height: 5.6rem;
}

.magic-hat-difficulty-card.is-locked {
  cursor: not-allowed;
  border-style: dashed;
  color: rgba(214, 211, 209, 0.48);
  background:
    radial-gradient(circle at top right, rgba(168, 85, 247, 0.12), transparent 32%),
    rgba(24, 24, 27, 0.64);
  box-shadow: none;
  transform: none;
}

.magic-hat-difficulty-card.is-simple {
  background:
    radial-gradient(circle at top right, rgba(34, 197, 94, 0.16), transparent 34%),
    rgba(12, 9, 7, 0.72);
}

.magic-hat-difficulty-card.is-normal {
  background:
    radial-gradient(circle at top right, rgba(148, 163, 184, 0.16), transparent 32%),
    rgba(12, 9, 7, 0.72);
}

.magic-hat-difficulty-card.is-hard {
  background:
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.18), transparent 34%),
    rgba(12, 9, 7, 0.72);
}

.magic-hat-difficulty-card.is-hell {
  background:
    radial-gradient(circle at top right, rgba(220, 38, 38, 0.2), transparent 34%),
    rgba(12, 9, 7, 0.72);
}

.magic-hat-difficulty-card.is-custom {
  background:
    radial-gradient(circle at top right, rgba(168, 85, 247, 0.16), transparent 34%),
    rgba(24, 24, 27, 0.66);
}

.magic-hat-difficulty-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.magic-hat-difficulty-card__name {
  color: rgba(255, 239, 205, 0.98);
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
}

.magic-hat-difficulty-card__state {
  flex-shrink: 0;
  padding: 0.22rem 0.58rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 236, 201, 0.08);
  background: rgba(0, 0, 0, 0.26);
  color: rgba(245, 222, 179, 0.76);
  font-size: 0.68rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.magic-hat-difficulty-card__desc {
  margin-top: 0.7rem;
  color: rgba(237, 226, 205, 0.72);
  font-size: 0.77rem;
  line-height: 1.65;
}

.magic-hat-difficulty-card__footer {
  margin-top: auto;
  padding-top: 0.8rem;
}

.magic-hat-difficulty-card__footer-text {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.22rem 0.1rem 0;
  color: rgba(214, 211, 209, 0.54);
  font-size: 0.7rem;
  letter-spacing: 0.03em;
}

.magic-hat-difficulty-card__footer-text::before {
  content: '';
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.64);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.2);
}

.magic-hat-preview {
  padding: 1rem 1rem 1.05rem;
  border-radius: 1rem;
  border: 1px solid rgba(212, 175, 55, 0.14);
  background:
    linear-gradient(180deg, rgba(251, 191, 36, 0.08), transparent 24%),
    rgba(6, 5, 4, 0.78);
}

.magic-hat-preview__label {
  color: rgba(212, 175, 55, 0.72);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.magic-hat-preview__difficulty {
  margin-top: 0.45rem;
  color: rgba(255, 229, 170, 0.98);
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
}

.magic-hat-preview__list {
  margin-top: 0.95rem;
  display: grid;
  gap: 0.62rem;
}

.magic-hat-preview__item {
  position: relative;
  padding-left: 1rem;
  color: rgba(237, 226, 205, 0.78);
  font-size: 0.82rem;
  line-height: 1.58;
}

.magic-hat-preview__item::before {
  content: '';
  position: absolute;
  left: 0.15rem;
  top: 0.52rem;
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.74);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.28);
}

.magic-hat-points-card {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.75rem 0.95rem;
  border-radius: 0.95rem;
  border: 1px solid rgba(212, 175, 55, 0.22);
  background:
    radial-gradient(circle at left center, rgba(251, 191, 36, 0.15), transparent 42%),
    rgba(8, 6, 5, 0.56);
}

.magic-hat-points-card__label {
  color: rgba(214, 211, 209, 0.72);
  font-size: 0.76rem;
}

.magic-hat-points-card__value {
  color: rgba(255, 224, 163, 0.98);
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
}

.magic-hat-track-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.magic-hat-track-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 18rem;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(120, 85, 56, 0.56);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 26%),
    rgba(11, 9, 7, 0.76);
}

.magic-hat-track-card.is-hp {
  background:
    radial-gradient(circle at top right, rgba(244, 63, 94, 0.14), transparent 30%),
    rgba(11, 9, 7, 0.76);
}

.magic-hat-track-card.is-mp {
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.14), transparent 30%),
    rgba(11, 9, 7, 0.76);
}

.magic-hat-track-card.is-gold {
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 30%),
    rgba(11, 9, 7, 0.76);
}

.magic-hat-track-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.magic-hat-track-card__kicker {
  color: rgba(212, 175, 55, 0.72);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.magic-hat-track-card__title {
  margin-top: 0.3rem;
  color: rgba(255, 239, 205, 0.98);
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  line-height: 1.35;
}

.magic-hat-track-card__rune {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(212, 175, 55, 0.22);
  background: rgba(0, 0, 0, 0.24);
  color: rgba(255, 224, 163, 0.95);
  font-family: 'Cinzel', serif;
  font-size: 0.95rem;
}

.magic-hat-track-card__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.magic-hat-track-card__stat {
  padding: 0.72rem 0.75rem;
  border-radius: 0.82rem;
  border: 1px solid rgba(120, 85, 56, 0.38);
  background: rgba(0, 0, 0, 0.22);
}

.magic-hat-track-card__stat-label {
  display: block;
  color: rgba(214, 211, 209, 0.62);
  font-size: 0.7rem;
}

.magic-hat-track-card__stat-value {
  display: block;
  margin-top: 0.26rem;
  color: rgba(255, 239, 205, 0.96);
  font-size: 0.92rem;
  font-weight: 700;
}

.magic-hat-track-card__bar {
  height: 0.62rem;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(120, 85, 56, 0.4);
  background: rgba(0, 0, 0, 0.34);
}

.magic-hat-track-card__bar-fill {
  height: 100%;
  transition: width 0.28s ease;
}

.magic-hat-track-card__hint {
  min-height: 2.5rem;
  color: rgba(231, 223, 212, 0.66);
  font-size: 0.77rem;
  line-height: 1.6;
}

.magic-hat-track-card__action {
  margin-top: auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.82rem 0.95rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(212, 175, 55, 0.38);
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(120, 53, 15, 0.24)),
    rgba(22, 13, 8, 0.72);
  color: rgba(255, 224, 163, 0.94);
  font-size: 0.78rem;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.magic-hat-track-card__action:hover,
.magic-hat-track-card__action:focus-visible {
  outline: none;
  transform: translateY(-2px);
  border-color: rgba(251, 191, 36, 0.68);
  box-shadow:
    0 10px 18px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(251, 191, 36, 0.08);
}

.magic-hat-track-card__action-label,
.magic-hat-track-card__action-cost {
  display: block;
}

.magic-hat-track-card__action-label {
  color: rgba(255, 233, 185, 0.97);
  font-family: 'Cinzel', serif;
  font-size: 0.92rem;
  letter-spacing: 0.04em;
}

.magic-hat-track-card__action-cost {
  color: rgba(241, 225, 186, 0.72);
  font-size: 0.72rem;
  text-align: right;
}

.magic-hat-track-card__action.is-disabled {
  border-color: rgba(115, 115, 115, 0.42);
  background: rgba(38, 38, 38, 0.64);
  color: rgba(214, 211, 209, 0.48);
  box-shadow: none;
  transform: none;
}

.magic-hat-track-card__action.is-disabled .magic-hat-track-card__action-label,
.magic-hat-track-card__action.is-disabled .magic-hat-track-card__action-cost {
  color: rgba(214, 211, 209, 0.5);
}

@media (max-width: 768px) {
  .magic-books-hero,
  .map-hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .magic-books-grid,
  .magic-books-skill-grid,
  .magic-books-slot-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .magic-books-active-panel__head,
  .map-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .magic-books-tabs {
    flex-wrap: wrap;
  }

  .magic-books-tab {
    min-width: 0;
    width: 100%;
  }

  .map-summary {
    font-size: 0.72rem;
  }

  .map-viewport,
  .map-empty {
    height: 15rem;
  }

  .magic-hat-hero__content,
  .magic-hat-difficulty-layout,
  .magic-hat-track-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .magic-hat-difficulty-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .magic-hat-difficulty-card.is-wide {
    grid-column: auto;
  }

  .magic-hat-section__head,
  .magic-hat-section__head--compact {
    flex-direction: column;
    align-items: flex-start;
  }

  .magic-hat-hero,
  .magic-hat-section {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .magic-hat-track-card {
    min-height: auto;
  }

  .magic-hat-track-card__action {
    align-items: flex-start;
    flex-direction: column;
  }

  .magic-hat-track-card__action-cost {
    text-align: left;
  }

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
    width: min(920px, calc(100% - 24px));
    bottom: 28%;
    gap: 1.2rem;
  }

  .idol-slot {
    width: 7rem;
  }

  .idol-slot-hint {
    font-size: 1rem;
  }

  .idol-exit-btn {
    right: 0.9rem;
    bottom: 0.8rem;
    padding: 0.55rem 1rem;
  }
}
</style>
