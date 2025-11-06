import { db } from "./firebase.js";
import {
  collection, doc, setDoc, getDoc, addDoc, onSnapshot, query, orderBy
} from "firebase/firestore";


// =====================
// USER ID (PERSISTENT)
// =====================
let userId = localStorage.getItem("userId");
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("userId", userId);
}

let username = localStorage.getItem("username") || "User-" + userId.slice(0, 5);
document.getElementById("display-username").textContent = username;

document.getElementById("change-name-btn").onclick = () => {
  const newName = prompt("Enter new name:", username);
  if (!newName) return;
  username = newName;
  localStorage.setItem("username", username);
  document.getElementById("display-username").textContent = username;
};


// =====================
// THEME PERSISTENCE
// =====================
const themeSelect = document.getElementById("theme-select");
const themes = [
  "default","sunset-glow","purple-haze","deep-ocean","royal-blue","sky-breeze",
  "hot-pink","molten-orange","golden-hour","rose-red","violet-dream","indigo-night",
  "mystic-purple","fuchsia-glow","electric-blue","aqua-mist","magenta-pulse","blazing-orange",
  "sunlit-gold","royal-violet","night-indigo"
];

themes.forEach(t => {
  const opt = document.createElement("option");
  opt.value = t;
  opt.textContent = t;
  themeSelect.appendChild(opt);
});

let savedTheme = localStorage.getItem("theme") || "default";
document.body.setAttribute("data-theme", savedTheme);
themeSelect.value = savedTheme;

themeSelect.onchange = () => {
  document.body.setAttribute("data-theme", themeSelect.value);
  localStorage.setItem("theme", themeSelect.value);
};


// =====================
// ROOM SYSTEM
// =====================
const roomList = document.getElementById("room-list");
const chatMessages = document.getElementById("chat-messages");
const chatTitle = document.getElementById("chat-title");

let currentRoom = null;

function loadRoom(roomId) {
  currentRoom = roomId;
  chatTitle.textContent = roomId;
  chatMessages.innerHTML = "";

  const q = query(collection(db, "rooms", roomId, "messages"), orderBy("timestamp"));
  onSnapshot(q, snap => {
    chatMessages.innerHTML = "";
    snap.forEach(doc => {
      const msg = doc.data();
      renderMessage(chatMessages, msg);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

document.getElementById("create-room-btn").onclick = async () => {
  const roomName = prompt("Room name:");
  if (!roomName) return;
  await setDoc(doc(db, "rooms", roomName), { created: Date.now() });
};


// Load room list
onSnapshot(collection(db, "rooms"), snap => {
  roomList.innerHTML = "";
  snap.forEach(doc => {
    const li = document.createElement("li");
    li.textContent = doc.id;
    li.onclick = () => loadRoom(doc.id);
    roomList.appendChild(li);
  });
});


// Send message in a room
document.getElementById("send-btn").onclick = async () => {
  if (!currentRoom) return;
  const input = document.getElementById("message-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  await addDoc(collection(db, "rooms", currentRoom, "messages"), {
    userId, username, text,
    timestamp: Date.now()
  });
};


// =====================
// DM SYSTEM
// =====================
const dmList = document.getElementById("dm-list");
const dmPanel = document.getElementById("dm-panel");
const dmTitle = document.getElementById("dm-title");
const dmMessages = document.getElementById("dm-messages");

let currentDM = null;

function dmIdFor(a, b) {
  return [a, b].sort().join("_");
}

function openDM(otherUserId, name) {
  currentDM = dmIdFor(userId, otherUserId);
  dmPanel.classList.remove("hidden");
  dmTitle.textContent = "Chat with " + name;

  const q = query(collection(db, "dms", currentDM, "messages"), orderBy("timestamp"));
  onSnapshot(q, snap => {
    dmMessages.innerHTML = "";
    snap.forEach(doc => renderMessage(dmMessages, doc.data()));
    dmMessages.scrollTop = dmMessages.scrollHeight;
  });
}

document.getElementById("close-dm-btn").onclick = () => dmPanel.classList.add("hidden");

document.getElementById("dm-send-btn").onclick = async () => {
  const input = document.getElementById("dm-message-input");
  const text = input.value.trim();
  if (!text || !currentDM) return;
  input.value = "";

  await addDoc(collection(db, "dms", currentDM, "messages"), {
    userId, username, text,
    timestamp: Date.now()
  });
};


// =====================
// MESSAGE RENDERING
// =====================
function renderMessage(container, msg) {
  const div = document.createElement("div");
  div.classList.add("message", msg.userId === userId ? "self" : "other");
  div.textContent = msg.text;
  container.appendChild(div);
}
