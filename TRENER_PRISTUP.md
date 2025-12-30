# Kako trener pristupa pregledu klijenata

## 🎯 Brzi pristup

Trener može pristupiti pregledu svojih klijenata na **2 načina**:

### 1️⃣ Preko Login ekrana (Brži način)

**Koraci:**
1. Otvorite aplikaciju
2. Na `LoginScreen`-u kliknite gumb **"💪 Trener mod"** (pri dnu ekrana)
3. Automatski se otvara `TrainerHomeScreen` s listom svih klijenata

**Lokacija gumba:** Dno `LoginScreen`-a, prije login/register forme

---

### 2️⃣ Preko normalnog flow-a (Dugotrajniji način)

**Koraci:**
1. Otvorite aplikaciju
2. Prođite kroz onboarding
3. Prijavite se kao normalni korisnik
4. U aplikaciji možete pronaći opciju za pristup trenerskom modu (ako je implementirana)

---

## 📱 TrainerHomeScreen - Pregled klijenata

### Što se prikazuje:

1. **Lista klijenata:**
   - Ime i prezime
   - Email
   - Avatar (ako postoji)
   - Status programa (Draft / Aktivan / Arhiviran)
   - Adherence % (ako postoji program)
   - "Needs Attention" badge (ako je adherence < 70% ili nema sesije u 7 dana)

2. **Statistike:**
   - Ukupno klijenata
   - Aktivni programi
   - Draft programi
   - Klijenti koji trebaju pažnju

3. **Quick Actions:**
   - **"+ Novi"** gumb - dodaj novog klijenta
   - **"New Program"** gumb - generiraj novi program (TODO)

4. **Filteri:**
   - Svi klijenti
   - Aktivni programi
   - Trebaju pažnju

---

## 🔄 Navigacija iz TrainerHomeScreen-a

### Klik na klijenta:
- Otvara `TrainerClientDetailScreen` s detaljima klijenta
- Prikazuje program, adherence, flagged exercises, recent sessions
- Quick actions: Generiraj program, Godišnji plan, Regeneriraj tjedan

### Klik na "+ Novi":
- Otvara `AddClientScreen`
- Form za dodavanje novog klijenta

---

## 📍 Lokacija koda

- **Login Screen:** `mobile/src/screens/LoginScreen.tsx`
  - Gumb "💪 Trener mod" poziva `onTrainerMode()`
  
- **Trainer Home Screen:** `mobile/src/screens/TrainerHomeScreen.tsx`
  - Prikazuje listu klijenata
  - API call: `GET /api/trainer/clients`

- **App.tsx:** `mobile/App.tsx`
  - Handler: `handleShowTrainerMode()` - otvara `TrainerHomeScreen`

---

## 🔐 Autentifikacija

Trener koristi **hardcoded token** za MVP:
- Token: base64-encoded string `trainerId:timestamp`
- Trainer ID: `6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7`
- Generiran u `mobile/App.tsx` kao `TRAINER_TOKEN`

---

## ✅ Status

**IMPLEMENTIRANO** ✅

- LoginScreen ima gumb "💪 Trener mod"
- TrainerHomeScreen prikazuje listu klijenata
- API endpoint `/api/trainer/clients` vraća klijente filtrirane po `trainer_id`
- Navigacija između screenova radi

---

## 🐛 Ako ne vidite klijente

1. **Provjerite da li ste dodali klijente:**
   - Kliknite "+ Novi" u `TrainerHomeScreen`
   - Popunite formu i dodajte klijenta

2. **Provjerite da li je `trainer_id` postavljen u bazi:**
   - SQL migracija: `supabase-add-trainer-id.sql`
   - Provjerite da li klijenti imaju `trainer_id = '6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7'`

3. **Provjerite API endpoint:**
   - `GET /api/trainer/clients` treba vratiti listu klijenata
   - Provjerite console logove za greške

---

## 📝 Sljedeći koraci

1. ✅ Pregled klijenata - **GOTOVO**
2. ✅ Dodavanje klijenata - **GOTOVO**
3. ✅ Generiranje programa - **GOTOVO**
4. ✅ Godišnji plan - **GOTOVO**
5. ⏳ U budućnosti: Pravilna autentifikacija trenera (JWT, role-based access)

