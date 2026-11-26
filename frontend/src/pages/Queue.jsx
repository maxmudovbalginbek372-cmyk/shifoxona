import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, CheckCircle2, Clock, FileText, ListOrdered, Phone, XCircle } from 'lucide-react';
import { api } from '../api';
import { useAuth, useFetch, useToast } from '../context';
import { Badge, Empty, PageHead, PageLoader, ageOf, fmtTime } from '../ui';

const COLS = [
  { key: 'waiting', title: 'Kutmoqda', tone: 'warn' },
  { key: 'in_progress', title: 'Qabulda', tone: 'info' },
  { key: 'done', title: 'Yakunlandi', tone: 'ok' },
];

export default function Queue() {
  const { user } = useAuth();
  const toast = useToast();
  const [doc, setDoc] = useState(0);
  const [busy, setBusy] = useState(false);
  const { data: list, loading, error, reload } = useFetch(() => api.get('/queue' + (doc ? `?doctorId=${doc}` : '')), [doc], 5000);
  const { data: doctors } = useFetch(() => api.get('/doctors'), []);

  const canTreat = user.role === 'doctor' || user.role === 'admin';
  const act = async (id, status, msg) => {
    setBusy(true);
    try { await api.patch(`/queue/${id}`, { status }); toast.success(msg); await reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const cancel = (v) => window.confirm(`${v.ticket} (${v.patient.fullName}) — navbatni bekor qilasizmi?`) && act(v.id, 'cancelled', 'Navbat bekor qilindi');

  if (loading) return <PageLoader />;
  if (error) return <div className="error-box">{error}</div>;

  const by = (s) => list.filter((v) => v.status === s);
  const cancelled = by('cancelled');

  return (
    <>
      <PageHead title="Bugungi navbat" sub="Navbat avtomatik shakllanadi: shoshilinch bemorlar birinchi, qolganlari kelish tartibida">
        {user.role !== 'doctor' && doctors && (
          <div className="chips">
            <button className={'chip' + (doc === 0 ? ' on' : '')} onClick={() => setDoc(0)}>Barchasi</button>
            {doctors.map((d) => <button key={d.id} className={'chip' + (doc === d.id ? ' on' : '')} onClick={() => setDoc(d.id)}>{d.specialty} <small>({d.waiting})</small></button>)}
          </div>
        )}
      </PageHead>

      <div className="kanban">
        {COLS.map((c) => {
          const items = by(c.key);
          return (
            <section className="k-col" key={c.key}>
              <div className="k-head"><span className="row"><Badge tone={c.tone} dot>{c.title}</Badge></span><span className="cnt">{items.length}</span></div>
              <div className="k-list">
                {items.length === 0 && <Empty icon={ListOrdered} title="Bo'sh" />}
                {items.map((v) => (
                  <article key={v.id} className={'q-card' + (v.priority === 'urgent' ? ' urgent' : '') + (v.status === 'in_progress' ? ' current' : '')}>
                    <div className="q-top">
                      <span className="q-ticket">{v.ticket}</span>
                      <span className="row" style={{ gap: 6 }}>
                        {v.priority === 'urgent' && <Badge tone="danger"><AlertTriangle size={12} /> Shoshilinch</Badge>}
                        {v.status === 'waiting' && <Badge tone="muted">{v.position}-o'rin</Badge>}
                      </span>
                    </div>
                    <div>
                      <div className="q-name">{v.patient.fullName}</div>
                      <small className="muted">{v.patient.cardNo} · {ageOf(v.patient.birthDate)} yosh</small>
                    </div>
                    {v.complaint && <small>{v.complaint}</small>}
                    <div className="q-meta">
                      <span>{v.doctor.name} · {v.doctor.room}</span>
                      <span><Clock size={13} /> {fmtTime(v.createdAt)}</span>
                      {v.status === 'waiting' && <span>~{v.eta} daq.</span>}
                      {v.status === 'done' && <span>{fmtTime(v.calledAt)}–{fmtTime(v.finishedAt)}</span>}
                      <span><Phone size={13} /> {v.patient.phone}</span>
                    </div>
                    <div className="q-actions">
                      {canTreat && v.status === 'waiting' && <button className="btn primary sm" disabled={busy} onClick={() => act(v.id, 'in_progress', v.ticket + ' chaqirildi')}><BellRing size={14} /> Chaqirish</button>}
                      {canTreat && v.status === 'in_progress' && <>
                        <Link className="btn soft sm" to={`/patients/${v.patient.id}`}><FileText size={14} /> Karta</Link>
                        <button className="btn ok sm" disabled={busy} onClick={() => act(v.id, 'done', 'Qabul yakunlandi')}><CheckCircle2 size={14} /> Yakunlash</button>
                      </>}
                      {(v.status === 'waiting' || v.status === 'in_progress') && <button className="btn danger sm" disabled={busy} onClick={() => cancel(v)}><XCircle size={14} /> Bekor</button>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {cancelled.length > 0 && (
        <div className="card mt">
          <div className="card-head"><h2>Bekor qilinganlar</h2><Badge tone="muted">{cancelled.length}</Badge></div>
          <div className="row wrap">{cancelled.map((v) => <Badge key={v.id} tone="muted">{v.ticket} · {v.patient.fullName}</Badge>)}</div>
        </div>
      )}
    </>
  );
}
