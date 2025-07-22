import mongoose from 'mongoose';
import { logger } from './logger';

export interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
  };
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;
  private connectionPromise: Promise<typeof mongoose> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(config: DatabaseConfig): Promise<typeof mongoose> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return mongoose;
    }

    if (this.connectionPromise) {
      logger.info('Database connection already in progress');
      return this.connectionPromise;
    }

    this.connectionPromise = this.createConnection(config);
    return this.connectionPromise;
  }

  private async createConnection(
    config: DatabaseConfig
  ): Promise<typeof mongoose> {
    try {
      logger.info('Connecting to MongoDB...');

      // Set mongoose options
      mongoose.set('strictQuery', false);
      mongoose.set('debug', process.env.NODE_ENV === 'development');

      // Connect to MongoDB
      await mongoose.connect(config.uri, config.options);

      this.isConnected = true;
      logger.info('Successfully connected to MongoDB');

      // Set up connection event handlers
      this.setupEventHandlers();

      return mongoose;
    } catch (error) {
      this.connectionPromise = null;
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    const db = mongoose.connection;

    db.on('connected', () => {
      logger.info('MongoDB connection established');
      this.isConnected = true;
    });

    db.on('error', error => {
      logger.error('MongoDB connection error:', error);
      this.isConnected = false;
    });

    db.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
      this.isConnected = false;
    });

    db.on('reconnected', () => {
      logger.info('MongoDB connection reestablished');
      this.isConnected = true;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      logger.info('Database not connected');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      this.connectionPromise = null;
      logger.info('Successfully disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      // Ping the database
      const db = mongoose.connection.db;
      if (db) {
        await db.admin().ping();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  public getConnectionInfo() {
    const db = mongoose.connection;
    return {
      host: db.host,
      port: db.port,
      name: db.name,
      readyState: db.readyState,
      isConnected: this.isConnected,
    };
  }
}

// Create default configuration
export const getDatabaseConfig = (): DatabaseConfig => {
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
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000'),
    },
  };
};

// Export singleton instance
export const databaseConnection = DatabaseConnection.getInstance();

// Export convenience functions
export const connectDatabase = async (): Promise<typeof mongoose> => {
  const config = getDatabaseConfig();
  return databaseConnection.connect(config);
};

export const disconnectDatabase = async (): Promise<void> => {
  return databaseConnection.disconnect();
};

export const getDatabaseStatus = (): boolean => {
  return databaseConnection.getConnectionStatus();
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  return databaseConnection.healthCheck();
};

export const getDatabaseInfo = () => {
  return databaseConnection.getConnectionInfo();
};
