// client/src/api.ts

// ===== Simple token store =====
let ACCESS_TOKEN = localStorage.getItem('access_token') || '';

export function setAccessToken(t: string) {
  ACCESS_TOKEN = t || '';
  if (t) localStorage.setItem('access_token', t);
  else localStorage.removeItem('access_token');
}
export function getAccessToken() { return ACCESS_TOKEN; }

// ===== Decode JWT (không verify chữ ký, chỉ để hiển thị UI/debug) =====
export type JwtClaims = { sub: number; role?: 'USER' | 'ADMIN'; iat?: number; exp?: number } | null;

export function decodeJwt(token: string): JwtClaims {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(decodeURIComponent(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')));
    return json;
  } catch { return null; }
}

// ===== Core fetch with auto attach Authorization & auto refresh =====
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/jwt/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.access_token) {
      setAccessToken(data.access_token);
      return data.access_token as string;
    }
    return null;
  } catch { return null; }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  async function doFetch(): Promise<Response> {
    return fetch(path, { credentials: 'include', ...init, headers });
  }

  // 1st try
  let res = await doFetch();

  // If Unauthorized and we have refresh cookie, try refresh once
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await doFetch(); // retry once
    }
  }

  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let msg = res.statusText;
    if (text) {
      try { msg = (JSON.parse(text)?.error || JSON.parse(text)?.message || msg) as string; }
      catch { msg = text; }
    }
    throw new Error(msg);
  }
  if (!text) return undefined as unknown as T;
  if (contentType.includes('application/json')) return JSON.parse(text) as T;
  return (text as unknown) as T;
}

export function errMsg(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}
