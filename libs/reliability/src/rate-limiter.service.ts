import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Rate limiting using Token Bucket algorithm via Redis Lua
   */
  async isAllowed(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const luaScript = `
      local current = redis.call('get', KEYS[1])
      if current and tonumber(current) >= tonumber(ARGV[1]) then
        return 0
      end
      local next_val = redis.call('incr', KEYS[1])
      if tonumber(next_val) == 1 then
        redis.call('expire', KEYS[1], ARGV[2])
      end
      return 1
    `;

    const result = await this.redis.eval(luaScript, 1, `ratelimit:${key}`, limit, windowSeconds);
    return result === 1;
  }
}
