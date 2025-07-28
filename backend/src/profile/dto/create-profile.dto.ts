import {IsBoolean, IsOptional, IsString} from "class-validator";

export class CreateProfileDto {
    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsBoolean()
    notificationsEnabled?: boolean;
}
