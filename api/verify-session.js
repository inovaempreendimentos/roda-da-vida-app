const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { redisSet } = require('../lib/redis');

module.exports = async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    res.status(400).json({ error: 'session_id is required' });
    return;
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const active = session.status === 'complete';
    const email = (session.metadata && session.metadata.email) || (session.customer_email || '').toLowerCase();

    if (active && email && session.subscription) {
      // Marca o e-mail como assinante no banco compartilhado — é isso que o
      // brainstorm.js consulta pra liberar gerações ilimitadas.
      await redisSet(`subscribed:roda-da-vida:${email}`, session.subscription);
    }

    res.status(200).json({
      active: active,
      email: email,
      subscriptionId: session.subscription || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
