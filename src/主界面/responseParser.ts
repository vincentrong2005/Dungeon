/**
 * LLM 回复解析器
 * 从 AI 生成的文本中提取自定义 XML 标签内容
 */

export interface ParsedResponse {
  /** <maintext>...</maintext> 包裹的正文 */
  mainText: string;
  /** <option>...</option> 包裹的选项列表（每行一个选项） */
  options: string[];
  /** <sum>...</sum> 包裹的小总结 */
  summary: string;
  /** <UpdateVariable> 内 <JSONPatch>...</JSONPatch> 的变量更新指令 */
  jsonPatch: string;
  /** 原始文本（去除 <Think> 块） */
  rawText: string;
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
 * 移除 <Think>...</Think> 思维链块
 */
function removeThinkBlock(text: string): string {
  return text.replace(/<Think>[\s\S]*?<\/Think>/gi, '').trim();
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

  return {
    mainText,
    options: parseOptions(optionRaw),
    summary,
    jsonPatch,
    rawText: cleanText,
  };
}

/**
 * 从已有消息文本中快速提取 <sum> 小总结
 * 用于读档面板列表显示
 */
export function extractSummary(messageText: string): string {
  return extractTag(messageText, 'sum');
}

/**
 * 从已有消息文本中快速提取 <maintext> 正文
 */
export function extractMainText(messageText: string): string {
  return extractTag(messageText, 'maintext');
}

/**
 * 从已有消息文本中快速提取 <option> 选项
 */
export function extractOptions(messageText: string): string[] {
  return parseOptions(extractTag(messageText, 'option'));
}
