interface LocalFolderImageRule {
  baseName: string;
  end: number;
  start?: number;
  extension?: string;
}

const LOCAL_FOLDER_IMAGE_RULES: Record<string, LocalFolderImageRule> = {
  '地牢/user': { baseName: 'user', end: 12 },
  '地牢/魔物/厄休拉': { baseName: '厄休拉', end: 18 },
  '地牢/魔物/因克': { baseName: '因克', end: 23 },
  '地牢/魔物/宁芙': { baseName: '宁芙', end: 31 },
  '地牢/魔物/希尔薇': { baseName: '希尔薇', end: 13 },
  '地牢/魔物/普莉姆': { baseName: '普莉姆', end: 10 },
  '地牢/魔物/沐芯兰': { baseName: '沐芯兰', end: 32 },
  '地牢/魔物/温蒂尼': { baseName: '温蒂尼', end: 10 },
  '地牢/魔物/玛塔': { baseName: '玛塔', end: 14 },
  '地牢/魔物/罗丝': { baseName: '罗丝', end: 9 },
};

const normalizeRepoPath = (path: string) => path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

export const getLocalFolderImagePaths = (folderPath: string): string[] => {
  const normalizedFolderPath = normalizeRepoPath(folderPath);
  const rule = LOCAL_FOLDER_IMAGE_RULES[normalizedFolderPath];
  if (!rule) return [];

  const start = Math.max(1, Math.floor(rule.start ?? 1));
  const end = Math.max(start, Math.floor(rule.end));
  const ext = (rule.extension ?? 'png').replace(/^\./, '');
  const paths: string[] = [];

  for (let i = start; i <= end; i += 1) {
    paths.push(`${normalizedFolderPath}/${rule.baseName}${i}.${ext}`);
  }

  return paths;
};

export const getLocalFolderFirstImagePath = (folderPath: string): string | null => {
  const paths = getLocalFolderImagePaths(folderPath);
  return paths.length > 0 ? paths[0]! : null;
};

export const LOCAL_BGM_FILE_NAMES: string[] = [
  'brave-explorer.mp3',
  'close-then-gone.mp3',
  'fantasy-galaxy.mp3',
  'mountain-piano-background.mp3',
  'over-nara.mp3',
  'soft-fly.mp3',
  'streetlamp-wind.mp3',
];
