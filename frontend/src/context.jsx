import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, getToken, setToken } from './api';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const AuthCtx = createContext(null);
const ThemeCtx = createContext(null);
const ToastCtx = createContext(null);

export const useAuth = () => useContext(AuthCtx);
export const useTheme = () => useContext(ThemeCtx);
export const useToast = () => useContext(ToastCtx);

/* ── Ma'lumot yuklash + avtomatik yangilash ── */
export function useFetch(fn, deps = [], interval = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const load = useCallback(async () => {
    try {
      setData(await fnRef.current());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
    if (!interval) return;
    const t = setInterval(() => { if (!document.hidden) load(); }, interval);
    return () => clearInterval(t);
  }, [load, interval]);
  return { data, loading, error, reload: load, setData };
}

export function Providers({ children }) {
  /* Mavzu */
  const [theme, setThemeState] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  const setTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch { /* ignore */ }
    setThemeState(t);
  };
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  /* Auth */
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api.get('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  const login = async (username, password) => {
    const r = await api.post('/auth/login', { username, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };
  const logout = () => { setToken(null); setUser(null); };

  /* Toast */
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const toast = useRef({}).current;
  toast.success = (m) => push(m, 'success');
  toast.error = (m) => push(m, 'error');
  toast.info = (m) => push(m, 'info');

  return (
    <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>
      <AuthCtx.Provider value={{ user, ready, login, logout }}>
        <ToastCtx.Provider value={toast}>
          {children}
          <div className="toasts" role="status" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className={'toast ' + t.type}>
                {t.type === 'success' ? <CheckCircle2 size={18} /> : t.type === 'error' ? <XCircle size={18} /> : <Info size={18} />}
                <span>{t.message}</span>
              </div>
            ))}
          </div>
        </ToastCtx.Provider>
      </AuthCtx.Provider>
    </ThemeCtx.Provider>
  );
}
