import { unlockFullCodex } from './codexStore';

const AUTHOR_TEST_ACCESS_KEY = 'dungeon.author_test_access.v1';
const AUTHOR_TEST_PASSWORD_SHA256 = '82b87b56b096bcf4be784d993717c10443d843ebc880e4dae7cd5d049240d451';
const FALLBACK_PASSWORD_CODES = [48, 50, 49, 48];

const hasBrowserStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const getFallbackPassword = (): string => String.fromCharCode(...FALLBACK_PASSWORD_CODES);

const digestMessage = async (value: string): Promise<string> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return value === getFallbackPassword() ? AUTHOR_TEST_PASSWORD_SHA256 : '';
  }

  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const hasAuthorTestAccess = (): boolean => {
  if (!hasBrowserStorage()) return false;
  try {
    return localStorage.getItem(AUTHOR_TEST_ACCESS_KEY) === 'true';
  } catch {
    return false;
  }
};

export const verifyAuthorTestPassword = async (input: string): Promise<boolean> => {
  const normalized = input.trim();
  if (!normalized) return false;
  const hashed = await digestMessage(normalized);
  return hashed === AUTHOR_TEST_PASSWORD_SHA256;
};

export const unlockAuthorTestAccess = (): void => {
  if (hasBrowserStorage()) {
    try {
      localStorage.setItem(AUTHOR_TEST_ACCESS_KEY, 'true');
    } catch {
      // Ignore storage failures; unlocking the codex still helps for the current session.
    }
  }
  unlockFullCodex();
};

export const ensureAuthorTestAccessBenefits = (): void => {
  if (!hasAuthorTestAccess()) return;
  unlockFullCodex();
};
