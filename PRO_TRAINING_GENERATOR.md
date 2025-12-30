# PRO Training Generator - Dokumentacija

## Pregled sustava

PRO Training Generator je profesionalni sustav za generiranje trening programa baziran na **IFT metodologiji** (Metodika fitnessa u teretani). Dizajniran je primarno za trenere (B2B) s podrškom za krajnje korisnike.

### Ključne značajke

1. **Periodizacija kroz mezocikluse** - Program se dijeli u faze s jasnim fokusom
2. **IFT-bazirana pravila** - Volumen i intenzitet prema znanstvenim preporukama
3. **Inteligentni odabir vježbi** - Iz baze od 873 vježbe
4. **Validacija programa** - Automatska provjera prema IFT pravilima
5. **Trener-first pristup** - Override, zaključavanje, template sustav

---

## Arhitektura

```
lib/pro-training/
├── types.ts           # Tipovi i interface-i
├── constants.ts       # IFT konstante (volumen, intenzitet)
├── exercise-library.ts # Mapper za bazu vježbi
├── generator.ts       # Glavni generator modul
├── validation.ts      # Validacije
└── index.ts           # Export

app/api/training/pro-generate/
└── route.ts           # API endpoint
```

---

## Ciljevi programa

| Cilj | Opis | Rep Range | RIR | Odmor |
|------|------|-----------|-----|-------|
| `hipertrofija` | Povećanje mišićne mase | 6-12 | 1-3 | 90-150s |
| `maksimalna_snaga` | Maksimalna snaga (1RM) | 1-6 | 0-2 | 180-300s |
| `misicna_izdrzljivost` | Mišićna izdržljivost | 15-30 | 1-3 | 30-60s |
| `rekreacija_zdravlje` | Opća kondicija | 10-15 | 2-4 | 60-90s |

---

## Razine korisnika

| Razina | Iskustvo | Max setova/trening | Max compound/trening |
|--------|----------|-------------------|---------------------|
| `pocetnik` | < 6 mjeseci | 16 | 4 |
| `srednji` | 6 mj - 2 god | 22 | 5 |
| `napredni` | > 2 godine | 28 | 6 |

---

## Split tipovi

| Split | Preporučeni dani | Opis |
|-------|-----------------|------|
| `full_body` | 2-3 | Cijelo tijelo svaki trening |
| `upper_lower` | 4 | Gornji/donji dio |
| `push_pull_legs` | 3-6 | Potisak/Vučenje/Noge |
| `body_part_split` | 5-6 | Po mišićnim grupama (samo napredni!) |

---

## Mezociklusi

Program se dijeli u **mezocikluse** - blokove od 1-6 tjedana s jasnim fokusom:

### Tipovi mezociklusa

| Tip | Trajanje | Volumen | Intenzitet | Fokus |
|-----|----------|---------|------------|-------|
| `akumulacija` | 3-6 tj | ↑ Raste | Stabilan (70-80%) | Volumen, tehnika |
| `intenzifikacija` | 3-4 tj | ↓ Pada | ↑ Raste (85-95%) | Težina |
| `realizacija` | 1-2 tj | Minimalan | Maksimalan (95-100%) | Peak |
| `deload` | 1 tj | 50% | 60% | Oporavak |

### Primjer strukture 8-tjednog programa

```
Tjedan 1-4: AKUMULACIJA
  - Volumen raste svaki tjedan
  - Intenzitet stabilan (70-80% 1RM)
  
Tjedan 5: DELOAD
  - 50% volumena
  - Fokus na tehniku
  
Tjedan 6-8: INTENZIFIKACIJA
  - Volumen pada
  - Intenzitet raste (85-95% 1RM)
```

---

## Volumen preporuke (setovi/tjedan)

Prema IFT metodologiji:

