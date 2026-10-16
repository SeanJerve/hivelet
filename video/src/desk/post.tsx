// Version G's lens: the room rendered into a buffer with its depth, then a depth-of-field pass
// that blurs what is in front of and behind the focus distance, as a macro lens does on a
// small object with a bright screen behind it. One render of the scene and one full-frame
// pass, cheaper in software WebGL than three's BokehPass (which renders the scene again for
// depth, and with it the desk's reflection).
import React, {useMemo} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {Stage} from '../objects/world';

const DofShader = {
  uniforms: {
    tColor: {value: null as THREE.Texture | null}, tDepth: {value: null as THREE.Texture | null},
    uNear: {value: 0.1}, uFar: {value: 200}, uFocus: {value: 5}, uAperture: {value: 0.02}, uMax: {value: 18},
    uRes: {value: new THREE.Vector2(1920, 1080)},
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    #include <common>
    #include <packing>
    uniform sampler2D tColor;
    uniform sampler2D tDepth;
    uniform float uNear, uFar, uFocus, uAperture, uMax;
    uniform vec2 uRes;
    varying vec2 vUv;
    float dist(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
    // circle of confusion in pixels: grows with distance from the focal plane
    float coc(float d) { return clamp(abs(d - uFocus) / d * uAperture * uRes.y, 0.0, uMax); }
    void main() {
      float c0 = coc(dist(vUv));
      vec3 acc = texture2D(tColor, vUv).rgb;
      float wsum = 1.0;
      // 36 taps on a golden-angle spiral, each kept only if its own blur reaches this pixel,
      // so a sharp object does not bleed onto the blurred screen behind it
      for (int i = 1; i < 37; i++) {
        float r = sqrt(float(i) / 36.0);
        float a = float(i) * 2.39996;
        vec2 o = vec2(cos(a), sin(a)) * r * max(c0, 0.0);
        vec2 uv = vUv + o / uRes;
        float cs = coc(dist(uv));
        float w = smoothstep(r * c0 - 1.5, r * c0 + 0.5, cs) * step(0.5, c0);
        acc += texture2D(tColor, uv).rgb * w;
        wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export type Lens = {focus: number; aperture: number};

// Renders the screen's scene into its texture, then the room through the lens, each frame.
export const LensRenderer: React.FC<{stage: Stage; lens: Lens; drawBack: (c: CanvasRenderingContext2D) => void}> = ({stage, lens, drawBack}) => {
  const {size, gl} = useThree();
  const w = Math.round(size.width * gl.getPixelRatio()), h = Math.round(size.height * gl.getPixelRatio());
  const {rt, quad} = useMemo(() => {
    const depth = new THREE.DepthTexture(w, h);
    depth.type = THREE.UnsignedIntType;
    const rt = new THREE.WebGLRenderTarget(w, h, {type: THREE.HalfFloatType, samples: 4, depthTexture: depth});
    const mat = new THREE.ShaderMaterial({...DofShader, uniforms: THREE.UniformsUtils.clone(DofShader.uniforms), depthTest: false, depthWrite: false});
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    return {rt, quad};
  }, [w, h]);
  const post = useMemo(() => { const s = new THREE.Scene(); s.add(quad); return s; }, [quad]);
  const ortho = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  useFrame(({gl: r, scene, camera}) => {
    const b = stage.back.getContext('2d')!; b.clearRect(0, 0, stage.back.width, stage.back.height); drawBack(b); stage.backTex.needsUpdate = true;
    r.setRenderTarget(stage.rt); r.clear(); r.render(stage.scene, stage.cam);
    r.setRenderTarget(rt); r.clear(); r.render(scene, camera);
    const cam = camera as THREE.PerspectiveCamera;
    const u = (quad.material as THREE.ShaderMaterial).uniforms;
    u.tColor.value = rt.texture; u.tDepth.value = rt.depthTexture; u.uNear.value = cam.near; u.uFar.value = cam.far;
    u.uFocus.value = lens.focus; u.uAperture.value = lens.aperture; u.uRes.value.set(w, h);
    r.setRenderTarget(null); r.render(post, ortho);
  }, 1);
  return null;
};
