// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAidAj8fvRdaW_tWAYKEriR8rPWg5KgcZo",
  authDomain: "prevencar-vistorias-fich-377b1.firebaseapp.com",
  projectId: "prevencar-vistorias-fich-377b1",
  storageBucket: "prevencar-vistorias-fich-377b1.firebasestorage.app",
  messagingSenderId: "251837575934",
  appId: "1:251837575934:web:18f9505e46813b190b2baf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);