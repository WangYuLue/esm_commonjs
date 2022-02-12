const { b, setB } = require('./b.js');

console.log('running a.js');

console.log('b val', b);

console.log('setB to bb');

setB('bb')

let a = 'a';

const setA = (newA) => {
  a = newA;
}

module.exports = {
  a,
  setA
}