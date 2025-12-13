# 🔒 AI Agent - Limit Potrošnje

Ovaj dokument objašnjava kako postaviti i konfigurirati limite potrošnje za AI agenta u aplikaciji.

## 📋 Pregled

Sistem za limitiranje potrošnje omogućava:
- **Dnevni limit zahtjeva** - maksimalan broj AI zahtjeva po korisniku dnevno
- **Dnevni limit tokena** - maksimalan broj tokena koje korisnik može potrošiti dnevno
- **Automatsko praćenje** - svi zahtjevi se automatski prate u bazi podataka
- **Procijenjeni troškovi** - automatski izračun troškova na temelju modela i tokena

## 🚀 Postavljanje

### Korak 1: Kreiraj Supabase Tablicu

Pokreni SQL skriptu u Supabase SQL Editoru:
1. Otvori: https://app.supabase.com/project/_/sql
2. Kopiraj sadržaj iz `supabase-ai-usage-tracking.sql`
3. Pokreni skriptu

Ova skripta kreira:
- Tablicu `ai_usage` za praćenje potrošnje
- Funkcije `check_ai_usage_limit()` i `update_ai_usage()`
- Potrebne indexe i RLS policy-je

### Korak 2: Konfiguriraj Env Varijable

Dodaj sljedeće varijable u `env.local`:

```env
# AI Usage Limits
# Dnevni limit zahtjeva po korisniku (default: 50)
AI_DAILY_REQUEST_LIMIT=50

# Dnevni limit tokena po korisniku (default: 100000)
# 100000 tokena ≈ ~75,000 riječi ili ~300 stranica teksta
AI_DAILY_TOKEN_LIMIT=100000

# Model koji se koristi za izračun troškova (default: gpt-3.5-turbo)
AI_MODEL_NAME=gpt-3.5-turbo
```

### Korak 3: Restart Aplikacije

Nakon dodavanja env varijabli, restartaj aplikaciju:
```bash
npm run dev
```

## ⚙️ Konfiguracija Limita

### Preporučene Vrijednosti

**Za testiranje:**
```env
AI_DAILY_REQUEST_LIMIT=10
AI_DAILY_TOKEN_LIMIT=20000
```

**Za produkciju (osnovni plan):**
```env
AI_DAILY_REQUEST_LIMIT=50
AI_DAILY_TOKEN_LIMIT=100000
```

**Za produkciju (premium plan):**
```env
AI_DAILY_REQUEST_LIMIT=200
AI_DAILY_TOKEN_LIMIT=500000
```

### Kako Odabrati Limit?

**Dnevni limit zahtjeva:**
- Prosječan korisnik: 10-20 zahtjeva dnevno
- Aktivni korisnik: 30-50 zahtjeva dnevno
- Premium korisnik: 100-200 zahtjeva dnevno

**Dnevni limit tokena:**
- 1 zahtjev ≈ 500-2000 tokena (ovisno o duljini poruke i odgovora)
- 50 zahtjeva × 2000 tokena = 100,000 tokena
- **GPT-3.5-turbo:** ~$0.15 za 100,000 tokena
- **GPT-4:** ~$3-6 za 100,000 tokena

## 🔔 Obavijesti o Limitu

Sistem automatski obavještava korisnike kada:

1. **Blizu su limita (80%+)** - Prikazuje se žuto upozorenje
2. **Dosegnu limit (100%)** - Prikazuje se crveno upozorenje i blokira se slanje poruka

### Kako Funkcioniraju Obavijesti?

- **U Chat Headeru:** Prikazuje se trenutna potrošnja (npr. "45/50 zahtjeva")
- **Warning Banner:** Pojavljuje se kada je korisnik blizu limita ili ga dosegne
- **U Porukama:** Kada se limit dosegne, AI odgovor objašnjava situaciju
- **Input Polje:** Onemogućeno je kada je limit dosegnut

### Automatsko Osvježavanje

- Usage se automatski osvježava svakih 10 sekundi dok je chat otvoren
- Osvježava se nakon svakog uspješnog zahtjeva
- Prikazuje se u realnom vremenu

## 📊 Praćenje Potrošnje

### Kako Provjeriti Potrošnju?

Koristi Supabase SQL Editor:

