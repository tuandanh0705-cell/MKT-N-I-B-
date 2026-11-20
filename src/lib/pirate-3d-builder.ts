import * as THREE from "three";

export type PirateCharacterId =
  | "luffy"
  | "zoro"
  | "nami"
  | "robin"
  | "sanji"
  | "franky"
  | "chopper"
  | "usopp"
  | "mai"
  | "jinbe"
  | "brook"
  | "ace"
  | "sabo"
  | "law"
  | "shanks";

export const PIRATE_3D_SPRITES: Record<PirateCharacterId, string> = {
  luffy: "/avatars/3d/luffy.png",
  zoro: "/avatars/3d/zoro.png",
  nami: "/avatars/3d/nami.png",
  robin: "/avatars/3d/robin.png",
  sanji: "/avatars/3d/sanji.png",
  franky: "/avatars/3d/franky.png",
  chopper: "/avatars/3d/chopper.png",
  usopp: "/avatars/3d/usopp.png",
  mai: "/avatars/3d/mai.png",
  jinbe: "/avatars/3d/jinbe.png",
  brook: "/avatars/3d/brook.png",
  ace: "/avatars/3d/ace.png",
  sabo: "/avatars/3d/sabo.png",
  law: "/avatars/3d/law.png",
  shanks: "/avatars/3d/shanks.png",
};

const SHARED_SPRITE_TEXTURES = new Map<string, THREE.Texture>();
const SHARED_TEXTURE_SET = new WeakSet<THREE.Texture>();

export function isSharedPirateTexture(tex: unknown): boolean {
  return tex instanceof THREE.Texture && SHARED_TEXTURE_SET.has(tex);
}

