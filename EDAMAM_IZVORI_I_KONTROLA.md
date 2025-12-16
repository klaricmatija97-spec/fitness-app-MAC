# Edamam API - Izvori Podataka i Kontrola Troškova

## 📊 Je li Edamam API jedini izvor?

**NE** - Edamam API **NIJE** jedini izvor podataka za generator. Evo kako funkcionira:

### 1. **Glavni izvor: USDA baza podataka** ✅
- **Lokacija**: `lib/data/foods-database.ts` i CSV loader
- **Koristi se za**: Izračun makronutrijenata za sve namirnice
- **Izvor**: USDA FoodData Central baza
- **Trošak**: Besplatno ✅

**Kako se koristi:**
```typescript
// U buildCompositeMealForSlot:
const ratio = actualGrams / 100;
calories += (food.calories_per_100g || 0) * ratio;
protein += (food.protein_per_100g || 0) * ratio;
carbs += (food.carbs_per_100g || 0) * ratio;
fat += (food.fat_per_100g || 0) * ratio;
```

### 2. **Edamam API - Validacija i korekcija** ⚠️
- **Koristi se za**: Validaciju i korekciju jela nakon kreiranja
- **Kada se poziva**: Samo za validaciju jela (ako je razlika > 3%)
- **Trošak**: $0.001 po pozivu (nakon free tier-a)

**Kako se koristi:**
```typescript
// U validateAndCorrectMealWithEdamam:
const edamamData = await analyzeNutritionFromText(ingredientText, meal.name);
// Ako je razlika > 3%, koristi Edamam podatke i prilagodi gramaže
```

### 3. **Supabase tablice** ✅
- **Koristi se za**: Spremanje i dohvaćanje podataka korisnika
- **Trošak**: Besplatno (do limita) ✅

---

## 💰 Kontrola Troškova Edamam API-ja

### Trenutna kontrola:

1. **Rate Limiting** ✅
   - **Lokacija**: `lib/utils/edamamRateLimiter.ts`
   - **Limit**: 45 poziva/min (10% buffer od 50/min)
   - **Funkcija**: Sprječava prekoračenje rate limita

2. **Cost Controller** ✅ (NOVO!)
   - **Lokacija**: `lib/utils/edamamCostController.ts`
   - **Limit**: 20€/mjesec maksimalno
   - **Free tier**: 10,000 poziva/mjesec besplatno
   - **Cijena**: $0.001 po pozivu (nakon free tier-a)
   - **Maksimalno poziva**: ~30,000/mjesec (10,000 free + 20,000 paid)

### Kako funkcionira Cost Controller:

```typescript
// Provjeri da li možemo napraviti poziv
const costCheck = edamamCostController.canMakeRequest();
if (!costCheck.allowed) {
  // Blokiraj poziv ako je prekoračen limit
  return null;
}

// Nakon uspješnog poziva
edamamCostController.recordRequest();
```

### Status tracking:

```typescript
const status = edamamCostController.getStatus();
// {
//   totalRequests: 5000,
//   freeRequestsUsed: 5000,
//   paidRequestsUsed: 0,
//   currentCost: 0,
//   maxMonthlyCost: 20,
//   remainingRequests: 25000,
//   remainingCost: 20
// }
```

---

## 📈 Koliko poziva se radi?

### Po tjednom planu (7 dana):
- **Broj jela**: ~35 jela (5 obroka × 7 dana)
- **Edamam poziva**: ~35 poziva (jedan po jelu za validaciju)
- **Trošak**: ~$0.035 (ako su svi nakon free tier-a)

### Mjesečno (pretpostavka: 100 planova):
- **Ukupno poziva**: ~3,500 poziva
- **Trošak**: 
  - Prvih 10,000: **Besplatno** ✅
  - Preostalih: **$0** (još u free tier-u)
  - **Ukupno: $0** ✅

### Ako prekoračiš free tier:
- **10,001 - 30,000 poziva**: $0.001 po pozivu
- **Maksimalno 20,000 dodatnih poziva** = **$20** ✅

---

## 🛡️ Zaštita od prekoračenja

### Automatska kontrola:

1. **Provjera prije svakog poziva**:
   ```typescript
   if (!costCheck.allowed) {
     // Blokiraj poziv
     return null;
   }
   ```

2. **Mjesečni reset**:
   - Automatski resetira brojač svakog 1. u mjesecu
   - Praćenje se resetira na 0

3. **Logiranje**:
   - Svakih 100 poziva logira status
   - Upozorenja kada se približava limitu

### Ručna kontrola:

```typescript
// Provjeri status
const status = edamamCostController.getStatus();
console.log(`Trošak: ${status.currentCost}€/${status.maxMonthlyCost}€`);

// Resetiraj (za testiranje)
edamamCostController.reset();
```

---

## 📋 Sažetak

### Izvori podataka:
1. ✅ **USDA baza** - glavni izvor (besplatno)
2. ⚠️ **Edamam API** - validacija i korekcija ($0.001/poziv)
3. ✅ **Supabase** - spremanje podataka (besplatno)

### Kontrola troškova:
1. ✅ **Rate Limiting**: 45 poziva/min
2. ✅ **Cost Controller**: Max 20€/mjesec
3. ✅ **Free Tier**: 10,000 poziva/mjesec besplatno
4. ✅ **Automatska blokada**: Blokira pozive ako je limit prekoračen

### Preporuka:
- **Edamam se koristi samo za validaciju** (ne za glavni izvor)
- **USDA baza je glavni izvor** (besplatno)
- **Troškovi su kontrolirani** (max 20€/mjesec)
- **Free tier pokriva većinu slučajeva** (10,000 poziva/mjesec)

---

## 🔧 Kako promijeniti limit?

U `lib/utils/edamamCostController.ts`:

```typescript
private readonly MAX_MONTHLY_COST = 20; // Promijeni na željeni limit
```

---

## 📊 Praćenje troškova

Status se automatski logira svakih 100 poziva:
```
📊 Edamam status: 5000 poziva, 0.00€/20€
```

Za detaljnije praćenje, pozovi:
```typescript
const status = edamamCostController.getStatus();
console.log(status);
```

