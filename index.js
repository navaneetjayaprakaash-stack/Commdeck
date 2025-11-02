const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

if (!process.env.SERVICE_ACCOUNT_KEY) {
  throw new Error("SERVICE_ACCOUNT_KEY environment variable not set!");
}

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Serve static frontend
app.use(express.static("public"));

// =============================
// User + Room Tracking
// =============================
let users = {};       // socket.id -> { uid, name, room }
let uidToSocket = {}; // uid -> socket.id
let rooms = new Set(["general", "random"]);

// Emit room list
function emitRoomList() {
  io.emit("roomList", Array.from(rooms));
}

// Emit user list for a room
function emitRoomUsers(room) {
  const list = Object.values(users).filter((u) => u.room === room);
  io.to(room).emit("roomUsers", list);
}

// =============================
// Socket.io Events
// =============================
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // Join room
  socket.on("joinRoom", async ({ room, uid, name }) => {
    if (!room) room = "general";

    const prev = users[socket.id];
    if (prev && prev.room) {
      socket.leave(prev.room);
    }

    rooms.add(room);
    users[socket.id] = { uid, name, room };
    uidToSocket[uid] = socket.id;
    socket.join(room);

    // Send system message
    io.to(room).emit("chatMessage", {
      from: "system",
      text: `${name} joined ${room}`,
      uid: null,
      ts: Date.now(),
      system: true,
    });

    emitRoomList();
    emitRoomUsers(room);

    // Load previous messages from Firestore
    const messagesSnap = await db
      .collection("rooms")
      .doc(room)
      .collection("messages")
      .orderBy("ts", "asc")
      .get();
    const history = messagesSnap.docs.map((doc) => doc.data());
    socket.emit("chatHistory", history);
  });

  // Handle chat messages
  socket.on("chatMessage", async (msg) => {
    if (!msg.room) msg.room = users[socket.id]?.room || "general";

    // Save to Firestore
    await db
      .collection("rooms")
      .doc(msg.room)
      .collection("messages")
      .add(msg);

    io.to(msg.room).emit("chatMessage", msg);
  });

  // Handle private messages
  socket.on("privateMessage", ({ toUid, msg }) => {
    const toSocket = uidToSocket[toUid];
    if (toSocket) {
      io.to(toSocket).emit("privateMessage", msg);
    }
  });

  // Leave room
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

  // Disconnect
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
  console.log(`Server running on port ${PORT}`);
});
