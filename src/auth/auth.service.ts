
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";

import { UsersService } from "../users/users.service.js";

import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Cadastro de usuário.
  async register(dto: RegisterDto) {
    const existingUser =
      await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException(
        "Este e-mail já está cadastrado.",
      );
    }

    // Nunca armazenamos a senha original.
    const passwordHash = await argon2.hash(
      dto.password,
      { type: argon2.argon2id },
    );

    return this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
  }

  // Login com e-mail e senha.
  async login(dto: LoginDto) {
    const user =
      await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException(
        "E-mail ou senha inválidos.",
      );
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException(
        "E-mail ou senha inválidos.",
      );
    }

    // sub identifica o usuário proprietário do token.
    const payload = {
      sub: user.id,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: 3600,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }
}
