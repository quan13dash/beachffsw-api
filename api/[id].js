import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

function getRandomNumber(min, max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] / (0xFFFFFFFF + 1)) * (max - min);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: rawId } = req.query;

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const itemId = (body.id || rawId || '').replace(/\.json$/i, '').trim();

      if (!itemId || body.min === undefined || body.max === undefined) {
        return res.status(400).json({ error: 'Thiếu id, min hoặc max' });
      }

      const count = Number(body.count) || 0;
      const newItem = {
        id: itemId,
        name: body.name || '',
        image: body.image || '',
        banner: body.banner || '',
        count: count,
        min: Number(body.min),
        max: Number(body.max),
        roundcount: Math.floor(count)
      };

      await redis.set(`item:${itemId}`, newItem);

      return res.status(201).json({
        message: 'Lưu thành công',
        url: `/api/${itemId}.json`,
        data: newItem
      });
    } catch (err) {
      return res.status(400).json({ error: 'Dữ liệu JSON không hợp lệ' });
    }
  }

  if (req.method === 'GET') {
    const cleanId = rawId ? rawId.replace(/\.json$/i, '') : '';

    if (!cleanId) {
      return res.status(400).json({ error: 'Thiếu ID' });
    }

    const data = await redis.get(`item:${cleanId}`);

    if (!data) {
      return res.status(404).json({ error: `Không tìm thấy ${cleanId}.json` });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
