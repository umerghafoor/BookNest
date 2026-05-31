import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

/**
 * Firebase is only usable when the project has been configured via env vars.
 * When it isn't (e.g. local preview / demo), we skip initialization so the app
 * can still boot and fall back to the in-memory mock data layer.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let storageInstance: FirebaseStorage | null = null
let googleProviderInstance: GoogleAuthProvider | null = null

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  authInstance = getAuth(app)
  dbInstance = getFirestore(app)
  storageInstance = getStorage(app)
  googleProviderInstance = new GoogleAuthProvider()
  googleProviderInstance.setCustomParameters({ prompt: "select_account" })
} else if (typeof window !== "undefined") {
  console.warn(
    "[BookNest] Firebase env vars are not set — running in demo mode with mock data.",
  )
}

// Existing code imports these eagerly. They are non-null when Firebase is
// configured; in demo mode callers gate on `isFirebaseConfigured` first.
export const auth = authInstance as Auth
export const db = dbInstance as Firestore
export const storage = storageInstance as FirebaseStorage
export const googleProvider = googleProviderInstance as GoogleAuthProvider
