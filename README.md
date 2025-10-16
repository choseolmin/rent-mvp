# rent-mvp
Rent MVP (10분 단위 임대 계약 DApp)

이 프로젝트는 ERC20 토큰(LIVP) 을 활용하여 임대 계약(보증금 + 10분 단위 월세 납부) 을 온체인에서 관리하는 시스템입니다.
집주인은 매물을 등록하고, 세입자는 계약을 체결한 뒤, 10분마다 임대료를 납부할 수 있습니다.

📌 1. 컨트랙트 구조
LIVP (ERC20, ERC20Permit)

표준 ERC-20 토큰 + Permit 지원.

총 발행량: 100,000 LIVP (18 decimals)

배포 시: 전량 오너 지갑에 민트.

역할: 임대료 결제 수단.

RentalRegistry

매물을 등록하고 조회하는 레지스트리 컨트랙트.

주요 데이터 구조 Listing:

landlord: 집주인 주소

payToken: 결제 토큰 주소 (기본 LIVP)

deposit: 보증금

rentPerPeriod: 10분 단위 임대료

totalPeriods: 총 회차(10분 단위 개수)

availableFrom: 시작 가능 시각(epoch)

active: 활성 여부

주요 함수:

createListing(payToken, deposit, rentPerPeriod, totalPeriods, availableFrom)

집주인이 매물을 등록

이벤트 ListingCreated 발생

LeaseManager

계약 체결 + 주기적 납부를 관리하는 컨트랙트

상수: PERIOD_SECONDS = 600 (10분)

주요 데이터 구조 Lease:

tenant, landlord, token

deposit, rentPerPeriod, totalPeriods

paidPeriods, nextDue, active

주요 함수:

joinLease(listingId)

세입자가 계약 체결

보증금 + 첫 임대료 즉시 집주인에게 송금

paidPeriods = 1, nextDue = now + 600

이벤트 LeaseStarted

payRent(leaseId)

10분 주기가 도래하면 실행 가능

세입자 → 집주인에게 임대료 송금

paidPeriods++, nextDue += 600

마지막 회차 납부 시 active = false, 이벤트 LeaseCompleted

dueNow(leaseId) → bool

지금 납부 시점인지 여부 확인

📌 2. 함수 동작 요약
함수	호출자	동작
createListing	집주인	매물 등록
joinLease	세입자	계약 체결(보증금+첫 임대료 송금)
payRent	세입자(또는 자동화)	10분 단위 임대료 납부
dueNow	누구나	지금 납부해야 하는지 확인
📌 3. 실제 흐름 (돈의 이동)

1) 초기화

LIVP 100,000개 발행 → 오너 지갑

집주인이 LIVP 일부를 세입자에게 전송 (테스트/운영 필요량)

2) 승인(approve/permit)

세입자는 LIVP에서 LeaseManager에 충분한 allowance 승인

(보증금 + 총 임대료 이상 권장)

3) 매물 등록

집주인이 createListing() 실행

온체인에 매물 정보 기록

4) 계약 체결

세입자가 joinLease(listingId) 실행

즉시 deposit + 첫 임대료 → 집주인 송금

Lease 생성 및 시작

5) 주기 납부

10분 단위(PERIOD_SECONDS)마다 dueNow()가 true로 바뀜

세입자(또는 자동화 스크립트)가 payRent() 실행

매번 rentPerPeriod → 집주인 송금

마지막 납부 후 active=false, 계약 종료

📌 4. 흐름 다이어그램
[세입자 지갑] --approve(LeaseManager)--> [LIVP 토큰 승인]

(계약 체결)
세입자 → 집주인 : deposit + rent(1회차)
Lease 생성: paidPeriods=1, nextDue=now+600s

(매 10분)
세입자 → 집주인 : rent
Lease 업데이트: paidPeriods++, nextDue += 600s

... 반복 ...
마지막 납부 후 active=false

📌 5. 실행 예시
매물 등록
await reg.connect(landlord).createListing(
  LIVP, 
  ethers.parseEther("100"), // deposit
  ethers.parseEther("10"),  // rentPerPeriod
  4n,                       // totalPeriods (10분 × 4회)
  BigInt(Date.now()/1000)   // 시작 시각
);

계약 체결
await token.connect(tenant).approve(MAN, ethers.MaxUint256);
await man.connect(tenant).joinLease(listingId);

임대료 납부
if (await man.dueNow(leaseId)) {
  await man.connect(tenant).payRent(leaseId);
}

📌 6. 주의 사항

세입자 지갑에는 충분한 LIVP 필요

allowance 부족 → 계약 실패

dueNow 체크 없이 payRent 호출 → revert 발생

컨트랙트는 토큰을 보관하지 않고 직접 세입자 → 집주인 송금 (보안 강화)

👉 이 README만 보고도 초보자가 바로 테스트 가능하게 구성했습니다.

원해? 내가 이걸 프로젝트 폴더 최상위에 붙여넣을 수 있는 README.md 파일 형태로 만들어드릴까?