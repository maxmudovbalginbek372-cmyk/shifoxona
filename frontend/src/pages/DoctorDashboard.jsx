import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BellRing, CheckCircle2, ClipboardList, Clock, FileText, Hourglass, Phone, PlayCircle, Stethoscope, Users, XCircle } from 'lucide-react';
import { useAuth, useFetch, useToast } from '../context';
import { api } from '../api';
import { Avatar, BarChart, Empty, PageHead, PageLoader, StatCard, ageOf, fmtDate, fmtTime } from '../ui';
import RecordModal from '../components/RecordModal';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { id } = useParams(); // admin uchun: /doctors/:id
  const toast = useToast();
  const isAdminView = user.role === 'admin';
  const url = '/doctor/dashboard' + (isAdminView ? `?doctorId=${id}` : '');
  const { data: d, loading, error, reload } = useFetch(() => api.get(url), [url], 5000);
  const [rec, setRec] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error) return <div className="error-box">{error}</div>;

  const doctorId = d.doctor.id;
  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) toast.success(okMsg); await reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const callNext = () => run(() => api.post('/queue/next', { doctorId }), 'Keyingi bemor chaqirildi');
  const finish = (v) => run(() => api.patch(`/queue/${v.id}`, { status: 'done' }), 'Qabul yakunlandi');
  const cancel = (v) => window.confirm(`${v.ticket} — navbatni bekor qilasizmi?`) && run(() => api.patch(`/queue/${v.id}`, { status: 'cancelled' }), 'Navbat bekor qilindi');
  const cur = d.current;

  return (
    <>
      <PageHead
        title={isAdminView ? d.doctor.name : 'Shifokor paneli'}
        sub={`${d.doctor.specialty} · ${d.doctor.room}-xona · o'rtacha qabul ${d.avgMinutes} daq.`}
      >
        {isAdminView && <Link to="/doctors" className="btn ghost"><ArrowLeft size={17} /> Shifokorlar</Link>}
        <button className="btn primary lg" onClick={callNext} disabled={busy || !!cur || d.waiting.length === 0}>
          <BellRing size={19} /> Keyingi bemorni chaqirish
        </button>
      </PageHead>

      <div className="grid g4">
        <StatCard icon={Users} label="Bugun jami" value={d.counts.total} tone="primary" />
        <StatCard icon={Hourglass} label="Navbatda" value={d.counts.waiting} hint={d.waiting[0] ? `keyingisi: ${d.waiting[0].ticket}` : 'navbat bo\'sh'} tone="warn" />
        <StatCard icon={CheckCircle2} label="Qabul qilingan" value={d.counts.done} tone="ok" />
        <StatCard icon={ClipboardList} label="Jami davolangan bemorlar" value={d.uniquePatients} hint="noyob bemorlar" tone="accent" />
      </div>

      <div className="grid g-main mt">
        <div className="col" style={{ gap: 18 }}>
          {cur ? (
            <div className="card now-card">
              <span className="tag"><PlayCircle size={15} /> Hozir qabulda · {fmtTime(cur.calledAt)} dan</span>
              <span className="big-ticket">{cur.ticket}</span>
              <h2>{cur.patient.fullName}</h2>
              <div className="now-info">
                <span>{ageOf(cur.patient.birthDate)} yosh · {cur.patient.gender === 'M' ? 'Erkak' : 'Ayol'}</span>
                <span><Phone size={15} /> {cur.patient.phone}</span>
                <span>Karta: {cur.patient.cardNo}</span>
              </div>
              {cur.complaint && <p style={{ marginBottom: 14 }}><b>Shikoyat:</b> {cur.complaint}</p>}
              {cur.patient.allergies && <p style={{ marginBottom: 14 }}><span className="allergy"><AlertTriangle size={14} /> Allergiya: {cur.patient.allergies}</span></p>}
              <div className="row wrap">
                <button className="btn light" onClick={() => setRec(cur)}><FileText size={17} /> Tibbiy yozuv yozish</button>
                <Link className="btn ghost" to={`/patients/${cur.patient.id}`}><ClipboardList size={17} /> Tibbiy karta</Link>
                <button className="btn ghost" onClick={() => finish(cur)} disabled={busy}><CheckCircle2 size={17} /> Yozuvsiz yakunlash</button>
                <button className="btn ghost" onClick={() => cancel(cur)} disabled={busy}><XCircle size={17} /> Bekor</button>
              </div>
            </div>
          ) : (
            <div className="card">
              <Empty icon={Stethoscope} title="Hozir qabulda bemor yo'q" text={d.waiting.length ? 'Keyingi bemorni chaqirish tugmasini bosing.' : "Navbatda kutayotgan bemor yo'q."} />
            </div>
          )}

          <div className="card">
            <div className="card-head"><h2>Oxirgi 7 kun</h2><span className="muted">Qabul qilingan bemorlar</span></div>
            <BarChart data={d.last7} height={150} />
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card">
            <div className="card-head"><h2>Navbat</h2><span className="badge warn">{d.waiting.length} kutmoqda</span></div>
            {d.waiting.length === 0 ? <Empty title="Navbat bo'sh" /> : (
              <div className="list">
                {d.waiting.map((v) => (
                  <div className="list-item" key={v.id}>
                    <span className={'t-badge' + (v.priority === 'urgent' ? ' urgent' : '')}>{v.ticket}</span>
                    <div className="grow">
                      <b>{v.patient.fullName}</b>
                      <small>{v.complaint || 'Shikoyat kiritilmagan'}</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {v.priority === 'urgent' && <span className="badge danger">Shoshilinch</span>}
                      <small className="muted mono" style={{ display: 'block' }}><Clock size={12} /> ~{v.eta} daq.</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><h2>So'nggi yozuvlar</h2></div>
            {d.recent.length === 0 ? <Empty title="Hali yozuvlar yo'q" /> : (
              <div className="list">
                {d.recent.map((r) => (
                  <Link className="list-item" key={r.id} to={`/patients/${r.patientId}`}>
                    <Avatar name={r.patient?.fullName || '?'} size={36} />
                    <div className="grow"><b>{r.patient?.fullName}</b><small>{r.diagnosis || r.complaints}</small></div>
                    <small className="muted mono">{fmtDate(r.createdAt)}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {rec && <RecordModal patient={rec.patient} visit={rec} onClose={() => setRec(null)} onSaved={reload} />}
    </>
  );
}
