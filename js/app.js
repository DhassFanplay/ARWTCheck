let unityInstance = null;
let isCameraReady = false;
let gl = null;

function cameraReady() {
    isCameraReady = true;
    gl = unityInstance.Module.ctx;
    startAFrameScene();
}

function startAFrameScene() {
    console.log("📷 Creating A-Frame AR scene...");

    const arScene = document.createElement('a-scene');
    arScene.id = "ar-scene";
    arScene.setAttribute("embedded", "");
    arScene.setAttribute("vr-mode-ui", "enabled: false");
    arScene.setAttribute("arjs", "sourceType: webcam; debugUIEnabled: false;");

    // 💡 Set style to ensure Unity renders on top
    //arScene.style.position = "absolute";
    arScene.style.zIndex = "1";
    arScene.style.top = "0";
    arScene.style.left = "0";
    arScene.style.width = "0vw";
    arScene.style.height = "0vh";

    const cameraEntity = document.createElement('a-entity');
    cameraEntity.setAttribute('id', 'cameraRig');
    cameraEntity.setAttribute('camera', '');
    cameraEntity.setAttribute('look-controls', '');
    cameraEntity.setAttribute('cameratransform', '');

    arScene.appendChild(cameraEntity);
    document.body.appendChild(arScene);
}


AFRAME.registerComponent('cameratransform', {
    tock: function () {
        let camtr = new THREE.Vector3();
        let camro = new THREE.Quaternion();
        let camsc = new THREE.Vector3();

        this.el.object3D.matrix.clone().decompose(camtr, camro, camsc);

        const projection = this.el.components.camera.camera.projectionMatrix.clone();
        const projCam = [...projection.elements].join(",");
        const posCam = camtr.toArray().join(",");
        const rotCam = camro.toArray().join(",");

        if (isCameraReady && unityInstance) {
            unityInstance.SendMessage("CameraMain", "setProjection", projCam);
            unityInstance.SendMessage("CameraMain", "setPosition", posCam);
            unityInstance.SendMessage("CameraMain", "setRotation", rotCam);

            const canvas = document.getElementsByTagName('canvas')[0];
            const ratio = canvas.height / window.innerHeight;
            const scaledW = window.innerWidth * ratio;
            const scaledH = window.innerHeight * ratio;
            unityInstance.SendMessage("Canvas", "setSize", `${scaledW},${scaledH}`);
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

    const container = document.querySelector("#unity-container");
    const canvas = document.querySelector("#unity-canvas");
    const loadingBar = document.querySelector("#loadingBar");
    const progressBarFull = document.querySelector("#progressBarFull");
    const fullscreenButton = document.querySelector("#fullscreenButton");

    if (!container || !canvas || !loadingBar || !progressBarFull || !fullscreenButton) {
        console.error("❌ Missing required DOM elements");
        return;
    }

    //loadingBar.style.display = "block";

    const unityLoader = document.createElement("script");
    unityLoader.src = "Build/UnityLoader.js";

    unityLoader.onload = () => {
        unityInstance = UnityLoader.instantiate("unity-container", "Build/ARCheck.json", {
            dataUrl: "Build/ARCheck.data.unityweb",
            frameworkUrl: "Build/ARCheck.wasm.framework.unityweb",
            codeUrl: "Build/ARCheck.wasm",
            Module: {
                onProgress: function (_, progress) {
                    if (progressBarFull) {
                        progressBarFull.style.width = `${progress * 100}%`;
                    }
                }
            }
        });
        console.log("🔁 UnityLoader loaded...");

        console.log("✅ Unity loaded successfully.");
        loadingBar.style.display = "none";
        cameraReady();

    };

    document.body.appendChild(unityLoader);
});
