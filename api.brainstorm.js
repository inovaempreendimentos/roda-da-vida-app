module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = req.body || {};
    const areaName = body.areaName || '';
    const existingTasks = Array.isArray(body.existingTasks) ? body.existingTasks : [];

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

    res.status(200).json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
