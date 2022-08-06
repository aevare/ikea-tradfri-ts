export interface IProperty {
  property: (name: string, accessors: any) => any;
}

export class Property {
  static property(name: string, accessors: any) {
    return Object.defineProperty(this.prototype, name, accessors);
  }
}
