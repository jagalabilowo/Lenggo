import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { UserProfile, ReflectionEntry, QuizSet, MasteryReport } from '../types.js';

// Safe check for Firebase configuration
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isFirebaseConfigured = false;

// Fallback configuration if firebase-applet-config.json or env is missing
const configCandidate = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

try {
  if (configCandidate.apiKey && configCandidate.projectId) {
    if (!getApps().length) {
      app = initializeApp(configCandidate);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseConfigured = true;
  }
} catch (e) {
  console.warn('Firebase auto-init skipped (running in local/resilient mode):', e);
}

export { isFirebaseConfigured, auth, db };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || 'anonymous',
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Strip undefined values for clean database payloads
export function sanitizePayload<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload));
}

// ---------------- AUTHENTICATION HELPERS ----------------

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<UserProfile> {
  if (auth && isFirebaseConfigured) {
    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || 'Learner',
      photoURL: u.photoURL || null,
      isGuest: false,
    };
  }

  // Resilient Local Demo User Mode
  const guestUser: UserProfile = {
    uid: 'guest_dev_' + Math.random().toString(36).substring(2, 9),
    email: 'engineer@demo.lenggo.dev',
    displayName: 'Cloud Developer (Demo)',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    isGuest: true,
  };
  localStorage.setItem('lenggo_guest_user', JSON.stringify(guestUser));
  return guestUser;
}

export async function signOutUser(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    await signOut(auth);
  }
  localStorage.removeItem('lenggo_guest_user');
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  if (auth && isFirebaseConfigured) {
    return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        callback({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Learner',
          photoURL: fbUser.photoURL || null,
          isGuest: false,
        });
      } else {
        const storedGuest = localStorage.getItem('lenggo_guest_user');
        callback(storedGuest ? JSON.parse(storedGuest) : null);
      }
    });
  }

  // Fallback listener for guest mode
  const storedGuest = localStorage.getItem('lenggo_guest_user');
  callback(storedGuest ? JSON.parse(storedGuest) : null);
  return () => {};
}

// ---------------- FIRESTORE & DATA PERSISTENCE ----------------

const LOCAL_STORAGE_KEY_REFLECTIONS = 'lenggo_reflections_';
const LOCAL_STORAGE_KEY_QUIZZES = 'lenggo_quizzes_';
const LOCAL_STORAGE_KEY_MASTERY = 'lenggo_mastery_';

export async function saveReflection(userId: string, reflection: ReflectionEntry): Promise<void> {
  const cleanData = sanitizePayload(reflection);
  const path = `users/${userId}/reflections/${reflection.id}`;

  if (db && isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'users', userId, 'reflections', reflection.id), cleanData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  } else {
    // Local persistence
    const key = LOCAL_STORAGE_KEY_REFLECTIONS + userId;
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as ReflectionEntry[];
    const index = existing.findIndex((r) => r.id === reflection.id);
    if (index >= 0) {
      existing[index] = cleanData;
    } else {
      existing.unshift(cleanData);
    }
    localStorage.setItem(key, JSON.stringify(existing));
  }
}

export async function fetchReflections(userId: string): Promise<ReflectionEntry[]> {
  const path = `users/${userId}/reflections`;
  if (db && isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'users', userId, 'reflections'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as ReflectionEntry);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  const key = LOCAL_STORAGE_KEY_REFLECTIONS + userId;
  return JSON.parse(localStorage.getItem(key) || '[]') as ReflectionEntry[];
}

export async function deleteReflection(userId: string, reflectionId: string): Promise<void> {
  const path = `users/${userId}/reflections/${reflectionId}`;
  if (db && isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'users', userId, 'reflections', reflectionId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  } else {
    const key = LOCAL_STORAGE_KEY_REFLECTIONS + userId;
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as ReflectionEntry[];
    const filtered = existing.filter((r) => r.id !== reflectionId);
    localStorage.setItem(key, JSON.stringify(filtered));
  }
}

export async function saveQuizSet(userId: string, quiz: QuizSet): Promise<void> {
  const cleanData = sanitizePayload(quiz);
  const path = `users/${userId}/quizzes/${quiz.id}`;
  if (db && isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'users', userId, 'quizzes', quiz.id), cleanData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  } else {
    const key = LOCAL_STORAGE_KEY_QUIZZES + userId;
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as QuizSet[];
    const index = existing.findIndex((q) => q.id === quiz.id);
    if (index >= 0) {
      existing[index] = cleanData;
    } else {
      existing.unshift(cleanData);
    }
    localStorage.setItem(key, JSON.stringify(existing));
  }
}

export async function fetchQuizSets(userId: string): Promise<QuizSet[]> {
  const path = `users/${userId}/quizzes`;
  if (db && isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'users', userId, 'quizzes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as QuizSet);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  const key = LOCAL_STORAGE_KEY_QUIZZES + userId;
  return JSON.parse(localStorage.getItem(key) || '[]') as QuizSet[];
}

export async function saveMasteryReport(userId: string, report: MasteryReport): Promise<void> {
  const cleanData = sanitizePayload(report);
  const path = `users/${userId}/mastery_reports/${report.id}`;
  if (db && isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'users', userId, 'mastery_reports', report.id), cleanData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  } else {
    const key = LOCAL_STORAGE_KEY_MASTERY + userId;
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as MasteryReport[];
    existing.unshift(cleanData);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 10)));
  }
}

export async function fetchMasteryReports(userId: string): Promise<MasteryReport[]> {
  const path = `users/${userId}/mastery_reports`;
  if (db && isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'users', userId, 'mastery_reports'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as MasteryReport);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  const key = LOCAL_STORAGE_KEY_MASTERY + userId;
  return JSON.parse(localStorage.getItem(key) || '[]') as MasteryReport[];
}
