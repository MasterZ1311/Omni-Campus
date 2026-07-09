import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';

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

const redisUrl = process.env.REDIS_URL;
let redisClient: any;
let sessionStore: any;

if (redisUrl) {
  console.log(`📡 Connecting to Redis server at ${redisUrl}...`);
  const client = createClient({ url: redisUrl });
  client.connect().catch((err) => {
    console.error('❌ Redis connection error:', err);
  });
  redisClient = client;
  sessionStore = new RedisStore({ client: client as any });
} else {
  console.log('📡 No REDIS_URL found in environment. Using MockRedis & MemoryStore.');
  redisClient = new MockRedis();
  sessionStore = new session.MemoryStore();
}

export { redisClient, sessionStore };

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
