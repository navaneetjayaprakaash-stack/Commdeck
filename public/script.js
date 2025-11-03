// public/script.js
import { setupRGBPanel } from "./rgb-theme.js";
import { setupDM } from "./dm.js";
import { setupURLGenerator } from "./url-generator.js";

const socket = io(); // Connect to Socket.io server

// ===== DOM Elements =====
const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const usernameInput = document.getElementById("usernameInput");
const enterBtn = document.getElementById("enterBtn");

const messageForm = document.getElementById("chat-input-container");
const messageInput = document.getElementById("messageInput");
const chatMessages = document.getElementById("chat-messages");

const themeSelect = document.getElementById("themeSelect");
const chatContainer = document.getElementById("chat-container");
const sidebar = document.getElementById("sidebar");

// ===== Theme Options =====
const themes = [
  "theme-galactic-purple",
  "theme-electric-sunset",
  "theme-neon-cyberpunk",
  "theme-cosmic-ocean",
  "theme-lava-glow",
  "theme-aurora-borealis",
  "theme-radiant-gold",
  "theme-cyber-teal",
  "theme-bubblegum-pop",
  "theme-toxic-lime",
  "theme-firefly-night",
  "theme-magenta-storm",
  "theme-electric-cyan",
  "theme-starry-violet",
  "theme-solar-flare",
  "theme-cosmic-pink",
  "theme-midnight-blue",
  "theme-inferno-red",
  "theme-prism-rainbow",
  "theme-hyperspace-neon"
];

// Populate theme select dropdown
themes.forEach(theme => {
  const opt = document.createElement("option");
  opt.value = theme;
  opt.textContent = theme.replace("theme-", "").replace(/-/g, " ");
  themeSelect.appendChild(opt);
});

// ===== Login Handling =====
enterBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username) return alert("Enter your name");

  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  socket.emit("join", username);
});

// ===== Chat Handling =====
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;

  socket.emit("chat message", msg);
  messageInput.value = "";
});

// Listen for incoming messages
socket.on("chat message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.textContent = msg;
  chatMessages.appendChild(div);

  // Auto-scroll
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// ===== Theme Switching =====
themeSelect.addEventListener("change", (e) => {
  const theme = e.target.value;

  // Remove all previous themes
  themes.forEach(t => document.body.classList.remove(t));

  // Apply new theme
  document.body.classList.add(theme);
});

// ===== Initialize RGB Panel, DMs, and URL Generator =====
setupRGBPanel(chatContainer, sidebar, themeSelect);
setupDM(socket);
setupURLGenerator();
