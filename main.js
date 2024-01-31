// Import the necessary Three.js modules
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Create a scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

// create cube
const geometry = new THREE.BoxGeometry(1, 3, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xadadad });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1;
scene.add(floor);

// load shelf.glb from public folder
const loader = new GLTFLoader();

let shelf;
loader.load('/shelf.glb', (gltf) => {
  shelf = gltf.scene;
  //shelf.scale.set(0.1, 0.1, 0.1);
  shelf.position.y = -0.5;
  shelf.position.x = 2;
  scene.add(shelf);
});

const light = new THREE.PointLight(0xffffff, 10, 100);
light.position.set(0, 2, 2);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// render the scene from the second camera into a texture
const textureCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

textureCamera.position.z = 5;
const cameraHelper = new THREE.CameraHelper(textureCamera);
scene.add(cameraHelper);

scene.add(textureCamera);

const rtTexture = new THREE.WebGLRenderTarget(512, 512, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBFormat,
});

const rtTexture2 = new THREE.WebGLRenderTarget(512, 512, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBFormat,
});

// add a plane with the texture
// const planeGeometry = new THREE.PlaneGeometry(1, 1);
// const planeMaterial = new THREE.MeshBasicMaterial({ map: rtTexture.texture });
// const plane = new THREE.Mesh(planeGeometry, planeMaterial);
// plane.position.x = 2;
// plane.position.y = 0.5;
// scene.add(plane);
const crtShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    varying vec2 vUv;
    void main() {
      vec2 p = -1.0 + 2.0 * vUv;
      float len = length(p);
      vec2 uv = vUv + (p / len) * 0.1 * cos(len * 25.0 - time * 3.0);
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `,
};

let tv;
loader.load('/tv_mokia.glb', (gltf) => {
  tv = gltf.scene;
  console.log(tv);
  tv.scale.set(2, 2, 2);
  tv.position.y = -0.05;
  tv.position.x = 2;
  tv.traverse((child) => {
    console.log(child);
    if (child.isMesh && child.name === 'MSH_TV_Mokia_MAT_TV_Glass_0') {
      // make it glass
      child.material = new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        metalness: 0.5,
        roughness: 0.1,
        transparent: true,
        opacity: 0.4,
        thickness: 1,
      });
    }
    if (child.isMesh && child.name === 'MSH_TV_Mokia_MAT_TV_Screen_0') {
      child.material = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: rtTexture.texture },
          time: crtShader.uniforms.time,
        },
        vertexShader: crtShader.vertexShader,
        fragmentShader: crtShader.fragmentShader,
      });
    }
  });
  scene.add(tv);
});

const screenScene = new THREE.Scene();
const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
screenCamera.position.z = 1;
screenScene.add(screenCamera);

const screenGeometry = new THREE.PlaneGeometry(2, 2);
const screenMaterial = new THREE.MeshBasicMaterial({
  map: rtTexture2.texture,
});
const screen = new THREE.Mesh(screenGeometry, screenMaterial);
screenScene.add(screen);

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const TRcontrols = new TransformControls(camera, renderer.domElement);
TRcontrols.attach(textureCamera);
TRcontrols.addEventListener('change', () => {
  cameraHelper.update();
});

scene.add(TRcontrols);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

TRcontrols.addEventListener('dragging-changed', function (event) {
  controls.enabled = !event.value;
});

document.body.appendChild(renderer.domElement);

// Render the scene
function animate() {
  //controls.update();

  // render the scene from the first camera
  cameraHelper.visible = false;
  TRcontrols.visible = false;
  renderer.setRenderTarget(rtTexture2);
  renderer.render(scene, textureCamera);

  cameraHelper.visible = true;
  TRcontrols.visible = true;

  // render the scene from the second camera
  renderer.setRenderTarget(rtTexture);
  renderer.render(screenScene, screenCamera);

  //renderer.render(screenScene, screenCamera);
  // planeMaterial.map = rtTexture.texture;
  // planeMaterial.needsUpdate = true;

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  crtShader.uniforms.time.value += 0.05;

  requestAnimationFrame(animate);
}
animate();

function setRotateMode() {
  TRcontrols.setMode('rotate');
}

function setTranslateMode() {
  TRcontrols.setMode('translate');
}

document.getElementById('rotatebtn').addEventListener('click', setRotateMode);
document
  .getElementById('translatebtn')
  .addEventListener('click', setTranslateMode);
