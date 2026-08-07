module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID missing' });

  const targetUrl = `https://www.youtube.com/watch?v=${id}`;

  // 1차 시도: Cobalt 공식 메인 서버 (가장 빠른 응답)
  try {
    const r1 = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      body: JSON.stringify({ url: targetUrl, downloadMode: 'audio', audioFormat: 'mp3' })
    });
    const d1 = await r1.json();
    if (d1 && d1.url) return res.status(200).json({ url: d1.url });
  } catch (e) {}

  // 2차 시도: Invidious 고성능 분산 노드 순회
  const invidiousNodes = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza',
    'https://invidious.drgns.space'
  ];

  for (const node of invidiousNodes) {
    try {
      const r = await fetch(`${node}/api/v1/videos/${id}`);
      if (r.ok) {
        const data = await r.json();
        if (data && data.adaptiveFormats) {
          const audio = data.adaptiveFormats.find(f => f.type && f.type.includes('audio'));
          if (audio && audio.url) return res.status(200).json({ url: audio.url });
        }
      }
    } catch (e) {}
  }

  return res.status(500).json({ error: '유튜브 차단 해제 작업 중입니다. 잠시 후 다시 [반주 불러오기]를 눌러보세요.' });
};
