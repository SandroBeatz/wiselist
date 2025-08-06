import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListItemDto } from './dto/create-list-item.dto';
import { UpdateListItemDto } from './dto/update-list-item.dto';

@Injectable()
export class ListItemService {
  constructor(private prisma: PrismaService) {}

  async create(createListItemDto: CreateListItemDto, userId: string) {
    // Check if user owns the list
    const list = await this.prisma.list.findUnique({
      where: { id: createListItemDto.listId },
      select: { ownerId: true },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    if (list.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.listItem.create({
      data: createListItemDto,
      include: {
        list: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });
  }

  async findAllByList(listId: string, userId: string) {
    // Check if user owns the list
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      select: { ownerId: true },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    if (list.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.listItem.findMany({
      where: { listId },
      include: {
        list: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const item = await this.prisma.listItem.findUnique({
      where: { id },
      include: {
        list: {
          select: {
            id: true,
            title: true,
            type: true,
            ownerId: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('List item not found');
    }

    if (item.list.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return item;
  }

  async update(
    id: string,
    updateListItemDto: UpdateListItemDto,
    userId: string,
  ) {
    const item = await this.findOne(id, userId);

    // If listId is being changed, check access to the new list
    if (updateListItemDto.listId && updateListItemDto.listId !== item.listId) {
      const newList = await this.prisma.list.findUnique({
        where: { id: updateListItemDto.listId },
        select: { ownerId: true },
      });

      if (!newList) {
        throw new NotFoundException('Target list not found');
      }

      if (newList.ownerId !== userId) {
        throw new ForbiddenException('Access denied to target list');
      }
    }

    return this.prisma.listItem.update({
      where: { id },
      data: updateListItemDto,
      include: {
        list: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.listItem.delete({
      where: { id },
    });

    return { message: 'List item deleted successfully' };
  }
}
