import { TrackOperationTypes, TriggerOperationTypes } from './operations.js';

const targetMap = new WeakMap();
const ITERATE_KEY = Symbol('iterate');
let activeEffect = undefined;
const effectStack = [];

const triggerTypeMap = Object.freeze({
  [TriggerOperationTypes.SET]: [TrackOperationTypes.GET],
  [TriggerOperationTypes.ADD]: [
    TrackOperationTypes.GET,
    TrackOperationTypes.HAS,
    TrackOperationTypes.ITERATE,
  ],
  [TriggerOperationTypes.DELETE]: [
    TrackOperationTypes.GET,
    TrackOperationTypes.HAS,
    TrackOperationTypes.ITERATE,
  ],
});

export function effect(fn, options = {}) {
  const { lazy = false } = options;
  const effectFn = () => {
    try {
      activeEffect = effectFn;
      effectStack.push(effectFn);
      cleanup(effectFn);
      return fn();
    } finally {
      effectStack.pop();
      activeEffect = effectStack.length > 0
        ? effectStack[effectStack.length - 1]
        : null;
    }
  };
  effectFn.deps = [];
  effectFn.options = options;

  if (!lazy) effectFn(); else return effectFn;
}

export function cleanup(effectFn) {
  const { deps } = effectFn;
  if (!deps || !deps.length) return;
  for (const dep of deps) {
    dep.delete(effectFn);
  }
  deps.length = 0;
}

export function track(target, type, key) {
  if (!shouldTrack || !activeEffect) return;

  let propMap = targetMap.get(target);
  if (!propMap) {
    propMap = new Map();
    targetMap.set(target, propMap);
  }

  if (type === TrackOperationTypes.ITERATE) key = ITERATE_KEY;
  let typeMap = propMap.get(key);
  if (!typeMap) {
    typeMap = new Map();
    propMap.set(key, typeMap);
  }

  let depSet = typeMap.get(type);
  if (!depSet) {
    depSet = new Set();
    typeMap.set(type, depSet);
  }

  if (!depSet.has(activeEffect)) {
    depSet.add(activeEffect);
    activeEffect.deps.push(depSet);
  }
}

function getEffectFunctions(target, type, key) {
  const propMap = targetMap.get(target);
  if (!propMap) return;

  const keys = [key];
  if (type === TriggerOperationTypes.ADD || type === TriggerOperationTypes.DELETE) {
    keys.push(ITERATE_KEY);
  }

  const effectFunctions = new Set();

  for (const key of keys) {
    const typeMap = propMap.get(key);
    if (!typeMap) continue;
    const trackTypes = triggerTypeMap[type];
    for (const trackType of trackTypes) {
      const depSet = typeMap.get(trackType);
      if (!depSet) continue;
      for (const dep of depSet) {
        effectFunctions.add(dep);
      }
    }
  }

  return effectFunctions;
}

export function trigger(target, type, key) {
  const effectFunctions = getEffectFunctions(target, type, key);
  if (!effectFunctions) return;
  for (const fn of effectFunctions) {
    if (fn === activeEffect) continue;
    if (fn.options.scheduler) {
      fn.options.scheduler(fn);
    } else {
      fn();
    }
  }
}

let shouldTrack = true;

export function pauseTracking() {
  shouldTrack = false;
}

export function resumeTracking() {
  shouldTrack = true;
}
