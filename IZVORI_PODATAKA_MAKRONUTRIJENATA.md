# 📊 Izvori Podataka za Makronutrijente

## Pregled

Generator prehrane koristi **više izvora podataka** za makronutrijente namirnica i jela. Evo detaljnog pregleda:

---

## 🥗 1. USDA CSV Podaci (PRIMARNI IZVOR)

### Lokacija
- **Fajlovi:** `data/usda/food.csv`, `data/usda/nutrient.csv`, `data/usda/food_nutrient.csv`
- **Loader:** `lib/data/csvLoader.ts`

### Kako se koristi
- **Primarni izvor** za namirnice u generatoru prehrane
- Učitava se kroz `getAllFoodsWithMacros()` funkciju
- Koristi se za brzo pretraživanje namirnica sa makronutrijentima

### Što sadrži
- **FDC ID** - USDA Food Data Central ID
- **Opis namirnice** (description)
- **Kalorije** (Energy - KCAL)
- **Proteini** (Protein - G)
- **Ugljikohidrati** (Carbohydrate - G)
- **Masti** (Total lipid/fat - G)
- **Vlakna** (Fiber - G)

### Prednosti
- ✅ **Besplatno** - USDA je javna baza podataka
- ✅ **Velika baza** - Tisuće namirnica
- ✅ **Točni podaci** - Znanstveno verificirani
- ✅ **Brzo učitavanje** - Cache-irani podaci

### Kada se koristi
```typescript
// U proMealPlanGenerator.ts
foodsWithMacros = await getAllFoodsWithMacros(1000);
```

---

## 🗄️ 2. Supabase Foods Tablica (FALLBACK)

### Lokacija
- **Tablica:** `foods` u Supabase bazi
- **Query funkcija:** `lib/db/queries.ts` → `getFoods()`

### Kako se koristi
- **Fallback** ako CSV podaci nisu dostupni
- Koristi se kada CSV loader ne radi ili nema podataka

### Što sadrži
- Ista struktura kao CSV podaci
- Može sadržavati custom namirnice koje nisu u USDA bazi

### Kada se koristi
```typescript
// Fallback u proMealPlanGenerator.ts
const { data } = await supabase.from("foods").select("*");
```

---

## 🍽️ 3. Edamam API (OPCIONALNO - ZA OBOGUĆIVANJE)

### Lokacija
- **Servisi:** 
  - `lib/services/edamamService.ts` - Nutrition Analysis API
  - `lib/services/edamamRecipeService.ts` - Recipe Search API
- **Enricher:** `lib/services/mealEnricher.ts`

### Kako se koristi
- **NIJE direktno korišten u generatoru prehrane**
- Koristi se za **obogaćivanje jela** s detaljnim nutritivnim podacima
- Koristi se za **pretraživanje recepata** (opcionalno)

### Što sadrži
- Detaljni makronutrijenti
- Mikronutrijenti (vitamini, minerali)
- Health labels i diet labels

### ⚠️ VAŽNO - Trenutno stanje
**Edamam API se NE koristi aktivno** jer:
- ❌ Nema Edamam credentials u `env.local`
- ❌ Generator koristi CSV/Supabase podatke
- ✅ Cache podaci (`meal_nutrition_cache.json`) su već obogaćeni Edamam podacima

### Kada bi se koristio
```typescript
// Samo ako su postavljeni env varijable:
EDAMAM_APP_ID=...
EDAMAM_APP_KEY=...
EDAMAM_RECIPE_APP_ID=...
EDAMAM_RECIPE_APP_KEY=...
```

---

## 📦 4. Cache Podaci (ZA JELA)

### Lokacija
- **Fajlovi:**
  - `lib/data/meal_nutrition_cache.json` - Cache Edamam podataka za jela
  - `lib/data/enriched_meals_nutrition.json` - Obogaćena jela
- **Loader:** `lib/data/nutritionLookup.ts`

### Kako se koristi
- Koristi se za **jela iz meal_components.json**
- Već obogaćen s Edamam podacima (ranije generirani)
- Brz pristup bez API poziva

### Što sadrži
- Makronutrijenti za svako jelo
- Mikronutrijenti (vitamini, minerali)
- Izvor: `"source": "edamam"` (ali već cache-iran)

---

## 🔄 Prioritet Izvora

### Za Namirnice (Foods):
1. **USDA CSV** (primarni) → `getAllFoodsWithMacros()`
2. **Supabase foods tablica** (fallback) → `getFoods()`

### Za Jela (Meals):
1. **meal_nutrition_cache.json** (primarni) → `getNutritionById()`
2. **meal_components.json** (fallback) → izračun iz komponenti

---

## 💰 Troškovi

### Besplatno:
- ✅ **USDA CSV podaci** - Javna baza, besplatno
- ✅ **Supabase foods** - Tvoja baza podataka
- ✅ **Cache podaci** - Već generirani, besplatno

### Plaćeno (ako se koristi):
- ⚠️ **Edamam API** - Plaćeni servis
  - Nutrition Analysis: ~$0.01-0.05 po zahtjevu
  - Recipe Search: ~$0.01-0.03 po zahtjevu
  - **TRENUTNO SE NE KORISTI** jer nema credentials

---

## 🔍 Provjera Trenutnog Stanja

### Provjeri env.local:
```bash
# Ako vidiš ove varijable, Edamam se koristi:
EDAMAM_APP_ID=...
EDAMAM_APP_KEY=...
EDAMAM_RECIPE_APP_ID=...
EDAMAM_RECIPE_APP_KEY=...
```

### Provjeri kod:
```typescript
// U proMealPlanGenerator.ts linija ~1077
foodsWithMacros = await getAllFoodsWithMacros(1000);
// ↑ Ovo koristi USDA CSV podatke (besplatno)
```

---

## ✅ Zaključak

**Generator prehrane trenutno koristi BESPLATNE izvore:**
1. ✅ **USDA CSV podaci** - primarni izvor za namirnice
2. ✅ **Supabase foods** - fallback za namirnice
3. ✅ **Cache podaci** - za jela (već obogaćeni)

**Edamam API se NE koristi** jer:
- Nema credentials u env.local
- Generator koristi besplatne izvore
- Cache podaci su već obogaćeni

**Ako želiš koristiti Edamam API:**
1. Kreiraj account na https://developer.edamam.com
2. Dodaj credentials u `env.local`
3. API će se automatski koristiti za obogaćivanje novih jela

---

## 📝 Napomene

- USDA podaci su **javni i besplatni** - možeš ih koristiti bez ograničenja
- Edamam API je **plaćeni servis** - koristi se samo ako je potreban
- Cache podaci su **već generirani** - ne troše API pozive
- Generator je **optimiziran** da koristi besplatne izvore prvo