```sql
-- Potrošnja za određenog korisnika danas
SELECT * FROM ai_usage 
WHERE client_id = 'uuid-korisnika' 
  AND date = CURRENT_DATE;

-- Ukupna potrošnja danas (svi korisnici)
SELECT 
  SUM(request_count) as total_requests,
  SUM(token_count) as total_tokens,
  SUM(estimated_cost) as total_cost
FROM ai_usage 
WHERE date = CURRENT_DATE;

-- Top 10 korisnika po potrošnji danas
SELECT 
  client_id,
  request_count,
  token_count,
  estimated_cost
FROM ai_usage 
WHERE date = CURRENT_DATE
ORDER BY token_count DESC
LIMIT 10;
```

### API Odgovori

**Uspješan zahtjev:**
```json
{
  "ok": true,
  "response": "AI odgovor...",
  "usage": {
    "remainingRequests": 49,
    "remainingTokens": 99500
  }
}
```

**Limit dosegnut:**
```json
{
  "ok": false,
  "message": "Dnevni limit zahtjeva (50) je dosegnut",
  "limitExceeded": true,
  "usage": {
    "currentRequests": 50,
    "currentTokens": 100000,
    "remainingRequests": 0,
    "remainingTokens": 0
  }
}
```

**Dohvat trenutne potrošnje (GET /api/chat/usage):**
```json
{
  "ok": true,
  "usage": {
    "requests": 45,
    "tokens": 90000,
    "cost": 0.135,
    "remainingRequests": 5,
    "remainingTokens": 10000,
    "requestPercentage": 90,
    "tokenPercentage": 90,
    "isNearLimit": true,
    "isAtLimit": false,
    "dailyRequestLimit": 50,
    "dailyTokenLimit": 100000
  }
}
```

## 🔧 Napredne Opcije

### Različiti Limit po Korisniku

Ako želiš različite limite za različite korisnike, možeš modificirati `checkUsageLimit()` funkciju u `lib/ai-usage-limits.ts`:

```typescript
// Primjer: Premium korisnici imaju veći limit
const isPremium = await checkIfPremium(clientId);
const dailyRequestLimit = isPremium 
  ? parseInt(process.env.AI_DAILY_REQUEST_LIMIT_PREMIUM || "200", 10)
  : parseInt(process.env.AI_DAILY_REQUEST_LIMIT || "50", 10);
```

### Mjesečni Limit

Za dodavanje mjesečnog limita, dodaj novu tablicu ili proširi postojeću:

```sql
-- Dodaj mjesečni limit tracking
ALTER TABLE ai_usage ADD COLUMN month INTEGER;
ALTER TABLE ai_usage ADD COLUMN year INTEGER;
```

### Reset Limita

Limiti se automatski resetiraju svaki dan (na temelju `date` kolone). Za ručni reset:

```sql
-- Resetiraj sve limite za određeni datum
DELETE FROM ai_usage WHERE date = '2024-01-15';
```

## 🐛 Troubleshooting

### Greška: "function check_ai_usage_limit does not exist"

**Rješenje:** Pokreni SQL skriptu `supabase-ai-usage-tracking.sql` u Supabase SQL Editoru.

### Limit se ne provjerava

**Provjeri:**
1. Da li je SQL skripta pokrenuta?
2. Da li su env varijable postavljene?
3. Da li je aplikacija restartana nakon dodavanja env varijabli?

### Limit je previše nizak/visok

**Rješenje:** Promijeni vrijednosti u `env.local` i restartaj aplikaciju.

## 💡 Najbolje Prakse

1. **Počni s nižim limitima** - možeš ih uvijek povećati
2. **Monitoriraj potrošnju** - provjeravaj Supabase tablicu redovito
3. **Postavi upozorenja** - koristi Supabase funkcije za slanje email upozorenja
4. **Testiraj u produkciji** - prati stvarnu potrošnju i prilagodi limite

## 📝 Napomene

- Limiti se resetiraju automatski svaki dan u ponoć (UTC)
- Troškovi su procijenjeni na temelju prosječnih cijena OpenAI modela
- Stvarni troškovi mogu varirati ovisno o stvarnoj upotrebi tokena
- Za točnije praćenje, koristi OpenAI API odgovor koji vraća stvarni broj tokena

