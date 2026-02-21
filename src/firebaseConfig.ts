import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// These would be populated from environment variables in a real app
const firebaseConfig = {
  apiKey: "AIzaSyCGTCdp4EHVgv7YonyOLVuz3PefUmgHjI0",
  authDomain: "course-registration-a45a5.firebaseapp.com",
  projectId: "course-registration-a45a5",
  storageBucket: "course-registration-a45a5.firebasestorage.app",
  messagingSenderId: "303650323790",
  appId: "1:303650323790:web:df399b635129f60c57b21f"
};

// Initialize Firebase
// Note: In this environment, we'll use mock data if Firebase isn't configured
// but we provide the structure for the user.
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
