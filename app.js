// app.js
let currentPos = { x: 0, y: 0 };
let targetPos = { x: 0, y: 0 };
let points = JSON.parse(localStorage.getItem('nav_points')) || []; // 保存されたリスト
let videoStream = null;

// 1. 座標リストの描画
function renderList() {
    const listEl = document.getElementById('point-list');
    listEl.innerHTML = points.map((p, i) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #444; padding:5px;">
            <span onclick="setTarget(${i})" style="cursor:pointer;">📍 ${p.name}</span>
            <button onclick="deletePoint(${i})" style="background:none; border:none; color:red;">×</button>
        </div>
    `).join('');
}

// 2. クリップボードからGoogleマップの座標を取込
async function importFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        // 緯度,経度のパターンを抽出 (例: 34.7024, 135.4959)
        const match = text.match(/([0-9]+\.[0-9]+)\s*,\s*([0-9]+\.[0-9]+)/);
        if (match) {
            const newPoint = {
                name: `地点 ${points.length + 1}`,
                x: parseFloat(match[1]),
                y: parseFloat(match[2])
            };
            points.push(newPoint);
            saveAndRender();
            alert("座標を追加しました");
        } else {
            alert("クリップボードに有効な座標がありません");
        }
    } catch (err) {
        alert("クリップボードへのアクセスが拒否されました");
    }
}

// 3. カメラのON/OFF制御 (バッテリー節約)
async function toggleCamera() {
    const v = document.getElementById('video');
    if (videoStream) {
        // 停止
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        v.style.display = 'none';
        document.getElementById('camBtn').innerText = "カメラ起動 (QRスキャン)";
    } else {
        // 起動
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            v.srcObject = videoStream;
            v.style.display = 'block';
            document.getElementById('camBtn').innerText = "カメラを停止";
            requestAnimationFrame(tick);
        } catch (e) {
            alert("カメラを起動できません");
        }
    }
}

// 補助関数
function saveAndRender() {
    localStorage.setItem('nav_points', JSON.stringify(points));
    renderList();
}

function setTarget(index) {
    targetPos = points[index];
    document.getElementById('target-name').innerText = targetPos.name;
    alert(`目的地を「${targetPos.name}」に設定しました`);
}

function deletePoint(index) {
    points.splice(index, 1);
    saveAndRender();
}

function clearList() {
    if(confirm("リストを全て消去しますか？")) {
        points = [];
        saveAndRender();
    }
}

// 初期化
renderList();