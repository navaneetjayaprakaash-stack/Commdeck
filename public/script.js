import { db } from './firebase.js';
import { collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, getDocs, getDoc } from "firebase/firestore";

// DOM
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

// State
let username = "User"+Math.floor(Math.random()*1000);
let room = "general";
let currentDM = null;

// --- Load persistent user data ---
async function loadUserData() {
  const userDoc = doc(db,"users",username);
  const userSnap = await getDoc(userDoc);
  if(userSnap.exists()){
    const data = userSnap.data();
    if(data.lastUsername) username = data.lastUsername;
    if(data.lastRoom) room = data.lastRoom;
  }
  currentUsernameEl.textContent = username;
  await setDoc(doc(db,"users",username), { lastUsername:username, lastRoom:room, lastSeen:new Date() }, {merge:true});
}
await loadUserData();

// Periodically update lastSeen & lastRoom
setInterval(async()=>{ await setDoc(doc(db,"users",username), { lastSeen:new Date(), lastRoom:room }, {merge:true}); },60000);

// --- Themes ---
const themes = [
  {id:"sunset-glow",name:"Sunset Glow"}, {id:"purple-haze",name:"Purple Haze"}, {id:"deep-ocean",name:"Deep Ocean"},
  {id:"royal-blue",name:"Royal Blue"}, {id:"sky-breeze",name:"Sky Breeze"}, {id:"hot-pink",name:"Hot Pink"},
  {id:"molten-orange",name:"Molten Orange"}, {id:"golden-hour",name:"Golden Hour"}, {id:"rose-red",name:"Rose Red"},
  {id:"violet-dream",name:"Violet Dream"}, {id:"indigo-night",name:"Indigo Night"}, {id:"mystic-purple",name:"Mystic Purple"},
  {id:"fuchsia-glow",name:"Fuchsia Glow"}, {id:"electric-blue",name:"Electric Blue"}, {id:"aqua-mist",name:"Aqua Mist"},
  {id:"magenta-pulse",name:"Magenta Pulse"}, {id:"blazing-orange",name:"Blazing Orange"}, {id:"sunlit-gold",name:"Sunlit Gold"},
  {id:"royal-violet",name:"Royal Violet"}, {id:"night-indigo",name:"Night Indigo"}
];
themes.forEach(t=>{ const opt=document.createElement("option"); opt.value=t.id; opt.textContent=t.name; themeSelect.appendChild(opt); });
const savedTheme = localStorage.getItem("selectedTheme");
if(savedTheme){ document.body.dataset.theme = savedTheme; themeSelect.value = savedTheme; }
themeSelect.onchange = ()=>{ document.body.dataset.theme=themeSelect.value; localStorage.setItem("selectedTheme",themeSelect.value); };

// --- Load Rooms ---
async function loadRooms(){
  const snapshot = await getDocs(collection(db,"rooms"));
  gcList.innerHTML="";
  snapshot.forEach(doc=>{
    const li=document.createElement("li");
    li.textContent=doc.id;
    li.onclick=()=>joinRoom(doc.id);
    gcList.appendChild(li);
  });
}
loadRooms();

// --- Join Room ---
async function joinRoom(roomName){
  room = roomName;
  gcMessagesEl.innerHTML="";
  window.history.replaceState(null,null,"?room="+room);
  await setDoc(doc(db,"users",username), { lastRoom:room }, {merge:true});
  const q = query(collection(db,"rooms",room,"messages"), orderBy("timestamp"));
  onSnapshot(q,snapshot=>{
    gcMessagesEl.innerHTML="";
    snapshot.forEach(doc=>{
      const msg=doc.data();
      const div=document.createElement("div");
      div.classList.add("message");
      if(msg.user===username) div.classList.add("self");
      else if(msg.user==="System") div.classList.add("system");
      else div.classList.add("other");
      div.innerHTML=msg.user==="System"?msg.text:`<b>${msg.user}:</b> ${msg.text}`;
      gcMessagesEl.appendChild(div);
      gcMessagesEl.scrollTop=gcMessagesEl.scrollHeight;
    });
  });
}
joinRoom(room);

// --- Send GC ---
sendBtn.onclick=async()=>{
  const text=messageInput.value.trim(); if(!text) return;
  await addDoc(collection(db,"rooms",room,"messages"),{user:username,text,timestamp:new Date()});
  messageInput.value="";
};
messageInput.addEventListener("keypress",e=>{if(e.key==="Enter") sendBtn.onclick();});

// --- Create GC ---
joinRoomBtn.onclick=async()=>{
  const newRoom=newRoomInput.value.trim(); if(!newRoom) return;
  await setDoc(doc(db,"rooms",newRoom),{created:new Date()});
  newRoomInput.value="";
  loadRooms();
  joinRoom(newRoom);
};

// --- Generate Link ---
generateLinkBtn.onclick=()=>{ navigator.clipboard.writeText(window.location.origin+"?room="+room); alert("Room link copied!"); };

// --- Change Username ---
changeUsernameBtn.onclick=async()=>{
  const newName=prompt("Enter new username:",username);
  if(newName && newName!==username){
    const oldName=username;
    username=newName;
    currentUsernameEl.textContent=username;
    const oldDoc=await getDoc(doc(db,"users",oldName));
    const lastRoom=oldDoc.exists()?oldDoc.data().lastRoom:"general";
    await setDoc(doc(db,"users",username), { lastUsername:username, lastRoom, lastSeen:new Date() }, {merge:true});
  }
};

// --- Load Users for DM ---
async function loadUsers(){
  const snapshot = await getDocs(collection(db,"users"));
  dmUserList.innerHTML="";
  snapshot.forEach(doc=>{
    const u=doc.id;
    if(u===username) return;
    const li=document.createElement("li");
    li.textContent=u;
    li.onclick=()=>openDM(u);
    dmUserList.appendChild(li);
  });
}
loadUsers();

// --- DM ---
function openDM(user){
  currentDM=user;
  dmPanel.classList.remove("hidden");
  document.getElementById("dmHeader").textContent="DM with "+user;
  const chatId=[username,user].sort().join("_");
  const q=query(collection(db,"dms",chatId,"messages"), orderBy("timestamp"));
  onSnapshot(q,snapshot=>{
    dmMessagesEl.innerHTML="";
    snapshot.forEach(doc=>{
      const msg=doc.data();
      const div=document.createElement("div");
      div.classList.add("message");
      if(msg.user===username) div.classList.add("self");
      else div.classList.add("other");
      div.innerHTML=`<b>${msg.user}:</b> ${msg.text}`;
      dmMessagesEl.appendChild(div);
      dmMessagesEl.scrollTop=dmMessagesEl.scrollHeight;
    });
  });
}

dmSendBtn.onclick=async()=>{
  if(!currentDM) return;
  const text=dmMessageInput.value.trim(); if(!text) return;
  const chatId=[username,currentDM].sort().join("_");
  await addDoc(collection(db,"dms",chatId,"messages"),{user:username,text,timestamp:new Date()});
  dmMessageInput.value="";
};
dmMessageInput.addEventListener("keypress",e=>{if(e.key==="Enter") dmSendBtn.onclick();});

dmCloseBtn.onclick=()=>{ dmPanel.classList.add("hidden"); currentDM=null; };
