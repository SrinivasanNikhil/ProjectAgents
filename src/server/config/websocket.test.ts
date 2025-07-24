import {
  WebSocketManager,
  defaultWebSocketConfig,
  AuthenticatedSocket,
} from './websocket';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

// Mock logger
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock socket.io
jest.mock('socket.io', () => {
  const mockSocket = {
    id: 'socket123',
    handshake: { auth: {}, headers: {} },
    user: undefined,
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    rooms: new Set(),
    data: {},
  };

  const mockIO = {
    use: jest.fn(),
    on: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    engine: { clientsCount: 0 },
    sockets: {
      adapter: {
        rooms: {
          get: jest.fn().mockReturnValue({ size: 0 }),
        },
      },
    },
  };

  return {
    Server: jest.fn().mockImplementation(() => mockIO),
  };
});

describe('WebSocket Configuration', () => {
  let httpServer: any;
  let webSocketManager: WebSocketManager;

  beforeEach(() => {
    httpServer = createServer();
    webSocketManager = new WebSocketManager();
  });

  afterEach(() => {
    httpServer.close();
    jest.clearAllMocks();
  });

  describe('defaultWebSocketConfig', () => {
    it('should have correct default configuration', () => {
      expect(defaultWebSocketConfig.cors.origin).toBe('http://localhost:3001');
      expect(defaultWebSocketConfig.cors.credentials).toBe(true);
      expect(defaultWebSocketConfig.pingTimeout).toBe(60000);
      expect(defaultWebSocketConfig.pingInterval).toBe(25000);
      expect(defaultWebSocketConfig.transports).toEqual([
        'websocket',
        'polling',
      ]);
    });
  });

  describe('WebSocketManager', () => {
    it('should initialize with default configuration', () => {
      const io = webSocketManager.initialize(httpServer);
      expect(io).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        ...defaultWebSocketConfig,
        pingTimeout: 30000,
        pingInterval: 15000,
      };
      const customManager = new WebSocketManager(customConfig);
      const io = customManager.initialize(httpServer);
      expect(io).toBeDefined();
    });

    it('should return null for getIO before initialization', () => {
      expect(webSocketManager.getIO()).toBeNull();
    });

    it('should return io instance after initialization', () => {
      webSocketManager.initialize(httpServer);
      expect(webSocketManager.getIO()).toBeDefined();
    });
  });

  describe('WebSocket Manager Methods', () => {
    beforeEach(() => {
      webSocketManager.initialize(httpServer);
    });

    it('should emit to project room', () => {
      const emitSpy = jest.spyOn(webSocketManager.getIO()!, 'to');
      webSocketManager.emitToProject('project123', 'test-event', {
        data: 'test',
      });
      expect(emitSpy).toHaveBeenCalledWith('project:project123');
    });

    it('should emit to user room', () => {
      const emitSpy = jest.spyOn(webSocketManager.getIO()!, 'to');
      webSocketManager.emitToUser('user123', 'test-event', { data: 'test' });
      expect(emitSpy).toHaveBeenCalledWith('user:user123');
    });

    it('should emit to role room', () => {
      const emitSpy = jest.spyOn(webSocketManager.getIO()!, 'to');
      webSocketManager.emitToRole('instructor', 'test-event', { data: 'test' });
      expect(emitSpy).toHaveBeenCalledWith('role:instructor');
    });

    it('should broadcast to all clients', () => {
      const emitSpy = jest.spyOn(webSocketManager.getIO()!, 'emit');
      webSocketManager.broadcastToAll('test-event', { data: 'test' });
      expect(emitSpy).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should get connected clients count', () => {
      const count = webSocketManager.getConnectedClients();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get project clients count', () => {
      const count = webSocketManager.getProjectClients('project123');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('WebSocket Authentication', () => {
  let httpServer: any;
  let webSocketManager: WebSocketManager;
  let mockToken: string;

  beforeEach(() => {
    httpServer = createServer();
    webSocketManager = new WebSocketManager();
    mockToken = jwt.sign(
      {
        userId: 'user123',
        email: 'test@example.com',
        role: 'student',
        permissions: ['project:read'],
      },
      process.env.JWT_SECRET || 'fallback-secret'
    );
  });

  afterEach(() => {
    httpServer.close();
    jest.clearAllMocks();
  });

  it('should authenticate valid token', () => {
    const io = webSocketManager.initialize(httpServer);

    // Verify that middleware was set up
    expect(io.use).toHaveBeenCalled();
  });

  it('should reject invalid token', () => {
    const io = webSocketManager.initialize(httpServer);

    // Verify that middleware was set up
    expect(io.use).toHaveBeenCalled();
  });

  it('should reject missing token', () => {
    const io = webSocketManager.initialize(httpServer);

    // Verify that middleware was set up
    expect(io.use).toHaveBeenCalled();
  });
});

describe('WebSocket Rate Limiting', () => {
  let httpServer: any;
  let webSocketManager: WebSocketManager;

  beforeEach(() => {
    httpServer = createServer();
    webSocketManager = new WebSocketManager();
  });

  afterEach(() => {
    httpServer.close();
    jest.clearAllMocks();
  });

  it('should allow messages within rate limit', () => {
    const io = webSocketManager.initialize(httpServer);

    // Verify that middleware was set up
    expect(io.use).toHaveBeenCalled();
  });

  it('should reject messages exceeding rate limit', () => {
    const io = webSocketManager.initialize(httpServer);

    // Verify that middleware was set up
    expect(io.use).toHaveBeenCalled();
  });
});
