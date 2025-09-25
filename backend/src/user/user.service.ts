import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        googleId: true,
        provider: true,
        profile: true,
      },
    });
  }

  async findByEmailWithPassword(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            avatar: true,
            fullName: true,
            notificationsEnabled: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async create(userData: CreateUserDto) {
    return this.prismaService.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        provider: userData.provider,
        googleId: userData.googleId,
        profile: {
          create: {
            avatar: userData.avatarUrl,
            fullName: userData.name,
            notificationsEnabled: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        profile: true,
      },
    });
  }

  async update(id: string, userData: any) {
    // return this.prisma.user.update({ where: { id }, data: userData });
    // Mock implementation:
    return {
      id,
      ...userData,
      updatedAt: new Date(),
    };
  }
}
