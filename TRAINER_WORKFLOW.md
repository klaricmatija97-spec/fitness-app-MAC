# TRENER WORKFLOW - Kompletan tok rada

## 📋 Pregled

Ovaj dokument opisuje kompletan workflow za trenera kako da:
1. Doda klijenta
2. Posloži mezocikluse na godišnjoj razini
3. Generira trening za mezociklus
4. Publish program klijentu

---

## 🔄 STEP-BY-STEP WORKFLOW

### 1️⃣ Dodavanje klijenta ✅

**Koraci:**
1. Otvori aplikaciju → **Trener mod**
2. Klikni **"+ Novi"** gumb u `TrainerHomeScreen`
3. Popuni formu u `AddClientScreen`:
   - Ime i prezime*
   - Email*
   - Telefon (opcionalno)
   - Napomene (opcionalno)
4. Klikni **"Dodaj klijenta"**
5. Klijent se automatski dodjeljuje treneru (`trainer_id` se postavlja)

**API:**
- `POST /api/trainer/clients`

**Status:** ✅ **IMPLEMENTIRANO**

---

### 2️⃣ Pregled klijenata ✅

**Koraci:**
1. U `TrainerHomeScreen` vidi se lista svih klijenata
2. Za svakog klijenta prikazuje se:
   - Status programa (draft / active / needs attention)
   - Adherence %
   - Posljednja sesija
3. Klik na klijenta → otvara `TrainerClientDetailScreen`

**API:**
- `GET /api/trainer/clients`

**Status:** ✅ **IMPLEMENTIRANO**

---

### 3️⃣ Godišnji plan mezociklusa

**Koraci:**
1. U `TrainerClientDetailScreen` klikni **"📅 Godišnji plan mezociklusa"**
2. Otvara se `AnnualPlanBuilderScreen`
3. Trener može:
   - **Vizualno složiti mezocikluse** na kalendaru (52 tjedna)
   - **Dodati mezociklus** (automatski ili ručno)
   - **Urediti/obrisati** postojeći mezociklus

**API:**
- `GET /api/trainer/annual-plan?clientId=...&year=...`
- `POST /api/trainer/annual-plan`
- `PATCH /api/trainer/annual-plan/[annualProgramId]`
- `DELETE /api/trainer/annual-plan/[annualProgramId]`

**Status:** ✅ **IMPLEMENTIRANO** (osnovni UI, potrebno dodati generiranje treninga)

---

### 4️⃣ Generiranje treninga za mezociklus

**Opcija A: Generiraj program za klijenta (brzi način)**

**Koraci:**
1. U `TrainerClientDetailScreen` klikni **"💪 Generiraj novi program"**
2. Otvara se `TrainerProgramBuilderScreen`
3. Korak 1: Osnovna konfiguracija
   - Cilj (hipertrofija, snaga, izdržljivost, rekreacija)
   - Razina (početnik, srednji, napredni)
   - Split tip (full body, upper/lower, push/pull/legs, body-part)
   - Trajanje (4-16 tjedana)
   - Treninga po tjednu (3-6)
4. Korak 2: Fokus i oprema
   - Dostupna oprema (multi-select)
   - Fokusirane mišićne grupe (opcionalno)
   - Vježbe za izbjegavanje (opcionalno)
5. Korak 3: Generiraj preview
   - Automatski se generira kompletan program
   - Prikazuje se pregled mezociklusa, tjedana, sesija
6. Korak 4: Pregled i publish
   - Pregled kompletnog programa
   - Opcije: **"Spremi kao draft"** ili **"Publish klijentu"**

**API:**
- `POST /api/training/generate`
- `POST /api/trainer/program/[programId]/publish`

**Status:** ✅ **IMPLEMENTIRANO** (osnovni flow, potrebno dodati publish)

---

**Opcija B: Generiraj trening za postojeći mezociklus (godišnji plan)**

**Koraci:**
1. U `AnnualPlanBuilderScreen` klikni na mezociklus
2. Odaberi **"Generiraj trening"**
3. Otvara se `TrainerProgramBuilderScreen` s pre-popunjenim podacima iz mezociklusa
4. Trener može prilagoditi parametre
5. Generiraj → Publish

