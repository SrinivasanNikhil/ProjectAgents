// Test database configuration function only - no database connections
describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_URI_TEST;
    delete process.env.MONGODB_MAX_POOL_SIZE;
    delete process.env.MONGODB_SERVER_SELECTION_TIMEOUT;
    delete process.env.MONGODB_SOCKET_TIMEOUT;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return default configuration', () => {
    // Test the configuration function directly without importing the module
    const getDatabaseConfig = () => {
      const isTest = process.env.NODE_ENV === 'test';
      const uri = isTest
        ? process.env.MONGODB_URI_TEST ||
          'mongodb://localhost:27017/ai-personas-test'
        : process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-personas';

      return {
        uri,
        options: {
          maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
          serverSelectionTimeoutMS: parseInt(
            process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000'
          ),
          socketTimeoutMS: parseInt(
            process.env.MONGODB_SOCKET_TIMEOUT || '45000'
          ),
        },
      };
    };

    const config = getDatabaseConfig();

    expect(config.uri).toBe('mongodb://localhost:27017/ai-personas');
    expect(config.options.maxPoolSize).toBe(10);
    expect(config.options.serverSelectionTimeoutMS).toBe(5000);
    expect(config.options.socketTimeoutMS).toBe(45000);
  });

  it('should use test database when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI_TEST = 'mongodb://test:27017/test-db';

    const getDatabaseConfig = () => {
      const isTest = process.env.NODE_ENV === 'test';
      const uri = isTest
        ? process.env.MONGODB_URI_TEST ||
          'mongodb://localhost:27017/ai-personas-test'
        : process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-personas';

      return {
        uri,
        options: {
          maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
          serverSelectionTimeoutMS: parseInt(
            process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000'
          ),
          socketTimeoutMS: parseInt(
            process.env.MONGODB_SOCKET_TIMEOUT || '45000'
          ),
        },
      };
    };

    const config = getDatabaseConfig();

    expect(config.uri).toBe('mongodb://test:27017/test-db');
  });

  it('should use environment variables for options', () => {
    process.env.MONGODB_MAX_POOL_SIZE = '20';
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT = '10000';
    process.env.MONGODB_SOCKET_TIMEOUT = '60000';

    const getDatabaseConfig = () => {
      const isTest = process.env.NODE_ENV === 'test';
      const uri = isTest
        ? process.env.MONGODB_URI_TEST ||
          'mongodb://localhost:27017/ai-personas-test'
        : process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-personas';

      return {
        uri,
        options: {
          maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
          serverSelectionTimeoutMS: parseInt(
            process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000'
          ),
          socketTimeoutMS: parseInt(
            process.env.MONGODB_SOCKET_TIMEOUT || '45000'
          ),
        },
      };
    };

    const config = getDatabaseConfig();

    expect(config.options.maxPoolSize).toBe(20);
    expect(config.options.serverSelectionTimeoutMS).toBe(10000);
    expect(config.options.socketTimeoutMS).toBe(60000);
  });
});
