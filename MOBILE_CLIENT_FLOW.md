# Mobile Client Flow - MVP

**Status:** MVP UI Flow Definition (Logic & Data Focus)

---

## 1. CLIENT HOME SCREEN

### Purpose
- Today's workout session
- Program status
- Quick progress overview

### Data Structure

```typescript
interface ClientHomeData {
  program: {
    id: string;
    name: string;
    status: 'active' | 'archived';
    currentWeek: number;
    totalWeeks: number;
    startDate: string;
    endDate: string;
  } | null;
  todaySession: {
    id: string;
    name: string;
    weekNumber: number;
    dayOfWeek: number;
    estimatedDuration: number; // minutes
    exercisesCount: number;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
  } | null;
  progress: {
    adherence: number; // 0-100
    completedSessions: number;
    totalSessions: number;
    currentWeek: number;
    streak: number; // consecutive days
  };
}
```

### Screen Logic

**Load:**
1. Fetch `GET /api/client/today`
2. Check if program exists
3. Check if today session exists

**States:**

**No Program:**
- Display: "Nema aktivnog programa"
- Message: "Kontaktirajte trenera"

**Has Program, No Today Session:**
- Display: "Nema treninga za danas"
- Show: Rest day message or program overview

**Has Today Session:**
- Display: Today session card
- Status badge (pending/in_progress/completed/skipped)
- CTA: "Start Workout" or "Continue Workout"

**Actions:**
- Tap "Start Workout" → Navigate to `WorkoutSessionScreen`
- Tap "Program Overview" → Navigate to `ProgressScreen`
- Pull-to-refresh → Refetch data

---

## 2. WORKOUT SESSION SCREEN

### Purpose
- Execute today's workout
- Log sets, reps, load, RIR
- Report pain/difficulty
- Complete session

### Data Structure

```typescript
interface WorkoutSessionData {
  session: {
    id: string;
    name: string;
    weekNumber: number;
    dayOfWeek: number;
    estimatedDuration: number;
    exercises: WorkoutExercise[];
  };
  startedAt: string;
}

interface WorkoutExercise {
  id: string; // session_exercise id
  exerciseId: string; // exercise library id
  name: string;
  nameHr: string;
  orderIndex: number;
  sets: number;
  repsTarget: string; // "8-12" or "5"
  tempo?: string; // "3-1-2-0"
  restSeconds: number;
  targetRPE?: number;
  targetRIR?: number;
  primaryMuscles: string[];
  equipment?: string;
  // Execution data (filled during workout)
  completedSets: CompletedSet[];
  painReported: boolean;
  difficultyReported: boolean;
  notes?: string;
  substituted?: boolean;
  substituteExerciseId?: string;
}

interface CompletedSet {
  setNumber: number;
  reps: number;
  load?: number; // kg
  rir?: number; // Reps In Reserve
  rpe?: number; // Rate of Perceived Exertion
  completed: boolean;
  restStartTime?: string; // ISO timestamp
}
```

### Screen Logic

**Load:**
1. Fetch `GET /api/client/session/:sessionId`
2. Initialize `completedSets` array (empty)
3. Set `startedAt` timestamp

**Display:**
- Session header (name, week, day)
- Exercises list (scrollable)
- Each exercise shows:
  - Name, sets, reps target
  - Sets checklist (expandable)
  - Rest timer (if set completed)
  - Pain/Difficulty buttons
  - Notes field

**Exercise Set Input:**
- Tap set → Expand set input
- Fields:
  - Reps (number input)
  - Load (kg, optional)
  - RIR (0-10, optional)
  - RPE (1-10, optional)
- Save set → Mark as completed
- Start rest timer (if rest > 0)

**Pain/Difficulty Reporting:**
- Tap "Pain" button → Show modal:
  - Pain level (1-10)
  - Location (body part)
  - Notes
  - Action: "Skip Exercise" or "Continue"
- Tap "Difficulty" button → Show modal:
  - Difficulty level (too easy / too hard)
  - Notes
  - Action: "Substitute Exercise" or "Continue"

**Exercise Substitution:**
- Show exercise library (filtered by muscle group)
- Select substitute
- Replace exercise in session (temporary, not saved to program)

