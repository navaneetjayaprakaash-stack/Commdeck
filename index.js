// ================================
// Imports
// ================================
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");

// ================================
// Firebase Admin Setup
// ================================
if (!process.env.SERVICE_ACCOUNT_KEY) {
  throw new Error("SERVICE_ACCOUNT_KEY environment variable not set!");
}
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ================================
// Express + Socket.io Setup
// ================================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// ================================
// In-memory tracking
// ================================
let users = {}; // socket.id -> { uid, name, room }
let uidToSocket = {}; // uid -> socket.id

// ================================
// Firestore Helpers
// ================================
const ROOMS_COLLECTION = "rooms";

// Get messages for a room
async function getRoomMessages(room) {
  const snapshot = await db
    .collection(ROOMS_COLLECTION)
    .doc(room)
    .collection("messages")
    .orderBy("ts")
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

// Save message to Firestore
async function saveMessage(room, msg) {
  await db.collection(ROOMS_COLLECTION).doc(room).collection("messages").add(msg);
}

// ================================
// Socket.io Handlers
// ================================
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // Join Room
  socket.on("joinRoom", async ({ room, uid, name }) => {
    if (!room) room = "general";

    // Leave previous room
    const prev = users[socket.id];
    if (prev && prev.room) {
      socket.leave(prev.room);
    }

    socket.join(room);
    users[socket.id] = { uid, name, room };
    uidToSocket[uid] = socket.id;

    // Send previous messages
    const messages = await getRoomMessages(room);
    messages.forEach((msg) => {
      socket.emit("chatMessage", msg);
    });

    // Notify room
    const joinMsg = {
      from: "system",
      text: `${name} joined ${room}`,
      uid: null,
      ts: Date.now(),
      system: true,
    };
    io.to(room).emit("chatMessage", joinMsg);

    emitRoomList();
    emitRoomUsers(room);
  });

  // Chat message
  socket.on("chatMessage", async (msg) => {
    if (!msg.room) msg.room = users[socket.id]?.room || "general";
    await saveMessage(msg.room, msg);
    io.to(msg.room).emit("chatMessage", msg);
  });

  // Private message
  socket.on("privateMessage", async ({ toUid, msg }) => {
    const toSocket = uidToSocket[toUid];
    if (toSocket) io.to(toSocket).emit("privateMessage", msg);
    // Optionally save DMs in Firestore (not shown here)
  });

  // Change name
  socket.on("changeName", ({ uid, name }) => {
    const s = uidToSocket[uid];
    if (s && users[s]) users[s].name = name;
    // Could broadcast name change if needed
  });

  // Typing indicators
  socket.on("typing", (data) => {
    socket.to(data.room).emit("typing", data);
  });
  socket.on("stopTyping", (data) => {
    socket.to(data.room).emit("stopTyping", data);
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

// ================================
// Helpers
// ================================
function emitRoomList() {
  db.collection(ROOMS_COLLECTION)
    .get()
    .then((snap) => {
      const rooms = snap.docs.map((d) => d.id);
      io.emit("roomList", rooms.length ? rooms : ["general"]);
    });
}

function emitRoomUsers(room) {
  const list = Object.values(users).filter((u) => u.room === room);
  io.to(room).emit("roomUsers", list);
}

// ================================
// Start Server
// ================================
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
