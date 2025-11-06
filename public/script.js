const socket = io();
let username = "";
let room = "";

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) switchTheme(savedTheme);

function switchTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('theme', themeName);
}

function joinChat() {
  username = prompt("Enter your name") || "";
  room = new URLSearchParams(window.location.search).get("room") || "general";
  document.getElementById("roomTitle").textContent = `Room: ${room}`;
  socket.emit("joinRoom", { username, room });
}

function sendMessage() {
  const message = document.getElementById("messageInput").value.trim();
  if (message) {
    socket.emit("chatMessage", { user: username, text: message, room });
    document.getElementById("messageInput").value = "";
  }
}

socket.on("chatMessage", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  if (msg.user === username) div.classList.add("self");
  else if (msg.user === "System") div.classList.add("system");
  else div.classList.add("other");

  div.innerHTML = `<b>${msg.user}:</b> ${msg.text} <span style="font-size:0.8em;color:gray;">${msg.time || ""}</span>`;
  document.getElementById("chat-messages").appendChild(div);
  document.getElementById("chat-messages").scrollTop = document.getElementById("chat-messages").scrollHeight;
});

socket.on("userList", (users) => {
  const ul = document.getElementById("userList");
  ul.innerHTML = "";
  users.forEach((u) => {
    if (u.username === username) return;
    const li = document.createElement("li");
    li.textContent = u.username;
    li.onclick = () => {
      document.getElementById("dmTarget").value = u.username;
      toggleDM();
    };
    ul.appendChild(li);
  });
});

function changeName() {
  const newName = prompt("Enter new name:");
  if (newName) {
    username = newName;
    socket.emit("changeUsername", newName);
  }
}

function updateRGB() {
  const color = document.getElementById("rgbPicker").value;
  document.documentElement.style.setProperty('--primary', color);
}

function toggleDM() {
  document.getElementById("dm-panel").classList.toggle("hidden");
}

function sendDM() {
  const toUser = document.getElementById("dmTarget").value;
  const text = document.getElementById("dmMessageInput").value.trim();
  if (text && toUser) {
    socket.emit("privateMessage", { to: toUser, text });
    document.getElementById("dmMessageInput").value = "";
  }
}
