import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Random số thực cho count
function getRandomFloat(min, max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] / (0xFFFFFFFF + 1)) * (max - min);
}

// Random số nguyên [min, max] cho views
function getRandomInt(min, max) {
  if (min > max) [min, max] = [max, min];
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return Math.floor(min + (array[0] / (0xFFFFFFFF + 1)) * (max - min + 1));
}

async function updateAll() {
  const keys = await redis.keys('item:*');
  for (const key of keys) {
    const item = await redis.get(key);
    if (item) {
      // 1. Tăng count (số thực)
      if (item.min !== undefined && item.max !== undefined) {
        item.count = Number(item.count) + getRandomFloat(item.min, item.max);
        item.roundcount = Math.floor(item.count);
      }

      // 2. Tăng views (số nguyên) nếu minv & maxv hợp lệ
      if (item.minv !== undefined && item.maxv !== undefined && (item.minv !== 0 || item.maxv !== 0)) {
        item.views = Number(item.views || 0) + getRandomInt(item.minv, item.maxv);
      }

      await redis.set(key, item);
    }
  }
}

export default async function handler(req, res) {
  try {
    // Lần 1: Chạy ngay
    await updateAll();

    // Chờ 30s
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Lần 2: Chạy lại
    await updateAll();

    return res.status(200).json({ success: true, message: 'Cron executed successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error during cron operation' });
  }
}

  // Lần 2: Chạy lại
  await updateAll();

  return res.status(200).json({ success: true });
}
