# 🚀 Sljedeći Koraci - CORPEX Aplikacija

## ✅ Što je Gotovo
- ✅ Database tabele su kreirane
- ✅ Osnovna struktura aplikacije
- ✅ Kalkulatori kalorija i makroa
- ✅ Generator menija i treninga
- ✅ AI Chat struktura (placeholder)

## 📋 Korak po Korak - Što Dalje

### Korak 1: Testiraj Aplikaciju

1. **Pokreni dev server:**
   ```bash
   cd fitness-app
   npm run dev
   ```

2. **Otvori browser:** http://localhost:3000

3. **Testiraj flow:**
   - Prođi kroz onboarding (prvi dio)
   - Klikni "Pošalji"
   - Trebao bi se preusmjeriti na `/payment`
   - Odaberi payment metodu
   - Preusmjeri se na `/login`
   - Promijeni lozinku
   - Prijavi se
   - Trebao bi se preusmjeriti na `/app`

4. **Testiraj drugi dio:**
   - Kalkulator Kalorija
   - Makrosi
   - Plan Prehrane
   - Trening
   - AI Chat

**Ako vidiš greške:**
- Provjeri browser console (F12)
- Provjeri terminal gdje radi `npm run dev`
- Provjeri da li su sve tabele kreirane u Supabase

---

### Korak 2: Integriraj AI Chat (OpenAI)

#### 2.1. Kreiraj OpenAI Account
1. Idi na https://platform.openai.com
2. Kreiraj account
3. Idi na API Keys: https://platform.openai.com/api-keys
4. Klikni "Create new secret key"
5. Kopiraj key (samo jednom ćeš ga vidjeti!)

#### 2.2. Dodaj API Key u Environment Variables
1. Otvori `env.local` fajl
2. Dodaj:
   ```
   OPENAI_API_KEY=sk-tvoj-api-key-ovdje
   ```

#### 2.3. Instaliraj OpenAI Package
U PowerShell (u `fitness-app` folderu):
```bash
npm install openai
```

#### 2.4. Ažuriraj Chat API
- Otvori `app/api/chat/route.ts`
- Zamijeni placeholder funkciju s OpenAI integracijom

**Napomena:** Kreirat ću ti ažurirani kod za AI chat.

---

### Korak 3: Integriraj Payment (Stripe)

#### 3.1. Kreiraj Stripe Account
1. Idi na https://stripe.com
2. Kreiraj account
3. Idi na Developers → API Keys
4. Kopiraj "Publishable key" i "Secret key"

#### 3.2. Dodaj Stripe Keys u Environment Variables
U `env.local`:
```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

#### 3.3. Instaliraj Stripe Package
```bash
npm install stripe @stripe/stripe-js
```

#### 3.4. Ažuriraj Payment Stranicu
- Zamijeni simulaciju s stvarnim Stripe checkout

**Napomena:** Kreirat ću ti ažurirani kod za payment.

---

### Korak 4: Poboljšanja (Opcionalno)

#### 4.1. Proširi Generator Menija
- Dodaj više hrane u `lib/foods.ts`
- Poboljšaj algoritam u `lib/foods.ts`

#### 4.2. Proširi Generator Treninga
- Dodaj više vježbi u `app/api/training/generate/route.ts`
- Personaliziraj prema ciljevima

#### 4.3. Dodaj Praćenje Napretka
- Grafikoni težine
- Grafikoni kalorija
- Grafikoni treninga

---

## 🎯 Prioriteti

1. **Testiraj aplikaciju** - provjeri da li sve radi
2. **AI Chat** - dodaj OpenAI integraciju
3. **Payment** - dodaj Stripe integraciju
4. **Poboljšanja** - proširi funkcionalnosti

---

## ❓ Troubleshooting

### Greška: "Cannot find module"
- Pokreni: `npm install`

### Greška: "Supabase connection failed"
- Provjeri `env.local` fajl
- Provjeri da li su SQL skripte pokrenute

### Greška: "Unauthorized"
- Provjeri da li si prijavljen
- Provjeri localStorage (F12 → Application)

---

## 📞 Sljedeći Korak

**Počnimo s testiranjem aplikacije!**

1. Pokreni `npm run dev`
2. Testiraj cijeli flow
3. Javi mi što radi, a što ne

Nakon toga ćemo integrirati AI Chat i Payment! 🚀

