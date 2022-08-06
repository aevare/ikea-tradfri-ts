import { Accessory } from './Accessory';

export class Plug extends Accessory {
  device: any;
  isOn: boolean;
  switchable: boolean;

  constructor(device: any) {
    super(device);
    const plug = device.plugList[0];
    this.isOn = plug.onOff;
    this.switchable = plug.isSwitchable;
  }

  async operate(obj: Record<string, any>) {
    if (this.switchable) {
      this.device.client.operatePlug(this.device, obj);
    }
  }

  switch(onOff: boolean) {
    return this.operate({
      onOff: onOff
    }).then((ok) => {
      return ok;
    });
  }
}
