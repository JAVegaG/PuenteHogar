import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Plataforma de Arriendo de Vivienda')
    .setDescription(
      'API REST para la gestión del ciclo completo de arriendo de vivienda urbana en Colombia (Valle del Cauca). ' +
      'Incluye publicación de inmuebles, formalización contractual con firma electrónica y gestión de pagos.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('auth', 'Registro, autenticación y tipos de documento')
    .addTag('listings', 'Publicación y exploración de inmuebles')
    .addTag('portfolio', 'Gestión del portafolio del arrendador')
    .addTag('contracts', 'Contratos y firma digital')
    .addTag('payments', 'Pagos del canon de arrendamiento')
    .addTag('accounting', 'Reportes contables')
    .addTag('tracking', 'Seguimiento del ciclo de arriendo')
    .addTag('notifications', 'Preferencias de notificación')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // CORS — allowed origins from env (comma-separated) or permissive in dev
  const rawOrigins = process.env.CORS_ORIGINS;
  if (rawOrigins) {
    const origins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
    app.enableCors({ origin: origins, credentials: true });
  } else {
    // Development fallback: allow any origin
    app.enableCors({ origin: true, credentials: true });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
