import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const users = {};

function getUsersInRoom(room) {
  return Object.entries(users)
    .filter(([id, user]) => user.room === room)
    .map(([id, user]) => ({ id, username: user.username }));
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("joinRoom", ({ username, room }) => {
    if (!username) username = `Anon-${socket.id.slice(0, 5)}`;

    const existing = getUsersInRoom(room).map(u => u.username);
    if (existing.includes(username)) {
      username = `${username}_${Math.floor(Math.random() * 1000)}`;
      socket.emit("chatMessage", { user: "System", text: `Name taken, you are now ${username}` });
    }

    users[socket.id] = { username, room };
    socket.join(room);

    socket.emit("chatMessage", { user: "System", text: `Welcome to ${room}, ${username}! 🎉`, time: new Date().toLocaleTimeString() });
    socket.to(room).emit("chatMessage", { user: "System", text: `${username} joined the room`, time: new Date().toLocaleTimeString() });

    io.to(room).emit("userList", getUsersInRoom(room));
  });

  socket.on("chatMessage", (msg) => {
    io.to(msg.room).emit("chatMessage", { ...msg, time: new Date().toLocaleTimeString() });
  });

  socket.on("privateMessage", ({ to, text }) => {
    const fromUser = users[socket.id];
    if (fromUser && users[to]) {
      io.to(to).emit("chatMessage", { user: `(DM from ${fromUser.username})`, text, time: new Date().toLocaleTimeString() });
      socket.emit("chatMessage", { user: `(DM to ${users[to].username})`, text, time: new Date().toLocaleTimeString() });
    }
  });

  socket.on("changeUsername", (newUsername) => {
    const user = users[socket.id];
    if (user) {
      const oldUsername = user.username;
      user.username = newUsername;
      io.to(user.room).emit("chatMessage", { user: "System", text: `${oldUsername} changed name to ${newUsername}`, time: new Date().toLocaleTimeString() });
      io.to(user.room).emit("userList", getUsersInRoom(user.room));
    }
  });

  socket.on("disconnect", () => {
    if (users[socket.id]) {
      const { username, room } = users[socket.id];
      io.to(room).emit("chatMessage", { user: "System", text: `${username} left the room 👋`, time: new Date().toLocaleTimeString() });
      delete users[socket.id];
      io.to(room).emit("userList", getUsersInRoom(room));
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
