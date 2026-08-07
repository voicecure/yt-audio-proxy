let grainPlayer = null;
let isPlaying = false;

// 복잡한 vercel.app 주소 필요 없이 내부 API 경로로 바로 통신합니다!
const VERCEL_SERVER_URL = "/api/stream?id=";

function extractVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
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
  status.innerText = "⏳ 서버에서 반주 추출 중...";

  try {
    const res = await fetch(VERCEL_SERVER_URL + videoId);
    const data = await res.json();

    if (!res.ok || !data.url) throw new Error(data.error || "음원 수신 실패");

    const iframe = document.getElementById('ytIframe');
    iframe.src = "https://www.youtube.com/embed/" + videoId + "?enablejsapi=1&mute=1";
    document.getElementById('videoContainer').style.display = "block";

    if (grainPlayer) grainPlayer.dispose();

    grainPlayer = new Tone.GrainPlayer(data.url, () => {
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
