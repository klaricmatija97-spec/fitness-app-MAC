# Mobile Trainer Flow - MVP

**Status:** MVP UI Flow Definition (Logic & Data Focus)

---

## 1. TRAINER HOME SCREEN

### Purpose
- Pregled svih klijenata
- Status programa po klijentu
- Quick actions

### Data Structure

```typescript
interface TrainerHomeData {
  clients: ClientSummary[];
  stats: {
    totalClients: number;
    activePrograms: number;
    draftPrograms: number;
    needsAttention: number;
  };
}

interface ClientSummary {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  currentProgram: {
    id: string;
    name: string;
    status: 'draft' | 'active' | 'archived';
    adherence: number; // 0-100
    lastSessionDate?: string; // ISO date
    needsAttention: boolean; // true if adherence < 70% or no session in 7 days
  } | null;
}
```

### Screen Logic

**Load:**
1. Fetch `GET /api/trainer/clients`
2. Calculate `needsAttention` flag:
   - `adherence < 70%` OR
   - `lastSessionDate` > 7 days ago OR
   - No program assigned

**Actions:**
- Tap client → Navigate to `TrainerClientDetailScreen`
- Tap "New Client" → Create client flow
- Tap "New Program" → Navigate to `TrainerProgramBuilderScreen`

**Display:**
- List of clients with status badges
- Sort: `needsAttention` first, then by name
- Filter: All / Active / Needs Attention

---

## 2. TRAINER PROGRAM BUILDER SCREEN

### Purpose
- Multi-step form za kreiranje programa
- Auto generator integration
- Preview i override
- Publish flow

### Step 1: Basic Configuration

**Form Fields:**
- `clientId` (selected from clients list)
- `goal` (hipertrofija, maksimalna_snaga, misicna_izdrzljivost, rekreacija_zdravlje)
- `level` (pocetnik, srednji, napredni)
- `splitType` (full_body, upper_lower, push_pull_legs, bro_split)
- `durationWeeks` (4-52)
- `sessionsPerWeek` (2-6)

**Validation:**
- All fields required
- `durationWeeks` >= 4
- `sessionsPerWeek` >= 2

**Next:** Proceed to Step 2

---

### Step 2: Focus & Equipment

**Form Fields:**
- `availableEquipment` (multi-select: barbell, dumbbell, machine, bodyweight, cable, smith)
- `focusedMuscleGroups` (multi-select: chest, back, legs, shoulders, arms, core)
- `avoidExercises` (optional: array of exercise IDs to exclude)
- `injuries` (optional: array of injury descriptions)

**Next:** Generate preview (Step 3)

---

### Step 3: Generate Preview

**Action:**
- Call `POST /api/training/generate` with form data
- Show loading state
- Display generated program (read-only)

**Display:**
- Program summary:
  - Total mesocycles
  - Total sessions
  - Total exercises
- Mesocycles list (expandable):
  - Name, type, duration
  - Sessions count
- Sessions preview (first week only):
  - Day, exercises count

**Actions:**
- "Generate Again" → Regenerate with same params
- "Edit" → Go to Step 4 (Override)
- "Publish" → Go to Step 5 (Publish)

---

### Step 4: Override (Optional)

**Purpose:**
- Replace specific exercises
- Lock specific exercises (prevent auto-changes)
- Adjust sets/reps for specific exercises

**Display:**
- Full program tree (mesocycles → sessions → exercises)
- Each exercise has:
  - Lock toggle
  - Replace button
  - Edit button (sets/reps/tempo/rest)

**Actions:**
- **Lock Exercise:** `POST /api/training/exercise/:id/lock`
- **Replace Exercise:** 
  1. Show exercise library modal
  2. Select replacement
  3. `POST /api/training/exercise/:id/replace`
- **Edit Exercise:** 
  1. Show edit modal
  2. Update sets/reps/tempo/rest
  3. `PATCH /api/training/exercise/:id`

**Save:** Changes saved to draft program
**Next:** Proceed to Step 5 (Publish)

---

### Step 5: Publish

**Validation:**
- Program has at least 1 mesocycle
- Program has at least 1 session
- Client is assigned

**Action:**
- Call `POST /api/trainer/program/:id/publish`
- Update program status: `draft` → `active`
- Assign to client

**Success:**
- Show success message
- Navigate to `TrainerClientDetailScreen` (client)

**Error Handling:**
- Show validation errors
- Allow retry

---

## 3. TRAINER CLIENT DETAIL SCREEN

### Purpose
- Client program overview
- Adherence tracking
- Flagged exercises
- Quick actions

### Data Structure

