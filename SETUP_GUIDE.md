# CORPEX - Vodič za Postavljanje

## Korak 1: Provjeri da li aplikacija radi

1. Otvori PowerShell u `fitness-app` folderu
2. Pokreni:
   ```bash
   npm run dev
   ```
3. Otvori browser: http://localhost:3000
4. Trebao bi se vidjeti onboarding (prvi dio aplikacije)

**Ako ne radi:**
- Provjeri da li je Node.js instaliran: `node -v`
- Provjeri da li su instalirane dependencies: `npm install`

---

## Korak 2: Postavi Supabase Database

### 2.1. Otvori Supabase Dashboard
1. Idi na https://supabase.com
2. Prijavi se i otvori svoj projekt

### 2.2. Pokreni SQL skripte
1. U Supabase dashboardu, klikni na **SQL Editor** (lijevo u meniju)
2. Klikni **New Query**

### 2.3. Pokreni prvi SQL (osnovni schema)
1. Otvori fajl `supabase-schema.sql` u editoru
2. Kopiraj SAV sadržaj
3. Zalijepi u Supabase SQL Editor
4. Klikni **Run** ili pritisni `Ctrl+Enter`
5. Trebao bi vidjeti poruku "Success"

### 2.4. Pokreni drugi SQL (Phase 2 schema)
1. Otvori fajl `supabase-schema-phase2.sql` u editoru
2. Kopiraj SAV sadržaj
3. Zalijepi u Supabase SQL Editor (u novi query)
4. Klikni **Run**
5. Trebao bi vidjeti poruku "Success"

**Ako vidiš greške:**
- Provjeri da li si pokrenuo prvi SQL prije drugog
- Provjeri da li su tabele već kreirane (možeš ih preskočiti)

---

## Korak 3: Provjeri Environment Variables

1. Otvori `env.local` fajl u `fitness-app` folderu
2. Provjeri da li su postavljeni:
   - `SUPABASE_URL` - tvoj Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - tvoj Service Role Key

**Gdje naći:**
- U Supabase dashboardu → Settings → API
- Project URL je pod "Project URL"
- Service Role Key je pod "service_role" (skrij ga!)

---

## Korak 4: Testiraj Prvi Dio (Onboarding)

1. Otvori http://localhost:3000
2. Prođi kroz sve slide-ove:
   - Upoznaj trenera
   - Odaberi oslovljavanje
   - Odaberi dob
   - Unesi težinu i visinu
   - Odaberi aktivnosti
   - Odaberi ciljeve
   - Odaberi prehranu
   - Unesi kontakt podatke
3. Klikni "Pošalji i pređi na Fazu 02"

**Očekivano:**
- Trebao bi se preusmjeriti na `/payment` stranicu
- Ako vidiš grešku, provjeri console u browseru (F12)

---

## Korak 5: Testiraj Payment i Login

### 5.1. Payment stranica
1. Na `/payment` stranici, odaberi način plaćanja
2. Klikni "Potvrdi plaćanje"
3. Trebao bi se preusmjeriti na `/login` s temp passwordom

**Napomena:** Za sada je simulirano plaćanje. Kasnije ćeš dodati stvarni payment provider.

### 5.2. Login stranica
1. Ako vidiš formu za promjenu lozinke, unesi novu lozinku
2. Ako vidiš login formu, unesi:
   - Username (generiran automatski)
   - Password (temp password ili nova lozinka)
3. Klikni "Prijavi se"

**Očekivano:**
- Trebao bi se preusmjeriti na `/app` (glavna aplikacija)

---

## Korak 6: Testiraj Drugi Dio (App)

### 6.1. Dashboard
1. Na `/app` stranici trebao bi vidjeti kartice:
   - Kalkulator Kalorija
   - Makrosi
   - Plan Prehrane
   - Trening
   - AI Chat

### 6.2. Kalkulator Kalorija
1. Klikni na "Kalkulator Kalorija"
2. Trebao bi vidjeti:
   - BMR (Bazalni metabolizam)
   - TDEE (Ukupna potrošnja)
   - Cilj Kalorije
3. Klikni "Spremi Izračune"

### 6.3. Makrosi
1. Vrati se na dashboard
2. Klikni na "Makrosi"
3. Trebao bi vidjeti:
   - Proteini (grami)
   - Ugljikohidrati (grami)
   - Masti (grami)

### 6.4. Plan Prehrane
1. Vrati se na dashboard
2. Klikni na "Plan Prehrane"
3. Trebao bi vidjeti tjedni meni (7 dana)
4. Klikni "Spremi Plan Prehrane"

### 6.5. Trening
1. Vrati se na dashboard
2. Klikni na "Trening"
3. Klikni "Generiraj Plan Treninga"
4. Trebao bi vidjeti vježbe s setovima, ponavljanjima, odmorom
5. Prođi kroz vježbe i klikni "✓ Završi Vježbu"
6. Na kraju klikni "✓ Završi Trening"
7. Trebao bi vidjeti preporuke za istezanje i saunu

### 6.6. AI Chat
1. Vrati se na dashboard
2. Klikni na "AI Chat"
3. Unesi poruku (npr. "Koliko proteina trebam?")
4. Trebao bi dobiti odgovor

**Napomena:** Za sada su placeholder odgovori. Kasnije ćeš integrirati OpenAI.

---

## Korak 7: Provjeri Database

1. U Supabase dashboardu, klikni na **Table Editor**
2. Provjeri da li se podaci spremaju u tabele:
   - `clients` - podaci iz onboardinga
   - `user_accounts` - login podaci
   - `client_calculations` - izračuni kalorija i makroa
   - `meal_plans` - planovi prehrane
   - `training_plans` - planovi treninga
   - `workout_sessions` - završeni treningi
   - `chat_messages` - chat poruke

---

## Što Dalje?

### Prioritet 1: AI Chat Integracija
- Trebaš OpenAI API key
- Ažuriraj `/app/api/chat/route.ts`

### Prioritet 2: Payment Integracija
- Dodaj Stripe ili drugi payment provider
- Ažuriraj `/app/payment/page.tsx`

### Prioritet 3: Poboljšanja
- Proširi generator menija
- Proširi generator treninga
- Dodaj praćenje napretka

---

## Troubleshooting

### Greška: "Cannot find module"
- Pokreni: `npm install`

### Greška: "Supabase connection failed"
- Provjeri `env.local` fajl
- Provjeri da li su SQL skripte pokrenute

### Greška: "Table does not exist"
- Pokreni SQL skripte u Supabase

### Greška: "Unauthorized"
- Provjeri da li si prijavljen
- Provjeri localStorage (F12 → Application → Local Storage)

---

## Kontakt

Ako imaš problema, provjeri:
1. Browser console (F12)
2. Terminal gdje radi `npm run dev`
3. Supabase logs (Dashboard → Logs)

