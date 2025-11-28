# Objašnjenje URL-a aplikacije

## Glavni URL: `http://localhost:3000/app`

**`/app`** = Glavna aplikacija (CORPEX Fitness App)
- Login/Registracija
- Intro slide s FAQ rotacijom
- Kalkulatori (BMR, TDEE, Target Calories, Makrosi)
- Planovi prehrane i treninga
- AI Chat

## Preview Mode: `http://localhost:3000/app?preview=true`

**`?preview=true`** = Preview parametar koji omogućuje:
- Pristup bez stvarnog login-a
- Pregled aplikacije bez autentifikacije
- Testiranje svih funkcija bez plaćanja

## Preusmjerenje

**`http://localhost:3000/`** → Automatski preusmjerava na `/app`

Također, `http://localhost:3000` direktno otvara glavnu aplikaciju.

## Struktura:

```
/ (root)         → Preusmjerenje na /app
/app             → Glavna aplikacija (login + svi slideovi)
/app?preview=true → Glavna aplikacija u preview modu
/login           → Stara login stranica (može se koristiti i dalje)
/payment         → Payment stranica
```

## Za produkciju:

Kada deployaš aplikaciju na Vercel/Netlify:
- `https://tvoj-domen.vercel.app/app` → Glavna aplikacija
- `https://tvoj-domen.vercel.app/app?preview=true` → Preview mode










