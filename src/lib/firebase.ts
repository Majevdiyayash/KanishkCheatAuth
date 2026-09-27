import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDP35XksoKSu0VPZDe6PkQPDDIUamJ8SIs",
  authDomain: "kanishkcheatauth.firebaseapp.com",
  projectId: "kanishkcheatauth",
  storageBucket: "kanishkcheatauth.firebasestorage.app",
  messagingSenderId: "986999243139",
  appId: "1:986999243139:web:bf0ee9aa2427cb88e9b6b6",
  measurementId: "G-RSEDYHLPJK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
