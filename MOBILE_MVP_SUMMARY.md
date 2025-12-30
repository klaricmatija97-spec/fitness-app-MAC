# Mobile MVP Summary - Trainer & Client Experience

**Status:** Documentation Complete, Ready for Implementation

---

## 📋 DOKUMENTACIJA

### 1. MOBILE_TRAINER_FLOW.md
- TrainerHomeScreen (clients list, status)
- TrainerProgramBuilderScreen (5-step flow)
- TrainerClientDetailScreen (adherence, flagged exercises)

### 2. MOBILE_CLIENT_FLOW.md
- ClientHomeScreen (today session, progress)
- WorkoutSessionScreen (execute workout, log data)
- ProgressScreen (charts, history)

### 3. API_MOBILE_CONTRACT.md
- Trainer endpoints (clients, programs, publish)
- Client endpoints (today, session, progress)
- Mobile-friendly JSON shapes

---

## 🎯 KLJUČNE ODLUKE

### Generator kao Engine
- ✅ Generator je INTERNAL (ne UI feature)
- ✅ Trainer poziva generator kroz Program Builder
- ✅ Client NEMA pristup generatoru
- ✅ Generator se koristi za CREATE, ne za EXECUTE

### Mobile-First Approach
- ✅ Flat JSON strukture (minimal nesting)
- ✅ Small payloads (max 50 items per response)
- ✅ Pagination za velike liste
- ✅ Cache-friendly headers

### MVP Limitations (Intentional)
- ❌ No notifications
- ❌ No chat/messaging
- ❌ No video instructions
- ❌ No marketplace
- ✅ Basic adherence tracking
- ✅ Flagged exercises
- ✅ Program generation
- ✅ Exercise override

---

## 📱 SCREEN FLOW

### Trainer Flow
```
TrainerHomeScreen
  ├─ Client List (status badges)
  ├─ Tap Client → TrainerClientDetailScreen
  └─ Tap "New Program" → TrainerProgramBuilderScreen
      ├─ Step 1: Basic Config
      ├─ Step 2: Focus & Equipment
      ├─ Step 3: Generate Preview
      ├─ Step 4: Override (optional)
      └─ Step 5: Publish → TrainerClientDetailScreen
```

### Client Flow
```
ClientHomeScreen
  ├─ Today Session Card
  ├─ Tap "Start Workout" → WorkoutSessionScreen
  │   └─ Complete → ClientHomeScreen
  └─ Tap "Program Overview" → ProgressScreen
      └─ Read-only charts & history
```

---

## 🔌 API ENDPOINTS

### Trainer
- `GET /api/trainer/clients` - Clients list with status
- `GET /api/trainer/program/:id` - Program details
- `POST /api/trainer/program/:id/publish` - Publish program
- `GET /api/trainer/client/:id` - Client detail with adherence
- `POST /api/trainer/program/:id/regenerate-week` - Regenerate week

### Client
- `GET /api/client/today` - Today session & progress
- `GET /api/client/session/:sessionId` - Session details
- `POST /api/client/session/:sessionId/complete` - Complete session
- `GET /api/client/progress` - Progress data for charts

### Shared
- `GET /api/training/exercises` - Exercise library

---

## 💾 STATE MANAGEMENT

### Cache Strategy
- **Trainer Home:** 5 min TTL, invalidate on mutations
- **Client Home:** 1 min TTL, invalidate on session complete
- **Progress:** 5 min TTL, invalidate on session complete
- **Workout Session:** No cache (local state only)

### Data Flow
```
API Call → Response → Normalize → Store → Display
                ↓
         Cache (if applicable)
                ↓
         Invalidate on mutations
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: API Endpoints
- [ ] `GET /api/trainer/clients`
- [ ] `GET /api/trainer/program/:id`
- [ ] `POST /api/trainer/program/:id/publish`
- [ ] `GET /api/trainer/client/:id`
- [ ] `GET /api/client/today`
- [ ] `GET /api/client/session/:sessionId`
- [ ] `POST /api/client/session/:sessionId/complete`
- [ ] `GET /api/client/progress`

### Phase 2: Trainer Screens
- [ ] TrainerHomeScreen
- [ ] TrainerProgramBuilderScreen (5 steps)
- [ ] TrainerClientDetailScreen

### Phase 3: Client Screens
- [ ] ClientHomeScreen
- [ ] WorkoutSessionScreen
- [ ] ProgressScreen

### Phase 4: Integration
- [ ] State management setup
- [ ] API client integration
- [ ] Error handling
- [ ] Loading states
- [ ] Cache implementation

---

## 🚀 NEXT STEPS

1. **Implement API Endpoints**
   - Follow `API_MOBILE_CONTRACT.md`
   - Use existing generator (don't modify)
   - Add role-based access control

2. **Implement Trainer Screens**
   - Follow `MOBILE_TRAINER_FLOW.md`
   - Use existing ManualMesocycleBuilderScreen
   - Integrate with API

3. **Implement Client Screens**
   - Follow `MOBILE_CLIENT_FLOW.md`
   - Focus on workout execution
   - Basic progress tracking

4. **Testing**
   - Test complete flow (trainer → client)
   - Test error handling
   - Test offline scenarios (future)

---

## 📊 SUCCESS METRICS

### Trainer Metrics
- Programs created per week
- Publish rate (draft → active)
- Override usage (manual adjustments)

### Client Metrics
- Session completion rate
- Adherence percentage
- Pain/difficulty reports

---

## 🔒 SECURITY

### Role-Based Access
- Trainer: Full access to generator, all programs
- Client: Read-only program, execute sessions only

### API Security
- JWT tokens with role claims
- RLS policies in Supabase
- Endpoint-level role checks

---

## 📝 NOTES

- **Generator is LOCKED** - Don't modify generator logic
- **Mobile-First** - All APIs optimized for mobile
- **MVP Focus** - Intentional limitations for speed
- **Pilot Ready** - Designed for real trainer testing

---

**Status:** Documentation complete. Ready for implementation.

**Next:** Implement API endpoints following `API_MOBILE_CONTRACT.md`

