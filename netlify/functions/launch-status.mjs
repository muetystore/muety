export async function handler() {
  const targetDateStr = process.env.LAUNCH_DATE || '2026-10-18T08:00:00+05:30';
  const targetTime = new Date(targetDateStr).getTime();
  const now = Date.now();
  const isForcedLive = process.env.LAUNCH_STATUS === 'LIVE' || process.env.LAUNCHED === 'true';
  const isLive = isForcedLive || (now >= targetTime);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: isLive ? 'LIVE' : 'PRE_LAUNCH',
      launchAt: targetDateStr,
      launchTimestamp: targetTime,
      serverTime: new Date(now).toISOString(),
      serverTimestamp: now,
      storeUrl: process.env.STORE_URL || process.env.MUETY_STORE_URL || 'https://store.muety.in',
      mode: process.env.NODE_ENV || 'production'
    })
  };
}

