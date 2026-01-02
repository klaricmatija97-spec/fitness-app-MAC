# 🎯 Trener UX Poboljšanja - Prioriteti

## 📊 Trenutno Stanje

### ✅ Što VEĆ postoji:
- ✅ Dodavanje klijenata
- ✅ Pregled klijenata s osnovnim statusom
- ✅ Detalji klijenta (osobni podaci, ciljevi, preferencije)
- ✅ Godišnji plan mezociklusa (vizualni kalendar)
- ✅ Program generator (IFT metodika)
- ✅ Custom Split Builder
- ✅ Manual program builder
- ✅ Regeneracija tjedna
- ✅ Publish programa klijentu

---

## 🔴 KRITIČNO (Mora biti prije launcha)

### 1. **Workout Logs Tablica** ⚠️
**Status:** ❌ Nedostaje (17 TODO-ova čeka)

**Što treba:**
- Tablica `workout_logs` u Supabase
- API za spremanje completed sessions
- Tracking: setovi, ponavljanja, težina, RPE, napomene

**Impact:** 
- Bez ovoga trener ne vidi što klijent radi
- Ne može pratiti napredak
- Adherence % ne radi

**Prioritet:** 🔴 **KRITIČNO**

---

### 2. **Adherence Tracking** ⚠️
**Status:** ⚠️ Djelomično (prikazuje se, ali ne računa se)

**Što treba:**
- Automatski izračun adherence % (completed / total sessions)
- Visual indikatori (🟢 >80%, 🟡 50-80%, 🔴 <50%)
- Alerts za nisku adherence

**Impact:**
- Trener ne zna tko treba pomoć
- Ne može identificirati probleme

**Prioritet:** 🔴 **KRITIČNO**

---

### 3. **Progress Tracking Dashboard**
**Status:** ❌ Nedostaje

**Što treba:**
- Grafikoni napretka (težina, volumen, snaga)
- Tjedni/mjesečni pregled
- Comparison između klijenata

**Impact:**
- Trener ne vidi rezultate svojih programa
- Teško dokazati vrijednost klijentima

**Prioritet:** 🔴 **VISOK**

---

## 🟠 VAŽNO (Preporučeno za launch)

### 4. **Bulk Operacije**
**Status:** ⚠️ Djelomično (kopiranje programa TODO)

**Što treba:**
- Kopiraj program između klijenata
- Bulk edit (promijeni status više programa odjednom)
- Templatei programa (spremi kao template, primijeni na više klijenata)

**Impact:**
- Ušteda vremena za trenere
- Konzistentnost između klijenata

**Prioritet:** 🟠 **SREDNJI**

---

### 5. **Search i Filteri**
**Status:** ⚠️ Osnovni filteri postoje

**Što treba:**
- Search po imenu/emailu klijenta
- Filteri: status programa, adherence, cilj, razina
- Sortiranje (po imenu, adherence, posljednja sesija)

**Impact:**
- Brže pronalaženje klijenata
- Bolja organizacija

**Prioritet:** 🟠 **SREDNJI**

---

### 6. **Notifikacije za Trenere**
**Status:** ⚠️ Skeleton postoji

**Što treba:**
- Push notifikacije kada klijent završi trening
- Alerts za nisku adherence
- Reminderi za review programa

**Impact:**
- Trener ostaje u toku
- Reaktivniji odgovor

**Prioritet:** 🟠 **SREDNJI**

---

### 7. **Quick Actions**
**Status:** ⚠️ Osnovni postoje

**Što treba:**
- Quick edit (promijeni status programa iz liste)
- Quick message (brza poruka klijentu)
- Quick regenerate (regeneriraj tjedan iz liste)

**Impact:**
- Brže workflow
- Manje klikova

**Prioritet:** 🟠 **NISKI**

---

## 🟡 POBOLJŠANJA (Post-launch)

### 8. **Analytics Dashboard**
**Status:** ❌ Nedostaje

**Što treba:**
- Statistike: ukupno klijenata, aktivnih programa, adherence prosjek
- Grafikoni: trendovi, uspješnost programa
- Export u PDF/CSV

