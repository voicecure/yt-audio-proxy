module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'No video ID' });

  // 1차 우회 노드 (Cobalt API)
  try {
    const r1 = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${id}`, downloadMode: 'audio' })
    });
    const d1 = await r1.json();
    if (d1 && d1.url) return res.status(200).json({ url: d1.url });
  } catch (e) {}

  // 2차 우회 노드 (Invidious API)
  try {
    const r2 = await fetch(`https://inv.ts.sc/api/v1/videos/${id}`);
    const d2 = await r2.json();
    if (d2 && d2.adaptiveFormats) {
      const audio = d2.adaptiveFormats.find(f => f.type && f.type.includes('audio'));
      if (audio && audio.url) return res.status(200).json({ url: audio.url });
    }
  } catch (e) {}

  // 3차 우회 노드 (Piped API)
  try {
    const r3 = await fetch(`https://pipedapi.kavin.rocks/streams/${id}`);
    const d3 = await r3.json();
    if (d3 && d3.audioStreams && d3.audioStreams.length > 0) {
      return res.status(200).json({ url: d3.audioStreams[0].url });
    }
  } catch (e) {}

  return res.status(500).json({ error: 'Audio fetch failed' });
};
