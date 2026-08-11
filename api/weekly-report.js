// Roda toda semana (ver vercel.json), varre todo mundo assinante e manda um
// resumo por e-mail. Protegido por CRON_SECRET pra ninguém disparar manualmente.

const { redisKeys, redisGet } = require('../lib/redis');

const AREA_NAMES = {
  saude: 'Saúde e Disposição', intelectual: 'Desenvolvimento Intelectual', emocional: 'Equilíbrio Emocional',
  carreira: 'Carreira / Trabalho', financas: 'Finanças', familia: 'Família',
  amoroso: 'Relacionamento Amoroso', social: 'Vida Social', contribuicao: 'Contribuição Social',
  espiritualidade: 'Espiritualidade', lazer: 'Lazer e Diversão', ambiente: 'Ambiente Físico',
};

function buildSummary(state) {
  const completions = state.completions || {};
  const now = new Date();
  let tasksThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    tasksThisWeek += (completions[key] || []).length;
  }

  const scores = state.scores || {};
  const entries = Object.entries(scores);
  let strongest = null, weakest = null;
  if (entries.length) {
    entries.sort((a, b) => b[1] - a[1]);
    strongest = entries[0];
    weakest = entries[entries.length - 1];
  }

  return {
    tasksThisWeek,
    streak: state.streak || 0,
    strongestName: strongest ? (AREA_NAMES[strongest[0]] || strongest[0]) : null,
    weakestName: weakest ? (AREA_NAMES[weakest[0]] || weakest[0]) : null,
  };
}

async function sendWeeklyEmail(email, s) {
  const html = `
    <div style="font-family:sans-serif; max-width:480px; margin:0 auto;">
      <h2>Sua semana na Roda da Vida 🌱</h2>
      <p>Aqui está seu resumo dos últimos 7 dias:</p>
      <ul>
        <li><strong>${s.tasksThisWeek}</strong> tarefas concluídas</li>
        <li><strong>${s.streak}</strong> dias seguidos de sequência</li>
        ${s.strongestName ? `<li>Sua área mais forte agora: <strong>${s.strongestName}</strong></li>` : ''}
        ${s.weakestName ? `<li>Área que pode receber mais atenção: <strong>${s.weakestName}</strong></li>` : ''}
      </ul>
      <p><a href="https://rodadavida.cassiobastos.com" style="display:inline-block; background:#111; color:#fff; padding:12px 20px; border-radius:100px; text-decoration:none;">Continuar minha semana</a></p>
    </div>
  `;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Roda da Vida <naoresponda@cassiobastos.com>',
      to: [email],
      subject: 'Seu resumo semanal da Roda da Vida',
      html,
    }),
  });
}

module.exports = async (req, res) => {
  const auth = req.headers.authorization;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const keys = await redisKeys('subscribed:roda-da-vida:*');
    let sent = 0;
    for (const key of keys || []) {
      const email = key.replace('subscribed:roda-da-vida:', '');
      const stateRaw = await redisGet(`state:roda-da-vida:${email}`);
      if (!stateRaw) continue;
      let state;
      try { state = JSON.parse(stateRaw); } catch (e) { continue; }
      const summary = buildSummary(state);
      await sendWeeklyEmail(email, summary);
      sent++;
    }
    res.status(200).json({ sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
