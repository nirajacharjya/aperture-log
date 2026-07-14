// Firebase App
import { initializeApp } from "firebase/app";

// Firebase Authentication
import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYn6JPeGoB_w236g8xzmPbCIvOkitrSuM",
  authDomain: "aperture-log-65415.firebaseapp.com",
  projectId: "aperture-log-65415",
  storageBucket: "aperture-log-65415.firebasestorage.app",
  messagingSenderId: "305634240232",
  appId: "1:305634240232:web:980d06d27ad54e01178b5d",
  measurementId: "G-MM04PXD1BN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Authentication
const auth = getAuth(app);

// Google Provider
const provider = new GoogleAuthProvider();

// Export them
export { auth, provider };