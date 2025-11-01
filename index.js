const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static("public"));

// =============================
// Chat / DM history
// =============================
const HISTORY_FILE = path.join(__dirname, "chatHistory.json");
const DM_FILE = path.join(__dirname, "dmHistory.json");

let chatHistory = {};
let dmHistory = {};

// Load history from disk if exists
if (fs.existsSync(HISTORY_FILE)) chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE));
if (fs.existsSync(DM_FILE)) dmHistory = JSON.parse(fs.readFileSync(DM_FILE));

function saveChatHistory(room) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
}

function saveDmHistory(uid1, uid2) {
  fs.writeFileSync(DM_FILE, JSON.stringify(dmHistory, null, 2));
}

// =============================
// User + Room tracking
// =============================
let users = {};       // socket.id -> { uid, name, room }
let uidToSocket = {}; // uid -> socket.id
let rooms = new Set(["general", "random"]);

function emitRoomList() {
  io.emit("roomList", Array.from(rooms));
}

function emitRoomUsers(room) {
  const list = Object.values(users).filter(u => u.room === room);
  io.to(room).emit("roomUsers", list);
}

// =============================
// Socket.io Events
// =============================
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // Join Room
  socket.on("joinRoom", ({ room, uid, name }) => {
    if (!room) room = "general";
    const prev = users[socket.id];
    if (prev && prev.room) socket.leave(prev.room);

    rooms.add(room);
    users[socket.id] = { uid, name, room };
    uidToSocket[uid] = socket.id;
    socket.join(room);

    io.to(room).emit("chatMessage", {
      from: "system",
      text: `${name} joined ${room}`,
      uid: null,
      ts: Date.now(),
      system: true
    });

    emitRoomList();
    emitRoomUsers(room);

    // Send chat history
    if (!chatHistory[room]) chatHistory[room] = [];
    socket.emit("chatHistory", chatHistory[room]);
  });

  // Handle Chat Message
  socket.on("chatMessage", (msg) => {
    if (!msg.room) msg.room = users[socket.id]?.room || "general";
    if (!chatHistory[msg.room]) chatHistory[msg.room] = [];
    chatHistory[msg.room].push(msg);
    saveChatHistory(msg.room);
    io.to(msg.room).emit("chatMessage", msg);
  });

  // Handle Private Messages
  socket.on("privateMessage", ({ toUid, msg }) => {
    const toSocket = uidToSocket[toUid];
    if (!toSocket) return;

    // Save DM history
    const uids = [msg.uid, toUid].sort().join("_");
    if (!dmHistory[uids]) dmHistory[uids] = [];
    dmHistory[uids].push(msg);
    saveDmHistory(msg.uid, toUid);

    io.to(toSocket).emit("privateMessage", msg);
  });

  // Typing indicators
  socket.on("typing", (data) => socket.to(data.room).emit("typing", data));
  socket.on("stopTyping", (data) => socket.to(data.room).emit("stopTyping", data));

  // Leave room
  socket.on("leaveRoom", () => {
    const user = users[socket.id];
    if (!user) return;
    socket.leave(user.room);
    io.to(user.room).emit("chatMessage", {
      from: "system",
      text: `${user.name} left ${user.room}`,
      uid: null,
      ts: Date.now(),
      system: true
    });
    delete uidToSocket[user.uid];
    delete users[socket.id];
    emitRoomUsers(user.room);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (!user) return;
    const { name, room, uid } = user;
    delete users[socket.id];
    delete uidToSocket[uid];
    io.to(room).emit("chatMessage", {
      from: "system",
      text: `${name} left ${room}`,
      uid: null,
      ts: Date.now(),
      system: true
    });
    emitRoomUsers(room);
    console.log("disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
