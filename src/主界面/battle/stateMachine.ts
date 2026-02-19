// ═══════════════════════════════════════════════════════════════
//  战斗流程状态机 (Battle State Machine)
// ═══════════════════════════════════════════════════════════════

import {
    CombatPhase,
    type CardData,
    type ClashResult,
    type CombatState,
    type EntityStats,
    type RelicModifiers,
} from '../types';
import {
    applyDamageToEntity,
    calculateFinalDamage,
    calculateFinalPoint,
    processClashEffects,
    processPostAttackEffects,
    resolveClash,
    rollDice,
    shouldClash,
} from './algorithms';
import {
    applyEffect,
    canPlayCard,
    processOnTurnEnd,
    processOnTurnStart,
    type TurnStartResult,
} from './effects';

// ── 默认圣遗物修正（无圣遗物时） ─────────────────────────────
const DEFAULT_RELIC_MODIFIERS: RelicModifiers = {
  globalMultiplier: 1.0,
  globalAddition: 0,
};

// ── 配置常量 ──────────────────────────────────────────────────
const DRAW_COUNT = 3;
const DEFAULT_ACTIONS_PER_TURN = 1;

// ═══════════════════════════════════════════════════════════════
//  BattleStateMachine 类
// ═══════════════════════════════════════════════════════════════

export class BattleStateMachine {
  private state: CombatState;
  private playerStats: EntityStats;
  private enemyStats: EntityStats;
  private playerRelics: RelicModifiers;
  private enemyRelics: RelicModifiers;

  constructor(
    playerStats: EntityStats,
    enemyStats: EntityStats,
    playerDeck: CardData[],
    enemyDeck: CardData[],
    playerRelics: RelicModifiers = DEFAULT_RELIC_MODIFIERS,
    enemyRelics: RelicModifiers = DEFAULT_RELIC_MODIFIERS,
  ) {
    this.playerStats = playerStats;
    this.enemyStats = enemyStats;
    this.playerRelics = playerRelics;
    this.enemyRelics = enemyRelics;

    this.state = {
      turn: 0,
      phase: CombatPhase.TURN_START,
      actionsRemaining: DEFAULT_ACTIONS_PER_TURN,
      playerBaseDice: 0,
      enemyBaseDice: 0,
      playerHand: [],
      playerDeck: shuffleArray([...playerDeck]),
      discardPile: [],
      enemyDeck: [...enemyDeck],
      enemyDiscard: [],
      enemyIntentCard: null,
      enemyPredictedPoint: 0,
      playerSelectedCard: null,
      lastPlayedCard: null,
      logs: [],
    };
  }

  // ── 公开接口 ──────────────────────────────────────────────

  getState(): Readonly<CombatState> {
    return this.state;
  }

  getPhase(): CombatPhase {
    return this.state.phase;
  }

  getPlayerStats(): Readonly<EntityStats> {
    return this.playerStats;
  }

  getEnemyStats(): Readonly<EntityStats> {
    return this.enemyStats;
  }

  /**
   * 推进到下一阶段（自动执行当前阶段逻辑）
   */
  transition(): CombatPhase {
    switch (this.state.phase) {
      case CombatPhase.TURN_START:
        this.executeTurnStart();
        break;
      case CombatPhase.DRAW_PHASE:
        this.executeDrawPhase();
        break;
      case CombatPhase.INTENT_PREVIEW:
        this.executeIntentPreview();
        break;
      case CombatPhase.PLAYER_INPUT:
        // 需要外部调用 playCard() 后手动推进
        break;
      case CombatPhase.RESOLUTION:
        this.executeResolution();
        break;
      case CombatPhase.DISCARD_PHASE:
        this.executeDiscardPhase();
        break;
      case CombatPhase.TURN_END:
        this.executeTurnEnd();
        break;
      case CombatPhase.WIN:
      case CombatPhase.LOSE:
        break; // 终态
    }
    return this.state.phase;
  }

