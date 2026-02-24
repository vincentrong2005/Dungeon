/**
 * LLM 回复解析器
 * 从 AI 生成的文本中提取自定义 XML 标签内容
 */
/**
 * Maintenance note:
 * - Keep this file UTF-8 (contains Chinese text).
 * - Avoid shell redirection full-file overwrite (>, >>, Out-File, Set-Content).
 * - Prefer apply_patch/IDE-safe edits to prevent mojibake.
 */

export interface ParsedResponse {
  /** 正文标签（兼容 <maintext>/<maintxt>/<content>/<正文>） */
  mainText: string;
  /** <option>...</option> 包裹的普通选项列表（A-D，不含 E / [Leave] / [Rebirth]） */
  options: string[];
  /** <sum>...</sum> 包裹的小总结 */
  summary: string;
  /** <UpdateVariable>/<update> 包裹的变量更新内容 */
  variableUpdate: string;
  /** <UpdateVariable> 内 <JSONPatch>...</JSONPatch> 的变量更新指令 */
  jsonPatch: string;
  /** 原始文本（去除思维链块） */
  rawText: string;
  /** 是否存在 E 选项 */
  hasOptionE: boolean;
  /** 是否存在 [Leave] 选项 */
  hasLeave: boolean;
  /** 是否存在 [Rebirth] 选项 */
  hasRebirth: boolean;
}

function isLeaveOptionLine(line: string): boolean {
  return /\bleave\b/i.test(line);
}

function isRebirthOptionLine(line: string): boolean {
  return /\brebirth\b/i.test(line);
}

/**
 * 提取单个 XML 标签的内容
 */
function extractTag(text: string, tagName: string): string {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 仅匹配“块级位置”标签，避免把正文中示例文本误识别为真实标签
  const regex = new RegExp(`(?:^|[\\r\\n]|>)\\s*<${escapedTagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapedTagName}>`, 'ig');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const openTagEnd = fullMatch.indexOf('>');
    if (openTagEnd >= 0) {
      // 过滤“标签示例”写法，如 "<maintext>, <option>"（标签后紧跟逗号）
      const afterOpen = fullMatch.slice(openTagEnd + 1).trimStart();
      const firstChar = afterOpen[0];
      if (firstChar === ',' || firstChar === '，') continue;
    }
    return match[1].trim();
  }

  return '';
}

/**
 * 按顺序尝试多个标签名，返回第一个命中的内容
 */
function extractTagByPriority(text: string, tagNames: string[]): string {
  for (const tagName of tagNames) {
    const content = extractTag(text, tagName);
    if (content) return content;
  }
  return '';
}

/**
 * 移除思维链块
 * 支持多种变体：<think>, <thinking>, <Think>, <Thinking> 等
 * 支持嵌套与错误闭合（如 <thinking> ... </think>）
 * 同时处理未闭合的思维链标签（流式传输中可能出现）
 */
function removeThinkBlock(text: string): string {
  const thinkTagRegex = /<\s*(\/?)\s*(think|thinking)\b[^>]*>/gi;

  let result = '';
  let depth = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = thinkTagRegex.exec(text)) !== null) {
    const isClosing = match[1] === '/';
    const tagStart = match.index;
    const tagEnd = thinkTagRegex.lastIndex;

    // 仅在思维链外保留内容；思维链内（含标签本身）全部丢弃
    // 特殊处理：孤立的 </think>/< /thinking> 也视作思维链结束符，结束符之前的段落丢弃
    if (depth === 0 && !isClosing) {
      result += text.slice(lastIndex, tagStart);
    }

    if (isClosing) {
      // 允许错误闭合：只要处于思维链内，遇到任意 think/thinking 结束标签就减一层
      if (depth > 0) depth -= 1;
    } else {
      depth += 1;
    }

    lastIndex = tagEnd;
  }

  // 仅在未进入未闭合思维链时追加尾部文本
  if (depth === 0) {
    result += text.slice(lastIndex);
  }

  return result.trim();
}

/**
 * 流式显示时：一旦检测到思维链结束标签，则隐藏结束标签之前的全部文本
 * 支持 </think> / </thinking> 及大小写变体
 */
export function filterStreamingTextAfterThinkEnd(text: string): string {
  if (!text) return '';

  const closeThinkTagRegex = /<\s*\/\s*(think|thinking)\b[^>]*>/i;
  const closeMatch = closeThinkTagRegex.exec(text);
  if (!closeMatch) return text;

  return text.slice(closeMatch.index + closeMatch[0].length).trimStart();
}

/**
 * 移除正文中的 HTML 注释块（用于隐藏正文内思维链）
 */
function removeHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?(?:-->|$)/g, '').trim();
}

function normalizeTucaoMarkers(text: string): string {
  return text
    .replace(/&lt;\s*tucao(?:\s+[^&]*?)?&gt;/gi, '<tucao>')
    .replace(/&lt;\s*\/\s*tucao\s*&gt;/gi, '</tucao>')
    .replace(/\[\s*tucao\s*]/gi, '<tucao>')
    .replace(/\[\s*\/\s*tucao\s*]/gi, '</tucao>')
    .replace(/<\s*吐槽(?:\s+[^>]*)?>/gi, '<tucao>')
    .replace(/<\s*\/\s*吐槽\s*>/gi, '</tucao>');
}

