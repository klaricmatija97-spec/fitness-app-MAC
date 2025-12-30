# API Mobile Contract - MVP

**Status:** Mobile-Friendly JSON Response Shapes

**Principles:**
- Flat structure (minimal nesting)
- Mobile-friendly (small payloads)
- Consistent error format
- Pagination where needed

---

## 1. TRAINER ENDPOINTS

### GET /api/trainer/clients

**Purpose:** Fetch all clients with program status

**Request:**
```
GET /api/trainer/clients
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "avatar": "https://...",
        "currentProgram": {
          "id": "uuid",
          "name": "Hipertrofija - Upper/Lower",
          "status": "active",
          "adherence": 85,
          "lastSessionDate": "2024-01-15T10:00:00Z",
          "needsAttention": false
        }
      }
    ],
    "stats": {
      "totalClients": 10,
      "activePrograms": 8,
      "draftPrograms": 2,
      "needsAttention": 1
    }
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

---

### GET /api/trainer/program/:id

**Purpose:** Fetch program details for trainer

**Request:**
```
GET /api/trainer/program/:id
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "program": {
      "id": "uuid",
      "name": "Hipertrofija - Upper/Lower",
      "status": "draft",
      "goal": "hypertrophy",
      "level": "intermediate",
      "splitType": "upper_lower",
      "durationWeeks": 8,
      "sessionsPerWeek": 4,
      "startDate": "2024-01-01",
      "endDate": "2024-02-26",
      "clientId": "uuid",
      "clientName": "John Doe"
    },
    "mesocycles": [
      {
        "id": "uuid",
        "name": "Akumulacija",
        "type": "volume",
        "weekStart": 1,
        "weekEnd": 4,
        "orderIndex": 1,
        "isManual": false
      }
    ],
    "sessions": [
      {
        "id": "uuid",
        "mesocycleId": "uuid",
        "weekNumber": 1,
        "dayOfWeek": 1,
        "name": "Upper A",
        "exercisesCount": 8,
        "isManual": false
      }
    ],
    "exercises": [
      {
        "id": "uuid",
        "sessionId": "uuid",
        "exerciseId": "bench_press",
        "name": "Bench Press",
        "nameHr": "Potisak s klupe",
        "orderIndex": 1,
        "sets": 4,
        "repsTarget": "8-12",
        "tempo": "3-1-2-0",
        "restSeconds": 120,
        "targetRPE": 8,
        "targetRIR": 2,
        "isLocked": false,
        "isManual": false
      }
    ]
  }
}
```

**Note:** Flat structure - no deep nesting. Client can reconstruct tree if needed.

---

### POST /api/trainer/program/:id/publish

**Purpose:** Publish draft program to client

**Request:**
```
POST /api/trainer/program/:id/publish
Headers: Authorization: Bearer <token>
Body: {
  "clientId": "uuid" // optional if already assigned
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "programId": "uuid",
    "status": "active",
    "publishedAt": "2024-01-15T10:00:00Z",
    "clientId": "uuid"
  }
}
```

**Error (Validation):**
```json
{
  "success": false,
  "error": "Program validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "mesocycles",
      "message": "Program must have at least 1 mesocycle"
    }
  ]
}
```

---

### POST /api/trainer/program/:id/regenerate-week

**Purpose:** Regenerate specific week of program

**Request:**
```
POST /api/trainer/program/:id/regenerate-week
Headers: Authorization: Bearer <token>
Body: {
  "weekNumber": 5,
  "preserveManual": true // Don't overwrite manual exercises
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "weekNumber": 5,
    "sessionsUpdated": 4,
    "exercisesUpdated": 32,
    "preview": {
      "sessions": [...],
      "exercises": [...]
    }
  }
}
```

---

### GET /api/trainer/client/:id

**Purpose:** Fetch client detail with adherence

**Request:**
```
GET /api/trainer/client/:id
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "client": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatar": "https://..."
    },
    "program": {
      "id": "uuid",
      "name": "Hipertrofija - Upper/Lower",
      "status": "active",
      "startDate": "2024-01-01",
      "endDate": "2024-02-26",
      "currentWeek": 3,
      "totalWeeks": 8
    },
    "adherence": {
      "percentage": 85,
      "completedSessions": 17,
      "totalSessions": 20,
      "lastSessionDate": "2024-01-15T10:00:00Z",
      "streak": 5
    },
    "flaggedExercises": [
      {
        "exerciseId": "uuid",
        "exerciseName": "Bench Press",
        "sessionId": "uuid",
        "sessionName": "Upper A",
        "weekNumber": 2,
        "reason": "pain",
        "notes": "Shoulder pain during movement",
        "reportedAt": "2024-01-10T14:30:00Z"
      }
    ],
    "recentSessions": [
      {
        "id": "uuid",
        "date": "2024-01-15T10:00:00Z",
        "name": "Upper A",
        "status": "completed",
        "exercisesCompleted": 8,
        "totalExercises": 8,
        "duration": 65
      }
    ]
  }
}
```

---

## 2. CLIENT ENDPOINTS

### GET /api/client/today

**Purpose:** Fetch today's session and progress

**Request:**
```
GET /api/client/today
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "program": {
      "id": "uuid",
      "name": "Hipertrofija - Upper/Lower",
      "status": "active",
      "currentWeek": 3,
      "totalWeeks": 8,
      "startDate": "2024-01-01",
      "endDate": "2024-02-26"
    },
    "todaySession": {
      "id": "uuid",
      "name": "Upper A",
      "weekNumber": 3,
      "dayOfWeek": 1,
      "estimatedDuration": 60,
      "exercisesCount": 8,
      "status": "pending",
      "startedAt": null,
      "completedAt": null
    },
    "progress": {
      "adherence": 85,
      "completedSessions": 17,
      "totalSessions": 20,
      "currentWeek": 3,
      "streak": 5
    }
  }
}
```

**No Program:**
```json
{
  "success": true,
  "data": {
    "program": null,
    "todaySession": null,
    "progress": null
  }
}
```

---

### GET /api/client/session/:sessionId

**Purpose:** Fetch session details for workout execution

**Request:**
```
GET /api/client/session/:sessionId
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "name": "Upper A",
      "weekNumber": 3,
      "dayOfWeek": 1,
      "estimatedDuration": 60,
      "exercises": [
        {
          "id": "uuid",
          "exerciseId": "bench_press",
          "name": "Bench Press",
          "nameHr": "Potisak s klupe",
          "orderIndex": 1,
          "sets": 4,
          "repsTarget": "8-12",
          "tempo": "3-1-2-0",
          "restSeconds": 120,
          "targetRPE": 8,
          "targetRIR": 2,
          "primaryMuscles": ["chest", "triceps"],
          "equipment": "barbell"
        }
      ]
    }
  }
}
```

**Note:** No execution data in response - client maintains local state.

---

### POST /api/client/session/:sessionId/complete

**Purpose:** Complete workout session

**Request:**
```
POST /api/client/session/:sessionId/complete
Headers: Authorization: Bearer <token>
Body: {
  "startedAt": "2024-01-15T10:00:00Z",
  "completedAt": "2024-01-15T11:05:00Z",
  "exercises": [
    {
      "exerciseId": "uuid",
      "completedSets": [
        {
          "setNumber": 1,
          "reps": 10,
          "load": 80,
          "rir": 2,
          "rpe": 8
        }
      ],
      "painReported": false,
      "difficultyReported": false,
      "notes": "",
      "substituted": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "completedAt": "2024-01-15T11:05:00Z",
    "duration": 65,
    "exercisesCompleted": 8,
    "totalExercises": 8,
    "adherence": 85
  }
}
```

**Error (Validation):**
```json
{
  "success": false,
  "error": "Session validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "exercises",
      "message": "At least one exercise must be completed"
    }
  ]
}
```

---

### GET /api/client/progress

**Purpose:** Fetch progress data for charts

**Request:**
```
GET /api/client/progress
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "program": {
      "id": "uuid",
      "name": "Hipertrofija - Upper/Lower",
      "startDate": "2024-01-01",
      "endDate": "2024-02-26",
      "currentWeek": 3,
      "totalWeeks": 8
    },
    "adherence": {
      "percentage": 85,
      "completedSessions": 17,
      "totalSessions": 20,
      "byWeek": [
        {
          "weekNumber": 1,
          "completed": 4,
          "total": 4,
          "percentage": 100
        },
        {
          "weekNumber": 2,
          "completed": 3,
          "total": 4,
          "percentage": 75
        }
      ]
    },
    "volume": {
      "totalSets": 340,
      "totalReps": 3400,
      "byWeek": [
        {
          "weekNumber": 1,
          "totalSets": 120,
          "totalReps": 1200
        }
      ]
    },
    "recentSessions": [
      {
        "id": "uuid",
        "date": "2024-01-15T10:00:00Z",
        "name": "Upper A",
        "status": "completed",
        "exercisesCount": 8,
        "duration": 65
      }
    ]
  }
}
```

---

## 3. SHARED ENDPOINTS

### GET /api/training/exercises

**Purpose:** Fetch exercise library (used by trainer for substitution)

**Request:**
```
GET /api/training/exercises?equipment=barbell&muscleGroup=chest&limit=50
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exercises": [
      {
        "id": "bench_press",
        "name": "Bench Press",
        "nameHr": "Potisak s klupe",
        "primaryMuscles": ["chest", "triceps"],
        "secondaryMuscles": ["shoulders"],
        "equipment": "barbell",
        "level": "intermediate",
        "mechanic": "compound"
      }
    ],
    "count": 50,
    "filters": {
      "equipment": "barbell",
      "muscleGroup": "chest",
      "limit": 50
    }
  }
}
```

---

## 4. ERROR FORMAT

**Standard Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error"
    }
  ]
}
```

