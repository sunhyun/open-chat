const firebaseConfig = {
    apiKey: "AIzaSyAaKAGAcViWooWrHUaKiIUoFw4mMgJXVJ8",
    authDomain: "open-chat-b1f00.firebaseapp.com",
    databaseURL: "https://open-chat-b1f00-default-rtdb.firebaseio.com",
    projectId: "open-chat-b1f00",
    storageBucket: "open-chat-b1f00.firebasestorage.app",
    messagingSenderId: "960699523603",
    appId: "1:960699523603:web:cd73dfb560d2ffb39915e6",
    measurementId: "G-RFHR8XBHJ7"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUser = null;
let currentRoom = null;
let roomListeners = [];

const loginContainer = document.getElementById('login-container');
const roomListContainer = document.getElementById('room-list-container');
const chatContainer = document.getElementById('chat-container');
const nicknameInput = document.getElementById('nickname-input');
const enterBtn = document.getElementById('enter-btn');
const userInfo = document.getElementById('user-info');
const roomNameInput = document.getElementById('room-name-input');
const createRoomBtn = document.getElementById('create-room-btn');
const roomList = document.getElementById('room-list');
const backToRooms = document.getElementById('back-to-rooms');
const roomTitle = document.getElementById('room-title');
const userCount = document.getElementById('user-count');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

enterBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    if (nickname) {
        login(nickname);
    }
});

nicknameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        enterBtn.click();
    }
});

createRoomBtn.addEventListener('click', () => {
    const roomName = roomNameInput.value.trim();
    if (roomName) {
        createRoom(roomName);
    }
});

roomNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createRoomBtn.click();
    }
});

backToRooms.addEventListener('click', () => {
    leaveRoom();
});

sendBtn.addEventListener('click', () => {
    sendMessage();
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function login(nickname) {
    currentUser = {
        id: Date.now().toString(),
        nickname: nickname
    };
    
    loginContainer.classList.add('hidden');
    roomListContainer.classList.remove('hidden');
    userInfo.textContent = `안녕하세요, ${nickname}님!`;
    
    loadRooms();
}

function loadRooms() {
    const roomsRef = database.ref('rooms');
    roomsRef.on('value', (snapshot) => {
        roomList.innerHTML = '';
        const rooms = snapshot.val() || {};
        
        Object.entries(rooms).forEach(([roomId, room]) => {
            const roomItem = createRoomElement(roomId, room);
            roomList.appendChild(roomItem);
        });
    });
}

function createRoomElement(roomId, room) {
    const roomItem = document.createElement('div');
    roomItem.className = 'room-item';
    roomItem.innerHTML = `
        <div>
            <div class="room-name">${room.name}</div>
            <div class="room-users">${room.userCount || 0}명 참여중</div>
        </div>
    `;
    roomItem.addEventListener('click', () => joinRoom(roomId, room.name));
    return roomItem;
}

function createRoom(roomName) {
    const roomId = Date.now().toString();
    const roomRef = database.ref(`rooms/${roomId}`);
    
    roomRef.set({
        name: roomName,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        userCount: 0
    }).then(() => {
        roomNameInput.value = '';
        joinRoom(roomId, roomName);
    });
}

function joinRoom(roomId, roomName) {
    currentRoom = roomId;
    
    roomListContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    roomTitle.textContent = roomName;
    chatMessages.innerHTML = '';
    
    const userRef = database.ref(`rooms/${roomId}/users/${currentUser.id}`);
    userRef.set({
        nickname: currentUser.nickname,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    userRef.onDisconnect().remove();
    
    const messagesRef = database.ref(`rooms/${roomId}/messages`);
    const messageListener = messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
    roomListeners.push({ ref: messagesRef, listener: messageListener });
    
    const usersRef = database.ref(`rooms/${roomId}/users`);
    const userListener = usersRef.on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const count = Object.keys(users).length;
        userCount.textContent = `${count}명`;
        
        database.ref(`rooms/${roomId}/userCount`).set(count);
    });
    roomListeners.push({ ref: usersRef, listener: userListener });
    
    sendSystemMessage(`${currentUser.nickname}님이 입장하셨습니다.`);
}

function leaveRoom() {
    if (currentRoom) {
        sendSystemMessage(`${currentUser.nickname}님이 퇴장하셨습니다.`);
        
        const userRef = database.ref(`rooms/${currentRoom}/users/${currentUser.id}`);
        userRef.remove();
        
        roomListeners.forEach(({ ref, listener }) => {
            ref.off('value', listener);
        });
        roomListeners = [];
        
        currentRoom = null;
        chatContainer.classList.add('hidden');
        roomListContainer.classList.remove('hidden');
    }
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (content && currentRoom) {
        const messagesRef = database.ref(`rooms/${currentRoom}/messages`);
        messagesRef.push({
            author: currentUser.nickname,
            content: content,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'user'
        });
        messageInput.value = '';
    }
}

function sendSystemMessage(content) {
    if (currentRoom) {
        const messagesRef = database.ref(`rooms/${currentRoom}/messages`);
        messagesRef.push({
            content: content,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'system'
        });
    }
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    
    if (message.type === 'system') {
        messageDiv.className = 'system-message';
        messageDiv.textContent = message.content;
    } else {
        messageDiv.className = 'message';
        const time = new Date(message.timestamp).toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        messageDiv.innerHTML = `
            <span class="message-author">${message.author}:</span>
            <span class="message-content">${message.content}</span>
            <span class="message-time">${time}</span>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.addEventListener('beforeunload', () => {
    if (currentRoom && currentUser) {
        const userRef = database.ref(`rooms/${currentRoom}/users/${currentUser.id}`);
        userRef.remove();
    }
});