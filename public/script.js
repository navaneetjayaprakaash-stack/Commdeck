const socket = io();

// DOM Elements
const roomsList = document.getElementById("rooms");
const usersList = document.getElementById("users");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const themeSelect = document.getElementById("themeSelect");

// Dummy user (replace with auth later)
const uid = Math.random().toString(36).substring(2, 10);
const name = "User-" + uid;
let currentRoom = "general";

// =============================
// Themes
// =============================
const themes = [
  { name: "Default", vars: { "--bg":"#282c34","--panel-bg":"#2d323a","--sidebar-bg":"#21252b","--border-color":"#444","--text-color":"#e0e0e0","--button-bg":"#3c92ff","--button-text":"#fff","--self-bubble":"#3c6e9d","--other-bubble":"#4d5c6b","--system-message":"#8a8a8a"} },
  { name: "Light", vars: { "--bg":"#f4f4f4","--panel-bg":"#fff","--sidebar-bg":"#e4e4e4","--border-color":"#ccc","--text-color":"#111","--button-bg":"#3c92ff","--button-text":"#fff","--self-bubble":"#7ea0c4","--other-bubble":"#c4cdd2","--system-message":"#666"} },
  { name: "Green", vars: { "--bg":"#e8f5e9","--panel-bg":"#c8e6c9","--sidebar-bg":"#a5d6a7","--border-color":"#81c784","--text-color":"#1b5e20","--button-bg":"#388e3c","--button-text":"#fff","--self-bubble":"#66bb6a","--other-bubble":"#a5d6a7","--system-message":"#2e7d32"} }
];

// Populate dropdown
themes.forEach((t,i)=>{
  const opt = document.createElement("option");
  opt.value = i;
  opt.innerText = t.name;
  themeSelect.appendChild(opt);
});

// Change theme
themeSelect.addEventListener("change", () => {
  const vars = themes[themeSelect.value].vars;
  Object.keys(vars).forEach(k => document.documentElement.style.setProperty(k, vars[k]));
});

// =============================
// Socket Events
// =============================
socket.emit("joinRoom", { uid, name, room: currentRoom });

sendBtn.addEventListener("click", () => {
  if (messageInput.value.trim() === "") return;
  const msg = { from: name, text: messageInput.value, uid, ts: Date.now(), room: currentRoom };
  socket.emit("chatMessage", msg);
  messageInput.value = "";
});

socket.on("chatMessage", msg => {
  const div = document.createElement("div");
  div.classList.add("msg");
  if (msg.system) div.classList.add("system-msg");
  else div.classList.add(msg.uid === uid ? "self" : "other");
  div.textContent = msg.system ? msg.text : `${msg.from}: ${msg.text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("chatHistory", history => {
  history.forEach(msg => {
    const div = document.createElement("div");
    div.classList.add("msg");
    if (msg.system) div.classList.add("system-msg");
    else div.classList.add(msg.uid === uid ? "self" : "other");
    div.textContent = msg.system ? msg.text : `${msg.from}: ${msg.text}`;
    messagesDiv.appendChild(div);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("roomList", list => {
  roomsList.innerHTML = "";
  list.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    li.addEventListener("click", () => {
      if (currentRoom === r) return;
      socket.emit("leaveRoom");
      currentRoom = r;
      messagesDiv.innerHTML = "";
      socket.emit("joinRoom", { uid, name, room: currentRoom });
    });
    roomsList.appendChild(li);
  });
});

socket.on("roomUsers", list => {
  usersList.innerHTML = "";
  list.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u.name;
    usersList.appendChild(li);
  });
});
