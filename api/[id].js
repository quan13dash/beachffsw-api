import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: rawId } = req.query;

  // 1. CREATE OR UPDATE ITEM (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const itemId = (body.id || rawId || '').replace(/\.json$/i, '').trim();

      if (!itemId || body.min === undefined || body.max === undefined) {
        return res.status(400).json({ error: 'Missing required fields: id, min, or max' });
      }

      const count = Number(body.count) || 0;
      const views = Math.floor(Number(body.views)) || 0;

      const newItem = {
        id: itemId,
        name: body.name || '',
        image: body.image || '',
        banner: body.banner || '',
        count: count,
        min: Number(body.min),
        max: Number(body.max),
        roundcount: Math.floor(count),
        
        // Custom variables
        views: views,
        minv: body.minv !== undefined ? Math.floor(Number(body.minv)) : 0,
        maxv: body.maxv !== undefined ? Math.floor(Number(body.maxv)) : 0,
        videos: body.videos !== undefined ? body.videos : null
      };

      await redis.set(`item:${itemId}`, newItem);

      return res.status(201).json({
        message: 'Saved successfully',
        url: `/api/${itemId}.json`,
        data: newItem
      });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  // 2. READ ITEM (GET /api/<id>.json)
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
