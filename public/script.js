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
// Init Socket.io
// ================================
function initSocket() {
  socket = io();

  const params = new URLSearchParams(window.location.search);
  if (params.get("room")) currentRoom = params.get("room");

  joinRoom(currentRoom);

  socket.on("chatMessage", (msg) => {
    // skip own echo
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
    // DM (server does not echo)
    socket.emit("privateMessage", { toUid: currentDm.uid, msg });
    addMessage(msg, "dmPanel");
  } else {
    // Chat (server echoes → ignore own echo later)
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

  // Add to sidebar list if not already there
  if (!dmList[uid]) {
    dmList[uid] = name;
    updateDmList();
  }

  clearMessages("dmPanel");
  document.getElementById("chatPanel").style.display = "none";
  document.getElementById("dmPanel").style.display = "block";
  document.getElementById("currentRoomLabel").textContent = `DM: ${name}`;
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

document.getElementById("chatTabBtn").onclick = () => {
  currentDm = null;
  document.getElementById("chatPanel").style.display = "block";
  document.getElementById("dmPanel").style.display = "none";
  document.getElementById("currentRoomLabel").textContent = currentRoom;
};

// ================================
// UI Helpers
// ================================
function addMessage(msg, panelId) {
  const div = document.createElement("div");
  div.className = "msg" + (msg.uid === user.uid ? " self" : " other");

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = msg.system
    ? `[System] ${msg.text}`
    : `${msg.from} • ${new Date(msg.ts).toLocaleTimeString()}`;

  const text = document.createElement("div");
  if (!msg.system) text.textContent = msg.text;

  div.appendChild(meta);
  if (!msg.system) div.appendChild(text);

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
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = room;
    li.style.cursor = "pointer";
    li.onclick = () => joinRoom(room);

    // Copy link button
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "🔗";
    copyBtn.style.marginLeft = "8px";
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      const url = `${window.location.origin}/?room=${room}`;
      navigator.clipboard.writeText(url);
      alert(`Copied link: ${url}`);
    };

    li.appendChild(copyBtn);
    list.appendChild(li);
  });
}

function updateUserList(users) {
  const list = document.getElementById("userList");
  if (!list) return;
  list.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u.name;
    li.style.cursor = "pointer";
    li.onclick = () => openDm(u.uid, u.name);
    list.appendChild(li);
  });
}

// ================================
// Customization Panel
// ================================
document.getElementById("bgColor").addEventListener("input", (e) => {
  document.body.style.backgroundColor = e.target.value;
});

document.getElementById("selfColor").addEventListener("input", (e) => {
  document.documentElement.style.setProperty("--self-bg", e.target.value);
});

document.getElementById("otherColor").addEventListener("input", (e) => {
  document.documentElement.style.setProperty("--other-bg", e.target.value);
});

document.getElementById("fontSize").addEventListener("input", (e) => {
  document.getElementById("chatPanel").style.fontSize = e.target.value + "px";
  document.getElementById("dmPanel").style.fontSize = e.target.value + "px";
});

document.getElementById("resetCustomize").onclick = () => {
  document.documentElement.style.setProperty("--bg", "#ffffff");
  document.documentElement.style.setProperty("--self-bg", "#dfffe0");
  document.documentElement.style.setProperty("--other-bg", "#f3f3f3");
  document.getElementById("chatPanel").style.fontSize = "14px";
  document.getElementById("dmPanel").style.fontSize = "14px";
};

// ================================
// Init on page load
// ================================
window.onload = () => {
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
      joinRoom(currentRoom);
    }
  };

  // Hide unused Google Sign-In button
  const signInBtn = document.getElementById("signInGoogle");
  if (signInBtn) signInBtn.style.display = "none";

  // Set initial labels
  document.getElementById("displayName").textContent = user.name;
  document.getElementById("displayUid").textContent = user.uid;

  // Show "No conversations yet"
  updateDmList();
};
