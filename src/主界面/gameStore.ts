import { Schema } from '../schema';
import { extractMainText, extractOptions, extractSummary, parseResponse, type ParsedResponse } from './responseParser';

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

  // ── 编辑模式 ──
  const isEditing = ref(false);
  const editingText = ref('');

  // ── MVU 变量（解析后的 stat_data）──
  const statData = ref<Record<string, any>>({});

  // ── 读档面板 ──
  const saveEntries = ref<SaveEntry[]>([]);
  const isSaveLoadOpen = ref(false);

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

      // 隐藏旧楼层
      hideOldFloors();

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
      if (raw) {
        statData.value = Schema.parse(raw);
      }
    } catch (err) {
      console.warn('[GameStore] Failed to load stat_data:', err);
    }
  }

  /**
   * 核心游戏循环：发送用户行动
   * 1. 创建 user 楼层（不触发生成、不刷新）
   * 2. 调用 generate 生成 LLM 回复
   * 3. 解析回复，提取标签
   * 4. 解析 MVU 变量命令
   * 5. 创建 assistant 楼层（不触发生成、不刷新）
   * 6. 隐藏旧楼层，更新显示
   */
  async function sendAction(userInput: string) {
    if (isGenerating.value || !userInput.trim()) return;

    error.value = null;
    isGenerating.value = true;
    streamingText.value = '';

    try {
      // 1. 创建 user 楼层
      console.info('[GameStore] Creating user message:', userInput);
      await createChatMessages(
        [{ role: 'user', message: userInput }],
        { refresh: 'none' },
      );

      // 2. 监听流式传输（可选）
      const streamListener = eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text: string, _generation_id: string) => {
        streamingText.value = text;
      });

      // 3. 调用 generate 生成回复
      console.info('[GameStore] Generating LLM response...');
      const result = await generate({
        user_input: userInput,
        should_stream: true,
      });
      console.info('[GameStore] LLM response received, length:', result.length);

      // 停止流式监听
      streamListener.stop();
      streamingText.value = '';

      // 4. 解析回复
      const parsed = parseResponse(result);
      applyParsedResponse(parsed);

      // 5. 创建 assistant 楼层
      console.info('[GameStore] Creating assistant message');
      await createChatMessages(
        [{ role: 'assistant', message: result }],
        { refresh: 'none' },
      );

      // 6. 解析 MVU 变量命令（assistant 楼层已创建后再解析）
      await parseMvuVariables(result);

      // 7. 隐藏旧楼层
      hideOldFloors();

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
  }

  /**
   * 解析消息中的 MVU 变量命令并更新
   */
  async function parseMvuVariables(messageText: string) {
    try {
      const lastMsgId = getLastMessageId();
      if (lastMsgId < 0) return;

      const oldData = Mvu.getMvuData({ type: 'message', message_id: lastMsgId });
      const newData = await Mvu.parseMessage(messageText, oldData);
      if (newData) {
        await Mvu.replaceMvuData(newData, { type: 'message', message_id: lastMsgId });
        console.info('[GameStore] MVU variables updated');

        // 刷新本地 stat_data
        const raw = _.get(newData, 'stat_data');
        if (raw) {
          statData.value = Schema.parse(raw);
        }
      }
    } catch (err) {
      console.warn('[GameStore] MVU parse error:', err);
    }
  }

  /**
   * 隐藏旧楼层（只保留最新一楼的 DOM 显示）
   */
  function hideOldFloors() {
    try {
      // 在酒馆页面的 parent window 中操作
      const parentWindow = window.parent as any;
      const jq = parentWindow.$;
      if (jq) {
        jq('#chat > .mes').not('.last_mes').remove();
      }
    } catch (err) {
      console.warn('[GameStore] hideOldFloors error:', err);
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

      // 刷新 MVU 变量
      loadStatData();

      // 隐藏旧楼层
      hideOldFloors();

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

      // 解析回复
      const parsed = parseResponse(result);
      applyParsedResponse(parsed);

      // 创建新的 assistant 楼层
      await createChatMessages(
        [{ role: 'assistant', message: result }],
        { refresh: 'none' },
      );

      // 解析 MVU 变量
      await parseMvuVariables(result);

      // 隐藏旧楼层
      hideOldFloors();

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
   * 开始编辑当前楼层
   */
  function startEdit() {
    if (isEditing.value || isGenerating.value) return;
    editingText.value = mainText.value;
    isEditing.value = true;
  }

  /**
   * 确认编辑：将修改后的正文保存到当前 assistant 楼层
   */
  async function saveEdit() {
    if (!isEditing.value) return;

    try {
      const lastId = getLastMessageId();
      if (lastId < 0) return;

      // 获取最新 assistant 消息的原始文本
      const messages = getChatMessages(`${lastId}-${lastId}`);
      if (messages.length === 0) return;

      const originalMessage = messages[0].message;

      // 替换 <maintext> 标签内容为编辑后的文本
      const newMessage = originalMessage.replace(
        /<maintext>[\s\S]*?<\/maintext>/i,
        `<maintext>${editingText.value}</maintext>`,
      );

      // 更新酒馆楼层的消息内容
      await setChatMessages([{ message_id: lastId, message: newMessage }], { refresh: 'none' });

      // 应用到本地显示
      mainText.value = editingText.value;

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

    // Actions
    initialize,
    sendAction,
    loadSaveEntries,
    rollbackTo,
    hideOldFloors,
    rerollCurrent,
    startEdit,
    saveEdit,
    cancelEdit,
  };
});
