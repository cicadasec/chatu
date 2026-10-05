import * as THREE from 'three';
import type { AudioAnalyserData } from '@/types/audio';

export interface LipSyncTarget {
  mesh: THREE.Mesh;
  morphTargetDictionary?: Record<string, number>;
}

export class LipSyncController {
  private targets: LipSyncTarget[] = [];
  private jawBone: THREE.Bone | null = null;
  private hasFacialRig = false;
  private currentOpen = 0;

  /**
   * Inspects model hierarchy for facial bones, morph targets, or visemes.
   */
  public bindModel(root: THREE.Object3D): void {
    this.targets = [];
    this.jawBone = null;
    this.hasFacialRig = false;

    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          this.targets.push({
            mesh,
            morphTargetDictionary: mesh.morphTargetDictionary,
          });
          this.hasFacialRig = true;
        }
      } else if ((obj as THREE.Bone).isBone) {
        const bone = obj as THREE.Bone;
        const name = bone.name.toLowerCase();
        if (name.includes('jaw') || name.includes('mouth') || name.includes('chin')) {
          this.jawBone = bone;
          this.hasFacialRig = true;
        }
      }
    });
  }

  public update(metrics: AudioAnalyserData | null, isSpeaking: boolean, delta: number): number {
    const targetOpen = isSpeaking && metrics ? Math.min(1, metrics.volume * 2.5) : 0;
    const lerpRate = 1 - Math.exp(-20 * delta);
    this.currentOpen += (targetOpen - this.currentOpen) * lerpRate;

    if (this.hasFacialRig) {
      // If morph targets exist, drive 'mouthOpen', 'viseme_aa', or similar
      for (const target of this.targets) {
        const dict = target.morphTargetDictionary;
        const influences = target.mesh.morphTargetInfluences;
        if (dict && influences) {
          const keys = ['mouthOpen', 'viseme_aa', 'jawOpen', 'A'];
          for (const key of keys) {
            if (dict[key] !== undefined) {
              influences[dict[key]] = this.currentOpen;
            }
          }
        }
      }

      if (this.jawBone) {
        this.jawBone.rotation.x = this.currentOpen * 0.25;
      }
    }

    // Return current opening amount (0 to 1) so procedural visor/head can also use it
    return this.currentOpen;
  }
}
