// public/script.js
import { setupRGBPanel } from "./rgb-theme.js";
import { setupDM } from "./dm.js";
import { setupURLGenerator } from "./url-generator.js";
import { db } from "./firebase.js";
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";

const socket = io();

// ===== DOM Elements =====
const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const usernameInput = document.getElementById("usernameInput");
const enterBtn = document.getElementById("enterBtn");

const messageForm = document.getElementById("chat-input-container");
const messageInput = document.getElementById("messageInput");
const chatMessages = document.getElementById("chat-messages");

const themeSelect = document.getElementById("themeSelect");
const chatContainer = document.getElementById("chat-container");
const sidebar = document.getElementById("sidebar");

// ===== Theme Options =====
const themes = [
  "theme-galactic-purple", "theme-electric-sunset", "theme-neon-cyberpunk",
  "theme-cosmic-ocean", "theme-lava-glow", "theme-aurora-borealis",
  "theme-radiant-gold", "theme-cyber-teal", "theme-bubblegum-pop",
  "theme-toxic-lime", "theme-firefly-night", "theme-magenta-storm",
  "theme-electric-cyan", "theme-starry-violet", "theme-solar-flare",
  "theme-cosmic-pink", "theme-midnight-blue", "theme-inferno-red",
  "theme-prism-rainbow", "theme-hyperspace-neon"
];

themes.forEach(theme => {
  const opt = document.createElement("option");
  opt.value = theme;
  opt.textContent = theme.replace("theme-", "").replace(/-/g, " ");
  themeSelect.appendChild(opt);
});

// ===== Firestore Functions =====
async function fetchMessages(limitCount = 50) {
  const messagesCol = collection(db, "messages");
  const q = query(messagesCol, orderBy("timestamp", "asc"), limit(limitCount));
  const snapshot = await getDocs(q);

  chatMessages.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    appendMessage(`${data.user || "Anon"}: ${data.text}`);
  });
}

async function saveMessage(text, user) {
  try {
    await addDoc(collection(db, "messages"), {
      user,
      text,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Firestore error:", err);
  }
}

// ===== Login Handling =====
let username = "";

enterBtn.addEventListener("click", async () => {
  username = usernameInput.value.trim();
  if (!username) return alert("Enter your name");

  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  socket.emit("join", username);
  await fetchMessages();
});

// ===== Chat Handling =====
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;

  await saveMessage(msg, username); // save in Firestore
  socket.emit("chat message", msg); // emit to other users
  messageInput.value = "";
});

// Listen for incoming messages
socket.on("chat message", (msg) => {
  appendMessage(msg);
});

function appendMessage(text) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== Theme Switching =====
themeSelect.addEventListener("change", (e) => {
  const theme = e.target.value;
  themes.forEach(t => document.body.classList.remove(t));
  document.body.classList.add(theme);
});

// ===== Initialize RGB Panel, DMs, and URL Generator =====
setupRGBPanel(chatContainer, sidebar, themeSelect);
setupDM(socket);
setupURLGenerator();
