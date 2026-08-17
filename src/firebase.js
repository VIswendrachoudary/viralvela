import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyDDNPrzv3D-EG4KQtNIMdN6RtQ08573gJQ",
  authDomain: "viral-vela.firebaseapp.com",
  projectId: "viral-vela",
  storageBucket: "viral-vela.firebasestorage.app",
  messagingSenderId: "1080733264524",
  appId: "1:1080733264524:web:279519a6c2463c04f569a9",
  measurementId: "G-EQBXRS41X5"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const analytics = getAnalytics(app)

// Admin PIN — change this to whatever you want
export const ADMIN_PIN = '3mfc2026'
