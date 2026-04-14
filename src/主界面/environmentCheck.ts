import { compare } from 'compare-versions';

export type EnvironmentDependencyStatus = 'ok' | 'missing' | 'disabled' | 'not_ready' | 'error';

export interface EnvironmentDependencyResult {
  key: 'tavernHelper' | 'promptTemplate' | 'mvu';
  label: string;
  status: EnvironmentDependencyStatus;
  detail: string;
  hint: string;
}

export interface EnvironmentCheckReport {
  checkedAt: number;
  ready: boolean;
  summary: string;
  items: EnvironmentDependencyResult[];
}

type RuntimeWindow = Window & {
  TavernHelper?: unknown;
  EjsTemplate?: {
    getFeatures?: () => { enabled?: boolean; render_enabled?: boolean; generate_enabled?: boolean };
  };
  Mvu?: unknown;
};

type ScriptMatch = {
  scope: ScriptTreesOptions['type'];
  script: Script;
};

const MIN_TAVERN_HELPER_VERSION = '4.8.4';

function getRuntimeWindow(): RuntimeWindow | null {
  return typeof window === 'undefined' ? null : (window as RuntimeWindow);
}

function flattenScripts(nodes: ScriptTree[], scope: ScriptTreesOptions['type'], output: ScriptMatch[] = []): ScriptMatch[] {
  for (const node of nodes) {
    if (node.type === 'script') {
      output.push({ scope, script: node });
      continue;
    }

    flattenScripts(node.scripts, scope, output);
  }
  return output;
}

function collectAllScripts(): ScriptMatch[] {
  if (typeof getScriptTrees !== 'function') {
    return [];
  }

  const scopes: ScriptTreesOptions['type'][] = ['character', 'preset', 'global'];
  return scopes.flatMap(scope => {
    try {
      return flattenScripts(getScriptTrees({ type: scope }), scope);
    } catch {
      return [];
    }
  });
}

function isMvuScript(match: ScriptMatch): boolean {
  const normalizedName = match.script.name.trim().toLowerCase();
  const content = match.script.content ?? '';
  return normalizedName === 'mvu' || /MagVarUpdate|window\.Mvu|waitGlobalInitialized\('Mvu'\)/i.test(content);
}

function describeScopes(matches: ScriptMatch[]): string {
  const scopes = [...new Set(matches.map(match => match.scope))];
  if (scopes.length === 0) {
    return '';
  }
  return `脚本位置：${scopes.join(' / ')}`;
}

