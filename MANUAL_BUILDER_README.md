# PRO Training Generator - Manual Builder

## Pregled

Manual Builder omogućuje trenerima **potpunu kontrolu** nad kreiranjem programa treninga.
Postoje 3 načina kreiranja programa:

| Način | Opis | Kada koristiti |
|-------|------|----------------|
| **AUTO** | Generator automatski kreira cijeli program | Brzo kreiranje standardnih programa |
| **MANUAL** | Trener ručno definira svaki dio | Potpuna kontrola, specifični zahtjevi klijenta |
| **HYBRID** | Kombinacija auto + manual | Trener definira ključne dijelove, generator popunjava ostatak |

---

## API Endpointi

### 1. Automatski Generator (postojeći)

```
POST /api/training/generate
```

Generira kompletan program automatski.

### 2. Manual Builder Endpointi (NOVI)

#### Kreiranje praznog programa
```
POST /api/training/manual/program
```
```json
{
  "clientId": "uuid-klijenta",
  "trenerId": "uuid-trenera",
  "naziv": "Program za Marka",
  "cilj": "hypertrophy",
  "razina": "intermediate",
  "splitTip": "push_pull_legs",
  "trajanjeTjedana": 8,
  "treninziTjedno": 5,
  "napomene": "Fokus na gornji dio tijela"
}
```

#### Dodavanje mezociklusa
```
POST /api/training/manual/mesocycle
```
```json
{
  "programId": "uuid-programa",
  "naziv": "Faza volumena",
  "tip": "volume",
  "tjedanOd": 1,
  "tjedanDo": 4,
  "fokusOpis": "Akumulacija volumena s umjerenim intenzitetom",
  "napomene": "RPE 6-7"
}
```

#### Dodavanje sesije (treninga)
```
POST /api/training/manual/session
```
```json
{
  "programId": "uuid-programa",
  "mesocycleId": "uuid-mezociklusa",
  "tjedanBroj": 1,
  "danUTjednu": 1,
  "redniBrojUTjednu": 1,
  "naziv": "Push dan A",
  "procijenjanoTrajanje": 75,
  "napomene": "Fokus na bench press"
}
```

#### Dodavanje vježbe
```
POST /api/training/manual/exercise
```
```json
{
  "sessionId": "uuid-sesije",
  "exerciseId": "barbell_bench_press",
  "nazivHr": "Potisak s klupe",
  "nazivEn": "Bench Press",
  "redniBroj": 1,
  "setovi": 4,
  "ponavljanja": "6-8",
  "odmorSekunde": 180,
  "tempo": "3-1-2-0",
  "rpe": 8,
  "primarniMisici": ["prsa"],
  "sekundarniMisici": ["triceps", "ramena"],
  "oprema": "sipka",
  "mehanika": "compound"
}
```

### 3. Hybrid Generator (Popunjavanje praznina)

```
POST /api/training/fill-gaps
```
```json
{
  "programId": "uuid-programa",
  "clientId": "uuid-klijenta",
  "cilj": "hipertrofija",
  "razina": "srednji",
  "treninziTjedno": 5,
  "trajanjeTjedana": 8,
  "popuniSamo": "sve"
}
```

Opcije za `popuniSamo`:
- `"mezocikluse"` - samo mezociklusi
- `"sesije"` - samo sesije
- `"vjezbe"` - samo vježbe
- `"sve"` - sve (default)

### 4. Unified View

```
GET /api/training/view/{programId}
```

Vraća kompletan pregled programa s označenim auto/manual komponentama.

---

## Workflow Primjeri

### Primjer 1: Potpuno ručni program

```
1. POST /api/training/manual/program     → Kreira prazan program (source: 'manual')
2. POST /api/training/manual/mesocycle   → Dodaje mezociklus 1
3. POST /api/training/manual/mesocycle   → Dodaje mezociklus 2
4. POST /api/training/manual/session     → Dodaje trening 1.1
5. POST /api/training/manual/exercise    → Dodaje vježbe...
```

