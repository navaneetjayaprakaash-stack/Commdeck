// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b6sk70s4vbxJt-H0NGk",
  authDomain: "my-chat-room-1d84f.firebaseapp.com",
  projectId: "my-chat-room-1d84f",
  storageBucket: "my-chat-room-1d84f.firebasestorage.app",
  messagingSenderId: "747796328971",
  appId: "1:747796328971:web:beb5c15265855e169e8d0e"
};

let app, db, auth, userId, currentChatroomId = null, chatroomListener = null;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', async () => {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  await signInAnonymously(auth);
  userId = auth.currentUser.uid;

  document.getElementById('create-btn').addEventListener('click', createChatroom);
  document.getElementById('join-btn').addEventListener('click', () => joinChatroom(document.getElementById('join-input').value));
  document.getElementById('back-btn').addEventListener('click', leaveChatroom);
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });
  document.getElementById('save-ui-btn').addEventListener('click', saveUIPrefs);

  const roomFromUrl = new URLSearchParams(window.location.search).get('room');
  if(roomFromUrl) joinChatroom(roomFromUrl);

  applyUISettings();
});

// --- Views ---
function showView(viewId){
  document.getElementById('welcome-view').classList.add('hidden');
  document.getElementById('chat-view').classList.add('hidden');
  if(viewId==='welcome') document.getElementById('welcome-view').classList.remove('hidden');
  else if(viewId==='chat') document.getElementById('chat-view').classList.remove('hidden');
}

// --- Chatroom Functions ---
async function createChatroom(){
  const newId = crypto.randomUUID();
  currentChatroomId = newId;
  showView('chat');
  document.getElementById('chatroom-title').textContent = `Room: ${newId.substring(0,8)}...`;
  const shareableLink = `${window.location.origin}${window.location.pathname}?room=${newId}`;
  alert(`Share this link: ${shareableLink}`);
  listenMessages();
}

async function joinChatroom(linkOrId){
  const roomId = linkOrId.startsWith('http') ? new URL(linkOrId).searchParams.get('room') : linkOrId;
  if(!roomId) return alert("Invalid room");
  currentChatroomId = roomId;
  showView('chat');
  document.getElementById('chatroom-title').textContent = `Room: ${roomId.substring(0,8)}...`;
  document.getElementById('messages-list').innerHTML='';
  listenMessages();
}

function leaveChatroom(){
  if(chatroomListener) chatroomListener();
  chatroomListener=null;
  currentChatroomId=null;
  showView('welcome');
}

// --- Messaging ---
function listenMessages(){
  const messagesRef = collection(db,"chatrooms",currentChatroomId,"messages");
  const q = query(messagesRef, orderBy('timestamp'));

  if(chatroomListener) chatroomListener();
  chatroomListener = onSnapshot(q, snapshot => {
    snapshot.docChanges().forEach(change => {
      if(change.type==='added') displayMessage(change.doc);
      else if(change.type==='modified') updateMessage(change.doc);
      else if(change.type==='removed') removeMessage(change.doc.id);
    });
    const ml = document.getElementById('messages-list');
    ml.scrollTop = ml.scrollHeight;
  });
}

async function sendMessage(){
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if(!text || !currentChatroomId) return;
  await addDoc(collection(db,"chatrooms",currentChatroomId,"messages"),{
    text, senderId: userId, timestamp: serverTimestamp()
  });
  input.value='';
}

// --- Display Messages ---
function displayMessage(docSnap){
  const data = docSnap.data();
  const div = document.createElement('div');
  div.id = docSnap.id;
  const sentColor = localStorage.getItem('sentColor')||'#3b82f6';
  const recvColor = localStorage.getItem('receivedColor')||'#e5e7eb';
  div.style.backgroundColor = data.senderId===userId ? sentColor : recvColor;
  div.style.color = data.senderId===userId ? '#fff' : '#1f2937';
  div.className = `p-3 rounded-xl max-w-[80%] break-words shadow-sm ${data.senderId===userId?'ml-auto':'mr-auto'}`;

  const senderSpan = document.createElement('span');
  senderSpan.textContent = data.senderId===userId?'You':data.senderId.substring(0,8)+'...';
  senderSpan.className = 'block text-xs font-semibold mb-1';
  div.appendChild(senderSpan);

  const textSpan = document.createElement('span');
  textSpan.textContent = data.text;
  div.appendChild(textSpan);

  if(data.senderId===userId){
    const controls = document.createElement('div');
    controls.className='flex space
