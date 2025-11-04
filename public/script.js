const socket = io();

// Auto-generated username
let username = "User" + Math.floor(Math.random() * 1000);
let room = new URLSearchParams(window.location.search).get("room") || "general";

// DOM elements
const gcMessagesEl = document.getElementById("gcMessages");
const dmMessagesEl = document.getElementById("dmMessages");
const dmListEl = document.getElementById("dmList");
const userListEl = document.getElementById("userList");
const currentUsernameEl = document.getElementById("currentUsername");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const generateLinkBtn = document.getElementById("generateLinkBtn");
const themeSelect = document.getElementById("themeSelect");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const newRoomInput = document.getElementById("newRoomInput");

// DM management
let dms = {}; // { username: [messages] }
let currentDM = null;

// Display username
currentUsernameEl.textContent = username;

// Named themes
const themes = [
  { id: "theme1", name: "Sunset Glow" },
  { id: "theme2", name: "Purple Haze" },
  { id: "theme3", name: "Deep Ocean" },
  { id: "theme4", name: "Royal Blue" },
  { id: "theme5", name: "Sky Breeze" },
  { id: "theme6", name: "Hot Pink" },
  { id: "theme7", name: "Molten Orange" },
  { id: "theme8", name: "Golden Hour" },
  { id: "theme9", name: "Rose Red" },
  { id: "theme10", name: "Violet Dream" },
  { id: "theme11", name: "Indigo Night" },
  { id: "theme12", name: "Mystic Purple" },
  { id: "theme13", name: "Fuchsia Glow" },
  { id: "theme14", name: "Electric Blue" },
  { id: "theme15", name: "Aqua Mist" },
  { id: "theme16", name: "Magenta Pulse" },
  { id: "theme17", name: "Blazing Orange" },
  { id: "theme18", name: "Sunlit Gold" },
  { id: "theme19", name: "Royal Violet" },
  { id: "theme20", name: "Night Indigo" }
];

// Populate theme dropdown
themes.forEach(t => {
  const opt = document.createElement("option");
  opt.value = t.id;
  opt.textContent = t.name;
  themeSelect.appendChild(opt);
});

// Apply saved theme
const savedTheme = localStorage.getItem("selectedTheme");
if (savedTheme) {
  document.body.setAttribute("data-theme", savedTheme);
  themeSelect.value = savedTheme;
}

// Theme change
themeSelect.onchange = () => {
  document.body.setAttribute("data-theme", themeSelect.value);
  localStorage.setItem("selectedTheme", themeSelect.value);
};

// Join room
socket.emit("joinRoom", { username, room });

// Send message
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (currentDM) {
    socket.emit("privateMessage", { to: currentDM.id, text });
  } else {
    socket.emit("chatMessage", { user: username, text, room });
  }
  messageInput.value = "";
}
sendBtn.onclick = sendMessage;
messageInput.addEventListener("keypress", e => { if(e.key==="Enter") sendMessage(); });

// Receive messages
socket.on("chatMessage", msg => {
  const div = document.createElement("div");
  div.classList.add("message");

  if(msg.user === "System") div.classList.add("system");
  else if(msg.user === username) div.classList.add("self");
  else div.classList.add("other");

  div.innerHTML = msg.user==="System"?msg.text:`<b>${msg.user}:</b> ${msg.text}`;

  if(msg.user.includes("(DM")) {
    const other = msg.user.match(/DM from (.+)\)/)[1] || msg.user;
    if(!dms[other]) dms[other]=[];
    dms[other].push(div.outerHTML);
    renderDM(other);
  } else {
    gcMessagesEl.appendChild(div);
    gcMessagesEl.scrollTop = gcMessagesEl.scrollHeight;
  }
});

// Update user list
socket.on("userList", users=>{
  userListEl.innerHTML="";
  users.forEach(u=>{
    if(u.username===username) return;
    const li=document.createElement("li");
    li.textContent=u.username;

    const dmBtn=document.createElement("button");
    dmBtn.textContent="DM";
    dmBtn.className="dm-btn";
    dmBtn.onclick=e=>{
      e.stopPropagation();
      if(!dms[u.username]) dms[u.username]=[];
      currentDM=u;
      renderDM(u.username);
    };

    li.appendChild(dmBtn);
    userListEl.appendChild(li);
  });
});

// Render DM panel
function renderDM(user){
  dmMessagesEl.innerHTML="";
  dms[user].forEach(msgHTML=>{
    dmMessagesEl.innerHTML+=msgHTML;
  });
  gcMessagesEl.classList.toggle("hidden", currentDM!=null);
  dmMessagesEl.parentElement.classList.toggle("hidden", currentDM==null);
  dmMessagesEl.scrollTop=dmMessagesEl.scrollHeight;
}

// Change username
changeUsernameBtn.onclick = ()=>{
  const newUsername = prompt("Enter new username:", username);
  if(newUsername && newUsername!==username){
    socket.emit("changeUsername", newUsername);
    username=newUsername;
    currentUsernameEl.textContent=username;
  }
};

// Generate link
generateLinkBtn.onclick=()=>{
  const url=window.location.origin+"?room="+room;
  navigator.clipboard.writeText(url);
  alert("Room link copied: "+url);
};

// Join new room
joinRoomBtn.onclick=()=>{
  const newRoom=newRoomInput.value.trim();
  if(!newRoom) return;
  room=newRoom;
  socket.emit("joinRoom",{username, room});
  newRoomInput.value="";
  gcMessagesEl.innerHTML="";
  currentDM=null;
  dmMessagesEl.parentElement.classList.add("hidden");
};