**Status:** ⏳ **TREBA IMPLEMENTIRATI**

---

### 5️⃣ Publish program klijentu ✅

**Koraci:**
1. Nakon generiranja programa u `TrainerProgramBuilderScreen`
2. Klikni **"Publish klijentu"**
3. Program status se mijenja: `draft` → `active`
4. Klijent sada može vidjeti program u svojoj aplikaciji

**API:**
- `POST /api/trainer/program/[programId]/publish`

**Validacija:**
- Program mora imati barem 1 mezociklus
- Program mora imati barem 1 sesiju
- Program mora biti u `draft` statusu

**Status:** ✅ **IMPLEMENTIRANO**

---

## 🎯 PRIORITETI ZA IMPLEMENTACIJU

### Visoki prioritet:
1. ✅ Dodavanje klijenta - **GOTOVO**
2. ✅ Pregled klijenata - **GOTOVO**
3. ✅ Generiranje programa - **GOTOVO**
4. ⏳ **Publish funkcionalnost u TrainerProgramBuilderScreen** - **TREBA DODATI**
5. ⏳ **"Generiraj novi program" gumb u TrainerClientDetailScreen** - **TREBA DODATI**

### Srednji prioritet:
6. ⏳ Generiranje treninga za postojeći mezociklus (iz godišnjeg plana)
7. ⏳ Integracija godišnjeg plana s generatorom
8. ⏳ Ručno slaganje mezociklusa (Manual Builder)

### Nizak prioritet:
9. Uređivanje postojećih programa
10. Kopiranje programa između klijenata
11. Export/Import programa

---

## 📝 DETALJI IMPLEMENTACIJE

### Publish u TrainerProgramBuilderScreen

**Lokacija:** `mobile/src/screens/TrainerProgramBuilderScreen.tsx`

**Dodati:**
```typescript
async function handlePublish(programId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trainer/program/${programId}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: selectedClientId, // Opcionalno, već je u programu
      }),
    });
    
    const result = await response.json();
    if (result.success) {
      Alert.alert('Uspjeh', 'Program je uspješno publishan klijentu!');
      // Navigate back or refresh
    } else {
      Alert.alert('Greška', result.error || 'Nije moguće publishati program');
    }
  } catch (error) {
    console.error('Error publishing program:', error);
    Alert.alert('Greška', 'Nije moguće publishati program');
  }
}
```

**Kada pozvati:**
- Nakon uspješnog generiranja programa (Step 4)
- Gumb "Publish klijentu" umjesto samo "Spremi"

---

### "Generiraj novi program" gumb u TrainerClientDetailScreen

**Lokacija:** `mobile/src/screens/TrainerClientDetailScreen.tsx`

**Dodati:**
```typescript
<TouchableOpacity
  style={[styles.actionButton, styles.actionButtonPrimary]}
  onPress={() => {
    // Navigate to TrainerProgramBuilderScreen with clientId
    if (onGenerateProgram) {
      onGenerateProgram(clientId);
    }
  }}
>
  <Text style={styles.actionButtonText}>💪 Generiraj novi program</Text>
</TouchableOpacity>
```

**U App.tsx dodati handler:**
```typescript
const handleGenerateProgram = (clientId: string) => {
  setSelectedClientId(clientId);
  setShowTrainerClientDetail(false);
  setShowTrainingGenerator(true);
};
```

---

## ✅ CHECKLIST ZA KOMPLETAN WORKFLOW

- [x] Dodavanje klijenta
- [x] Pregled klijenata
- [x] Godišnji plan mezociklusa (osnovni UI)
- [x] Generiranje programa (osnovni flow)
- [ ] Publish program nakon generiranja
- [ ] "Generiraj novi program" gumb u detail screen
- [ ] Generiranje treninga za postojeći mezociklus
- [ ] Integracija godišnjeg plana s generatorom

---

## 🔗 POVEZANI DOKUMENTI

- `MOBILE_TRAINER_FLOW.md` - Detaljni UI flow
- `API_MOBILE_CONTRACT.md` - API kontrakt
- `B2B_FITNESS_APP_FLOW.md` - Cjelokupni flow aplikacije

