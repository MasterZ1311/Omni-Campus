import session from 'express-session';

class MockRedis {
  private store: Record<string, string> = {};
  
  on(event: string, callback: (...args: any[]) => void) {
    if (event === 'connect') {
      setTimeout(callback, 50);
    }
  }
  
  async get(key: string): Promise<string | null> {
    return this.store[key] || null;
  }
  
  async set(key: string, value: string): Promise<string> {
    this.store[key] = value;
    return 'OK';
  }
  
  async setex(key: string, seconds: number, value: string): Promise<string> {
    this.store[key] = value;
    setTimeout(() => {
      delete this.store[key];
    }, seconds * 1000);
    return 'OK';
  }
  
  async del(key: string): Promise<number> {
    if (key in this.store) {
      delete this.store[key];
      return 1;
    }
    return 0;
  }
}

export const redisClient = new MockRedis();

export const sessionStore = new session.MemoryStore();

export const sessionConfig: session.SessionOptions = {
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'fallback-session-secret',
  resave: false,
  saveUninitialized: false,
  name: 'campus.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
};
