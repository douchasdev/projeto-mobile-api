
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";

import { UsersModule } from "../users/users.module.js";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";

@Module({
  imports: [
    UsersModule,

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 5,
        },
      ],
    }),

    JwtModule.registerAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>("JWT_SECRET");

        if (
          !secret ||
          Buffer.byteLength(secret, "utf8") < 32
        ) {
          throw new Error(
            "JWT_SECRET deve estar configurada com pelo menos 32 bytes.",
          );
        }

        return {
          secret,

          signOptions: {
            expiresIn: "1h",
            issuer: "projeto-mobile-api",
          },

          verifyOptions: {
            issuer: "projeto-mobile-api",
          },
        };
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtAuthGuard,
  ],

  exports: [
    AuthService,
    JwtAuthGuard,

    // Permite que outros módulos utilizem JwtService.
    JwtModule,

    // Disponibiliza UsersService aos módulos
    // que importarem AuthModule.
    UsersModule,
  ],
})
export class AuthModule {}
