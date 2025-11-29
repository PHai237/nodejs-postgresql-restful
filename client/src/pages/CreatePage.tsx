import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api';
import type { Me } from '../App';

export default function CreatePage({ me }: { me: Me }) {
  const [form, setForm] = useState({ name: '', email: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api('/api/users', { method: 'POST', body: JSON.stringify({
        fullName: form.name, email: form.email, address: form.address
      })});
      nav('/');
    } catch (e) {
      setError(errMsg(e, 'Create failed'));
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 640, margin: '24px auto' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Create a New User</h3>
        <button className="btn btn-outline-secondary" onClick={() => nav(-1)}>Back</button>
      </div>

      {!me ? (
        <div className="alert alert-warning">Please login to create user.</div>
      ) : (
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
            <button className="btn btn-warning" disabled={busy} type="submit">
              {busy ? '...' : 'Submit'}
            </button>
          </div>
          {error && <div className="col-12"><div className="alert alert-danger py-2">{error}</div></div>}
        </form>
      )}
    </div>
  );
}
