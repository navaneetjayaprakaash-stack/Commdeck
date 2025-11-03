// index.js (Node server)
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from /public
app.use(express.static("public"));

// Group chat Socket.io
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle joining with a username
  socket.on("join", (username) => {
    socket.username = username || "Anon";
    console.log(`${socket.username} joined`);
    socket.broadcast.emit("chat message", { user: "System", text: `${socket.username} joined the chat` });
  });

  // Handle chat messages
  socket.on("chat message", (msg) => {
    io.emit("chat message", { user: socket.username, text: msg });
  });

  // Handle private messages
  socket.on("private message", ({ to, text }) => {
    // find the socket of the recipient
    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.username === to);
    if (targetSocket) {
      targetSocket.emit("private message", { from: socket.username, text });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`${socket.username} disconnected`);
    socket.broadcast.emit("chat message", { user: "System", text: `${socket.username} left the chat` });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
