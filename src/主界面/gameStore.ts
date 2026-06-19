// Schema import removed - using raw MVU data directly
import { FINAL_AREA_NAME, getFloorNumberForArea } from './floor';
import {
  FIXED_OPENING_BACKGROUND_SETTING,
  buildOpeningBackstoryDraftPrompt,
  type OpeningInfoSubmission,
} from './openingProfile';
import {
  detectLeave,
  detectOptionE,
  detectRebirth,
  extractMainText,
  extractOptions,
  extractSummary,
  extractVariableUpdate,
  filterStreamingTextAfterThinkEnd,
  parseResponse,
  type ParsedResponse,
  type ResponseParserOptions,
} from './responseParser';

/**
 * Maintenance note:
 * - This file contains Chinese text and must stay UTF-8.
 * - Do not rewrite this file with shell redirection (>, >>, Out-File, Set-Content full overwrite).
 * - Use apply_patch/IDE-safe editing to avoid mojibake.
 */

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
  const STREAMING_ENABLED_KEY = 'dungeon.streaming_enabled';
  const FORBID_MATCHING_XML_INSIDE_THINK_KEY = 'dungeon.forbid_matching_xml_inside_think';
  const AUTO_SUMMARY_ENABLED_KEY = 'dungeon.auto_summary_enabled';
  const SUMMARY_VISIBLE_WINDOW_KEY = 'dungeon.summary_visible_window';
  const BUTTON_COMPLETION_ENABLED_KEY = 'dungeon.button_completion_enabled';
  const FAST_MODE_ENABLED_KEY = 'dungeon.fast_mode_enabled';
  const FAST_MODE_CHAT_VARIABLE_KEY = '__dungeon_fast_mode_buffer';
  const FAST_MODE_BUFFER_TITLE = '【剧情精简模式】';
  const FAST_MODE_BUFFER_EVENTS_TITLE = '【剧情精简模式经过】';
  const DEFAULT_SUMMARY_VISIBLE_WINDOW = 15;
  const MIN_SUMMARY_VISIBLE_WINDOW = 1;
  const MAX_SUMMARY_VISIBLE_WINDOW = 60;
  const META_SNIPPET_MAX_LENGTH = 420;

  const FINAL_AREA_REROLL_INPUT =
    '<user>试图重新摇动命运，让刚才那一幕从未发生。但这里是欲望之神的私人空间，地牢的一切法则在门后完全失效；欲望之神看见了这道改写的折痕，并且仍然记得被试图抹去的上一幕。请让欲望之神对此作出自然回应。</user>';

  function normalizeSummaryVisibleWindow(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_SUMMARY_VISIBLE_WINDOW;
    return Math.min(MAX_SUMMARY_VISIBLE_WINDOW, Math.max(MIN_SUMMARY_VISIBLE_WINDOW, Math.floor(parsed)));
  }

  function readStreamingEnabledSetting(): boolean {
    try {
      const raw = localStorage.getItem(STREAMING_ENABLED_KEY);
      if (raw === null) return true;
      return raw === 'true';
    } catch {
      return true;
    }
  }

  function persistStreamingEnabledSetting(enabled: boolean) {
    try {
      localStorage.setItem(STREAMING_ENABLED_KEY, String(enabled));
    } catch {
      // Ignore persistence errors in restricted environments
    }
  }

  function readForbidMatchingXmlInsideThinkSetting(): boolean {
    try {
      const raw = localStorage.getItem(FORBID_MATCHING_XML_INSIDE_THINK_KEY);
      if (raw === null) return true;
      return raw === 'true';
    } catch {
      return true;
    }
  }

  function persistForbidMatchingXmlInsideThinkSetting(enabled: boolean) {
    try {
      localStorage.setItem(FORBID_MATCHING_XML_INSIDE_THINK_KEY, String(enabled));
    } catch {
      // Ignore persistence errors in restricted environments
    }
  }

  function readAutoSummaryEnabledSetting(): boolean {
    try {
      const raw = localStorage.getItem(AUTO_SUMMARY_ENABLED_KEY);
      if (raw === null) return true;
      return raw === 'true';
    } catch {
      return true;
    }
  }

  function persistAutoSummaryEnabledSetting(enabled: boolean) {
    try {
      localStorage.setItem(AUTO_SUMMARY_ENABLED_KEY, String(enabled));
    } catch {
      // Ignore persistence errors in restricted environments
    }
  }

  function readSummaryVisibleWindowSetting(): number {
    try {
      const raw = localStorage.getItem(SUMMARY_VISIBLE_WINDOW_KEY);
      if (raw === null) return DEFAULT_SUMMARY_VISIBLE_WINDOW;
      return normalizeSummaryVisibleWindow(raw);
    } catch {
      return DEFAULT_SUMMARY_VISIBLE_WINDOW;
    }
  }

  function persistSummaryVisibleWindowSetting(value: number) {
    try {
      localStorage.setItem(SUMMARY_VISIBLE_WINDOW_KEY, String(normalizeSummaryVisibleWindow(value)));
    } catch {
      // Ignore persistence errors in restricted environments
    }
  }

  function readButtonCompletionEnabledSetting(): boolean {
    try {
      const raw = localStorage.getItem(BUTTON_COMPLETION_ENABLED_KEY);
      if (raw === null) return false;
      return raw === 'true';
    } catch {
      return false;
    }
  }

  function persistButtonCompletionEnabledSetting(enabled: boolean) {
    try {
      localStorage.setItem(BUTTON_COMPLETION_ENABLED_KEY, String(enabled));
    } catch {
      // Ignore persistence errors in restricted environments
    }
  }

  function readFastModeEnabledSetting(): boolean {
    try {
      const raw = localStorage.getItem(FAST_MODE_ENABLED_KEY);
      if (raw === null) return false;
      return raw === 'true';
    } catch {
      return false;
    }
  }

  function persistFastModeEnabledSetting(enabled: boolean) {
    try {
      localStorage.setItem(FAST_MODE_ENABLED_KEY, String(enabled));
    } catch {
      // Ignore persistence errors in restricted environments
    }
  }

  // State
  const mainText = ref('');
  const options = ref<string[]>([]);
  const currentSummary = ref('');
  const isGenerating = ref(false);
  const streamingText = ref('');
  const messageListRevision = ref(0);
  const useStreaming = ref(readStreamingEnabledSetting());
  const forbidMatchingXmlInsideThink = ref(readForbidMatchingXmlInsideThinkSetting());
  const autoSummaryEnabled = ref(readAutoSummaryEnabledSetting());
  const summaryVisibleWindow = ref(readSummaryVisibleWindowSetting());
  const buttonCompletionEnabled = ref(readButtonCompletionEnabledSetting());
  const fastModeEnabled = ref(readFastModeEnabledSetting());
  const error = ref<string | null>(null);
  const isInitialized = ref(false);

  // ── 特殊选项标记 ──
  const parsedHasOptionE = ref(false);
  const parsedHasLeave = ref(false);
  const parsedHasRebirth = ref(false);
  const manualHasOptionE = ref(false);
  const manualHasLeave = ref(false);
  const manualHasRebirth = ref(false);
  const hasOptionE = computed(() => parsedHasOptionE.value || manualHasOptionE.value);
  const hasLeave = computed(() => parsedHasLeave.value || manualHasLeave.value);
  const hasRebirth = computed(() => parsedHasRebirth.value || manualHasRebirth.value);
  const variableUpdateText = ref('');
  const lastResolvedAssistantMessageId = ref(-1);

  // ── 编辑模式 ──
  const isEditing = ref(false);
  const editingText = ref('');
  const pendingFinalAreaEditNotice = ref<string | null>(null);
  const pendingFinalAreaRollbackNotice = ref<string | null>(null);

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
    resetPath?: boolean;
    appendPathLabel?: string;
  }
  interface PendingCombatMvuChanges {
    hp?: number;
    addDefeatMark?: boolean;
    goldDelta?: number;
    negativeStatusesAdd?: string[];
    negativeStatusesRemove?: string[];
  }
  interface PendingStatDataChanges {
    fields: Record<string, any>;
  }
  interface FastActionEvent {
    id: string;
    type: string;
    text: string;
    important: boolean;
  }
  interface FastActionInput {
    type?: string;
    text: string;
    important?: boolean;
  }
  interface PersistedFastModeBuffer {
    version: 1;
    baseMessageId: number | null;
    events: FastActionEvent[];
    mvuData: any | null;
  }
  const pendingPortalChanges = ref<PendingPortalChanges | null>(null);
  const pendingCombatMvuChanges = ref<PendingCombatMvuChanges | null>(null);
  const pendingStatDataChanges = ref<PendingStatDataChanges | null>(null);
  const fastActionEvents = ref<FastActionEvent[]>([]);
  const fastModeBaseMessageId = ref<number | null>(null);
  const fastModeBufferUserMessageId = ref<number | null>(null);
  const fastModeMvuData = ref<any | null>(null);
  const fastModeBufferActive = computed(() => fastModeBufferUserMessageId.value !== null && fastActionEvents.value.length > 0);

  const getResponseParserOptions = (): ResponseParserOptions => ({
    forbidMatchingXmlInsideThink: forbidMatchingXmlInsideThink.value,
  });

  const getGeneratedText = (result: string | GenerateToolCallResult): string => {
    if (typeof result === 'string') return result;
    return typeof result.content === 'string' ? result.content : '';
  };

  type ButtonCompletionTarget = 'special' | 'leave' | 'rebirth';

  function clearManualButtonCompletion() {
    manualHasOptionE.value = false;
    manualHasLeave.value = false;
    manualHasRebirth.value = false;
  }

  function setParsedOptionFlags(flags: Pick<ParsedResponse, 'hasOptionE' | 'hasLeave' | 'hasRebirth'>) {
    parsedHasOptionE.value = Boolean(flags.hasOptionE);
    parsedHasLeave.value = Boolean(flags.hasLeave);
    parsedHasRebirth.value = Boolean(flags.hasRebirth);
  }

  function syncParsedOptionFlagsForAssistantMessage(
    assistantMessageId: number,
    flags: Pick<ParsedResponse, 'hasOptionE' | 'hasLeave' | 'hasRebirth'>,
  ) {
    if (assistantMessageId !== lastResolvedAssistantMessageId.value) {
      clearManualButtonCompletion();
      lastResolvedAssistantMessageId.value = assistantMessageId;
    }
    setParsedOptionFlags(flags);
  }

  function setManualButtonCompletion(target: ButtonCompletionTarget, enabled: boolean) {
    switch (target) {
      case 'special':
        manualHasOptionE.value = enabled;
        break;
      case 'leave':
        manualHasLeave.value = enabled;
        break;
      case 'rebirth':
        manualHasRebirth.value = enabled;
        break;
    }
  }

  function showManualButtonCompletion(target: ButtonCompletionTarget) {
    if (!buttonCompletionEnabled.value) return;
    setManualButtonCompletion(target, true);
  }

  function hideManualButtonCompletion(target: ButtonCompletionTarget) {
    setManualButtonCompletion(target, false);
  }

  function setPendingPortalChanges(changes: PendingPortalChanges) {
    pendingPortalChanges.value = changes;
  }

  function setPendingCombatMvuChanges(changes: PendingCombatMvuChanges | null) {
    pendingCombatMvuChanges.value = changes ? _.cloneDeep(changes) : null;
  }

  function setPendingStatDataChanges(fields: Record<string, any> | null) {
    pendingStatDataChanges.value = fields ? { fields: _.cloneDeep(fields) } : null;
    previewPendingStatDataChangesForFastMode();
  }

  function mergePendingStatDataChanges(fields: Record<string, any> | null) {
    if (!fields || typeof fields !== 'object') return;
    const base = pendingStatDataChanges.value?.fields ?? {};
    pendingStatDataChanges.value = {
      fields: {
        ..._.cloneDeep(base),
        ..._.cloneDeep(fields),
      },
    };
    previewPendingStatDataChangesForFastMode();
  }

  function clearPendingStatDataFields(keys: Iterable<string>) {
    if (!pendingStatDataChanges.value) return;
    const keySet = new Set(Array.from(keys).filter(key => typeof key === 'string' && key.length > 0));
    if (keySet.size === 0) return;

    const nextFields = _.cloneDeep(pendingStatDataChanges.value.fields ?? {});
    for (const key of keySet) {
      delete nextFields[key];
    }

    pendingStatDataChanges.value = Object.keys(nextFields).length > 0 ? { fields: nextFields } : null;
  }

  const AUTO_SUMMARY_ENTRY_NAME = '自动总结条目';
  const AUTO_SUMMARY_ENTRY_UID = 0;
  const AUTO_SUMMARY_TITLE = '以下为已经发生了的剧情：';

  interface ChronicleEntry {
    index: number;
    summary: string;
  }

  interface BigSummaryGenerateInput {
    rangeStart: number;
    rangeEnd: number;
    minWords: number;
    maxWords: number;
  }

  interface BigSummaryGenerateResult {
    summary: string;
    rangeStart: number;
    rangeEnd: number;
    entryCount: number;
  }

  interface BigSummaryApplyInput {
    rangeStart: number;
    rangeEnd: number;
    summaryText: string;
  }

  interface BigSummaryApplyResult {
    mergedIndex: number;
    removedCount: number;
  }

  const stripSummaryDecorators = (text: string): string =>
    text
      .replace(/^[\s\u3000]*[[（(［【]\s*事件总结\s*[\]）)］】]\s*/u, '')
      .replace(/[\s\u3000]+/gu, ' ')
      .trim();

  const normalizeSummaryText = (text: string): string => stripSummaryDecorators(text.replace(/\r?\n+/g, ' '));

  const parseChronicleContent = (content: string): ChronicleEntry[] => {
    const map = new Map<number, string>();
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === AUTO_SUMMARY_TITLE) continue;
      const legacyMatch = /^\[编号\s*(\d+)\]\s*(.+)$/u.exec(trimmed);
      const orderedMatch = /^(\d+)\.\s*(.+)$/u.exec(trimmed);
      const match = legacyMatch ?? orderedMatch;
      if (!match) continue;
      const index = Number(match[1]);
      const summary = normalizeSummaryText(match[2] ?? '');
      if (!Number.isFinite(index) || index < 0 || !summary) continue;
      if (!map.has(index)) {
        map.set(index, summary);
      }
    }
    return Array.from(map.entries())
      .map(([index, summary]) => ({ index, summary }))
      .sort((a, b) => a.index - b.index);
  };

  const formatChronicleContent = (entries: ChronicleEntry[]): string => {
    if (entries.length === 0) return AUTO_SUMMARY_TITLE;
    const lines = [...entries].sort((a, b) => a.index - b.index).map(entry => `${entry.index}. ${entry.summary}`);
    return `${AUTO_SUMMARY_TITLE}\n${lines.join('\n')}`;
  };

  const upsertChronicleEntry = (entries: ChronicleEntry[], index: number, summary: string): ChronicleEntry[] => {
    const map = new Map<number, string>();
    for (const entry of entries) {
      if (!map.has(entry.index)) {
        map.set(entry.index, entry.summary);
      }
    }
    if (map.has(index)) {
      map.set(index, summary);
      for (const key of Array.from(map.keys())) {
        if (key > index) {
          map.delete(key);
        }
      }
    } else {
      map.set(index, summary);
    }
    return Array.from(map.entries())
      .map(([idx, sum]) => ({ index: idx, summary: sum }))
      .sort((a, b) => a.index - b.index);
  };

  const removeChronicleEntriesFrom = (entries: ChronicleEntry[], index: number): ChronicleEntry[] => {
    if (!Number.isFinite(index) || index < 0) return entries;
    return entries.filter(entry => entry.index < index).sort((a, b) => a.index - b.index);
  };

  const getBoundWorldbookNames = (): string[] => {
    const names = new Set<string>();
    try {
      const charWorldbooks = getCharWorldbookNames('current');
      if (charWorldbooks.primary) {
        names.add(charWorldbooks.primary);
      }
      for (const name of charWorldbooks.additional ?? []) {
        if (name) names.add(name);
      }
    } catch {
      // noop
    }
    try {
      const chatWorldbook = getChatWorldbookName('current');
      if (chatWorldbook) {
        names.add(chatWorldbook);
      }
    } catch {
      // noop
    }
    return Array.from(names);
  };

  const OPENING_WATERMARK = '【【】】';

  const normalizeFreshChatMessage = (message: unknown): string =>
    typeof message === 'string' ? message.replaceAll(OPENING_WATERMARK, '').replace(/\s+/gu, '').trim() : '';

  const isFreshChatSession = (): boolean => {
    const lastId = getLastMessageId();
    return lastId <= 0;
  };

  const overwriteUserWorldbookEntryContent = async (content: string): Promise<boolean> => {
    const worldbookNames = getBoundWorldbookNames();
    if (worldbookNames.length === 0) return false;

    let updatedAny = false;

    for (const worldbookName of worldbookNames) {
      try {
        const worldbook = await getWorldbook(worldbookName);
        const hasUserEntry = worldbook.some(entry => entry.name?.trim() === 'user');
        if (!hasUserEntry) continue;

        await updateWorldbookWith(
          worldbookName,
          entries =>
            entries.map(entry =>
              entry.name?.trim() !== 'user'
                ? entry
                : {
                    ...entry,
                    content,
                  },
            ),
          { render: 'debounced' },
        );
        updatedAny = true;
      } catch (err) {
        console.warn('[GameStore] overwriteUserWorldbookEntryContent failed:', err);
      }
    }

    return updatedAny;
  };

  const getWorldbookEntryContentByName = async (entryName: string): Promise<string | null> => {
    const normalizedName = entryName.trim();
    if (!normalizedName) return null;

    const worldbookNames = getBoundWorldbookNames();
    for (const worldbookName of worldbookNames) {
      try {
        const worldbook = await getWorldbook(worldbookName);
        const matchedEntry = worldbook.find(entry => entry.name?.trim() === normalizedName);
        const content = typeof matchedEntry?.content === 'string' ? matchedEntry.content.trim() : '';
        if (content) return content;
      } catch (err) {
        console.warn('[GameStore] getWorldbookEntryContentByName failed:', err);
      }
    }

    return null;
  };

  const generateOpeningBackstoryDraft = async (profile: OpeningInfoSubmission): Promise<string> => {
    const witchSetting = await getWorldbookEntryContentByName('魔女');
    if (!witchSetting) {
      throw new Error('未找到世界书条目“魔女”。');
    }

    const prompt = buildOpeningBackstoryDraftPrompt(
      {
        race: profile.race,
        name: profile.name,
        age: profile.age,
        chastity: profile.chastity,
        talent: profile.talent,
        appearance: profile.appearance,
        traits: profile.traits,
        heightCm: profile.heightCm,
        weightType: profile.weightType,
        bust: profile.bust,
        hips: profile.hips,
        sensitivePoints: profile.sensitivePoints,
        existingBackstory: profile.backstory,
      },
      FIXED_OPENING_BACKGROUND_SETTING,
      witchSetting,
    );

    const result = await generateRaw({
      should_silence: true,
      should_stream: false,
      max_chat_history: 0,
      ordered_prompts: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const draft = getGeneratedText(result).trim();
    if (!draft) {
      throw new Error('AI 未返回有效的背景故事内容。');
    }
    return draft;
  };

  const resolveAutoSummaryEntryTarget = async (): Promise<{ worldbookName: string; uid: number } | null> => {
    const worldbookNames = getBoundWorldbookNames();
    for (const worldbookName of worldbookNames) {
      try {
        const worldbook = await getWorldbook(worldbookName);
        const entry =
          worldbook.find(item => item.name?.trim() === AUTO_SUMMARY_ENTRY_NAME) ??
          worldbook.find(item => item.uid === AUTO_SUMMARY_ENTRY_UID);
        if (entry) {
          return { worldbookName, uid: entry.uid };
        }
      } catch {
        // noop
      }
    }
    return null;
  };

  const loadAutoSummaryChronicleEntries = async (): Promise<ChronicleEntry[]> => {
    const target = await resolveAutoSummaryEntryTarget();
    if (!target) return [];

    try {
      const worldbook = await getWorldbook(target.worldbookName);
      const matchedEntry = worldbook.find(entry => entry.uid === target.uid);
      if (!matchedEntry) return [];
      return parseChronicleContent(matchedEntry.content ?? '');
    } catch (err) {
      console.warn('[GameStore] loadAutoSummaryChronicleEntries failed:', err);
      return [];
    }
  };

  const normalizeWordRange = (minWords: number, maxWords: number): { min: number; max: number } => {
    const rawMin = Number.isFinite(minWords) ? Math.floor(minWords) : 200;
    const rawMax = Number.isFinite(maxWords) ? Math.floor(maxWords) : 600;
    const clampedMin = Math.max(50, Math.min(10000, rawMin));
    const clampedMax = Math.max(50, Math.min(10000, rawMax));
    if (clampedMin <= clampedMax) {
      return { min: clampedMin, max: clampedMax };
    }
    return { min: clampedMax, max: clampedMin };
  };

  const normalizeRange = (rangeStart: number, rangeEnd: number): { start: number; end: number } => {
    const start = Number.isFinite(rangeStart) ? Math.floor(rangeStart) : 0;
    const end = Number.isFinite(rangeEnd) ? Math.floor(rangeEnd) : 0;
    if (start <= end) return { start, end };
    return { start: end, end: start };
  };

  const formatBigSummaryPrompt = (entries: ChronicleEntry[], minWords: number, maxWords: number): string => {
    const lines = entries.map(entry => `${entry.index}. ${entry.summary}`).join('\n');

    return [
      `我将为你提供一段故事的不同阶段小结。请你将这些片段深度整合，重构为一篇 ${minWords}到${maxWords} 字左右的完整剧情总结。`,
      '要求：',
      '消除冗余：合并各小结中重复的人物介绍和背景说明。',
      '宏观视角：不要只是拼接，要从全局高度概括故事的起因、高潮和最终走向。',
      '纯净输出：不输出任何开场白，干净、精确、无废话、不丢失关键信息地直接输出总结文本，不要有其他结果。',
      '',
      lines,
    ].join('\n');
  };

  const generateBigSummary = async (input: BigSummaryGenerateInput): Promise<BigSummaryGenerateResult> => {
    const allEntries = await loadAutoSummaryChronicleEntries();
    if (allEntries.length === 0) {
      throw new Error('当前没有可用于大总结的小总结条目。');
    }

    const normalizedRange = normalizeRange(input.rangeStart, input.rangeEnd);
    const selectedEntries = allEntries.filter(
      entry => entry.index >= normalizedRange.start && entry.index <= normalizedRange.end,
    );
    if (selectedEntries.length === 0) {
      throw new Error('选定范围内没有可总结条目。');
    }

    const words = normalizeWordRange(input.minWords, input.maxWords);
    const prompt = formatBigSummaryPrompt(selectedEntries, words.min, words.max);

    const result = await generateRaw({
      should_silence: true,
      should_stream: false,
      max_chat_history: 0,
      ordered_prompts: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary = getGeneratedText(result).trim();
    if (!summary) {
      throw new Error('AI 未返回有效大总结内容。');
    }

    return {
      summary,
      rangeStart: normalizedRange.start,
      rangeEnd: normalizedRange.end,
      entryCount: selectedEntries.length,
    };
  };

  const applyBigSummary = async (input: BigSummaryApplyInput): Promise<BigSummaryApplyResult> => {
    const target = await resolveAutoSummaryEntryTarget();
    if (!target) {
      throw new Error('未找到自动总结条目。');
    }

    const summary = normalizeSummaryText(input.summaryText ?? '');
    if (!summary) {
      throw new Error('大总结内容为空，无法覆盖。');
    }

    const normalizedRange = normalizeRange(input.rangeStart, input.rangeEnd);
    const baseEntries = await loadAutoSummaryChronicleEntries();
    if (baseEntries.length === 0) {
      throw new Error('当前没有可覆盖的小总结条目。');
    }

    const hasTarget = baseEntries.some(
      entry => entry.index >= normalizedRange.start && entry.index <= normalizedRange.end,
    );
    if (!hasTarget) {
      throw new Error('选定范围内没有可覆盖条目。');
    }

    const nextEntries = baseEntries.filter(
      entry => entry.index < normalizedRange.start || entry.index > normalizedRange.end,
    );
    nextEntries.push({
      index: normalizedRange.start,
      summary,
    });
    nextEntries.sort((a, b) => a.index - b.index);

    try {
      await updateWorldbookWith(
        target.worldbookName,
        worldbook =>
          worldbook.map(entry =>
            entry.uid !== target.uid
              ? entry
              : {
                  ...entry,
                  content: formatChronicleContent(nextEntries),
                },
          ),
        { render: 'debounced' },
      );
    } catch (err) {
      console.warn('[GameStore] applyBigSummary failed:', err);
      throw new Error('覆盖自动总结条目失败。');
    }

    return {
      mergedIndex: normalizedRange.start,
      removedCount: Math.max(0, normalizedRange.end - normalizedRange.start),
    };
  };

  const overwriteAutoSummaryEntryContent = async (content: string) => {
    const target = await resolveAutoSummaryEntryTarget();
    if (!target) return false;

    try {
      await updateWorldbookWith(
        target.worldbookName,
        worldbook =>
          worldbook.map(entry =>
            entry.uid !== target.uid
              ? entry
              : {
                  ...entry,
                  content,
                },
          ),
        { render: 'debounced' },
      );
      return true;
    } catch (err) {
      console.warn('[GameStore] overwriteAutoSummaryEntryContent failed:', err);
      return false;
    }
  };

  const updateAutoSummaryChronicle = async (assistantMessageId: number, summaryText: string) => {
    if (!autoSummaryEnabled.value) return;
    const normalizedSummary = normalizeSummaryText(summaryText);
    if (!normalizedSummary) return;

    const target = await resolveAutoSummaryEntryTarget();
    if (!target) return;

    const chronicleIndex = Math.floor(assistantMessageId / 2);
    if (!Number.isFinite(chronicleIndex) || chronicleIndex < 0) return;

    try {
      await updateWorldbookWith(
        target.worldbookName,
        worldbook => {
          return worldbook.map(entry => {
            if (entry.uid !== target.uid) return entry;
            const parsedEntries = parseChronicleContent(entry.content ?? '');
            const nextEntries = upsertChronicleEntry(parsedEntries, chronicleIndex, normalizedSummary);
            return {
              ...entry,
              content: formatChronicleContent(nextEntries),
            };
          });
        },
        { render: 'debounced' },
      );
    } catch (err) {
      console.warn('[GameStore] updateAutoSummaryChronicle failed:', err);
    }
  };

  const removeAutoSummaryChronicleByAssistantMessageId = async (assistantMessageId: number) => {
    const target = await resolveAutoSummaryEntryTarget();
    if (!target) return;

    const chronicleIndex = Math.floor(assistantMessageId / 2);
    if (!Number.isFinite(chronicleIndex) || chronicleIndex < 0) return;

    try {
      await updateWorldbookWith(
        target.worldbookName,
        worldbook =>
          worldbook.map(entry => {
            if (entry.uid !== target.uid) return entry;
            const parsedEntries = parseChronicleContent(entry.content ?? '');
            const nextEntries = removeChronicleEntriesFrom(parsedEntries, chronicleIndex);
            if (nextEntries.length === parsedEntries.length) return entry;
            return {
              ...entry,
              content: formatChronicleContent(nextEntries),
            };
          }),
        { render: 'debounced' },
      );
    } catch (err) {
      console.warn('[GameStore] removeAutoSummaryChronicleByAssistantMessageId failed:', err);
    }
  };

  const rebuildAutoSummaryChronicleFromMessages = async (): Promise<number> => {
    if (!autoSummaryEnabled.value) return 0;
    const target = await resolveAutoSummaryEntryTarget();
    if (!target) return 0;

    const lastId = getLastMessageId();
    const messages = lastId >= 0 ? getChatMessages(`0-${lastId}`, { role: 'assistant', hide_state: 'all' }) : [];

    const map = new Map<number, string>();
    for (const msg of messages) {
      const summary = normalizeSummaryText(extractSummary(msg.message ?? '', getResponseParserOptions()));
      if (!summary) continue;
      const chronicleIndex = Math.floor(msg.message_id / 2);
      if (!Number.isFinite(chronicleIndex) || chronicleIndex < 0) continue;
      // 同编号保留最后一条，覆盖可能被回档重写的旧记录
      map.set(chronicleIndex, summary);
    }

    const entries = Array.from(map.entries())
      .map(([index, summary]) => ({ index, summary }))
      .sort((a, b) => a.index - b.index);

    try {
      await updateWorldbookWith(
        target.worldbookName,
        worldbook =>
          worldbook.map(entry =>
            entry.uid !== target.uid
              ? entry
              : {
                  ...entry,
                  content: formatChronicleContent(entries),
                },
          ),
        { render: 'debounced' },
      );
      return entries.length;
    } catch (err) {
      console.warn('[GameStore] rebuildAutoSummaryChronicleFromMessages failed:', err);
      return -1;
    }
  };

  const ensureLatestMessageWindow = async (maxVisible: number = summaryVisibleWindow.value) => {
    try {
      const lastId = getLastMessageId();
      if (lastId < 0) return;
      const visibleWindow = Math.max(1, Math.floor(maxVisible));
      const firstVisibleMessageId = Math.max(0, lastId - visibleWindow + 1);
      const messages = getChatMessages(`0-${lastId}`, { hide_state: 'all' });
      const updates: Array<{ message_id: number; is_hidden: boolean }> = [];

      for (const message of messages) {
        const shouldHide = message.message_id < firstVisibleMessageId;
        if (Boolean(message.is_hidden) === shouldHide) continue;
        updates.push({
          message_id: message.message_id,
          is_hidden: shouldHide,
        });
      }

      if (updates.length === 0) return;
      await setChatMessages(updates, { refresh: 'none' });
    } catch (err) {
      console.warn('[GameStore] ensureLatestMessageWindow failed:', err);
    }
  };

  function setUseStreaming(enabled: boolean) {
    const nextEnabled = Boolean(enabled);
    useStreaming.value = nextEnabled;
    if (!nextEnabled) {
      streamingText.value = '';
    }
    persistStreamingEnabledSetting(nextEnabled);
  }

  function setForbidMatchingXmlInsideThink(enabled: boolean) {
    const nextEnabled = Boolean(enabled);
    forbidMatchingXmlInsideThink.value = nextEnabled;
    persistForbidMatchingXmlInsideThinkSetting(nextEnabled);
    loadLatestAssistantState();
  }

  async function setAutoSummaryEnabled(enabled: boolean) {
    const nextEnabled = Boolean(enabled);
    autoSummaryEnabled.value = nextEnabled;
    persistAutoSummaryEnabledSetting(nextEnabled);

    if (!nextEnabled) {
      await overwriteAutoSummaryEntryContent('');
      return;
    }

    await rebuildAutoSummaryChronicleFromMessages();
  }

  async function setSummaryVisibleWindow(value: number) {
    const nextVisibleWindow = normalizeSummaryVisibleWindow(value);
    summaryVisibleWindow.value = nextVisibleWindow;
    persistSummaryVisibleWindowSetting(nextVisibleWindow);
    await ensureLatestMessageWindow(nextVisibleWindow);
  }

  function setButtonCompletionEnabled(enabled: boolean) {
    const nextEnabled = Boolean(enabled);
    buttonCompletionEnabled.value = nextEnabled;
    persistButtonCompletionEnabledSetting(nextEnabled);
    if (!nextEnabled) {
      clearManualButtonCompletion();
    }
  }

  function setFastModeEnabled(enabled: boolean) {
    const nextEnabled = Boolean(enabled);
    if (!nextEnabled && fastModeBufferActive.value) {
      error.value = '剧情精简模式正在缓冲行动，请先完成下一次 AI 请求。';
      return;
    }
    fastModeEnabled.value = nextEnabled;
    persistFastModeEnabledSetting(nextEnabled);
    if (!nextEnabled) {
      clearFastModeBuffer();
      return;
    }
    activateFastModeRuntime();
  }

  function syncFloorNumberByArea(mvuData: any) {
    if (!mvuData || typeof mvuData !== 'object') return mvuData;
    const stat = _.get(mvuData, 'stat_data');
    if (!stat || typeof stat !== 'object') return mvuData;

    const area = typeof stat._当前区域 === 'string' ? stat._当前区域.trim() : '';
    if (!area) return mvuData;

    stat._楼层数 = getFloorNumberForArea(area);
    return mvuData;
  }

  function isInFinalArea(): boolean {
    return String(statData.value?._当前区域 ?? '').trim() === FINAL_AREA_NAME;
  }

  function isMvuInFinalArea(mvuData: any): boolean {
    const area = String(_.get(mvuData, 'stat_data._当前区域') ?? '').trim();
    return area === FINAL_AREA_NAME;
  }

  function truncateMetaSnippet(text: string, maxLength = META_SNIPPET_MAX_LENGTH): string {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
  }

  function countNonEmptyLines(text: string): number {
    return text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .filter(line => line.trim().length > 0).length;
  }

  function buildEditChangeSummary(originalText: string, nextText: string): string {
    if (originalText === nextText) {
      return '玩家触碰了刚才那一幕的文字，但最终没有留下可见改动。';
    }

    let prefixLength = 0;
    const minLength = Math.min(originalText.length, nextText.length);
    while (prefixLength < minLength && originalText[prefixLength] === nextText[prefixLength]) {
      prefixLength += 1;
    }

    let suffixLength = 0;
    while (
      suffixLength < originalText.length - prefixLength &&
      suffixLength < nextText.length - prefixLength &&
      originalText[originalText.length - 1 - suffixLength] === nextText[nextText.length - 1 - suffixLength]
    ) {
      suffixLength += 1;
    }

    const removed = originalText.slice(prefixLength, originalText.length - suffixLength);
    const added = nextText.slice(prefixLength, nextText.length - suffixLength);
    const removedLines = countNonEmptyLines(removed);
    const addedLines = countNonEmptyLines(added);
    const parts = [
      `玩家改写了刚才那一幕。被抹去约 ${removed.length} 个字符/${removedLines} 行，新写入约 ${added.length} 个字符/${addedLines} 行。`,
    ];

    if (removed.trim()) {
      parts.push(`被删除或替换的片段：\n${truncateMetaSnippet(removed)}`);
    }
    if (added.trim()) {
      parts.push(`新增或替换后的片段：\n${truncateMetaSnippet(added)}`);
    }
    return parts.join('\n');
  }

  function buildRollbackChangeSummary(
    fromMessageId: number,
    targetMessageId: number,
    crossedSummaries: Array<{ messageId: number; summary: string }>,
  ): string {
    const timeUnitCount = crossedSummaries.length;
    const parts = [
      `玩家折回了终极区域的时间线：从时间刻度 ${fromMessageId} 回到时间刻度 ${targetMessageId}，跨过 ${timeUnitCount} 段残影。`,
    ];

    if (crossedSummaries.length > 0) {
      parts.push(
        [
          '被折回的残影：',
          ...crossedSummaries.map(entry => `- 时间刻度 ${entry.messageId}：${entry.summary}`),
        ].join('\n'),
      );
    } else {
      parts.push('被折回的时间里没有留下清晰残影。');
    }

    return parts.join('\n');
  }

  function collectRollbackSummaries(targetMessageId: number, lastMessageId: number): Array<{ messageId: number; summary: string }> {
    if (targetMessageId >= lastMessageId) return [];
    const messages = getChatMessages(`0-${lastMessageId}`, { role: 'assistant' });
    return messages
      .filter(msg => msg.message_id > targetMessageId && msg.message_id <= lastMessageId)
      .map(msg => ({
        messageId: msg.message_id,
        summary: extractSummary(msg.message, getResponseParserOptions()).trim(),
      }))
      .filter(entry => entry.summary.length > 0);
  }

  function appendFinalAreaMetaNotices(userInput: string, notices: Array<string | null>): string {
    const activeNotices = notices.filter((notice): notice is string => Boolean(notice?.trim()));
    if (activeNotices.length === 0) return userInput;
    return `${userInput.trim()}\n\n<命运涟漪>\n${activeNotices.join('\n\n')}\n</命运涟漪>`;
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

    const currentPath = Array.isArray(sd.$路径)
      ? sd.$路径.filter((item): item is string => typeof item === 'string')
      : Array.isArray(stat.$路径)
        ? stat.$路径.filter((item): item is string => typeof item === 'string')
        : [];
    const nextPath = [...currentPath];
    if (changes.resetPath) {
      nextPath.length = 0;
    }
    if (typeof changes.appendPathLabel === 'string') {
      const normalizedLabel = changes.appendPathLabel.trim();
      if (normalizedLabel) {
        nextPath.push(normalizedLabel);
      }
    }
    sd.$路径 = nextPath;
    if (Object.prototype.hasOwnProperty.call(stat, '$路径')) {
      delete stat.$路径;
    }

    return syncFloorNumberByArea(result);
  }

  function applyPendingCombatChangesToMvu(baseMvuData: any, changes: PendingCombatMvuChanges | null) {
    const result = _.cloneDeep(baseMvuData ?? {});
    if (!result.stat_data || typeof result.stat_data !== 'object') {
      result.stat_data = {};
    }
    const sd = result.stat_data as Record<string, any>;

    if (!changes) return result;

    if (Number.isFinite(changes.hp)) {
      sd._血量 = Math.max(0, Math.floor(Number(changes.hp)));
    }

    if (changes.addDefeatMark) {
      const raw = sd.$负面状态;
      const base = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
      if (!base.includes('[败北]')) {
        base.push('[败北]');
      }
      sd.$负面状态 = base;
    }

    if (Array.isArray(changes.negativeStatusesAdd) && changes.negativeStatusesAdd.length > 0) {
      const raw = sd.$负面状态;
      const base = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
      for (const status of changes.negativeStatusesAdd) {
        if (typeof status !== 'string') continue;
        const normalized = status.trim();
        if (!normalized) continue;
        if (!base.includes(normalized)) {
          base.push(normalized);
        }
      }
      sd.$负面状态 = base;
    }

    if (Array.isArray(changes.negativeStatusesRemove) && changes.negativeStatusesRemove.length > 0) {
      const raw = sd.$负面状态;
      const base = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
      const removeSet = new Set(
        changes.negativeStatusesRemove
          .filter((status): status is string => typeof status === 'string')
          .map(status => status.trim())
          .filter(status => status.length > 0),
      );
      sd.$负面状态 = removeSet.size > 0 ? base.filter(status => !removeSet.has(status)) : base;
    }

    if (Number.isFinite(changes.goldDelta)) {
      const currentGold = Math.max(0, Math.floor(Number(sd._金币 ?? 0)));
      const delta = Math.floor(Number(changes.goldDelta));
      sd._金币 = Math.max(0, currentGold + delta);
    }

    return result;
  }

  function applyPendingStatDataChangesToMvu(baseMvuData: any, changes: PendingStatDataChanges | null) {
    const result = _.cloneDeep(baseMvuData ?? {});
    if (!result.stat_data || typeof result.stat_data !== 'object') {
      result.stat_data = {};
    }
    const sd = result.stat_data as Record<string, any>;

    if (!changes || !changes.fields || typeof changes.fields !== 'object') return result;

    Object.assign(sd, _.cloneDeep(changes.fields));
    return syncFloorNumberByArea(result);
  }

  function previewPendingStatDataChangesForFastMode() {
    if (!fastModeEnabled.value || !pendingStatDataChanges.value) return;
    try {
      const base = getFastModeBaseMvuData();
      const nextMvuData = applyPendingStatDataChangesToMvu(base, pendingStatDataChanges.value);
      fastModeMvuData.value = _.cloneDeep(nextMvuData);
      refreshLocalStatData(nextMvuData);
      persistFastModeBufferToChatVariables();
      if (fastModeBufferActive.value) {
        void syncFastModeBufferUserMessage();
      }
    } catch (err) {
      console.warn('[GameStore] previewPendingStatDataChangesForFastMode failed:', err);
    }
  }

  function clearFastModeBuffer() {
    fastActionEvents.value = [];
    fastModeBaseMessageId.value = null;
    fastModeBufferUserMessageId.value = null;
    fastModeMvuData.value = null;
    manualHasOptionE.value = false;
    manualHasLeave.value = false;
    persistFastModeBufferToChatVariables();
  }

  function persistFastModeBufferToChatVariables() {
    try {
      updateVariablesWith(variables => {
        const nextVariables = _.cloneDeep(variables ?? {});
        _.unset(nextVariables, FAST_MODE_CHAT_VARIABLE_KEY);
        return nextVariables;
      }, { type: 'chat' });
    } catch (err) {
      console.warn('[GameStore] persistFastModeBufferToChatVariables failed:', err);
    }
  }

  function normalizePersistedFastActionEvents(value: unknown): FastActionEvent[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item): FastActionEvent | null => {
        if (!item || typeof item !== 'object') return null;
        const raw = item as Record<string, unknown>;
        const text = typeof raw.text === 'string' ? normalizeFastActionText(raw.text) : '';
        if (!text) return null;
        return {
          id: typeof raw.id === 'string' && raw.id ? raw.id : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          type: typeof raw.type === 'string' && raw.type ? raw.type : 'action',
          text,
          important: raw.important !== false,
        };
      })
      .filter((item): item is FastActionEvent => item !== null);
  }

  function loadFastModeBufferFromChatVariables(): boolean {
    try {
      const variables = getVariables({ type: 'chat' });
      const raw = _.get(variables, FAST_MODE_CHAT_VARIABLE_KEY);
      if (!raw || typeof raw !== 'object') return false;

      const payload = raw as Partial<PersistedFastModeBuffer>;
      if (payload.version !== 1) return false;

      const currentLastMessageId = getLastMessageId();
      const baseMessageId =
        typeof payload.baseMessageId === 'number' && Number.isFinite(payload.baseMessageId)
          ? Math.floor(payload.baseMessageId)
          : null;
      if (baseMessageId !== null && currentLastMessageId >= 0 && baseMessageId !== currentLastMessageId) {
        console.info('[GameStore] Dropping stale fast mode buffer from chat variables');
        clearFastModeBuffer();
        return false;
      }

      const restoredEvents = normalizePersistedFastActionEvents(payload.events);
      const restoredMvuData = payload.mvuData;
      if (!restoredMvuData || typeof restoredMvuData !== 'object') return false;

      fastModeBaseMessageId.value = baseMessageId;
      fastActionEvents.value = restoredEvents;
      fastModeMvuData.value = _.cloneDeep(restoredMvuData);
      refreshLocalStatData(fastModeMvuData.value);
      if (fastModeEnabled.value) {
        updateFastModeDisplay();
      }
      return true;
    } catch (err) {
      console.warn('[GameStore] loadFastModeBufferFromChatVariables failed:', err);
      return false;
    }
  }

  function isFastModeBufferMessage(message: unknown): boolean {
    if (typeof message !== 'string') return false;
    return message.includes(FAST_MODE_BUFFER_EVENTS_TITLE) && message.includes('以下内容来自剧情精简模式');
  }

  function getTailFastModeBufferUserMessage(): any | null {
    const lastId = getLastMessageId();
    if (lastId < 0) return null;
    const latestMessages = getChatMessages(`${lastId}-${lastId}`);
    const latestMessage = latestMessages[0];
    if (!latestMessage || latestMessage.role !== 'user') return null;
    return isFastModeBufferMessage(latestMessage.message) ? latestMessage : null;
  }

  function parseFastActionEventsFromBufferMessage(message: unknown): FastActionEvent[] {
    if (typeof message !== 'string') return [];
    const events: FastActionEvent[] = [];
    let inEventBlock = false;
    for (const rawLine of message.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line === FAST_MODE_BUFFER_EVENTS_TITLE) {
        inEventBlock = true;
        continue;
      }
      if (!inEventBlock) continue;
      if (line.startsWith('【')) break;
      const match = line.match(/^\d+\.\s*(.+)$/u);
      if (!match?.[1]) continue;
      const text = normalizeFastActionText(match[1]);
      if (!text || text.startsWith('（')) continue;
      events.push({
        id: `restored-${events.length}-${Date.now()}`,
        type: 'action',
        text,
        important: true,
      });
    }
    return events;
  }

  function findLatestAssistantMessageIdBefore(messageId: number): number {
    if (!Number.isFinite(messageId) || messageId <= 0) return -1;
    const assistantMessages = getChatMessages(`0-${Math.floor(messageId) - 1}`, { role: 'assistant' });
    if (assistantMessages.length === 0) return -1;
    return assistantMessages[assistantMessages.length - 1].message_id;
  }

  function restoreFastModeBufferFromTailUser(): boolean {
    const tailMessage = getTailFastModeBufferUserMessage();
    if (!tailMessage) return false;

    const restoredEvents = parseFastActionEventsFromBufferMessage(tailMessage.message);
    if (restoredEvents.length === 0) return false;

    const mvuData = Mvu.getMvuData({ type: 'message', message_id: tailMessage.message_id });
    if (!mvuData || typeof mvuData !== 'object') return false;

    fastModeBufferUserMessageId.value = tailMessage.message_id;
    const baseMessageId = findLatestAssistantMessageIdBefore(tailMessage.message_id);
    fastModeBaseMessageId.value = baseMessageId >= 0 ? baseMessageId : null;
    fastActionEvents.value = restoredEvents;
    fastModeMvuData.value = _.cloneDeep(mvuData);
    refreshLocalStatData(fastModeMvuData.value);
    updateFastModeDisplay();
    persistFastModeBufferToChatVariables();
    return true;
  }

  function getFastModeBaseMvuData() {
    if (fastModeMvuData.value) return _.cloneDeep(fastModeMvuData.value);

    const lastId = getLastMessageId();
    fastModeBaseMessageId.value = lastId >= 0 ? lastId : null;
    const base = lastId >= 0 ? Mvu.getMvuData({ type: 'message', message_id: lastId }) : {};
    fastModeMvuData.value = _.cloneDeep(base ?? {});
    return _.cloneDeep(fastModeMvuData.value);
  }

  function activateFastModeRuntime() {
    if (restoreFastModeBufferFromTailUser()) return;
    if (loadFastModeBufferFromChatVariables()) {
      void syncFastModeBufferUserMessage();
      return;
    }
    try {
      const base = getFastModeBaseMvuData();
      refreshLocalStatData(base);
      exposeFastModeInteractionButtons();
      persistFastModeBufferToChatVariables();
    } catch (err) {
      console.warn('[GameStore] activateFastModeRuntime failed:', err);
    }
  }

  function applyQueuedPendingChangesToMvu(baseMvuData: any) {
    const currentPendingPortalChanges = pendingPortalChanges.value;
    const currentPendingCombatChanges = pendingCombatMvuChanges.value;
    const currentPendingStatDataChanges = pendingStatDataChanges.value;

    const afterPortal = applyPendingPortalChangesToMvu(baseMvuData, currentPendingPortalChanges);
    const afterCombat = applyPendingCombatChangesToMvu(afterPortal, currentPendingCombatChanges);
    const afterStatData = applyPendingStatDataChangesToMvu(afterCombat, currentPendingStatDataChanges);
    syncFloorNumberByArea(afterStatData);

    pendingPortalChanges.value = null;
    pendingCombatMvuChanges.value = null;
    pendingStatDataChanges.value = null;

    return afterStatData;
  }

  function normalizeFastActionText(text: string): string {
    return text
      .replace(/<\s*user\s*>/giu, '')
      .replace(/\s+/gu, ' ')
      .trim();
  }

  function getFastModeCurrentRoomType(): string {
    const sd = _.get(fastModeMvuData.value, 'stat_data') ?? statData.value;
    return typeof sd?._当前房间类型 === 'string' ? sd._当前房间类型.trim() : '';
  }

  function exposeFastModeInteractionButtons() {
    const roomType = getFastModeCurrentRoomType();
    const roomHasSpecial = ['宝箱房', '商店房', '温泉房', '神像房', '战斗房', '领主房'].includes(roomType);
    manualHasOptionE.value = roomHasSpecial;
    manualHasLeave.value = true;
  }

  function updateFastModeDisplay() {
    const lines = fastActionEvents.value.map((event, index) => `${index + 1}. ${normalizeFastActionText(event.text)}`);
    mainText.value = lines.length > 0 ? `${FAST_MODE_BUFFER_TITLE}\n${lines.join('\n')}` : mainText.value;
    options.value = [];
    currentSummary.value = lines.join(' ');
    variableUpdateText.value = '';
    exposeFastModeInteractionButtons();
  }

  async function queueFastAction(input: string | FastActionInput): Promise<boolean> {
    const payload: FastActionInput = typeof input === 'string' ? { text: input } : input;
    const text = normalizeFastActionText(payload.text);
    if (!fastModeEnabled.value || !text) return false;

    try {
      const base = getFastModeBaseMvuData();
      const nextMvuData = applyQueuedPendingChangesToMvu(base);
      fastModeMvuData.value = _.cloneDeep(nextMvuData);
      refreshLocalStatData(nextMvuData);

      fastActionEvents.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        type: payload.type ?? 'action',
        text,
        important: payload.important !== false,
      });
      persistFastModeBufferToChatVariables();
      updateFastModeDisplay();
      const synced = await syncFastModeBufferUserMessage();
      if (!synced) return false;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] queueFastAction error:', msg);
      error.value = `剧情精简模式记录失败: ${msg}`;
      return false;
    }
  }

  function formatFastModeStateSnapshot(mvuData: any): string {
    const sd = _.get(mvuData, 'stat_data') ?? {};
    const stats = sd.$统计 && typeof sd.$统计 === 'object' ? sd.$统计 : {};
    const path = Array.isArray(sd.$路径) ? sd.$路径.filter((item: unknown): item is string => typeof item === 'string') : [];
    const statuses = Array.isArray(sd.$负面状态)
      ? sd.$负面状态.filter((item: unknown): item is string => typeof item === 'string')
      : [];
    const relics = _.get(sd, '携带的物品._圣遗物');
    const relicText =
      relics && typeof relics === 'object'
        ? Object.entries(relics as Record<string, unknown>)
            .filter(([, value]) => Number(value) > 0)
            .map(([name, value]) => `${name}x${Math.floor(Number(value))}`)
            .join('、')
        : '';

    return [
      `当前区域：${sd._当前区域 ?? '未知'}`,
      `当前房间：${sd._当前房间类型 ?? '未知'}`,
      `当前对手：${sd._对手名称 || '无'}`,
      `生命：${sd._血量 ?? '?'} / ${sd._血量上限 ?? '?'}`,
      `魔量：${sd.$魔量 ?? '?'}`,
      `金币：${sd._金币 ?? '?'}`,
      `路径：${path.length > 0 ? path.join(' → ') : '未记录'}`,
      `负面状态：${statuses.length > 0 ? statuses.join('、') : '无'}`,
      `圣遗物：${relicText || '无变化或未记录'}`,
      `本层已过房间：${stats.当前层已过房间 ?? 0}`,
    ].join('\n');
  }

  function buildFastModeFlushPrompt(finalActionText?: string): string {
    const eventLines = fastActionEvents.value
      .filter(event => event.important)
      .map((event, index) => `${index + 1}. ${normalizeFastActionText(event.text)}`)
      .join('\n');
    const finalText = normalizeFastActionText(finalActionText ?? '');
    const stateSnapshot = formatFastModeStateSnapshot(fastModeMvuData.value ?? {});

    return [
      '<user>以下内容来自剧情精简模式，均为系统已经结算完成的既成事实。请承认这些事件与最终变量状态，不要回滚、重写、质疑或重新计算它们。',
      '',
      FAST_MODE_BUFFER_EVENTS_TITLE,
      eventLines || '（无额外经过）',
      '',
      '【最终状态】',
      stateSnapshot,
      '',
      '【现在】',
      finalText ? `<user>${finalText}` : '<user>请基于以上既成事实继续当前关键房间剧情。',
    ].join('\n');
  }

  async function syncFastModeBufferUserMessage(finalActionText?: string): Promise<boolean> {
    if (!fastModeEnabled.value || !fastModeMvuData.value) return false;
    if (fastActionEvents.value.length === 0 && !finalActionText?.trim()) return false;

    try {
      const message = buildFastModeFlushPrompt(finalActionText);
      const data = _.cloneDeep(fastModeMvuData.value);
      const tailMessage = getTailFastModeBufferUserMessage();

      if (tailMessage) {
        await setChatMessages(
          [{ message_id: tailMessage.message_id, role: 'user', message, data }],
          { refresh: 'none' },
        );
        fastModeBufferUserMessageId.value = tailMessage.message_id;
      } else {
        await createChatMessages([{ role: 'user', message, data }], { refresh: 'none' });
        fastModeBufferUserMessageId.value = getLastMessageId();
      }

      persistFastModeBufferToChatVariables();
      await ensureLatestMessageWindow();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] syncFastModeBufferUserMessage error:', msg);
      error.value = `剧情精简模式楼层缓冲失败: ${msg}`;
      return false;
    }
  }

  async function flushFastActions(finalActionText?: string): Promise<boolean> {
    const finalActionTextValue = finalActionText ?? '';

    if (!fastModeEnabled.value) {
      if (!finalActionTextValue.trim()) return false;
      return await sendAction(finalActionTextValue);
    }

    if (fastActionEvents.value.length === 0 && !finalActionTextValue.trim()) return false;

    const nextMvuData = applyQueuedPendingChangesToMvu(getFastModeBaseMvuData());
    fastModeMvuData.value = _.cloneDeep(nextMvuData);
    refreshLocalStatData(nextMvuData);

    if (fastActionEvents.value.length === 0) {
      const mvuData = _.cloneDeep(fastModeMvuData.value ?? {});
      const ok = await sendAction(finalActionTextValue, { userMvuDataOverride: mvuData });
      if (ok) {
        clearFastModeBuffer();
      }
      return ok;
    }

    const prompt = buildFastModeFlushPrompt(finalActionText);
    const mvuData = _.cloneDeep(fastModeMvuData.value ?? {});
    const synced = await syncFastModeBufferUserMessage(finalActionText);
    if (!synced) return false;
    const ok = await sendAction(prompt, { userMvuDataOverride: mvuData });
    if (ok) {
      clearFastModeBuffer();
    }
    return ok;
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
        if (fastModeEnabled.value) {
          activateFastModeRuntime();
        }
        await ensureLatestMessageWindow();
        if (!autoSummaryEnabled.value) {
          await overwriteAutoSummaryEntryContent('');
        }
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
      const parserOptions = getResponseParserOptions();
      mainText.value = extractMainText(text, parserOptions);
      options.value = extractOptions(text, parserOptions);
      currentSummary.value = extractSummary(text, parserOptions);
      syncParsedOptionFlagsForAssistantMessage(lastMsg.message_id, {
        hasOptionE: detectOptionE(text, parserOptions),
        hasLeave: detectLeave(text, parserOptions),
        hasRebirth: detectRebirth(text, parserOptions),
      });
      variableUpdateText.value = extractVariableUpdate(text, parserOptions);
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
        syncFloorNumberByArea(mvuData);
        // 直接使用原始数据，避免 Schema 转换/截断
        statData.value = _.get(mvuData, 'stat_data') as any;
        console.info('[GameStore] stat_data loaded from message', lastId);
      }
    } catch (err) {
      console.warn('[GameStore] Failed to load stat_data:', err);
    }
  }

  const findLatestAssistantMessageId = (): number => {
    const lastId = getLastMessageId();
    if (lastId < 0) return -1;
    const assistantMessages = getChatMessages(`0-${lastId}`, { role: 'assistant' });
    if (assistantMessages.length === 0) return -1;
    return assistantMessages[assistantMessages.length - 1].message_id;
  };

  const normalizeTailUserMessage = async (): Promise<number | null> => {
    const lastId = getLastMessageId();
    if (lastId < 0) return null;

    const allMessages = getChatMessages(`0-${lastId}`);
    if (allMessages.length === 0) return null;

    const tailUserMessageIds: number[] = [];
    for (let i = allMessages.length - 1; i >= 0; i -= 1) {
      if (allMessages[i].role !== 'user') break;
      tailUserMessageIds.push(allMessages[i].message_id);
    }

    if (tailUserMessageIds.length === 0) return null;

    // Keep only the latest tail user message; delete older tail user messages.
    if (tailUserMessageIds.length > 1) {
      const staleUserIds = tailUserMessageIds.slice(1);
      await deleteChatMessages(staleUserIds, { refresh: 'none' });
    }

    const normalizedLastId = getLastMessageId();
    if (normalizedLastId < 0) return null;
    const latestMessages = getChatMessages(`${normalizedLastId}-${normalizedLastId}`);
    const latestMessage = latestMessages[0];
    if (!latestMessage || latestMessage.role !== 'user') return null;
    if (normalizeFreshChatMessage(latestMessage.message).length === 0) return null;
    return latestMessage.message_id;
  };

  /**
   * 核心游戏循环：发送用户行动
   * 1. 获取当前楼层 MVU 变量（作为继承基础）
   * 2. 创建 user 楼层（不触发生成、不刷新）
   * 3. 调用 generate 生成 LLM 回复
   * 4. 解析回复标签 + 解析 MVU 变量命令
   * 5. 创建 assistant 楼层（携带解析后的 MVU 数据）
   * 6. 隐藏旧楼层，更新显示
   */
  async function sendAction(userInput: string, options?: { userMvuDataOverride?: any }): Promise<boolean> {
    if (isGenerating.value || !userInput.trim()) return false;

    error.value = null;
    isGenerating.value = true;
    streamingText.value = '';

    try {
      // 1. 在创建新消息前，获取最新楼层的 MVU 变量（用于继承）
      const overwriteUserMessageId = await normalizeTailUserMessage();
      const baseMessageId = overwriteUserMessageId !== null ? findLatestAssistantMessageId() : getLastMessageId();
      const oldMvuData = baseMessageId >= 0 ? Mvu.getMvuData({ type: 'message', message_id: baseMessageId }) : {};
      const currentPendingPortalChanges = pendingPortalChanges.value;
      const currentPendingCombatChanges = pendingCombatMvuChanges.value;
      const currentPendingStatDataChanges = pendingStatDataChanges.value;
      const currentPendingFinalAreaEditNotice = isInFinalArea() ? pendingFinalAreaEditNotice.value : null;
      const currentPendingFinalAreaRollbackNotice = isInFinalArea() ? pendingFinalAreaRollbackNotice.value : null;
      const finalUserInput = appendFinalAreaMetaNotices(userInput, [
        currentPendingFinalAreaRollbackNotice,
        currentPendingFinalAreaEditNotice,
      ]);

      // 2. 先将传送门变量写入 user 楼层对应的 MVU 数据
      const userMvuData = options?.userMvuDataOverride
        ? _.cloneDeep(options.userMvuDataOverride)
        : applyPendingStatDataChangesToMvu(
            applyPendingCombatChangesToMvu(
              applyPendingPortalChangesToMvu(oldMvuData, currentPendingPortalChanges),
              currentPendingCombatChanges,
            ),
            currentPendingStatDataChanges,
          );
      syncFloorNumberByArea(userMvuData);

      // 3. 创建 user 楼层（携带已应用按钮变更后的 MVU 数据）
      console.info('[GameStore] Creating user message:', finalUserInput);
      if (overwriteUserMessageId !== null) {
        console.info('[GameStore] Overwriting tail user message:', overwriteUserMessageId);
        await setChatMessages(
          [{ message_id: overwriteUserMessageId, role: 'user', message: finalUserInput, data: userMvuData }],
          { refresh: 'none' },
        );
      } else {
        await createChatMessages([{ role: 'user', message: finalUserInput, data: userMvuData }], { refresh: 'none' });
      }
      messageListRevision.value += 1;

      // user 层已写入成功后，清空待应用变更，避免后续重复叠加
      pendingPortalChanges.value = null;
      pendingCombatMvuChanges.value = null;
      pendingStatDataChanges.value = null;
      if (currentPendingFinalAreaEditNotice) {
        pendingFinalAreaEditNotice.value = null;
      }
      if (currentPendingFinalAreaRollbackNotice) {
        pendingFinalAreaRollbackNotice.value = null;
      }

      // 4. 监听流式传输（可选）
      const streamListener = eventOn(
        iframe_events.STREAM_TOKEN_RECEIVED_FULLY,
        (text: string, _generation_id: string) => {
          streamingText.value = filterStreamingTextAfterThinkEnd(text);
        },
      );

      // 5. 调用 generate 生成回复
      console.info('[GameStore] Generating LLM response...');
      const result = await generate({
        user_input: finalUserInput,
        should_stream: useStreaming.value,
      });
      const resultText = getGeneratedText(result);
      console.info('[GameStore] LLM response received, length:', resultText.length);

      // 停止流式监听
      streamListener.stop();
      streamingText.value = '';

      // 6. 解析回复标签
      const parsed = parseResponse(resultText, getResponseParserOptions());
      applyParsedResponse(parsed);

      // 7. 解析 MVU 变量命令（基于 user 楼层变量继承）
      let newMvuData = await Mvu.parseMessage(resultText, _.cloneDeep(userMvuData));
      if (!newMvuData) {
        newMvuData = _.cloneDeep(userMvuData);
      } else if (!newMvuData.stat_data && userMvuData?.stat_data) {
        newMvuData.stat_data = _.cloneDeep(userMvuData.stat_data);
      }
      syncFloorNumberByArea(newMvuData);

      // 8. 清理无用的 MVU 内部字段
      if (newMvuData) {
        delete newMvuData.display_data;
        delete newMvuData.delta_data;
      }

      // 9. 创建 assistant 楼层，携带解析后的 MVU 数据
      console.info('[GameStore] Creating assistant message with MVU data');
      await createChatMessages([{ role: 'assistant', message: resultText, data: newMvuData }], { refresh: 'none' });
      messageListRevision.value += 1;
      lastResolvedAssistantMessageId.value = getLastMessageId();

      // 10. 刷新本地 stat_data
      refreshLocalStatData(newMvuData);
      const newAssistantMessageId = getLastMessageId();
      if (fastModeEnabled.value && !fastModeBufferActive.value) {
        fastModeBaseMessageId.value = newAssistantMessageId >= 0 ? newAssistantMessageId : null;
        fastModeMvuData.value = _.cloneDeep(newMvuData);
      }
      await updateAutoSummaryChronicle(newAssistantMessageId, parsed.summary);
      await ensureLatestMessageWindow();
      console.info('[GameStore] Action completed successfully');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] sendAction error:', msg);
      error.value = `生成失败: ${msg}`;
      return false;
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
    clearManualButtonCompletion();
    setParsedOptionFlags(parsed);
    variableUpdateText.value = parsed.variableUpdate;
  }

  /**
   * 从 MVU 数据中刷新本地 stat_data 显示
   */
  function refreshLocalStatData(mvuData: any) {
    try {
      if (!mvuData) return;
      syncFloorNumberByArea(mvuData);
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
      const summary = extractSummary(msg.message, getResponseParserOptions());
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
    isSaveLoadOpen.value = false;

    try {
      const lastId = getLastMessageId();
      if (targetMessageId > lastId) {
        console.warn('[GameStore] Cannot rollback: target is future');
        return;
      }

      if (targetMessageId === lastId) {
        clearFastModeBuffer();
        loadLatestAssistantState();
        loadStatData();
        await ensureLatestMessageWindow();
        return;
      }

      const targetMvuData = Mvu.getMvuData({ type: 'message', message_id: targetMessageId });
      const shouldRecordFinalAreaRollback = isMvuInFinalArea(targetMvuData);
      const finalAreaRollbackNotice = shouldRecordFinalAreaRollback
        ? buildRollbackChangeSummary(lastId, targetMessageId, collectRollbackSummaries(targetMessageId, lastId))
        : null;

      // 删除 target 之后的所有楼层
      clearFastModeBuffer();
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
      if (finalAreaRollbackNotice && isInFinalArea()) {
        pendingFinalAreaRollbackNotice.value = finalAreaRollbackNotice;
      }

      // 刷新到最新消息窗口
      await ensureLatestMessageWindow();

      toastr.success('回档成功！');
      console.info('[GameStore] Rollback completed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GameStore] Rollback error:', msg);
      error.value = `回档失败: ${msg}`;
    }
  }

  /**
   * 重Roll：重新生成当前 user 对应的 assistant 楼层
   * - 若最后一层是 assistant：删除该 assistant 后重新生成
   * - 若最后一层是 user：保留该 user，直接补生成 assistant
   */
  async function rerollCurrent() {
    if (isGenerating.value) return;

    if (isInFinalArea()) {
      toastr.info('这一次重Roll被欲望之神看见了。');
      await sendAction(FINAL_AREA_REROLL_INPUT);
      return;
    }

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
      const latestMsg = allMessages[allMessages.length - 1];
      const lastUserMsg = [...allMessages].reverse().find(m => m.role === 'user');
      if (!lastUserMsg) {
        console.warn('[GameStore] Cannot reroll: no user message found');
        return;
      }
      const userInput = lastUserMsg.message ?? '';

      // 仅在最后一层为 assistant 时删除，若最后一层为 user 则保留
      if (latestMsg?.role === 'assistant') {
        console.info('[GameStore] Reroll: deleting assistant message', lastId);
        await deleteChatMessages([lastId], { refresh: 'none' });
        await removeAutoSummaryChronicleByAssistantMessageId(lastId);
      } else if (latestMsg?.role === 'user') {
        console.info('[GameStore] Reroll: latest message is user, keep it and regenerate assistant');
      } else {
        console.warn('[GameStore] Cannot reroll: latest message is neither user nor assistant');
        return;
      }

      // 获取当前最新楼层（删除后）的 MVU 变量作为继承基础
      const oldMvuData = Mvu.getMvuData({ type: 'message', message_id: getLastMessageId() });

      // 监听流式传输
      const streamListener = eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text: string) => {
        streamingText.value = filterStreamingTextAfterThinkEnd(text);
      });

      // 重新生成
      console.info('[GameStore] Reroll: regenerating...');
      const result = await generate({
        user_input: userInput,
        should_stream: useStreaming.value,
      });
      const resultText = getGeneratedText(result);

      streamListener.stop();
      streamingText.value = '';

      // 解析回复标签
      const parsed = parseResponse(resultText, getResponseParserOptions());
      applyParsedResponse(parsed);

      // 解析 MVU 变量命令（基于旧数据继承，深拷贝以避免污染当前楼层）
      const newMvuData = await Mvu.parseMessage(resultText, _.cloneDeep(oldMvuData));
      syncFloorNumberByArea(newMvuData);

      // 创建新的 assistant 楼层，携带 MVU 数据
      await createChatMessages([{ role: 'assistant', message: resultText, data: newMvuData }], { refresh: 'none' });
      lastResolvedAssistantMessageId.value = getLastMessageId();

      // 刷新本地 stat_data
      refreshLocalStatData(newMvuData);

      toastr.success('重新生成完成！');
      const newAssistantMessageId = getLastMessageId();
      await updateAutoSummaryChronicle(newAssistantMessageId, parsed.summary);
      await ensureLatestMessageWindow();
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
      const originalMessages = getChatMessages(`${lastId}-${lastId}`);
      const originalText = originalMessages[0]?.message ?? '';
      const wasEditingFinalArea = isInFinalArea();

      // 获取当前楼层已有的 MVU 数据（编辑前的）
      const currentMvuData = Mvu.getMvuData({ type: 'message', message_id: lastId });

      // 获取上一条消息的 MVU 数据作为继承基础
      const prevMvuData =
        lastId > 0
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
      syncFloorNumberByArea(newMvuData);

      // 保存编辑后的完整文本到楼层
      await setChatMessages([{ message_id: lastId, message: editingText.value }], { refresh: 'none' });
      lastResolvedAssistantMessageId.value = lastId;
      if (wasEditingFinalArea) {
        pendingFinalAreaEditNotice.value = buildEditChangeSummary(originalText, editingText.value);
      }

      // 将 MVU 数据写回当前楼层
      if (newMvuData) {
        await Mvu.replaceMvuData(newMvuData, { type: 'message', message_id: lastId });
      }

      // 从编辑后的文本重新解析显示状态
      const parsed = parseResponse(editingText.value, getResponseParserOptions());
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

      const changedKeys = Object.keys(fields);
      const currentMvuData = Mvu.getMvuData({ type: 'message', message_id: lastId });
      const nextCurrentMvuData = _.cloneDeep(currentMvuData ?? {});
      if (!nextCurrentMvuData.stat_data || typeof nextCurrentMvuData.stat_data !== 'object') {
        nextCurrentMvuData.stat_data = {};
      }

      Object.assign(nextCurrentMvuData.stat_data, _.cloneDeep(fields));
      syncFloorNumberByArea(nextCurrentMvuData);
      await Mvu.replaceMvuData(nextCurrentMvuData, { type: 'message', message_id: lastId });
      clearPendingStatDataFields(changedKeys);

      if (fastModeEnabled.value) {
        const nextMvuData = getFastModeBaseMvuData();
        if (!nextMvuData.stat_data || typeof nextMvuData.stat_data !== 'object') {
          nextMvuData.stat_data = {};
        }

        Object.assign(nextMvuData.stat_data, _.cloneDeep(fields));
        syncFloorNumberByArea(nextMvuData);
        fastModeMvuData.value = _.cloneDeep(nextMvuData);
        refreshLocalStatData(nextMvuData);
        exposeFastModeInteractionButtons();
        persistFastModeBufferToChatVariables();
        if (fastModeBufferActive.value) {
          await syncFastModeBufferUserMessage();
        }
        return true;
      }

      refreshLocalStatData(nextCurrentMvuData);
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
    useStreaming,
    forbidMatchingXmlInsideThink,
    autoSummaryEnabled,
    summaryVisibleWindow,
    buttonCompletionEnabled,
    fastModeEnabled,
    fastModeBufferActive,
    fastActionEvents,
    streamingText,
    messageListRevision,
    error,
    isInitialized,
    statData,
    saveEntries,
    isSaveLoadOpen,
    isEditing,
    editingText,
    hasOptionE,
    hasLeave,
    hasRebirth,
    variableUpdateText,

    // Actions
    initialize,
    isFreshChatSession,
    getWorldbookEntryContentByName,
    generateOpeningBackstoryDraft,
    overwriteUserWorldbookEntryContent,
    sendAction,
    setUseStreaming,
    setForbidMatchingXmlInsideThink,
    setAutoSummaryEnabled,
    setSummaryVisibleWindow,
    setButtonCompletionEnabled,
    setFastModeEnabled,
    queueFastAction,
    flushFastActions,
    clearFastModeBuffer,
    showManualButtonCompletion,
    hideManualButtonCompletion,
    setPendingPortalChanges,
    setPendingCombatMvuChanges,
    setPendingStatDataChanges,
    mergePendingStatDataChanges,
    loadStatData,
    loadSaveEntries,
    rebuildAutoSummaryChronicleFromMessages,
    loadAutoSummaryChronicleEntries,
    generateBigSummary,
    applyBigSummary,
    rollbackTo,
    rerollCurrent,
    startEdit,
    saveEdit,
    cancelEdit,
    updateStatDataFields,
  };
});
