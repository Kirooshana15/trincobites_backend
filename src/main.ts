import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Suppress pg driver query deprecation warnings from spamming the console
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning: string | Error, ...args: any[]) => {
  const message = typeof warning === 'string' ? warning : warning.message;
  if (message && message.includes('Calling client.query() when the client is already executing a query')) {
    return;
  }
  return (originalEmitWarning as any)(warning, ...args);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();

  // Global input validation — validates data types and rejects invalid input
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Strip properties with no decorators
      forbidNonWhitelisted: false, // Don't throw error for extra fields — just strip them
      transform: true,            // Auto-convert types (e.g. "123" → 123)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
