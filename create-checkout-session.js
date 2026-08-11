const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const body = req.body || {};
    const email = (body.email || '').toLowerCase().trim();
    if (!email) {
      res.status(400).json({ error: 'email_required' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Roda da Vida — Assinatura',
              description: 'Gerações ilimitadas de tarefas com IA, e mais recursos por vir.',
            },
            unit_amount: 990, // R$9,90
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      metadata: {
        projeto: 'roda-da-vida',
        email: email,
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
