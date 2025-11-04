import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, setDoc, getDocs } from "firebase/firestore";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- Socket.io ----
const socket = io();

// ---- Username and Room ----
let username = "User" + Math.floor(Math.random() * 1000);
let room = new URLSearchParams(window.location.search).get("room") || "general";

// ---- DOM Elements ----
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
const gcListEl = document.getElementById("gcList");

// DM Elements
const dmPanel = document.getElementById("dmPanel");
const dmCloseBtn = document.getElementById("dmCloseBtn");
const dmHeader = document.getElementById("dmHeader");
const dmMessageInput = document.getElementById("dmMessageInput");
const dmSendBtn = document.getElementById("dmSendBtn");

// ---- Display Username ----
currentUsernameEl.textContent = username;

// ---- Themes ----
const themes = [
  { id: "sunset-glow", name: "Sunset Glow" },
  { id: "purple-haze", name: "Purple Haze" },
  { id: "deep-ocean", name: "Deep Ocean" },
  { id: "royal-blue", name: "Royal Blue" },
  { id: "sky-breeze", name: "Sky Breeze" },
  { id: "hot-pink", name: "Hot Pink" },
  { id: "molten-orange", name: "Molten Orange" },
  { id: "golden-hour", name: "Golden Hour" },
  { id: "rose-red", name: "Rose Red" },
  { id: "violet-dream", name: "Violet Dream" },
  { id: "indigo-night", name: "Indigo Night" },
  { id: "mystic-purple", name: "Mystic Purple" },
  { id: "fuchsia-glow", name: "Fuchsia Glow" },
  { id: "electric-blue", name: "Electric Blue" },
  { id: "aqua-mist", name: "Aqua Mist" },
  { id: "magenta-pulse", name: "Magenta Pulse" },
  { id: "blazing-orange", name: "Blazing Orange" },
  { id: "sunlit-gold", name: "Sunlit Gold" },
  { id: "royal-violet", name: "Royal Violet" },
  { id: "night-indigo", name: "Night Indigo" }
];

// Populate theme dropdown
themes.forEach(t => {
  const opt = document.createElement("option");
  opt.value = t.id;
  opt.textContent = t.name;
  themeSelect.appendChild(opt);
});

// Load saved theme
const savedTheme = localStorage.getItem("selectedTheme");
if(savedTheme){
  document.body.setAttribute("data-theme", savedTheme);
  themeSelect.value = savedTheme;
}

// Theme change
themeSelect.onchange = () => {
  const val = themeSelect.value;
  document.body.setAttribute("data-theme", val);
  localStorage.setItem("selectedTheme", val);
};

// ---- Firestore Helpers ----

// Add user to Firestore (or update)
async function updateUserInDB(){
  await setDoc(doc(db, "users", username), { username, room, lastSeen: new Date() });
}

// Fetch all users
async function fetchUsers(){
  const usersSnap = await getDocs(collection(db,"users"));
  const users = [];
  usersSnap.forEach(u => users.push(u.data()));
  return users;
}

// Fetch GC List
async function fetchGCs(){
  const roomsSnap = await getDocs(collection(db,"rooms"));
  const rooms = [];
  roomsSnap.forEach(r => rooms.push(r.id));
  return rooms;
}

// Send GC Message
async function sendGCMessage(text){
  await addDoc(collection(db,"rooms",room,"messages"),{user:username,text,timestamp:new Date()});
}

// Send DM
async function sendDM(toUser, text){
  const id = [username,toUser].sort().join("_");
  await addDoc(collection(db,"dms",id,"messages"),{from:username,to:toUser,text,timestamp:new Date()});
}

