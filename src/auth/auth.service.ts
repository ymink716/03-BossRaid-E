/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from 'src/user/dto/login.dto';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { User } from 'src/user/entities/user.entity';
import { defaultTokenOption } from 'src/common/tokenOption.interface';

/* 
  작성자 : 박신영, 김용민
    - JWT 생성 및 회원 인증 서비스를 구축합니다.
    - 전반적인 코드 리팩토링
*/
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  // 유저가 존재하는지 확인
  async validateUser(payload: LoginDto): Promise<User> {
    const { password, email } = payload;

    const user: User = await this.userService.getUserByEmail(email);
    await this.verifyPassword(password, user.password);

    return user;
  }

  // 비밀번호가 일치하는지 확인
  async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<void> {
    const isPasswordMatched = await compare(plainPassword, hashedPassword);

    if (!isPasswordMatched) {
      throw new BadRequestException('잘못된 비밀번호입니다.');
    }
  }

  // 로그인 시 필요한 access token과 refresh 토큰을 가져옴
  async getTokens(email: string) {
    const { accessToken, accessOption } = await this.getJwtAccessToken(email);
    const { refreshToken, refreshOption } = await this.getJwtRefreshToken(
      email,
    );

    return { accessToken, accessOption, refreshToken, refreshOption };
  }

  // AccessToken 발급
  // accessToken에 비밀번호를 제외한 유저 정보 => payload
  async getJwtAccessToken(email: string) {
    const payload = await this.userService.getUserByEmail(email);
    delete payload.password;

    const accessToken = await this.jwtService.sign(
      { ...payload },
      {
        secret: process.env.JWT_SECRET_KEY,
        expiresIn: process.env.JWT_EXPIRATION_TIME,
      },
    );

    const accessOption = defaultTokenOption;

    return { accessToken, accessOption, ...payload };
  }

  // RefreshToken 발급
  async getJwtRefreshToken(email: string): Promise<any> {
    const payload = { email };
    const refreshToken = await this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_TOKEN_SECRET,
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
    });

    const refreshOption = defaultTokenOption;
    return { refreshToken, refreshOption };
  }

  // 로그아웃 시 초기화한 쿠키 옵션을 전달한다.
  getCookiesForLogOut() {
    const accessOption = { ...defaultTokenOption, maxAge: 0 };
    const refreshOption = { ...defaultTokenOption, maxAge: 0 };
    return { accessOption, refreshOption };
  }
}
