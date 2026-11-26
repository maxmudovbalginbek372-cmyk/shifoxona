import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, CalendarClock, ClipboardList, Eye, EyeOff, LogIn, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useAuth, useTheme } from '../context';

const DEMO = [
  { label: 'Administrator', u: 'admin', p: 'admin123' },
  { label: 'Registratura', u: 'reg', p: 'reg123' },
  { label: 'Shifokor', u: 'dr.karimov', p: 'doctor123' },
];

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(username, password);
      nav(loc.state?.from || '/', { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-hero">
        <div className="brand">
          <div className="brand-logo" style={{ background: 'rgba(255,255,255,.2)' }}><Activity size={24} /></div>
          <div><b style={{ color: '#fff' }}>MedCare</b><small style={{ color: 'rgba(255,255,255,.8)' }}>Shifoxona axborot tizimi</small></div>
        </div>
        <div>
          <h2>Bemor e'tibori — bizning ustuvor vazifamiz.</h2>
          <p>Ro'yxatga olish, avtomatik navbat va elektron tibbiy karta — barchasi bitta qulay platformada.</p>
          <div className="feat">
            <div><CalendarClock size={22} /> Avtomatik navbat va kutish vaqti hisobi</div>
            <div><ClipboardList size={22} /> Elektron tibbiy karta va retseptlar</div>
            <div><ShieldCheck size={22} /> Rollar bo'yicha xavfsiz kirish</div>
          </div>
        </div>
        <small style={{ opacity: .75 }}>© {new Date().getFullYear()} MedCare</small>
      </section>

      <section className="login-form-wrap">
        <button className="icon-btn theme-pos" onClick={toggle} aria-label="Mavzu">{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
        <form className="login-card col" style={{ gap: 18 }} onSubmit={submit}>
          <div>
            <h1>Xush kelibsiz 👋</h1>
            <p className="muted">Tizimga kirish uchun hisobingiz ma'lumotlarini kiriting.</p>
          </div>
          {err && <div className="error-box">{err}</div>}
          <label className="field"><span>Login</span>
            <input className="input" value={username} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username" required />
          </label>
          <label className="field"><span>Parol</span>
            <div className="pw">
              <input className="input" type={show ? 'text' : 'password'} value={password} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(!show)} aria-label="Parolni ko'rsatish">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </label>
          <button className="btn primary lg block" disabled={busy}><LogIn size={19} /> {busy ? 'Kirilmoqda…' : 'Kirish'}</button>
          <div>
            <small className="muted">Demo hisoblar (bosing):</small>
            <div className="demo">
              {DEMO.map((d) => (
                <button type="button" key={d.u} onClick={() => { setU(d.u); setP(d.p); }}>
                  {d.label}<small>{d.u}</small>
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
