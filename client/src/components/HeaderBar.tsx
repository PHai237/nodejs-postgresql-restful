import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import type { Me } from '../App';

type Provider = 'google' | 'facebook';

export default function HeaderBar({
  me,
  isAuthed,
  onLoginPassword,
  onLoginProvider,
  onLogout,
}: {
  me: Me;
  isAuthed: boolean;
  onLoginPassword: (u: string, p: string) => Promise<void> | void;
  onLoginProvider: (provider: Provider) => Promise<void> | void;
  onLogout: () => Promise<void> | void;
}) {
  const [auth, setAuth] = useState({ username: '', password: '' });
  const loc = useLocation();

  return (
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
      <h1 className="display-6 mb-0">List Users</h1>

      <div className="d-flex align-items-center gap-2">
        {/* Nút Create chỉ hiện ở trang list và khi đã auth */}
        {isAuthed && loc.pathname === '/' && (
          <Link to="/create-user" className="btn btn-warning">
            Create a new user
          </Link>
        )}

        {isAuthed ? (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted">
              Hi, {me?.username || me?.name || me?.email || 'user'}
            </span>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => onLogout()}
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Login bằng username/password (qua auth-gateway) */}
            <form
              className="d-flex gap-2"
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                onLoginPassword(auth.username, auth.password);
              }}
            >
              <input
                className="form-control form-control-sm"
                placeholder="Username"
                value={auth.username}
                onChange={(e) =>
                  setAuth((a) => ({ ...a, username: e.target.value }))
                }
                aria-label="Username"
              />
              <input
                className="form-control form-control-sm"
                type="password"
                placeholder="Password"
                value={auth.password}
                onChange={(e) =>
                  setAuth((a) => ({ ...a, password: e.target.value }))
                }
                aria-label="Password"
              />
              <button className="btn btn-warning btn-sm" type="submit">
                Login
              </button>
            </form>

            {/* Đăng nhập với Google – vẫn chỉ gọi 1 API ở backend */}
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => onLoginProvider('google')}
              title="Login with Google"
            >
              Login with Google
            </button>

            {/* Đăng nhập với Facebook */}
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => onLoginProvider('facebook')}
              title="Login with Facebook"
              style={{ borderColor: 'blue' }} // viền xanh dương
            >
              Login with Facebook
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
