const { redisGet, redisSet } = require('../lib/redis');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = req.body || {};
    const email = (body.email || '').toLowerCase().trim();
    const state = body.state;
    if (!email || !state) {
      res.status(400).json({ error: 'dados incompletos' });
      return;
    }

    const subscribed = await redisGet(`subscribed:roda-da-vida:${email}`);
    if (!subscribed) {
      res.status(403).json({ error: 'not_subscribed' });
      return;
    }

    await redisSet(`state:roda-da-vida:${email}`, JSON.stringify(state));
    res.status(200).json({ synced: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
