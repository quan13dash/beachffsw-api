import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const keys = await redis.keys('item:*');

    if (!keys || keys.length === 0) {
      return res.status(200).json([]);
    }

    const items = await redis.mget(...keys);

    const cleanedItems = items.map((item) => {
      if (!item) return null;
      
      const data = typeof item === 'string' ? JSON.parse(item) : item;

      // Ẩn min, max, minv, maxv, slowingrate, lastBoostUpdate
      const { count, min, max, minv, maxv, slowingrate, lastBoostUpdate, ...rest } = data;

      return {
        ...rest,
        username: data.username || '',
        description: data.description || '',
        country: data.country || '',
        contenttype: data.contenttype || '',
        count: data.roundcount ?? 0,
        views: Math.floor(data.views ?? 0),
        videos: Math.floor(data.videos ?? 0),
        boostingrate: data.boostingrate ?? 1
      };
    }).filter(Boolean);

    return res.status(200).json(cleanedItems);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
    return res.status(200).json(cleanedItems);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
