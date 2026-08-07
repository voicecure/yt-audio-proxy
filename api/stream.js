module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID missing' });

  // 5초 응답 제약 함수 (서버 멈춤 방지)
  const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      return null;
    }
  };

  // 1차 시도: Cobalt 고속 노드
  try {
    const r1 = await fetchWithTimeout('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${id}`, isAudioOnly: true })
    });
    if (r1 && r1.ok) {
      const d1 = await r1.json();
      if (d1 && d1.url) return res.status(200).json({ url: d1.url });
    }
  } catch (e) {}

  // 2차 시도: Piped 분산 노드
  try {
    const r2 = await fetchWithTimeout(`https://api.piped.privacydev.net/streams/${id}`);
    if (r2 && r2.ok) {
      const d2 = await r2.json();
      if (d2 && d2.audioStreams && d2.audioStreams.length > 0) {
        return res.status(200).json({ url: d2.audioStreams[0].url });
      }
    }
  } catch (e) {}

  // 3차 시도: Invidious 분산 노드
  try {
    const r3 = await fetchWithTimeout(`https://inv.nadeko.net/api/v1/videos/${id}`);
    if (r3 && r3.ok) {
      const d3 = await r3.json();
      if (d3 && d3.adaptiveFormats) {
        const audio = d3.adaptiveFormats.find(f => f.type && f.type.includes('audio'));
        if (audio && audio.url) return res.status(200).json({ url: audio.url });
      }
    }
  } catch (e) {}

  return res.status(500).json({ error: '모든 우회 노드가 유튜브 차단에 걸렸습니다.' });
};
