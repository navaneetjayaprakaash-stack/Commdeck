import { db } from './firebase.js';
import { collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";

// DOM Elements
const app = document.getElementById('app');

// --- State ---
let username = 'User' + Math.floor(Math.random()*1000);
let room = 'general';
let currentDM = null;

// Render UI
app.innerHTML = `
  <div id="sidebar">
    <h2>Chat Rooms</h2>
    <div class="list-section">
      <h3>Group Chats</h3>
      <ul id="gcList"></ul>
      <input id="newRoomInput" placeholder="New room" />
      <button id="joinRoomBtn">Join/Create Room</button>
      <button id="generateLinkBtn">Copy Room Link</button>
    </div>
    <div class="list-section">
      <h3>Direct Messages</h3>
      <ul id="dmUserList"></ul>
    </div>
    <div class="list-section">
      <h3>Theme</h3>
      <select id="themeSelect"></select>
    </div>
    <div class="list-section">
      <button id="changeUsernameBtn">Change Username</button>
    </div>
  </div>
  <div id="chat-area">
    <div id="chat-header"><span id="roomName">Room: ${room}</span></div>
    <div id="chat-messages"></div>
    <div id="input-area">
      <input id="messageInput" placeholder="Type a message..." />
      <button id="sendBtn">Send</button>
    </div>
  </div>
  <div id="dm-panel" class="hidden">
    <div id="dm-header"><span id="dmHeader"></span><button id="dmCloseBtn">X</button></div>
    <div id="dm-messages"></div>
    <div id="dm-input">
      <input id="dmMessageInput" placeholder="Type a message..." />
      <button id="dmSendBtn">Send</button>
    </div>
  </div>
`;

// DOM refs
const gcList = document.getElementById('gcList');
const newRoomInput = document.getElementById('newRoomInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const generateLinkBtn = document.getElementById('generateLinkBtn');
const dmUserList = document.getElementById('dmUserList');
const themeSelect = document.getElementById('themeSelect');
const changeUsernameBtn = document.getElementById('changeUsernameBtn');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const roomNameEl = document.getElementById('roomName');

const dmPanel = document.getElementById('dm-panel');
const dmHeader = document.getElementById('dmHeader');
const dmCloseBtn = document.getElementById('dmCloseBtn');
const dmMessages = document.getElementById('dm-messages');
const dmMessageInput = document.getElementById('dmMessageInput');
const dmSendBtn = document.getElementById('dmSendBtn');

// --- Themes ---
const themes = [
  'sunset-glow','purple-haze','deep-ocean','royal-blue','sky-breeze','hot-pink','molten-orange','golden-hour','rose-red','violet-dream','indigo-night','mystic-purple','fuchsia-glow','electric-blue','aqua-mist','magenta-pulse','blazing-orange','sunlit-gold','royal-violet','night-indigo'
];

themes.forEach(t => { const opt = document.createElement('option'); opt.value=t; opt.textContent=t.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase()); themeSelect.appendChild(opt); });
const savedTheme = localStorage.getItem('selectedTheme');
if(savedTheme) document.body.dataset.theme = savedTheme;
themeSelect.onchange = ()=>{ document.body.dataset.theme=themeSelect.value; localStorage.setItem('selectedTheme', themeSelect.value); };

// --- Rooms ---
async function loadRooms(){
  const roomsSnapshot = await getDocs(collection(db,'rooms'));
  gcList.innerHTML='';
  roomsSnapshot.forEach(r=>{ const li=document.createElement('li'); li.textContent=r.id; li.onclick=()=> joinRoom(r.id); gcList.appendChild(li); });
}
async function joinRoom(r){
  room=r;
  roomNameEl.textContent='Room: '+room;
  chatMessages.innerHTML='';
  listenRoomMessages();
}
joinRoom(room);
loadRooms();

joinRoomBtn.onclick=async()=>{
  const newR=newRoomInput.value.trim();
  if(!newR) return;
  await setDoc(doc(db,'rooms',newR),{created:new Date()});
  newRoomInput.value='';
  loadRooms();
  joinRoom(newR);
};
generateLinkBtn.onclick=()=>{navigator.clipboard.writeText(window.location.origin+'?room='+room); alert('Room link copied: '+window.location.origin+'?room='+room);};

// --- GC Messages ---
function listenRoomMessages(){
  const q = query(collection(db,'rooms',room,'messages'),orderBy('timestamp'));
  onSnapshot(q,snap=>{
    chatMessages.innerHTML='';
    snap.forEach(doc=>{
      const m=doc.data();
      const div=document.createElement('div');
      div.className='message';
      if(m.user===username) div.classList.add('self'); else if(m.user==='System') div.classList.add('system'); else div.classList.add('other');
      div.innerHTML=(m.user==='System'?m.text:`<b>${m.user}:</b> ${m.text}`);
      chatMessages.appendChild(div);
      chatMessages.scrollTop=chatMessages.scrollHeight;
    });
  });
}
sendBtn.onclick=async()=>{ const text=messageInput.value.trim(); if(!text) return; await addDoc(collection(db,'rooms',room,'messages'),{user:username,text,timestamp:new Date()}); messageInput.value=''; };
messageInput.addEventListener('keypress', e=>{if(e.key==='Enter') sendBtn.onclick();});

// --- Username ---
changeUsernameBtn.onclick=()=>{ const newName=prompt('Enter new username:',username); if(newName && newName!==username){username=newName;} };

// --- DM Users ---
async function loadUsers(){
  const usersSnapshot=await getDocs(collection(db,'users'));
  dmUserList.innerHTML='';
  usersSnapshot.forEach(doc=>{
    const u=doc.id; if(u===username) return;
    const li=document.createElement('li'); li.textContent=u; li.onclick=()=> openDM(u); dmUserList.appendChild(li);
  });
}
loadUsers();

function openDM(u){currentDM=u; dmPanel.classList.remove('hidden'); dmHeader.textContent='DM with '+u; listenDMMessages(u);}
function listenDMMessages(u){
  const chatId=[username,u].sort().join('_');
  const q=query(collection(db,'dms',chatId,'messages'),orderBy('timestamp'));
  onSnapshot(q,snap=>{ dmMessages.innerHTML=''; snap.forEach(doc=>{ const m=doc.data(); const div=document.createElement('div'); div.className='message'; if(m.user===username) div.classList.add('self'); else div.classList.add('other'); div.innerHTML=`<b>${m.user}:</b> ${m.text}`; dmMessages.appendChild(div); dmMessages.scrollTop=dmMessages.scrollHeight; }); });
}
dmSendBtn.onclick=async()=>{ if(!currentDM) return; const text=dmMessageInput.value.trim(); if(!text) return; const chatId=[username,currentDM].sort().join('_'); await addDoc(collection(db,'dms',chatId,'messages'),{user:username,text,timestamp:new Date()}); dmMessageInput.value=''; };
dmMessageInput.addEventListener('keypress', e=>{if(e.key==='Enter') dmSendBtn.onclick();});
dmCloseBtn.onclick=()=>{dmPanel.classList.add('hidden'); currentDM=null;}
