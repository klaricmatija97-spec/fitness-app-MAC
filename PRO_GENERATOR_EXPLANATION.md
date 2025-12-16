# PRO Generator sa Scoring Sistemom - Objašnjenje

## 🎯 Što je PRO Generator?

**PRO Generator** je napredniji generator plana prehrane koji koristi **scoring sistem** za odabir najboljih jela. Umjesto nasumičnog odabira ili jednostavnog skaliranja, PRO generator **ocjenjuje** svako jelo i bira najbolje opcije.

## 📊 Razlika između Generatora

### 1. **Obični Generator** (`weeklyMealPlanGenerator.ts`)
- ✅ Koristi **kompozitne obroke** iz `meal_components.json` (155 jela)
- ✅ Nasumično odabire jelo iz liste
- ✅ Skalira jelo prema ciljnim kalorijama i makronutrijentima
- ✅ Iterativno skaliranje do ±20 kcal i ±2%
- ✅ Jednostavniji i brži

**Kako radi:**
```
1. Odaberi nasumično jelo iz liste
2. Skaliraj prema ciljnim kalorijama
3. Provjeri da li je unutar tolerancije
4. Ako nije, ponovi s drugim jelom
```

### 2. **PRO Generator** (`proMealPlanGenerator.ts`)
- ✅ Koristi **recepte iz Supabase baze** + namirnice
- ✅ **Scoring sistem** - ocjenjuje svako jelo (0-1)
- ✅ Odabire jelo s **najboljim score-om**
- ✅ Uzima u obzir: kalorije, makroe, zdravlje, različitost
- ✅ Kompleksniji i precizniji

**Kako radi:**
```
1. Generiraj 30 kandidata (recepti + namirnice)
2. Izračunaj score za svakog kandidata
3. Sortiraj po score-u (najbolji prvi)
4. Odaberi najbolji (top 1)
```

## 🎲 Scoring Sistem - Kako Funkcionira?

PRO generator ocjenjuje svako jelo sa **4 komponente**:

### 1. **Calorie Match** (30% težine)
- Koliko se kalorije kandidata poklapaju sa ciljnim kalorijama
- Koristi **Gausovu distribuciju** (zvonolika krivulja)
- Najbolji score (1.0) = točno na cilju
- Score opada što se više udaljava od cilja

**Formula:**
```javascript
calorieMatch = exp(-(razlika²) / (2 × tolerance²))
// tolerance = ±50 kcal
```

**Primjer:**
- Cilj: 500 kcal
- Kandidat 1: 500 kcal → score: 1.0 ✅
- Kandidat 2: 550 kcal → score: 0.78
- Kandidat 3: 600 kcal → score: 0.37

### 2. **Macro Match** (40% težine) - NAJVAŽNIJI!
- Prosječno poklapanje proteina/carbs/fat sa ciljnim vrijednostima
- Najveća težina (40%) jer su makronutrijenti ključni

**Formula:**
```javascript
macroDeviation = |actual - target| / target
macroPenalty = (calorieDev × 0.4) + (proteinDev × 0.4) + (carbsDev × 0.1) + (fatDev × 0.1)
macroMatch = max(0, 1 - macroPenalty)
```

**Primjer:**
- Cilj: P: 30g, C: 50g, F: 15g
- Kandidat 1: P: 30g, C: 50g, F: 15g → score: 1.0 ✅
- Kandidat 2: P: 28g, C: 52g, F: 14g → score: 0.95
- Kandidat 3: P: 25g, C: 55g, F: 12g → score: 0.85

### 3. **Health Bonus** (20% težine)
- Bonus baziran na `health_score` (0-100 → 0-1)
- Dodatni bonus za zdrave tagove:
  - `high_protein` → +0.05
  - `veggies` → +0.05
  - `whole_grain` → +0.03

**Primjer:**
- Jelo bez health_score → score: 0.5
- Jelo s health_score 80 → score: 0.8
- Jelo s health_score 80 + high_protein → score: 0.85 ✅

### 4. **Variety** (10% težine)
- Penalty za ponavljanje istog recepta ili proteina
- Penalty za isti recept: -0.15 (15%)
- Penalty za isti protein: -0.10 (10%)

**Primjer:**
- Novo jelo (nije korišteno) → score: 1.0 ✅
- Isti recept već korišten → score: 0.85
- Isti protein već korišten → score: 0.90

## 📈 Ukupni Score

**Formula:**
```javascript
totalScore = 
  calorieMatch × 0.3 +
  macroMatch × 0.4 +
  healthBonus × 0.2 +
  (1 - varietyPenalty) × 0.1
```

**Maksimalni score:** 1.0 (savršeno jelo)
**Minimalni score:** 0.0 (najgore jelo)

## 🔄 Primjer Odabira Jela

**Cilj za doručak:**
- Kalorije: 500 kcal
- Protein: 30g
- Carbs: 50g
- Fat: 15g

**Kandidati:**

| Jelo | Kalorije | Protein | Carbs | Fat | Calorie Match | Macro Match | Health | Variety | **Total Score** |
|------|----------|---------|-------|-----|---------------|-------------|--------|---------|-----------------|
| Kajgana s jajima | 500 | 30 | 50 | 15 | 1.0 | 1.0 | 0.8 | 1.0 | **0.96** ✅ |
| Zobene s voćem | 480 | 25 | 55 | 12 | 0.92 | 0.88 | 0.9 | 1.0 | **0.90** |
| Sendvič s mesom | 550 | 28 | 52 | 18 | 0.78 | 0.95 | 0.7 | 0.85 | **0.84** |

**Odabrano:** Kajgana s jajima (najbolji score: 0.96)

## 🆚 Kada Koristiti Koji Generator?

### **Obični Generator** (`weeklyMealPlanGenerator.ts`)
✅ **Koristi kada:**
- Trebaš brz rezultat
- Imaš dovoljno jela u `meal_components.json`
- Ne trebaš scoring sistem
- Mobilna aplikacija (jednostavniji)

### **PRO Generator** (`proMealPlanGenerator.ts`)
✅ **Koristi kada:**
- Trebaš najbolji mogući odabir jela
- Imaš recepte u Supabase bazi
- Trebaš scoring sistem za kvalitetu
- Web aplikacija (napredniji)

## 📋 Zaključak

**PRO Generator** je napredniji jer:
1. ✅ **Ocjenjuje** svako jelo umjesto nasumičnog odabira
2. ✅ **Bira najbolje** jelo iz 30 kandidata
3. ✅ **Uzima u obzir** zdravlje i različitost
4. ✅ **Precizniji** u postizanju ciljeva

**Obični Generator** je jednostavniji jer:
1. ✅ **Brži** - ne treba ocjenjivati kandidate
2. ✅ **Jednostavniji** - samo skalira postojeća jela
3. ✅ **Dovoljno dobar** za većinu slučajeva

**Tvoja mobilna aplikacija koristi obični generator**, što je dovoljno dobro jer:
- ✅ Koristi iste jela kao web verzija
- ✅ Ima Edamam validaciju
- ✅ Ima iterativno skaliranje
- ✅ Postiže iste rezultate

