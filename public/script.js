// -----------------------------
// FINAL script.js
// -----------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, addDoc,
  onSnapshot, query, orderBy, serverTimestamp,
  deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b6sk70s4vbxJt-H0NGk",
  authDomain: "my-chat-room-1d84f.firebaseapp.com",
  projectId: "my-chat-room-1d84f",
  storageBucket: "my-chat-room-1d84f.firebasestorage.app",
  messagingSenderId: "747796328971",
  appId: "1:747796328971:web:beb5c15265855e169e8d0e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userId;
let currentChatroomId = null;
let chatListener = null;

// --- INITIALIZE USER ---
signInAnonymously(auth).then(userCred => {
  userId = userCred.user.uid;
  document.getElementById('user-id-display').textContent = `ID: ${userId.substring(0,8)}...`;
  checkRoomFromURL();
});

// --- DOM ELEMENTS ---
const createBtn = document.getElementById("create-btn");
const joinBtn = document.getElementById("join-btn");
const joinInput = document.getElementById("join-input");
const messagesList = document.getElementById("messages-list");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const backBtn = document.getElementById("back-btn");

const themeSelect = document.getElementById("theme-select");
const fontSizeInput = document.getElementById("font-size-input");
const sentColor = document.getElementById("sent-color");
const receivedColor = document.getElementById("received-color");
const saveUIBtn = document.getElementById("save-ui-btn");

// --- EVENT LISTENERS ---
createBtn.addEventListener("click", createChatroom);
joinBtn.addEventListener("click", () => {
  const link = joinInput.value.trim();
  if (link) joinChatroom(link);
});
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e => { if(e.key==="Enter") sendMessage(); });
backBtn.addEventListener("click", leaveChatroom);
saveUIBtn.addEventListener("click", applyUICustomization);

// --- FUNCTIONS ---

// Check if room ID is in URL
function checkRoomFromURL() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");
  if (roomId) joinChatroom(roomId);
}

// Create new chatroom
async function createChatroom() {
  try {
    const roomId = crypto.randomUUID();
    const roomRef = doc(collection(db, "chatrooms"), roomId);
    await setDoc(roomRef, { owner: userId, createdAt: serverTimestamp() });

    // SHOW LINK
    const shareableLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    alert(`Room created! Share this link:\n${shareableLink}`);

    joinChatroom(roomId);
  } catch (err) {
    console.error("Create Room Error:", err);
  }
}

// Join existing chatroom
async function joinChatroom(linkOrId) {
  try {
    let roomId = linkOrId;
    if(linkOrId.startsWith("http")) {
      const url = new URL(linkOrId);
      roomId = url.searchParams.get("room");
    }
    if(!roomId) return alert("Invalid chatroom link/ID");

    currentChatroomId = roomId;
    messagesList.innerHTML = "";
    showView("chat");

    if(chatListener) chatListener();
    const messagesQuery = query(collection(db, `chatrooms/${currentChatroomId}/messages`), orderBy("timestamp"));
    chatListener = onSnapshot(messagesQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        if(change.type === "added") displayMessage(change.doc.id, change.doc.data());
      });
      messagesList.scrollTop = messagesList.scrollHeight;
    });
  } catch (err) {
    console.error("Join Room Error:", err);
  }
}

// Leave room
function leaveChatroom() {
  if(chatListener) { chatListener(); chatListener = null; }
  currentChatroomId = null;
  messagesList.innerHTML = "";
  showView("welcome");
}

// Send message
async function sendMessage() {
  const text = messageInput.value.trim();
  if(!text || !currentChatroomId) return;
  try {
    await addDoc(collection(db, `chatrooms/${currentChatroomId}/messages`), {
      text,
      senderId: userId,
      timestamp: serverTimestamp()
    });
    messageInput.value = "";
  } catch(err) {
    console.error("Send Message Error:", err);
  }
}

// Display message with edit/delete
function displayMessage(msgId, msgData) {
  const div = document.createElement("div");
  const isMe = msgData.senderId === userId;
  div.className = `p-3 rounded-xl max-w-[80%] break-words shadow-sm ${isMe ? 'ml-auto message-sent' : 'mr-auto message-received'}`;

  const sender = document.createElement("span");
  sender.className = `block text-xs font-semibold mb-1 ${isMe ? 'text-gray-200':'text-gray-500'}`;
  sender.textContent = isMe ? "You" : msgData.senderId.substring(0,8) + "...";

  const text = document.createElement("span");
  text.textContent = msgData.text;

  div.appendChild(sender);
  div.appendChild(text);

  if(isMe) {
    const btnDiv = document.createElement("div");
    btnDiv.className = "flex space-x-1 mt-1";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "text-xs text-yellow-500";
    editBtn.onclick = async () => {
      const newText = prompt("Edit message:", msgData.text);
      if(newText) await updateDoc(doc(db, `chatrooms/${currentChatroomId}/messages/${msgId}`), { text: newText });
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "text-xs text-red-500";
    delBtn.onclick = async () => {
      if(confirm("Delete this message?")) await deleteDoc(doc(db, `chatrooms/${currentChatroomId}/messages/${msgId}`));
    };

    btnDiv.appendChild(editBtn);
    btnDiv.appendChild(delBtn);
    div.appendChild(btnDiv);
  }

  messagesList.appendChild(div);
}

// Apply UI customization
function applyUICustomization() {
  document.body.style.backgroundColor = themeSelect.value === "dark" ? "#1f2937" : "#f3f4f6";
  document.body.style.fontSize = fontSizeInput.value + "px";
  document.documentElement.style.setProperty('--sent-bg', sentColor.value);
  document.documentElement.style.setProperty('--received-bg', receivedColor.value);
}

// Show view
function showView(view) {
  document.getElementById("welcome-view").classList.toggle("hidden", view!=="welcome");
  document.getElementById("chat-view").classList.toggle("hidden", view!=="chat");
}
