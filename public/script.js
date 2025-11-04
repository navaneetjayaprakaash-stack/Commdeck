import { db, collection, addDoc, query, orderBy, onSnapshot } from "../firebase.js";

const socket = io();

// Auto-generated username if none
let username = "User" + Math.floor(Math.random() * 1000);
// Auto join room from URL ?room=xyz
let room = new URLSearchParams(window.location.search).get("room") || "general";

// DOM elements
const messagesEl = document.getElementById("messages");
const userListEl = document.getElementById("userList");
const currentUsernameEl = document.getElementById("currentUsername");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const generateLinkBtn = document.getElementById("generateLinkBtn");
const themeSelect = document.getElementById("themeSelect");

// Display current username
currentUsernameEl.textContent = username;

// Named themes
const themes = [
  { id: "theme1", name: "Sunset Glow" },
  { id: "theme2", name: "Purple Haze" },
  { id: "theme3", name: "Deep Ocean" },
  { id: "theme4", name: "Royal Blue" },
  { id: "theme5", name: "Sky Breeze" },
  { id: "theme6", name: "Hot Pink" },
  { id: "theme7", name: "Molten Orange" },
  { id: "theme8", name: "Golden Hour" },
  { id: "theme9", name: "Rose Red" },
  { id: "theme10", name: "Violet Dream" },
  { id: "theme11", name: "Indigo Night" },
  { id: "theme12", name: "Mystic Purple" },
  { id: "theme13", name: "Fuchsia Glow" },
  { id: "theme14", name: "Electric Blue" },
  { id: "theme15", name: "Aqua Mist" },
  { id: "theme16", name: "Magenta Pulse" },
  { id: "theme17", name: "Blazing Orange" },
  { id: "theme18", name: "Sunlit Gold" },
  { id: "theme19", name: "Royal Violet" },
  { id: "theme20", name: "Night Indigo" }
];

// Populate theme dropdown
themes.forEach(t => {
  const opt = document.createElement("option");
  opt.value = t.id;       // applies CSS variables
  opt.textContent = t.name; // displayed in dropdown
  themeSelect.appendChild(opt);
});

// Apply selected theme
themeSelect.onchange = () => {
  document.body.setAttribute("data-theme", themeSelect.value);
  localStorage.setItem("selectedTheme", themeSelect.value);
};

// Apply previously saved theme
const savedTheme = localStorage.getItem("selectedTheme");
if (savedTheme) {
  document.body.setAttribute("data-theme", savedTheme);
  themeSelect.value = savedTheme;
}

// Auto join room
socket.emit("joinRoom", { username, room });

// Send message
sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit("chatMessage", { user: username, text, room });
  messageInput.value = "";
};

// Receive messages
socket.on("chatMessage", addMessage);

// Update user list
socket.on("userList", users => {
  userListEl.innerHTML = "";
  users.forEach(u => {
    if (u.username === username) return;
    const li = document.createElement("li");
    li.textContent = u.username;
    li.onclick = () => {
      const text = prompt(`Send DM to ${u.username}:`);
      if (text) socket.emit("privateMessage", { to: u.id, text });
    };
    userListEl.appendChild(li);
  });
});

// Change username
changeUsernameBtn.onclick = () => {
  const newUsername = prompt("Enter new username:", username);
  if (newUsername && newUsername !== username) {
    socket.emit("changeUsername", newUsername);
    username = newUsername;
    currentUsernameEl.textContent = username;
  }
};

// Generate room link
generateLinkBtn.onclick = () => {
  const url = window.location.origin + "?room=" + room;
  navigator.clipboard.writeText(url);
  alert("Room link copied: " + url);
};

// Add message to chat
function addMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  if (msg.user === "System") div.classList.add("system");
  else if (msg.user === username) div.classList.add("self");
  else div.classList.add("other");
  div.innerHTML = msg.user === "System" ? msg.text : `<b>${msg.user}:</b> ${msg.text}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
