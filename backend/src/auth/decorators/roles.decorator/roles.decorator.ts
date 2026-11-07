import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  LEARNER = 'LEARNER',
  MENTOR = 'MENTOR',
}

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_KEY, roles);