import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 인증을 시작하는 가드
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
