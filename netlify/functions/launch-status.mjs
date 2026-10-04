export async function handler() {
  const targetDateStr = process.env.LAUNCH_DATE || '2026-10-18T00:00:00+05:30';
  const targetTime = new Date(targetDateStr).getTime();
  const now = Date.now();
  const isLive = now >= targetTime;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: isLive ? 'LIVE' : 'PRE_LAUNCH',
      launchAt: targetDateStr,
      storeUrl: process.env.STORE_URL || '/',
      serverTime: new Date().toISOString(),
      mode: process.env.NODE_ENV || 'production'
    })
  };
}
