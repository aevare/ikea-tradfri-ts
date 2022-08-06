import { Accessory } from './Accessory';

export class Bulb extends Accessory {
  device: any;
  brightness: number;
  isOn: boolean;
  transition: any;
  switchable: boolean;
  dimmable: boolean;
  spectrum: string; // white...
  temperature: number;
  hexcolour: string;
  hue: any; // Dont know
  saturation: any; // Dont know

  get level() {
    return this.brightness;
  }
  set level(level) {
    this.setBrightness(level);
  }

  get colour() {
    switch (this.spectrum) {
      case 'white':
        switch (this.temperature) {
          case 1:
            return 'white';
          case 62:
            return 'warm';
          case 97:
            return 'glow';
          default:
            return this.temperature;
        }
        break;
      default:
        return this.hexcolour;
    }
  }
  set colour(colour) {
    this.setColour(colour);
  }
  get color() {
    return this.colour;
  }
  set color(colour) {
    this.setColour(colour);
  }

  constructor(device: any) {
    super(device);
    const light = device.lightList[0];

    this.brightness = light.dimmer;
    this.isOn = light.onOff;
    this.transition = light.transitionTime;
    this.switchable = light.isSwitchable;
    this.dimmable = light.isDimmable;
    this.spectrum = light.spectrum;
    this.temperature = light.colorTemperature;
    this.hexcolour = light.color;

    if (light.hue != null) {
      this.hue = light.hue;
    }
    if (light.saturation != null) {
      this.saturation = light.saturation;
    }
  }

  operate(obj: Record<string, any>) {
    return this.device.client.operateLight(this.device, obj);
  }

  switch(onOff: boolean) {
    return this.operate({
      onOff: onOff
    }).then((ok) => {
      this.isOn = onOff;
      return ok;
    });
  }

  setBrightness(level: number) {
    return this.operate({
      dimmer: level
    }).then((ok) => {
      this.brightness = level;
      return ok;
    });
  }

  setColor(colour: string) {
    return this.setColour(colour);
  }
  setColour(colour: string | number) {
    var temp;
    switch (this.spectrum) {
      case 'white': {
        // cold/warm bulbs
        switch (colour) {
          case 'white':
            temp = 1;
            break;
          case 'warm':
          case 'warm white':
            temp = 62;
            break;
          case 'glow':
          case 'warm glow':
            temp = 97;
            break;
          default:
            temp = parseInt(colour as string);
            if (!(0 <= temp && temp <= 100)) {
              // 0 to 100 inclusive
              throw new Error(`Unknown colour of ${colour}`);
            }
        }

        return this.operate({
          colorTemperature: temp
        }).then((ok) => {
          this.temperature = temp;
          return ok;
        });
      }
      case 'rgb':
        throw new Error('Not written yet');
      case 'none': // do nothing
        break;
      default:
        throw new Error(`Unknown bulb spectrum: ${this.spectrum}`);
    }
  }
}
