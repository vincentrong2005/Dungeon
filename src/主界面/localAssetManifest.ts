const LOCAL_FOLDER_IMAGE_FILE_NAMES: Record<string, readonly string[]> = {
  '地牢/user': [
    '立绘1.png',
    '立绘10.png',
    '立绘11.png',
    '立绘2.png',
    '立绘3.png',
    '立绘4.png',
    '立绘5.png',
    '立绘6.png',
    '立绘7.png',
    '立绘8.png',
    '立绘9.png',
  ],
  '地牢/魔物/厄休拉': [
    '厄休拉1.png', '厄休拉10.png', '厄休拉11.png', '厄休拉12.png', '厄休拉13.png', '厄休拉14.png',
    '厄休拉15.png', '厄休拉16.png', '厄休拉17.png', '厄休拉18.png', '厄休拉2.png', '厄休拉3.png',
    '厄休拉4.png', '厄休拉5.png', '厄休拉6.png', '厄休拉7.png', '厄休拉8.png', '厄休拉9.png',
  ],
  '地牢/魔物/因克': [
    '因克1.png', '因克10.png', '因克11.png', '因克12.png', '因克13.png', '因克14.png',
    '因克15.png', '因克16.png', '因克17.png', '因克18.png', '因克19.png', '因克2.png',
    '因克20.png', '因克21.png', '因克22.png', '因克23.png', '因克3.png', '因克4.png',
    '因克5.png', '因克6.png', '因克7.png', '因克8.png', '因克9.png',
  ],
  '地牢/魔物/宁芙': [
    '宁芙1.png', '宁芙10.png', '宁芙11.png', '宁芙12.png', '宁芙13.png', '宁芙14.png',
    '宁芙15.png', '宁芙16.png', '宁芙17.png', '宁芙18.png', '宁芙19.png', '宁芙2.png',
    '宁芙20.png', '宁芙21.png', '宁芙22.png', '宁芙23.png', '宁芙24.png', '宁芙25.png',
    '宁芙26.png', '宁芙27.png', '宁芙28.png', '宁芙29.png', '宁芙3.png', '宁芙30.png',
    '宁芙31.png', '宁芙4.png', '宁芙5.png', '宁芙6.png', '宁芙7.png', '宁芙8.png', '宁芙9.png',
  ],
  '地牢/魔物/希尔薇': [
    '希尔薇1.png', '希尔薇2.png', '希尔薇3.png', '希尔薇4.png', '希尔薇5.png', '希尔薇6.png',
  ],
  '地牢/魔物/普莉姆': [
    '普莉姆1.png', '普莉姆10.png', '普莉姆2.png', '普莉姆3.png', '普莉姆4.png',
    '普莉姆5.png', '普莉姆6.png', '普莉姆7.png', '普莉姆8.png', '普莉姆9.png',
  ],
  '地牢/魔物/沐芯兰': [
    '沐芯兰1.png', '沐芯兰2.png', '沐芯兰3.png', '沐芯兰4.png', '沐芯兰5.png', '沐芯兰6.png',
  ],
  '地牢/魔物/温蒂尼': [
    '温蒂尼1.png', '温蒂尼10.png', '温蒂尼2.png', '温蒂尼3.png', '温蒂尼4.png',
    '温蒂尼5.png', '温蒂尼6.png', '温蒂尼7.png', '温蒂尼8.png', '温蒂尼9.png',
  ],
  '地牢/魔物/玛塔': [
    '玛塔1.png', '玛塔10.png', '玛塔11.png', '玛塔12.png', '玛塔13.png', '玛塔14.png',
    '玛塔2.png', '玛塔3.png', '玛塔4.png', '玛塔5.png', '玛塔6.png', '玛塔7.png', '玛塔8.png', '玛塔9.png',
  ],
  '地牢/魔物/罗丝': [
    '罗丝1.png', '罗丝2.png', '罗丝3.png', '罗丝4.png', '罗丝5.png',
    '罗丝6.png', '罗丝7.png', '罗丝8.png', '罗丝9.png',
  ],
};

const normalizeRepoPath = (path: string) => path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

export const getLocalFolderImagePaths = (folderPath: string): string[] => {
  const normalizedFolderPath = normalizeRepoPath(folderPath);
  const fileNames = LOCAL_FOLDER_IMAGE_FILE_NAMES[normalizedFolderPath];
  if (!fileNames) return [];
  return fileNames.map((fileName) => `${normalizedFolderPath}/${fileName}`);
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
