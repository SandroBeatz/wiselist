import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Provider } from '@prisma/client';
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
                name: true,
                avatarUrl: true,
                provider: true,
                googleId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async findByEmailWithPassword(email: string) {
        return this.prismaService.user.findUnique({
            where: { email }
        });
    }

    async findById(id: string) {
        // return this.prisma.user.findUnique({ where: { id } });
        // Mock implementation:
        return {
            id,
            email: 'user@example.com',
            name: 'Test User',
            avatarUrl: 'https://example.com/avatar.jpg',
            provider: 'GOOGLE',
        };
    }

    async create(userData: CreateUserDto) {
        return this.prismaService.user.create({
            data: {
                email: userData.email,
                name: userData.name,
                password: userData.password,
                provider: userData.provider,
                googleId: userData.googleId,
                avatarUrl: userData.avatarUrl,
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                provider: true,
                googleId: true,
                createdAt: true,
                updatedAt: true,
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
