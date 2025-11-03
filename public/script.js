// public/script.js
const socket = io(); // Connect to Socket.io server

// Grab DOM elements
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const messages = document.getElementById("messages");

// Listen for chat messages from server
socket.on("chat message", (msg) => {
  const li = document.createElement("li");
  li.textContent = msg;
  messages.appendChild(li);

  // Auto-scroll to bottom
  messages.scrollTop = messages.scrollHeight;
});

// Handle form submission
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg) {
    socket.emit("chat message", msg); // Send message to server
    input.value = ""; // Clear input
  }
});
