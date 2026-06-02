// --- グローバル変数 ---
let currentPos = { x: 0, y: 0 };
let targetPos = { x: 0, y: 0 };
let heading = 0;
let videoStream = null;
let points = JSON.parse(localStorage.getItem('nav_points')) || [];

const video = document.getElementById('video');
const posDisplay = document.getElementById('pos');
const targetNameDisplay = document.getElementById('target-name');
const distDisplay = document.getElementById('dist');
const accDisplay = document.getElementById('acc');
const compass = document.getElementById('compass');

// --- 1. 座標リストの管理機能 ---

function renderList() {
    const listEl = document.getElementById('point-list');
    listEl.innerHTML = points.map((p, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:rgba(255,255,255,0.1); padding:8px; border-radius:4px;">
            <span onclick="setTarget(${i})" style="flex:1; cursor:pointer;">📍 ${p.name}</span>
            <button onclick="deletePoint(${i})" style="background:none; border:none; color:#ff6666; padding:5px;">削除</button>
        </div>
    `).join('');
}

async function importFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        // Googleマップの座標形式 (緯度, 経度) を抽出
        const match = text.match(/(-?[0-9]+\.[0-9]+)\s*,\s*(-?[0-9]+\.[0-9]+)/);
        if (match) {
            const newPoint = {
                name: `地点 ${points.length + 1}`,
                x: parseFloat(match[1]),
                y: parseFloat(match[2])
            };
            points.push(newPoint);
            saveAndRender();
        } else {
            alert("クリップボードに「緯度, 経度」の形式が見つかりません");
        }
    } catch (err) {
        alert("クリップボードの読み取りを許可してください");
    }
}

function setTarget(index) {
    targetPos = points[index];
    targetNameDisplay.innerText = targetPos.name;
}

function deletePoint(index) {
    points.splice(index, 1);
    saveAndRender();
}

function clearList() {
    if(confirm("全てのリストを削除しますか？")) {
        points = [];
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem('nav_points', JSON.stringify(points));
    renderList();
}

// --- 2. カメラ・QRスキャン制御 ---

async function toggleCamera() {
    const btn = document.getElementById('camBtn');
    if (videoStream) {
        stopCamera();
        btn.innerText = "📷 カメラ起動 (QRスキャン)";
    } else {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = videoStream;
            video.style.display = 'block';
            btn.innerText = "× カメラを閉じる";
            requestAnimationFrame(tick);
        } catch (e) {
            alert("カメラの使用を許可してください");
        }
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        video.style.display = 'none';
    }
}

function tick() {
    if (!videoStream) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.getElementById('canvas');
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            // QR形式: "緯度,経度,場所名"
            const data = code.data.split(',');
            if (data.length >= 2) {
                currentPos.x = parseFloat(data[0]);
                currentPos.y = parseFloat(data[1]);
                posDisplay.innerText = data[2] || `現在地(${currentPos.x.toFixed(4)}, ${currentPos.y.toFixed(4)})`;
                stopCamera(); // スキャン成功で自動停止
                document.getElementById('camBtn').innerText = "📷 カメラ起動 (QRスキャン)";
            }
        }
    }
    updateNavigation();
    requestAnimationFrame(tick);
}

// --- 3. センサーと方位計算 ---

window.addEventListener('deviceorientation', (event) => {
    // iOS/Android両対応の方位取得
    heading = event.webkitCompassHeading || (360 - event.alpha);
    accDisplay.innerText = event.absolute ? "高" : "低";
}, true);

function updateNavigation() {
    if (!currentPos.x || !targetPos.x) return;

    const dx = targetPos.y - currentPos.y; // 経度差
    const dy = targetPos.x - currentPos.x; // 緯度差
    
    // 簡易的な距離計算 (緯度経度をそのまま平面として扱う)
    // ※本来はヒュベニの公式等が必要ですが、近距離ならこれで動きます
    const distance = Math.sqrt(dx * dx + dy * dy) * 111320; // 度からメートルへ概算
    
    const angleToTarget = Math.atan2(dx, dy) * (180 / Math.PI);
    const relativeAngle = angleToTarget - heading;
    
    compass.style.transform = `rotate(${relativeAngle}deg)`;
    distDisplay.innerText = Math.round(distance);
}

// 初期化
renderList();