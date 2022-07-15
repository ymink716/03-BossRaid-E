# 3주차-BossRaid-project 💫
## Redis를 이용한 실시간 게임 참여 및 랭킹 조회 API 개발

**프로젝트 개요** ) 

- 🤔 서비스 분석 
- 서비스 구현 과정

**팀원**
| 이름 | Github | email | blog |
| --- | --- | --- | --- |
| 염하늘 | [everchloe97](https://github.com/everchloe97) | star57009@khu.ac.kr |https://velog.io/@everchloe97 |
| 김용민 | [ymink716](https://github.com/ymink716) | ymink716@gmail.com | https://velog.io/@calm0_0 |
| 김태영 | [leokim1178](https://github.com/leokim1178) | leo950906@gmail.com | https://story0tae.tistory.com/ |
| 박신영 | [ParkShinyeong](https://github.com/ParkShinyeong) | syngh503@gmail.com | [신영의 notion](https://sudsy-action-667.notion.site/5ed77b24085f42b8bd1c9e5c0b37d25d) |
| 김지유 | [kgeeeu](https://github.com/scvgood287) | kgeeeu@gmail.com | https://velog.io/@kgeeeu |

**ENV** 💡 
  ```
    DB_HOST=database-server
    DB_PORT=3308
    DB_USERNAME=root
    DB_PASSWORD=2222
    DB_DATABASE=boss-raid
    JWT_SECRET_KEY= ??
    JWT_EXPIRATION_TIME=1h  (ex / 1h 형식으로 작성합니다.)
    JWT_REFRESH_TOKEN_SECRET= ??
    JWT_REFRESH_TOKEN_EXPIRATION_TIME=10h  (ex / 1h 형식으로 작성합니다.)
    SENTRY_DSN= ??
    NODE_ENV=dev
    STATIC_DATA_URL= ??
    REDIS_PORT=6379
    REDIS_HOST=redis-server
    REDIS_URL= ??
  ```
<br>

**프로젝트 실행 및 테스트)**

1. 실행 방법 💡
  ```
  cd 03-BossRaid-E /
  docker compose build
  docker compose up
  ```
2. 테스트 방법 💡
  ```
  yarn test
  ```
3. Swagger 테스트 방법 💡 
  ```
  1. swagger (api 문서)
    - localhost:3000/api/docs 접속 - local
    - 배포 ip /접속 - 배포
  2. sign up을 통해 user를 생성하고 login 후 api를 테스트 할 수 있습니다.
  ```
  <br><br/>
움짤 넣기?
<br><br/>

**핵심 기능**

- __User (사용자)__ 🙍‍♀️🙍‍♂️
  - 회원가입 
  - 로그인 
  - 로그아웃
  - 토큰 재발급
- __ (가계부)__ 💰📝
  - 가계부 작성 
  - 가계부 수정 
  - 가계부 목록 조회
  - 가계부 상세 조회 
  - 가계부 삭제  
  - 삭제된 가계부 내역 복구

  <br><br/>

**기술 스택** 

<img src="https://img.shields.io/badge/Typescript-3178C6?style=flat&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white"/>
<img src="https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white"/>
<img src="https://img.shields.io/badge/NodeJS-339933?style=flat&logo=nodejs&logoColor=white"/>
<img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white"/>
<img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white"/>

<br><br/>

**기타**

- [ERD](https://user-images.githubusercontent.com/57704568/179157151-da97740b-8704-4aa1-87dd-5974e8235f4b.png)


- [Ref. Commit Convention](https://github.com/pre-onboarding-backend-E/03-BossRaid-E/wiki/Commit-Convention)
