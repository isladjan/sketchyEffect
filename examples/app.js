import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, DirectionalLight, MeshStandardMaterial, TextureLoader, SpotLight, ShaderMaterial, Vector2, WebGLRenderTarget, RGBAFormat,   NearestFilter, HalfFloatType,  MeshNormalMaterial} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
//import { SketchyEffectPass } from '../sketchyEffect'
let touchDevice, viewportWidth, viewportHeight;
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';

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
    const self = this;

    const textureLoader = new TextureLoader();
    this.texture = textureLoader.load('/noise.png');
    //this.texture.anisotropy = 16;
    //this.renderer.initTexture(this.texture);

    webgl = this;



    class PencilLinesShader extends ShaderMaterial {
      constructor(engine) {
        super({
          
          uniforms: {
            uDiffuse: { value: null },
            uResolution: {
              value: new Vector2(1, 1)
            },
            uDepthBuffer: { value: null },
            uSurfaceBuffer: { value: null },
            uNear: { value: webgl.camera.near },
            uFar: { value: webgl.camera.far },
    
            // uColorTexture: {
            //   value: engine.resources.getItem("colorNoiseTexture")
            // },
            uCloudTexture: {
              value: webgl.texture
            }
          },
          fragmentShader: `#include <packing>
uniform sampler2D uDiffuse;
uniform sampler2D uSurfaceBuffer;
uniform sampler2D uDepthBuffer;
uniform sampler2D uCloudTexture;
//uniform sampler2D uColorTexture;
uniform float uNear;
uniform float uFar;
uniform vec2 uResolution;
varying vec2 vUv;

vec2 grad(ivec2 z) {
    // 2D to 1D  (feel free to replace by some other)
    int n = z.x+z.y*11111;

    // Hugo Elias hash (feel free to replace by another one)
    n = (n<<13)^n;
    n = (n*(n*n*15731+789221)+1376312589)>>16;
    #if 0
    return vec2(cos(float(n)), sin(float(n)));
    #else
    // Perlin style vectors
    n &= 7;
    vec2 gr = vec2(n&1, n>>1)*2.0-1.0;
    return (n>=6) ? vec2(0.0, gr.x) :
    (n>=4) ? vec2(gr.x, 0.0) :
    gr;
    #endif
}

float noise(in vec2 p) {
    ivec2 i = ivec2(floor(p));
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);// feel free to replace by a quintic smoothstep instead
    return mix(mix(dot(grad(i+ivec2(0, 0)), f-vec2(0.0, 0.0)),
    dot(grad(i+ivec2(1, 0)), f-vec2(1.0, 0.0)), u.x),
    mix(dot(grad(i+ivec2(0, 1)), f-vec2(0.0, 1.0)),
    dot(grad(i+ivec2(1, 1)), f-vec2(1.0, 1.0)), u.x), u.y);
}

float valueAtPoint(sampler2D image, vec2 coord, vec2 texel, vec2 point) {
    vec3 luma = vec3(0.299, 0.587, 0.114);
    return dot(texture2D(image, coord + texel * point).xyz, luma);
}

float diffuseValue(int x, int y) {
    float cutoff = 80.0;
    float offset =  0.5 / cutoff;
    float noiseValue = clamp(texture(uCloudTexture, vUv).r, 0.0, cutoff) / cutoff - offset;
    return valueAtPoint(uDiffuse, vUv + noiseValue, vec2(1.0 / uResolution.x, 1.0 / uResolution.y), vec2(x, y)) * 0.6;
}

float normalValue(int x, int y) {
    float cutoff = 100.0;
    float offset = 0.1 / cutoff;
    float noiseValue = clamp(texture(uCloudTexture, vUv).r, 0.0, cutoff) / cutoff - offset;
    return valueAtPoint(uSurfaceBuffer, vUv + noiseValue, vec2(1.0 / uResolution.x, 1.0 / uResolution.y), vec2(x, y)) * 0.3;
}

float getValue(int x, int y) {
    float noiseValue = noise(gl_FragCoord.xy);
    noiseValue = noiseValue * 2.0 - 1.0;
    noiseValue *= 7.0;
    return diffuseValue(x, y) + normalValue(x, y) * noiseValue;
}

float getPixelDepth(int x, int y) {
    float fragCoordZ = texture2D(uDepthBuffer, vUv + vec2(x, y) * 1.0 / uResolution).x;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, uNear, uFar);
    return viewZToOrthographicDepth(viewZ, uNear, uFar);
}

vec3 getSurfaceValue(int x, int y) {
    return texture2D(uSurfaceBuffer, vUv + vec2(x, y) / uResolution).rgb;
}

float sobelFloat(sampler2D diffuse, vec2 uv, vec2 texel) {
    // kernel definition (in glsl matrices are filled in column-major order)
    const mat3 Gx = mat3(-1, -2, -1, 0, 0, 0, 1, 2, 1);// x direction kernel
    const mat3 Gy = mat3(-1, 0, 1, -2, 0, 2, -1, 0, 1);// y direction kernel

    // first column
    float tx0y0 = getValue(-1, -1);
    float tx0y1 = getValue(-1, 0);
    float tx0y2 = getValue(-1, 1);

    // second column
    float tx1y0 = getValue(0, -1);
    float tx1y1 = getValue(0, 0);
    float tx1y2 = getValue(0, 1);

    // third column
    float tx2y0 = getValue(1, -1);
    float tx2y1 = getValue(1, 0);
    float tx2y2 = getValue(1, 1);

    // gradient value in x direction
    float valueGx = Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[2][0] * tx2y0 +
    Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1 + Gx[2][1] * tx2y1 +
    Gx[0][2] * tx0y2 + Gx[1][2] * tx1y2 + Gx[2][2] * tx2y2;

    // gradient value in y direction
    float valueGy = Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[2][0] * tx2y0 +
    Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1 + Gy[2][1] * tx2y1 +
    Gy[0][2] * tx0y2 + Gy[1][2] * tx1y2 + Gy[2][2] * tx2y2;

    // magnitute of the total gradient
    float G = (valueGx * valueGx) + (valueGy * valueGy);
    return clamp(G, 0.0001, 0.1);
}

float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, uNear, uFar );
    return viewZToOrthographicDepth( viewZ, uNear, uFar );
}

void main() {
    vec2 size = vec2(textureSize(uDiffuse, 0));
    vec4 texel = texture2D(uDiffuse, vUv);

    vec2 fragCoord = gl_FragCoord.xy;

    vec2 noiseValue = vec2(noise(fragCoord));
    noiseValue = noiseValue * 2.0 - 1.0;
    noiseValue *= 0.001;

    vec4 cloudNoiseValue = texture2D(uCloudTexture, vUv);

    float sobelValue = sobelFloat(uDiffuse, vUv, 1.0 / uResolution);
    sobelValue = smoothstep(0.01, 0.03, sobelValue);

    vec4 uLineColor = vec4(0.1, 0.1, 0.1, 1.0);

    if (sobelValue >.95) {
        gl_FragColor = uLineColor * 0.8;
    } else {
        gl_FragColor = texel;
    }
}`,
          vertexShader: `varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`
        })
    
        this.engine = engine
    
        this.uniforms.uResolution.value = new Vector2(
          viewportWidth,
          viewportHeight
        )
      }
    
      update() {}
    
      resize() {
        this.uniforms.uResolution.value = new Vector2(
          viewportWidth,
          viewportHeight
        )
      }
    }





    class PencilLinesPass extends Pass {
      constructor(engine) {
        super()

        this.engine = engine

        this.fsQuad = new FullScreenQuad()
        this.material = new PencilLinesShader(this.engine)

        this.fsQuad.material = this.material

        const surfaceBuffer = new WebGLRenderTarget(
          viewportWidth,
          viewportHeight
        )
        surfaceBuffer.texture.format = RGBAFormat
        surfaceBuffer.texture.type = HalfFloatType
        surfaceBuffer.texture.minFilter = NearestFilter
        surfaceBuffer.texture.magFilter = NearestFilter
        surfaceBuffer.texture.generateMipmaps = false
        surfaceBuffer.stencilBuffer = false
        this.surfaceBuffer = surfaceBuffer

        this.normalMaterial = new MeshNormalMaterial()

        this.material.uniforms.uNear.value = self.camera.near
        this.material.uniforms.uFar.value = self.camera.far
      }

      render(renderer, writeBuffer, readBuffer) {
        const depthBuffer = writeBuffer.depthBuffer
        writeBuffer.depthBuffer = false

        renderer.setRenderTarget(this.surfaceBuffer)
        const overrideMaterialValue = webgl.scene.overrideMaterial

        webgl.scene.overrideMaterial = this.normalMaterial
        renderer.render(webgl.scene, webgl.camera)
        webgl.scene.overrideMaterial = overrideMaterialValue

        this.material.uniforms.uDiffuse.value = readBuffer.texture
        this.material.uniforms.uDepthBuffer.value = readBuffer.depthTexture
        this.material.uniforms.uSurfaceBuffer.value = this.surfaceBuffer.texture
        
        if (this.renderToScreen) {
          renderer.setRenderTarget(null)
          this.fsQuad.render(renderer)
        } else {
          renderer.setRenderTarget(writeBuffer)
          if (this.clear) renderer.clear()
          this.fsQuad.render(renderer)
        }

        writeBuffer.depthBuffer = depthBuffer
      }

      dispose() {
        this.material.dispose()
        this.fsQuad.dispose()
      }

      setSize() {
        this.material.resize()
      }
    }







    const renderPass = new RenderPass(this.scene, this.camera)
    const pencilLinesPass = new PencilLinesPass(self)








    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(viewportWidth, viewportHeight);
    this.composer.addPass(renderPass)
    this.composer.addPass(pencilLinesPass)

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