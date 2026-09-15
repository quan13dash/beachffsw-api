import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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

      const { count, min, max, ...rest } = data;

      return {
        ...rest,
        count: data.roundcount ?? 0
      };
    }).filter(Boolean);

    return res.status(200).json(cleanedItems);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách items:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ' });
  }
}
