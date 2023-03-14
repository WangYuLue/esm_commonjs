# 深入浅出 ESM 模块 和 CommonJS 模块

阮一峰在 [ES6 入门](https://es6.ruanyifeng.com/#docs/module-loader#ES6-%E6%A8%A1%E5%9D%97%E4%B8%8E-CommonJS-%E6%A8%A1%E5%9D%97%E7%9A%84%E5%B7%AE%E5%BC%82) 中提到 ES6 模块与 CommonJS 模块有一些重大的差异：

- CommonJS 模块输出的是一个值的拷贝，ES6 模块输出的是值的引用。
- CommonJS 模块是运行时加载，ES6 模块是编译时输出接口。

再细读上面阮老师提到的差异，会产生诸多疑问：

- 为什么 CommonJS 模块输出的是一个值的拷贝？其具体细节是什么样子的？
- 什么叫 `运行时加载`?
- 什么叫 `编译时输出接口`？
- 为什么 ES6 模块输出的是值的引用？

于是就有了这篇文章，力求把 **ESM 模块** 和 **CommonJS 模块** 讨论清楚。

### CommonJS 产生的历史背景

CommonJS 由 Mozilla 工程师 Kevin Dangoor 于 2009 年 1 月创立，最初命名为 ServerJS。2009 年 8 月，该项目更名为 CommonJS。旨在解决 Javascript 中缺少模块化标准的问题。

Node.js 后来也采用了 CommonJS 的模块规范。

由于 CommonJS 并不是 ECMAScript 标准的一部分，所以 **类似 `module` 和 `require` 并不是 JS 的关键字，仅仅是对象或者函数而已**，意识到这一点很重要。

我们可以在打印 `module`、`require` 查看细节：

```js
console.log(module);
console.log(require);

// out:
Module {
  id: '.',
  path: '/Users/xxx/Desktop/esm_commonjs/commonJS',
  exports: {},
  filename: '/Users/xxx/Desktop/esm_commonjs/commonJS/c.js',
  loaded: false,
  children: [],
  paths: [
    '/Users/xxx/Desktop/esm_commonjs/commonJS/node_modules',
    '/Users/xxx/Desktop/esm_commonjs/node_modules',
    '/Users/xxx/Desktop/node_modules',
    '/Users/xxx/node_modules',
    '/Users/node_modules',
    '/node_modules'
  ]
}

[Function: require] {
  resolve: [Function: resolve] { paths: [Function: paths] },
  main: Module {
    id: '.',
    path: '/Users/xxx/Desktop/esm_commonjs/commonJS',
    exports: {},
    filename: '/Users/xxx/Desktop/esm_commonjs/commonJS/c.js',
    loaded: false,
    children: [],
    paths: [
      '/Users/xxx/Desktop/esm_commonjs/commonJS/node_modules',
      '/Users/xxx/Desktop/esm_commonjs/node_modules',
      '/Users/xxx/Desktop/node_modules',
      '/Users/xxx/node_modules',
      '/Users/node_modules',
      '/node_modules'
    ]
  },
  extensions: [Object: null prototype] {
    '.js': [Function (anonymous)],
    '.json': [Function (anonymous)],
    '.node': [Function (anonymous)]
  },
  cache: [Object: null prototype] {
    '/Users/xxx/Desktop/esm_commonjs/commonJS/c.js': Module {
      id: '.',
      path: '/Users/xxx/Desktop/esm_commonjs/commonJS',
      exports: {},
      filename: '/Users/xxx/Desktop/esm_commonjs/commonJS/c.js',
      loaded: false,
      children: [],
      paths: [Array]
    }
  }
}
```

可以看到 `module` 是一个对象， `require` 是一个函数，仅此而已。

我们来重点介绍下 `module` 中的一些属性：

- `exports`：这就是 `module.exports` 对应的值，由于还没有赋任何值给它，它目前是一个空对象。
- `loaded`：表示当前的模块是否加载完成。
- `paths`：node 模块的加载路径，这块不展开讲，感兴趣可以看[node 文档](https://nodejs.org/api/modules.html#loading-from-node_modules-folders)

`require` 函数中也有一些值得注意的属性：

- `main` 指向当前当前引用自己的模块，所以类似 python 的 `__name__ == '__main__'`, node 也可以用 `require.main === module` 来确定是否是以当前模块来启动程序的。
- `extensions` 表示目前 node 支持的几种加载模块的方式。
- `cache` 表示 node 中模块加载的缓存，也就是说，当一个模块加载一次后，之后 `require` 不会再加载一次，而是从缓存中读取。

前面提到，CommonJS 中 `module` 是一个对象， `require` 是一个函数。而与此相对应的 **ESM 中的 `import` 和 `export` 则是关键字，是 ECMAScript 标准的一部分**。理解这两者的区别非常关键。

### 先看几个 CommonJS 例子

大家看看下面几个 CommonJS 例子，看看能不能准确预测结果：

例一，在模块外为简单类型赋值：

```js
// a.js
let val = 1;

const setVal = (newVal) => {
  val = newVal;
};

module.exports = {
  val,
  setVal,
};

// b.js
const { val, setVal } = require("./a.js");

console.log(val);

setVal(101);

console.log(val);
```

运行 `b.js`，输出结果为：

```log
1
1
```

例二，在模块外为引用类型赋值：

```js
// a.js
let obj = {
  val: 1,
};

const setVal = (newVal) => {
  obj.val = newVal;
};

module.exports = {
  obj,
  setVal,
};

// b.js
const { obj, setVal } = require("./a.js");

console.log(obj);

setVal(101);

console.log(obj);
```

运行 `b.js`，输出结果为：

```log
{ val: 1 }
{ val: 101 }
```

例三，在模块内导出后改变简单类型：

```js
// a.js
let val = 1;

setTimeout(() => {
  val = 101;
}, 100);

module.exports = {
  val,
};

// b.js
const { val } = require("./a.js");

console.log(val);

setTimeout(() => {
  console.log(val);
}, 200);
```

运行 `b.js`，输出结果为：

```log
1
1
```

例四，在模块内导出后用 `module.exports` 再导出一次：

```js
// a.js
setTimeout(() => {
  module.exports = {
    val: 101,
  };
}, 100);

module.exports = {
  val: 1,
};

// b.js
const a = require("./a.js");

console.log(a);

setTimeout(() => {
  console.log(a);
}, 200);
```

运行 `b.js`，输出结果为：

```log
{ val: 1 }
{ val: 1 }
```

例五，在模块内导出后用 `exports` 再导出一次：

```js
// a.js
setTimeout(() => {
  module.exports.val = 101;
}, 100);

module.exports.val = 1;

// b.js
const a = require("./a.js");

console.log(a);

setTimeout(() => {
  console.log(a);
}, 200);
```

运行 `b.js`,输出结果为：

```log
{ val: 1 }
{ val: 101 }
```

### 如何解释上面的例子？没有魔法！一言道破 CommonJS 值拷贝的细节

拿出 JS 最朴素的思维，来分析上面例子的种种现象。

例一中，代码可以简化为：

```js
const myModule = {
  exports: {},
};

let val = 1;

const setVal = (newVal) => {
  val = newVal;
};

myModule.exports = {
  val,
  setVal,
};

const { val: useVal, setVal: useSetVal } = myModule.exports;

console.log(useVal);

useSetVal(101);

console.log(useVal);
```

例二中，代码可以简化为：

```js
const myModule = {
  exports: {},
};

let obj = {
  val: 1,
};

const setVal = (newVal) => {
  obj.val = newVal;
};

myModule.exports = {
  obj,
  setVal,
};

const { obj: useObj, setVal: useSetVal } = myModule.exports;

console.log(useObj);

useSetVal(101);

console.log(useObj);
```

例三中，代码可以简化为：

```js
const myModule = {
  exports: {},
};

let val = 1;

setTimeout(() => {
  val = 101;
}, 100);

myModule.exports = {
  val,
};

const { val: useVal } = myModule.exports;

console.log(useVal);

setTimeout(() => {
  console.log(useVal);
}, 200);
```

例四中，代码可以简化为：

```js
const myModule = {
  exports: {},
};

setTimeout(() => {
  myModule.exports = {
    val: 101,
  };
}, 100);

myModule.exports = {
  val: 1,
};

const useA = myModule.exports;

console.log(useA);

setTimeout(() => {
  console.log(useA);
}, 200);
```

例五中，代码可以简化为：

```js
const myModule = {
  exports: {},
};

setTimeout(() => {
  myModule.exports.val = 101;
}, 100);

myModule.exports.val = 1;

const useA = myModule.exports;

console.log(useA);

setTimeout(() => {
  console.log(useA);
}, 200);
```

尝试运行上面的代码，可以发现和 CommonJS 输出的效果一致。所以 CommonJS 不是什么魔法，仅仅是日常写的最简简单单的 JS 代码。

其值拷贝发生在给 `module.exports` 赋值的那一刻，例如：

```js
let val = 1;
module.exports = {
  val,
};
```

做的事情仅仅是给 `module.exports` 赋予了一个新的对象，在这个对象里有一个 key 叫做 `val`，这个 `val` 的值是当前模块中 `val` 的值，仅此而已。

### CommonJS 的具体实现

为了更透彻的了解 CommonJS，我们来写一个简单的模块加载器，主要参考了 nodejs 源码；

在 node v16.x 中 module 主要实现在 `lib/internal/modules/cjs/loader.js` [文件](https://github.com/nodejs/node/blob/v16.x/lib/internal/modules/cjs/loader.js)下。

在 node v4.x 中 module 主要实现在 `lib/module.js` [文件](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js)下。

下面的实现主要参考了 node v4.x 中的实现，因为老版本相对更“干净”一些，更容易抓住细节。

另外 [深入 Node.js 的模块加载机制，手写 require 函数](https://segmentfault.com/a/1190000023828613) 这篇文章写的也很不错，下面的实现很多也参考了这篇文章。

为了跟官方 Module 名字区分开，我们自己的类命名为 MyModule：

```js
function MyModule(id = "") {
  this.id = id; // 模块路径
  this.exports = {}; // 导出的东西放这里，初始化为空对象
  this.loaded = false; // 用来标识当前模块是否已经加载
}
```

#### require 方法

我们一直用的 `require` 其实是 Module 类的一个实例方法，内容很简单，先做一些参数检查，然后调用 Module.\_load 方法，源码在[这里](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js#L362)，本示例为了简洁，去掉了一些判断：

```js
MyModule.prototype.require = function (id) {
  return MyModule._load(id);
};
```

`require` 是一个很简单函数，主要是包装了 `_load` 函数，这个函数主要做了如下事情：

- 先检查请求的模块在缓存中是否已经存在了，如果存在了直接返回缓存模块的 `exports`
- 如果不在缓存中，则创建一个 `Module` 实例，将该实例放到缓存中，用这个实例加载对应的模块，并返回模块的 `exports`

```js
MyModule._load = function (request) {
  // request是传入的路径
  const filename = MyModule._resolveFilename(request);

  // 先检查缓存，如果缓存存在且已经加载，直接返回缓存
  const cachedModule = MyModule._cache[filename];
  if (cachedModule) {
    return cachedModule.exports;
  }

  // 如果缓存不存在，我们就加载这个模块
  const module = new MyModule(filename);

  // load之前就将这个模块缓存下来，这样如果有循环引用就会拿到这个缓存，但是这个缓存里面的exports可能还没有或者不完整
  MyModule._cache[filename] = module;

  // 如果 load 失败，需要将 _cache 中相应的缓存删掉。这里简单起见，不做这个处理
  module.load(filename);

  return module.exports;
};
```

可以看到上述源码还调用了两个方法：`MyModule._resolveFilename` 和 `MyModule.prototype.load`，下面我们来实现下这两个方法。

#### MyModule.\_resolveFilename

这个函数的作用是通过用户传入的 require 参数来解析到真正的文件地址，[源码](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js#L321)中这个方法比较复杂，因为他要支持多种参数：内置模块，相对路径，绝对路径，文件夹和第三方模块等等。

本示例为了简洁，只实现相对文件的导入：

```js
MyModule._resolveFilename = function (request) {
  return path.resolve(request);
};
```

#### MyModule.prototype.load

`MyModule.prototype.load` 是一个实例方法，源代码在[这里](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js#L345)，这个方法就是真正用来加载模块的方法，这其实也是不同类型文件加载的一个入口，不同类型的文件会对应 `MyModule._extensions` 里面的一个方法：

```js
MyModule.prototype.load = function (filename) {
  // 获取文件后缀名
  const extname = path.extname(filename);

  // 调用后缀名对应的处理函数来处理，当前实现只支持 JS
  MyModule._extensions[extname](this, filename);

  this.loaded = true;
};
```

#### 加载文件: MyModule.\_extensions['X']

前面提到不同文件类型的处理方法都挂载在 `MyModule._extensions` 上，事实上 `node` 的加载器不仅仅可以加载 `.js` 模块，也可以加载 `.json` 和 `.node` 模块。本示例简单起见仅实现 `.js` 类型文件的加载：

```js
MyModule._extensions[".js"] = function (module, filename) {
  const content = fs.readFileSync(filename, "utf8");
  module._compile(content, filename);
};
```

可以看到 js 的加载方法很简单，只是把文件内容读出来，然后调了另外一个实例方法 `_compile` 来执行他。对应的源码在[这里](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js#L450)。

#### \_compile 实现

`MyModule.prototype._compile` 是加载 JS 文件的核心所在，这个方法需要将目标文件拿出来执行一遍。对应的源码在[这里](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js#L378)。

`_compile` 主要做了如下事情：

1、执行之前需要将它整个代码包裹一层，以便注入 `exports`, `require`, `module`, `__dirname`, `__filename`，这也是我们能在 JS 文件里面直接使用这几个变量的原因。要实现这种注入也不难，假如我们 require 的文件是一个简单的 `Hello World`，长这样：

```js
module.exports = "hello world";
```

那我们怎么来给他注入 `module` 这个变量呢？答案是执行的时候在他外面再加一层函数，使他变成这样：

```js
function (module) { // 注入module变量，其实几个变量同理
  module.exports = "hello world";
}
```

nodeJS 也是这样实现的，在[node 源码](https://github.com/nodejs/node/blob/v4.0.0/src/node.js#L932)里，会有这样的代码：

```js
NativeModule.wrap = function (script) {
  return NativeModule.wrapper[0] + script + NativeModule.wrapper[1];
};

NativeModule.wrapper = [
  "(function (exports, require, module, __filename, __dirname) { ",
  "\n});",
];
```

这样通过 MyModule.wrap 包装的代码就可以获取到 `exports`, `require`, `module`, `__filename`, `__dirname` 这几个变量了。

> 注意这里的字符串模版用了两个括号包起来，是因为该模版最终会放入 vm.runInThisContext 执行生成函数，用括号包起来后才会返回该函数。

2、放入沙盒里执行包装好的代码，并返回模块的 export。沙盒执行使用了 node 的 `vm` 模块。

在本实现中，`_compile` 实现如下：

```js
MyModule.prototype._compile = function (content, filename) {
  var self = this;
  // 获取包装后函数体
  const wrapper = MyModule.wrap(content);

  // vm是nodejs的虚拟机沙盒模块，runInThisContext方法可以接受一个字符串并将它转化为一个函数
  // 返回值就是转化后的函数，所以compiledWrapper是一个函数
  const compiledWrapper = vm.runInThisContext(wrapper, {
    filename,
  });

  const dirname = path.dirname(filename);
  const args = [self.exports, self.require, self, filename, dirname];
  return compiledWrapper.apply(self.exports, args);
};
```

`wrapper` 和 `warp` 的实现如下：

```js
MyModule.wrapper = [
  "(function (myExports, myRequire, myModule, __filename, __dirname) { ",
  "\n});",
];

MyModule.wrap = function (script) {
  return MyModule.wrapper[0] + script + MyModule.wrapper[1];
};
```

> 注意上面的 `wrapper` 中我们使用了 `myRequire` 和 `myModule` 来区分原生的 `require` 和 `module`, 下面的例子中我们会使用自己实现的函数来加载文件。

#### 最后生成一个实例并导出

最后我们 new 一个 `MyModule` 的实例并导出，方便外面使用：

```js
const myModuleInstance = new MyModule();
const MyRequire = (id) => {
  return myModuleInstance.require(id);
};

module.exports = {
  MyModule,
  MyRequire,
};
```

#### 完整代码

最后的完整代码如下：

```js
const path = require("path");
const vm = require("vm");
const fs = require("fs");

function MyModule(id = "") {
  this.id = id; // 模块路径
  this.exports = {}; // 导出的东西放这里，初始化为空对象
  this.loaded = false; // 用来标识当前模块是否已经加载
}

MyModule._cache = {};
MyModule._extensions = {};

MyModule.wrapper = [
  "(function (myExports, myRequire, myModule, __filename, __dirname) { ",
  "\n});",
];

MyModule.wrap = function (script) {
  return MyModule.wrapper[0] + script + MyModule.wrapper[1];
};

MyModule.prototype.require = function (id) {
  return MyModule._load(id);
};

MyModule._load = function (request) {
  // request是传入的路径
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
};

MyModule._resolveFilename = function (request) {
  return path.resolve(request);
};

MyModule.prototype.load = function (filename) {
  // 获取文件后缀名
  const extname = path.extname(filename);

  // 调用后缀名对应的处理函数来处理，当前实现只支持 JS
  MyModule._extensions[extname](this, filename);

  this.loaded = true;
};

MyModule._extensions[".js"] = function (module, filename) {
  var content = fs.readFileSync(filename, "utf8");
  module._compile(content, filename);
};

MyModule.prototype._compile = function (content, filename) {
  var self = this;
  // 获取包装后函数体
  const wrapper = MyModule.wrap(content);

  // vm是nodejs的虚拟机沙盒模块，runInThisContext方法可以接受一个字符串并将它转化为一个函数
  // 返回值就是转化后的函数，所以compiledWrapper是一个函数
  const compiledWrapper = vm.runInThisContext(wrapper, {
    filename,
  });
  const dirname = path.dirname(filename);

  const args = [self.exports, self.require, self, filename, dirname];
  return compiledWrapper.apply(self.exports, args);
};

const myModuleInstance = new MyModule();
const MyRequire = (id) => {
  return myModuleInstance.require(id);
};

module.exports = {
  MyModule,
  MyRequire,
};
```

#### 题外话：源代码中的 require 是如何实现的?

细心的读者会发现： nodejs v4.x 源码中实现 `require` 的[文件](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js#L3) `lib/module.js` 中，也使用到了 `require` 函数。

这似乎产生是先有鸡还是先有蛋的悖论，我还没把你造出来，你怎么就用起来了？

事实上，源码中的 `require` 有另外简单的实现，它被定义在 `src/node.js` 中，源码在[这里](https://github.com/nodejs/node/blob/v4.0.0/src/node.js#L861-L949)。

### 用自定义的 MyModule 来加载文件

刚刚我们实现了一个简单的 Module，但是能不能正常用还存疑。是骡子是马拉出来遛遛，我们用自己的 `MyModule` 来加载文件，看看能不能正常运行。

可以查看 [`demos/01`](https://github.com/WangYuLue/esm_commonjs/tree/main/demos/01)，代码的入口为 `app.js`:

```js
const { MyRequire } = require("./myModule.js");

MyRequire("./b.js");
```

`b.js` 的代码如下：

```js
const { obj, setVal } = myRequire("./a.js");

console.log(obj);

setVal(101);

console.log(obj);
```

可以看到现在我们用 `myRequire` 取代 `require` 来加载 `./a.js` 模块。

再看看 `./a.js` 的代码：

```js
let obj = {
  val: 1,
};

const setVal = (newVal) => {
  obj.val = newVal;
};

myModule.exports = {
  obj,
  setVal,
};
```

可以看到现在我们用 `myModule` 取代 `module` 来导出模块。

最后执行 `node app.js` 查看运行结果：

```log
{ val: 1 }
{ val: 101 }
```

可以看到最终效果和使用原生的 module 模块一致。

### 用自定义的 MyModule 来测试循环引用

在这之前，我们先看看原生的 module 模块的循环引用会发生什么异常。可以查看 [`demos/02`](https://github.com/WangYuLue/esm_commonjs/tree/main/demos/02)，代码的入口为 `app.js`：

```js
require("./a.js");
```

看看 `./a.js` 的代码：

```js
const { b, setB } = require("./b.js");

console.log("running a.js");

console.log("b val", b);

console.log("setB to bb");

setB("bb");

let a = "a";

const setA = (newA) => {
  a = newA;
};

module.exports = {
  a,
  setA,
};
```

再看看 `./b.js` 的代码：

```js
const { a, setA } = require("./a.js");

console.log("running b.js");

console.log("a val", a);

console.log("setA to aa");

setA("aa");

let b = "b";

const setB = (newB) => {
  b = newB;
};

module.exports = {
  b,
  setB,
};
```

可以看到 `./a.js` 和 `./b.js` 在文件的开头都相互引用了对方。

执行 `node app.js` 查看运行结果：

```log
running b.js
a val undefined
setA to aa
/Users/xxx/Desktop/esm_commonjs/demos/02/b.js:9
setA('aa')
^

TypeError: setA is not a function
    at Object.<anonymous> (/Users/xxx/Desktop/esm_commonjs/demos/02/b.js:9:1)
    at xxx
```

我们会发现一个 TypeError 的异常报错，提示 `setA is not a function`。这样的异常在预期之内，我们再试试自己实现的 `myModule` 的异常是否和原生 `module` 的行为一致。

我们查看 [`demos/03`](https://github.com/WangYuLue/esm_commonjs/tree/main/demos/03)，这里我们用自己的 `myModule` 来复现上面的循环引用，代码的入口为 `app.js`：

```js
const { MyRequire } = require("./myModule.js");

MyRequire("./a.js");
```

`a.js` 的代码如下：

```js
const { b, setB } = myRequire("./b.js");

console.log("running a.js");

console.log("b val", b);

console.log("setB to bb");

setB("bb");

let a = "a";

const setA = (newA) => {
  a = newA;
};

myModule.exports = {
  a,
  setA,
};
```

再看看 `./b.js` 的代码：

```js
const { a, setA } = myRequire("./a.js");

console.log("running b.js");

console.log("a val", a);

console.log("setA to aa");

setA("aa");

let b = "b";

const setB = (newB) => {
  b = newB;
};

myModule.exports = {
  b,
  setB,
};
```

可以看到现在我们用 `myRequire` 取代了 `require`，用 `myModule` 取代了 `module`。

最后执行 `node app.js` 查看运行结果：

```log
running b.js
a val undefined
setA to aa
/Users/xxx/Desktop/esm_commonjs/demos/03/b.js:9
setA('aa')
^

TypeError: setA is not a function
    at Object.<anonymous> (/Users/xxx/Desktop/esm_commonjs/demos/03/b.js:9:1)
    at xxx
```

可以看到，`myModule` 的行为和原生 `Module` 处理循环引用的异常是一致的。

#### 疑问：为什么 CommonJS 相互引用没有产生类似“死锁”的问题？

我们可以发现 CommonJS 模块相互引用时，没有产生类似死锁的问题。关键在 `Module._load` 函数里，具体源代码在[这里](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js#L298-L316)。`Module._load` 函数主要做了下面这些事情：

1. 检查缓存，如果缓存存在且已经加载，直接返回缓存，不做下面的处理
1. 如果缓存不存在，新建一个 Module 实例
1. 将这个 Module 实例放到缓存中
1. 通过这个 Module 实例来加载文件
1. 返回这个 Module 实例的 exports

其中的关键在 **放到缓存中** 与 **加载文件** 的顺序，在我们的 `MyModule` 中，也就是这两行代码：

```js
MyModule._cache[filename] = module;
module.load(filename);
```

回到上面循环加载的例子中，解释一下到底发生了什么：

当 `app.js` 加载 `a.js` 时，Module 会检查缓存中有没有 `a.js`，发现没有，于是 new 一个 `a.js` 模块，并将这个模块放到缓存中，再去加载 `a.js` 文件本身。

在加载 `a.js` 文件时，Module 发现第一行是加载 `b.js`，它会检查缓存中有没有 `b.js`，发现没有，于是 new 一个 `b.js` 模块，并将这个模块放到缓存中，再去加载 `b.js` 文件本身。

在加载 `b.js` 文件时，Module 发现第一行是加载 `a.js`，它会检查缓存中有没有 `a.js`，发现存在，于是 `require` 函数返回了缓存中的 `a.js`。

但是其实这个时候 `a.js` 根本还没有执行完，还没走到 `module.exports` 那一步，所以 `b.js` 中 `require('./a.js')` 返回的只是一个默认的空对象。所以最终会报 `setA is not a function` 的异常。

说到这里，那如何设计会导致“死锁”呢？其实也很简单 —— 将 **放到缓存中** 与 **加载文件** 的执行顺序互换，在我们的 `MyModule` 代码中，也就是这样写：

```js
module.load(filename);
MyModule._cache[filename] = module;
```

这样互换一下，再执行 demo03，我们发现异常如下：

```log
RangeError: Maximum call stack size exceeded
    at console.value (node:internal/console/constructor:290:13)
    at console.log (node:internal/console/constructor:360:26)
```

我们发现这样写会死锁，最终导致 JS 报栈溢出异常。

### JavaScript 的执行过程

接下来我们要讲解 ESM 的模块导入，为了方便理解 ESM 的模块导入，这里需要补充一个知识点 —— **JavaScript 的执行过程**。

JavaScript 执行过程分为两个阶段:

- 编译阶段
- 执行阶段

#### 编译阶段

在编译阶段 JS 引擎主要做了三件事：

- 词法分析
- 语法分析
- 字节码生成

这里不详情讲这三件事的具体细节，感兴趣的读者可以阅读 [the-super-tiny-compiler](https://github.com/jamiebuilds/the-super-tiny-compiler/blob/master/the-super-tiny-compiler.js) 这个仓库，它通过几百行的代码实现了一个微形编译器，并详细讲了这三个过程的具体细节。

#### 执行阶段

在执行阶段，会分情况创建各种类型的执行上下文，例如：**全局执行上下文** (只有一个)、**函数执行上下文**。而执行上下文的创建分为两个阶段：

- 创建阶段
- 执行阶段

在创建阶段会做如下事情：

- 绑定 this
- 为函数和变量分配内存空间
- 初始化相关变量为 undefined

我们日常提到的 变量提升 和 函数提升 就是在 **创建阶段** 做的，所以下面的写法并不会报错：

```js
console.log(msg);
add(1, 2);

var msg = "hello";
function add(a, b) {
  return a + b;
}
```

因为在执行之前的创建阶段，已经分配好了 `msg` 和 `add` 的内存空间。

### JavaScript 的常见报错类型

为了更容易理解 ESM 的模块导入，这里再补充一个知识点 —— **JavaScript 的常见报错类型**。

#### 1、RangeError

这类错误很常见，例如栈溢出就是 `RangeError`；

```js
function a() {
  b();
}
function b() {
  a();
}
a();

// out:
// RangeError: Maximum call stack size exceeded
```

#### 2、ReferenceError

`ReferenceError` 也很常见，打印一个不存在的值就是 `ReferenceError`：

```js
hello;

// out:
// ReferenceError: hello is not defined
```

#### 3、SyntaxError

`SyntaxError` 也很常见，当语法不符合 JS 规范时，就会报这种错误：

```js
console.log(1));

// out:
// console.log(1));
//               ^
// SyntaxError: Unexpected token ')'
```

#### 4、TypeError

`TypeError` 也很常见，当一个基础类型当作函数来用时，就会报这个错误：

```js
var a = 1;
a();

// out:
// TypeError: a is not a function
```

上面的各种 Error 类型中，`SyntaxError` 最为特殊，因为它是 **编译阶段** 抛出来的错误，如果发生语法错误，JS 代码一行都不会执行。而其他类型的异常都是 **执行阶段** 的错误，就算报错，也会执行异常之前的脚本。

### 什么叫 `编译时输出接口`? 什么叫 `运行时加载`?

ESM 之所以被称为 `编译时输出接口`，是因为它的模块解析是发生在 **编译阶段**。

也就是说，`import` 和 `export` 这些关键字是在编译阶段就做了模块解析，这些关键字的使用如果不符合语法规范，在编译阶段就会抛出语法错误。

例如，根据 ES6 规范，`import` 只能在模块顶层声明，所以下面的写法会直接报语法错误，不会有 log 打印，因为它压根就没有进入 **执行阶段**：

```js
console.log("hello world");

if (true) {
  import { resolve } from "path";
}

// out:
//   import { resolve } from 'path';
//          ^
// SyntaxError: Unexpected token '{'
```

与此对应的 CommonJS，它的模块解析发生在 **执行阶段**，因为 `require` 和 `module` 本质上就是个函数或者对象，只有在 **执行阶段** 运行时，这些函数或者对象才会被实例化。因此被称为 `运行时加载`。

这里要特别强调，**与 CommonJS 不同，ESM 中 `import` 的不是对象， `export` 的也不是对象**。例如，下面的写法会提示语法错误：

```js
// 语法错误！这不是解构！！！
import { a: myA } from './a.mjs'

// 语法错误！
export {
  a: "a"
}
```

`import` 和 `export` 的用法很像导入一个对象或者导出一个对象，但这和对象完全没有关系。他们的用法是 ECMAScript 语言层面的设计的，并且“恰巧”的对象的使用类似。

所以在编译阶段，`import` 模块中引入的值就指向了 `export` 中导出的值。如果读者了解 linux，这就有点像 linux 中的硬链接，指向同一个 inode。或者拿栈和堆来比喻，这就像两个指针指向了同一个栈。

### ESM 的加载细节

在讲解 ESM 的加载细节之前，我们要了解 ESM 中也存在 **变量提升** 和 **函数提升** ，意识到这一点非常重要。

拿前面 [`demos/02`](https://github.com/WangYuLue/esm_commonjs/tree/main/demos/02) 中提到的循环引用举例子，将其改造为 ESM 版的循环引用，查看 [`demos/04`](https://github.com/WangYuLue/esm_commonjs/tree/main/demos/04)，代码的入口为 `app.js`：

```js
import "./a.mjs";
```

看看 `./a.mjs` 的代码：

```js
import { b, setB } from "./b.mjs";

console.log("running a.mjs");

console.log("b val", b);

console.log("setB to bb");

setB("bb");

let a = "a";

const setA = (newA) => {
  a = newA;
};

export { a, setA };
```

再看看 `./b.mjs` 的代码：

```js
import { a, setA } from "./a.mjs";

console.log("running b.mjs");

console.log("a val", a);

console.log("setA to aa");

setA("aa");

let b = "b";

const setB = (newB) => {
  b = newB;
};

export { b, setB };
```

可以看到 `./a.mjs` 和 `./b.mjs` 在文件的开头都相互引用了对方。

执行 `node app.mjs` 查看运行结果：

```log
running b.mjs
file:///Users/xxx/Desktop/esm_commonjs/demos/04/b.mjs:5
console.log('a val', a);
                     ^

ReferenceError: Cannot access 'a' before initialization
    at file:///Users/xxx/Desktop/esm_commonjs/demos/04/b.mjs:5:22
```

我们会发现一个 ReferenceError 的异常报错，提示不能在初始化之前使用变量。这是因为我们使用了 `let` 定义变量，使用了 `const` 定义函数，导致无法做变量和函数提升。

怎么修改才能正常运行呢？其实很简单：用 `var` 代替 `let`，使用 function 来定义函数，我们查看 [`demos/05`](https://github.com/WangYuLue/esm_commonjs/tree/main/demos/05) 来看效果：

看看 `./a.mjs` 的代码：

```js
console.log("b val", b);

console.log("setB to bb");

setB("bb");

var a = "a";

function setA(newA) {
  a = newA;
}

export { a, setA };
```

再看看 `./b.mjs` 的代码：

```js
import { a, setA } from "./a.mjs";

console.log("running b.mjs");

console.log("a val", a);

console.log("setA to aa");

setA("aa");

var b = "b";

function setB(newB) {
  b = newB;
}

export { b, setB };
```

执行 `node app.mjs` 查看运行结果：

```log
running b.mjs
a val undefined
setA to aa
running a.mjs
b val b
setB to bb
```

可以发现这样修改后可以正常执行，没有出现异常报错。

写到这里我们可以详细谈谈 ESM 的加载细节了，它其实和前面提到的 CommonJS 的 `Module._load` 函数做的事情有些类似：

1. 检查缓存，如果缓存存在且已经加载，则直接从缓存模块中提取相应的值，不做下面的处理
1. 如果缓存不存在，新建一个 Module 实例
1. 将这个 Module 实例放到缓存中
1. 通过这个 Module 实例来加载文件
1. 加载文件后到**全局执行上下文**时，会有创建阶段和执行阶段，在创建阶段做函数和变量提升，接着执行代码。
1. 返回这个 Module 实例的 exports

结合 [`demos/05`](https://github.com/WangYuLue/esm_commonjs/tree/main/demos/02) 的循环加载，我们再做一个详细的解释：

当 `app.mjs` 加载 `a.mjs` 时，Module 会检查缓存中有没有 `a.mjs`，发现没有，于是 new 一个 `a.mjs` 模块，并将这个模块放到缓存中，再去加载 `a.mjs` 文件本身。

在加载 `a.mjs` 文件时，在 **创建阶段** 会为全局上下文中的函数 `setA` 和 变量 `a` 分配内存空间，并初始化变量 `a` 为 `undefined`。在执行阶段，发现第一行是加载 `b.mjs`，它会检查缓存中有没有 `b.mjs`，发现没有，于是 new 一个 `b.mjs` 模块，并将这个模块放到缓存中，再去加载 `b.mjs` 文件本身。

在加载 `b.mjs` 文件时，在 **创建阶段** 会为全局上下文中的函数 `setB` 和 变量 `b` 分配内存空间，并初始化变量 `b` 为 `undefined`。在执行阶段,发现第一行是加载 `a.mjs`，它会检查缓存中有没有 `a.mjs`，发现存在，于是 `import` 返回了缓存中 `a.mjs` 导出的相应的值。

虽然这个时候 `a.mjs` 根本还没有执行过，但是它的 **创建阶段** 已经完成了，即在内存中也已经存在了 `setA` 函数和值为 `undefined` 的变量 `a`。所以这时候在 `b.mjs` 里可以正常打印 `a` 并使用 `setA` 函数而没有异常抛错。

### 再谈 ESM 和 CommonJS 的区别

#### 不同点：this 的指向不同

CommonJS 的 this 指向可以查看[源码](https://github.com/nodejs/node/blob/v4.0.0/lib/module.js#L434)：

```js
var args = [self.exports, require, self, filename, dirname];
return compiledWrapper.apply(self.exports, args);
```

很清楚的可以看到 `this` 指向的是当前 `module` 的默认 `exports`；

而 ESM 由于语言层面的设计指向的是 `undefined`。

#### 不同点：**filename**，**dirname** 在 CommonJS 中存在，在 ESM 中不存在

在 CommonJS 中，模块的执行需要用函数包起来，并指定一些常用的值，可以查看[源码]([node 源码](https://github.com/nodejs/node/blob/v4.0.0/src/node.js#L932)：

```js
NativeModule.wrapper = [
  "(function (exports, require, module, __filename, __dirname) { ",
  "\n});",
];
```

所以我们全局才可以直接用 `__filename`、`__dirname`。而 ESM 没有这方面的设计，所以在 ESM 中不能直接使用 `__filename` 和 `__dirname`。

#### 相同点：ESM 和 CommonJS 都有缓存

这一点两种模块方案一致，都会缓存模块，模块加载一次后会缓存起来，后续再次加载会用缓存里的模块。

### 参考文档

- [阮一峰：Module 的加载实现](https://es6.ruanyifeng.com/#docs/module-loader#ES6-%E6%A8%A1%E5%9D%97%E4%B8%8E-CommonJS-%E6%A8%A1%E5%9D%97%E7%9A%84%E5%B7%AE%E5%BC%82)
- [深入 Node.js 的模块加载机制，手写 require 函数](https://segmentfault.com/a/1190000023828613)
- [commonjs 与 esm 的区别](https://juejin.cn/post/6844903861166014478)
- [The Node.js Way - How `require()` Actually Works](http://fredkschott.com/post/2014/06/require-and-the-module-system/)
- [stackoverflow:How does require() in node.js work?](https://stackoverflow.com/questions/9475792/how-does-require-in-node-js-work)
- [Node 模块加载机制：展示了一些魔改 require 的场景](http://www.ayqy.net/blog/node%E6%A8%A1%E5%9D%97%E5%8A%A0%E8%BD%BD%E6%9C%BA%E5%88%B6/#articleHeader6)
- [docs: ES 模块和 CommonJS 之间的差异](http://nodejs.cn/api/esm.html#differences-between-es-modules-and-commonjs)
- [Requiring modules in Node.js: Everything you need to know](https://www.freecodecamp.org/news/requiring-modules-in-node-js-everything-you-need-to-know-e7fbd119be8/)
- [JavaScript Execution Context and Hoisting Explained with Code Examples](https://www.freecodecamp.org/news/javascript-execution-context-and-hoisting/)
- [深入了解 JavaScript 执行过程（JS 系列之一）](https://blog.csdn.net/wexin_37276427/article/details/105028116)
- [JS 执行过程详解](https://segmentfault.com/a/1190000039380905)
- [7 Types of Native Errors in JavaScript You Should Know](https://blog.bitsrc.io/types-of-native-errors-in-javascript-you-must-know-b8238d40e492)
