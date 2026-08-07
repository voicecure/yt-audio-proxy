const ytdl = require('@distube/ytdl-core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID missing' });

  // 1차 시도: Cobalt 파이프라인 (IP 차단 회피)
  try {
    const cobaltRes = await fetch('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${id}`, isAudioOnly: true })
    });
    if (cobaltRes.ok) {
      const data = await cobaltRes.json();
      if (data && data.url) return res.status(200).json({ url: data.url });
    }
  } catch (e) {}

  // 2차 시도: Piped 분산 파이프라인
  try {
    const pipedRes = await fetch(`https://pipedapi.kavin.rocks/streams/${id}`);
    if (pipedRes.ok) {
      const data = await pipedRes.json();
      if (data && data.audioStreams && data.audioStreams.length > 0) {
        return res.status(200).json({ url: data.audioStreams[0].url });
      }
    }
  } catch (e) {}

  // 3차 시도: ytdl-core
  try {
    const info = await ytdl.getInfo(id);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
    if (format && format.url) return res.status(200).json({ url: format.url });
  } catch (e) {}

  return res.status(500).json({ error: 'All audio extraction methods failed' });
};
