import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Hàm tạo số thực ngẫu nhiên cho count
function getRandomFloat(min, max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] / (0xFFFFFFFF + 1)) * (max - min);
}

// Hàm tạo số nguyên ngẫu nhiên trong khoảng [min, max] cho views
function getRandomInt(min, max) {
  const minInt = Math.ceil(min);
  const maxInt = Math.floor(max);
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return Math.floor(minInt + (array[0] / (0xFFFFFFFF + 1)) * (maxInt - minInt + 1));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: rawId } = req.query;

  // 1. CREATE / UPDATE (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const itemId = (body.id || rawId || '').replace(/\.json$/i, '').trim();

      if (!itemId || body.min === undefined || body.max === undefined) {
        return res.status(400).json({ error: 'Missing required fields: id, min, or max' });
      }

      const count = Number(body.count) || 0;
      const views = Math.floor(Number(body.views) || 0);
      const videos = Math.floor(Number(body.videos) || 0);

      const newItem = {
        id: itemId,
        name: body.name || '',
        username: body.username || '',
        description: body.description || '',
        country: body.country || '',
        contenttype: body.contenttype || '',
        image: body.image || '',
        banner: body.banner || '',
        count: count,
        min: Number(body.min),
        max: Number(body.max),
        roundcount: Math.floor(count),
        views: views,
        minv: body.minv !== undefined ? Math.floor(Number(body.minv)) : 0,
        maxv: body.maxv !== undefined ? Math.floor(Number(body.maxv)) : 0,
        videos: videos
      };

      await redis.set(`item:${itemId}`, newItem);

      return res.status(201).json({
        message: 'Saved successfully',
        url: `/api/${itemId}.json`,
        data: newItem
      });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
  }

  // 2. READ (GET /api/<id>.json)
  if (req.method === 'GET') {
    const cleanId = rawId ? rawId.replace(/\.json$/i, '') : '';

    if (!cleanId) {
      return res.status(400).json({ error: 'Missing item ID' });
    }

    const data = await redis.get(`item:${cleanId}`);

    if (!data) {
      return res.status(404).json({ error: `Item ${cleanId}.json not found` });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
