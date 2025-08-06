import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ListType } from '@prisma/client';

export class CreateListDto {
  @IsString()
  title: string;

  @IsEnum(ListType)
  @IsOptional()
  type?: ListType;
}
