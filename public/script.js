// ================================
// Persistent User Setup
// ================================
let user = JSON.parse(localStorage.getItem("chatUser")) || {
  uid: "anon_" + Math.random().toString(36).slice(2, 9),
  name: "Guest-" + Math.floor(Math.random() * 1000),
};
localStorage.setItem("chatUser", JSON.stringify(user));

let socket;
let currentRoom = "general";
let currentDm = null;
let dmList = {}; // uid -> name

// ================================
// Themes
// ================================
const themes = {
  Default: { bg: "#282c34", sidebar: "#21252b", self: "#3c6e9d", other: "#4d5c6b", text: "#e0e0e0", panel: "#2d323a" },
  Light: { bg: "#f5f5f5", sidebar: "#e0e0e0", self: "#d0f0c0", other: "#f0f0f0", text: "#333", panel: "#fff" },
  Red: { bg: "#2b0000", sidebar: "#400000", self: "#ff4c4c", other: "#990000", text: "#fff", panel: "#3d0000" },
  Blue: { bg: "#001f3f", sidebar: "#001033", self: "#0074d9", other: "#001f7f", text: "#e0e0e0", panel: "#001a33" },
  Green: { bg: "#002b00", sidebar: "#003d00", self: "#2ecc40", other: "#004d00", text: "#e0e0e0", panel: "#003300" },
  Purple: { bg: "#220022", sidebar: "#330033", self: "#b10dc9", other: "#660066", text: "#fff", panel: "#330033" },
  Orange: { bg: "#331a00", sidebar: "#4d2600", self: "#ff851b", other: "#663300", text: "#fff", panel: "#4d2600" },
  Pink: { bg: "#330022", sidebar: "#4d0033", self: "#ff69b4", other: "#660044", text: "#fff", panel: "#4d0033" },
  Teal: { bg: "#003333", sidebar: "#004d4d", self: "#39cccc", other: "#006666", text: "#fff", panel: "#004d4d" },
  Yellow: { bg: "#333300", sidebar: "#4d4d00", self: "#ffdc00", other: "#666600", text: "#fff", panel: "#4d4d00" },
  Cyan: { bg: "#002233", sidebar: "#00334d", self: "#00ffff", other: "#004466", text: "#fff", panel: "#00334d" },
  Lime: { bg: "#1a3300", sidebar: "#264d00", self: "#01ff70", other: "#336600", text: "#fff", panel: "#264d00" },
  Indigo: { bg: "#100033", sidebar: "#1a004d", self: "#6610f2", other: "#330066", text: "#fff", panel: "#1a004d" },
  Brown: { bg: "#331a0d", sidebar: "#4d260f", self: "#a0522d", other: "#663300", text: "#fff", panel: "#4d260f" },
  Grey: { bg: "#1a1a1a", sidebar: "#2d2d2d", self: "#888", other: "#555", text: "#fff", panel: "#2d2d2d" },
  Coral: { bg: "#331a1a", sidebar: "#4d2d2d", self: "#ff7f50", other: "#662020", text: "#fff", panel: "#4d2d2d" },
  Mint: { bg: "#001a14", sidebar: "#00332b", self: "#3eb489", other: "#005940", text: "#fff", panel: "#00332b" },
  Navy: { bg: "#000033", sidebar: "#00004d", self: "#0011ff", other: "#000066", text: "#fff", panel: "#00004d" },
  Olive: { bg: "#1a1a00", sidebar: "#333300", self: "#808000", other: "#4d4d00", text: "#fff", panel: "#333300" }
};

let styleConfig = JSON.parse(localStorage.getItem("chatTheme")) || { theme: "Default", fontSize: 14 };

function applyTheme() {
  const t = themes[styleConfig.theme];
  document.documentElement.style.setProperty("--bg", t.bg);
  document.documentElement.style.setProperty("--sidebar-bg", t.sidebar);
  document.documentElement.style.setProperty("--self-bubble", t.self);
  document.documentElement.style.setProperty("--other-bubble", t.other);
  document.documentElement.style.setProperty("--text-color", t.text);
  document.documentElement.style.setProperty("--panel-bg", t.panel);
  document.documentElement.style.setProperty("--font-size", styleConfig.fontSize + "px");
  document.getElementById("themeSelect").value = styleConfig.theme;
}
function saveTheme() {
  localStorage.setItem("chatTheme", JSON.stringify(styleConfig));
}

// ================================
// Socket.io + message history
// ================================
let typingUsers = new Set();
let typingIndicator = document.createElement("div");
typingIndicator.className = "typing-indicator";
typingIndicator.style.display = "none";

