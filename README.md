# Open Chat

Firebase를 시그널 서버로 사용하는 실시간 오픈 채팅 웹 애플리케이션입니다.

## 기능

- 닉네임으로 간단한 로그인
- 채팅방 생성 및 참여
- 실시간 메시지 송수신
- 참여자 수 실시간 표시
- 입장/퇴장 시스템 메시지

## Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Realtime Database 생성 (테스트 모드로 시작)
3. 프로젝트 설정에서 웹 앱 추가
4. Firebase 설정 정보를 `app.js`의 `firebaseConfig`에 입력

## Firebase Realtime Database 규칙

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      "$roomId": {
        ".write": true,
        "messages": {
          "$messageId": {
            ".validate": "newData.hasChildren(['content', 'timestamp']) && newData.child('content').isString()"
          }
        },
        "users": {
          "$userId": {
            ".validate": "newData.hasChildren(['nickname', 'joinedAt'])"
          }
        }
      }
    }
  }
}
```

## GitHub Pages 배포

1. GitHub 저장소 생성
2. 코드 푸시
3. Settings > Pages에서 GitHub Pages 활성화
4. Source를 main 브랜치로 설정

## 로컬 테스트

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# 브라우저에서 http://localhost:8000 접속
```