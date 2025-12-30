# B2B Fitness App - Product Flow Design

**Status:** Generator je FINALAN, ovo je produktni plan za B2B flow

---

## 1. APPLICATION FLOW

### 1.1 Trainer Flow

```
Login → Dashboard → (Create/Edit Program) → Publish → Client Assignment
```

**Koraci:**

1. **Login**
   - Trainer se prijavljuje s email/password
   - Role: `trainer`
   - Access: svi programi, klijenti, generator

2. **Dashboard**
   - Pregled svih programa (draft/active/archived)
   - Pregled klijenata
   - Quick actions: "Novi program", "Novi klijent"
   - Statistike: aktivnih programa, klijenata

3. **Program Builder**
   - **Opcija A:** Auto Generator
     - Unosi cilj, razina, split, trajanje
     - Generator kreira program
     - Trainer može urediti
   
   - **Opcija B:** Manual Builder
     - Ručno kreira mezocikluse
     - Dodaje sesije i vježbe
     - Koristi exercise library
   
   - **Opcija C:** Hybrid
     - Kombinira auto + manual dijelove
     - Fill-gaps za popunjavanje praznina

4. **Program Detail**
   - Pregled kompletnog programa (mesocycles → sessions → exercises)
   - Uređivanje (samo za draft programe)
   - Duplicate program
   - Delete program (samo draft)

5. **Publish**
   - Program status: `draft` → `active`
   - Assignment klijentu
   - Client dobiva pristup programu

---

### 1.2 Client Flow

```
Login → Dashboard → Today Session → Execute → History
```

**Koraci:**

1. **Login**
   - Client se prijavljuje s email/password
   - Role: `client`
   - Access: samo svoj aktivni program

2. **Dashboard**
   - Aktivan program (ako postoji)
   - Today Session (današnji trening)
   - Progress (completed sessions, weeks)

3. **Today Session**
   - Prikaz današnjeg treninga
   - Lista vježbi (sets, reps, tempo, rest)
   - Execute mode (check-in, complete)

4. **Program Overview**
   - Pregled cijelog programa (read-only)
   - Mesocycles, weeks, sessions
   - Timeline progress

5. **History**
   - Završeni treningi
   - Progress tracking
   - Statistike (completed sets, reps)

---

## 2. ROLE-BASED ACCESS

### 2.1 Trainer Access

**Tablice:**
- ✅ `training_programs` (READ/WRITE - svi programi)
- ✅ `mesocycles` (READ/WRITE)
- ✅ `program_sessions` (READ/WRITE)
- ✅ `session_exercises` (READ/WRITE)
- ✅ `clients` (READ/WRITE - svi klijenti)
- ✅ `client_programs` (READ/WRITE - assignment)
- ❌ `workout_logs` (READ only - client execution data)

**Endpoints:**
- ✅ `POST /api/training/generate` - Auto generator
- ✅ `POST /api/training/manual/*` - Manual builder
- ✅ `POST /api/training/fill-gaps` - Hybrid
- ✅ `GET /api/training/view/[programId]` - Program view
- ✅ `POST /api/training/program/publish` - Publish program
- ✅ `POST /api/clients/*` - Client management
- ✅ `GET /api/training/exercises` - Exercise library

**Actions:**
- Create/Edit/Delete programe (samo draft)
- Assign program klijentu
- View client progress
- Generate programs (auto/manual/hybrid)

---

### 2.2 Client Access

**Tablice:**
- ✅ `training_programs` (READ only - samo svoj aktivni program)
- ✅ `mesocycles` (READ only - samo svoj program)
- ✅ `program_sessions` (READ only - samo svoj program)
- ✅ `session_exercises` (READ only - samo svoj program)
- ✅ `workout_logs` (READ/WRITE - svoje logove)
- ❌ `clients` (no access)
- ❌ `client_programs` (no access)

