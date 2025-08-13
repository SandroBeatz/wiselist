import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ListItemService } from './list-item.service';
import { CreateListItemDto } from './dto/create-list-item.dto';
import { UpdateListItemDto } from './dto/update-list-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorisedUser } from '../auth/decorators/authorised-user.decorator';

@Controller('api/list-items')
@UseGuards(JwtAuthGuard)
export class ListItemController {
  constructor(private readonly listItemService: ListItemService) {}

  @Post()
  create(
    @Body() createListItemDto: CreateListItemDto,
    @AuthorisedUser('id') userId: string,
  ) {
    return this.listItemService.create(createListItemDto, userId);
  }

  @Get('by-list/:listId')
  findAllByList(
    @Param('listId') listId: string,
    @AuthorisedUser('id') userId: string,
  ) {
    return this.listItemService.findAllByList(listId, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @AuthorisedUser('id') userId: string) {
    return this.listItemService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateListItemDto: UpdateListItemDto,
    @AuthorisedUser('id') userId: string,
  ) {
    return this.listItemService.update(id, updateListItemDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @AuthorisedUser('id') userId: string) {
    return this.listItemService.remove(id, userId);
  }
}
