const socket = io();

let username = "";
let room = "";

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
  } else {
    alert("Please enter a name");
  }
}

function sendMessage() {
  const message = document.getElementById("messageInput").value.trim();
  if (message) {
    socket.emit("chatMessage", { user: username, text: message, room });
    document.getElementById("messageInput").value = "";
  }
}

// Receive messages
socket.on("chatMessage", (msg) => {
  const div = document.createElement("div");
  if (msg.user.startsWith("(DM")) {
    div.style.color = "purple";
  }
  if (msg.user === "System") {
    div.classList.add("system");
    div.textContent = msg.text;
  } else {
    div.innerHTML = `<b>${msg.user}:</b> ${msg.text}`;
  }
  document.getElementById("messages").appendChild(div);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
});

// Update user list
socket.on("userList", (users) => {
  const ul = document.getElementById("userList");
  ul.innerHTML = "";
  users.forEach((u) => {
    if (u.username === username) return; // skip self
    const li = document.createElement("li");
    li.textContent = u.username;
    li.style.cursor = "pointer";
    li.onclick = () => {
      const text = prompt(`Send a DM to ${u.username}:`);
      if (text) socket.emit("privateMessage", { to: u.id, text });
    };
    ul.appendChild(li);
  });
});
