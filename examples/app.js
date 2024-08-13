import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, DirectionalLight, MeshStandardMaterial, TextureLoader, SpotLight, ShaderMaterial, Vector2, WebGLRenderTarget, RGBAFormat,   NearestFilter, HalfFloatType,  MeshNormalMaterial} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { SketchyEffectPass } from '../sketchyEffect'
let touchDevice, viewportWidth, viewportHeight;

export class App {
  constructor() {
    this.container = document.querySelector(".webglCanvas");
    this.canvas = { width: this.container.offsetWidth, height: this.container.offsetHeight };

    if (matchMedia("(pointer: coarse)").matches) touchDevice = true;
    else touchDevice = false;

    document.querySelector(".arrowLeft").style.opacity = 1;

    this.initThree();
    this.loadModel();
    this.sketchyEffectInit();
  }


  initThree() {
    const pixelRatio = window.devicePixelRatio;
    let AA = true;
    if (touchDevice) AA = false;
    if (pixelRatio > 2) AA = false;

    this.renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      alpha: true,
      antialias: AA,
      stencil: false
    });
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.07, 1000.0);
    this.camera.position.z = 6;

    this.directLight = new DirectionalLight("#fff", 6.5);
    this.directLight.position.set(0, 0, 70);
    this.directLight.castShadow = false;
    this.scene.add(this.directLight);

    this.spotMoon = new SpotLight("#ffffff");
    this.spotMoon.position.set(0, 0, 5);
    this.spotMoon.target.position.set(0, 0, -10);
    this.spotMoon.target.updateMatrixWorld();
    this.spotMoon.intensity = 6;

    const resizeObserver = new ResizeObserver((en) => { this.onResize(en[0].contentRect) });
    resizeObserver.observe(document.body);
  }



  loadModel() {
    this.loader = new GLTFLoader();
    this.loader.load(('./marcus.glb'), (response) => {
      let material = new MeshStandardMaterial({
        metalness: 0.6,
        roughness: 0.4,
      });
      this.figure = new Mesh(response.scene.children[0].geometry, material);
      this.figure.position.set(0, -0, 3.5);
      this.figure.castShadow = false;
      this.figure.receiveShadow = false;
      this.scene.add(this.figure);
      this.animate()
    })
  }


  sketchyEffectInit() {
    webgl = this;

    const textureLoader = new TextureLoader();
    this.texture = textureLoader.load('/noise.png');
    //this.texture.anisotropy = 16;

    const renderPass = new RenderPass(this.scene, this.camera)
    const sketchyEffectPass = new SketchyEffectPass(this)

    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(viewportWidth, viewportHeight);
    this.composer.addPass(renderPass)
    this.composer.addPass(sketchyEffectPass)
  }


  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.figure.rotation.y += 0.003;
    this.composer.render(this.scene, this.camera);
    //this.renderer.render(this.scene, this.camera);
  }


  onResize(contentRect) {
    viewportWidth = contentRect.width;
    viewportHeight = contentRect.height;
    this.canvas = { width: contentRect.width, height: contentRect.height };
    this.camera.aspect = contentRect.width / contentRect.height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(contentRect.width, contentRect.height);
  }
}