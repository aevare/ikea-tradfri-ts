import { TradfriClient, TradfriError, TradfriErrorCodes, TradfriOptions } from 'node-tradfri-client';
import Debug from 'debug';
import EventEmitter from 'events';
import { Devices } from './Devices';
import { Group } from './Group';

const debug = Debug('ikea-tradfri');

const States = Object.freeze({
  DISCONNECTED: Symbol('disconnected'),
  CONNECTING: Symbol('connecting'),
  CONNECTED: Symbol('connected')
});

const sleep = (secs = 1) => {
  return new Promise((resolve) => {
    return globalThis.setTimeout(resolve, secs * 1000);
  });
};

type ICredentials = {
  psk: string;
  identity: string;
};

class Tradfri extends EventEmitter {
  hub: string;
  credentials: ICredentials;
  securityId?: string;
  debug: (msg: string, lvl: string) => void;
  client: TradfriClient;
  connectState: symbol = States.DISCONNECTED;
  emit: (...any) => void;

  get devices() {
    return Devices.listDevices();
  }

  get groups() {
    return Group.listGroups();
  }

  // This should be called with either a securityId string
  // or an object containing the keys: identity & psk
  constructor(hub: string, securityId: string | ICredentials, customLogger?: any, passThrough?: boolean) {
    super();
    this.hub = hub;

    if (typeof securityId === 'string') {
      this.securityId = securityId;
    } else {
      this.credentials = securityId as ICredentials;
    }

    this.debug =
      customLogger != null
        ? customLogger
        : function (msg, level) {
            return debug(msg);
          };

    const params: Partial<TradfriOptions> = {
      watchConnection: true
    };
    if (customLogger != null && passThrough === true) {
      params.customLogger = customLogger;
    }
    this.client = new TradfriClient(this.hub, params);
  }

  connect() {
    this.debug(`connectState: ${this.connectState.toString()}`, 'debug');
    switch (this.connectState) {
      case States.CONNECTED:
        return Promise.resolve(this.credentials);
      case States.CONNECTING:
        return new Promise(async (resolve, reject) => {
          while (this.connectState !== States.CONNECTED) {
            await sleep(0.25);
          }
          return resolve(this.credentials);
        });
      case States.DISCONNECTED:
        this.connectState = States.CONNECTING;
        return (
          typeof this.securityId === 'string'
            ? this.client.authenticate(this.securityId)
            : Promise.resolve({
                identity: this.credentials.identity,
                psk: this.credentials.psk
              })
        )
          .then((result) => {
            this.credentials = result;
            this.client.removeAllListeners();
            return this.client.connect(result.identity, result.psk);
          })
          .then((ans) => {
            if (!ans) {
              throw new TradfriError('Failed to connect (response was empty)', TradfriErrorCodes.ConnectionFailed);
            }
            this.client
              .on('error', (err) => {
                if (err instanceof TradfriError) {
                  switch (err.code) {
                    case TradfriErrorCodes.NetworkReset:
                    case TradfriErrorCodes.ConnectionTimedOut:
                      return this.debug(err.message, 'warn');
                    case TradfriErrorCodes.AuthenticationFailed:
                    case TradfriErrorCodes.ConnectionFailed:
                      this.debug(err.message, 'error');
                      throw err;
                  }
                } else {
                  this.debug(err.message, 'error');
                  if (!err.message.match(/unexpected response \([\d.]+\) to observeScene/)) {
                    throw err;
                  }
                }
              })
              .on('device updated', (updDevice) => {
                const { action, device } = Devices.update(updDevice);
                this.emit('device', action, device);
                return this.debug(`device updated: ${device.name} (type=${device.type} [${device.type}])`, 'debug');
              })
              .on('device removed', (id) => {
                Devices.delete(id);
                this.emit('device', id, 'REMOVE');
                return this.debug(`device removed: ${id}`, 'debug');
              })
              .on('group updated', (updGroup) => {
                const { action, group } = Group.update(updGroup);
                this.emit('group', action, group);
                return this.debug(`group updated: ${group.name}`, 'debug');
              })
              .on('group removed', (groupID) => {
                const group = Group.delete(groupID);
                return this.debug(`group removed: ${group != null ? group.name : void 0}`, 'debug');
              })
              .on('scene updated', (groupID, scene) => {
                const group = Group.byID(groupID);
                if (group != null) {
                  group.addScene(scene);
                  return this.debug(`scene updated: ${group.name}: ${scene.name}`, 'debug');
                } else {
                  return this.debug(`scene updated: Missing group ${groupID}`, 'warn');
                }
              })
              .on('scene removed', (groupID, sceneID) => {
                const group = Group.byID(groupID);
                if (group != null) {
                  group.delScene(sceneID);
                  return this.debug(`scene removed from group.name: ${group.name}`, 'debug');
                } else {
                  return this.debug(`scene removed: Missing group ${groupID}`, 'warn');
                }
              });
            return this.client.observeDevices();
          })
          .then(() => {
            // Need the devices in place so not Promise.all()
            this.debug('observeDevices resolved', 'debug');
            return this.client.observeGroupsAndScenes();
          })
          .then(() => {
            this.debug('observeGroupsAndScenes resolved: connect complete', 'debug');
            this.connectState = States.CONNECTED;
            return this.credentials;
          })
          .catch((err) => {
            if (err instanceof TradfriError) {
              switch (err.code) {
                case TradfriErrorCodes.NetworkReset:
                case TradfriErrorCodes.ConnectionTimedOut:
                  return this.debug(err.message, 'warn');
                case TradfriErrorCodes.AuthenticationFailed:
                case TradfriErrorCodes.ConnectionFailed:
                  this.debug(err.message, 'error');
              }
            }
            throw err;
          });
    }
  }

  triggerDeviceUpdate(device) {
    this.emit('device', device);
  }

  triggerGroupUpdate(group) {
    this.emit('groups', group);
  }

  reset() {
    this.client.reset();

    return this.connect();
  }

  close() {
    this.client.destroy();
    Group.close();
    Devices.close();
    return delete this.client;
  }

  device(name: string) {
    return Devices.get(name);
  }

  group(name: string) {
    return Group.get(name);
  }
}

export default Tradfri;
