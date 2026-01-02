# JWT Environment Varijable - Setup Guide

## 📋 Pregled

Aplikacija koristi JWT (JSON Web Tokens) za autentikaciju. Potrebne su 2 environment varijable:

- `JWT_SECRET` - za access tokene (15 min trajanje)
- `JWT_REFRESH_SECRET` - za refresh tokene (7 dana trajanje)

---

## 🛠️ Lokalni Development

### 1. Kopiraj `.env.example` u `.env.local`

```bash
cp .env.example .env.local
```

### 2. Generiraj sigurne secretove

```bash
# Generiraj JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generiraj JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Dodaj u `.env.local`

```env
JWT_SECRET=your-generated-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here
```

### 4. Restartuj Next.js server

```bash
npm run dev
```

---

## 🚀 Produkcija - Vercel

### Opcija 1: Vercel Dashboard

1. Idi na [Vercel Dashboard](https://vercel.com/dashboard)
2. Odaberi projekt
3. **Settings** → **Environment Variables**
4. Dodaj varijable:

   | Name | Value |
   |------|-------|
   | `JWT_SECRET` | `[generiraj novi secret]` |
   | `JWT_REFRESH_SECRET` | `[generiraj novi secret]` |

5. **Save**
6. **Redeploy** aplikaciju

### Opcija 2: Vercel CLI

```bash
# Instaliraj Vercel CLI
npm i -g vercel

# Login
vercel login

# Dodaj varijable
vercel env add JWT_SECRET production
vercel env add JWT_REFRESH_SECRET production

# Redeploy
vercel --prod
```

---

## 🌐 Produkcija - Netlify

1. Idi na [Netlify Dashboard](https://app.netlify.com)
2. Odaberi site
3. **Site settings** → **Environment variables**
4. Dodaj varijable:

   | Key | Value |
   |-----|-------|
   | `JWT_SECRET` | `[generiraj novi secret]` |
   | `JWT_REFRESH_SECRET` | `[generiraj novi secret]` |

5. **Save**
6. **Trigger deploy** → **Clear cache and deploy site**

---

## 🐳 Produkcija - Docker

### Dockerfile

```dockerfile
ENV JWT_SECRET=your-secret
ENV JWT_REFRESH_SECRET=your-refresh-secret
```

### docker-compose.yml

```yaml
services:
  app:
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
```

### .env (u root direktoriju)

```env
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

---

## 🔒 Sigurnosne Preporuke

### ✅ DO:

- ✅ Koristi **različite** secretove za development i produkciju
- ✅ Generiraj **duge, slučajne** secretove (min 32 karaktera, preporučeno 64+)
- ✅ Koristi **crypto.randomBytes(64)** za generiranje
- ✅ Čuvaj secretove **sigurno** (ne commitaj u git)
- ✅ Rotiraj secretove **redovito** (svakih 6-12 mjeseci)

### ❌ NE:

- ❌ **NE** koristi iste secretove u development i produkciji
- ❌ **NE** commitaj `.env.local` u git
- ❌ **NE** koristi kratke ili predvidive secretove
- ❌ **NE** dijelj secretove javno

---

## 🧪 Testiranje

### Provjeri da li varijable rade:

```bash
# U Node.js konzoli
node -e "console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Postavljen' : '❌ Nedostaje')"
```

### Test login endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"password"}'
```

Ako dobiješ JWT tokene u response-u, varijable rade! ✅

---

## 🔄 Rotacija Secretova

Ako trebaš promijeniti secretove:

1. **Generiraj nove** secretove
2. **Postavi nove** u environment varijable
3. **Redeploy** aplikaciju
4. **Svi postojeći tokeni** će postati nevažeći
5. **Korisnici** će morati ponovno prijaviti

---

## ❓ Troubleshooting

### Problem: "Token je istekao" odmah nakon prijave

**Rješenje:** Provjeri da li su `JWT_SECRET` i `JWT_REFRESH_SECRET` postavljeni i da su **različiti**.

### Problem: "Nevažeći token" error

**Rješenje:** 
- Provjeri da li koristiš **isti** secret za sign i verify
- Provjeri da li je secret **dovoljno dugačak** (min 32 karaktera)

### Problem: Varijable se ne učitavaju

**Rješenje:**
- Provjeri da li je fajl `.env.local` (ne `.env`)
- **Restartuj** Next.js server nakon dodavanja varijabli
- Provjeri da li su varijable u **root** direktoriju projekta

---

## 📚 Dodatni Resursi

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

