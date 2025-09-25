import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:5173',
      'http://localhost:8100',
    ],
    credentials: true,
  });

  await app.listen(3000);
}

bootstrap();
