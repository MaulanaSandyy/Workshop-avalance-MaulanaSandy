import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Simple Storage dApps API')
    .setDescription(`
      Nama Lengkap  : Maulana Sandy
      NIM           : 221011400282
      Backend API untuk membaca data dan event smart contract
      Simple Storage di Avalanche Fuji Testnet.
    `)
    .setVersion('1.0')
    .addTag('simple-storage')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('documentation', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error) => {
  console.error('error during application bootstrap:', error);
  process.exit(1);
});
