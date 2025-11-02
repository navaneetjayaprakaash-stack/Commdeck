// ================================
// User setup & Firebase references
// ================================
let user = {
  uid: localStorage.getItem("uid") || "anon_" + Math.random().toString(36).slice(2, 9),
  name: localStorage.getItem("name") || "Guest-" + Math.floor(Math.random() * 1000),
};
localStorage.setItem("uid", user.uid);
localStorage.setItem("name", user.name);

const authBtn = document.getElementById("signInGoogle");
authBtn.style.display = "none"; // hide for now

const db = firebase.firestore();
const messagesCol = db.collection("messages");
const usersCol = db.collection("users");
const themesCol = db.collection("themes");

// ================================
// Socket.io & Current State
// ================================
let socket;
let currentRoom = "general";
let currentDm = null;
let dmList = {}; // uid -> name
let typingUsers = new Set();
const typingIndicator = document.createElement("div");
typingIndicator.className = 'typing-indicator';
typingIndicator.textContent = "Several users are typing...";
typingIndicator.style.display = 'none';

// ================================
// Theme & Styles
// ================================
const themes = {
  "Default": {bg: "#282c34", self: "#3c6e9d", other: "#4d5c6b"},
  "Light": {bg:"#fff", self:"#dfffe0", other:"#f3f3f3"},
  "Dark": {bg:"#1e1e1e", self:"#3b82f6", other:"#374151"},
  "Solarized": {bg:"#fdf6e3", self:"#b58900", other:"#2aa198"},
  "Monokai": {bg:"#272822", self:"#f92672", other:"#66d9ef"},
  "Dracula": {bg:"#282a36", self:"#6272a4", other:"#50fa7b"},
  "Night Owl": {bg:"#011627", self:"#ff5874", other:"#22da6e"},
  "Nord": {bg:"#2e3440", self:"#81a1c1", other:"#88c0d0"},
  "Gruvbox": {bg:"#282828", self:"#b8bb26", other:"#fabd2f"},
  "Cobalt": {bg:"#002240", self:"#ffcc00", other:"#6699cc"},
  "Material": {bg:"#263238", self:"#ff9800", other:"#4caf50"},
  "Oceanic": {bg:"#1b2b34", self:"#ec5f67", other:"#99c794"},
  "Palenight": {bg:"#292d3e", self:"#ff9d00", other:"#8caaee"},
  "Solarized Dark": {bg:"#002b36", self:"#268bd2", other:"#2aa198"},
  "High Contrast": {bg:"#000", self:"#0ff", other:"#f0f"},
  "Lavender": {bg:"#e6e6fa", self:"#9370db", other:"#b0c4de"},
  "Peach": {bg:"#ffe5b4", self:"#ff7f50", other:"#ffb347"},
  "Mint": {bg:"#e0f8f7", self:"#3eb489", other:"#66ff99"},
  "Sunset": {bg:"#ffcccb", self:"#ff6f61", other:"#ffd700"}
};

const styleConfig = {
  bgColor: localStorage.getItem("bgColor") || themes["Default"].bg,
  selfColor: localStorage.getItem("selfColor") || themes["Default"].self,
  otherColor: localStorage.getItem("otherColor") || themes["Default"].other,
  fontSize: localStorage.getItem("fontSize") || "14",
  isDarkMode: localStorage.getItem("isDark") === "true" || false,
};

// Apply styles
function applyStyles() {
  document.documentElement.style.setProperty("--bg", styleConfig.bgColor);
  document.documentElement.style.setProperty("--self-bubble", styleConfig.selfColor);
  document.documentElement.style.setProperty("--other-bubble", styleConfig.otherColor);
  document.documentElement.style.setProperty("--font-size", styleConfig.fontSize + "px");
  document.getElementById("bgColor").value = styleConfig.bgColor;
  document.getElementById("selfColor").value = styleConfig.selfColor;
  document.getElementById("otherColor").value = styleConfig.otherColor;
  document.getElementById("fontSize").value = styleConfig.fontSize;
}
applyStyles();

// Save to localStorage
function saveStyles() {
  localStorage.setItem("bgColor", styleConfig.bgColor);
  localStorage.setItem("selfColor", styleConfig.selfColor);
  localStorage.setItem("otherColor", styleConfig.otherColor);
  localStorage.setItem("fontSize", styleConfig.fontSize);
  localStorage.setItem("isDark", styleConfig.isDarkMode);
}

// ================================
// Init Socket.io
// ================================
function initSocket() {
  socket = io();
  joinRoom(currentRoom);

  socket.on("chatMessage", msg => {
    if (msg.uid === user.uid && Date.now() - msg.ts > 500) return;
    addMessage(msg, "chatPanel");
  });

  socket.on("privateMessage", ({msg, from}) => {
    openDm(msg.uid, from);
    addMessage(msg, "dmPanel");
  });

  socket.on("roomList", updateRoomList);
  socket.on("roomUsers", updateUserList);
  socket.on("typing", data => {
    if (data.uid !== user.uid) {
      typingUsers.add(data.name);
      updateTypingIndicator();
    }
  });
  socket.on("stopTyping", data => {
    typingUsers.delete(data.name);
    updateTypingIndicator();
  });
}

// ================================
// Rooms & DMs
// ================================
function joinRoom(room) {
  currentRoom = room;
  currentDm = null;
  clearMessages("chatPanel");
  document.getElementById("currentRoomLabel").textContent = room;
  socket.emit("joinRoom", {room, uid: user.uid, name: user.name});
  document.getElementById("chatTabBtn").classList.add("active");
  document.getElementById("dmTabBtn").classList.remove("active");
}