async function waitForGlobal(name: string, timeoutMs: number): Promise<boolean> {
  if (typeof waitGlobalInitialized !== 'function') {
    return false;
  }

  try {
    await Promise.race([
      waitGlobalInitialized(name),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function checkTavernHelper(): Promise<EnvironmentDependencyResult> {
  const runtimeWindow = getRuntimeWindow();
  const hasRuntime = Boolean(runtimeWindow?.TavernHelper);
  const canCheckInstallation =
    typeof getTavernHelperExtensionId === 'function' && typeof isInstalledExtension === 'function';

  if (!canCheckInstallation) {
    return hasRuntime
      ? {
          key: 'tavernHelper',
          label: '酒馆助手',
          status: 'ok',
          detail: '已检测到 TavernHelper 运行时接口。',
          hint: '环境已就绪。',
        }
      : {
          key: 'tavernHelper',
          label: '酒馆助手',
          status: 'missing',
          detail: '未检测到酒馆助手接口，当前页面无法调用必需的前端能力。',
          hint: '请安装并启用酒馆助手（JS-Slash-Runner），然后刷新页面。',
        };
  }

  const extensionId = getTavernHelperExtensionId();
  const installed = isInstalledExtension(extensionId);
  const version = typeof getTavernHelperVersion === 'function' ? getTavernHelperVersion() : '';
  const versionText = version ? `当前版本：${version}` : '已检测到安装记录。';

  if (!installed) {
    return {
      key: 'tavernHelper',
      label: '酒馆助手',
      status: 'missing',
      detail: '未检测到酒馆助手扩展安装记录。',
      hint: '请安装并启用酒馆助手（JS-Slash-Runner），然后刷新页面。',
    };
  }

  if (!hasRuntime) {
    return {
      key: 'tavernHelper',
      label: '酒馆助手',
      status: 'not_ready',
      detail: `已检测到扩展安装，但运行时接口尚未注入。${versionText}`,
      hint: '通常刷新页面即可恢复；若仍失败，请确认扩展已启用。',
    };
  }

  if (version) {
    try {
      if (compare(version, MIN_TAVERN_HELPER_VERSION, '<')) {
        return {
          key: 'tavernHelper',
          label: '酒馆助手',
          status: 'error',
          detail: `当前版本 ${version}，低于所需的 ${MIN_TAVERN_HELPER_VERSION}。`,
          hint: `请更新酒馆助手到 ${MIN_TAVERN_HELPER_VERSION} 或更高版本后再进入游戏。`,
        };
      }
    } catch (error) {
      return {
        key: 'tavernHelper',
        label: '酒馆助手',
        status: 'error',
        detail: `版本号校验失败：${error instanceof Error ? error.message : String(error)}`,
        hint: `请确认酒馆助手版本不低于 ${MIN_TAVERN_HELPER_VERSION}。`,
      };
    }
  }

  return {
    key: 'tavernHelper',
    label: '酒馆助手',
    status: 'ok',
    detail: version
      ? `运行正常，当前版本：${version}（满足 >= ${MIN_TAVERN_HELPER_VERSION}）`
      : `运行正常，接口已就绪（建议版本 >= ${MIN_TAVERN_HELPER_VERSION}）。`,
    hint: '环境已就绪。',
  };
}

async function checkPromptTemplate(): Promise<EnvironmentDependencyResult> {
  const runtimeWindow = getRuntimeWindow();
  const ejsTemplate = runtimeWindow?.EjsTemplate;

  if (!ejsTemplate) {
    return {
      key: 'promptTemplate',
      label: '提示词模板',
      status: 'missing',
      detail: '未检测到 EjsTemplate 全局对象。',
      hint: '请安装并启用提示词模板插件（ST-Prompt-Template）。',
    };
  }

  if (typeof ejsTemplate.getFeatures !== 'function') {
    return {
      key: 'promptTemplate',
      label: '提示词模板',
      status: 'not_ready',
      detail: '已检测到插件对象，但功能接口尚未准备完成。',
      hint: '请刷新页面后重试；若仍失败，请检查插件是否正确加载。',
    };
  }

  try {
    const features = ejsTemplate.getFeatures();
    if (!features?.enabled) {
      return {
        key: 'promptTemplate',
        label: '提示词模板',
        status: 'disabled',
        detail: '插件已加载，但当前处于未启用状态。',
        hint: '请在酒馆中启用提示词模板插件。',
      };
    }

    const renderState = features.render_enabled ? '渲染开启' : '渲染关闭';
    const generateState = features.generate_enabled ? '生成开启' : '生成关闭';
    return {
      key: 'promptTemplate',
      label: '提示词模板',
      status: 'ok',
      detail: `插件运行正常（${renderState}，${generateState}）。`,
      hint: '环境已就绪。',
    };
  } catch (error) {
    return {
      key: 'promptTemplate',
      label: '提示词模板',
      status: 'error',
      detail: `读取插件状态失败：${error instanceof Error ? error.message : String(error)}`,
      hint: '请检查插件是否已正确安装并尝试刷新页面。',
    };
  }
}

async function checkMvu(): Promise<EnvironmentDependencyResult> {
  const runtimeWindow = getRuntimeWindow();
  const hasRuntime = Boolean(runtimeWindow?.Mvu);
  const scriptMatches = collectAllScripts().filter(isMvuScript);
  const enabledMatches = scriptMatches.filter(match => match.script.enabled);
  const scopeText = describeScopes(scriptMatches);

  if (hasRuntime) {
    return {
      key: 'mvu',
      label: 'MVU 脚本',
      status: 'ok',
      detail: scopeText ? `已检测到 Mvu 全局对象。${scopeText}` : '已检测到 Mvu 全局对象。',
      hint: '环境已就绪。',
    };
  }

  if (scriptMatches.length === 0) {
    return {
      key: 'mvu',
      label: 'MVU 脚本',
      status: 'missing',
      detail: '未在脚本树中找到名为 mvu 的脚本，也未检测到 Mvu 全局对象。',
      hint: '请在当前角色卡或可用脚本域中导入并启用 MVU 脚本。',
    };
  }

  if (enabledMatches.length === 0) {
    return {
      key: 'mvu',
      label: 'MVU 脚本',
      status: 'disabled',
      detail: scopeText ? `已找到 MVU 脚本，但当前未启用。${scopeText}` : '已找到 MVU 脚本，但当前未启用。',
      hint: '请前往酒馆助手脚本库启用 mvu 脚本后重新检测。',
    };
  }

  const initialized = await waitForGlobal('Mvu', 1600);
  if (initialized) {
    return {
      key: 'mvu',
      label: 'MVU 脚本',
      status: 'ok',
      detail: scopeText ? `MVU 脚本已启用并完成初始化。${scopeText}` : 'MVU 脚本已启用并完成初始化。',
      hint: '环境已就绪。',
    };
  }

  return {
    key: 'mvu',
    label: 'MVU 脚本',
    status: 'not_ready',
    detail: scopeText ? `MVU 脚本已启用，但全局对象尚未初始化完成。${scopeText}` : 'MVU 脚本已启用，但全局对象尚未初始化完成。',
    hint: '请稍等片刻或刷新页面；若仍失败，请检查脚本内容是否成功加载。',
  };
}

function buildSummary(items: EnvironmentDependencyResult[]): { ready: boolean; summary: string } {
  const blockingItems = items.filter(item => item.status !== 'ok');
  if (blockingItems.length === 0) {
    return {
      ready: true,
      summary: '三项前端环境依赖均已就绪，可以进入游戏。',
    };
  }

  return {
    ready: false,
    summary: `检测到 ${blockingItems.length} 项环境问题：${blockingItems.map(item => item.label).join('、')}。`,
  };
}

export async function runEnvironmentCheck(): Promise<EnvironmentCheckReport> {
  const items = await Promise.all([checkTavernHelper(), checkPromptTemplate(), checkMvu()]);
  const { ready, summary } = buildSummary(items);

  return {
    checkedAt: Date.now(),
    ready,
    summary,
    items,
  };
}
