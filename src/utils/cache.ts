import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:2023'
});

redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(console.error);

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    const data = await fetchFn();
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Cache error:', error);
    throw error;
  }
} 