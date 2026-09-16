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

function applyBoosting(gain, rate) {
  if (rate <= 0) rate = 1;
  if (gain >= 0) {
    return gain * rate;
  } else {
    return gain / rate;
  }
}

async function updateAll() {
  const keys = await redis.keys('item:*');
  const now = Date.now();

  for (const key of keys) {
    const item = await redis.get(key);
    if (item) {
      let rate = item.boostingrate !== undefined ? Number(item.boostingrate) : 1;
      let slowRate = item.slowingrate !== undefined ? Number(item.slowingrate) : 5;
      if (slowRate <= 0) slowRate = 5; // Fallback an toàn

      let lastUpdate = item.lastBoostUpdate || now;

      // 1. Giảm boostingrate 0.01 mỗi `slowRate` phút nếu rate > 1.00
      if (rate > 1.00) {
        const elapsedMs = now - lastUpdate;
        const intervalMs = slowRate * 60 * 1000; // Đổi số phút slowingrate ra miligiây
        const timeBlocks = Math.floor(elapsedMs / intervalMs);

        if (timeBlocks > 0) {
          rate = rate - (timeBlocks * 0.01);
          if (rate < 1.00) rate = 1.00; // Không tụt quá 1.00
          
          // Cập nhật mốc thời gian đã xử lý
          lastUpdate = lastUpdate + (timeBlocks * intervalMs);
        }
      }

      rate = Math.round(rate * 100) / 100;
      item.boostingrate = rate;
      item.slowingrate = slowRate;
      item.lastBoostUpdate = lastUpdate;

      // 2. Cập nhật count
      if (item.min !== undefined && item.max !== undefined) {
        const rawGain = getRandomFloat(item.min, item.max);
        const boostedGain = applyBoosting(rawGain, rate);

        item.count = Number(item.count) + boostedGain;
        item.roundcount = Math.floor(item.count);
      }

      // 3. Cập nhật views
      if (item.minv !== undefined && item.maxv !== undefined && (item.minv !== 0 || item.maxv !== 0)) {
        const rawViewsGain = getRandomInt(item.minv, item.maxv);
        const boostedViewsGain = applyBoosting(rawViewsGain, rate);

        item.views = Math.floor(Number(item.views || 0)) + Math.round(boostedViewsGain);
      }

      await redis.set(key, item);
    }
  }
}

export default async function handler(req, res) {
  try {
    await updateAll();
    return res.status(200).json({ success: true, message: 'Cron job executed successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error during cron' });
  }
}