**Complete Session:**
- Validate: All sets completed (or skipped)
- Show summary:
  - Total exercises
  - Total sets
  - Duration
  - Pain/difficulty flags
- Call `POST /api/client/session/:sessionId/complete`
- Navigate back to `ClientHomeScreen`

**Save Progress:**
- Auto-save on set completion (local state)
- Sync to server on session complete
- Allow resume if session incomplete

---

## 3. PROGRESS SCREEN

### Purpose
- Program overview (read-only)
- Basic charts
- Session history

### Data Structure

```typescript
interface ProgressData {
  program: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    currentWeek: number;
    totalWeeks: number;
  };
  adherence: {
    percentage: number;
    completedSessions: number;
    totalSessions: number;
    byWeek: WeekAdherence[];
  };
  volume: {
    totalSets: number;
    totalReps: number;
    byWeek: WeekVolume[];
  };
  recentSessions: SessionHistory[];
}

interface WeekAdherence {
  weekNumber: number;
  completed: number;
  total: number;
  percentage: number;
}

interface WeekVolume {
  weekNumber: number;
  totalSets: number;
  totalReps: number;
}

interface SessionHistory {
  id: string;
  date: string;
  name: string;
  status: 'completed' | 'skipped' | 'partial';
  exercisesCount: number;
  duration?: number;
}
```

### Screen Sections

**1. Program Overview Card**
- Program name
- Current week / Total weeks
- Progress bar (weeks)
- Start/End dates

**2. Adherence Chart**
- Simple bar chart (weeks)
- Percentage per week
- Overall percentage

**3. Volume Chart**
- Simple line chart (weeks)
- Total sets per week
- Total reps per week

**4. Recent Sessions**
- Last 10 sessions
- Status badges
- Date, duration
- Tap → Show session details (read-only)

---

### Actions

**View Session Details:**
- Show session exercises (read-only)
- Show completed sets
- Show notes/pain reports

**No Actions:**
- Read-only screen
- No edit capabilities

---

## 4. NAVIGATION FLOW

```
ClientHomeScreen
  ├─ Tap "Start Workout" → WorkoutSessionScreen
  │   └─ Complete → ClientHomeScreen
  └─ Tap "Program Overview" → ProgressScreen
      └─ Tap Session → SessionDetailsScreen (read-only)
```

---

## 5. STATE MANAGEMENT

### Cache Strategy

**Client Home:**
- Cache: `todaySession` (1 min TTL)
- Refetch: On screen focus, pull-to-refresh
- Invalidate: After session complete

**Workout Session:**
- No cache (local state only)
- Auto-save progress (localStorage)
- Clear on session complete

**Progress:**
- Cache: `progressData` (5 min TTL)
- Refetch: On screen focus, pull-to-refresh
- Invalidate: After session complete

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
- Allow offline mode (cached data)

**Session Errors:**
- Show error message
- Allow retry
- Save progress locally (resume later)

**Validation Errors:**
- Show inline errors
- Highlight invalid fields
- Prevent completion until valid

---

## 7. LOADING STATES

**Client Home:**
- Skeleton loaders for cards
- Pull-to-refresh indicator

**Workout Session:**
- Skeleton loaders for exercises
- Loading on set save
- Loading on session complete

**Progress:**
- Skeleton loaders for charts
- Pull-to-refresh indicator

---

## 8. MVP LIMITATIONS (INTENTIONAL)

**Not Included:**
- ❌ Notifications
- ❌ Chat with trainer
- ❌ Video instructions
- ❌ Social features
- ❌ Advanced analytics
- ❌ Nutrition tracking

**Included:**
- ✅ Today session execution
- ✅ Set/reps/load logging
- ✅ Pain/difficulty reporting
- ✅ Basic progress tracking
- ✅ Session history

---

## 9. SUCCESS METRICS

**Client Engagement:**
- Session completion rate
- Adherence percentage
- Average session duration
- Pain/difficulty reports

**Program Effectiveness:**
- Exercise substitution rate
- Pain reports frequency
- Completion rate by exercise type

---

## 10. OFFLINE SUPPORT (FUTURE)

**Current MVP:**
- No offline support
- Requires internet connection

**Future Enhancement:**
- Cache today session locally
- Allow workout execution offline
- Sync on connection restore

---

**Next Step:** Implement API endpoints with mobile-friendly JSON contracts.

