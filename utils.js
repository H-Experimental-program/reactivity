export function isObject(value) {
  return typeof value === 'object' && value !== null;
}

export function hasChanged(pre, cur) {
  return !Object.is(pre, cur);
}

export function format(...args) {
  for (const arg of args) {
    if (typeof arg === 'object' && arg !== null) {
      console.log(arg);
    } else {
      console.log(JSON.stringify(arg, null, 2));
    }
  }
}
