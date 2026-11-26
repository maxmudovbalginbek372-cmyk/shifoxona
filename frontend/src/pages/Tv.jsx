import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { api } from '../api';

const p2 = (n) => String(n).padStart(2, '0');
const DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

// Ommaviy ekran: kutish zaliga televizor orqali ko'rsatiladi (login talab qilinmaydi)
export default function Tv() {
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    let alive = true;
    const load = () => api.get('/queue/public').then((r) => { if (alive) { setData(r); setOffline(false); } }).catch(() => alive && setOffline(true));
    load();
    const t1 = setInterval(load, 4000);
    const t2 = setInterval(() => setNow(new Date()), 1000);
    return () => { alive = false; clearInterval(t1); clearInterval(t2); };
  }, []);

  return (
    <div className="tv">
      <div className="tv-top">
        <div className="brand">
          <div className="brand-logo"><Activity size={26} /></div>
          <div><b>MedCare</b><small>Elektron navbat</small></div>
        </div>
        <div className="tv-clock">
          <b>{p2(now.getHours())}:{p2(now.getMinutes())}:{p2(now.getSeconds())}</b>
          <small>{DAYS[now.getDay()]}, {p2(now.getDate())}.{p2(now.getMonth() + 1)}.{now.getFullYear()}</small>
        </div>
      </div>

      {!data ? (
        <p style={{ textAlign: 'center', marginTop: 80, color: '#8aa0c4', fontSize: '1.3rem' }}>{offline ? 'Serverga ulanib bo\'lmadi…' : 'Yuklanmoqda…'}</p>
      ) : (
        <div className="tv-grid">
          {data.doctors.map((d) => (
            <section className="tv-card" key={d.id}>
              <div className="who"><b>{d.name}</b><span>{d.specialty}</span></div>
              <div className="tv-room"><small>Xona</small>{d.room}</div>
              <div className="tv-now">
                <div>
                  <small>{d.current ? 'Hozir qabulda' : 'Navbat kutilmoqda'}</small>
                  <div style={{ color: '#8aa0c4', fontSize: '.9rem', marginTop: 4 }}>Kutmoqda: <b style={{ color: '#fff' }}>{d.waitingCount}</b></div>
                </div>
                {/* key o'zgarganda animatsiya qayta ishga tushadi */}
                <div key={d.current?.ticket || 'idle'} className={'tv-no ' + (d.current ? 'active' : 'idle')}>{d.current ? d.current.ticket : '—'}</div>
              </div>
              <div className="tv-next">
                <span>Keyingilar:</span>
                {d.waiting.length === 0 ? <span>—</span> : d.waiting.map((w) => <span key={w.ticket} className={'tk' + (w.urgent ? ' urgent' : '')}>{w.ticket}</span>)}
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="tv-foot">Raqamingiz chaqirilganda tegishli xonaga kiring · Iltimos, tartibni saqlang</div>
    </div>
  );
}
