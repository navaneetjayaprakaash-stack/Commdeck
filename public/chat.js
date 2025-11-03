import { setupDM } from "./dm.js";
import { setupRGBPanel } from "./rgb-theme.js";
import { setupURLGenerator } from "./url-generator.js";

const socket = io();

// DOM Elements
const usernameInput = document.getElementById("usernameInput");
const enterBtn = document.getElementById("enterBtn");
const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const themeSelect = document.getElementById("themeSelect");
const chatContainer = document.getElementById("chat-container");
const sidebar = document.getElementById("sidebar");

// ===== Login =====
let username = "User";
enterBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Enter your name");
  username = name;
  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  socket.emit("join", username);
});

// ===== Send Chat =====
function appendMessage(text, type = "user") {
  const div = document.createElement("div");
  div.classList.add("message");
  if (type === "system") div.classList.add("system");
  if (type === "dm") div.classList.add("dm");
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit("chat message", msg);
  appendMessage(`You: ${msg}`);
  chatInput.value = "";
});

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ===== Socket.io listeners =====
socket.on("chat message", (msg) => {
  if (msg.user !== username) appendMessage(`${msg.user}: ${msg.text}`);
});

socket.on("private message", (data) => {
  appendMessage(`From ${data.from}: ${data.text}`, "dm");
});

// ===== Themes and RGB =====
themeSelect.addEventListener("change", () => {
  document.body.className = "";
  if (themeSelect.value) document.body.classList.add(themeSelect.value);
});

// Initialize RGB Panel, DMs, URL Generator
setupRGBPanel(chatContainer, sidebar, themeSelect);
setupDM(socket);
setupURLGenerator();
