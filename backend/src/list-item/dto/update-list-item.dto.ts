import { PartialType } from '@nestjs/mapped-types';
import { CreateListItemDto } from './create-list-item.dto';
import { IsUUID } from 'class-validator';

export class UpdateListItemDto extends PartialType(CreateListItemDto) {
  @IsUUID()
  listId?: string;
}
