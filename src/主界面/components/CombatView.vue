<template>
  <div
    ref="combatRootEl"
    data-card-tooltip-boundary
    class="combat-root w-full h-full bg-[#1a1a22] text-dungeon-paper font-ui relative overflow-hidden select-none"
    :class="[screenShake ? 'animate-shake' : '', impactShake ? 'animate-impact-shake' : '']"
    :style="combatRootStyle"
  >
    <!-- Background -->
    <div class="absolute inset-0 z-0">
      <!-- Dynamic background image -->
      <img
        v-if="bgImageUrl"
        :src="bgImageUrl"
        class="absolute inset-0 w-full h-full object-cover"
        alt=""
        @error="onBgError"
      />
      <!-- Fallback gradient -->
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(40,35,50,0.5),_#0e0e14_90%)]"></div>
      <!-- Darken overlay for readability -->
      <div class="absolute inset-0 bg-black/40"></div>
    </div>
    <div
      class="absolute inset-0 opacity-20 z-0 mix-blend-overlay bg-[length:200px] bg-repeat"
      style="background-image: url('https://www.transparenttextures.com/patterns/dark-matter.png')"
    ></div>

    <!-- Top Left: Settings -->
    <div class="combat-top-left-panel absolute z-50 pointer-events-auto flex flex-col gap-2 combat-button-cluster">
      <button
        class="w-12 h-12 bg-[#252030]/90 border border-white/10 rounded-xl text-dungeon-gold flex items-center justify-center hover:bg-[#352a40] hover:border-white/20 active:scale-95 transition-all shadow-lg"
        @click="settingsOpen = !settingsOpen"
      >
        <Settings2 class="size-6" />
        <span class="sr-only">设置</span>
      </button>
      <button
        class="w-12 h-12 bg-[#252030]/90 border border-white/10 rounded-xl text-dungeon-gold flex items-center justify-center hover:bg-[#352a40] hover:border-white/20 active:scale-95 transition-all shadow-lg"
        @click="emit('openDeck')"
      >
        <Scroll class="size-6" />
        <span class="sr-only">卡组</span>
      </button>
      <button
        class="w-12 h-12 bg-[#252030]/90 border border-white/10 rounded-xl text-dungeon-gold flex items-center justify-center hover:bg-[#352a40] hover:border-white/20 active:scale-95 transition-all shadow-lg"
        @click="emit('openRelics')"
      >
        <Box class="size-6" />
        <span class="sr-only">物品</span>
      </button>
      <button
        class="w-12 h-12 bg-[#252030]/90 border border-amber-300/25 rounded-xl text-amber-200 flex items-center justify-center hover:bg-[#3a2d36] hover:border-amber-300/50 active:scale-95 transition-all shadow-lg shadow-amber-950/20"
        title="词条与状态说明"
        @click="emit('openGlossary')"
      >
        <Info class="size-6" />
        <span class="sr-only">词条与状态</span>
      </button>
      <div
        v-if="settingsOpen"
        class="mt-1 w-52 bg-[#1a1520]/95 border border-white/10 rounded-xl p-3 text-xs text-dungeon-paper shadow-xl backdrop-blur-md"
      >
        <div class="flex flex-col gap-3">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input v-model="battleSpeedUp" type="checkbox" class="accent-dungeon-gold" />
            <span>战斗加速（2x）</span>
          </label>
          <button
            class="h-8 rounded-lg border border-white/20 bg-[#252030]/80 px-2 text-xs text-dungeon-gold hover:border-dungeon-gold/60 hover:bg-[#352a40] transition-colors"
            @click="toggleFullScreen"
          >
            切换全屏
          </button>
        </div>
      </div>
    </div>

    <!-- Top Center: Turn Counter -->
    <div class="combat-turn-anchor absolute z-40 pointer-events-none">
      <div class="flex flex-col items-center">
        <span class="text-xs text-white/60 tracking-widest">回合</span>
        <span class="text-lg font-heading font-bold text-white/90">{{ combatState.turn }}</span>
        <div
          v-if="isTwinBattle"
          class="mt-2 w-44 relative pointer-events-auto"
          :style="dreamControlBarStyle"
          @mouseenter="showDreamControlHelp"
          @mouseleave="hideDreamControlHelp"
          @touchstart.passive="handleDreamControlTouchStart"
          @touchend="handleDreamControlTouchEnd"
          @touchcancel="handleDreamControlTouchEnd"
        >
          <div class="mb-1 flex items-center justify-between text-[10px] tracking-wide text-fuchsia-100/85">
            <span>梦境控制权</span>
            <span>{{ dreamControlPercent }}%</span>
          </div>
          <div class="h-1.5 rounded-full border border-fuchsia-300/35 bg-black/45 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-amber-300 via-fuchsia-400 to-cyan-300 transition-all duration-500"
              :style="withTransition({ width: `${dreamControlPercent}%` }, 500)"
            ></div>
          </div>
          <div
            v-if="dreamControlHelpVisible"
            class="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 w-72 rounded-md border border-fuchsia-300/35 bg-black/85 px-2 py-1 text-[10px] leading-relaxed text-fuchsia-50 text-left shadow-lg"
          >
            当前梦境控制权：{{ dreamControlPercent }}%。0~24%：双子最终点数x1.5且伤害视为真实伤害；0~39%：双子骰子范围+2；61~99%：回合开始至少3层虚弱；76~99%：回合开始至少5层敏感。
          </div>
        </div>
        <div
          v-if="dicePreviewPanels.length > 0"
          class="mt-2 w-80 space-y-1"
        >
          <div
            v-for="panel in dicePreviewPanels"
            :key="panel.key"
            class="px-1 text-left"
          >
            <div class="text-sm text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
              {{ panel.title }}
            </div>
            <div class="mt-0.5 space-y-0.5">
              <div
                v-for="(line, idx) in panel.lines"
                :key="`${panel.key}-line-${idx}`"
                class="text-sm leading-relaxed text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]"
              >
                {{ line }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Battlefield Layer -->
    <div class="absolute inset-0 z-10 pointer-events-none">
      <!-- Enemy Position: Right Side -->
      <div
        class="enemy-layout-shell enemy-layout-shell--desktop absolute flex flex-col items-center justify-end group transition-transform duration-1000 origin-bottom-right"
      >
        <!-- Enemy Intent Card -->
        <div
          v-if="visibleEnemyIntentCards.length > 0"
          class="enemy-intent-anchor absolute"
          :class="isTwinBattle ? 'enemy-intent-anchor--twins' : ''"
        >
          <div
            class="relative flex"
            :class="visibleEnemyIntentCards.length > 1 ? 'gap-10' : 'gap-4'"
          >
            <div
              v-for="entry in visibleEnemyIntentCards"
              :key="`enemy-intent-${entry.slot}`"
              class="relative"
              :class="visibleEnemyIntentCards.length > 1 ? (entry.slot === 1 ? '-translate-x-3' : 'translate-x-3') : ''"
            >
            <div class="absolute -top-5 left-0 text-amber-200/80 text-[10px] px-2 py-0.5 rounded">
              敌方意图
            </div>
            <div
              class="scale-[1.3] origin-top-left shadow-[0_0_20px_rgba(200,120,0,0.15)]"
              :class="[
                entry.slot === 1 ? 'rotate-[-3deg]' : 'rotate-[3deg]',
                isCardShaking(entry.card) ? 'invalid-card-shake' : '',
              ]"
            >
              <DungeonCard
                :card="entry.card"
                :mask-level="enemyIntentMaskLevel"
                is-enemy
                disabled
              />
            </div>
            </div>
          </div>
        </div>

        <!-- Enemy Dice -->
        <div
          v-if="showIdleDice"
          class="enemy-dice-anchor absolute z-20 pointer-events-auto"
          @mouseenter="handleEnemyDiceHoverStart"
          @mouseleave="handleEnemyDiceHoverEnd"
          @touchstart.passive="handleEnemyDiceTouchStart"
          @touchend="handleEnemyDiceTouchEnd"
          @touchcancel="handleEnemyDiceTouchEnd"
        >
          <div class="animate-float">
            <DungeonDice
              :value="displayEnemyDice"
              :rolling="isRolling"
              :rolling-min="effectiveEnemyMinDice"
              :rolling-max="effectiveEnemyMaxDice"
              :number-class="enemyDiceNumberClass"
              color="red"
              size="lg"
            />
          </div>
        </div>

        <!-- Enemy Portrait -->
        <div class="relative w-full flex-1 min-h-0">
          <div
            class="enemy-portrait-scale absolute bottom-0 left-1/2 -translate-x-1/2 origin-bottom w-full h-full flex items-end justify-center overflow-hidden"
          >
            <!-- Placeholder icon (shown when portrait fails to load) -->
            <Skull v-if="enemyPortraitError" class="w-48 h-48 text-red-900/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <!-- Enemy portrait image -->
            <img
              v-else
              :src="enemyPortraitUrl"
              class="w-full h-full object-contain object-bottom"
              alt="enemy portrait"
              @error="onEnemyPortraitError"
            />
          </div>
        </div>

        <!-- Enemy Status Bar -->
        <div class="combat-status-bar combat-status-bar--enemy relative mb-6 overflow-visible w-full max-w-[22rem] origin-bottom bg-[#18141e]/90 border border-white/8 p-3 rounded-xl shadow-lg backdrop-blur-sm z-20 pointer-events-auto">
          <div class="flex justify-between text-sm text-white/90 font-bold mb-1.5">
            <span>{{ enemyDisplayName }}</span>
          </div>
          <div class="pointer-events-none absolute inset-0 z-30 overflow-visible">
            <div
              v-for="popup in floatingNumbersFor('enemy')"
              :key="popup.id"
              class="combat-float-number absolute text-xl font-extrabold tracking-wide"
              :class="[popup.colorClass, popup.kind === 'heal' ? 'combat-float-number--heal' : '']"
              :style="{
                left: `calc(50% + ${popup.leftOffset}px)`,
                top: `${popup.topOffset}px`,
                animationDuration: `${popup.duration}ms`,
              }"
            >
              {{ popup.text }}
            </div>
          </div>
          <!-- Armor Shield -->
          <TransitionGroup
            v-if="enemyArmor > 0 || enemyPoisonAmount > 0 || enemyTempMaxHp > 0"
            tag="div"
            name="status-effect"
            class="status-value-list flex items-center gap-3 mb-1"
          >
            <button
              v-if="enemyArmor > 0"
              key="enemy-armor"
              type="button"
              class="status-effect-value-btn flex items-center gap-1"
              :aria-label="`护甲: ${enemyArmor}. ${getEffectDescription(ET.ARMOR)}`"
              @mouseenter="showEffectTooltip($event, createStatusEffectPreview(ET.ARMOR, enemyArmor))"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, createStatusEffectPreview(ET.ARMOR, enemyArmor))"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, createStatusEffectPreview(ET.ARMOR, enemyArmor))"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <span class="text-[10px] text-yellow-400">🛡️</span>
              <span :key="`enemy-armor-count-${enemyArmor}`" class="status-value-count text-[10px] text-yellow-300 font-bold">{{ enemyArmor }}</span>
            </button>
            <button
              v-if="enemyPoisonAmount > 0"
              key="enemy-poison-amount"
              type="button"
              class="status-effect-value-btn flex items-center gap-1"
              :aria-label="`中毒量: ${enemyPoisonAmount}. ${getEffectDescription(ET.POISON_AMOUNT)}`"
              @mouseenter="showEffectTooltip($event, createStatusEffectPreview(ET.POISON_AMOUNT, enemyPoisonAmount))"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, createStatusEffectPreview(ET.POISON_AMOUNT, enemyPoisonAmount))"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, createStatusEffectPreview(ET.POISON_AMOUNT, enemyPoisonAmount))"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <span class="text-[10px] text-green-400">☠</span>
              <span :key="`enemy-poison-amount-count-${enemyPoisonAmount}`" class="status-value-count text-[10px] text-green-300 font-bold">{{ enemyPoisonAmount }}</span>
            </button>
            <button
              v-if="enemyTempMaxHp > 0"
              key="enemy-temp-max-hp"
              type="button"
              class="status-effect-value-btn flex items-center gap-1"
              :aria-label="`临时生命上限: ${enemyTempMaxHp}. ${getEffectDescription(ET.TEMP_MAX_HP)}`"
              @mouseenter="showEffectTooltip($event, createStatusEffectPreview(ET.TEMP_MAX_HP, enemyTempMaxHp))"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, createStatusEffectPreview(ET.TEMP_MAX_HP, enemyTempMaxHp))"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, createStatusEffectPreview(ET.TEMP_MAX_HP, enemyTempMaxHp))"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <span class="text-[10px] text-rose-400">♥</span>
              <span :key="`enemy-temp-max-hp-count-${enemyTempMaxHp}`" class="status-value-count text-[10px] text-rose-300 font-bold">{{ enemyTempMaxHp }}</span>
            </button>
          </TransitionGroup>
          <!-- HP Bar -->
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[10px] text-[#ff6666] font-bold w-6">HP</span>
            <div class="relative flex-1 h-2.5 bg-[#1a0a0a] rounded-full overflow-hidden border border-red-900/20">
              <div
                class="absolute inset-y-0 left-0 z-10 bg-gradient-to-r from-[#cc2200] to-[#ee3311] rounded-full transition-all duration-500"
                :style="withTransition({ width: `${enemyStats.maxHp > 0 ? (enemyStats.hp / enemyStats.maxHp) * 100 : 0}%` }, 500)"
              ></div>
              <div
                class="absolute inset-y-0 left-0 z-20 bg-green-600/75 rounded-full transition-all duration-500 poison-wave-bar"
                :style="withTransition({ width: `${enemyPoisonAmountPercent}%` }, 500)"
              ></div>
            </div>
            <span class="text-[10px] text-white/70 w-14 text-right">{{ formatCombatHp(enemyStats.hp, infiniteHpDisplay.enemy.hp) }}/{{ formatCombatHp(enemyStats.maxHp, infiniteHpDisplay.enemy.maxHp) }}</span>
          </div>
          <!-- MP Bar -->
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[10px] text-[#55aaff] font-bold w-6">MP</span>
            <div class="flex-1 h-2 bg-[#0a0a1a] rounded-full overflow-hidden border border-blue-900/20">
              <div
                class="h-full bg-gradient-to-r from-[#0066cc] to-[#0088ee] rounded-full transition-all duration-500"
                :style="withTransition({ width: `${Math.min((enemyStats.mp / 20) * 100, 100)}%` }, 500)"
              ></div>
            </div>
            <span class="text-[10px] text-white/60 w-14 text-right">{{ enemyStats.mp }}</span>
          </div>
          <!-- Dice Range -->
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-gray-400 font-bold w-6">🎲</span>
            <span class="text-[10px] text-red-300">{{ effectiveEnemyMinDice }} ~ {{ effectiveEnemyMaxDice }}</span>
          </div>
          <!-- Buffs/Debuffs -->
          <TransitionGroup
            v-if="enemyVisibleEffects.length > 0"
            tag="div"
            name="status-effect"
            class="status-effect-list flex flex-wrap gap-1.5 mt-1.5 pointer-events-auto"
          >
            <button
              v-for="eff in enemyVisibleEffects"
              :key="`enemy-${eff.type}`"
              type="button"
              class="effect-icon-btn"
              :class="effectIconBoxClass(eff.polarity)"
              :aria-label="`${getEffectName(eff.type)}: ${getEffectDescription(eff.type)}`"
              @mouseenter="showEffectTooltip($event, eff)"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, eff)"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, eff)"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <i
                v-if="getEffectFontAwesomeClass(eff.type)"
                :class="[getEffectFontAwesomeClass(eff.type), 'text-[14px] leading-none']"
                :style="getEffectFontAwesomeStyle(eff.type)"
                aria-hidden="true"
              ></i>
              <component
                :is="getEffectIconComponent(eff.type)"
                v-else
                class="size-3.5"
              />
              <span v-if="eff.stacks > 1" :key="`enemy-${eff.type}-stacks-${eff.stacks}`" class="effect-stack-badge">{{ eff.stacks }}</span>
            </button>
          </TransitionGroup>
        </div>
      </div>

      <!-- Player Position: Bottom Left -->
      <div class="player-layout-shell absolute flex flex-col items-center justify-end z-20">
        <!-- Player Dice -->
        <div
          v-if="showIdleDice"
          class="player-dice-anchor absolute z-20 pointer-events-auto"
          :class="canPlayerRerollDice ? 'cursor-pointer' : 'cursor-default'"
          :title="playerDiceRerollHint"
          @click="handlePlayerDiceClick"
        >
          <div class="animate-float" style="animation-delay: 1s">
            <DungeonDice
              :value="displayPlayerDice"
              :rolling="isRolling"
              :rolling-min="playerStats.minDice"
              :rolling-max="playerStats.maxDice"
              :number-class="playerDiceNumberClass"
              color="gold"
              size="lg"
            />
          </div>
          <div
            v-if="playerDiceRerollCharges > 0"
            class="absolute left-1/2 top-[8.9rem] -translate-x-1/2 rounded-md border border-amber-300/35 bg-black/60 px-2 py-1 text-[10px] whitespace-nowrap"
            :class="canPlayerRerollDice ? 'text-amber-200' : 'text-amber-200/70'"
          >
            重掷次数：{{ playerDiceRerollCharges }}
          </div>
        </div>

        <!-- Player Portrait -->
        <div class="relative w-full h-full">
          <div class="player-portrait-scale absolute left-1/2 w-64 h-80 flex items-end justify-center overflow-hidden">
            <!-- Placeholder glow (shown when portrait fails to load) -->
            <div v-if="playerPortraitError" class="size-20 bg-dungeon-gold/15 blur-2xl rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <!-- Player portrait image -->
            <img
              v-else
              :src="playerPortraitUrl"
              class="w-full h-full object-contain object-bottom"
              alt="player portrait"
              @error="onPlayerPortraitError"
            />
          </div>
        </div>

        <!-- Player Status Bar -->
        <div class="combat-status-bar combat-status-bar--player relative overflow-visible mt-2 w-60 origin-bottom bg-[#18141e]/90 border border-white/8 p-2.5 rounded-xl shadow-xl backdrop-blur-sm z-10 pointer-events-auto">
          <div class="flex justify-between text-xs text-white/80 font-bold mb-1.5">
              <span>冒险者</span>
          </div>
          <div class="pointer-events-none absolute inset-0 z-30 overflow-visible">
            <div
              v-for="popup in floatingNumbersFor('player')"
              :key="popup.id"
              class="combat-float-number absolute text-xl font-extrabold tracking-wide"
              :class="[popup.colorClass, popup.kind === 'heal' ? 'combat-float-number--heal' : '']"
              :style="{
                left: `calc(50% + ${popup.leftOffset}px)`,
                top: `${popup.topOffset}px`,
                animationDuration: `${popup.duration}ms`,
              }"
            >
              {{ popup.text }}
            </div>
          </div>
          <!-- Armor Shield -->
          <TransitionGroup
            v-if="playerArmor > 0 || playerPoisonAmount > 0 || playerTempMaxHp > 0"
            tag="div"
            name="status-effect"
            class="status-value-list flex items-center gap-3 mb-1"
          >
            <button
              v-if="playerArmor > 0"
              key="player-armor"
              type="button"
              class="status-effect-value-btn flex items-center gap-1"
              :aria-label="`护甲: ${playerArmor}. ${getEffectDescription(ET.ARMOR)}`"
              @mouseenter="showEffectTooltip($event, createStatusEffectPreview(ET.ARMOR, playerArmor), 'right')"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, createStatusEffectPreview(ET.ARMOR, playerArmor), 'right')"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, createStatusEffectPreview(ET.ARMOR, playerArmor), 'right')"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <span class="text-[10px] text-yellow-400">🛡️</span>
              <span :key="`player-armor-count-${playerArmor}`" class="status-value-count text-[10px] text-yellow-300 font-bold">{{ playerArmor }}</span>
            </button>
            <button
              v-if="playerPoisonAmount > 0"
              key="player-poison-amount"
              type="button"
              class="status-effect-value-btn flex items-center gap-1"
              :aria-label="`中毒量: ${playerPoisonAmount}. ${getEffectDescription(ET.POISON_AMOUNT)}`"
              @mouseenter="showEffectTooltip($event, createStatusEffectPreview(ET.POISON_AMOUNT, playerPoisonAmount), 'right')"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, createStatusEffectPreview(ET.POISON_AMOUNT, playerPoisonAmount), 'right')"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, createStatusEffectPreview(ET.POISON_AMOUNT, playerPoisonAmount), 'right')"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <span class="text-[10px] text-green-400">☠</span>
              <span :key="`player-poison-amount-count-${playerPoisonAmount}`" class="status-value-count text-[10px] text-green-300 font-bold">{{ playerPoisonAmount }}</span>
            </button>
            <button
              v-if="playerTempMaxHp > 0"
              key="player-temp-max-hp"
              type="button"
              class="status-effect-value-btn flex items-center gap-1"
              :aria-label="`临时生命上限: ${playerTempMaxHp}. ${getEffectDescription(ET.TEMP_MAX_HP)}`"
              @mouseenter="showEffectTooltip($event, createStatusEffectPreview(ET.TEMP_MAX_HP, playerTempMaxHp), 'right')"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, createStatusEffectPreview(ET.TEMP_MAX_HP, playerTempMaxHp), 'right')"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, createStatusEffectPreview(ET.TEMP_MAX_HP, playerTempMaxHp), 'right')"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <span class="text-[10px] text-rose-400">♥</span>
              <span :key="`player-temp-max-hp-count-${playerTempMaxHp}`" class="status-value-count text-[10px] text-rose-300 font-bold">{{ playerTempMaxHp }}</span>
            </button>
          </TransitionGroup>
          <!-- HP Bar -->
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[10px] text-[#ff6666] font-bold w-6">HP</span>
            <div class="relative flex-1 h-2.5 bg-[#1a0a0a] rounded-full overflow-hidden border border-red-900/20">
              <div
                class="absolute inset-y-0 left-0 z-10 bg-gradient-to-r from-[#cc2200] to-[#ee3311] rounded-full transition-all duration-500"
                :style="withTransition({ width: `${playerStats.maxHp > 0 ? (playerStats.hp / playerStats.maxHp) * 100 : 0}%` }, 500)"
              ></div>
              <div
                class="absolute inset-y-0 left-0 z-20 bg-green-600/75 rounded-full transition-all duration-500 poison-wave-bar"
                :style="withTransition({ width: `${playerPoisonAmountPercent}%` }, 500)"
              ></div>
            </div>
            <span class="text-[10px] text-white/70 w-14 text-right">{{ formatCombatHp(playerStats.hp, infiniteHpDisplay.player.hp) }}/{{ formatCombatHp(playerStats.maxHp, infiniteHpDisplay.player.maxHp) }}</span>
          </div>
          <!-- MP Bar -->
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[10px] text-[#55aaff] font-bold w-6">MP</span>
            <div class="flex-1 h-2 bg-[#0a0a1a] rounded-full overflow-hidden border border-blue-900/20">
              <div
                class="h-full bg-gradient-to-r from-[#0066cc] to-[#0088ee] rounded-full transition-all duration-500"
                :style="withTransition({ width: `${Math.min((playerStats.mp / 20) * 100, 100)}%` }, 500)"
              ></div>
            </div>
            <span class="text-[10px] text-white/60 w-14 text-right">{{ playerStats.mp }}</span>
          </div>
          <!-- Dice Range -->
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] text-gray-400 font-bold w-6">🎲</span>
            <span class="text-[10px] text-dungeon-gold">{{ playerStats.minDice }} ~ {{ playerStats.maxDice }}</span>
          </div>
          <!-- Buffs/Debuffs -->
          <TransitionGroup
            v-if="playerVisibleEffects.length > 0"
            tag="div"
            name="status-effect"
            class="status-effect-list flex flex-wrap gap-1.5 mt-1.5 pointer-events-auto"
          >
            <button
              v-for="eff in playerVisibleEffects"
              :key="`player-${eff.type}`"
              type="button"
              class="effect-icon-btn"
              :class="effectIconBoxClass(eff.polarity)"
              :aria-label="`${getEffectName(eff.type)}: ${getEffectDescription(eff.type)}`"
              @mouseenter="showEffectTooltip($event, eff, 'right')"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, eff, 'right')"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, eff, 'right')"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <i
                v-if="getEffectFontAwesomeClass(eff.type)"
                :class="[getEffectFontAwesomeClass(eff.type), 'text-[14px] leading-none']"
                :style="getEffectFontAwesomeStyle(eff.type)"
                aria-hidden="true"
              ></i>
              <component
                :is="getEffectIconComponent(eff.type)"
                v-else
                class="size-3.5"
              />
              <span v-if="eff.stacks > 1" :key="`player-${eff.type}-stacks-${eff.stacks}`" class="effect-stack-badge">{{ eff.stacks }}</span>
            </button>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- Card Animation Layer -->
    <div class="absolute inset-0 z-[45] pointer-events-none overflow-hidden">
      <div
        v-if="playerPlayedCardVisual"
        class="absolute player-played-card"
        :style="playerPlayedCardStyle"
      >
        <div :class="playerPlayedCardVisual.entered ? 'player-played-card-bob' : ''">
          <div class="combat-card-visual-scale">
            <DungeonCard :card="playerPlayedCardVisual.card" disabled />
          </div>
        </div>
      </div>

      <div
        v-for="visual in resolvedCardVisualEntries"
        :key="visual.id"
        class="resolved-card-visual"
        :class="visual.source === 'player' ? 'resolved-card-visual--player' : 'resolved-card-visual--enemy'"
      >
        <div class="resolved-card-visual-inner" :class="resolvedCardVisualInnerClass(visual)">
          <div class="combat-card-visual-scale">
            <DungeonCard :card="visual.card" disabled />
          </div>
        </div>
      </div>
    </div>

    <!-- UI Layer (HUD) -->
    <div class="absolute inset-0 z-30 flex flex-col pointer-events-none">
      <!-- Center: Clash Zone -->
      <div class="flex-1 flex items-center justify-center relative">
        <!-- Clash Animation Stage -->
        <div v-if="showClashAnimation" class="relative w-full h-64 flex items-center justify-center z-50">
          <!-- Player Dice Flying In -->
          <div
            class="absolute right-1/2 mr-[-0.5rem] transition-all duration-300 scale-[1.04] origin-center"
            :class="shatteringTarget === 'player' || shatteringTarget === 'both' ? 'animate-shatter' : 'animate-clash-left'"
            :style="transitionStyle(300)"
          >
            <DungeonDice
              :value="displayPlayerDice"
              :rolling="false"
              :rolling-min="playerStats.minDice"
              :rolling-max="playerStats.maxDice"
              color="gold"
              size="lg"
            />
          </div>

          <!-- Enemy Dice Flying In -->
          <div
            class="absolute left-1/2 ml-[-0.5rem] transition-all duration-300 scale-[1.04] origin-center"
            :class="shatteringTarget === 'enemy' || shatteringTarget === 'both' ? 'animate-shatter' : 'animate-clash-right'"
            :style="transitionStyle(300)"
          >
            <DungeonDice
              :value="displayEnemyDice"
              :rolling="false"
              :rolling-min="effectiveEnemyMinDice"
              :rolling-max="effectiveEnemyMaxDice"
              color="red"
              size="lg"
            />
          </div>
        </div>

      </div>

      <!-- Bottom Bar: Hand & Piles -->
      <div
        class="pointer-events-none min-h-[200px] w-full flex items-end justify-center pb-6 px-4 space-x-4 relative"
      >
        <!-- Center: Hand Cards -->
        <div class="combat-hand-anchor relative flex space-x-4 items-end mb-2 z-40 pointer-events-auto">
          <div
            v-if="isTwinBattle"
            class="absolute left-1/2 -top-16 -translate-x-1/2 flex gap-2"
          >
            <div
              v-for="slot in twinPlayerSelectionSummaries"
              :key="`twin-player-slot-${slot.slot}`"
              class="min-w-[9rem] rounded-lg border border-fuchsia-300/25 bg-[#18141e]/92 px-3 py-2 text-[11px] text-fuchsia-50 shadow-lg backdrop-blur-sm"
            >
              <div class="text-fuchsia-200/80">{{ getTwinTargetLabel(slot.slot) }}</div>
              <div class="mt-1 font-medium">{{ slot.label }}</div>
            </div>
          </div>
          <div
            v-for="(card, idx) in combatState.playerHand"
            :key="handCardKey(card)"
            class="relative transition-all duration-500 origin-bottom"
            :class="[handCardClass(card), isCardShaking(card) ? 'invalid-card-shake' : '']"
            :style="transitionStyle(500)"
            @mouseenter="handlePlayerCardHoverStart(card, idx)"
            @mouseleave="handlePlayerCardHoverEnd"
            @touchstart.passive="handlePlayerCardTouchStart(card, idx)"
            @touchend="handlePlayerCardTouchEnd"
            @touchcancel="handlePlayerCardTouchEnd"
          >
            <div
              v-if="isTwinBattle && getTwinPlayerSelectionSlot(card) !== null"
              class="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-dungeon-gold/40 bg-[#241b12]/95 px-2 py-0.5 text-[10px] font-bold text-dungeon-gold shadow-lg"
            >
              {{ getTwinTargetLabel(getTwinPlayerSelectionSlot(card)) }}
            </div>
            <div
              v-if="activeHandSelectionMode"
              class="pointer-events-none absolute -right-2 -top-2 z-20 flex size-9 items-center justify-center rounded-full border border-red-300/80 bg-red-950/95 text-red-100 shadow-lg shadow-red-950/40"
            >
              <XIcon class="size-6" />
            </div>
            <DungeonCard
              :card="getDisplayHandCard(card)"
              :mask-level="getPlayerHandMaskLevel(idx, card)"
              :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT && combatState.playerSelectedCard !== card"
              @click="handleCardSelect(card, idx)"
            />
          </div>
        </div>

        <!-- Left Corner: Skip + Active Skills -->
        <div class="combat-bottom-left-controls absolute flex flex-col items-start gap-2 z-50 pointer-events-auto combat-button-cluster--bottom-left">
          <button
            class="h-8 px-5 bg-[#252030]/90 border border-white/15 rounded-lg text-xs text-white/80 hover:border-amber-400 hover:text-amber-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT"
            @click="handleSkipTurn"
          >
            跳过回合
          </button>

          <div class="flex gap-1.5">
            <button
              v-for="slot in playerActiveSkillSlots"
              :key="`active-skill-slot-${slot.idx}`"
              type="button"
              class="rounded-xl transition-all"
              :class="[
                activeSkillButtonDisabled(slot.idx)
                  ? 'opacity-80 cursor-not-allowed grayscale-[0.2]'
                  : 'hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(255,255,255,0.16)] active:scale-[0.98]',
              ]"
              :disabled="activeSkillButtonDisabled(slot.idx)"
              @click="useActiveSkill(slot.idx)"
            >
              <ActiveSkillCard
                :skill="slot.skill"
                :mana-cost="slot.manaCost"
                size="compact"
                :footer-right-text="slot.skill ? getActiveSkillStatusText(slot) : ''"
                :footer-right-tone="activeSkillButtonDisabled(slot.idx) ? 'warning' : 'success'"
              />
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="alchemyPendingGrandSynthesis"
        class="pointer-events-auto absolute inset-0 z-[120] flex items-center justify-center bg-black/65 p-6 backdrop-blur-sm"
      >
        <div class="w-full max-w-4xl rounded-lg border border-dungeon-gold/40 bg-[#171018]/95 p-4 shadow-2xl">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-bold text-dungeon-gold">大炼成</div>
              <div class="mt-1 text-xs text-dungeon-paper/70">选择本场战斗要绑定并强化的卡牌</div>
            </div>
            <button
              type="button"
              class="rounded border border-dungeon-brown/60 px-3 py-1.5 text-xs text-dungeon-paper/80 hover:border-dungeon-gold/60"
              @click="cancelAlchemyGrandSynthesis"
            >
              取消
            </button>
          </div>
          <div class="grid max-h-[62vh] grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-4">
            <button
              v-for="entry in alchemyGrandSynthesisChoices"
              :key="`alchemy-grand-${entry.pile}-${entry.index}-${entry.card.id}`"
              type="button"
              class="rounded border border-dungeon-brown/50 bg-black/20 p-2 transition-colors hover:border-dungeon-gold/70"
              @click="confirmAlchemyGrandSynthesis(entry.card)"
            >
              <DungeonCard :card="entry.card" disabled />
            </button>
          </div>
        </div>
      </div>

      <!-- Log Feed + Piles Overlay: top-right, below parent "退出战斗" button -->
      <div class="combat-top-right-panel absolute z-40 pointer-events-auto select-none flex flex-col items-end gap-2 combat-button-cluster--top-right">
        <div class="flex items-start">
          <button
            class="h-[2.625rem] px-3 rounded-l-lg border border-r-0 border-white/10 bg-[#18141e]/90 text-[15px] leading-none text-white/50 hover:text-white/80 transition-colors"
            :title="logsCollapsed ? '展开日志' : '折叠日志'"
            @click="logsCollapsed = !logsCollapsed"
          >
            {{ logsCollapsed ? '日志 ▼' : '日志 ▲' }}
          </button>
          <div
            v-if="!logsCollapsed"
            class="w-80 max-h-44 overflow-y-auto space-y-1 border border-r-0 border-white/10 bg-[#18141e]/90 backdrop-blur-sm p-1 text-[10px] font-mono text-gray-300"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-for="(l, i) in combatState.logs"
              :key="i"
              class="bg-black/60 p-1 rounded border-l-2 border-gray-700"
              v-html="l"
            ></div>
          </div>
        </div>

        <div class="flex items-start">
          <button
            class="h-[2.625rem] px-3 rounded-l-lg border border-r-0 border-white/10 bg-[#18141e]/90 text-[15px] leading-none text-white/50 hover:text-white/80 transition-colors"
            :title="isPlayerDeckHiddenByFantasyEmbrace
              ? (pilesCollapsed ? '展开弃牌堆' : '折叠弃牌堆')
              : (pilesCollapsed ? '展开牌库与弃牌堆' : '折叠牌库与弃牌堆')"
            @click="pilesCollapsed = !pilesCollapsed"
          >
            {{ isPlayerDeckHiddenByFantasyEmbrace ? (pilesCollapsed ? '弃牌堆 ▼' : '弃牌堆 ▲') : (pilesCollapsed ? '牌堆 ▼' : '牌堆 ▲') }}
          </button>
          <div
            v-if="!pilesCollapsed"
            class="w-44 border border-r-0 border-white/10 bg-[#18141e]/90 backdrop-blur-sm p-2"
          >
            <div class="flex items-center justify-center gap-2">
              <div
                v-if="!isPlayerDeckHiddenByFantasyEmbrace"
                class="relative group"
              >
                <button
                  class="w-14 h-14 bg-[#252030]/90 border border-white/10 rounded-xl flex flex-col items-center justify-center hover:border-dungeon-gold active:scale-95 transition-all shadow-lg"
                  @click="overlayOpen = 'deck'"
                >
                  <Layers class="size-5 text-dungeon-gold" />
                <span class="text-[9px] text-white/40 mt-0.5">{{ combatState.playerDeck.length }}</span>
              </button>
              <div
                class="absolute -top-8 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                牌库
              </div>
              </div>

              <div class="relative group">
                <button
                  class="w-14 h-14 bg-[#252030]/90 border border-white/10 rounded-xl flex flex-col items-center justify-center hover:border-gray-400 active:scale-95 transition-all shadow-lg"
                  @click="overlayOpen = 'discard'"
                >
                  <Trash2 class="size-5 text-gray-400" />
                  <span class="text-[9px] text-white/40 mt-0.5">{{ combatState.discardPile.length }}</span>
                </button>
                <div
                  class="absolute -top-8 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  弃牌堆
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="battleResultBanner"
      class="absolute inset-0 z-[70] flex items-center justify-center pointer-events-none"
    >
      <div
        class="battle-result-banner px-12 py-5 rounded-2xl border-2 font-heading tracking-[0.2em] drop-shadow-[0_0_30px_rgba(0,0,0,0.9)] animate-pulse backdrop-blur-md"
        :class="battleResultBanner === 'win'
          ? 'bg-emerald-950/70 border-emerald-400/60 text-emerald-300'
          : battleResultBanner === 'escape'
            ? 'bg-zinc-900/75 border-zinc-300/50 text-zinc-100'
            : 'bg-red-950/70 border-red-500/60 text-red-300'"
      >
        {{ battleResultBanner === 'win' ? '胜利' : battleResultBanner === 'escape' ? '脱离' : '败北' }}
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="effectTooltip"
        class="effect-tooltip fixed z-[240] pointer-events-none"
        :class="effectTooltip.align === 'right' ? 'effect-tooltip--right text-right' : 'effect-tooltip--center'"
        :style="{ left: `${effectTooltip.x}px`, top: `${effectTooltip.y}px` }"
      >
        <div class="effect-tooltip-name">{{ effectTooltip.name }}</div>
        <div
          v-if="effectTooltip.previewCard"
          class="effect-tooltip-card-preview"
        >
          <DungeonCard :card="effectTooltip.previewCard" disabled />
        </div>
        <div class="effect-tooltip-desc">{{ effectTooltip.description }}</div>
        <div v-if="effectTooltip.stacks > 1" class="effect-tooltip-stacks">层数: {{ effectTooltip.stacks }}</div>
      </div>
    </Teleport>

    <!-- Deck/Discard Overlay -->
    <div
      v-if="overlayOpen && (!isPlayerDeckHiddenByFantasyEmbrace || overlayOpen === 'discard')"
      class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
      @click="overlayOpen = null"
    >
      <div
        class="bg-[#18141e] border border-white/10 p-6 rounded-2xl max-w-2xl w-full max-h-[80%] flex flex-col relative shadow-2xl"
        @click.stop
      >
        <div class="flex justify-between items-center mb-4 border-b border-dungeon-brown pb-2">
          <h3 class="font-heading text-xl text-dungeon-gold">
            {{ overlayOpen === 'deck' ? '当前牌库' : '弃牌堆' }}
          </h3>
          <button @click="overlayOpen = null">
            <XIcon class="size-6 hover:text-red-500" />
          </button>
        </div>
        <div class="overflow-y-auto grid grid-cols-4 gap-4 p-2">
          <div
            v-for="(card, i) in overlayOpen === 'deck' ? combatState.playerDeck : combatState.discardPile"
            :key="i"
            class="scale-75 origin-top-left"
          >
            <DungeonCard :card="getDisplayPileCard(card)" disabled />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
    Ban,
    Battery,
    Bone,
    Box,
    Brain,
    Bug,
    Droplet,
    Eye,
    EyeOff,
    Flame,
    Heart,
    Info,
    Layers,
    Leaf,
    Link2,
    Copy,
    SquareDashed,
    Scroll,
    Settings2,
    Shield,
    ShieldCheck,
    Skull,
    Snowflake,
    Sparkles,
    Sword,
    Trash2,
    TriangleAlert,
    Waves,
    X as XIcon,
    Zap,
} from 'lucide-vue-next';
import { toRaw } from 'vue';
import {
    applyDamageToEntity,
    calculateFinalDamage,
    calculateFinalPoint,
    consumeColdAfterDealingDamage,
    triggerSwarmReviveIfNeeded as triggerSwarmReviveIfNeededInAlgorithm,
} from '../battle/algorithms';
import { getAllCards, getCardByName } from '../battle/cardRegistry';
import { EFFECT_REGISTRY, ELEMENTAL_DEBUFF_TYPES, applyEffect, canPlayCard, findEffect, getEffectDisplayOrder, getEffectStacks, processOnTurnEnd, processOnTurnStart, reduceEffectStacks, removeEffect } from '../battle/effects';
import { getEnemyByName } from '../battle/enemyRegistry';
import {
    resolveRelicMap,
    type RelicActiveSkillHookContext,
    type RelicAfterBurnDamageTakenHookContext,
    type RelicApplyEffectOptions,
    type RelicBeforeApplyEffectHookContext,
    type RelicBurnDamageHookContext,
    type RelicData,
    type RelicDiceClickHookContext,
    type RelicDirectDamageHookContext,
    type RelicHitHookContext,
    type RelicLifecycleHookContext,
    type RelicPointHookContext,
    type RelicSide,
    type ResolvedRelicEntry,
} from '../battle/relicRegistry';
import { recordEncounteredCards, recordEncounteredEffects, recordEncounteredEnemy } from '../codexStore';
import {
    HELL_STARTING_DEBUFFS,
    getDifficultyHpMultiplier,
    getLordTurnBoostInterval,
    hasCustomDifficultyInfluence,
    normalizeDifficulty,
    normalizeCustomDifficultyInfluences,
    shouldApplyHellStartingDebuff,
    shouldGrantLordTurnBoost,
} from '../difficulty';
import { getEffectFontAwesomeClass, getEffectFontAwesomeStyle } from '../effectIconRegistry';
import { getFloorNumberForArea } from '../floor';
import { toggleFullScreen } from '../fullscreen';
import { useGameStore } from '../gameStore';
import { getLocalFolderFirstImagePath, getLocalFolderImagePaths } from '../localAssetManifest';
import { CardType, CombatPhase, EffectType as ET, type ActiveSkillData, type CardData, type CardEffectTrigger, type CardManaDrainConfig, type CardSelfDamageConfig, type CombatState, type EffectInstance, type EffectPolarity, type EffectType, type EnemyAIContext, type EntityStats } from '../types';
import ActiveSkillCard from './ActiveSkillCard.vue';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';

const props = withDefaults(defineProps<{
  initialPlayerStats: EntityStats;
  enemyName: string;
  playerDeck: CardData[];
  playerActiveSkills?: ActiveSkillData[];
  playerRelics?: Record<string, number>;
  playerPortraitOverrideUrl?: string;
  testStartAt999?: boolean;
  uiFontFamily?: string;
  trackDiscovery?: boolean;
}>(), {
  playerActiveSkills: () => [],
  playerRelics: () => ({}),
  playerPortraitOverrideUrl: '',
  testStartAt999: false,
  uiFontFamily: '',
  trackDiscovery: true,
});

const emit = defineEmits<{
  endCombat: [outcome: 'win' | 'lose' | 'escape', finalStats: EntityStats, logs: string[], negativeEffects: string[], goldDelta?: number];
  openDeck: [];
  openRelics: [];
  openGlossary: [];
}>();

const gameStore = useGameStore();
const resolveCurrentFloorNumber = () => {
  const area = (gameStore.statData._当前区域 as string) || '';
  const floorFromArea = getFloorNumberForArea(area);
  const fallback = Math.max(1, Math.floor(Number(gameStore.statData._楼层数 ?? 1)));
  const floor = area ? floorFromArea : fallback;
  gameStore.statData._楼层数 = floor;
  return floor;
};
const currentFloorNumber = resolveCurrentFloorNumber();
const difficultyAtBattleStart = normalizeDifficulty(gameStore.statData.$难度);
const customDifficultyInfluencesAtBattleStart = normalizeCustomDifficultyInfluences(gameStore.statData.$自定义影响);
const isCustomDifficultyInfluenceActive = (influence: Parameters<typeof hasCustomDifficultyInfluence>[1]) =>
  difficultyAtBattleStart === '自定义' && hasCustomDifficultyInfluence(customDifficultyInfluencesAtBattleStart, influence);
const difficultyHpMultiplier = getDifficultyHpMultiplier(
  difficultyAtBattleStart,
  currentFloorNumber,
  customDifficultyInfluencesAtBattleStart,
);
const lordTurnBoostInterval = getLordTurnBoostInterval(difficultyAtBattleStart, customDifficultyInfluencesAtBattleStart);
const isLordBattle = String(gameStore.statData._当前房间类型 ?? '').includes('领主');

// --- Enemy Loading ---
const enemyDef = getEnemyByName(props.enemyName, currentFloorNumber);
const enemyDisplayName = enemyDef?.name ?? props.enemyName;
const isTwinBattle = Boolean(enemyDef?.selectTwinCards);
const isMirrorCloneBattle = enemyDisplayName === '镜像分身';
const usesPlayerPreviousPointDice = isMirrorCloneBattle || enemyDisplayName === '米拉';

// --- Portrait URLs ---
const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const HF_USER_DIR = '地牢/user';
const HF_MONSTER_DIR = '地牢/魔物';
const BOSS_FOLDER_NAMES = new Set([
  '普莉姆', '宁芙', '温蒂尼', '玛塔', '罗丝', '厄休拉',
  '希尔薇', '因克', '阿卡夏', '多萝西', '维罗妮卡',
  '伊丽莎白', '尤斯蒂娅', '克拉肯', '布偶',
  '赛琳娜', '米拉', '梦魔双子', '贝希摩斯',
  '佩恩', '西格尔', '摩尔', '利维坦', '奥赛罗', '盖亚',
]);

const folderImageCache = new Map<string, string[]>();
const folderImagePromiseCache = new Map<string, Promise<string[]>>();

const normalizeRepoPath = (path: string) => path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
const encodeRepoPath = (path: string) => normalizeRepoPath(path).split('/').map((seg) => encodeURIComponent(seg)).join('/');
const toResolveUrl = (repoPath: string) => `${IMAGE_CDN_ROOT}/${encodeRepoPath(repoPath)}`;
const pickRandom = <T,>(items: T[]): T | null => (items.length > 0 ? items[Math.floor(Math.random() * items.length)]! : null);

const fetchFolderImages = async (repoFolderPath: string): Promise<string[]> => {
  const folder = normalizeRepoPath(repoFolderPath);
  const cached = folderImageCache.get(folder);
  if (cached) return cached;
  const pending = folderImagePromiseCache.get(folder);
  if (pending) return pending;

  const task = (async () => {
    const images = getLocalFolderImagePaths(folder);
    folderImageCache.set(folder, images);
    return images;
  })();

  folderImagePromiseCache.set(folder, task);
  try {
    return await task;
  } finally {
    folderImagePromiseCache.delete(folder);
  }
};

const playerPortraitUrl = ref(toResolveUrl(`${HF_USER_DIR}/立绘.png`));
const enemyPortraitUrl = ref(toResolveUrl(`${HF_MONSTER_DIR}/${enemyDisplayName}.png`));
const playerPortraitError = ref(false);
const enemyPortraitError = ref(false);
const playerPortraitFallbackTried = ref(false);
const enemyPortraitFallbackTried = ref(false);

let portraitLoaderDisposed = false;

const resolveRandomPortrait = async (
  folderPath: string,
  fallbackFilePath: string,
): Promise<string> => {
  const images = await fetchFolderImages(folderPath);
  const randomPath = pickRandom(images);
  const firstPath = getLocalFolderFirstImagePath(folderPath);
  return randomPath
    ? toResolveUrl(randomPath)
    : firstPath
      ? toResolveUrl(firstPath)
      : toResolveUrl(fallbackFilePath);
};

const tryFallbackPortrait = async (
  folderPath: string,
  urlRef: typeof playerPortraitUrl,
  errorRef: typeof playerPortraitError,
  triedRef: typeof playerPortraitFallbackTried,
) => {
  if (triedRef.value) {
    errorRef.value = true;
    return;
  }
  triedRef.value = true;
  const firstPath = getLocalFolderFirstImagePath(folderPath);
  if (!firstPath) {
    errorRef.value = true;
    return;
  }
  const firstUrl = toResolveUrl(firstPath);
  if (firstUrl === urlRef.value) {
    errorRef.value = true;
    return;
  }
  errorRef.value = false;
  urlRef.value = firstUrl;
};

const onPlayerPortraitError = () => {
  if (props.playerPortraitOverrideUrl && playerPortraitUrl.value === props.playerPortraitOverrideUrl) {
    void (async () => {
      const fallbackUrl = await resolveRandomPortrait(HF_USER_DIR, `${HF_USER_DIR}/立绘.png`);
      if (!portraitLoaderDisposed) {
        playerPortraitFallbackTried.value = false;
        playerPortraitError.value = false;
        playerPortraitUrl.value = fallbackUrl;
      }
    })();
    return;
  }
  void tryFallbackPortrait(HF_USER_DIR, playerPortraitUrl, playerPortraitError, playerPortraitFallbackTried);
};

const onEnemyPortraitError = () => {
  void tryFallbackPortrait(`${HF_MONSTER_DIR}/${enemyDisplayName}`, enemyPortraitUrl, enemyPortraitError, enemyPortraitFallbackTried);
};

const initPortraitUrls = async () => {
  const playerUrl = props.playerPortraitOverrideUrl
    ? props.playerPortraitOverrideUrl
    : await resolveRandomPortrait(HF_USER_DIR, `${HF_USER_DIR}/立绘.png`);
  if (!portraitLoaderDisposed) {
    playerPortraitFallbackTried.value = false;
    playerPortraitError.value = false;
    playerPortraitUrl.value = playerUrl;
  }

  const enemyFolderPath = `${HF_MONSTER_DIR}/${enemyDisplayName}`;
  const enemyFallback = `${HF_MONSTER_DIR}/${enemyDisplayName}.png`;
  const shouldPreferFolder = BOSS_FOLDER_NAMES.has(enemyDisplayName);
  let enemyUrl = toResolveUrl(enemyFallback);
  if (shouldPreferFolder) {
    enemyUrl = await resolveRandomPortrait(enemyFolderPath, enemyFallback);
  } else {
    const folderImages = await fetchFolderImages(enemyFolderPath);
    const randomEnemy = pickRandom(folderImages);
    if (randomEnemy) {
      enemyUrl = toResolveUrl(randomEnemy);
    }
  }
  if (!portraitLoaderDisposed) {
    enemyPortraitFallbackTried.value = false;
    enemyPortraitError.value = false;
    enemyPortraitUrl.value = enemyUrl;
  }
};

// --- Dynamic Background ---
const bgIsLordFallback = ref(false);
const bgImageError = ref(false);

const HF_BASE = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF`;
const currentArea = computed(() => (gameStore.statData._当前区域 as string) || '');
const currentRoomType = computed(() => (gameStore.statData._当前房间类型 as string) || '');
const isCurrentOpponentLord = () => currentRoomType.value.includes('领主') || BOSS_FOLDER_NAMES.has(enemyDisplayName);
const bgImageUrl = computed(() => {
  if (!currentArea.value || bgImageError.value) return '';
  const isLord = currentRoomType.value === '领主' && !bgIsLordFallback.value;
  const suffix = isLord ? `${currentArea.value}_领主` : currentArea.value;
  return `${HF_BASE}/${encodeURIComponent(suffix)}.png`;
});
function onBgError() {
  if (currentRoomType.value === '领主' && !bgIsLordFallback.value) {
    bgIsLordFallback.value = true; // fallback to normal area bg
  } else {
    bgImageError.value = true; // give up, show gradient
  }
}

// AI flags - mutable state for enemy AI decisions (e.g. hasUsedHeal)
const aiFlags = reactive<Record<string, any>>({});
const INFINITE_HP_VALUE = 2147483647;
const isInfiniteHpValue = (value: number): boolean => Math.floor(value) >= INFINITE_HP_VALUE;
const formatCombatHp = (value: number, forceInfinite = false): string => (
  forceInfinite || isInfiniteHpValue(value) ? '∞' : String(Math.max(0, Math.floor(value)))
);

// --- State ---
const cloneEntityStats = (stats: EntityStats): EntityStats => ({
  ...stats,
  effects: stats.effects.map((eff) => ({
    ...eff,
    restrictedTypes: eff.restrictedTypes ? [...eff.restrictedTypes] : undefined,
    mercyCardType: eff.mercyCardType,
  })),
});

const normalizeTestStartStats = (stats: EntityStats): EntityStats => {
  const cloned = cloneEntityStats(stats);
  if (!props.testStartAt999) return cloned;
  return { ...cloned, hp: 999, maxHp: 999, mp: 999 };
};

const buildEnemyInitialStats = (): EntityStats => {
  const baseStats = enemyDef
    ? cloneEntityStats(enemyDef.stats)
    : { hp: 1, maxHp: 1, mp: 0, minDice: 1, maxDice: 1, effects: [] as EffectInstance[] };
  if (isMirrorCloneBattle) {
    baseStats.mp = Math.max(0, Math.floor(props.initialPlayerStats.mp));
    baseStats.minDice = Math.max(0, Math.floor(props.initialPlayerStats.minDice));
    baseStats.maxDice = Math.max(baseStats.minDice, Math.floor(props.initialPlayerStats.maxDice));
  }
  if (difficultyHpMultiplier !== 1 && baseStats.maxHp < INFINITE_HP_VALUE) {
    const scaledMaxHp = Math.max(1, Math.round(baseStats.maxHp * difficultyHpMultiplier));
    const scaledHp = Math.max(1, Math.min(scaledMaxHp, Math.round(baseStats.hp * difficultyHpMultiplier)));
    baseStats.maxHp = scaledMaxHp;
    baseStats.hp = scaledHp;
  }
  const normalized = normalizeTestStartStats(baseStats);
  if (enemyDef?.name === '奥赛罗') {
    const phaseTransition = normalized.effects.find(effect => effect.type === ET.PHASE_TRANSITION);
    if (phaseTransition) {
      phaseTransition.stacks = Math.max(1, Math.floor(normalized.maxHp * 0.5));
    }
  }
  return normalized;
};

const playerStats = ref<EntityStats>(
  normalizeTestStartStats(props.initialPlayerStats),
);
const enemyStats = ref<EntityStats>(
  buildEnemyInitialStats(),
);
const infiniteHpDisplay = {
  player: {
    hp: isInfiniteHpValue(playerStats.value.hp),
    maxHp: isInfiniteHpValue(playerStats.value.maxHp),
  },
  enemy: {
    hp: isInfiniteHpValue(enemyStats.value.hp),
    maxHp: isInfiniteHpValue(enemyStats.value.maxHp),
  },
};

// --- Effect display helpers ---
const getEffectName = (type: EffectType): string => {
  return EFFECT_REGISTRY[type]?.name ?? String(type);
};
const getEffectDescription = (type: EffectType): string => {
  return EFFECT_REGISTRY[type]?.description ?? '';
};
const createStatusEffectPreview = (type: EffectType, stacks: number): EffectInstance => ({
  type,
  stacks: Math.max(1, Math.floor(stacks)),
  polarity: EFFECT_REGISTRY[type]?.polarity ?? 'special',
});
const EFFECT_ICON_COMPONENTS: Partial<Record<EffectType, any>> = {
  [ET.BARRIER]: ShieldCheck,
  [ET.ARMOR]: Shield,
  [ET.BIND]: Link2,
  [ET.DEVOUR]: Skull,
  [ET.POISON]: Bug,
  [ET.POISON_AMOUNT]: Droplet,
  [ET.CORROSION]: Droplet,
  [ET.CORRODE]: TriangleAlert,
  [ET.BURN]: Flame,
  [ET.BLEED]: Droplet,
  [ET.VULNERABLE]: TriangleAlert,
  [ET.DAMAGE_BOOST]: Sword,
  [ET.WEAKEN]: TriangleAlert,
  [ET.REGEN]: Heart,
  [ET.DAMAGE_LIMIT]: Shield,
  [ET.IRIS_AMBER]: Eye,
  [ET.IRIS_SCARLET]: Eye,
  [ET.WHITE_TURBID]: Droplet,
  [ET.IGNITE_AURA]: Sparkles,
  [ET.STUN]: Ban,
  [ET.CHARGE]: Zap,
  [ET.FATIGUE]: TriangleAlert,
  [ET.SCALE_POWDER]: Sparkles,
  [ET.CO_DAMAGE]: Link2,
  [ET.TEMPERATURE_DIFF]: Waves,
  [ET.NON_LIVING]: Bone,
  [ET.NON_ENTITY]: Sparkles,
  [ET.ILLUSORY_BODY]: Sparkles,
  [ET.TEMP_MAX_HP]: Heart,
  [ET.MAX_HP_REDUCTION]: Heart,
  [ET.POINT_GROWTH_BIG]: Layers,
  [ET.POINT_GROWTH_SMALL]: Layers,
  [ET.MANA_DRAIN]: Battery,
  [ET.MANA_SPRING]: Waves,
  [ET.VOID_TAINT]: Sparkles,
  [ET.SWARM]: Bug,
  [ET.BLOOD_COCOON]: Heart,
  [ET.INDOMITABLE]: Heart,
  [ET.MIRROR_REGENERATION]: SquareDashed,
  [ET.MIMICKER]: Copy,
  [ET.DANCE_HALL]: Sparkles,
  [ET.CO_DANCE]: Link2,
  [ET.SOLITUDE]: Heart,
  [ET.REFLECTION]: SquareDashed,
  [ET.PEEP_FORBIDDEN]: Eye,
  [ET.BLIND_ASH]: EyeOff,
  [ET.COGNITIVE_INTERFERENCE]: Brain,
  [ET.UNSEEABLE]: EyeOff,
  [ET.TWINS]: Link2,
  [ET.MEMORY_FOG]: EyeOff,
  [ET.SIGHT_DEPRIVATION]: EyeOff,
  [ET.FATE_OBSERVATION]: Sparkles,
  [ET.SILENCE]: Ban,
  [ET.STURDY]: Shield,
  [ET.SHOCK]: Zap,
  [ET.FLAME_ATTACH]: Flame,
  [ET.POISON_ATTACH]: Bug,
  [ET.TOXIN_SPREAD]: Bug,
  [ET.AMBUSH]: Link2,
  [ET.FROST_ATTACH]: Snowflake,
  [ET.BLOODBLADE_ATTACH]: Droplet,
  [ET.LIGHTNING_ATTACH]: Zap,
  [ET.ELEMENT_ATTACH]: Sparkles,
  [ET.THORNS]: Leaf,
  [ET.BLOODLINE]: Heart,
  [ET.CONTRACT_CURSE]: Skull,
  [ET.INK_CREATION]: Scroll,
  [ET.PHASE_TRANSITION]: Sparkles,
};
const getEffectIconComponent = (type: EffectType) => {
  return EFFECT_ICON_COMPONENTS[type] ?? Sparkles;
};
const effectIconBoxClass = (polarity: EffectPolarity): string => {
  switch (polarity) {
    case 'buff':    return 'bg-emerald-900/65 border-emerald-400/50 text-emerald-200';
    case 'debuff':  return 'bg-red-900/65 border-red-400/55 text-red-200';
    case 'trait':   return 'bg-slate-800/70 border-slate-400/45 text-slate-200';
    case 'mixed':   return 'bg-indigo-900/70 border-indigo-400/55 text-indigo-200';
    case 'special': return 'bg-amber-900/70 border-amber-400/55 text-amber-200';
    default:        return 'bg-slate-800/70 border-slate-400/45 text-slate-200';
  }
};

// --- Armor computed ---
const playerArmor = computed(() => {
  const eff = playerStats.value.effects.find(e => e.type === ET.ARMOR);
  return eff?.stacks ?? 0;
});
const enemyArmor = computed(() => {
  const eff = enemyStats.value.effects.find(e => e.type === ET.ARMOR);
  return eff?.stacks ?? 0;
});
const playerPoisonAmount = computed(() => {
  const eff = playerStats.value.effects.find(e => e.type === ET.POISON_AMOUNT);
  return eff?.stacks ?? 0;
});
const enemyPoisonAmount = computed(() => {
  const eff = enemyStats.value.effects.find(e => e.type === ET.POISON_AMOUNT);
  return eff?.stacks ?? 0;
});
const playerTempMaxHp = computed(() => {
  const eff = playerStats.value.effects.find(e => e.type === ET.TEMP_MAX_HP);
  return eff?.stacks ?? 0;
});
const enemyTempMaxHp = computed(() => {
  const eff = enemyStats.value.effects.find(e => e.type === ET.TEMP_MAX_HP);
  return eff?.stacks ?? 0;
});
const playerPoisonAmountPercent = computed(() => {
  if (playerStats.value.maxHp <= 0) return 0;
  return Math.max(0, Math.min((playerPoisonAmount.value / playerStats.value.maxHp) * 100, 100));
});
const enemyPoisonAmountPercent = computed(() => {
  if (enemyStats.value.maxHp <= 0) return 0;
  return Math.max(0, Math.min((enemyPoisonAmount.value / enemyStats.value.maxHp) * 100, 100));
});
const playerVisibleEffects = computed(() => playerStats.value.effects
  .filter(e => e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT && e.type !== ET.TEMP_MAX_HP)
  .sort((a, b) => getEffectDisplayOrder(a.type) - getEffectDisplayOrder(b.type)));
const enemyVisibleEffects = computed(() => enemyStats.value.effects
  .filter(e => e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT && e.type !== ET.TEMP_MAX_HP)
  .sort((a, b) => getEffectDisplayOrder(a.type) - getEffectDisplayOrder(b.type)));
const isPlayerDeckHiddenByFantasyEmbrace = computed(() => getEffectStacks(enemyStats.value, ET.FANTASY_EMBRACE) > 0);

const cloneCardForBattle = (card: CardData): CardData => ({
  ...card,
  calculation: { ...card.calculation },
  damageLogic: { ...card.damageLogic },
  traits: { ...card.traits },
  manaDrain: typeof card.manaDrain === 'object' && card.manaDrain !== null
    ? { ...(card.manaDrain as CardManaDrainConfig) }
    : card.manaDrain,
  selfDamage: typeof card.selfDamage === 'object' && card.selfDamage !== null
    ? { ...(card.selfDamage as CardSelfDamageConfig) }
    : card.selfDamage,
  cardEffects: card.cardEffects.map((ce) => ({
    ...ce,
    triggers: ce.triggers ? [...ce.triggers] : undefined,
    restrictedTypes: ce.restrictedTypes ? [...ce.restrictedTypes] : undefined,
    cleanseTypes: ce.cleanseTypes ? [...ce.cleanseTypes] : undefined,
  })),
});
const toBattleDeck = (cards: CardData[]) => cards.map(cloneCardForBattle);

const enemyDeck = isMirrorCloneBattle
  ? toBattleDeck(props.playerDeck)
  : (enemyDef ? toBattleDeck(enemyDef.deck) : []);

// dummy card to prevent crash if enemy has no cards
const PASS_CARD: CardData = {
  id: 'pass', name: '跳过', type: CardType.FUNCTION, category: '基础', rarity: '普通', manaCost: 0,
  calculation: { multiplier: 0, addition: 0 }, damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false }, cardEffects: [], description: '无行动',
};

const MOORE_MIMIC_CARD_KEY = '摩尔·梦境';
const MOORE_MIMIC_CARD_ID = 'enemy_moore_mimic';
const BEHEMOTH_FOOD_CARD_NAMES = ['烤兔腿', '烤肉', '浓汤', '脂肪块'] as const;
const BEHEMOTH_ROASTED_RABBIT_LEG_ID = 'behemoth_food_roasted_rabbit_leg';
const BEHEMOTH_ROAST_MEAT_ID = 'behemoth_food_roast_meat';
const mimicDisplayCards = new WeakMap<CardData, CardData>();
const mooreMimicPlayedThisTurn = ref(false);

const combatState = ref<CombatState>({
  turn: 1,
  phase: CombatPhase.TURN_START,
  actionsRemaining: 1,
  playerBaseDice: 1,
  enemyBaseDice: 1,
  playerHand: [],
  playerDeck: toBattleDeck(props.playerDeck).sort(() => Math.random() - 0.5),
  discardPile: [],
  enemyDeck: [...enemyDeck],
  enemyDiscard: [],
  enemyIntentCard: null,
  enemyPredictedPoint: 0,
  playerSelectedCard: null,
  lastPlayedCard: null,
  logs: [`战斗开始！遭遇了 <span class="text-red-500 font-bold">${enemyDisplayName}</span>`],
});

const MERCY_MARKABLE_CARD_TYPES: readonly CardType[] = [
  CardType.PHYSICAL,
  CardType.MAGIC,
  CardType.FUNCTION,
  CardType.DODGE,
];

const pickMercyMarkedCardType = (cards: readonly CardData[]): CardType | null => {
  const counts = new Map<CardType, number>();
  for (const card of cards) {
    if (!MERCY_MARKABLE_CARD_TYPES.includes(card.type)) continue;
    counts.set(card.type, (counts.get(card.type) ?? 0) + 1);
  }
  let maxCount = 0;
  for (const count of counts.values()) {
    maxCount = Math.max(maxCount, count);
  }
  if (maxCount <= 0) return null;
  const tiedTypes = MERCY_MARKABLE_CARD_TYPES.filter(type => (counts.get(type) ?? 0) === maxCount);
  return tiedTypes[Math.floor(Math.random() * tiedTypes.length)] ?? null;
};

const initializeMercyMarksAtCombatStart = () => {
  const configs: Array<{
    holder: EntityStats;
    holderLabel: string;
    targetDeck: readonly CardData[];
    targetLabel: string;
  }> = [
    {
      holder: playerStats.value,
      holderLabel: '我方',
      targetDeck: combatState.value.enemyDeck,
      targetLabel: '敌方',
    },
    {
      holder: enemyStats.value,
      holderLabel: '敌方',
      targetDeck: combatState.value.playerDeck,
      targetLabel: '我方',
    },
  ];

  for (const config of configs) {
    for (const effect of config.holder.effects) {
      if (effect.type !== ET.MERCY || effect.stacks <= 0) continue;
      const markedType = pickMercyMarkedCardType(config.targetDeck);
      effect.mercyCardType = markedType ?? undefined;
      if (markedType) {
        combatState.value.logs.push(`<span class="text-fuchsia-300">${config.holderLabel}[怜悯] 标记了${config.targetLabel}牌库中的【${markedType}】牌。</span>`);
      } else {
        combatState.value.logs.push(`<span class="text-gray-400">${config.holderLabel}[怜悯] 未找到可标记的非诅咒卡牌。</span>`);
      }
    }
  }
};

initializeMercyMarksAtCombatStart();

const recordCombatDiscoveryAtStart = () => {
  if (!props.trackDiscovery) return;
  recordEncounteredEnemy({
    name: enemyDisplayName || props.enemyName,
    floor: currentFloorNumber,
    area: currentArea.value || '',
  });
  recordEncounteredCards([
    ...combatState.value.playerDeck.map((card) => card.id),
    ...combatState.value.enemyDeck.map((card) => card.id),
  ]);
};

const recordCombatEffectDiscovery = () => {
  if (!props.trackDiscovery) return;
  recordEncounteredEffects([
    ...playerStats.value.effects.map((effect) => effect.type),
    ...enemyStats.value.effects.map((effect) => effect.type),
  ]);
};

onMounted(() => {
  recordCombatDiscoveryAtStart();
  recordCombatEffectDiscovery();
});

watch(
  () => [playerStats.value.effects, enemyStats.value.effects],
  () => {
    recordCombatEffectDiscovery();
  },
  { deep: true },
);

// 记录本回合未经过充能/银币等修正的掷骰值，供主动技重掷与点数调整同步使用。
const playerTurnRawDice = ref(1);
const enemyTurnRawDice = ref(1);

const isRolling = ref(false);
const showClashAnimation = ref(false);
const shatteringTarget = ref<'player' | 'enemy' | 'both' | null>(null);
const screenShake = ref(false);
const impactShake = ref(false);
const overlayOpen = ref<'deck' | 'discard' | null>(null);
const settingsOpen = ref(false);
const battleSpeedUp = ref(false);
const logsCollapsed = ref(true);
const pilesCollapsed = ref(true);
const battleResultBanner = ref<CombatOutcome | null>(null);
const endCombatPending = ref(false);
const enemyIntentConsumedThisTurn = ref(false);
const enemyIntentManaSpentThisTurn = ref(false);
const enemyComboPreludeResolvedTurn = ref<number | null>(null);
watch(isPlayerDeckHiddenByFantasyEmbrace, (hidden) => {
  if (hidden && overlayOpen.value === 'deck') {
    overlayOpen.value = null;
  }
});
const drawPhasePreparing = ref(false);
const activeSkillResolving = ref(false);
const combatRootEl = ref<HTMLElement | null>(null);
const effectTooltip = ref<{
  x: number;
  y: number;
  name: string;
  description: string;
  stacks: number;
  align: 'center' | 'right';
  previewCard?: CardData;
} | null>(null);

type BattleSide = 'player' | 'enemy';
type CombatOutcome = 'win' | 'lose' | 'escape';
type FloatingNumberKind = 'physical' | 'magic' | 'shield' | 'heal' | 'mana' | 'true';
type ResolvedCardAnimVariant = 'attack' | 'self' | 'fade';
type HandCardAnimationKind = 'draw' | 'discard' | 'turn_end_in_hand';
type TooltipAlign = 'center' | 'right';

interface ActiveSkillRuntimeState {
  nextAvailableTurn: number;
  usedCount: number;
  manaTaxThisTurn: number;
}

interface ActiveSkillSlotView {
  idx: number;
  skill: ActiveSkillData | null;
  cooldownRemaining: number;
  usedCount: number;
  maxUses: number | null;
  manaCost: number;
}

interface FloatingNumberEntry {
  id: number;
  side: BattleSide;
  kind?: FloatingNumberKind;
  text: string;
  colorClass: string;
  leftOffset: number;
  topOffset: number;
  duration: number;
}

interface PlayerPlayedCardVisual {
  id: number;
  card: CardData;
  entered: boolean;
}

interface ResolvedCardVisual {
  id: number;
  source: BattleSide;
  card: CardData;
  variant: ResolvedCardAnimVariant;
}

interface DicePreviewPanel {
  key: string;
  title: string;
  finalPoint: number;
  lines: string[];
}

const SPEED_SETTING_KEY = 'dungeon.combat.speed_up';
const DREAM_CONTROL_MIN = 0;
const DREAM_CONTROL_MAX = 99;
const DREAM_CONTROL_INITIAL = 50;
const speedMultiplier = computed(() => (battleSpeedUp.value ? 2 : 1));
const DEFAULT_COMBAT_FONT_FAMILY = "'Inter', sans-serif";
const combatFontFamily = computed(() => {
  const value = props.uiFontFamily?.trim();
  return value && value.length > 0 ? value : DEFAULT_COMBAT_FONT_FAMILY;
});
const combatRootStyle = computed(() => ({
  '--combat-speed-multiplier': String(speedMultiplier.value),
  '--font-ui': combatFontFamily.value,
  '--font-heading': combatFontFamily.value,
  fontFamily: combatFontFamily.value,
}));
const floatingNumbers = ref<FloatingNumberEntry[]>([]);
const pendingCardNegativeEffects = ref<string[]>([]);
const STATUS_PHEROMONE = '[信息素]';
const STATUS_LUST_MARK = '[淫纹]';
const STATUS_LUST_KNOWLEDGE = '[淫乱知识]';
const STATUS_MARKED = '[被标记]';
const STATUS_PARASITIZED = '[被寄生]';
const STATUS_BLOODLINE_MARK = '[血族印记]';
const STATUS_SCALE_POWDER = '[鳞粉]';
const STATUS_SOUL_DAMAGE = '[灵魂受损]';
const STATUS_SINKING = '[沉沦]';
const PHEROMONE_CURSE_CARD_NAME = '信息素';
const ARCHIVE_TAINT_CURSE_CARD_NAME = '档案污页';
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
const PLAYER_POISON_LETHAL_NEGATIVE_STATUS = '[催淫]';
const PLAYER_SHOCK_LETHAL_NEGATIVE_STATUS = '[神经肌肉失调]';
const PLAYER_CORROSION_LETHAL_NEGATIVE_STATUS = '[被侵蚀]';
const dreamControlPercent = ref(DREAM_CONTROL_INITIAL);
const dreamControlHelpVisible = ref(false);
const twinEnemyIntentCards = ref<[CardData | null, CardData | null]>([null, null]);
const twinEnemyConsumedSlots = ref<[boolean, boolean]>([false, false]);
const twinPlayerSelectedCards = ref<[CardData | null, CardData | null]>([null, null]);
const twinDirectComboResolving = ref(false);
const dreamControlBarStyle = computed(() => ({ opacity: isTwinBattle ? '1' : '0' }));
const showDreamControlHelp = () => {
  dreamControlHelpVisible.value = isTwinBattle;
};
const hideDreamControlHelp = () => {
  dreamControlHelpVisible.value = false;
};
let dreamControlTouchTimer: ReturnType<typeof setTimeout> | null = null;
const handleDreamControlTouchStart = () => {
  if (!isTwinBattle) return;
  if (dreamControlTouchTimer) clearTimeout(dreamControlTouchTimer);
  dreamControlTouchTimer = setTimeout(() => {
    dreamControlHelpVisible.value = true;
  }, 360);
};
const handleDreamControlTouchEnd = () => {
  if (dreamControlTouchTimer) {
    clearTimeout(dreamControlTouchTimer);
    dreamControlTouchTimer = null;
  }
  setTimeout(() => {
    dreamControlHelpVisible.value = false;
  }, 1600);
};
const queuePlayerLethalNegativeStatus = (negativeStatus: string, reason: string) => {
  const normalized = negativeStatus.trim();
  if (!normalized) return;
  if (pendingCardNegativeEffects.value.includes(normalized)) return;
  pendingCardNegativeEffects.value.push(normalized);
  log(`<span class="text-fuchsia-300">我方因${reason}获得负面状态：${normalized}</span>`);
};
const lightningAmbushFirstUseConsumed = ref<Record<BattleSide, boolean>>({
  player: false,
  enemy: false,
});
const battleCardFirstUseConsumed = ref<Record<BattleSide, Record<string, boolean>>>({
  player: {},
  enemy: {},
});
const battleCardPointBonus = ref<Record<BattleSide, Record<string, number>>>({
  player: {},
  enemy: {},
});
const alchemyPerfumePointDoubleCardIds = ref<Record<BattleSide, Record<string, boolean>>>({
  player: {},
  enemy: {},
});
const alchemyBlackComboTriggeredThisTurn = ref(false);
const alchemyCatalystActiveThisTurn = ref<Record<BattleSide, boolean>>({
  player: false,
  enemy: false,
});
const alchemyCatalystUseCount = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const alchemyGrandSynthesisBoundCard = ref<Record<BattleSide, CardData | null>>({
  player: null,
  enemy: null,
});
const alchemyGrandSynthesisPointBonusByCard = ref<Record<BattleSide, WeakMap<CardData, number>>>({
  player: new WeakMap<CardData, number>(),
  enemy: new WeakMap<CardData, number>(),
});
const alchemyGrandSynthesisPointBonusVersion = ref(0);
const alchemyPendingGrandSynthesis = ref<{ card: CardData; handIdx: number } | null>(null);
const activeHandSelectionMode = ref<null | 'purify' | 'appreciate'>(null);
const activeHandSelectionSkillIdx = ref<number | null>(null);
const pendingAlchemyGoldDelta = ref(0);
const turnPointModifier = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const blankOfBlankActiveThisTurn = ref<Record<BattleSide, boolean>>({ player: false, enemy: false });
const blankOfBlankBonusThisTurn = ref<Record<BattleSide, number>>({ player: 0, enemy: 0 });
const armorDecaySkippedThisTurn = ref<Record<BattleSide, boolean>>({
  player: false,
  enemy: false,
});
const temporaryBarrierToRemoveAtTurnEnd = ref(0);
const instantFreezeClearColdAtTurnEnd = ref(false);
const reverseBladeBleedOnHit = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const tragicomedyUsage = ref<{ above: boolean; below: boolean }>({
  above: false,
  below: false,
});
const vitalStorageHp = ref(0);
const previewPlayerDice = ref<number | null>(null);
const previewEnemyDice = ref<number | null>(null);
const playerDicePreviewLines = ref<string[]>([]);
const enemyDicePreviewLines = ref<string[]>([]);
const playerDicePreviewCardName = ref('');
const enemyDicePreviewCardName = ref('');
const playerDiceUiNoise = ref(0);
const enemyDiceUiNoise = ref(0);
const comboUiMaskBridge = ref(false);
const isUiMaskingActive = computed(() => (
  combatState.value.phase === CombatPhase.PLAYER_INPUT || comboUiMaskBridge.value
));
const isPlayerDiceObscured = computed(() => (
  isUiMaskingActive.value
  && getEffectStacks(playerStats.value, ET.BLIND_ASH) > 0
));
const isEnemyDiceObscured = computed(() => (
  isUiMaskingActive.value
  && getEffectStacks(playerStats.value, ET.PEEP_FORBIDDEN) > 0
));
const isEnemyIntentHiddenForPlayer = computed(() => (
  isUiMaskingActive.value
  && getEffectStacks(playerStats.value, ET.COGNITIVE_INTERFERENCE) > 0
));
const rerollUiNoise = () => Math.floor(Math.random() * 5) - 2;
const displayPlayerDice = computed(() => {
  const base = previewPlayerDice.value ?? combatState.value.playerBaseDice;
  if (!isPlayerDiceObscured.value) return base;
  return Math.max(0, base + playerDiceUiNoise.value);
});
const displayEnemyDice = computed(() => {
  const base = (isEnemyIntentHiddenForPlayer.value ? null : previewEnemyDice.value) ?? combatState.value.enemyBaseDice;
  if (!isEnemyDiceObscured.value) return base;
  return Math.max(0, base + enemyDiceUiNoise.value);
});
const twinEnemyDiceBonus = computed(() => (
  isTwinBattle && dreamControlPercent.value <= 39 ? 2 : 0
));
const effectiveEnemyMinDice = computed(() => Math.max(0, enemyStats.value.minDice + twinEnemyDiceBonus.value));
const effectiveEnemyMaxDice = computed(() => Math.max(effectiveEnemyMinDice.value, enemyStats.value.maxDice + twinEnemyDiceBonus.value));
const canPlayerRerollDice = computed(() => (
  playerDiceRerollCharges.value > 0
  && combatState.value.phase === CombatPhase.PLAYER_INPUT
  && !isRolling.value
  && !showClashAnimation.value
  && !endCombatPending.value
));
const playerDiceRerollHint = computed(() => {
  if (playerDiceRerollCharges.value <= 0) return '无可用重掷次数';
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return '当前阶段不可重掷';
  if (isRolling.value || showClashAnimation.value) return '结算中暂不可重掷';
  if (endCombatPending.value) return '战斗结束中不可重掷';
  return `可点击重掷（剩余${playerDiceRerollCharges.value}次）`;
});
const playerDicePreviewChanged = computed(() => (
  previewPlayerDice.value !== null && previewPlayerDice.value !== combatState.value.playerBaseDice
));
const enemyDicePreviewChanged = computed(() => (
  previewEnemyDice.value !== null && previewEnemyDice.value !== combatState.value.enemyBaseDice
));
const playerDiceNumberClass = computed(() => {
  if (isPlayerDiceObscured.value) return 'text-[#3550c9] [text-shadow:0_1px_0_rgba(255,248,220,0.55),0_0_10px_rgba(96,165,250,0.22)]';
  return playerDicePreviewChanged.value ? 'text-red-800' : '';
});
const enemyDiceNumberClass = computed(() => {
  if (isEnemyDiceObscured.value) return 'text-violet-400';
  return enemyDicePreviewChanged.value ? 'text-[#b08a2e]' : '';
});
const dicePreviewPanels = computed<DicePreviewPanel[]>(() => {
  const panels: DicePreviewPanel[] = [];
  if (previewPlayerDice.value !== null && !isPlayerDiceObscured.value && playerDicePreviewLines.value.length > 0) {
    panels.push({
      key: 'player',
      title: `我方 · ${shouldHidePlayerPreviewCardName.value ? '点数预览' : (playerDicePreviewCardName.value || '点数预览')}`, 
      finalPoint: previewPlayerDice.value,
      lines: playerDicePreviewLines.value,
    });
  }
  if (previewEnemyDice.value !== null && !isEnemyDiceObscured.value && !isEnemyIntentHiddenForPlayer.value && enemyDicePreviewLines.value.length > 0) {
    panels.push({
      key: 'enemy',
      title: `敌方 · ${enemyDicePreviewCardName.value || '点数预览'}`,
      finalPoint: previewEnemyDice.value,
      lines: enemyDicePreviewLines.value,
    });
  }
  return panels;
});
const enemyIntentMaskLevel = computed<'none' | 'partial' | 'full'>(() => (
  isEnemyIntentHiddenForPlayer.value
    ? 'full'
    : 'none'
));
type HandMaskLevel = 'none' | 'partial' | 'full' | 'void';

const playerHandMaskLevel = computed<HandMaskLevel>(() => (
  isUiMaskingActive.value
    && getEffectStacks(playerStats.value, ET.MEMORY_FOG) > 0
    ? 'partial'
    : 'none'
));
const isPlayerHandSightDeprived = computed(() => (
  isUiMaskingActive.value
  && getEffectStacks(enemyStats.value, ET.SIGHT_DEPRIVATION) > 0
));
const sightDeprivedPlayerHandCards = ref<Set<CardData>>(new Set());
const refreshPlayerSightDeprivationMask = (cards: readonly CardData[]) => {
  if (getEffectStacks(enemyStats.value, ET.SIGHT_DEPRIVATION) <= 0) {
    sightDeprivedPlayerHandCards.value = new Set();
    return;
  }
  sightDeprivedPlayerHandCards.value = new Set(cards.slice(1, 3));
};
const getPlayerHandMaskLevel = (idx: number, card?: CardData | null): HandMaskLevel => {
  if (
    isPlayerHandSightDeprived.value
    && ((card && sightDeprivedPlayerHandCards.value.has(card)) || idx >= 1 && idx <= 2)
  ) return 'void';
  return playerHandMaskLevel.value;
};
const isPlayerHandCardVoidMasked = (card: CardData | null): boolean => {
  if (!card || !isPlayerHandSightDeprived.value) return false;
  if (sightDeprivedPlayerHandCards.value.has(card)) return true;
  const idx = combatState.value.playerHand.findIndex(entry => entry === card);
  return idx >= 1 && idx <= 2;
};
const shouldHidePlayerPreviewCardName = computed(() => (
  playerHandMaskLevel.value !== 'none'
  || isPlayerHandCardVoidMasked(playerPreviewCardForPointContext.value)
));
const playerPlayedCardVisual = ref<PlayerPlayedCardVisual | null>(null);
const resolvedPlayerCardVisual = ref<ResolvedCardVisual | null>(null);
const resolvedEnemyCardVisual = ref<ResolvedCardVisual | null>(null);
const executionerPuppetPointModifier = ref<number | null>(null);
const hideIdleDiceUntilNextTurn = ref(false);
const resolvedCardVisualEntries = computed(() => (
  [resolvedPlayerCardVisual.value, resolvedEnemyCardVisual.value]
    .filter((visual): visual is ResolvedCardVisual => !!visual)
));
const showIdleDice = computed(() => (
  !showClashAnimation.value
  && !hideIdleDiceUntilNextTurn.value
  && !playerPlayedCardVisual.value
  && resolvedCardVisualEntries.value.length === 0
));
let hoverPreviewTimer: ReturnType<typeof setTimeout> | null = null;
let enemyDicePreviewTimer: ReturnType<typeof setTimeout> | null = null;
let effectTooltipLongPressTimer: ReturnType<typeof setTimeout> | null = null;
let effectTooltipAutoHideTimer: ReturnType<typeof setTimeout> | null = null;
let floatingNumberId = 0;
let handCardKeySeed = 0;
let playerPlayedCardVisualId = 0;
let resolvedCardVisualId = 0;
let animationStopToken = 0;
let endCombatSequenceToken = 0;
let enemyManaLackHintTurn = -1;
const handCardKeys = new WeakMap<CardData, string>();
const invalidCardShakeKeys = ref<Set<string>>(new Set());
const handCardAnimations = ref<Record<string, HandCardAnimationKind>>({});

// Default relic modifiers (no relics yet)
const NO_RELIC_MOD = { globalMultiplier: 1, globalAddition: 0 };
const MAGIC_DOLL_DAMAGE_CARD: CardData = {
  id: 'relic_modao_magic_doll_damage',
  name: '魔法玩偶',
  type: CardType.MAGIC,
  category: '魔导',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1, addition: 0 },
  damageLogic: { mode: 'fixed', value: 2 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '圣遗物固定伤害结算占位卡',
};
const MICRO_FLOATING_CANNON_DAMAGE_CARD: CardData = {
  id: 'relic_yanhan_micro_floating_cannon_damage',
  name: '微型悬浮炮',
  type: CardType.MAGIC,
  category: '严寒',
  rarity: '普通',
  manaCost: 0,
  calculation: { multiplier: 1, addition: 0 },
  damageLogic: { mode: 'fixed', value: 1 },
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: '圣遗物独立伤害结算占位卡',
};
const activePlayerRelics = resolveRelicMap(props.playerRelics);
const playerDiceRerollCharges = ref(0);
const relicRuntimeState = reactive<Record<string, Record<string, unknown>>>({});
const playerDamageTakenThisTurn = ref(0);
const directDamageTakenThisTurn = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const damageHitTakenThisTurn = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const coldRetaliationPerDamageThisTurn = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const damageHitTakenThisCombat = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const freezePumpTriggersThisTurn = ref(0);
const freezeFlowCoreTriggeredThisTurn = ref(false);
const sealCircuitPendingMana = ref(0);
const microFloatingCannonTriggeredThisTurn = ref(false);
const modaoStabilizerTriggersThisTurn = ref(0);
const bloodpoolSkinMarkTriggersThisTurn = ref(0);
const bloodpoolFirstBleedFeastTriggered = ref(false);
const bloodpoolCriticalReboundTriggered = ref(false);
const flowingLightRingConsumed = ref(false);
const nonLivingConversionGuard = new Set<string>();
const nextMagicDoubleCast = ref<Record<'player' | 'enemy', number>>({
  player: 0,
  enemy: 0,
});
const nextMagicDoubleCastFreeMana = ref<Record<'player' | 'enemy', number>>({
  player: 0,
  enemy: 0,
});
const nextTurnMagicCostFree = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const lockedManaCostByCard = new WeakMap<CardData, number>();
const nextTurnMagicPointBonus = ref<Record<BattleSide, { turn: number; amount: number }>>({
  player: { turn: 0, amount: 0 },
  enemy: { turn: 0, amount: 0 },
});
const currentTurnMagicReflect = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const reflectionActiveThisTurn = ref<Record<BattleSide, boolean>>({
  player: false,
  enemy: false,
});
const temporaryDamageBoostToRemoveAtTurnEnd = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});
const currentTurnManaSnapshot = ref<Record<BattleSide, number>>({
  player: Math.max(0, Math.floor(playerStats.value.mp)),
  enemy: Math.max(0, Math.floor(enemyStats.value.mp)),
});
const previousTurnManaSnapshot = ref<Record<BattleSide, number>>({
  player: Math.max(0, Math.floor(playerStats.value.mp)),
  enemy: Math.max(0, Math.floor(enemyStats.value.mp)),
});
const playerPlayedPhysicalOrMagicThisTurn = ref(false);
const playerPreviewCardForPointContext = ref<CardData | null>(null);
const previousPlayerLastCardType = ref<CardType | null>(null);
const previousPlayerFinalPoint = ref<number | null>(null);

const getEntityBySide = (side: RelicSide): EntityStats => (side === 'player' ? playerStats.value : enemyStats.value);

const getRelicRuntimeState = (relicId: string) => {
  if (!relicRuntimeState[relicId]) {
    relicRuntimeState[relicId] = {};
  }
  return relicRuntimeState[relicId]!;
};

const hasActiveRelic = (id: string) => activePlayerRelics.some((entry) => entry.relic.id === id && entry.count > 0);
const getActiveRelicCount = (id: string) => (
  activePlayerRelics.find((entry) => entry.relic.id === id)?.count ?? 0
);

const changeRerollCharges = (side: RelicSide, delta: number) => {
  if (side !== 'player') return;
  playerDiceRerollCharges.value = Math.max(0, playerDiceRerollCharges.value + Math.floor(delta));
};

const consumeRerollCharge = (side: RelicSide, amount: number = 1): boolean => {
  if (side !== 'player') return false;
  const need = Math.max(1, Math.floor(amount));
  if (playerDiceRerollCharges.value < need) return false;
  playerDiceRerollCharges.value -= need;
  return true;
};

const getRerollCharges = (side: RelicSide): number => {
  if (side !== 'player') return 0;
  return playerDiceRerollCharges.value;
};

const forEachPlayerRelic = (
  callback: (entry: ResolvedRelicEntry, relic: RelicData, state: Record<string, unknown>) => void,
) => {
  for (const entry of activePlayerRelics) {
    callback(entry, entry.relic, getRelicRuntimeState(entry.relic.id));
  }
};

const logRelicMessage = (message: string) => {
  log(`<span class="text-amber-300 text-[9px]">[圣遗物] ${message}</span>`);
};

const addPlayerDamageTakenThisTurn = (amount: number) => {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0) return;
  playerDamageTakenThisTurn.value += value;
};

const addDirectDamageTakenThisTurn = (side: BattleSide, amount: number) => {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0) return;
  directDamageTakenThisTurn.value[side] += value;
};

const hasTakenDirectDamageThisTurn = (side: BattleSide): boolean => (
  Math.max(0, Math.floor(directDamageTakenThisTurn.value[side] ?? 0)) > 0
);

const clampDreamControl = (value: number): number => (
  Math.max(DREAM_CONTROL_MIN, Math.min(DREAM_CONTROL_MAX, Math.round(value * 2) / 2))
);

const setDreamControl = (next: number, reason?: string) => {
  const normalized = clampDreamControl(next);
  const previous = dreamControlPercent.value;
  dreamControlPercent.value = normalized;
  if (reason && normalized !== previous) {
    log(`<span class="text-fuchsia-300">[梦境控制权] ${reason}：${previous}% → ${normalized}%</span>`);
  }
};

const isTwinEntity = (entity: EntityStats): boolean => getEffectStacks(entity, ET.TWINS) > 0;

const updateDreamControlFromHit = (
  sourceSide: BattleSide | undefined,
  targetSide: BattleSide,
  kind: 'direct' | 'status',
  actualDamage: number,
) => {
  if (!isTwinBattle) return;
  if (actualDamage <= 0 || !sourceSide) return;
  if (targetSide === 'enemy' && sourceSide === 'player') {
    const delta = kind === 'direct' ? 3 : 0.5;
    setDreamControl(dreamControlPercent.value + delta, kind === 'direct' ? '玩家造成直接伤害' : '玩家造成负面状态伤害');
  } else if (targetSide === 'player' && sourceSide === 'enemy' && kind === 'direct') {
    setDreamControl(dreamControlPercent.value - 10, '双子造成直接伤害');
  }
};

const addDamageHitTakenThisCombat = (side: BattleSide, actualDamage: number) => {
  const value = Math.max(0, Math.floor(actualDamage));
  if (value <= 0) return;
  const before = Math.max(0, Math.floor(damageHitTakenThisCombat.value[side] ?? 0));
  damageHitTakenThisCombat.value[side] += 1;
  damageHitTakenThisTurn.value[side] += 1;
  if (side === 'player') {
    const kidneyMarkCount = getActiveRelicCount('bloodpool_kidney_mark');
    if (kidneyMarkCount > 0) {
      const beforeTriggers = Math.floor(before / 3);
      const afterTriggers = Math.floor(damageHitTakenThisCombat.value[side] / 3);
      const triggerCount = Math.max(0, afterTriggers - beforeTriggers);
      if (triggerCount > 0) {
        const stacks = triggerCount * kidneyMarkCount;
        if (applyStatusEffectWithRelics('player', ET.DAMAGE_BOOST, stacks, { source: 'relic:bloodpool_kidney_mark' })) {
          logRelicMessage(`[肾印记] 已受伤 ${damageHitTakenThisCombat.value[side]} 次，获得 ${stacks} 层增伤。`);
        }
      }
    }
  }
};

const getDamageHitTakenThisCombat = (side: BattleSide): number => (
  Math.max(0, Math.floor(damageHitTakenThisCombat.value[side] ?? 0))
);

const getDamageHitTakenThisTurn = (side: BattleSide): number => (
  Math.max(0, Math.floor(damageHitTakenThisTurn.value[side] ?? 0))
);

const triggerColdRetaliationOnDamageTaken = (side: BattleSide, reason: string) => {
  const stacks = Math.max(0, Math.floor(coldRetaliationPerDamageThisTurn.value[side] ?? 0));
  if (stacks <= 0) return;
  const targetSide = oppositeSide(side);
  const label = side === 'player' ? '我方' : '敌方';
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  if (applyStatusEffectWithRelics(targetSide, ET.COLD, stacks, { source: 'enemy_grace_tentacle_forgiving_embrace' })) {
    log(`<span class="text-sky-300">${label}[宽恕之拥] ${reason}，为${targetLabel}施加 ${stacks} 层寒冷。</span>`);
  }
};

const applyTwinDreamControlThresholds = () => {
  if (!isTwinBattle || enemyStats.value.hp <= 0 || !isTwinEntity(enemyStats.value)) return;
  if (dreamControlPercent.value < 61) return;

  const weakenMissing = Math.max(0, 3 - getEffectStacks(enemyStats.value, ET.WEAKEN));
  if (weakenMissing > 0 && applyStatusEffectWithRelics('enemy', ET.WEAKEN, weakenMissing, { source: 'effect:dream_control' })) {
    log('<span class="text-fuchsia-300">[梦境控制权] 梦魔双子的虚弱至少维持在 3 层。</span>');
  }

  const vulnerableMissing = dreamControlPercent.value >= 76
    ? Math.max(0, 5 - getEffectStacks(enemyStats.value, ET.VULNERABLE))
    : 0;
  if (vulnerableMissing > 0 && applyStatusEffectWithRelics('enemy', ET.VULNERABLE, vulnerableMissing, { source: 'effect:dream_control' })) {
    log('<span class="text-fuchsia-300">[梦境控制权] 梦魔双子的敏感至少维持在 5 层。</span>');
  }
};

const applyPlayerSkinMarkDamageReduction = (rawDamage: number, reason: string): number => {
  const damage = Math.max(0, Math.floor(rawDamage));
  if (damage <= 0) return 0;
  const markCount = getActiveRelicCount('bloodpool_skin_mark');
  if (markCount <= 0) return damage;
  if (bloodpoolSkinMarkTriggersThisTurn.value >= 2) return damage;
  const reduced = Math.min(damage, markCount);
  if (reduced <= 0) return damage;
  bloodpoolSkinMarkTriggersThisTurn.value += 1;
  logRelicMessage(`[皮肤印记] ${reason}伤害 -${reduced}（本回合 ${bloodpoolSkinMarkTriggersThisTurn.value}/2）。`);
  return damage - reduced;
};

const applyPlayerHemostaticValveDamageCap = (rawDamage: number, reason: string): number => {
  const damage = Math.max(0, Math.floor(rawDamage));
  if (damage <= 0) return 0;
  if (getActiveRelicCount('bloodpool_hemostatic_valve') <= 0) return damage;
  const capped = Math.min(10, damage);
  if (capped < damage) {
    logRelicMessage(`[凝血限流阀] ${reason}伤害由 ${damage} 限制为 ${capped}。`);
  }
  return capped;
};

const applyPlayerLiverMarkDamageReduction = (rawDamage: number, reason: string): number => {
  const damage = Math.max(0, Math.floor(rawDamage));
  if (damage <= 0) return 0;
  const liverMarkCount = getActiveRelicCount('bloodpool_liver_mark');
  if (liverMarkCount <= 0) return damage;
  const lostHp = Math.max(0, Math.floor(playerStats.value.maxHp - playerStats.value.hp));
  const reduced = Math.floor(lostHp / 20) * liverMarkCount;
  if (reduced <= 0) return damage;
  const nextDamage = Math.max(0, damage - reduced);
  if (nextDamage < damage) {
    logRelicMessage(`[肝印记] ${reason}按已损失生命 ${lostHp}，伤害 -${damage - nextDamage}。`);
  }
  return nextDamage;
};

const shouldSkipHeartMarkTrigger = (reason: string): boolean => (
  reason.includes('中毒') || reason.includes('侵蚀')
);

const triggerBloodpoolHeartMarkByDamage = (
  side: BattleSide,
  actualDamage: number,
  reason: string,
  options?: { skipHeartMark?: boolean; wasLethal?: boolean },
) => {
  if (side !== 'player') return;
  const damage = Math.max(0, Math.floor(actualDamage));
  if (damage <= 0) return;
  if (options?.skipHeartMark) return;
  if (options?.wasLethal) return;
  if (shouldSkipHeartMarkTrigger(reason)) return;

  const heartMarkCount = getActiveRelicCount('bloodpool_heart_mark');
  if (heartMarkCount <= 0) return;

  const state = getRelicRuntimeState('bloodpool_heart_mark');
  const triggered = Math.max(0, Math.floor(Number(state['triggeredThisTurn'] ?? 0)));
  if (triggered >= 2) return;

  state['triggeredThisTurn'] = triggered + 1;
  const { healed } = healForSide('player', heartMarkCount);
  logRelicMessage(`[心脏印记] ${reason}受伤触发，回复 ${healed} 点生命（本回合 ${triggered + 1}/2）。`);
};

const oppositeSide = (side: BattleSide): BattleSide => (side === 'player' ? 'enemy' : 'player');

const shouldDisableReviveForSide = (targetSide: BattleSide): boolean => {
  const opponent = getEntityBySide(oppositeSide(targetSide));
  return getEffectStacks(opponent, ET.CONTRACT_CURSE) > 0;
};

const triggerSwarmReviveIfNeeded = (
  target: EntityStats,
  explicitTargetSide?: BattleSide,
) => {
  const targetSide = explicitTargetSide
    ?? (target === playerStats.value
      ? 'player'
      : target === enemyStats.value
        ? 'enemy'
        : undefined);
  return triggerSwarmReviveIfNeededInAlgorithm(target, {
    disableRevive: targetSide ? shouldDisableReviveForSide(targetSide) : false,
  });
};

const triggerBloodlineLifesteal = (
  sourceSide: BattleSide | undefined,
  actualDamage: number,
  reason: string,
) => {
  if (!sourceSide) return;
  const value = Math.max(0, Math.floor(actualDamage));
  if (value <= 0) return;
  const sourceStats = getEntityBySide(sourceSide);
  if (getEffectStacks(sourceStats, ET.BLOODLINE) <= 0) return;
  const healValue = Math.max(0, Math.floor(value * 2));
  if (healValue <= 0) return;
  const sourceLabel = sourceSide === 'player' ? '我方' : '敌方';
  const { healed } = healForSide(sourceSide, healValue, {
    sourceSide,
    reason: `血族吸血（${reason}）`,
  });
  log(`<span class="text-rose-300">${sourceLabel}[血族] ${reason}触发，回复 ${healed} 点生命。</span>`);
};

const applyDamageToSideWithRelics = (
  side: BattleSide,
  target: EntityStats,
  damage: number,
  isTrueDamage: boolean,
  reason: string,
  options?: {
    skipHeartMark?: boolean;
    sourceSide?: BattleSide;
    isDirectDamage?: boolean;
    skipCoDamage?: boolean;
    card?: CardData;
    dreamControlKind?: 'direct' | 'status';
  },
) => {
  const damageOptions = options ?? {};
  const incoming = Math.max(0, Math.floor(damage));
  const twinLowControlTrueDamage =
    side === 'player'
    && damageOptions.sourceSide === 'enemy'
    && isTwinBattle
    && dreamControlPercent.value <= 24;
  let effectiveTrueDamage = isTrueDamage || twinLowControlTrueDamage;
  let effectiveIncoming = incoming;
  if (damageOptions.isDirectDamage && damageOptions.card?.swarmAttack && isTwinEntity(target)) {
    effectiveIncoming = Math.max(0, Math.floor(effectiveIncoming * 2));
  }
  let adjusted = side === 'player'
    ? applyPlayerHemostaticValveDamageCap(effectiveIncoming, reason)
    : effectiveIncoming;
  if (side === 'player') {
    adjusted = applyPlayerLiverMarkDamageReduction(adjusted, reason);
  }
  if (
    damageOptions.isDirectDamage
    && damageOptions.card?.type === CardType.MAGIC
    && hasCurrentTurnMagicReflect(side)
  ) {
    const sourceSide = damageOptions.sourceSide;
    const sourceLabel = sourceSide === 'player' ? '我方' : sourceSide === 'enemy' ? '敌方' : '对手';
    const targetLabel = side === 'player' ? '我方' : '敌方';
    let reflectedDamage = adjusted;
    if (sourceSide === 'player') {
      reflectedDamage = applyPlayerSkinMarkDamageReduction(reflectedDamage, '棱镜魔法反弹');
    }
    log(`<span class="text-cyan-300">${targetLabel}[棱镜魔法] 免疫了来自${sourceLabel}【${damageOptions.card.name}】的法术伤害</span>`);
    if (sourceSide && reflectedDamage > 0) {
      const reflectedSide = oppositeSide(side);
      const reflectedTarget = getEntityBySide(reflectedSide);
      const { actualDamage: actualReflectedDamage, logs: reflectedLogs } = applyDamageToSideWithRelics(
        reflectedSide,
        reflectedTarget,
        reflectedDamage,
        effectiveTrueDamage,
        '棱镜魔法反弹',
        { sourceSide: side, isDirectDamage: true, card: damageOptions.card },
      );
      if (actualReflectedDamage > 0) {
        pushFloatingNumber(reflectedSide, actualReflectedDamage, effectiveTrueDamage ? 'true' : 'magic', '-');
      }
      log(`<span class="text-cyan-300">${targetLabel}[棱镜魔法] 反弹了 ${actualReflectedDamage} 点伤害给${sourceLabel}</span>`);
      for (const reflectedLog of reflectedLogs) {
        const normalized = reflectedLog.startsWith('受到') ? `${sourceLabel}${reflectedLog}` : reflectedLog;
        log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
      }
      const reviveResult = triggerSwarmReviveIfNeeded(reflectedTarget, reflectedSide);
      for (const reviveLog of reviveResult.logs) {
        log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
      }
    }
    return { actualDamage: 0, logs: [] };
  }
  if (damageOptions.isDirectDamage) {
    const directDamageResult = triggerPlayerRelicBeforeDirectDamageHooks(
      damageOptions.sourceSide,
      side,
      damageOptions.card,
      adjusted,
      effectiveTrueDamage,
      reason,
    );
    adjusted = directDamageResult.damage;
    effectiveTrueDamage = directDamageResult.isTrueDamage;
  }
  if (damageOptions.isDirectDamage) {
    const reflectionStacks = getEffectStacks(target, ET.REFLECTION);
    if (reflectionStacks > 0 || reflectionActiveThisTurn.value[side]) {
      if (!reflectionActiveThisTurn.value[side] && reflectionStacks > 0) {
        reduceEffectStacks(target, ET.REFLECTION, 1);
        reflectionActiveThisTurn.value[side] = true;
        const label = side === 'player' ? '我方' : '敌方';
        log(`<span class="text-violet-300">${label}[倒影] 被直接伤害触发，本回合受到的直接伤害翻倍并转化为真实伤害。</span>`);
      }
      adjusted = Math.max(0, Math.floor(adjusted * 2));
      effectiveTrueDamage = true;
    }
  }
  const hpBeforeDamage = Math.max(0, Math.floor(target.hp));
  const result = applyDamageToEntity(target, adjusted, effectiveTrueDamage, {
    disableRevive: shouldDisableReviveForSide(side),
    swarmAttack: !!damageOptions.card?.swarmAttack,
  });
  addDamageHitTakenThisCombat(side, result.actualDamage);
  if (damageOptions.isDirectDamage) {
    addDirectDamageTakenThisTurn(side, result.actualDamage);
  }
  const wasLethalDamage = hpBeforeDamage > 0 && result.actualDamage >= hpBeforeDamage;
  triggerBloodpoolHeartMarkByDamage(side, result.actualDamage, reason, {
    ...damageOptions,
    wasLethal: wasLethalDamage,
  });
  if (damageOptions.isDirectDamage) {
    triggerBloodlineLifesteal(damageOptions.sourceSide, result.actualDamage, reason);
  }
  if (result.actualDamage > 0) {
    triggerColdRetaliationOnDamageTaken(side, '受到伤害触发');
    const dreamControlKind = damageOptions.dreamControlKind ?? (damageOptions.isDirectDamage ? 'direct' : undefined);
    if (dreamControlKind) {
      updateDreamControlFromHit(damageOptions.sourceSide, side, dreamControlKind, result.actualDamage);
    }
    accumulateVoidTaintTurnDamage(side, result.actualDamage);
    const maxHpThreshold = Number.POSITIVE_INFINITY;
    if (maxHpThreshold > 0 && result.actualDamage > maxHpThreshold) {
      reduceTargetMaxDiceByVoidTaint(side, oppositeSide(side), '自己单次受到了超过10%最大生命值的伤害');
    }
  }
  if (!effectiveTrueDamage && result.actualDamage > 0 && !damageOptions.skipCoDamage) {
    const coDamageStacks = getEffectStacks(target, ET.CO_DAMAGE);
    if (coDamageStacks > 0) {
      const reflectedSide = oppositeSide(side);
      const reflectedTarget = getEntityBySide(reflectedSide);
      let reflectedDamage = result.actualDamage;
      if (reflectedSide === 'player') {
        reflectedDamage = applyPlayerSkinMarkDamageReduction(reflectedDamage, '共损返还');
      }
      if (reflectedDamage > 0) {
        const { actualDamage: actualReflectedDamage, logs: reflectedLogs } = applyDamageToSideWithRelics(
          reflectedSide,
          reflectedTarget,
          reflectedDamage,
          false,
          '共损返还',
          { skipCoDamage: true },
        );
        if (actualReflectedDamage > 0) {
          pushFloatingNumber(reflectedSide, actualReflectedDamage, 'physical', '-');
        }
        const sourceLabel = side === 'player' ? '我方' : '敌方';
        const targetLabel = reflectedSide === 'player' ? '我方' : '敌方';
        log(`<span class="text-cyan-300">${sourceLabel}[共损] 返还了 ${actualReflectedDamage} 点伤害给${targetLabel}</span>`);
        for (const reflectedLog of reflectedLogs) {
          const normalized = reflectedLog.startsWith('受到') ? `${targetLabel}${reflectedLog}` : reflectedLog;
          log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
        }
      }
    }
  }
  return result;
};

const convertDamageByMirrorRegeneration = (target: EntityStats, incoming: number): number | null => {
  const mirrorRegeneration = findEffect(target, ET.MIRROR_REGENERATION);
  if (!mirrorRegeneration || mirrorRegeneration.stacks <= 0) return null;
  if (Math.floor(mirrorRegeneration.runtimeCounter ?? 0) <= 0) return null;
  const convertedDamage = Math.max(0, Math.floor(incoming));
  if (convertedDamage <= 0) return 0;
  const maxHpBefore = target.maxHp;
  applyEffect(target, ET.MAX_HP_REDUCTION, convertedDamage, { source: 'effect:mirror_regeneration' });
  const actualMaxHpLoss = Math.max(0, maxHpBefore - target.maxHp);
  if (target.maxHp <= 0) {
    target.hp = 0;
  } else {
    target.hp = Math.max(1, Math.min(target.hp, target.maxHp));
  }
  return actualMaxHpLoss;
};

const applyDirectHpLossWithRelics = (
  side: BattleSide,
  target: EntityStats,
  damage: number,
  reason: string,
  options?: { skipHeartMark?: boolean; sourceSide?: BattleSide; isDirectDamage?: boolean; dreamControlKind?: 'direct' | 'status' },
): number => {
  const damageOptions = options ?? {};
  const incoming = Math.max(0, Math.floor(damage));
  if (incoming <= 0) return 0;
  const adjusted = side === 'player'
    ? applyPlayerLiverMarkDamageReduction(applyPlayerHemostaticValveDamageCap(incoming, reason), reason)
    : incoming;
  const mirrorConverted = convertDamageByMirrorRegeneration(target, adjusted);
  if (mirrorConverted !== null) {
    const label = side === 'player' ? '我方' : '敌方';
    log(`<span class="text-violet-300">${label}[镜面再生] 免疫 ${adjusted} 点伤害，并转化为 ${mirrorConverted} 点生命上限削减。</span>`);
    if (target.maxHp <= 0) {
      log(`<span class="text-violet-300">${label}[镜面再生] 生命上限归零，镜像崩解。</span>`);
    }
    return 0;
  }
  const before = target.hp;
  target.hp = Math.max(0, target.hp - adjusted);
  const actualDamage = Math.max(0, before - target.hp);
  addDamageHitTakenThisCombat(side, actualDamage);
  if (damageOptions.isDirectDamage) {
    addDirectDamageTakenThisTurn(side, actualDamage);
  }
  const wasLethalDamage = before > 0 && actualDamage >= before;
  triggerBloodpoolHeartMarkByDamage(side, actualDamage, reason, {
    ...damageOptions,
    wasLethal: wasLethalDamage,
  });
  if (damageOptions.isDirectDamage) {
    triggerBloodlineLifesteal(damageOptions.sourceSide, actualDamage, reason);
  }
  if (actualDamage > 0) {
    triggerColdRetaliationOnDamageTaken(side, '受到生命损失触发');
    const dreamControlKind = damageOptions.dreamControlKind ?? (damageOptions.isDirectDamage ? 'direct' : undefined);
    if (dreamControlKind) {
      updateDreamControlFromHit(damageOptions.sourceSide, side, dreamControlKind, actualDamage);
    }
    accumulateVoidTaintTurnDamage(side, actualDamage);
    const maxHpThreshold = Number.POSITIVE_INFINITY;
    if (maxHpThreshold > 0 && actualDamage > maxHpThreshold) {
      reduceTargetMaxDiceByVoidTaint(side, oppositeSide(side), '自己单次受到了超过10%最大生命值的伤害');
    }
  }
  return actualDamage;
};

const triggerStigmataDamageForSide = (side: BattleSide, reason: string): number => {
  const target = getEntityBySide(side);
  const stacks = Math.max(0, getEffectStacks(target, ET.STIGMATA));
  if (stacks <= 0 || target.hp <= 0) return 0;
  const label = side === 'player' ? '我方' : '敌方';
  const { actualDamage, logs: damageLogs } = applyDamageToSideWithRelics(
    side,
    target,
    stacks,
    true,
    '圣痕',
  );
  if (actualDamage > 0) {
    pushFloatingNumber(side, actualDamage, 'true', '-');
  }
  log(`<span class="text-amber-300">${label}[圣痕] ${reason}，受到 ${actualDamage} 点真实伤害。</span>`);
  for (const damageLog of damageLogs) {
    const normalized = damageLog.startsWith('受到') ? `${label}${damageLog}` : damageLog;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
  const reviveResult = triggerSwarmReviveIfNeeded(target, side);
  for (const reviveLog of reviveResult.logs) {
    log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
  }
  return actualDamage;
};

const triggerStigmataOnCardPlay = (side: BattleSide, card: CardData) => {
  if (card.id === PASS_CARD.id || card.type === CardType.ACTIVE) return;
  triggerStigmataDamageForSide(side, `打出【${card.name}】触发`);
};

const tickStigmataSkipDecay = (side: BattleSide) => {
  const target = getEntityBySide(side);
  const effect = findEffect(target, ET.STIGMATA);
  if (!effect || effect.stacks <= 0) return;
  effect.runtimeCounter = Math.max(0, Math.floor(effect.runtimeCounter ?? 0)) + 1;
  const label = side === 'player' ? '我方' : '敌方';
  if (effect.runtimeCounter < 2) {
    log(`<span class="text-amber-300">${label}[圣痕] 跳过回合计数 ${effect.runtimeCounter}/2。</span>`);
    return;
  }
  effect.runtimeCounter -= 2;
  const beforeStacks = effect.stacks;
  reduceEffectStacks(target, ET.STIGMATA, 1);
  const reduced = Math.min(1, beforeStacks);
  if (reduced > 0) {
    log(`<span class="text-amber-300">${label}[圣痕] 战斗中累计跳过2次回合，圣痕 -${reduced}。</span>`);
  }
};

const handlePlayerArmorGainFromSingleEvent = (amount: number, source: string) => {
  const gained = Math.max(0, Math.floor(amount));
  if (gained <= 0) return;
  const relicCount = getActiveRelicCount('yanhan_freeze_flow_core');
  if (relicCount <= 0) return;
  if (freezeFlowCoreTriggeredThisTurn.value) return;
  if (gained < 5) return;
  const restored = restoreManaForSide('player', relicCount);
  if (restored <= 0) return;
  freezeFlowCoreTriggeredThisTurn.value = true;
  logRelicMessage(`[冻流泵芯] ${source}单次获得护甲≥5，额外回复 ${restored} 点魔力。`);
};

const applyCorrodeOnArmorGain = (side: RelicSide, amount: number, source: string) => {
  const gained = Math.max(0, Math.floor(amount));
  if (gained <= 0) return;
  const target = getEntityBySide(side);
  if (getEffectStacks(target, ET.CORRODE) <= 0) return;
  const applied = applyEffect(target, ET.POISON_AMOUNT, gained, { source: 'effect:corrode' });
  if (!applied) return;
  const label = side === 'player' ? '我方' : '敌方';
  log(`<span class="text-lime-300">${label}[腐蚀] ${source}获得 ${gained} 点护甲，获得 ${gained} 点中毒量。</span>`);
};

const addArmorForSide = (side: RelicSide, amount: number): number => {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0) return 0;
  const target = getEntityBySide(side);
  const added = applyEffect(target, ET.ARMOR, value, { source: 'relic' }) ? value : 0;
  if (added > 0) {
    applyCorrodeOnArmorGain(side, added, '圣遗物');
    pushFloatingNumber(side, added, 'shield', '+');
    if (side === 'player') {
      handlePlayerArmorGainFromSingleEvent(added, '圣遗物');
    }
  }
  return added;
};

const tryTriggerModaoStabilizer = (side: RelicSide, actualDelta: number, reason: string) => {
  if (side !== 'player') return;
  if (actualDelta < 3) return;
  const stabilizerCount = getActiveRelicCount('modao_stabilizer_pin');
  if (stabilizerCount <= 0) return;
  if (modaoStabilizerTriggersThisTurn.value >= 2) return;
  const gained = addArmorForSide('player', stabilizerCount);
  if (gained <= 0) return;
  modaoStabilizerTriggersThisTurn.value += 1;
  logRelicMessage(`[稳压回针] ${reason}单次回蓝 ${actualDelta}，获得 ${gained} 点护甲（本回合 ${modaoStabilizerTriggersThisTurn.value}/2）。`);
};

const restoreManaForSide = (side: RelicSide, amount: number): number => {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0) return 0;
  const target = getEntityBySide(side);
  const before = target.mp;
  target.mp = Math.max(0, target.mp + value);
  const delta = target.mp - before;
  if (delta > 0) {
    pushFloatingNumber(side, delta, 'mana', '+');
    tryTriggerModaoStabilizer(side, delta, '回合/效果触发，');
  }
  return delta;
};

const healForSide = (
  side: RelicSide,
  amount: number,
  options?: { overflowToArmor?: boolean; sourceSide?: RelicSide; reason?: string },
): { healed: number; overflow: number; convertedDamage: number } => {
  const baseValue = Math.max(0, Math.floor(amount));
  if (baseValue <= 0) return { healed: 0, overflow: 0, convertedDamage: 0 };

  let value = baseValue;
  if (side === 'player') {
    const healAmpCount = getActiveRelicCount('bloodpool_crimson_plasma');
    if (healAmpCount > 0) {
      value = Math.max(0, Math.floor(value * (1 + 0.25 * healAmpCount)));
    }
    const lifePendantCount = getActiveRelicCount('basic_life_pendant');
    if (lifePendantCount > 0) {
      value += lifePendantCount;
    }
  }
  const target = getEntityBySide(side);
  if (isTwinEntity(target)) {
    value = Math.max(0, Math.floor(value * 2));
  }
  if (value <= 0) return { healed: 0, overflow: 0, convertedDamage: 0 };
  const sourceSide = options?.sourceSide ?? side;
  if (sourceSide !== side && getEffectStacks(target, ET.BLOODLINE) > 0) {
    const convertedDamage = applyDirectHpLossWithRelics(
      side,
      target,
      value,
      options?.reason ?? '血族反噬治疗',
      { sourceSide },
    );
    if (convertedDamage > 0) {
      pushFloatingNumber(side, convertedDamage, 'true', '-');
    }
    const sideLabel = side === 'player' ? '我方' : '敌方';
    const sourceLabel = sourceSide === 'player' ? '我方' : '敌方';
    log(`<span class="text-rose-300">${sideLabel}[血族] 来自${sourceLabel}的治疗被反噬，受到 ${convertedDamage} 点真实伤害。</span>`);
    const reviveResult = triggerSwarmReviveIfNeeded(target, side);
    for (const reviveLog of reviveResult.logs) {
      log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
    }
    return { healed: 0, overflow: 0, convertedDamage };
  }

  const before = target.hp;
  target.hp = Math.max(0, Math.min(target.maxHp, target.hp + value));
  const healed = target.hp - before;
  const overflowRaw = Math.max(0, value - healed);
  if (healed > 0) {
    pushFloatingNumber(side, healed, 'heal', '+');
  }
  if (options?.overflowToArmor && overflowRaw > 0) {
    addArmorForSide(side, overflowRaw);
  }
  if (side === 'player' && overflowRaw > 0) {
    const fatMarkCount = getActiveRelicCount('bloodpool_fat_mark');
    if (fatMarkCount > 0) {
      const tempMaxHpGain = Math.max(0, Math.floor(overflowRaw * 0.5 * fatMarkCount));
      if (tempMaxHpGain > 0 && applyStatusEffectWithRelics('player', ET.TEMP_MAX_HP, tempMaxHpGain, { source: 'relic:bloodpool_fat_mark' })) {
        logRelicMessage(`[脂肪印记] 溢出治疗 ${overflowRaw} 点，转化为 ${tempMaxHpGain} 点临时生命上限。`);
      }
    }
  }
  if (sourceSide !== side && (healed > 0 || value > 0)) {
    reduceTargetMaxDiceByVoidTaint(sourceSide, side, '对方收到了自己的治疗');
  }
  if (side === 'player' && healed > 0) {
    const reflowCount = getActiveRelicCount('bloodpool_reflow_mark');
    if (reflowCount > 0) {
      const state = getRelicRuntimeState('bloodpool_reflow_mark');
      const current = Math.max(0, Math.floor(Number(state['healTriggersThisTurn'] ?? 0)));
      const cap = Math.max(0, 2 * reflowCount);
      if (current < cap) {
        const next = Math.min(cap, current + 1);
        state['healTriggersThisTurn'] = next;
      }
    }
  }
  return { healed, overflow: overflowRaw, convertedDamage: 0 };
};

const reduceTargetMaxDiceByVoidTaint = (
  sourceSide: BattleSide,
  targetSide: BattleSide,
  reason: string,
) => {
  if (sourceSide === targetSide) return 0;
  const sourceEntity = getEntityBySide(sourceSide);
  const targetEntity = getEntityBySide(targetSide);
  const stacks = Math.max(0, getEffectStacks(sourceEntity, ET.VOID_TAINT));
  if (stacks <= 0) return 0;
  const beforeMaxDice = targetEntity.maxDice;
  targetEntity.maxDice = Math.max(targetEntity.minDice, targetEntity.maxDice - stacks);
  const reduced = Math.max(0, beforeMaxDice - targetEntity.maxDice);
  if (reduced > 0) {
    const sourceLabel = sourceSide === 'player' ? '我方' : '敌方';
    const targetLabel = targetSide === 'player' ? '我方' : '敌方';
    log(`<span class="text-violet-300">${sourceLabel}[虚空浸染] ${reason}，使${targetLabel}最大骰子 ${targetEntity.minDice}~${beforeMaxDice} → ${targetEntity.minDice}~${targetEntity.maxDice}</span>`);
  }
  return reduced;
};

const accumulateVoidTaintTurnDamage = (
  damagedSide: BattleSide,
  actualDamage: number,
) => {
  if (actualDamage <= 0) return 0;
  const damagedEntity = getEntityBySide(damagedSide);
  const voidTaintEffect = findEffect(damagedEntity, ET.VOID_TAINT);
  if (!voidTaintEffect || damagedEntity.maxHp <= 0) return 0;

  const threshold = Math.max(1, Math.max(1, damagedEntity.hp) * 0.2);
  if (threshold <= 0) return 0;

  const previousDamage = Math.max(0, Math.floor(voidTaintEffect.runtimeCounter ?? 0));
  const nextDamage = previousDamage + actualDamage;
  voidTaintEffect.runtimeCounter = nextDamage;

  const previousTriggers = Math.floor(previousDamage / threshold);
  const nextTriggers = Math.floor(nextDamage / threshold);
  const triggerCount = Math.max(0, nextTriggers - previousTriggers);
  for (let i = 0; i < triggerCount; i += 1) {
    reduceTargetMaxDiceByVoidTaint(
      damagedSide,
      oppositeSide(damagedSide),
      '自己单回合累计受到了超过20%当前生命值的伤害',
    );
  }
  return triggerCount;
};

const transferRandomBuffStack = (fromSide: BattleSide, toSide: BattleSide, cardName: string) => {
  const fromEntity = getEntityBySide(fromSide);
  const transferableBuffs = fromEntity.effects.filter((effect) => (
    effect.stacks > 0
    && effect.type !== ET.MANA_SPRING
    && EFFECT_REGISTRY[effect.type]?.polarity === 'buff'
  ));
  if (transferableBuffs.length <= 0) {
    return false;
  }

  const picked = transferableBuffs[Math.floor(Math.random() * transferableBuffs.length)]!;
  reduceEffectStacks(fromEntity, picked.type, 1);
  applyStatusEffectWithRelics(toSide, picked.type, 1, { source: `transfer:${cardName}` });
  const effectName = EFFECT_REGISTRY[picked.type]?.name ?? picked.type;
  const fromLabel = fromSide === 'player' ? '我方' : '敌方';
  const toLabel = toSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-cyan-300">${toLabel}【${cardName}】将${fromLabel}的 1 层【${effectName}】转移给了自己</span>`);
  return true;
};

const calculateShockDamage = (target: EntityStats, shockStacks: number) => {
  const shockDamageCard: CardData = {
    id: '__shock_damage__',
    name: '电击',
    type: CardType.FUNCTION,
    category: '状态',
    rarity: '普通',
    manaCost: 0,
    calculation: { multiplier: 1.0, addition: 0 },
    damageLogic: { mode: 'fixed', value: Math.max(0, Math.floor(shockStacks)) },
    hitCount: 1,
    traits: { combo: false, reroll: 'none', draw: false },
    cardEffects: [],
    description: '电击触发造成的非真实状态伤害',
  };
  return calculateFinalDamage({
    finalPoint: 0,
    card: shockDamageCard,
    attackerEffects: [],
    defenderEffects: target.effects,
    relicModifiers: NO_RELIC_MOD,
    isTrueDamage: false,
  });
};

const shouldAllowStatusEffectWithRelics = (
  targetSide: RelicSide,
  effectType: EffectType,
  stacks: number,
  options?: RelicApplyEffectOptions,
) => {
  let allowed = true;
  const target = getEntityBySide(targetSide);
  forEachPlayerRelic((entry, relic, state) => {
    if (!allowed) return;
    const hook = relic.hooks?.onBeforeApplyEffect;
    if (!hook) return;

    const ctx: RelicBeforeApplyEffectHookContext = {
      count: entry.count,
      side: 'player',
      self: playerStats.value,
      opponent: enemyStats.value,
      state,
      turn: combatState.value.turn,
      playedPhysicalOrMagicThisTurn: playerPlayedPhysicalOrMagicThisTurn.value,
      previousTurnMana: previousTurnManaSnapshot.value.player,
      addLog: logRelicMessage,
      hasRelic: hasActiveRelic,
      getRelicCount: getActiveRelicCount,
      addStatusEffect: (side, targetEffectType, targetStacks, applyOptions) => (
        applyStatusEffectWithRelics(side, targetEffectType, targetStacks, applyOptions)
      ),
      addArmor: addArmorForSide,
      restoreMana: restoreManaForSide,
      spendMana: spendManaWithShock,
      heal: healForSide,
      addRerollCharges: changeRerollCharges,
      getRerollCharges,
      targetSide,
      target,
      effectType,
      stacks,
      source: options?.source,
      restrictedTypes: options?.restrictedTypes,
    };
    const result = hook(ctx);
    if (result === false) {
      allowed = false;
    }
  });
  return allowed;
};

const applyStatusEffectWithRelics = (
  side: RelicSide,
  effectType: EffectType,
  stacks: number,
  options?: RelicApplyEffectOptions,
): boolean => {
  const catalystOwner: BattleSide | null = side === 'enemy'
    ? 'player'
    : (side === 'player' ? 'enemy' : null);
  const catalystDoubled = Boolean(
    catalystOwner
    && alchemyCatalystActiveThisTurn.value[catalystOwner]
    && ELEMENTAL_DEBUFF_TYPES.includes(effectType),
  );
  let value = Math.max(0, Math.floor(stacks) * (catalystDoubled ? 2 : 1));
  if (side === 'enemy' && ELEMENTAL_DEBUFF_TYPES.includes(effectType)) {
    const chromaticMushroomCount = getActiveRelicCount('alchemy_chromatic_mushroom');
    if (chromaticMushroomCount > 0) {
      const minimumStacks = hasNoDuplicateBattleCardsForSide('player') ? 3 : 2;
      value = Math.max(value, minimumStacks);
    }
  }
  if (value <= 0) return false;
  if (!shouldAllowStatusEffectWithRelics(side, effectType, value, options)) return false;
  const target = getEntityBySide(side);
  const isNonLivingPenaltyEffect = effectType === ET.POISON || effectType === ET.BLEED;
  const nonLivingGuardKey = `${combatState.value.turn}:${side}:${effectType}`;
  if (isNonLivingPenaltyEffect && getEffectStacks(target, ET.NON_LIVING) > 0 && nonLivingConversionGuard.has(nonLivingGuardKey)) {
    return false;
  }
  const hpBeforeApply = target.hp;
  const armorBeforeApply = effectType === ET.ARMOR ? getEffectStacks(target, ET.ARMOR) : 0;
  const applied = applyEffect(target, effectType, value, {
    restrictedTypes: options?.restrictedTypes,
    source: options?.source,
    lockDecayThisTurn: options?.lockDecayThisTurn,
    durationTurns: options?.durationTurns,
  });
  if (applied && effectType === ET.ARMOR) {
    const armorGained = Math.max(0, getEffectStacks(target, ET.ARMOR) - armorBeforeApply);
    applyCorrodeOnArmorGain(side, armorGained, options?.source ? `因 ${options.source} ` : '');
  }
  const hpLossFromNonLivingConversion = Math.max(0, hpBeforeApply - target.hp);
  if (
    !applied
    && hpLossFromNonLivingConversion > 0
    && (effectType === ET.POISON || effectType === ET.BLEED)
  ) {
    const label = side === 'player' ? '我方' : '敌方';
    const effectName = EFFECT_REGISTRY[effectType]?.name ?? String(effectType);
    pushFloatingNumber(side, hpLossFromNonLivingConversion, 'true', '-');
    const sourceText = options?.source ? `（来源：${options.source}）` : '';
    log(`<span class="text-zinc-300">${label}[非生物] 免疫${effectName}，改为受到 ${hpLossFromNonLivingConversion} 点真实伤害${sourceText}</span>`);
    nonLivingConversionGuard.add(nonLivingGuardKey);
  }
  if (
    applied
    && side === 'player'
    && effectType === ET.CORROSION
    && hpBeforeApply > 0
    && target.hp <= 0
  ) {
    log('<span class="text-red-400">[侵蚀] 侵蚀指数越过了临界值，我方战败，失去对身体的控制权。</span>');
    queuePlayerLethalNegativeStatus(PLAYER_CORROSION_LETHAL_NEGATIVE_STATUS, '侵蚀');
  }
  if (applied && effectType === ET.SILENCE && isTwinEntity(target)) {
    const twinWeakenApplied = applyEffect(target, ET.WEAKEN, 1, { source: 'effect:twins_silence_response' });
    if (twinWeakenApplied) {
      const label = side === 'player' ? '我方' : '敌方';
      log(`<span class="text-fuchsia-300">${label}[双生] 收到禁言后，自身获得了 1 层虚弱。</span>`);
    }
  }
  if (applied && catalystDoubled) {
    const label = catalystOwner === 'player' ? '我方' : '敌方';
    log(`<span class="text-yellow-300">${label}[催化剂] 元素负面层数翻倍：${Math.floor(stacks)} → ${value}。</span>`);
  }
  if (applied && side === 'enemy' && effectType === ET.COLD) {
    const sourceTag = options?.source ?? '';
    const fromEnemyCard = typeof sourceTag === 'string' && sourceTag.startsWith('enemy_');
    const freezePumpCount = getActiveRelicCount('yanhan_freeze_pump');
    if (!fromEnemyCard && freezePumpCount > 0 && freezePumpTriggersThisTurn.value < 2) {
      const gained = addArmorForSide('player', freezePumpCount);
      if (gained > 0) {
        freezePumpTriggersThisTurn.value += 1;
        logRelicMessage(`[冻结泵] 施加寒冷触发，获得 ${gained} 点护甲（本回合 ${freezePumpTriggersThisTurn.value}/2）。`);
      }
    }
  }
  return applied;
};

const createPlayerLifecycleContext = (
  relic: RelicData,
  count: number,
  state: Record<string, unknown>,
): RelicLifecycleHookContext => ({
  count,
  side: 'player',
  self: playerStats.value,
  opponent: enemyStats.value,
  state,
  turn: combatState.value.turn,
  playedPhysicalOrMagicThisTurn: playerPlayedPhysicalOrMagicThisTurn.value,
  previousTurnMana: previousTurnManaSnapshot.value.player,
  addLog: logRelicMessage,
  hasRelic: hasActiveRelic,
  getRelicCount: getActiveRelicCount,
  addStatusEffect: (side, effectType, stacks, options) => (
    applyStatusEffectWithRelics(side, effectType, stacks, {
      source: options?.source ?? `relic:${relic.id}`,
      restrictedTypes: options?.restrictedTypes,
      lockDecayThisTurn: options?.lockDecayThisTurn,
      durationTurns: options?.durationTurns,
    })
  ),
  addArmor: addArmorForSide,
  restoreMana: restoreManaForSide,
  spendMana: spendManaWithShock,
  heal: healForSide,
  addRerollCharges: changeRerollCharges,
  getRerollCharges,
});

const triggerPlayerRelicLifecycleHooks = (
  hookName: keyof Pick<NonNullable<RelicData['hooks']>, 'onBattleStart' | 'onTurnStart' | 'onTurnEnd' | 'onDeckShuffle'>,
) => {
  forEachPlayerRelic((entry, relic, state) => {
    const hook = relic.hooks?.[hookName];
    if (!hook) return;
    hook(createPlayerLifecycleContext(relic, entry.count, state));
  });
};

const triggerPlayerRelicBeforeBurnDamageHooks = (
  targetSide: RelicSide,
  burnStacks: number,
  damage: number,
  turn: number,
) => {
  let currentDamage = Math.max(0, Math.floor(damage));
  let isTrueDamage = false;
  const target = getEntityBySide(targetSide);

  forEachPlayerRelic((entry, relic, state) => {
    const hook = relic.hooks?.onBeforeBurnDamage;
    if (!hook) return;
    const shared = createPlayerLifecycleContext(relic, entry.count, state);
    const ctx: RelicBurnDamageHookContext = {
      ...shared,
      targetSide,
      target,
      turn,
      burnStacks,
      damage: currentDamage,
      isTrueDamage,
    };
    hook(ctx);
    currentDamage = Math.max(0, Math.floor(ctx.damage));
    isTrueDamage = !!ctx.isTrueDamage;
  });

  return { damage: currentDamage, isTrueDamage };
};

const triggerPlayerRelicAfterBurnDamageTakenHooks = (
  targetSide: RelicSide,
  burnStacks: number,
  damage: number,
  isTrueDamage: boolean,
  turn: number,
) => {
  const target = getEntityBySide(targetSide);
  forEachPlayerRelic((entry, relic, state) => {
    const hook = relic.hooks?.onAfterBurnDamageTaken;
    if (!hook) return;
    const shared = createPlayerLifecycleContext(relic, entry.count, state);
    const ctx: RelicAfterBurnDamageTakenHookContext = {
      ...shared,
      targetSide,
      target,
      turn,
      burnStacks,
      damage: Math.max(0, Math.floor(damage)),
      isTrueDamage,
    };
    hook(ctx);
  });
};

const triggerPlayerRelicHitHooks = (
  sourceSide: RelicSide,
  targetSide: RelicSide,
  card: CardData,
  finalPoint: number,
  hitIndex: number,
  hitCount: number,
  attemptedDamage: number,
  actualDamage: number,
) => {
  const source = getEntityBySide(sourceSide);
  const target = getEntityBySide(targetSide);

  forEachPlayerRelic((entry, relic, state) => {
    const shared = createPlayerLifecycleContext(relic, entry.count, state);
    const ctx: RelicHitHookContext = {
      ...shared,
      sourceSide,
      targetSide,
      source,
      target,
      card,
      finalPoint,
      hitIndex,
      hitCount,
      attemptedDamage: Math.max(0, Math.floor(attemptedDamage)),
      actualDamage: Math.max(0, Math.floor(actualDamage)),
    };
    relic.hooks?.onAfterHitDealt?.(ctx);
    relic.hooks?.onAfterHitTaken?.(ctx);
  });
};

const triggerPlayerRelicBeforeDirectDamageHooks = (
  sourceSide: RelicSide | undefined,
  targetSide: RelicSide,
  card: CardData | undefined,
  damage: number,
  isTrueDamage: boolean,
  reason: string,
) => {
  let currentDamage = Math.max(0, Math.floor(damage));
  let currentTrueDamage = isTrueDamage;
  const source = sourceSide ? getEntityBySide(sourceSide) : undefined;
  const target = getEntityBySide(targetSide);

  forEachPlayerRelic((entry, relic, state) => {
    const hook = relic.hooks?.onBeforeDirectDamage;
    if (!hook) return;
    const shared = createPlayerLifecycleContext(relic, entry.count, state);
    const ctx: RelicDirectDamageHookContext = {
      ...shared,
      sourceSide,
      targetSide,
      source,
      target,
      card,
      damage: currentDamage,
      isTrueDamage: currentTrueDamage,
      reason,
    };
    hook(ctx);
    currentDamage = Math.max(0, Math.floor(ctx.damage));
    currentTrueDamage = !!ctx.isTrueDamage;
  });

  return { damage: currentDamage, isTrueDamage: currentTrueDamage };
};

const triggerPlayerRelicAfterActiveSkillHooks = (skill: ActiveSkillData) => {
  forEachPlayerRelic((entry, relic, state) => {
    const hook = relic.hooks?.onAfterActiveSkill;
    if (!hook) return;
    const shared = createPlayerLifecycleContext(relic, entry.count, state);
    const ctx: RelicActiveSkillHookContext = {
      ...shared,
      skill,
      rerollSelfDice: () => rerollSideDiceByActiveSkill('player', relic.name),
    };
    hook(ctx);
  });
};

// --- Helpers ---
const scaleDuration = (ms: number) => Math.max(60, Math.floor(ms / speedMultiplier.value));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, scaleDuration(ms)));
const transitionStyle = (ms: number) => ({ transitionDuration: `${scaleDuration(ms)}ms` });
const withTransition = (style: Record<string, string>, ms: number) => ({
  ...style,
  transitionDuration: `${scaleDuration(ms)}ms`,
});
const HP_BAR_ANIMATION_MS = 500;
const RESULT_DELAY_MS = 500;
const RESULT_BANNER_STAY_MS = 1500;

const playerPlayedCardStyle = computed(() => {
  const visual = playerPlayedCardVisual.value;
  const entered = !!visual?.entered;
  return {
    left: entered ? '29%' : '50%',
    top: entered ? '23%' : '84%',
    transform: `translate(-50%, -50%) scale(${entered ? 1 : 0.96})`,
    opacity: entered ? '1' : '0',
    transitionProperty: 'left, top, transform, opacity',
    transitionDuration: `${scaleDuration(540)}ms`,
    transitionTimingFunction: 'cubic-bezier(0.22, 0.9, 0.2, 1)',
  };
});

const resolvedCardVisualInnerClass = (visual: ResolvedCardVisual) => {
  const sideClass = visual.source === 'player'
    ? 'resolved-card-visual-inner--player'
    : 'resolved-card-visual-inner--enemy';
  const variantClass = visual.variant === 'attack'
    ? 'resolved-card-visual-inner--attack'
    : (visual.variant === 'self'
      ? 'resolved-card-visual-inner--self'
      : 'resolved-card-visual-inner--fade');
  return `${sideClass} ${variantClass}`;
};

const showEnemyIntentCard = computed(() => {
  if (!combatState.value.enemyIntentCard) return false;
  if (enemyIntentConsumedThisTurn.value) return false;
  return !resolvedEnemyCardVisual.value;
});
const visibleEnemyIntentCards = computed(() => {
  if (resolvedEnemyCardVisual.value) return [] as Array<{ slot: number; card: CardData }>;
  if (isTwinBattle) {
    return twinEnemyIntentCards.value
      .map((card, index) => ({ slot: index + 1, card, consumed: twinEnemyConsumedSlots.value[index] }))
      .filter((entry): entry is { slot: number; card: CardData; consumed: boolean } => (
        entry.card !== null && entry.card.id !== PASS_CARD.id
      ))
      .filter((entry) => !entry.consumed)
      .map((entry) => ({ slot: entry.slot, card: entry.card }));
  }
  if (!showEnemyIntentCard.value || !combatState.value.enemyIntentCard) return [] as Array<{ slot: number; card: CardData }>;
  return [{ slot: 1, card: combatState.value.enemyIntentCard }];
});
const getTwinTargetLabel = (slot: number | null | undefined): string => {
  if (slot === 1) return '对弥纱';
  if (slot === 2) return '对弥音';
  return '待分配';
};
const getTwinPlayerSelectionSlot = (card: CardData): number | null => {
  const index = twinPlayerSelectedCards.value.findIndex((entry) => entry === card);
  return index >= 0 ? index + 1 : null;
};
const twinPlayerSelectionSummaries = computed(() => (
  twinPlayerSelectedCards.value.map((card, index) => ({
    slot: index + 1,
    label: card?.name ?? '待选择',
  }))
));

const floatingColors: Record<FloatingNumberKind, string> = {
  physical: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.85)]',
  magic: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.85)]',
  shield: 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.85)]',
  heal: 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.85)]',
  mana: 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.85)]',
  true: 'text-zinc-500 drop-shadow-[0_0_8px_rgba(39,39,42,0.9)]',
};

const floatingNumbersFor = (side: BattleSide) => floatingNumbers.value.filter((entry) => entry.side === side);
const handCardKey = (card: CardData) => {
  let key = handCardKeys.get(card);
  if (!key) {
    handCardKeySeed += 1;
    key = `hand-${handCardKeySeed}`;
    handCardKeys.set(card, key);
  }
  return key;
};

const isCardShaking = (card: CardData) => invalidCardShakeKeys.value.has(handCardKey(card));

const triggerInvalidCardShake = (card: CardData) => {
  const key = handCardKey(card);
  const withoutKey = new Set(invalidCardShakeKeys.value);
  withoutKey.delete(key);
  invalidCardShakeKeys.value = withoutKey;

  requestAnimationFrame(() => {
    const next = new Set(invalidCardShakeKeys.value);
    next.add(key);
    invalidCardShakeKeys.value = next;
    setTimeout(() => {
      const removed = new Set(invalidCardShakeKeys.value);
      removed.delete(key);
      invalidCardShakeKeys.value = removed;
    }, scaleDuration(360));
  });
};

const HAND_CARD_ANIMATION_DURATION: Record<HandCardAnimationKind, number> = {
  draw: 620,
  discard: 560,
  turn_end_in_hand: 820,
};

const setHandCardAnimation = (card: CardData, kind: HandCardAnimationKind | null) => {
  const key = handCardKey(card);
  const next = { ...handCardAnimations.value };
  if (kind) {
    next[key] = kind;
  } else {
    delete next[key];
  }
  handCardAnimations.value = next;
};

const clearHandCardAnimationLater = (
  card: CardData,
  kind: HandCardAnimationKind,
  delay = HAND_CARD_ANIMATION_DURATION[kind],
) => {
  const key = handCardKey(card);
  setTimeout(() => {
    if (handCardAnimations.value[key] !== kind) return;
    setHandCardAnimation(card, null);
  }, scaleDuration(delay + 80));
};

const handCardAnimationClass = (card: CardData) => {
  const kind = handCardAnimations.value[handCardKey(card)];
  if (!kind) return '';
  if (kind === 'turn_end_in_hand' && card.id === MOORE_MIMIC_CARD_ID) {
    return 'hand-card-motion-turn_end_in_hand hand-card-motion-turn_end_in_hand--reveal';
  }
  return `hand-card-motion-${kind}`;
};

const markDrawnCardsAnimation = (drawn: CardData[]) => {
  if (drawn.length <= 0) return;
  const next = { ...handCardAnimations.value };
  drawn.forEach((card) => {
    next[handCardKey(card)] = 'draw';
  });
  handCardAnimations.value = next;
  drawn.forEach((card) => {
    clearHandCardAnimationLater(card, 'draw');
  });
};

const playCardsToDiscardAnimation = async (cards: CardData[]) => {
  if (cards.length <= 0) return;
  cards.forEach((card, index) => {
    setTimeout(() => {
      setHandCardAnimation(card, 'discard');
    }, scaleDuration(index * 45));
  });
  await wait(HAND_CARD_ANIMATION_DURATION.discard + Math.min(4, cards.length - 1) * 45);
};

const playTurnEndInHandCardAnimation = async (card: CardData, index: number, total: number) => {
  void index;
  void total;
  setHandCardAnimation(card, 'turn_end_in_hand');
  await wait(card.id === MOORE_MIMIC_CARD_ID ? 520 : 430);
};

const putDrawnCardIntoHand = async (card: CardData, sourceText: string) => {
  if (combatState.value.playerHand.length >= 3) {
    const replaceIdx = Math.floor(Math.random() * combatState.value.playerHand.length);
    const replaced = combatState.value.playerHand[replaceIdx]!;
    setHandCardAnimation(replaced, 'discard');
    await wait(HAND_CARD_ANIMATION_DURATION.discard);
    setHandCardAnimation(card, 'draw');
    combatState.value.playerHand.splice(replaceIdx, 1, card);
    combatState.value.discardPile.push(replaced);
    setHandCardAnimation(replaced, null);
    clearHandCardAnimationLater(card, 'draw');
    log(`<span class="text-zinc-200">${sourceText}：手牌已满，随机替换了【${replaced.name}】→【${card.name}】。</span>`);
    return;
  }

  setHandCardAnimation(card, 'draw');
  clearHandCardAnimationLater(card, 'draw');
  combatState.value.playerHand = [...combatState.value.playerHand, card];
  log(`<span class="text-zinc-200">${sourceText}：抽到【${card.name}】。</span>`);
};

const triggerEnemyIntentInvalidShake = (slotIndex?: 1 | 2, fallbackCard?: CardData) => {
  const intentCard = slotIndex
    ? twinEnemyIntentCards.value[slotIndex - 1]
    : combatState.value.enemyIntentCard;
  const card = intentCard ?? combatState.value.enemyIntentCard ?? fallbackCard ?? null;
  if (!card || card.id === PASS_CARD.id) return;
  triggerInvalidCardShake(card);
  setTimeout(() => triggerInvalidCardShake(card), scaleDuration(390));
};

const resolveTargetSide = (source: BattleSide, target: 'self' | 'enemy') => {
  if (target === 'self') return source;
  return source === 'player' ? 'enemy' : 'player';
};

const removeSingleCardById = (cards: CardData[], cardId: string): CardData[] => {
  let removed = false;
  return cards.filter((card) => {
    if (!removed && card.id === cardId) {
      removed = true;
      return false;
    }
    return true;
  });
};

const removeSingleCardReference = (cards: CardData[], target: CardData): CardData[] => {
  let removed = false;
  return cards.filter((card) => {
    if (!removed && card === target) {
      removed = true;
      return false;
    }
    return true;
  });
};

const insertCardIntoDeckRandomly = (deck: CardData[], card: CardData): CardData[] => {
  const index = Math.floor(Math.random() * (deck.length + 1));
  return [...deck.slice(0, index), card, ...deck.slice(index)];
};

const getMimicDisplayPriority = (card: CardData): number => {
  if (!card.traits.combo && !card.traits.firstCombo) return 0;
  if (!card.traits.combo && card.traits.firstCombo) return 1;
  return 2;
};

const pickMimicDisplayCards = (cards: CardData[], count: number): CardData[] => {
  const candidates = cards.filter(card => card.id !== PASS_CARD.id && card.type !== CardType.CURSE);
  if (candidates.length <= 0) return [];

  const countById = new Map<string, number>();
  for (const card of candidates) {
    countById.set(card.id, (countById.get(card.id) ?? 0) + 1);
  }

  const uniqueCards: CardData[] = [];
  const seenIds = new Set<string>();
  for (const card of candidates) {
    if (seenIds.has(card.id)) continue;
    seenIds.add(card.id);
    uniqueCards.push(card);
  }

  uniqueCards.sort((a, b) => {
    const priorityDelta = getMimicDisplayPriority(a) - getMimicDisplayPriority(b);
    if (priorityDelta !== 0) return priorityDelta;
    return (countById.get(b.id) ?? 0) - (countById.get(a.id) ?? 0);
  });

  const picked: CardData[] = [];
  const usedIds = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const nonDuplicate = uniqueCards.find(card => !usedIds.has(card.id));
    const next = nonDuplicate ?? uniqueCards[0];
    if (!next) break;
    picked.push(next);
    usedIds.add(next.id);
  }
  return picked;
};

const rebindMimicDisplayCardsForDeck = (
  side: BattleSide,
  deck: CardData[],
  discardOverride?: CardData[],
) => {
  const mimicCards = deck.filter(card => card.id === MOORE_MIMIC_CARD_ID);
  if (mimicCards.length <= 0) return;

  const sourceCards = side === 'player'
    ? [...deck, ...combatState.value.playerHand, ...(discardOverride ?? combatState.value.discardPile)]
    : [...deck, ...(discardOverride ?? combatState.value.enemyDiscard)];
  const displays = pickMimicDisplayCards(sourceCards, mimicCards.length);

  mimicCards.forEach((mimicCard, index) => {
    const rawMimicCard = toRaw(mimicCard);
    const displayCard = displays[index];
    if (displayCard) {
      mimicDisplayCards.set(rawMimicCard, cloneCardForBattle(displayCard));
    } else {
      mimicDisplayCards.delete(rawMimicCard);
    }
  });
};

const applyPurgeTraitAfterUse = (source: BattleSide, card: CardData) => {
  if (!card.traits.purgeOnUse) return;
  if (source === 'player') {
    combatState.value.discardPile = removeSingleCardById(combatState.value.discardPile, card.id);
  } else {
    combatState.value.enemyDeck = removeSingleCardById(combatState.value.enemyDeck, card.id);
    combatState.value.enemyDiscard = removeSingleCardById(combatState.value.enemyDiscard, card.id);
  }
  log(`<span class="text-zinc-300">【${card.name}】触发移除，自我销毁。</span>`);
};

const applyInsertTrait = (source: BattleSide, card: CardData) => {
  const toInsert = card.traits.insertCardsToEnemyDeck ?? [];
  if (toInsert.length <= 0) return;
  const sourceLabel = source === 'player' ? '我方' : '敌方';
  const targetSide: BattleSide = source === 'player' ? 'enemy' : 'player';
  for (const cardName of toInsert) {
    const inserted = getCardByName(cardName);
    if (!inserted) continue;
    const battleCard = cloneCardForBattle(inserted);
    if (targetSide === 'player') {
      combatState.value.playerDeck = insertCardIntoDeckRandomly(combatState.value.playerDeck, battleCard);
      log(`<span class="text-fuchsia-300">${sourceLabel}【${card.name}】向对方牌库插入了【${cardName}】（牌库${combatState.value.playerDeck.length} / 弃牌${combatState.value.discardPile.length}）。</span>`);
    } else {
      combatState.value.enemyDeck = insertCardIntoDeckRandomly(combatState.value.enemyDeck, battleCard);
      log(`<span class="text-fuchsia-300">${sourceLabel}【${card.name}】向对方牌库插入了【${cardName}】（敌方牌库${combatState.value.enemyDeck.length} / 弃牌${combatState.value.enemyDiscard.length}）。</span>`);
    }
  }
};

const insertFallenPersonalityMirrorForSide = (side: BattleSide, sourceText: string) => {
  const cardName = '堕落的人格镜像';
  const card = getCardByName(cardName);
  if (!card) return;
  const battleCard = cloneCardForBattle(card);
  const label = side === 'player' ? '我方' : '敌方';
  if (side === 'player') {
    combatState.value.playerDeck = insertCardIntoDeckRandomly(combatState.value.playerDeck, battleCard);
    log(`<span class="text-fuchsia-300">${label}[${sourceText}] 向牌库插入了【${cardName}】（牌库${combatState.value.playerDeck.length} / 弃牌${combatState.value.discardPile.length}）。</span>`);
  } else {
    combatState.value.enemyDeck = insertCardIntoDeckRandomly(combatState.value.enemyDeck, battleCard);
    log(`<span class="text-fuchsia-300">${label}[${sourceText}] 向牌库插入了【${cardName}】（敌方牌库${combatState.value.enemyDeck.length} / 弃牌${combatState.value.enemyDiscard.length}）。</span>`);
  }
};

const getPriorityFoodCardInHand = (): CardData | null =>
  combatState.value.playerHand.find(card => card.id === BEHEMOTH_ROAST_MEAT_ID) ?? null;

const isBlockedByPriorityFoodCard = (card: CardData): boolean => (
  card.id !== BEHEMOTH_ROAST_MEAT_ID && getPriorityFoodCardInHand() !== null
);

const insertBehemothFoodIntoPlayerDiscard = () => {
  const feastStacks = Math.max(0, getEffectStacks(enemyStats.value, ET.BLISS_FEAST));
  if (feastStacks <= 0 || combatState.value.turn % 5 !== 0) return;

  let inserted = 0;
  for (let i = 0; i < feastStacks; i += 1) {
    const pickedName = BEHEMOTH_FOOD_CARD_NAMES[Math.floor(Math.random() * BEHEMOTH_FOOD_CARD_NAMES.length)]!;
    const foodCard = getCardByName(pickedName);
    if (!foodCard) continue;
    combatState.value.discardPile.push(cloneCardForBattle(foodCard));
    inserted += 1;
    log(`<span class="text-fuchsia-300">敌方[极乐宴会] 将【${pickedName}】塞入了我方弃牌堆。</span>`);
  }
  if (inserted > 0) {
    log(`<span class="text-gray-400 text-[9px]">我方弃牌堆：${combatState.value.discardPile.length} 张。</span>`);
  }
};

const insertPrayerCandleRetreatIntoPlayerDeck = () => {
  if (enemyDisplayName !== '祈祷烛灵') return;
  if (combatState.value.turn !== 12) return;
  if (aiFlags.prayerCandleRetreatInserted === true) return;
  const retreatCard = getCardByName('退走');
  if (!retreatCard) {
    log('<span class="text-red-400">[祈祷烛灵] 未找到【退走】卡牌定义。</span>');
    return;
  }
  combatState.value.playerDeck = insertCardIntoDeckRandomly(combatState.value.playerDeck, cloneCardForBattle(retreatCard));
  aiFlags.prayerCandleRetreatInserted = true;
  log(`<span class="text-fuchsia-300">[祈祷烛灵] 第12回合将【退走】插入了我方抽牌堆（牌库${combatState.value.playerDeck.length} / 弃牌${combatState.value.discardPile.length}）。</span>`);
};

const processLustIllusionTurnEndForSide = (side: BattleSide) => {
  const target = getEntityBySide(side);
  const stacks = Math.max(0, getEffectStacks(target, ET.LUST_ILLUSION));
  if (stacks <= 0) return;
  const label = side === 'player' ? '我方' : '敌方';
  const { actualDamage, logs: damageLogs } = applyDamageToSideWithRelics(
    side,
    target,
    stacks,
    true,
    '淫靡幻象',
    { dreamControlKind: 'status' },
  );
  if (actualDamage > 0) {
    pushFloatingNumber(side, actualDamage, 'true', '-');
  }
  log(`<span class="text-fuchsia-300">${label}[淫靡幻象] 回合结束受到 ${actualDamage} 点真实伤害。</span>`);
  for (const damageLog of damageLogs) {
    const normalized = damageLog.startsWith('受到') ? `${label}${damageLog}` : damageLog;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
  if (stacks >= 4) {
    reduceEffectStacks(target, ET.LUST_ILLUSION, 4);
    insertFallenPersonalityMirrorForSide(side, '淫靡幻象');
    log(`<span class="text-fuchsia-300">${label}[淫靡幻象] 层数达到4，减少4层。</span>`);
  }
};

const processTurnEndInHandCardEffects = async () => {
  const cards = [...combatState.value.playerHand];
  const shouldProcessTurnEndCard = (card: CardData) => (
    card.gluttonyEnchanted === true
    || card.id === BEHEMOTH_ROASTED_RABBIT_LEG_ID
    || card.cardEffects.some(effect => cardEffectMatchesTrigger(effect.triggers, 'on_turn_end_in_hand'))
  );
  const total = cards.filter(shouldProcessTurnEndCard).length;
  let triggerIndex = 0;
  for (const card of cards) {
    if (playerStats.value.hp <= 0) break;
    if (!shouldProcessTurnEndCard(card)) continue;
    if (card.id === MOORE_MIMIC_CARD_ID && mooreMimicPlayedThisTurn.value) continue;
    const handIndex = combatState.value.playerHand.findIndex(entry => entry === card);
    if (handIndex < 0) continue;
    const finalPoint = getCardPreviewPoint('player', card, combatState.value.playerBaseDice);
    try {
      await playTurnEndInHandCardAnimation(card, triggerIndex, total);
      if (card.gluttonyEnchanted === true) {
        applyStatusEffectWithRelics('player', ET.CORROSION, 3, { source: 'gluttony_enchantment' });
        log(`<span class="text-fuchsia-300">【${card.name}】的饕餮魔素发作，我方获得 3 层侵蚀。</span>`);
      }
      if (card.id === BEHEMOTH_ROASTED_RABBIT_LEG_ID) {
        const beforeMp = Math.max(0, Math.floor(playerStats.value.mp));
        const nextMp = Math.floor(beforeMp / 2);
        const lostMp = beforeMp - nextMp;
        if (lostMp > 0) {
          changeManaWithShock('player', -lostMp, '烤兔腿');
        }
        log(`<span class="text-amber-300">【烤兔腿】回合结束仍在手中，我方法力 ${beforeMp} → ${nextMp}。</span>`);
      }
      applyCardEffectsByTrigger('player', card, finalPoint, 'on_turn_end_in_hand');
      await wait(card.id === MOORE_MIMIC_CARD_ID ? 720 : 430);
      const currentIndex = combatState.value.playerHand.findIndex(entry => entry === card);
      if (currentIndex >= 0) {
        const [removed] = combatState.value.playerHand.splice(currentIndex, 1);
        if (removed) {
          combatState.value.discardPile.push(removed);
        }
      }
    } finally {
      setHandCardAnimation(card, null);
    }
    triggerIndex += 1;
  }
};

const destroyOpponentCardByTrait = (winnerSide: BattleSide, loserCard: CardData) => {
  if (loserCard.id === PASS_CARD.id) return;
  if (winnerSide === 'player') {
    combatState.value.enemyDeck = removeSingleCardReference(combatState.value.enemyDeck, loserCard);
    combatState.value.enemyDiscard = removeSingleCardReference(combatState.value.enemyDiscard, loserCard);
    if (combatState.value.enemyIntentCard === loserCard) {
      combatState.value.enemyIntentCard = null;
    }
  } else {
    combatState.value.playerDeck = removeSingleCardReference(combatState.value.playerDeck, loserCard);
    combatState.value.playerHand = removeSingleCardReference(combatState.value.playerHand, loserCard);
    combatState.value.discardPile = removeSingleCardReference(combatState.value.discardPile, loserCard);
    if (combatState.value.playerSelectedCard === loserCard) {
      combatState.value.playerSelectedCard = null;
    }
  }
  log(`<span class="text-violet-300">【销毁】${loserCard.name}在本次战斗中被临时移除。</span>`);
};

const applyShockOnManaLoss = (side: BattleSide, lostMp: number, reason: string) => {
  const loss = Math.max(0, Math.floor(lostMp));
  if (loss <= 0) return;

  const target = side === 'player' ? playerStats.value : enemyStats.value;
  const label = side === 'player' ? '我方' : '敌方';
  const shockStacks = getEffectStacks(target, ET.SHOCK);
  if (shockStacks <= 0) return;

  const shockDamageResult = calculateShockDamage(target, shockStacks);
  const { actualDamage, logs: applyDamageLogs } = applyDamageToSideWithRelics(
    side,
    target,
    shockDamageResult.damage,
    shockDamageResult.isTrueDamage,
    '电击',
  );
  const shockDamageLogs = [...shockDamageResult.logs, ...applyDamageLogs];
  if (actualDamage > 0) {
    pushFloatingNumber(side, actualDamage, 'magic', '-');
  }

  const nextStacks = Math.max(0, Math.floor(shockStacks / 2));
  if (nextStacks <= 0) {
    removeEffect(target, ET.SHOCK);
  } else {
    const shockEffect = target.effects.find((effect) => effect.type === ET.SHOCK);
    if (shockEffect) {
      shockEffect.stacks = nextStacks;
    }
  }

  log(`<span class="text-violet-300">${label}因${reason}触发电击，损失 ${actualDamage} 点生命（电击 ${shockStacks}→${nextStacks}）。</span>`);
  for (const dl of shockDamageLogs) {
    const normalized = dl.startsWith('受到') ? `${label}${dl}` : dl;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
  if (side === 'player' && actualDamage > 0 && target.hp <= 0) {
    queuePlayerLethalNegativeStatus(PLAYER_SHOCK_LETHAL_NEGATIVE_STATUS, '电击');
  }
};

const triggerShockProc = (targetSide: BattleSide, reason: string): number => {
  const target = targetSide === 'player' ? playerStats.value : enemyStats.value;
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  const shockStacks = Math.max(0, getEffectStacks(target, ET.SHOCK));
  if (shockStacks <= 0) {
    log(`<span class="text-gray-400">[电击] ${reason}未触发：${targetLabel}当前无电击。</span>`);
    return 0;
  }

  const shockDamageResult = calculateShockDamage(target, shockStacks);
  const { actualDamage, logs: applyDamageLogs } = applyDamageToSideWithRelics(
    targetSide,
    target,
    shockDamageResult.damage,
    shockDamageResult.isTrueDamage,
    '电击',
  );
  const shockDamageLogs = [...shockDamageResult.logs, ...applyDamageLogs];
  if (actualDamage > 0) {
    pushFloatingNumber(targetSide, actualDamage, 'magic', '-');
  }

  const nextStacks = Math.max(0, Math.floor(shockStacks / 2));
  if (nextStacks <= 0) {
    removeEffect(target, ET.SHOCK);
  } else {
    const shockEffect = target.effects.find((effect) => effect.type === ET.SHOCK);
    if (shockEffect) {
      shockEffect.stacks = nextStacks;
    }
  }

  log(`<span class="text-violet-300">[电击] ${reason}触发：${targetLabel}损失 ${actualDamage} 点生命（电击 ${shockStacks}→${nextStacks}）。</span>`);
  for (const shockLog of shockDamageLogs) {
    const normalized = shockLog.startsWith('受到') ? `${targetLabel}${shockLog}` : shockLog;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
  if (targetSide === 'player' && actualDamage > 0 && target.hp <= 0) {
    queuePlayerLethalNegativeStatus(PLAYER_SHOCK_LETHAL_NEGATIVE_STATUS, '电击');
  }

  return actualDamage;
};

const changeManaWithShock = (
  side: BattleSide,
  delta: number,
  reason: string,
  options?: { requireEnoughForDecrease?: boolean; showPositiveFloating?: boolean },
): { ok: boolean; actualDelta: number } => {
  const value = Math.floor(delta);
  if (value === 0) return { ok: true, actualDelta: 0 };

  const target = side === 'player' ? playerStats.value : enemyStats.value;
  const before = target.mp;

  if (value < 0 && options?.requireEnoughForDecrease && before < -value) {
    return { ok: false, actualDelta: 0 };
  }

  target.mp = Math.max(0, before + value);
  const actualDelta = target.mp - before;

  if (actualDelta > 0 && options?.showPositiveFloating !== false) {
    pushFloatingNumber(side, actualDelta, 'mana', '+');
  }
  if (actualDelta < 0) {
    applyShockOnManaLoss(side, -actualDelta, reason);
  }
  if (actualDelta > 0) {
    tryTriggerModaoStabilizer(side, actualDelta, `${reason}，`);
  }

  return { ok: true, actualDelta };
};

const spendManaWithShock = (side: BattleSide, amount: number, reason: string): boolean => {
  const cost = Math.max(0, Math.floor(amount));
  if (cost <= 0) return true;
  return changeManaWithShock(side, -cost, reason, { requireEnoughForDecrease: true }).ok;
};

const hasModaoWeaveBackupInPlayerHand = () => (
  combatState.value.playerHand.some((entry) => entry.id === 'modao_weave_backup')
);

const lockCardManaCost = (side: BattleSide, card: CardData): number => {
  const cost = getEffectiveManaCost(side, card);
  lockedManaCostByCard.set(card, cost);
  return cost;
};

const unlockCardManaCost = (card: CardData | null | undefined) => {
  if (!card || card.id === PASS_CARD.id) return;
  lockedManaCostByCard.delete(card);
};

const getSecondMagicCardInPlayerHand = (): CardData | null => {
  let seen = 0;
  for (const card of combatState.value.playerHand) {
    if (card.type !== CardType.MAGIC) continue;
    seen += 1;
    if (seen === 2) return card;
  }
  return null;
};

const isMagicCostFreeThisTurn = (side: BattleSide): boolean => (
  nextTurnMagicCostFree.value[side] === combatState.value.turn
);

const grantNextTurnMagicCostFree = (side: BattleSide, card: CardData) => {
  const targetTurn = combatState.value.turn + 1;
  if (nextTurnMagicCostFree.value[side] < targetTurn) {
    nextTurnMagicCostFree.value[side] = targetTurn;
  }
  const sideLabel = side === 'player' ? '我方' : '敌方';
  log(`<span class="text-sky-300">${sideLabel}【${card.name}】触发：下回合魔法牌消耗为0</span>`);
};

const getCurrentTurnMagicPointBonus = (side: BattleSide): number => (
  nextTurnMagicPointBonus.value[side].turn === combatState.value.turn
    ? Math.max(0, Math.floor(nextTurnMagicPointBonus.value[side].amount))
    : 0
);

const grantNextTurnMagicPointBonus = (side: BattleSide, amount: number, card: CardData) => {
  const targetTurn = combatState.value.turn + 1;
  const next = nextTurnMagicPointBonus.value[side];
  const normalizedAmount = Math.max(0, Math.floor(amount));
  if (next.turn !== targetTurn) {
    nextTurnMagicPointBonus.value[side] = { turn: targetTurn, amount: normalizedAmount };
  } else {
    nextTurnMagicPointBonus.value[side] = {
      turn: targetTurn,
      amount: Math.max(0, Math.floor(next.amount + normalizedAmount)),
    };
  }
  const sideLabel = side === 'player' ? '我方' : '敌方';
  log(`<span class="text-sky-300">${sideLabel}【${card.name}】触发：下回合使用魔法牌时点数 +${normalizedAmount}</span>`);
};

const grantCurrentTurnMagicReflect = (side: BattleSide, card: CardData) => {
  currentTurnMagicReflect.value[side] = combatState.value.turn;
  const sideLabel = side === 'player' ? '我方' : '敌方';
  log(`<span class="text-cyan-300">${sideLabel}【${card.name}】生效：本回合被魔法牌命中时免疫并反弹</span>`);
};

const hasCurrentTurnMagicReflect = (side: BattleSide): boolean => (
  currentTurnMagicReflect.value[side] === combatState.value.turn
);

const resolveCardManaDrain = (card: CardData, finalPoint: number): number => {
  const raw = card.manaDrain;
  if (typeof raw === 'number') {
    return Math.max(0, Math.floor(raw));
  }
  if (!raw) return 0;
  if (raw.mode === 'point_scale') {
    return Math.max(0, Math.floor(finalPoint * (raw.scale ?? 1)));
  }
  return Math.max(0, Math.floor(raw.value ?? 0));
};

const getLostHp = (entity: EntityStats): number => Math.max(0, Math.floor(entity.maxHp - entity.hp));

const getSelinaSpaceFoldManaSpend = (entity: EntityStats): number => (
  Math.max(0, Math.floor(entity.mp / 2))
);

const isBelowHalfHp = (entity: EntityStats): boolean => (
  entity.maxHp > 0 && (entity.hp * 2) < entity.maxHp
);

const isAboveHalfHp = (entity: EntityStats): boolean => (
  entity.maxHp > 0 && (entity.hp * 2) > entity.maxHp
);

const applyBloodpoolRedHeadbandPointBonus = (
  side: BattleSide,
  card: CardData,
  entity: EntityStats,
  currentPoint: number,
  isPreview: boolean,
): number => {
  if (side !== 'player') return currentPoint;
  const count = getActiveRelicCount('bloodpool_red_headband');
  if (count <= 0 || card.id === PASS_CARD.id) return currentPoint;
  const shriveledHandActive = getActiveRelicCount('basic_shriveled_hand') > 0;
  let nextPoint = currentPoint;
  const bleedBonus = getEffectStacks(entity, ET.BLEED) > 0 ? count : 0;
  if (bleedBonus > 0) {
    nextPoint += shriveledHandActive ? bleedBonus * 2 : bleedBonus;
    if (!isPreview) {
      logRelicMessage(`[红色头带] 拥有流血，点数 +${shriveledHandActive ? bleedBonus * 2 : bleedBonus}。`);
    }
  }
  if (!shriveledHandActive && isBelowHalfHp(entity)) {
    nextPoint *= 1.3;
    if (!isPreview) {
      logRelicMessage('[红色头带] 生命低于50%，点数 x1.3。');
    }
  }
  return nextPoint;
};

const getEffectiveManaCost = (side: BattleSide, card: CardData): number => {
  const base = Math.max(0, Math.floor(card.manaCost ?? 0));
  if (card.type !== CardType.MAGIC) return base;
  const locked = lockedManaCostByCard.get(card);
  if (typeof locked === 'number') return Math.max(0, Math.floor(locked));
  if (isMagicCostFreeThisTurn(side)) return 0;

  let discount = 0;
  if (side === 'player') {
    if (hasModaoWeaveBackupInPlayerHand()) {
      discount += 1;
    }

    const hostCount = getActiveRelicCount('modao_arcane_host');
    if (hostCount > 0 && getSecondMagicCardInPlayerHand() === card) {
      discount += (2 * hostCount);
    }
  }

  return Math.max(0, base - discount);
};

const withEffectiveManaCost = (side: BattleSide, card: CardData): CardData => {
  const manaCost = getEffectiveManaCost(side, card);
  if (manaCost === card.manaCost) return card;
  return { ...card, manaCost };
};

const resolveCardSelfDamage = (
  card: CardData,
): { value: number; mode: 'fixed' | 'percent'; target: 'hp' | 'maxHp' } | null => {
  const raw = card.selfDamage;
  if (raw === undefined || raw === null) return null;

  if (typeof raw === 'number') {
    const amount = Math.max(0, Math.floor(raw));
    if (amount <= 0) return null;
    return { value: amount, mode: 'fixed', target: 'hp' };
  }

  const mode = raw.mode ?? 'fixed';
  const target = raw.target ?? 'hp';
  const baseAmount = Number.isFinite(raw.value) ? raw.value : 0;
  if (baseAmount <= 0) return null;
  if (mode === 'percent') {
    return { value: baseAmount, mode: 'percent', target };
  }
  return { value: Math.max(0, Math.floor(baseAmount)), mode: 'fixed', target };
};

const triggerBleedProc = (targetSide: BattleSide, reason: string): number => {
  const target = targetSide === 'player' ? playerStats.value : enemyStats.value;
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  const bleedStacks = Math.max(0, getEffectStacks(target, ET.BLEED));
  if (bleedStacks <= 0) {
    log(`<span class="text-gray-400">[流血] ${reason}未触发：${targetLabel}当前无流血。</span>`);
    return 0;
  }

  const bleedSourceSide: BattleSide = targetSide === 'player' ? 'enemy' : 'player';
  const horrorRecordCount = getActiveRelicCount('bloodpool_horror_record');
  const vulnerableBonus = horrorRecordCount > 0
    ? Math.max(0, getEffectStacks(target, ET.VULNERABLE)) * horrorRecordCount
    : 0;
  const bleedDamage = bleedStacks + vulnerableBonus;
  const { actualDamage, logs: bleedLogs } = applyDamageToSideWithRelics(targetSide, target, bleedDamage, true, '流血', {
    sourceSide: bleedSourceSide,
    dreamControlKind: targetSide === 'enemy' ? 'status' : undefined,
  });
  if (actualDamage > 0) {
    pushFloatingNumber(targetSide, actualDamage, 'true', '-');
  }
  log(`<span class="text-rose-300">[流血] ${reason}触发：${targetLabel}受到 ${actualDamage} 点真实伤害。</span>`);
  if (vulnerableBonus > 0) {
    logRelicMessage(`[惊悚唱片] ${targetLabel}敏感使本次流血伤害 +${vulnerableBonus}。`);
  }
  for (const dl of bleedLogs) {
    const normalized = dl.startsWith('受到') ? `${targetLabel}${dl}` : dl;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
  if (actualDamage > 0) {
    triggerBloodlineLifesteal(bleedSourceSide, actualDamage, '流血伤害');
  }

  if (targetSide === 'enemy' && actualDamage > 0) {
    const feastCount = getActiveRelicCount('bloodpool_first_bleed_feast');
    if (feastCount > 0 && !bloodpoolFirstBleedFeastTriggered.value) {
      bloodpoolFirstBleedFeastTriggered.value = true;
      const { healed } = healForSide('player', actualDamage * feastCount);
      logRelicMessage(`[噬血水蛭] 敌方首次受到流血伤害，回复 ${healed} 点生命。`);
    }
  }

  return actualDamage;
};

const applyBloodbladeAttachOnClash = (sourceSide: BattleSide, targetSide: BattleSide) => {
  const sourceStats = sourceSide === 'player' ? playerStats.value : enemyStats.value;
  const stacks = getEffectStacks(sourceStats, ET.BLOODBLADE_ATTACH);
  if (stacks <= 0) return;
  applyStatusEffectWithRelics(targetSide, ET.BLEED, stacks, { source: 'effect:bloodblade_attach', lockDecayThisTurn: true });
  const sourceLabel = sourceSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-rose-300">${sourceLabel}[血刃附加] 为对方施加了 ${stacks} 层流血。</span>`);
};

const applyEerieStatueOnPlayerActionCard = (card: CardData) => {
  const statueCount = getActiveRelicCount('bloodpool_eerie_statue');
  if (statueCount <= 0 || card.id === PASS_CARD.id || card.type === CardType.ACTIVE) return;
  const stacks = Math.max(1, Math.floor(statueCount));
  if (applyStatusEffectWithRelics('enemy', ET.BLEED, stacks, {
    source: 'relic:bloodpool_eerie_statue',
    lockDecayThisTurn: true,
  })) {
    logRelicMessage(`[诡异雕像] 使用行动牌【${card.name}】，对敌方施加 ${stacks} 层流血。`);
  }
};

const applyLightningAttachOnDodge = (dodgerSide: BattleSide, targetSide: BattleSide) => {
  const sourceStats = dodgerSide === 'player' ? playerStats.value : enemyStats.value;
  const stacks = getEffectStacks(sourceStats, ET.LIGHTNING_ATTACH);
  if (stacks <= 0) return;
  applyStatusEffectWithRelics(targetSide, ET.SHOCK, stacks, { source: 'effect:lightning_attach' });
  const sourceLabel = dodgerSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-indigo-300">${sourceLabel}[雷电附加] 为对方施加了 ${stacks} 层电击。</span>`);
};

const cardEffectMatchesTrigger = (effectTrigger: CardEffectTrigger[] | undefined, trigger: CardEffectTrigger) => {
  if (!effectTrigger || effectTrigger.length === 0) return trigger === 'on_use';
  return effectTrigger.includes(trigger);
};

const applyCardEffectsByTrigger = (
  source: BattleSide,
  card: CardData,
  finalPoint: number,
  trigger: CardEffectTrigger = 'on_use',
  kindMode: 'all' | 'pre_reroll_self_buff_only' | 'post_reroll_on_use' = 'all',
) => {
  const attacker = source === 'player' ? playerStats.value : enemyStats.value;
  const defender = source === 'player' ? enemyStats.value : playerStats.value;
  const label = source === 'player' ? '我方' : '敌方';
  const triggerTextMap: Partial<Record<CardEffectTrigger, string>> = {
    on_clash_fail: '拼点失败',
    on_dodge_success: '闪避成功',
    on_opponent_skip: '对方跳过回合',
    on_no_direct_damage_taken_this_turn: '本回合未受到直接伤害',
    on_turn_end_in_hand: '回合结束时保留在手牌中',
  };
  let hasEffect = false;
  for (const ce of card.cardEffects) {
    if (!cardEffectMatchesTrigger(ce.triggers, trigger)) continue;
    const targetKey = ce.target ?? 'self';
    if (kindMode === 'pre_reroll_self_buff_only') {
      if (trigger !== 'on_use' || ce.kind !== 'apply_buff' || targetKey !== 'self') continue;
    }
    if (
      kindMode === 'post_reroll_on_use'
      && trigger === 'on_use'
      && card.traits.reroll !== 'none'
      && ce.kind === 'apply_buff'
      && targetKey === 'self'
    ) {
      continue;
    }
    const targetEntity = targetKey === 'self' ? attacker : defender;
    const targetSide = resolveTargetSide(source, targetKey);

    if (ce.kind === 'heal') {
      const healAmount = ce.valueMode === 'point_scale'
        ? Math.floor(finalPoint * (ce.scale ?? 1))
        : ce.valueMode === 'max_hp_percent'
          ? Math.floor(targetEntity.maxHp * (ce.scale ?? 0))
          : Math.floor(ce.fixedValue ?? 0);
      const { healed } = healForSide(targetSide, healAmount, {
        sourceSide: source,
        reason: `卡牌【${card.name}】治疗`,
      });
      log(`<span class="text-green-400">${label}【${card.name}】回复了 ${healed} 点生命</span>`);
      hasEffect = true;
    } else if (ce.kind === 'damage') {
      const rawDamage = ce.valueMode === 'point_scale'
        ? Math.floor(finalPoint * (ce.scale ?? 1))
        : ce.valueMode === 'max_hp_percent'
          ? Math.floor(targetEntity.maxHp * (ce.scale ?? 0))
          : Math.floor(ce.fixedValue ?? 0);
      const damageAmount = Math.max(0, rawDamage);
      if (damageAmount <= 0) continue;
      const damageCard: CardData = {
        ...card,
        damageLogic: { mode: 'fixed', value: damageAmount },
      };
      const damageResult = calculateFinalDamage({
        finalPoint,
        card: damageCard,
        attackerEffects: attacker.effects,
        defenderEffects: targetEntity.effects,
        relicModifiers: NO_RELIC_MOD,
        isTrueDamage: ce.isTrueDamage,
      });
      const armorBeforeHit = getEffectStacks(targetEntity, ET.ARMOR);
      const barrierBeforeHit = getEffectStacks(targetEntity, ET.BARRIER);
      const { actualDamage, logs: applyLogs } = applyDamageToSideWithRelics(
        targetSide,
        targetEntity,
        damageResult.damage,
        damageResult.isTrueDamage,
        `卡牌【${card.name}】`,
        { sourceSide: source, isDirectDamage: ce.isDirectDamage, card: damageCard },
      );
      const armorBlocked =
        actualDamage <= 0
        && !damageResult.isTrueDamage
        && damageResult.damage > 0
        && barrierBeforeHit <= 0
        && armorBeforeHit > 0;
      if (actualDamage > 0 || armorBlocked) {
        const damageKind: FloatingNumberKind = damageResult.isTrueDamage
          ? 'true'
          : (card.type === CardType.MAGIC ? 'magic' : 'physical');
        pushFloatingNumber(targetSide, actualDamage, damageKind, '-', {
          allowZero: armorBlocked,
        });
      }
      const targetLabel = targetSide === 'player' ? '我方' : '敌方';
      const triggerText = triggerTextMap[trigger];
      log(`<span class="text-fuchsia-300">${label}【${card.name}】${triggerText ? `${triggerText}，` : ''}对${targetLabel}造成 ${actualDamage} 点伤害。</span>`);
      for (const damageLog of damageResult.logs) {
        if (damageLog.startsWith('原始伤害:')) continue;
        log(`<span class="text-gray-500 text-[9px]">${damageLog}</span>`);
      }
      for (const applyLog of applyLogs) {
        const normalized = applyLog.startsWith('受到') ? `${targetLabel}${applyLog}` : applyLog;
        log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
      }
      hasEffect = true;
    } else if (ce.kind === 'apply_buff') {
      const beforeMaxHp = targetEntity.maxHp;
      const beforeHp = targetEntity.hp;
      const stacks = ce.valueMode === 'point_scale'
        ? Math.floor(finalPoint * (ce.scale ?? 1))
        : ce.valueMode === 'max_hp_percent'
          ? Math.floor(targetEntity.maxHp * (ce.scale ?? 0))
          : Math.floor(ce.fixedValue ?? 1);
      const applied = applyStatusEffectWithRelics(targetSide, ce.effectType!, stacks, {
        restrictedTypes: ce.restrictedTypes,
        source: card.id,
        durationTurns: ce.durationTurns,
        lockDecayThisTurn: ce.effectType === ET.BIND
          || ce.effectType === ET.SILENCE
          || ce.effectType === ET.STUN
          || ce.effectType === ET.CONTROLLED
          || ce.effectType === ET.BLEED
          || ce.effectType === ET.CORRODE
          || ce.effectType === ET.CO_DAMAGE,
      });
      if (!applied) {
        continue;
      }
      if (ce.effectType === ET.ARMOR) {
        pushFloatingNumber(targetSide, stacks, 'shield', '+');
        if (targetSide === 'player') {
          handlePlayerArmorGainFromSingleEvent(stacks, `卡牌【${card.name}】`);
        }
      }
      if (ce.effectType === ET.MAX_HP_REDUCTION) {
        const actualMaxHpLoss = Math.max(0, beforeMaxHp - targetEntity.maxHp);
        const hpLossByCap = Math.max(0, beforeHp - targetEntity.hp);
        if (hpLossByCap > 0) {
          pushFloatingNumber(targetSide, hpLossByCap, 'true', '-');
        }
        log(`<span class="text-fuchsia-300">${label}【${card.name}】使目标生命上限 -${actualMaxHpLoss}${hpLossByCap > 0 ? `（当前生命 -${hpLossByCap}）` : ''}</span>`);
      } else if (ce.effectType === ET.TEMP_MAX_HP) {
        const actualMaxHpGain = Math.max(0, targetEntity.maxHp - beforeMaxHp);
        log(`<span class="text-rose-300">${label}【${card.name}】使目标临时生命上限 +${actualMaxHpGain}</span>`);
      } else {
        log(`<span class="text-yellow-400">${label}【${card.name}】获得了 ${stacks} 层${EFFECT_REGISTRY[ce.effectType!]?.name ?? ce.effectType}</span>`);
      }
      hasEffect = true;
    } else if (ce.kind === 'restore_mana') {
      const restoreAmount = ce.valueMode === 'point_scale'
        ? Math.floor(finalPoint * (ce.scale ?? 1))
        : Math.floor(ce.fixedValue ?? 0);
      const manaResult = changeManaWithShock(
        targetSide,
        restoreAmount,
        `法力变化（${label}【${card.name}】）`,
        { showPositiveFloating: true },
      );
      const actualRestore = Math.max(0, manaResult.actualDelta);
      if (actualRestore > 0) {
        log(`<span class="text-blue-400">${label}【${card.name}】回复了 ${actualRestore} 点魔力</span>`);
        hasEffect = true;
      } else if (manaResult.actualDelta < 0) {
        log(`<span class="text-blue-400">${label}【${card.name}】使目标法力减少 ${Math.abs(manaResult.actualDelta)} 点</span>`);
        hasEffect = true;
      } else if (restoreAmount !== 0) {
        log(`<span class="text-blue-400">${label}【${card.name}】未造成法力变化</span>`);
        hasEffect = true;
      }
    } else if (ce.kind === 'cleanse') {
      const cleanseTargets = ce.cleanseTypes && ce.cleanseTypes.length > 0
        ? ce.cleanseTypes
        : targetEntity.effects.map((eff) => eff.type);
      for (const et of cleanseTargets) {
        removeEffect(targetEntity, et);
      }
      log(`<span class="text-cyan-300">${label}【${card.name}】清除了负面效果</span>`);
      hasEffect = true;
    } else if (ce.kind === 'modify_dice') {
      const beforeMinDice = targetEntity.minDice;
      const beforeMaxDice = targetEntity.maxDice;
      const minMultiplier = ce.minDiceMultiplier ?? 1;
      const maxMultiplier = ce.maxDiceMultiplier ?? 1;
      const minDelta = Math.floor(ce.minDiceDelta ?? 0);
      const maxDelta = Math.floor(ce.maxDiceDelta ?? 0);
      let nextMinDice = Math.floor(beforeMinDice * minMultiplier) + minDelta;
      let nextMaxDice = Math.floor(beforeMaxDice * maxMultiplier) + maxDelta;
      nextMinDice = Math.max(0, nextMinDice);
      nextMaxDice = Math.max(nextMinDice, nextMaxDice);
      targetEntity.minDice = nextMinDice;
      targetEntity.maxDice = nextMaxDice;
      const targetLabel = targetKey === 'self' ? '自身' : '目标';
      log(`<span class="text-violet-300">${label}【${card.name}】使${targetLabel}最小/最大点数 ${beforeMinDice}~${beforeMaxDice} → ${nextMinDice}~${nextMaxDice}</span>`);
      hasEffect = true;
    } else if (ce.kind === 'escape') {
      if (endCombatPending.value) continue;
      const reasonText = triggerTextMap[trigger];
      log(`<span class="text-zinc-300">${label}【${card.name}】${reasonText ? `${reasonText}后` : ''}逃离了战斗。</span>`);
      endCombatPending.value = true;
      void runEndCombatSequence(source === 'player' ? 'win' : 'escape');
      hasEffect = true;
    }
  }

  return hasEffect;
};

const triggerShadowAssaultDamage = (
  source: BattleSide,
  card: CardData,
  finalPoint: number,
  trigger: 'on_dodge_success' | 'on_opponent_skip',
) => {
  if (card.id !== 'enemy_shadow_jailer_shadow_assault') return;

  const attacker = source === 'player' ? playerStats.value : enemyStats.value;
  const defender = source === 'player' ? enemyStats.value : playerStats.value;
  const label = source === 'player' ? '我方' : '敌方';
  const defenderSide = source === 'player' ? 'enemy' : 'player';
  const defenderLabel = defenderSide === 'player' ? '我方' : '敌方';
  const triggerText = trigger === 'on_dodge_success' ? '闪避成功' : '对方跳过回合';

  const damageCard: CardData = {
    ...card,
    type: CardType.PHYSICAL,
    damageLogic: { mode: 'relative', scale: 1.0, scaleAddition: 0 },
  };

  const { damage, isTrueDamage, logs: dmgLogs } = calculateFinalDamage({
    finalPoint,
    card: damageCard,
    attackerEffects: attacker.effects,
    defenderEffects: defender.effects,
    relicModifiers: NO_RELIC_MOD,
  });
  const adjustedDamage = defenderSide === 'player'
    ? applyPlayerSkinMarkDamageReduction(damage, `${defenderLabel}受击`)
    : damage;
  const armorBeforeHit = getEffectStacks(defender, ET.ARMOR);
  const barrierBeforeHit = getEffectStacks(defender, ET.BARRIER);
  const { actualDamage, logs: applyLogs } = applyDamageToSideWithRelics(
    defenderSide,
    defender,
    adjustedDamage,
    isTrueDamage,
    `卡牌【${card.name}】(${triggerText})`,
    { sourceSide: source, isDirectDamage: true, card },
  );
  const damageLogColorClass = isTrueDamage ? 'text-zinc-500' : 'text-red-400';
  log(`${label}【${card.name}】${triggerText}触发，造成 <span class="${damageLogColorClass} font-bold">${actualDamage}</span> 点伤害`);
  const armorBlocked =
    actualDamage <= 0
    && !isTrueDamage
    && adjustedDamage > 0
    && barrierBeforeHit <= 0
    && armorBeforeHit > 0;
  if (actualDamage > 0 || armorBlocked) {
    pushFloatingNumber(defenderSide, actualDamage, isTrueDamage ? 'true' : 'physical', '-', {
      allowZero: armorBlocked,
    });
  }
  for (const dl of dmgLogs) {
    if (dl.startsWith('原始伤害:')) continue;
    log(`<span class="text-gray-500 text-[9px]">${dl}</span>`);
  }
  for (const dl of applyLogs) {
    const normalized = dl.startsWith('受到') ? `${defenderLabel}${dl}` : dl;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
  triggerPlayerRelicHitHooks(
    source,
    defenderSide,
    card,
    finalPoint,
    1,
    1,
    adjustedDamage,
    actualDamage,
  );
  triggerObedienceBrandOnDirectHit(source, defenderSide);
  const reviveResult = triggerSwarmReviveIfNeeded(defender);
  for (const reviveLog of reviveResult.logs) {
    log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
  }
};

const applyToxinSpreadOnPhysicalPlay = (source: BattleSide, card: CardData) => {
  if (card.id === PASS_CARD.id || card.type !== CardType.PHYSICAL) return;

  const spreadOwnerSide: BattleSide = source === 'player' ? 'enemy' : 'player';
  const spreadOwner = spreadOwnerSide === 'player' ? playerStats.value : enemyStats.value;
  const spreadStacks = getEffectStacks(spreadOwner, ET.TOXIN_SPREAD);
  if (spreadStacks <= 0) return;

  applyStatusEffectWithRelics(source, ET.POISON, spreadStacks, { source: 'effect:toxin_spread' });
  const sourceLabel = source === 'player' ? '我方' : '敌方';
  const spreadOwnerLabel = spreadOwnerSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-emerald-300">${spreadOwnerLabel}[毒素蔓延] ${sourceLabel}打出物理牌，获得 ${spreadStacks} 层中毒。</span>`);
};

const applyAmbushOnCardPlay = (source: BattleSide, card: CardData) => {
  if (card.id === PASS_CARD.id) return;
  if (card.type !== CardType.PHYSICAL && card.type !== CardType.DODGE) return;

  const ambushOwnerSide: BattleSide = source === 'player' ? 'enemy' : 'player';
  const ambushOwner = ambushOwnerSide === 'player' ? playerStats.value : enemyStats.value;
  const ambushStacks = getEffectStacks(ambushOwner, ET.AMBUSH);
  if (ambushStacks <= 0) return;

  applyStatusEffectWithRelics(source, ET.BIND, 1, {
    source: 'effect:ambush',
    lockDecayThisTurn: true,
  });
  reduceEffectStacks(ambushOwner, ET.AMBUSH, 1);

  const sourceLabel = source === 'player' ? '我方' : '敌方';
  const ambushOwnerLabel = ambushOwnerSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-violet-300">${ambushOwnerLabel}[伏击] 触发：${sourceLabel}获得 1 层束缚。</span>`);
};

const withIgnoreDodgeBuffOnAttackCard = (source: BattleSide, card: CardData): CardData => {
  if (card.id === PASS_CARD.id) return card;
  if (card.type !== CardType.PHYSICAL && card.type !== CardType.MAGIC) return card;

  const sourceStats = source === 'player' ? playerStats.value : enemyStats.value;
  const stacks = getEffectStacks(sourceStats, ET.IGNORE_DODGE);
  if (stacks <= 0) return card;

  reduceEffectStacks(sourceStats, ET.IGNORE_DODGE, 1);
  const sourceLabel = source === 'player' ? '我方' : '敌方';
  log(`<span class="text-indigo-300">${sourceLabel}[无视闪避] 本次攻击获得无视闪避（剩余${Math.max(0, getEffectStacks(sourceStats, ET.IGNORE_DODGE))}层）</span>`);

  if (card.ignoreDodge) return card;
  const boosted = cloneCardForBattle(card);
  boosted.ignoreDodge = true;
  return boosted;
};

const triggerObedienceBrandOnDirectHit = (
  attackerSide: BattleSide,
  defenderSide: BattleSide,
) => {
  const attacker = attackerSide === 'player' ? playerStats.value : enemyStats.value;
  const defender = defenderSide === 'player' ? playerStats.value : enemyStats.value;
  const attackerLabel = attackerSide === 'player' ? '我方' : '敌方';
  const defenderLabel = defenderSide === 'player' ? '我方' : '敌方';

  const defenderObedienceStacks = Math.max(0, getEffectStacks(defender, ET.OBEDIENCE_BRAND));
  if (defenderObedienceStacks > 0) {
    const applied = applyStatusEffectWithRelics(attackerSide, ET.BRAND_MARK, defenderObedienceStacks, {
      source: 'effect:obedience_brand',
      lockDecayThisTurn: true,
    });
    if (applied) {
      log(`<span class="text-fuchsia-300">${defenderLabel}[服从烙印] 为${attackerLabel}施加了 ${defenderObedienceStacks} 层烙印</span>`);
    }
  }

  const attackerObedienceStacks = Math.max(0, getEffectStacks(attacker, ET.OBEDIENCE_BRAND));
  if (attackerObedienceStacks <= 0) return;
  const targetBrandStacks = Math.max(0, getEffectStacks(defender, ET.BRAND_MARK));
  if (targetBrandStacks <= 0) return;
  const { healed } = healForSide(attackerSide, targetBrandStacks);
  if (healed > 0) {
    log(`<span class="text-emerald-300">${attackerLabel}[服从烙印] 命中后按目标烙印回复 ${healed} 点生命</span>`);
  }
};

const withFirstUseLightningAmbushBonus = (
  source: BattleSide,
  card: CardData,
  options?: { consume?: boolean; announce?: boolean },
): CardData => {
  if (card.id !== 'enemy_vinewalker_lightning_ambush') return card;
  if (lightningAmbushFirstUseConsumed.value[source]) return card;

  const shouldConsume = options?.consume ?? true;
  const shouldAnnounce = options?.announce ?? shouldConsume;
  if (shouldConsume) {
    lightningAmbushFirstUseConsumed.value[source] = true;
  }
  const boosted = cloneCardForBattle(card);
  boosted.calculation.addition += 4;

  if (shouldAnnounce) {
    const sourceLabel = source === 'player' ? '我方' : '敌方';
    log(`<span class="text-indigo-300">${sourceLabel}【${card.name}】首次使用，点数 +4</span>`);
  }
  return boosted;
};

const getBattleCardUseCount = (side: BattleSide, cardId: string): number => (
  Math.max(0, Math.floor(battleCardPointBonus.value[side][cardId] ?? 0))
);

const markBattleCardFirstUse = (side: BattleSide, cardId: string): boolean => {
  if (battleCardFirstUseConsumed.value[side][cardId]) return false;
  battleCardFirstUseConsumed.value[side][cardId] = true;
  return true;
};

const increaseBattleCardPointBonus = (side: BattleSide, cardId: string, amount: number, maxBonus: number) => {
  const next = Math.min(
    Math.max(0, Math.floor(maxBonus)),
    Math.max(0, getBattleCardUseCount(side, cardId) + Math.floor(amount)),
  );
  battleCardPointBonus.value[side][cardId] = next;
  return next;
};

const adjustTurnPointModifier = (side: BattleSide, amount: number) => {
  turnPointModifier.value[side] = Math.floor(turnPointModifier.value[side] + amount);
  return turnPointModifier.value[side];
};

const getActiveSkillManaCost = (idx: number): number => {
  const skill = normalizedPlayerActiveSkills.value[idx];
  if (!skill) return 0;
  const runtime = activeSkillRuntime.value[idx];
  return Math.max(0, Math.floor(skill.manaCost) + Math.max(0, Math.floor(runtime?.manaTaxThisTurn ?? 0)));
};

const getOpposingCardForPointComparison = (source: BattleSide): { side: BattleSide; card: CardData | null; baseDice: number } => {
  if (source === 'player') {
    return {
      side: 'enemy',
      card: combatState.value.enemyIntentCard ?? null,
      baseDice: combatState.value.enemyBaseDice,
    };
  }
  return {
    side: 'player',
    card: combatState.value.playerSelectedCard ?? null,
    baseDice: combatState.value.playerBaseDice,
  };
};

const COGNITIVE_SWAP_BLOCKED_EFFECTS = new Set<EffectType>([
  ET.DEVOUR,
  ET.CONTROLLED,
  ET.BLIND_ASH,
  ET.PEEP_FORBIDDEN,
  ET.COGNITIVE_INTERFERENCE,
  ET.MEMORY_FOG,
]);

const transferDebuffsBetweenSides = (from: BattleSide, to: BattleSide): number => {
  const sourceStats = from === 'player' ? playerStats.value : enemyStats.value;
  const targetStats = to === 'player' ? playerStats.value : enemyStats.value;
  const debuffs = sourceStats.effects
    .filter(effect => (
      EFFECT_REGISTRY[effect.type]?.polarity === 'debuff'
      && effect.stacks > 0
      && !COGNITIVE_SWAP_BLOCKED_EFFECTS.has(effect.type)
    ))
    .map(effect => ({
      type: effect.type,
      stacks: effect.stacks,
      source: effect.source,
      lockDecayThisTurn: effect.lockDecayThisTurn,
      restrictedTypes: effect.restrictedTypes ? [...effect.restrictedTypes] : undefined,
      runtimeCounter: effect.runtimeCounter,
      durationTurnsRemaining: effect.durationTurnsRemaining,
    }));

  for (const effect of debuffs) {
    removeEffect(sourceStats, effect.type);
    applyEffect(targetStats, effect.type, effect.stacks, {
      source: effect.source,
      lockDecayThisTurn: effect.lockDecayThisTurn,
      restrictedTypes: effect.restrictedTypes,
      durationTurns: effect.durationTurnsRemaining,
    });
    const transferredEffect = targetStats.effects.find((entry) => entry.type === effect.type);
    if (transferredEffect) {
      transferredEffect.runtimeCounter = effect.runtimeCounter;
      transferredEffect.durationTurnsRemaining = effect.durationTurnsRemaining;
    }
  }
  return debuffs.length;
};

const countDistinctDebuffTypes = (entity: EntityStats): number => {
  const debuffTypes = entity.effects
    .filter(effect => effect.stacks > 0 && EFFECT_REGISTRY[effect.type]?.polarity === 'debuff')
    .map(effect => effect.type);
  return new Set(debuffTypes).size;
};

const hasNoDuplicateBattleCardsForSide = (side: BattleSide, currentCard?: CardData): boolean => {
  const seen = new Set<string>();
  for (const card of collectCardsForSide(side, currentCard)) {
    if (card.id === PASS_CARD.id) continue;
    if (seen.has(card.id)) return false;
    seen.add(card.id);
  }
  return true;
};

const countDistinctCardTypesForSide = (side: BattleSide, currentCard?: CardData): number => {
  const types = collectCardsForSide(side, currentCard)
    .filter(card => card.id !== PASS_CARD.id && card.type !== CardType.ACTIVE)
    .map(card => card.type);
  return new Set(types).size;
};

const countHandCardTypesForSide = (side: BattleSide, currentCard?: CardData): number => {
  const cards = side === 'player' ? [...combatState.value.playerHand] : [];
  if (currentCard && currentCard.id !== PASS_CARD.id) cards.push(currentCard);
  return new Set(cards.map(card => card.type)).size;
};

const getRandomRareBattleCard = (): CardData | null => {
  const rarePool = getAllCards().filter(card => (
    card.category !== '敌人'
    && card.type !== CardType.ACTIVE
    && card.type !== CardType.CURSE
    && card.rarity === '稀有'
  ));
  if (rarePool.length <= 0) return null;
  return cloneCardForBattle(rarePool[Math.floor(Math.random() * rarePool.length)]!);
};

const applyAlchemyBattleStartRelics = () => {
  if (hasNoDuplicateBattleCardsForSide('player')) {
    const fiveColorPotionCount = getActiveRelicCount('alchemy_five_color_potion');
    if (fiveColorPotionCount > 0 && applyStatusEffectWithRelics('player', ET.ELEMENT_ATTACH, fiveColorPotionCount, { source: 'relic:alchemy_five_color_potion' })) {
      logRelicMessage(`[五色药剂] 牌组无重复，获得 ${fiveColorPotionCount} 层元素附加。`);
    }

    const midasHandCount = getActiveRelicCount('alchemy_midas_hand');
    if (midasHandCount > 0) {
      let transformed = 0;
      combatState.value.playerDeck = combatState.value.playerDeck.map(card => {
        if (card.type !== CardType.CURSE) return card;
        const replacement = getRandomRareBattleCard();
        if (!replacement) return card;
        transformed += 1;
        return replacement;
      });
      if (transformed > 0) {
        logRelicMessage(`[点金手] 牌组无重复，将 ${transformed} 张诅咒牌转化为随机稀有牌。`);
      }
    }

    const perfumeBottleCount = getActiveRelicCount('alchemy_perfume_bottle');
    if (perfumeBottleCount > 0) {
      const candidates = collectUniqueCombatCardsForSide('player').filter(card => card.type !== CardType.CURSE);
      const picked = candidates[Math.floor(Math.random() * candidates.length)] ?? null;
      if (picked) {
        alchemyPerfumePointDoubleCardIds.value.player[picked.id] = true;
        logRelicMessage(`[香水瓶] 牌组无重复，使【${picked.name}】本场战斗打出时点数 x2。`);
      }
    }
  }
};

const applyAlchemyDizzyFruitOnTurnStart = () => {
  const dizzyFruitCount = getActiveRelicCount('alchemy_dizzy_fruit');
  if (dizzyFruitCount <= 0) return;
  const synced: string[] = [];
  for (const effect of playerStats.value.effects) {
    if (effect.stacks <= 0 || EFFECT_REGISTRY[effect.type]?.polarity !== 'debuff') continue;
    const enemyStacks = getEffectStacks(enemyStats.value, effect.type);
    const delta = Math.max(0, Math.floor(effect.stacks - enemyStacks));
    if (delta <= 0) continue;
    if (applyStatusEffectWithRelics('enemy', effect.type, delta, { source: 'relic:alchemy_dizzy_fruit' })) {
      synced.push(`${EFFECT_REGISTRY[effect.type]?.name ?? effect.type}+${delta}`);
    }
  }
  if (synced.length > 0) {
    logRelicMessage(`[晕晕果] 同步敌方负面状态：${synced.join('，')}。`);
  }
};

const replacePlayerHandWithRandomRareCards = (count: number): CardData[] => {
  const rarePool = getAllCards().filter(card => card.category !== '敌人' && card.type !== CardType.ACTIVE && card.rarity === '稀有');
  const nextHand: CardData[] = [];
  for (let i = 0; i < count; i++) {
    if (rarePool.length <= 0) break;
    const picked = rarePool[Math.floor(Math.random() * rarePool.length)]!;
    nextHand.push(cloneCardForBattle(picked));
  }
  return nextHand;
};

const collectCardsForSide = (side: BattleSide, currentCard?: CardData): CardData[] => {
  const cards: CardData[] = [];
  if (side === 'player') {
    cards.push(...combatState.value.playerHand, ...combatState.value.playerDeck, ...combatState.value.discardPile);
    if (combatState.value.playerSelectedCard) cards.push(combatState.value.playerSelectedCard);
  } else {
    cards.push(...combatState.value.enemyDeck, ...combatState.value.enemyDiscard);
    if (combatState.value.enemyIntentCard) cards.push(combatState.value.enemyIntentCard);
  }
  if (currentCard) cards.push(currentCard);
  return cards;
};

const collectUniqueCombatCardsForSide = (side: BattleSide): CardData[] => {
  const seen = new Set<string>();
  const result: CardData[] = [];
  for (const card of collectCardsForSide(side)) {
    if (card.id === PASS_CARD.id || seen.has(card.id)) continue;
    seen.add(card.id);
    result.push(card);
  }
  return result;
};

type AlchemyGrandSynthesisPile = 'hand' | 'deck' | 'discard' | 'intent';

interface AlchemyGrandSynthesisChoice {
  card: CardData;
  pile: AlchemyGrandSynthesisPile;
  index: number;
}

const collectAlchemyGrandSynthesisChoicesForSide = (side: BattleSide): AlchemyGrandSynthesisChoice[] => {
  const entries: AlchemyGrandSynthesisChoice[] = [];
  const pushCards = (pile: AlchemyGrandSynthesisPile, cards: readonly CardData[]) => {
    cards.forEach((card, index) => {
      if (card.id === PASS_CARD.id || card.type === CardType.CURSE) return;
      entries.push({ card, pile, index });
    });
  };

  if (side === 'player') {
    pushCards('hand', combatState.value.playerHand);
    pushCards('deck', combatState.value.playerDeck);
    pushCards('discard', combatState.value.discardPile);
    return entries;
  }

  pushCards('deck', combatState.value.enemyDeck);
  pushCards('discard', combatState.value.enemyDiscard);
  if (
    combatState.value.enemyIntentCard
    && combatState.value.enemyIntentCard.id !== PASS_CARD.id
    && combatState.value.enemyIntentCard.type !== CardType.CURSE
  ) {
    entries.push({ card: combatState.value.enemyIntentCard, pile: 'intent', index: 0 });
  }
  return entries;
};

const countBattleCardsForSide = (
  side: BattleSide,
  currentCard: CardData | undefined,
  predicate: (card: CardData) => boolean,
): number => {
  const cards = side === 'player'
    ? [...combatState.value.playerHand, ...combatState.value.playerDeck, ...combatState.value.discardPile]
    : [...combatState.value.enemyDeck, ...combatState.value.enemyDiscard];
  const selected = side === 'player' ? combatState.value.playerSelectedCard : combatState.value.enemyIntentCard;
  if (selected && !cards.includes(selected)) cards.push(selected);
  if (currentCard && !cards.includes(currentCard)) cards.push(currentCard);
  return cards.filter(predicate).length;
};

const getAlchemyGoldenFlashHitCount = (source: BattleSide, card: CardData): number => {
  if (card.id !== 'alchemy_golden_flash') return Math.max(1, Math.floor(card.hitCount ?? 1));
  const hand = source === 'player' ? combatState.value.playerHand : [];
  const rareInHand = hand.filter(entry => entry.rarity === '稀有').length + (card.rarity === '稀有' ? 1 : 0);
  return Math.max(1, 1 + rareInHand);
};

const alchemyGrandSynthesisChoices = computed(() => collectAlchemyGrandSynthesisChoicesForSide('player'));

const getAlchemyGrandSynthesisPointBonus = (side: BattleSide, card: CardData): number => {
  void alchemyGrandSynthesisPointBonusVersion.value;
  return Math.max(0, Math.floor(alchemyGrandSynthesisPointBonusByCard.value[side].get(card) ?? 0));
};

const increaseAlchemyGrandSynthesisPointBonus = (side: BattleSide, card: CardData, amount: number) => {
  const current = getAlchemyGrandSynthesisPointBonus(side, card);
  const next = Math.max(0, current + Math.floor(amount));
  alchemyGrandSynthesisPointBonusByCard.value[side].set(card, next);
  alchemyGrandSynthesisPointBonusVersion.value += 1;
  return next;
};

const countMagicCardsInDeckForSide = (side: BattleSide): number => {
  const deck = side === 'player' ? combatState.value.playerDeck : combatState.value.enemyDeck;
  return deck.filter(card => card.type === CardType.MAGIC).length;
};

const isOnlyPhysicalCardForSide = (side: BattleSide, card: CardData): boolean => {
  if (card.type !== CardType.PHYSICAL) return false;
  const physicalIds = new Set(
    collectCardsForSide(side, card)
      .filter(item => item.type === CardType.PHYSICAL)
      .map(item => item.id),
  );
  return physicalIds.size === 1 && physicalIds.has(card.id);
};

const hasNoPhysicalOrMagicInHand = (side: BattleSide, currentCard?: CardData): boolean => {
  const handCards = side === 'player'
    ? [...combatState.value.playerHand]
    : [];
  if (currentCard && !handCards.some(card => card === currentCard)) {
    handCards.push(currentCard);
  }
  return !handCards.some(card => card.type === CardType.PHYSICAL || card.type === CardType.MAGIC);
};

let poisonAmountImmediateCheckRunning = false;
const applyImmediatePoisonAmountLethalCheck = (side: BattleSide) => {
  const target = side === 'player' ? playerStats.value : enemyStats.value;
  if (target.hp <= 0) return;

  const poisonAmount = getEffectStacks(target, ET.POISON_AMOUNT);
  if (poisonAmount <= 0 || poisonAmount < target.hp) return;

  removeEffect(target, ET.POISON_AMOUNT);
  const { actualDamage, logs: poisonLogs } = applyDamageToSideWithRelics(
    side,
    target,
    poisonAmount,
    true,
    '中毒量',
    { skipHeartMark: true },
  );
  if (actualDamage > 0) {
    pushFloatingNumber(side, actualDamage, 'true', '-');
  }

  const label = side === 'player' ? '我方' : '敌方';
  log(`<span class="text-zinc-300">${label}[中毒量] 即时致死判定触发，造成 ${actualDamage} 点真实伤害</span>`);
  for (const poisonLog of poisonLogs) {
    const normalized = poisonLog.startsWith('受到') ? `${label}${poisonLog}` : poisonLog;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
  if (side === 'player' && actualDamage > 0 && target.hp <= 0) {
    queuePlayerLethalNegativeStatus(PLAYER_POISON_LETHAL_NEGATIVE_STATUS, '中毒量致死判定');
  }
};

const processPhaseTransitionTurnEnd = (side: BattleSide) => {
  const target = side === 'player' ? playerStats.value : enemyStats.value;
  if (target.hp <= 0) return;

  const phaseTransitionStacks = Math.max(0, getEffectStacks(target, ET.PHASE_TRANSITION));
  const poisonAmount = Math.max(0, getEffectStacks(target, ET.POISON_AMOUNT));
  if (phaseTransitionStacks <= 0 || poisonAmount <= 0) return;
  if (target.hp - poisonAmount >= phaseTransitionStacks) return;

  removeEffect(target, ET.POISON_AMOUNT);
  removeEffect(target, ET.PHASE_TRANSITION);

  const damage = Math.max(0, Math.floor(target.hp - phaseTransitionStacks));
  let actualDamage = 0;
  let damageLogs: string[] = [];
  if (damage > 0) {
    const result = applyDamageToSideWithRelics(
      side,
      target,
      damage,
      true,
      '转阶段',
      { skipHeartMark: true },
    );
    actualDamage = result.actualDamage;
    damageLogs = result.logs;
    if (actualDamage > 0) {
      pushFloatingNumber(side, actualDamage, 'true', '-');
    }
  }
  target.hp = Math.max(target.hp, phaseTransitionStacks);

  const label = side === 'player' ? '我方' : '敌方';
  log(`<span class="text-violet-300">${label}[转阶段] 中毒量 ${poisonAmount} 将使生命低于 ${phaseTransitionStacks}，结算中毒量并锁定生命不低于 ${phaseTransitionStacks}（实际伤害 ${actualDamage}）。</span>`);
  for (const poisonLog of damageLogs) {
    const normalized = poisonLog.startsWith('受到') ? `${label}${poisonLog}` : poisonLog;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
};

const triggerOthelloHalfHpDebuffCleanseIfNeeded = (nextHp: number, prevHp: number) => {
  if (enemyDef?.name !== '\u5965\u8d5b\u7f57') return;
  if (aiFlags.othelloHalfHpDebuffCleanseDone === true) return;
  if (!Number.isFinite(nextHp) || !Number.isFinite(prevHp)) return;

  const halfHp = enemyStats.value.maxHp * 0.5;
  if (prevHp <= halfHp || nextHp > halfHp) return;

  aiFlags.othelloHalfHpDebuffCleanseDone = true;
  enemyStats.value.effects = enemyStats.value.effects.filter(
    effect => EFFECT_REGISTRY[effect.type]?.polarity !== 'debuff',
  );
};

const queueCardNegativeEffectForPlayer = (source: BattleSide, card: CardData) => {
  if (source !== 'enemy') return;
  const negativeEffect = (card.negativeEffect ?? '').trim();
  if (!negativeEffect) return;
  if (isCustomDifficultyInfluenceActive('神圣加护')) {
    log(`<span class="text-emerald-300">[自定义难度][神圣加护] 抵消了卡牌负面效果：${negativeEffect}</span>`);
    return;
  }
  if (pendingCardNegativeEffects.value.includes(negativeEffect)) return;
  pendingCardNegativeEffects.value.push(negativeEffect);
  log(`<span class="text-fuchsia-300">我方获得负面效果：${negativeEffect}</span>`);
};

const applyHitAttachEffects = (
  source: BattleSide,
  card: CardData,
  attacker: EntityStats,
  defenderSide: RelicSide,
) => {
  const flameStacks = getEffectStacks(attacker, ET.FLAME_ATTACH);
  if (flameStacks > 0 && card.type === CardType.PHYSICAL) {
    applyStatusEffectWithRelics(defenderSide, ET.BURN, flameStacks, { source: 'effect:flame_attach' });
  }

  const poisonStacks = getEffectStacks(attacker, ET.POISON_ATTACH);
  if (poisonStacks > 0 && card.type === CardType.MAGIC) {
    applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: 'effect:poison_attach' });
  }

  const totalApplied = (card.type === CardType.PHYSICAL ? flameStacks : 0) + (card.type === CardType.MAGIC ? poisonStacks : 0);
  if (totalApplied > 0) {
    const label = source === 'player' ? '我方' : '敌方';
    log(`<span class="text-orange-300">${label}[附加效果] 命中后追加了状态效果。</span>`);
  }
};

const consumeChargeOnRoll = (stats: EntityStats, label: string, rolled: number) => {
  let next = rolled;

  const chargeStacks = getEffectStacks(stats, ET.CHARGE);
  if (chargeStacks > 0) {
    removeEffect(stats, ET.CHARGE);
    next = Math.max(0, Math.floor(next + chargeStacks));
    log(`<span class="text-cyan-300">${label}[蓄力] +${chargeStacks}，原始骰子 ${rolled} → ${next}</span>`);
  }

  const fatigueStacks = getEffectStacks(stats, ET.FATIGUE);
  if (fatigueStacks > 0) {
    removeEffect(stats, ET.FATIGUE);
    const reduced = Math.max(0, Math.floor(next - fatigueStacks));
    log(`<span class="text-amber-300">${label}[疲劳] -${fatigueStacks}，骰子 ${next} → ${reduced}</span>`);
    next = reduced;
  }

  return next;
};

const clearDicePreview = () => {
  previewPlayerDice.value = null;
  previewEnemyDice.value = null;
  playerDicePreviewLines.value = [];
  enemyDicePreviewLines.value = [];
  playerDicePreviewCardName.value = '';
  enemyDicePreviewCardName.value = '';
  if (hoverPreviewTimer) {
    clearTimeout(hoverPreviewTimer);
    hoverPreviewTimer = null;
  }
  if (enemyDicePreviewTimer) {
    clearTimeout(enemyDicePreviewTimer);
    enemyDicePreviewTimer = null;
  }
};

const clearPlayerPlayedCard = () => {
  playerPlayedCardVisual.value = null;
};

const clearResolvedCardVisual = () => {
  resolvedPlayerCardVisual.value = null;
  resolvedEnemyCardVisual.value = null;
};

const stopAllCardAnimations = () => {
  animationStopToken += 1;
  clearPlayerPlayedCard();
  clearResolvedCardVisual();
  handCardAnimations.value = {};
  impactShake.value = false;
  showClashAnimation.value = false;
  shatteringTarget.value = null;
};

const showPlayerPlayedCard = (card: CardData) => {
  if (endCombatPending.value) return;
  const token = animationStopToken;
  const id = ++playerPlayedCardVisualId;
  playerPlayedCardVisual.value = { id, card, entered: false };
  requestAnimationFrame(() => {
    if (token !== animationStopToken || endCombatPending.value) return;
    if (playerPlayedCardVisual.value?.id === id) {
      playerPlayedCardVisual.value.entered = true;
    }
  });
};

const playResolvedCardAnimation = async (source: BattleSide, card: CardData) => {
  if (card.id === PASS_CARD.id || endCombatPending.value) return;

  const token = animationStopToken;

  const variant: ResolvedCardAnimVariant =
    (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC)
      ? 'attack'
      : (card.type === CardType.DODGE ? 'fade' : 'self');
  const id = ++resolvedCardVisualId;
  const slot = source === 'player' ? resolvedPlayerCardVisual : resolvedEnemyCardVisual;
  slot.value = { id, source, card, variant };

  if (variant === 'attack') {
    const impactDelay = scaleDuration(720);
    setTimeout(() => {
      if (token !== animationStopToken || endCombatPending.value) return;
      impactShake.value = true;
      setTimeout(() => {
        if (token !== animationStopToken) return;
        impactShake.value = false;
      }, scaleDuration(220));
    }, impactDelay);
  }

  const animDuration = variant === 'attack' ? 930 : 570;
  await wait(animDuration);
  if (token !== animationStopToken || endCombatPending.value) return;
  if (slot.value?.id === id) {
    slot.value = null;
  }
};

const getMercyEffectAgainstCard = (source: BattleSide, card: CardData): EffectInstance | null => {
  if (card.id === PASS_CARD.id) return null;
  const holder = source === 'player' ? enemyStats.value : playerStats.value;
  return holder.effects.find(effect => (
    effect.type === ET.MERCY
    && effect.stacks > 0
    && effect.mercyCardType === card.type
  )) ?? null;
};

const getCardFinalPoint = (
  source: 'player' | 'enemy',
  card: CardData,
  baseDice: number,
  isPreview: boolean = false,
  suppressComparisonSpecials: boolean = false,
) => {
  const attacker = source === 'player' ? playerStats.value : enemyStats.value;
  const defender = source === 'player' ? enemyStats.value : playerStats.value;
  const shriveledHandActive = source === 'player' && getActiveRelicCount('basic_shriveled_hand') > 0;

  let finalPoint = shriveledHandActive
    ? baseDice + card.calculation.addition * 2
    : calculateFinalPoint({
        baseDice,
        card,
        entityEffects: attacker.effects,
        relicModifiers: NO_RELIC_MOD,
      });

  // 卡牌专属点数修正：敌方每有2层燃烧，点数+1
  if (card.id === 'burn_inferno_judgement') {
    finalPoint += Math.floor(getEffectStacks(defender, ET.BURN));
  }
  if (card.id === 'yanhan_ice_spike') {
    finalPoint += Math.floor(getEffectStacks(defender, ET.COLD) / 3);
  }
  if (card.id === 'bloodpool_pulse_fist') {
    const hpValue = Math.max(0, Math.floor(attacker.hp));
    finalPoint += hpValue % 2 === 0 ? -4 : 4;
  }
  if (card.id === 'bloodpool_life_drain' && isBelowHalfHp(attacker)) {
    finalPoint += 2;
  }
  if (card.id === 'bloodpool_blood_control') {
    finalPoint += Math.max(0, getEffectStacks(attacker, ET.BLEED) + 4);
  }
  if (card.id === 'enemy_executioner_puppet_execution' && source === 'enemy') {
    if (executionerPuppetPointModifier.value !== null) {
      finalPoint += executionerPuppetPointModifier.value;
    } else if (!isPreview) {
      const playerCardType = combatState.value.playerSelectedCard?.type;
      executionerPuppetPointModifier.value = playerCardType === CardType.DODGE
        ? Math.floor(Math.random() * 2) - 2
        : Math.floor(Math.random() * 2) + 1;
      finalPoint += executionerPuppetPointModifier.value;
    }
  }
  // 血债重击/嗜血重击：自身每损失指定生命，点数+1
  if (card.id === 'bloodpool_blood_debt_strike' || card.id === 'enemy_veronica_bloodthirsty_heavy_strike') {
    const divisor = card.id === 'enemy_veronica_bloodthirsty_heavy_strike' ? 9 : 3;
    const lostHp = Math.max(0, Math.floor(attacker.maxHp - attacker.hp));
    finalPoint += Math.floor(lostHp / divisor);
  }
  if (card.id === 'enemy_stitched_spider_pack_hunt') {
    finalPoint += Math.max(0, getEffectStacks(attacker, ET.SWARM));
  }
  if (card.id === 'enemy_silk_puppet_cooperative_subdue') {
    finalPoint += Math.max(0, getEffectStacks(attacker, ET.SWARM));
  }
  if (card.id === 'enemy_yustia_trueword_scale_powder') {
    finalPoint += Math.max(0, Math.floor(defender.mp));
  }
  if (card.id === 'enemy_selina_space_fold') {
    finalPoint += getSelinaSpaceFoldManaSpend(attacker);
  }
  if (card.id === 'enemy_nightmare_moth_collective_dreamweave') {
    finalPoint += Math.max(0, getEffectStacks(attacker, ET.SWARM));
  }
  if (card.id === 'enemy_moore_progressive_weaving') {
    finalPoint += getBattleCardUseCount(source, card.id);
  }
  if (card.id === 'enemy_nightmare_moth_blissful_dream') {
    finalPoint += countDistinctDebuffTypes(defender) * 2;
  }
  if (card.id === 'enemy_broken_mirror_bat_self_stripping' && getEffectStacks(defender, ET.LUST_ILLUSION) > 0) {
    finalPoint *= 2;
    if (!isPreview) {
      log(`<span class="text-fuchsia-300">${source === 'player' ? '我方' : '敌方'}【${card.name}】目标已有淫靡幻象，点数 x2</span>`);
    }
  }
  if (card.id === 'basic_sharp_attack' && isOnlyPhysicalCardForSide(source, card)) {
    finalPoint += 3;
    if (!isPreview) {
      log(`<span class="text-amber-300">${source === 'player' ? '我方' : '敌方'}【${card.name}】为当前卡组中仅有的物理卡牌，点数 +3</span>`);
    }
  }
  if (card.id === 'basic_jagged_attack') {
    finalPoint += getBattleCardUseCount(source, card.id);
  }
  if (card.id === 'basic_raid_attack' && battleCardFirstUseConsumed.value[source][card.id] !== true) {
    finalPoint += 4;
    if (!isPreview && markBattleCardFirstUse(source, card.id)) {
      log(`<span class="text-indigo-300">${source === 'player' ? '我方' : '敌方'}【${card.name}】首次使用，点数 +4</span>`);
    }
  }
  if (card.id === 'basic_targeted_slash' && source === 'player' && isCurrentOpponentLord()) {
    finalPoint += 4;
  }
  if (card.id === 'basic_stealth' && source === 'player' && hasNoPhysicalOrMagicInHand(source, card)) {
    finalPoint -= 3;
    if (!isPreview) {
      log('<span class="text-cyan-300">我方【潜行】手牌中没有物理或魔法卡牌，点数 -3</span>');
    }
  }
  if (card.id === 'basic_life_death_judgement' && baseDice === 4) {
    finalPoint *= 4;
    if (!isPreview) {
      log(`<span class="text-rose-300">${source === 'player' ? '我方' : '敌方'}【${card.name}】投掷点数为4，点数 x4</span>`);
    }
  }
  if (card.id === 'basic_scarlet_scythe' && battleCardFirstUseConsumed.value[source][card.id] !== true) {
    finalPoint *= 2;
    if (!isPreview && markBattleCardFirstUse(source, card.id)) {
      log(`<span class="text-rose-300">${source === 'player' ? '我方' : '敌方'}【${card.name}】首次使用，点数 x2</span>`);
    }
  }
  if (card.id === 'basic_slime_axe' && !suppressComparisonSpecials) {
    const opposing = getOpposingCardForPointComparison(source);
    if (opposing.card) {
      const opposingPoint = getCardFinalPoint(opposing.side, opposing.card, opposing.baseDice, true, true);
      if (finalPoint <= opposingPoint) {
        finalPoint = opposingPoint + 1;
      }
    }
  }
  if (card.id === 'modao_rune_greatsword') {
    finalPoint += countMagicCardsInDeckForSide(source) * 2;
  }
  if (card.id === 'alchemy_abnormal_overload') {
    finalPoint += countDistinctDebuffTypes(defender);
  }
  if (card.id === 'alchemy_gilded_strike') {
    const rareCount = countBattleCardsForSide(source, card, entry => entry.rarity === '稀有');
    finalPoint += rareCount * 2;
  }
  if (source === 'player' && getActiveRelicCount('alchemy_five_color_paint') > 0 && !card.traits.combo) {
    const handTypeCount = countHandCardTypesForSide(source, card);
    if (handTypeCount >= 3) {
      finalPoint *= 1.5;
      if (!isPreview) {
        logRelicMessage(`[五色颜料] 手牌类型达到 ${handTypeCount} 种，非连击牌点数 x1.5。`);
      }
    }
  }
  if (source === 'player' && getActiveRelicCount('alchemy_five_color_ring') > 0) {
    const typeCount = countDistinctCardTypesForSide(source, card);
    if (typeCount >= 5) {
      finalPoint *= 1.5;
      if (!isPreview) {
        logRelicMessage('[五色环] 牌组拥有5种卡牌类型，点数 x1.5。');
      }
    } else if (typeCount >= 4) {
      finalPoint *= 1.2;
      if (!isPreview) {
        logRelicMessage('[五色环] 牌组拥有4种卡牌类型，点数 x1.2。');
      }
    }
  }
  if (source === 'player' && getActiveRelicCount('alchemy_voodoo_doll') > 0) {
    const curseDeckBonus = Math.floor(countBattleCardsForSide(source, card, entry => entry.type === CardType.CURSE) / 2);
    const curseHandBonus = combatState.value.playerHand.filter(entry => entry.type === CardType.CURSE).length;
    const bonus = (curseDeckBonus + curseHandBonus) * getActiveRelicCount('alchemy_voodoo_doll');
    if (bonus > 0) {
      finalPoint += bonus;
      if (!isPreview) {
        logRelicMessage(`[巫毒娃娃] 诅咒牌使点数 +${bonus}。`);
      }
    }
  }
  const grandSynthesisBonus = getAlchemyGrandSynthesisPointBonus(source, card);
  if (grandSynthesisBonus > 0) {
    finalPoint += grandSynthesisBonus;
  }
  finalPoint += Math.max(0, blankOfBlankBonusThisTurn.value[source] ?? 0);
  finalPoint += Math.floor(turnPointModifier.value[source] ?? 0);
  if (card.type === CardType.MAGIC) {
    finalPoint += getCurrentTurnMagicPointBonus(source);
  }
  if (card.type === CardType.DODGE) {
    finalPoint += Math.max(0, getEffectStacks(attacker, ET.SCALE_POWDER));
  }
  if (source === 'enemy' && isTwinBattle && dreamControlPercent.value <= 24) {
    finalPoint *= 1.5;
  }
  if (card.id === PASS_CARD.id) {
    finalPoint = 0;
  }
  if (
    source === 'enemy'
    && getActiveRelicCount('burn_circling_glow') > 0
    && (getEffectStacks(playerStats.value, ET.COLD) > 0 || getEffectStacks(enemyStats.value, ET.COLD) > 0)
  ) {
    finalPoint -= getActiveRelicCount('burn_circling_glow');
  }

  if (source === 'player') {
    forEachPlayerRelic((entry, relic, state) => {
      const hook = relic.hooks?.modifyFinalPoint;
      if (!hook) return;
      if (
        shriveledHandActive
        && (relic.id === 'modao_witch_hat'
          || relic.id === 'basic_silver_mirror'
          || relic.id === 'burn_will_o_wisp_chain')
      ) {
        return;
      }
      const beforeRelicPoint = finalPoint;
      const ctx: RelicPointHookContext = {
        count: entry.count,
        side: 'player',
        card,
        baseDice,
        currentPoint: finalPoint,
        self: attacker,
        opponent: defender,
        state,
        isPreview,
        addLog: logRelicMessage,
        hasRelic: hasActiveRelic,
        getRelicCount: getActiveRelicCount,
      };
      const nextPoint = hook(ctx);
      finalPoint = shriveledHandActive
        ? beforeRelicPoint + (nextPoint - beforeRelicPoint) * 2
        : nextPoint;
    });

    finalPoint = applyBloodpoolRedHeadbandPointBonus(source, card, attacker, finalPoint, isPreview);
  }

  if (shouldApplyAmplificationStarPointBonus(source, card)) {
    finalPoint *= getAmplificationStarPointMultiplier();
  }

  if (alchemyPerfumePointDoubleCardIds.value[source][card.id]) {
    finalPoint *= 2;
  }

  if (card.id === 'modao_staff_strike') {
    finalPoint = Math.max(finalPoint, baseDice);
  }

  if (getMercyEffectAgainstCard(source, card)) {
    const beforeMercy = finalPoint;
    finalPoint *= 0.5;
    if (!isPreview) {
      const holderLabel = source === 'player' ? '敌方' : '我方';
      const sourceLabel = source === 'player' ? '我方' : '敌方';
      log(`<span class="text-fuchsia-300">${holderLabel}[怜悯] ${sourceLabel}打出被标记的【${card.type}】牌，点数 x0.5（${formatPointValue(beforeMercy)}→${formatPointValue(finalPoint)}）。</span>`);
    }
  }

  return Math.max(0, Math.floor(finalPoint));
};

const formatPointValue = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(Math.trunc(rounded));
  return rounded.toFixed(2).replace(/\.?0+$/, '');
};

const getPlayerCardContextForEnemyPointPreview = (): CardData | null => {
  const selectedOrPreviewed = combatState.value.playerSelectedCard ?? playerPreviewCardForPointContext.value;
  if (selectedOrPreviewed) return selectedOrPreviewed;
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return null;
  return combatState.value.playerHand.find((handCard) => {
    if (handCard.id === PASS_CARD.id || handCard.traits.combo) return false;
    const runtimeCard = withEffectiveManaCost('player', handCard);
    return canPlayCard(playerStats.value, runtimeCard, combatState.value.playerBaseDice).allowed;
  }) ?? null;
};

const shouldApplyAmplificationStarPointBonus = (source: BattleSide, card: CardData): boolean => {
  if (getActiveRelicCount('basic_amplification_star') <= 0) return false;
  if (getActiveRelicCount('basic_shriveled_hand') > 0) return false;
  if (card.id === PASS_CARD.id) return false;
  if (source === 'player') {
    return !card.traits.combo;
  }
  const playerCard = getPlayerCardContextForEnemyPointPreview();
  return !!playerCard && playerCard.id !== PASS_CARD.id && !playerCard.traits.combo;
};

const getAmplificationStarPointMultiplier = () => (
  Math.pow(1.5, Math.max(1, getActiveRelicCount('basic_amplification_star')))
);

const formatRelicPointDelta = (relicId: string, before: number, after: number): string => {
  if ((relicId === 'modao_witch_hat' || relicId === 'basic_amplification_star') && Math.abs(before) > 0.0001) {
    return `x${formatPointValue(after / before)}（${formatPointValue(before)}→${formatPointValue(after)}）`;
  }
  const delta = after - before;
  if (Math.abs(delta) < 0.0001) return '±0';
  const roundedInt = Math.round(delta);
  if (Math.abs(delta - roundedInt) < 0.0001) {
    return `${roundedInt >= 0 ? '+' : ''}${roundedInt}（${formatPointValue(before)}→${formatPointValue(after)}）`;
  }
  return `${delta >= 0 ? '+' : ''}${formatPointValue(delta)}（${formatPointValue(before)}→${formatPointValue(after)}）`;
};

const buildCardPreviewLines = (
  source: 'player' | 'enemy',
  card: CardData,
  baseDice: number,
  options?: { hideDetails?: boolean },
): string[] => {
  const attacker = source === 'player' ? playerStats.value : enemyStats.value;
  const defender = source === 'player' ? enemyStats.value : playerStats.value;
  const lines: string[] = [];
  const shriveledHandActive = source === 'player' && getActiveRelicCount('basic_shriveled_hand') > 0;

  lines.push(`原始：${baseDice}`);
  let finalPoint = shriveledHandActive
    ? baseDice + card.calculation.addition * 2
    : calculateFinalPoint({
        baseDice,
        card,
        entityEffects: attacker.effects.filter(effect => effect.type !== ET.SOLITUDE),
        relicModifiers: NO_RELIC_MOD,
      });
  const multiplierText = formatPointValue(card.calculation.multiplier);
  const addition = card.calculation.addition;
  const additionText = addition >= 0 ? `+${addition}` : `${addition}`;
  lines.push(shriveledHandActive
    ? `干瘪之手：卡牌乘法不触发，加减触发2次 ${additionText}x2 => ${finalPoint}`
    : `卡牌修正 x${multiplierText} ${additionText} => ${finalPoint}`);

  const solitudeBonus = card.id === PASS_CARD.id ? 0 : Math.max(0, getEffectStacks(attacker, ET.SOLITUDE));
  if (solitudeBonus > 0) {
    finalPoint += solitudeBonus;
    lines.push(`孤独 +${solitudeBonus} => ${finalPoint}`);
  }

  if (card.id === 'burn_inferno_judgement') {
    const bonus = Math.floor(getEffectStacks(defender, ET.BURN));
    if (bonus > 0) {
      finalPoint += bonus;
      lines.push(`炎狱判决 +${bonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'yanhan_ice_spike') {
    const bonus = Math.floor(getEffectStacks(defender, ET.COLD) / 3);
    if (bonus > 0) {
      finalPoint += bonus;
      lines.push(`冰锥 +${bonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'bloodpool_pulse_fist') {
    const hpValue = Math.max(0, Math.floor(attacker.hp));
    const bonus = hpValue % 2 === 0 ? -4 : 4;
    finalPoint += bonus;
    lines.push(`脉搏拳（生命${hpValue}为${hpValue % 2 === 0 ? '双' : '单'}数）${bonus >= 0 ? '+' : ''}${bonus} => ${finalPoint}`);
  }
  if (card.id === 'bloodpool_life_drain' && isBelowHalfHp(attacker)) {
    finalPoint += 2;
    lines.push(`生命汲取（生命低于50%）+2 => ${finalPoint}`);
  }
  if (card.id === 'bloodpool_blood_control') {
    const bonus = Math.max(0, getEffectStacks(attacker, ET.BLEED) + 4);
    if (bonus > 0) {
      finalPoint += bonus;
      lines.push(`驭血术（含新施加4层流血）+${bonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'enemy_executioner_puppet_execution' && source === 'enemy') {
    if (executionerPuppetPointModifier.value !== null) {
      finalPoint += executionerPuppetPointModifier.value;
      lines.push(`行刑 ${executionerPuppetPointModifier.value >= 0 ? '+' : ''}${executionerPuppetPointModifier.value} => ${finalPoint}`);
    } else {
      const playerCardType = combatState.value.playerSelectedCard?.type;
      if (playerCardType === CardType.DODGE) {
        lines.push('行刑：若对手使用闪避，点数随机-2~-1');
      } else {
        lines.push('行刑：若对手未使用闪避，点数随机+1~+2');
      }
    }
  }
  if (card.id === 'bloodpool_blood_debt_strike' || card.id === 'enemy_veronica_bloodthirsty_heavy_strike') {
    const divisor = card.id === 'enemy_veronica_bloodthirsty_heavy_strike' ? 9 : 3;
    const lostHp = Math.max(0, Math.floor(attacker.maxHp - attacker.hp));
    const bonus = Math.floor(lostHp / divisor);
    if (bonus > 0) {
      finalPoint += bonus;
      lines.push(`${card.name}（已损失${lostHp}） +${bonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'enemy_silk_puppet_cooperative_subdue') {
    const swarmBonus = Math.max(0, getEffectStacks(attacker, ET.SWARM));
    if (swarmBonus > 0) {
      finalPoint += swarmBonus;
      lines.push(`合力制服（群集${swarmBonus}）+${swarmBonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'enemy_yustia_trueword_scale_powder') {
    const manaBonus = Math.max(0, Math.floor(defender.mp));
    if (manaBonus > 0) {
      finalPoint += manaBonus;
      lines.push(`真言鳞粉（目标魔力${manaBonus}）+${manaBonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'enemy_nightmare_moth_collective_dreamweave') {
    const swarmBonus = Math.max(0, getEffectStacks(attacker, ET.SWARM));
    if (swarmBonus > 0) {
      finalPoint += swarmBonus;
      lines.push(`${card.name}（群集${swarmBonus}）+${swarmBonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'enemy_nightmare_moth_blissful_dream') {
    const debuffTypeCount = countDistinctDebuffTypes(defender);
    const blissBonus = debuffTypeCount * 2;
    if (blissBonus > 0) {
      finalPoint += blissBonus;
      lines.push(`极乐之梦（debuff种类${debuffTypeCount}）+${blissBonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'enemy_broken_mirror_bat_self_stripping' && getEffectStacks(defender, ET.LUST_ILLUSION) > 0) {
    finalPoint *= 2;
    lines.push(`自我剥离（目标有淫靡幻象）x2 => ${formatPointValue(finalPoint)}`);
  }
  if (card.id === 'basic_sharp_attack' && isOnlyPhysicalCardForSide(source, card)) {
    finalPoint += 3;
    lines.push(`尖锐攻击（当前仅有的物理牌）+3 => ${finalPoint}`);
  }
  if (card.id === 'basic_jagged_attack') {
    const jaggedBonus = getBattleCardUseCount(source, card.id);
    if (jaggedBonus > 0) {
      finalPoint += jaggedBonus;
      lines.push(`锯齿攻击（本战累计）+${jaggedBonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'basic_raid_attack' && battleCardFirstUseConsumed.value[source][card.id] !== true) {
    finalPoint += 4;
    lines.push(`袭击（首次使用）+4 => ${finalPoint}`);
  }
  if (card.id === 'basic_targeted_slash' && source === 'player' && isCurrentOpponentLord()) {
    finalPoint += 4;
    lines.push(`针对性斩击（领主）+4 => ${finalPoint}`);
  }
  if (card.id === 'basic_stealth' && source === 'player' && hasNoPhysicalOrMagicInHand(source, card)) {
    finalPoint -= 3;
    lines.push(`潜行（手牌无物理/魔法）-3 => ${finalPoint}`);
  }
  if (card.id === 'basic_life_death_judgement' && baseDice === 4) {
    finalPoint *= 4;
    lines.push(`生死决断（投掷点数为4）x4 => ${finalPoint}`);
  }
  if (card.id === 'basic_scarlet_scythe' && battleCardFirstUseConsumed.value[source][card.id] !== true) {
    finalPoint *= 2;
    lines.push(`猩红镰刀（首次使用）x2 => ${finalPoint}`);
  }
  if (card.id === 'basic_slime_axe') {
    const opposing = getOpposingCardForPointComparison(source);
    if (opposing.card) {
      const opposingPoint = getCardFinalPoint(opposing.side, opposing.card, opposing.baseDice, true, true);
      if (finalPoint <= opposingPoint) {
        finalPoint = opposingPoint + 1;
        lines.push(`粘液斧（超过对方最终点数）=> ${finalPoint}`);
      }
    }
  }
  if (card.id === 'modao_rune_greatsword') {
    const magicCardCount = countMagicCardsInDeckForSide(source);
    if (magicCardCount > 0) {
      const bonus = magicCardCount * 2;
      finalPoint += bonus;
      lines.push(`符文大剑（牌库法术 ${magicCardCount}）+${bonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'alchemy_abnormal_overload') {
    const debuffTypeCount = countDistinctDebuffTypes(defender);
    if (debuffTypeCount > 0) {
      finalPoint += debuffTypeCount;
      lines.push(`异况超量（负面状态种类${debuffTypeCount}）+${debuffTypeCount} => ${finalPoint}`);
    }
  }
  if (card.id === 'alchemy_gilded_strike') {
    const rareCount = countBattleCardsForSide(source, card, entry => entry.rarity === '稀有');
    const bonus = rareCount * 2;
    if (bonus > 0) {
      finalPoint += bonus;
      lines.push(`辉金打击（稀有牌${rareCount}）+${bonus} => ${finalPoint}`);
    }
  }
  if (source === 'player' && getActiveRelicCount('alchemy_five_color_paint') > 0 && !card.traits.combo) {
    const handTypeCount = countHandCardTypesForSide(source, card);
    if (handTypeCount >= 3) {
      finalPoint *= 1.5;
      lines.push(`五色颜料（手牌类型${handTypeCount}）x1.5 => ${formatPointValue(finalPoint)}`);
    }
  }
  if (source === 'player' && getActiveRelicCount('alchemy_five_color_ring') > 0) {
    const typeCount = countDistinctCardTypesForSide(source, card);
    if (typeCount >= 5) {
      finalPoint *= 1.5;
      lines.push(`五色环（卡牌类型${typeCount}）x1.5 => ${formatPointValue(finalPoint)}`);
    } else if (typeCount >= 4) {
      finalPoint *= 1.2;
      lines.push(`五色环（卡牌类型${typeCount}）x1.2 => ${formatPointValue(finalPoint)}`);
    }
  }
  if (source === 'player' && getActiveRelicCount('alchemy_voodoo_doll') > 0) {
    const curseDeckBonus = Math.floor(countBattleCardsForSide(source, card, entry => entry.type === CardType.CURSE) / 2);
    const curseHandBonus = combatState.value.playerHand.filter(entry => entry.type === CardType.CURSE).length;
    const bonus = (curseDeckBonus + curseHandBonus) * getActiveRelicCount('alchemy_voodoo_doll');
    if (bonus > 0) {
      finalPoint += bonus;
      lines.push(`巫毒娃娃（诅咒牌）+${bonus} => ${formatPointValue(finalPoint)}`);
    }
  }
  const grandSynthesisBonus = getAlchemyGrandSynthesisPointBonus(source, card);
  if (grandSynthesisBonus > 0) {
    finalPoint += grandSynthesisBonus;
    lines.push(`大炼成绑定 +${grandSynthesisBonus} => ${finalPoint}`);
  }
  const blankOfBlankBonus = Math.max(0, blankOfBlankBonusThisTurn.value[source] ?? 0);
  if (blankOfBlankBonus > 0) {
    finalPoint += blankOfBlankBonus;
    lines.push(`空白的空白（本回合累计）+${blankOfBlankBonus} => ${finalPoint}`);
  }
  if ((turnPointModifier.value[source] ?? 0) !== 0) {
    const delta = Math.floor(turnPointModifier.value[source] ?? 0);
    finalPoint += delta;
    lines.push(`本回合点数修正 ${delta >= 0 ? '+' : ''}${delta} => ${finalPoint}`);
  }
  if (card.type === CardType.MAGIC) {
    const magicPointBonus = getCurrentTurnMagicPointBonus(source);
    if (magicPointBonus > 0) {
      finalPoint += magicPointBonus;
      lines.push(`风筝（本回合法术点数加成）+${magicPointBonus} => ${finalPoint}`);
    }
  }

  if (card.type === CardType.DODGE) {
    const scalePowderStacks = Math.max(0, getEffectStacks(attacker, ET.SCALE_POWDER));
    if (scalePowderStacks > 0) {
      finalPoint += scalePowderStacks;
      lines.push(`鳞粉 +${scalePowderStacks} => ${finalPoint}`);
    }
  }
  if (source === 'enemy' && isTwinBattle && dreamControlPercent.value <= 24) {
    finalPoint *= 1.5;
    lines.push(`梦境控制权（<=24%）x1.5 => ${formatPointValue(finalPoint)}`);
  }
  if (
    source === 'enemy'
    && getActiveRelicCount('burn_circling_glow') > 0
    && (getEffectStacks(playerStats.value, ET.COLD) > 0 || getEffectStacks(enemyStats.value, ET.COLD) > 0)
  ) {
    const delta = getActiveRelicCount('burn_circling_glow');
    finalPoint -= delta;
    lines.push(`环绕火光（存在寒冷）-${delta} => ${formatPointValue(finalPoint)}`);
  }

  if (source === 'player') {
    forEachPlayerRelic((entry, relic, state) => {
      const hook = relic.hooks?.modifyFinalPoint;
      if (!hook) return;
      if (
        shriveledHandActive
        && (relic.id === 'modao_witch_hat'
          || relic.id === 'basic_silver_mirror'
          || relic.id === 'burn_will_o_wisp_chain')
      ) {
        return;
      }
      const before = finalPoint;
      const ctx: RelicPointHookContext = {
        count: entry.count,
        side: 'player',
        card,
        baseDice,
        currentPoint: finalPoint,
        self: attacker,
        opponent: defender,
        state,
        isPreview: true,
        addLog: logRelicMessage,
        hasRelic: hasActiveRelic,
        getRelicCount: getActiveRelicCount,
      };
      const nextPoint = hook(ctx);
      finalPoint = shriveledHandActive
        ? before + (nextPoint - before) * 2
        : nextPoint;
      if (Math.abs(finalPoint - before) < 0.0001) return;
      lines.push(`${relic.name} ${formatRelicPointDelta(relic.id, before, finalPoint)} => ${formatPointValue(finalPoint)}`);
    });

    const beforeRedHeadband = finalPoint;
    finalPoint = applyBloodpoolRedHeadbandPointBonus(source, card, attacker, finalPoint, true);
    if (Math.abs(finalPoint - beforeRedHeadband) >= 0.0001) {
      lines.push(`红色头带 ${formatRelicPointDelta('bloodpool_red_headband', beforeRedHeadband, finalPoint)} => ${formatPointValue(finalPoint)}`);
    }
  }

  if (shouldApplyAmplificationStarPointBonus(source, card)) {
    const before = finalPoint;
    finalPoint *= getAmplificationStarPointMultiplier();
    lines.push(`增幅星 ${formatRelicPointDelta('basic_amplification_star', before, finalPoint)} => ${formatPointValue(finalPoint)}`);
  }

  if (alchemyPerfumePointDoubleCardIds.value[source][card.id]) {
    finalPoint *= 2;
    lines.push(`魔女香水 x2 => ${formatPointValue(finalPoint)}`);
  }

  if (card.id === 'modao_staff_strike' && finalPoint < baseDice) {
    finalPoint = baseDice;
    lines.push(`杖击（最终点数不低于原始点数）=> ${finalPoint}`);
  }

  if (getMercyEffectAgainstCard(source, card)) {
    finalPoint *= 0.5;
    lines.push(`怜悯 x0.5 => ${formatPointValue(finalPoint)}`);
  }

  const finalLine = `最终：${Math.max(0, Math.floor(finalPoint))}`;
  lines.push(finalLine);
  if (options?.hideDetails) {
    return [`原始：${baseDice}`, '？？？', finalLine];
  }
  return lines;
};

const getCardPreviewPoint = (source: 'player' | 'enemy', card: CardData, baseDice: number) => {
  return getCardFinalPoint(source, card, baseDice, true);
};

const handlePlayerCardHoverStart = (card: CardData, idx: number) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  const displayCard = getDisplayHandCard(card);
  const maskLevel = getPlayerHandMaskLevel(idx, card);
  playerPreviewCardForPointContext.value = card;
  previewPlayerDice.value = getCardPreviewPoint('player', displayCard, combatState.value.playerBaseDice);
  playerDicePreviewCardName.value = maskLevel === 'none' ? displayCard.name : '';
  playerDicePreviewLines.value = buildCardPreviewLines(
    'player',
    displayCard,
    combatState.value.playerBaseDice,
    { hideDetails: maskLevel === 'void' },
  );
};

const handlePlayerCardHoverEnd = () => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  previewPlayerDice.value = null;
  playerDicePreviewCardName.value = '';
  playerDicePreviewLines.value = [];
  playerPreviewCardForPointContext.value = null;
};

const handlePlayerCardTouchStart = (card: CardData, idx: number) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (hoverPreviewTimer) clearTimeout(hoverPreviewTimer);
  hoverPreviewTimer = setTimeout(() => {
    if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
    const displayCard = getDisplayHandCard(card);
    const maskLevel = getPlayerHandMaskLevel(idx, card);
    playerPreviewCardForPointContext.value = card;
    previewPlayerDice.value = getCardPreviewPoint('player', displayCard, combatState.value.playerBaseDice);
    playerDicePreviewCardName.value = maskLevel === 'none' ? displayCard.name : '';
    playerDicePreviewLines.value = buildCardPreviewLines(
      'player',
      displayCard,
      combatState.value.playerBaseDice,
      { hideDetails: maskLevel === 'void' },
    );
  }, 260);
};

const handlePlayerCardTouchEnd = () => {
  if (hoverPreviewTimer) {
    clearTimeout(hoverPreviewTimer);
    hoverPreviewTimer = null;
  }
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  previewPlayerDice.value = null;
  playerDicePreviewCardName.value = '';
  playerDicePreviewLines.value = [];
  playerPreviewCardForPointContext.value = null;
};

const rollDiceInRange = (min: number, max: number) => {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (high <= low) return low;
  return Math.floor(Math.random() * (high - low + 1)) + low;
};

const rollPlayerDiceInRange = (min: number, max: number) => {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (getActiveRelicCount('basic_eerie_orb') > 0 && high > low) {
    return Math.random() < 0.5 ? low : high;
  }
  return rollDiceInRange(low, high);
};

const applyCheatSilverCoinToPlayerReroll = (value: number): number => {
  if (getActiveRelicCount('basic_cheat_silver_coin') <= 0) return value;
  return 6;
};

const canApplyFlowingLightRingCombo = (card: CardData): boolean => (
  getActiveRelicCount('basic_flowing_light_ring') > 0
  && !flowingLightRingConsumed.value
  && card.id !== PASS_CARD.id
  && card.type === CardType.FUNCTION
);

const applyFlowingLightRingComboIfNeeded = (card: CardData): CardData => {
  if (!canApplyFlowingLightRingCombo(card)) return card;
  flowingLightRingConsumed.value = true;
  const nextCard = cloneCardForBattle(card);
  nextCard.traits = { ...nextCard.traits, combo: true };
  logRelicMessage(`[流光指环] 本场战斗第一张功能牌【${card.name}】获得连击。`);
  return nextCard;
};

const previewFlowingLightRingCombo = (card: CardData): CardData => {
  if (!canApplyFlowingLightRingCombo(card)) return card;
  return {
    ...card,
    traits: { ...card.traits, combo: true },
  };
};

const applyFirstComboIfNeeded = (side: BattleSide, card: CardData): CardData => {
  if (!card.traits.firstCombo || card.traits.combo || card.id === PASS_CARD.id) return card;
  if (battleCardFirstUseConsumed.value[side][card.id] === true) return card;

  const nextCard = cloneCardForBattle(card);
  nextCard.traits = { ...nextCard.traits, combo: true };
  const sourceLabel = side === 'player' ? '我方' : '敌方';
  log(`<span class="text-indigo-300">${sourceLabel}【${card.name}】首发连击，本次打出视为连击。</span>`);
  return nextCard;
};

const markFirstComboUseIfNeeded = (side: BattleSide, card: CardData) => {
  if (!card.traits.firstCombo || card.id === PASS_CARD.id) return;
  markBattleCardFirstUse(side, card.id);
};

const triggerPlayerAfterRerollRelics = (before: number, after: number) => {
  void before;
  const glassCount = getActiveRelicCount('basic_colored_glass_ball');
  if (glassCount > 0 && enemyStats.value.hp > 0) {
    const damage = 2 * glassCount;
    const { actualDamage } = applyDamageToSideWithRelics('enemy', enemyStats.value, damage, false, '异色玻璃球', {
      sourceSide: 'player',
      isDirectDamage: true,
    });
    if (actualDamage > 0) {
      pushFloatingNumber('enemy', actualDamage, 'physical', '-');
    }
    logRelicMessage(`[异色玻璃球] 重掷后造成 ${actualDamage} 点伤害。`);
  }
  const puddingCount = getActiveRelicCount('basic_pudding');
  if (puddingCount > 0) {
    const { healed } = healForSide('player', puddingCount);
    if (healed > 0) {
      logRelicMessage(`[布丁] 重掷后回复 ${healed} 点生命。`);
    }
  }
  if (getActiveRelicCount('basic_cheat_silver_coin') > 0 && after !== 6) {
    logRelicMessage('[作弊银币] 重掷结果固定为 6。');
  }
};

const triggerMicroFloatingCannonDamage = (source: BattleSide, defenderSide: BattleSide) => {
  if (source !== 'player' || defenderSide !== 'enemy') return;
  if (microFloatingCannonTriggeredThisTurn.value) return;
  if (getActiveRelicCount('yanhan_micro_floating_cannon') <= 0) return;
  if (enemyStats.value.hp <= 0) return;

  microFloatingCannonTriggeredThisTurn.value = true;
  const { damage, isTrueDamage, logs: damageLogs } = calculateFinalDamage({
    finalPoint: 1,
    card: MICRO_FLOATING_CANNON_DAMAGE_CARD,
    attackerEffects: playerStats.value.effects,
    defenderEffects: enemyStats.value.effects,
    relicModifiers: NO_RELIC_MOD,
    isTrueDamage: false,
  });
  const armorBefore = getEffectStacks(enemyStats.value, ET.ARMOR);
  const barrierBefore = getEffectStacks(enemyStats.value, ET.BARRIER);
  const { actualDamage, logs: applyLogs } = applyDamageToSideWithRelics(
    'enemy',
    enemyStats.value,
    damage,
    isTrueDamage,
    '微型悬浮炮',
    { sourceSide: 'player', isDirectDamage: true, card: MICRO_FLOATING_CANNON_DAMAGE_CARD },
  );
  const armorBlocked =
    actualDamage <= 0
    && !isTrueDamage
    && damage > 0
    && barrierBefore <= 0
    && armorBefore > 0;
  if (actualDamage > 0 || armorBlocked) {
    pushFloatingNumber('enemy', actualDamage, isTrueDamage ? 'true' : 'magic', '-', {
      allowZero: armorBlocked,
    });
  }
  logRelicMessage(`[微型悬浮炮] 额外造成 ${actualDamage} 点伤害。`);
  for (const damageLog of damageLogs) {
    if (damageLog.startsWith('原始伤害:')) continue;
    log(`<span class="text-gray-500 text-[9px]">${damageLog}</span>`);
  }
  for (const applyLog of applyLogs) {
    const normalized = applyLog.startsWith('受到') ? `敌方${applyLog}` : applyLog;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
  }
};

const handlePlayerDiceClick = () => {
  if (!canPlayerRerollDice.value) return;

  const chargesBeforeHooks = getRerollCharges('player');
  let rerolled: number | null = null;
  forEachPlayerRelic((entry, relic, state) => {
    if (rerolled !== null) return;
    const hook = relic.hooks?.onDiceClick;
    if (!hook) return;
    const ctx: RelicDiceClickHookContext = {
      count: entry.count,
      side: 'player',
      currentDice: combatState.value.playerBaseDice,
      minDice: playerStats.value.minDice,
      maxDice: playerStats.value.maxDice,
      state,
      roll: rollPlayerDiceInRange,
      consumeRerollCharge,
      getRerollCharges,
      addLog: logRelicMessage,
    };
    rerolled = hook(ctx);
  });

  if (rerolled === null) {
    if (getRerollCharges('player') < chargesBeforeHooks) return;
    if (!consumeRerollCharge('player', 1)) return;
    rerolled = rollPlayerDiceInRange(playerStats.value.minDice, playerStats.value.maxDice);
    log(`<span class="text-amber-300">[基础重掷] 消耗1次重掷，剩余 ${getRerollCharges('player')} 次。</span>`);
  }

  const before = combatState.value.playerBaseDice;
  const rerolledRaw = Math.max(0, Math.floor(rerolled));
  playerTurnRawDice.value = rerolledRaw;
  const afterCharge = consumeChargeOnRoll(playerStats.value, '我方', rerolledRaw);
  const after = applyCheatSilverCoinToPlayerReroll(afterCharge);
  combatState.value.playerBaseDice = after;
  previewPlayerDice.value = null;
  log(`<span class="text-amber-200">我方骰子重掷：${before} → ${after}</span>`);
  triggerPlayerAfterRerollRelics(before, after);
};

const canPreviewEnemyDice = () => {
  return (
    combatState.value.phase === CombatPhase.PLAYER_INPUT &&
    !isRolling.value &&
    !showClashAnimation.value &&
    !isEnemyIntentHiddenForPlayer.value &&
    !!combatState.value.enemyIntentCard
  );
};

const showEnemyDicePreview = () => {
  if (!canPreviewEnemyDice()) return;
  const card = combatState.value.enemyIntentCard;
  if (!card) return;
  const previewCard = withFirstUseLightningAmbushBonus('enemy', card, {
    consume: false,
    announce: false,
  });
  const preview = getCardPreviewPoint('enemy', previewCard, combatState.value.enemyBaseDice);
  if (preview === null) return;
  previewEnemyDice.value = preview;
  enemyDicePreviewCardName.value = previewCard.name;
  enemyDicePreviewLines.value = buildCardPreviewLines('enemy', previewCard, combatState.value.enemyBaseDice);
};

const hideEnemyDicePreview = () => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (showClashAnimation.value) return;
  previewEnemyDice.value = null;
  enemyDicePreviewCardName.value = '';
  enemyDicePreviewLines.value = [];
};

const handleEnemyDiceHoverStart = () => {
  showEnemyDicePreview();
};

const handleEnemyDiceHoverEnd = () => {
  hideEnemyDicePreview();
};

const handleEnemyDiceTouchStart = () => {
  if (enemyDicePreviewTimer) {
    clearTimeout(enemyDicePreviewTimer);
    enemyDicePreviewTimer = null;
  }
  enemyDicePreviewTimer = setTimeout(() => {
    showEnemyDicePreview();
  }, 260);
};

const handleEnemyDiceTouchEnd = () => {
  if (enemyDicePreviewTimer) {
    clearTimeout(enemyDicePreviewTimer);
    enemyDicePreviewTimer = null;
  }
  hideEnemyDicePreview();
};

const clearEffectTooltipTimers = () => {
  if (effectTooltipLongPressTimer) {
    clearTimeout(effectTooltipLongPressTimer);
    effectTooltipLongPressTimer = null;
  }
  if (effectTooltipAutoHideTimer) {
    clearTimeout(effectTooltipAutoHideTimer);
    effectTooltipAutoHideTimer = null;
  }
};

const showEffectTooltipForTarget = (target: HTMLElement, effect: EffectInstance, align: TooltipAlign = 'center') => {
  const rect = target.getBoundingClientRect();
  const tooltipMaxWidth = 256;
  const margin = 8;
  const top = Math.max(margin, rect.top - margin);
  const x = align === 'right'
    ? Math.max(margin, Math.min(rect.right + 10, window.innerWidth - tooltipMaxWidth - margin))
    : Math.max(
      margin + tooltipMaxWidth / 2,
      Math.min(rect.left + rect.width / 2, window.innerWidth - margin - tooltipMaxWidth / 2),
    );
  effectTooltip.value = {
    x,
    y: top,
    name: getEffectName(effect.type),
    description: getEffectDescription(effect.type),
    stacks: effect.stacks,
    align,
    previewCard: effect.type === ET.FANTASY_EMBRACE
      ? getCardByName(MOORE_MIMIC_CARD_KEY) ?? undefined
      : undefined,
  };
};

const showEffectTooltip = (
  event: MouseEvent | FocusEvent,
  effect: EffectInstance,
  align: TooltipAlign = 'center',
) => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  clearEffectTooltipTimers();
  showEffectTooltipForTarget(target, effect, align);
};

const hideEffectTooltip = () => {
  clearEffectTooltipTimers();
  effectTooltip.value = null;
};

const handleEffectTouchStart = (
  event: TouchEvent,
  effect: EffectInstance,
  align: TooltipAlign = 'center',
) => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;

  clearEffectTooltipTimers();
  effectTooltipLongPressTimer = setTimeout(() => {
    showEffectTooltipForTarget(target, effect, align);
    effectTooltipAutoHideTimer = setTimeout(() => {
      effectTooltip.value = null;
      effectTooltipAutoHideTimer = null;
    }, scaleDuration(1800));
  }, scaleDuration(320));
};

const handleEffectTouchEnd = () => {
  if (effectTooltipLongPressTimer) {
    clearTimeout(effectTooltipLongPressTimer);
    effectTooltipLongPressTimer = null;
  }
};

const pushFloatingNumber = (
  side: BattleSide,
  value: number,
  kind: FloatingNumberKind,
  sign: '+' | '-' = '+',
  options?: { allowZero?: boolean },
) => {
  const amount = Math.max(0, Math.floor(value));
  if (amount <= 0 && !options?.allowZero) return;

  const id = ++floatingNumberId;
  const duration = kind === 'heal' ? scaleDuration(1800) : scaleDuration(1350);
  floatingNumbers.value.push({
    id,
    side,
    kind,
    text: `${sign}${amount}`,
    colorClass: floatingColors[kind],
    leftOffset: Math.floor((Math.random() - 0.5) * 120),
    topOffset: 24 + Math.floor(Math.random() * 20),
    duration,
  });

  setTimeout(() => {
    floatingNumbers.value = floatingNumbers.value.filter((entry) => entry.id !== id);
  }, duration);
};

const pushFloatingText = (
  side: BattleSide,
  text: string,
  colorClass: string = 'text-sky-300',
  duration: number = scaleDuration(1050),
) => {
  const id = ++floatingNumberId;
  floatingNumbers.value.push({
    id,
    side,
    text,
    colorClass,
    leftOffset: Math.floor((Math.random() - 0.5) * 90),
    topOffset: 18 + Math.floor(Math.random() * 18),
    duration,
  });
  setTimeout(() => {
    floatingNumbers.value = floatingNumbers.value.filter((entry) => entry.id !== id);
  }, duration);
};

const notifyEnemyManaInsufficient = () => {
  if (enemyManaLackHintTurn === combatState.value.turn) return;
  enemyManaLackHintTurn = combatState.value.turn;
  pushFloatingText('enemy', '魔力不足', 'text-blue-300');
  log('<span class="text-blue-300">敌方魔力不足，本回合视为跳过。</span>');
};

const log = (msg: string) => {
  combatState.value.logs = [msg, ...combatState.value.logs];
};

if (activePlayerRelics.length > 0) {
  const relicSummary = activePlayerRelics
    .map((entry) => (entry.count > 1 ? `${entry.relic.name}x${entry.count}` : entry.relic.name))
    .join('、');
  log(`<span class="text-amber-300">本场圣遗物：${relicSummary}</span>`);
}

if (difficultyAtBattleStart !== '普通' && difficultyAtBattleStart !== '自定义') {
  log(`<span class="text-amber-200">[难度] 当前为【${difficultyAtBattleStart}】；敌方生命系数 x${difficultyHpMultiplier.toFixed(1)}。</span>`);
}

const applyMvuNegativeStatusesOnBattleStart = () => {
  const statuses = normalizeNegativeStatusList(gameStore.statData.$负面状态);
  if (statuses.length === 0) return;

  if (statuses.includes(STATUS_PHEROMONE)) {
    const pheromoneCard = getCardByName(PHEROMONE_CURSE_CARD_NAME);
    if (pheromoneCard) {
      for (let i = 0; i < 3; i += 1) {
        const insertAt = Math.floor(Math.random() * (combatState.value.playerDeck.length + 1));
        combatState.value.playerDeck.splice(insertAt, 0, cloneCardForBattle(pheromoneCard));
      }
      log('<span class="text-fuchsia-300">[负面状态][信息素] 开局向牌库插入了3张【信息素】。</span>');
    } else {
      log('<span class="text-red-400">[负面状态][信息素] 未找到【信息素】卡牌定义。</span>');
    }
  }

  if (statuses.includes(STATUS_LUST_MARK)) {
    const applied = applyEffect(playerStats.value, ET.POISON, 3, { source: 'negative-status:[淫纹]' });
    if (applied) {
      log('<span class="text-fuchsia-300">[负面状态][淫纹] 开局获得了3层中毒。</span>');
    }
  }

  if (statuses.includes(STATUS_LUST_KNOWLEDGE)) {
    const taintCard = getCardByName(ARCHIVE_TAINT_CURSE_CARD_NAME);
    if (taintCard) {
      for (let i = 0; i < 1; i += 1) {
        const insertAt = Math.floor(Math.random() * (combatState.value.playerDeck.length + 1));
        combatState.value.playerDeck.splice(insertAt, 0, cloneCardForBattle(taintCard));
      }
      log('<span class="text-fuchsia-300">[负面状态][淫乱知识] 开局向牌库插入了1张【档案污页】。</span>');
    } else {
      log('<span class="text-red-400">[负面状态][淫乱知识] 未找到【档案污页】卡牌定义。</span>');
    }
  }

  if (statuses.includes(STATUS_MARKED)) {
    const applied = applyEffect(playerStats.value, ET.VULNERABLE, 2, { source: 'negative-status:[被标记]' });
    if (applied) {
      log('<span class="text-fuchsia-300">[负面状态][被标记] 开局获得了2层敏感。</span>');
    }
  }

  if (statuses.includes(STATUS_PARASITIZED)) {
    const applied = applyEffect(playerStats.value, ET.ORGASM, 1, { source: 'negative-status:[被寄生]' });
    if (applied) {
      log('<span class="text-fuchsia-300">[负面状态][被寄生] 开局获得了1层性兴奋。</span>');
    }
  }

  if (statuses.includes(STATUS_BLOODLINE_MARK) && String(gameStore.statData._对手名称 ?? '').trim() === '伊丽莎白') {
    const applied = applyEffect(playerStats.value, ET.ORGASM, 10, { source: 'negative-status:[血族印记]' });
    if (applied) {
      log('<span class="text-fuchsia-300">[负面状态][血族印记] 面对伊丽莎白时，开局获得了10层性兴奋。</span>');
    }
  }

  if (statuses.includes(STATUS_SCALE_POWDER)) {
    const applied = applyEffect(playerStats.value, ET.SCALE_POWDER, 1, { source: 'negative-status:[鳞粉]' });
    if (applied) {
      log('<span class="text-fuchsia-300">[负面状态][鳞粉] 开局获得了1层鳞粉。</span>');
    }
  }

  if (statuses.includes(STATUS_SOUL_DAMAGE)) {
    const applied = applyEffect(playerStats.value, ET.MANA_DRAIN, 3, { source: 'negative-status:[灵魂受损]' });
    if (applied) {
      log('<span class="text-fuchsia-300">[负面状态][灵魂受损] 开局获得了3层法力枯竭。</span>');
    }
  }
};

const applySinkingNegativeStatusOnTurnStart = () => {
  if (combatState.value.turn !== 3) return;
  const statuses = normalizeNegativeStatusList(gameStore.statData.$负面状态);
  if (!statuses.includes(STATUS_SINKING)) return;
  const applied = applyStatusEffectWithRelics('player', ET.STUN, 1, {
    source: 'negative-status:[沉沦]',
    lockDecayThisTurn: true,
  });
  if (applied) {
    log('<span class="text-fuchsia-300">[负面状态][沉沦] 第3回合为自身施加了1层眩晕。</span>');
  }
};

const applyDifficultyBattleStartEffects = () => {
  if (!shouldApplyHellStartingDebuff(difficultyAtBattleStart, customDifficultyInfluencesAtBattleStart)) return;
  const picked = HELL_STARTING_DEBUFFS[Math.floor(Math.random() * HELL_STARTING_DEBUFFS.length)];
  if (!picked) return;
  const applied = applyEffect(playerStats.value, picked, 1, { source: 'difficulty:hell' });
  if (!applied) return;
  const effectName = EFFECT_REGISTRY[picked]?.name ?? String(picked);
  log(`<span class="text-fuchsia-300">[地狱难度] 开局获得了 1 层${effectName}。</span>`);
};

const applyCustomDifficultyBattleStartEffects = () => {
  if (difficultyAtBattleStart !== '自定义') return;

  const startingDebuffs: Array<[Parameters<typeof isCustomDifficultyInfluenceActive>[0], EffectType]> = [
    ['目盲', ET.BLIND_ASH],
    ['黑暗', ET.PEEP_FORBIDDEN],
    ['愚笨', ET.MEMORY_FOG],
    ['迷雾', ET.COGNITIVE_INTERFERENCE],
    ['魔力匮乏', ET.MANA_DRAIN],
  ];

  for (const [influence, effectType] of startingDebuffs) {
    if (!isCustomDifficultyInfluenceActive(influence)) continue;
    const applied = applyEffect(playerStats.value, effectType, 1, { source: `difficulty:custom:${influence}` });
    if (!applied) continue;
    const effectName = EFFECT_REGISTRY[effectType]?.name ?? String(effectType);
    log(`<span class="text-fuchsia-300">[自定义难度][${influence}] 开局获得了 1 层${effectName}。</span>`);
  }

  if (isCustomDifficultyInfluenceActive('黑手烙印')) {
    const curseCard = getCardByName('黑手印');
    if (curseCard) {
      const insertAt = Math.floor(Math.random() * (combatState.value.playerDeck.length + 1));
      combatState.value.playerDeck.splice(insertAt, 0, cloneCardForBattle(curseCard));
      log('<span class="text-fuchsia-300">[自定义难度][黑手烙印] 开局向抽牌堆加入了1张【黑手印】。</span>');
    } else {
      log('<span class="text-red-400">[自定义难度][黑手烙印] 未找到【黑手印】卡牌定义。</span>');
    }
  }
};

const applyUnseeableAura = (ownerSide: BattleSide, reason: 'battle_start' | 'turn_start') => {
  const owner = ownerSide === 'player' ? playerStats.value : enemyStats.value;
  if (getEffectStacks(owner, ET.UNSEEABLE) <= 0) return;

  const targetSide: BattleSide = ownerSide === 'player' ? 'enemy' : 'player';
  const target = targetSide === 'player' ? playerStats.value : enemyStats.value;
  const ownerLabel = ownerSide === 'player' ? '我方' : '敌方';
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  const appliedEffects: string[] = [];

  if (getEffectStacks(target, ET.PEEP_FORBIDDEN) <= 0) {
    applyStatusEffectWithRelics(targetSide, ET.PEEP_FORBIDDEN, 1, { source: 'effect:unseeable' });
    appliedEffects.push('虚实不明');
  }
  if (getEffectStacks(target, ET.COGNITIVE_INTERFERENCE) <= 0) {
    applyStatusEffectWithRelics(targetSide, ET.COGNITIVE_INTERFERENCE, 1, { source: 'effect:unseeable' });
    appliedEffects.push('敌意隐藏');
  }
  if (appliedEffects.length <= 0) return;

  const reasonText = reason === 'battle_start' ? '开局' : '回合开始';
  log(`<span class="text-violet-300">[${ownerLabel}特性][无法直视] ${reasonText}为${targetLabel}施加了${appliedEffects.join('与')}。</span>`);
};

const applyFantasyEmbraceBattleStart = (ownerSide: BattleSide) => {
  const owner = ownerSide === 'player' ? playerStats.value : enemyStats.value;
  const stacks = Math.max(0, getEffectStacks(owner, ET.FANTASY_EMBRACE));
  if (stacks <= 0) return;

  const mimicCard = getCardByName(MOORE_MIMIC_CARD_KEY);
  if (!mimicCard) {
    log('<span class="text-red-400">[虚妄之拥] 未找到【梦境】卡牌定义。</span>');
    return;
  }

  const targetSide: BattleSide = ownerSide === 'player' ? 'enemy' : 'player';
  let targetDeck = targetSide === 'player' ? combatState.value.playerDeck : combatState.value.enemyDeck;
  const targetAllCards = targetSide === 'player'
    ? [...combatState.value.playerDeck, ...combatState.value.playerHand, ...combatState.value.discardPile]
    : [...combatState.value.enemyDeck, ...combatState.value.enemyDiscard];
  const displays = pickMimicDisplayCards(targetAllCards, 2);

  for (let i = 0; i < 2; i += 1) {
    const battleCard = cloneCardForBattle(mimicCard);
    const displayCard = displays[i];
    if (displayCard) {
      mimicDisplayCards.set(battleCard, cloneCardForBattle(displayCard));
    }
    targetDeck = insertCardIntoDeckRandomly(targetDeck, battleCard);
    if (targetSide === 'player') {
      combatState.value.playerDeck = targetDeck;
    } else {
      combatState.value.enemyDeck = targetDeck;
    }
  }

  const ownerLabel = ownerSide === 'player' ? '我方' : '敌方';
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-fuchsia-300">[${ownerLabel}][虚妄之拥] 开局向${targetLabel}抽牌堆插入了2张【梦境】。</span>`);
};

const applySightDeprivationBattleStart = (ownerSide: BattleSide) => {
  const owner = ownerSide === 'player' ? playerStats.value : enemyStats.value;
  if (getEffectStacks(owner, ET.SIGHT_DEPRIVATION) <= 0) return;

  const cardName = '陨';
  const card = getCardByName(cardName);
  if (!card) {
    log('<span class="text-red-400">[视线剥夺] 未找到【陨】卡牌定义。</span>');
    return;
  }

  const targetSide: BattleSide = ownerSide === 'player' ? 'enemy' : 'player';
  const battleCard = cloneCardForBattle(card);
  if (targetSide === 'player') {
    combatState.value.playerDeck = insertCardIntoDeckRandomly(combatState.value.playerDeck, battleCard);
  } else {
    combatState.value.enemyDeck = insertCardIntoDeckRandomly(combatState.value.enemyDeck, battleCard);
  }

  const ownerLabel = ownerSide === 'player' ? '我方' : '敌方';
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-violet-300">[${ownerLabel}][视线剥夺] 开局向${targetLabel}抽牌堆插入了1张【陨】。</span>`);
};

triggerPlayerRelicLifecycleHooks('onBattleStart');
applyAlchemyBattleStartRelics();
applyMvuNegativeStatusesOnBattleStart();
applyDifficultyBattleStartEffects();
applyCustomDifficultyBattleStartEffects();
applyFantasyEmbraceBattleStart('player');
applyFantasyEmbraceBattleStart('enemy');
applySightDeprivationBattleStart('player');
applySightDeprivationBattleStart('enemy');
applyUnseeableAura('player', 'battle_start');
applyUnseeableAura('enemy', 'battle_start');

onMounted(() => {
  battleSpeedUp.value = localStorage.getItem(SPEED_SETTING_KEY) === '1';
  void initPortraitUrls();
});
watch(
  () => props.playerPortraitOverrideUrl,
  () => {
    void initPortraitUrls();
  },
);
onUnmounted(() => {
  portraitLoaderDisposed = true;
  if (hoverPreviewTimer) {
    clearTimeout(hoverPreviewTimer);
    hoverPreviewTimer = null;
  }
  if (enemyDicePreviewTimer) {
    clearTimeout(enemyDicePreviewTimer);
    enemyDicePreviewTimer = null;
  }
  clearEffectTooltipTimers();
});
watch(battleSpeedUp, (enabled) => {
  localStorage.setItem(SPEED_SETTING_KEY, enabled ? '1' : '0');
});
watch(
  [
    () => combatState.value.phase,
    () => combatState.value.turn,
    () => combatState.value.playerBaseDice,
    () => combatState.value.enemyBaseDice,
    isPlayerDiceObscured,
    isEnemyDiceObscured,
  ],
  () => {
    playerDiceUiNoise.value = isPlayerDiceObscured.value ? rerollUiNoise() : 0;
    enemyDiceUiNoise.value = isEnemyDiceObscured.value ? rerollUiNoise() : 0;
  },
  { immediate: true },
);

const drawCards = (count: number, currentDeck: CardData[], currentDiscard: CardData[]) => {
  let deck = [...currentDeck];
  let discard = [...currentDiscard];
  const drawn: CardData[] = [];

  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = [...discard].sort(() => Math.random() - 0.5);
      discard = [];
      triggerPlayerRelicLifecycleHooks('onDeckShuffle');
      rebindMimicDisplayCardsForDeck('player', deck, discard);
    }
    const card = deck.pop();
    if (card) drawn.push(card);
  }
  return { drawn, newDeck: deck, newDiscard: discard };
};

const applyOnDrawCardEffects = (drawn: CardData[]) => {
  for (const card of drawn) {
    if (card.id === 'modao_overture') {
      const beforeCost = Math.max(0, Math.floor(card.manaCost ?? 0));
      const afterCost = Math.max(0, beforeCost - 1);
      if (afterCost !== beforeCost) {
        card.manaCost = afterCost;
        log(`<span class="text-blue-300">【${card.name}】被抽到：魔力消耗 ${beforeCost} → ${afterCost}</span>`);
      }
    }
    if (card.id === 'alchemy_camouflage') {
      const before = combatState.value.enemyBaseDice;
      combatState.value.enemyBaseDice = Math.max(0, combatState.value.enemyBaseDice - 1);
      enemyTurnRawDice.value = Math.max(0, enemyTurnRawDice.value - 1);
      log(`<span class="text-lime-300">【${card.name}】被抽到：敌方原始点数 ${before} → ${combatState.value.enemyBaseDice}</span>`);
    }
    if (card.type === CardType.CURSE) {
      const blackResidueCount = getActiveRelicCount('alchemy_black_residue');
      if (blackResidueCount > 0 && enemyStats.value.hp > 0) {
        const trueDamage = Math.max(0, Math.floor(combatState.value.playerBaseDice)) * blackResidueCount;
        if (trueDamage > 0) {
          const { actualDamage, logs: damageLogs } = applyDamageToSideWithRelics('enemy', enemyStats.value, trueDamage, true, '黑色残渣', {
            sourceSide: 'player',
            isDirectDamage: true,
          });
          if (actualDamage > 0) {
            pushFloatingNumber('enemy', actualDamage, 'true', '-');
          }
          logRelicMessage(`[黑色残渣] 抽到诅咒牌【${card.name}】，造成 ${actualDamage} 点真实伤害。`);
          for (const damageLog of damageLogs) {
            const normalized = damageLog.startsWith('受到') ? `敌方${damageLog}` : damageLog;
            log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
          }
        }
      }
    }
  }
};

const normalizedPlayerActiveSkills = computed<Array<ActiveSkillData | null>>(() => {
  const raw: Array<ActiveSkillData | null> = Array.isArray(props.playerActiveSkills)
    ? props.playerActiveSkills.slice(0, 2)
    : [];
  while (raw.length < 2) raw.push(null);
  return raw.map((skill) => (skill ? { ...skill } : null));
});

const activeSkillRuntime = ref<ActiveSkillRuntimeState[]>([
  { nextAvailableTurn: 1, usedCount: 0, manaTaxThisTurn: 0 },
  { nextAvailableTurn: 1, usedCount: 0, manaTaxThisTurn: 0 },
]);
const activeSkillTurnUseCount = ref<Record<string, number>>({});

const resetActiveSkillRuntime = () => {
  activeSkillRuntime.value = normalizedPlayerActiveSkills.value.map(() => ({
    nextAvailableTurn: 1,
    usedCount: 0,
    manaTaxThisTurn: 0,
  }));
  activeSkillTurnUseCount.value = {};
  tragicomedyUsage.value = { above: false, below: false };
  vitalStorageHp.value = 0;
  reverseBladeBleedOnHit.value = { player: 0, enemy: 0 };
  instantFreezeClearColdAtTurnEnd.value = false;
  activeHandSelectionMode.value = null;
  activeHandSelectionSkillIdx.value = null;
};

watch(
  normalizedPlayerActiveSkills,
  () => {
    resetActiveSkillRuntime();
  },
  { immediate: true, deep: true },
);

const activeSkillCooldownRemaining = (idx: number): number => {
  const skill = normalizedPlayerActiveSkills.value[idx];
  const clockCount = getActiveRelicCount('basic_acceleration_clock');
  if (clockCount > 0 && skill && Math.max(0, Math.floor(skill.Cooldown)) <= 1) {
    const usedThisTurn = Math.max(0, Math.floor(activeSkillTurnUseCount.value[skill.id] ?? 0));
    if (usedThisTurn < 2) return 0;
  }
  const runtime = activeSkillRuntime.value[idx];
  if (!runtime) return 0;
  return Math.max(0, runtime.nextAvailableTurn - combatState.value.turn);
};

const activeSkillDisabledReason = (idx: number): string | null => {
  const skill = normalizedPlayerActiveSkills.value[idx];
  if (!skill) return '未装备主动技能';
  if (endCombatPending.value) return '战斗结束中不可使用主动技能';
  if (activeSkillResolving.value) return '主动技能结算中';
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return '当前阶段不可使用主动技能';
  if (getEffectStacks(playerStats.value, ET.STUN) > 0) return '处于眩晕，无法行动';

  const runtime = activeSkillRuntime.value[idx];
  const cooldown = activeSkillCooldownRemaining(idx);
  if (getEffectStacks(enemyStats.value, ET.SIGHT_DEPRIVATION) > 0 && runtime && runtime.usedCount >= 1) {
    return '视线剥夺中，本场该主动技只能使用1次';
  }
  if (cooldown > 0) return `冷却中（剩余${cooldown}回合）`;
  if (getActiveRelicCount('basic_acceleration_clock') > 0 && Math.max(0, Math.floor(skill.Cooldown)) <= 1) {
    const usedThisTurn = Math.max(0, Math.floor(activeSkillTurnUseCount.value[skill.id] ?? 0));
    if (usedThisTurn >= 2) return '本回合已达到最大使用次数（2）';
  }

  const maxUses = Math.max(0, Math.floor(skill.maxUses ?? 0));
  if (maxUses > 0 && runtime && runtime.usedCount >= maxUses) {
    return `本场已达到最大使用次数（${maxUses}）`;
  }

  if (skill.id === 'active_bloodpool_tragicomedy') {
    if (!isAboveHalfHp(playerStats.value) && !isBelowHalfHp(playerStats.value)) {
      return '当前生命正好为50%，无法使用';
    }
    if (isAboveHalfHp(playerStats.value) && tragicomedyUsage.value.above) {
      return '高于50%生命时本场已使用过';
    }
    if (isBelowHalfHp(playerStats.value) && tragicomedyUsage.value.below) {
      return '低于50%生命时本场已使用过';
    }
  }

  if (skill.id === 'active_bloodpool_demon_contract') {
    const usedThisTurn = Math.max(0, Math.floor(activeSkillTurnUseCount.value[skill.id] ?? 0));
    if (usedThisTurn >= 2) {
      return '本回合已达到最大使用次数（2）';
    }
  }

  if (playerStats.value.mp < getActiveSkillManaCost(idx)) {
    return '魔力不足';
  }

  return null;
};

const activeSkillButtonDisabled = (idx: number): boolean => {
  const skill = normalizedPlayerActiveSkills.value[idx];
  if (!skill) return true;
  if (
    activeHandSelectionMode.value
    && activeHandSelectionSkillIdx.value === idx
    && (skill.id === 'active_alchemy_purify' || skill.id === 'active_alchemy_appreciate')
  ) {
    return false;
  }
  return Boolean(activeSkillDisabledReason(idx));
};

const playerActiveSkillSlots = computed<ActiveSkillSlotView[]>(() => normalizedPlayerActiveSkills.value.map((skill, idx) => ({
  idx,
  skill,
  cooldownRemaining: activeSkillCooldownRemaining(idx),
  usedCount: activeSkillRuntime.value[idx]?.usedCount ?? 0,
  maxUses: skill ? Math.max(0, Math.floor(skill.maxUses ?? 0)) || null : null,
  manaCost: skill ? getActiveSkillManaCost(idx) : 0,
})));

const getActiveSkillStatusText = (slot: ActiveSkillSlotView): string => {
  const reason = activeSkillDisabledReason(slot.idx);
  if (reason?.startsWith('冷却中')) return `冷${slot.cooldownRemaining}`;
  if (reason?.startsWith('本回合已达到最大使用次数')) return '回合上限';
  if (slot.maxUses) return `${slot.usedCount}/${slot.maxUses}`;
  if (reason === '魔力不足') return '缺蓝';
  if (!slot.skill) return '未装备';
  return reason ? '不可用' : '可用';
};

const commitActiveSkillUse = (idx: number, skill: ActiveSkillData) => {
  const runtime = activeSkillRuntime.value[idx];
  if (runtime) {
    runtime.usedCount += 1;
    activeSkillTurnUseCount.value[skill.id] = Math.max(0, Math.floor(activeSkillTurnUseCount.value[skill.id] ?? 0)) + 1;
    if (skill.id === 'active_basic_infinite_amp_magic' || skill.id === 'active_basic_slot_machine') {
      runtime.manaTaxThisTurn += 1;
    }
    const cooldown = Math.max(0, Math.floor(skill.Cooldown) - getActiveRelicCount('basic_acceleration_clock'));
    runtime.nextAvailableTurn = cooldown > 0 ? combatState.value.turn + cooldown : combatState.value.turn;
  }
  triggerPlayerRelicAfterActiveSkillHooks(skill);
};

const clearActiveHandSelection = () => {
  activeHandSelectionMode.value = null;
  activeHandSelectionSkillIdx.value = null;
};

const handleActiveHandSelection = (card: CardData, handIdx: number): boolean => {
  const mode = activeHandSelectionMode.value;
  const skillIdx = activeHandSelectionSkillIdx.value;
  if (!mode || skillIdx === null) return false;
  const skill = normalizedPlayerActiveSkills.value[skillIdx];
  if (!skill) {
    clearActiveHandSelection();
    return true;
  }

  const manaCost = getActiveSkillManaCost(skillIdx);
  if (manaCost > 0) {
    const ok = spendManaWithShock('player', manaCost, `使用主动【${skill.name}】`);
    if (!ok) {
      log(`<span class="text-red-400">主动【${skill.name}】使用失败：魔力不足。</span>`);
      return true;
    }
  }

  if (mode === 'purify') {
    const [removed] = combatState.value.playerHand.splice(handIdx, 1);
    log(`<span class="text-yellow-300">主动【${skill.name}】：本场战斗中移除了【${removed?.name ?? card.name}】。</span>`);
  } else if (mode === 'appreciate') {
    combatState.value.discardPile.push(cloneCardForBattle(card));
    log(`<span class="text-yellow-300">主动【${skill.name}】：复制【${card.name}】并置入弃牌堆。</span>`);
  }

  clearActiveHandSelection();
  commitActiveSkillUse(skillIdx, skill);
  return true;
};

const cancelAlchemyGrandSynthesis = () => {
  alchemyPendingGrandSynthesis.value = null;
  log('<span class="text-gray-400">【大炼成】已取消绑定选择。</span>');
};

const confirmAlchemyGrandSynthesis = (targetCard: CardData) => {
  const pending = alchemyPendingGrandSynthesis.value;
  if (!pending) return;
  const sourceCard = pending.card;
  const currentIdx = combatState.value.playerHand.findIndex(card => card === sourceCard);
  if (currentIdx < 0) {
    alchemyPendingGrandSynthesis.value = null;
    log('<span class="text-gray-400">【大炼成】原卡牌已不在手牌中，绑定取消。</span>');
    return;
  }
  alchemyGrandSynthesisBoundCard.value.player = targetCard;
  alchemyPendingGrandSynthesis.value = null;
  log(`<span class="text-yellow-300">【大炼成】绑定【${targetCard.name}】。</span>`);
  handleCardSelect(sourceCard, currentIdx);
};

const rerollSideDiceByActiveSkill = (side: BattleSide, skillName: string): { before: number; after: number } => {
  const stats = side === 'player' ? playerStats.value : enemyStats.value;
  const before = side === 'player' ? combatState.value.playerBaseDice : combatState.value.enemyBaseDice;
  const rawRoll = side === 'player'
    ? rollPlayerDiceInRange(stats.minDice, stats.maxDice)
    : rollDiceInRange(stats.minDice, stats.maxDice);
  const afterCharge = consumeChargeOnRoll(stats, side === 'player' ? '我方' : '敌方', rawRoll);
  const after = side === 'player' ? applyCheatSilverCoinToPlayerReroll(afterCharge) : afterCharge;

  if (side === 'player') {
    playerTurnRawDice.value = rawRoll;
    combatState.value.playerBaseDice = after;
    log(`<span class="text-zinc-200">主动【${skillName}】重掷我方骰子：${before} → ${after}</span>`);
    triggerPlayerAfterRerollRelics(before, after);
    return { before, after };
  }

  enemyTurnRawDice.value = rawRoll;
  combatState.value.enemyBaseDice = after;
  log(`<span class="text-zinc-200">主动【${skillName}】重掷敌方骰子：${before} → ${after}</span>`);
  return { before, after };
};

const useActiveSkill = async (idx: number) => {
  const skill = normalizedPlayerActiveSkills.value[idx];
  if (!skill) return;
  if (
    activeHandSelectionMode.value
    && activeHandSelectionSkillIdx.value === idx
    && (skill.id === 'active_alchemy_purify' || skill.id === 'active_alchemy_appreciate')
  ) {
    clearActiveHandSelection();
    log(`<span class="text-gray-400">主动【${skill.name}】：已退出选择。</span>`);
    return;
  }
  const disabledReason = activeSkillDisabledReason(idx);
  if (disabledReason) {
    log(`<span class="text-gray-400">主动【${skill.name}】无法使用：${disabledReason}</span>`);
    return;
  }

  if (skill.id === 'active_alchemy_purify' || skill.id === 'active_alchemy_appreciate') {
    activeHandSelectionMode.value = skill.id === 'active_alchemy_purify' ? 'purify' : 'appreciate';
    activeHandSelectionSkillIdx.value = idx;
    log(`<span class="text-yellow-300">主动【${skill.name}】：请选择一张手牌。</span>`);
    return;
  }

  activeSkillResolving.value = true;
  const manaCost = getActiveSkillManaCost(idx);
  if (manaCost > 0) {
    const ok = spendManaWithShock('player', manaCost, `使用主动【${skill.name}】`);
    if (!ok) {
      activeSkillResolving.value = false;
      log(`<span class="text-red-400">主动【${skill.name}】使用失败：魔力不足。</span>`);
      return;
    }
  }

  switch (skill.id) {
    case 'active_basic_reroll_self':
      rerollSideDiceByActiveSkill('player', skill.name);
      break;
    case 'active_basic_reroll_enemy':
      rerollSideDiceByActiveSkill('enemy', skill.name);
      break;
    case 'active_basic_draw': {
      const { drawn, newDeck, newDiscard } = drawCards(1, combatState.value.playerDeck, combatState.value.discardPile);
      applyOnDrawCardEffects(drawn);
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      const card = drawn[0];
      if (!card) {
        log(`<span class="text-gray-400">主动【${skill.name}】：牌库与弃牌堆都为空，未抽到卡牌。</span>`);
      } else {
        await putDrawnCardIntoHand(card, `主动【${skill.name}】`);
      }
      break;
    }
    case 'active_basic_guard': {
      const added = addArmorForSide('player', 2);
      if (added > 0) {
        log(`<span class="text-zinc-200">主动【${skill.name}】：获得 ${added} 点护甲。</span>`);
      } else {
        log(`<span class="text-gray-400">主动【${skill.name}】：未获得护甲。</span>`);
      }
      break;
    }
    case 'active_basic_boost': {
      const before = combatState.value.playerBaseDice;
      combatState.value.playerBaseDice = Math.max(0, combatState.value.playerBaseDice + 1);
      playerTurnRawDice.value = Math.max(0, playerTurnRawDice.value + 1);
      log(`<span class="text-zinc-200">主动【${skill.name}】：我方骰子点数 ${before} → ${combatState.value.playerBaseDice}</span>`);
      break;
    }
    case 'active_basic_weaken': {
      const before = combatState.value.enemyBaseDice;
      combatState.value.enemyBaseDice = Math.max(0, combatState.value.enemyBaseDice - 1);
      enemyTurnRawDice.value = Math.max(0, enemyTurnRawDice.value - 1);
      log(`<span class="text-zinc-200">主动【${skill.name}】：敌方骰子点数 ${before} → ${combatState.value.enemyBaseDice}</span>`);
      break;
    }
    case 'active_basic_expose': {
      const before = combatState.value.enemyBaseDice;
      combatState.value.enemyBaseDice = Math.max(0, combatState.value.enemyBaseDice + 3);
      enemyTurnRawDice.value = Math.max(0, enemyTurnRawDice.value + 3);
      log(`<span class="text-zinc-200">主动【${skill.name}】：敌方原始点数 ${before} → ${combatState.value.enemyBaseDice}</span>`);
      break;
    }
    case 'active_basic_parry_blade': {
      if (applyEffect(playerStats.value, ET.BARRIER, 1, { source: skill.id })) {
        temporaryBarrierToRemoveAtTurnEnd.value += 1;
        log(`<span class="text-zinc-200">主动【${skill.name}】：获得1层持续到回合结束的结界。</span>`);
      }
      break;
    }
    case 'active_basic_graffiti': {
      combatState.value.playerBaseDice = 6;
      combatState.value.enemyBaseDice = 6;
      playerTurnRawDice.value = 6;
      enemyTurnRawDice.value = 6;
      log(`<span class="text-zinc-200">主动【${skill.name}】：将双方骰子点数设为6。</span>`);
      break;
    }
    case 'active_basic_sprint': {
      const { drawn, newDeck, newDiscard } = drawCards(1, combatState.value.playerDeck, combatState.value.discardPile);
      applyOnDrawCardEffects(drawn);
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      const card = drawn[0];
      if (!card) {
        log(`<span class="text-gray-400">主动【${skill.name}】：牌库与弃牌堆都为空，未抽到卡牌。</span>`);
      } else {
        await putDrawnCardIntoHand(card, `主动【${skill.name}】`);
      }
      break;
    }
    case 'active_basic_shuffle_magic': {
      const handCount = combatState.value.playerHand.length;
      const oldHand = [...combatState.value.playerHand];
      await playCardsToDiscardAnimation(oldHand);
      combatState.value.discardPile = [...combatState.value.discardPile, ...combatState.value.playerHand];
      combatState.value.playerHand = [];
      const { drawn, newDeck, newDiscard } = drawCards(Math.max(3, handCount), combatState.value.playerDeck, combatState.value.discardPile);
      applyOnDrawCardEffects(drawn);
      const nextHand = drawn.slice(0, 3);
      markDrawnCardsAnimation(nextHand);
      combatState.value.playerHand = nextHand;
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      log(`<span class="text-zinc-200">主动【${skill.name}】：重新抽取了 ${combatState.value.playerHand.length} 张卡牌。</span>`);
      break;
    }
    case 'active_basic_infinite_amp_magic': {
      const before = combatState.value.playerBaseDice;
      combatState.value.playerBaseDice = Math.max(0, combatState.value.playerBaseDice + 1);
      playerTurnRawDice.value = Math.max(0, playerTurnRawDice.value + 1);
      log(`<span class="text-zinc-200">主动【${skill.name}】：我方原始点数 ${before} → ${combatState.value.playerBaseDice}</span>`);
      break;
    }
    case 'active_basic_slot_machine': {
      rerollSideDiceByActiveSkill('player', skill.name);
      rerollSideDiceByActiveSkill('enemy', skill.name);
      break;
    }
    case 'active_basic_peace': {
      combatState.value.playerBaseDice = 0;
      combatState.value.enemyBaseDice = 0;
      playerTurnRawDice.value = 0;
      enemyTurnRawDice.value = 0;
      log(`<span class="text-zinc-200">主动【${skill.name}】：将双方骰子点数设为0。</span>`);
      break;
    }
    case 'active_basic_golden_chest': {
      const oldHand = [...combatState.value.playerHand];
      const nextHand = replacePlayerHandWithRandomRareCards(oldHand.length);
      await playCardsToDiscardAnimation(oldHand);
      markDrawnCardsAnimation(nextHand);
      combatState.value.discardPile = [...combatState.value.discardPile, ...oldHand];
      combatState.value.playerHand = nextHand;
      log(`<span class="text-zinc-200">主动【${skill.name}】：将手牌替换为 ${nextHand.length} 张随机稀有卡牌。</span>`);
      break;
    }
    case 'active_yanhan_flash_freeze': {
      const coldStacks = Math.max(0, Math.floor(combatState.value.playerBaseDice));
      if (coldStacks > 0) {
        applyStatusEffectWithRelics('enemy', ET.COLD, coldStacks, { source: skill.id });
        log(`<span class="text-sky-300">主动【${skill.name}】：对敌方施加 ${coldStacks} 层寒冷，并将在回合结束时清除其所有寒冷。</span>`);
      } else {
        log(`<span class="text-zinc-200">主动【${skill.name}】：当前点数为 0，本次未施加寒冷，但仍会在回合结束时清除敌方寒冷。</span>`);
      }
      instantFreezeClearColdAtTurnEnd.value = true;
      break;
    }
    case 'active_burn_equivalent_exchange': {
      const beforeHp = Math.max(0, Math.floor(playerStats.value.hp));
      const beforeMp = Math.max(0, Math.floor(playerStats.value.mp));
      const afterHp = Math.min(playerStats.value.maxHp, beforeMp);
      const hpDelta = afterHp - beforeHp;

      playerStats.value.hp = afterHp;
      if (hpDelta > 0) {
        pushFloatingNumber('player', hpDelta, 'heal', '+');
      } else if (hpDelta < 0) {
        pushFloatingNumber('player', Math.abs(hpDelta), 'true', '-');
      }

      changeManaWithShock('player', beforeHp - beforeMp, `主动【${skill.name}】`, {
        showPositiveFloating: true,
      });

      log(`<span class="text-orange-300">主动【${skill.name}】：生命 ${beforeHp} → ${playerStats.value.hp}，魔力 ${beforeMp} → ${playerStats.value.mp}</span>`);

      const reviveResult = triggerSwarmReviveIfNeeded(playerStats.value);
      for (const reviveLog of reviveResult.logs) {
        log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
      }
      break;
    }
    case 'active_bloodpool_sacrifice': {
      const bleedStacks = applyStatusEffectWithRelics('player', ET.BLEED, 3, {
        source: skill.id,
        lockDecayThisTurn: true,
      }) ? 3 : 0;
      const armorGained = addArmorForSide('player', 2);
      const manaRestored = restoreManaForSide('player', 2);
      log(`<span class="text-rose-300">主动【${skill.name}】：获得 ${bleedStacks} 层流血、${armorGained} 点护甲，回复 ${manaRestored} 点魔力。</span>`);
      break;
    }
    case 'active_bloodpool_self_rescue': {
      const healAmount = isBelowHalfHp(playerStats.value) ? 4 : 2;
      const { healed } = healForSide('player', healAmount, {
        reason: `主动【${skill.name}】治疗`,
      });
      log(`<span class="text-green-300">主动【${skill.name}】：回复了 ${healed} 点生命。</span>`);
      break;
    }
    case 'active_bloodpool_tragicomedy': {
      const beforeHp = Math.max(0, Math.floor(playerStats.value.hp));
      const afterHp = Math.max(0, Math.min(playerStats.value.maxHp, playerStats.value.maxHp - beforeHp));
      const delta = afterHp - beforeHp;
      const wasAboveHalf = isAboveHalfHp(playerStats.value);

      playerStats.value.hp = afterHp;
      if (delta > 0) {
        pushFloatingNumber('player', delta, 'heal', '+');
      } else if (delta < 0) {
        pushFloatingNumber('player', Math.abs(delta), 'true', '-');
      }
      if (wasAboveHalf) {
        tragicomedyUsage.value.above = true;
      } else {
        tragicomedyUsage.value.below = true;
      }
      log(`<span class="text-rose-300">主动【${skill.name}】：生命 ${beforeHp} → ${afterHp}，已损生命同步互换。</span>`);
      break;
    }
    case 'active_bloodpool_demon_contract': {
      const actualSelfDamage = applyDirectHpLossWithRelics('player', playerStats.value, 3, `主动【${skill.name}】自伤`);
      if (actualSelfDamage > 0) {
        pushFloatingNumber('player', actualSelfDamage, 'true', '-');
      }
      const reviveResult = triggerSwarmReviveIfNeeded(playerStats.value);
      for (const reviveLog of reviveResult.logs) {
        log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
      }
      if (playerStats.value.hp <= 0) {
        log(`<span class="text-rose-300">主动【${skill.name}】：自伤了 ${actualSelfDamage} 点生命。</span>`);
        break;
      }
      const before = combatState.value.playerBaseDice;
      combatState.value.playerBaseDice = Math.max(0, combatState.value.playerBaseDice + 2);
      playerTurnRawDice.value = Math.max(0, playerTurnRawDice.value + 2);
      log(`<span class="text-rose-300">主动【${skill.name}】：自伤了 ${actualSelfDamage} 点生命，原始点数 ${before} → ${combatState.value.playerBaseDice}</span>`);
      break;
    }
    case 'active_bloodpool_vital_storage': {
      if (vitalStorageHp.value > 0) {
        const stored = vitalStorageHp.value;
        vitalStorageHp.value = 0;
        const { healed } = healForSide('player', stored, {
          reason: `主动【${skill.name}】返还生命`,
        });
        log(`<span class="text-green-300">主动【${skill.name}】：返还并回复了 ${healed} 点生命。</span>`);
        break;
      }

      const rawStored = Math.max(0, Math.floor(playerStats.value.hp * 0.5));
      const actualSelfDamage = rawStored > 0
        ? applyDirectHpLossWithRelics('player', playerStats.value, rawStored, `主动【${skill.name}】储存生命`)
        : 0;
      vitalStorageHp.value = Math.max(0, actualSelfDamage);
      if (actualSelfDamage > 0) {
        pushFloatingNumber('player', actualSelfDamage, 'true', '-');
      }
      const reviveResult = triggerSwarmReviveIfNeeded(playerStats.value);
      for (const reviveLog of reviveResult.logs) {
        log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
      }
      log(`<span class="text-rose-300">主动【${skill.name}】：储存了 ${vitalStorageHp.value} 点生命。</span>`);
      break;
    }
    case 'active_alchemy_antidote': {
      const removable = playerStats.value.effects.filter(effect => (
        effect.stacks > 0 && EFFECT_REGISTRY[effect.type]?.polarity === 'debuff'
        && !COGNITIVE_SWAP_BLOCKED_EFFECTS.has(effect.type)
      ));
      const clearedStacks = removable.reduce((sum, effect) => sum + Math.max(0, Math.floor(effect.stacks)), 0);
      for (const effect of removable) {
        removeEffect(playerStats.value, effect.type);
      }
      const { healed } = healForSide('player', clearedStacks, {
        reason: `主动【${skill.name}】治疗`,
      });
      log(`<span class="text-emerald-300">主动【${skill.name}】：清除了 ${clearedStacks} 层负面状态，回复 ${healed} 点生命。</span>`);
      break;
    }
    case 'active_alchemy_decompose': {
      const candidates = combatState.value.playerHand
        .map((entry, handIdx) => ({ entry, handIdx }))
        .filter(({ entry }) => entry.type !== CardType.CURSE);
      if (candidates.length <= 0) {
        log(`<span class="text-gray-400">主动【${skill.name}】：当前没有可分解的非诅咒手牌。</span>`);
        break;
      }
      const picked = candidates[Math.floor(Math.random() * candidates.length)]!;
      const curseCard = getCardByName('黑手印');
      if (!curseCard) {
        log(`<span class="text-gray-400">主动【${skill.name}】：未找到黑手印。</span>`);
        break;
      }
      const beforeName = picked.entry.name;
      combatState.value.playerHand.splice(picked.handIdx, 1, cloneCardForBattle(curseCard));
      pendingAlchemyGoldDelta.value += 1;
      const { healed } = healForSide('player', 5, {
        reason: `主动【${skill.name}】治疗`,
      });
      log(`<span class="text-yellow-300">主动【${skill.name}】：将【${beforeName}】变为【黑手印】，获得1金币，回复 ${healed} 点生命。</span>`);
      break;
    }
    default:
      log(`<span class="text-gray-400">主动【${skill.name}】尚未实现效果。</span>`);
      break;
  }

  commitActiveSkillUse(idx, skill);
  activeSkillResolving.value = false;
};

const handCardClass = (card: CardData) => {
  const isActionPhase = combatState.value.phase === CombatPhase.PLAYER_INPUT;

  if (isTwinBattle) {
    const slot = getTwinPlayerSelectionSlot(card);
    const isSelected = slot !== null;
    const selectedCount = twinPlayerSelectedCards.value.filter((entry) => entry !== null).length;
    return [
      handCardAnimationClass(card),
      isSelected ? '-translate-y-12 scale-110 z-50 ring-2 ring-dungeon-gold rounded-lg shadow-[0_0_30px_#d4af37]' : '',
      !isSelected && selectedCount >= 2 ? 'opacity-35 scale-90 translate-y-6 grayscale' : 'hover:scale-110 hover:-translate-y-4 hover:z-50',
      !isActionPhase && !isSelected ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer',
    ];
  }

  const selected = combatState.value.playerSelectedCard;
  const isSelected = selected === card;
  const isNotSelected = selected && !isSelected;

  return [
    handCardAnimationClass(card),
    isSelected ? '-translate-y-12 scale-110 z-50 ring-2 ring-dungeon-gold rounded-lg shadow-[0_0_30px_#d4af37]' : '',
    isNotSelected ? 'opacity-30 scale-90 translate-y-8 grayscale' : 'hover:scale-110 hover:-translate-y-4 hover:z-50',
    !isActionPhase && !isSelected ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer',
  ];
};

const getDisplayPileCard = (card: CardData): CardData => mimicDisplayCards.get(toRaw(card)) ?? card;
const getDisplayHandCard = (card: CardData): CardData => {
  const shouldRevealMimic = (
    card.id === MOORE_MIMIC_CARD_ID
    && handCardAnimations.value[handCardKey(card)] === 'turn_end_in_hand'
  );
  return withEffectiveManaCost('player', shouldRevealMimic ? card : getDisplayPileCard(card));
};
const resetTwinTurnSelections = () => {
  twinPlayerSelectedCards.value.forEach((card) => unlockCardManaCost(card));
  twinEnemyIntentCards.value = [null, null];
  twinEnemyConsumedSlots.value = [false, false];
  twinPlayerSelectedCards.value = [null, null];
};
const isTwinSelectionReady = () => twinPlayerSelectedCards.value.every((card) => card !== null);
const markTwinPlayerSelection = (card: CardData) => {
  const currentIndex = twinPlayerSelectedCards.value.findIndex((entry) => entry === card);
  if (currentIndex >= 0) {
    unlockCardManaCost(card);
    const next = twinPlayerSelectedCards.value.filter((entry) => entry !== card);
    while (next.length < 2) next.push(null);
    twinPlayerSelectedCards.value = [next[0] ?? null, next[1] ?? null];
    return;
  }

  const next = [...twinPlayerSelectedCards.value];
  const emptyIndex = next.findIndex((entry) => entry === null);
  if (emptyIndex < 0) {
    triggerInvalidCardShake(card);
    log('<span class="text-red-400">双子机制下每回合最多选择两张牌。</span>');
    return;
  }
  next[emptyIndex] = card;
  twinPlayerSelectedCards.value = [next[0] ?? null, next[1] ?? null];
};
const fillTwinPassSlot = () => {
  const next = [...twinPlayerSelectedCards.value];
  const emptyIndex = next.findIndex((entry) => entry === null);
  if (emptyIndex < 0) return false;
  next[emptyIndex] = PASS_CARD;
  twinPlayerSelectedCards.value = [next[0] ?? null, next[1] ?? null];
  return true;
};
const getTwinDirectComboAllowedTypes = (): CardType[] => {
  if (!isTwinBattle) return [];

  const openSlotTypes = twinPlayerSelectedCards.value
    .map((selectedCard, index) => (selectedCard === null ? twinEnemyIntentCards.value[index] : null))
    .filter((card): card is CardData => card !== null && card.id !== PASS_CARD.id)
    .map((card) => card.type);

  return [...new Set(openSlotTypes)];
};
const getTwinDirectComboControlledReason = (card: CardData): string | null => {
  if (getEffectStacks(playerStats.value, ET.CONTROLLED) <= 0) return null;

  const allowedTypes = getTwinDirectComboAllowedTypes();
  if (allowedTypes.length === 0 || allowedTypes.includes(card.type)) return null;
  if (allowedTypes.length === 1) {
    return `被操控中，仅可使用${allowedTypes[0]}卡牌或跳过。`;
  }
  return `被操控中，仅可使用${allowedTypes.join('或')}卡牌或跳过。`;
};
const resolveTwinDirectComboCard = async (card: CardData, handIdx: number) => {
  lockCardManaCost('player', card);
  const [played] = combatState.value.playerHand.splice(handIdx, 1);
  if (!played) {
    unlockCardManaCost(card);
    return;
  }
  const playedCard = applyFlowingLightRingComboIfNeeded(played);

  clearDicePreview();
  showPlayerPlayedCard(playedCard);
  combatState.value.discardPile.push(playedCard);
  combatState.value.playerSelectedCard = playedCard;
  twinDirectComboResolving.value = true;
  combatState.value.phase = CombatPhase.RESOLUTION;

  try {
    await resolveCombat(
      playedCard,
      PASS_CARD,
      combatState.value.playerBaseDice,
      combatState.value.enemyBaseDice,
      {
        suppressTurnCleanup: true,
        twinDirectCombo: true,
      },
    );
  } finally {
    unlockCardManaCost(played);
    unlockCardManaCost(playedCard);
    twinDirectComboResolving.value = false;
    if (!endCombatPending.value && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
      combatState.value.playerSelectedCard = null;
      combatState.value.phase = CombatPhase.PLAYER_INPUT;
    }
  }
};
const selectEnemyTwinCards = (): [CardData, CardData] => {
  if (getEffectStacks(enemyStats.value, ET.STUN) > 0) {
    log('<span class="text-gray-400">敌方处于眩晕，双子本回合两个位置都跳过。</span>');
    return [PASS_CARD, PASS_CARD];
  }
  if (enemyDef?.selectTwinCards) {
    aiFlags.dreamControlPercent = dreamControlPercent.value;
    const ctx: EnemyAIContext = {
      enemyStats: enemyStats.value,
      playerStats: playerStats.value,
      deck: combatState.value.enemyDeck,
      playerHand: combatState.value.playerHand,
      playerBaseDice: combatState.value.playerBaseDice,
      enemyBaseDice: combatState.value.enemyBaseDice,
      getFinalPoint: (source, card, baseDice) => getCardFinalPoint(source, card, baseDice, true),
      playerDeck: combatState.value.playerDeck,
      playerDiscard: combatState.value.discardPile,
      previousPlayerCardType: previousPlayerLastCardType.value,
      turn: combatState.value.turn,
      flags: aiFlags,
    };
    const [first, second] = enemyDef.selectTwinCards(ctx);
    return [first ?? PASS_CARD, second ?? PASS_CARD];
  }
  const fallback = selectEnemyCard();
  return [fallback, PASS_CARD];
};

const resolveTwinCombatSequence = async () => {
  const playerCards = twinPlayerSelectedCards.value;
  const enemyCards = twinEnemyIntentCards.value;
  const originalPlayerBaseDice = combatState.value.playerBaseDice;
  const originalEnemyBaseDice = combatState.value.enemyBaseDice;
  const slotEntries: Array<{ slot: 1 | 2; playerCard: CardData; enemyCard: CardData }> = [
    {
      slot: 1,
      playerCard: playerCards[0] ?? PASS_CARD,
      enemyCard: enemyCards[0] ?? PASS_CARD,
    },
    {
      slot: 2,
      playerCard: playerCards[1] ?? PASS_CARD,
      enemyCard: enemyCards[1] ?? PASS_CARD,
    },
  ];

  clearDicePreview();

  for (const entry of slotEntries) {
    if (endCombatPending.value || playerStats.value.hp <= 0 || enemyStats.value.hp <= 0) {
      resetTwinTurnSelections();
      return;
    }

    let playerCardToResolve = entry.playerCard;
    if (playerCardToResolve.id !== PASS_CARD.id) {
      const handIndex = combatState.value.playerHand.findIndex((card) => card === playerCardToResolve);
      if (handIndex >= 0) {
        const [played] = combatState.value.playerHand.splice(handIndex, 1);
        if (played) {
          playerCardToResolve = applyFlowingLightRingComboIfNeeded(played);
          if (playerCardToResolve !== played) {
            unlockCardManaCost(played);
          }
          combatState.value.discardPile.push(playerCardToResolve);
        }
      } else {
        playerCardToResolve = PASS_CARD;
      }
    }

    combatState.value.playerBaseDice = originalPlayerBaseDice;
    combatState.value.enemyBaseDice = originalEnemyBaseDice;
    combatState.value.playerSelectedCard = playerCardToResolve;
    combatState.value.enemyIntentCard = entry.enemyCard;
    enemyIntentConsumedThisTurn.value = false;
    enemyIntentManaSpentThisTurn.value = false;
    twinEnemyConsumedSlots.value[entry.slot - 1] = false;

    if (playerCardToResolve.id !== PASS_CARD.id) {
      showPlayerPlayedCard(playerCardToResolve);
    } else {
      clearPlayerPlayedCard();
    }

    await resolveCombat(
      playerCardToResolve,
      entry.enemyCard,
      originalPlayerBaseDice,
      originalEnemyBaseDice,
      {
        deferTurnCleanup: entry.slot === 1,
        twinSlotIndex: entry.slot,
      },
    );

    twinEnemyConsumedSlots.value[entry.slot - 1] = true;
    clearPlayerPlayedCard();

    if (endCombatPending.value || playerStats.value.hp <= 0 || enemyStats.value.hp <= 0) {
      resetTwinTurnSelections();
      return;
    }
  }
};

// --- Enemy AI Card Selection ---
function selectEnemyCard(): CardData {
  // 眩晕中的敌方本回合直接跳过
  if (getEffectStacks(enemyStats.value, ET.STUN) > 0) {
    log('<span class="text-gray-400">敌方处于眩晕，跳过回合。</span>');
    return PASS_CARD;
  }

  if (combatState.value.enemyDeck.length === 0) {
    if (combatState.value.enemyDiscard.length === 0) return PASS_CARD; // Fallback
    combatState.value.enemyDeck = [...combatState.value.enemyDiscard].sort(() => Math.random() - 0.5);
    combatState.value.enemyDiscard = [];
  }

  if (isMirrorCloneBattle) {
    if (combatState.value.turn === 1) return PASS_CARD;
    const ignoreMimicType = enemyComboPreludeResolvedTurn.value === combatState.value.turn;
    const desiredType = ignoreMimicType
      ? null
      : previousPlayerLastCardType.value;
    const candidates = desiredType
      ? combatState.value.enemyDeck.filter((card) => card.type === desiredType)
      : combatState.value.enemyDeck;
    const pool = candidates.length > 0 ? candidates : combatState.value.enemyDeck;
    return pool[Math.floor(Math.random() * pool.length)] ?? PASS_CARD;
  }

  let selectedCard: CardData;
  if (enemyDef) {
    // Use the enemy's custom AI logic
    aiFlags.dreamControlPercent = dreamControlPercent.value;
    const ctx: EnemyAIContext = {
      enemyStats: enemyStats.value,
      playerStats: playerStats.value,
      deck: combatState.value.enemyDeck,
      playerHand: combatState.value.playerHand,
      playerBaseDice: combatState.value.playerBaseDice,
      enemyBaseDice: combatState.value.enemyBaseDice,
      getFinalPoint: (source, card, baseDice) => getCardFinalPoint(source, card, baseDice, true),
      playerDeck: combatState.value.playerDeck,
      playerDiscard: combatState.value.discardPile,
      previousPlayerCardType: previousPlayerLastCardType.value,
      turn: combatState.value.turn,
      flags: aiFlags,
    };
    selectedCard = enemyDef.selectCard(ctx);
  } else {
    // Fallback: random selection (should never happen with proper registry)
    const idx = Math.floor(Math.random() * combatState.value.enemyDeck.length);
    selectedCard = combatState.value.enemyDeck[idx]!;
  }

  // 敌方“连击前置结算”后，本回合正式意图不再重复连击牌，避免同回合循环触发。
  if (
    enemyComboPreludeResolvedTurn.value === combatState.value.turn
    && selectedCard.id !== PASS_CARD.id
    && selectedCard.traits.combo
  ) {
    const fallback = combatState.value.enemyDeck.find((card) => !card.traits.combo && card.id !== PASS_CARD.id);
    selectedCard = fallback ?? PASS_CARD;
  }

  return selectedCard;
}

const resolveEnemyComboPreludeIfNeeded = async (initialCard: CardData): Promise<CardData> => {
  let current = initialCard;
  let safety = 0;
  while (
    !endCombatPending.value
    && current.id !== PASS_CARD.id
    && current.traits.combo
    && safety < 6
  ) {
    combatState.value.enemyIntentCard = current;
    enemyIntentConsumedThisTurn.value = false;
    enemyIntentManaSpentThisTurn.value = false;
    await wait(320);
    await resolveCombat(
      PASS_CARD,
      current,
      combatState.value.playerBaseDice,
      combatState.value.enemyBaseDice,
      { enemyComboPrelude: true },
    );
    if (endCombatPending.value || playerStats.value.hp <= 0 || enemyStats.value.hp <= 0) {
      return PASS_CARD;
    }
    enemyComboPreludeResolvedTurn.value = combatState.value.turn;
    safety += 1;
    current = selectEnemyCard();
  }
  return current;
};

// --- Phase Management ---

const startTurn = () => {
  if (endCombatPending.value) return;
  log(`<span class="text-slate-300">——第${combatState.value.turn}回合——</span>`);
  hideIdleDiceUntilNextTurn.value = false;
  enemyManaLackHintTurn = -1;
  armorDecaySkippedThisTurn.value.player = false;
  armorDecaySkippedThisTurn.value.enemy = false;
  turnPointModifier.value.player = 0;
  turnPointModifier.value.enemy = 0;
  reflectionActiveThisTurn.value = { player: false, enemy: false };
  blankOfBlankActiveThisTurn.value = { player: false, enemy: false };
  blankOfBlankBonusThisTurn.value = { player: 0, enemy: 0 };
  temporaryBarrierToRemoveAtTurnEnd.value = 0;
  reverseBladeBleedOnHit.value = { player: 0, enemy: 0 };
  activeSkillTurnUseCount.value = {};
  activeSkillRuntime.value.forEach((runtime) => {
    runtime.manaTaxThisTurn = 0;
  });
  if (sealCircuitPendingMana.value > 0) {
    const pending = sealCircuitPendingMana.value;
    sealCircuitPendingMana.value = 0;
    const restored = restoreManaForSide('player', pending);
    if (restored > 0) {
      logRelicMessage(`[封存回路] 释放储能，回复 ${restored} 点魔力。`);
    }
  }
  const reverseCircuitCount = getActiveRelicCount('burn_reverse_circuit');
  if (reverseCircuitCount > 0 && getEffectStacks(playerStats.value, ET.BURN) > 0) {
    const hpLoss = Math.min(playerStats.value.hp, reverseCircuitCount);
    let actualHpLoss = 0;
    if (hpLoss > 0) {
      actualHpLoss = applyDirectHpLossWithRelics('player', playerStats.value, hpLoss, '逆燃回路');
      pushFloatingNumber('player', actualHpLoss, 'true', '-');
      addPlayerDamageTakenThisTurn(actualHpLoss);
    }
    const restored = restoreManaForSide('player', reverseCircuitCount);
    logRelicMessage(`[逆燃回路] 检测到自身燃烧，失去 ${actualHpLoss} 点生命并回复 ${restored} 点魔力。`);
    if (playerStats.value.hp <= 0) return;
  }
  const scaleRingCount = getActiveRelicCount('modao_scale_ring');
  if (scaleRingCount > 0 && combatState.value.turn % 3 === 0) {
    const restored = restoreManaForSide('player', scaleRingCount);
    if (restored > 0) {
      logRelicMessage(`[刻度环] 第 ${combatState.value.turn} 回合触发，回复 ${restored} 点魔力。`);
    }
  }
  clearDicePreview();
  stopAllCardAnimations();
  combatState.value.phase = CombatPhase.DRAW_PHASE;
  combatState.value.playerSelectedCard = null;
  combatState.value.enemyIntentCard = null;
  executionerPuppetPointModifier.value = null;
  enemyIntentConsumedThisTurn.value = false;
  enemyIntentManaSpentThisTurn.value = false;
  enemyComboPreludeResolvedTurn.value = null;
  drawPhasePreparing.value = false;
  isRolling.value = true;
  shatteringTarget.value = null;
  showClashAnimation.value = false;
  playerPlayedPhysicalOrMagicThisTurn.value = false;
  mooreMimicPlayedThisTurn.value = false;
  alchemyBlackComboTriggeredThisTurn.value = false;
  triggerPlayerRelicLifecycleHooks('onTurnStart');
  applyAlchemyDizzyFruitOnTurnStart();
  const pulseMarkCount = getActiveRelicCount('bloodpool_pulse_mark');
  if (pulseMarkCount > 0 && playerStats.value.hp > 0) {
    const pulseDamage = Math.max(0, pulseMarkCount * 2);
    if (pulseDamage > 0) {
      const { actualDamage, logs: pulseLogs } = applyDamageToSideWithRelics('player', playerStats.value, pulseDamage, true, '脉搏印记');
      if (actualDamage > 0) {
        pushFloatingNumber('player', actualDamage, 'true', '-');
        addPlayerDamageTakenThisTurn(actualDamage);
        logRelicMessage(`[脉搏印记] 回合开始受到 ${actualDamage} 点真实伤害。`);
        triggerPlayerRelicHitHooks(
          'enemy',
          'player',
          PASS_CARD,
          0,
          1,
          1,
          actualDamage,
          actualDamage,
        );
      }
      for (const pulseLog of pulseLogs) {
        const normalized = pulseLog.startsWith('受到') ? `我方${pulseLog}` : pulseLog;
        log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
      }
      if (playerStats.value.hp <= 0) return;
    }
  }

  setTimeout(() => {
    if (endCombatPending.value) return;
    const pRawRoll = rollPlayerDiceInRange(playerStats.value.minDice, playerStats.value.maxDice);
    const eRawRoll = usesPlayerPreviousPointDice && previousPlayerFinalPoint.value !== null
      ? Math.max(0, Math.floor(previousPlayerFinalPoint.value))
      : Math.floor(Math.random() * (effectiveEnemyMaxDice.value - effectiveEnemyMinDice.value + 1)) + effectiveEnemyMinDice.value;
    const pRoll = consumeChargeOnRoll(playerStats.value, '我方', pRawRoll);
    const eRoll = consumeChargeOnRoll(enemyStats.value, '敌方', eRawRoll);
    playerTurnRawDice.value = pRawRoll;
    enemyTurnRawDice.value = eRawRoll;

    isRolling.value = false;
    combatState.value.playerBaseDice = pRoll;
    combatState.value.enemyBaseDice = eRoll;
    combatState.value.phase = CombatPhase.DRAW_PHASE;
    log(`掷骰结果：我方 [${pRoll}] vs 敌方 [${eRoll}]`);
  }, scaleDuration(1500));
};

// Watch for INIT phase
watch(
  () => combatState.value.phase,
  (phase) => {
     if (endCombatPending.value) return;
     if (phase === CombatPhase.TURN_START) {
      playerDamageTakenThisTurn.value = 0;
      directDamageTakenThisTurn.value = { player: 0, enemy: 0 };
      damageHitTakenThisTurn.value = { player: 0, enemy: 0 };
      coldRetaliationPerDamageThisTurn.value = { player: 0, enemy: 0 };
      alchemyCatalystActiveThisTurn.value = { player: false, enemy: false };
      freezePumpTriggersThisTurn.value = 0;
      freezeFlowCoreTriggeredThisTurn.value = false;
      microFloatingCannonTriggeredThisTurn.value = false;
      modaoStabilizerTriggersThisTurn.value = 0;
      bloodpoolSkinMarkTriggersThisTurn.value = 0;
      const playerVoidTaint = findEffect(playerStats.value, ET.VOID_TAINT);
      if (playerVoidTaint) playerVoidTaint.runtimeCounter = 0;
      const enemyVoidTaint = findEffect(enemyStats.value, ET.VOID_TAINT);
      if (enemyVoidTaint) enemyVoidTaint.runtimeCounter = 0;
      if (combatState.value.turn === 1) {
        dreamControlPercent.value = DREAM_CONTROL_INITIAL;
        resetTwinTurnSelections();
        bloodpoolFirstBleedFeastTriggered.value = false;
        bloodpoolCriticalReboundTriggered.value = false;
        flowingLightRingConsumed.value = false;
        battleCardFirstUseConsumed.value = { player: {}, enemy: {} };
        battleCardPointBonus.value = { player: {}, enemy: {} };
        alchemyPerfumePointDoubleCardIds.value = { player: {}, enemy: {} };
        alchemyGrandSynthesisPointBonusByCard.value = { player: new WeakMap<CardData, number>(), enemy: new WeakMap<CardData, number>() };
        alchemyGrandSynthesisPointBonusVersion.value += 1;
        alchemyGrandSynthesisBoundCard.value = { player: null, enemy: null };
        alchemyCatalystUseCount.value = { player: 0, enemy: 0 };
        alchemyPendingGrandSynthesis.value = null;
        activeHandSelectionMode.value = null;
        activeHandSelectionSkillIdx.value = null;
        pendingAlchemyGoldDelta.value = 0;
        turnPointModifier.value = { player: 0, enemy: 0 };
        reflectionActiveThisTurn.value = { player: false, enemy: false };
        blankOfBlankActiveThisTurn.value = { player: false, enemy: false };
        blankOfBlankBonusThisTurn.value = { player: 0, enemy: 0 };
        armorDecaySkippedThisTurn.value = { player: false, enemy: false };
        temporaryBarrierToRemoveAtTurnEnd.value = 0;
        reverseBladeBleedOnHit.value = { player: 0, enemy: 0 };
        temporaryDamageBoostToRemoveAtTurnEnd.value = { player: 0, enemy: 0 };
        activeSkillTurnUseCount.value = {};
        tragicomedyUsage.value = { above: false, below: false };
        vitalStorageHp.value = 0;
        instantFreezeClearColdAtTurnEnd.value = false;
        playerStats.value.swarmHealReduction = 0;
        enemyStats.value.swarmHealReduction = 0;
        nextMagicDoubleCast.value.player = 0;
        nextMagicDoubleCast.value.enemy = 0;
        nextMagicDoubleCastFreeMana.value.player = 0;
        nextMagicDoubleCastFreeMana.value.enemy = 0;
        nextTurnMagicCostFree.value.player = 0;
        nextTurnMagicCostFree.value.enemy = 0;
        nextTurnMagicPointBonus.value = {
          player: { turn: 0, amount: 0 },
          enemy: { turn: 0, amount: 0 },
        };
        previousPlayerLastCardType.value = null;
        previousPlayerFinalPoint.value = null;
        const voidCards = combatState.value.playerDeck.filter(card => card.id === 'alchemy_void').length;
        if (voidCards > 0) {
          combatState.value.playerDeck = combatState.value.playerDeck.filter(card => card.id !== 'alchemy_void');
          const beforeMp = playerStats.value.mp;
          changeManaWithShock('player', -2 * voidCards, '虚无开局移除');
          log(`<span class="text-violet-300">【虚无】战斗开始移除 ${voidCards} 张，魔力 ${beforeMp} → ${playerStats.value.mp}。</span>`);
        }
        currentTurnMagicReflect.value = { player: 0, enemy: 0 };
        currentTurnManaSnapshot.value = {
          player: Math.max(0, Math.floor(playerStats.value.mp)),
          enemy: Math.max(0, Math.floor(enemyStats.value.mp)),
        };
        previousTurnManaSnapshot.value = {
          player: Math.max(0, Math.floor(playerStats.value.mp)),
          enemy: Math.max(0, Math.floor(enemyStats.value.mp)),
        };
      }
      if (
        isLordBattle
        && shouldGrantLordTurnBoost(difficultyAtBattleStart, customDifficultyInfluencesAtBattleStart)
        && lordTurnBoostInterval !== null
        && combatState.value.turn > 0
        && combatState.value.turn % lordTurnBoostInterval === 0
      ) {
        const applied = applyEffect(enemyStats.value, ET.DAMAGE_BOOST, 1, { source: `difficulty:${difficultyAtBattleStart}` });
        if (applied) {
          log(`<span class="text-rose-300">[${difficultyAtBattleStart}难度] 领主在第 ${combatState.value.turn} 回合获得了 1 层增伤。</span>`);
        }
      }
      applyUnseeableAura('player', 'turn_start');
      applyUnseeableAura('enemy', 'turn_start');
      applySinkingNegativeStatusOnTurnStart();
      insertPrayerCandleRetreatIntoPlayerDeck();
      applyTwinDreamControlThresholds();
      // Process turn-start effects (poison, burn, mana spring, etc.)
      if (combatState.value.turn > 1) {
        for (const [side, label, stats] of [['player', '我方', playerStats], ['enemy', '敌方', enemyStats]] as const) {
          const targetSide = side as RelicSide;
          const opponentSide: RelicSide = side === 'player' ? 'enemy' : 'player';
          const opponentStats = side === 'player' ? enemyStats : playerStats;
          const poisonAmountBeforeTurnStart = getEffectStacks(stats.value, ET.POISON_AMOUNT);
          const hpBeforeTurnStart = stats.value.hp;
          const poisonAmountLethalTriggered = poisonAmountBeforeTurnStart > 0 && poisonAmountBeforeTurnStart >= hpBeforeTurnStart;
          const result = processOnTurnStart(stats.value);
          let turnStartLogs = [...result.logs];
          let burnDamageTaken = 0;
          let burnIsTrueDamage = false;
          let turnStartImmediateDamageTaken = 0;
          let turnStartTrueDamageTaken = 0;

          const livingRoomStacks = getEffectStacks(stats.value, ET.LIVING_ROOM);
          if (livingRoomStacks > 0) {
            const currentPoint = side === 'player'
              ? combatState.value.playerBaseDice
              : combatState.value.enemyBaseDice;
            const amountPerStack = Math.max(0, Math.floor(currentPoint / 2));
            const totalAmount = amountPerStack * livingRoomStacks;
            if (totalAmount > 0) {
              applyStatusEffectWithRelics(opponentSide, ET.FATIGUE, totalAmount, { source: 'effect:living_room' });
              applyStatusEffectWithRelics(targetSide, ET.CHARGE, totalAmount, { source: 'effect:living_room' });
              turnStartLogs.push(`[活体房间] 以当前点数 ${currentPoint} 为基础：为对方施加 ${totalAmount} 层疲劳，并为自身施加 ${totalAmount} 层蓄力。`);
            }
          }

          if (combatState.value.turn % 3 === 0) {
            const growthBigStacks = getEffectStacks(stats.value, ET.POINT_GROWTH_BIG);
            if (growthBigStacks > 0) {
              stats.value.maxDice += growthBigStacks;
              turnStartLogs.push(`[点数成长（大）] 最大骰子点数 +${growthBigStacks}（当前 ${stats.value.maxDice}）`);
            }

            const growthSmallStacks = getEffectStacks(stats.value, ET.POINT_GROWTH_SMALL);
            if (growthSmallStacks > 0) {
              stats.value.minDice += growthSmallStacks;
              if (stats.value.minDice > stats.value.maxDice) {
                stats.value.maxDice = stats.value.minDice;
              }
              turnStartLogs.push(`[点数成长（小）] 最小骰子点数 +${growthSmallStacks}（当前 ${stats.value.minDice}）`);
            }
          }

          for (const pending of result.applyToOpponent) {
            applyStatusEffectWithRelics(opponentSide, pending.type, pending.stacks, { source: `effect:${pending.type}` });
          }

          if (result.opponentHpChange !== 0) {
          if (result.opponentHpChange > 0) {
              healForSide(opponentSide, result.opponentHpChange, {
                sourceSide: targetSide,
                reason: '回合开始效果治疗',
              });
            } else {
              const hpBeforeOpponent = opponentStats.value.hp;
              opponentStats.value.hp = Math.max(0, Math.min(opponentStats.value.maxHp, opponentStats.value.hp + result.opponentHpChange));
              const actualOpponentHpDelta = opponentStats.value.hp - hpBeforeOpponent;
              if (actualOpponentHpDelta < 0) {
                pushFloatingNumber(opponentSide, Math.abs(actualOpponentHpDelta), 'magic', '-');
              }
            }
          }

          // 燃烧伤害单独结算，以支持圣遗物修改
          const burnLog = result.logs.find((entry) => entry.includes('[燃烧]'));
          if (burnLog) {
            const burnMatch = burnLog.match(/损失\s+(\d+)\s+点生命/);
            const rawBurnDamage = burnMatch ? Number(burnMatch[1]) : 0;
            const burnStacks = getEffectStacks(stats.value, ET.BURN);
            turnStartLogs = turnStartLogs.filter((entry) => entry !== burnLog);

            if (rawBurnDamage > 0) {
              const burnResult = triggerPlayerRelicBeforeBurnDamageHooks(
                targetSide,
                burnStacks,
                rawBurnDamage,
                combatState.value.turn,
              );

              result.hpChange += rawBurnDamage; // 移除 processOnTurnStart 的基础燃烧伤害

              if (burnResult.damage > 0) {
                if (burnResult.isTrueDamage) {
                  const { actualDamage, logs: burnApplyLogs } = applyDamageToSideWithRelics(
                    side,
                    stats.value,
                    burnResult.damage,
                    true,
                    '燃烧',
                    {
                      sourceSide: targetSide === 'enemy' ? 'player' : 'enemy',
                      dreamControlKind: targetSide === 'enemy' ? 'status' : undefined,
                    },
                  );
                  burnDamageTaken = actualDamage;
                  burnIsTrueDamage = actualDamage > 0;
                  turnStartImmediateDamageTaken += actualDamage;
                  if (actualDamage > 0) {
                    pushFloatingNumber(side, actualDamage, 'true', '-');
                  }
                  turnStartLogs.push(`[燃烧] 受到 ${actualDamage} 点真实伤害。`);
                  for (const burnApplyLog of burnApplyLogs) {
                    turnStartLogs.push(burnApplyLog);
                  }
                } else {
                  const { actualDamage, logs: burnApplyLogs } = applyDamageToSideWithRelics(
                    side,
                    stats.value,
                    burnResult.damage,
                    false,
                    '燃烧',
                    {
                      sourceSide: targetSide === 'enemy' ? 'player' : 'enemy',
                      dreamControlKind: targetSide === 'enemy' ? 'status' : undefined,
                    },
                  );
                  burnDamageTaken = actualDamage;
                  turnStartImmediateDamageTaken += actualDamage;
                  if (actualDamage > 0) {
                    pushFloatingNumber(side, actualDamage, 'magic', '-');
                    turnStartLogs.push(`[燃烧] 损失 ${actualDamage} 点生命。`);
                  } else {
                    turnStartLogs.push('[燃烧] 伤害被完全抵挡。');
                  }
                  for (const burnApplyLog of burnApplyLogs) {
                    turnStartLogs.push(burnApplyLog);
                  }
                }
              } else {
                turnStartLogs.push('[燃烧] 伤害为 0。');
              }
            }
          }

          const inkCreationStacks = getEffectStacks(stats.value, ET.INK_CREATION);
          if (burnDamageTaken > 0 && inkCreationStacks > 0) {
            const extraTrueDamage = Math.max(0, Math.floor(burnDamageTaken * inkCreationStacks));
            if (extraTrueDamage > 0) {
            const { actualDamage, logs: inkCreationLogs } = applyDamageToSideWithRelics(
              side,
              stats.value,
              extraTrueDamage,
              true,
              '笔墨造物',
            );
              turnStartImmediateDamageTaken += actualDamage;
              if (actualDamage > 0) {
                pushFloatingNumber(side, actualDamage, 'true', '-');
              }
              turnStartLogs.push(`[笔墨造物] 受到燃烧后追加 ${actualDamage} 点真实伤害。`);
              for (const inkCreationLog of inkCreationLogs) {
                turnStartLogs.push(inkCreationLog);
              }
            }
          }

          const negativeHpChange = Math.min(0, result.hpChange);
          const positiveHpChange = Math.max(0, result.hpChange);
          if (negativeHpChange !== 0) {
            stats.value.hp = Math.max(0, Math.min(stats.value.maxHp, stats.value.hp + negativeHpChange));
          }
          if (result.mpChange !== 0) {
            changeManaWithShock(side, result.mpChange, '法力变化（回合开始）', { showPositiveFloating: true });
          }
          if (result.trueDamage > 0) {
            const hpBeforeTrueDamage = stats.value.hp;
            const { actualDamage } = applyDamageToSideWithRelics(
              side,
              stats.value,
              result.trueDamage,
              true,
              '回合开始真实伤害',
              {
                skipHeartMark: true,
                sourceSide: targetSide === 'enemy' ? 'player' : 'enemy',
                dreamControlKind: targetSide === 'enemy' ? 'status' : undefined,
              },
            );
            turnStartTrueDamageTaken = actualDamage;
            if (actualDamage > 0) {
              pushFloatingNumber(side, actualDamage, 'true', '-');
            }
            if (
              targetSide === 'player'
              && poisonAmountLethalTriggered
              && hpBeforeTrueDamage > 0
              && stats.value.hp <= 0
            ) {
              queuePlayerLethalNegativeStatus(PLAYER_POISON_LETHAL_NEGATIVE_STATUS, '中毒量致死判定');
            }
          }
          // 回合开始的致死伤害应当阻断后续治疗，避免出现“先死亡再被同阶段回血拉起”的穿透结算。
          if (stats.value.hp > 0 && positiveHpChange > 0) {
            healForSide(targetSide, positiveHpChange);
          }
          if (targetSide === 'player') {
            const turnStartDamageTaken = Math.max(
              0,
              turnStartImmediateDamageTaken + turnStartTrueDamageTaken + Math.max(0, -negativeHpChange),
            );
            addPlayerDamageTakenThisTurn(turnStartDamageTaken);
          }
          if (burnDamageTaken > 0) {
            triggerPlayerRelicAfterBurnDamageTakenHooks(
              targetSide,
              getEffectStacks(stats.value, ET.BURN),
              burnDamageTaken,
              burnIsTrueDamage,
              combatState.value.turn,
            );
            const paintingCount = getActiveRelicCount('bloodpool_eerie_miniature_painting');
            if (targetSide === 'enemy' && paintingCount > 0 && enemyStats.value.hp > 0) {
              for (let i = 0; i < paintingCount; i += 1) {
                const damage = triggerBleedProc('enemy', `[诡异微型画作] 燃烧触发联动（${i + 1}/${paintingCount}）`);
                if (damage <= 0 || enemyStats.value.hp <= 0) break;
              }
            }
          }
          const reviveResult = triggerSwarmReviveIfNeeded(stats.value);
          for (const reviveLog of reviveResult.logs) {
            log(`<span class="text-violet-300 text-[9px]">${label}: ${reviveLog}</span>`);
          }
          for (const l of turnStartLogs) {
            log(`<span class="text-gray-400 text-[9px]">${label}: ${l}</span>`);
          }
        }
      }
      if (combatState.value.turn > 1) {
        previousTurnManaSnapshot.value = { ...currentTurnManaSnapshot.value };
      }
      currentTurnManaSnapshot.value = {
        player: Math.max(0, Math.floor(playerStats.value.mp)),
        enemy: Math.max(0, Math.floor(enemyStats.value.mp)),
      };
      if (combatState.value.turn === 1) {
        previousTurnManaSnapshot.value = { ...currentTurnManaSnapshot.value };
      }
      setTimeout(() => {
        if (endCombatPending.value) return;
        startTurn();
      }, scaleDuration(1000));
    }
  },
  { immediate: true },
);

// Watch for DRAW_PHASE
watch(
  [() => combatState.value.phase, isRolling],
  ([phase, rolling]) => {
    if (endCombatPending.value) return;
    if (phase === CombatPhase.DRAW_PHASE && !rolling && !drawPhasePreparing.value) {
      drawPhasePreparing.value = true;
      void (async () => {
        try {
          const { drawn, newDeck, newDiscard } = drawCards(3, combatState.value.playerDeck, combatState.value.discardPile);
          applyOnDrawCardEffects(drawn);
          markDrawnCardsAnimation(drawn);
          combatState.value.playerHand = drawn;
          refreshPlayerSightDeprivationMask(drawn);
          combatState.value.playerDeck = newDeck;
          combatState.value.discardPile = newDiscard;
          resetTwinTurnSelections();
          if (isTwinBattle) {
            const [slot1Card, slot2Card] = selectEnemyTwinCards();
            twinEnemyIntentCards.value = [slot1Card, slot2Card];
            twinEnemyConsumedSlots.value = [false, false];
            combatState.value.enemyIntentCard = slot1Card;
            enemyIntentConsumedThisTurn.value = false;
            enemyIntentManaSpentThisTurn.value = false;
            combatState.value.phase = CombatPhase.PLAYER_INPUT;
            return;
          }

          // 敌方连击牌：回合开始先亮出并直接结算，再亮出本回合正式意图牌。
          const eCard = await resolveEnemyComboPreludeIfNeeded(selectEnemyCard());
          if (endCombatPending.value) return;

          combatState.value.enemyIntentCard = eCard;
          enemyIntentConsumedThisTurn.value = false;
          enemyIntentManaSpentThisTurn.value = false;
          combatState.value.phase = CombatPhase.PLAYER_INPUT;
        } finally {
          drawPhasePreparing.value = false;
        }
      })();
    }
  },
);

// Handle Card Select
const handleCardSelect = (card: CardData, handIdx: number) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (activeSkillResolving.value) return;
  if (handIdx < 0 || handIdx >= combatState.value.playerHand.length) return;
  if (combatState.value.playerHand[handIdx] !== card) return;
  if (handleActiveHandSelection(card, handIdx)) return;
  if (isBlockedByPriorityFoodCard(card)) {
    triggerInvalidCardShake(card);
    log('<span class="text-red-400">【烤肉】在手牌中时，必须优先打出它。</span>');
    return;
  }

  if (isTwinBattle) {
    const runtimeCard = previewFlowingLightRingCombo(withEffectiveManaCost('player', card));
    if (runtimeCard.traits.combo) {
      const allowedTypes = getTwinDirectComboAllowedTypes();
      const controlledExpectedType = allowedTypes.length === 1 ? allowedTypes[0] : null;
      const check = canPlayCard(playerStats.value, runtimeCard, combatState.value.playerBaseDice, {
        controlledExpectedType,
      });
      const controlledReason = check.allowed ? getTwinDirectComboControlledReason(runtimeCard) : null;
      if (!check.allowed || controlledReason) {
        triggerInvalidCardShake(card);
        log(`<span class="text-red-400">${controlledReason ?? check.reason ?? '当前无法使用这张卡牌。'}</span>`);
        return;
      }
      if (runtimeCard.type === CardType.MAGIC && playerStats.value.mp < runtimeCard.manaCost) {
        triggerInvalidCardShake(card);
        log('<span class="text-red-400">法力不足，无法使用该魔法卡牌。</span>');
        return;
      }
      void resolveTwinDirectComboCard(card, handIdx);
      return;
    }

    const currentSlot = getTwinPlayerSelectionSlot(card);
    if (currentSlot !== null) {
      clearDicePreview();
      markTwinPlayerSelection(card);
      return;
    }

    const targetSlotIndex = twinPlayerSelectedCards.value.findIndex((entry) => entry === null);
    const controlledExpectedType = (() => {
      if (getEffectStacks(playerStats.value, ET.CONTROLLED) <= 0) return null;
      if (targetSlotIndex < 0) return null;
      const intentCard = twinEnemyIntentCards.value[targetSlotIndex];
      if (!intentCard || intentCard.id === PASS_CARD.id) return null;
      return intentCard.type;
    })();
    const check = canPlayCard(playerStats.value, runtimeCard, combatState.value.playerBaseDice, {
      controlledExpectedType,
    });
    if (!check.allowed) {
      triggerInvalidCardShake(card);
      log(`<span class="text-red-400">${check.reason ?? '当前无法使用这张卡牌。'}</span>`);
      return;
    }
    if (runtimeCard.type === CardType.MAGIC && playerStats.value.mp < runtimeCard.manaCost) {
      triggerInvalidCardShake(card);
      log('<span class="text-red-400">法力不足，无法使用该魔法卡牌。</span>');
      return;
    }
    lockCardManaCost('player', card);
    clearDicePreview();
    markTwinPlayerSelection(card);
    if (isTwinSelectionReady()) {
      combatState.value.playerSelectedCard = twinPlayerSelectedCards.value[0] ?? PASS_CARD;
      combatState.value.phase = CombatPhase.RESOLUTION;
    }
    return;
  }

  const runtimeCard = previewFlowingLightRingCombo(withEffectiveManaCost('player', card));
  const controlledExpectedType = (() => {
    if (getEffectStacks(playerStats.value, ET.CONTROLLED) <= 0) return null;
    const intentCard = combatState.value.enemyIntentCard;
    if (!intentCard || intentCard.id === PASS_CARD.id) return null;
    return intentCard.type;
  })();
  const check = canPlayCard(playerStats.value, runtimeCard, combatState.value.playerBaseDice, {
    controlledExpectedType,
  });
  if (!check.allowed) {
    triggerInvalidCardShake(card);
    log(`<span class="text-red-400">${check.reason ?? '当前无法使用该卡牌。'}</span>`);
    return;
  }

  if (runtimeCard.type === CardType.MAGIC && playerStats.value.mp < runtimeCard.manaCost) {
    triggerInvalidCardShake(card);
    log('<span class="text-red-400">法力不足，无法使用该魔法卡牌。</span>');
    return;
  }
  if (card.id === 'alchemy_grand_synthesis' && alchemyGrandSynthesisBoundCard.value.player === null) {
    alchemyPendingGrandSynthesis.value = { card, handIdx };
    log('<span class="text-yellow-300">【大炼成】请选择本场战斗绑定的卡牌。</span>');
    return;
  }
  lockCardManaCost('player', card);

  // 出牌后立即离开手牌（卡牌“消失”），并进入弃牌堆
  const [played] = combatState.value.playerHand.splice(handIdx, 1);
  if (!played) {
    unlockCardManaCost(card);
    return;
  }
  const playedCard = applyFlowingLightRingComboIfNeeded(played);
  if (playedCard !== played) {
    unlockCardManaCost(played);
  }
  clearDicePreview();
  showPlayerPlayedCard(playedCard);
  combatState.value.discardPile.push(playedCard);
  combatState.value.playerSelectedCard = playedCard;
  combatState.value.phase = CombatPhase.RESOLUTION;
};

const handleSkipTurn = () => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  const priorityFood = getPriorityFoodCardInHand();
  if (priorityFood) {
    triggerInvalidCardShake(priorityFood);
    log('<span class="text-red-400">【烤肉】在手牌中时，不能跳过或打出其他手牌。</span>');
    return;
  }
  if (isTwinBattle) {
    const filled = fillTwinPassSlot();
    if (!filled) return;
    clearDicePreview();
    if (isTwinSelectionReady()) {
      combatState.value.playerSelectedCard = twinPlayerSelectedCards.value[0] ?? PASS_CARD;
      combatState.value.phase = CombatPhase.RESOLUTION;
    } else {
      log('<span class="text-gray-400">双子机制：当前空位已设为跳过。</span>');
    }
    return;
  }
  if (!combatState.value.enemyIntentCard) return;

  clearDicePreview();
  clearPlayerPlayedCard();
  combatState.value.playerSelectedCard = PASS_CARD;
  combatState.value.phase = CombatPhase.RESOLUTION;
  log('<span class="text-gray-400">你选择了跳过当前回合。</span>');
};

const isPhysicalMagicPair = (card1: CardData, card2: CardData): boolean => (
  (card1.type === CardType.PHYSICAL && card2.type === CardType.MAGIC)
  || (card1.type === CardType.MAGIC && card2.type === CardType.PHYSICAL)
);

const isSameRuleClash = (card1: CardData, card2: CardData): boolean => (
  card1.type === card2.type
  || (getActiveRelicCount('basic_magic_ring') > 0 && isPhysicalMagicPair(card1, card2))
);

// Clashable check
const isClashable = (card1: CardData, card2: CardData): boolean => {
  const t1 = card1.type;
  const t2 = card2.type;

  const bypassDodge =
    (card1.ignoreDodge && t2 === CardType.DODGE && (t1 === CardType.PHYSICAL || t1 === CardType.MAGIC))
    || (card2.ignoreDodge && t1 === CardType.DODGE && (t2 === CardType.PHYSICAL || t2 === CardType.MAGIC))
    || (
      card2.id === 'enemy_othello_annihilation_star'
      && t1 === CardType.DODGE
      && getEffectStacks(playerStats.value, ET.COGNITIVE_INTERFERENCE) > 0
    );
  if (bypassDodge) return false;

  if (t1 === CardType.PHYSICAL && t2 === CardType.PHYSICAL) return true;
  if (t1 === CardType.MAGIC && t2 === CardType.MAGIC) return true;
  if (getActiveRelicCount('basic_magic_ring') > 0 && isPhysicalMagicPair(card1, card2)) {
    return true;
  }
  if (t1 === CardType.DODGE && (t2 === CardType.PHYSICAL || t2 === CardType.MAGIC)) return true;
  if (t2 === CardType.DODGE && (t1 === CardType.PHYSICAL || t1 === CardType.MAGIC)) return true;
  return false;
};

// Resolution
const resolveCombat = async (
  pCard: CardData,
  eCard: CardData,
  pDice: number,
  eDice: number,
  options: {
    enemyComboPrelude?: boolean;
    deferTurnCleanup?: boolean;
    suppressTurnCleanup?: boolean;
    twinSlotIndex?: 1 | 2;
    twinDirectCombo?: boolean;
  } = {},
) => {
  if (endCombatPending.value) return;
  try {
  nonLivingConversionGuard.clear();
  const isEnemyComboPrelude = options.enemyComboPrelude === true;
  if (options.twinSlotIndex) {
    log(`<span class="text-fuchsia-300">[双子机制] ${getTwinTargetLabel(options.twinSlotIndex)}开始结算。</span>`);
  }
  let resolvedPlayerCard = pCard;
  let resolvedEnemyCard = eCard;
  resolvedEnemyCard = withEffectiveManaCost('enemy', resolvedEnemyCard);
  if (resolvedEnemyCard.id !== PASS_CARD.id) {
    const deferEnemyManaCheck = !isEnemyComboPrelude && resolvedPlayerCard.traits.combo;
    const enemyPlayCheck = canPlayCard(enemyStats.value, resolvedEnemyCard, eDice, {
      ignoreMana: deferEnemyManaCheck,
    });
    if (!enemyPlayCheck.allowed) {
      triggerEnemyIntentInvalidShake(options.twinSlotIndex, resolvedEnemyCard);
      if (resolvedEnemyCard.type === CardType.MAGIC && resolvedEnemyCard.manaCost > enemyStats.value.mp) {
        notifyEnemyManaInsufficient();
      } else {
        log(`<span class="text-gray-400">敌方无法出牌：${enemyPlayCheck.reason ?? '本回合跳过。'}</span>`);
      }
      resolvedEnemyCard = PASS_CARD;
    }
  }
  if (
    !isEnemyComboPrelude
    && resolvedPlayerCard.id !== PASS_CARD.id
    && (resolvedPlayerCard.type === CardType.PHYSICAL || resolvedPlayerCard.type === CardType.MAGIC)
  ) {
    playerPlayedPhysicalOrMagicThisTurn.value = true;
  }
  resolvedPlayerCard = withFirstUseLightningAmbushBonus('player', resolvedPlayerCard);
  resolvedEnemyCard = withFirstUseLightningAmbushBonus('enemy', resolvedEnemyCard);
  resolvedPlayerCard = applyFirstComboIfNeeded('player', resolvedPlayerCard);
  resolvedEnemyCard = applyFirstComboIfNeeded('enemy', resolvedEnemyCard);
  resolvedPlayerCard = withIgnoreDodgeBuffOnAttackCard('player', resolvedPlayerCard);
  resolvedEnemyCard = withIgnoreDodgeBuffOnAttackCard('enemy', resolvedEnemyCard);
  if (
    getActiveRelicCount('modao_tracking_mark') > 0
    && resolvedPlayerCard.type === CardType.MAGIC
    && getCardPreviewPoint('player', resolvedPlayerCard, pDice) >= 10
    && !resolvedPlayerCard.ignoreDodge
  ) {
    resolvedPlayerCard = cloneCardForBattle(resolvedPlayerCard);
    resolvedPlayerCard.ignoreDodge = true;
    logRelicMessage('[追踪印记] 法术最终点数不低于10，本次无视闪避。');
  }

  if (resolvedPlayerCard.traits.combo) {
    comboUiMaskBridge.value = true;
  }

  let playerMagicManaPaidOnPlay = false;
  let enemyMagicManaPaidOnPlay = false;
  const spendMagicManaOnPlay = (side: BattleSide, card: CardData): boolean => {
    if (card.id === PASS_CARD.id || card.type !== CardType.MAGIC) return true;
    const runtimeCard = withEffectiveManaCost(side, card);
    const stats = side === 'player' ? playerStats.value : enemyStats.value;
    const manaCost = runtimeCard.id === 'enemy_selina_space_fold'
      ? getSelinaSpaceFoldManaSpend(stats)
      : runtimeCard.manaCost;
    const canSpend = spendManaWithShock(side, manaCost, `使用【${runtimeCard.name}】`);
    if (!canSpend) {
      if (side === 'enemy') {
        triggerEnemyIntentInvalidShake(options.twinSlotIndex, card);
        notifyEnemyManaInsufficient();
      } else {
        log(`<span class="text-red-400">我方【${runtimeCard.name}】发动失败：法力已不足。</span>`);
      }
      return false;
    }
    if (side === 'enemy') {
      enemyIntentManaSpentThisTurn.value = true;
    }
    return true;
  };

  if (resolvedPlayerCard.type === CardType.MAGIC && resolvedPlayerCard.id !== PASS_CARD.id) {
    if (spendMagicManaOnPlay('player', resolvedPlayerCard)) {
      playerMagicManaPaidOnPlay = true;
    } else {
      resolvedPlayerCard = PASS_CARD;
    }
  }
  const deferEnemyMagicManaPayment = !isEnemyComboPrelude && resolvedPlayerCard.traits.combo;
  if (
    !deferEnemyMagicManaPayment
    && resolvedEnemyCard.type === CardType.MAGIC
    && resolvedEnemyCard.id !== PASS_CARD.id
  ) {
    if (spendMagicManaOnPlay('enemy', resolvedEnemyCard)) {
      enemyMagicManaPaidOnPlay = true;
    } else {
      resolvedEnemyCard = PASS_CARD;
    }
  }

  const resolveMimicCurse = (source: BattleSide) => {
    const isPlayerSource = source === 'player';
    const mimicCard = isPlayerSource ? resolvedPlayerCard : resolvedEnemyCard;
    if (mimicCard.id !== MOORE_MIMIC_CARD_ID) return;

    const target = isPlayerSource ? enemyStats.value : playerStats.value;
    const beforeStacks = Math.max(0, getEffectStacks(target, ET.FANTASY_EMBRACE));
    if (beforeStacks > 0) {
      reduceEffectStacks(target, ET.FANTASY_EMBRACE, 1);
    }

    if (isPlayerSource) {
      mooreMimicPlayedThisTurn.value = true;
      if (resolvedEnemyCard.id !== PASS_CARD.id) {
        log(`<span class="text-fuchsia-300">我方【梦境】显露原形，使敌方【${resolvedEnemyCard.name}】无效。</span>`);
      }
      resolvedEnemyCard = PASS_CARD;
    } else {
      if (resolvedPlayerCard.id !== PASS_CARD.id) {
        log(`<span class="text-fuchsia-300">敌方【梦境】显露原形，使我方【${resolvedPlayerCard.name}】无效。</span>`);
      }
      resolvedPlayerCard = PASS_CARD;
    }

    const targetLabel = isPlayerSource ? '敌方' : '我方';
    log(`<span class="text-fuchsia-300">【梦境】移除了${targetLabel} ${beforeStacks > 0 ? 1 : 0} 层虚妄之拥。</span>`);
  };

  resolveMimicCurse('player');
  resolveMimicCurse('enemy');

  const shouldClash = isClashable(resolvedPlayerCard, resolvedEnemyCard);
  const clashBypassedByIgnoreDodge =
    (resolvedPlayerCard.ignoreDodge
      && resolvedEnemyCard.type === CardType.DODGE
      && (resolvedPlayerCard.type === CardType.PHYSICAL || resolvedPlayerCard.type === CardType.MAGIC))
    || (resolvedEnemyCard.ignoreDodge
      && resolvedPlayerCard.type === CardType.DODGE
      && (resolvedEnemyCard.type === CardType.PHYSICAL || resolvedEnemyCard.type === CardType.MAGIC));
  if (!shouldClash && clashBypassedByIgnoreDodge) {
    log('<span class="text-indigo-300">[无视闪避] 闪避拼点被跳过，卡牌将直接生效。</span>');
  }
  const playerSkippedTurn = !isEnemyComboPrelude && resolvedPlayerCard.id === PASS_CARD.id;
  const enemySkippedTurn = resolvedEnemyCard.id === PASS_CARD.id;
  let resolvedPlayerDice = pDice;
  let resolvedEnemyDice = eDice;
  if (resolvedPlayerCard.traits.reroll !== 'none') {
    applyCardEffectsByTrigger(
      'player',
      resolvedPlayerCard,
      getCardPreviewPoint('player', resolvedPlayerCard, resolvedPlayerDice),
      'on_use',
      'pre_reroll_self_buff_only',
    );
  }
  if (resolvedEnemyCard.traits.reroll !== 'none') {
    applyCardEffectsByTrigger(
      'enemy',
      resolvedEnemyCard,
      getCardPreviewPoint('enemy', resolvedEnemyCard, resolvedEnemyDice),
      'on_use',
      'pre_reroll_self_buff_only',
    );
  }
  const rerollByTrait = (source: BattleSide, card: CardData) => {
    if (card.id === PASS_CARD.id || card.traits.reroll === 'none') return;
    const sourceLabel = source === 'player' ? '我方' : '敌方';
    let target: BattleSide = source;
    if (card.traits.reroll === 'enemy') {
      target = source === 'player' ? 'enemy' : 'player';
    }
    const targetLabel = target === 'player' ? '我方' : '敌方';
    const targetStats = target === 'player' ? playerStats.value : enemyStats.value;
    const rerolledRaw = target === 'player'
      ? rollPlayerDiceInRange(targetStats.minDice, targetStats.maxDice)
      : rollDiceInRange(targetStats.minDice, targetStats.maxDice);
    const rerolledCharge = consumeChargeOnRoll(targetStats, targetLabel, rerolledRaw);
    const rerolled = target === 'player'
      ? applyCheatSilverCoinToPlayerReroll(rerolledCharge)
      : rerolledCharge;
    const before = target === 'player' ? resolvedPlayerDice : resolvedEnemyDice;

    if (target === 'player') {
      resolvedPlayerDice = rerolled;
      combatState.value.playerBaseDice = rerolled;
    } else {
      resolvedEnemyDice = rerolled;
      combatState.value.enemyBaseDice = rerolled;
    }
    log(`<span class="text-amber-300">${sourceLabel}【${card.name}】触发重掷：${targetLabel}骰子 ${before} → ${rerolled}</span>`);
    if (target === 'player') {
      triggerPlayerAfterRerollRelics(before, rerolled);
    }
  };
  rerollByTrait('player', resolvedPlayerCard);
  rerollByTrait('enemy', resolvedEnemyCard);

  if (resolvedEnemyCard.id === 'enemy_executioner_puppet_execution') {
    executionerPuppetPointModifier.value = resolvedPlayerCard.type === CardType.DODGE
      ? Math.floor(Math.random() * 2) - 2
      : Math.floor(Math.random() * 2) + 1;
  } else {
    executionerPuppetPointModifier.value = null;
  }

  const pClashPoint = getCardPreviewPoint('player', resolvedPlayerCard, resolvedPlayerDice);
  const eClashPoint = getCardPreviewPoint('enemy', resolvedEnemyCard, resolvedEnemyDice);
  if (!isEnemyComboPrelude) {
    previousPlayerLastCardType.value = resolvedPlayerCard.id === PASS_CARD.id ? null : resolvedPlayerCard.type;
    previousPlayerFinalPoint.value = resolvedPlayerCard.id === PASS_CARD.id ? resolvedPlayerDice : pClashPoint;
    combatState.value.lastPlayedCard = resolvedPlayerCard.id === PASS_CARD.id ? null : resolvedPlayerCard;
  }

  const clearBurnForSide = (side: 'player' | 'enemy', reason: string) => {
    const target = side === 'player' ? playerStats.value : enemyStats.value;
    const label = side === 'player' ? '我方' : '敌方';
    const burnStacks = getEffectStacks(target, ET.BURN);
    if (burnStacks <= 0) return;
    if (side === 'enemy') {
      const purpleLightCount = getActiveRelicCount('burn_gloom_purple_light');
      if (purpleLightCount > 0) {
        const trueDamage = burnStacks * 2 * purpleLightCount;
        const { actualDamage } = applyDamageToSideWithRelics('enemy', enemyStats.value, trueDamage, true, '幽幽紫光', {
          sourceSide: 'player',
          isDirectDamage: true,
        });
        if (actualDamage > 0) {
          pushFloatingNumber('enemy', actualDamage, 'true', '-');
        }
        logRelicMessage(`[幽幽紫光] 敌方燃烧即将消失，造成 ${actualDamage} 点真实伤害。`);
      }
    }
    removeEffect(target, ET.BURN);
    log(`<span class="text-orange-300">${reason} ${label}燃烧清空（${burnStacks}层）。</span>`);
  };

  if (enemySkippedTurn) {
    clearBurnForSide('player', '敌方跳过回合。');
    tickStigmataSkipDecay('enemy');
  }
  if (playerSkippedTurn) {
    clearBurnForSide('enemy', '我方跳过回合。');
    tickStigmataSkipDecay('player');
  }
  if (playerSkippedTurn) {
    const lanternCount = getActiveRelicCount('burn_flame_lantern');
    if (lanternCount > 0 && applyStatusEffectWithRelics('enemy', ET.BURN, 2 * lanternCount, { source: 'relic:burn_flame_lantern' })) {
      logRelicMessage(`[火焰灯笼] 跳过回合后，对敌方施加 ${2 * lanternCount} 层燃烧。`);
    }
  }

  const triggerDanceHallForSide = (holderSide: BattleSide, holderCard: CardData, opponentCard: CardData) => {
    const holder = holderSide === 'player' ? playerStats.value : enemyStats.value;
    if (getEffectStacks(holder, ET.DANCE_HALL) <= 0) return;
    const opponentSide = holderSide === 'player' ? 'enemy' : 'player';
    const holderLabel = holderSide === 'player' ? '我方' : '敌方';
    const opponentLabel = opponentSide === 'player' ? '我方' : '敌方';

    if (opponentCard.id === PASS_CARD.id) {
      const opponent = opponentSide === 'player' ? playerStats.value : enemyStats.value;
      const coDanceBefore = getEffectStacks(opponent, ET.CO_DANCE);
      const solitudeBefore = getEffectStacks(holder, ET.SOLITUDE);
      if (getEffectStacks(opponent, ET.CO_DANCE) > 0) {
        reduceEffectStacks(opponent, ET.CO_DANCE, 1);
      }
      if (getEffectStacks(holder, ET.SOLITUDE) > 0) {
        reduceEffectStacks(holder, ET.SOLITUDE, 1);
      }
      const coDanceReduced = Math.min(1, coDanceBefore);
      const solitudeReduced = Math.min(1, solitudeBefore);
      if (coDanceReduced > 0 || solitudeReduced > 0) {
        log(`<span class="text-fuchsia-300">${holderLabel}[舞厅] ${opponentLabel}跳过回合，${opponentLabel}共舞 -${coDanceReduced}，自身孤独 -${solitudeReduced}。</span>`);
      }
      return;
    }

    if (holderCard.id === PASS_CARD.id) return;
    if (holderCard.type === opponentCard.type) {
      if (applyStatusEffectWithRelics(opponentSide, ET.CO_DANCE, 1, { source: 'effect:dance_hall' })) {
        log(`<span class="text-fuchsia-300">${holderLabel}[舞厅] 双方使用同类型卡牌，${opponentLabel}获得 1 层共舞。</span>`);
      }
    } else if (applyStatusEffectWithRelics(holderSide, ET.SOLITUDE, 1, { source: 'effect:dance_hall' })) {
      log(`<span class="text-fuchsia-300">${holderLabel}[舞厅] 双方使用不同类型卡牌，自身获得 1 层孤独。</span>`);
    }
  };
  triggerDanceHallForSide('player', resolvedPlayerCard, resolvedEnemyCard);
  triggerDanceHallForSide('enemy', resolvedEnemyCard, resolvedPlayerCard);

  applyToxinSpreadOnPhysicalPlay('player', resolvedPlayerCard);
  applyToxinSpreadOnPhysicalPlay('enemy', resolvedEnemyCard);
  applyAmbushOnCardPlay('player', resolvedPlayerCard);
  applyAmbushOnCardPlay('enemy', resolvedEnemyCard);

  let pSuccess = true;
  let eSuccess = true;
  let resultMsg = '';
  let clashWinner: 'player' | 'enemy' | 'tie' | null = null;

  if (shouldClash) {
    previewPlayerDice.value = pClashPoint;
    previewEnemyDice.value = eClashPoint;
    showClashAnimation.value = true;
    await wait(600);

    screenShake.value = true;
    setTimeout(() => (screenShake.value = false), scaleDuration(500));

    // 血刃附加：进入拼点即触发
    applyBloodbladeAttachOnClash('player', 'enemy');
    applyBloodbladeAttachOnClash('enemy', 'player');
    applyCardEffectsByTrigger('player', resolvedPlayerCard, pClashPoint, 'on_clash');
    applyCardEffectsByTrigger('enemy', resolvedEnemyCard, eClashPoint, 'on_clash');

    let successfulDodger: BattleSide | null = null;

    if (isSameRuleClash(resolvedPlayerCard, resolvedEnemyCard)) {
      if (pClashPoint > eClashPoint) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '我方拼点成功！';
      } else if (eClashPoint > pClashPoint) {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '敌方拼点成功！';
      } else {
        pSuccess = false;
        eSuccess = false;
        clashWinner = 'tie';
        resultMsg = '势均力敌！';
      }
    } else if (resolvedPlayerCard.type === CardType.DODGE) {
      if (eClashPoint > pClashPoint) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '我方闪避成功！';
        successfulDodger = 'player';
      } else {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '我方闪避失败！';
      }
    } else if (resolvedEnemyCard.type === CardType.DODGE) {
      if (pClashPoint > eClashPoint) {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '敌方闪避成功！';
        successfulDodger = 'enemy';
      } else {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '敌方闪避失败！';
      }
    }

    if (clashWinner === 'player') shatteringTarget.value = 'enemy';
    else if (clashWinner === 'enemy') shatteringTarget.value = 'player';
    else if (clashWinner === 'tie') {
      shatteringTarget.value = 'both';
    }

    if (resultMsg) {
      log(`<span class="text-gray-300">${resultMsg}</span>`);
    }
    if (!pSuccess) {
      applyCardEffectsByTrigger('player', resolvedPlayerCard, pClashPoint, 'on_clash_fail');
    }
    if (!eSuccess) {
      applyCardEffectsByTrigger('enemy', resolvedEnemyCard, eClashPoint, 'on_clash_fail');
    }
    // 流血：只要发生拼点，双方都按各自当前流血层数受到真实伤害
    const playerBleedStacksOnClash = Math.max(0, getEffectStacks(playerStats.value, ET.BLEED));
    if (playerBleedStacksOnClash > 0) {
      triggerBleedProc('player', '拼点阶段');
    }
    const enemyBleedStacksOnClash = Math.max(0, getEffectStacks(enemyStats.value, ET.BLEED));
    if (enemyBleedStacksOnClash > 0 && getActiveRelicCount('bloodpool_eerie_statue') <= 0) {
      triggerBleedProc('enemy', '拼点阶段');
    } else if (enemyBleedStacksOnClash > 0) {
      logRelicMessage('[诡异雕像] 拼点阶段不触发敌方流血。');
    }
    if (clashWinner === 'enemy') {
      changeRerollCharges('player', 1);
      log('<span class="text-amber-300">拼点失败：重掷次数 +1</span>');
      const resonanceCount = getActiveRelicCount('bloodpool_halfline_resonance');
      if (resonanceCount > 0) {
        const bleedStacks = 3 * resonanceCount;
        if (applyStatusEffectWithRelics('enemy', ET.BLEED, bleedStacks, {
          source: 'relic:bloodpool_halfline_resonance',
          lockDecayThisTurn: true,
        })) {
          logRelicMessage(`[半阈共振核] 拼点失败，对敌方施加 ${bleedStacks} 层流血。`);
        }
      }
    }

    if (clashWinner === 'player') {
      clearBurnForSide('player', '拼点胜利。');
    } else if (clashWinner === 'enemy') {
      clearBurnForSide('enemy', '拼点胜利。');
    }
    if (clashWinner === 'enemy') {
      const lanternCount = getActiveRelicCount('burn_flame_lantern');
      if (lanternCount > 0 && applyStatusEffectWithRelics('enemy', ET.BURN, 2 * lanternCount, { source: 'relic:burn_flame_lantern' })) {
        logRelicMessage(`[火焰灯笼] 拼点失败后，对敌方施加 ${2 * lanternCount} 层燃烧。`);
      }
    }
    if (clashWinner === 'player') {
      const pointMarkCount = getActiveRelicCount('bloodpool_clash_point_mark');
      if (pointMarkCount > 0) {
        if (applyStatusEffectWithRelics('enemy', ET.BLEED, pointMarkCount, { source: 'relic:bloodpool_clash_point_mark', lockDecayThisTurn: true })) {
          logRelicMessage(`[骰蚀刻印] 拼点成功，对敌方施加 ${pointMarkCount} 层流血。`);
        }
      }
    }

    if (clashWinner === 'player' && resolvedPlayerCard.id === 'modao_mana_orb') {
      changeManaWithShock('player', 6, '魔力球拼点成功', { showPositiveFloating: true });
      log('<span class="text-blue-300">我方【魔力球】拼点成功：返还 6 点魔力</span>');
    } else if (clashWinner === 'enemy' && resolvedEnemyCard.id === 'modao_mana_orb') {
      changeManaWithShock('enemy', 6, '魔力球拼点成功');
      log('<span class="text-blue-300">敌方【魔力球】拼点成功：返还 6 点魔力</span>');
    }

    if (successfulDodger === 'player') {
      applyLightningAttachOnDodge('player', 'enemy');
      applyCardEffectsByTrigger('player', resolvedPlayerCard, pClashPoint, 'on_dodge_success');
      triggerShadowAssaultDamage('player', resolvedPlayerCard, pClashPoint, 'on_dodge_success');
      if (resolvedPlayerCard.id === 'modao_zero_domain_dodge') {
        grantNextTurnMagicCostFree('player', resolvedPlayerCard);
      }
      if (resolvedPlayerCard.id === 'modao_kite') {
        grantNextTurnMagicPointBonus('player', 2, resolvedPlayerCard);
      }
    } else if (successfulDodger === 'enemy') {
      applyLightningAttachOnDodge('enemy', 'player');
      applyCardEffectsByTrigger('enemy', resolvedEnemyCard, eClashPoint, 'on_dodge_success');
      triggerShadowAssaultDamage('enemy', resolvedEnemyCard, eClashPoint, 'on_dodge_success');
      if (resolvedEnemyCard.id === 'enemy_othello_cold_star') {
        const meteor = getCardByName('陨');
        if (meteor) {
          combatState.value.playerDeck = insertCardIntoDeckRandomly(combatState.value.playerDeck, cloneCardForBattle(meteor));
          log(`<span class="text-violet-300">敌方【${resolvedEnemyCard.name}】闪避成功，向我方抽牌堆插入了1张【陨】。</span>`);
        } else {
          log('<span class="text-red-400">敌方【寒星】未找到【陨】卡牌定义。</span>');
        }
      }
      if (resolvedEnemyCard.id === 'modao_zero_domain_dodge') {
        grantNextTurnMagicCostFree('enemy', resolvedEnemyCard);
      }
      if (resolvedEnemyCard.id === 'modao_kite') {
        grantNextTurnMagicPointBonus('enemy', 2, resolvedEnemyCard);
      }
    }

    if (clashWinner === 'player' && resolvedPlayerCard.traits.destroyOnClashWin) {
      destroyOpponentCardByTrait('player', resolvedEnemyCard);
    } else if (clashWinner === 'enemy' && resolvedEnemyCard.traits.destroyOnClashWin) {
      destroyOpponentCardByTrait('enemy', resolvedPlayerCard);
    }

    await wait(650);
    showClashAnimation.value = false;
    hideIdleDiceUntilNextTurn.value = true;
    clearDicePreview();
  } else {
    await wait(500);
    pSuccess = true;
    eSuccess = true;
  }

  // “移除”特性：打出即销毁，若该行动未进入执行阶段，则在此处兜底清理
  if (!pSuccess && resolvedPlayerCard.traits.purgeOnUse && resolvedPlayerCard.id !== PASS_CARD.id) {
    applyPurgeTraitAfterUse('player', resolvedPlayerCard);
  }
  if (!eSuccess && resolvedEnemyCard.traits.purgeOnUse && resolvedEnemyCard.id !== PASS_CARD.id) {
    applyPurgeTraitAfterUse('enemy', resolvedEnemyCard);
  }

  // Execution Phase - use algorithms.ts for proper damage calculation
  const executeCard = async (
    source: 'player' | 'enemy',
    card: CardData,
    baseDice: number,
    executeOptions: { skipManaCost?: boolean; manaCostAlreadyPaid?: boolean } = {},
  ) => {
    if (endCombatPending.value) return;
    const attacker = source === 'player' ? playerStats.value : enemyStats.value;
    const defender = source === 'player' ? enemyStats.value : playerStats.value;
    const label = source === 'player' ? '我方' : '敌方';
    const defenderSide = source === 'player' ? 'enemy' : 'player';
    const defenderLabel = defenderSide === 'player' ? '我方' : '敌方';
    const opponentSkippedTurn = source === 'player' ? enemySkippedTurn : playerSkippedTurn;
    const cardForCalculation = card;
    const enemyColdBeforeAction = getEffectStacks(enemyStats.value, ET.COLD);
    const playerBurnBeforeAction = getEffectStacks(playerStats.value, ET.BURN);
    const playerHpBeforeAction = playerStats.value.hp;
    let relicTrackingHandled = false;

    if (source === 'enemy' && card.id !== PASS_CARD.id) {
      const enemyRuntimeCard = withEffectiveManaCost('enemy', card);
      const enemyPlayCheck = canPlayCard(enemyStats.value, enemyRuntimeCard, baseDice, {
        ignoreMana: executeOptions.skipManaCost,
      });
      if (!enemyPlayCheck.allowed) {
        triggerEnemyIntentInvalidShake(options.twinSlotIndex, card);
        if (enemyRuntimeCard.type === CardType.MAGIC && enemyRuntimeCard.manaCost > enemyStats.value.mp) {
          notifyEnemyManaInsufficient();
        } else {
          log(`<span class="text-gray-400">敌方无法出牌：${enemyPlayCheck.reason ?? '本回合跳过。'}</span>`);
        }
        return;
      }
      if (enemyRuntimeCard.type === CardType.MAGIC && !executeOptions.skipManaCost && !enemyIntentManaSpentThisTurn.value) {
        const enemyManaCost = enemyRuntimeCard.id === 'enemy_selina_space_fold'
          ? getSelinaSpaceFoldManaSpend(enemyStats.value)
          : enemyRuntimeCard.manaCost;
        const canSpend = spendManaWithShock('enemy', enemyManaCost, `使用【${enemyRuntimeCard.name}】`);
        if (!canSpend) {
          triggerEnemyIntentInvalidShake(options.twinSlotIndex, card);
          notifyEnemyManaInsufficient();
          return;
        }
        enemyIntentManaSpentThisTurn.value = true;
      }
    }

    if (source === 'enemy' && card.id !== PASS_CARD.id) {
      enemyIntentConsumedThisTurn.value = true;
    }

    if (source === 'player') {
      clearPlayerPlayedCard();
    }
    if (card.id !== PASS_CARD.id) {
      log(`${label}使用了【${card.name}】`);
    }
    if (source === 'player') {
      applyEerieStatueOnPlayerActionCard(card);
    }
    await playResolvedCardAnimation(source, card);
    if (endCombatPending.value) return;
    if (source === 'player' && card.type === CardType.MAGIC && card.id !== PASS_CARD.id && !executeOptions.skipManaCost) {
      const runtimeCard = withEffectiveManaCost('player', card);
      const playerManaCost = card.id === 'enemy_selina_space_fold'
        ? getSelinaSpaceFoldManaSpend(attacker)
        : runtimeCard.manaCost;
      const canSpend = spendManaWithShock('player', playerManaCost, `使用【${card.name}】`);
      if (!canSpend) {
        log(`<span class="text-red-400">${label}【${card.name}】发动失败：法力已不足。</span>`);
        return;
      }
    } else if (source === 'player' && card.type === CardType.MAGIC && card.id !== PASS_CARD.id && executeOptions.skipManaCost) {
      if (!executeOptions.manaCostAlreadyPaid) {
        logRelicMessage(`[星之核] 【${card.name}】额外结算不再消耗法力。`);
      }
    }
    triggerStigmataOnCardPlay(source, card);
    if (endCombatPending.value) return;
    if (card.excape) {
      const sourceLabel = source === 'player' ? '我方' : '敌方';
      log(`<span class="text-zinc-300">${sourceLabel}触发逃离：一方逃离战斗。</span>`);
      endCombatPending.value = true;
      void runEndCombatSequence(source === 'player' ? 'win' : 'escape');
      return;
    }

    // Calculate final point for this card
    const finalPoint = getCardFinalPoint(source, card, baseDice);
    const applyCardExtraAttributes = () => {
      const selfDamage = resolveCardSelfDamage(card);
      if (selfDamage) {
        const rawAmount = selfDamage.mode === 'percent'
          ? Math.floor(attacker.maxHp * (selfDamage.value / 100))
          : Math.floor(selfDamage.value);
        const amount = Math.max(0, rawAmount);
        if (amount > 0) {
          if (selfDamage.target === 'maxHp') {
            const beforeMaxHp = attacker.maxHp;
            const beforeHp = attacker.hp;
            attacker.maxHp = Math.max(0, attacker.maxHp - amount);
            if (attacker.hp > attacker.maxHp) {
              attacker.hp = attacker.maxHp;
            }
            const actualMaxHpLoss = Math.max(0, beforeMaxHp - attacker.maxHp);
            const hpLossByCap = Math.max(0, beforeHp - attacker.hp);
            if (hpLossByCap > 0) {
              pushFloatingNumber(source, hpLossByCap, 'true', '-');
            }
            log(`<span class="text-rose-300">${label}【${card.name}】自伤：生命上限 -${actualMaxHpLoss}${hpLossByCap > 0 ? `（当前生命 -${hpLossByCap}）` : ''}</span>`);
          } else {
            const actualSelfDamage = applyDirectHpLossWithRelics(source, attacker, amount, `卡牌【${card.name}】自伤`);
            if (actualSelfDamage > 0) {
              pushFloatingNumber(source, actualSelfDamage, 'true', '-');
            }
            log(`<span class="text-rose-300">${label}【${card.name}】自伤了 ${actualSelfDamage} 点生命</span>`);
          }
          const reviveResult = triggerSwarmReviveIfNeeded(attacker);
          for (const reviveLog of reviveResult.logs) {
            log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
          }
        }
      }

      const manaDrain = resolveCardManaDrain(card, finalPoint);
      if (manaDrain > 0) {
        const drainResult = changeManaWithShock(
          defenderSide,
          -manaDrain,
          `法力汲取（${label}【${card.name}】）`,
        );
        const drainedMana = Math.max(0, -drainResult.actualDelta);
        const overflowHpDamage = Math.max(0, manaDrain - drainedMana);
        let actualOverflowHpDamage = 0;

        if (overflowHpDamage > 0) {
          actualOverflowHpDamage = applyDirectHpLossWithRelics(
            defenderSide,
            defender,
            overflowHpDamage,
            `卡牌【${card.name}】法力汲取溢出`,
            { sourceSide: source, isDirectDamage: true },
          );
          pushFloatingNumber(defenderSide, actualOverflowHpDamage, 'true', '-');
        }

        const gainResult = changeManaWithShock(
          source,
          manaDrain,
          `法力汲取（${label}【${card.name}】）`,
          { showPositiveFloating: true },
        );
        const gainedMana = Math.max(0, gainResult.actualDelta);

        const overflowDamageText = actualOverflowHpDamage > 0
          ? `，额外造成 ${actualOverflowHpDamage} 点真实伤害`
          : '';
        log(`<span class="text-blue-300">${label}【${card.name}】法力汲取：吸收 ${drainedMana} 点法力并回复自身 ${gainedMana} 点法力${overflowDamageText}</span>`);

        if (actualOverflowHpDamage > 0) {
          const reviveResult = triggerSwarmReviveIfNeeded(defender);
          for (const reviveLog of reviveResult.logs) {
            log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
          }
        }
      }
    };

    const triggerPostActionRelicTracking = () => {
      if (relicTrackingHandled) return;
      relicTrackingHandled = true;

      const enemyColdAfterAction = getEffectStacks(enemyStats.value, ET.COLD);
      const reducedCold = Math.max(0, enemyColdBeforeAction - enemyColdAfterAction);
      if (reducedCold > 0) {
        const frostStorageCount = getActiveRelicCount('yanhan_frost_storage_plate');
        if (frostStorageCount > 0) {
          const gained = addArmorForSide('player', frostStorageCount);
          if (gained > 0) {
            logRelicMessage(`[凝霜蓄板] 检测到敌方寒冷减少，获得 ${gained} 点护甲。`);
          }
        }

        const abyssRiftCount = getActiveRelicCount('yanhan_cold_abyss_rift');
        if (abyssRiftCount > 0) {
          const trueDamage = 2 * abyssRiftCount;
          const actualTrueDamage = applyDirectHpLossWithRelics(
            'enemy',
            enemyStats.value,
            trueDamage,
            '寒渊裂隙',
            { sourceSide: 'player', isDirectDamage: true },
          );
          pushFloatingNumber('enemy', actualTrueDamage, 'true', '-');
          logRelicMessage(`[寒渊裂隙] 检测到敌方寒冷减少，对敌方造成 ${actualTrueDamage} 点真实伤害。`);
          const reviveResult = triggerSwarmReviveIfNeeded(enemyStats.value);
          for (const reviveLog of reviveResult.logs) {
            log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
          }
        }
      }

      const playerBurnAfterAction = getEffectStacks(playerStats.value, ET.BURN);
      const reducedPlayerBurn = Math.max(0, playerBurnBeforeAction - playerBurnAfterAction);
      if (reducedPlayerBurn > 0) {
        const heatExchangeCount = getActiveRelicCount('burn_heat_exchange_fin');
        if (heatExchangeCount > 0) {
          const gained = addArmorForSide('player', 5 * heatExchangeCount);
          if (gained > 0) {
            logRelicMessage(`[热交换鳍片] 检测到自身燃烧减少，获得 ${gained} 点护甲。`);
          }
        }
      }

      addPlayerDamageTakenThisTurn(Math.max(0, playerHpBeforeAction - playerStats.value.hp));
    };

    const finalizeCardExecution = () => {
      if (source === 'enemy') {
        aiFlags.patrolBatLastEnemyCardId = card.id;
        aiFlags.abyssJellyfishLastEnemyCardId = card.id;
        if (card.id === 'enemy_patrol_bat_mark') {
          aiFlags.patrolBatMarkHit = true;
        }
        if (card.id === 'enemy_shame_leech_parasitic_drill') {
          aiFlags.shameLeechParasiticDrillHit = true;
        }
        if (card.id === 'enemy_abyss_jellyfish_full_wrap') {
          aiFlags.abyssJellyfishFullWrapHit = true;
        }
        if (card.id === 'enemy_mask_attendant_remove_mask') {
          aiFlags.maskAttendantRemovedMaskUsed = true;
        }
        if (card.id === 'enemy_space_rift_bug_blind_spot') {
          aiFlags.spaceRiftBugBlindSpotUsed = true;
        }
        if (card.id === 'enemy_space_rift_bug_attach') {
          aiFlags.spaceRiftBugAttachHit = true;
        }
      }
      if (card.id === 'basic_jagged_attack') {
        const nextBonus = increaseBattleCardPointBonus(source, card.id, 2, 4);
        log(`<span class="text-amber-300">${label}【${card.name}】本场战斗点数加成提升至 +${nextBonus}</span>`);
      }
      if (card.id === 'enemy_moore_progressive_weaving') {
        const nextBonus = increaseBattleCardPointBonus(source, card.id, 1, 99);
        log(`<span class="text-fuchsia-300">${label}【${card.name}】本场战斗点数加成提升至 +${nextBonus}</span>`);
      }
      if (card.id === 'enemy_prayer_candle_bliss_baptism') {
        const beforePrayer = Math.max(0, getEffectStacks(attacker, ET.PRAYER));
        const consumedPrayer = Math.min(3, beforePrayer);
        if (consumedPrayer > 0) {
          reduceEffectStacks(attacker, ET.PRAYER, consumedPrayer);
        }
        log(`<span class="text-violet-300">${label}【${card.name}】移除了自身 ${consumedPrayer} 层祈祷。</span>`);
      }
      if (card.id === 'enemy_penitent_angel_lust_mark_script') {
        const beforeStigmata = Math.max(0, getEffectStacks(defender, ET.STIGMATA));
        const reducedStigmata = Math.min(1, beforeStigmata);
        if (reducedStigmata > 0) {
          reduceEffectStacks(defender, ET.STIGMATA, reducedStigmata);
        }
        log(`<span class="text-amber-300">${label}【${card.name}】使目标圣痕 -${reducedStigmata}。</span>`);
      }
      if (card.id === 'enemy_priest_puppet_gentle_purification') {
        const removableBuffs = defender.effects.filter(effect => (
          effect.stacks > 0
          && effect.type !== ET.MANA_SPRING
          && EFFECT_REGISTRY[effect.type]?.polarity === 'buff'
        ));
        const picked = removableBuffs[Math.floor(Math.random() * removableBuffs.length)];
        if (picked) {
          removeEffect(defender, picked.type);
          log(`<span class="text-cyan-300">${label}【${card.name}】驱散了目标的【${EFFECT_REGISTRY[picked.type]?.name ?? picked.type}】。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未找到可驱散的目标增益。</span>`);
        }
      }
      if (card.id === 'enemy_grace_tentacle_forgiving_embrace') {
        coldRetaliationPerDamageThisTurn.value[source] = Math.max(
          coldRetaliationPerDamageThisTurn.value[source] ?? 0,
          2,
        );
        log(`<span class="text-sky-300">${label}【${card.name}】本回合受到伤害时会为对方施加寒冷。</span>`);
      }
      if (card.id !== PASS_CARD.id && blankOfBlankActiveThisTurn.value[source]) {
        blankOfBlankBonusThisTurn.value[source] += 1;
        log(`<span class="text-cyan-300">【空白的空白】使${label}本回合卡牌点数额外 +${blankOfBlankBonusThisTurn.value[source]}</span>`);
      }
      markFirstComboUseIfNeeded(source, card);
      applyCardExtraAttributes();
      queueCardNegativeEffectForPlayer(source, card);
      applyInsertTrait(source, card);
      applyPurgeTraitAfterUse(source, card);
    };
    const finalizeAndTrack = () => {
      finalizeCardExecution();
      triggerPostActionRelicTracking();
    };

    const triggerLowTempEngraverOnFunctionPlay = () => {
      if (source !== 'player') return;
      if (card.id === PASS_CARD.id || card.type !== CardType.FUNCTION) return;
      const count = getActiveRelicCount('yanhan_low_temp_engraver');
      if (count <= 0) return;
      if (applyStatusEffectWithRelics('enemy', ET.COLD, count, { source: 'relic:yanhan_low_temp_engraver' })) {
        logRelicMessage(`[低温刻刀] 打出功能牌，敌方寒冷 +${count}。`);
      }
    };

    const syncCurrentPointForUi = () => {
      if ((card.type !== CardType.FUNCTION && card.type !== CardType.CURSE) || card.id === PASS_CARD.id) return;
      const nextPoint = Math.max(0, Math.floor(finalPoint));
      if (source === 'player') {
        if (combatState.value.playerBaseDice !== nextPoint) {
          combatState.value.playerBaseDice = nextPoint;
          log(`<span class="text-dungeon-gold/80">我方当前点数调整为 ${nextPoint}</span>`);
        }
      } else if (combatState.value.enemyBaseDice !== nextPoint) {
        combatState.value.enemyBaseDice = nextPoint;
      }
    };

    const applyCardEffects = (
      trigger: CardEffectTrigger = 'on_use',
      kindMode: 'all' | 'pre_reroll_self_buff_only' | 'post_reroll_on_use' = 'post_reroll_on_use',
    ) => (
      applyCardEffectsByTrigger(source, card, finalPoint, trigger, kindMode)
    );

    if (opponentSkippedTurn) {
      applyCardEffects('on_opponent_skip');
      triggerShadowAssaultDamage(source, card, finalPoint, 'on_opponent_skip');
    }
    if (!hasTakenDirectDamageThisTurn(source)) {
      applyCardEffects('on_no_direct_damage_taken_this_turn');
    }
    triggerLowTempEngraverOnFunctionPlay();

    if (card.id === 'enemy_moore_flustered') {
      applyCardEffects();
      const scalePowderStacks = Math.max(0, getEffectStacks(defender, ET.SCALE_POWDER));
      if (scalePowderStacks > 0) {
        removeEffect(defender, ET.SCALE_POWDER);
        log(`<span class="text-fuchsia-300">${label}【${card.name}】移除了${defenderLabel} ${scalePowderStacks} 层鳞粉。</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】${defenderLabel}没有鳞粉可移除。</span>`);
      }
      const beforeHandCount = combatState.value.playerHand.length;
      const beforeDeckCount = combatState.value.playerDeck.length;
      const beforeDiscardCount = combatState.value.discardPile.length;
      combatState.value.playerHand = combatState.value.playerHand.filter(entry => entry.id !== MOORE_MIMIC_CARD_ID);
      combatState.value.playerDeck = combatState.value.playerDeck.filter(entry => entry.id !== MOORE_MIMIC_CARD_ID);
      combatState.value.discardPile = combatState.value.discardPile.filter(entry => entry.id !== MOORE_MIMIC_CARD_ID);
      const removedCount = (
        beforeHandCount - combatState.value.playerHand.length
        + beforeDeckCount - combatState.value.playerDeck.length
        + beforeDiscardCount - combatState.value.discardPile.length
      );
      if (removedCount > 0) {
        log(`<span class="text-fuchsia-300">${label}【${card.name}】移除了我方手牌、抽牌堆与弃牌堆中的 ${removedCount} 张【梦境】。</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未找到可移除的【梦境】。</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_moore_first_night') {
      const slumber = getCardByName('陷入永恒的沉睡');
      const targetHand = defenderSide === 'player' ? combatState.value.playerHand : [];
      if (slumber && targetHand.length > 0) {
        const pickedIndex = Math.floor(Math.random() * targetHand.length);
        const beforeName = targetHand[pickedIndex]?.name ?? '未知卡牌';
        targetHand.splice(pickedIndex, 1, cloneCardForBattle(slumber));
        log(`<span class="text-fuchsia-300">${label}【${card.name}】将未打出的【${beforeName}】拖入【陷入永恒的沉睡】</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未找到可转化的未打出手牌</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_moore_progressive_weaving') {
      const scalePowderStacks = Math.max(0, getEffectStacks(defender, ET.SCALE_POWDER));
      if (scalePowderStacks > 0) {
        const targetStacks = Math.floor(scalePowderStacks * 1.5);
        const addStacks = Math.max(0, targetStacks - scalePowderStacks);
        if (addStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.SCALE_POWDER, addStacks, { source: card.id });
          log(`<span class="text-fuchsia-300">${label}【${card.name}】将${defenderLabel}鳞粉变为1.5倍（${scalePowderStacks} → ${targetStacks}）。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】${defenderLabel}鳞粉不足以增长（${scalePowderStacks} → ${targetStacks}）。</span>`);
        }
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】目标没有鳞粉可编织</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_moore_good_night_sweet_dreams') {
      const scalePowderStacks = Math.max(0, getEffectStacks(defender, ET.SCALE_POWDER));
      if (scalePowderStacks > 0) {
        removeEffect(defender, ET.SCALE_POWDER);
        const corrosionStacks = scalePowderStacks;
        applyStatusEffectWithRelics(defenderSide, ET.CORROSION, corrosionStacks, { source: card.id });
        log(`<span class="text-fuchsia-300">${label}【${card.name}】清空${defenderLabel} ${scalePowderStacks} 层鳞粉，施加 ${corrosionStacks} 层侵蚀</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】目标没有鳞粉可清空</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'yanhan_zero_boundary_verdict') {
      const coldStacks = getEffectStacks(defender, ET.COLD);
      if (coldStacks >= 10) {
        reduceEffectStacks(defender, ET.COLD, 10);
        applyStatusEffectWithRelics(defenderSide, ET.STUN, 1, { source: card.id, lockDecayThisTurn: true });
        log(`<span class="text-sky-300">${label}【${card.name}】消耗了敌方10层寒冷并施加了1回合眩晕</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】敌方寒冷不足10层，未触发眩晕分支</span>`);
      }
      applyCardEffects();
      finalizeAndTrack();
      return;
    }

    if (card.id === 'bloodpool_ratio_inversion') {
      const attackerRatio = attacker.maxHp > 0 ? attacker.hp / attacker.maxHp : 0;
      const defenderRatio = defender.maxHp > 0 ? defender.hp / defender.maxHp : 0;
      const nextAttackerHp = Math.max(0, Math.min(attacker.maxHp, Math.floor(attacker.maxHp * defenderRatio)));
      const nextDefenderHp = Math.max(0, Math.min(defender.maxHp, Math.floor(defender.maxHp * attackerRatio)));

      const attackerDelta = nextAttackerHp - attacker.hp;
      const defenderDelta = nextDefenderHp - defender.hp;
      attacker.hp = nextAttackerHp;
      defender.hp = nextDefenderHp;

      if (attackerDelta > 0) {
        pushFloatingNumber(source, attackerDelta, 'heal', '+');
      } else if (attackerDelta < 0) {
        pushFloatingNumber(source, Math.abs(attackerDelta), 'true', '-');
      }
      if (defenderDelta > 0) {
        pushFloatingNumber(defenderSide, defenderDelta, 'heal', '+');
      } else if (defenderDelta < 0) {
        pushFloatingNumber(defenderSide, Math.abs(defenderDelta), 'true', '-');
      }

      log(`<span class="text-rose-300">${label}【${card.name}】互换了双方生命百分比（我方 ${Math.round(attackerRatio * 100)}% ↔ 敌方 ${Math.round(defenderRatio * 100)}%）</span>`);
      const defenderRevive = triggerSwarmReviveIfNeeded(defender);
      for (const reviveLog of defenderRevive.logs) {
        log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
      }
      const attackerRevive = triggerSwarmReviveIfNeeded(attacker);
      for (const reviveLog of attackerRevive.logs) {
        log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
      }
      applyCardEffects();
      finalizeAndTrack();
      return;
    }

    if (card.id === 'bloodpool_bleed_transfusion') {
      const selfBleed = Math.max(0, getEffectStacks(attacker, ET.BLEED));
      if (selfBleed > 0) {
        removeEffect(attacker, ET.BLEED);
        applyStatusEffectWithRelics(defenderSide, ET.BLEED, selfBleed, { source: card.id, lockDecayThisTurn: true });
        log(`<span class="text-rose-300">${label}【${card.name}】将自身 ${selfBleed} 层流血转移给了对手</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】自身没有可转移的流血</span>`);
      }

      const triggerTimes = 3;
      for (let i = 0; i < triggerTimes; i += 1) {
        const damage = triggerBleedProc(defenderSide, `${label}【${card.name}】第${i + 1}次`);
        triggerPlayerRelicHitHooks(
          source,
          defenderSide,
          card,
          finalPoint,
          i + 1,
          triggerTimes,
          damage,
          damage,
        );
        if (defender.hp <= 0) break;
      }
      applyCardEffects();
      finalizeAndTrack();
      return;
    }

    if (card.id === 'bloodpool_reverse_edge') {
      applyCardEffects();
      reverseBladeBleedOnHit.value[source] += 4;
      log(`<span class="text-rose-300">${label}【${card.name}】生效：本回合每次被击中时对攻击者施加 ${reverseBladeBleedOnHit.value[source]} 层流血</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_liquidation') {
      const cleanseTargets: EffectType[] = [...ELEMENTAL_DEBUFF_TYPES];
      let removedStacks = 0;
      for (const et of cleanseTargets) {
        const stacks = getEffectStacks(defender, et);
        if (stacks > 0) {
          removedStacks += stacks;
          removeEffect(defender, et);
        }
      }
      const trueDamage = removedStacks * 2;
      if (trueDamage > 0) {
        const actualTrueDamage = applyDirectHpLossWithRelics(
          defenderSide,
          defender,
          trueDamage,
          `卡牌【${card.name}】`,
          { sourceSide: source, isDirectDamage: true },
        );
        pushFloatingNumber(defenderSide, actualTrueDamage, 'true', '-');
        log(`<span class="text-zinc-300">${label}【${card.name}】清算了 ${removedStacks} 层状态，造成 ${actualTrueDamage} 点真实伤害</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未清算到可移除状态</span>`);
      }
      const reviveResult = triggerSwarmReviveIfNeeded(defender);
      for (const reviveLog of reviveResult.logs) {
        log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_liquid_fire') {
      const appliedCold = Math.max(0, Math.floor(finalPoint * 0.6));
      if (appliedCold > 0) {
        applyStatusEffectWithRelics(defenderSide, ET.COLD, appliedCold, { source: card.id });
        log(`<span class="text-sky-300">${label}【${card.name}】施加了 ${appliedCold} 层寒冷</span>`);
      }
      const coldStacks = getEffectStacks(defender, ET.COLD);
      if (coldStacks > 0) {
        removeEffect(defender, ET.COLD);
        applyStatusEffectWithRelics(defenderSide, ET.BURN, coldStacks, { source: card.id });
        log(`<span class="text-orange-300">${label}【${card.name}】将 ${coldStacks} 层寒冷转化为燃烧</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未找到可转化的寒冷</span>`);
      }
      applyHitAttachEffects(source, card, attacker, defenderSide);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_activated_slime') {
      const currentElementals = ELEMENTAL_DEBUFF_TYPES
        .map((et) => ({ type: et, stacks: getEffectStacks(defender, et) }))
        .filter((entry) => entry.stacks > 0);
      if (currentElementals.length > 0) {
        const picked = currentElementals[Math.floor(Math.random() * currentElementals.length)]!;
        applyStatusEffectWithRelics(defenderSide, picked.type, picked.stacks, { source: card.id });
        log(`<span class="text-teal-300">${label}【${card.name}】使${EFFECT_REGISTRY[picked.type]?.name ?? picked.type}层数翻倍</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】目标无可翻倍的元素debuff</span>`);
      }
      applyHitAttachEffects(source, card, attacker, defenderSide);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_premium_shield') {
      applyStatusEffectWithRelics(source, ET.CO_DAMAGE, 1, { source: card.id, lockDecayThisTurn: true });
      const x = Math.max(0, Math.floor(defender.mp));
      let actualManaGain = 0;
      if (x > 0) {
        const manaResult = changeManaWithShock(source, x, `法力变化（${label}【${card.name}】）`, {
          showPositiveFloating: true,
        });
        actualManaGain = Math.max(0, manaResult.actualDelta);
      }
      log(`<span class="text-cyan-300">${label}【${card.name}】获得 1 层共损与 ${actualManaGain} 点魔力</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_cunning') {
      applyStatusEffectWithRelics(defenderSide, ET.PEEP_FORBIDDEN, 1, { source: card.id });
      log(`<span class="text-violet-300">${label}【${card.name}】使对手陷入虚实不明</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_set_ambush' && source === 'enemy' && resolvedPlayerCard.type === CardType.DODGE) {
      applyStatusEffectWithRelics('player', ET.VULNERABLE, 1, { source: card.id });
      log(`<span class="text-amber-300">${label}【${card.name}】看穿闪避，使我方获得 1 层敏感</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_corrosive_liquid') {
      const armorStacks = Math.max(0, getEffectStacks(defender, ET.ARMOR));
      if (armorStacks > 0) {
        removeEffect(defender, ET.ARMOR);
        log(`<span class="text-lime-300">${label}【${card.name}】清空了目标 ${armorStacks} 点护甲</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】目标没有护甲可清空</span>`);
      }
      applyStatusEffectWithRelics(defenderSide, ET.CORRODE, 1, { source: card.id, lockDecayThisTurn: true });
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_corrupt') {
      const waste = getCardByName('炼金废料');
      const targetHand = defenderSide === 'player' ? combatState.value.playerHand : [];
      if (waste && targetHand.length > 0) {
        const pickedIndex = Math.floor(Math.random() * targetHand.length);
        const beforeName = targetHand[pickedIndex]?.name ?? '未知卡牌';
        targetHand.splice(pickedIndex, 1, cloneCardForBattle(waste));
        log(`<span class="text-lime-300">${label}【${card.name}】将未打出的【${beforeName}】腐化为【炼金废料】</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未找到可腐化的未打出手牌</span>`);
      }
      applyStatusEffectWithRelics(source, ET.STURDY, 1, { source: card.id });
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_sublimation') {
      const isCurse = (entry: CardData) => entry.type === CardType.CURSE;
      const removeCurses = (cards: CardData[]) => {
        const removed = cards.filter(isCurse).length;
        return { removed, kept: cards.filter(cardEntry => !isCurse(cardEntry)) };
      };
      let removedTotal = 0;
      if (defenderSide === 'player') {
        const hand = removeCurses(combatState.value.playerHand);
        combatState.value.playerHand = hand.kept;
        removedTotal += hand.removed;

        const deck = removeCurses(combatState.value.playerDeck);
        combatState.value.playerDeck = deck.kept;
        removedTotal += deck.removed;

        const discard = removeCurses(combatState.value.discardPile);
        combatState.value.discardPile = discard.kept;
        removedTotal += discard.removed;
      }
      const healEach = Math.max(0, Math.floor(attacker.maxHp * 0.1));
      let healedTotal = 0;
      for (let i = 0; i < removedTotal; i += 1) {
        healedTotal += healForSide(source, healEach, {
          sourceSide: source,
          reason: `卡牌【${card.name}】治疗`,
        }).healed;
      }
      log(`<span class="text-emerald-300">${label}【${card.name}】移除了 ${removedTotal} 张诅咒牌，回复 ${healedTotal} 点生命</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_executioner_puppet_faceless_intimidation') {
      applyStatusEffectWithRelics(defenderSide, ET.PEEP_FORBIDDEN, 1, { source: card.id });
      applyStatusEffectWithRelics(defenderSide, ET.COGNITIVE_INTERFERENCE, 1, { source: card.id });
      log(`<span class="text-violet-300">${label}【${card.name}】使对手陷入虚实不明与敌意隐藏</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_silk_puppet_rally') {
      const swarmStacks = Math.max(0, getEffectStacks(attacker, ET.SWARM));
      if (swarmStacks > 0) {
        applyStatusEffectWithRelics(source, ET.CHARGE, swarmStacks, { source: card.id });
        log(`<span class="text-violet-300">${label}【${card.name}】获得了 ${swarmStacks} 层蓄力</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未获得蓄力：当前没有群集层数</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_void_glimmer_resonance') {
      const swarmStacks = Math.max(0, getEffectStacks(attacker, ET.SWARM));
      if (swarmStacks <= 0) {
        log(`<span class="text-gray-400">${label}【${card.name}】未生效：当前没有可消耗的群集</span>`);
        finalizeAndTrack();
        return;
      }

      reduceEffectStacks(attacker, ET.SWARM, 1);
      const beforeMaxHp = attacker.maxHp;
      const maxHpGain = Math.max(0, beforeMaxHp);
      const minDiceBefore = attacker.minDice;
      const maxDiceBefore = attacker.maxDice;
      const applied = applyStatusEffectWithRelics(source, ET.TEMP_MAX_HP, maxHpGain, { source: card.id });
      const actualMaxHpGain = applied ? Math.max(0, attacker.maxHp - beforeMaxHp) : 0;
      const { healed } = healForSide(source, actualMaxHpGain);
      attacker.minDice *= 2;
      attacker.maxDice *= 2;
      if (attacker.minDice > attacker.maxDice) {
        attacker.maxDice = attacker.minDice;
      }
      syncCurrentPointForUi();
      log(`<span class="text-violet-300">${label}【${card.name}】消耗1层群集，临时生命上限 +${actualMaxHpGain}，回复 ${healed} 点生命，最小/最大点数 ${minDiceBefore}~${maxDiceBefore} → ${attacker.minDice}~${attacker.maxDice}</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_tester_complete_analysis_iris_shift') {
      const hadAmber = getEffectStacks(attacker, ET.IRIS_AMBER) > 0;
      if (hadAmber) {
        removeEffect(attacker, ET.IRIS_AMBER);
      }
      applyStatusEffectWithRelics(source, ET.IRIS_SCARLET, 1, { source: card.id });
      attacker.minDice += 3;
      attacker.maxDice += 3;
      if (attacker.minDice > attacker.maxDice) {
        attacker.maxDice = attacker.minDice;
      }
      log(`<span class="text-rose-300">${label}【${card.name}】${hadAmber ? '移除了虹膜：琥珀，' : ''}获得1层虹膜：猩红，最小/最大点数 +3（当前 ${attacker.minDice}~${attacker.maxDice}）</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_springspirit_internal_manipulation') {
      const currentCorrosion = Math.max(0, getEffectStacks(defender, ET.CORROSION));
      const addStacks = Math.min(10, currentCorrosion);
      if (addStacks > 0) {
        applyStatusEffectWithRelics(defenderSide, ET.CORROSION, addStacks, { source: card.id });
        log(`<span class="text-emerald-300">${label}【${card.name}】使对手侵蚀 +${addStacks}</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未检测到可翻倍的侵蚀层数</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_springspirit_undead_condense') {
      const selfElementals = ELEMENTAL_DEBUFF_TYPES
        .map((type) => ({ type, stacks: getEffectStacks(attacker, type) }))
        .filter((entry) => entry.stacks > 0);
      if (selfElementals.length > 0) {
        const picked = selfElementals[Math.floor(Math.random() * selfElementals.length)]!;
        removeEffect(attacker, picked.type);
        log(`<span class="text-cyan-300">${label}【${card.name}】清除了自身的${EFFECT_REGISTRY[picked.type]?.name ?? picked.type}</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】自身没有可清除的元素debuff</span>`);
      }

      const healAmount = Math.max(0, Math.floor(finalPoint));
      const { healed } = healForSide(source, healAmount);
      log(`<span class="text-green-300">${label}【${card.name}】回复了 ${healed} 点生命</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_nymph_giant_projection') {
      const hadIllusoryBody = getEffectStacks(attacker, ET.ILLUSORY_BODY) > 0;
      if (hadIllusoryBody) {
        removeEffect(attacker, ET.ILLUSORY_BODY);
      }

      attacker.minDice += 2;
      attacker.maxDice += 4;
      if (attacker.minDice > attacker.maxDice) {
        attacker.maxDice = attacker.minDice;
      }

      syncCurrentPointForUi();
      log(`<span class="text-violet-300">${label}【${card.name}】${hadIllusoryBody ? '移除了自身的虚幻之躯，' : ''}最小点数 +2，最大点数 +4（当前 ${attacker.minDice}~${attacker.maxDice}）</span>`);
      applyCardEffects();
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_shadow_jailer_form_shift') {
      const hadIllusoryBody = getEffectStacks(attacker, ET.ILLUSORY_BODY) > 0;
      if (hadIllusoryBody) {
        removeEffect(attacker, ET.ILLUSORY_BODY);
        const armorGain = Math.max(0, Math.floor(finalPoint));
        if (armorGain > 0) {
          applyStatusEffectWithRelics(source, ET.ARMOR, armorGain, { source: card.id });
          pushFloatingNumber(source, armorGain, 'shield', '+');
          if (source === 'player') {
            handlePlayerArmorGainFromSingleEvent(armorGain, `卡牌【${card.name}】`);
          }
        }
        attacker.minDice += 4;
        attacker.maxDice += 4;
        if (attacker.minDice > attacker.maxDice) {
          attacker.maxDice = attacker.minDice;
        }
        syncCurrentPointForUi();
        log(`<span class="text-violet-300">${label}【${card.name}】移除虚幻之躯，获得 ${armorGain} 点护甲，最小/最大点数 +4（当前 ${attacker.minDice}~${attacker.maxDice}）</span>`);
      } else {
        applyStatusEffectWithRelics(source, ET.ILLUSORY_BODY, 1, { source: card.id });
        const healAmount = Math.max(0, Math.floor(finalPoint));
        const { healed } = healForSide(source, healAmount);
        attacker.minDice = Math.max(1, attacker.minDice - 4);
        attacker.maxDice = Math.max(attacker.minDice, attacker.maxDice - 4);
        syncCurrentPointForUi();
        log(`<span class="text-violet-300">${label}【${card.name}】获得虚幻之躯并回复 ${healed} 点生命，最小/最大点数 -4（当前 ${attacker.minDice}~${attacker.maxDice}）</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_mata_fungal_repair') {
      const poisonAmount = Math.max(0, getEffectStacks(defender, ET.POISON_AMOUNT));
      if (poisonAmount > 0) {
        removeEffect(defender, ET.POISON_AMOUNT);
        log(`<span class="text-emerald-300">${label}【${card.name}】清空了对手 ${poisonAmount} 层中毒量</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未检测到可清空的中毒量</span>`);
      }

      const triggerCount = Math.floor(poisonAmount / 2);
      if (triggerCount > 0) {
        const healAmount = triggerCount * 2;
        const { healed } = healForSide(source, healAmount);

        const beforeMaxHp = defender.maxHp;
        const beforeHp = defender.hp;
        applyStatusEffectWithRelics(defenderSide, ET.MAX_HP_REDUCTION, triggerCount, { source: card.id });
        const actualMaxHpLoss = Math.max(0, beforeMaxHp - defender.maxHp);
        const hpLossByCap = Math.max(0, beforeHp - defender.hp);
        if (hpLossByCap > 0) {
          pushFloatingNumber(defenderSide, hpLossByCap, 'true', '-');
        }

        log(`<span class="text-fuchsia-300">${label}【${card.name}】触发 ${triggerCount} 次：回复 ${healed} 点生命，并使对手生命上限 -${actualMaxHpLoss}${hpLossByCap > 0 ? `（当前生命 -${hpLossByCap}）` : ''}</span>`);
      } else if (poisonAmount > 0) {
        log(`<span class="text-gray-400">${label}【${card.name}】中毒量不足2层，未触发后续转化效果</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'alchemy_stimulate') {
      const burnStacks = Math.max(0, getEffectStacks(defender, ET.BURN));
      if (burnStacks > 0) {
        const vulnerableStacks = getEffectStacks(defender, ET.VULNERABLE);
        const temperatureDiffStacks = getEffectStacks(defender, ET.TEMPERATURE_DIFF);
        const burnDamage = burnStacks + Math.max(0, vulnerableStacks) + Math.max(0, temperatureDiffStacks);
        const { actualDamage, logs: burnLogs } = applyDamageToSideWithRelics(
          defenderSide,
          defender,
          burnDamage,
          false,
          `卡牌【${card.name}】触发燃烧`,
          { sourceSide: source, isDirectDamage: true },
        );
        if (actualDamage > 0) {
          pushFloatingNumber(defenderSide, actualDamage, 'magic', '-');
        }
        log(`<span class="text-orange-300">${label}【${card.name}】触发燃烧：造成 ${actualDamage} 点伤害。</span>`);
        for (const burnLog of burnLogs) {
          const normalized = burnLog.startsWith('受到') ? `${defenderLabel}${burnLog}` : burnLog;
          log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
        }
      }

      const poisonStacks = Math.max(0, getEffectStacks(defender, ET.POISON));
      if (poisonStacks > 0) {
        applyStatusEffectWithRelics(defenderSide, ET.POISON_AMOUNT, poisonStacks, { source: card.id });
        applyImmediatePoisonAmountLethalCheck(defenderSide);
        log(`<span class="text-emerald-300">${label}【${card.name}】触发中毒：中毒量 +${poisonStacks}。</span>`);
      }

      const bleedDamage = triggerBleedProc(defenderSide, `${label}【${card.name}】`);
      if (bleedDamage > 0) {
        triggerPlayerRelicHitHooks(source, defenderSide, card, finalPoint, 1, 1, bleedDamage, bleedDamage);
      }
      const shockDamage = triggerShockProc(defenderSide, `${label}【${card.name}】`);
      if (shockDamage > 0) {
        triggerPlayerRelicHitHooks(source, defenderSide, card, finalPoint, 1, 1, shockDamage, shockDamage);
      }

      const reviveResult = triggerSwarmReviveIfNeeded(defender);
      for (const reviveLog of reviveResult.logs) {
        log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_stigmata_butterfly_resonance') {
      const stigmataStacks = Math.max(0, getEffectStacks(defender, ET.STIGMATA));
      const poisonStacks = stigmataStacks * 2;
      if (poisonStacks > 0) {
        applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: card.id });
        log(`<span class="text-emerald-300">${label}【${card.name}】共振${defenderLabel} ${stigmataStacks} 层圣痕，施加 ${poisonStacks} 层中毒。</span>`);
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】未检测到${defenderLabel}圣痕，未施加中毒。</span>`);
      }
      finalizeAndTrack();
      return;
    }

    if (card.type === CardType.FUNCTION || card.type === CardType.CURSE) {
      if (card.id === 'enemy_behemoth_greed') {
        syncCurrentPointForUi();
        const targetHand = defenderSide === 'player' ? combatState.value.playerHand : [];
        const candidates = targetHand.filter(entry => entry.id !== PASS_CARD.id && entry.gluttonyEnchanted !== true);
        if (candidates.length > 0) {
          const picked = candidates[Math.floor(Math.random() * candidates.length)]!;
          picked.gluttonyEnchanted = true;
          log(`<span class="text-fuchsia-300">${label}【${card.name}】为我方未打出的【${picked.name}】附上饕餮魔素。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未找到可附魔的未打出手牌。</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'burn_char_convert') {
        const burned = Math.max(0, getEffectStacks(attacker, ET.BURN));
        const chilled = Math.max(0, getEffectStacks(attacker, ET.COLD));
        const totalConverted = burned + chilled;
        syncCurrentPointForUi();
        if (burned > 0) {
          removeEffect(attacker, ET.BURN);
        }
        if (chilled > 0) {
          removeEffect(attacker, ET.COLD);
        }
        if (totalConverted > 0) {
          const armorBefore = Math.max(0, getEffectStacks(attacker, ET.ARMOR));
          applyStatusEffectWithRelics(source, ET.ARMOR, totalConverted, { source: card.id });
          const armorGained = Math.max(0, getEffectStacks(attacker, ET.ARMOR) - armorBefore);
          if (armorGained > 0) {
            pushFloatingNumber(source, armorGained, 'shield', '+');
            if (source === 'player') {
              handlePlayerArmorGainFromSingleEvent(armorGained, `卡牌【${card.name}】`);
            }
          }
          log(`<span class="text-cyan-300">${label}【${card.name}】清除了 ${burned} 层燃烧与 ${chilled} 层寒冷，并回复了 ${armorGained} 点护甲</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未检测到燃烧或寒冷层数</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'yanhan_pressure_cycle') {
        syncCurrentPointForUi();
        const armorStacks = Math.max(0, getEffectStacks(attacker, ET.ARMOR));
        const consumedArmor = Math.min(10, armorStacks);
        if (consumedArmor > 0) {
          reduceEffectStacks(attacker, ET.ARMOR, consumedArmor);
        }
        const cycles = Math.max(0, Math.floor(consumedArmor / 2));
        if (cycles > 0) {
          const coldApplied = cycles * 2;
          applyStatusEffectWithRelics(defenderSide, ET.COLD, coldApplied, { source: card.id });
          const manaResult = changeManaWithShock(source, cycles, `法力变化（${label}【${card.name}】）`, {
            showPositiveFloating: true,
          });
          const restored = Math.max(0, manaResult.actualDelta);
          log(`<span class="text-sky-300">${label}【${card.name}】消耗 ${consumedArmor} 点护甲，施加 ${coldApplied} 层寒冷并回复 ${restored} 点魔力</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】护甲不足2点，未触发转化</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'yanhan_cold_source_rectifier') {
        syncCurrentPointForUi();
        const coldStacks = Math.max(0, getEffectStacks(defender, ET.COLD));
        const consumedCold = Math.min(10, coldStacks);
        if (consumedCold > 0) {
          reduceEffectStacks(defender, ET.COLD, consumedCold);
          const { healed } = healForSide(source, consumedCold);
          log(`<span class="text-cyan-300">${label}【${card.name}】消耗了 ${consumedCold} 层寒冷并回复 ${healed} 点生命</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】敌方没有可整流的寒冷</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'alchemy_catalyst') {
        syncCurrentPointForUi();
        if (alchemyCatalystActiveThisTurn.value[source]) {
          log(`<span class="text-gray-400">${label}【${card.name}】本回合已生效，不可叠加。</span>`);
        } else {
          alchemyCatalystActiveThisTurn.value[source] = true;
          log(`<span class="text-yellow-300">${label}【${card.name}】生效：本回合对敌方施加的元素负面层数翻倍。</span>`);
        }
        alchemyCatalystUseCount.value[source] = Math.max(0, Math.floor(alchemyCatalystUseCount.value[source] ?? 0)) + 1;
        if (alchemyCatalystUseCount.value[source] >= 2) {
          applyPurgeTraitAfterUse(source, { ...card, traits: { ...card.traits, purgeOnUse: true } });
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'alchemy_witch_perfume') {
        syncCurrentPointForUi();
        const candidates = collectUniqueCombatCardsForSide(source).filter(entry => entry.type !== CardType.CURSE);
        const allCards = source === 'player'
          ? [...combatState.value.playerHand, ...combatState.value.playerDeck, ...combatState.value.discardPile]
          : [...combatState.value.enemyDeck, ...combatState.value.enemyDiscard];
        const hasDuplicate = new Set(allCards.map(entry => entry.id)).size !== allCards.length;
        if (hasDuplicate) {
          log(`<span class="text-gray-400">${label}【${card.name}】未生效：牌组中存在相同的牌。</span>`);
        } else if (candidates.length <= 0) {
          log(`<span class="text-gray-400">${label}【${card.name}】未找到可附香的非诅咒牌。</span>`);
        } else {
          const picked = candidates[Math.floor(Math.random() * candidates.length)]!;
          alchemyPerfumePointDoubleCardIds.value[source][picked.id] = true;
          log(`<span class="text-yellow-300">${label}【${card.name}】使【${picked.name}】本场战斗打出时点数 x2。</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'alchemy_grand_synthesis') {
        syncCurrentPointForUi();
        let targetCard = alchemyGrandSynthesisBoundCard.value[source];
        if (!targetCard) {
          const candidates = collectAlchemyGrandSynthesisChoicesForSide(source);
          const picked = candidates[Math.floor(Math.random() * candidates.length)] ?? null;
          targetCard = picked?.card ?? null;
          alchemyGrandSynthesisBoundCard.value[source] = targetCard;
        }
        if (targetCard) {
          const nextBonus = increaseAlchemyGrandSynthesisPointBonus(source, targetCard, 1);
          log(`<span class="text-yellow-300">${label}【${card.name}】使【${targetCard.name}】本场战斗打出时点数 +${nextBonus}</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未找到可绑定卡牌。</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'modao_mana_purify') {
        syncCurrentPointForUi();
        const currentMp = Math.max(0, Math.floor(attacker.mp));
        const gain = Math.min(20, currentMp);
        if (gain > 0) {
          const manaResult = changeManaWithShock(source, gain, `法力变化（${label}【${card.name}】）`, {
            showPositiveFloating: true,
          });
          const restored = Math.max(0, manaResult.actualDelta);
          log(`<span class="text-blue-300">${label}【${card.name}】将魔力翻倍，回复 ${restored} 点魔力</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】当前魔力为0，未获得额外魔力</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'modao_energy_barrier') {
        syncCurrentPointForUi();
        const consumedMp = Math.min(5, Math.max(0, Math.floor(attacker.mp)));
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `法力变化（${label}【${card.name}】）`);
        }
        const armorGain = consumedMp * 2;
        if (armorGain > 0) {
          applyStatusEffectWithRelics(source, ET.ARMOR, armorGain, { source: card.id });
          pushFloatingNumber(source, armorGain, 'shield', '+');
          if (source === 'player') {
            handlePlayerArmorGainFromSingleEvent(armorGain, `卡牌【${card.name}】`);
          }
        }
        log(`<span class="text-cyan-300">${label}【${card.name}】消耗 ${consumedMp} 点魔力，获得 ${armorGain} 点护甲</span>`);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'modao_mana_armor') {
        syncCurrentPointForUi();
        const armorGain = Math.max(0, Math.floor(attacker.mp));
        let actualArmorGain = 0;
        if (armorGain > 0) {
          const armorBefore = Math.max(0, getEffectStacks(attacker, ET.ARMOR));
          applyStatusEffectWithRelics(source, ET.ARMOR, armorGain, { source: card.id });
          actualArmorGain = Math.max(0, getEffectStacks(attacker, ET.ARMOR) - armorBefore);
          if (actualArmorGain > 0) {
            pushFloatingNumber(source, actualArmorGain, 'shield', '+');
            if (source === 'player') {
              handlePlayerArmorGainFromSingleEvent(actualArmorGain, `卡牌【${card.name}】`);
            }
          }
        }
        log(`<span class="text-cyan-300">${label}【${card.name}】按当前魔力获得 ${actualArmorGain} 点护甲</span>`);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'modao_wager') {
        syncCurrentPointForUi();
        const wagerCost = Math.max(0, Math.floor(finalPoint));
        if (wagerCost <= 0) {
          log(`<span class="text-gray-400">${label}【${card.name}】点数不足，未触发转化</span>`);
          finalizeAndTrack();
          return;
        }
        const spent = spendManaWithShock(source, wagerCost, `法力变化（${label}【${card.name}】）`);
        if (!spent) {
          log(`<span class="text-gray-400">${label}【${card.name}】魔力不足，未能转化为增伤</span>`);
          finalizeAndTrack();
          return;
        }
        const beforeBoost = Math.max(0, getEffectStacks(attacker, ET.DAMAGE_BOOST));
        applyStatusEffectWithRelics(source, ET.DAMAGE_BOOST, wagerCost, { source: card.id });
        const actualBoostGain = Math.max(0, getEffectStacks(attacker, ET.DAMAGE_BOOST) - beforeBoost);
        log(`<span class="text-rose-300">${label}【${card.name}】消耗 ${wagerCost} 点魔力，获得 ${actualBoostGain} 层增伤</span>`);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'modao_note_energy') {
        syncCurrentPointForUi();
        const beforeBoost = Math.max(0, getEffectStacks(attacker, ET.DAMAGE_BOOST));
        applyStatusEffectWithRelics(source, ET.DAMAGE_BOOST, 2, { source: card.id });
        const actualBoostGain = Math.max(0, getEffectStacks(attacker, ET.DAMAGE_BOOST) - beforeBoost);
        temporaryDamageBoostToRemoveAtTurnEnd.value[source] += actualBoostGain;
        log(`<span class="text-rose-300">${label}【${card.name}】获得 ${actualBoostGain} 层增伤，持续至本回合结束</span>`);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'modao_prism_magic') {
        syncCurrentPointForUi();
        applyCardEffects();
        grantCurrentTurnMagicReflect(source, card);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'yanhan_spell_echo') {
        syncCurrentPointForUi();
        nextMagicDoubleCast.value[source] += 1;
        log(`<span class="text-sky-300">${label}【${card.name}】生效：下一张魔法牌将额外结算1次</span>`);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'bloodpool_life_wall') {
        syncCurrentPointForUi();
        const missingHp = Math.max(0, Math.floor(attacker.maxHp - attacker.hp));
        applyCardEffects();
        let actualArmorGain = 0;
        if (missingHp > 0) {
          const armorBefore = Math.max(0, getEffectStacks(attacker, ET.ARMOR));
          applyStatusEffectWithRelics(source, ET.ARMOR, missingHp, { source: card.id });
          actualArmorGain = Math.max(0, getEffectStacks(attacker, ET.ARMOR) - armorBefore);
          if (actualArmorGain > 0) {
            pushFloatingNumber(source, actualArmorGain, 'shield', '+');
            if (source === 'player') {
              handlePlayerArmorGainFromSingleEvent(actualArmorGain, `卡牌【${card.name}】`);
            }
          }
        }
        if (actualArmorGain > 0) {
          log(`<span class="text-rose-300">${label}【${card.name}】按已损失生命获得 ${actualArmorGain} 点护甲</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】当前未损失生命，未获得额外护甲</span>`);
        }
        finalizeAndTrack();
        return;
      }

      if (card.id === 'basic_guard') {
        syncCurrentPointForUi();
        applyCardEffects();
        armorDecaySkippedThisTurn.value[source] = true;
        log(`<span class="text-cyan-300">${label}【${card.name}】使本回合护甲不触发减半</span>`);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'basic_blank_of_blank') {
        syncCurrentPointForUi();
        blankOfBlankActiveThisTurn.value[source] = true;
        log(`<span class="text-cyan-300">${label}【${card.name}】使本回合每出1张牌，${label}卡牌点数 +1</span>`);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'basic_cognitive_swap') {
        syncCurrentPointForUi();
        applyCardEffects();
        if (battleCardFirstUseConsumed.value[source][card.id] !== true && markBattleCardFirstUse(source, card.id)) {
          const moved = transferDebuffsBetweenSides(source, defenderSide);
          log(`<span class="text-cyan-300">${label}【${card.name}】首次使用，转移了 ${moved} 个负面状态</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'enemy_mira_invite_to_dance') {
        syncCurrentPointForUi();
        const opponentCard = source === 'player' ? resolvedEnemyCard : resolvedPlayerCard;
        if (opponentCard.type === CardType.PHYSICAL || opponentCard.type === CardType.MAGIC) {
          if (applyStatusEffectWithRelics(defenderSide, ET.CONTROLLED, 1, { source: card.id, lockDecayThisTurn: true })) {
            log(`<span class="text-fuchsia-300">${label}【${card.name}】邀舞成功，对方获得 1 层被操控。</span>`);
          }
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】对方没有打出物理/魔法牌，邀舞未生效。</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'enemy_mira_mimicry') {
        syncCurrentPointForUi();
        applyCardEffects();
        const debuffs = attacker.effects.filter((effect) => effect.stacks > 0 && EFFECT_REGISTRY[effect.type]?.polarity === 'debuff');
        if (debuffs.length > 0) {
          const picked = debuffs[Math.floor(Math.random() * debuffs.length)]!;
          removeEffect(attacker, picked.type);
          const effectName = EFFECT_REGISTRY[picked.type]?.name ?? picked.type;
          log(`<span class="text-cyan-300">${label}【${card.name}】清除了自身的【${effectName}】。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未找到可清除的负面状态。</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'enemy_dream_demon_twin_mioto_cleanse') {
        syncCurrentPointForUi();
        const debuffs = attacker.effects.filter((effect) => EFFECT_REGISTRY[effect.type]?.polarity === 'debuff');
        if (debuffs.length > 0) {
          const picked = debuffs[Math.floor(Math.random() * debuffs.length)]!;
          removeEffect(attacker, picked.type);
          const effectName = EFFECT_REGISTRY[picked.type]?.name ?? picked.type;
          log(`<span class="text-cyan-300">${label}【${card.name}】清除了自身的【${effectName}】。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未找到可清除的负面状态。</span>`);
        }
        finalizeAndTrack();
        return;
      }

      // Process card effects (heal, apply_buff, restore_mana, cleanse)
      syncCurrentPointForUi();
      const hasEffect = applyCardEffects();
      if (card.id === 'enemy_othello_star_blessing' && getEffectStacks(defender, ET.ORGASM) > 0) {
        applyStatusEffectWithRelics(defenderSide, ET.VULNERABLE, 1, { source: card.id });
        log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标拥有性兴奋，额外施加 1 层敏感</span>`);
      }
      if (card.id === 'enemy_rose_nectar_discipline') {
        const targetHasBind = getEffectStacks(defender, ET.BIND) > 0;
        if (targetHasBind) {
          const poisonStacks = Math.max(0, Math.floor(finalPoint * 0.5));
          if (poisonStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: card.id });
            log(`<span class="text-emerald-300">${label}【${card.name}】触发：目标已束缚，施加 ${poisonStacks} 层中毒</span>`);
          }
        }
      }
      if (card.id === 'enemy_ink_lord_forced_script') {
        const targetHasBind = getEffectStacks(defender, ET.BIND) > 0;
        if (targetHasBind) {
          const corrosionStacks = Math.max(0, Math.floor(finalPoint));
          if (corrosionStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.CORROSION, corrosionStacks, { source: card.id });
            log(`<span class="text-emerald-300">${label}【${card.name}】触发：目标已束缚，额外施加 ${corrosionStacks} 层侵蚀</span>`);
          }
        }
      }
      if (!hasEffect) {
        // Fallback for special function cards (e.g. MP recovery)
        if (card.id === 'c5') {
          attacker.mp += 5;
          pushFloatingNumber(source, 5, 'mana', '+');
        }
      }
      finalizeAndTrack();
    } else if (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC) {
      const targetHasBindBeforeOnUse = getEffectStacks(defender, ET.BIND) > 0;
      const targetHasSilenceBeforeOnUse = getEffectStacks(defender, ET.SILENCE) > 0;
      const targetHasControlledBeforeOnUse = getEffectStacks(defender, ET.CONTROLLED) > 0;
      const targetHasIndomitableBeforeOnUse = getEffectStacks(defender, ET.INDOMITABLE) > 0;
      const targetHasOrgasmBeforeOnUse = getEffectStacks(defender, ET.ORGASM) > 0;
      let yustiaConsumedCold = 0;
      if (card.id === 'enemy_yustia_guilt_manifest') {
        yustiaConsumedCold = Math.max(0, getEffectStacks(defender, ET.COLD));
        if (yustiaConsumedCold > 0) {
          reduceEffectStacks(defender, ET.COLD, yustiaConsumedCold);
          log(`<span class="text-sky-300">${label}【${card.name}】清空了目标 ${yustiaConsumedCold} 层寒冷，本次伤害 +${yustiaConsumedCold}</span>`);
        }
      }
      if (card.id === 'enemy_yustia_trueword_scale_powder') {
        const currentMana = Math.max(0, Math.floor(defender.mp));
        if (currentMana > 0) {
          const manaResult = changeManaWithShock(
            defenderSide,
            -currentMana,
            `法力变化（${label}【${card.name}】）`,
          );
          const removedMana = Math.max(0, -manaResult.actualDelta);
          const coldStacks = removedMana * 2;
          if (coldStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.COLD, coldStacks, { source: card.id });
          }
          log(`<span class="text-sky-300">${label}【${card.name}】清空了目标 ${removedMana} 点魔力，并施加 ${coldStacks} 层寒冷</span>`);
        }
      }
      if (card.id === 'enemy_kraken_exclusive' && targetHasIndomitableBeforeOnUse) {
        reduceEffectStacks(defender, ET.INDOMITABLE, 1);
        log(`<span class="text-rose-300">${label}【${card.name}】移除了目标 1 层不屈</span>`);
      }
      if (card.id === 'enemy_selina_detain') {
        syncCurrentPointForUi();
        const consumedMp = Math.max(0, Math.floor(attacker.mp));
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `法力变化（${label}【${card.name}】）`);
        }
        const { healed } = healForSide(defenderSide, consumedMp, {
          sourceSide: source,
          reason: `卡牌【${card.name}】治疗`,
        });
        if (consumedMp > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.MANA_DRAIN, consumedMp, {
            source: card.id,
          });
        }
        log(`<span class="text-violet-300">${label}【${card.name}】消耗了 ${consumedMp} 点魔力，回复对手 ${healed} 点生命并施加 ${consumedMp} 层法力枯竭</span>`);
        finalizeAndTrack();
        return;
      }
      if (card.id === 'burn_critical_boil') {
        const coldStacks = Math.max(0, getEffectStacks(defender, ET.COLD));
        const burnStacks = Math.max(0, getEffectStacks(defender, ET.BURN));
        const consumedBurn = Math.max(0, Math.min(burnStacks, Math.floor(coldStacks / 2)));
        const consumedCold = consumedBurn * 2;
        const trueDamage = consumedBurn * 8;

        if (consumedBurn > 0) {
          reduceEffectStacks(defender, ET.COLD, consumedCold);
          reduceEffectStacks(defender, ET.BURN, consumedBurn);
          const actualTrueDamage = applyDirectHpLossWithRelics(
            defenderSide,
            defender,
            trueDamage,
            `卡牌【${card.name}】`,
            { sourceSide: source, isDirectDamage: true },
          );
          if (actualTrueDamage > 0) {
            pushFloatingNumber(defenderSide, actualTrueDamage, 'true', '-');
          }
          log(`<span class="text-orange-300">${label}【${card.name}】按2:1消耗了 ${consumedCold} 层寒冷与 ${consumedBurn} 层燃烧，造成 ${actualTrueDamage} 点真实伤害</span>`);
          triggerPlayerRelicHitHooks(
            source,
            defenderSide,
            card,
            finalPoint,
            1,
            1,
            actualTrueDamage,
            actualTrueDamage,
          );
          triggerObedienceBrandOnDirectHit(source, defenderSide);
          const reviveResult = triggerSwarmReviveIfNeeded(defender);
          for (const reviveLog of reviveResult.logs) {
            log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
          }
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】目标寒冷与燃烧不足以按2:1进行消耗</span>`);
          triggerPlayerRelicHitHooks(
            source,
            defenderSide,
            card,
            finalPoint,
            1,
            1,
            0,
            0,
          );
        }

        applyHitAttachEffects(source, card, attacker, defenderSide);
        applyCardEffects();
        finalizeAndTrack();
        return;
      }

      const applyEffectsBeforeAttack = card.id === 'yanhan_frost_burst' || card.id === 'bloodpool_blood_control';
      if (applyEffectsBeforeAttack) {
        applyCardEffects();
      }
      const burnStacksOnDefender = getEffectStacks(defender, ET.BURN);
      const baseHitCount = getAlchemyGoldenFlashHitCount(source, card);
      const defenderSwarmStacks = Math.max(0, getEffectStacks(defender, ET.SWARM));
      let extraHitCount = card.id === 'enemy_moth_swarm_burst'
        ? Math.max(0, getEffectStacks(attacker, ET.SWARM))
        : 0;
      let arcaneLanceBonusHit = false;
      if (card.id === 'modao_echo_feedback') {
        extraHitCount += defenderSwarmStacks;
      }
      if (card.id === 'enemy_broken_mirror_bat_erotic_kaleidoscope') {
        const lustIllusionStacks = Math.max(0, getEffectStacks(defender, ET.LUST_ILLUSION));
        extraHitCount += lustIllusionStacks;
        if (lustIllusionStacks > 0) {
          log(`<span class="text-fuchsia-300">${label}【${card.name}】按目标淫靡幻象追加 ${lustIllusionStacks} 次伤害</span>`);
        }
      }
      if (card.id === 'modao_ring_collapse') {
        const availableMp = Math.min(20, Math.max(0, Math.floor(attacker.mp)));
        const consumedMp = Math.floor(availableMp / 4) * 4;
        const bonusHits = Math.floor(consumedMp / 4);
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `法力变化（${label}【${card.name}】）`);
        }
        extraHitCount += bonusHits;
        log(`<span class="text-blue-300">${label}【${card.name}】额外消耗 ${consumedMp} 点魔力，追加 ${bonusHits} 次攻击</span>`);
      }
      if (card.id === 'modao_great_gale') {
        const availableMp = Math.min(16, Math.max(0, Math.floor(attacker.mp)));
        const consumedMp = Math.floor(availableMp / 2) * 2;
        const bonusHits = Math.floor(consumedMp / 2);
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `法力变化（${label}【${card.name}】）`);
        }
        extraHitCount += bonusHits;
        log(`<span class="text-blue-300">${label}【${card.name}】额外消耗 ${consumedMp} 点魔力，追加 ${bonusHits} 次攻击</span>`);
      }
      if (card.id === 'modao_arcane_lance' && attacker.mp >= 8) {
        const canConsume = spendManaWithShock(source, 4, `法力变化（${label}【${card.name}】额外结算）`);
        if (canConsume) {
          extraHitCount += 1;
          arcaneLanceBonusHit = true;
          log(`<span class="text-blue-300">${label}【${card.name}】额外消耗4点魔力，追加一次2倍伤害</span>`);
        }
      }
      if (card.id === 'enemy_selina_dimension_strip' && attacker.mp >= 4) {
        const canConsume = spendManaWithShock(source, 4, `法力变化（${label}【${card.name}】额外结算）`);
        if (canConsume) {
          extraHitCount += 1;
          log(`<span class="text-blue-300">${label}【${card.name}】额外消耗4点魔力，再结算一次</span>`);
        }
      }
      const totalHitCount = baseHitCount + extraHitCount;
      const painFeedbackTakenHits = card.id === 'bloodpool_pain_feedback'
        ? getDamageHitTakenThisCombat(source)
        : 0;
      const painFeedbackBonus = card.id === 'bloodpool_pain_feedback'
        ? Math.floor(painFeedbackTakenHits / 2)
        : 0;
      if (card.id === 'bloodpool_pain_feedback' && painFeedbackBonus > 0) {
        log(`<span class="text-rose-300">${label}【${card.name}】本场已受伤 ${painFeedbackTakenHits} 次，本次伤害 +${painFeedbackBonus}</span>`);
      }
      const bloodBladeBonus = card.id === 'bloodpool_blood_blade'
        ? getLostHp(attacker) * 2
        : 0;
      if (card.id === 'bloodpool_blood_blade' && bloodBladeBonus > 0) {
        log(`<span class="text-rose-300">${label}【${card.name}】按已损生命追加伤害，本次伤害 +${bloodBladeBonus}</span>`);
      }
      if (card.id === 'enemy_mask_attendant_forced_invitation' && targetHasBindBeforeOnUse) {
        log(`<span class="text-fuchsia-300">${label}【${card.name}】目标已束缚：本次伤害翻倍，并将在命中后追加1层敏感</span>`);
      }

      if (card.id === 'yanhan_cold_chamber_duplicate') {
        const currentCold = getEffectStacks(defender, ET.COLD);
        if (currentCold > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.COLD, currentCold, { source: card.id });
          log(`<span class="text-sky-300">${label}【${card.name}】使敌方寒冷翻倍（+${currentCold}）</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】敌方当前无寒冷，未触发翻倍</span>`);
        }
      }

      if (totalHitCount > 1) {
        log(`<span class="text-violet-300">${label}【${card.name}】进行 ${totalHitCount} 段攻击</span>`);
      }

      if (
        card.id === 'enemy_flesh_wall_worm_chamber_contraction'
        || card.id === 'enemy_grace_tentacle_warm_silk'
      ) {
        const armorStacks = Math.max(0, getEffectStacks(defender, ET.ARMOR));
        if (armorStacks > 0) {
          removeEffect(defender, ET.ARMOR);
          log(`<span class="text-cyan-300">${label}【${card.name}】清空了${defenderLabel}的 ${armorStacks} 点护甲</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】目标当前没有护甲可清空</span>`);
        }
      }

      let modaoMagicSwordTotalDamage = 0;
      let totalActualDamageDealt = 0;
      for (let hit = 0; hit < totalHitCount; hit++) {
        // Attack card: calculate damage through the full pipeline
        let cardForCalculation = card;
        const manaDeltaBonus = card.id === 'modao_magic_delta'
          ? Math.abs(Math.max(0, Math.floor(attacker.mp)) - Math.max(0, Math.floor(previousTurnManaSnapshot.value[source] ?? 0)))
          : 0;
        const customDamage =
          card.id === 'burn_scorch_wind'
            ? Math.floor(finalPoint * 0.5) + burnStacksOnDefender
            : card.id === 'burn_detonation'
              ? Math.floor(burnStacksOnDefender)
            : card.id === 'yanhan_frost_burst'
                ? Math.max(0, getEffectStacks(defender, ET.COLD))
              : card.id === 'modao_mana_hurricane'
                ? Math.max(0, 12 - Math.floor(finalPoint))
                : card.id === 'modao_great_gale'
                  ? Math.max(0, 7 - Math.floor(finalPoint))
                : card.id === 'modao_prism_flow'
                  ? Math.floor(finalPoint * (0.9 + Math.min(2.1, Math.floor(Math.max(0, attacker.mp) / 2) * 0.3)))
                  : card.id === 'modao_magic_delta'
                    ? Math.max(0, Math.floor(finalPoint) + manaDeltaBonus)
                  : card.id === 'modao_big_destruction'
                    ? Math.max(0, Math.floor(finalPoint) + Math.max(0, getEffectStacks(attacker, ET.DAMAGE_BOOST)) * 5)
                  : card.id === 'modao_arcane_lance' && arcaneLanceBonusHit && hit === totalHitCount - 1
                    ? Math.floor(finalPoint * 2)
                  : card.id === 'bloodpool_pain_feedback'
                    ? Math.max(0, Math.floor(finalPoint) + painFeedbackBonus)
                  : card.id === 'bloodpool_blood_blade'
                      ? Math.max(0, Math.floor(finalPoint) + bloodBladeBonus)
                    : card.id === 'enemy_yustia_guilt_manifest'
                      ? Math.max(0, Math.floor(finalPoint) + yustiaConsumedCold)
              : card.id === 'enemy_rose_wangzhi_whip' && getEffectStacks(defender, ET.BIND) > 0
                ? Math.floor(finalPoint) + 2
              : card.id === 'enemy_mask_attendant_forced_invitation' && targetHasBindBeforeOnUse
                ? Math.floor(finalPoint) * 2
              : null;

        if (customDamage !== null) {
          cardForCalculation = {
            ...card,
            damageLogic: { mode: 'fixed', value: Math.floor(customDamage) },
          };
        }
        const forceTrueDamage =
          card.id === 'enemy_elizabeth_boiling_blood_pulse'
          || card.id === 'bloodpool_life_drain'
          || card.id === 'enemy_dream_demon_twin_misa_nightmare_domination'
          || card.id === 'enemy_grace_tentacle_lotus_suck'
          || (source === 'enemy' && isTwinBattle && dreamControlPercent.value <= 24);
        const attackerEffectsForDamage = card.id === 'modao_big_destruction'
          ? attacker.effects.filter(effect => effect.type !== ET.DAMAGE_BOOST)
          : attacker.effects;

        const damageResult = calculateFinalDamage({
          finalPoint,
          card: cardForCalculation,
          attackerEffects: attackerEffectsForDamage,
          defenderEffects: defender.effects,
          relicModifiers: NO_RELIC_MOD,
          isTrueDamage: forceTrueDamage,
        });
        let damage = damageResult.damage;
        const isTrueDamage = damageResult.isTrueDamage;
        const dmgLogs = damageResult.logs;
        const rainbowGrassCount = getActiveRelicCount('alchemy_rainbow_grass');
        if (rainbowGrassCount > 0 && (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC)) {
          if (source === 'player') {
            const bonus = countDistinctDebuffTypes(defender) * rainbowGrassCount;
            if (bonus > 0) {
              damage += bonus;
              logRelicMessage(`[彩虹草] 敌方负面状态种类使本次伤害 +${bonus}。`);
            }
          } else if (defenderSide === 'player') {
            const reduction = countDistinctDebuffTypes(defender) * rainbowGrassCount;
            if (reduction > 0) {
              const beforeDamage = damage;
              damage = Math.max(0, damage - reduction);
              logRelicMessage(`[彩虹草] 自身负面状态种类使本次受到的伤害 ${beforeDamage}→${damage}。`);
            }
          }
        }
        const adjustedDamage = defenderSide === 'player'
          ? applyPlayerSkinMarkDamageReduction(damage, `${defenderLabel}受击`)
          : damage;
        const armorBeforeHit = getEffectStacks(defender, ET.ARMOR);
        const barrierBeforeHit = getEffectStacks(defender, ET.BARRIER);
        const { actualDamage, logs: applyLogs } = applyDamageToSideWithRelics(
          defenderSide,
          defender,
          adjustedDamage,
          isTrueDamage,
          `卡牌【${card.name}】`,
          { sourceSide: source, isDirectDamage: true, card: cardForCalculation },
        );
        const hitPrefix = totalHitCount > 1 ? `第${hit + 1}段` : '';
        const damageLogColorClass = isTrueDamage ? 'text-zinc-500' : 'text-red-400';
        log(`${label}【${card.name}】${hitPrefix}点数${finalPoint}，造成 <span class="${damageLogColorClass} font-bold">${actualDamage}</span> 点伤害`);
        const armorBlocked =
          actualDamage <= 0
          && !isTrueDamage
          && adjustedDamage > 0
          && barrierBeforeHit <= 0
          && armorBeforeHit > 0;
        if (actualDamage > 0 || armorBlocked) {
          const damageKind: FloatingNumberKind = isTrueDamage
            ? 'true'
            : (card.type === CardType.MAGIC ? 'magic' : 'physical');
          pushFloatingNumber(defenderSide, actualDamage, damageKind, '-', {
            allowZero: armorBlocked,
          });
        }
        if (card.id === 'modao_magic_sword' && actualDamage > 0) {
          modaoMagicSwordTotalDamage += actualDamage;
        }
        if (actualDamage > 0) {
          totalActualDamageDealt += actualDamage;
        }
        if (source === 'enemy' && card.id === 'enemy_penitent_angel_holy_script' && actualDamage > 0) {
          aiFlags.penitentAngelHolyScriptHit = true;
        }
        if (card.id === 'enemy_stigmata_butterfly_swarm_dance' && actualDamage > 0) {
          triggerStigmataDamageForSide(defenderSide, `被【${card.name}】第${hit + 1}段造成伤害后触发`);
        }

        if (actualDamage > 0) {
          const thornStacks = getEffectStacks(defender, ET.THORNS);
          if (thornStacks > 0) {
            let reflectedDamage = Math.max(0, thornStacks);
            if (source === 'player') {
              reflectedDamage = applyPlayerSkinMarkDamageReduction(reflectedDamage, '荆棘反弹');
            }
            if (reflectedDamage > 0) {
              const attackerArmorBeforeReflect = getEffectStacks(attacker, ET.ARMOR);
              const attackerBarrierBeforeReflect = getEffectStacks(attacker, ET.BARRIER);
              const { actualDamage: actualReflectedDamage, logs: reflectedLogs } = applyDamageToSideWithRelics(
                source,
                attacker,
                reflectedDamage,
                false,
                '荆棘反弹',
                { sourceSide: defenderSide, isDirectDamage: true },
              );
              const reflectedArmorBlocked =
                actualReflectedDamage <= 0
                && reflectedDamage > 0
                && attackerBarrierBeforeReflect <= 0
                && attackerArmorBeforeReflect > 0;
              if (actualReflectedDamage > 0 || reflectedArmorBlocked) {
                pushFloatingNumber(source, actualReflectedDamage, 'physical', '-', {
                  allowZero: reflectedArmorBlocked,
                });
              }
              log(`<span class="text-lime-300">${defenderLabel}[荆棘] 反弹了 ${actualReflectedDamage} 点伤害给${label}</span>`);
              for (const reflectedLog of reflectedLogs) {
                const normalized = reflectedLog.startsWith('受到') ? `${label}${reflectedLog}` : reflectedLog;
                log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
              }
              const reviveResult = triggerSwarmReviveIfNeeded(attacker);
              for (const reviveLog of reviveResult.logs) {
                log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
              }
            }
          }
        }
        const coldBeforeConsume = getEffectStacks(attacker, ET.COLD);
        const coldLogs = consumeColdAfterDealingDamage(attacker, actualDamage);
        if (source === 'enemy' && coldBeforeConsume > 0) {
          const ghostBoneCount = getActiveRelicCount('yanhan_ghost_bone');
          const ghostBoneDamage = Math.floor(coldBeforeConsume / 3) * ghostBoneCount;
          if (ghostBoneDamage > 0) {
            const { actualDamage: ghostBoneActualDamage } = applyDamageToSideWithRelics('enemy', enemyStats.value, ghostBoneDamage, true, '幽灵骨', {
              sourceSide: 'player',
              isDirectDamage: true,
            });
            if (ghostBoneActualDamage > 0) {
              pushFloatingNumber('enemy', ghostBoneActualDamage, 'true', '-');
            }
            logRelicMessage(`[幽灵骨] 敌方触发寒冷，造成 ${ghostBoneActualDamage} 点伤害。`);
          }
        }
        for (const coldLog of coldLogs) {
          log(`<span class="text-sky-300 text-[9px]">${label}: ${coldLog}</span>`);
        }

        for (const dl of dmgLogs) {
          if (dl.startsWith('原始伤害:')) continue;
          log(`<span class="text-gray-500 text-[9px]">${dl}</span>`);
        }
        for (const dl of applyLogs) {
          const normalized = dl.startsWith('受到') ? `${defenderLabel}${dl}` : dl;
          log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
        }
        triggerPlayerRelicHitHooks(
          source,
          defenderSide,
          card,
          finalPoint,
          hit + 1,
          totalHitCount,
          adjustedDamage,
          actualDamage,
        );
        if (card.type === CardType.MAGIC && actualDamage > 0) {
          triggerMicroFloatingCannonDamage(source, defenderSide);
        }
        const bloodstainedBladeCount = getActiveRelicCount('bloodpool_bloodstained_blade');
        if (
          bloodstainedBladeCount > 0
          && source === 'player'
          && defenderSide === 'enemy'
          && (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC)
          && actualDamage > 0
          && enemyStats.value.hp > 0
        ) {
          for (let i = 0; i < bloodstainedBladeCount; i += 1) {
            const bleedDamage = triggerBleedProc('enemy', `[染血刃] 命中触发（${i + 1}/${bloodstainedBladeCount}）`);
            if (bleedDamage <= 0 || enemyStats.value.hp <= 0) break;
          }
        }
        triggerObedienceBrandOnDirectHit(source, defenderSide);
        applyHitAttachEffects(source, card, attacker, defenderSide);
        if (card.type === CardType.PHYSICAL) {
          reduceTargetMaxDiceByVoidTaint(source, defenderSide, '对方被自己的物理牌命中');
        }
        if (card.id === 'enemy_selina_dimension_strip') {
          transferRandomBuffStack(defenderSide, source, card.name);
        }
        const reverseBladeBleed = Math.max(0, reverseBladeBleedOnHit.value[defenderSide]);
        if (reverseBladeBleed > 0) {
          const applied = applyStatusEffectWithRelics(source, ET.BLEED, reverseBladeBleed, {
            source: 'bloodpool_reverse_edge',
            lockDecayThisTurn: true,
          });
          if (applied) {
            log(`<span class="text-rose-300">${defenderLabel}[逆刃] 反施加了 ${reverseBladeBleed} 层流血给${label}</span>`);
          }
        }
        if (card.id === 'enemy_muxinlan_unstable_reagent') {
          const picked = ELEMENTAL_DEBUFF_TYPES[Math.floor(Math.random() * ELEMENTAL_DEBUFF_TYPES.length)]!;
          const stacks = 1;
          applyStatusEffectWithRelics(defenderSide, picked, stacks, { source: card.id });
          const hitPrefixText = totalHitCount > 1 ? `第${hit + 1}段` : '';
          log(`<span class="text-fuchsia-300">${label}【${card.name}】${hitPrefixText}附加了 ${stacks} 层${EFFECT_REGISTRY[picked]?.name ?? picked}</span>`);
        }
        if (card.id === 'enemy_elizabeth_blood_thorns') {
          const shouldApplyBleed = Math.random() < 0.5;
          if (shouldApplyBleed) {
            const applied = applyStatusEffectWithRelics(defenderSide, ET.BLEED, 2, {
              source: card.id,
              lockDecayThisTurn: true,
            });
            if (applied) {
              const hitPrefixText = totalHitCount > 1 ? `第${hit + 1}段` : '';
              log(`<span class="text-rose-300">${label}【${card.name}】${hitPrefixText}触发：施加 2 层流血</span>`);
            }
          }
        }
        if (
          source === 'enemy'
          && defenderSide === 'player'
          && actualDamage > 0
          && combatState.value.playerHand.some(handCard => handCard.id === 'alchemy_venomous_slime')
        ) {
          applyStatusEffectWithRelics('player', ET.POISON, 6, { source: 'card:alchemy_venomous_slime_in_hand' });
          log('<span class="text-emerald-300">手牌中的【剧毒粘液】被击中触发：自身获得 6 层中毒。</span>');
        }
        if (defender.hp <= 0) break;
        if (totalHitCount > 1 && hit < totalHitCount - 1) {
          await wait(100);
        }
      }
      if (card.id === 'alchemy_gilded_strike') {
        const curseCount = countBattleCardsForSide(source, card, entry => entry.type === CardType.CURSE);
        const burnStacks = curseCount * 2;
        if (burnStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.BURN, burnStacks, { source: card.id });
          log(`<span class="text-orange-300">${label}【${card.name}】按牌库诅咒牌施加 ${burnStacks} 层燃烧。</span>`);
        }
      }
      if (card.id === 'modao_magic_sword' && modaoMagicSwordTotalDamage > 0) {
        const manaResult = changeManaWithShock(source, modaoMagicSwordTotalDamage, `法力变化（${label}【${card.name}】）`, {
          showPositiveFloating: true,
        });
        const restored = Math.max(0, manaResult.actualDelta);
        log(`<span class="text-blue-300">${label}【${card.name}】回收 ${restored} 点魔力</span>`);
      }
      if (card.id === 'enemy_mira_shattered_mirror_waltz' && totalActualDamageDealt > 0) {
        const { healed } = healForSide(source, totalActualDamageDealt, {
          sourceSide: source,
          reason: `卡牌【${card.name}】吸血`,
        });
        log(`<span class="text-green-300">${label}【${card.name}】回复了 ${healed} 点生命</span>`);
      }
      if (card.id === 'enemy_mira_mirror_refraction') {
        const debuffs = attacker.effects.filter((effect) => effect.stacks > 0 && EFFECT_REGISTRY[effect.type]?.polarity === 'debuff');
        if (debuffs.length > 0) {
          const picked = debuffs[Math.floor(Math.random() * debuffs.length)]!;
          removeEffect(attacker, picked.type);
          const effectName = EFFECT_REGISTRY[picked.type]?.name ?? picked.type;
          log(`<span class="text-cyan-300">${label}【${card.name}】清除了自身的【${effectName}】。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未找到可清除的负面状态。</span>`);
        }
      }
      if (card.id === 'basic_element_attack') {
        const elementalStacks = Math.max(0, Math.floor(finalPoint));
        if (elementalStacks > 0) {
          const picked = ELEMENTAL_DEBUFF_TYPES[Math.floor(Math.random() * ELEMENTAL_DEBUFF_TYPES.length)]!;
          applyStatusEffectWithRelics(defenderSide, picked, elementalStacks, { source: card.id });
          log(`<span class="text-fuchsia-300">${label}【${card.name}】施加了 ${elementalStacks} 层${EFFECT_REGISTRY[picked]?.name ?? picked}</span>`);
        }
      }
      if (card.id === 'bloodpool_siphon_slash') {
        const healAmount = Math.max(0, Math.floor(totalActualDamageDealt * 0.5));
        const { healed } = healForSide(source, healAmount);
        log(`<span class="text-green-300">${label}【${card.name}】吸血回复 ${healed} 点生命</span>`);
      }
      if (card.id === 'bloodpool_life_drain') {
        const { healed } = healForSide(source, totalActualDamageDealt, {
          reason: `卡牌【${card.name}】吸血`,
        });
        if (healed > 0) {
          log(`<span class="text-green-300">${label}【${card.name}】回复了 ${healed} 点生命</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未恢复生命</span>`);
        }
      }
      if (card.id === 'enemy_grace_tentacle_lotus_suck') {
        const orgasmStacks = Math.max(0, getEffectStacks(defender, ET.ORGASM));
        if (orgasmStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.WEAKEN, orgasmStacks, { source: card.id });
          log(`<span class="text-fuchsia-300">${label}【${card.name}】按目标性兴奋层数施加 ${orgasmStacks} 层虚弱</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】目标没有性兴奋，未施加虚弱</span>`);
        }
      }
      if (card.id === 'enemy_othello_gathering_star') {
        const armorGain = Math.max(0, Math.floor(attacker.mp));
        if (armorGain > 0) {
          const armorBefore = Math.max(0, getEffectStacks(attacker, ET.ARMOR));
          applyStatusEffectWithRelics(source, ET.ARMOR, armorGain, { source: card.id });
          const actualArmorGain = Math.max(0, getEffectStacks(attacker, ET.ARMOR) - armorBefore);
          if (actualArmorGain > 0) {
            pushFloatingNumber(source, actualArmorGain, 'shield', '+');
            if (source === 'player') {
              handlePlayerArmorGainFromSingleEvent(actualArmorGain, `卡牌【${card.name}】`);
            }
          }
          log(`<span class="text-cyan-300">${label}【${card.name}】按自身当前魔力获得 ${actualArmorGain} 点护甲</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】当前没有魔力，未获得护甲</span>`);
        }
      }
      if (card.id === 'bloodpool_vital_reservoir') {
        const maxHpGain = Math.max(0, Math.floor(totalActualDamageDealt));
        if (maxHpGain > 0) {
          const beforeMaxHp = attacker.maxHp;
          const applied = applyStatusEffectWithRelics(source, ET.TEMP_MAX_HP, maxHpGain, { source: card.id });
          const actualMaxHpGain = Math.max(0, attacker.maxHp - beforeMaxHp);
          if (applied && actualMaxHpGain > 0) {
            log(`<span class="text-rose-300">${label}【${card.name}】临时生命上限 +${actualMaxHpGain}</span>`);
          } else {
            log(`<span class="text-gray-400">${label}【${card.name}】未能获得临时生命上限</span>`);
          }
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未造成伤害，未获得临时生命上限</span>`);
        }
      }

      const inkCreationStacks = Math.max(0, getEffectStacks(attacker, ET.INK_CREATION));
      if (inkCreationStacks > 0 && totalActualDamageDealt > 0) {
        const corrosionStacks = Math.max(0, Math.floor(finalPoint * inkCreationStacks));
        if (corrosionStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.CORROSION, corrosionStacks, { source: 'effect:ink_creation' });
          log(`<span class="text-emerald-300">${label}[笔墨造物] 攻击命中后附加 ${corrosionStacks} 层侵蚀</span>`);
        }
      }

      // 攻击牌结算后同样触发附带效果（燃烧、敏感等）
      if (!applyEffectsBeforeAttack) {
        applyCardEffects();
      }
      if (card.id === 'enemy_hilvy_silent_decree' && targetHasSilenceBeforeOnUse) {
        const applied = applyStatusEffectWithRelics(defenderSide, ET.BIND, 1, {
          source: card.id,
          lockDecayThisTurn: true,
        });
        if (applied) {
          log(`<span class="text-yellow-300">${label}【${card.name}】触发：目标已有禁言，额外施加 1 层束缚</span>`);
        }
      }
      if (card.id === 'enemy_hilvy_mime_pull' && targetHasSilenceBeforeOnUse) {
        const manaGain = Math.max(0, Math.floor(finalPoint));
        if (manaGain > 0) {
          const manaResult = changeManaWithShock(source, manaGain, `法力变化（${label}【${card.name}】）`, {
            showPositiveFloating: true,
          });
          const actualGain = Math.max(0, manaResult.actualDelta);
          if (actualGain > 0) {
            log(`<span class="text-blue-300">${label}【${card.name}】触发：目标已有禁言，回复了 ${actualGain} 点魔力</span>`);
          }
        }
      }
      if (card.id === 'enemy_hilvy_aphonia' && targetHasSilenceBeforeOnUse) {
        const applied = applyStatusEffectWithRelics(defenderSide, ET.ORGASM, 1, { source: card.id });
        if (applied) {
          log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标已有禁言，额外施加 1 层性兴奋</span>`);
        }
      }
      if (card.id === 'enemy_ink_lord_black_tide_infusion' && targetHasControlledBeforeOnUse) {
        const curseCard = getCardByName('淫墨誓约');
        if (curseCard) {
          for (let i = 0; i < 3; i += 1) {
            const battleCard = cloneCardForBattle(curseCard);
            if (defenderSide === 'player') {
              combatState.value.playerDeck = insertCardIntoDeckRandomly(combatState.value.playerDeck, battleCard);
            } else {
              combatState.value.enemyDeck = insertCardIntoDeckRandomly(combatState.value.enemyDeck, battleCard);
            }
          }
          if (defenderSide === 'player') {
            log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标已有被操控，向对方牌库插入了3张【淫墨誓约】（牌库${combatState.value.playerDeck.length} / 弃牌${combatState.value.discardPile.length}）。</span>`);
          } else {
            log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标已有被操控，向对方牌库插入了3张【淫墨誓约】（敌方牌库${combatState.value.enemyDeck.length} / 弃牌${combatState.value.enemyDiscard.length}）。</span>`);
          }
        }
      }
      if (card.id === 'enemy_thorncrawler_neural_pierce' && targetHasBindBeforeOnUse) {
        const extraShockStacks = Math.max(0, Math.floor(finalPoint));
        if (extraShockStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.SHOCK, extraShockStacks, { source: card.id });
          log(`<span class="text-yellow-300">${label}【${card.name}】触发：目标已有束缚，额外施加 ${extraShockStacks} 层电击</span>`);
        }
        const fatigueStacks = Math.max(0, Math.floor(finalPoint));
        if (fatigueStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.FATIGUE, fatigueStacks, { source: card.id });
          log(`<span class="text-violet-300">${label}【${card.name}】触发：目标已有束缚，额外施加 ${fatigueStacks} 层疲劳</span>`);
        }
      }
      if (card.id === 'enemy_doll_silk_takeover') {
        const targetCorrosion = Math.max(0, getEffectStacks(defender, ET.CORROSION));
        const controlledStacks = Math.floor(targetCorrosion / 8);
        if (controlledStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.CONTROLLED, controlledStacks, { source: card.id, lockDecayThisTurn: true });
          log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标拥有 ${targetCorrosion} 层侵蚀，额外施加 ${controlledStacks} 层被操控</span>`);
        }
      }

      if (card.id === 'enemy_kraken_deep_sea_slime' && targetHasBindBeforeOnUse) {
        const applied = applyStatusEffectWithRelics(defenderSide, ET.WEAKEN, 1, { source: card.id });
        if (applied) {
          log(`<span class="text-violet-300">${label}【${card.name}】触发：目标处于束缚状态，额外施加 1 层虚弱</span>`);
        }
      }
      if (card.id === 'enemy_thorncrawler_toxin_pulse' && targetHasBindBeforeOnUse) {
        const applied = applyStatusEffectWithRelics(defenderSide, ET.BIND, 1, {
          source: card.id,
          lockDecayThisTurn: true,
        });
        if (applied) {
          log(`<span class="text-yellow-300">${label}【${card.name}】触发：目标已有束缚，额外施加 1 层束缚</span>`);
        }
      }
      if (card.id === 'enemy_blood_bat_swarm_resonance') {
        const swarmStacks = Math.max(0, getEffectStacks(attacker, ET.SWARM));
        if (swarmStacks > 0) {
          const fatiguePerResolution = Math.max(0, Math.floor(finalPoint * 0.5));
          let extraExcitementApplied = 0;
          let extraFatigueApplied = 0;
          for (let i = 0; i < swarmStacks; i += 1) {
            if (applyStatusEffectWithRelics(defenderSide, ET.ORGASM, 1, { source: card.id })) {
              extraExcitementApplied += 1;
            }
            if (fatiguePerResolution > 0) {
              applyStatusEffectWithRelics(defenderSide, ET.FATIGUE, fatiguePerResolution, { source: card.id });
              extraFatigueApplied += fatiguePerResolution;
            }
          }
          log(`<span class="text-fuchsia-300">${label}【${card.name}】受群集影响额外结算 ${swarmStacks} 次：额外施加 ${extraExcitementApplied} 层性兴奋${extraFatigueApplied > 0 ? `与 ${extraFatigueApplied} 层疲劳` : ''}</span>`);
        }
      }
      if (card.id === 'enemy_nightmare_moth_collective_dreamweave') {
        const scalePowderStacks = Math.max(0, getEffectStacks(defender, ET.SCALE_POWDER));
        const extraCorrosion = scalePowderStacks * 2;
        if (extraCorrosion > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.CORROSION, extraCorrosion, { source: card.id });
          log(`<span class="text-emerald-300">${label}【${card.name}】按目标鳞粉层数额外施加了 ${extraCorrosion} 层侵蚀</span>`);
        }
      }
      if (card.id === 'enemy_stitched_spider_pack_hunt') {
        const bindStacks = Math.max(0, getEffectStacks(attacker, ET.SWARM));
        if (bindStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.BIND, bindStacks, {
            source: card.id,
            lockDecayThisTurn: true,
          });
          log(`<span class="text-yellow-300">${label}【${card.name}】按自身群集数施加了 ${bindStacks} 层束缚</span>`);
        }
      }
      if (card.id === 'burn_kindle') {
        const burnStacks = Math.max(0, getEffectStacks(defender, ET.BURN));
        if (burnStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.BURN, burnStacks, { source: card.id });
          log(`<span class="text-orange-300">${label}【${card.name}】使对手燃烧翻倍（+${burnStacks}）</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】对手当前无燃烧，未触发翻倍</span>`);
        }
      }
      if (card.id === 'bloodpool_blood_debt_strike' || card.id === 'enemy_veronica_bloodthirsty_heavy_strike') {
        const bleedStacks = 3;
        if (applyStatusEffectWithRelics(defenderSide, ET.BLEED, bleedStacks, { source: card.id, lockDecayThisTurn: true })) {
          log(`<span class="text-rose-300">${label}【${card.name}】施加 ${bleedStacks} 层流血</span>`);
        }
      }
      if (card.id === 'bloodpool_scar_burst') {
        const bleedDamage = triggerBleedProc(defenderSide, `${label}【${card.name}】`);
        triggerPlayerRelicHitHooks(
          source,
          defenderSide,
          card,
          finalPoint,
          1,
          1,
          bleedDamage,
          bleedDamage,
        );
        const bleedStacks = Math.max(0, Math.floor(finalPoint * 0.5));
        if (bleedStacks > 0) {
          if (applyStatusEffectWithRelics(defenderSide, ET.BLEED, bleedStacks, { source: card.id, lockDecayThisTurn: true })) {
            log(`<span class="text-rose-300">${label}【${card.name}】追加施加 ${bleedStacks} 层流血</span>`);
          }
        }
      }
      if (card.id === 'enemy_veronica_torment_cycle') {
        const bleedDamage = triggerBleedProc(defenderSide, `${label}【${card.name}】`);
        triggerPlayerRelicHitHooks(
          source,
          defenderSide,
          card,
          finalPoint,
          1,
          1,
          bleedDamage,
          bleedDamage,
        );
      }
      if (card.id === 'enemy_elizabeth_blood_stasis') {
        const bleedDamage = triggerBleedProc(defenderSide, `${label}【${card.name}】`);
        triggerPlayerRelicHitHooks(
          source,
          defenderSide,
          card,
          finalPoint,
          1,
          1,
          bleedDamage,
          bleedDamage,
        );
      }
      if (card.id === 'enemy_judgment_spider_conduction_silk') {
        const shockDamage = triggerShockProc(defenderSide, `${label}【${card.name}】`);
        triggerPlayerRelicHitHooks(
          source,
          defenderSide,
          card,
          finalPoint,
          1,
          1,
          shockDamage,
          shockDamage,
        );
      }

      if (card.id === 'yanhan_feedback_freeze_wheel') {
        const armorGain = Math.max(0, getEffectStacks(defender, ET.COLD));
        if (armorGain > 0) {
          applyStatusEffectWithRelics(source, ET.ARMOR, armorGain, { source: card.id });
          pushFloatingNumber(source, armorGain, 'shield', '+');
          if (source === 'player') {
            handlePlayerArmorGainFromSingleEvent(armorGain, `卡牌【${card.name}】`);
          }
          log(`<span class="text-cyan-300">${label}【${card.name}】回授获得 ${armorGain} 点护甲</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】敌方寒冷不足，未获得额外护甲</span>`);
        }
      }

      if (card.id === 'enemy_blissbee_aphro_stinger') {
        const targetHasVulnerable = getEffectStacks(defender, ET.VULNERABLE) > 0;
        if (targetHasVulnerable) {
          const poisonStacks = 2;
          if (poisonStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: card.id });
          }
          log(`<span class="text-emerald-300">${label}【${card.name}】触发：对手敏感存在，额外施加 ${poisonStacks} 层中毒</span>`);
        }
      }

      if (card.id === 'enemy_priest_puppet_divine_touch') {
        const targetHasVulnerable = getEffectStacks(defender, ET.VULNERABLE) > 0;
        if (targetHasVulnerable) {
          const shockStacks = Math.max(0, Math.floor(finalPoint * 0.7));
          if (shockStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.SHOCK, shockStacks, { source: card.id });
          }
          log(`<span class="text-indigo-300">${label}【${card.name}】触发：对手敏感存在，额外施加 ${shockStacks} 层电击</span>`);
        }
      }

      if (card.id === 'enemy_blissbee_precise_harvest') {
        const targetHasPoison = getEffectStacks(defender, ET.POISON) > 0;
        if (targetHasPoison) {
          const shockStacks = Math.max(0, Math.floor(finalPoint * 0.5));
          if (shockStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.SHOCK, shockStacks, { source: card.id });
          }
          log(`<span class="text-indigo-300">${label}【${card.name}】触发：对手中毒存在，额外施加 ${shockStacks} 层电击</span>`);
        }
      }

      if (card.id === 'enemy_rose_life_drain') {
        const targetHasBind = getEffectStacks(defender, ET.BIND) > 0;
        if (targetHasBind) {
          const healAmount = Math.max(0, Math.floor(finalPoint));
          const { healed } = healForSide(source, healAmount);
          if (healed > 0) {
            log(`<span class="text-green-300">${label}【${card.name}】触发：目标已束缚，回复了 ${healed} 点生命</span>`);
          }
        }
      }

      if (card.id === 'enemy_ursula_whip_punish') {
        const targetHasBind = getEffectStacks(defender, ET.BIND) > 0;
        if (targetHasBind) {
          const vulnerableStacks = Math.max(0, Math.floor(finalPoint * 0.5));
          if (vulnerableStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.VULNERABLE, vulnerableStacks, { source: card.id });
            log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标已束缚，额外施加 ${vulnerableStacks} 层敏感</span>`);
          }
        }
      }

      if (card.id === 'enemy_chair_mimic_cushion_assault') {
        const targetHasBind = getEffectStacks(defender, ET.BIND) > 0;
        if (targetHasBind) {
          const poisonStacks = Math.max(0, Math.floor(finalPoint * 0.5));
          if (poisonStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: card.id });
            log(`<span class="text-emerald-300">${label}【${card.name}】触发：目标已束缚，额外施加 ${poisonStacks} 层中毒</span>`);
          }
        }
      }

      if (card.id === 'enemy_fallen_scholar_cooperative_experiment') {
        const targetHasBind = getEffectStacks(defender, ET.BIND) > 0;
        const targetHasSilence = getEffectStacks(defender, ET.SILENCE) > 0;
        if (targetHasBind || targetHasSilence) {
          const poisonStacks = Math.max(0, Math.floor(finalPoint * 0.5));
          if (poisonStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: card.id });
            log(`<span class="text-emerald-300">${label}【${card.name}】触发：目标存在束缚/禁言，额外施加 ${poisonStacks} 层中毒</span>`);
          }
        }
      }

      if (card.id === 'enemy_floating_page_sensory_infusion') {
        const targetCorrosion = Math.max(0, getEffectStacks(defender, ET.CORROSION));
        if (targetCorrosion > 0) {
          applyStatusEffectWithRelics(defenderSide, ET.POISON, targetCorrosion, { source: card.id });
          log(`<span class="text-emerald-300">${label}【${card.name}】触发：按目标侵蚀层数附加了 ${targetCorrosion} 层中毒</span>`);
        }
      }

      if (card.id === 'enemy_floating_page_forced_immersion') {
        const targetHasBind = getEffectStacks(defender, ET.BIND) > 0;
        if (targetHasBind) {
          applyStatusEffectWithRelics(defenderSide, ET.COGNITIVE_INTERFERENCE, 1, { source: card.id });
          log(`<span class="text-violet-300">${label}【${card.name}】触发：目标已束缚，施加 1 层敌意隐藏</span>`);
        }
      }
      if (card.id === 'enemy_mask_attendant_forced_invitation' && targetHasBindBeforeOnUse) {
        if (applyStatusEffectWithRelics(defenderSide, ET.VULNERABLE, 1, { source: card.id })) {
          log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标已束缚，额外施加 1 层敏感</span>`);
        }
      }
      if (card.id === 'enemy_mask_attendant_faceless_bind' && targetHasOrgasmBeforeOnUse) {
        if (applyStatusEffectWithRelics(defenderSide, ET.STUN, 1, { source: card.id, lockDecayThisTurn: true })) {
          log(`<span class="text-violet-300">${label}【${card.name}】触发：目标已有性兴奋，额外施加 1 层眩晕</span>`);
        }
      }
      finalizeAndTrack();
    } else if (card.id === 'enemy_othello_star_hidden') {
      applyCardEffects();
      finalizeAndTrack();
    } else {
      finalizeAndTrack();
    }
  };

  interface ActionEntry {
    source: 'player' | 'enemy';
    card: CardData;
    type: CardType;
    baseDice: number;
    magicManaPaidOnPlay?: boolean;
  }

  const applyPointSuppressBeforeQueue = () => {
    const playerSuppress = (pSuccess && (
      resolvedPlayerCard.id === 'basic_point_suppress'
      || resolvedPlayerCard.id === 'basic_weak_magic'
    ))
      ? Math.max(0, getCardPreviewPoint('player', resolvedPlayerCard, resolvedPlayerDice))
      : 0;
    const enemySuppress = (eSuccess && (
      resolvedEnemyCard.id === 'basic_point_suppress'
      || resolvedEnemyCard.id === 'basic_weak_magic'
    ))
      ? Math.max(0, getCardPreviewPoint('enemy', resolvedEnemyCard, resolvedEnemyDice))
      : 0;

    if (playerSuppress > 0 && resolvedEnemyCard.id !== PASS_CARD.id) {
      const before = resolvedEnemyDice;
      resolvedEnemyDice = Math.max(0, resolvedEnemyDice - playerSuppress);
      const reduced = Math.max(0, before - resolvedEnemyDice);
      if (reduced > 0) {
        combatState.value.enemyBaseDice = resolvedEnemyDice;
        log(`<span class="text-amber-300">我方【${resolvedPlayerCard.name}】使敌方原始点数 -${reduced}（${before}→${resolvedEnemyDice}）</span>`);
      }
    }

    if (enemySuppress > 0 && resolvedPlayerCard.id !== PASS_CARD.id) {
      const before = resolvedPlayerDice;
      resolvedPlayerDice = Math.max(0, resolvedPlayerDice - enemySuppress);
      const reduced = Math.max(0, before - resolvedPlayerDice);
      if (reduced > 0) {
        combatState.value.playerBaseDice = resolvedPlayerDice;
        log(`<span class="text-amber-300">敌方【${resolvedEnemyCard.name}】使我方原始点数 -${reduced}（${before}→${resolvedPlayerDice}）</span>`);
      }
    }
  };

  applyPointSuppressBeforeQueue();

  const playerFinalPointPreview = pSuccess
    ? getCardFinalPoint('player', resolvedPlayerCard, resolvedPlayerDice, true)
    : 0;
  const enemyFinalPointPreview = eSuccess
    ? getCardFinalPoint('enemy', resolvedEnemyCard, resolvedEnemyDice, true)
    : 0;
  log(
    `<span class="text-zinc-300">最终点数：我方【${resolvedPlayerCard.name}】[${playerFinalPointPreview}] vs 敌方【${resolvedEnemyCard.name}】[${enemyFinalPointPreview}]</span>`,
  );

  const queue: ActionEntry[] = [];
  let deferredEnemyAction: ActionEntry | null = null;
  if (pSuccess && !(isEnemyComboPrelude && resolvedPlayerCard.id === PASS_CARD.id)) {
    queue.push({
      source: 'player',
      card: resolvedPlayerCard,
      type: resolvedPlayerCard.type,
      baseDice: resolvedPlayerDice,
      magicManaPaidOnPlay: playerMagicManaPaidOnPlay,
    });
  }
  if (eSuccess) {
    const enemyAction: ActionEntry = {
      source: 'enemy',
      card: resolvedEnemyCard,
      type: resolvedEnemyCard.type,
      baseDice: resolvedEnemyDice,
      magicManaPaidOnPlay: enemyMagicManaPaidOnPlay,
    };
    if (!isEnemyComboPrelude && resolvedPlayerCard.traits.combo) {
      // 连击过程中，敌方行动延后到“连击结束”时再结算一次
      deferredEnemyAction = enemyAction;
    } else {
      queue.push(enemyAction);
    }
  }

  const typePriority = (t: CardType) => {
    if (t === CardType.FUNCTION) return 3;
    if (t === CardType.MAGIC) return 2;
    if (t === CardType.PHYSICAL) return 1;
    return 0;
  };

  queue.sort((a, b) => typePriority(b.type) - typePriority(a.type));

  const executeActionWithMagicEcho = async (action: ActionEntry) => {
    const manaCostBeforeUse = action.source === 'player' && action.type === CardType.MAGIC
      ? getEffectiveManaCost('player', action.card)
      : 0;
    if (action.source === 'player' && action.type === CardType.MAGIC && action.card.id !== PASS_CARD.id) {
      const starCoreCount = getActiveRelicCount('burn_star_core');
      const starCoreState = getRelicRuntimeState('burn_star_core');
      if (starCoreCount > 0 && starCoreState['firstMagicResolved'] !== true) {
        starCoreState['firstMagicResolved'] = true;
        nextMagicDoubleCast.value.player += 1;
        nextMagicDoubleCastFreeMana.value.player += 1;
        logRelicMessage('[星之核] 本场第一张法术牌将额外结算一次。');
      }
    }
    await executeCard(action.source, action.card, action.baseDice, {
      skipManaCost: action.magicManaPaidOnPlay,
      manaCostAlreadyPaid: action.magicManaPaidOnPlay,
    });
    if (
      action.source === 'player'
      && action.card.id !== PASS_CARD.id
      && action.card.traits.combo
      && getActiveRelicCount('alchemy_black') > 0
      && !alchemyBlackComboTriggeredThisTurn.value
      && playerStats.value.hp > 0
      && enemyStats.value.hp > 0
    ) {
      alchemyBlackComboTriggeredThisTurn.value = true;
      logRelicMessage(`[黑色] 本回合第一张连击牌【${action.card.name}】额外结算一次。`);
      await wait(320);
      if (endCombatPending.value) return;
      await executeCard(action.source, action.card, action.baseDice, { skipManaCost: action.type === CardType.MAGIC });
    }
    if (action.source === 'player' && action.card.id !== PASS_CARD.id) {
      if (action.type === CardType.MAGIC) {
        const fluorescentCount = getActiveRelicCount('modao_fluorescent_pendant');
        if (fluorescentCount > 0) {
          getRelicRuntimeState('modao_fluorescent_pendant')['physicalReductionThisTurn'] = 4 * fluorescentCount;
          logRelicMessage(`[荧光吊坠] 本回合受到的物理伤害 -${4 * fluorescentCount}。`);
        }
        const woodenStaffCount = getActiveRelicCount('modao_wooden_staff');
        if (woodenStaffCount > 0) {
          const state = getRelicRuntimeState('modao_wooden_staff');
          const before = Math.max(0, Math.floor(Number(state['magicPointBonus'] ?? 0)));
          const after = Math.min(4, before + woodenStaffCount);
          state['magicPointBonus'] = after;
          if (after > before) {
            logRelicMessage(`[原木法杖] 本场战斗法术卡牌点数 +${after}。`);
          }
        }
        const cycleNeedleCount = getActiveRelicCount('basic_cycle_needle');
        if (cycleNeedleCount > 0 && manaCostBeforeUse > 0 && Math.random() < 0.5) {
          const restored = restoreManaForSide('player', manaCostBeforeUse);
          if (restored > 0) {
            logRelicMessage(`[循环针] 返还 ${restored} 点法力。`);
          }
        }
      }
      if (action.source === 'player' && action.type !== CardType.ACTIVE) {
        getRelicRuntimeState('basic_silver_mirror')['previousPlayedCardId'] = action.card.id;
      }
    }
    if (action.type !== CardType.MAGIC) return;
    const pending = Math.max(0, nextMagicDoubleCast.value[action.source]);
    if (pending <= 0) return;

    nextMagicDoubleCast.value[action.source] = pending - 1;
    const freeManaPending = Math.max(0, nextMagicDoubleCastFreeMana.value[action.source]);
    const skipExtraManaCost = freeManaPending > 0;
    if (skipExtraManaCost) {
      nextMagicDoubleCastFreeMana.value[action.source] = freeManaPending - 1;
    }
    const sourceLabel = action.source === 'player' ? '我方' : '敌方';
    log(`<span class="text-sky-300">${sourceLabel}[复咒] 下一张魔法额外结算一次</span>`);
    if (endCombatPending.value) return;

    await wait(320);
    if (endCombatPending.value) return;
    await executeCard(action.source, action.card, action.baseDice, { skipManaCost: skipExtraManaCost });
  };

  const shouldRunSimultaneousVisuals = (
    queue.length === 2
    && queue.every((action) => action.type === CardType.DODGE || action.type === CardType.FUNCTION)
  );

  if (shouldRunSimultaneousVisuals) {
    await Promise.all(queue.map((action) => executeActionWithMagicEcho(action)));
    if (endCombatPending.value) return;
    await wait(630);
  } else {
    for (const action of queue) {
      if (endCombatPending.value) break;
      await executeActionWithMagicEcho(action);
      if (endCombatPending.value) break;
      await wait(630);
    }
  }
  stopAllCardAnimations();
  if (endCombatPending.value) return;
  if (isEnemyComboPrelude) return;

  // 连击：本次打出后，若带 draw 则补抽 1 张；并允许继续从剩余手牌出牌
  if (resolvedPlayerCard.traits.combo) {
    if (resolvedPlayerCard.traits.draw || getActiveRelicCount('alchemy_white_silk') > 0) {
      const { drawn, newDeck, newDiscard } = drawCards(1, combatState.value.playerDeck, combatState.value.discardPile);
      applyOnDrawCardEffects(drawn);
      markDrawnCardsAnimation(drawn);
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      combatState.value.playerHand = [...combatState.value.playerHand, ...drawn];
    }

    if (options.twinDirectCombo && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
      combatState.value.playerSelectedCard = null;
      combatState.value.phase = CombatPhase.PLAYER_INPUT;
      return;
    }

    if (!isTwinBattle && combatState.value.playerHand.length > 0 && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
      combatState.value.playerSelectedCard = null;
      combatState.value.phase = CombatPhase.PLAYER_INPUT;
      return;
    }

    // 连击无法继续时，再补结算一次敌方行动
    if (deferredEnemyAction && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
      if (endCombatPending.value) return;
      await executeActionWithMagicEcho(deferredEnemyAction);
      if (endCombatPending.value) return;
      await wait(630);
    }
  }

  if (playerStats.value.hp <= 0 || enemyStats.value.hp <= 0) return;

  if (options.suppressTurnCleanup) {
    combatState.value.playerSelectedCard = null;
    combatState.value.phase = CombatPhase.PLAYER_INPUT;
    return;
  }

  if (!options.deferTurnCleanup) {
    await processTurnEndInHandCardEffects();
    if (playerStats.value.hp <= 0 || enemyStats.value.hp <= 0) return;
  }

  // End-of-turn effect processing (armor halving, stun clear, etc.)
  getRelicRuntimeState('modao_rune_capacitor')['damageBoostStacksBeforeTurnEnd'] =
    Math.max(0, getEffectStacks(playerStats.value, ET.DAMAGE_BOOST));
  const playerArmorBeforeEnd = getEffectStacks(playerStats.value, ET.ARMOR);
  const enemyArmorBeforeEnd = getEffectStacks(enemyStats.value, ET.ARMOR);
  const parryShieldCount = getActiveRelicCount('basic_parry_shield');
  if (parryShieldCount > 0 && playerArmorBeforeEnd >= 6) {
    const { actualDamage } = applyDamageToSideWithRelics('enemy', enemyStats.value, 4 * parryShieldCount, false, '招架盾', {
      sourceSide: 'player',
      isDirectDamage: true,
    });
    if (actualDamage > 0) {
      pushFloatingNumber('enemy', actualDamage, 'physical', '-');
    }
    logRelicMessage(`[招架盾] 回合结束护甲 ${playerArmorBeforeEnd}，造成 ${actualDamage} 点伤害。`);
  }
  const drainRuneCount = getActiveRelicCount('modao_drain_rune');
  if (drainRuneCount > 0 && enemyStats.value.mp > playerStats.value.mp) {
    const drainedResult = changeManaWithShock('enemy', -drainRuneCount, '汲取符文');
    const drained = Math.max(0, -drainedResult.actualDelta);
    const restored = restoreManaForSide('player', drained);
    if (drained > 0 || restored > 0) {
      logRelicMessage(`[汲取符文] 汲取 ${drained} 点法力，回复 ${restored} 点法力。`);
    }
  }
  const lightningOrbCount = getActiveRelicCount('modao_lightning_orb');
  if (lightningOrbCount > 0) {
    let gainedBoost = 0;
    for (let i = 0; i < lightningOrbCount; i += 1) {
      if (!spendManaWithShock('player', 2, '闪电魔球')) break;
      if (applyStatusEffectWithRelics('player', ET.DAMAGE_BOOST, 1, { source: 'relic:modao_lightning_orb' })) {
        gainedBoost += 1;
      }
    }
    if (gainedBoost > 0) {
      logRelicMessage(`[闪电魔球] 消耗魔力，获得 ${gainedBoost} 层增伤。`);
    }
  }
  const ghostHandCount = getActiveRelicCount('yanhan_ghost_hand');
  if (ghostHandCount > 0 && playerDamageTakenThisTurn.value <= 0) {
    const stacks = Math.max(1, ghostHandCount);
    applyStatusEffectWithRelics('enemy', ET.COLD, stacks, { source: 'relic:yanhan_ghost_hand' });
    applyStatusEffectWithRelics('enemy', ET.FATIGUE, stacks, { source: 'relic:yanhan_ghost_hand' });
    logRelicMessage(`[幽灵手] 本回合未受伤，对敌方施加 ${stacks} 层寒冷与疲劳。`);
  }
  getRelicRuntimeState('burn_will_o_wisp_chain')['nextTurnPointBoost'] =
    getDamageHitTakenThisTurn('enemy') >= 2;
  const playerSkipArmorDecay = armorDecaySkippedThisTurn.value.player;
  const enemySkipArmorDecay = armorDecaySkippedThisTurn.value.enemy;
  const enemyPoisonStacksBeforeEnd = Math.max(0, getEffectStacks(enemyStats.value, ET.POISON));
  processLustIllusionTurnEndForSide('player');
  processLustIllusionTurnEndForSide('enemy');
  const pEndLogs = processOnTurnEnd(playerStats.value);
  const eEndLogs = processOnTurnEnd(enemyStats.value);
  processPhaseTransitionTurnEnd('player');
  processPhaseTransitionTurnEnd('enemy');
  if (playerSkipArmorDecay) {
    const playerArmorAfterDecay = getEffectStacks(playerStats.value, ET.ARMOR);
    if (playerArmorAfterDecay < playerArmorBeforeEnd) {
      applyStatusEffectWithRelics('player', ET.ARMOR, playerArmorBeforeEnd - playerArmorAfterDecay, {
        source: 'basic_guard',
      });
      log('<span class="text-cyan-300">我方【守护】使本回合护甲不触发减半</span>');
    }
  }
  if (enemySkipArmorDecay) {
    const enemyArmorAfterDecay = getEffectStacks(enemyStats.value, ET.ARMOR);
    if (enemyArmorAfterDecay < enemyArmorBeforeEnd) {
      applyStatusEffectWithRelics('enemy', ET.ARMOR, enemyArmorBeforeEnd - enemyArmorAfterDecay, {
        source: 'basic_guard',
      });
    }
  }
  const liverMarkCount = getActiveRelicCount('bloodpool_liver_mark');
  if (liverMarkCount > 0) {
    const poisonAmountStacks = Math.max(0, getEffectStacks(playerStats.value, ET.POISON_AMOUNT));
    const reduced = Math.min(poisonAmountStacks, liverMarkCount);
    if (reduced > 0) {
      reduceEffectStacks(playerStats.value, ET.POISON_AMOUNT, reduced);
      logRelicMessage(`[肝印记] 回合结束，中毒量 -${reduced}。`);
    }
  }
  const paintingCount = getActiveRelicCount('bloodpool_eerie_miniature_painting');
  if (paintingCount > 0 && enemyPoisonStacksBeforeEnd > 0 && enemyStats.value.hp > 0) {
    for (let i = 0; i < paintingCount; i += 1) {
      const damage = triggerBleedProc('enemy', `[诡异微型画作] 中毒触发联动（${i + 1}/${paintingCount}）`);
      if (damage <= 0 || enemyStats.value.hp <= 0) break;
    }
  }
  const statueCount = getActiveRelicCount('bloodpool_eerie_statue');
  if (statueCount > 0 && enemyStats.value.hp > 0) {
    for (let i = 0; i < statueCount; i += 1) {
      const damage = triggerBleedProc('enemy', `[诡异雕像] 回合结束触发（${i + 1}/${statueCount}）`);
      if (damage <= 0 || enemyStats.value.hp <= 0) break;
    }
  }
  if (temporaryBarrierToRemoveAtTurnEnd.value > 0) {
    const currentBarrier = Math.max(0, getEffectStacks(playerStats.value, ET.BARRIER));
    const removable = Math.min(currentBarrier, temporaryBarrierToRemoveAtTurnEnd.value);
    if (removable > 0) {
      reduceEffectStacks(playerStats.value, ET.BARRIER, removable);
      log(`<span class="text-zinc-300">主动【弹刀】提供的结界在回合结束时消失了。</span>`);
    }
    temporaryBarrierToRemoveAtTurnEnd.value = 0;
  }
  const playerTempBoostToRemove = Math.min(
    Math.max(0, getEffectStacks(playerStats.value, ET.DAMAGE_BOOST)),
    Math.max(0, Math.floor(temporaryDamageBoostToRemoveAtTurnEnd.value.player)),
  );
  if (playerTempBoostToRemove > 0) {
    reduceEffectStacks(playerStats.value, ET.DAMAGE_BOOST, playerTempBoostToRemove);
    log(`<span class="text-zinc-300">我方【注能】提供的 ${playerTempBoostToRemove} 层增伤在回合结束时消失了。</span>`);
  }
  const enemyTempBoostToRemove = Math.min(
    Math.max(0, getEffectStacks(enemyStats.value, ET.DAMAGE_BOOST)),
    Math.max(0, Math.floor(temporaryDamageBoostToRemoveAtTurnEnd.value.enemy)),
  );
  if (enemyTempBoostToRemove > 0) {
    reduceEffectStacks(enemyStats.value, ET.DAMAGE_BOOST, enemyTempBoostToRemove);
  }
  temporaryDamageBoostToRemoveAtTurnEnd.value = { player: 0, enemy: 0 };
  reverseBladeBleedOnHit.value = { player: 0, enemy: 0 };
  const playerArmorAfterEnd = getEffectStacks(playerStats.value, ET.ARMOR);
  const armorLostOnDecay = Math.max(0, playerArmorBeforeEnd - playerArmorAfterEnd);

  const sealCircuitCount = getActiveRelicCount('yanhan_seal_circuit');
  if (sealCircuitCount > 0 && armorLostOnDecay > 0) {
    const pending = Math.max(0, Math.floor((armorLostOnDecay * sealCircuitCount) / 3));
    if (pending > 0) {
      sealCircuitPendingMana.value += pending;
      logRelicMessage(`[封存回路] 护甲衰减损失 ${armorLostOnDecay}，存储 ${pending} 点魔力用于下回合。`);
    }
  }

  const reverseShellCount = getActiveRelicCount('yanhan_reverse_phase_shell');
  if (reverseShellCount > 0 && playerDamageTakenThisTurn.value >= 4) {
    const coldStacks = 2 * reverseShellCount;
    if (applyStatusEffectWithRelics('enemy', ET.COLD, coldStacks, { source: 'relic:yanhan_reverse_phase_shell' })) {
      logRelicMessage(`[反相壳层] 本回合累计受伤 ${playerDamageTakenThisTurn.value}，对敌方施加 ${coldStacks} 层寒冷。`);
    }
  }

  for (const l of [...pEndLogs, ...eEndLogs]) {
    log(`<span class="text-gray-500 text-[9px]">${l}</span>`);
  }
  insertBehemothFoodIntoPlayerDiscard();
  triggerPlayerRelicLifecycleHooks('onTurnEnd');
  if (instantFreezeClearColdAtTurnEnd.value) {
    const enemyColdStacks = Math.max(0, getEffectStacks(enemyStats.value, ET.COLD));
    if (enemyColdStacks > 0) {
      removeEffect(enemyStats.value, ET.COLD);
      log(`<span class="text-sky-300">主动【瞬时冻结】：回合结束，清除了敌方 ${enemyColdStacks} 层寒冷。</span>`);
    }
    instantFreezeClearColdAtTurnEnd.value = false;
  }
  const magicDollCount = getActiveRelicCount('modao_magic_doll');
  if (magicDollCount > 0 && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
    for (let i = 0; i < magicDollCount; i++) {
      const canSpend = spendManaWithShock('player', 1, '魔法玩偶');
      if (!canSpend) break;
      const { damage: dollDamage, isTrueDamage: dollIsTrueDamage, logs: dollDamageLogs } = calculateFinalDamage({
        finalPoint: 0,
        card: MAGIC_DOLL_DAMAGE_CARD,
        attackerEffects: playerStats.value.effects,
        defenderEffects: enemyStats.value.effects,
        relicModifiers: NO_RELIC_MOD,
      });
      const { actualDamage, logs: dollApplyLogs } = applyDamageToSideWithRelics(
        'enemy',
        enemyStats.value,
        dollDamage,
        dollIsTrueDamage,
        '魔法玩偶',
        { sourceSide: 'player', isDirectDamage: true, card: MAGIC_DOLL_DAMAGE_CARD },
      );
      if (actualDamage > 0) {
        pushFloatingNumber('enemy', actualDamage, 'magic', '-');
      }
      logRelicMessage(`[魔法玩偶] 消耗1点魔力，对敌方造成 ${actualDamage} 点伤害。`);
      for (const dl of dollDamageLogs) {
        if (dl.startsWith('原始伤害:')) continue;
        log(`<span class="text-gray-500 text-[9px]">${dl}</span>`);
      }
      for (const dl of dollApplyLogs) {
        const normalized = dl.startsWith('受到') ? `敌方${dl}` : dl;
        log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
      }
      if (actualDamage > 0) {
        triggerMicroFloatingCannonDamage('player', 'enemy');
      }
      if (enemyStats.value.hp <= 0) break;
    }
  }

  if (options.deferTurnCleanup) {
    return;
  }

  // Cleanup
  await playCardsToDiscardAnimation([...combatState.value.playerHand]);
  combatState.value.discardPile = [...combatState.value.discardPile, ...combatState.value.playerHand];
  combatState.value.playerHand = [];
  resetTwinTurnSelections();
  combatState.value.turn += 1;
  combatState.value.phase = CombatPhase.TURN_START;
  } catch (error) {
    console.error('[resolveCombat] error', error);
    stopAllCardAnimations();
    clearDicePreview();
    combatState.value.phase = CombatPhase.PLAYER_INPUT;
    log(`<span class="text-red-400">???????${error instanceof Error ? error.message : String(error)}</span>`);
  } finally {
    unlockCardManaCost(pCard);
    unlockCardManaCost(eCard);
    comboUiMaskBridge.value = false;
  }
};

// Watch for RESOLUTION phase
watch(
  () => combatState.value.phase,
  (phase) => {
    if (endCombatPending.value) return;
    if (twinDirectComboResolving.value) return;
    if (
      phase === CombatPhase.RESOLUTION &&
      combatState.value.playerSelectedCard &&
      combatState.value.enemyIntentCard &&
      !showClashAnimation.value
    ) {
      if (isTwinBattle && isTwinSelectionReady()) {
        void resolveTwinCombatSequence();
        return;
      }
      void resolveCombat(
        combatState.value.playerSelectedCard,
        combatState.value.enemyIntentCard,
        combatState.value.playerBaseDice,
        combatState.value.enemyBaseDice,
      );
    }
  },
);

const runEndCombatSequence = async (outcome: CombatOutcome) => {
  const token = ++endCombatSequenceToken;
  await wait(HP_BAR_ANIMATION_MS);
  if (token !== endCombatSequenceToken) return;

  await wait(RESULT_DELAY_MS);
  if (token !== endCombatSequenceToken) return;

  stopAllCardAnimations();
  battleResultBanner.value = outcome;
  combatState.value.phase = outcome === 'win' ? CombatPhase.WIN : CombatPhase.LOSE;

  await wait(RESULT_BANNER_STAY_MS);
  if (token !== endCombatSequenceToken) return;
  const finalPlayerStats = cloneEntityStats(playerStats.value);
  if (getEffectStacks(finalPlayerStats, ET.TEMP_MAX_HP) > 0) {
    removeEffect(finalPlayerStats, ET.TEMP_MAX_HP);
  }
  const defeatNegativeStatuses = outcome === 'lose'
    ? (Array.isArray(enemyDef?.defeatNegativeStatus)
      ? enemyDef.defeatNegativeStatus
      : [enemyDef?.defeatNegativeStatus ?? ''])
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];
  for (const negativeStatus of defeatNegativeStatuses) {
    if (pendingCardNegativeEffects.value.includes(negativeStatus)) continue;
    pendingCardNegativeEffects.value.push(negativeStatus);
    log(`<span class="text-fuchsia-300">我方战败于【${enemyDisplayName}】，获得负面状态：${negativeStatus}</span>`);
  }
  emit(
    'endCombat',
    outcome,
    finalPlayerStats,
    [...combatState.value.logs],
    [...pendingCardNegativeEffects.value],
    pendingAlchemyGoldDelta.value,
  );
};

watch(
  () => playerStats.value.hp,
  (nextHp, prevHp) => {
    if (endCombatPending.value) return;
    if (!Number.isFinite(nextHp) || !Number.isFinite(prevHp)) return;

    const maxHp = Math.max(1, playerStats.value.maxHp);
    const halfHp = maxHp * 0.5;
    const prevHalfState = prevHp > halfHp ? 1 : (prevHp < halfHp ? -1 : 0);
    const nextHalfState = nextHp > halfHp ? 1 : (nextHp < halfHp ? -1 : 0);
    const crossedHalf = prevHalfState * nextHalfState === -1;

    const resonanceCount = getActiveRelicCount('bloodpool_halfline_resonance');
    if (crossedHalf && resonanceCount > 0 && enemyStats.value.hp > 0) {
      for (let i = 0; i < resonanceCount; i += 1) {
        const damage = triggerBleedProc('enemy', `[半阈共振核] 阈值跨越触发（${i + 1}/${resonanceCount}）`);
        if (damage <= 0 || enemyStats.value.hp <= 0) break;
      }
    }

    const reboundCount = getActiveRelicCount('bloodpool_critical_rebound');
    if (
      reboundCount > 0
      && !bloodpoolCriticalReboundTriggered.value
      && nextHp > 0
      && nextHp < halfHp
    ) {
      bloodpoolCriticalReboundTriggered.value = true;
      const { healed } = healForSide('player', 10 * reboundCount);
      logRelicMessage(`[危线回流] 首次低于半血，回复 ${healed} 点生命。`);
    }
  },
);

// 任何生命值/中毒量变化后，立即执行中毒量致死判定。
watch(
  [
    () => playerStats.value.hp,
    () => enemyStats.value.hp,
    () => getEffectStacks(playerStats.value, ET.POISON_AMOUNT),
    () => getEffectStacks(enemyStats.value, ET.POISON_AMOUNT),
  ],
  ([, nextEnemyHp], [, prevEnemyHp]) => {
    if (endCombatPending.value || poisonAmountImmediateCheckRunning) return;
    triggerOthelloHalfHpDebuffCleanseIfNeeded(nextEnemyHp, prevEnemyHp);
    poisonAmountImmediateCheckRunning = true;
    try {
      applyImmediatePoisonAmountLethalCheck('player');
      applyImmediatePoisonAmountLethalCheck('enemy');
    } finally {
      poisonAmountImmediateCheckRunning = false;
    }
  },
);

// Win/Lose check
watch(
  [() => playerStats.value.hp, () => enemyStats.value.hp],
  ([pHp, eHp]) => {
    if (endCombatPending.value) return;

    let outcome: CombatOutcome | null = null;
    if (pHp <= 0) outcome = 'lose';
    else if (eHp <= 0) outcome = 'win';
    if (outcome === null) return;

    endCombatPending.value = true;
    void runEndCombatSequence(outcome);
  },
);
</script>

<style scoped>
.combat-float-number {
  animation-name: combat-float-up;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  line-height: 1;
}

.combat-float-number--heal {
  color: #4ade80 !important;
  text-shadow:
    0 0 10px rgba(74, 222, 128, 0.95),
    0 0 22px rgba(34, 197, 94, 0.6);
  -webkit-text-stroke: 0.45px rgba(6, 78, 59, 0.9);
}

.player-played-card {
  width: 10rem;
  z-index: 56;
  will-change: left, top, transform, opacity;
}

.player-played-card-bob {
  animation: player-played-card-bob calc(1.2s / var(--combat-speed-multiplier)) ease-in-out infinite;
}

@keyframes player-played-card-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.resolved-card-visual {
  position: absolute;
  width: 10rem;
  transform: translate(-50%, -50%);
  z-index: 58;
  pointer-events: none;
}

.resolved-card-visual--player {
  left: 29%;
  top: 23%;
}

.resolved-card-visual--enemy {
  left: 63%;
  top: 23%;
}

.resolved-card-visual-inner {
  opacity: 0.96;
  transform: scale(1);
  will-change: transform, opacity, filter;
  filter: drop-shadow(0 0 18px rgba(0, 0, 0, 0.45));
}

.combat-card-visual-scale {
  transform: scale(1.37);
  transform-origin: center center;
}

.hand-card-motion-draw {
  z-index: 70;
  pointer-events: none;
  will-change: transform, opacity;
  animation: hand-card-draw-rise calc(0.62s / var(--combat-speed-multiplier)) cubic-bezier(0.2, 0.9, 0.2, 1) both;
}

.hand-card-motion-discard {
  z-index: 70;
  pointer-events: none;
  will-change: transform, opacity;
  animation: hand-card-discard-drop calc(0.56s / var(--combat-speed-multiplier)) cubic-bezier(0.3, 0.78, 0.2, 1) both;
}

.hand-card-motion-turn_end_in_hand {
  z-index: 75;
  pointer-events: none;
  will-change: transform, opacity, filter;
  animation: hand-card-turn-end-center calc(0.82s / var(--combat-speed-multiplier)) cubic-bezier(0.2, 0.86, 0.2, 1) both;
}

.hand-card-motion-turn_end_in_hand--reveal {
  animation-name: hand-card-turn-end-center-reveal;
  animation-duration: calc(1.18s / var(--combat-speed-multiplier));
}

.resolved-card-visual-inner--player.resolved-card-visual-inner--attack {
  animation: card-attack-player calc(0.93s / var(--combat-speed-multiplier)) cubic-bezier(0.18, 0.9, 0.2, 1) forwards;
}

.resolved-card-visual-inner--enemy.resolved-card-visual-inner--attack {
  animation: card-attack-enemy calc(0.93s / var(--combat-speed-multiplier)) cubic-bezier(0.18, 0.9, 0.2, 1) forwards;
}

.resolved-card-visual-inner--player.resolved-card-visual-inner--self {
  animation: card-self-player calc(0.57s / var(--combat-speed-multiplier)) ease-out forwards;
}

.resolved-card-visual-inner--enemy.resolved-card-visual-inner--self {
  animation: card-self-enemy calc(0.57s / var(--combat-speed-multiplier)) ease-out forwards;
}

.resolved-card-visual-inner--player.resolved-card-visual-inner--fade,
.resolved-card-visual-inner--enemy.resolved-card-visual-inner--fade {
  animation: card-fade-only calc(0.57s / var(--combat-speed-multiplier)) ease-out forwards;
}

@keyframes card-attack-player {
  0% {
    opacity: 0.96;
    transform: translate3d(0, 0, 0) scale(1);
  }
  38% {
    opacity: 1;
    transform: translate3d(-90px, 40px, 0) scale(1.03);
  }
  78% {
    opacity: 1;
    transform: translate3d(56vw, 15vh, 0) scale(0.79);
  }
  100% {
    opacity: 0;
    transform: translate3d(58vw, 16vh, 0) scale(0.74);
  }
}

@keyframes card-attack-enemy {
  0% {
    opacity: 0.96;
    transform: translate3d(0, 0, 0) scale(1);
  }
  38% {
    opacity: 1;
    transform: translate3d(90px, -40px, 0) scale(1.03);
  }
  78% {
    opacity: 1;
    transform: translate3d(-50vw, 33vh, 0) scale(0.79);
  }
  100% {
    opacity: 0;
    transform: translate3d(-52vw, 34vh, 0) scale(0.74);
  }
}

@keyframes card-self-player {
  0% {
    opacity: 0.96;
    transform: translate3d(0, 0, 0) scale(1);
  }
  35% {
    opacity: 1;
    transform: translate3d(24px, -10px, 0) scale(1.02);
  }
  76% {
    opacity: 1;
    transform: translate3d(-170px, 300px, 0) scale(0.78);
  }
  100% {
    opacity: 0;
    transform: translate3d(-178px, 308px, 0) scale(0.74);
  }
}

@keyframes card-self-enemy {
  0% {
    opacity: 0.96;
    transform: translate3d(0, 0, 0) scale(1);
  }
  35% {
    opacity: 1;
    transform: translate3d(-24px, 10px, 0) scale(1.02);
  }
  76% {
    opacity: 1;
    transform: translate3d(180px, 120px, 0) scale(0.78);
  }
  100% {
    opacity: 0;
    transform: translate3d(188px, 126px, 0) scale(0.74);
  }
}

@keyframes card-fade-only {
  0% {
    opacity: 0.96;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.96);
  }
}

@keyframes hand-card-draw-rise {
  0% {
    opacity: 1;
    transform: translate3d(0, 58vh, 0);
  }
  78% {
    opacity: 1;
    transform: translate3d(0, -10px, 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes hand-card-discard-drop {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
  24% {
    opacity: 1;
    transform: translate3d(0, -14px, 0);
  }
  72% {
    opacity: 1;
    transform: translate3d(0, 48vh, 0);
  }
  100% {
    opacity: 0;
    transform: translate3d(0, 58vh, 0);
  }
}

@keyframes hand-card-turn-end-center {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    filter: drop-shadow(0 0 14px rgba(217, 70, 239, 0.18));
  }
  45% {
    opacity: 1;
    transform: translate3d(0, -43vh, 0) scale(1.06);
    filter: drop-shadow(0 0 30px rgba(217, 70, 239, 0.58));
  }
  70% {
    opacity: 1;
    transform: translate3d(0, -43vh, 0) scale(1.02);
    filter: drop-shadow(0 0 44px rgba(244, 114, 182, 0.72));
  }
  100% {
    opacity: 0;
    transform: translate3d(0, -43vh, 0) scale(0.9);
    filter: drop-shadow(0 0 0 rgba(244, 114, 182, 0));
  }
}

@keyframes hand-card-turn-end-center-reveal {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    filter: drop-shadow(0 0 14px rgba(217, 70, 239, 0.18));
  }
  36% {
    opacity: 1;
    transform: translate3d(0, -43vh, 0) scale(1.06);
    filter: drop-shadow(0 0 30px rgba(217, 70, 239, 0.58));
  }
  82% {
    opacity: 1;
    transform: translate3d(0, -43vh, 0) scale(1.03);
    filter: drop-shadow(0 0 46px rgba(244, 114, 182, 0.78));
  }
  100% {
    opacity: 0;
    transform: translate3d(0, -43vh, 0) scale(0.9);
    filter: drop-shadow(0 0 0 rgba(244, 114, 182, 0));
  }
}

@keyframes combat-float-up {
  0% {
    opacity: 0;
    transform: translate(-50%, 0) scale(0.85);
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -42px) scale(1.05);
  }
}

.combat-root :deep(.animate-float) {
  animation-duration: calc(6s / var(--combat-speed-multiplier));
}

.combat-root :deep(.animate-clash-left),
.combat-root :deep(.animate-clash-right),
.combat-root :deep(.animate-shatter) {
  animation-duration: calc(0.6s / var(--combat-speed-multiplier));
}

.combat-root :deep(.animate-shake) {
  animation-duration: calc(0.5s / var(--combat-speed-multiplier));
}

.combat-root :deep(.animate-impact-shake) {
  animation: impact-nudge calc(0.2s / var(--combat-speed-multiplier)) ease-out;
}

@keyframes impact-nudge {
  0% {
    transform: translate3d(0, 0, 0);
  }
  25% {
    transform: translate3d(-3px, 2px, 0);
  }
  50% {
    transform: translate3d(3px, -2px, 0);
  }
  75% {
    transform: translate3d(-2px, 1px, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

.effect-icon-btn {
  position: relative;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.35rem;
  border-width: 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  transition:
    transform calc(0.14s / var(--combat-speed-multiplier)) ease,
    filter calc(0.14s / var(--combat-speed-multiplier)) ease,
    box-shadow calc(0.22s / var(--combat-speed-multiplier)) ease;
}

.effect-icon-btn::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(125, 211, 252, 0.08), rgba(244, 114, 182, 0.2));
  opacity: 0;
  transform: scale(0.86);
  transition:
    opacity calc(0.18s / var(--combat-speed-multiplier)) ease,
    transform calc(0.18s / var(--combat-speed-multiplier)) ease;
}

.effect-icon-btn:hover,
.effect-icon-btn:focus-visible {
  transform: translateY(-1px);
  filter: brightness(1.12);
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.1);
  outline: none;
}

.effect-icon-btn:hover::before,
.effect-icon-btn:focus-visible::before {
  opacity: 0.42;
  transform: scale(1);
}

.status-effect-list,
.status-value-list {
  position: relative;
}

.status-effect-move,
.status-effect-enter-active,
.status-effect-leave-active {
  transition:
    opacity calc(0.3s / var(--combat-speed-multiplier)) cubic-bezier(0.22, 1, 0.36, 1),
    transform calc(0.3s / var(--combat-speed-multiplier)) cubic-bezier(0.22, 1, 0.36, 1),
    filter calc(0.3s / var(--combat-speed-multiplier)) ease;
}

.status-effect-enter-active.effect-icon-btn,
.status-effect-enter-active.status-effect-value-btn {
  animation: status-effect-spark calc(0.42s / var(--combat-speed-multiplier)) ease-out both;
}

.status-effect-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.76);
  filter: blur(2px) saturate(1.45);
}

.status-effect-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0) saturate(1);
}

.status-effect-leave-active {
  position: absolute;
  pointer-events: none;
}

.status-effect-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0) saturate(1);
}

.status-effect-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.72);
  filter: blur(2px) saturate(0.6);
}

.status-effect-value-btn {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  border-radius: 0.25rem;
  cursor: help;
  transition: filter calc(0.12s / var(--combat-speed-multiplier)) ease;
}

.status-effect-value-btn:hover,
.status-effect-value-btn:focus-visible {
  filter: brightness(1.08);
  outline: none;
}

.status-value-count {
  display: inline-block;
  animation: status-stack-pop calc(0.34s / var(--combat-speed-multiplier)) cubic-bezier(0.22, 1, 0.36, 1) both;
}

.effect-stack-badge {
  position: absolute;
  right: -0.28rem;
  bottom: -0.28rem;
  min-width: 0.9rem;
  height: 0.9rem;
  border-radius: 999px;
  background: rgba(8, 12, 24, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: rgba(255, 255, 255, 0.9);
  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  animation: status-stack-pop calc(0.34s / var(--combat-speed-multiplier)) cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes status-effect-spark {
  0% {
    box-shadow: 0 0 0 rgba(125, 211, 252, 0), 0 0 0 rgba(244, 114, 182, 0);
  }
  42% {
    box-shadow: 0 0 18px rgba(125, 211, 252, 0.24), 0 0 30px rgba(244, 114, 182, 0.16);
  }
  100% {
    box-shadow: 0 0 0 rgba(125, 211, 252, 0), 0 0 0 rgba(244, 114, 182, 0);
  }
}

@keyframes status-stack-pop {
  0% {
    transform: translate3d(0, 0, 0) scale(0.68);
    filter: brightness(1.8);
  }
  62% {
    transform: translate3d(0, -1px, 0) scale(1.12);
    filter: brightness(1.18);
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1);
    filter: brightness(1);
  }
}

.effect-tooltip {
  max-width: 20rem;
  background: rgba(8, 10, 16, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42);
  padding: 0.5rem 0.6rem;
}

.effect-tooltip--center {
  transform: translate(-50%, calc(-100% - 8px));
}

.effect-tooltip--right {
  transform: translate(0, calc(-100% - 8px));
}

.effect-tooltip-name {
  color: rgba(255, 255, 255, 0.95);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.effect-tooltip-desc {
  margin-top: 0.25rem;
  color: rgba(229, 231, 235, 0.92);
  font-size: 10px;
  line-height: 1.4;
}

.effect-tooltip-stacks {
  margin-top: 0.25rem;
  color: rgba(250, 204, 21, 0.92);
  font-size: 10px;
  line-height: 1.2;
  font-weight: 700;
}

.effect-tooltip-card-preview {
  width: 10rem;
  height: 15rem;
  margin: 0.5rem auto 0.6rem;
}

.poison-wave-bar {
  background-image:
    linear-gradient(180deg, rgba(16, 185, 129, 0.28), rgba(22, 163, 74, 0.8)),
    repeating-linear-gradient(
      -25deg,
      rgba(255, 255, 255, 0.18) 0px,
      rgba(255, 255, 255, 0.18) 10px,
      rgba(255, 255, 255, 0) 10px,
      rgba(255, 255, 255, 0) 20px
    );
  background-size: 100% 100%, 220% 100%;
  background-position: 0 0, 0 0;
  animation: poison-wave-slide calc(2.1s / var(--combat-speed-multiplier)) linear infinite;
}

@keyframes poison-wave-slide {
  from {
    background-position: 0 0, 0 0;
  }
  to {
    background-position: 0 0, 220% 0;
  }
}

.invalid-card-shake {
  position: relative;
  animation: invalid-card-shake calc(0.32s / var(--combat-speed-multiplier)) ease;
}

@keyframes invalid-card-shake {
  0% { left: 0; }
  18% { left: -8px; }
  36% { left: 7px; }
  54% { left: -5px; }
  72% { left: 4px; }
  100% { left: 0; }
}

.combat-button-cluster {
  transform: scale(1.2);
  transform-origin: top left;
}

.combat-top-left-panel {
  top: 1rem;
  left: 1.6rem;
}

.combat-turn-anchor {
  top: 1rem;
  left: 50%;
  transform: translateX(-50%) scale(1.43);
  transform-origin: top;
}

.combat-button-cluster--bottom-left {
  transform: scale(1.392);
  transform-origin: bottom left;
}

.combat-bottom-left-controls {
  left: 1.5rem;
  bottom: 1rem;
}

.combat-button-cluster--top-right {
  transform: scale(1.16);
  transform-origin: top right;
}

.combat-top-right-panel {
  right: 1rem;
  top: 3.5rem;
}

.combat-hand-anchor {
  transform: translateX(-2.5rem) scale(1.37);
  transform-origin: bottom;
}

.battle-result-banner {
  font-size: 3.75rem;
  line-height: 1;
}

.combat-status-bar {
  transform-origin: bottom center;
}

.combat-status-bar--enemy {
  align-self: flex-end;
  margin-right: calc(var(--enemy-shell-width) * var(--enemy-status-margin-right-ratio));
  transform: scale(var(--enemy-status-scale));
}

.combat-status-bar--player {
  transform: scale(1.24);
}

.player-layout-shell {
  --player-shell-width: 16rem;
  --player-shell-height: 20rem;
  --player-dice-left-ratio: 1.4;
  --player-dice-top-ratio: -0.05;
  --player-portrait-bottom-ratio: 0.05;
  --player-portrait-scale: 1.44;
  width: var(--player-shell-width);
  height: var(--player-shell-height);
  left: 6%;
  bottom: 30%;
  transform: scale(1.1);
  transform-origin: bottom left;
}

.player-dice-anchor {
  left: calc(var(--player-shell-width) * var(--player-dice-left-ratio) + 50px);
  top: calc(var(--player-shell-height) * var(--player-dice-top-ratio));
  transform: translateX(-50%) scale(1.04);
  transform-origin: center;
}

.player-portrait-scale {
  bottom: calc(var(--player-shell-height) * var(--player-portrait-bottom-ratio));
  transform: translateX(-50%) scale(var(--player-portrait-scale));
  transform-origin: bottom;
}

.enemy-layout-shell {
  --enemy-shell-width: 26rem;
  --enemy-shell-height: 42rem;
  --enemy-intent-left-ratio: -1.2307692308;
  --enemy-intent-top-ratio: -0.2857142857;
  --enemy-dice-left-ratio: -0.5336538462;
  --enemy-dice-top-ratio: 0.1636904762;
  --enemy-status-margin-right-ratio: 0.3461538462;
  --enemy-status-scale: 1.534;
  --enemy-portrait-translate-x: -38%;
  --enemy-portrait-translate-y-ratio: -0.1142857143;
  --enemy-portrait-scale: 1.64;
  --enemy-dice-scale: 1.04;
  width: var(--enemy-shell-width);
  height: var(--enemy-shell-height);
}

.enemy-layout-shell--desktop {
  --enemy-shell-width: 26rem;
  --enemy-shell-height: 42rem;
  right: 0;
  bottom: 0.9rem;
}

.enemy-intent-anchor {
  left: calc(var(--enemy-shell-width) * var(--enemy-intent-left-ratio));
  top: calc(var(--enemy-shell-height) * var(--enemy-intent-top-ratio));
}

.enemy-intent-anchor--twins {
  left: calc(var(--enemy-shell-width) * var(--enemy-intent-left-ratio) - 6rem);
  top: calc(var(--enemy-shell-height) * var(--enemy-intent-top-ratio) + 0.5rem);
}

.enemy-dice-anchor {
  left: calc(var(--enemy-shell-width) * var(--enemy-dice-left-ratio) - 60px);
  top: calc(var(--enemy-shell-height) * var(--enemy-dice-top-ratio));
  transform: translateX(-50%) scale(var(--enemy-dice-scale));
  transform-origin: center;
}

.enemy-portrait-scale {
  transform: translate(var(--enemy-portrait-translate-x), calc(var(--enemy-shell-height) * var(--enemy-portrait-translate-y-ratio))) scale(var(--enemy-portrait-scale));
}
</style>
