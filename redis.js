// Helper compartilhado de banco de dados (Upstash Redis, via REST API).
// Reaproveitável em qualquer app do ecossistema: só copiar este arquivo pra
// pasta lib/ do projeto novo e configurar as mesmas 2 variáveis de ambiente
// (UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN) na Vercel.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(args) {
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function redisSet(key, value, exSeconds) {
  const args = ['SET', key, String(value)];
  if (exSeconds) args.push('EX', String(exSeconds));
  return redisCommand(args);
}
async function redisGet(key) {
  return redisCommand(['GET', key]);
}
async function redisDel(key) {
  return redisCommand(['DEL', key]);
}
async function redisIncr(key) {
  return redisCommand(['INCR', key]);
}
async function redisExpire(key, seconds) {
  return redisCommand(['EXPIRE', key, String(seconds)]);
}
async function redisKeys(pattern) {
  return redisCommand(['KEYS', pattern]);
}

module.exports = { redisSet, redisGet, redisDel, redisIncr, redisExpire, redisKeys };
