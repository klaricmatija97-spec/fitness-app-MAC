# ✅ Provjera Deploymenta - CORPEX Aplikacija

## 🔍 Što provjeriti:

### 1. Otvori Vercel Dashboard
1. Idi na: https://vercel.com
2. Prijavi se sa svojim računom
3. Trebao bi vidjeti svoj projekt (npr. "fitness-app" ili slično ime)

### 2. Provjeri Status Deploymenta
- ✅ **Ready/Success** = Deployment uspješan!
- ⚠️ **Building** = Još se builda, sačekaj
- ❌ **Error/Failed** = Ima grešku, provjeri build log

### 3. Pronađi svoj JAVNI LINK
Na stranici projekta traži:
- **"Visit"** ili **"Open"** dugme
- Ili link tipa: `https://fitness-app-xxxxx.vercel.app`

---

## 📋 Što je deployano:

### ✅ Glavne stranice:
- `/` - Početna stranica (Intake forma)
- `/payment` - Stranica za plaćanje
- `/login` - Login stranica
- `/app` - Glavna aplikacija (Dashboard)
- `/app/calculator` - Kalkulator kalorija
- `/app/macros` - Makrosi
- `/app/meals` - Plan prehrane
- `/app/training` - Trening plan
- `/app/chat` - AI Chat

### ✅ Funkcionalnosti:
- ✅ Preview mod (bez backend-a)
- ✅ Navigacija "Natrag" kroz cijeli app
- ✅ Multi-slide intake forma
- ✅ Payment → Login → Password setup flow
- ✅ Kalkulatori i alati

---

## 🧪 Testiranje aplikacije:

### Test 1: Osnovni pristup
1. Otvori link u browseru (npr. `https://tvoj-app.vercel.app`)
2. Trebao bi vidjeti početnu stranicu s "CORPEX" naslovom

### Test 2: Preview Mod (bez login-a)
Dodaj `?preview=true` na kraj linka:
```
https://tvoj-app.vercel.app?preview=true
```
Ili direktno u aplikaciju:
```
https://tvoj-app.vercel.app/app?preview=true
```

### Test 3: Kompletni flow
1. Otvori početnu stranicu
2. Klikni "📋 Preskoči onboarding → Pregled cijelog flowa"
3. Trebao bi ići: Payment → Login → App

### Test 4: Navigacija "Natrag"
1. Idi kroz aplikaciju
2. Koristi "Natrag" dugme
3. Trebao bi se vraćati korak po korak

---

## ⚠️ Ako ima problema:

### Problem: "Build Failed"
**Rješenje:**
1. Klikni na deployment u Vercel dashboardu
2. Klikni "View Build Log"
3. Kopiraj grešku i javi mi

### Problem: "Application Error"
**Rješenje:**
1. Provjeri da li si dodao Environment Variables na Vercelu:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Dodaj ih u Vercel Dashboard → Settings → Environment Variables

### Problem: "Page not found"
**Rješenje:**
- Provjeri da li su svi fajlovi uploadani
- Provjeri da li je `next.config.ts` u root folderu

---

## 🔗 Linkovi za podjelu:

Nakon što dobiješ link, možeš ga podijeliti:
- **Glavni link:** `https://tvoj-app.vercel.app`
- **S preview modom:** `https://tvoj-app.vercel.app?preview=true`
- **Direktno u app:** `https://tvoj-app.vercel.app/app?preview=true`

---

## 📝 Dodatne informacije:

Ako si deployao preko **web interfejsa**:
- Environment Variables mogu biti postavljene nakon deploya
- Ako trebaš ažurirati, možeš re-upload folder

Ako si deployao preko **GitHub**:
- Svaki push automatski redeploya
- Environment Variables se čuvaju u Vercel Settings

---

## ✅ Sve je spremno?

Ako sve radi:
1. ✅ Kopiraj svoj Vercel link
2. ✅ Testiraj osnovne funkcionalnosti
3. ✅ Podijeli link s drugima

**Ako nešto ne radi - pošalji mi:**
- Link na aplikaciju
- Screenshot greške (ako ima)
- Opis problema

