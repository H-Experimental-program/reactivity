import { pauseTracking, resumeTracking, track, trigger } from './effect.js';
import { hasChanged, isObject } from './utils.js';
import { reactive } from './reactive.js';
import { TrackOperationTypes, TriggerOperationTypes } from './operations.js';

const arrayInstrumentation = new Map();
const RAW = Symbol('raw');

['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
  arrayInstrumentation.set(method, function(...args) {
    const ret = Array.prototype[method].apply(this, args);
    if (!ret || ret === -1)
      return Array.prototype[method].apply(this[RAW], args);
    return ret;
  });
});
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  arrayInstrumentation.set(method, function(...args) {
    pauseTracking();
    const ret = Array.prototype[method].apply(this, args);
    resumeTracking();
    return ret;
  });
});

function get(target, key, receiver) {
  if (key === RAW) return target;

  track(target, TrackOperationTypes.GET, key);

  // use custom array methods
  if (Array.isArray(target) && arrayInstrumentation.has(key))
    return arrayInstrumentation.get(key);

  const ret = Reflect.get(target, key, receiver);
  if (isObject(ret)) return reactive(ret);
  return ret;
}

function set(target, key, value, receiver) {
  const old = target[key];
  const operation = target.hasOwnProperty(key)
    ? TriggerOperationTypes.SET
    : TriggerOperationTypes.ADD;
  const oldLen = Array.isArray(target) ? target.length : undefined;

  // perform operations
  const ret = Reflect.set(target, key, value, receiver);
  if (!ret) {
    return ret;
  }

  if (hasChanged(old, value) || operation === TriggerOperationTypes.ADD) {
    // distribute updates
    trigger(target, operation, key);

    // handling implicit operations on array
    const newLen = Array.isArray(target) ? target.length : undefined;
    if (Array.isArray(target) && oldLen !== newLen) {
      if (key !== 'length') {
        trigger(target, TriggerOperationTypes.SET, 'length');
      } else {
        // automatically dispatch deletion when array length is shortened
        for (let i = newLen; i < oldLen; i++) {
          trigger(target, TriggerOperationTypes.DELETE, String(i));
        }
      }
    }
  }

  return ret;
}

function has(target, key) {
  track(target, TrackOperationTypes.HAS, key);
  return Reflect.has(target, key);
}

function ownKeys(target) {
  track(target, TrackOperationTypes.ITERATE);
  return Reflect.ownKeys(target);
}

function deleteProperty(target, key) {
  const isOwn = target.hasOwnProperty(key);
  const ret = Reflect.deleteProperty(target, key);
  if (isOwn && ret) {
    trigger(target, TriggerOperationTypes.DELETE, key);
  }
  return ret;
}

export const handlers = {
  get,
  set,
  has,
  ownKeys,
  deleteProperty,
};
