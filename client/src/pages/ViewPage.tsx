import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errMsg } from '../api';
import type { Me } from '../App';

type User = { id: number; name?: string | null; email?: string | null; address?: string | null };

export default function ViewPage({ me }: { me: Me }) {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const u = (await api<{ data: User }>(`/api/users/${id}`)).data;
        setUser(u);
        setForm({ name: u.name ?? '', email: u.email ?? '', address: u.address ?? '' });
      } catch (e) {
        setError(errMsg(e, 'Load failed'));
      }
    }
    void load();
  }, [id]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: form.name, email: form.email, address: form.address })
      });
      nav('/');
    } catch (e) {
      setError(errMsg(e, 'Update failed'));
    } finally { setBusy(false); }
  };

  if (!user) return <div className="mt-3">Loading...</div>;

  return (
    <div style={{ maxWidth: 640, margin: '24px auto' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">View Detail User ID {user.id}</h3>
        <button className="btn btn-outline-secondary" onClick={() => nav(-1)}>Back</button>
      </div>

      <form className="row g-3" onSubmit={submit}>
        <div className="col-12">
          <label className="form-label">Name</label>
          <input className="form-control" value={form.name}
                 onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="col-12">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" value={form.email}
                 onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="col-12">
          <label className="form-label">Address</label>
          <textarea className="form-control" rows={2} value={form.address}
                    onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
        <div className="col-12">
          {me ? (
            <button className="btn btn-warning" disabled={busy} type="submit">
              {busy ? '...' : 'Update'}
            </button>
          ) : (
            <div className="alert alert-warning mb-0">Login to update.</div>
          )}
        </div>
        {error && <div className="col-12"><div className="alert alert-danger py-2">{error}</div></div>}
      </form>
    </div>
  );
}
