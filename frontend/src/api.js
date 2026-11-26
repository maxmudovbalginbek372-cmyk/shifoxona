const BASE = import.meta.env.VITE_API_URL || '/api';

export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'));

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Serverga ulanib bo'lmadi. Backend ishlayotganini tekshiring.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/queue/public')) {
      setToken(null);
      if (location.pathname !== '/login') location.href = '/login';
    }
    const err = new Error(data.error || 'Xatolik yuz berdi');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b || {} }),
  put: (p, b) => request(p, { method: 'PUT', body: b }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
  del: (p) => request(p, { method: 'DELETE' }),
};