**Endpoints:**
- ✅ `GET /api/training/program/my-program` - Moj aktivni program
- ✅ `GET /api/training/program/today-session` - Današnji trening
- ✅ `POST /api/training/session/complete` - Završi sesiju
- ✅ `GET /api/training/history` - Moja povijest
- ❌ Generator endpoints (no access)
- ❌ Manual builder endpoints (no access)

**Actions:**
- View svoj program (read-only)
- Execute sessions (check-in, complete)
- View history i progress

---

## 3. PROGRAM STATUS

### 3.1 Status Lifecycle

```
draft → active → archived
```

**Draft:**
- Program je u izradi
- Trainer može uređivati (auto/manual/hybrid)
- Nije dostupan klijentu
- Može se brisati

**Active:**
- Program je objavljen i dodijeljen klijentu
- Trainer može samo view (read-only)
- Client može view i execute
- Ne može se brisati (samo archive)

**Archived:**
- Program je završen ili otkazan
- Trainer može view i duplicate
- Client može view (history)
- Nije aktivan (no new sessions)

### 3.2 Status Rules

**Draft → Active:**
- Program mora imati barem 1 mezociklus
- Program mora imati barem 1 sesiju
- Program mora biti dodijeljen klijentu

**Active → Archived:**
- Trainer može arhivirati bilo kada
- Automatska arhivacija nakon `end_date`

**Edit Rules:**
- `draft`: Full edit (auto/manual/hybrid)
- `active`: Read-only (no edit)
- `archived`: Read-only (no edit)

---

## 4. MINIMALNI SET EKRANA (Mobile-First)

### 4.1 Trainer Screens

#### 4.1.1 TrainerDashboardScreen
**Funkcionalnosti:**
- Lista programa (draft/active/archived tabs)
- Quick actions: "Novi program", "Novi klijent"
- Statistike: aktivnih programa, klijenata
- Search programa

**Status badge:**
- 🟡 Draft (editable)
- 🟢 Active (published)
- ⚫ Archived (read-only)

#### 4.1.2 ProgramBuilderScreen
**Funkcionalnosti:**
- **Mode selector:** Auto / Manual / Hybrid
- **Auto mode:** Form za generator input → Generate → Preview → Edit
- **Manual mode:** ManualMesocycleBuilderScreen (već implementiran)
- **Hybrid mode:** Create draft → Fill gaps
- Save as draft

**Navigation:**
- Auto → Generator form → Generated program → Edit
- Manual → ManualMesocycleBuilderScreen
- Hybrid → Create draft → Fill gaps → Edit

#### 4.1.3 ProgramDetailScreen
**Funkcionalnosti:**
- Pregled kompletnog programa (mesocycles → sessions → exercises)
- **If draft:** Edit button (uređivanje)
- **If active:** View only (no edit)
- Actions: Duplicate, Delete (draft only), Publish (draft → active)
- Client assignment (publish flow)

**Status handling:**
- Draft: Full edit access
- Active: Read-only + Archive button
- Archived: Read-only + Duplicate button

---

### 4.2 Client Screens

#### 4.2.1 ClientDashboardScreen
**Funkcionalnosti:**
- Prikaz aktivnog programa (ako postoji)
- "Today Session" card (današnji trening)
- Progress indicators (completed sessions, current week)
- "Program Overview" button

**States:**
- No program: "Nema aktivnog programa"
- Has program: Today session + Progress

#### 4.2.2 TodaySessionScreen
**Funkcionalnosti:**
- Prikaz današnjeg treninga (sesija za danas)
- Lista vježbi (sets, reps, tempo, rest)
- Execute mode: Check-in → Complete sets → Finish session
- Notes field (opcionalno)

**Flow:**
1. Load today session (based on `day_of_week` i `week_number`)
2. Display exercises
3. User completes sets (check marks)
4. Submit → Create workout log

#### 4.2.3 ProgramOverviewScreen
**Funkcionalnosti:**
- Pregled cijelog programa (read-only)
- Mesocycles list → Sessions list → Exercises list
- Timeline progress (current week highlighted)
- History link

