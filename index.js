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

// ================================
// Persistent storage
// ================================
const DATA_DIR = path.join(__dirname, "data");
if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const ROOMS_FILE = path.join(DATA_DIR,"rooms.json");
const DMS_FILE = path.join(DATA_DIR,"dms.json");

function readJSON(file, defaultData){ 
  if(!fs.existsSync(file)) return defaultData;
  try {
    return JSON.parse(fs.readFileSync(file,"utf-8"));
  } catch { return defaultData; }
}

function writeJSON(file, data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

let rooms = readJSON(ROOMS_FILE, ["general"]);
let dms = readJSON(DMS_FILE, {}); // { fromUid_toUid: [messages] }

// ================================
// User tracking
// ================================
let users = {};       // socket.id -> { uid, name, room }
let uidToSocket = {}; // uid -> socket.id

function emitRoomList() { io.emit("roomList", rooms); }
function emitRoomUsers(room){
  const list = Object.values(users).filter(u=>u.room===room);
  io.to(room).emit("roomUsers",list);
}

// ================================
// Socket.io events
// ================================
io.on("connection", socket=>{
  console.log("connected:", socket.id);

  socket.on("joinRoom", ({room,uid,name})=>{
    if(!room) room="general";
    const prev = users[socket.id];
    if(prev && prev.room) socket.leave(prev.room);

    if(!rooms.includes(room)) rooms.push(room);
    writeJSON(ROOMS_FILE, rooms);

    users[socket.id] = { uid,name,room };
    uidToSocket[uid]=socket.id;
    socket.join(room);

    io.to(room).emit("chatMessage",{
      from:"system",
      text:`${name} joined ${room}`,
      uid:null,
      ts:Date.now(),
      system:true
    });

    emitRoomList();
    emitRoomUsers(room);
  });

  socket.on("chatMessage", msg=>{
    if(!msg.room) msg.room=users[socket.id]?.room || "general";
    io.to(msg.room).emit("chatMessage", msg);
  });

  socket.on("privateMessage", ({toUid,msg})=>{
    const toSocket = uidToSocket[toUid];
    if(toSocket) io.to(toSocket).emit("privateMessage", msg);

    // store in DM history
    const key = [msg.uid,toUid].sort().join("_");
    if(!dms[key]) dms[key]=[];
    dms[key].push(msg);
    writeJSON(DMS_FILE, dms);
  });

  socket.on("disconnect", ()=>{
    const user = users[socket.id];
    if(user){
      const {name,room,uid}=user;
      delete uidToSocket[uid];
      delete users[socket.id];
      io.to(room).emit("chatMessage",{
        from:"system",
        text:`${name} left ${room}`,
        uid:null,
        ts:Date.now(),
        system:true
      });
      emitRoomUsers(room);
    }
    console.log("disconnected:", socket.id);
  });
});

// ================================
// Start server
// ================================
server.listen(PORT,()=>console.log(`Server running at http://localhost:${PORT}`));
