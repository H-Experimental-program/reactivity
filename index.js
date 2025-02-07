import { format } from './utils.js';
import { reactive } from './reactive.js';
import { computed } from './computed.js';
import { effect } from './effect.js';

const state = reactive({ a: 1, b: 2 });

const sum = computed(() => {
  format('computed');
  return state.a + state.b;
});

effect(() => {
  format('render', sum.value);
});
