# MedCare — Shifoxona axborot tizimi

Frontend: **React + Vite** · Backend: **Node.js + Express** · Autentifikatsiya: **JWT** · Baza: JSON fayl (`backend/data.json`, o'rnatish talab qilmaydi)

## Ishga tushirish

Ikkita terminal oching (Node.js 18+ kerak).

```bash
# 1-terminal — backend (http://localhost:4000)
cd backend
npm install
npm start

# 2-terminal — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Brauzerda **http://localhost:5173** ni oching. Birinchi ishga tushishda baza demo ma'lumotlar bilan avtomatik to'ldiriladi.
Bazani tozalash: `cd backend && npm run reset`.

## Demo hisoblar

| Rol | Login | Parol |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Registratura | `reg` | `reg123` |
| Shifokor | `dr.karimov` | `doctor123` |
| Shifokor | `dr.tosheva`, `dr.rahimov`, `dr.yusupova` | `doctor123` |

## Imkoniyatlar

**1. Bemorlarni ro'yxatga olish va avtomatik navbat**
- Mavjud bemorni qidirish yoki yangi tibbiy karta ochish (dublikatdan himoya)
- Shifokorni tanlash — har bir shifokor kartasida navbat uzunligi va taxminiy kutish vaqti
- Navbat raqami avtomatik (`T-001`, `K-004`…), shoshilinch bemorlar navbatda oldinga chiqadi
- Talon chop etish, kanban ko'rinishidagi navbat paneli
- **TV ekran** (`/tv`) — kutish zali uchun ommaviy navbat tablosi (login talab qilinmaydi)

**2. Shifokorlar dashbordi**
- Joriy bemor kartasi, «Keyingi bemorni chaqirish», qabulni yakunlash
- Kunlik statistika, 7 kunlik grafik, so'nggi yozuvlar
- Administrator uchun: umumiy statistika, shifokorlar yuklamasi, shifokor qo'shish

**3. Bemorning tibbiy kartasi**
- Tibbiy yozuvlar (shikoyat, tashxis, vital ko'rsatkichlar, retsept, tavsiyalar)
- Ko'rsatkichlar dinamikasi grafiklari (puls, harorat, vazn, SpO₂), dorilar tarixi, tashriflar
- Allergiya ogohlantirishi, karta chop etish
- Maxfiylik: tibbiy yozuvlarni faqat shifokor va administrator ko'radi

**Dizayn:** kun/tun rejimi (tanlov saqlanadi), mobil moslashuvchan, jonli yangilanish.

## Loyiha tuzilishi

```
backend/   server.js (API) · db.js (saqlash + demo ma'lumot)
frontend/  src/pages · src/components · src/ui.jsx · src/index.css
```

## Production uchun eslatmalar
- `JWT_SECRET` muhit o'zgaruvchisini o'rnating (hozirgi qiymat faqat ishlab chiqish uchun).
- Real loyihada JSON-bazani PostgreSQL/MongoDB ga almashtiring — faqat `db.js` o'zgaradi.
- HTTPS ortida joylashtiring; demo parollarni o'zgartiring.

## Deploy
- Backend (AWS EC2): `DEPLOY_EC2.txt` — qadamma-qadam yo'riqnoma (nginx + pm2).
- Frontend (Netlify): `frontend/netlify.toml` — `EC2_PUBLIC_IP` ni almashtiring, so'ng deploy qiling.
