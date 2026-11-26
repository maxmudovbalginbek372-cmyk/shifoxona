import { Field } from '../ui';

export const emptyPatient = { fullName: '', birthDate: '', gender: '', phone: '+998 ', address: '', bloodType: '', allergies: '' };
const BLOOD = ['', 'O(I) Rh+', 'O(I) Rh-', 'A(II) Rh+', 'A(II) Rh-', 'B(III) Rh+', 'B(III) Rh-', 'AB(IV) Rh+', 'AB(IV) Rh-'];

export default function PatientForm({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="form-grid">
      <Field label="F.I.Sh. *" className="full">
        <input className="input" value={value.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Familiya Ism Sharif" autoFocus />
      </Field>
      <Field label="Tug'ilgan sana *">
        <input className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={value.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
      </Field>
      <Field label="Jinsi *">
        <select className="input" value={value.gender} onChange={(e) => set('gender', e.target.value)}>
          <option value="">Tanlang…</option><option value="M">Erkak</option><option value="F">Ayol</option>
        </select>
      </Field>
      <Field label="Telefon *">
        <input className="input" type="tel" value={value.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+998 90 123 45 67" />
      </Field>
      <Field label="Qon guruhi">
        <select className="input" value={value.bloodType} onChange={(e) => set('bloodType', e.target.value)}>
          {BLOOD.map((b) => <option key={b} value={b}>{b || 'Noma\'lum'}</option>)}
        </select>
      </Field>
      <Field label="Manzil" className="full">
        <input className="input" value={value.address} onChange={(e) => set('address', e.target.value)} placeholder="Shahar, tuman, ko'cha" />
      </Field>
      <Field label="Allergiyalar" className="full" hint="Bo'sh qoldirsangiz — allergiya yo'q">
        <input className="input" value={value.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="Masalan: Penitsillin, chang…" />
      </Field>
    </div>
  );
}
