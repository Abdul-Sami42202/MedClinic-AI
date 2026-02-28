# MedClinic AI — AI-Powered Clinic Management SaaS

A modern SaaS platform that digitizes clinic operations, manages patients/appointments/prescriptions, and provides AI-assisted medical diagnosis.

## Features

### Authentication & Authorization
- Firebase Auth with email/password
- 4 user roles: Admin, Doctor, Receptionist, Patient
- Role-based dashboards and protected routes
- Input validation on all forms

### Patient Management
- Register, edit, delete patient records
- Search patients by name, email, or contact
- View patient profile with full medical history timeline

### Appointment Management
- Book appointments (by receptionist, doctor, or system)
- Status workflow: Pending → Confirmed → Completed / Cancelled
- Filter by status and date
- Daily schedule view

### Prescription System
- Create prescriptions with dynamic medicine rows (name, dosage, frequency, duration)
- Generate and download PDF prescriptions (jsPDF + jspdf-autotable)
- View prescription details
- AI-powered prescription explanation for patients

### AI Features (Groq Integration)
- **Smart Symptom Checker** — Enter symptoms, age, gender, history → AI returns possible conditions, risk level, suggested tests
- **Prescription Explanation** — AI generates patient-friendly explanation of medicines and lifestyle advice
- **Risk Flagging** — Detects repeated infection patterns and high-risk patients from diagnosis history

### Analytics Dashboard
- **Admin:** Total patients, doctors, appointments, simulated revenue, monthly trends, common symptoms, doctor performance
- **Doctor:** Daily/monthly appointments, prescription count, trend charts

### SaaS Subscription Layer
- Free Plan: Up to 50 patients, no AI features
- Pro Plan: Unlimited patients, all AI features, advanced analytics
- Admin can upgrade/downgrade users

## Tech Stack
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Build Tool:** Vite
- **Auth & Database:** Firebase Auth + Cloud Firestore
- **AI:** Groq API (llama-3.3-70b-versatile)
- **PDF:** jsPDF + jspdf-autotable
- **Deployment:** Vercel / Netlify (frontend)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Firebase and Groq keys:
   ```
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_GROQ_API_KEY=your_groq_api_key
   ```
4. Set up Firebase:
   - Enable Email/Password authentication
   - Create a Firestore database
   - Create required composite indexes (Firestore will prompt you in the browser console)
5. Start development server:
   ```bash
   npm run dev
   ```

## Firebase Indexes Required
Firestore queries with `where()` + `orderBy()` require composite indexes. When you first run the app, the browser console will show links to create these indexes automatically.

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Manage doctors/receptionists, view all data, analytics, subscription management |
| **Doctor** | View appointments, patient history, write prescriptions, AI diagnosis, personal analytics |
| **Receptionist** | Register patients, book appointments, manage daily schedule |
| **Patient** | View profile, appointments, prescriptions, medical history |

## Deployment
```bash
npm run build
```
Deploy the `dist/` folder to Vercel, Netlify, or any static hosting.
