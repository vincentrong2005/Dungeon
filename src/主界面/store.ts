export type PageState = 'splash' | 'game';

export const useDataStore = defineStore('data', () => {
  const pageState = ref<PageState>('splash');
  const latestSegment = ref<string>('');
  const hasSaveData = ref<boolean>(false);

  const setPageState = (value: PageState) => {
    pageState.value = value;
  };

  const setLatestSegment = (value: string) => {
    latestSegment.value = value;
  };

  const setHasSaveData = (value: boolean) => {
    hasSaveData.value = value;
  };

  return {
    pageState,
    latestSegment,
    hasSaveData,
    setPageState,
    setLatestSegment,
    setHasSaveData,
  };
});
