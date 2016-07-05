/**
 * Created by bulusli on 2016/7/1.
 */

var p = new MyPromise((resolve, reject)=> {
    setTimeout(()=> {
        resolve("P:(1)");
    }, 4000);
}).then((result)=> {
    alert(result);
    return new MyPromise((resolve, reject)=> {
        setTimeout(()=> {
            //   reject("P:(2)");  //此处的错误会被外部的catch捕获
            resolve("P:2");
        }, 3000);
    }).then((result)=> {
        alert(result);
        return new MyPromise((resolve, reject)=> {
            setTimeout(()=> {
                reject("P:(3)")
            }, 3000);
        });
    }).then((r)=> {
        alert(r)
    }).catch(e=> {
        alert("internal catch:" + e);
        return MyPromise.reject("p:(4)");
    });
}).catch(e=> {
    alert(e);
});

var p1 = new MyPromise((resolve, reject)=> {
    // setTimeout(()=> {
    reject("P1:(1)reject1");
    //  }, 4000);
}).catch(result=> {
    alert(result);
    return new MyPromise((resolve, reject)=> {
        setTimeout(()=> {
            resolve("P1:(2)resolve1");
        }, 3000);
    });
}).catch(e=> {
    alert(e);
}).then(result=> {
    alert(result);
    return new MyPromise((resolve, reject)=> {
        //    setTimeout(()=> {
        reject("P1:(3) reject2");
        //   }, 5000);
    });
}).then(result=> {
    alert("then4 result:" + result);
    throw new Error("then4 error");
}).catch(e=> {
    // setTimeout(()=> {
    alert(e);
    new MyPromise((resolve, reject)=> {
        setTimeout(()=> {
            reject("P1:(4) Internal reject1");
        }, 2000)
    }).catch(e=> {
        alert(e)
    }).then(r=> {
        MyPromise.reject("P1:(5) internal reject2").then((result)=> {
            alert(result)
        }).catch(e=> {
            alert(e)
        });
    });
    // },3000);
})


var p2 = MyPromise.resolve("P2:(1)").then((e)=> {
    alert(e);
    throw new Error("P2:(2)");
}).then(()=> {
    alert("cccc");
}, (e)=> {
    alert(e.message);
    return new MyPromise((resolve, reject)=> {
        setTimeout(()=> {
            //  reject("ffffff");
            resolve("P2:(3)");
            //    reject("ttt");
        }, 3000)
    });
}).then((result)=> {
    alert(result);
}, e=> {
    alert(e);
}).then(()=> {
    alert("P2:(4)");
});


var p3 = new MyPromise((resolve, reject)=> {
    //   setTimeout(()=> {
    resolve("P3:(1)");
    // }, 4000);
}).then((result)=> {
    alert(result);
    return new MyPromise((resolve, reject)=> {
        //    setTimeout(()=> {
        reject("P3:(2)");
        //    }, 3000);
    }).then(result=> {
    }, err=> {
        alert(err);
        return new MyPromise((resolve, reject)=> {
            //   setTimeout(()=> {
            resolve("P3:(3)");
            //    }, 2000);
        });
    }).then((result)=> {
        alert(result);
        return new MyPromise((resolve, reject)=> {
            //  setTimeout(()=> {
            reject("P3:(4)")
            //   }, 3000);
        });
    });
}).catch(e=> {
    alert(e);
});


var p4 = new MyPromise((resolve, reject)=> {
        setTimeout(()=> {
            resolve("P4:(1)");
        }, 3000);
    }
).then(r=> {
    alert(r);
    return new MyPromise((resolve, reject)=> {
        setTimeout(()=> {
            resolve("P4:(2)");
        }, 3000);
    }).then(e=> {
        alert(e);
        return new MyPromise((resolve, reject)=> {
            setTimeout(()=> {
                resolve("P4:(3)");
            }, 2000);
        }).catch(f=> {
            alert(f);
            return new MyPromise((resolve, reject)=> {
                setTimeout(()=> {
                    reject("internal promise")
                }, 3000);
            }).catch(e=> {
                alert(e);
                return "11111";
            });
        }).then(r=> {
            alert(r);
            return new MyPromise((resolve, reject)=> {
                setTimeout(resolve("internal reject"), 3000);
            }).then(r=> {
                alert(r);
                return "11111";
            });
        });
    }).then((e)=> {
        alert(e);
        return MyPromise.resolve("internal resolve2").then(r=> {
            alert(r);
            return "22222";
        });
    }).catch(e=> {
        alert(e);
        return new MyPromise((resolve, reject)=> {
            setTimeout(()=> {
                resolve("ffffffff");
            }, 3000);
        })
    });
}).catch().then().catch().then((e)=> {
    alert("P4 out:" + e);
    MyPromise.reject("P4:(4)").catch(e=> {
        alert(e)
    });
    return "p4 out data";
}).catch(e=> {
    alert(e);
});

p4.then((r)=> {
    alert('gggg');
});


var p5 = new MyPromise((resolve, reject)=> {
    setTimeout(()=> {
        reject('P5:(1)');
    }, 3000);
});

var p6 = p5.catch(e=> {
    alert(e);
    return new MyPromise(resolve=> {
        setTimeout(()=> {
            resolve("P6:(1)");
        }, 2000)
    }).then((r)=> {
        return MyPromise.reject("P6:(2)").then(()=> {
            return "333333"
        });
    }).catch((e)=> {
        return e
    });
}).then().catch().then().catch(d=> {
})

var p7 = p6.then(e=>alert(e));

//
//var p = new MyPromise((resolve, reject)=> {
//    setTimeout(()=> {
//        reject("ddddddd");
//    }, 2000);
//});
//
//var p1 = p.then();
//
//var p2 = p1.catch().catch(e=> {
//    alert(e);
//    return "2222";
//});
//var p3 = p2.then(e=> {
//    alert(e);
//    return "33333";
//});

//有bug：p2连续调用时如下调用会有问题，因为异步执行时参数是按顺序传递的，而p2此时状态为pending，最后会传入333333。暂时不考虑该情况的处理。
//setTimeout(()=> {
//    p2.then(data=> {
//        alert(data);
//    });
//}, 1000);

//正常，因为状态已经为resolved
//setTimeout(()=> {
//    p2.then(data=> {
//        alert(data);
//    });
//}, 5000);


