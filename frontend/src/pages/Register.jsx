import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, Clock, Printer, Search, UserPlus, Users } from 'lucide-react';
import { api } from '../api';
import { useFetch, useToast } from '../context';
import { Avatar, Empty, Field, Modal, PageHead, ageOf, fmtDate, fmtTime } from '../ui';
import PatientForm, { emptyPatient } from '../components/PatientForm';

export default function Register() {
  const toast = useToast();
  const [mode, setMode] = useState('search'); // search | new
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState(emptyPatient);
  const [doctorId, setDoctorId] = useState(null);
  const [complaint, setComplaint] = useState('');
  const [priority, setPriority] = useState('normal');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ticket, setTicket] = useState(null);

  const { data: doctors, reload: reloadDocs } = useFetch(() => api.get('/doctors'), [], 8000);

  // Bemorni jonli qidirish (debounce)
  useEffect(() => {
    if (mode !== 'search') return;
    const t = setTimeout(() => {
      api.get('/patients?limit=8&q=' + encodeURIComponent(q)).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, mode]);

  const reset = () => {
    setPatient(null); setForm(emptyPatient); setComplaint(''); setPriority('normal'); setDoctorId(null);
    setQ(''); setMode('search'); setErr('');
  };

  const submit = async () => {
    setErr('');
    if (!doctorId) return setErr('Shifokorni tanlang');
    setBusy(true);
    try {
      let p = patient;
      if (mode === 'new') {
        try {
          p = await api.post('/patients', form);
          toast.success(`Yangi bemor kartasi ochildi: ${p.cardNo}`);
        } catch (e) {
          if (e.status === 409 && e.data?.existingId) {
            const existing = await api.get('/patients/' + e.data.existingId);
            setPatient(existing.patient); setMode('search');
            throw new Error(e.message + '. Mavjud bemor tanlandi — shifokorni tanlab, qayta bosing.');
          }
          throw e;
        }
      }
      if (!p) throw new Error('Bemorni tanlang yoki yangi bemor ma\'lumotlarini kiriting');
      const v = await api.post('/queue', { patientId: p.id, doctorId, complaint, priority });
      setTicket(v);
      reloadDocs();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const selDoc = doctors?.find((d) => d.id === doctorId);

  return (
    <>
      <PageHead title="Ro'yxatga olish" sub="Bemorni tanlang yoki yangi karta oching — navbat raqami avtomatik beriladi" />

      <div className="grid g2" style={{ alignItems: 'start' }}>
        {/* 1-qadam: bemor */}
        <div className="card">
          <div className="steps"><span className="step-n">1</span><h2>Bemor</h2>
            <div className="seg" style={{ marginLeft: 'auto' }}>
              <button className={mode === 'search' ? 'on' : ''} onClick={() => setMode('search')}><Search size={15} /> Mavjud</button>
              <button className={mode === 'new' ? 'on' : ''} onClick={() => { setMode('new'); setPatient(null); }}><UserPlus size={15} /> Yangi</button>
            </div>
          </div>

          {mode === 'search' ? (
            <>
              {patient ? (
                <div className="selected-banner">
                  <Avatar name={patient.fullName} size={42} />
                  <div style={{ flex: 1 }}><b>{patient.fullName}</b><br /><small className="muted">{patient.cardNo} · {ageOf(patient.birthDate)} yosh · {patient.phone}</small></div>
                  <button className="btn ghost sm" onClick={() => setPatient(null)}>O'zgartirish</button>
                </div>
              ) : (
                <>
                  <div className="search"><Search size={18} /><input className="input" placeholder="F.I.Sh., telefon yoki karta raqami…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div>
                  <div className="patient-pick">
                    {results.length === 0 ? (
                      <Empty icon={Users} title="Bemor topilmadi" text="«Yangi» bo'limida yangi bemor kartasini oching.">
                        <button className="btn soft sm" onClick={() => setMode('new')}><UserPlus size={15} /> Yangi bemor</button>
                      </Empty>
                    ) : results.map((p) => (
                      <button key={p.id} className="pick" onClick={() => setPatient(p)}>
                        <Avatar name={p.fullName} size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}><b>{p.fullName}</b><small>{p.cardNo} · {fmtDate(p.birthDate)} · {p.phone}</small></div>
                        {p.allergies && <span className="badge danger"><AlertTriangle size={12} /> Allergiya</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <PatientForm value={form} onChange={setForm} />
          )}
        </div>

        {/* 2-qadam: shifokor va navbat */}
        <div className="card">
          <div className="steps"><span className="step-n">2</span><h2>Shifokor va navbat</h2></div>
          <div className="doc-grid">
            {(doctors || []).map((d) => (
              <button key={d.id} className={'doc-card' + (doctorId === d.id ? ' sel' : '')} onClick={() => setDoctorId(d.id)}>
                <div className="row"><Avatar name={d.name} size={40} />
                  <div><b>{d.name}</b><small className="muted">{d.specialty} · {d.room}-xona</small></div>
                </div>
                <div className="meta">
                  <span className={'badge ' + (d.waiting > 4 ? 'danger' : d.waiting > 1 ? 'warn' : 'ok')}>{d.waiting} kutmoqda</span>
                  <span><Clock size={12} /> ~{(d.waiting + (d.inProgress ? 1 : 0)) * d.avgMinutes} daq.</span>
                </div>
              </button>
            ))}
          </div>

          <div className="col" style={{ marginTop: 18, gap: 14 }}>
            <Field label="Shikoyat / tashrif sababi">
              <textarea className="input" value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Masalan: bosh og'rig'i, harorat…" />
            </Field>
            <div className="row spread wrap">
              <span className="muted" style={{ fontWeight: 700, fontSize: '.8rem' }}>Ustuvorlik</span>
              <div className="seg">
                <button className={priority === 'normal' ? 'on' : ''} onClick={() => setPriority('normal')}>Oddiy</button>
                <button className={priority === 'urgent' ? 'on urgent' : ''} onClick={() => setPriority('urgent')}><AlertTriangle size={14} /> Shoshilinch</button>
              </div>
            </div>
            {err && <div className="error-box">{err}</div>}
            <button className="btn primary lg block" onClick={submit} disabled={busy}>
              <CheckCircle2 size={19} /> {busy ? 'Saqlanmoqda…' : "Ro'yxatga olish va talon berish"}
            </button>
          </div>
        </div>
      </div>

      {ticket && (
        <Modal title="Navbat talon" onClose={() => { setTicket(null); reset(); }}
          footer={<>
            <button className="btn ghost" onClick={() => window.print()}><Printer size={17} /> Chop etish</button>
            <button className="btn primary" onClick={() => { setTicket(null); reset(); }}>Keyingi bemor</button>
          </>}>
          <div className="ticket print-area">
            <div className="ticket-brand"><Activity size={20} /> MedCare</div>
            <small className="muted">Sizning navbat raqamingiz</small>
            <div className="ticket-no">{ticket.ticket}</div>
            {ticket.priority === 'urgent' && <span className="badge danger">Shoshilinch</span>}
            <dl>
              <dt>Bemor</dt><dd>{ticket.patient.fullName}</dd>
              <dt>Karta</dt><dd>{ticket.patient.cardNo}</dd>
              <dt>Shifokor</dt><dd>{ticket.doctor.name}</dd>
              <dt>Mutaxassislik</dt><dd>{ticket.doctor.specialty}</dd>
              <dt>Xona</dt><dd>{ticket.doctor.room}</dd>
              <dt>Navbatdagi o'rni</dt><dd>{ticket.position}-chi</dd>
              <dt>Taxminiy kutish</dt><dd>~{ticket.eta} daq.</dd>
              <dt>Berilgan vaqt</dt><dd>{fmtDate(ticket.createdAt)} {fmtTime(ticket.createdAt)}</dd>
            </dl>
          </div>
          <p className="muted no-print" style={{ textAlign: 'center', marginTop: 12 }}>
            Navbat holati <Link to="/tv" target="_blank" style={{ color: 'var(--primary)', fontWeight: 700 }}>TV ekranda</Link> ko'rinadi.
          </p>
        </Modal>
      )}
    </>
  );
}
