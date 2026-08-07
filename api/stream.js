let grainPlayer = null;
let isPlaying = false;

function extractVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// 브라우저에서 직접 다중 우회 노드를 순회하여 음원을 가져오는 함수
async function fetchAudioStreamUrl(videoId) {
  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // 1차 시도: Cobalt API
  try {
    const res = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, downloadMode: 'audio', audioFormat: 'mp3' })
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && data.url) return data.url;
      }
    }
  } catch (e) {}

  // 2차 시도: Piped 분산 API 노드 순회
  const pipedNodes = [
    'https://api.piped.privacydev.net',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz'
  ];

  for (const node of pipedNodes) {
    try {
      const res = await fetch(`${node}/streams/${videoId}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data && data.audioStreams && data.audioStreams.length > 0) {
            return data.audioStreams[0].url;
          }
        }
      }
    } catch (e) {}
  }

  // 3차 시도: Invidious 분산 API 노드 순회
  const invidiousNodes = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza'
  ];

  for (const node of invidiousNodes) {
    try {
      const res = await fetch(`${node}/api/v1/videos/${videoId}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data && data.adaptiveFormats) {
            const audio = data.adaptiveFormats.find(f => f.type && f.type.includes('audio'));
            if (audio && audio.url) return audio.url;
          }
        }
      }
    } catch (e) {}
  }

  throw new Error("음원 추출에 실패했습니다. 다른 유튜브 링크로 시도해 보세요.");
}

async function loadAudioFromLink() {
  const urlInput = document.getElementById('ytUrlInput');
  const status = document.getElementById('statusMsg');
  const videoId = extractVideoId(urlInput.value.trim());

  if (!videoId) {
    alert("올바른 유튜브 주소를 입력해 보세요.");
    return;
  }

  status.style.color = "#3b52d4";
  status.innerText = "⏳ 반주 추출 중...";

  try {
    const audioUrl = await fetchAudioStreamUrl(videoId);

    const iframe = document.getElementById('ytIframe');
    iframe.src = "https://www.youtube.com/embed/" + videoId + "?enablejsapi=1&mute=1";
    document.getElementById('videoContainer').style.display = "block";

    if (grainPlayer) grainPlayer.dispose();

    grainPlayer = new Tone.GrainPlayer(audioUrl, () => {
      status.style.color = "#10b981";
      status.innerText = "🟢 준비 완료! 키와 박자를 조절하여 재생해 보세요.";
    }).toDestination();

    grainPlayer.overlap = 0.1;

  } catch (err) {
    status.style.color = "#ef4444";
    status.innerText = "⚠️ " + err.message;
  }
}

function changeKey(val) {
  document.getElementById('keyVal').innerText = (val > 0 ? '+' + val : val) + ' 키';
  if (grainPlayer) {
    grainPlayer.detune = val * 100;
  }
}

function changeSpeed(val) {
  document.getElementById('speedVal').innerText = val + 'x';
  if (grainPlayer) {
    grainPlayer.playbackRate = parseFloat(val);
  }
}

async function togglePlay() {
  if (!grainPlayer || !grainPlayer.loaded) {
    alert("먼저 링크를 넣고 [반주 불러오기]를 눌러보세요.");
    return;
  }

  await Tone.start();

  const btn = document.getElementById('btnPlay');
  if (isPlaying) {
    grainPlayer.stop();
    isPlaying = false;
    btn.innerText = "▶️ 반주 재생";
    btn.style.background = "#10b981";
  } else {
    grainPlayer.start();
    isPlaying = true;
    btn.innerText = "⏹️ 반주 정지";
    btn.style.background = "#ef4444";
  }
}
