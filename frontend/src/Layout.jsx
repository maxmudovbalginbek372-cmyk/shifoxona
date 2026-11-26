import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, ClipboardList, LayoutDashboard, ListOrdered, LogOut, Menu, Moon, Stethoscope, Sun, Tv, UserPlus, Users } from 'lucide-react';
import { useAuth, useFetch, useTheme } from './context';
import { api } from './api';
import { Avatar, ROLE } from './ui';

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000 * 15); return () => clearInterval(t); }, []);
  const p = (n) => String(n).padStart(2, '0');
  const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  return (
    <div className="clock">
      <b>{p(now.getHours())}:{p(now.getMinutes())}</b>
      <small>{days[now.getDay()]}, {p(now.getDate())}.{p(now.getMonth() + 1)}.{now.getFullYear()}</small>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  // Kutayotgan bemorlar soni (yon paneldagi belgi uchun)
  const { data: queue } = useFetch(() => api.get('/queue'), [], 8000);
  const waiting = queue ? queue.filter((v) => v.status === 'waiting').length : 0;

  const role = user.role;
  const items = [
    { to: '/', icon: LayoutDashboard, label: role === 'doctor' ? 'Mening qabulim' : 'Boshqaruv paneli', end: true },
    (role === 'registrar' || role === 'admin') && { to: '/register', icon: UserPlus, label: "Ro'yxatga olish" },
    { to: '/queue', icon: ListOrdered, label: 'Navbat', pill: waiting || null },
    { to: '/patients', icon: role === 'doctor' || role === 'admin' ? ClipboardList : Users, label: role === 'registrar' ? 'Bemorlar' : 'Tibbiy kartalar' },
    role === 'admin' && { to: '/doctors', icon: Stethoscope, label: 'Shifokorlar' },
  ].filter(Boolean);

  return (
    <div className="app">
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="brand">
          <div className="brand-logo"><Activity size={24} /></div>
          <div><b>MedCare</b><small>Shifoxona axborot tizimi</small></div>
        </div>
        <div className="nav-label">Menyu</div>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <it.icon size={19} /> {it.label}
            {it.pill ? <span className="pill">{it.pill}</span> : null}
          </NavLink>
        ))}
        <div className="nav-label">Qo'shimcha</div>
        <a className="nav-link" href="/tv" target="_blank" rel="noreferrer"><Tv size={19} /> TV ekran (navbat)</a>

        <div className="sidebar-foot">
          <div className="user-box">
            <Avatar name={user.name} size={38} />
            <div style={{ minWidth: 0 }}>
              <b>{user.name}</b>
              <small>{ROLE[user.role]}{user.doctor ? ' · ' + user.doctor.specialty : ''}</small>
            </div>
          </div>
          <button className="btn ghost block" onClick={logout}><LogOut size={17} /> Chiqish</button>
        </div>
      </aside>
      <div className={'scrim' + (open ? ' show' : '')} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Menyu"><Menu size={20} /></button>
          <span className="live"><i /> Jonli yangilanish</span>
          <div className="grow" />
          <Clock />
          <button className="icon-btn" onClick={toggle} aria-label="Mavzuni almashtirish" title={theme === 'dark' ? 'Kun rejimi' : 'Tun rejimi'}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </header>
        <main className="content" key={loc.pathname}><Outlet /></main>
      </div>
    </div>
  );
}