| Mišićna grupa | Početnik MEV-MAV-MRV | Srednji | Napredni |
|---------------|----------------------|---------|----------|
| Prsa | 8-12-16 | 10-16-22 | 12-20-26 |
| Leđa | 10-14-18 | 12-18-24 | 14-22-28 |
| Ramena | 6-10-14 | 8-14-20 | 10-18-24 |
| Kvadriceps | 8-12-16 | 12-18-24 | 14-22-28 |
| Hamstrinzi | 6-10-14 | 10-14-20 | 12-18-24 |
| Gluteus | 4-8-12 | 8-14-20 | 10-18-24 |
| Biceps | 4-8-12 | 8-12-18 | 10-16-22 |
| Triceps | 4-8-12 | 8-12-18 | 10-16-22 |

**MEV** = Minimalni Efektivni Volumen  
**MAV** = Maksimalni Adaptivni Volumen (optimalno)  
**MRV** = Maksimalni Oporavni Volumen (prije preopterećenja)

---

## API Korištenje

### Endpoint

```
POST /api/training/pro-generate
```

### Request Body

```json
{
  "clientId": "uuid-klijenta",
  "trainerId": "uuid-trenera",
  
  "cilj": "hipertrofija",
  "razina": "srednji",
  "treninzi_tjedno": 4,
  "trajanje_tjedana": 8,
  "split": "upper_lower",
  
  "dostupna_oprema": [
    "sipka",
    "bucice",
    "kabel",
    "sprava",
    "tjelesna_tezina"
  ],
  
  "preferirana_trajanje_treninga_min": 60,
  "fokus_misicne_grupe": ["prsa", "gluteus"],
  
  "spremi_u_bazu": true,
  "debug": false
}
```

### Response

```json
{
  "ok": true,
  "program": {
    "id": "generated-uuid",
    "naziv": "hipertrofija program - 8 tjedana",
    "mezociklusi": [
      {
        "redni_broj": 1,
        "naziv": "Akumulacija faza",
        "tip": "akumulacija",
        "trajanje_tjedana": 4,
        "tjedni": [
          {
            "tjedan_broj": 1,
            "je_deload": false,
            "treninzi": [
              {
                "naziv": "Gornji dio A",
                "dan_u_tjednu": 1,
                "vjezbe": [...]
              }
            ]
          }
        ]
      }
    ]
  },
  "validacija": {
    "je_validan": true,
    "warnings": [],
    "meta": {
      "ukupni_volumen_tjedno": 85,
      "balans_push_pull": 1.05
    }
  },
  "statistika": {
    "vrijeme_generiranja_ms": 234,
    "ukupno_treninga": 32,
    "ukupno_vjezbi": 192
  }
}
```

---

## Primjer generiranog programa

### 8-tjedni Hipertrofija program (Upper/Lower, 4x tjedno)

#### MEZOCIKLUS 1: Akumulacija (Tjedni 1-4)

**TJEDAN 1 - Upper A (Ponedjeljak)**

| # | Vježba | Setovi | Ponavljanja | Odmor | RIR |
|---|--------|--------|-------------|-------|-----|
| 1 | Potisak s klupe sa šipkom | 4 | 8-12 | 120s | 2 |
| 2 | Veslanje sa šipkom u pretklonu | 4 | 8-12 | 120s | 2 |
| 3 | Vojnički potisak stojeći | 3 | 8-12 | 90s | 2 |
| 4 | Povlačenje na lat spravi | 3 | 10-12 | 90s | 2 |
| 5 | Bočno podizanje | 3 | 12-15 | 60s | 2 |
| 6 | Pregib sa šipkom | 3 | 10-12 | 60s | 2 |
| 7 | Potisak za triceps | 3 | 10-12 | 60s | 2 |

**TJEDAN 1 - Lower A (Utorak)**

| # | Vježba | Setovi | Ponavljanja | Odmor | RIR |
|---|--------|--------|-------------|-------|-----|
| 1 | Čučanj sa šipkom | 4 | 8-10 | 150s | 2 |
| 2 | Rumunjsko mrtvo dizanje | 4 | 8-10 | 120s | 2 |
| 3 | Nožna preša | 3 | 10-12 | 90s | 2 |
| 4 | Pregib nogu ležeći | 3 | 10-12 | 60s | 2 |
| 5 | Hip thrust sa šipkom | 3 | 10-12 | 90s | 2 |
| 6 | Podizanje na prste stojeći | 3 | 12-15 | 45s | 2 |

