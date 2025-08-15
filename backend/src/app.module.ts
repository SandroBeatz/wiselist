import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { ProfileModule } from './profile/profile.module';
import { ListModule } from './list/list.module';
import { ListItemModule } from './list-item/list-item.module';
import {APP_INTERCEPTOR} from "@nestjs/core";
import {DelayInterceptor} from "./delay.interceptor";

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    ProfileModule,
    ListModule,
    ListItemModule,
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_INTERCEPTOR,
    useValue: new DelayInterceptor(0)
  }],
})
export class AppModule {}
