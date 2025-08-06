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
import { ListService } from './list.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorisedUser } from '../auth/decorators/authorised-user.decorator';

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Post()
  create(
    @Body() createListDto: CreateListDto,
    @AuthorisedUser('id') userId: string,
  ) {
    return this.listService.create(createListDto, userId);
  }

  @Get()
  findAll(@AuthorisedUser('id') userId: string) {
    return this.listService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @AuthorisedUser('id') userId: string) {
    return this.listService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateListDto: UpdateListDto,
    @AuthorisedUser('id') userId: string,
  ) {
    return this.listService.update(id, updateListDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @AuthorisedUser('id') userId: string) {
    return this.listService.remove(id, userId);
  }
}
