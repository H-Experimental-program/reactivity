import { track, trigger } from './effect.js';
import { TrackOperationTypes, TriggerOperationTypes } from './operations.js';
import { isObject } from './utils.js';
import { reactive } from './reactive.js';

export function ref(value) {
  if (isObject(value)) return reactive(value);

  return {
    get value() {
      track(this, TrackOperationTypes.GET, 'value');
      return value;
    },
    set value(newValue) {
      value = newValue;
      trigger(this, TriggerOperationTypes.SET, 'value');
    },
  };
}
