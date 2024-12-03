const roomsListDiv = document.getElementById("roomsList");
const createRoomDiv = document.getElementById("createRoom");
const socket = io();

// add room to rooms list div
function addRoom(roomName) {
    const newRoom = document.createElement("div");
    newRoom.innerText = roomName;
    newRoom.id = roomName;
    newRoom.addEventListener("click", () => {
        socket.emit("joinRoom", roomName);
        viewCompletePage();
    });
    roomsListDiv.appendChild(newRoom);
}

// ask server for rooms list
socket.emit("getRooms");

// got rooms list from server
socket.on("roomsList", (roomsList) => {
    if (roomsList) {
        for (let roomName of roomsList) {
            addRoom(roomName);
        }
    }
});

createRoomDiv.addEventListener("click", () => {
    roomName = prompt("Room name.");
    if (roomName) {
        socket.emit("newRoom", roomName);
        viewCompletePage();
    }
});

socket.on("addRoom", (roomName) => {
    addRoom(roomName);
});

/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

const messagesDiv = document.getElementById("messages");
const newMessageForm = document.getElementById("newMessageForm");
const newMessageInput = document.getElementById("newMessage");
const typingDiv = document.getElementById("typing");
const onlineUsersDiv = document.getElementById("onlineUsers");


// timeout to hide "user is typing" div
let typingTimeout = undefined;

// as user to set name
const username = prompt("Choose your user name.");

function viewCompletePage() {
    // remove the class that make div take whole page size
    document.getElementById("rooms").classList.remove("start");
}

function addNewOnlineUser(username) {
    const newOnlineUserDiv = document.createElement("div");
    newOnlineUserDiv.id = username;
    newOnlineUserDiv.innerText = username;

    onlineUsersDiv.appendChild(newOnlineUserDiv);
}

socket.on("userJoin", (username) => {
    addNewMessage(`${username} joined the room.`, ["joinMessage"]);
    addNewOnlineUser(username);
});

socket.on("onlineUsers", (onlineUsersNames) => {
    onlineUsersDiv.innerHTML = "";
    addNewOnlineUser("(you)");
    for (let username of onlineUsersNames) {
        addNewOnlineUser(username);
    }
});

// add new message to chat
// classes set message type
// message without class is a normal message, classes set type of informative messages
// types: welcomeMessage, joinMessage, disconnectedMessage
function addNewMessage(text, classList) {
    const newMessageDiv = document.createElement("div");
    newMessageDiv.innerText = text;
    messagesDiv.appendChild(newMessageDiv);
    if (classList) {
        for (c of classList) {
            newMessageDiv.classList.add(c);
        }
    }
    // if scroll position is close to bottom, scroll to show new message
    if (messagesDiv.clientHeight + messagesDiv.scrollTop >= messagesDiv.scrollHeight - 100) {
        newMessageDiv.scrollIntoView();
    }
}

// receive new message from server
socket.on("message", (text) => {
    addNewMessage(text);
});

// other user disconnected
socket.on("disconnected", (username) => {
    disconnectedUserDiv = document.getElementById(username);
    if (disconnectedUserDiv) {
        disconnectedUserDiv.remove();
    }
    addNewMessage(`${username} disconnected from room.`, ["disconnectedMessage"]);
});

// current user welcoming message
socket.on("welcome", (username, roomName) => {
    addNewMessage(`Welcome ${username} to ${roomName} room.`, ["welcomeMessage"]);
})

// hide "user is typing" label
function clearTyping() {
    // every time other user press a key,
    // the removeTypingMessage timer is reset
    // so the div is removed after 5s from the time the other user pressed the last key
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { typingDiv.innerText = "" }, 5000);
}

// someone is typing
socket.on("typing", (username) => {
    typingDiv.innerText = `${username} is typing...`;
    clearTyping();
});

socket.on("setCurrentRoom", roomName => {
    const oldRoom = document.querySelector(".currentRoom");

    if (oldRoom) {
        if (oldRoom.id === roomName) {
            return;
        }
        oldRoom.removeAttribute('class');
    }

    messagesDiv.innerHTML = "";

    const newRoom = document.getElementById(roomName);
    newRoom.classList.add("currentRoom");

    document.title = `Room ${roomName}`;
});

socket.on("loadMessages", messages => {
    messages.forEach(message => {
        addNewMessage(message);
    });
})

socket.on("removeRoom", roomName => {
    const roomDiv = document.getElementById(roomName);
    roomDiv.remove();
});

newMessageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    const text = formData.get("newMessage");

    addNewMessage(`(you) : ${text}`);

    socket.emit("message", text);
    newMessageForm.reset();
});

newMessageInput.addEventListener("keyup", (event) => {
    if (event.key !== "Enter" && event.key !== "Tab") {
        socket.emit("typing");
    }
})

socket.emit("join", username);