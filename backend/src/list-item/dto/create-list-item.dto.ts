import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateListItemDto {
  @IsUUID()
  listId: string;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  checked?: boolean;
}