#### 4.2.4 HistoryScreen
**Funkcionalnosti:**
- Lista završenih sesija
- Completed date, duration
- Exercises completed
- Statistics (total sets, reps)

---

## 5. GENERATOR KAO "ENGINE"

### 5.1 Generator Position

**Generator je INTERNAL ENGINE, ne UI feature.**

- Generator se poziva IZNALAZ kroz trainer flow
- Client NEMA pristup generatoru
- Generator se koristi za CREATE, ne za EXECUTE

### 5.2 Kada se koristi Auto vs Manual

**Auto Generator:**
- Trainer želi brzo kreirati program
- Standardni ciljevi (hipertrofija, snaga, itd.)
- Trener nema specifične zahtjeve
- Use case: "Kreiraj 8-tjedni program za hipertrofiju, intermediate level"

**Manual Builder:**
- Trainer želi potpunu kontrolu
- Specifični zahtjevi (custom mezociklusi, vježbe)
- Trener ima vlastitu metodologiju
- Use case: "Kreiraj custom program s 2 tjedna volumen, 2 tjedna intenzitet"

**Hybrid:**
- Trener kreira dio ručno, generator popunjava ostatak
- Use case: "Kreiraj prva 2 tjedna ručno, generator popuni ostatak"

### 5.3 Generator Flow Integration

```
ProgramBuilderScreen
  ├─ Mode: Auto
  │   └─ Generator Form → POST /api/training/generate → ProgramDetailScreen
  │
  ├─ Mode: Manual
  │   └─ ManualMesocycleBuilderScreen → Create → ProgramDetailScreen
  │
  └─ Mode: Hybrid
      └─ Create Draft → Fill Gaps → POST /api/training/fill-gaps → ProgramDetailScreen
```

### 5.4 Program Publishing Flow

```
ProgramDetailScreen (draft)
  ├─ Edit (if draft) → ProgramBuilderScreen
  ├─ Publish
  │   ├─ Validate (has mesocycles, sessions, assigned client)
  │   ├─ Update status: draft → active
  │   ├─ Assign to client (client_programs table)
  │   └─ Client gets access
  │
  └─ Delete (if draft) → Confirmation → Delete
```

**Publishing Rules:**
- Program mora imati barem 1 mezociklus
- Program mora imati barem 1 sesiju
- Program mora biti dodijeljen klijentu
- After publish: Program becomes read-only (trainer), executable (client)

---

## 6. CHECKLIST

### 6.1 ZAKLJUČANO (Ne dirati)

- ✅ **PRO Training Generator** (`lib/pro-generator/`)
  - Auto generator logic
  - Manual builder logic
  - Hybrid fill-gaps
  - Exercise library integration
  - Database schema (training_programs, mesocycles, program_sessions, session_exercises)

- ✅ **API Endpoints (Generator)**
  - `POST /api/training/generate`
  - `POST /api/training/manual/*`
  - `POST /api/training/fill-gaps`
  - `GET /api/training/view/[programId]`
  - `GET /api/training/exercises`

- ✅ **Database Schema**
  - `training_programs` (source, status)
  - `mesocycles` (is_manual)
  - `program_sessions` (is_manual)
  - `session_exercises` (is_manual)
  - Migracije su izvršene

---

### 6.2 SLJEDEĆE za Development

#### Phase 1: Authentication & Role Management
- [ ] Implementirati role-based authentication (trainer vs client)
- [ ] Supabase RLS policies za role-based access
- [ ] User roles u `users` ili `clients` tablici

#### Phase 2: Trainer Flow
- [ ] `TrainerDashboardScreen` (programi, statistike, quick actions)
- [ ] `ProgramBuilderScreen` (auto/manual/hybrid mode selector)
- [ ] `ProgramDetailScreen` (pregled, edit if draft, publish)
- [ ] Program status management (draft → active → archived)
- [ ] Client assignment flow (publish → assign to client)

