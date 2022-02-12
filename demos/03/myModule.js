const path = require('path');
const vm = require('vm');
const fs = require('fs');

function MyModule(id = '') {
  this.id = id;             // 模块路径
  this.exports = {};        // 导出的东西放这里，初始化为空对象
  this.loaded = false;      // 用来标识当前模块是否已经加载
}

MyModule._cache = {};
MyModule._extensions = {};

MyModule.wrapper = [
  '(function (myExports, myRequire, myModule, __filename, __dirname) { ',
  '\n});'
];

MyModule.wrap = function (script) {
  return MyModule.wrapper[0] + script + MyModule.wrapper[1];
};

MyModule.prototype.require = function (id) {
  return MyModule._load(id);
}

MyModule._load = function (request) {    // request是传入的路径
  const filename = MyModule._resolveFilename(request);

  // 先检查缓存，如果缓存存在且已经加载，直接返回缓存
  const cachedModule = MyModule._cache[filename];
  if (cachedModule) {
    return cachedModule.exports;
  }

  // 如果缓存不存在，我们就加载这个模块
  // 加载前先new一个MyModule实例，然后调用实例方法load来加载
  // 加载完成直接返回module.exports
  const module = new MyModule(filename);

  // load之前就将这个模块缓存下来，这样如果有循环引用就会拿到这个缓存，但是这个缓存里面的exports可能还没有或者不完整
  MyModule._cache[filename] = module;

  // 如果 load 失败，需要将 _cache 中相应的缓存删掉。这里简单起见，不做这个处理
  module.load(filename);

  return module.exports;
}

MyModule._resolveFilename = function (request) {
  return path.resolve(request);
}

MyModule.prototype.load = function (filename) {
  // 获取文件后缀名
  const extname = path.extname(filename);

  // 调用后缀名对应的处理函数来处理，当前实现只支持 JS
  MyModule._extensions[extname](this, filename);

  this.loaded = true;
}


MyModule._extensions['.js'] = function (module, filename) {
  var content = fs.readFileSync(filename, 'utf8');
  module._compile(content, filename);
};

MyModule.prototype._compile = function (content, filename) {
  console.log('_compile ->', filename);
  var self = this;
  const wrapper = MyModule.wrap(content);    // 获取包装后函数体

  // vm是nodejs的虚拟机沙盒模块，runInThisContext方法可以接受一个字符串并将它转化为一个函数
  // 返回值就是转化后的函数，所以compiledWrapper是一个函数
  const compiledWrapper = vm.runInThisContext(wrapper, {
    filename
  });
  const dirname = path.dirname(filename);

  const args = [self.exports, self.require, self, filename, dirname];
  return compiledWrapper.apply(self.exports, args);
}

const myModuleInstance = new MyModule();
const MyRequire = (id) => {
  return myModuleInstance.require(id);
}

module.exports = {
  MyModule,
  MyRequire
}