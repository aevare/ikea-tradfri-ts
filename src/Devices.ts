import { Bulb } from './Bulb';
import { Remote } from './Remote';
import { Sensor } from './Sensor';
import { Plug } from './Plug';
import { Blind } from './Blind';
import { SlaveRemote } from './SlaveRemote';
import { Repeater } from './Repeater';
import { Accessory } from './Accessory';
import { AccessoryTypes } from 'node-tradfri-client';
import EventEmitter from 'events';

export class Devices extends EventEmitter {
  static devices = new Map();
  emit: (...any) => void;

  // Bulb, Remote, Sensor etc. should not be constructed externally
  // but should be created here
  static update(device): { action: 'ADD' | 'UPDATE'; device: any } {
    const type = AccessoryTypes[device.type];
    const item = (function () {
      switch (type) {
        case 'lightbulb':
          return new Bulb(device);
        case 'remote':
          return new Remote(device);
        case 'slaveRemote':
          return new SlaveRemote(device);
        case 'motionSensor':
          return new Sensor(device);
        case 'plug':
          return new Plug(device);
        case 'signalRepeater':
          return new Repeater(device);
        case 'blind':
          return new Blind(device);
        default:
          // It's an unknown device: return a generic Accessory
          return new Accessory(device);
      }
    })();

    if (this.devices.has(item.id)) {
      const dev = this.devices.get(item.id);
      dev.change(item);
      dev.device = device;
      return { action: 'UPDATE', device: dev };
    } else {
      this.devices.set(item.id, item);
      return { action: 'ADD', device: item };
    }
  }

  static delete(instanceId) {
    var deleted = this.devices.get(instanceId);
    if (deleted !== null) {
      this.devices.delete(deleted.instanceId);
      deleted.delete();
    }
    return deleted;
  }

  static get(name: string | string[]) {
    const vals = this.devices.values();
    if (Array.isArray(name)) {
      return [...vals].filter((item) => name.includes(item.name));
    } else {
      return [...vals].find((item) => item.name === name);
    }
  }

  static byID(id: number) {
    return this.devices.get(id);
  }

  static close() {
    return this.devices.clear();
  }

  static listDevices() {
    return [...this.devices.values()];
  }
}
