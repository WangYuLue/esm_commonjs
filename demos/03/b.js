const { a, setA } = myRequire('./a.js');

console.log('running b.js');

console.log('a val', a);

console.log('setA to aa');

setA('aa')

let b = 'b';

const setB = (newB) => {
  b = newB;
}

myModule.exports = {
  b,
  setB
}