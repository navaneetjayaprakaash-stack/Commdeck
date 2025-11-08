const socket = io();

let username = "";
let room = "";
let dmRecipientId = null;
let dmRecipientName = "";

// Map to store User IDs and Usernames, crucial for DM functionality
let activeUsersMap = new Map();

// Helper to generate a unique ID part (simple for this example)
const generateId = () => Math.random().toString(36).substring(2, 6);

// --- Initialization & Setup ---
function initializeChat() {
    // 1. Auto-assign username
    username = `User-${generateId()}`;
    document.getElementById("currentUsername").textContent = username;

    // 2. Determine room from URL or default
    const urlParams = new URLSearchParams(window.location.search);
    room = urlParams.get("room") || "general";
    
    // 3. Update UI and Join
    updateRoomUI(room);
    
    // 4. Load theme
    const savedTheme = localStorage.getItem('chatTheme') || 'dark-discord';
    document.getElementById('themeSelector').value = savedTheme;
    applyTheme(savedTheme);

    socket.emit("joinRoom", { username, room });
}

// Ensure chat initializes immediately on load
window.onload = initializeChat;

// Utility function to update all room-related UI elements
function updateRoomUI(newRoom) {
    room = newRoom;
    document.getElementById("roomTitle").textContent = room;
    document.getElementById("currentRoomDisplay").textContent = room;
    document.getElementById("messageInput").placeholder = `Message #${room}`;
    // Clear chat when switching rooms
    document.getElementById("chat-messages").innerHTML = "";
    // Hide DM panel when switching GC
    closeDMPanel();
}

// --- Room Switching (FIXED: Enables switching back and forth) ---
function switchRoom(newRoomName) {
    if (newRoomName === room) return; // Already in this room

    // Navigate to the new room URL to trigger a full rejoin on the server
    window.location.href = `/?room=${newRoomName}`;
}

// --- User & Room Management ---

function changeUsername() {
    const newUsername = prompt("Enter a new username:");
    if (newUsername && newUsername.trim() !== username) {
        const oldUsername = username;
        username = newUsername.trim();
        document.getElementById("currentUsername").textContent = username;
        
        socket.emit("chatMessage", { user: "System", text: `${oldUsername} changed name to ${username}`, room });
        
        // Re-emit joinRoom to update the server's tracking of this socket's username (essential!)
        socket.emit("joinRoom", { username, room });
    }
}

function generateNewRoom() {
    const newRoomName = prompt("Enter the name for the new room:");
    if (newRoomName && newRoomName.trim()) {
        const newRoom = newRoomName.trim().toLowerCase().replace(/\s/g, '-');
        // Use the new switchRoom logic
        switchRoom(newRoom);
    }
}

function copyRoomLink() {
    const url = `${window.location.origin}/?room=${room}`;
    navigator.clipboard.writeText(url).then(() => {
        alert(`Room link copied to clipboard: ${url}`);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert(`Could not copy link. Manually copy this: ${url}`);
    });
}


// --- Messaging (GC) ---

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    const message = document.getElementById("messageInput").value.trim();
    if (message) {
        socket.emit("chatMessage", { user: username, text: message, room });
        document.getElementById("messageInput").value = "";
    }
}


// --- DM Panel Logic ---

function handleDMKeyPress(event) {
    if (event.key === 'Enter') {
        sendDM();
    }
}

function openDMPanel(userId, userName) {
    dmRecipientId = userId;
    dmRecipientName = userName;
    
    document.getElementById("dmRecipientName").textContent = `DM with ${userName}`;
    document.getElementById("dm-panel").classList.remove("hidden");
    
    document.getElementById("dm-messages").innerHTML = ""; 
    
    // Switch input focus
    document.getElementById("dmMessageInput").focus();
}

function closeDMPanel() {
    dmRecipientId = null;
    dmRecipientName = "";
    document.getElementById("dm-panel").classList.add("hidden");
}

