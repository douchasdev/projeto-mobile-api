
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

import { CreateActivityDto } from "./dto/create-activity.dto.js";
import { UpdateActivityDto } from "./dto/update-activity.dto.js";
import { UpdateStatusDto } from "./dto/update-status.dto.js";

// Campos que serão retornados nas respostas da API.
// Não expomos e-mail ou senha do autor.
const activitySelect = {
  id: true,
  title: true,
  scheduledAt: true,
  location: true,
  completed: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

// Campos permitidos em uma atualização.
type ActivityChanges = {
  title?: string;
  scheduledAt?: Date;
  location?: string;
  completed?: boolean;
};

function isRecordNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // GET /activities
  // Consulta todas as atividades cadastradas.
  async findAll() {
    return this.prisma.activity.findMany({
      orderBy: [
        { scheduledAt: "asc" },
        { createdAt: "desc" },
      ],
      select: activitySelect,
    });
  }

  // GET /activities/my
  // Consulta as atividades do usuário autenticado.
  async findMine(userId: string) {
    return this.prisma.activity.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: [
        { scheduledAt: "asc" },
        { createdAt: "desc" },
      ],
      select: activitySelect,
    });
  }

  // POST /activities
  // Cria uma atividade vinculada ao usuário autenticado.
  async create(
    userId: string,
    dto: CreateActivityDto,
  ) {
    return this.prisma.activity.create({
      data: {
        title: dto.title,
        scheduledAt: new Date(dto.scheduledAt),
        location: dto.location,
        completed: false,
        owner: {
          connect: {
            id: userId,
          },
        },
      },
      select: activitySelect,
    });
  }

  // Confere se a atividade existe e pertence ao usuário.
  private async ensureOwnership(
    activityId: string,
    userId: string,
  ) {
    const activity =
      await this.prisma.activity.findUnique({
        where: {
          id: activityId,
        },
        select: {
          id: true,
          ownerId: true,
        },
      });

    if (!activity) {
      throw new NotFoundException(
        "Atividade não encontrada.",
      );
    }

    if (activity.ownerId !== userId) {
      throw new ForbiddenException(
        "Você não tem permissão para modificar esta atividade.",
      );
    }
  }

  // Aplica uma atualização somente se a atividade
  // continuar pertencendo ao usuário.
  private async updateOwnedActivity(
    activityId: string,
    userId: string,
    changes: ActivityChanges,
  ) {
    await this.ensureOwnership(activityId, userId);

    try {
      return await this.prisma.activity.update({
        where: {
          id: activityId,
          ownerId: userId,
        },
        data: changes,
        select: activitySelect,
      });
    } catch (error: unknown) {
      if (isRecordNotFound(error)) {
        throw new NotFoundException(
          "Atividade não encontrada.",
        );
      }

      throw error;
    }
  }

  // PATCH /activities/:id
  // Edita os dados permitidos de uma atividade própria.
  async update(
    activityId: string,
    userId: string,
    dto: UpdateActivityDto,
  ) {
    const changes: ActivityChanges = {};

    if (dto.title !== undefined) {
      changes.title = dto.title;
    }

    if (dto.location !== undefined) {
      changes.location = dto.location;
    }

    if (dto.scheduledAt !== undefined) {
      changes.scheduledAt =
        new Date(dto.scheduledAt);
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException(
        "Informe pelo menos um campo para atualizar.",
      );
    }

    return this.updateOwnedActivity(
      activityId,
      userId,
      changes,
    );
  }

  // PATCH /activities/:id/status
  // Altera o status de uma atividade própria.
  async updateStatus(
    activityId: string,
    userId: string,
    dto: UpdateStatusDto,
  ) {
    return this.updateOwnedActivity(
      activityId,
      userId,
      {
        completed: dto.completed,
      },
    );
  }

  // DELETE /activities/:id
  // Exclui uma atividade própria.
  async remove(
    activityId: string,
    userId: string,
  ): Promise<void> {
    await this.ensureOwnership(
      activityId,
      userId,
    );

    // A exclusão também verifica o proprietário,
    // evitando remover registros de outros usuários.
    const result =
      await this.prisma.activity.deleteMany({
        where: {
          id: activityId,
          ownerId: userId,
        },
      });

    if (result.count === 0) {
      throw new NotFoundException(
        "Atividade não encontrada.",
      );
    }
  }
}
