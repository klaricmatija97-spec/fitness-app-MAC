# Troubleshooting: Nema prikaza klijenata

Ako vidite "Nema klijenata" u TrainerHomeScreen-u, slijedite ove korake za dijagnostiku:

---

## 🔍 KORAK 1: Provjerite Console Logove

### React Native Debugger (Mobile App)
1. Otvorite React Native debugger (obično `d` u terminalu, pa "Debug remote JS")
2. Potražite logove koji počinju s `[TrainerHomeScreen]`:
   - `[TrainerHomeScreen] Fetching clients from: ...`
   - `[TrainerHomeScreen] Response status: ...`
   - `[TrainerHomeScreen] Response data: ...`
   - `[TrainerHomeScreen] Clients fetched: ...`

### Next.js Server Terminal
1. Provjerite terminal gdje je pokrenut Next.js server (`npm run dev`)
2. Potražite logove koji počinju s `[trainer/clients]`:
   - `[trainer/clients] GET - Trainer ID: ...`
   - `[trainer/clients] GET - Clients found: ...`

---

## 🔍 KORAK 2: Provjerite da li su klijenti dodani

### Provjera u Supabase Dashboard:
1. Idite na Supabase Dashboard → Table Editor → `clients`
2. Provjerite da li postoje klijenti u tablici
3. **VAŽNO:** Provjerite da li klijenti imaju `trainer_id` postavljen na: `6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7`

### SQL Query za provjeru:
```sql
SELECT id, name, email, trainer_id 
FROM clients 
WHERE trainer_id = '6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7';
```

Ako nema klijenata s `trainer_id`, to je problem!

---

## 🔍 KORAK 3: Provjerite da li je `trainer_id` stupac kreiran

### SQL Query:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name = 'trainer_id';
```

Ako query ne vraća rezultate, `trainer_id` stupac ne postoji!

### Rješenje:
Pokrenite SQL migraciju `supabase-add-trainer-id.sql`:
1. Otvorite datoteku `supabase-add-trainer-id.sql`
2. Kopirajte cijeli sadržaj
3. Idite na Supabase Dashboard → SQL Editor
4. Zalijepite i kliknite "RUN"

---

## 🔍 KORAK 4: Provjerite Auth Token

### U React Native Debuggeru:
Potražite log: `[TrainerHomeScreen] Loading data with token: ...`

Token bi trebao biti base64-encoded string koji se dekodira u format: `trainerId:timestamp`

### Provjera u App.tsx:
Provjerite da li je `TRAINER_TOKEN` ispravno generiran:
```typescript
const TRAINER_ID = "6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7";
const TRAINER_TOKEN = generateTrainerToken();
```

---

## 🔍 KORAK 5: Testirajte API Endpoint Direktno

### Korištenje curl ili Postman:
```bash
curl -X GET "http://YOUR_IP:3000/api/trainer/clients" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Zamijenite:
- `YOUR_IP` - IP adresa vašeg Next.js servera (npr. `192.168.1.11`)
- `YOUR_TOKEN` - Base64-encoded token (možete generirati u `App.tsx`)

### Očekivani odgovor:
```json
{
  "success": true,
  "data": {
    "clients": [...],
    "stats": {
      "totalClients": 0,
      "activePrograms": 0,
      "draftPrograms": 0,
      "needsAttention": 0
    }
  }
}
```

---

## 🔍 KORAK 6: Najčešći problemi i rješenja

### Problem 1: Nema klijenata u bazi
**Rješenje:** Dodajte klijente preko "+ Novi" gumba u TrainerHomeScreen

### Problem 2: Klijenti nemaju `trainer_id`
**Rješenje:** 
- Ako su klijenti dodani prije nego što je `trainer_id` stupac kreiran, ažurirajte ih:
  ```sql
  UPDATE clients 
  SET trainer_id = '6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7'
  WHERE trainer_id IS NULL;
  ```

### Problem 3: `trainer_id` stupac ne postoji
**Rješenje:** Pokrenite SQL migraciju `supabase-add-trainer-id.sql`

### Problem 4: API endpoint vraća 401 Unauthorized
**Rješenje:** Provjerite da li je token ispravno proslijeđen u Authorization header-u

### Problem 5: API endpoint vraća prazan array `[]`
**Rješenje:** Provjerite da li klijenti imaju `trainer_id = '6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7'`

---

## ✅ CHECKLIST

- [ ] Provjerio console logove (React Native + Next.js)
- [ ] Provjerio da li postoje klijenti u `clients` tablici
- [ ] Provjerio da li klijenti imaju `trainer_id` postavljen
- [ ] Provjerio da li `trainer_id` stupac postoji u bazi
- [ ] Testirao API endpoint direktno (curl/Postman)
- [ ] Provjerio auth token format

---

## 🆘 Ako i dalje ne radi

Kopirajte **CIJELI** console output iz:
1. React Native Debugger (sve logove s `[TrainerHomeScreen]`)
2. Next.js Server Terminal (sve logove s `[trainer/clients]`)

I pošaljite mi ih za daljnju dijagnostiku.

