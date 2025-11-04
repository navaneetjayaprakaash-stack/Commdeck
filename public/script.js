import { db, collection, addDoc, query, orderBy, onSnapshot } from "../firebase.js";

const socket = io();
let username = "User"+Math.floor(Math.random()*1000);
let room = new URLSearchParams(window.location.search).get("room") || "general";

const messagesEl = document.getElementById("messages");
const userListEl = document.getElementById("userList");
const currentUsernameEl = document.getElementById("currentUsername");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const generateLinkBtn = document.getElementById("generateLinkBtn");
const themeSelect = document.getElementById("themeSelect");

currentUsernameEl.textContent=username;

// Load 20 fancy themes
const themes = ["theme1","theme2","theme3","theme4","theme5","theme6","theme7","theme8","theme9","theme10","theme11","theme12","theme13","theme14","theme15","theme16","theme17","theme18","theme19","theme20"];
themes.forEach(t=>{ const opt=document.createElement("option"); opt.value=t; opt.textContent=t; themeSelect.appendChild(opt); });
themeSelect.onchange=()=>{ document.body.setAttribute("data-theme",themeSelect.value); };

// Auto join
socket.emit("joinRoom",{username,room});

// Receive messages
socket.on("chatMessage", addMessage);
socket.on("loadMessages",(msgs)=>{ messagesEl.innerHTML=""; msgs.forEach(addMessage); });

// Send message
sendBtn.onclick=()=>{
  const text=messageInput.value.trim();
  if(!text) return;
  socket.emit("chatMessage",{user:username,text,room});
  messageInput.value="";
};

function addMessage(msg){
  const div=document.createElement("div");
  div.classList.add("message");
  if(msg.user==="System") div.classList.add("system");
  else if(msg.user===username) div.classList.add("self");
  else div.classList.add("other");
  div.innerHTML=msg.user==="System"?msg.text:`<b>${msg.user}:</b> ${msg.text}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop=messagesEl.scrollHeight;
}

// User list
socket.on("userList", users=>{
  userListEl.innerHTML="";
  users.forEach(u=>{
    if(u.username===username) return;
    const li=document.createElement("li");
    li.textContent=u.username;
    li.onclick=()=>{
      const text=prompt(`Send DM to ${u.username}:`);
      if(text) socket.emit("privateMessage",{to:u.id,text});
    };
    userListEl.appendChild(li);
  });
});

// Change username
changeUsernameBtn.onclick=()=>{
  const newUsername=prompt("Enter new username:",username);
  if(newUsername && newUsername!==username){
    socket.emit("changeUsername",newUsername);
    username=newUsername;
    currentUsernameEl.textContent=username;
  }
};

// Generate room link
generateLinkBtn.onclick=()=>{
  const url=window.location.origin+"?room="+room;
  navigator.clipboard.writeText(url);
  alert("Room link copied: "+url);
};