  /**
   * 玩家选择并打出一张牌
   * 仅在 PLAYER_INPUT 阶段有效
   */
  playCard(card: CardData): { success: boolean; reason?: string } {
    if (this.state.phase !== CombatPhase.PLAYER_INPUT) {
      return { success: false, reason: '当前不在出牌阶段。' };
    }

    // 手牌检查
    const idx = this.state.playerHand.findIndex(c => c.id === card.id);
    if (idx === -1) {
      return { success: false, reason: '手牌中没有该牌。' };
    }

    // 效果限制检查
    const check = canPlayCard(this.playerStats, card, this.state.playerBaseDice);
    if (!check.allowed) {
      return { success: false, reason: check.reason };
    }

    // 行动次数检查（连击不消耗）
    if (!card.traits.combo && this.state.actionsRemaining <= 0) {
      return { success: false, reason: '本回合行动次数已用完。' };
    }

    // 消耗法力
    if (card.manaCost > 0) {
      this.playerStats.mp -= card.manaCost;
    }

    // 从手牌移除
    this.state.playerHand.splice(idx, 1);
    this.state.playerSelectedCard = card;
    this.state.lastPlayedCard = card;

    // 消耗行动次数（连击不消耗）
    if (!card.traits.combo) {
      this.state.actionsRemaining--;
    }

    // 处理 Reroll
    if (card.traits.reroll === 'self') {
      this.state.playerBaseDice = rollDice(this.playerStats.minDice, this.playerStats.maxDice);
      this.addLog(`[重掷] 玩家重新投骰: ${this.state.playerBaseDice}`);
    } else if (card.traits.reroll === 'enemy') {
      this.state.enemyBaseDice = rollDice(this.enemyStats.minDice, this.enemyStats.maxDice);
      this.addLog(`[重掷] 敌人重新投骰: ${this.state.enemyBaseDice}`);
    }

    // 处理 Draw（连击 + 过牌）
    if (card.traits.draw) {
      this.drawCards(1);
      this.addLog(`[过牌] 抽取 1 张牌。`);
    }

    this.addLog(`玩家打出: ${card.name} (${card.type})`);

    // 如果还有行动次数或连击牌，保持 PLAYER_INPUT
    // 否则推进到 RESOLUTION
    if (this.state.actionsRemaining <= 0 && !card.traits.combo) {
      this.state.phase = CombatPhase.RESOLUTION;
    }
    // 连击后仍处于 PLAYER_INPUT，等待玩家继续出牌或手动结束

    return { success: true };
  }

  /**
   * 玩家手动结束出牌阶段（当还有行动次数但选择不出牌时）
   */
  endPlayerInput(): void {
    if (this.state.phase !== CombatPhase.PLAYER_INPUT) return;
    this.state.phase = CombatPhase.RESOLUTION;
  }

  // ══════════════════════════════════════════════════════════
  //  内部阶段执行
  // ══════════════════════════════════════════════════════════

  private executeTurnStart(): void {
    this.state.turn++;
    this.state.actionsRemaining = DEFAULT_ACTIONS_PER_TURN;
    this.state.playerSelectedCard = null;
    this.addLog(`══ 回合 ${this.state.turn} 开始 ══`);

    // 投骰
    this.state.playerBaseDice = rollDice(this.playerStats.minDice, this.playerStats.maxDice);
    this.state.enemyBaseDice = rollDice(this.enemyStats.minDice, this.enemyStats.maxDice);
    this.addLog(`玩家投骰: ${this.state.playerBaseDice} | 敌人投骰: ${this.state.enemyBaseDice}`);

    // 玩家回合开始效果
    const pResult = processOnTurnStart(this.playerStats);
    this.applyTurnStartResult(this.playerStats, pResult, '玩家');
    // 施加燃烧给敌人
    for (const eff of pResult.applyToOpponent) {
      applyEffect(this.enemyStats, eff.type, eff.stacks);
    }

    // 敌人回合开始效果
    const eResult = processOnTurnStart(this.enemyStats);
    this.applyTurnStartResult(this.enemyStats, eResult, '敌人');
    for (const eff of eResult.applyToOpponent) {
      applyEffect(this.playerStats, eff.type, eff.stacks);
    }

    // 检查死亡
    if (this.checkDeath()) return;

    this.state.phase = CombatPhase.DRAW_PHASE;
  }

