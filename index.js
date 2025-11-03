import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const messagesRef = collection(db, "messages");
const q = query(messagesRef, orderBy("timestamp"));

// Get username from URL
const urlParams = new URLSearchParams(window.location.search);
let username = urlParams.get("username") || "Guest_" + Math.floor(Math.random() * 1000);
document.getElementById("user-display").textContent = username;

// DOM elements
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chat-messages");
const themeSelect = document.getElementById("themeSelect");
const body = document.body;

// Send message
sendBtn.addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text) return;
  await addDoc(messagesRef, { text, timestamp: Date.now(), user: username });
  chatInput.value = "";
});

// Listen to messages
onSnapshot(q, (snapshot) => {
  chatMessages.innerHTML = "";
  snapshot.forEach(doc => {
    const msg = doc.data();
    const div = document.createElement("div");
    div.classList.add("message");
    div.textContent = msg.user ? `${msg.user}: ${msg.text}` : msg.text;
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Theme selection
themeSelect.addEventListener("change", () => {
  body.className = themeSelect.value; // remove previous theme
});

// RGB sliders
const rSlider = document.getElementById("r");
const gSlider = document.getElementById("g");
const bSlider = document.getElementById("b");

[rSlider, gSlider, bSlider].forEach(slider => {
  slider.addEventListener("input", () => {
    const r = rSlider.value, g = gSlider.value, b = bSlider.value;
    body.style.backgroundColor = `rgb(${r},${g},${b})`;
  });
});
