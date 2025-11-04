import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  setDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let username = "User" + Math.floor(Math.random() * 1000);
let room = new URLSearchParams(window.location.search).get("room") || "general";
let currentDM = null;
let dms = {};

const gcMessagesEl = document.getElementById("gcMessages");
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

const dmModal = document.getElementById("dmModal");
const dmHeader = document.getElementById("dmHeader");
const dmMessagesEl = document.getElementById("dmMessages");
const dmMessageInput = document.getElementById("dmMessageInput");
const dmSendBtn = document.getElementById("dmSendBtn");
const dmCloseBtn = document.getElementById("dmCloseBtn");

currentUsernameEl.textContent = username;

// ---------------------------
// Themes
// ---------------------------
const themes = [
  {id:"sunset-glow",name:"Sunset Glow"},{id:"purple-haze",name:"Purple Haze"},
  {id:"deep-ocean",name:"Deep Ocean"},{id:"royal-blue",name:"Royal Blue"},
  {id:"sky-breeze",name:"Sky Breeze"},{id:"hot-pink",name:"Hot Pink"},
  {id:"molten-orange",name:"Molten Orange"},{id:"golden-hour",name:"Golden Hour"},
  {id:"rose-red",name:"Rose Red"},{id:"violet-dream",name:"Violet Dream"},
  {id:"indigo-night",name:"Indigo Night"},{id:"mystic-purple",name:"Mystic Purple"},
  {id:"fuchsia-glow",name:"Fuchsia Glow"},{id:"electric-blue",name:"Electric Blue"},
  {id:"aqua-mist",name:"Aqua Mist"},{id:"magenta-pulse",name:"Magenta Pulse"},
  {id:"blazing-orange",name:"Blazing Orange"},{id:"sunlit-gold",name:"Sunlit Gold"},
  {id:"royal-violet",name:"Royal Violet"},{id:"night-indigo",name:"Night Indigo"}
];
themes.forEach(t=>{
  const opt = document.createElement("option");
  opt.value = t.id;
  opt.textContent = t.name;
  themeSelect.appendChild(opt);
});
themeSelect.value = "sunset-glow";
document.body.setAttribute("data-theme", "sunset-glow");
themeSelect.addEventListener("change", ()=>{
  document.body.setAttribute("data-theme", themeSelect.value);
});

// ---------------------------
// Group Chat
// ---------------------------
async function joinRoom(r){
  room = r;
  gcMessagesEl.innerHTML = "";
  highlightCurrentRoom();
  listenGC();
}
joinRoomBtn.addEventListener("click", ()=>{if(newRoomInput.value.trim()) joinRoom(newRoomInput.value.trim()); newRoomInput.value="";});

// Send GC message
async function sendMessage(){
  const text = messageInput.value.trim(); if(!text) return;
  await addDoc(collection(db,"rooms",room,"messages"),{user:username,text,timestamp:Date.now()});
  messageInput.value="";
}
sendBtn.addEventListener("click",sendMessage);
messageInput.addEventListener("keypress", e=>{if(e.key==="Enter") sendMessage();});

// Listen GC messages
function listenGC(){
  const q = query(collection(db,"rooms",room,"messages"),orderBy("timestamp"));
  onSnapshot(q,snap=>{
    gcMessagesEl.innerHTML="";
    snap.docs.forEach(doc=>{
      const m = doc.data();
      const div = document.createElement("div");
      div.classList.add("message");
      div.classList.add(m.user===username?"self":"other");
      div.innerHTML=`<b>${m.user}</b>: ${m.text}`;
      gcMessagesEl.appendChild(div);
    });
    gcMessagesEl.scrollTop = gcMessagesEl.scrollHeight;
  });
}

// ---------------------------
// GC List
// ---------------------------
async function loadGCs(){
  const snap = await getDocs(collection(db,"rooms"));
  gcListEl.innerHTML="";
  snap.docs.forEach(d=>{
    const li = document.createElement("li");
    li.textContent = d.id;
    if(d.id===room) li.classList.add("active-room");
    li.addEventListener("click", ()=>joinRoom(d.id));
    gcListEl.appendChild(li);
  });
}
loadGCs();

// ---------------------------
// Users & DM
// ---------------------------
const usersMock = ["Alice","Bob","Charlie"].filter(u=>u!==username); // replace with Firestore users if needed
function renderUsers(){
  userListEl.innerHTML="";
  usersMock.forEach(u=>{
    const li = document.createElement("li"); li.textContent = u;
    const btn = document.createElement("button"); btn.textContent="DM"; btn.className="dm-btn";
    btn.addEventListener("click",()=>openDM(u));
    li.appendChild(btn); userListEl.appendChild(li);
  });
}
renderUsers();

// DM Modal
function openDM(other){
  currentDM = other;
  dmHeader.textContent = "DM: " + other;
  dmModal.classList.remove("hidden");
  listenDM(other);
}

dmCloseBtn.addEventListener("click",()=>{dmModal.classList.add("hidden");currentDM=null;});

// DM Firestore listener
let unsubscribeDM = null;
function listenDM(other){
  if(unsubscribeDM) unsubscribeDM();
  const dmId = [username,other].sort().join("_");
  const q = query(collection(db,"dmMessages",dmId,"messages"),orderBy("timestamp"));
  unsubscribeDM = onSnapshot(q, snap=>{
    dmMessagesEl.innerHTML="";
    snap.docs.forEach(doc=>{
      const m = doc.data();
      const div = document.createElement("div");
      div.classList.add("message");
      div.classList.add(m.user===username?"self":"other");
      div.innerHTML=`<b>${m.user}</b>: ${m.text}`;
      dmMessagesEl.appendChild(div);
    });
    dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
  });
}

// DM send
dmSendBtn.addEventListener("click", async ()=>{
  const text = dmMessageInput.value.trim(); if(!text) return;
  const dmId = [username,currentDM].sort().join("_");
  await addDoc(collection(db,"dmMessages",dmId,"messages"),{user:username,text,timestamp:Date.now()});
  dmMessageInput.value="";
});
dmMessageInput.addEventListener("keypress", e=>{if(e.key==="Enter") dmSendBtn.click();});

// ---------------------------
// Change username
// ---------------------------
changeUsernameBtn.addEventListener("click", ()=>{
  const newU = prompt("Enter new username:",username);
  if(newU){username=newU;currentUsernameEl.textContent=username;}
});

// ---------------------------
// Generate Link
// ---------------------------
generateLinkBtn.addEventListener("click", ()=>{
  navigator.clipboard.writeText(window.location.origin+"?room="+room);
  alert("Room link copied");
});

// ---------------------------
// Highlight current room
// ---------------------------
function highlightCurrentRoom(){
  Array.from(gcListEl.children).forEach(li=>{li.classList.remove("active-room"); if(li.textContent===room) li.classList.add("active-room");});
}
