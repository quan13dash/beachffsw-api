import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

function getRandomNumber(min, max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] / (0xFFFFFFFF + 1)) * (max - min);
}

async function updateAll() {
  const keys = await redis.keys('item:*');
  for (const key of keys) {
    const item = await redis.get(key);
    if (item) {
      item.count = Number(item.count) + getRandomNumber(item.min, item.max);
      item.roundcount = Math.floor(item.count);
      await redis.set(key, item);
    }
  }
}

export default async function handler(req, res) {
  // Lần 1: Chạy ngay
  await updateAll();

  // Chờ 30s
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Lần 2: Chạy lại
  await updateAll();

  return res.status(200).json({ success: true });
}
