require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

// ===== Firebase Setup =====
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
  if (serviceAccount.private_key.includes("\\n")) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
} catch (err) {
  console.error("❌ Failed to parse SERVICE_ACCOUNT_KEY:", err);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ===== Express + Socket.io =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// ===== Users + Rooms =====
let users = {};        // socket.id -> { uid, name, room }
let uidToSocket = {};  // uid -> socket.id
let rooms = new Set();

// Emit room list to all
function emitRoomList() {
  io.emit("roomList", Array.from(rooms));
}

function emitRoomUsers(room) {
  const list = Object.values(users).filter(u => u.room === room);
  io.to(room).emit("roomUsers", list);
}

// ===== Socket.io =====
io.on("connection", socket => {
  console.log("connected:", socket.id);

  socket.on("createRoom", ({ roomName, uid, name }) => {
    if (!roomName) roomName = `room-${uuidv4().slice(0, 6)}`;
    rooms.add(roomName);

    const prev = users[socket.id];
    if (prev && prev.room) socket.leave(prev.room);

    users[socket.id] = { uid, name, room: roomName };
    uidToSocket[uid] = socket.id;
    socket.join(roomName);

    io.to(roomName).emit("chatMessage", {
      from: "system",
      text: `${name} created and joined ${roomName}`,
      uid: null,
      ts: Date.now(),
      system: true,
    });

    emitRoomList();
    emitRoomUsers(roomName);
  });

  socket.on("joinRoom", async ({ room, uid, name }) => {
    if (!room) room = `room-${uuidv4().slice(0, 6)}`;
    rooms.add(room);

    const prev = users[socket.id];
    if (prev && prev.room) socket.leave(prev.room);

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

    // Load last 100 messages
    const messagesSnap = await db
      .collection("rooms")
      .doc(room)
      .collection("messages")
      .orderBy("ts", "asc")
      .limit(100)
      .get();

    const history = messagesSnap.docs.map(d => d.data());
    socket.emit("chatHistory", history);
  });

  socket.on("chatMessage", async msg => {
    const userRoom = users[socket.id]?.room;
    if (!msg.room) msg.room = userRoom || `room-${uuidv4().slice(0, 6)}`;
    await db.collection("rooms").doc(msg.room).collection("messages").add(msg);
    io.to(msg.room).emit("chatMessage", msg);
  });

  socket.on("privateMessage", ({ toUid, msg }) => {
    const toSocket = uidToSocket[toUid];
    if (toSocket) io.to(toSocket).emit("privateMessage", msg);
  });

  socket.on("changeName", ({ uid, newName }) => {
    const socketId = uidToSocket[uid];
    if (socketId && users[socketId]) {
      const oldName = users[socketId].name;
      users[socketId].name = newName;
      io.to(users[socketId].room).emit("chatMessage", {
        from: "system",
        text: `${oldName} changed name to ${newName}`,
        uid: null,
        ts: Date.now(),
        system: true,
      });
      emitRoomUsers(users[socketId].room);
    }
  });

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

// ===== Start server =====
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
