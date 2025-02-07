import { format } from './utils.js';
import { effect, track, trigger } from './effect.js';
import { TrackOperationTypes, TriggerOperationTypes } from './operations.js';

function normalizeParameter(getterOrOptions) {
  let getter, setter;

  if (typeof getterOrOptions === 'function') {
    getter = getterOrOptions;
    setter = () => format('🔒');
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return { getter, setter };
}

export function computed(getterOrOptions) {
  const { getter, setter } = normalizeParameter(getterOrOptions);

  let value, dirty = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      dirty = true;
      trigger(__proxy__, TriggerOperationTypes.SET, 'value');
    },
  });

  const __proxy__ = {
    get value() {
      track(this, TrackOperationTypes.GET, 'value');
      if (dirty) {
        value = effectFn();
        dirty = false;
      }
      return value;
    },
    set value(newValue) {
      setter(newValue);
    },
  };

  return __proxy__;
}
