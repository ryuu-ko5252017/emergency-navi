const video = document.getElementById('video');
const posDisplay = document.getElementById('pos');
const distDisplay = document.getElementById('dist');
const compass = document.getElementById('compass');

let currentPos = { x: 0, y: 0 };
let targetPos = { x: 50, y: 100 }; // 仮の目的地座標
let heading = 0; // スマホが向いている方位

// 1. カメラの開始
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
        video.srcObject = stream;
        requestAnimationFrame(tick);
    });

// 2. センサーへのアクセス許可（iOSなどの対応）
function requestSensorPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission();
    }
}
window.addEventListener('click', requestSensorPermission, {once: true});

// 3. QRコードの解析（jsQRライブラリを使用）
function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.getElementById('canvas');
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            // QRコードに "x,y,name" の形式でデータが入っていると仮定
            const data = code.data.split(',');
            if(data.length >= 2) {
                currentPos.x = parseFloat(data[0]);
                currentPos.y = parseFloat(data[1]);
                posDisplay.innerText = data[2] || `座標(${currentPos.x}, ${currentPos.y})`;
                console.log("座標をリセットしました");
            }
        }
    }
    updateNavigation();
    requestAnimationFrame(tick);
}

// 4. 方位と距離の計算
window.addEventListener('deviceorientation', (event) => {
    // 磁気偏角を考慮した絶対方位（webappでは地磁気が狂いやすい点に注意）
    heading = event.webkitCompassHeading || (360 - event.alpha);
    document.getElementById('acc').innerText = event.absolute ? "高" : "低";
});

function updateNavigation() {
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 目的地への方位角計算 (ラジアン -> 度)
    const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // コンパスの回転（スマホの向きと目的地の相対角）
    const relativeAngle = angleToTarget - heading;
    compass.style.transform = `rotate(${relativeAngle}deg)`;
    distDisplay.innerText = Math.round(distance);
}