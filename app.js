const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const summaryBox = document.createElement('div');
const switchCameraButton = document.getElementById('switch-camera');

summaryBox.style.position = 'absolute';
summaryBox.style.padding = '10px';
summaryBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
summaryBox.style.color = 'white';
summaryBox.style.borderRadius = '5px';
summaryBox.style.fontSize = '14px';
summaryBox.style.maxWidth = '250px';
summaryBox.style.display = 'none';

document.body.appendChild(summaryBox);

let currentStream;

async function setupCamera(deviceId = null) {
    if (currentStream) {
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
    }

    const constraints = {
        video: {
            width: 640,
            height: 480,
            deviceId: deviceId ? { exact: deviceId } : undefined
        },
        audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    video.srcObject = stream;
   video.onloadedmetadata = () => {
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
};



    return new Promise((resolve) => {
        video.onloadeddata = () => {
            resolve(video);
        };
    });
}

switchCameraButton.addEventListener('click', async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const currentDevice = videoDevices.find(device => device.deviceId === currentStream.getVideoTracks()[0].getSettings().deviceId);
    const nextDeviceIndex = (videoDevices.indexOf(currentDevice) + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextDeviceIndex];
    await setupCamera(nextDevice.deviceId);
    video.play();
    detectObjects(); // Restart object detection after switching camera
});


function isPointInRect(x, y, rect) {
    return x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3];
}

async function fetchWikipediaSummary(title) {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (response.ok) {
        const data = await response.json();
        return data.extract;
    } else {
        return 'No summary available';
    }
}

canvas.addEventListener('click', async event => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (const prediction of currentPredictions) {
        if (isPointInRect(x, y, prediction.bbox)) {
            const summary = await fetchWikipediaSummary(prediction.class);
            summaryBox.style.display = 'block';
            summaryBox.style.left = `${prediction.bbox[0] + prediction.bbox[2]}px`;
            summaryBox.style.top = `${prediction.bbox[1]}px`;
            summaryBox.textContent = summary;
            return;
        }
    }

    summaryBox.style.display = 'none';
});

function getColorBySize(bbox) {
    const area = bbox[2] * bbox[3];
    const maxArea = canvas.width * canvas.height;
    const ratio = area / maxArea;

    const red = 255;
    const green = Math.floor(255 * ratio);
const blue = 0;

return `rgb(${red}, ${green}, ${blue})`;
}

async function drawPredictions(predictions) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'top';

    // Clear previous description boxes
    const descriptionContainer = document.getElementById('description-container');
    descriptionContainer.innerHTML = '';

    predictions.forEach(prediction => {
        const x = prediction.bbox[0];
        const y = prediction.bbox[1];
        const width = prediction.bbox[2];
        const height = prediction.bbox[3];

        ctx.strokeStyle = getColorBySize(prediction.bbox);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

// Handle click events on the canvas
canvas.addEventListener('click', function(event) {
  const x = event.clientX - canvas.getBoundingClientRect().left;
  const y = event.clientY - canvas.getBoundingClientRect().top;
  const clickedObject = detectedObjects.find(obj => {
    const [x1, y1, width, height] = obj.bbox;
    return x >= x1 && x <= x1 + width && y >= y1 && y <= y1 + height;
  });
  if (clickedObject) {
    const {bbox, detectedClass, score} = clickedObject;
    const [x1, y1] = bbox;
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Class: ${detectedClass}, Score: ${score.toFixed(2)}`, x1, y1);
  }
});

        ctx.fillStyle = getColorBySize(prediction.bbox);
        ctx.fillText(prediction.class, x, y);

        // Create and position the description box
        const descriptionBox = document.createElement('div');
        descriptionBox.className = 'description-box';
        descriptionBox.textContent = prediction.class;

        descriptionBox.style.position = 'absolute';
        descriptionBox.style.left = `${x}px`;
        descriptionBox.style.top = `${y + height}px`;

        descriptionContainer.appendChild(descriptionBox);
    });
}


let currentPredictions = [];

const speakButton = document.getElementById('speak');

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

speakButton.addEventListener('click', () => {
    if (currentPredictions.length > 0) {
        // Speak the class of the first detected object
        speak(currentPredictions[0].class);
    } else {
        // Speak a message if no objects are detected
        speak('No objects detected');
    }
});


async function detectObjects() {
const model = await cocoSsd.load();

async function detectFrame() {
    currentPredictions = await model.detect(video);
// Initialize an array to store detected object data
const detectedObjects = [];

// Update the detectedObjects array after object detection
currentPredictions.forEach(prediction => {
  const {bbox, class: detectedClass, score} = prediction;
  detectedObjects.push({
    bbox,
    detectedClass,
    score
  });
});

// Optionally, save detectedObjects to local storage
localStorage.setItem('detectedObjects', JSON.stringify(detectedObjects));
    drawPredictions(currentPredictions);
    requestAnimationFrame(detectFrame);
}

detectFrame();
}

(async function() {
const videoElement = await setupCamera();
videoElement.play();
detectObjects();
})();


// Initialize TensorFlow.js and COCO-SSD model
let model;
async function loadModel() {
  model = await cocoSsd.load();
}

// Initialize Three.js for 3D rendering

// Initialize Three.js for 3D rendering
let scene, camera, renderer, mesh;
function initThreeJS() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
  renderer.setSize(canvas.width, canvas.height);
  camera.position.z = 5;

  // Load the 3D model
  const loader = new THREE.GLTFLoader();
  loader.load('polforweb.glb', function(gltf) {
    mesh = gltf.scene;
    scene.add(mesh);
  });
}

// Draw bounding boxes and labels for detected objects
function drawBoundingBoxes(predictions) {
  predictions.forEach(prediction => {
    const [x, y, width, height] = prediction['bbox'];
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);

    // Draw the label background
    ctx.fillStyle = '#00FF00';
    const textWidth = ctx.measureText(prediction['class']).width;
    ctx.fillRect(x, y - 20, textWidth + 10, 20);

    // Draw the text last to ensure it's on top
    ctx.fillStyle = '#000000';
    ctx.fillText(prediction['class'], x + 5, y - 5);
  });
}

// Main Loop
function animate() {
  detectObjects();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Initialize and run
loadModel().then(() => {
  initThreeJS();
  setupCamera().then(() => {
    animate();
  });
});


let selectedObject = null;

// Object Detection Function
async function detectObjects() {
  const predictions = await model.detect(video);
  // Clear previous canvas drawings
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw bounding box for each detected object
  predictions.forEach(prediction => {
    // TODO: Draw bounding box and labels
  });

  // If an object is selected
  if (selectedObject) {
    // TODO: Position the 3D model on the object
  }
}

// User Selection
canvas.addEventListener('click', function(event) {
  // TODO: Identify the clicked object
  // Set selectedObject
});

// Main Loop
function animate() {
  detectObjects();
  // TODO: Update 3D model
  requestAnimationFrame(animate);
}

// Initialize and run
loadModel().then(() => {
  setupCamera().then(() => {
    animate();
  });
});
