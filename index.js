const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Track connected users: { socket.id: { username, room, firebaseId } }
const users = {}; 

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // joinRoom now accepts and stores the Firebase UID (firebaseId)
    socket.on("joinRoom", ({ username, room, firebaseId }) => {
        users[socket.id] = { username, room, firebaseId };
        socket.join(room);

        // Send the client their own Socket ID and confirmation
        socket.emit("clientInfo", { userId: socket.id, room });

        // Welcome + notify room members (client filters system messages)
        socket.emit("chatMessage", { user: "System", text: `Welcome to ${room}, ${username}! 🎉` });
        socket.to(room).emit("chatMessage", { user: "System", text: `${username} joined the room` });

        // Update user list across the room
        io.to(room).emit("userList", getUsersInRoom(room));
    });

    socket.on("chatMessage", (msg) => {
        // Broadcast general chat message to the room
        io.to(msg.room).emit("chatMessage", msg);
    });

    // Dedicated private message handling
    socket.on("privateMessage", ({ to, text, recipientFirebaseId }) => {
        const fromUser = users[socket.id];
        
        if (fromUser && users[to] && socket.id !== to) {
            // Use the specific event 'privateMessageReceived' to ensure the client routes it correctly
            io.to(to).emit("privateMessageReceived", { 
                fromId: socket.id, 
                fromUsername: fromUser.username, 
                fromFirebaseId: fromUser.firebaseId, // Pass sender's Firebase ID
                text 
            });

        } else if (socket.id === to) {
             socket.emit("chatMessage", { user: "System", text: "You can't send a private message to yourself." });
        }
    });

    socket.on("disconnect", () => {
        if (users[socket.id]) {
            const { username, room } = users[socket.id];
            
            io.to(room).emit("chatMessage", { user: "System", text: `${username} left the room 👋` });
            
            delete users[socket.id];
            io.to(room).emit("userList", getUsersInRoom(room));
        }
    });
});

/**
 * Filters the global users object to get a list of active users in a specific room,
 * including their Firebase ID for DM persistence pathing.
 */
function getUsersInRoom(room) {
    return Object.entries(users)
        .filter(([id, user]) => user.room === room)
        .map(([id, user]) => ({ 
            id, 
            username: user.username,
            firebaseId: user.firebaseId // Essential for client DM logic
        }));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