**Error Codes:**
- `UNAUTHORIZED` - Invalid or missing token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Request validation failed
- `SERVER_ERROR` - Internal server error

---

## 5. PAGINATION

**Pagination Headers:**
```
X-Total-Count: 100
X-Page: 1
X-Per-Page: 20
X-Total-Pages: 5
```

**Pagination Query:**
```
GET /api/trainer/clients?page=1&perPage=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 6. CACHING HEADERS

**Cache-Control:**
- Public data: `Cache-Control: public, max-age=300` (5 min)
- Private data: `Cache-Control: private, max-age=60` (1 min)
- No cache: `Cache-Control: no-cache`

**ETag Support:**
- Include `ETag` header for cache validation
- Client sends `If-None-Match` for conditional requests

---

## 7. MOBILE OPTIMIZATIONS

**Response Size:**
- Limit array sizes (max 50 items per response)
- Use pagination for large lists
- Exclude unnecessary fields

**Compression:**
- Enable gzip compression
- Minify JSON responses

**Rate Limiting:**
- 100 requests per minute per user
- 429 status code on limit exceeded

---

## 8. AUTHENTICATION

**Token Format:**
```
Authorization: Bearer <jwt_token>
```

**Token Claims:**
```json
{
  "userId": "uuid",
  "role": "trainer" | "client",
  "exp": 1234567890
}
```

**Token Refresh:**
- Access token: 1 hour expiry
- Refresh token: 7 days expiry
- Endpoint: `POST /api/auth/refresh`

---

**Next Step:** Implement API endpoints following this contract.

