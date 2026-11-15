import * as THREE from 'three';

/**
 * Bakes a clip from one humanoid onto another whose bones have different rest
 * orientations. Both skeletons are posed in world space: every frame, each
 * source bone's rotation away from its own rest pose is applied to the matching
 * target bone's rest pose, then turned back into a local rotation. Only the hips
 * keep a translation (height and sway, scaled by leg length).
 */
export function retargetClip(
  source: THREE.Object3D, sourceClip: THREE.AnimationClip,
  target: THREE.Object3D, map: (targetBone: string) => string | null,
  fps = 30,
): THREE.AnimationClip {
  // The source may be a bare skeleton (no skin, so plain nodes): take every named node.
  const bones = (root: THREE.Object3D, any: boolean) => { const m = new Map<string, THREE.Bone>(); root.traverse((o) => { if ((o as THREE.Bone).isBone || (any && o.name && o !== root)) m.set(o.name, o as THREE.Bone); }); return m; };
  const sb = bones(source, true), tb = bones(target, false);
  const restS = new Map<string, THREE.Quaternion>(), restT = new Map<string, THREE.Quaternion>();
  const restLocalT = new Map<string, THREE.Quaternion>();
  source.updateMatrixWorld(true); target.updateMatrixWorld(true);
  // Rest = the pose the file was saved in (a T-pose for every Mixamo-style rig).
  const srcRestLocal = new Map<string, [THREE.Vector3, THREE.Quaternion]>();
  for (const [n, b] of sb) srcRestLocal.set(n, [b.position.clone(), b.quaternion.clone()]);
  const wq = (o: THREE.Object3D) => o.getWorldQuaternion(new THREE.Quaternion());
  for (const [n, b] of sb) restS.set(n, wq(b));
  for (const [n, b] of tb) { restT.set(n, wq(b)); restLocalT.set(n, b.quaternion.clone()); }
  // Line the target's rest pose up with the source's, bone by bone, so an
  // A-pose rig and a T-pose rig still swing their arms the same way.
  const wp = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  for (const [n, b] of tb) {
    const sn = map(n); if (!sn || !sb.has(sn)) continue;
    const child = b.children.find((c) => (c as THREE.Bone).isBone && map(c.name) && sb.has(map(c.name)!));
    if (!child || /hips$/i.test(n)) continue;
    const dt = wp(child).sub(wp(b)), ds = wp(sb.get(map(child.name)!)!).sub(wp(sb.get(sn)!));
    if (dt.lengthSq() < 1e-10 || ds.lengthSq() < 1e-10) continue;
    const align = new THREE.Quaternion().setFromUnitVectors(dt.normalize(), ds.normalize());
    restT.set(n, align.multiply(restT.get(n)!));
  }
  const hipName = [...tb.keys()].find((n) => /hips$/i.test(n))!;
  const srcHipName = map(hipName)!;
  const srcHip = sb.get(srcHipName)!, tgtHip = tb.get(hipName)!;
  const srcHipRest = srcHip.getWorldPosition(new THREE.Vector3());
  const tgtHipRest = tgtHip.getWorldPosition(new THREE.Vector3());
  const tgtHipLocalRest = tgtHip.position.clone();
  const scale = tgtHipRest.y / Math.max(1e-4, srcHipRest.y);

  const mixer = new THREE.AnimationMixer(source);
  const action = mixer.clipAction(sourceClip); action.play();
  const frames = Math.max(2, Math.round(sourceClip.duration * fps) + 1);
  const times: number[] = [];
  const order: THREE.Bone[] = []; // parents before children
  target.traverse((o) => { if ((o as THREE.Bone).isBone && map(o.name) && sb.has(map(o.name)!)) order.push(o as THREE.Bone); });
  const qv = new Map<string, number[]>(); for (const b of order) qv.set(b.name, []);
  const hipPos: number[] = [];
  const d = new THREE.Quaternion(), w = new THREE.Quaternion(), pw = new THREE.Quaternion();
  const hipInvParent = new THREE.Matrix4();
  for (let f = 0; f < frames; f++) {
    const t = Math.min(sourceClip.duration, f / fps);
    times.push(t);
    mixer.setTime(t); source.updateMatrixWorld(true);
    for (const b of order) {
      const s = sb.get(map(b.name)!)!;
      d.copy(wq(s)).multiply(restS.get(s.name)!.clone().invert());
      w.copy(d).multiply(restT.get(b.name)!);
      b.parent!.updateWorldMatrix(true, false);
      pw.copy(wq(b.parent!)).invert();
      b.quaternion.copy(pw.multiply(w));
      b.updateMatrixWorld(true);
      qv.get(b.name)!.push(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    }
    // hips: world offset from rest, scaled, back into the parent's space
    const sp = srcHip.getWorldPosition(new THREE.Vector3()).sub(srcHipRest).multiplyScalar(scale);
    sp.x *= 0.6; sp.z = 0; // in place: keep the sway and the bob
    const wp = tgtHipRest.clone().add(sp);
    hipInvParent.copy(tgtHip.parent!.matrixWorld).invert();
    wp.applyMatrix4(hipInvParent);
    hipPos.push(wp.x, wp.y, wp.z);
  }
  mixer.stopAllAction(); mixer.uncacheRoot(source);
  for (const [n, [p, q]] of srcRestLocal) { sb.get(n)!.position.copy(p); sb.get(n)!.quaternion.copy(q); }
  for (const [n, q] of restLocalT) tb.get(n)!.quaternion.copy(q);
  tgtHip.position.copy(tgtHipLocalRest);
  const tracks: THREE.KeyframeTrack[] = order.map((b) => new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, qv.get(b.name)!));
  tracks.push(new THREE.VectorKeyframeTrack(hipName + '.position', times, hipPos));
  return new THREE.AnimationClip(sourceClip.name, sourceClip.duration, tracks);
}
