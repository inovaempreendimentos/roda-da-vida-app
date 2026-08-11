const { redisGet, redisIncr, redisExpire } = require('../lib/redis');

const FREE_LIMIT = 3; // gerações grátis por e-mail, por mês

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = req.body || {};
    const email = (body.email || '').toLowerCase().trim();
    const areaName = body.areaName || '';
    const existingTasks = Array.isArray(body.existingTasks) ? body.existingTasks : [];

    if (!email) {
      res.status(401).json({ error: 'email_required' });
      return;
    }

    const verified = await redisGet(`verified_email:${email}`);
    if (!verified) {
      res.status(403).json({ error: 'email_not_verified' });
      return;
    }

    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usageKey = `usage:roda-da-vida:${email}:${period}`;
    const count = await redisIncr(usageKey);
    if (count === 1) {
      await redisExpire(usageKey, 60 * 60 * 24 * 40); // expira em ~40 dias, cobre o mês inteiro
    }
    if (count > FREE_LIMIT) {
      res.status(429).json({ error: 'limit_reached', limit: FREE_LIMIT, used: count });
      return;
    }

    const prompt = `Sugira 5 tarefas pequenas, práticas e específicas (uma frase curta cada, em português do Brasil, sempre no imperativo, sem numeração) que uma pessoa pode fazer HOJE para melhorar a área de vida "${areaName}". Não repita nenhuma destas tarefas já existentes: ${existingTasks.join('; ') || 'nenhuma'}. Responda APENAS com um array JSON de 5 strings, sem markdown, sem explicação, sem texto antes ou depois.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      throw new Error((data.error && data.error.message) || 'Erro na OpenAI');
    }

    let text = data.choices[0].message.content.trim();
    text = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const tasks = JSON.parse(text);

    res.status(200).json({ tasks, used: count, limit: FREE_LIMIT });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
