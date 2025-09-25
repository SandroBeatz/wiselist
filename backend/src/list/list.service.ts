import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

@Injectable()
export class ListService {
  constructor(private prisma: PrismaService) {}

  async create(createListDto: CreateListDto, userId: string) {
    const list = await this.prisma.list.create({
      data: {
        ...createListDto,
        ownerId: userId,
      },
      include: {
        items: true,
        owner: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    return list;
  }

  async findAll(userId: string) {
    const lists = await this.prisma.list.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        items: true,
        owner: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return lists;
  }

  async findOne(id: string, userId: string) {
    const list = await this.prisma.list.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    if (list.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return list;
  }

  async update(id: string, updateListDto: UpdateListDto, userId: string) {
    await this.findOne(id, userId);

    const updatedList = await this.prisma.list.update({
      where: { id },
      data: updateListDto,
      include: {
        items: true,
        owner: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    return updatedList;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.list.delete({
      where: { id },
    });

    return { message: 'List deleted successfully' };
  }
}