**Impact:**
- Business insights
- Dokazivanje vrijednosti

**Prioritet:** 🟡 **NISKI**

---

### 9. **Program Templatei**
**Status:** ❌ Nedostaje

**Što treba:**
- Spremi program kao template
- Library templatea (po cilju, razini, split tipu)
- Primijeni template na novog klijenta

**Impact:**
- Brže kreiranje programa
- Konzistentnost

**Prioritet:** 🟡 **NISKI**

---

### 10. **Client Communication**
**Status:** ⚠️ Chat postoji, ali nije integriran

**Što treba:**
- In-app messaging između trenera i klijenta
- Notes na programima (trener → klijent)
- Feedback loop (klijent → trener)

**Impact:**
- Bolja komunikacija
- Manje emaila/WhatsApp poruka

**Prioritet:** 🟡 **NISKI**

---

### 11. **Export Funkcionalnosti**
**Status:** ❌ Nedostaje

**Što treba:**
- Export programa u PDF
- Export progress data u CSV
- Print-friendly verzije programa

**Impact:**
- Klijenti mogu printati programe
- Backup podataka

**Prioritet:** 🟡 **NISKI**

---

### 12. **Advanced Filtering**
**Status:** ⚠️ Osnovni postoje

**Što treba:**
- Filter po datumu (dodani u zadnjih X dana)
- Filter po cilju (hipertrofija, snaga, itd.)
- Filter po razini (početnik, srednji, napredni)
- Saved filters (spremi česte filtere)

**Prioritet:** 🟡 **NISKI**

---

## 🎨 UI/UX POBOLJŠANJA

### 13. **Loading States**
**Status:** ⚠️ Djelomično

**Što treba:**
- Skeleton loaders umjesto spinnera
- Optimistic updates (odmah prikaži promjene)
- Progress indicators za duže operacije

**Prioritet:** 🟡 **NISKI**

---

### 14. **Empty States**
**Status:** ⚠️ Osnovni postoje

**Što treba:**
- Lijepi empty states s CTA-ovima
- Onboarding za nove trenere
- Helpful tips i tooltips

**Prioritet:** 🟡 **NISKI**

---

### 15. **Keyboard Shortcuts** (Web verzija)
**Status:** ❌ Nedostaje

**Što treba:**
- `/` za search
- `Ctrl+K` za quick actions
- `Esc` za zatvaranje modala

**Prioritet:** 🟡 **NISKI**

---

## 📱 MOBILE SPECIFIČNO

### 16. **Offline Mode**
**Status:** ❌ Nedostaje

**Što treba:**
- Cache klijenata i programa
- Offline viewing
- Sync kada se vrati online

**Prioritet:** 🟡 **NISKI**

---

### 17. **Swipe Actions**
**Status:** ❌ Nedostaje

**Što treba:**
- Swipe left za quick actions (edit, delete)
- Swipe right za view details
- Pull to refresh (već postoji ✅)

**Prioritet:** 🟡 **NISKI**

---

## 🎯 TOP 5 PRIORITETA ZA LAUNCH

1. **Workout Logs Tablica** 🔴
2. **Adherence Tracking** 🔴
3. **Progress Tracking Dashboard** 🔴
4. **Bulk Operacije (kopiranje programa)** 🟠
5. **Search i Filteri** 🟠

---

## 💡 Quick Wins (Lako implementirati, velik impact)

1. **Search bar** u TrainerHomeScreen (1-2 sata)
2. **Quick edit status** iz liste klijenata (1 sat)
3. **Empty states** s CTA-ovima (2 sata)
4. **Loading skeletons** (2-3 sata)
5. **Export to PDF** za programe (3-4 sata)

---

## 📊 Metričke za Mjerenje Uspeha

- **Vrijeme do prvog programa:** < 5 minuta
- **Broj klikova do publish:** < 10 klikova
- **Adherence tracking accuracy:** > 95%
- **Trener satisfaction:** > 4.5/5
- **Time saved vs manual:** > 50%

