import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * Colour grading.
 *
 * The reference world ships a baked 3D LUT and applies it as a fullscreen
 * pass, which is what turns a fairly blue, ordinary render into that warm
 * late-afternoon photograph. We do not have their `.CUBE` file, so this pass
 * reproduces the same moves analytically: lift the shadows towards violet,
 * push the highlights towards cream, pull a little saturation out of the
 * midtones, then wash the whole frame with the same #FFF9EE overlay.
 *
 * Everything upstream of this pass should stay "honest" — a plain blue sky and
 * plain green grass. The grade is what makes it summer.
 *
 * The city brought a clock with it, and one fixed grade cannot serve both noon
 * and midnight: the cream gain that makes an afternoon glow turns a night
 * street the colour of weak tea. So `setMood` slides the lift and the gain
 * between a warm daytime set and a cool nocturnal one, and drops the overlay
 * wash almost to nothing after dark. It is still one pass and still the same
 * four moves — only the endpoints move.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uLift: { value: new THREE.Color("#3b3550") },
    uGain: { value: new THREE.Color("#fff3da") },
    uOverlayColor: { value: new THREE.Color("#fff9ee") },
    uOverlayAmount: { value: 0.045 },
    uLiftAmount: { value: 0.04 },
    uSaturation: { value: 1.02 },
    uContrast: { value: 1.13 },
    uWarmth: { value: 0.05 },
    /** Rises to 1 during the intro so the world fades up out of paper white. */
    uTransition: { value: 1 },
    /** ECYR rebuild: darker corners, like a lens. */
    uVignette: { value: 0.32 },
    /** ECYR rebuild: a lens — colour fringing at the edges, grain, sun flare, speed blur. */
    uChroma: { value: 0.0016 },
    uGrain: { value: 0.022 },
    uTime: { value: 0 },
    uAspect: { value: 16 / 9 },
    uSunUv: { value: new THREE.Vector2(-9, -9) },
    uSunVis: { value: 0 },
    uRadial: { value: 0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uLift;
    uniform vec3 uGain;
    uniform vec3 uOverlayColor;
    uniform float uOverlayAmount;
    uniform float uLiftAmount;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uWarmth;
    uniform float uTransition;
    uniform float uVignette;
    uniform float uChroma;
    uniform float uGrain;
    uniform float uTime;
    uniform float uAspect;
    uniform vec2 uSunUv;
    uniform float uSunVis;
    uniform float uRadial;

    varying vec2 vUv;

    const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

    float hash12( vec2 p ) {
      vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
      p3 += dot( p3, p3.yzx + 33.33 );
      return fract( ( p3.x + p3.y ) * p3.z );
    }

    vec3 lens( vec2 uv ) {
      // colour fringing grows towards the edges, the way a real lens does
      vec2 d = uv - 0.5;
      float k = uChroma * dot( d, d ) * 4.0;
      return vec3(
        texture2D( tDiffuse, uv + d * k ).r,
        texture2D( tDiffuse, uv ).g,
        texture2D( tDiffuse, uv - d * k ).b
      );
    }

    void main() {
      vec3 color = lens( vUv );
      // speed: the frame streaks towards the centre (taxi turbo)
      if ( uRadial > 0.001 ) {
        vec2 dir = ( vUv - 0.5 ) * uRadial * 0.009;
        vec3 acc = color;
        float j = hash12( vUv * 731.0 + uTime ); // dither the taps: no ghost copies
        for ( int i = 1; i < 9; i++ ) acc += texture2D( tDiffuse, vUv - dir * ( float( i ) + j ) ).rgb;
        color = mix( color, acc / 9.0, smoothstep( 0.08, 0.5, length( vUv - 0.5 ) ) );
      }

      // Sun flare: only when the disc itself is on screen and not behind a building.
      if ( uSunVis > 0.001 ) {
        float seen = 0.0;
        for ( int i = 0; i < 5; i++ ) {
          float a = float( i ) * 1.2566;
          vec2 o = i == 0 ? vec2( 0.0 ) : vec2( cos( a ), sin( a ) ) * 0.004;
          seen += step( 0.93, dot( texture2D( tDiffuse, uSunUv + o ).rgb, LUMA ) );
        }
        seen = seen / 5.0 * uSunVis;
        if ( seen > 0.0 ) {
          vec2 d = ( vUv - uSunUv ) * vec2( uAspect, 1.0 );
          float r = length( d );
          vec3 flare = vec3( 1.0, 0.9, 0.75 ) * ( exp( -r * 9.0 ) * 0.1 + exp( -r * 34.0 ) * 0.3 );
          flare += vec3( 1.0, 0.95, 0.85 ) * exp( -abs( d.y ) * 140.0 ) * exp( -abs( d.x ) * 2.6 ) * 0.16;
          vec2 axis = vec2( 0.5 ) - uSunUv;
          for ( int i = 0; i < 4; i++ ) {
            float f = 0.55 + float( i ) * 0.42;
            vec2 gp = uSunUv + axis * f * 2.0;
            float gr = 0.025 + float( i ) * 0.018;
            float g = smoothstep( gr, gr * 0.55, length( ( vUv - gp ) * vec2( uAspect, 1.0 ) ) );
            vec3 tint = i == 0 ? vec3( 0.4, 0.8, 1.0 ) : i == 1 ? vec3( 1.0, 0.6, 0.3 ) : i == 2 ? vec3( 0.6, 1.0, 0.6 ) : vec3( 0.8, 0.5, 1.0 );
            flare += tint * g * 0.045;
          }
          color += flare * seen;
        }
      }

      // Shadows drift towards a cool violet, highlights towards warm cream.
      float luminance = dot( color, LUMA );
      color = mix( color + uLift * uLiftAmount, color, smoothstep( 0.0, 0.55, luminance ) );
      color *= mix( vec3( 1.0 ), uGain, smoothstep( 0.35, 1.0, luminance ) );

      // Gentle S-curve around the midtones.
      color = ( color - 0.5 ) * uContrast + 0.5;

      // Take the edge off the saturation, the way film does.
      color = mix( vec3( dot( color, LUMA ) ), color, uSaturation );

      // Overall warmth: red up, blue down.
      color *= vec3( 1.0 + uWarmth, 1.0 + uWarmth * 0.25, 1.0 - uWarmth * 0.9 );

      // The paper-white wash that ties the UI and the world together.
      color = mix( color, uOverlayColor, uOverlayAmount );

      // Lens vignette.
      float vig = smoothstep( 0.95, 0.25, length( ( vUv - 0.5 ) * vec2( 1.25, 1.0 ) ) );
      color *= mix( 1.0, vig, uVignette );

      // Film grain, finer than a pixel's worth of noise.
      color += ( hash12( vUv * vec2( 1931.0, 1077.0 ) + fract( uTime ) * 91.7 ) - 0.5 ) * uGrain;

      // Intro fade from paper white.
      color = mix( uOverlayColor, color, uTransition );

      gl_FragColor = vec4( clamp( color, 0.0, 1.0 ), 1.0 );
    }
  `,
};

export interface Post {
  composer: EffectComposer;
  grade: ShaderPass;
  setSize(width: number, height: number): void;
  /** Rebuild the render target at a new MSAA sample count. */
  setSamples(samples: number): void;
  /** 0 = paper white, 1 = fully graded scene. */
  setTransition(value: number): void;
  /** 0 = broad daylight, 1 = deep night. */
  setMood(night: number): void;
  /** ECYR rebuild: switch the ambient occlusion and bloom passes. */
  setEffects(ao: boolean, bloom: boolean): void;
  /** ECYR rebuild: per frame, before rendering — puts the sun flare where the sun is. */
  prepare(dt: number): void;
  /** ECYR rebuild: 0..1 radial speed blur (taxi turbo). */
  setSpeedBlur(amount: number): void;
}

/** Where the sun is and how much of it there is; the environment keeps it current. */
export const sunState = { dir: new THREE.Vector3(0, 1, 0), strength: 0 };

/** The grade at noon and the grade at midnight; every hour is between them. */
const MOOD = {
  day: {
    lift: new THREE.Color("#3b3550"),
    gain: new THREE.Color("#fff3da"),
    overlay: 0.045,
    saturation: 1.02,
    contrast: 1.13,
    warmth: 0.05,
  },
  night: {
    lift: new THREE.Color("#131a33"),
    gain: new THREE.Color("#cddcff"),
    overlay: 0.012,
    saturation: 0.94,
    contrast: 1.2,
    warmth: -0.06,
  },
} as const;

const sunPoint = new THREE.Vector3();
const sunFwd = new THREE.Vector3();
const sunCamDir = new THREE.Vector3();

export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  samples: number,
): Post {
  // The composer renders into this target, not into the canvas, which is why
  // the renderer's own `antialias: true` never did anything: it applies to the
  // default framebuffer and every frame here goes through the grade. Asking
  // for the samples *here* is what actually anti-aliases the city.
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples,
  });

  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(window.innerWidth, window.innerHeight);

  composer.addPass(new RenderPass(scene, camera));
  // ECYR rebuild: contact shadows in every corner and under every awning, and a
  // soft bloom on whatever is brighter than white (lit windows, lamps, glints).
  const gtao = new GTAOPass(scene, camera, size.x, size.y);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.85;
  gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  gtao.enabled = false;
  composer.addPass(gtao);
  let bloomAllowed = false;
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.2, 0.4, 1.35);
  bloom.enabled = false;
  composer.addPass(bloom);
  // Tone mapping and sRGB conversion first, so the grade works in display
  // space exactly like a LUT would.
  composer.addPass(new OutputPass());

  const grade = new ShaderPass(GradeShader);
  grade.renderToScreen = true;
  composer.addPass(grade);

  return {
    composer,
    grade,
    setSize(width, height) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    setSamples(next) {
      if (target.samples === next) return;
      target.samples = next;
      target.dispose();
    },
    setEffects(ao, useBloom) {
      gtao.enabled = ao;
      bloomAllowed = useBloom;
      if (!useBloom) bloom.enabled = false;
    },
    prepare(dt) {
      const u = grade.uniforms;
      u.uTime.value = (u.uTime.value + dt) % 1000;
      const size = new THREE.Vector2();
      renderer.getSize(size);
      u.uAspect.value = size.x / Math.max(1, size.y);
      const cam = camera as THREE.PerspectiveCamera;
      const p = sunPoint.copy(sunState.dir).multiplyScalar(1000).add(cam.position);
      p.project(cam);
      const inFront = sunFwd.copy(sunState.dir).dot(cam.getWorldDirection(sunCamDir)) > 0.1;
      const onScreen = Math.abs(p.x) < 1.15 && Math.abs(p.y) < 1.15;
      u.uSunVis.value = inFront && onScreen && bloomAllowed ? sunState.strength : 0;
      (u.uSunUv.value as THREE.Vector2).set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    },
    setSpeedBlur(amount) {
      grade.uniforms.uRadial.value = THREE.MathUtils.clamp(amount, 0, 1);
    },
    setTransition(value) {
      grade.uniforms.uTransition.value = value;
    },
    setMood(night) {
      const t = THREE.MathUtils.clamp(night, 0, 1);
      const u = grade.uniforms;
      (u.uLift.value as THREE.Color).copy(MOOD.day.lift).lerp(MOOD.night.lift, t);
      (u.uGain.value as THREE.Color).copy(MOOD.day.gain).lerp(MOOD.night.gain, t);
      u.uOverlayAmount.value = THREE.MathUtils.lerp(MOOD.day.overlay, MOOD.night.overlay, t);
      u.uSaturation.value = THREE.MathUtils.lerp(MOOD.day.saturation, MOOD.night.saturation, t);
      u.uContrast.value = THREE.MathUtils.lerp(MOOD.day.contrast, MOOD.night.contrast, t);
      u.uWarmth.value = THREE.MathUtils.lerp(MOOD.day.warmth, MOOD.night.warmth, t);
      // Bloom is a night effect: lit windows, lamps and headlights. By day the
      // sunlit pavement is already brighter than white and would haze over.
      const glow = THREE.MathUtils.smoothstep(t, 0.35, 0.9);
      // By day only what is far brighter than white blooms: the sun, and the
      // glints of it on glass, chrome and car paint. By night the lamps too.
      bloom.strength = 0.32 + 0.38 * glow;
      bloom.threshold = THREE.MathUtils.lerp(2.2, 0.85, glow);
      bloom.radius = THREE.MathUtils.lerp(0.55, 0.4, glow);
      bloom.enabled = bloomAllowed;
    },
  };
}
