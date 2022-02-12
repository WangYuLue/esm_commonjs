import { a, setA } from './a.mjs';

console.log('running b.mjs');

console.log('a val', a);

console.log('setA to aa');

setA('aa')

let b = 'b';

const setB = (newB) => {
  b = newB;
}

export {
  b,
  setB
}