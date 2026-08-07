let grainPlayer = null;
let isPlaying = false;

// 복사한 주소가 https://yt-audio-proxy-abc.vercel.app 인 경우의 작성 예시
const VERCEL_SERVER_URL = "https://yt-audio-proxy-abc.vercel.app/api/stream?id=";

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

  status.innerText = "⏳ Vercel 서버에서 음원 연결 중...";

  try {
    const res = await fetch(VERCEL_SERVER_URL + videoId);
    const data = await res.json();

    if (!data.url) throw new Error("음원 주소 수신 실패");

    // 가사 영상 출력
    const iframe = document.getElementById('ytIframe');
    iframe.src = "https://www.youtube.com/embed/" + videoId + "?enablejsapi=1&mute=1";
    document.getElementById('videoContainer').style.display = "block";

    // Tone.js 오디오 엔진 연동
    if (grainPlayer) grainPlayer.dispose();

    grainPlayer = new Tone.GrainPlayer(data.url, () => {
      status.innerText = "🟢 음원 로드 완료! 키와 박자를 조절해 보세요.";
    }).toDestination();

    grainPlayer.overlap = 0.1;

  } catch (err) {
    status.innerText = "⚠️ 음원을 가져오지 못했습니다. Vercel 서버 상태를 확인해 보세요.";
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
