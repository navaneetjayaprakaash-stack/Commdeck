import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b6sk70s4vbxJt-H0NGk",
  authDomain: "my-chat-room-1d84f.firebaseapp.com",
  projectId: "my-chat-room-1d84f",
  storageBucket: "my-chat-room-1d84f.firebasestorage.app",
  messagingSenderId: "747796328971",
  appId: "1:747796328971:web:beb5c15265855e169e8d0e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DOM Elements ---
const currentUsernameEl = document.getElementById("currentUsername");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const gcMessagesEl = document.getElementById("gcMessages");
const dmPanel = document.getElementById("dmPanel");
const dmUserList = document.getElementById("dmUserList");
const dmMessagesEl = document.getElementById("dmMessages");
const dmMessageInput = document.getElementById("dmMessageInput");
const dmSendBtn = document.getElementById("dmSendBtn");
const dmCloseBtn = document.getElementById("dmCloseBtn");
const themeSelect = document.getElementById("themeSelect");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const generateLinkBtn = document.getElementById("generateLinkBtn");
const newRoomInput = document.getElementById("newRoomInput");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const gcList = document.getElementById("gcList");

// --- State ---
let username = "User" + Math.floor(Math.random()*1000);
let room = new URLSearchParams(window.location.search).get("room") || "general";
let currentDM = null;

// Display username
currentUsernameEl.textContent = username;

// --- Themes ---
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

themes.forEach(t=>{
  const opt = document.createElement("option");
  opt.value = t.id;
  opt.textContent = t.name;
  themeSelect.appendChild(opt);
});

// Load saved theme
const savedTheme = localStorage.getItem("selectedTheme");
if(savedTheme){
  document.body.dataset.theme = savedTheme;
  themeSelect.value = savedTheme;
}

// Theme change
themeSelect.onchange = ()=>{
  document.body.dataset.theme = themeSelect.value;
  localStorage.setItem("selectedTheme", themeSelect.value);
};

// --- Rooms (GC) ---
async function loadRooms(){
  const roomsSnapshot = await getDocs(collection(db,"rooms"));
  const roomNames = roomsSnapshot.docs.map(doc=>doc.id);
  gcList.innerHTML="";
  roomNames.forEach(r=>{
    const li = document.createElement("li");
    li.textContent = r;
    li.onclick = ()=> joinRoom(r);
    gcList.appendChild(li);
  });
}
loadRooms();

// Join GC room
async function joinRoom(roomName){
  room = roomName;
  gcMessagesEl.innerHTML="";
  window.history.replaceState(null,null,"?room="+room);
  listenToRoomMessages();
}
joinRoom(room);

// Listen GC messages
function listenToRoomMessages(){
  const q = query(collection(db,"rooms",room,"messages"), orderBy("timestamp"));
  onSnapshot(q,snapshot=>{
    gcMessagesEl.innerHTML="";
    snapshot.forEach(doc=>{
      const msg = doc.data();
      const div = document.createElement("div");
      div.classList.add("message");
      if(msg.user===username) div.classList.add("self");
      else if(msg.user==="System") div.classList.add("system");
      else div.classList.add("other");
      div.innerHTML = msg.user==="System"? msg.text : `<b>${msg.user}:</b> ${msg.text}`;
      gcMessagesEl.appendChild(div);
      gcMessagesEl.scrollTop = gcMessagesEl.scrollHeight;
    });
  });
}

// Send GC message
sendBtn.onclick = async ()=>{
  const text = messageInput.value.trim();
  if(!text) return;
  await addDoc(collection(db,"rooms",room,"messages"),{
    user: username,
    text,
    timestamp: new Date()
  });
  messageInput.value="";
};
messageInput.addEventListener("keypress", e=>{if(e.key==="Enter") sendBtn.onclick();});

// --- Create new room ---
joinRoomBtn.onclick = async ()=>{
  const newRoom = newRoomInput.value.trim();
  if(!newRoom) return;
  await setDoc(doc(db,"rooms",newRoom),{created:new Date()});
  newRoomInput.value="";
  loadRooms();
  joinRoom(newRoom);
};

// --- Generate Room Link ---
generateLinkBtn.onclick = ()=>{
  const url = window.location.origin + "?room="+room;
  navigator.clipboard.writeText(url);
  alert("Room link copied: "+url);
};

// --- Change Username ---
changeUsernameBtn.onclick = ()=>{
  const newName = prompt("Enter new username:",username);
  if(newName && newName!==username){
    username = newName;
    currentUsernameEl.textContent = username;
  }
};

// --- DM System ---
async function loadUsers(){
  const usersSnapshot = await getDocs(collection(db,"users"));
  dmUserList.innerHTML="";
  usersSnapshot.forEach(doc=>{
    const u = doc.id;
    if(u===username) return;
    const li = document.createElement("li");
    li.textContent = u;
    li.onclick = ()=> openDM(u);
    dmUserList.appendChild(li);
  });
}
loadUsers();

function openDM(user){
  currentDM = user;
  dmPanel.classList.remove("hidden");
  document.getElementById("dmHeader").textContent = "DM with " + user;
  listenDMMessages(user);
}

function listenDMMessages(user){
  const chatId = [username,user].sort().join("_");
  const q = query(collection(db,"dms",chatId,"messages"), orderBy("timestamp"));
  onSnapshot(q,snapshot=>{
    dmMessagesEl.innerHTML="";
    snapshot.forEach(doc=>{
      const msg = doc.data();
      const div = document.createElement("div");
      div.classList.add("message");
      if(msg.user===username) div.classList.add("self");
      else div.classList.add("other");
      div.innerHTML = `<b>${msg.user}:</b> ${msg.text}`;
      dmMessagesEl.appendChild(div);
      dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
    });
  });
}

// Send DM
dmSendBtn.onclick = async ()=>{
  if(!currentDM) return;
  const text = dmMessageInput.value.trim();
  if(!text) return;
  const chatId = [username,currentDM].sort().join("_");
  await addDoc(collection(db,"dms",chatId,"messages"),{
    user: username,
    text,
    timestamp: new Date()
  });
  dmMessageInput.value="";
};
dmMessageInput.addEventListener("keypress", e=>{if(e.key==="Enter") dmSendBtn.onclick();});

// Close DM panel
dmCloseBtn.onclick = ()=>{
  dmPanel.classList.add("hidden");
  currentDM = null;
};
