// import { TestingModule } from "@nestjs/testing";
// import { getConnection } from "typeorm";
// import { RaidRecord } from "../entities/raid.entity";
// import { RaidModule } from "../raid.module";
// import { RaidService } from "../raid.service";
// 
// describe('raidService', () => {
//     let raidService: RaidService;
//     let raidRecordRepository: RaidRecord;
//   
//     beforeAll(async () => {
//       const module: TestingModule = await Test.createTestingModule({
//         imports: [RaidModule, getTestMysqlModule()],
//         providers: [raidService, UserRepository],
//       }).compile();
//   
//       sut = module.get<UserService>(UserService);
//       userRepository = module.get<UserRepository>(UserRepository);
//     });
//   
//     beforeEach(async () => {
//       await userRepository.clear();
//     });
//   
//     afterAll(async () => {
//       await getConnection().close();
//     });
// 
// function getTestMysqlModule() {
//         throw new Error("Function not implemented.");
//     }
