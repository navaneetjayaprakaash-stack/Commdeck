import { collection, doc, addDoc, onSnapshot, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const socket = {}; // placeholder for real-time if you add sockets
let username = "User" + Math.floor(Math.random()*1000);
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

// Themes
const themes = [
  {id:"sunset-glow",name:"Sunset Glow"},{id:"purple-haze",name:"Purple Haze"},{id:"deep-ocean",name:"Deep Ocean"},
  {id:"royal-blue",name:"Royal Blue"},{id:"sky-breeze",name:"Sky Breeze"},{id:"hot-pink",name:"Hot Pink"},
  {id:"molten-orange",name:"Molten Orange"},{id:"golden-hour",name:"Golden Hour"},{id:"rose-red",name:"Rose Red"},
  {id:"violet-dream",name:"Violet Dream"},{id:"indigo-night",name:"Indigo Night"},{id:"mystic-purple",name:"Mystic Purple"},
  {id:"fuchsia-glow",name:"Fuchsia Glow"},{id:"electric-blue",name:"Electric Blue"},{id:"aqua-mist",name:"Aqua Mist"},
  {id:"magenta-pulse",name:"Magenta Pulse"},{id:"blazing-orange",name:"Blazing Orange"},{id:"sunlit-gold",name:"Sunlit Gold"},
  {id:"royal-violet",name:"Royal Violet"},{id:"night-indigo",name:"Night Indigo"}
];
themes.forEach(t=>{let opt=document.createElement("option");opt.value=t.id;opt.textContent=t.name;themeSelect.appendChild(opt);});
themeSelect.value = "sunset-glow";
document.body.setAttribute("data-theme","sunset-glow");
themeSelect.addEventListener("change",()=>{document.body.setAttribute("data-theme",themeSelect.value);});

// Send GC message
async function sendMessage(){
  const text = messageInput.value.trim();
  if(!text) return;
  await addDoc(collection(db,"rooms",room,"messages"),{user:username,text,timestamp:Date.now()});
  messageInput.value="";
}
sendBtn.addEventListener("click",sendMessage);
messageInput.addEventListener("keypress",e=>{if(e.key==="Enter")sendMessage();});

// Listen to GC messages
onSnapshot(collection(db,"rooms",room,"messages"),snap=>{
  gcMessagesEl.innerHTML="";
  snap.docs.forEach(doc=>{const m=doc.data();const div=document.createElement("div");div.classList.add("message");div.classList.add(m.user===username?"self":"other");div.innerHTML=`<b>${m.user}</b>: ${m.text}`;gcMessagesEl.appendChild(div);});
  gcMessagesEl.scrollTop = gcMessagesEl.scrollHeight;
});

// Join room
joinRoomBtn.addEventListener("click",()=>{const r=newRoomInput.value.trim();if(!r)return;room=r;newRoomInput.value="";gcMessagesEl.innerHTML="";});

// Change username
changeUsernameBtn.addEventListener("click",()=>{const newU=prompt("Enter new username",username);if(newU){username=newU;currentUsernameEl.textContent=username;}});

// Generate link
generateLinkBtn.addEventListener("click",()=>{navigator.clipboard.writeText(window.location.origin+"?room="+room);alert("Room link copied");});

// DM Modal
function openDM(other){currentDM=other;dmHeader.textContent="DM: "+other;dmModal.classList.remove("hidden");renderDM(other);}
function renderDM(user){dmMessagesEl.innerHTML="";if(!dms[user])dms[user]=[];dms[user].forEach(msg=>{const div=document.createElement("div");div.classList.add("message");div.classList.add(msg.user===username?"self":"other");div.innerHTML=`<b>${msg.user}</b>: ${msg.text}`;dmMessagesEl.appendChild(div);});dmMessagesEl.scrollTop=dmMessagesEl.scrollHeight;}
dmSendBtn.addEventListener("click",async ()=>{
  const text=dmMessageInput.value.trim();if(!text)return;
  const dmId=[username,currentDM].sort().join("_");
  await addDoc(collection(db,"dmMessages",dmId,"messages"),{user:username,text,timestamp:Date.now()});
  dmMessageInput.value="";
});
dmMessageInput.addEventListener("keypress",e=>{if(e.key==="Enter") dmSendBtn.click();});
dmCloseBtn.addEventListener("click",()=>{dmModal.classList.add("hidden");currentDM=null;});

// Listen to DMs
themes.forEach(t=>{}); // placeholder for theme

// Load users & DM buttons (mocked)
const usersMock=["Alice","Bob","Charlie"].filter(u=>u!==username);
userListEl.innerHTML="";
usersMock.forEach(u=>{
  const li=document.createElement("li");li.textContent=u;
  const btn=document.createElement("button");btn.textContent="DM";btn.className="dm-btn";
  btn.addEventListener("click",()=>openDM(u));
  li.appendChild(btn);userListEl.appendChild(li);
});