  private executeDrawPhase(): void {
    this.drawCards(DRAW_COUNT);
    this.addLog(`抽取 ${DRAW_COUNT} 张牌（手牌: ${this.state.playerHand.length}）`);
    this.state.phase = CombatPhase.INTENT_PREVIEW;
  }

  private executeIntentPreview(): void {
    // 敌人选牌（简单策略：从牌库随机选一张）
    if (this.state.enemyDeck.length === 0) {
      this.state.enemyDeck = shuffleArray([...this.state.enemyDiscard]);
      this.state.enemyDiscard = [];
    }
    if (this.state.enemyDeck.length > 0) {
      const idx = Math.floor(Math.random() * this.state.enemyDeck.length);
      this.state.enemyIntentCard = this.state.enemyDeck.splice(idx, 1)[0]!;

      // 预测点数
      const avgDice = (this.enemyStats.minDice + this.enemyStats.maxDice) / 2;
      this.state.enemyPredictedPoint = Math.floor(
        avgDice * this.state.enemyIntentCard.calculation.multiplier
        + this.state.enemyIntentCard.calculation.addition,
      );
      this.addLog(`敌人意图: ${this.state.enemyIntentCard.name}(${this.state.enemyIntentCard.type}) 预测点数≈${this.state.enemyPredictedPoint}`);
    }
    this.state.phase = CombatPhase.PLAYER_INPUT;
  }

  private executeResolution(): void {
    const pCard = this.state.playerSelectedCard;
    const eCard = this.state.enemyIntentCard;

    if (!pCard || !eCard) {
      this.addLog('无法结算：缺少卡牌。');
      this.state.phase = CombatPhase.DISCARD_PHASE;
      return;
    }

    // 计算最终点数
    const pFinal = calculateFinalPoint({
      baseDice: this.state.playerBaseDice,
      card: pCard,
      entityEffects: this.playerStats.effects,
      relicModifiers: this.playerRelics,
    });
    const eFinal = calculateFinalPoint({
      baseDice: this.state.enemyBaseDice,
      card: eCard,
      entityEffects: this.enemyStats.effects,
      relicModifiers: this.enemyRelics,
    });
    this.addLog(`最终点数 — 玩家: ${pFinal} | 敌人: ${eFinal}`);

    // 拼点判定
    if (shouldClash(pCard, eCard)) {
      const clash = resolveClash(pCard, eCard, pFinal, eFinal);
      this.addLog(clash.message);
      this.resolveClashDamage(clash, pCard, eCard, pFinal, eFinal);
    } else {
      this.addLog('无拼点，双方各自结算。');
      this.resolveNonClashDamage(pCard, eCard, pFinal, eFinal);
    }

    // 攻击后效果
    this.state.logs.push(...processPostAttackEffects(this.playerStats));
    this.state.logs.push(...processPostAttackEffects(this.enemyStats));

    if (this.checkDeath()) return;

    // 将敌方卡入弃牌堆
    this.state.enemyDiscard.push(eCard);
    this.state.enemyIntentCard = null;

    this.state.phase = CombatPhase.DISCARD_PHASE;
  }

  private executeDiscardPhase(): void {
    // 未打出的手牌移入弃牌堆
    this.state.discardPile.push(...this.state.playerHand);
    // 玩家打出的牌也入弃牌堆
    if (this.state.playerSelectedCard) {
      this.state.discardPile.push(this.state.playerSelectedCard);
      this.state.playerSelectedCard = null;
    }
    this.state.playerHand = [];
    this.state.phase = CombatPhase.TURN_END;
  }

  private executeTurnEnd(): void {
    // 回合结束效果
    const pLogs = processOnTurnEnd(this.playerStats);
    const eLogs = processOnTurnEnd(this.enemyStats);
    this.state.logs.push(...pLogs.map(l => `[玩家] ${l}`));
    this.state.logs.push(...eLogs.map(l => `[敌人] ${l}`));

    this.addLog(`══ 回合 ${this.state.turn} 结束 ══`);

    if (this.checkDeath()) return;

    this.state.phase = CombatPhase.TURN_START;
  }

  // ══════════════════════════════════════════════════════════
  //  辅助方法
  // ══════════════════════════════════════════════════════════

