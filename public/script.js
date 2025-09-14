const socket = io();
let username = null;
let currentRoom = "general";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDw-qqvRKmbu9R9b6sk70s4vbxJt-H0NGk",
  authDomain: "my-chat-room-1d84f.firebaseapp.com",
  projectId: "my-chat-room-1d84f",
  storageBucket: "my-chat-room-1d84f.firebasestorage.app",
  messagingSenderId: "747796328971",
  appId: "1:747796328971:web:beb5c15265855e169e8d0e"
};
firebase.initializeApp(firebaseConfig);

// Anonymous Firebase Auth
firebase.auth().signInAnonymously()
  .then(() => {
    username = firebase.auth().currentUser.uid;
    socket.emit('joinRoom', { room: currentRoom, username });
  })
  .catch(err => console.error(err));

function joinRoom(room) {
    if(room === currentRoom) return;
    socket.emit('leaveRoom', currentRoom);
    currentRoom = room;
    if(username) socket.emit('joinRoom', { room, username });
    document.getElementById('messages').innerHTML = '';
}

const urlParams = new URLSearchParams(window.location.search);
const urlRoom = urlParams.get('room');
if(urlRoom) joinRoom(urlRoom);

socket.on('message', data => addMessage(data.username, data.text, data.username === username));

socket.on('roomUsers', users => {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    users.forEach(u => {
        if(u !== username){
            const btn = document.createElement('button');
            btn.textContent = u;
            btn.onclick = () => openDM(u);
            userList.appendChild(btn);
        }
    });
});

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if(!text || !username) return;
    socket.emit('chatMessage', { room: currentRoom, text, username });
    addMessage(username, text, true);
    input.value = '';
}

function addMessage(user, text, self=false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', self ? 'self' : 'other');
    msgDiv.textContent = `${user}: ${text}`;
    document.getElementById('messages').appendChild(msgDiv);
    msgDiv.scrollIntoView({ behavior: 'smooth' });
}

function createRoom() {
    const roomName = document.getElementById('newRoomInput').value.trim();
    if(!roomName) return;
    const btn = document.createElement('button');
    btn.textContent = `# ${roomName}`;
    btn.onclick = () => joinRoom(roomName);
    document.getElementById('roomList').appendChild(btn);
    document.getElementById('newRoomInput').value = '';
    joinRoom(roomName);
}

function openDM(targetUser) {
    const dmText = prompt(`Send a private message to ${targetUser}:`);
    if(dmText && username){
        socket.emit('privateMessage', { to: targetUser, text: dmText, from: username });
        addMessage(`(DM to ${targetUser})`, dmText, true);
    }
}

// Customization
function updateCustomization() {
    document.documentElement.style.setProperty('--bg-color', document.getElementById('bgColor').value);
    document.documentElement.style.setProperty('--self-msg-color', document.getElementById('selfColor').value);
    document.documentElement.style.setProperty('--other-msg-color', document.getElementById('otherColor').value);
    document.documentElement.style.setProperty('--font-family', document.getElementById('fontFamily').value);
    document.documentElement.style.setProperty('--font-size', document.getElementById('fontSize').value + 'px');
    document.documentElement.style.setProperty('--layout-spacing', document.getElementById('spacing').value + 'px');
}
['bgColor','selfColor','otherColor','fontFamily','fontSize','spacing'].forEach(id => {
    const elem = document.getElementById(id);
    const event = elem.tagName === 'SELECT' ? 'change' : 'input';
    elem.addEventListener(event, updateCustomization);
});
updateCustomization();
