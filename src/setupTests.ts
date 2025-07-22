import '@testing-library/jest-dom';

// Mock WebSocket for tests
(global as any).WebSocket = class MockWebSocket {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    // Mock implementation
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: (jest as any).fn(),
  setItem: (jest as any).fn(),
  removeItem: (jest as any).fn(),
  clear: (jest as any).fn(),
};
(global as any).localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: (jest as any).fn(),
  setItem: (jest as any).fn(),
  removeItem: (jest as any).fn(),
  clear: (jest as any).fn(),
};
(global as any).sessionStorage = sessionStorageMock;

// Mock fetch
(global as any).fetch = (jest as any).fn();

// Mock IntersectionObserver
(global as any).IntersectionObserver = (jest as any).fn().mockImplementation(() => ({
  observe: (jest as any).fn(),
  unobserve: (jest as any).fn(),
  disconnect: (jest as any).fn(),
}));

// Mock ResizeObserver
(global as any).ResizeObserver = (jest as any).fn().mockImplementation(() => ({
  observe: (jest as any).fn(),
  unobserve: (jest as any).fn(),
  disconnect: (jest as any).fn(),
}));

// Suppress console warnings in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
}); 