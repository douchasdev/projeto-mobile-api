
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";

import type {
  AuthenticatedRequest,
} from "../auth/guards/jwt-auth.guard.js";

import { ActivitiesService } from "./activities.service.js";

import { CreateActivityDto } from "./dto/create-activity.dto.js";
import { UpdateActivityDto } from "./dto/update-activity.dto.js";
import { UpdateStatusDto } from "./dto/update-status.dto.js";

@Controller("activities")
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
  ) {}

  // ==================================================
  // USUÁRIO AUTENTICADO
  // ==================================================

  private getUserId(
    request: AuthenticatedRequest,
  ): string {
    if (!request.user) {
      throw new UnauthorizedException(
        "Usuário não autenticado.",
      );
    }

    return request.user.id;
  }

  // ==================================================
  // GET /activities
  // ==================================================

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(request);

    return this.activitiesService.findAll(
      userId,
    );
  }

  // ==================================================
  // GET /activities/my
  // ==================================================

  @Get("my")
  findMine(
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(request);

    return this.activitiesService.findMine(
      userId,
    );
  }

  // ==================================================
  // POST /activities
  // ==================================================

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateActivityDto,
  ) {
    const userId = this.getUserId(request);

    return this.activitiesService.create(
      userId,
      dto,
    );
  }

  // ==================================================
  // PATCH /activities/:id
  // ==================================================

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateActivityDto,
  ) {
    const userId = this.getUserId(request);

    return this.activitiesService.update(
      id,
      userId,
      dto,
    );
  }

  // ==================================================
  // PATCH /activities/:id/status
  // ==================================================

  @Patch(":id/status")
  updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateStatusDto,
  ) {
    const userId = this.getUserId(request);

    return this.activitiesService.updateStatus(
      id,
      userId,
      dto,
    );
  }

  // ==================================================
  // DELETE /activities/:id
  // ==================================================

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = this.getUserId(request);

    await this.activitiesService.remove(
      id,
      userId,
    );
  }

  // ==================================================
  // POST /activities/:id/interests
  // ==================================================

  @Post(":id/interests")
  @HttpCode(HttpStatus.OK)
  addInterest(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(request);

    return this.activitiesService.addInterest(
      id,
      userId,
    );
  }

  // ==================================================
  // DELETE /activities/:id/interests/me
  // ==================================================

  @Delete(":id/interests/me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeInterest(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = this.getUserId(request);

    await this.activitiesService.removeInterest(
      id,
      userId,
    );
  }
}