function createRoom() {
  const name = document.getElementById("newRoomInput").value.trim();
  if (!name) return;
  joinRoom(name);
  document.getElementById("newRoomInput").value = "";
}

function openDm(uid, name) {
  currentDm = {uid, name};
  if (!dmList[uid]) dmList[uid] = name;
  clearMessages("dmPanel");
  document.getElementById("chatPanel").style.display = "none";
  document.getElementById("dmPanel").style.display = "block";
  document.getElementById("currentRoomLabel").textContent = `DM: ${name}`;
  document.getElementById("dmTabBtn").classList.add("active");
  document.getElementById("chatTabBtn").classList.remove("active");
}

// ================================
// Sending Messages
// ================================
let typingTimer;
const TYPING_DELAY = 1000;

function sendMessage() {
  const input = document.getElementById("messageInput");
  if (!input.value.trim()) return;

  const msg = {
    from: user.name,
    uid: user.uid,
    text: input.value,
    ts: Date.now(),
    room: currentRoom
  };

  if (currentDm) {
    socket.emit("privateMessage", {toUid: currentDm.uid, msg});
    addMessage(msg, "dmPanel");
  } else {
    socket.emit("chatMessage", msg);
    messagesCol.add(msg); // store in Firestore
  }

  input.value = "";
  socket.emit("stopTyping", {uid: user.uid, name: user.name, room: currentRoom});
  clearTimeout(typingTimer);
}

function typing() {
  socket.emit("typing", {uid: user.uid, name: user.name, room: currentRoom});
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, TYPING_DELAY);
}

function stopTyping() {
  socket.emit("stopTyping", {uid: user.uid, name: user.name, room: currentRoom});
}

// ================================
// UI Helpers
// ================================
function addMessage(msg, panelId) {
  const panel = document.getElementById(panelId);
  const div = document.createElement("div");

  if (msg.system) {
    div.className = "msg system-msg";
    div.textContent = msg.text;
  } else {
    div.className = `msg ${msg.uid===user.uid?"self":"other"}`;
    const meta = document.createElement("div");
    meta.className="meta";
    meta.textContent = `${msg.from} • ${new Date(msg.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    const text = document.createElement("div");
    text.textContent = msg.text;
    div.appendChild(meta);
    div.appendChild(text);
  }

  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;
}

function clearMessages(panelId) {
  document.getElementById(panelId).innerHTML = "";
}

// Typing indicator
function updateTypingIndicator() {
  if (typingUsers.size === 0) {
    typingIndicator.style.display = 'none';
  } else {
    typingIndicator.textContent = typingUsers.size === 1
      ? `${Array.from(typingUsers)[0]} is typing...`
      : "Several users are typing...";
    typingIndicator.style.display = 'block';
  }
}

// ================================
// Event Listeners
// ================================
document.getElementById("sendBtn").onclick = sendMessage;
document.getElementById("messageInput").addEventListener("input", typing);
document.getElementById("messageInput").addEventListener("keypress", e => {if(e.key==="Enter")sendMessage();});
document.getElementById("createRoomBtn").onclick = createRoom;
document.getElementById("changeNameBtn").onclick = () => {
  const val = document.getElementById("displayNameInput").value.trim();
  if(val){user.name=val;localStorage.setItem("name",val);document.getElementById("displayName").textContent=val;}
};
document.getElementById("chatTabBtn").onclick = () => {
  currentDm = null; document.getElementById("chatPanel").style.display="block"; document.getElementById("dmPanel").style.display="none"; document.getElementById("currentRoomLabel").textContent=currentRoom; document.getElementById("chatTabBtn").classList.add("active"); document.getElementById("dmTabBtn").classList.remove("active");
};
document.getElementById("dmTabBtn").onclick = () => {
  document.getElementById("chatPanel").style.display="none"; document.getElementById("dmPanel").style.display="block"; document.getElementById("currentRoomLabel").textContent=currentDm?`DM: ${currentDm.name}`:"DMs"; document.getElementById("dmTabBtn").classList.add("active"); document.getElementById("chatTabBtn").classList.remove("active");
};
document.getElementById("clearBtn").onclick = () => {clearMessages("chatPanel"); clearMessages("dmPanel");};

// Theme selector
const themeSelect = document.getElementById("themeSelect");
Object.keys(themes).forEach(t=>{
  const opt = document.createElement("option"); opt.value=t; opt.textContent=t; themeSelect.appendChild(opt);
});
themeSelect.onchange = () => {
  const sel = themes[themeSelect.value];
  styleConfig.bgColor=sel.bg; styleConfig.selfColor=sel.self; styleConfig.otherColor=sel.other; applyStyles(); saveStyles();
};

// Color inputs
document.getElementById("bgColor").oninput = e=>{styleConfig.bgColor=e.target.value; applyStyles(); saveStyles();};
document.getElementById("selfColor").oninput = e=>{styleConfig.selfColor=e.target.value; applyStyles(); saveStyles();};
document.getElementById("otherColor").oninput = e=>{styleConfig.otherColor=e.target.value; applyStyles(); saveStyles();};
document.getElementById("fontSize").oninput = e=>{styleConfig.fontSize=e.target.value; applyStyles(); saveStyles();};

window.onload = ()=>{
  document.getElementById("displayName").textContent=user.name;
  document.getElementById("displayUid").textContent=user.uid;
  initSocket();
  document.getElementById("chatPanel").appendChild(typingIndicator);
};
