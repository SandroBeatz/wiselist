import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import type { Request } from 'express';

export const AuthorisedUser = createParamDecorator(
    (data: keyof User, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest() as Request
        return data ? request.user[data] :  request.user;
    },
);
