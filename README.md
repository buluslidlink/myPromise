# myPromise

> myPromise is a fast, small, and feature-rich JavaScript library.

For information on how to get started and how to use myPromise, please see [myPromise's test file](https://github.com/buluslidlink/myPromise/blob/master/test/test.js).
For source files and issues, please visit the [myPromise repo](https://github.com/buluslidlink/myPromise.git).

## Including myPromise

Below are some of the most common ways to include myPromise.

### Browser

#### Script tag

Download source codes and refer the src or dist js file.

```html
<script src="src/myPromise.js or (dist/myPromise.min.js)"></script>
```

#### AMD (Asynchronous Module Definition)

AMD is a module format built for the browser. For more information, we recommend [require.js' documentation](http://requirejs.org/docs/whyamd.html).

```js
define(["myPromise"], function(myPromise) {

});
```

### Node

To include myPromise in [Node](nodejs.org), first install with npm.

```sh
npm install myPromise
```

For myPromise to work in Node, an environment supported ECMAScript6 is required.

```js
var myPromise=require("myPromise");
var p=new myPromise((resolve,reject)=>{setTimeout(()=>{resolve({data:1}),2000);}).then(result=>{});
//p.then(...).catch(err=>{}).then()....
```
