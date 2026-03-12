// Firebase configuration for DeepLearner OS
// Replace these values with your actual Firebase project config
// Go to: Firebase Console > Project Settings > General > Your Apps

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// const firebaseConfig = {
//     apiKey: "YOUR_API_KEY",
//     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
//     projectId: "YOUR_PROJECT_ID",
//     storageBucket: "YOUR_PROJECT_ID.appspot.com",
//     messagingSenderId: "YOUR_SENDER_ID",
//     appId: "YOUR_APP_ID"
//};

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDzFaiu7IRut-Gq2Kaa3N-gV1xu2w0IkgY",
    authDomain: "deeplearner-e3ed6.firebaseapp.com",
    projectId: "deeplearner-e3ed6",
    storageBucket: "deeplearner-e3ed6.firebasestorage.app",
    messagingSenderId: "531641418671",
    appId: "1:531641418671:web:de083a021aac6aaeb9a55a",
    measurementId: "G-4K34TZN2P1"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
