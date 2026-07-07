import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBI5RmGtnrqL0InEKoXuLTp6zmDRreZBB8",
  authDomain: "keyauthweb-86eba.firebaseapp.com",
  projectId: "keyauthweb-86eba",
  storageBucket: "keyauthweb-86eba.firebasestorage.app",
  messagingSenderId: "66839697252",
  appId: "1:66839697252:web:4410edf2c50b4408684c71",
  measurementId: "G-BVJMNV0EY5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
