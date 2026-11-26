const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('./db');

const app = express();
const SECRET = process.env.JWT_SECRET || 'shifoxona-dev-secret-ozgartiring';
const PORT = process.env.PORT || 4000;
const db = () => store.db;

// CORS_ORIGIN: ruxsat etilgan sayt(lar), vergul bilan. Bo'sh bo'lsa — hammaga ochiq.
// Netlify /api proxy ishlatilsa, CORS kerak emas.
const ORIGINS = (process.env.CORS_ORIGIN || '').split(',').map((x) => x.trim()).filter(Boolean);
app.use(cors(ORIGINS.length ? { origin: ORIGINS } : undefined));
app.use(express.json({ limit: '1mb' }));

/* ───────────── Yordamchi funksiyalar ───────────── */
const today = () => new Date().toLocaleDateString('en-CA');
const pad = (n, l = 3) => String(n).padStart(l, '0');
const sortWaiting = (a, b) => (b.priority === 'urgent') - (a.priority === 'urgent') || a.number - b.number;
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const bad = (res, msg, code = 400, extra = {}) => res.status(code).json({ error: msg, ...extra });

function auth(roles = []) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const t = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!t) return bad(res, 'Avtorizatsiya talab qilinadi', 401);
    try { req.user = jwt.verify(t, SECRET); } catch { return bad(res, 'Sessiya tugagan, qaytadan kiring', 401); }
    if (roles.length && req.user.role !== 'admin' && !roles.includes(req.user.role)) return bad(res, "Bu amal uchun ruxsat yo'q", 403);
    next();
  };
}

function publicUser(u) {
  const doctor = u.doctorId ? db().doctors.find((d) => d.id === u.doctorId) : null;
  return { id: u.id, name: u.name, username: u.username, role: u.role, doctorId: u.doctorId || null, doctor };
}

function avgDuration(doctorId) {
  const ds = db().visits
    .filter((v) => v.doctorId === doctorId && v.status === 'done' && v.calledAt && v.finishedAt)
    .slice(-30)
    .map((v) => (new Date(v.finishedAt) - new Date(v.calledAt)) / 60000)
    .filter((x) => x > 0 && x < 120);
  if (!ds.length) return 10;
  return Math.max(3, Math.round(ds.reduce((a, b) => a + b, 0) / ds.length));
}

// Bugungi kutayotgan bemorlar uchun o'rin va taxminiy kutish vaqti
function positionInfo() {
  const t = today();
  const info = {};
  const byDoc = {};
  db().visits.filter((v) => v.date === t && v.status === 'waiting').forEach((v) => (byDoc[v.doctorId] = byDoc[v.doctorId] || []).push(v));
  Object.entries(byDoc).forEach(([did, arr]) => {
    const docId = Number(did);
    arr.sort(sortWaiting);
    const avg = avgDuration(docId);
    const busy = db().visits.some((x) => x.doctorId === docId && x.date === t && x.status === 'in_progress');
    arr.forEach((v, i) => { info[v.id] = { position: i + 1, eta: (i + (busy ? 1 : 0)) * avg }; });
  });
  return info;
}

function enrichVisit(v, pos = {}) {
  const p = db().patients.find((x) => x.id === v.patientId);
  const d = db().doctors.find((x) => x.id === v.doctorId);
  return {
    ...v,
    position: pos[v.id]?.position ?? null,
    eta: pos[v.id]?.eta ?? null,
    patient: p ? { id: p.id, cardNo: p.cardNo, fullName: p.fullName, birthDate: p.birthDate, gender: p.gender, phone: p.phone, allergies: p.allergies } : null,
    doctor: d ? { id: d.id, name: d.name, specialty: d.specialty, room: d.room } : null,
  };
}

function doctorStats(d) {
  const t = today();
  const todays = db().visits.filter((v) => v.doctorId === d.id && v.date === t);
  return {
    ...d,
    waiting: todays.filter((v) => v.status === 'waiting').length,
    inProgress: todays.filter((v) => v.status === 'in_progress').length,
    done: todays.filter((v) => v.status === 'done').length,
    total: todays.filter((v) => v.status !== 'cancelled').length,
    avgMinutes: avgDuration(d.id),
  };
}

function last7(filter = () => true) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const ds = dt.toLocaleDateString('en-CA');
    const count = db().visits.filter((v) => v.date === ds && v.status !== 'cancelled' && filter(v)).length;
    out.push({ date: ds, label: ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'][dt.getDay()], day: dt.getDate(), value: count });
  }
  return out;
}

