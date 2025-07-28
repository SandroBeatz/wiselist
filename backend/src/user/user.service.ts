import {Injectable, NotFoundException} from '@nestjs/common';
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
        const user = await this.prismaService.user.findUnique({
            where: { id }
        })

        if(!user) {
            throw new NotFoundException(`User with id ${id} not found`);
        }

        return user
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
