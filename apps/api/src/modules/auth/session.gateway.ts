import { Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { SessionService } from './session.service';
import { readCookie, SESSION_COOKIE } from './session-token';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class SessionGateway implements OnGatewayInit {
  private readonly logger = new Logger(SessionGateway.name);

  constructor(private readonly sessions: SessionService) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const token = readCookie(
        socket.handshake.headers.cookie,
        SESSION_COOKIE,
      );
      void this.sessions
        .resolve(token, { rotate: false })
        .then((resolved) => {
          if (!resolved) {
            next(new Error('unauthorized'));
            return;
          }
          socket.data.userId = resolved.user.id;
          next();
        })
        .catch((error: unknown) => {
          this.logger.error('Session handshake failed');
          next(error instanceof Error ? error : new Error('unauthorized'));
        });
    });
  }
}
