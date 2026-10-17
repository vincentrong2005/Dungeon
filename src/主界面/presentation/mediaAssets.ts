export const FEEDBACK_ASSET_ROOT = 'https://img.vinsimage.org/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/restored_assets/';

export const feedbackAssetUrl = (relativePath: string) => (
  FEEDBACK_ASSET_ROOT + relativePath.split('/').map(encodeURIComponent).join('/')
);

export async function fetchFeedbackAsset(path: string): Promise<ArrayBuffer> {
  const response = await fetch(feedbackAssetUrl(path), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Feedback asset: HTTP ${response.status}`);
  return response.arrayBuffer();
}
