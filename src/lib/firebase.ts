// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByLz1YO5BONYTpf8WDj40sS45WTiBjuKY",
  authDomain: "ttagepk.firebaseapp.com",
  projectId: "ttagepk",
  storageBucket: "ttagepk.firebasestorage.app",
  messagingSenderId: "451640637041",
  appId: "1:451640637041:web:efcd57952669874703cdd0",
  measurementId: "G-PPC0ELY2N3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export default app;
