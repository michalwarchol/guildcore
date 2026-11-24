import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../users/user.entity';
import { AuthenticatedRequest } from './session-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.currentUser) {
      throw new Error('CurrentUser requires SessionAuthGuard');
    }
    return request.currentUser;
  },
);
