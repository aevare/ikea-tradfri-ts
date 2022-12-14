# ikea-tradfri-ts (4.2.1)

A library to access the Ikea Trådfri lighting system without needing
to call a separate binary

This is a fork of [CliffS/ikea-tradfri](https://github.com/CliffS/ikea-tradfri) rewritten in TypeScript.

There is still work to be done so consider this work in progress.
The library is based on v4.2.1, I will rewrite this to the newest version soon.

## Example

```JavaScript
const Tradfri = require('ikea-tradfri');
const Identity = require('./Identity');
// Identity.json is private credentials

// First time you need to use the passcode on the gateway
// after that use the credentials that you get in return
const tradfri = new Tradfri('device.example.com', Identity);

tradfri.connect()
.then((credentials) =>
  // store the credentials if you havent already
  // find a group
  const group4 = tradfri.group('TRADFRI group 4');
  // switch it on
  group4.switch(true);
  // set it to 50%
  group4.setBrightness(50);

  // Find a bulb
  const bulb = tradfri.device('Standard Lamp');
  // Set the cool colour
  bulb.colour = 'white';
  // Set half brightness
  bulb.level  = 50;
  // Set up a global scene
  tradfri.scene = 'My Global Scene';
})
.catch((err) => {
  console.error(err);
});
```

## Table of Contents

- [Rationale](#rationale)
- [Installation](#installation)
- [Changes in Version 5](#changes-in-version-5)
- [Connecting to the Trådfri Controller](#connecting-to-the-tr%C3%A5dfri-controller)
  - [First time](#first-time)
  - [Subsequent connect calls](#subsequent-connect-calls)
- [Devices](#devices)
  - [Getting a Device](#getting-a-device)
  - [Device Properties](#device-properties)
  - [Bulb](#bulb)
  - [Plug](#plug)
  - [Blind](#blind)
  - [Remote and Sensor](#remote-and-sensor)
  - [Events](#events)
- [Groups](#groups)
  - [Getting a Group](#getting-a-group)
  - [Group Properties](#group-properties)
- [Scenes](#scenes)
- [Other Methods and Properties](#other-methods-and-properties)
- [Issues](#issues)
- [Licence](#licence)

## Rationale

This library is designed to abstract away the complexities of both
[CoAP] and the excellent underlying libraries, [node-tradfri-client]
and [node-coap-client], both by the amazing [AlCalzone].

Currently it assumes that your Trådfri controller is set up using another
tool, probably the Ikea app for Android or iPhone.

[coap]: http://coap.technology/
[node-tradfri-client]: https://github.com/AlCalzone/node-tradfri-client
[node-coap-client]: https://github.com/AlCalzone/node-coap-client
[alcalzone]: https://www.npmjs.com/~alcalzone
[issues]: https://github.com/CliffS/ikea-tradfri/issues
[glpl]: https://www.gnu.org/licenses/lgpl-3.0.en.html
[ikea]: http://www.ikea.com/
[debug]: https://www.npmjs.com/package/debug

## Installation

    npm install ikea-tradfri

## Changes in Version 5

With no warning, Ikea implemented major changes to groups and
scenes. Previously, each group had a set of scenes that could be
applied. This was changed so that all scenes became global and could
work across groups.

The effect of this is that setting scenes on groups no longer works.
Scenes need to be set on the `tradfri` object. Scenes can be created
with the mobile app and can be called from this library.

## Connecting to the Trådfri Controller

There are two ways to connect. The first time, you should use
the security code printed on the base of the controller. You should then
save the returned credentials and always use these credentials when
connecting in the future.

**NB:** If you continue to use the
security code, the controller will gradually forget about any
other connected apps and these will need to reauthenticate.

The host can be a domain name such as `device.example.com`
or a dotted IP address such as `192.168.1.20`.

`tradfri.connect()` returns a Promise. You should wait for
the promise to resolve before continuing. This can be done
with a `.then()` or by `await`ing the result. Either way you
should `catch` any error. On success, the promise will resolve
to the credentials object.

It is safe to call `tradfri.connect()` multiple times
on the same instance. The first call will perform the
actual connect; subsequent calls will resolve when the
connect is completed.

You should not create multiple `tradfri` instances for the same
controller.

### First time

The first time you connect, you should use the code from the bottom
of the controller:

```JavaScript
const Identity = 'mOPupErDolDw5gDf';
const tradfri = new Tradfri('device.example.com', Identity);
tradfri.connect()
.then((credentials) => {
  // Save the credentials
})
.catch (err) => {
  console.error(err);
  process.exit(1);
});
```

`credentials` will be an object containing two keys, `identity` and `psk`.
This object should be stored, perhaps as a JSON file, for future use.

### Subsequent connect calls

Subsequently the call could look like this:

```JavaScript
const Identity = require('./identity')  // stored in identity.json
const tradfri = new Tradfri('device.example.com', Identity);
try {
  await tradfri.connect();
}
catch(err){
  console.error(err);
  process.exit(1);
}
```

There are two more parameters to `new Tradfri`. This is so that you may
pass in a custom logger. Unless you pass in a function here, the [debug]
module will be used with the key `ikea-tradfri`. If you pass in a function
as the third parameter, it should itself
expect two parameters: a message and a level.
If the fourth parameter to `new tradfri` is `true`, the custom logging
function will also be passed down to the [node-tradfri-client] library.

All example code below assumes you have the `tradfri` variable described
above.

## Devices

There are currently seven types of device:

<dl>
<dt>Bulb</dt><dd>A lightbulb, panel etc.</dd>
<dt>Plug</dt><dd>A switchable wall plug</dd>
<dt>Blind</dt><dd>A roller blind</dd>
<dt>Remote</dt><dd>A remote control device</dd>
<dt>SlaveRemote</dt><dd>A remote control device, slaved to another</dd>
<dt>Sensor</dt><dd>A movement sensor</dd>
<dt>Repeater</dt><dd>A signal repeater</dd>
</dl>

For this library to work correctly, each device and group should be
distinctly named as the library works exclusively from those names.

The Trådfri controller only permits Bulbs, Plugs and Blinds
to be tracked. There seems
to be no way to know when a Remote has been activated, other than
by tracking a connected device.

### Getting a Device

Using the `tradfri` variable created
above, you call `tradfi.device(name)` where `name` is the name of the device
you are looking for. It will return the approriate class for `name` or
`undefined` if it is not found.

`name` can also be an array of device names. In this case,
`trafri.device(array)` will return an array of all the devices matched or an
empty array if none are found. Currently there is no provision
for wildcards.

### Device Properties

These are the properties that are common to all devices. All these properties
should be considered read-only. Changing them will currently not be fed
back to the controller.

- **id** _(integer)_

  This is the internal ID used by the controller.
  It is not usually necessary to use this ID in this library.

- **name** _(string)_

  This is the name of the device and is the usual way to access it in this
  library.

- **type** _(string)_

  This will be one of Blind, Bulb, Plug, Remote, Repeater or Sensor.

- **alive** _(boolean)_

  This indicates whether or not the Ikea controller believes this device to be
  powered on.

### Device Functions

- **toString()**

  This will return the device name so that the device can be used as a
  string.

### Bulb

These are the bulb-specific properties (read-only):

- **isOn** _(boolean)_

  Whether this bulb is on or off

- **switchable** _(boolean)_

  Whether this bulb can be switched on and off

- **dimmable** _(boolean)_

  Whether this bulb can be dimmed

- **brightness** _(integer percentage)_

  This can be from 0 to 100.

- **spectrum** _(white|rgb|none)_

  The light spectrum of the bulb: white, rgb or none

- **colour** _(string | percentage | value)_

  Reading the property for white bulbs
  will return "white", "warm" or "glow" if its
  value matches one of those settings (1, 62 or 97, respectively)
  or it will return the current numerical value.

  For RGB bulbs, it will return the RGB colour.

- **color** _(string | percentage)_

  An alternative spelling of colour, q.v..

- **hexcolour** _(hex number)_

  The colour of the bulb expressed as RGB.

- **hue**
- **saturation**

  The hue and saturation of the RGB bulbs.

The following are the methods to change settings on a bulb:

- **switch()** _(boolean)_

  This is the on-off switch. It should be sent `true` to turn
  the bulb on or `false` to turn it off. It will return a promise
  resolving to `true` if the setting was changed or `false` if it
  was not.

- **setBrightness()** _(integer percentage)_

  This can be set from 0 to 100. It will change
  the brightness of the Bulb: 100 is fully bright, 0 will turn the bulb off.
  This will return a promise resolving to `true` if the setting was changed or
  `false` if it was not.

- **setColour()** _(white | warm | glow | integer percentage | hex number )_

  For white spectrum bulbs, this can be set to:

  - "white"
  - "warm" (or "warm white")
  - "glow" (or "warm glow")

  Alternatively it can be set to a number from 1 to 100 where 1 is the coolest
  colour temperature and 100 is the warmest.
  This will return a promise resolving to `true` if the setting was changed or
  `false` if it was not.

- **setColor**

  An alternative spelling of setColour, q.v..

### Plug

These are the plug-specific properties (read-only):

- **isOn** _(boolean)_

  Whether this plug is on or off

- **switchable** _(boolean)_

  Whether this plug can be switched on and off

The following is the method to change settings on a plug:

- **switch()** _(boolean)_

  This is the on-off switch. It should be sent `true` to turn
  the plug on or `false` to turn it off. It will return a promise
  resolving to `true` if the setting was changed or `false` if it
  was not.

### Blind

These are the blind-specific properties (read-only):

- **position** _(integer)_

  This is the current position of the blind, where 100 is
  fully open (up) and 0 is fully closed (down).

  **isOpen** _(boolean)_

  This is true if the blind is fully open.

  **isClosed** _(boolean)_

  This is true if the blind is fully closed.

The following are the methods to change positions on a blind:

- **open** _(void)_

  This will fully open the blind.

- **close** _(void)_

  This will fully close the blind.

- **SetPosition** _(integer)_

  This will set the blind to any position between 0 and 100.

### Remote and Sensor

Currently these only have the common properties described
[above](#device-properties). It is not currently possible to detect
changes when a remote is pressed or a sensor triggered owing to
a lack of reporting by the Trådfri controller.

### Events

All device types are event emitters although Remotes and
Sensors do not seem to emit events when they are triggered.

Currently only two events are emitted:

- **deleted**

  This is emitted if the device has been deleted from the
  controller. It is passed a parameter of the Device's name.

```coffeescript
device.on "deleted", (name) ->
  console.log "device.#{name} has just been deleted"
```

- **changed**

  [**NOTE** The format for the changed event since v3.0.0 is
  different and incompatible with previous versions]

  This is emitted with two objects describing the change, whenever a
  device is changed. Each object will have a `name` key and one
  or more attribute keys:

  The first object is the new state of the device, the second object
  is the previous state. Only states that have changed will be in
  the object.

```coffeescript
bulb.on changed, (current, previous) ->
  console.log "bulb.#{current.name} has changed:"
  for key, val of current when key isnt 'name'
    console.log "  #{key} was #{previous[key]}, now #{current[key]}"
```

Note that blinds emit changes continually as they move. You can test
that a blind has stopped moving when the `current.position` is equal
to the requested position.

## Groups

### Getting a Group

Getting a group is similar to getting a device. Using the `tradfri`
variable, you call `tradfri.group(name)` where `name` is the name
of the group you are looking for. It will return `undefined` if
not found.

### Group Properties

The read-only properties for a group are:

- **id** _(integer)_

  This is the internal ID used by the controller.

- **name** _(string)_

  This is the name of the group and is the usual way to access
  it in this library.

- **isOn** _(boolean)_

  This returns whether the controller believes this group
  to be on or off. It is unreliable.

- **level** _(integer percentage)_

  Reading this will return the last group value applied.

The methods are as follows. Each of these methods returns
a promise that resolves to a boolean. If true, the change was
made, if false nothing was changed.

- **switch()** _(boolean)_

  Calling this with on (true) will turn on all the bulbs in the
  group. Setting it to off (false) will turn them off.

- **setLevel()** _(integer percentage)_

  Setting this will set all bulbs in the group to the required level.

```coffeescript
group = tradfri.group 'Hallway'
console.log "#{group.name} is currently at level #{group.level}"
group.level 50
console.log "#{group.name} is now at level #{group.level}"
```

## Scenes

The global scenes can now only be read and
set via the `tradfri` object.

### Scene Properties

- **scenes** _(array)_

  This will return an array of scene names known by the controller.

- **scene** _(string: read-write)_

  This will return the last scene set via this library. If written
  to, it will attempt to set the scene to the value passed. It will
  fail silently so it is probably better to use `setScene()`, see below.

```coffeescript
currentScene = tradfri.scene
tradfri.scene = 'Evening Lights'
```

### Scene Method

- **setScene()** _(string)_

  This will attempt to find the scene name passed and set that scene.
  It returns a promise resolving to the scene ID on success and rejects
  if it cannot find the scene by name.

  Currently this tries to use a transition time of 3 seconds but this
  appears not to work in the current version of the controller.

```coffeescript
tradfri.setScene 'Evening Lights'
.then (id) ->
  console.log "Scene ID is now #{id} and named #{tradfri.scene}"
```

## Other Methods and Properties

### reset()

```coffeescript
tradfri.reset()
```

This can be used to reset the connection.

### close()

```coffeescript
tradfri.close()
```

This should be called before ending the program so that the gateway
can clean up its resources and so that the program will close its
connections. Note that it may nevertheless take a few seconds for
the program to end as there may be timers still running.

### devices

```coffeescript
devices = tradfri.devices
```

This will return an array of all the devices that have been
detected.

## Acknowlegements

Many thanks to [AlCalzone] for his excellent libraries, without which
this library would have been infinitely harder to write.

I have no affiliation to [Ikea] and this library is not approved or
endorsed in any way by Ikea.

## Issues

Please report all issues via the [Github issues page][issues].

## Licence

This library is currently offered under version 3 of the
[GNU Lesser General Public Licence][glpl]. If you need a different
licence, please contact me.
