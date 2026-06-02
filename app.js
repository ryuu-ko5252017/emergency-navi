// --- グローバル変数 ---
let currentPos = { x: null, y: null }; 
let targetPos = { x: null, y: null };
let heading = 0;
let videoStream = null;
let points = JSON.parse(localStorage.getItem('nav_points')) || [];

const video = document.getElementById('video');
const posDisplay = document.getElementById('pos');
const targetNameDisplay = document.getElementById('target-name');
const distDisplay = document.getElementById('dist');
const accDisplay = document.getElementById('acc');
const compass = document.getElementById('compass');

// --- 1. 座標リスト管理 ---
function renderList() {
    const listEl = document.getElementById('point-list');
    if(!listEl) return;
    listEl.innerHTML = points.map((p, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:rgba(255,255,255,0.1); padding:8px; border-radius:4px;">
            <span onclick="setTarget(${i})" style="flex:1; cursor:pointer;">📍 ${p.name}</span>
            <button onclick="deletePoint(${i})" style="background:none; border:none; color:#ff6666; padding:5px;">削除</button>
        </div>
    `).join('');
}

// クリップボード取込機能の強化
async function importFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        // Googleマップ形式: "34.7024, 135.4959" を正規表現で抽出
        const match = text.match(/(-?[0-9]+\.[0-9]+)\s*,\s*(-?[0-9]+\.[0-9]+)/);
        if (match) {
            const newPoint = {
                name: `地点 ${points.length + 1}`,
                x: parseFloat(match[1]),
                y: parseFloat(match[2])
            };
            points.push(newPoint);
            saveAndRender();
            alert("座標を追加しました。リストから目的地を選択してください。");
        } else {
            alert("クリップボードに正しい座標（例: 34.123, 135.123）がありません。");
        }
    } catch (err) {
        alert("ブラウザの設定でクリップボードの読み取りを許可してください。");
    }
}

function setTarget(index) {
    targetPos = points[index];
    if(targetNameDisplay) targetNameDisplay.innerText = targetPos.name;
    updateNavigation();
}

function saveAndRender() {
    localStorage.setItem('nav_points', JSON.stringify(points));
    renderList();
}

function deletePoint(index) {
    points.splice(index, 1);
    saveAndRender();
}

function clearList() {
    if(confirm("全リストを消去しますか？")) {
        points = [];
        saveAndRender();
    }
}

// --- 2. カメラ・QRスキャン制御 ---
async function toggleCamera() {
    const btn = document.getElementById('camBtn');
    if (videoStream) {
        stopCamera();
        if(btn) btn.innerText = "📷 カメラ起動 (QRスキャン)";
    } else {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: \"environment\" } });
            video.srcObject = videoStream;
            video.style.display = 'block';
            if(btn) btn.innerText = "× カメラを閉じる";
            requestAnimationFrame(tick);
        } catch (e) { alert("カメラの使用を許可してください"); }
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
            // カンマ区切りのデータを解析（Googleマップの2項目でも、名前付きの3項目でもOK）
            const data = code.data.split(',').map(s => s.trim());
            const lat = parseFloat(data[0]);
            const lng = parseFloat(data[1]);

            if (!isNaN(lat) && !isNaN(lng)) {
                currentPos.x = lat;
                currentPos.y = lng;
                posDisplay.innerText = data[2] || `現在地(${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                
                stopCamera();
                const btn = document.getElementById('camBtn');
                if(btn) btn.innerText = "📷 カメラ起動 (QRスキャン)";
                updateNavigation();
                return; 
            }
        }
    }
    updateNavigation();
    requestAnimationFrame(tick);
}

// --- 3. センサーと方位計算 ---
window.addEventListener('deviceorientation', (event) => {
    heading = event.webkitCompassHeading || (360 - event.alpha);
    if(accDisplay) accDisplay.innerText = event.absolute ? \"高\" : \"低\";
    updateNavigation();
}, true);

function updateNavigation() {
    if (currentPos.x === null || targetPos.x === null) return;

    const dy = targetPos.x - currentPos.x; // 緯度差
    const dx = targetPos.y - currentPos.y; // 経度差
    
    // 距離計算（度をメートルに概算）
    const distance = Math.sqrt(dx * dx + dy * dy) * 111320; 
    
    // 方位計算
    const angleToTarget = Math.atan2(dx, dy) * (180 / Math.PI);
    const relativeAngle = angleToTarget - heading;
    
    compass.style.transform = `rotate(${relativeAngle}deg)`;
    distDisplay.innerText = Math.round(distance);
}

// 初期化
renderList();