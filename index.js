// index.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b...", // replace with your API key
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messagesRef = collection(db, "messages");

// ===== DOM Elements =====
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const themeSelect = document.getElementById("themeSelect");
const body = document.body;

// ===== Theme Handling =====
themeSelect.addEventListener("change", () => {
  // remove previous theme classes
  body.className = ""; 
  body.classList.add(themeSelect.value);
});

// ===== Send Message =====
sendBtn.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text) return;
  await addDoc(messagesRef, { text, timestamp: Date.now() });
  chatInput.value = "";
});

// ===== Listen to Messages =====
const q = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  chatMessages.innerHTML = ""; // clear
  snapshot.forEach(doc => {
    const msg = doc.data();
    const div = document.createElement("div");
    div.classList.add("message");
    div.textContent = msg.text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
});

// ===== RGB Panel (optional dynamic color) =====
document.querySelectorAll("#rgb-panel input").forEach(slider => {
  slider.addEventListener("input", () => {
    const r = document.getElementById("r").value;
    const g = document.getElementById("g").value;
    const b = document.getElementById("b").value;
    body.style.setProperty("--custom-rgb", `${r}, ${g}, ${b}`);
  });
});

// ===== Auto-focus input =====
chatInput.focus();
