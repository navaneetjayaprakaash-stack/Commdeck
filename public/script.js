// ================================
// User setup (persistent)
// ================================
let user = JSON.parse(localStorage.getItem('chatUser'));
if (!user) {
  user = {
    uid: "anon_" + Math.random().toString(36).slice(2, 9),
    name: "Guest-" + Math.floor(Math.random() * 1000)
  };
  localStorage.setItem('chatUser', JSON.stringify(user));
}
let socket;
let currentRoom = "general";
let currentDm = null;
let dmList = {};

// ================================
// Theme / Customization
// ================================
const themes = {
  "Default": {bg: "#282c34", sidebar: "#21252b", self: "#3c6e9d", other: "#4d5c6b", text: "#e0e0e0"},
  "Light": {bg:"#f9f9f9", sidebar:"#eee", self:"#cce5ff", other:"#e0e0e0", text:"#333"},
  "Solarized Dark": {bg:"#002b36", sidebar:"#073642", self:"#586e75", other:"#657b83", text:"#93a1a1"},
  "Solarized Light": {bg:"#fdf6e3", sidebar:"#eee8d5", self:"#b58900", other:"#cb4b16", text:"#657b83"},
  "Dracula": {bg:"#282a36", sidebar:"#44475a", self:"#6272a4", other:"#50fa7b", text:"#f8f8f2"},
  "Monokai": {bg:"#272822", sidebar:"#3e3d32", self:"#f92672", other:"#66d9ef", text:"#f8f8f2"},
  "Night Owl": {bg:"#011627", sidebar:"#0b1b2b", self:"#7fdbca", other:"#ff5874", text:"#d6deeb"},
  "Gruvbox Dark": {bg:"#282828", sidebar:"#3c3836", self:"#458588", other:"#b16286", text:"#ebdbb2"},
  "Gruvbox Light": {bg:"#fbf1c7", sidebar:"#f2e5bc", self:"#689d6a", other:"#d3869b", text:"#3c3836"},
  "Palenight": {bg:"#292d3e", sidebar:"#232634", self:"#5a65d4", other:"#ff9e64", text:"#a6accd"},
  "Nord": {bg:"#2e3440", sidebar:"#3b4252", self:"#81a1c1", other:"#88c0d0", text:"#d8dee9"},
  "Cobalt": {bg:"#002240", sidebar:"#001f3f", self:"#4fd6be", other:"#ff6188", text:"#ffffff"},
  "Material Dark": {bg:"#263238", sidebar:"#37474f", self:"#80cbc4", other:"#ff7043", text:"#eceff1"},
  "Material Light": {bg:"#eceff1", sidebar:"#cfd8dc", self:"#80cbc4", other:"#ff7043", text:"#263238"},
  "One Dark": {bg:"#282c34", sidebar:"#21252b", self:"#61afef", other:"#e06c75", text:"#abb2bf"},
  "One Light": {bg:"#fafafa", sidebar:"#e5e5e5", self:"#61afef", other:"#e06c75", text:"#383a42"},
  "Drift": {bg:"#0f111a", sidebar:"#1a1c2c", self:"#5d5df6", other:"#e93c58", text:"#ffffff"},
  "Ocean": {bg:"#1b2b34", sidebar:"#223b44", self:"#438489", other:"#e6db74", text:"#d8dee9"},
  "Fire": {bg:"#2d0a0a", sidebar:"#3d1212", self:"#ff5f5f", other:"#ffa500", text:"#fff"},
  "Forest": {bg:"#0b3d0b", sidebar:"#134013", self:"#28a745", other:"#6c757d", text:"#d8f3dc"}
};

function applyTheme(name) {
  const t = themes[name];
  if (!t) return;
  document.documentElement.style.setProperty('--bg', t.bg);
  document.documentElement.style.setProperty('--sidebar-bg', t.sidebar);
  document.documentElement.style.setProperty('--self-bubble', t.self);
  document.documentElement.style.setProperty('--other-bubble', t.other);
  document.documentElement.style.setProperty('--text-color', t.text);
  localStorage.setItem('chatTheme', name);
}

// Populate dropdown
const select = document.getElementById("themeSelect");
for (let name in themes) {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  select.appendChild(opt);
}
const savedTheme = localStorage.getItem('chatTheme') || "Default";
select.value = savedTheme;
applyTheme(savedTheme);

select.addEventListener("change", () => applyTheme(select.value));
document.getElementById("fontSize").addEventListener("input", e => {
  document.documentElement.style.setProperty("--font-size", `${e.target.value}px`);
  localStorage.setItem('chatFontSize', e.target.value);
});

// Load font size
const savedFont = localStorage.getItem('chatFontSize') || 14;
document.documentElement.style.setProperty("--font-size", `${savedFont}px`);
document.getElementById("fontSize").value = savedFont;
