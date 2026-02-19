/**
 * LLM 回复解析器
 * 从 AI 生成的文本中提取自定义 XML 标签内容
 */

export interface ParsedResponse {
  /** <maintext>...</maintext> 包裹的正文 */
  mainText: string;
  /** <option>...</option> 包裹的普通选项列表（A-D，不含 E 和 [Leave]） */
  options: string[];
  /** <sum>...</sum> 包裹的小总结 */
  summary: string;
  /** <UpdateVariable> 内 <JSONPatch>...</JSONPatch> 的变量更新指令 */
  jsonPatch: string;
  /** 原始文本（去除思维链块） */
  rawText: string;
  /** 是否存在 E 选项 */
  hasOptionE: boolean;
  /** 是否存在 [Leave] 选项 */
  hasLeave: boolean;
}

/**
 * 提取单个 XML 标签的内容
 */
function extractTag(text: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * 移除思维链块
 * 支持多种变体：<think>, <thinking>, <Think>, <Thinking> 等
 * 同时处理未闭合的思维链标签（流式传输中可能出现）
 */
function removeThinkBlock(text: string): string {
  let result = text;
  // 1. 移除已闭合的 <thinking>...</thinking> 块（先处理较长的标签名）
  result = result.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  // 2. 移除已闭合的 <think>...</think> 块
  result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // 3. 处理未闭合的标签：从开始标签到文本末尾全部移除
  result = result.replace(/<thinking>[\s\S]*/gi, '');
  result = result.replace(/<think>[\s\S]*/gi, '');
  return result.trim();
}

/**
 * 解析选项文本为选项数组
 * 每行一个选项，格式如 "A. xxx", "B. xxx" 等
 */
function parseOptions(optionText: string): string[] {
  if (!optionText) return [];
  return optionText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * 解析 LLM 回复文本，提取各标签内容
 */
export function parseResponse(text: string): ParsedResponse {
  // 移除思维链
  const cleanText = removeThinkBlock(text);

  // 提取各标签
  const mainText = extractTag(cleanText, 'maintext');
  const optionRaw = extractTag(cleanText, 'option');
  const summary = extractTag(cleanText, 'sum');

  // 提取 UpdateVariable 中的 JSONPatch
  const updateVarBlock = extractTag(cleanText, 'UpdateVariable');
  const jsonPatch = extractTag(updateVarBlock, 'JSONPatch');

  // 解析所有选项行
  const allOptions = parseOptions(optionRaw);

  // 检测 E 选项和 [Leave]
  const hasOptionE = allOptions.some(line => /^E\.\s/i.test(line));
  const hasLeave = allOptions.some(line => /leave/i.test(line));

  // 过滤掉 E 和 [Leave]，只保留 A-D 等普通选项
  const normalOptions = allOptions.filter(line => {
    if (/^E\.\s/i.test(line)) return false;
    if (/leave/i.test(line)) return false;
    return true;
  });

  return {
    mainText,
    options: normalOptions,
    summary,
    jsonPatch,
    rawText: cleanText,
    hasOptionE,
    hasLeave,
  };
}

/**
 * 从已有消息文本中快速提取 <sum> 小总结
 * 用于读档面板列表显示
 */
export function extractSummary(messageText: string): string {
  const clean = removeThinkBlock(messageText);
  return extractTag(clean, 'sum');
}

/**
 * 从已有消息文本中快速提取 <maintext> 正文
 */
export function extractMainText(messageText: string): string {
  const clean = removeThinkBlock(messageText);
  return extractTag(clean, 'maintext');
}

/**
 * 从已有消息文本中快速提取 <option> 选项（仅普通 A-D 选项）
 */
export function extractOptions(messageText: string): string[] {
  const clean = removeThinkBlock(messageText);
  const allOptions = parseOptions(extractTag(clean, 'option'));
  return allOptions.filter(line => {
    if (/^E\.\s/i.test(line)) return false;
    if (/leave/i.test(line)) return false;
    return true;
  });
}

/**
 * 从已有消息文本中检测是否含有 E 选项
 */
export function detectOptionE(messageText: string): boolean {
  const clean = removeThinkBlock(messageText);
  const allOptions = parseOptions(extractTag(clean, 'option'));
  return allOptions.some(line => /^E\.\s/i.test(line));
}

/**
 * 从已有消息文本中检测是否含有 [Leave]
 */
export function detectLeave(messageText: string): boolean {
  const clean = removeThinkBlock(messageText);
  const allOptions = parseOptions(extractTag(clean, 'option'));
  return allOptions.some(line => /leave/i.test(line));
}
