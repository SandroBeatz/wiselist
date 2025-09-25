import {
  IsEmail,
  IsString,
  IsOptional,
  IsUrl,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Provider } from '@prisma/client';
import { CreateProfileDto } from '../../profile/dto/create-profile.dto';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEnum(Provider)
  provider: Provider;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile?: CreateProfileDto;
}
