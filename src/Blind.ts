import { Accessory } from './Accessory';

export class Blind extends Accessory {
  device: any;
  position: number;
  switchable: boolean;
  dimmable: boolean;

  get isOpen() {
    return this.position === 100;
  }

  get isClosed() {
    return this.position === 0;
  }

  constructor(device) {
    super(device);
    const blind = device.blindList[0];
    this.position = blind.position;
    this.switchable = blind.isSwitchable;
    this.dimmable = blind.isDimmable;
  }

  operate(obj: any, val?: Record<string, any>) {
    this.device.client.operateBlind(this.device, obj, val);
  }

  open() {
    return this.operate({
      position: 100
    });
  }

  close() {
    return this.operate({
      position: 0
    });
  }

  setPosition(pos) {
    return this.operate({
      position: pos
    });
  }
}
