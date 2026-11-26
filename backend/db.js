// Oddiy JSON-fayl asosidagi baza (hech qanday o'rnatish talab qilinmaydi).
// Keyinchalik PostgreSQL / MongoDB ga almashtirish oson: faqat shu fayl o'zgaradi.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const FILE = process.env.DB_FILE || path.join(__dirname, 'data.json');

const dstr = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-CA');
};
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const pad = (n, l = 3) => String(n).padStart(l, '0');

function seed() {
  const d = {
    counters: { user: 0, doctor: 0, patient: 0, visit: 0, record: 0 },
    users: [], doctors: [], patients: [], visits: [], records: [],
  };
  const id = (k) => ++d.counters[k];
  const hash = (p) => bcrypt.hashSync(p, 8);

  d.users.push({ id: id('user'), username: 'admin', passwordHash: hash('admin123'), name: 'Bosh administrator', role: 'admin' });
  d.users.push({ id: id('user'), username: 'reg', passwordHash: hash('reg123'), name: 'Nodira (Registratura)', role: 'registrar' });

  const docs = [
    ['Aziz Karimov', 'Terapevt', '101', 'T', 'dr.karimov'],
    ['Malika Tosheva', 'Kardiolog', '205', 'K', 'dr.tosheva'],
    ['Bobur Rahimov', 'Nevrolog', '312', 'N', 'dr.rahimov'],
    ['Dilnoza Yusupova', 'Pediatr', '108', 'P', 'dr.yusupova'],
  ];
  docs.forEach(([name, specialty, room, prefix, username]) => {
    const uid = id('user');
    const did = id('doctor');
    d.users.push({ id: uid, username, passwordHash: hash('doctor123'), name: 'Dr. ' + name, role: 'doctor', doctorId: did });
    d.doctors.push({ id: did, userId: uid, name: 'Dr. ' + name, specialty, room, prefix });
  });

  const names = [
    ['Abdullayev Jasur Rustamovich', 'M'], ['Karimova Zilola Akbarovna', 'F'], ["To'rayev Sardor Bahodirovich", 'M'],
    ['Ismoilova Madina Olimovna', 'F'], ["Nazarov Otabek Ravshanovich", 'M'], ['Xolmatova Gulnora Karimovna', 'F'],
    ["Qodirov Behruz Shavkatovich", 'M'], ['Sobirova Nilufar Anvarovna', 'F'], ["Mirzayev Sherzod Ilxomovich", 'M'],
    ['Ergasheva Shahnoza Jamolovna', 'F'], ["Rasulov Dilshod Alisherovich", 'M'], ['Tursunova Sevara Baxtiyorovna', 'F'],
  ];
  const blood = ['O(I) Rh+', 'A(II) Rh+', 'B(III) Rh+', 'AB(IV) Rh+', 'O(I) Rh-', 'A(II) Rh-'];
  const allergies = ['', '', '', 'Penitsillin', '', 'Chang-gard', '', 'Aspirin', '', '', 'Yong\'oq', ''];
  names.forEach(([fullName, gender], i) => {
    const pid = id('patient');
    d.patients.push({
      id: pid, cardNo: 'P-' + pad(pid, 5), fullName, gender,
      birthDate: `${rnd(1958, 2015)}-${pad(rnd(1, 12), 2)}-${pad(rnd(1, 28), 2)}`,
      phone: `+998 9${rnd(0, 9)} ${rnd(100, 999)} ${rnd(10, 99)} ${rnd(10, 99)}`,
      address: pick(['Toshkent sh., Chilonzor t.', 'Toshkent sh., Yunusobod t.', 'Toshkent sh., Mirzo Ulug\'bek t.', 'Toshkent sh., Sergeli t.', 'Toshkent vil., Chirchiq sh.']),
      bloodType: pick(blood), allergies: allergies[i] || '', createdAt: new Date(Date.now() - rnd(1, 90) * 864e5).toISOString(),
    });
  });

  const complaints = ['Bosh og\'rig\'i va holsizlik', 'Yo\'tal, harorat 37.8', 'Ko\'krak qafasida og\'riq', 'Qon bosimi yuqori', 'Bel og\'rig\'i', 'Bosh aylanishi', 'Oshqozon og\'rig\'i', 'Nafas qisilishi'];
  const diagnoses = ['O\'RVI', 'Arterial gipertenziya II daraja', 'Gastrit', 'Migren', 'Bronxit', 'Osteoxondroz', 'Vegetativ distoniya'];
  const drugs = [['Paratsetamol 500 mg', '1 tabl. kuniga 3 mahal', '5 kun'], ['Ibuprofen 400 mg', '1 tabl. kuniga 2 mahal', '5 kun'], ['Omeprazol 20 mg', '1 kapsula ertalab, och qoringa', '14 kun'], ['Amlodipin 5 mg', '1 tabl. kuniga 1 mahal', '30 kun'], ['Vitamin D3', '2000 ME kuniga', '30 kun']];

  const addVisit = (date, status, doctor, number, patient, extra = {}) => {
    const vid = id('visit');
    const base = new Date(date + 'T08:30:00');
    base.setMinutes(base.getMinutes() + number * 12);
    const created = base.toISOString();
    const called = status === 'waiting' ? null : new Date(base.getTime() + 5 * 60000).toISOString();
    const finished = status === 'done' ? new Date(base.getTime() + (5 + rnd(7, 16)) * 60000).toISOString() : null;
    const v = {
      id: vid, patientId: patient.id, doctorId: doctor.id, date, number,
      ticket: `${doctor.prefix}-${pad(number)}`, status, priority: 'normal',
      complaint: pick(complaints), createdAt: created, calledAt: called, finishedAt: finished, ...extra,
    };
    d.visits.push(v);
    if (status === 'done') {
      const rid = id('record');
      const dr = pick(drugs);
      d.records.push({
        id: rid, patientId: patient.id, visitId: vid, doctorId: doctor.id, date,
        complaints: v.complaint, diagnosis: pick(diagnoses),
        vitals: { bp: `${rnd(110, 150)}/${rnd(70, 95)}`, pulse: rnd(62, 96), temp: (36 + rnd(2, 20) / 10).toFixed(1), spo2: rnd(94, 99), weight: rnd(55, 95), height: rnd(155, 190) },
        prescriptions: [{ name: dr[0], dose: dr[1], duration: dr[2] }],
        notes: 'Shifokor tavsiyalariga rioya qilish, 7 kundan keyin qayta ko\'rik.',
        createdAt: finished,
      });
    }
    return v;
  };

  // Oxirgi 6 kun tarixi (grafiklar chiroyli ko'rinishi uchun)
  for (let off = -6; off <= -1; off++) {
    d.doctors.forEach((doc) => {
      const n = rnd(3, 9);
      for (let k = 1; k <= n; k++) addVisit(dstr(off), 'done', doc, k, pick(d.patients));
    });
  }
  // Bugun
  const t = dstr(0);
  d.doctors.forEach((doc, di) => {
    let n = 0;
    const done = rnd(2, 4);
    for (let k = 0; k < done; k++) addVisit(t, 'done', doc, ++n, pick(d.patients));
    addVisit(t, 'in_progress', doc, ++n, pick(d.patients));
    const wait = rnd(2, 4);
    for (let k = 0; k < wait; k++) {
      addVisit(t, 'waiting', doc, ++n, pick(d.patients), { createdAt: new Date(Date.now() - rnd(5, 60) * 60000).toISOString(), priority: di === 1 && k === 1 ? 'urgent' : 'normal' });
    }
  });
  return d;
}

let db;
function load() {
  if (fs.existsSync(FILE)) {
    try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); return; } catch (e) { console.error('data.json buzilgan, qayta yaratiladi'); }
  }
  db = seed();
  save();
}
let timer = null;
function save() {
  // Tez-tez yozishni birlashtirish (debounce)
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFileSync(FILE, JSON.stringify(db, null, 2)), 120);
}
function saveNow() { clearTimeout(timer); fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); }
const nextId = (k) => ++db.counters[k];

load();
module.exports = { get db() { return db; }, save, saveNow, nextId };
