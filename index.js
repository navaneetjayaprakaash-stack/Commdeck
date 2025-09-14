const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

// Track connected users
let users = {}; // {socket.id: username}

io.on('connection', socket => {

    socket.on('joinRoom', ({ room, username }) => {
        users[socket.id] = username;
        socket.join(room);

        socket.to(room).emit('message', { username: 'System', text: `${username} joined ${room}` });

        const roomUsers = Array.from(io.sockets.adapter.rooms.get(room) || [])
                               .map(id => users[id]);
        io.to(room).emit('roomUsers', roomUsers);
    });

    socket.on('leaveRoom', room => {
        socket.leave(room);
    });

    socket.on('chatMessage', ({ room, text, username }) => {
        io.to(room).emit('message', { username, text });
    });

    socket.on('privateMessage', ({ to, text, from }) => {
        const targetSocketId = Object.keys(users).find(id => users[id] === to);
        if(targetSocketId){
            io.to(targetSocketId).emit('message', { username: `(DM) ${from}`, text });
        }
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
