
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../../users/users.service.js";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException(
        "Token de autenticação não informado.",
      );
    }

    const [type, token, ...extra] =
      authorization.split(" ");

    if (
      type !== "Bearer" ||
      !token ||
      extra.length > 0
    ) {
      throw new UnauthorizedException(
        "Formato do token inválido.",
      );
    }

    try {
      // Valida assinatura e expiração do JWT.
      const payload =
        await this.jwtService.verifyAsync<{
          sub: string;
        }>(token);

      if (
        !payload ||
        typeof payload.sub !== "string"
      ) {
        throw new UnauthorizedException();
      }

      // Confere se o usuário ainda existe.
      const user =
        await this.usersService.findPublicById(
          payload.sub,
        );

      if (!user) {
        throw new UnauthorizedException();
      }

      // Disponibiliza o usuário autenticado à rota.
      request.user = user;

      return true;
    } catch {
      throw new UnauthorizedException(
        "Token inválido ou expirado.",
      );
    }
  }
}
