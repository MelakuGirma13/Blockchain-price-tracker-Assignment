import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userSvc: UserService) {}

  @Post('createUser')
  async createUser(@Body() body: any) {
    return this.userSvc.createUser(body);
  }
}