function counts(list) {
  return {
    total: list.filter((v) => v.status !== 'cancelled').length,
    waiting: list.filter((v) => v.status === 'waiting').length,
    inProgress: list.filter((v) => v.status === 'in_progress').length,
    done: list.filter((v) => v.status === 'done').length,
    cancelled: list.filter((v) => v.status === 'cancelled').length,
  };
}

/* ───────────── Auth ───────────── */
app.post('/api/auth/login', (req, res) => {
  const username = str(req.body?.username).toLowerCase();
  const password = req.body?.password || '';
  const u = db().users.find((x) => x.username === username);
  if (!u || !bcrypt.compareSync(password, u.passwordHash)) return bad(res, "Login yoki parol noto'g'ri", 401);
  const token = jwt.sign({ id: u.id, role: u.role, doctorId: u.doctorId || null, name: u.name }, SECRET, { expiresIn: '12h' });
  res.json({ token, user: publicUser(u) });
});

app.get('/api/auth/me', auth(), (req, res) => {
  const u = db().users.find((x) => x.id === req.user.id);
  if (!u) return bad(res, 'Foydalanuvchi topilmadi', 401);
  res.json(publicUser(u));
});

/* ───────────── Shifokorlar ───────────── */
app.get('/api/doctors', auth(), (req, res) => {
  res.json(db().doctors.map(doctorStats));
});

app.post('/api/doctors', auth(['admin']), (req, res) => {
  const { name, specialty, room, username, password } = req.body || {};
  if (!str(name) || !str(specialty) || !str(room) || !str(username) || str(password).length < 6) {
    return bad(res, "Barcha maydonlarni to'ldiring (parol kamida 6 belgi)");
  }
  const login = str(username).toLowerCase();
  if (db().users.some((u) => u.username === login)) return bad(res, 'Bu login band', 409);
  // Prefiks: mutaxassislikning birinchi harfi, band bo'lsa keyingisi
  const used = new Set(db().doctors.map((d) => d.prefix));
  const letters = (str(specialty).toUpperCase() + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').replace(/[^A-Z]/g, '');
  const prefix = [...letters].find((c) => !used.has(c)) || 'X';
  const uid = store.nextId('user');
  const did = store.nextId('doctor');
  const full = str(name).startsWith('Dr.') ? str(name) : 'Dr. ' + str(name);
  db().users.push({ id: uid, username: login, passwordHash: bcrypt.hashSync(password, 8), name: full, role: 'doctor', doctorId: did });
  const doc = { id: did, userId: uid, name: full, specialty: str(specialty), room: str(room), prefix };
  db().doctors.push(doc);
  store.save();
  res.status(201).json(doctorStats(doc));
});

app.get('/api/doctor/dashboard', auth(['doctor']), (req, res) => {
  const did = req.user.role === 'doctor' ? req.user.doctorId : Number(req.query.doctorId);
  const doctor = db().doctors.find((d) => d.id === did);
  if (!doctor) return bad(res, 'Shifokor topilmadi', 404);
  const t = today();
  const pos = positionInfo();
  const todays = db().visits.filter((v) => v.doctorId === did && v.date === t);
  const current = todays.find((v) => v.status === 'in_progress');
  const waiting = todays.filter((v) => v.status === 'waiting').sort(sortWaiting);
  const finished = todays.filter((v) => v.status === 'done').sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
  const recent = db().records
    .filter((r) => r.doctorId === did)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)
    .map((r) => ({ ...r, patient: db().patients.find((p) => p.id === r.patientId) }));
  const uniquePatients = new Set(db().visits.filter((v) => v.doctorId === did && v.status === 'done').map((v) => v.patientId)).size;
  res.json({
    doctor: doctorStats(doctor),
    counts: counts(todays),
    avgMinutes: avgDuration(did),
    current: current ? enrichVisit(current, pos) : null,
    waiting: waiting.map((v) => enrichVisit(v, pos)),
    finished: finished.slice(0, 5).map((v) => enrichVisit(v, pos)),
    last7: last7((v) => v.doctorId === did),
    recent,
    uniquePatients,
  });
});

/* ───────────── Bemorlar ───────────── */
const patientView = (p) => ({ ...p, visitsCount: db().visits.filter((v) => v.patientId === p.id && v.status === 'done').length });