// Listen to GC messages
function listenGC(){
  const q = query(collection(db,"rooms",room,"messages"));
  onSnapshot(q,snap=>{
    gcMessagesEl.innerHTML="";
    snap.docs.sort((a,b)=>a.data().timestamp - b.data().timestamp).forEach(d=>{
      const div = document.createElement("div");
      div.classList.add("message");
      const msg = d.data();
      div.innerHTML = msg.user===username?`<b>You:</b> ${msg.text}`:`<b>${msg.user}:</b> ${msg.text}`;
      div.classList.add(msg.user===username?"self":"other");
      gcMessagesEl.appendChild(div);
    });
    gcMessagesEl.scrollTop = gcMessagesEl.scrollHeight;
  });
}

// Listen to DMs with a user
function listenDM(withUser){
  const id = [username,withUser].sort().join("_");
  const q = query(collection(db,"dms",id,"messages"));
  onSnapshot(q,snap=>{
    dmMessagesEl.innerHTML="";
    snap.docs.sort((a,b)=>a.data().timestamp - b.data().timestamp).forEach(d=>{
      const msg = d.data();
      const div = document.createElement("div");
      div.classList.add("message");
      div.innerHTML = msg.from===username?`<b>You:</b> ${msg.text}`:`<b>${msg.from}:</b> ${msg.text}`;
      div.classList.add(msg.from===username?"self":"other");
      dmMessagesEl.appendChild(div);
    });
    dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
  });
}

// Render Users List
async function renderUsers(){
  const users = await fetchUsers();
  userListEl.innerHTML="";
  users.forEach(u=>{
    if(u.username===username) return;
    const li = document.createElement("li");
    li.textContent = u.username;
    const dmBtn = document.createElement("button");
    dmBtn.textContent="DM";
    dmBtn.className="dm-btn";
    dmBtn.onclick=()=>{
      openDM(u.username);
    };
    li.appendChild(dmBtn);
    userListEl.appendChild(li);
  });
}

// Render GC list
async function renderGCList(){
  const rooms = await fetchGCs();
  gcListEl.innerHTML="";
  rooms.forEach(r=>{
    const li = document.createElement("li");
    li.textContent = r;
    li.onclick=()=>{
      room = r;
      listenGC();
      updateUserInDB();
    };
    gcListEl.appendChild(li);
  });
}

// ---- Message Sending ----
sendBtn.onclick = async ()=>{
  const text = messageInput.value.trim();
  if(!text) return;
  await sendGCMessage(text);
  messageInput.value="";
};
messageInput.addEventListener("keypress",e=>{if(e.key==="Enter")sendBtn.onclick();});

// ---- Join Room ----
joinRoomBtn.onclick = async ()=>{
  const newRoom = newRoomInput.value.trim();
  if(!newRoom) return;
  room = newRoom;
  newRoomInput.value="";
  await renderGCList();
  listenGC();
  await updateUserInDB();
};

// ---- Generate Link ----
generateLinkBtn.onclick = ()=>{
  const url = `${window.location.origin}?room=${room}`;
  navigator.clipboard.writeText(url);
  alert("Room link copied: "+url);
};

// ---- Change Username ----
changeUsernameBtn.onclick = async ()=>{
  const newU = prompt("Enter new username:", username);
  if(newU && newU!==username){
    username=newU;
    currentUsernameEl.textContent = username;
    await updateUserInDB();
    await renderUsers();
  }
};

// ---- DM Panel ----
let currentDMUser = null;
function openDM(user){
  currentDMUser = user;
  dmPanel.classList.remove("hidden");
  dmHeader.textContent = user;
  listenDM(user);
}
dmCloseBtn.onclick=()=>{dmPanel.classList.add("hidden");currentDMUser=null;};
dmSendBtn.onclick=async ()=>{
  const text = dmMessageInput.value.trim();
  if(!text || !currentDMUser) return;
  await sendDM(currentDMUser,text);
  dmMessageInput.value="";
};
dmMessageInput.addEventListener("keypress",e=>{if(e.key==="Enter")dmSendBtn.onclick();});

// ---- Initial Load ----
(async ()=>{
  await updateUserInDB();
  await renderUsers();
  await renderGCList();
  listenGC();
})();
