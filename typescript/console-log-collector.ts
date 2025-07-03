/**
 * Console Log Collector:
 * Intercept and collect console.* while preserving original functionality
 */

/**
 * Represents a single captured log entry
 */
type LogEntry = {
  id: number; // Chronological sequence number
  timestamp: string; // ISO timestamp when log occurred
  level: 'log' | 'error' | 'warn' | 'info' | 'debug'; // Log level
  message: any; // The actual log content (can be anything)
  source?: string; // Optional: where the log came from
};

/**
 * Configuration options for the log collector
 */
type LogCollectorOptions = {
  captureAll?: boolean; // Capture all logs or use filter
  filter?: (args: any[]) => boolean; // Custom filter function
  includeStackTrace?: boolean; // Include stack trace in captured logs
  maxLogs?: number; // Maximum number of logs to keep
  timestampFormat?: 'iso' | 'unix'; // Timestamp format preference
};

// =============================================================================
// MAIN LOG COLLECTOR CLASS
// =============================================================================

/**
 * Console log interceptor that captures logs while preserving
 * original console functionality.
 *
 * Usage Pattern:
 * 1. Create instance
 * 2. Call start() to begin interception
 * 3. Run your code (logs will be captured)
 * 4. Call stop() to restore original console
 * 5. Call getLogs() to retrieve captured logs
 */
class ConsoleLogCollector {
  // Properties to store state
  logs: LogEntry[] = [];
  counter = 0;
  options: LogCollectorOptions;
  isActive = false;

  // Store references to original console methods
  // IMPORTANT: You most likely want to store original functionality
  originalMethods: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    info: typeof console.info;
    debug: typeof console.debug;
  };

  /**
   * Set up the collector with optional configuration
   */
  constructor(options: LogCollectorOptions = {}) {
    this.options = {
      captureAll: true,
      includeStackTrace: false,
      maxLogs: 1000,
      timestampFormat: 'iso',
      ...options, // Merge user options with defaults
    };

    // IMPORTANT: Store original methods immediately in constructor
    // This ensures we capture the "real" console methods before any other
    // libraries or code might modify them
    this.originalMethods = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };
  }

  /**
   * Start intercepting console methods and replacing them with our own
   */
  start(): void {
    if (this.isActive) {
      console.warn('LogCollector is already active');
      return;
    }

    this.isActive = true;
    this.clear(); // Start with clean slate

    // Replace console.* with interceptor
    console.log = (...args: any[]) => {
      this.captureLog('log', args);
      // IMPORTANT: Always call the original method to preserve normal behavior
      this.originalMethods.log.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.captureLog('error', args);
      this.originalMethods.error.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.captureLog('warn', args);
      this.originalMethods.warn.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.captureLog('info', args);
      this.originalMethods.info.apply(console, args);
    };

    console.debug = (...args: any[]) => {
      this.captureLog('debug', args);
      this.originalMethods.debug.apply(console, args);
    };
  }

  /**
   * Stop intercepting and restore original console methods
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    console.log = this.originalMethods.log;
    console.error = this.originalMethods.error;
    console.warn = this.originalMethods.warn;
    console.info = this.originalMethods.info;
    console.debug = this.originalMethods.debug;

    this.isActive = false;
  }

  /**
   * Capture and store log entries
   */
  captureLog(level: LogEntry['level'], args: any[]): void {
    // Apply filter if provided
    if (this.options.filter && !this.options.filter(args)) {
      return; // Skip this log entry
    }

    const timestamp =
      this.options.timestampFormat === 'unix'
        ? Date.now().toString()
        : new Date().toISOString();

    // Determine the message format
    // If single argument, store as-is. Multiple arguments, store as array
    const message = args.length === 1 ? args[0] : args;

    // Create log entry
    const logEntry: LogEntry = {
      id: ++this.counter,
      timestamp,
      level,
      message,
    };

    // Add stack trace if requested
    if (this.options.includeStackTrace) {
      const stack = new Error().stack;
      logEntry.source = stack?.split('\n')[3]?.trim(); // Get calling location
    }

    // Add to logs array
    this.logs.push(logEntry);

    // Enforce max logs limit
    if (this.options.maxLogs && this.logs.length > this.options.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
  }

  /**
   * Get all captured logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs]; // Return copy to prevent external modification
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Get logs within a time range
   */
  getLogsByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    const start = startTime.toISOString();
    const end = endTime.toISOString();

    return this.logs.filter((log) => {
      return log.timestamp >= start && log.timestamp <= end;
    });
  }

  /**
   * Search logs by content
   */
  searchLogs(searchTerm: string): LogEntry[] {
    return this.logs.filter((log) => {
      const messageStr =
        typeof log.message === 'string'
          ? log.message
          : JSON.stringify(log.message);
      return messageStr.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }

  /**
   * Clear all captured logs
   */
  clear(): void {
    this.logs = [];
    this.counter = 0;
  }

  /**
   * Get statistics about captured logs
   */
  getStats(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    timeRange: { earliest?: string; latest?: string };
  } {
    const byLevel: Record<string, number> = {};

    this.logs.forEach((log) => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    });

    const timeRange =
      this.logs.length > 0
        ? {
            earliest: this.logs[0].timestamp,
            latest: this.logs[this.logs.length - 1].timestamp,
          }
        : {};

    return {
      totalLogs: this.logs.length,
      byLevel,
      timeRange,
    };
  }

  /**
   * Export logs as JSON string
   */
  exportLogsAsJson(): string {
    return JSON.stringify(
      {
        metadata: {
          exportTime: new Date().toISOString(),
          totalLogs: this.logs.length,
          collectorOptions: this.options,
        },
        logs: this.logs,
      },
      null,
      2,
    );
  }
}

