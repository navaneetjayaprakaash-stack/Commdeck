import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const users = {}; // { socket.id: { username, room } }

io.on("connection", socket => {
  
  socket.on("join", ({ username, room }) => {
    users[socket.id] = { username, room };
    socket.join(room);

    socket.to(room).emit("message", { system: true, text: `${username} joined.` });

    io.to(room).emit("roomUsers", {
      room,
      users: Object.values(users).filter(u => u.room === room)
    });
  });

  socket.on("chatMessage", ({ room, sender, text }) => {
    io.to(room).emit("message", { sender, text });
  });

  socket.on("dm", ({ to, from, text }) => {
    [...io.sockets.sockets].forEach(([id, s]) => {
      if (users[id]?.username === to || users[id]?.username === from) {
        s.emit("dm", { from, to, text });
      }
    });
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (!user) return;

    socket.to(user.room).emit("message", { system: true, text: `${user.username} left.` });
    delete users[socket.id];

    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: Object.values(users).filter(u => u.room === user.room)
    });
  });
});

server.listen(process.env.PORT || 5000);
