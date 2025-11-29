import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';

type User = { id: number; name?: string | null; email?: string | null; address?: string | null };

export default function ListPage({ canEdit }: { canEdit: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try { setUsers((await api<{ data: User[] }>('/api/users')).data ?? []); }
    catch (e) { setError(errMsg(e)); setUsers([]); }
  }
  useEffect(() => { void load(); }, []);

  const del = async (id: number) => {
    try { await api(`/api/users/${id}`, { method: 'DELETE' }); await load(); }
    catch (e) { setError(errMsg(e, 'Delete failed')); }
  };

  return (
    <>
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 80 }}>ID</th>
              <th style={{ width: 220 }}>Name</th>
              <th style={{ width: 280 }}>Email</th>
              <th>Address</th>
              <th style={{ width: 220 }} className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.address}</td>
                <td className="text-center">
                  {canEdit ? (
                    <div className="d-flex gap-2 justify-content-center">
                      <Link className="btn btn-sm btn-primary" to={`/view-user/${u.id}`}>View</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => del(u.id)}>Delete</button>
                    </div>
                  ) : <em className="text-muted">login to edit</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
