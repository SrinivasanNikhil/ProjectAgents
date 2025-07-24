import { logger, logSystemHealth, logPerformance } from '../config/logger';
import { connectDatabase } from '../config/database';
import os from 'os';

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  cpu: {
    loadAverage: number[];
    cores: number;
  };
  process: {
    pid: number;
    version: string;
    platform: string;
    arch: string;
  };
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
  };
  requests: {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  timestamp: Date;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: 'healthy' | 'warning' | 'error';
      responseTime?: number;
      message?: string;
    };
    memory: {
      status: 'healthy' | 'warning' | 'error';
      usage: number;
      message?: string;
    };
    disk: {
      status: 'healthy' | 'warning' | 'error';
      usage: number;
      message?: string;
    };
  };
  environment: string;
}

class MonitoringService {
  private startTime: Date;
  private requestCounts: {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
  private metrics: SystemMetrics[];

  constructor() {
    this.startTime = new Date();
    this.requestCounts = {
      total: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
    this.metrics = [];
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = memory - freeMemory;
    const memoryPercentage = (usedMemory / memory) * 100;

    const metrics: SystemMetrics = {
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: {
        total: memory,
        used: usedMemory,
        free: freeMemory,
        percentage: memoryPercentage,
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      database: {
        status: 'disconnected', // Will be updated by health check
      },
      requests: { ...this.requestCounts },
    };

    return metrics;
  }

  /**
   * Record request metrics
   */
  recordRequest(type: 'start' | 'complete' | 'fail') {
    switch (type) {
      case 'start':
        this.requestCounts.total++;
        this.requestCounts.active++;
        break;
      case 'complete':
        this.requestCounts.active--;
        this.requestCounts.completed++;
        break;
      case 'fail':
        this.requestCounts.active--;
        this.requestCounts.failed++;
        break;
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const memoryPercentage =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Check database connection
    let databaseStatus: 'healthy' | 'warning' | 'error' = 'error';
    let databaseResponseTime: number | undefined;
    let databaseMessage: string | undefined;

    try {
      const dbStartTime = Date.now();
      await connectDatabase();
      databaseResponseTime = Date.now() - dbStartTime;

      if (databaseResponseTime < 100) {
        databaseStatus = 'healthy';
      } else if (databaseResponseTime < 500) {
        databaseStatus = 'warning';
        databaseMessage = 'Database response time is slow';
      } else {
        databaseStatus = 'error';
        databaseMessage = 'Database response time is too slow';
      }
    } catch (error) {
      databaseStatus = 'error';
      databaseMessage = 'Database connection failed';
      logger.error('Database health check failed:', error);
    }

    // Check memory usage
    let memoryStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let memoryMessage: string | undefined;

    if (memoryPercentage > 90) {
      memoryStatus = 'error';
      memoryMessage = 'Memory usage is critical';
    } else if (memoryPercentage > 80) {
      memoryStatus = 'warning';
      memoryMessage = 'Memory usage is high';
    }

    // Check disk usage (simplified - in production you'd want more sophisticated disk monitoring)
    const diskStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    const diskUsage = 0; // Placeholder - would implement actual disk monitoring
    const diskMessage: string | undefined = undefined;

    // Determine overall status
    const overallStatus: 'healthy' | 'warning' | 'error' =
      databaseStatus === 'error' || memoryStatus === 'error'
        ? 'error'
        : databaseStatus === 'warning' || memoryStatus === 'warning'
          ? 'warning'
          : 'healthy';

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: {
          status: databaseStatus,
          responseTime: databaseResponseTime,
          message: databaseMessage,
        },
        memory: {
          status: memoryStatus,
          usage: memoryPercentage,
          message: memoryMessage,
        },
        disk: {
          status: diskStatus,
          usage: diskUsage,
          message: diskMessage,
        },
      },
      environment: process.env.NODE_ENV || 'development',
    };

    // Log health check results
    logSystemHealth('HealthCheck', overallStatus, {
      database: databaseStatus,
      memory: memoryStatus,
      disk: diskStatus,
      uptime,
      memoryUsage: memoryPercentage,
    });

    return result;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const metrics = this.getSystemMetrics();

    return {
      system: {
        uptime: metrics.uptime,
        memory: metrics.memory,
        cpu: metrics.cpu,
      },
      requests: metrics.requests,
      process: metrics.process,
    };
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics() {
    const metrics = this.getSystemMetrics();

    logPerformance('SystemMetrics', Date.now() - this.startTime.getTime(), {
      memoryUsage: metrics.memory.percentage,
      cpuLoad: metrics.cpu.loadAverage[0],
      activeRequests: metrics.requests.active,
      totalRequests: metrics.requests.total,
    });
  }

  /**
   * Get uptime information
   */
  getUptimeInfo() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return {
      uptime,
      formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      startTime: this.startTime,
    };
  }

  /**
   * Get memory information
   */
  getMemoryInfo() {
    const memory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = memory - freeMemory;
    const memoryUsage = process.memoryUsage();

    return {
      system: {
        total: memory,
        used: usedMemory,
        free: freeMemory,
        percentage: (usedMemory / memory) * 100,
      },
      process: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
    };
  }

  /**
   * Get CPU information
   */
  getCpuInfo() {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    return {
      cores: cpus.length,
      loadAverage,
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed || 0,
    };
  }

  /**
   * Get process information
   */
  getProcessInfo() {
    return {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    logger.info('Starting system monitoring');

    // Log initial metrics
    this.logPerformanceMetrics();

    // Set up periodic monitoring
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 60000); // Every minute
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    logger.info('Stopping system monitoring');
  }
}

// Create singleton instance
export const monitoringService = new MonitoringService();
export default monitoringService;
