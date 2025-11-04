// ==========================
// Firebase Setup
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-app-compat.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-firestore-compat.js";

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_CONFIG_HERE",
  authDomain: "YOUR_FIREBASE_CONFIG_HERE",
  projectId: "YOUR_FIREBASE_CONFIG_HERE",
  storageBucket: "YOUR_FIREBASE_CONFIG_HERE",
  messagingSenderId: "YOUR_FIREBASE_CONFIG_HERE",
  appId: "YOUR_FIREBASE_CONFIG_HERE"
};

firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

// ==========================
// DOM & Variables
// ==========================
const gcMessagesEl = document.getElementById("gcMessages");
const userListEl = document.getElementById("userList");
const gcListEl = document.getElementById("gcList");
const currentUsernameEl = document.getElementById("currentUsername");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const generateLinkBtn = document.getElementById("generateLinkBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const newRoomInput = document.getElementById("newRoomInput");
const themeSelect = document.getElementById("themeSelect");

const dmModal = document.getElementById("dmModal");
const dmHeader = document.getElementById("dmHeader");
const dmMessagesEl = document.getElementById("dmMessages");
const dmMessageInput = document.getElementById("dmMessageInput");
const dmSendBtn = document.getElementById("dmSendBtn");
const dmCloseBtn = document.getElementById("dmCloseBtn");

let username = "User" + Math.floor(Math.random()*1000);
let room = new URLSearchParams(window.location.search).get("room") || "general";
let allRooms = [room];
let dms = {}; // { username: [messages] }
let currentDM = null;
let unsubscribeGC = null;

// ==========================
// Themes
// ==========================
const themes = [
  { id:"sunset-glow", name:"Sunset Glow"},{ id:"purple-haze", name:"Purple Haze"},
  { id:"deep-ocean", name:"Deep Ocean"},{ id:"royal-blue", name:"Royal Blue"},
  { id:"sky-breeze", name:"Sky Breeze"},{ id:"hot-pink", name:"Hot Pink"},
  { id:"molten-orange", name:"Molten Orange"},{ id:"golden-hour", name:"Golden Hour"},
  { id:"rose-red", name:"Rose Red"},{ id:"violet-dream", name:"Violet Dream"},
  { id:"indigo-night", name:"Indigo Night"},{ id:"mystic-purple", name:"Mystic Purple"},
  { id:"fuchsia-glow", name:"Fuchsia Glow"},{ id:"electric-blue", name:"Electric Blue"},
  { id:"aqua-mist", name:"Aqua Mist"},{ id:"magenta-pulse", name:"Magenta Pulse"},
  { id:"blazing-orange", name:"Blazing Orange"},{ id:"sunlit-gold", name:"Sunlit Gold"},
  { id:"royal-violet", name:"Royal Violet"},{ id:"night-indigo", name:"Night Indigo"}
];

themes.forEach(t => {
  const opt = document.createElement("option");
  opt.value = t.id;
  opt.textContent = t.name;
  themeSelect.appendChild(opt);
});
const savedTheme = localStorage.getItem("selectedTheme") || themes[0].id;
document.body.dataset.theme = savedTheme;
themeSelect.value = savedTheme;
themeSelect.addEventListener("change", ()=>{
  document.body.dataset.theme = themeSelect.value;
  localStorage.setItem("selectedTheme", themeSelect.value);
});

// ==========================
// Username Display
// ==========================
currentUsernameEl.textContent = username;

// ==========================
// Join Room
// ==========================
function joinRoom(newRoom){
  room = newRoom;
  if(!allRooms.includes(room)) allRooms.push(room);
  renderGClist();
  gcMessagesEl.innerHTML="";
  if(unsubscribeGC) unsubscribeGC();

  const roomRef = firestore.collection("rooms").doc(room).collection("messages").orderBy("timestamp");
  unsubscribeGC = roomRef.onSnapshot(snapshot=>{
    snapshot.docChanges().forEach(change=>{
      if(change.type==="added") addGCMessage(change.doc.data());
    });
  });

  history.replaceState(null,"","?room="+room);
}

function addGCMessage(msg){
  const div = document.createElement("div");
  div.classList.add("message");
  if(msg.user==="System") div.classList.add("system");
  else if(msg.user===username) div.classList.add("self");
  else div.classList.add("other");
  div.innerHTML = msg.user==="System"?msg.text:`<b>${msg.user}:</b> ${msg.text}`;
  gcMessagesEl.appendChild(div);
  gcMessagesEl.scrollTop = gcMessagesEl.scrollHeight;
}

// ==========================
// Render GC List
// ==========================
function renderGClist(){
  gcListEl.innerHTML="";
  allRooms.forEach(r=>{
    const li = document.createElement("li");
    li.textContent = r;
    if(r===room) li.classList.add("active-room");
    li.onclick = ()=> joinRoom(r);
    gcListEl.appendChild(li);
  });
}

// ==========================
// Send GC Message
// ==========================
function sendMessage(){
  const text = messageInput.value.trim();
  if(!text) return;
  firestore.collection("rooms").doc(room).collection("messages").add({
    user: username,
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  messageInput.value="";
}
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e=>{ if(e.key==="Enter") sendMessage(); });

// ==========================
// Change Username
// ==========================
function changeUsername(){
  const newU = prompt("Enter new username:", username);
  if(newU && newU!==username) username=newU;
  currentUsernameEl.textContent = username;
}
changeUsernameBtn.addEventListener("click",changeUsername);

// ==========================
// Generate Link
// ==========================
function generateRoomLink(){
  const url = window.location.origin + "?room=" + room;
  navigator.clipboard.writeText(url);
  alert("Room link copied: "+url);
}
generateLinkBtn.addEventListener("click", generateRoomLink);

// ==========================
// Join New Room
// ==========================
joinRoomBtn.addEventListener("click", ()=>{
  const newR = newRoomInput.value.trim();
  if(newR) joinRoom(newR);
  newRoomInput.value="";
});

// ==========================
// Users + DM
// ==========================
function renderUsers(users){
  userListEl.innerHTML="";
  users.forEach(u=>{
    if(u===username) return;
    const li = document.createElement("li");
    li.textContent = u;

    const dmBtn = document.createElement("button");
    dmBtn.textContent="DM";
    dmBtn.className="dm-btn";
    dmBtn.onclick = e=>{
      e.stopPropagation();
      openDM(u);
    };
    li.appendChild(dmBtn);
    userListEl.appendChild(li);
  });
}

// ==========================
// DM Modal
// ==========================
function openDM(other){
  currentDM = other;
  dmHeader.textContent = "DM: " + other;
  dmModal.classList.remove("hidden");
  if(!dms[other]) dms[other]=[];
  renderDM(other);
}

function renderDM(user){
  dmMessagesEl.innerHTML="";
  dms[user].forEach(msg=>{
    const div = document.createElement("div");
    div.classList.add("message");
    div.classList.add(msg.user===username?"self":"other");
    div.innerHTML = `<b>${msg.user}</b>: ${msg.text}`;
    dmMessagesEl.appendChild(div);
  });
  dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
}

dmSendBtn.addEventListener("click", ()=>{
  const text = dmMessageInput.value.trim();
  if(!text || !currentDM) return;
  const msgObj = { user: username, text };
  if(!dms[currentDM]) dms[currentDM]=[];
  dms[currentDM].push(msgObj);
  renderDM(currentDM);
  dmMessageInput.value="";
});

dmCloseBtn.addEventListener("click", ()=>{
  dmModal.classList.add("hidden");
  currentDM = null;
});

// ==========================
// Initialize
// ==========================
joinRoom(room);
renderGClist();
