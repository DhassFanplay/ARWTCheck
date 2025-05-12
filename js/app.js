// === Unity Setup ===
let unityInstance = null;
let isCameraReady = false;
let gl = null;

function cameraReady() {
    isCameraReady = true;
    gl = unityInstance.Module.ctx;
}

function detectionManagerReady() {
    isDetectionManagerReady = true;
}

function createUnityMatrix(el) {
    const m = el.matrix.clone();
    const zFlipped = new THREE.Matrix4().makeScale(1, 1, -1).multiply(m);
    return zFlipped.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
}

// === A-Frame Scene Setup ===
function startAFrameScene() {
    const arScene = document.createElement('a-scene');
    arScene.id = "ar-scene";
    arScene.setAttribute("embedded", "");
    arScene.setAttribute("vr-mode-ui", "enabled: false");
    arScene.setAttribute("arjs", "sourceType: webcam; debugUIEnabled: false;");

    // Add camera entity with transform syncing
    const cameraEntity = document.createElement('a-entity');
    cameraEntity.setAttribute('id', 'cameraRig');
    cameraEntity.setAttribute('camera', '');
    cameraEntity.setAttribute('look-controls', '');
    cameraEntity.setAttribute('cameratransform', '');

    // Append to scene
    arScene.appendChild(cameraEntity);

    // Inject into DOM
    document.body.appendChild(arScene);
}

// === Sync A-Frame Camera to Unity ===
AFRAME.registerComponent('cameratransform', {
    tock: function (time, timeDelta) {
        let camtr = new THREE.Vector3();
        let camro = new THREE.Quaternion();
        this.el.object3D.matrix.clone().decompose(camtr, camro, new THREE.Vector3());

        const projection = this.el.components.camera.camera.projectionMatrix.clone();
        const posCam = camtr.toArray();
        const rotCam = camro.toArray();
        const projCam = projection.elements;

        if (isCameraReady) {
            unityInstance.SendMessage("Main Camera", "setProjection", JSON.stringify(projCam));
            unityInstance.SendMessage("Main Camera", "setPosition", JSON.stringify(posCam));
            unityInstance.SendMessage("Main Camera", "setRotation", JSON.stringify(rotCam));

            const w = window.innerWidth;
            const h = window.innerHeight;
            const unityCanvas = document.getElementById('unity-canvas');

            const ratio = unityCanvas.height / h;
            const scaledW = w * ratio;
            const scaledH = h * ratio;

            unityInstance.SendMessage("Canvas", "setSize", `${scaledW},${scaledH}`);
        }

        if (gl != null) {
            gl.dontClearOnFrameStart = true;
        }
    }
});

// === Inject A-Frame Scene after Unity Loads ===
window.addEventListener('load', () => {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, height=device-height, initial-scale=1.0, user-scalable=no";
    document.head.appendChild(meta);
    container.className = "unity-mobile";
    canvas.className = "unity-mobile";

    loadingBar.style.display = "block";

    const unityLoader = document.createElement("script");
    unityLoader.src = loaderUrl;

    unityLoader.onload = () => {
        createUnityInstance(canvas, config, (progress) => {
            progressBarFull.style.width = `${progress * 100}%`;
        }).then((instance) => {
            unityInstance = instance;
            loadingBar.style.display = "none";
            fullscreenButton.onclick = () => unityInstance.SetFullscreen(1);

            // Start A-Frame after Unity is ready
            startAFrameScene();

            // Optional: Call any Unity-ready functions here
            if (typeof cameraReady === "function") {
                cameraReady();
            }
        }).catch((message) => alert(message));
    };

    document.body.appendChild(unityLoader);
});
