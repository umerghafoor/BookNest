import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyD3NmXFj9DEJV2iaiz76rdbCU4UeOPvMEo",
  authDomain: "booknest-ca591.firebaseapp.com",
  projectId: "booknest-ca591",
  storageBucket: "booknest-ca591.firebasestorage.app",
  messagingSenderId: "774297155083",
  appId: "1:774297155083:web:2c61ec68942f9d20ae790e",
  measurementId: "G-68BHKGZW3F",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Add some debugging
console.log("Firebase initialized with config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
})
