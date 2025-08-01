import {IsEmail, IsObject, IsString, ValidateNested} from "class-validator";
import {Type} from "class-transformer";

class AccessTokenDto {
    @IsString()
    token: string;
}

class ProfileDto {
    @IsEmail()
    email: string;

    @IsString()
    familyName: string;

    @IsString()
    givenName: string;

    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    imageUrl: string;
}

export class GoogleAuthDto {
    @IsObject()
    @ValidateNested()
    @Type(() => AccessTokenDto)
    accessToken: AccessTokenDto;

    @IsString()
    idToken: string;

    @IsObject()
    @ValidateNested()
    @Type(() => ProfileDto)
    profile: ProfileDto;

    @IsString()
    responseType: string;
}
