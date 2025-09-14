const socket = io();

let username = "";
let room = "";

// Get ?room=XYZ from URL if present
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
    socket.emit("chatMessage", { user: username, text: message });
    document.getElementById("messageInput").value = "";
  }
}

socket.on("chatMessage", (msg) => {
  const div = document.createElement("div");
  if (msg.user === "System") {
    div.classList.add("system");
    div.textContent = msg.text;
  } else {
    div.innerHTML = `<b>${msg.user}:</b> ${msg.text}`;
  }
  document.getElementById("messages").appendChild(div);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
});