function getOrLoadCharacterTexture(
  characterId: PirateCharacterId,
  loader: THREE.TextureLoader
): THREE.Texture {
  const spriteUrl = PIRATE_3D_SPRITES[characterId] ?? PIRATE_3D_SPRITES.luffy;
  const cached = SHARED_SPRITE_TEXTURES.get(spriteUrl);
  if (cached) return cached;
  const tex = loader.load(spriteUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  SHARED_SPRITE_TEXTURES.set(spriteUrl, tex);
  SHARED_TEXTURE_SET.add(tex);
  return tex;
}

const SPARKLE_COLORS: Record<PirateCharacterId, number> = {
  luffy: 0xfacc15,
  zoro: 0x22c55e,
  nami: 0xf97316,
  robin: 0xf472b6,
  sanji: 0x38bdf8,
  franky: 0x06b6d4,
  chopper: 0xfb7185,
  usopp: 0xfbbf24,
  mai: 0x60a5fa,
  jinbe: 0x0284c7,
  brook: 0xa855f7,
  ace: 0xf97316,
  sabo: 0x2563eb,
  law: 0x38bdf8,
  shanks: 0xef4444,
};

type EyeMode = 0 | 1 | 2 | 3; // 0: both blink, 1: viewer-left only (Zoro), 2: viewer-right only (Sanji), 3: glint (Franky/Brook)

interface ArmSegmentSpec {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  radius: number;
  idleAmp: number;
  hoverAmp: number;
  freqScale: number;
  phaseOffset: number;
}

interface CharacterRigSpec {
  centerX: number;
  neckY: number;
  waistY: number;
  eyeMode: EyeMode;
  eyeL: [number, number, number, number]; // [u, v, rx, ry]
  eyeR: [number, number, number, number];
  skinHex: string;
  lashHex: string;
  armL: ArmSegmentSpec;
  armR: ArmSegmentSpec;
  bounceSpeed: number;
  bounceAmp: number;
  grooveAmp: number;
  headBobRatio: number;
  flowAmount: number;
}

const CHARACTER_RIG_SPECS: Record<PirateCharacterId, CharacterRigSpec> = {
  luffy: {
    centerX: 0.505,
    neckY: 0.545,
    waistY: 0.34,
    eyeMode: 0,
    eyeL: [0.433, 0.651, 0.036, 0.029],
    eyeR: [0.578, 0.651, 0.036, 0.029],
    skinHex: "#f6d3b6",
    lashHex: "#231815",
    armL: { sx: 0.355, sy: 0.50, tx: 0.235, ty: 0.625, radius: 0.105, idleAmp: 0.17, hoverAmp: 0.34, freqScale: 1.35, phaseOffset: 0.0 },
    armR: { sx: 0.635, sy: 0.495, tx: 0.71, ty: 0.395, radius: 0.085, idleAmp: 0.06, hoverAmp: 0.12, freqScale: 0.95, phaseOffset: 1.6 },
    bounceSpeed: 3.6,
    bounceAmp: 0.068,
    grooveAmp: 0.075,
    headBobRatio: 1.15,
    flowAmount: 0.022,
  },
  zoro: {
    centerX: 0.50,
    neckY: 0.56,
    waistY: 0.35,
    eyeMode: 1, // Open right eye (viewer left); scarred left eye stays closed
    eyeL: [0.448, 0.698, 0.032, 0.020],
    eyeR: [0.56, 0.698, 0.03, 0.02],
    skinHex: "#e6cab4",
    lashHex: "#241914",
    armL: { sx: 0.365, sy: 0.495, tx: 0.30, ty: 0.79, radius: 0.082, idleAmp: 0.065, hoverAmp: 0.145, freqScale: 0.9, phaseOffset: 0.4 },
    armR: { sx: 0.635, sy: 0.495, tx: 0.70, ty: 0.41, radius: 0.075, idleAmp: 0.045, hoverAmp: 0.095, freqScale: 0.85, phaseOffset: 2.0 },
    bounceSpeed: 2.6,
    bounceAmp: 0.04,
    grooveAmp: 0.045,
    headBobRatio: 0.85,
    flowAmount: 0.018,
  },
  nami: {
    centerX: 0.515,
    neckY: 0.605,
    waistY: 0.39,
    eyeMode: 0,
    eyeL: [0.453, 0.728, 0.033, 0.028],
    eyeR: [0.583, 0.728, 0.033, 0.028],
    skinHex: "#edd2bf",
    lashHex: "#3a1e14",
    armL: { sx: 0.39, sy: 0.47, tx: 0.27, ty: 0.175, radius: 0.088, idleAmp: 0.12, hoverAmp: 0.24, freqScale: 1.05, phaseOffset: 0.2 },
    armR: { sx: 0.615, sy: 0.50, tx: 0.675, ty: 0.405, radius: 0.075, idleAmp: 0.055, hoverAmp: 0.11, freqScale: 0.9, phaseOffset: 1.8 },
    bounceSpeed: 3.1,
    bounceAmp: 0.052,
    grooveAmp: 0.065,
    headBobRatio: 1.05,
    flowAmount: 0.032,
  },
  robin: {
    centerX: 0.51,
    neckY: 0.585,
    waistY: 0.37,
    eyeMode: 0,
    eyeL: [0.446, 0.71, 0.033, 0.026],
    eyeR: [0.578, 0.71, 0.033, 0.026],
    skinHex: "#edd1bf",
    lashHex: "#241926",
    armL: { sx: 0.37, sy: 0.48, tx: 0.275, ty: 0.575, radius: 0.10, idleAmp: 0.11, hoverAmp: 0.22, freqScale: 0.9, phaseOffset: 0.0 },
    armR: { sx: 0.635, sy: 0.48, tx: 0.73, ty: 0.575, radius: 0.10, idleAmp: 0.11, hoverAmp: 0.22, freqScale: 0.9, phaseOffset: Math.PI },
    bounceSpeed: 2.5,
    bounceAmp: 0.038,
    grooveAmp: 0.048,
    headBobRatio: 0.95,
    flowAmount: 0.028,
  },
  sanji: {
    centerX: 0.46,
    neckY: 0.57,
    waistY: 0.36,
    eyeMode: 2, // Only visible left eye (viewer right) blinks
    eyeL: [0.42, 0.713, 0.025, 0.017],
    eyeR: [0.483, 0.713, 0.027, 0.018],
    skinHex: "#e2ba98",
    lashHex: "#2b1d15",
    armL: { sx: 0.335, sy: 0.47, tx: 0.295, ty: 0.31, radius: 0.068, idleAmp: 0.065, hoverAmp: 0.13, freqScale: 0.95, phaseOffset: 0.5 },
    armR: { sx: 0.59, sy: 0.47, tx: 0.62, ty: 0.37, radius: 0.06, idleAmp: 0.035, hoverAmp: 0.065, freqScale: 0.85, phaseOffset: 2.2 },
    bounceSpeed: 2.8,
    bounceAmp: 0.044,
    grooveAmp: 0.058,
    headBobRatio: 0.95,
    flowAmount: 0.022,
  },
  franky: {
    centerX: 0.50,
    neckY: 0.53,
    waistY: 0.32,
    eyeMode: 3, // Star sparkle eyes
    eyeL: [0.464, 0.644, 0.019, 0.019],
    eyeR: [0.535, 0.644, 0.019, 0.019],
    skinHex: "#d9b4a0",
    lashHex: "#1e293b",
    armL: { sx: 0.315, sy: 0.56, tx: 0.22, ty: 0.825, radius: 0.12, idleAmp: 0.075, hoverAmp: 0.15, freqScale: 1.25, phaseOffset: 0.0 },
    armR: { sx: 0.685, sy: 0.56, tx: 0.78, ty: 0.825, radius: 0.12, idleAmp: 0.075, hoverAmp: 0.15, freqScale: 1.25, phaseOffset: 0.2 },
    bounceSpeed: 3.4,
    bounceAmp: 0.06,
    grooveAmp: 0.07,
    headBobRatio: 1.05,
    flowAmount: 0.018,
  },
  chopper: {
    centerX: 0.50,
    neckY: 0.42,
    waistY: 0.24,
    eyeMode: 0,
    eyeL: [0.417, 0.52, 0.044, 0.038],
    eyeR: [0.585, 0.52, 0.044, 0.038],
    skinHex: "#d6a374",
    lashHex: "#2d1a10",
    armL: { sx: 0.355, sy: 0.37, tx: 0.295, ty: 0.29, radius: 0.082, idleAmp: 0.19, hoverAmp: 0.36, freqScale: 1.55, phaseOffset: 0.0 },
    armR: { sx: 0.645, sy: 0.37, tx: 0.705, ty: 0.29, radius: 0.082, idleAmp: 0.19, hoverAmp: 0.36, freqScale: 1.55, phaseOffset: Math.PI },
    bounceSpeed: 4.1,
    bounceAmp: 0.078,
    grooveAmp: 0.095,
    headBobRatio: 1.25,
    flowAmount: 0.025,
  },
  usopp: {
    centerX: 0.498,
    neckY: 0.535,
    waistY: 0.33,
    eyeMode: 0,
    eyeL: [0.454, 0.698, 0.028, 0.025],
    eyeR: [0.558, 0.696, 0.028, 0.024],
    skinHex: "#e5bd99",
    lashHex: "#241811",
    armL: { sx: 0.355, sy: 0.485, tx: 0.235, ty: 0.545, radius: 0.10, idleAmp: 0.18, hoverAmp: 0.35, freqScale: 1.4, phaseOffset: 0.0 },
    armR: { sx: 0.64, sy: 0.485, tx: 0.75, ty: 0.45, radius: 0.11, idleAmp: 0.10, hoverAmp: 0.22, freqScale: 1.1, phaseOffset: 1.5 },
    bounceSpeed: 3.5,
    bounceAmp: 0.062,
    grooveAmp: 0.072,
    headBobRatio: 1.15,
    flowAmount: 0.022,
  },
  mai: {
    centerX: 0.525,
    neckY: 0.525,
    waistY: 0.33,
    eyeMode: 0,
    eyeL: [0.483, 0.668, 0.028, 0.024],
    eyeR: [0.582, 0.668, 0.028, 0.024],
    skinHex: "#f8decc",
    lashHex: "#2e1f27",
    armL: { sx: 0.39, sy: 0.445, tx: 0.315, ty: 0.30, radius: 0.082, idleAmp: 0.065, hoverAmp: 0.14, freqScale: 0.9, phaseOffset: 1.7 },
    armR: { sx: 0.648, sy: 0.495, tx: 0.755, ty: 0.64, radius: 0.098, idleAmp: 0.18, hoverAmp: 0.36, freqScale: 1.3, phaseOffset: 0.0 },
    bounceSpeed: 3.1,
    bounceAmp: 0.056,
    grooveAmp: 0.068,
    headBobRatio: 1.1,
    flowAmount: 0.036,
  },
  jinbe: {
    centerX: 0.50,
    neckY: 0.60,
    waistY: 0.32,
    eyeMode: 0,
    eyeL: [0.453, 0.733, 0.021, 0.016],
    eyeR: [0.547, 0.733, 0.021, 0.016],
    skinHex: "#88b6d1",
    lashHex: "#0f172a",
    armL: { sx: 0.32, sy: 0.43, tx: 0.23, ty: 0.25, radius: 0.095, idleAmp: 0.045, hoverAmp: 0.09, freqScale: 0.7, phaseOffset: 0.0 },
    armR: { sx: 0.68, sy: 0.43, tx: 0.77, ty: 0.25, radius: 0.095, idleAmp: 0.045, hoverAmp: 0.09, freqScale: 0.7, phaseOffset: Math.PI },
    bounceSpeed: 2.2,
    bounceAmp: 0.034,
    grooveAmp: 0.038,
    headBobRatio: 0.8,
    flowAmount: 0.026,
  },
  brook: {
    centerX: 0.48,
    neckY: 0.48,
    waistY: 0.30,
    eyeMode: 3, // Star sunglasses gleam sweep
    eyeL: [0.418, 0.606, 0.045, 0.038],
    eyeR: [0.546, 0.606, 0.045, 0.038],
    skinHex: "#e8e1d3",
    lashHex: "#0f172a",
    armL: { sx: 0.35, sy: 0.38, tx: 0.255, ty: 0.235, radius: 0.095, idleAmp: 0.095, hoverAmp: 0.19, freqScale: 1.5, phaseOffset: 0.0 },
    armR: { sx: 0.62, sy: 0.42, tx: 0.735, ty: 0.465, radius: 0.095, idleAmp: 0.105, hoverAmp: 0.21, freqScale: 1.5, phaseOffset: 1.2 },
    bounceSpeed: 3.9,
    bounceAmp: 0.066,
    grooveAmp: 0.088,
    headBobRatio: 1.2,
    flowAmount: 0.028,
  },
  ace: {
    centerX: 0.50,
    neckY: 0.545,
    waistY: 0.34,
    eyeMode: 0,
    eyeL: [0.436, 0.686, 0.03, 0.021],
    eyeR: [0.558, 0.686, 0.03, 0.021],
    skinHex: "#f7caa5",
    lashHex: "#241812",
    armL: { sx: 0.365, sy: 0.51, tx: 0.27, ty: 0.53, radius: 0.105, idleAmp: 0.11, hoverAmp: 0.23, freqScale: 1.15, phaseOffset: 0.0 },
    armR: { sx: 0.64, sy: 0.495, tx: 0.71, ty: 0.395, radius: 0.08, idleAmp: 0.055, hoverAmp: 0.11, freqScale: 0.9, phaseOffset: 1.9 },
    bounceSpeed: 3.1,
    bounceAmp: 0.052,
    grooveAmp: 0.06,
    headBobRatio: 1.0,
    flowAmount: 0.022,
  },
  sabo: {
    centerX: 0.50,
    neckY: 0.525,
    waistY: 0.33,
    eyeMode: 0,
    eyeL: [0.443, 0.65, 0.028, 0.023],
    eyeR: [0.562, 0.65, 0.028, 0.023],
    skinHex: "#eecfab",
    lashHex: "#241812",
    armL: { sx: 0.375, sy: 0.465, tx: 0.27, ty: 0.48, radius: 0.09, idleAmp: 0.08, hoverAmp: 0.16, freqScale: 1.0, phaseOffset: 0.0 },
    armR: { sx: 0.64, sy: 0.455, tx: 0.695, ty: 0.31, radius: 0.082, idleAmp: 0.065, hoverAmp: 0.13, freqScale: 1.0, phaseOffset: 2.4 },
    bounceSpeed: 2.9,
    bounceAmp: 0.048,
    grooveAmp: 0.056,
    headBobRatio: 1.0,
    flowAmount: 0.025,
  },
  law: {
    centerX: 0.486,
    neckY: 0.575,
    waistY: 0.36,
    eyeMode: 0,
    eyeL: [0.422, 0.728, 0.028, 0.018],
    eyeR: [0.538, 0.728, 0.028, 0.018],
    skinHex: "#ebbfa0",
    lashHex: "#1c1917",
    armL: { sx: 0.35, sy: 0.46, tx: 0.22, ty: 0.31, radius: 0.078, idleAmp: 0.035, hoverAmp: 0.075, freqScale: 0.8, phaseOffset: 0.0 },
    armR: { sx: 0.60, sy: 0.47, tx: 0.64, ty: 0.36, radius: 0.065, idleAmp: 0.03, hoverAmp: 0.06, freqScale: 0.8, phaseOffset: 1.5 },
    bounceSpeed: 2.4,
    bounceAmp: 0.035,
    grooveAmp: 0.042,
    headBobRatio: 0.9,
    flowAmount: 0.018,
  },
  shanks: {
    centerX: 0.488,
    neckY: 0.625,
    waistY: 0.40,
    eyeMode: 0,
    eyeL: [0.444, 0.788, 0.026, 0.016],
    eyeR: [0.534, 0.788, 0.026, 0.016],
    skinHex: "#eecbb0",
    lashHex: "#241813",
    armL: { sx: 0.36, sy: 0.56, tx: 0.285, ty: 0.63, radius: 0.088, idleAmp: 0.11, hoverAmp: 0.25, freqScale: 1.05, phaseOffset: 0.0 },
    armR: { sx: 0.665, sy: 0.46, tx: 0.74, ty: 0.26, radius: 0.105, idleAmp: 0.055, hoverAmp: 0.12, freqScale: 0.75, phaseOffset: 2.0 },
    bounceSpeed: 2.6,
    bounceAmp: 0.042,
    grooveAmp: 0.052,
    headBobRatio: 0.9,
    flowAmount: 0.036,
  },
};

const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uCenterX;
uniform float uNeckY;
uniform float uWaistY;

uniform vec4 uArmLSeg;
uniform float uArmLRadius;
uniform vec4 uArmRSeg;
uniform float uArmRRadius;

uniform float uBreath;
uniform float uHipShiftX;
uniform float uTorsoRotZ;
uniform float uTorsoYaw;
uniform float uTorsoPitch;

uniform float uHeadRotZ;
uniform float uHeadYaw;
uniform float uHeadPitch;
uniform float uHeadBob;

uniform float uArmLAngle;
uniform float uArmRAngle;
uniform float uStepL;
uniform float uStepR;

uniform float uFlowAmp;
uniform float uFlowPhase;
uniform float uHatLag;

uniform float uSquashY;
uniform float uSquashX;

varying vec2 vUv;
varying vec3 vNormalView;
varying float vHeadFactor;

vec2 rotate2D(vec2 p, vec2 pivot, float a) {
  float c = cos(a);
  float s = sin(a);
  vec2 d = p - pivot;
  return pivot + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
}

vec2 capsuleWeight(vec2 q, vec2 a, vec2 b, float r) {
  vec2 ba = b - a;
  float denom = max(dot(ba, ba), 0.0001);
  float t = clamp(dot(q - a, ba) / denom, 0.0, 1.0);
  float dist = length(q - (a + ba * t));
  float radial = smoothstep(r, r * 0.28, dist);
  float jointFade = smoothstep(0.03, 0.26, t);
  return vec2(radial * jointFade, t);
}

void main() {
  vUv = uv;
  float W = 1.78;
  float H = 1.78;
  vec3 p = position;

  // 1. 2.5D Sculptural Depth Profile (spherical head fullness + curved torso relief)
  float dxCenter = abs(uv.x - uCenterX) / 0.34;
  float bodyCurve = max(0.0, 1.0 - dxCenter * dxCenter) * 0.11;
  vec2 headRel = (uv - vec2(uCenterX, uNeckY + 0.16)) / vec2(0.24, 0.22);
  float distHead2 = dot(headRel, headRel);
  float headBulge = max(0.0, 1.0 - distHead2) * 0.105;

  float chestMask = smoothstep(uWaistY - 0.03, uWaistY + 0.09, uv.y)
                  * (1.0 - smoothstep(uNeckY - 0.03, uNeckY + 0.05, uv.y));
  p.z += bodyCurve + headBulge + chestMask * uBreath * 0.028;

  // Gentle radial chest inhale expansion
  vec2 chestPivot = vec2((uCenterX - 0.5) * W, (uWaistY + 0.09 - 0.5) * H);
  p.xy += (p.xy - chestPivot) * (chestMask * uBreath * 0.038);

  // 2. Grounded Leg Bounce & Alternating Weight Shift
  float footLock = smoothstep(0.04, 0.12, uv.y);
  float legMask = footLock * (1.0 - smoothstep(uWaistY - 0.04, uWaistY + 0.06, uv.y));
  float leftLeg = 1.0 - smoothstep(uCenterX - 0.04, uCenterX + 0.04, uv.x);
  float rightLeg = smoothstep(uCenterX - 0.04, uCenterX + 0.04, uv.x);
  p.y += legMask * (leftLeg * uStepL + rightLeg * uStepR) * 0.06;
  p.x += legMask * uHipShiftX * 0.55;

  // 3. Hips & Upper Body Sway / Lean (carries head + arms cleanly)
  float aboveWaist = smoothstep(uWaistY - 0.05, uWaistY + 0.09, uv.y);
  vec2 waistPivot = vec2((uCenterX - 0.5) * W, (uWaistY - 0.5) * H);
  p.xy = rotate2D(p.xy, waistPivot, aboveWaist * uTorsoRotZ);
  p.x += aboveWaist * uHipShiftX;

  float torsoYawAngle = aboveWaist * uTorsoYaw;
  float dxW = p.x - waistPivot.x;
  float dzW = p.z - 0.04;
  p.x = waistPivot.x + dxW * cos(torsoYawAngle) + dzW * sin(torsoYawAngle) * 0.45;
  p.z = 0.04 + dzW * cos(torsoYawAngle) - dxW * sin(torsoYawAngle) * 0.45;
  p.z += (p.y - waistPivot.y) * aboveWaist * uTorsoPitch;

  // 4. Articulated Arm Capsules (curved cartoon bend from shoulder to hand)
  vec2 armLW = capsuleWeight(uv, uArmLSeg.xy, uArmLSeg.zw, uArmLRadius);
  vec2 armRW = capsuleWeight(uv, uArmRSeg.xy, uArmRSeg.zw, uArmRRadius);

  if (armLW.x > 0.001) {
    vec2 shL = vec2((uArmLSeg.x - 0.5) * W, (uArmLSeg.y - 0.5) * H);
    float bendL = 0.35 * armLW.y + 0.65 * armLW.y * armLW.y;
    p.xy = rotate2D(p.xy, shL, armLW.x * uArmLAngle * bendL);
    p.z += armLW.x * 0.035;
  }
  if (armRW.x > 0.001) {
    vec2 shR = vec2((uArmRSeg.x - 0.5) * W, (uArmRSeg.y - 0.5) * H);
    float bendR = 0.35 * armRW.y + 0.65 * armRW.y * armRW.y;
    p.xy = rotate2D(p.xy, shR, armRW.x * uArmRAngle * bendR);
    p.z += armRW.x * 0.035;
  }

  // 5. Independent 3D Head Tilt, Nod & Look Tracking (excludes waving arms)
  float rawHead = smoothstep(uNeckY - 0.032, uNeckY + 0.042, uv.y);
  float armMask = max(armLW.x, armRW.x);
  float wHead = rawHead * clamp(1.0 - armMask * 1.15, 0.0, 1.0);
  vHeadFactor = wHead;

  vec2 neckPivot = vec2((uCenterX - 0.5) * W, (uNeckY - 0.5) * H);
  p.xy = rotate2D(p.xy, neckPivot, wHead * uHeadRotZ);

  float hYaw = wHead * uHeadYaw;
  float dxH = p.x - neckPivot.x;
  float dzH = p.z - 0.06;
  p.x = neckPivot.x + dxH * cos(hYaw) + dzH * sin(hYaw) * 0.55;
  p.z = 0.06 + dzH * cos(hYaw) - dxH * sin(hYaw) * 0.55;

  float hPitch = wHead * uHeadPitch;
  float dyH = p.y - neckPivot.y;
  float dzH2 = p.z - 0.06;
  p.y = neckPivot.y + dyH * cos(hPitch) - dzH2 * sin(hPitch) * 0.4;
  p.z = 0.06 + dyH * sin(hPitch) * 0.4 + dzH2 * cos(hPitch);
  p.y += wHead * uHeadBob;

  // 6. Secondary Hair / Cape / Hat Follow-Through & Ocean Breeze Flutter
  float sideFlow = smoothstep(0.11, 0.30, abs(uv.x - uCenterX)) * footLock * (1.0 - armMask * 0.7);
  p.x += sideFlow * uFlowAmp * sin(uv.y * 9.5 - uFlowPhase);
  p.y += max(0.0, uv.y - (uNeckY + 0.22)) * wHead * uHatLag;

  // 7. Volume-Preserving Cartoon Squash & Stretch anchored at shoes
  float baseFootY = (0.032 - 0.5) * H;
  float centerLocalX = (uCenterX - 0.5) * W;
  p.y = baseFootY + (p.y - baseFootY) * uSquashY;
  p.x = centerLocalX + (p.x - centerLocalX) * uSquashX;

  // Smooth figurine surface normal for soft studio shading
  vec3 estNormal = normalize(vec3(
    (uv.x - uCenterX) * 1.15 - sin(hYaw * 0.8 + torsoYawAngle * 0.5) * 0.45,
    (uv.y - (uNeckY + 0.05)) * 0.45 + sin(hPitch * 0.7) * 0.3,
    1.0
  ));
  vNormalView = normalize(normalMatrix * estNormal);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uMap;
uniform int uEyeMode;
uniform int uCharFx;
uniform vec4 uEyeL;
uniform vec4 uEyeR;
uniform vec3 uSkinColor;
uniform vec3 uLashColor;

uniform float uBlink;
uniform float uHappy;
uniform float uHover;
uniform float uAtRisk;
uniform float uGleamPhase;
uniform float uFxTime;
uniform float uLookX;
uniform float uLookY;

varying vec2 vUv;
varying vec3 vNormalView;
varying float vHeadFactor;

void applyEyelid(inout vec3 col, vec4 eye, float blinkAmt, float happyAmt) {
  vec2 d = vec2((vUv.x - eye.x) / eye.z, (vUv.y - eye.y) / eye.w);
  float r2 = dot(d, d);
  if (r2 >= 1.12) return;

  // Live animated eye catchlight sparkle while eyes are open
  if (blinkAmt < 0.45) {
    vec2 glintPos = vec2(-0.24 + uLookX * 0.25, 0.28 + uLookY * 0.18);
    float glintDist = length((d - glintPos) * vec2(1.1, 1.3));
    float glint = (1.0 - smoothstep(0.06, 0.24, glintDist))
                * (1.0 - smoothstep(0.0, 0.45, blinkAmt))
                * (0.22 + 0.18 * uHover + 0.2 * abs(sin(uFxTime * 2.4)));
    col += vec3(1.0, 0.98, 0.94) * glint;
  }

  if (blinkAmt <= 0.015) return;

  float ovalMask = 1.0 - smoothstep(0.82, 1.08, r2);
  float smileCurve = mix(0.24, -0.34, clamp(happyAmt, 0.0, 1.0));
  float lidEdge = mix(1.06, -0.32, clamp(blinkAmt, 0.0, 1.0)) + smileCurve * (d.x * d.x);

  float covered = smoothstep(lidEdge - 0.14, lidEdge + 0.10, d.y) * ovalMask;
  if (covered > 0.01) {
    vec3 lidTone = mix(uSkinColor * 0.94, uSkinColor * 1.02, clamp((d.y + 1.0) * 0.5, 0.0, 1.0));
    col = mix(col, lidTone, covered);
  }

  float lashDist = abs(d.y - lidEdge);
  float lashHorizon = 1.0 - smoothstep(0.75, 1.02, abs(d.x));
  float lashWeight = (1.0 - smoothstep(0.06, 0.22, lashDist))
                   * smoothstep(0.08, 0.35, blinkAmt)
                   * lashHorizon
                   * ovalMask;
  col = mix(col, uLashColor, lashWeight * 0.95);
}

void applyStarGleam(inout vec3 col, vec4 eye, float gleamPos) {
  vec2 d = vec2((vUv.x - eye.x) / (eye.z * 1.15), (vUv.y - eye.y) / (eye.w * 1.15));
  float r2 = dot(d, d);
  if (r2 >= 1.1) return;

  float ovalMask = 1.0 - smoothstep(0.75, 1.05, r2);
  float sweep = abs((d.x * 0.72 + d.y * 0.68) - gleamPos);
  float band = (1.0 - smoothstep(0.06, 0.34, sweep)) * ovalMask;
  col += vec3(0.95, 0.90, 0.65) * band * 0.55;
}

void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (tex.a < 0.05) discard;

  vec3 col = tex.rgb;

  // Live animated eye blinking / catchlight / lens glint
  if (uEyeMode == 0) {
    applyEyelid(col, uEyeL, uBlink, uHappy);
    applyEyelid(col, uEyeR, uBlink, uHappy);
  } else if (uEyeMode == 1) {
    applyEyelid(col, uEyeL, uBlink, uHappy);
  } else if (uEyeMode == 2) {
    applyEyelid(col, uEyeR, uBlink, uHappy);
  } else {
    applyStarGleam(col, uEyeL, uGleamPhase);
    applyStarGleam(col, uEyeR, uGleamPhase);
  }

  // Signature character FX: katana glint (Zoro), flame flicker (Ace), sakura pulse (Robin)
  if (uCharFx == 1 && vUv.x < 0.335 && vUv.y > 0.56) {
    float bladeBand = 1.0 - smoothstep(0.02, 0.08, abs(vUv.y - (0.55 + mod(uFxTime * 0.55, 0.52))));
    float metallic = smoothstep(0.25, 0.55, dot(col, vec3(0.333)));
    col += vec3(0.9, 1.0, 0.95) * bladeBand * metallic * (0.45 + uHover * 0.35);
  } else if (uCharFx == 2 && vUv.x < 0.365 && vUv.y > 0.40 && vUv.y < 0.68) {
    float flameHue = smoothstep(0.15, 0.55, col.r - col.b);
    float flicker = 0.5 + 0.5 * sin(uFxTime * 11.0 + vUv.y * 24.0);
    col += vec3(0.28, 0.14, 0.02) * flameHue * flicker;
  } else if (uCharFx == 3 && abs(vUv.x - 0.51) > 0.16 && vUv.y < 0.65) {
    float pinkPetal = smoothstep(0.12, 0.4, col.r + col.b * 0.5 - col.g);
    float shimmer = 0.5 + 0.5 * sin(uFxTime * 5.0 + vUv.y * 16.0 + vUv.x * 12.0);
    col += vec3(0.26, 0.08, 0.22) * pinkPetal * shimmer;
  }

  // Subtle cute anime cheek blush when hovered / delighted
  if (uHover > 0.02 || uHappy > 0.02) {
    float blushAmt = max(uHover * 0.7, uHappy) * 0.16;
    if (uEyeMode != 3) {
      vec2 bL = vec2((vUv.x - (uEyeL.x - 0.005)) / 0.032, (vUv.y - (uEyeL.y - uEyeL.w * 1.8)) / 0.016);
      vec2 bR = vec2((vUv.x - (uEyeR.x + 0.005)) / 0.032, (vUv.y - (uEyeR.y - uEyeR.w * 1.8)) / 0.016);
      float maskB = (1.0 - smoothstep(0.2, 1.0, dot(bL, bL))) + (1.0 - smoothstep(0.2, 1.0, dot(bR, bR)));
      col = mix(col, vec3(0.98, 0.42, 0.48), clamp(maskB, 0.0, 1.0) * blushAmt);
    }
  }

  // Soft studio vinyl toon lighting + Fresnel rim sheen
  vec3 n = normalize(vNormalView);
  vec3 keyDir = normalize(vec3(0.32, 0.62, 0.85));
  float wrapDiff = clamp(dot(n, keyDir) * 0.5 + 0.5, 0.0, 1.0);
  float rim = pow(1.0 - clamp(abs(n.z), 0.0, 1.0), 2.2);

  col *= (0.91 + 0.13 * wrapDiff);
  col += vec3(0.85, 0.93, 1.0) * rim * (0.06 + uHover * 0.08) * vHeadFactor;

  if (uAtRisk > 0.05) {
    col = mix(col, col * vec3(1.04, 0.88, 0.88), clamp(uAtRisk * 0.25, 0.0, 0.25));
  }

  if (!gl_FrontFacing) {
    col *= vec3(0.68, 0.73, 0.84);
  }

  gl_FragColor = vec4(col, tex.a);
  #include <colorspace_fragment>
}
`;

export interface PirateUniforms {
  [uniform: string]: THREE.IUniform;
  uMap: THREE.IUniform<THREE.Texture>;
  uTime: THREE.IUniform<number>;
  uCenterX: THREE.IUniform<number>;
  uNeckY: THREE.IUniform<number>;
  uWaistY: THREE.IUniform<number>;
  uArmLSeg: THREE.IUniform<THREE.Vector4>;
  uArmLRadius: THREE.IUniform<number>;
  uArmRSeg: THREE.IUniform<THREE.Vector4>;
  uArmRRadius: THREE.IUniform<number>;
  uBreath: THREE.IUniform<number>;
  uHipShiftX: THREE.IUniform<number>;
  uTorsoRotZ: THREE.IUniform<number>;
  uTorsoYaw: THREE.IUniform<number>;
  uTorsoPitch: THREE.IUniform<number>;
  uHeadRotZ: THREE.IUniform<number>;
  uHeadYaw: THREE.IUniform<number>;
  uHeadPitch: THREE.IUniform<number>;
  uHeadBob: THREE.IUniform<number>;
  uArmLAngle: THREE.IUniform<number>;
  uArmRAngle: THREE.IUniform<number>;
  uStepL: THREE.IUniform<number>;
  uStepR: THREE.IUniform<number>;
  uFlowAmp: THREE.IUniform<number>;
  uFlowPhase: THREE.IUniform<number>;
  uHatLag: THREE.IUniform<number>;
  uSquashY: THREE.IUniform<number>;
  uSquashX: THREE.IUniform<number>;
  uEyeMode: THREE.IUniform<number>;
  uCharFx: THREE.IUniform<number>;
  uEyeL: THREE.IUniform<THREE.Vector4>;
  uEyeR: THREE.IUniform<THREE.Vector4>;
  uSkinColor: THREE.IUniform<THREE.Color>;
  uLashColor: THREE.IUniform<THREE.Color>;
  uBlink: THREE.IUniform<number>;
  uHappy: THREE.IUniform<number>;
  uHover: THREE.IUniform<number>;
  uAtRisk: THREE.IUniform<number>;
  uGleamPhase: THREE.IUniform<number>;
  uFxTime: THREE.IUniform<number>;
  uLookX: THREE.IUniform<number>;
  uLookY: THREE.IUniform<number>;
}

interface PirateSpringState {
  hoverLevel: number;
  selectLevel: number;
  lookYaw: number;
  lookPitch: number;
  rootScale: number;
  blinkTimer: number;
  blinkProgress: number; // -1 when inactive, 0..1 while blinking
  doubleBlinkQueued: boolean;
  phraseClock: number;
  nextPhraseAt: number;
  activeBurst: number; // 0..1 burst energy (periodic idle wave/nod)
  prevJumpHeight: number;
  landSquash: number;
  headBobLag: number;
}

export interface PirateRig {
  characterId: PirateCharacterId;
  root: THREE.Group;
  figureGroup: THREE.Group;
  sparklesGroup: THREE.Group;
  shadowMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  sosBeacon: THREE.Group;
  baseY: number;
  baseRotY: number;
  phase: number;
  jumpEnergy: number;
  uniforms: PirateUniforms;
  spec: CharacterRigSpec;
  spring: PirateSpringState;
  sparkBasePositions: THREE.Vector3[];
  roomHalo?: THREE.Mesh;
}

export interface PirateAnimState {
  hovered: boolean;
  selected: boolean;
  checkinStatus: "ON_TRACK" | "AT_RISK" | "DONE_TODAY" | "NONE";
  targetLookYaw: number;
  targetLookPitch?: number;
  jumpScale?: number;
  maxScale?: number;
  spinOnJump?: boolean;
}

/**
 * Tạo lưới 2.5D mật độ cao cho nhân vật One Piece để hỗ trợ biến dạng khớp xương GPU mượt 60fps.
 */
function createArticulatedFigurineGeometry(width: number, height: number): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(width, height, 56, 56);
}

/**
 * Dựng nhân vật 3D chibi chuẩn One Piece với hệ xương khớp hoạt hình GPU (đầu, tay, thân, chân,
 * chớp mắt tự nhiên, biểu cảm, hiệu ứng nảy đàn hồi và phụ kiện hào quang 3D theo từng thành viên).
 */
export function buildPirateCrewRig(
  characterId: PirateCharacterId,
  phase = 0,
  textureLoader?: THREE.TextureLoader
): PirateRig {
  const spec = CHARACTER_RIG_SPECS[characterId] ?? CHARACTER_RIG_SPECS.luffy;
  const root = new THREE.Group();
  const figureGroup = new THREE.Group();
  root.add(figureGroup);

  const loader = textureLoader ?? new THREE.TextureLoader();
  const texture = getOrLoadCharacterTexture(characterId, loader);

  // Vòng trạng thái dưới chân nhân vật
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.46, 0.56, 36),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    })
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.025;
  root.add(ringMesh);

  // Đổ bóng mềm dưới chân co giãn theo nhịp nhảy
  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 24),
    new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.22,
    })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  root.add(shadowMesh);

  const skinColor = new THREE.Color().setStyle(spec.skinHex, THREE.SRGBColorSpace);
  const lashColor = new THREE.Color().setStyle(spec.lashHex, THREE.SRGBColorSpace);

  const charFx =
    characterId === "zoro" ? 1 : characterId === "ace" ? 2 : characterId === "robin" ? 3 : 0;

  const uniforms: PirateUniforms = {
    uMap: { value: texture },
    uTime: { value: phase },
    uCenterX: { value: spec.centerX },
    uNeckY: { value: spec.neckY },
    uWaistY: { value: spec.waistY },
    uArmLSeg: { value: new THREE.Vector4(spec.armL.sx, spec.armL.sy, spec.armL.tx, spec.armL.ty) },
    uArmLRadius: { value: spec.armL.radius },
    uArmRSeg: { value: new THREE.Vector4(spec.armR.sx, spec.armR.sy, spec.armR.tx, spec.armR.ty) },
    uArmRRadius: { value: spec.armR.radius },
    uBreath: { value: 0 },
    uHipShiftX: { value: 0 },
    uTorsoRotZ: { value: 0 },
    uTorsoYaw: { value: 0 },
    uTorsoPitch: { value: 0 },
    uHeadRotZ: { value: 0 },
    uHeadYaw: { value: 0 },
    uHeadPitch: { value: 0 },
    uHeadBob: { value: 0 },
    uArmLAngle: { value: 0 },
    uArmRAngle: { value: 0 },
    uStepL: { value: 0 },
    uStepR: { value: 0 },
    uFlowAmp: { value: spec.flowAmount },
    uFlowPhase: { value: phase },
    uHatLag: { value: 0 },
    uSquashY: { value: 1 },
    uSquashX: { value: 1 },
    uEyeMode: { value: spec.eyeMode },
    uCharFx: { value: charFx },
    uEyeL: { value: new THREE.Vector4(...spec.eyeL) },
    uEyeR: { value: new THREE.Vector4(...spec.eyeR) },
    uSkinColor: { value: skinColor },
    uLashColor: { value: lashColor },
    uBlink: { value: 0 },
    uHappy: { value: 0 },
    uHover: { value: 0 },
    uAtRisk: { value: 0 },
    uGleamPhase: { value: -2 },
    uFxTime: { value: phase },
    uLookX: { value: 0 },
    uLookY: { value: 0 },
  };

  const figGeo = createArticulatedFigurineGeometry(1.78, 1.78);
  const figMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const figMesh = new THREE.Mesh(figGeo, figMat);
  figMesh.position.set(0, 0.91, 0);
  figMesh.frustumCulled = false;
  figureGroup.add(figMesh);

  // Vùng raycast ẩn giúp bấm/trỏ chuột lên nhân vật trên boong 3D cực nhạy
  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.44, 1.75, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitProxy.position.y = 0.88;
  figureGroup.add(hitProxy);

  // Các ngôi sao / tinh thể / hào quang 3D thực tế bay quanh nhân vật theo cá tính
  const sparklesGroup = new THREE.Group();
  const sparkColor = SPARKLE_COLORS[characterId] ?? 0xfacc15;
  const sparkMat = new THREE.MeshStandardMaterial({
    color: sparkColor,
    emissive: sparkColor,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.35,
  });

  const sparkOffsets: Array<[number, number, number, number]> = [
    [0.64, 1.25, 0.28, 0.062],
    [-0.62, 0.84, -0.22, 0.054],
    [0.44, 0.48, -0.34, 0.044],
  ];
  const sparkBasePositions: THREE.Vector3[] = [];
  for (const [sx, sy, sz, sr] of sparkOffsets) {
    const geom =
      characterId === "robin" || characterId === "chopper"
        ? new THREE.CylinderGeometry(sr * 1.05, sr * 0.25, sr * 0.45, 5)
        : characterId === "ace" || characterId === "sabo"
          ? new THREE.ConeGeometry(sr * 0.85, sr * 1.9, 6)
          : new THREE.OctahedronGeometry(sr, 0);
    const gem = new THREE.Mesh(geom, sparkMat);
    gem.position.set(sx, sy, sz);
    sparklesGroup.add(gem);
    sparkBasePositions.push(new THREE.Vector3(sx, sy, sz));
  }

  // Law có thêm vòng ROOM xanh ngọc mỏng xoay quanh hông
  let roomHalo: THREE.Mesh | undefined;
  if (characterId === "law") {
    roomHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.014, 8, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.36,
      })
    );
    roomHalo.rotation.x = Math.PI / 2.25;
    roomHalo.position.y = 0.82;
    sparklesGroup.add(roomHalo);
  }
  root.add(sparklesGroup);

  // Đèn báo hiệu SOS 3D cho trạng thái AT_RISK (Gặp sóng lớn)
  const sosBeacon = new THREE.Group();
  sosBeacon.position.set(0, 1.98, 0.08);
  const sosOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.65,
      roughness: 0.2,
    })
  );
  const sosHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.02, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xfb7185 })
  );
  sosHalo.rotation.x = Math.PI / 2.2;
  sosBeacon.add(sosOrb, sosHalo);
  sosBeacon.visible = false;
  root.add(sosBeacon);

  const spring: PirateSpringState = {
    hoverLevel: 0,
    selectLevel: 0,
    lookYaw: 0,
    lookPitch: 0,
    rootScale: 1,
    blinkTimer: 1.1 + ((phase * 1.73) % 2.4),
    blinkProgress: -1,
    doubleBlinkQueued: ((Math.round(phase * 10) % 4) === 0),
    phraseClock: (phase * 0.9) % 4.5,
    nextPhraseAt: 3.4 + ((phase * 1.17) % 2.2),
    activeBurst: 0,
    prevJumpHeight: 0,
    landSquash: 0,
    headBobLag: 0,
  };

  return {
    characterId,
    root,
    figureGroup,
    sparklesGroup,
    shadowMesh,
    ringMesh,
    sosBeacon,
    baseY: 0,
    baseRotY: 0,
    phase,
    jumpEnergy: 0,
    uniforms,
    spec,
    spring,
    sparkBasePositions,
    roomHalo,
  };
}

/**
 * Bộ giải hoạt hình 60fps theo chuẩn phim hoạt hình (12 principles):
 * - Cử động khớp xương độc lập (đầu gật/nghiêng nhìn theo chuột, 2 tay vẫy/cầm vũ khí/nâng cốc,
 *   ngực thở phồng, chân nhún chuyển trọng tâm trái-phải, tóc & áo choàng bay theo gió).
 * - Chớp mắt tự nhiên + nheo mắt cười ^_^ khi chọn/nhảy, ánh sao lấp lánh (Franky/Brook).
 * - Nảy co giãn đàn hồi Squash & Stretch + Follow-Through mượt mà bất kể FPS.
 */
export function animatePirateRig(
  rig: PirateRig,
  elapsed: number,
  delta: number,
  state: PirateAnimState
) {
  const dt = Math.min(Math.max(delta, 0.001), 0.05);
  const s = rig.spring;
  const sp = rig.spec;
  const u = rig.uniforms;
  const t = elapsed + rig.phase;

  // Frame-rate independent smooth damping
  const dampFast = 1 - Math.exp(-dt * 12);
  const dampMed = 1 - Math.exp(-dt * 7.5);
  const dampSlow = 1 - Math.exp(-dt * 4.5);

  s.hoverLevel = THREE.MathUtils.lerp(s.hoverLevel, state.hovered ? 1 : 0, dampFast);
  s.selectLevel = THREE.MathUtils.lerp(s.selectLevel, state.selected ? 1 : 0, dampFast);
  s.lookYaw = THREE.MathUtils.lerp(s.lookYaw, state.targetLookYaw, dampMed);
  s.lookPitch = THREE.MathUtils.lerp(s.lookPitch, state.targetLookPitch ?? 0, dampMed);

  // Jump trigger & spin timing
  if (rig.jumpEnergy > 0.004) {
    rig.jumpEnergy = Math.max(0, rig.jumpEnergy - dt * 1.45);
  } else {
    rig.jumpEnergy = 0;
  }
  const jumpHeightScale = state.jumpScale ?? 1;
  // Double-hop bouncy arc when facing forward, smooth single high jump if spinning 360
  const jumpArc = state.spinOnJump
    ? Math.sin(rig.jumpEnergy * Math.PI)
    : Math.abs(Math.sin(rig.jumpEnergy * Math.PI * 2)) * (0.45 + 0.55 * rig.jumpEnergy);
  const jumpHeight = jumpArc * 0.5 * jumpHeightScale;
  const jumpVel = (jumpHeight - s.prevJumpHeight) / dt;
  // Detect landing impact to drive cute squash bounce
  if (s.prevJumpHeight > 0.02 && jumpHeight <= 0.02) {
    s.landSquash = 1.0;
  }
  s.prevJumpHeight = jumpHeight;
  s.landSquash = Math.max(0, s.landSquash - dt * 4.5);

  const spinAngle = state.spinOnJump
    ? rig.jumpEnergy * Math.PI * 2
    : Math.sin(rig.jumpEnergy * Math.PI * 3) * 0.34;

  // Natural Blinking & Expression Scheduler
  s.blinkTimer -= dt;
  if (s.blinkTimer <= 0 && s.blinkProgress < 0) {
    s.blinkProgress = 0;
  }
  let blinkVal = 0;
  if (s.blinkProgress >= 0) {
    s.blinkProgress += dt * 4.6; // ~0.22s crisp anime blink cycle
    if (s.blinkProgress >= 1) {
      s.blinkProgress = -1;
      if (s.doubleBlinkQueued) {
        s.doubleBlinkQueued = false;
        s.blinkTimer = 0.09; // quick double blink
      } else {
        const pseudoRand = Math.abs(Math.sin(elapsed * 12.9898 + rig.phase * 78.233));
        s.doubleBlinkQueued = pseudoRand > 0.76;
        s.blinkTimer = 2.3 + pseudoRand * 2.6;
      }
    } else {
      // Fast close (0..0.38) -> smooth open (0.38..1.0)
      const p = s.blinkProgress;
      blinkVal = p < 0.38 ? Math.sin((p / 0.38) * (Math.PI / 2)) : Math.cos(((p - 0.38) / 0.62) * (Math.PI / 2));
    }
  }

  // Happy ^_^ eye squint during jump celebrate or when actively selected+hovered
  const celebrateHappy = rig.jumpEnergy > 0.15 ? Math.sin(rig.jumpEnergy * Math.PI) : 0;
  const happyTarget = Math.max(celebrateHappy, s.selectLevel * 0.35 + s.hoverLevel * 0.25);
  u.uBlink.value = Math.max(blinkVal, celebrateHappy * 0.92);
  u.uHappy.value = THREE.MathUtils.lerp(u.uHappy.value, happyTarget, dampFast);
  u.uHover.value = s.hoverLevel;
  u.uAtRisk.value = THREE.MathUtils.lerp(u.uAtRisk.value, state.checkinStatus === "AT_RISK" ? 1 : 0, dampMed);
  u.uGleamPhase.value = -1.6 + ((elapsed * 1.15 + rig.phase) % 3.2) * 1.25;
  u.uFxTime.value = elapsed + rig.phase;
  u.uLookX.value = s.lookYaw;
  u.uLookY.value = s.lookPitch;

  // Periodic Idle Expressive Wave / Gesture Phrase (~every 4s so characters feel truly alive!)
  s.phraseClock += dt;
  if (s.phraseClock >= s.nextPhraseAt) {
    s.phraseClock = 0;
    const pseudo = Math.abs(Math.sin(elapsed * 7.13 + rig.phase * 19.7));
    s.nextPhraseAt = 3.2 + pseudo * 2.4;
  }
  const phraseActiveWindow = s.phraseClock < 1.35 ? Math.sin((s.phraseClock / 1.35) * Math.PI) : 0;
  const gestureTarget = Math.max(phraseActiveWindow * 0.72, s.hoverLevel, s.selectLevel * 0.85, Math.sin(rig.jumpEnergy * Math.PI));
  s.activeBurst = THREE.MathUtils.lerp(s.activeBurst, gestureTarget, dampMed);

  // Vòng sáng & SOS theo trạng thái
  const ringMat = rig.ringMesh.material as THREE.MeshBasicMaterial;
  if (state.checkinStatus === "AT_RISK") {
    rig.sosBeacon.visible = true;
    rig.sosBeacon.rotation.y = elapsed * 3.8;
    rig.sosBeacon.position.y = 1.96 + Math.sin(elapsed * 6.5) * 0.06;
    ringMat.color.setHex(0xf43f5e);
    ringMat.opacity = 0.75 + Math.sin(elapsed * 5.5) * 0.2;
  } else {
    rig.sosBeacon.visible = false;
    if (state.selected) {
      ringMat.color.setHex(0xfbbf24);
      ringMat.opacity = 0.95;
    } else if (state.checkinStatus === "ON_TRACK" || state.checkinStatus === "DONE_TODAY") {
      ringMat.color.setHex(0x10b981);
      ringMat.opacity = 0.72;
    } else if (state.hovered) {
      ringMat.color.setHex(0x38bdf8);
      ringMat.opacity = 0.85;
    } else {
      ringMat.color.setHex(0xfde68a);
      ringMat.opacity = 0.42;
    }
  }

  // Smooth zoom without per-frame Vector3 allocations
  const peakScale = state.maxScale ?? 1.11;
  const targetScale = state.selected ? peakScale : state.hovered ? (1 + (peakScale - 1) * 0.65) : 1.0;
  s.rootScale = THREE.MathUtils.lerp(s.rootScale, targetScale, dampFast);
  rig.root.scale.set(s.rootScale, s.rootScale, s.rootScale);

  const isRisk = state.checkinStatus === "AT_RISK";
  const energyBoost = 1 + s.hoverLevel * 0.45 + s.selectLevel * 0.32;
  const tempo = isRisk ? 1.75 : 1 + s.hoverLevel * 0.38 + s.selectLevel * 0.22;

  // 1. Character Root Hop + Alternating Weight Shift
  const stepCycle = Math.sin(t * sp.bounceSpeed * tempo);
  const idleHop = Math.abs(stepCycle) * sp.bounceAmp * energyBoost;
  const totalHop = jumpHeight + idleHop;
  rig.figureGroup.position.y = totalHop;

  // Breathing & Torso Rhythm
  const breath = Math.sin(t * 2.55) * 0.5 + 0.5;
  u.uTime.value = elapsed;
  u.uBreath.value = breath;
  u.uHipShiftX.value = Math.cos(t * sp.bounceSpeed * 0.5 * tempo) * (0.036 * energyBoost);
  u.uTorsoRotZ.value = Math.sin(t * sp.bounceSpeed * 0.5 * tempo) * (sp.grooveAmp * 1.25 * energyBoost)
                     + (isRisk ? Math.sin(elapsed * 8.5) * 0.08 : 0);
  u.uTorsoYaw.value = s.lookYaw * 0.3 + Math.sin(t * 1.15) * 0.1;
  u.uTorsoPitch.value = s.hoverLevel * -0.06 + Math.sin(t * 2.1) * 0.028 + (isRisk ? 0.065 : 0);

  // 2. Foot/Leg Alternating Micro-Step
  u.uStepL.value = Math.max(0, stepCycle) * (0.42 + s.hoverLevel * 0.48);
  u.uStepR.value = Math.max(0, -stepCycle) * (0.42 + s.hoverLevel * 0.48);

  // 3. Independent Expressive Head Tilt, Nod & Cursor Tracking (Delayed Follow-Through!)
  const headPhase = t - 0.14; // 140ms cartoon follow-through lag behind torso!
  const tiltIdle = Math.sin(headPhase * 1.55) * 0.095 + phraseActiveWindow * Math.sin(headPhase * 3.1) * 0.125;
  const nodHappy = Math.sin(headPhase * sp.bounceSpeed * tempo) * 0.085 * energyBoost + s.hoverLevel * -0.045;
  u.uHeadRotZ.value = tiltIdle - u.uTorsoRotZ.value * 0.35;
  u.uHeadYaw.value = s.lookYaw * 0.68 + Math.sin(t * 1.15 - 0.2) * 0.16;
  u.uHeadPitch.value = nodHappy + s.lookPitch * 0.35;

  const targetHeadBob = Math.sin(headPhase * sp.bounceSpeed * tempo) * 0.02 * sp.headBobRatio * energyBoost;
  s.headBobLag = THREE.MathUtils.lerp(s.headBobLag, targetHeadBob, dampFast);
  u.uHeadBob.value = s.headBobLag;

  // 4. Arm Waving / Weapon Brandishing / Guitar Strumming
  const waveBaseL = Math.sin(t * 3.9 * sp.armL.freqScale + sp.armL.phaseOffset);
  const burstWaveL = Math.sin(elapsed * 7.4 * sp.armL.freqScale + sp.armL.phaseOffset);
  u.uArmLAngle.value =
    waveBaseL * sp.armL.idleAmp * 1.25 +
    burstWaveL * sp.armL.hoverAmp * 1.2 * s.activeBurst +
    rig.jumpEnergy * 0.34;

  const waveBaseR = Math.sin(t * 3.9 * sp.armR.freqScale + sp.armR.phaseOffset);
  const burstWaveR = Math.sin(elapsed * 7.4 * sp.armR.freqScale + sp.armR.phaseOffset);
  u.uArmRAngle.value =
    -waveBaseR * sp.armR.idleAmp * 1.25 -
    burstWaveR * sp.armR.hoverAmp * 1.2 * s.activeBurst -
    rig.jumpEnergy * 0.28;

  // 5. Flowing Hair, Hat Brim & Coat Wind Overlap
  u.uFlowPhase.value = elapsed * (2.6 + s.hoverLevel * 1.4) + rig.phase;
  u.uFlowAmp.value = sp.flowAmount * (1 + s.hoverLevel * 0.65 + (isRisk ? 0.5 : 0));
  u.uHatLag.value = THREE.MathUtils.clamp(-jumpVel * 0.015 - Math.cos(t * sp.bounceSpeed * tempo) * 0.012, -0.06, 0.06);

  // 6. Volume-Preserving Cartoon Squash & Stretch
  const jumpStretch = THREE.MathUtils.clamp(jumpVel * 0.04, -0.05, 0.13);
  const landCompress = Math.sin(s.landSquash * Math.PI) * 0.11;
  const idleSquash = Math.sin(t * sp.bounceSpeed * tempo - 0.35) * 0.032 * energyBoost;
  const squashY = Math.max(0.84, 1 + jumpStretch - landCompress + idleSquash);
  const squashX = 1 / Math.sqrt(squashY);
  u.uSquashY.value = squashY;
  u.uSquashX.value = squashX;

  // Subtle tilt of overall container during panic/wave without rigid plank feel
  rig.figureGroup.rotation.z = THREE.MathUtils.lerp(
    rig.figureGroup.rotation.z,
    isRisk ? Math.sin(t * 7.6) * 0.05 : Math.sin(t * 1.6) * 0.015,
    dampFast
  );
  rig.figureGroup.rotation.x = THREE.MathUtils.lerp(
    rig.figureGroup.rotation.x,
    s.hoverLevel * -0.035,
    dampFast
  );

  // Ground Shadow scales cleanly with jump
  const shadowScale = Math.max(0.52, 1 - totalHop * 0.62);
  rig.shadowMesh.scale.set(shadowScale, shadowScale, 1);

  // Orbiting 3D sparkles / sakura petals / flame embers (zero accumulated drift!)
  const sparkSpeed = 1.05 + s.hoverLevel * 1.35 + s.selectLevel * 0.85;
  rig.sparklesGroup.rotation.y += dt * sparkSpeed;
  for (let i = 0; i < rig.sparkBasePositions.length; i++) {
    const gem = rig.sparklesGroup.children[i];
    const basePos = rig.sparkBasePositions[i];
    if (!gem || !basePos) continue;
    gem.rotation.y += dt * 2.4;
    gem.rotation.x += dt * 1.5;
    gem.position.y = basePos.y + Math.sin(elapsed * 3.1 + i * 2.1 + rig.phase) * 0.07;
    const gemScale = 0.88 + Math.sin(elapsed * 4.2 + i) * 0.18 + s.hoverLevel * 0.25;
    gem.scale.set(gemScale, gemScale, gemScale);
  }
  if (rig.roomHalo) {
    rig.roomHalo.rotation.z = elapsed * 1.4;
    const haloScale = 0.92 + Math.sin(elapsed * 3.0) * 0.05 + s.hoverLevel * 0.16;
    rig.roomHalo.scale.set(haloScale, haloScale, 1);
  }

  // Root look turn + 360-degree celebratory flip on click
  const idleTurn = Math.sin(t * 1.25) * 0.14;
  const lookTarget =
    rig.baseRotY +
    spinAngle +
    (state.hovered || state.selected ? s.lookYaw * 0.42 : idleTurn);
  rig.root.rotation.y = THREE.MathUtils.lerp(rig.root.rotation.y, lookTarget, dampSlow);
}
