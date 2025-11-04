const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// Track connected users
const users = {};

// Helper: get users in a room
function getUsersInRoom(room) {
  return Object.entries(users)
    .filter(([id, user]) => user.room === room)
    .map(([id, user]) => ({ id, username: user.username }));
}

// Socket.IO
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join room
  socket.on("joinRoom", ({ username, room }) => {
    users[socket.id] = { username, room };
    socket.join(room);

    // Welcome message to self
    socket.emit("chatMessage", { user: "System", text: `Welcome to ${room}, ${username}! 🎉` });

    // Notify others
    socket.to(room).emit("chatMessage", { user: "System", text: `${username} joined the room` });

    // Update user list
    io.to(room).emit("userList", getUsersInRoom(room));
  });

  // Chat message
  socket.on("chatMessage", (msg) => {
    io.to(msg.room).emit("chatMessage", msg);
  });

  // Private message (DM)
  socket.on("privateMessage", ({ to, text }) => {
    const fromUser = users[socket.id];
    if (fromUser && users[to]) {
      io.to(to).emit("chatMessage", { user: `(DM from ${fromUser.username})`, text });
      socket.emit("chatMessage", { user: `(DM to ${users[to].username})`, text });
    }
  });

  // Change username
  socket.on("changeUsername", (newUsername) => {
    const user = users[socket.id];
    if (user) {
      const oldUsername = user.username;
      user.username = newUsername;
      const room = user.room;
      io.to(room).emit("chatMessage", { user: "System", text: `${oldUsername} changed name to ${newUsername}` });
      io.to(room).emit("userList", getUsersInRoom(room));
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      const { username, room } = users[socket.id];
      io.to(room).emit("chatMessage", { user: "System", text: `${username} left the room 👋` });
      delete users[socket.id];
      io.to(room).emit("userList", getUsersInRoom(room));
    }
  });
});

// Server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
