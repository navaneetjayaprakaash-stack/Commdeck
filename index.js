// ===== Imports =====
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");

// ===== Firebase Setup =====
let serviceAccountRaw = process.env.SERVICE_ACCOUNT_KEY;

if (!serviceAccountRaw) {
  console.error("❌ SERVICE_ACCOUNT_KEY is missing from environment variables!");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountRaw);

  // Fix escaped \n in private key
  if (typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  } else {
    throw new Error("Missing private_key field in service account JSON.");
  }
} catch (err) {
  console.error("❌ Failed to parse SERVICE_ACCOUNT_KEY:", err);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ===== Express + Socket.io Setup =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static("public"));

// ===== User + Room Tracking =====
let users = {};        // socket.id -> { uid, name, room }
let uidToSocket = {};  // uid -> socket.id
let rooms = new Set(["general", "random"]);

function emitRoomList() {
  io.emit("roomList", Array.from(rooms));
}

function emitRoomUsers(room) {
  const list = Object.values(users).filter(u => u.room === room);
  io.to(room).emit("roomUsers", list);
}

// ===== Socket.io Logic =====
io.on("connection", socket => {
  console.log("✅ New connection:", socket.id);

  // Join room
  socket.on("joinRoom", async ({ room, uid, name }) => {
    try {
      if (!room) room = "general";
      const prev = users[socket.id];
      if (prev && prev.room) socket.leave(prev.room);

      rooms.add(room);
      users[socket.id] = { uid, name, room };
      uidToSocket[uid] = socket.id;
      socket.join(room);

      // Announce join
      io.to(room).emit("chatMessage", {
        from: "system",
        text: `${name} joined ${room}`,
        uid: null,
        ts: Date.now(),
        system: true,
      });

      emitRoomList();
      emitRoomUsers(room);

      // Load history
      const messagesSnap = await db
        .collection("rooms")
        .doc(room)
        .collection("messages")
        .orderBy("ts", "asc")
        .limit(100)
        .get();

      const history = messagesSnap.docs.map(d => d.data());
      socket.emit("chatHistory", history);
    } catch (err) {
      console.error("❌ Error in joinRoom:", err);
      socket.emit("errorMessage", "Could not join room.");
    }
  });

  // Handle chat messages
  socket.on("chatMessage", async msg => {
    try {
      if (!msg.room) msg.room = users[socket.id]?.room || "general";
      await db.collection("rooms").doc(msg.room).collection("messages").add(msg);
      io.to(msg.room).emit("chatMessage", msg);
    } catch (err) {
      console.error("❌ Error saving chat message:", err);
    }
  });

  // Private messages
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
    console.log("❌ Disconnected:", socket.id);
  });
});

// ===== Start server =====
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
