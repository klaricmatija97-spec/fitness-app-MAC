# Kako Generator Osigurava Usklađenost s Kalkulatorom

## 1. ČITANJE VRIJEDNOSTI IZ KALKULATORA

Generator **NIKAD ne računa** makroe - samo ih čita iz baze:

```typescript
// Funkcija: getUserCalculations()
// Čita iz: client_calculations tablica u Supabase
// Polja:
//   - target_calories (NUMERIC)
//   - protein_grams (NUMERIC)
//   - carbs_grams (NUMERIC)
//   - fats_grams (NUMERIC)
//   - goal_type ('lose' | 'maintain' | 'gain')
```

**Kalkulator sprema vrijednosti:**
- BMR (Mifflin-St Jeor)
- TDEE (BMR × Activity Multiplier)
- Target Calories: lose = TDEE - 500, maintain = TDEE, gain = TDEE + 500
- Makroi: protein (2.0-2.05 g/kg), fats (0.9 g/kg), ostatak = carbs

## 2. GENERIRANJE OBROKA

Generator generira obroke prema distribuciji kalorija:
- 3 obroka: breakfast 35%, lunch 40%, dinner 25%
- 4 obroka: breakfast 30%, lunch 35%, snack 10%, dinner 25%
- 5 obroka: varira prema goal-u

Svaki obrok se skalira prema target kalorijama za taj slot.

## 3. ITERATIVNO SKALIRANJE DO CILJA

Nakon što se generiraju svi obroci, `scaleAllMealsToTarget()` funkcija:

1. **Izračunava trenutne totale** (zbroj svih obroka)
2. **Provjerava odstupanja** od target vrijednosti:
   ```typescript
   calDev = |currentCalories - targetCalories| / targetCalories
   proteinDev = |currentProtein - targetProtein| / targetProtein
   carbsDev = |currentCarbs - targetCarbs| / targetCarbs
   fatDev = |currentFat - targetFat| / targetFat
   maxDev = max(calDev, proteinDev, carbsDev, fatDev)
   ```

3. **Ako je unutar ±5%** → završi (uspešno!)

4. **Ako je izvan ±5%** → skaliraj:
   - Izračunaj faktore za svaki makro
   - Kombiniraj faktore (kalorije 50%, protein 30%, carbs 10%, fat 10%)
   - Primijeni ograničenja za goal:
     - **lose**: kalorije ≤ target (nikad više!)
     - **gain**: kalorije ≥ target (nikad manje!)
   - Ograniči skaliranje (0.85x - 1.15x) za realistične porcije
   - Skaliraj sve obroke proporcionalno

5. **Ponovi** do 50 puta dok ne postigne ±5%

## 4. PROVJERA KALORIJSKIH GRANICA PO OBROKU

Nakon skaliranja, provjerava se da li svaki obrok zadovoljava granice:
- breakfast: 250-650 kcal
- snack: 80-300 kcal
- lunch: 450-850 kcal
- dinner: 400-750 kcal

Ako je izvan granica, prilagođava se samo taj obrok.

## 5. FINALNA PROVJERA

Nakon svih iteracija, provjerava se:
- Da li su kalorije unutar ±5% (max ±10%)
- Da li su makroi unutar ±5% (max ±10%)
- Da li su kalorije u skladu s goal-om:
  - lose: kalorije ≤ target
  - gain: kalorije ≥ target

## PROBLEMI I RJEŠENJA

### Problem 1: Kalorije nisu točne
**Uzrok:** Skaliranje je ograničeno na 0.85x-1.15x, što možda nije dovoljno.

**Rješenje:** 
- Povećati broj iteracija
- Koristiti agresivnije skaliranje ako je početno odstupanje >10%
- Prilagoditi faktore skaliranja (više težine na kalorije)

### Problem 2: Makroi nisu u skladu
**Uzrok:** Kombinirani faktor možda ne balansira sve makroe jednako.

**Rješenje:**
- Povećati težinu proteina u kombiniranom faktoru
- Dodati zasebnu iteraciju za fine-tuning makroa
- Koristiti prioritet: kalorije > protein > carbs > fat

### Problem 3: Jela se ponavljaju
**Uzrok:** Tracking nije dovoljno strogi.

**Rješenje:**
- Tracking po slotu kroz tjedan (ne samo po danu)
- Reset tracking-a ako nema dostupnih jela
- Koristiti Set za brzu provjeru duplikata

## POBOLJŠANJA

1. **Dodati detaljno logiranje** - vidjeti točno gdje se gubi preciznost
2. **Povećati broj iteracija** - ako 50 nije dovoljno
3. **Agresivnije skaliranje** - za velika odstupanja
4. **Fine-tuning faza** - nakon glavnog skaliranja, fino prilagoditi makroe
5. **Fallback mehanizam** - ako ne postigne ±5%, koristi najbolji pokušaj






























































