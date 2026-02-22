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
              <DungeonCard :card="combatState.enemyIntentCard!" is-enemy disabled />
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
            :number-class="enemyDicePreviewChanged ? 'text-[#b08a2e]' : ''"
            color="red"
            size="md"
          />
          <div
            v-if="enemyDicePreviewChanged"
            class="absolute left-1/2 top-[4.6rem] -translate-x-1/2 rounded-md border border-white/15 bg-black/60 px-2 py-1 text-[10px] whitespace-nowrap pointer-events-none"
          >
            <span class="text-white/70">原始 {{ combatState.enemyBaseDice }}</span>
            <span class="mx-1 text-white/45">→</span>
            <span class="font-bold text-[#b08a2e]">最终 {{ displayEnemyDice }}</span>
          </div>
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
        <div class="relative overflow-visible mt-3 w-72 scale-[1.2] origin-top bg-[#18141e]/90 border border-white/8 p-3 rounded-xl shadow-lg backdrop-blur-sm z-10 pointer-events-auto">
          <div class="flex justify-between text-sm text-white/90 font-bold mb-1.5">
            <span>{{ enemyDisplayName }}</span>
          </div>
          <div class="pointer-events-none absolute inset-0 z-30 overflow-visible">
            <div
              v-for="popup in floatingNumbersFor('enemy')"
              :key="popup.id"
              class="combat-float-number absolute text-xl font-extrabold tracking-wide"
              :class="popup.colorClass"
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
          <div v-if="enemyArmor > 0 || enemyPoisonAmount > 0" class="flex items-center gap-3 mb-1">
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
              <component :is="getEffectIconComponent(eff.type)" class="size-3.5" />
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
            :number-class="playerDicePreviewChanged ? 'text-red-800' : ''"
            color="gold"
            size="md"
          />
          <div
            v-if="playerDicePreviewChanged"
            class="absolute left-1/2 top-[4.6rem] -translate-x-1/2 rounded-md border border-white/15 bg-black/60 px-2 py-1 text-[10px] whitespace-nowrap pointer-events-none"
          >
            <span class="text-white/70">原始 {{ combatState.playerBaseDice }}</span>
            <span class="mx-1 text-white/45">→</span>
            <span class="font-bold text-red-800">最终 {{ displayPlayerDice }}</span>
          </div>
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
              :class="popup.colorClass"
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
          <div v-if="playerArmor > 0 || playerPoisonAmount > 0" class="flex items-center gap-3 mb-1">
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
              <component :is="getEffectIconComponent(eff.type)" class="size-3.5" />
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
        v-if="resolvedCardVisual"
        class="resolved-card-visual"
        :class="resolvedCardVisual.source === 'player' ? 'resolved-card-visual--player' : 'resolved-card-visual--enemy'"
      >
        <div class="resolved-card-visual-inner" :class="resolvedCardVisualInnerClass">
          <DungeonCard :card="resolvedCardVisual.card" disabled />
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
              :card="card"
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
  Bug,
  Droplet,
  Flame,
  Heart,
  Layers,
  Link2,
  Scroll,
  Settings2,
  Shield,
  ShieldCheck,
  Skull,
  Snowflake,
  Sparkles,
  Trash2,
  TriangleAlert,
  Waves,
  X as XIcon,
  Zap,
} from 'lucide-vue-next';
import { applyDamageToEntity, calculateFinalDamage, calculateFinalPoint, consumeColdAfterDealingDamage, triggerSwarmReviveIfNeeded } from '../battle/algorithms';
import { EFFECT_REGISTRY, applyEffect, canPlayCard, getEffectStacks, processOnTurnEnd, processOnTurnStart, reduceEffectStacks, removeEffect } from '../battle/effects';
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
import { toggleFullScreen } from '../fullscreen';
import { useGameStore } from '../gameStore';
import { type CardData, type CombatState, type EffectInstance, type EffectPolarity, type EffectType, type EnemyAIContext, type EntityStats, CardType, CombatPhase, EffectType as ET } from '../types';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';

