import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBaAouEm8ZGfm343C-oBsah95yHZ-ZRav4",
  authDomain: "innovator-keyauth.firebaseapp.com",
  projectId: "innovator-keyauth",
  storageBucket: "innovator-keyauth.firebasestorage.app",
  messagingSenderId: "1027761962877",
  appId: "1:1027761962877:web:c1937e694f781bbaaad614",
  measurementId: "G-45ZXCZ71CS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
