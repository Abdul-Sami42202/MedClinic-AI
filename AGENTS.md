# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
AI Clinic Management + Smart Diagnosis SaaS — a multi-page vanilla JavaScript app using Vite, Firebase (Auth + Firestore), Groq AI, and jsPDF. Supports 4 roles: Admin, Doctor, Receptionist, Patient.

## Build & Dev Commands
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

## Environment Variables
All client-side env vars use the `VITE_` prefix (Vite convention). The `.env` file contains:
- `VITE_FIREBASE_*` — Firebase project configuration (Auth, Firestore)
- `VITE_GROQ_API_KEY` — Groq API key for AI features (llama-3.3-70b-versatile model)

AI features gracefully degrade if the Groq key is missing or invalid.

## Architecture
**Multi-page Vite app** with 4 HTML entry points defined in `vite.config.js`:
- `index.html` — Landing page (static)
- `signin.html` / `signup.html` — Auth pages (both use `src/auth.js`)
- `dashboard.html` — Main app (uses hash-based routing within a single page)

**Dashboard routing:** The sidebar changes `window.location.hash` (e.g. `#patients`, `#appointments`). `src/dashboard.js` listens for `hashchange` and calls the appropriate render function from feature modules. URL params are passed via hash (e.g. `#patient-profile?id=abc123`).

**Module pattern:** Each feature area is a separate JS module exporting async render functions that take a `container` DOM element and `userData` object:
- `src/patients.js` — Patient CRUD, search, profile with medical history timeline
- `src/appointments.js` — Booking, status management, schedule view
- `src/prescriptions.js` — Prescription CRUD, dynamic medicine rows, jsPDF PDF generation
- `src/ai.js` — Groq API calls for symptom analysis, prescription explanation, risk flagging
- `src/analytics.js` — Admin/Doctor analytics with CSS bar charts
- `src/subscription.js` — SaaS plan simulation, user management, feature gating

**Shared modules:**
- `src/Firebase.js` — All Firebase init, auth functions, and Firestore CRUD helpers for 5 collections (users, patients, appointments, prescriptions, diagnosisLogs)
- `src/utils.js` — Toast notifications, modal system, form validation, date formatting, SVG icons, badge helpers
- `src/styles.css` — Complete stylesheet (CSS variables, components, responsive)

## Firestore Collections
- **users** — keyed by Firebase Auth UID; fields: name, email, role, plan, createdAt
- **patients** — auto-id; fields: name, age, gender, contact, email, address, medicalHistory, createdBy, createdAt
- **appointments** — auto-id; fields: patientId, patientName, doctorId, doctorName, date (YYYY-MM-DD), time (HH:MM), status (pending/confirmed/completed/cancelled), notes, createdAt
- **prescriptions** — auto-id; fields: patientId, patientName, doctorId, doctorName, medicines[] (name, dosage, frequency, duration), instructions, aiExplanation, createdAt
- **diagnosisLogs** — auto-id; fields: patientId, doctorId, symptoms[], age, gender, history, aiResponse, riskLevel, possibleConditions[], suggestedTests[], createdAt

## Key Patterns
- All Firestore queries with `orderBy` require composite indexes — create them in Firebase Console when prompted
- Patient records are matched to user accounts by email for the patient role's "my" views
- AI features use `fetch()` to call `https://api.groq.com/openai/v1/chat/completions` directly from the client
- PDF generation uses jsPDF + jspdf-autotable via dynamic `import()` to keep initial bundle small
- The `userData` object (from Firestore `users` collection) is the central context passed to all render functions
