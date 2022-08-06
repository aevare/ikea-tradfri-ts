import { Property } from './Property';

export class Scene extends Property {
  deleted: boolean;
  id: number;
  name: string;
  predefined: boolean;
  index: number;
  lights: number[];

  constructor(scene) {
    super();
    this.deleted = false;
    this.id = scene.instanceId;
    this.name = scene.name;
    this.predefined = scene.isPredefined;
    this.index = scene.sceneIndex;
    this.lights = (function () {
      var i, len, ref, ref1, results, light;
      ref1 = (ref = scene.lightSettings) != null ? ref : [];
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        light = ref1[i];
        results.push(light.instanceId);
      }
      return results;
    })();
  }
}
