import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大小写字母和数字',
  })
  password!: string;

  @IsString()
  @MinLength(2, { message: '显示名至少2个字符' })
  @MaxLength(50)
  displayName!: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}
