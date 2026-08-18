# 공공일자리

인사혁신처 나라일터의 공공취업정보 조회 서비스를 연계한 공공부문 채용정보 웹 서비스입니다.

## 로컬 실행

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`의 `DATA_GO_KR_API_KEY`에 공공데이터포털에서 발급받은 일반 인증키(Decoding)를 입력하세요. 키가 없거나 API가 응답하지 않을 때는 UI 확인을 위한 미리보기 데이터가 표시됩니다.

## Vercel 배포

Vercel 프로젝트의 Settings → Environment Variables에 `DATA_GO_KR_API_KEY`를 추가하고 Production, Preview, Development 환경에 적용한 뒤 재배포합니다. 이 값은 서버 Route Handler에서만 사용되며 브라우저 번들에 노출되지 않습니다.

데이터 출처: [인사혁신처 공공취업정보 조회 서비스](https://www.data.go.kr/data/15156780/openapi.do)
