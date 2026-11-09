
import { Transform } from "class-transformer";

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) =>
    typeof value === "string"
      ? value.trim().toLowerCase()
      : value
  )
  @IsEmail()
  @MaxLength(191)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: "A senha não pode conter apenas espaços.",
  })
  password!: string;
}
