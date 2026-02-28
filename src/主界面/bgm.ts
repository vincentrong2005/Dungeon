import { readonly, ref } from 'vue';
import { LOCAL_BGM_FILE_NAMES } from './localAssetManifest';

export interface BgmTrack {
  id: string;
  name: string;
  url: string;
}

const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';

const ENCODED_DUNGEON = encodeURIComponent('地牢');
const ENCODED_BGM_DIR = `${encodeURIComponent('音效库')}/${encodeURIComponent('背景音乐')}`;
const LOCAL_BGM_WINDOWS_DIR = 'D:/SillyTavern/图片素材/地牢/音效库/背景音乐';

const BGM_TRACK_KEY = 'dungeon.bgm.track';
const BGM_VOLUME_KEY = 'dungeon.bgm.volume';
const DEFAULT_BGM_FILE = 'brave-explorer.mp3';
const DEFAULT_BGM_ID = DEFAULT_BGM_FILE;

const bgmTracksState = ref<BgmTrack[]>([]);
const bgmVolumeState = ref(0.45);
const bgmTrackIdState = ref(DEFAULT_BGM_ID);

let initialized = false;
let audioEl: HTMLAudioElement | null = null;
let loadedTrackId: string | null = null;
let resumeListenerBound = false;
let currentTrackSources: string[] = [];
let currentTrackSourceIndex = 0;

const toWindowsFileUrl = (windowsPath: string) => {
  const normalized = windowsPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return '';
  const [root, ...rest] = parts;
  const encodedRest = rest.map((part) => encodeURIComponent(part)).join('/');
  return `file:///${root}/${encodedRest}`;
};

const buildHfTrackUrl = (fileName: string) => (
  `${IMAGE_CDN_ROOT}/${ENCODED_DUNGEON}/${ENCODED_BGM_DIR}/${encodeURIComponent(fileName)}`
);

const buildLocalTrackUrl = (fileName: string) => (
  toWindowsFileUrl(`${LOCAL_BGM_WINDOWS_DIR}/${fileName}`)
);

const buildTrackSources = (fileName: string) => {
  const sources = [buildLocalTrackUrl(fileName), buildHfTrackUrl(fileName)].filter(Boolean);
  return [...new Set(sources)];
};

const createTrack = (fileName: string): BgmTrack => {
  const id = fileName;
  const title = fileName.replace(/\.[^.]+$/, '');
  const sources = buildTrackSources(fileName);
  const url = sources[0] ?? buildHfTrackUrl(fileName);
  return { id, name: title, url };
};

const DEFAULT_TRACKS: BgmTrack[] = [
  createTrack('brave-explorer.mp3'),
  createTrack('close-then-gone.mp3'),
  createTrack('fantasy-galaxy.mp3'),
  createTrack('mountain-piano-background.mp3'),
  createTrack('over-nara.mp3'),
  createTrack('soft-fly.mp3'),
  createTrack('streetlamp-wind.mp3'),
];

const clampVolume = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const parsePersistedVolume = (raw: string | null) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0.45;
  return clampVolume(parsed);
};

const ensureAudio = () => {
  if (audioEl) return audioEl;
  audioEl = new Audio();
  audioEl.preload = 'auto';
  audioEl.loop = true;
  audioEl.volume = bgmVolumeState.value;
  audioEl.addEventListener('error', () => {
    if (!audioEl) return;
    const nextIndex = currentTrackSourceIndex + 1;
    if (nextIndex >= currentTrackSources.length) return;
    currentTrackSourceIndex = nextIndex;
    audioEl.src = currentTrackSources[currentTrackSourceIndex]!;
    audioEl.load();
    audioEl.play().catch(() => {
      bindResumeOnGesture();
    });
  });
  return audioEl;
};

const persistVolume = () => {
  localStorage.setItem(BGM_VOLUME_KEY, String(bgmVolumeState.value));
};

const persistTrackId = () => {
  localStorage.setItem(BGM_TRACK_KEY, bgmTrackIdState.value);
};

const getCurrentTrack = () => {
  if (bgmTracksState.value.length === 0) return null;
  return bgmTracksState.value.find((track) => track.id === bgmTrackIdState.value) ?? bgmTracksState.value[0]!;
};

const sortTracks = (tracks: BgmTrack[]) => (
  [...tracks].sort((a, b) => {
    if (a.id === DEFAULT_BGM_ID) return -1;
    if (b.id === DEFAULT_BGM_ID) return 1;
    return a.name.localeCompare(b.name, 'en');
  })
);

const applyCurrentTrackToAudio = () => {
  const track = getCurrentTrack();
  if (!track) return;
  if (bgmTrackIdState.value !== track.id) {
    bgmTrackIdState.value = track.id;
    persistTrackId();
  }
  const audio = ensureAudio();
  audio.volume = bgmVolumeState.value;
  if (loadedTrackId !== track.id) {
    currentTrackSources = buildTrackSources(track.id);
    currentTrackSourceIndex = 0;
    audio.src = currentTrackSources[0] ?? track.url;
    audio.load();
    loadedTrackId = track.id;
  }
};

const bindResumeOnGesture = () => {
  if (resumeListenerBound) return;
  resumeListenerBound = true;
  const resume = () => {
    resumeListenerBound = false;
    if (!audioEl) return;
    audioEl.play().catch(() => {
      bindResumeOnGesture();
    });
  };
  document.addEventListener('click', resume, { once: true, capture: true });
  document.addEventListener('keydown', resume, { once: true, capture: true });
  document.addEventListener('touchstart', resume, { once: true, capture: true });
};

const tryPlay = () => {
  const audio = ensureAudio();
  audio.play().catch(() => {
    bindResumeOnGesture();
  });
};

const fetchDungeonBackgroundMusicTracks = async (): Promise<BgmTrack[]> => (
  LOCAL_BGM_FILE_NAMES.map((fileName) => createTrack(fileName))
);

const bootstrapTrackList = async () => {
  const localTracks = await fetchDungeonBackgroundMusicTracks();
  bgmTracksState.value = sortTracks(localTracks.length > 0 ? localTracks : DEFAULT_TRACKS);
};

export const initializeBgm = async () => {
  if (initialized) return;
  initialized = true;

  bgmVolumeState.value = parsePersistedVolume(localStorage.getItem(BGM_VOLUME_KEY));
  bgmTrackIdState.value = localStorage.getItem(BGM_TRACK_KEY) || DEFAULT_BGM_ID;

  await bootstrapTrackList();
  applyCurrentTrackToAudio();
  tryPlay();
};

export const disposeBgm = () => {
  if (!audioEl) return;
  audioEl.pause();
  audioEl.src = '';
  audioEl = null;
  loadedTrackId = null;
  initialized = false;
};

export const setBgmVolume = (value: number) => {
  bgmVolumeState.value = clampVolume(value);
  persistVolume();
  if (audioEl) {
    audioEl.volume = bgmVolumeState.value;
  }
};

export const setBgmTrack = (trackId: string) => {
  if (!trackId) return;
  bgmTrackIdState.value = trackId;
  persistTrackId();
  applyCurrentTrackToAudio();
  tryPlay();
};

export const bgmTracks = readonly(bgmTracksState);
export const bgmVolume = readonly(bgmVolumeState);
export const bgmTrackId = readonly(bgmTrackIdState);
