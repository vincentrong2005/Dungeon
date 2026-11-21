<template>
  <div
    ref="viewportRef"
    class="ui-viewport"
    :class="{ 'ui-viewport--compact-portrait': isCompactPortraitLayout }"
    :style="viewportStyle"
  >
    <div class="ui-stage" :style="stageStyle">
      <div class="ui-stage-content size-full bg-[#050505] font-body text-dungeon-paper overflow-hidden relative">
        <!-- Dynamic Background -->
        <div class="absolute inset-0 z-0">
          <img
            v-if="bgImageDisplayedUrl"
            :src="bgImageDisplayedUrl"
            class="absolute inset-0 size-full object-cover"
            alt=""
            @error="onBgError"
          />
          <div class="absolute inset-0" :style="{ backgroundColor: `rgba(0,0,0,${bgOverlayOpacity})` }"></div>
        </div>

        <Transition name="game-feedback-fade">
          <div v-if="gameFeedbackMessage" :key="`game-feedback-${gameFeedbackMessage.id}`" class="game-feedback-float" role="status">
            {{ gameFeedbackMessage.text }}
          </div>
        </Transition>

        <div
          v-if="roomAssetLoading || appImageStartupLoading"
          class="room-asset-loading"
          :class="{ 'is-error': appImageStartupError }"
          role="status"
          aria-live="polite"
        >
          <span>{{ appImageStartupLoading ? appImageStartupText : roomAssetLoadingText }}</span>
          <button v-if="appImageStartupError" type="button" class="room-asset-loading__retry" @click="retryMainImageAssets">
            重新加载
          </button>
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
        <div class="absolute top-8 left-8 z-50 flex flex-col space-y-2 ui-buttons-left">
          <SidebarIcon
            skin="settings"
            label="设置"
            tooltip-side="right"
            :active="activeModal === 'settings'"
            @click="activeModal = 'settings'"
          />
          <SidebarIcon
            skin="deck"
            label="卡组"
            tooltip-side="right"
            :active="activeModal === 'deck'"
            @click="activeModal = 'deck'"
          />
          <SidebarIcon
            skin="inventory"
            label="背包"
            tooltip-side="right"
            :active="activeModal === 'statusDetails' && playerDetailTab === 'inventory'"
            @click="openInventoryModal('items')"
          />
          <SidebarIcon
            skin="bonds"
            label="羁绊"
            tooltip-side="right"
            :active="activeModal === 'bonds'"
            @click="activeModal = 'bonds'"
          />
          <SidebarIcon
            skin="map"
            label="地图"
            tooltip-side="right"
            :active="activeModal === 'map'"
            @click="activeModal = 'map'"
          />
        </div>

        <!-- Right sidebar: save/load only (reroll & edit moved into panel) -->
        <div class="absolute top-8 right-8 z-50 flex flex-col space-y-2 ui-buttons-right">
          <SidebarIcon skin="fullscreen" label="全屏模式" tooltip-side="left" @click="toggleFullScreen" />
          <SidebarIcon
            skin="load"
            label="读档"
            tooltip-side="left"
            :active="gameStore.isSaveLoadOpen"
            @click="openSaveLoad"
          />
          <SidebarIcon
            skin="variableUpdate"
            label="变量更新"
            tooltip-side="left"
            :active="isVariableUpdateOpen"
            @click="openVariableUpdate"
          />
          <SidebarIcon
            skin="help"
            label="词条与状态"
            tooltip-side="left"
            :active="isGlossaryReferenceOpen"
            @click="isGlossaryReferenceOpen = true"
          />
          <SidebarIcon
            :skin="canEditMagicBooks ? 'magicBook' : 'lock'"
            :label="canEditMagicBooks ? '魔法书' : '魔法书（锁定）'"
            tooltip-side="left"
            :active="canEditMagicBooks && activeModal === 'magicBooks'"
            :highlight="canEditMagicBooks"
            :disabled="!canEditMagicBooks"
            @click="openMagicBookModal"
          />
          <SidebarIcon
            :skin="canEditMagicBooks ? 'magicHat' : 'lock'"
            :label="canEditMagicBooks ? '魔法帽' : '魔法帽（锁定）'"
            tooltip-side="left"
            :active="canEditMagicBooks && activeModal === 'magicHat'"
            :highlight="canEditMagicBooks"
            :disabled="!canEditMagicBooks"
            @click="openMagicHatModal"
          />
        </div>

        <!-- Main Content Area -->
        <div class="ui-main-content size-full min-h-0 flex flex-col items-center">
          <div
            class="ui-story-layout size-full min-h-0 flex flex-col pt-2 pb-[7.8rem] px-4 md:px-12 md:pl-24 transition-all duration-300"
            :style="{ maxWidth: textSettings.containerWidth + 'px' }"
          >
            <!-- Story Text Area：外层不滚动，承载典籍外框（顶边 + 两侧，与下方输入栏外框衔接） -->
            <div class="ui-story-frame">
            <div
              ref="storyTextContainerRef"
              class="ui-story-panel p-6 md:p-10 overflow-y-auto min-h-0 custom-scrollbar"
            >
              <div class="story-floor-indicator pointer-events-none select-none">
                <span class="story-floor-indicator__label">消息楼层</span>
                <span class="story-floor-indicator__value">第 {{ currentTavernFloorNumber }} 层</span>
              </div>

              <div v-if="showMissingMainTextTagNotice" class="story-main-text-warning" role="status">
                未检测到正文标签，当前显示原始文本。
              </div>

              <!-- Loading Indicator -->
              <div v-if="gameStore.isGenerating" class="flex items-center gap-3 mb-4">
                <div class="flex gap-1">
                  <span class="size-2 bg-dungeon-gold rounded-full animate-bounce" style="animation-delay: 0s"></span>
                  <span
                    class="size-2 bg-dungeon-gold rounded-full animate-bounce"
                    style="animation-delay: 0.2s"
                  ></span>
                  <span
                    class="size-2 bg-dungeon-gold rounded-full animate-bounce"
                    style="animation-delay: 0.4s"
                  ></span>
                </div>
                <span class="text-dungeon-gold/60 font-ui text-sm">正在生成...</span>
              </div>

              <!-- Edit Mode -->
              <div v-if="gameStore.isEditing" class="flex flex-col h-full">
                <textarea
                  v-model="gameStore.editingText"
                  class="flex-1 w-full bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper rounded-sm p-4 resize-none focus:outline-none focus:border-dungeon-gold focus:ring-1 focus:ring-dungeon-gold/50 font-ui custom-scrollbar"
                  :style="{
                    fontSize: textSettings.fontSize + 'px',
                    lineHeight: textSettings.lineHeight,
                    fontFamily: storyFontFamily,
                  }"
                ></textarea>
                <!-- Edit Actions -->
                <div class="flex justify-end gap-3 mt-4">
                  <button
                    class="px-5 py-2 text-sm font-ui text-gray-400 border border-gray-700 rounded-sm hover:bg-gray-800 transition-colors"
                    @click="gameStore.cancelEdit()"
                  >
                    取消
                  </button>
                  <button
                    class="px-5 py-2 text-sm font-ui text-dungeon-gold border border-dungeon-gold/40 rounded-sm hover:bg-dungeon-gold/10 transition-colors shadow-[0_0_8px_rgba(212,175,55,0.15)]"
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
                  class="prose prose-invert max-w-none prose-p:text-dungeon-paper tracking-wide ui-story-prose"
                  :style="{
                    fontSize: textSettings.fontSize + 'px',
                    lineHeight: textSettings.lineHeight,
                    fontFamily: storyFontFamily,
                  }"
                >
                  <!-- Streaming text (during generation) -->
                  <p
                    v-if="
                      textSettings.singleLayerDisplay &&
                      isStreamingEnabled &&
                      gameStore.isGenerating &&
                      gameStore.streamingText
                    "
                    class="whitespace-pre-wrap text-dungeon-paper/85"
                  >
                    {{ streamingDisplayText }}
                  </p>
                  <!-- Final main text -->
                  <div v-else class="story-rich-text">
                    <template v-for="node in storyContentNodes" :key="node.key">
                      <div
                        v-if="node.type === 'special'"
                        :class="['story-tucao-wrap', `story-tucao-wrap--${node.kind}`]"
                      >
                        <button class="story-tucao-toggle" type="button" @click="toggleTucao(node.key)">
                          {{
                            isTucaoExpanded(node.key)
                              ? `收起${node.title || getStorySpecialTitle(node)}`
                              : getStorySpecialTitle(node)
                          }}
                        </button>
                        <Transition name="tucao-expand">
                          <div v-if="isTucaoExpanded(node.key)" class="story-tucao-panel">
                            <p
                              v-for="line in node.lines"
                              :key="line.key"
                              :class="[
                                'story-line',
                                `story-line-level-${line.level}`,
                                line.align === 'right' ? 'story-line--right' : '',
                                line.variant === 'divider' ? 'story-line--divider' : '',
                                line.anchor === 'currentFloor' ? 'story-line--current-floor-start' : '',
                              ]"
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
                      <!-- Image block (inline at original position) -->
                      <div v-else-if="getImageBlockForLine(node)" class="image-block-inline">
                        <span class="image-tag-sr-only">{{ getImageBlockForLine(node)!.openTag }}</span
                        >{{ getImageBlockForLine(node)!.innerContent
                        }}<span class="image-tag-sr-only">{{ getImageBlockForLine(node)!.closeTag }}</span>
                      </div>
                      <!-- Normal text line -->
                      <p
                        v-else
                        :class="[
                          'story-line',
                          `story-line-level-${node.level}`,
                          node.align === 'right' ? 'story-line--right' : '',
                          node.variant === 'divider' ? 'story-line--divider' : '',
                          node.anchor === 'currentFloor' ? 'story-line--current-floor-start' : '',
                        ]"
                      >
                        <template v-if="node.segments.length > 0">
                          <span
                            v-for="segment in node.segments"
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
                  <div ref="optionActionModeControlRef" class="option-action-mode-control">
                    <button
                      type="button"
                      class="option-action-mode-orb"
                      :aria-expanded="optionActionModeMenuOpen"
                      aria-haspopup="menu"
                      :aria-label="`选项点击行为：${currentOptionActionMode.label}`"
                      :title="`选项点击行为：${currentOptionActionMode.label}`"
                      @click="toggleOptionActionModeMenu"
                    >
                      <SlidersHorizontal class="size-4" />
                    </button>
                  </div>

                  <Teleport to="body">
                    <Transition name="option-action-mode-menu">
                      <div
                        v-if="optionActionModeMenuOpen"
                        ref="optionActionModeMenuRef"
                        class="option-action-mode-menu"
                        :style="optionActionModeMenuStyle"
                        role="menu"
                      >
                        <button
                          v-for="mode in OPTION_ACTION_MODES"
                          :key="mode.key"
                          type="button"
                          class="option-action-mode-item"
                          :class="{ 'is-active': optionActionMode === mode.key }"
                          role="menuitemradio"
                          :aria-checked="optionActionMode === mode.key"
                          @click="selectOptionActionMode(mode.key)"
                        >
                          <Send v-if="mode.key === 'send'" class="size-4" />
                          <Replace v-else-if="mode.key === 'replace'" class="size-4" />
                          <Copy v-else class="size-4" />
                          <span>{{ mode.label }}</span>
                          <ChevronRight class="option-action-mode-item__arrow size-3.5" />
                        </button>
                      </div>
                    </Transition>
                  </Teleport>

                  <div class="ui-ornate-divider" aria-hidden="true"></div>

                  <!-- A-D Normal Options -->
                  <button
                    v-for="(option, i) in gameStore.options"
                    :key="'opt-' + i"
                    class="option-action-btn"
                    :style="optionButtonTextStyle"
                    @click="handleOptionClick(option)"
                  >
                    <span class="option-action-btn__marker">{{ getOptionMarker(i) }}</span>
                    <span class="option-action-btn__text">{{ getOptionDisplayText(option) }}</span>
                    <ChevronRight class="option-action-btn__arrow size-5" aria-hidden="true" />
                  </button>

                  <!-- E Option: Special Room Action Button -->
                  <div v-if="gameStore.hasOptionE && specialOptionConfig" class="special-action-section">
                    <div class="action-divider-label">行动</div>
                    <button
                      class="special-action-btn menu-image-button"
                      :aria-label="specialOptionConfig.label"
                      :disabled="specialRoomOpening || roomAssetLoading || appImageStartupLoading"
                      :aria-busy="specialRoomOpening || roomAssetLoading || appImageStartupLoading"
                      @click="handleSpecialOption"
                    >
                      <MainButtonSkin :skin="specialOptionConfig.skin" />
                    </button>
                  </div>

                  <!-- 事件结算：结局判定后需要玩家操作的奖励 / 代价 -->
                  <div v-if="pendingEventAction" class="special-action-section">
                    <div class="action-divider-label">事件</div>
                    <button
                      type="button"
                      class="option-action-btn event-action-btn"
                      :style="optionButtonTextStyle"
                      :disabled="eventActionDisabled"
                      @click="handleEventActionClick"
                    >
                      <span class="option-action-btn__marker">★</span>
                      <span class="option-action-btn__text">{{ pendingEventAction.label }}</span>
                      <ChevronRight class="option-action-btn__arrow size-5" aria-hidden="true" />
                    </button>
                    <button
                      v-if="pendingEventAction.type === 'battle'"
                      type="button"
                      class="event-action-abandon"
                      :disabled="eventActionDisabled"
                      @click="abandonEventAction"
                    >
                      放弃这场战斗
                    </button>
                  </div>

                  <!-- [Leave] 地图选择 -->
                  <div v-if="gameStore.hasLeave && mapSelectionAvailable" class="map-selection-section">
                    <div class="action-divider-label">地图</div>
                    <button
                      type="button"
                      class="map-selection-btn menu-image-button"
                      :aria-label="mapSelectionLabel"
                      @click="openMapForSelection"
                    >
                      <MainButtonSkin skin="menuMap" />
                    </button>
                  </div>

                  <!-- [Rebirth] Reset Button -->
                  <div v-if="gameStore.hasRebirth" class="rebirth-section">
                    <div class="action-divider-label action-divider-label--danger">回溯</div>
                    <div class="flex justify-center">
                      <button
                        class="rebirth-action-btn menu-image-button"
                        :disabled="gameStore.isGenerating"
                        aria-label="回溯重生"
                        @click="handleRebirthClick"
                      >
                        <MainButtonSkin skin="menuRebirth" />
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
                  class="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded-sm text-red-300 font-ui text-sm"
                >
                  {{ gameStore.error }}
                </div>
              </template>
            </div>
            <span class="ui-story-frame__border" aria-hidden="true"></span>
            </div>
          </div>
        </div>
        <!-- Input Area (Stage-Anchored) -->
        <div class="ui-input-anchor absolute inset-x-0 bottom-0 z-60 pb-2">
          <div
            class="ui-input-inner w-full mx-auto px-4 md:px-12 md:pl-24"
            :style="{ maxWidth: textSettings.containerWidth + 'px' }"
          >
            <div class="ui-input-shell p-3">
              <span class="ui-input-shell__border" aria-hidden="true"></span>
              <div class="w-full flex items-stretch gap-2">
                <textarea
                  v-model="inputText"
                  :disabled="gameStore.isGenerating"
                  :placeholder="inputPlaceholder"
                  rows="2"
                  class="ui-input-field flex-1 h-18 resize-none overflow-y-auto text-2xl/normal px-5 py-3 font-ui disabled:opacity-50 disabled:cursor-not-allowed"
                  @keydown.enter.exact.prevent="handleSendInput"
                ></textarea>
                <div v-if="isButtonCompletionEnabled" ref="buttonCompletionMenuRef" class="ui-option-completion-wrap">
                  <button
                    type="button"
                    class="ui-option-completion-trigger h-18 px-4 flex items-center justify-center gap-2 shrink-0"
                    :disabled="gameStore.isGenerating"
                    :aria-expanded="optionCompletionMenuOpen"
                    aria-haspopup="menu"
                    @click="toggleOptionCompletionMenu"
                  >
                    <span class="ui-option-completion-trigger__label">按钮补全</span>
                    <ChevronDown
                      class="size-4 transition-transform duration-200"
                      :class="optionCompletionMenuOpen ? 'rotate-180' : ''"
                    />
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
                  class="ui-send-button h-18 min-w-18 px-3 flex items-center justify-center shrink-0"
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
        <div class="absolute bottom-8 left-8 z-70 flex flex-col gap-2 select-none ui-status-hud">
          <div class="status-hud-actions">
            <button
              class="status-hud-control-btn"
              :title="isStatusOpen ? '折叠状态栏' : '展开状态栏'"
              :aria-label="isStatusOpen ? '折叠状态栏' : '展开状态栏'"
              @click="isStatusOpen = !isStatusOpen"
            >
              <MainButtonSkin :skin="isStatusOpen ? 'collapse' : 'expand'" />
            </button>

            <button
              class="status-hud-control-btn"
              title="打开详细状态栏"
              aria-label="打开详细状态栏"
              @click="openStatusDetailsModal()"
            >
              <MainButtonSkin skin="statusDetails" />
            </button>
          </div>

          <Transition name="status-slide">
            <section v-if="isStatusOpen" class="status-hud-panel">
              <span class="status-hud-panel__border" aria-hidden="true"></span>
              <div class="status-hud-header">
                <span class="status-hud-title">状态</span>
                <span class="status-hud-curse" :class="{ 'is-empty': negativeStatusEntries.length === 0 }">
                  <img :src="STAT_ICON_URLS.curse" alt="" aria-hidden="true" />
                  {{ negativeStatusEntries.length }} 项负面
                </span>
              </div>

              <!-- 生命 / 魔力：宝石图标按剩余比例从下往上“灌注” -->
              <div class="status-hud-vitals">
                <div class="status-hud-vital status-hud-vital--hp" :title="`HP: ${displayHp}/${displayMaxHp}`">
                  <span class="status-hud-gem" :style="{ '--fill': `${hpPercent}%` }" aria-hidden="true">
                    <img class="status-hud-gem__empty" :src="STAT_ICON_URLS.hp" alt="" />
                    <img class="status-hud-gem__full" :src="STAT_ICON_URLS.hp" alt="" />
                  </span>
                  <div class="status-hud-vital-value">
                    <span>HP</span>
                    <strong>{{ displayHp }}/{{ displayMaxHp }}</strong>
                  </div>
                </div>

                <div class="status-hud-vital status-hud-vital--mp" :title="`MP: ${displayMp}`">
                  <span class="status-hud-gem" :style="{ '--fill': `${mpPercent}%` }" aria-hidden="true">
                    <img class="status-hud-gem__empty" :src="STAT_ICON_URLS.mp" alt="" />
                    <img class="status-hud-gem__full" :src="STAT_ICON_URLS.mp" alt="" />
                  </span>
                  <div class="status-hud-vital-value">
                    <span>MP</span>
                    <strong>{{ displayMp }}</strong>
                  </div>
                </div>
              </div>

              <div class="status-hud-minor-grid">
                <div class="status-hud-minor status-hud-minor--dice">
                  <img :src="STAT_ICON_URLS.dice" alt="" aria-hidden="true" />
                  <div>
                    <span>骰子</span>
                    <strong>{{ effectiveDisplayMinDice }}~{{ effectiveDisplayMaxDice }}</strong>
                  </div>
                </div>
                <div class="status-hud-minor status-hud-minor--gold">
                  <img :src="STAT_ICON_URLS.gold" alt="" aria-hidden="true" />
                  <div>
                    <span>金币</span>
                    <strong>{{ displayGold }}</strong>
                  </div>
                </div>
              </div>
            </section>
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
          :icon="FileText"
          :is-open="activeModal === 'statusDetails'"
          panel-class="max-w-6xl"
          @close="activeModal = null"
        >
          <div class="player-detail-modal">
            <div class="player-detail-portrait-panel">
              <div class="player-detail-portrait-shell">
                <span class="player-detail-portrait-frame" aria-hidden="true"></span>
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
                <button type="button" class="player-detail-upload-btn panel-action" @click="openPlayerPortraitUploadDialog">
                  <Upload class="size-4" />
                  上传自定义立绘
                </button>
                <button
                  type="button"
                  class="player-detail-upload-btn player-detail-upload-btn--ghost panel-action"
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
              <div class="player-detail-tabbar panel-tabs">
                <button
                  type="button"
                  class="player-detail-tab panel-tab"
                  :class="{ 'is-active': playerDetailTab === 'status' }"
                  @click="playerDetailTab = 'status'"
                >
                  <FileText aria-hidden="true" />状态
                </button>
                <button
                  type="button"
                  class="player-detail-tab panel-tab"
                  :class="{ 'is-active': playerDetailTab === 'inventory' }"
                  @click="playerDetailTab = 'inventory'"
                >
                  <Box aria-hidden="true" />背包
                </button>
              </div>

              <template v-if="playerDetailTab === 'status'">
                <section class="player-detail-section panel-section">
                  <div class="player-detail-section-title">基础数值</div>
                  <div class="player-detail-stat-grid">
                    <div class="player-detail-stat-card">
                      <img class="player-detail-stat-icon" :src="STAT_ICON_URLS.hp" alt="" aria-hidden="true" />
                      <span class="player-detail-stat-label">生命值</span>
                      <span class="player-detail-stat-value player-detail-stat-value--hp"
                        >{{ displayHp }}/{{ displayMaxHp }}</span
                      >
                    </div>
                    <div class="player-detail-stat-card">
                      <img class="player-detail-stat-icon" :src="STAT_ICON_URLS.mp" alt="" aria-hidden="true" />
                      <span class="player-detail-stat-label">魔量</span>
                      <span class="player-detail-stat-value player-detail-stat-value--mp">{{ displayMp }}</span>
                    </div>
                    <div class="player-detail-stat-card">
                      <img class="player-detail-stat-icon" :src="STAT_ICON_URLS.gold" alt="" aria-hidden="true" />
                      <span class="player-detail-stat-label">金币</span>
                      <span class="player-detail-stat-value player-detail-stat-value--gold">{{ displayGold }}</span>
                    </div>
                    <div class="player-detail-stat-card">
                      <img class="player-detail-stat-icon" :src="STAT_ICON_URLS.dice" alt="" aria-hidden="true" />
                      <span class="player-detail-stat-label">骰子范围</span>
                      <span class="player-detail-stat-value"
                        >{{ effectiveDisplayMinDice }} ~ {{ effectiveDisplayMaxDice }}</span
                      >
                    </div>
                  </div>
                </section>

                <section class="player-detail-section panel-section">
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
                      <img class="player-detail-negative-icon" :src="STAT_ICON_URLS.curse" alt="" aria-hidden="true" />
                      <div class="player-detail-negative-name">{{ entry.name }}</div>
                      <div class="player-detail-negative-desc">{{ entry.description }}</div>
                    </div>
                  </div>
                </section>

                <section v-if="timedEffectEntries.length > 0" class="player-detail-section panel-section">
                  <div class="player-detail-section-head">
                    <div class="player-detail-section-title">限时效果</div>
                    <div class="player-detail-section-meta">{{ timedEffectEntries.length }} 项</div>
                  </div>
                  <div class="player-detail-negative-list">
                    <div
                      v-for="(entry, index) in timedEffectEntries"
                      :key="`detail-timed-${index}`"
                      class="player-detail-negative-item"
                    >
                      <div class="player-detail-negative-name">{{ entry.name }}</div>
                      <div class="player-detail-negative-desc">{{ entry.description }}</div>
                    </div>
                  </div>
                </section>

                <section class="player-detail-section panel-section">
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
                <section class="player-detail-section panel-section">
                  <div class="player-detail-section-head">
                    <div class="player-detail-section-title">背包</div>
                    <div class="player-detail-section-meta">共 {{ totalInventoryEntryCount }} 项</div>
                  </div>

                  <div class="player-detail-subtabbar panel-tabs">
                    <button
                      type="button"
                      class="player-detail-subtab panel-tab"
                      :class="{ 'is-active': playerDetailInventoryTab === 'items' }"
                      @click="playerDetailInventoryTab = 'items'"
                    >
                      物品（{{ inventoryItems.length }}）
                    </button>
                    <button
                      type="button"
                      class="player-detail-subtab panel-tab"
                      :class="{ 'is-active': playerDetailInventoryTab === 'relics' }"
                      @click="playerDetailInventoryTab = 'relics'"
                    >
                      圣遗物（{{ relicEntries.length }}）
                    </button>
                    <button
                      type="button"
                      class="player-detail-subtab panel-tab"
                      :class="{ 'is-active': playerDetailInventoryTab === 'consumables' }"
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
                        class="player-detail-bag-card panel-item"
                      >
                        <div class="player-detail-bag-copy">
                          <div class="player-detail-bag-name">{{ item.名字 }}</div>
                          <div class="player-detail-bag-desc">{{ item.描述 || '暂无描述。' }}</div>
                        </div>
                        <div class="player-detail-bag-actions">
                          <button
                            type="button"
                            class="player-detail-bag-btn panel-action panel-action--danger"
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
                      class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6 mt-4"
                    >
                      <button
                        v-for="relic in relicEntries"
                        :key="relic.name"
                        type="button"
                        class="panel-item inventory-relic relative flex flex-col items-center p-2 transition-colors"
                        :class="{
                          'is-legendary': relic.rarity === '传奇',
                          'is-rare': relic.rarity === '稀有',
                        }"
                        :aria-label="`${relic.name}，${relic.rarity}，数量${relic.count}`"
                        @mouseenter="showRelicTooltip($event, relic)"
                        @mouseleave="hideRelicTooltip"
                        @focus="showRelicTooltip($event, relic)"
                        @blur="hideRelicTooltip"
                        @touchstart.passive="handleRelicTouchStart($event, relic)"
                        @touchend="handleRelicTouchEnd"
                        @touchcancel="handleRelicTouchEnd"
                      >
                        <div class="inventory-relic-icon-wrap">
                          <img class="inventory-relic-icon" :src="getRelicOrbUrl(relic.rarity)" alt="" draggable="false" />
                          <span class="inventory-relic-count">x{{ relic.count }}</span>
                        </div>
                        <span class="inventory-relic-name">{{ relic.name }}</span>
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
                        class="player-detail-bag-card player-detail-bag-card--consumable panel-item"
                      >
                        <div class="player-detail-bag-copy">
                          <div class="player-detail-bag-head">
                            <div class="player-detail-bag-name">{{ consumable.名字 }}</div>
                            <div class="player-detail-bag-tags">
                              <span
                                v-if="consumable.回复 !== 0"
                                class="player-detail-bag-tag player-detail-bag-tag--heal"
                              >
                                回复 {{ formatSignedNumber(consumable.回复) }}
                              </span>
                            </div>
                          </div>
                          <div class="player-detail-bag-desc">{{ consumable.描述 || '暂无描述。' }}</div>
                        </div>
                        <div class="player-detail-bag-actions">
                          <button
                            type="button"
                            class="player-detail-bag-btn panel-action"
                            :disabled="inventoryActionDisabled"
                            @click="useConsumable(index)"
                          >
                            使用
                          </button>
                          <button
                            type="button"
                            class="player-detail-bag-btn panel-action panel-action--danger"
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
          :icon="MapIcon"
          :is-open="activeModal === 'map'"
          variant="bare"
          body-id="dungeon-map-modal-body"
          @body-scroll="handleMapModalBodyScroll"
          @close="activeModal = null"
        >
          <!-- 无外框整张地图：路线图可缩放拖动；楼层信息固定在顶部居中，图例固定在右上方 -->
          <div class="map-modal">
            <div v-if="mapNodes.length === 0" class="map-empty">当前楼层地图尚未生成</div>
            <div
              v-else
              ref="mapViewportRef"
              class="map-viewport"
              @wheel.prevent="handleMapWheel"
              @pointerdown="handleMapPointerDown"
              @pointermove="handleMapPointerMove"
              @pointerup="handleMapPointerUp"
              @pointercancel="handleMapPointerUp"
              @lostpointercapture="handleMapPointerUp"
            >
              <div class="map-canvas" :style="mapCanvasStyle">
                <div class="map-layout" :style="mapLayoutStyle">
                  <svg
                    class="map-links"
                    :width="mapContentWidth"
                    :height="mapContentHeight"
                    :viewBox="`0 0 ${mapContentWidth} ${mapContentHeight}`"
                  >
                    <path
                      v-for="line in mapLines"
                      :key="line.key"
                      :d="line.d"
                      fill="none"
                      :class="{ 'map-link--visited': line.isVisited, 'map-link--gate': mapIsFloorTransition }"
                      :stroke="line.isVisited ? 'rgba(250, 204, 76, 0.98)' : 'rgba(28,24,18,0.68)'"
                      :stroke-width="(line.isVisited ? 3.2 : 2.2) * mapNodeBoost"
                      :stroke-dasharray="line.isVisited ? `${5 * mapNodeBoost} ${6 * mapNodeBoost}` : `${mapNodeBoost} ${7 * mapNodeBoost}`"
                      stroke-linecap="round"
                    />
                  </svg>
                  <button
                    v-for="node in mapNodes"
                    :key="node.key"
                    type="button"
                    class="map-room-cell"
                    :class="{
                      'map-room-cell--latest': node.isLatest,
                      'map-room-cell--visited': node.isVisited,
                      'map-room-cell--available': node.isAvailable,
                      'map-room-cell--boss': node.isBoss,
                      'map-room-cell--start': node.kind === 'start',
                      'map-room-cell--floor': node.kind === 'floor',
                    }"
                    :disabled="!node.isAvailable || gameStore.isGenerating"
                    :title="node.kind === 'room' ? node.roomType : node.label"
                    :aria-label="node.kind === 'room' ? node.roomType : node.label"
                    :style="node.style"
                    @pointerdown.stop
                    @click.stop="handleMapNodeClick(node)"
                  >
                    <template v-if="node.kind === 'floor'">
                      <span class="map-gate__seal" aria-hidden="true">{{ node.gateNumeral }}</span>
                      <span class="map-gate__text">
                        <b>{{ node.label }}</b>
                        <small>{{ mapNextFloorLabel }}</small>
                      </span>
                      <span class="map-gate__arrow" aria-hidden="true">›</span>
                    </template>
                    <template v-else>
                      <span v-if="node.isLatest || node.isAvailable" class="map-room-pulse"></span>
                      <span class="map-room-icon" :style="node.iconStyle" aria-hidden="true"></span>
                      <span class="map-room-label">{{ node.label }}</span>
                    </template>
                  </button>
                </div>
              </div>
            </div>
            <template v-if="mapNodes.length > 0">
              <header class="map-cartouche" aria-label="当前楼层信息">
                <div class="map-cartouche__floor">{{ mapCurrentFloorLabel }}</div>
                <div class="map-cartouche__area">{{ mapCurrentAreaLabel }}</div>
                <div class="map-cartouche__rule" aria-hidden="true"></div>
                <dl class="map-cartouche__stats">
                  <div><dt>已走房间</dt><dd>{{ currentFloorPath.length }}</dd></div>
                  <div><dt>当前房型</dt><dd>{{ mapCurrentRoomLabel }}</dd></div>
                  <div><dt>本层房间</dt><dd>{{ currentLayerRoomCount }}</dd></div>
                </dl>
              </header>
              <aside class="map-legend" aria-label="地图图例">
                <div class="map-legend__title">图例</div>
                <div v-for="entry in mapLegendEntries" :key="entry.roomType" class="map-legend__item">
                  <span class="map-legend__icon" :style="entry.iconStyle" aria-hidden="true"></span>
                  <span class="map-legend__label">{{ entry.label }}</span>
                </div>
              </aside>
            </template>
            <div v-if="mapNodes.length > 0" class="map-controls" @pointerdown.stop>
              <span class="map-controls__zoom">{{ mapZoomPercent }}</span>
              <button type="button" class="map-control-btn" title="缩小地图" aria-label="缩小地图" @click="handleMapZoomOut"><ZoomOut /></button>
              <button type="button" class="map-control-btn" title="放大地图" aria-label="放大地图" @click="handleMapZoomIn"><ZoomIn /></button>
              <button type="button" class="map-control-btn" title="重置视图" aria-label="重置视图" @click="handleMapResetView"><Scan /></button>
            </div>
          </div>
        </DungeonModal>

        <DungeonModal
          title="羁绊"
          :icon="Users"
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
                <span class="bond-portrait-border" aria-hidden="true"></span>
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
          <div v-else class="panel-empty">
            <Users class="size-12 text-dungeon-gold/20" />
            <span>暂无可显示的羁绊角色</span>
          </div>
        </DungeonModal>
        <Teleport to="body">
          <Transition name="combat-fade">
            <div
              v-if="bondPortraitPreview"
              class="fixed inset-0 z-230 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
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
                  <button type="button" class="bond-preview-close-btn" title="关闭立绘" aria-label="关闭立绘" @click="closeBondPortraitPreview"><X class="size-4" /></button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <DungeonModal title="符文卡组" :icon="Scroll" :is-open="activeModal === 'deck'" @close="activeModal = null">
          <div class="panel-caption"><span>已装备卡牌</span><span class="panel-count">{{ resolvedDeck.length }} 张</span></div>
          <div v-if="resolvedDeck.length > 0" class="deck-panel-grid">
            <div
              v-for="(card, i) in resolvedDeck"
              :key="i"
              class="hover:scale-105 transition-transform flex justify-center"
            >
              <DungeonCard :card="card" disabled />
            </div>
          </div>
          <div v-else class="panel-empty">
            <Scroll class="size-12 text-dungeon-gold/20" />
            <span>卡组为空 — 尚未装备技能卡</span>
          </div>
        </DungeonModal>

        <DungeonModal
          title=""
          :is-open="activeModal === 'magicBooks'"
          variant="magic-book"
          panel-class="magic-book-modal-shell"
          @close="activeModal = null"
        >
          <div class="magic-book-world">
            <!-- 书本坐标系：容器严格保持素材 3:2 比例，所有页面/导航均以书本百分比与 cqw 定位 -->
            <div :ref="bindMagicBookShell" class="magic-book-shell" :style="MAGIC_BOOK_SHELL_STYLE">
              <img class="magic-book-shell__book" :src="MAGIC_BOOK_UI_BOOK_URL" alt="" aria-hidden="true" />

              <template v-if="magicBooksNavTab === 'books'">
                <template v-if="magicBookLeftPageEntry && magicBookRightPageEntry">
                  <!-- 左页（静态）：体系插画 -->
                  <section class="magic-book-page magic-book-page--left" aria-label="体系插画">
                    <div
                      class="magic-book-folio magic-book-folio--verso magic-book-art-page"
                      :class="{
                        'is-locked': isMagicBookLocked(magicBookLeftPageEntry.category),
                        'is-unavailable': !magicBookLeftPageEntry.available,
                      }"
                    >
                      <figure class="magic-book-illumination">
                        <div class="magic-book-illumination__plate">
                          <img
                            :src="getMagicBookArtUrl(magicBookLeftPageEntry.category)"
                            :alt="`${magicBookLeftPageEntry.category}体系插画`"
                            class="magic-book-illumination__art"
                          />
                          <span class="magic-book-illumination__grain" aria-hidden="true"></span>
                        </div>
                        <figcaption class="magic-book-illumination__caption">{{ magicBookLeftPageEntry.category }}</figcaption>
                      </figure>
                      <footer class="magic-book-folio__foot">
                        <button
                          type="button"
                          class="magic-book-turn-button magic-book-turn-button--prev"
                          :disabled="magicBookPageIndex <= 0"
                          aria-label="上一页"
                          @click="flipMagicBookPage(-1)"
                        >
                          <ChevronLeft aria-hidden="true" />
                          <span>前页</span>
                        </button>
                        <span class="magic-book-folio__number">已携带 {{ magicBookCarryCount }} / {{ carryableMagicBookNames.length }}</span>
                        <span class="magic-book-folio__spacer" aria-hidden="true"></span>
                      </footer>
                    </div>
                  </section>

                  <!-- 右页（静态）：体系说明与携带操作 -->
                  <section class="magic-book-page magic-book-page--right" :aria-label="`${magicBookRightPageEntry.category}之书`">
                    <div
                      class="magic-book-folio magic-book-folio--recto magic-book-text-page"
                      :class="{
                        'is-equipped': carriedMagicBookSet.has(magicBookRightPageEntry.category),
                        'is-locked': isMagicBookLocked(magicBookRightPageEntry.category),
                        'is-unavailable': !magicBookRightPageEntry.available,
                      }"
                    >
                      <header class="magic-book-heading">
                        <span class="magic-book-heading__eyebrow">体系卡组</span>
                        <h3 class="magic-book-heading__title">{{ magicBookRightPageEntry.category }}之书</h3>
                        <span class="magic-book-rule" aria-hidden="true"></span>
                      </header>
                      <ul class="magic-book-text-page__keywords" aria-label="体系关键词">
                        <li v-for="keyword in magicBookRightPageEntry.keywords" :key="keyword">{{ keyword }}</li>
                      </ul>
                      <p class="magic-book-text-page__description">{{ magicBookRightPageEntry.description }}</p>
                      <div class="magic-book-text-page__actions">
                        <div class="magic-book-text-page__meta">
                          <span>{{ magicBookRightPageEntry.cardCount }} 张卡牌</span>
                          <span class="magic-book-text-page__meta-sep" aria-hidden="true"></span>
                          <span>{{ getMagicBookStatusLabel(magicBookRightPageEntry) }}</span>
                        </div>
                        <button
                          type="button"
                          class="magic-book-seal-button"
                          :class="{ 'is-active': carriedMagicBookSet.has(magicBookRightPageEntry.category) }"
                          :disabled="isUpdatingMagicBooks || !magicBookRightPageEntry.available || isMagicBookLocked(magicBookRightPageEntry.category)"
                          :aria-disabled="magicBookPageTurning"
                          @click="!magicBookPageTurning && toggleMagicBook(magicBookRightPageEntry.category)"
                        >
                          <component :is="getMagicBookToggleIcon(magicBookRightPageEntry)" aria-hidden="true" />
                          <span>{{ getMagicBookToggleLabel(magicBookRightPageEntry) }}</span>
                        </button>
                        <p class="magic-book-text-page__hint">选择体系后，它的卡牌与圣遗物会加入下一次战斗的牌池。</p>
                      </div>
                      <footer class="magic-book-folio__foot">
                        <span class="magic-book-folio__spacer" aria-hidden="true"></span>
                        <span class="magic-book-folio__number">{{ getMagicBookPageNumber(magicBookRightPageEntry) }} / {{ magicBookPages.length }}</span>
                        <button
                          type="button"
                          class="magic-book-turn-button magic-book-turn-button--next"
                          :disabled="magicBookPageIndex >= magicBookPages.length - 1"
                          aria-label="下一页"
                          @click="flipMagicBookPage(1)"
                        >
                          <span>后页</span>
                          <ChevronRight aria-hidden="true" />
                        </button>
                      </footer>
                    </div>
                  </section>

                  <!-- 翻页投影：落在静态书页上，位置与浓度由翻页帧实时驱动 -->
                  <div ref="magicBookTurnShadowLeftEl" class="magic-book-turn-shadow magic-book-turn-shadow--left" aria-hidden="true"></div>
                  <div ref="magicBookTurnShadowRightEl" class="magic-book-turn-shadow magic-book-turn-shadow--right" aria-hidden="true"></div>

                  <!--
                    翻动中的书页：所有分段都以中央装订线 (stage 的 50%) 为原点，
                    正面 = 右页内容，背面 = 左页内容；向后翻 0° → -180°，向前翻 -180° → 0°。
                  -->
                  <div
                    v-if="magicBookPageTurning && magicBookLeafFrontEntry && magicBookLeafBackEntry"
                    ref="magicBookLeafStageEl"
                    class="magic-book-leaf-stage"
                    aria-hidden="true"
                  >
                    <div
                      v-for="(segment, segIdx) in MAGIC_BOOK_LEAF_SEGMENTS"
                      :key="`magic-book-leaf-segment-${segIdx}`"
                      :ref="el => setMagicBookLeafSegmentEl(el, segIdx)"
                      class="magic-book-leaf-seg"
                      :style="segment.segmentStyle"
                    >
                      <div class="magic-book-leaf-face magic-book-leaf-face--front">
                        <div class="magic-book-leaf-sheet magic-book-leaf-sheet--front" :style="segment.frontSheetStyle">
                          <span class="magic-book-leaf-sheet__paper"></span>
                          <span class="magic-book-leaf-sheet__print"></span>
                          <div
                            class="magic-book-folio magic-book-folio--recto magic-book-text-page"
                            :class="{
                              'is-equipped': carriedMagicBookSet.has(magicBookLeafFrontEntry.category),
                              'is-locked': isMagicBookLocked(magicBookLeafFrontEntry.category),
                              'is-unavailable': !magicBookLeafFrontEntry.available,
                            }"
                          >
                            <header class="magic-book-heading">
                              <span class="magic-book-heading__eyebrow">体系卡组</span>
                              <span class="magic-book-heading__title">{{ magicBookLeafFrontEntry.category }}之书</span>
                              <span class="magic-book-rule"></span>
                            </header>
                            <ul class="magic-book-text-page__keywords">
                              <li v-for="keyword in magicBookLeafFrontEntry.keywords" :key="keyword">{{ keyword }}</li>
                            </ul>
                            <p class="magic-book-text-page__description">{{ magicBookLeafFrontEntry.description }}</p>
                            <div class="magic-book-text-page__actions">
                              <div class="magic-book-text-page__meta">
                                <span>{{ magicBookLeafFrontEntry.cardCount }} 张卡牌</span>
                                <span class="magic-book-text-page__meta-sep"></span>
                                <span>{{ getMagicBookStatusLabel(magicBookLeafFrontEntry) }}</span>
                              </div>
                              <span
                                class="magic-book-seal-button"
                                :class="{
                                  'is-active': carriedMagicBookSet.has(magicBookLeafFrontEntry.category),
                                  'is-disabled': !magicBookLeafFrontEntry.available || isMagicBookLocked(magicBookLeafFrontEntry.category),
                                }"
                              >
                                <component :is="getMagicBookToggleIcon(magicBookLeafFrontEntry)" />
                                <span>{{ getMagicBookToggleLabel(magicBookLeafFrontEntry) }}</span>
                              </span>
                              <p class="magic-book-text-page__hint">选择体系后，它的卡牌与圣遗物会加入下一次战斗的牌池。</p>
                            </div>
                            <footer class="magic-book-folio__foot">
                              <span class="magic-book-folio__spacer"></span>
                              <span class="magic-book-folio__number">{{ getMagicBookPageNumber(magicBookLeafFrontEntry) }} / {{ magicBookPages.length }}</span>
                              <span
                                class="magic-book-turn-button magic-book-turn-button--next"
                                :class="{ 'is-disabled': getMagicBookPageNumber(magicBookLeafFrontEntry) >= magicBookPages.length }"
                              >
                                <span>后页</span>
                                <ChevronRight />
                              </span>
                            </footer>
                          </div>
                          <span class="magic-book-leaf-face__shade" :style="segment.frontShadeStyle"></span>
                        </div>
                      </div>
                      <div class="magic-book-leaf-face magic-book-leaf-face--back">
                        <div class="magic-book-leaf-sheet magic-book-leaf-sheet--back" :style="segment.backSheetStyle">
                          <span class="magic-book-leaf-sheet__paper"></span>
                          <span class="magic-book-leaf-sheet__print"></span>
                          <div
                            class="magic-book-folio magic-book-folio--verso magic-book-art-page"
                            :class="{
                              'is-locked': isMagicBookLocked(magicBookLeafBackEntry.category),
                              'is-unavailable': !magicBookLeafBackEntry.available,
                            }"
                          >
                            <figure class="magic-book-illumination">
                              <div class="magic-book-illumination__plate">
                                <img :src="getMagicBookArtUrl(magicBookLeafBackEntry.category)" alt="" class="magic-book-illumination__art" />
                                <span class="magic-book-illumination__grain"></span>
                              </div>
                              <figcaption class="magic-book-illumination__caption">{{ magicBookLeafBackEntry.category }}</figcaption>
                            </figure>
                            <footer class="magic-book-folio__foot">
                              <span
                                class="magic-book-turn-button magic-book-turn-button--prev"
                                :class="{ 'is-disabled': getMagicBookPageNumber(magicBookLeafBackEntry) <= 1 }"
                              >
                                <ChevronLeft />
                                <span>前页</span>
                              </span>
                              <span class="magic-book-folio__number">已携带 {{ magicBookCarryCount }} / {{ carryableMagicBookNames.length }}</span>
                              <span class="magic-book-folio__spacer"></span>
                            </footer>
                          </div>
                          <span class="magic-book-leaf-face__shade" :style="segment.backShadeStyle"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <section v-else class="magic-book-page magic-book-page--right">
                  <div class="magic-book-folio magic-book-folio--recto magic-book-empty">当前没有可选的魔法书。</div>
                </section>
              </template>

              <template v-else>
                <!-- 左页：起始主动技能槽 -->
                <section class="magic-book-page magic-book-page--left" aria-label="主动技能槽">
                  <div class="magic-book-folio magic-book-folio--verso magic-book-active-page">
                    <header class="magic-book-heading magic-book-heading--compact">
                      <span class="magic-book-heading__eyebrow">起始配置 · 已装备 {{ startingActiveEquippedCount }}/2</span>
                      <h3 class="magic-book-heading__title">主动技能槽</h3>
                      <span class="magic-book-rule" aria-hidden="true"></span>
                      <p class="magic-book-heading__note">选择槽位，再从右页装备技能。</p>
                    </header>
                    <div class="magic-book-active-slots">
                      <button
                        v-for="entry in startingActiveSkillEntries"
                        :key="`starting-active-slot-${entry.idx}`"
                        type="button"
                        class="magic-book-active-card-button magic-book-active-card-button--slot"
                        :class="{ 'is-selected': selectedStartingActiveSlot === entry.idx, 'is-empty': !entry.skill }"
                        :disabled="isUpdatingStartingActiveSkills"
                        :aria-pressed="selectedStartingActiveSlot === entry.idx"
                        :aria-label="`编辑主动槽位 ${entry.idx + 1}`"
                        @click="selectedStartingActiveSlot = entry.idx"
                      >
                        <span class="magic-book-active-card-button__gem" aria-hidden="true"></span>
                        <ActiveSkillCard
                          :skill="entry.skill"
                          size="compact"
                          :empty-label="`主动槽位 ${entry.idx + 1}`"
                          :footer-right-text="selectedStartingActiveSlot === entry.idx ? '编辑中' : `槽位 ${entry.idx + 1}`"
                          :footer-right-tone="selectedStartingActiveSlot === entry.idx ? 'success' : 'muted'"
                        />
                      </button>
                    </div>
                    <div class="magic-book-active-slot-caption">
                      <span>当前编辑槽位 {{ selectedStartingActiveSlot + 1 }}</span>
                      <button
                        type="button"
                        class="magic-book-active-clear"
                        :disabled="isUpdatingStartingActiveSkills"
                        @click="clearStartingActiveSkill(selectedStartingActiveSlot)"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                </section>

                <!-- 右页：主动技能库 -->
                <section class="magic-book-page magic-book-page--right" aria-label="主动技能库">
                  <div class="magic-book-folio magic-book-folio--recto magic-book-active-page">
                    <header class="magic-book-heading magic-book-heading--compact">
                      <span class="magic-book-heading__eyebrow">技能库 · {{ startingActiveSkillOptions.length }} 张</span>
                      <h3 class="magic-book-heading__title">选择一张主动技能</h3>
                      <span class="magic-book-rule" aria-hidden="true"></span>
                      <p class="magic-book-heading__note">点击技能，装备到槽位 {{ selectedStartingActiveSlot + 1 }}。</p>
                    </header>
                    <div
                      class="magic-book-active-library"
                      :class="{ 'is-scrollable': magicBookLibraryLayout.scroll }"
                      :style="{ '--mb-lib-cols': magicBookLibraryLayout.cols, '--mb-card-w': magicBookLibraryLayout.width }"
                    >
                      <button
                        v-for="skill in startingActiveSkillOptions"
                        :key="`starting-active-skill-${skill.id}`"
                        type="button"
                        class="magic-book-active-card-button magic-book-active-card-button--library"
                        :class="{ 'is-equipped': isSkillEquippedInStartingActive(skill.name) }"
                        :disabled="isUpdatingStartingActiveSkills"
                        :aria-label="`${isSkillEquippedInStartingActive(skill.name) ? '已装备' : '装备'}${skill.name}`"
                        @click="setStartingActiveSkill(skill)"
                      >
                        <span class="magic-book-active-card-button__gem" aria-hidden="true"></span>
                        <ActiveSkillCard
                          :skill="skill"
                          size="compact"
                          :footer-right-text="isSkillEquippedInStartingActive(skill.name) ? '已装备' : '装备'"
                          :footer-right-tone="isSkillEquippedInStartingActive(skill.name) ? 'success' : 'muted'"
                        />
                      </button>
                    </div>
                  </div>
                </section>
              </template>

              <!-- 底部导航：铆在书脚页边上的铭牌，内端插入中央红宝石扣的金属臂之下 -->
              <nav class="magic-book-nav" aria-label="魔法书分栏">
                <button
                  v-for="tab in MAGIC_BOOK_NAV_TABS"
                  :key="tab.id"
                  type="button"
                  class="magic-book-nav__plate"
                  :class="[tab.plateClass, { 'is-active': magicBooksNavTab === tab.id }]"
                  :aria-pressed="magicBooksNavTab === tab.id"
                  :title="tab.id === 'books' ? `已携带 ${magicBookCarryCount} / ${carryableMagicBookNames.length}` : `已装备 ${startingActiveEquippedCount}/2`"
                  @click="magicBooksNavTab = tab.id"
                >
                  <span class="magic-book-nav__seat" aria-hidden="true"></span>
                  <img class="magic-book-nav__metal" :src="MAGIC_BOOK_UI_PLATE_URL" alt="" aria-hidden="true" draggable="false" />
                  <span class="magic-book-nav__glow" aria-hidden="true"></span>
                  <span class="magic-book-nav__label">{{ tab.label }}</span>
                  <span class="magic-book-nav__gem" aria-hidden="true"></span>
                </button>
              </nav>

              <!-- 装订线金饰：取自书本素材本身，覆盖在书页（含翻动书页）与铭牌之上 -->
              <img class="magic-book-shell__ornaments" :src="MAGIC_BOOK_UI_ORNAMENT_URL" alt="" aria-hidden="true" draggable="false" />
              <span class="magic-book-gem-fx magic-book-gem-fx--crown" aria-hidden="true"><span></span></span>
              <span class="magic-book-gem-fx magic-book-gem-fx--clasp" aria-hidden="true"><span></span></span>
            </div>
          </div>
        </DungeonModal>

        <DungeonModal
          title="魔法帽"
          :icon="Sparkles"
          :is-open="activeModal === 'magicHat'"
          panel-class="max-w-5xl"
          @close="activeModal = null"
        >
          <div class="magic-hat-layout">
            <section class="magic-hat-hero panel-section">
              <div class="magic-hat-hero__content">
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

            <section class="magic-hat-section panel-section">
              <div class="magic-hat-section__head">
                <div>
                  <div class="magic-hat-section__title panel-heading">难度调节</div>
                  <div class="magic-hat-section__subtitle">仅影响局内战斗，不会改动你已经购买或升级过的成长项。</div>
                </div>
              </div>

              <div class="magic-hat-difficulty-layout">
                <div class="magic-hat-difficulty-main">
                  <div class="magic-hat-difficulty-grid">
                    <button
                      v-for="option in magicHatDifficultyOptions"
                      :key="`magic-hat-difficulty-${option.value}`"
                      type="button"
                      class="magic-hat-difficulty-card panel-item"
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
                      <img
                        class="magic-hat-difficulty-card__seal"
                        :src="getMagicHatSealUrl(option.value, option.locked)"
                        alt=""
                        aria-hidden="true"
                      />
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

                  <div v-if="magicHatDifficulty === '自定义'" class="magic-hat-custom-panel">
                    <div
                      v-for="group in magicHatCustomInfluenceGroups"
                      :key="`magic-hat-custom-group-${group.title}`"
                      class="magic-hat-custom-group panel-section"
                      :class="getMagicHatCustomGroupClass(group.title)"
                    >
                      <div class="magic-hat-custom-group__title">{{ group.title }}</div>
                      <div class="magic-hat-custom-options">
                        <button
                          v-for="option in group.options"
                          :key="`magic-hat-custom-${option.value}`"
                          type="button"
                          class="magic-hat-custom-option panel-item"
                          :class="{ 'is-active': hasMagicHatCustomInfluence(option.value) }"
                          :disabled="isUpdatingMagicHatDifficulty"
                          :aria-pressed="hasMagicHatCustomInfluence(option.value)"
                          @click="toggleMagicHatCustomInfluence(option.value)"
                        >
                          <span class="magic-hat-custom-option__head">
                            <span class="magic-hat-custom-option__name">{{ option.label }}</span>
                            <span v-if="hasMagicHatCustomInfluence(option.value)" class="magic-hat-custom-option__state">
                              已启用
                            </span>
                          </span>
                          <span class="magic-hat-custom-option__desc">{{ option.description }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
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

            <section class="magic-hat-section magic-hat-growth-section panel-section">
              <div class="magic-hat-section__head magic-hat-section__head--compact">
                <div>
                  <div class="magic-hat-section__title panel-heading">成长调节</div>
                  <div class="magic-hat-section__subtitle">起始增幅写入当前楼层变量；局外成长跨存档保存在本地。</div>
                </div>
                <div class="magic-hat-growth-actions">
                  <div class="magic-hat-points-card">
                    <span class="magic-hat-points-card__label">技能点存量</span>
                    <span class="magic-hat-points-card__value">{{ magicHatSkillPoints }}</span>
                  </div>
                  <button
                    type="button"
                    class="magic-hat-reset-btn panel-action panel-action--danger"
                    :disabled="isUpgradingMagicHat || magicHatResetRefund <= 0"
                    @click="resetMagicHatGrowths"
                  >
                    <span>重置成长</span>
                    <small>{{ magicHatResetRefund > 0 ? `返还 ${magicHatResetRefund} 技能点` : '没有可重置项' }}</small>
                  </button>
                </div>
              </div>

              <div class="magic-hat-growth-subhead">
                <div class="magic-hat-growth-subhead__title">起始增幅</div>
                <div class="magic-hat-growth-subhead__text">决定每次开局的基础数值。</div>
              </div>

              <div class="magic-hat-track-grid">
                <article
                  v-for="track in magicHatTracks"
                  :key="`magic-hat-${track.id}`"
                  class="magic-hat-track-card panel-item"
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
                      <span class="magic-hat-track-card__stat-value"
                        >{{ track.currentLevel }}/{{ track.maxLevel }}</span
                      >
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
                    class="magic-hat-track-card__action panel-action"
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

              <div class="magic-hat-growth-subhead">
                <div class="magic-hat-growth-subhead__title">局外成长</div>
                <div class="magic-hat-growth-subhead__text">永久解锁，跨存档保留。</div>
              </div>

              <div class="magic-hat-track-grid">
                <article
                  v-for="growth in magicHatMetaGrowthCards"
                  :key="`magic-hat-growth-${growth.id}`"
                  class="magic-hat-track-card panel-item"
                  :class="getMagicHatMetaGrowthClass(growth.id)"
                >
                  <div class="magic-hat-track-card__top">
                    <div>
                      <div class="magic-hat-track-card__kicker">{{ growth.kicker }}</div>
                      <div class="magic-hat-track-card__title">{{ growth.label }}</div>
                    </div>
                    <div class="magic-hat-track-card__rune">{{ growth.rune }}</div>
                  </div>

                  <div class="magic-hat-track-card__stats">
                    <div class="magic-hat-track-card__stat">
                      <span class="magic-hat-track-card__stat-label">状态</span>
                      <span class="magic-hat-track-card__stat-value">{{ growth.owned ? '已解锁' : '未解锁' }}</span>
                    </div>
                    <div class="magic-hat-track-card__stat">
                      <span class="magic-hat-track-card__stat-label">价格</span>
                      <span class="magic-hat-track-card__stat-value">{{ growth.cost }}</span>
                    </div>
                  </div>

                  <div class="magic-hat-track-card__bar">
                    <div
                      class="magic-hat-track-card__bar-fill"
                      :class="growth.barClass"
                      :style="{ width: growth.owned ? '100%' : '0%' }"
                    ></div>
                  </div>

                  <div class="magic-hat-track-card__hint">
                    {{ growth.description }}
                  </div>

                  <button
                    type="button"
                    class="magic-hat-track-card__action panel-action"
                    :class="{ 'is-disabled': growth.owned }"
                    :disabled="isUpgradingMagicHat || growth.owned"
                    @click="unlockMagicHatMetaGrowth(growth.id)"
                  >
                    <span class="magic-hat-track-card__action-label">{{ growth.owned ? '已拥有' : '立即解锁' }}</span>
                    <span class="magic-hat-track-card__action-cost">
                      {{ growth.owned ? '永久生效' : `消耗 ${growth.cost} 技能点` }}
                    </span>
                  </button>
                </article>
              </div>
            </section>
          </div>
        </DungeonModal>

        <!-- 初次进入：三个关键按钮的新手指引 -->
        <SpotlightGuide
          :open="showMainGuide"
          :steps="mainGuideSteps"
          :finish-label="canEditMagicBooks ? '打开魔法书' : '开始冒险'"
          :secondary-finish-label="canEditMagicBooks ? '稍后再看' : ''"
          @finish="finishMainGuide(true)"
          @skip="finishMainGuide(false)"
        />

        <Teleport to="body">
          <div
            v-if="relicTooltip"
            class="fixed z-220 pointer-events-none relic-tooltip"
            :style="{ left: `${relicTooltip.x}px`, top: `${relicTooltip.y}px` }"
          >
            <div class="relic-tooltip-head">
              <img class="relic-tooltip-orb" :src="getRelicOrbUrl(relicTooltip.rarity)" alt="" />
              <div class="relic-tooltip-name">{{ relicTooltip.name }}</div>
            </div>
            <div class="relic-tooltip-desc">{{ relicTooltip.description }}</div>
          </div>
        </Teleport>

        <!-- Settings Modal -->
        <DungeonModal
          title="系统设置"
          variant="settings"
          :is-open="activeModal === 'settings'"
          @close="
            activeModal = null;
            closeSettingsHelp();
          "
        >
          <div class="settings-panel">
            <div class="settings-nav" role="tablist" aria-label="设置分类" @keydown="handleSettingsTabKeydown">
              <button
                v-for="tab in settingsTabs"
                :id="`settings-tab-${tab.id}`"
                :key="tab.id"
                type="button"
                role="tab"
                class="settings-nav-btn"
                :class="{ 'is-active': settingsNavTab === tab.id }"
                :aria-selected="settingsNavTab === tab.id"
                aria-controls="settings-content"
                :tabindex="settingsNavTab === tab.id ? 0 : -1"
                @click="settingsNavTab = tab.id"
              >
                <component :is="tab.icon" aria-hidden="true" />
                <span>{{ tab.label }}</span>
              </button>
            </div>
            <div id="settings-content" role="tabpanel" :aria-labelledby="`settings-tab-${settingsNavTab}`" tabindex="0">
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
                    class="settings-select bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper text-sm px-3 py-1.5 rounded-sm focus:outline-none focus:border-dungeon-gold font-ui sm:min-w-56"
                  >
                    <option value="'Cinzel', serif">Cinzel (默认)</option>
                    <option value="'Noto Serif SC', serif">思源宋体</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'MedievalSharp', cursive">MedievalSharp</option>
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
                    aria-label="自动回顶"
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
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>单层显示</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('singleLayerDisplay')"
                      @mouseleave="closeSettingsHelp('singleLayerDisplay')"
                      @focus="openSettingsHelp('singleLayerDisplay')"
                      @blur="closeSettingsHelp('singleLayerDisplay')"
                      @touchstart.passive="startSettingsHelpTouch('singleLayerDisplay')"
                      @touchend="endSettingsHelpTouch('singleLayerDisplay')"
                      @touchcancel="endSettingsHelpTouch('singleLayerDisplay')"
                      @click.stop.prevent="toggleSettingsHelp('singleLayerDisplay')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'singleLayerDisplay'" class="settings-help-popover">
                        {{ settingsHelpText.singleLayerDisplay }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    aria-label="单层显示"
                    :class="{ 'is-on': textSettings.singleLayerDisplay }"
                    :aria-checked="textSettings.singleLayerDisplay"
                    role="switch"
                    @click="setSingleLayerDisplay(!textSettings.singleLayerDisplay)"
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
              <h3 class="settings-section-title">声音与特效</h3>
              <SoundSettings include-music />
            </section>

            <section v-else-if="settingsNavTab === 'ai'" class="settings-section settings-section--ai">
              <h3 class="settings-section-title">AI回复</h3>
              <div class="space-y-4">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>启用流式传输</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('streamingEnabled')"
                      @mouseleave="closeSettingsHelp('streamingEnabled')"
                      @focus="openSettingsHelp('streamingEnabled')"
                      @blur="closeSettingsHelp('streamingEnabled')"
                      @touchstart.passive="startSettingsHelpTouch('streamingEnabled')"
                      @touchend="endSettingsHelpTouch('streamingEnabled')"
                      @touchcancel="endSettingsHelpTouch('streamingEnabled')"
                      @click.stop.prevent="toggleSettingsHelp('streamingEnabled')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'streamingEnabled'" class="settings-help-popover">
                        {{ settingsHelpText.streamingEnabled }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isStreamingEnabled }"
                    aria-label="启用流式传输"
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
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>禁止匹配思维链内XML标签</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('forbidMatchingXmlInsideThink')"
                      @mouseleave="closeSettingsHelp('forbidMatchingXmlInsideThink')"
                      @focus="openSettingsHelp('forbidMatchingXmlInsideThink')"
                      @blur="closeSettingsHelp('forbidMatchingXmlInsideThink')"
                      @touchstart.passive="startSettingsHelpTouch('forbidMatchingXmlInsideThink')"
                      @touchend="endSettingsHelpTouch('forbidMatchingXmlInsideThink')"
                      @touchcancel="endSettingsHelpTouch('forbidMatchingXmlInsideThink')"
                      @click.stop.prevent="toggleSettingsHelp('forbidMatchingXmlInsideThink')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'forbidMatchingXmlInsideThink'" class="settings-help-popover">
                        {{ settingsHelpText.forbidMatchingXmlInsideThink }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isForbidMatchingXmlInsideThinkEnabled }"
                    aria-label="禁止匹配思维链内XML标签"
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
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>按钮补全</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('buttonCompletion')"
                      @mouseleave="closeSettingsHelp('buttonCompletion')"
                      @focus="openSettingsHelp('buttonCompletion')"
                      @blur="closeSettingsHelp('buttonCompletion')"
                      @touchstart.passive="startSettingsHelpTouch('buttonCompletion')"
                      @touchend="endSettingsHelpTouch('buttonCompletion')"
                      @touchcancel="endSettingsHelpTouch('buttonCompletion')"
                      @click.stop.prevent="toggleSettingsHelp('buttonCompletion')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'buttonCompletion'" class="settings-help-popover">
                        {{ settingsHelpText.buttonCompletion }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isButtonCompletionEnabled }"
                    aria-label="按钮补全"
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

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>地图/重生附带输入</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('mapRebirthInputAppend')"
                      @mouseleave="closeSettingsHelp('mapRebirthInputAppend')"
                      @focus="openSettingsHelp('mapRebirthInputAppend')"
                      @blur="closeSettingsHelp('mapRebirthInputAppend')"
                      @touchstart.passive="startSettingsHelpTouch('mapRebirthInputAppend')"
                      @touchend="endSettingsHelpTouch('mapRebirthInputAppend')"
                      @touchcancel="endSettingsHelpTouch('mapRebirthInputAppend')"
                      @click.stop.prevent="toggleSettingsHelp('mapRebirthInputAppend')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'mapRebirthInputAppend'" class="settings-help-popover">
                        {{ settingsHelpText.mapRebirthInputAppend }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isMapRebirthInputAppendEnabled }"
                    aria-label="地图重生输入追加"
                    :aria-checked="isMapRebirthInputAppendEnabled"
                    role="switch"
                    @click="isMapRebirthInputAppendEnabled = !isMapRebirthInputAppendEnabled"
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
                    <span>剧情精简模式</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('fastMode')"
                      @mouseleave="closeSettingsHelp('fastMode')"
                      @focus="openSettingsHelp('fastMode')"
                      @blur="closeSettingsHelp('fastMode')"
                      @touchstart.passive="startSettingsHelpTouch('fastMode')"
                      @touchend="endSettingsHelpTouch('fastMode')"
                      @touchcancel="endSettingsHelpTouch('fastMode')"
                      @click.stop.prevent="toggleSettingsHelp('fastMode')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'fastMode'" class="settings-help-popover">
                        <div>{{ settingsHelpText.fastMode }}</div>
                        <div class="settings-help-popover-warning">
                          打开该模式后，对于跨房间或房间特殊操作等操作将不受限制，因此操作不当可能会导致 bug，请谨慎开启。
                        </div>
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isFastModeEnabled, 'is-disabled': isFastModeLocked }"
                    aria-label="快速模式"
                    :aria-checked="isFastModeEnabled"
                    :disabled="isFastModeLocked"
                    role="switch"
                    @click="toggleFastModeSetting"
                  >
                    <span class="settings-switch-track">
                      <span class="settings-switch-label settings-switch-label--off">关</span>
                      <span class="settings-switch-label settings-switch-label--on">开</span>
                      <span class="settings-switch-thumb"></span>
                    </span>
                  </button>
                </div>

                <div
                  v-if="isCombatTestUnlocked"
                  class="flex flex-col gap-2 pl-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>测试模式</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('testMode')"
                      @mouseleave="closeSettingsHelp('testMode')"
                      @focus="openSettingsHelp('testMode')"
                      @blur="closeSettingsHelp('testMode')"
                      @touchstart.passive="startSettingsHelpTouch('testMode')"
                      @touchend="endSettingsHelpTouch('testMode')"
                      @touchcancel="endSettingsHelpTouch('testMode')"
                      @click.stop.prevent="toggleSettingsHelp('testMode')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'testMode'" class="settings-help-popover">
                        {{ settingsHelpText.testMode }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isTestModeEnabled }"
                    aria-label="测试模式"
                    :aria-checked="isTestModeEnabled"
                    role="switch"
                    @click="toggleTestModeSetting"
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
                    aria-label="自动总结"
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
                      class="w-20 bg-[#1a0f08] border border-dungeon-brown text-dungeon-paper text-sm px-3 py-1.5 rounded-sm focus:outline-none focus:border-dungeon-gold font-ui disabled:opacity-45 disabled:cursor-not-allowed"
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

                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                    <span>大总结流式输出</span>
                    <button
                      type="button"
                      class="settings-help-trigger"
                      @mouseenter="openSettingsHelp('bigSummaryStreaming')"
                      @mouseleave="closeSettingsHelp('bigSummaryStreaming')"
                      @focus="openSettingsHelp('bigSummaryStreaming')"
                      @blur="closeSettingsHelp('bigSummaryStreaming')"
                      @touchstart.passive="startSettingsHelpTouch('bigSummaryStreaming')"
                      @touchend="endSettingsHelpTouch('bigSummaryStreaming')"
                      @touchcancel="endSettingsHelpTouch('bigSummaryStreaming')"
                      @click.stop.prevent="toggleSettingsHelp('bigSummaryStreaming')"
                    >
                      ?
                    </button>
                    <Transition name="settings-help-fade">
                      <div v-if="activeSettingsHelp === 'bigSummaryStreaming'" class="settings-help-popover">
                        {{ settingsHelpText.bigSummaryStreaming }}
                      </div>
                    </Transition>
                  </div>
                  <button
                    type="button"
                    class="settings-switch sm:shrink-0"
                    :class="{ 'is-on': isBigSummaryStreamingEnabled }"
                    aria-label="大总结流式输出"
                    :aria-checked="isBigSummaryStreamingEnabled"
                    role="switch"
                    @click="isBigSummaryStreamingEnabled = !isBigSummaryStreamingEnabled"
                  >
                    <span class="settings-switch-track">
                      <span class="settings-switch-label settings-switch-label--off">关</span>
                      <span class="settings-switch-label settings-switch-label--on">开</span>
                      <span class="settings-switch-thumb"></span>
                    </span>
                  </button>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <div class="settings-help text-dungeon-paper/70 text-sm font-ui">
                      <span>大总结提示词</span>
                      <button
                        type="button"
                        class="settings-help-trigger"
                        @mouseenter="openSettingsHelp('bigSummaryPrompt')"
                        @mouseleave="closeSettingsHelp('bigSummaryPrompt')"
                        @focus="openSettingsHelp('bigSummaryPrompt')"
                        @blur="closeSettingsHelp('bigSummaryPrompt')"
                        @touchstart.passive="startSettingsHelpTouch('bigSummaryPrompt')"
                        @touchend="endSettingsHelpTouch('bigSummaryPrompt')"
                        @touchcancel="endSettingsHelpTouch('bigSummaryPrompt')"
                        @click.stop.prevent="toggleSettingsHelp('bigSummaryPrompt')"
                      >
                        ?
                      </button>
                      <Transition name="settings-help-fade">
                        <div v-if="activeSettingsHelp === 'bigSummaryPrompt'" class="settings-help-popover">
                          {{ settingsHelpText.bigSummaryPrompt }}
                        </div>
                      </Transition>
                    </div>
                    <button
                      type="button"
                      class="settings-prompt-reset-btn"
                      title="恢复默认提示词"
                      @click="restoreDefaultBigSummaryPrompt"
                    >
                      <RotateCcw class="size-4" />
                      <span>恢复默认</span>
                    </button>
                  </div>
                  <div class="settings-prompt-group-editor">
                    <div class="settings-prompt-group-toolbar">
                      <span class="settings-prompt-group-count">提示词段（{{ bigSummaryPromptSegments.length }}）</span>
                      <button
                        type="button"
                        class="settings-prompt-add-btn"
                        @click="addBigSummaryPromptSegment(0)"
                      >
                        <Plus class="size-4" aria-hidden="true" />
                        <span>在最上方插入</span>
                      </button>
                    </div>

                    <div v-if="bigSummaryPromptSegments.length === 0" class="settings-prompt-group-empty">
                      暂无提示词段，点击上方按钮添加。
                    </div>

                    <div
                      v-for="(segment, segmentIndex) in bigSummaryPromptSegments"
                      :key="segment.id"
                      class="settings-prompt-group"
                    >
                      <div class="settings-prompt-group-head">
                        <span class="settings-prompt-group-index">#{{ segmentIndex + 1 }}</span>
                        <select
                          v-model="segment.role"
                          class="settings-prompt-role-select"
                          aria-label="提示词段角色"
                          @change="persistBigSummaryPromptEditor"
                        >
                          <option v-for="role in bigSummaryPromptRoleOptions" :key="role.value" :value="role.value">
                            {{ role.label }}
                          </option>
                        </select>
                        <div class="settings-prompt-group-actions">
                          <button
                            type="button"
                            class="settings-prompt-icon-btn"
                            :disabled="segmentIndex === 0"
                            :aria-label="`上移第 ${segmentIndex + 1} 段`"
                            title="上移"
                            @click="moveBigSummaryPromptSegment(segmentIndex, -1)"
                          >
                            <ArrowUp class="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            class="settings-prompt-icon-btn"
                            :disabled="segmentIndex === bigSummaryPromptSegments.length - 1"
                            :aria-label="`下移第 ${segmentIndex + 1} 段`"
                            title="下移"
                            @click="moveBigSummaryPromptSegment(segmentIndex, 1)"
                          >
                            <ArrowDown class="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            class="settings-prompt-icon-btn settings-prompt-icon-btn--danger"
                            :disabled="bigSummaryPromptSegments.length <= 1"
                            :aria-label="`删除第 ${segmentIndex + 1} 段`"
                            title="删除"
                            @click="removeBigSummaryPromptSegment(segmentIndex)"
                          >
                            <Trash2 class="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        v-model="segment.content"
                        class="settings-big-summary-prompt"
                        rows="7"
                        spellcheck="false"
                        :aria-label="`${segment.role} 提示词段 ${segmentIndex + 1}`"
                        @input="persistBigSummaryPromptEditor"
                      ></textarea>
                    </div>

                    <button type="button" class="settings-prompt-add-secondary-btn" @click="addBigSummaryPromptSegment()">
                      <Plus class="size-4" aria-hidden="true" />
                      <span>添加提示词段</span>
                    </button>
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

            </div>
            <div class="settings-system-actions">
              <h3 class="settings-section-title settings-section-title--neutral">系统</h3>
              <div class="settings-system-grid">
                <button class="settings-action-btn settings-action-btn--gold" @click="toggleFullScreen">
                  <Maximize2 aria-hidden="true" />
                  切换全屏模式
                </button>
                <button class="settings-action-btn settings-action-btn--danger" @click="$emit('backToSplash')">
                  <LogOut aria-hidden="true" />
                  退出到标题
                </button>
                <button class="settings-action-btn settings-action-btn--gold" @click="replayMainGuide">
                  <BookOpen aria-hidden="true" />
                  重新查看新手指引
                </button>
                <button
                  class="settings-action-btn"
                  :class="missingVariablePaths.length > 0 ? 'settings-action-btn--accent' : 'settings-action-btn--gold'"
                  :disabled="variableMigrationApplying || gameStore.isGenerating"
                  :title="
                    missingVariablePaths.length > 0
                      ? `当前存档缺少 ${missingVariablePaths.length} 个新变量：${missingVariablePaths.slice(0, 6).join('、')}${missingVariablePaths.length > 6 ? '……' : ''}`
                      : '当前存档已是最新变量结构'
                  "
                  @click="runVariableMigration"
                >
                  <DatabaseZap aria-hidden="true" />
                  {{ missingVariablePaths.length > 0 ? `更新变量结构（缺 ${missingVariablePaths.length} 项）` : '变量结构已是最新' }}
                </button>
                <button
                  class="settings-action-btn settings-action-btn--test"
                  :class="isCombatTestUnlocked ? 'settings-action-btn--accent' : 'settings-action-btn--locked'"
                  :title="isCombatTestUnlocked ? 'GM界面：战斗测试、事件结局触发' : '作者测试用'"
                  @click="handleCombatTestButtonClick"
                >
                  <Wrench v-if="isCombatTestUnlocked" aria-hidden="true" />
                  <LockKeyhole v-else aria-hidden="true" />
                  {{ isCombatTestUnlocked ? 'GM界面' : '作者测试用' }}
                </button>
              </div>
            </div>
          </div>
        </DungeonModal>

        <DungeonModal title="大总结结果确认" :icon="NotebookText" :is-open="!!bigSummaryDraft" @close="closeBigSummaryDraft">
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

        <!-- GM 界面：战斗测试入口 + 全部事件结局触发 -->
        <DungeonModal
          title="GM界面"
          :icon="Wrench"
          panel-class="dungeon-modal--fullscreen"
          :is-open="activeModal === 'gmPanel'"
          @close="activeModal = null"
        >
          <div class="gm-panel">
            <section class="gm-section">
              <h3 class="gm-section__title">战斗测试</h3>
              <div class="gm-row">
                <button type="button" class="settings-action-btn settings-action-btn--accent" @click="openCombatTestFromGm">
                  <Swords aria-hidden="true" />
                  打开战斗测试配置
                </button>
              </div>
            </section>

            <section class="gm-section">
              <h3 class="gm-section__title">小游戏直达</h3>
              <div class="gm-row">
                <button type="button" class="settings-action-btn settings-action-btn--gold" @click="gmTriggerEventOutcome('大转盘', '结局二')">大转盘</button>
                <button type="button" class="settings-action-btn settings-action-btn--gold" @click="gmTriggerEventOutcome('扭蛋机', '结局二')">扭蛋机</button>
                <button type="button" class="settings-action-btn settings-action-btn--gold" @click="gmTriggerEventOutcome('占卜', '结局二')">占卜（付钱 · 3 次）</button>
                <button type="button" class="settings-action-btn settings-action-btn--gold" @click="gmTriggerEventOutcome('占卜', '结局三')">占卜（诅咒 · 6 次）</button>
              </div>
              <p class="gm-hint">触发后关闭本界面，点击选项区的「事件」按钮进入小游戏。占卜结局二会扣 10 金币，结局三会先要求替换【债务】诅咒。</p>
            </section>

            <section class="gm-section">
              <h3 class="gm-section__title">事件状态</h3>
              <p class="gm-hint">{{ gmCurrentEventSummary }}</p>
              <div class="gm-row">
                <button type="button" class="settings-action-btn settings-action-btn--gold" @click="gmResetEventState">重置事件状态</button>
                <button
                  type="button"
                  class="settings-action-btn settings-action-btn--danger"
                  :disabled="gmPendingNoticeCount === 0"
                  @click="gmClearEventNotices"
                >
                  清空待注入的结算说明（{{ gmPendingNoticeCount }}）
                </button>
              </div>
              <p class="gm-hint">测试产生的结算说明会附在下一条发送给 LLM 的消息里；只想看前端效果时，测试完记得清空。</p>
            </section>

            <section class="gm-section">
              <div class="gm-section__head">
                <h3 class="gm-section__title">事件结局触发</h3>
                <input v-model="gmEventFilter" type="text" class="gm-search" placeholder="搜索事件或区域" />
              </div>
              <p class="gm-hint">
                点击结局会把当前房间切为事件房、按真实流程抽定出场对象并写入判定结果，之后由正常的结算流程处理。灰色按钮表示该结局只有剧情、没有结算。
              </p>
              <div v-for="group in gmEventGroups" :key="`gm-group-${group.label}`" class="gm-group">
                <div class="gm-group__label">{{ group.label }}</div>
                <div class="gm-event-list">
                  <div v-for="event in group.events" :key="`gm-event-${event.name}`" class="gm-event">
                    <div class="gm-event__name">
                      {{ event.name }}<span v-if="event.area" class="gm-event__area">{{ event.area }}</span>
                    </div>
                    <div class="gm-event__verdicts">
                      <button
                        v-for="verdict in EVENT_VERDICTS"
                        :key="`gm-${event.name}-${verdict}`"
                        type="button"
                        class="gm-verdict"
                        :class="{ 'is-empty': !getGmVerdictState(event.name, verdict).configured }"
                        :title="getGmVerdictState(event.name, verdict).label"
                        :disabled="gameStore.isGenerating"
                        @click="gmTriggerEventOutcome(event.name, verdict)"
                      >
                        <span class="gm-verdict__name">{{ verdict }}</span>
                        <span class="gm-verdict__label">{{ getGmVerdictState(event.name, verdict).label }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </DungeonModal>

        <!-- Combat Test Builder Modal -->
        <DungeonModal
          title="战斗测试配置"
          :icon="Swords"
          panel-class="dungeon-modal--fullscreen"
          :is-open="activeModal === 'combatTestBuilder'"
          @close="activeModal = null"
        >
          <div class="flex flex-col gap-4 w-full">
            <template v-if="combatTestStep === 'deck'">
              <div class="flex items-center justify-between">
                <h3 class="font-heading text-dungeon-gold text-sm tracking-widest uppercase">步骤1：组建卡组（9张）</h3>
                <span class="text-xs font-ui text-dungeon-paper/70">{{ selectedTestDeck.length }}/9</span>
              </div>

              <div class="rounded-sm border border-dungeon-brown/60 bg-dungeon-dark/50 p-3">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-[11px] text-dungeon-paper/70">已选卡牌（点击移除）</span>
                  <span class="text-[11px] text-dungeon-gold/80">{{ selectedTestDeck.length }}/9</span>
                </div>
                <div class="max-h-52 overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
                  <button
                    v-for="entry in selectedTestDeckCards"
                    :key="`selected-card-${entry.idx}`"
                    class="w-full text-left flex items-stretch gap-2 rounded-sm border border-dungeon-gold/20 bg-[#1a0f08]/70 p-2 hover:border-dungeon-gold/50 transition-colors"
                    @click="removeCardFromTestDeck(entry.idx)"
                  >
                    <span class="w-1.5 rounded-sm" :class="getCardCategoryStripClass(entry.card.category)"></span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-heading text-dungeon-gold truncate">{{ entry.card.name }}</span>
                        <span class="text-[10px] px-1 rounded-sm border" :class="getCardTypeBadgeClass(entry.card.type)">{{
                          entry.card.type
                        }}</span>
                        <span class="text-[10px] px-1 rounded-sm border border-white/15 text-dungeon-paper/60">{{
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
                    class="rounded-sm border border-dungeon-brown/40 bg-black/20 py-6 text-center text-xs text-dungeon-paper/40"
                  >
                    尚未选择卡牌
                  </div>
                </div>
                <div class="mt-2 grid grid-cols-9 gap-1">
                  <div
                    v-for="idx in 9"
                    :key="`deck-slot-${idx}`"
                    class="h-2 rounded-sm border"
                    :class="
                      idx <= selectedTestDeck.length
                        ? 'bg-dungeon-gold/70 border-dungeon-gold/60'
                        : 'bg-black/20 border-dungeon-brown/40'
                    "
                  ></div>
                </div>
              </div>

              <div
                class="max-h-[72vh] overflow-y-auto rounded-sm border border-dungeon-brown/60 bg-dungeon-dark/40 p-3 custom-scrollbar"
              >
                <div class="space-y-3">
                  <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                    <button
                      v-for="category in cardCategoryTabsForTest"
                      :key="`card-tab-${category}`"
                      class="h-7 px-3 rounded-sm border text-xs shrink-0 transition-colors"
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
                    class="rounded-sm border border-dungeon-brown/40 bg-[#110a06]/40 p-2"
                  >
                    <div class="mb-2 flex items-center justify-between">
                      <h4 class="font-heading text-[11px] tracking-wider uppercase text-dungeon-gold/90">
                        {{ group.category }}
                      </h4>
                      <span class="text-[10px] text-dungeon-paper/50">{{ group.cards.length }} 张</span>
                    </div>
                    <div class="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] justify-items-center gap-4">
                      <button
                        v-for="card in group.cards"
                        :key="`all-card-${group.category}-${card.id}`"
                        class="hover:scale-105 transition-transform flex flex-col items-center rounded-sm border border-dungeon-brown/40 bg-[#1a0f08]/50 p-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    class="rounded-sm border border-dungeon-brown/40 bg-black/20 py-6 text-center text-xs text-dungeon-paper/40"
                  >
                    当前分类暂无可选卡牌
                  </div>
                </div>
              </div>

              <div class="mt-4 rounded-sm border border-dungeon-brown/60 bg-dungeon-dark/40 p-3">
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-heading text-dungeon-gold text-xs tracking-wider uppercase">测试主动技</h4>
                  <span class="text-[11px] text-dungeon-paper/60">作者测试可选择全部主动技</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    v-for="entry in testActiveSkillEntries"
                    :key="`test-active-slot-${entry.idx}`"
                    class="rounded-sm border border-dungeon-brown/50 bg-[#1a0f08]/70 p-3"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="text-xs font-heading text-dungeon-gold">槽位 {{ entry.idx + 1 }}</div>
                        <div class="text-[11px] text-dungeon-paper/75">{{ entry.skill?.name ?? '未选择主动技' }}</div>
                      </div>
                      <button
                        class="px-2 py-1 rounded-sm border border-dungeon-brown/60 text-[11px] text-dungeon-paper/70 hover:border-dungeon-gold/45"
                        @click="clearTestActiveSkill(entry.idx)"
                      >
                        清空
                      </button>
                    </div>
                    <div class="mt-2 text-[10px] text-dungeon-paper/60 min-h-[30px]">
                      {{ entry.skill?.description ?? '从下方列表选择一个主动技装入该槽位。' }}
                    </div>
                    <div class="mt-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
                      <button
                        v-for="skill in activeSkillsForBattle"
                        :key="`test-active-pick-${entry.idx}-${skill.id}`"
                        class="w-full text-left rounded-sm border px-2 py-1.5 text-[11px] transition-colors"
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
                  class="px-4 py-2 rounded-sm border border-dungeon-brown text-dungeon-paper/70 hover:border-dungeon-gold/50"
                  @click="activeModal = null"
                >
                  取消
                </button>
                <button
                  class="px-4 py-2 rounded-sm border border-dungeon-gold/40 text-dungeon-gold hover:bg-dungeon-brown disabled:opacity-40 disabled:cursor-not-allowed"
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
                class="max-h-[60vh] overflow-y-auto rounded-sm border border-dungeon-brown/60 bg-dungeon-dark/40 p-2 custom-scrollbar"
              >
                <div class="space-y-2">
                  <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                    <button
                      v-for="floorLabel in combatTestEnemyFloorTabs"
                      :key="`combat-test-floor-${floorLabel}`"
                      class="h-7 px-3 rounded-sm border text-xs shrink-0 transition-colors"
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
                  <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                    <button
                      v-for="enemy in filteredEnemyEntriesForTest"
                      :key="`enemy-${enemy.name}`"
                      class="text-left px-3 py-2 rounded-sm border text-xs transition-colors"
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
                    class="rounded-sm border border-dungeon-brown/40 bg-black/20 py-6 text-center text-xs text-dungeon-paper/40"
                  >
                    当前楼层分类暂无可选魔物
                  </div>
                </div>
              </div>

              <div class="rounded-sm border border-dungeon-brown/60 bg-dungeon-dark/40 p-3">
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-heading text-dungeon-gold text-xs tracking-wider uppercase">圣遗物自选</h4>
                  <span class="text-[11px] text-dungeon-paper/60">将同步写入 MVU `携带的物品._圣遗物`</span>
                </div>
                <div class="max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                  <div class="space-y-2">
                    <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                      <button
                        v-for="category in relicCategoryTabsForTest"
                        :key="`relic-tab-${category}`"
                        class="h-7 px-3 rounded-sm border text-xs shrink-0 transition-colors"
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
                      class="rounded-sm border border-dungeon-brown/40 bg-[#110a06]/40 p-2"
                    >
                      <div class="mb-2 flex items-center justify-between">
                        <h5 class="font-heading text-[11px] tracking-wider uppercase text-dungeon-gold/90">
                          {{ group.category }}
                        </h5>
                        <span class="text-[10px] text-dungeon-paper/50">{{ group.relics.length }} 件</span>
                      </div>
                      <div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2">
                        <div
                          v-for="relic in group.relics"
                          :key="`test-relic-${group.category}-${relic.id}`"
                          class="rounded-sm border border-dungeon-brown/50 bg-[#1a0f08]/70 p-2"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex min-w-0 items-center gap-2">
                              <img class="test-relic-orb" :src="getRelicOrbUrl(relic.rarity)" alt="" />
                              <div class="min-w-0">
                                <div class="truncate font-heading text-xs text-dungeon-gold">{{ relic.name }}</div>
                                <div class="text-[10px] text-dungeon-paper/60">{{ relic.rarity }}</div>
                              </div>
                            </div>
                            <div class="flex items-center gap-1 shrink-0">
                              <button
                                class="size-6 rounded-sm border border-dungeon-brown text-dungeon-paper/70 hover:border-dungeon-gold"
                                @click="decreaseSelectedRelic(relic.name)"
                              >
                                -
                              </button>
                              <span class="w-6 text-center text-xs text-dungeon-gold">{{
                                getSelectedTestRelicCount(relic.name)
                              }}</span>
                              <button
                                class="size-6 rounded-sm border border-dungeon-gold/40 text-dungeon-gold hover:bg-dungeon-brown"
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
                      class="rounded-sm border border-dungeon-brown/40 bg-black/20 py-6 text-center text-xs text-dungeon-paper/40"
                    >
                      当前分类暂无可选圣遗物
                    </div>
                  </div>
                </div>
              </div>

              <label
                class="flex items-center gap-2 px-3 py-2 rounded-sm border border-dungeon-brown/60 bg-dungeon-dark/40 text-sm text-dungeon-paper/80"
              >
                <input v-model="combatTestStartAt999" type="checkbox" class="accent-amber-500" />
                <span>本场测试启用 999 开局（敌我双方 HP/MP=999）</span>
              </label>

              <div class="flex justify-between gap-3">
                <button
                  class="px-4 py-2 rounded-sm border border-dungeon-brown text-dungeon-paper/70 hover:border-dungeon-gold/50"
                  @click="combatTestStep = 'deck'"
                >
                  返回改卡组
                </button>
                <button
                  class="px-4 py-2 rounded-sm border border-amber-600/40 text-amber-400 hover:bg-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
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
        <DungeonModal title="变量更新" :icon="FileText" :is-open="isVariableUpdateOpen" @close="isVariableUpdateOpen = false">
          <div class="variable-update-panel panel-section">
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
        <GlossaryReferenceModal :is-open="isGlossaryReferenceOpen" @close="isGlossaryReferenceOpen = false" />

        <!-- Shop Overlay -->
        <Transition name="combat-fade">
          <ShopScene
            v-if="showShopView"
            class="z-94"
            :products="shopProducts"
            :gold="Math.max(0, Number(displayGold) - shopSpentGold)"
            :dialogue="shopDialogue"
            :defeated="isMerchantDefeated"
            :rob-click-count="shopRobClickCount"
            :robbing="shopRobbing"
            :busy="shopBuying || gameStore.isGenerating"
            :compact="isCompactPortraitLayout"
            :background-url="shopBackgroundUrl"
            :gold-icon-url="STAT_ICON_URLS.gold"
            @buy="handleShopBuy"
            @rob="handleShopRobClick"
            @exit="exitShop"
          />
        </Transition>

        <!-- Treasure Chest Overlay -->
        <Transition name="combat-fade">
          <ChestRoomScene
            v-if="showChestView"
            class="z-95"
            :stage="chestStage"
            :rewards="chestRewardRelics"
            :collected-flags="chestRewardCollectedFlags"
            :reward-visible="chestRewardVisible"
            :close-count="chestCloseCount"
            :rolling="chestRolling"
            :collecting="chestCollecting"
            :completion-ready="chestRoomCompletionReady"
            :finish-disabled="chestCollecting || gameStore.isGenerating"
            :is-touch="isTouchViewport"
            :pending-reward-index="pendingChestRewardIndex"
            @open="handleChestCenterClick"
            @close-request="closeOpenedChestForRefresh"
            @finish="finishChestRoom"
            @reward-click="handleChestRewardClick"
            @reward-enter="showChestRewardTooltip"
            @reward-leave="hideRelicTooltip"
            @reward-touchstart="handleChestRewardTouchStart"
            @reward-touchend="handleRelicTouchEnd"
          />
        </Transition>

        <!-- Idol Overlay -->
        <Transition name="combat-fade">
          <div
            v-if="showIdolView"
            class="idol-scene absolute inset-0 z-96 overflow-hidden bg-black"
            :class="{ 'idol-scene--black': idolVariant === 'black', 'is-offering': idolOffering }"
            @pointermove="handleIdolDicePointerMove"
            @pointerup="handleIdolDicePointerUp"
            @pointercancel="handleIdolDicePointerUp"
          >
            <img :src="idolBackgroundUrl" class="idol-scene__bg absolute inset-0 size-full object-cover" alt="神像界面背景" />

            <!-- 神像苏醒：被供奉的神像亮起光柱与光晕（与背景同一 16:9 坐标系） -->
            <div class="idol-fx" aria-hidden="true">
              <div
                v-for="(spot, column) in idolStatueSpots"
                :key="`idol-spot-${idolVariant}-${column}`"
                class="idol-statue-light"
                :class="{ 'is-active': idolActiveColumns.includes(column) }"
                :style="spot"
              >
                <span class="idol-statue-light__beam"></span>
                <span class="idol-statue-light__halo"></span>
              </div>
            </div>

            <div class="idol-layout absolute inset-0 z-97" :class="{ 'idol-layout--black': idolVariant === 'black' }">
              <div class="idol-slots-row" :class="{ 'idol-slots-row--black': idolVariant === 'black' }">
                <div
                  v-for="(slot, column) in idolSlotColumns"
                  :key="slot.target"
                  class="idol-slot-wrap"
                  :style="{ '--i': String(column) }"
                >
                  <div class="idol-slot-hint">{{ slot.hint }}</div>
                  <div class="idol-slot-frame">
                    <div
                      :ref="el => setIdolSlotElement(slot.target, el)"
                      class="idol-slot"
                      :class="{
                        'is-preview': idolSlotIsPreview(slot.target),
                        'is-selected': idolSlotIsSelected(slot.target),
                      }"
                    >
                      <img class="idol-slot-art" :src="idolSlotAssetUrl(slot.target)" alt="" aria-hidden="true" />
                    </div>
                    <span
                      v-if="idolSlotBurst[slot.target]"
                      :key="`idol-burst-${slot.target}-${idolSlotBurst[slot.target]}`"
                      class="idol-slot-burst"
                      aria-hidden="true"
                    ></span>
                    <span
                      v-if="idolSlotReject && idolSlotReject.target === slot.target"
                      :key="`idol-reject-${idolSlotReject.key}`"
                      class="idol-slot-reject"
                      aria-hidden="true"
                    ></span>
                  </div>
                </div>
              </div>

              <div ref="idolDiceStageRef" class="idol-dice-stage">
                <div
                  v-for="diceIndex in idolDiceIndexes"
                  :key="`idol-dice-${diceIndex}`"
                  :ref="el => setIdolDiceElement(diceIndex, el)"
                  class="idol-dice-draggable"
                  :class="{
                    'idol-dice-draggable--second': diceIndex === 1,
                    'is-locked': idolDiceRolling,
                    'is-casting': idolDiceRolling,
                    'is-dragging': idolDragDiceIndex === diceIndex,
                    'is-placed': Boolean(getIdolAssignedTarget(diceIndex)),
                  }"
                  :style="{
                    transform: `translate(${getIdolDicePosition(diceIndex).x}px, ${getIdolDicePosition(diceIndex).y}px)`,
                    '--cast-delay': `${diceIndex * 110}ms`,
                  }"
                  @pointerdown="handleIdolDicePointerDown($event, diceIndex)"
                >
                  <div class="idol-dice-body">
                    <DungeonDice
                      :value="getIdolDiceValue(diceIndex)"
                      :rolling="idolDiceRolling"
                      color="gold"
                      size="lg"
                      :rolling-min="idolDiceMin"
                      :rolling-max="idolDiceMax"
                    />
                  </div>
                  <span
                    v-if="idolDiceRevealKey > 0"
                    :key="`idol-reveal-${diceIndex}-${idolDiceRevealKey}`"
                    class="idol-dice-reveal"
                    aria-hidden="true"
                  ></span>
                </div>
              </div>
            </div>

            <Transition name="idol-actions">
              <div v-if="!idolDiceRolling && !idolOffering" class="idol-overlay-actions">
                <button
                  v-if="idolHasAssignedDice"
                  type="button"
                  class="map-overlay-finish-btn"
                  :disabled="gameStore.isGenerating"
                  @click="finishIdolRoom"
                >
                  供奉并打开地图
                </button>
                <button
                  type="button"
                  class="idol-leave-btn"
                  :disabled="gameStore.isGenerating"
                  @click="leaveIdolRoom"
                >
                  不供奉，直接离开
                </button>
              </div>
            </Transition>

            <div v-if="idolOffering" class="idol-offer-flash" aria-hidden="true"></div>
          </div>
        </Transition>

        <!-- Chest Mimic Relic Drop Overlay -->
        <Transition name="combat-fade">
          <div v-if="showMimicRelicDropView" class="mimic-drop-overlay absolute inset-0 z-102">
            <div class="absolute inset-0 flex items-center justify-center p-6 md:p-10">
              <div class="mimic-drop-panel">
                <div class="mimic-drop-heading">
                  <div class="mimic-drop-title">宝箱怪掉落</div>
                  <div class="mimic-drop-subtitle">选择是否带走这件圣遗物</div>
                </div>

                <button
                  v-if="mimicRelicDropEntry"
                  type="button"
                  class="mimic-drop-relic"
                  :class="mimicRelicDropToneClass"
                  @mouseenter="showRelicTooltip($event, mimicRelicDropEntry)"
                  @mouseleave="hideRelicTooltip"
                  @focus="showRelicTooltip($event, mimicRelicDropEntry)"
                  @blur="hideRelicTooltip"
                  @touchstart.passive="handleRelicTouchStart($event, mimicRelicDropEntry)"
                  @touchend="handleRelicTouchEnd"
                  @touchcancel="handleRelicTouchEnd"
                >
                  <span class="mimic-drop-orb" aria-hidden="true">
                    <img :src="getRelicOrbUrl(mimicRelicDropRelic?.rarity)" alt="" />
                  </span>
                  <div class="mimic-drop-copy">
                    <div class="mimic-drop-name">{{ mimicRelicDropEntry.name }}</div>
                    <div class="mimic-drop-meta">
                      {{ formatRarityLabel(mimicRelicDropRelic?.rarity ?? '普通') }} ·
                      {{ mimicRelicDropEntry.category }}
                    </div>
                    <div class="mimic-drop-effect">{{ mimicRelicDropEntry.effect }}</div>
                  </div>
                </button>

                <div class="mimic-drop-actions">
                  <button
                    type="button"
                    class="mimic-drop-skip"
                    :disabled="mimicRelicDropApplying"
                    @click="skipMimicRelicDrop"
                  >
                    放弃
                  </button>
                  <button
                    type="button"
                    class="mimic-drop-take"
                    :disabled="mimicRelicDropApplying || !mimicRelicDropRelic"
                    @click="acceptMimicRelicDrop"
                  >
                    带走
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Victory Card Reward Overlay -->
        <Transition name="combat-fade">
          <div v-if="showVictoryRewardView" class="absolute inset-0 z-102 bg-black/90">
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
                      v-if="victoryRewardStage !== 'pick'"
                      class="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm border border-dungeon-brown text-dungeon-paper/75 hover:border-dungeon-gold/50 disabled:opacity-50"
                      :disabled="rewardApplying"
                      @click="returnToVictoryRewardPick"
                    >
                      <ArrowLeft class="size-4" />
                      <span>返回</span>
                    </button>
                    <button
                      v-if="canRefreshVictoryReward"
                      class="px-4 py-2 rounded-sm border border-sky-500/50 text-sky-200 hover:bg-sky-500/10 disabled:opacity-50"
                      :disabled="rewardApplying"
                      @click="refreshVictoryRewardOptions"
                    >
                      刷新奖励
                    </button>
                    <button
                      class="px-4 py-2 rounded-sm border border-dungeon-brown text-dungeon-paper/75 hover:border-dungeon-gold/50"
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
                  <div class="mb-4 rounded-sm border border-dungeon-gold/25 bg-black/20 p-3">
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
                    class="rounded-sm border border-dungeon-brown/50 bg-black/20 p-4 text-center"
                  >
                    <div class="text-sm text-dungeon-paper/70">当前卡组为空，将奖励卡加入卡组。</div>
                    <button
                      type="button"
                      class="mt-3 px-4 py-2 rounded-sm border border-dungeon-gold/45 text-dungeon-gold hover:bg-dungeon-gold/10 disabled:opacity-50"
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
                      class="rounded-sm border border-dungeon-brown/50 bg-[#160d08]/65 p-3 text-left transition-colors hover:border-dungeon-gold/60 disabled:opacity-50 disabled:cursor-not-allowed"
                      :class="[
                        rewardDeckShakeIdx === entry.idx ? 'reward-invalid-shake' : '',
                        getRewardDeckFusionName(entry)
                          ? 'border-lime-300/70 shadow-[0_0_18px_rgba(190,242,100,0.16)]'
                          : '',
                      ]"
                      :disabled="rewardApplying"
                      @click="replaceDeckCardWithReward(entry.idx)"
                    >
                      <div class="mb-2 flex items-center justify-between gap-2 text-[11px] text-dungeon-paper/65">
                        <span>槽位 {{ entry.idx + 1 }}</span>
                        <span v-if="getRewardDeckFusionName(entry)" class="text-lime-200"
                          >融合为 {{ getRewardDeckFusionName(entry) }}</span
                        >
                      </div>
                      <div class="flex justify-center">
                        <DungeonCard v-if="entry.card" :card="entry.card" disabled />
                        <div
                          v-else
                          class="w-[180px] h-[250px] rounded-sm border border-dungeon-brown/45 flex items-center justify-center text-xs text-dungeon-paper/55"
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
                      class="rounded-sm border border-dungeon-brown/50 bg-[#160d08]/65 p-3 text-left transition-colors hover:border-dungeon-gold/60 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <ActiveSkillCard v-else :skill="null" :empty-label="entry.name || '空主动槽位'" />
                      </div>
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </Transition>

        <Transition name="combat-fade">
          <div v-if="activeForcedCurseReplacement" class="absolute inset-0 z-104 bg-black/90">
            <div class="absolute inset-0 p-6 md:p-10 flex items-center justify-center">
              <div
                class="w-full max-w-6xl origin-center scale-[1.2] rounded-xl border border-fuchsia-400/35 bg-[#0f0906]/95 p-5 md:p-7 shadow-[0_0_32px_rgba(217,70,239,0.2)]"
              >
                <div class="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div class="font-heading text-xl text-fuchsia-200">诅咒替换</div>
                    <div class="text-xs text-dungeon-paper/65 mt-1">
                      {{ activeForcedCurseReplacement.sourceText ?? `获得【${activeForcedCurseReplacement.relicName}】后` }}，必须选择 1 个卡组槽位替换为【{{
                        activeForcedCurseReplacement.curseName
                      }}】。
                    </div>
                  </div>
                  <div
                    class="rounded-sm border border-fuchsia-300/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-100"
                  >
                    不可跳过
                  </div>
                </div>

                <div class="mb-4 rounded-sm border border-fuchsia-300/25 bg-black/20 p-3">
                  <div class="text-xs text-dungeon-paper/70 mb-2">即将加入的诅咒牌：</div>
                  <div class="flex justify-center">
                    <DungeonCard v-if="activeForcedCurseCard" :card="activeForcedCurseCard" disabled />
                  </div>
                </div>

                <div
                  v-if="forcedCurseDeckReplaceEntries.length === 0"
                  class="rounded-sm border border-dungeon-brown/50 bg-black/20 p-4 text-center"
                >
                  <div class="text-sm text-dungeon-paper/70">当前卡组为空，将诅咒牌加入卡组。</div>
                  <button
                    type="button"
                    class="mt-3 px-4 py-2 rounded-sm border border-fuchsia-300/45 text-fuchsia-100 hover:bg-fuchsia-500/10 disabled:opacity-50"
                    :disabled="forcedCurseReplacing"
                    @click="replaceDeckCardWithForcedCurse(0)"
                  >
                    加入卡组
                  </button>
                </div>

                <div
                  v-else-if="!forcedCurseHasReplaceableSlot"
                  class="rounded-sm border border-dungeon-brown/50 bg-black/20 p-4 text-center"
                >
                  <div class="text-sm text-dungeon-paper/70">卡组已被诅咒填满，诅咒牌无法被替换，这份诅咒无处容身。</div>
                  <button
                    type="button"
                    class="mt-3 px-4 py-2 rounded-sm border border-fuchsia-300/45 text-fuchsia-100 hover:bg-fuchsia-500/10"
                    @click="dismissUnplaceableForcedCurse"
                  >
                    确定
                  </button>
                </div>

                <div
                  v-else
                  class="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[52vh] overflow-y-auto custom-scrollbar pr-1"
                >
                  <button
                    v-for="entry in forcedCurseDeckReplaceEntries"
                    :key="`forced-curse-replace-${entry.idx}`"
                    type="button"
                    class="rounded-sm border border-dungeon-brown/50 bg-[#160d08]/65 p-3 text-left transition-colors hover:border-fuchsia-300/60 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="forcedCurseReplacing || entry.isCurse"
                    @click="replaceDeckCardWithForcedCurse(entry.idx)"
                  >
                    <div class="mb-2 flex items-center justify-between gap-2 text-[11px] text-dungeon-paper/65">
                      <span>槽位 {{ entry.idx + 1 }}</span>
                      <span v-if="entry.isCurse" class="text-dungeon-paper/45">诅咒无法被替换</span>
                      <span v-else class="text-fuchsia-100">替换为诅咒</span>
                    </div>
                    <div class="flex justify-center">
                      <DungeonCard v-if="entry.card" :card="entry.card" disabled />
                      <div
                        v-else
                        class="w-[180px] h-[250px] rounded-sm border border-dungeon-brown/45 flex items-center justify-center text-xs text-dungeon-paper/55"
                      >
                        {{ entry.name || '空槽位' }}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- 事件结算面板 -->
        <Transition name="combat-fade">
          <EventSettlementModal
            v-if="eventSettlementSession"
            :steps="eventSettlementSession.steps"
            :draft="eventSettlementSession.draft"
            :pools="eventSettlementSession.pools"
            :header-label="eventSettlementSession.headerLabel"
            @complete="completeEventSettlementSession"
          />
        </Transition>

        <!-- 前端化事件：小游戏 -->
        <Transition name="combat-fade">
          <WheelMinigame
            v-if="activeMinigame?.kind === '大转盘'"
            :sectors="wheelSectors"
            :spin-cost="wheelSpinCost"
            :gold="displayGold"
            :jackpot-taken="wheelJackpotTaken"
            :busy="minigameBusy"
            @spin="handleWheelSpin"
            @exit="finishEventMinigame"
          />
        </Transition>
        <Transition name="combat-fade">
          <GachaMinigame
            v-if="activeMinigame?.kind === '扭蛋机'"
            :machines="GACHA_MACHINES"
            :gold="displayGold"
            :busy="minigameBusy"
            @pull="handleGachaPull"
            @exit="finishEventMinigame"
          />
        </Transition>
        <Transition name="combat-fade">
          <DivinationMinigame
            v-if="activeMinigame?.kind === '占卜'"
            :state="activeMinigame.state"
            :busy="minigameBusy"
            @update="handleDivinationUpdate"
            @finish="handleDivinationFinish"
          />
        </Transition>

        <!-- 温泉：恢复至满血 / 净化一个负面状态 / 净化诅咒 三选一 -->
        <Transition name="combat-fade">
          <HotSpringChoiceModal
            v-if="showHotSpringChoice"
            :hp="displayHp"
            :max-hp="displayMaxHp"
            :cleansable-statuses="hotSpringCleansableEntries"
            :purifiable-curses="hotSpringPurifiableCurses"
            :busy="hotSpringApplying"
            @heal="chooseHotSpringHeal"
            @cleanse="chooseHotSpringCleanse"
            @purify="chooseHotSpringPurify"
            @close="showHotSpringChoice = false"
          />
        </Transition>

        <!-- Combat Overlay -->
        <Transition name="combat-fade">
          <div v-if="showCombat" class="absolute inset-0 z-100 bg-black">
            <CombatView
              class="size-full"
              :enemy-name="combatEnemyName"
              :player-deck="combatPlayerDeck"
              :player-active-skills="resolvedActiveSkills"
              :battle-modifiers="combatBattleModifiers"
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
                effects: combatInitialPlayerEffects,
              }"
              @end-combat="handleCombatEnd"
              @player-turn-damage-threshold-reached="handlePlayerTurnDamageThresholdReached"
              @player-max-dice-threshold-reached="handlePlayerMaxDiceThresholdReached"
              @open-deck="activeModal = 'deck'"
              @open-relics="openInventoryModal('relics')"
              @open-glossary="isGlossaryReferenceOpen = true"
            />
            <!-- Exit combat button -->
            <button
              v-if="canExitCurrentCombat"
              class="combat-exit-btn absolute top-4 right-4 z-110 px-4 py-2"
              @click="exitCurrentCombatOverlay"
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
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Box,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  DatabaseZap,
  FileText,
  LockKeyhole,
  LogOut,
  Maximize2,
  Map as MapIcon,
  NotebookText,
  Plus,
  Replace,
  RotateCcw,
  Scroll,
  Scan,
  Send,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Type,
  Trash2,
  Upload,
  Users,
  Volume2,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next';
import type { PropType } from 'vue';
import { defineEmits, defineProps, withDefaults, } from 'vue';
import { hasAuthorTestAccess, unlockAuthorTestAccess, verifyAuthorTestPassword } from '../authorTestAccess';
import { getAllActiveSkills, resolveActiveSkillNames } from '../battle/activeSkillRegistry';
import { getAllCards, getCardByName, resolveCardNames } from '../battle/cardRegistry';
import { getAllEnemyNames, getEnemyByName } from '../battle/enemyRegistry';
import { PORTED_RELIC_ID, getAllRelics, getRelicById, getRelicByName, type RelicData } from '../battle/relicRegistry';
import { recordEncounteredCards, recordEncounteredRelics } from '../codexStore';
import {
  CUSTOM_DIFFICULTY_BASE_OPTIONS,
  CUSTOM_DIFFICULTY_INFLUENCE_GROUPS,
  DIFFICULTY_OPTIONS,
  getDifficultyPreviewLines,
  hasCustomDifficultyInfluence,
  normalizeCustomDifficultyInfluences,
  normalizeDifficulty,
  shouldRestoreFullHpOnBattleStart,
  type CustomDifficultyInfluence,
  type DifficultyOption,
} from '../difficulty';
import {
  AREA_EVENT_POOL,
  EVENT_VERDICTS,
  FLOOR_EVENT_POOL,
  GLOBAL_EVENT_POOL,
  normalizeEventVerdict,
  normalizeTriggeredEvents,
  pickEventForArea,
  type EventVerdict,
} from '../eventRegistry';
import { buildVariableMigration, findMissingVariables } from '../variableMigration';
import { ALL_CARD_FRAME_URLS } from '../cardFrames';
import { applyEnchantToCard, normalizeEnchantList } from '../battle/enchantRegistry';
import {
  createEmptyBattleModifiers,
  describeCombatModifier,
  expireFloorCombatModifiers,
  getRoomEntryHealFromModifiers,
  normalizeCombatModifiers,
  resolveBattleModifiers,
  consumeBattleModifiers,
  type ResolvedBattleModifiers,
} from '../combatModifiers';
import { getEventOutcomeSpec, type OutcomeAction, type OutcomeContext } from '../events/eventOutcomes';
import {
  EMPTY_EVENT_ACTION_STATE,
  SettlementDraft,
  formatEventSettlementNotice,
  normalizeDelayedRewards,
  normalizeEventActionState,
  normalizeNoticeList,
  normalizeTemporaryReplacements,
  pickRelics,
  type EventActionPhase,
  type SettlementPools,
  type SettlementStep,
} from '../events/eventSettlement';
import {
  GACHA_MACHINES,
  buildWheelSectors,
  createDivinationState,
  getWheelSpinCost,
  normalizeDivinationState,
  rollGoldAmount,
  type DivinationItem,
  type DivinationState,
  type GachaMachine,
  type MinigamePrize,
  type WeightedPrize,
  type WheelSector,
} from '../events/minigames';
import {
  EVENT_CARD_CATEGORY,
  HOT_SPRING_CURSE_PURIFY_MAP,
  SIN_REWARD_SLOT_CHANCE,
  getSinRewardCandidates,
} from '../battle/eventCards';
import {
  AUCTION_TAG_GOLD_PER_WIN,
  EVENT_RELIC_ID,
  GLUTTON_STOMACH_MAX_HP_BONUS,
  UMBILICAL_CORD_HEAL_PER_ROOM,
} from '../battle/eventRelics';
import {
  OVERDUE_BATTLE_CHANCE,
  OVERDUE_FLOOR,
  cleanseSingleNegativeStatus,
  describeNegativeStatus,
  getCleansableNegativeStatuses,
  getHotSpringBehavior,
  getRebirthRetainedNegativeStatuses,
  hasNegativeStatus,
  normalizeNegativeStatusList,
  removeNegativeStatus,
} from '../negativeStatusRegistry';
import { FINAL_AREA_NAME, FINAL_FLOOR_NAME, FLOOR_MAP, getFloorForArea, getFloorNumberForArea, getNextFloor } from '../floor';
import { toggleFullScreen } from '../fullscreen';
import { useGameStore, type BigSummaryPromptRole, type BigSummaryPromptSegment } from '../gameStore';
import { getLocalFolderFirstImagePath, getLocalFolderImagePaths } from '../localAssetManifest';
import {
  MAP_HEIGHT,
  MAP_ROUTE_COUNT,
  generateDungeonMap,
  normalizeDungeonMap,
  replaceFutureRoomsWithBattle,
  replaceFutureRoomsWithBattleByChance,
  type DungeonMap,
  type MapRoomNode,
} from '../map';
import type { OpeningInfoSubmission } from '../openingProfile';
import { getRelicOrbUrl, RELIC_ORB_URLS } from '../relicOrbs';
import { isSceneTransitionActive, runSceneTransition } from '../sceneTransition';
import { extractMainText, extractMainTextOnly, hasMainTextTag } from '../responseParser';
import { CardType, EffectType, type ActiveSkillData, type CardData, type EffectInstance, type EntityStats } from '../types';
import { CHEST_ROOM_PRELOAD_URLS } from '../chestRoomAssets';
import ActiveSkillCard from './ActiveSkillCard.vue';
import ChestRoomScene from './ChestRoomScene.vue';
import CombatView from './CombatView.vue';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';
import DungeonModal from './DungeonModal.vue';
import EventSettlementModal from './EventSettlementModal.vue';
import HotSpringChoiceModal from './HotSpringChoiceModal.vue';
import DivinationMinigame from './minigames/DivinationMinigame.vue';
import GachaMinigame from './minigames/GachaMinigame.vue';
import WheelMinigame from './minigames/WheelMinigame.vue';
import SoundSettings from './SoundSettings.vue';
import GlossaryReferenceModal from './GlossaryReferenceModal.vue';
import MainButtonSkin from './MainButtonSkin.vue';
import OpeningInfoEntryView from './OpeningInfoEntryView.vue';
import SaveLoadPanel from './SaveLoadPanel.vue';
import ShopScene from './ShopScene.vue';
import SpotlightGuide, { type SpotlightGuideStep } from './SpotlightGuide.vue';

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
    skin: { type: String as PropType<InstanceType<typeof MainButtonSkin>['$props']['skin']>, required: true },
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
          'aria-label': props.label,
          class: [
            'main-sidebar-button group relative size-24 shrink-0 border-0 bg-transparent p-0 transition-[transform,filter] duration-200 disabled:cursor-not-allowed',
            props.active ? 'main-sidebar-button--active' : '',
            props.highlight ? 'main-sidebar-button--highlight' : '',
          ],
          onClick: () => {
            if (!props.disabled) {
              emit('click');
            }
          },
        },
        [
          h(MainButtonSkin, { skin: props.skin }),
          props.label
            ? h(
                'div',
                {
                  class: [
                    'absolute bg-[#0b0908]/95 text-dungeon-paper/90 text-xs px-2.5 py-1.5 rounded-md border border-dungeon-brown/85 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none',
                    props.tooltipSide === 'left' ? 'right-28' : 'left-28',
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
const STAGE_BASE_WIDTH = 1920;
const STAGE_BASE_HEIGHT = 1080;
const viewportRef = ref<HTMLElement | null>(null);
const storyTextContainerRef = ref<HTMLElement | null>(null);
const viewportWidth = ref(STAGE_BASE_WIDTH);
const viewportHeight = ref(STAGE_BASE_HEIGHT);
const stableViewportHeight = ref<number | null>(null);
const isTouchViewport = ref(false);
const landscapeHintDismissed = ref(false);
let viewportResizeObserver: ResizeObserver | null = null;
const KEYBOARD_VIEWPORT_SHRINK_THRESHOLD = 120;

const isTextInputElement = (element: Element | null): boolean => {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(
      type,
    );
  }
  return element instanceof HTMLElement && element.isContentEditable;
};

const isSoftKeyboardViewportShrink = (heightCandidate: number): boolean => {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia('(pointer: coarse)').matches) return false;
  if (!isTextInputElement(document.activeElement)) return false;

  const baselineHeight = stableViewportHeight.value ?? viewportHeight.value;
  const visualHeight = window.visualViewport?.height ?? heightCandidate;
  return baselineHeight - Math.min(heightCandidate, visualHeight) > KEYBOARD_VIEWPORT_SHRINK_THRESHOLD;
};

const updateViewportMetrics = () => {
  if (typeof window === 'undefined') return;

  const viewportRect = viewportRef.value?.getBoundingClientRect();
  const docEl = document.documentElement;
  const docWidth = docEl?.clientWidth ?? 0;
  const docHeight = docEl?.clientHeight ?? 0;
  const visualViewport = window.visualViewport;
  const heightCandidate = docHeight > 0 ? docHeight : (visualViewport?.height ?? window.innerHeight);
  const keepStableHeight = isSoftKeyboardViewportShrink(heightCandidate);

  viewportWidth.value =
    viewportRect && viewportRect.width > 0
      ? viewportRect.width
      : docWidth > 0
        ? docWidth
        : (visualViewport?.width ?? window.innerWidth);
  if (keepStableHeight) {
    viewportHeight.value = stableViewportHeight.value ?? viewportHeight.value;
  } else {
    viewportHeight.value = heightCandidate;
    stableViewportHeight.value = heightCandidate;
  }
  isTouchViewport.value = window.matchMedia('(pointer: coarse)').matches;
};
const handleViewportResize = () => {
  updateViewportMetrics();
};
const handleViewportFocusOut = () => {
  window.setTimeout(updateViewportMetrics, 120);
};
const isCompactPortraitLayout = computed(
  () => viewportWidth.value <= 768 && viewportHeight.value > viewportWidth.value,
);
const stageScale = computed(() => {
  if (isCompactPortraitLayout.value) return 1;
  if (viewportWidth.value <= 0 || viewportHeight.value <= 0) return 1;
  return Math.min(viewportWidth.value / STAGE_BASE_WIDTH, viewportHeight.value / STAGE_BASE_HEIGHT, 1);
});
const stageStyle = computed(() => ({
  transform: isCompactPortraitLayout.value ? 'none' : `translate(-50%, -50%) scale(${stageScale.value})`,
}));
const viewportStyle = computed(() => {
  const height = stableViewportHeight.value;
  if (!height) return {};
  return {
    height: `${height}px`,
    minHeight: `${height}px`,
  };
});
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
  () =>
    isTouchViewport.value &&
    viewportHeight.value > viewportWidth.value &&
    !isCompactPortraitLayout.value &&
    !landscapeHintDismissed.value,
);
const showMissingMainTextTagNotice = computed(() => {
  void gameStore.mainText;
  void gameStore.messageListRevision;
  void gameStore.forbidMatchingXmlInsideThink;
  if (gameStore.isGenerating) return false;

  const lastMessageId = Number(getLastMessageId());
  if (!Number.isFinite(lastMessageId) || lastMessageId < 0) return false;

  const messages = getChatMessages(`0-${Math.floor(lastMessageId)}`, { hide_state: 'all' });
  const latestAssistantMessage = messages.reduce<typeof messages[number] | null>((latest, message) => {
    if (message.role !== 'assistant') return latest;
    if (!latest) return message;
    return Number(message.message_id) > Number(latest.message_id) ? message : latest;
  }, null);
  if (!latestAssistantMessage) return false;

  return !hasMainTextTag(String(latestAssistantMessage.message ?? ''), {
    forbidMatchingXmlInsideThink: gameStore.forbidMatchingXmlInsideThink,
  });
});
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
type OptionActionMode = 'send' | 'replace' | 'append';
const OPTION_ACTION_MODES: ReadonlyArray<{ key: OptionActionMode; label: string }> = [
  { key: 'send', label: '直接发送' },
  { key: 'replace', label: '覆盖输入框' },
  { key: 'append', label: '复制并追加' },
];
const optionActionMode = ref<OptionActionMode>('replace');
const optionActionModeMenuOpen = ref(false);
const optionActionModeControlRef = ref<HTMLElement | null>(null);
const optionActionModeMenuRef = ref<HTMLElement | null>(null);
const optionActionModeMenuStyle = ref<Record<string, string>>({
  left: '0px',
  top: '0px',
});
const currentOptionActionMode = computed(
  () => OPTION_ACTION_MODES.find(mode => mode.key === optionActionMode.value) ?? OPTION_ACTION_MODES[1]!,
);
const closeOptionActionModeMenu = () => {
  optionActionModeMenuOpen.value = false;
};
const updateOptionActionModeMenuPosition = () => {
  if (!optionActionModeMenuOpen.value || typeof window === 'undefined') return;
  const control = optionActionModeControlRef.value;
  if (!control) return;
  const rect = control.getBoundingClientRect();
  const menuWidth = 216;
  const menuHeight = 142;
  const gap = 9;
  const left = Math.min(Math.max(8, rect.right + gap), Math.max(8, window.innerWidth - menuWidth - 8));
  const top = Math.min(Math.max(8, rect.top), Math.max(8, window.innerHeight - menuHeight - 8));
  optionActionModeMenuStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
  };
};
const toggleOptionActionModeMenu = () => {
  if (gameStore.isGenerating) return;
  optionActionModeMenuOpen.value = !optionActionModeMenuOpen.value;
  if (optionActionModeMenuOpen.value) {
    void nextTick(updateOptionActionModeMenuPosition);
  }
};
const selectOptionActionMode = (mode: OptionActionMode) => {
  optionActionMode.value = mode;
  closeOptionActionModeMenu();
};
const inputWaitingDotsStep = ref(1);
let inputWaitingDotsTimer: number | null = null;
const inputPlaceholder = computed(() =>
  gameStore.isGenerating ? `等待回复中${'.'.repeat(inputWaitingDotsStep.value)}` : '输入你的行动',
);
const scrollStoryTextToBottom = () => {
  nextTick(() => {
    const container = storyTextContainerRef.value;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  });
};
const scrollStoryTextToReplyTop = () => {
  nextTick(() => {
    const container = storyTextContainerRef.value;
    if (!container) return;
    if (textSettings.singleLayerDisplay) {
      container.scrollTop = 0;
      return;
    }
    const currentFloorStart = container.querySelector<HTMLElement>('.story-line--current-floor-start');
    if (!currentFloorStart) {
      container.scrollTop = container.scrollHeight;
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const targetRect = currentFloorStart.getBoundingClientRect();
    container.scrollTop += targetRect.top - containerRect.top;
  });
};
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
const isGlossaryReferenceOpen = ref(false);
const isStatusOpen = ref(true);
const showCombat = ref(false);
const combatEnemyName = ref('');
const showShopView = ref(false);
const showIdolView = ref(false);
const idolRoomMapExitReady = ref(false);
const shopProducts = ref<ShopProduct[]>([]);
const shopBuying = ref(false);
const shopSpentGold = ref(0);
const shopPurchasedItems = ref<Array<{ name: string; rarity: string; price: number }>>([]);
const shopEntrySpentGold = ref(0);
const shopEntryPurchasedCount = ref(0);
const shopRobClickCount = ref(0);
const shopDialogue = ref('');
const shopRobbing = ref(false);
const shopSessionKey = ref<string | null>(null);
const showChestView = ref(false);
const chestStage = ref<'closed' | 'opened' | 'mimic'>('closed');
const chestRolling = ref(false);
const chestRewardRelics = ref<RelicData[]>([]);
const chestRewardCollectedFlags = ref<boolean[]>([]);
const chestCollecting = ref(false);
const chestRewardVisible = ref(false);
/** 旧版按背景图加载控制奖励显示；新场景无需等待，保留该字段以兼容存档 */
const chestOpenedBgReady = ref(false);
const chestRewardCountFixed = ref<number | null>(null);
const chestCloseCount = ref(0);
const chestForceMimicNextOpen = ref(false);
const pendingChestRewardIndex = ref<number | null>(null);
const chestRoomCompletionReady = computed(() => chestStage.value === 'opened');
const hotSpringCleanseMessage = ref<{ id: number; text: string } | null>(null);
const gameFeedbackMessage = ref<{ id: number; text: string } | null>(null);
const roomAssetLoading = ref(false);
const roomAssetLoadingText = ref('正在加载主界面图片...');
const appImageStartupLoading = ref(true);
const appImageStartupText = ref('正在加载主界面图片...');
const appImageStartupError = ref(false);
const specialRoomOpening = ref(false);
const bgImageDisplayedUrl = ref('');
const mainImageAssetsReady = ref(false);
const idolVariant = ref<IdolVariant>('white');
const idolDiceValue = ref(1);
const idolDiceTwoValue = ref(1);
const idolDiceRolling = ref(false);
const idolAssignedTarget = ref<IdolSlotTarget | null>(null);
const idolDiceTwoAssignedTarget = ref<IdolSlotTarget | null>(null);
const idolSnapPreviewTarget = ref<IdolSlotTarget | null>(null);
const idolDiceTwoSnapPreviewTarget = ref<IdolSlotTarget | null>(null);
const idolDicePosition = ref({ x: 0, y: 0 });
const idolDiceTwoPosition = ref({ x: 0, y: 0 });
const idolDiceStageRef = ref<HTMLElement | null>(null);
const idolDiceRef = ref<HTMLElement | null>(null);
const idolDiceTwoRef = ref<HTMLElement | null>(null);
const idolSlotMaxHpRef = ref<HTMLElement | null>(null);
const idolSlotMpRef = ref<HTMLElement | null>(null);
const idolSlotGoldRef = ref<HTMLElement | null>(null);
const idolDragPointerId = ref<number | null>(null);
const idolDragDiceIndex = ref<0 | 1 | null>(null);
const idolDragStart = ref({ x: 0, y: 0 });
const idolDragStartPos = ref({ x: 0, y: 0 });
/** 供奉仪式进行中（播放献祭动画，之后才关闭神像房并提交） */
const idolOffering = ref(false);
/** 槽位点亮特效计数（递增以重播） */
const idolSlotBurst = ref<Partial<Record<IdolSlotTarget, number>>>({});
/** 无效放置时闪红的槽位 */
const idolSlotReject = ref<{ target: IdolSlotTarget; key: number } | null>(null);
/** 掷骰结束时的揭示光环 */
const idolDiceRevealKey = ref(0);
const combatTestStep = ref<'deck' | 'enemy'>('deck');
const isCombatTestUnlocked = ref(hasAuthorTestAccess());
const selectedTestDeck = ref<string[]>([]);
const selectedTestEnemy = ref('');
const selectedEnemyFloorForTest = ref('全部');
const selectedTestRelicCounts = ref<Record<string, number>>({});
const selectedCardCategoryTab = ref('全部');
const selectedRelicCategoryTab = ref('全部');
const activeCombatContext = ref<'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest' | 'event'>('normal');
const NO_COMBAT_EXIT_ENEMY_NAMES = new Set(['宝箱怪', '沐芯兰']);
const canExitCurrentCombat = computed(() => !NO_COMBAT_EXIT_ENEMY_NAMES.has(combatEnemyName.value.trim()));
const pendingCombatNarrative = ref<{
  id: string;
  context: 'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest' | 'event';
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
const showMimicRelicDropView = ref(false);
const mimicRelicDropRelic = ref<RelicData | null>(null);
const mimicRelicDropApplying = ref(false);
const rewardApplying = ref(false);
const rewardDeckShakeIdx = ref<number | null>(null);
const rewardRefreshUsedCount = ref(0);
const rewardIsNormalEnemy = ref(false);
const forcedCurseReplacementQueue = ref<Array<{ relicId: string; relicName: string; curseName: string; sourceText?: string }>>([]);
const forcedCurseReplacing = ref(false);
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
let chestRewardConfirmTimer: ReturnType<typeof setTimeout> | null = null;
let shopRobTimer: ReturnType<typeof setTimeout> | null = null;
let hotSpringCleanseTimer: ReturnType<typeof setTimeout> | null = null;
let gameFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
let idolRollTimer: ReturnType<typeof setTimeout> | null = null;
let roomAssetLoadCount = 0;
let relicTooltipLongPressTimer: ReturnType<typeof setTimeout> | null = null;
let relicTooltipAutoHideTimer: ReturnType<typeof setTimeout> | null = null;
let hotSpringCleanseMessageId = 0;
let gameFeedbackMessageId = 0;

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

type CombatContext = 'normal' | 'shopRobbery' | 'chestMimic' | 'combatTest' | 'event';
type CombatOutcome = 'win' | 'lose' | 'escape';
type IdolVariant = 'white' | 'black';
type IdolSlotTarget = 'maxHp' | 'mp' | 'gold' | 'blackMp' | 'blackDice' | 'blackGold';
interface IdolBlessingConfig {
  target: IdolSlotTarget;
  slotLabel: string;
  statueName: string;
  rewardText: (dice: number) => string;
}
interface IdolSnapCandidate {
  target: IdolSlotTarget;
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
  variant?: IdolVariant;
  diceValue: number;
  diceTwoValue?: number;
  diceRolling: boolean;
  assignedTarget: IdolSlotTarget | null;
  diceTwoAssignedTarget?: IdolSlotTarget | null;
  snapPreviewTarget: IdolSlotTarget | null;
  diceTwoSnapPreviewTarget?: IdolSlotTarget | null;
  dicePosition: { x: number; y: number };
  diceTwoPosition?: { x: number; y: number };
}

interface PersistedVictoryState {
  stage: VictoryRewardStage;
  optionRewardIds: string[];
  selectedRewardId: string | null;
  refreshUsed: boolean;
  refreshUsedCount?: number;
  isNormalEnemy: boolean;
}

interface PersistedMimicRelicDropState {
  relicId: string;
}

interface PersistedOverlaySnapshot {
  version: 1;
  active: 'none' | 'shop' | 'chest' | 'idol' | 'victoryReward' | 'mimicRelicDrop';
  shop?: PersistedShopState;
  chest?: PersistedChestState;
  idol?: PersistedIdolState;
  victory?: PersistedVictoryState;
  mimicRelicDrop?: PersistedMimicRelicDropState;
}

// The portal-based overlay snapshot is intentionally invalid after the map flow migration.
const OVERLAY_STATE_KEY = 'dungeon.ui.overlay_state.v2';
const LEGACY_OVERLAY_STATE_KEY = 'dungeon.ui.overlay_state.v1';
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
  try {
    await preloadImage(nextUrl);
  } catch {
    return false;
  }

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
  const portraitUrl = await resolveCharacterPortraitUrl('玩家');
  try {
    await preloadImage(portraitUrl);
    defaultPlayerPortraitUrl.value = portraitUrl;
  } catch {
    defaultPlayerPortraitUrl.value = '';
    playerStatusPortraitError.value = true;
  }
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

const cloneRelicInventoryMap = (baseInventory: Record<string, number>): Record<string, number> => {
  const next: Record<string, number> = {};
  for (const [name, value] of Object.entries(baseInventory)) {
    const count = Math.max(0, Math.floor(Number(value ?? 0)));
    if (!name || count <= 0) continue;
    next[name] = count;
  }
  return next;
};

const addRelicByIdToInventory = (relicId: string, baseInventory: Record<string, number>): Record<string, number> => {
  const relic = getRelicById(relicId);
  return relic ? buildNextRelicInventory(relic, baseInventory) : baseInventory;
};

const removeOneRelicByIdFromInventory = (
  relicId: string,
  baseInventory: Record<string, number>,
): Record<string, number> => {
  const relic = getRelicById(relicId);
  if (!relic) return cloneRelicInventoryMap(baseInventory);

  const nextRelics = cloneRelicInventoryMap(baseInventory);
  const candidateNames = [relic.name, relic.id, ...(LEGACY_RELIC_NAMES_BY_ID[relic.id] ?? [])];
  for (const name of candidateNames) {
    const current = Math.max(0, Math.floor(Number(nextRelics[name] ?? 0)));
    if (current <= 0) continue;
    if (current === 1) {
      delete nextRelics[name];
    } else {
      nextRelics[name] = current - 1;
    }
    break;
  }
  return nextRelics;
};

const buildStartingRelicInventoryForMetaGrowths = (
  baseInventory: Record<string, number> = {},
  growthIds: Iterable<string> = magicHatMetaGrowths.value,
): Record<string, number> => {
  const growthSet = new Set(growthIds);
  let nextRelics = { ...baseInventory };
  if (growthSet.has('immunity')) {
    nextRelics = addRelicByIdToInventory('sanctuary_amulet', nextRelics);
  }
  if (growthSet.has('expansion')) {
    nextRelics = addRelicByIdToInventory('base_rainbow_card', nextRelics);
  }
  return nextRelics;
};

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
    try {
      await preloadImage(url);
    } catch {
      if (!bondPortraitLoaderDisposed) {
        bondPortraitErrors.value = {
          ...bondPortraitErrors.value,
          [characterName]: true,
        };
      }
      return;
    }
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

const SHOP_BG_URL = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF/%E5%95%86%E5%BA%97.png`;
const IDOL_BG_WHITE_URL = toResolveUrl('地牢/背景/白神像.jpg');
const IDOL_BG_BLACK_URL = toResolveUrl('地牢/背景/黑神像.jpg');
const idolBackgroundUrl = computed(() => (idolVariant.value === 'black' ? IDOL_BG_BLACK_URL : IDOL_BG_WHITE_URL));
const shopBackgroundUrl = SHOP_BG_URL;
const IDOL_SLOT_ASSET_URLS: Record<IdolSlotTarget, string> = {
  maxHp: toResolveUrl('地牢/素材库/主界面/白神像槽位-生命.png'),
  mp: toResolveUrl('地牢/素材库/主界面/白神像槽位-灵魂.png'),
  gold: toResolveUrl('地牢/素材库/主界面/白神像槽位-思想.png'),
  blackMp: toResolveUrl('地牢/素材库/主界面/黑神像槽位-法力.png'),
  blackDice: toResolveUrl('地牢/素材库/主界面/黑神像槽位-骰子范围.png'),
  blackGold: toResolveUrl('地牢/素材库/主界面/黑神像槽位-金币.png'),
};
const imagePreloadCache = new Map<string, Promise<void>>();
const preloadImage = (url: string): Promise<void> => {
  const cached = imagePreloadCache.get(url);
  if (cached) return cached;
  const task = new Promise<void>((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const resolveDecoded = () => {
      if (settled) return;
      settled = true;
      if (typeof image.decode === 'function') {
        try {
          void image.decode().then(resolve, resolve);
        } catch {
          resolve();
        }
      } else {
        resolve();
      }
    };
    image.onload = resolveDecoded;
    image.onerror = () => {
      if (settled) return;
      settled = true;
      reject(new Error(`图床资源加载失败：${url}`));
    };
    image.src = url;
    if (image.complete) {
      if (image.naturalWidth > 0) {
        resolveDecoded();
      } else {
        settled = true;
        reject(new Error(`图床资源加载失败：${url}`));
      }
    }
  });
  imagePreloadCache.set(url, task);
  void task.catch(() => imagePreloadCache.delete(url));
  return task;
};
const preloadImages = (urls: readonly string[]) =>
  Promise.all([...new Set(urls.filter(url => url.length > 0))].map(preloadImage)).then(() => undefined);
const initializeMainImageAssets = async (): Promise<boolean> => {
  appImageStartupLoading.value = true;
  appImageStartupError.value = false;
  appImageStartupText.value = '正在加载主界面图片...';
  try {
    await preloadImages([...MAIN_UI_IMAGE_URLS, bgImageUrl.value]);
    if (bgImageUrl.value) bgImageDisplayedUrl.value = bgImageUrl.value;
    mainImageAssetsReady.value = true;
    await restoreOverlaySnapshot();
    appImageStartupLoading.value = false;
    return true;
  } catch {
    appImageStartupError.value = true;
    appImageStartupText.value = '主界面图片加载失败，请检查网络后重试。';
    return false;
  }
};
const retryMainImageAssets = () => void initializeMainImageAssets();
let bgImageRequestId = 0;
watch(
  bgImageUrl,
  url => {
    const requestId = ++bgImageRequestId;
    if (!url) {
      bgImageDisplayedUrl.value = '';
      return;
    }
    const shouldBlockScene = mainImageAssetsReady.value;
    if (shouldBlockScene) beginRoomAssetLoading('正在加载场景背景...');
    void (async () => {
      try {
        await preloadImage(url);
        if (requestId === bgImageRequestId) bgImageDisplayedUrl.value = url;
      } catch {
        if (requestId !== bgImageRequestId) return;
        onBgError();
        if (bgImageError.value) bgImageDisplayedUrl.value = '';
      } finally {
        if (shouldBlockScene) endRoomAssetLoading();
      }
    })();
  },
  { immediate: true, flush: 'sync' },
);
const IDOL_BLESSING_CONFIG: Record<IdolSlotTarget, IdolBlessingConfig> = {
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
    rewardText: dice => `初始魔量+${dice}`,
  },
  gold: {
    target: 'gold',
    slotLabel: '金币',
    statueName: '财富神像',
    rewardText: dice => `金币+${dice * 2 + getOwnedRelicCountById('system_wealth_relic_10')}`,
  },
  blackMp: {
    target: 'blackMp',
    slotLabel: '魔力与点数',
    statueName: '黑神像·魔力',
    rewardText: dice => `献祭生命-${dice}，初始魔力+${idolDiceMax.value}`,
  },
  blackDice: {
    target: 'blackDice',
    slotLabel: '骰子范围',
    statueName: '黑神像·骰界',
    rewardText: dice => `献祭生命上限-${dice}，最小点数+1，最大点数+1`,
  },
  blackGold: {
    target: 'blackGold',
    slotLabel: '金币',
    statueName: '黑神像·金币',
    rewardText: dice => `献祭生命-${dice}，金币+${dice * 3 + getOwnedRelicCountById('system_wealth_relic_10')}`,
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
  腐化: 5,
  雷霆: 6,
  财富: 7,
  暗影: 8,
  破坏: 9,
  炼金: 10,
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
const MAGIC_BOOK_ART_BASE = toResolveUrl('地牢/素材库/主界面/魔法书');
const getMagicBookArtUrl = (bookName: string) => `${MAGIC_BOOK_ART_BASE}/${encodeURIComponent(bookName)}.png`;
const MAGIC_BOOK_UI_BASE = toResolveUrl('地牢/素材库/主界面/魔法书UI');
const MAGIC_BOOK_UI_BOOK_URL = `${MAGIC_BOOK_UI_BASE}/魔法书本体.png`;
/** 翻动书页的纸张（生成素材，边缘为透明毛边） */
const MAGIC_BOOK_UI_LEAF_URL = `${MAGIC_BOOK_UI_BASE}/魔法书翻页.webp?v=20261117`;
/** 底部导航铭牌（生成素材，右端为空宝石座） */
const MAGIC_BOOK_UI_PLATE_URL = `${MAGIC_BOOK_UI_BASE}/魔法书铭牌.webp`;
/** 书本金饰：从书本素材中抠出的装订线扣饰、宝石与四角护角（与书本同尺寸、像素一一对应） */
const MAGIC_BOOK_UI_ORNAMENT_URL = `${MAGIC_BOOK_UI_BASE}/魔法书金饰.webp`;
/** 书本与翻页纸张素材统一通过 CSS 变量传入 */
const MAGIC_BOOK_SHELL_STYLE = {
  '--mb-book-image': `url("${MAGIC_BOOK_UI_BOOK_URL}")`,
  '--mb-leaf-image': `url("${MAGIC_BOOK_UI_LEAF_URL}")`,
};
const MAGIC_BOOK_NAV_TABS = [
  { id: 'books', label: '附加魔法书', plateClass: 'magic-book-nav__plate--books' },
  { id: 'active', label: '主动技能', plateClass: 'magic-book-nav__plate--active' },
] as const;
const MAGIC_BOOK_PAGE_CATEGORIES = ['魔导', '燃烧', '严寒', '血池', '腐化', '雷霆', '财富', '暗影', '破坏', '炼金'] as const;
/** 体系介绍：依据 cardRegistry / relicRegistry 中各体系卡牌与圣遗物的实际机制撰写 */
const MAGIC_BOOK_DESCRIPTIONS: Record<string, { keywords: string[]; text: string }> = {
  魔导: {
    keywords: ['魔力', '高点数', '爆发'],
    text: '最纯粹的魔力暴力。点数倍率与魔力消耗叠在同一张牌上，以压倒性的点数赢下拼点。',
  },
  燃烧: {
    keywords: ['燃烧层数', '引爆', '持续伤害'],
    text: '先点燃，再引爆。燃烧在回合之间层层堆叠、持续灼烧，再一口气兑现成伤害。',
  },
  严寒: {
    keywords: ['寒冷层数', '兑现', '控场'],
    text: '把寒冷压进敌人的骨髓。层数越厚，冰锥越锋利、霜爆越致命；寒冷既是削弱也是储备，可以消耗来换取生命、护甲与真实伤害，必要时与燃烧碰撞出温差。',
  },
  血池: {
    keywords: ['生命即资源', '流血', '自伤'],
    text: '以自身生命为燃料的危险体系。自伤、放血、为自己施加流血来换取魔力与点数，再借汲取与临时生命上限回补；伤口越多、生命越低，反扑越凶狠。',
  },
  腐化: {
    keywords: ['中毒', '敏感', '闪避'],
    text: '缓慢而无法回避的侵蚀。在闪避与拼点之间埋下毒素；拖住对手，让毒液替你结束这场战斗。',
  },
  雷霆: {
    keywords: ['尚未开放'],
    text: '雷电仍在书页间低鸣。这一章尚未写完，等待以瞬间的爆发撕开战场。',
  },
  财富: {
    keywords: ['金币', '护甲', '以守为攻'],
    text: '金币与护甲就是一切。花钱换点数、把护甲垒成城墙，再让水晶之锤与水晶之镰把厚甲直接化作伤害；宝石圣遗物会让每一次回血、回魔都沉淀为护甲。',
  },
  暗影: {
    keywords: ['满血斩杀', '无视闪避', '敏感'],
    text: '刺客的技艺。趁敌人满血时背刺、以无视闪避的影术穿透防线，用闪避换取增伤，再借敏感把一次出手放大数倍——在对方察觉之前结束一切。',
  },
  破坏: {
    keywords: ['拼点失败', '蓄力', '反击'],
    text: '输掉拼点，赢下战斗。每一次拼点失败都会累积蓄力、护甲与点数，在失败之后轰然爆发，将把劣势碾成毁灭。',
  },
  炼金: {
    keywords: ['多元素', '稀有牌', '诅咒'],
    text: '一门讲究配方的学问。叠加多种负面状态、一次触发全部元素，或以不重复的牌组、稀有牌乃至诅咒牌为催化——让异况与稀有本身转化为力量。',
  },
};
interface MagicBookPageEntry {
  category: string;
  description: string;
  keywords: string[];
  cardCount: number;
  available: boolean;
}
const magicBookPages = computed<MagicBookPageEntry[]>(() => {
  const groups = new Map(cardCategoryGroupsForTest.value.map(group => [group.category, group.cards.length]));
  return MAGIC_BOOK_PAGE_CATEGORIES.map(category => ({
    category,
    description: MAGIC_BOOK_DESCRIPTIONS[category]?.text ?? '等待加入魔法书的神秘体系。',
    keywords: MAGIC_BOOK_DESCRIPTIONS[category]?.keywords ?? [],
    cardCount: groups.get(category) ?? 0,
    available: groups.has(category),
  }));
});
const magicBookPageIndex = ref(0);
const magicBookPageTurning = ref(false);
const magicBookTurningDirection = ref<-1 | 1 | 0>(0);
const magicBookTurnTargetIndex = ref<number | null>(null);
const currentMagicBookPage = computed<MagicBookPageEntry | null>(() =>
  magicBookPages.value[magicBookPageIndex.value] ?? magicBookPages.value[0] ?? null,
);
const magicBookTurnTargetPage = computed<MagicBookPageEntry | null>(() => {
  if (!magicBookPageTurning.value || magicBookTurnTargetIndex.value === null) return null;
  return magicBookPages.value[magicBookTurnTargetIndex.value] ?? null;
});
/**
 * 一组对开页 = 左页插画 + 右页文字（同一体系）。
 * 向后翻（+1）：右页离开右侧绕装订线翻到左侧，背面是下一体系插画，下方露出下一体系文字。
 * 向前翻（-1）：左页离开左侧绕装订线翻到右侧，背面是上一体系文字，下方露出上一体系插画。
 */
const magicBookLeftPageEntry = computed<MagicBookPageEntry | null>(() => {
  const target = magicBookTurnTargetPage.value;
  if (target && magicBookTurningDirection.value === -1) return target;
  return currentMagicBookPage.value;
});
const magicBookRightPageEntry = computed<MagicBookPageEntry | null>(() => {
  const target = magicBookTurnTargetPage.value;
  if (target && magicBookTurningDirection.value === 1) return target;
  return currentMagicBookPage.value;
});
/** 翻动书页正面（朝向右侧时可见）= 文字页 */
const magicBookLeafFrontEntry = computed<MagicBookPageEntry | null>(() =>
  magicBookTurningDirection.value === 1 ? currentMagicBookPage.value : magicBookTurnTargetPage.value,
);
/** 翻动书页背面（翻到左侧时可见）= 插画页 */
const magicBookLeafBackEntry = computed<MagicBookPageEntry | null>(() =>
  magicBookTurningDirection.value === 1 ? magicBookTurnTargetPage.value : currentMagicBookPage.value,
);
const magicBookPageImageUrls = computed(() =>
  magicBookPages.value.map(entry => getMagicBookArtUrl(entry.category)),
);
const getMagicBookPageNumber = (entry: MagicBookPageEntry): number =>
  magicBookPages.value.findIndex(page => page.category === entry.category) + 1;
const getMagicBookStatusLabel = (entry: MagicBookPageEntry): string => {
  if (!entry.available) return '尚未上线';
  if (isMagicBookLocked(entry.category)) return '未解锁';
  return carriedMagicBookSet.value.has(entry.category) ? '已携带' : '可携带';
};
const getMagicBookToggleLabel = (entry: MagicBookPageEntry): string => {
  if (!entry.available) return '敬请期待';
  if (isMagicBookLocked(entry.category)) return getMagicBookUnlockHint(entry.category);
  return carriedMagicBookSet.value.has(entry.category) ? '取消携带' : '携带此体系';
};
const getMagicBookToggleIcon = (entry: MagicBookPageEntry) => {
  if (isMagicBookLocked(entry.category)) return LockKeyhole;
  return carriedMagicBookSet.value.has(entry.category) ? BookOpen : BookMarked;
};

/* ---------- 书本尺寸：把书本宽度的 1% 以无单位数写入 --mb-u，供技能卡按比例缩放 ---------- */
let magicBookShellEl: HTMLElement | null = null;
let magicBookShellObserver: ResizeObserver | null = null;
const bindMagicBookShell = (el: unknown) => {
  const next = el instanceof HTMLElement ? el : null;
  if (next === magicBookShellEl) return;
  magicBookShellObserver?.disconnect();
  magicBookShellObserver = null;
  magicBookShellEl = next;
  if (!next) return;
  const sync = () => {
    const unit = next.clientWidth / 100;
    if (unit > 0) next.style.setProperty('--mb-u', unit.toFixed(3));
  };
  sync();
  if (typeof ResizeObserver !== 'undefined') {
    magicBookShellObserver = new ResizeObserver(sync);
    magicBookShellObserver.observe(next);
  }
};

/* ---------- 主动技能库排布：在右页可用区域内求最大卡宽（单位 cqw） ---------- */
const MAGIC_BOOK_LIBRARY_AREA = { width: 31.5, height: 30, gap: 1.3, maxCard: 11, minCard: 7 } as const;
/** ActiveSkillCard 的版面 120×176，卡框素材再外扩 1.1 倍 */
const ACTIVE_SKILL_CARD_RATIO = 176 / 120;
const ACTIVE_SKILL_CARD_FRAME_OVERFLOW = 1.1;
const magicBookLibraryLayout = computed(() => {
  const count = Math.max(1, startingActiveSkillOptions.value.length);
  const { width: areaW, height: areaH, gap, maxCard, minCard } = MAGIC_BOOK_LIBRARY_AREA;
  const visual = ACTIVE_SKILL_CARD_FRAME_OVERFLOW;
  let best = { cols: 1, width: 0 };
  for (let cols = 1; cols <= 5; cols += 1) {
    const rows = Math.ceil(count / cols);
    const byWidth = (areaW - (cols - 1) * gap) / cols / visual;
    const byHeight = (areaH - (rows - 1) * gap) / rows / (ACTIVE_SKILL_CARD_RATIO * visual);
    const width = Math.min(byWidth, byHeight, maxCard);
    if (width > best.width + 0.01) best = { cols, width };
  }
  if (best.width >= minCard) return { cols: best.cols, width: Number(best.width.toFixed(2)), scroll: false };
  const cols = Math.max(1, Math.floor((areaW + gap) / (minCard * visual + gap)));
  return { cols, width: minCard, scroll: true };
});

/* ---------- 3D 翻页：分段书页 + 逐帧驱动（不经过 Vue 响应式，避免整组件重渲染） ---------- */
const MAGIC_BOOK_TURN_DURATION_MS = 1150;
/** 书页分段宽度（占单页宽度比例），靠近装订线更窄以表现根部弯曲 */
const MAGIC_BOOK_LEAF_SEGMENT_WIDTHS = [0.1, 0.17, 0.22, 0.25, 0.26] as const;
/** 相邻分段之间的弯折权重：越靠外缘弯折越明显 */
const MAGIC_BOOK_LEAF_JOINT_WEIGHTS = [0.55, 0.85, 1.1, 1.35] as const;
const MAGIC_BOOK_LEAF_MAX_BEND_DEG = 12;
const MAGIC_BOOK_LEAF_SEGMENTS = (() => {
  let start = 0;
  return MAGIC_BOOK_LEAF_SEGMENT_WIDTHS.map(width => {
    const segment = {
      start,
      width,
      segmentStyle: { width: `calc(${(width * 50).toFixed(4)}% + 0.6px)` },
      // 每段只是整页的一个“窗口”：整页内容在窗口内反向平移，正反两面分别按各自坐标对齐
      frontSheetStyle: { width: `${(100 / width).toFixed(4)}%`, left: `${((-start / width) * 100).toFixed(4)}%` },
      backSheetStyle: {
        width: `${(100 / width).toFixed(4)}%`,
        left: `${((-(1 - start - width) / width) * 100).toFixed(4)}%`,
      },
      // 明暗层放在整页坐标内，只覆盖本段窗口，便于随纸张毛边一起被遮罩
      frontShadeStyle: {
        left: `${(start * 100).toFixed(4)}%`,
        width: `${(width * 100).toFixed(4)}%`,
        '--mb-shade-offset': `${(-start * 39.5).toFixed(3)}cqw`,
      },
      backShadeStyle: {
        left: `${((1 - start - width) * 100).toFixed(4)}%`,
        width: `${(width * 100).toFixed(4)}%`,
        // 背面纸张在整页内右移 3.5%（装订线在右侧）
        '--mb-shade-offset': `${(39.5 * 0.035 - (1 - start - width) * 39.5).toFixed(3)}cqw`,
      },
    };
    start += width;
    return segment;
  });
})();
const magicBookLeafStageEl = ref<HTMLElement | null>(null);
const magicBookTurnShadowLeftEl = ref<HTMLElement | null>(null);
const magicBookTurnShadowRightEl = ref<HTMLElement | null>(null);
const magicBookLeafSegmentEls: Array<HTMLElement | null> = [];
const setMagicBookLeafSegmentEl = (el: unknown, index: number) => {
  magicBookLeafSegmentEls[index] = el instanceof HTMLElement ? el : null;
};
let magicBookTurnFrame: number | null = null;
let magicBookTurnToken = 0;

/** cubic-bezier 求值：x(t) 用牛顿迭代反解，再取 y */
const createCubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const curve = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const slope = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i += 1) {
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= (curve(x1, x2, t) - x) / d;
    }
    return curve(y1, y2, Math.max(0, Math.min(1, t)));
  };
};
/** 起翻稍慢、中段加速、落页长缓冲：纸张被空气托住后才贴合 */
const easeMagicBookTurn = createCubicBezier(0.42, 0, 0.16, 1);
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
/** 正面朝上（角度 0）最亮，竖起（-90°）最暗；背面同理在 -180° 最亮 */
const getMagicBookLeafShade = (angleDeg: number, face: 'front' | 'back') => {
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  const raw = face === 'front' ? (1 - cos) * 0.52 : (1 + cos) * 0.52;
  return Math.max(0, Math.min(0.6, raw)).toFixed(3);
};
const setMagicBookTurnShadow = (el: HTMLElement | null, edge: number, soft: number, alpha: number) => {
  if (!el) return;
  el.style.setProperty('--mb-shadow-edge', `${(edge * 100).toFixed(2)}%`);
  el.style.setProperty('--mb-shadow-fade', `${((edge + soft) * 100).toFixed(2)}%`);
  el.style.setProperty('--mb-shadow-alpha', alpha.toFixed(3));
};

const applyMagicBookLeafFrame = (t: number) => {
  const stage = magicBookLeafStageEl.value;
  if (!stage) return;
  const direction = magicBookTurningDirection.value === -1 ? -1 : 1;
  const leafWidth = stage.clientWidth / 2;
  const eased = easeMagicBookTurn(t);
  // 基础角：所有分段共享的装订线转角
  const baseAngle = (direction === 1 ? 0 : -180) - 180 * eased * direction;
  // 弯折：外缘被手指带起、始终领先，竖直时卷曲最明显（不会退化成一条线）；
  // 落页前段改为外缘滞后，模拟纸张被空气托住后缓缓贴合。两项在起止时都为 0，保证平整对齐。
  const lead = Math.sin(Math.PI * eased);
  const settle = eased > 0.6 ? Math.sin((Math.PI * (eased - 0.6)) / 0.4) : 0;
  const bend = -direction * MAGIC_BOOK_LEAF_MAX_BEND_DEG * (lead - 0.8 * settle);

  const angles: number[] = [];
  let angle = baseAngle;
  MAGIC_BOOK_LEAF_SEGMENTS.forEach((_segment, index) => {
    if (index > 0) angle += bend * MAGIC_BOOK_LEAF_JOINT_WEIGHTS[index - 1];
    angles.push(angle);
  });

  let transform = `rotateY(${baseAngle.toFixed(3)}deg)`;
  let edgeX = 0;
  let edgeZ = 0;
  const lastIndex = MAGIC_BOOK_LEAF_SEGMENTS.length - 1;
  MAGIC_BOOK_LEAF_SEGMENTS.forEach((segment, index) => {
    if (index > 0) {
      const previous = MAGIC_BOOK_LEAF_SEGMENTS[index - 1];
      const joint = bend * MAGIC_BOOK_LEAF_JOINT_WEIGHTS[index - 1];
      transform += ` translateX(${(previous.width * leafWidth).toFixed(2)}px) rotateY(${joint.toFixed(3)}deg)`;
    }
    const radians = (angles[index] * Math.PI) / 180;
    edgeX += segment.width * Math.cos(radians);
    edgeZ += segment.width * -Math.sin(radians);

    const el = magicBookLeafSegmentEls[index];
    if (!el) return;
    el.style.transform = transform;
    const from = index > 0 ? (angles[index - 1] + angles[index]) / 2 : angles[index];
    const to = index < lastIndex ? (angles[index] + angles[index + 1]) / 2 : angles[index];
    el.style.setProperty('--mb-front-a', getMagicBookLeafShade(from, 'front'));
    el.style.setProperty('--mb-front-b', getMagicBookLeafShade(to, 'front'));
    el.style.setProperty('--mb-back-a', getMagicBookLeafShade(from, 'back'));
    el.style.setProperty('--mb-back-b', getMagicBookLeafShade(to, 'back'));
  });

  // 书页离开时用羊皮纸底色补齐被书角/装订线宝石遮住的纸面；起止帧为 0 保证与静态书本像素一致
  // 翻起约 14° 后才换成独立纸张，落到约 7° 内就换回书本原像素，避免平放时出现“另一张纸”
  const patch = smoothstep(0.02, 0.2, t) * (1 - smoothstep(0.8, 0.97, t));
  stage.style.setProperty('--mb-patch', patch.toFixed(3));
  stage.classList.add('is-live');

  // 投影：落在外缘投影点之外，离纸面越高越淡越软
  const lift = Math.max(0, Math.min(1, edgeZ));
  const soft = 0.05 + 0.32 * lift;
  const alpha = 0.42 * (1 - 0.55 * lift) * smoothstep(0, 0.06, t) * (1 - smoothstep(0.94, 1, t));
  const edge = Math.min(1, Math.abs(edgeX));
  if (edgeX >= 0) {
    setMagicBookTurnShadow(magicBookTurnShadowRightEl.value, edge, soft, alpha);
    setMagicBookTurnShadow(magicBookTurnShadowLeftEl.value, 0, soft, 0);
  } else {
    setMagicBookTurnShadow(magicBookTurnShadowLeftEl.value, edge, soft, alpha);
    setMagicBookTurnShadow(magicBookTurnShadowRightEl.value, 0, soft, 0);
  }
};

const clearMagicBookTurnState = () => {
  if (magicBookTurnFrame !== null) {
    cancelAnimationFrame(magicBookTurnFrame);
    magicBookTurnFrame = null;
  }
  magicBookTurnToken += 1;
  magicBookPageTurning.value = false;
  magicBookTurningDirection.value = 0;
  magicBookTurnTargetIndex.value = null;
  magicBookLeafSegmentEls.length = 0;
  setMagicBookTurnShadow(magicBookTurnShadowLeftEl.value, 0, 0, 0);
  setMagicBookTurnShadow(magicBookTurnShadowRightEl.value, 0, 0, 0);
};
/** 立即结束当前翻页并落到目标页（切换分栏/关闭弹窗时使用） */
const completeMagicBookTurn = () => {
  const target = magicBookTurnTargetIndex.value;
  if (magicBookPageTurning.value && target !== null) magicBookPageIndex.value = target;
  clearMagicBookTurnState();
};
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const flipMagicBookPage = async (direction: -1 | 1) => {
  if (magicBookPageTurning.value) return;
  const nextIndex = Math.max(0, Math.min(magicBookPages.value.length - 1, magicBookPageIndex.value + direction));
  if (nextIndex === magicBookPageIndex.value) return;
  if (prefersReducedMotion()) {
    magicBookPageIndex.value = nextIndex;
    return;
  }
  magicBookTurningDirection.value = direction;
  magicBookTurnTargetIndex.value = nextIndex;
  magicBookPageTurning.value = true;
  const token = ++magicBookTurnToken;
  await nextTick();
  if (token !== magicBookTurnToken) return;
  // DOM 更新后、首帧绘制前写入初始姿态，避免书页以默认姿态闪现
  applyMagicBookLeafFrame(0);
  const startedAt = performance.now();
  const step = (now: number) => {
    if (token !== magicBookTurnToken) return;
    const progress = Math.min(1, (now - startedAt) / MAGIC_BOOK_TURN_DURATION_MS);
    applyMagicBookLeafFrame(progress);
    if (progress < 1) {
      magicBookTurnFrame = requestAnimationFrame(step);
      return;
    }
    magicBookTurnFrame = null;
    completeMagicBookTurn();
  };
  magicBookTurnFrame = requestAnimationFrame(step);
};
type MagicBookUnlockCategory = '炼金' | '财富' | '腐化' | '暗影' | '破坏';
const MAGIC_BOOK_UNLOCK_CATEGORIES: readonly MagicBookUnlockCategory[] = ['炼金', '财富', '腐化', '暗影', '破坏'];
const MAGIC_BOOK_UNLOCKS_CHARACTER_KEY = 'dungeon.magic_book_unlocks';
const LEGACY_ALCHEMY_UNLOCK_KEY = 'dungeon.alchemy_system_unlocked';
const MAGIC_BOOK_UNLOCK_HINTS: Record<MagicBookUnlockCategory, string> = {
  炼金: '挑战过商人后解锁',
  财富: '曾拥有 30 枚金币后解锁',
  腐化: '最大骰子点数达到 8 后解锁',
  暗影: '单回合造成超过 50 点伤害后解锁',
  破坏: '进入第四层后解锁',
};
type MagicBookUnlockState = Partial<Record<MagicBookUnlockCategory, boolean>>;

const readCharacterMagicBookUnlocks = (): MagicBookUnlockState => {
  try {
    const variables = getVariables({ type: 'character' });
    const raw = variables?.[MAGIC_BOOK_UNLOCKS_CHARACTER_KEY];
    if (!raw || typeof raw !== 'object') return {};
    const unlocks: MagicBookUnlockState = {};
    for (const category of MAGIC_BOOK_UNLOCK_CATEGORIES) {
      if ((raw as Record<string, unknown>)[category] === true) unlocks[category] = true;
    }
    return unlocks;
  } catch (error) {
    console.warn('[GameView] 读取角色级魔法书解锁状态失败:', error);
    return {};
  }
};

const characterMagicBookUnlocks = ref<MagicBookUnlockState>(readCharacterMagicBookUnlocks());
let magicBookUnlockWriteQueue: Promise<void> = Promise.resolve();

const persistMagicBookUnlock = (category: MagicBookUnlockCategory): Promise<boolean> => {
  const operation = magicBookUnlockWriteQueue.then(async () => {
    if (characterMagicBookUnlocks.value[category] === true) return true;
    try {
      await updateVariablesWith(
        variables => {
          const nextVariables = { ...(variables ?? {}) };
          const current = nextVariables[MAGIC_BOOK_UNLOCKS_CHARACTER_KEY];
          const currentUnlocks = current && typeof current === 'object'
            ? (current as Record<string, unknown>)
            : {};
          nextVariables[MAGIC_BOOK_UNLOCKS_CHARACTER_KEY] = {
            ...currentUnlocks,
            [category]: true,
          };
          return nextVariables;
        },
        { type: 'character' },
      );
      characterMagicBookUnlocks.value = {
        ...characterMagicBookUnlocks.value,
        [category]: true,
      };
      return true;
    } catch (error) {
      console.warn(`[GameView] 保存${category}体系解锁状态失败:`, error);
      return false;
    }
  });
  magicBookUnlockWriteQueue = operation.then(() => undefined, () => undefined);
  return operation;
};

const migrateLegacyAlchemyUnlock = () => {
  if (typeof localStorage === 'undefined' || localStorage.getItem(LEGACY_ALCHEMY_UNLOCK_KEY) !== 'true') return;
  void persistMagicBookUnlock('炼金').then(migrated => {
    if (migrated) localStorage.removeItem(LEGACY_ALCHEMY_UNLOCK_KEY);
  });
};

const parseMerchantDefeatedValue = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
};
const isMerchantDefeated = computed(() => parseMerchantDefeatedValue(gameStore.statData.$是否已击败商人));
const alchemySystemUnlocked = computed(
  () =>
    characterMagicBookUnlocks.value.炼金 === true ||
    parseMerchantDefeatedValue(gameStore.statData.$是否已挑战过商人) ||
    isMerchantDefeated.value,
);
const unlockAlchemySystem = async () => {
  await persistMagicBookUnlock('炼金');
};
watch(
  alchemySystemUnlocked,
  unlocked => {
    if (!unlocked) return;
    void persistMagicBookUnlock('炼金');
  },
  { immediate: true },
);
const toUnlockInt = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
};
const getUnlockFloorNumber = (): number => {
  const area = typeof gameStore.statData._当前区域 === 'string' ? gameStore.statData._当前区域.trim() : '';
  const floorFromArea = area ? getFloorNumberForArea(area) : 1;
  return Math.max(1, floorFromArea, toUnlockInt(gameStore.statData._楼层数, 1));
};
const isMagicBookUnlockConditionSatisfied = (category: MagicBookUnlockCategory): boolean => {
  if (category === '炼金') return alchemySystemUnlocked.value;
  if (category === '财富') return toUnlockInt(gameStore.statData._金币) >= 30;
  if (category === '腐化') return toUnlockInt(gameStore.statData.$最大点数) >= 8;
  if (category === '破坏') return getUnlockFloorNumber() >= 4;
  return false;
};
const syncMagicBookUnlocks = async () => {
  for (const category of MAGIC_BOOK_UNLOCK_CATEGORIES) {
    if (characterMagicBookUnlocks.value[category] === true) continue;
    if (isMagicBookUnlockConditionSatisfied(category)) await persistMagicBookUnlock(category);
  }
};
const syncAuthorTestMagicBookUnlocks = async () => {
  if (!isCombatTestUnlocked.value) return;
  for (const category of MAGIC_BOOK_UNLOCK_CATEGORIES) {
    await persistMagicBookUnlock(category);
  }
};
watch(
  () => [
    gameStore.statData._金币,
    gameStore.statData.$最大点数,
    gameStore.statData._楼层数,
    gameStore.statData._当前区域,
    gameStore.statData.$是否已挑战过商人,
    gameStore.statData.$是否已击败商人,
  ],
  () => {
    void syncMagicBookUnlocks();
  },
  { immediate: true },
);
watch(
  isCombatTestUnlocked,
  unlocked => {
    if (unlocked) void syncAuthorTestMagicBookUnlocks();
  },
  { immediate: true },
);
watch(
  () => gameStore.isInitialized,
  initialized => {
    if (!initialized) return;
    characterMagicBookUnlocks.value = readCharacterMagicBookUnlocks();
    migrateLegacyAlchemyUnlock();
    void syncMagicBookUnlocks();
    void syncAuthorTestMagicBookUnlocks();
  },
  { immediate: true },
);
const carryableMagicBookNames = computed<string[]>(() =>
  cardCategoryGroupsForTest.value.map(group => group.category).filter(category => category !== '基础'),
);
const isMagicBookLocked = (bookName: string): boolean => {
  if (!MAGIC_BOOK_UNLOCK_CATEGORIES.includes(bookName as MagicBookUnlockCategory)) return false;
  if (isCombatTestUnlocked.value) return false;
  if (bookName === '炼金') return !alchemySystemUnlocked.value;
  return characterMagicBookUnlocks.value[bookName as MagicBookUnlockCategory] !== true;
};
const getMagicBookUnlockHint = (bookName: string): string =>
  MAGIC_BOOK_UNLOCK_HINTS[bookName as MagicBookUnlockCategory] ?? '尚未解锁';
const rawCarriedMagicBooks = computed<string[]>(() => {
  const raw = gameStore.statData._携带的魔法书;
  if (!Array.isArray(raw)) return [];
  return raw.filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
});
const carriedMagicBooks = computed<string[]>(() => {
  const available = new Set(carryableMagicBookNames.value.filter(name => !isMagicBookLocked(name)));
  return rawCarriedMagicBooks.value.filter(name => available.has(name));
});
const carriedMagicBookSet = computed(() => new Set(carriedMagicBooks.value));
const magicBookCarryCount = computed(() => carriedMagicBooks.value.length);
/** 已拥有后不再出现在圣遗物池中的圣遗物：稀有、传奇，以及显式标记为唯一获取的 */
const isSingleAcquisitionRelic = (relic: RelicData) => relic.rarity === '传奇' || relic.rarity === '稀有' || relic.uniqueAcquisition === true;
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
  const categorySet = new Set<string>(['普通', '基础', ...carriedMagicBooks.value]);
  let pool = getAllRelics().filter(relic => categorySet.has(relic.category));
  if (pool.length === 0) {
    pool = getAllRelics().filter(relic => relic.category === '普通' || relic.category === '基础');
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
const canEditMagicBooks = computed(() => ((gameStore.statData._当前区域 as string) || '') === '魔女的小窝');

// ── 初次进入的新手指引（设置 / 读档 / 魔法书） ──
const MAIN_GUIDE_STORAGE_KEY = 'dungeon.onboarding.main.v1';
const showMainGuide = ref(false);
const mainGuideSteps = computed<SpotlightGuideStep[]>(() => [
  {
    title: '欢迎来到欲望地牢',
    body: ['开始冒险之前，先认识三个最重要的按钮。', '指引可以随时跳过，之后也能在「设置」的系统区重新查看。'],
  },
  {
    target: '.ui-buttons-left [aria-label="设置"]',
    title: '设置 · 调整各项参数',
    body: [
      '正文字号与显示、声音特效、AI 回复与总结等参数都在这里，按自己的习惯调整即可。',
      '切换全屏、退出到标题也在设置的系统区。',
    ],
  },
  {
    target: '.ui-buttons-right [aria-label="读档"]',
    title: '读档 · 回看、编辑与重 roll',
    body: [
      '这里列出过往的每一层楼，可以回看当时的剧情，也能读档回到那一层。',
      '对刚生成的正文不满意？在这里编辑正文，或者重新生成（重 roll）。',
    ],
  },
  {
    target: '.ui-buttons-right [aria-label^="魔法书"]',
    title: '魔法书 · 开局必看',
    body: [
      '在魔法书里选择你的初始卡组与主动技能，它们决定了你在地牢中的战斗方式。',
      canEditMagicBooks.value
        ? '只有在起点「魔女的小窝」时可以修改，离开后就会锁定——出发前务必先来看一眼。'
        : '只有在起点「魔女的小窝」时可以修改；现在已经离开起点，魔法书处于锁定状态。',
    ],
  },
]);

const hasSeenMainGuide = () => {
  try {
    return localStorage.getItem(MAIN_GUIDE_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
};

const markMainGuideSeen = () => {
  try {
    localStorage.setItem(MAIN_GUIDE_STORAGE_KEY, '1');
  } catch {
    // 存储不可用时本次会话内不再弹出即可
  }
};

const finishMainGuide = (openMagicBook: boolean) => {
  showMainGuide.value = false;
  markMainGuideSeen();
  if (openMagicBook && canEditMagicBooks.value) openMagicBookModal();
};

const replayMainGuide = () => {
  activeModal.value = null;
  void nextTick(() => {
    showMainGuide.value = true;
  });
};
const isUpdatingMagicBooks = ref(false);
const magicBooksNavTab = ref<'books' | 'active'>('books');
const selectedStartingActiveSlot = ref(0);
const isUpdatingStartingActiveSkills = ref(false);
const isUpgradingMagicHat = ref(false);
const isUpdatingMagicHatDifficulty = ref(false);
type MagicHatUpgradeType = 'hp' | 'mp' | 'gold';
type MagicHatMetaGrowthType = 'immunity' | 'expansion' | 'world';
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
interface MagicHatMetaGrowthCard {
  id: MagicHatMetaGrowthType;
  label: string;
  kicker: string;
  rune: string;
  cost: number;
  description: string;
  owned: boolean;
  barClass: string;
}
const MAGIC_HAT_DIFFICULTY_BLURBS: Record<DifficultyOption, string> = {
  简单: '进入战斗回满血，敌人血量降低，适合稳妥铺垫。',
  普通: '标准试炼节奏，敌我都不额外倾斜。',
  困难: '楼层越高敌人越硬，领主还会在战斗中持续增伤。',
  地狱: '高压试炼，领主成长更快，开局还会附带随机负面状态。',
  自定义: '自由拼装诅咒、资源、体质与难度基准。',
};
const MAGIC_HAT_TRACK_META: Record<MagicHatUpgradeType, { kicker: string; rune: string }> = {
  hp: { kicker: '容错', rune: '血' },
  mp: { kicker: '启动', rune: '魔' },
  gold: { kicker: '成型', rune: '财' },
};
const MAGIC_HAT_META_GROWTH_CONFIG: Array<Omit<MagicHatMetaGrowthCard, 'owned'>> = [
  {
    id: 'immunity',
    label: '豁免权',
    kicker: '庇护',
    rune: '免',
    cost: 5,
    description: '开局自动获得 1 个庇护符，每次重生后也会重新获得。',
    barClass: 'bg-gradient-to-r from-emerald-500/85 to-teal-300/85',
  },
  {
    id: 'expansion',
    label: '扩容',
    kicker: '奖池',
    rune: '扩',
    cost: 8,
    description: '开局自动获得 1 个彩虹卡牌，每次重生后也会重新获得。',
    barClass: 'bg-gradient-to-r from-fuchsia-500/85 to-cyan-300/85',
  },
  {
    id: 'world',
    label: '世界',
    kicker: '旅途',
    rune: '界',
    cost: 20,
    description: '每进入一个房间，随机在最大生命值、初始魔量、金币中增加 1 点。',
    barClass: 'bg-gradient-to-r from-violet-500/85 to-amber-300/85',
  },
];
const MAGIC_HAT_META_GROWTH_IDS = new Set<MagicHatMetaGrowthType>(
  MAGIC_HAT_META_GROWTH_CONFIG.map(growth => growth.id),
);
const normalizeMagicHatMetaGrowths = (value: unknown): MagicHatMetaGrowthType[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (item): item is MagicHatMetaGrowthType =>
          typeof item === 'string' && MAGIC_HAT_META_GROWTH_IDS.has(item as MagicHatMetaGrowthType),
      ),
    ),
  );
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
/** 难度火漆印（图床：地牢/素材库/通用UI/难度印章），锁定时显示无纹样的素印 */
const MAGIC_HAT_SEAL_BASE = toResolveUrl('地牢/素材库/通用UI/难度印章');
const getMagicHatSealUrl = (difficulty: DifficultyOption, locked = false) =>
  `${MAGIC_HAT_SEAL_BASE}/${encodeURIComponent(locked ? '素印' : difficulty)}.webp`;
const getMagicHatCustomGroupClass = (title: string) => {
  switch (title) {
    case '诅咒类':
      return 'is-curse';
    case '减益类':
      return 'is-penalty';
    case '增益类':
      return 'is-boon';
    case '难度类':
      return 'is-basis';
    default:
      return '';
  }
};
const getMagicHatTrackClass = (type: MagicHatUpgradeType) => `is-${type}`;
const getMagicHatTrackKicker = (type: MagicHatUpgradeType) => MAGIC_HAT_TRACK_META[type].kicker;
const getMagicHatTrackRune = (type: MagicHatUpgradeType) => MAGIC_HAT_TRACK_META[type].rune;
const getMagicHatMetaGrowthClass = (type: MagicHatMetaGrowthType) => `is-growth-${type}`;
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
const magicHatCustomInfluenceGroups = CUSTOM_DIFFICULTY_INFLUENCE_GROUPS;
const magicHatDifficulty = computed<DifficultyOption>(() => normalizeDifficulty(gameStore.statData.$难度));
const magicHatCustomInfluences = computed<CustomDifficultyInfluence[]>(() =>
  normalizeCustomDifficultyInfluences(gameStore.statData.$自定义影响),
);
const magicHatDifficultyFloor = computed(() => Math.max(1, toNonNegativeInt(gameStore.statData._楼层数, 1)));
const magicHatDifficultyPreviewLines = computed(() =>
  getDifficultyPreviewLines(magicHatDifficulty.value, magicHatDifficultyFloor.value, magicHatCustomInfluences.value),
);
const hasMagicHatCustomInfluence = (influence: CustomDifficultyInfluence) =>
  hasCustomDifficultyInfluence(magicHatCustomInfluences.value, influence);
const isCustomDifficultyInfluenceActive = (influence: CustomDifficultyInfluence) =>
  magicHatDifficulty.value === '自定义' && hasMagicHatCustomInfluence(influence);
const magicHatSkillPoints = computed(() => getSafeInt(gameStore.statData.$技能点, 0));
const magicHatMetaGrowths = computed<MagicHatMetaGrowthType[]>(() =>
  normalizeMagicHatMetaGrowths(gameStore.statData.$局外成长),
);
const magicHatMetaGrowthSet = computed(() => new Set(magicHatMetaGrowths.value));
const hasMagicHatMetaGrowth = (id: MagicHatMetaGrowthType) => magicHatMetaGrowthSet.value.has(id);
const magicHatMetaGrowthCards = computed<MagicHatMetaGrowthCard[]>(() =>
  MAGIC_HAT_META_GROWTH_CONFIG.map(growth => ({
    ...growth,
    owned: hasMagicHatMetaGrowth(growth.id),
  })),
);
const getMagicHatMetaGrowthCost = (id: MagicHatMetaGrowthType): number =>
  MAGIC_HAT_META_GROWTH_CONFIG.find(growth => growth.id === id)?.cost ?? 0;
const MAGIC_HAT_HP_COSTS = [1, 3, 6, 10, 15] as const;
const MAGIC_HAT_MP_COSTS = [5, 10, 15] as const;
const MAGIC_HAT_GOLD_COSTS = [2, 4, 6, 8, 10] as const;
const sumMagicHatCosts = (costs: readonly number[], level: number): number => {
  const safeLevel = Math.max(0, Math.min(costs.length, Math.floor(level)));
  return costs.slice(0, safeLevel).reduce((sum, cost) => sum + cost, 0);
};
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
      nextCost: hpIsMax ? 0 : MAGIC_HAT_HP_COSTS[hpLevel]!,
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
      nextCost: mpIsMax ? 0 : MAGIC_HAT_MP_COSTS[mpLevel]!,
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
      nextCost: goldIsMax ? 0 : MAGIC_HAT_GOLD_COSTS[goldLevel]!,
      isMax: goldIsMax,
      progressPercent: (goldLevel / 5) * 100,
      barClass: 'bg-gradient-to-r from-amber-500/85 to-yellow-300/85',
    },
  ];
});
const magicHatStartUpgradeRefund = computed(() => {
  const hpLevel = calcUpgradeLevel(readInitialMaxHpForUpgrade(), 20, 2, 5);
  const mpLevel = calcUpgradeLevel(Math.max(1, getSafeInt(gameStore.statData.$初始魔量, 1)), 1, 1, 3);
  const goldLevel = calcUpgradeLevel(getSafeInt(gameStore.statData.$初始金币, 0), 0, 2, 5);
  return (
    sumMagicHatCosts(MAGIC_HAT_HP_COSTS, hpLevel) +
    sumMagicHatCosts(MAGIC_HAT_MP_COSTS, mpLevel) +
    sumMagicHatCosts(MAGIC_HAT_GOLD_COSTS, goldLevel)
  );
});
const magicHatMetaGrowthRefund = computed(() =>
  magicHatMetaGrowths.value.reduce((sum, id) => sum + getMagicHatMetaGrowthCost(id), 0),
);
const magicHatResetRefund = computed(() => magicHatStartUpgradeRefund.value + magicHatMetaGrowthRefund.value);
const openMagicBookModal = () => {
  if (!canEditMagicBooks.value) return;
  magicBooksNavTab.value = 'books';
  magicBookPageIndex.value = 0;
  clearMagicBookTurnState();
  selectedStartingActiveSlot.value = 0;
  activeModal.value = 'magicBooks';
};
watch(magicBooksNavTab, () => {
  if (magicBookPageTurning.value) completeMagicBookTurn();
});
watch(
  () => activeModal.value,
  modal => {
    if (modal !== 'magicBooks' && magicBookPageTurning.value) completeMagicBookTurn();
  },
);
onBeforeUnmount(() => {
  clearMagicBookTurnState();
  magicBookShellObserver?.disconnect();
  magicBookShellObserver = null;
  magicBookShellEl = null;
});
const openMagicHatModal = () => {
  if (!canEditMagicBooks.value) return;
  activeModal.value = 'magicHat';
};
const getCustomDifficultyOptionMeta = (influence: CustomDifficultyInfluence) =>
  CUSTOM_DIFFICULTY_INFLUENCE_GROUPS.flatMap(group => group.options).find(option => option.value === influence);
const isCustomDifficultyBaseOption = (
  influence: CustomDifficultyInfluence,
): influence is Exclude<DifficultyOption, '自定义'> =>
  (CUSTOM_DIFFICULTY_BASE_OPTIONS as readonly CustomDifficultyInfluence[]).includes(influence);
const ensureCustomDifficultyBase = (influences: CustomDifficultyInfluence[]): CustomDifficultyInfluence[] => {
  const hasBase = influences.some(isCustomDifficultyBaseOption);
  return hasBase ? influences : [...influences, '普通'];
};
const setMagicHatDifficulty = async (difficulty: DifficultyOption) => {
  if (!canEditMagicBooks.value) return;
  if (isUpdatingMagicHatDifficulty.value) return;
  if (magicHatDifficulty.value === difficulty) return;

  isUpdatingMagicHatDifficulty.value = true;
  const ok = await gameStore.updateStatDataFields({
    $难度: difficulty,
    ...(difficulty === '自定义'
      ? { $自定义影响: ensureCustomDifficultyBase(magicHatCustomInfluences.value) }
      : {}),
  });
  isUpdatingMagicHatDifficulty.value = false;
  if (!ok) {
    toastr.warning('难度切换失败，请稍后重试。');
    return;
  }

  toastr.success(`难度已切换为【${difficulty}】。`);
};
const toggleMagicHatCustomInfluence = async (influence: CustomDifficultyInfluence) => {
  if (!canEditMagicBooks.value || isUpdatingMagicHatDifficulty.value) return;
  const isBaseDifficulty = isCustomDifficultyBaseOption(influence);
  let next = magicHatCustomInfluences.value.filter(item => item !== influence);

  if (isBaseDifficulty) {
    next = next.filter(item => !isCustomDifficultyBaseOption(item));
    next.push(influence);
  } else if (!hasMagicHatCustomInfluence(influence)) {
    const exclusiveWith = getCustomDifficultyOptionMeta(influence)?.exclusiveWith ?? [];
    next = next.filter(item => !exclusiveWith.includes(item));
    next.push(influence);
  }

  next = ensureCustomDifficultyBase(next);
  isUpdatingMagicHatDifficulty.value = true;
  const ok = await gameStore.updateStatDataFields({
    $难度: '自定义',
    $自定义影响: next,
  });
  isUpdatingMagicHatDifficulty.value = false;
  if (!ok) {
    toastr.warning('自定义影响更新失败，请稍后重试。');
  }
};
const toggleMagicBook = async (bookName: string) => {
  if (isUpdatingMagicBooks.value) return;
  if (isMagicBookLocked(bookName)) {
    showGameFeedback(`${bookName}体系尚未解锁：${getMagicBookUnlockHint(bookName)}。`);
    return;
  }
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
const unlockMagicHatMetaGrowth = async (id: MagicHatMetaGrowthType) => {
  if (!canEditMagicBooks.value) return;
  if (isUpgradingMagicHat.value) return;

  const growth = magicHatMetaGrowthCards.value.find(item => item.id === id);
  if (!growth || growth.owned) return;

  if (magicHatSkillPoints.value < growth.cost) {
    toastr.warning('技能点不足，无法解锁。');
    return;
  }

  const nextGrowths = normalizeMagicHatMetaGrowths([...magicHatMetaGrowths.value, id]);
  const updates: Record<string, any> = {
    $技能点: magicHatSkillPoints.value - growth.cost,
    $局外成长: nextGrowths,
  };

  isUpgradingMagicHat.value = true;
  const ok = await gameStore.updateStatDataFields(updates);
  isUpgradingMagicHat.value = false;
  if (!ok) {
    toastr.warning('解锁失败，请稍后重试。');
    return;
  }

  toastr.success(`已解锁局外成长【${growth.label}】。`);
};
const resetMagicHatGrowths = async () => {
  if (!canEditMagicBooks.value) return;
  if (isUpgradingMagicHat.value) return;

  const refund = magicHatResetRefund.value;
  if (refund <= 0) {
    toastr.info('当前没有可重置的成长项。');
    return;
  }

  let nextRelics = inventoryRelicMap.value;
  if (hasMagicHatMetaGrowth('immunity')) {
    nextRelics = removeOneRelicByIdFromInventory('sanctuary_amulet', nextRelics);
  }
  if (hasMagicHatMetaGrowth('expansion')) {
    nextRelics = removeOneRelicByIdFromInventory('base_rainbow_card', nextRelics);
  }

  const updates: Record<string, any> = {
    $技能点: magicHatSkillPoints.value + refund,
    $初始血量上限: 20,
    $初始魔量: 1,
    $初始金币: 0,
    $局外成长: [],
    _血量上限: 20,
    _血量: Math.min(Math.max(1, getSafeInt(gameStore.statData._血量, 20)), 20),
    $魔量: Math.min(Math.max(1, getSafeInt(gameStore.statData.$魔量, 1)), 1),
    _金币: Math.max(0, getSafeInt(gameStore.statData._金币, 0) - getSafeInt(gameStore.statData.$初始金币, 0)),
    ...buildInventoryUpdateFields({ _圣遗物: nextRelics }),
  };

  isUpgradingMagicHat.value = true;
  const ok = await gameStore.updateStatDataFields(updates);
  isUpgradingMagicHat.value = false;
  if (!ok) {
    toastr.warning('重置失败，请稍后重试。');
    return;
  }

  toastr.success(`已重置魔法帽成长，并返还 ${refund} 技能点。`);
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
const startingActiveEquippedCount = computed(
  () => startingActiveSkillEntries.value.filter(entry => Boolean(entry.name)).length,
);
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
  'curse_alchemy_waste',
  'alchemy_enhanced_poison_potion',
  'alchemy_enhanced_rend_potion',
  'alchemy_enhanced_burning_potion',
  'alchemy_enhanced_frost_potion',
  'alchemy_enhanced_thunder_potion',
  'alchemy_enhanced_recovery_potion',
  'alchemy_mixed_potion',
  'alchemy_enhanced_mixed_potion',
  'alchemy_black_handprint',
  'alchemy_dirty',
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
    card => categorySet.has(card.category)
      && (card.requiredCategories ?? []).every(category => categorySet.has(category))
      && !EXCLUDED_VICTORY_REWARD_CARD_IDS.has(card.id),
  );
  if (filtered.length > 0) return filtered;
  return allCardsForTest.value.filter(
    card => card.category !== EVENT_CARD_CATEGORY && !EXCLUDED_VICTORY_REWARD_CARD_IDS.has(card.id),
  );
});
/** 已装备的主动技（含旧名映射），不再出现在奖励池中，避免重复 */
const ownedActiveSkillIds = computed(() => {
  const raw = Array.isArray(gameStore.statData.$主动) ? (gameStore.statData.$主动 as string[]) : [];
  return new Set(resolveActiveSkillNames(raw.map(name => String(name ?? '').trim())).map(skill => skill.id));
});
const rewardActiveSkillPool = computed<ActiveSkillData[]>(() => {
  const categorySet = new Set<string>(['基础', ...carriedMagicBooks.value]);
  const isOffered = (skill: ActiveSkillData) => (
    !EXCLUDED_VICTORY_REWARD_ACTIVE_SKILL_IDS.has(skill.id) && !ownedActiveSkillIds.value.has(skill.id)
  );
  const filtered = activeSkillsForBattle.value.filter(skill => categorySet.has(skill.category) && isOffered(skill));
  if (filtered.length > 0) return filtered;
  return activeSkillsForBattle.value.filter(skill => skill.category === '基础' && isOffered(skill));
});
const rewardDeckReplaceEntries = computed<Array<{ idx: number; name: string; card: CardData | null }>>(() => {
  const raw = Array.isArray(gameStore.statData._技能) ? (gameStore.statData._技能 as string[]) : [];
  return raw.slice(0, 9).map((name, idx) => ({
    idx,
    name,
    card: cardByNameForTest.value.get(name) ?? getCardByName(name) ?? null,
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
const activeForcedCurseReplacement = computed(() => forcedCurseReplacementQueue.value[0] ?? null);
const activeForcedCurseCard = computed<CardData | null>(() => {
  const active = activeForcedCurseReplacement.value;
  if (!active) return null;
  return cardByNameForTest.value.get(active.curseName) ?? getCardByName(active.curseName) ?? null;
});
const forcedCurseDeckReplaceEntries = computed<Array<{ idx: number; name: string; card: CardData | null; isCurse: boolean }>>(() => {
  const raw = Array.isArray(gameStore.statData._技能) ? (gameStore.statData._技能 as string[]) : [];
  return raw.slice(0, 9).map((name, idx) => {
    const card = cardByNameForTest.value.get(name) ?? getCardByName(name) ?? null;
    return { idx, name, card, isCurse: card?.type === CardType.CURSE };
  });
});
/** 诅咒牌不能被任何卡（包括另一张诅咒）替换；卡组已被诅咒填满时，新的诅咒无处可去 */
const forcedCurseHasReplaceableSlot = computed(() =>
  forcedCurseDeckReplaceEntries.value.length === 0 || forcedCurseDeckReplaceEntries.value.some(entry => !entry.isCurse),
);
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

const ALCHEMY_RELIC_FORCED_CURSE: Record<string, string> = {
  alchemy_midas_hand: '黑手印',
  alchemy_black_residue: '肮脏',
};

/** 色欲之书：可随机加入牌组的诅咒牌白名单（排除依赖特定首领机制的诅咒） */
const LUST_BOOK_CURSE_WHITELIST = [
  '虚无', '黑手印', '肮脏', '信息素', '炼金废料', '堕落的人格镜像', '脂肪块', '体内异物',
  '性爱幻觉', '淫墨誓约', '档案污页', '大地精华', '极乐佳肴', '圣水', '陨', '再来一鞭', '扯断晶丝',
] as const;
const LUST_BOOK_CURSE_COUNT = 3;

const enqueueForcedCurseReplacementForRelic = (relic: RelicData) => {
  if (relic.id === PORTED_RELIC_ID.LUST_BOOK) {
    const pool = LUST_BOOK_CURSE_WHITELIST.filter(name => Boolean(getCardByName(name)));
    for (let i = 0; i < LUST_BOOK_CURSE_COUNT && pool.length > 0; i++) {
      const curseName = pool[Math.floor(Math.random() * pool.length)]!;
      forcedCurseReplacementQueue.value.push({ relicId: relic.id, relicName: relic.name, curseName });
    }
    return;
  }
  const curseName = ALCHEMY_RELIC_FORCED_CURSE[relic.id];
  if (!curseName) return;
  forcedCurseReplacementQueue.value.push({
    relicId: relic.id,
    relicName: relic.name,
    curseName,
  });
};

/** 圣遗物获得时立即生效的效果（金币、生命上限等），供商店、宝箱、宝箱怪掉落共用 */
const buildRelicAcquisitionEffects = (relics: RelicData[]): { goldDelta: number; fields: Record<string, any> } => {
  let goldDelta = 0;
  const fields: Record<string, any> = {};
  for (const relic of relics) {
    if (relic.id === 'system_wealth_relic_16') {
      // 沐芯兰的借据
      goldDelta += 40;
    } else if (relic.id === 'system_wealth_relic_15') {
      const currentMaxHp = Math.max(1, toNonNegativeInt(gameStore.statData._血量上限, 1));
      goldDelta += Math.max(0, currentMaxHp - 1);
      fields._血量上限 = 1;
      fields._血量 = 1;
    }
  }
  return { goldDelta, fields };
};

const replaceDeckCardWithForcedCurse = async (idx: number) => {
  const active = activeForcedCurseReplacement.value;
  if (!active || forcedCurseReplacing.value) return;
  const curseCard = activeForcedCurseCard.value;
  if (!curseCard) {
    toastr.warning('未找到对应诅咒牌。');
    return;
  }

  const raw = Array.isArray(gameStore.statData._技能) ? [...(gameStore.statData._技能 as string[])].slice(0, 9) : [];
  if (raw.length === 0) {
    raw.push(curseCard.name);
  } else if (idx >= 0 && idx < raw.length) {
    if (forcedCurseDeckReplaceEntries.value[idx]?.isCurse) {
      toastr.warning('诅咒牌无法被替换，请选择其它槽位。');
      return;
    }
    raw[idx] = curseCard.name;
  } else {
    return;
  }

  forcedCurseReplacing.value = true;
  const ok = await gameStore.updateStatDataFields({ _技能: raw });
  forcedCurseReplacing.value = false;
  if (!ok) {
    toastr.warning('诅咒替换失败，请重试。');
    return;
  }

  forcedCurseReplacementQueue.value = forcedCurseReplacementQueue.value.slice(1);
  toastr.warning(`【${active.relicName}】已将第${idx + 1}槽替换为【${curseCard.name}】。`);
};

/** 卡组里已经没有可替换的非诅咒槽位：这份诅咒无法加入，直接跳过 */
const dismissUnplaceableForcedCurse = () => {
  const active = activeForcedCurseReplacement.value;
  if (!active || forcedCurseHasReplaceableSlot.value) return;
  forcedCurseReplacementQueue.value = forcedCurseReplacementQueue.value.slice(1);
  toastr.info(`卡组已被诅咒填满，【${active.curseName}】无处容身，消散了。`);
};

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
    case '炼金':
      return 'bg-lime-400/85';
    case '财富':
      return 'bg-amber-300/90';
    case '腐化':
      return 'bg-emerald-500/85';
    case '暗影':
      return 'bg-purple-500/85';
    case '破坏':
      return 'bg-slate-300/85';
    default:
      return 'bg-indigo-400/80';
  }
};

// ── Resolved deck from MVU _技能 via card registry（附带 _附魔 中的槽位附魔）──
const resolvedDeck = computed<CardData[]>(() => {
  const skills: string[] = Array.isArray(gameStore.statData._技能) ? (gameStore.statData._技能 as string[]) : [];
  const enchants = normalizeEnchantList(gameStore.statData._附魔);
  const result: CardData[] = [];
  skills.forEach((name, index) => {
    if (!name) return;
    const card = resolveCardNames([name])[0];
    if (!card) return;
    const enchant = enchants[index] ?? '';
    result.push(enchant ? applyEnchantToCard(card, enchant) : card);
  });
  return result;
});
/** 本场战斗临时附魔【淫文】的卡（resolvedDeck 下标），由战斗修正在开战时抽取 */
const combatTempYinwenIndexes = ref<number[]>([]);
const combatPlayerDeck = computed<CardData[]>(() => {
  const indexes = new Set(combatTempYinwenIndexes.value);
  if (indexes.size === 0) return resolvedDeck.value;
  return resolvedDeck.value.map((card, index) => (indexes.has(index) ? applyEnchantToCard(card, '淫文', { temporary: true }) : card));
});
const resolvedActiveSkills = computed<ActiveSkillData[]>(() => {
  const skills =
    activeCombatContext.value === 'combatTest'
      ? selectedTestActiveSkills.value
      : Array.isArray(gameStore.statData.$主动)
        ? (gameStore.statData.$主动 as string[])
        : [];
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
    .sort((a, b) => {
      const rarityOrder = { '传奇': 0, '稀有': 1, '普通': 2 };
      return rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
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
  { id: EVENT_RELIC_ID.GLUTTON_STOMACH, bonus: GLUTTON_STOMACH_MAX_HP_BONUS },
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
const victoryRewardRefreshLimit = computed(() => {
  if (!rewardIsNormalEnemy.value) return 0;
  return (getOwnedRelicCountById('base_silver_card') > 0 ? 1 : 0)
    + (isCustomDifficultyInfluenceActive('聪慧过人') ? 1 : 0)
    + Math.max(0, combatBattleModifiers.value.rewardRefreshBonus);
});
const canRefreshVictoryReward = computed(
  () =>
    showVictoryRewardView.value &&
    victoryRewardStage.value === 'pick' &&
    rewardIsNormalEnemy.value &&
    rewardRefreshUsedCount.value < victoryRewardRefreshLimit.value,
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
const mimicRelicDropEntry = computed<RelicEntryView | null>(() => {
  const relic = mimicRelicDropRelic.value;
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
const mimicRelicDropToneClass = computed(() => {
  const rarity = mimicRelicDropRelic.value?.rarity;
  if (rarity === '传奇') return 'is-legendary';
  if (rarity === '稀有') return 'is-rare';
  return 'is-common';
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

const combatRelicMap = computed<Record<string, number>>(() => {
  const map = { ...inventoryRelicMap.value };
  if (isCustomDifficultyInfluenceActive('家族传承')) {
    map.lucky_coin_small = Math.max(0, Math.floor(Number(map.lucky_coin_small ?? 0))) + 2;
    map.lucky_coin_large = Math.max(0, Math.floor(Number(map.lucky_coin_large ?? 0))) + 2;
  }
  return map;
});

watch(
  resolvedDeck,
  cards => {
    if (!Array.isArray(cards) || cards.length === 0) return;
    recordEncounteredCards(cards.map(card => card.id));
  },
  { immediate: true },
);

// 已装备的主动技也计入图鉴（主动技与卡牌共用图鉴的卡牌发现记录）
watch(
  resolvedActiveSkills,
  skills => {
    if (!Array.isArray(skills) || skills.length === 0) return;
    recordEncounteredCards(skills.map(skill => skill.id));
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
  if (modal !== 'map') {
    mapActivePointers.clear();
    mapDragPointerId.value = null;
    mapPinchStartDistance = 0;
  }
  if (modal === 'magicBooks' || modal === 'magicHat') {
    gameStore.loadStatData();
  }
  if (modal === 'settings') {
    void refreshBigSummaryChronicleEntries();
  }
  if (modal === 'map') {
    nextTick(() => {
      observeMapViewport();
      restoreMapViewportOrCenter();
      restoreMapModalScroll();
    });
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
  singleLayerDisplay: boolean;
};

type SettingsNavTab = 'text' | 'music' | 'ai' | 'summary';
type SettingsHelpKey =
  | 'singleLayerDisplay'
  | 'streamingEnabled'
  | 'forbidMatchingXmlInsideThink'
  | 'buttonCompletion'
  | 'mapRebirthInputAppend'
  | 'fastMode'
  | 'testMode'
  | 'autoSummaryEnabled'
  | 'summaryVisibleWindow'
  | 'manualSummary'
  | 'bigSummaryRange'
  | 'bigSummaryWords'
  | 'bigSummaryStreaming'
  | 'bigSummaryPrompt'
  | 'bigSummaryEntries';

const TEXT_SETTINGS_KEY = 'dungeon.text_settings.v1';
const AUTO_SCROLL_TOP_ON_REPLY_KEY = 'dungeon.auto_scroll_top_on_reply.v1';
const MAP_REBIRTH_INPUT_APPEND_KEY = 'dungeon.map_rebirth_input_append.v1';
const DEFAULT_TEXT_SETTINGS: TextSettingsState = {
  fontSize: 26,
  lineHeight: 2.0,
  fontFamily: "'Cinzel', serif",
  containerWidth: 1300,
  singleLayerDisplay: true,
};
const TEXT_FONT_FAMILY_OPTIONS = new Set<string>([
  "'Cinzel', serif",
  "'Noto Serif SC', serif",
  "'Inter', sans-serif",
  "'MedievalSharp', cursive",
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
    singleLayerDisplay:
      typeof candidate.singleLayerDisplay === 'boolean'
        ? candidate.singleLayerDisplay
        : DEFAULT_TEXT_SETTINGS.singleLayerDisplay,
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

const readMapRebirthInputAppendEnabled = (): boolean => {
  try {
    return localStorage.getItem(MAP_REBIRTH_INPUT_APPEND_KEY) === 'true';
  } catch {
    return false;
  }
};

const persistMapRebirthInputAppendEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(MAP_REBIRTH_INPUT_APPEND_KEY, String(enabled));
  } catch {
    // Ignore persistence errors in restricted environments
  }
};

const textSettings = reactive<TextSettingsState>(readTextSettings());
const isAutoScrollTopOnReplyEnabled = ref(readAutoScrollTopOnReplyEnabled());
const isMapRebirthInputAppendEnabled = ref(readMapRebirthInputAppendEnabled());

const setSingleLayerDisplay = (enabled: boolean) => {
  textSettings.singleLayerDisplay = enabled;
  if (!enabled) {
    isAutoScrollTopOnReplyEnabled.value = false;
    scrollStoryTextToBottom();
  }
};

const optionButtonFontSize = computed(() =>
  Math.round(clampTextSettingNumber(textSettings.fontSize * (14 / DEFAULT_TEXT_SETTINGS.fontSize), 11, 18, 14)),
);

/**
 * 正文字体：在衬线类字体组合的通用族 serif 之前补上思源宋体，
 * 让拉丁字体（如 Cinzel）中的中文不再回退到系统宋体；不改动玩家保存的设置值。
 */
const storyFontFamily = computed(() => {
  const stack = textSettings.fontFamily;
  if (/noto serif sc/i.test(stack) || !/(^|,\s*)serif\s*$/.test(stack)) return stack;
  return stack.replace(/(^|,\s*)serif\s*$/, "$1'Noto Serif SC', serif");
});
const optionButtonTextStyle = computed(() => ({
  fontSize: `${optionButtonFontSize.value}px`,
  lineHeight: '1.6',
}));

watch(
  textSettings,
  value => {
    persistTextSettings({
      fontSize: value.fontSize,
      lineHeight: value.lineHeight,
      fontFamily: value.fontFamily,
      containerWidth: value.containerWidth,
      singleLayerDisplay: value.singleLayerDisplay,
    });
  },
  { deep: true },
);

watch(isAutoScrollTopOnReplyEnabled, enabled => {
  persistAutoScrollTopOnReplyEnabled(enabled);
});

watch(isMapRebirthInputAppendEnabled, enabled => {
  persistMapRebirthInputAppendEnabled(enabled);
});

watch(
  [() => gameStore.messageListRevision, () => gameStore.streamingText],
  () => {
    if (textSettings.singleLayerDisplay) return;
    scrollStoryTextToBottom();
  },
);

const isStreamingEnabled = computed<boolean>({
  get: () => gameStore.useStreaming,
  set: value => gameStore.setUseStreaming(value),
});

const isBigSummaryStreamingEnabled = computed<boolean>({
  get: () => gameStore.bigSummaryStreamingEnabled,
  set: value => gameStore.setBigSummaryStreamingEnabled(value),
});

const isForbidMatchingXmlInsideThinkEnabled = computed<boolean>({
  get: () => gameStore.forbidMatchingXmlInsideThink,
  set: value => gameStore.setForbidMatchingXmlInsideThink(value),
});

const isButtonCompletionEnabled = computed<boolean>({
  get: () => gameStore.buttonCompletionEnabled,
  set: value => gameStore.setButtonCompletionEnabled(value),
});

const isFastModeEnabled = computed<boolean>({
  get: () => gameStore.fastModeEnabled,
  set: value => gameStore.setFastModeEnabled(value),
});

const isFastModeLocked = computed(() => gameStore.fastModeBufferActive || gameStore.testModeEnabled);
const isTestModeEnabled = computed<boolean>({
  get: () => gameStore.testModeEnabled,
  set: value => gameStore.setTestModeEnabled(value),
});
const toggleTestModeSetting = () => {
  if (!isCombatTestUnlocked.value) return;
  isTestModeEnabled.value = !isTestModeEnabled.value;
  showGameFeedback(isTestModeEnabled.value ? '测试模式已开启：之后不会再调用AI。' : '测试模式已关闭。');
};
const toggleFastModeSetting = () => {
  if (isFastModeLocked.value) return;
  isFastModeEnabled.value = !isFastModeEnabled.value;
};

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

const bigSummaryPromptSegments = computed<BigSummaryPromptSegment[]>(() => gameStore.bigSummaryPromptSegments);
const bigSummaryPromptRoleOptions: Array<{ value: BigSummaryPromptRole; label: string }> = [
  { value: 'system', label: 'SYSTEM' },
  { value: 'assistant', label: 'ASSISTANT' },
  { value: 'user', label: 'USER' },
];

const persistBigSummaryPromptEditor = () => {
  gameStore.persistBigSummaryPromptSegments();
};

const createEditorBigSummaryPromptSegment = (
  role: BigSummaryPromptRole = 'user',
  content = '',
): BigSummaryPromptSegment => ({
  id: `big-summary-prompt-editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
});

const addBigSummaryPromptSegment = (index?: number) => {
  const segments = [...gameStore.bigSummaryPromptSegments];
  const insertionIndex = index === undefined ? segments.length : Math.max(0, Math.min(index, segments.length));
  segments.splice(insertionIndex, 0, createEditorBigSummaryPromptSegment());
  gameStore.setBigSummaryPromptSegments(segments);
};

const moveBigSummaryPromptSegment = (index: number, offset: -1 | 1) => {
  const nextIndex = index + offset;
  const segments = [...gameStore.bigSummaryPromptSegments];
  if (index < 0 || index >= segments.length || nextIndex < 0 || nextIndex >= segments.length) return;
  const [segment] = segments.splice(index, 1);
  if (!segment) return;
  segments.splice(nextIndex, 0, segment);
  gameStore.setBigSummaryPromptSegments(segments);
};

const removeBigSummaryPromptSegment = (index: number) => {
  const segments = [...gameStore.bigSummaryPromptSegments];
  if (segments.length <= 1 || index < 0 || index >= segments.length) return;
  segments.splice(index, 1);
  gameStore.setBigSummaryPromptSegments(segments);
};

const restoreDefaultBigSummaryPrompt = () => {
  gameStore.resetBigSummaryPromptSegments();
  toastr.success('大总结提示词已恢复默认。');
};

type BigSummaryDraft = {
  originalSummary: string;
  editedSummary: string;
  rangeStart: number;
  rangeEnd: number;
  entryCount: number;
};

const settingsNavTab = ref<SettingsNavTab>('text');
const settingsTabs = [
  { id: 'text', label: '正文显示', icon: Type },
  { id: 'music', label: '声音特效', icon: Volume2 },
  { id: 'ai', label: 'AI回复', icon: Sparkles },
  { id: 'summary', label: '总结', icon: NotebookText },
] as const;

function handleSettingsTabKeydown(event: KeyboardEvent) {
  const tabs = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const current = tabs.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length
    : event.key === 'ArrowLeft' ? (current + tabs.length - 1) % tabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault();
  tabs[next]!.click();
  tabs[next]!.focus();
}
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
  singleLayerDisplay:
    '开启时正文框只显示最新AI楼层，保持原本体验；关闭后按消息顺序显示历史玩家输入与AI正文。（仅影响显示，有关回退楼层与编辑等操作依旧依靠读档界面）',
  streamingEnabled:
    '开启后，AI回复会边生成边显示预览文本，不必等完整回复结束才看到内容；关闭后只在生成完成后显示最终回复。',
  forbidMatchingXmlInsideThink:
    '开启后，系统解析 <status>、<options>、<sum> 等 XML 标签时，会忽略思维链内容里的同名标签，避免把AI思考过程中的示例标签误当成正式结果。',
  buttonCompletion: '开启后，输入框会根据当前可选项提供按钮式补全，方便快速选择剧情选项或行动；关闭后只保留手动输入。',
  mapRebirthInputAppend:
    '开启后，点击地图节点或回溯重生时，若输入框已有内容，会把这段内容一并发送并清空输入框；关闭后保持原本只发送按钮行动。',
  fastMode:
    '开启后，部分行动会进入剧情精简模式：除了事件房、商店房与领主房外剧情不会再请求LLM回复，而是记录并一起注入user楼层。',
  testMode:
    '作者测试用。开启后为纯打牌模式：商店、事件、领主房等所有房间与战斗结果都直接结算并记录到user楼层，全程不调用AI。开启时会同时锁定剧情精简模式。',
  autoSummaryEnabled:
    '关闭后不会再把每层楼的 <sum> 自动写入总结条目，并且会清空该条目内容，从而停止这部分提示词注入；重新打开后会按历史楼层重新生成。',
  summaryVisibleWindow:
    '该项参数为会将正文完整发送给AI的楼层层数：设置越高，AI对于过往记忆细节越清晰，token数也会增加；设置越低，会降低AI对于过往记忆细节回想，但token数会显著下降。',
  manualSummary:
    '点击后自动补全当前存档的总结至总结条目，用于切换存档或世界书更新后使用（注意！会覆盖大总结内容且不可逆！没事别点。）。',
  bigSummaryRange: '决定本次会抽取哪些小总结条目来合并。起始和结束编号都会包含在内，建议每次总结条目在50以内',
  bigSummaryWords: '用于约束大总结的目标篇幅。',
  bigSummaryStreaming: '开启后，大总结请求会使用流式传输；关闭后等待AI生成完成后一次性取得结果。',
  bigSummaryPrompt:
    '这里可以把大总结提示词拆成多个区块，逐段选择 system、assistant 或 user 角色，并用上下箭头调整发送顺序。内容会自动保存在当前浏览器；可使用 {{minWords}}、{{maxWords}} 和 {{summaries}} 占位符。',
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

const STORY_MULTI_DIVIDER_MARKER = '__DUNGEON_STORY_MULTI_DIVIDER__';
const STORY_MULTI_CURRENT_DIVIDER_MARKER = '__DUNGEON_STORY_MULTI_CURRENT_DIVIDER__';
const STORY_MULTI_USER_LINE_MARKER = '__DUNGEON_STORY_MULTI_USER_LINE__';
const FINAL_AREA_META_OBSERVATION_TEXT =
  '欲望之神捕捉到了来自故事外侧的扰动；那不是地牢里的事件，而是玩家亲手拨动命运时留下的涟漪。';
const FINAL_AREA_SYSTEM_RECORD_RE =
  /<系统记录：终极区域外侧操作>[\s\S]*?<\/系统记录：终极区域外侧操作>|<命运涟漪>[\s\S]*?<\/命运涟漪>/g;

const stripFinalAreaSystemRecordsForDisplay = (text: string): string =>
  text
    .replace(FINAL_AREA_SYSTEM_RECORD_RE, '')
    .replaceAll(FINAL_AREA_META_OBSERVATION_TEXT, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const markStoryUserLines = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => `${STORY_MULTI_USER_LINE_MARKER}${line}`)
    .join('\n');

const storyDisplaySourceText = computed<string>(() => {
  const latestText = gameStore.mainText;
  if (textSettings.singleLayerDisplay) return latestText;

  // 只影响正文框显示：选项、变量、总结和生成流程仍全部读取最新楼层的 store 状态。
  void gameStore.currentSummary;
  void gameStore.options.length;
  void gameStore.isGenerating;
  void gameStore.streamingText;
  void gameStore.messageListRevision;

  const lastMessageId = Number(getLastMessageId());
  if (!Number.isFinite(lastMessageId) || lastMessageId < 0) return latestText;

  try {
    const parserOptions = { forbidMatchingXmlInsideThink: gameStore.forbidMatchingXmlInsideThink };
    const messages = getChatMessages(`0-${Math.floor(lastMessageId)}`, { hide_state: 'all' });
    const latestAssistantMessageId = messages.reduce((latestId, message) => {
      if (message.role !== 'assistant') return latestId;
      const messageId = Number(message.message_id);
      return Number.isFinite(messageId) && messageId > latestId ? messageId : latestId;
    }, -1);
    const floorTexts = messages
      .map(message => {
        const messageId = Number(message.message_id);
        if (message.role === 'user') {
          const userText = stripFinalAreaSystemRecordsForDisplay(String(message.message ?? ''));
          if (!userText) return '';
          return `${STORY_MULTI_DIVIDER_MARKER}\n${markStoryUserLines(userText)}`;
        }
        if (message.role !== 'assistant') return '';

        const assistantText = String(message.message ?? '');
        const mainText =
          messageId === latestAssistantMessageId
            ? latestText.trim()
            : hasMainTextTag(assistantText, parserOptions)
              ? extractMainTextOnly(assistantText, parserOptions).trim()
              : extractMainText(assistantText, parserOptions).trim();
        if (!mainText) return '';
        const dividerMarker =
          messageId === latestAssistantMessageId ? STORY_MULTI_CURRENT_DIVIDER_MARKER : STORY_MULTI_DIVIDER_MARKER;
        return `${dividerMarker}\n${mainText}`;
      })
      .filter(text => text.length > 0);
    const streamingText =
      gameStore.isGenerating && gameStore.streamingText ? stripImageBlocks(gameStore.streamingText) : '';
    if (streamingText) {
      floorTexts.push(`${STORY_MULTI_DIVIDER_MARKER}\n${streamingText}`);
    }
    return floorTexts.length > 0 ? floorTexts.join('\n\n') : latestText;
  } catch (err) {
    console.warn('[GameView] Failed to build all-floor story display:', err);
    return latestText;
  }
});

/** Replace <image>…</image> blocks with placeholder markers, preserving positions */
const processedMainText = computed<{ text: string; imageBlocks: InlineImageBlock[] }>(() => {
  const raw = storyDisplaySourceText.value;
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
  spritePosition: string;
  fill: string;
  border: string;
  text: string;
};
type MapNodeKind = 'room' | 'boss' | 'floor' | 'start';
type MapNodeView = {
  /** 区域门牌上的罗马数字序号 */
  gateNumeral: string;
  key: string;
  kind: MapNodeKind;
  y: number;
  x: number;
  centerX: number;
  centerY: number;
  icon: string;
  label: string;
  roomType: string;
  idolType?: '白神像' | '黑神像';
  areaName?: string;
  isLatest: boolean;
  isVisited: boolean;
  isAvailable: boolean;
  isBoss: boolean;
  iconStyle: Record<string, string>;
  style: Record<string, string>;
};
type MapLineView = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 水平切线的三次贝塞尔路径（横向地图里路线以柔和的 S 形相连） */
  d: string;
  isVisited: boolean;
};

/** 横向地图：前进方向为 x（左→右），路线分布在 y 上 */
const MAP_STEP_X = 62 + 70;
const MAP_STEP_Y = 62 + 30;
/** 领主房后的区域选择：右侧扇出的区域门牌 */
const MAP_GATE_X = 300;
const MAP_GATE_WIDTH = 330;
const MAP_GATE_HEIGHT = 96;
const MAP_GATE_GAP_Y = 124;
const MAP_GATE_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const MAP_PATH_COLUMNS = 6;
const MAP_CELL_SIZE = 62;
const MAP_CELL_GAP = 32;
const MAP_MIN_SCALE = 0.44;
const MAP_MAX_SCALE = 2.6;
const MAP_SCALE_STEP = 0.14;
/** 路线图四周留出的地图底图边距（场景坐标），拖到边缘时仍有底图 */
const MAP_SCENE_MARGIN = 240;
/** 固定在视口顶部的楼层信息占用的高度（屏幕像素），重置视图时路线图避开它 */
const MAP_OVERLAY_TOP = 150;
/** 固定在视口右上方的图例占用的宽度（屏幕像素），重置视图时两侧对称避开 */
const MAP_OVERLAY_SIDE = 200;
const MAP_DEFAULT_SCALE = 0.72;
// v2：地图改为横向布局，旧的竖向视口位置不再适用
const MAP_VIEWPORT_STORAGE_KEY = 'dungeon.map.viewport.v2';
const MAP_SCROLL_STORAGE_KEY = 'dungeon.map.scroll.v1';
const MAP_ICON_SPRITE_URL =
  'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E4%B8%BB%E7%95%8C%E9%9D%A2/%E5%9C%B0%E5%9B%BE%E5%9B%BE%E6%A0%87.png';
const MAIN_UI_IMAGE_URLS = [
  'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E4%B8%BB%E7%95%8C%E9%9D%A2/%E6%8C%89%E9%92%AE%E5%9B%BE%E6%A0%87.png?v=20261003-atlas16',
  'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E4%B8%BB%E7%95%8C%E9%9D%A2/%E8%8F%9C%E5%8D%95%E6%8C%89%E9%92%AE.png?v=20261008-menu-buttons',
  ...ALL_CARD_FRAME_URLS,
  MAP_ICON_SPRITE_URL,
];
const MAP_ROOM_VISUAL_BY_LABEL: Record<string, MapRoomVisual> = {
  战斗: { icon: '', spritePosition: '0% 0%', fill: 'transparent', border: '#1c1812', text: '#1c1812' },
  领主: { icon: '', spritePosition: '100% 100%', fill: 'transparent', border: '#1c1812', text: '#1c1812' },
  宝箱: { icon: '', spritePosition: '33.333% 0%', fill: 'transparent', border: '#1c1812', text: '#1c1812' },
  商店: { icon: '', spritePosition: '0% 100%', fill: 'transparent', border: '#1c1812', text: '#1c1812' },
  温泉: { icon: '', spritePosition: '100% 0%', fill: 'transparent', border: '#1c1812', text: '#1c1812' },
  神像: { icon: '', spritePosition: '66.667% 0%', fill: 'transparent', border: '#1c1812', text: '#1c1812' },
  事件: { icon: '', spritePosition: '33.333% 100%', fill: 'transparent', border: '#1c1812', text: '#1c1812' },
};
const MAP_LEGEND_DEFINITIONS = [
  { roomType: '战斗房', label: '战斗' },
  { roomType: '宝箱房', label: '宝箱' },
  { roomType: '商店房', label: '商店' },
  { roomType: '温泉房', label: '温泉' },
  { roomType: '神像房', label: '神像' },
  { roomType: '事件房', label: '事件' },
  { roomType: '领主房', label: '领主' },
] as const;

type MapPathEntry = {
  x: number;
  房间类型: string;
};

const normalizePathEntry = (value: unknown): MapPathEntry | null => {
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    const x = Number(raw.x);
    const roomType = typeof raw.房间类型 === 'string' ? raw.房间类型.trim() : '';
    if (Number.isInteger(x) && x >= 1 && x <= 6 && roomType) return { x, 房间类型: roomType };
  }
  if (typeof value === 'string' && value.trim()) {
    const label = value.trim();
    return { x: 0, 房间类型: label.endsWith('房') ? label : `${label}房` };
  }
  return null;
};

const currentFloorPath = computed<MapPathEntry[]>(() => {
  const rawPath = Array.isArray(gameStore.statData.$路径)
    ? gameStore.statData.$路径
    : ((gameStore.statData.$统计 as any)?.$路径 ?? null);
  if (!Array.isArray(rawPath)) return [];
  return rawPath.map(normalizePathEntry).filter((item): item is MapPathEntry => Boolean(item));
});
const currentDungeonMap = computed<DungeonMap>(() => normalizeDungeonMap(gameStore.statData.$地图));
const currentLayerRoomCount = computed<number>(() => {
  const rawCount = Number((gameStore.statData.$统计 as any)?.当前层已过房间 ?? 0);
  if (!Number.isFinite(rawCount)) return 0;
  return Math.max(0, Math.floor(rawCount));
});
const mapViewportRef = ref<HTMLElement | null>(null);
const mapViewportWidth = ref(0);
const mapViewportHeight = ref(0);
let mapViewportResizeObserver: ResizeObserver | null = null;
const mapScale = ref(MAP_DEFAULT_SCALE);
const mapOffsetX = ref(0);
const mapOffsetY = ref(0);
let mapViewportPersistTimer: ReturnType<typeof setTimeout> | null = null;
let mapScrollPersistTimer: ReturnType<typeof setTimeout> | null = null;
let mapModalBodyElement: HTMLElement | null = null;
const mapDragPointerId = ref<number | null>(null);
const mapDragStartClient = ref({ x: 0, y: 0 });
const mapDragStartOffset = ref({ x: 0, y: 0 });
const mapActivePointers = new Map<number, { x: number; y: number }>();
let mapPinchStartDistance = 0;
let mapPinchStartScale = MAP_DEFAULT_SCALE;
let mapPinchStartCenter = { x: 0, y: 0 };
let mapPinchStartWorld = { x: 0, y: 0 };
const updateMapViewportSize = (recenter = true) => {
  const viewport = mapViewportRef.value;
  if (!viewport) return;
  const nextWidth = viewport.clientWidth;
  const nextHeight = viewport.clientHeight;
  const changed = nextWidth !== mapViewportWidth.value || nextHeight !== mapViewportHeight.value;
  mapViewportWidth.value = nextWidth;
  mapViewportHeight.value = nextHeight;
  if (recenter && changed && activeModal.value === 'map') {
    nextTick(() => centerMapOnLatestNode(true));
  }
};
const observeMapViewport = () => {
  updateMapViewportSize(false);
  mapViewportResizeObserver?.disconnect();
  mapViewportResizeObserver = null;
  if (typeof ResizeObserver === 'undefined' || !mapViewportRef.value) return;
  mapViewportResizeObserver = new ResizeObserver(() => updateMapViewportSize(true));
  mapViewportResizeObserver.observe(mapViewportRef.value);
};
const mapZoomPercent = computed(() => `${Math.round(mapScale.value * 100)}%`);
const mapCurrentFloorLabel = computed(() => {
  const floor = Math.max(1, toNonNegativeInt(gameStore.statData._楼层数, 1));
  return `第 ${floor} 层`;
});
const mapCurrentAreaLabel = computed(() => {
  const area = ((gameStore.statData._当前区域 as string) || '').trim();
  return area || '未记录';
});
const mapCurrentRoomLabel = computed(
  () => currentFloorPath.value[currentFloorPath.value.length - 1]?.房间类型 ?? ((gameStore.statData._当前房间类型 as string) || '未记录'),
);

const mapCurrentY = computed(() => Math.min(MAP_HEIGHT, currentFloorPath.value.length));
const mapNextY = computed(() => mapCurrentY.value + 1);
const mapIsFloorTransition = computed(
  () => ((gameStore.statData._当前区域 as string) || '').trim() === '魔女的小窝' || ((gameStore.statData._当前房间类型 as string) || '').trim() === '领主房',
);
const nextMapAreas = computed<string[]>(() => {
  const currentArea = ((gameStore.statData._当前区域 as string) || '').trim();
  if (currentArea === '魔女的小窝') return (FLOOR_MAP['第一层'] ?? []).filter(area => area !== '魔女的小窝');
  const currentFloor = getFloorForArea(currentArea);
  const nextFloor = currentFloor ? getNextFloor(currentFloor) : null;
  if (!nextFloor) return [];
  if (nextFloor === FINAL_FLOOR_NAME) return [FINAL_AREA_NAME];
  return (FLOOR_MAP[nextFloor] ?? []).filter(area => area !== currentArea);
});
/** 区域选择时要前往的楼层名（第一层 / 第二层 … / 终极区域） */
const mapNextFloorLabel = computed(() => {
  const currentArea = ((gameStore.statData._当前区域 as string) || '').trim();
  if (currentArea === '魔女的小窝') return '第一层';
  const currentFloor = getFloorForArea(currentArea);
  return (currentFloor ? getNextFloor(currentFloor) : null) ?? '';
});
const mapRoomVisual = (roomType: string): MapRoomVisual => {
  const label = roomType.endsWith('房') ? roomType.slice(0, -1) : roomType;
  return (
    MAP_ROOM_VISUAL_BY_LABEL[label] ?? {
      icon: '◻',
      spritePosition: '0% 0%',
      fill: 'rgba(39,39,42,0.78)',
      border: '#a1a1aa',
      text: '#f4f4f5',
    }
  );
};
const mapLegendEntries = computed(() =>
  MAP_LEGEND_DEFINITIONS.map(entry => {
    const visual = mapRoomVisual(entry.roomType);
    return {
      ...entry,
      iconStyle: {
        backgroundImage: `url("${MAP_ICON_SPRITE_URL}")`,
        backgroundPosition: visual.spritePosition,
      },
    };
  }),
);
/**
 * 节点中心（布局坐标）。y 为前进步数（0 起点 … MAP_HEIGHT+1 领主），x 为所在路线（1 起）。
 * 区域选择时：起点在左侧居中，各区域门牌在右侧纵向排开。
 */
const mapGateCount = computed(() => Math.max(1, nextMapAreas.value.length));
const mapRoomCenter = (x: number, y: number) => {
  if (mapIsFloorTransition.value) {
    const gatesHeight = (mapGateCount.value - 1) * MAP_GATE_GAP_Y + MAP_GATE_HEIGHT;
    if (y === 0) return { x: 35, y: gatesHeight / 2 };
    return { x: MAP_GATE_X + MAP_GATE_WIDTH / 2, y: (x - 1) * MAP_GATE_GAP_Y + MAP_GATE_HEIGHT / 2 };
  }
  return {
    x: y * MAP_STEP_X + 35,
    y: (x - 1) * MAP_STEP_Y + MAP_CELL_SIZE / 2,
  };
};
/** 两点之间的水平切线 S 形路径；终点为门牌时连到门牌左缘 */
const mapCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

const mapNextRoomEntries = computed<MapRoomNode[]>(() => {
  if (mapIsFloorTransition.value || mapNextY.value > MAP_HEIGHT || currentDungeonMap.value.length !== MAP_ROUTE_COUNT) return [];
  const last = currentFloorPath.value[currentFloorPath.value.length - 1];
  const seen = new Set<string>();
  return currentDungeonMap.value
    .filter(route => !last || last.x < 1 || route[mapCurrentY.value - 1]?.x === last.x)
    .map(route => route[mapNextY.value - 1])
    .filter((node): node is MapRoomNode => Boolean(node))
    .filter(node => {
      const key = `${node.x}:${node.房间类型}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
});

const mapNextRoomNodes = computed<MapNodeView[]>(() =>
  mapNextRoomEntries.value.map(node => buildMapNodeView(node, mapNextY.value, 'room')),
);

const buildMapNodeView = (node: MapRoomNode, y: number, kind: MapNodeKind, areaName?: string): MapNodeView => {
  const step = MAP_CELL_SIZE + MAP_CELL_GAP;
  const startIsLord = kind === 'start' && ((gameStore.statData._当前房间类型 as string) || '').trim() === '领主房';
  const visual = mapRoomVisual(kind === 'start' ? (startIsLord ? '领主房' : '宝箱房') : kind === 'boss' ? '领主房' : node.房间类型);
  const center = mapRoomCenter(node.x, y);
  const visitedEntry = currentFloorPath.value[y - 1];
  const isVisited = Boolean(visitedEntry && visitedEntry.x === node.x && visitedEntry.房间类型 === node.房间类型);
  const isLatest =
    (kind === 'start' && currentFloorPath.value.length === 0) ||
    (kind === 'boss' && ((gameStore.statData._当前房间类型 as string) || '').trim() === '领主房') ||
    (kind === 'room' && y === mapCurrentY.value && isVisited);
  const isAvailable =
    (gameStore.hasLeave || idolRoomMapExitReady.value) &&
    !gameStore.isGenerating &&
    ((kind === 'room' && y === mapNextY.value && !mapIsFloorTransition.value && mapNextRoomEntries.value.some(candidate => candidate.x === node.x)) ||
      (kind === 'boss' && mapCurrentY.value >= MAP_HEIGHT && !mapIsFloorTransition.value) ||
      (kind === 'floor' && mapIsFloorTransition.value && Boolean(areaName)));
  return {
    key: `${kind}-${y}-${node.x}-${areaName ?? node.房间类型}`,
    kind,
    y,
    x: node.x,
    centerX: center.x,
    centerY: center.y,
    icon: visual.icon,
    label: kind === 'floor' ? areaName ?? '下一层' : kind === 'start' ? '起点宝箱' : kind === 'boss' ? '领主' : '',
    roomType: node.房间类型,
    idolType: node.神像类型,
    areaName,
    isLatest,
    isVisited,
    isAvailable,
    isBoss: kind === 'boss',
    iconStyle: {
      backgroundImage: `url("${MAP_ICON_SPRITE_URL}")`,
      backgroundPosition: visual.spritePosition,
    },
    gateNumeral: kind === 'floor' ? (MAP_GATE_NUMERALS[node.x - 1] ?? String(node.x)) : '',
    style: {
      width: kind === 'floor' ? `${MAP_GATE_WIDTH}px` : `${kind === 'start' || kind === 'boss' ? 70 : MAP_CELL_SIZE}px`,
      ...(kind === 'floor' ? { height: `${MAP_GATE_HEIGHT}px` } : {}),
      left: `${center.x - (kind === 'floor' ? MAP_GATE_WIDTH / 2 : (kind === 'start' || kind === 'boss' ? 35 : MAP_CELL_SIZE / 2))}px`,
      top: `${center.y - (kind === 'floor' ? MAP_GATE_HEIGHT / 2 : (kind === 'start' || kind === 'boss' ? 35 : MAP_CELL_SIZE / 2))}px`,
      background: visual.fill,
      borderColor: visual.border,
      color: visual.text,
    },
  };
};

const mapNodes = computed<MapNodeView[]>(() => {
  if (mapIsFloorTransition.value) {
    return [
      buildMapNodeView({ x: 3, 房间类型: '宝箱房' }, 0, 'start'),
      ...nextMapAreas.value.map((area, index) =>
        buildMapNodeView({ x: index + 1, 房间类型: '宝箱房' }, 1, 'floor', area),
      ),
    ];
  }
  if (currentDungeonMap.value.length !== MAP_ROUTE_COUNT) {
    return [];
  }
  const nodes: MapNodeView[] = [buildMapNodeView({ x: 3, 房间类型: '宝箱房' }, 0, 'start')];
  const seen = new Set<string>();
  for (let y = 1; y <= MAP_HEIGHT; y += 1) {
    for (const route of currentDungeonMap.value) {
      const node = route[y - 1];
      if (!node) continue;
      const key = `${y}:${node.x}:${node.房间类型}`;
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push(buildMapNodeView(node, y, 'room'));
    }
  }
  nodes.push(buildMapNodeView({ x: 3, 房间类型: '领主房' }, MAP_HEIGHT + 1, 'boss'));
  return nodes;
});

const mapSelectionAvailable = computed(
  () =>
    (gameStore.hasLeave || idolRoomMapExitReady.value) &&
    ((mapIsFloorTransition.value && nextMapAreas.value.length > 0) ||
      mapNextRoomNodes.value.length > 0 ||
      (mapCurrentY.value >= MAP_HEIGHT && currentDungeonMap.value.length === MAP_ROUTE_COUNT)),
);
const mapSelectionLabel = computed(() => {
  if (mapIsFloorTransition.value) {
    const area = ((gameStore.statData._当前区域 as string) || '').trim();
    return area === '魔女的小窝' ? '打开地图，选择进入区域' : '打开地图，进入下一层';
  }
  if (mapCurrentY.value >= MAP_HEIGHT) return '打开地图，挑战领主房';
  return `打开地图，选择下一房间`;
});
const openMapForSelection = () => {
  activeModal.value = 'map';
  nextTick(() => {
    restoreMapViewportOrCenter();
    restoreMapModalScroll();
  });
};

const openMapAfterSpecialRoom = async () => {
  await nextTick();
  if (mapSelectionAvailable.value) {
    openMapForSelection();
  }
};

const ensureDungeonMapForCurrentFloor = () => {
  if (!gameStore.isInitialized) return;
  void gameStore.ensureCurrentFloorMap();
};

const mapContentWidth = computed<number>(() =>
  mapIsFloorTransition.value ? MAP_GATE_X + MAP_GATE_WIDTH : (MAP_HEIGHT + 1) * MAP_STEP_X + 70,
);
const mapContentHeight = computed<number>(() =>
  mapIsFloorTransition.value
    ? (mapGateCount.value - 1) * MAP_GATE_GAP_Y + MAP_GATE_HEIGHT
    : (MAP_PATH_COLUMNS - 1) * MAP_STEP_Y + MAP_CELL_SIZE,
);
const mapSceneWidth = computed<number>(() => {
  const viewportWidth = mapViewportWidth.value / MAP_MIN_SCALE;
  const viewportHeight = (mapViewportHeight.value * (16 / 9)) / MAP_MIN_SCALE;
  const contentWidth = mapContentWidth.value + MAP_SCENE_MARGIN * 2;
  return Math.max(contentWidth, mapContentHeight.value * (16 / 9), viewportWidth, viewportHeight);
});
const mapSceneHeight = computed<number>(() =>
  Math.max(mapContentHeight.value + MAP_SCENE_MARGIN * 2, mapSceneWidth.value * (9 / 16)),
);
const mapLayoutStyle = computed<Record<string, string>>(() => ({
  width: `${mapContentWidth.value}px`,
  height: `${mapContentHeight.value}px`,
  left: `${(mapSceneWidth.value - mapContentWidth.value) / 2}px`,
  top: `${(mapSceneHeight.value - mapContentHeight.value) / 2}px`,
}));
const mapLines = computed<MapLineView[]>(() => {
  const lines: MapLineView[] = [];
  const seen = new Set<string>();
  if (mapIsFloorTransition.value) {
    const startCenter = mapRoomCenter(3, 0);
    nextMapAreas.value.forEach((area, index) => {
      const targetCenter = mapRoomCenter(index + 1, 1);
      const x1 = startCenter.x + 30;
      const x2 = targetCenter.x - MAP_GATE_WIDTH / 2 + 10;
      lines.push({
        key: `start:floor:${area}`,
        x1,
        y1: startCenter.y,
        x2,
        y2: targetCenter.y,
        d: mapCurvePath(x1, startCenter.y, x2, targetCenter.y),
        isVisited: false,
      });
    });
    return lines;
  }
  if (currentDungeonMap.value.length !== MAP_ROUTE_COUNT) return lines;

  const startCenter = mapRoomCenter(3, 0);
  const firstXs = new Set(currentDungeonMap.value.map(route => route[0]?.x).filter((x): x is number => Number.isInteger(x)));
  for (const x of firstXs) {
    const targetCenter = mapRoomCenter(x, 1);
    lines.push({
      key: `start:${x}`,
      x1: startCenter.x,
      y1: startCenter.y,
      x2: targetCenter.x,
      y2: targetCenter.y,
      d: mapCurvePath(startCenter.x, startCenter.y, targetCenter.x, targetCenter.y),
      isVisited: currentFloorPath.value.length >= 1 && currentFloorPath.value[0]?.x === x,
    });
  }
  for (const route of currentDungeonMap.value) {
    for (let index = 1; index < route.length; index += 1) {
      const from = route[index - 1]!;
      const to = route[index]!;
      const fromCenter = mapRoomCenter(from.x, index);
      const toCenter = mapRoomCenter(to.x, index + 1);
      const key = `${index}:${from.x}>${to.x}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({
        key,
        x1: fromCenter.x,
        y1: fromCenter.y,
        x2: toCenter.x,
        y2: toCenter.y,
        d: mapCurvePath(fromCenter.x, fromCenter.y, toCenter.x, toCenter.y),
        isVisited:
          currentFloorPath.value.length > index &&
          currentFloorPath.value[index - 1]?.x === from.x &&
          currentFloorPath.value[index]?.x === to.x,
      });
    }
  }
  if (currentDungeonMap.value.length === MAP_ROUTE_COUNT && !mapIsFloorTransition.value) {
    const bossCenter = mapRoomCenter(3, MAP_HEIGHT + 1);
    const lastXs = new Set(currentDungeonMap.value.map(route => route[MAP_HEIGHT - 1]?.x).filter((x): x is number => Number.isInteger(x)));
    for (const x of lastXs) {
      const fromCenter = mapRoomCenter(x, MAP_HEIGHT);
      lines.push({
        key: `boss:${x}`,
        x1: fromCenter.x,
        y1: fromCenter.y,
        x2: bossCenter.x,
        y2: bossCenter.y,
        d: mapCurvePath(fromCenter.x, fromCenter.y, bossCenter.x, bossCenter.y),
        isVisited:
          currentFloorPath.value.length >= MAP_HEIGHT &&
          ((gameStore.statData._当前房间类型 as string) || '').trim() === '领主房' &&
          currentFloorPath.value[MAP_HEIGHT - 1]?.x === x,
      });
    }
  }
  return lines;
});
/**
 * 缩小查看整张地图时，房间图标与路线按比例放大（反向补偿缩放），避免节点过小、路线显得突兀；
 * 上限 1.5 倍以免相邻节点相碰。
 */
const mapNodeBoost = computed(() => Math.min(1.5, Math.max(1, 0.8 / Math.max(mapScale.value, 0.01))));
const mapCanvasStyle = computed<Record<string, string>>(() => ({
  '--map-node-boost': String(mapNodeBoost.value),
  width: `${mapSceneWidth.value}px`,
  height: `${mapSceneHeight.value}px`,
  transform: (() => {
    const { x, y } = clampMapOffset(mapOffsetX.value, mapOffsetY.value, mapScale.value);
    return `translate(${x}px, ${y}px) scale(${mapScale.value})`;
  })(),
  transformOrigin: '0 0',
}));

const clampMapScale = (value: number) => Math.max(MAP_MIN_SCALE, Math.min(MAP_MAX_SCALE, value));
const clampMapAxis = (offset: number, viewportSize: number, sceneSize: number, scale: number): number => {
  if (viewportSize <= 0 || sceneSize <= 0) return offset;
  const minOffset = viewportSize - sceneSize * scale;
  if (minOffset >= 0) return minOffset / 2;
  return Math.min(0, Math.max(minOffset, offset));
};
const clampMapOffset = (offsetX: number, offsetY: number, scale: number = mapScale.value) => ({
  x: clampMapAxis(offsetX, mapViewportWidth.value, mapSceneWidth.value, scale),
  y: clampMapAxis(offsetY, mapViewportHeight.value, mapSceneHeight.value, scale),
});
const applyMapOffset = (offsetX: number, offsetY: number, schedulePersist = false) => {
  const clamped = clampMapOffset(offsetX, offsetY);
  mapOffsetX.value = clamped.x;
  mapOffsetY.value = clamped.y;
  if (schedulePersist) schedulePersistMapViewportState();
};
const persistMapViewportState = () => {
  try {
    localStorage.setItem(
      MAP_VIEWPORT_STORAGE_KEY,
      JSON.stringify({
        scale: mapScale.value,
        offsetX: mapOffsetX.value,
        offsetY: mapOffsetY.value,
        contentWidth: mapSceneWidth.value,
        contentHeight: mapSceneHeight.value,
      }),
    );
  } catch {
    // Ignore persistence errors in restricted environments.
  }
};
const schedulePersistMapViewportState = () => {
  if (mapViewportPersistTimer !== null) clearTimeout(mapViewportPersistTimer);
  mapViewportPersistTimer = setTimeout(() => {
    persistMapViewportState();
    mapViewportPersistTimer = null;
  }, 120);
};
const persistMapModalScroll = () => {
  if (!mapModalBodyElement) return;
  try {
    localStorage.setItem(MAP_SCROLL_STORAGE_KEY, JSON.stringify({ scrollTop: mapModalBodyElement.scrollTop }));
  } catch {
    // Ignore persistence errors in restricted environments.
  }
};
const schedulePersistMapModalScroll = () => {
  if (mapScrollPersistTimer !== null) clearTimeout(mapScrollPersistTimer);
  mapScrollPersistTimer = setTimeout(() => {
    persistMapModalScroll();
    mapScrollPersistTimer = null;
  }, 120);
};
const handleMapModalBodyScroll = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  mapModalBodyElement = target;
  schedulePersistMapModalScroll();
};
const restoreMapModalScroll = () => {
  const body = document.getElementById('dungeon-map-modal-body');
  if (!(body instanceof HTMLElement)) return;
  mapModalBodyElement = body;
  try {
    const raw = localStorage.getItem(MAP_SCROLL_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { scrollTop?: unknown };
    const scrollTop = Number(parsed.scrollTop);
    if (Number.isFinite(scrollTop)) body.scrollTop = Math.max(0, scrollTop);
  } catch {
    // Ignore malformed or unavailable persistence data.
  }
};
const restoreMapViewportState = (): boolean => {
  try {
    const raw = localStorage.getItem(MAP_VIEWPORT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      scale?: unknown;
      offsetX?: unknown;
      offsetY?: unknown;
      contentWidth?: unknown;
      contentHeight?: unknown;
    };
    const scale = Number(parsed.scale);
    const offsetX = Number(parsed.offsetX);
    const offsetY = Number(parsed.offsetY);
    const contentWidth = Number(parsed.contentWidth);
    const contentHeight = Number(parsed.contentHeight);
    if (![scale, offsetX, offsetY, contentWidth, contentHeight].every(Number.isFinite)) return false;
    if (Math.abs(contentWidth - mapSceneWidth.value) > 0.5 || Math.abs(contentHeight - mapSceneHeight.value) > 0.5) {
      return false;
    }
    mapScale.value = clampMapScale(scale);
    const clamped = clampMapOffset(offsetX, offsetY, mapScale.value);
    mapOffsetX.value = clamped.x;
    mapOffsetY.value = clamped.y;
    return true;
  } catch {
    return false;
  }
};
const restoreMapViewportOrCenter = () => {
  if (!restoreMapViewportState()) centerMapOnLatestNode(true);
};
const centerMapOnLatestNode = (resetScale: boolean = false) => {
  const viewport = mapViewportRef.value;
  if (!viewport) return;
  const layoutOffsetX = (mapSceneWidth.value - mapContentWidth.value) / 2;
  const layoutOffsetY = (mapSceneHeight.value - mapContentHeight.value) / 2;
  // 楼层信息（顶部）与图例（右侧）固定在视口上：实测它们占用的范围，路线图放在剩余区域中央
  const viewportRect = viewport.getBoundingClientRect();
  const toLayout = viewportRect.width > 0 ? viewport.clientWidth / viewportRect.width : 1;
  const modalEl = viewport.parentElement;
  const cartoucheRect = modalEl?.querySelector('.map-cartouche')?.getBoundingClientRect();
  const legendRect = modalEl?.querySelector('.map-legend')?.getBoundingClientRect();
  const overlayTop = cartoucheRect
    ? Math.max(0, (cartoucheRect.bottom - viewportRect.top) * toLayout) + 16
    : Math.min(MAP_OVERLAY_TOP, viewport.clientHeight * 0.25);
  // 小屏图例在楼层信息下方、不占满整列时同样按其左缘让出
  const overlayRight = legendRect
    ? Math.max(0, (viewportRect.right - legendRect.left) * toLayout) + 24
    : Math.min(MAP_OVERLAY_SIDE, viewport.clientWidth * 0.18);
  const overlayLeft = 40;
  const availableWidth = Math.max(120, viewport.clientWidth - overlayLeft - overlayRight);
  const availableHeight = Math.max(120, viewport.clientHeight - overlayTop - 40);
  if (resetScale) {
    // 节点在缩小时会按 mapNodeBoost 放大，额外留出一圈边距
    mapScale.value = clampMapScale(Math.min(
      availableWidth / (mapContentWidth.value + 90),
      availableHeight / (mapContentHeight.value + 90),
      1.25,
    ));
  }
  const regionCenterX = overlayLeft + availableWidth / 2;
  const latest = mapNodes.value.find(node => node.isLatest);
  const shouldFocusLatest = !resetScale && (currentFloorPath.value.length > 0 || mapIsFloorTransition.value);
  const focusX = shouldFocusLatest && latest ? layoutOffsetX + latest.centerX : layoutOffsetX + mapContentWidth.value / 2;
  const focusY = shouldFocusLatest && latest
    ? layoutOffsetY + latest.centerY
    : layoutOffsetY + mapContentHeight.value / 2;
  applyMapOffset(
    regionCenterX - focusX * mapScale.value,
    overlayTop + availableHeight / 2 - focusY * mapScale.value,
    true,
  );
};
const zoomMap = (delta: number, focalX?: number, focalY?: number) => {
  const viewport = mapViewportRef.value;
  const nextScale = clampMapScale(mapScale.value + delta);
  if (nextScale === mapScale.value) return;
  if (!viewport) {
    mapScale.value = nextScale;
    return;
  }
  const centerX = Math.max(0, Math.min(viewport.clientWidth, focalX ?? viewport.clientWidth / 2));
  const centerY = Math.max(0, Math.min(viewport.clientHeight, focalY ?? viewport.clientHeight / 2));
  const worldX = (centerX - mapOffsetX.value) / mapScale.value;
  const worldY = (centerY - mapOffsetY.value) / mapScale.value;
  mapScale.value = nextScale;
  applyMapOffset(centerX - worldX * nextScale, centerY - worldY * nextScale, true);
};
const handleMapZoomIn = () => zoomMap(MAP_SCALE_STEP);
const handleMapZoomOut = () => zoomMap(-MAP_SCALE_STEP);
const handleMapResetView = () => centerMapOnLatestNode(true);
const getMapLocalPoint = (clientX: number, clientY: number) => {
  const viewport = mapViewportRef.value;
  if (!viewport) return { x: clientX, y: clientY };
  const rect = viewport.getBoundingClientRect();
  return {
    x: clientX - rect.left - viewport.clientLeft,
    y: clientY - rect.top - viewport.clientTop,
  };
};
const handleMapWheel = (event: WheelEvent) => {
  if (!mapViewportRef.value) return;
  const point = getMapLocalPoint(event.clientX, event.clientY);
  zoomMap(event.deltaY < 0 ? MAP_SCALE_STEP : -MAP_SCALE_STEP, point.x, point.y);
};
const getMapPointerPair = () => {
  const pointers = Array.from(mapActivePointers.values());
  if (pointers.length < 2) return null;
  return [pointers[0]!, pointers[1]!] as const;
};
const beginMapPinch = () => {
  const pair = getMapPointerPair();
  const viewport = mapViewportRef.value;
  if (!pair || !viewport) return;
  const [first, second] = pair;
  mapPinchStartDistance = Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1);
  mapPinchStartScale = mapScale.value;
  mapPinchStartCenter = {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
  const startPoint = getMapLocalPoint(mapPinchStartCenter.x, mapPinchStartCenter.y);
  mapPinchStartWorld = {
    x: (startPoint.x - mapOffsetX.value) / mapScale.value,
    y: (startPoint.y - mapOffsetY.value) / mapScale.value,
  };
};
const handleMapPointerDown = (event: PointerEvent) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  mapActivePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  try {
    target.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture can fail if the browser has already cancelled the pointer.
  }
  if (mapActivePointers.size >= 2) {
    mapDragPointerId.value = null;
    beginMapPinch();
    return;
  }
  mapDragPointerId.value = event.pointerId;
  mapDragStartClient.value = { x: event.clientX, y: event.clientY };
  mapDragStartOffset.value = { x: mapOffsetX.value, y: mapOffsetY.value };
};
const handleMapPointerMove = (event: PointerEvent) => {
  if (!mapActivePointers.has(event.pointerId)) return;
  mapActivePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const pair = getMapPointerPair();
  if (pair && mapPinchStartDistance > 0) {
    const viewport = mapViewportRef.value;
    if (!viewport) return;
    const [first, second] = pair;
    const currentDistance = Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1);
    const currentPoint = getMapLocalPoint((first.x + second.x) / 2, (first.y + second.y) / 2);
    mapScale.value = clampMapScale(mapPinchStartScale * (currentDistance / mapPinchStartDistance));
    applyMapOffset(
      currentPoint.x - mapPinchStartWorld.x * mapScale.value,
      currentPoint.y - mapPinchStartWorld.y * mapScale.value,
    );
    return;
  }
  if (mapDragPointerId.value !== event.pointerId) return;
  const dx = event.clientX - mapDragStartClient.value.x;
  const dy = event.clientY - mapDragStartClient.value.y;
  applyMapOffset(mapDragStartOffset.value.x + dx, mapDragStartOffset.value.y + dy);
};
const handleMapPointerUp = (event: PointerEvent) => {
  const hadPointer = mapActivePointers.delete(event.pointerId);
  if (!hadPointer && mapDragPointerId.value !== event.pointerId) return;
  const wasPinching = mapPinchStartDistance > 0;
  if (mapActivePointers.size >= 2) {
    beginMapPinch();
  } else if (mapActivePointers.size === 1 && wasPinching) {
    const [remainingId, remaining] = Array.from(mapActivePointers.entries())[0]!;
    mapPinchStartDistance = 0;
    mapDragPointerId.value = remainingId;
    mapDragStartClient.value = { x: remaining.x, y: remaining.y };
    mapDragStartOffset.value = { x: mapOffsetX.value, y: mapOffsetY.value };
  } else {
    mapPinchStartDistance = 0;
    mapDragPointerId.value = null;
  }
  schedulePersistMapViewportState();
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
  align?: 'left' | 'right';
  variant?: 'divider';
  anchor?: 'currentFloor';
}

interface StoryTucaoSection {
  type: 'special';
  key: string;
  kind: 'tucao' | 'catsay' | 'sexualScene';
  displayIndex: number;
  title: string;
  lines: StoryLineBlock[];
}

interface StoryContentState {
  nodes: Array<StoryLineBlock | StoryTucaoSection>;
  specialSections: StoryTucaoSection[];
}

const inlineMarkRegex = /(\*[^*\r\n]+\*|“[^”\r\n]+”|「[^」\r\n]+」|"[^"\r\n]+"|'[^'\r\n]+')/g;
const headerMarkRegex = /^(#{1,4})\s*(.*)$/;
const storySpecialOpenTagRegex = /<\s*(tucao|catsay|SexualScene)(?:\s+[^>]*)?>/gi;
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
      .replace(/<\s*sexualscene(?:\s+[^>]*)?>/gi, '<SexualScene>')
      .replace(/<\s*\/\s*sexualscene\s*>/gi, '</SexualScene>')
  );
}

function normalizeStorySpecialKind(tagName: string): StoryTucaoSection['kind'] {
  const normalized = tagName.toLowerCase();
  if (normalized === 'catsay') return 'catsay';
  if (normalized === 'sexualscene') return 'sexualScene';
  return 'tucao';
}

function cleanupStorySpecialContent(
  kind: StoryTucaoSection['kind'],
  rawContent: string,
): { title: string; content: string } {
  let content = rawContent
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
  let title = '';

  if (kind === 'catsay') {
    const summaryMatch = /<\s*summary(?:\s+[^>]*)?>([\s\S]*?)<\s*\/\s*summary\s*>/i.exec(content);
    title = (summaryMatch?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
    content = content
      .replace(/<\s*details(?:\s+[^>]*)?>/gi, '')
      .replace(/<\s*\/\s*details\s*>/gi, '')
      .replace(/<\s*summary(?:\s+[^>]*)?>[\s\S]*?<\s*\/\s*summary\s*>/gi, '');
  }

  if (kind === 'sexualScene' && !title) {
    title = '角色细节展示';
  }

  return {
    title,
    content: content.replace(/\n{3,}/g, '\n\n').trim(),
  };
}

function getStorySpecialTitle(section: StoryTucaoSection): string {
  if (section.title) return section.title;
  if (section.kind === 'catsay') return `😼 咪咪点评 ${section.displayIndex}`;
  if (section.kind === 'sexualScene') return `角色细节展示 ${section.displayIndex}`;
  return `🎮 此方的脑内剧场 ${section.displayIndex}`;
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
  if (line === STORY_MULTI_CURRENT_DIVIDER_MARKER) {
    return {
      type: 'line',
      key,
      level: 0,
      segments: [],
      variant: 'divider',
      anchor: 'currentFloor',
    };
  }

  if (line === STORY_MULTI_DIVIDER_MARKER) {
    return {
      type: 'line',
      key,
      level: 0,
      segments: [],
      variant: 'divider',
    };
  }

  if (line.startsWith(STORY_MULTI_USER_LINE_MARKER)) {
    const content = line.slice(STORY_MULTI_USER_LINE_MARKER.length);
    return {
      type: 'line',
      key,
      level: 0,
      segments: parseInlineSegments(content, key),
      align: 'right',
    };
  }

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
  const nodes: Array<StoryLineBlock | StoryTucaoSection> = [];
  const specialSections: StoryTucaoSection[] = [];
  let cursor = 0;
  let sectionIndex = 0;
  let openMatch: RegExpExecArray | null;

  storySpecialOpenTagRegex.lastIndex = 0;
  while ((openMatch = storySpecialOpenTagRegex.exec(normalized)) !== null) {
    const kind = normalizeStorySpecialKind(openMatch[1] ?? 'tucao');
    const closeTagName = kind === 'sexualScene' ? 'SexualScene' : kind;
    const closeTagRegex = new RegExp(`<\\s*\\/\\s*${closeTagName}\\s*>`, 'i');
    const openStart = openMatch.index;
    const openEnd = storySpecialOpenTagRegex.lastIndex;

    const plainPart = normalized.slice(cursor, openStart);
    nodes.push(...parseTextLines(plainPart, `story-${sectionIndex}-plain-${cursor}`));

    const closeMatch = closeTagRegex.exec(normalized.slice(openEnd));
    const closeStart = closeMatch ? openEnd + closeMatch.index : -1;
    const contentEnd = closeMatch ? closeMatch.index : normalized.length;
    const nextCursor = closeMatch ? closeStart + closeMatch[0].length : normalized.length;

    const rawContent = normalized.slice(openEnd, closeMatch ? closeStart : contentEnd).replace(/^\n+/, '').replace(/\n+$/, '');
    const { title, content } = cleanupStorySpecialContent(kind, rawContent);
    const tucaoKey = `story-${kind}-${sectionIndex}-${openStart}`;
    const parsedTucaoLines = parseTextLines(content, tucaoKey);
    if (parsedTucaoLines.length > 0) {
      const section: StoryTucaoSection = {
        type: 'special',
        key: tucaoKey,
        kind,
        displayIndex: specialSections.length + 1,
        title,
        lines: parsedTucaoLines,
      };
      nodes.push(section);
      specialSections.push(section);
    }

    cursor = nextCursor;
    storySpecialOpenTagRegex.lastIndex = cursor;
    sectionIndex += 1;

    // Missing closing tag: consume to end once.
    if (!closeMatch) {
      break;
    }
  }

  const tail = normalized.slice(cursor);
  nodes.push(...parseTextLines(tail, `story-tail-${cursor}`));

  return {
    nodes,
    specialSections,
  };
}

const storyContentState = computed<StoryContentState>(() => parseStoryContent(displayText.value));
const storyContentNodes = computed<Array<StoryLineBlock | StoryTucaoSection>>(() => storyContentState.value.nodes);
const storySpecialSections = computed<StoryTucaoSection[]>(() => storyContentState.value.specialSections);

watch(
  storySpecialSections,
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
const adjustBaseMaxHpForCustomDifficulty = (baseMaxHp: number) => {
  if (isCustomDifficultyInfluenceActive('体柔身轻')) return Math.max(1, Math.floor(baseMaxHp / 2));
  if (isCustomDifficultyInfluenceActive('肉装魔女')) return Math.max(1, baseMaxHp * 2);
  return baseMaxHp;
};
const displayMaxHp = computed(() => {
  const baseMaxHp = toNonNegativeInt(gameStore.statData._血量上限, 10);
  const adjustedBaseMaxHp = adjustBaseMaxHpForCustomDifficulty(baseMaxHp);
  return Math.max(1, adjustedBaseMaxHp + bloodpoolPassiveMaxHpBonus.value);
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
  }, isCustomDifficultyInfluenceActive('家族传承') ? 2 : 0),
);
const relicMaxDiceBonus = computed(() =>
  RELIC_DICE_RANGE_BONUS_CONFIG.max.reduce((sum, item) => {
    return sum + getOwnedRelicCountById(item.id) * item.bonus;
  }, isCustomDifficultyInfluenceActive('家族传承') ? 2 : 0),
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
const parseStigmataNegativeStatus = (status: string): number => {
  const match = status.trim().match(/^\[(\d+)圣痕\]$/);
  if (!match) return 0;
  return Math.max(0, Math.floor(Number(match[1] ?? 0)));
};
const formatStigmataNegativeStatus = (stacks: number): string => `[${Math.max(0, Math.floor(stacks))}圣痕]`;
const getStigmataNegativeStatusStacks = (statuses: string[]): number =>
  statuses.reduce((max, status) => Math.max(max, parseStigmataNegativeStatus(status)), 0);
const combatInitialPlayerEffects = computed(() => {
  const effects: EffectInstance[] = [{ type: EffectType.MANA_SPRING, stacks: 1, polarity: 'buff' }];
  const stigmataStacks = getStigmataNegativeStatusStacks(normalizeNegativeStatusList(gameStore.statData.$负面状态));
  if (stigmataStacks > 0) {
    effects.push({ type: EffectType.STIGMATA, stacks: stigmataStacks, polarity: 'special' });
  }
  return effects;
});
const negativeStatusEntries = computed(() =>
  normalizeNegativeStatusList(gameStore.statData.$负面状态).map((name: string) => {
    const stigmataStacks = parseStigmataNegativeStatus(name);
    return {
      name,
      description: stigmataStacks > 0
        ? `每场战斗开始时，你获得${stigmataStacks}层圣痕。`
        : describeNegativeStatus(name) ??
          '如果你看到了这串字，且你没有动变量，那么说明你遇到bug了，请反馈给作者。',
    };
  }),
);
const idolDiceMin = computed(() => Math.max(1, toNonNegativeInt(effectiveDisplayMinDice.value, 1)));
const idolDiceMax = computed(() => Math.max(idolDiceMin.value, toNonNegativeInt(effectiveDisplayMaxDice.value, 6)));

/** 属性宝石图标（图床：地牢/素材库/通用UI/属性图标），状态块与后续详细状态栏共用 */
const STAT_ICON_BASE = toResolveUrl('地牢/素材库/通用UI/属性图标');
const STAT_ICON_URLS = {
  hp: `${STAT_ICON_BASE}/${encodeURIComponent('生命')}.webp`,
  mp: `${STAT_ICON_BASE}/${encodeURIComponent('法力')}.webp`,
  gold: `${STAT_ICON_BASE}/${encodeURIComponent('金币')}.webp`,
  dice: `${STAT_ICON_BASE}/${encodeURIComponent('骰子')}.webp`,
  armor: `${STAT_ICON_BASE}/${encodeURIComponent('护甲')}.webp`,
  curse: `${STAT_ICON_BASE}/${encodeURIComponent('负面状态')}.webp`,
} as const;
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
const getIdolDiceValue = (diceIndex: 0 | 1): number => (diceIndex === 0 ? idolDiceValue.value : idolDiceTwoValue.value);
const getIdolAssignedTarget = (diceIndex: 0 | 1): IdolSlotTarget | null =>
  diceIndex === 0 ? idolAssignedTarget.value : idolDiceTwoAssignedTarget.value;
const getIdolPreviewTarget = (diceIndex: 0 | 1): IdolSlotTarget | null =>
  diceIndex === 0 ? idolSnapPreviewTarget.value : idolDiceTwoSnapPreviewTarget.value;
const setIdolAssignedTarget = (diceIndex: 0 | 1, target: IdolSlotTarget | null) => {
  if (diceIndex === 0) {
    idolAssignedTarget.value = target;
  } else {
    idolDiceTwoAssignedTarget.value = target;
  }
};
const setIdolPreviewTarget = (diceIndex: 0 | 1, target: IdolSlotTarget | null) => {
  if (diceIndex === 0) {
    idolSnapPreviewTarget.value = target;
  } else {
    idolDiceTwoSnapPreviewTarget.value = target;
  }
};
const idolSlotAssetUrl = (target: IdolSlotTarget): string => IDOL_SLOT_ASSET_URLS[target];
const idolSlotIsPreview = (target: IdolSlotTarget): boolean =>
  idolSnapPreviewTarget.value === target || idolDiceTwoSnapPreviewTarget.value === target;
const idolSlotIsSelected = (target: IdolSlotTarget): boolean =>
  idolAssignedTarget.value === target || idolDiceTwoAssignedTarget.value === target;

const idolRewardEntries = computed(() => {
  const entries: Array<{
    diceIndex: 0 | 1;
    dice: number;
    target: IdolSlotTarget;
    statueName: string;
    amount: number;
    rewardText: string;
  }> = [];
  const assignments: Array<[0 | 1, IdolSlotTarget | null]> = [
    [0, idolAssignedTarget.value],
    [1, idolVariant.value === 'black' ? idolDiceTwoAssignedTarget.value : null],
  ];
  for (const [diceIndex, target] of assignments) {
    if (!target) continue;
    const dice = getIdolDiceValue(diceIndex);
    const config = IDOL_BLESSING_CONFIG[target];
    const amount =
      target === 'gold'
        ? dice * 2
        : target === 'maxHp'
          ? Math.floor(dice * 1.5)
          : target === 'mp'
            ? dice
            : target === 'blackGold'
              ? dice * 3
              : target === 'blackMp'
                ? idolDiceMax.value
                : 1;
    entries.push({
      diceIndex,
      dice,
      target,
      statueName: config.statueName,
      amount,
      rewardText: config.rewardText(dice),
    });
  }
  return entries;
});
const idolRewardSummary = computed(() => idolRewardEntries.value[0] ?? null);
const idolHasAssignedDice = computed(() => idolRewardEntries.value.length > 0);

const idolDiceIndexes = computed<Array<0 | 1>>(() => (idolVariant.value === 'black' ? [0, 1] : [0]));
/** 三个槽位从左到右，与背景中三座神像一一对应 */
const idolSlotColumns = computed<Array<{ target: IdolSlotTarget; hint: string }>>(() =>
  idolVariant.value === 'black'
    ? [
        { target: 'blackMp', hint: `献祭骰子点数生命：初始魔力+当前最大点数（${idolDiceMax.value}）` },
        { target: 'blackDice', hint: '献祭骰子点数生命上限：最小与最大点数各+1' },
        { target: 'blackGold', hint: '献祭骰子点数生命：金币+3倍骰子点数' },
      ]
    : [
        { target: 'maxHp', hint: '生命上限 +1.5倍骰子点数' },
        { target: 'mp', hint: '初始魔量 +骰子点数' },
        { target: 'gold', hint: '金币 +2倍骰子点数' },
      ],
);
/** 神像焦点（背景 16:9 坐标，百分比）与光色 */
const IDOL_STATUE_SPOTS: Record<IdolVariant, Array<{ x: number; y: number; tint: string }>> = {
  white: [
    { x: 20.5, y: 30, tint: '255, 214, 196' },
    { x: 50, y: 24, tint: '196, 222, 255' },
    { x: 80, y: 31, tint: '255, 224, 150' },
  ],
  black: [
    { x: 15, y: 33, tint: '170, 120, 255' },
    { x: 50, y: 23, tint: '230, 60, 80' },
    { x: 85, y: 33, tint: '255, 190, 90' },
  ],
};
const idolStatueSpots = computed(() =>
  IDOL_STATUE_SPOTS[idolVariant.value].map(spot => ({
    '--x': String(spot.x),
    '--y': String(spot.y),
    '--tint': spot.tint,
  })),
);
const idolActiveColumns = computed(() => {
  const targets = idolSlotColumns.value.map(slot => slot.target);
  return idolRewardEntries.value.map(entry => targets.indexOf(entry.target)).filter(index => index >= 0);
});
const toHtmlElement = (el: unknown): HTMLElement | null => (el instanceof HTMLElement ? el : null);
const setIdolSlotElement = (target: IdolSlotTarget, el: unknown) => {
  const element = toHtmlElement(el);
  if (target === 'maxHp' || target === 'blackDice') idolSlotMaxHpRef.value = element;
  else if (target === 'mp' || target === 'blackMp') idolSlotMpRef.value = element;
  else idolSlotGoldRef.value = element;
};
const setIdolDiceElement = (diceIndex: 0 | 1, el: unknown) => {
  if (diceIndex === 0) idolDiceRef.value = toHtmlElement(el);
  else idolDiceTwoRef.value = toHtmlElement(el);
};

// ── Actions ──
const isInFinalArea = computed(() => ((gameStore.statData._当前区域 as string) || '').trim() === FINAL_AREA_NAME);

const handleSendInput = () => {
  if (!inputText.value.trim() || gameStore.isGenerating) return;
  if (isInFinalArea.value && gameStore.hasRebirth) {
    triggerRebirthAction({ consumeInput: false });
    inputText.value = '';
    return;
  }
  gameStore.sendAction(inputText.value);
  inputText.value = '';
};

const consumeMapRebirthInputAppend = (): string => {
  if (!isMapRebirthInputAppendEnabled.value) return '';
  const text = inputText.value.trim();
  if (!text) return '';
  inputText.value = '';
  return text;
};

const appendInputToMapRebirthAction = (actionText: string): string => {
  const extraText = consumeMapRebirthInputAppend();
  return extraText ? `${actionText}\n${extraText}` : actionText;
};

const getOptionMarker = (index: number): string => String.fromCharCode(65 + index);
const getOptionDisplayText = (option: string): string => option.replace(/^[A-D]\.\s*/i, '').trim();

const handleOptionClick = (option: string) => {
  if (gameStore.isGenerating) return;
  const stripped = getOptionDisplayText(option);
  if (!stripped) return;

  if (optionActionMode.value === 'send') {
    inputText.value = stripped;
    handleSendInput();
    return;
  }

  if (optionActionMode.value === 'append') {
    const existing = inputText.value.trim();
    inputText.value = existing ? `${existing}\n${stripped}` : stripped;
    return;
  }

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
const HOT_SPRING_CLEANSE_ACTION_TEXT_PREFIX = '<user>浸泡在暖泉中，污秽正悄然消融。';
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
  const retainedNegativeStatuses = getRebirthRetainedNegativeStatuses(currentNegativeStatuses);
  if (currentNegativeStatuses.includes('[蛾翼印记]') && !retainedNegativeStatuses.includes('[灵魂受损]')) {
    retainedNegativeStatuses.push('[灵魂受损]');
  }
  return {
    _血量: initialMaxHp,
    _血量上限: initialMaxHp,
    $魔量: initialMp,
    _金币: initialGold,
    $技能点: currentSkillPoints + rebirthSkillPointGain,
    _技能: [...REBIRTH_STARTER_DECK],
    _附魔: Array.from({ length: 9 }, () => ''),
    $负面状态: retainedNegativeStatuses,
    $事件操作: { ...EMPTY_EVENT_ACTION_STATE },
    $事件结算通知: [],
    $战斗修正: [],
    $延迟奖励: [],
    $临时替换: [],
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
    判定结果: '',
    $已触发事件: [],
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
    },
    $路径: [],
    $地图: [],
  };
};

const resetTransientUiState = () => {
  activeModal.value = null;
  playerDetailTab.value = 'status';
  playerDetailInventoryTab.value = 'items';
  isVariableUpdateOpen.value = false;
  showCombat.value = false;
  showVictoryRewardView.value = false;
  showMimicRelicDropView.value = false;
  mimicRelicDropRelic.value = null;
  mimicRelicDropApplying.value = false;
  closeShopView();
  closeChestView();
  closeIdolView();
  idolRoomMapExitReady.value = false;
  pendingCombatNarrative.value = null;
  eventSettlementSession.value = null;
  activeMinigame.value = null;
  activeEventBattle.value = null;
  showHotSpringChoice.value = false;
  hideRelicTooltip();
  closeBondPortraitPreview();
  closeSettingsHelp();
  clearHotSpringCleanseTimer();
  hotSpringCleanseMessage.value = null;
  requestAnimationFrame(() => updateViewportMetrics());
};

const triggerRebirthAction = (options: { consumeInput?: boolean } = {}) => {
  if (gameStore.isGenerating) return;
  const shouldConsumeInput = options.consumeInput !== false;
  resetTransientUiState();
  gameStore.setPendingCombatMvuChanges(null);
  gameStore.setPendingStatDataChanges(buildRebirthResetFields());
  const actionText = '<user>在死亡边缘触发了回溯，回到了魔女的小窝。当前状态已重置为初始值，请基于回溯后的状态继续剧情。';
  gameStore.sendAction(shouldConsumeInput ? appendInputToMapRebirthAction(actionText) : actionText);
};

const handleRebirthClick = () => {
  triggerRebirthAction();
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

  if (target === 'special' && !resolveCurrentRoomSpecialOptionConfig(true)) {
    closeOptionCompletionMenu();
    toastr.warning('当前房间没有可补全的特殊选项。');
    return;
  }

  const wasVisible = isButtonCompletionTargetVisible(target);
  if (target === 'special') {
    consumedSpecialRoomFingerprint.value = '';
  }
  gameStore.showManualButtonCompletion(target);

  if (target === 'leave') {
    await nextTick();
    if (!mapSelectionAvailable.value) {
      gameStore.hideManualButtonCompletion('leave');
      closeOptionCompletionMenu();
      toastr.warning('当前状态没有可选择的地图节点。');
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
        ? '已补全地图选择按钮。'
        : '已补全重生按钮。';
  toastr.success(successText);
};

// ── Room type config for E option ──
interface RoomConfig {
  label: string;
  skin: InstanceType<typeof MainButtonSkin>['$props']['skin'];
}

const ROOM_TYPE_CONFIG: Record<string, RoomConfig> = {
  宝箱房: {
    label: '打开宝箱',
    skin: 'menuChest',
  },
  战斗房: {
    label: '战斗',
    skin: 'menuBattle',
  },
  领主房: {
    label: '战斗',
    skin: 'menuBattle',
  },
  商店房: {
    label: '购买物品',
    skin: 'menuShop',
  },
  温泉房: {
    label: '治疗与净化',
    skin: 'menuCleanse',
  },
  神像房: {
    label: '祭拜神像',
    skin: 'menuIdol',
  },
};

const consumedSpecialRoomFingerprint = ref('');

const currentSpecialRoomFingerprint = computed(() => {
  const sd = gameStore.statData as Record<string, any>;
  const stats = sd.$统计 && typeof sd.$统计 === 'object' ? (sd.$统计 as Record<string, any>) : {};
  const path = currentFloorPath.value.map(item => `${item.x}:${item.房间类型}`).join('>');
  return [
    String(sd._当前区域 ?? '').trim(),
    String(sd._当前房间类型 ?? '').trim(),
    String(stats.当前层已过房间 ?? ''),
    String(sd._楼层数 ?? '').trim(),
    String(sd._对手名称 ?? '').trim(),
    path,
  ].join('|');
});

const isCurrentSpecialConsumed = computed(
  () =>
    Boolean(consumedSpecialRoomFingerprint.value) &&
    consumedSpecialRoomFingerprint.value === currentSpecialRoomFingerprint.value,
);

const markCurrentSpecialConsumed = () => {
  consumedSpecialRoomFingerprint.value = currentSpecialRoomFingerprint.value;
  gameStore.hideManualButtonCompletion('special');
};

const restoreCurrentSpecialOption = () => {
  consumedSpecialRoomFingerprint.value = '';
  if (!gameStore.hasOptionE && currentRoomSpecialOptionConfig.value) {
    gameStore.showManualButtonCompletion('special');
  }
};

const resolveCurrentRoomSpecialOptionConfig = (ignoreConsumed = false): RoomConfig | null => {
  if (isShopContext.value) return ROOM_TYPE_CONFIG['商店房'];
  if (!ignoreConsumed && isCurrentSpecialConsumed.value) return null;
  if (isTreasureRoomContext.value) return ROOM_TYPE_CONFIG['宝箱房'];
  const roomType = gameStore.statData._当前房间类型 as string;
  if (!roomType) return null;
  return ROOM_TYPE_CONFIG[roomType] ?? null;
};

const currentRoomSpecialOptionConfig = computed<RoomConfig | null>(() => resolveCurrentRoomSpecialOptionConfig());

// E option: 事件房 has no special action button (free action, LLM judges the ending).
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
    disabled: false,
  },
  {
    key: 'leave',
    label: '地图选择',
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

const TURN_LOG_MARKER_RE = /^——第\d+回合——$/;
const COMBAT_LOG_TURN_LIMIT = 40;

const formatCombatLogs = (logs: string[]) => {
  const ordered = [...logs]
    .reverse()
    .map(sanitizeCombatLogLine)
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith('掷骰结果：'))
    .filter(line => !line.includes('原始点数'));
  const turnMarkerIndexes = ordered
    .map((line, index) => (TURN_LOG_MARKER_RE.test(line) ? index : -1))
    .filter(index => index >= 0);
  const recentStartIndex = turnMarkerIndexes.length > COMBAT_LOG_TURN_LIMIT
    ? turnMarkerIndexes[turnMarkerIndexes.length - COMBAT_LOG_TURN_LIMIT] ?? 0
    : 0;
  const recent = ordered.slice(recentStartIndex);
  if (recent.length === 0) return '（战斗日志为空）';
  return recent.join('\n');
};

const buildCombatNarrative = (outcome: CombatOutcome, enemyName: string, context: CombatContext, logs: string[]) => {
  const outcomeLine =
    outcome === 'win'
      ? `战斗结果：[胜利]，战胜了${enemyName}。`
      : outcome === 'lose'
        ? `战斗结果：[败北]，被${enemyName}击败。`
        : '战斗结果：[脱离]，一方逃离战斗。';
  const eventBattle = context === 'event' ? activeEventBattle.value : null;
  const contextLine =
    context === 'shopRobbery'
      ? '本次战斗发生在抢夺商店的冲突中。'
      : context === 'chestMimic'
        ? '本次战斗发生在宝箱怪伏击中。'
        : context === 'combatTest'
          ? '本次战斗来自战斗测试。'
          : eventBattle
            ? `本次战斗发生在事件【${eventBattle.eventName}】中。${
                eventBattle.noPenalty
                  ? '这是一场梦中之战：梦中的败北不会带入现实，若败北，醒来后身体毫发无伤。'
                  : eventBattle.lord
                    ? '对手离开了自己的领地，缺乏主场魔力的加持。'
                    : ''
              }`
            : '本次战斗发生在地牢探索途中。';
  const followupLine =
    outcome === 'win'
      ? `请根据以下最近${COMBAT_LOG_TURN_LIMIT}个回合的完整战斗日志继续剧情，并体现胜利后的后续发展。`
      : outcome === 'lose'
        ? `请根据以下最近${COMBAT_LOG_TURN_LIMIT}个回合的完整战斗日志继续剧情，并体现战败后的后续发展。`
        : `请根据以下最近${COMBAT_LOG_TURN_LIMIT}个回合的完整战斗日志继续剧情，并体现脱离战斗后的后续发展。`;
  const writingInstruction = '写作要求：请先根据上述日志描写战斗中的关键场面、攻防变化与最终收束，再自然过渡到战斗结束后的状态；不要跳过战斗过程直接从战斗后的场景开始写。';
  return `${outcomeLine}\n${contextLine}\n${followupLine}\n最近${COMBAT_LOG_TURN_LIMIT}个回合战斗日志（时间顺序，仅保留最终点数）：\n${formatCombatLogs(logs)}\n${writingInstruction}`;
};

const isFastModeSyncRoomType = (roomType: string): boolean =>
  roomType === '商店房' ||
  roomType === '领主房' ||
  roomType === '事件房' ||
  roomType === FINAL_AREA_NAME;

const submitGameAction = async (text: string, targetRoomType: string, type = 'action') => {
  if (!gameStore.fastModeEnabled) {
    await gameStore.sendAction(text);
    return;
  }

  const queued = await gameStore.queueFastAction({ type, text });
  if (!queued) {
    await gameStore.sendAction(text);
    return;
  }

  if (isFastModeSyncRoomType(targetRoomType)) {
    await gameStore.flushFastActions();
  }
};

const sendCombatNarrativeOnce = (
  narrative: { id: string; context?: CombatContext; outcome?: CombatOutcome },
  text: string,
) => {
  if (dispatchedCombatNarrativeIds.has(narrative.id)) return;
  if (gameStore.isGenerating) return;
  dispatchedCombatNarrativeIds.add(narrative.id);
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  if (gameStore.fastModeEnabled && narrative.context !== 'combatTest') {
    if (narrative.outcome === 'lose' || isFastModeSyncRoomType(roomType)) {
      void gameStore.flushFastActions(text);
      return;
    }
    void gameStore.queueFastAction({ type: 'battle', text });
    markCurrentSpecialConsumed();
    return;
  }
  gameStore.sendAction(text);
};

const queueCombatMvuSync = (
  outcome: CombatOutcome,
  finalStats: unknown,
  negativeEffects: string[],
  negativeStatusesRemove: string[] = [],
  extraGoldDelta: number = 0,
  options: { noPenalty?: boolean; preBattleHp?: number } = {},
) => {
  const win = outcome === 'win';
  // 梦中之战（共梦）：败北不带入现实——不加 [败北]、不留下战斗中的负面状态，生命回到战前
  const dreamDefeat = outcome === 'lose' && options.noPenalty === true;
  const lose = outcome === 'lose' && !dreamDefeat;
  const effectiveNegativeEffects = dreamDefeat ? [] : negativeEffects;
  const hpRaw = Number(dreamDefeat ? options.preBattleHp : (finalStats as { hp?: unknown } | null | undefined)?.hp);
  const hasHp = Number.isFinite(hpRaw);
  const finalMaxHpRaw = Number((finalStats as { maxHp?: unknown } | null | undefined)?.maxHp);
  const hasFinalMaxHp = Number.isFinite(finalMaxHpRaw);
  const floorRaw = Number(gameStore.statData._楼层数 ?? 1);
  const floor = Number.isFinite(floorRaw) ? Math.max(1, Math.floor(floorRaw)) : 1;
  const baseGoldReward = 2 + Math.floor(floor / 4) + getOwnedRelicCountById('system_wealth_relic_10')
    + getOwnedRelicCountById(EVENT_RELIC_ID.AUCTION_TAG) * AUCTION_TAG_GOLD_PER_WIN;
  // 发情季等战斗修正：金币倍率
  const goldReward = Math.floor(baseGoldReward * Math.max(0, combatBattleModifiers.value.goldMultiplier));
  const bloodPoolCount = getOwnedRelicCountById('bloodpool_blood_pool');
  const stomachMarkCount = getOwnedRelicCountById('bloodpool_stomach_mark');
  const baseMaxHp = toNonNegativeInt(gameStore.statData._血量上限, 10);
  const stomachBonus = Math.max(0, stomachMarkCount);
  const passiveMaxHpBonus = bloodpoolPassiveMaxHpBonus.value;
  const normalizedNegativeEffects = effectiveNegativeEffects
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  const normalizedNegativeStatusesRemove = (dreamDefeat ? [] : negativeStatusesRemove)
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

  if (win && nextHp !== undefined && isCustomDifficultyInfluenceActive('自愈体质')) {
    nextHp = Math.max(1, adjustBaseMaxHpForCustomDifficulty(baseMaxHp + stomachBonus) + passiveMaxHpBonus);
  }

  if (stomachBonus > 0) {
    gameStore.mergePendingStatDataChanges({
      _血量上限: Math.max(1, baseMaxHp + stomachBonus),
    });
  }

  gameStore.setPendingCombatMvuChanges({
    hp: nextHp,
    addDefeatMark: lose,
    // 战斗中的金币变化（获得与消耗）均计入，负值表示战斗中花掉的金币
    goldDelta: win
      ? goldReward + Math.floor(extraGoldDelta)
      : Math.floor(extraGoldDelta) !== 0
        ? Math.floor(extraGoldDelta)
        : undefined,
    negativeStatusesAdd: normalizedNegativeEffects,
    negativeStatusesRemove: normalizedNegativeStatusesRemove,
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
  // 事件战斗：漫游的领主按领主战奖励，其余按普通战斗奖励
  const eventBattle = activeEventBattle.value;
  const isLordRoom = roomType === '领主房' || eventBattle?.lord === true;
  const isNormalEnemy = roomType === '战斗房' || (eventBattle !== null && !eventBattle.lord);
  rewardIsNormalEnemy.value = isNormalEnemy;

  const hasRainbowCard = isNormalEnemy && getOwnedRelicCountById('base_rainbow_card') > 0;
  const hasGoldenCard = isNormalEnemy && getOwnedRelicCountById('base_golden_card') > 0;
  const optionCount = 3 + (hasRainbowCard ? 1 : 0);
  const rareChance = isLordRoom ? 1 : hasGoldenCard ? 0.05 : 0.02;

  const normalPool = pool.filter(item => item.rarity === '普通');
  const rarePool = pool.filter(item => item.rarity === '稀有');
  const options: VictoryRewardItem[] = [];
  const usedIds = new Set<string>();

  // 七原罪的隐藏卡池：领主战每个奖励槽有概率变为携带体系对应、且尚未拥有的原罪卡
  const ownedSkillNames = Array.isArray(gameStore.statData._技能) ? (gameStore.statData._技能 as string[]) : [];
  const sinCandidates = isLordRoom ? getSinRewardCandidates(carriedMagicBooks.value, ownedSkillNames) : [];

  for (let i = 0; i < optionCount; i++) {
    if (sinCandidates.length > 0 && Math.random() < SIN_REWARD_SLOT_CHANCE) {
      const sinPick = pickUniqueRewardItem(sinCandidates, usedIds);
      if (sinPick) {
        options.push(sinPick);
        usedIds.add(sinPick.id);
        continue;
      }
    }
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

/** 本次战斗胜利还可领取的卡牌奖励次数（棋盘卡牌：普通战斗可领取两次） */
const victoryRewardClaimsRemaining = ref(1);

/** 领取一次奖励后：若还有剩余次数则重新生成奖励，否则结束奖励流程 */
const completeVictoryRewardClaim = (field: '_技能' | '$主动', nextValue: string[]) => {
  if (victoryRewardClaimsRemaining.value > 1) {
    victoryRewardClaimsRemaining.value -= 1;
    // 同步到本地，确保第二次领取基于第一次领取后的卡组
    gameStore.statData[field] = [...nextValue];
    const options = buildVictoryRewardOptions();
    if (options.length > 0) {
      rewardRefreshUsedCount.value = 0;
      victoryRewardOptions.value = options;
      selectedVictoryRewardCard.value = null;
      victoryRewardStage.value = 'pick';
      rewardApplying.value = false;
      showGameFeedback('棋盘卡牌：可以再领取一次卡牌奖励。');
      return;
    }
  }
  victoryRewardClaimsRemaining.value = 1;
  finalizeVictoryRewardFlow();
};

const startVictoryRewardFlow = () => {
  const options = buildVictoryRewardOptions();

  if (options.length === 0) return false;
  victoryRewardClaimsRemaining.value = rewardIsNormalEnemy.value && getOwnedRelicCountById(PORTED_RELIC_ID.CHECKERBOARD_CARD) > 0 ? 2 : 1;
  rewardRefreshUsedCount.value = 0;
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
  rewardRefreshUsedCount.value += 1;
  victoryRewardOptions.value = options;
  selectedVictoryRewardCard.value = null;
  victoryRewardStage.value = 'pick';
};

const finalizeVictoryRewardFlow = () => {
  // 在战斗结束的转场中被调用时直接执行；单独从奖励界面返回时播放转场
  void runSceneTransition(() => {
    showVictoryRewardView.value = false;
    victoryRewardStage.value = 'pick';
    victoryRewardOptions.value = [];
    selectedVictoryRewardCard.value = null;
    rewardApplying.value = false;
    rewardRefreshUsedCount.value = 0;
    rewardIsNormalEnemy.value = false;
    activeEventBattle.value = null;
    const narrative = pendingCombatNarrative.value;
    if (!narrative) return;
    if (narrative.context === 'shopRobbery') return;
    pendingCombatNarrative.value = null;
    sendCombatNarrativeOnce(narrative, narrative.text);
  });
};

const continuePostCombatRewardFlow = () => {
  const hasRewardOptions = startVictoryRewardFlow();
  if (!hasRewardOptions) {
    finalizeVictoryRewardFlow();
  }
};

const exitVictoryRewardFlow = () => {
  finalizeVictoryRewardFlow();
};

const pickVictoryRewardCard = (card: VictoryRewardItem) => {
  selectedVictoryRewardCard.value = card;
  victoryRewardStage.value = isActiveSkillReward(card) ? 'replaceActive' : 'replaceDeck';
};

const returnToVictoryRewardPick = () => {
  if (rewardApplying.value) return;
  selectedVictoryRewardCard.value = null;
  victoryRewardStage.value = 'pick';
};

const ALCHEMY_BASE_POTION_TO_ENHANCED: Record<string, string> = {
  剧毒药剂: '增效剧毒药剂',
  撕裂药剂: '增效撕裂药剂',
  燃烧药剂: '增效燃烧药剂',
  冰霜药剂: '增效冰霜药剂',
  雷霆药剂: '增效雷霆药剂',
  回复药剂: '增效回复药剂',
};
const ALCHEMY_BASE_POTION_NAMES = new Set(Object.keys(ALCHEMY_BASE_POTION_TO_ENHANCED));
const ALCHEMY_EMPOWER_POTION_NAME = '增效药剂';
const ALCHEMY_WASTE_NAME = '炼金废料';
const ALCHEMY_MIXED_POTION_NAME = '混合药剂';
const ALCHEMY_ENHANCED_MIXED_POTION_NAME = '增效混合药剂';

const resolveAlchemyFusionName = (rewardCard: CardData, deckCard: CardData | null): string | null => {
  if (!deckCard) return null;
  const rewardName = rewardCard.name;
  const deckName = deckCard.name;
  const rewardIsBasePotion = ALCHEMY_BASE_POTION_NAMES.has(rewardName);
  const deckIsBasePotion = ALCHEMY_BASE_POTION_NAMES.has(deckName);
  const rewardIsEmpower = rewardName === ALCHEMY_EMPOWER_POTION_NAME;
  const deckIsEmpower = deckName === ALCHEMY_EMPOWER_POTION_NAME;

  if (rewardIsEmpower && deckIsEmpower) return '催化剂';
  if (rewardIsEmpower && (deckName === ALCHEMY_WASTE_NAME || deckName === ALCHEMY_MIXED_POTION_NAME))
    return ALCHEMY_ENHANCED_MIXED_POTION_NAME;
  if (deckIsEmpower && (rewardName === ALCHEMY_WASTE_NAME || rewardName === ALCHEMY_MIXED_POTION_NAME))
    return ALCHEMY_ENHANCED_MIXED_POTION_NAME;
  if (rewardIsEmpower && deckIsBasePotion) return ALCHEMY_BASE_POTION_TO_ENHANCED[deckName] ?? null;
  if (deckIsEmpower && rewardIsBasePotion) return ALCHEMY_BASE_POTION_TO_ENHANCED[rewardName] ?? null;
  if (rewardIsBasePotion && deckIsBasePotion) {
    if (rewardName === deckName) return ALCHEMY_BASE_POTION_TO_ENHANCED[rewardName] ?? null;
    return ALCHEMY_MIXED_POTION_NAME;
  }
  return null;
};

const getRewardDeckFusionName = (entry: { card: CardData | null }): string | null => {
  const selected = selectedVictoryRewardCard.value;
  if (!selected || isActiveSkillReward(selected)) return null;
  return resolveAlchemyFusionName(selected, entry.card);
};

const triggerRewardDeckShake = (idx: number) => {
  rewardDeckShakeIdx.value = null;
  requestAnimationFrame(() => {
    rewardDeckShakeIdx.value = idx;
    setTimeout(() => {
      if (rewardDeckShakeIdx.value === idx) rewardDeckShakeIdx.value = null;
    }, 420);
  });
};

const replaceDeckCardWithReward = (idx: number) => {
  if (!selectedVictoryRewardCard.value || rewardApplying.value || isActiveSkillReward(selectedVictoryRewardCard.value))
    return;
  const raw = Array.isArray(gameStore.statData._技能) ? [...(gameStore.statData._技能 as string[])].slice(0, 9) : [];
  const currentName = idx >= 0 && idx < raw.length ? raw[idx] : '';
  const currentCard = currentName
    ? (cardByNameForTest.value.get(currentName) ?? getCardByName(currentName) ?? null)
    : null;
  const fusionName = resolveAlchemyFusionName(selectedVictoryRewardCard.value, currentCard);
  if (raw.length === 0) {
    raw.push(selectedVictoryRewardCard.value.name);
  } else if (idx >= 0 && idx < raw.length) {
    if (fusionName) {
      raw[idx] = fusionName;
    } else if (currentCard?.type === CardType.CURSE) {
      triggerRewardDeckShake(idx);
      toastr.warning('诅咒牌无法被奖励牌替换。');
      return;
    } else {
      raw[idx] = selectedVictoryRewardCard.value.name;
    }
  } else {
    return;
  }
  rewardApplying.value = true;
  gameStore.mergePendingStatDataChanges({ _技能: raw });
  completeVictoryRewardClaim('_技能', raw);
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
  completeVictoryRewardClaim('$主动', raw);
};

const getRarityBasePrice = (rarity: RelicData['rarity']) => {
  if (rarity === '传奇') return 15;
  if (rarity === '稀有') return 10;
  return 5;
};

const formatRarityLabel = (rarity: RelicData['rarity']) => (rarity === '传奇' ? '传说' : rarity);

const rollShopRarity = (): RelicData['rarity'] => {
  const r = Math.random();
  if (r < 0.7) return '普通';
  if (r < 0.92) return '稀有';
  return '传奇';
};

const generateShopProducts = () => {
  const pool = [...selectableRelicPool.value];
  const favorForCount = Math.max(0, muxinlanFavor.value);
  const targetCount =
    favorForCount >= 80
      ? 8
      : favorForCount >= 55
        ? 7
        : favorForCount >= 30
          ? 6
          : favorForCount >= 10
            ? 5
            : 4;
  const count = Math.min(targetCount, pool.length);
  const usedNames = new Set<string>();
  const discountRate = shopDiscountRate.value;
  const debtNoteCount = getOwnedRelicCountById('system_wealth_relic_16');
  const regularBadgeCount = getOwnedRelicCountById(PORTED_RELIC_ID.REGULAR_BADGE);
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

    const basePrice = getRarityBasePrice(relic.rarity) + debtNoteCount * 5;
    const finalPrice = isMerchantDefeated.value
      ? 0
      : Math.max(1, Math.ceil(basePrice * (1 - discountRate)) - regularBadgeCount);
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

const shopGreetingLines = [
  '欢迎光临。东西在那儿，价格在上面。',
  '哦，新面孔。难得，自己看看吧。',
  '来了啊。茶水免费，货架随便看。',
  '还活着呢，呵。',
];
/** 成交：极简，不介绍功能，带一点等着看戏的恶趣味 */
const shopPurchaseLines = [
  '成交。怎么用？回去试试就知道了。',
  '拿好。效果如何……下次来告诉我。',
  '嗯，眼光不坏。',
  '金币我收下了。货出门概不退换哦。',
  '……这件啊。呵，祝你好运。',
];
/** 免费拿走（VIP 卡等） */
const shopFreeItemLines = [
  '这件不收钱。规矩而已，别多想。',
  '拿去吧。卡上写着的，我照办。',
];
/** 金币不足 */
const shopShortGoldLines = [
  '钱不够哦。不议价，也不赊账。',
  '……先数清楚你的金币再说。',
  '金币不够的话，下次再来。不过到时候就不是这批货了。',
];

const shopRobDialogueLines = [
  [
    '嗯？',
    '……哦。',
    '看看货吧，别整那没用的。',
    '挺有精神的嘛，省点力气留给后面的路比较好哦。',
  ],
  [
    '你还挺执着的。',
    '我不建议继续哦。',
    '……你是来买东西的，还是来找别的什么的？',
  ],
  [
    '我再说一次。我是中立商人。这个身份保护你，也保护我。',
    '你现在做的事情，正在让这层保护变薄。',
    '建议你喝口茶，坐下来，冷静一下。这是免费的忠告，不常有。',
  ],
  [
    '…………',
    '请适可而止哦。',
    '（微笑）',
  ],
];
const setShopDialogue = (robClickCount = 0) => {
  const lines = robClickCount > 0
    ? shopRobDialogueLines[Math.min(robClickCount, shopRobDialogueLines.length) - 1]!
    : shopGreetingLines;
  shopDialogue.value = pickRandom(lines) ?? '';
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

const openShopView = async (): Promise<boolean> => {
  if (gameStore.isGenerating) return false;
  if (!(await preloadRoomImages('商店房', [SHOP_BG_URL, ...Object.values(RELIC_ORB_URLS)]))) return false;
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
    const regularBadgeCount = getOwnedRelicCountById(PORTED_RELIC_ID.REGULAR_BADGE);
    if (regularBadgeCount > 0 && !isMerchantDefeated.value) {
      const bonusGold = 2 * regularBadgeCount;
      const currentGold = Math.max(0, Math.floor(Number(gameStore.statData._金币 ?? 0)));
      const ok = await gameStore.updateStatDataFields({ _金币: currentGold + bonusGold });
      if (ok) showGameFeedback(`常客徽章：获得 ${bonusGold} 金币`);
    }
  }
  // Record a per-opening baseline. Exit only commits purchases made after this point.
  shopEntrySpentGold.value = shopSpentGold.value;
  shopEntryPurchasedCount.value = shopPurchasedItems.value.length;
  if (isMerchantDefeated.value) {
    applyMerchantDefeatedShopState();
  }
  setShopDialogue();
  showShopView.value = true;
  return true;
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
  if (isSingleAcquisitionRelic(pickedRelic)) {
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
    // 由沐芯兰本人回应，不再弹系统提示
    shopDialogue.value = pickRandom(shopShortGoldLines) ?? '';
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
  enqueueForcedCurseReplacementForRelic(item.relic);
  hideRelicTooltip();
  if (!isMerchantDefeated.value) {
    shopDialogue.value = pickRandom(item.finalPrice === 0 ? shopFreeItemLines : shopPurchaseLines) ?? '';
  }
  shopBuying.value = false;
};

const handleShopBuy = (key: string) => {
  const item = shopProducts.value.find(product => product.key === key);
  if (item) buyShopProduct(item);
};

const exitShop = async () => {
  if (shopBuying.value || gameStore.isGenerating || shopRobbing.value) return;
  if (activeForcedCurseReplacement.value) {
    showGameFeedback('必须先完成诅咒替换。');
    return;
  }
  const purchasedStartIndex = Math.max(0, Math.min(shopEntryPurchasedCount.value, shopPurchasedItems.value.length));
  const purchased = shopPurchasedItems.value.slice(purchasedStartIndex).map(item => ({ ...item }));
  const total = Math.max(0, shopSpentGold.value - shopEntrySpentGold.value);
  if (purchased.length > 0) {
    const baseGold = Math.max(0, Math.floor(Number(gameStore.statData._金币 ?? 0)));
    const acquisition = buildRelicAcquisitionEffects(
      purchased
        .map(item => getRelicByName(item.name))
        .filter((relic): relic is RelicData => Boolean(relic)),
    );
    const acquisitionGold = acquisition.goldDelta;
    const fields: Record<string, any> = { ...acquisition.fields };
    const nextGold = Math.max(0, baseGold - total + acquisitionGold);
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
      ...((total > 0 || acquisitionGold > 0) ? { _金币: nextGold } : {}),
      ...fields,
      ...buildInventoryUpdateFields({ _圣遗物: nextRelics }),
    });
  }
  const narrative = pendingCombatNarrative.value;
  await runSceneTransition(() => closeShopView());
  if (narrative && narrative.context === 'shopRobbery' && narrative.outcome === 'win') {
    const lootedText =
      purchased.length > 0
        ? `<user>击败沐芯兰后，我从失守的货架上搜刮并拿走了${purchased.map(item => `${item.name}（${item.rarity}）`).join('，')}；（这些不是购买所得，没有向沐芯兰支付金币，也不要描写为付费交易。以上拿走内容均为圣遗物，由脚本自动更新“携带的物品._圣遗物”，不要写入“携带的物品.物品”或“携带的物品.消耗品”。）`
        : '<user>击败沐芯兰后，我没有额外搜刮商店货架上的物品。';
    const report = `${narrative.text}\n${lootedText}\n请基于战斗日志和上述搜刮结果生成战斗剧情。`;
    pendingCombatNarrative.value = null;
    sendCombatNarrativeOnce(narrative, report);
    return;
  }

  if (purchased.length === 0) return;
  const purchasedText = purchased.map(item => `${item.name}（${item.rarity}）`).join('，');
  const purchaseText = `<user>从沐芯兰处购买了${purchasedText}，总共花费${total}枚金币。（以上购买内容均为圣遗物，由脚本自动更新“携带的物品._圣遗物”，不要写入“携带的物品.物品”或“携带的物品.消耗品”。）`;
  if (gameStore.fastModeEnabled) {
    void gameStore.flushFastActions(purchaseText);
    return;
  }
  gameStore.sendAction(purchaseText);
};

const handleShopRobClick = async () => {
  if (shopBuying.value || gameStore.isGenerating || shopRobbing.value || isMerchantDefeated.value) return;
  if (shopRobClickCount.value < 5) {
    shopRobClickCount.value += 1;
    if (shopRobClickCount.value <= shopRobDialogueLines.length) {
      setShopDialogue(shopRobClickCount.value);
    }
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
      const launched = await launchCombat('沐芯兰', 'shopRobbery', { onEnter: () => closeShopView() });
      if (launched) {
        void unlockAlchemySystem();
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
  const roomType =
    typeof roomTypeOverride === 'string'
      ? roomTypeOverride.trim()
      : ((gameStore.statData._当前房间类型 as string) || '').trim();
  const bloodPoolCount = getOwnedRelicCountById('bloodpool_blood_pool');
  const shouldFullHeal =
    shouldRestoreFullHpOnBattleStart(difficulty, magicHatCustomInfluences.value) ||
    (roomType === '领主房' && bloodPoolCount > 0);
  if (!shouldFullHeal) return true;

  const fullHp = displayMaxHp.value;
  const currentHp = toNonNegativeInt(gameStore.statData._血量, fullHp);
  if (currentHp >= fullHp) return true;
  return await gameStore.updateStatDataFields({ _血量: fullHp });
};

const exitCurrentCombatOverlay = () => {
  // 中途退出的事件战斗不算完成，结算按钮保留
  activeEventBattle.value = null;
  combatTempYinwenIndexes.value = [];
  void runSceneTransition(() => {
    showCombat.value = false;
    combatTestStartAt999CurrentBattle.value = false;
    if (activeCombatContext.value === 'normal' && isCombatRoomContext.value) {
      restoreCurrentSpecialOption();
    }
    activeCombatContext.value = 'normal';
  });
};

const canEnterCombat = () => {
  if (displayHp.value > 0) return true;
  toastr.warning('血量为 0，无法进入战斗。');
  return false;
};

/** 本场战斗生效的战斗修正快照（开战时计算，战斗结束后用于奖励刷新 / 金币倍率与修正递减） */
const combatBattleModifiers = ref<ResolvedBattleModifiers>(createEmptyBattleModifiers());
const combatIsLordBattle = ref(false);
/** 漫游的领主：离开主场的领主生命系数 */
const ROAMING_LORD_HP_MULTIPLIER = 0.75;

const prepareCombatModifiers = (context: CombatContext, roomType: string, options?: { weakenedLord?: boolean }) => {
  combatIsLordBattle.value = context === 'normal' && roomType === '领主房';
  if (context === 'combatTest') {
    combatBattleModifiers.value = createEmptyBattleModifiers();
    combatTempYinwenIndexes.value = [];
    return;
  }
  const resolved = resolveBattleModifiers(normalizeCombatModifiers(gameStore.statData.$战斗修正), {
    isLordBattle: combatIsLordBattle.value,
  });
  if (options?.weakenedLord) {
    resolved.enemy.hpMultiplier = ROAMING_LORD_HP_MULTIPLIER;
    resolved.sources = [...resolved.sources, '离开主场'];
  }
  combatBattleModifiers.value = resolved;
  const candidates = resolvedDeck.value
    .map((card, index) => (card.type !== CardType.CURSE ? index : -1))
    .filter(index => index >= 0);
  const picked: number[] = [];
  while (picked.length < resolved.tempYinwenCount && candidates.length > 0) {
    picked.push(candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0]!);
  }
  combatTempYinwenIndexes.value = picked;
};

const launchCombat = async (
  enemyName: string,
  context: CombatContext,
  options?: {
    roomTypeOverride?: string;
    testStartAt999?: boolean;
    /** 在转场遮住画面时执行（例如同时关闭宝箱房 / 商店） */
    onEnter?: () => void;
    /** 漫游的领主：离开主场，生命削弱 */
    weakenedLord?: boolean;
  },
): Promise<boolean> => {
  if (!canEnterCombat()) return false;
  const ready = await preparePlayerForCombatStart(options?.roomTypeOverride);
  if (!ready) return false;
  const roomType = (options?.roomTypeOverride ?? ((gameStore.statData._当前房间类型 as string) || '')).trim();
  prepareCombatModifiers(context, roomType, { weakenedLord: options?.weakenedLord });

  return await runSceneTransition(() => {
    combatEnemyName.value = enemyName;
    activeCombatContext.value = context;
    combatTestStartAt999CurrentBattle.value = Boolean(options?.testStartAt999);
    showCombat.value = true;
    options?.onEnter?.();
    return true;
  });
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

const clearGameFeedbackTimer = () => {
  if (!gameFeedbackTimer) return;
  clearTimeout(gameFeedbackTimer);
  gameFeedbackTimer = null;
};

const showGameFeedback = (text: string, duration = 2600) => {
  const messageId = ++gameFeedbackMessageId;
  clearGameFeedbackTimer();
  gameFeedbackMessage.value = { id: messageId, text };
  gameFeedbackTimer = setTimeout(() => {
    if (gameFeedbackMessage.value?.id === messageId) {
      gameFeedbackMessage.value = null;
    }
    gameFeedbackTimer = null;
  }, duration);
};

const beginRoomAssetLoading = (text: string) => {
  roomAssetLoadCount += 1;
  roomAssetLoading.value = true;
  roomAssetLoadingText.value = text;
};

const endRoomAssetLoading = () => {
  roomAssetLoadCount = Math.max(0, roomAssetLoadCount - 1);
  if (roomAssetLoadCount === 0) roomAssetLoading.value = false;
};

const preloadRoomImages = async (roomLabel: string, urls: readonly string[]): Promise<boolean> => {
  beginRoomAssetLoading(`正在加载${roomLabel}资源...`);
  try {
    await preloadImages(urls);
    return true;
  } catch {
    showGameFeedback(`${roomLabel}资源加载失败，请检查网络后重试。`);
    return false;
  } finally {
    endRoomAssetLoading();
  }
};

// ── 温泉：恢复至满血 / 净化一个负面状态 二选一；持有可净化的诅咒牌（如【愧疚】）时多一个「净化诅咒」 ──
const showHotSpringChoice = ref(false);
const hotSpringApplying = ref(false);

const hotSpringCleansableEntries = computed(() =>
  getCleansableNegativeStatuses(normalizeNegativeStatusList(gameStore.statData.$负面状态)).map(raw => {
    const behavior = getHotSpringBehavior(raw);
    return {
      raw,
      description: describeNegativeStatus(raw) ?? '',
      ...(typeof behavior === 'object' ? { degradeTo: behavior.degradeTo } : {}),
    };
  }),
);

const hotSpringPurifiableCurses = computed(() => {
  const skills = Array.isArray(gameStore.statData._技能) ? (gameStore.statData._技能 as string[]) : [];
  const seen = new Set<string>();
  const result: Array<{ from: string; to: string }> = [];
  for (const name of skills) {
    const key = String(name ?? '').trim();
    const to = HOT_SPRING_CURSE_PURIFY_MAP[key];
    if (!to || seen.has(key)) continue;
    seen.add(key);
    result.push({ from: key, to });
  }
  return result;
});

const useHotSpringCleanse = async () => {
  showHotSpringChoice.value = true;
};

const finishHotSpringChoice = async (fields: Record<string, any>, actionText: string, showCleanseText: boolean) => {
  if (hotSpringApplying.value) return;
  hotSpringApplying.value = true;
  try {
    if (showCleanseText) showHotSpringCleanseText();
    gameStore.setPendingStatDataChanges(fields);
    showHotSpringChoice.value = false;
    markCurrentSpecialConsumed();
    await submitGameAction(actionText, '温泉房', 'spring');
  } finally {
    hotSpringApplying.value = false;
  }
};

const chooseHotSpringHeal = () =>
  finishHotSpringChoice(
    { _血量: Math.max(1, displayMaxHp.value) },
    '<user>浸泡在暖泉中疗伤，泉水抚平了一路积攒的伤痛。（选择了疗伤：生命已恢复至满）',
    false,
  );

const chooseHotSpringCleanse = (raw: string) =>
  finishHotSpringChoice(
    { $负面状态: cleanseSingleNegativeStatus(normalizeNegativeStatusList(gameStore.statData.$负面状态), raw) },
    `${HOT_SPRING_CLEANSE_ACTION_TEXT_PREFIX}（选择了净化：负面状态${raw}已被净化，其余负面状态与生命不变）`,
    true,
  );

const chooseHotSpringPurify = () => {
  const currentSkills = Array.isArray(gameStore.statData._技能) ? [...(gameStore.statData._技能 as string[])] : [];
  const purifiedSkills = currentSkills.map(name => HOT_SPRING_CURSE_PURIFY_MAP[String(name ?? '').trim()] ?? name);
  const purifiedText = hotSpringPurifiableCurses.value.map(item => `【${item.from}】化为【${item.to}】`).join('、');
  return finishHotSpringChoice(
    { _技能: purifiedSkills },
    `${HOT_SPRING_CLEANSE_ACTION_TEXT_PREFIX}（选择了净化诅咒：${purifiedText}，负面状态与生命不变）`,
    true,
  );
};

onUnmounted(() => {
  persistMapViewportState();
  if (mapViewportPersistTimer !== null) {
    clearTimeout(mapViewportPersistTimer);
    mapViewportPersistTimer = null;
  }
  persistMapModalScroll();
  if (mapScrollPersistTimer !== null) {
    clearTimeout(mapScrollPersistTimer);
    mapScrollPersistTimer = null;
  }
  clearShopRobTimer();
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  clearChestRewardConfirmTimer();
  if (mainGuideTimer) clearTimeout(mainGuideTimer);
  clearHotSpringCleanseTimer();
  clearGameFeedbackTimer();
  clearIdolRollTimer();
  closeOptionCompletionMenu();
  closeSettingsHelp();
});

const openChestView = async (): Promise<boolean> => {
  if (gameStore.isGenerating) return false;
  if (!(await preloadRoomImages('宝箱房', CHEST_ROOM_PRELOAD_URLS))) return false;
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
  clearChestRewardConfirmTimer();
  chestStage.value = 'closed';
  chestRolling.value = false;
  chestRewardRelics.value = [];
  chestRewardCollectedFlags.value = [];
  chestCollecting.value = false;
  chestRewardVisible.value = false;
  chestOpenedBgReady.value = false;
  chestRewardCountFixed.value = null;
  chestCloseCount.value = 0;
  chestForceMimicNextOpen.value = false;
  pendingChestRewardIndex.value = null;
  showChestView.value = true;
  return true;
};

const closeChestView = () => {
  if (activeForcedCurseReplacement.value) {
    showGameFeedback('必须先完成诅咒替换。');
    return;
  }
  clearChestMimicTimer();
  clearChestRewardFadeTimer();
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
  // 白神像碎片：白神像祈愿时投掷点数必为最大点数
  if (idolVariant.value === 'white' && getOwnedRelicCountById(PORTED_RELIC_ID.WHITE_IDOL_SHARD) > 0) return max;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getIdolSlotElement = (target: IdolSlotTarget) => {
  if (target === 'maxHp' || target === 'blackDice') return idolSlotMaxHpRef.value;
  if (target === 'mp' || target === 'blackMp') return idolSlotMpRef.value;
  return idolSlotGoldRef.value;
};

const getIdolTargetList = (): IdolSlotTarget[] =>
  idolVariant.value === 'black' ? ['blackMp', 'blackDice', 'blackGold'] : ['maxHp', 'mp', 'gold'];

const getIdolDiceElement = (diceIndex: 0 | 1) => (diceIndex === 0 ? idolDiceRef.value : idolDiceTwoRef.value);
const getIdolDicePosition = (diceIndex: 0 | 1) =>
  diceIndex === 0 ? idolDicePosition.value : idolDiceTwoPosition.value;
const setIdolDicePosition = (diceIndex: 0 | 1, position: { x: number; y: number }) => {
  if (diceIndex === 0) {
    idolDicePosition.value = position;
  } else {
    idolDiceTwoPosition.value = position;
  }
};

const getIdolSacrificeTotals = (excludedDiceIndex: 0 | 1 | null = null) => {
  let life = 0;
  let maxHp = 0;
  for (const diceIndex of [0, 1] as const) {
    if (diceIndex === excludedDiceIndex) continue;
    const target = getIdolAssignedTarget(diceIndex);
    if (!target || idolVariant.value !== 'black') continue;
    const dice = getIdolDiceValue(diceIndex);
    if (target === 'blackMp' || target === 'blackGold') life += dice;
    if (target === 'blackDice') maxHp += dice;
  }
  return { life, maxHp };
};

const canAssignIdolTarget = (target: IdolSlotTarget, diceIndex: 0 | 1): boolean => {
  if (idolVariant.value !== 'black') return true;
  const currentHp = toNonNegativeInt(gameStore.statData._血量, displayHp.value);
  const currentMaxHp = toNonNegativeInt(gameStore.statData._血量上限, displayMaxHp.value);
  const dice = getIdolDiceValue(diceIndex);
  const previous = getIdolSacrificeTotals(diceIndex);
  if (target === 'blackMp' || target === 'blackGold') {
    return currentHp - previous.life - dice >= 1;
  }
  if (target === 'blackDice') {
    const nextMaxHp = currentMaxHp - previous.maxHp - dice;
    return nextMaxHp >= 1;
  }
  return true;
};

const getIdolPlacementWarning = (target: IdolSlotTarget | null, diceIndex: 0 | 1): string => {
  if (!target) return '骰子没有放入有效的神像槽位。';
  const otherIndex: 0 | 1 = diceIndex === 0 ? 1 : 0;
  if (getIdolAssignedTarget(otherIndex) === target) return '这个神像槽位已经放置了另一枚骰子。';
  if (target === 'blackMp' || target === 'blackGold') return '生命献祭后必须至少保留1点生命。';
  if (target === 'blackDice') return '生命上限献祭后必须至少保留1点。';
  return '骰子没有放入有效的神像槽位。';
};

const getIdolSnapCandidate = (
  diceIndex: 0 | 1,
  x: number,
  y: number,
  allowUnavailable = false,
): IdolSnapCandidate | null => {
  const stageEl = idolDiceStageRef.value;
  const diceEl = getIdolDiceElement(diceIndex);
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
  const otherIndex: 0 | 1 = diceIndex === 0 ? 1 : 0;

  let best: IdolSnapCandidate | null = null;
  for (const target of getIdolTargetList()) {
    if (!allowUnavailable && getIdolAssignedTarget(otherIndex) === target) continue;
    if (!allowUnavailable && !canAssignIdolTarget(target, diceIndex)) continue;
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
    if (!best || distance < best.distance) best = { target, distance, snapX, snapY };
  }

  if (!best || best.distance > IDOL_SNAP_DISTANCE) return null;
  return best;
};

const getIdolDiceStartPosition = (diceIndex: 0 | 1) => {
  const stageEl = idolDiceStageRef.value;
  const diceEl = getIdolDiceElement(diceIndex);
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
  const centerX = (stageWidth - diceWidth) / 2;
  const offset = idolVariant.value === 'black' ? (diceIndex === 0 ? -diceWidth * 0.7 : diceWidth * 0.7) : 0;
  return {
    x: clampNumber(centerX + offset, 0, maxX),
    y: clampNumber(stageHeight * 0.72, 0, maxY),
  };
};

const placeIdolDiceAtStart = () => {
  const first = getIdolDiceStartPosition(0);
  if (first) setIdolDicePosition(0, first);
  if (idolVariant.value === 'black') {
    const second = getIdolDiceStartPosition(1);
    if (second) setIdolDicePosition(1, second);
  }
  idolSnapPreviewTarget.value = null;
  idolDiceTwoSnapPreviewTarget.value = null;
};

const chooseIdolVariant = (): IdolVariant => {
  const lowHpThreshold = Math.max(1, Math.floor(displayMaxHp.value * 0.35));
  if (displayHp.value <= lowHpThreshold) return 'white';
  return Math.random() < 0.7 ? 'white' : 'black';
};

const getStoredIdolVariant = (): IdolVariant | null => {
  const path = currentFloorPath.value;
  const lastPathEntry = path[path.length - 1];
  if (lastPathEntry?.房间类型 !== '神像房') return null;
  const rowIndex = path.length - 1;
  const mapNode = currentDungeonMap.value
    .map(route => route[rowIndex])
    .find(node => node?.x === lastPathEntry.x && node.房间类型 === '神像房');
  if (mapNode?.神像类型 === '黑神像') return 'black';
  if (mapNode?.神像类型 === '白神像') return 'white';
  return null;
};

const openIdolView = async (): Promise<boolean> => {
  if (gameStore.isGenerating) return false;
  clearIdolRollTimer();
  clearGameFeedbackTimer();
  gameFeedbackMessage.value = null;
  const variant = getStoredIdolVariant() ?? chooseIdolVariant();
  const backgroundUrl = variant === 'black' ? IDOL_BG_BLACK_URL : IDOL_BG_WHITE_URL;
  const slotUrls =
    variant === 'black'
      ? [IDOL_SLOT_ASSET_URLS.blackMp, IDOL_SLOT_ASSET_URLS.blackDice, IDOL_SLOT_ASSET_URLS.blackGold]
      : [IDOL_SLOT_ASSET_URLS.maxHp, IDOL_SLOT_ASSET_URLS.mp, IDOL_SLOT_ASSET_URLS.gold];
  if (!(await preloadRoomImages('神像房', [backgroundUrl, ...slotUrls]))) return false;
  idolVariant.value = variant;
  idolAssignedTarget.value = null;
  idolDiceTwoAssignedTarget.value = null;
  idolSnapPreviewTarget.value = null;
  idolDiceTwoSnapPreviewTarget.value = null;
  idolDragPointerId.value = null;
  idolDragDiceIndex.value = null;
  idolDiceValue.value = idolDiceMin.value;
  idolDiceTwoValue.value = idolDiceMin.value;
  idolOffering.value = false;
  idolSlotBurst.value = {};
  idolSlotReject.value = null;
  idolDiceRolling.value = true;
  showIdolView.value = true;
  // 先把骰子放到起始位置，再播放掷落动画（避免掷骰期间停在左上角）
  await nextTick();
  placeIdolDiceAtStart();
  idolRollTimer = setTimeout(
    () => {
      idolDiceValue.value = rollIdolDiceValue();
      idolDiceTwoValue.value = rollIdolDiceValue();
      idolDiceRolling.value = false;
      idolDiceRevealKey.value += 1;
      idolRollTimer = null;
      requestAnimationFrame(() => placeIdolDiceAtStart());
    },
    prefersReducedMotion() ? 520 : 980,
  );
  return true;
};

const closeIdolView = () => {
  clearIdolRollTimer();
  idolOffering.value = false;
  idolDragPointerId.value = null;
  idolDragDiceIndex.value = null;
  showIdolView.value = false;
};

const resetIdolDiceAfterInvalidDrop = (diceIndex: 0 | 1, target: IdolSlotTarget | null) => {
  setIdolAssignedTarget(diceIndex, null);
  setIdolPreviewTarget(diceIndex, null);
  const start = getIdolDiceStartPosition(diceIndex);
  if (start) setIdolDicePosition(diceIndex, start);
  if (target) idolSlotReject.value = { target, key: (idolSlotReject.value?.key ?? 0) + 1 };
  const body = getIdolDiceElement(diceIndex)?.querySelector('.idol-dice-body');
  if (body instanceof HTMLElement && !prefersReducedMotion()) {
    body.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-7px) rotate(-4deg)' },
        { transform: 'translateX(7px) rotate(4deg)' },
        { transform: 'translateX(-4px) rotate(-2deg)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 380, easing: 'ease-out' },
    );
  }
  showGameFeedback(getIdolPlacementWarning(target, diceIndex));
};

const handleIdolDicePointerDown = (event: PointerEvent, diceIndex: 0 | 1) => {
  if (!showIdolView.value || idolDiceRolling.value || idolOffering.value) return;
  if (diceIndex === 1 && idolVariant.value !== 'black') return;
  const diceEl = getIdolDiceElement(diceIndex);
  if (!diceEl) return;
  setIdolAssignedTarget(diceIndex, null);
  setIdolPreviewTarget(diceIndex, null);
  idolDragPointerId.value = event.pointerId;
  idolDragDiceIndex.value = diceIndex;
  idolDragStart.value = { x: event.clientX, y: event.clientY };
  idolDragStartPos.value = { ...getIdolDicePosition(diceIndex) };
  diceEl.setPointerCapture(event.pointerId);
};

const handleIdolDicePointerMove = (event: PointerEvent) => {
  if (!showIdolView.value || idolDragPointerId.value !== event.pointerId || idolDragDiceIndex.value === null) return;
  const diceIndex = idolDragDiceIndex.value;
  const stageEl = idolDiceStageRef.value;
  const diceEl = getIdolDiceElement(diceIndex);
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
  setIdolDicePosition(diceIndex, { x: nextX, y: nextY });
  const candidate = getIdolSnapCandidate(diceIndex, nextX, nextY);
  setIdolPreviewTarget(diceIndex, candidate?.target ?? null);
};

const handleIdolDicePointerUp = (event: PointerEvent) => {
  if (!showIdolView.value || idolDragPointerId.value !== event.pointerId || idolDragDiceIndex.value === null) return;
  const diceIndex = idolDragDiceIndex.value;
  const diceEl = getIdolDiceElement(diceIndex);
  if (diceEl?.hasPointerCapture(event.pointerId)) diceEl.releasePointerCapture(event.pointerId);
  const position = getIdolDicePosition(diceIndex);
  const candidate = getIdolSnapCandidate(diceIndex, position.x, position.y);
  if (candidate) {
    setIdolAssignedTarget(diceIndex, candidate.target);
    setIdolPreviewTarget(diceIndex, candidate.target);
    setIdolDicePosition(diceIndex, { x: candidate.snapX, y: candidate.snapY });
    idolSlotBurst.value = {
      ...idolSlotBurst.value,
      [candidate.target]: (idolSlotBurst.value[candidate.target] ?? 0) + 1,
    };
  } else {
    const nearest = getIdolSnapCandidate(diceIndex, position.x, position.y, true);
    resetIdolDiceAfterInvalidDrop(diceIndex, nearest?.target ?? null);
  }
  idolDragPointerId.value = null;
  idolDragDiceIndex.value = null;
};

const buildIdolPendingFields = () => {
  const rewards = idolRewardEntries.value;
  if (rewards.length === 0) return null;

  let currentHp = toNonNegativeInt(gameStore.statData._血量, displayHp.value);
  let currentMaxHp = toNonNegativeInt(gameStore.statData._血量上限, displayMaxHp.value);
  let currentMp = toNonNegativeInt(gameStore.statData.$魔量, 1);
  let currentInitialMp = toNonNegativeInt(gameStore.statData.$初始魔量, currentMp);
  let currentGold = toNonNegativeInt(gameStore.statData._金币, 0);
  let currentMinDice = toNonNegativeInt(gameStore.statData.$最小点数, 1);
  let currentMaxDice = toNonNegativeInt(gameStore.statData.$最大点数, 6);

  for (const reward of rewards) {
    const { target, dice } = reward;
    if (target === 'maxHp') currentMaxHp += Math.floor(dice * 1.5);
    if (target === 'mp') {
      currentInitialMp += dice;
      currentMp = Math.max(currentMp, currentInitialMp);
    }
    if (target === 'gold') currentGold += dice * 2 + getOwnedRelicCountById('system_wealth_relic_10');
    if (target === 'blackMp') {
      currentHp -= dice;
      currentInitialMp += idolDiceMax.value;
      currentMp = Math.max(currentMp, currentInitialMp);
    }
    if (target === 'blackDice') {
      currentMaxHp -= dice;
      currentMinDice += 1;
      currentMaxDice += 1;
    }
    if (target === 'blackGold') {
      currentHp -= dice;
      currentGold += dice * 3 + getOwnedRelicCountById('system_wealth_relic_10');
    }
  }

  if (idolVariant.value === 'black' && rewards.some(reward => reward.target === 'blackDice')) {
    currentHp = Math.max(1, Math.min(currentHp, currentMaxHp));
  }

  const fields: Record<string, any> = {};
  if (currentHp !== toNonNegativeInt(gameStore.statData._血量, displayHp.value)) fields._血量 = Math.max(1, currentHp);
  if (currentMaxHp !== toNonNegativeInt(gameStore.statData._血量上限, displayMaxHp.value)) {
    fields._血量上限 = Math.max(1, currentMaxHp);
  }
  if (currentMp !== toNonNegativeInt(gameStore.statData.$魔量, 1)) fields.$魔量 = Math.max(0, currentMp);
  if (currentInitialMp !== toNonNegativeInt(gameStore.statData.$初始魔量, currentMp)) fields.$初始魔量 = Math.max(0, currentInitialMp);
  if (currentGold !== toNonNegativeInt(gameStore.statData._金币, 0)) fields._金币 = Math.max(0, currentGold);
  if (currentMinDice !== toNonNegativeInt(gameStore.statData.$最小点数, 1)) fields.$最小点数 = Math.max(1, currentMinDice);
  if (currentMaxDice !== toNonNegativeInt(gameStore.statData.$最大点数, 6)) fields.$最大点数 = Math.max(currentMinDice, currentMaxDice);
  return fields;
};

const rollChestRewardRarity = (): RelicData['rarity'] => {
  const rarityRoll = Math.random();
  if (rarityRoll < 0.8) return '普通';
  if (rarityRoll < 0.95) return '稀有';
  return '传奇';
};

const rollChestMimicRelicDropRarity = (): RelicData['rarity'] => {
  const rarityRoll = Math.random();
  if (rarityRoll < 0.7) return '普通';
  if (rarityRoll < 0.95) return '稀有';
  return '传奇';
};

const rollChestRewardCount = (): number => {
  if (isCustomDifficultyInfluenceActive('资源稀缺')) return 1;
  if (isCustomDifficultyInfluenceActive('资源丰盛')) return 2;
  // 四叶草宝石：出现两件圣遗物的概率翻倍（20% → 40%）
  const doubleChance = getOwnedRelicCountById(PORTED_RELIC_ID.FOUR_LEAF_GEM) > 0 ? 0.4 : 0.2;
  return Math.random() < doubleChance ? 2 : 1;
};

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

const pickChestMimicRelicDrop = (): RelicData | null => {
  const targetRarity = rollChestMimicRelicDropRarity();
  const candidatePool = [...selectableRelicPool.value];
  if (candidatePool.length === 0) return null;
  return pickOne(candidatePool.filter(relic => relic.rarity === targetRarity)) ?? pickOne(candidatePool);
};

const startMimicRelicDropFlow = (relic: RelicData): void => {
  mimicRelicDropRelic.value = relic;
  mimicRelicDropApplying.value = false;
  showMimicRelicDropView.value = true;
  recordEncounteredRelics([relic.id]);
};

const finishMimicRelicDropFlow = () => {
  showMimicRelicDropView.value = false;
  mimicRelicDropRelic.value = null;
  mimicRelicDropApplying.value = false;
  hideRelicTooltip();
  continuePostCombatRewardFlow();
};

const acceptMimicRelicDrop = () => {
  if (mimicRelicDropApplying.value) return;
  const relic = mimicRelicDropRelic.value;
  if (!relic) {
    finishMimicRelicDropFlow();
    return;
  }

  mimicRelicDropApplying.value = true;
  const nextRelics = buildNextRelicInventory(relic);
  const acquisition = buildRelicAcquisitionEffects([relic]);
  if (acquisition.goldDelta > 0) gameStore.addPendingCombatGoldDelta(acquisition.goldDelta);
  gameStore.mergePendingStatDataChanges({
    ...acquisition.fields,
    ...buildInventoryUpdateFields({ _圣遗物: nextRelics }),
  });
  mimicRelicDropApplying.value = false;
  enqueueForcedCurseReplacementForRelic(relic);
  if (pendingCombatNarrative.value) {
    pendingCombatNarrative.value.text += `\n<user>宝箱怪额外掉落了圣遗物${relic.name}（${formatRarityLabel(relic.rarity)}），<user>选择将其带走。`;
  }
  showGameFeedback(`获得圣遗物：${relic.name}（${formatRarityLabel(relic.rarity)}）`);
  finishMimicRelicDropFlow();
};

const skipMimicRelicDrop = () => {
  if (mimicRelicDropApplying.value) return;
  const relic = mimicRelicDropRelic.value;
  if (relic && pendingCombatNarrative.value) {
    pendingCombatNarrative.value.text += `\n<user>宝箱怪额外掉落了圣遗物${relic.name}（${formatRarityLabel(relic.rarity)}），但<user>没有带走。`;
  }
  finishMimicRelicDropFlow();
};

const queueChestMimicCombatTransition = () => {
  clearChestMimicTimer();
  chestMimicTimer = setTimeout(() => {
    void (async () => {
      const launched = await launchCombat('宝箱怪', 'chestMimic', {
        onEnter: () => {
          showChestView.value = false;
        },
      });
      if (launched) {
        showChestView.value = false;
        chestRolling.value = false;
        chestRewardVisible.value = false;
      }
      chestMimicTimer = null;
    })();
    // 留出宝箱怪现身动画（约 1.3s）的时间再进入战斗
  }, 1600);
};

const closeOpenedChestForRefresh = () => {
  if (chestStage.value !== 'opened' || chestRolling.value || chestCollecting.value) return;
  const hasCollectedAnyReward = chestRewardCollectedFlags.value.some(flag => flag);
  if (hasCollectedAnyReward) {
    showGameFeedback('已领取过圣遗物，当前宝箱不能关闭刷新。');
    return;
  }
  chestCloseCount.value += 1;
  chestForceMimicNextOpen.value = false;
  clearChestRewardFadeTimer();
  resetChestRewardConfirmation();
  chestStage.value = 'closed';
  chestRolling.value = false;
  chestCollecting.value = false;
  chestRewardVisible.value = false;
  chestOpenedBgReady.value = false;
  chestRewardRelics.value = [];
  chestRewardCollectedFlags.value = [];
};

const getChestMimicChance = (refreshCount: number) => {
  const normalized = Math.max(0, Math.floor(refreshCount));
  if (normalized <= 1) return 0.1;
  if (normalized === 2) return 0.3;
  if (normalized === 3) return 0.6;
  if (normalized === 4) return 0.9;
  return 1;
};

const collectChestReward = (index: number) => {
  if (chestCollecting.value) return;
  if (index < 0 || index >= chestRewardRelics.value.length) return;
  if (chestRewardCollectedFlags.value[index]) return;
  resetChestRewardConfirmation(false);
  // 光球即将飞走，悬停提示不再有锚点
  hideRelicTooltip();
  chestCollecting.value = true;
  chestRewardCollectedFlags.value[index] = true;
  const relic = chestRewardRelics.value[index];
  if (relic) {
    enqueueForcedCurseReplacementForRelic(relic);
  }
  chestCollecting.value = false;

  const allCollected =
    chestRewardCollectedFlags.value.length > 0 && chestRewardCollectedFlags.value.every(flag => flag);
  if (!allCollected) return;

  clearChestRewardFadeTimer();
  // 等待最后一颗光球飞入状态栏（ChestRoomScene 中约 0.7s）
  chestRewardFadeTimer = setTimeout(() => {
    chestRewardVisible.value = false;
    chestRewardFadeTimer = null;
  }, 760);
};

const handleChestCenterClick = async () => {
  if (chestRolling.value || chestStage.value !== 'closed') return;
  resetChestRewardConfirmation();
  chestRolling.value = true;

  const mimicChance = getChestMimicChance(chestCloseCount.value);
  const openSuccess = Math.random() >= mimicChance;

  if (openSuccess) {
    const rewardCount = chestRewardCountFixed.value ?? rollChestRewardCount();
    chestRewardCountFixed.value = rewardCount;
    const rewards = pickChestRewardRelics(rewardCount);
    // 奖励与开箱状态同一时刻提交，开箱动画（ChestRoomScene）负责光球的抛出时序
    chestStage.value = 'opened';
    chestOpenedBgReady.value = true;
    chestRewardRelics.value = rewards;
    chestRewardCollectedFlags.value = rewards.map(() => false);
    chestCollecting.value = false;
    chestRewardVisible.value = rewards.length > 0;
    chestRolling.value = false;
    return;
  }

  chestForceMimicNextOpen.value = false;
  chestStage.value = 'mimic';
  chestCollecting.value = false;
  chestRewardVisible.value = false;
  await gameStore.updateStatDataFields({ _对手名称: '宝箱怪' });
  queueChestMimicCombatTransition();
};

const startCombatFromSpecialOption = async (): Promise<boolean> => {
  if (!canEnterCombat()) return false;
  const roomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  const area = ((gameStore.statData._当前区域 as string) || '').trim();

  let enemyName = ((gameStore.statData._对手名称 as string) || '').trim();
  if (!enemyName) {
    enemyName = roomType === '领主房' ? (pickLordMonsterByArea(area) ?? '') : (pickBattleMonsterByArea(area) ?? '');
    if (!enemyName) {
      toastr.warning('当前未找到可战斗的对手。');
      return false;
    }
    const ok = await gameStore.updateStatDataFields({ _对手名称: enemyName });
    if (!ok) return false;
  }
  return await launchCombat(enemyName, 'normal', { roomTypeOverride: roomType });
};

const handleSpecialOption = async () => {
  if (gameStore.isGenerating || specialRoomOpening.value) return;
  specialRoomOpening.value = true;
  try {
    if (isShopContext.value) {
      await runSceneTransition(() => openShopView());
      return;
    }
    if (isTreasureRoomContext.value) {
      if (await runSceneTransition(() => openChestView())) markCurrentSpecialConsumed();
      return;
    }
    if (isHotSpringRoomContext.value) {
      // 选择完成后才标记为已使用；关闭面板可稍后再选
      await useHotSpringCleanse();
      return;
    }
    if (isIdolRoomContext.value) {
      if (await runSceneTransition(() => openIdolView())) markCurrentSpecialConsumed();
      return;
    }
    if (isCombatRoomContext.value) {
      if (await startCombatFromSpecialOption()) markCurrentSpecialConsumed();
      return;
    }
    markCurrentSpecialConsumed();
    toastr.info('功能开发中...');
  } finally {
    specialRoomOpening.value = false;
  }
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
        variant: idolVariant.value,
        diceValue: idolDiceValue.value,
        diceTwoValue: idolDiceTwoValue.value,
        diceRolling: idolDiceRolling.value,
        assignedTarget: idolAssignedTarget.value,
        diceTwoAssignedTarget: idolDiceTwoAssignedTarget.value,
        snapPreviewTarget: idolSnapPreviewTarget.value,
        diceTwoSnapPreviewTarget: idolDiceTwoSnapPreviewTarget.value,
        dicePosition: { ...idolDicePosition.value },
        diceTwoPosition: { ...idolDiceTwoPosition.value },
      },
    };
  }
  if (showMimicRelicDropView.value && mimicRelicDropRelic.value) {
    return {
      version: 1,
      active: 'mimicRelicDrop',
      mimicRelicDrop: {
        relicId: mimicRelicDropRelic.value.id,
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
        refreshUsed: rewardRefreshUsedCount.value > 0,
        refreshUsedCount: rewardRefreshUsedCount.value,
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

const restoreOverlaySnapshot = async () => {
  localStorage.removeItem(LEGACY_OVERLAY_STATE_KEY);
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
      await preloadImages(CHEST_ROOM_PRELOAD_URLS);
      const relics = parsed.chest.rewardRelicIds
        .map(id => relicByIdMap.value.get(id) ?? getRelicById(id))
        .filter((relic): relic is RelicData => Boolean(relic));
      showChestView.value = true;
      chestStage.value = parsed.chest.stage;
      chestRolling.value = Boolean(parsed.chest.rolling);
      chestRewardRelics.value = relics;
      chestRewardCollectedFlags.value = relics.map((_, idx) => Boolean(parsed.chest?.rewardCollectedFlags[idx]));
      chestCollecting.value = false;
      // 旧存档可能在“等待开箱背景加载”时保存（rewardVisible=false），此时仍应显示未领取的奖励
      const hasUncollectedChestReward = chestRewardCollectedFlags.value.some(flag => !flag);
      chestRewardVisible.value =
        Boolean(parsed.chest.rewardVisible) || (chestStage.value === 'opened' && hasUncollectedChestReward);
      chestOpenedBgReady.value = chestStage.value === 'opened' || Boolean(parsed.chest.openedBgReady);
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
      await preloadImages([SHOP_BG_URL, ...Object.values(RELIC_ORB_URLS)]);
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
      setShopDialogue(shopRobClickCount.value);
      shopRobbing.value = Boolean(parsed.shop.robbing);
      shopSessionKey.value = getCurrentShopSessionKey();
      shopBuying.value = false;
      return;
    }

    if (parsed.active === 'idol' && parsed.idol) {
      idolVariant.value = parsed.idol.variant === 'black' ? 'black' : 'white';
      const backgroundUrl = idolVariant.value === 'black' ? IDOL_BG_BLACK_URL : IDOL_BG_WHITE_URL;
      const slotUrls = idolVariant.value === 'black'
        ? [IDOL_SLOT_ASSET_URLS.blackMp, IDOL_SLOT_ASSET_URLS.blackDice, IDOL_SLOT_ASSET_URLS.blackGold]
        : [IDOL_SLOT_ASSET_URLS.maxHp, IDOL_SLOT_ASSET_URLS.mp, IDOL_SLOT_ASSET_URLS.gold];
      await preloadImages([backgroundUrl, ...slotUrls]);
      showIdolView.value = true;
      idolDiceValue.value = clampNumber(
        toNonNegativeInt(parsed.idol.diceValue, idolDiceMin.value),
        idolDiceMin.value,
        idolDiceMax.value,
      );
      idolDiceTwoValue.value = clampNumber(
        toNonNegativeInt(parsed.idol.diceTwoValue, idolDiceMin.value),
        idolDiceMin.value,
        idolDiceMax.value,
      );
      idolDiceRolling.value = false;
      const validTargets = new Set<IdolSlotTarget>(getIdolTargetList());
      idolAssignedTarget.value = validTargets.has(parsed.idol.assignedTarget as IdolSlotTarget)
        ? parsed.idol.assignedTarget
        : null;
      idolDiceTwoAssignedTarget.value = validTargets.has(parsed.idol.diceTwoAssignedTarget as IdolSlotTarget)
        ? parsed.idol.diceTwoAssignedTarget ?? null
        : null;
      idolSnapPreviewTarget.value = validTargets.has(parsed.idol.snapPreviewTarget as IdolSlotTarget)
        ? parsed.idol.snapPreviewTarget
        : null;
      idolDiceTwoSnapPreviewTarget.value = validTargets.has(parsed.idol.diceTwoSnapPreviewTarget as IdolSlotTarget)
        ? parsed.idol.diceTwoSnapPreviewTarget ?? null
        : null;
      idolDicePosition.value = {
        x: Number.isFinite(parsed.idol.dicePosition?.x) ? parsed.idol.dicePosition.x : 0,
        y: Number.isFinite(parsed.idol.dicePosition?.y) ? parsed.idol.dicePosition.y : 0,
      };
      idolDiceTwoPosition.value = {
        x: Number.isFinite(parsed.idol.diceTwoPosition?.x) ? parsed.idol.diceTwoPosition.x : idolDicePosition.value.x,
        y: Number.isFinite(parsed.idol.diceTwoPosition?.y) ? parsed.idol.diceTwoPosition.y : idolDicePosition.value.y,
      };
      idolDragPointerId.value = null;
      idolDragDiceIndex.value = null;
      return;
    }

    if (parsed.active === 'mimicRelicDrop' && parsed.mimicRelicDrop) {
      const relic =
        relicByIdMap.value.get(parsed.mimicRelicDrop.relicId) ?? getRelicById(parsed.mimicRelicDrop.relicId);
      if (!relic) {
        localStorage.removeItem(OVERLAY_STATE_KEY);
        return;
      }
      mimicRelicDropRelic.value = relic;
      mimicRelicDropApplying.value = false;
      showMimicRelicDropView.value = true;
      recordEncounteredRelics([relic.id]);
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
      rewardRefreshUsedCount.value =
        typeof parsed.victory.refreshUsedCount === 'number'
          ? Math.max(0, Math.floor(parsed.victory.refreshUsedCount))
          : parsed.victory.refreshUsed
            ? 1
            : 0;
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
    showMimicRelicDropView,
    chestStage,
    chestRolling,
    chestRewardRelics,
    chestRewardCollectedFlags,
    chestCollecting,
    chestRewardVisible,
    chestOpenedBgReady,
    chestRewardCountFixed,
    chestCloseCount,
    chestForceMimicNextOpen,
    shopProducts,
    shopSpentGold,
    shopPurchasedItems,
    shopRobClickCount,
    shopRobbing,
    idolVariant,
    idolDiceValue,
    idolDiceTwoValue,
    idolDiceRolling,
    idolAssignedTarget,
    idolDiceTwoAssignedTarget,
    idolSnapPreviewTarget,
    idolDiceTwoSnapPreviewTarget,
    idolDicePosition,
    idolDiceTwoPosition,
    victoryRewardStage,
    victoryRewardOptions,
    selectedVictoryRewardCard,
    mimicRelicDropRelic,
    mimicRelicDropApplying,
    rewardRefreshUsedCount,
    rewardIsNormalEnemy,
  ],
  () => {
    persistOverlaySnapshot();
  },
  { deep: true },
);

watch(
  activeModal,
  modal => {
    if (!modal) return;
    const panelLabels: Record<string, string> = {
      statusDetails: '状态面板',
      bonds: '羁绊面板',
      magicBooks: '魔法书面板',
    };
    const label = panelLabels[modal];
    if (!label) return;
    beginRoomAssetLoading(`正在加载${label}资源...`);
    void (async () => {
      try {
        let urls: string[] = [];
        if (modal === 'statusDetails') {
          if (!playerStatusPortraitUrl.value && !playerStatusPortraitError.value) {
            await initPlayerPortraitPreviewUrl();
          }
          if (playerStatusPortraitUrl.value && !playerStatusPortraitError.value) {
            urls = [playerStatusPortraitUrl.value];
          }
        } else if (modal === 'bonds') {
          await Promise.all(bondRoleEntries.value.map(entry => ensureBondPortraitLoaded(entry.name)));
          urls = bondEntries.value.filter(entry => !bondPortraitErrors.value[entry.name]).map(entry => entry.portraitUrl);
        } else if (modal === 'magicBooks') {
          urls = [
            MAGIC_BOOK_UI_BOOK_URL,
            MAGIC_BOOK_UI_LEAF_URL,
            MAGIC_BOOK_UI_PLATE_URL,
            MAGIC_BOOK_UI_ORNAMENT_URL,
            ...magicBookPageImageUrls.value,
          ];
        }
        if (urls.length > 0) {
          await preloadImages(urls);
        }
      } catch {
        showGameFeedback(`${label}资源加载失败，请检查网络后重试。`);
        if (activeModal.value === modal) activeModal.value = null;
      } finally {
        endRoomAssetLoading();
      }
    })();
  },
  { flush: 'sync' },
);

const handleButtonCompletionOutsidePointerDown = (event: PointerEvent) => {
  if (!optionCompletionMenuOpen.value && !optionActionModeMenuOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (buttonCompletionMenuRef.value?.contains(target)) return;
  if (optionActionModeControlRef.value?.contains(target)) return;
  if (optionActionModeMenuRef.value?.contains(target)) return;
  closeOptionCompletionMenu();
  closeOptionActionModeMenu();
};

onMounted(() => {
  void initializeMainImageAssets();
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
    window.addEventListener('resize', updateOptionActionModeMenuPosition, { passive: true });
    window.addEventListener('focusout', handleViewportFocusOut, { passive: true });
    document.addEventListener('fullscreenchange', handleViewportResize);
    document.addEventListener('pointerdown', handleButtonCompletionOutsidePointerDown);
    document.addEventListener('scroll', updateOptionActionModeMenuPosition, true);
    inputWaitingDotsTimer = window.setInterval(() => {
      if (!gameStore.isGenerating) return;
      inputWaitingDotsStep.value = (inputWaitingDotsStep.value % 3) + 1;
    }, 420);
  }
});

watch(
  () =>
    `${String(gameStore.statData._当前区域 ?? '')}|${String(gameStore.statData._楼层数 ?? '')}|${String(gameStore.isInitialized)}`,
  () => ensureDungeonMapForCurrentFloor(),
  { immediate: true },
);

watch(
  () => gameStore.fastActionEvents.length,
  (count, previousCount) => {
    if (!gameStore.fastModeEnabled || count <= previousCount) return;
    scrollStoryTextToBottom();
  },
);

watch(
  () => gameStore.isGenerating,
  (isGenerating, wasGenerating) => {
    if (isGenerating) {
      closeOptionCompletionMenu();
      closeOptionActionModeMenu();
    }
    if (!isGenerating) {
      inputWaitingDotsStep.value = 1;
      if (wasGenerating && isAutoScrollTopOnReplyEnabled.value) {
        scrollStoryTextToReplyTop();
      }
    }
  },
);

watch(
  () => gameStore.isEditing,
  (isEditing, wasEditing) => {
    if (!isEditing && wasEditing) {
      scrollStoryTextToBottom();
    }
  },
);

watch(isCompactPortraitLayout, isCompact => {
  if (!isCompact) return;
  activeModal.value = null;
  gameStore.isSaveLoadOpen = false;
  isVariableUpdateOpen.value = false;
  isGlossaryReferenceOpen.value = false;
  closeOptionCompletionMenu();
  closeOptionActionModeMenu();
});

// ══════════════════════════════════════════════════════════════
//  [Leave] Map selection and room transitions
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
      神谕淫纹室: ['符文精灵'],
      女神的产房: ['脐带触手'],
    },
  },
};

const LORD_MONSTER_BY_AREA: Record<string, string> = {
  粘液之沼: '普莉姆',
  发情迷雾森林: '宁芙',
  喷精泉眼: '温蒂尼',
  触手菌窟: '玛塔',
  肉欲食人花圃: '罗丝',

  禁忌图书馆: '厄休拉',
  呻吟阅览室: '希尔薇',
  催情墨染湖: '因克',
  性癖记录馆: '阿卡夏',
  淫乱教职工宿舍: '多萝西',

  欲望监狱: '维罗妮卡',
  吸血鬼古堡: '伊丽莎白',
  调教审判庭: '尤斯蒂娅',
  触手水牢: '克拉肯',
  人偶工坊: '布偶',

  虚空宫殿: '赛琳娜',
  镜之舞厅: '米拉',
  双子寝宫: '梦魔双子',
  春梦回廊: '摩尔',
  极乐宴会厅: '贝希摩斯',

  交媾祭坛: '奥赛罗',
  圣水之海: '利维坦',
  苦修之路: '佩恩',
  神谕淫纹室: '西格尔',
  女神的产房: '盖亚',
};

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

// ── 事件房：离开时清空当前事件、判定结果与结算进度（含旧存档中的陷阱房） ──
const EVENT_ROOM_EXIT_FIELDS: Record<string, any> = { $当前事件: '', 判定结果: '', $事件操作: { ...EMPTY_EVENT_ACTION_STATE } };
const isLeavingEventRoom = (roomType: string): boolean => roomType === '事件房' || roomType === '陷阱房';

// ════════ 事件结算（配置见 events/eventOutcomes.ts） ════════
// 判定写入后 $事件操作.阶段 = 待结算 → 这里执行 apply（立即结算）→ 需要操作的进入「待操作」，
// 在选项区显示结算按钮 → 结算面板 / 事件战斗 / 小游戏完成后标记「已完成」。
// 每次结算的说明写入 $事件结算通知，随下一条 user 楼层注入给 LLM。

const BASIC_CARD_NAMES = ['普通物理攻击', '普通魔法攻击', '普通护盾', '普通闪避'] as const;

const countRelicInMap = (relics: Record<string, number>, id: string): number => {
  const relic = getRelicById(id);
  if (!relic) return 0;
  const names = [relic.name, relic.id, ...(LEGACY_RELIC_NAMES_BY_ID[id] ?? [])];
  return names.reduce((max, name) => Math.max(max, Math.max(0, Math.floor(Number(relics[name] ?? 0)) || 0)), 0);
};

/** 与 displayMaxHp 相同的口径：基础上限经难度修正 + 圣遗物被动加成 */
const computeEffectiveMaxHp = (baseMaxHp: number, relics: Record<string, number>): number => {
  const adjusted = adjustBaseMaxHpForCustomDifficulty(Math.max(1, Math.floor(baseMaxHp)));
  const bonus = BLOODPOOL_PASSIVE_MAX_HP_RELICS.reduce((sum, item) => sum + countRelicInMap(relics, item.id) * item.bonus, 0);
  return Math.max(1, adjusted + bonus);
};

const currentFloorNumber = () => getFloorNumberForArea(((gameStore.statData._当前区域 as string) || '').trim());

const createSettlementDraft = (base?: Record<string, any>): SettlementDraft =>
  reactive(
    new SettlementDraft(base ?? (gameStore.statData as Record<string, any>), {
      floor: currentFloorNumber(),
      effectiveMaxHp: computeEffectiveMaxHp,
    }),
  ) as unknown as SettlementDraft;

/** 事件可给出的卡牌：非敌人、非事件、非诅咒、非起始基础牌；多体系卡需已携带全部所需魔法书 */
const eventRewardableCards = computed<CardData[]>(() => {
  const carried = new Set<string>(['基础', ...carriedMagicBooks.value]);
  return allCardsForTest.value.filter(
    card =>
      card.category !== EVENT_CARD_CATEGORY &&
      card.type !== CardType.CURSE &&
      !EXCLUDED_VICTORY_REWARD_CARD_IDS.has(card.id) &&
      (card.requiredCategories ?? []).every(category => carried.has(category)),
  );
});

const buildSettlementPools = (): SettlementPools => {
  const floor = currentFloorNumber();
  return {
    floor,
    carriedCategories: ['基础', ...carriedMagicBooks.value],
    rewardableCards: eventRewardableCards.value,
    rewardActiveSkills: rewardActiveSkillPool.value,
    relicPool: selectableRelicPool.value,
    curseNames: [...LUST_BOOK_CURSE_WHITELIST],
    basicCardNames: BASIC_CARD_NAMES.filter(name => Boolean(getCardByName(name))),
    resolveCard: name => cardByNameForTest.value.get(name) ?? getCardByName(name),
    resolveRelic: key => getRelicByName(key) ?? getRelicById(key),
    resolveActive: name => activeSkillByNameMap.value.get(name) ?? undefined,
    getEnemyDeck: name => getEnemyByName(name, floor)?.deck ?? [],
  };
};

const eventActionState = computed(() => normalizeEventActionState(gameStore.statData.$事件操作));
const eventActionSpec = computed(() => {
  const state = eventActionState.value;
  const verdict = normalizeEventVerdict(state.结局);
  return state.事件 && verdict ? getEventOutcomeSpec(state.事件, verdict) : null;
});
const isEventRoomContext = computed(() => ((gameStore.statData._当前房间类型 as string) || '').trim() === '事件房');
const pendingEventAction = computed<OutcomeAction | null>(() =>
  isEventRoomContext.value && eventActionState.value.阶段 === '待操作' ? (eventActionSpec.value?.action ?? null) : null,
);

interface EventActionData {
  memo: Record<string, unknown>;
  minigame?: unknown;
  /** 小游戏过程中的所得记录（退出时汇总为一条结算说明） */
  log?: string[];
}

const parseEventActionData = (raw: string): EventActionData => {
  if (!raw) return { memo: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<EventActionData> | null;
    return {
      memo: parsed && typeof parsed.memo === 'object' && parsed.memo ? parsed.memo : {},
      minigame: parsed?.minigame,
      log: Array.isArray(parsed?.log) ? parsed.log.filter((item): item is string => typeof item === 'string') : [],
    };
  } catch {
    return { memo: {} };
  }
};

const buildOutcomeContext = (draft: SettlementDraft, memo?: Record<string, unknown>): OutcomeContext => ({
  draft,
  pools: buildSettlementPools(),
  floor: currentFloorNumber(),
  opponent: String(gameStore.statData._对手名称 ?? '').trim(),
  random: Math.random,
  memo: memo ?? parseEventActionData(eventActionState.value.数据).memo,
});

const eventSettlementBusy = ref(false);
// shallowRef：草稿本身已是 reactive，避免 ref 深层解包改变 SettlementDraft 的类型
const eventSettlementSession = shallowRef<{
  draft: SettlementDraft;
  steps: SettlementStep[];
  pools: SettlementPools;
  headerLabel: string;
} | null>(null);

/**
 * 事件结算在解析回复之后才写入，gameStore 的解析期地图钩子看不到这些新状态，
 * 这里对新获得的 [被标记] / [逾期] 补上同样的地图改写。
 */
const applyNewStatusMapEffects = (fields: Record<string, any>, previousStatuses: readonly string[]) => {
  if (!Array.isArray(fields.$负面状态)) return;
  const nextStatuses = normalizeNegativeStatusList(fields.$负面状态);
  const newlyMarked = !previousStatuses.includes('[被标记]') && nextStatuses.includes('[被标记]');
  const newlyOverdue =
    !hasNegativeStatus(previousStatuses, '逾期') && hasNegativeStatus(nextStatuses, '逾期') && currentFloorNumber() === OVERDUE_FLOOR;
  if (!newlyMarked && !newlyOverdue) return;
  let nextMap = normalizeDungeonMap(fields.$地图 ?? gameStore.statData.$地图);
  if (nextMap.length !== MAP_ROUTE_COUNT) return;
  const currentY = Array.isArray(gameStore.statData.$路径) ? gameStore.statData.$路径.length : 0;
  if (newlyMarked) nextMap = replaceFutureRoomsWithBattle(nextMap, currentY);
  if (newlyOverdue) nextMap = replaceFutureRoomsWithBattleByChance(nextMap, currentY, OVERDUE_BATTLE_CHANCE);
  fields.$地图 = nextMap;
};

/** 把一次结算的草稿写入变量：获得圣遗物的即时效果、结算说明、进度；提交后再排入强制诅咒替换 */
const commitSettlementDraft = async (
  draft: SettlementDraft,
  options: { phase?: EventActionPhase; data?: string; extraNotices?: string[] } = {},
): Promise<boolean> => {
  const state = eventActionState.value;
  const fields = draft.toFields();
  if (draft.addedRelics.length > 0) {
    const acquisition = buildRelicAcquisitionEffects(draft.addedRelics);
    if (acquisition.goldDelta > 0) {
      fields._金币 = Math.max(0, Math.floor(Number(fields._金币 ?? draft.gold))) + acquisition.goldDelta;
    }
    Object.assign(fields, acquisition.fields);
  }
  applyNewStatusMapEffects(fields, normalizeNegativeStatusList(gameStore.statData.$负面状态));
  const lines = [...(options.extraNotices ?? []), ...draft.notices];
  const notice = formatEventSettlementNotice(state.事件 || '事件', state.结局, lines);
  if (notice) fields.$事件结算通知 = [...normalizeNoticeList(gameStore.statData.$事件结算通知), notice];
  if (options.phase !== undefined || options.data !== undefined) {
    fields.$事件操作 = { ...state, 阶段: options.phase ?? state.阶段, 数据: options.data ?? state.数据 };
  }
  const ok = await gameStore.updateStatDataFields(fields);
  if (!ok) {
    toastr.warning('事件结算写入失败，请重试。');
    return false;
  }
  if (draft.addedRelics.length > 0) {
    recordEncounteredRelics(draft.addedRelics.map(relic => relic.id));
    for (const relic of draft.addedRelics) enqueueForcedCurseReplacementForRelic(relic);
  }
  for (const curseName of draft.curses) {
    forcedCurseReplacementQueue.value.push({
      relicId: '',
      relicName: state.事件 || '事件',
      curseName,
      sourceText: `事件【${state.事件 || '事件'}】的代价降临`,
    });
  }
  return true;
};

// ── 判定后的立即结算 ──
let eventApplyRunning = false;
const runEventApplyPhase = async () => {
  const state = eventActionState.value;
  if (state.阶段 !== '待结算' || eventApplyRunning || gameStore.isGenerating) return;
  eventApplyRunning = true;
  try {
    const spec = eventActionSpec.value;
    const memo: Record<string, unknown> = {};
    const draft = createSettlementDraft();
    const ctx = buildOutcomeContext(draft, memo);
    spec?.apply?.(ctx);
    const needsAction = Boolean(spec?.action) && (spec?.actionWhen ? spec.actionWhen(ctx) : true);
    const ok = await commitSettlementDraft(draft, { phase: needsAction ? '待操作' : '已完成', data: JSON.stringify({ memo }) });
    if (ok && needsAction && spec?.action) showGameFeedback(`事件结算：${spec.action.label}`);
  } catch (error) {
    console.error('[Event] 事件结算失败', error);
  } finally {
    eventApplyRunning = false;
  }
};

watch(
  () => [eventActionState.value.阶段, eventActionState.value.事件, eventActionState.value.结局, gameStore.isGenerating] as const,
  () => {
    void runEventApplyPhase();
  },
  { immediate: true },
);

// ── 结算按钮 ──
const eventActionDisabled = computed(
  () =>
    gameStore.isGenerating ||
    eventSettlementBusy.value ||
    Boolean(eventSettlementSession.value) ||
    Boolean(activeMinigame.value) ||
    showCombat.value,
);

const openSettlementSession = (draft: SettlementDraft, steps: SettlementStep[], pools: SettlementPools) => {
  const state = eventActionState.value;
  eventSettlementSession.value = { draft, steps, pools, headerLabel: `事件【${state.事件}】${state.结局}` };
};

const handleEventActionClick = async () => {
  const action = pendingEventAction.value;
  if (!action || eventActionDisabled.value) return;
  if (activeForcedCurseReplacement.value) {
    showGameFeedback('必须先完成诅咒替换。');
    return;
  }
  if (action.type === 'steps') {
    const draft = createSettlementDraft();
    const ctx = buildOutcomeContext(draft);
    const steps = action.build(ctx);
    if (steps.length === 0) {
      await commitSettlementDraft(draft, { phase: '已完成' });
      return;
    }
    openSettlementSession(draft, steps, ctx.pools);
    return;
  }
  if (action.type === 'battle') {
    await launchEventBattle(action);
    return;
  }
  await openEventMinigame(action);
};

const completeEventSettlementSession = async () => {
  const session = eventSettlementSession.value;
  if (!session || eventSettlementBusy.value) return;
  eventSettlementBusy.value = true;
  try {
    const ok = await commitSettlementDraft(session.draft, { phase: '已完成' });
    if (ok) eventSettlementSession.value = null;
  } finally {
    eventSettlementBusy.value = false;
  }
};

const abandonEventAction = async () => {
  const action = pendingEventAction.value;
  if (!action || eventActionDisabled.value) return;
  const draft = createSettlementDraft();
  draft.notice(`<user>放弃了「${action.label}」，没有进行这一步结算`);
  await commitSettlementDraft(draft, { phase: '已完成' });
};

// ── 事件战斗 ──
const activeEventBattle = ref<{ eventName: string; lord: boolean; noPenalty: boolean; preBattleHp: number } | null>(null);

/** 漫游的领主：本层其它区域的领主（排除本区域领主与沉睡的梦魔双子） */
const pickRoamingLord = (area: string): string | null => {
  const floorName = getFloorForArea(area) ?? '';
  const candidates = (FLOOR_MAP[floorName] ?? [])
    .filter(name => name !== area)
    .map(name => LORD_MONSTER_BY_AREA[name])
    .filter((name): name is string => Boolean(name) && name !== '梦魔双子');
  return pickOne(candidates);
};

/** 进入事件房时为需要出场对象的事件抽定 _对手名称 */
const pickEventOpponent = (eventName: string, area: string): string | null => {
  if (eventName === '漫游的领主') return pickRoamingLord(area);
  if (eventName === '借梦' || eventName === '发情季' || eventName === '共梦') return pickBattleMonsterByArea(area);
  return null;
};

const launchEventBattle = async (action: Extract<OutcomeAction, { type: 'battle' }>) => {
  const area = ((gameStore.statData._当前区域 as string) || '').trim();
  let opponent = String(gameStore.statData._对手名称 ?? '').trim();
  if (!opponent) {
    opponent = (action.lord ? pickRoamingLord(area) : pickBattleMonsterByArea(area)) ?? '';
    if (!opponent) {
      toastr.warning('当前未找到可战斗的对手。');
      return;
    }
    if (!(await gameStore.updateStatDataFields({ _对手名称: opponent }))) return;
  }
  activeEventBattle.value = {
    eventName: eventActionState.value.事件,
    lord: action.lord === true,
    noPenalty: action.noPenalty === true,
    preBattleHp: displayHp.value,
  };
  const launched = await launchCombat(opponent, 'event', { weakenedLord: action.lord === true });
  if (!launched) activeEventBattle.value = null;
};

/** 事件战斗结束（胜负均算完成）：直接写入进度，战斗叙事照常注入 */
const markEventBattleFinished = async (outcome: CombatOutcome) => {
  const state = eventActionState.value;
  if (state.阶段 !== '待操作') return;
  await gameStore.updateStatDataFields({ $事件操作: { ...state, 阶段: '已完成' } });
  if (outcome === 'escape') showGameFeedback('事件战斗已结束。');
};

// ── 小游戏 ──
type ActiveMinigame = { kind: '大转盘' } | { kind: '扭蛋机' } | { kind: '占卜'; state: DivinationState };
const activeMinigame = ref<ActiveMinigame | null>(null);
const minigameBusy = ref(false);

const wheelSectors = computed<WheelSector[]>(() => buildWheelSectors(currentFloorNumber()));
const wheelSpinCost = computed(() => getWheelSpinCost(currentFloorNumber()));
const wheelJackpotTaken = computed(() => {
  const minigame = parseEventActionData(eventActionState.value.数据).minigame as { jackpotTaken?: boolean } | undefined;
  return minigame?.jackpotTaken === true;
});

const buildEventActionData = (patch: Partial<EventActionData>): string => {
  const current = parseEventActionData(eventActionState.value.数据);
  return JSON.stringify({ ...current, ...patch });
};

const openEventMinigame = async (action: Extract<OutcomeAction, { type: 'minigame' }>) => {
  if (action.game === '占卜') {
    const saved = normalizeDivinationState(parseEventActionData(eventActionState.value.数据).minigame);
    const state = saved && !saved.finished ? saved : createDivinationState(currentFloorNumber(), action.plays ?? 3);
    if (!saved) {
      // 先保存布局，避免刷新后重新随机
      const ok = await gameStore.updateStatDataFields({
        $事件操作: { ...eventActionState.value, 数据: buildEventActionData({ minigame: state }) },
      });
      if (!ok) return;
    }
    activeMinigame.value = { kind: '占卜', state };
    return;
  }
  activeMinigame.value = { kind: action.game };
};

/** 应用一次小游戏所得：费用与奖品同一次写入，所得记入日志 */
const applyMinigamePrize = async (prize: MinigamePrize, cost: number, label: string, minigamePatch?: unknown) => {
  if (minigameBusy.value) return;
  minigameBusy.value = true;
  try {
    const draft = createSettlementDraft();
    if (cost > 0) draft.gold = Math.max(0, draft.gold - cost);
    const pools = buildSettlementPools();
    switch (prize.kind) {
      case 'gold':
        draft.changeGold(rollGoldAmount(prize));
        break;
      case 'heal':
        draft.healPercentOfMax(prize.ratio);
        break;
      case 'loseHp':
        draft.loseHpPercentOfCurrent(prize.ratio);
        break;
      case 'maxHp':
        draft.changeMaxHp(prize.amount);
        break;
      case 'mana':
        draft.changeMana(prize.amount);
        break;
      case 'maxDice': {
        const before = draft.maxDice;
        draft.maxDice += prize.amount;
        draft.notice(`最大点数 ${before} → ${draft.maxDice}`);
        break;
      }
      case 'relic': {
        const relic = pickRelics(pools, prize.rarity, 1)[0];
        if (relic) draft.addRelic(relic);
        else draft.changeGold(10);
        break;
      }
      case 'consumable':
        draft.addConsumable(prize.name, prize.description, prize.heal);
        break;
      case 'curse': {
        const curseName = pickOne(pools.curseNames.filter(name => Boolean(getCardByName(name))));
        if (curseName) draft.queueCurse(curseName);
        break;
      }
      case 'nothing':
        break;
    }
    const current = parseEventActionData(eventActionState.value.数据);
    const resultText = draft.notices.length > 0 ? draft.notices.join('，') : '一无所获';
    const logLine = `${label}${cost > 0 ? `（花费${cost}金币）` : ''}：${resultText}`;
    const data = JSON.stringify({
      ...current,
      ...(minigamePatch !== undefined ? { minigame: minigamePatch } : {}),
      log: [...(current.log ?? []), logLine],
    });
    // 小游戏中途只写变量与日志，说明在离开时汇总注入
    draft.notices = [];
    await commitSettlementDraft(draft, { data });
  } finally {
    minigameBusy.value = false;
  }
};

const handleWheelSpin = (sector: WheelSector) => {
  const minigame = parseEventActionData(eventActionState.value.数据).minigame as Record<string, unknown> | undefined;
  const patch = sector.jackpot ? { ...(minigame ?? {}), jackpotTaken: true } : undefined;
  void applyMinigamePrize(sector.prize, wheelSpinCost.value, `转盘转到「${sector.label}」`, patch);
};

const handleGachaPull = (machine: GachaMachine, prize: WeightedPrize) => {
  void applyMinigamePrize(prize.prize, machine.cost, `${machine.label}扭出「${prize.label}」`);
};

const handleDivinationUpdate = async (state: DivinationState) => {
  if (activeMinigame.value?.kind !== '占卜') return;
  activeMinigame.value = { kind: '占卜', state };
  await gameStore.updateStatDataFields({
    $事件操作: { ...eventActionState.value, 数据: buildEventActionData({ minigame: state }) },
  });
};

const handleDivinationFinish = async (items: DivinationItem[]) => {
  const draft = createSettlementDraft();
  const pools = buildSettlementPools();
  const steps: SettlementStep[] = [];
  const found = items.map(item =>
    item.kind === 'jackpot' ? '大奖' : item.kind === 'card' ? `${item.cardRarity}卡牌` : `${item.gold ?? 0}金币`,
  );
  draft.notice(found.length > 0 ? `水晶球中被完全揭开的：${found.join('、')}` : '水晶球中没有任何物品被完全揭开');
  for (const item of items) {
    if (item.kind === 'gold') {
      draft.changeGold(item.gold ?? 0);
    } else if (item.kind === 'jackpot') {
      const relics = pickRelics(pools, '稀有', 1);
      if (relics.length > 0) steps.push({ kind: 'relic', title: '占卜：水晶球中的大奖', relics });
    } else if (item.cardRarity === '诅咒') {
      const curseName = pickOne(pools.curseNames.filter(name => Boolean(getCardByName(name))));
      if (curseName) steps.push({ kind: 'curse', title: '占卜：揭开的诅咒', curseName });
    } else {
      const rarity = item.cardRarity === '稀有' ? '稀有' : '普通';
      const options = rewardCardPool.value.filter(card => card.rarity === rarity && card.type !== CardType.CURSE);
      const picked: CardData[] = [];
      const pool = [...options];
      while (picked.length < 3 && pool.length > 0) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
      if (picked.length > 0) steps.push({ kind: 'cardPick', title: `占卜：${rarity}卡牌奖励`, options: picked });
    }
  }
  const log = parseEventActionData(eventActionState.value.数据).log ?? [];
  activeMinigame.value = null;
  if (steps.length === 0) {
    await commitSettlementDraft(draft, { phase: '已完成', extraNotices: log });
    return;
  }
  openSettlementSession(draft, steps, pools);
};

/** 离开转盘 / 扭蛋机：把过程日志汇总为一条结算说明 */
const finishEventMinigame = async () => {
  if (minigameBusy.value) return;
  const log = parseEventActionData(eventActionState.value.数据).log ?? [];
  const draft = createSettlementDraft();
  if (log.length === 0) draft.notice('<user>最终没有投币，离开了');
  activeMinigame.value = null;
  await commitSettlementDraft(draft, { phase: '已完成', extraNotices: log });
};

// ── 进入房间时的系统结算：延迟奖励、逐房间回复、离开本层时归还借来的招式 ──
const applyRoomEntryEffects = (
  pendingFields: Record<string, any> | undefined,
  options: { floorTransition: boolean },
): Record<string, any> | undefined => {
  const base = { ...(gameStore.statData as Record<string, any>), ...(pendingFields ?? {}) };
  const hasModifiers = normalizeCombatModifiers(base.$战斗修正).length > 0;
  const hasDelayed = normalizeDelayedRewards(base.$延迟奖励).length > 0;
  const hasTemporary = normalizeTemporaryReplacements(base.$临时替换).length > 0;
  if (!hasModifiers && !hasDelayed && !hasTemporary) return pendingFields;

  const draft = createSettlementDraft(base);
  const lines: string[] = [];
  if (options.floorTransition) {
    draft.modifiers = expireFloorCombatModifiers(draft.modifiers);
    for (const entry of draft.tempReplacements) {
      if (entry.字段 === '_技能') {
        if (draft.skills[entry.槽位] !== entry.现名) continue;
        draft.skills = draft.skills.map((name, index) => (index === entry.槽位 ? entry.原名 : name));
        draft.enchants = draft.enchants.map((enchant, index) => (index === entry.槽位 ? entry.原附魔 : enchant));
      } else {
        if (draft.actives[entry.槽位] !== entry.现名) continue;
        draft.actives = draft.actives.map((name, index) => (index === entry.槽位 ? entry.原名 : name));
      }
      lines.push(`离开本层，借来的【${entry.现名}】被收回，换回了【${entry.原名 || '空槽位'}】`);
    }
    draft.tempReplacements = [];
  }

  const heal = getRoomEntryHealFromModifiers(draft.modifiers);
  if (heal > 0) draft.heal(heal);

  const remaining: typeof draft.delayed = [];
  for (const reward of draft.delayed) {
    const left = reward.剩余房间 - 1;
    if (left > 0) {
      remaining.push({ ...reward, 剩余房间: left });
      continue;
    }
    const rarity = reward.奖励.startsWith('传奇') ? '传奇' : reward.奖励.startsWith('稀有') ? '稀有' : '普通';
    lines.push(`【${reward.来源}】的孕育期满，<user>分娩出了神赐之物`);
    const relic = pickRelics(buildSettlementPools(), rarity, 1)[0];
    if (relic) draft.addRelic(relic);
    if (reward.移除状态) draft.removeStatusByKey(reward.移除状态);
  }
  draft.delayed = remaining;

  const fields = draft.toFields();
  if (draft.addedRelics.length > 0) {
    const acquisition = buildRelicAcquisitionEffects(draft.addedRelics);
    if (acquisition.goldDelta > 0) fields._金币 = Math.max(0, Math.floor(Number(fields._金币 ?? draft.gold))) + acquisition.goldDelta;
    Object.assign(fields, acquisition.fields);
    recordEncounteredRelics(draft.addedRelics.map(relic => relic.id));
    for (const relic of draft.addedRelics) enqueueForcedCurseReplacementForRelic(relic);
  }
  const allLines = [...lines, ...draft.notices];
  if (allLines.length > 0) {
    fields.$事件结算通知 = [
      ...normalizeNoticeList(base.$事件结算通知),
      ['进入新房间时的系统结算：', ...allLines.map(line => `- ${line}`)].join('\n'),
    ];
  }
  return { ...(pendingFields ?? {}), ...fields };
};

/** 状态面板：限时效果、延迟奖励、借来的招式 */
const timedEffectEntries = computed(() => [
  ...normalizeCombatModifiers(gameStore.statData.$战斗修正).map(modifier => ({
    name: modifier.来源 || '限时效果',
    description: describeCombatModifier(modifier),
  })),
  ...normalizeDelayedRewards(gameStore.statData.$延迟奖励).map(reward => ({
    name: reward.来源 || '延迟奖励',
    description: `${reward.剩余房间}个房间后获得${reward.奖励}`,
  })),
  ...normalizeTemporaryReplacements(gameStore.statData.$临时替换).map(entry => ({
    name: entry.来源 || '借来的招式',
    description: `【${entry.现名}】离开本层时归还，换回【${entry.原名 || '空槽位'}】`,
  })),
]);

/** 脐带：每进入一个房间回复生命（叠加在本次移动已写入的生命值之上，不超过生命上限） */
const withUmbilicalCordHeal = (fields: Record<string, any> | undefined): Record<string, any> | undefined => {
  const count = getOwnedRelicCountById(EVENT_RELIC_ID.UMBILICAL_CORD);
  if (count <= 0) return fields;
  const pendingHp = Number(fields?._血量);
  const baseHp = Number.isFinite(pendingHp) ? pendingHp : toNonNegativeInt(gameStore.statData._血量, 0);
  return {
    ...(fields ?? {}),
    _血量: Math.min(displayMaxHp.value, Math.max(0, Math.floor(baseHp)) + UMBILICAL_CORD_HEAL_PER_ROOM * count),
  };
};

// ── Room type → $统计 field mapping ──
const ROOM_STAT_KEY: Record<string, string> = {
  战斗房: '累计经过战斗',
  宝箱房: '累计经过宝箱',
  商店房: '累计经过商店',
  温泉房: '累计经过温泉',
  神像房: '累计经过神像',
  事件房: '累计经过事件',
};
const normalizePendingStatDataFields = (fields: Record<string, any>): Record<string, any> | undefined =>
  Object.keys(fields).length > 0 ? fields : undefined;

const buildWorldMetaGrowthPendingFields = (): Record<string, any> | undefined => {
  if (!hasMagicHatMetaGrowth('world')) return undefined;

  const roll = Math.floor(Math.random() * 3);
  if (roll === 0) {
    return {
      _血量上限: Math.max(1, toNonNegativeInt(gameStore.statData._血量上限, 1)) + 1,
    };
  }
  if (roll === 1) {
    const nextInitialMp = Math.max(1, toNonNegativeInt(gameStore.statData.$初始魔量, 1)) + 1;
    return {
      $初始魔量: nextInitialMp,
      $魔量: Math.max(toNonNegativeInt(gameStore.statData.$魔量, 1) + 1, nextInitialMp),
    };
  }
  return {
    _金币: Math.max(0, toNonNegativeInt(gameStore.statData._金币, 0)) + 1,
  };
};

interface QueuedMapAction {
  actionText: string;
  targetRoomType: string;
  pendingStatDataFields?: Record<string, any>;
}

const buildQueuedMapAction = (node: MapNodeView): QueuedMapAction | null => {
  const currentArea = ((gameStore.statData._当前区域 as string) || '').trim();
  const currentRoomType = ((gameStore.statData._当前房间类型 as string) || '').trim();
  const worldGrowthPendingFields = buildWorldMetaGrowthPendingFields();

  if (node.kind === 'floor') {
    const nextArea = node.areaName ?? null;
    if (!nextArea) {
      toastr.warning('当前楼层没有可进入的下一区域。');
      return null;
    }
    const pendingStatDataFields: Record<string, any> = {
      ...(currentRoomType === '领主房' ? { _血量: nextFloorRecoveryHpAfterLord.value } : {}),
      ...(isLeavingEventRoom(currentRoomType) ? EVENT_ROOM_EXIT_FIELDS : {}),
      ...(currentArea === '魔女的小窝'
        ? buildInventoryUpdateFields({
            _圣遗物: buildStartingRelicInventoryForMetaGrowths(inventoryRelicMap.value),
          })
        : {}),
      ...(worldGrowthPendingFields ?? {}),
    };
    if (nextArea === FINAL_AREA_NAME) {
      gameStore.setPendingRoomChanges({
        area: FINAL_AREA_NAME,
        roomType: '事件房',
        resetRoomCounter: true,
        resetPath: true,
        map: [],
        incrementKeys: ['当前层已过房间', '累计已过房间', '累计经过事件'],
        enemyName: '',
      });
      return {
        targetRoomType: FINAL_AREA_NAME,
        actionText:
          '<user>选择了继续前进，推开第五层领主房后出现的陌生门，进入了终极区域。这里是欲望之神的私人空间，地牢的一切法则在门后完全失效；当前在场人物只有欲望之神。请根据世界书【终极区域】与【欲望之神】继续剧情。',
        pendingStatDataFields: {
          ...pendingStatDataFields,
          在场人物: ['欲望之神'],
          $当前事件: FINAL_AREA_NAME,
        },
      };
    }

    const generatedMap = generateDungeonMap(Math.random, nextArea);
    const statuses = normalizeNegativeStatusList(gameStore.statData.$负面状态);
    const markedMap = statuses.includes('[被标记]') ? replaceFutureRoomsWithBattle(generatedMap, 0) : generatedMap;
    const nextFloorNumber = getFloorNumberForArea(nextArea);
    const isOverdue = hasNegativeStatus(statuses, '逾期');
    const nextMap = isOverdue && nextFloorNumber === OVERDUE_FLOOR
      ? replaceFutureRoomsWithBattleByChance(markedMap, 0, OVERDUE_BATTLE_CHANCE)
      : markedMap;
    // 离开第二层后，[逾期] 自动解除
    if (isOverdue && nextFloorNumber > OVERDUE_FLOOR) {
      pendingStatDataFields.$负面状态 = removeNegativeStatus(statuses, '逾期');
    }
    gameStore.setPendingRoomChanges({
      area: nextArea,
      roomType: '宝箱房',
      resetRoomCounter: true,
      resetPath: true,
      map: nextMap,
      incrementKeys: ['当前层已过房间', '累计已过房间', '累计经过宝箱'],
      enemyName: '',
    });
    return {
      targetRoomType: '宝箱房',
      actionText: `<user>选择了继续前进，进入了${nextArea}的起点宝箱房。`,
      pendingStatDataFields:
        normalizePendingStatDataFields(
          applyRoomEntryEffects(withUmbilicalCordHeal(pendingStatDataFields), { floorTransition: true }) ?? {},
        ) ?? undefined,
    };
  }

  const roomType = node.kind === 'boss' ? '领主房' : node.roomType;
  const idolVariantAtEntry =
    roomType === '神像房'
      ? node.idolType === '黑神像'
        ? 'black'
        : node.idolType === '白神像'
          ? 'white'
          : chooseIdolVariant()
      : null;
  const idolTypeAtEntry =
    idolVariantAtEntry === 'black' ? '黑神像' : idolVariantAtEntry === 'white' ? '白神像' : undefined;
  const mapWithIdolVariant =
    node.kind === 'room' && idolTypeAtEntry && currentDungeonMap.value.length === MAP_ROUTE_COUNT
      ? currentDungeonMap.value.map(route => route.map(mapNode => ({ ...mapNode })))
      : undefined;
  if (mapWithIdolVariant && node.kind === 'room' && idolTypeAtEntry) {
    const rowIndex = node.y - 1;
    for (const route of mapWithIdolVariant) {
      const mapNode = route[rowIndex];
      if (mapNode?.x === node.x && mapNode.房间类型 === '神像房') {
        mapNode.神像类型 = idolTypeAtEntry;
      }
    }
  }
  const incrementKeys = ['当前层已过房间', '累计已过房间'];
  const statKey = ROOM_STAT_KEY[roomType];
  if (statKey) incrementKeys.push(statKey);
  const encounterMonster = roomType === '领主房' ? pickLordMonsterByArea(currentArea) : roomType === '战斗房' ? pickBattleMonsterByArea(currentArea) : null;
  const triggeredEvents = normalizeTriggeredEvents(gameStore.statData.$已触发事件);
  const eventName = roomType === '事件房' ? pickEventForArea(currentArea, triggeredEvents) : null;
  // 需要出场对象的事件（漫游的领主 / 借梦 / 发情季 / 共梦）在进房时抽定，与战斗房一样写入 _对手名称
  const eventOpponent = eventName ? pickEventOpponent(eventName, currentArea) : null;
  let pendingStatDataFields: Record<string, any> | undefined = isLeavingEventRoom(currentRoomType)
    ? { ...EVENT_ROOM_EXIT_FIELDS }
    : undefined;
  if (roomType === '事件房') {
    pendingStatDataFields = {
      ...(pendingStatDataFields ?? {}),
      $当前事件: eventName ?? '',
      判定结果: '',
      $事件操作: { ...EMPTY_EVENT_ACTION_STATE },
      ...(eventName && !triggeredEvents.includes(eventName)
        ? { $已触发事件: [...triggeredEvents, eventName] }
        : {}),
    };
  }
  if (worldGrowthPendingFields) {
    pendingStatDataFields = { ...(pendingStatDataFields ?? {}), ...worldGrowthPendingFields };
  }
  pendingStatDataFields = applyRoomEntryEffects(withUmbilicalCordHeal(pendingStatDataFields), { floorTransition: false });

  gameStore.setPendingRoomChanges({
    roomType,
    incrementKeys,
    pathEntry: node.kind === 'room' ? { x: node.x, 房间类型: roomType } : undefined,
    ...(mapWithIdolVariant ? { map: mapWithIdolVariant } : {}),
    enemyName: encounterMonster ?? eventOpponent ?? '',
  });
  const enterText =
    roomType === '神像房' && idolTypeAtEntry
      ? `进入了神像房，本房间为${idolTypeAtEntry}`
      : (roomType === '战斗房' || roomType === '领主房') && encounterMonster
      ? `进入了${roomType}并遭遇了${roomType === '领主房' && encounterMonster === '梦魔双子' ? '沉睡的梦魔双子' : encounterMonster}`
      : roomType === '事件房' && eventName
        ? `进入了${roomType}的房间，当前事件为${eventName}${eventOpponent ? `，出场的对象为${eventOpponent}` : ''}`
        : `进入了${roomType}的房间`;
  return {
    targetRoomType: roomType,
    actionText: `<user>选择了继续前进，${enterText}。`,
    pendingStatDataFields,
  };
};

const handleMapNodeClick = async (node: MapNodeView) => {
  if (gameStore.isGenerating || !node.isAvailable) return;
  if (activeForcedCurseReplacement.value) {
    toastr.warning('必须先完成诅咒替换。');
    return;
  }
  if (pendingEventAction.value) {
    toastr.warning(`请先完成事件结算：${pendingEventAction.value.label}`);
    return;
  }
  resetShopSession();
  idolRoomMapExitReady.value = false;
  const action = buildQueuedMapAction(node);
  if (!action) return;
  activeModal.value = null;
  gameStore.setPendingStatDataChanges(action.pendingStatDataFields ?? null);
  await submitGameAction(appendInputToMapRebirthAction(action.actionText), action.targetRoomType, 'map');
};

const finishChestRoom = async () => {
  if (gameStore.isGenerating || chestCollecting.value || chestStage.value !== 'opened') return;
  const collectedRelics = chestRewardRelics.value.filter((_, index) => chestRewardCollectedFlags.value[index]);
  let nextRelics: Record<string, number> = inventoryRelicMap.value;
  for (const relic of collectedRelics) {
    nextRelics = buildNextRelicInventory(relic, nextRelics);
  }
  if (collectedRelics.length > 0) {
    const acquisition = buildRelicAcquisitionEffects(collectedRelics);
    const currentGold = Math.max(0, Math.floor(Number(gameStore.statData._金币 ?? 0)));
    gameStore.setPendingStatDataChanges({
      ...(acquisition.goldDelta > 0 ? { _金币: currentGold + acquisition.goldDelta } : {}),
      ...acquisition.fields,
      ...buildInventoryUpdateFields({ _圣遗物: nextRelics }),
    });
  }
  const relicNameText = collectedRelics.map(relic => relic.name).join('、');
  await runSceneTransition(() => closeChestView());
  const rewardText = relicNameText ? `并从中获取了圣遗物${relicNameText}` : '，没有带走任何圣遗物';
  await submitGameAction(
    appendInputToMapRebirthAction(`<user>打开了箱子${rewardText}，完成了当前房间的探索。`),
    '宝箱房',
    'chest',
  );
  await openMapAfterSpecialRoom();
};

const finishIdolRoom = async () => {
  if (gameStore.isGenerating || !showIdolView.value || idolDiceRolling.value || !idolHasAssignedDice.value) return;
  if (idolOffering.value) return;
  const rewards = idolRewardEntries.value;
  const invalidReward = rewards.find(reward => !canAssignIdolTarget(reward.target, reward.diceIndex));
  if (invalidReward) {
    resetIdolDiceAfterInvalidDrop(invalidReward.diceIndex, invalidReward.target);
    return;
  }
  // 供奉仪式：骰子化光融入神像、神像光柱涌起、全屏圣光（黑神像为血光）后再离开
  idolOffering.value = true;
  await new Promise(resolve => setTimeout(resolve, prefersReducedMotion() ? 200 : 1500));
  if (!showIdolView.value) return;
  const pendingFields = buildIdolPendingFields();
  if (pendingFields) gameStore.setPendingStatDataChanges(pendingFields);
  idolRoomMapExitReady.value = true;
  await runSceneTransition(() => closeIdolView());
  const rewardText = `选择膜拜了${idolVariant.value === 'black' ? '黑神像' : '白神像'}，${rewards
    .map(reward => `${reward.statueName}（${reward.rewardText}）`)
    .join('，')}`;
  await submitGameAction(
    appendInputToMapRebirthAction(`<user>${rewardText}，完成了当前房间的探索。`),
    '神像房',
    'idol',
  );
  await openMapAfterSpecialRoom();
};

const leaveIdolRoom = async () => {
  if (gameStore.isGenerating || !showIdolView.value || idolDiceRolling.value || idolOffering.value) return;
  idolRoomMapExitReady.value = true;
  const statueName = idolVariant.value === 'black' ? '黑神像' : '白神像';
  await runSceneTransition(() => closeIdolView());
  await submitGameAction(
    appendInputToMapRebirthAction(`<user>进入了${statueName}房，但没有膜拜任何神像，直接离开并打开地图选择下一目的地。`),
    '神像房',
    'idol-leave',
  );
  await openMapAfterSpecialRoom();
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
    openGmPanel();
    return;
  }

  const password = window.prompt('请输入作者测试密码');
  if (password === null) return;

  const verified = await verifyAuthorTestPassword(password);
  if (!verified) {
    showGameFeedback('密码错误。');
    return;
  }

  unlockAuthorTestAccess();
  isCombatTestUnlocked.value = true;
  showGameFeedback('作者测试已解锁，全部体系卡组已开放。');
  openGmPanel();
};

// ════════ GM 界面：战斗测试入口 + 全部事件结局触发 ════════
const gmEventFilter = ref('');

interface GmEventGroup {
  label: string;
  events: Array<{ name: string; area?: string }>;
}

const gmEventGroups = computed<GmEventGroup[]>(() => {
  const keyword = gmEventFilter.value.trim();
  const matches = (name: string, area?: string) => !keyword || name.includes(keyword) || Boolean(area?.includes(keyword));
  const groups: GmEventGroup[] = [
    { label: '全楼层', events: GLOBAL_EVENT_POOL.map(name => ({ name })) },
    ...Object.entries(FLOOR_EVENT_POOL).map(([floor, events]) => ({ label: floor, events: events.map(name => ({ name })) })),
    {
      label: '区域',
      events: Object.entries(AREA_EVENT_POOL).flatMap(([area, events]) => events.map(name => ({ name, area }))),
    },
  ];
  return groups
    .map(group => ({ ...group, events: group.events.filter(event => matches(event.name, event.area)) }))
    .filter(group => group.events.length > 0);
});

/** 结局按钮：有配置的高亮，没有配置的（只描写剧情、不结算）置灰但仍可触发 */
const getGmVerdictState = (eventName: string, verdict: EventVerdict) => {
  const spec = getEventOutcomeSpec(eventName, verdict);
  if (!spec) return { configured: false, label: '无结算' };
  const parts = [spec.apply ? '立即' : '', spec.action ? spec.action.label : ''].filter(Boolean);
  return { configured: true, label: parts.join(' + ') || '结算' };
};

const gmCurrentEventSummary = computed(() => {
  const state = eventActionState.value;
  const event = String(gameStore.statData.$当前事件 ?? '').trim();
  if (!event && !state.事件) return '当前不在事件中';
  return `当前事件：${event || state.事件}；判定：${String(gameStore.statData.判定结果 ?? '') || '未判定'}；结算阶段：${state.阶段 || '无'}${
    gameStore.statData._对手名称 ? `；出场对象：${gameStore.statData._对手名称}` : ''
  }`;
});

const gmPendingNoticeCount = computed(() => normalizeNoticeList(gameStore.statData.$事件结算通知).length);

const openGmPanel = () => {
  gameStore.loadStatData();
  activeModal.value = 'gmPanel';
};

const openCombatTestFromGm = () => {
  openCombatTestBuilder();
};

/**
 * 直接触发某事件的某个结局：切到事件房、按真实流程抽定出场对象、写入判定，
 * 随后由正常的结算流程（立即结算 + 结算按钮）接手，便于检查结算与前端表现。
 */
const gmTriggerEventOutcome = async (eventName: string, verdict: EventVerdict) => {
  if (gameStore.isGenerating || eventSettlementBusy.value) return;
  const area = ((gameStore.statData._当前区域 as string) || '').trim();
  const opponent = pickEventOpponent(eventName, area);
  eventSettlementSession.value = null;
  activeMinigame.value = null;
  const ok = await gameStore.updateStatDataFields({
    _当前房间类型: '事件房',
    $当前事件: eventName,
    判定结果: verdict,
    _对手名称: opponent ?? '',
    $事件操作: { 事件: eventName, 结局: verdict, 阶段: '待结算', 数据: '' },
  });
  if (!ok) return;
  activeModal.value = null;
  showGameFeedback(`GM：已触发【${eventName}】${verdict}${opponent ? `（出场对象：${opponent}）` : ''}`);
};

const gmClearEventNotices = async () => {
  if (await gameStore.updateStatDataFields({ $事件结算通知: [] })) showGameFeedback('GM：已清空待注入的事件结算说明。');
};

const gmResetEventState = async () => {
  eventSettlementSession.value = null;
  activeMinigame.value = null;
  if (await gameStore.updateStatDataFields({ $当前事件: '', 判定结果: '', $事件操作: { ...EMPTY_EVENT_ACTION_STATE } })) {
    showGameFeedback('GM：已重置事件状态。');
  }
};

// ════════ 一键更新变量结构 ════════
const variableMigrationApplying = ref(false);
/** 当前最新楼层相比最新变量结构缺少的变量 */
const missingVariablePaths = computed(() => (gameStore.isInitialized ? findMissingVariables(gameStore.statData) : []));

const VARIABLE_CACHE_REMINDER =
  '变量结构脚本通过 CDN 加载，浏览器可能仍在使用旧版缓存：如果更新后仍提示缺少变量，或新变量在下一轮回复后又消失，请清除浏览器缓存（或 Ctrl+F5 强制刷新）后重新打开酒馆。';

const runVariableMigration = async () => {
  if (variableMigrationApplying.value || gameStore.isGenerating) return;
  const migration = buildVariableMigration(gameStore.statData);
  if (migration.added.length === 0) {
    toastr.info(`当前存档已是最新变量结构。${VARIABLE_CACHE_REMINDER}`, '', { timeOut: 9000 });
    return;
  }
  const preview = migration.added.slice(0, 12).join('、') + (migration.added.length > 12 ? ' 等' : '');
  const confirmed = window.confirm(
    `检测到旧版变量结构，将在最新楼层补上 ${migration.added.length} 个新变量（已有数据不会被修改）：\n${preview}\n\n${VARIABLE_CACHE_REMINDER}\n\n是否立即更新？`,
  );
  if (!confirmed) return;
  variableMigrationApplying.value = true;
  try {
    const ok = await gameStore.updateStatDataFields(migration.fields);
    if (!ok) {
      toastr.warning('变量结构更新失败，请稍后重试。');
      return;
    }
    toastr.success(`已补上 ${migration.added.length} 个新变量。${VARIABLE_CACHE_REMINDER}`, '变量结构已更新', { timeOut: 12000 });
    if (migration.issues.length > 0) {
      console.warn('[VariableMigration] 补全后仍有不符合最新结构的旧值：', migration.issues);
    }
  } finally {
    variableMigrationApplying.value = false;
  }
};

/** 读档 / 进入游戏后若检测到旧版变量结构，提示一次 */
let variableMigrationHintShown = false;
watch(
  () => missingVariablePaths.value.length,
  count => {
    if (count <= 0 || variableMigrationHintShown) return;
    variableMigrationHintShown = true;
    toastr.info(`检测到旧版变量结构（缺少 ${count} 个新变量），可在「设置 → 系统 → 更新变量结构」中一键更新。`, '', { timeOut: 8000 });
  },
  { immediate: true },
);

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

const handlePlayerTurnDamageThresholdReached = () => {
  void persistMagicBookUnlock('暗影');
};

const handlePlayerMaxDiceThresholdReached = () => {
  void persistMagicBookUnlock('腐化');
};

const handleCombatEnd = async (
  outcome: CombatOutcome,
  finalStats: unknown,
  logs: string[],
  negativeEffects: string[],
  goldDelta: number = 0,
  consumedRelicIds: string[] = [],
) => {
  const context = activeCombatContext.value;
  const enemyName = combatEnemyName.value || (gameStore.statData._对手名称 as string) || '未知敌人';
  const currentNegativeStatuses = normalizeNegativeStatusList(gameStore.statData.$负面状态);
  const oldStigmataNegativeStatuses = currentNegativeStatuses.filter(status => parseStigmataNegativeStatus(status) > 0);
  const finalStigmataStacks = Math.max(
    0,
    Math.floor(
      ((finalStats as EntityStats | null | undefined)?.effects ?? [])
        .find(effect => effect.type === EffectType.STIGMATA)?.stacks ?? 0,
    ),
  );
  const inheritedStigmataStacks = Math.floor(finalStigmataStacks / 2);
  const combatNegativeEffects = [
    ...(negativeEffects ?? []),
    ...(inheritedStigmataStacks > 0 ? [formatStigmataNegativeStatus(inheritedStigmataStacks)] : []),
  ];
  const negativeStatusesRemove = [
    ...(outcome === 'win' && enemyName === '梦魔双子' ? ['[灵魂受损]'] : []),
    ...oldStigmataNegativeStatuses,
  ];
  const eventBattle = context === 'event' ? activeEventBattle.value : null;
  pendingCombatNarrative.value = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    context,
    outcome,
    enemyName,
    text: buildCombatNarrative(outcome, enemyName, context, logs ?? []),
  };

  queueCombatMvuSync(outcome, finalStats, combatNegativeEffects, negativeStatusesRemove, goldDelta, {
    noPenalty: eventBattle?.noPenalty === true,
    preBattleHp: eventBattle?.preBattleHp,
  });
  // 限时修正：本场生效的计数类修正递减，领主战修正在领主战后移除
  if (context !== 'combatTest') {
    const modifiers = normalizeCombatModifiers(gameStore.statData.$战斗修正);
    if (modifiers.length > 0) {
      gameStore.mergePendingStatDataChanges({
        $战斗修正: consumeBattleModifiers(modifiers, { isLordBattle: combatIsLordBattle.value }),
      });
    }
  }
  combatTempYinwenIndexes.value = [];
  if (eventBattle) {
    await markEventBattleFinished(outcome);
    if (outcome !== 'win') activeEventBattle.value = null;
  }
  if (Array.isArray(consumedRelicIds) && consumedRelicIds.length > 0) {
    let nextRelics: Record<string, number> = inventoryRelicMap.value;
    for (const relicId of consumedRelicIds) {
      nextRelics = removeOneRelicByIdFromInventory(relicId, nextRelics);
    }
    gameStore.mergePendingStatDataChanges(buildInventoryUpdateFields({ _圣遗物: nextRelics }));
  }
  if (context === 'shopRobbery' && enemyName === '沐芯兰') {
    await unlockAlchemySystem();
  }

  // 离开战斗：墨迹遮住画面后再切回主界面 / 奖励界面 / 商店
  await runSceneTransition(async () => {
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
        await openShopView();
        applyMerchantDefeatedShopState();
      } else if (pendingCombatNarrative.value) {
        pendingCombatNarrative.value.context = 'normal';
      }
    }

    if (context === 'chestMimic' && enemyName === '宝箱怪') {
      const droppedRelic = pickChestMimicRelicDrop();
      if (droppedRelic) {
        startMimicRelicDropFlow(droppedRelic);
        console.log('[Combat] Result:', 'WIN');
        return;
      }
    }

    continuePostCombatRewardFlow();
    console.log('[Combat] Result:', 'WIN');
  });
};

/** 主界面空闲（无弹窗、无房间场景、无战斗）时才弹出新手指引 */
const mainGuideReady = computed(
  () =>
    gameStore.isInitialized &&
    !props.showOpeningEntry &&
    activeModal.value === null &&
    !gameStore.isSaveLoadOpen &&
    !showCombat.value &&
    !showChestView.value &&
    !showShopView.value &&
    !showIdolView.value &&
    !showVictoryRewardView.value &&
    !showMimicRelicDropView.value,
);
let mainGuideTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  mainGuideReady,
  ready => {
    if (mainGuideTimer) clearTimeout(mainGuideTimer);
    mainGuideTimer = null;
    if (!ready || showMainGuide.value || hasSeenMainGuide()) return;
    const tryOpen = () => {
      mainGuideTimer = null;
      if (!mainGuideReady.value || hasSeenMainGuide()) return;
      // 等墨迹转场散开后再出现
      if (isSceneTransitionActive()) {
        mainGuideTimer = setTimeout(tryOpen, 400);
        return;
      }
      showMainGuide.value = true;
    };
    mainGuideTimer = setTimeout(tryOpen, 1200);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  viewportResizeObserver?.disconnect();
  viewportResizeObserver = null;
  mapViewportResizeObserver?.disconnect();
  mapViewportResizeObserver = null;
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleViewportResize);
    window.removeEventListener('orientationchange', handleViewportResize);
    window.visualViewport?.removeEventListener('resize', handleViewportResize);
    window.removeEventListener('resize', updateOptionActionModeMenuPosition);
    window.removeEventListener('focusout', handleViewportFocusOut);
    document.removeEventListener('fullscreenchange', handleViewportResize);
    document.removeEventListener('pointerdown', handleButtonCompletionOutsidePointerDown);
    document.removeEventListener('scroll', updateOptionActionModeMenuPosition, true);
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
  clearHotSpringCleanseTimer();
  clearGameFeedbackTimer();
  clearIdolRollTimer();
});
</script>

<style scoped>
.reward-invalid-shake {
  animation: reward-invalid-shake 0.36s ease;
}

@keyframes reward-invalid-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-8px);
  }
  40% {
    transform: translateX(8px);
  }
  60% {
    transform: translateX(-5px);
  }
  80% {
    transform: translateX(5px);
  }
}

.ui-viewport {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
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

.main-sidebar-button:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.18) drop-shadow(0 0 8px rgba(245, 170, 45, 0.5));
}

.main-sidebar-button--active,
.main-sidebar-button--highlight {
  filter: brightness(1.15) drop-shadow(0 0 8px rgba(245, 170, 45, 0.45));
}

.main-sidebar-button:disabled {
  opacity: 0.48;
}

.main-sidebar-button:focus-visible,
.status-hud-control-btn:focus-visible {
  outline: 2px solid #ffcf70;
  outline-offset: 2px;
}

.ui-viewport--compact-portrait .ui-stage {
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transform: none;
  transform-origin: center center;
}

.ui-viewport--compact-portrait .ui-stage-content {
  width: 100%;
  height: 100%;
}

.ui-viewport--compact-portrait .ui-buttons-left {
  display: none;
}

.ui-viewport--compact-portrait .ui-status-hud {
  display: none;
}

.ui-viewport--compact-portrait .ui-buttons-right {
  top: max(0.75rem, env(safe-area-inset-top));
  right: max(0.75rem, env(safe-area-inset-right));
  z-index: 90;
  transform: none;
}

.ui-viewport--compact-portrait .ui-buttons-right > :not(:first-child) {
  display: none;
}

.ui-viewport--compact-portrait .ui-main-content {
  align-items: stretch;
}

.ui-viewport--compact-portrait .ui-story-layout {
  max-width: none !important;
  padding: 0 0.75rem calc(5.45rem + env(safe-area-inset-bottom)) !important;
}

.ui-viewport--compact-portrait .ui-story-frame,
.ui-viewport--compact-portrait .ui-input-shell {
  --ui-frame-width: 40px;
  --ui-frame-outset: 8px;
  --ui-frame-bridge: 0.15rem;
}

.ui-viewport--compact-portrait .ui-story-panel {
  padding: 1.05rem !important;
}

.ui-viewport--compact-portrait .story-floor-indicator {
  top: 0.72rem;
  right: 0.95rem;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
}

.ui-viewport--compact-portrait .ui-action-buttons,
.ui-viewport--compact-portrait .ui-option-completion-wrap,
.ui-viewport--compact-portrait .spring-cleanse-float {
  display: none;
}

.ui-viewport--compact-portrait .ui-input-anchor {
  padding: 0 0.75rem max(0.75rem, env(safe-area-inset-bottom));
}

.ui-viewport--compact-portrait .ui-input-inner {
  max-width: none !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.ui-viewport--compact-portrait .ui-input-shell {
  padding: 0.55rem;
}

.ui-viewport--compact-portrait .ui-input-field {
  height: 3.5rem !important;
  min-width: 0;
  padding-left: 1rem !important;
  padding-right: 1rem !important;
  font-size: 1rem !important;
}

.ui-action-buttons {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
}

/* 选项上方：花饰分隔线（通用UI/花饰分隔线） */
.ui-ornate-divider {
  width: 100%;
  height: 18px;
  margin-bottom: 0.5rem;
  background: var(--dg-img-divider) center / min(80%, 520px) auto no-repeat;
  opacity: 0.85;
}

/* ---------- 选项点击行为：宝石扣按钮 + 黑铁菜单 ---------- */
.option-action-mode-control {
  position: absolute;
  top: -1.05rem;
  left: 0;
  z-index: 20;
}

.option-action-mode-orb {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(201, 161, 96, 0.6);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3a2c22, #16100c 70%);
  color: var(--dg-gold);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 220, 160, 0.14), 0 3px 8px rgba(0, 0, 0, 0.45);
  transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.option-action-mode-orb:hover,
.option-action-mode-orb:focus-visible,
.option-action-mode-orb[aria-expanded='true'] {
  border-color: var(--dg-gold-bright);
  color: var(--dg-gold-bright);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 220, 160, 0.2), 0 0 10px rgba(232, 170, 70, 0.3);
}

.option-action-mode-orb:focus-visible {
  outline: 2px solid var(--dg-gold);
  outline-offset: 0.2rem;
}

.option-action-mode-menu {
  position: fixed;
  z-index: 200;
  display: flex;
  width: min(13.5rem, calc(100vw - 2rem));
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.4rem;
  border: 1px solid rgba(201, 161, 96, 0.5);
  border-radius: 2px;
  background: var(--dg-bg-panel);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.08), 0 14px 28px rgba(0, 0, 0, 0.55);
}

.option-action-mode-item {
  display: flex;
  width: 100%;
  min-height: 2.35rem;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--dg-text);
  padding: 0.5rem 0.6rem;
  text-align: left;
  font-family: var(--dg-font-ui);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.option-action-mode-item:hover,
.option-action-mode-item:focus-visible {
  border-color: rgba(201, 161, 96, 0.35);
  background: var(--dg-surface-hover);
  color: var(--dg-text-strong);
}

.option-action-mode-item.is-active {
  border-color: rgba(201, 161, 96, 0.6);
  background: var(--dg-surface-active);
  color: var(--dg-gold-bright);
}

.option-action-mode-item:focus-visible {
  outline: 2px solid var(--dg-gold);
  outline-offset: 1px;
}

.option-action-mode-item__arrow {
  margin-left: auto;
  color: rgba(201, 161, 96, 0.6);
}

.option-action-mode-menu-enter-active,
.option-action-mode-menu-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
  transform-origin: left center;
}

.option-action-mode-menu-enter-from,
.option-action-mode-menu-leave-to {
  opacity: 0;
  transform: translateX(-6px) scale(0.98);
}

/* ---------- 剧情选项：黑铁条 + 金色细边 + 菱形宝石座字母 ---------- */
.option-action-btn {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 0.95rem;
  overflow: hidden;
  border: 1px solid rgba(201, 161, 96, 0.3);
  border-radius: 2px;
  background:
    linear-gradient(90deg, rgba(201, 161, 96, 0.08), transparent 38%),
    linear-gradient(180deg, rgba(47, 36, 28, 0.9), rgba(22, 16, 13, 0.92));
  color: var(--dg-text);
  padding: 0.78rem 1rem 0.78rem 0.85rem;
  text-align: left;
  font-family: var(--dg-font-serif);
  font-weight: 500;
  letter-spacing: 0.03em;
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

/* 左缘金线 */
.option-action-btn::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: linear-gradient(180deg, transparent, var(--dg-gold) 20%, var(--dg-gold) 80%, transparent);
  opacity: 0.6;
  transition: opacity 0.18s ease;
  content: '';
}

.option-action-btn:hover,
.option-action-btn:focus-visible {
  border-color: rgba(240, 208, 138, 0.7);
  color: var(--dg-text-strong);
  transform: translateX(0.22rem);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.45), 0 0 12px rgba(232, 170, 70, 0.14);
}

.option-action-btn:hover::before,
.option-action-btn:focus-visible::before { opacity: 1; }

.option-action-btn:focus-visible {
  outline: 2px solid var(--dg-gold);
  outline-offset: 2px;
}

.option-action-btn:active { transform: translateX(0.12rem); }

/* 字母座：旋转 45° 的金边黑铁菱形，字母保持正向 */
.option-action-btn__marker {
  position: relative;
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-data);
  font-size: 0.86rem;
  font-weight: 700;
  isolation: isolate;
}

.option-action-btn__marker::before {
  position: absolute;
  z-index: -1;
  inset: 0.28rem;
  border: 1px solid var(--dg-gold);
  background: radial-gradient(circle at 35% 30%, #3d2c1f, #140e0b 75%);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.6), 0 0 6px rgba(232, 170, 70, 0.18);
  transform: rotate(45deg);
  transition: background 0.18s ease, box-shadow 0.18s ease;
  content: '';
}

.option-action-btn:hover .option-action-btn__marker::before,
.option-action-btn:focus-visible .option-action-btn__marker::before {
  background: radial-gradient(circle at 35% 30%, #6a3fa8, #24123c 75%);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 8px var(--dg-arcane-glow);
}

.option-action-btn__text {
  min-width: 0;
  flex: 1 1 auto;
  overflow-wrap: anywhere;
}

.option-action-btn__arrow {
  flex: 0 0 auto;
  color: rgba(201, 161, 96, 0.5);
  transition: transform 0.18s ease, color 0.18s ease;
}

.option-action-btn:hover .option-action-btn__arrow,
.option-action-btn:focus-visible .option-action-btn__arrow {
  color: var(--dg-gold-bright);
  transform: translateX(0.16rem);
}

.menu-image-button {
  position: relative;
  display: block;
  width: min(66.6667%, 34.6667rem);
  aspect-ratio: 810 / 166;
  min-height: 0;
  margin-inline: auto;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
  transition: transform 0.18s ease, filter 0.18s ease;
}

.menu-image-button:hover:not(:disabled),
.menu-image-button:focus-visible {
  transform: translateY(-1px);
  filter: brightness(1.08) saturate(1.06);
}

.menu-image-button:focus-visible {
  outline: 2px solid rgba(251, 191, 36, 0.78);
  outline-offset: 0.25rem;
}

.menu-image-button:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
}

.menu-image-button:disabled {
  cursor: not-allowed;
  filter: grayscale(0.45);
  opacity: 0.52;
}

.special-action-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.2rem;
}

.special-action-section .action-divider-label {
  margin-bottom: 0;
}

/* ═════════ GM 界面 ═════════ */
.gm-panel {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 1rem;
  font-family: var(--dg-font-ui);
}

.gm-section {
  padding: 0.8rem 1rem;
  border: 1px solid var(--dg-line);
  background: rgba(10, 7, 9, 0.45);
}

.gm-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.gm-section__title {
  margin-bottom: 0.5rem;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 0.95rem;
  letter-spacing: 0.14em;
}

.gm-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.gm-hint {
  margin-top: 0.45rem;
  color: var(--dg-text-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

.gm-search {
  min-width: 14rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--dg-line-strong);
  background: rgba(10, 7, 9, 0.7);
  color: var(--dg-text);
  font-size: 0.85rem;
}

.gm-group {
  margin-top: 0.8rem;
}

.gm-group__label {
  margin-bottom: 0.4rem;
  color: var(--dg-gold);
  font-family: var(--dg-font-title);
  font-size: 0.82rem;
  letter-spacing: 0.12em;
}

.gm-event-list {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
}

.gm-event {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid rgba(201, 161, 96, 0.22);
  background: rgba(34, 24, 18, 0.55);
}

.gm-event__name {
  color: var(--dg-text-strong);
  font-size: 0.9rem;
  font-weight: 700;
}

.gm-event__area {
  margin-left: 0.4rem;
  color: var(--dg-text-faint);
  font-size: 0.75rem;
  font-weight: 400;
}

.gm-event__verdicts {
  display: grid;
  gap: 0.35rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.gm-verdict {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.3rem 0.45rem;
  border: 1px solid rgba(201, 161, 96, 0.45);
  background: rgba(60, 40, 18, 0.55);
  color: var(--dg-gold-bright);
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.gm-verdict:hover:not(:disabled) {
  border-color: rgba(240, 208, 138, 0.85);
  background: rgba(90, 60, 24, 0.65);
}

.gm-verdict.is-empty {
  border-color: rgba(120, 110, 100, 0.35);
  background: rgba(30, 26, 24, 0.5);
  color: var(--dg-text-faint);
}

.gm-verdict__name {
  font-size: 0.78rem;
  font-weight: 700;
}

.gm-verdict__label {
  width: 100%;
  overflow: hidden;
  color: inherit;
  font-size: 0.7rem;
  opacity: 0.8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 事件结算按钮：沿用选项按钮外观，金色描边以示区别 */
.event-action-btn {
  border-color: rgba(232, 196, 104, 0.6);
  box-shadow: 0 0 14px rgba(232, 196, 104, 0.18);
}

.event-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.event-action-abandon {
  align-self: flex-end;
  padding: 0.15rem 0.4rem;
  color: rgba(242, 230, 208, 0.5);
  font-size: 0.75rem;
  text-decoration: underline;
}

.event-action-abandon:hover:not(:disabled) {
  color: rgba(252, 165, 165, 0.85);
}

.map-selection-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 1rem;
}

.rebirth-section {
  margin-top: 1rem;
}

.action-divider-label {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.7rem;
  color: var(--dg-gold);
  font-family: var(--dg-font-title);
  font-size: 0.95rem;
  letter-spacing: 0.4em;
  text-indent: 0.4em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
}

.action-divider-label::before,
.action-divider-label::after {
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, transparent, var(--dg-line-strong));
  content: '';
}

.action-divider-label::after {
  background: linear-gradient(90deg, var(--dg-line-strong), transparent);
}

.action-divider-label--danger { color: #e08f7e; }
.action-divider-label--danger::before { background: linear-gradient(90deg, transparent, rgba(192, 80, 63, 0.5)); }
.action-divider-label--danger::after { background: linear-gradient(90deg, rgba(192, 80, 63, 0.5), transparent); }

/* ---------- 输入栏：典籍外框的下半部分（两侧 + 底边） ---------- */
.ui-input-anchor {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}

.ui-input-shell {
  --ui-frame-width: 60px;
  --ui-frame-outset: 14px;
  /* 正文布局底部留白（7.8rem）减去输入栏自身高度（4.5rem + 1.5rem + 0.5rem），用于衔接两段外框 */
  --ui-frame-bridge: 1.3rem;
  position: relative;
  background: linear-gradient(180deg, rgba(17, 12, 9, 0.92), rgba(13, 9, 7, 0.97));
}

/* 桥接段：填平正文区与输入栏之间的缝隙 */
.ui-input-shell::before {
  position: absolute;
  right: 0;
  bottom: 100%;
  left: 0;
  height: var(--ui-frame-bridge);
  background: rgba(17, 12, 9, 0.9);
  content: '';
}

.ui-input-shell__border {
  position: absolute;
  z-index: 3;
  inset: calc(var(--ui-frame-bridge) * -1) calc(var(--ui-frame-outset) * -1) calc(var(--ui-frame-outset) * -1);
  border-style: solid;
  border-width: 0 var(--ui-frame-width) var(--ui-frame-width);
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
}

/* 输入槽：凹陷的皮革底 + 金色细边，聚焦时金线亮起 */
.ui-input-field {
  border: 1px solid rgba(201, 161, 96, 0.28);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.35), transparent 30%), var(--dg-leather);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55);
  color: var(--dg-text);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.ui-input-field:focus {
  border-color: rgba(240, 208, 138, 0.7);
  outline: none;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(201, 161, 96, 0.25), 0 0 10px rgba(232, 170, 70, 0.12);
}

.ui-input-field::placeholder {
  color: var(--dg-text-faint);
}

/* ---------- 按钮补全 / 发送：主要按钮框（三段切片，两端红宝石） ---------- */
.ui-option-completion-wrap {
  position: relative;
  flex-shrink: 0;
}

.ui-option-completion-trigger,
.ui-send-button {
  border-style: solid;
  border-width: 0 22px;
  border-image-source: var(--dg-img-button);
  border-image-slice: 0 80 fill;
  border-image-repeat: stretch;
  border-radius: 0;
  background: none;
  color: var(--dg-gold-bright);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
  transition: filter 0.18s ease;
}

.ui-option-completion-trigger { min-width: 9rem; }

.ui-option-completion-trigger:hover:not(:disabled),
.ui-option-completion-trigger:focus-visible,
.ui-send-button:hover:not(:disabled),
.ui-send-button:focus-visible {
  outline: none;
  filter: brightness(1.15) drop-shadow(0 0 6px rgba(232, 170, 70, 0.3));
}

.ui-option-completion-trigger:disabled,
.ui-send-button:disabled {
  cursor: not-allowed;
  filter: grayscale(0.6) brightness(0.7);
}

.ui-option-completion-trigger__label {
  font-family: var(--dg-font-title);
  font-size: 1.05rem;
  letter-spacing: 0.18em;
  white-space: nowrap;
}

.ui-option-completion-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.7rem);
  z-index: 10;
  display: flex;
  min-width: 14.5rem;
  flex-direction: column;
  gap: 0.3rem;
  border: 1px solid rgba(201, 161, 96, 0.5);
  border-radius: 2px;
  background: var(--dg-bg-panel);
  padding: 0.45rem;
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.08), 0 16px 30px rgba(0, 0, 0, 0.55);
}

.ui-option-completion-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  border: 1px solid rgba(201, 161, 96, 0.18);
  border-radius: 2px;
  background: var(--dg-surface);
  color: var(--dg-text);
  padding: 0.8rem 0.95rem;
  text-align: left;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.ui-option-completion-item:hover:not(:disabled),
.ui-option-completion-item:focus-visible {
  border-color: rgba(240, 208, 138, 0.6);
  background: var(--dg-surface-hover);
  color: var(--dg-text-strong);
}

.ui-option-completion-item.is-disabled,
.ui-option-completion-item:disabled {
  cursor: not-allowed;
  background: rgba(20, 14, 10, 0.5);
  color: var(--dg-text-faint);
}

.ui-option-completion-item__label {
  font-size: 0.92rem;
  line-height: 1.35;
}

.ui-option-completion-item__tag {
  flex-shrink: 0;
  border: 1px solid rgba(201, 161, 96, 0.4);
  border-radius: 2px;
  background: rgba(201, 161, 96, 0.08);
  color: var(--dg-gold-bright);
  padding: 0.15rem 0.5rem;
  font-family: var(--dg-font-data);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
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

.ui-send-button { transform: none; }

.ui-status-hud {
  /* 与正文框左缘留出约 10px：左移 1rem、取消放大（原 13.5rem × 1.05 会压到正文框边饰） */
  left: 1rem;
  width: min(13rem, calc(100vw - 2rem));
}

.status-hud-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-hud-control-btn {
  position: relative;
  width: 5.1rem;
  height: 5.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  transition:
    transform 0.18s ease,
    filter 0.18s ease;
}

.status-hud-control-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.18) drop-shadow(0 0 7px rgba(245, 170, 45, 0.5));
}

/* ---------- 状态块：与侧边栏徽章同一套金属语言的小型典籍框 ---------- */
.status-hud-panel {
  position: relative;
  width: 100%;
  padding: 0.85rem 0.8rem 0.8rem;
  background: var(--dg-bg-panel);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
}

.status-hud-panel__border {
  position: absolute;
  z-index: 2;
  inset: -8px;
  border-style: solid;
  border-width: 34px;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
}

.status-hud-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.55rem;
  padding-bottom: 0.4rem;
}

.status-hud-header::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--dg-line-strong) 20%, var(--dg-line-strong) 80%, transparent);
  content: '';
}

.status-hud-title {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1rem;
  letter-spacing: 0.3em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
}

.status-hud-curse {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #d9a6f2;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
}

.status-hud-curse img {
  width: 1.05rem;
  height: 1.05rem;
}

.status-hud-curse.is-empty {
  color: var(--dg-text-faint);
}

.status-hud-curse.is-empty img { filter: grayscale(1) brightness(0.6); }

.status-hud-vitals {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.status-hud-vital {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 5.1rem;
  padding: 0.45rem 0.35rem 0.4rem;
  border: 1px solid rgba(201, 161, 96, 0.2);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.12));
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* 宝石灌注：底层为暗化的空宝石，上层彩色宝石按 --fill 从下往上显露 */
.status-hud-gem {
  --fill: 100%;
  position: relative;
  display: block;
  width: 3.25rem;
  height: 3.25rem;
}

.status-hud-gem img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.status-hud-gem__empty {
  filter: grayscale(0.85) brightness(0.38) contrast(1.1);
}

.status-hud-gem__full {
  clip-path: inset(calc(100% - var(--fill)) 0 0 0);
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
  transition: clip-path 0.7s ease-out;
}

.status-hud-vital--hp .status-hud-gem__full { filter: drop-shadow(0 0 5px rgba(196, 55, 47, 0.45)); }
.status-hud-vital--mp .status-hud-gem__full { filter: drop-shadow(0 0 5px rgba(79, 143, 224, 0.45)); }

.status-hud-vital-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.32rem;
  min-width: 0;
  width: 100%;
}

.status-hud-vital-value span {
  color: var(--dg-text-faint);
  font-family: var(--dg-font-data);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.status-hud-vital-value strong {
  min-width: 0;
  overflow: hidden;
  color: var(--dg-text-strong);
  font-family: var(--dg-font-data);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-hud-vital--hp .status-hud-vital-value span { color: rgba(226, 120, 108, 0.85); }
.status-hud-vital--mp .status-hud-vital-value span { color: rgba(125, 170, 235, 0.85); }

.status-hud-minor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.45rem;
  margin-top: 0.45rem;
}

.status-hud-minor {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  min-height: 2.35rem;
  padding: 0.35rem 0.45rem;
  border: 1px solid rgba(201, 161, 96, 0.2);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.12));
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.status-hud-minor img {
  width: 1.55rem;
  height: 1.55rem;
  flex: 0 0 auto;
  object-fit: contain;
}

.status-hud-minor span {
  display: block;
  color: var(--dg-text-faint);
  font-size: 0.6rem;
  letter-spacing: 0.11em;
}

.status-hud-minor strong {
  display: block;
  margin-top: 0.08rem;
  overflow: hidden;
  color: var(--dg-text-strong);
  font-family: var(--dg-font-data);
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-hud-minor--gold strong { color: var(--dg-coin); }

@media (prefers-reduced-motion: reduce) {
  .status-hud-gem__full { transition: none; }
}

@media (max-width: 900px) {
  .ui-status-hud {
    left: 1rem;
    bottom: 1rem;
    width: min(13.5rem, calc(100vw - 2rem));
    transform: none;
  }

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

/* ---------- 正文区：典籍外框的上半部分（顶边 + 两侧），与下方输入栏外框衔接 ---------- */
.ui-story-frame {
  --ui-frame-width: 60px;
  --ui-frame-outset: 14px;
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.ui-story-panel {
  position: relative;
  min-height: 0;
  flex: 1 1 auto;
  background:
    radial-gradient(ellipse 120% 60% at 50% 0%, rgba(120, 76, 36, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(17, 12, 9, 0.84), rgba(17, 12, 9, 0.9));
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  scrollbar-color: rgba(201, 161, 96, 0.4) transparent;
}

.ui-story-frame__border {
  position: absolute;
  z-index: 3;
  inset: calc(var(--ui-frame-outset) * -1) calc(var(--ui-frame-outset) * -1) 0;
  border-style: solid;
  border-width: var(--ui-frame-width) var(--ui-frame-width) 0;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
}

/* 消息楼层：页眉式页码 */
.story-floor-indicator {
  position: absolute;
  top: 1rem;
  right: 1.8rem;
  z-index: 8;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  line-height: 1.2;
}

.story-floor-indicator__label {
  color: var(--dg-text-faint);
  font-size: 0.68rem;
  letter-spacing: 0.24em;
}

.story-floor-indicator__value {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--dg-gold);
  font-family: var(--dg-font-title);
  font-size: 0.95rem;
  letter-spacing: 0.12em;
}

.story-floor-indicator__value::before {
  width: 5px;
  height: 5px;
  border: 1px solid var(--dg-gold);
  background: var(--dg-arcane);
  transform: rotate(45deg);
  content: '';
}

.story-main-text-warning {
  margin: 0 0 1rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(245, 158, 11, 0.46);
  border-radius: 0.35rem;
  background: rgba(120, 53, 15, 0.2);
  color: rgba(253, 230, 138, 0.92);
  font-size: 0.82rem;
  line-height: 1.45;
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
  }
}

/* 标题字体（江湖琅琊体）改为图床分片加载，见 theme/fonts.css */

.deck-panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); justify-items: center; gap: 28px 20px; padding: 24px 0 8px; }

/* =====================================================================
   魔法书（附加魔法书 / 主动技能）
   坐标系：.magic-book-shell 与书本素材同为 3:2，并作为 inline-size 容器。
   - 书页、导航、翻页舞台：以书本百分比定位（与素材像素严格对齐）；
   - 书页内部排版：使用 cqw（= 书本宽度的 1%），任何分辨率下等比缩放。
   素材测量（1536×1024）：装订线 x=50%；纸面 x 10.5%–89.5%、y 7.6%–80%；
   中央红宝石扣 x 42%–58%、y 77%–95%。
   ===================================================================== */
.magic-book-world {
  position: relative;
  width: 100%;
  margin: 0 auto;
}

.magic-book-shell {
  --mb-u: 15;
  --mb-ink: rgb(58, 33, 16);
  --mb-ink-soft: rgba(74, 45, 22, 0.88);
  --mb-ink-faint: rgba(104, 68, 36, 0.66);
  --mb-ink-line: rgba(118, 78, 38, 0.42);
  --mb-rubric: rgb(124, 34, 22);
  --mb-gold: rgb(236, 196, 120);
  --mb-gold-deep: rgb(150, 102, 42);
  --mb-page-top: 7.6%;
  --mb-page-height: 72.4%;
  --mb-page-width: 39.5%;
  --mb-page-left: 10.5%;
  position: relative;
  width: min(100%, 112rem, calc(96vh * 1.5));
  width: min(100%, 112rem, calc(96dvh * 1.5));
  aspect-ratio: 3 / 2;
  margin: 0 auto;
  container: magic-book / inline-size;
  isolation: isolate;
  color: var(--mb-ink);
}

.magic-book-shell__book {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 1.6cqw 2.4cqw rgba(0, 0, 0, 0.5));
}

/* ---------- 书页盒：左右页关于装订线对称，静态页与翻动页共用同一尺寸 ---------- */
.magic-book-page {
  position: absolute;
  top: var(--mb-page-top);
  left: var(--mb-page-left);
  width: var(--mb-page-width);
  height: var(--mb-page-height);
  min-width: 0;
}

.magic-book-page--right { left: 50%; }

.magic-book-folio {
  position: absolute;
  inset: 0;
  display: flex;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  padding: 4.4cqw 3.2cqw 3.3cqw 4.4cqw;
  color: var(--mb-ink);
  animation: magic-book-ink-in 380ms ease-out both;
}

.magic-book-folio--recto { padding: 4.4cqw 4.4cqw 3.3cqw 3.2cqw; }

.magic-book-folio__foot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
  margin-top: auto;
  padding-top: 0.8cqw;
}

.magic-book-folio__number {
  color: var(--mb-ink-faint);
  font-family: 'Cinzel', 'Microsoft YaHei', serif;
  font-size: max(9px, 0.78cqw);
  letter-spacing: 0.24em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.magic-book-folio__spacer { display: block; }

/* ---------- 标题层级：眉题 → 标题 → 花饰分隔线 → 注释 ---------- */
.magic-book-heading {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.magic-book-heading__eyebrow {
  color: var(--mb-ink-faint);
  font-family: 'Cinzel', 'Microsoft YaHei', serif;
  font-size: max(8px, 0.74cqw);
  letter-spacing: 0.32em;
  text-indent: 0.32em;
}

.magic-book-heading__title {
  margin: 0.45cqw 0 0;
  color: var(--mb-ink);
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: max(16px, 2.7cqw);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: 0.1em;
  text-indent: 0.1em;
  text-shadow: 0 1px 0 rgba(255, 244, 214, 0.55);
}

.magic-book-heading--compact .magic-book-heading__title { font-size: max(14px, 2cqw); }

.magic-book-heading__note {
  margin: 0.5cqw 0 0;
  color: var(--mb-ink-faint);
  font-size: max(9px, 0.84cqw);
  line-height: 1.5;
  letter-spacing: 0.06em;
}

.magic-book-rule {
  position: relative;
  display: block;
  width: 62%;
  height: 1cqw;
  margin-top: 0.55cqw;
  background: linear-gradient(
      90deg,
      transparent,
      var(--mb-ink-line) 22%,
      var(--mb-ink-line) 44%,
      transparent 47%,
      transparent 53%,
      var(--mb-ink-line) 56%,
      var(--mb-ink-line) 78%,
      transparent
    )
    center / 100% 1px no-repeat;
}

.magic-book-rule::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.55cqw;
  height: 0.55cqw;
  border: 1px solid var(--mb-ink-faint);
  background: rgba(150, 102, 42, 0.22);
  transform: translate(-50%, -50%) rotate(45deg);
  content: '';
}

/* ---------- 附加魔法书 · 右页文字 ----------
   纵向分布：标题区（顶部）→ 关键词 + 正文（紧随标题）→ 状态 / 携带按钮 / 提示（下三分之一）→ 页脚 */
.magic-book-text-page__keywords {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.3cqw 0;
  margin: 1.1cqw 0 0;
  padding: 0;
  list-style: none;
  color: var(--mb-rubric);
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: max(10px, 0.98cqw);
  letter-spacing: 0.18em;
}

.magic-book-text-page__keywords li { display: inline-flex; align-items: center; }

.magic-book-text-page__keywords li + li::before {
  display: inline-block;
  width: 0.36cqw;
  height: 0.36cqw;
  margin: 0 1cqw 0 0.8cqw;
  background: var(--mb-gold-deep);
  opacity: 0.65;
  transform: rotate(45deg);
  content: '';
}

.magic-book-text-page__description {
  flex: 0 1 auto;
  width: 100%;
  max-width: 29.5cqw;
  min-height: 0;
  margin: 1.9cqw 0 0;
  overflow-y: auto;
  scrollbar-width: none;
  color: var(--mb-ink-soft);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'Microsoft YaHei', serif;
  font-size: max(11px, 1.24cqw);
  line-height: 1.95;
  letter-spacing: 0.05em;
  text-align: justify;
}

.magic-book-text-page__actions {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  margin-top: auto;
  padding: 1.4cqw 0 0.8cqw;
}

.magic-book-text-page__description::-webkit-scrollbar { display: none; }

.magic-book-text-page__description::first-letter {
  float: left;
  margin: 0.45cqw 0.55cqw 0 0;
  color: var(--mb-rubric);
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: 3.05em;
  line-height: 1;
}

.magic-book-text-page__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.9cqw;
  color: var(--mb-ink-faint);
  font-size: max(9px, 0.9cqw);
  letter-spacing: 0.12em;
}

.magic-book-text-page__meta-sep {
  width: 0.42cqw;
  height: 0.42cqw;
  background: var(--mb-gold-deep);
  opacity: 0.7;
  transform: rotate(45deg);
}

.magic-book-text-page.is-equipped .magic-book-text-page__meta > span:last-child { color: rgb(110, 66, 18); font-weight: 600; }
.magic-book-text-page.is-locked .magic-book-text-page__meta > span:last-child { color: rgba(88, 52, 110, 0.9); }

.magic-book-text-page__hint {
  max-width: 29cqw;
  margin: 0.9cqw 0 0;
  color: var(--mb-ink-faint);
  font-size: max(9px, 0.8cqw);
  font-style: italic;
  line-height: 1.55;
  text-align: center;
}

/* 携带按钮：羊皮纸上的压印铭框，携带后变为深色皮革金字 */
.magic-book-seal-button {
  position: relative;
  display: inline-flex;
  min-width: 15cqw;
  max-width: 100%;
  min-height: max(26px, 3.2cqw);
  align-items: center;
  justify-content: center;
  gap: 0.6cqw;
  margin-top: 1.2cqw;
  padding: 0.5cqw 1.8cqw;
  border: 1px solid rgba(110, 70, 30, 0.55);
  border-radius: 1px;
  background: linear-gradient(180deg, rgba(255, 240, 205, 0.22), rgba(150, 102, 42, 0.1));
  color: var(--mb-ink);
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: max(11px, 1.12cqw);
  letter-spacing: 0.2em;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.magic-book-seal-button::before {
  position: absolute;
  inset: 0.28cqw;
  border: 1px solid rgba(110, 70, 30, 0.26);
  pointer-events: none;
  content: '';
}

.magic-book-seal-button svg {
  width: max(12px, 1.1cqw);
  height: max(12px, 1.1cqw);
  flex-shrink: 0;
}

.magic-book-seal-button:hover:not(:disabled):not([aria-disabled='true']),
.magic-book-seal-button:focus-visible {
  outline: none;
  border-color: rgba(150, 98, 40, 0.88);
  background: linear-gradient(180deg, rgba(255, 236, 196, 0.3), rgba(130, 82, 30, 0.18));
  color: rgb(36, 18, 6);
}

.magic-book-seal-button.is-active {
  border-color: rgba(150, 102, 42, 0.92);
  background: linear-gradient(180deg, rgb(78, 44, 24), rgb(44, 24, 14));
  color: var(--mb-gold);
}

.magic-book-seal-button.is-active::before { border-color: rgba(236, 196, 120, 0.32); }

.magic-book-seal-button.is-active:hover:not(:disabled):not([aria-disabled='true']),
.magic-book-seal-button.is-active:focus-visible {
  background: linear-gradient(180deg, rgb(96, 54, 28), rgb(54, 30, 16));
  color: rgb(255, 226, 160);
}

.magic-book-seal-button:disabled,
.magic-book-seal-button.is-disabled {
  cursor: default;
  opacity: 0.55;
}

.magic-book-seal-button[aria-disabled='true'] { cursor: default; }

.magic-book-text-page.is-locked .magic-book-seal-button,
.magic-book-text-page.is-unavailable .magic-book-seal-button {
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: max(10px, 0.92cqw);
  letter-spacing: 0.06em;
}

/* 翻页按钮：页脚的墨水箭头 */
.magic-book-turn-button {
  display: inline-flex;
  justify-self: start;
  align-items: center;
  gap: 0.3cqw;
  padding: 0.3cqw 0.4cqw;
  border: 0;
  background: transparent;
  color: var(--mb-ink-soft);
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: max(10px, 0.98cqw);
  letter-spacing: 0.16em;
  cursor: pointer;
  transition: color 0.18s ease, opacity 0.18s ease;
}

.magic-book-turn-button--next { justify-self: end; }

.magic-book-turn-button svg {
  width: max(12px, 1.1cqw);
  height: max(12px, 1.1cqw);
  transition: transform 0.2s ease;
}

.magic-book-turn-button:hover:not(:disabled),
.magic-book-turn-button:focus-visible {
  outline: none;
  color: var(--mb-rubric);
}

.magic-book-turn-button--prev:hover:not(:disabled) svg { transform: translateX(-0.2cqw); }
.magic-book-turn-button--next:hover:not(:disabled) svg { transform: translateX(0.2cqw); }
.magic-book-turn-button:focus-visible span { text-decoration: underline; text-underline-offset: 0.3em; }

.magic-book-turn-button:disabled,
.magic-book-turn-button.is-disabled {
  cursor: default;
  opacity: 0.28;
}

/* ---------- 附加魔法书 · 左页插画：手绘圆形插图，边缘晕入羊皮纸 ---------- */
.magic-book-illumination {
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.magic-book-illumination__plate {
  position: relative;
  width: min(100%, 29cqw);
  aspect-ratio: 1;
  isolation: isolate;
}

.magic-book-illumination__plate::after {
  position: absolute;
  inset: 3%;
  border: 1px solid rgba(110, 70, 30, 0.3);
  border-radius: 50%;
  outline: 1px solid rgba(110, 70, 30, 0.16);
  outline-offset: 0.45cqw;
  pointer-events: none;
  content: '';
}

.magic-book-illumination__art,
.magic-book-illumination__grain {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  -webkit-mask-image: radial-gradient(circle closest-side, #000 50%, rgba(0, 0, 0, 0.8) 66%, rgba(0, 0, 0, 0.34) 84%, transparent 100%);
  mask-image: radial-gradient(circle closest-side, #000 50%, rgba(0, 0, 0, 0.8) 66%, rgba(0, 0, 0, 0.34) 84%, transparent 100%);
}

.magic-book-illumination__art {
  object-fit: contain;
  filter: sepia(0.16) saturate(0.9) contrast(1.03);
  transition: filter 0.4s ease;
}

/* 纸纹叠加：取书本素材的纸面区域正片叠底，让插画像画在纸上 */
.magic-book-illumination__grain {
  background: var(--mb-book-image) 32% 46% / 420% auto no-repeat;
  mix-blend-mode: multiply;
  opacity: 0.55;
  pointer-events: none;
}

.magic-book-art-page.is-locked .magic-book-illumination__art { filter: grayscale(0.85) sepia(0.35) brightness(0.72) contrast(0.95); }
.magic-book-art-page.is-unavailable .magic-book-illumination__art { filter: grayscale(0.9) sepia(0.3) brightness(0.62) contrast(0.9); }

.magic-book-illumination__caption {
  display: flex;
  align-items: center;
  gap: 1cqw;
  margin-top: 1.1cqw;
  color: var(--mb-ink-soft);
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: max(12px, 1.5cqw);
  letter-spacing: 0.5em;
  text-indent: 0.5em;
}

.magic-book-illumination__caption::before,
.magic-book-illumination__caption::after {
  width: 3cqw;
  height: 1px;
  background: var(--mb-ink-line);
  content: '';
}

.magic-book-empty {
  justify-content: center;
  color: var(--mb-ink-faint);
  font-size: max(11px, 1.1cqw);
  letter-spacing: 0.12em;
}

/* ---------- 3D 翻页 ---------- */
/* 翻页投影：正片叠底到书页上，位置/浓度由 JS 写入的变量驱动 */
.magic-book-turn-shadow {
  --mb-shadow-edge: 0%;
  --mb-shadow-fade: 0%;
  --mb-shadow-alpha: 0;
  position: absolute;
  top: var(--mb-page-top);
  width: var(--mb-page-width);
  height: var(--mb-page-height);
  mix-blend-mode: multiply;
  pointer-events: none;
}

.magic-book-turn-shadow--left {
  left: var(--mb-page-left);
  background: linear-gradient(
    to left,
    rgba(40, 20, 6, var(--mb-shadow-alpha)) 0,
    rgba(40, 20, 6, var(--mb-shadow-alpha)) var(--mb-shadow-edge),
    rgba(40, 20, 6, 0) var(--mb-shadow-fade)
  );
}

.magic-book-turn-shadow--right {
  left: 50%;
  background: linear-gradient(
    to right,
    rgba(40, 20, 6, var(--mb-shadow-alpha)) 0,
    rgba(40, 20, 6, var(--mb-shadow-alpha)) var(--mb-shadow-edge),
    rgba(40, 20, 6, 0) var(--mb-shadow-fade)
  );
}

/* 舞台横跨两页，水平中心 = 装订线；所有分段以此为原点旋转 */
.magic-book-leaf-stage {
  position: absolute;
  z-index: 3;
  top: var(--mb-page-top);
  right: var(--mb-page-left);
  left: var(--mb-page-left);
  height: var(--mb-page-height);
  perspective: 150cqw;
  perspective-origin: 50% 46%;
  transform-style: preserve-3d;
  pointer-events: none;
}

.magic-book-leaf-stage:not(.is-live) { visibility: hidden; }

.magic-book-leaf-seg {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
  transform-origin: 0 50%;
  transform-style: preserve-3d;
  will-change: transform;
}

.magic-book-leaf-face {
  position: absolute;
  inset: 0 -0.4px;
  overflow: hidden;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.magic-book-leaf-face--back { transform: rotateY(180deg); }

/* 每段都放置一整页（宽 39.5cqw = 单页宽），由 left 偏移只露出本段 */
.magic-book-leaf-sheet {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 39.5cqw;
}

.magic-book-leaf-sheet .magic-book-folio { animation: none; }
.magic-book-leaf-sheet .magic-book-text-page__description { overflow: hidden; }

/*
  翻动纸张（生成素材 魔法书翻页.webp，毛边透明）：书页离开书面后淡入，取代裁切自书本的纸面，
  避免出现直角矩形与被裁掉的书角。
*/
/* 纸张略小于书页盒（外缘与上下各内收），与书本中可见纸面的范围一致，不会盖到页边与护角 */
.magic-book-leaf-sheet__paper {
  position: absolute;
  inset: 1.2% 3.5% 1.2% 0;
  background: var(--mb-leaf-image) center / 100% 100% no-repeat;
  opacity: var(--mb-patch, 0);
}

.magic-book-leaf-sheet--back .magic-book-leaf-sheet__paper { inset: 1.2% 0 1.2% 3.5%; }

/* 装订线一侧的根部阴影：纸张在书脊处弯入，越靠近装订线越暗 */
.magic-book-leaf-sheet::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(60, 32, 10, 0.42), rgba(60, 32, 10, 0.12) 6%, transparent 16%);
  -webkit-mask: var(--mb-leaf-image) left center / 96.5% 97.6% no-repeat;
  mask: var(--mb-leaf-image) left center / 96.5% 97.6% no-repeat;
  opacity: var(--mb-patch, 0);
  pointer-events: none;
  content: '';
}

.magic-book-leaf-sheet--back::after {
  background: linear-gradient(to left, rgba(60, 32, 10, 0.42), rgba(60, 32, 10, 0.12) 6%, transparent 16%);
  -webkit-mask-position: right center;
  mask-position: right center;
}

/*
  纸面印刷层：直接裁取书本素材中对应书页的像素，保证翻页起止帧与静态书本完全一致。
  background-size = 100% / 页宽(39.5%)、100% / 页高(72.4%)；
  背景定位按 “素材点对齐盒子左上角” 推导：右页 82.645%，左页 17.355%，纵向 27.536%。
  遮罩剔除装订线宝石、书角金属件与纸张毛边。
*/
.magic-book-leaf-sheet__print {
  position: absolute;
  inset: 0;
  background-image: var(--mb-book-image);
  background-position: 82.645% 27.536%;
  background-repeat: no-repeat;
  background-size: 253.165% 138.122%;
  opacity: calc(1 - var(--mb-patch, 0));
  -webkit-mask-image:
    linear-gradient(to right, transparent 0, transparent 4%, #000 8.5%, #000 98%, transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 3.2%, #000 97%, transparent 100%),
    radial-gradient(ellipse 30% 13% at 100% 0, transparent 62%, #000 100%),
    radial-gradient(ellipse 15% 11% at 0 0, transparent 60%, #000 100%),
    radial-gradient(ellipse 9% 13% at 100% 100%, transparent 60%, #000 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent 0, transparent 4%, #000 8.5%, #000 98%, transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 3.2%, #000 97%, transparent 100%),
    radial-gradient(ellipse 30% 13% at 100% 0, transparent 62%, #000 100%),
    radial-gradient(ellipse 15% 11% at 0 0, transparent 60%, #000 100%),
    radial-gradient(ellipse 9% 13% at 100% 100%, transparent 60%, #000 100%);
  mask-composite: intersect;
}

.magic-book-leaf-sheet--back .magic-book-leaf-sheet__print {
  background-position: 17.355% 27.536%;
  -webkit-mask-image:
    linear-gradient(to left, transparent 0, transparent 4%, #000 8.5%, #000 98%, transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 3.2%, #000 97%, transparent 100%),
    radial-gradient(ellipse 30% 13% at 0 0, transparent 62%, #000 100%),
    radial-gradient(ellipse 15% 11% at 100% 0, transparent 60%, #000 100%),
    radial-gradient(ellipse 9% 13% at 0 100%, transparent 60%, #000 100%);
  mask-image:
    linear-gradient(to left, transparent 0, transparent 4%, #000 8.5%, #000 98%, transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 3.2%, #000 97%, transparent 100%),
    radial-gradient(ellipse 30% 13% at 0 0, transparent 62%, #000 100%),
    radial-gradient(ellipse 15% 11% at 100% 0, transparent 60%, #000 100%),
    radial-gradient(ellipse 9% 13% at 0 100%, transparent 60%, #000 100%);
}

/*
  随角度变化的明暗：JS 按每段两端的角度写入 a/b，段内线性过渡以消除分段色阶。
  明暗层位于整页坐标内、只覆盖本段窗口（left/width 由分段样式给出），
  遮罩使用纸张素材本身，并以 cqw 偏移对齐整页，因此暗部只落在纸面上。
*/
.magic-book-leaf-face__shade {
  position: absolute;
  top: 0;
  bottom: 0;
  background: linear-gradient(to right, rgba(30, 15, 4, var(--mb-front-a, 0)), rgba(30, 15, 4, var(--mb-front-b, 0)));
  -webkit-mask: var(--mb-leaf-image) no-repeat;
  mask: var(--mb-leaf-image) no-repeat;
  -webkit-mask-size: calc(39.5cqw * 0.965) 97.6%;
  mask-size: calc(39.5cqw * 0.965) 97.6%;
  -webkit-mask-position: var(--mb-shade-offset, 0) 50%;
  mask-position: var(--mb-shade-offset, 0) 50%;
  pointer-events: none;
}

.magic-book-leaf-sheet--back .magic-book-leaf-face__shade {
  background: linear-gradient(to right, rgba(30, 15, 4, var(--mb-back-b, 0)), rgba(30, 15, 4, var(--mb-back-a, 0)));
}

/* ---------- 主动技能 ---------- */
.magic-book-active-slots {
  --mb-card-w: 12.6;
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 3cqw;
}

.magic-book-active-library {
  --mb-card-w: 9;
  display: grid;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  grid-template-columns: repeat(var(--mb-lib-cols, 3), max-content);
  align-content: center;
  justify-content: center;
  gap: calc(1.3cqw + var(--mb-card-w) * 0.147cqw) calc(1.3cqw + var(--mb-card-w) * 0.1cqw);
  padding: 1.6cqw 0 0.6cqw;
}

.magic-book-active-library.is-scrollable {
  align-content: start;
  overflow-y: auto;
  scrollbar-color: rgba(118, 78, 38, 0.45) transparent;
  scrollbar-width: thin;
}

/* 卡牌按钮：按钮占位按 cqw 计算，内部固定像素的 ActiveSkillCard 按书本实际宽度等比缩放 */
.magic-book-active-card-button {
  --mb-seat: rgba(118, 78, 38, 0.5);
  position: relative;
  display: block;
  width: calc(var(--mb-card-w) * 1cqw);
  height: calc(var(--mb-card-w) * 1cqw * 176 / 120);
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.magic-book-active-card-button > .active-skill-card {
  position: absolute;
  top: 50%;
  left: 50%;
  box-shadow: none;
  transform: translate(-50%, -50%) scale(calc(var(--mb-card-w) * var(--mb-u) / 120));
  transform-origin: center;
  transition: filter 0.22s ease;
}

/* 槽位刻痕：四角墨线，选中时转为鎏金 */
.magic-book-active-card-button::before {
  --mb-corner: 1.5cqw;
  position: absolute;
  inset: -0.95cqw -0.75cqw;
  background:
    linear-gradient(var(--mb-seat), var(--mb-seat)) left top / var(--mb-corner) 1px,
    linear-gradient(var(--mb-seat), var(--mb-seat)) left top / 1px var(--mb-corner),
    linear-gradient(var(--mb-seat), var(--mb-seat)) right top / var(--mb-corner) 1px,
    linear-gradient(var(--mb-seat), var(--mb-seat)) right top / 1px var(--mb-corner),
    linear-gradient(var(--mb-seat), var(--mb-seat)) left bottom / var(--mb-corner) 1px,
    linear-gradient(var(--mb-seat), var(--mb-seat)) left bottom / 1px var(--mb-corner),
    linear-gradient(var(--mb-seat), var(--mb-seat)) right bottom / var(--mb-corner) 1px,
    linear-gradient(var(--mb-seat), var(--mb-seat)) right bottom / 1px var(--mb-corner);
  background-repeat: no-repeat;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
  content: '';
}

.magic-book-active-card-button--slot::before { opacity: 0.75; }

/* 状态宝石：选中/已装备时点亮 */
.magic-book-active-card-button__gem {
  position: absolute;
  z-index: 2;
  top: -1.45cqw;
  left: 50%;
  width: 0.8cqw;
  height: 0.8cqw;
  border: 1px solid rgba(150, 102, 42, 0.75);
  background: radial-gradient(circle at 35% 35%, rgb(124, 92, 140), rgb(52, 28, 66) 70%);
  opacity: 0;
  transform: translateX(-50%) rotate(45deg);
  transition: opacity 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
}

.magic-book-active-card-button--slot .magic-book-active-card-button__gem { opacity: 0.7; }

.magic-book-active-card-button:hover:not(:disabled) > .active-skill-card,
.magic-book-active-card-button:focus-visible > .active-skill-card {
  filter: brightness(1.07) saturate(1.04);
}

.magic-book-active-card-button:hover:not(:disabled)::before,
.magic-book-active-card-button:focus-visible::before { opacity: 1; }

.magic-book-active-card-button:focus-visible { outline: none; }

.magic-book-active-card-button.is-selected,
.magic-book-active-card-button.is-equipped { --mb-seat: rgba(196, 140, 52, 0.95); }

.magic-book-active-card-button.is-selected::before,
.magic-book-active-card-button.is-equipped::before { opacity: 1; }

.magic-book-active-card-button > .active-skill-card { z-index: 1; }

/* 选中槽位：卡牌背后极轻的暖光呼吸，只动 opacity，不触发重绘 */
.magic-book-active-card-button.is-selected::after {
  position: absolute;
  inset: -12% -16%;
  background: radial-gradient(ellipse 50% 46% at 50% 50%, rgba(240, 186, 90, 0.36), transparent 72%);
  pointer-events: none;
  animation: magic-book-card-breathe 3.8s ease-in-out infinite;
  content: '';
}

.magic-book-active-card-button.is-selected > .active-skill-card {
  filter: drop-shadow(0 0 0.5cqw rgba(232, 176, 72, 0.55)) brightness(1.04);
}

.magic-book-active-card-button.is-equipped > .active-skill-card {
  filter: drop-shadow(0 0 0.36cqw rgba(232, 176, 72, 0.42));
}

.magic-book-active-card-button.is-selected .magic-book-active-card-button__gem,
.magic-book-active-card-button.is-equipped .magic-book-active-card-button__gem {
  background: radial-gradient(circle at 35% 30%, rgb(255, 236, 255), rgb(206, 140, 255) 28%, rgb(128, 56, 206) 62%, rgb(52, 14, 92));
  box-shadow: 0 0 0.7cqw rgba(186, 110, 255, 0.6);
  opacity: 1;
}

.magic-book-active-card-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.magic-book-active-card-button:disabled > .active-skill-card { filter: saturate(0.7); }

.magic-book-active-slot-caption {
  display: flex;
  width: 100%;
  max-width: 26cqw;
  align-items: center;
  justify-content: center;
  gap: 1.4cqw;
  margin-top: 1cqw;
  padding-top: 0.7cqw;
  border-top: 1px solid var(--mb-ink-line);
  color: var(--mb-ink-soft);
  font-size: max(10px, 0.92cqw);
  letter-spacing: 0.12em;
}

.magic-book-active-clear {
  padding: 0.25cqw 0.9cqw;
  border: 1px solid rgba(124, 34, 22, 0.45);
  border-radius: 1px;
  background: transparent;
  color: var(--mb-rubric);
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: max(10px, 0.98cqw);
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.magic-book-active-clear:hover:not(:disabled),
.magic-book-active-clear:focus-visible {
  outline: none;
  border-color: rgba(124, 34, 22, 0.85);
  background: rgba(124, 34, 22, 0.08);
}

.magic-book-active-clear:disabled {
  cursor: default;
  opacity: 0.4;
}

/* ---------- 底部导航：铆在书脚页边上的铭牌 ----------
   铭牌素材右端为空宝石座；内端插入中央红宝石扣金属臂之下（装订金饰层在其上方），
   视觉上由扣饰“夹住”铭牌。选中时宝石座内的紫宝石点亮。
   素材内框（文字区）x 16.6%–83.2%，y 25%–74%；宝石座中心 x 91.3%。 */
.magic-book-nav {
  position: absolute;
  z-index: 4;
  inset: 0;
  pointer-events: none;
}

.magic-book-nav__plate {
  position: absolute;
  top: 86.6%;
  left: 27%;
  width: 16.6%;
  aspect-ratio: 1006 / 368;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(214, 176, 116, 0.62);
  cursor: pointer;
  pointer-events: auto;
  transition: color 0.3s ease;
}

.magic-book-nav__plate--active { left: 56.4%; }

/* 接触阴影：铭牌压在页边与皮革上的暗部，让它“贴”在书上而不是浮在上方 */
.magic-book-nav__seat {
  position: absolute;
  inset: 14% 3% -6% 3%;
  background: radial-gradient(ellipse 52% 50% at 50% 54%, rgba(12, 6, 2, 0.62), rgba(12, 6, 2, 0.28) 62%, transparent 100%);
  pointer-events: none;
}

.magic-book-nav__metal {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0.16cqw 0.18cqw rgba(8, 4, 2, 0.7)) brightness(0.9) saturate(0.92);
  pointer-events: none;
  user-select: none;
  transition: filter 0.3s ease;
}

.magic-book-nav__plate--active .magic-book-nav__metal { transform: scaleX(-1); }

/* 选中时内框里的幽紫微光，从宝石一侧渗入 */
.magic-book-nav__glow {
  position: absolute;
  top: 26%;
  bottom: 27%;
  left: 17%;
  right: 17%;
  border-radius: 0.3cqw;
  background: radial-gradient(ellipse 70% 120% at 100% 50%, rgba(160, 90, 230, 0.32), transparent 70%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

.magic-book-nav__plate--active .magic-book-nav__glow {
  background: radial-gradient(ellipse 70% 120% at 0% 50%, rgba(160, 90, 230, 0.32), transparent 70%);
}

.magic-book-nav__label {
  position: absolute;
  top: 25%;
  bottom: 26%;
  left: 16.6%;
  right: 16.8%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'MagicBookTitle', 'KaiTi', serif;
  font-size: max(11px, 1.34cqw);
  letter-spacing: 0.26em;
  text-indent: 0.26em;
  white-space: nowrap;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
}

/* 宝石座里的宝石：未选中为暗淡的紫水晶，选中后点亮 */
.magic-book-nav__gem {
  position: absolute;
  top: 50%;
  left: 91.3%;
  width: 1.12cqw;
  height: 1.12cqw;
  background: radial-gradient(circle at 34% 30%, rgb(110, 84, 128), rgb(48, 28, 62) 55%, rgb(18, 10, 24));
  box-shadow: inset 0 0 0.25cqw rgba(0, 0, 0, 0.7);
  transform: translate(-50%, -50%) rotate(45deg);
  pointer-events: none;
  transition: background 0.35s ease, box-shadow 0.35s ease;
}

.magic-book-nav__plate--active .magic-book-nav__gem { left: 8.7%; }

.magic-book-nav__plate:hover:not(.is-active) { color: rgba(236, 204, 140, 0.9); }

.magic-book-nav__plate:hover:not(.is-active) .magic-book-nav__metal {
  filter: drop-shadow(0 0.16cqw 0.18cqw rgba(8, 4, 2, 0.7)) brightness(1) saturate(1);
}

.magic-book-nav__plate:focus-visible { outline: none; }

.magic-book-nav__plate:focus-visible .magic-book-nav__label {
  text-decoration: underline;
  text-decoration-color: rgba(236, 196, 120, 0.7);
  text-underline-offset: 0.3em;
}

.magic-book-nav__plate.is-active { color: rgb(250, 222, 156); }

.magic-book-nav__plate.is-active .magic-book-nav__label {
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85), 0 0 0.7cqw rgba(232, 170, 70, 0.4);
}

.magic-book-nav__plate.is-active .magic-book-nav__metal {
  filter: drop-shadow(0 0.16cqw 0.18cqw rgba(8, 4, 2, 0.7)) brightness(1.06) saturate(1.05);
}

.magic-book-nav__plate.is-active .magic-book-nav__glow { opacity: 1; }

.magic-book-nav__plate.is-active .magic-book-nav__gem {
  background: radial-gradient(circle at 34% 28%, rgb(255, 238, 255), rgb(212, 150, 255) 26%, rgb(132, 60, 210) 60%, rgb(52, 14, 92));
  box-shadow: 0 0 0.8cqw rgba(186, 110, 255, 0.55), inset 0 0 0.22cqw rgba(255, 255, 255, 0.35);
}

/* ---------- 装订线金饰与宝石动效 ---------- */
/* 金饰层：与书本同尺寸的抠图（装订线扣饰、宝石、四角护角），叠在翻页与铭牌之上，静止时与书本像素重合 */
.magic-book-shell__ornaments {
  position: absolute;
  z-index: 5;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.magic-book-gem-fx {
  position: absolute;
  z-index: 6;
  width: 3.45cqw;
  height: 3.45cqw;
  mix-blend-mode: screen;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

/* 呼吸光：缓慢起伏的外晕 */
.magic-book-gem-fx::before {
  position: absolute;
  inset: -55%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--mb-gem-glow) 0%, transparent 62%);
  opacity: 0.2;
  animation: magic-book-gem-breathe 6.4s ease-in-out infinite;
  content: '';
}

/* 宝石内部的魔力流动：裁切在宝石轮廓内、缓慢旋转的光带 */
.magic-book-gem-fx > span {
  position: absolute;
  inset: 0;
  overflow: hidden;
  clip-path: var(--mb-gem-shape);
  opacity: 0.4;
}

.magic-book-gem-fx > span::before {
  position: absolute;
  inset: -30%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    var(--mb-gem-flow) 50deg,
    transparent 110deg,
    transparent 180deg,
    var(--mb-gem-flow) 230deg,
    transparent 290deg
  );
  animation: magic-book-gem-flow 18s linear infinite;
  content: '';
}

.magic-book-gem-fx--crown {
  --mb-gem-glow: rgba(178, 96, 255, 0.5);
  --mb-gem-flow: rgba(236, 196, 255, 0.55);
  --mb-gem-shape: polygon(50% 4%, 92% 48%, 50% 96%, 8% 48%);
  top: 6.64%;
  left: 49.97%;
}

.magic-book-gem-fx--clasp {
  --mb-gem-glow: rgba(255, 70, 60, 0.42);
  --mb-gem-flow: rgba(255, 196, 170, 0.5);
  --mb-gem-shape: circle(40% at 50% 50%);
  top: 89.84%;
  left: 50.13%;
  width: 3.25cqw;
  height: 3.25cqw;
}

.magic-book-gem-fx--clasp::before { animation-duration: 8.2s; animation-delay: -3s; }
.magic-book-gem-fx--clasp > span::before { animation-duration: 24s; animation-direction: reverse; }

@keyframes magic-book-gem-breathe {
  0%, 100% { opacity: 0.16; }
  50% { opacity: 0.5; }
}

@keyframes magic-book-gem-flow {
  to { transform: rotate(360deg); }
}

@keyframes magic-book-card-breathe {
  0%, 100% { opacity: 0.38; }
  50% { opacity: 0.72; }
}

@keyframes magic-book-ink-in {
  from { opacity: 0; filter: blur(2px); }
  to { opacity: 1; filter: none; }
}

/* ---------- 响应式：书本始终保持 3:2，仅按书本宽度调整信息密度 ---------- */
@container magic-book (max-width: 760px) {
  .magic-book-text-page__hint,
  .magic-book-text-page__keywords,
  .magic-book-heading__note { display: none; }

  .magic-book-folio { padding-top: 3.6cqw; padding-bottom: 2.6cqw; }
  .magic-book-text-page__description { margin-top: 1.2cqw; line-height: 1.7; }
  .magic-book-seal-button { margin-top: 1.1cqw; }
}

@container magic-book (max-width: 540px) {
  .magic-book-heading__eyebrow,
  .magic-book-rule,
  .magic-book-text-page__meta,
  .magic-book-illumination__caption { display: none; }

  .magic-book-heading__title { font-size: max(13px, 2.7cqw); }
  .magic-book-heading--compact .magic-book-heading__title { font-size: max(11px, 2cqw); }
  .magic-book-text-page__description { font-size: max(10px, 1.2cqw); line-height: 1.6; }
  .magic-book-text-page__description::first-letter { float: none; margin: 0; color: inherit; font-family: inherit; font-size: 1em; }
  .magic-book-nav__label { font-size: max(9px, 1.34cqw); letter-spacing: 0.08em; text-indent: 0.08em; }
}

@media (prefers-reduced-motion: reduce) {
  .magic-book-folio,
  .magic-book-gem-fx::before,
  .magic-book-gem-fx > span::before,
  .magic-book-active-card-button.is-selected::after { animation: none; }
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

.story-line--right {
  text-align: right;
  color: rgba(255, 239, 205, 0.88);
}

.story-line--divider {
  min-height: 0;
  margin: 1.1em 0;
  border-top: 1px solid rgba(212, 175, 55, 0.24);
}

.story-line--divider .story-line-empty {
  display: none;
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
  color: #8fb2ff;
}

.story-tucao-wrap {
  margin: 0.26rem 0 0.34rem;
}

.story-tucao-wrap--catsay .story-tucao-toggle {
  border-color: rgba(244, 114, 182, 0.46);
  background: rgba(56, 23, 42, 0.86);
  color: rgba(251, 207, 232, 0.98);
}

.story-tucao-wrap--sexualScene .story-tucao-toggle {
  border-color: rgba(248, 113, 113, 0.48);
  background: rgba(69, 26, 26, 0.86);
  color: rgba(254, 202, 202, 0.98);
}

.story-tucao-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgba(201, 161, 96, 0.55);
  border-radius: 2px;
  background: linear-gradient(180deg, #2f241c, #1a1310);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.12), 0 1px 3px rgba(0, 0, 0, 0.45);
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-ui);
  font-size: 0.72em;
  letter-spacing: 0.08em;
  padding: 0.24rem 0.7rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}

.story-tucao-toggle:hover {
  border-color: var(--dg-gold-bright);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.16), 0 0 8px rgba(232, 170, 70, 0.3);
  color: var(--dg-text-strong);
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

.story-tucao-wrap--sexualScene .story-tucao-panel {
  border-color: rgba(248, 113, 113, 0.44);
  background:
    linear-gradient(160deg, rgba(255, 245, 245, 0.91), rgba(255, 241, 242, 0.83)),
    radial-gradient(circle at 6% 3%, rgba(248, 113, 113, 0.2), transparent 52%);
  color: rgba(127, 29, 29, 0.94);
}

.story-tucao-wrap--sexualScene .story-tucao-panel .story-line {
  color: rgba(127, 29, 29, 0.94);
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

.player-detail-modal {
  display: grid;
  grid-template-columns: minmax(15rem, 18.5rem) minmax(0, 1fr);
  gap: 28px;
  min-width: 0;
}

.player-detail-portrait-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.9rem;
  height: 100%;
  min-width: 0;
  padding-right: 24px;
}

/* 立绘与资料区之间：竖向渐隐金线 */
.player-detail-portrait-panel::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--dg-line-strong) 15%, var(--dg-line-strong) 85%, transparent);
  content: '';
}

/* 立绘：九宫格金角铁框（与弹窗同一素材）+ 暗色拱顶光晕 */
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
  background:
    radial-gradient(ellipse 80% 55% at 50% 30%, rgba(154, 92, 240, 0.14), transparent 70%),
    linear-gradient(180deg, #1d1510, #0d0907);
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.7);
}

.player-detail-portrait-frame {
  position: absolute;
  z-index: 2;
  inset: -8px;
  border-style: solid;
  border-width: 40px;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
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
  color: rgba(201, 161, 96, 0.25);
  font-family: var(--dg-font-title);
  font-size: 6rem;
}

.player-detail-nameplate {
  padding: 6px 0 0;
  text-align: center;
}

.player-detail-name {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 22px;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85), 0 0 12px rgba(232, 170, 70, 0.25);
}

.player-detail-subtitle {
  margin-top: 0.15rem;
  color: var(--dg-text-faint);
  font-size: 0.72rem;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
}

.player-detail-upload-actions {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.player-detail-upload-btn { min-height: 2.4rem; }

.player-detail-upload-hint {
  margin-top: auto;
  color: var(--dg-text-faint);
  font-family: var(--dg-font-serif);
  font-size: 0.74rem;
  font-style: italic;
  line-height: 1.55;
  text-align: center;
}

.player-detail-data-panel {
  min-width: 0;
  max-height: 42rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.05rem 0.35rem 0.05rem 0.05rem;
}

/* 分栏吸顶：底色与弹窗面板一致 */
.player-detail-tabbar {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #17110d;
}

.player-detail-section { min-width: 0; }

.player-detail-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

/* 分区标题：金色标题字体（与 panel-caption 一致） */
.player-detail-section-title {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 16px;
  letter-spacing: 0.12em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
}

.player-detail-section-meta {
  padding: 1px 9px;
  border: 1px solid rgba(201, 161, 96, 0.4);
  border-radius: 2px;
  background: linear-gradient(180deg, #2a1f18, #15100c);
  color: var(--dg-gold);
  font-family: var(--dg-font-data);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
}

.player-detail-subtabbar { margin-top: 0.95rem; }

/* ---------- 基础数值：宝石图标 + 凹陷铁槽 ---------- */
.player-detail-stat-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.player-detail-stat-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 0.85rem;
  padding: 0.75rem 0.95rem;
  border: 1px solid rgba(201, 161, 96, 0.22);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.12));
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.55);
}

.player-detail-stat-icon {
  grid-row: 1 / 3;
  width: 2.8rem;
  height: 2.8rem;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.player-detail-stat-label {
  color: var(--dg-text-muted);
  font-size: 0.74rem;
  letter-spacing: 0.12em;
}

.player-detail-stat-value {
  color: var(--dg-text-strong);
  font-family: var(--dg-font-data);
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.25;
}

.player-detail-stat-value--hp { color: #f0a097; }
.player-detail-stat-value--mp { color: #a3c4f5; }
.player-detail-stat-value--gold { color: var(--dg-coin); }

.player-detail-empty {
  margin-top: 0.8rem;
  padding: 0.95rem 1rem;
  color: var(--dg-text-faint);
  font-family: var(--dg-font-serif);
  font-style: italic;
  letter-spacing: 0.06em;
  text-align: center;
}

/* ---------- 负面状态：诅咒印记条目 ---------- */
.player-detail-negative-list {
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.player-detail-negative-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(154, 92, 240, 0.32);
  border-radius: 2px;
  background:
    radial-gradient(ellipse 60% 120% at 0% 50%, rgba(154, 92, 240, 0.14), transparent 70%),
    rgba(20, 12, 24, 0.6);
}

.player-detail-negative-icon {
  grid-row: 1 / 3;
  width: 2.2rem;
  height: 2.2rem;
  margin-top: 0.1rem;
  object-fit: contain;
}

.player-detail-negative-name {
  color: #d9a6f2;
  font-family: var(--dg-font-title);
  font-size: 0.98rem;
  letter-spacing: 0.08em;
}

.player-detail-negative-desc {
  margin-top: 0.3rem;
  color: var(--dg-text);
  font-size: 0.8rem;
  line-height: 1.6;
}

/* ---------- 背包 ---------- */
.player-detail-bag-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.player-detail-bag-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
}

.dungeon-modal .dungeon-modal-body .player-detail-bag-card--consumable.panel-item { border-left: 2px solid rgba(79, 143, 224, 0.55); }

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
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1rem;
  letter-spacing: 0.06em;
  line-height: 1.35;
}

.player-detail-bag-desc {
  margin-top: 0.4rem;
  color: var(--dg-text);
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
  border: 1px solid rgba(201, 161, 96, 0.3);
  border-radius: 2px;
  padding: 0.18rem 0.55rem;
  font-family: var(--dg-font-data);
  font-size: 0.68rem;
  line-height: 1.3;
}

.player-detail-bag-tag--heal {
  border-color: rgba(127, 179, 106, 0.5);
  background: rgba(40, 64, 32, 0.45);
  color: #bfe0ae;
}

.player-detail-bag-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-shrink: 0;
}

.player-detail-bag-btn { min-width: 4.5rem; min-height: 2.15rem; }

/* ---------- 主角信息 ---------- */
.player-detail-info-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.2rem 1.2rem;
}

.player-detail-info-item {
  position: relative;
  padding: 0.75rem 0.2rem;
}

.player-detail-info-item::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--dg-line), transparent);
  content: '';
}

.player-detail-info-label {
  color: var(--dg-text-faint);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
}

.player-detail-info-value {
  margin-top: 0.3rem;
  color: var(--dg-text-strong);
  font-family: var(--dg-font-serif);
  font-size: 0.95rem;
  line-height: 1.55;
  word-break: break-word;
}

.player-detail-info-value--multiline { white-space: pre-wrap; }
.player-detail-info-item--multiline { grid-column: 1 / -1; }

@media (max-width: 960px) {
  .player-detail-modal {
    grid-template-columns: minmax(0, 1fr);
  }

  .player-detail-portrait-panel { display: grid; grid-template-columns: 140px minmax(0, 1fr); align-items: start; gap: 12px 20px; height: auto; padding-right: 0; padding-bottom: 20px; }
  .player-detail-portrait-panel::after { top: auto; right: 0; bottom: 0; left: 0; width: auto; height: 1px; background: linear-gradient(90deg, transparent, var(--dg-line-strong) 15%, var(--dg-line-strong) 85%, transparent); }
  .player-detail-nameplate, .player-detail-upload-actions { grid-column: 2; text-align: left; justify-content: flex-start; }
  .player-detail-nameplate { padding: 0; }
  .player-detail-name { text-indent: 0; }
  .player-detail-upload-actions { flex-direction: column; align-items: flex-start; }
  .player-detail-upload-hint { grid-column: 1 / -1; margin: 0; }
  .player-detail-data-panel { max-height: none; overflow-y: visible; }

  .player-detail-portrait-shell {
    grid-column: 1;
    grid-row: 1 / 3;
    align-self: start;
    width: 100%;
    aspect-ratio: 3 / 4;
    max-height: none;
  }

  .player-detail-portrait-frame { border-width: 28px; inset: -5px; }

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

@media (max-width: 520px) {
  .player-detail-portrait-panel { grid-template-columns: 88px minmax(0, 1fr); gap: 12px 16px; }
  .player-detail-portrait-shell { aspect-ratio: 3 / 5; }
  .player-detail-tabbar { position: static; }
  .player-detail-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .player-detail-stat-card { padding: 10px; column-gap: 0.6rem; }
  .player-detail-stat-icon { width: 2.1rem; height: 2.1rem; }
}

/* 退出战斗：暗红危险铭牌（与 panel-action--danger 同一语言） */
.combat-exit-btn {
  border: 1px solid rgba(192, 80, 63, 0.65);
  border-radius: 2px;
  background: linear-gradient(180deg, #3a1d17, #22100c);
  box-shadow: inset 0 1px 0 rgba(255, 200, 180, 0.12), 0 2px 8px rgba(0, 0, 0, 0.55);
  color: #ecb4a6;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}

.combat-exit-btn:hover {
  border-color: #e07a66;
  box-shadow: inset 0 1px 0 rgba(255, 200, 180, 0.16), 0 0 10px rgba(192, 80, 63, 0.4);
  color: #f6cdc2;
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

.relic-tooltip-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.relic-tooltip-orb {
  flex: none;
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.relic-tooltip-name {
  min-width: 0;
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

/* ---------- 地图：无外框整张地图（DungeonModal bare 变体） ---------- */
/* 宽度设在插槽内容上（GameView 作用域样式无法选中 DungeonModal 内部的面板元素） */
.map-modal {
  position: relative;
  display: flex;
  width: min(96vw, 112rem);
  flex-direction: column;
}

.map-empty {
  display: flex;
  height: 17rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(154, 106, 42, 0.6);
  background: var(--dg-bg-parchment);
  color: var(--dg-ink-soft);
  font-family: var(--dg-font-serif);
  font-size: 14px;
  font-style: italic;
  letter-spacing: 0.08em;
}

/* 视口即整张地图：没有边框 UI，只用内阴影让边缘自然暗下去 */
.map-viewport {
  position: relative;
  width: 100%;
  height: min(92vh, 64rem);
  min-height: 24rem;
  background: #e9e4cf;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  cursor: grab;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.7);
}

.map-viewport:active {
  cursor: grabbing;
}

.map-viewport::before {
  position: absolute;
  z-index: 5;
  inset: 0;
  box-shadow: inset 0 0 70px rgba(40, 22, 8, 0.6);
  pointer-events: none;
  content: '';
}

/* 楼层信息：固定在视口顶部居中（不随地图缩放与拖动） */
.map-cartouche {
  position: absolute;
  z-index: 8;
  top: 0;
  left: 50%;
  display: flex;
  min-width: 26rem;
  flex-direction: column;
  align-items: center;
  padding: 14px 56px 18px;
  color: var(--dg-ink-text);
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.map-cartouche__floor {
  color: var(--dg-rubric);
  font-family: var(--dg-font-title);
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  line-height: 1.1;
  text-shadow: 0 1px 0 rgba(255, 244, 214, 0.55);
}

.map-cartouche__area {
  margin-top: 4px;
  color: var(--dg-ink-text);
  font-family: var(--dg-font-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
}

.map-cartouche__rule {
  width: 18rem;
  height: 14px;
  margin: 6px 0 4px;
  background: var(--dg-img-divider) center / 100% auto no-repeat;
  filter: sepia(0.6) brightness(0.55) contrast(1.3);
}

.map-cartouche__stats {
  display: flex;
  gap: 26px;
  margin: 0;
}

.map-cartouche__stats > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}

.map-cartouche__stats > div + div::before {
  width: 6px;
  height: 6px;
  margin-right: 18px;
  align-self: center;
  background: var(--dg-rubric);
  transform: rotate(45deg);
  content: '';
}

.map-cartouche__stats dt {
  color: var(--dg-ink-soft);
  font-size: 13px;
  letter-spacing: 0.12em;
}

.map-cartouche__stats dd {
  margin: 0;
  color: var(--dg-ink-text);
  font-family: var(--dg-font-data);
  font-size: 15px;
  font-weight: 700;
}

/* 图例：固定在视口右上方（不随地图缩放与拖动），墨线双框 */
.map-legend {
  position: absolute;
  z-index: 8;
  /* 让出右上角的关闭按钮 */
  top: 4.6rem;
  right: 1.1rem;
  display: flex;
  width: 188px;
  flex-direction: column;
  gap: 9px;
  padding: 16px 18px 18px;
  border: 1px solid rgba(92, 58, 30, 0.55);
  background: rgba(240, 228, 196, 0.88);
  box-shadow:
    inset 0 0 0 3px rgba(240, 228, 196, 0.5),
    inset 0 0 0 4px rgba(92, 58, 30, 0.35),
    0 6px 16px rgba(40, 22, 8, 0.25);
  color: var(--dg-ink-text);
  pointer-events: none;
}

.map-legend__title {
  margin-bottom: 2px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(92, 58, 30, 0.4);
  color: var(--dg-rubric);
  font-family: var(--dg-font-title);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5em;
  text-indent: 0.5em;
  text-align: center;
}

.map-legend__item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.map-legend__icon {
  display: block;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  background-repeat: no-repeat;
  background-size: 400% 200%;
  opacity: 0.85;
}

.map-legend__label {
  color: var(--dg-ink-text);
  font-family: var(--dg-font-serif);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

/* 缩放控制：固定在视口左下角（右侧留给图例），不随地图移动 */
.map-controls {
  position: absolute;
  z-index: 10;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.map-controls__zoom {
  margin-right: 0.3rem;
  padding: 2px 9px;
  border: 1px solid rgba(201, 161, 96, 0.5);
  border-radius: 2px;
  background: rgba(17, 12, 9, 0.8);
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-data);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.map-control-btn {
  display: grid;
  place-items: center;
  width: 2.3rem;
  height: 2.3rem;
  padding: 0;
  border: 1px solid rgba(201, 161, 96, 0.6);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3a2c22, #16100c 70%);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.55), 0 3px 8px rgba(0, 0, 0, 0.5);
  color: var(--dg-gold);
  transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.map-control-btn:hover,
.map-control-btn:focus-visible {
  outline: none;
  border-color: var(--dg-gold-bright);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.55), 0 0 10px rgba(232, 170, 70, 0.35);
  color: var(--dg-gold-bright);
}

.map-control-btn svg { width: 1.05rem; height: 1.05rem; }

.map-canvas {
  position: absolute;
  left: 0;
  top: 0;
  background: #e9e4cf
    url("https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E4%B8%BB%E7%95%8C%E9%9D%A2/%E5%9C%B0%E5%9B%BE%E8%83%8C%E6%99%AF.png")
    center / 100% 100% no-repeat;
}

.map-layout {
  position: absolute;
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
  /* 与缩放反向补偿（见 mapNodeBoost），独立于 hover 时的 transform */
  scale: var(--map-node-boost, 1);
  border-radius: 50%;
  border: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.08rem;
  overflow: hidden;
  padding: 0;
  appearance: none;
  box-shadow: none;
  font-family: Georgia, 'Times New Roman', serif;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease,
    filter 0.18s ease;
}

.map-room-cell--latest {
  box-shadow: none;
}

.map-room-cell:disabled {
  pointer-events: none;
  cursor: default;
  filter: saturate(0.42);
  opacity: 0.65;
}

.map-room-cell--visited {
  opacity: 0.38;
}

.map-room-cell--latest {
  opacity: 1;
  z-index: 2;
  filter: none;
}

.map-room-cell--latest:disabled {
  opacity: 1;
  filter: none;
}

.map-room-cell--available {
  cursor: pointer;
  filter: saturate(1.15);
  opacity: 1;
  outline: 2px solid rgba(82, 67, 44, 0.24);
  outline-offset: 2px;
}

.map-room-cell--start,
.map-room-cell--boss {
  width: 70px;
  height: 70px;
  font-size: 1.35rem;
}

.map-room-cell--boss {
  box-shadow: none;
}

/* ---------- 区域门牌：领主房之后选择下一片区域 ---------- */
.map-room-cell--floor {
  scale: 1;
  flex-direction: row;
  justify-content: flex-start;
  gap: 14px;
  padding: 0 18px 0 14px;
  overflow: visible;
  border: 1px solid rgba(92, 58, 30, 0.7) !important;
  border-radius: 48px 6px 6px 48px;
  background:
    linear-gradient(90deg, rgba(240, 226, 192, 0.96), rgba(226, 206, 164, 0.92)) !important;
  box-shadow:
    inset 0 0 0 4px rgba(240, 226, 192, 0.9),
    inset 0 0 0 5px rgba(92, 58, 30, 0.45),
    0 6px 14px rgba(40, 22, 8, 0.28);
  color: var(--dg-ink-text) !important;
  font-family: var(--dg-font-serif);
  text-align: left;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.map-gate__seal {
  display: grid;
  flex: none;
  width: 60px;
  height: 60px;
  place-items: center;
  border: 2px solid rgba(122, 28, 22, 0.85);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #a8322a, #6d1510 70%);
  box-shadow:
    inset 0 0 0 3px rgba(240, 206, 170, 0.25),
    0 2px 5px rgba(40, 10, 6, 0.4);
  color: #f6e2bf;
  font-family: var(--dg-font-title);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.map-gate__text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.map-gate__text b {
  overflow: hidden;
  color: var(--dg-ink-text);
  font-family: var(--dg-font-title);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.1em;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.map-gate__text small {
  color: var(--dg-rubric);
  font-size: 13px;
  letter-spacing: 0.3em;
}

.map-gate__arrow {
  flex: none;
  color: rgba(92, 58, 30, 0.55);
  font-family: Georgia, serif;
  font-size: 30px;
  line-height: 1;
  transition:
    transform 0.22s ease,
    color 0.22s ease;
}

.map-room-cell--floor.map-room-cell--available:hover,
.map-room-cell--floor.map-room-cell--available:focus-visible {
  transform: translateX(6px);
  border-color: rgba(122, 28, 22, 0.9) !important;
  outline: none;
  background:
    linear-gradient(90deg, rgba(246, 234, 204, 0.98), rgba(232, 212, 170, 0.95)) !important;
  box-shadow:
    inset 0 0 0 4px rgba(246, 234, 204, 0.95),
    inset 0 0 0 5px rgba(122, 28, 22, 0.5),
    0 8px 18px rgba(40, 22, 8, 0.35),
    0 0 0 3px rgba(168, 50, 42, 0.18);
}

.map-room-cell--floor.map-room-cell--available:hover .map-gate__arrow,
.map-room-cell--floor.map-room-cell--available:focus-visible .map-gate__arrow {
  color: var(--dg-rubric);
  transform: translateX(4px);
}

/* 区域选择的路线：更粗的墨线，缓缓流动 */
.map-links path.map-link--gate {
  stroke: rgba(92, 58, 30, 0.6);
  stroke-width: 2.4px;
  stroke-dasharray: 2 9;
  stroke-linecap: round;
  animation: map-gate-flow 1.6s linear infinite;
}

@keyframes map-gate-flow {
  to {
    stroke-dashoffset: -22;
  }
}

.map-room-cell--available:hover,
.map-room-cell--available:focus-visible {
  transform: translateY(-2px) scale(1.08);
  background: radial-gradient(circle, rgba(28, 24, 18, 0.16), rgba(28, 24, 18, 0.02) 68%, transparent 70%) !important;
  outline-color: rgba(82, 67, 44, 0.8);
  box-shadow:
    0 0 0 4px rgba(245, 229, 190, 0.5),
    0 2px 10px rgba(57, 49, 37, 0.38);
}

.map-room-cell--available:hover .map-room-icon,
.map-room-cell--available:focus-visible .map-room-icon {
  transform: scale(1.12);
  filter: brightness(0.62) drop-shadow(0 2px 2px rgba(28, 24, 18, 0.4));
}

.map-room-cell--latest .map-room-icon {
  animation: map-current-room-pulse 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(255, 238, 190, 0.32)) drop-shadow(0 2px 3px rgba(28, 24, 18, 0.28));
}

.map-room-cell--latest .map-room-pulse {
  display: none;
}

.map-room-pulse {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px dashed rgba(85, 68, 43, 0.62);
  pointer-events: none;
}

.map-room-icon {
  position: relative;
  display: block;
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  background-repeat: no-repeat;
  background-size: 400% 200%;
  transition:
    transform 0.22s ease,
    filter 0.22s ease;
}

@keyframes map-current-room-pulse {
  0%,
  100% {
    transform: scale(0.96);
  }

  50% {
    transform: scale(1.08);
  }
}

.map-room-label {
  position: relative;
  max-width: 92%;
  font-size: 0.6rem;
  line-height: 1.1;
  text-align: center;
  opacity: 0.86;
  overflow-wrap: anywhere;
}

.map-room-cell:not(.map-room-cell--floor) .map-room-label {
  display: none;
}

.bond-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.bond-row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 1.1rem;
  min-width: 0;
  padding: 14px 0;
}

.bond-row:not(:last-child)::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--dg-line-strong) 15%, var(--dg-line-strong) 85%, transparent);
  content: '';
}

/* 头像：小号九宫格金角框 */
.bond-portrait-frame {
  position: relative;
  width: clamp(4.9rem, 16vw, 6.3rem);
  min-width: clamp(4.9rem, 16vw, 6.3rem);
  height: clamp(4.9rem, 15vw, 6.3rem);
  padding: 0;
  border: 0;
  background: linear-gradient(180deg, #1d1510, #0d0907);
}

.bond-portrait-border {
  position: absolute;
  z-index: 2;
  inset: -5px;
  border-style: solid;
  border-width: 26px;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
}

.bond-portrait-frame--clickable {
  cursor: zoom-in;
  transition: filter 0.2s ease;
}

.bond-portrait-frame--clickable:hover { filter: brightness(1.12); }

.bond-portrait-frame--clickable:focus-visible {
  outline: 2px solid var(--dg-gold);
  outline-offset: 4px;
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
  color: var(--dg-gold);
  font-family: var(--dg-font-title);
  font-size: 1.6rem;
}

.bond-affection-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.55rem;
  min-width: 0;
}

.bond-affection-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.8rem;
}

.bond-role-name {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1.15rem;
  letter-spacing: 0.12em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
}

.bond-affection-value {
  font-family: var(--dg-font-data);
  font-size: 0.92rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.bond-affection-value--positive { color: #f0b98a; }
.bond-affection-value--negative { color: #9fcbe8; }

/* 好感条：黑铁凹槽 + 每 50 点一道刻度，填充末端嵌一颗宝石 */
.bond-affection-track {
  position: relative;
  height: 8px;
  border: 1px solid rgba(201, 161, 96, 0.4);
  border-radius: 1px;
  background:
    linear-gradient(90deg, transparent calc(25% - 1px), rgba(201, 161, 96, 0.35) calc(25% - 1px), rgba(201, 161, 96, 0.35) 25%, transparent 25%),
    linear-gradient(90deg, transparent calc(50% - 1px), rgba(201, 161, 96, 0.35) calc(50% - 1px), rgba(201, 161, 96, 0.35) 50%, transparent 50%),
    linear-gradient(90deg, transparent calc(75% - 1px), rgba(201, 161, 96, 0.35) calc(75% - 1px), rgba(201, 161, 96, 0.35) 75%, transparent 75%),
    linear-gradient(180deg, #0a0705, #1e1610);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.75);
}

.bond-affection-fill {
  position: relative;
  height: 100%;
  transition: width 0.4s ease;
}

.bond-affection-fill::after {
  position: absolute;
  top: 50%;
  right: -5px;
  width: 9px;
  height: 9px;
  border: 1px solid var(--dg-gold-bright);
  background: radial-gradient(circle at 35% 30%, #fff1dc, var(--bond-gem, #e0954a) 45%, #3a1c08);
  box-shadow: 0 0 6px var(--bond-gem, #e0954a);
  transform: translateY(-50%) rotate(45deg);
  content: '';
}

.bond-affection-fill--positive {
  --bond-gem: #e0954a;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.25), transparent 50%, rgba(0, 0, 0, 0.25)), linear-gradient(90deg, #8a4e22, #d99a5a);
}

.bond-affection-fill--negative {
  --bond-gem: #6fb4e0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.25), transparent 50%, rgba(0, 0, 0, 0.25)), linear-gradient(90deg, #22506e, #79b6d8);
}

/* 立绘大图预览：典籍外框 */
.bond-preview-panel {
  width: min(86vw, 1100px);
  max-height: 90vh;
  overflow: hidden;
  border: 1px solid rgba(201, 161, 96, 0.6);
  border-radius: 2px;
  background: var(--dg-bg-panel);
  box-shadow: inset 0 0 0 3px rgba(17, 12, 9, 0.9), inset 0 0 0 4px rgba(201, 161, 96, 0.3), var(--dg-shadow-deep);
}

.bond-preview-image {
  display: block;
  width: 100%;
  max-height: calc(90vh - 3.2rem);
  object-fit: contain;
  background: radial-gradient(ellipse 70% 60% at 50% 40%, rgba(154, 92, 240, 0.12), transparent 70%), #0d0907;
}

.bond-preview-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.55rem 0.8rem;
  background: linear-gradient(180deg, #221812, #150f0b);
}

.bond-preview-footer::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--dg-line-strong), transparent);
  content: '';
}

.bond-preview-name {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1.1rem;
  letter-spacing: 0.16em;
}

.bond-preview-close-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid rgba(201, 161, 96, 0.55);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3a2c22, #16100c 70%);
  color: var(--dg-gold);
  transition: border-color 0.2s ease, color 0.2s ease;
}

.bond-preview-close-btn:hover {
  border-color: var(--dg-gold-bright);
  color: var(--dg-gold-bright);
}

/* 房间完成按钮（神像房等）：与宝箱房一致的主要按钮框 */
.map-overlay-finish-btn {
  position: absolute;
  left: 50%;
  bottom: clamp(2.5rem, 10vh, 6rem);
  z-index: 98;
  min-width: 24rem;
  transform: translateX(-50%);
  border-style: solid;
  border-width: 0 30px;
  border-image-source: var(--dg-img-button);
  border-image-slice: 0 80 fill;
  border-image-repeat: stretch;
  background: none;
  color: var(--dg-gold-bright);
  padding: 1rem 2rem;
  font-family: var(--dg-font-title);
  font-size: 1.3rem;
  letter-spacing: 0.16em;
  line-height: 1.25;
  text-align: center;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
  pointer-events: auto;
  transition: filter 0.18s ease;
}

.map-overlay-finish-btn:hover:not(:disabled),
.map-overlay-finish-btn:focus-visible {
  outline: none;
  filter: brightness(1.15) drop-shadow(0 0 6px rgba(232, 170, 70, 0.35));
}

.map-overlay-finish-btn:disabled {
  cursor: wait;
  filter: grayscale(0.6) brightness(0.7);
}

/* ---------- 宝箱怪掉落：魔典面板 + 稀有度光球 ---------- */
.mimic-drop-overlay {
  background:
    radial-gradient(ellipse 70% 70% at 50% 50%, rgba(60, 4, 12, 0.55), transparent 70%),
    rgba(4, 2, 6, 0.9);
}

.mimic-drop-panel {
  position: relative;
  width: 100%;
  max-width: 50rem;
  border-style: solid;
  border-width: 36px;
  border-color: transparent;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  /* 金线位于切片外侧，外推 0.3 倍框宽让金线压在底色边缘，避免露出空隙 */
  border-image-outset: 11px;
  border-image-repeat: stretch;
  background: var(--dg-bg-panel);
  background-clip: border-box;
  background-origin: border-box;
  padding: 0.6rem 0.9rem 0.4rem;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
}

.mimic-drop-heading {
  margin-bottom: 1rem;
  text-align: center;
}

.mimic-drop-title {
  font-family: var(--dg-font-title);
  font-size: 1.8rem;
  letter-spacing: 0.22em;
  color: var(--dg-gold-bright);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.9), 0 0 12px rgba(200, 30, 40, 0.35);
}

.mimic-drop-heading::after {
  content: '';
  display: block;
  width: min(20rem, 80%);
  height: 1.2rem;
  margin: 0.55rem auto 0;
  background: var(--dg-img-divider) center / contain no-repeat;
}

.mimic-drop-subtitle {
  margin-top: 0.35rem;
  color: var(--dg-text-muted);
  font-size: 0.95rem;
  letter-spacing: 0.08em;
}

.mimic-drop-relic {
  --orb-glow: rgba(255, 150, 60, 0.45);
  width: 100%;
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 1.1rem;
  align-items: center;
  border: 1px solid rgba(201, 161, 96, 0.38);
  background:
    radial-gradient(circle at 12% 50%, var(--orb-glow), transparent 42%),
    linear-gradient(180deg, rgba(20, 12, 10, 0.82), rgba(10, 7, 9, 0.9));
  padding: 0.9rem 1.1rem;
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.06);
  transition:
    border-color 0.2s ease,
    filter 0.2s ease;
}

.mimic-drop-relic.is-rare {
  --orb-glow: rgba(150, 80, 255, 0.42);
}

.mimic-drop-relic.is-legendary {
  --orb-glow: rgba(255, 190, 60, 0.5);
}

.mimic-drop-relic:hover,
.mimic-drop-relic:focus-visible {
  border-color: rgba(232, 190, 110, 0.75);
  filter: brightness(1.06);
  outline: none;
}

.mimic-drop-orb {
  display: block;
  width: 7rem;
  aspect-ratio: 1;
  animation: mimic-drop-orb-float 3.6s ease-in-out infinite;
}

.mimic-drop-orb img {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.6));
}

.mimic-drop-copy {
  min-width: 0;
}

.test-relic-orb {
  flex: none;
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.mimic-drop-name {
  font-family: var(--dg-font-title);
  color: var(--dg-gold-bright);
  font-size: 1.45rem;
  line-height: 1.25;
}

.mimic-drop-meta {
  margin-top: 0.2rem;
  color: var(--dg-text-muted);
  font-size: 0.9rem;
}

.mimic-drop-effect {
  margin-top: 0.6rem;
  color: var(--dg-text);
  font-size: 1.02rem;
  line-height: 1.55;
}

.mimic-drop-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1.2rem;
}

.mimic-drop-skip {
  border: 1px solid rgba(201, 161, 96, 0.35);
  background: rgba(10, 7, 9, 0.6);
  color: var(--dg-text-muted);
  font-family: var(--dg-font-title);
  font-size: 1.05rem;
  letter-spacing: 0.16em;
  padding: 0.65rem 1.5rem;
  transition:
    border-color 0.18s ease,
    color 0.18s ease;
}

.mimic-drop-skip:hover:not(:disabled),
.mimic-drop-skip:focus-visible {
  border-color: rgba(232, 190, 110, 0.7);
  color: var(--dg-text);
  outline: none;
}

.mimic-drop-take {
  min-width: 10rem;
  border-style: solid;
  border-width: 0 24px;
  border-image-source: var(--dg-img-button);
  border-image-slice: 0 80 fill;
  border-image-repeat: stretch;
  background: none;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1.15rem;
  letter-spacing: 0.2em;
  padding: 0.75rem 1.2rem;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
  transition: filter 0.18s ease;
}

.mimic-drop-take:hover:not(:disabled),
.mimic-drop-take:focus-visible {
  outline: none;
  filter: brightness(1.15) drop-shadow(0 0 6px rgba(232, 170, 70, 0.35));
}

.mimic-drop-skip:disabled,
.mimic-drop-take:disabled {
  cursor: not-allowed;
  filter: grayscale(0.6) brightness(0.7);
}

@keyframes mimic-drop-orb-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.inventory-relic {
  min-width: 0;
  color: #b8a88c;
}

.inventory-relic-icon-wrap {
  position: relative;
  display: grid;
  flex: none;
  width: 56px;
  height: 56px;
  place-items: center;
}

.inventory-relic-icon-wrap::before {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(closest-side, currentColor, transparent);
  opacity: 0.32;
  content: '';
}

/* 圣遗物光球（按稀有度），与宝箱房共用 */
.inventory-relic-icon {
  position: relative;
  width: 54px;
  height: 54px;
  object-fit: contain;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.6));
  transition: transform 0.2s ease;
}

.inventory-relic:hover .inventory-relic-icon,
.inventory-relic:focus-visible .inventory-relic-icon {
  transform: translateY(-2px) scale(1.05);
}

.inventory-relic-count {
  position: absolute;
  right: -3px;
  bottom: 0;
  padding: 0 2px;
  border: 1px solid currentColor;
  border-radius: 2px;
  background: #15121a;
  font: 10px/1.3 var(--font-ui);
}

.inventory-relic-name {
  width: 100%;
  min-height: 3em;
  margin-top: 6px;
  color: var(--dg-text);
  font: 12px/1.5 var(--dg-font-title);
  letter-spacing: 0.04em;
  text-align: center;
  overflow-wrap: anywhere;
}

.inventory-relic.is-rare {
  color: #c59dbd;
}

.inventory-relic.is-legendary {
  color: #e7bb76;
}

.spring-cleanse-float {
  position: absolute;
  left: 50%;
  bottom: 1.25rem;
  max-width: min(90%, 860px);
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.96);
  font-family: var(--dg-font-title);
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

.game-feedback-float {
  position: absolute;
  top: 8%;
  left: 50%;
  z-index: 300;
  max-width: min(88%, 52rem);
  padding: 0.75rem 1.2rem;
  border: 1px solid rgba(245, 208, 102, 0.68);
  border-radius: 3px;
  background: rgba(10, 8, 7, 0.88);
  color: rgba(255, 242, 206, 0.98);
  font-family: var(--dg-font-title);
  font-size: 1.08rem;
  line-height: 1.4;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 12px rgba(245, 208, 102, 0.28);
  pointer-events: none;
  transform: translateX(-50%);
  animation: game-feedback-float 2.6s ease-out forwards;
}

.game-feedback-fade-enter-active,
.game-feedback-fade-leave-active {
  transition: opacity 180ms ease;
}

.game-feedback-fade-enter-from,
.game-feedback-fade-leave-to {
  opacity: 0;
}

.room-asset-loading {
  position: absolute;
  inset: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(3, 3, 4, 0.94);
  color: rgba(245, 225, 184, 0.96);
  font-family: var(--dg-font-title);
  font-size: 1.15rem;
  text-align: center;
  text-shadow: 0 1px 5px #000;
  pointer-events: auto;
}

.room-asset-loading::before {
  width: 2.4rem;
  height: 2.4rem;
  border: 2px solid rgba(245, 208, 102, 0.22);
  border-top-color: rgba(245, 208, 102, 0.95);
  border-radius: 50%;
  content: '';
  animation: room-image-loading-spin 0.9s linear infinite;
}

.room-asset-loading.is-error::before {
  animation-play-state: paused;
  border-color: rgba(245, 208, 102, 0.7);
}

.room-asset-loading__retry {
  min-height: 2.5rem;
  padding: 0.55rem 1rem;
  border: 1px solid rgba(245, 208, 102, 0.62);
  border-radius: 3px;
  background: rgba(58, 39, 20, 0.75);
  color: rgba(255, 242, 206, 0.98);
  font-size: 0.92rem;
}

.room-asset-loading__retry:hover,
.room-asset-loading__retry:focus-visible {
  background: rgba(87, 59, 27, 0.92);
}

@keyframes room-image-loading-spin {
  to { transform: rotate(360deg); }
}

@keyframes game-feedback-float {
  0% { opacity: 0; transform: translate(-50%, 8px); }
  12% { opacity: 1; transform: translate(-50%, 0); }
  78% { opacity: 1; transform: translate(-50%, -5px); }
  100% { opacity: 0; transform: translate(-50%, -18px); }
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

.idol-slots-row--black .idol-slot-wrap {
  filter: saturate(1.15) brightness(0.9);
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

.idol-slot-art {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.82;
  mix-blend-mode: screen;
  filter: saturate(1.08) contrast(1.06);
  animation: idolSlotArtPulse 4.8s ease-in-out infinite;
}

.idol-layout--black .idol-slot {
  border-color: rgba(248, 113, 113, 0.78);
  background:
    linear-gradient(145deg, rgba(39, 18, 34, 0.62), rgba(5, 5, 12, 0.72)),
    radial-gradient(circle at 50% 38%, rgba(190, 24, 93, 0.26), rgba(15, 23, 42, 0.12) 68%);
  box-shadow:
    inset 0 0 0 1px rgba(251, 113, 133, 0.18),
    0 12px 30px rgba(0, 0, 0, 0.48),
    0 0 24px rgba(168, 36, 93, 0.26);
}

.idol-layout--black .idol-slot-hint {
  color: rgba(255, 220, 220, 0.96);
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.86),
    0 0 10px rgba(190, 24, 93, 0.48);
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
  min-width: 0;
  width: 100%;
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
  width: min(100%, 14rem);
  color: rgba(240, 249, 255, 0.95);
  font-size: 1.08rem;
  font-weight: 700;
  line-height: 1.28;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
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
  /* 吸附到槽位 / 无效放置弹回：平滑过渡；拖拽与掷落时即时跟随 */
  transition: transform 0.34s cubic-bezier(0.2, 0.8, 0.3, 1);
  pointer-events: auto;
}

.idol-dice-draggable.is-dragging,
.idol-dice-draggable.is-casting {
  transition: none;
}

.idol-dice-draggable:active {
  cursor: grabbing;
}

.idol-dice-draggable.is-locked {
  cursor: default;
}

.idol-dice-draggable--second {
  z-index: 2;
}

.idol-dice-body {
  transform-origin: 50% 60%;
  filter: drop-shadow(0 10px 12px rgba(0, 0, 0, 0.45));
  transition:
    transform 0.22s ease,
    filter 0.22s ease;
}

/* 拖起：抬高 + 投影拉远 */
.idol-dice-draggable.is-dragging .idol-dice-body {
  transform: scale(1.12) rotate(-3deg);
  filter: drop-shadow(0 22px 18px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 14px rgba(255, 226, 150, 0.45));
}

/* 已放入槽位：轻微浮动 */
.idol-dice-draggable.is-placed:not(.is-dragging) .idol-dice-body {
  animation: idol-dice-hover 2.8s ease-in-out infinite;
  filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 12px rgba(255, 236, 180, 0.55));
}

/* 掷落：从高处旋转落下、触地回弹 */
.idol-dice-draggable.is-casting .idol-dice-body {
  animation: idol-dice-cast 0.9s cubic-bezier(0.3, 0.6, 0.4, 1) var(--cast-delay, 0ms) both;
}

/* 揭示点数：一圈光环 */
.idol-dice-reveal {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 150%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 2px solid rgba(255, 236, 170, 0.9);
  box-shadow:
    0 0 18px rgba(255, 220, 140, 0.7),
    inset 0 0 18px rgba(255, 220, 140, 0.45);
  translate: -50% -50%;
  pointer-events: none;
  animation: idol-ring-out 0.7s ease-out both;
}

.idol-scene--black .idol-dice-reveal {
  border-color: rgba(255, 120, 130, 0.9);
  box-shadow:
    0 0 18px rgba(220, 40, 70, 0.7),
    inset 0 0 18px rgba(220, 40, 70, 0.45);
}

/* 供奉：放入槽位的骰子化光升起 */
.idol-scene.is-offering .idol-dice-draggable.is-placed .idol-dice-body {
  animation: idol-dice-offer 1.1s cubic-bezier(0.5, 0, 0.7, 0.4) both;
}

.idol-scene.is-offering .idol-dice-draggable:not(.is-placed) .idol-dice-body {
  opacity: 0;
  transition: opacity 0.4s ease;
}

.idol-overlay-actions {
  position: absolute;
  left: 50%;
  bottom: clamp(1.6rem, 6vh, 4rem);
  z-index: 98;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.7rem;
  width: min(92%, 34rem);
  transform: translateX(-50%);
  pointer-events: auto;
}

.idol-overlay-actions .map-overlay-finish-btn {
  position: static;
  min-width: 0;
  transform: none;
}

.idol-overlay-actions .map-overlay-finish-btn:hover:not(:disabled),
.idol-overlay-actions .map-overlay-finish-btn:focus-visible {
  transform: translateY(-2px) scale(1.03);
}

/* 次要按钮：与主要按钮框同一字体，深底细金边 */
.idol-leave-btn {
  min-width: 13rem;
  border: 1px solid rgba(201, 161, 96, 0.55);
  background: rgba(10, 7, 9, 0.78);
  color: var(--dg-text);
  padding: 0.85rem 1.4rem;
  font-family: var(--dg-font-title);
  font-size: 1.05rem;
  letter-spacing: 0.12em;
  line-height: 1.25;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.idol-leave-btn:hover:not(:disabled),
.idol-leave-btn:focus-visible {
  outline: none;
  border-color: rgba(232, 190, 110, 0.85);
  color: var(--dg-text-strong, #f3e6cc);
  transform: translateY(-2px);
}

.idol-leave-btn:disabled {
  cursor: wait;
  opacity: 0.56;
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

@keyframes idolSlotArtPulse {
  0%,
  100% {
    opacity: 0.72;
    transform: scale(0.985);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.015);
  }
}

/* ---------- 神像房：入场 / 神像苏醒 / 槽位点亮 / 供奉 ---------- */
.idol-scene {
  container-type: size;
  --idol-burst: 255, 236, 180;
  --idol-flash: 255, 248, 225;
}

.idol-scene--black {
  --idol-burst: 240, 70, 90;
  --idol-flash: 150, 10, 30;
}

/* 背景缓缓推近落定 */
.idol-scene__bg {
  animation: idol-bg-settle 1.8s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

/* 与背景同一 16:9 cover 坐标系 */
.idol-fx {
  position: absolute;
  left: 50%;
  top: 50%;
  width: max(100cqw, calc(100cqh * 16 / 9));
  aspect-ratio: 16 / 9;
  translate: -50% -50%;
  container-type: size;
  pointer-events: none;
}

.idol-statue-light {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.8s ease;
}

.idol-statue-light.is-active {
  opacity: 1;
}

.idol-statue-light__beam {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: 0;
  width: 13cqw;
  height: calc(var(--y) * 1% + 34%);
  translate: -50% 0;
  background: linear-gradient(180deg, rgba(var(--tint), 0.5), rgba(var(--tint), 0.22) 60%, transparent);
  -webkit-mask: linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent);
  mask: linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent);
  mix-blend-mode: screen;
  filter: blur(0.6cqw);
  transform-origin: 50% 0;
}

.idol-statue-light.is-active .idol-statue-light__beam {
  animation:
    idol-beam-descend 0.9s cubic-bezier(0.2, 0.7, 0.3, 1) both,
    idol-beam-breathe 4.5s ease-in-out 0.9s infinite;
}

.idol-statue-light__halo {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: calc(var(--y) * 1%);
  width: 24cqw;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(var(--tint), 0.55), rgba(var(--tint), 0.16) 55%, transparent);
  mix-blend-mode: screen;
}

.idol-statue-light.is-active .idol-statue-light__halo {
  animation:
    idol-halo-wake 1s cubic-bezier(0.2, 0.7, 0.3, 1) both,
    idol-halo-breathe 3.6s ease-in-out 1s infinite;
}

/* 供奉：光柱与光晕涌起 */
.idol-scene.is-offering .idol-statue-light.is-active .idol-statue-light__beam {
  animation: idol-beam-surge 1.4s ease-in both;
}

.idol-scene.is-offering .idol-statue-light.is-active .idol-statue-light__halo {
  animation: idol-halo-surge 1.4s ease-in both;
}

/* 槽位依次浮现 */
.idol-slot-wrap {
  animation: idol-slot-enter 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) calc(var(--i, 0) * 130ms + 260ms) both;
}

.idol-slot-frame {
  position: relative;
  display: grid;
  place-items: center;
}

/* 放入成功：光环扩散 */
.idol-slot-burst,
.idol-slot-reject {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  pointer-events: none;
}

.idol-slot-burst {
  border: 2px solid rgba(var(--idol-burst), 0.95);
  box-shadow:
    0 0 24px rgba(var(--idol-burst), 0.75),
    inset 0 0 24px rgba(var(--idol-burst), 0.5);
  animation: idol-ring-out 0.8s ease-out both;
}

.idol-slot-burst::after {
  position: absolute;
  inset: 20%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(var(--idol-burst), 0.9), transparent);
  mix-blend-mode: screen;
  animation: idol-core-flash 0.6s ease-out both;
  content: '';
}

/* 放置无效：槽位闪红 */
.idol-slot-reject {
  background: radial-gradient(closest-side, rgba(255, 60, 60, 0.55), transparent);
  box-shadow: 0 0 22px rgba(255, 40, 40, 0.5);
  animation: idol-reject 0.55s ease-out both;
}

/* 供奉：已选槽位明亮脉冲 */
.idol-scene.is-offering .idol-slot.is-selected {
  animation: idol-slot-offer 1.2s ease-in-out both;
}

/* 供奉：全屏圣光 / 血光 */
.idol-offer-flash {
  position: absolute;
  inset: 0;
  z-index: 99;
  background: radial-gradient(ellipse at 50% 45%, rgba(var(--idol-flash), 0.95), rgba(var(--idol-flash), 0.55) 55%, rgba(var(--idol-flash), 0.25));
  pointer-events: none;
  animation: idol-offer-flash 1.5s ease-in both;
}

.idol-scene--black .idol-offer-flash {
  mix-blend-mode: multiply;
  background: radial-gradient(ellipse at 50% 45%, rgba(255, 120, 130, 0.9), rgba(120, 0, 20, 0.85) 60%, rgba(20, 0, 4, 0.95));
}

.idol-actions-enter-active,
.idol-actions-leave-active {
  transition:
    opacity 0.35s ease,
    translate 0.35s ease;
}

.idol-actions-enter-from,
.idol-actions-leave-to {
  opacity: 0;
  translate: 0 10px;
}

@keyframes idol-bg-settle {
  from {
    transform: scale(1.06);
    filter: brightness(0.7);
  }
  to {
    transform: scale(1);
    filter: brightness(1);
  }
}

@keyframes idol-slot-enter {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes idol-dice-cast {
  0% {
    opacity: 0;
    transform: translateY(-46vh) rotate(-260deg) scale(0.7);
  }
  12% {
    opacity: 1;
  }
  62% {
    transform: translateY(0) rotate(10deg) scale(1.04, 0.94);
  }
  76% {
    transform: translateY(-5vh) rotate(-4deg) scale(0.98, 1.03);
  }
  90% {
    transform: translateY(0) rotate(2deg) scale(1.02, 0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0) scale(1);
  }
}

@keyframes idol-dice-hover {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes idol-dice-offer {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: brightness(1) drop-shadow(0 0 12px rgba(var(--idol-burst), 0.6));
  }
  30% {
    opacity: 1;
    transform: translateY(-6px) scale(1.12);
    filter: brightness(1.6) drop-shadow(0 0 22px rgba(var(--idol-burst), 0.9));
  }
  100% {
    opacity: 0;
    transform: translateY(-90px) scale(0.3);
    filter: brightness(3) drop-shadow(0 0 30px rgba(var(--idol-burst), 1));
  }
}

@keyframes idol-ring-out {
  0% {
    opacity: 1;
    transform: scale(0.6);
  }
  100% {
    opacity: 0;
    transform: scale(1.7);
  }
}

@keyframes idol-core-flash {
  0% {
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes idol-reject {
  0%,
  100% {
    opacity: 0;
  }
  20%,
  55% {
    opacity: 1;
  }
}

@keyframes idol-slot-offer {
  0%,
  100% {
    filter: brightness(1);
  }
  45% {
    filter: brightness(1.8) saturate(1.2);
  }
}

@keyframes idol-beam-descend {
  from {
    opacity: 0;
    transform: scaleY(0.2);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes idol-beam-breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.72;
  }
}

@keyframes idol-beam-surge {
  0% {
    opacity: 1;
    transform: scaleX(1);
  }
  100% {
    opacity: 1;
    transform: scaleX(2.4);
    filter: blur(1.2cqw) brightness(1.8);
  }
}

@keyframes idol-halo-wake {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes idol-halo-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.8;
  }
}

@keyframes idol-halo-surge {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(2.2);
    filter: brightness(1.8);
  }
}

@keyframes idol-offer-flash {
  0%,
  35% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .idol-scene *,
  .idol-scene *::before,
  .idol-scene *::after {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
  }
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
  border-radius: 5px;
  border: 1px solid var(--panel-border);
  background: var(--panel-surface);
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
  color: var(--dg-text);
  font-family: var(--dg-font-ui);
  letter-spacing: 0;
}

@media (max-width: 520px) {
  .settings-panel .settings-nav-btn { flex-direction: column; gap: 7px; padding: 14px 3px 12px; font-size: 12px; }
  .settings-panel .settings-section { padding-top: 20px; }
  .settings-panel .settings-section > .space-y-4 > [class~='sm:flex-row'] { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 12px; }
  .settings-panel .settings-help { max-width: calc(100% - 54px); }
  .settings-panel .settings-action-btn { gap: 6px; padding-inline: 7px; font-size: 11px; }
}

/* ---------- 分栏：与通用 panel-tab 同款（金线 + 紫晶菱形） ---------- */
.settings-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid var(--dg-line-strong);
  background: linear-gradient(180deg, transparent, rgba(201, 161, 96, 0.05));
}

.settings-nav-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-width: 0;
  border: 0;
  border-radius: 0;
  padding: 18px 8px 16px;
  background: transparent;
  color: var(--dg-text-muted);
  font-family: var(--dg-font-ui);
  font-size: 13px;
  letter-spacing: 0.08em;
  transition: color 0.18s ease, background-color 0.18s ease;
}

.settings-nav-btn svg { width: 17px; height: 17px; flex-shrink: 0; stroke-width: 1.6; }
.settings-nav-btn span { white-space: nowrap; }

.settings-nav-btn:hover,
.settings-nav-btn:focus-visible {
  background: rgba(201, 161, 96, 0.05);
  color: var(--dg-text);
}

.settings-nav-btn:focus-visible { outline: 1px solid var(--dg-gold); outline-offset: -4px; }

.settings-nav-btn.is-active {
  background: linear-gradient(180deg, transparent 40%, rgba(201, 161, 96, 0.1));
  color: var(--dg-gold-bright);
}

.settings-nav-btn.is-active::after {
  position: absolute;
  right: 18%;
  bottom: -1px;
  left: 18%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--dg-gold) 25%, var(--dg-gold-bright) 50%, var(--dg-gold) 75%, transparent);
  content: '';
}

.settings-nav-btn.is-active::before {
  position: absolute;
  bottom: -4px;
  left: 50%;
  width: 7px;
  height: 7px;
  border: 1px solid var(--dg-gold-bright);
  background: var(--dg-arcane);
  box-shadow: 0 0 6px var(--dg-arcane-glow);
  transform: translateX(-50%) rotate(45deg);
  content: '';
}

/* ---------- 分区与设置行 ---------- */
.settings-section {
  padding: 24px 0 18px;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
}

.settings-section > .space-y-4 > .flex {
  position: relative;
  min-height: 56px;
  margin-block: 0;
  padding: 12px 0;
}

.settings-section > .space-y-4 > .flex:not(:last-child)::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--dg-line) 12%, var(--dg-line) 88%, transparent);
  content: '';
}

.settings-section .settings-help,
.settings-section label { color: var(--dg-text); }

/* 输入框 / 文本框 / 下拉框：凹陷皮革槽 */
.settings-panel :is(input[type='number'], input[type='text'], textarea, .settings-select) {
  border: 1px solid rgba(201, 161, 96, 0.3);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.3), transparent 40%), var(--dg-leather);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  color: var(--dg-text);
  letter-spacing: 0;
}

.settings-panel :is(input, textarea, select):focus-visible {
  border-color: rgba(240, 208, 138, 0.7);
  outline: none;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 161, 96, 0.25);
}

.settings-select {
  max-width: 100%;
  height: 36px;
  padding-right: 2rem;
  appearance: none;
  background:
    linear-gradient(45deg, transparent 50%, var(--dg-gold) 50%) calc(100% - 15px) 50% / 5px 5px no-repeat,
    linear-gradient(-45deg, transparent 50%, var(--dg-gold) 50%) calc(100% - 10px) 50% / 5px 5px no-repeat,
    linear-gradient(180deg, rgba(0, 0, 0, 0.3), transparent 40%),
    var(--dg-leather) !important;
  cursor: pointer;
}

.settings-select option { background: #1b130e; color: var(--dg-text); }

/* 滑块：金色轨道 + 宝石旋钮 */
.settings-panel input[type='range'] {
  height: 18px;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.settings-panel input[type='range']::-webkit-slider-runnable-track {
  height: 4px;
  border: 1px solid rgba(201, 161, 96, 0.45);
  border-radius: 2px;
  background: linear-gradient(180deg, #0c0806, #2a1d14);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.7);
}

.settings-panel input[type='range']::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  margin-top: -6px;
  border: 1px solid var(--dg-gold-bright);
  background: radial-gradient(circle at 35% 30%, #f6e2ff, #a26ae8 40%, #3c1866);
  box-shadow: 0 0 6px var(--dg-arcane-glow), 0 1px 2px rgba(0, 0, 0, 0.6);
  transform: rotate(45deg);
  appearance: none;
}

.settings-panel input[type='range']::-moz-range-track {
  height: 4px;
  border: 1px solid rgba(201, 161, 96, 0.45);
  border-radius: 2px;
  background: linear-gradient(180deg, #0c0806, #2a1d14);
}

.settings-panel input[type='range']::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 1px solid var(--dg-gold-bright);
  border-radius: 0;
  background: radial-gradient(circle at 35% 30%, #f6e2ff, #a26ae8 40%, #3c1866);
  transform: rotate(45deg);
}

#settings-content:focus-visible { outline: 1px solid rgba(201, 161, 96, 0.5); outline-offset: 5px; }

.settings-system-actions {
  position: relative;
  padding-top: 22px;
}

.settings-system-actions::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 14px;
  background: var(--dg-img-divider) center / min(70%, 360px) auto no-repeat;
  opacity: 0.85;
  content: '';
}

.settings-system-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
/* GM界面按钮独占一行（双倍宽度） */
.settings-system-grid .settings-action-btn--test { grid-column: 1 / -1; }

/* 分区标题：统一为金色标题字体（原四种颜色并存） */
.settings-section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 10px;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
}

.settings-section-title::before,
.settings-section-title::after {
  display: none;
}

/* ---------- 步进按钮：小号铁扣 ---------- */
.settings-stepper-btn {
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid rgba(201, 161, 96, 0.5);
  border-radius: 2px;
  background: linear-gradient(180deg, #2f241c, #1a1310);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.12), 0 1px 2px rgba(0, 0, 0, 0.5);
  color: var(--dg-gold-bright);
  font-size: 0.92rem;
  line-height: 1;
  transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.settings-stepper-btn:hover,
.settings-stepper-btn:focus-visible {
  outline: none;
  border-color: var(--dg-gold-bright);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.16), 0 0 8px rgba(232, 170, 70, 0.25);
  color: var(--dg-text-strong);
}

/* ---------- 开关：黑铁凹槽 + 宝石滑块，开启时紫晶点亮 ---------- */
.settings-switch {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.settings-switch:disabled,
.settings-switch.is-disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.settings-switch:focus-visible { outline: none; }

.settings-switch-track {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  width: 42px;
  height: 22px;
  overflow: hidden;
  border: 1px solid rgba(201, 161, 96, 0.45);
  border-radius: 11px;
  background: linear-gradient(180deg, #0c0806, #241912);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.7);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.settings-switch:hover:not(:disabled) .settings-switch-track,
.settings-switch:focus-visible:not(:disabled) .settings-switch-track {
  border-color: var(--dg-gold-bright);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.7), 0 0 0 3px rgba(201, 161, 96, 0.14);
}

.settings-switch-label { display: none; }
.settings-switch-label--off { color: var(--dg-text-muted); }
.settings-switch-label--on { color: var(--dg-gold); }

.settings-switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border: 1px solid #8a6a3c;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #6b5a4c, #2a201a 70%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.settings-switch.is-on .settings-switch-track {
  border-color: var(--dg-gold);
  background: linear-gradient(180deg, #1d1028, #3a2058);
}

.settings-switch.is-on .settings-switch-thumb {
  border-color: var(--dg-gold-bright);
  background: radial-gradient(circle at 35% 30%, #f6e2ff, #a26ae8 40%, #3c1866);
  box-shadow: 0 0 6px var(--dg-arcane-glow);
  transform: translateX(20px);
}

.settings-switch.is-on .settings-switch-label--off { color: var(--dg-text-faint); }
.settings-switch.is-on .settings-switch-label--on { color: var(--dg-text-strong); }

/* ---------- 按钮 ---------- */
.settings-primary-btn {
  border-style: solid;
  border-width: 0 18px;
  border-image-source: var(--dg-img-button);
  border-image-slice: 0 80 fill;
  border-image-repeat: stretch;
  border-radius: 0;
  background: none;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-ui);
  font-size: 0.84rem;
  letter-spacing: 0.1em;
  padding: 0.6rem 1rem;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
  transition: filter 0.18s ease;
}

.settings-primary-btn:hover:not(:disabled),
.settings-primary-btn:focus-visible {
  outline: none;
  filter: brightness(1.15) drop-shadow(0 0 6px rgba(232, 170, 70, 0.3));
}

.settings-primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 系统操作按钮：与 panel-action 同款，按语义区分边色 */
.settings-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 38px;
  min-width: 0;
  border: 1px solid rgba(201, 161, 96, 0.45);
  border-radius: 2px;
  padding: 9px 12px;
  background: linear-gradient(180deg, #2f241c, #1a1310);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.45);
  color: var(--dg-text);
  font-family: var(--dg-font-ui);
  font-size: 12.5px;
  letter-spacing: 0.06em;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}

.settings-action-btn svg { width: 15px; height: 15px; flex-shrink: 0; stroke-width: 1.6; }

.settings-action-btn:hover,
.settings-action-btn:focus-visible {
  outline: none;
  border-color: var(--dg-gold-bright);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.5), 0 0 8px rgba(232, 170, 70, 0.2);
  color: var(--dg-text-strong);
}

.settings-action-btn--gold { color: var(--dg-gold-bright); }

.settings-action-btn--danger {
  border-color: rgba(192, 80, 63, 0.6);
  background: linear-gradient(180deg, #3a1d17, #22100c);
  color: #e6b2a6;
}

.settings-action-btn--danger:hover,
.settings-action-btn--danger:focus-visible {
  border-color: #e07a66;
  box-shadow: inset 0 1px 0 rgba(255, 200, 180, 0.15), 0 0 8px rgba(192, 80, 63, 0.3);
  color: #f6cdc2;
}

.settings-action-btn--accent {
  border-color: rgba(154, 92, 240, 0.55);
  background: linear-gradient(180deg, #2a1c38, #160e20);
  color: #dcc4f6;
}

.settings-action-btn--accent:hover,
.settings-action-btn--accent:focus-visible {
  border-color: #c39af5;
  box-shadow: inset 0 1px 0 rgba(230, 200, 255, 0.15), 0 0 10px var(--dg-arcane-glow);
  color: #f1e4ff;
}

.settings-action-btn--locked {
  border-color: rgba(122, 107, 87, 0.5);
  background: linear-gradient(180deg, #221c18, #15110e);
  color: var(--dg-text-faint);
}

.settings-action-btn--locked:hover,
.settings-action-btn--locked:focus-visible {
  border-color: rgba(168, 151, 124, 0.7);
  box-shadow: none;
  color: var(--dg-text-muted);
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
  border-radius: 6px;
  border: 1px solid rgba(212, 175, 55, 0.24);
  background: #151b18;
  color: rgba(237, 226, 205, 0.92);
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 0.78rem;
  line-height: 1.55;
  letter-spacing: 0.01em;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(8px);
}

.settings-help-popover-warning {
  margin-top: 0.45rem;
  color: rgba(248, 113, 113, 0.96);
  font-weight: 700;
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

.settings-big-summary-prompt {
  width: 100%;
  min-height: 9rem;
  resize: vertical;
  border-radius: 0.58rem;
  border: 1px solid rgba(120, 85, 56, 0.72);
  background: rgba(9, 6, 5, 0.9);
  color: rgba(237, 226, 205, 0.95);
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 0.78rem;
  line-height: 1.6;
  padding: 0.75rem 0.85rem;
}

.settings-big-summary-prompt:focus-visible {
  outline: none;
  border-color: rgba(245, 158, 11, 0.76);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.26);
}

.settings-prompt-group-editor {
  display: grid;
  gap: 0.75rem;
}

.settings-prompt-group-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.settings-prompt-group-count {
  color: rgba(214, 211, 209, 0.66);
  font-family: 'Inter', 'Microsoft YaHei', sans-serif;
  font-size: 0.74rem;
}

.settings-prompt-add-btn,
.settings-prompt-add-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid rgba(120, 85, 56, 0.74);
  border-radius: 0.5rem;
  background: rgba(26, 15, 8, 0.78);
  color: rgba(237, 226, 205, 0.9);
  font-family: 'Inter', 'Microsoft YaHei', sans-serif;
  font-size: 0.74rem;
  padding: 0.4rem 0.68rem;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    color 0.16s ease;
}

.settings-prompt-add-btn:hover,
.settings-prompt-add-btn:focus-visible,
.settings-prompt-add-secondary-btn:hover,
.settings-prompt-add-secondary-btn:focus-visible {
  outline: none;
  border-color: rgba(245, 158, 11, 0.76);
  background: rgba(120, 53, 15, 0.42);
  color: rgba(255, 237, 213, 0.98);
}

.settings-prompt-add-secondary-btn {
  width: 100%;
  border-style: dashed;
  background: rgba(26, 15, 8, 0.42);
}

.settings-prompt-group-empty {
  border: 1px dashed rgba(120, 85, 56, 0.62);
  border-radius: 0.58rem;
  color: rgba(214, 211, 209, 0.62);
  font-size: 0.78rem;
  padding: 1rem;
  text-align: center;
}

.settings-prompt-group {
  display: grid;
  gap: 0.48rem;
  padding: 0.62rem;
  border: 1px solid rgba(120, 85, 56, 0.54);
  border-radius: 0.68rem;
  background: rgba(10, 7, 6, 0.62);
}

.settings-prompt-group-head {
  display: flex;
  align-items: center;
  gap: 0.48rem;
}

.settings-prompt-group-index {
  min-width: 2rem;
  color: rgba(214, 211, 209, 0.52);
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
}

.settings-prompt-role-select {
  min-width: 7.8rem;
  border: 1px solid rgba(120, 85, 56, 0.72);
  border-radius: 0.5rem;
  background: rgba(39, 45, 51, 0.92);
  color: rgba(237, 226, 205, 0.95);
  font-family: 'Inter', 'Microsoft YaHei', sans-serif;
  font-size: 0.74rem;
  padding: 0.4rem 0.56rem;
}

.settings-prompt-role-select:focus-visible {
  outline: none;
  border-color: rgba(245, 158, 11, 0.76);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.22);
}

.settings-prompt-group-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  margin-left: auto;
}

.settings-prompt-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(120, 85, 56, 0.46);
  border-radius: 0.46rem;
  background: rgba(39, 45, 51, 0.72);
  color: rgba(214, 211, 209, 0.72);
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    color 0.16s ease;
}

.settings-prompt-icon-btn:hover:not(:disabled),
.settings-prompt-icon-btn:focus-visible {
  outline: none;
  border-color: rgba(245, 158, 11, 0.72);
  background: rgba(120, 53, 15, 0.42);
  color: rgba(255, 237, 213, 0.98);
}

.settings-prompt-icon-btn--danger:hover:not(:disabled),
.settings-prompt-icon-btn--danger:focus-visible {
  border-color: rgba(248, 113, 113, 0.72);
  background: rgba(127, 29, 29, 0.38);
  color: rgba(254, 202, 202, 0.98);
}

.settings-prompt-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

@media (max-width: 560px) {
  .settings-prompt-group-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-prompt-add-btn {
    width: 100%;
  }

  .settings-prompt-group-head {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .settings-prompt-role-select {
    flex: 1 1 8rem;
  }

  .settings-prompt-group-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

.settings-prompt-reset-btn {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(120, 85, 56, 0.72);
  background: rgba(26, 15, 8, 0.76);
  color: rgba(222, 211, 190, 0.88);
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  padding: 0.36rem 0.58rem;
}

.settings-prompt-reset-btn:hover,
.settings-prompt-reset-btn:focus-visible {
  outline: none;
  border-color: rgba(245, 158, 11, 0.76);
  color: rgba(255, 237, 213, 0.98);
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
  gap: 0.6rem;
}

.magic-hat-hero,
.magic-hat-section {
  position: relative;
  min-width: 0;
}

.magic-hat-hero { padding: 0.2rem 0 1rem; }

.magic-hat-hero__content {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  align-items: stretch;
}

/* 概览条：与地图状态条同款的凹陷铁槽 */
.magic-hat-hero__chips {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid rgba(201, 161, 96, 0.22);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.12));
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.55);
}

.magic-hat-hero__chip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 1.1rem;
}

.magic-hat-hero__chip + .magic-hat-hero__chip::before {
  position: absolute;
  top: 20%;
  bottom: 20%;
  left: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--dg-line-strong), transparent);
  content: '';
}

.magic-hat-hero__chip-label {
  color: var(--dg-text-faint);
  font-size: 0.74rem;
  letter-spacing: 0.12em;
}

.magic-hat-hero__chip-value {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-data);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.magic-hat-section { padding: 1.1rem 0 1.2rem; }

.magic-hat-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.magic-hat-section__head--compact { align-items: center; }

.magic-hat-section__subtitle {
  margin-top: 0.3rem;
  color: var(--dg-text-muted);
  font-family: var(--dg-font-serif);
  font-size: 0.8rem;
  line-height: 1.55;
}

.magic-hat-growth-section { overflow: visible; }

.magic-hat-growth-actions {
  display: flex;
  align-items: stretch;
  gap: 0.65rem;
}

.dungeon-modal .dungeon-modal-body .magic-hat-reset-btn.panel-action {
  min-width: 8.8rem;
  flex-direction: column;
  gap: 0.1rem;
}

.magic-hat-reset-btn span {
  font-family: var(--dg-font-title);
  font-size: 0.95rem;
  letter-spacing: 0.12em;
}

.magic-hat-reset-btn small {
  font-size: 0.68rem;
  line-height: 1.2;
  opacity: 0.8;
}

.magic-hat-growth-subhead {
  position: relative;
  margin-top: 1.1rem;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.9rem;
}

.magic-hat-growth-subhead::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--dg-line-strong), var(--dg-line) 60%, transparent);
  content: '';
}

.magic-hat-growth-subhead__title {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1rem;
  letter-spacing: 0.12em;
}

.magic-hat-growth-subhead__text {
  color: var(--dg-text-muted);
  font-size: 0.76rem;
}

/* ---------- 难度：火漆封印的羊皮纸卡 ---------- */
.magic-hat-difficulty-layout {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(15rem, 0.9fr);
  gap: 1rem;
}

.magic-hat-difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.magic-hat-difficulty-main {
  display: grid;
  gap: 0.85rem;
}

.dungeon-modal .dungeon-modal-body .magic-hat-difficulty-card.panel-item {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 7.25rem;
  padding: 0.85rem 4.2rem 0.85rem 1rem;
  overflow: visible;
  border: 1px solid rgba(154, 106, 42, 0.75);
  border-radius: 2px;
  background: var(--dg-bg-parchment);
  box-shadow: inset 0 0 0 3px rgba(233, 210, 166, 0.5), inset 0 0 0 4px rgba(122, 78, 34, 0.3), 0 2px 6px rgba(0, 0, 0, 0.45);
  color: var(--dg-ink-text);
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.dungeon-modal .dungeon-modal-body .magic-hat-difficulty-card.panel-item:hover:not(:disabled),
.dungeon-modal .dungeon-modal-body .magic-hat-difficulty-card.panel-item:focus-visible {
  outline: none;
  background: var(--dg-bg-parchment);
  filter: brightness(1.04);
  transform: translateY(-2px);
  box-shadow: inset 0 0 0 3px rgba(233, 210, 166, 0.5), inset 0 0 0 4px rgba(122, 78, 34, 0.3), 0 6px 14px rgba(0, 0, 0, 0.5);
}

.dungeon-modal .dungeon-modal-body .magic-hat-difficulty-card.panel-item.is-active {
  border-color: var(--dg-gold-bright);
  background: var(--dg-bg-parchment);
  box-shadow: inset 0 0 0 3px rgba(233, 210, 166, 0.5), inset 0 0 0 4px rgba(154, 106, 42, 0.6), 0 0 0 2px rgba(201, 161, 96, 0.5), 0 0 16px rgba(232, 170, 70, 0.35);
}

.magic-hat-difficulty-card.is-wide {
  grid-column: 1 / -1;
  min-height: 5.6rem;
}

.dungeon-modal .dungeon-modal-body .magic-hat-difficulty-card.panel-item.is-locked {
  cursor: not-allowed;
  filter: grayscale(0.7) brightness(0.75);
  transform: none;
}

/* 火漆印：盖在卡片右上角，选中时略放大 */
.magic-hat-difficulty-card__seal {
  position: absolute;
  top: 50%;
  right: 0.55rem;
  width: 3.2rem;
  height: 3.2rem;
  filter: drop-shadow(0 2px 3px rgba(60, 30, 10, 0.45));
  transform: translateY(-50%) rotate(-8deg);
  transition: transform 0.2s ease;
}

.magic-hat-difficulty-card.is-active .magic-hat-difficulty-card__seal {
  transform: translateY(-50%) rotate(-8deg) scale(1.12);
}

.magic-hat-difficulty-card__head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.6rem;
}

.magic-hat-difficulty-card__name {
  color: var(--dg-ink-text);
  font-family: var(--dg-font-title);
  font-size: 1.15rem;
  letter-spacing: 0.12em;
}

.magic-hat-difficulty-card__state {
  flex-shrink: 0;
  padding: 0.1rem 0.5rem;
  border: 1px solid rgba(122, 78, 34, 0.45);
  border-radius: 2px;
  color: var(--dg-ink-soft);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
}

.magic-hat-difficulty-card.is-active .magic-hat-difficulty-card__state {
  border-color: var(--dg-rubric);
  background: rgba(124, 34, 22, 0.1);
  color: var(--dg-rubric);
}

.magic-hat-difficulty-card__desc {
  margin-top: 0.55rem;
  color: var(--dg-ink-soft);
  font-family: var(--dg-font-serif);
  font-size: 0.78rem;
  line-height: 1.65;
}

.magic-hat-difficulty-card__footer {
  margin-top: auto;
  padding-top: 0.7rem;
}

.magic-hat-difficulty-card__footer-text {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: rgba(92, 58, 30, 0.75);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
}

.magic-hat-difficulty-card__footer-text::before {
  width: 0.36rem;
  height: 0.36rem;
  background: var(--dg-rubric);
  transform: rotate(45deg);
  content: '';
}

/* 效果预览：黑铁皮革底，难度名用标题字体 */
.magic-hat-preview {
  padding: 1rem 1.05rem 1.1rem;
  border: 1px solid rgba(201, 161, 96, 0.3);
  border-radius: 2px;
  background:
    radial-gradient(ellipse 90% 60% at 50% 0%, rgba(154, 92, 240, 0.1), transparent 70%),
    var(--dg-surface);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.05);
}

.magic-hat-preview__label {
  color: var(--dg-text-faint);
  font-size: 0.72rem;
  letter-spacing: 0.2em;
}

.magic-hat-preview__difficulty {
  margin-top: 0.35rem;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1.4rem;
  letter-spacing: 0.16em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8), 0 0 12px rgba(232, 170, 70, 0.25);
}

.magic-hat-preview__list {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.6rem;
}

.magic-hat-preview__item {
  position: relative;
  padding-left: 1.1rem;
  color: var(--dg-text);
  font-size: 0.82rem;
  line-height: 1.6;
}

.magic-hat-preview__item::before {
  position: absolute;
  top: 0.55rem;
  left: 0.15rem;
  width: 0.36rem;
  height: 0.36rem;
  border: 1px solid var(--dg-gold-bright);
  background: var(--dg-arcane);
  transform: rotate(45deg);
  content: '';
}

/* ---------- 自定义难度：保留分组语义色，形状统一 ---------- */
.magic-hat-custom-panel {
  display: grid;
  gap: 0.85rem;
  padding: 0;
}

.magic-hat-custom-group {
  --custom-accent: 201, 161, 96;
  --custom-accent-strong: 240, 208, 138;
  --custom-panel: 24, 16, 8;
  display: grid;
  gap: 0.6rem;
  padding: 0.75rem;
  border: 1px solid rgba(var(--custom-accent), 0.25);
  border-radius: 2px;
  background:
    radial-gradient(ellipse 60% 80% at 100% 0%, rgba(var(--custom-accent), 0.12), transparent 60%),
    rgba(var(--custom-panel), 0.35);
}

.magic-hat-custom-group.is-curse { --custom-accent: 154, 92, 240; --custom-accent-strong: 220, 196, 250; --custom-panel: 32, 18, 43; }
.magic-hat-custom-group.is-penalty { --custom-accent: 192, 80, 63; --custom-accent-strong: 240, 190, 178; --custom-panel: 47, 18, 18; }
.magic-hat-custom-group.is-boon { --custom-accent: 127, 179, 106; --custom-accent-strong: 200, 230, 186; --custom-panel: 18, 34, 20; }
.magic-hat-custom-group.is-basis { --custom-accent: 79, 143, 224; --custom-accent-strong: 188, 212, 247; --custom-panel: 15, 28, 48; }

.magic-hat-custom-group__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(var(--custom-accent-strong));
  font-family: var(--dg-font-title);
  font-size: 0.95rem;
  letter-spacing: 0.12em;
}

.magic-hat-custom-group__title::before {
  width: 0.45rem;
  height: 0.45rem;
  border: 1px solid rgb(var(--custom-accent-strong));
  background: rgb(var(--custom-accent));
  box-shadow: 0 0 8px rgba(var(--custom-accent), 0.5);
  transform: rotate(45deg);
  content: '';
}

.magic-hat-custom-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.dungeon-modal .dungeon-modal-body .magic-hat-custom-option.panel-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.4rem;
  min-height: 5.25rem;
  padding: 0.65rem 0.75rem;
  overflow: hidden;
  border-color: rgba(var(--custom-accent), 0.25);
  color: var(--dg-text-muted);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, color 0.16s ease;
}

.dungeon-modal .dungeon-modal-body .magic-hat-custom-option.panel-item:hover:not(:disabled),
.dungeon-modal .dungeon-modal-body .magic-hat-custom-option.panel-item:focus-visible {
  outline: none;
  border-color: rgba(var(--custom-accent), 0.6);
  color: var(--dg-text);
}

.dungeon-modal .dungeon-modal-body .magic-hat-custom-option.panel-item.is-active {
  border-color: rgba(var(--custom-accent), 0.85);
  background: linear-gradient(180deg, rgba(var(--custom-accent), 0.16), transparent 60%), rgba(var(--custom-panel), 0.6);
  box-shadow: inset 0 0 0 1px rgba(var(--custom-accent), 0.2), 0 0 12px rgba(var(--custom-accent), 0.18);
  color: var(--dg-text-strong);
}

.magic-hat-custom-option:disabled {
  cursor: wait;
  opacity: 0.7;
}

.magic-hat-custom-option__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.magic-hat-custom-option__name {
  color: rgb(var(--custom-accent-strong));
  font-family: var(--dg-font-title);
  font-size: 0.95rem;
  letter-spacing: 0.06em;
}

.magic-hat-custom-option__state {
  flex-shrink: 0;
  padding: 0.1rem 0.42rem;
  border: 1px solid rgba(var(--custom-accent), 0.45);
  border-radius: 2px;
  background: rgba(var(--custom-accent), 0.14);
  color: rgb(var(--custom-accent-strong));
  font-size: 0.64rem;
}

.magic-hat-custom-option__desc {
  position: relative;
  z-index: 1;
  font-size: 0.74rem;
  line-height: 1.5;
}

/* 技能点存量：计数铭牌 */
.magic-hat-points-card {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0.95rem;
  border: 1px solid rgba(201, 161, 96, 0.45);
  border-radius: 2px;
  background: linear-gradient(180deg, #2a1f18, #15100c);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.1);
}

.magic-hat-points-card__label {
  color: var(--dg-text-muted);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
}

.magic-hat-points-card__value {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-data);
  font-size: 18px;
  font-weight: 700;
}

/* ---------- 成长卡 ---------- */
.magic-hat-track-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.dungeon-modal .dungeon-modal-body .magic-hat-track-card.panel-item {
  --track-accent: 201, 161, 96;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: 18rem;
  padding: 1rem;
  background:
    radial-gradient(ellipse 80% 50% at 100% 0%, rgba(var(--track-accent), 0.14), transparent 65%),
    linear-gradient(180deg, rgba(255, 220, 160, 0.035), transparent 40%),
    var(--dg-surface);
}

.magic-hat-track-card.is-hp { --track-accent: 196, 55, 47; }
.magic-hat-track-card.is-mp { --track-accent: 79, 143, 224; }
.magic-hat-track-card.is-gold { --track-accent: 226, 176, 74; }
.magic-hat-track-card.is-growth-immunity { --track-accent: 127, 179, 106; }
.magic-hat-track-card.is-growth-expansion { --track-accent: 92, 190, 210; }
.magic-hat-track-card.is-growth-world { --track-accent: 154, 92, 240; }

.magic-hat-track-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.magic-hat-track-card__kicker {
  color: rgb(var(--track-accent));
  font-size: 0.7rem;
  letter-spacing: 0.2em;
}

.magic-hat-track-card__title {
  margin-top: 0.25rem;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1.12rem;
  letter-spacing: 0.08em;
  line-height: 1.35;
}

/* 符文字：菱形宝石座 */
.magic-hat-track-card__rune {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1rem;
  isolation: isolate;
}

.magic-hat-track-card__rune::before {
  position: absolute;
  z-index: -1;
  inset: 0.32rem;
  border: 1px solid var(--dg-gold);
  background: radial-gradient(circle at 35% 30%, rgba(var(--track-accent), 0.55), #140e0b 75%);
  box-shadow: 0 0 8px rgba(var(--track-accent), 0.35);
  transform: rotate(45deg);
  content: '';
}

.magic-hat-track-card__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.magic-hat-track-card__stat {
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(201, 161, 96, 0.18);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.25);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.magic-hat-track-card__stat-label {
  display: block;
  color: var(--dg-text-faint);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
}

.magic-hat-track-card__stat-value {
  display: block;
  margin-top: 0.2rem;
  color: var(--dg-text-strong);
  font-family: var(--dg-font-data);
  font-size: 0.95rem;
  font-weight: 700;
}

.magic-hat-track-card__bar {
  height: 8px;
  overflow: hidden;
  border: 1px solid rgba(201, 161, 96, 0.4);
  border-radius: 1px;
  background: linear-gradient(180deg, #0a0705, #1e1610);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.75);
}

.magic-hat-track-card__bar-fill {
  height: 100%;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: width 0.28s ease;
}

.magic-hat-track-card__hint {
  min-height: 2.5rem;
  color: var(--dg-text-muted);
  font-size: 0.77rem;
  line-height: 1.6;
}

.dungeon-modal .dungeon-modal-body .magic-hat-track-card__action.panel-action {
  width: 100%;
  margin-top: auto;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
}

.magic-hat-track-card__action-label,
.magic-hat-track-card__action-cost {
  display: block;
}

.magic-hat-track-card__action-label {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 0.98rem;
  letter-spacing: 0.1em;
}

.magic-hat-track-card__action-cost {
  color: var(--dg-text-muted);
  font-size: 0.72rem;
  text-align: right;
}

.magic-hat-track-card__action.is-disabled .magic-hat-track-card__action-label,
.magic-hat-track-card__action.is-disabled .magic-hat-track-card__action-cost {
  color: var(--dg-text-faint);
}

@media (max-width: 768px) {
  .magic-hat-hero__chips { grid-template-columns: minmax(0, 1fr); gap: 12px; }

  .bond-affection-head { flex-wrap: wrap; gap: 4px 12px; }
  .map-viewport {
    height: min(86vh, 40rem);
    min-height: 22rem;
  }

  /* 小屏：楼层信息收窄，图例缩成紧凑两列 */
  .map-cartouche {
    min-width: 0;
    width: 100%;
    padding: 8px 12px 10px;
  }

  .map-cartouche__floor { font-size: 22px; }
  .map-cartouche__area { font-size: 13px; }
  .map-cartouche__rule { width: 11rem; height: 10px; margin: 4px 0 2px; }
  .map-cartouche__stats { gap: 10px; }
  .map-cartouche__stats > div + div::before { margin-right: 8px; }
  .map-cartouche__stats dt { font-size: 11px; }
  .map-cartouche__stats dd { font-size: 12px; }

  /* 仍在右上方，位于收窄后的楼层信息与关闭按钮下方 */
  .map-legend {
    top: 5.6rem;
    right: 0.8rem;
    display: grid;
    grid-template-columns: repeat(2, auto);
    width: auto;
    gap: 4px 10px;
    padding: 8px 10px;
  }

  .map-legend__title { display: none; }
  .map-legend__item { gap: 5px; }
  .map-legend__icon { width: 24px; height: 24px; flex-basis: 24px; }
  .map-legend__label { font-size: 13px; letter-spacing: 0.04em; }
}

@media (max-width: 768px) {

  .magic-hat-hero__content,
  .magic-hat-difficulty-layout,
  .magic-hat-track-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .magic-hat-difficulty-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .magic-hat-custom-options {
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
    width: min(100%, 11rem);
  }

  .idol-overlay-actions {
    bottom: 1.2rem;
    gap: 0.5rem;
    width: min(94%, 28rem);
  }

  .idol-overlay-actions .map-overlay-finish-btn,
  .idol-leave-btn {
    min-width: min(13rem, 42vw);
  }

}
</style>
