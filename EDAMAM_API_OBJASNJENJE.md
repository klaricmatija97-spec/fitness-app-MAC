# 🔑 Edamam API - Objašnjenje i Upute

## Što su "Credentials"?

**Credentials** = **API ključevi** (kao lozinka za pristup API-ju)

To su posebni kodovi koje dobivaš kada se registriraš na Edamam servis. Koriste se za autentifikaciju (dokaz da si ti i da imaš pravo koristiti API).

### Primjer credentials:
```
EDAMAM_APP_ID=abc123def456
EDAMAM_APP_KEY=xyz789uvw012
```

---

## Zašto se Trenutno NE Koristi Edamam API?

### 1. **Nemaš Credentials u env.local**

Trenutno u `env.local` **NEMA** ovih varijabli:
```bash
EDAMAM_APP_ID=...
EDAMAM_APP_KEY=...
EDAMAM_RECIPE_APP_ID=...
EDAMAM_RECIPE_APP_KEY=...
```

### 2. **Kod Provjerava Credentials**

U `lib/services/edamamService.ts` (linija 147):
```typescript
if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
  console.error("❌ Edamam API credentials nisu konfigurirani!");
  return null; // ← Vraća null, ne koristi API
}
```

**Ako nema credentials → API se ne koristi → vraća `null`**

### 3. **Generator Koristi Besplatne Izvore**

Glavni generator (`proMealPlanGenerator.ts`) koristi:
- ✅ **USDA CSV podatke** (besplatno)
- ✅ **Supabase foods** (tvoja baza)
- ❌ **NE koristi Edamam** direktno

---

## Gdje se Edamam API Koristi? (Ako Ima Credentials)

### 1. **Obogaćivanje Jela** (`lib/services/mealEnricher.ts`)
- Koristi se za dobivanje **detaljnih nutritivnih podataka** za jela
- Analizira sastojke i vraća makronutrijente + mikronutrijente

### 2. **Pretraživanje Recepata** (`lib/services/edamamRecipeService.ts`)
- Pretražuje **2.3M+ recepata** s fotografijama
- Koristi se za generiranje planova s receptima

### 3. **Script za Obogaćivanje** (`scripts/enrich_new_meals.ts`)
- Script koji obogaćuje nova jela s Edamam podacima
- Generira `meal_nutrition_cache.json`

---

## Kako Dobiti Edamam Credentials?

### Korak 1: Registriraj se na Edamam
1. Otvori: https://developer.edamam.com
2. Klikni **"Sign Up"** ili **"Login"**
3. Kreiraj besplatni account

### Korak 2: Kreiraj Application
1. Idi na **Dashboard**
2. Klikni **"Create Application"**
3. Odaberi:
   - **Nutrition Analysis API** (za nutritivne podatke)
   - **Recipe Search API** (za pretraživanje recepata)

### Korak 3: Kopiraj Credentials
Nakon kreiranja aplikacije, dobit ćeš:
- **Application ID** (APP_ID)
- **Application Key** (APP_KEY)

**Primjer:**
```
Application ID: abc123def456ghi789
Application Key: xyz789uvw012rst345
```

### Korak 4: Dodaj u env.local
```bash
# Edamam Nutrition Analysis API
EDAMAM_APP_ID=abc123def456ghi789
EDAMAM_APP_KEY=xyz789uvw012rst345

# Edamam Recipe Search API (opcionalno)
EDAMAM_RECIPE_APP_ID=recipe123def456
EDAMAM_RECIPE_APP_KEY=recipe789uvw012
```

---

## Prednosti Edamam API

### ✅ Što Dobivaš:
1. **Točniji podaci** - Analizira stvarne sastojke
2. **Mikronutrijenti** - Vitamini, minerali, vlakna
3. **Health labels** - "gluten-free", "high-protein", itd.
4. **2.3M+ recepata** - Ogromna baza recepata s fotografijama
5. **Automatska analiza** - Parsira sastojke iz teksta

