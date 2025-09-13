import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, setDoc, onSnapshot, query, orderBy, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b6sk70s4vbxJt-H0NGk",
  authDomain: "my-chat-room-1d84f.firebaseapp.com",
  projectId: "my-chat-room-1d84f",
  storageBucket: "my-chat-room-1d84f.appspot.com",
  messagingSenderId: "747796328971",
  appId: "1:747796328971:web:beb5c15265855e169e8d0e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userId = null;
let currentChatroomId = null;
let chatListener = null;

const messagesList = document.getElementById("messages-list");
const participantsList = document.getElementById("participants-list");

// --- Authentication ---
signInAnonymously(auth).then(res => {
  userId = res.user.uid;
  document.getElementById('user-id-display').textContent = `Your ID: ${userId.substring(0,8)}...`;
}).catch(console.error);

// --- UI Handlers ---
document.getElementById("create-btn").onclick = createChatroom;
document.getElementById("join-btn").onclick = () => joinChatroom(document.getElementById("join-input").value);
document.getElementById("back-btn").onclick = leaveChatroom;
document.getElementById("send-btn").onclick = sendMessage;
document.getElementById("message-input").addEventListener("keypress", e => { if(e.key==="Enter") sendMessage(); });

// --- Create Chatroom ---
async function createChatroom() {
  const newId = crypto.randomUUID();
  const roomRef = doc(db, "chatrooms", newId);
  await setDoc(roomRef, { owner: userId, participants: { [userId]: true }, createdAt: serverTimestamp() });
  const link = `${window.location.origin}${window.location.pathname}?room=${newId}`;
  prompt("Share this link with others:", link);
  await joinChatroom(newId);
}

// --- Join Chatroom ---
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
    snapshot.docChanges().forEach(change
