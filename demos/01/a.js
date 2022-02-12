let obj = {
  val: 1
};

const setVal = (newVal) => {
  obj.val = newVal
}

myModule.exports = {
  obj,
  setVal
}