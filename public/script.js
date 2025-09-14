// ===========================
// Initialize Socket.io
// ===========================
const socket = io(); // connects to server automatically

// ===========================
// User & Room Setup
// ===========================
let username = prompt("Enter your username:") || "Anonymous";
let currentRoom = "general";

socket.emit('joinRoom', { room: currentRoom, username });

// ===========================
// Listen for messages
// ===========================
socket.on('message', (data) => {
    addMessage(data.username, data.text, data.username === username);
});

// ===========================
// Send message
// ===========================
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    socket.emit('chatMessage', { room: currentRoom, text, username });
    addMessage(username, text, true);
    input.value = '';
}

// ===========================
// Add message to chat window
// ===========================
function addMessage(user, text, self = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(self ? 'self' : 'other');
    msgDiv.textContent = `${user}: ${text}`;
    document.getElementById('messages').appendChild(msgDiv);
    msgDiv.scrollIntoView({ behavior: 'smooth' });
}

// ===========================
// Room Management
// ===========================
function joinRoom(room) {
    if (room === currentRoom) return;

    socket.emit('leaveRoom', currentRoom);
    currentRoom = room;
    socket.emit('joinRoom', { room, username });
    document.getElementById('messages').innerHTML = '';
}

function createRoom() {
    const roomName = document.getElementById('newRoomInput').value.trim();
    if (!roomName) return;

    // Create button dynamically
    const btn = document.createElement('button');
    btn.textContent = `# ${roomName}`;
    btn.onclick = () => joinRoom(roomName);
    document.getElementById('roomList').appendChild(btn);

    document.getElementById('newRoomInput').value = '';
    joinRoom(roomName);
}

// ===========================
// Customization
// ===========================
function updateCustomization() {
    const bgColor = document.getElementById('bgColor').value;
    const selfColor = document.getElementById('selfColor').value;
    const otherColor = document.getElementById('otherColor').value;
    const fontFamily = document.getElementById('fontFamily').value;
    const fontSize = document.getElementById('fontSize').value + 'px';
    const spacing = document.getElementById('spacing').value + 'px';

    document.documentElement.style.setProperty('--bg-color', bgColor);
    document.documentElement.style.setProperty('--self-msg-color', selfColor);
    document.documentElement.style.setProperty('--other-msg-color', otherColor);
    document.documentElement.style.setProperty('--font-family', fontFamily);
    document.documentElement.style.setProperty('--font-size', fontSize);
    document.documentElement.style.setProperty('--layout-spacing', spacing);
}

// Attach event listeners for customization inputs
['bgColor', 'selfColor', 'otherColor', 'fontFamily', 'fontSize', 'spacing'].forEach(id => {
    const elem = document.getElementById(id);
    const event = elem.tagName === 'SELECT' ? 'change' : 'input';
    elem.addEventListener(event, updateCustomization);
});

// Initialize
updateCustomization();