app.get('/api/patients', auth(), (req, res) => {
  const q = str(req.query.q).toLowerCase();
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  let list = db().patients;
  if (q) list = list.filter((p) => p.fullName.toLowerCase().includes(q) || p.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || p.cardNo.toLowerCase().includes(q));
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  res.json(list.map(patientView));
});

function validatePatient(b) {
  if (str(b.fullName).length < 5) return 'F.I.Sh. ni to\'liq kiriting';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(b.birthDate))) return "Tug'ilgan sanani kiriting";
  if (new Date(b.birthDate) > new Date()) return "Tug'ilgan sana kelajakda bo'lishi mumkin emas";
  if (!['M', 'F'].includes(b.gender)) return 'Jinsni tanlang';
  if (str(b.phone).replace(/\D/g, '').length < 9) return "Telefon raqamini to'g'ri kiriting";
  return null;
}

app.post('/api/patients', auth(['registrar', 'doctor']), (req, res) => {
  const b = req.body || {};
  const err = validatePatient(b);
  if (err) return bad(res, err);
  const dup = db().patients.find((p) => p.fullName.toLowerCase() === str(b.fullName).toLowerCase() && p.birthDate === b.birthDate);
  if (dup) return bad(res, `Bunday bemor allaqachon mavjud (${dup.cardNo})`, 409, { existingId: dup.id });
  const id = store.nextId('patient');
  const p = {
    id, cardNo: 'P-' + pad(id, 5), fullName: str(b.fullName), gender: b.gender, birthDate: b.birthDate,
    phone: str(b.phone), address: str(b.address), bloodType: str(b.bloodType), allergies: str(b.allergies),
    createdAt: new Date().toISOString(),
  };
  db().patients.push(p);
  store.save();
  res.status(201).json(patientView(p));
});

