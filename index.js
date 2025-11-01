const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Track users in memory
let users = {};
let uidToSocket = {};

io.on("connection",(socket)=>{
  console.log("connected:",socket.id);

  socket.on("joinRoom",({room,uid,name})=>{
    if(!room) room="general";
    const prev = users[socket.id];
    if(prev && prev.room) socket.leave(prev.room);
    users[socket.id]={uid,name,room};
    uidToSocket[uid]=socket.id;
    socket.join(room);
    io.to(room).emit("chatMessage",{from:"system",text:`${name} joined ${room}`,uid:null,ts:Date.now(),system:true});
  });

  socket.on("chatMessage",(msg)=>{ io.to(msg.room).emit("chatMessage",msg); });

  socket.on("privateMessage",({toUid,msg})=>{
    const toSocket = uidToSocket[toUid];
    if(toSocket) io.to(toSocket).emit("privateMessage",msg);
  });

  socket.on("disconnect",()=>{
    const user=users[socket.id];
    if(user){
      delete uidToSocket[user.uid]; delete users[socket.id];
      io.to(user.room).emit("chatMessage",{from:"system",text:`${user.name} left ${user.room}`,uid:null,ts:Date.now(),system:true});
    }
    console.log("disconnected:",socket.id);
  });
});

server.listen(PORT,()=>{console.log(`Server running on http://localhost:${PORT}`);});
