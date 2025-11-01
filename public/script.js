import { auth, provider, db } from "./firebase-config.js";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, orderBy, onSnapshot, where } from "firebase/firestore";

// =======================
// Variables
// =======================
let socket = io();
let user = null;
let currentRoom = "general";
let currentDm = null;
let dmList = {};
let typingUsers = new Set();
let typingTimer;
const TYPING_DELAY = 1000;

// =======================
// Style / Customization
// =======================
const styleConfig = {
  bgColor: "#282c34",
  selfColor: "#3c6e9d",
  otherColor: "#4d5c6b",
  fontSize: "14",
  isDarkMode: true
};
function saveStyles() { localStorage.setItem('styleConfig', JSON.stringify(styleConfig)); }
function loadStyles() {
  const saved = localStorage.getItem('styleConfig');
  if (saved) Object.assign(styleConfig, JSON.parse(saved));
  applyStyles();
}
function applyStyles() {
  document.body.classList.toggle('dark-mode', styleConfig.isDarkMode);
  document.documentElement.style.setProperty("--bg", styleConfig.bgColor);
  document.documentElement.style.setProperty("--self-bubble", styleConfig.selfColor);
  document.documentElement.style.setProperty("--other-bubble", styleConfig.otherColor);
  document.documentElement.style.setProperty("--font-size", `${styleConfig.fontSize}px`);
  document.getElementById("bgColor").value = styleConfig.bgColor;
  document.getElementById("selfColor").value = styleConfig.selfColor;
  document.getElementById("otherColor").value = styleConfig.otherColor;
  document.getElementById("fontSize").value = styleConfig.fontSize;
}
function toggleDarkMode() {
  styleConfig.isDarkMode = !styleConfig.isDarkMode;
  saveStyles(); applyStyles();
}
function resetStyles() {
  Object.assign(styleConfig,{
    bgColor:"#ffffff", selfColor:"#dfffe0", otherColor:"#f3f3f3", fontSize:"14", isDarkMode:false
  });
  saveStyles(); applyStyles();
}

// =======================
// Auth
// =======================
document.getElementById("signInGoogle").onclick = async ()=>{
  const result = await signInWithPopup(auth, provider);
  user = { uid: result.user.uid, name: result.user.displayName };
  document.getElementById("displayName").textContent = user.name;
  document.getElementById("displayUid").textContent = user.uid;
  joinRoom(currentRoom);
};

onAuthStateChanged(auth, u=>{
  if(u){
    user = { uid: u.uid, name: u.displayName||"Guest" };
    document.getElementById("displayName").textContent = user.name;
    document.getElementById("displayUid").textContent = user.uid;
    joinRoom(currentRoom);
  }
});

// =======================
// Rooms / DMs
// =======================
function joinRoom(room){
  currentRoom = room;
  currentDm = null;
  clearMessages("chatPanel");
  document.getElementById("currentRoomLabel").textContent = room;
  socket.emit("joinRoom",{ room, uid: user.uid, name: user.name });
  document.getElementById("chatPanel").style.display="block";
  document.getElementById("dmPanel").style.display="none";
  document.getElementById("chatTabBtn").classList.add("active");
  document.getElementById("dmTabBtn").classList.remove("active");
  loadRoomMessages(room);
}
async function loadRoomMessages(room){
  const messagesRef = collection(db,"messages");
  const q = query(messagesRef, where("room","==",room), orderBy("ts"));
  onSnapshot(q, snapshot=>{
    clearMessages("chatPanel");
    snapshot.forEach(doc=>{
      addMessage(doc.data(),"chatPanel");
    });
  });
}
function openDm(uid,name){
  currentDm = { uid,name };
  if(!dmList[uid]){ dmList[uid]=name; updateDmList(); }
  clearMessages("dmPanel");
  document.getElementById("chatPanel").style.display="none";
  document.getElementById("dmPanel").style.display="block";
  document.getElementById("currentRoomLabel").textContent=`DM: ${name}`;
  document.getElementById("dmTabBtn").classList.add("active");
  document.getElementById("chatTabBtn").classList.remove("active");
}
function updateDmList(){
  const list = document.getElementById("dmList");
  list.innerHTML="";
  const entries = Object.entries(dmList);
  if(entries.length===0){ const empty=document.createElement("li"); empty.textContent="No conversations yet"; empty.className="notice"; list.appendChild(empty); return;}
  entries.forEach(([uid,name])=>{
    const li=document.createElement("li"); li.textContent=name;
    li.onclick=()=>openDm(uid,name); list.appendChild(li);
  });
}

