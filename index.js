// index.js
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const themeSelect = document.getElementById("themeSelect");
const rRange = document.getElementById("r");
const gRange = document.getElementById("g");
const bRange = document.getElementById("b");
const userDisplay = document.getElementById("user-display");
const newUsernameInput = document.getElementById("newUsername");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const chatContainer = document.getElementById("chat-container");

// ---- Utilities ----
function addMessage(text, type = "user") {
  const msg = document.createElement("div");
  msg.classList.add("message");
  if (type === "system") msg.classList.add("system");
  if (type === "dm") msg.classList.add("dm");
  msg.textContent = text;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ---- Display Name ----
let username = new URLSearchParams(window.location.search).get("name") || "User";
userDisplay.textContent = username;

changeUsernameBtn.addEventListener("click", () => {
  const newName = newUsernameInput.value.trim();
  if (newName) {
    username = newName;
    userDisplay.textContent = username;
    newUsernameInput.value = "";
    addMessage(`You changed your display name to "${username}"`, "system");
  }
});

// ---- Send Message ----
sendBtn.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  addMessage(`${username}: ${text}`);
  chatInput.value = "";
});

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ---- Theme Select ----
themeSelect.addEventListener("change", () => {
  document.body.className = ""; // reset all themes
  const selected = themeSelect.value;
  if (selected) document.body.classList.add(selected);
});

// ---- RGB Panel ----
function updateRGB() {
  const r = rRange.value;
  const g = gRange.value;
  const b = bRange.value;
  chatContainer.style.backgroundColor = `rgb(${r},${g},${b})`;
}

rRange.addEventListener("input", updateRGB);
gRange.addEventListener("input", updateRGB);
bRange.addEventListener("input", updateRGB);

// ---- URL Auto-Join ----
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get("theme");
  const r = params.get("r");
  const g = params.get("g");
  const b = params.get("b");
  const name = params.get("name");

  if (theme) {
    themeSelect.value = theme;
    document.body.classList.add(theme);
  }
  if (r && g && b) {
    rRange.value = r;
    gRange.value = g;
    bRange.value = b;
    updateRGB();
  }
  if (name) {
    username = name;
    userDisplay.textContent = username;
  }
}

// Run on load
loadFromURL();

// ---- Generate URL for sharing ----
function generateURL() {
  const theme = themeSelect.value;
  const r = rRange.value;
  const g = gRange.value;
  const b = bRange.value;
  const params = new URLSearchParams();
  if (theme) params.set("theme", theme);
  params.set("r", r);
  params.set("g", g);
  params.set("b", b);
  params.set("name", username);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

window.generateURL = generateURL; // can be called externally for sharing
