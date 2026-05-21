import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import logger from 'morgan'
import { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(helmet())
  app.disable('x-powered-by')
  app.set('trust proxy', 'linklocal')

  const IS_DEV = process.env.NODE_ENV ?? 'development' === 'development'
  const LOGGER_FORMAT = IS_DEV ? 'dev' : 'combined'

  const appLogger = new Logger('ApplicationServer')

  app.use(
    logger(LOGGER_FORMAT, {
      stream: {
        write: (str) => {
          appLogger.log(str.trim())
        }
      }
    })
  )

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
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    useGlobalPrefix: true,
  });

  // CORS — allowed origins from env (comma-separated) or permissive in dev
  const RAW_ORIGINS = process.env.CORS_ORIGINS;
  if (!IS_DEV && RAW_ORIGINS) {
    const origins = RAW_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
    app.enableCors({ origin: origins, credentials: true });
  } else {
    // Development fallback: allow any origin
    app.enableCors({ origin: true, credentials: true });
  }

  const APP_PORT = process.env.PORT ?? 3000;
  await app.listen(APP_PORT, async () => {
    const url = await app.getUrl();
    appLogger.log(`Listening on ${url}`);
    appLogger.log(`Swagger docs available at ${url}/api/docs`);
  });
}

bootstrap();