function sendDM() {
    const text = document.getElementById("dmMessageInput").value.trim();
    if (text && dmRecipientId) {
        // Send the private message to the server
        socket.emit("privateMessage", { to: dmRecipientId, text });
        
        // Locally render the message immediately (FIXED: now uses the self class)
        displayMessage({ user: username, text }, "dm-messages", "self-dm"); 
        
        document.getElementById("dmMessageInput").value = "";
    }
}


// --- Message Rendering (FIXED: Handles DMs correctly) ---

function displayMessage(msg, targetId = "chat-messages", messageType = "") {
    const target = document.getElementById(targetId);
    const div = document.createElement("div");
    div.classList.add("message");

    if (msg.user === "System") {
        div.classList.add("system");
        div.textContent = msg.text;
    } else if (targetId === "dm-messages") {
        // Direct Message Panel Rendering
        div.classList.add(messageType === "self-dm" ? "self" : "other");
        div.innerHTML = msg.text; 
    } else {
        // General Chat Message Rendering
        const isSelf = msg.user === username;
        
        // Check for incoming DM Notification in GC
        if (msg.isDMNotification) {
            div.classList.add("system");
            div.style.backgroundColor = 'var(--primary)'; 
            div.style.color = 'white';
            div.innerHTML = `**[DM from ${msg.fromUsername}]** ${msg.text}`;
        } else {
            // Regular GC message
            div.classList.add(isSelf ? "self" : "other");
            div.innerHTML = `<span>**${msg.user}:**</span> ${msg.text}`;
        }
    }
    
    // Only append if content exists
    if (div.children.length > 0 || msg.user === "System" || msg.isDMNotification || targetId === "dm-messages") {
        target.appendChild(div);
    }
    
    target.scrollTop = target.scrollHeight;
}

// Receive general messages
socket.on("chatMessage", (msg) => {
    // This is for General Chat messages only
    displayMessage(msg, "chat-messages");
});

// Dedicated listener for incoming DMs
socket.on("privateMessageReceived", (msg) => {
    // msg contains: { fromId, fromUsername, text }
    
    // 1. If DM panel is currently open for this sender, display it there
    if (msg.fromId === dmRecipientId) {
        displayMessage({ user: msg.fromUsername, text: msg.text }, "dm-messages", "other-dm");
    } else {
        // 2. Otherwise, show a notification in the main chat area
        const notificationMsg = { 
            fromUsername: msg.fromUsername, 
            text: `(Received: ${msg.text.substring(0, 30)}${msg.text.length > 30 ? '...' : ''})`, 
            isDMNotification: true // Flag to render as a notification
        };
        displayMessage(notificationMsg, "chat-messages");
    }
});


// --- User List Update & Room Links (FIXED: Added General Room Link) ---

socket.on("userList", (users) => {
    const ulUsers = document.getElementById("userList");
    const ulRooms = document.getElementById("roomList");

    ulUsers.innerHTML = "";
    ulRooms.innerHTML = ""; // Clear existing rooms before adding the general link
    activeUsersMap.clear(); 

    // Add a permanent link to the 'general' room
    const generalRoomLi = document.createElement("li");
    generalRoomLi.textContent = "# general";
    generalRoomLi.style.cursor = "pointer";
    generalRoomLi.style.fontWeight = room === 'general' ? 'bold' : 'normal';
    generalRoomLi.style.backgroundColor = room === 'general' ? 'var(--input-bg)' : 'transparent';
    generalRoomLi.onclick = () => switchRoom('general');
    ulRooms.appendChild(generalRoomLi);

    // List active users
    users.forEach((u) => {
        activeUsersMap.set(u.id, u.username); 

        const isSelf = u.username === username;
        const li = document.createElement("li");
        li.textContent = isSelf ? `${u.username} (You)` : u.username;
        
        if (!isSelf) {
            li.style.cursor = "pointer";
            li.onclick = () => {
                // Clicking opens the dedicated DM panel
                openDMPanel(u.id, u.username);
            };
        }
        ulUsers.appendChild(li);
    });
});


// --- Theming Logic ---
function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('chatTheme', themeName);
}
