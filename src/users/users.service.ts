
import {
  ConflictException,
  Injectable,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

type CreateUserData = {
  name: string;
  email: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Busca usuário e hash da senha.
  // Utilizado apenas para autenticação.
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
      },
    });
  }

  // Retorna apenas informações públicas do usuário.
  async findPublicById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Cadastra um novo usuário no MySQL.
  async create(data: CreateUserData) {
    try {
      return await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error: unknown) {
      // Código do Prisma para violação de unicidade.
      // Também protege contra cadastros simultâneos.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Este e-mail já está cadastrado.",
        );
      }

      throw error;
    }
  }
}
