import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b6sk70s4vbxJt-H0NGk",
  authDomain: "my-chat-room-1d84f.firebaseapp.com",
  projectId: "my-chat-room-1d84f",
  storageBucket: "my-chat-room-1d84f.appspot.com",
  messagingSenderId: "747796328971",
  appId: "1:747796328971:web:beb5c15265855e169e8d0e"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userId = null;
let currentChatroomId = null;
let chatListener = null;

// --- DOM Elements ---
const messagesList = document.getElementById("messages-list");
const messageInput = document.getElementById("message-input");

// --- Authentication ---
signInAnonymously(auth)
  .then(res => {
    userId = res.user.uid;
    document.getElementById('user-id-display').textContent = `Your ID: ${userId.substring(0,8)}...`;
  })
  .catch(console.error);

// --- UI Handlers ---
document.getElementById("create-btn").onclick = createChatroom;
document.getElementById("join-btn").onclick = () => joinChatroom(document.getElementById("join-input").value);
document.getElementById("back-btn").onclick = leaveChatroom;
document.getElementById("send-btn").onclick = sendMessage;
messageInput.addEventListener("keypress", e => { if(e.key==="Enter") sendMessage(); });
document.getElementById("save-ui-btn").onclick = savePreferences;

// --- Chatroom Functions ---
async function createChatroom() {
  const newId = crypto.randomUUID();
  const roomRef = doc(db, "chatrooms", newId);
  await setDoc(roomRef, { owner: userId, participants: { [userId]: true }, createdAt: serverTimestamp() });

  const link = `${window.location.origin}${window.location.pathname}?room=${newId}`;
  prompt("Share this link with others:", link);

  await joinChatroom(newId);
}

async function joinChatroom(linkOrId) {
  let roomId = linkOrId.startsWith("http") ? new URL(linkOrId).searchParams.get("room") : linkOrId;
  if(!roomId) return alert("Invalid chatroom ID/link");

  currentChatroomId = roomId;
  const roomRef = doc(db, "chatrooms", currentChatroomId);

  // Add user to participants
  await setDoc(roomRef, { participants: { [userId]: true } }, { merge: true });

  showView("chat");
  messagesList.innerHTML = "";

  // Listen to messages
  if(chatListener) chatListener();
  const messagesQuery = query(collection(db, `chatrooms/${currentChatroomId}/messages`), orderBy("timestamp"));
  chatListener = onSnapshot(messagesQuery, snapshot => {
    snapshot.docChanges().forEach(change => {
      if(change.type === "added") displayMessage(change.doc.id, change.doc.data());
      if(change.type === "modified") updateMessage(change.doc.id, change.doc.data());
      if(change.type === "removed") removeMessage(change.doc.id);
    });
    messagesList.scrollTop = messagesList.scrollHeight;
  });
}

// --- Leave chatroom ---
function leaveChatroom() {
  if(chatListener) chatListener();
  chatListener = null;
  showView("welcome");
  messagesList.innerHTML = "";
  currentChatroomId = null;
}

// --- Messages ---
async function sendMessage() {
  const text = messageInput.value.trim();
  if(!text || !currentChatroomId) return;

  await addDoc(collection(db, `chatrooms/${currentChatroomId}/messages`), {
    senderId: userId,
    text,
    timestamp: serverTimestamp()
  });

  messageInput.value = "";
}

function displayMessage(id, message) {
  const div = document.createElement("div");
  div.className = `p-3 rounded-xl max-w-[80%] break-words shadow-sm ${message.senderId===userId?"ml-auto message-sent":"mr-auto message-received"}`;
  div.id = id;

  const sender = document.createElement("span");
  sender.className = `block text-xs font-semibold mb-1 ${message.senderId===userId?"text-gray-200":"text-gray-500"}`;
  sender.textContent = message.senderId===userId?"You":message.senderId.substring(0,8)+"...";

  const text = document.createElement("span");
  text.textContent = message.text;

  div.appendChild(sender);
  div.appendChild(text);

  if(message.senderId === userId){
    const editBtn = document.createElement("button");
    editBtn.textContent = "✎";
    editBtn.className = "ml-2 text-xs";
    editBtn.onclick = async () => {
      const newText = prompt("Edit message:", message.text);
      if(newText) await updateDoc(doc(db, `chatrooms/${currentChatroomId}/messages/${id}`), { text: newText });
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.className = "ml-1 text-xs";
    delBtn.onclick = async () => {
      if(confirm("Delete message?")) await deleteDoc(doc(db, `chatrooms/${currentChatroomId}/messages/${id}`));
    };

    div.appendChild(editBtn);
    div.appendChild(delBtn);
  }

  messagesList.appendChild(div);
  messagesList.scrollTop = messagesList.scrollHeight;
}

function updateMessage(id, message){
  const div = document.getElementById(id);
  if(div) div.querySelector("span:last-child").textContent = message.text;
}

function removeMessage(id){
  const div = document.getElementById(id);
  if(div) div.remove();
}

// --- UI Customization ---
function savePreferences() {
  const theme = document.getElementById("theme-select").value;
  const fontSize = document.getElementById("font-size-input").value;
  const sentColor = document.getElementById("sent-color").value;
  const receivedColor = document.getElementById("received-color").value;

  document.documentElement.style.setProperty("--sent-bg", sentColor);
  document.documentElement.style.setProperty("--received-bg", receivedColor);
  messagesList.style.fontSize = fontSize+"px";
  document.body.className = theme==="dark"?"bg-gray-900 text-white flex items-center justify-center min-h-screen p-4":"bg-gray-100 flex items-center justify-center min-h-screen p-4";
}

// --- View Management ---
function showView(view) {
  document.getElementById("welcome-view").classList.add("hidden");
  document.getElementById("chat-view").classList.add("hidden");
  if(view==="chat") document.getElementById("chat-view").classList.remove("hidden");
  if(view==="welcome") document.getElementById("welcome-view").classList.remove("hidden");
}
