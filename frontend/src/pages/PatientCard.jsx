import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Droplet, FileText, HeartPulse, Lock, MapPin, Pencil, Phone, Pill, Plus, Printer, Thermometer, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useAuth, useFetch, useToast } from '../context';
import { Avatar, Badge, Empty, LineChart, Modal, PageLoader, StatusBadge, ageOf, fmtDate, fmtDateTime, fmtTime } from '../ui';
import PatientForm from '../components/PatientForm';
import RecordModal from '../components/RecordModal';

export default function PatientCard() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get('/patients/' + id), [id]);
  const [tab, setTab] = useState('records');
  const [recModal, setRecModal] = useState(null); // {record?}
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const records = data?.records;
  const trends = useMemo(() => {
    if (!records) return [];
    const asc = [...records].reverse();
    const mk = (key, label, unit, color) => ({
      key, label, unit, color,
      points: asc.filter((r) => r.vitals?.[key] !== '' && r.vitals?.[key] != null && !isNaN(Number(r.vitals[key])))
        .map((r) => ({ label: fmtDate(r.date), value: Number(r.vitals[key]) })),
    });
    return [mk('pulse', 'Puls', ' /daq', 'var(--danger)'), mk('temp', 'Harorat', '°', 'var(--warn)'), mk('weight', 'Vazn', ' kg', 'var(--info)'), mk('spo2', 'SpO₂', '%', 'var(--primary)')];
  }, [records]);

  if (loading) return <PageLoader />;
  if (error) return <div className="error-box">{error}</div>;
  const { patient: p, visits, canSeeRecords } = data;
  const canWrite = user.role === 'doctor' || user.role === 'admin';
  const activeVisit = visits.find((v) => v.status === 'in_progress' && (user.role === 'admin' || v.doctor.id === user.doctorId));

  const savePatient = async () => {
    setBusy(true);
    try { await api.put('/patients/' + p.id, edit); toast.success("Ma'lumotlar yangilandi"); setEdit(null); reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const delRecord = async (r) => {
    if (!window.confirm("Bu tibbiy yozuvni o'chirasizmi?")) return;
    try { await api.del('/records/' + r.id); toast.success("Yozuv o'chirildi"); reload(); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <div className="no-print" style={{ marginBottom: 14 }}>
        <Link to="/patients" className="btn ghost sm"><ArrowLeft size={15} /> Ortga</Link>
      </div>

      <div className="card p-hero print-area">
        <Avatar name={p.fullName} size={84} />
        <div className="info">
          <div className="row wrap"><h1>{p.fullName}</h1><Badge tone="primary">{p.cardNo}</Badge></div>
          <dl className="kv">
            <div><dt>Yosh</dt><dd>{ageOf(p.birthDate)} ({fmtDate(p.birthDate)})</dd></div>
            <div><dt>Jinsi</dt><dd>{p.gender === 'M' ? 'Erkak' : 'Ayol'}</dd></div>
            <div><dt>Qon guruhi</dt><dd><Droplet size={14} style={{ color: 'var(--danger)', verticalAlign: '-2px' }} /> {p.bloodType || "Noma'lum"}</dd></div>
            <div><dt>Telefon</dt><dd><Phone size={13} style={{ verticalAlign: '-1px' }} /> {p.phone}</dd></div>
            <div><dt>Manzil</dt><dd><MapPin size={13} style={{ verticalAlign: '-1px' }} /> {p.address || '—'}</dd></div>
            <div><dt>Tashriflar</dt><dd>{p.visitsCount} marta</dd></div>
          </dl>
          {p.allergies ? <p style={{ marginTop: 14 }}><span className="badge danger"><AlertTriangle size={13} /> Allergiya: {p.allergies}</span></p> : null}
        </div>
        <div className="col no-print">
          {canWrite && <button className="btn primary" onClick={() => setRecModal({ visit: activeVisit })}><Plus size={17} /> Yangi yozuv</button>}
          <button className="btn ghost" onClick={() => setEdit({ ...p })}><Pencil size={16} /> Tahrirlash</button>
          <button className="btn ghost" onClick={() => window.print()}><Printer size={16} /> Chop etish</button>
        </div>
      </div>

      <div className="tabs no-print">
        <button className={'tab' + (tab === 'records' ? ' on' : '')} onClick={() => setTab('records')}><FileText size={17} /> Tibbiy yozuvlar {records && <Badge tone="muted">{records.length}</Badge>}</button>
        <button className={'tab' + (tab === 'trends' ? ' on' : '')} onClick={() => setTab('trends')}><HeartPulse size={17} /> Ko'rsatkichlar dinamikasi</button>
        <button className={'tab' + (tab === 'rx' ? ' on' : '')} onClick={() => setTab('rx')}><Pill size={17} /> Dorilar tarixi</button>
        <button className={'tab' + (tab === 'visits' ? ' on' : '')} onClick={() => setTab('visits')}><Thermometer size={17} /> Tashriflar</button>
      </div>

      {!canSeeRecords && tab !== 'visits' ? (
        <div className="lock"><Lock size={26} /><div><b>Tibbiy ma'lumotlar yopiq</b><p className="muted">Tashxis, retsept va vital ko'rsatkichlarni faqat shifokorlar ko'ra oladi.</p></div></div>
      ) : (
        <>
          {tab === 'records' && (records.length === 0 ? (
            <div className="card"><Empty icon={FileText} title="Tibbiy yozuvlar yo'q" text="Birinchi yozuvni qo'shing.">{canWrite && <button className="btn soft sm" onClick={() => setRecModal({})}><Plus size={15} /> Yozuv qo'shish</button>}</Empty></div>
          ) : (
            <div className="timeline">
              {records.map((r) => (
                <article className="card t-item" key={r.id}>
                  <div className="rec-head">
                    <div>
                      <div className="rec-diag">{r.diagnosis || 'Tashxis ko\'rsatilmagan'}</div>
                      <small className="muted">{fmtDateTime(r.createdAt)} · {r.doctor?.name} ({r.doctor?.specialty})</small>
                    </div>
                    {canWrite && (user.role === 'admin' || r.doctorId === user.doctorId) && (
                      <div className="row no-print">
                        <button className="icon-btn" onClick={() => setRecModal({ record: r })} aria-label="Tahrirlash"><Pencil size={16} /></button>
                        <button className="icon-btn" onClick={() => delRecord(r)} aria-label="O'chirish"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>
                  {r.complaints && <div className="rec-sec"><h4>Shikoyatlar</h4><p>{r.complaints}</p></div>}
                  {Object.values(r.vitals || {}).some((x) => x !== '' && x != null) && (
                    <div className="rec-sec"><h4>Vital ko'rsatkichlar</h4>
                      <div className="vitals">
                        {r.vitals.bp && <span className="vital"><i>AB</i> {r.vitals.bp}</span>}
                        {r.vitals.pulse !== '' && r.vitals.pulse != null && <span className="vital"><i>Puls</i> {r.vitals.pulse}</span>}
                        {r.vitals.temp !== '' && r.vitals.temp != null && <span className="vital"><i>T°</i> {r.vitals.temp}</span>}
                        {r.vitals.spo2 !== '' && r.vitals.spo2 != null && <span className="vital"><i>SpO₂</i> {r.vitals.spo2}%</span>}
                        {r.vitals.weight !== '' && r.vitals.weight != null && <span className="vital"><i>Vazn</i> {r.vitals.weight} kg</span>}
                        {r.vitals.height !== '' && r.vitals.height != null && <span className="vital"><i>Bo'y</i> {r.vitals.height} sm</span>}
                      </div>
                    </div>
                  )}
                  {r.prescriptions?.length > 0 && (
                    <div className="rec-sec"><h4>Retsept</h4>
                      <div className="rx">{r.prescriptions.map((x, i) => <div key={i}><Pill size={16} /><b>{x.name}</b><small>{[x.dose, x.duration].filter(Boolean).join(' · ')}</small></div>)}</div>
                    </div>
                  )}
                  {r.notes && <div className="rec-sec"><h4>Tavsiyalar</h4><p>{r.notes}</p></div>}
                </article>
              ))}
            </div>
          ))}

          {tab === 'trends' && (
            <div className="grid g2">
              {trends.map((t) => (
                <div className="card" key={t.key}>
                  <div className="card-head"><h2>{t.label}</h2><Badge tone="muted">{t.points.length} ta o'lchov</Badge></div>
                  {t.points.length === 0 ? <Empty title="Ma'lumot yo'q" /> : <LineChart points={t.points} color={t.color} unit={t.unit} />}
                </div>
              ))}
            </div>
          )}

          {tab === 'rx' && (
            <div className="card">
              {records.flatMap((r) => (r.prescriptions || []).map((x) => ({ ...x, date: r.date, doctor: r.doctor, diagnosis: r.diagnosis }))).length === 0
                ? <Empty icon={Pill} title="Dorilar tarixi bo'sh" />
                : (
                  <div className="table-wrap"><table>
                    <thead><tr><th>Sana</th><th>Dori</th><th>Qabul tartibi</th><th>Muddat</th><th>Tashxis</th></tr></thead>
                    <tbody>{records.flatMap((r) => (r.prescriptions || []).map((x, i) => (
                      <tr key={r.id + '-' + i}><td className="mono">{fmtDate(r.date)}</td><td><b>{x.name}</b></td><td>{x.dose || '—'}</td><td>{x.duration || '—'}</td><td>{r.diagnosis || '—'}</td></tr>
                    )))}</tbody>
                  </table></div>
                )}
            </div>
          )}
        </>
      )}

      {tab === 'visits' && (
        <div className="card">
          {visits.length === 0 ? <Empty title="Tashriflar yo'q" /> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Sana</th><th>Talon</th><th>Shifokor</th><th>Shikoyat</th><th>Vaqt</th><th>Holat</th></tr></thead>
              <tbody>{visits.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{fmtDate(v.date)}</td><td><b className="q-ticket">{v.ticket}</b></td>
                  <td>{v.doctor.name}<br /><small className="muted">{v.doctor.specialty}</small></td>
                  <td>{v.complaint || '—'}</td>
                  <td className="mono">{fmtTime(v.createdAt)}{v.finishedAt ? ' – ' + fmtTime(v.finishedAt) : ''}</td>
                  <td><StatusBadge status={v.status} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {recModal && <RecordModal patient={p} visit={recModal.visit} record={recModal.record} onClose={() => setRecModal(null)} onSaved={reload} />}

      {edit && (
        <Modal wide title="Bemor ma'lumotlarini tahrirlash" onClose={() => setEdit(null)}
          footer={<><button className="btn ghost" onClick={() => setEdit(null)}>Bekor qilish</button><button className="btn primary" onClick={savePatient} disabled={busy}>Saqlash</button></>}>
          <PatientForm value={edit} onChange={setEdit} />
        </Modal>
      )}
    </>
  );
}
