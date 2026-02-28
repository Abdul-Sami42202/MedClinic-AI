import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========== Auth Functions ==========
export async function signUp(name, email, password, role = 'patient') {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), {
    name,
    email,
    role,
    plan: 'free',
    createdAt: Timestamp.now()
  });
  return cred.user;
}

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut() {
  return signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ========== User Functions ==========
export async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getUsersByRole(role) {
  const q = query(collection(db, "users"), where("role", "==", role));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}

export async function deleteUserDoc(uid) {
  await deleteDoc(doc(db, "users", uid));
}

// ========== Patient Functions ==========
export async function addPatient(data) {
  const ref = await addDoc(collection(db, "patients"), {
    ...data,
    createdAt: Timestamp.now()
  });
  return ref.id;
}

export async function getPatient(id) {
  const snap = await getDoc(doc(db, "patients", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllPatients() {
  const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updatePatient(id, data) {
  await updateDoc(doc(db, "patients", id), data);
}

export async function deletePatient(id) {
  await deleteDoc(doc(db, "patients", id));
}

export async function searchPatients(searchTerm) {
  const all = await getAllPatients();
  const term = searchTerm.toLowerCase();
  return all.filter(p =>
    p.name?.toLowerCase().includes(term) ||
    p.email?.toLowerCase().includes(term) ||
    p.contact?.includes(term)
  );
}

// ========== Appointment Functions ==========
export async function addAppointment(data) {
  const ref = await addDoc(collection(db, "appointments"), {
    ...data,
    createdAt: Timestamp.now()
  });
  return ref.id;
}

export async function getAppointment(id) {
  const snap = await getDoc(doc(db, "appointments", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllAppointments() {
  const q = query(collection(db, "appointments"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAppointmentsByDoctor(doctorId) {
  const q = query(collection(db, "appointments"), where("doctorId", "==", doctorId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAppointmentsByPatient(patientId) {
  const q = query(collection(db, "appointments"), where("patientId", "==", patientId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateAppointment(id, data) {
  await updateDoc(doc(db, "appointments", id), data);
}

export async function deleteAppointment(id) {
  await deleteDoc(doc(db, "appointments", id));
}

// ========== Prescription Functions ==========
export async function addPrescription(data) {
  const ref = await addDoc(collection(db, "prescriptions"), {
    ...data,
    createdAt: Timestamp.now()
  });
  return ref.id;
}

export async function getPrescription(id) {
  const snap = await getDoc(doc(db, "prescriptions", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllPrescriptions() {
  const q = query(collection(db, "prescriptions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPrescriptionsByDoctor(doctorId) {
  const q = query(collection(db, "prescriptions"), where("doctorId", "==", doctorId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPrescriptionsByPatient(patientId) {
  const q = query(collection(db, "prescriptions"), where("patientId", "==", patientId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updatePrescription(id, data) {
  await updateDoc(doc(db, "prescriptions", id), data);
}

// ========== Diagnosis Log Functions ==========
export async function addDiagnosisLog(data) {
  const ref = await addDoc(collection(db, "diagnosisLogs"), {
    ...data,
    createdAt: Timestamp.now()
  });
  return ref.id;
}

export async function getDiagnosisLogsByPatient(patientId) {
  const q = query(collection(db, "diagnosisLogs"), where("patientId", "==", patientId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllDiagnosisLogs() {
  const q = query(collection(db, "diagnosisLogs"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), {
    ...data,
    createdAt: Timestamp.now()
  });
}

// ========== Exports ==========
export { db, auth, Timestamp };
