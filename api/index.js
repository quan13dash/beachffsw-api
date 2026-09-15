import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // Cấu hình CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // 1. Lấy tất cả các key có tiền tố "item:"
      const keys = await redis.keys('item:*');

      // 2. Tách lấy phần ID (xóa chữ "item:" ở đầu)
      const ids = keys.map((key) => key.replace(/^item:/, ''));

      // 3. Trả về mảng danh sách ID
      return res.status(200).json(ids);
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách ID' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
