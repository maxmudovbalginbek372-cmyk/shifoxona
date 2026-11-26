import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search, UserPlus, Users } from 'lucide-react';
import { api } from '../api';
import { useAuth, useToast } from '../context';
import { Avatar, Badge, Empty, Modal, PageHead, Spinner, ageOf, fmtDate } from '../ui';
import PatientForm, { emptyPatient } from '../components/PatientForm';

export default function Patients() {
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyPatient);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const canCreate = user.role === 'registrar' || user.role === 'admin' || user.role === 'doctor';

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/patients?limit=200&q=' + encodeURIComponent(q)).then((r) => { setList(r); setError(''); }).catch((e) => setError(e.message));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const create = async () => {
    setErr(''); setBusy(true);
    try {
      const p = await api.post('/patients', form);
      toast.success(`Bemor kartasi ochildi: ${p.cardNo}`);
      setOpen(false); setForm(emptyPatient);
      nav('/patients/' + p.id);
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title={user.role === 'registrar' ? 'Bemorlar' : 'Tibbiy kartalar'} sub={list ? `Jami: ${list.length} ta bemor` : ''}>
        <div className="search" style={{ width: 'min(340px, 100%)' }}>
          <Search size={18} /><input className="input" placeholder="F.I.Sh., telefon yoki karta №…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {canCreate && <button className="btn primary" onClick={() => setOpen(true)}><UserPlus size={18} /> Yangi bemor</button>}
      </PageHead>

      <div className="card">
        {error ? <div className="error-box">{error}</div> : !list ? <div className="center-pad"><Spinner /></div> : list.length === 0 ? (
          <Empty icon={Users} title="Bemor topilmadi" text="Qidiruv so'rovini o'zgartiring yoki yangi bemor qo'shing." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Bemor</th><th>Karta №</th><th>Yosh / jins</th><th>Telefon</th><th>Qon guruhi</th><th>Tashriflar</th><th /></tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="click" onClick={() => nav('/patients/' + p.id)}>
                    <td><div className="cell-user"><Avatar name={p.fullName} size={38} /><div><b>{p.fullName}</b><small>{fmtDate(p.birthDate)}</small></div></div></td>
                    <td className="mono">{p.cardNo}</td>
                    <td>{ageOf(p.birthDate)} · {p.gender === 'M' ? 'Erkak' : 'Ayol'}</td>
                    <td className="mono">{p.phone}</td>
                    <td>{p.bloodType || '—'}</td>
                    <td><Badge tone="primary">{p.visitsCount}</Badge></td>
                    <td>{p.allergies && <Badge tone="danger"><AlertTriangle size={12} /> Allergiya</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal wide title="Yangi bemor kartasi" onClose={() => setOpen(false)}
          footer={<><button className="btn ghost" onClick={() => setOpen(false)}>Bekor qilish</button><button className="btn primary" onClick={create} disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Kartani ochish'}</button></>}>
          {err && <div className="error-box" style={{ marginBottom: 14 }}>{err}</div>}
          <PatientForm value={form} onChange={setForm} />
        </Modal>
      )}
    </>
  );
}
