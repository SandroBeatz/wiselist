import {IsEmail, IsNotEmpty, IsString} from "class-validator";

export class GoogleUserDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsString()
    picture: string;
}
