import { Property } from './Property';
import { Scene } from './Scene';
import { Accessory } from './Accessory';
import { Devices } from './Devices';

const hasProp = {}.hasOwnProperty;

export class Group extends Property {
  static groups = new Map();
  groupScenes: Map<string, any>;
  rawGroup: any;
  sceneId: string;
  deleted: boolean;
  id: number;
  name: string;
  isOn: boolean;
  dimmer: number; // dunno

  get scene() {
    var ref;
    return (ref = this.groupScenes.get(this.sceneId)) != null ? ref.name : void 0;
  }
  set scene(name) {
    this.setScene(name);
  }

  get scenes() {
    return Array.from(this.groupScenes.values()).map((value) => {
      return value.name;
    });
  }

  get level() {
    return this.dimmer;
  }

  constructor(group) {
    super();

    this.deleted = false;
    this.id = group.instanceId;
    this.name = group.name;
    this.isOn = group.onOff;
    this.dimmer = group.dimmer;
    this.sceneId = group.sceneId;
    const firstdevice = Devices.byID(group.deviceIDs[0]);
    if (firstdevice != null) {
      firstdevice.on('changed', (now) => {
        if (now.isOn != null) {
          return (this.isOn = now.isOn);
        }
      });
    }
    Object.defineProperty(this, 'rawGroup', {
      value: group
    });
    Object.defineProperty(this, 'groupScenes', {
      value: new Map()
    });
  }

  static update(group): { action: 'UPDATE' | 'ADD'; group: any } {
    const newgroup = new Group(group);
    if (Group.groups.has(newgroup.id)) {
      const grp = Group.groups.get(newgroup.id);
      grp.change(newgroup); // , group
      return { action: 'UPDATE', group: grp };
    } else {
      Group.groups.set(newgroup.id, newgroup);
      return { action: 'ADD', group: newgroup };
    }
  }

  static delete(instanceId: number) {
    const deleted = Group.groups.get(instanceId);
    if (deleted != null) {
      Group.groups.delete(deleted.instanceId);
    }
    return deleted;
  }

  static get(name: string) {
    return [...Group.groups.values()].find((group) => group.name === name);
  }

  static byID(id) {
    return Group.groups.get(id);
  }

  static close() {
    return this.groups.clear();
  }

  static listGroups() {
    return [...Group.groups.values()];
  }

  change(newgroup: any) {
    var k, v;
    const results: any[] = [];
    for (k in newgroup) {
      if (!hasProp.call(newgroup, k)) continue;
      v = newgroup[k];
      if (v != null) {
        results.push((this[k] = v));
      }
    }
    return results;
  }

  addScene(scene) {
    if (!(scene instanceof Scene)) {
      scene = new Scene(scene);
    }
    return this.groupScenes.set(scene.id, scene);
  }

  getScene(name) {
    return [...this.groupScenes.values()].find((scene) => scene.name === name);
  }

  delScene(sceneID) {
    return this.groupScenes.delete(sceneID);
  }

  operate(operation) {
    return this.rawGroup.client.operateGroup(this.rawGroup, operation);
  }

  switch(onOff: boolean) {
    return this.rawGroup.toggle(onOff).then((ok) => {
      this.isOn = onOff;
      return onOff;
    });
  }

  setScene(name) {
    var id, ref;
    id = (ref = this.getScene(name)) != null ? ref.id : void 0;
    if (id) {
      return this.rawGroup.activateScene(id).then((ok) => {
        this.sceneId = id;
        return id;
      });
    } else {
      return Promise.reject(new Error(`Can't find scene ${name} in ${this.name}`));
    }
  }

  setLevel(level: number) {
    return this.rawGroup.setBrightness(level).then((ok) => {
      this.dimmer = level;
      return level;
    });
  }
}
