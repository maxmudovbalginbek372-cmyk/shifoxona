import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { api } from '../api';
import { useFetch, useToast } from '../context';
import { Avatar, Badge, Field, Modal, PageHead, PageLoader } from '../ui';

const empty = { name: '', specialty: '', room: '', username: '', password: '' };

export default function Doctors() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get('/doctors'), [], 8000);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const create = async () => {
    setErr(''); setBusy(true);
    try {
      await api.post('/doctors', f);
      toast.success("Shifokor qo'shildi");
      setOpen(false); setF(empty); reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (loading) return <PageLoader />;
  if (error) return <div className="error-box">{error}</div>;

  return (
    <>
      <PageHead title="Shifokorlar" sub="Mutaxassislar, xonalar va bugungi yuklama">
        <button className="btn primary" onClick={() => setOpen(true)}><Plus size={18} /> Shifokor qo'shish</button>
      </PageHead>

      <div className="grid g3">
        {data.map((d) => (
          <div className="card hover doc-big" key={d.id}>
            <div className="head">
              <Avatar name={d.name} size={54} />
              <div><b>{d.name}</b><span className="muted">{d.specialty}</span></div>
              <Badge tone="primary">{d.room}-xona</Badge>
            </div>
            <div className="mini-stats">
              <div><b>{d.waiting}</b><small>Kutmoqda</small></div>
              <div><b>{d.done}</b><small>Qabul qilindi</small></div>
              <div><b>{d.avgMinutes}'</b><small>O'rtacha</small></div>
            </div>
            <Link to={`/doctors/${d.id}`} className="btn soft block">Panelni ochish <ArrowRight size={16} /></Link>
          </div>
        ))}
      </div>

      {open && (
        <Modal title="Yangi shifokor" onClose={() => setOpen(false)}
          footer={<><button className="btn ghost" onClick={() => setOpen(false)}>Bekor qilish</button><button className="btn primary" onClick={create} disabled={busy}>{busy ? 'Saqlanmoqda…' : "Qo'shish"}</button></>}>
          {err && <div className="error-box" style={{ marginBottom: 14 }}>{err}</div>}
          <div className="form-grid">
            <Field label="F.I.Sh. *" className="full"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ism Familiya" autoFocus /></Field>
            <Field label="Mutaxassislik *"><input className="input" value={f.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Masalan: Urolog" /></Field>
            <Field label="Xona raqami *"><input className="input" value={f.room} onChange={(e) => set('room', e.target.value)} placeholder="214" /></Field>
            <Field label="Login *"><input className="input" value={f.username} onChange={(e) => set('username', e.target.value)} placeholder="dr.ismoilov" autoComplete="off" /></Field>
            <Field label="Parol * (kamida 6 belgi)"><input className="input" type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}
