# Firebase 프로젝트 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 만들기" 클릭
3. 프로젝트 이름 입력 (예: "open-chat-project")
4. Google Analytics는 선택사항 (필요없으면 비활성화)
5. "프로젝트 만들기" 클릭

## 2. Realtime Database 설정

1. 왼쪽 메뉴에서 "빌드" > "Realtime Database" 클릭
2. "데이터베이스 만들기" 클릭
3. 위치 선택 (asia-northeast3 - 서울 추천)
4. "테스트 모드에서 시작" 선택 (나중에 보안 규칙 설정)
5. "사용 설정" 클릭

## 3. 보안 규칙 설정

Realtime Database > 규칙 탭에서 다음 규칙으로 변경:

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      "$roomId": {
        ".write": true,
        "messages": {
          "$messageId": {
            ".validate": "newData.hasChildren(['content', 'timestamp']) && newData.child('content').isString() && newData.child('timestamp').isNumber()"
          }
        },
        "users": {
          "$userId": {
            ".validate": "newData.hasChildren(['nickname', 'joinedAt']) && newData.child('nickname').isString()"
          }
        },
        "userCount": {
          ".validate": "newData.isNumber()"
        }
      }
    }
  }
}
```

"게시" 버튼 클릭하여 저장

## 4. 웹 앱 추가 및 설정 정보 얻기

1. 프로젝트 개요 페이지에서 "</>" (웹) 아이콘 클릭
2. 앱 닉네임 입력 (예: "open-chat-web")
3. "Firebase 호스팅 설정"은 체크하지 않음 (GitHub Pages 사용)
4. "앱 등록" 클릭
5. 표시되는 firebaseConfig 복사

## 5. app.js에 설정 적용

복사한 설정을 app.js 파일의 상단에 붙여넣기:

```javascript
const firebaseConfig = {
    apiKey: "실제값으로교체",
    authDomain: "실제값으로교체",
    databaseURL: "실제값으로교체",
    projectId: "실제값으로교체",
    storageBucket: "실제값으로교체",
    messagingSenderId: "실제값으로교체",
    appId: "실제값으로교체"
};
```

## 6. 테스트

1. 로컬 서버 실행:
   ```bash
   python -m http.server 8000
   ```

2. 브라우저에서 http://localhost:8000 접속

3. 닉네임 입력 후 채팅방 생성/참여 테스트

## 주의사항

- 테스트 모드는 30일 후 만료되므로, 프로덕션 사용 시 적절한 보안 규칙 설정 필요
- Firebase 무료 플랜 제한:
  - 동시 연결: 100개
  - 저장 용량: 1GB
  - 다운로드: 10GB/월