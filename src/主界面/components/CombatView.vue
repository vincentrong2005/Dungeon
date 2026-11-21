<template>
  <div
    ref="combatRootEl"
    data-card-tooltip-boundary
    class="combat-root w-full h-full bg-[#1a1a22] text-dungeon-paper font-ui relative overflow-hidden select-none"
    data-sfx-scope="battle"
    :class="[screenShake ? 'animate-shake' : '', impactShake ? 'animate-impact-shake' : '', heavyDamageShake ? 'animate-heavy-impact-shake' : '', { 'combat-root--scene-effects': sceneEffects.length > 0 }]"
    :style="combatRootStyle"
    :aria-busy="!battleResourcesReady"
    @click.capture="blockWhileLoading"
    @keydown.capture="blockWhileLoading"
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
        type="button"
        class="combat-skin-button relative size-16 shrink-0 border-0 bg-transparent p-0 transition-[transform,filter] duration-200"
        :class="{ 'combat-skin-button--active': settingsOpen }"
        aria-label="设置"
        title="设置"
        @click="settingsOpen = !settingsOpen"
      >
        <MainButtonSkin skin="settings" />
      </button>
      <button
        type="button"
        class="combat-skin-button relative size-16 shrink-0 border-0 bg-transparent p-0 transition-[transform,filter] duration-200"
        aria-label="卡组"
        title="卡组"
        @click="emit('openDeck')"
      >
        <MainButtonSkin skin="deck" />
      </button>
      <button
        type="button"
        class="combat-skin-button relative size-16 shrink-0 border-0 bg-transparent p-0 transition-[transform,filter] duration-200"
        aria-label="背包"
        title="背包"
        @click="emit('openRelics')"
      >
        <MainButtonSkin skin="inventory" />
      </button>
      <button
        type="button"
        class="combat-skin-button relative size-16 shrink-0 border-0 bg-transparent p-0 transition-[transform,filter] duration-200"
        aria-label="信息：词条与状态"
        title="信息：词条与状态"
        @click="emit('openGlossary')"
      >
        <MainButtonSkin skin="help" />
      </button>
      <div
        v-if="settingsOpen"
        class="combat-settings-panel"
      >
        <h3 class="combat-settings-title">战斗设置</h3>
        <div>
          <label class="combat-settings-speed" data-ui-sound="none">
            <span>战斗加速 <span class="combat-settings-speed-value">2x</span></span>
            <input v-model="battleSpeedUp" type="checkbox" role="switch" aria-label="战斗加速" />
          </label>
          <SoundSettings compact />
          <button
            class="combat-settings-fullscreen"
            @click="toggleFullScreen"
          >
            <Maximize2 class="size-3.5" aria-hidden="true" />
            切换全屏
          </button>
        </div>
      </div>
    </div>

    <!-- Top Center: Turn Counter -->
    <div class="combat-turn-anchor absolute z-40 pointer-events-none">
      <div class="flex flex-col items-center">
        <span class="combat-turn-label">回合</span>
        <span class="combat-turn-value">{{ combatState.turn }}</span>
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
          class="combat-dice-preview mt-2 w-80 space-y-1"
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
    <div v-if="sceneEffects.length" class="combat-scene-effects" aria-label="场景效果">
      <button
        v-for="effect in sceneEffects" :key="`${effect.type}-${sceneEffectPulse[effect.type] ?? 0}`" type="button"
        class="combat-scene-effect" :class="{
          'combat-scene-effect--oath': effect.type !== ET.SELF_CHOSEN_PAIN && effect.type !== ET.CORRIDOR_MEMORY,
          'combat-scene-effect--resonant': (effect.type === ET.CORRIDOR_MEMORY && effect.stacks >= 20)
            || (effect.type === ET.SELF_CHOSEN_PAIN && ((painScene?.nextRollBonus.player ?? 0) + (painScene?.nextRollBonus.enemy ?? 0)) > 0),
          'combat-scene-effect--triggered': (sceneEffectPulse[effect.type] ?? 0) > 0,
        }"
        :aria-label="`${getEffectName(effect.type)}：${getSceneEffectDescription(effect)}`"
        @mouseenter="showEffectTooltip($event, effect)" @mouseleave="hideEffectTooltip"
        @focus="showEffectTooltip($event, effect)" @blur="hideEffectTooltip"
        @touchstart.passive="handleEffectTouchStart($event, effect)"
        @touchend="handleEffectTouchEnd" @touchcancel="handleEffectTouchEnd">
        <i :class="getEffectFontAwesomeClass(effect.type)" aria-hidden="true"></i>
        <span v-if="effect.type === ET.CORRIDOR_MEMORY" class="combat-scene-effect__count">{{ effect.stacks }}%</span>
        <span v-else-if="effect.type === ET.SELF_CHOSEN_PAIN" class="combat-scene-effect__count">{{ painScene?.nextRollBonus.player }}/{{ painScene?.nextRollBonus.enemy }}</span>
      </button>
    </div>
    <div v-if="!battleResourcesReady" class="pain-loading-overlay" data-battle-loading role="status" aria-label="战斗资源加载中">
      <i v-if="!battleResourceLoadError" class="fa-solid fa-spinner pain-loading-spinner" aria-hidden="true"></i>
      <button v-else type="button" class="pain-retry-button" aria-label="重新加载战斗资源" title="重新加载战斗资源" @click="prepareBattleResources">
        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
      </button>
    </div>
    <img v-if="isPainBattle && painPortraitsReady" :src="painPhasePortraits[2]" class="hidden" alt="" />
    <div v-if="pendingPainOaths.length" class="pain-oath-overlay" role="dialog" aria-modal="true" aria-label="请你选择">
      <div class="pain-oath-dialog" @keydown.tab.prevent="cyclePainOathFocus($event)">
        <div class="pain-oath-dialog__title">请你选择</div>
        <div class="pain-oath-options">
          <button v-for="type in pendingPainOaths" :key="type" type="button" class="pain-oath-option" @click="confirmPainOath(type)">
            <DungeonCard :card="getPainOathCard(type)" :current-turn="combatState.turn" disabled />
          </button>
        </div>
      </div>
    </div>
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
            :class="visibleEnemyIntentCards.length > 1 ? 'gap-14' : 'gap-4'"
          >
            <div
              v-for="entry in visibleEnemyIntentCards"
              :key="`enemy-intent-${entry.slot}`"
              class="relative"
              :class="visibleEnemyIntentCards.length > 1 ? (entry.slot === 1 ? '-translate-x-3' : 'translate-x-3') : ''"
            >
            <div
              class="scale-[1.4] origin-top-left"
              :class="[
                entry.slot === 1 ? 'rotate-[-3deg]' : 'rotate-[3deg]',
                isCardShaking(entry.card) ? 'invalid-card-shake' : '',
              ]"
            >
              <DungeonCard
                :card="entry.card"
                :mask-level="enemyIntentMaskLevel"
                :current-turn="combatState.turn"
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
            data-feedback-target="enemy"
            :class="[isLeviathanBattle ? 'leviathan-body-target pointer-events-auto' : '', leviathanBodyTargetClass]"
            @click="selectLeviathanTarget('body')"
          >
            <!-- Placeholder icon (shown when portrait fails to load) -->
            <Skull v-if="enemyPortraitError" class="w-48 h-48 text-red-900/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <!-- Enemy portrait image -->
            <img
              v-else-if="battleResourcesReady"
              :src="enemyPortraitUrl"
              class="enemy-portrait-img w-full h-full object-contain object-bottom"
              :class="{
                'enemy-portrait-img--intangible-active': isHolyWaterJellyfishIntangibleActive,
                'enemy-portrait-img--pain-phase-transition': painPortraitTransitioning,
              }"
              alt="enemy portrait"
              @error="onEnemyPortraitError"
            />
          </div>
          <TransitionGroup
            v-if="isLeviathanBattle"
            tag="div"
            name="leviathan-summon"
            class="leviathan-summons-layer pointer-events-auto"
          >
            <div
              v-for="(summon, summonIndex) in leviathanSummons"
              :key="summon.id"
              class="leviathan-summon-node"
              :data-feedback-target="`summon:${summon.id}`"
              :class="[
                getLeviathanSummonPositionClass(summonIndex),
                leviathanSelectedTargetId === summon.id ? 'leviathan-summon-node--selected' : '',
              ]"
              role="button"
              tabindex="0"
              @click.stop="selectLeviathanTarget(summon.id)"
              @keydown.enter.prevent="selectLeviathanTarget(summon.id)"
              @keydown.space.prevent="selectLeviathanTarget(summon.id)"
            >
              <div
                v-if="summon.intentCard && summon.intentCard.id !== PASS_CARD.id"
                class="leviathan-summon-card"
                :data-leviathan-summon-card-id="summon.id"
              >
                <DungeonCard
                  :card="summon.intentCard"
                  :mask-level="enemyIntentMaskLevel"
                  :current-turn="combatState.turn"
                  is-enemy
                  disabled
                />
              </div>
              <div class="leviathan-summon-dice">
                <DungeonDice
                  :value="summon.baseDice"
                  :rolling="false"
                  :rolling-min="summon.stats.minDice"
                  :rolling-max="summon.stats.maxDice"
                  color="red"
                  size="sm"
                />
              </div>
              <div class="leviathan-summon-portrait">
                <Skull v-if="summon.portraitError" class="size-16 text-red-900/35" />
                <img
                  v-else
                  :src="summon.portraitUrl"
                  class="size-full object-contain object-bottom"
                  :alt="summon.name"
                  @error="summon.portraitError = true"
                />
              </div>
              <div class="leviathan-summon-float-layer pointer-events-none">
                <div
                  v-for="popup in floatingNumbersFor('enemy', summon.id)"
                  :key="popup.id"
                  class="combat-float-number absolute text-lg font-extrabold tracking-wide"
                  :class="[popup.colorClass, popup.kind === 'heal' ? 'combat-float-number--heal' : '', popup.damageBeforeLimitText ? 'combat-float-number--limited' : '', popup.heavyDamage ? 'combat-float-number--heavy' : '']"
                  :style="{
                    left: `calc(50% + ${popup.leftOffset}px)`,
                    top: `${popup.topOffset}px`,
                    animationDuration: `${popup.duration}ms`,
                  }"
                >
                  <template v-if="popup.damageBeforeLimitText">
                    <span class="combat-float-number--limited-original">{{ popup.damageBeforeLimitText }}</span>
                    <span class="combat-float-number--limited-actual">{{ popup.text }}</span>
                  </template>
                  <template v-else>{{ popup.text }}</template>
                </div>
              </div>
              <div class="leviathan-summon-status">
                <div class="leviathan-summon-status-row">
                  <span class="leviathan-summon-name">{{ summon.name }}</span>
                  <span class="leviathan-summon-hp">{{ summon.stats.hp }}/{{ summon.stats.maxHp }}</span>
                </div>
                <div class="leviathan-summon-hpbar">
                  <CombatHealthBar
                    compact
                    side="enemy"
                    :hp="summon.stats.hp"
                    :max-hp="summon.stats.maxHp"
                    :armor="getLeviathanSummonArmor(summon)"
                    :swarm-hp="getSwarmRecoverableHp(summon.stats)"
                  />
                </div>
                <div class="leviathan-summon-meta">
                  <span>MP {{ summon.stats.mp }}</span>
                  <span v-if="getLeviathanSummonArmor(summon) > 0">护甲 {{ getLeviathanSummonArmor(summon) }}</span>
                  <span>{{ summon.stats.minDice }}~{{ summon.stats.maxDice }}</span>
                </div>
                <div
                  v-if="getLeviathanSummonVisibleEffects(summon).length > 0"
                  class="leviathan-summon-effects"
                >
                  <button
                    v-for="eff in getLeviathanSummonVisibleEffects(summon)"
                    :key="`${summon.id}-${eff.type}-${eff.temporary ? 'temporary' : 'normal'}`"
                    type="button"
                    class="effect-icon-btn leviathan-summon-effect"
                    :class="effectIconBoxClass(eff.polarity)"
                    :aria-label="`${getEffectInstanceName(eff)}: ${getEffectDescription(eff.type)}`"
                    @click.stop
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
                      :class="[getEffectFontAwesomeClass(eff.type), 'text-[11px] leading-none']"
                      :style="getEffectFontAwesomeStyle(eff.type)"
                      aria-hidden="true"
                    ></i>
                    <component
                      :is="getEffectIconComponent(eff.type)"
                      v-else
                      class="size-3"
                    />
                    <span v-if="eff.stacks > 1" class="effect-stack-badge">{{ eff.stacks }}</span>
                  </button>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- Enemy Status Bar -->
        <div class="combat-status-bar combat-status-bar--enemy relative mb-6 overflow-visible w-full max-w-[22rem] origin-bottom p-3 z-20 pointer-events-auto">
          <span class="combat-status-bar__border" aria-hidden="true"></span>
          <div class="combat-status-name">
            <span>{{ enemyDisplayName }}</span>
          </div>
          <div class="pointer-events-none absolute inset-0 z-30 overflow-visible">
            <div
              v-for="popup in floatingNumbersFor('enemy', 'body')"
              :key="popup.id"
              class="combat-float-number absolute text-xl font-extrabold tracking-wide"
              :class="[popup.colorClass, popup.kind === 'heal' ? 'combat-float-number--heal' : '', popup.damageBeforeLimitText ? 'combat-float-number--limited' : '', popup.heavyDamage ? 'combat-float-number--heavy' : '']"
              :style="{
                left: `calc(50% + ${popup.leftOffset}px)`,
                top: `${popup.topOffset}px`,
                animationDuration: `${popup.duration}ms`,
              }"
            >
              <template v-if="popup.damageBeforeLimitText">
                <span class="combat-float-number--limited-original">{{ popup.damageBeforeLimitText }}</span>
                <span class="combat-float-number--limited-actual">{{ popup.text }}</span>
              </template>
              <template v-else>{{ popup.text }}</template>
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
          <CombatHealthBar
            side="enemy"
            :hp="enemyStats.hp"
            :max-hp="enemyStats.maxHp"
            :armor="enemyArmor"
            :swarm-hp="enemySwarmHp"
            :poison-amount="enemyPoisonAmount"
            :impact-token="healthBarImpactTokens.enemy"
            :value-text="`${formatCombatHp(enemyStats.hp, infiniteHpDisplay.enemy.hp)}/${formatCombatHp(enemyStats.maxHp, infiniteHpDisplay.enemy.maxHp)}`"
          />
          <!-- MP Bar -->
          <div class="flex items-center gap-2 mb-1.5">
            <span class="combat-stat-label combat-stat-label--mp w-6">MP</span>
            <div class="combat-mp-track flex-1">
              <div
                class="combat-mp-fill h-full transition-all duration-500"
                :style="withTransition({ width: `${Math.min((enemyStats.mp / 20) * 100, 100)}%` }, 500)"
              ></div>
            </div>
            <span class="combat-stat-value w-14 text-right">{{ enemyStats.mp }}</span>
          </div>
          <!-- Dice Range -->
          <div class="flex items-center gap-2 mb-1">
            <img class="combat-dice-icon" :src="COMBAT_DICE_ICON_URL" alt="骰子" />
            <span class="combat-stat-value combat-stat-value--enemy-dice">{{ effectiveEnemyMinDice }} ~ {{ effectiveEnemyMaxDice }}</span>
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
              :key="`enemy-${eff.type}-${eff.temporary ? 'temporary' : 'normal'}`"
              type="button"
              data-effect-side="enemy"
              class="effect-icon-btn"
              :class="[effectIconBoxClass(eff.polarity), isBlockedEffectAnimating('enemy', eff.type) ? 'effect-blocked-shake' : '']"
              :aria-label="`${getEffectInstanceName(eff)}: ${getEffectDescription(eff.type, 'enemy')}`"
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
              <span v-if="eff.stacks > 1" :key="`enemy-${eff.type}-${eff.temporary ? 'temporary' : 'normal'}-stacks-${eff.stacks}`" class="effect-stack-badge">{{ eff.stacks }}</span>
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
            class="combat-reroll-chip absolute left-1/2 top-[8.9rem] -translate-x-1/2 whitespace-nowrap"
            :class="{ 'is-dim': !canPlayerRerollDice }"
          >
            重掷次数：{{ playerDiceRerollCharges }}
          </div>
        </div>

        <!-- Player Portrait -->
        <div class="relative w-full h-full">
          <div class="player-portrait-scale absolute left-1/2 w-64 h-80 flex items-end justify-center overflow-hidden" data-feedback-target="player">
            <!-- Placeholder glow (shown when portrait fails to load) -->
            <div v-if="playerPortraitError" class="size-20 bg-dungeon-gold/15 blur-2xl rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <!-- Player portrait image -->
            <img
              v-else-if="battleResourcesReady"
              :src="playerPortraitUrl"
              class="w-full h-full object-contain object-bottom"
              alt="player portrait"
              @error="onPlayerPortraitError"
            />
          </div>
        </div>

        <!-- Player Status Bar -->
        <div class="combat-status-bar combat-status-bar--player relative overflow-visible mt-2 w-60 origin-bottom p-2.5 z-10 pointer-events-auto">
          <span class="combat-status-bar__border" aria-hidden="true"></span>
          <div class="combat-status-name combat-status-name--player">
              <span>冒险者</span>
          </div>
          <div class="pointer-events-none absolute inset-0 z-30 overflow-visible">
            <div
              v-for="popup in floatingNumbersFor('player')"
              :key="popup.id"
              class="combat-float-number absolute text-xl font-extrabold tracking-wide"
              :class="[popup.colorClass, popup.kind === 'heal' ? 'combat-float-number--heal' : '', popup.damageBeforeLimitText ? 'combat-float-number--limited' : '', popup.heavyDamage ? 'combat-float-number--heavy' : '']"
              :style="{
                left: `calc(50% + ${popup.leftOffset}px)`,
                top: `${popup.topOffset}px`,
                animationDuration: `${popup.duration}ms`,
              }"
            >
              <template v-if="popup.damageBeforeLimitText">
                <span class="combat-float-number--limited-original">{{ popup.damageBeforeLimitText }}</span>
                <span class="combat-float-number--limited-actual">{{ popup.text }}</span>
              </template>
              <template v-else>{{ popup.text }}</template>
            </div>
          </div>
          <!-- Armor Shield -->
          <TransitionGroup
            tag="div"
            name="status-effect"
            class="status-value-list flex flex-wrap items-center gap-x-3 gap-y-1 mb-1"
          >
            <button
              key="player-gold"
              type="button"
              class="status-effect-value-btn flex items-center gap-1"
              :aria-label="`金币: ${playerGoldDisplay}. ${GOLD_TOOLTIP.description}`"
              @mouseenter="showEffectTooltip($event, GOLD_TOOLTIP_SOURCE(playerGoldDisplay), 'right')"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, GOLD_TOOLTIP_SOURCE(playerGoldDisplay), 'right')"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, GOLD_TOOLTIP_SOURCE(playerGoldDisplay), 'right')"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <Coins class="size-3 text-amber-400" aria-hidden="true" />
              <span :key="`player-gold-count-${playerGoldDisplay}`" class="status-value-count text-[10px] text-amber-300 font-bold">{{ playerGoldDisplay }}</span>
            </button>
            <button
              v-if="playerTempGoldDisplay > 0"
              key="player-temp-gold"
              type="button"
              class="status-effect-value-btn flex items-center gap-1"
              :aria-label="`临时金币: ${playerTempGoldDisplay}. ${TEMP_GOLD_TOOLTIP.description}`"
              @mouseenter="showEffectTooltip($event, TEMP_GOLD_TOOLTIP_SOURCE(playerTempGoldDisplay), 'right')"
              @mouseleave="hideEffectTooltip"
              @focus="showEffectTooltip($event, TEMP_GOLD_TOOLTIP_SOURCE(playerTempGoldDisplay), 'right')"
              @blur="hideEffectTooltip"
              @touchstart.passive="handleEffectTouchStart($event, TEMP_GOLD_TOOLTIP_SOURCE(playerTempGoldDisplay), 'right')"
              @touchend="handleEffectTouchEnd"
              @touchcancel="handleEffectTouchEnd"
            >
              <span class="temp-gold-icon" aria-hidden="true">
                <Coins class="size-3 text-sky-300" />
                <Hourglass class="temp-gold-icon__badge text-sky-100" />
              </span>
              <span :key="`player-temp-gold-count-${playerTempGoldDisplay}`" class="status-value-count text-[10px] text-sky-200 font-bold">{{ playerTempGoldDisplay }}</span>
            </button>
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
          <CombatHealthBar
            side="player"
            :hp="playerStats.hp"
            :max-hp="playerStats.maxHp"
            :armor="playerArmor"
            :swarm-hp="playerSwarmHp"
            :poison-amount="playerPoisonAmount"
            :impact-token="healthBarImpactTokens.player"
            :value-text="`${formatCombatHp(playerStats.hp, infiniteHpDisplay.player.hp)}/${formatCombatHp(playerStats.maxHp, infiniteHpDisplay.player.maxHp)}`"
          />
          <!-- MP Bar -->
          <div class="flex items-center gap-2 mb-1.5">
            <span class="combat-stat-label combat-stat-label--mp w-6">MP</span>
            <div
              class="combat-mp-track flex-1"
              :class="{ 'mana-bar-blocked-shake': playerManaBlockedShake }"
            >
              <div
                class="combat-mp-fill h-full transition-all duration-500"
                :style="withTransition({ width: `${Math.min((playerStats.mp / 20) * 100, 100)}%` }, 500)"
              ></div>
            </div>
            <span class="combat-stat-value w-14 text-right">{{ playerStats.mp }}</span>
          </div>
          <!-- Dice Range -->
          <div class="flex items-center gap-2 mb-1">
            <img class="combat-dice-icon" :src="COMBAT_DICE_ICON_URL" alt="骰子" />
            <span class="combat-stat-value combat-stat-value--player-dice">{{ playerStats.minDice }} ~ {{ playerStats.maxDice }}</span>
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
              :key="`player-${eff.type}-${eff.temporary ? 'temporary' : 'normal'}`"
              type="button"
              class="effect-icon-btn"
              :class="[effectIconBoxClass(eff.polarity), isBlockedEffectAnimating('player', eff.type) ? 'effect-blocked-shake' : '']"
              :aria-label="`${getEffectInstanceName(eff)}: ${getEffectDescription(eff.type)}`"
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
              <span v-if="eff.stacks > 1" :key="`player-${eff.type}-${eff.temporary ? 'temporary' : 'normal'}-stacks-${eff.stacks}`" class="effect-stack-badge">{{ eff.stacks }}</span>
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
            <DungeonCard :card="playerPlayedCardVisual.card" :current-turn="combatState.turn" disabled />
          </div>
        </div>
      </div>

      <div
        v-for="visual in resolvedCardVisualEntries"
        :key="visual.id"
        class="resolved-card-visual"
        :class="visual.source === 'player' ? 'resolved-card-visual--player' : 'resolved-card-visual--enemy'"
        :style="resolvedCardVisualStyle(visual)"
      >
        <div class="resolved-card-visual-inner" :class="resolvedCardVisualInnerClass(visual)">
          <div class="combat-card-visual-scale">
            <DungeonCard :card="visual.card" :current-turn="combatState.turn" disabled />
          </div>
        </div>
      </div>
    </div>

    <BattleFxLayer ref="battleFxLayer" :entries="battleFeedback.entries.value" />
    <!-- UI Layer (HUD) -->
    <div class="absolute inset-0 z-30 flex flex-col pointer-events-none">
      <!-- Center: Clash Zone -->
      <div class="flex-1 flex items-center justify-center relative">
        <!-- Clash Animation Stage -->
        <div v-if="showClashAnimation" data-feedback-target="clash" class="relative w-full h-64 flex items-center justify-center z-50">
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
        <div class="combat-hand-anchor relative flex space-x-5 items-end mb-2 z-40 pointer-events-auto" data-ui-sound="none">
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
            :data-tutorial-card-id="card.id"
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
              :current-turn="combatState.turn"
              :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT && combatState.playerSelectedCard !== card"
              @click="handleCardSelect(card, idx)"
            />
          </div>
        </div>

        <!-- Left Corner: Skip + Active Skills -->
        <div class="combat-bottom-left-controls absolute flex flex-col items-start gap-2 z-50 pointer-events-auto combat-button-cluster--bottom-left">
          <button
            class="combat-skip-btn h-8 px-5"
            :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT"
            @click="handleSkipTurn"
          >
            跳过回合
          </button>

          <div class="flex gap-4">
            <button
              v-for="slot in playerActiveSkillSlots"
              :key="`active-skill-slot-${slot.idx}`"
              type="button"
              :data-tutorial-active-skill="slot.idx"
              data-ui-sound="none"
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
          <div v-if="omniWandRevertibleSlots.length > 0" class="flex gap-2">
            <button
              v-for="slotIdx in omniWandRevertibleSlots"
              :key="`omni-wand-revert-${slotIdx}`"
              type="button"
              class="combat-skip-btn h-7 px-3 text-xs"
              :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT"
              @click="revertOmniWandSlot(slotIdx)"
            >
              切回万象魔杖
            </button>
          </div>
          <button
            v-if="canDiscardForbiddenWasteBarrel"
            type="button"
            class="combat-skip-btn h-7 px-3 text-xs"
            :disabled="combatState.phase !== CombatPhase.PLAYER_INPUT"
            @click="discardForbiddenWasteBarrel"
          >
            弃置禁忌废液桶
          </button>
        </div>
      </div>

      <div
        v-if="omniWandSelectingSlot !== null"
        class="pointer-events-auto absolute inset-0 z-[120] flex items-center justify-center bg-black/65 p-6 backdrop-blur-sm"
      >
        <div class="w-full max-w-3xl rounded-lg border border-dungeon-gold/40 bg-[#171018]/95 p-4 shadow-2xl">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-bold text-dungeon-gold">万象魔杖</div>
              <div class="mt-1 text-xs text-dungeon-paper/70">选择本场战斗中要变化成的初始主动技</div>
            </div>
            <button
              type="button"
              class="rounded border border-dungeon-brown/60 px-3 py-1.5 text-xs text-dungeon-paper/80 hover:border-dungeon-gold/60"
              @click="omniWandSelectingSlot = null"
            >
              取消
            </button>
          </div>
          <div class="grid max-h-[62vh] grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3">
            <button
              v-for="formSkill in omniWandFormChoices"
              :key="`omni-wand-form-${formSkill.id}`"
              type="button"
              class="rounded border border-dungeon-brown/50 bg-black/20 p-2 transition-colors hover:border-dungeon-gold/70"
              @click="confirmOmniWandForm(formSkill.id)"
            >
              <ActiveSkillCard :skill="formSkill" :mana-cost="formSkill.manaCost" size="compact" />
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
              <DungeonCard :card="entry.card" :current-turn="combatState.turn" disabled />
            </button>
          </div>
        </div>
      </div>

      <!-- Log Feed + Piles Overlay: top-right, below parent "退出战斗" button -->
      <div class="combat-top-right-panel absolute z-40 pointer-events-auto select-none flex flex-col items-end gap-2 combat-button-cluster--top-right">
        <div class="flex items-start">
          <button
            class="combat-panel-toggle h-[2.625rem] px-3"
            :title="logsCollapsed ? '展开日志' : '折叠日志'"
            @click="logsCollapsed = !logsCollapsed"
          >
            {{ logsCollapsed ? '日志 ▼' : '日志 ▲' }}
          </button>
          <div
            v-if="!logsCollapsed"
            class="combat-log-panel w-80 max-h-44 overflow-y-auto space-y-1 p-1"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-for="(l, i) in combatState.logs"
              :key="i"
              class="combat-log-entry"
              v-html="l"
            ></div>
          </div>
        </div>

        <div class="flex items-start">
          <button
            class="combat-panel-toggle h-[2.625rem] px-3"
            :title="isPlayerDeckHiddenByFantasyEmbrace
              ? (pilesCollapsed ? '展开弃牌堆' : '折叠弃牌堆')
              : (pilesCollapsed ? '展开牌库与弃牌堆' : '折叠牌库与弃牌堆')"
            @click="pilesCollapsed = !pilesCollapsed"
          >
            {{ isPlayerDeckHiddenByFantasyEmbrace ? (pilesCollapsed ? '弃牌堆 ▼' : '弃牌堆 ▲') : (pilesCollapsed ? '牌堆 ▼' : '牌堆 ▲') }}
          </button>
          <div
            v-if="!pilesCollapsed"
            class="combat-pile-panel w-44 p-2"
          >
            <div class="flex items-center justify-center gap-2">
              <div
                v-if="!isPlayerDeckHiddenByFantasyEmbrace"
                class="relative group"
              >
                <button
                  class="combat-pile-btn w-14 h-14 flex flex-col items-center justify-center"
                  @click="overlayOpen = 'deck'"
                >
                  <Layers class="size-5 text-dungeon-gold" />
                <span class="combat-pile-count">{{ combatState.playerDeck.length }}</span>
              </button>
              <div
                class="combat-pile-tip absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                牌库
              </div>
              </div>

              <div class="relative group">
                <button
                  class="combat-pile-btn combat-pile-btn--discard w-14 h-14 flex flex-col items-center justify-center"
                  @click="overlayOpen = 'discard'"
                >
                  <Trash2 class="size-5 text-gray-400" />
                  <span class="combat-pile-count">{{ combatState.discardPile.length }}</span>
                </button>
                <div
                  class="combat-pile-tip absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
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
        class="battle-result-banner px-14 py-5"
        :class="{
          'battle-result-banner--win': battleResultBanner === 'win',
          'battle-result-banner--escape': battleResultBanner === 'escape',
          'battle-result-banner--lose': battleResultBanner !== 'win' && battleResultBanner !== 'escape',
        }"
      >
        {{ battleResultBanner === 'win' ? '胜利' : battleResultBanner === 'escape' ? '脱离' : '败北' }}
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="effectTooltip"
        class="effect-tooltip fixed z-[240] pointer-events-none"
        :class="[
          effectTooltip.align === 'right' ? 'effect-tooltip--right text-right' : 'effect-tooltip--center',
          { 'effect-tooltip--below': effectTooltip.below },
        ]"
        :style="{ left: `${effectTooltip.x}px`, top: `${effectTooltip.y}px` }"
      >
        <div class="effect-tooltip-name">{{ effectTooltip.name }}</div>
        <div
          v-if="effectTooltip.previewCard"
          class="effect-tooltip-card-preview"
        >
          <DungeonCard :card="effectTooltip.previewCard" :current-turn="combatState.turn" disabled />
        </div>
        <div class="effect-tooltip-desc">{{ effectTooltip.description }}</div>
        <div v-if="effectTooltip.stacks > 1" class="effect-tooltip-stacks">层数: {{ effectTooltip.stacks }}</div>
      </div>
    </Teleport>

    <!-- 【预言】选择界面 -->
    <div
      v-if="prophecyPickerHandIdx !== null"
      class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      @click="prophecyPickerHandIdx = null"
    >
      <div class="combat-pile-overlay px-8 py-6 w-auto max-w-[96%] max-h-[96%] flex flex-col relative" @click.stop>
        <span class="combat-pile-overlay__border" aria-hidden="true"></span>
        <div class="combat-pile-overlay__head flex justify-between items-center mb-4 pb-2">
          <h3 class="combat-pile-overlay__title">预言：选择一张牌，本牌这一次变为它的复制</h3>
          <button type="button" class="combat-pile-overlay__close" aria-label="关闭" @click="prophecyPickerHandIdx = null">
            <XIcon class="size-4" />
          </button>
        </div>
        <!-- 3×3 原尺寸卡牌，便于看清卡面；超过 9 张时可滚动 -->
        <div class="overflow-y-auto custom-scrollbar grid grid-cols-3 gap-x-10 gap-y-4 px-4 py-2 justify-items-center">
          <button
            v-for="(card, i) in getProphecyBattleCards()"
            :key="`prophecy-${i}`"
            type="button"
            class="relative flex flex-col items-center gap-1 disabled:cursor-not-allowed"
            :disabled="isProphecyCardUsed(card)"
            @click="resolveProphecyPick(card)"
          >
            <div :class="isProphecyCardUsed(card) ? 'opacity-35 grayscale' : ''">
              <DungeonCard :card="getDisplayPileCard(card)" :current-turn="combatState.turn" disabled />
            </div>
            <span class="text-sm" :class="isProphecyCardUsed(card) ? 'text-gray-400' : 'text-violet-200'">
              {{ isProphecyCardUsed(card) ? '已预言' : '预言为此牌' }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Deck/Discard Overlay -->
    <div
      v-if="overlayOpen && (!isPlayerDeckHiddenByFantasyEmbrace || overlayOpen === 'discard')"
      class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
      @click="overlayOpen = null"
    >
      <div
        class="combat-pile-overlay p-6 max-w-2xl w-full max-h-[80%] flex flex-col relative"
        @click.stop
      >
        <span class="combat-pile-overlay__border" aria-hidden="true"></span>
        <div class="combat-pile-overlay__head flex justify-between items-center mb-4 pb-2">
          <h3 class="combat-pile-overlay__title">
            {{ overlayOpen === 'deck' ? '当前牌库' : '弃牌堆' }}
          </h3>
          <button type="button" class="combat-pile-overlay__close" aria-label="关闭" @click="overlayOpen = null">
            <XIcon class="size-4" />
          </button>
        </div>
        <div class="overflow-y-auto grid grid-cols-4 gap-4 p-2">
          <div
            v-for="(card, i) in overlayOpen === 'deck' ? combatState.playerDeck : combatState.discardPile"
            :key="i"
            class="scale-75 origin-top-left"
          >
            <DungeonCard :card="getDisplayPileCard(card)" :current-turn="combatState.turn" disabled />
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
    Brain,
    Bug,
    Coins,
    Droplet,
    Eye,
    EyeOff,
    Flame,
    GitCommit,
    Heart,
    Hourglass,
    Layers,
    Leaf,
    Link2,
    Maximize2,
    Copy,
    SquareDashed,
    Scroll,
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
import { shallowRef, toRaw } from 'vue';
import {
    applyDamageToEntity,
    calculateFinalDamage,
    calculateFinalPoint,
    consumeColdAfterDealingDamage,
    triggerSwarmReviveIfNeeded as triggerSwarmReviveIfNeededInAlgorithm,
    addPainMemory, availablePainOaths, changePainThorns, choosePainOath, consumePainRollBonus, createPainScene,
    getPainOath, painHealingAmount, painIncomingDamage, painOutgoingDamage, painPointBonus,
    painThornsOnPlayerCard, recordPainHpLoss, updatePainPhase,
} from '../battle/algorithms';
import { GAIA_CARD, PAIN_CARD, PAIN_CURSES, PAIN_OATH_CARDS, SIGEL_CARD, UMBILICAL_TENTACLE_CARD, getAllCards, getCardByName, getUmbilicalPullFinalPoint, getUmbilicalPullLimit, getUmbilicalWhipHitCount, type PainOath } from '../battle/cardRegistry';
import { EFFECT_REGISTRY, ELEMENTAL_DEBUFF_TYPES, applyEffect, beginRuneClash, canPlayCard, consumeRuneFinisherEnergy, findEffect, getEffectDisplayOrder, getEffectStacks, isRuneProtectionActive, processOnTurnEnd, processOnTurnStart as processEntityTurnStart, reduceEffectStacks, removeEffect, resolveRuneClashEnergy, startRuneTurn } from '../battle/effects';
import { getEnemyByName } from '../battle/enemyRegistry';
import { resolveInitialEntityStats } from '../battle/initialStats';
import { OMNI_WAND_FORM_IDS, OMNI_WAND_SKILL_ID, getActiveSkillById } from '../battle/activeSkillRegistry';
import { PORTED_CARD } from '../battle/cardRegistry';
import {
    PORTED_RELIC_ID,
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
import { EVENT_CARD_CATEGORY, EVENT_CARD_ID, SIN_CARD_ID } from '../battle/eventCards';
import { EVENT_RELIC_ID } from '../battle/eventRelics';
import {
  normalizeNegativeStatusList,
  runNegativeStatusBattleHooks,
  type NegativeStatusBattleContext,
  type ParsedNegativeStatus,
} from '../negativeStatusRegistry';
import { recordEncounteredCards, recordEncounteredEffects, recordEncounteredEnemy } from '../codexStore';
import type { ResolvedBattleModifiers } from '../combatModifiers';
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
import { invalidatePortrait, preloadPortrait, preloadRandomPortrait } from '../portraitPreload';
import {
  EVENT_EFFECTS,
  activeSkillFeedback,
  cardFeedback,
  effectImpactSeconds,
  relicFeedback,
  statusFeedback,
  type BattleEffectName,
  type FeedbackTarget,
} from '../presentation/feedbackRegistry';
import { useBattleFeedback } from '../presentation/useBattleFeedback';
import { battleEffectsEnabled, playUiSfx } from '../sfx';
import { CardType, CombatPhase, EffectType as ET, type ActiveSkillData, type CardData, type CardEffectTrigger, type CardManaDrainConfig, type CardSelfDamageConfig, type CombatState, type EffectInstance, type EffectPolarity, type EffectType, type EnemyAIContext, type EnemyDefinition, type EntityStats, type InitialEntityStats } from '../types';
import ActiveSkillCard from './ActiveSkillCard.vue';
import DungeonCard from './DungeonCard.vue';
import DungeonDice from './DungeonDice.vue';
import CombatHealthBar from './CombatHealthBar.vue';
import MainButtonSkin from './MainButtonSkin.vue';
import BattleFxLayer from './BattleFxLayer.vue';
import SoundSettings from './SoundSettings.vue';

const props = withDefaults(defineProps<{
  initialPlayerStats: EntityStats;
  enemyName: string;
  playerDeck: CardData[];
  playerActiveSkills?: ActiveSkillData[];
  playerRelics?: Record<string, number>;
  playerPortraitOverrideUrl?: string;
  backgroundAreaOverride?: string;
  testStartAt999?: boolean;
  uiFontFamily?: string;
  trackDiscovery?: boolean;
  preservePlayerDeckOrder?: boolean;
  tutorialDiceScript?: ReadonlyArray<{ player: number; enemy: number }>;
  tutorialInitialRerollCharges?: number;
  /** 事件带来的限时 / 本层 / 领主战修正（$战斗修正），以及事件战斗的敌方削弱 */
  battleModifiers?: ResolvedBattleModifiers | null;
}>(), {
  playerActiveSkills: () => [],
  playerRelics: () => ({}),
  playerPortraitOverrideUrl: '',
  backgroundAreaOverride: '',
  testStartAt999: false,
  uiFontFamily: '',
  trackDiscovery: true,
  preservePlayerDeckOrder: false,
  tutorialDiceScript: () => [],
  tutorialInitialRerollCharges: 0,
  battleModifiers: null,
});

const emit = defineEmits<{
  endCombat: [outcome: 'win' | 'lose' | 'escape', finalStats: EntityStats, logs: string[], negativeEffects: string[], goldDelta?: number, consumedRelicIds?: string[]];
  openDeck: [];
  openRelics: [];
  openGlossary: [];
  playerCardSelected: [card: CardData];
  playerDiceRerolled: [before: number, after: number];
  activeSkillUsed: [skill: ActiveSkillData];
  turnResolved: [turn: number];
  playerTurnDamageThresholdReached: [];
  playerMaxDiceThresholdReached: [];
  ready: [];
}>();

const gameStore = useGameStore();
let presentationReady = false;
const battleResourcesReady = ref(false);
const battleResourceLoadError = ref(false);
const battleFxLayer = ref<InstanceType<typeof BattleFxLayer> | null>(null);
let battleResourcesLoading = false;

function blockWhileLoading(event: Event) {
  if (!battleResourcesReady.value && !(event.target as Element).closest('[data-battle-loading]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

/** 预热本场战斗可能触发的非核心特效（卡组、主动技、事件、状态、圣遗物），失败不影响战斗 */
function warmBattleFeedback() {
  const effects = new Set<BattleEffectName>(Object.values(EVENT_EFFECTS));
  const cards = [
    ...combatState.value.playerDeck, ...combatState.value.playerHand,
    ...combatState.value.enemyDeck, ...combatState.value.discardPile,
  ];
  for (const card of cards) {
    const feedback = cardFeedback(card);
    if (feedback) effects.add(feedback.effect);
  }
  for (const skill of props.playerActiveSkills ?? []) {
    const feedback = activeSkillFeedback(skill);
    if (feedback) effects.add(feedback.effect);
  }
  for (const type of Object.values(ET)) {
    const effect = statusFeedback(type);
    if (effect) effects.add(effect);
  }
  const list = [...effects];
  void battleFeedback.warm(list).catch(() => undefined);
  battleFxLayer.value?.warm(list);
}

async function prepareBattleResources() {
  if (battleResourcesLoading || portraitLoaderDisposed) return;
  battleResourcesLoading = true;
  battleResourceLoadError.value = false;
  try {
    const results = await Promise.allSettled([
      initPortraitUrls(), battleFeedback.prepare(),
      battleFxLayer.value ? battleFxLayer.value.prepare() : Promise.reject(new Error('特效渲染器尚未挂载')),
      ...(isLeviathanBattle ? LEVIATHAN_SUMMON_NAMES.map(name => preloadPortrait(toResolveUrl(`${HF_MONSTER_DIR}/${name}.png`))) : []),
    ]);
    const failure = results.find(result => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    if (isPainBattle && !painPortraitsReady.value) throw new Error('佩恩立绘尚未加载');
    if (portraitLoaderDisposed) return;
    presentationReady = true;
    battleResourcesReady.value = true;
    warmBattleFeedback();
    emit('ready');
  } catch (error) {
    if (!portraitLoaderDisposed) {
      battleResourceLoadError.value = true;
      console.debug('[battle] Resources unavailable:', error);
    }
  } finally {
    battleResourcesLoading = false;
  }
}
const isTutorialBattle = props.enemyName === '训练人偶';
const resolveCurrentFloorNumber = () => {
  const area = (gameStore.statData._当前区域 as string) || '';
  const floorFromArea = getFloorNumberForArea(area);
  const fallback = Math.max(1, Math.floor(Number(gameStore.statData._楼层数 ?? 1)));
  const floor = area ? floorFromArea : fallback;
  if (!isTutorialBattle) gameStore.statData._楼层数 = floor;
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
const isLordBattle = !isTutorialBattle && String(gameStore.statData._当前房间类型 ?? '').includes('领主');

// --- Enemy Loading ---
const enemyDef = getEnemyByName(props.enemyName, currentFloorNumber);
const enemyDisplayName = enemyDef?.name ?? props.enemyName;
const isTwinBattle = Boolean(enemyDef?.selectTwinCards);
const isMirrorCloneBattle = enemyDisplayName === '镜像分身';
const isLeviathanBattle = enemyDisplayName === '利维坦';
const isPainBattle = enemyDisplayName === '佩恩';
const painPortraitsReady = ref(!isPainBattle);
const painPortraitLoadError = ref(false);
const painPhasePortraits = reactive<Record<number, string>>({});
let painPortraitLoading = false;
const painPortraitTransitioning = ref(false);
let painPortraitTransitionSourceTimer: ReturnType<typeof setTimeout> | null = null;
let painPortraitTransitionEndTimer: ReturnType<typeof setTimeout> | null = null;
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
/** 属性图标·骰子（与主界面状态块同一素材：地牢/素材库/通用UI/属性图标） */
const COMBAT_DICE_ICON_URL = toResolveUrl('地牢/素材库/通用UI/属性图标/骰子.webp');

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
  const firstPath = getLocalFolderFirstImagePath(folderPath);
  const candidates = images.length ? images : [firstPath ?? fallbackFilePath];
  return preloadRandomPortrait(candidates, toResolveUrl);
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
  if (isPainBattle) {
    invalidatePortrait(enemyPortraitUrl.value);
    delete painPhasePortraits[painScene?.phase ?? 1];
    painPortraitsReady.value = false;
    painPortraitLoadError.value = true;
    presentationReady = false;
    battleResourcesReady.value = false;
    battleResourceLoadError.value = true;
    return;
  }
  void tryFallbackPortrait(`${HF_MONSTER_DIR}/${enemyDisplayName}`, enemyPortraitUrl, enemyPortraitError, enemyPortraitFallbackTried);
};

const initPortraitUrls = async () => {
  let playerUrl = props.playerPortraitOverrideUrl;
  if (playerUrl) {
    try { await preloadPortrait(playerUrl); }
    catch { playerUrl = ''; }
  }
  if (!playerUrl) playerUrl = await resolveRandomPortrait(HF_USER_DIR, `${HF_USER_DIR}/立绘.png`);
  if (!portraitLoaderDisposed) {
    playerPortraitFallbackTried.value = false;
    playerPortraitError.value = false;
    playerPortraitUrl.value = playerUrl;
  }

  const enemyFolderPath = `${HF_MONSTER_DIR}/${enemyDisplayName}`;
  if (isPainBattle) {
    if (!painPortraitsReady.value) await loadPainPortraits();
    return;
  }
  const enemyFallback = `${HF_MONSTER_DIR}/${enemyDisplayName}.png`;
  const shouldPreferFolder = BOSS_FOLDER_NAMES.has(enemyDisplayName);
  let enemyUrl = toResolveUrl(enemyFallback);
  if (shouldPreferFolder) {
    enemyUrl = await resolveRandomPortrait(enemyFolderPath, enemyFallback);
  } else {
    const folderImages = await fetchFolderImages(enemyFolderPath);
    if (folderImages.length) enemyUrl = await preloadRandomPortrait(folderImages, toResolveUrl);
  }
  await preloadPortrait(enemyUrl);
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
const currentArea = computed(() => props.backgroundAreaOverride || (gameStore.statData._当前区域 as string) || '');
const currentRoomType = computed(() => (gameStore.statData._当前房间类型 as string) || '');
const isCurrentOpponentLord = () => currentRoomType.value.includes('领主') || BOSS_FOLDER_NAMES.has(enemyDisplayName);
const bgImageUrl = computed(() => {
  if (!currentArea.value || bgImageError.value) return '';
  const isLord = !props.backgroundAreaOverride && currentRoomType.value === '领主' && !bgIsLordFallback.value;
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

const normalizeTestStartStats = (stats: InitialEntityStats): EntityStats => resolveInitialEntityStats(
  props.testStartAt999 ? { ...stats, hp: 999, maxHp: 999, mp: 999 } : stats,
);

const buildEnemyInitialStats = (): EntityStats => {
  const baseStats: InitialEntityStats = enemyDef
    ? { ...enemyDef.stats }
    : { hp: 1, maxHp: 1, mp: 0, minDice: 1, maxDice: 1, effects: [] as EffectInstance[] };
  if (isMirrorCloneBattle) {
    baseStats.mp = Math.max(0, Math.floor(props.initialPlayerStats.mp));
    baseStats.minDice = Math.max(0, Math.floor(props.initialPlayerStats.minDice));
    baseStats.maxDice = Math.max(baseStats.minDice, Math.floor(props.initialPlayerStats.maxDice));
  }
  if (enemyDef?.copyPlayerDiceRangeOnStart) {
    baseStats.minDice = Math.max(0, Math.floor(props.initialPlayerStats.minDice));
    baseStats.maxDice = Math.max(baseStats.minDice, Math.floor(props.initialPlayerStats.maxDice));
  }
  if (!isTutorialBattle && difficultyHpMultiplier !== 1 && baseStats.maxHp < INFINITE_HP_VALUE) {
    const scaledMaxHp = Math.max(1, Math.round(baseStats.maxHp * difficultyHpMultiplier));
    const scaledHp = Math.max(1, Math.min(scaledMaxHp, Math.round(baseStats.hp * difficultyHpMultiplier)));
    baseStats.maxHp = scaledMaxHp;
    baseStats.hp = scaledHp;
  }
  // 事件战斗的敌方削弱（如漫游的领主离开主场）与战斗修正的敌方点数变化
  const enemyModifiers = props.battleModifiers?.enemy;
  if (enemyModifiers && enemyModifiers.hpMultiplier !== 1 && baseStats.maxHp < INFINITE_HP_VALUE) {
    baseStats.maxHp = Math.max(1, Math.round(baseStats.maxHp * enemyModifiers.hpMultiplier));
    baseStats.hp = Math.max(1, Math.min(baseStats.maxHp, Math.round(baseStats.hp * enemyModifiers.hpMultiplier)));
  }
  if (enemyModifiers && (enemyModifiers.minDice !== 0 || enemyModifiers.maxDice !== 0)) {
    baseStats.minDice = Math.max(1, baseStats.minDice + enemyModifiers.minDice);
    baseStats.maxDice = Math.max(baseStats.minDice, baseStats.maxDice + enemyModifiers.maxDice);
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
const painScene = isPainBattle ? reactive(createPainScene(playerStats.value, enemyStats.value)) : null;
const gaiaState = props.enemyName === '盖亚' ? reactive(createGaiaBattleState()) : null;
if (gaiaState) syncGaiaConnectionEffects(gaiaState, playerStats.value, enemyStats.value);
const sceneEffects = computed(() => painScene?.effects ?? []);
const sceneEffectPulse = reactive<Record<string, number>>({});
const pulseSceneEffect = (type: EffectType) => {
  sceneEffectPulse[type] = (sceneEffectPulse[type] ?? 0) + 1;
};
const pendingPainOaths = ref<PainOath[]>([]);
let painPointBonusByCard = new WeakMap<CardData, number>();
let runeConsumedEnergyByCard = new WeakMap<CardData, number>();
const pendingRuneShiftCards = new Map<CardData, BattleSide>();
let unmodifiedDiceByEntity = new WeakMap<EntityStats, number>();
let resolvePainOathChoice: (() => void) | null = null;

async function loadPainPortraits() {
  if (painPortraitLoading || portraitLoaderDisposed) return;
  painPortraitLoading = true;
  painPortraitLoadError.value = false;
  try {
    const folder = `${HF_MONSTER_DIR}/佩恩`;
    const [first, second] = await Promise.all([
      painPhasePortraits[1] || preloadRandomPortrait(getLocalFolderImagePaths(folder, 1), toResolveUrl),
      painPhasePortraits[2] || preloadRandomPortrait(getLocalFolderImagePaths(folder, 2), toResolveUrl),
    ]);
    if (portraitLoaderDisposed) return;
    painPhasePortraits[1] = first;
    painPhasePortraits[2] = second;
    enemyPortraitUrl.value = painPhasePortraits[painScene?.phase ?? 1]!;
    enemyPortraitError.value = false;
    painPortraitsReady.value = true;
  } catch {
    if (!portraitLoaderDisposed) painPortraitLoadError.value = true;
  } finally {
    painPortraitLoading = false;
  }
}

const transitionPainPortraitTo = (portrait: string) => {
  if (painPortraitTransitionSourceTimer !== null) clearTimeout(painPortraitTransitionSourceTimer);
  if (painPortraitTransitionEndTimer !== null) clearTimeout(painPortraitTransitionEndTimer);
  painPortraitTransitioning.value = true;
  painPortraitTransitionSourceTimer = setTimeout(() => {
    painPortraitTransitionSourceTimer = null;
    enemyPortraitUrl.value = portrait;
  }, 250);
  painPortraitTransitionEndTimer = setTimeout(() => {
    painPortraitTransitionEndTimer = null;
    painPortraitTransitioning.value = false;
  }, 780);
};

const getSceneEffectDescription = (effect: EffectInstance) => {
  let description = EFFECT_REGISTRY[effect.type]?.description ?? '';
  if (effect.type === ET.SELF_CHOSEN_PAIN && painScene) {
    description += ` 当前下次投掷点数加成：玩家+${painScene.nextRollBonus.player}，佩恩+${painScene.nextRollBonus.enemy}。`;
  }
  if (effect.type === ET.CORRIDOR_MEMORY && painScene) {
    description += ` 当前累计损血${painScene.totalHpLost}/${painScene.initialCombinedMaxHp}（${effect.stacks}%）。`;
  }
  return description;
};
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
const getEffectInstanceName = (effect: Pick<EffectInstance, 'type' | 'temporary'>): string => (
  effect.temporary ? `临时${getEffectName(effect.type)}` : getEffectName(effect.type)
);
const getEffectDescription = (type: EffectType, side?: BattleSide): string => {
  const description = EFFECT_REGISTRY[type]?.description ?? '';
  if (type === ET.RUNE_PROTECTION && side) {
    const entity = side === 'player' ? playerStats.value : enemyStats.value;
    const state = entity.runeState;
    const status = isRuneProtectionActive(entity) ? '防护生效中' : state?.protectionSuppressed ? '终式撤防中' : '拼点后已解除';
    return `${description} 当前：${status}；后续撤防${state?.suppressedTurnsRemaining ?? 0}回合。`;
  }
  if (isPainBattle && side === 'enemy') {
    if (type === ET.PHASE_TRANSITION) return `${description}；转阶段后更换卡组，下回合开始时获得6层荆棘。`;
    if (type === ET.THORNS) return `${description}；玩家打出物理/魔法牌时，佩恩的荆棘减少2层；打出功能/闪避牌时增加2层。`;
  }
  return description;
};
/** 状态栏中非状态效果的数值（金币、临时金币）的悬浮说明 */
interface ValueTooltipSource {
  infoName: string;
  description: string;
  stacks: number;
}
type TooltipSource = EffectInstance | ValueTooltipSource;
const GOLD_TOOLTIP = {
  infoName: '金币',
  description: '持有的金币，可在商店消费；部分财富卡牌与主动技会消耗金币或依据金币数量生效。',
} as const;
const TEMP_GOLD_TOOLTIP = {
  infoName: '临时金币',
  description: '本场战斗内视为金币。消耗金币时优先使用临时金币，战斗结束时清空。',
} as const;
const GOLD_TOOLTIP_SOURCE = (amount: number): ValueTooltipSource => ({ ...GOLD_TOOLTIP, stacks: Math.max(0, Math.floor(amount)) });
const TEMP_GOLD_TOOLTIP_SOURCE = (amount: number): ValueTooltipSource => ({ ...TEMP_GOLD_TOOLTIP, stacks: Math.max(0, Math.floor(amount)) });

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
  [ET.CLUSTER_CREATURE]: Bug,
  [ET.BLOOD_COCOON]: Heart,
  [ET.INDOMITABLE]: Heart,
  [ET.REGENERATION]: SquareDashed,
  [ET.MIMICKER]: Copy,
  [ET.DANCE_HALL]: Sparkles,
  [ET.CO_DANCE]: Link2,
  [ET.SOLITUDE]: Heart,
  [ET.REFLECTION]: SquareDashed,
  [ET.PEEP_FORBIDDEN]: Eye,
  [ET.BLIND_ASH]: EyeOff,
  [ET.COGNITIVE_INTERFERENCE]: Brain,
  [ET.UNSEEABLE]: EyeOff,
  [ET.INTANGIBLE]: Sparkles,
  [ET.TWINS]: Link2,
  [ET.MEMORY_FOG]: EyeOff,
  [ET.SIGHT_DEPRIVATION]: EyeOff,
  [ET.FATE_OBSERVATION]: Sparkles,
  [ET.SILENCE]: Ban,
  [ET.RESONANCE_LOCK]: GitCommit,
  [ET.DISORIENTATION]: Sparkles,
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
/** 状态效果图标的语义类：颜色统一在样式中定义（宝石座 + 语义色内衬） */
const effectIconBoxClass = (polarity: EffectPolarity): string => `effect-icon--${polarity}`;

// --- Armor computed ---
const playerArmor = computed(() => {
  return getEffectStacks(playerStats.value, ET.ARMOR);
});
const enemyArmor = computed(() => {
  return getEffectStacks(enemyStats.value, ET.ARMOR);
});
const getSwarmRecoverableHp = (entity: EntityStats): number | null => {
  const swarmStacks = getEffectStacks(entity, ET.SWARM);
  const mirrorSwarmStacks = getEffectStacks(entity, ET.MIRROR_SWARM);
  if (swarmStacks <= 0 && mirrorSwarmStacks <= 0) return null;
  const reducedHp = Math.max(0, Math.floor(entity.maxHp) - Math.max(0, Math.floor(entity.swarmHealReduction ?? 0)));
  return swarmStacks > 0 ? reducedHp : Math.max(1, reducedHp);
};
const playerSwarmHp = computed(() => getSwarmRecoverableHp(playerStats.value));
const enemySwarmHp = computed(() => getSwarmRecoverableHp(enemyStats.value));
const playerPoisonAmount = computed(() => {
  return getEffectStacks(playerStats.value, ET.POISON_AMOUNT);
});
const enemyPoisonAmount = computed(() => {
  return getEffectStacks(enemyStats.value, ET.POISON_AMOUNT);
});
const playerTempMaxHp = computed(() => {
  return getEffectStacks(playerStats.value, ET.TEMP_MAX_HP);
});
const enemyTempMaxHp = computed(() => {
  return getEffectStacks(enemyStats.value, ET.TEMP_MAX_HP);
});
const playerVisibleEffects = computed(() => playerStats.value.effects
  .filter(e => e.polarity !== 'scene' && e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT && e.type !== ET.TEMP_MAX_HP)
  .sort((a, b) => getEffectDisplayOrder(a.type) - getEffectDisplayOrder(b.type)));
const enemyVisibleEffects = computed(() => enemyStats.value.effects
  .filter(e => e.polarity !== 'scene' && e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT && e.type !== ET.TEMP_MAX_HP)
  .sort((a, b) => getEffectDisplayOrder(a.type) - getEffectDisplayOrder(b.type)));
const isEnemyPortraitHiddenTransitionReady = ref(false);
const shouldBridgeHolyWaterJellyfishPortraitHidden = ref(false);
let enemyPortraitHiddenTransitionFrameId: number | null = null;
const canHolyWaterJellyfishRefreshIntangible = () => {
  if (enemyDisplayName !== '圣水水母') return false;
  if (playerStats.value.hp <= 0 || enemyStats.value.hp <= 0) return false;
  const intangible = findEffect(enemyStats.value, ET.INTANGIBLE);
  if (!intangible || intangible.stacks <= 0) return false;
  return Math.max(0, Math.floor(intangible.runtimeCounter ?? 0)) <= 0;
};
const bridgeHolyWaterJellyfishPortraitHiddenForRefresh = () => {
  shouldBridgeHolyWaterJellyfishPortraitHidden.value =
    getEffectStacks(playerStats.value, ET.COGNITIVE_INTERFERENCE) > 0
    && canHolyWaterJellyfishRefreshIntangible();
};
const isHolyWaterJellyfishIntangibleActive = computed(() => {
  if (enemyDisplayName !== '圣水水母') return false;
  if (!isEnemyPortraitHiddenTransitionReady.value) return false;
  return (
    getEffectStacks(playerStats.value, ET.COGNITIVE_INTERFERENCE) > 0
    || shouldBridgeHolyWaterJellyfishPortraitHidden.value
  );
});
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

const getLeviathanSummonPositionClass = (index: number): string => {
  switch (index) {
    case 0: return 'leviathan-summon-node--left';
    case 1: return 'leviathan-summon-node--left-top';
    default: return 'leviathan-summon-node--top';
  }
};

const getLeviathanSummonVisibleEffects = (summon: LeviathanSummonRuntime) => summon.stats.effects
  .filter(e => e.type !== ET.ARMOR && e.type !== ET.POISON_AMOUNT && e.type !== ET.TEMP_MAX_HP)
  .sort((a, b) => getEffectDisplayOrder(a.type) - getEffectDisplayOrder(b.type));

const getLeviathanSummonArmor = (summon: LeviathanSummonRuntime): number => (
  Math.max(0, getEffectStacks(summon.stats, ET.ARMOR))
);

const getLeviathanSummonById = (id: LeviathanTargetId): LeviathanSummonRuntime | null => (
  id === 'body' ? null : (leviathanSummons.value.find(summon => summon.id === id && summon.stats.hp > 0) ?? null)
);

const getSelectedLeviathanSummon = (): LeviathanSummonRuntime | null => (
  getLeviathanSummonById(leviathanSelectedTargetId.value)
);

const getCurrentEnemyIntentForPlayerInput = (): CardData | null => (
  isLeviathanBattle
    ? (getSelectedLeviathanSummon()
      ? (getSelectedLeviathanSummon()?.intentCard ?? PASS_CARD)
      : combatState.value.enemyIntentCard)
    : combatState.value.enemyIntentCard
);

const ensureLeviathanSelectedTarget = () => {
  if (!isLeviathanBattle) return;
  if (leviathanSelectedTargetId.value === 'body') return;
  if (getSelectedLeviathanSummon()) return;
  leviathanSelectedTargetId.value = enemyStats.value.hp > 0 ? 'body' : (getAliveLeviathanSummons()[0]?.id ?? 'body');
};

const selectLeviathanTarget = (targetId: LeviathanTargetId) => {
  if (!isLeviathanBattle || combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (targetId !== 'body' && !getLeviathanSummonById(targetId)) return;
  leviathanSelectedTargetId.value = targetId;
  const targetName = targetId === 'body' ? '利维坦' : (getLeviathanSummonById(targetId)?.name ?? '召唤物');
  log(`<span class="text-cyan-300">本轮目标切换为【${targetName}】。</span>`);
};

const leviathanBodyTargetClass = computed(() => (
  isLeviathanBattle && leviathanSelectedTargetId.value === 'body'
    ? 'leviathan-body-target--selected'
    : ''
));

const removeDefeatedLeviathanSummons = () => {
  if (!isLeviathanBattle || leviathanSummons.value.length <= 0) return;
  const defeated = leviathanSummons.value.filter(summon => summon.stats.hp <= 0);
  if (defeated.length <= 0) return;
  leviathanSummons.value = leviathanSummons.value.filter(summon => summon.stats.hp > 0);
  for (const summon of defeated) {
    log(`<span class="text-violet-300">【${summon.name}】被击溃，离开了战场。</span>`);
  }
  ensureLeviathanSelectedTarget();
};

const buildLeviathanSummonRuntime = (name: LeviathanSummonRuntime['name']): LeviathanSummonRuntime | null => {
  const def = getEnemyByName(name, currentFloorNumber);
  if (!def) return null;
  const summonMaxHp = Math.max(1, Math.ceil(def.stats.maxHp / 3));
  const stats = resolveInitialEntityStats({ ...def.stats, maxHp: summonMaxHp, hp: summonMaxHp });
  return {
    id: `leviathan-summon-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    def,
    stats,
    deck: toBattleDeck(def.deck),
    discard: [],
    intentCard: null,
    baseDice: 0,
    rawDice: 0,
    portraitUrl: toResolveUrl(`${HF_MONSTER_DIR}/${name}.png`),
    portraitError: false,
    flags: {},
    previousCardType: null,
    createdTurn: combatState.value.turn,
    nextActionTurn: combatState.value.turn + 1,
  };
};

const summonLeviathanUnit = (name: LeviathanSummonRuntime['name']) => {
  if (!isLeviathanBattle) return;
  const existing = leviathanSummons.value.find(summon => summon.name === name && summon.stats.hp > 0);
  if (existing) {
    const before = existing.stats.hp;
    existing.stats.hp = existing.stats.maxHp;
    const healed = Math.max(0, existing.stats.hp - before);
    if (healed > 0) {
      pushFloatingNumber('enemy', healed, 'heal', '+', { targetEntity: existing.stats });
    }
    log(`<span class="text-emerald-300">利维坦重新召唤【${name}】，已存在的个体恢复至满生命。</span>`);
    return;
  }

  const runtime = buildLeviathanSummonRuntime(name);
  if (!runtime) {
    log(`<span class="text-red-400">[利维坦] 未找到召唤物【${name}】定义。</span>`);
    return;
  }
  leviathanSummons.value.push(runtime);
  log(`<span class="text-violet-300">利维坦召唤了【${name}】。</span>`);
};

const countLeviathanTeamDebuffStacks = (): number => (
  getLeviathanTeamEntities().reduce((sum, entity) => (
    sum + entity.effects.reduce((effectSum, effect) => (
      effectSum + (EFFECT_REGISTRY[effect.type]?.polarity === 'debuff' ? Math.max(0, Math.floor(effect.stacks)) : 0)
    ), 0)
  ), 0)
);

const refreshLeviathanAiFlags = () => {
  if (!isLeviathanBattle) return;
  const aliveSummons = getAliveLeviathanSummons();
  const aliveNames = new Set(aliveSummons.map(summon => summon.name));
  aiFlags.leviathanSummonCount = aliveSummons.length;
  aiFlags.leviathanHasHolyWaterSprite = aliveNames.has('圣水精灵');
  aiFlags.leviathanHasHolyWaterJellyfish = aliveNames.has('圣水水母');
  aiFlags.leviathanHasAbyssShoal = aliveNames.has('深渊鱼群');
  aiFlags.leviathanTeamDebuffStacks = countLeviathanTeamDebuffStacks();
};

const resetLeviathanSummonCardWeight = () => {
  aiFlags.leviathanSummonCardWeight = 10;
  aiFlags.leviathanSummonCardWeightTurn = combatState.value.turn;
};

const MOORE_MIMIC_CARD_KEY = '摩尔·梦境';
const MOORE_MIMIC_CARD_ID = 'enemy_moore_mimic';
const BEHEMOTH_FOOD_CARD_NAMES = ['烤兔腿', '烤肉', '浓汤', '脂肪块'] as const;
const BEHEMOTH_ROASTED_RABBIT_LEG_ID = 'behemoth_food_roasted_rabbit_leg';
const BEHEMOTH_ROAST_MEAT_ID = 'behemoth_food_roast_meat';
const mimicDisplayCards = new WeakMap<CardData, CardData>();
const mooreMimicPlayedThisTurn = ref(false);
const PLAYER_HAND_SLOT_COUNT = 3;
const playerHandSlotByCard = new WeakMap<CardData, number>();

const clampPlayerHandSlot = (slot: number): number => Math.max(0, Math.min(PLAYER_HAND_SLOT_COUNT - 1, Math.floor(slot)));

const firstOpenPlayerHandSlot = (slots: Array<CardData | null>): number => slots.findIndex(card => card === null);

const mergePlayerHandWithDrawnCards = (existingCards: readonly CardData[], drawnCards: readonly CardData[]): CardData[] => {
  const slots: Array<CardData | null> = Array.from({ length: PLAYER_HAND_SLOT_COUNT }, () => null);
  const overflowExisting: CardData[] = [];

  existingCards.slice(0, PLAYER_HAND_SLOT_COUNT).forEach((card, index) => {
    const preferredSlot = clampPlayerHandSlot(playerHandSlotByCard.get(card) ?? index);
    if (slots[preferredSlot]) {
      overflowExisting.push(card);
      return;
    }
    slots[preferredSlot] = card;
  });

  for (const card of overflowExisting) {
    const slot = firstOpenPlayerHandSlot(slots);
    if (slot < 0) break;
    slots[slot] = card;
  }

  for (const card of drawnCards) {
    const slot = firstOpenPlayerHandSlot(slots);
    if (slot < 0) break;
    slots[slot] = card;
  }

  slots.forEach((card, slot) => {
    if (card) {
      playerHandSlotByCard.set(card, slot);
    }
  });

  return slots.filter((card): card is CardData => card !== null);
};

const getOpenPlayerHandSlotCount = (cards: readonly CardData[]): number => (
  PLAYER_HAND_SLOT_COUNT - mergePlayerHandWithDrawnCards(cards, []).length
);

const combatState = ref<CombatState>({
  turn: 1,
  phase: CombatPhase.TURN_START,
  actionsRemaining: 1,
  playerBaseDice: 1,
  enemyBaseDice: 1,
  playerHand: [],
  playerDeck: (() => {
    const deck = toBattleDeck(props.playerDeck);
    return props.preservePlayerDeckOrder ? deck : deck.sort(() => Math.random() - 0.5);
  })(),
  discardPile: [],
  enemyDeck: [...enemyDeck],
  enemyDiscard: [],
  enemyIntentCard: null,
  enemyPredictedPoint: 0,
  playerSelectedCard: null,
  lastPlayedCard: null,
  logs: [`战斗开始！遭遇了 <span class="text-red-500 font-bold">${enemyDisplayName}</span>`],
});

const syncPainPhase = () => {
  if (!painScene || !updatePainPhase(painScene, enemyStats.value)) return;
  const portrait = painPhasePortraits[2];
  if (portrait) transitionPainPortraitTo(portrait);
  log('<span class="text-rose-300">佩恩[转阶段] 水晶圣女苏醒；下回合启用刺晶与新的行动。</span>');
};
watch(() => enemyStats.value.hp, syncPainPhase, { flush: 'sync' });

const recordBattlePainLoss = (side: BattleSide, amount: number, trueDamage: boolean, selfHarm = false) => {
  if (!painScene) return;
  const previousMemory = painScene.effects.find(effect => effect.type === ET.CORRIDOR_MEMORY)?.stacks ?? 0;
  const previousBonus = painScene.nextRollBonus[side];
  recordPainHpLoss(painScene, side, amount, trueDamage, playerStats.value, enemyStats.value, selfHarm);
  if (painScene.nextRollBonus[side] !== previousBonus) pulseSceneEffect(ET.SELF_CHOSEN_PAIN);
  if ((painScene.effects.find(effect => effect.type === ET.CORRIDOR_MEMORY)?.stacks ?? 0) !== previousMemory) {
    pulseSceneEffect(ET.CORRIDOR_MEMORY);
  }
};

const insertPainCurses = (count: number) => {
  if (!painScene) return;
  const allCards = [...combatState.value.playerHand, ...combatState.value.playerDeck, ...combatState.value.discardPile];
  let remaining = Math.max(0, 4 - allCards.filter(card => card.id.startsWith('pain_curse_')).length);
  for (let index = 0; index < count && remaining > 0; index++, remaining--) {
    const card = PAIN_CURSES[Math.floor(Math.random() * PAIN_CURSES.length)]!;
    combatState.value.playerDeck = insertCardIntoDeckRandomly(combatState.value.playerDeck, cloneCardForBattle(card));
    log(`<span class="text-rose-200">佩恩向抽牌堆放入了【${card.name}】。</span>`);
  }
};

const transferPainBleed = (from: BattleSide, to: BattleSide, limit = Number.POSITIVE_INFINITY) => {
  const source = getEntityBySide(from);
  const count = Math.min(limit, getEffectStacks(source, ET.BLEED));
  if (count <= 0) return;
  reduceEffectStacks(source, ET.BLEED, count);
  applyStatusEffectWithRelics(to, ET.BLEED, count, { source: 'pain:transfer', sourceSide: from, lockDecayThisTurn: true });
};

const confirmPainOath = (type: PainOath) => {
  if (!painScene || !pendingPainOaths.value.includes(type)
    || !choosePainOath(painScene, type, combatState.value.turn, playerStats.value)) return;
  pendingPainOaths.value = [];
  if (type === ET.PAIN_OATH_OINTMENT) healForSide('player', Math.ceil(playerStats.value.maxHp * 0.5));
  if (type === ET.PAIN_OATH_CUP) restoreManaForSide('player', 4);
  if (type === ET.PAIN_OATH_SHARE) transferPainBleed('player', 'enemy');
  if (props.trackDiscovery) recordEncounteredEffects([type]);
  pulseSceneEffect(type);
  log(`<span class="text-amber-200">玩家选择了【${getEffectName(type)}】，誓约成为场景效果。</span>`);
  const resolve = resolvePainOathChoice;
  resolvePainOathChoice = null;
  resolve?.();
};

const requestPainOath = async () => {
  if (!painScene) return;
  const available = availablePainOaths(painScene, playerStats.value);
  if (!available.length) return;
  const options = [...available].sort(() => Math.random() - 0.5).slice(0, 3);
  await new Promise<void>(resolve => {
    resolvePainOathChoice = resolve;
    pendingPainOaths.value = options;
  });
};

const getPainOathCard = (type: PainOath): CardData => PAIN_OATH_CARDS.find(card => card.name === type)!;

const cyclePainOathFocus = (event: KeyboardEvent) => {
  const buttons = Array.from(combatRootEl.value?.querySelectorAll<HTMLButtonElement>('.pain-oath-option') ?? []);
  if (!buttons.length) return;
  const index = buttons.findIndex(button => button === document.activeElement);
  buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
};
watch(() => pendingPainOaths.value.length, async count => {
  if (count <= 0) return;
  await nextTick();
  combatRootEl.value?.querySelector<HTMLButtonElement>('.pain-oath-option')?.focus();
});

const processPainTurnStart = () => {
  if (!painScene) return;
  syncPainPhase();
  if (painScene.phase === 2 && !painScene.phaseTwoActive) {
    painScene.phaseTwoActive = true;
    enemyStats.value.minDice += 1;
    enemyStats.value.maxDice += 2;
    changePainThorns(enemyStats.value, 6 - getEffectStacks(enemyStats.value, ET.THORNS));
    insertPainCurses(2);
  }
  if (combatState.value.turn > 1 && enemyStats.value.hp > 0) {
    healForSide('enemy', getEffectStacks(enemyStats.value, ET.PAIN_MEMORY) * 2);
  }
  for (const effect of painScene.effects) {
    const elapsed = combatState.value.turn - (effect.runtimeCounter ?? combatState.value.turn);
    if (elapsed <= 0 || playerStats.value.hp <= 0) continue;
    if (effect.type === ET.PAIN_OATH_WHIP) {
      const { actualDamage } = applyDamageToSideWithRelics('player', playerStats.value, 2, true, '一鞭为我');
      if (actualDamage > 0) pushFloatingNumber('player', actualDamage, 'true', '-');
      if (actualDamage > 0) pulseSceneEffect(effect.type);
    }
    if (effect.type === ET.PAIN_OATH_PILLAR) {
      if (elapsed % 2 === 0) {
        applyStatusEffectWithRelics('player', ET.BLEED, 3, { source: 'pain:oath', sourceSide: 'enemy', lockDecayThisTurn: true });
        pulseSceneEffect(effect.type);
      }
    }
    if (effect.type === ET.PAIN_OATH_CUP && elapsed % 2 === 0) {
      restoreManaForSide('player', 2);
      applyStatusEffectWithRelics('player', ET.WEAKEN, 1, { source: 'pain:oath' });
      pulseSceneEffect(effect.type);
    }
  }
};

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
    ...sceneEffects.value.map((effect) => effect.type),
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
const heavyDamageShake = ref(false);
let heavyDamageShakeToken = 0;
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
  below: boolean;
  previewCard?: CardData;
} | null>(null);

type BattleSide = 'player' | 'enemy';
type CombatOutcome = 'win' | 'lose' | 'escape';
type FloatingNumberKind = 'physical' | 'magic' | 'shield' | 'heal' | 'mana' | 'true';
type ResolvedCardAnimVariant = 'attack' | 'self' | 'fade';
interface ResolvedCardVisualOrigin {
  left: string;
  top: string;
  midX?: string;
  midY?: string;
  targetX?: string;
  targetY?: string;
  targetEndX?: string;
  targetEndY?: string;
}
type HandCardAnimationKind = 'draw' | 'discard' | 'turn_end_in_hand';
type TooltipAlign = 'center' | 'right';
type CardPlayCheckResult = ReturnType<typeof canPlayCard>;

const healthBarImpactTokens = reactive<Record<BattleSide, number>>({
  player: 0,
  enemy: 0,
});

const triggerHealthBarArmorImpact = (side: BattleSide, target: EntityStats) => {
  const mainEntity = side === 'player' ? playerStats.value : enemyStats.value;
  if (toRaw(target) !== toRaw(mainEntity)) return;
  healthBarImpactTokens[side] += 1;
};

const triggerHeavyDamageShake = () => {
  const token = ++heavyDamageShakeToken;
  heavyDamageShake.value = false;
  requestAnimationFrame(() => {
    if (token !== heavyDamageShakeToken) return;
    heavyDamageShake.value = true;
    setTimeout(() => {
      if (token === heavyDamageShakeToken) heavyDamageShake.value = false;
    }, 420);
  });
};

const playerManaBlockedShake = ref(false);
const blockedEffectAnimation = ref<{ side: BattleSide; type: EffectType; token: number } | null>(null);
let playerManaBlockedShakeToken = 0;
let blockedEffectAnimationToken = 0;

const triggerPlayerManaBlockedFeedback = () => {
  const token = ++playerManaBlockedShakeToken;
  playerManaBlockedShake.value = false;
  requestAnimationFrame(() => {
    playerManaBlockedShake.value = true;
    setTimeout(() => {
      if (playerManaBlockedShakeToken === token) {
        playerManaBlockedShake.value = false;
      }
    }, 460);
  });
};

const triggerBlockedEffectFeedback = (side: BattleSide, type: EffectType) => {
  const effect = type === ET.BIND ? 'bind' : type === ET.STUN ? 'stun' : type === ET.CONTROLLED ? 'hypnosis' : null;
  if (effect) presentEffect(getEntityBySide(side), effect);
  const token = ++blockedEffectAnimationToken;
  blockedEffectAnimation.value = null;
  requestAnimationFrame(() => {
    blockedEffectAnimation.value = { side, type, token };
    setTimeout(() => {
      if (blockedEffectAnimation.value?.token === token) {
        blockedEffectAnimation.value = null;
      }
    }, 520);
  });
};

const triggerCardPlayBlockedFeedback = (check: CardPlayCheckResult) => {
  if (check.blockerEffectType) {
    triggerBlockedEffectFeedback('player', check.blockerEffectType);
    return;
  }
  if (check.blockerKind === 'mana') {
    triggerPlayerManaBlockedFeedback();
  }
};

const isBlockedEffectAnimating = (side: BattleSide, type: EffectType): boolean => (
  blockedEffectAnimation.value?.side === side && blockedEffectAnimation.value.type === type
);

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
  targetId?: LeviathanTargetId;
  kind?: FloatingNumberKind;
  text: string;
  heavyDamage?: boolean;
  damageBeforeLimitText?: string;
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
  origin?: ResolvedCardVisualOrigin;
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
const battleFeedback = useBattleFeedback();
onUnmounted(() => { presentationReady = false; });

function feedbackTarget(entity: EntityStats): string {
  if (toRaw(entity) === toRaw(playerStats.value)) return 'player';
  const id = getLeviathanTargetIdByEntity(entity);
  return isLeviathanBattle && id !== 'body' ? `summon:${id}` : 'enemy';
}

function presentEffect(entity: EntityStats, effect: BattleEffectName, phase: 'apply' | 'proc' | 'blocked' = 'proc') {
  if (presentationReady && !endCombatPending.value) battleFeedback.effect(effect, feedbackTarget(entity), phase);
}

/** 次要特效（状态施加、圣遗物触发）：目标身上已有其它特效时省略 */
function presentMinorEffect(entity: EntityStats, effect: BattleEffectName) {
  if (presentationReady && !endCombatPending.value) battleFeedback.effect(effect, feedbackTarget(entity), 'proc', { minor: true });
}

/** 已在伤害结算前播放过专属命中特效的卡牌（本次结算时不再重复播放） */
let cardHitLeadIn: CardData | null = null;

function presentCardHit(entity: EntityStats, card: CardData | undefined, impactDamage: number) {
  if (presentationReady && !endCombatPending.value && card && impactDamage > 0) {
    // 有专属命中特效的卡牌替换默认的物理/魔法命中特效
    const feedback = cardFeedback(card);
    // 结算前已播放过（拼点失败伤害传入的是卡牌副本，按 id 比较）
    if (feedback?.on === 'hit' && cardHitLeadIn && card.id === cardHitLeadIn.id) return;
    battleFeedback.hit(card.type, feedbackTarget(entity), feedback?.on === 'hit' ? feedback.effect : null);
  }
}

/**
 * 有专属命中特效的卡牌：先播放特效，等到特效的「击中时刻」再结算伤害，
 * 让伤害数字与画面同步；多段攻击每一段都单独等待。
 */
async function playCardHitLeadIn(target: EntityStats, card: CardData) {
  const feedback = cardFeedback(card);
  if (!presentationReady || endCombatPending.value || !battleEffectsEnabled.value || feedback?.on !== 'hit') return;
  presentEffect(target, feedback.effect);
  cardHitLeadIn = card;
  await wait(effectImpactSeconds(feedback.effect) * 1000);
}

/** 拼点失败：拼点失败时触发的专属特效；拼点失败时造成伤害的卡牌同样先播放命中特效 */
async function presentClashFailFeedback(side: BattleSide, card: CardData) {
  const feedback = cardFeedback(card);
  if (!feedback || !presentationReady || endCombatPending.value) return;
  if (feedback.on === 'clashFail') {
    presentEffect(feedbackEntityFor(side, feedback.target), feedback.effect);
    return;
  }
  if (feedback.on === 'hit' && card.cardEffects.some(effect => cardEffectMatchesTrigger(effect.triggers, 'on_clash_fail'))) {
    await playCardHitLeadIn(getEntityBySide(side === 'player' ? 'enemy' : 'player'), card);
  }
}

/** 按「自身 / 对手」解析特效目标实体 */
function feedbackEntityFor(source: BattleSide, target: FeedbackTarget): EntityStats {
  return target === 'self' ? getEntityBySide(source) : getEntityBySide(source === 'player' ? 'enemy' : 'player');
}

/** 本场战斗已播放过的「仅首次」卡牌特效（键：出牌方 + 卡名） */
const onceCardFeedbackShown = new Set<string>();

/** 功能牌等「结算后」类卡牌专属特效 */
function presentCardUseFeedback(source: BattleSide, card: CardData) {
  const feedback = cardFeedback(card);
  if (feedback?.on !== 'use') return;
  if (feedback.once) {
    const key = `${source}:${card.name}`;
    if (onceCardFeedbackShown.has(key)) return;
    onceCardFeedbackShown.add(key);
  }
  presentEffect(feedbackEntityFor(source, feedback.target), feedback.effect);
}

/** 闪避成功：有专属特效的闪避牌使用专属特效，否则使用通用闪避特效 */
function presentDodgeFeedback(source: BattleSide, card: CardData) {
  const feedback = cardFeedback(card);
  if (feedback?.on === 'dodge') presentEffect(feedbackEntityFor(source, feedback.target), feedback.effect);
  else presentEffect(getEntityBySide(source), EVENT_EFFECTS.dodge);
}

/** 主动技专属特效（主动技只属于我方；target 为 both 时双方同时播放） */
function presentActiveSkillFeedback(skill: ActiveSkillData) {
  const feedback = activeSkillFeedback(skill);
  if (!feedback) return;
  if (feedback.target === 'both') {
    presentEffect(playerStats.value, feedback.effect);
    presentEffect(getEntityBySide('enemy'), feedback.effect);
    return;
  }
  presentEffect(feedbackEntityFor('player', feedback.target), feedback.effect);
}

function processOnTurnStart(entity: EntityStats, runeTurnAlreadyStarted = false) {
  const whiteTurbid = getEffectStacks(entity, ET.WHITE_TURBID);
  const orgasm = getEffectStacks(entity, ET.ORGASM);
  const result = processEntityTurnStart(entity, { runeTurnAlreadyStarted });
  if (result.isStunned) presentEffect(entity, 'stun');
  if (whiteTurbid > 0) {
    // 白浊作用于持有者的对手（回复其生命并施加侵蚀），特效也播放在对手身上
    const opponent = toRaw(entity) === toRaw(playerStats.value) ? enemyStats.value : playerStats.value;
    presentEffect(opponent, 'slime');
  }
  if (orgasm > 0) presentEffect(entity, 'heart');
  return result;
}
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
interface PendingNextTurnCardEffects {
  source: BattleSide;
  card: CardData;
  finalPoint: number;
  selfEntity: EntityStats;
}
const pendingNextTurnCardEffects = ref<PendingNextTurnCardEffects[]>([]);
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
const systemCardTurnUseCount = ref<Record<BattleSide, Record<string, number>>>({
  player: {},
  enemy: {},
});
const systemCardTurnFlags = ref<Record<BattleSide, Record<string, boolean>>>({
  player: {},
  enemy: {},
});
const systemCardBattleFlags = ref<Record<BattleSide, Record<string, boolean>>>({
  player: {},
  enemy: {},
});
const systemPreviousClashLoss = ref<Record<BattleSide, boolean>>({ player: false, enemy: false });
/** 上一回合是否拼点失败（回合开始时由本回合结果快照而来，供铁拳、自我安慰使用） */
const systemLastTurnClashLoss = ref<Record<BattleSide, boolean>>({ player: false, enemy: false });
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
const activeHandSelectionMode = ref<null | 'purify' | 'appreciate' | 'pawn'>(null);
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
/** 临时金币：本场战斗内视为金币、优先消耗，战斗结束清空 */
const battleTempGold = ref(0);
/** 主动技预约的下回合开始回复魔力 */
const pendingNextTurnSkillMana = ref(0);
/** 主动【余烬回燃】：下回合开始重新施加的燃烧层数 */
const pendingRekindleBurn = ref<Record<BattleSide, number> | null>(null);
/** 主动【延缓】：生效回合；本回合免疫的非真实伤害在下回合开始时转化为燃烧 */
const delayImmunityTurn = ref(-1);
const pendingDelayBurn = ref(0);
/** 【鬼影步】闪避成功后，下一张攻击牌（物理/魔法）的点数加成 */
const ghostStepPendingBonus = ref<Record<BattleSide, number>>({ player: 0, enemy: 0 });
let ghostStepBonusByCard = new WeakMap<CardData, number>();
/** 【融入暗影】本场战斗追踪的原卡；转化后的卡牌记录其原卡，便于恢复 */
const SHADOW_MELD_CARD_ID = 'system_shadow_融入暗影';
let shadowMeldTrackedCards: CardData[] = [];
let cardTransformOrigin = new WeakMap<CardData, CardData>();
/** 主动【埋毒】：该回合结束时不触发中毒的一方（键为被施毒方） */
const poisonSkipTurn = ref<Record<BattleSide, number>>({ player: -1, enemy: -1 });
/** 中毒结算受敏感影响的回合（键为被施毒方） */
const poisonVulnerableTurn = ref<Record<BattleSide, number>>({ player: -1, enemy: -1 });
/** 【蜘蛛】：我方使用闪避牌的回合（敌方中毒结算×1.5） */
const spiderPoisonBoostTurn = ref(-1);
/** 【蜘蛛】：敌方使用闪避牌的回合（敌方受到的敏感加伤×2） */
const spiderVulnerableBoostTurn = ref(-1);
/** 【荆棘甲壳】本回合反击使用的点数 */
const thornShellReflectPoint = ref<Record<BattleSide, number>>({ player: 0, enemy: 0 });
/** 各方本场战斗最近一次打出的魔法牌（咒文复诵） */
const lastPlayedMagicCard = ref<Record<BattleSide, CardData | null>>({ player: null, enemy: null });
/** 【预言】已复制过的卡牌 ID */
/**
 * 【预言】本场战斗已预言过的卡牌（按卡牌原始对象记录，每张牌只能预言一次）。
 * 必须用 shallowRef：普通 ref 会把 Set 变成响应式集合，展开旧集合时得到的是元素的代理而非原始对象，
 * 导致之前预言过的牌查不到（只有最近一张显示为已预言）。
 */
const prophecyCopiedCards = shallowRef<Set<CardData>>(new Set());
/** 【预言】临时复制品 → 原本的预言牌：复制品打出后，下次抽到时复原为预言 */
const prophecyCopyOrigin = new WeakMap<CardData, CardData>();
/** 正在为哪个手牌位置选择预言目标（null 表示未打开选择界面） */
const prophecyPickerHandIdx = ref<number | null>(null);
const PROPHECY_EXHAUSTED_LINES = [
  '所有的岔路都已走尽，未来不再有秘密。',
  '当你知晓了一切答案，便失去了提问的权利。',
  '星辰已然沉默，命运之书翻到了最后一行。',
  '水晶球里只剩下你自己的倒影。',
  '你已窥尽每一种可能，余下的只有注定。',
  '命运的丝线已全部织完，再无可牵之处。',
];
/** 【蓝星瓶】本场战斗剩余魔力 */
const blueStarBottleRemaining = ref(20);
/** 【博学者徽章】本场战斗是否已触发 */
const scholarBadgeTriggered = ref(false);
/** 本场战斗中被消耗、战后需从背包移除的圣遗物 ID */
const consumedRelicIdsThisBattle = ref<string[]>([]);
/** 【万象魔杖】各主动技槽位当前变化的形态（主动技 ID） */
const omniWandFormBySlot = ref<Record<number, string | null>>({});
/** 【万象魔杖】正在选择形态的槽位 */
const omniWandSelectingSlot = ref<number | null>(null);
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
const selectedLeviathanDiceDisplaySummon = computed(() => (
  isLeviathanBattle ? getSelectedLeviathanSummon() : null
));
const currentEnemyBaseDiceForUi = computed(() => (
  selectedLeviathanDiceDisplaySummon.value?.baseDice ?? combatState.value.enemyBaseDice
));
const displayEnemyDice = computed(() => {
  const base = (isEnemyIntentHiddenForPlayer.value ? null : previewEnemyDice.value) ?? currentEnemyBaseDiceForUi.value;
  if (!isEnemyDiceObscured.value) return base;
  return Math.max(0, base + enemyDiceUiNoise.value);
});
const twinEnemyDiceBonus = computed(() => (
  isTwinBattle && dreamControlPercent.value <= 39 ? 2 : 0
));
const effectiveEnemyMinDice = computed(() => Math.max(
  0,
  (selectedLeviathanDiceDisplaySummon.value?.stats.minDice ?? enemyStats.value.minDice) + twinEnemyDiceBonus.value,
));
const effectiveEnemyMaxDice = computed(() => Math.max(
  effectiveEnemyMinDice.value,
  (selectedLeviathanDiceDisplaySummon.value?.stats.maxDice ?? enemyStats.value.maxDice) + twinEnemyDiceBonus.value,
));
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
  previewEnemyDice.value !== null && previewEnemyDice.value !== currentEnemyBaseDiceForUi.value
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
const playerDamageDealtThisTurn = ref(0);
const playerTurnDamageThresholdReached = ref(false);
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
/** 原罪·暴食：本场已打出的次数（决定伤害倍率与回合结束的真实伤害） */
const sinGluttonyPlaysThisBattle = ref(0);
/** 原罪·暴食：累计的回合结束真实伤害百分比（每打出一次，未共鸣 +5%，共鸣 +2%） */
const sinGluttonyDrainPercent = ref(0);
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
const previousEnemyLastCardType = ref<CardType | null>(null);
const previousPlayerFinalPoint = ref<number | null>(null);

type LeviathanTargetId = 'body' | string;
interface LeviathanSummonRuntime {
  id: string;
  name: '圣水精灵' | '圣水水母' | '深渊鱼群';
  def: EnemyDefinition;
  stats: EntityStats;
  deck: CardData[];
  discard: CardData[];
  intentCard: CardData | null;
  baseDice: number;
  rawDice: number;
  portraitUrl: string;
  portraitError: boolean;
  flags: Record<string, any>;
  previousCardType: CardType | null;
  createdTurn: number;
  nextActionTurn: number;
}

const LEVIATHAN_SUMMON_CARD_ID = 'enemy_leviathan_newborn_tide';
const LEVIATHAN_SUMMON_NAMES: LeviathanSummonRuntime['name'][] = ['圣水精灵', '圣水水母', '深渊鱼群'];
const LEVIATHAN_SUMMON_PRIORITY: LeviathanSummonRuntime['name'][] = ['深渊鱼群', '圣水精灵', '圣水水母'];

const leviathanSummons = ref<LeviathanSummonRuntime[]>([]);
const leviathanSelectedTargetId = ref<LeviathanTargetId>('body');
const leviathanEnemyTargetOverride = ref<EntityStats | null>(null);
const leviathanEnemySourceOverride = ref<EntityStats | null>(null);
const leviathanEnemySelfOverride = ref<EntityStats | null>(null);
const leviathanActingSummon = ref<LeviathanSummonRuntime | null>(null);
const leviathanEcologicalRhythmActive = ref(false);
const leviathanMirrorSeaOathPendingPoint = ref(0);
const leviathanMirrorSeaOathActiveTurn = ref(0);
const leviathanTidalLockCheckTurn = ref(0);
const leviathanTidalLockPendingTurn = ref(0);
const leviathanSummonActionsResolvedTurn = ref(0);

const getAliveLeviathanSummons = () => leviathanSummons.value.filter(summon => summon.stats.hp > 0);
const getLeviathanTargetIdByEntity = (entity: EntityStats | null | undefined): LeviathanTargetId => {
  if (!isLeviathanBattle || !entity || entity === enemyStats.value) return 'body';
  return leviathanSummons.value.find(summon => summon.stats === entity)?.id ?? 'body';
};
const pickRandomLeviathanSummonName = (
  names: readonly LeviathanSummonRuntime['name'][],
): LeviathanSummonRuntime['name'] => names[Math.floor(Math.random() * names.length)] ?? LEVIATHAN_SUMMON_NAMES[0]!;
const pickLeviathanSummonName = (): LeviathanSummonRuntime['name'] => {
  const aliveNames = new Set(getAliveLeviathanSummons().map(summon => summon.name));
  const absentNames = LEVIATHAN_SUMMON_NAMES.filter(name => !aliveNames.has(name));
  return pickRandomLeviathanSummonName(absentNames.length > 0 ? absentNames : LEVIATHAN_SUMMON_NAMES);
};
const getLeviathanTeamEntities = (): EntityStats[] => [
  enemyStats.value,
  ...getAliveLeviathanSummons().map(summon => summon.stats),
];
const isLeviathanSummonActionTurn = (summon: LeviathanSummonRuntime): boolean => (
  combatState.value.turn >= Math.max(1, Math.floor(summon.nextActionTurn))
);
const markLeviathanSummonActionOpportunityUsed = (summon: LeviathanSummonRuntime) => {
  summon.nextActionTurn = combatState.value.turn + 2;
};
const getLeviathanEnemyEntity = (): EntityStats => (
  leviathanEnemyTargetOverride.value ?? leviathanEnemySelfOverride.value ?? leviathanEnemySourceOverride.value ?? enemyStats.value
);
const getEntityBySide = (side: RelicSide): EntityStats => (side === 'player' ? playerStats.value : getLeviathanEnemyEntity());

const getRelicRuntimeState = (relicId: string) => {
  if (!relicRuntimeState[relicId]) {
    relicRuntimeState[relicId] = {};
  }
  return relicRuntimeState[relicId]!;
};

/** 本场战斗中已被消耗（弃置/碎裂）的圣遗物不再生效 */
const isRelicConsumedThisBattle = (id: string) => consumedRelicIdsThisBattle.value.includes(id);
const hasActiveRelic = (id: string) => !isRelicConsumedThisBattle(id)
  && activePlayerRelics.some((entry) => entry.relic.id === id && entry.count > 0);
const getActiveRelicCount = (id: string) => (
  isRelicConsumedThisBattle(id) ? 0 : activePlayerRelics.find((entry) => entry.relic.id === id)?.count ?? 0
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
    if (isRelicConsumedThisBattle(entry.relic.id)) continue;
    callback(entry, entry.relic, getRelicRuntimeState(entry.relic.id));
  }
};

const logRelicMessage = (message: string) => {
  log(`<span class="text-amber-300 text-[9px]">[圣遗物] ${message}</span>`);
  // 圣遗物日志以「[名称]」开头：有专属特效的圣遗物在我方身上播放
  const relicName = message.match(/^\[([^\]]+)\]/)?.[1];
  const effect = relicName ? relicFeedback(relicName) : null;
  if (effect) presentMinorEffect(playerStats.value, effect);
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

const hasTakenDamageThisTurn = (side: BattleSide): boolean => (
  Math.max(0, Math.floor(damageHitTakenThisTurn.value[side] ?? 0)) > 0
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

/** 淬毒刃：每场战斗第一次对敌方造成直接伤害时，使其获得等量的生命上限削减 */
const VENOM_BLADE_RELIC_ID = 'system_shadow_venom_blade';
const applyVenomBladeOnFirstDirectDamage = (target: EntityStats, damage: number) => {
  const count = getActiveRelicCount(VENOM_BLADE_RELIC_ID);
  if (count <= 0 || damage <= 0) return;
  const state = getRelicRuntimeState(VENOM_BLADE_RELIC_ID);
  if (state.triggered) return;
  state.triggered = true;
  const stacks = Math.floor(damage) * count;
  const maxHpBefore = target.maxHp;
  if (applyStatusEffectWithRelics('enemy', ET.MAX_HP_REDUCTION, stacks, { source: `relic:${VENOM_BLADE_RELIC_ID}`, sourceSide: 'player' })) {
    logRelicMessage(`[淬毒刃] 首次直接伤害 ${Math.floor(damage)} 点，敌方生命上限 ${maxHpBefore} → ${target.maxHp}。`);
  }
};

/**
 * 曼陀罗：敌方每有 10 点中毒量获得 1 层虚弱，最多 4 层（每件）。
 * 虚弱不会自然衰减，这里记录由曼陀罗施加的层数，按当前中毒量增减到目标值。
 */
const DATURA_RELIC_ID = 'system_corruption_relic_09';
const syncDaturaWeaken = () => {
  const count = getActiveRelicCount(DATURA_RELIC_ID);
  if (count <= 0) return;
  const state = getRelicRuntimeState(DATURA_RELIC_ID);
  const enemy = enemyStats.value;
  const applied = Math.max(0, Math.floor(Number(state.appliedWeaken ?? 0)));
  const target = Math.min(4, Math.floor(Math.max(0, getEffectStacks(enemy, ET.POISON_AMOUNT)) / 10)) * count;
  if (target === applied) return;
  if (target > applied) {
    if (applyStatusEffectWithRelics('enemy', ET.WEAKEN, target - applied, { source: `relic:${DATURA_RELIC_ID}`, sourceSide: 'player' })) {
      state.appliedWeaken = target;
      logRelicMessage(`[曼陀罗] 敌方中毒量 ${getEffectStacks(enemy, ET.POISON_AMOUNT)}，虚弱提升至 ${target} 层（曼陀罗施加）。`);
    }
    return;
  }
  reduceEffectStacks(enemy, ET.WEAKEN, applied - target);
  state.appliedWeaken = target;
  logRelicMessage(`[曼陀罗] 敌方中毒量下降，曼陀罗施加的虚弱降至 ${target} 层。`);
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
    feedbackEffect?: BattleEffectName;
    gaiaShared?: boolean;
  },
): ReturnType<typeof applyDamageToEntity> => {
  const damageOptions = options ?? {};
  const incoming = Math.max(0, Math.floor(damage));
  const twinLowControlTrueDamage =
    side === 'player'
    && damageOptions.sourceSide === 'enemy'
    && isTwinBattle
    && dreamControlPercent.value <= 24;
  let effectiveTrueDamage = isTrueDamage || twinLowControlTrueDamage;
  let effectiveIncoming = incoming;
  const painDamageSource = painScene && damageOptions.sourceSide && damageOptions.sourceSide !== side
    ? damageOptions.sourceSide : null;
  if (painScene && painDamageSource) {
    effectiveIncoming = painOutgoingDamage(painScene, painDamageSource, effectiveIncoming, combatState.value.turn);
  }
  if (damageOptions.isDirectDamage && damageOptions.card?.swarmAttack && isTwinEntity(target)) {
    effectiveIncoming = Math.max(0, Math.floor(effectiveIncoming * 2));
  }
  let adjusted = side === 'player' && !painScene && !damageOptions.gaiaShared
    ? applyPlayerHemostaticValveDamageCap(effectiveIncoming, reason)
    : effectiveIncoming;
  if (side === 'player' && !painScene && !damageOptions.gaiaShared) {
    adjusted = applyPlayerLiverMarkDamageReduction(adjusted, reason);
  }
  if (
    side === 'player'
    && damageOptions.isDirectDamage
    && damageOptions.sourceSide === 'enemy'
    && damageOptions.card
    && (damageOptions.card.type === CardType.PHYSICAL || damageOptions.card.type === CardType.MAGIC)
    && combatState.value.playerHand.some(handCard => handCard.id === 'system_destruction_前方高能')
  ) {
    adjusted = Math.max(0, adjusted - 4);
    log('<span class="text-zinc-300">手牌中的【过载预警】使本次受到的伤害 -4。</span>');
  }
  if (side === 'player' && !effectiveTrueDamage && adjusted > 0 && delayImmunityTurn.value === combatState.value.turn) {
    pendingDelayBurn.value += adjusted;
    pushFloatingText('player', '延缓', 'text-orange-300');
    log(`<span class="text-orange-300">我方【延缓】免疫了 ${adjusted} 点伤害，下回合开始转化为燃烧（累计 ${pendingDelayBurn.value}）。</span>`);
    return { actualDamage: 0, logs: [], limitOverflow: 0 };
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
      const { actualDamage: actualReflectedDamage, logs: reflectedLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
        reflectedSide,
        reflectedTarget,
        reflectedDamage,
        effectiveTrueDamage,
        '棱镜魔法反弹',
        { sourceSide: side, isDirectDamage: true, card: damageOptions.card },
      );
      if (actualReflectedDamage > 0) {
        pushFloatingNumber(reflectedSide, actualReflectedDamage, effectiveTrueDamage ? 'true' : 'magic', '-', { damageBeforeLimit });
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
    return { actualDamage: 0, logs: [], limitOverflow: 0 };
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
  if (side === 'player' && getActiveRelicCount('system_destruction_relic_06') > 0) {
    const steelHeartState = getRelicRuntimeState('system_destruction_relic_06');
    const takenThisTurn = Math.max(0, Math.floor(Number(steelHeartState.damageTakenThisTurn ?? 0)));
    const limit = Math.max(1, Math.floor(target.maxHp / 2));
    adjusted = Math.min(adjusted, Math.max(0, limit - takenThisTurn));
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
  const targetMaxHpBeforeDamage = Math.max(0, Math.floor(target.maxHp));
  const armorBeforeDamage = getEffectStacks(target, ET.ARMOR);
  const barrierBeforeDamage = getEffectStacks(target, ET.BARRIER);
  if (painScene) {
    adjusted = painIncomingDamage(painScene, side, adjusted, effectiveTrueDamage);
    if (side === 'player') adjusted = applyPlayerLiverMarkDamageReduction(applyPlayerHemostaticValveDamageCap(adjusted, reason), reason);
  }
  const phaseTransitionFloor = Math.max(0, getEffectStacks(target, ET.PHASE_TRANSITION));
  if (phaseTransitionFloor > 0 && target.hp > phaseTransitionFloor) {
    adjusted = Math.min(adjusted, Math.max(0, target.hp - phaseTransitionFloor));
  }
  if (gaiaState && side === 'enemy' && !effectiveTrueDamage && adjusted > 0) {
    const membrane = findEffect(target, ET.FETAL_MEMBRANE);
    if (membrane && membrane.stacks > 0 && gaiaState.membraneTurn === combatState.value.turn) {
      reduceEffectStacks(target, ET.FETAL_MEMBRANE, 1);
      adjusted = Math.floor(adjusted * 0.3);
      gaiaState.membraneConnections += Math.max(0, changeGaiaLinks(1, '胎膜接入'));
      log('<span class="text-emerald-300">[胎膜] 本次非真实伤害降低70%。</span>');
    }
  }
  const gaiaPlayerProtected = !!gaiaState && side === 'player' && (
    damageOptions.gaiaShared || damageOptions.sourceSide === 'enemy'
  );
  const minimumHp = gaiaState && ((side === 'enemy' && gaiaState.connection > 0) || gaiaPlayerProtected) ? 1 : 0;
  const result: ReturnType<typeof applyDamageToEntity> = damageOptions.gaiaShared
    ? applyGaiaSharedHpLoss(target, adjusted, minimumHp)
    : applyDamageToEntity(target, adjusted, effectiveTrueDamage, {
      disableRevive: shouldDisableReviveForSide(side),
      swarmAttack: !!damageOptions.card?.swarmAttack,
      minimumHp,
    });
  if (
    side === 'enemy'
    && damageOptions.sourceSide === 'player'
    && damageOptions.isDirectDamage
    && !damageOptions.gaiaShared
    && result.actualDamage > 0
  ) {
    playerDamageDealtThisTurn.value += result.actualDamage;
    if (playerDamageDealtThisTurn.value > 50 && !playerTurnDamageThresholdReached.value) {
      playerTurnDamageThresholdReached.value = true;
      emit('playerTurnDamageThresholdReached');
    }
    applyVenomBladeOnFirstDirectDamage(target, result.actualDamage);
  }
  if (gaiaState && side === 'enemy') gaiaState.damageTakenThisTurn += result.actualDamage;
  if (result.preventedLethal) processGaiaLethalProtection(side);
  if (gaiaState && !effectiveTrueDamage && !damageOptions.gaiaShared && result.actualDamage > 0) {
    shareGaiaDamage(side, result.actualDamage);
  }
  if (result.actualDamage > targetMaxHpBeforeDamage * 0.25) {
    triggerHeavyDamageShake();
  }
  const armorAfterDamage = getEffectStacks(target, ET.ARMOR);
  const armorWasConsumed = armorAfterDamage < armorBeforeDamage;
  if (armorWasConsumed) presentEffect(target, 'armor');
  if (getEffectStacks(target, ET.BARRIER) < barrierBeforeDamage) presentEffect(target, EVENT_EFFECTS.barrierAbsorb);
  if (result.actualDamage <= 0 && armorWasConsumed) {
    triggerHealthBarArmorImpact(side, target);
  }
  if (side === 'player' && getActiveRelicCount('system_destruction_relic_06') > 0) {
    const steelHeartState = getRelicRuntimeState('system_destruction_relic_06');
    steelHeartState.damageTakenThisTurn = Math.max(0, Math.floor(Number(steelHeartState.damageTakenThisTurn ?? 0))) + result.actualDamage;
  }
  if (damageOptions.feedbackEffect) {
    presentEffect(target, damageOptions.feedbackEffect, result.actualDamage > 0 ? 'proc' : 'blocked');
  }
  if (damageOptions.isDirectDamage && !damageOptions.feedbackEffect) {
    presentCardHit(target, damageOptions.card, adjusted);
  }
  processPleasureDamageFeedback(side, target, result.limitOverflow, result.actualDamage, reason);
  recordBattlePainLoss(side, Math.max(result.actualDamage, hpBeforeDamage - target.hp), effectiveTrueDamage);
  addDamageHitTakenThisCombat(side, result.actualDamage);
  if (damageOptions.isDirectDamage) {
    addDirectDamageTakenThisTurn(side, result.actualDamage);
  }
  if (
    damageOptions.isDirectDamage
    && damageOptions.card?.swarmAttack
    && result.actualDamage > 0
  ) {
    const intangible = findEffect(target, ET.INTANGIBLE);
    if (intangible && intangible.stacks > 0) {
      intangible.runtimeCounter = Math.max(0, Math.floor(intangible.runtimeCounter ?? 0)) + 1;
      const targetLabel = side === 'player' ? '我方' : '敌方';
      log(`<span class="text-violet-300">${targetLabel}[无形] 受到群攻伤害，下一次触发失效（累计跳过 ${intangible.runtimeCounter} 次）。</span>`);
    }
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
    if (side === 'player' && damageOptions.sourceSide === 'enemy') {
      grantLeviathanGenesisFromSummonDamage('');
    }
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
  if (side === 'player' && result.actualDamage > 0) {
    const piggyCount = getActiveRelicCount('system_wealth_piggy_bank');
    if (piggyCount > 0) {
      const piggyState = getRelicRuntimeState('system_wealth_piggy_bank');
      const triggers = Math.max(0, Math.floor(Number(piggyState.triggers ?? 0)));
      piggyState.triggers = triggers + 1;
      if (triggers < 3) {
        const gained = changeSystemGold(piggyCount);
        logRelicMessage(`[猪猪存钱罐] 受到伤害，获得 ${gained} 金币（${triggers + 1}/3）。`);
      } else {
        const gained = gainTempGold(piggyCount);
        logRelicMessage(`[猪猪存钱罐] 受到伤害，获得 ${gained} 临时金币。`);
      }
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
        const { actualDamage: actualReflectedDamage, logs: reflectedLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
          reflectedSide,
          reflectedTarget,
          reflectedDamage,
          false,
          '共损返还',
          { skipCoDamage: true },
        );
        if (actualReflectedDamage > 0) {
          pushFloatingNumber(reflectedSide, actualReflectedDamage, 'physical', '-', { damageBeforeLimit });
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
  const mirrorRegeneration = findEffect(target, ET.REGENERATION);
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
  options?: { skipHeartMark?: boolean; sourceSide?: BattleSide; isDirectDamage?: boolean; dreamControlKind?: 'direct' | 'status'; card?: CardData },
): number => {
  const damageOptions = options ?? {};
  let incoming = Math.max(0, Math.floor(damage));
  const painDamageSource = painScene && damageOptions.sourceSide && damageOptions.sourceSide !== side
    ? damageOptions.sourceSide : null;
  if (painScene && painDamageSource) {
    incoming = painOutgoingDamage(painScene, painDamageSource, incoming, combatState.value.turn);
  }
  if (painScene) incoming = painIncomingDamage(painScene, side, incoming, true);
  if (incoming <= 0) return 0;
  let adjusted = side === 'player'
    ? applyPlayerLiverMarkDamageReduction(applyPlayerHemostaticValveDamageCap(incoming, reason), reason)
    : incoming;
  const phaseTransitionFloor = Math.max(0, getEffectStacks(target, ET.PHASE_TRANSITION));
  if (phaseTransitionFloor > 0 && target.hp > phaseTransitionFloor) {
    adjusted = Math.min(adjusted, Math.max(0, target.hp - phaseTransitionFloor));
  }
  const hpBeforeConversion = target.hp;
  const mirrorConverted = convertDamageByMirrorRegeneration(target, adjusted);
  if (mirrorConverted !== null) {
    recordBattlePainLoss(side, Math.max(0, hpBeforeConversion - target.hp), false);
    const label = side === 'player' ? '我方' : '敌方';
    log(`<span class="text-violet-300">${label}[再生] 免疫 ${adjusted} 点伤害，并转化为 ${mirrorConverted} 点生命上限削减。</span>`);
    if (target.maxHp <= 0) {
      log(`<span class="text-violet-300">${label}[再生] 生命上限归零，镜像崩解。</span>`);
    }
    return 0;
  }
  const before = target.hp;
  const gaiaMinimumHp = gaiaState && target.maxHp > 0 && (
    (side === 'enemy' && gaiaState.connection > 0)
    || (side === 'player' && damageOptions.sourceSide === 'enemy')
  ) ? Math.min(1, before) : 0;
  target.hp = Math.max(gaiaMinimumHp, target.hp - adjusted);
  const actualDamage = Math.max(0, before - target.hp);
  if (gaiaMinimumHp > 0 && adjusted >= before) processGaiaLethalProtection(side);
  if (gaiaState && side === 'enemy' && !reason.includes('自伤')) {
    gaiaState.damageTakenThisTurn += actualDamage;
  }
  if (damageOptions.isDirectDamage) presentCardHit(target, damageOptions.card, actualDamage);
  recordBattlePainLoss(side, actualDamage, true, true);
  processPleasureDamageFeedback(side, target, 0, actualDamage, reason);
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
    if (side === 'player' && damageOptions.sourceSide === 'enemy') {
      grantLeviathanGenesisFromSummonDamage('');
    }
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
  if (side === 'player' && painScene?.armorBlockedTurn === combatState.value.turn) return 0;
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

/** 按卡牌获得护甲的规则获得护甲（受铜、钻石、色欲之书等加成），返回实际增加量 */
const gainArmorAsCardEffect = (side: BattleSide, amount: number, source: string, reason: string): number => {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0) return 0;
  const target = getEntityBySide(side);
  const before = getEffectStacks(target, ET.ARMOR);
  if (!applyStatusEffectWithRelics(side, ET.ARMOR, value, { source })) return 0;
  const added = Math.max(0, getEffectStacks(target, ET.ARMOR) - before);
  if (added > 0) {
    pushFloatingNumber(side, added, 'shield', '+', { targetEntity: target });
    if (side === 'player') handlePlayerArmorGainFromSingleEvent(added, reason);
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
  let value = Math.max(0, Math.floor(amount));
  if (value <= 0) return 0;
  if (side === 'player') value += getActiveRelicCount('alchemy_lust_book');
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
  options?: { overflowToArmor?: boolean; sourceSide?: RelicSide; reason?: string; gaiaShared?: boolean },
): { healed: number; overflow: number; convertedDamage: number } => {
  const baseValue = Math.max(0, Math.floor(amount));
  if (baseValue <= 0) return { healed: 0, overflow: 0, convertedDamage: 0 };

  let value = baseValue;
  if (side === 'player' && !options?.gaiaShared) {
    const healAmpCount = getActiveRelicCount('bloodpool_crimson_plasma');
    if (healAmpCount > 0) {
      value = Math.max(0, Math.floor(value * (1 + 0.25 * healAmpCount)));
    }
    const lifePendantCount = getActiveRelicCount('basic_life_pendant');
    if (lifePendantCount > 0) {
      value += lifePendantCount;
    }
    value += getActiveRelicCount('alchemy_lust_book');
  }
  const target = getEntityBySide(side);
  if (gaiaState && target.hp <= 0) return { healed: 0, overflow: 0, convertedDamage: 0 };
  if (isTwinEntity(target) && !options?.gaiaShared) {
    value = Math.max(0, Math.floor(value * 2));
  }
  if (painScene && !options?.gaiaShared) value = painHealingAmount(painScene, side, value);
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
    presentEffect(target, 'heal');
    pushFloatingNumber(side, healed, 'heal', '+');
    if (side === 'player' && !options?.gaiaShared) {
      const rubyCount = getActiveRelicCount('system_wealth_relic_08');
      const emeraldCount = getActiveRelicCount('system_wealth_relic_12');
      if (rubyCount > 0) addArmorForSide('player', healed * rubyCount);
      if (emeraldCount > 0) changeManaWithShock('player', healed * emeraldCount, '绿宝石');
    }
    if (side === 'player') {
      triggerLeviathanMirrorSeaOathRecovery(healed);
    }
    if (gaiaState && !options?.gaiaShared) {
      const shared = getGaiaSharedAmount(gaiaState.connection, healed, 'heal');
      if (shared > 0) {
        const recipient = oppositeSide(side);
        const result = healForSide(recipient, shared, {
          sourceSide: side,
          reason: '供养连接共享治疗',
          gaiaShared: true,
        });
        log(`<span class="text-emerald-300">[供养连接] ${recipient === 'player' ? '我方' : '盖亚'}共享 ${result.healed} 点治疗。</span>`);
      }
    }
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

interface GaiaBattleState {
  connection: number;
  blockedTurn: number;
  membraneTurn: number;
  membraneConnections: number;
  bedTurn: number;
  damageTakenThisTurn: number;
  criticalCorrosionTurn: number;
  turnEndProcessed: number;
  openingApplied: boolean;
}

function createGaiaBattleState(): GaiaBattleState {
  return {
    connection: 2,
    blockedTurn: -1,
    membraneTurn: -1,
    membraneConnections: 0,
    bedTurn: -1,
    damageTakenThisTurn: 0,
    criticalCorrosionTurn: -1,
    turnEndProcessed: -1,
    openingApplied: false,
  };
}

function changeGaiaConnection(state: GaiaBattleState, delta: number, turn: number): number {
  if (delta > 0 && state.blockedTurn === turn) return 0;
  const previous = state.connection;
  state.connection = Math.max(0, Math.min(6, previous + Math.trunc(delta)));
  return state.connection - previous;
}

function syncGaiaConnectionEffects(state: GaiaBattleState, player: EntityStats, enemy: EntityStats): void {
  for (const entity of [player, enemy]) {
    entity.effects = entity.effects.filter(effect => effect.type !== ET.NURTURE_CONNECTION);
    if (state.connection > 0) {
      entity.effects.push({
        type: ET.NURTURE_CONNECTION,
        stacks: state.connection,
        polarity: 'special',
        source: 'battle:gaia',
      });
    }
  }
}

function getGaiaSharedAmount(connection: number, actualAmount: number, kind: 'damage' | 'heal'): number {
  const percentPerStack = kind === 'damage' ? 10 : 12;
  return Math.floor(Math.max(0, actualAmount) * Math.max(0, Math.min(6, connection)) * percentPerStack / 100);
}

/** 共享量已经结算完成，直接扣除生命，避免集群、限伤等再次修改传递比例。 */
function applyGaiaSharedHpLoss(target: EntityStats, damage: number, minimumHp: number) {
  const before = Math.max(0, target.hp);
  const floor = target.maxHp > 0 ? Math.min(before, Math.max(0, minimumHp)) : 0;
  const actualDamage = Math.min(Math.max(0, Math.floor(damage)), Math.max(0, before - floor));
  target.hp = before - actualDamage;
  return {
    actualDamage,
    logs: [`受到${actualDamage}点共享真实伤害(HP: ${target.hp}/${target.maxHp})。`],
    limitOverflow: 0,
    preventedLethal: floor > 0 && damage >= before,
  };
}

function getGaiaConnectionCardCount(connection: number): number {
  return connection >= 2 ? 1 : 0;
}

function getGaiaBedArmor(connection: number, finalPoint: number): number {
  const stacks = Math.max(0, Math.min(6, connection));
  return Math.floor((5 - Math.ceil(stacks / 2)) * Math.max(0, finalPoint));
}

function getGaiaOpeningMaxHpGain(maxHp: number): number {
  return Math.max(0, 80 - Math.max(0, Math.floor(maxHp)));
}

const syncGaiaSeverCards = (insertMissing = false) => {
  if (!gaiaState) return;
  const expected = getGaiaConnectionCardCount(gaiaState.connection);
  let kept = 0;
  let hand = combatState.value.playerHand.filter(card => (
    card.id !== GAIA_CARD.SEVER || ++kept <= expected
  ));
  // 连接卡由连接层数维护，不进入普通抽牌循环。
  combatState.value.playerDeck = combatState.value.playerDeck.filter(card => card.id !== GAIA_CARD.SEVER);
  combatState.value.discardPile = combatState.value.discardPile.filter(card => card.id !== GAIA_CARD.SEVER);
  if (insertMissing) {
    const sever = getCardByName('切断连接');
    const existing = hand.filter(card => card.id === GAIA_CARD.SEVER).length;
    if (sever && existing < expected) {
      const missing = expected - existing;
      while (hand.length + missing > PLAYER_HAND_SLOT_COUNT) {
        const index = hand.findLastIndex(card => card.id !== GAIA_CARD.SEVER);
        if (index < 0) break;
        const [returned] = hand.splice(index, 1);
        combatState.value.playerDeck.unshift(returned!);
        log(`<span class="text-zinc-300">[供养连接] 【${returned!.name}】暂回抽牌堆，为连接卡保留位置。</span>`);
      }
      const inserted = Array.from({ length: missing }, () => cloneCardForBattle(sever));
      hand = mergePlayerHandWithDrawnCards(hand, inserted);
      combatState.value.playerHand = hand;
      applyOnDrawCardEffects(inserted);
    }
  }
  combatState.value.playerHand = mergePlayerHandWithDrawnCards(hand, []);
};

const changeGaiaLinks = (delta: number, reason: string): number => {
  if (!gaiaState) return 0;
  const changed = changeGaiaConnection(gaiaState, delta, combatState.value.turn);
  syncGaiaConnectionEffects(gaiaState, playerStats.value, enemyStats.value);
  syncGaiaSeverCards();
  if (changed !== 0) {
    log(`<span class="text-emerald-300">[供养连接] ${reason}，连接${changed > 0 ? '+' : ''}${changed}，当前${gaiaState.connection}层。</span>`);
  } else if (delta > 0 && gaiaState.blockedTurn === combatState.value.turn) {
    log('<span class="text-zinc-300">[切断连接] 本回合阻止重新接入。</span>');
  }
  return changed;
};

const processGaiaLethalProtection = (side: BattleSide) => {
  if (!gaiaState) return;
  if (side === 'enemy') {
    log('<span class="text-emerald-300">[万物之母] 连接尚未断开，盖亚保留1点生命。</span>');
  } else if (gaiaState.criticalCorrosionTurn !== combatState.value.turn) {
    gaiaState.criticalCorrosionTurn = combatState.value.turn;
    applyStatusEffectWithRelics('player', ET.CORROSION, 3, { source: 'battle:gaia:critical' });
    log('<span class="text-fuchsia-300">[万物之母] 维持濒死生命，侵蚀+3；本回合不再因此增加侵蚀。</span>');
  }
};

const shareGaiaDamage = (side: BattleSide, actualDamage: number) => {
  if (!gaiaState) return;
  const shared = getGaiaSharedAmount(gaiaState.connection, actualDamage, 'damage');
  if (shared <= 0) return;
  const recipient = oppositeSide(side);
  const target = getEntityBySide(recipient);
  if (target.hp <= 0) return;
  const result = applyDamageToSideWithRelics(recipient, target, shared, true, '供养连接共享伤害', {
    sourceSide: side,
    gaiaShared: true,
  });
  if (result.actualDamage > 0) pushFloatingNumber(recipient, result.actualDamage, 'true', '-');
  log(`<span class="text-fuchsia-300">[供养连接] ${recipient === 'player' ? '我方' : '盖亚'}承受 ${result.actualDamage} 点共享真实伤害。</span>`);
};

const initializeGaiaBattle = () => {
  if (!gaiaState || gaiaState.openingApplied) return;
  gaiaState.openingApplied = true;
  const gain = getGaiaOpeningMaxHpGain(playerStats.value.maxHp);
  if (gain > 0) {
    applyStatusEffectWithRelics('player', ET.TEMP_MAX_HP, gain, { source: GAIA_CARD.CRADLE });
  }
  log(`<span class="text-emerald-300">盖亚使用【容生之囊】，我方临时生命上限+${gain}；建立2层供养连接。</span>`);
};

const applyGaiaCard = (source: BattleSide, card: CardData, finalPoint: number): boolean => {
  if (!gaiaState) return false;
  if (source === 'player' && card.id === GAIA_CARD.SEVER) {
    gaiaState.blockedTurn = combatState.value.turn;
    changeGaiaLinks(-2, '切断连接');
    return true;
  }
  if (source !== 'enemy') return false;
  if (card.id === GAIA_CARD.CRADLE) {
    initializeGaiaBattle();
  } else if (card.id === GAIA_CARD.MEMBRANE) {
    gaiaState.membraneTurn = combatState.value.turn;
    gaiaState.membraneConnections = 0;
    removeEffect(enemyStats.value, ET.FETAL_MEMBRANE);
    applyStatusEffectWithRelics('enemy', ET.FETAL_MEMBRANE, 2, { source: card.id });
  } else if (card.id === GAIA_CARD.BED) {
    gaiaState.bedTurn = combatState.value.turn;
    const armor = getGaiaBedArmor(gaiaState.connection, finalPoint);
    applyStatusEffectWithRelics('enemy', ET.ARMOR, armor, { source: card.id });
    log(`<span class="text-cyan-300">[温床合拢] 获得${armor}点护甲。</span>`);
  } else if (card.id === GAIA_CARD.REFLOW) {
    const loss = Math.min(Math.max(0, enemyStats.value.hp - 1), Math.floor(finalPoint * 3));
    const actualLoss = applyDirectHpLossWithRelics('enemy', enemyStats.value, loss, '生命回流自伤');
    if (actualLoss > 0) pushFloatingNumber('enemy', actualLoss, 'true', '-');
    healForSide('enemy', finalPoint * (3 + gaiaState.connection));
    applyStatusEffectWithRelics('enemy', ET.VULNERABLE, 2, { source: card.id });
  } else if (card.id === GAIA_CARD.STAY) {
    changeGaiaLinks(1, '请留在这里');
    healForSide('enemy', finalPoint * 3);
    applyStatusEffectWithRelics('enemy', ET.VULNERABLE, 2, { source: card.id });
  } else {
    return false;
  }
  return true;
};

const processGaiaTurnEnd = () => {
  if (!gaiaState || gaiaState.turnEndProcessed === combatState.value.turn) return;
  gaiaState.turnEndProcessed = combatState.value.turn;
  if (playerStats.value.hp > 0 && enemyStats.value.hp > 0) {
    if (gaiaState.membraneTurn === combatState.value.turn && gaiaState.membraneConnections <= 0) {
      changeGaiaLinks(2, '胎膜完成接入');
    }
    if (gaiaState.bedTurn === combatState.value.turn && gaiaState.damageTakenThisTurn <= 0) {
      changeGaiaLinks(1, '温床未受伤');
    }
    const corrosion = Math.floor(gaiaState.connection / 2);
    if (corrosion > 0) {
      applyStatusEffectWithRelics('player', ET.CORROSION, corrosion, { source: 'battle:gaia:connection' });
      log(`<span class="text-fuchsia-300">[供养连接] 回合结束，侵蚀+${corrosion}。</span>`);
    }
  }
  removeEffect(enemyStats.value, ET.FETAL_MEMBRANE);
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
  options?: RelicApplyEffectOptions & { sourceSide?: RelicSide },
): boolean => {
  if (side === 'player' && effectType === ET.ARMOR && painScene?.armorBlockedTurn === combatState.value.turn) return false;
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
  if (side === 'player' && effectType === ET.ARMOR) {
    const diamondCount = getActiveRelicCount('system_wealth_relic_20');
    const copperCount = getActiveRelicCount('system_wealth_relic_17');
    const lustBookCount = getActiveRelicCount('alchemy_lust_book');
    value = value * Math.pow(2, Math.max(0, diamondCount)) + Math.max(0, copperCount) + Math.max(0, lustBookCount);
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
    temporary: options?.temporary,
  });
  if (applied) {
    const statusEffect = statusFeedback(effectType);
    if (statusEffect) presentMinorEffect(target, statusEffect);
  }
  if (painScene && applied && side === 'player' && effectType === ET.BLEED
    && (options?.sourceSide === 'enemy' || options?.source?.startsWith('enemy_pain_'))) {
    addPainMemory(enemyStats.value, 1);
  }
  if (applied && effectType === ET.ARMOR) {
    const armorGained = Math.max(0, getEffectStacks(target, ET.ARMOR) - armorBeforeApply);
    applyCorrodeOnArmorGain(side, armorGained, options?.source ? `因 ${options.source} ` : '');
    const pebbleCount = side === 'player' ? getActiveRelicCount('system_wealth_relic_04') : 0;
    if (armorGained > 0 && pebbleCount > 0 && enemyStats.value.hp > 0) {
      const pebbleDamage = applyDirectHpLossWithRelics(
        'enemy',
        enemyStats.value,
        pebbleCount,
        '鹅卵石',
        { sourceSide: 'player', isDirectDamage: true },
      );
      if (pebbleDamage > 0) pushFloatingNumber('enemy', pebbleDamage, 'physical', '-');
      logRelicMessage(`[鹅卵石] 获得护甲时造成 ${pebbleDamage} 点伤害。`);
    }
  }
  const hpLossFromNonLivingConversion = Math.max(0, hpBeforeApply - target.hp);
  if (hpLossFromNonLivingConversion > 0) recordBattlePainLoss(side, hpLossFromNonLivingConversion, isNonLivingPenaltyEffect);
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

const processPleasureDamageFeedback = (
  targetSide: BattleSide,
  target: EntityStats,
  limitOverflow: number,
  actualDamage: number,
  reason: string,
) => {
  if (getEffectStacks(target, ET.PLEASURE) <= 0) return;

  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  if (actualDamage > 0) {
    presentEffect(target, 'heart');
    applyStatusEffectWithRelics(targetSide, ET.FATIGUE, 1, { source: 'effect:pleasure' });
    log(`<span class="text-amber-300">${targetLabel}[欢愉] ${reason}受到非零伤害，获得 1 层疲劳。</span>`);
  }

  const overflow = Math.max(0, Math.floor(limitOverflow));
  if (overflow <= 0) return;

  const previous = Math.max(0, Math.floor(target.pleasureOverflowDamage ?? 0));
  const next = previous + overflow;
  target.pleasureOverflowDamage = next;
  const fatigueGain = Math.floor(next / 10) - Math.floor(previous / 10);
  const stigmataGain = Math.floor(next / 25) - Math.floor(previous / 25);
  const orgasmGain = Math.floor(next / 60) - Math.floor(previous / 60);
  const opponentSide = oppositeSide(targetSide);
  const gains: string[] = [];
  if (fatigueGain > 0) {
    applyStatusEffectWithRelics(opponentSide, ET.FATIGUE, fatigueGain, { source: 'effect:pleasure' });
    gains.push(`${fatigueGain} 层疲劳`);
  }
  if (stigmataGain > 0) {
    applyStatusEffectWithRelics(opponentSide, ET.STIGMATA, stigmataGain, { source: 'effect:pleasure' });
    gains.push(`${stigmataGain} 层圣痕`);
  }
  if (orgasmGain > 0) {
    applyStatusEffectWithRelics(opponentSide, ET.ORGASM, orgasmGain, { source: 'effect:pleasure' });
    gains.push(`${orgasmGain} 层性兴奋`);
  }
  if (gains.length > 0) {
    log(`<span class="text-fuchsia-300">${targetLabel}[欢愉] 限伤溢出转化，为对手施加 ${gains.join('、')}。</span>`);
  }
};

const createPlayerLifecycleContext = (
  relic: RelicData,
  count: number,
  state: Record<string, unknown>,
): RelicLifecycleHookContext => {
  state.gold = Math.max(0, Math.floor(Number(gameStore.statData._金币 ?? 0)));
  state.currentPoint = combatState.value.playerBaseDice;
  return {
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
        temporary: options?.temporary,
      })
    ),
    addArmor: addArmorForSide,
    restoreMana: restoreManaForSide,
    spendMana: spendManaWithShock,
    heal: healForSide,
    addRerollCharges: changeRerollCharges,
    getRerollCharges,
  };
};

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

/** 我方攻击命中敌方后：事件吸血修正与卡牌附魔（淫文 / 刑印）的命中效果 */
const applyEventHitEffects = (card: CardData) => {
  const lifesteal = Math.max(0, Math.floor(props.battleModifiers?.player.lifesteal ?? 0));
  if (lifesteal > 0 && !isTutorialBattle) {
    const { healed } = healForSide('player', lifesteal, { sourceSide: 'player', reason: '血酒' });
    if (healed > 0) log(`<span class="text-rose-300">[血酒] 命中敌方，回复 ${healed} 点生命。</span>`);
  }
  const enchant = card.enchant;
  if (!enchant) return;
  const hit = enchant.hitEffect;
  if (hit && (hit.chance === undefined || Math.random() < hit.chance)) {
    const applied = hit.effectType === ET.STUN
      ? applyStatusEffectWithRelics('enemy', hit.effectType, hit.stacks, { source: `enchant:${enchant.key}`, lockDecayThisTurn: true })
      : applyStatusEffectWithRelics('enemy', hit.effectType, hit.stacks, { source: `enchant:${enchant.key}` });
    if (applied) log(`<span class="text-fuchsia-300">【${card.name}】的附魔【${enchant.label}】：敌方获得 ${hit.stacks} 层${getEffectName(hit.effectType)}。</span>`);
  }
  if (enchant.manaOnHit && enchant.manaOnHit > 0) {
    const restored = restoreManaForSide('player', enchant.manaOnHit);
    if (restored > 0) log(`<span class="text-sky-300">【${card.name}】的附魔【${enchant.label}】：回复 ${restored} 点魔力。</span>`);
  }
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

  const isDamageCard = card.type === CardType.PHYSICAL || card.type === CardType.MAGIC;
  if (!isDamageCard) return;
  const dealt = Math.max(0, Math.floor(actualDamage));

  if (sourceSide === 'player' && targetSide === 'enemy' && dealt > 0) {
    applyEventHitEffects(card);
  }

  if (sourceSide === 'player' && targetSide === 'enemy' && dealt > 0 && card.id === SIN_CARD_ID.GLUTTONY) {
    const { healed } = healForSide('player', dealt, { sourceSide: 'player', reason: '原罪·暴食' });
    if (healed > 0) log(`<span class="text-rose-400">【原罪·暴食】吞噬血肉，回复 ${healed} 点生命。</span>`);
  }
  if (sourceSide === 'player' && targetSide === 'enemy' && dealt > 0) {
    const gluttonyCount = getActiveRelicCount(PORTED_RELIC_ID.GLUTTONY_BOOK);
    if (gluttonyCount > 0) {
      const { healed } = healForSide('player', dealt * gluttonyCount, { sourceSide: 'player', reason: '暴食之书' });
      if (healed > 0) logRelicMessage(`[暴食之书] 命中敌方，回复 ${healed} 点生命。`);
    }
    const scholarCount = getActiveRelicCount(PORTED_RELIC_ID.SCHOLAR_BADGE);
    if (scholarCount > 0 && !scholarBadgeTriggered.value) {
      scholarBadgeTriggered.value = true;
      const battleDeck = [
        ...combatState.value.playerDeck,
        ...combatState.value.playerHand,
        ...combatState.value.discardPile,
      ];
      const deckManaCost = battleDeck
        .filter(entry => entry.type === CardType.MAGIC)
        .reduce((sum, entry) => sum + Math.max(0, Math.floor(entry.manaCost ?? 0)), 0);
      const skillManaCost = normalizedPlayerActiveSkills.value
        .reduce((sum, skill) => sum + Math.max(0, Math.floor(skill?.manaCost ?? 0)), 0);
      const bonusDamage = (deckManaCost + skillManaCost) * scholarCount;
      if (bonusDamage > 0) {
        const { actualDamage: scholarDamage } = applyDamageToSideWithRelics(
          'enemy',
          target,
          bonusDamage,
          false,
          '博学者徽章',
          { sourceSide: 'player', isDirectDamage: true },
        );
        if (scholarDamage > 0) pushFloatingNumber('enemy', scholarDamage, 'magic', '-', { targetEntity: target });
        logRelicMessage(`[博学者徽章] 首次命中，额外造成 ${scholarDamage} 点伤害（魔力消耗总和 ${deckManaCost + skillManaCost}）。`);
      }
    }
  }

  if (sourceSide === 'enemy' && targetSide === 'player' && hitIndex === 1) {
    const hornCount = getActiveRelicCount(PORTED_RELIC_ID.DEMON_HORN);
    if (hornCount > 0 && source.hp > 0) {
      const floor = Math.max(1, Math.floor(Number(gameStore.statData._楼层数 ?? 1)));
      const { actualDamage: hornDamage } = applyDamageToSideWithRelics(
        'enemy',
        source,
        floor * 2 * hornCount,
        false,
        '恶魔之角',
        { sourceSide: 'player', isDirectDamage: true },
      );
      if (hornDamage > 0) pushFloatingNumber('enemy', hornDamage, 'physical', '-', { targetEntity: source });
      logRelicMessage(`[恶魔之角] 被命中，对敌方造成 ${hornDamage} 点伤害。`);
    }
  }
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

  if (targetSide === 'player' && sourceSide === 'enemy') {
    const asymA = getActiveRelicCount('system_destruction_relic_02');
    const asymB = getActiveRelicCount('system_destruction_relic_03');
    if (asymA > 0) currentDamage += combatState.value.turn % 2 === 1 ? 3 * asymA : -6 * asymA;
    if (asymB > 0) currentDamage += combatState.value.turn % 2 === 1 ? -6 * asymB : 3 * asymB;
    const nuclearCount = getActiveRelicCount('system_destruction_relic_11');
    if (nuclearCount > 0 && card && (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC)) {
      currentTrueDamage = true;
    }
  }

  if (targetSide === 'player' && currentDamage > 0) {
    const greedBookCount = getActiveRelicCount('system_wealth_relic_15');
    if (greedBookCount > 0) {
      const absorbed = Math.min(currentDamage, getSpendableGold());
      if (absorbed > 0) {
        spendGoldPreferTemp(absorbed);
        currentDamage -= absorbed;
        logRelicMessage(`[贪婪之书] 消耗 ${absorbed} 金币抵挡伤害。`);
      }
    }
  }

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
  const originClass = visual.origin && visual.source === 'enemy'
    ? ' resolved-card-visual-inner--summon'
    : '';
  const variantClass = visual.variant === 'attack'
    ? 'resolved-card-visual-inner--attack'
    : (visual.variant === 'self'
      ? 'resolved-card-visual-inner--self'
      : 'resolved-card-visual-inner--fade');
  return `${sideClass}${originClass} ${variantClass}`;
};

const resolvedCardVisualStyle = (visual: ResolvedCardVisual): Record<string, string> | undefined => (
  visual.origin
    ? {
      left: visual.origin.left,
      top: visual.origin.top,
      ...(visual.origin.midX ? { '--resolved-card-mid-x': visual.origin.midX } : {}),
      ...(visual.origin.midY ? { '--resolved-card-mid-y': visual.origin.midY } : {}),
      ...(visual.origin.targetX ? { '--resolved-card-target-x': visual.origin.targetX } : {}),
      ...(visual.origin.targetY ? { '--resolved-card-target-y': visual.origin.targetY } : {}),
      ...(visual.origin.targetEndX ? { '--resolved-card-target-end-x': visual.origin.targetEndX } : {}),
      ...(visual.origin.targetEndY ? { '--resolved-card-target-end-y': visual.origin.targetEndY } : {}),
    }
    : undefined
);

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

interface FloatingNumberOptions {
  allowZero?: boolean;
  targetEntity?: EntityStats | null;
  targetId?: LeviathanTargetId;
  damageBeforeLimit?: number;
}

const floatingNumbersFor = (side: BattleSide, targetId?: LeviathanTargetId) => floatingNumbers.value.filter((entry) => {
  if (entry.side !== side) return false;
  if (side === 'enemy' && isLeviathanBattle) {
    return (entry.targetId ?? 'body') === (targetId ?? 'body');
  }
  return true;
});
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
  playUiSfx('invalid');
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
    }, 360);
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
  battleFeedback.action('draw');
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
  if (combatState.value.playerHand.length >= PLAYER_HAND_SLOT_COUNT) {
    const replaceIdx = Math.floor(Math.random() * combatState.value.playerHand.length);
    const replaced = combatState.value.playerHand[replaceIdx]!;
    const replacedSlot = playerHandSlotByCard.get(replaced) ?? replaceIdx;
    setHandCardAnimation(replaced, 'discard');
    await wait(HAND_CARD_ANIMATION_DURATION.discard);
    setHandCardAnimation(card, 'draw');
    playerHandSlotByCard.set(card, clampPlayerHandSlot(replacedSlot));
    combatState.value.playerHand.splice(replaceIdx, 1, card);
    combatState.value.discardPile.push(replaced);
    setHandCardAnimation(replaced, null);
    clearHandCardAnimationLater(card, 'draw');
    log(`<span class="text-zinc-200">${sourceText}：手牌已满，随机替换了【${replaced.name}】→【${card.name}】。</span>`);
    return;
  }

  setHandCardAnimation(card, 'draw');
  clearHandCardAnimationLater(card, 'draw');
  combatState.value.playerHand = mergePlayerHandWithDrawnCards(combatState.value.playerHand, [card]);
  log(`<span class="text-zinc-200">${sourceText}：抽到【${card.name}】。</span>`);
};

const triggerEnemyIntentInvalidShake = (slotIndex?: 1 | 2, fallbackCard?: CardData) => {
  const intentCard = slotIndex
    ? twinEnemyIntentCards.value[slotIndex - 1]
    : combatState.value.enemyIntentCard;
  const card = intentCard ?? combatState.value.enemyIntentCard ?? fallbackCard ?? null;
  if (!card || card.id === PASS_CARD.id) return;
  triggerInvalidCardShake(card);
  setTimeout(() => triggerInvalidCardShake(card), 390);
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

const applyUmbilicalPullOnUse = (
  source: BattleSide,
  card: CardData,
  finalPoint: number,
  opposingPoint: number | null,
): boolean => {
  const label = source === 'player' ? '我方' : '敌方';
  const insertStruggleOnFirstEffect = () => {
    if (markBattleCardFirstUse(source, card.id)) {
      applyInsertTrait(source, {
        ...card,
        traits: { ...card.traits, insertCardsToEnemyDeck: ['挣脱'] },
      });
      return true;
    }
    return false;
  };
  if (opposingPoint === null) {
    log(`<span class="text-gray-400">${label}【${card.name}】对方跳过，未施加束缚。</span>`);
    return false;
  }
  if (finalPoint !== opposingPoint) {
    log(`<span class="text-gray-400">${label}【${card.name}】未达成相同点数，未施加束缚。</span>`);
    return false;
  }
  const targetSide: BattleSide = source === 'player' ? 'enemy' : 'player';
  const applied = applyStatusEffectWithRelics(targetSide, ET.BIND, 99, {
    source: card.id,
    lockDecayThisTurn: true,
  });
  if (!applied) return false;
  log(`<span class="text-fuchsia-300">${label}【${card.name}】双方点数均为${finalPoint}，施加99层束缚。</span>`);
  insertStruggleOnFirstEffect();
  return true;
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

const insertHolyWaterIntoOpponentDeck = (source: BattleSide, count: number, reason: string) => {
  const card = getCardByName('圣水');
  if (!card) {
    log('<span class="text-red-400">[圣水水母] 未找到【圣水】卡牌定义。</span>');
    return;
  }
  const targetSide: BattleSide = source === 'player' ? 'enemy' : 'player';
  const sourceLabel = source === 'player' ? '我方' : '敌方';
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  let inserted = 0;
  for (let i = 0; i < Math.max(0, Math.floor(count)); i += 1) {
    const battleCard = cloneCardForBattle(card);
    if (targetSide === 'player') {
      combatState.value.playerDeck = insertCardIntoDeckRandomly(combatState.value.playerDeck, battleCard);
    } else {
      combatState.value.enemyDeck = insertCardIntoDeckRandomly(combatState.value.enemyDeck, battleCard);
    }
    inserted += 1;
  }
  if (inserted > 0) {
    const deckSize = targetSide === 'player' ? combatState.value.playerDeck.length : combatState.value.enemyDeck.length;
    log(`<span class="text-fuchsia-300">${sourceLabel}【${reason}】向${targetLabel}抽牌堆插入了 ${inserted} 张【圣水】（牌库${deckSize}）。</span>`);
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
    || card.id === SIN_CARD_ID.SLOTH
    || card.id === EVENT_CARD_ID.DEBT
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
      if (card.id === SIN_CARD_ID.SLOTH) {
        const armor = Math.max(0, Math.floor(finalPoint * 2));
        if (armor > 0) {
          applyStatusEffectWithRelics('player', ET.ARMOR, armor, { source: `sin:${card.id}` });
          log(`<span class="text-rose-400">【${card.name}】回合结束仍在手中，我方获得 ${armor} 点护甲。</span>`);
        }
        if (isSinResonatedInBattle(card)) {
          if (applyStatusEffectWithRelics('player', ET.FATIGUE, 2, { source: `sin:${card.id}` })) {
            logSin(card, '原罪余波：我方获得 2 层疲劳。');
          }
        } else {
          const before = playerStats.value.maxDice;
          playerStats.value.maxDice = Math.max(playerStats.value.minDice, playerStats.value.maxDice - 1);
          if (playerStats.value.maxDice !== before) {
            logSin(card, `原罪发作：我方最大点数 ${before} → ${playerStats.value.maxDice}。`);
          }
        }
      }
      if (card.id === EVENT_CARD_ID.DEBT) {
        const paid = spendGoldPreferTemp(1);
        log(paid > 0
          ? `<span class="text-yellow-300">【债务】回合结束仍在手中，失去 ${paid} 金币。</span>`
          : '<span class="text-yellow-300/70">【债务】回合结束仍在手中，但已身无分文。</span>');
      }
      if (card.id === BEHEMOTH_ROASTED_RABBIT_LEG_ID) {
        const beforeMp = Math.max(0, Math.floor(playerStats.value.mp));
        const nextMp = Math.floor(beforeMp / 2);
        const lostMp = beforeMp - nextMp;
        if (lostMp > 0) {
          changeManaWithShock('player', -lostMp, '烤兔腿');
        }
        log(`<span class="text-amber-300">【烤兔腿】回合结束仍在手中，我方魔力 ${beforeMp} → ${nextMp}。</span>`);
      }
      applyCardEffectsByTrigger('player', card, finalPoint, 'on_turn_end_in_hand');
      await wait(card.id === MOORE_MIMIC_CARD_ID ? 720 : 430);
      if (!card.traits.retain) {
        const currentIndex = combatState.value.playerHand.findIndex(entry => entry === card);
        if (currentIndex >= 0) {
          const [removed] = combatState.value.playerHand.splice(currentIndex, 1);
          if (removed) {
            combatState.value.discardPile.push(removed);
          }
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

  const target = getEntityBySide(side);
  const label = side === 'player' ? '我方' : '敌方';
  const shockStacks = getEffectStacks(target, ET.SHOCK);
  if (shockStacks <= 0) return;

  const shockDamageResult = calculateShockDamage(target, shockStacks);
  const { actualDamage, logs: applyDamageLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
    side,
    target,
    shockDamageResult.damage,
    shockDamageResult.isTrueDamage,
    '电击',
    { feedbackEffect: 'shock' },
  );
  const shockDamageLogs = [...shockDamageResult.logs, ...applyDamageLogs];
  if (actualDamage > 0) {
    pushFloatingNumber(side, actualDamage, 'magic', '-', { damageBeforeLimit });
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
  const target = getEntityBySide(targetSide);
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  const shockStacks = Math.max(0, getEffectStacks(target, ET.SHOCK));
  if (shockStacks <= 0) {
    log(`<span class="text-gray-400">[电击] ${reason}未触发：${targetLabel}当前无电击。</span>`);
    return 0;
  }

  const shockDamageResult = calculateShockDamage(target, shockStacks);
  const { actualDamage, logs: applyDamageLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
    targetSide,
    target,
    shockDamageResult.damage,
    shockDamageResult.isTrueDamage,
    '电击',
    { feedbackEffect: 'shock' },
  );
  const shockDamageLogs = [...shockDamageResult.logs, ...applyDamageLogs];
  if (actualDamage > 0) {
    pushFloatingNumber(targetSide, actualDamage, 'magic', '-', { damageBeforeLimit });
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
  let value = Math.floor(delta);
  if (value === 0) return { ok: true, actualDelta: 0 };
  if (value > 0 && side === 'player') value += getActiveRelicCount('alchemy_lust_book');

  const target = getEntityBySide(side);
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
    if (side === 'player') {
      const sapphireCount = getActiveRelicCount('system_wealth_relic_11');
      if (sapphireCount > 0) addArmorForSide('player', actualDelta * sapphireCount);
    }
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
  lockedManaCostByCard.set(toRaw(card), cost);
  return cost;
};

const unlockCardManaCost = (card: CardData | null | undefined) => {
  if (!card || card.id === PASS_CARD.id) return;
  lockedManaCostByCard.delete(toRaw(card));
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
  if (side === 'player' && getActiveRelicCount('modao_arrogance_book') > 0) return 0;
  const locked = lockedManaCostByCard.get(toRaw(card));
  if (typeof locked === 'number') return Math.max(0, Math.floor(locked));
  if (isMagicCostFreeThisTurn(side)) return 0;

  let discount = 0;
  if (card.id === 'system_wealth_石巨人') {
    discount += getEffectStacks(getEntityBySide(side), ET.ARMOR);
  }
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

/** 【蓝星瓶】本场战斗还能补足的魔力 */
const getBlueStarBottleReserve = (): number => (
  getActiveRelicCount(PORTED_RELIC_ID.BLUE_STAR_BOTTLE) > 0 ? Math.max(0, Math.floor(blueStarBottleRemaining.value)) : 0
);

/** 我方可用于支付的魔力（含蓝星瓶） */
const getPlayerPayableMana = (): number => Math.max(0, Math.floor(playerStats.value.mp)) + getBlueStarBottleReserve();

/** 【贤者之石】出牌时可用生命补足魔力（至少保留1点生命） */
const getSagesStoneHpReserve = (): number => (
  getActiveRelicCount('bloodpool_sages_stone') > 0 ? Math.max(0, Math.floor(playerStats.value.hp) - 1) : 0
);

/** 我方出牌校验：魔力不足但蓝星瓶或贤者之石可补足时跳过魔力校验 */
const getPlayerManaCheckOptions = (card: CardData): { ignoreMana?: boolean } => {
  if (card.type !== CardType.MAGIC) return {};
  const cost = Math.max(0, Math.floor(card.manaCost ?? 0));
  const mp = Math.max(0, Math.floor(playerStats.value.mp));
  return mp < cost && getPlayerPayableMana() + getSagesStoneHpReserve() >= cost ? { ignoreMana: true } : {};
};

/** 我方出牌时能否支付魔法牌的魔力（含蓝星瓶、贤者之石） */
const canPlayerAffordCardMana = (card: CardData): boolean => (
  card.type !== CardType.MAGIC
  || getPlayerPayableMana() + getSagesStoneHpReserve() >= Math.max(0, Math.floor(card.manaCost ?? 0))
);

/** 我方支付魔力：不足部分依次由蓝星瓶、（出牌时）贤者之石补足 */
const spendPlayerManaWithBottle = (cost: number, reason: string, options: { allowHp?: boolean } = {}): boolean => {
  const amount = Math.max(0, Math.floor(cost));
  if (amount <= 0) return true;
  const mp = Math.max(0, Math.floor(playerStats.value.mp));
  if (mp >= amount) return spendManaWithShock('player', amount, reason);
  const shortfall = amount - mp;
  const bottleReserve = getBlueStarBottleReserve();
  const hpReserve = options.allowHp ? getSagesStoneHpReserve() : 0;
  if (bottleReserve + hpReserve < shortfall) return false;
  if (mp > 0 && !spendManaWithShock('player', mp, reason)) return false;
  const fromBottle = Math.min(bottleReserve, shortfall);
  if (fromBottle > 0) {
    blueStarBottleRemaining.value -= fromBottle;
    logRelicMessage(`[蓝星瓶] 补足 ${fromBottle} 点魔力（瓶中剩余 ${blueStarBottleRemaining.value}）。`);
  }
  const fromHp = shortfall - fromBottle;
  if (fromHp > 0) {
    playerStats.value.hp = Math.max(1, Math.floor(playerStats.value.hp) - fromHp);
    pushFloatingNumber('player', fromHp, 'true', '-');
    logRelicMessage(`[贤者之石] 消耗 ${fromHp} 点生命补足魔力。`);
  }
  return true;
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
  const target = getEntityBySide(targetSide);
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
    feedbackEffect: 'bleed',
  });
  if (actualDamage > 0) {
    pushFloatingNumber(targetSide, actualDamage, 'true', '-');
  }
  log(`<span class="text-rose-300">[流血] ${reason}触发：${targetLabel}受到 ${actualDamage} 点真实伤害。</span>`);
  if (vulnerableBonus > 0) {
    logRelicMessage(`[惊悚八音盒] ${targetLabel}敏感使本次流血伤害 +${vulnerableBonus}。`);
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
  const sourceStats = getEntityBySide(sourceSide);
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
  const sourceStats = getEntityBySide(dodgerSide);
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

const queueNextTurnStartCardEffects = (
  source: BattleSide,
  card: CardData,
  finalPoint: number,
  selfEntity: EntityStats,
) => {
  if (!card.cardEffects.some(ce => cardEffectMatchesTrigger(ce.triggers, 'on_next_turn_start'))) return;
  pendingNextTurnCardEffects.value.push({ source, card, finalPoint, selfEntity });
};

const applyCardEffectsByTrigger = (
  source: BattleSide,
  card: CardData,
  finalPoint: number,
  trigger: CardEffectTrigger = 'on_use',
  kindMode: 'all' | 'pre_reroll_self_buff_only' | 'post_reroll_on_use' = 'all',
  targetMode: 'all' | 'enemy_only' | 'self_only' = 'all',
) => {
  const attacker = source === 'player' ? playerStats.value : getEntityBySide('enemy');
  const defender = source === 'player' ? getEntityBySide('enemy') : playerStats.value;
  const label = source === 'player' ? '我方' : '敌方';
  const triggerTextMap: Partial<Record<CardEffectTrigger, string>> = {
    on_clash_fail: '拼点失败',
    on_dodge_success: '闪避成功',
    on_opponent_skip: '对方跳过回合',
    on_no_direct_damage_taken_this_turn: '本回合未受到直接伤害',
    on_no_damage_taken_this_turn: '本回合未受到伤害',
    on_next_turn_start: '下回合开始',
    on_turn_end_in_hand: '回合结束时保留在手牌中',
  };
  let hasEffect = false;
  for (const ce of card.cardEffects) {
    if (!cardEffectMatchesTrigger(ce.triggers, trigger)) continue;
    const targetKey = ce.target ?? 'self';
    if (targetMode === 'enemy_only' && targetKey !== 'enemy') continue;
    if (targetMode === 'self_only' && targetKey !== 'self') continue;
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

    if (ce.kind === 'suppress_point_modifiers') {
      targetEntity.pointModifiersSuppressed = true;
      log(`<span class="text-violet-300">${label}【${card.name}】使对方本回合仅使用原始投掷点数。</span>`);
      hasEffect = true;
    } else if (ce.kind === 'heal') {
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
      const { actualDamage, logs: applyLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
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
        && armorBeforeHit > 0
        && applyLogs.some(applyLog => applyLog.startsWith('[护甲]'));
      if (actualDamage > 0 || armorBlocked) {
        const damageKind: FloatingNumberKind = damageResult.isTrueDamage
          ? 'true'
          : (card.type === CardType.MAGIC ? 'magic' : 'physical');
        pushFloatingNumber(targetSide, actualDamage, damageKind, '-', {
          allowZero: armorBlocked,
          targetEntity,
          damageBeforeLimit,
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
        sourceSide: source,
        durationTurns: ce.durationTurns,
        temporary: ce.temporary,
        lockDecayThisTurn: ce.effectType === ET.BIND
          || ce.effectType === ET.SILENCE
          || ce.effectType === ET.STUN
          || ce.effectType === ET.CONTROLLED
          || ce.effectType === ET.RESONANCE_LOCK
          || ce.effectType === ET.BLEED
          || ce.effectType === ET.CORRODE
          || ce.effectType === ET.CO_DAMAGE,
      });
      if (!applied) {
        continue;
      }
      if (ce.effectType === ET.ARMOR) {
        pushFloatingNumber(targetSide, stacks, 'shield', '+', { targetEntity });
        if (targetSide === 'player') {
          handlePlayerArmorGainFromSingleEvent(stacks, `卡牌【${card.name}】`);
        }
      }
      if (ce.effectType === ET.MAX_HP_REDUCTION) {
        const actualMaxHpLoss = Math.max(0, beforeMaxHp - targetEntity.maxHp);
        const hpLossByCap = Math.max(0, beforeHp - targetEntity.hp);
        if (hpLossByCap > 0) {
          pushFloatingNumber(targetSide, hpLossByCap, 'true', '-', { targetEntity });
        }
        log(`<span class="text-fuchsia-300">${label}【${card.name}】使目标生命上限 -${actualMaxHpLoss}${hpLossByCap > 0 ? `（当前生命 -${hpLossByCap}）` : ''}</span>`);
      } else if (ce.effectType === ET.TEMP_MAX_HP) {
        const actualMaxHpGain = Math.max(0, targetEntity.maxHp - beforeMaxHp);
        log(`<span class="text-rose-300">${label}【${card.name}】使目标临时生命上限 +${actualMaxHpGain}</span>`);
      } else {
        log(`<span class="text-yellow-400">${label}【${card.name}】获得了 ${stacks} 层${getEffectInstanceName({ type: ce.effectType!, temporary: ce.temporary })}</span>`);
      }
      hasEffect = true;
    } else if (ce.kind === 'restore_mana') {
      const restoreAmount = ce.valueMode === 'point_scale'
        ? Math.floor(finalPoint * (ce.scale ?? 1))
        : Math.floor(ce.fixedValue ?? 0);
      const manaResult = changeManaWithShock(
        targetSide,
        restoreAmount,
        `魔力变化（${label}【${card.name}】）`,
        { showPositiveFloating: true },
      );
      const actualRestore = Math.max(0, manaResult.actualDelta);
      if (actualRestore > 0) {
        log(`<span class="text-blue-400">${label}【${card.name}】回复了 ${actualRestore} 点魔力</span>`);
        hasEffect = true;
      } else if (manaResult.actualDelta < 0) {
        log(`<span class="text-blue-400">${label}【${card.name}】使目标魔力减少 ${Math.abs(manaResult.actualDelta)} 点</span>`);
        hasEffect = true;
      } else if (restoreAmount !== 0) {
        log(`<span class="text-blue-400">${label}【${card.name}】未造成魔力变化</span>`);
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

const applyPendingNextTurnSkillEffects = () => {
  const pendingMana = Math.max(0, Math.floor(pendingNextTurnSkillMana.value));
  pendingNextTurnSkillMana.value = 0;
  if (pendingMana > 0) {
    const restored = restoreManaForSide('player', pendingMana);
    log(`<span class="text-blue-300">主动【高纯蓄能魔晶】：下回合开始回复 ${restored} 点魔力。</span>`);
  }
  const rekindle = pendingRekindleBurn.value;
  pendingRekindleBurn.value = null;
  if (rekindle) {
    for (const side of ['player', 'enemy'] as const) {
      const stacks = Math.max(0, Math.floor(rekindle[side]));
      if (stacks <= 0) continue;
      applyStatusEffectWithRelics(side, ET.BURN, stacks, { source: 'active_burn_rekindle' });
      log(`<span class="text-orange-300">主动【余烬回燃】：${side === 'player' ? '我方' : '敌方'}重新燃起 ${stacks} 层燃烧。</span>`);
    }
  }
};

/** 主动技造成的固定伤害使用的临时卡牌（用于增伤、敏感等伤害修正） */
const buildActiveSkillDamageCard = (skill: ActiveSkillData, damage: number): CardData => ({
  id: skill.id,
  name: skill.name,
  type: CardType.PHYSICAL,
  category: skill.category,
  rarity: skill.rarity,
  manaCost: 0,
  calculation: { multiplier: 1, addition: 0 },
  damageLogic: { mode: 'fixed', value: damage },
  hitCount: 1,
  traits: { combo: false, reroll: 'none', draw: false },
  cardEffects: [],
  description: skill.description,
});

const applyPendingNextTurnCardEffects = () => {
  const pendingEffects = pendingNextTurnCardEffects.value;
  pendingNextTurnCardEffects.value = [];
  for (const pending of pendingEffects) {
    const shouldUseEnemyOverride = pending.source === 'enemy';
    const previousEnemyTargetOverride = leviathanEnemyTargetOverride.value;
    const previousEnemySourceOverride = leviathanEnemySourceOverride.value;
    const previousEnemySelfOverride = leviathanEnemySelfOverride.value;
    if (shouldUseEnemyOverride) {
      leviathanEnemyTargetOverride.value = pending.selfEntity;
      leviathanEnemySourceOverride.value = pending.selfEntity;
      leviathanEnemySelfOverride.value = pending.selfEntity;
    }
    try {
      applyCardEffectsByTrigger(
        pending.source,
        pending.card,
        pending.finalPoint,
        'on_next_turn_start',
      );
    } finally {
      leviathanEnemyTargetOverride.value = previousEnemyTargetOverride;
      leviathanEnemySourceOverride.value = previousEnemySourceOverride;
      leviathanEnemySelfOverride.value = previousEnemySelfOverride;
    }
  }
};

const triggerShadowAssaultDamage = (
  source: BattleSide,
  card: CardData,
  finalPoint: number,
  trigger: 'on_dodge_success' | 'on_opponent_skip',
) => {
  if (card.id !== 'enemy_shadow_jailer_shadow_assault') return;

  const attacker = source === 'player' ? playerStats.value : getEntityBySide('enemy');
  const defender = source === 'player' ? getEntityBySide('enemy') : playerStats.value;
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
  const { actualDamage, logs: applyLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
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
    && armorBeforeHit > 0
    && applyLogs.some(applyLog => applyLog.startsWith('[护甲]'));
  if (actualDamage > 0 || armorBlocked) {
    pushFloatingNumber(defenderSide, actualDamage, isTrueDamage ? 'true' : 'physical', '-', {
      allowZero: armorBlocked,
      damageBeforeLimit,
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
  const spreadOwner = getEntityBySide(spreadOwnerSide);
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
  const ambushOwner = getEntityBySide(ambushOwnerSide);
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

const applySystemPollutionDodgeEffect = (source: BattleSide, card: CardData) => {
  if (card.id !== 'system_corruption_污染之路') return;
  const targetSide = source === 'player' ? 'enemy' : 'player';
  const target = getEntityBySide(targetSide);
  const poison = Math.max(0, getEffectStacks(target, ET.POISON));
  if (poison <= 0) return;
  applyStatusEffectWithRelics(targetSide, ET.POISON, poison, { source: card.id });
  log(`<span class="text-emerald-300">${source === 'player' ? '我方' : '敌方'}【${card.name}】使目标中毒翻倍（+${poison}）。</span>`);
};

/** 立即触发一次中毒：中毒层数转化为等量中毒量，随后中毒层数-1（与回合结束结算一致） */
const triggerPoisonOnceForSide = (side: BattleSide, reason: string): number => {
  const target = getEntityBySide(side);
  const sideLabel = side === 'player' ? '我方' : '敌方';
  const stacks = Math.max(0, Math.floor(getEffectStacks(target, ET.POISON)));
  if (stacks <= 0) {
    log(`<span class="text-gray-400">${reason}：${sideLabel}没有中毒，未触发。</span>`);
    return 0;
  }
  applyEffect(target, ET.POISON_AMOUNT, stacks);
  reduceEffectStacks(target, ET.POISON, 1);
  log(`<span class="text-emerald-300">${reason}：触发${sideLabel}中毒，中毒量 +${stacks}，中毒层数 -1。</span>`);
  const paintingCount = side === 'enemy' ? getActiveRelicCount('bloodpool_eerie_miniature_painting') : 0;
  for (let i = 0; i < paintingCount && target.hp > 0; i += 1) {
    const damage = triggerBleedProc('enemy', `[诡异微型画作] 中毒触发联动（${i + 1}/${paintingCount}）`);
    if (damage <= 0) break;
  }
  return stacks;
};

/** 新增闪避牌的闪避成功效果 */
const applyNewSystemDodgeSuccessEffects = (source: BattleSide, card: CardData) => {
  const label = source === 'player' ? '我方' : '敌方';
  if (card.id === 'system_corruption_瘴气帷幕') {
    triggerPoisonOnceForSide(oppositeSide(source), `${label}【${card.name}】`);
  } else if (card.id === 'system_shadow_鬼影步') {
    ghostStepPendingBonus.value[source] = Math.max(0, ghostStepPendingBonus.value[source] ?? 0) + 3;
    log(`<span class="text-indigo-300">${label}【${card.name}】闪避成功：下一张攻击牌点数 +3。</span>`);
  }
};

/** 【鬼影步】的加成绑定到本次打出的攻击牌上，绑定后不再作用于其他卡牌 */
const bindGhostStepBonusToCard = (source: BattleSide, card: CardData) => {
  if (card.id === PASS_CARD.id || (card.type !== CardType.PHYSICAL && card.type !== CardType.MAGIC)) return;
  const bonus = Math.max(0, Math.floor(ghostStepPendingBonus.value[source] ?? 0));
  if (bonus <= 0) return;
  ghostStepPendingBonus.value[source] = 0;
  ghostStepBonusByCard.set(toRaw(card), bonus);
  log(`<span class="text-indigo-300">${source === 'player' ? '我方' : '敌方'}【鬼影步】使【${card.name}】点数 +${bonus}。</span>`);
};

const getGhostStepPointBonus = (source: BattleSide, card: CardData): number => {
  if (card.id === PASS_CARD.id || (card.type !== CardType.PHYSICAL && card.type !== CardType.MAGIC)) return 0;
  return ghostStepBonusByCard.get(toRaw(card)) ?? Math.max(0, Math.floor(ghostStepPendingBonus.value[source] ?? 0));
};

/** 记录卡牌被转化：替换后的卡牌指回原卡（供【融入暗影】恢复原样） */
const recordCardTransform = (original: CardData | null | undefined, replacement: CardData) => {
  if (original) cardTransformOrigin.set(toRaw(replacement), toRaw(original));
};

const isTransformedFromCard = (card: CardData, original: CardData): boolean => {
  let current = cardTransformOrigin.get(toRaw(card));
  for (let guard = 0; current && guard < 20; guard += 1) {
    if (current === original) return true;
    current = cardTransformOrigin.get(current);
  }
  return false;
};

/** 【融入暗影】生命低于30%时，无论原卡身处何处（抽牌堆、弃牌堆、被移除或被转化），都以原样回到手牌最左侧 */
const pullShadowMeldCardsIntoHand = () => {
  if (shadowMeldTrackedCards.length <= 0 || endCombatPending.value) return;
  const player = playerStats.value;
  if (player.hp <= 0 || player.hp >= player.maxHp * 0.3) return;
  const returned: CardData[] = [];
  const notes: string[] = [];
  for (const tracked of shadowMeldTrackedCards) {
    if (combatState.value.playerHand.some(card => toRaw(card) === tracked)) continue;
    let located = false;
    for (const pile of [combatState.value.playerDeck, combatState.value.discardPile]) {
      const idx = pile.findIndex(card => toRaw(card) === tracked);
      if (idx < 0) continue;
      pile.splice(idx, 1);
      located = true;
      break;
    }
    if (!located) {
      for (const pile of [combatState.value.playerHand, combatState.value.playerDeck, combatState.value.discardPile]) {
        const idx = pile.findIndex(card => isTransformedFromCard(card, tracked));
        if (idx < 0) continue;
        const [transformed] = pile.splice(idx, 1);
        if (transformed) notes.push(`【${transformed.name}】恢复原样`);
        located = true;
        break;
      }
    }
    if (!located) notes.push('从移除中返回');
    returned.push(tracked);
  }
  if (returned.length <= 0) return;
  const nextHand = [...returned, ...combatState.value.playerHand];
  const overflow = nextHand.splice(PLAYER_HAND_SLOT_COUNT);
  if (overflow.length > 0) {
    // 手牌已满时，最右侧的卡牌放回抽牌堆顶
    combatState.value.playerDeck.push(...overflow);
    notes.push(`【${overflow.map(card => card.name).join('】【')}】放回抽牌堆顶`);
  }
  combatState.value.playerHand = nextHand;
  combatState.value.playerHand.forEach((card, slot) => playerHandSlotByCard.set(card, slot));
  const returnedInHand = combatState.value.playerHand.slice(0, returned.length);
  applyOnDrawCardEffects(returnedInHand);
  markDrawnCardsAnimation(returnedInHand);
  refreshPlayerSightDeprivationMask(combatState.value.playerHand);
  log(`<span class="text-indigo-300">我方生命低于30%，【融入暗影】回到手牌最左侧${notes.length > 0 ? `（${notes.join('，')}）` : ''}。</span>`);
};

const withIgnoreDodgeBuffOnAttackCard = (source: BattleSide, card: CardData): CardData => {
  if (card.id === PASS_CARD.id) return card;
  if (card.type !== CardType.PHYSICAL && card.type !== CardType.MAGIC) return card;

  const nightCatInHand = source === 'player'
    && combatState.value.playerHand.some(handCard => handCard.id === 'system_shadow_夜猫视野');
  if (nightCatInHand && !card.ignoreDodge) {
    const boosted = cloneCardForBattle(card);
    boosted.ignoreDodge = true;
    return boosted;
  }

  const sourceStats = getEntityBySide(source);
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
  const attacker = getEntityBySide(attackerSide);
  const defender = getEntityBySide(defenderSide);
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

const getSystemGold = () => Math.max(0, Math.floor(Number(gameStore.statData._金币 ?? 0)));

/**
 * 战斗中改变金币：立即更新本地显示，并把实际变化量计入战斗结算的金币变化，
 * 战斗结束时随 endCombat 一并写入变量（本地 statData 不会被直接持久化）。
 */
const changeSystemGold = (delta: number) => {
  const before = getSystemGold();
  const after = Math.max(0, before + Math.floor(delta));
  gameStore.statData._金币 = after;
  const actual = after - before;
  pendingAlchemyGoldDelta.value += actual;
  return actual;
};

/** 可用金币 = 金币 + 临时金币 */
const getSpendableGold = () => getSystemGold() + Math.max(0, Math.floor(battleTempGold.value));

/** 获得临时金币（战斗结束时清空） */
const gainTempGold = (amount: number): number => {
  const gained = Math.max(0, Math.floor(amount));
  battleTempGold.value = Math.max(0, Math.floor(battleTempGold.value)) + gained;
  if (gained > 0) presentEffect(playerStats.value, EVENT_EFFECTS.tempGold);
  return gained;
};

/** 消耗金币：优先消耗临时金币，返回实际消耗量 */
const spendGoldPreferTemp = (amount: number): number => {
  let remaining = Math.max(0, Math.floor(amount));
  const fromTemp = Math.min(remaining, Math.max(0, Math.floor(battleTempGold.value)));
  battleTempGold.value -= fromTemp;
  remaining -= fromTemp;
  const fromGold = remaining > 0 ? -changeSystemGold(-remaining) : 0;
  return fromTemp + fromGold;
};

const getSystemCardTurnUses = (side: BattleSide, cardId: string) => (
  Math.max(0, Math.floor(systemCardTurnUseCount.value[side][cardId] ?? 0))
);

const increaseSystemCardTurnUses = (side: BattleSide, cardId: string) => {
  const next = getSystemCardTurnUses(side, cardId) + 1;
  systemCardTurnUseCount.value[side][cardId] = next;
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
    const selectedSummon = isLeviathanBattle ? getSelectedLeviathanSummon() : null;
    return {
      side: 'enemy',
      card: selectedSummon ? (selectedSummon.intentCard ?? null) : (combatState.value.enemyIntentCard ?? null),
      baseDice: selectedSummon ? selectedSummon.baseDice : combatState.value.enemyBaseDice,
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
  const sourceStats = getEntityBySide(from);
  const targetStats = getEntityBySide(to);
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
      temporary: effect.temporary,
    }));

  for (const effect of debuffs) {
    removeEffect(sourceStats, effect.type, effect.temporary === true);
    applyEffect(targetStats, effect.type, effect.stacks, {
      source: effect.source,
      lockDecayThisTurn: effect.lockDecayThisTurn,
      restrictedTypes: effect.restrictedTypes,
      durationTurns: effect.durationTurnsRemaining,
      temporary: effect.temporary,
    });
    const transferredEffect = targetStats.effects.find((entry) => (
      entry.type === effect.type && !!entry.temporary === !!effect.temporary
    ));
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
    && card.category !== EVENT_CARD_CATEGORY
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
  const rarePool = getAllCards().filter(card => card.category !== '敌人' && card.category !== EVENT_CARD_CATEGORY && card.type !== CardType.ACTIVE && card.rarity === '稀有');
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
  if (card.id === UMBILICAL_TENTACLE_CARD.WHIP) {
    const opposingHand = source === 'enemy' ? combatState.value.playerHand : [];
    return getUmbilicalWhipHitCount(opposingHand);
  }
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
  const target = getEntityBySide(side);
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
    { skipHeartMark: true, feedbackEffect: 'poison' },
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
  const target = getEntityBySide(side);
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
      { skipHeartMark: true, feedbackEffect: 'poison' },
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
  options: { allowPoisonAttach?: boolean } = {},
) => {
  const flameStacks = getEffectStacks(attacker, ET.FLAME_ATTACH);
  if (flameStacks > 0 && card.type === CardType.PHYSICAL) {
    applyStatusEffectWithRelics(defenderSide, ET.BURN, flameStacks, { source: 'effect:flame_attach' });
  }

  const poisonStacks = getEffectStacks(attacker, ET.POISON_ATTACH);
  const canApplyPoisonAttach = options.allowPoisonAttach !== false;
  if (poisonStacks > 0 && card.type === CardType.MAGIC && canApplyPoisonAttach) {
    applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: 'effect:poison_attach' });
  }

  const totalApplied =
    (card.type === CardType.PHYSICAL ? flameStacks : 0) +
    (card.type === CardType.MAGIC && canApplyPoisonAttach ? poisonStacks : 0);
  if (totalApplied > 0) {
    const label = source === 'player' ? '我方' : '敌方';
    log(`<span class="text-orange-300">${label}[附加效果] 命中后追加了状态效果。</span>`);
  }
};

const startCardPointTurn = () => {
  unmodifiedDiceByEntity = new WeakMap<EntityStats, number>();
  playerStats.value.pointModifiersSuppressed = false;
  enemyStats.value.pointModifiersSuppressed = false;
};

const consumeChargeOnRoll = (stats: EntityStats, label: string, rolled: number) => {
  unmodifiedDiceByEntity.set(toRaw(stats), Math.max(0, Math.floor(rolled)));
  if (stats.pointModifiersSuppressed) return Math.max(0, Math.floor(rolled));
  let next = rolled;

  const painSide = stats === playerStats.value ? 'player' : stats === enemyStats.value ? 'enemy' : null;
  if (painScene && painSide && painScene.nextRollBonus[painSide] > 0) {
    const bonus = painScene.nextRollBonus[painSide];
    next = consumePainRollBonus(painScene, painSide, next);
    pulseSceneEffect(ET.SELF_CHOSEN_PAIN);
    log(`<span class="text-rose-200">${label}[自选之痛] +${bonus}，原始骰子 ${rolled} → ${next}</span>`);
  }

  const chargeStacks = getEffectStacks(stats, ET.CHARGE);
  if (chargeStacks > 0) {
    removeEffect(stats, ET.CHARGE);
    let chargeBonus = chargeStacks;
    if (stats === playerStats.value) {
      // 海盗钩子：每层蓄力额外+1；海盗眼罩：蓄力效果×1.5
      chargeBonus += chargeStacks * getActiveRelicCount('system_destruction_relic_08');
      const eyepatchCount = getActiveRelicCount('system_destruction_relic_10');
      if (eyepatchCount > 0) chargeBonus = Math.floor(chargeBonus * 1.5 ** eyepatchCount);
    }
    next = Math.max(0, Math.floor(next + chargeBonus));
    log(`<span class="text-cyan-300">${label}[蓄力] ${chargeStacks}层 +${chargeBonus}，原始骰子 ${rolled} → ${next}</span>`);
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
  heavyDamageShakeToken += 1;
  heavyDamageShake.value = false;
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

const getLeviathanSummonCardAnimationOrigin = (summon: LeviathanSummonRuntime): ResolvedCardVisualOrigin => {
  const root = combatRootEl.value;
  if (root) {
    const cardEl = Array.from(root.querySelectorAll<HTMLElement>('[data-leviathan-summon-card-id]'))
      .find(el => el.dataset.leviathanSummonCardId === summon.id);
    if (cardEl) {
      const rootRect = root.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();
      if (rootRect.width > 0 && rootRect.height > 0) {
        const cardCenterX = cardRect.left + cardRect.width / 2 - rootRect.left;
        const cardCenterY = cardRect.top + cardRect.height / 2 - rootRect.top;
        const centerX = (cardCenterX / rootRect.width) * 100;
        const centerY = (cardCenterY / rootRect.height) * 100;
        return {
          left: `${Math.max(0, Math.min(100, centerX)).toFixed(2)}%`,
          top: `${Math.max(0, Math.min(100, centerY)).toFixed(2)}%`,
          midX: `${Math.round(rootRect.width * 0.5 - cardCenterX)}px`,
          midY: `${Math.round(rootRect.height * 0.34 - cardCenterY)}px`,
          targetX: `${Math.round(rootRect.width * 0.24 - cardCenterX)}px`,
          targetY: `${Math.round(rootRect.height * 0.56 - cardCenterY)}px`,
          targetEndX: `${Math.round(rootRect.width * 0.22 - cardCenterX)}px`,
          targetEndY: `${Math.round(rootRect.height * 0.58 - cardCenterY)}px`,
        };
      }
    }
  }

  const index = Math.max(0, leviathanSummons.value.findIndex(entry => entry.id === summon.id));
  switch (index) {
    case 0:
      return { left: '70%', top: '58%' };
    case 1:
      return { left: '63%', top: '18%' };
    default:
      return { left: '76%', top: '13%' };
  }
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
  const origin = source === 'enemy' && leviathanActingSummon.value
    ? getLeviathanSummonCardAnimationOrigin(leviathanActingSummon.value)
    : undefined;
  slot.value = { id, source, card, variant, origin };

  if (variant === 'attack') {
    const impactDelay = scaleDuration(720);
    setTimeout(() => {
      if (token !== animationStopToken || endCombatPending.value) return;
      impactShake.value = true;
      setTimeout(() => {
        if (token !== animationStopToken) return;
        impactShake.value = false;
      }, 220);
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

const prepareRuneCardOnPlay = (side: BattleSide, card: CardData) => {
  if (card.id === SIGEL_CARD.SHIFT) pendingRuneShiftCards.set(card, side);
  const rawCard = toRaw(card);
  if (card.id !== SIGEL_CARD.FINALE || runeConsumedEnergyByCard.has(rawCard)) return;
  const consumed = consumeRuneFinisherEnergy(getEntityBySide(side));
  runeConsumedEnergyByCard.set(rawCard, consumed);
  log(`<span class="text-amber-300">${side === 'player' ? '我方' : '敌方'}【${card.name}】消耗${consumed}层符能，点数+${consumed * 2}；之后3回合撤防。</span>`);
};

const getRuneFinisherPointBonus = (side: BattleSide, card: CardData): number => {
  const consumed = runeConsumedEnergyByCard.get(toRaw(card))
    ?? getEffectStacks(getEntityBySide(side), ET.RUNE_ENERGY);
  return consumed * 2;
};

const processRuneShiftTurnEnd = () => {
  for (const [card, side] of pendingRuneShiftCards) {
    if (getEntityBySide(side).hp <= 0 || hasTakenDamageThisTurn(side)) continue;
    applyCardEffectsByTrigger(side, card, 0, 'on_no_damage_taken_this_turn');
  }
  pendingRuneShiftCards.clear();
};

const getUmbilicalOpposingPoint = (source: BattleSide, isPreview: boolean): number | null => {
  const opposing = getOpposingCardForPointComparison(source);
  const opposingCard = source === 'enemy' && isPreview
    ? getPlayerCardContextForEnemyPointPreview()
    : opposing.card;
  if (!opposingCard || opposingCard.id === PASS_CARD.id) return null;
  return getCardFinalPoint(
    opposing.side,
    opposingCard,
    opposing.baseDice,
    true,
    opposingCard.id === UMBILICAL_TENTACLE_CARD.PULL,
  );
};

/**
 * 卡牌最终点数。传入 trace 时同步记录每一步修正，供上方的点数预览展示，
 * 保证预览明细与实际结算使用同一套计算。
 */
const getCardFinalPoint = (
  source: 'player' | 'enemy',
  card: CardData,
  baseDice: number,
  isPreview: boolean = false,
  suppressComparisonSpecials: boolean = false,
  opposingPointOverride?: number | null,
  trace?: string[],
) => {
  const attacker = source === 'player' ? playerStats.value : getEntityBySide('enemy');
  const defender = source === 'player' ? getEntityBySide('enemy') : playerStats.value;
  if (attacker.pointModifiersSuppressed) {
    const rawPoint = card.id === PASS_CARD.id ? 0 : unmodifiedDiceByEntity.get(toRaw(attacker)) ?? Math.max(0, Math.floor(baseDice));
    trace?.push(`原始：${rawPoint}`, '削弱符：本回合所有点数修正失效');
    return rawPoint;
  }
  if (source === 'player' && card.id === SIN_CARD_ID.GREED) {
    const goldPoint = getSpendableGold();
    trace?.push(`原罪·贪婪：点数无视一切修正，等于当前金币 ${goldPoint}`);
    return goldPoint;
  }
  const shriveledHandActive = source === 'player' && getActiveRelicCount('basic_shriveled_hand') > 0;
  const additionText = card.calculation.addition >= 0 ? `+${card.calculation.addition}` : `${card.calculation.addition}`;

  trace?.push(`原始：${baseDice}`);
  let finalPoint: number;
  if (shriveledHandActive) {
    finalPoint = baseDice + card.calculation.addition * 2;
    trace?.push(`干瘪之手：卡牌乘法不触发，加减触发2次 ${additionText}x2 => ${finalPoint}`);
  } else {
    finalPoint = calculateFinalPoint({
      baseDice,
      card,
      entityEffects: attacker.effects,
      relicModifiers: NO_RELIC_MOD,
    });
    if (trace) {
      const withoutSolitude = calculateFinalPoint({
        baseDice,
        card,
        entityEffects: attacker.effects.filter(effect => effect.type !== ET.SOLITUDE),
        relicModifiers: NO_RELIC_MOD,
      });
      trace.push(`卡牌修正 x${formatPointValue(card.calculation.multiplier)} ${additionText} => ${withoutSolitude}`);
      if (finalPoint !== withoutSolitude) {
        trace.push(`孤独 ${finalPoint > withoutSolitude ? '+' : ''}${finalPoint - withoutSolitude} => ${finalPoint}`);
      }
    }
  }

  if (card.id === EVENT_CARD_ID.LUCKY_COIN) {
    const factor = getLuckyCoinFactor(card);
    finalPoint = Math.max(0, Math.floor(finalPoint * factor));
    trace?.push(`幸运币 x${factor} => ${finalPoint}`);
  }
  if (source === 'player' && card.id === SIN_CARD_ID.WRATH) {
    const wrathBonus = getDamageHitTakenThisCombat('player');
    if (wrathBonus > 0) {
      finalPoint += wrathBonus;
      trace?.push(`原罪·暴怒：本场受伤 ${wrathBonus} 次 +${wrathBonus} => ${finalPoint}`);
    }
  }

  const add = (label: string, delta: number) => {
    if (!delta) return;
    finalPoint += delta;
    trace?.push(`${label} ${delta > 0 ? '+' : ''}${formatPointValue(delta)} => ${formatPointValue(finalPoint)}`);
  };
  const multiply = (label: string, factor: number) => {
    if (factor === 1) return;
    finalPoint *= factor;
    trace?.push(`${label} x${formatPointValue(factor)} => ${formatPointValue(finalPoint)}`);
  };
  const setPoint = (label: string, next: number) => {
    if (Math.abs(next - finalPoint) < 0.0001) return;
    finalPoint = next;
    trace?.push(`${label} => ${formatPointValue(finalPoint)}`);
  };
  const sourceLabel = source === 'player' ? '我方' : '敌方';

  // 卡牌专属点数修正
  if (card.id.startsWith('enemy_pain_')) add('痛忆', painPointBonusByCard.get(card) ?? painPointBonus(card, attacker));
  if (card.id === SIGEL_CARD.FINALE) {
    // 消耗为0时也列出，提示本牌的点数来源
    const runeBonus = getRuneFinisherPointBonus(source, card);
    finalPoint += runeBonus;
    trace?.push(`消耗符能 +${runeBonus} => ${formatPointValue(finalPoint)}`, '打出时撤去之后3回合的符文防护');
  }
  if (painScene && source === 'player' && !suppressComparisonSpecials
    && getPainOath(painScene, ET.PAIN_OATH_PILLAR)
    && (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC)
    && combatState.value.enemyIntentCard?.type === card.type && !card.ignoreClash && !combatState.value.enemyIntentCard.ignoreClash) {
    add('握住刑柱', 1);
  }
  if (card.id === 'burn_inferno_judgement') {
    add('炎狱判决', Math.floor(getEffectStacks(defender, ET.BURN)));
  }
  if (card.id === 'yanhan_ice_spike') {
    add('冰锥', Math.floor(getEffectStacks(defender, ET.COLD) / 3));
  }
  if (card.id === 'bloodpool_pulse_fist') {
    const hpValue = Math.max(0, Math.floor(attacker.hp));
    add(`脉搏拳（生命${hpValue}为${hpValue % 2 === 0 ? '双' : '单'}数）`, hpValue % 2 === 0 ? -4 : 4);
  }
  if (card.id === 'bloodpool_life_drain' && isBelowHalfHp(attacker)) {
    add('生命汲取（生命低于50%）', 2);
  }
  if (card.id === 'bloodpool_blood_control') {
    add('驭血术（含新施加4层流血）', Math.max(0, getEffectStacks(attacker, ET.BLEED) + 4));
  }
  if (card.id === 'enemy_abyss_shoal_fangs') {
    const playerBleed = Math.max(0, getEffectStacks(playerStats.value, ET.BLEED));
    add(`利齿（玩家流血${playerBleed}）`, playerBleed);
  }
  if (card.id === 'enemy_penitent_ghost_mirror_lure') {
    const stigmataStacks = Math.max(0, getEffectStacks(defender, ET.STIGMATA));
    add(`镜中诱惑（目标圣痕${stigmataStacks}）`, stigmataStacks * 3);
  }
  if (card.id === 'enemy_holy_water_sprite_struggle') {
    const selfDamage = getHolyWaterSpriteStruggleSelfDamageAmount(attacker);
    add(`挣扎（预估自伤${selfDamage}）`, Math.floor(selfDamage / 10));
  }
  if (card.id === 'enemy_executioner_puppet_execution' && source === 'enemy') {
    if (executionerPuppetPointModifier.value !== null) {
      add('行刑', executionerPuppetPointModifier.value);
    } else if (!isPreview) {
      const playerCardType = combatState.value.playerSelectedCard?.type;
      executionerPuppetPointModifier.value = playerCardType === CardType.DODGE
        ? Math.floor(Math.random() * 2) - 2
        : Math.floor(Math.random() * 2) + 1;
      add('行刑', executionerPuppetPointModifier.value);
    } else {
      trace?.push(combatState.value.playerSelectedCard?.type === CardType.DODGE
        ? '行刑：若对手使用闪避，点数随机-2~-1'
        : '行刑：若对手未使用闪避，点数随机+1~+2');
    }
  }
  // 血债重击/嗜血重击：自身每损失指定生命，点数+1
  if (card.id === 'bloodpool_blood_debt_strike' || card.id === 'enemy_veronica_bloodthirsty_heavy_strike') {
    const divisor = card.id === 'enemy_veronica_bloodthirsty_heavy_strike' ? 9 : 3;
    const lostHp = Math.max(0, Math.floor(attacker.maxHp - attacker.hp));
    add(`${card.name}（已损失${lostHp}）`, Math.floor(lostHp / divisor));
  }
  if (card.id === 'enemy_stitched_spider_pack_hunt') {
    const swarmBonus = Math.max(0, getEffectStacks(attacker, ET.SWARM));
    add(`${card.name}（群集${swarmBonus}）`, swarmBonus);
  }
  if (card.id === 'enemy_silk_puppet_cooperative_subdue') {
    const swarmBonus = Math.max(0, getEffectStacks(attacker, ET.SWARM));
    add(`合力制服（群集${swarmBonus}）`, swarmBonus);
  }
  if (card.id === 'enemy_yustia_trueword_scale_powder') {
    const manaBonus = Math.max(0, Math.floor(defender.mp));
    add(`真言鳞粉（目标魔力${manaBonus}）`, manaBonus);
  }
  if (card.id === 'enemy_selina_space_fold') {
    add(`${card.name}（消耗魔力）`, getSelinaSpaceFoldManaSpend(attacker));
  }
  if (card.id === 'enemy_nightmare_moth_collective_dreamweave') {
    const swarmBonus = Math.max(0, getEffectStacks(attacker, ET.SWARM));
    add(`${card.name}（群集${swarmBonus}）`, swarmBonus);
  }
  if (card.id === 'enemy_moore_progressive_weaving') {
    add(`${card.name}（本战累计）`, getBattleCardUseCount(source, card.id));
  }
  if (card.id === 'enemy_nightmare_moth_blissful_dream') {
    const debuffTypeCount = countDistinctDebuffTypes(defender);
    add(`极乐之梦（debuff种类${debuffTypeCount}）`, debuffTypeCount * 2);
  }
  if (card.id === 'enemy_broken_mirror_bat_self_stripping' && getEffectStacks(defender, ET.LUST_ILLUSION) > 0) {
    multiply('自我剥离（目标有淫靡幻象）', 2);
    if (!isPreview) {
      log(`<span class="text-fuchsia-300">${sourceLabel}【${card.name}】目标已有淫靡幻象，点数 x2</span>`);
    }
  }
  if (card.id === 'basic_sharp_attack' && isOnlyPhysicalCardForSide(source, card)) {
    add('尖锐攻击（当前仅有的物理牌）', 3);
    if (!isPreview) {
      log(`<span class="text-amber-300">${sourceLabel}【${card.name}】为当前卡组中仅有的物理卡牌，点数 +3</span>`);
    }
  }
  if (card.id === 'basic_jagged_attack') {
    add('锯齿攻击（本战累计）', getBattleCardUseCount(source, card.id));
  }
  if (card.id === 'system_wealth_黄金镐') {
    add('黄金镐（每5金币）', Math.floor((source === 'player' ? getSpendableGold() : getSystemGold()) / 5));
  }
  if (card.id === 'system_wealth_心之容器') {
    add('心之容器（本战累计）', -getBattleCardUseCount(source, card.id));
  }
  if (card.id === 'system_wealth_水晶之锤') {
    add('水晶之锤（每4护甲）', Math.floor(getEffectStacks(attacker, ET.ARMOR) / 4));
  }
  if (card.id === 'system_destruction_铁拳' && systemLastTurnClashLoss.value[source]) {
    multiply('铁拳（上回合拼点失败）', 2);
  }
  if (card.id === 'system_destruction_引爆' || card.id === 'system_destruction_引爆2') {
    add(`${card.name}（本战累计）`, getBattleCardUseCount(source, card.id));
  }
  if (card.id === 'system_shadow_影之手') {
    const opposing = getOpposingCardForPointComparison(source);
    if (opposing.card?.type === CardType.DODGE || opposing.card?.type === CardType.FUNCTION) {
      multiply('影之手（对方使用闪避/功能牌）', 2);
    }
  }
  if (hasActiveRelic('system_wealth_relic_05') && source === 'enemy' && card.type === CardType.FUNCTION) {
    setPoint('肥皂（功能牌）x0.8', Math.floor(finalPoint * 0.8));
  }
  if (hasActiveRelic('system_wealth_relic_05') && source === 'enemy' && card.type === CardType.DODGE) {
    add('肥皂（闪避牌）', 1);
  }
  if (hasActiveRelic('system_shadow_relic_09') && source === 'player' && defender.hp >= defender.maxHp) {
    add('死神摆件（敌方满生命）', 4);
  }
  if (source === 'player' && combatState.value.turn === 1) {
    add('破晓之刃（第1回合）', 4 * getActiveRelicCount('system_shadow_relic_12'));
  }
  // 猫耳：我方使用闪避牌时，我方点数+2，对方点数+4
  if (hasActiveRelic('system_shadow_relic_04') && card.id !== PASS_CARD.id) {
    if (source === 'player' && card.type === CardType.DODGE) {
      add('猫耳（使用闪避）', 2);
      trace?.push('猫耳：对方点数 +4');
    } else if (source === 'enemy') {
      const playerCard = combatState.value.playerSelectedCard ?? playerPreviewCardForPointContext.value;
      if (playerCard?.type === CardType.DODGE && playerCard.id !== PASS_CARD.id) add('猫耳（对方使用闪避）', 4);
    }
  }
  if (card.id === 'basic_raid_attack' && battleCardFirstUseConsumed.value[source][card.id] !== true) {
    add('袭击（首次使用）', 4);
    if (!isPreview && markBattleCardFirstUse(source, card.id)) {
      log(`<span class="text-indigo-300">${sourceLabel}【${card.name}】首次使用，点数 +4</span>`);
    }
  }
  if (card.id === 'basic_targeted_slash' && source === 'player' && isCurrentOpponentLord()) {
    add(`${card.name}（领主）`, 4);
  }
  if (card.id === 'basic_stealth' && source === 'player' && hasNoPhysicalOrMagicInHand(source, card)) {
    add('潜行（手牌无物理/魔法）', -3);
    if (!isPreview) {
      log('<span class="text-cyan-300">我方【潜行】手牌中没有物理或魔法卡牌，点数 -3</span>');
    }
  }
  if (card.id === 'basic_life_death_judgement' && baseDice === 4) {
    multiply('生死决断（投掷点数为4）', 4);
    if (!isPreview) {
      log(`<span class="text-rose-300">${sourceLabel}【${card.name}】投掷点数为4，点数 x4</span>`);
    }
  }
  if (card.id === 'basic_scarlet_scythe' && battleCardFirstUseConsumed.value[source][card.id] !== true) {
    multiply('猩红镰刀（首次使用）', 2);
    if (!isPreview && markBattleCardFirstUse(source, card.id)) {
      log(`<span class="text-rose-300">${sourceLabel}【${card.name}】首次使用，点数 x2</span>`);
    }
  }
  if (card.id === 'basic_slime_axe' && !suppressComparisonSpecials) {
    const opposing = getOpposingCardForPointComparison(source);
    if (opposing.card) {
      const opposingPoint = getCardFinalPoint(opposing.side, opposing.card, opposing.baseDice, true, true);
      if (finalPoint <= opposingPoint) {
        setPoint('粘液斧（超过对方最终点数）', opposingPoint + 1);
      }
    }
  }
  if (card.id === 'modao_rune_greatsword') {
    const magicCardCount = countMagicCardsInDeckForSide(source);
    add(`符文大剑（牌库法术 ${magicCardCount}）`, magicCardCount * 2);
  }
  if (card.id === 'alchemy_abnormal_overload') {
    const debuffTypeCount = countDistinctDebuffTypes(defender);
    add(`异况超量（负面状态种类${debuffTypeCount}）`, debuffTypeCount);
  }
  if (card.id === 'alchemy_gilded_strike') {
    const rareCount = countBattleCardsForSide(source, card, entry => entry.rarity === '稀有');
    add(`辉金打击（稀有牌${rareCount}）`, rareCount * 2);
  }
  if (source === 'player' && getActiveRelicCount('alchemy_five_color_paint') > 0 && !card.traits.combo) {
    const handTypeCount = countHandCardTypesForSide(source, card);
    if (handTypeCount >= 3) {
      multiply(`五色颜料（手牌类型${handTypeCount}）`, 1.5);
      if (!isPreview) {
        logRelicMessage(`[五色颜料] 手牌类型达到 ${handTypeCount} 种，非连击牌点数 x1.5。`);
      }
    }
  }
  if (source === 'player' && getActiveRelicCount('alchemy_five_color_ring') > 0) {
    const typeCount = countDistinctCardTypesForSide(source, card);
    if (typeCount >= 5) {
      multiply(`五色环（卡牌类型${typeCount}）`, 1.5);
      if (!isPreview) {
        logRelicMessage('[五色环] 牌组拥有5种卡牌类型，点数 x1.5。');
      }
    } else if (typeCount >= 4) {
      multiply(`五色环（卡牌类型${typeCount}）`, 1.2);
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
      add('巫毒娃娃（诅咒牌）', bonus);
      if (!isPreview) {
        logRelicMessage(`[巫毒娃娃] 诅咒牌使点数 +${bonus}。`);
      }
    }
  }
  const grandSynthesisBonus = getAlchemyGrandSynthesisPointBonus(source, card);
  if (grandSynthesisBonus > 0) {
    add('大炼成绑定', grandSynthesisBonus);
  }
  add('空白的空白（本回合累计）', Math.max(0, blankOfBlankBonusThisTurn.value[source] ?? 0));
  add('本回合点数修正', Math.floor(turnPointModifier.value[source] ?? 0));
  add('鬼影步', getGhostStepPointBonus(source, card));
  if (card.type === CardType.MAGIC) {
    add('风筝（本回合法术点数加成）', getCurrentTurnMagicPointBonus(source));
  }
  if (card.type === CardType.DODGE) {
    add('鳞粉', Math.max(0, getEffectStacks(attacker, ET.SCALE_POWDER)));
  }
  if (source === 'enemy' && isTwinBattle && dreamControlPercent.value <= 24) {
    multiply('梦境控制权（<=24%）', 1.5);
  }
  if (card.id === PASS_CARD.id) {
    finalPoint = 0;
  }
  if (
    source === 'enemy'
    && getActiveRelicCount('burn_circling_glow') > 0
    && (getEffectStacks(playerStats.value, ET.COLD) > 0 || getEffectStacks(enemyStats.value, ET.COLD) > 0)
  ) {
    add('环绕火光（存在寒冷）', -getActiveRelicCount('burn_circling_glow'));
  }

  if (source === 'player') {
    forEachPlayerRelic((entry, relic, state) => {
      const hook = relic.hooks?.modifyFinalPoint;
      if (!hook) return;
      if (
        shriveledHandActive
        && (relic.id === 'modao_witch_hat'
          || relic.id === 'basic_brute_hammer'
          || relic.id === 'basic_silver_mirror'
          || relic.id === 'burn_will_o_wisp_chain')
      ) {
        return;
      }
      const beforeRelicPoint = finalPoint;
      const ctx: RelicPointHookContext = {
        count: entry.count,
        side: 'player',
        turn: combatState.value.turn,
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
      if (Math.abs(finalPoint - beforeRelicPoint) >= 0.0001) {
        trace?.push(`${relic.name} ${formatRelicPointDelta(relic.id, beforeRelicPoint, finalPoint)} => ${formatPointValue(finalPoint)}`);
      }
    });

    const beforeRedHeadband = finalPoint;
    finalPoint = applyBloodpoolRedHeadbandPointBonus(source, card, attacker, finalPoint, isPreview);
    if (Math.abs(finalPoint - beforeRedHeadband) >= 0.0001) {
      trace?.push(`红色头带 ${formatRelicPointDelta('bloodpool_red_headband', beforeRedHeadband, finalPoint)} => ${formatPointValue(finalPoint)}`);
    }
  }

  if (shouldApplyAmplificationStarPointBonus(source, card)) {
    const beforeStar = finalPoint;
    finalPoint *= getAmplificationStarPointMultiplier();
    trace?.push(`增幅星 ${formatRelicPointDelta('basic_amplification_star', beforeStar, finalPoint)} => ${formatPointValue(finalPoint)}`);
  }

  if (alchemyPerfumePointDoubleCardIds.value[source][card.id]) {
    multiply('魔女香水', 2);
  }

  if (card.id === 'modao_staff_strike') {
    setPoint('杖击（最终点数不低于原始点数）', Math.max(finalPoint, baseDice));
  }

  if (getMercyEffectAgainstCard(source, card)) {
    const beforeMercy = finalPoint;
    multiply('怜悯', 0.5);
    if (!isPreview) {
      const holderLabel = source === 'player' ? '敌方' : '我方';
      log(`<span class="text-fuchsia-300">${holderLabel}[怜悯] ${sourceLabel}打出被标记的【${card.type}】牌，点数 x0.5（${formatPointValue(beforeMercy)}→${formatPointValue(finalPoint)}）。</span>`);
    }
  }

  if (card.id === UMBILICAL_TENTACLE_CARD.PULL && !suppressComparisonSpecials) {
    const beforePull = finalPoint;
    finalPoint = getUmbilicalPullFinalPoint(
      finalPoint,
      opposingPointOverride === undefined ? getUmbilicalOpposingPoint(source, isPreview) : opposingPointOverride,
      combatState.value.turn,
    );
    const delta = finalPoint - beforePull;
    trace?.push(`牵引入巢（调整上限±${getUmbilicalPullLimit(combatState.value.turn)}）${delta >= 0 ? '+' : ''}${formatPointValue(delta)} => ${formatPointValue(finalPoint)}`);
  }

  return Math.max(0, Math.floor(finalPoint));
};

const formatPointValue = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(Math.trunc(rounded));
  return rounded.toFixed(2).replace(/\.?0+$/, '');
};

const getHolyWaterSpriteStruggleSelfDamageAmount = (entity: EntityStats): number => (
  Math.max(0, Math.floor(Math.max(0, entity.hp) * 0.2))
);

const getPlayerCardContextForEnemyPointPreview = (): CardData | null => {
  const selectedOrPreviewed = combatState.value.playerSelectedCard ?? playerPreviewCardForPointContext.value;
  if (selectedOrPreviewed) return selectedOrPreviewed;
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return null;
  return combatState.value.playerHand.find((handCard) => {
    if (handCard.id === PASS_CARD.id || handCard.traits.combo) return false;
    const runtimeCard = withEffectiveManaCost('player', handCard);
    return canPlayCard(playerStats.value, runtimeCard, combatState.value.playerBaseDice, {
      ...getPlayerManaCheckOptions(runtimeCard),
      previousCardType: previousPlayerLastCardType.value,
    }).allowed;
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
  if ((relicId === 'modao_witch_hat' || relicId === 'basic_brute_hammer' || relicId === 'basic_amplification_star') && Math.abs(before) > 0.0001) {
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
  // 明细直接取自实际结算的点数计算，避免两套逻辑不同步
  const lines: string[] = [];
  const finalPoint = getCardFinalPoint(source, card, baseDice, true, false, undefined, lines);
  const finalLine = `最终：${finalPoint}`;
  if (options?.hideDetails) {
    return [`原始：${baseDice}`, '？？？', finalLine];
  }
  return [...lines, finalLine];
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

const getDiscardCardAfterTemporaryRuntimeTraits = (playedCard: CardData, runtimeCard: CardData): CardData => {
  if (runtimeCard === playedCard) return playedCard;
  return cloneCardForBattle(playedCard);
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
    const { actualDamage, damageBeforeLimit } = applyDamageToSideWithRelics('enemy', enemyStats.value, damage, false, '异色玻璃球', {
      sourceSide: 'player',
      isDirectDamage: true,
    });
    if (actualDamage > 0) {
      pushFloatingNumber('enemy', actualDamage, 'physical', '-', { targetEntity: enemyStats.value, damageBeforeLimit });
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
  const { actualDamage, logs: applyLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
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
    && armorBefore > 0
    && applyLogs.some(applyLog => applyLog.startsWith('[护甲]'));
  if (actualDamage > 0 || armorBlocked) {
    pushFloatingNumber('enemy', actualDamage, isTrueDamage ? 'true' : 'magic', '-', {
      allowZero: armorBlocked,
      targetEntity: enemyStats.value,
      damageBeforeLimit,
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
  if (!canPlayerRerollDice.value) { playUiSfx('invalid'); return; }

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
  playUiSfx('none');
  battleFeedback.action('roll');
  const rerolledRaw = Math.max(0, Math.floor(rerolled));
  playerTurnRawDice.value = rerolledRaw;
  const afterCharge = consumeChargeOnRoll(playerStats.value, '我方', rerolledRaw);
  const after = applyCheatSilverCoinToPlayerReroll(afterCharge);
  combatState.value.playerBaseDice = after;
  previewPlayerDice.value = null;
  log(`<span class="text-amber-200">我方骰子重掷：${before} → ${after}</span>`);
  triggerPlayerAfterRerollRelics(before, after);
  emit('playerDiceRerolled', before, after);
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

const showEffectTooltipForTarget = (target: HTMLElement, effect: TooltipSource, align: TooltipAlign = 'center') => {
  const rect = target.getBoundingClientRect();
  if ('infoName' in effect) {
    const margin = 8;
    effectTooltip.value = {
      x: align === 'right'
        ? Math.max(margin, Math.min(rect.right + 10, window.innerWidth - 256 - margin))
        : Math.max(margin + 128, Math.min(rect.left + rect.width / 2, window.innerWidth - margin - 128)),
      y: Math.max(margin, rect.top - margin),
      name: effect.infoName,
      description: effect.description,
      stacks: 0,
      align,
      below: false,
    };
    return;
  }
  const below = effect.polarity === 'scene';
  const tooltipMaxWidth = below ? 320 : 256;
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
    y: below ? rect.bottom : top,
    name: getEffectInstanceName(effect),
    description: effect.polarity === 'scene'
      ? getSceneEffectDescription(effect)
      : getEffectDescription(effect.type, target.dataset.effectSide === 'enemy' ? 'enemy' : undefined),
    stacks: effect.stacks,
    align,
    below,
    previewCard: effect.type === ET.FANTASY_EMBRACE
      ? getCardByName(MOORE_MIMIC_CARD_KEY) ?? undefined
      : undefined,
  };
};

const showEffectTooltip = (
  event: MouseEvent | FocusEvent,
  effect: TooltipSource,
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
  effect: TooltipSource,
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
  options?: FloatingNumberOptions,
) => {
  const amount = Math.max(0, Math.floor(value));
  if (amount <= 0 && !options?.allowZero) return;
  const damageBeforeLimit = Math.max(0, Math.floor(options?.damageBeforeLimit ?? 0));
  const floatingTargetEntity = options?.targetEntity ?? (
    side === 'player'
      ? playerStats.value
      : (options?.targetId && isLeviathanBattle
        ? (getLeviathanSummonById(options.targetId)?.stats ?? enemyStats.value)
        : enemyStats.value)
  );
  const targetMaxHp = Math.max(0, Math.floor(floatingTargetEntity.maxHp));
  const heavyDamage = sign === '-' && targetMaxHp > 0 && amount > targetMaxHp * 0.25;

  const id = ++floatingNumberId;
  const duration = kind === 'heal' ? 1800 : 1350;
  const targetId = side === 'enemy' && isLeviathanBattle
    ? (options?.targetId ?? getLeviathanTargetIdByEntity(options?.targetEntity ?? getLeviathanEnemyEntity()))
    : undefined;
  floatingNumbers.value.push({
    id,
    side,
    targetId,
    kind,
    text: heavyDamage ? `${amount}!` : `${sign}${amount}`,
    heavyDamage,
    damageBeforeLimitText: sign === '-' && (kind === 'physical' || kind === 'magic') && damageBeforeLimit > amount
      ? `-${damageBeforeLimit}`
      : undefined,
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
  duration: number = 1050,
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

/** 本场战斗生效的正文负面状态；训练战独立于存档，不带入任何负面状态 */
const getBattleNegativeStatuses = (): string[] =>
  isTutorialBattle ? [] : normalizeNegativeStatusList(gameStore.statData.$负面状态);

const createNegativeStatusBattleContext = (parsed: ParsedNegativeStatus): NegativeStatusBattleContext => {
  const source = `negative-status:${parsed.raw}`;
  return {
    stacks: parsed.stacks,
    turn: combatState.value.turn,
    enemyName: String(gameStore.statData._对手名称 ?? '').trim(),
    applyEffect: (effectType, stacks, options) => (
      options?.lockDecayThisTurn
        ? applyStatusEffectWithRelics('player', effectType, stacks, { source, lockDecayThisTurn: true })
        : applyEffect(playerStats.value, effectType, stacks, { source })
    ),
    insertCards: (cardName, count) => {
      const card = getCardByName(cardName);
      if (!card) return 0;
      for (let i = 0; i < count; i += 1) {
        const insertAt = Math.floor(Math.random() * (combatState.value.playerDeck.length + 1));
        combatState.value.playerDeck.splice(insertAt, 0, cloneCardForBattle(card));
      }
      return count;
    },
    restoreMana: amount => restoreManaForSide('player', amount),
    loseHp: (amount, options) => {
      const floor = options?.nonLethal ? 1 : 0;
      const before = playerStats.value.hp;
      playerStats.value.hp = Math.max(Math.min(before, floor), before - Math.max(0, Math.floor(amount)));
      const lost = before - playerStats.value.hp;
      if (lost > 0) {
        pushFloatingNumber('player', lost, 'true', '-');
        addPlayerDamageTakenThisTurn(lost);
      }
      return lost;
    },
    random: Math.random,
    log: message => log(`<span class="text-fuchsia-300">[负面状态]${parsed.raw} ${message}</span>`),
  };
};

/** 负面状态的战斗效果统一定义在 negativeStatusRegistry 中 */
const applyMvuNegativeStatusesOnBattleStart = () => {
  runNegativeStatusBattleHooks('onBattleStart', getBattleNegativeStatuses(), createNegativeStatusBattleContext);
};

const applyNegativeStatusesOnTurnStart = () => {
  runNegativeStatusBattleHooks('onTurnStart', getBattleNegativeStatuses(), createNegativeStatusBattleContext);
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

const applyIntangibleAura = (ownerSide: BattleSide) => {
  const owner = ownerSide === 'player' ? playerStats.value : enemyStats.value;
  const intangible = findEffect(owner, ET.INTANGIBLE);
  if (!intangible || intangible.stacks <= 0) return;
  if (combatState.value.turn <= 0) return;

  const ownerLabel = ownerSide === 'player' ? '我方' : '敌方';
  const targetSide: BattleSide = ownerSide === 'player' ? 'enemy' : 'player';
  const target = getEntityBySide(targetSide);
  const targetLabel = targetSide === 'player' ? '我方' : '敌方';
  const skipCount = Math.max(0, Math.floor(intangible.runtimeCounter ?? 0));
  if (skipCount > 0) {
    intangible.runtimeCounter = skipCount - 1;
    log(`<span class="text-violet-300">[${ownerLabel}特性][无形] 本次敌意隐藏触发被群攻打断，剩余跳过 ${Math.max(0, skipCount - 1)} 次。</span>`);
    return;
  }
  if (getEffectStacks(target, ET.COGNITIVE_INTERFERENCE) > 0) {
    log(`<span class="text-violet-300">[${ownerLabel}特性][无形] ${targetLabel}已有敌意隐藏，本次无需重复施加。</span>`);
    return;
  }

  const applied = applyStatusEffectWithRelics(targetSide, ET.COGNITIVE_INTERFERENCE, 1, {
    source: 'effect:intangible',
    durationTurns: 1,
  });
  if (applied) {
    log(`<span class="text-violet-300">[${ownerLabel}特性][无形] 回合开始为${targetLabel}施加了1回合敌意隐藏。</span>`);
  }
};

const applyLeviathanSummonIntangibleAura = (summon: LeviathanSummonRuntime) => {
  const intangible = findEffect(summon.stats, ET.INTANGIBLE);
  if (!intangible || intangible.stacks <= 0) return;
  const skipCount = Math.max(0, Math.floor(intangible.runtimeCounter ?? 0));
  if (skipCount > 0) {
    intangible.runtimeCounter = skipCount - 1;
    log(`<span class="text-violet-300">[${summon.name}特性][无形] 本次敌意隐藏触发被群攻打断，剩余跳过 ${Math.max(0, skipCount - 1)} 次。</span>`);
    return;
  }
  if (getEffectStacks(playerStats.value, ET.COGNITIVE_INTERFERENCE) > 0) {
    log(`<span class="text-violet-300">[${summon.name}特性][无形] 我方已有敌意隐藏，本次无需重复施加。</span>`);
    return;
  }
  const applied = applyStatusEffectWithRelics('player', ET.COGNITIVE_INTERFERENCE, 1, {
    source: 'effect:intangible',
    durationTurns: 1,
  });
  if (applied) {
    log(`<span class="text-violet-300">[${summon.name}特性][无形] 回合开始为我方施加了1回合敌意隐藏。</span>`);
  }
};

const processLeviathanSummonTurnStart = (summon: LeviathanSummonRuntime) => {
  if (summon.stats.hp <= 0) return;
  const previousSourceOverride = leviathanEnemySourceOverride.value;
  const previousTargetOverride = leviathanEnemyTargetOverride.value;
  leviathanEnemySourceOverride.value = summon.stats;
  leviathanEnemyTargetOverride.value = summon.stats;
  try {
    applyLeviathanSummonIntangibleAura(summon);
    const result = processOnTurnStart(summon.stats);
    const logs = [...result.logs];

    if (combatState.value.turn % 3 === 0) {
      const growthBigStacks = getEffectStacks(summon.stats, ET.POINT_GROWTH_BIG);
      if (growthBigStacks > 0) {
        summon.stats.maxDice += growthBigStacks;
        logs.push(`[点数成长（大）] 最大骰子点数 +${growthBigStacks}（当前 ${summon.stats.maxDice}）`);
      }
      const growthSmallStacks = getEffectStacks(summon.stats, ET.POINT_GROWTH_SMALL);
      if (growthSmallStacks > 0) {
        summon.stats.minDice += growthSmallStacks;
        if (summon.stats.minDice > summon.stats.maxDice) {
          summon.stats.maxDice = summon.stats.minDice;
        }
        logs.push(`[点数成长（小）] 最小骰子点数 +${growthSmallStacks}（当前 ${summon.stats.minDice}）`);
      }
    }

    for (const pending of result.applyToOpponent) {
      applyStatusEffectWithRelics('player', pending.type, pending.stacks, { source: `effect:${pending.type}` });
    }
    if (result.opponentHpChange > 0) {
      healForSide('player', result.opponentHpChange, {
        sourceSide: 'enemy',
        reason: '召唤物回合开始效果治疗',
      });
    } else if (result.opponentHpChange < 0) {
      const before = playerStats.value.hp;
      playerStats.value.hp = Math.max(0, Math.min(playerStats.value.maxHp, playerStats.value.hp + result.opponentHpChange));
      const delta = playerStats.value.hp - before;
      if (delta < 0) {
        pushFloatingNumber('player', Math.abs(delta), 'magic', '-');
      }
    }
    if (result.hpChange > 0) {
      healForSide('enemy', result.hpChange);
    } else if (result.hpChange < 0) {
      const { actualDamage, logs: damageLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
        'enemy',
        summon.stats,
        -result.hpChange,
        false,
        '召唤物回合开始伤害',
        { sourceSide: 'player', dreamControlKind: 'status', feedbackEffect: getEffectStacks(summon.stats, ET.BURN) > 0 ? 'burn' : undefined },
      );
      if (actualDamage > 0) {
        pushFloatingNumber('enemy', actualDamage, 'magic', '-', { targetEntity: summon.stats, damageBeforeLimit });
      }
      logs.push(...damageLogs);
    }
    if (result.trueDamage > 0) {
      const { actualDamage, logs: damageLogs } = applyDamageToSideWithRelics(
        'enemy',
        summon.stats,
        result.trueDamage,
        true,
        '召唤物回合开始真实伤害',
        { sourceSide: 'player', dreamControlKind: 'status', feedbackEffect: 'poison' },
      );
      if (actualDamage > 0) {
        pushFloatingNumber('enemy', actualDamage, 'true', '-', { targetEntity: summon.stats });
      }
      logs.push(...damageLogs);
    }
    if (result.mpChange !== 0) {
      changeManaWithShock('enemy', result.mpChange, '召唤物魔力变化（回合开始）', { showPositiveFloating: true });
    }
    const reviveResult = triggerSwarmReviveIfNeeded(summon.stats, 'enemy');
    logs.push(...reviveResult.logs);
    for (const entry of logs) {
      log(`<span class="text-gray-400 text-[9px]">召唤物【${summon.name}】: ${entry}</span>`);
    }
  } finally {
    leviathanEnemySourceOverride.value = previousSourceOverride;
    leviathanEnemyTargetOverride.value = previousTargetOverride;
  }
};

const processLeviathanSummonTurnEnd = (summon: LeviathanSummonRuntime) => {
  if (summon.stats.hp <= 0) return;
  const previousSourceOverride = leviathanEnemySourceOverride.value;
  const previousTargetOverride = leviathanEnemyTargetOverride.value;
  leviathanEnemySourceOverride.value = summon.stats;
  leviathanEnemyTargetOverride.value = summon.stats;
  try {
    const poisonTriggered = getEffectStacks(summon.stats, ET.POISON) > 0;
    const logs = processOnTurnEnd(summon.stats);
    if (poisonTriggered) presentEffect(summon.stats, 'poison');
    for (const entry of logs) {
      log(`<span class="text-gray-500 text-[9px]">召唤物【${summon.name}】: ${entry}</span>`);
    }
  } finally {
    leviathanEnemySourceOverride.value = previousSourceOverride;
    leviathanEnemyTargetOverride.value = previousTargetOverride;
  }
};

const isLeviathanMirrorSeaOathActive = (): boolean => (
  isLeviathanBattle && leviathanMirrorSeaOathActiveTurn.value === combatState.value.turn
);

const healLeviathanEntityDirect = (entity: EntityStats, amount: number): number => {
  const value = Math.max(0, Math.floor(amount));
  if (value <= 0 || entity.hp <= 0) return 0;
  const before = entity.hp;
  entity.hp = Math.max(0, Math.min(entity.maxHp, entity.hp + value));
  return Math.max(0, entity.hp - before);
};

const pushLeviathanEntityRecoveryNumber = (
  entity: EntityStats,
  amount: number,
  kind: 'hp' | 'mp',
) => {
  pushFloatingNumber('enemy', amount, kind === 'hp' ? 'heal' : 'mana', '+', { targetEntity: entity });
};

const triggerLeviathanMirrorSeaOathRecovery = (amount: number) => {
  if (!isLeviathanMirrorSeaOathActive()) return;
  const baseAmount = Math.max(0, Math.floor(amount));
  if (baseAmount <= 0) return;
  const teamAmount = baseAmount * 10;
  let recoveredTotal = 0;
  for (const entity of getLeviathanTeamEntities()) {
    const recovered = healLeviathanEntityDirect(entity, teamAmount);
    recoveredTotal += recovered;
    if (recovered > 0) {
      pushLeviathanEntityRecoveryNumber(entity, recovered, 'hp');
    }
  }
  log(`<span class="text-cyan-300">利维坦[镜海之誓] 感应到我方回复生命 ${baseAmount}，己方全体回复 ${teamAmount} 点生命（合计 ${recoveredTotal}）。</span>`);
};

const activateLeviathanMirrorSeaOathIfPending = () => {
  if (!isLeviathanBattle || leviathanMirrorSeaOathPendingPoint.value <= 0) return;
  const sturdyStacks = Math.max(0, Math.floor(leviathanMirrorSeaOathPendingPoint.value));
  leviathanMirrorSeaOathPendingPoint.value = 0;
  leviathanMirrorSeaOathActiveTurn.value = combatState.value.turn;
  let appliedCount = 0;
  if (sturdyStacks > 0) {
    for (const entity of getLeviathanTeamEntities()) {
      if (applyEffect(entity, ET.STURDY, sturdyStacks, {
        source: 'enemy_leviathan_mirror_sea_oath',
        durationTurns: 1,
      })) {
        appliedCount += 1;
      }
    }
  }
  log(`<span class="text-cyan-300">利维坦[镜海之誓] 生效：己方 ${appliedCount} 个单位获得 ${sturdyStacks} 层坚固，本回合生命回复共鸣已开启。</span>`);
};

const activateLeviathanTidalLockIfPending = () => {
  if (!isLeviathanBattle || leviathanTidalLockPendingTurn.value <= 0) return;
  if (combatState.value.turn < leviathanTidalLockPendingTurn.value) return;
  leviathanTidalLockPendingTurn.value = 0;
  applyStatusEffectWithRelics('player', ET.BIND, 2, {
    source: 'enemy_leviathan_tidal_lock',
    lockDecayThisTurn: true,
  });
  applyStatusEffectWithRelics('player', ET.RESONANCE_LOCK, 4, {
    source: 'enemy_leviathan_tidal_lock',
    lockDecayThisTurn: true,
  });
  log('<span class="text-violet-300">利维坦[潮汐锁定] 生效：我方获得2层束缚与4层共鸣锁。</span>');
};

const resolveLeviathanTidalLockCheckIfPending = () => {
  if (!isLeviathanBattle || leviathanTidalLockCheckTurn.value !== combatState.value.turn) return;
  leviathanTidalLockCheckTurn.value = 0;
  if (getDamageHitTakenThisTurn('enemy') <= 0) {
    leviathanTidalLockPendingTurn.value = Math.max(
      leviathanTidalLockPendingTurn.value,
      combatState.value.turn + 1,
    );
    log('<span class="text-violet-300">利维坦[潮汐锁定] 判定：我方本回合未能造成伤害，下回合将获得2层束缚与4层共鸣锁。</span>');
  } else {
    log('<span class="text-gray-400">利维坦[潮汐锁定] 判定：我方本回合已经造成过伤害，潮汐锁定未触发。</span>');
  }
};

const grantLeviathanGenesisFromSummonDamage = (reason: string) => {
  const summon = leviathanActingSummon.value;
  if (!isLeviathanBattle || !summon) return;
  if (enemyStats.value.hp <= 0) return;
  if (applyEffect(enemyStats.value, ET.GENESIS, 1, { source: `summon:${summon.name}` })) {
    log(`<span class="text-violet-300">利维坦[创世] ${summon.name}${reason}造成伤害，创世 +1（当前 ${getEffectStacks(enemyStats.value, ET.GENESIS)}）。</span>`);
  }
};

const consumeLeviathanGenesisKeepingOne = (limit: number = Number.POSITIVE_INFINITY): number => {
  const stacks = Math.max(0, getEffectStacks(enemyStats.value, ET.GENESIS));
  const consumable = Math.max(0, stacks - 1);
  const consumed = Math.min(consumable, Math.max(0, Math.floor(limit)));
  if (consumed > 0) {
    reduceEffectStacks(enemyStats.value, ET.GENESIS, consumed);
  }
  return consumed;
};

const removeRandomDebuffStacksFromEntity = (entity: EntityStats, count: number): number => {
  let removed = 0;
  let remaining = Math.max(0, Math.floor(count));
  while (remaining > 0) {
    const debuffs = entity.effects.filter(effect => (
      effect.stacks > 0 && EFFECT_REGISTRY[effect.type]?.polarity === 'debuff'
    ));
    if (debuffs.length <= 0) break;
    const picked = debuffs[Math.floor(Math.random() * debuffs.length)]!;
    reduceEffectStacks(entity, picked.type, 1);
    removed += 1;
    remaining -= 1;
  }
  return removed;
};

const healLeviathanTeam = (amount: number, showFloating: boolean = false): number => (
  getLeviathanTeamEntities().reduce((sum, entity) => {
    const healed = healLeviathanEntityDirect(entity, amount);
    if (showFloating && healed > 0) {
      pushLeviathanEntityRecoveryNumber(entity, healed, 'hp');
    }
    return sum + healed;
  }, 0)
);

const getLeviathanSupportTarget = (): LeviathanSummonRuntime | null => {
  const alive = getAliveLeviathanSummons();
  for (const name of LEVIATHAN_SUMMON_PRIORITY) {
    const picked = alive.find(summon => summon.name === name);
    if (picked) return picked;
  }
  return null;
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

const insertHolyWaterBackflowForAbyssShoal = () => {
  if (enemyDisplayName !== '深渊鱼群') return;
  const card = getCardByName('圣水倒灌');
  if (!card) {
    log('<span class="text-red-400">[深渊鱼群] 未找到【圣水倒灌】卡牌定义。</span>');
    return;
  }

  combatState.value.playerDeck = insertCardIntoDeckRandomly(
    combatState.value.playerDeck,
    cloneCardForBattle(card),
  );
  log(`<span class="text-fuchsia-300">[深渊鱼群] 开局向我方抽牌堆插入了1张【圣水倒灌】（牌库${combatState.value.playerDeck.length}）。</span>`);
};

/**
 * 战斗修正的最小点数下限（如校规·狂热课堂令）：最小点数低于下限时提升至下限，
 * 最大点数低于下限时也提升至下限。开局与每次投掷前各执行一次，战斗中被压低的点数会在下次投掷前恢复。
 */
const applyEventDiceFloor = (timing: 'battle_start' | 'roll') => {
  const modifiers = props.battleModifiers;
  if (!modifiers || isTutorialBattle) return;
  const sides = [
    { label: '我方', stats: playerStats.value, floor: modifiers.player.minDiceFloor },
    { label: '敌方', stats: enemyStats.value, floor: modifiers.enemy.minDiceFloor },
  ];
  for (const { label, stats, floor } of sides) {
    if (!(floor > 0)) continue;
    const beforeMin = stats.minDice;
    const beforeMax = stats.maxDice;
    stats.minDice = Math.max(stats.minDice, floor);
    stats.maxDice = Math.max(stats.maxDice, floor, stats.minDice);
    if (stats.minDice === beforeMin && stats.maxDice === beforeMax) continue;
    const sourceText = modifiers.sources.length > 0 ? `[${modifiers.sources.join('、')}]` : '[战斗修正]';
    log(
      `<span class="text-amber-300">${sourceText} ${label}${timing === 'battle_start' ? '' : '本次投掷'}最小点数不得低于 ${floor}，点数范围 ${beforeMin}~${beforeMax} → ${stats.minDice}~${stats.maxDice}。</span>`,
    );
  }
};

/** 事件带来的战斗修正（$战斗修正）：开局护甲 / 回复 / 魔力 / 点数 / 状态 */
const applyEventBattleModifiersOnStart = () => {
  const modifiers = props.battleModifiers;
  if (!modifiers || isTutorialBattle) return;
  const sourceText = modifiers.sources.length > 0 ? `[${modifiers.sources.join('、')}]` : '[战斗修正]';
  const logModifier = (message: string) => log(`<span class="text-amber-300">${sourceText} ${message}</span>`);

  const player = modifiers.player;
  if (player.minDice !== 0 || player.maxDice !== 0) {
    playerStats.value.minDice = Math.max(1, playerStats.value.minDice + player.minDice);
    playerStats.value.maxDice = Math.max(playerStats.value.minDice, playerStats.value.maxDice + player.maxDice);
    logModifier(`我方点数范围变为 ${playerStats.value.minDice}~${playerStats.value.maxDice}。`);
  }
  // 点数增减先结算，再套用最小点数下限
  applyEventDiceFloor('battle_start');
  if (player.heal > 0) {
    const { healed } = healForSide('player', player.heal, { sourceSide: 'player', reason: '战斗修正' });
    if (healed > 0) logModifier(`我方开局回复 ${healed} 点生命。`);
  }
  if (player.mana > 0) {
    const restored = restoreManaForSide('player', player.mana);
    if (restored > 0) logModifier(`我方开局魔力 +${restored}。`);
  }
  if (player.armor > 0) {
    const added = addArmorForSide('player', player.armor);
    if (added > 0) logModifier(`我方开局获得 ${added} 点护甲。`);
  }
  for (const effect of player.effects) {
    if (effect.stacks > 0 && applyEffect(playerStats.value, effect.type, effect.stacks, { source: 'event-modifier' })) {
      logModifier(`我方开局获得 ${effect.stacks} 层${getEffectName(effect.type)}。`);
    }
  }

  const enemy = modifiers.enemy;
  if (enemy.armor > 0) {
    const added = addArmorForSide('enemy', enemy.armor);
    if (added > 0) logModifier(`敌方开局获得 ${added} 点护甲。`);
  }
  for (const effect of enemy.effects) {
    if (effect.stacks > 0 && applyEffect(enemyStats.value, effect.type, effect.stacks, { source: 'event-modifier' })) {
      logModifier(`敌方开局获得 ${effect.stacks} 层${getEffectName(effect.type)}。`);
    }
  }
  if (enemy.hpMultiplier !== 1) {
    logModifier(`敌方生命 ×${enemy.hpMultiplier}。`);
  }
};

triggerPlayerRelicLifecycleHooks('onBattleStart');
applyAlchemyBattleStartRelics();
applyMvuNegativeStatusesOnBattleStart();
applyEventBattleModifiersOnStart();
applyDifficultyBattleStartEffects();
applyCustomDifficultyBattleStartEffects();
insertHolyWaterBackflowForAbyssShoal();
applyFantasyEmbraceBattleStart('player');
applyFantasyEmbraceBattleStart('enemy');
applySightDeprivationBattleStart('player');
applySightDeprivationBattleStart('enemy');
applyUnseeableAura('player', 'battle_start');
applyUnseeableAura('enemy', 'battle_start');

onMounted(() => {
  battleSpeedUp.value = localStorage.getItem(SPEED_SETTING_KEY) === '1';
  void prepareBattleResources();
  enemyPortraitHiddenTransitionFrameId = requestAnimationFrame(() => {
    enemyPortraitHiddenTransitionFrameId = requestAnimationFrame(() => {
      enemyPortraitHiddenTransitionFrameId = null;
      isEnemyPortraitHiddenTransitionReady.value = true;
    });
  });
});
watch(
  () => props.playerPortraitOverrideUrl,
  () => {
    void initPortraitUrls();
  },
);
onUnmounted(() => {
  portraitLoaderDisposed = true;
  if (painPortraitTransitionSourceTimer !== null) clearTimeout(painPortraitTransitionSourceTimer);
  if (painPortraitTransitionEndTimer !== null) clearTimeout(painPortraitTransitionEndTimer);
  pendingPainOaths.value = [];
  resolvePainOathChoice?.();
  resolvePainOathChoice = null;
  if (enemyPortraitHiddenTransitionFrameId !== null) {
    cancelAnimationFrame(enemyPortraitHiddenTransitionFrameId);
    enemyPortraitHiddenTransitionFrameId = null;
  }
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
    if (!card) continue;
    // 【预言】的临时复制品被再次抽到时复原为预言
    const prophecyOrigin = prophecyCopyOrigin.get(toRaw(card));
    if (prophecyOrigin) prophecyCopyOrigin.delete(toRaw(card));
    drawn.push(prophecyOrigin ?? card);
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
            pushFloatingNumber('enemy', actualDamage, 'true', '-', { targetEntity: enemyStats.value });
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
  return raw.map((skill, idx) => {
    if (!skill) return null;
    const formId = skill.id === OMNI_WAND_SKILL_ID ? omniWandFormBySlot.value[idx] : null;
    const formSkill = formId ? getActiveSkillById(formId) : null;
    return formSkill ? { ...formSkill } : { ...skill };
  });
});

const isOmniWandBaseSlot = (idx: number): boolean => {
  const raw = Array.isArray(props.playerActiveSkills) ? props.playerActiveSkills[idx] : null;
  return raw?.id === OMNI_WAND_SKILL_ID;
};

const omniWandFormChoices = computed<ActiveSkillData[]>(() => OMNI_WAND_FORM_IDS
  .map(id => getActiveSkillById(id))
  .filter((skill): skill is ActiveSkillData => Boolean(skill)));

const omniWandRevertibleSlots = computed<number[]>(() => [0, 1].filter(idx => (
  isOmniWandBaseSlot(idx) && Boolean(omniWandFormBySlot.value[idx])
)));

const confirmOmniWandForm = (formId: string) => {
  const slotIdx = omniWandSelectingSlot.value;
  omniWandSelectingSlot.value = null;
  if (slotIdx === null) return;
  const formSkill = getActiveSkillById(formId);
  if (!formSkill) return;
  omniWandFormBySlot.value = { ...omniWandFormBySlot.value, [slotIdx]: formId };
  log(`<span class="text-zinc-200">主动【万象魔杖】：本场战斗中变化为【${formSkill.name}】。</span>`);
};

const revertOmniWandSlot = (slotIdx: number) => {
  if (!omniWandFormBySlot.value[slotIdx]) return;
  omniWandFormBySlot.value = { ...omniWandFormBySlot.value, [slotIdx]: null };
  log('<span class="text-zinc-200">主动【万象魔杖】：已切回万象魔杖。</span>');
};

const playerTempGoldDisplay = computed(() => Math.max(0, Math.floor(battleTempGold.value)));
const playerGoldDisplay = computed(() => getSystemGold());

const FORBIDDEN_WASTE_BARREL_ID = 'system_destruction_relic_11';
const canDiscardForbiddenWasteBarrel = computed(() => (
  !consumedRelicIdsThisBattle.value.includes(FORBIDDEN_WASTE_BARREL_ID)
  && getActiveRelicCount(FORBIDDEN_WASTE_BARREL_ID) > 0
));

/** 禁忌废液桶：弃置本圣遗物，对敌方造成其20%当前生命的真实伤害 */
const discardForbiddenWasteBarrel = () => {
  if (!canDiscardForbiddenWasteBarrel.value || combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  const target = getEntityBySide('enemy');
  const rawDamage = Math.max(0, Math.floor(Math.max(0, target.hp) * 0.2));
  consumedRelicIdsThisBattle.value = [...consumedRelicIdsThisBattle.value, FORBIDDEN_WASTE_BARREL_ID];
  const { actualDamage } = rawDamage > 0
    ? applyDamageToSideWithRelics('enemy', target, rawDamage, true, '禁忌废液桶', { sourceSide: 'player', isDirectDamage: true })
    : { actualDamage: 0 };
  if (actualDamage > 0) pushFloatingNumber('enemy', actualDamage, 'true', '-', { targetEntity: target });
  logRelicMessage(`[禁忌废液桶] 弃置圣遗物，对敌方造成 ${actualDamage} 点真实伤害。`);
};

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
  // 万象魔杖未变化形态时：点击仅打开形态选择，不受冷却与魔力限制
  if (skill.id === OMNI_WAND_SKILL_ID) return null;

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

  const maxUsesPerTurn = Math.max(0, Math.floor(skill.maxUsesPerTurn ?? 0));
  if (maxUsesPerTurn > 0) {
    const usedThisTurn = Math.max(0, Math.floor(activeSkillTurnUseCount.value[skill.id] ?? 0));
    if (usedThisTurn >= maxUsesPerTurn) {
      return `本回合已达到最大使用次数（${maxUsesPerTurn}）`;
    }
  }

  if ((skill.id === 'active_wealth_bargain' || skill.id === 'active_wealth_power') && getSpendableGold() <= 0) {
    return '金币不足';
  }

  if (getPlayerPayableMana() < getActiveSkillManaCost(idx)) {
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
    && isHandSelectionActiveSkill(skill.id)
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
  if (reason === '金币不足') return '缺金';
  if (slot.skill?.id === OMNI_WAND_SKILL_ID) return '变化';
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

/** 需要先选择一张手牌再结算的主动技 */
const isHandSelectionActiveSkill = (skillId: string): boolean => (
  skillId === 'active_alchemy_purify' || skillId === 'active_alchemy_appreciate' || skillId === 'active_wealth_pawn'
);

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

  if (mode === 'pawn' && card.type === CardType.CURSE && getSpendableGold() < 2) {
    playUiSfx('invalid');
    log(`<span class="text-gray-400">主动【${skill.name}】：金币不足2，无法典当诅咒牌。</span>`);
    return true;
  }

  const manaCost = getActiveSkillManaCost(skillIdx);
  if (manaCost > 0) {
    const ok = spendPlayerManaWithBottle(manaCost, `使用主动【${skill.name}】`);
    if (!ok) {
      log(`<span class="text-red-400">主动【${skill.name}】使用失败：魔力不足。</span>`);
      return true;
    }
  }

  if (mode === 'pawn') {
    if (card.type === CardType.CURSE) {
      const spent = spendGoldPreferTemp(2);
      combatState.value.playerHand.splice(handIdx, 1);
      log(`<span class="text-yellow-300">主动【${skill.name}】：消耗 ${spent} 金币，本场战斗中移除了诅咒【${card.name}】。</span>`);
    } else {
      const replacementName = card.rarity === '稀有' ? '空白的空白' : '空白';
      const template = getCardByName(replacementName);
      if (!template) {
        log(`<span class="text-gray-400">主动【${skill.name}】：未找到【${replacementName}】。</span>`);
        return true;
      }
      const original = combatState.value.playerHand[handIdx];
      const slot = original ? playerHandSlotByCard.get(original) ?? handIdx : handIdx;
      const replacement = cloneCardForBattle(template);
      recordCardTransform(original, replacement);
      combatState.value.playerHand.splice(handIdx, 1, replacement);
      const placed = combatState.value.playerHand[handIdx];
      if (placed) playerHandSlotByCard.set(placed, slot);
      log(`<span class="text-yellow-300">主动【${skill.name}】：本场战斗中将【${card.name}】典当为【${replacementName}】。</span>`);
    }
  } else if (mode === 'purify') {
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
  battleFeedback.action('roll');

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
    && isHandSelectionActiveSkill(skill.id)
  ) {
    clearActiveHandSelection();
    log(`<span class="text-gray-400">主动【${skill.name}】：已退出选择。</span>`);
    return;
  }
  const disabledReason = activeSkillDisabledReason(idx);
  if (disabledReason) {
    playUiSfx('invalid');
    log(`<span class="text-gray-400">主动【${skill.name}】无法使用：${disabledReason}</span>`);
    return;
  }

  if (skill.id === OMNI_WAND_SKILL_ID) {
    omniWandSelectingSlot.value = idx;
    return;
  }

  if (isHandSelectionActiveSkill(skill.id)) {
    activeHandSelectionMode.value = skill.id === 'active_alchemy_purify'
      ? 'purify'
      : skill.id === 'active_wealth_pawn' ? 'pawn' : 'appreciate';
    activeHandSelectionSkillIdx.value = idx;
    log(`<span class="text-yellow-300">主动【${skill.name}】：请选择一张手牌。</span>`);
    return;
  }

  activeSkillResolving.value = true;
  const manaCost = getActiveSkillManaCost(idx);
  if (manaCost > 0) {
    const ok = spendPlayerManaWithBottle(manaCost, `使用主动【${skill.name}】`);
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
      const nextHand = drawn.slice(0, PLAYER_HAND_SLOT_COUNT);
      markDrawnCardsAnimation(nextHand);
      combatState.value.playerHand = mergePlayerHandWithDrawnCards([], nextHand);
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
      // 手牌在本场战斗中被「转换」：原来的手牌离开本场战斗（不进入弃牌堆），由等量的随机稀有卡取代
      const oldHand = [...combatState.value.playerHand];
      const nextHand = replacePlayerHandWithRandomRareCards(oldHand.length);
      await playCardsToDiscardAnimation(oldHand);
      markDrawnCardsAnimation(nextHand);
      combatState.value.playerHand = mergePlayerHandWithDrawnCards([], nextHand);
      log(
        `<span class="text-zinc-200">主动【${skill.name}】：本场战斗中将手牌${
          oldHand.length > 0 ? `【${oldHand.map(card => card.name).join('、')}】` : ''
        }转换为 ${nextHand.length} 张随机稀有卡牌${
          nextHand.length > 0 ? `【${nextHand.map(card => card.name).join('、')}】` : ''
        }。</span>`,
      );
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
      recordBattlePainLoss('player', Math.max(0, -hpDelta), false, true);
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
      recordBattlePainLoss('player', Math.max(0, -delta), false, true);
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
      const decomposed = cloneCardForBattle(curseCard);
      recordCardTransform(picked.entry, decomposed);
      combatState.value.playerHand.splice(picked.handIdx, 1, decomposed);
      changeSystemGold(1);
      const { healed } = healForSide('player', 5, {
        reason: `主动【${skill.name}】治疗`,
      });
      log(`<span class="text-yellow-300">主动【${skill.name}】：将【${beforeName}】变为【黑手印】，获得1金币，回复 ${healed} 点生命。</span>`);
      break;
    }
    case 'active_wealth_crystal': {
      const added = gainArmorAsCardEffect('player', 6, skill.id, `主动【${skill.name}】`);
      log(`<span class="text-amber-200">主动【${skill.name}】：获得 ${added} 点护甲。</span>`);
      break;
    }
    case 'active_wealth_pan_gold': {
      const amount = Math.max(0, Math.floor(combatState.value.playerBaseDice * 0.5));
      if (amount <= 0) {
        log(`<span class="text-gray-400">主动【${skill.name}】：当前点数过低，未获得金币。</span>`);
        break;
      }
      if (!systemCardBattleFlags.value.player[skill.id]) {
        systemCardBattleFlags.value.player[skill.id] = true;
        changeSystemGold(amount);
        log(`<span class="text-yellow-300">主动【${skill.name}】：获得 ${amount} 金币。</span>`);
      } else {
        gainTempGold(amount);
        log(`<span class="text-yellow-300">主动【${skill.name}】：获得 ${amount} 临时金币。</span>`);
      }
      break;
    }
    case 'active_wealth_polish': {
      const added = gainArmorAsCardEffect('player', 2, skill.id, `主动【${skill.name}】`);
      armorDecaySkippedThisTurn.value.player = true;
      log(`<span class="text-amber-200">主动【${skill.name}】：获得 ${added} 点护甲，本回合护甲不会减半。</span>`);
      break;
    }
    case 'active_wealth_bargain': {
      if (spendGoldPreferTemp(1) <= 0) {
        log(`<span class="text-gray-400">主动【${skill.name}】：金币不足。</span>`);
        break;
      }
      const added = gainArmorAsCardEffect('player', 2, skill.id, `主动【${skill.name}】`);
      const restored = restoreManaForSide('player', 1);
      log(`<span class="text-yellow-300">主动【${skill.name}】：消耗1金币，获得 ${added} 点护甲与 ${restored} 点魔力。</span>`);
      break;
    }
    case 'active_wealth_power': {
      const useCount = increaseSystemCardTurnUses('player', skill.id);
      const spent = useCount >= 5 ? spendGoldPreferTemp(getSpendableGold()) : spendGoldPreferTemp(1);
      if (spent <= 0) {
        log(`<span class="text-gray-400">主动【${skill.name}】：金币不足。</span>`);
        break;
      }
      const before = combatState.value.playerBaseDice;
      combatState.value.playerBaseDice = Math.max(0, combatState.value.playerBaseDice + spent);
      playerTurnRawDice.value = Math.max(0, playerTurnRawDice.value + spent);
      log(`<span class="text-yellow-300">主动【${skill.name}】${useCount >= 5 ? '（本回合第5次）' : ''}：消耗 ${spent} 金币，原始点数 ${before} → ${combatState.value.playerBaseDice}</span>`);
      break;
    }
    case 'active_shadow_throwing_knife': {
      const target = getEntityBySide('enemy');
      const damageCard = buildActiveSkillDamageCard(skill, 1);
      const damageResult = calculateFinalDamage({
        finalPoint: 1,
        card: damageCard,
        attackerEffects: playerStats.value.effects,
        defenderEffects: target.effects,
        relicModifiers: NO_RELIC_MOD,
      });
      const { actualDamage } = applyDamageToSideWithRelics(
        'enemy',
        target,
        damageResult.damage,
        damageResult.isTrueDamage,
        `主动【${skill.name}】`,
        { sourceSide: 'player', isDirectDamage: true, card: damageCard },
      );
      if (actualDamage > 0) pushFloatingNumber('enemy', actualDamage, 'physical', '-', { targetEntity: target });
      log(`<span class="text-indigo-300">主动【${skill.name}】：对敌方造成 ${actualDamage} 点伤害。</span>`);
      break;
    }
    case 'active_shadow_aim_weakness': {
      const stacks = Math.max(0, Math.floor(combatState.value.playerBaseDice * 0.5));
      if (stacks > 0 && applyStatusEffectWithRelics('enemy', ET.VULNERABLE, stacks, { source: skill.id, durationTurns: 1 })) {
        log(`<span class="text-indigo-300">主动【${skill.name}】：对敌方施加 ${stacks} 层敏感（持续1回合）。</span>`);
      } else {
        log(`<span class="text-gray-400">主动【${skill.name}】：当前点数过低，未施加敏感。</span>`);
      }
      break;
    }
    case 'active_shadow_instinct': {
      const firstCard = combatState.value.playerHand[0];
      const dodgePool = getAllCards().filter(entry => entry.type === CardType.DODGE && entry.category !== '敌人' && entry.category !== EVENT_CARD_CATEGORY);
      const dodge = dodgePool[Math.floor(Math.random() * dodgePool.length)];
      if (!firstCard || !dodge) {
        log(`<span class="text-gray-400">主动【${skill.name}】：没有可变化的手牌。</span>`);
        break;
      }
      const instinctDodge = cloneCardForBattle(dodge);
      recordCardTransform(firstCard, instinctDodge);
      combatState.value.playerHand[0] = instinctDodge;
      log(`<span class="text-indigo-300">主动【${skill.name}】：将【${firstCard.name}】变为【${dodge.name}】。</span>`);
      break;
    }
    case 'active_destruction_mana_crystal':
    case 'active_destruction_pure_crystal': {
      const before = combatState.value.playerBaseDice;
      combatState.value.playerBaseDice = Math.max(0, combatState.value.playerBaseDice - 1);
      playerTurnRawDice.value = Math.max(0, playerTurnRawDice.value - 1);
      applyStatusEffectWithRelics('player', ET.CHARGE, 1, { source: skill.id });
      if (skill.id === 'active_destruction_pure_crystal') {
        pendingNextTurnSkillMana.value += 1;
      }
      log(`<span class="text-zinc-200">主动【${skill.name}】：原始点数 ${before} → ${combatState.value.playerBaseDice}，获得1层蓄力${skill.id === 'active_destruction_pure_crystal' ? '，下回合开始回复1点魔力' : ''}。</span>`);
      break;
    }
    case 'active_destruction_repel': {
      systemCardTurnFlags.value.player.system_destruction_repel = true;
      log(`<span class="text-zinc-200">主动【${skill.name}】：本回合受到的伤害减半。</span>`);
      break;
    }
    case 'active_destruction_intimidate': {
      // 敌方原始点数 -2，随后比较双方原始点数：敌方更小时，直接把敌方本回合意图改为【普通闪避】
      const before = combatState.value.enemyBaseDice;
      combatState.value.enemyBaseDice = Math.max(0, before - 2);
      enemyTurnRawDice.value = Math.max(0, enemyTurnRawDice.value - 2);
      const playerRaw = combatState.value.playerBaseDice;
      const enemyRaw = combatState.value.enemyBaseDice;
      const intent = combatState.value.enemyIntentCard;
      const dodgeTemplate = getCardByName('普通闪避');
      let intentChanged = false;
      if (enemyRaw < playerRaw && dodgeTemplate && intent && intent.id !== PASS_CARD.id && intent.type !== CardType.DODGE) {
        combatState.value.enemyIntentCard = cloneCardForBattle(dodgeTemplate);
        if (isTwinBattle) {
          twinEnemyIntentCards.value = [cloneCardForBattle(dodgeTemplate), cloneCardForBattle(dodgeTemplate)];
        }
        intentChanged = true;
      }
      log(`<span class="text-zinc-200">主动【${skill.name}】：敌方原始点数 ${before} → ${enemyRaw}${intentChanged ? `，低于我方的 ${playerRaw}，敌方意图改为【普通闪避】` : ''}。</span>`);
      break;
    }
    case 'active_modao_overdraw': {
      const restored = restoreManaForSide('player', 10);
      applyStatusEffectWithRelics('player', ET.MANA_DRAIN, 3, { source: skill.id });
      log(`<span class="text-blue-300">主动【${skill.name}】：回复 ${restored} 点魔力，获得3层魔力枯竭。</span>`);
      break;
    }
    case 'active_burn_rekindle': {
      const playerBurn = Math.max(0, getEffectStacks(playerStats.value, ET.BURN));
      const enemyBurn = Math.max(0, getEffectStacks(getEntityBySide('enemy'), ET.BURN));
      if (playerBurn > 0) removeEffect(playerStats.value, ET.BURN);
      if (enemyBurn > 0) removeEffect(getEntityBySide('enemy'), ET.BURN);
      const playerCold = Math.max(0, getEffectStacks(playerStats.value, ET.COLD));
      if (playerCold > 0) removeEffect(playerStats.value, ET.COLD);
      pendingRekindleBurn.value = { player: playerBurn, enemy: enemyBurn };
      log(`<span class="text-orange-300">主动【${skill.name}】：清除我方 ${playerBurn} 层、敌方 ${enemyBurn} 层燃烧与我方 ${playerCold} 层寒冷，下回合开始重新燃起。</span>`);
      break;
    }
    case 'active_alchemy_hourglass_flip': {
      const target = getEntityBySide('enemy');
      const burn = Math.max(0, getEffectStacks(target, ET.BURN));
      const cold = Math.max(0, getEffectStacks(target, ET.COLD));
      const poison = Math.max(0, getEffectStacks(target, ET.POISON));
      const bleed = Math.max(0, getEffectStacks(target, ET.BLEED));
      for (const type of [ET.BURN, ET.COLD, ET.POISON, ET.BLEED]) removeEffect(target, type);
      const nextCold = burn * 2;
      const nextBurn = Math.floor(cold / 2);
      const nextBleed = poison * 2;
      const nextPoison = Math.floor(bleed / 2);
      if (nextBurn > 0) applyEffect(target, ET.BURN, nextBurn, { source: skill.id });
      if (nextCold > 0) applyEffect(target, ET.COLD, nextCold, { source: skill.id });
      if (nextPoison > 0) applyEffect(target, ET.POISON, nextPoison, { source: skill.id });
      if (nextBleed > 0) applyEffect(target, ET.BLEED, nextBleed, { source: skill.id });
      log(`<span class="text-lime-300">主动【${skill.name}】：敌方燃烧 ${burn}→${nextBurn}、寒冷 ${cold}→${nextCold}、中毒 ${poison}→${nextPoison}、流血 ${bleed}→${nextBleed}。</span>`);
      break;
    }
    case 'active_corruption_bury_poison': {
      const applied = applyStatusEffectWithRelics('enemy', ET.POISON, 2, { source: skill.id, sourceSide: 'player' });
      poisonSkipTurn.value.enemy = combatState.value.turn;
      log(`<span class="text-emerald-300">主动【${skill.name}】：${applied ? '对敌方施加 2 层中毒，' : ''}敌方本回合不触发中毒。</span>`);
      break;
    }
    case 'active_yanhan_ice_surface': {
      const playerBefore = combatState.value.playerBaseDice;
      const enemyBefore = combatState.value.enemyBaseDice;
      combatState.value.playerBaseDice = Math.max(0, Math.floor(playerBefore * 0.5));
      combatState.value.enemyBaseDice = Math.max(0, Math.floor(enemyBefore * 0.5));
      playerTurnRawDice.value = Math.max(0, Math.floor(playerTurnRawDice.value * 0.5));
      enemyTurnRawDice.value = Math.max(0, Math.floor(enemyTurnRawDice.value * 0.5));
      log(`<span class="text-sky-300">主动【${skill.name}】：我方原始点数 ${playerBefore} → ${combatState.value.playerBaseDice}，敌方原始点数 ${enemyBefore} → ${combatState.value.enemyBaseDice}。</span>`);
      break;
    }
    case 'active_burn_delay': {
      delayImmunityTurn.value = combatState.value.turn;
      log(`<span class="text-orange-300">主动【${skill.name}】：本回合免疫所有非真实伤害，下回合开始按免疫量获得燃烧。</span>`);
      break;
    }
    default:
      log(`<span class="text-gray-400">主动【${skill.name}】尚未实现效果。</span>`);
      break;
  }

  commitActiveSkillUse(idx, skill);
  presentActiveSkillFeedback(skill);
  emit('activeSkillUsed', skill);
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
  const discardCard = getDiscardCardAfterTemporaryRuntimeTraits(played, playedCard);

  clearDicePreview();
  showPlayerPlayedCard(playedCard);
  combatState.value.discardPile.push(discardCard);
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
          const discardCard = getDiscardCardAfterTemporaryRuntimeTraits(played, playerCardToResolve);
          if (playerCardToResolve !== played) {
            unlockCardManaCost(played);
          }
          combatState.value.discardPile.push(discardCard);
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
    refreshLeviathanAiFlags();
    if (painScene) {
      aiFlags.painPhaseTwo = painScene.phaseTwoActive;
      aiFlags.painAvailableOaths = availablePainOaths(painScene, playerStats.value).length;
    }
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

const selectLeviathanSummonCard = (summon: LeviathanSummonRuntime): CardData => {
  if (summon.stats.hp <= 0) return PASS_CARD;
  if (getEffectStacks(summon.stats, ET.STUN) > 0) {
    log(`<span class="text-gray-400">【${summon.name}】处于眩晕，跳过回合。</span>`);
    return PASS_CARD;
  }
  const previousSourceOverride = leviathanEnemySourceOverride.value;
  leviathanEnemySourceOverride.value = summon.stats;
  try {
    const ctx: EnemyAIContext = {
      enemyStats: summon.stats,
      playerStats: playerStats.value,
      deck: summon.deck,
      playerHand: combatState.value.playerHand,
      playerBaseDice: combatState.value.playerBaseDice,
      enemyBaseDice: summon.baseDice,
      getFinalPoint: (source, card, baseDice) => getCardFinalPoint(source, card, baseDice, true),
      playerDeck: combatState.value.playerDeck,
      playerDiscard: combatState.value.discardPile,
      previousPlayerCardType: previousPlayerLastCardType.value,
      turn: combatState.value.turn,
      flags: summon.flags,
    };
    return summon.def.selectCard(ctx);
  } finally {
    leviathanEnemySourceOverride.value = previousSourceOverride;
  }
};

const selectLeviathanSummonIntents = () => {
  if (!isLeviathanBattle) return;
  for (const summon of getAliveLeviathanSummons()) {
    if (!isLeviathanSummonActionTurn(summon) || (summon.createdTurn >= combatState.value.turn && summon.baseDice <= 0)) {
      summon.intentCard = null;
      continue;
    }
    const intent = selectLeviathanSummonCard(summon);
    summon.intentCard = intent;
    if (intent.id === PASS_CARD.id) {
      markLeviathanSummonActionOpportunityUsed(summon);
    }
  }
};

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
  initializeGaiaBattle();
  if (gaiaState) gaiaState.damageTakenThisTurn = 0;
  if (endCombatPending.value) return;
  log(`<span class="text-slate-300">——第${combatState.value.turn}回合——</span>`);
  if (combatState.value.turn === 1 && props.tutorialInitialRerollCharges > 0) {
    const initialCharges = Math.max(0, Math.floor(props.tutorialInitialRerollCharges));
    if (initialCharges > 0) {
      playerDiceRerollCharges.value = Math.max(playerDiceRerollCharges.value, initialCharges);
      log(`<span class="text-amber-300">教学演示：训练场预置了 ${initialCharges} 次重掷机会。</span>`);
    }
  }
  hideIdleDiceUntilNextTurn.value = false;
  enemyManaLackHintTurn = -1;
  armorDecaySkippedThisTurn.value.player = false;
  armorDecaySkippedThisTurn.value.enemy = false;
  turnPointModifier.value.player = 0;
  turnPointModifier.value.enemy = 0;
  systemCardTurnUseCount.value = { player: {}, enemy: {} };
  systemCardTurnFlags.value = { player: {}, enemy: {} };
  systemLastTurnClashLoss.value = { ...systemPreviousClashLoss.value };
  systemPreviousClashLoss.value = { player: false, enemy: false };
  thornShellReflectPoint.value = { player: 0, enemy: 0 };
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
  // 点击出牌时的悬停记录不会在结算阶段清除，回合开始时清掉，避免敌方点数预览沿用上回合的牌
  playerPreviewCardForPointContext.value = null;
  combatState.value.enemyIntentCard = null;
  executionerPuppetPointModifier.value = null;
  enemyIntentConsumedThisTurn.value = false;
  enemyIntentManaSpentThisTurn.value = false;
  enemyComboPreludeResolvedTurn.value = null;
  drawPhasePreparing.value = false;
  isRolling.value = true;
  battleFeedback.action('roll');
  shatteringTarget.value = null;
  showClashAnimation.value = false;
  playerPlayedPhysicalOrMagicThisTurn.value = false;
  leviathanEcologicalRhythmActive.value = false;
  leviathanSummonActionsResolvedTurn.value = 0;
  mooreMimicPlayedThisTurn.value = false;
  alchemyBlackComboTriggeredThisTurn.value = false;
  triggerPlayerRelicLifecycleHooks('onTurnStart');
  applyAlchemyDizzyFruitOnTurnStart();
  // 【延缓】上回合免疫的伤害在燃烧结算之后转化为燃烧，本回合拼点胜利即可消除
  const delayBurn = Math.max(0, Math.floor(pendingDelayBurn.value));
  pendingDelayBurn.value = 0;
  if (delayBurn > 0 && applyStatusEffectWithRelics('player', ET.BURN, delayBurn, { source: 'active_burn_delay' })) {
    log(`<span class="text-orange-300">主动【延缓】：上回合免疫的伤害化为 ${delayBurn} 层燃烧。</span>`);
  }
  const twinSerpentCount = getActiveRelicCount('bloodpool_twin_serpent_ring');
  if (twinSerpentCount > 0 && playerStats.value.hp > 0) {
    if (isAboveHalfHp(playerStats.value)) {
      const { actualDamage } = applyDamageToSideWithRelics('player', playerStats.value, twinSerpentCount, true, '双头蛇戒');
      if (actualDamage > 0) {
        pushFloatingNumber('player', actualDamage, 'true', '-');
        addPlayerDamageTakenThisTurn(actualDamage);
      }
      logRelicMessage(`[双头蛇戒] 生命高于50%，受到 ${actualDamage} 点真实伤害。`);
      if (playerStats.value.hp <= 0) return;
    } else if (isBelowHalfHp(playerStats.value)) {
      const { healed } = healForSide('player', twinSerpentCount, { reason: '双头蛇戒' });
      logRelicMessage(`[双头蛇戒] 生命低于50%，回复 ${healed} 点生命。`);
    }
  }
  const interestCount = getActiveRelicCount('system_wealth_interest');
  if (interestCount > 0) {
    const interest = Math.floor(getSystemGold() / 15) * interestCount;
    if (interest > 0) {
      gainTempGold(interest);
      logRelicMessage(`[利息] 持有 ${getSystemGold()} 金币，获得 ${interest} 临时金币。`);
    }
  }
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
    applyEventDiceFloor('roll');
    // 回合开始的中毒量结算之后、出牌之前，曼陀罗同步一次（卡牌直接施加的中毒量也会在此生效）
    syncDaturaWeaken();
    const scriptedDice = props.tutorialDiceScript[combatState.value.turn - 1];
    const pRawRoll = scriptedDice
      ? Math.min(
          playerStats.value.maxDice,
          Math.max(playerStats.value.minDice, Math.floor(scriptedDice.player)),
        )
      : rollPlayerDiceInRange(playerStats.value.minDice, playerStats.value.maxDice);
    const eRawRoll = scriptedDice
      ? Math.min(
          effectiveEnemyMaxDice.value,
          Math.max(effectiveEnemyMinDice.value, Math.floor(scriptedDice.enemy)),
        )
      : usesPlayerPreviousPointDice && previousPlayerFinalPoint.value !== null
        ? Math.max(0, Math.floor(previousPlayerFinalPoint.value))
        : Math.floor(Math.random() * (effectiveEnemyMaxDice.value - effectiveEnemyMinDice.value + 1)) + effectiveEnemyMinDice.value;
    const pRoll = consumeChargeOnRoll(playerStats.value, '我方', pRawRoll);
    const eRoll = consumeChargeOnRoll(enemyStats.value, '敌方', eRawRoll);
    playerTurnRawDice.value = pRawRoll;
    enemyTurnRawDice.value = eRawRoll;

    isRolling.value = false;
    combatState.value.playerBaseDice = pRoll;
    combatState.value.enemyBaseDice = eRoll;
    if (isLeviathanBattle) {
      for (const summon of getAliveLeviathanSummons()) {
        if (!isLeviathanSummonActionTurn(summon)) {
          summon.rawDice = 0;
          summon.baseDice = 0;
          summon.intentCard = null;
          continue;
        }
        const rawSummonRoll = rollDiceInRange(summon.stats.minDice, summon.stats.maxDice);
        const summonRoll = consumeChargeOnRoll(summon.stats, `敌方【${summon.name}】`, rawSummonRoll);
        summon.rawDice = rawSummonRoll;
        summon.baseDice = summonRoll;
      }
      const actingSummons = getAliveLeviathanSummons().filter(isLeviathanSummonActionTurn);
      if (actingSummons.length > 0) {
        const rolls = getAliveLeviathanSummons()
          .filter(isLeviathanSummonActionTurn)
          .map(summon => `${summon.name}[${summon.baseDice}]`)
          .join('，');
        log(`召唤物掷骰结果：${rolls}`);
      }
    }
    combatState.value.phase = CombatPhase.DRAW_PHASE;
    log(`掷骰结果：我方 [${pRoll}] vs 敌方 [${eRoll}]`);
  }, scaleDuration(1500));
};

// Watch for INIT phase
watch(
  [() => combatState.value.phase, battleResourcesReady],
  ([phase, resourcesReady]) => {
    if (!resourcesReady) return;
    if (endCombatPending.value) return;
    if (phase === CombatPhase.TURN_START) {
      painPointBonusByCard = new WeakMap<CardData, number>();
      ghostStepBonusByCard = new WeakMap<CardData, number>();
      runeConsumedEnergyByCard = new WeakMap<CardData, number>();
      pendingRuneShiftCards.clear();
      startCardPointTurn();
      for (const [side, entity] of [['我方', playerStats.value], ['敌方', enemyStats.value]] as const) {
        for (const entry of startRuneTurn(entity)) log(`${side}${entry}`);
      }
      playerDamageTakenThisTurn.value = 0;
      playerDamageDealtThisTurn.value = 0;
      directDamageTakenThisTurn.value = { player: 0, enemy: 0 };
      damageHitTakenThisTurn.value = { player: 0, enemy: 0 };
      coldRetaliationPerDamageThisTurn.value = { player: 0, enemy: 0 };
  getRelicRuntimeState('system_destruction_relic_06').damageTakenThisTurn = 0;
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
        systemCardTurnUseCount.value = { player: {}, enemy: {} };
        systemCardTurnFlags.value = { player: {}, enemy: {} };
        systemCardBattleFlags.value = { player: {}, enemy: {} };
        systemPreviousClashLoss.value = { player: false, enemy: false };
        systemLastTurnClashLoss.value = { player: false, enemy: false };
        alchemyPerfumePointDoubleCardIds.value = { player: {}, enemy: {} };
        alchemyGrandSynthesisPointBonusByCard.value = { player: new WeakMap<CardData, number>(), enemy: new WeakMap<CardData, number>() };
        alchemyGrandSynthesisPointBonusVersion.value += 1;
        alchemyGrandSynthesisBoundCard.value = { player: null, enemy: null };
        alchemyCatalystUseCount.value = { player: 0, enemy: 0 };
        alchemyPendingGrandSynthesis.value = null;
        activeHandSelectionMode.value = null;
        activeHandSelectionSkillIdx.value = null;
        pendingAlchemyGoldDelta.value = 0;
        battleTempGold.value = 0;
        pendingNextTurnSkillMana.value = 0;
        pendingRekindleBurn.value = null;
        delayImmunityTurn.value = -1;
        pendingDelayBurn.value = 0;
        ghostStepPendingBonus.value = { player: 0, enemy: 0 };
        ghostStepBonusByCard = new WeakMap<CardData, number>();
        cardTransformOrigin = new WeakMap<CardData, CardData>();
        shadowMeldTrackedCards = [
          ...combatState.value.playerHand,
          ...combatState.value.playerDeck,
          ...combatState.value.discardPile,
        ].filter(card => card.id === SHADOW_MELD_CARD_ID).map(card => toRaw(card));
        poisonVulnerableTurn.value = { player: -1, enemy: -1 };
        poisonSkipTurn.value = { player: -1, enemy: -1 };
        spiderPoisonBoostTurn.value = -1;
        spiderVulnerableBoostTurn.value = -1;
        lastPlayedMagicCard.value = { player: null, enemy: null };
        prophecyCopiedCards.value = new Set();
        prophecyPickerHandIdx.value = null;
        blueStarBottleRemaining.value = 20;
        scholarBadgeTriggered.value = false;
        consumedRelicIdsThisBattle.value = [];
        sinGluttonyPlaysThisBattle.value = 0;
        sinGluttonyDrainPercent.value = 0;
        omniWandFormBySlot.value = {};
        omniWandSelectingSlot.value = null;
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
        previousEnemyLastCardType.value = null;
        previousPlayerFinalPoint.value = null;
        leviathanSummons.value = [];
        leviathanSelectedTargetId.value = 'body';
        leviathanEnemyTargetOverride.value = null;
        leviathanEnemySourceOverride.value = null;
        leviathanEnemySelfOverride.value = null;
        leviathanActingSummon.value = null;
        leviathanEcologicalRhythmActive.value = false;
        leviathanMirrorSeaOathPendingPoint.value = 0;
        leviathanMirrorSeaOathActiveTurn.value = 0;
        leviathanTidalLockCheckTurn.value = 0;
        leviathanTidalLockPendingTurn.value = 0;
        leviathanSummonActionsResolvedTurn.value = 0;
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
      applyIntangibleAura('player');
      applyIntangibleAura('enemy');
      shouldBridgeHolyWaterJellyfishPortraitHidden.value = false;
      applyNegativeStatusesOnTurnStart();
      insertPrayerCandleRetreatIntoPlayerDeck();
      applyTwinDreamControlThresholds();
      activateLeviathanMirrorSeaOathIfPending();
      activateLeviathanTidalLockIfPending();
      applyPendingNextTurnCardEffects();
      applyPendingNextTurnSkillEffects();
      processPainTurnStart();
      // Process turn-start effects (poison, burn, mana spring, etc.)
      if (combatState.value.turn > 1) {
        for (const [side, label, stats] of [['player', '我方', playerStats], ['enemy', '敌方', enemyStats]] as const) {
          const targetSide = side as RelicSide;
          const opponentSide: RelicSide = side === 'player' ? 'enemy' : 'player';
          const opponentStats = side === 'player' ? enemyStats : playerStats;
          const poisonAmountBeforeTurnStart = getEffectStacks(stats.value, ET.POISON_AMOUNT);
          const hpBeforeTurnStart = stats.value.hp;
          const poisonAmountLethalTriggered = poisonAmountBeforeTurnStart > 0 && poisonAmountBeforeTurnStart >= hpBeforeTurnStart;
          const result = processOnTurnStart(stats.value, true);
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
              const opponentPhaseFloor = Math.max(0, getEffectStacks(opponentStats.value, ET.PHASE_TRANSITION));
              const nextOpponentHp = Math.max(0, Math.min(opponentStats.value.maxHp, opponentStats.value.hp + result.opponentHpChange));
              opponentStats.value.hp = opponentPhaseFloor > 0 && hpBeforeOpponent > opponentPhaseFloor
                ? Math.max(opponentPhaseFloor, nextOpponentHp)
                : nextOpponentHp;
              const actualOpponentHpDelta = opponentStats.value.hp - hpBeforeOpponent;
              recordBattlePainLoss(opponentSide, Math.max(0, -actualOpponentHpDelta), false);
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
                      feedbackEffect: 'burn',
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
                  const { actualDamage, logs: burnApplyLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
                    side,
                    stats.value,
                    burnResult.damage,
                    false,
                    '燃烧',
                    {
                      sourceSide: targetSide === 'enemy' ? 'player' : 'enemy',
                      dreamControlKind: targetSide === 'enemy' ? 'status' : undefined,
                      feedbackEffect: 'burn',
                    },
                  );
                  burnDamageTaken = actualDamage;
                  turnStartImmediateDamageTaken += actualDamage;
                  if (actualDamage > 0) {
                    pushFloatingNumber(side, actualDamage, 'magic', '-', { damageBeforeLimit });
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
            const beforeLoss = stats.value.hp;
            const phaseFloor = Math.max(0, getEffectStacks(stats.value, ET.PHASE_TRANSITION));
            const nextHp = Math.max(0, Math.min(stats.value.maxHp, stats.value.hp + negativeHpChange));
            stats.value.hp = phaseFloor > 0 && beforeLoss > phaseFloor
              ? Math.max(phaseFloor, nextHp)
              : nextHp;
            recordBattlePainLoss(side, Math.max(0, beforeLoss - stats.value.hp), false);
          }
          if (result.mpChange !== 0) {
            changeManaWithShock(side, result.mpChange, '魔力变化（回合开始）', { showPositiveFloating: true });
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
                feedbackEffect: 'poison',
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
      if (combatState.value.turn > 1 && isLeviathanBattle) {
        for (const summon of getAliveLeviathanSummons()) {
          processLeviathanSummonTurnStart(summon);
        }
        removeDefeatedLeviathanSummons();
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

// 【融入暗影】：轮到我方行动时，若生命低于30%则把原卡拉回手牌
watch(
  [() => combatState.value.phase, () => playerStats.value.hp, () => playerStats.value.maxHp],
  ([phase]) => {
    if (phase !== CombatPhase.PLAYER_INPUT) return;
    pullShadowMeldCardsIntoHand();
  },
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
          syncGaiaSeverCards(true);
          const drawCount = getOpenPlayerHandSlotCount(combatState.value.playerHand);
          const { drawn, newDeck, newDiscard } = drawCards(drawCount, combatState.value.playerDeck, combatState.value.discardPile);
          applyOnDrawCardEffects(drawn);
          markDrawnCardsAnimation(drawn);
          combatState.value.playerHand = mergePlayerHandWithDrawnCards(combatState.value.playerHand, drawn);
          refreshPlayerSightDeprivationMask(combatState.value.playerHand);
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
          selectLeviathanSummonIntents();
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
/** 生命锁：记录复活触发的回合 */
const markPlayerReviveTurn = () => {
  getRelicRuntimeState('system_destruction_relic_18').reviveTurn = combatState.value.turn;
};

/** 十字项链：生命归零时复活并回满生命、清除负面状态，随后失去该圣遗物 */
const tryTriggerCrossNecklaceRevive = (): boolean => {
  if (getActiveRelicCount(PORTED_RELIC_ID.CROSS_NECKLACE) <= 0) return false;
  if (consumedRelicIdsThisBattle.value.includes(PORTED_RELIC_ID.CROSS_NECKLACE)) return false;
  consumedRelicIdsThisBattle.value = [...consumedRelicIdsThisBattle.value, PORTED_RELIC_ID.CROSS_NECKLACE];
  const debuffs = playerStats.value.effects.filter(effect => (
    effect.stacks > 0 && EFFECT_REGISTRY[effect.type]?.polarity === 'debuff'
  ));
  for (const effect of debuffs) removeEffect(playerStats.value, effect.type);
  playerStats.value.hp = Math.max(1, playerStats.value.maxHp);
  pushFloatingNumber('player', playerStats.value.hp, 'heal', '+');
  markPlayerReviveTurn();
  logRelicMessage('[十字项链] 生命归零，立即复活并回满生命、清除所有负面状态；十字项链碎裂了。');
  return true;
};

/** 七原罪：持有对应罪书即共鸣，原罪副作用被削弱或改写（傲慢共鸣后改为无视拼点） */
const isSinResonatedInBattle = (card: CardData | null | undefined): boolean => (
  Boolean(card?.sin) && getActiveRelicCount(card!.sin!.bookRelicId) > 0
);
const logSin = (card: CardData, message: string) => {
  log(`<span class="text-rose-400">【${card.name}】${message}</span>`);
};

/** 原罪·暴食：每打出一次伤害倍率 +0.5 */
const SIN_GLUTTONY_MULTIPLIER_STEP = 0.5;
/** 原罪·暴食：每打出一次，回合结束额外受到的当前生命百分比真实伤害（未共鸣 / 共鸣） */
const SIN_GLUTTONY_DRAIN_PERCENT = { corrupted: 5, resonated: 2 } as const;
const getSinGluttonyMultiplier = () => 1 + SIN_GLUTTONY_MULTIPLIER_STEP * sinGluttonyPlaysThisBattle.value;

/** 原罪卡打出后的效果与原罪副作用（在本回合双方卡牌结算完毕后统一处理，不论拼点胜负） */
const applySinCardAfterPlay = (card: CardData, baseDice: number) => {
  if (!card.sin) return;
  const resonated = isSinResonatedInBattle(card);
  const prefix = resonated ? '原罪余波' : '原罪发作';
  const enemy = getEntityBySide('enemy');
  if (card.id === SIN_CARD_ID.GLUTTONY) {
    sinGluttonyPlaysThisBattle.value += 1;
    sinGluttonyDrainPercent.value += resonated ? SIN_GLUTTONY_DRAIN_PERCENT.resonated : SIN_GLUTTONY_DRAIN_PERCENT.corrupted;
    logSin(card, `${prefix}：此后每回合结束将受到 ${sinGluttonyDrainPercent.value}% 当前生命的真实伤害。`);
    logSin(card, `伤害倍率提升至 ${getSinGluttonyMultiplier()} 倍。`);
    return;
  }
  if (card.id === SIN_CARD_ID.ENVY) {
    if (resonated) {
      if (applyStatusEffectWithRelics('enemy', ET.CHARGE, 2, { source: `sin:${card.id}`, sourceSide: 'player' })) {
        logSin(card, `${prefix}：敌方获得 2 层蓄力。`);
      }
      return;
    }
    const before = enemy.minDice;
    enemy.minDice = Math.min(enemy.maxDice, enemy.minDice + 1);
    if (enemy.minDice !== before) logSin(card, `${prefix}：敌方最小点数 ${before} → ${enemy.minDice}。`);
  } else if (card.id === SIN_CARD_ID.WRATH) {
    const burn = resonated ? 1 : Math.floor(getDamageHitTakenThisCombat('player') / 2);
    if (burn > 0 && applyStatusEffectWithRelics('player', ET.BURN, burn, { source: `sin:${card.id}` })) {
      logSin(card, `${prefix}：怒火反噬，我方获得 ${burn} 层燃烧。`);
    }
  } else if (card.id === SIN_CARD_ID.GREED) {
    const gold = getSystemGold();
    const loss = resonated ? Math.min(1, gold) : gold - Math.floor(gold * 0.9);
    if (loss > 0) {
      changeSystemGold(-loss);
      logSin(card, `${prefix}：失去 ${loss} 金币（${gold} → ${getSystemGold()}）。`);
    }
  } else if (card.id === SIN_CARD_ID.LUST) {
    // 未共鸣：与敌方获得的敏感等量（0.5 倍点数）；共鸣：只获得 1 层
    const amount = resonated
      ? 1
      : Math.max(0, Math.floor(getCardFinalPoint('player', card, baseDice, true) * 0.5));
    if (amount > 0 && applyStatusEffectWithRelics('player', ET.VULNERABLE, amount, { source: `sin:${card.id}` })) {
      logSin(card, `${prefix}：我方获得 ${amount} 层敏感。`);
    }
  }
};

/** 替身人偶 / 灵魂人偶：生命归零时复活（替身 1 点生命，灵魂回满），随后碎裂 */
const tryTriggerEventDollRevive = (): boolean => {
  const doll = [
    { id: EVENT_RELIC_ID.STAND_IN_DOLL, name: '替身人偶', fullHp: false },
    { id: EVENT_RELIC_ID.SOUL_DOLL, name: '灵魂人偶', fullHp: true },
  ].find(entry => getActiveRelicCount(entry.id) > 0);
  if (!doll) return false;
  consumedRelicIdsThisBattle.value = [...consumedRelicIdsThisBattle.value, doll.id];
  playerStats.value.hp = doll.fullHp ? Math.max(1, playerStats.value.maxHp) : 1;
  pushFloatingNumber('player', playerStats.value.hp, 'heal', '+');
  markPlayerReviveTurn();
  logRelicMessage(
    doll.fullHp
      ? `[${doll.name}] 生命归零，人偶代替你承受了死亡，你回满生命复活；${doll.name}碎裂了。`
      : `[${doll.name}] 生命归零，人偶代替你承受了死亡，你以 1 点生命复活；${doll.name}碎裂了。`,
  );
  // 灵魂人偶：复活的那一回合，被抽走的灵魂让魔力滞涩
  if (doll.fullHp && applyStatusEffectWithRelics('player', ET.MANA_DRAIN, 1, { source: `relic:${doll.id}` })) {
    logRelicMessage(`[${doll.name}] 灵魂的亏空让你获得 1 层魔力枯竭。`);
  }
  return true;
};

/** 幸运币：每回合首次计算点数时决定 ×2 或 ×0.5，同一回合内预览与结算保持一致 */
const luckyCoinFactorCache = new WeakMap<object, { turn: number; factor: number }>();
const getLuckyCoinFactor = (card: CardData): number => {
  const key = toRaw(card) as object;
  const cached = luckyCoinFactorCache.get(key);
  if (cached && cached.turn === combatState.value.turn) return cached.factor;
  const factor = Math.random() < 0.5 ? 2 : 0.5;
  luckyCoinFactorCache.set(key, { turn: combatState.value.turn, factor });
  return factor;
};

/** 【预言】本场战斗中可预言的全部卡牌（不含预言自身、跳过、诅咒与预言出的临时复制品） */
const getProphecyBattleCards = (): CardData[] => [
  ...combatState.value.playerDeck,
  ...combatState.value.playerHand,
  ...combatState.value.discardPile,
].filter(entry => (
  entry.id !== PORTED_CARD.PROPHECY
  && entry.id !== PASS_CARD.id
  && entry.type !== CardType.CURSE
  && !prophecyCopyOrigin.has(toRaw(entry))
));

const isProphecyCardUsed = (card: CardData) => prophecyCopiedCards.value.has(toRaw(card));
const getProphecyCandidates = () => getProphecyBattleCards().filter(entry => !isProphecyCardUsed(entry));

/** 预言已无可选卡牌：所有预言牌改为带宿命感的描述，并不可再使用 */
const markProphecyExhausted = () => {
  const line = PROPHECY_EXHAUSTED_LINES[Math.floor(Math.random() * PROPHECY_EXHAUSTED_LINES.length)];
  const description = `${line}（本场战斗已无法预言）`;
  for (const card of [...combatState.value.playerDeck, ...combatState.value.playerHand, ...combatState.value.discardPile]) {
    if (card.id === PORTED_CARD.PROPHECY) card.description = description;
  }
};
const isProphecyExhausted = (card: CardData) => card.id === PORTED_CARD.PROPHECY && card.description.includes('本场战斗已无法预言');

/** 【预言】点击使用，不视为出牌：打开选择界面，从本场战斗的牌组中挑选一张尚未预言过的卡牌 */
const openProphecyPicker = (card: CardData, handIdx: number) => {
  if (isProphecyExhausted(card) || getProphecyCandidates().length === 0) {
    if (!isProphecyExhausted(card)) markProphecyExhausted();
    triggerInvalidCardShake(card);
    log('<span class="text-gray-400">【预言】本场战斗已无法预言。</span>');
    return;
  }
  prophecyPickerHandIdx.value = handIdx;
};

/** 选定预言目标：本牌在这一次变为该牌的复制，打出后复原为预言 */
const resolveProphecyPick = (target: CardData) => {
  const handIdx = prophecyPickerHandIdx.value;
  prophecyPickerHandIdx.value = null;
  if (handIdx === null || combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  const prophecy = combatState.value.playerHand[handIdx];
  if (!prophecy || prophecy.id !== PORTED_CARD.PROPHECY || isProphecyCardUsed(target)) return;
  prophecyCopiedCards.value = new Set([...prophecyCopiedCards.value, toRaw(target)]);
  const copy = cloneCardForBattle(target);
  prophecyCopyOrigin.set(toRaw(copy), toRaw(prophecy));
  combatState.value.playerHand.splice(handIdx, 1, copy);
  log(`<span class="text-violet-300">【预言】本牌这一次变为【${target.name}】的复制，打出后复原为预言。</span>`);
  presentEffect(playerStats.value, EVENT_EFFECTS.prophecy);
  if (getProphecyCandidates().length === 0) markProphecyExhausted();
};

const handleCardSelect = (card: CardData, handIdx: number) => {
  playUiSfx('none');
  if (combatState.value.phase !== CombatPhase.PLAYER_INPUT) return;
  if (activeSkillResolving.value) return;
  if (handIdx < 0 || handIdx >= combatState.value.playerHand.length) return;
  if (combatState.value.playerHand[handIdx] !== card) return;
  if (handleActiveHandSelection(card, handIdx)) return;
  if (card.id === 'basic_prophecy') {
    openProphecyPicker(card, handIdx);
    return;
  }
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
        ...getPlayerManaCheckOptions(runtimeCard),
        controlledExpectedType,
        previousCardType: previousPlayerLastCardType.value,
      });
      const controlledReason = check.allowed ? getTwinDirectComboControlledReason(runtimeCard) : null;
      if (!check.allowed || controlledReason) {
        triggerInvalidCardShake(card);
        if (!check.allowed) {
          triggerCardPlayBlockedFeedback(check);
        } else {
          triggerBlockedEffectFeedback('player', ET.CONTROLLED);
        }
        log(`<span class="text-red-400">${controlledReason ?? check.reason ?? '当前无法使用这张卡牌。'}</span>`);
        return;
      }
      if (!canPlayerAffordCardMana(runtimeCard)) {
        triggerInvalidCardShake(card);
        triggerPlayerManaBlockedFeedback();
        log('<span class="text-red-400">魔力不足，无法使用该魔法卡牌。</span>');
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
      ...getPlayerManaCheckOptions(runtimeCard),
      controlledExpectedType,
      previousCardType: previousPlayerLastCardType.value,
    });
    if (!check.allowed) {
      triggerInvalidCardShake(card);
      triggerCardPlayBlockedFeedback(check);
      log(`<span class="text-red-400">${check.reason ?? '当前无法使用这张卡牌。'}</span>`);
      return;
    }
    if (!canPlayerAffordCardMana(runtimeCard)) {
      triggerInvalidCardShake(card);
      triggerPlayerManaBlockedFeedback();
      log('<span class="text-red-400">魔力不足，无法使用该魔法卡牌。</span>');
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
    const intentCard = getCurrentEnemyIntentForPlayerInput();
    if (!intentCard || intentCard.id === PASS_CARD.id) return null;
    return intentCard.type;
  })();
  const check = canPlayCard(playerStats.value, runtimeCard, combatState.value.playerBaseDice, {
    ...getPlayerManaCheckOptions(runtimeCard),
    controlledExpectedType,
    previousCardType: previousPlayerLastCardType.value,
  });
  if (!check.allowed) {
    triggerInvalidCardShake(card);
    triggerCardPlayBlockedFeedback(check);
    log(`<span class="text-red-400">${check.reason ?? '当前无法使用该卡牌。'}</span>`);
    return;
  }

  if (!canPlayerAffordCardMana(runtimeCard)) {
    triggerInvalidCardShake(card);
    triggerPlayerManaBlockedFeedback();
    log('<span class="text-red-400">魔力不足，无法使用该魔法卡牌。</span>');
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
  const discardCard = getDiscardCardAfterTemporaryRuntimeTraits(played, playedCard);
  if (playedCard !== played) {
    unlockCardManaCost(played);
  }
  clearDicePreview();
  showPlayerPlayedCard(playedCard);
  combatState.value.discardPile.push(discardCard);
  combatState.value.playerSelectedCard = playedCard;
  emit('playerCardSelected', playedCard);
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

const isMagicRingClashPair = (card1: CardData, card2: CardData): boolean => (
  getActiveRelicCount('basic_magic_ring') > 0 && isPhysicalMagicPair(card1, card2)
);

const isSystemAttackActionClashPair = (card1: CardData, card2: CardData): boolean => {
  const playerAttack = card1.type === CardType.PHYSICAL || card1.type === CardType.MAGIC;
  const enemyAction = card2.type === CardType.FUNCTION || card2.type === CardType.DODGE;
  if (!playerAttack || !enemyAction) return false;
  return card1.id === 'system_destruction_液压机'
    || getActiveRelicCount('system_destruction_relic_05') > 0
    || getActiveRelicCount('system_destruction_relic_16') > 0;
};

const isIgnoreDodgeBypassPair = (card1: CardData, card2: CardData): boolean => {
  const t1 = card1.type;
  const t2 = card2.type;
  return (
    (card1.ignoreDodge && t2 === CardType.DODGE && (t1 === CardType.PHYSICAL || t1 === CardType.MAGIC))
    || (card2.ignoreDodge && t1 === CardType.DODGE && (t2 === CardType.PHYSICAL || t2 === CardType.MAGIC))
  );
};

const isSameRuleClash = (card1: CardData, card2: CardData): boolean => (
  card1.type === card2.type
  || isMagicRingClashPair(card1, card2)
  || isSystemAttackActionClashPair(card1, card2)
);

// Clashable check
const isClashable = (card1: CardData, card2: CardData): boolean => {
  if (card1.ignoreClash || card2.ignoreClash) return false;
  if ((card1.id === SIN_CARD_ID.ARROGANCE && isSinResonatedInBattle(card1))
    || (card2.id === SIN_CARD_ID.ARROGANCE && isSinResonatedInBattle(card2))) return false;
  const t1 = card1.type;
  const t2 = card2.type;

  if (t1 === CardType.PHYSICAL && t2 === CardType.PHYSICAL) return true;
  if (t1 === CardType.MAGIC && t2 === CardType.MAGIC) return true;
  if (isMagicRingClashPair(card1, card2)) return true;
  if (isSystemAttackActionClashPair(card1, card2)) return true;

  const bypassDodge =
    isIgnoreDodgeBypassPair(card1, card2)
    || (
      card2.id === 'enemy_othello_annihilation_star'
      && t1 === CardType.DODGE
      && getEffectStacks(playerStats.value, ET.COGNITIVE_INTERFERENCE) > 0
    );
  if (bypassDodge) return false;

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
  const previousEnemyTargetOverride = leviathanEnemyTargetOverride.value;
  const previousEnemySourceOverride = leviathanEnemySourceOverride.value;
  const previousEnemySelfOverride = leviathanEnemySelfOverride.value;
  const previousActingSummon = leviathanActingSummon.value;
  let playerCardWithLockedManaCost: CardData | null = null;
  try {
  nonLivingConversionGuard.clear();
  const isEnemyComboPrelude = options.enemyComboPrelude === true;
  if (options.twinSlotIndex) {
    log(`<span class="text-fuchsia-300">[双子机制] ${getTwinTargetLabel(options.twinSlotIndex)}开始结算。</span>`);
  }
  ensureLeviathanSelectedTarget();
  const leviathanSelectedSummonForClash = (
    isLeviathanBattle && !isEnemyComboPrelude ? getSelectedLeviathanSummon() : null
  );
  const leviathanDeferredBodyCard = leviathanSelectedSummonForClash ? eCard : null;
  const leviathanDeferredBodyDice = leviathanSelectedSummonForClash ? eDice : 0;
  const leviathanSelectedSummonUnready = Boolean(leviathanSelectedSummonForClash && !leviathanSelectedSummonForClash.intentCard);
  if (leviathanSelectedSummonForClash) {
    leviathanEnemyTargetOverride.value = leviathanSelectedSummonForClash.stats;
    leviathanEnemySourceOverride.value = leviathanSelectedSummonForClash.stats;
    leviathanActingSummon.value = leviathanSelectedSummonForClash;
    if (leviathanSelectedSummonUnready) {
      log(`<span class="text-cyan-300">本轮目标为尚未掷骰的【${leviathanSelectedSummonForClash.name}】；利维坦本体稍后正常行动。</span>`);
    } else {
      log(`<span class="text-cyan-300">本轮与【${leviathanSelectedSummonForClash.name}】进行拼点；利维坦本体稍后正常行动。</span>`);
    }
  }
  let resolvedPlayerCard = pCard;
  const playerManaCostOnPlay = getEffectiveManaCost('player', pCard);
  let resolvedEnemyCard = leviathanSelectedSummonForClash
    ? (leviathanSelectedSummonForClash.intentCard ?? PASS_CARD)
    : eCard;
  const activeEnemyDice = leviathanSelectedSummonForClash?.baseDice ?? eDice;
  resolvedEnemyCard = withEffectiveManaCost('enemy', resolvedEnemyCard);
  if (resolvedEnemyCard.id !== PASS_CARD.id) {
    const deferEnemyManaCheck = !isEnemyComboPrelude && resolvedPlayerCard.traits.combo;
    const enemyPlayCheck = canPlayCard(getEntityBySide('enemy'), resolvedEnemyCard, activeEnemyDice, {
      ignoreMana: deferEnemyManaCheck,
      previousCardType: leviathanSelectedSummonForClash?.previousCardType ?? previousEnemyLastCardType.value,
    });
    if (!enemyPlayCheck.allowed) {
      if (enemyPlayCheck.blockerEffectType) triggerBlockedEffectFeedback('enemy', enemyPlayCheck.blockerEffectType);
      triggerEnemyIntentInvalidShake(options.twinSlotIndex, resolvedEnemyCard);
      if (resolvedEnemyCard.type === CardType.MAGIC && resolvedEnemyCard.manaCost > getEntityBySide('enemy').mp) {
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

  // Runtime card copies must keep the cost locked before the card left the hand.
  if (resolvedPlayerCard.type === CardType.MAGIC && resolvedPlayerCard.id !== PASS_CARD.id) {
    playerCardWithLockedManaCost = resolvedPlayerCard;
    lockedManaCostByCard.set(toRaw(resolvedPlayerCard), playerManaCostOnPlay);
  }

  if (resolvedPlayerCard.traits.combo) {
    comboUiMaskBridge.value = true;
  }

  let playerMagicManaPaidOnPlay = false;
  let enemyMagicManaPaidOnPlay = false;
  const spendMagicManaOnPlay = (side: BattleSide, card: CardData): boolean => {
    if (card.id === PASS_CARD.id || card.type !== CardType.MAGIC) return true;
    const runtimeCard = withEffectiveManaCost(side, card);
    const stats = getEntityBySide(side);
    const manaCost = runtimeCard.id === 'enemy_selina_space_fold'
      ? getSelinaSpaceFoldManaSpend(stats)
      : runtimeCard.manaCost;
    const canSpend = side === 'player'
      ? spendPlayerManaWithBottle(manaCost, `使用【${runtimeCard.name}】`, { allowHp: true })
      : spendManaWithShock(side, manaCost, `使用【${runtimeCard.name}】`);
    if (!canSpend) {
      if (side === 'enemy') {
        triggerEnemyIntentInvalidShake(options.twinSlotIndex, card);
        notifyEnemyManaInsufficient();
      } else {
        triggerPlayerManaBlockedFeedback();
        log(`<span class="text-red-400">我方【${runtimeCard.name}】发动失败：魔力已不足。</span>`);
      }
      return false;
    }
    if (side === 'enemy' && !leviathanActingSummon.value) {
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

    const target = isPlayerSource ? getEntityBySide('enemy') : playerStats.value;
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

  let shouldClash = isClashable(resolvedPlayerCard, resolvedEnemyCard);
  for (const [side, card] of [['player', resolvedPlayerCard], ['enemy', resolvedEnemyCard]] as const) {
    if (side === 'enemy' && deferEnemyMagicManaPayment && !shouldClash) continue;
    prepareRuneCardOnPlay(side, card);
  }
  if (painScene && !isEnemyComboPrelude) painThornsOnPlayerCard(painScene, enemyStats.value, resolvedPlayerCard);
  for (const [side, card] of [['player', resolvedPlayerCard], ['enemy', resolvedEnemyCard]] as const) {
    painPointBonusByCard.delete(card);
    if (side === 'enemy' && !isEnemyComboPrelude && resolvedPlayerCard.traits.combo) continue;
    if (card.id === PAIN_CARD.RETURN || card.id === PAIN_CARD.REMEMBER) {
      const holder = getEntityBySide(side);
      const bonus = painPointBonus(card, holder);
      painPointBonusByCard.set(card, bonus);
      addPainMemory(holder, -bonus / 2);
    }
    bindGhostStepBonusToCard(side, card);
  }
  const clashBypassedByIgnoreDodge = isIgnoreDodgeBypassPair(resolvedPlayerCard, resolvedEnemyCard);
  if (!shouldClash && clashBypassedByIgnoreDodge) {
    log('<span class="text-indigo-300">[无视闪避] 闪避拼点被跳过，卡牌将直接生效。</span>');
  }
  const playerSkippedTurn = !isEnemyComboPrelude && resolvedPlayerCard.id === PASS_CARD.id;
  const enemySkippedTurn = resolvedEnemyCard.id === PASS_CARD.id && !leviathanSelectedSummonUnready;
  let resolvedPlayerDice = pDice;
  let resolvedEnemyDice = activeEnemyDice;
  const setResolvedEnemyDice = (nextDice: number) => {
    resolvedEnemyDice = Math.max(0, Math.floor(nextDice));
    if (leviathanSelectedSummonForClash) {
      leviathanSelectedSummonForClash.baseDice = resolvedEnemyDice;
    } else {
      combatState.value.enemyBaseDice = resolvedEnemyDice;
    }
  };
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
    const targetStats = target === 'player' ? playerStats.value : getEntityBySide('enemy');
    const rerolledRaw = target === 'player'
      ? rollPlayerDiceInRange(targetStats.minDice, targetStats.maxDice)
      : rollDiceInRange(targetStats.minDice, targetStats.maxDice);
    const rerolledCharge = consumeChargeOnRoll(targetStats, targetLabel, rerolledRaw);
    const rerolled = target === 'player'
      ? applyCheatSilverCoinToPlayerReroll(rerolledCharge)
      : rerolledCharge;
    battleFeedback.action('roll');
    const before = target === 'player' ? resolvedPlayerDice : resolvedEnemyDice;

    if (target === 'player') {
      resolvedPlayerDice = rerolled;
      combatState.value.playerBaseDice = rerolled;
    } else {
      setResolvedEnemyDice(rerolled);
    }
    log(`<span class="text-amber-300">${sourceLabel}【${card.name}】触发重掷：${targetLabel}骰子 ${before} → ${rerolled}</span>`);
    if (target === 'player') {
      triggerPlayerAfterRerollRelics(before, rerolled);
    }
  };
  // 卡牌自身重掷和重掷对手都会影响本次拼点，因此统一在拼点前处理。
  if (resolvedPlayerCard.traits.reroll !== 'none') {
    rerollByTrait('player', resolvedPlayerCard);
  }
  if (resolvedEnemyCard.traits.reroll !== 'none') {
    rerollByTrait('enemy', resolvedEnemyCard);
  }

  // 紊乱来自对方上一回合的效果，也在拼点前触发。
  // 与卡牌自带重掷分开处理；跳过回合不会触发，层数统一在回合结束时衰减。
  const rerollByDisorientation = (source: BattleSide, card: CardData) => {
    if (card.id === PASS_CARD.id) return;
    const sourceStats = getEntityBySide(source);
    const disorientation = findEffect(sourceStats, ET.DISORIENTATION);
    if (!disorientation || disorientation.stacks <= 0) return;

    const sourceLabel = source === 'player' ? '我方' : '敌方';
    const rerolledRaw = source === 'player'
      ? rollPlayerDiceInRange(sourceStats.minDice, sourceStats.maxDice)
      : rollDiceInRange(sourceStats.minDice, sourceStats.maxDice);
    const rerolledCharge = consumeChargeOnRoll(sourceStats, sourceLabel, rerolledRaw);
    const rerolled = source === 'player'
      ? applyCheatSilverCoinToPlayerReroll(rerolledCharge)
      : rerolledCharge;
    battleFeedback.action('roll');
    const before = source === 'player' ? resolvedPlayerDice : resolvedEnemyDice;

    if (source === 'player') {
      resolvedPlayerDice = rerolled;
      combatState.value.playerBaseDice = rerolled;
      triggerPlayerAfterRerollRelics(before, rerolled);
    } else {
      setResolvedEnemyDice(rerolled);
    }
    log(`<span class="text-violet-300">${sourceLabel}【${card.name}】触发紊乱：${sourceLabel}骰子 ${before} → ${rerolled}</span>`);
  };
  rerollByDisorientation('player', resolvedPlayerCard);
  rerollByDisorientation('enemy', resolvedEnemyCard);

  if (resolvedEnemyCard.id === 'enemy_executioner_puppet_execution') {
    executionerPuppetPointModifier.value = resolvedPlayerCard.type === CardType.DODGE
      ? Math.floor(Math.random() * 2) - 2
      : Math.floor(Math.random() * 2) + 1;
  } else {
    executionerPuppetPointModifier.value = null;
  }

  let pClashPoint = getCardPreviewPoint('player', resolvedPlayerCard, resolvedPlayerDice);
  let eClashPoint = resolvedEnemyCard.id === UMBILICAL_TENTACLE_CARD.PULL
    ? getCardFinalPoint('enemy', resolvedEnemyCard, resolvedEnemyDice, true, false, playerSkippedTurn ? null : pClashPoint)
    : getCardPreviewPoint('enemy', resolvedEnemyCard, resolvedEnemyDice);
  if (resolvedPlayerCard.id === UMBILICAL_TENTACLE_CARD.PULL) {
    pClashPoint = getCardFinalPoint('player', resolvedPlayerCard, resolvedPlayerDice, true, false, enemySkippedTurn ? null : eClashPoint);
  }
  // 原罪·傲慢（未共鸣）：若本次拼点即将获胜，则傲慢地无视拼点，双方卡牌都会生效
  if (shouldClash && resolvedPlayerCard.id === SIN_CARD_ID.ARROGANCE && !isSinResonatedInBattle(resolvedPlayerCard)) {
    const wouldWin = isSameRuleClash(resolvedPlayerCard, resolvedEnemyCard)
      ? pClashPoint > eClashPoint
      : resolvedEnemyCard.type === CardType.DODGE
        ? !(pClashPoint > eClashPoint)
          && !(pClashPoint === eClashPoint && resolvedEnemyCard.id === 'system_shadow_镜影')
        : false;
    if (wouldWin) {
      shouldClash = false;
      logSin(resolvedPlayerCard, '原罪发作：胜券在握，傲慢地无视了拼点——双方卡牌都会生效。');
    }
  }
  // 【蜘蛛】：使用闪避牌的一方决定本回合的增幅方向
  if (getActiveRelicCount('system_corruption_relic_06') > 0) {
    if (resolvedPlayerCard.type === CardType.DODGE && resolvedPlayerCard.id !== PASS_CARD.id) {
      spiderPoisonBoostTurn.value = combatState.value.turn;
    }
    if (resolvedEnemyCard.type === CardType.DODGE && resolvedEnemyCard.id !== PASS_CARD.id) {
      spiderVulnerableBoostTurn.value = combatState.value.turn;
    }
  }
  if (!isEnemyComboPrelude) {
    previousPlayerLastCardType.value = resolvedPlayerCard.id === PASS_CARD.id ? null : resolvedPlayerCard.type;
    previousPlayerFinalPoint.value = resolvedPlayerCard.id === PASS_CARD.id ? resolvedPlayerDice : pClashPoint;
    combatState.value.lastPlayedCard = resolvedPlayerCard.id === PASS_CARD.id ? null : resolvedPlayerCard;
  }

  const clearBurnForSide = (side: 'player' | 'enemy', reason: string) => {
    const target = getEntityBySide(side);
    const label = side === 'player' ? '我方' : '敌方';
    const burnStacks = getEffectStacks(target, ET.BURN);
    if (burnStacks <= 0) return;
    if (side === 'enemy') {
      const purpleLightCount = getActiveRelicCount('burn_gloom_purple_light');
      if (purpleLightCount > 0) {
        const trueDamage = burnStacks * 2 * purpleLightCount;
        const { actualDamage } = applyDamageToSideWithRelics('enemy', target, trueDamage, true, '幽幽紫光', {
          sourceSide: 'player',
          isDirectDamage: true,
        });
        if (actualDamage > 0) {
          pushFloatingNumber('enemy', actualDamage, 'true', '-', { targetEntity: target });
        }
        logRelicMessage(`[幽幽紫光] 敌方燃烧即将消失，造成 ${actualDamage} 点真实伤害。`);
      }
    }
    removeEffect(target, ET.BURN);
    log(`<span class="text-orange-300">${reason} ${label}燃烧清空（${burnStacks}层）。</span>`);
  };

  if (shouldClash) {
    const pirateHookCount = getActiveRelicCount('system_destruction_relic_08');
    if (pirateHookCount > 0) {
      applyStatusEffectWithRelics('player', ET.CHARGE, pirateHookCount, { source: 'relic:system_destruction_relic_08' });
    }
  }
  const pirateHatCount = getActiveRelicCount('system_destruction_relic_09');
  if (pirateHatCount > 0 && pClashPoint > playerStats.value.maxDice) {
    const charge = Math.floor((pClashPoint - playerStats.value.maxDice) / 2) * pirateHatCount;
    if (charge > 0) applyStatusEffectWithRelics('player', ET.CHARGE, charge, { source: 'relic:system_destruction_relic_09' });
  }

  // 怠惰之书：双方都处于眩晕时，跳过回合不会清除对方燃烧
  const slothBookKeepsBurn = getActiveRelicCount(PORTED_RELIC_ID.SLOTH_BOOK) > 0
    && getEffectStacks(playerStats.value, ET.STUN) > 0
    && getEffectStacks(enemyStats.value, ET.STUN) > 0;
  if (slothBookKeepsBurn && (enemySkippedTurn || playerSkippedTurn)) {
    logRelicMessage('[怠惰之书] 双方眩晕，跳过回合不会清除燃烧。');
  }
  if (enemySkippedTurn) {
    if (!slothBookKeepsBurn) clearBurnForSide('player', '敌方跳过回合。');
    tickStigmataSkipDecay('enemy');
  }
  if (playerSkippedTurn) {
    if (!slothBookKeepsBurn) clearBurnForSide('enemy', '我方跳过回合。');
    tickStigmataSkipDecay('player');
  }
  if (playerSkippedTurn) {
    const lanternCount = getActiveRelicCount('burn_flame_lantern');
    if (lanternCount > 0 && applyStatusEffectWithRelics('enemy', ET.BURN, 2 * lanternCount, { source: 'relic:burn_flame_lantern' })) {
      logRelicMessage(`[火焰灯笼] 跳过回合后，对敌方施加 ${2 * lanternCount} 层燃烧。`);
    }
    const smokeBombCount = getActiveRelicCount('system_corruption_relic_07');
    const smokeBombState = getRelicRuntimeState('system_corruption_relic_07');
    if (smokeBombCount > 0 && smokeBombState.used !== true) {
      smokeBombState.used = true;
      applyStatusEffectWithRelics('enemy', ET.STUN, smokeBombCount, {
        source: 'relic:system_corruption_relic_07',
        lockDecayThisTurn: true,
      });
      logRelicMessage('[迷雾瓶] 跳过回合，使敌方眩晕。');
    }
  }

  const triggerDanceHallForSide = (holderSide: BattleSide, holderCard: CardData, opponentCard: CardData) => {
    const holder = holderSide === 'player' ? playerStats.value : getEntityBySide('enemy');
    if (getEffectStacks(holder, ET.DANCE_HALL) <= 0) return;
    const opponentSide = holderSide === 'player' ? 'enemy' : 'player';
    const holderLabel = holderSide === 'player' ? '我方' : '敌方';
    const opponentLabel = opponentSide === 'player' ? '我方' : '敌方';

    if (opponentCard.id === PASS_CARD.id) {
      const opponent = getEntityBySide(opponentSide);
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
    // 进入拼点即解除，先于 on_clash、流血和双方卡牌伤害。
    beginRuneClash(playerStats.value);
    beginRuneClash(getEntityBySide('enemy'));
    previewPlayerDice.value = pClashPoint;
    previewEnemyDice.value = eClashPoint;
    showClashAnimation.value = true;
    await wait(600);

    battleFeedback.effect('clash', 'clash');
    screenShake.value = true;
    setTimeout(() => (screenShake.value = false), 500);

    // 血刃附加：进入拼点即触发
    applyBloodbladeAttachOnClash('player', 'enemy');
    applyBloodbladeAttachOnClash('enemy', 'player');
    const rageBookRepeats = getActiveRelicCount('system_destruction_relic_01') > 0 ? 2 : 1;
    for (let repeat = 0; repeat < rageBookRepeats; repeat++) {
      const triggered = applyCardEffectsByTrigger('player', resolvedPlayerCard, pClashPoint, 'on_clash');
      if (!triggered) break;
      if (repeat > 0) logRelicMessage(`[暴怒之书] 【${resolvedPlayerCard.name}】的拼点效果再次触发。`);
    }
    applyCardEffectsByTrigger('enemy', resolvedEnemyCard, eClashPoint, 'on_clash');
    // 【反冲】拼点时使对方受到等同其自身点数的物理伤害
    for (const [recoilSide, recoilCard, opposingPoint] of [
      ['player', resolvedPlayerCard, eClashPoint],
      ['enemy', resolvedEnemyCard, pClashPoint],
    ] as const) {
      if (recoilCard.id !== 'system_destruction_反冲') continue;
      const targetSide = oppositeSide(recoilSide);
      const repeats = recoilSide === 'player' ? rageBookRepeats : 1;
      for (let repeat = 0; repeat < repeats; repeat++) {
        const target = getEntityBySide(targetSide);
        const { actualDamage } = applyDamageToSideWithRelics(
          targetSide,
          target,
          Math.max(0, Math.floor(opposingPoint)),
          false,
          `卡牌【${recoilCard.name}】`,
          { sourceSide: recoilSide, isDirectDamage: true, card: recoilCard },
        );
        if (actualDamage > 0) pushFloatingNumber(targetSide, actualDamage, 'physical', '-', { targetEntity: target });
        log(`<span class="text-zinc-300">${recoilSide === 'player' ? '我方' : '敌方'}【${recoilCard.name}】反冲：对方受到 ${actualDamage} 点物理伤害。</span>`);
        if (repeat > 0) logRelicMessage(`[暴怒之书] 【${recoilCard.name}】的拼点效果再次触发。`);
      }
    }

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
      } else if (getActiveRelicCount('system_shadow_relic_07') > 0) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '我方[面罩]将平局视为拼点胜利';
        applyStatusEffectWithRelics('enemy', ET.VULNERABLE, getActiveRelicCount('system_shadow_relic_07'), { source: 'relic:system_shadow_relic_07' });
      } else {
        pSuccess = false;
        eSuccess = false;
        clashWinner = 'tie';
        resultMsg = '势均力敌！';
        const maskTwoCount = getActiveRelicCount('system_shadow_relic_08');
        if (maskTwoCount > 0) applyStatusEffectWithRelics('player', ET.DAMAGE_BOOST, maskTwoCount, { source: 'relic:system_shadow_relic_08' });
      }
    } else if (resolvedPlayerCard.type === CardType.DODGE) {
      if (eClashPoint > pClashPoint) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '我方闪避成功！';
        successfulDodger = 'player';
      } else if (eClashPoint === pClashPoint && resolvedPlayerCard.id === 'system_shadow_镜影') {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '我方【镜影】将平点视为闪避成功';
        successfulDodger = 'player';
        applyStatusEffectWithRelics('enemy', ET.VULNERABLE, 2, { source: resolvedPlayerCard.id, sourceSide: 'player' });
      } else if (eClashPoint === pClashPoint && getActiveRelicCount('system_shadow_relic_07') > 0) {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '我方[面罩]将平局视为闪避成功';
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
      } else if (pClashPoint === eClashPoint && resolvedEnemyCard.id === 'system_shadow_镜影') {
        pSuccess = false;
        clashWinner = 'enemy';
        resultMsg = '敌方【镜影】将平点视为闪避成功';
        successfulDodger = 'enemy';
        applyStatusEffectWithRelics('player', ET.VULNERABLE, 2, { source: resolvedEnemyCard.id, sourceSide: 'enemy' });
      } else {
        eSuccess = false;
        clashWinner = 'player';
        resultMsg = '敌方闪避失败！';
      }
    }

    if (successfulDodger === 'player' && resolvedPlayerCard.id === SIN_CARD_ID.ENVY) {
      const envyTarget = getEntityBySide('enemy');
      if (envyTarget.maxDice > playerStats.value.maxDice) {
        const before = envyTarget.maxDice;
        envyTarget.maxDice = Math.max(envyTarget.minDice, envyTarget.maxDice - 1);
        if (envyTarget.maxDice !== before) logSin(resolvedPlayerCard, `嫉妒地夺走了敌方的力量：敌方最大点数 ${before} → ${envyTarget.maxDice}。`);
      }
    }

    const playerAttackCard = resolvedPlayerCard.type === CardType.PHYSICAL
      || resolvedPlayerCard.type === CardType.MAGIC;
    const steelHandFollowThrough = getActiveRelicCount('system_destruction_relic_05') > 0
      && playerAttackCard
      && resolvedEnemyCard.type !== CardType.DODGE
      && (clashWinner === 'enemy' || clashWinner === 'tie');
    if (steelHandFollowThrough) {
      pSuccess = true;
      log(`<span class="text-zinc-300">[钢铁之手] 我方攻击牌即使拼点失败或平局仍然命中。</span>`);
    }

    if (clashWinner) {
      resolveRuneClashEnergy(playerStats.value, clashWinner === 'tie' ? null : clashWinner === 'player');
      resolveRuneClashEnergy(getEntityBySide('enemy'), clashWinner === 'tie' ? null : clashWinner === 'enemy');
      battleFeedback.action('clashResult');
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
      // 坠落之塔按对方点数结算拼点失败效果
      const playerClashFailPoint = resolvedPlayerCard.id === 'system_destruction_坠落之塔' ? eClashPoint : pClashPoint;
      const rageRepeats = getActiveRelicCount('system_destruction_relic_01') > 0 ? 2 : 1;
      await presentClashFailFeedback('player', resolvedPlayerCard);
      if (resolvedPlayerCard.id === 'system_destruction_反冲') {
        systemCardTurnFlags.value.player.system_destruction_repel = true;
        log(`<span class="text-zinc-300">我方【${resolvedPlayerCard.name}】拼点失败：本回合受到的伤害减半。</span>`);
      }
      for (let repeat = 0; repeat < rageRepeats; repeat++) {
        const triggered = applyCardEffectsByTrigger('player', resolvedPlayerCard, playerClashFailPoint, 'on_clash_fail');
        if (!triggered) break;
        if (repeat > 0) logRelicMessage(`[暴怒之书] 【${resolvedPlayerCard.name}】的拼点失败效果再次触发。`);
      }
      cardHitLeadIn = null;
    }
    if (!eSuccess) {
      const enemyClashFailPoint = resolvedEnemyCard.id === 'system_destruction_坠落之塔' ? pClashPoint : eClashPoint;
      await presentClashFailFeedback('enemy', resolvedEnemyCard);
      if (resolvedEnemyCard.id === 'system_destruction_反冲') {
        systemCardTurnFlags.value.enemy.system_destruction_repel = true;
        log(`<span class="text-zinc-300">敌方【${resolvedEnemyCard.name}】拼点失败：本回合受到的伤害减半。</span>`);
      }
      applyCardEffectsByTrigger('enemy', resolvedEnemyCard, enemyClashFailPoint, 'on_clash_fail');
      cardHitLeadIn = null;
      if (painScene) addPainMemory(enemyStats.value, -3);
    }
    systemPreviousClashLoss.value.player = clashWinner === 'enemy';
    systemPreviousClashLoss.value.enemy = clashWinner === 'player';
    // 大爆破 / 爆破：本场战斗每次拼点失败（无论打出的是什么牌）点数+3
    const clashLoserSide: BattleSide | null = clashWinner === 'enemy' ? 'player' : clashWinner === 'player' ? 'enemy' : null;
    if (clashLoserSide) {
      increaseBattleCardPointBonus(clashLoserSide, 'system_destruction_引爆', 3, 999);
      increaseBattleCardPointBonus(clashLoserSide, 'system_destruction_引爆2', 3, 999);
    }
    if (painScene?.phaseTwoActive && clashWinner === 'player'
      && resolvedPlayerCard.type === resolvedEnemyCard.type
      && (resolvedPlayerCard.type === CardType.PHYSICAL || resolvedPlayerCard.type === CardType.MAGIC)) {
      changePainThorns(enemyStats.value, -2);
    }
    // 流血：只要发生拼点，双方都按各自当前流血层数受到真实伤害
    const playerBleedStacksOnClash = Math.max(0, getEffectStacks(playerStats.value, ET.BLEED));
    if (playerBleedStacksOnClash > 0) {
      triggerBleedProc('player', '拼点阶段');
    }
    const enemyBleedStacksOnClash = Math.max(0, getEffectStacks(getEntityBySide('enemy'), ET.BLEED));
    if (enemyBleedStacksOnClash > 0 && getActiveRelicCount('bloodpool_eerie_statue') <= 0) {
      triggerBleedProc('enemy', '拼点阶段');
    } else if (enemyBleedStacksOnClash > 0) {
      logRelicMessage('[诡异雕像] 拼点阶段不触发敌方流血。');
    }
    if (clashWinner === 'enemy') {
      changeRerollCharges('player', 1);
      log('<span class="text-amber-300">拼点失败：重掷次数 +1</span>');
      const bandageCount = getActiveRelicCount('system_destruction_relic_04');
      if (bandageCount > 0) {
        const { healed } = healForSide('player', 2 * bandageCount, { sourceSide: 'player', reason: '止血绷带' });
        if (healed > 0) logRelicMessage(`[止血绷带] 拼点失败，回复 ${healed} 点生命。`);
      }
      const towerCount = getActiveRelicCount(PORTED_RELIC_ID.COLLAPSING_TOWER);
      if (towerCount > 0) {
        const towerTarget = getEntityBySide('enemy');
        const { actualDamage: towerDamage } = applyDamageToSideWithRelics(
          'enemy',
          towerTarget,
          3 * towerCount,
          true,
          '崩塌之塔',
          { sourceSide: 'player', isDirectDamage: true },
        );
        if (towerDamage > 0) pushFloatingNumber('enemy', towerDamage, 'true', '-', { targetEntity: towerTarget });
        logRelicMessage(`[崩塌之塔] 拼点失败，对敌方造成 ${towerDamage} 点真实伤害。`);
      }
      const bootCount = getActiveRelicCount('system_destruction_relic_07');
      if (bootCount > 0 && playerStats.value.minDice < playerStats.value.maxDice) {
        playerStats.value.minDice = Math.min(playerStats.value.maxDice, playerStats.value.minDice + bootCount);
        logRelicMessage(`[钢靴] 拼点失败，最小点数提升至 ${playerStats.value.minDice}。`);
      }
      const insuranceCount = getActiveRelicCount('system_destruction_relic_17');
      if (insuranceCount > 0) {
        const state = getRelicRuntimeState('system_destruction_relic_17');
        const used = Math.max(0, Math.floor(Number(state.uses ?? 0)));
        const available = Math.max(0, 30 - used);
        const triggers = Math.min(insuranceCount, available);
        if (triggers > 0) {
          state.uses = used + triggers;
          changeSystemGold(triggers);
          playerStats.value.maxHp += triggers;
          playerStats.value.hp = Math.min(playerStats.value.maxHp, playerStats.value.hp + triggers);
          logRelicMessage(`[赔偿契约] 拼点失败，获得 ${triggers} 金币与 ${triggers} 点生命上限。`);
        }
      }
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
      presentDodgeFeedback('player', resolvedPlayerCard);
      applyLightningAttachOnDodge('player', 'enemy');
      applyCardEffectsByTrigger('player', resolvedPlayerCard, pClashPoint, 'on_dodge_success');
      applySystemPollutionDodgeEffect('player', resolvedPlayerCard);
      applyNewSystemDodgeSuccessEffects('player', resolvedPlayerCard);
      triggerShadowAssaultDamage('player', resolvedPlayerCard, pClashPoint, 'on_dodge_success');
      const kunaiCount = getActiveRelicCount('system_shadow_relic_03');
      if (kunaiCount > 0) {
        const { actualDamage } = applyDamageToSideWithRelics('enemy', enemyStats.value, 2 * kunaiCount, false, '投刃', {
          sourceSide: 'player', isDirectDamage: true,
        });
        if (actualDamage > 0) pushFloatingNumber('enemy', actualDamage, 'physical', '-');
      }
      const catTailCount = getActiveRelicCount('system_shadow_relic_05');
      if (catTailCount > 0) {
        const state = getRelicRuntimeState('system_shadow_relic_05');
        const uses = Math.max(0, Math.floor(Number(state.uses ?? 0)));
        if (uses < 9) {
          state.uses = uses + 1;
          healForSide('player', catTailCount, { sourceSide: 'player', reason: '猫尾' });
        }
      }
      const geckoCount = getActiveRelicCount('system_corruption_relic_08');
      if (geckoCount > 0) {
        const geckoState = getRelicRuntimeState('system_corruption_relic_08');
        const geckoUses = Math.max(0, Math.floor(Number(geckoState.uses ?? 0)));
        if (geckoUses < 9) {
          geckoState.uses = geckoUses + 1;
          const restored = restoreManaForSide('player', geckoCount);
          if (restored > 0) logRelicMessage(`[壁虎] 闪避成功，回复 ${restored} 点魔力（本场 ${geckoUses + 1}/9）。`);
        }
      }
      const catClawCount = getActiveRelicCount('system_shadow_relic_06');
      const catClawState = getRelicRuntimeState('system_shadow_relic_06');
      const catClawLastTurn = Math.floor(Number(catClawState.lastTriggerTurn ?? -99));
      if (catClawCount > 0 && combatState.value.turn - catClawLastTurn >= 4) {
        catClawState.lastTriggerTurn = combatState.value.turn;
        const { actualDamage } = applyDamageToSideWithRelics('enemy', enemyStats.value, Math.max(0, Math.floor(pClashPoint * catClawCount)), false, '猫爪', {
          sourceSide: 'player', isDirectDamage: true,
        });
        if (actualDamage > 0) pushFloatingNumber('enemy', actualDamage, 'physical', '-');
      }
      const shadowBladeCount = getActiveRelicCount('system_shadow_relic_11');
      if (shadowBladeCount > 0) applyStatusEffectWithRelics('player', ET.DAMAGE_BOOST, shadowBladeCount, { source: 'relic:system_shadow_relic_11' });
      const centipedeCount = getActiveRelicCount('system_corruption_relic_04');
      if (centipedeCount > 0) {
        const centipedeBonus = enemyStats.value.hp >= enemyStats.value.maxHp ? centipedeCount * 2 : centipedeCount;
        applyStatusEffectWithRelics('enemy', ET.POISON, centipedeBonus, { source: 'relic:system_corruption_relic_04' });
      }
      const shadowCopyCount = getActiveRelicCount('system_shadow_relic_10');
      if (shadowCopyCount > 0) {
        if (resolvedEnemyCard.type === CardType.DODGE) {
          applyStatusEffectWithRelics('enemy', ET.VULNERABLE, shadowCopyCount, { source: 'relic:system_shadow_relic_10' });
        } else if (resolvedEnemyCard.type === CardType.FUNCTION) {
          healForSide('player', shadowCopyCount, { sourceSide: 'player', reason: '它的影子' });
        }
      }
      if (resolvedPlayerCard.id === 'modao_zero_domain_dodge') {
        grantNextTurnMagicCostFree('player', resolvedPlayerCard);
      }
      if (resolvedPlayerCard.id === 'modao_kite') {
        grantNextTurnMagicPointBonus('player', 2, resolvedPlayerCard);
      }
      if (resolvedPlayerCard.id === 'enemy_holy_water_jellyfish_swim') {
        insertHolyWaterIntoOpponentDeck('player', 2, resolvedPlayerCard.name);
      }
    } else if (successfulDodger === 'enemy') {
      presentDodgeFeedback('enemy', resolvedEnemyCard);
      applyLightningAttachOnDodge('enemy', 'player');
      applyCardEffectsByTrigger('enemy', resolvedEnemyCard, eClashPoint, 'on_dodge_success');
      applySystemPollutionDodgeEffect('enemy', resolvedEnemyCard);
      applyNewSystemDodgeSuccessEffects('enemy', resolvedEnemyCard);
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
      if (resolvedEnemyCard.id === 'enemy_holy_water_jellyfish_swim') {
        insertHolyWaterIntoOpponentDeck('enemy', 2, resolvedEnemyCard.name);
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
    const attacker = source === 'player' ? playerStats.value : getEntityBySide('enemy');
    const defender = source === 'player' ? getEntityBySide('enemy') : playerStats.value;
    const label = source === 'player' ? '我方' : '敌方';
    const defenderSide = source === 'player' ? 'enemy' : 'player';
    const defenderLabel = defenderSide === 'player' ? '我方' : '敌方';
    const opponentSkippedTurn = source === 'player' ? enemySkippedTurn : playerSkippedTurn;
    const cardForCalculation = card;
    const enemyColdBeforeAction = getEffectStacks(enemyStats.value, ET.COLD);
    const playerBurnBeforeAction = getEffectStacks(playerStats.value, ET.BURN);
    const playerHpBeforeAction = playerStats.value.hp;
    let relicTrackingHandled = false;

    if (attacker.hp <= 0) {
      if (source === 'enemy' && leviathanActingSummon.value) {
        log(`<span class="text-gray-400">召唤物【${leviathanActingSummon.value.name}】已无法行动。</span>`);
      }
      return;
    }

    if (source === 'enemy' && card.id !== PASS_CARD.id) {
      const enemyRuntimeCard = withEffectiveManaCost('enemy', card);
      const enemyPlayCheck = canPlayCard(attacker, enemyRuntimeCard, baseDice, {
        ignoreMana: executeOptions.skipManaCost,
        previousCardType: leviathanActingSummon.value?.previousCardType ?? previousEnemyLastCardType.value,
      });
      if (!enemyPlayCheck.allowed) {
        if (enemyPlayCheck.blockerEffectType) triggerBlockedEffectFeedback('enemy', enemyPlayCheck.blockerEffectType);
        triggerEnemyIntentInvalidShake(options.twinSlotIndex, card);
        if (enemyRuntimeCard.type === CardType.MAGIC && enemyRuntimeCard.manaCost > attacker.mp) {
          notifyEnemyManaInsufficient();
        } else {
          log(`<span class="text-gray-400">敌方无法出牌：${enemyPlayCheck.reason ?? '本回合跳过。'}</span>`);
        }
        return;
      }
      const isSummonEnemyAction = leviathanActingSummon.value !== null;
      if (enemyRuntimeCard.type === CardType.MAGIC && !executeOptions.skipManaCost && (isSummonEnemyAction || !enemyIntentManaSpentThisTurn.value)) {
        const enemyManaCost = enemyRuntimeCard.id === 'enemy_selina_space_fold'
          ? getSelinaSpaceFoldManaSpend(attacker)
          : enemyRuntimeCard.manaCost;
        const canSpend = spendManaWithShock('enemy', enemyManaCost, `使用【${enemyRuntimeCard.name}】`);
        if (!canSpend) {
          triggerEnemyIntentInvalidShake(options.twinSlotIndex, card);
          notifyEnemyManaInsufficient();
          return;
        }
        if (!isSummonEnemyAction) {
          enemyIntentManaSpentThisTurn.value = true;
        }
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
      const canSpend = spendPlayerManaWithBottle(playerManaCost, `使用【${card.name}】`, { allowHp: true });
      if (!canSpend) {
        log(`<span class="text-red-400">${label}【${card.name}】发动失败：魔力已不足。</span>`);
        return;
      }
    } else if (source === 'player' && card.type === CardType.MAGIC && card.id !== PASS_CARD.id && executeOptions.skipManaCost) {
      if (!executeOptions.manaCostAlreadyPaid) {
        logRelicMessage(`[星之核] 【${card.name}】额外结算不再消耗魔力。`);
      }
    }
    if (card.id === PORTED_CARD.SPELL_RECITAL) {
      const recalled = lastPlayedMagicCard.value[source];
      if (recalled) {
        log(`<span class="text-blue-300">${label}【${card.name}】复诵上一张魔法牌【${recalled.name}】。</span>`);
        card = { ...recalled };
      } else {
        log(`<span class="text-gray-400">${label}【${card.name}】本场尚未打出过魔法牌，按自身效果结算。</span>`);
      }
    } else if (card.type === CardType.MAGIC && card.id !== PASS_CARD.id) {
      lastPlayedMagicCard.value[source] = card;
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
    prepareRuneCardOnPlay(source, card);
    const finalPoint = card.id === UMBILICAL_TENTACLE_CARD.PULL
      ? (source === 'player' ? pClashPoint : eClashPoint)
      : getCardFinalPoint(source, card, baseDice);
    queueNextTurnStartCardEffects(source, card, finalPoint, attacker);
    let extraAttributesApplied = false;
    const applyCardExtraAttributes = () => {
      if (extraAttributesApplied) return;
      extraAttributesApplied = true;
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
            recordBattlePainLoss(source, hpLossByCap, false, true);
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
          `魔力汲取（${label}【${card.name}】）`,
        );
        const drainedMana = Math.max(0, -drainResult.actualDelta);
        const overflowHpDamage = Math.max(0, manaDrain - drainedMana);
        let actualOverflowHpDamage = 0;

        if (overflowHpDamage > 0) {
          actualOverflowHpDamage = applyDirectHpLossWithRelics(
            defenderSide,
            defender,
            overflowHpDamage,
            `卡牌【${card.name}】魔力汲取溢出`,
            { sourceSide: source, isDirectDamage: true },
          );
          pushFloatingNumber(defenderSide, actualOverflowHpDamage, 'true', '-');
        }

        const gainResult = changeManaWithShock(
          source,
          manaDrain,
          `魔力汲取（${label}【${card.name}】）`,
          { showPositiveFloating: true },
        );
        const gainedMana = Math.max(0, gainResult.actualDelta);
        if (drainedMana > 0 || actualOverflowHpDamage > 0 || gainedMana > 0) presentEffect(defender, 'manaDrain');

        const overflowDamageText = actualOverflowHpDamage > 0
          ? `，额外造成 ${actualOverflowHpDamage} 点真实伤害`
          : '';
        log(`<span class="text-blue-300">${label}【${card.name}】魔力汲取：吸收 ${drainedMana} 点魔力并回复自身 ${gainedMana} 点魔力${overflowDamageText}</span>`);

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
          pushFloatingNumber('enemy', actualTrueDamage, 'true', '-', { targetEntity: enemyStats.value });
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
      if (card.id !== PASS_CARD.id) presentCardUseFeedback(source, card);
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
      if (card.id === 'system_destruction_引爆2') {
        battleCardPointBonus.value[source][card.id] = 0;
      }
      if (card.id === 'enemy_prayer_candle_bliss_baptism') {
        const beforePrayer = Math.max(0, getEffectStacks(attacker, ET.PRAYER));
        const consumedPrayer = Math.min(3, beforePrayer);
        if (consumedPrayer > 0) {
          reduceEffectStacks(attacker, ET.PRAYER, consumedPrayer);
        }
        log(`<span class="text-violet-300">${label}【${card.name}】移除了自身 ${consumedPrayer} 层祈祷。</span>`);
      }
      if (card.id === 'enemy_holy_water_sprite_farewell_light') {
        const prayerStacks = Math.max(0, getEffectStacks(attacker, ET.PRAYER));
        if (prayerStacks > 0) {
          removeEffect(attacker, ET.PRAYER);
        }
        log(`<span class="text-violet-300">${label}【${card.name}】清空了自身 ${prayerStacks} 层祈祷。</span>`);
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
      if (card.id === 'system_destruction_引爆2') {
        battleCardPointBonus.value[source][card.id] = 0;
      }
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
      } else if (leviathanActingSummon.value) {
        if (leviathanActingSummon.value.baseDice !== nextPoint) {
          leviathanActingSummon.value.baseDice = nextPoint;
        }
      } else if (combatState.value.enemyBaseDice !== nextPoint) {
        combatState.value.enemyBaseDice = nextPoint;
      }
    };

    const applyCardEffects = (
      trigger: CardEffectTrigger = 'on_use',
      kindMode: 'all' | 'pre_reroll_self_buff_only' | 'post_reroll_on_use' = 'post_reroll_on_use',
    ) => {
      const primaryApplied = applyCardEffectsByTrigger(source, card, finalPoint, trigger, kindMode);
      if (!(source === 'player' && isLeviathanBattle && card.swarmAttack)) {
        return primaryApplied;
      }
      const hasOpponentEffects = card.cardEffects.some(ce => (
        (ce.target ?? 'self') === 'enemy' && cardEffectMatchesTrigger(ce.triggers, trigger)
      ));
      if (!hasOpponentEffects) return primaryApplied;

      const splashTargets = getLeviathanTeamEntities().filter(entity => entity !== defender && entity.hp > 0);
      if (splashTargets.length <= 0) return primaryApplied;

      let splashApplied = false;
      const previousTargetOverride = leviathanEnemyTargetOverride.value;
      try {
        for (const target of splashTargets) {
          leviathanEnemyTargetOverride.value = target;
          splashApplied = applyCardEffectsByTrigger(source, card, finalPoint, trigger, kindMode, 'enemy_only') || splashApplied;
        }
      } finally {
        leviathanEnemyTargetOverride.value = previousTargetOverride;
      }
      return primaryApplied || splashApplied;
    };

    if (opponentSkippedTurn) {
      applyCardEffects('on_opponent_skip');
      triggerShadowAssaultDamage(source, card, finalPoint, 'on_opponent_skip');
      if (card.id === 'enemy_holy_water_jellyfish_swim') {
        insertHolyWaterIntoOpponentDeck(source, 2, card.name);
      }
    }
    if (!hasTakenDirectDamageThisTurn(source)) {
      applyCardEffects('on_no_direct_damage_taken_this_turn');
    }
    if (card.id !== SIGEL_CARD.SHIFT && !hasTakenDamageThisTurn(source)) {
      applyCardEffects('on_no_damage_taken_this_turn');
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
        const slumberCard = cloneCardForBattle(slumber);
        recordCardTransform(targetHand[pickedIndex], slumberCard);
        targetHand.splice(pickedIndex, 1, slumberCard);
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
      recordBattlePainLoss(source, Math.max(0, -attackerDelta), false, true);
      recordBattlePainLoss(defenderSide, Math.max(0, -defenderDelta), false);

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
          { sourceSide: source, isDirectDamage: true, card },
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
        const manaResult = changeManaWithShock(source, x, `魔力变化（${label}【${card.name}】）`, {
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
        const wasteCard = cloneCardForBattle(waste);
        recordCardTransform(targetHand[pickedIndex], wasteCard);
        targetHand.splice(pickedIndex, 1, wasteCard);
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
        const { actualDamage, logs: burnLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
          defenderSide,
          defender,
          burnDamage,
          false,
          `卡牌【${card.name}】触发燃烧`,
          { sourceSide: source, isDirectDamage: true, feedbackEffect: 'burn' },
        );
        if (actualDamage > 0) {
          pushFloatingNumber(defenderSide, actualDamage, 'magic', '-', { damageBeforeLimit });
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
      if (applyGaiaCard(source, card, finalPoint)) {
        syncCurrentPointForUi();
        finalizeAndTrack();
        return;
      }
      if (card.id === UMBILICAL_TENTACLE_CARD.PULL) {
        syncCurrentPointForUi();
        const opposingPoint = opponentSkippedTurn
          ? null
          : source === 'player' ? eClashPoint : pClashPoint;
        applyUmbilicalPullOnUse(source, card, finalPoint, opposingPoint);
        finalizeAndTrack();
        return;
      }
      if (painScene && (card.id.startsWith('enemy_pain_') || card.id.startsWith('pain_curse_')) && card.selfDamage) {
        applyCardExtraAttributes();
        if (attacker.hp <= 0) {
          finalizeAndTrack();
          return;
        }
      }
      if (painScene && card.id === PAIN_CARD.CHOOSE) {
        await requestPainOath();
        finalizeAndTrack();
        return;
      }
      if (painScene && card.id === PAIN_CARD.CUT_ROBE) {
        changePainThorns(enemyStats.value, 3);
        insertPainCurses(1);
      }
      if (painScene && card.id === PAIN_CARD.RECEIVE) {
        transferPainBleed('player', 'enemy', 4);
        insertPainCurses(2);
      }
      if (painScene && source === 'player' && card.id === PAIN_CARD.CRYSTAL) changePainThorns(enemyStats.value, -4);
      if (painScene && source === 'player' && card.id === PAIN_CARD.SCAR) {
        painScene.armorBlockedTurn = combatState.value.turn;
        changePainThorns(enemyStats.value, 2);
      }
      if (source === 'enemy' && card.id === LEVIATHAN_SUMMON_CARD_ID) {
        syncCurrentPointForUi();
        const leviathanSummonName = pickLeviathanSummonName();
        summonLeviathanUnit(leviathanSummonName);
        resetLeviathanSummonCardWeight();
        refreshLeviathanAiFlags();
        finalizeAndTrack();
        return;
      }
      if (source === 'enemy' && card.id === 'enemy_leviathan_ecological_rhythm') {
        syncCurrentPointForUi();
        leviathanEcologicalRhythmActive.value = true;
        log('<span class="text-violet-300">利维坦【生态律动】生效：本回合召唤物打出物理/魔法牌时，利维坦获得1层创世。</span>');
        finalizeAndTrack();
        return;
      }
      if (source === 'enemy' && card.id === 'enemy_leviathan_deep_sea_support') {
        syncCurrentPointForUi();
        const targetSummon = getLeviathanSupportTarget();
        if (targetSummon) {
          applyEffect(targetSummon.stats, ET.DAMAGE_BOOST, 2, { source: card.id });
          applyEffect(targetSummon.stats, ET.IGNORE_DODGE, 3, { source: card.id });
          log(`<span class="text-violet-300">利维坦【${card.name}】强化了【${targetSummon.name}】：增伤 +2，无视闪避 +3。</span>`);
        } else {
          log(`<span class="text-gray-400">利维坦【${card.name}】没有可援护的召唤物。</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (source === 'enemy' && card.id === 'enemy_leviathan_mirror_sea_oath') {
        syncCurrentPointForUi();
        const oathPoint = Math.max(0, Math.floor(finalPoint));
        leviathanMirrorSeaOathPendingPoint.value = Math.max(leviathanMirrorSeaOathPendingPoint.value, oathPoint);
        log(`<span class="text-cyan-300">利维坦【${card.name}】立下镜海之誓：下回合己方全体获得 ${oathPoint} 层坚固并开启生命回复共鸣。</span>`);
        finalizeAndTrack();
        return;
      }
      if (source === 'enemy' && card.id === 'enemy_leviathan_crystallized_holy_water') {
        syncCurrentPointForUi();
        const consumed = consumeLeviathanGenesisKeepingOne(5);
        let removedTotal = 0;
        let healedTotal = 0;
        const healedByEntity = new Map<EntityStats, number>();
        for (let i = 0; i < consumed; i += 1) {
          for (const entity of getLeviathanTeamEntities()) {
            removedTotal += removeRandomDebuffStacksFromEntity(entity, 3);
            const healed = healLeviathanEntityDirect(entity, 10);
            healedTotal += healed;
            if (healed > 0) {
              healedByEntity.set(entity, (healedByEntity.get(entity) ?? 0) + healed);
            }
          }
        }
        for (const [entity, healed] of healedByEntity) {
          pushLeviathanEntityRecoveryNumber(entity, healed, 'hp');
        }
        log(`<span class="text-cyan-300">利维坦【${card.name}】消耗 ${consumed} 层创世，己方全体合计移除 ${removedTotal} 层负面效果并回复 ${healedTotal} 点生命。</span>`);
        finalizeAndTrack();
        return;
      }
      if (source === 'enemy' && card.id === 'enemy_leviathan_tidal_lock') {
        syncCurrentPointForUi();
        leviathanTidalLockCheckTurn.value = combatState.value.turn;
        log(`<span class="text-violet-300">利维坦【${card.name}】张开潮汐锁定：将在本回合结算结束后检查我方是否造成过伤害。</span>`);
        finalizeAndTrack();
        return;
      }
      if (source === 'enemy' && card.id === 'enemy_leviathan_reincarnation_vortex') {
        syncCurrentPointForUi();
        if (getDamageHitTakenThisTurn('enemy') <= 0) {
          const targetSummon = getAliveLeviathanSummons()
            .sort((a, b) => (a.stats.hp / Math.max(1, a.stats.maxHp)) - (b.stats.hp / Math.max(1, b.stats.maxHp)))[0] ?? null;
          if (targetSummon) {
            const healAmount = Math.max(1, Math.floor(targetSummon.stats.maxHp * 0.3));
            const healed = healLeviathanEntityDirect(targetSummon.stats, healAmount);
            if (healed > 0) {
              pushFloatingNumber('enemy', healed, 'heal', '+', { targetEntity: targetSummon.stats });
            }
            log(`<span class="text-emerald-300">利维坦【${card.name}】触发：为生命最低的【${targetSummon.name}】回复 ${healed} 点生命。</span>`);
          } else {
            log(`<span class="text-gray-400">利维坦【${card.name}】没有可治疗的召唤物。</span>`);
          }
        } else {
          log(`<span class="text-gray-400">利维坦【${card.name}】未触发：本回合己方已经受到伤害。</span>`);
        }
        finalizeAndTrack();
        return;
      }
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
      if (card.id === 'abyss_shoal_holy_water_backflow') {
        syncCurrentPointForUi();
        const bleedStacks = Math.max(0, getEffectStacks(attacker, ET.BLEED));
        if (bleedStacks > 0) {
          removeEffect(attacker, ET.BLEED);
          applyStatusEffectWithRelics(source, ET.CORROSION, bleedStacks, { source: card.id });
          log(`<span class="text-cyan-300">${label}【${card.name}】接纳圣水：移除了自身 ${bleedStacks} 层流血，并施加 ${bleedStacks} 层侵蚀。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】接纳圣水：自身没有流血可移除。</span>`);
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
          const manaResult = changeManaWithShock(source, cycles, `魔力变化（${label}【${card.name}】）`, {
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
          const manaResult = changeManaWithShock(source, gain, `魔力变化（${label}【${card.name}】）`, {
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
          changeManaWithShock(source, -consumedMp, `魔力变化（${label}【${card.name}】）`);
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
        const spent = spendManaWithShock(source, wagerCost, `魔力变化（${label}【${card.name}】）`);
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
      if (card.id === 'enemy_holy_water_jellyfish_deep_assimilation') {
        syncCurrentPointForUi();
        const debuffs = attacker.effects.filter((effect) => effect.stacks > 0 && EFFECT_REGISTRY[effect.type]?.polarity === 'debuff');
        if (debuffs.length > 0) {
          const picked = debuffs[Math.floor(Math.random() * debuffs.length)]!;
          removeEffect(attacker, picked.type);
          const effectName = EFFECT_REGISTRY[picked.type]?.name ?? picked.type;
          log(`<span class="text-cyan-300">${label}【${card.name}】清除了自身的【${effectName}】。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未找到可清除的负面状态。</span>`);
        }

        const opponentCard = source === 'player' ? resolvedEnemyCard : resolvedPlayerCard;
        if (opponentCard.type !== CardType.FUNCTION && opponentCard.type !== CardType.DODGE) {
          const beforeCorrosion = Math.max(0, getEffectStacks(defender, ET.CORROSION));
          applyStatusEffectWithRelics(defenderSide, ET.CORROSION, 1, { source: card.id });
          const corrosionAfterApply = Math.max(0, getEffectStacks(defender, ET.CORROSION));
          if (corrosionAfterApply > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.CORROSION, corrosionAfterApply, { source: card.id });
            const finalCorrosion = Math.max(0, getEffectStacks(defender, ET.CORROSION));
            log(`<span class="text-fuchsia-300">${label}【${card.name}】为${defenderLabel}施加1点侵蚀后，将侵蚀翻倍（${beforeCorrosion}→${finalCorrosion}）。</span>`);
          } else {
            log(`<span class="text-gray-400">${label}【${card.name}】${defenderLabel}没有侵蚀可翻倍。</span>`);
          }
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】对方打出了功能/闪避卡牌，侵蚀未翻倍。</span>`);
        }
        finalizeAndTrack();
        return;
      }

      // 四体系中需要读取金币、手牌或上一回合结果的功能牌在这里补充运行时效果。
      if (card.id.startsWith('system_')) {
        if (card.id === 'system_wealth_黄金木板') {
          const gained = Math.max(0, Math.floor(finalPoint));
          if (source === 'player') {
            if (gained > 0) gainTempGold(gained);
            const armorGain = Math.floor(getSpendableGold() / 3);
            const added = armorGain > 0 ? gainArmorAsCardEffect('player', armorGain, card.id, `卡牌【${card.name}】`) : 0;
            log(`<span class="text-yellow-300">${label}【${card.name}】获得 ${gained} 临时金币，按金币获得 ${added} 点护甲。</span>`);
          }
        } else if (card.id === 'system_wealth_金币巧克力') {
          if (source === 'player') {
            gainTempGold(1);
            log(`<span class="text-yellow-300">${label}【${card.name}】获得1临时金币。</span>`);
          }
        } else if (card.id === 'system_wealth_榴莲') {
          systemCardTurnFlags.value[source][card.id] = true;
          thornShellReflectPoint.value[source] = Math.max(0, Math.floor(finalPoint));
        } else if (card.id === 'system_wealth_心之容器') {
          increaseBattleCardPointBonus(source, card.id, 2, 999);
        } else if (card.id === 'system_corruption_酒里藏毒') {
          const { healed } = healForSide(defenderSide, Math.max(0, Math.floor(finalPoint * 2)), {
            sourceSide: source,
            reason: `卡牌【${card.name}】治疗`,
          });
          const poisonStacks = Math.floor(healed / 2);
          if (poisonStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.POISON, poisonStacks, { source: card.id, sourceSide: source });
          }
          log(`<span class="text-emerald-300">${label}【${card.name}】使${defenderLabel}回复 ${healed} 点生命，并施加 ${poisonStacks} 层中毒。</span>`);
        } else if (card.id === 'system_corruption_腐化（暗影）') {
          poisonVulnerableTurn.value[defenderSide] = combatState.value.turn;
          log(`<span class="text-emerald-300">${label}【${card.name}】本回合${defenderLabel}的中毒结算受敏感影响。</span>`);
        } else if (card.id === 'system_destruction_偏折' && finalPoint >= attacker.maxDice) {
          applyStatusEffectWithRelics(source, ET.BARRIER, 1, { source: card.id, durationTurns: 1, temporary: true });
        } else if (card.id === 'system_destruction_压缩饼干') {
          systemCardTurnFlags.value[source][card.id] = true;
        } else if (card.id === 'system_destruction_自我安慰') {
          if (systemLastTurnClashLoss.value[source]) {
            healForSide(source, 6, { sourceSide: source, reason: `卡牌【${card.name}】` });
            applyStatusEffectWithRelics(source, ET.BARRIER, 1, { source: card.id, durationTurns: 1, temporary: true });
          } else {
            const armorGain = Math.max(0, Math.floor(finalPoint));
            if (armorGain > 0) {
              const added = gainArmorAsCardEffect(source, armorGain, card.id, `卡牌【${card.name}】`);
              log(`<span class="text-cyan-300">${label}【${card.name}】获得 ${added} 点护甲。</span>`);
            }
          }
        }
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
      if (card.id === 'enemy_holy_water_sprite_past_elegy') {
        if (getEffectStacks(defender, ET.STIGMATA) > 0) {
          if (applyStatusEffectWithRelics(defenderSide, ET.RESONANCE_LOCK, 4, {
            source: card.id,
            lockDecayThisTurn: true,
          })) {
            log(`<span class="text-fuchsia-300">${label}【${card.name}】触发：目标拥有圣痕，额外施加 4 层共鸣锁</span>`);
          }
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】目标没有圣痕，未施加共鸣锁。</span>`);
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
    } else if (card.id === 'enemy_penitent_ghost_mirror_lure') {
      applyCardEffects();
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
            `魔力变化（${label}【${card.name}】）`,
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
      if (card.id === 'enemy_holy_water_sprite_struggle') {
        syncCurrentPointForUi();
        const expectedSelfDamage = getHolyWaterSpriteStruggleSelfDamageAmount(attacker);
        const actualSelfDamage = applyDirectHpLossWithRelics(source, attacker, expectedSelfDamage, `卡牌【${card.name}】自伤`);
        if (actualSelfDamage > 0) {
          pushFloatingNumber(source, actualSelfDamage, 'true', '-');
        }
        const { healed, convertedDamage } = healForSide(defenderSide, actualSelfDamage, {
          sourceSide: source,
          reason: `卡牌【${card.name}】治疗`,
        });
        if (applyStatusEffectWithRelics(defenderSide, ET.STIGMATA, 2, { source: card.id })) {
          log(`<span class="text-amber-300">${label}【${card.name}】为${defenderLabel}施加 2 层圣痕。</span>`);
        }
        log(`<span class="text-rose-300">${label}【${card.name}】自伤 ${actualSelfDamage} 点，${convertedDamage > 0 ? `${defenderLabel}因血族反噬受到 ${convertedDamage} 点伤害` : `为${defenderLabel}回复 ${healed} 点生命`}。</span>`);
        const selfReviveResult = triggerSwarmReviveIfNeeded(attacker, source);
        for (const reviveLog of selfReviveResult.logs) {
          log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
        }
        const defenderReviveResult = triggerSwarmReviveIfNeeded(defender, defenderSide);
        for (const reviveLog of defenderReviveResult.logs) {
          log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (source === 'enemy' && card.id === 'enemy_leviathan_return_to_ruins') {
        syncCurrentPointForUi();
        const consumed = consumeLeviathanGenesisKeepingOne();
        const summonCount = getAliveLeviathanSummons().length;
        const trueDamage = Math.max(0, consumed * summonCount);
        const { actualDamage, logs: damageLogs } = applyDamageToSideWithRelics(
          'player',
          playerStats.value,
          trueDamage,
          true,
          `卡牌【${card.name}】`,
          { sourceSide: 'enemy', isDirectDamage: true, card },
        );
        if (actualDamage > 0) {
          pushFloatingNumber('player', actualDamage, 'true', '-');
        }
        const healedTotal = healLeviathanTeam(actualDamage, true);
        log(`<span class="text-violet-300">利维坦【${card.name}】消耗 ${consumed} 层创世，按 ${summonCount} 个召唤物造成 ${actualDamage} 点真实伤害，并为己方全体合计回复 ${healedTotal} 点生命。</span>`);
        for (const damageLog of damageLogs) {
          const normalized = damageLog.startsWith('受到') ? `我方${damageLog}` : damageLog;
          log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
        }
        const reviveResult = triggerSwarmReviveIfNeeded(playerStats.value, 'player');
        for (const reviveLog of reviveResult.logs) {
          log(`<span class="text-violet-300 text-[9px]">${reviveLog}</span>`);
        }
        finalizeAndTrack();
        return;
      }
      if (card.id === 'enemy_selina_detain') {
        syncCurrentPointForUi();
        const consumedMp = Math.max(0, Math.floor(attacker.mp));
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `魔力变化（${label}【${card.name}】）`);
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
        log(`<span class="text-violet-300">${label}【${card.name}】消耗了 ${consumedMp} 点魔力，回复对手 ${healed} 点生命并施加 ${consumedMp} 层魔力枯竭</span>`);
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
            { sourceSide: source, isDirectDamage: true, card },
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
      if (card.id === 'enemy_abyss_shoal_golden_vortex') {
        const bleedStacks = Math.max(0, getEffectStacks(defender, ET.BLEED));
        extraHitCount += bleedStacks;
        if (bleedStacks > 0) {
          log(`<span class="text-rose-300">${label}【${card.name}】按目标流血追加 ${bleedStacks} 次命中</span>`);
        }
      }
      if (card.id === 'modao_ring_collapse') {
        const availableMp = Math.min(20, Math.max(0, Math.floor(attacker.mp)));
        const consumedMp = Math.floor(availableMp / 4) * 4;
        const bonusHits = Math.floor(consumedMp / 4);
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `魔力变化（${label}【${card.name}】）`);
        }
        extraHitCount += bonusHits;
        log(`<span class="text-blue-300">${label}【${card.name}】额外消耗 ${consumedMp} 点魔力，追加 ${bonusHits} 次攻击</span>`);
      }
      if (card.id === 'modao_great_gale') {
        const availableMp = Math.min(16, Math.max(0, Math.floor(attacker.mp)));
        const consumedMp = Math.floor(availableMp / 2) * 2;
        const bonusHits = Math.floor(consumedMp / 2);
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `魔力变化（${label}【${card.name}】）`);
        }
        extraHitCount += bonusHits;
        log(`<span class="text-blue-300">${label}【${card.name}】额外消耗 ${consumedMp} 点魔力，追加 ${bonusHits} 次攻击</span>`);
      }
      if (card.id === 'enemy_muxinlan_unstable_reagent') {
        const availableMp = Math.min(20, Math.max(0, Math.floor(attacker.mp)));
        const consumedMp = Math.floor(availableMp / 2) * 2;
        const bonusHits = Math.floor(consumedMp / 2);
        if (consumedMp > 0) {
          changeManaWithShock(source, -consumedMp, `魔力变化（${label}【${card.name}】）`);
        }
        extraHitCount += bonusHits;
        log(`<span class="text-blue-300">${label}【${card.name}】额外消耗 ${consumedMp} 点魔力，追加 ${bonusHits} 次攻击</span>`);
      }
      if (card.id === 'modao_arcane_lance' && attacker.mp >= 8) {
        const canConsume = spendManaWithShock(source, 4, `魔力变化（${label}【${card.name}】额外结算）`);
        if (canConsume) {
          extraHitCount += 1;
          arcaneLanceBonusHit = true;
          log(`<span class="text-blue-300">${label}【${card.name}】额外消耗4点魔力，追加一次2倍伤害</span>`);
        }
      }
      if (card.id === 'enemy_selina_dimension_strip' && attacker.mp >= 4) {
        const canConsume = spendManaWithShock(source, 4, `魔力变化（${label}【${card.name}】额外结算）`);
        if (canConsume) {
          extraHitCount += 1;
          log(`<span class="text-blue-300">${label}【${card.name}】额外消耗4点魔力，再结算一次</span>`);
        }
      }
      if (card.id === 'system_shadow_暗器连发' && source === 'player') {
        const battleDeck = [
          ...combatState.value.playerDeck,
          ...combatState.value.playerHand,
          ...combatState.value.discardPile,
        ];
        const dodgeCount = battleDeck.filter(entry => entry.type === CardType.DODGE).length;
        extraHitCount += Math.min(4, dodgeCount);
      }
      if (card.id === PORTED_CARD.TRACKING_MISSILE) {
        const rolledHits = 3 + Math.floor(Math.random() * 4);
        extraHitCount += Math.max(0, rolledHits - baseHitCount);
        log(`<span class="text-blue-300">${label}【${card.name}】本次追踪 ${rolledHits} 次。</span>`);
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

      if (card.id === 'system_wealth_地震') {
        const armorStacks = getEffectStacks(defender, ET.ARMOR);
        const removed = Math.min(armorStacks, Math.max(0, Math.floor(finalPoint)));
        if (removed > 0) {
          reduceEffectStacks(defender, ET.ARMOR, removed);
          log(`<span class="text-yellow-300">${label}【${card.name}】移除了对方 ${removed} 点护甲。</span>`);
        }
      }
      if (card.id === 'system_wealth_黄金镐' && source === 'player') {
        changeSystemGold(5);
      }

      let modaoMagicSwordTotalDamage = 0;
      let totalActualDamageDealt = 0;
      let goldenVortexBleedApplied = 0;
      for (let hit = 0; hit < totalHitCount; hit++) {
        // Attack card: calculate damage through the full pipeline
        let cardForCalculation = card;
        const manaDeltaBonus = card.id === 'modao_magic_delta'
          ? Math.abs(Math.max(0, Math.floor(attacker.mp)) - Math.max(0, Math.floor(previousTurnManaSnapshot.value[source] ?? 0)))
          : 0;
        const customDamage =
          card.id === SIN_CARD_ID.GLUTTONY
            ? Math.floor(finalPoint * getSinGluttonyMultiplier())
            : card.id === 'burn_scorch_wind'
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
              : card.id === 'system_shadow_背刺' && defender.hp >= defender.maxHp
                ? Math.floor(finalPoint * 2)
              : card.id === 'system_shadow_影之眼'
                ? 1 + getEffectStacks(attacker, ET.DAMAGE_BOOST) * 2
              : card.id === 'system_wealth_水晶之镰'
                ? Math.floor(finalPoint + getEffectStacks(attacker, ET.ARMOR))
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
          || card.id === 'enemy_holy_water_sprite_farewell_light'
          || card.id === 'system_destruction_腐蚀钢钉'
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
        if (card.id === 'system_shadow_影之眼' && !isTrueDamage) {
          damage += getEffectStacks(defender, ET.VULNERABLE) * 2;
        }
        if (
          source === 'player'
          && !isTrueDamage
          && spiderVulnerableBoostTurn.value === combatState.value.turn
          && getActiveRelicCount('system_corruption_relic_06') > 0
        ) {
          const spiderBonus = getEffectStacks(defender, ET.VULNERABLE);
          if (spiderBonus > 0) {
            damage += spiderBonus;
            logRelicMessage(`[蜘蛛] 敌方使用了闪避牌，本次敏感加伤翻倍（+${spiderBonus}）。`);
          }
        }
        if (systemCardTurnFlags.value[defenderSide].system_destruction_repel) {
          damage = Math.floor(damage * 0.5);
        }
        if (systemCardTurnFlags.value[defenderSide]['system_destruction_压缩饼干']) {
          damage = Math.max(0, damage - 1);
        }
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
        await playCardHitLeadIn(defender, cardForCalculation);
        const { actualDamage, logs: applyLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
          defenderSide,
          defender,
          adjustedDamage,
          isTrueDamage,
          `卡牌【${card.name}】`,
          { sourceSide: source, isDirectDamage: true, card: cardForCalculation },
        );
        cardHitLeadIn = null;
        const hitPrefix = totalHitCount > 1 ? `第${hit + 1}段` : '';
        const damageLogColorClass = isTrueDamage ? 'text-zinc-500' : 'text-red-400';
        log(`${label}【${card.name}】${hitPrefix}点数${finalPoint}，造成 <span class="${damageLogColorClass} font-bold">${actualDamage}</span> 点伤害`);
        const armorBlocked =
          actualDamage <= 0
          && !isTrueDamage
          && adjustedDamage > 0
          && barrierBeforeHit <= 0
          && armorBeforeHit > 0
          && applyLogs.some(applyLog => applyLog.startsWith('[护甲]'));
        if (actualDamage > 0 || armorBlocked) {
          const damageKind: FloatingNumberKind = isTrueDamage
            ? 'true'
            : (card.type === CardType.MAGIC ? 'magic' : 'physical');
          pushFloatingNumber(defenderSide, actualDamage, damageKind, '-', {
            allowZero: armorBlocked,
            damageBeforeLimit,
          });
        }
        if (card.id === 'modao_magic_sword' && actualDamage > 0) {
          modaoMagicSwordTotalDamage += actualDamage;
        }
        if (actualDamage > 0) {
          totalActualDamageDealt += actualDamage;
        }
        if (card.id === 'enemy_abyss_shoal_lingchi' && actualDamage > 0) {
          const { healed } = healForSide(source, actualDamage, {
            sourceSide: source,
            reason: `卡牌【${card.name}】吸血`,
          });
          log(`<span class="text-green-300">${label}【${card.name}】第${hit + 1}段造成伤害，回复 ${healed} 点生命。</span>`);
        }
        if (source === 'enemy' && card.id === 'enemy_penitent_angel_holy_script' && actualDamage > 0) {
          aiFlags.penitentAngelHolyScriptHit = true;
        }
        if (card.id === 'enemy_stigmata_butterfly_swarm_dance' && actualDamage > 0) {
          triggerStigmataDamageForSide(defenderSide, `被【${card.name}】第${hit + 1}段造成伤害后触发`);
        }

        if (actualDamage > 0) {
          if (systemCardTurnFlags.value[defenderSide]['system_wealth_榴莲']) {
            const reflected = Math.max(0, Math.floor(thornShellReflectPoint.value[defenderSide]));
            if (reflected > 0) {
              const reflectedResult = applyDamageToSideWithRelics(
                source,
                attacker,
                reflected,
                false,
                `卡牌【${card.name}】反击`,
                { sourceSide: defenderSide, isDirectDamage: true },
              );
              if (reflectedResult.actualDamage > 0) {
                pushFloatingNumber(source, reflectedResult.actualDamage, 'physical', '-');
              }
              log(`<span class="text-yellow-300">${defenderLabel}【荆棘甲壳】反击，造成 ${reflectedResult.actualDamage} 点物理伤害。</span>`);
            }
          }
          const thornStacks = getEffectStacks(defender, ET.THORNS);
          if (thornStacks > 0) {
            let reflectedDamage = Math.max(0, thornStacks);
            if (source === 'player') {
              reflectedDamage = applyPlayerSkinMarkDamageReduction(reflectedDamage, '荆棘反弹');
            }
            if (reflectedDamage > 0) {
              const attackerArmorBeforeReflect = getEffectStacks(attacker, ET.ARMOR);
              const attackerBarrierBeforeReflect = getEffectStacks(attacker, ET.BARRIER);
              const { actualDamage: actualReflectedDamage, logs: reflectedLogs, damageBeforeLimit: reflectedDamageBeforeLimit } = applyDamageToSideWithRelics(
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
                  damageBeforeLimit: reflectedDamageBeforeLimit,
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
        if (coldBeforeConsume > getEffectStacks(attacker, ET.COLD)) presentEffect(attacker, 'cold');
        if (source === 'enemy' && coldBeforeConsume > 0) {
          const ghostBoneCount = getActiveRelicCount('yanhan_ghost_bone');
          const ghostBoneDamage = Math.floor(coldBeforeConsume / 3) * ghostBoneCount;
          if (ghostBoneDamage > 0) {
            const { actualDamage: ghostBoneActualDamage } = applyDamageToSideWithRelics('enemy', enemyStats.value, ghostBoneDamage, true, '幽灵骨', {
              sourceSide: 'player',
              isDirectDamage: true,
            });
            if (ghostBoneActualDamage > 0) {
              pushFloatingNumber('enemy', ghostBoneActualDamage, 'true', '-', { targetEntity: enemyStats.value });
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
        if (source === 'player' && isLeviathanBattle && card.swarmAttack) {
          const splashTargets = getLeviathanTeamEntities().filter(entity => entity !== defender && entity.hp > 0);
          for (const splashTarget of splashTargets) {
            const splashDamageResult = calculateFinalDamage({
              finalPoint,
              card: cardForCalculation,
              attackerEffects: attackerEffectsForDamage,
              defenderEffects: splashTarget.effects,
              relicModifiers: NO_RELIC_MOD,
              isTrueDamage: forceTrueDamage,
            });
            const splashArmorBefore = getEffectStacks(splashTarget, ET.ARMOR);
            const splashBarrierBefore = getEffectStacks(splashTarget, ET.BARRIER);
            const { actualDamage: splashActualDamage, logs: splashApplyLogs, damageBeforeLimit: splashDamageBeforeLimit } = applyDamageToSideWithRelics(
              'enemy',
              splashTarget,
              splashDamageResult.damage,
              splashDamageResult.isTrueDamage,
              `卡牌【${card.name}】群攻`,
              { sourceSide: 'player', isDirectDamage: true, card: cardForCalculation },
            );
            const splashArmorBlocked =
              splashActualDamage <= 0
              && !splashDamageResult.isTrueDamage
              && splashDamageResult.damage > 0
              && splashBarrierBefore <= 0
              && splashArmorBefore > 0
              && splashApplyLogs.some(applyLog => applyLog.startsWith('[护甲]'));
            if (splashActualDamage > 0 || splashArmorBlocked) {
              pushFloatingNumber('enemy', splashActualDamage, splashDamageResult.isTrueDamage ? 'true' : (card.type === CardType.MAGIC ? 'magic' : 'physical'), '-', {
                allowZero: splashArmorBlocked,
                targetEntity: splashTarget,
                damageBeforeLimit: splashDamageBeforeLimit,
              });
            }
            if (splashActualDamage > 0) {
              totalActualDamageDealt += splashActualDamage;
            }
            log(`<span class="text-red-300">我方【${card.name}】群攻波及敌方单位，造成 ${splashActualDamage} 点伤害。</span>`);
            for (const splashLog of splashDamageResult.logs) {
              if (splashLog.startsWith('原始伤害:')) continue;
              log(`<span class="text-gray-500 text-[9px]">${splashLog}</span>`);
            }
            for (const splashLog of splashApplyLogs) {
              const normalized = splashLog.startsWith('受到') ? `敌方${splashLog}` : splashLog;
              log(`<span class="text-gray-500 text-[9px]">${normalized}</span>`);
            }
          }
          removeDefeatedLeviathanSummons();
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
        applyHitAttachEffects(source, card, attacker, defenderSide, { allowPoisonAttach: hit === 0 });
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
        if (card.id === 'enemy_abyss_shoal_golden_vortex' && actualDamage > 0) {
          const applied = applyStatusEffectWithRelics(defenderSide, ET.BLEED, 1, {
            source: card.id,
            lockDecayThisTurn: true,
          });
          if (applied) {
            goldenVortexBleedApplied += 1;
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
      if (card.id === 'enemy_abyss_shoal_golden_vortex') {
        if (goldenVortexBleedApplied > 0) {
          log(`<span class="text-rose-300">${label}【${card.name}】命中后施加了 ${goldenVortexBleedApplied} 层流血。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】未造成生命伤害，未施加流血。</span>`);
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
        const manaResult = changeManaWithShock(source, modaoMagicSwordTotalDamage, `魔力变化（${label}【${card.name}】）`, {
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
      if (card.id === 'system_corruption_蚀骨之刺') {
        const vulnerableStacks = Math.max(0, Math.floor(getEffectStacks(defender, ET.VULNERABLE)));
        if (vulnerableStacks > 0 && applyStatusEffectWithRelics(defenderSide, ET.POISON_AMOUNT, vulnerableStacks, { source: card.id, sourceSide: source })) {
          log(`<span class="text-emerald-300">${label}【${card.name}】按${defenderLabel}敏感层数施加 ${vulnerableStacks} 层中毒量。</span>`);
        }
      }
      if (card.id === 'system_corruption_毒绽') {
        const reduction = Math.floor(Math.max(0, getEffectStacks(defender, ET.POISON_AMOUNT)) / 2);
        const maxHpBefore = defender.maxHp;
        if (reduction > 0 && applyStatusEffectWithRelics(defenderSide, ET.MAX_HP_REDUCTION, reduction, { source: card.id, sourceSide: source })) {
          log(`<span class="text-emerald-300">${label}【${card.name}】使${defenderLabel}生命上限 -${Math.max(0, maxHpBefore - defender.maxHp)}。</span>`);
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】${defenderLabel}中毒量不足，未削减生命上限。</span>`);
        }
      }
      if (card.id === 'system_corruption_毒素催化') {
        const bonus = Math.floor(Math.max(0, getEffectStacks(defender, ET.POISON_AMOUNT)) / 2);
        if (bonus > 0 && applyStatusEffectWithRelics(defenderSide, ET.POISON_AMOUNT, bonus, { source: card.id, sourceSide: source })) {
          log(`<span class="text-emerald-300">${label}【${card.name}】催化：额外施加 ${bonus} 层中毒量。</span>`);
        }
      }
      if (card.id === 'system_shadow_处决' && defender.hp > 0) {
        const executeDamage = Math.floor(getLostHp(defender) * 0.2);
        if (executeDamage > 0) {
          const { actualDamage } = applyDamageToSideWithRelics(
            defenderSide,
            defender,
            executeDamage,
            true,
            `卡牌【${card.name}】处决`,
            { sourceSide: source, isDirectDamage: true },
          );
          if (actualDamage > 0) pushFloatingNumber(defenderSide, actualDamage, 'true', '-', { targetEntity: defender });
          log(`<span class="text-indigo-300">${label}【${card.name}】处决：额外造成 ${actualDamage} 点真实伤害。</span>`);
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
          const manaResult = changeManaWithShock(source, manaGain, `魔力变化（${label}【${card.name}】）`, {
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
      if (card.id === PORTED_CARD.FROST_FIRE_FLOWER) {
        const burnStacks = Math.max(0, getEffectStacks(defender, ET.BURN));
        const coldStacks = Math.max(0, getEffectStacks(defender, ET.COLD));
        if (burnStacks < coldStacks) {
          applyStatusEffectWithRelics(defenderSide, ET.BURN, coldStacks - burnStacks, { source: card.id });
        } else if (coldStacks < burnStacks) {
          applyStatusEffectWithRelics(defenderSide, ET.COLD, burnStacks - coldStacks, { source: card.id });
        }
        const extraStacks = Math.max(0, Math.floor(finalPoint * 0.5));
        const extraType = Math.random() < 0.5 ? ET.BURN : ET.COLD;
        if (extraStacks > 0) {
          applyStatusEffectWithRelics(defenderSide, extraType, extraStacks, { source: card.id });
        }
        log(`<span class="text-orange-300">${label}【${card.name}】使对手燃烧与寒冷持平（${burnStacks}/${coldStacks} → ${Math.max(burnStacks, coldStacks)}），并额外施加 ${extraStacks} 层${extraType === ET.BURN ? '燃烧' : '寒冷'}</span>`);
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
      if (card.id === 'enemy_penitent_ghost_experience_infusion') {
        const pleasureStacks = Math.max(0, getEffectStacks(attacker, ET.PLEASURE));
        if (pleasureStacks > 0) {
          removeEffect(attacker, ET.PLEASURE);
          const convertedStacks = Math.floor(pleasureStacks / 2);
          if (convertedStacks > 0) {
            applyStatusEffectWithRelics(defenderSide, ET.ORGASM, convertedStacks, { source: card.id });
            applyStatusEffectWithRelics(defenderSide, ET.STIGMATA, convertedStacks, { source: card.id });
            log(`<span class="text-fuchsia-300">${label}【${card.name}】移除了自身 ${pleasureStacks} 层欢愉，并为${defenderLabel}施加 ${convertedStacks} 层性兴奋与 ${convertedStacks} 层圣痕。</span>`);
          } else {
            log(`<span class="text-gray-400">${label}【${card.name}】移除了自身 ${pleasureStacks} 层欢愉，不足 2 层，未施加性兴奋与圣痕。</span>`);
          }
        } else {
          log(`<span class="text-gray-400">${label}【${card.name}】自身没有欢愉可转化。</span>`);
        }
      }
      finalizeAndTrack();
    } else if (source === 'enemy' && card.id === 'enemy_leviathan_reincarnation_vortex') {
      if (getDamageHitTakenThisTurn('enemy') <= 0) {
        const targetSummon = getAliveLeviathanSummons()
          .sort((a, b) => (a.stats.hp / Math.max(1, a.stats.maxHp)) - (b.stats.hp / Math.max(1, b.stats.maxHp)))[0] ?? null;
        if (targetSummon) {
          const healAmount = Math.max(1, Math.floor(targetSummon.stats.maxHp * 0.3));
          const healed = healLeviathanEntityDirect(targetSummon.stats, healAmount);
          if (healed > 0) {
            pushFloatingNumber('enemy', healed, 'heal', '+', { targetEntity: targetSummon.stats });
          }
          log(`<span class="text-emerald-300">利维坦【${card.name}】触发：为生命最低的【${targetSummon.name}】回复 ${healed} 点生命。</span>`);
        } else {
          log(`<span class="text-gray-400">利维坦【${card.name}】没有可治疗的召唤物。</span>`);
        }
      } else {
        log(`<span class="text-gray-400">利维坦【${card.name}】未触发：本回合己方已经受到伤害。</span>`);
      }
      finalizeAndTrack();
    } else if (card.id === 'enemy_othello_star_hidden') {
      applyCardEffects();
      finalizeAndTrack();
    } else {
      if (card.type === CardType.DODGE && (
        !shouldClash
        || card.id === 'enemy_penitent_ghost_into_mirror'
      )) {
        applyCardEffects();
      }
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
      || resolvedPlayerCard.id === 'system_shadow_雾中人'
    ))
      ? Math.max(0, getCardPreviewPoint('player', resolvedPlayerCard, resolvedPlayerDice))
      : 0;
    const enemySuppress = (eSuccess && (
      resolvedEnemyCard.id === 'basic_point_suppress'
      || resolvedEnemyCard.id === 'basic_weak_magic'
      || resolvedEnemyCard.id === 'system_shadow_雾中人'
    ))
      ? Math.max(0, getCardPreviewPoint('enemy', resolvedEnemyCard, resolvedEnemyDice))
      : 0;

    if (playerSuppress > 0 && resolvedEnemyCard.id !== PASS_CARD.id) {
      const before = resolvedEnemyDice;
      setResolvedEnemyDice(resolvedEnemyDice - playerSuppress);
      const reduced = Math.max(0, before - resolvedEnemyDice);
      if (reduced > 0) {
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

  const isSameUtilityCardType = queue.length === 2
    && queue[0].type === queue[1].type
    && (queue[0].type === CardType.DODGE || queue[0].type === CardType.FUNCTION);

  queue.sort((a, b) => {
    const priorityDelta = typePriority(b.type) - typePriority(a.type);
    if (priorityDelta !== 0) return priorityDelta;
    if (isSameUtilityCardType && a.source !== b.source) {
      return a.source === 'player' ? -1 : 1;
    }
    return 0;
  });

  const markEnemyResolvedCardType = (card: CardData) => {
    const nextType = card.id === PASS_CARD.id ? null : card.type;
    if (leviathanActingSummon.value) {
      leviathanActingSummon.value.previousCardType = nextType;
      if (card.id !== PASS_CARD.id) {
        markLeviathanSummonActionOpportunityUsed(leviathanActingSummon.value);
      }
    } else {
      previousEnemyLastCardType.value = nextType;
    }
  };

  const executeActionWithMagicEcho = async (action: ActionEntry) => {
    const executeCardWithEnemySelfLock = async (
      executeOptions: { skipManaCost?: boolean; manaCostAlreadyPaid?: boolean } = {},
    ) => {
      const previousSelfOverride = leviathanEnemySelfOverride.value;
      if (action.source === 'enemy' && leviathanActingSummon.value) {
        leviathanEnemySelfOverride.value = leviathanActingSummon.value.stats;
      }
      try {
        await executeCard(action.source, action.card, action.baseDice, executeOptions);
      } finally {
        leviathanEnemySelfOverride.value = previousSelfOverride;
      }
    };

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
    await executeCardWithEnemySelfLock({
      skipManaCost: action.magicManaPaidOnPlay,
      manaCostAlreadyPaid: action.magicManaPaidOnPlay,
    });
    if (action.source === 'enemy') {
      markEnemyResolvedCardType(action.card);
    }
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
      logRelicMessage(`[黑丝] 本回合第一张连击牌【${action.card.name}】额外结算一次。`);
      await wait(320);
      if (endCombatPending.value) return;
      await executeCardWithEnemySelfLock({ skipManaCost: action.type === CardType.MAGIC });
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
            logRelicMessage(`[循环针] 返还 ${restored} 点魔力。`);
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
    await executeCardWithEnemySelfLock({ skipManaCost: skipExtraManaCost });
    if (action.source === 'enemy') {
      markEnemyResolvedCardType(action.card);
    }
  };

  const executeLeviathanEnemyUnitAction = async (
    card: CardData,
    baseDice: number,
    summon: LeviathanSummonRuntime | null,
  ) => {
    if (card.id === PASS_CARD.id || endCombatPending.value) return;
    const previousTargetOverride = leviathanEnemyTargetOverride.value;
    const previousSourceOverride = leviathanEnemySourceOverride.value;
    const previousSelfOverride = leviathanEnemySelfOverride.value;
    const previousSummon = leviathanActingSummon.value;
    if (summon) {
      leviathanEnemyTargetOverride.value = summon.stats;
      leviathanEnemySourceOverride.value = summon.stats;
      leviathanEnemySelfOverride.value = summon.stats;
      leviathanActingSummon.value = summon;
      if (
        leviathanEcologicalRhythmActive.value
        && (card.type === CardType.PHYSICAL || card.type === CardType.MAGIC)
        && applyEffect(enemyStats.value, ET.GENESIS, 1, { source: 'enemy_leviathan_ecological_rhythm' })
      ) {
        log(`<span class="text-violet-300">利维坦[生态律动] ${summon.name}打出${card.type}牌，创世 +1（当前 ${getEffectStacks(enemyStats.value, ET.GENESIS)}）。</span>`);
      }
    } else {
      leviathanEnemyTargetOverride.value = null;
      leviathanEnemySourceOverride.value = null;
      leviathanEnemySelfOverride.value = null;
      leviathanActingSummon.value = null;
    }
    try {
      await executeActionWithMagicEcho({
        source: 'enemy',
        card,
        type: card.type,
        baseDice,
        magicManaPaidOnPlay: false,
      });
      if (summon) {
        summon.previousCardType = card.id === PASS_CARD.id ? null : card.type;
      } else {
        previousEnemyLastCardType.value = card.id === PASS_CARD.id ? null : card.type;
      }
    } finally {
      leviathanEnemyTargetOverride.value = previousTargetOverride;
      leviathanEnemySourceOverride.value = previousSourceOverride;
      leviathanEnemySelfOverride.value = previousSelfOverride;
      leviathanActingSummon.value = previousSummon;
    }
  };

  const executeLeviathanRemainingActions = async () => {
    if (!isLeviathanBattle || leviathanSummonActionsResolvedTurn.value === combatState.value.turn) return;
    leviathanSummonActionsResolvedTurn.value = combatState.value.turn;

    if (
      leviathanDeferredBodyCard
      && leviathanDeferredBodyCard.id !== PASS_CARD.id
      && enemyStats.value.hp > 0
    ) {
      log(`<span class="text-violet-300">利维坦本体【${leviathanDeferredBodyCard.name}】开始正常结算。</span>`);
      await executeLeviathanEnemyUnitAction(leviathanDeferredBodyCard, leviathanDeferredBodyDice, null);
      if (endCombatPending.value || playerStats.value.hp <= 0) return;
      await wait(630);
    }

    const alreadyResolvedSummonId = leviathanSelectedSummonForClash?.id ?? null;
    for (const summon of getAliveLeviathanSummons()) {
      if (endCombatPending.value || playerStats.value.hp <= 0) return;
      if (summon.id === alreadyResolvedSummonId) continue;
      const intent = summon.intentCard ?? PASS_CARD;
      if (intent.id === PASS_CARD.id) continue;
      log(`<span class="text-violet-300">召唤物【${summon.name}】的【${intent.name}】开始结算。</span>`);
      await executeLeviathanEnemyUnitAction(intent, summon.baseDice, summon);
      removeDefeatedLeviathanSummons();
      if (endCombatPending.value || playerStats.value.hp <= 0) return;
      await wait(630);
    }
  };

  const shouldRunSimultaneousVisuals = (
    queue.length === 2
    && !isSameUtilityCardType
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

  if (resolvedPlayerCard.id !== PASS_CARD.id && resolvedPlayerCard.sin) {
    applySinCardAfterPlay(resolvedPlayerCard, resolvedPlayerDice);
    if (endCombatPending.value || playerStats.value.hp <= 0) return;
  }

  // 连击：本次打出后，若带 draw 则补抽 1 张；并允许继续从剩余手牌出牌
  if (resolvedPlayerCard.traits.combo) {
    if (resolvedPlayerCard.traits.draw || getActiveRelicCount('alchemy_white_silk') > 0) {
      const { drawn, newDeck, newDiscard } = drawCards(1, combatState.value.playerDeck, combatState.value.discardPile);
      applyOnDrawCardEffects(drawn);
      markDrawnCardsAnimation(drawn);
      combatState.value.playerDeck = newDeck;
      combatState.value.discardPile = newDiscard;
      combatState.value.playerHand = mergePlayerHandWithDrawnCards(combatState.value.playerHand, drawn);
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

  await executeLeviathanRemainingActions();
  if (endCombatPending.value) return;
  removeDefeatedLeviathanSummons();
  resolveLeviathanTidalLockCheckIfPending();

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
    const { actualDamage, damageBeforeLimit } = applyDamageToSideWithRelics('enemy', enemyStats.value, 4 * parryShieldCount, false, '招架盾', {
      sourceSide: 'player',
      isDirectDamage: true,
    });
    if (actualDamage > 0) {
      pushFloatingNumber('enemy', actualDamage, 'physical', '-', { targetEntity: enemyStats.value, damageBeforeLimit });
    }
    logRelicMessage(`[招架盾] 回合结束护甲 ${playerArmorBeforeEnd}，造成 ${actualDamage} 点伤害。`);
  }
  const drainRuneCount = getActiveRelicCount('modao_drain_rune');
  if (drainRuneCount > 0 && enemyStats.value.mp > playerStats.value.mp) {
    const drainedResult = changeManaWithShock('enemy', -drainRuneCount, '汲取符文');
    const drained = Math.max(0, -drainedResult.actualDelta);
    const restored = restoreManaForSide('player', drained);
    if (drained > 0 || restored > 0) {
      logRelicMessage(`[汲取符文] 汲取 ${drained} 点魔力，回复 ${restored} 点魔力。`);
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
  if (sinGluttonyDrainPercent.value > 0 && playerStats.value.hp > 0) {
    const drain = Math.floor((Math.max(0, playerStats.value.hp) * sinGluttonyDrainPercent.value) / 100);
    if (drain > 0) {
      const lost = applyDirectHpLossWithRelics('player', playerStats.value, drain, '原罪·暴食');
      if (lost > 0) pushFloatingNumber('player', lost, 'true', '-');
      log(`<span class="text-rose-400">【原罪·暴食】饥饿反噬，回合结束受到 ${lost} 点真实伤害。</span>`);
    }
  }
  const gluttonyBookCount = getActiveRelicCount(PORTED_RELIC_ID.GLUTTONY_BOOK);
  if (gluttonyBookCount > 0 && playerStats.value.hp > 0) {
    const drain = Math.floor(Math.max(0, playerStats.value.hp) * 0.2 * gluttonyBookCount);
    if (drain > 0) {
      const lost = applyDirectHpLossWithRelics('player', playerStats.value, drain, '暴食之书');
      if (lost > 0) pushFloatingNumber('player', lost, 'true', '-');
      logRelicMessage(`[暴食之书] 回合结束，受到 ${lost} 点真实伤害。`);
    }
  }
  const whiteCrystalState = getRelicRuntimeState('system_wealth_relic_02');
  const playerSkipArmorDecay = armorDecaySkippedThisTurn.value.player || whiteCrystalState.skipArmorDecay === true;
  whiteCrystalState.skipArmorDecay = false;
  const enemySkipArmorDecay = armorDecaySkippedThisTurn.value.enemy;
  const enemyPoisonStacksBeforeEnd = Math.max(0, getEffectStacks(enemyStats.value, ET.POISON));
  const playerPoisonStacksBeforeEnd = Math.max(0, getEffectStacks(playerStats.value, ET.POISON));
  processLustIllusionTurnEndForSide('player');
  processLustIllusionTurnEndForSide('enemy');
  bridgeHolyWaterJellyfishPortraitHiddenForRefresh();
  const currentTurn = combatState.value.turn;
  const enemyPoisonSkipped = poisonSkipTurn.value.enemy === currentTurn;
  const pEndLogs = processOnTurnEnd(playerStats.value, {
    poisonAffectedByVulnerable: poisonVulnerableTurn.value.player === currentTurn,
    skipPoison: poisonSkipTurn.value.player === currentTurn,
  });
  const scorpionActive = getActiveRelicCount('system_corruption_relic_05') > 0 && currentTurn >= 4;
  const eEndLogs = processOnTurnEnd(enemyStats.value, {
    poisonAffectedByVulnerable: scorpionActive || poisonVulnerableTurn.value.enemy === currentTurn,
    poisonMultiplier: spiderPoisonBoostTurn.value === currentTurn && getActiveRelicCount('system_corruption_relic_06') > 0 ? 1.5 : 1,
    skipPoison: enemyPoisonSkipped,
  });
  // 回合结束触发中毒（中毒层数转化为中毒量）时播放中毒特效
  if (playerPoisonStacksBeforeEnd > 0 && poisonSkipTurn.value.player !== currentTurn) presentEffect(playerStats.value, 'poison');
  if (enemyPoisonStacksBeforeEnd > 0 && !enemyPoisonSkipped) presentEffect(enemyStats.value, 'poison');
  // 中毒层数刚转化为中毒量：曼陀罗按新的中毒量调整虚弱
  syncDaturaWeaken();
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
  if (paintingCount > 0 && enemyPoisonStacksBeforeEnd > 0 && !enemyPoisonSkipped && enemyStats.value.hp > 0) {
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
  if (isLeviathanBattle) {
    for (const summon of getAliveLeviathanSummons()) {
      processLeviathanSummonTurnEnd(summon);
    }
    removeDefeatedLeviathanSummons();
  }
  insertBehemothFoodIntoPlayerDiscard();
  forEachPlayerRelic((entry, relic, state) => {
    state.skippedTurn = resolvedPlayerCard.id === PASS_CARD.id;
    state.clashFailed = systemPreviousClashLoss.value.player;
  });
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
      const { actualDamage, logs: dollApplyLogs, damageBeforeLimit } = applyDamageToSideWithRelics(
        'enemy',
        enemyStats.value,
        dollDamage,
        dollIsTrueDamage,
        '魔法玩偶',
        { sourceSide: 'player', isDirectDamage: true, card: MAGIC_DOLL_DAMAGE_CARD },
      );
      if (actualDamage > 0) {
        pushFloatingNumber('enemy', actualDamage, 'magic', '-', { targetEntity: enemyStats.value, damageBeforeLimit });
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

  processRuneShiftTurnEnd();
  processGaiaTurnEnd();

  // Cleanup
  const handBeforeCleanup = [...combatState.value.playerHand];
  const retainedCards = handBeforeCleanup.filter(card => card.traits.retain);
  const discardingCards = handBeforeCleanup.filter(card => !card.traits.retain);
  await playCardsToDiscardAnimation(discardingCards);
  combatState.value.discardPile = [...combatState.value.discardPile, ...discardingCards];
  combatState.value.playerHand = mergePlayerHandWithDrawnCards(retainedCards, []);
  resetTwinTurnSelections();
  const resolvedTurn = combatState.value.turn;
  combatState.value.turn += 1;
  combatState.value.phase = CombatPhase.TURN_START;
  emit('turnResolved', resolvedTurn);
  } catch (error) {
    console.error('[resolveCombat] error', error);
    stopAllCardAnimations();
    clearDicePreview();
    combatState.value.phase = CombatPhase.PLAYER_INPUT;
    log(`<span class="text-red-400">???????${error instanceof Error ? error.message : String(error)}</span>`);
  } finally {
    unlockCardManaCost(pCard);
    unlockCardManaCost(playerCardWithLockedManaCost);
    unlockCardManaCost(eCard);
    leviathanEnemyTargetOverride.value = previousEnemyTargetOverride;
    leviathanEnemySourceOverride.value = previousEnemySourceOverride;
    leviathanEnemySelfOverride.value = previousEnemySelfOverride;
    leviathanActingSummon.value = previousActingSummon;
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
  battleFeedback.stop();
  battleResultBanner.value = outcome;
  combatState.value.phase = outcome === 'win' ? CombatPhase.WIN : CombatPhase.LOSE;

  await wait(RESULT_BANNER_STAY_MS);
  if (token !== endCombatSequenceToken) return;
  const finalPlayerStats = cloneEntityStats(playerStats.value);
  finalPlayerStats.effects = finalPlayerStats.effects.filter(effect => (
    effect.polarity !== 'scene' && effect.source !== 'scene:corridor' && effect.source !== 'battle:gaia'
  ));
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
  if (outcome === 'win') {
    const greedBookCount = getActiveRelicCount('system_wealth_relic_15');
    if (greedBookCount > 0) pendingAlchemyGoldDelta.value += 5 * greedBookCount;
  }
  emit(
    'endCombat',
    outcome,
    finalPlayerStats,
    [...combatState.value.logs],
    [...pendingCardNegativeEffects.value],
    pendingAlchemyGoldDelta.value,
    [...consumedRelicIdsThisBattle.value],
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

watch(
  () => playerStats.value.maxDice,
  maxDice => {
    if (maxDice >= 8) emit('playerMaxDiceThresholdReached');
  },
  { immediate: true },
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

    if (pHp <= 0 && (tryTriggerCrossNecklaceRevive() || tryTriggerEventDollRevive())) return;

    let outcome: CombatOutcome | null = null;
    if (pHp <= 0) outcome = 'lose';
    else if (eHp <= 0) outcome = 'win';
    if (outcome === null) return;

    endCombatPending.value = true;
    void runEndCombatSequence(outcome);
  },
);

// 记录我方复活触发的回合（生命锁：复活回合免伤）
watch(
  () => getEffectStacks(playerStats.value, ET.INDOMITABLE)
    + getEffectStacks(playerStats.value, ET.BLOOD_COCOON)
    + getEffectStacks(playerStats.value, ET.SWARM),
  (next, prev) => {
    if (next < prev) markPlayerReviveTurn();
  },
);
</script>

<style scoped>
.combat-settings-panel { width: 256px; margin-top: 6px; padding: 16px; border: 1px solid #716249; border-radius: 6px; background: #151b18f5; box-shadow: 0 14px 36px #0009; color: #d8dcdb; }
.combat-settings-title { margin: 0 0 12px; padding-bottom: 10px; border-bottom: 1px solid #ffffff12; font-size: 12px; font-weight: 500; color: #cfbc91; letter-spacing: 0; }
.combat-settings-speed { display: flex; align-items: center; justify-content: space-between; min-height: 36px; font-size: 12px; }
.combat-settings-speed-value { margin-left: 5px; color: #83948a; font-size: 11px; }
.combat-settings-speed input { appearance: none; position: relative; width: 40px; height: 22px; border: 1px solid #505956; border-radius: 12px; background: #2b3331; cursor: pointer; }
.combat-settings-speed input::after { content: ''; position: absolute; left: 3px; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: #8c9892; transition: transform 160ms; }
.combat-settings-speed input:checked { border-color: #8eae99; background: #335341; }
.combat-settings-speed input:checked::after { transform: translateX(18px); background: #c5e1cc; }
.combat-settings-speed input:focus-visible { outline: 2px solid #c6ae76; outline-offset: 4px; }
.combat-settings-fullscreen { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 12px; padding: 8px; border: 1px solid #4a504a; border-radius: 4px; background: #202623; color: #d2d4c8; font-size: 12px; }
.combat-settings-fullscreen:hover { border-color: #c6ae76; }
.combat-scene-effects {
  position: absolute; z-index: 45; top: 1.2rem; left: calc(50% + 3rem);
  max-width: calc(50% - 4rem); display: flex; gap: 7px;
  overflow-x: auto; overflow-y: hidden; padding: 3px 4px 7px; margin: -3px 0 0 -4px;
  scrollbar-width: none;
}
.combat-scene-effects::-webkit-scrollbar { display: none; }
.combat-root--scene-effects .combat-top-right-panel { top: 5.5rem; }
.combat-scene-effect {
  position: relative; width: 57px; height: 57px; flex: 0 0 57px;
  border: 1px solid #8cddd5; border-radius: 6px; color: #c7f7f0; background: #142f31e6;
  box-shadow: inset 0 0 10px #71c7ba25, 0 2px 8px #0008; font-size: 28.5px;
  animation: pain-scene-arrive 350ms ease-out;
  transition: border-color 180ms, background 180ms, transform 180ms;
}
.combat-scene-effect:hover, .combat-scene-effect:focus-visible {
  transform: translateY(-2px); border-color: #fff0c6; outline: 1px solid #fff0c6; outline-offset: 2px;
}
.combat-scene-effect--oath { background: #3b202fe6; color: #fbd4dc; border-color: #b98998; }
.combat-scene-effect--resonant { border-color: #ead09b; color: #fff0c6; box-shadow: inset 0 0 12px #71c7ba40, 0 0 12px #e3c48b50; }
.combat-scene-effect--triggered {
  animation: pain-scene-trigger 720ms ease-out;
}
.combat-scene-effect__count {
  position: absolute; right: -3px; bottom: -5px; min-width: 20px; padding: 0 3px;
  border: 1px solid #87bbb1; border-radius: 3px; background: #122525; color: #fff4d7;
  font-size: 10px; line-height: 14px; font-variant-numeric: tabular-nums;
}
.pain-loading-overlay, .pain-oath-overlay {
  position: absolute; inset: 0; z-index: 180; display: flex; align-items: center;
  justify-content: center; background: #0d161dea; backdrop-filter: blur(5px);
}
.pain-loading-overlay { flex-direction: column; gap: 16px; color: #d4ebe7; }
.pain-loading-spinner { font-size: 28px; animation: pain-loading-spin 1.2s linear infinite; }
.pain-retry-button { border: 1px solid #92bdb5; border-radius: 6px; padding: 8px 16px; color: #e8f6f0; background: #203936; }
.pain-oath-dialog { width: min(1200px, calc(100% - 32px)); height: min(700px, calc(100% - 32px)); padding: 8px; display: flex; flex-direction: column; }
.pain-oath-dialog__title { flex: 0 0 auto; margin-bottom: 12px; font-size: 24px; line-height: 32px; text-align: center; color: #f4e4c5; }
.pain-oath-options { display: flex; flex: 1; min-height: 0; align-items: center; justify-content: center; gap: 24px; }
.pain-oath-option {
  width: 100%; height: auto; flex: 0 1 calc((100% - 48px) / 3); aspect-ratio: 2 / 3;
  max-width: calc((100% - 48px) / 3); min-width: 0;
  padding: 0; border: 0; background: transparent; cursor: pointer;
  animation: pain-scene-arrive 350ms ease-out;
}
.pain-oath-option :deep(.dungeon-card) { width: 100%; height: 100%; opacity: 1; box-shadow: none; }
.pain-oath-option :deep(.card-face) { left: 26%; right: 26%; }
.pain-oath-option :deep(.card-face-name) { font-size: 22px; max-height: 52px; }
.pain-oath-option :deep(.card-face-emblem) { height: 46px; flex-basis: 46px; }
.pain-oath-option :deep(.card-face-icon) { width: 31px; height: 31px; }
.pain-oath-option :deep(.card-face-rules-surface) { padding: 8px 6px; font-size: 16px; line-height: 1.4; }
.pain-oath-option :deep(.card-frame-skin) { transition: filter 180ms; }
.pain-oath-option:focus-visible { outline: none; }
.pain-oath-option:hover :deep(.card-frame-skin), .pain-oath-option:focus-visible :deep(.card-frame-skin) {
  filter: drop-shadow(0 0 5px #efd08c) drop-shadow(0 0 14px #c08d4760);
}
@keyframes pain-scene-arrive { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pain-scene-trigger {
  0% { transform: scale(1); filter: brightness(1); }
  32% { transform: scale(1.16); filter: brightness(1.8) drop-shadow(0 0 12px #fff0bf); }
  100% { transform: scale(1); filter: brightness(1); }
}
@keyframes pain-loading-spin { to { transform: rotate(360deg); } }
@media (max-width: 800px) {
  .combat-scene-effects { top: 1rem; }
}
@media (prefers-reduced-motion: reduce) {
  .combat-scene-effect, .pain-oath-option { animation: none; transition: none; }
}
.combat-float-number {
  animation-name: combat-float-up;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  line-height: 1;
}

.combat-float-number--limited {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35em;
  white-space: nowrap;
  filter: none;
}

.combat-float-number--limited-original {
  color: #9ca3af;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

.combat-float-number--limited-actual {
  filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.85));
}

.combat-float-number--heal {
  color: #4ade80 !important;
  text-shadow:
    0 0 10px rgba(74, 222, 128, 0.95),
    0 0 22px rgba(34, 197, 94, 0.6);
  -webkit-text-stroke: 0.45px rgba(6, 78, 59, 0.9);
}

.combat-float-number--heavy {
  color: #c084fc !important;
  text-shadow:
    0 0 10px rgba(192, 132, 252, 0.98),
    0 0 24px rgba(168, 85, 247, 0.8);
  -webkit-text-stroke: 0.55px rgba(59, 7, 100, 0.95);
  animation-name: combat-float-heavy-up;
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

.resolved-card-visual-inner--summon.resolved-card-visual-inner--attack {
  animation-name: card-attack-summon-enemy;
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

@keyframes card-attack-summon-enemy {
  0% {
    opacity: 0.96;
    transform: translate3d(0, 0, 0) scale(1);
  }
  42% {
    opacity: 1;
    transform: translate3d(var(--resolved-card-mid-x, -150px), var(--resolved-card-mid-y, -24px), 0) scale(1.03);
  }
  78% {
    opacity: 1;
    transform: translate3d(var(--resolved-card-target-x, -560px), var(--resolved-card-target-y, 310px), 0) scale(0.79);
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--resolved-card-target-end-x, -590px), var(--resolved-card-target-end-y, 330px), 0) scale(0.74);
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

@keyframes combat-float-heavy-up {
  0% {
    opacity: 0;
    transform: translate(-50%, 0) scale(1.7);
  }
  12% {
    opacity: 1;
    transform: translate(-50%, -3px) scale(2.05);
  }
  28% {
    transform: translate(-50%, -1px) scale(1.8);
  }
  45% {
    transform: translate(-50%, -12px) scale(2.05);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -42px) scale(2.1);
  }
}

.combat-root :deep(.animate-float) {
  animation-duration: 6s;
}

.combat-root :deep(.animate-clash-left),
.combat-root :deep(.animate-clash-right),
.combat-root :deep(.animate-shatter) {
  animation-duration: calc(0.6s / var(--combat-speed-multiplier));
}

.combat-root :deep(.animate-shake) {
  animation-duration: 0.5s;
}

.combat-root :deep(.animate-impact-shake) {
  animation: impact-nudge 0.2s ease-out;
}

.combat-root.animate-heavy-impact-shake {
  animation: heavy-impact-nudge 0.42s cubic-bezier(0.25, 0.8, 0.22, 1);
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

@keyframes heavy-impact-nudge {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  14% {
    transform: translate3d(-10px, 5px, 0) rotate(-0.25deg);
  }
  30% {
    transform: translate3d(8px, -5px, 0) rotate(0.22deg);
  }
  48% {
    transform: translate3d(-6px, 3px, 0) rotate(-0.16deg);
  }
  68% {
    transform: translate3d(3px, -2px, 0) rotate(0.08deg);
  }
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
}

/* 状态效果图标：金边宝石座 + 语义色内衬（buff 绿 / debuff 红 / mixed 紫 / special 金 / scene 青 / trait 铁） */
.effect-icon-btn {
  --effect-tint: 120, 110, 100;
  --effect-ink: 232, 220, 196;
  position: relative;
  width: 1.75rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  border: 1px solid rgba(201, 161, 96, 0.65);
  border-radius: 3px;
  background:
    radial-gradient(circle at 35% 28%, rgba(var(--effect-tint), 0.75), rgba(var(--effect-tint), 0.25) 60%, rgba(10, 7, 5, 0.9)),
    #140e0b;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 230, 190, 0.18), 0 1px 3px rgba(0, 0, 0, 0.6);
  color: rgb(var(--effect-ink));
  transition:
    transform 0.14s ease,
    filter 0.14s ease,
    box-shadow 0.22s ease;
}

.effect-icon--buff { --effect-tint: 70, 140, 80; --effect-ink: 210, 240, 200; }
.effect-icon--debuff { --effect-tint: 170, 50, 40; --effect-ink: 255, 210, 200; }
.effect-icon--mixed { --effect-tint: 120, 70, 200; --effect-ink: 228, 210, 255; }
.effect-icon--special { --effect-tint: 190, 130, 40; --effect-ink: 255, 232, 180; }
.effect-icon--scene { --effect-tint: 50, 130, 120; --effect-ink: 200, 245, 235; }
.effect-icon--trait { --effect-tint: 100, 92, 84; --effect-ink: 230, 222, 208; }

.effect-icon-btn::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(255, 240, 210, 0.35), transparent 55%);
  opacity: 0;
  transform: scale(0.86);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.effect-icon-btn:hover,
.effect-icon-btn:focus-visible {
  transform: translateY(-1px);
  filter: brightness(1.15);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55), 0 0 10px rgba(var(--effect-tint), 0.55);
  outline: none;
}

.effect-icon-btn:hover::before,
.effect-icon-btn:focus-visible::before {
  opacity: 0.5;
  transform: scale(1);
}

.effect-blocked-shake {
  z-index: 2;
  animation: effect-blocked-shake 0.46s ease both;
  box-shadow: 0 0 18px rgba(248, 113, 113, 0.38), 0 0 8px rgba(255, 255, 255, 0.16);
}

.effect-blocked-shake::before {
  opacity: 0.72;
  transform: scale(1.18);
}

@keyframes effect-blocked-shake {
  0% { transform: translate3d(0, 0, 0) scale(1); filter: brightness(1); }
  18% { transform: translate3d(-4px, 0, 0) scale(1.08); filter: brightness(1.55); }
  36% { transform: translate3d(4px, 0, 0) scale(1.08); filter: brightness(1.38); }
  54% { transform: translate3d(-3px, 0, 0) scale(1.04); filter: brightness(1.28); }
  72% { transform: translate3d(2px, 0, 0) scale(1.02); filter: brightness(1.18); }
  100% { transform: translate3d(0, 0, 0) scale(1); filter: brightness(1); }
}

.status-effect-list,
.status-value-list {
  position: relative;
}

.status-effect-move,
.status-effect-enter-active,
.status-effect-leave-active {
  transition:
    opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.3s ease;
}

.status-effect-enter-active.effect-icon-btn,
.status-effect-enter-active.status-effect-value-btn {
  animation: status-effect-spark 0.42s ease-out both;
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
  transition: filter 0.12s ease;
}

.status-effect-value-btn:hover,
.status-effect-value-btn:focus-visible {
  filter: brightness(1.08);
  outline: none;
}

.status-value-count {
  display: inline-block;
  animation: status-stack-pop 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.effect-stack-badge {
  position: absolute;
  right: -0.32rem;
  bottom: -0.32rem;
  min-width: 0.95rem;
  height: 0.95rem;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 30%, #3a2c22, #110c09 75%);
  border: 1px solid rgba(240, 208, 138, 0.8);
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-data);
  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  animation: status-stack-pop 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
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

/* 悬浮提示：与弹窗同材质的小型典籍签 */
.effect-tooltip {
  max-width: 20rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(201, 161, 96, 0.6);
  border-radius: 2px;
  background: var(--dg-bg-panel);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.08), 0 8px 24px rgba(0, 0, 0, 0.55);
}

.effect-tooltip--center {
  transform: translate(-50%, calc(-100% - 8px));
}

.effect-tooltip--right {
  transform: translate(0, calc(-100% - 8px));
}

.effect-tooltip--below {
  transform: translate(-50%, 8px);
}

.effect-tooltip-name {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 13px;
  letter-spacing: 0.06em;
  line-height: 1.25;
}

.effect-tooltip-desc {
  margin-top: 0.3rem;
  color: var(--dg-text);
  font-size: 11px;
  line-height: 1.5;
}

.effect-tooltip-stacks {
  margin-top: 0.3rem;
  color: var(--dg-coin);
  font-family: var(--dg-font-data);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.effect-tooltip-card-preview {
  width: 10rem;
  height: 15rem;
  margin: 0.5rem auto 0.6rem;
}

.invalid-card-shake {
  position: relative;
  animation: invalid-card-shake 0.32s ease;
}

@keyframes invalid-card-shake {
  0% { left: 0; }
  18% { left: -8px; }
  36% { left: 7px; }
  54% { left: -5px; }
  72% { left: 4px; }
  100% { left: 0; }
}

.mana-bar-blocked-shake {
  position: relative;
  animation: mana-bar-blocked-shake 0.38s ease both;
  box-shadow: 0 0 14px rgba(96, 165, 250, 0.5), inset 0 0 8px rgba(59, 130, 246, 0.35);
}

@keyframes mana-bar-blocked-shake {
  0% { transform: translate3d(0, 0, 0); filter: brightness(1); }
  18% { transform: translate3d(-7px, 0, 0); filter: brightness(1.5); }
  36% { transform: translate3d(6px, 0, 0); filter: brightness(1.35); }
  54% { transform: translate3d(-4px, 0, 0); filter: brightness(1.22); }
  72% { transform: translate3d(3px, 0, 0); filter: brightness(1.12); }
  100% { transform: translate3d(0, 0, 0); filter: brightness(1); }
}

.combat-button-cluster {
  transform: scale(1.2);
  transform-origin: top left;
}

.combat-top-left-panel {
  top: 1rem;
  left: 1.6rem;
}

.combat-skin-button:hover {
  transform: translateY(-2px);
  filter: brightness(1.18) drop-shadow(0 0 8px rgba(245, 170, 45, 0.5));
}

.combat-skin-button--active {
  filter: brightness(1.15) drop-shadow(0 0 8px rgba(245, 170, 45, 0.45));
}

.combat-skin-button:active {
  transform: scale(0.95);
}

.combat-skin-button:focus-visible {
  outline: 2px solid #ffcf70;
  outline-offset: 2px;
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
  transform: translateX(-2.5rem) scale(1.46);
  transform-origin: bottom;
}

/* ---------- 回合数 ---------- */
.combat-turn-label {
  color: var(--dg-text-muted);
  font-family: var(--dg-font-title);
  font-size: 0.78rem;
  letter-spacing: 0.5em;
  text-indent: 0.5em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

.combat-turn-value {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-data);
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95), 0 0 10px rgba(232, 170, 70, 0.35);
}

.combat-turn-value::before,
.combat-turn-value::after {
  width: 1.4rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--dg-gold));
  content: '';
}

.combat-turn-value::after { background: linear-gradient(90deg, var(--dg-gold), transparent); }

/* 骰点计算预览：淡暗衬底 + 左侧金线，避免文字直接压在立绘上 */
.combat-dice-preview {
  padding: 0.35rem 0.55rem;
  border-left: 2px solid rgba(201, 161, 96, 0.6);
  background: linear-gradient(90deg, rgba(17, 12, 9, 0.78), rgba(17, 12, 9, 0.35) 75%, transparent);
}

/* ---------- 状态面板：黑铁皮革 + 小号金角框 ---------- */
.combat-status-bar {
  transform-origin: bottom center;
  background: var(--dg-bg-panel);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.55);
}

.combat-status-bar__border {
  position: absolute;
  z-index: 1;
  inset: -6px;
  border-style: solid;
  border-width: 28px;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
}

.combat-status-bar--enemy {
  align-self: flex-end;
  margin-right: calc(var(--enemy-shell-width) * var(--enemy-status-margin-right-ratio));
  transform: scale(var(--enemy-status-scale));
}

.combat-status-bar--player {
  transform: scale(1.24);
}

.combat-status-name {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.4rem;
  padding-bottom: 0.25rem;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 0.95rem;
  letter-spacing: 0.14em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
}

.combat-status-name::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--dg-line-strong), var(--dg-line) 60%, transparent);
  content: '';
}

.combat-status-name--player { font-size: 0.82rem; }

.combat-stat-label {
  font-family: var(--dg-font-data);
  font-size: 10px;
  font-weight: 700;
}

.combat-stat-label--mp { color: #7fb0f0; }

.combat-stat-value {
  color: var(--dg-text);
  font-family: var(--dg-font-data);
  font-size: 10px;
  font-weight: 600;
}

.combat-stat-value--enemy-dice { color: #f0a097; }
.combat-stat-value--player-dice { color: var(--dg-gold-bright); }

/* 魔力条：黑铁凹槽 + 蓝色填充（与血条同款轨道） */
.combat-mp-track {
  height: 0.5rem;
  overflow: hidden;
  border: 1px solid rgba(201, 161, 96, 0.35);
  border-radius: 1px;
  background: linear-gradient(180deg, #06080f, #121826);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
}

.combat-mp-fill {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent 50%, rgba(0, 0, 0, 0.25)),
    linear-gradient(90deg, #1d4f9c, #4f8fe0);
  box-shadow: 0 0 6px rgba(79, 143, 224, 0.5);
}

.combat-dice-icon {
  width: 1.5rem;
  height: 0.95rem;
  object-fit: contain;
  object-position: left center;
}

/* 重掷次数：计数铭牌 */
.combat-reroll-chip {
  padding: 0.15rem 0.55rem;
  border: 1px solid rgba(201, 161, 96, 0.55);
  border-radius: 2px;
  background: linear-gradient(180deg, #2a1f18, #15100c);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.1), 0 2px 4px rgba(0, 0, 0, 0.5);
  color: var(--dg-gold-bright);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.combat-reroll-chip.is-dim { color: var(--dg-text-muted); }

/* 跳过回合：主要按钮框（两端红宝石） */
.combat-skip-btn {
  border-style: solid;
  border-width: 0 12px;
  border-image-source: var(--dg-img-button);
  border-image-slice: 0 80 fill;
  border-image-repeat: stretch;
  background: none;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
  transition: filter 0.18s ease, transform 0.12s ease;
}

.combat-skip-btn:hover:not(:disabled) { filter: brightness(1.15) drop-shadow(0 0 5px rgba(232, 170, 70, 0.35)); }
.combat-skip-btn:active:not(:disabled) { transform: scale(0.96); }

.combat-skip-btn:disabled {
  cursor: not-allowed;
  filter: grayscale(0.7) brightness(0.6);
}

/* ---------- 日志 / 牌堆 ---------- */
.combat-panel-toggle {
  border: 1px solid rgba(201, 161, 96, 0.45);
  border-right: 0;
  border-radius: 2px 0 0 2px;
  background: linear-gradient(180deg, #2a1f18, #15100c);
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.1);
  color: var(--dg-text-muted);
  font-family: var(--dg-font-title);
  font-size: 15px;
  letter-spacing: 0.12em;
  line-height: 1;
  transition: color 0.18s ease, border-color 0.18s ease;
}

.combat-panel-toggle:hover {
  border-color: var(--dg-gold-bright);
  color: var(--dg-gold-bright);
}

.combat-log-panel,
.combat-pile-panel {
  border: 1px solid rgba(201, 161, 96, 0.4);
  border-right: 0;
  background: var(--dg-bg-panel);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  scrollbar-color: rgba(201, 161, 96, 0.4) transparent;
  scrollbar-width: thin;
}

.combat-log-panel {
  color: var(--dg-text);
  font-size: 10px;
}

/* 日志条目：左侧金线，内容中的彩色 span 保持原语义色 */
.combat-log-entry {
  padding: 0.25rem 0.4rem;
  border-left: 2px solid rgba(201, 161, 96, 0.45);
  background: rgba(0, 0, 0, 0.35);
  line-height: 1.5;
}

.combat-pile-btn {
  border: 1px solid rgba(201, 161, 96, 0.5);
  border-radius: 2px;
  background: radial-gradient(circle at 35% 25%, #3a2c22, #16100c 75%);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 220, 160, 0.12), 0 2px 6px rgba(0, 0, 0, 0.5);
  color: var(--dg-gold);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
}

.combat-pile-btn:hover {
  border-color: var(--dg-gold-bright);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 8px rgba(232, 170, 70, 0.3);
}

.combat-pile-btn:active { transform: scale(0.95); }
.combat-pile-btn--discard { color: var(--dg-text-muted); }

.combat-pile-count {
  margin-top: 0.1rem;
  color: var(--dg-text);
  font-family: var(--dg-font-data);
  font-size: 10px;
  font-weight: 700;
}

.combat-pile-tip {
  padding: 0.1rem 0.45rem;
  border: 1px solid rgba(201, 161, 96, 0.5);
  border-radius: 2px;
  background: #15100c;
  color: var(--dg-gold-bright);
  font-size: 10px;
  letter-spacing: 0.1em;
}

/* 牌库 / 弃牌堆浏览：与弹窗同款的典籍面板 */
.combat-pile-overlay {
  background: var(--dg-bg-panel);
  box-shadow: var(--dg-shadow-deep);
}

.combat-pile-overlay__border {
  position: absolute;
  z-index: 2;
  inset: -12px;
  border-style: solid;
  border-width: 50px;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
}

.combat-pile-overlay__head {
  position: relative;
  z-index: 3;
}

.combat-pile-overlay__head::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--dg-line-strong), var(--dg-line) 70%, transparent);
  content: '';
}

.combat-pile-overlay__title {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1.3rem;
  letter-spacing: 0.18em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
}

.combat-pile-overlay__close {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(201, 161, 96, 0.55);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3a2c22, #16100c 70%);
  color: var(--dg-gold);
  transition: border-color 0.18s ease, color 0.18s ease;
}

.combat-pile-overlay__close:hover {
  border-color: var(--dg-gold-bright);
  color: var(--dg-gold-bright);
}

/* ---------- 胜负横幅：标题字体铭板 ---------- */
.battle-result-banner {
  --result-color: var(--dg-gold-bright);
  --result-glow: rgba(232, 170, 70, 0.45);
  border: 1px solid rgba(201, 161, 96, 0.7);
  border-radius: 2px;
  background: var(--dg-bg-panel);
  box-shadow: inset 0 0 0 4px rgba(17, 12, 9, 0.9), inset 0 0 0 5px rgba(201, 161, 96, 0.35), 0 0 40px rgba(0, 0, 0, 0.85), 0 0 30px var(--result-glow);
  color: var(--result-color);
  font-family: var(--dg-font-title);
  font-size: 3.75rem;
  letter-spacing: 0.4em;
  text-indent: 0.4em;
  line-height: 1;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.9), 0 0 18px var(--result-glow);
  animation: battle-result-breathe 2.4s ease-in-out infinite;
}

.battle-result-banner--win { --result-color: var(--dg-gold-bright); --result-glow: rgba(232, 170, 70, 0.5); }
.battle-result-banner--escape { --result-color: #d9d2c4; --result-glow: rgba(200, 190, 170, 0.25); }
.battle-result-banner--lose { --result-color: #e47a6a; --result-glow: rgba(192, 80, 63, 0.45); }

@keyframes battle-result-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.82; }
}

@media (prefers-reduced-motion: reduce) {
  .battle-result-banner { animation: none; }
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
  --enemy-intent-top-ratio: -0.3214285714;
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

.enemy-intent-anchor :deep(.dungeon-card) {
  box-shadow: none;
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

.enemy-portrait-img {
  transition:
    opacity calc(0.7s / var(--combat-speed-multiplier)) ease,
    filter calc(0.7s / var(--combat-speed-multiplier)) ease;
}

.enemy-portrait-img--intangible-active {
  opacity: 0.08;
  filter: saturate(0.82) brightness(1.12);
}

.enemy-portrait-img--pain-phase-transition {
  animation: pain-portrait-phase-shift 780ms ease-in-out both;
}

@keyframes pain-portrait-phase-shift {
  0% { opacity: 1; filter: blur(0) brightness(1); transform: scale(1); }
  42% { opacity: 0.12; filter: blur(9px) brightness(1.5); transform: scale(1.025); }
  100% { opacity: 1; filter: blur(0) brightness(1); transform: scale(1); }
}

.leviathan-body-target {
  cursor: pointer;
  border-radius: 1rem;
}

.leviathan-body-target--selected {
  filter:
    brightness(1.08)
    saturate(1.06)
    drop-shadow(0 0 18px rgba(250, 204, 21, 0.26));
}

.leviathan-summons-layer {
  position: absolute;
  inset: 0;
  z-index: 32;
  pointer-events: none;
}

.leviathan-summon-node {
  --leviathan-summon-card-scale: 0.62;
  --leviathan-summon-card-visual-width: 4.03rem;
  --leviathan-summon-card-width: 6.5rem;
  --leviathan-summon-hover-y: 0rem;
  --leviathan-summon-portrait-bottom: 2.7rem;
  --leviathan-summon-scale: 1;
  --leviathan-summon-enter-scale: 0.76;
  --leviathan-summon-leave-scale: 0.72;
  --leviathan-summon-overshoot-scale: 1.04;
  --leviathan-summon-status-left: 0.65rem;
  position: absolute;
  width: 21.6rem;
  height: 15.85rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  pointer-events: auto;
  transform: translateY(var(--leviathan-summon-hover-y)) scale(var(--leviathan-summon-scale));
  transform-origin: bottom right;
  transition:
    filter 180ms ease,
    transform 180ms ease;
}

.leviathan-summon-enter-active {
  animation: leviathan-summon-enter calc(0.62s / var(--combat-speed-multiplier)) cubic-bezier(0.18, 0.92, 0.22, 1) both;
}

.leviathan-summon-leave-active {
  animation: leviathan-summon-leave calc(0.58s / var(--combat-speed-multiplier)) cubic-bezier(0.4, 0, 0.2, 1) both;
  pointer-events: none;
}

@keyframes leviathan-summon-enter {
  0% {
    opacity: 0;
    filter: blur(8px) brightness(1.42) saturate(1.25);
    transform: translateY(calc(var(--leviathan-summon-hover-y) + 1.35rem)) scale(var(--leviathan-summon-enter-scale));
  }

  58% {
    opacity: 1;
    filter: blur(1.5px) brightness(1.18) saturate(1.12);
    transform: translateY(calc(var(--leviathan-summon-hover-y) - 0.2rem)) scale(var(--leviathan-summon-overshoot-scale));
  }

  100% {
    opacity: 1;
    filter: none;
    transform: translateY(var(--leviathan-summon-hover-y)) scale(var(--leviathan-summon-scale));
  }
}

@keyframes leviathan-summon-leave {
  0% {
    opacity: 1;
    filter: none;
    transform: translateY(var(--leviathan-summon-hover-y)) scale(var(--leviathan-summon-scale));
  }

  36% {
    opacity: 0.78;
    filter: blur(1px) brightness(1.25) saturate(0.92);
    transform: translateY(calc(var(--leviathan-summon-hover-y) - 0.35rem)) scale(var(--leviathan-summon-overshoot-scale));
  }

  100% {
    opacity: 0;
    filter: blur(10px) brightness(0.85) saturate(0.65);
    transform: translateY(calc(var(--leviathan-summon-hover-y) + 2.1rem)) scale(var(--leviathan-summon-leave-scale));
  }
}

.leviathan-summon-node::before {
  content: '';
  position: absolute;
  inset: 0.95rem 0.3rem 1.65rem;
  z-index: 0;
  border-radius: 999px;
  background: radial-gradient(ellipse at 58% 50%, rgba(250, 204, 21, 0.28), rgba(250, 204, 21, 0.12) 38%, transparent 72%);
  filter: blur(12px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease;
}

.leviathan-summon-node:hover,
.leviathan-summon-node:focus-visible {
  filter: drop-shadow(0 0 14px rgba(125, 211, 252, 0.18));
  outline: none;
}

.leviathan-summon-node--selected {
  filter:
    brightness(1.14)
    sepia(0.12)
    saturate(1.16)
    drop-shadow(0 0 22px rgba(250, 204, 21, 0.5))
    drop-shadow(0 0 38px rgba(125, 211, 252, 0.18));
}

.leviathan-summon-node--selected::before {
  opacity: 1;
}

.leviathan-summon-node--left {
  left: 2rem;
  bottom: 8.9rem;
}

.leviathan-summon-node--left-top {
  left: -23.6rem;
  top: -14.6rem;
}

.leviathan-summon-node--top {
  right: 2rem;
  top: -12.6rem;
}

.leviathan-summon-node--top:hover,
.leviathan-summon-node--top:focus-visible,
.leviathan-summon-node--top.leviathan-summon-node--selected {
  --leviathan-summon-hover-y: -0.15rem;
}

.leviathan-summon-node--left:hover,
.leviathan-summon-node--left:focus-visible,
.leviathan-summon-node--left.leviathan-summon-node--selected,
.leviathan-summon-node--left-top:hover,
.leviathan-summon-node--left-top:focus-visible,
.leviathan-summon-node--left-top.leviathan-summon-node--selected {
  --leviathan-summon-hover-y: -0.15rem;
}

.leviathan-summon-card {
  position: absolute;
  top: 0.75rem;
  left: calc(var(--leviathan-summon-status-left) - var(--leviathan-summon-card-visual-width));
  width: var(--leviathan-summon-card-width);
  height: 8.9rem;
  overflow: visible;
  transform: scale(var(--leviathan-summon-card-scale));
  transform-origin: top left;
  z-index: 6;
  pointer-events: auto;
  transition:
    left 180ms ease,
    top 180ms ease,
    transform 180ms ease,
    filter 180ms ease;
}

.leviathan-summon-node:hover .leviathan-summon-card,
.leviathan-summon-node:focus-visible .leviathan-summon-card,
.leviathan-summon-node--selected .leviathan-summon-card {
  top: 0.15rem;
  left: calc(var(--leviathan-summon-status-left) - var(--leviathan-summon-card-width));
  z-index: 24;
  transform: scale(1);
  filter: drop-shadow(0 14px 26px rgba(0, 0, 0, 0.48));
}

.leviathan-summon-dice {
  position: absolute;
  left: 1.35rem;
  bottom: 7.3rem;
  z-index: 18;
  transform: scale(1.32);
  transform-origin: left bottom;
  pointer-events: auto;
}

.leviathan-summon-portrait {
  position: absolute;
  right: 0.45rem;
  bottom: var(--leviathan-summon-portrait-bottom);
  width: 12.7rem;
  height: 12.7rem;
  display: flex;
  align-items: end;
  justify-content: center;
  overflow: hidden;
  pointer-events: auto;
  z-index: 1;
}

.leviathan-summon-float-layer {
  position: absolute;
  left: var(--leviathan-summon-status-left);
  right: 0.65rem;
  top: calc(100% - var(--leviathan-summon-portrait-bottom) - 0.25rem);
  height: 4.5rem;
  z-index: 34;
  overflow: visible;
}

.leviathan-summon-status {
  position: absolute;
  left: var(--leviathan-summon-status-left);
  right: 0.65rem;
  top: calc(100% - var(--leviathan-summon-portrait-bottom));
  bottom: auto;
  z-index: 10;
  min-width: 0;
  padding: 0.5rem 0.65rem 0.58rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 0.55rem;
  background: rgba(4, 8, 18, 0.64);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.24);
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.45rem);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.leviathan-summon-node:hover .leviathan-summon-status,
.leviathan-summon-node:focus-visible .leviathan-summon-status,
.leviathan-summon-node--selected .leviathan-summon-status {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.leviathan-summon-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.leviathan-summon-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 244, 214, 0.94);
  font-size: 0.94rem;
  font-weight: 700;
}

.leviathan-summon-hp {
  flex: none;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.74rem;
}

.leviathan-summon-hpbar {
  position: relative;
  height: 0.38rem;
  margin: 0.24rem 0 0.3rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(69, 10, 10, 0.85);
}

.leviathan-summon-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.7rem;
}

.leviathan-summon-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.26rem;
  margin-top: 0.36rem;
}

.leviathan-summon-effect {
  width: 1.62rem;
  height: 1.62rem;
}

@media (max-width: 900px) {
  .leviathan-summon-node {
    --leviathan-summon-scale: 0.72;
    --leviathan-summon-enter-scale: 0.55;
    --leviathan-summon-leave-scale: 0.52;
    --leviathan-summon-overshoot-scale: 0.76;
  }

  .leviathan-summon-node--left {
    left: -1.2rem;
    bottom: 7.7rem;
  }

  .leviathan-summon-node--left-top {
    left: -17.8rem;
    top: -10.5rem;
  }

  .leviathan-summon-node--top {
    right: -0.4rem;
    top: -8.9rem;
  }
}

.temp-gold-icon {
  position: relative;
  display: inline-flex;
  width: 0.75rem;
  height: 0.75rem;
}

.temp-gold-icon__badge {
  position: absolute;
  right: -0.3rem;
  bottom: -0.2rem;
  width: 0.5rem;
  height: 0.5rem;
  filter: drop-shadow(0 0 1px rgb(0 0 0 / 90%));
}
</style>