### ⚠️ Nedostaci:
1. **Plaćeno** - Besplatni plan ima ograničenja
2. **Rate limiting** - Ograničen broj poziva po danu
3. **Sporije** - API pozivi su sporiji od lokalnih podataka

---

## Besplatni Plan vs Plaćeni Plan

### Besplatni Plan:
- **5,000 poziva/mjesec** (Nutrition API)
- **10,000 poziva/mjesec** (Recipe API)
- Dovoljno za testiranje i malu aplikaciju

### Plaćeni Plan:
- **$0.01-0.05 po pozivu** (ovisno o volumenu)
- Neograničeni pozivi
- Prioritetna podrška

---

## Trebaš li Edamam API?

### ❌ NE trebaš ako:
- ✅ Već imaš dovoljno podataka u USDA CSV
- ✅ Cache podaci (`meal_nutrition_cache.json`) su dovoljni
- ✅ Ne generiraš nova jela često
- ✅ Ne trebaju ti recepti s fotografijama

### ✅ Trebaš ako:
- ⚠️ Želiš **detaljne mikronutrijente** (vitamini, minerali)
- ⚠️ Želiš **pretraživati recepte** s fotografijama
- ⚠️ Želiš **automatski obogaćivati nova jela**
- ⚠️ Trebaš **health labels** (gluten-free, vegan, itd.)

---

## Kako Aktivirati Edamam API?

### 1. Dobij Credentials (gore upute)

### 2. Dodaj u env.local
```bash
EDAMAM_APP_ID=tvoj_app_id
EDAMAM_APP_KEY=tvoj_app_key
```

### 3. Restartaj Aplikaciju
```bash
npm run dev
```

### 4. Testiraj
```bash
# Test Nutrition API
curl http://localhost:3000/api/nutrition/test

# Test Recipe API
curl http://localhost:3000/api/recipes/test
```

---

## Trenutno Stanje u Tvojoj Aplikaciji

### ✅ Što Radi (bez Edamam):
- Generator prehrane koristi **USDA CSV podatke**
- Jela imaju **cache podatke** (već obogaćeni)
- Sve funkcionira **besplatno**

### ❌ Što NE Radi (bez Edamam):
- ❌ Ne možeš obogaćivati **nova jela** automatski
- ❌ Ne možeš pretraživati **recepte s fotografijama**
- ❌ Ne dobivaš **mikronutrijente** za nova jela

---

## Preporuka

**Za sada NE trebaš Edamam API** jer:
1. ✅ Generator već radi s USDA podacima
2. ✅ Cache podaci su dovoljni
3. ✅ Besplatno funkcionira

**Koristi Edamam API samo ako:**
- Trebaš pretraživati recepte
- Želiš automatski obogaćivati nova jela
- Trebaš detaljne mikronutrijente

---

## Kako Provjeriti Da Li Se Koristi?

### Provjeri env.local:
```bash
cat env.local | grep EDAMAM
```

### Provjeri u kodu:
```typescript
// U lib/services/edamamService.ts
console.log("EDAMAM_APP_ID:", process.env.EDAMAM_APP_ID);
console.log("EDAMAM_APP_KEY:", process.env.EDAMAM_APP_KEY);
```

Ako su `undefined` → API se ne koristi.

---

## Sažetak

**Credentials** = API ključevi za pristup Edamam servisu

**Zašto se ne koristi?**
- Nema credentials u env.local
- Generator koristi besplatne izvore (USDA CSV)
- Nije potreban za osnovnu funkcionalnost

**Kako aktivirati?**
1. Registriraj se na https://developer.edamam.com
2. Kreiraj aplikaciju i dobij credentials
3. Dodaj u env.local
4. Restartaj aplikaciju

**Trebam li ga?**
- **NE** - ako ti je dovoljno što imaš
- **DA** - ako trebaš recepte ili detaljne mikronutrijente

