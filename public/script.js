import { initializeApp } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-app-compat.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-firestore-compat.js";

// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

const socket = io();

// Auto-generated username
let username = "User" + Math.floor(Math.random() * 1000);
let room = new URLSearchParams(window.location.search).get("room") || "general";
let allRooms = [room];

// DOM elements
const gcMessagesEl = document.getElementById("gcMessages");
const dmMessagesEl = document.getElementById("dmMessages");
const dmModal = document.getElementById("dmModal");
const dmHeader = document.getElementById("dmHeader");
const dmMessageInput = document.getElementById("dmMessageInput");
const dmSendBtn = document.getElementById("dmSendBtn");
const dmCloseBtn = document.getElementById("dmCloseBtn");
const dmListEl = document.getElementById("dmList");
const userListEl = document.getElementById("userList");
const gcListEl = document.getElementById("gcList");
const currentUsernameEl = document.getElementById("currentUsername");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const generateLinkBtn = document.getElementById("generateLinkBtn");
const themeSelect = document.getElementById("themeSelect");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const newRoomInput = document.getElementById("newRoomInput");

// DM management
let dms = {}; // { username: [messages] }
let currentDM = null;

// Display username
currentUsernameEl.textContent = username;

// Themes
const themes = [
  { id: "sunset-glow", name: "Sunset Glow" },
  { id: "purple-haze", name: "Purple Haze" },
  { id: "deep-ocean", name: "Deep Ocean" },
  { id: "royal-blue", name: "Royal Blue" },
  { id: "sky-breeze", name: "Sky Breeze" },
  { id: "hot-pink", name: "Hot Pink" },
  { id: "molten-orange", name: "Molten Orange" },
  { id: "golden-hour", name: "Golden Hour" },
  { id: "rose-red", name: "Rose Red" },
  { id: "violet-dream", name: "Violet Dream" }
];

// Populate theme dropdown
themes.forEach(t => {
  const opt = document.createElement("option");
  opt.value = t.id;
  opt.textContent = t.name;
  themeSelect.appendChild(opt);
});

// Apply saved theme
const savedTheme = localStorage.getItem("selectedTheme");
if (savedTheme) document.body.setAttribute("data-theme", savedTheme);
themeSelect.value = savedTheme || themes[0].id;

themeSelect.onchange = () => {
  document.body.setAttribute("data-theme", themeSelect.value);
  localStorage.setItem("selectedTheme", themeSelect.value);
};

// Firestore GC messages subscription
let unsubscribeGC = null;
function joinRoom(newRoom) {
  room = newRoom;
  if (!allRooms.includes(newRoom)) allRooms.push(newRoom);
  renderGClist();

  gcMessagesEl.innerHTML = "";
  if (unsubscribeGC) unsubscribeGC();

  const roomRef = firestore.collection("rooms").doc(room).collection("messages").orderBy("timestamp");
  unsubscribeGC = roomRef.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === "added") addGCMessage(change.doc.data());
    });
  });

  history.replaceState(null, "", "?room=" + room);
}

function addGCMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  if (msg.user === "System") div.classList.add("system");
  else if (msg.user === username) div.classList.add("self");
  else div.classList.add("other");
  div.innerHTML = msg.user === "System" ? msg.text : `<b>${msg.user}:</b> ${msg.text}`;
  gcMessagesEl.appendChild(div);
  gcMessagesEl.scrollTop = gcMessagesEl.scrollHeight;
}

// GC List UI
function renderGClist() {
  gcListEl.innerHTML = "";
  allRooms.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    if (r === room) li.classList.add("active-room");
    li.onclick = () => joinRoom(r);
    gcListEl.appendChild(li);
  });
}

// Send GC message
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  firestore.collection("rooms").doc(room).collection("messages").add({
    user: username,
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  messageInput.value = "";
}
sendBtn.onclick = sendMessage;
messageInput.addEventListener("keypress", e => { if (e.key==="Enter") sendMessage(); });

// Change username
changeUsernameBtn.onclick = () => {
  const newUsername = prompt("Enter new username:", username);
  if (newUsername && newUsername !== username) username = newUsername;
  currentUsernameEl.textContent = username;
};

// Generate link
generateLinkBtn.onclick = () => {
  const url = window.location.origin + "?room=" + room;
  navigator.clipboard.writeText(url);
  alert("Room link copied: " + url);
};

// Join new room input
joinRoomBtn.onclick = () => {
  const newRoom = newRoomInput.value.trim();
  if (!newRoom) return;
  joinRoom(newRoom);
  newRoomInput.value = "";
};

// Users list with DM buttons (simulate live users here for demo)
function renderUsers(users) {
  userListEl.innerHTML = "";
  users.forEach(u => {
    if (u === username) return;
    const li = document.createElement("li");
    li.textContent = u;

    const dmBtn = document.createElement("button");
    dmBtn.textContent = "DM";
    dmBtn.className = "dm-btn";
    dmBtn.onclick = () => openDM(u);

    li.appendChild(dmBtn);
    userListEl.appendChild(li);
  });
}

// DM modal
function openDM(user) {
  currentDM = user;
  dmHeader.textContent = "DM with " + user;
  dmModal.classList.remove("hidden");
  renderDM();
}

function renderDM() {
  dmMessagesEl.innerHTML = "";
  if (!dms[currentDM]) dms[currentDM] = [];
  dms[currentDM].forEach(msg => {
    const div = document.createElement("div");
    div.innerHTML = msg;
    dmMessagesEl.appendChild(div);
  });
  dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
}

dmSendBtn.onclick = () => {
  const text = dmMessageInput.value.trim();
  if (!text) return;
  const msgDiv = `<b>${username}:</b> ${text}`;
  if (!dms[currentDM]) dms[currentDM] = [];
  dms[currentDM].push(msgDiv);
  renderDM();
  dmMessageInput.value = "";
};

dmCloseBtn.onclick = () => {
  dmModal.classList.add("hidden");
  currentDM = null;
};

// Initial setup
renderGClist();
joinRoom(room);
renderUsers(["Alice", "Bob", "Charlie", username]);
