// === Unity Setup ===
let unityInstance = null;
let isCameraReady = false;
let gl = null;
let isDetectionManagerReady = false;

// Define the loaderUrl and config
const loaderUrl = "Build/UnityLoader.js";  // Path to UnityLoader.js
const config = {
    dataUrl: "Build/ARCheck.data.unityweb",  // Path to the .data.unityweb file
    frameworkUrl: "Build/ARCheck.wasm.framework.unityweb",  // Path to the framework .unityweb file
    codeUrl: "Build/ARCheck.wasm",  // Path to the .wasm file
};

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

    const cameraEntity = document.createElement('a-entity');
    cameraEntity.setAttribute('id', 'cameraRig');
    cameraEntity.setAttribute('camera', '');
    cameraEntity.setAttribute('look-controls', '');
    cameraEntity.setAttribute('cameratransform', '');

    arScene.appendChild(cameraEntity);
    document.body.appendChild(arScene);
}

// === Sync A-Frame Camera to Unity ===
AFRAME.registerComponent('cameratransform', {
    tock: function (time, timeDelta) {
        let camtr = new THREE.Vector3();
        let camro = new THREE.Quaternion();
        let camsc = new THREE.Vector3();

        this.el.object3D.matrix.clone().decompose(camtr, camro, camsc);

        const projection = this.el.components.camera.camera.projectionMatrix.clone();
        const serializedProj = `${[...projection.elements]}`

        const posCam = `${[...camtr.toArray()]}`
        const rotCam = `${[...camro.toArray()]}`

        if (isCameraReady) {
            unityInstance.SendMessage("Main Camera", "setProjection", serializedProj);
            unityInstance.SendMessage("Main Camera", "setPosition", posCam);
            unityInstance.SendMessage("Main Camera", "setRotation", rotCam);

            // Ensure the canvas is available before using it
            //const canvas = document.querySelector("#unity-canvas");
            //if (canvas) {
            //    //const w = window.innerWidth;
            //    //const h = window.innerHeight;
            //    //const ratio = canvas.height / h;
            //    //const scaledW = w * ratio;
            //    //const scaledH = h * ratio;

            //    //unityInstance.SendMessage("Canvas", "setSize", `${scaledW},${scaledH}`);
            //}
        }

        if (gl != null) {
            gl.dontClearOnFrameStart = true;
        }
    }
});

window.addEventListener('load', () => {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, height=device-height, initial-scale=1.0, user-scalable=no";
    document.head.appendChild(meta);

    // Get DOM elements for Unity and loading
    const container = document.querySelector("#unity-container");
    const canvas = document.querySelector("#unity-canvas"); // Ensure this is correct
    const loadingBar = document.querySelector("#loadingBar");
    const progressBarFull = document.querySelector("#progressBarFull");
    const fullscreenButton = document.querySelector("#fullscreenButton");

    if (!container || !canvas || !loadingBar || !progressBarFull || !fullscreenButton) {
        console.error("Missing one or more required DOM elements!");
        return; // Exit early if required elements are missing
    }

    // Add class names
    container.className = "unity-mobile";
    canvas.className = "unity-mobile";

    // Show loading bar
    loadingBar.style.display = "block";

    // Load UnityLoader.js
    const unityLoader = document.createElement("script");
    unityLoader.src = "Build/UnityLoader.js";

    unityLoader.onload = () => {
        unityInstance = UnityLoader.instantiate("unity-canvas", "Build/ARCheck.json", {
            dataUrl: "Build/ARCheck.data.unityweb",
            frameworkUrl: "Build/ARCheck.wasm.framework.unityweb",
            codeUrl: "Build/ARCheck.wasm",
            Module: {
                onProgress: function (unityInstance, progress) {
                    if (progressBarFull) {
                        progressBarFull.style.width = `${progress * 100}%`;
                    }
                }
            }
        });

        unityInstance.onload = () => {
            loadingBar.style.display = "none";
            fullscreenButton.onclick = () => unityInstance.SetFullscreen(1);

            // Start A-Frame after Unity is ready
            startAFrameScene();

            if (typeof cameraReady === "function") {
                cameraReady();
            }
        };
    };

    document.body.appendChild(unityLoader);
});
