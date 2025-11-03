// script.js
import { db } from "../firebase.js";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

// ===== Elements =====
const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const usernameInput = document.getElementById("usernameInput");
const enterBtn = document.getElementById("enterBtn");
const roomNameEl = document.getElementById("roomName");
const roomSelect = document.getElementById("roomSelect");
const newRoomBtn = document.getElementById("newRoomBtn");
const userListEl = document.getElementById("userList");
const chatContainer = document.getElementById("chatContainer");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const nameInput = document.getElementById("nameInput");
const changeNameBtn = document.getElementById("changeNameBtn");
const themeSelect = document.getElementById("themeSelect");

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

// Apply saved theme
if(localStorage.getItem("theme")) {
  themeSelect.value = localStorage.getItem("theme");
  document.body.className = themeSelect.value.replace(/\s+/g, "-").toLowerCase();
}

themeSelect.addEventListener("change", () => {
  document.body.className = themeSelect.value.replace(/\s+/g, "-").toLowerCase();
  localStorage.setItem("theme", themeSelect.value);
});

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

function loadChatHistory() {
  const history = chatHistory[currentRoom] || [];
  chatContainer.innerHTML = "";
  history.forEach(renderMessage);
}

function saveMessage(msg) {
  if(!chatHistory[currentRoom]) chatHistory[currentRoom] = [];
  chatHistory[currentRoom].push(msg);
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
}

// ===== Event Listeners =====
enterBtn.addEventListener("click", () => {
  username = usernameInput.value.trim() || username;
  localStorage.setItem("username", username);
  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  nameInput.value = username;
  init();
});

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

changeNameBtn.addEventListener("click", () => {
  username = nameInput.value.trim() || username;
  localStorage.setItem("username", username);
  renderMessage({ from: "system", text: `Name changed to ${username}`, system: true });
});

newRoomBtn.addEventListener("click", () => {
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

// ===== Firestore Listener =====
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

// ===== Init =====
function init() {
  // Default rooms
  ["general","random"].forEach(room => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomSelect.appendChild(option);
  });

  if(!roomSelect.querySelector(`option[value="${currentRoom}"]`)) {
    const option = document.createElement("option");
    option.value = currentRoom;
    option.textContent = currentRoom;
    roomSelect.appendChild(option);
  }
  roomSelect.value = currentRoom;

  loadChatHistory();
  listenToRoom(currentRoom);
}
