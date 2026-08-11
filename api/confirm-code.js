// Confirma o código de 6 dígitos e marca o e-mail como verificado, sem
// expiração. Reaproveitável em qualquer app: a chave "verified_email:{email}"
// fica no mesmo banco compartilhado, então um e-mail verificado num app já
// aparece verificado nos outros também.

const { redisGet, redisDel, redisSet } = require('../lib/redis');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      res.status(400).json({ error: 'Dados incompletos' });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const key = `verify_code:${normalized}`;
    const stored = await redisGet(key);

    if (!stored || String(stored) !== String(code)) {
      res.status(400).json({ error: 'Código incorreto ou expirado' });
      return;
    }

    await redisDel(key);
    await redisSet(`verified_email:${normalized}`, '1'); // sem expiração

    res.status(200).json({ verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
