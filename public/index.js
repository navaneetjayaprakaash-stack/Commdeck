// ===== Firebase & Initialization =====
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

import { firebaseConfig } from "./firebase.js"; // your firebase config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== Elements =====
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const chatContainer = document.getElementById("chat-container");
const roomSelect = document.getElementById("room-select");
const themeSelect = document.getElementById("theme-select");
const nameInput = document.getElementById("name-input");
const createRoomBtn = document.getElementById("create-room");

// ===== Globals =====
let currentRoom = localStorage.getItem("currentRoom") || generateRoomName();
let username = localStorage.getItem("username") || "Anon" + Math.floor(Math.random() * 1000);
let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || {};

// ===== Themes =====
const themes = [
  "Cyberpunk Bliss","Solar Flare","Electric Lagoon","Rainbow Riot","Lunar Eclipse",
  "Tropical Storm","Aurora Glow","Pixel Party","Neon Dreams","Magenta Mirage",
  "Glitch Mode","Cosmic Candy","Funky Fiesta","Velvet Vortex","Ultra Violet",
  "Quantum Quasar","Laser Lemon","Fuchsia Fusion","Plasma Pop","Digital Dusk"
];

// Populate theme dropdown
themes.forEach(theme => {
  const option = document.createElement("option");
  option.value = theme;
  option.textContent = theme;
  themeSelect.appendChild(option);
});

// Apply theme
themeSelect.addEventListener("change", () => {
  document.body.className = themeSelect.value.replace(/\s+/g, "-").toLowerCase();
  localStorage.setItem("theme", themeSelect.value);
});

// Apply saved theme
if(localStorage.getItem("theme")) {
  themeSelect.value = localStorage.getItem("theme");
  document.body.className = themeSelect.value.replace(/\s+/g, "-").toLowerCase();
}

// ===== Functions =====
function generateRoomName() {
  return "room-" + Math.random().toString(36).substring(2, 8);
}

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = msg.system ? "system-msg" : "user-msg";
  div.innerHTML = `<strong>${msg.from}:</strong> ${msg.text}`;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Load chat history
function loadChatHistory() {
  const history = chatHistory[currentRoom] || [];
  chatContainer.innerHTML = "";
  history.forEach(renderMessage);
}

// Save message to local storage
function saveMessage(msg) {
  if(!chatHistory[currentRoom]) chatHistory[currentRoom] = [];
  chatHistory[currentRoom].push(msg);
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
}

// ===== Firestore Real-time Listener =====
function listenToRoom(room) {
  const messagesRef = collection(db, "rooms", room, "messages");
  const q = query(messagesRef, orderBy("ts", "asc"));

  onSnapshot(q, snapshot => {
    snapshot.docChanges().forEach(change => {
      if(change.type === "added") {
        const msg = change.doc.data();
        renderMessage(msg);
        saveMessage(msg);
      }
    });
  });
}

// ===== Event Listeners =====
messageForm.addEventListener("submit", async e => {
  e.preventDefault();
  if(!messageInput.value.trim()) return;

  const msg = {
    from: username,
    text: messageInput.value.trim(),
    ts: Date.now(),
    room: currentRoom,
    system: false
  };

  // Save to Firestore
  const messagesRef = collection(db, "rooms", currentRoom, "messages");
  await addDoc(messagesRef, msg);

  messageInput.value = "";
});

createRoomBtn.addEventListener("click", () => {
  currentRoom = generateRoomName();
  localStorage.setItem("currentRoom", currentRoom);

  const option = document.createElement("option");
  option.value = currentRoom;
  option.textContent = currentRoom;
  roomSelect.appendChild(option);
  roomSelect.value = currentRoom;

  loadChatHistory();
  listenToRoom(currentRoom);
});

roomSelect.addEventListener("change", () => {
  currentRoom = roomSelect.value;
  localStorage.setItem("currentRoom", currentRoom);
  loadChatHistory();
  listenToRoom(currentRoom);
});

nameInput.addEventListener("change", () => {
  username = nameInput.value || username;
  localStorage.setItem("username", username);
});

// ===== Initialize =====
function init() {
  // Populate default rooms
  ["general","random"].forEach(room => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomSelect.appendChild(option);
  });

  // Set current room
  if(!roomSelect.querySelector(`option[value="${currentRoom}"]`)) {
    const option = document.createElement("option");
    option.value = currentRoom;
    option.textContent = currentRoom;
    roomSelect.appendChild(option);
  }
  roomSelect.value = currentRoom;

  nameInput.value = username;

  loadChatHistory();
  listenToRoom(currentRoom);
}

init();