app.get('/api/patients/:id', auth(), (req, res) => {
  const p = db().patients.find((x) => x.id === Number(req.params.id));
  if (!p) return bad(res, 'Bemor topilmadi', 404);
  const visits = db().visits.filter((v) => v.patientId === p.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((v) => enrichVisit(v));
  const canSeeRecords = ['admin', 'doctor'].includes(req.user.role);
  const records = canSeeRecords
    ? db().records.filter((r) => r.patientId === p.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((r) => ({ ...r, doctor: db().doctors.find((d) => d.id === r.doctorId) || null }))
    : null;
  res.json({ patient: patientView(p), visits, records, canSeeRecords });
});

app.put('/api/patients/:id', auth(['registrar', 'doctor']), (req, res) => {
  const p = db().patients.find((x) => x.id === Number(req.params.id));
  if (!p) return bad(res, 'Bemor topilmadi', 404);
  const b = { ...p, ...req.body };
  const err = validatePatient(b);
  if (err) return bad(res, err);
  Object.assign(p, {
    fullName: str(b.fullName), gender: b.gender, birthDate: b.birthDate, phone: str(b.phone),
    address: str(b.address), bloodType: str(b.bloodType), allergies: str(b.allergies),
  });
  store.save();
  res.json(patientView(p));
});

/* ───────────── Navbat (avtomatik) ───────────── */
app.get('/api/queue', auth(), (req, res) => {
  const date = str(req.query.date) || today();
  let did = req.query.doctorId ? Number(req.query.doctorId) : null;
  if (req.user.role === 'doctor') did = req.user.doctorId;
  const pos = positionInfo();
  const list = db().visits.filter((v) => v.date === date && (!did || v.doctorId === did));
  list.sort((a, b) => {
    const w = (s) => ({ in_progress: 0, waiting: 1, done: 2, cancelled: 3 }[s]);
    if (a.status !== b.status) return w(a.status) - w(b.status);
    if (a.status === 'waiting') return sortWaiting(a, b);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json(list.map((v) => enrichVisit(v, pos)));
});

app.post('/api/queue', auth(['registrar']), (req, res) => {
  const { patientId, doctorId, complaint, priority } = req.body || {};
  const patient = db().patients.find((p) => p.id === Number(patientId));
  const doctor = db().doctors.find((d) => d.id === Number(doctorId));
  if (!patient) return bad(res, 'Bemor topilmadi', 404);
  if (!doctor) return bad(res, 'Shifokorni tanlang', 400);
  const t = today();
  const dup = db().visits.find((v) => v.patientId === patient.id && v.doctorId === doctor.id && v.date === t && ['waiting', 'in_progress'].includes(v.status));
  if (dup) return bad(res, `Bemor allaqachon ushbu shifokor navbatida (${dup.ticket})`, 409);
  // Avtomatik raqam: shifokor bo'yicha kunlik ketma-ketlik
  const number = db().visits.filter((v) => v.doctorId === doctor.id && v.date === t).reduce((m, v) => Math.max(m, v.number), 0) + 1;
  const v = {
    id: store.nextId('visit'), patientId: patient.id, doctorId: doctor.id, date: t, number,
    ticket: `${doctor.prefix}-${pad(number)}`, status: 'waiting',
    priority: priority === 'urgent' ? 'urgent' : 'normal', complaint: str(complaint),
    createdAt: new Date().toISOString(), calledAt: null, finishedAt: null,
  };
  db().visits.push(v);
  store.save();
  res.status(201).json(enrichVisit(v, positionInfo()));
});

// Keyingi bemorni chaqirish (navbat bo'yicha, shoshilinch birinchi)
app.post('/api/queue/next', auth(['doctor']), (req, res) => {
  const did = req.user.role === 'doctor' ? req.user.doctorId : Number(req.body?.doctorId);
  if (!db().doctors.some((d) => d.id === did)) return bad(res, 'Shifokor topilmadi', 404);
  const t = today();
  if (db().visits.some((v) => v.doctorId === did && v.date === t && v.status === 'in_progress')) {
    return bad(res, 'Avval joriy qabulni yakunlang', 409);
  }
  const next = db().visits.filter((v) => v.doctorId === did && v.date === t && v.status === 'waiting').sort(sortWaiting)[0];
  if (!next) return bad(res, "Navbatda bemor yo'q", 404);
  next.status = 'in_progress';
  next.calledAt = new Date().toISOString();
  store.save();
  res.json(enrichVisit(next, positionInfo()));
});

app.patch('/api/queue/:id', auth(['doctor', 'registrar']), (req, res) => {
  const v = db().visits.find((x) => x.id === Number(req.params.id));
  if (!v) return bad(res, 'Navbat topilmadi', 404);
  const { status } = req.body || {};
  const role = req.user.role;
  if (role === 'doctor' && v.doctorId !== req.user.doctorId) return bad(res, "Bu bemor boshqa shifokorga tegishli", 403);
  const allowed = {
    in_progress: { from: ['waiting'], roles: ['doctor', 'admin'] },
    done: { from: ['in_progress'], roles: ['doctor', 'admin'] },
    cancelled: { from: ['waiting', 'in_progress'], roles: ['doctor', 'admin', 'registrar'] },
    waiting: { from: ['in_progress'], roles: ['doctor', 'admin'] }, // qaytarish
  }[status];
  if (!allowed || !allowed.roles.includes(role)) return bad(res, "Bu amal uchun ruxsat yo'q", 403);
  if (!allowed.from.includes(v.status)) return bad(res, "Holatni bunday o'zgartirib bo'lmaydi", 409);
  if (status === 'in_progress') {
    if (db().visits.some((x) => x.doctorId === v.doctorId && x.date === today() && x.status === 'in_progress')) {
      return bad(res, 'Avval joriy qabulni yakunlang', 409);
    }
    v.calledAt = new Date().toISOString();
  }
  if (status === 'done') v.finishedAt = new Date().toISOString();
  if (status === 'waiting') v.calledAt = null;
  v.status = status;
  store.save();
  res.json(enrichVisit(v, positionInfo()));
});

// Ommaviy ekran (TV) uchun — avtorizatsiyasiz, shaxsiy ma'lumotsiz
app.get('/api/queue/public', (req, res) => {
  const t = today();
  const out = db().doctors.map((d) => {
    const todays = db().visits.filter((v) => v.doctorId === d.id && v.date === t);
    const current = todays.find((v) => v.status === 'in_progress');
    const waiting = todays.filter((v) => v.status === 'waiting').sort(sortWaiting);
    const lastDone = todays.filter((v) => v.status === 'done').sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))[0];
    return {
      id: d.id, name: d.name, specialty: d.specialty, room: d.room, prefix: d.prefix,
      current: current ? { ticket: current.ticket, calledAt: current.calledAt } : null,
      lastDone: lastDone ? lastDone.ticket : null,
      waiting: waiting.slice(0, 5).map((v) => ({ ticket: v.ticket, urgent: v.priority === 'urgent' })),
      waitingCount: waiting.length,
    };
  });
  res.json({ time: new Date().toISOString(), doctors: out });
});

/* ───────────── Tibbiy yozuvlar ───────────── */
function cleanRecord(b) {
  const v = b.vitals || {};
  return {
    complaints: str(b.complaints), diagnosis: str(b.diagnosis), notes: str(b.notes),
    vitals: {
      bp: str(v.bp), pulse: v.pulse === '' || v.pulse == null ? '' : Number(v.pulse),
      temp: v.temp === '' || v.temp == null ? '' : Number(v.temp),
      spo2: v.spo2 === '' || v.spo2 == null ? '' : Number(v.spo2),
      weight: v.weight === '' || v.weight == null ? '' : Number(v.weight),
      height: v.height === '' || v.height == null ? '' : Number(v.height),
    },
    prescriptions: (Array.isArray(b.prescriptions) ? b.prescriptions : [])
      .map((p) => ({ name: str(p.name), dose: str(p.dose), duration: str(p.duration) })).filter((p) => p.name),
  };
}

app.post('/api/records', auth(['doctor']), (req, res) => {
  const b = req.body || {};
  const patient = db().patients.find((p) => p.id === Number(b.patientId));
  if (!patient) return bad(res, 'Bemor topilmadi', 404);
  const visitDoctor = b.visitId ? db().visits.find((x) => x.id === Number(b.visitId))?.doctorId : null;
  const doctorId = req.user.role === 'doctor' ? req.user.doctorId : visitDoctor || Number(b.doctorId) || db().doctors[0]?.id;
  const rec = cleanRecord(b);
  if (!rec.diagnosis && !rec.complaints) return bad(res, 'Kamida shikoyat yoki tashxisni kiriting');
  const r = { id: store.nextId('record'), patientId: patient.id, visitId: b.visitId ? Number(b.visitId) : null, doctorId, date: today(), ...rec, createdAt: new Date().toISOString() };
  db().records.push(r);
  if (r.visitId && b.finishVisit) {
    const v = db().visits.find((x) => x.id === r.visitId);
    if (v && v.status === 'in_progress') { v.status = 'done'; v.finishedAt = new Date().toISOString(); }
  }
  store.save();
  res.status(201).json(r);
});

app.put('/api/records/:id', auth(['doctor']), (req, res) => {
  const r = db().records.find((x) => x.id === Number(req.params.id));
  if (!r) return bad(res, 'Yozuv topilmadi', 404);
  if (req.user.role === 'doctor' && r.doctorId !== req.user.doctorId) return bad(res, "Faqat o'z yozuvingizni tahrirlay olasiz", 403);
  Object.assign(r, cleanRecord(req.body || {}), { updatedAt: new Date().toISOString() });
  store.save();
  res.json(r);
});

app.delete('/api/records/:id', auth(['doctor']), (req, res) => {
  const i = db().records.findIndex((x) => x.id === Number(req.params.id));
  if (i < 0) return bad(res, 'Yozuv topilmadi', 404);
  if (req.user.role === 'doctor' && db().records[i].doctorId !== req.user.doctorId) return bad(res, "Faqat o'z yozuvingizni o'chira olasiz", 403);
  db().records.splice(i, 1);
  store.save();
  res.json({ ok: true });
});

/* ───────────── Umumiy statistika ───────────── */
app.get('/api/stats', auth(['registrar', 'doctor']), (req, res) => {
  const t = today();
  const todays = db().visits.filter((v) => v.date === t);
  const done = db().visits.filter((v) => v.status === 'done' && v.calledAt && v.finishedAt);
  const avgAll = done.length ? Math.round(done.map((v) => (new Date(v.finishedAt) - new Date(v.calledAt)) / 60000).filter((x) => x > 0 && x < 120).reduce((a, b) => a + b, 0) / done.length) : 0;
  res.json({
    today: counts(todays),
    patientsTotal: db().patients.length,
    newPatientsToday: db().patients.filter((p) => p.createdAt.slice(0, 10) === t).length,
    avgMinutes: avgAll,
    last7: last7(),
    byDoctor: db().doctors.map(doctorStats),
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api', (req, res) => bad(res, 'Yo\'nalish topilmadi', 404));
app.use((err, req, res, next) => { console.error(err); bad(res, 'Server xatosi', 500); });

process.on('SIGINT', () => { store.saveNow(); process.exit(0); });
process.on('SIGTERM', () => { store.saveNow(); process.exit(0); });

app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`\n🏥  Shifoxona API ishga tushdi: http://localhost:${PORT}`);
  console.log('    Demo: admin/admin123 · reg/reg123 · dr.karimov/doctor123\n');
});
