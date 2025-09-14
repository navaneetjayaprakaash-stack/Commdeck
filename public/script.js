// ================================
// Firebase Setup (no auth required)
// ================================
const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b6sk70s4vbxJt-H0NGk",
  authDomain: "my-chat-room-1d84f.firebaseapp.com",
  projectId: "my-chat-room-1d84f",
  storageBucket: "my-chat-room-1d84f.firebasestorage.app",
  messagingSenderId: "747796328971",
  appId: "1:747796328971:web:beb5c15265855e169e8d0e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Generate a random ID for this user (since no auth)
const user = {
  uid: "anon_" + Math.random().toString(36).slice(2, 9),
  name: "Guest-" + Math.floor(Math.random() * 1000)
};

let socket;
let currentRoom = "general";
let currentDm = null;

// ================================
// Init Socket.io
// ================================
function initSocket() {
  socket = io();

  const params = new URLSearchParams(window.location.search);
  if (params.get("room")) currentRoom = params.get("room");

  joinRoom(currentRoom);

  socket.on("chatMessage", (msg) => {
    addMessage(msg, "chatPanel");
  });

  socket.on("privateMessage", (msg) => {
    openDm(msg.uid, msg.from);
    addMessage(msg, "dmPanel");
  });

  socket.on("updateMessage", ({ messageId, changes }) => {
    const el = document.querySelector(`[data-id="${messageId}"]`);
    if (!el) return;
    if (changes.text) {
      el.querySelector(".text").textContent = changes.text + " (edited)";
    }
    if (changes.reaction) {
      el.querySelector(".reactions").textContent = changes.reaction;
    }
  });

  socket.on("deleteMessage", ({ messageId }) => {
    const el = document.querySelector(`[data-id="${messageId}"]`);
    if (el) el.remove();
  });

  updateRoomList(["general", "random"]);
}

// ================================
// Room Join / Leave
// ================================
async function joinRoom(room) {
  currentRoom = room;
  currentDm = null;
  clearMessages("chatPanel");

  socket.emit("joinRoom", { room, uid: user.uid, name: user.name });

  const messages = await loadMessages(room);
  messages.forEach((m) => addMessage(m, "chatPanel"));
}

function createRoom() {
  const name = document.getElementById("newRoom").value.trim();
  if (!name) return;
  joinRoom(name);
  updateRoomList(["general", "random", name]);
}

function updateRoomList(rooms) {
  const list = document.getElementById("roomList");
  list.innerHTML = "";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = room;
    li.style.cursor = "pointer";
    li.onclick = () => joinRoom(room);
    list.appendChild(li);
  });
}

// ================================
// Firestore Persistence
// ================================
async function saveMessage(room, msg) {
  const doc = await db.collection("rooms").doc(room).collection("messages").add(msg);
  return doc.id;
}

async function loadMessages(room) {
  const snap = await db.collection("rooms").doc(room).collection("messages")
    .orderBy("ts", "asc").limit(50).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function getDmId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

async function saveDm(toUid, msg) {
  const dmId = getDmId(user.uid, toUid);
  const doc = await db.collection("dms").doc(dmId).collection("messages").add(msg);
  return doc.id;
}

async function loadDm(toUid) {
  const dmId = getDmId(user.uid, toUid);
  const snap = await db.collection("dms").doc(dmId).collection("messages")
    .orderBy("ts", "asc").limit(50).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ================================
// Sending Messages
// ================================
async function sendMessage() {
  const input = document.getElementById("messageInput");
  if (!input.value.trim()) return;

  const msg = {
    from: user.name,
    uid: user.uid,
    text: input.value,
    ts: Date.now()
  };

  if (currentDm) {
    const id = await saveDm(currentDm.uid, msg);
    msg.id = id;
    socket.emit("privateMessage", { toUid: currentDm.uid, msg });
    addMessage(msg, "dmPanel");
  } else {
    const id = await saveMessage(currentRoom, msg);
    msg.id = id;
    socket.emit("chatMessage", msg);
    addMessage(msg, "chatPanel");
  }

  input.value = "";
}

// ================================
// DM Panel
// ================================
async function openDm(uid, name) {
  currentDm = { uid, name };
  clearMessages("dmPanel");

  document.getElementById("chatPanel").style.display = "none";
  document.getElementById("dmPanel").style.display = "block";

  const messages = await loadDm(uid);
  messages.forEach((m) => addMessage(m, "dmPanel"));
}

document.getElementById("chatTabBtn").onclick = () => {
  currentDm = null;
  document.getElementById("chatPanel").style.display = "block";
  document.getElementById("dmPanel").style.display = "none";
};

// ================================
// Reactions / Edit / Delete
// ================================
async function reactToMessage(room, id) {
  socket.emit("updateMessage", { room, messageId: id, changes: { reaction: "👍" } });
}

async function editMessage(room, id) {
  const newText = prompt("Edit your message:");
  if (!newText) return;
  await db.collection("rooms").doc(room).collection("messages").doc(id).update({ text: newText, edited: true });
  socket.emit("updateMessage", { room, messageId: id, changes: { text: newText, edited: true } });
}

async function deleteMessage(room, id) {
  await db.collection("rooms").doc(room).collection("messages").doc(id).delete();
  socket.emit("deleteMessage", { room, messageId: id });
}

// ================================
// UI Helpers
// ================================
function addMessage(msg, panelId) {
  const div = document.createElement("div");
  div.className = "msg" + (msg.uid === user.uid ? " self" : "");
  div.dataset.id = msg.id;

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `${msg.from} • ${new Date(msg.ts).toLocaleTimeString()}`;

  const text = document.createElement("span");
  text.className = "text";
  text.textContent = msg.text;

  const actions = document.createElement("div");
  actions.className = "actions";

  const reactBtn = document.createElement("button");
  reactBtn.textContent = "👍";
  reactBtn.onclick = () => reactToMessage(currentRoom, msg.id);

  const editBtn = document.createElement("button");
  editBtn.textContent = "✏️";
  editBtn.onclick = () => editMessage(currentRoom, msg.id);

  const delBtn = document.createElement("button");
  delBtn.textContent = "🗑️";
  delBtn.onclick = () => deleteMessage(currentRoom, msg.id);

  actions.appendChild(reactBtn);
  if (msg.uid === user.uid) {
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
  }

  const reactions = document.createElement("span");
  reactions.className = "reactions";

  div.appendChild(meta);
  div.appendChild(text);
  div.appendChild(reactions);
  div.appendChild(actions);

  document.getElementById(panelId).appendChild(div);
}

function clearMessages(panelId) {
  document.getElementById(panelId).innerHTML = "";
}

// ================================
// Customization Panel
// ================================
document.getElementById("bgColor").addEventListener("input", (e) => {
  document.body.style.backgroundColor = e.target.value;
});

document.getElementById("fontSize").addEventListener("input", (e) => {
  document.getElementById("chatPanel").style.fontSize = e.target.value + "px";
  document.getElementById("dmPanel").style.fontSize = e.target.value + "px";
});

// ================================
// Init on page load
// ================================
window.onload = () => {
  initSocket();
};
