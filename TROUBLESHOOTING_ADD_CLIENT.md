# Troubleshooting: Greška pri dodavanju klijenta

## Problem
Greška: "Nije moguće dodati novog klijenta, pokušajte ponovno"

## Mogući uzroci i rješenja

### 1. trainer_id stupac ne postoji u bazi

**Simptom:** Greška u konzoli: "column trainer_id does not exist"

**Rješenje:**
1. Otvori Supabase SQL Editor
2. Kopiraj i pokreni SQL migraciju iz `supabase-add-trainer-id.sql`:

```sql
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS trainer_id UUID;

CREATE INDEX IF NOT EXISTS idx_clients_trainer_id ON clients(trainer_id);
```

### 2. Email već postoji

**Simptom:** Greška: "Klijent s ovom email adresom već postoji"

**Rješenje:** Koristi drugi email ili provjeri postojeće klijente

### 3. Validacija polja

**Simptom:** Greška s detaljima validacije

**Rješenje:** Provjeri da su sva obavezna polja (ime, email) ispravno unesena

### 4. Network error

**Simptom:** "Network request failed" ili timeout

**Rješenje:**
- Provjeri da je Next.js server pokrenut
- Provjeri da je API_BASE_URL ispravan u `mobile/src/services/api.ts`
- Provjeri WiFi konekciju

### 5. Provjeri console logove

Otvori developer console (React Native debugger) i provjeri:
- Error poruke iz API endpointa
- Network request detalje
- Response status code

## Kako provjeriti da trainer_id postoji

U Supabase SQL Editoru pokreni:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name = 'trainer_id';
```

Ako ne vraća rezultat, stupac ne postoji i treba pokrenuti migraciju.

