// ================================
// User setup (no auth, random ID)
// ================================
const user = {
  uid: "anon_" + Math.random().toString(36).slice(2, 9),
  name: "Guest-" + Math.floor(Math.random() * 1000),
};
let socket;
let currentRoom = "general";
let currentDm = null;
let dmList = {}; // store DMs by uid

// ================================
// Customization
// ================================
const styleConfig = {
  bgColor: "#282c34",
  selfColor: "#3c6e9d",
  otherColor: "#4d5c6b",
  fontSize: "14",
  isDarkMode: true,
};
function saveStyles() {
  localStorage.setItem('styleConfig', JSON.stringify(styleConfig));
}
function loadStyles() {
  const savedStyles = localStorage.getItem('styleConfig');
  if (savedStyles) {
    const loadedConfig = JSON.parse(savedStyles);
    Object.assign(styleConfig, loadedConfig);
    applyStyles();
  } else {
    // Check for system preference on first load
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (!prefersDark) {
      styleConfig.isDarkMode = false;
      resetStyles(); // Use the light theme defaults
    }
    applyStyles();
  }
}
function applyStyles() {
  if (styleConfig.isDarkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  document.documentElement.style.setProperty("--bg", styleConfig.bgColor);
  document.documentElement.style.setProperty("--self-bubble", styleConfig.selfColor);
  document.documentElement.style.setProperty("--other-bubble", styleConfig.otherColor);
  document.documentElement.style.setProperty("--font-size", `${styleConfig.fontSize}px`);
  document.getElementById("bgColor").value = styleConfig.bgColor;
  document.getElementById("selfColor").value = styleConfig.selfColor;
  document.getElementById("otherColor").value = styleConfig.otherColor;
  document.getElementById("fontSize").value = styleConfig.fontSize;
}
function resetStyles() {
  styleConfig.bgColor = "#ffffff";
  styleConfig.selfColor = "#dcf8c6";
  styleConfig.otherColor = "#e5e5ea";
  styleConfig.fontSize = "14";
  styleConfig.isDarkMode = false;
  saveStyles();
  applyStyles();
}
function toggleDarkMode() {
  styleConfig.isDarkMode = !styleConfig.isDarkMode;
  if (styleConfig.isDarkMode) {
    styleConfig.bgColor = "#282c34";
    styleConfig.selfColor = "#3c6e9d";
    styleConfig.otherColor = "#4d5c6b";
  } else {
    styleConfig.bgColor = "#ffffff";
    styleConfig.selfColor = "#dcf8c6";
    styleConfig.otherColor = "#e5e5ea";
  }
  saveStyles();
  applyStyles();
}

// ================================
// Init Socket.io
// ================================
function initSocket() {
  socket = io();
  const params = new URLSearchParams(window.location.search);
  if (params.get("room")) currentRoom = params.get("room");
  joinRoom(currentRoom);
  socket.on("chatMessage", (msg) => {
    if (msg.uid !== user.uid) addMessage(msg, "chatPanel");
  });
  socket.on("privateMessage", (msg) => {
    openDm(msg.uid, msg.from);
    addMessage(msg, "dmPanel");
  });
  socket.on("roomList", (rooms) => {
    updateRoomList(rooms);
  });
  socket.on("roomUsers", (users) => {
    updateUserList(users);
    document.getElementById("roomCount").textContent = `(${users.length})`;
  });
}

// ================================
// Room Join / Leave
// ================================
function joinRoom(room) {
  currentRoom = room;
  currentDm = null;
  clearMessages("chatPanel");
  document.getElementById("currentRoomLabel").textContent = room;
  socket.emit("joinRoom", { room, uid: user.uid, name: user.name });
  // Add active class to chat tab
  document.getElementById("chatTabBtn").classList.add("active");
  document.getElementById("dmTabBtn").classList.remove("active");
}
function createRoom() {
  const name = document.getElementById("newRoomInput").value.trim();
  if (!name) return;
  joinRoom(name);
  document.getElementById("newRoomInput").value = "";
}

// ================================
// Sending Messages
// ================================
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
}

