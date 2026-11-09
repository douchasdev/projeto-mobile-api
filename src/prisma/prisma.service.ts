
import "dotenv/config";

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL não definida. Verifique o arquivo .env."
      );
    }

    const url = new URL(databaseUrl);

    if (url.protocol !== "mysql:") {
      throw new Error(
        "A DATABASE_URL deve utilizar o protocolo mysql."
      );
    }

    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      connectionLimit: 5,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();

    // Verifica se o banco aceita consultas.
    await this.$queryRaw`SELECT 1`;

    this.logger.log(
      "Conexão com MySQL estabelecida com sucesso."
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();

    this.logger.log(
      "Conexão com MySQL encerrada."
    );
  }
}