### Primjer 2: Hybrid program

```
1. POST /api/training/manual/program     → Kreira prazan program
2. POST /api/training/manual/mesocycle   → Ručno definira SAMO prvi mezociklus
3. POST /api/training/fill-gaps          → Generator popuni ostatak
   → Program postaje 'hybrid'
   → Manual mezociklus ostaje netaknut
   → Generator dodaje preostale mezocikluse i sesije
```

### Primjer 3: Modificiranje auto programa

```
1. POST /api/training/generate           → Generator kreira program (source: 'auto')
2. PATCH /api/training/manual/session    → Trener modificira jedan trening
   → Program postaje 'hybrid'
3. POST /api/training/manual/exercise    → Trener dodaje specifičnu vježbu
```

---

## Tipovi Mezociklusa

| Tip | HR Naziv | Opis |
|-----|----------|------|
| `volume` | Akumulacija | Visok volumen, umjeren intenzitet (65-75% 1RM) |
| `intensity` | Intenzifikacija | Niži volumen, visok intenzitet (75-90% 1RM) |
| `peak` | Realizacija | Peak performance, testiranje maksimuma |
| `deload` | Deload | Oporavak, 50-60% normalnog volumena |

---

## Struktura Baze Podataka

### Novi stupci

```sql
-- training_programs
source TEXT CHECK (source IN ('auto', 'manual', 'hybrid'))

-- mesocycles
is_manual BOOLEAN DEFAULT FALSE
manual_order INTEGER

-- program_sessions
is_manual BOOLEAN DEFAULT FALSE
manual_order INTEGER

-- session_exercises
is_manual BOOLEAN DEFAULT FALSE
manual_order INTEGER
```

---

## Primjer Kompletnog Manual Programa (JSON)

```json
{
  "program": {
    "naziv": "8-tjedni hipertrofija program",
    "cilj": "hypertrophy",
    "razina": "intermediate",
    "splitTip": "push_pull_legs",
    "trajanjeTjedana": 8,
    "treninziTjedno": 5,
    "source": "manual"
  },
  "mezociklusi": [
    {
      "naziv": "Faza akumulacije",
      "tip": "volume",
      "tjedanOd": 1,
      "tjedanDo": 4,
      "fokusOpis": "Izgradnja kapaciteta s visokim volumenom",
      "sesije": [
        {
          "tjedanBroj": 1,
          "danUTjednu": 1,
          "naziv": "Push A",
          "vjezbe": [
            {
              "naziv": "Potisak s klupe",
              "setovi": 4,
              "ponavljanja": "8-10",
              "rpe": 7
            },
            {
              "naziv": "Kosi potisak s bučicama",
              "setovi": 3,
              "ponavljanja": "10-12",
              "rpe": 7
            }
          ]
        }
      ]
    },
    {
      "naziv": "Faza intenzifikacije",
      "tip": "intensity",
      "tjedanOd": 5,
      "tjedanDo": 7,
      "fokusOpis": "Povećanje intenziteta, smanjenje volumena"
    },
    {
      "naziv": "Deload",
      "tip": "deload",
      "tjedanOd": 8,
      "tjedanDo": 8,
      "fokusOpis": "Oporavak prije novog ciklusa"
    }
  ]
}
```

---

## Pravila

1. **NIKAD se ne prepisuje manual input** - Generator preskače sve s `is_manual: true`
2. **Source se automatski ažurira** - Dodavanjem manual komponente u auto program, source postaje 'hybrid'
3. **Manual vježbe su zaključane** - Generator ih ne zamjenjuje niti briše
4. **Redoslijed se poštuje** - `manual_order` ima prioritet nad auto redoslijedom

---

## Mobile-Friendly

Svi odgovori su JSON format optimiziran za mobilne aplikacije:
- Kratki nazivi polja
- Enum vrijednosti umjesto tekstualnih opisa
- UUID identifikatori za sve entitete
- Jasne poruke o uspjehu/grešci

