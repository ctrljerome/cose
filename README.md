# CHCCI E-Voting System
Concepcion Holy Cross College Inc. — Commission on Student Election (COSE)

> Secure, anonymous, tamper-resistant student election platform.

---

## Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + Vite                   |
| Backend    | Node.js + Express                 |
| Database   | MongoDB Atlas                     |
| Deployment | Render (Backend Web + Static Site)|
| Auth       | JWT (HTTP-only cookies) + Email OTP |
| Encryption | AES-256-CBC (votes at rest)       |
| Hashing    | bcrypt (passwords), SHA-256 (voter identity, IPs) |

---

## Project Structure

```
evoting/
├── backend/
│   ├── models/
│   │   ├── User.js          # Voter/admin model with MFA, risk scoring
│   │   ├── Election.js      # Election lifecycle model
│   │   ├── Candidate.js     # Candidate per position
│   │   ├── Vote.js          # Encrypted, anonymous, immutable votes
│   │   └── AuditLog.js      # Immutable audit trail
│   ├── routes/
│   │   ├── auth.js          # Login, OTP, password management
│   │   ├── votes.js         # Ballot token + submission
│   │   ├── elections.js     # Public election data
│   │   ├── candidates.js    # Candidate data
│   │   ├── admin.js         # Admin management + results
│   │   └── audit.js         # Audit log access
│   ├── middleware/
│   │   ├── auth.js          # JWT protect, RBAC, CSRF
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── email.js         # Nodemailer OTP/reset emails
│   │   └── logger.js        # Winston structured logging
│   ├── seed/
│   │   └── seeder.js        # Seeds students, admins, election, candidates
│   ├── tests/
│   │   └── system.test.js   # Unit + integration tests
│   ├── server.js            # Express app entry
│   ├── .env.example
│   └── render.yaml
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LoginPage.jsx        # Auth entry with editorial design
    │   │   ├── OTPPage.jsx          # 6-digit OTP verification
    │   │   ├── ChangePasswordPage.jsx # Forced first-login reset
    │   │   ├── DashboardPage.jsx    # Student home
    │   │   ├── BallotPage.jsx       # Voting with anti-tampering
    │   │   ├── ResultsPage.jsx      # Published results
    │   │   ├── AdminDashboardPage.jsx # Full admin console
    │   │   └── NotFoundPage.jsx
    │   ├── hooks/
    │   │   ├── useAuth.js           # Auth context + session management
    │   │   └── useSecurity.js       # Anti-tampering hook
    │   ├── utils/
    │   │   └── api.js               # Axios client with CSRF + interceptors
    │   └── styles/
    │       └── globals.css          # Design system CSS variables
    ├── index.html
    ├── vite.config.js
    ├── .env.example
    └── render.yaml
```

---

## Database Schema

### Users
| Field              | Type     | Notes                              |
|--------------------|----------|------------------------------------|
| email              | String   | Unique, institutional domain       |
| password           | String   | bcrypt hashed, hidden by default   |
| role               | String   | student / admin / superadmin       |
| mustChangePassword | Boolean  | Forced on first login              |
| otpCode            | String   | SHA-256 hashed 6-digit code        |
| otpExpires         | Date     | 10-minute expiry                   |
| hasVoted           | Boolean  | One-vote enforcement               |
| votingToken        | String   | Single-use session token (hashed)  |
| riskScore          | Number   | 0–100, auto-escalates on detections|
| isFlagged          | Boolean  | Auto-flagged at risk >= 50         |
| suspiciousEvents   | Array    | DevTools, print, copy events       |

### Elections
| Field     | Type     | Notes                              |
|-----------|----------|------------------------------------|
| title     | String   | Election name                      |
| status    | String   | draft → scheduled → active → closed → results_published |
| positions | Array    | Embedded position definitions      |
| startDate | Date     | Enforced by API                    |
| endDate   | Date     | Must be after startDate            |
| isLocked  | Boolean  | Prevents edits once votes exist    |

### Votes
| Field               | Type   | Notes                                 |
|---------------------|--------|---------------------------------------|
| voterHash           | String | SHA-256(userId + electionId + salt). Unique. Anonymous. |
| ballot              | Array  | Each entry has positionId + AES-256 encrypted candidateId |
| tokenHash           | String | Hashed single-use voting token        |
| ballotHash          | String | SHA-256 of ballot contents for integrity |
| ipHash              | String | Hashed IP (non-reversible)            |

### AuditLog
| Field     | Type   | Notes                               |
|-----------|--------|-------------------------------------|
| category  | String | auth / vote / admin / security / access |
| action    | String | Specific event name                 |
| severity  | String | info / warning / critical           |
| timestamp | Date   | Immutable, never updated            |

---

## API Endpoints

### Auth (`/api/v1/auth`)
| Method | Route                   | Auth    | Description               |
|--------|-------------------------|---------|---------------------------|
| POST   | /login                  | Public  | Email+password → sends OTP |
| POST   | /verify-otp             | Public  | OTP → issues JWT cookie   |
| POST   | /change-password        | JWT     | First-login password reset |
| POST   | /forgot-password        | Public  | Sends reset link           |
| POST   | /reset-password/:token  | Public  | Reset with token           |
| POST   | /logout                 | JWT     | Clears cookies             |
| GET    | /me                     | JWT     | Get current user           |
| POST   | /log-suspicious         | JWT     | Client-side event logging  |

### Elections (`/api/v1/elections`)
| Method | Route            | Auth | Description            |
|--------|------------------|------|------------------------|
| GET    | /active          | JWT  | Get currently active   |
| GET    | /published       | JWT  | Get results-published  |
| GET    | /:id             | JWT  | Get election by ID     |

