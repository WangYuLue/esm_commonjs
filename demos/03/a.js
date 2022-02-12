const { b, setB } = myRequire('./b.js');

console.log('running a.js');

console.log('b val', b);

console.log('setB to bb');

setB('bb')

let a = 'a';

const setA = (newA) => {
  a = newA;
}

myModule.exports = {
  a,
  setA
}