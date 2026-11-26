import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context';
import { Field, Modal } from '../ui';

const emptyVitals = { bp: '', pulse: '', temp: '', spo2: '', weight: '', height: '' };

// patient: {id, fullName}; visit: joriy qabul (ixtiyoriy); record: tahrirlash uchun (ixtiyoriy)
export default function RecordModal({ patient, visit, record, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    complaints: record?.complaints ?? visit?.complaint ?? '',
    diagnosis: record?.diagnosis ?? '',
    notes: record?.notes ?? '',
    vitals: { ...emptyVitals, ...(record?.vitals || {}) },
    prescriptions: record?.prescriptions?.length ? record.prescriptions.map((p) => ({ ...p })) : [],
    finishVisit: true,
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setVital = (k, v) => setF((x) => ({ ...x, vitals: { ...x.vitals, [k]: v } }));
  const setRx = (i, k, v) => setF((x) => ({ ...x, prescriptions: x.prescriptions.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  const addRx = () => setF((x) => ({ ...x, prescriptions: [...x.prescriptions, { name: '', dose: '', duration: '' }] }));
  const delRx = (i) => setF((x) => ({ ...x, prescriptions: x.prescriptions.filter((_, j) => j !== i) }));

  const save = async () => {
    setErr(''); setBusy(true);
    try {
      const body = { ...f, patientId: patient.id, visitId: visit?.id };
      const r = record ? await api.put(`/records/${record.id}`, body) : await api.post('/records', body);
      toast.success(record ? 'Yozuv yangilandi' : visit && f.finishVisit ? 'Yozuv saqlandi, qabul yakunlandi' : 'Tibbiy yozuv saqlandi');
      onSaved?.(r);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const vit = (k, label, ph, step) => (
    <Field label={label}>
      <input className="input" inputMode="decimal" step={step} placeholder={ph} value={f.vitals[k]} onChange={(e) => setVital(k, e.target.value)} />
    </Field>
  );

  return (
    <Modal
      wide
      title={`${record ? 'Yozuvni tahrirlash' : 'Yangi tibbiy yozuv'} — ${patient.fullName}`}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Bekor qilish</button>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
      </>}
    >
      {err && <div className="error-box" style={{ marginBottom: 14 }}>{err}</div>}

      <div className="sec-title">Anamnez va tashxis</div>
      <div className="form-grid">
        <Field label="Shikoyatlar" className="full"><textarea className="input" value={f.complaints} onChange={(e) => set('complaints', e.target.value)} placeholder="Bemor shikoyatlari…" /></Field>
        <Field label="Tashxis" className="full"><input className="input" value={f.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="Masalan: O'RVI, Gastrit…" /></Field>
      </div>

      <div className="sec-title">Vital ko'rsatkichlar</div>
      <div className="vitals-form">
        {vit('bp', 'Qon bosimi', '120/80')}
        {vit('pulse', 'Puls (urish/daq.)', '72')}
        {vit('temp', 'Harorat (°C)', '36.6')}
        {vit('spo2', 'SpO₂ (%)', '98')}
        {vit('weight', 'Vazn (kg)', '70')}
        {vit('height', "Bo'y (sm)", '175')}
      </div>

      <div className="sec-title">Dori-darmonlar (retsept)</div>
      {f.prescriptions.map((p, i) => (
        <div className="rx-row" key={i}>
          <input className="input" placeholder="Dori nomi" value={p.name} onChange={(e) => setRx(i, 'name', e.target.value)} />
          <input className="input" placeholder="Qabul qilish tartibi" value={p.dose} onChange={(e) => setRx(i, 'dose', e.target.value)} />
          <input className="input" placeholder="Muddat" value={p.duration} onChange={(e) => setRx(i, 'duration', e.target.value)} />
          <button className="icon-btn" onClick={() => delRx(i)} aria-label="O'chirish"><Trash2 size={17} /></button>
        </div>
      ))}
      <button className="btn soft sm" onClick={addRx}><Plus size={16} /> Dori qo'shish</button>

      <div className="sec-title">Shifokor tavsiyalari</div>
      <textarea className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Tavsiyalar, qayta ko'rik muddati…" />

      {visit && !record && (
        <label className="check" style={{ marginTop: 18 }}>
          <input type="checkbox" checked={f.finishVisit} onChange={(e) => set('finishVisit', e.target.checked)} />
          Yozuvni saqlagach qabulni yakunlash ({visit.ticket})
        </label>
      )}
    </Modal>
  );
}