// =============================================================================
// SPECIALIZED LOG COLLECTORS FOR SPECIFIC USE CASES
// =============================================================================

/**
 * Debug Log Collector - Only captures logs containing "[DEBUG]"
 */
class DebugLogCollector extends ConsoleLogCollector {
  constructor() {
    super({
      captureAll: false,
      filter: (args: any[]) => {
        // Only capture logs that contain "[DEBUG]" in any argument
        return args.some(
          (arg) => typeof arg === 'string' && arg.includes('[DEBUG]'),
        );
      },
    });
  }
}

/**
 * Error Log Collector - Only captures error-level logs
 */
class ErrorLogCollector extends ConsoleLogCollector {
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.clear();

    // Only intercept console.error
    console.error = (...args: any[]) => {
      this.captureLog('error', args);
      this.originalMethods.error.apply(console, args);
    };
  }

  stop(): void {
    if (!this.isActive) return;

    // Only restore console.error
    console.error = this.originalMethods.error;
    this.isActive = false;
  }
}

/**
 * Performance Log Collector - Includes timing information
 */
class PerformanceLogCollector extends ConsoleLogCollector {
  private startTime: number;

  constructor() {
    super({
      includeStackTrace: true,
    });
    this.startTime = Date.now();
  }

  captureLog(level: LogEntry['level'], args: any[]): void {
    // Add performance timing to each log
    const perfTiming = Date.now() - this.startTime;
    const enhancedArgs = [...args, { performanceMs: perfTiming }];

    // Call parent's captureLog with enhanced args
    super['captureLog'](level, enhancedArgs);
  }
}

// =============================================================================
// EXAMPLE USAGE AND DEMONSTRATIONS
// =============================================================================

/**
 * Example 1: Basic Usage
 * This shows the fundamental pattern of using the log collector
 */
function basicUsageExample() {
  console.log('\n=== BASIC USAGE EXAMPLE ===');

  // 1. Create collector instance
  const collector = new ConsoleLogCollector();

  // 2. Start collecting
  collector.start();

  // 3. Generate some logs (these will be captured)
  console.log('This is a regular log');
  console.error('This is an error log');
  console.warn('This is a warning');

  // 4. Stop collecting
  collector.stop();

  // 5. Retrieve and display captured logs
  const logs = collector.getLogs();

  // 6. After stopping, logs work normally again
  console.log('Number of logs captured:', JSON.stringify(logs.length, null, 2));
}

/**
 * Example 2: Debug Log Filtering
 * This demonstrates filtering logs based on content
 */
function debugFilterExample() {
  console.log('\n=== DEBUG FILTER EXAMPLE ===');

  const debugCollector = new DebugLogCollector();
  debugCollector.start();

  // These logs will be captured (contain [DEBUG])
  console.log('[DEBUG] Starting process');

  // These logs will NOT be captured (no [DEBUG])
  console.log('Regular application log');

  debugCollector.stop();
}

/**
 * Example 3: Error-Only Collection
 * This shows how to capture only errors
 */
function errorOnlyExample() {
  console.log('\n=== ERROR-ONLY EXAMPLE ===');

  const errorCollector = new ErrorLogCollector();
  errorCollector.start();

  console.log('This is a log message'); // Not captured
  console.warn('This is a warning'); // Not captured
  console.error('This is an error'); // Captured

  errorCollector.stop();
}
