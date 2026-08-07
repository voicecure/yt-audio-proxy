const ytdl = require('@distube/ytdl-core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID missing' });

  try {
    const info = await ytdl.getInfo(id);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
    
    if (!format) {
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    return res.status(200).json({ url: format.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