const props = withDefaults(defineProps<{
  initialPlayerStats: EntityStats;
  enemyName: string;
  playerDeck: CardData[];
  playerRelics?: Record<string, number>;
  testStartAt999?: boolean;
}>(), {
  playerRelics: () => ({}),
  testStartAt999: false,
});

const emit = defineEmits<{
  endCombat: [win: boolean, finalStats: EntityStats];
  openDeck: [];
  openRelics: [];
}>();

// --- Enemy Loading ---
const enemyDef = getEnemyByName(props.enemyName);
const enemyDisplayName = enemyDef?.name ?? props.enemyName;

// --- Portrait URLs ---
const playerPortraitUrl = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/user/%E7%AB%8B%E7%BB%98.png';
const enemyPortraitUrl = computed(() => `https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E9%AD%94%E7%89%A9/${encodeURIComponent(enemyDisplayName)}.png`);
const playerPortraitError = ref(false);
const enemyPortraitError = ref(false);

// --- Dynamic Background ---
const gameStore = useGameStore();
const bgIsLordFallback = ref(false);
const bgImageError = ref(false);

const HF_BASE = 'https://huggingface.co/datasets/Vin05/AI-Gallery/resolve/main/%E5%9C%B0%E7%89%A2/%E8%83%8C%E6%99%AF';
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
const EFFECT_ICON_COMPONENTS: Partial<Record<EffectType, any>> = {
  [ET.BARRIER]: ShieldCheck,
  [ET.ARMOR]: Shield,
  [ET.BIND]: Link2,
  [ET.DEVOUR]: Skull,
  [ET.POISON]: Bug,
  [ET.POISON_AMOUNT]: Droplet,
  [ET.BURN]: Flame,
  [ET.BLEED]: Droplet,
  [ET.VULNERABLE]: TriangleAlert,
  [ET.REGEN]: Heart,
  [ET.IGNITE_AURA]: Sparkles,
  [ET.STUN]: Ban,
  [ET.CHARGE]: Zap,
  [ET.COLD]: Snowflake,
  [ET.NON_LIVING]: Bone,
  [ET.MANA_DRAIN]: Battery,
  [ET.MANA_SPRING]: Waves,
  [ET.SWARM]: Bug,
  [ET.INDOMITABLE]: Heart,
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
const playerPoisonAmountPercent = computed(() => {
  if (playerStats.value.maxHp <= 0) return 0;
  return Math.max(0, Math.min((playerPoisonAmount.value / playerStats.value.maxHp) * 100, 100));
});
const enemyPoisonAmountPercent = computed(() => {
  if (enemyStats.value.maxHp <= 0) return 0;
  return Math.max(0, Math.min((enemyPoisonAmount.value / enemyStats.value.maxHp) * 100, 100));
});
const playerVisibleEffects = computed(() => playerStats.value.effects.filter(
  e => e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT,
));
const enemyVisibleEffects = computed(() => enemyStats.value.effects.filter(
  e => e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT,
));

const cloneCardForBattle = (card: CardData): CardData => ({
  ...card,
  calculation: { ...card.calculation },
  damageLogic: { ...card.damageLogic },
  traits: { ...card.traits },
  cardEffects: card.cardEffects.map((ce) => ({
    ...ce,
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

const SPEED_SETTING_KEY = 'dungeon.combat.speed_up';
const speedMultiplier = computed(() => (battleSpeedUp.value ? 2 : 1));
const combatRootStyle = computed(() => ({ '--combat-speed-multiplier': String(speedMultiplier.value) }));
const floatingNumbers = ref<FloatingNumberEntry[]>([]);
const previewPlayerDice = ref<number | null>(null);
const previewEnemyDice = ref<number | null>(null);
const displayPlayerDice = computed(() => previewPlayerDice.value ?? combatState.value.playerBaseDice);
const displayEnemyDice = computed(() => previewEnemyDice.value ?? combatState.value.enemyBaseDice);
const canPlayerRerollDice = computed(() => (
  playerDiceRerollCharges.value > 0
  && combatState.value.phase === CombatPhase.PLAYER_INPUT
  && !isRolling.value
  && !showClashAnimation.value
  && !endCombatPending.value
));
const playerDiceRerollHint = computed(() => {
  if (playerDiceRerollCharges.value <= 0) return '无可用重掷次数';
  return `可点击重掷（剩余${playerDiceRerollCharges.value}次）`;
});
const playerDicePreviewChanged = computed(() => (
  previewPlayerDice.value !== null && previewPlayerDice.value !== combatState.value.playerBaseDice
));
const enemyDicePreviewChanged = computed(() => (
  previewEnemyDice.value !== null && previewEnemyDice.value !== combatState.value.enemyBaseDice
));
const playerPlayedCardVisual = ref<PlayerPlayedCardVisual | null>(null);
const resolvedCardVisual = ref<ResolvedCardVisual | null>(null);
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
const handCardKeys = new WeakMap<CardData, string>();
const invalidCardShakeKeys = ref<Set<string>>(new Set());

// Default relic modifiers (no relics yet)
const NO_RELIC_MOD = { globalMultiplier: 1, globalAddition: 0 };
const activePlayerRelics = resolveRelicMap(props.playerRelics);
const playerDiceRerollCharges = ref(0);
const relicRuntimeState = reactive<Record<string, Record<string, unknown>>>({});

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

const addArmorForSide = (side: RelicSide, amount: number): number => {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0) return 0;
  const target = getEntityBySide(side);
  const added = applyEffect(target, ET.ARMOR, value, { source: 'relic' }) ? value : 0;
  if (added > 0) {
    pushFloatingNumber(side, added, 'shield', '+');
  }
  return added;
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
  }
  return delta;
};

const healForSide = (
  side: RelicSide,
  amount: number,
  options?: { overflowToArmor?: boolean },
): { healed: number; overflow: number } => {
  const value = Math.max(0, Math.floor(amount));
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
  return applyEffect(target, effectType, value, {
    restrictedTypes: options?.restrictedTypes,
    source: options?.source,
    lockDecayThisTurn: options?.lockDecayThisTurn,
  });
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

const resolvedCardVisualInnerClass = computed(() => {
  if (!resolvedCardVisual.value) return '';
  const sideClass = resolvedCardVisual.value.source === 'player'
    ? 'resolved-card-visual-inner--player'
    : 'resolved-card-visual-inner--enemy';
  const variantClass = resolvedCardVisual.value.variant === 'attack'
    ? 'resolved-card-visual-inner--attack'
    : (resolvedCardVisual.value.variant === 'self'
      ? 'resolved-card-visual-inner--self'
      : 'resolved-card-visual-inner--fade');
  return `${sideClass} ${variantClass}`;
});

const showEnemyIntentCard = computed(() => {
  if (!combatState.value.enemyIntentCard) return false;
  if (enemyIntentConsumedThisTurn.value) return false;
  return !(resolvedCardVisual.value && resolvedCardVisual.value.source === 'enemy');
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

const consumeChargeOnRoll = (stats: EntityStats, label: string, rolled: number) => {
  const chargeStacks = getEffectStacks(stats, ET.CHARGE);
  if (chargeStacks <= 0) return rolled;
  removeEffect(stats, ET.CHARGE);
  const boosted = Math.max(0, Math.floor(rolled + chargeStacks));
  log(`<span class="text-cyan-300">${label}[蓄力] +${chargeStacks}，原始骰子 ${rolled} → ${boosted}</span>`);
  return boosted;
};

const clearDicePreview = () => {
  previewPlayerDice.value = null;
  previewEnemyDice.value = null;
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
  resolvedCardVisual.value = null;
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
  resolvedCardVisual.value = { id, source, card, variant };

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
  if (resolvedCardVisual.value?.id === id) {
    resolvedCardVisual.value = null;
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

const getCardPreviewPoint = (source: 'player' | 'enemy', card: CardData, baseDice: number) => {
  return getCardFinalPoint(source, card, baseDice, true);
};

const handlePlayerCardHoverStart = (card: CardData) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  previewPlayerDice.value = getCardPreviewPoint('player', card, combatState.value.playerBaseDice);
};

const handlePlayerCardHoverEnd = () => {
  previewPlayerDice.value = null;
};

const handlePlayerCardTouchStart = (card: CardData) => {
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (hoverPreviewTimer) clearTimeout(hoverPreviewTimer);
  hoverPreviewTimer = setTimeout(() => {
    previewPlayerDice.value = getCardPreviewPoint('player', card, combatState.value.playerBaseDice);
  }, 260);
};

const handlePlayerCardTouchEnd = () => {
  if (hoverPreviewTimer) {
    clearTimeout(hoverPreviewTimer);
    hoverPreviewTimer = null;
  }
  previewPlayerDice.value = null;
};

const rollDiceInRange = (min: number, max: number) => {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (high <= low) return low;
  return Math.floor(Math.random() * (high - low + 1)) + low;
};

const handlePlayerDiceClick = () => {
  if (!canPlayerRerollDice.value) return;

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

  if (rerolled === null) return;
  const before = combatState.value.playerBaseDice;
  const after = consumeChargeOnRoll(playerStats.value, '我方', Math.max(0, Math.floor(rerolled)));
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

const getEnemyIntentFinalPoint = () => {
  const card = combatState.value.enemyIntentCard;
  if (!card) return null;
  return getCardPreviewPoint('enemy', card, combatState.value.enemyBaseDice);
};

const showEnemyDicePreview = () => {
  if (!canPreviewEnemyDice()) return;
  const preview = getEnemyIntentFinalPoint();
  if (preview === null) return;
  previewEnemyDice.value = preview;
};

const hideEnemyDicePreview = () => {
  if (showClashAnimation.value) return;
  previewEnemyDice.value = null;
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
  // Extend popup lifetime by ~50% for better readability.
  const duration = scaleDuration(1350);
  floatingNumbers.value.push({
    id,
    side,
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
});
onUnmounted(() => {
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

const drawCards = (count: number, currentDeck: CardData[], currentDiscard: CardData[]) => {
  let deck = [...currentDeck];
  let discard = [...currentDiscard];
  const drawn: CardData[] = [];

  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = [...discard].sort(() => Math.random() - 0.5);
      discard = [];
      log('<span class="text-yellow-500">弃牌堆已洗入牌库。</span>');
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

  const check = canPlayCard(enemyStats.value, selectedCard, combatState.value.enemyBaseDice);
  if (!check.allowed) {
    log(`<span class="text-gray-400">敌方无法出牌：${check.reason ?? '本回合跳过。'}</span>`);
    return PASS_CARD;
  }
  return selectedCard;
}

// --- Phase Management ---

const startTurn = () => {
  if (endCombatPending.value) return;
  clearDicePreview();
  stopAllCardAnimations();
  combatState.value.phase = CombatPhase.DRAW_PHASE;
  combatState.value.playerSelectedCard = null;
  combatState.value.enemyIntentCard = null;
  enemyIntentConsumedThisTurn.value = false;
  isRolling.value = true;
  shatteringTarget.value = null;
  showClashAnimation.value = false;
  triggerPlayerRelicLifecycleHooks('onTurnStart');

  setTimeout(() => {
    if (endCombatPending.value) return;
    const pRawRoll = Math.floor(Math.random() * (playerStats.value.maxDice - playerStats.value.minDice + 1)) + playerStats.value.minDice;
    const eRawRoll = Math.floor(Math.random() * (enemyStats.value.maxDice - enemyStats.value.minDice + 1)) + enemyStats.value.minDice;
    const pRoll = consumeChargeOnRoll(playerStats.value, '我方', pRawRoll);
    const eRoll = consumeChargeOnRoll(enemyStats.value, '敌方', eRawRoll);

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
      // Process turn-start effects (poison, burn, mana spring, etc.)
      if (combatState.value.turn > 1) {
        for (const [side, label, stats] of [['player', '我方', playerStats], ['enemy', '敌方', enemyStats]] as const) {
          const targetSide = side as RelicSide;
          const opponentSide: RelicSide = side === 'player' ? 'enemy' : 'player';
          const result = processOnTurnStart(stats.value);
          let turnStartLogs = [...result.logs];
          let burnDamageTaken = 0;
          let shownTrueDamage = 0;
          let burnIsTrueDamage = false;

          for (const pending of result.applyToOpponent) {
            applyStatusEffectWithRelics(opponentSide, pending.type, pending.stacks, { source: 'effect:ignite_aura' });
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
                    pushFloatingNumber(side, burnResult.damage, 'true', '-');
                    burnDamageTaken = burnResult.damage;
                    shownTrueDamage += burnResult.damage;
                    burnIsTrueDamage = true;
                    result.trueDamage += burnResult.damage;
                    turnStartLogs.push(`[燃烧] 受到 ${burnResult.damage} 点真实伤害。`);
                  } else if (getEffectStacks(stats.value, ET.BARRIER) > 0) {
                  reduceEffectStacks(stats.value, ET.BARRIER, 1);
                  turnStartLogs.push(`[结界] 抵挡了 ${burnResult.damage} 点燃烧伤害。`);
                } else {
                  burnDamageTaken = burnResult.damage;
                  result.hpChange -= burnResult.damage;
                  pushFloatingNumber(side, burnResult.damage, 'magic', '-');
                  turnStartLogs.push(`[燃烧] 损失 ${burnResult.damage} 点生命。`);
                }
              } else {
                turnStartLogs.push('[燃烧] 伤害为 0。');
              }
            }
          }

          if (result.hpChange !== 0) {
            const hpBefore = stats.value.hp;
            stats.value.hp = Math.max(0, Math.min(stats.value.maxHp, stats.value.hp + result.hpChange));
            const hpDelta = stats.value.hp - hpBefore;
            if (hpDelta > 0) {
              pushFloatingNumber(side, hpDelta, 'heal', '+');
            }
          }
          if (result.mpChange !== 0) {
            const mpBefore = stats.value.mp;
            stats.value.mp = Math.max(0, stats.value.mp + result.mpChange);
            const mpDelta = stats.value.mp - mpBefore;
            if (mpDelta > 0) {
              pushFloatingNumber(side, mpDelta, 'mana', '+');
            }
          }
          if (result.trueDamage > 0) {
            stats.value.hp = Math.max(0, stats.value.hp - result.trueDamage);
            const pendingTrueDamage = Math.max(0, result.trueDamage - shownTrueDamage);
            if (pendingTrueDamage > 0) {
              pushFloatingNumber(side, pendingTrueDamage, 'true', '-');
            }
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

  const check = canPlayCard(playerStats.value, card, combatState.value.playerBaseDice);
  if (!check.allowed) {
    triggerInvalidCardShake(card);
    log(`<span class="text-red-400">${check.reason ?? '当前无法使用该卡牌。'}</span>`);
    return;
  }

  if (card.type === CardType.MAGIC) {
    playerStats.value.mp -= card.manaCost;
  }

  // 出牌后立即离开手牌（卡牌“消失”），并进入弃牌堆
  const [played] = combatState.value.playerHand.splice(handIdx, 1);
  if (!played) return;
  clearDicePreview();
  showPlayerPlayedCard(played);
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
const isClashable = (t1: CardType, t2: CardType): boolean => {
  if (t1 === CardType.PHYSICAL && t2 === CardType.PHYSICAL) return true;
  if (t1 === CardType.MAGIC && t2 === CardType.MAGIC) return true;
  if (t1 === CardType.DODGE && (t2 === CardType.PHYSICAL || t2 === CardType.MAGIC)) return true;
  if (t2 === CardType.DODGE && (t1 === CardType.PHYSICAL || t1 === CardType.MAGIC)) return true;
  return false;
};

// Resolution
const resolveCombat = async (pCard: CardData, eCard: CardData, pDice: number, eDice: number) => {
  if (endCombatPending.value) return;
  let resolvedEnemyCard = eCard;
  if (resolvedEnemyCard.type === CardType.MAGIC && resolvedEnemyCard.id !== PASS_CARD.id) {
    if (enemyStats.value.mp >= resolvedEnemyCard.manaCost) {
      enemyStats.value.mp -= resolvedEnemyCard.manaCost;
    } else {
      resolvedEnemyCard = PASS_CARD;
      log('<span class="text-gray-400">敌方魔力不足，本回合视为跳过。</span>');
    }
  }

  const shouldClash = isClashable(pCard.type, resolvedEnemyCard.type);
  const playerSkippedTurn = pCard.id === PASS_CARD.id;
  const enemySkippedTurn = resolvedEnemyCard.id === PASS_CARD.id;
  const pClashPoint = getCardPreviewPoint('player', pCard, pDice);
  const eClashPoint = getCardPreviewPoint('enemy', resolvedEnemyCard, eDice);

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

    if (pCard.type === resolvedEnemyCard.type) {
      if (pClashPoint > eClashPoint) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '拼点胜利！';
      } else if (eClashPoint > pClashPoint) {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '拼点失败！';
      } else {
        pSuccess = false;
        eSuccess = false;
        clashWinner = 'tie';
        resultMsg = '势均力敌！';
      }
    } else if (pCard.type === CardType.DODGE) {
      if (eClashPoint > pClashPoint) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '闪避成功！';
      } else {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '闪避失败！';
      }
    } else if (resolvedEnemyCard.type === CardType.DODGE) {
      if (pClashPoint > eClashPoint) {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '攻击被闪避！';
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
    if (clashWinner === 'enemy') {
      changeRerollCharges('player', 1);
      log('<span class="text-amber-300">拼点失败：重掷次数 +1</span>');
    }

    if (clashWinner === 'player') {
      clearBurnForSide('player', '拼点胜利。');
    } else if (clashWinner === 'enemy') {
      clearBurnForSide('enemy', '拼点胜利。');
    }

    await wait(650);
    showClashAnimation.value = false;
    clearDicePreview();
  } else {
    await wait(500);
    log('<span class="text-gray-400">双方卡牌互不干扰，直接结算。</span>');
    pSuccess = true;
    eSuccess = true;
  }

  // Execution Phase - use algorithms.ts for proper damage calculation
  const executeCard = async (source: 'player' | 'enemy', card: CardData, baseDice: number) => {
    if (endCombatPending.value) return;
    const attacker = source === 'player' ? playerStats.value : enemyStats.value;
    const defender = source === 'player' ? enemyStats.value : playerStats.value;
    const label = source === 'player' ? '我方' : '敌方';
    const defenderSide = source === 'player' ? 'enemy' : 'player';

    if (source === 'enemy' && card.id !== PASS_CARD.id) {
      enemyIntentConsumedThisTurn.value = true;
    }

    if (source === 'player') {
      clearPlayerPlayedCard();
    }
    await playResolvedCardAnimation(source, card);
    if (endCombatPending.value) return;

    // Calculate final point for this card
    const finalPoint = getCardFinalPoint(source, card, baseDice);

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

    const applyCardEffects = () => {
      let hasEffect = false;

      for (const ce of card.cardEffects) {
        const targetKey = ce.target ?? 'self';
        const targetEntity = targetKey === 'self' ? attacker : defender;
        const targetSide = resolveTargetSide(source, targetKey);

        if (ce.kind === 'heal') {
          const healAmount = ce.valueMode === 'point_scale'
            ? Math.floor(finalPoint * (ce.scale ?? 1))
            : Math.floor(ce.fixedValue ?? 0);
          const beforeHp = targetEntity.hp;
          targetEntity.hp = Math.min(targetEntity.maxHp, targetEntity.hp + healAmount);
          const actualHeal = targetEntity.hp - beforeHp;
          if (actualHeal > 0) {
            pushFloatingNumber(targetSide, actualHeal, 'heal', '+');
          }
          log(`<span class="text-green-400">${label}【${card.name}】回复了 ${healAmount} 点生命</span>`);
          hasEffect = true;
        } else if (ce.kind === 'apply_buff') {
          const stacks = ce.valueMode === 'point_scale'
            ? Math.floor(finalPoint * (ce.scale ?? 1))
            : Math.floor(ce.fixedValue ?? 1);
          applyStatusEffectWithRelics(targetSide, ce.effectType!, stacks, {
            restrictedTypes: ce.restrictedTypes,
            source: card.id,
            lockDecayThisTurn: ce.effectType === ET.BIND,
          });
          if (ce.effectType === ET.ARMOR) {
            pushFloatingNumber(targetSide, stacks, 'shield', '+');
          }
          log(`<span class="text-yellow-400">${label}【${card.name}】获得了 ${stacks} 层${EFFECT_REGISTRY[ce.effectType!]?.name ?? ce.effectType}</span>`);
          hasEffect = true;
        } else if (ce.kind === 'restore_mana') {
          const restoreAmount = ce.valueMode === 'point_scale'
            ? Math.floor(finalPoint * (ce.scale ?? 1))
            : Math.floor(ce.fixedValue ?? 0);
          const beforeMp = targetEntity.mp;
          targetEntity.mp = Math.max(0, targetEntity.mp + restoreAmount);
          const actualRestore = targetEntity.mp - beforeMp;
          if (actualRestore > 0) {
            pushFloatingNumber(targetSide, actualRestore, 'mana', '+');
          }
          log(`<span class="text-blue-400">${label}【${card.name}】回复了 ${restoreAmount} 点魔力</span>`);
          hasEffect = true;
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
        return;
      }

      // Process card effects (heal, apply_buff, restore_mana, cleanse)
      syncCurrentPointForUi();
      const hasEffect = applyCardEffects();
      if (!hasEffect) {
        // Fallback for special function cards (e.g. MP recovery)
        if (card.id === 'c5') {
          attacker.mp += 5;
          pushFloatingNumber(source, 5, 'mana', '+');
        }
        log(`${label}使用了【${card.name}】`);
      }
    } else if (card.type !== CardType.DODGE) {
      const burnStacksOnDefender = getEffectStacks(defender, ET.BURN);
      const baseHitCount = Math.max(1, Math.floor(card.hitCount ?? 1));
      const extraHitCount = card.id === 'enemy_moth_swarm_burst'
        ? Math.max(0, getEffectStacks(attacker, ET.SWARM))
        : 0;
      const totalHitCount = baseHitCount + extraHitCount;

      if (totalHitCount > 1) {
        log(`<span class="text-violet-300">${label}【${card.name}】进行 ${totalHitCount} 段攻击</span>`);
      }

      for (let hit = 0; hit < totalHitCount; hit++) {
        // Attack card: calculate damage through the full pipeline
        let cardForCalculation = card;
        const customDamage =
          card.id === 'burn_scorch_wind'
            ? Math.floor(finalPoint * 0.5) + burnStacksOnDefender
            : card.id === 'burn_detonation'
              ? Math.floor(burnStacksOnDefender)
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
        const { actualDamage, logs: applyLogs } = applyDamageToEntity(defender, damage, isTrueDamage);
        const hitPrefix = totalHitCount > 1 ? `第${hit + 1}段` : '';
        const damageLogColorClass = isTrueDamage ? 'text-zinc-500' : 'text-red-400';
        log(`${label}【${card.name}】${hitPrefix}点数${finalPoint}，造成 <span class="${damageLogColorClass} font-bold">${actualDamage}</span> 点伤害`);
        if (actualDamage > 0) {
          const damageKind: FloatingNumberKind = isTrueDamage
            ? 'true'
            : (card.type === CardType.MAGIC ? 'magic' : 'physical');
          pushFloatingNumber(defenderSide, actualDamage, damageKind, '-');
        }

        const coldLogs = consumeColdAfterDealingDamage(attacker, actualDamage);
        for (const coldLog of coldLogs) {
          log(`<span class="text-sky-300 text-[9px]">${label}: ${coldLog}</span>`);
        }

        for (const dl of [...dmgLogs, ...applyLogs]) {
          log(`<span class="text-gray-500 text-[9px]">${dl}</span>`);
        }
        triggerPlayerRelicHitHooks(
          source,
          defenderSide,
          card,
          finalPoint,
          hit + 1,
          totalHitCount,
          damage,
          actualDamage,
        );
        if (defender.hp <= 0) break;
      }

      // 攻击牌结算后同样触发附带效果（燃烧、易伤等）
      applyCardEffects();
    }
  };

  interface ActionEntry {
    source: 'player' | 'enemy';
    card: CardData;
    type: CardType;
    baseDice: number;
  }

  const queue: ActionEntry[] = [];
  let deferredEnemyAction: ActionEntry | null = null;
  if (pSuccess) queue.push({ source: 'player', card: pCard, type: pCard.type, baseDice: pDice });
  if (eSuccess) {
    const enemyAction: ActionEntry = { source: 'enemy', card: resolvedEnemyCard, type: resolvedEnemyCard.type, baseDice: eDice };
    if (pCard.traits.combo) {
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

  for (const action of queue) {
    if (endCombatPending.value) break;
    await executeCard(action.source, action.card, action.baseDice);
    if (endCombatPending.value) break;
    await wait(630);
  }
  stopAllCardAnimations();
  if (endCombatPending.value) return;

  // 连击：本次打出后，若带 draw 则补抽 1 张；并允许继续从剩余手牌出牌
  if (pCard.traits.combo) {
    if (pCard.traits.draw) {
      const { drawn, newDeck, newDiscard } = drawCards(1, combatState.value.playerDeck, combatState.value.discardPile);
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      combatState.value.playerHand = [...combatState.value.playerHand, ...drawn];
    }

    if (combatState.value.playerHand.length > 0 && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
      combatState.value.playerSelectedCard = null;
      combatState.value.phase = CombatPhase.PLAYER_INPUT;
      log('<span class="text-dungeon-gold/80">连击触发：可继续出牌</span>');
      return;
    }

    // 连击无法继续时，再补结算一次敌方行动
    if (deferredEnemyAction && playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
      if (endCombatPending.value) return;
      await executeCard(deferredEnemyAction.source, deferredEnemyAction.card, deferredEnemyAction.baseDice);
      if (endCombatPending.value) return;
      await wait(630);
    }
  }

  if (playerStats.value.hp <= 0 || enemyStats.value.hp <= 0) return;

  // End-of-turn effect processing (armor halving, stun clear, etc.)
  const pEndLogs = processOnTurnEnd(playerStats.value);
  const eEndLogs = processOnTurnEnd(enemyStats.value);
  for (const l of [...pEndLogs, ...eEndLogs]) {
    log(`<span class="text-gray-500 text-[9px]">${l}</span>`);
  }
  triggerPlayerRelicLifecycleHooks('onTurnEnd');

  // Cleanup
  combatState.value.discardPile = [...combatState.value.discardPile, ...combatState.value.playerHand];
  combatState.value.playerHand = [];
  combatState.value.turn += 1;
  combatState.value.phase = CombatPhase.TURN_START;
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
  emit('endCombat', win, playerStats.value);
};

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
