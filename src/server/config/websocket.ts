import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  transports: ('websocket' | 'polling')[];
}

export const defaultWebSocketConfig: WebSocketConfig = {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  transports: ['websocket', 'polling'],
};

export class WebSocketManager {
  private io: SocketIOServer | null = null;
  private config: WebSocketConfig;

  constructor(config: WebSocketConfig = defaultWebSocketConfig) {
    this.config = config;
  }

  public initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: this.config.cors,
      pingTimeout: this.config.pingTimeout,
      pingInterval: this.config.pingInterval,
      transports: this.config.transports,
      allowEIO3: true,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('WebSocket server initialized');
    return this.io;
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'fallback-secret'
        ) as any;
        socket.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
        };

        logger.info(
          `WebSocket authenticated: ${socket.user.email} (${socket.user.role})`
        );
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      // Simple rate limiting - can be enhanced with Redis
      const clientId = socket.user?.id || socket.id;
      const now = Date.now();

      if (!socket.data.lastMessageTime) {
        socket.data.lastMessageTime = now;
        socket.data.messageCount = 0;
      }

      // Reset counter if more than 1 minute has passed
      if (now - socket.data.lastMessageTime > 60000) {
        socket.data.messageCount = 0;
        socket.data.lastMessageTime = now;
      }

      // Allow max 100 messages per minute
      if (socket.data.messageCount >= 100) {
        return next(new Error('Rate limit exceeded'));
      }

      socket.data.messageCount++;
      next();
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(
        `Client connected: ${socket.user?.email || 'unknown'} (${socket.id})`
      );

      // Join user to their personal room
      if (socket.user) {
        socket.join(`user:${socket.user.id}`);
        socket.join(`role:${socket.user.role}`);
      }

      // Handle project room joins
      socket.on('join-project', (projectId: string) => {
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        socket.join(`project:${projectId}`);
        logger.info(
          `User ${socket.user.email} joined project room: ${projectId}`
        );
        socket.emit('joined-project', { projectId });
      });

      // Handle project room leaves
      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project:${projectId}`);
        logger.info(
          `User ${socket.user?.email || 'unknown'} left project room: ${projectId}`
        );
        socket.emit('left-project', { projectId });
      });

      // Handle chat messages
      socket.on(
        'chat-message',
        (data: { projectId: string; message: string; type?: string }) => {
          if (!socket.user) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }

          const messageData = {
            ...data,
            userId: socket.user.id,
            userEmail: socket.user.email,
            userRole: socket.user.role,
            timestamp: new Date().toISOString(),
          };

          // Broadcast to project room
          socket
            .to(`project:${data.projectId}`)
            .emit('chat-message', messageData);

          // Send confirmation back to sender
          socket.emit('message-sent', {
            id: Date.now().toString(),
            ...messageData,
          });

          logger.info(
            `Chat message in project ${data.projectId}: ${socket.user.email}`
          );
        }
      );

      // Handle typing indicators
      socket.on('typing-start', (data: { projectId: string }) => {
        if (!socket.user) return;

        socket.to(`project:${data.projectId}`).emit('user-typing', {
          userId: socket.user.id,
          userEmail: socket.user.email,
          projectId: data.projectId,
        });
      });

      socket.on('typing-stop', (data: { projectId: string }) => {
        if (!socket.user) return;

        socket.to(`project:${data.projectId}`).emit('user-stopped-typing', {
          userId: socket.user.id,
          userEmail: socket.user.email,
          projectId: data.projectId,
        });
      });

      // Handle presence updates
      socket.on(
        'presence-update',
        (data: {
          projectId: string;
          status: 'online' | 'away' | 'offline';
        }) => {
          if (!socket.user) return;

          socket.to(`project:${data.projectId}`).emit('user-presence', {
            userId: socket.user.id,
            userEmail: socket.user.email,
            status: data.status,
            projectId: data.projectId,
            timestamp: new Date().toISOString(),
          });
        }
      );

      // Handle disconnection
      socket.on('disconnect', reason => {
        logger.info(
          `Client disconnected: ${socket.user?.email || 'unknown'} (${socket.id}) - Reason: ${reason}`
        );

        // Notify project rooms about user leaving
        if (socket.user) {
          socket.rooms.forEach(room => {
            if (room.startsWith('project:')) {
              socket.to(room).emit('user-presence', {
                userId: socket.user!.id,
                userEmail: socket.user!.email,
                status: 'offline',
                projectId: room.replace('project:', ''),
                timestamp: new Date().toISOString(),
              });
            }
          });
        }
      });

      // Handle errors
      socket.on('error', error => {
        logger.error(
          `Socket error for ${socket.user?.email || 'unknown'}:`,
          error
        );
      });
    });
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }

  public emitToProject(projectId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`project:${projectId}`).emit(event, data);
    }
  }

  public emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  public emitToRole(role: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`role:${role}`).emit(event, data);
    }
  }

  public broadcastToAll(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  public getConnectedClients(): number {
    return this.io?.engine.clientsCount || 0;
  }

  public getProjectClients(projectId: string): number {
    const room = this.io?.sockets.adapter.rooms.get(`project:${projectId}`);
    return room?.size || 0;
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();
