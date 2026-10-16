export async function handler() {
  const targetDateStr = process.env.LAUNCH_DATE || process.env.VITE_LAUNCH_DATE || '2026-10-18T08:00:00+05:30';
  const establishment = process.env.LAUNCH_ESTABLISHMENT || process.env.VITE_LAUNCH_ESTABLISHMENT || process.env.ESTABLISHMENT_YEAR || '2026';
  const targetTime = new Date(targetDateStr).getTime();
  const now = Date.now();
  const isForcedLive = process.env.LAUNCH_STATUS === 'LIVE' || process.env.LAUNCHED === 'true';
  const isLive = isForcedLive || (now >= targetTime);

  const establishmentDisplay = isNaN(Number(establishment))
    ? establishment
    : `Est. ${establishment} • Royal Weaves`;

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
      establishment,
      establishmentDisplay,
      serverTime: new Date(now).toISOString(),
      serverTimestamp: now,
      timeRemainingMs: Math.max(0, targetTime - now),
      storeUrl: process.env.STORE_URL || process.env.MUETY_STORE_URL || 'https://store.muety.in',
      mode: process.env.NODE_ENV || 'production'
    })
  };
}

