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
let connectedListener = null;

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
    // 기존 리스너 정리
    roomListeners.forEach(({ ref, event, listener }) => {
        ref.off(event, listener);
    });
    roomListeners = [];
    
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
    
    const connectedRef = database.ref('.info/connected');
    if (connectedListener) {
        connectedRef.off('value', connectedListener);
    }
    connectedListener = connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            userRef.set({
                nickname: currentUser.nickname,
                joinedAt: firebase.database.ServerValue.TIMESTAMP
            });
            userRef.onDisconnect().remove();
        }
    });
    
    const messagesRef = database.ref(`rooms/${roomId}/messages`);
    const messageListener = messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message, snapshot.key);
    });
    roomListeners.push({ ref: messagesRef, event: 'child_added', listener: messageListener });
    
    const messageRemovedListener = messagesRef.on('child_removed', (snapshot) => {
        const messageElement = document.getElementById(`message-${snapshot.key}`);
        if (messageElement) {
            messageElement.remove();
        }
    });
    roomListeners.push({ ref: messagesRef, event: 'child_removed', listener: messageRemovedListener });
    
    const usersRef = database.ref(`rooms/${roomId}/users`);
    const userListener = usersRef.on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const count = Object.keys(users).length;
        userCount.textContent = `${count}명`;
        
        database.ref(`rooms/${roomId}/userCount`).set(count);
    });
    roomListeners.push({ ref: usersRef, event: 'value', listener: userListener });
    
    const systemMessageRef = database.ref(`rooms/${roomId}/messages`).push();
    systemMessageRef.set({
        content: `${currentUser.nickname}님이 입장하셨습니다.`,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'system'
    });
    
    const disconnectMessageRef = database.ref(`rooms/${roomId}/messages`).push();
    userRef.onDisconnect().remove().then(() => {
        disconnectMessageRef.onDisconnect().set({
            content: `${currentUser.nickname}님이 연결이 끊어졌습니다.`,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            type: 'system'
        });
    });
    
    // 방 입장 시 오래된 메시지는 displayMessage에서 필터링됨
}

function leaveRoom() {
    if (currentRoom) {
        sendSystemMessage(`${currentUser.nickname}님이 퇴장하셨습니다.`);
        
        const userRef = database.ref(`rooms/${currentRoom}/users/${currentUser.id}`);
        userRef.remove();
        
        roomListeners.forEach(({ ref, event, listener }) => {
            ref.off(event, listener);
        });
        roomListeners = [];
        
        if (connectedListener) {
            database.ref('.info/connected').off('value', connectedListener);
            connectedListener = null;
        }
        
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

function displayMessage(message, messageId) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // 1시간이 지난 메시지는 표시하지 않음
    if (message.timestamp && (now - message.timestamp > oneHour)) {
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.id = `message-${messageId}`;
    messageDiv.dataset.timestamp = message.timestamp;
    
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

setInterval(() => {
    if (currentRoom && currentUser) {
        const userRef = database.ref(`rooms/${currentRoom}/users/${currentUser.id}`);
        userRef.update({
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
}, 30000);

function cleanupInactiveUsers() {
    if (!currentRoom) return;
    
    const usersRef = database.ref(`rooms/${currentRoom}/users`);
    usersRef.once('value', (snapshot) => {
        const users = snapshot.val() || {};
        const now = Date.now();
        const timeout = 60000;
        
        Object.entries(users).forEach(([userId, user]) => {
            if (user.lastSeen && (now - user.lastSeen > timeout)) {
                if (userId !== currentUser.id) {
                    database.ref(`rooms/${currentRoom}/users/${userId}`).remove();
                    sendSystemMessage(`${user.nickname}님이 연결이 끊어졌습니다.`);
                }
            }
        });
    });
}

setInterval(cleanupInactiveUsers, 10000);

// 주기적으로 오래된 메시지 숨기기 (UI 갱신)
function hideOldMessages() {
    if (!currentRoom) return;
    
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const messages = chatMessages.querySelectorAll('.message, .system-message');
    
    messages.forEach(messageEl => {
        const messageId = messageEl.id.replace('message-', '');
        const timeEl = messageEl.querySelector('.message-time');
        
        if (timeEl) {
            // 시간 정보에서 타임스탬프 추출하는 대신 data 속성 사용
            const timestamp = parseInt(messageEl.dataset.timestamp);
            if (timestamp && (now - timestamp > oneHour)) {
                messageEl.style.display = 'none';
            }
        }
    });
}

// 5분마다 UI에서 오래된 메시지 숨기기
setInterval(hideOldMessages, 5 * 60 * 1000);

let viewportHeight = window.innerHeight;
window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    if (currentHeight < viewportHeight * 0.75) {
        document.body.classList.add('keyboard-open');
        if (chatMessages) {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 300);
        }
    } else {
        document.body.classList.remove('keyboard-open');
    }
});

messageInput.addEventListener('focus', () => {
    if (window.innerWidth <= 600) {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 300);
    }
});