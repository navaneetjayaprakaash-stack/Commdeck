// Firebase setup
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b6sk70s4vbxJt-H0NGk",
  authDomain: "my-chat-room-1d84f.firebaseapp.com",
  projectId: "my-chat-room-1d84f",
  storageBucket: "my-chat-room-1d84f.firebasestorage.app",
  messagingSenderId: "747796328971",
  appId: "1:747796328971:web:beb5c15265855e169e8d0e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { collection, addDoc, query, orderBy, onSnapshot };
