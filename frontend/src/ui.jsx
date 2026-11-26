import { useEffect } from 'react';
import { X } from 'lucide-react';

/* ── Formatlash ── */
const p2 = (n) => String(n).padStart(2, '0');
export const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
};
export const fmtTime = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
export const fmtDateTime = (s) => (s ? `${fmtDate(s)} ${fmtTime(s)}` : '—');
export const ageOf = (birth) => {
  if (!birth) return '';
  const b = new Date(birth + 'T00:00:00');
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
};
export const initials = (name = '') =>
  name.replace(/^Dr\.\s*/, '').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
export const shortName = (name = '') => name.split(/\s+/).slice(0, 2).join(' ');

export const STATUS = {
  waiting: { label: 'Kutmoqda', cls: 'warn' },
  in_progress: { label: 'Qabulda', cls: 'info' },
  done: { label: 'Yakunlandi', cls: 'ok' },
  cancelled: { label: 'Bekor qilindi', cls: 'muted' },
};
export const ROLE = { admin: 'Administrator', registrar: 'Registratura', doctor: 'Shifokor' };

/* ── Kichik komponentlar ── */
export function Badge({ tone = 'muted', children, dot }) {
  return <span className={'badge ' + tone}>{dot && <i className="dot" />}{children}</span>;
}
export const StatusBadge = ({ status }) => <Badge tone={STATUS[status]?.cls} dot>{STATUS[status]?.label}</Badge>;

export function Avatar({ name, size = 40, tone }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: tone || `linear-gradient(135deg, hsl(${hue} 70% 48%), hsl(${(hue + 50) % 360} 75% 55%))` }}>
      {initials(name)}
    </div>
  );
}

export function Spinner() { return <div className="spinner" aria-label="Yuklanmoqda" />; }
export function PageLoader() { return <div className="center-pad"><Spinner /></div>; }

export function Empty({ icon: Icon, title, text, children }) {
  return (
    <div className="empty">
      {Icon && <div className="empty-ico"><Icon size={26} /></div>}
      <b>{title}</b>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      <div className="page-actions">{children}</div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'primary' }) {
  return (
    <div className={'card stat tone-' + tone}>
      <div className="stat-ico"><Icon size={22} /></div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <b className="stat-value">{value}</b>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide, footer, className = '' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal ' + (wide ? 'wide ' : '') + className} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, className = '' }) {
  return (
    <label className={'field ' + className}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/* ── Ustunli diagramma (CSS) ── */
export function BarChart({ data, height = 170, unit = 'ta' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div className="bar-col" key={d.date || i} title={`${d.date || d.label}: ${d.value} ${unit}`}>
          <span className="bar-val">{d.value}</span>
          <div className="bar-track">
            <div className={'bar-fill' + (i === data.length - 1 ? ' last' : '')} style={{ height: `${(d.value / max) * 100}%`, animationDelay: i * 60 + 'ms' }} />
          </div>
          <span className="bar-lbl">{d.label}<small>{d.day}</small></span>
        </div>
      ))}
    </div>
  );
}

/* ── Chiziqli diagramma (SVG) — vitallar dinamikasi uchun ── */
export function LineChart({ points, color = 'var(--primary)', unit = '', height = 110 }) {
  const W = 320, H = height, P = 14;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => (points.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (points.length - 1));
  const y = (v) => H - P - ((v - min) / span) * (H - 2 * P - 8);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const id = 'g' + Math.abs([...color].reduce((a, c) => a + c.charCodeAt(0) * 7, 3)) + points.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="linechart" role="img">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.length > 1 && <path d={area} fill={`url(#${id})`} />}
      {points.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="4.5" fill="var(--card)" stroke={color} strokeWidth="2.5"><title>{`${p.label}: ${p.value}${unit}`}</title></circle>
          {(i === points.length - 1 || i === 0) && (
            <text x={x(i)} y={y(p.value) - 9} textAnchor={i === 0 && points.length > 1 ? 'start' : 'end'} className="lc-text">{p.value}{unit}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