// ================================
// DM System
// ================================
function openDm(uid, name) {
  currentDm = { uid, name };
  if (!dmList[uid]) {
    dmList[uid] = name;
    updateDmList();
  }
  clearMessages("dmPanel");
  document.getElementById("chatPanel").style.display = "none";
  document.getElementById("dmPanel").style.display = "block";
  document.getElementById("currentRoomLabel").textContent = `DM: ${name}`;
  // Add active class to DM tab
  document.getElementById("dmTabBtn").classList.add("active");
  document.getElementById("chatTabBtn").classList.remove("active");
}
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
// UI Helpers
// ================================
function addMessage(msg, panelId) {
  const div = document.createElement("div");
  if (msg.system) {
    div.className = "msg system-msg";
    div.textContent = msg.text;
  } else {
    div.className = `msg ${msg.uid === user.uid ? "self" : "other"}`;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${msg.from} • ${new Date(msg.ts).toLocaleTimeString()}`;
    const text = document.createElement("div");
    text.textContent = msg.text;
    div.appendChild(meta);
    div.appendChild(text);
  }
  const panel = document.getElementById(panelId);
  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;
}
function clearMessages(panelId) {
  document.getElementById(panelId).innerHTML = "";
}
function updateRoomList(rooms) {
  const list = document.getElementById("roomList");
  list.innerHTML = "";
  if (rooms.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No rooms yet";
    empty.className = "notice";
    list.appendChild(empty);
    return;
  }
  rooms.forEach((room) => {
    const li = document.createElement("li");
    const roomNameSpan = document.createElement("span");
    roomNameSpan.textContent = room;
    li.onclick = () => joinRoom(room);
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "🔗";
    copyBtn.className = "icon-btn";
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      const url = `${window.location.origin}/?room=${room}`;
      navigator.clipboard.writeText(url);
      alert(`Copied link: ${url}`);
    };
    li.appendChild(roomNameSpan);
    li.appendChild(copyBtn);
    list.appendChild(li);
  });
}
function updateUserList(users) {
  const list = document.getElementById("userList");
  if (!list) return;
  list.innerHTML = "";
  if (users.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No users online";
    empty.className = "notice";
    list.appendChild(empty);
    return;
  }
  users.forEach((u) => {
    const li = document.createElement("li");
    const userNameSpan = document.createElement("span");
    userNameSpan.textContent = u.name;
    const dmBtn = document.createElement("button");
    dmBtn.textContent = '💬';
    dmBtn.className = 'icon-btn';
    dmBtn.onclick = (e) => {
      e.stopPropagation();
      openDm(u.uid, u.name);
    };
    li.appendChild(userNameSpan);
    li.appendChild(dmBtn);
    list.appendChild(li);
  });
}

// ================================
// Event Listeners & Init
// ================================
document.getElementById("chatTabBtn").onclick = () => {
  currentDm = null;
  document.getElementById("chatPanel").style.display = "block";
  document.getElementById("dmPanel").style.display = "none";
  document.getElementById("currentRoomLabel").textContent = currentRoom;
  document.getElementById("chatTabBtn").classList.add("active");
  document.getElementById("dmTabBtn").classList.remove("active");
};
document.getElementById("dmTabBtn").onclick = () => {
  if (!currentDm) {
    document.getElementById("currentRoomLabel").textContent = "DMs";
  }
  document.getElementById("chatPanel").style.display = "none";
  document.getElementById("dmPanel").style.display = "block";
  document.getElementById("dmTabBtn").classList.add("active");
  document.getElementById("chatTabBtn").classList.remove("active");
};
document.getElementById("bgColor").addEventListener("input", (e) => {
  styleConfig.bgColor = e.target.value;
  saveStyles();
  applyStyles();
});
document.getElementById("selfColor").addEventListener("input", (e) => {
  styleConfig.selfColor = e.target.value;
  saveStyles();
  applyStyles();
});
document.getElementById("otherColor").addEventListener("input", (e) => {
  styleConfig.otherColor = e.target.value;
  saveStyles();
  applyStyles();
});
document.getElementById("fontSize").addEventListener("input", (e) => {
  styleConfig.fontSize = e.target.value;
  saveStyles();
  applyStyles();
});
document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("resetCustomize").onclick = resetStyles;

window.onload = () => {
  loadStyles();
  initSocket();
  document.getElementById("sendBtn").onclick = sendMessage;
  document.getElementById("messageInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
  document.getElementById("clearBtn").onclick = () => {
    clearMessages("chatPanel");
    clearMessages("dmPanel");
  };
  document.getElementById("createRoomBtn").onclick = createRoom;
  document.getElementById("changeNameBtn").onclick = () => {
    const val = document.getElementById("displayNameInput").value.trim();
    if (val) {
      user.name = val;
      document.getElementById("displayName").textContent = val;
      socket.emit("changeName", { uid: user.uid, name: user.name });
    }
  };
  const signInBtn = document.getElementById("signInGoogle");
  if (signInBtn) signInBtn.style.display = "none";
  document.getElementById("displayName").textContent = user.name;
  document.getElementById("displayUid").textContent = user.uid;
  updateDmList();
};