// =======================
// Messages
// =======================
async function sendMessage(){
  if(!user) return alert("Sign in first!");
  const input=document.getElementById("messageInput");
  if(!input.value.trim()) return;
  const msg={ from:user.name, uid:user.uid, text:input.value, ts:Date.now(), room:currentRoom };
  await addDoc(collection(db,"messages"), msg);
  socket.emit(currentDm?"privateMessage":"chatMessage",{ toUid: currentDm?.uid, msg });
  input.value="";
  stopTyping();
}
document.getElementById("sendBtn").onclick=sendMessage;
document.getElementById("messageInput").addEventListener("keypress",(e)=>{if(e.key==="Enter")sendMessage();});

// =======================
// Socket.io
// =======================
socket.on("chatMessage",(msg)=>{ if(msg.uid!==user?.uid) addMessage(msg,"chatPanel"); });
socket.on("privateMessage",(msg)=>{ openDm(msg.uid,msg.from); addMessage(msg,"dmPanel"); });

// =======================
// Typing indicator
// =======================
function typing(){ socket.emit("typing",{uid:user.uid,name:user.name,room:currentRoom}); clearTimeout(typingTimer); typingTimer=setTimeout(stopTyping,TYPING_DELAY);}
function stopTyping(){ socket.emit("stopTyping",{uid:user.uid,name:user.name,room:currentRoom}); }
socket.on("typing",data=>{ if(data.uid!==user?.uid){ typingUsers.add(data.name); updateTypingIndicator(); }});
socket.on("stopTyping",data=>{ if(data.uid!==user?.uid){ typingUsers.delete(data.name); updateTypingIndicator(); }});
function updateTypingIndicator(){
  const users=Array.from(typingUsers);
  const indicator=document.querySelector(".typing-indicator")||document.createElement("div");
  indicator.className="typing-indicator";
  if(users.length===0){ indicator.style.display="none"; }
  else if(users.length===1){ indicator.textContent=`${users[0]} is typing...`; indicator.style.display="block"; }
  else{ indicator.textContent="Several users are typing..."; indicator.style.display="block"; }
  if(!document.querySelector(".typing-indicator")) document.getElementById("chatPanel").appendChild(indicator);
}

// =======================
// UI Helpers
// =======================
function addMessage(msg,panelId){
  const panel=document.getElementById(panelId);
  const div=document.createElement("div");
  if(msg.system){ div.className="msg system-msg"; div.textContent=msg.text; }
  else{
    div.className=`msg ${msg.uid===user.uid?"self":"other"}`;
    const meta=document.createElement("div"); meta.className="meta"; meta.textContent=`${msg.from} • ${new Date(msg.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
    const text=document.createElement("div"); text.textContent=msg.text;
    div.appendChild(meta); div.appendChild(text);
  }
  panel.appendChild(div); panel.scrollTop=panel.scrollHeight;
}
function clearMessages(panelId){ document.getElementById(panelId).innerHTML=""; }

// =======================
// Event listeners
// =======================
window.onload=()=>{
  loadStyles();
  document.getElementById("chatTabBtn").onclick=()=>{currentDm=null;document.getElementById("chatPanel").style.display="block";document.getElementById("dmPanel").style.display="none";document.getElementById("currentRoomLabel").textContent=currentRoom;document.getElementById("chatTabBtn").classList.add("active");document.getElementById("dmTabBtn").classList.remove("active");};
  document.getElementById("dmTabBtn").onclick=()=>{if(!currentDm){document.getElementById("currentRoomLabel").textContent="DMs";}document.getElementById("chatPanel").style.display="none";document.getElementById("dmPanel").style.display="block";document.getElementById("dmTabBtn").classList.add("active");document.getElementById("chatTabBtn").classList.remove("active");};
  document.getElementById("bgColor").addEventListener("input",(e)=>{styleConfig.bgColor=e.target.value;saveStyles();applyStyles();});
  document.getElementById("selfColor").addEventListener("input",(e)=>{styleConfig.selfColor=e.target.value;saveStyles();applyStyles();});
  document.getElementById("otherColor").addEventListener("input",(e)=>{styleConfig.otherColor=e.target.value;saveStyles();applyStyles();});
  document.getElementById("fontSize").addEventListener("input",(e)=>{styleConfig.fontSize=e.target.value;saveStyles();applyStyles();});
  document.getElementById("toggleDarkMode").onclick=toggleDarkMode;
  document.getElementById("resetCustomize").onclick=resetStyles;
  document.getElementById("messageInput").addEventListener("input",typing);
  document.getElementById("clearBtn").onclick=()=>{clearMessages("chatPanel");clearMessages("dmPanel");};
  document.getElementById("createRoomBtn").onclick=()=>{const val=document.getElementById("newRoomInput").value.trim();if(val){joinRoom(val);document.getElementById("newRoomInput").value="";}};
  document.getElementById("changeNameBtn").onclick=()=>{const val=document.getElementById("displayNameInput").value.trim();if(val){user.name=val;document.getElementById("displayName").textContent=val;socket.emit("changeName",{uid:user.uid,name:user.name});}};
};
