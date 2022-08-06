import EventEmitter from 'events';

const hasProp = {}.hasOwnProperty;

export class Accessory extends EventEmitter {
  id: number;
  deleted: boolean;
  name: string;
  alive: boolean;
  emit: (...any) => void;

  // This is the inherited constructor
  constructor(device: any) {
    super();
    this.deleted = false;
    this.id = device.instanceId;
    this.name = device.name;
    this.alive = device.alive;

    Object.defineProperty(this, 'device', {
      // non-enumerable property
      writable: true,
      value: device
    });
    Object.defineProperty(this, 'type', {
      enumerable: true,
      value: this.constructor.name
    });
  }

  change(newer) {
    var k, now, v, was;
    was = {
      name: this.name
    };
    now = {
      name: this.name
    };
    for (k in newer) {
      if (!hasProp.call(newer, k)) continue;
      v = newer[k];
      if (!(v !== this[k] && k[0] !== '_')) {
        continue;
      }
      was[k] = this[k];
      now[k] = newer[k];
      this[k] = newer[k];
    }
    if (Object.keys(now).length !== 1) {
      // don't emit a change unless something's actually changed
      return this.emit('changed', now, was);
    }
  }

  delete() {
    this.deleted = true;
    return this.emit('deleted', this.name);
  }

  toString() {
    return this.name;
  }
}
