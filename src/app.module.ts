
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";

import { PrismaModule } from "./prisma/prisma.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { ActivitiesModule } from "./activities/activities.module.js";

@Module({
  imports: [
    // Variáveis de ambiente do backend.
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Integração com Prisma e MySQL.
    PrismaModule,

    // Cadastro, login e autenticação JWT.
    AuthModule,

    // CRUD de atividades.
    ActivitiesModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}
