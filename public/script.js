const socket = io();
let username = localStorage.username || prompt("Enter username:");
localStorage.username = username;

let currentRoom = "general";
let dmTarget = null;

document.getElementById("currentRoom").textContent = currentRoom;

socket.emit("join", { username, room: currentRoom });

// UI Elements
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chat-messages");
const roomList = document.getElementById("roomList");
const userList = document.getElementById("userList");

const dmPanel = document.getElementById("dm-panel");
const dmUser = document.getElementById("dmUser");
const dmMessages = document.getElementById("dm-messages");
const dmInput = document.getElementById("dmInput");
const dmSend = document.getElementById("dmSend");

const themeSelect = document.getElementById("themeSelect");

// Load Themes
const themes = [...document.styleSheets[0].cssRules]
  .filter(r => r.selectorText?.startsWith("body[data-theme"))
  .map(r => r.selectorText.match(/'(.+)'/)[1]);

themes.forEach(t => {
  let opt = document.createElement("option");
  opt.value = t;
  opt.textContent = t;
  themeSelect.appendChild(opt);
});

themeSelect.value = localStorage.theme || "default";
document.body.dataset.theme = themeSelect.value;
themeSelect.onchange = () => {
  localStorage.theme = themeSelect.value;
  document.body.dataset.theme = themeSelect.value;
};

// Persistent Room History
function saveRoomMessage(room, msg) {
  let logs = JSON.parse(localStorage.getItem("room_" + room) || "[]");
  logs.push(msg);
  localStorage.setItem("room_" + room, JSON.stringify(logs));
}

function loadRoomMessages(room) {
  chatMessages.innerHTML = "";
  (JSON.parse(localStorage.getItem("room_" + room) || "[]")).forEach(printMessage);
}

function printMessage({ sender, text, system }) {
  let div = document.createElement("div");
  div.className = system ? "message system" : (sender === username ? "message self" : "message other");
  div.textContent = system ? text : `${sender}: ${text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Persistent DM History
function saveDM(user, msg) {
  let logs = JSON.parse(localStorage.getItem("dm_" + user) || "[]");
  logs.push(msg);
  localStorage.setItem("dm_" + user, JSON.stringify(logs));
}

function loadDM(user) {
  dmMessages.innerHTML = "";
  (JSON.parse(localStorage.getItem("dm_" + user) || "[]")).forEach(msg => {
    let div = document.createElement("div");
    div.className = msg.from === username ? "message self" : "message other";
    div.textContent = msg.text;
    dmMessages.appendChild(div);
  });
  dmMessages.scrollTop = dmMessages.scrollHeight;
}

// Room Switch
function joinRoom(r) {
  currentRoom = r;
  document.getElementById("currentRoom").textContent = r;
  socket.emit("join", { username, room: r });
  loadRoomMessages(r);
}

// Send Room Message
sendBtn.onclick = () => {
  let text = msgInput.value.trim();
  if (!text) return;
  socket.emit("chatMessage", { sender: username, room: currentRoom, text });
  saveRoomMessage(currentRoom, { sender: username, text });
  msgInput.value = "";
};

// Receive Room Message
socket.on("message", msg => {
  saveRoomMessage(currentRoom, msg);
  printMessage(msg);
});

// Update Users
socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach(u => {
    if (u.username === username) return;
    let li = document.createElement("li");
    li.textContent = u.username;
    li.onclick = () => openDM(u.username);
    userList.appendChild(li);
  });
});

// Open DM
function openDM(user) {
  dmTarget = user;
  dmPanel.classList.remove("hidden");
  dmUser.textContent = user;
  loadDM(user);
}

document.getElementById("closeDM").onclick = () => dmPanel.classList.add("hidden");

// Send DM
dmSend.onclick = () => {
  let text = dmInput.value.trim();
  if (!text) return;

  socket.emit("dm", { to: dmTarget, from: username, text });

  saveDM(dmTarget, { from: username, text });
  loadDM(dmTarget);

  dmInput.value = "";
};

// Receive DM
socket.on("dm", ({ from, to, text }) => {
  let other = from === username ? to : from;
  saveDM(other, { from, text });

  if (dmTarget === other) loadDM(other);
});

// Rooms List
["general", "gaming", "school", "random"].forEach(r => {
  let li = document.createElement("li");
  li.textContent = r;
  li.onclick = () => joinRoom(r);
  roomList.appendChild(li);
});

loadRoomMessages(currentRoom);
