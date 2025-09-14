// index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// serve frontend
app.use(express.static("public"));

// =============================
// User + Room tracking
// =============================
let users = {};       // socket.id -> { uid, name, room }
let uidToSocket = {}; // uid -> socket.id
let rooms = new Set(["general", "random"]);

// Helper: emit room list
function emitRoomList() {
  io.emit("roomList", Array.from(rooms));
}

// Helper: emit user list for a room
function emitRoomUsers(room) {
  const list = Object.values(users).filter((u) => u.room === room);
  io.to(room).emit("roomUsers", list);
}

// =============================
// Socket.io Events
// =============================
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // join a room
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
      from: "system",
      text: `${name} joined ${room}`,
      uid: null,
      ts: Date.now(),
      system: true,
    });

    emitRoomList();
    emitRoomUsers(room);
  });

  // handle chat messages
  socket.on("chatMessage", (msg) => {
    if (!msg.room) {
      msg.room = users[socket.id]?.room || "general";
    }
    io.to(msg.room).emit("chatMessage", msg);
  });

  // handle private messages
  socket.on("privateMessage", ({ toUid, msg }) => {
    const toSocket = uidToSocket[toUid];
    if (toSocket) {
      io.to(toSocket).emit("privateMessage", msg);
    }
  });

  // leave room
  socket.on("leaveRoom", () => {
    const user = users[socket.id];
    if (user) {
      socket.leave(user.room);
      io.to(user.room).emit("chatMessage", {
        from: "system",
        text: `${user.name} left ${user.room}`,
        uid: null,
        ts: Date.now(),
        system: true,
      });
      delete uidToSocket[user.uid];
      delete users[socket.id];
      emitRoomUsers(user.room);
    }
  });

  // disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      const { name, room } = user;
      delete uidToSocket[user.uid];
      delete users[socket.id];
      io.to(room).emit("chatMessage", {
        from: "system",
        text: `${name} left ${room}`,
        uid: null,
        ts: Date.now(),
        system: true,
      });
      emitRoomUsers(room);
    }
    console.log("disconnected:", socket.id);
  });
});

// =============================
// Start Server
// =============================
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
