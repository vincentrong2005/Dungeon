/** 反馈素材根目录：特效在 `素材库/战斗界面/特效/`，音效在 `音效库/特效音效/` */
export const FEEDBACK_ASSET_ROOT = 'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/';

export const feedbackAssetUrl = (relativePath: string) => (
  FEEDBACK_ASSET_ROOT + relativePath.split('/').map(encodeURIComponent).join('/')
);

export async function fetchFeedbackAsset(path: string): Promise<ArrayBuffer> {
  const response = await fetch(feedbackAssetUrl(path), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Feedback asset: HTTP ${response.status}`);
  return response.arrayBuffer();
}
