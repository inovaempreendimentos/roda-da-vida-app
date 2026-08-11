const { redisGet } = require('../lib/redis');

module.exports = async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) {
    res.status(400).json({ error: 'email é obrigatório' });
    return;
  }
  try {
    const subscribed = await redisGet(`subscribed:roda-da-vida:${email}`);
    if (!subscribed) {
      res.status(403).json({ error: 'not_subscribed' });
      return;
    }
    const stateRaw = await redisGet(`state:roda-da-vida:${email}`);
    res.status(200).json({ state: stateRaw ? JSON.parse(stateRaw) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
