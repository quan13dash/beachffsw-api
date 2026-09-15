import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

function getRandomFloat(min, max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] / (0xFFFFFFFF + 1)) * (max - min);
}

function getRandomInt(min, max) {
  const minInt = Math.ceil(min);
  const maxInt = Math.floor(max);
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return Math.floor(minInt + (array[0] / (0xFFFFFFFF + 1)) * (maxInt - minInt + 1));
}

async function updateAll() {
  const keys = await redis.keys('item:*');
  for (const key of keys) {
    const item = await redis.get(key);
    if (item) {
      // Cập nhật count (số thực)
      if (item.min !== undefined && item.max !== undefined) {
        item.count = Number(item.count) + getRandomFloat(item.min, item.max);
        item.roundcount = Math.floor(item.count);
      }

      // Cập nhật views (số nguyên)
      if (item.minv !== undefined && item.maxv !== undefined && (item.minv !== 0 || item.maxv !== 0)) {
        item.views = Math.floor(Number(item.views || 0)) + getRandomInt(item.minv, item.maxv);
      }

      await redis.set(key, item);
    }
  }
}

export default async function handler(req, res) {
  await updateAll();

  await new Promise((resolve) => setTimeout(resolve, 30000));

  await updateAll();

  return res.status(200).json({ success: true, message: 'Cron job executed successfully' });
}
  // Lần 2: Chạy lại
  await updateAll();

  return res.status(200).json({ success: true });
}
