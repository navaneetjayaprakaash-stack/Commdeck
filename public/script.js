// ================================
// User setup (persistent via localStorage)
// ================================
let user = JSON.parse(localStorage.getItem("chatUser"));
if (!user) {
  user = {
    uid: "anon_" + Math.random().toString(36).slice(2, 9),
    name: "Guest-" + Math.floor(Math.random() * 1000)
  };
  localStorage.setItem("chatUser", JSON.stringify(user));
}

let socket;
let currentRoom = "general";
let currentDm = null;
let dmList = {}; // uid -> name

// ================================
// Themes
// ================================
const themes = {
  "Default": {bg:"#282c34", self:"#3c6e9d", other:"#4d5c6b"},
  "Sunset": {bg:"#ffecd2", self:"#ff7e5f", other:"#feb47b"},
  "Ocean": {bg:"#2E8BC0", self:"#145DA0", other:"#0C2D48"},
  "Forest": {bg:"#2E8B57", self:"#3CB371", other:"#228B22"},
  "Lavender": {bg:"#E6E6FA", self:"#9370DB", other:"#D8BFD8"},
  "Candy": {bg:"#FFB6C1", self:"#FF69B4", other:"#FF1493"},
  "Night": {bg:"#0D1B2A", self:"#1B263B", other:"#415A77"},
  "Retro": {bg:"#F4EBD9", self:"#FF6F61", other:"#6B4226"},
  "Minimal": {bg:"#FFFFFF", self:"#D3D3D3", other:"#A9A9A9"},
  "Cyber": {bg:"#0F0F0F", self:"#00FFFF", other:"#FF00FF"},
  "Gold": {bg:"#FFF8DC", self:"#FFD700", other:"#DAA520"},
  "Pink": {bg:"#FFE4E1", self:"#FF69B4", other:"#FFB6C1"},
  "Purple": {bg:"#E6E6FA", self:"#9370DB", other:"#BA55D3"},
  "Blue": {bg:"#ADD8E6", self:"#1E90FF", other:"#4682B4"},
  "Green": {bg:"#98FB98", self:"#32CD32", other:"#228B22"},
  "Autumn": {bg:"#FFEFD5", self:"#FF8C00", other:"#CD853F"},
  "Monochrome": {bg:"#F0F0F0", self:"#B0B0B0", other:"#808080"},
  "Coffee": {bg:"#6F4E37", self:"#D2691E", other:"#8B4513"},
  "OceanDeep": {bg:"#001f3f", self:"#0074D9", other:"#7FDBFF"},
  "Space": {bg:"#0B0C10", self:"#1F2833", other:"#C5C6C7"}
};

// ================================
// Style customization
// ================================
const styleConfig = JSON.parse(localStorage.getItem("styleConfig")) || {
  bgColor: "#282c34",
  selfColor: "#3c6e9d",
  otherColor: "#4d5c6b",
  fontSize: 14
};

function applyStyles() {
  document.documentElement.style.setProperty("--bg", styleConfig.bgColor);
  document.documentElement.style.setProperty("--self-bubble", styleConfig.selfColor);
  document.documentElement.style.setProperty("--other-bubble", styleConfig.otherColor);
  document.documentElement.style.setProperty("--font-size", styleConfig.fontSize+"px");
}

function saveStyles() {
  localStorage.setItem("styleConfig", JSON.stringify(styleConfig));
}

// Populate theme dropdown
const themeSelect = document.getElementById("themeSelect");
for (let t in themes) {
  const opt = document.createElement("option");
  opt.value = t;
  opt.textContent = t;
  themeSelect.appendChild(opt);
}
themeSelect.addEventListener("change", e => {
  const t = themes[e.target.value];
  styleConfig.bgColor = t.bg;
  styleConfig.selfColor = t.self;
  styleConfig.otherColor = t.other;
  applyStyles();
  saveStyles();
});

// ================================
// Socket.io
// ================================
function initSocket() {
  socket = io();

  socket.emit("joinRoom", { room: currentRoom, uid: user.uid, name: user.name });

  socket.on("chatMessage", msg => addMessage(msg, "chatPanel"));
  socket.on("privateMessage", msg => {
    openDm(msg.uid, msg.from);
    addMessage(msg, "dmPanel");
  });
  socket.on("roomList", updateRoomList);
  socket.on("roomUsers", updateUserList);
}

// ================================
// Messages
// ================================
function addMessage(msg, panelId) {
  const panel = document.getElementById(panelId);
  const div = document.createElement("div");
  if(msg.system){
    div.className = "msg system-msg";
    div.textContent = msg.text;
  } else {
    div.className = msg.uid === user.uid ? "msg self" : "msg other";
    const meta = document.createElement("div");
    meta.className="meta";
    const date = new Date(msg.ts);
    meta.textContent = `${msg.from} • ${date.getHours()}:${("0"+date.getMinutes()).slice(-2)}`;
    const text = document.createElement("div");
    text.textContent = msg.text;
    div.appendChild(meta);
    div.appendChild(text);
  }
  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;
}

// ================================
// Send message
// ================================
document.getElementById("sendBtn").onclick = sendMessage;
document.getElementById("messageInput").addEventListener("keypress", e => {
  if(e.key==="Enter") sendMessage();
});

function sendMessage() {
  const input = document.getElementById("messageInput");
  if(!input.value.trim()) return;
  const msg = { from:user.name, uid:user.uid, text:input.value, ts:Date.now(), room:currentRoom };
  if(currentDm){
    socket.emit("privateMessage",{toUid:currentDm.uid,msg});
    addMessage(msg,"dmPanel");
  } else {
    socket.emit("chatMessage",msg);
  }
  input.value="";
}

// ================================
// Room management
// ================================
function updateRoomList(rooms){
  const list = document.getElementById("roomList");
  list.innerHTML="";
  rooms.forEach(r=>{
    const li = document.createElement("li");
    li.textContent = r;
    li.onclick=()=> joinRoom(r);
    list.appendChild(li);
  });
}

function joinRoom(room){
  currentRoom = room;
  socket.emit("joinRoom",{room,uid:user.uid,name:user.name});
}

// ================================
// User list
// ================================
function updateUserList(users){
  const list = document.getElementById("userList");
  list.innerHTML="";
  users.forEach(u=>{
    const li=document.createElement("li");
    li.textContent=u.name;
    const dmBtn=document.createElement("button");
    dmBtn.textContent="💬";
    dmBtn.onclick=()=>openDm(u.uid,u.name);
    li.appendChild(dmBtn);
    list.appendChild(li);
  });
}

// ================================
// DMs
// ================================
function openDm(uid,name){
  currentDm={uid,name};
  document.getElementById("chatPanel").style.display="none";
  document.getElementById("dmPanel").style.display="block";
  document.getElementById("currentRoomLabel").textContent=`DM: ${name}`;
}

// ================================
// Init
// ================================
window.onload=()=>{
  applyStyles();
  initSocket();
  document.getElementById("displayName").textContent=user.name;
  document.getElementById("displayUid").textContent=user.uid;
  document.getElementById("changeNameBtn").onclick=()=>{
    const val=document.getElementById("displayNameInput").value.trim();
    if(val){
      user.name=val;
      localStorage.setItem("chatUser",JSON.stringify(user));
      document.getElementById("displayName").textContent=val;
    }
  };
};