### Votes (`/api/v1/votes`)
| Method | Route              | Auth    | Description                  |
|--------|--------------------|---------|------------------------------|
| GET    | /token/:electionId | JWT     | Issue single-use voting token |
| POST   | /submit            | JWT     | Submit encrypted ballot       |
| GET    | /status/:electionId| JWT     | Check if user has voted       |

### Admin (`/api/v1/admin`) — requires admin/superadmin role
| Method | Route                          | Description            |
|--------|-------------------------------|------------------------|
| GET    | /stats                         | Dashboard statistics   |
| GET    | /elections                     | List all elections     |
| POST   | /elections                     | Create election        |
| PUT    | /elections/:id/status          | Change election status |
| GET    | /elections/:id/results         | View decrypted results |
| POST   | /elections/:id/publish-results | Publish to students    |
| GET    | /users                         | List voters            |
| PUT    | /users/:id/flag                | Flag/unflag user       |

### Audit (`/api/v1/audit`) — requires admin role
| Method | Route            | Description             |
|--------|------------------|-------------------------|
| GET    | /logs            | Filtered audit log      |
| GET    | /security-alerts | Warning/critical events |

---

## Security Implementation

### Vote Anonymity
1. A `voterHash` is computed as `SHA-256(userId + electionId + serverSecret)` — this prevents linking votes back to individuals while ensuring uniqueness.
2. Candidate IDs inside each ballot are encrypted with **AES-256-CBC** using a per-vote random IV.
3. The raw `userId` is **never stored** in the Vote document.

### Double-Vote Prevention (4 layers)
1. `voterHash` has a unique index in MongoDB — duplicate submissions fail at DB level.
2. `hasVoted` flag checked in middleware before token is issued.
3. Single-use `votingToken` is invalidated immediately after submission.
4. Atomic MongoDB transaction wraps the entire vote submission.

### Anti-Tampering (Client-Side Deterrents)
- **DevTools Detection**: Window size differential + debugger timing trap.
- **Print Block**: CSS `@media print { display: none }` + JS `beforeprint` intercept + Ctrl+P block.
- **Tab Switch Detection**: Page Visibility API + window blur → ballot blurs instantly.
- **Right-Click Block**: `contextmenu` event suppressed on ballot pages.
- **Keyboard Shortcuts**: Ctrl+C, Ctrl+P, Ctrl+S, F12, Ctrl+Shift+I/J/C all suppressed.
- **Dynamic Watermark**: User email + date stamped as a rotating overlay (screenshot deterrent).
- **All events logged**: Suspicious actions call `/api/v1/auth/log-suspicious` → risk score += points → auto-flag at 50+.

### Session Security
- JWT in **HTTP-only, Secure, SameSite=Strict** cookie (not accessible to JS).
- **CSRF token** in non-httpOnly cookie, read by JS and sent as `X-CSRF-Token` header.
- Sessions expire in 2 hours. Re-auth required.

---

## Deployment: Render

### Backend
1. Create a **Web Service** on Render, pointing to `/backend`.
2. Set environment variables from `.env.example`.
3. Generate a 32-byte hex key for `VOTE_ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. After deploy, run seed: connect to shell and `node seed/seeder.js`.

### Frontend
1. Create a **Static Site** on Render, pointing to `/frontend`.
2. Set `VITE_API_URL` to your backend URL.
3. Add rewrite rule: `/* → /index.html` (already in `render.yaml`).

### MongoDB Atlas
1. Create a free cluster.
2. Whitelist Render's outbound IPs (or allow all with `0.0.0.0/0` for dev).
3. Create DB user, copy connection string to `MONGODB_URI`.
4. Enable **Auditing** and **Encryption at Rest** (M10+).

---

## Setup: Local Development

```bash
# Backend
cd backend
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, VOTE_ENCRYPTION_KEY, email settings
npm install
npm run dev        # starts on :5000

# Seed database
npm run seed

# Frontend (separate terminal)
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev        # starts on :3000
```

### Seeded Accounts (default password: `CollegeVote2025!`)

| Email                      | Role       | Notes                    |
|----------------------------|------------|--------------------------|
| admin@chcci.edu.ph          | admin      | No password change req.  |
| superadmin@chcci.edu.ph     | superadmin | No password change req.  |
| juan.dela.cruz@chcci.edu.ph | student    | Must change password     |
| maria.santos@chcci.edu.ph   | student    | Must change password     |
| … (10 students total)      | student    | See seed/seeder.js       |

---

## Run Tests

```bash
cd backend
npm test
```

---

## Security Checklist

- [x] bcrypt password hashing (cost factor 12)
- [x] JWT HTTP-only cookies (not accessible to XSS)
- [x] CSRF double-submit cookie pattern
- [x] Rate limiting on all routes (stricter on auth)
- [x] Account lockout after 5 failed attempts (30 min)
- [x] Email OTP MFA on every login
- [x] Forced first-login password change
- [x] NoSQL injection prevention (mongo-sanitize)
- [x] XSS prevention (Helmet CSP)
- [x] HTTP parameter pollution prevention
- [x] HTTPS enforced (Render provides TLS)
- [x] Vote encryption (AES-256-CBC)
- [x] Anonymous voter hash (SHA-256, non-reversible)
- [x] Immutable votes (pre-save hook blocks updates)
- [x] Immutable audit logs (hook blocks updates)
- [x] Double-vote prevention (unique DB constraint + token + middleware)
- [x] Atomic vote transactions (MongoDB session)
- [x] Risk scoring + auto-flagging
- [x] Admin-only result access until published
- [x] Ballot receipt hash for voter verification

---

*SUFFRAGE — Because every vote deserves to be counted.*
