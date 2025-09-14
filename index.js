const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    // Welcome message only to user
    socket.emit("chatMessage", { user: "System", text: `Welcome to ${room}, ${username}! 🎉` });

    // Notify others in the same room
    socket.to(room).emit("chatMessage", { user: "System", text: `${username} joined the room` });
  });

  socket.on("chatMessage", (msg) => {
    io.to(socket.room).emit("chatMessage", msg); // only send inside the room
  });

  socket.on("disconnect", () => {
    if (socket.username && socket.room) {
      io.to(socket.room).emit("chatMessage", { user: "System", text: `${socket.username} left the room 👋` });
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
