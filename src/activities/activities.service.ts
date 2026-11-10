
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

import { CreateActivityDto } from "./dto/create-activity.dto.js";
import { UpdateActivityDto } from "./dto/update-activity.dto.js";
import { UpdateStatusDto } from "./dto/update-status.dto.js";

// ==================================================
// CAMPOS RETORNADOS PELA API
// ==================================================

const activitySelect = {
  id: true,
  title: true,
  description: true,
  scheduledAt: true,
  location: true,
  completed: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,

  // Identificação do criador da atividade.
  owner: {
    select: {
      id: true,
      name: true,
    },
  },

  // Usuários que demonstraram interesse.
  interests: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

// ==================================================
// TIPOS AUXILIARES
// ==================================================

type ActivityChanges = {
  title?: string;
  description?: string | null;
  scheduledAt?: Date;
  location?: string;
  completed?: boolean;
};

type ActivityWithDetails = {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  location: string;
  completed: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;

  owner: {
    id: string;
    name: string;
  };

  interests: {
    createdAt: Date;
    user: {
      id: string;
      name: string;
    };
  }[];
};

// Verifica códigos de erro do Prisma.
function isPrismaError(
  error: unknown,
  code: string,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function isRecordNotFound(error: unknown): boolean {
  return isPrismaError(error, "P2025");
}

// Formata a resposta para o frontend.
// Não expõe email, senha ou dados internos do User.
function formatActivity(
  activity: ActivityWithDetails,
  currentUserId: string,
) {
  const {
    interests,
    ...activityData
  } = activity;

  const interestedUsers = interests.map(
    (interest) => ({
      id: interest.user.id,
      name: interest.user.name,
    }),
  );

  return {
    ...activityData,

    interestCount: interestedUsers.length,

    interestedUsers,

    // Informa se o usuário autenticado
    // já demonstrou interesse.
    hasInterest: interestedUsers.some(
      (user) => user.id === currentUserId,
    ),
  };
}

// ==================================================
// SERVICE
// ==================================================

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==================================================
  // GET /activities
  // ==================================================

  async findAll(currentUserId: string) {
    const activities =
      await this.prisma.activity.findMany({
        orderBy: [
          { scheduledAt: "asc" },
          { createdAt: "desc" },
        ],
        select: activitySelect,
      });

    return activities.map((activity) =>
      formatActivity(activity, currentUserId),
    );
  }

  // ==================================================
  // GET /activities/my
  // ==================================================

  async findMine(currentUserId: string) {
    const activities =
      await this.prisma.activity.findMany({
        where: {
          ownerId: currentUserId,
        },
        orderBy: [
          { scheduledAt: "asc" },
          { createdAt: "desc" },
        ],
        select: activitySelect,
      });

    return activities.map((activity) =>
      formatActivity(activity, currentUserId),
    );
  }

  // ==================================================
  // CONSULTAR ATIVIDADE POR ID
  // ==================================================

  private async findActivityById(
    activityId: string,
    currentUserId: string,
  ) {
    const activity =
      await this.prisma.activity.findUnique({
        where: {
          id: activityId,
        },
        select: activitySelect,
      });

    if (!activity) {
      throw new NotFoundException(
        "Atividade não encontrada.",
      );
    }

    return formatActivity(
      activity,
      currentUserId,
    );
  }

  // ==================================================
  // POST /activities
  // ==================================================

  async create(
    userId: string,
    dto: CreateActivityDto,
  ) {
    const activity =
      await this.prisma.activity.create({
        data: {
          title: dto.title,
          description:
            dto.description?.trim() || null,

          scheduledAt: new Date(
            dto.scheduledAt,
          ),

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

    return formatActivity(activity, userId);
  }

  // ==================================================
  // VERIFICAÇÃO DE PROPRIEDADE
  // ==================================================

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

  // ==================================================
  // ATUALIZAÇÃO DE ATIVIDADE
  // ==================================================

  private async updateOwnedActivity(
    activityId: string,
    userId: string,
    changes: ActivityChanges,
  ) {
    await this.ensureOwnership(
      activityId,
      userId,
    );

    try {
      const activity =
        await this.prisma.activity.update({
          where: {
            id: activityId,
            ownerId: userId,
          },
          data: changes,
          select: activitySelect,
        });

      return formatActivity(
        activity,
        userId,
      );
    } catch (error: unknown) {
      if (isRecordNotFound(error)) {
        throw new NotFoundException(
          "Atividade não encontrada.",
        );
      }

      throw error;
    }
  }

  // ==================================================
  // PATCH /activities/:id
  // ==================================================

  async update(
    activityId: string,
    userId: string,
    dto: UpdateActivityDto,
  ) {
    const changes: ActivityChanges = {};

    if (dto.title !== undefined) {
      changes.title = dto.title;
    }

    if (dto.description !== undefined) {
      changes.description =
        dto.description.trim() || null;
    }

    if (dto.scheduledAt !== undefined) {
      changes.scheduledAt =
        new Date(dto.scheduledAt);
    }

    if (dto.location !== undefined) {
      changes.location = dto.location;
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

  // ==================================================
  // PATCH /activities/:id/status
  // ==================================================

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

  // ==================================================
  // DELETE /activities/:id
  // ==================================================

  async remove(
    activityId: string,
    userId: string,
  ): Promise<void> {
    await this.ensureOwnership(
      activityId,
      userId,
    );

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

    // Os registros ActivityInterest associados
    // são removidos pelo ON DELETE CASCADE
    // definido no schema.prisma.
  }

  // ==================================================
  // POST /activities/:id/interests
  // ==================================================

  async addInterest(
    activityId: string,
    userId: string,
  ) {
    // Verifica se a atividade existe e recupera
    // quem a criou.
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

    // Impede interesse na própria atividade.
    if (activity.ownerId === userId) {
      throw new BadRequestException(
        "Você não pode demonstrar interesse em uma atividade criada por você.",
      );
    }

    try {
      await this.prisma.activityInterest.create({
        data: {
          activityId,
          userId,
        },
      });
    } catch (error: unknown) {
      // A chave primária composta impede
      // interesses duplicados.
      if (isPrismaError(error, "P2002")) {
        throw new ConflictException(
          "Você já demonstrou interesse nesta atividade.",
        );
      }

      // Pode ocorrer se a atividade tiver
      // sido excluída durante a requisição.
      if (
        isPrismaError(error, "P2003") ||
        isRecordNotFound(error)
      ) {
        throw new NotFoundException(
          "Atividade não encontrada.",
        );
      }

      throw error;
    }

    // Retorna o cartão atualizado com
    // a lista de interessados.
    return this.findActivityById(
      activityId,
      userId,
    );
  }

  // ==================================================
  // DELETE /activities/:id/interests/me
  // ==================================================

  async removeInterest(
    activityId: string,
    userId: string,
  ): Promise<void> {
    // Distingue atividade inexistente de
    // interesse inexistente.
    const activity =
      await this.prisma.activity.findUnique({
        where: {
          id: activityId,
        },
        select: {
          id: true,
        },
      });

    if (!activity) {
      throw new NotFoundException(
        "Atividade não encontrada.",
      );
    }

    // A operação é idempotente:
    // se não havia interesse, o resultado
    // também é ausência de interesse.
    await this.prisma.activityInterest.deleteMany({
      where: {
        activityId,
        userId,
      },
    });
  }
}
