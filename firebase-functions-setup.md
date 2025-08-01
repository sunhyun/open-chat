# Firebase Functions로 메시지 자동 삭제 구현

현재 클라이언트에서 메시지를 삭제하는 방식은 보안상 위험합니다. Firebase Functions를 사용하여 서버에서 자동으로 처리하는 것이 안전합니다.

## 1. Firebase Functions 설정 (선택사항)

Firebase Functions를 사용하려면 Blaze(종량제) 요금제가 필요합니다.

### Functions 코드 예시:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 1시간마다 실행되는 스케줄 함수
exports.cleanupOldMessages = functions.pubsub.schedule('every 60 minutes').onRun(async (context) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const roomsSnapshot = await admin.database().ref('rooms').once('value');
    const rooms = roomsSnapshot.val() || {};
    
    const promises = [];
    
    Object.keys(rooms).forEach(roomId => {
        const messagesRef = admin.database().ref(`rooms/${roomId}/messages`);
        
        const promise = messagesRef.once('value').then(snapshot => {
            const messages = snapshot.val() || {};
            const updates = {};
            
            Object.entries(messages).forEach(([messageId, message]) => {
                if (message.timestamp && (now - message.timestamp > oneHour)) {
                    updates[messageId] = null;
                }
            });
            
            if (Object.keys(updates).length > 0) {
                return messagesRef.update(updates);
            }
        });
        
        promises.push(promise);
    });
    
    await Promise.all(promises);
    console.log('Old messages cleaned up');
});
```

## 2. 현재 솔루션의 보안 개선

Firebase Functions 없이 현재 구조를 유지하면서 보안을 개선하는 방법:

### 개선된 Firebase 규칙:

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      "$roomId": {
        "messages": {
          ".read": true,
          "$messageId": {
            // 새 메시지 생성만 허용, 수정/삭제 불가
            ".write": "!data.exists() && newData.exists()",
            ".validate": "newData.hasChildren(['content', 'timestamp', 'author']) && newData.child('content').isString() && newData.child('timestamp').isNumber()"
          }
        },
        "users": {
          ".read": true,
          "$userId": {
            ".write": true,
            ".validate": "newData.hasChildren(['nickname', 'joinedAt'])"
          }
        },
        "name": {
          ".write": "!data.exists()"
        },
        "createdAt": {
          ".write": "!data.exists()"
        },
        "userCount": {
          ".write": true
        }
      }
    }
  }
}
```

## 3. 대안: 메시지 표시 시간 제한

서버에서 삭제하는 대신, 클라이언트에서 1시간이 지난 메시지를 표시하지 않는 방법:

```javascript
// displayMessage 함수 수정
function displayMessage(message, messageId) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // 1시간이 지난 메시지는 표시하지 않음
    if (message.timestamp && (now - message.timestamp > oneHour)) {
        return;
    }
    
    // 기존 코드...
}
```

## 추천 방안

1. **단기적**: 클라이언트에서 오래된 메시지를 표시하지 않도록 필터링
2. **장기적**: Firebase Functions를 사용하여 서버에서 자동 삭제 처리

이렇게 하면 보안을 유지하면서도 메시지 관리가 가능합니다.