function extractTucaoBlocks(text: string): string[] {
  const normalized = normalizeTucaoMarkers(text);
  const result: string[] = [];
  const openRegex = /<\s*tucao(?:\s+[^>]*)?>/gi;
  const closeRegex = /<\s*\/\s*tucao\s*>/gi;

  let cursor = 0;
  openRegex.lastIndex = 0;

  while (openRegex.exec(normalized) !== null) {
    const openEnd = openRegex.lastIndex;
    closeRegex.lastIndex = openEnd;
    const closeMatch = closeRegex.exec(normalized);
    const contentEnd = closeMatch ? closeMatch.index : normalized.length;
    const content = normalized.slice(openEnd, contentEnd).trim();
    if (content.length > 0) {
      result.push(content);
    }

    cursor = closeMatch ? closeRegex.lastIndex : normalized.length;
    openRegex.lastIndex = cursor;
    if (!closeMatch) break;
  }

  return result;
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
  const mainTextRaw = extractTagByPriority(cleanText, ['maintext', 'maintxt', 'content', '正文']);
  let mainText = removeHtmlComments(mainTextRaw);
  const mainHasTucao = /<\s*\/?\s*(?:tucao|吐槽)\b|\[\s*\/?\s*tucao\s*]|&lt;\s*\/?\s*tucao\b/i.test(mainTextRaw);
  if (!mainHasTucao) {
    const fallbackTucao = extractTucaoBlocks(cleanText);
    if (fallbackTucao.length > 0) {
      const merged = fallbackTucao.map(block => `<tucao>\n${block}\n</tucao>`).join('\n\n');
      mainText = [mainText, merged].filter(part => part && part.trim().length > 0).join('\n\n');
    }
  }
  const optionRaw = extractTag(cleanText, 'option');
  const summary = extractTag(cleanText, 'sum');

  // 提取 UpdateVariable / update 中的内容
  const updateVarBlock = extractTagByPriority(cleanText, ['UpdateVariable', 'update']);
  const jsonPatch = extractTag(updateVarBlock, 'JSONPatch');
  const variableUpdate = updateVarBlock || jsonPatch;

  // 解析所有选项行
  const allOptions = parseOptions(optionRaw);

  // 检测 E 选项和 [Leave]
  const hasOptionE = allOptions.some(line => /^E\.\s/i.test(line));
  const hasLeave = allOptions.some(isLeaveOptionLine);
  const hasRebirth = allOptions.some(isRebirthOptionLine);

  // 过滤掉 E 和 [Leave]，只保留 A-D 等普通选项
  const normalOptions = allOptions.filter(line => {
    if (/^E\.\s/i.test(line)) return false;
    if (isLeaveOptionLine(line)) return false;
    if (isRebirthOptionLine(line)) return false;
    return true;
  });

  return {
    mainText,
    options: normalOptions,
    summary,
    variableUpdate,
    jsonPatch,
    rawText: cleanText,
    hasOptionE,
    hasLeave,
    hasRebirth,
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
  const mainTextRaw = extractTagByPriority(clean, ['maintext', 'maintxt', 'content', '正文']);
  let mainText = removeHtmlComments(mainTextRaw);
  const mainHasTucao = /<\s*\/?\s*(?:tucao|吐槽)\b|\[\s*\/?\s*tucao\s*]|&lt;\s*\/?\s*tucao\b/i.test(mainTextRaw);
  if (!mainHasTucao) {
    const fallbackTucao = extractTucaoBlocks(clean);
    if (fallbackTucao.length > 0) {
      const merged = fallbackTucao.map(block => `<tucao>\n${block}\n</tucao>`).join('\n\n');
      mainText = [mainText, merged].filter(part => part && part.trim().length > 0).join('\n\n');
    }
  }
  return mainText;
}

/**
 * 从已有消息文本中快速提取变量更新块（<UpdateVariable> / <update>）
 */
export function extractVariableUpdate(messageText: string): string {
  const clean = removeThinkBlock(messageText);
  return extractTagByPriority(clean, ['UpdateVariable', 'update']);
}

/**
 * 从已有消息文本中快速提取 <option> 选项（仅普通 A-D 选项）
 */
export function extractOptions(messageText: string): string[] {
  const clean = removeThinkBlock(messageText);
  const allOptions = parseOptions(extractTag(clean, 'option'));
  return allOptions.filter(line => {
    if (/^E\.\s/i.test(line)) return false;
    if (isLeaveOptionLine(line)) return false;
    if (isRebirthOptionLine(line)) return false;
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
  return allOptions.some(isLeaveOptionLine);
}

/**
 * 从已有消息文本中检测是否含有 [Rebirth]
 */
export function detectRebirth(messageText: string): boolean {
  const clean = removeThinkBlock(messageText);
  const allOptions = parseOptions(extractTag(clean, 'option'));
  return allOptions.some(isRebirthOptionLine);
}
