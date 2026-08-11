const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { redisDel } = require('../lib/redis');

module.exports = async (req, res) => {
  const subscriptionId = req.query.subscription_id;
  const email = (req.query.email || '').toLowerCase().trim();
  if (!subscriptionId) {
    res.status(400).json({ error: 'subscription_id is required' });
    return;
  }
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const active = sub.status === 'active' || sub.status === 'trialing';
    if (!active && email) {
      await redisDel(`subscribed:roda-da-vida:${email}`);
    }
    res.status(200).json({ active: active, status: sub.status });
  } catch (err) {
    if (email) { await redisDel(`subscribed:roda-da-vida:${email}`).catch(()=>{}); }
    res.status(200).json({ active: false, status: 'unknown' });
  }
};
