const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const users = {}; // Track connected users

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinRoom", ({ username, room }) => {
    users[socket.id] = { username, room };
    socket.join(room);

    // Welcome + notify
    socket.emit("chatMessage", { user: "System", text: `Welcome to ${room}, ${username}! 🎉` });
    socket.to(room).emit("chatMessage", { user: "System", text: `${username} joined the room` });

    // Update user list
    io.to(room).emit("userList", getUsersInRoom(room));
  });

  socket.on("chatMessage", (msg) => {
    io.to(msg.room).emit("chatMessage", msg); // broadcast inside room
  });

  socket.on("privateMessage", ({ to, text }) => {
    const fromUser = users[socket.id];
    if (fromUser && users[to]) {
      io.to(to).emit("chatMessage", { user: `(DM from ${fromUser.username})`, text });
      socket.emit("chatMessage", { user: `(DM to ${users[to].username})`, text });
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

function getUsersInRoom(room) {
  return Object.entries(users)
    .filter(([id, user]) => user.room === room)
    .map(([id, user]) => ({ id, username: user.username }));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