#### Phase 3: Client Flow
- [ ] `ClientDashboardScreen` (aktivni program, today session)
- [ ] `TodaySessionScreen` (execute mode, check-in, complete)
- [ ] `ProgramOverviewScreen` (read-only program view)
- [ ] `HistoryScreen` (completed sessions, statistics)

#### Phase 4: Execution & Logging
- [ ] `workout_logs` tablica (session execution data)
- [ ] `POST /api/training/session/complete` (client executes session)
- [ ] Progress tracking (completed sessions, weeks)

#### Phase 5: API Endpoints (B2B)
- [ ] `GET /api/training/program/my-program` (client's active program)
- [ ] `GET /api/training/program/today-session` (today's session)
- [ ] `POST /api/training/program/publish` (draft → active)
- [ ] `POST /api/clients/*` (client management)
- [ ] Role-based endpoint protection

---

### 6.3 SLJEDEĆE za Pilot s Pravim Trenerom

#### Pre-Pilot Checklist
- [ ] Role-based authentication funkcionalan
- [ ] Trainer može kreirati program (auto/manual/hybrid)
- [ ] Trainer može publish program klijentu
- [ ] Client može vidjeti svoj program
- [ ] Client može execute today session
- [ ] Basic progress tracking (completed sessions)

#### Pilot Test Scenarios
1. **Trainer creates program (auto)**
   - Kreira program za klijenta
   - Publish program
   - Client dobiva pristup

2. **Trainer creates program (manual)**
   - Ručno kreira mezociklus
   - Dodaje sesije i vježbe
   - Publish program

3. **Client executes session**
   - View today session
   - Complete sets
   - Submit session

4. **Progress tracking**
   - Trainer vidi client progress
   - Client vidi svoj progress

#### Pilot Feedback Areas
- Generator output quality (auto mode)
- Manual builder usability
- Client execution flow
- UI/UX za mobile
- Performance (loading times)

---

## 7. PRIORITIZACIJA

### Must Have (MVP)
1. ✅ Generator (ZAKLJUČANO)
2. Role-based authentication
3. Trainer dashboard (programi list)
4. Program builder (auto/manual mode)
5. Program detail (publish flow)
6. Client dashboard (today session)
7. Today session (execute mode)

### Nice to Have (Post-MVP)
- Hybrid mode UI
- Progress analytics
- Client communication (notes, messages)
- Program templates
- Exercise library search/filter UI

### Future (Phase 2+)
- AI chat integration
- Nutrition planning integration
- Advanced analytics
- Multi-client management
- Program marketplace

---

## 8. TECHNICAL NOTES

### 8.1 Database Extensions Needed

**New tables (if not exist):**
- `workout_logs` (session execution data)
  - `session_id`, `client_id`, `completed_at`, `exercises_completed`, `notes`
- `client_programs` (program assignment)
  - `program_id`, `client_id`, `assigned_at`, `status`

**Existing tables (extensions):**
- `training_programs.status` (draft/active/archived) - already exists
- `users.role` (trainer/client) - check if exists

### 8.2 API Security

**Role-based protection:**
- Trainer endpoints: Check `user.role === 'trainer'`
- Client endpoints: Check `user.role === 'client'`
- Program access: Check `client_programs` assignment

**RLS Policies (Supabase):**
- Trainers: Access all programs they created
- Clients: Access only assigned programs

---

## 9. SUCCESS METRICS

### Trainer Metrics
- Programs created per week
- Auto vs Manual usage ratio
- Publish rate (draft → active)

### Client Metrics
- Session completion rate
- Program adherence (completed sessions / total sessions)
- Client retention (active programs)

---

**Dokument kreiran:** Manual Mezocycle Builder je ZAKLJUČAN, ovo je produktni plan za B2B flow.

**Next Step:** Implementacija Phase 1 (Authentication & Role Management)