function initSocket() {
  socket = io();

  socket.on("chatHistory", (history) => {
    clearMessages("chatPanel");
    history.forEach((msg) => addMessage(msg, "chatPanel"));
    scrollChat();
  });

  socket.on("dmHistory", (dmHistory) => {
    clearMessages("dmPanel");
    dmHistory.forEach((msg) => addMessage(msg, "dmPanel"));
    scrollChat();
  });

  socket.on("chatMessage", (msg) => {
    addMessage(msg, currentDm ? "dmPanel" : "chatPanel");
    scrollChat();
  });

  socket.on("privateMessage", (msg) => {
    openDm(msg.uid, msg.from);
    addMessage(msg, "dmPanel");
    scrollChat();
  });

  socket.on("typing", (data) => {
    if (data.uid !== user.uid) {
      typingUsers.add(data.name);
      updateTypingIndicator();
    }
  });

  socket.on("stopTyping", (data) => {
    if (data.uid !== user.uid) {
      typingUsers.delete(data.name);
      updateTypingIndicator();
    }
  });

  joinRoom(currentRoom);
}

// ================================
// Room / DM Handling
// ================================
function joinRoom(room) {
  currentRoom = room;
  currentDm = null;
  clearMessages("chatPanel");
  document.getElementById("currentRoomLabel").textContent = room;
  socket.emit("joinRoom", { room, uid: user.uid, name: user.name });
  document.getElementById("chatPanel").appendChild(typingIndicator);
}

function openDm(uid, name) {
  currentDm = { uid, name };
  if (!dmList[uid]) dmList[uid] = name;
  updateDmList();
  clearMessages("dmPanel");
  document.getElementById("chatPanel").style.display = "none";
  document.getElementById("dmPanel").style.display = "block";
  document.getElementById("currentRoomLabel").textContent = `DM: ${name}`;
}

// ================================
// UI: Messages / Typing / Banners
// ================================
function addMessage(msg, panelId) {
  const panel = document.getElementById(panelId);
  const div = document.createElement("div");

  // WhatsApp-style day banner
  const lastDate = panel.lastChild?.dataset?.date;
  const msgDate = new Date(msg.ts).toDateString();
  if (lastDate !== msgDate) {
    const banner = document.createElement("div");
    banner.textContent = msgDate;
    banner.className = "system-msg";
    banner.style.textAlign = "center";
    banner.style.fontWeight = "bold";
    banner.style.margin = "8px 0";
    banner.dataset.date = msgDate;
    panel.appendChild(banner);
  }

  if (msg.system) {
    div.className = "msg system-msg";
    div.textContent = msg.text;
  } else {
    div.className = `msg ${msg.uid === user.uid ? "self" : "other"}`;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${msg.from} • ${new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const text = document.createElement("div");
    text.textContent = msg.text;
    div.appendChild(meta);
    div.appendChild(text);
  }
  panel.appendChild(div);
}

function clearMessages(panelId) {
  document.getElementById(panelId).innerHTML = "";
}

function scrollChat() {
  const panel = currentDm ? document.getElementById("dmPanel") : document.getElementById("chatPanel");
  panel.scrollTop = panel.scrollHeight;
}

function updateTypingIndicator() {
  if (typingUsers.size === 0) typingIndicator.style.display = "none";
  else {
    typingIndicator.style.display = "block";
    typingIndicator.textContent =
      typingUsers.size === 1 ? Array.from(typingUsers)[0] + " is typing..." : "Several users are typing...";
  }
}

// ================================
// Send Messages / Typing
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
    room: currentRoom,
  };

  if (currentDm) {
    socket.emit("privateMessage", { toUid: currentDm.uid, msg });
    addMessage(msg, "dmPanel");
  } else {
    socket.emit("chatMessage", msg);
    addMessage(msg, "chatPanel");
  }

  input.value = "";
  socket.emit("stopTyping", { uid: user.uid, name: user.name, room: currentRoom });
  clearTimeout(typingTimer);
}

function typing() {
  socket.emit("typing", { uid: user.uid, name: user.name, room: currentRoom });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, TYPING_DELAY);
}

function stopTyping() {
  socket.emit("stopTyping", { uid: user.uid, name: user.name, room: currentRoom });
}

// ================================
// DM List / Rooms
// ================================
function updateDmList() {
  const list = document.getElementById("dmList");
  list.innerHTML = "";
  const entries = Object.entries(dmList);
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No conversations yet";
    empty.className = "notice";
    list.appendChild(empty);
    return;
  }
  entries.forEach(([uid, name]) => {
    const li = document.createElement("li");
    li.textContent = name;
    li.onclick = () => openDm(uid, name);
    list.appendChild(li);
  });
}

// ================================
// Event Listeners
// ================================
function attachEventListeners() {
  document.getElementById("messageInput").addEventListener("input", typing);
  document.getElementById("sendBtn").onclick = sendMessage;
  document.getElementById("messageInput").addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

  const themeSelect = document.getElementById("themeSelect");
  themeSelect.innerHTML = Object.keys(themes)
    .map((t) => `<option value="${t}">${t}</option>`)
    .join("");
  themeSelect.value = styleConfig.theme;
  themeSelect.onchange = () => {
    styleConfig.theme = themeSelect.value;
    saveTheme();
    applyTheme();
  };
}

// ================================
// Init
// ================================
window.onload = () => {
  applyTheme();
  attachEventListeners();
  initSocket();
  document.getElementById("displayName").textContent = user.name;
};
