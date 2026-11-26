import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, HeartPulse, Hourglass, Stethoscope, UserPlus, Users } from 'lucide-react';
import { useAuth, useFetch } from '../context';
import { api } from '../api';
import { Avatar, BarChart, Empty, PageHead, PageLoader, StatCard, StatusBadge, fmtTime } from '../ui';
import DoctorDashboard from './DoctorDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'doctor') return <DoctorDashboard />;
  return <Overview user={user} />;
}

function Overview({ user }) {
  const { data: s, loading, error } = useFetch(() => api.get('/stats'), [], 8000);
  const { data: queue } = useFetch(() => api.get('/queue'), [], 8000);
  if (loading) return <PageLoader />;
  if (error) return <div className="error-box">{error}</div>;
  const t = s.today;
  const active = (queue || []).filter((v) => ['in_progress', 'waiting'].includes(v.status)).slice(0, 7);
  const maxLoad = Math.max(1, ...s.byDoctor.map((d) => d.total));

  return (
    <>
      <PageHead title={`Salom, ${user.name.split(' ')[0]}!`} sub="Shifoxonaning bugungi holati — jonli ma'lumotlar">
        {(user.role === 'registrar' || user.role === 'admin') && (
          <Link to="/register" className="btn primary"><UserPlus size={18} /> Yangi bemorni ro'yxatga olish</Link>
        )}
      </PageHead>

      <div className="grid g4">
        <StatCard icon={Users} label="Bugungi bemorlar" value={t.total} hint={`+${s.newPatientsToday} yangi bemor`} tone="primary" />
        <StatCard icon={Hourglass} label="Navbatda kutmoqda" value={t.waiting} hint="hozirgi vaqtda" tone="warn" />
        <StatCard icon={HeartPulse} label="Hozir qabulda" value={t.inProgress} hint="faol shifokorlar" tone="info" />
        <StatCard icon={CheckCircle2} label="Yakunlangan" value={t.done} hint={`o'rtacha ${s.avgMinutes || '—'} daq. / qabul`} tone="ok" />
      </div>

      <div className="grid g-main mt">
        <div className="card">
          <div className="card-head"><h2>Oxirgi 7 kun — tashriflar</h2><span className="muted">Jami bemorlar bazasi: <b>{s.patientsTotal}</b></span></div>
          <BarChart data={s.last7} />
        </div>
        <div className="card">
          <div className="card-head"><h2>Shifokorlar yuklamasi</h2><Clock size={18} className="muted" /></div>
          {s.byDoctor.map((d) => (
            <div className="load-row" key={d.id}>
              <div className="row spread">
                <div className="row"><Avatar name={d.name} size={34} /><div><b>{d.name}</b><br /><small className="muted">{d.specialty} · xona {d.room}</small></div></div>
                <b className="mono">{d.done}/{d.total}</b>
              </div>
              <div className="progress"><i style={{ width: `${(d.total / maxLoad) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt">
        <div className="card-head"><h2>Hozirgi navbat</h2><Link to="/queue" className="btn soft sm">Hammasi</Link></div>
        {active.length === 0 ? <Empty icon={Stethoscope} title="Navbat bo'sh" text="Hozircha kutayotgan bemorlar yo'q." /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Talon</th><th>Bemor</th><th>Shifokor</th><th>Ro'yxatga olindi</th><th>Taxminiy kutish</th><th>Holat</th></tr></thead>
              <tbody>
                {active.map((v) => (
                  <tr key={v.id}>
                    <td><b className="q-ticket">{v.ticket}</b></td>
                    <td><div className="cell-user"><Avatar name={v.patient.fullName} size={34} /><div><b>{v.patient.fullName}</b><small>{v.patient.cardNo}</small></div></div></td>
                    <td>{v.doctor.name}<br /><small className="muted">{v.doctor.specialty} · {v.doctor.room}-xona</small></td>
                    <td className="mono">{fmtTime(v.createdAt)}</td>
                    <td className="mono">{v.status === 'waiting' ? `~${v.eta} daq.` : '—'}</td>
                    <td><StatusBadge status={v.status} />{v.priority === 'urgent' && <> <span className="badge danger">Shoshilinch</span></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
