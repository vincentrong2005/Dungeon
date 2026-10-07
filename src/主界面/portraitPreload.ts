const decodedPortraits = new Map<string, Promise<HTMLImageElement>>();

export function invalidatePortrait(url: string): void {
  decodedPortraits.delete(url);
}

export function preloadPortrait(url: string): Promise<HTMLImageElement> {
  const cached = decodedPortraits.get(url);
  if (cached) return cached;
  const task = new Promise<HTMLImageElement>((resolve, reject) => {
    const picture = new Image();
    const timer = setTimeout(() => fail(), 10000);
    const fail = () => {
      clearTimeout(timer);
      picture.onload = null;
      picture.onerror = null;
      reject(new Error(`立绘加载失败: ${url}`));
    };
    picture.onerror = fail;
    picture.onload = async () => {
      try {
        if (picture.naturalWidth <= 0) return fail();
        if (typeof picture.decode === 'function') await picture.decode();
        clearTimeout(timer);
        resolve(picture);
      } catch {
        fail();
      }
    };
    picture.src = url;
  });
  decodedPortraits.set(url, task);
  void task.catch(() => {
    if (decodedPortraits.get(url) === task) decodedPortraits.delete(url);
  });
  return task;
}

export async function preloadRandomPortrait(paths: string[], resolveUrl: (path: string) => string): Promise<string> {
  const candidates = [...paths];
  for (let index = candidates.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap]!, candidates[index]!];
  }
  for (const path of candidates) {
    const url = resolveUrl(path);
    try {
      await preloadPortrait(url);
      return url;
    } catch {
      // Retry within the same phase; never substitute the other phase's portrait.
    }
  }
  throw new Error('该阶段没有可用立绘');
}
