import { IsString, IsEnum, IsOptional, MinLength, MaxLength, IsInt, IsArray, Min, Max, IsNumber } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  vendor!: string;

  @IsEnum(['NETWORK', 'VIRTUALIZATION', 'STORAGE', 'SECURITY', 'CLOUD'])
  category!: 'NETWORK' | 'VIRTUALIZATION' | 'STORAGE' | 'SECURITY' | 'CLOUD';
}

export class CreateLevelDto {
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsEnum(['QUIZ', 'ORDERING', 'MATCHING', 'TOPOLOGY', 'TERMINAL', 'SCENARIO', 'VM_PLACEMENT', 'FLOW_SIM'])
  type!: 'QUIZ' | 'ORDERING' | 'MATCHING' | 'TOPOLOGY' | 'TERMINAL' | 'SCENARIO' | 'VM_PLACEMENT' | 'FLOW_SIM';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  timeLimitSec?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsNumber()
  positionX?: number;

  @IsOptional()
  @IsNumber()
  positionY?: number;

  @IsOptional()
  content?: unknown;
}