  private resolveClashDamage(
    clash: ClashResult,
    pCard: CardData, eCard: CardData,
    pFinal: number, eFinal: number,
  ): void {
    switch (clash.outcome) {
      case 'player_win': {
        const dmg = calculateFinalDamage({
          finalPoint: pFinal, card: pCard,
          attackerEffects: this.playerStats.effects,
          defenderEffects: this.enemyStats.effects,
          relicModifiers: this.playerRelics,
        });
        this.state.logs.push(...dmg.logs);
        const result = applyDamageToEntity(this.enemyStats, dmg.damage, dmg.isTrueDamage);
        this.state.logs.push(...result.logs);
        this.state.logs.push(...processClashEffects(this.playerStats, this.enemyStats));
        break;
      }
      case 'enemy_win': {
        const dmg = calculateFinalDamage({
          finalPoint: eFinal, card: eCard,
          attackerEffects: this.enemyStats.effects,
          defenderEffects: this.playerStats.effects,
          relicModifiers: this.enemyRelics,
        });
        this.state.logs.push(...dmg.logs);
        const result = applyDamageToEntity(this.playerStats, dmg.damage, dmg.isTrueDamage);
        this.state.logs.push(...result.logs);
        this.state.logs.push(...processClashEffects(this.enemyStats, this.playerStats));
        break;
      }
      case 'dodge_success':
        this.addLog('闪避成功，免疫伤害。');
        break;
      case 'draw':
        this.addLog('平局，双方均不受伤。');
        break;
    }
  }

  private resolveNonClashDamage(
    pCard: CardData, eCard: CardData,
    pFinal: number, eFinal: number,
  ): void {
    // 双方各自对对手结算伤害
    // 玩家 → 敌人
    if (pCard.type !== '功能' as any) {
      const dmg = calculateFinalDamage({
        finalPoint: pFinal, card: pCard,
        attackerEffects: this.playerStats.effects,
        defenderEffects: this.enemyStats.effects,
        relicModifiers: this.playerRelics,
      });
      this.state.logs.push(...dmg.logs);
      const result = applyDamageToEntity(this.enemyStats, dmg.damage, dmg.isTrueDamage);
      this.state.logs.push(...result.logs);
    }
    // 敌人 → 玩家
    if (eCard.type !== '功能' as any) {
      const dmg = calculateFinalDamage({
        finalPoint: eFinal, card: eCard,
        attackerEffects: this.enemyStats.effects,
        defenderEffects: this.playerStats.effects,
        relicModifiers: this.enemyRelics,
      });
      this.state.logs.push(...dmg.logs);
      const result = applyDamageToEntity(this.playerStats, dmg.damage, dmg.isTrueDamage);
      this.state.logs.push(...result.logs);
    }
  }

  private drawCards(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.state.playerDeck.length === 0) {
        if (this.state.discardPile.length === 0) break;
        this.state.playerDeck = shuffleArray([...this.state.discardPile]);
        this.state.discardPile = [];
        this.addLog('牌库已空，弃牌堆洗入牌库。');
      }
      const card = this.state.playerDeck.pop();
      if (card) this.state.playerHand.push(card);
    }
  }

  private applyTurnStartResult(entity: EntityStats, r: TurnStartResult, label: string): void {
    if (r.mpChange !== 0) entity.mp = Math.max(0, entity.mp + r.mpChange);
    if (r.hpChange !== 0) entity.hp = Math.min(entity.maxHp, Math.max(0, entity.hp + r.hpChange));
    if (r.trueDamage > 0) entity.hp = Math.max(0, entity.hp - r.trueDamage);
    this.state.logs.push(...r.logs.map(l => `[${label}] ${l}`));
  }

  private checkDeath(): boolean {
    if (this.playerStats.hp <= 0) { this.state.phase = CombatPhase.LOSE; this.addLog('玩家倒下了…'); return true; }
    if (this.enemyStats.hp <= 0) { this.state.phase = CombatPhase.WIN; this.addLog('敌人被击败！'); return true; }
    return false;
  }

  private addLog(msg: string): void {
    this.state.logs.push(msg);
  }
}

// ── 工具函数 ──────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