```typescript
interface ClientDetailData {
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  program: {
    id: string;
    name: string;
    status: 'draft' | 'active' | 'archived';
    startDate: string;
    endDate: string;
    currentWeek: number;
    totalWeeks: number;
  };
  adherence: {
    percentage: number; // 0-100
    completedSessions: number;
    totalSessions: number;
    lastSessionDate?: string;
    streak: number; // consecutive days
  };
  flaggedExercises: FlaggedExercise[];
  recentSessions: SessionSummary[];
}

interface FlaggedExercise {
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  sessionName: string;
  weekNumber: number;
  reason: 'pain' | 'difficulty' | 'skipped' | 'substitution';
  notes?: string;
  reportedAt: string;
}

interface SessionSummary {
  id: string;
  date: string;
  name: string;
  status: 'completed' | 'skipped' | 'partial';
  exercisesCompleted: number;
  totalExercises: number;
  duration?: number; // minutes
}
```

### Screen Sections

**1. Client Info Card**
- Name, email, avatar
- Program status badge

**2. Adherence Card**
- Percentage (large number)
- Progress bar
- Completed / Total sessions
- Last session date
- Streak indicator

**3. Flagged Exercises**
- List of exercises with issues
- Reason badge (pain, difficulty, skipped)
- Tap → Show details modal
- Action: "Replace Exercise" or "Mark Resolved"

**4. Recent Sessions**
- Last 5 sessions
- Status badges
- Tap → Show session details

**5. Quick Actions**
- "Regenerate Next Week" (if program active)
- "Edit Program" (if draft)
- "Archive Program" (if active)

---

### Actions

**Regenerate Next Week:**
1. Show confirmation
2. Call `POST /api/trainer/program/:id/regenerate-week`
3. Preview changes
4. Confirm → Apply changes

**Edit Program:**
- Navigate to `TrainerProgramBuilderScreen` (edit mode)
- Load existing program data
- Allow modifications

**Archive Program:**
1. Show confirmation
2. Call `POST /api/trainer/program/:id/archive`
3. Update status: `active` → `archived`

---

## 4. NAVIGATION FLOW

```
TrainerHomeScreen
  ├─ Tap Client → TrainerClientDetailScreen
  ├─ Tap "New Client" → CreateClientScreen
  └─ Tap "New Program" → TrainerProgramBuilderScreen
      ├─ Step 1: Basic Config
      ├─ Step 2: Focus & Equipment
      ├─ Step 3: Generate Preview
      ├─ Step 4: Override (optional)
      └─ Step 5: Publish → TrainerClientDetailScreen
```

---

## 5. STATE MANAGEMENT

### Cache Strategy

**Trainer Home:**
- Cache: `clients` list (5 min TTL)
- Refetch: On screen focus, pull-to-refresh
- Invalidate: After client creation, program publish

**Program Builder:**
- No cache (form state only)
- Clear on navigation away

**Client Detail:**
- Cache: `clientDetail` (2 min TTL)
- Refetch: On screen focus, pull-to-refresh
- Invalidate: After program publish, session complete

### Data Flow

```
API Call → Response → Normalize → Store in State → Display
                ↓
         Cache (if applicable)
                ↓
         Invalidate on mutations
```

---

## 6. ERROR HANDLING

**Network Errors:**
- Show retry button
- Display user-friendly message

**Validation Errors:**
- Show inline errors
- Highlight invalid fields

**Generator Errors:**
- Show error message
- Allow "Generate Again"
- Fallback: Manual builder option

---

## 7. LOADING STATES

**Trainer Home:**
- Skeleton loaders for client list
- Pull-to-refresh indicator

**Program Builder:**
- Step 3: Full-screen loading (generating program)
- Step 4: Per-exercise loading (replace/edit)

**Client Detail:**
- Skeleton loaders for cards
- Pull-to-refresh indicator

---

## 8. MVP LIMITATIONS (INTENTIONAL)

**Not Included:**
- ❌ Notifications
- ❌ Chat/messaging
- ❌ Video instructions
- ❌ Marketplace
- ❌ Analytics dashboard
- ❌ Export/import

**Included:**
- ✅ Basic adherence tracking
- ✅ Flagged exercises
- ✅ Program generation
- ✅ Exercise override
- ✅ Publish flow

---

## 9. SUCCESS METRICS

**Trainer Engagement:**
- Programs created per week
- Publish rate (draft → active)
- Override usage (manual adjustments)

**Client Engagement:**
- Adherence percentage
- Session completion rate
- Flagged exercises count

---

**Next Step:** Implement API endpoints with mobile-friendly JSON contracts.

