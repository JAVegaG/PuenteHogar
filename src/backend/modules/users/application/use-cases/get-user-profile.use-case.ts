import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import { UserProfileDto } from '@modules/users/application/dtos/user-profile.dto';
import { USER_REPOSITORY } from './register-user.use-case';

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: user.id,
      mail: user.mail,
      roles: user.roles,
      isActive: user.isActive,
    };
  }
}
