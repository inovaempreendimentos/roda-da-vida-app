// Envia um código de 6 dígitos por e-mail (via Resend) e guarda ele no Redis
// por 10 minutos. Reaproveitável em qualquer app: só ajustar o nome do
// remetente no campo "from" abaixo.

const { redisSet } = require('../lib/redis');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'E-mail inválido' });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const code = String(Math.floor(100000 + Math.random() * 900000));

    await redisSet(`verify_code:${normalized}`, code, 600); // expira em 10 minutos

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Roda da Vida <naoresponda@cassiobastos.com>',
        to: [normalized],
        subject: 'Seu código de confirmação',
        html: `<p>Seu código de confirmação é: <strong style="font-size:20px;">${code}</strong></p><p>Ele expira em 10 minutos.</p>`,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}));
      throw new Error(errData.message || 'Falha ao enviar o e-mail');
    }

    res.status(200).json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
