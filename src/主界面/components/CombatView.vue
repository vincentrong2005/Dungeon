<template>
  <div
    ref="combatRootEl"
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
    <div class="absolute top-4 left-4 z-50 pointer-events-auto flex flex-col gap-2 scale-[1.1] origin-top-left">
      <button
        class="w-10 h-10 bg-[#252030]/90 border border-white/10 rounded-xl text-dungeon-gold flex items-center justify-center hover:bg-[#352a40] hover:border-white/20 active:scale-95 transition-all shadow-lg"
        @click="settingsOpen = !settingsOpen"
      >
        <Settings2 class="size-5" />
        <span class="sr-only">设置</span>
      </button>
      <button
        class="w-10 h-10 bg-[#252030]/90 border border-white/10 rounded-xl text-dungeon-gold flex items-center justify-center hover:bg-[#352a40] hover:border-white/20 active:scale-95 transition-all shadow-lg"
        @click="emit('openDeck')"
      >
        <Scroll class="size-5" />
        <span class="sr-only">卡组</span>
      </button>
      <button
        class="w-10 h-10 bg-[#252030]/90 border border-white/10 rounded-xl text-dungeon-gold flex items-center justify-center hover:bg-[#352a40] hover:border-white/20 active:scale-95 transition-all shadow-lg"
        @click="emit('openRelics')"
      >
        <Box class="size-5" />
        <span class="sr-only">物品</span>
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
    <div class="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none scale-[1.1] origin-top">
      <div class="flex flex-col items-center">
        <span class="text-xs text-white/60 tracking-widest">回合</span>
        <span class="text-lg font-heading font-bold text-white/90">{{ combatState.turn }}</span>
        <div
          class="mt-1.5 w-44 relative pointer-events-auto"
          :style="fatigueBarStyle"
          @mouseenter="showFatigueHelp"
          @mouseleave="hideFatigueHelp"
        >
          <div class="h-1.5 rounded-full border border-amber-400/35 bg-black/45 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 transition-all duration-500"
              :style="withTransition({ width: `${fatigueDegreePercent}%` }, 500)"
            ></div>
          </div>
          <div
            v-if="fatigueHelpVisible && fatigueDegree > 50"
            class="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 w-64 rounded-md border border-amber-300/35 bg-black/80 px-2 py-1 text-[10px] leading-relaxed text-amber-100 text-left shadow-lg"
          >
            当前疲劳度：{{ fatigueDegree }}/300。进入战斗 +10，出牌 +1。达到200后每回合附加疲劳并额外附加中毒，300时直接战败。
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
      <!-- Enemy Position: Top Right -->
      <div class="absolute top-[3%] right-[2%] md:top-[5%] md:right-[3%] w-96 h-[32rem] flex flex-col items-center justify-end group transition-transform duration-1000 scale-[1.1] origin-top-right">
        <!-- Enemy Intent Card -->
        <div
          v-if="showEnemyIntentCard && combatState.enemyIntentCard"
          class="absolute -left-48 top-8"
        >
          <div class="relative">
            <div class="absolute -top-5 left-0 text-amber-200/80 text-[10px] px-2 py-0.5 rounded">
              敌方意图
            </div>
            <div class="rotate-[-3deg] shadow-[0_0_20px_rgba(200,120,0,0.15)]">
              <DungeonCard
                :card="combatState.enemyIntentCard!"
                :mask-level="enemyIntentMaskLevel"
                is-enemy
                disabled
              />
            </div>
          </div>
        </div>

        <!-- Enemy Dice -->
        <div
          v-if="!showClashAnimation"
          class="absolute -left-24 bottom-20 z-20 animate-float pointer-events-auto"
          @mouseenter="handleEnemyDiceHoverStart"
          @mouseleave="handleEnemyDiceHoverEnd"
          @touchstart.passive="handleEnemyDiceTouchStart"
          @touchend="handleEnemyDiceTouchEnd"
          @touchcancel="handleEnemyDiceTouchEnd"
        >
          <DungeonDice
            :value="displayEnemyDice"
            :rolling="isRolling"
            :rolling-min="enemyStats.minDice"
            :rolling-max="enemyStats.maxDice"
            :number-class="enemyDiceNumberClass"
            color="red"
            size="md"
          />
        </div>

        <!-- Enemy Portrait -->
        <div class="relative w-full h-full">
          <div
            class="absolute bottom-0 left-1/2 -translate-x-1/2 scale-[1.2] origin-bottom w-64 h-80 flex items-end justify-center overflow-hidden"
          >
            <!-- Placeholder icon (shown when portrait fails to load) -->
            <Skull v-if="enemyPortraitError" class="w-48 h-48 text-red-900/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <!-- Enemy portrait image -->
            <img
              v-else
              :src="enemyPortraitUrl"
              class="w-full h-full object-contain object-bottom"
              alt="enemy portrait"
              @error="enemyPortraitError = true"
            />
          </div>
        </div>

        <!-- Enemy Status Bar -->
        <div class="relative overflow-visible mt-0 w-72 scale-[1.2] origin-top bg-[#18141e]/90 border border-white/8 p-3 rounded-xl shadow-lg backdrop-blur-sm z-10 pointer-events-auto">
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
          <div v-if="enemyArmor > 0 || enemyPoisonAmount > 0 || enemyTempMaxHp > 0" class="flex items-center gap-3 mb-1">
            <button
              v-if="enemyArmor > 0"
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
              <span class="text-[10px] text-yellow-300 font-bold">{{ enemyArmor }}</span>
            </button>
            <button
              v-if="enemyPoisonAmount > 0"
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
              <span class="text-[10px] text-green-300 font-bold">{{ enemyPoisonAmount }}</span>
            </button>
            <button
              v-if="enemyTempMaxHp > 0"
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
              <span class="text-[10px] text-rose-300 font-bold">{{ enemyTempMaxHp }}</span>
            </button>
          </div>
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
            <span class="text-[10px] text-white/70 w-14 text-right">{{ enemyStats.hp }}/{{ enemyStats.maxHp }}</span>
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
            <span class="text-[10px] text-red-300">{{ enemyStats.minDice }} ~ {{ enemyStats.maxDice }}</span>
          </div>
          <!-- Buffs/Debuffs -->
          <div v-if="enemyVisibleEffects.length > 0" class="flex flex-wrap gap-1.5 mt-1.5 pointer-events-auto">
            <button
              v-for="(eff, i) in enemyVisibleEffects"
              :key="`enemy-${eff.type}-${i}`"
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
              <span v-if="eff.stacks > 1" class="effect-stack-badge">{{ eff.stacks }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Player Position: Bottom Left -->
      <div class="absolute bottom-[18%] left-[3%] md:bottom-[22%] md:left-[6%] w-64 h-80 flex flex-col items-center justify-end z-20 translate-y-28 md:translate-y-32 scale-[1.1] origin-bottom-left">
        <!-- Player Dice -->
        <div
          v-if="!showClashAnimation"
          class="absolute -top-[1rem] left-[140%] -translate-x-1/2 z-20 animate-float pointer-events-auto"
          :class="canPlayerRerollDice ? 'cursor-pointer' : 'cursor-default'"
          :title="playerDiceRerollHint"
          style="animation-delay: 1s"
          @click="handlePlayerDiceClick"
        >
          <DungeonDice
            :value="displayPlayerDice"
            :rolling="isRolling"
            :rolling-min="playerStats.minDice"
            :rolling-max="playerStats.maxDice"
            :number-class="playerDiceNumberClass"
            color="gold"
            size="md"
          />
          <div
            v-if="playerDiceRerollCharges > 0"
            class="absolute left-1/2 top-[5.9rem] -translate-x-1/2 rounded-md border border-amber-300/35 bg-black/60 px-2 py-1 text-[10px] whitespace-nowrap"
            :class="canPlayerRerollDice ? 'text-amber-200' : 'text-amber-200/70'"
          >
            重掷次数：{{ playerDiceRerollCharges }}
          </div>
        </div>

        <!-- Player Portrait -->
        <div class="relative w-full h-full">
          <div
            class="absolute bottom-4 left-1/2 -translate-x-1/2 scale-[1.2] origin-bottom w-64 h-80 flex items-end justify-center overflow-hidden"
          >
            <!-- Placeholder glow (shown when portrait fails to load) -->
            <div v-if="playerPortraitError" class="size-20 bg-dungeon-gold/15 blur-2xl rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <!-- Player portrait image -->
            <img
              v-else
              :src="playerPortraitUrl"
              class="w-full h-full object-contain object-bottom"
              alt="player portrait"
              @error="playerPortraitError = true"
            />
          </div>
        </div>

        <!-- Player Status Bar -->
        <div class="relative overflow-visible mt-2 w-60 scale-[1.2] origin-bottom bg-[#18141e]/90 border border-white/8 p-2.5 rounded-xl shadow-xl backdrop-blur-sm z-10 pointer-events-auto">
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
          <div v-if="playerArmor > 0 || playerPoisonAmount > 0 || playerTempMaxHp > 0" class="flex items-center gap-3 mb-1">
            <button
              v-if="playerArmor > 0"
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
              <span class="text-[10px] text-yellow-300 font-bold">{{ playerArmor }}</span>
            </button>
            <button
              v-if="playerPoisonAmount > 0"
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
              <span class="text-[10px] text-green-300 font-bold">{{ playerPoisonAmount }}</span>
            </button>
            <button
              v-if="playerTempMaxHp > 0"
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
              <span class="text-[10px] text-rose-300 font-bold">{{ playerTempMaxHp }}</span>
            </button>
          </div>
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
            <span class="text-[10px] text-white/70 w-14 text-right">{{ playerStats.hp }}/{{ playerStats.maxHp }}</span>
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
          <div v-if="playerVisibleEffects.length > 0" class="flex flex-wrap gap-1.5 mt-1.5 pointer-events-auto">
            <button
              v-for="(eff, i) in playerVisibleEffects"
              :key="`player-${eff.type}-${i}`"
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
              <span v-if="eff.stacks > 1" class="effect-stack-badge">{{ eff.stacks }}</span>
            </button>
          </div>
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
          <DungeonCard :card="playerPlayedCardVisual.card" disabled />
        </div>
      </div>

      <div
        v-for="visual in resolvedCardVisualEntries"
        :key="visual.id"
        class="resolved-card-visual"
        :class="visual.source === 'player' ? 'resolved-card-visual--player' : 'resolved-card-visual--enemy'"
      >
        <div class="resolved-card-visual-inner" :class="resolvedCardVisualInnerClass(visual)">
          <DungeonCard :card="visual.card" disabled />
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
            class="absolute right-1/2 mr-[-0.5rem] transition-all duration-300"
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
            class="absolute left-1/2 ml-[-0.5rem] transition-all duration-300"
            :class="shatteringTarget === 'enemy' || shatteringTarget === 'both' ? 'animate-shatter' : 'animate-clash-right'"
            :style="transitionStyle(300)"
          >
            <DungeonDice
              :value="displayEnemyDice"
              :rolling="false"
              :rolling-min="enemyStats.minDice"
              :rolling-max="enemyStats.maxDice"
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
        <div class="flex space-x-4 items-end mb-2 z-40 scale-[1.1] origin-bottom pointer-events-auto">
          <div
            v-for="(card, idx) in combatState.playerHand"
            :key="handCardKey(card)"
            class="transition-all duration-500 origin-bottom"
            :class="[handCardClass(card), isCardShaking(card) ? 'invalid-card-shake' : '']"
            :style="transitionStyle(500)"
            @mouseenter="handlePlayerCardHoverStart(card)"
            @mouseleave="handlePlayerCardHoverEnd"
            @touchstart.passive="handlePlayerCardTouchStart(card)"
            @touchend="handlePlayerCardTouchEnd"
            @touchcancel="handlePlayerCardTouchEnd"
          >
            <DungeonCard
              :card="getDisplayHandCard(card)"
              :mask-level="playerHandMaskLevel"
              :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT && combatState.playerSelectedCard !== card"
              @click="handleCardSelect(card, idx)"
            />
          </div>
        </div>

        <!-- Right Corner: Skip + Deck/Discard -->
        <div class="absolute right-6 bottom-6 flex flex-col items-end gap-2.5 z-50 scale-[1.1] origin-bottom-right pointer-events-auto">
          <button
            class="h-8 px-5 bg-[#252030]/90 border border-white/15 rounded-lg text-xs text-white/80 hover:border-amber-400 hover:text-amber-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT"
            @click="handleSkipTurn"
          >
            跳过回合
          </button>

          <div class="flex space-x-3">
            <div class="relative group">
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

      <!-- Log Feed Overlay: top-right, below parent "退出战斗" button -->
      <div class="absolute right-0 top-14 z-40 pointer-events-auto select-none scale-[1.1] origin-top-right">
        <div class="flex items-start">
          <button
            class="h-7 px-2 rounded-l-lg border border-r-0 border-white/10 bg-[#18141e]/90 text-[10px] text-white/50 hover:text-white/80 transition-colors"
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
      </div>
    </div>

    <div
      v-if="battleResultBanner"
      class="absolute inset-0 z-[70] flex items-center justify-center pointer-events-none"
    >
      <div
        class="px-12 py-5 rounded-2xl border-2 text-5xl md:text-6xl font-heading tracking-[0.2em] drop-shadow-[0_0_30px_rgba(0,0,0,0.9)] animate-pulse backdrop-blur-md"
        :class="battleResultBanner === 'win'
          ? 'bg-emerald-950/70 border-emerald-400/60 text-emerald-300'
          : 'bg-red-950/70 border-red-500/60 text-red-300'"
      >
        {{ battleResultBanner === 'win' ? '胜利' : '败北' }}
      </div>
    </div>
    <div
      v-if="effectTooltip"
      class="effect-tooltip absolute z-[72] pointer-events-none"
      :class="effectTooltip.align === 'right' ? 'effect-tooltip--right text-right' : 'effect-tooltip--center'"
      :style="{ left: `${effectTooltip.x}px`, top: `${effectTooltip.y}px` }"
    >
      <div class="effect-tooltip-name">{{ effectTooltip.name }}</div>
      <div class="effect-tooltip-desc">{{ effectTooltip.description }}</div>
      <div v-if="effectTooltip.stacks > 1" class="effect-tooltip-stacks">层数: {{ effectTooltip.stacks }}</div>
    </div>

    <!-- Deck/Discard Overlay -->
    <div
      v-if="overlayOpen"
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
            <DungeonCard :card="card" disabled />
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
  Layers,
  Leaf,
  Link2,
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
import { applyDamageToEntity, calculateFinalDamage, calculateFinalPoint, consumeColdAfterDealingDamage, triggerSwarmReviveIfNeeded } from '../battle/algorithms';
import { getCardByName } from '../battle/cardRegistry';
import { EFFECT_REGISTRY, ELEMENTAL_DEBUFF_TYPES, applyEffect, canPlayCard, getEffectStacks, processOnTurnEnd, processOnTurnStart, reduceEffectStacks, removeEffect } from '../battle/effects';
import { getEnemyByName } from '../battle/enemyRegistry';
import {
  resolveRelicMap,
  type RelicAfterBurnDamageTakenHookContext,
  type RelicApplyEffectOptions,
  type RelicBeforeApplyEffectHookContext,
  type RelicBurnDamageHookContext,
  type RelicData,
  type RelicDiceClickHookContext,
  type RelicHitHookContext,
  type RelicLifecycleHookContext,
  type RelicPointHookContext,
  type RelicSide,
  type ResolvedRelicEntry,
} from '../battle/relicRegistry';
import { getFloorNumberForArea } from '../floor';
import { toggleFullScreen } from '../fullscreen';
import { useGameStore } from '../gameStore';
import { getLocalFolderImagePaths } from '../localAssetManifest';
import { CardType, CombatPhase, EffectType as ET, type CardData, type CardEffectTrigger, type CardSelfDamageConfig, type CombatState, type EffectInstance, type EffectPolarity, type EffectType, type EnemyAIContext, type EntityStats } from '../types';
import { recordEncounteredCards, recordEncounteredEffects, recordEncounteredEnemy } from '../codexStore';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';

const props = withDefaults(defineProps<{
  initialPlayerStats: EntityStats;
  enemyName: string;
  playerDeck: CardData[];
  playerRelics?: Record<string, number>;
  testStartAt999?: boolean;
  uiFontFamily?: string;
  trackDiscovery?: boolean;
}>(), {
  playerRelics: () => ({}),
  testStartAt999: false,
  uiFontFamily: '',
  trackDiscovery: true,
});

const emit = defineEmits<{
  endCombat: [win: boolean, finalStats: EntityStats, logs: string[], negativeEffects: string[]];
  openDeck: [];
  openRelics: [];
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

// --- Enemy Loading ---
const enemyDef = getEnemyByName(props.enemyName, currentFloorNumber);
const enemyDisplayName = enemyDef?.name ?? props.enemyName;

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

let portraitLoaderDisposed = false;

const resolveRandomPortrait = async (
  folderPath: string,
  fallbackFilePath: string,
): Promise<string> => {
  const images = await fetchFolderImages(folderPath);
  const randomPath = pickRandom(images);
  return randomPath ? toResolveUrl(randomPath) : toResolveUrl(fallbackFilePath);
};

const initPortraitUrls = async () => {
  const playerUrl = await resolveRandomPortrait(HF_USER_DIR, `${HF_USER_DIR}/立绘.png`);
  if (!portraitLoaderDisposed) {
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

// --- State ---
const cloneEntityStats = (stats: EntityStats): EntityStats => ({
  ...stats,
  effects: stats.effects.map((eff) => ({
    ...eff,
    restrictedTypes: eff.restrictedTypes ? [...eff.restrictedTypes] : undefined,
  })),
});

const normalizeTestStartStats = (stats: EntityStats): EntityStats => {
  const cloned = cloneEntityStats(stats);
  if (!props.testStartAt999) return cloned;
  return { ...cloned, hp: 999, maxHp: 999, mp: 999 };
};

const playerStats = ref<EntityStats>(
  normalizeTestStartStats(props.initialPlayerStats),
);
const enemyStats = ref<EntityStats>(
  normalizeTestStartStats(
    enemyDef
      ? enemyDef.stats
      : { hp: 1, maxHp: 1, mp: 0, minDice: 1, maxDice: 1, effects: [] },
  ),
);

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
  [ET.INK_CREATION]: 'fa-solid fa-feather-pointed',
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
const EFFECT_ICON_COMPONENTS: Partial<Record<EffectType, any>> = {
  [ET.BARRIER]: ShieldCheck,
  [ET.ARMOR]: Shield,
  [ET.BIND]: Link2,
  [ET.DEVOUR]: Skull,
  [ET.POISON]: Bug,
  [ET.POISON_AMOUNT]: Droplet,
  [ET.CORROSION]: Droplet,
  [ET.BURN]: Flame,
  [ET.BLEED]: Droplet,
  [ET.VULNERABLE]: TriangleAlert,
  [ET.DAMAGE_BOOST]: Sword,
  [ET.REGEN]: Heart,
  [ET.WHITE_TURBID]: Droplet,
  [ET.IGNITE_AURA]: Sparkles,
  [ET.STUN]: Ban,
  [ET.CHARGE]: Zap,
  [ET.FATIGUE]: TriangleAlert,
  [ET.COLD]: Snowflake,
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
  [ET.SWARM]: Bug,
  [ET.BLOOD_COCOON]: Heart,
  [ET.INDOMITABLE]: Heart,
  [ET.PEEP_FORBIDDEN]: Eye,
  [ET.BLIND_ASH]: EyeOff,
  [ET.COGNITIVE_INTERFERENCE]: Brain,
  [ET.MEMORY_FOG]: EyeOff,
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
  [ET.THORNS]: Leaf,
  [ET.INK_CREATION]: Scroll,
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
const playerVisibleEffects = computed(() => playerStats.value.effects.filter(
  e => e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT && e.type !== ET.TEMP_MAX_HP,
));
const enemyVisibleEffects = computed(() => enemyStats.value.effects.filter(
  e => e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT && e.type !== ET.TEMP_MAX_HP,
));

const cloneCardForBattle = (card: CardData): CardData => ({
  ...card,
  calculation: { ...card.calculation },
  damageLogic: { ...card.damageLogic },
  traits: { ...card.traits },
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

const enemyDeck = enemyDef ? toBattleDeck(enemyDef.deck) : [];

// dummy card to prevent crash if enemy has no cards
const PASS_CARD: CardData = {
  id: 'pass', name: '跳过', type: CardType.FUNCTION, category: '基础', rarity: '普通', manaCost: 0,
  calculation: { multiplier: 0, addition: 0 }, damageLogic: { mode: 'fixed', value: 0 },
  traits: { combo: false, reroll: 'none', draw: false }, cardEffects: [], description: '无行动',
};

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

// 用于“吞食”判定：记录当前用于出牌限制判定的裸骰点数（重掷后同步更新）
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
const battleResultBanner = ref<'win' | 'lose' | null>(null);
const endCombatPending = ref(false);
const enemyIntentConsumedThisTurn = ref(false);
const enemyIntentManaSpentThisTurn = ref(false);
const combatRootEl = ref<HTMLElement | null>(null);
const effectTooltip = ref<{
  x: number;
  y: number;
  name: string;
  description: string;
  stacks: number;
  align: 'center' | 'right';
} | null>(null);

type BattleSide = 'player' | 'enemy';
type FloatingNumberKind = 'physical' | 'magic' | 'shield' | 'heal' | 'mana' | 'true';
type ResolvedCardAnimVariant = 'attack' | 'self' | 'fade';
type TooltipAlign = 'center' | 'right';

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
const FATIGUE_DEGREE_KEY = 'dungeon.combat.fatigue_degree';
const FATIGUE_DEGREE_MAX = 300;
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
const PLAYER_POISON_LETHAL_NEGATIVE_STATUS = '[催淫]';
const PLAYER_SHOCK_LETHAL_NEGATIVE_STATUS = '[神经肌肉失调]';
const PLAYER_CORROSION_LETHAL_NEGATIVE_STATUS = '[被侵蚀]';
const fatigueDegree = ref(0);
const fatigueHelpVisible = ref(false);
const fatigueDegreeRatio = computed(() => (
  Math.max(0, Math.min(fatigueDegree.value / FATIGUE_DEGREE_MAX, 1))
));
const fatigueDegreePercent = computed(() => fatigueDegreeRatio.value * 100);
const fatigueBarOpacityRatio = computed(() => {
  if (fatigueDegree.value <= 50) return 0;
  return Math.max(0, Math.min((fatigueDegree.value - 50) / (FATIGUE_DEGREE_MAX - 50), 1));
});
const fatigueBarStyle = computed(() => ({ opacity: String(fatigueBarOpacityRatio.value) }));
const showFatigueHelp = () => {
  fatigueHelpVisible.value = fatigueDegree.value > 50;
};
const hideFatigueHelp = () => {
  fatigueHelpVisible.value = false;
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
const rerollUiNoise = () => Math.floor(Math.random() * 3) - 1;
const displayPlayerDice = computed(() => {
  const base = previewPlayerDice.value ?? combatState.value.playerBaseDice;
  if (!isPlayerDiceObscured.value) return base;
  return Math.max(0, base + playerDiceUiNoise.value);
});
const displayEnemyDice = computed(() => {
  const base = previewEnemyDice.value ?? combatState.value.enemyBaseDice;
  if (!isEnemyDiceObscured.value) return base;
  return Math.max(0, base + enemyDiceUiNoise.value);
});
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
  if (isPlayerDiceObscured.value) return 'text-violet-400';
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
      title: `我方 · ${playerDicePreviewCardName.value || '点数预览'}`,
      finalPoint: previewPlayerDice.value,
      lines: playerDicePreviewLines.value,
    });
  }
  if (previewEnemyDice.value !== null && !isEnemyDiceObscured.value && enemyDicePreviewLines.value.length > 0) {
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
  isUiMaskingActive.value
    && getEffectStacks(playerStats.value, ET.COGNITIVE_INTERFERENCE) > 0
    ? 'full'
    : 'none'
));
const playerHandMaskLevel = computed<'none' | 'partial' | 'full'>(() => (
  isUiMaskingActive.value
    && getEffectStacks(playerStats.value, ET.MEMORY_FOG) > 0
    ? 'partial'
    : 'none'
));
const playerPlayedCardVisual = ref<PlayerPlayedCardVisual | null>(null);
const resolvedPlayerCardVisual = ref<ResolvedCardVisual | null>(null);
const resolvedEnemyCardVisual = ref<ResolvedCardVisual | null>(null);
const resolvedCardVisualEntries = computed(() => (
  [resolvedPlayerCardVisual.value, resolvedEnemyCardVisual.value]
    .filter((visual): visual is ResolvedCardVisual => !!visual)
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

const normalizePersistedInt = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const setFatigueDegree = (next: number) => {
  const normalized = normalizePersistedInt(next);
  fatigueDegree.value = normalized;
  localStorage.setItem(FATIGUE_DEGREE_KEY, String(normalized));
};

const loadFatigueDegree = () => {
  const stored = localStorage.getItem(FATIGUE_DEGREE_KEY);
  setFatigueDegree(normalizePersistedInt(stored ?? 0));
};

const addFatigueDegree = (delta: number) => {
  const amount = Math.max(0, Math.floor(delta));
  if (amount <= 0) return;
  setFatigueDegree(fatigueDegree.value + amount);
};

// Default relic modifiers (no relics yet)
const NO_RELIC_MOD = { globalMultiplier: 1, globalAddition: 0 };
const activePlayerRelics = resolveRelicMap(props.playerRelics);
const playerDiceRerollCharges = ref(0);
const relicRuntimeState = reactive<Record<string, Record<string, unknown>>>({});
const playerDamageTakenThisTurn = ref(0);
const freezePumpTriggersThisTurn = ref(0);
const freezeFlowCoreTriggeredThisTurn = ref(false);
const sealCircuitPendingMana = ref(0);
const modaoStabilizerTriggersThisTurn = ref(0);
const bloodpoolSkinMarkTriggersThisTurn = ref(0);
const bloodpoolFirstBleedFeastTriggered = ref(false);
const bloodpoolCriticalReboundTriggered = ref(false);
const nextMagicDoubleCast = ref<Record<'player' | 'enemy', number>>({
  player: 0,
  enemy: 0,
});
const nextTurnMagicCostFree = ref<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});

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

const applyDamageToSideWithRelics = (
  side: BattleSide,
  target: EntityStats,
  damage: number,
  isTrueDamage: boolean,
  reason: string,
) => {
  const incoming = Math.max(0, Math.floor(damage));
  const adjusted = side === 'player'
    ? applyPlayerHemostaticValveDamageCap(incoming, reason)
    : incoming;
  return applyDamageToEntity(target, adjusted, isTrueDamage);
};

const applyDirectHpLossWithRelics = (
  side: BattleSide,
  target: EntityStats,
  damage: number,
  reason: string,
): number => {
  const incoming = Math.max(0, Math.floor(damage));
  if (incoming <= 0) return 0;
  const adjusted = side === 'player'
    ? applyPlayerHemostaticValveDamageCap(incoming, reason)
    : incoming;
  const before = target.hp;
  target.hp = Math.max(0, target.hp - adjusted);
  return Math.max(0, before - target.hp);
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

const addArmorForSide = (side: RelicSide, amount: number): number => {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0) return 0;
  const target = getEntityBySide(side);
  const added = applyEffect(target, ET.ARMOR, value, { source: 'relic' }) ? value : 0;
  if (added > 0) {
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
  options?: { overflowToArmor?: boolean },
): { healed: number; overflow: number } => {
  const baseValue = Math.max(0, Math.floor(amount));
  if (baseValue <= 0) return { healed: 0, overflow: 0 };

  let value = baseValue;
  if (side === 'player') {
    const healAmpCount = getActiveRelicCount('bloodpool_crimson_plasma');
    if (healAmpCount > 0) {
      value = Math.max(0, Math.floor(value * (1 + 0.25 * healAmpCount)));
    }
  }
  if (value <= 0) return { healed: 0, overflow: 0 };

  const target = getEntityBySide(side);
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
  return { healed, overflow: overflowRaw };
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
      addLog: logRelicMessage,
      hasRelic: hasActiveRelic,
      getRelicCount: getActiveRelicCount,
      addStatusEffect: (side, targetEffectType, targetStacks, applyOptions) => (
        applyStatusEffectWithRelics(side, targetEffectType, targetStacks, applyOptions)
      ),
      addArmor: addArmorForSide,
      restoreMana: restoreManaForSide,
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
  const value = Math.max(0, Math.floor(stacks));
  if (value <= 0) return false;
  if (!shouldAllowStatusEffectWithRelics(side, effectType, value, options)) return false;
  const target = getEntityBySide(side);
  const hpBeforeApply = target.hp;
  const applied = applyEffect(target, effectType, value, {
    restrictedTypes: options?.restrictedTypes,
    source: options?.source,
    lockDecayThisTurn: options?.lockDecayThisTurn,
  });
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
  addLog: logRelicMessage,
  hasRelic: hasActiveRelic,
  getRelicCount: getActiveRelicCount,
  addStatusEffect: (side, effectType, stacks, options) => (
    applyStatusEffectWithRelics(side, effectType, stacks, {
      source: options?.source ?? `relic:${relic.id}`,
      restrictedTypes: options?.restrictedTypes,
      lockDecayThisTurn: options?.lockDecayThisTurn,
    })
  ),
  addArmor: addArmorForSide,
  restoreMana: restoreManaForSide,
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

const resolveTargetSide = (source: BattleSide, target: 'self' | 'enemy') => {
  if (target === 'self') return source;
  return source === 'player' ? 'enemy' : 'player';
};

const removeCardsById = (cards: CardData[], cardId: string): CardData[] => (
  cards.filter((card) => card.id !== cardId)
);

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

const insertCardIntoDeckRandomly = (deck: CardData[], card: CardData): CardData[] => {
  const index = Math.floor(Math.random() * (deck.length + 1));
  return [...deck.slice(0, index), card, ...deck.slice(index)];
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

const destroyOpponentCardByTrait = (winnerSide: BattleSide, loserCard: CardData) => {
  if (loserCard.id === PASS_CARD.id) return;
  if (winnerSide === 'player') {
    combatState.value.enemyDeck = removeCardsById(combatState.value.enemyDeck, loserCard.id);
    combatState.value.enemyDiscard = removeCardsById(combatState.value.enemyDiscard, loserCard.id);
  } else {
    combatState.value.playerDeck = removeCardsById(combatState.value.playerDeck, loserCard.id);
    combatState.value.playerHand = removeCardsById(combatState.value.playerHand, loserCard.id);
    combatState.value.discardPile = removeCardsById(combatState.value.discardPile, loserCard.id);
    if (combatState.value.playerSelectedCard?.id === loserCard.id) {
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

  const { actualDamage, logs: shockDamageLogs } = applyDamageToSideWithRelics(side, target, shockStacks, false, '电击');
  if (actualDamage > 0) {
    pushFloatingNumber(side, actualDamage, 'magic', '-');
  }

  const nextStacks = Math.max(0, shockStacks - 1);
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

const getEffectiveManaCost = (side: BattleSide, card: CardData): number => {
  const base = Math.max(0, Math.floor(card.manaCost ?? 0));
  if (card.type !== CardType.MAGIC) return base;
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

  const { actualDamage, logs: bleedLogs } = applyDamageToSideWithRelics(targetSide, target, bleedStacks, true, '流血');
  if (actualDamage > 0) {
    pushFloatingNumber(targetSide, actualDamage, 'true', '-');
  }
  log(`<span class="text-rose-300">[流血] ${reason}触发：${targetLabel}受到 ${actualDamage} 点真实伤害。</span>`);
  for (const dl of bleedLogs) {
    const normalized = dl.startsWith('受到') ? `${targetLabel}${dl}` : dl;
    log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
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
  applyStatusEffectWithRelics(targetSide, ET.BLEED, stacks, { source: 'effect:bloodblade_attach' });
  const sourceLabel = sourceSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-rose-300">${sourceLabel}[血刃附加] 为对方施加了 ${stacks} 层流血。</span>`);
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
) => {
  const attacker = source === 'player' ? playerStats.value : enemyStats.value;
  const defender = source === 'player' ? enemyStats.value : playerStats.value;
  const label = source === 'player' ? '我方' : '敌方';
  let hasEffect = false;

  for (const ce of card.cardEffects) {
    if (!cardEffectMatchesTrigger(ce.triggers, trigger)) continue;

    const targetKey = ce.target ?? 'self';
    const targetEntity = targetKey === 'self' ? attacker : defender;
    const targetSide = resolveTargetSide(source, targetKey);

    if (ce.kind === 'heal') {
      const healAmount = ce.valueMode === 'point_scale'
        ? Math.floor(finalPoint * (ce.scale ?? 1))
        : Math.floor(ce.fixedValue ?? 0);
      const { healed } = healForSide(targetSide, healAmount);
      log(`<span class="text-green-400">${label}【${card.name}】回复了 ${healed} 点生命</span>`);
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
        lockDecayThisTurn: ce.effectType === ET.BIND || ce.effectType === ET.SILENCE || ce.effectType === ET.STUN,
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
    }
  }

  return hasEffect;
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
    restrictedTypes: [CardType.PHYSICAL, CardType.DODGE],
    lockDecayThisTurn: true,
  });
  reduceEffectStacks(ambushOwner, ET.AMBUSH, 1);

  const sourceLabel = source === 'player' ? '我方' : '敌方';
  const ambushOwnerLabel = ambushOwnerSide === 'player' ? '我方' : '敌方';
  log(`<span class="text-violet-300">${ambushOwnerLabel}[伏击] 触发：${sourceLabel}获得 1 层束缚。</span>`);
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

let poisonAmountImmediateCheckRunning = false;
const applyImmediatePoisonAmountLethalCheck = (side: BattleSide) => {
  const target = side === 'player' ? playerStats.value : enemyStats.value;
  if (target.hp <= 0) return;

  const poisonAmount = getEffectStacks(target, ET.POISON_AMOUNT);
  if (poisonAmount <= 0 || poisonAmount < target.hp) return;

  removeEffect(target, ET.POISON_AMOUNT);
  const { actualDamage, logs: poisonLogs } = applyDamageToSideWithRelics(side, target, poisonAmount, true, '中毒量');
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

const rollIntInRange = (min: number, max: number) => {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (high <= low) return low;
  return Math.floor(Math.random() * (high - low + 1)) + low;
};

const applyFatigueDegreePenaltyOnTurnStart = () => {
  const current = fatigueDegree.value;
  if (current < 200) return false;

  if (current >= 300) {
    playerStats.value.maxHp = 0;
    playerStats.value.hp = 0;
    log('<span class="text-red-400">[疲劳度] 已达到 300，生命上限归零，直接战败。</span>');
    return true;
  }

  const fatigueStacks = rollIntInRange(1, 3);
  applyStatusEffectWithRelics('player', ET.FATIGUE, fatigueStacks, { source: 'system:fatigue_degree' });
  log(`<span class="text-amber-300">[疲劳度] 回合开始获得 ${fatigueStacks} 层疲劳。</span>`);

  if (current >= 200) {
    const poisonStacks = rollIntInRange(1, 2);
    applyStatusEffectWithRelics('player', ET.POISON, poisonStacks, { source: 'system:fatigue_degree' });
    log(`<span class="text-emerald-300">[疲劳度] 额外获得 ${poisonStacks} 层中毒。</span>`);
  }

  return false;
};

const queueCardNegativeEffectForPlayer = (source: BattleSide, card: CardData) => {
  if (source !== 'enemy') return;
  const negativeEffect = (card.negativeEffect ?? '').trim();
  if (!negativeEffect) return;
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
  if (flameStacks > 0 && (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC)) {
    applyStatusEffectWithRelics(defenderSide, ET.BURN, flameStacks, { source: 'effect:flame_attach' });
  }

  const poisonStacks = getEffectStacks(attacker, ET.POISON_ATTACH);
  if (poisonStacks > 0 && card.type === CardType.MAGIC) {
    applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: 'effect:poison_attach' });
  }

  const totalApplied = flameStacks + (card.type === CardType.MAGIC ? poisonStacks : 0);
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

const getCardFinalPoint = (
  source: 'player' | 'enemy',
  card: CardData,
  baseDice: number,
  isPreview: boolean = false,
) => {
  const attacker = source === 'player' ? playerStats.value : enemyStats.value;
  const defender = source === 'player' ? enemyStats.value : playerStats.value;

  let finalPoint = calculateFinalPoint({
    baseDice,
    card,
    entityEffects: attacker.effects,
    relicModifiers: NO_RELIC_MOD,
  });

  // 卡牌专属点数修正：敌方每有2层燃烧，点数+1
  if (card.id === 'burn_inferno_judgement') {
    finalPoint += Math.floor(getEffectStacks(defender, ET.BURN) / 2);
  }
  // 血债重击：自身每损失3点生命，点数+1
  if (card.id === 'bloodpool_blood_debt_strike') {
    const lostHp = Math.max(0, Math.floor(attacker.maxHp - attacker.hp));
    finalPoint += Math.floor(lostHp / 3);
  }

  if (source === 'player') {
    forEachPlayerRelic((entry, relic, state) => {
      const hook = relic.hooks?.modifyFinalPoint;
      if (!hook) return;
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
      finalPoint = hook(ctx);
    });
  }

  return Math.max(0, Math.floor(finalPoint));
};

const formatPointValue = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(Math.trunc(rounded));
  return rounded.toFixed(2).replace(/\.?0+$/, '');
};

const formatRelicPointDelta = (relicId: string, before: number, after: number): string => {
  if (relicId === 'modao_witch_hat' && Math.abs(before) > 0.0001) {
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

const buildCardPreviewLines = (source: 'player' | 'enemy', card: CardData, baseDice: number): string[] => {
  const attacker = source === 'player' ? playerStats.value : enemyStats.value;
  const defender = source === 'player' ? enemyStats.value : playerStats.value;
  const lines: string[] = [];

  lines.push(`原始：${baseDice}`);
  let finalPoint = calculateFinalPoint({
    baseDice,
    card,
    entityEffects: attacker.effects,
    relicModifiers: NO_RELIC_MOD,
  });
  const multiplierText = formatPointValue(card.calculation.multiplier);
  const addition = card.calculation.addition;
  const additionText = addition >= 0 ? `+${addition}` : `${addition}`;
  lines.push(`卡牌修正 x${multiplierText} ${additionText} => ${finalPoint}`);

  if (card.id === 'burn_inferno_judgement') {
    const bonus = Math.floor(getEffectStacks(defender, ET.BURN) / 2);
    if (bonus > 0) {
      finalPoint += bonus;
      lines.push(`炎狱判决 +${bonus} => ${finalPoint}`);
    }
  }
  if (card.id === 'bloodpool_blood_debt_strike') {
    const lostHp = Math.max(0, Math.floor(attacker.maxHp - attacker.hp));
    const bonus = Math.floor(lostHp / 3);
    if (bonus > 0) {
      finalPoint += bonus;
      lines.push(`血债重击（已损失${lostHp}） +${bonus} => ${finalPoint}`);
    }
  }

  if (source === 'player') {
    forEachPlayerRelic((entry, relic, state) => {
      const hook = relic.hooks?.modifyFinalPoint;
      if (!hook) return;
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
      finalPoint = hook(ctx);
      if (Math.abs(finalPoint - before) < 0.0001) return;
      lines.push(`${relic.name} ${formatRelicPointDelta(relic.id, before, finalPoint)} => ${formatPointValue(finalPoint)}`);
    });
  }

  lines.push(`最终：${Math.max(0, Math.floor(finalPoint))}`);
  return lines;
};

const getCardPreviewPoint = (source: 'player' | 'enemy', card: CardData, baseDice: number) => {
  return getCardFinalPoint(source, card, baseDice, true);
};

const handlePlayerCardHoverStart = (card: CardData) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  previewPlayerDice.value = getCardPreviewPoint('player', card, combatState.value.playerBaseDice);
  playerDicePreviewCardName.value = card.name;
  playerDicePreviewLines.value = buildCardPreviewLines('player', card, combatState.value.playerBaseDice);
};

const handlePlayerCardHoverEnd = () => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  previewPlayerDice.value = null;
  playerDicePreviewCardName.value = '';
  playerDicePreviewLines.value = [];
};

const handlePlayerCardTouchStart = (card: CardData) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (hoverPreviewTimer) clearTimeout(hoverPreviewTimer);
  hoverPreviewTimer = setTimeout(() => {
    if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
    previewPlayerDice.value = getCardPreviewPoint('player', card, combatState.value.playerBaseDice);
    playerDicePreviewCardName.value = card.name;
    playerDicePreviewLines.value = buildCardPreviewLines('player', card, combatState.value.playerBaseDice);
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
};

const rollDiceInRange = (min: number, max: number) => {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (high <= low) return low;
  return Math.floor(Math.random() * (high - low + 1)) + low;
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
      roll: rollDiceInRange,
      consumeRerollCharge,
      getRerollCharges,
      addLog: logRelicMessage,
    };
    rerolled = hook(ctx);
  });

  if (rerolled === null) {
    if (getRerollCharges('player') < chargesBeforeHooks) return;
    if (!consumeRerollCharge('player', 1)) return;
    rerolled = rollDiceInRange(playerStats.value.minDice, playerStats.value.maxDice);
    log(`<span class="text-amber-300">[基础重掷] 消耗1次重掷，剩余 ${getRerollCharges('player')} 次。</span>`);
  }

  const before = combatState.value.playerBaseDice;
  const rerolledRaw = Math.max(0, Math.floor(rerolled));
  playerTurnRawDice.value = rerolledRaw;
  const after = consumeChargeOnRoll(playerStats.value, '我方', rerolledRaw);
  combatState.value.playerBaseDice = after;
  previewPlayerDice.value = null;
  log(`<span class="text-amber-200">我方骰子重掷：${before} → ${after}</span>`);
};

const canPreviewEnemyDice = () => {
  return (
    combatState.value.phase === CombatPhase.PLAYER_INPUT &&
    !isRolling.value &&
    !showClashAnimation.value &&
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
  const rootRect = combatRootEl.value?.getBoundingClientRect();
  if (!rootRect) return;

  const rect = target.getBoundingClientRect();
  const top = Math.max(8, rect.top - rootRect.top - 8);
  const tooltipMaxWidth = 256;
  const x = align === 'right'
    ? Math.max(8, Math.min(rect.right - rootRect.left + 10, rootRect.width - tooltipMaxWidth - 8))
    : Math.max(100, Math.min(rect.left + rect.width / 2 - rootRect.left, rootRect.width - 100));
  effectTooltip.value = {
    x,
    y: top,
    name: getEffectName(effect.type),
    description: getEffectDescription(effect.type),
    stacks: effect.stacks,
    align,
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

const pushFloatingNumber = (side: BattleSide, value: number, kind: FloatingNumberKind, sign: '+' | '-' = '+') => {
  const amount = Math.max(0, Math.floor(value));
  if (amount <= 0) return;

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
  combatState.value.logs = [msg, ...combatState.value.logs].slice(0, 240);
};

if (activePlayerRelics.length > 0) {
  const relicSummary = activePlayerRelics
    .map((entry) => (entry.count > 1 ? `${entry.relic.name}x${entry.count}` : entry.relic.name))
    .join('、');
  log(`<span class="text-amber-300">本场圣遗物：${relicSummary}</span>`);
}
triggerPlayerRelicLifecycleHooks('onBattleStart');

onMounted(() => {
  battleSpeedUp.value = localStorage.getItem(SPEED_SETTING_KEY) === '1';
  loadFatigueDegree();
  addFatigueDegree(10);
  void initPortraitUrls();
});
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
    }
    const card = deck.pop();
    if (card) drawn.push(card);
  }
  return { drawn, newDeck: deck, newDiscard: discard };
};

const handCardClass = (card: CardData) => {
  const selected = combatState.value.playerSelectedCard;
  const isSelected = selected === card;
  const isNotSelected = selected && !isSelected;
  const isActionPhase = combatState.value.phase === CombatPhase.PLAYER_INPUT;

  return [
    isSelected ? '-translate-y-12 scale-110 z-50 ring-2 ring-dungeon-gold rounded-lg shadow-[0_0_30px_#d4af37]' : '',
    isNotSelected ? 'opacity-30 scale-90 translate-y-8 grayscale' : 'hover:scale-110 hover:-translate-y-4 hover:z-50',
    !isActionPhase && !isSelected ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer',
  ];
};

const getDisplayHandCard = (card: CardData): CardData => withEffectiveManaCost('player', card);

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

  let selectedCard: CardData;
  if (enemyDef) {
    // Use the enemy's custom AI logic
    const ctx: EnemyAIContext = {
      enemyStats: enemyStats.value,
      playerStats: playerStats.value,
      deck: combatState.value.enemyDeck,
      turn: combatState.value.turn,
      flags: aiFlags,
    };
    selectedCard = enemyDef.selectCard(ctx);
  } else {
    // Fallback: random selection (should never happen with proper registry)
    const idx = Math.floor(Math.random() * combatState.value.enemyDeck.length);
    selectedCard = combatState.value.enemyDeck[idx]!;
  }

  const runtimeCard = withEffectiveManaCost('enemy', selectedCard);
  const check = canPlayCard(enemyStats.value, runtimeCard, enemyTurnRawDice.value);
  if (!check.allowed) {
    log(`<span class="text-gray-400">敌方无法出牌：${check.reason ?? '本回合跳过。'}</span>`);
    return PASS_CARD;
  }
  return selectedCard;
}

// --- Phase Management ---

const startTurn = () => {
  if (endCombatPending.value) return;
  log(`<span class="text-slate-300">——第${combatState.value.turn}回合——</span>`);
  enemyManaLackHintTurn = -1;
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
  enemyIntentConsumedThisTurn.value = false;
  enemyIntentManaSpentThisTurn.value = false;
  isRolling.value = true;
  shatteringTarget.value = null;
  showClashAnimation.value = false;
  triggerPlayerRelicLifecycleHooks('onTurnStart');
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
    const pRawRoll = Math.floor(Math.random() * (playerStats.value.maxDice - playerStats.value.minDice + 1)) + playerStats.value.minDice;
    const eRawRoll = Math.floor(Math.random() * (enemyStats.value.maxDice - enemyStats.value.minDice + 1)) + enemyStats.value.minDice;
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
      freezePumpTriggersThisTurn.value = 0;
      freezeFlowCoreTriggeredThisTurn.value = false;
      modaoStabilizerTriggersThisTurn.value = 0;
      bloodpoolSkinMarkTriggersThisTurn.value = 0;
      if (combatState.value.turn === 1) {
        bloodpoolFirstBleedFeastTriggered.value = false;
        bloodpoolCriticalReboundTriggered.value = false;
        nextMagicDoubleCast.value.player = 0;
        nextMagicDoubleCast.value.enemy = 0;
        nextTurnMagicCostFree.value.player = 0;
        nextTurnMagicCostFree.value.enemy = 0;
      }
      const defeatedByFatigueDegree = applyFatigueDegreePenaltyOnTurnStart();
      if (defeatedByFatigueDegree) {
        return;
      }
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
          let pendingRegenHeal = 0;

          const regenLog = result.logs.find((entry) => entry.includes('[生命回复]'));
          if (regenLog) {
            const regenMatch = regenLog.match(/回复\s+(\d+)\s+点生命/);
            pendingRegenHeal = regenMatch ? Math.max(0, Number(regenMatch[1])) : 0;
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
              healForSide(opponentSide, result.opponentHpChange);
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

          const residualHpChange = result.hpChange - pendingRegenHeal;
          if (pendingRegenHeal > 0) {
            healForSide(targetSide, pendingRegenHeal);
          }

          if (residualHpChange !== 0) {
            if (residualHpChange > 0) {
              healForSide(targetSide, residualHpChange);
            } else {
              stats.value.hp = Math.max(0, Math.min(stats.value.maxHp, stats.value.hp + residualHpChange));
            }
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
          if (targetSide === 'player') {
            const turnStartDamageTaken = Math.max(
              0,
              turnStartImmediateDamageTaken + turnStartTrueDamageTaken + Math.max(0, -residualHpChange),
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
    if (phase === CombatPhase.DRAW_PHASE && !rolling) {
      // Use enemy AI to select card
      const eCard = selectEnemyCard();
      const { drawn, newDeck, newDiscard } = drawCards(3, combatState.value.playerDeck, combatState.value.discardPile);

      combatState.value.enemyIntentCard = eCard;
      enemyIntentConsumedThisTurn.value = false;
      enemyIntentManaSpentThisTurn.value = false;
      combatState.value.playerHand = drawn;
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      combatState.value.phase = CombatPhase.PLAYER_INPUT;
    }
  },
);

// Handle Card Select
const handleCardSelect = (card: CardData, handIdx: number) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (handIdx < 0 || handIdx >= combatState.value.playerHand.length) return;
  if (combatState.value.playerHand[handIdx] !== card) return;

  const runtimeCard = withEffectiveManaCost('player', card);
  const check = canPlayCard(playerStats.value, runtimeCard, playerTurnRawDice.value);
  if (!check.allowed) {
    triggerInvalidCardShake(card);
    log(`<span class="text-red-400">${check.reason ?? '当前无法使用该卡牌。'}</span>`);
    return;
  }

  if (runtimeCard.type === CardType.MAGIC) {
    const canSpend = spendManaWithShock('player', runtimeCard.manaCost, `使用【${card.name}】`);
    if (!canSpend) {
      triggerInvalidCardShake(card);
      log('<span class="text-red-400">法力不足，无法使用该魔法卡牌。</span>');
      return;
    }
  }

  // 出牌后立即离开手牌（卡牌“消失”），并进入弃牌堆
  const [played] = combatState.value.playerHand.splice(handIdx, 1);
  if (!played) return;
  clearDicePreview();
  showPlayerPlayedCard(played);
  addFatigueDegree(1);
  combatState.value.discardPile.push(played);
  combatState.value.playerSelectedCard = played;
  combatState.value.phase = CombatPhase.RESOLUTION;
};

const handleSkipTurn = () => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (!combatState.value.enemyIntentCard) return;

  clearDicePreview();
  clearPlayerPlayedCard();
  combatState.value.playerSelectedCard = PASS_CARD;
  combatState.value.phase = CombatPhase.RESOLUTION;
  log('<span class="text-gray-400">你选择了跳过当前回合。</span>');
};

// Clashable check
const isClashable = (card1: CardData, card2: CardData): boolean => {
  const t1 = card1.type;
  const t2 = card2.type;

  const bypassDodge =
    (card1.ignoreDodge && t2 === CardType.DODGE && (t1 === CardType.PHYSICAL || t1 === CardType.MAGIC))
    || (card2.ignoreDodge && t1 === CardType.DODGE && (t2 === CardType.PHYSICAL || t2 === CardType.MAGIC));
  if (bypassDodge) return false;

  if (t1 === CardType.PHYSICAL && t2 === CardType.PHYSICAL) return true;
  if (t1 === CardType.MAGIC && t2 === CardType.MAGIC) return true;
  if (t1 === CardType.DODGE && (t2 === CardType.PHYSICAL || t2 === CardType.MAGIC)) return true;
  if (t2 === CardType.DODGE && (t1 === CardType.PHYSICAL || t1 === CardType.MAGIC)) return true;
  return false;
};

// Resolution
const resolveCombat = async (pCard: CardData, eCard: CardData, pDice: number, eDice: number) => {
  if (endCombatPending.value) return;
  try {
  let resolvedPlayerCard = pCard;
  let resolvedEnemyCard = eCard;
  resolvedEnemyCard = withEffectiveManaCost('enemy', resolvedEnemyCard);
  if (
    resolvedEnemyCard.type === CardType.MAGIC
    && resolvedEnemyCard.id !== PASS_CARD.id
    && !enemyIntentManaSpentThisTurn.value
  ) {
    enemyIntentManaSpentThisTurn.value = true;
    const canSpend = spendManaWithShock('enemy', resolvedEnemyCard.manaCost, `使用【${resolvedEnemyCard.name}】`);
    if (!canSpend) {
      resolvedEnemyCard = PASS_CARD;
      combatState.value.enemyIntentCard = PASS_CARD;
      notifyEnemyManaInsufficient();
    }
  }

  resolvedPlayerCard = withFirstUseLightningAmbushBonus('player', resolvedPlayerCard);
  resolvedEnemyCard = withFirstUseLightningAmbushBonus('enemy', resolvedEnemyCard);

  if (resolvedPlayerCard.traits.combo) {
    comboUiMaskBridge.value = true;
  }

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
  const playerSkippedTurn = resolvedPlayerCard.id === PASS_CARD.id;
  const enemySkippedTurn = resolvedEnemyCard.id === PASS_CARD.id;
  let resolvedPlayerDice = pDice;
  let resolvedEnemyDice = eDice;
  const rerollByTrait = (source: BattleSide, card: CardData) => {
    if (card.id === PASS_CARD.id || card.traits.reroll === 'none') return;
    const sourceLabel = source === 'player' ? '我方' : '敌方';
    let target: BattleSide = source;
    if (card.traits.reroll === 'enemy') {
      target = source === 'player' ? 'enemy' : 'player';
    }
    const targetLabel = target === 'player' ? '我方' : '敌方';
    const targetStats = target === 'player' ? playerStats.value : enemyStats.value;
    const rerolled = rollDiceInRange(targetStats.minDice, targetStats.maxDice);
    const before = target === 'player' ? resolvedPlayerDice : resolvedEnemyDice;

    if (target === 'player') {
      resolvedPlayerDice = rerolled;
      combatState.value.playerBaseDice = rerolled;
    } else {
      resolvedEnemyDice = rerolled;
      combatState.value.enemyBaseDice = rerolled;
    }
    log(`<span class="text-amber-300">${sourceLabel}【${card.name}】触发重掷：${targetLabel}骰子 ${before} → ${rerolled}</span>`);
  };
  rerollByTrait('player', resolvedPlayerCard);
  rerollByTrait('enemy', resolvedEnemyCard);

  const pClashPoint = getCardPreviewPoint('player', resolvedPlayerCard, resolvedPlayerDice);
  const eClashPoint = getCardPreviewPoint('enemy', resolvedEnemyCard, resolvedEnemyDice);

  const clearBurnForSide = (side: 'player' | 'enemy', reason: string) => {
    const target = side === 'player' ? playerStats.value : enemyStats.value;
    const label = side === 'player' ? '我方' : '敌方';
    const burnStacks = getEffectStacks(target, ET.BURN);
    if (burnStacks <= 0) return;
    removeEffect(target, ET.BURN);
    log(`<span class="text-orange-300">${reason} ${label}燃烧清空（${burnStacks}层）。</span>`);
  };

  if (enemySkippedTurn) {
    clearBurnForSide('player', '敌方跳过回合。');
  }
  if (playerSkippedTurn) {
    clearBurnForSide('enemy', '我方跳过回合。');
  }

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

    if (resolvedPlayerCard.type === resolvedEnemyCard.type) {
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
    // 流血：只要发生拼点，双方都按各自当前流血层数受到真实伤害
    const playerBleedStacksOnClash = Math.max(0, getEffectStacks(playerStats.value, ET.BLEED));
    if (playerBleedStacksOnClash > 0) {
      triggerBleedProc('player', '拼点阶段');
    }
    const enemyBleedStacksOnClash = Math.max(0, getEffectStacks(enemyStats.value, ET.BLEED));
    if (enemyBleedStacksOnClash > 0) {
      triggerBleedProc('enemy', '拼点阶段');
    }
    if (clashWinner === 'enemy') {
      changeRerollCharges('player', 1);
      log('<span class="text-amber-300">拼点失败：重掷次数 +1</span>');
    }

    if (clashWinner === 'player') {
      clearBurnForSide('player', '拼点胜利。');
    } else if (clashWinner === 'enemy') {
      clearBurnForSide('enemy', '拼点胜利。');
    }
    if (clashWinner === 'player') {
      const pointMarkCount = getActiveRelicCount('bloodpool_clash_point_mark');
      if (pointMarkCount > 0) {
        if (applyStatusEffectWithRelics('enemy', ET.BLEED, pointMarkCount, { source: 'relic:bloodpool_clash_point_mark' })) {
          logRelicMessage(`[骰蚀刻印] 拼点成功，对敌方施加 ${pointMarkCount} 层流血。`);
        }
      }
    }

    if (successfulDodger === 'player') {
      applyLightningAttachOnDodge('player', 'enemy');
      applyCardEffectsByTrigger('player', resolvedPlayerCard, pClashPoint, 'on_dodge_success');
      if (resolvedPlayerCard.id === 'enemy_inkmouse_cowardice') {
        playerStats.value.maxDice += 1;
        log('<span class="text-cyan-300">我方【胆小】闪避成功：最大骰子点数 +1</span>');
      }
      if (resolvedPlayerCard.id === 'modao_zero_domain_dodge') {
        grantNextTurnMagicCostFree('player', resolvedPlayerCard);
      }
    } else if (successfulDodger === 'enemy') {
      applyLightningAttachOnDodge('enemy', 'player');
      applyCardEffectsByTrigger('enemy', resolvedEnemyCard, eClashPoint, 'on_dodge_success');
      if (resolvedEnemyCard.id === 'enemy_inkmouse_cowardice') {
        enemyStats.value.maxDice += 1;
        log('<span class="text-cyan-300">敌方【胆小】闪避成功：最大骰子点数 +1</span>');
      }
      if (resolvedEnemyCard.id === 'modao_zero_domain_dodge') {
        grantNextTurnMagicCostFree('enemy', resolvedEnemyCard);
      }
    }

    if (clashWinner === 'player' && resolvedPlayerCard.traits.destroyOnClashWin) {
      destroyOpponentCardByTrait('player', resolvedEnemyCard);
    } else if (clashWinner === 'enemy' && resolvedEnemyCard.traits.destroyOnClashWin) {
      destroyOpponentCardByTrait('enemy', resolvedPlayerCard);
    }

    await wait(650);
    showClashAnimation.value = false;
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
  const executeCard = async (source: 'player' | 'enemy', card: CardData, baseDice: number) => {
    if (endCombatPending.value) return;
    const attacker = source === 'player' ? playerStats.value : enemyStats.value;
    const defender = source === 'player' ? enemyStats.value : playerStats.value;
    const label = source === 'player' ? '我方' : '敌方';
    const defenderSide = source === 'player' ? 'enemy' : 'player';
    const defenderLabel = defenderSide === 'player' ? '我方' : '敌方';
    const opponentSkippedTurn = source === 'player' ? enemySkippedTurn : playerSkippedTurn;
    const enemyColdBeforeAction = getEffectStacks(enemyStats.value, ET.COLD);
    const playerBurnBeforeAction = getEffectStacks(playerStats.value, ET.BURN);
    const playerHpBeforeAction = playerStats.value.hp;
    let relicTrackingHandled = false;

    if (source === 'enemy' && card.id !== PASS_CARD.id) {
      enemyIntentConsumedThisTurn.value = true;
    }

    if (source === 'player') {
      clearPlayerPlayedCard();
    }
    if (card.id !== PASS_CARD.id) {
      log(`${label}使用了【${card.name}】`);
    }
    await playResolvedCardAnimation(source, card);
    if (endCombatPending.value) return;

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

      const manaDrain = Math.max(0, Math.floor(card.manaDrain ?? 0));
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
          actualOverflowHpDamage = applyDirectHpLossWithRelics(defenderSide, defender, overflowHpDamage, `卡牌【${card.name}】法力汲取溢出`);
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
          const actualTrueDamage = applyDirectHpLossWithRelics('enemy', enemyStats.value, trueDamage, '寒渊裂隙');
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
      if (card.type !== CardType.FUNCTION || card.id === PASS_CARD.id) return;
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

    const applyCardEffects = (trigger: CardEffectTrigger = 'on_use') => (
      applyCardEffectsByTrigger(source, card, finalPoint, trigger)
    );

    if (opponentSkippedTurn) {
      applyCardEffects('on_opponent_skip');
    }
    triggerLowTempEngraverOnFunctionPlay();

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
        applyStatusEffectWithRelics(defenderSide, ET.BLEED, selfBleed, { source: card.id });
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
        const actualTrueDamage = applyDirectHpLossWithRelics(defenderSide, defender, trueDamage, `卡牌【${card.name}】`);
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
      const x = Math.max(0, Math.floor(defender.mp));
      if (x > 0) {
        applyStatusEffectWithRelics(source, ET.STURDY, x, { source: card.id });
        attacker.mp += x;
        pushFloatingNumber(source, x, 'shield', '+');
        pushFloatingNumber(source, x, 'mana', '+');
      }
      log(`<span class="text-cyan-300">${label}【${card.name}】获得 ${x} 层坚固与 ${x} 点魔力</span>`);
      finalizeAndTrack();
      return;
    }

    if (card.id === 'enemy_muxinlan_cunning') {
      applyStatusEffectWithRelics(defenderSide, ET.PEEP_FORBIDDEN, 1, { source: card.id });
      applyStatusEffectWithRelics(defenderSide, ET.COGNITIVE_INTERFERENCE, 1, { source: card.id });
      log(`<span class="text-violet-300">${label}【${card.name}】使对手陷入窥视禁忌与认知干涉</span>`);
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

    if (card.type === CardType.FUNCTION) {
      if (card.id === 'burn_char_convert') {
        const burned = getEffectStacks(attacker, ET.BURN);
        syncCurrentPointForUi();
        if (burned > 0) {
          removeEffect(attacker, ET.BURN);
          attacker.mp += burned;
          pushFloatingNumber(source, burned, 'mana', '+');
          log(`<span class="text-blue-400">${label}【${card.name}】清除了 ${burned} 层燃烧并回复了 ${burned} 点魔力</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未检测到燃烧层数</span>`);
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
          applyStatusEffectWithRelics(defenderSide, ET.COLD, cycles, { source: card.id });
          const manaResult = changeManaWithShock(source, cycles, `法力变化（${label}【${card.name}】）`, {
            showPositiveFloating: true,
          });
          const restored = Math.max(0, manaResult.actualDelta);
          log(`<span class="text-sky-300">${label}【${card.name}】消耗 ${consumedArmor} 点护甲，施加 ${cycles} 层寒冷并回复 ${restored} 点魔力</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】护甲不足2点，未触发转化</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'yanhan_cold_source_rectifier') {
        syncCurrentPointForUi();
        const coldStacks = Math.max(0, getEffectStacks(defender, ET.COLD));
        const consumedCold = Math.min(4, coldStacks);
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

      // Process card effects (heal, apply_buff, restore_mana, cleanse)
      syncCurrentPointForUi();
      const hasEffect = applyCardEffects();
      if (card.id === 'enemy_rose_nectar_discipline') {
        const targetHasBind = getEffectStacks(defender, ET.BIND) > 0;
        if (targetHasBind) {
          const poisonStacks = Math.max(0, Math.floor(finalPoint));
          if (poisonStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: card.id });
            log(`<span class="text-emerald-300">${label}【${card.name}】触发：目标已束缚，施加 ${poisonStacks} 层中毒</span>`);
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
      if (card.id === 'burn_critical_boil') {
        const coldStacks = Math.max(0, getEffectStacks(defender, ET.COLD));
        const burnStacks = Math.max(0, getEffectStacks(defender, ET.BURN));
        const consumedBurn = Math.max(0, Math.min(burnStacks, Math.floor(coldStacks / 2)));
        const consumedCold = consumedBurn * 2;
        const trueDamage = consumedBurn * 4;

        if (consumedBurn > 0) {
          reduceEffectStacks(defender, ET.COLD, consumedCold);
          reduceEffectStacks(defender, ET.BURN, consumedBurn);
          const actualTrueDamage = applyDirectHpLossWithRelics(defenderSide, defender, trueDamage, `卡牌【${card.name}】`);
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

      const applyEffectsBeforeAttack = card.id === 'yanhan_frost_burst';
      if (applyEffectsBeforeAttack) {
        applyCardEffects();
      }
      const burnStacksOnDefender = getEffectStacks(defender, ET.BURN);
      const baseHitCount = Math.max(1, Math.floor(card.hitCount ?? 1));
      const defenderSwarmStacks = Math.max(0, getEffectStacks(defender, ET.SWARM));
      let extraHitCount = card.id === 'enemy_moth_swarm_burst'
        ? Math.max(0, getEffectStacks(attacker, ET.SWARM))
        : 0;
      let arcaneLanceBonusHit = false;
      if (card.id === 'modao_echo_feedback') {
        extraHitCount += defenderSwarmStacks;
      }
      if (card.id === 'modao_mana_hurricane') {
        const availableMp = Math.min(9, Math.max(0, Math.floor(attacker.mp)));
        const consumedMp = Math.floor(availableMp / 3) * 3;
        const bonusHits = Math.floor(consumedMp / 3);
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `法力变化（${label}【${card.name}】）`);
        }
        extraHitCount += bonusHits;
        log(`<span class="text-blue-300">${label}【${card.name}】额外消耗 ${consumedMp} 点魔力，追加 ${bonusHits} 次攻击</span>`);
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
      if (card.id === 'modao_arcane_lance' && attacker.mp >= 8) {
        const canConsume = spendManaWithShock(source, 4, `法力变化（${label}【${card.name}】额外结算）`);
        if (canConsume) {
          extraHitCount += 1;
          arcaneLanceBonusHit = true;
          log(`<span class="text-blue-300">${label}【${card.name}】额外消耗4点魔力，追加一次1.5倍伤害</span>`);
        }
      }
      const totalHitCount = baseHitCount + extraHitCount;

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

      let modaoMagicSwordTotalDamage = 0;
      let totalActualDamageDealt = 0;
      for (let hit = 0; hit < totalHitCount; hit++) {
        // Attack card: calculate damage through the full pipeline
        let cardForCalculation = card;
        const customDamage =
          card.id === 'burn_scorch_wind'
            ? Math.floor(finalPoint * 0.5) + burnStacksOnDefender
            : card.id === 'burn_detonation'
              ? Math.floor(burnStacksOnDefender)
              : card.id === 'yanhan_frost_burst'
                ? Math.max(0, getEffectStacks(defender, ET.COLD))
              : card.id === 'modao_mana_hurricane'
                ? Math.max(0, 12 - Math.floor(finalPoint))
                : card.id === 'modao_prism_flow'
                  ? Math.floor(finalPoint * (0.9 + Math.min(2.1, Math.floor(Math.max(0, attacker.mp) / 2) * 0.3)))
                  : card.id === 'modao_arcane_lance' && arcaneLanceBonusHit && hit === totalHitCount - 1
                    ? Math.floor(finalPoint * 1.5)
              : card.id === 'enemy_rose_wangzhi_whip' && getEffectStacks(defender, ET.BIND) > 0
                ? Math.floor(finalPoint) + 2
              : null;

        if (customDamage !== null) {
          cardForCalculation = {
            ...card,
            damageLogic: { mode: 'fixed', value: Math.floor(customDamage) },
          };
        }

        const { damage, isTrueDamage, logs: dmgLogs } = calculateFinalDamage({
          finalPoint,
          card: cardForCalculation,
          attackerEffects: attacker.effects,
          defenderEffects: defender.effects,
          relicModifiers: NO_RELIC_MOD,
        });
        const adjustedDamage = defenderSide === 'player'
          ? applyPlayerSkinMarkDamageReduction(damage, `${defenderLabel}受击`)
          : damage;
        const { actualDamage, logs: applyLogs } = applyDamageToSideWithRelics(defenderSide, defender, adjustedDamage, isTrueDamage, `卡牌【${card.name}】`);
        const hitPrefix = totalHitCount > 1 ? `第${hit + 1}段` : '';
        const damageLogColorClass = isTrueDamage ? 'text-zinc-500' : 'text-red-400';
        log(`${label}【${card.name}】${hitPrefix}点数${finalPoint}，造成 <span class="${damageLogColorClass} font-bold">${actualDamage}</span> 点伤害`);
        if (actualDamage > 0) {
          const damageKind: FloatingNumberKind = isTrueDamage
            ? 'true'
            : (card.type === CardType.MAGIC ? 'magic' : 'physical');
          pushFloatingNumber(defenderSide, actualDamage, damageKind, '-');
        }
        if (card.id === 'modao_magic_sword' && actualDamage > 0) {
          modaoMagicSwordTotalDamage += actualDamage;
        }
        if (actualDamage > 0) {
          totalActualDamageDealt += actualDamage;
        }

        if (card.type === CardType.PHYSICAL && !isTrueDamage && actualDamage > 0) {
          const thornStacks = getEffectStacks(defender, ET.THORNS);
          if (thornStacks > 0) {
            let reflectedDamage = Math.max(0, Math.floor(actualDamage * 0.5));
            if (source === 'player') {
              reflectedDamage = applyPlayerSkinMarkDamageReduction(reflectedDamage, '荆棘反弹');
            }
            if (reflectedDamage > 0) {
              const { actualDamage: actualReflectedDamage, logs: reflectedLogs } = applyDamageToSideWithRelics(source, attacker, reflectedDamage, false, '荆棘反弹');
              if (actualReflectedDamage > 0) {
                pushFloatingNumber(source, actualReflectedDamage, 'physical', '-');
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

        const coldLogs = consumeColdAfterDealingDamage(attacker, actualDamage);
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
        applyHitAttachEffects(source, card, attacker, defenderSide);
        if (defender.hp <= 0) break;
      }
      if (card.id === 'modao_magic_sword' && modaoMagicSwordTotalDamage > 0) {
        const manaResult = changeManaWithShock(source, modaoMagicSwordTotalDamage, `法力变化（${label}【${card.name}】）`, {
          showPositiveFloating: true,
        });
        const restored = Math.max(0, manaResult.actualDelta);
        log(`<span class="text-blue-300">${label}【${card.name}】回收 ${restored} 点魔力</span>`);
      }
      if (card.id === 'bloodpool_siphon_slash') {
        const healAmount = Math.max(0, Math.floor(totalActualDamageDealt * 0.5));
        const { healed } = healForSide(source, healAmount);
        log(`<span class="text-green-300">${label}【${card.name}】吸血回复 ${healed} 点生命</span>`);
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

      // 攻击牌结算后同样触发附带效果（燃烧、易伤等）
      if (!applyEffectsBeforeAttack) {
        applyCardEffects();
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
      if (card.id === 'bloodpool_blood_debt_strike') {
        const bleedStacks = 3;
        if (applyStatusEffectWithRelics(defenderSide, ET.BLEED, bleedStacks, { source: card.id })) {
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
          if (applyStatusEffectWithRelics(defenderSide, ET.BLEED, bleedStacks, { source: card.id })) {
            log(`<span class="text-rose-300">${label}【${card.name}】追加施加 ${bleedStacks} 层流血</span>`);
          }
        }
      }

      if (card.id === 'yanhan_feedback_freeze_wheel') {
        const armorGain = Math.max(0, Math.floor(getEffectStacks(defender, ET.COLD) / 2));
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
          log(`<span class="text-emerald-300">${label}【${card.name}】触发：对手易伤存在，额外施加 ${poisonStacks} 层中毒</span>`);
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
            log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标已束缚，额外施加 ${vulnerableStacks} 层易伤</span>`);
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
          log(`<span class="text-violet-300">${label}【${card.name}】触发：目标已束缚，施加 1 层认知干涉</span>`);
        }
      }

      if (card.id === 'enemy_muxinlan_unstable_reagent') {
        const stacks = Math.max(0, Math.floor(finalPoint * 0.5));
        if (stacks > 0) {
          const picked = ELEMENTAL_DEBUFF_TYPES[Math.floor(Math.random() * ELEMENTAL_DEBUFF_TYPES.length)]!;
          applyStatusEffectWithRelics(defenderSide, picked, stacks, { source: card.id });
          log(`<span class="text-fuchsia-300">${label}【${card.name}】附加了 ${stacks} 层${EFFECT_REGISTRY[picked]?.name ?? picked}</span>`);
        }
      }
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
  }

  const applyPointSuppressBeforeQueue = () => {
    const playerSuppress = (pSuccess && resolvedPlayerCard.id === 'basic_point_suppress')
      ? Math.max(0, getCardPreviewPoint('player', resolvedPlayerCard, resolvedPlayerDice))
      : 0;
    const enemySuppress = (eSuccess && resolvedEnemyCard.id === 'basic_point_suppress')
      ? Math.max(0, getCardPreviewPoint('enemy', resolvedEnemyCard, resolvedEnemyDice))
      : 0;

    if (playerSuppress > 0 && resolvedEnemyCard.id !== PASS_CARD.id) {
      const before = resolvedEnemyDice;
      resolvedEnemyDice = Math.max(0, resolvedEnemyDice - playerSuppress);
      const reduced = Math.max(0, before - resolvedEnemyDice);
      if (reduced > 0) {
        combatState.value.enemyBaseDice = resolvedEnemyDice;
        log(`<span class="text-amber-300">我方【${resolvedPlayerCard.name}】使敌方当前骰子点数 -${reduced}（${before}→${resolvedEnemyDice}）</span>`);
      }
    }

    if (enemySuppress > 0 && resolvedPlayerCard.id !== PASS_CARD.id) {
      const before = resolvedPlayerDice;
      resolvedPlayerDice = Math.max(0, resolvedPlayerDice - enemySuppress);
      const reduced = Math.max(0, before - resolvedPlayerDice);
      if (reduced > 0) {
        combatState.value.playerBaseDice = resolvedPlayerDice;
        log(`<span class="text-amber-300">敌方【${resolvedEnemyCard.name}】使我方当前骰子点数 -${reduced}（${before}→${resolvedPlayerDice}）</span>`);
      }
    }
  };

  applyPointSuppressBeforeQueue();

  const queue: ActionEntry[] = [];
  let deferredEnemyAction: ActionEntry | null = null;
  if (pSuccess) queue.push({ source: 'player', card: resolvedPlayerCard, type: resolvedPlayerCard.type, baseDice: resolvedPlayerDice });
  if (eSuccess) {
    const enemyAction: ActionEntry = { source: 'enemy', card: resolvedEnemyCard, type: resolvedEnemyCard.type, baseDice: resolvedEnemyDice };
    if (resolvedPlayerCard.traits.combo) {
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
    await executeCard(action.source, action.card, action.baseDice);
    if (action.type !== CardType.MAGIC) return;
    const pending = Math.max(0, nextMagicDoubleCast.value[action.source]);
    if (pending <= 0) return;

    nextMagicDoubleCast.value[action.source] = pending - 1;
    const sourceLabel = action.source === 'player' ? '我方' : '敌方';
    log(`<span class="text-sky-300">${sourceLabel}[复咒] 下一张魔法额外结算一次</span>`);
    if (endCombatPending.value) return;

    await wait(320);
    if (endCombatPending.value) return;
    await executeCard(action.source, action.card, action.baseDice);
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

  // 连击：本次打出后，若带 draw 则补抽 1 张；并允许继续从剩余手牌出牌
  if (resolvedPlayerCard.traits.combo) {
    if (resolvedPlayerCard.traits.draw) {
      const { drawn, newDeck, newDiscard } = drawCards(1, combatState.value.playerDeck, combatState.value.discardPile);
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      combatState.value.playerHand = [...combatState.value.playerHand, ...drawn];
    }

    if (combatState.value.playerHand.length > 0 && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
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

  // End-of-turn effect processing (armor halving, stun clear, etc.)
  const playerArmorBeforeEnd = getEffectStacks(playerStats.value, ET.ARMOR);
  const pEndLogs = processOnTurnEnd(playerStats.value);
  const eEndLogs = processOnTurnEnd(enemyStats.value);
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
  if (reverseShellCount > 0 && playerDamageTakenThisTurn.value >= 10) {
    const coldStacks = 2 * reverseShellCount;
    if (applyStatusEffectWithRelics('enemy', ET.COLD, coldStacks, { source: 'relic:yanhan_reverse_phase_shell' })) {
      logRelicMessage(`[反相壳层] 本回合累计受伤 ${playerDamageTakenThisTurn.value}，对敌方施加 ${coldStacks} 层寒冷。`);
    }
  }

  for (const l of [...pEndLogs, ...eEndLogs]) {
    log(`<span class="text-gray-500 text-[9px]">${l}</span>`);
  }
  triggerPlayerRelicLifecycleHooks('onTurnEnd');
  const magicDollCount = getActiveRelicCount('modao_magic_doll');
  if (magicDollCount > 0 && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
    for (let i = 0; i < magicDollCount; i++) {
      const canSpend = spendManaWithShock('player', 1, '魔法玩偶');
      if (!canSpend) break;
      const { actualDamage, logs: dollLogs } = applyDamageToSideWithRelics('enemy', enemyStats.value, 2, false, '魔法玩偶');
      if (actualDamage > 0) {
        pushFloatingNumber('enemy', actualDamage, 'magic', '-');
      }
      logRelicMessage(`[魔法玩偶] 消耗1点魔力，对敌方造成 ${actualDamage} 点伤害。`);
      for (const dl of dollLogs) {
        const normalized = dl.startsWith('受到') ? `敌方${dl}` : dl;
        log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
      }
      if (enemyStats.value.hp <= 0) break;
    }
  }

  // Cleanup
  combatState.value.discardPile = [...combatState.value.discardPile, ...combatState.value.playerHand];
  combatState.value.playerHand = [];
  combatState.value.turn += 1;
  combatState.value.phase = CombatPhase.TURN_START;
  } finally {
    comboUiMaskBridge.value = false;
  }
};

// Watch for RESOLUTION phase
watch(
  () => combatState.value.phase,
  (phase) => {
    if (endCombatPending.value) return;
    if (
      phase === CombatPhase.RESOLUTION &&
      combatState.value.playerSelectedCard &&
      combatState.value.enemyIntentCard &&
      !showClashAnimation.value
    ) {
      resolveCombat(
        combatState.value.playerSelectedCard,
        combatState.value.enemyIntentCard,
        combatState.value.playerBaseDice,
        combatState.value.enemyBaseDice,
      );
    }
  },
);

const runEndCombatSequence = async (win: boolean) => {
  const token = ++endCombatSequenceToken;
  await wait(HP_BAR_ANIMATION_MS);
  if (token !== endCombatSequenceToken) return;

  await wait(RESULT_DELAY_MS);
  if (token !== endCombatSequenceToken) return;

  stopAllCardAnimations();
  battleResultBanner.value = win ? 'win' : 'lose';
  combatState.value.phase = win ? CombatPhase.WIN : CombatPhase.LOSE;

  await wait(RESULT_BANNER_STAY_MS);
  if (token !== endCombatSequenceToken) return;
  setFatigueDegree(0);
  const finalPlayerStats = cloneEntityStats(playerStats.value);
  if (getEffectStacks(finalPlayerStats, ET.TEMP_MAX_HP) > 0) {
    removeEffect(finalPlayerStats, ET.TEMP_MAX_HP);
  }
  emit('endCombat', win, finalPlayerStats, [...combatState.value.logs], [...pendingCardNegativeEffects.value]);
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
      const { healed } = healForSide('player', 5 * reboundCount);
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
  () => {
    if (endCombatPending.value || poisonAmountImmediateCheckRunning) return;
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

    let win: boolean | null = null;
    if (pHp <= 0) win = false;
    else if (eHp <= 0) win = true;
    if (win === null) return;

    endCombatPending.value = true;
    void runEndCombatSequence(win);
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
  transition: transform calc(0.14s / var(--combat-speed-multiplier)) ease, filter calc(0.14s / var(--combat-speed-multiplier)) ease;
}

.effect-icon-btn:hover,
.effect-icon-btn:focus-visible {
  transform: translateY(-1px);
  filter: brightness(1.12);
  outline: none;
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
}

.effect-tooltip {
  max-width: 16rem;
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
</style>
