# 희망리턴패키지 AI 챗봇 (ChatSpark)

이 프로젝트는 소상공인을 대상으로 희망리턴패키지 지원사업을 안내하고 상담하는 AI 챗봇 서비스입니다. 바닐라 웹 기술(HTML/CSS/JS)과 Vercel 서버리스 함수, 그리고 Google Gemini AI를 결합하여 설계되었습니다.

## 📐 전체 아키텍처 (워크플로우)
```
사용자 브라우저
    │
    ▼
[GitHub Pages] TDSG-AX.github.io/selim_chatSpark
    │  
    ▼
[Vercel] chatSpark Vercel 배포 주소 (예정)
    │  (정적 HTML/CSS + API 라우팅 서빙)
    │
    ├─── /api/chat (POST)
    │         │
    │         ▼
    │    [Vercel Serverless Function] api/chat.js
    │         │
    │         ▼
    │    [Google Gemini API] 
    │         │  AI 응답 반환
    │         ▼
    │    브라우저에 응답
    │
    └─── /api/send-email (POST) (추가 예정 기능)
              │
              ▼
         [Vercel Serverless Function] api/send-email.js
              │
              ▼
         [EmailJS API]
              │  이메일 발송
              ▼
         담당자 이메일 수신
```

---

## 🗂️ 파일 구조
```
selim_chatSpark/
├── index.html          # 메인 랜딩 페이지 (희망리턴패키지 소개 + AI 챗봇 UI)
├── style.css           # 전체 스타일시트 (봄 테마 코랄/핑크 색상 적용)
├── script.js           # 프론트엔드 챗봇 UI 로직 (상태 관리 로직 추가 예정)
├── base01~04.md        # AI 챗봇의 지식 베이스 문서 (지원금, 자격, 사례 등)
├── api/
│   ├── chat.js         # Gemini AI 호출 서버리스 함수 (지식 베이스 프롬프팅 적용)
│   └── send-email.js   # [예정] 상담 내역 및 연락처 EmailJS 발송 서버리스 함수
└── README.md           # 이 문서
```

---

## 🤖 AI 챗봇 대화 흐름 (진행 예정 모델)
현재는 단순 질의응답 형태(STEP 1)로 동작하며, 향후 아래와 같은 단계별 상태(Step) 시스템을 도입할 예정입니다.

1. **STEP 1 (상담 진행):** Gemini AI가 희망리턴패키지 관련 자유 상담 진행
2. **STEP 2 (개인정보 동의):** 일정 대화 후, 상세 상담을 위한 개인정보 수집 동의 요청
3. **STEP 3 (이름 수집):** 사용자 이름 수집
4. **STEP 4 (연락처 수집 및 발송):** 이메일/전화번호 수집 후, 즉시 담당자에게 EmailJS를 통해 리드 메일 발송
5. **STEP 5 (종료):** 상담 종료 안내

---

## 🔑 필요한 외부 서비스 및 환경변수
향후 Vercel 배포 시, 다음 환경변수들이 `Vercel 대시보드 → 프로젝트 → Settings → Environment Variables` 에 등록되어야 합니다.

| 환경변수 | 설명 | 발급 위치 |
|----------|------|-----------|
| `chatspark` | Google Gemini AI API 키 | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `EMAILJS_PUBLIC_KEY` | EmaiJS 연동을 위한 Public Key (예정) | [EmailJS Account Dashboard] |
| `EMAILJS_PRIVATE_KEY` | EmailJS 연동을 위한 Private Key (예정) | [EmailJS Account Dashboard] |
| `EMAILJS_SERVICE_ID` | 연결된 이메일 서비스 ID (예정) | [EmailJS Services Dashboard] |
| `EMAILJS_TEMPLATE_ID` | 이메일 템플릿 ID (예정) | [EmailJS Templates Dashboard] |

---

## 🚀 배포 방법
1. 현재 소스코드는 GitHub Repository (`main` 브랜치)에 안전하게 저장되어 있습니다.
2. **Vercel 연동:** [vercel.com](https://vercel.com)에 로그인 후, `Add New Project`를 통해 해당 GitHub 저장소를 임포트합니다.
3. 배포 설정 단계에서 위 표에 나열된 **환경변수(Environment Variables)** 를 추가하고 Deploy 합니다.
4. 배포된 Vercel URL을 통해 정상적으로 챗봇 API가 작동하는지 확인합니다.
