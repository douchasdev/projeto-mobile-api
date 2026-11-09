
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
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

type ActivityChanges = {
  title?: string;
  description?: string | null;
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
  async create(
    userId: string,
    dto: CreateActivityDto,
  ) {
    return this.prisma.activity.create({
      data: {
        title: dto.title,
        description: dto.description?.trim() || null,
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

  // Verifica se a atividade existe e pertence
  // ao usuário autenticado.
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

  // PATCH /activities/:id/status
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
  }
}
