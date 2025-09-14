// index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const users = {}; // socketId -> { uid, name, room }
const uidToSocket = {}; // uid -> socketId
const rooms = new Set(["general", "random"]);

function emitRoomList() {
  io.emit("roomsList", Array.from(rooms));
}
function emitRoomUsers(room) {
  const roomUsers = Object.values(users)
    .filter((u) => u.room === room)
    .map((u) => ({ uid: u.uid, name: u.name }));
  io.to(room).emit("roomUsers", roomUsers);
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("joinRoom", ({ room, uid, name }) => {
    if (!room) room = "general";

    const prev = users[socket.id];
    if (prev && prev.room) {
      socket.leave(prev.room);
    }

    rooms.add(room);
    users[socket.id] = { uid, name, room };
    uidToSocket[uid] = socket.id;
    socket.join(room);

    io.to(room).emit("chatMessage", {
      id: null,
      from: "system",
      text: `${name} joined ${room}`,
      uid: null,
      ts: Date.now(),
      system: true
    });

    emitRoomList();
    emitRoomUsers(room);
  });

  socket.on("leaveRoom", () => {
    const u = users[socket.id];
    if (!u) return;
    socket.leave(u.room);
    io.to(u.room).emit("chatMessage", {
      id: null,
      from: "system",
      text: `${u.name} left ${u.room}`,
      uid: null,
      ts: Date.now(),
      system: true
    });
    delete uidToSocket[u.uid];
    delete users[socket.id];
    emitRoomUsers(u.room);
  });

  // Broadcast new message payload to everyone in room
  socket.on("chatMessage", (payload) => {
    // payload should include { id, from, text, uid, room, ts, dmId? }
    if (!payload) return;
    const room = payload.room;
    if (room) io.to(room).emit("chatMessage", payload);
    // If it's a DM, server will forward to specific socket instead
    if (payload.dm && payload.dmId && payload.toUid) {
      // send to both sides (sender already has it locally)
      const targetSocketId = uidToSocket[payload.toUid];
      if (targetSocketId) io.to(targetSocketId).emit("privateMessage", payload);
    }
  });

  // Private message direct via server (backup)
  socket.on("privateMessage", (payload) => {
    if (!payload) return;
    const targetSocketId = uidToSocket[payload.toUid];
    if (targetSocketId) {
      io.to(targetSocketId).emit("privateMessage", payload);
      socket.emit("privateMessageSent", payload);
    } else {
      socket.emit("systemNotice", { text: "User offline / not found" });
    }
  });

  // Broadcast updates: edited message or reaction toggles
  socket.on("updateMessage", ({ room, messageId, changes, dmId, toUid }) => {
    // if dmId provided -> DM; else -> room
    if (dmId && toUid) {
      // DM: forward to other user
      const targetSocketId = uidToSocket[toUid];
      if (targetSocketId) {
        io.to(targetSocketId).emit("updateMessage", { messageId, changes, dmId });
      }
      // also send to room/clients? sender already has local
      socket.emit("updateMessage", { messageId, changes, dmId });
    } else if (room) {
      io.to(room).emit("updateMessage", { messageId, changes });
    }
  });

  socket.on("deleteMessage", ({ room, messageId, dmId, toUid }) => {
    if (dmId && toUid) {
      const targetSocketId = uidToSocket[toUid];
      if (targetSocketId) io.to(targetSocketId).emit("deleteMessage", { messageId, dmId });
      socket.emit("deleteMessage", { messageId, dmId });
    } else if (room) {
      io.to(room).emit("deleteMessage", { messageId });
    }
  });

  socket.on("getRooms", () => {
    socket.emit("roomsList", Array.from(rooms));
  });

  socket.on("disconnect", () => {
    const u = users[socket.id];
    if (u) {
      io.to(u.room).emit("chatMessage", {
        id: null,
        from: "system",
        text: `${u.name} disconnected`,
        uid: null,
        ts: Date.now(),
        system: true
      });
      delete uidToSocket[u.uid];
      delete users[socket.id];
      emitRoomUsers(u.room);
    }
    console.log("disconnected:", socket.id);
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  emitRoomList();
});