**Progresija kroz Tjedan 2-4:**
- Tjedan 2: +1 set na compound vježbe
- Tjedan 3: +1 set na izolacije
- Tjedan 4: Povećaj težinu 2.5-5%, zadrži setove

#### MEZOCIKLUS 2: Deload (Tjedan 5)

- 50% volumena (pola setova)
- Isti broj vježbi
- RIR = 4-5 (daleko od otkaza)
- Fokus na tehniku i oporavak

#### MEZOCIKLUS 3: Intenzifikacija (Tjedni 6-8)

**Promjene u odnosu na Akumulaciju:**

| Parametar | Akumulacija | Intenzifikacija |
|-----------|-------------|-----------------|
| Rep range | 8-12 | 6-8 |
| Setovi | 3-4 | 3 |
| RIR | 2 | 1 |
| Težina | 65-75% 1RM | 80-85% 1RM |
| Odmor | 90-120s | 150-180s |

---

## Validacije

Generator provjerava:

### Kritične greške (program se ne generira)
- ❌ Program bez vježbi
- ❌ Početnik s body_part_split
- ❌ Nevalidni ulazni podaci

### Upozorenja (program se generira, ali s napomenom)
- ⚠️ Prevelik volumen po mišićnoj grupi (> MRV)
- ⚠️ Push/Pull nebalans (< 0.8 ili > 1.2)
- ⚠️ Previše setova po treningu
- ⚠️ Nema deload tjedna u programu > 6 tjedana
- ⚠️ Početnik + maksimalna snaga cilj

---

## Trener funkcionalnosti

### 1. Override vježbe
Trener može zamijeniti bilo koju vježbu, sustav validira da zamjena cilja istu mišićnu grupu.

### 2. Zaključavanje
Trener može zaključati:
- Cijeli program
- Pojedini trening
- Pojedinu vježbu

### 3. Template sustav
Trener može:
- Spremiti program kao template
- Kopirati template na drugog klijenta
- Dijeliti javne template-e

### 4. Prilagodba parametara
- Promjena broja setova
- Promjena ponavljanja
- Promjena opreme
- Dodavanje napomena

---

## Baza podataka

### Tablice

```sql
training_plans           -- Glavni programi
training_mesocycles      -- Mezociklusi
training_weeks           -- Tjedni
training_sessions        -- Treninzi
training_session_exercises -- Vježbe
training_overrides       -- Trener override-ovi
training_templates       -- Template predlošci
exercise_library         -- Cache vježbi
```

### Migracija

Pokrenite SQL iz `supabase-pro-training-schema.sql` u Supabase SQL Editoru.

---

## TODO za MVP → PRO

### MVP (Implementirano ✅)
- [x] Arhitektura i tipovi
- [x] IFT konstante volumena i intenziteta
- [x] Exercise library mapper (873 vježbe)
- [x] Mezociklus generator
- [x] Progresija kroz tjedne
- [x] Validacije
- [x] API endpoint
- [x] SQL schema

### PRO (Sljedeće iteracije)
- [ ] UI komponente za prikaz programa
- [ ] Drag & drop editor za trenere
- [ ] Real-time tracking izvršenja
- [ ] Analitika i statistika
- [ ] 1RM kalkulator i praćenje
- [ ] Video demonstracije vježbi
- [ ] Push notifikacije za treninge
- [ ] Offline podrška
- [ ] Export u PDF
- [ ] Integracija s nosivim uređajima

---

## Debugging

Postavite environment varijablu za debug logging:

```bash
DEBUG_TRAINING_GENERATOR=true
```

Ili pošaljite `"debug": true` u API request za debug log u response-u.

---

## Autori

PRO Training Generator - Verzija 1.0.0

Bazirano na IFT metodologiji (Metodika fitnessa u teretani)

