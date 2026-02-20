// Schema import removed - using raw MVU data directly
import { detectLeave, detectOptionE, extractMainText, extractOptions, extractSummary, extractVariableUpdate, parseResponse, type ParsedResponse } from './responseParser';

/**
 * 楼层存档条目（用于读档面板）
 */
export interface SaveEntry {
  messageId: number;
  summary: string;
}

/**
 * 游戏主 Store
 * 管理伪同层的游戏循环：用户输入 → 创建 user 楼层 → generate → 解析回复 → 创建 assistant 楼层
 */
export const useGameStore = defineStore('game', () => {
  // ── 游戏显示状态 ──
  const mainText = ref('');
  const options = ref<string[]>([]);
  const currentSummary = ref('');
  const isGenerating = ref(false);
  const streamingText = ref('');
  const error = ref<string | null>(null);
  const isInitialized = ref(false);

  // ── 特殊选项标记 ──
  const hasOptionE = ref(false);
  const hasLeave = ref(false);
  const variableUpdateText = ref('');

  // ── 编辑模式 ──
  const isEditing = ref(false);
  const editingText = ref('');

  // ── MVU 变量（解析后的 stat_data）──
  const statData = ref<Record<string, any>>({});

  // ── 读档面板 ──
  const saveEntries = ref<SaveEntry[]>([]);
  const isSaveLoadOpen = ref(false);

  // ── 传送门待应用变量（点击传送门时记录，在新楼层生成后应用）──
  interface PendingPortalChanges {
    area?: string;
    roomType: string;
    resetRoomCounter?: boolean;
    incrementKeys?: string[];
    enemyName?: string;
  }
  const pendingPortalChanges = ref<PendingPortalChanges | null>(null);

  function setPendingPortalChanges(changes: PendingPortalChanges) {
    pendingPortalChanges.value = changes;
  }

  /**
   * 将传送门变量变更应用到 MVU 数据（写入 user 楼层）
   */
  function applyPendingPortalChangesToMvu(baseMvuData: any, changes: PendingPortalChanges | null) {
    const result = _.cloneDeep(baseMvuData ?? {});
    if (!changes) return result;

    if (!result.stat_data || typeof result.stat_data !== 'object') {
      result.stat_data = {};
    }
    const sd = result.stat_data as Record<string, any>;

    if (changes.area !== undefined) sd._当前区域 = changes.area;
    sd._当前房间类型 = changes.roomType;
    if (changes.enemyName !== undefined) sd._对手名称 = changes.enemyName;

    if (!sd.$统计 || typeof sd.$统计 !== 'object') {
      sd.$统计 = {};
    }
    const stat = sd.$统计 as Record<string, any>;

    if (changes.resetRoomCounter) {
      stat.当前层已过房间 = 0;
    }
    if (changes.incrementKeys) {
      for (const key of changes.incrementKeys) {
        stat[key] = (Number(stat[key]) || 0) + 1;
      }
    }

    return result;
  }

  /**
   * 初始化：从最新 assistant 楼层加载当前游戏状态
   */
  async function initialize() {
    try {
      await waitGlobalInitialized('Mvu');
      console.info('[GameStore] MVU initialized');

      // 读取最新 assistant 楼层
      const lastId = getLastMessageId();
      if (lastId >= 0) {
        loadLatestAssistantState();
        loadStatData();
      }

      isInitialized.value = true;
      console.info('[GameStore] Initialized successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] Init error:', msg);
      error.value = `初始化失败: ${msg}`;
    }
  }
  /**
   * 从最新 assistant 楼层加载显示状态
   */
  function loadLatestAssistantState() {
    const lastId = getLastMessageId();
    if (lastId < 0) return;

    const messages = getChatMessages(`0-${lastId}`, { role: 'assistant' });
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const text = lastMsg.message;
      mainText.value = extractMainText(text);
      options.value = extractOptions(text);
      currentSummary.value = extractSummary(text);
      hasOptionE.value = detectOptionE(text);
      hasLeave.value = detectLeave(text);
      variableUpdateText.value = extractVariableUpdate(text);
    }
  }

  /**
   * 从最新楼层加载 MVU stat_data
   */
  function loadStatData() {
    try {
      const lastId = getLastMessageId();
      if (lastId < 0) return;
      const mvuData = Mvu.getMvuData({ type: 'message', message_id: lastId });
      const raw = _.get(mvuData, 'stat_data');
      if (raw && typeof raw === 'object') {
        // 直接使用原始数据，避免 Schema 转换/截断
        statData.value = raw as any;
        console.info('[GameStore] stat_data loaded from message', lastId);
      }
    } catch (err) {
      console.warn('[GameStore] Failed to load stat_data:', err);
    }
  }

  /**
   * 核心游戏循环：发送用户行动
   * 1. 获取当前楼层 MVU 变量（作为继承基础）
   * 2. 创建 user 楼层（不触发生成、不刷新）
   * 3. 调用 generate 生成 LLM 回复
   * 4. 解析回复标签 + 解析 MVU 变量命令
   * 5. 创建 assistant 楼层（携带解析后的 MVU 数据）
   * 6. 隐藏旧楼层，更新显示
   */
  async function sendAction(userInput: string) {
    if (isGenerating.value || !userInput.trim()) return;

    error.value = null;
    isGenerating.value = true;
    streamingText.value = '';

    try {
      // 1. 在创建新消息前，获取最新楼层的 MVU 变量（用于继承）
      const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: getLastMessageId() });
      const currentPendingChanges = pendingPortalChanges.value;

      // 2. 先将传送门变量写入 user 楼层对应的 MVU 数据
      const userMvuData = applyPendingPortalChangesToMvu(oldMvuData, currentPendingChanges);

      // 3. 创建 user 楼层（携带已应用按钮变更后的 MVU 数据）
      console.info('[GameStore] Creating user message:', userInput);
      await createChatMessages(
        [{ role: 'user', message: userInput, data: userMvuData }],
        { refresh: 'none' },
      );

      // user 层已写入成功后，清空待应用变更，避免后续重复叠加
      pendingPortalChanges.value = null;

      // 4. 监听流式传输（可选）
      const streamListener = eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text: string, _generation_id: string) => {
        streamingText.value = text;
      });

      // 5. 调用 generate 生成回复
      console.info('[GameStore] Generating LLM response...');
      const result = await generate({
        user_input: userInput,
        should_stream: true,
      });
      console.info('[GameStore] LLM response received, length:', result.length);

      // 停止流式监听
      streamListener.stop();
      streamingText.value = '';

      // 6. 解析回复标签
      const parsed = parseResponse(result);
      applyParsedResponse(parsed);

      // 7. 解析 MVU 变量命令（基于 user 楼层变量继承）
      let newMvuData = await Mvu.parseMessage(result, _.cloneDeep(userMvuData));
      if (!newMvuData) {
        newMvuData = _.cloneDeep(userMvuData);
      } else if (!newMvuData.stat_data && userMvuData?.stat_data) {
        newMvuData.stat_data = _.cloneDeep(userMvuData.stat_data);
      }

      // 8. 清理无用的 MVU 内部字段
      if (newMvuData) {
        delete newMvuData.display_data;
        delete newMvuData.delta_data;
      }

      // 9. 创建 assistant 楼层，携带解析后的 MVU 数据
      console.info('[GameStore] Creating assistant message with MVU data');
      await createChatMessages(
        [{ role: 'assistant', message: result, data: newMvuData }],
        { refresh: 'none' },
      );

      // 10. 刷新本地 stat_data
      refreshLocalStatData(newMvuData);

      console.info('[GameStore] Action completed successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] sendAction error:', msg);
      error.value = `生成失败: ${msg}`;
    } finally {
      isGenerating.value = false;
    }
  }

  /**
   * 将解析结果应用到状态
   */
  function applyParsedResponse(parsed: ParsedResponse) {
    mainText.value = parsed.mainText;
    options.value = parsed.options;
    currentSummary.value = parsed.summary;
    hasOptionE.value = parsed.hasOptionE;
    hasLeave.value = parsed.hasLeave;
    variableUpdateText.value = parsed.variableUpdate;
  }

  /**
   * 从 MVU 数据中刷新本地 stat_data 显示
   */
  function refreshLocalStatData(mvuData: any) {
    try {
      if (!mvuData) return;
      const raw = _.get(mvuData, 'stat_data');
      if (raw && typeof raw === 'object') {
        // 直接使用原始数据，避免 Schema.safeParse 对数据的转换/截断
        statData.value = raw as any;
        console.info('[GameStore] Local stat_data refreshed:', JSON.stringify(raw.$统计));
      }
    } catch (err) {
      console.warn('[GameStore] refreshLocalStatData error:', err);
    }
  }

  /**
   * 加载所有历史楼层的 <sum> 小总结（用于读档面板）
   */
  function loadSaveEntries() {
    const entries: SaveEntry[] = [];
    const lastId = getLastMessageId();
    if (lastId < 0) {
      saveEntries.value = entries;
      return;
    }

    const messages = getChatMessages(`0-${lastId}`, { role: 'assistant' });
    for (const msg of messages) {
      const summary = extractSummary(msg.message);
      if (summary) {
        entries.push({
          messageId: msg.message_id,
          summary,
        });
      }
    }
    saveEntries.value = entries;
  }

  /**
   * 回档到指定楼层（删除该楼层之后的所有消息，然后重新加载）
   */
  async function rollbackTo(targetMessageId: number) {
    try {
      const lastId = getLastMessageId();
      if (targetMessageId >= lastId) {
        console.warn('[GameStore] Cannot rollback: target is current or future');
        return;
      }

      // 删除 target 之后的所有楼层
      const idsToDelete: number[] = [];
      for (let i = targetMessageId + 1; i <= lastId; i++) {
        idsToDelete.push(i);
      }

      console.info(`[GameStore] Rolling back: deleting messages ${targetMessageId + 1} to ${lastId}`);
      await deleteChatMessages(idsToDelete, { refresh: 'none' });

      // 从新的最新 assistant 楼层重新加载状态
      loadLatestAssistantState();

      // 显式从目标楼层加载 MVU 变量（不依赖 getLastMessageId，避免读到旧数据）
      try {
        const mvuData = Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
        const raw = _.get(mvuData, 'stat_data');
        if (raw && typeof raw === 'object') {
          statData.value = raw as any;
          console.info('[GameStore] Rollback: loaded stat_data from message', targetMessageId);
        }
      } catch (e) {
        console.warn('[GameStore] Rollback: failed to load stat_data from target, falling back', e);
        loadStatData();
      }

      // 关闭读档面板
      isSaveLoadOpen.value = false;

      toastr.success('回档成功！');
      console.info('[GameStore] Rollback completed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] Rollback error:', msg);
      error.value = `回档失败: ${msg}`;
    }
  }

  /**
   * 重Roll：删除当前最新的 assistant+user 楼层并重新生成
   */
  async function rerollCurrent() {
    if (isGenerating.value) return;

    try {
      const lastId = getLastMessageId();
      if (lastId < 1) {
        console.warn('[GameStore] Cannot reroll: not enough messages');
        return;
      }

      isGenerating.value = true;
      error.value = null;
      streamingText.value = '';

      // 找到最后一个 user 消息作为 re-generate 的输入
      const allMessages = getChatMessages(`0-${lastId}`);
      const lastUserMsg = [...allMessages].reverse().find(m => m.role === 'user');
      const userInput = lastUserMsg ? lastUserMsg.message : '';

      // 删除最新 assistant 楼层
      console.info('[GameStore] Reroll: deleting message', lastId);
      await deleteChatMessages([lastId], { refresh: 'none' });

      // 获取当前最新楼层（删除后）的 MVU 变量作为继承基础
      const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: getLastMessageId() });

      // 监听流式传输
      const streamListener = eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text: string) => {
        streamingText.value = text;
      });

      // 重新生成
      console.info('[GameStore] Reroll: regenerating...');
      const result = await generate({
        user_input: userInput,
        should_stream: true,
      });

      streamListener.stop();
      streamingText.value = '';

      // 解析回复标签
      const parsed = parseResponse(result);
      applyParsedResponse(parsed);

      // 解析 MVU 变量命令（基于旧数据继承，深拷贝以避免污染当前楼层）
      const newMvuData = await Mvu.parseMessage(result, _.cloneDeep(oldMvuData));

      // 创建新的 assistant 楼层，携带 MVU 数据
      await createChatMessages(
        [{ role: 'assistant', message: result, data: newMvuData }],
        { refresh: 'none' },
      );

      // 刷新本地 stat_data
      refreshLocalStatData(newMvuData);

      toastr.success('重新生成完成！');
      console.info('[GameStore] Reroll completed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] Reroll error:', msg);
      error.value = `重新生成失败: ${msg}`;
    } finally {
      isGenerating.value = false;
    }
  }

  /**
   * 开始编辑当前楼层（显示完整原始回复，含思维链、选项、变量更新等）
   */
  function startEdit() {
    if (isEditing.value || isGenerating.value) return;
    // 从 SillyTavern 读取当前 assistant 楼层的完整原始文本
    const lastId = getLastMessageId();
    if (lastId < 0) return;
    const messages = getChatMessages(`${lastId}-${lastId}`);
    if (messages.length === 0) return;
    editingText.value = messages[0].message;
    isEditing.value = true;
  }

  /**
   * 确认编辑：将修改后的完整文本保存到当前 assistant 楼层
   */
  async function saveEdit() {
    if (!isEditing.value) return;

    try {
      const lastId = getLastMessageId();
      if (lastId < 0) return;

      // 获取当前楼层已有的 MVU 数据（编辑前的）
      const currentMvuData = Mvu.getMvuData({ type: 'message', message_id: lastId });

      // 获取上一条消息的 MVU 数据作为继承基础
      const prevMvuData = lastId > 0
        ? Mvu.getMvuData({ type: 'message', message_id: lastId - 1 })
        : Mvu.getMvuData({ type: 'message', message_id: 0 });

      // 用编辑后的文本重新解析 MVU 变量（深拷贝以避免污染上一楼层）
      let newMvuData = await Mvu.parseMessage(editingText.value, _.cloneDeep(prevMvuData));

      // 关键：如果重新解析后丢失了 stat_data / display_data，
      // 则从当前楼层已有的 MVU 数据中恢复
      if (newMvuData && currentMvuData) {
        if (!newMvuData.stat_data && currentMvuData.stat_data) {
          newMvuData.stat_data = currentMvuData.stat_data;
        }
        if (!newMvuData.display_data && currentMvuData.display_data) {
          newMvuData.display_data = currentMvuData.display_data;
        }
      } else if (!newMvuData && currentMvuData) {
        // parseMessage 完全失败时，保留原始数据
        newMvuData = currentMvuData;
      }

      // 保存编辑后的完整文本到楼层
      await setChatMessages([{ message_id: lastId, message: editingText.value }], { refresh: 'none' });

      // 将 MVU 数据写回当前楼层
      if (newMvuData) {
        await Mvu.replaceMvuData(newMvuData, { type: 'message', message_id: lastId });
      }

      // 从编辑后的文本重新解析显示状态
      const parsed = parseResponse(editingText.value);
      applyParsedResponse(parsed);

      // 刷新本地 stat_data
      refreshLocalStatData(newMvuData);

      isEditing.value = false;
      editingText.value = '';
      toastr.success('编辑已保存！');
      console.info('[GameStore] Edit saved');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] Save edit error:', msg);
      error.value = `编辑保存失败: ${msg}`;
    }
  }

  /**
   * 取消编辑
   */
  function cancelEdit() {
    isEditing.value = false;
    editingText.value = '';
  }

  /**
   * 直接更新当前最新楼层的 stat_data 字段（用于本地测试配置等场景）
   */
  async function updateStatDataFields(fields: Record<string, any>): Promise<boolean> {
    try {
      const lastId = getLastMessageId();
      if (lastId < 0) {
        error.value = '当前没有可写入的楼层。';
        return false;
      }

      const currentMvuData = Mvu.getMvuData({ type: 'message', message_id: lastId });
      const nextMvuData = _.cloneDeep(currentMvuData ?? {});
      if (!nextMvuData.stat_data || typeof nextMvuData.stat_data !== 'object') {
        nextMvuData.stat_data = {};
      }

      Object.assign(nextMvuData.stat_data, _.cloneDeep(fields));
      await Mvu.replaceMvuData(nextMvuData, { type: 'message', message_id: lastId });
      refreshLocalStatData(nextMvuData);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] updateStatDataFields error:', msg);
      error.value = `写入变量失败: ${msg}`;
      return false;
    }
  }

  return {
    // State
    mainText,
    options,
    currentSummary,
    isGenerating,
    streamingText,
    error,
    isInitialized,
    statData,
    saveEntries,
    isSaveLoadOpen,
    isEditing,
    editingText,
    hasOptionE,
    hasLeave,
    variableUpdateText,

    // Actions
    initialize,
    sendAction,
    setPendingPortalChanges,
    loadStatData,
    loadSaveEntries,
    rollbackTo,
    rerollCurrent,
    startEdit,
    saveEdit,
    cancelEdit,
    updateStatDataFields,
  };
});
