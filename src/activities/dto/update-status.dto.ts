
import {
  IsBoolean,
  IsDefined,
} from "class-validator";

export class UpdateStatusDto {
  @IsDefined()
  @IsBoolean()
  completed!: boolean;
}
