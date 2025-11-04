import { db, collection, addDoc, query, orderBy, onSnapshot } from "../firebase.js";

const socket = io();
let username = "";
let room = "";

// 20 themes
const themes = ["default","red","green","blue","orange","purple","pink","teal","cyan","yellow","lime","indigo","violet","magenta","brown","gray","lightblue","darkred","darkgreen","darkblue"];
const themeSelect = document.getElementById("themeSelect");
themes.forEach(t => {
  const opt = document.createElement("option");
  opt.value = t; opt.textContent = t;
  themeSelect.appendChild(opt);
});
themeSelect.onchange = () => {
  document.body.setAttribute("data-theme", themeSelect.value);
};

// URL ?room=XYZ
const urlParams = new URLSearchParams(window.location.search);
const urlRoom = urlParams.get("room");

function joinChat() {
  username = document.getElementById("usernameInput").value.trim();
  room = document.getElementById("roomInput").value.trim() || urlRoom || "general";
  if (username) {
    document.getElementById("joinScreen").style.display = "none";
    document.getElementById("chatScreen").style.display = "block";
    document.getElementById("roomTitle").textContent = `Room: ${room}`;
    socket.emit("joinRoom", { username, room });
  } else alert("Please enter a name");
}

function sendMessage() {
  const message = document.getElementById("messageInput").value.trim();
  if (message) {
    socket.emit("chatMessage", { user: username, text: message, room });
    document.getElementById("messageInput").value = "";
  }
}

// Receive messages
socket.on("chatMessage", (msg) => addMessage(msg));
socket.on("loadMessages", (messages) => {
  document.getElementById("messages").innerHTML = "";
  messages.forEach(msg => addMessage(msg));
});

// Add message helper
function addMessage(msg){
  const div = document.createElement("div");
  div.classList.add("message");
  if(msg.user === "System") div.classList.add("system");
  else if(msg.user === username) div.classList.add("self");
  else div.classList.add("other");
  div.innerHTML = msg.user === "System" ? msg.text : `<b>${msg.user}:</b> ${msg.text}`;
  document.getElementById("messages").appendChild(div);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
}

// User list
socket.on("userList", (users) => {
  const ul = document.getElementById("userList");
  ul.innerHTML = "";
  users.forEach(u => {
    if(u.username===username) return;
    const li = document.createElement("li");
    li.textContent = u.username;
    li.onclick = () => {
      const text = prompt(`Send DM to ${u.username}:`);
      if(text) socket.emit("privateMessage",{to:u.id,text});
    };
    ul.appendChild(li);
  });
});

window.joinChat = joinChat;
window.sendMessage = sendMessage;
