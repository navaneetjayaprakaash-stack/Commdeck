const socket = io();

let username = "";
let room = "";
let dmRecipientId = null;
let dmRecipientName = "";

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
    document.getElementById("roomTitle").textContent = room;
    document.getElementById("currentRoomDisplay").textContent = room;
    document.getElementById("messageInput").placeholder = `Message #${room}`;

    socket.emit("joinRoom", { username, room });
}

// Ensure chat initializes immediately on load (Replaces the old joinChat())
window.onload = initializeChat;


// --- User & Room Management ---

function changeUsername() {
    const newUsername = prompt("Enter a new username:");
    if (newUsername && newUsername.trim() !== username) {
        const oldUsername = username;
        username = newUsername.trim();
        document.getElementById("currentUsername").textContent = username;
        // Notify the server/room about the change
        socket.emit("chatMessage", { user: "System", text: `${oldUsername} changed name to ${username}`, room });
        
        // Re-emit joinRoom to update the server's tracking of this socket's username (essential!)
        socket.emit("joinRoom", { username, room });
    }
}

function generateNewRoom() {
    const newRoomName = prompt("Enter the name for the new room:");
    if (newRoomName && newRoomName.trim()) {
        const newRoom = newRoomName.trim().toLowerCase().replace(/\s/g, '-');
        // Navigate to the new room URL
        window.location.href = `/?room=${newRoom}`;
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
    
    // Clear old DM messages (optional, but good for UX)
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
        
        // Locally render the message immediately
        displayMessage({ user: `(DM to ${dmRecipientName})`, text }, "dm-messages", "self");
        
        document.getElementById("dmMessageInput").value = "";
    }
}


// --- Message Rendering ---

function displayMessage(msg, targetId = "chat-messages", messageType = "") {
    const target = document.getElementById(targetId);
    const div = document.createElement("div");
    div.classList.add("message");

    if (msg.user === "System") {
        div.classList.add("system");
        div.textContent = msg.text;
    } else if (msg.user.startsWith("(DM")) {
        // Check if the DM is to/from the currently open recipient
        const isCurrentDM = targetId === "dm-messages" || 
                           msg.user.includes(dmRecipientName) ||
                           msg.user.includes(username);

        if (isCurrentDM && targetId === "dm-messages") {
            // Render in DM panel
            div.classList.add(msg.user.includes(`DM from ${dmRecipientName}`) ? "other" : "self");
            div.innerHTML = msg.text; // DM messages don't need the prepended username in the DM panel
        } else {
            // Render in GC area as a notification
            div.classList.add("system");
            div.style.color = "purple"; // Retain the purple color hint
            div.innerHTML = `**${msg.user}:** ${msg.text}`;
            target.appendChild(div);
        }
        
    } else {
        // Regular GC message
        const isSelf = msg.user === username;
        div.classList.add(isSelf ? "self" : "other");
        div.innerHTML = `<span>**${msg.user}:**</span> ${msg.text}`;
    }
    
    if (div.children.length > 0 || msg.user === "System") { // Only append if content exists
        target.appendChild(div);
    }
    
    target.scrollTop = target.scrollHeight;
}

// Receive general/DM messages
socket.on("chatMessage", (msg) => {
    // If it's a DM from another user, automatically open the DM panel
    if (msg.user.startsWith("(DM from") && msg.user.includes(username)) {
        const fromUserMatch = msg.user.match(/\(DM from (.*?)\)/);
        if (fromUserMatch && fromUserMatch[1] !== dmRecipientName) {
            // Find the sender's ID (this is complex as we only have the username here)
            // For simplicity, we'll just display it in the DM panel if it's open, 
            // otherwise, we show a notification.
            // *The current server sends the full message, we'll rely on server-side logic 
            // or the userList for the ID to properly open a new DM. 
            // For now, if the DM panel is not open to this person, we notify in GC.*
        }
    }
    
    if (msg.user.startsWith("(DM")) {
        // If DM is TO the current user, try to render it in the DM panel if open
        if (dmRecipientName && msg.user.includes(`DM from ${dmRecipientName}`)) {
            displayMessage(msg, "dm-messages", "other");
            return;
        } 
        
        // If DM is FROM the current user, try to render it in the DM panel if open
        if (dmRecipientName && msg.user.includes(`DM to ${dmRecipientName}`)) {
            displayMessage(msg, "dm-messages", "self");
            return;
        }
    }
    
    // Default to the main chat window
    displayMessage(msg, "chat-messages");
});


// --- User List Update ---

socket.on("userList", (users) => {
    const ul = document.getElementById("userList");
    ul.innerHTML = "";
    users.forEach((u) => {
        // Add self to the user list so we can see who we are, but without the DM ability
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
        ul.appendChild(li);
    });
});


// --- Theming Logic ---
function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('chatTheme', themeName);
}

// Load theme on startup
const savedTheme = localStorage.getItem('chatTheme') || 'dark-discord';
document.getElementById('themeSelector').value = savedTheme;
applyTheme(savedTheme);
