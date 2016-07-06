/**
 * author:bulusli
 * version:1.0.0
 * summary:自定义Promise实现，支持异步的then、catch的链式调用。
 */
(function (window) {
    "use strict";
    class MyPromise {
        /**
         * 处理异常，由MyPromise自身逐层向外传递
         * @param callbackArr  回调函数数组，用来查找错误捕获函数
         * @param currIndex  当前catch方法的位置
         * @param error  错误信息
         * @param currPromise  当前MyPromise对象，同callback方法
         * @param fnIndexInCallbackArr 同callback
         * @returns {undefined}  错误函数的返回值
         */
        static handleError(callbackArr, currIndex, error, currPromise, fnIndexInCallbackArr) {
            let needParentCall = false;
            let hasFunc = false;
            let eResult = undefined;
            if (callbackArr && Array.isArray(callbackArr) && callbackArr.length > 0) {
                let _index = 0;
                let obj = callbackArr.find((value, index)=> {
                    _index = index;
                    if (value && value["doThen"] && Object.is(typeof value["doThen"], "function") && currPromise) {
                        value["doThen"](currPromise);
                        return false;
                    }
                    return (index >= currIndex && (value && value["eFn"] && Object.is(typeof value["eFn"], "function")));
                });
                if (obj) {
                    hasFunc = true;
                    callbackArr.splice(currIndex, _index - currIndex + 1);  //移除catch方法之前的success函数
                    try {
                        eResult = obj["eFn"](error);
                        if (eResult && Object[Symbol.hasInstance].call(MyPromise, eResult)) {  //错误函数中返回Promise对象，需要将该对象加入到调度数组的头部，再次调用该对象，传递给后续的函数
                            //callbackArr.splice(0, 0, {
                            //    sFn: ()=> {
                            //        return _eResult
                            //    }
                            //});
                            //eResult = undefined;  //MyPromise对象需要返回undefined，否则
                        } else {
                            obj["doReject"](eResult);
                        }
                    } catch (e) { //先在自身的回调中查找后续catch函数
                        MyPromise.handleError(callbackArr, _index, e, currPromise, fnIndexInCallbackArr);  //tail call optimized
                    }
                } else {
                    callbackArr.splice(0, callbackArr.length);//删除数组所有元素
                    needParentCall = true;
                }
            } else {
                needParentCall = true;
            }
            //如果上一级MyPromise对象依然没有捕获错误，则抛出异常
            if (needParentCall) {
                let parent = currPromise ? currPromise.parent : undefined;//上一级MyPromise对象
                let parentArr = parent ? parent.callbackArr : undefined; //上一级回调数组
                if (parentArr && parentArr.length > 0) {//在上一级中查找error处理函数，从当前对象所在方法fnIndexInCallbackArr位置的后面开始
                    MyPromise.handleError(parentArr, fnIndexInCallbackArr, error, parent, parent.index);
                } else {
                    throw new Error(error || "uncaught error");
                }
            }
            if (hasFunc && (!eResult)) { //有错误捕获函数，但是返回值为undefined，需要返回特定的信息
                return "undefined catch result";
            }
            return eResult;
        }

        /**
         * 从callbackArr中查找要执行的success方法
         * @param callbackArr
         * @param promise  执行resolve函数的对象
         * callbackValue   返回的参数值
         * nestedPromise  嵌套返回的异步对象
         * @returns {*}
         */
        static findsFn(callbackArr, promise, callbackValue, nestedPromise) {  //前一次调用返回的参数，始终会传递给后面一个。不管是否需要
            if (callbackArr && Array.isArray(callbackArr) && callbackArr.length > 0) {
                //不是异步操作则直接执行
                let _index = 0;

                let obj = callbackArr.find((value, index)=> {
                    _index = index;
                    if (value && value["doThen"] && Object.is(typeof value["doThen"], "function")) {  //catch或者then没有传递回调方法时也需要调用，此时MyPromise对象的状态为callbackArr所在对象即参数promise的状态
                        if (nestedPromise) {  //嵌套对象存在，则使用嵌套异步对象，否则，使用调用callbackArr时的异步对象
                            value["doThen"](nestedPromise);
                        } else {
                            if (Object.is(callbackValue, "undefined catch result")) {
                                value["doThen"](MyPromise.resolve());//如果是没有返回值的catch方法之后的方法，则需要传递undefined
                            } else {
                                if (promise) {
                                    value["doThen"](promise);
                                }
                            }
                        }
                        return false;
                    } else if (value && ( !value["doResolve"]) && value["doReject"] && Object.is(typeof value["doReject"], "function")) {//catch方法不需要调用时，也要改变MyPromise对象的状态以保证对象的状态能够被改变，传递catch前的方法返回的参数
                        value["doReject"](Object.is(callbackValue, "undefined catch result") ? undefined : callbackValue);
                        return false;
                    }
                    return (value && value["sFn"] && Object.is(typeof value["sFn"], "function"));
                });
                callbackArr.splice(0, _index + 1); //保留obj之后的所有回调函数，如果obj不存在，则会删除所有回调

                return obj;
            }
            return undefined;
        }


        /**
         * summary:递归调用then中的success回调函数，并将回调函数返回值传递到下一个then中的success回调函数。
         *
         *
         *
         * desp:如果success回调函数返回值为异步对象即MyPromise对象且有异步延时操作，则该异步对象为callback的currPromise参数。
         * 传入该参数的目的是为了返回异步对象产生的异常不能被该异步对象后续方法捕获时，能够将异常传递到外部异步对象的方法。
         eg：new MyPromise((resolve, reject)=> {
    setTimeout(()=> {
        resolve("P:(1)");  //2.执行时，会调用callbackArr数组，且传入所在的MyPromise引用到callback方法中。当调用到下面then中的方法时
                            //会将该引用传给返回MyPromise对象parent属性，使得返回对象的reject方法执行时，能够将错误信息传递给
                            //parent所在callbackArr中的大于index的catch方法。
    }, 4000);
}).then((result)=> {  //1.该方法会加入到当前MyPromise对象的callbackArr中，并会记录方法在数组中的index，目的是当下面返回的异步对象向外抛出异常时
    alert(result);    //能够找到位于index之后的catch方法

    return new MyPromise((resolve, reject)=> {  //3.执行时，返回MyPromise对象，且有异步操作，但后续没有catch捕获错误，则reject执行时会将错误抛给上面的MyPromise对象后续的的catch方法。
        setTimeout(()=> {
            reject("P:(2)");  //此处的错误会被外部的catch捕获
        }, 3000);
    }).then((result)=> {
        alert(result);
        return new MyPromise((resolve, reject)=> {
            setTimeout(()=> {
                reject("P:(3)")
            }, 3000);
        });
    });
}).catch(e=> {  //捕获"P3:(2)"错误信息
    alert(e);
});
         *
         *
         * @param thenCallbackValue  then中success函数接收的参数，可以为undefined
         * @param thenCallbackArr  链式调用then函数时的success、failed回调函数顺序数组。
         * @param currPromise  异步执行对象的引用，指链式调用时的第一个异步对象，后续then或catch都会加入到该异步对象的callbackArr
         * @param fnIndexInCallbackArr  当前调用的方法在callbackArr中的index
         */
        static callback(thenCallbackValue, thenCallbackArr, currPromise, fnIndexInCallbackArr) {
            if (thenCallbackArr && Array.isArray(thenCallbackArr) && thenCallbackArr.length > 0) {
                if (Object[Symbol.hasInstance].call(MyPromise, thenCallbackValue)) { //调用instanceOf接口，判断回调函数返回值是否为MyPromise类型
                    if (currPromise) {
                        if (thenCallbackValue.callbackArrPromise) {  //异步所在对象的引用
                            thenCallbackValue.callbackArrPromise.parent = currPromise;  //记录上级异步对象
                        } else {
                            thenCallbackValue.parent = currPromise;
                        }
                    }
                    if (fnIndexInCallbackArr != undefined) {
                        if (thenCallbackValue.callbackArrPromise) {  //记录返回当前异步对象的方法在上级异步对象的callbackArr中的位置
                            thenCallbackValue.callbackArrPromise.index = fnIndexInCallbackArr;
                        } else {
                            thenCallbackValue.index = fnIndexInCallbackArr;
                        }
                    }

                    thenCallbackValue.then(result=> {  //如果then中success回调函数返回值也为MyPromise对象，则先执行该回调，then中的函数目的是当该异步对象执行完后，继续从上次返回该异步对象的方法后执行,这里的result为该异步对象返回的最后参数
                        let obj = MyPromise.findsFn(thenCallbackArr, currPromise, result, thenCallbackValue);  //需要将异步执行的结果传递给上层异步后的then或者catch方法所在的对象
                        if (obj) {
                            let index = obj["index"];
                            let _result = obj["sFn"](result);
                            if (obj["doResolve"]) {
                                if (!( _result instanceof MyPromise)) {
                                    obj["doResolve"](_result);//将函数执行结果赋给所在的异步对象
                                } else {
                                    thenCallbackArr.splice(0, 0, {doReject: obj["doResolve"]})//内部的异步对象执行完之后再调用，因为需要将异步执行的结果赋值。
                                }
                            }
                            MyPromise.callback(_result, thenCallbackArr, currPromise, index);  //异步执行完再执行后续回调数组
                        }
                    }, e=> {  //用于链式调用时，返回的MyPromise对象的reject同步执行的情况。如...then(result=>{return new MyPromise((resolve,reject)=>{reject('ggg')});});
                        let eResult = MyPromise.handleError(thenCallbackArr, 0, e, currPromise, fnIndexInCallbackArr);
                        MyPromise.callback(eResult, thenCallbackArr);
                    });
                }
                else {
                    try {
                        let obj = MyPromise.findsFn(thenCallbackArr, currPromise, thenCallbackValue);//需要传递上次执行的返回值
                        if (obj) {
                            let callbackValue = obj["sFn"](Object.is(thenCallbackValue, "undefined catch result") ? undefined : thenCallbackValue);

                            if (obj["doResolve"]) {
                                if (!( callbackValue instanceof MyPromise)) {
                                    obj["doResolve"](callbackValue);//将函数执行结果赋给所在的异步对象
                                } else {
                                    thenCallbackArr.splice(0, 0, {doReject: obj["doResolve"]})//内部的异步对象执行完之后再调用，因为需要将异步执行的结果赋值给该方法。
                                }
                            }
                            let index = obj["index"];
                            MyPromise.callback(callbackValue, thenCallbackArr, currPromise, index);  //tail call optimized
                        }
                    } catch (e) {//调用错误捕获函数
                        let eResult = MyPromise.handleError(thenCallbackArr, 0, e, currPromise, fnIndexInCallbackArr);
                        MyPromise.callback(eResult, thenCallbackArr);
                    }
                }
            }
        }

        /**
         * 执行reject方法
         * @param err
         * @param promise
         */
        static rejectFunc(err, promise) {
            let cstor = promise.constructor;
            let arr = promise.callbackArr;
            promise.err = err;
            promise.rejected = true;
            promise.pending = false;

            if (arr && arr.length > 0) {
                let eResult = cstor.handleError(arr, 0, err, promise, promise.index);
                cstor.callback(eResult, arr, promise);
            }
        }

        /**
         * 返回执行状态为resolved的MyPromise对象
         * @param thenableObj
         * @returns {*}
         */
        static resolve(thenableObj) {
            if (thenableObj) {
                if (Object[Symbol.hasInstance].call(MyPromise, thenableObj)) {
                    return thenableObj;
                }
            }
            return new MyPromise(resolve=> {
                resolve(thenableObj);
            });
        }

        static  generateUUID() {
            let d = new Date().getTime();
            let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        };

        /**
         * 返回执行状态为rejected的MyPromise对象
         * @param reason  reject参数
         * @returns {MyPromise}
         */
        static reject(reason) {
            return new MyPromise((resolve, reject)=> {
                reject(reason);
            });
        }

        static doCatch() {

        }

        /**
         *构造函数
         * @param executor  执行函数，需要resolve和reject回调函数作为参数
         */
        constructor(executor) {
            let curr = this;
            let cstor = curr.constructor;
            this.resolved = false; //异步执行成功的状态
            this.rejected = false;  //异步执行失败的状态
            this.pending = true;  //异步执行中
            this.data = undefined; //代码正常状态下的返回值，也是resolve传递的参数
            this.err = undefined;  //异常信息，也是reject的参数
            this.thenCallbackValue = undefined; //then的success函数的返回值
            this.thenErrorValue = undefined; //then的failed函数的返回值
            this.prev = undefined;  //前一个Promise对象。用在then链式调用时判断是否需要执行then中的回调函数，判断prev.resolved或者prev.rejected。
            this.callbackArr = undefined;  //回调函数数组
            this.callbackArrPromise = undefined;//callbackArr数组所在的引用，链式调用时第一个异步操作对象的引用
            this.parent = undefined;  //上一级异步对象的引用
            this.index = undefined;  //then的success函数在callbackArr中的index
            this.uuid = cstor.generateUUID();//异步对象的唯一标记

            if (!Object.is(typeof executor, "function")) {
                throw new Error("The constructor of Promise's para named fn must be a function with resolve and reject functions as paras");
            }
            try {
                executor(data=> {
                        //调用构造函数传入的执行函数
                        if (curr.pending) { //异步不能同时有resolved和rejected两种状态
                            curr.data = data;
                            curr.resolved = true;
                            curr.pending = false;
                            let callbackArr = curr.callbackArr;

                            if (callbackArr && callbackArr.length > 0) {  //执行then回调中的第一个函数。
                                cstor.callback(data, callbackArr, curr, curr.index);
                            }
                        }
                    },
                    (err)=> { //reject函数执行时的代码
                        if (curr.pending) {
                            cstor.rejectFunc(err, curr);
                        }
                    }
                );
            } catch (e) {
                cstor.rejectFunc(e, curr);
            }
        }


        /**
         * 异步回调函数
         * @param successFn   接收非错误传递的参数
         * @param failedFn  接收reject函数执行完成传递的参数或者捕获抛出的错误
         * @returns {*}  MyPromise对象或者undefined
         */
        then(successFn, failedFn) {
            let curr = this;
            let prev = curr.prev;//前一个异步操作，then的链式调用时，如果前一个异步操作已经结束，则需要将前一个的值传给后一个then的接收参数。
            let cstor = curr.constructor;

            try {
                let _pending = (prev ? prev.pending : curr.pending);

                if (_pending) {
                    //   没有执行完，则将要执行的success和failed回调函数加入到回调数组中，等待异步执行完成之后从数组中调用
                    let newPromise = curr.catch(failedFn);
                    let arr = newPromise.callbackArrPromise.callbackArr;
                    let o = arr[arr.length - 1];
                    let noNeedDoThenMtehod = ((Object.is(typeof successFn, "function")) || (Object.is(typeof failedFn, "function")));

                    if (Object.is(typeof successFn, "function")) {
                        if (o) {
                            o["sFn"] = successFn;
                            o["doResolve"] = o["doReject"] || function (result) {
                                    if (newPromise.pending) {
                                        newPromise.resolved = true;
                                        newPromise.pending = false;
                                        newPromise.data = result;
                                        newPromise.callbackArrPromise = undefined;
                                        newPromise.prev = undefined;
                                    }
                                }
                        }
                    }
                    if (noNeedDoThenMtehod) {
                        delete o["doThen"];
                    }
                    return newPromise;
                } else {
                    let _resoved = (prev ? prev.resolved : curr.resolved);
                    let _rejected = (prev ? prev.rejected : curr.rejected);

                    if (_resoved) {
                        let sPara = (prev ? (prev.thenCallbackValue || prev.data) : curr.data);//前一个success函数的返回值传递给后一个，prev.data用于前一个不是异步操作时，调用resolve('xxxx')方法后产生的xxxx参数

                        curr.prev = undefined; //清空前一个prev

                        try {
                            if (Object.is(typeof successFn, "function")) {  //没有处理函数，则向后传递参数
                                //前一个方法
                                let result = curr.thenCallbackValue = successFn(sPara);

                                if (Object[Symbol.hasInstance].call(cstor, result)) {  //success方法返回的又是异步对象，则将该对象作为返回新异步对象的前一个异步对象
                                    return result;
                                } else {//不是异步对象，则直接返回resolved状态的新对象
                                    return cstor.resolve(result);
                                }
                            } else {
                                return cstor.resolve(sPara);
                            }
                        } catch (e) {
                            return cstor.reject(e);
                        }
                    } else if (_rejected) {
                        return this.catch(failedFn);
                    }
                }
            } catch (e) {
                return cstor.reject(e);
            }
        }

        /**
         * 错误捕获方法
         * @param failedFn
         * @returns {*}
         */
        catch
        (failedFn) {
            let curr = this;
            let cstor = curr.constructor;
            let prev = curr.prev;
            let _rejected = (prev ? prev.rejected : curr.rejected); //prev用于链式调用时
            let _pending = (prev ? prev.pending : curr.pending);  //有prev，则以prev的pending状态为准，没有，则以curr为准
            let fPara = (prev ? prev.err : curr.err);

            if (_rejected) {  //状态已经被改变，即抛出了错误，则直接调用
                try {
                    curr.prev = undefined; //清空前一个prev

                    if (Object.is(typeof  failedFn, "function")) {
                        let eResult = curr.thenErrorValue = failedFn(fPara);//调用错误捕获方法

                        if (Object[Symbol.hasInstance].call(cstor, eResult)) {  //同success函数
                            return eResult;
                        } else {
                            return cstor.resolve(eResult);
                        }
                    } else {
                        return cstor.reject(fPara); //没有注册错误捕获方法，则一直传递该错误
                    }
                } catch (e) {
                    return cstor.reject(e);  //then中的错误捕获函数报错则直接返回状态为reject的异步对象供后续catch方法使用
                }
            } else if (_pending) {  //只有执行中的异步才需要加入回调数组
                let o = undefined;
                let p = new cstor((resolve, reject)=> {
                });//不需要传递前一个引用，因为处于pending状态的后续调用都会加入到回调数组中

                if (Object.is(typeof  failedFn, "function")) {
                    o = {};
                    o["eFn"] = failedFn;
                    o["doReject"] = function (result) {  //方法执行完成后调用，终结对象的状态，catch之后即为正常
                        if (p.pending) {
                            p.data = result;
                            p.callbackArrPromise = undefined;
                            p.prev = undefined;
                            p.resolved = true;
                            p.pending = false;
                        }
                    }
                }
                if (!o) { //没有处理函数则传递参数
                    o = {};
                    o["doThen"] = function (promiseResult) { //没有任何处理函数时终结对象状态，如then().catch()，此时用上一次调用的返回值作为此次的结果
                        if (p.pending) {
                            p.pending = false;
                            p.err = promiseResult.err;
                            p.data = promiseResult.data;
                            p.rejected = promiseResult.rejected;
                            p.resolved = promiseResult.resolved;
                            p.callbackArrPromise = undefined;
                            p.prev = undefined;

                        }
                    }
                }
                //将嵌套方法加入到异步对象的数组
                if (curr.callbackArrPromise) {
                    curr.callbackArrPromise.callbackArr.push(o);
                } else {
                    curr.callbackArr = Array.of(o);
                }
                o["index"] = (curr.callbackArrPromise ? curr.callbackArrPromise.callbackArr : curr.callbackArr).length - 1;
                curr.prev = undefined; //清空前一个prev

                p.prev = curr;  //异步没有执行完成，则返回新的异步对象，将当前对象作为前一个对象
                p.callbackArrPromise = curr.callbackArrPromise || curr;

                if (curr.callbackArrPromise) { //不是异步执行的对象，则清空该引用，避免无谓的引用
                    curr.callbackArrPromise = undefined;
                }

                return p;
            } else { //resolve时，用于同步调用
                let p = cstor.resolve((prev ? (prev.thenCallbackValue || prev.data) : curr.data));  //需要传递前一个引用，用于同步调用时，后续then的success函数能够接收到前面resolve函数传递的参数。

                curr.prev = undefined; //清空前一个prev

                return p;
            }
        }
    }

    if (typeof MyPromise !== "function") {
        throw new Error("MyPromise must be run in an ECMAScript6 envirement");
    }

    if (Object.is(typeof module, "object") && Object.is(typeof module.exports, "object")) {//Common JS
        module.exports = MyPromise;
    } else if (Object.is(typeof define, "function") && define.amd) { //AMD JS
        define(function () {
            return MyPromise;
        });
    } else {
        window.MyPromise = MyPromise;
    }

})(!Object.is(typeof window, "undefined") ? window : this);



