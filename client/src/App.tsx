import { useEffect, useState, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { api, errMsg } from './api';
import ListPage from './pages/ListPage';
import CreatePage from './pages/CreatePage';
import ViewPage from './pages/ViewPage';
import HeaderBar from './components/HeaderBar';

export type Me = {
  id: number;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  role?: 'USER' | 'ADMIN' | null;
} | null;

// cờ nhắc rằng đã từng login JWT và BE đã set cookie refresh (rt)
const HAS_RT_KEY = 'has_rt';
const getHasRT = () => localStorage.getItem(HAS_RT_KEY) === '1';

export default function App() {
  const [me, setMe] = useState<Me>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem('access_token')
  );
  const navigate = useNavigate();

  // Đã đăng nhập nếu có token hoặc có session (me)
  const isAuthed = useMemo(
    () => Boolean(accessToken) || Boolean(me),
    [accessToken, me]
  );

  // Inject Bearer vào mọi fetch /api/* và chỉ refresh khi biết có rt
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const headers = new Headers(init?.headers || {});
      const isApi = typeof url === 'string' && url.startsWith('/api/');

      if (isApi && accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      const first = await originalFetch(input, {
        credentials: init?.credentials ?? 'include',
        ...init,
        headers,
      });

      // Nếu 401 và không phải chính /refresh -> chỉ thử refresh khi có cờ has_rt
      if (
        first.status === 401 &&
        typeof url === 'string' &&
        !url.endsWith('/api/jwt/refresh')
      ) {
        if (!getHasRT()) return first;

        const refreshed = await originalFetch('/api/jwt/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshed.ok) {
          const data: { access_token?: string } = await refreshed.json();
          if (data.access_token) {
            // lưu token mới và retry request ban đầu
            setAccessToken(data.access_token);
            localStorage.setItem('access_token', data.access_token);
            headers.set('Authorization', `Bearer ${data.access_token}`);
            return originalFetch(input, {
              credentials: init?.credentials ?? 'include',
              ...init,
              headers,
            });
          }
        } else if (refreshed.status === 401) {
          // refresh bị 401 -> xoá cờ & token để tránh lặp
          localStorage.removeItem('access_token');
          localStorage.removeItem(HAS_RT_KEY);
          setAccessToken(null);
        }
      }
      return first;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [accessToken]);

  // Tải "me": nếu có accessToken thì gọi /jwt/profile, ngược lại thử /auth/me
  const loadMe = useCallback(async () => {
    if (accessToken) {
      const byJwt = await api<{ user: Exclude<Me, null> }>('/api/jwt/profile').catch(
        () => null
      );
      if (byJwt?.user) {
        setMe(byJwt.user);
        return;
      }
    }
    const bySession = await api<{
      user:
        | { id: number; username?: string | null; name?: string | null; email?: string | null }
        | null;
    }>('/api/auth/me').catch(() => null);
    setMe(bySession?.user ? { ...bySession.user, role: null } : null);
  }, [accessToken]);

  // Khởi động: KHÔNG gọi refresh chủ động nữa để tránh 401 đỏ
  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  // ====== LOGIN MỚI: dùng auth-gateway cho tất cả ======

  // 1) Login bằng username/password (provider = 'password')
  const loginPassword = async (username: string, password: string) => {
    setError(null);
    try {
      const res = await api<{
        provider: string;
        access_token?: string;
        user: Exclude<Me, null>;
      }>('/api/auth-gateway/login', {
        method: 'POST',
        body: JSON.stringify({ provider: 'password', username, password }),
      });

      if (res.access_token) {
        // BE đã set cookie refresh (rt). Lưu cờ để biết có thể refresh về sau.
        localStorage.setItem(HAS_RT_KEY, '1');
        localStorage.setItem('access_token', res.access_token);
        setAccessToken(res.access_token);
      }

      setMe(res.user);
    } catch (e) {
      setError(errMsg(e, 'Login failed'));
    }
  };

  // 2) Login bằng Google / Facebook – backend trả redirectUrl
  const loginProvider = async (provider: 'google' | 'facebook') => {
    setError(null);
    try {
      const res = await api<{ provider: string; redirectUrl?: string }>(
        '/api/auth-gateway/login',
        {
          method: 'POST',
          body: JSON.stringify({ provider }),
        }
      );

      if (res.redirectUrl) {
        // cho browser nhảy sang trang OAuth (Google/Facebook)
        window.location.href = res.redirectUrl;
        return;
      }
      // Nếu sau này bạn muốn backend login xong trả luôn user (không redirect)
      // thì có thể xử lý thêm ở đây.
    } catch (e) {
      setError(errMsg(e, 'Login failed'));
    }
  };

  const logout = async () => {
    await Promise.allSettled([
      api('/api/jwt/logout', { method: 'POST' }),
      api('/api/auth/logout', { method: 'POST' }),
    ]);
    localStorage.removeItem('access_token');
    localStorage.removeItem(HAS_RT_KEY);
    setAccessToken(null);
    await loadMe();
    navigate('/');
  };

  return (
    <div
      className="container"
      style={{ maxWidth: 1140, paddingTop: 24, paddingBottom: 24 }}
    >
      <HeaderBar
        me={me}
        isAuthed={isAuthed}
        onLoginPassword={loginPassword}
        onLoginProvider={loginProvider}
        onLogout={logout}
      />
      <hr />
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <Routes>
        <Route path="/" element={<ListPage canEdit={isAuthed} />} />
        <Route path="/create-user" element={<CreatePage me={me} />} />
        <Route path="/view-user/:id" element={<ViewPage me={me} />} />
      </Routes>
    </div>
  );
}
