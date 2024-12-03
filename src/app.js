const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static(__dirname + '/static'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/room/chat.html');
});

// {roomName: set{user1, user2, ..., userN}}
const roomsOnlineUsers = {};

// {roomName: Array[message1, message2, ..., messageN]}
const messages = {};

io.on('connection', (socket) => {
    function joinRoom(roomName) {
        // create room if doesn't exist
        if (!(roomName in roomsOnlineUsers)) {
            roomsOnlineUsers[roomName] = new Set();
            messages[roomName] = [];
            io.emit("addRoom", roomName);
        }

        if (roomsOnlineUsers[roomName].has(socket.username)) {
            return;
        }

        // if "currentRoom" in socket then user was in another room
        // else user is new
        if ("currentRoom" in socket) {
            socket.leave(socket.currentRoom);
            roomsOnlineUsers[socket.currentRoom].delete(socket.username);

            // if room is empty, delete room and messages
            if (socket.currentRoom != "Main" && roomsOnlineUsers[socket.currentRoom].size === 0) {
                // delete room and messages from dictionary
                delete roomsOnlineUsers[socket.currentRoom];
                delete messages[socket.currentRoom];
                // send notification to remove room from romm list
                io.emit("removeRoom", socket.currentRoom);
            }
            else {
                socket.to(socket.currentRoom).emit("disconnected", socket.username);
            }
        }

        socket.join(roomName);
        socket.currentRoom = roomName;
        socket.emit("setCurrentRoom", roomName);
        socket.emit("onlineUsers", [...roomsOnlineUsers[roomName]]);
        socket.emit("loadMessages", messages[socket.currentRoom]);
        socket.emit("welcome", socket.username, roomName);
        socket.to(roomName).emit("userJoin", socket.username);
        roomsOnlineUsers[roomName].add(socket.username);
    }

    function getSocketRoomId() {
        if (io.of("/").adapter.sids.has(socket.id)) {
            return [...io.of("/").adapter.sids.get(socket.id)][1];
        }
        return [];
    }

    socket.on("getRooms", () => {
        socket.emit("roomsList", [...Object.keys(roomsOnlineUsers)]);
    });

    socket.on("newRoom", roomName => {
        joinRoom(roomName);
    });

    socket.on("joinRoom", (roomName) => {
        joinRoom(roomName);
    });

    socket.on("join", username => {
        // user name is set to "username - userID"
        // to prevent duplicate names
        socket.username = `${username ? username + "-" : ""}(${socket.id})`;
        // new users join the "Main" room by default
        joinRoom("Main");
    });

    socket.on("message", (text) => {
        const message = `${socket.username} : ${text}`;
        messages[socket.currentRoom].push(message);
        socket.to(getSocketRoomId()).emit("message", message);
    })

    socket.on("typing", () => {
        socket.to(getSocketRoomId()).emit("typing", `${socket.username}`);
    });

    socket.on("disconnect", () => {
        roomsOnlineUsers[socket.currentRoom].delete(socket.username);
        // if room is empty, delete room and messages
        if (roomsOnlineUsers[socket.currentRoom].size === 0) {
            // delete room from dictionary
            delete roomsOnlineUsers[socket.currentRoom];
            delete messages[socket.currentRoom];
            // send notification to remove room from romm list
            io.emit("removeRoom", socket.currentRoom);
        }
        // if room not empty
        else {
            // send user disconnected notification to room
            io.to(socket.currentRoom).emit("disconnected", socket.username);
        }
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});