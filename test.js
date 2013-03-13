var test = require("tap").test,
    Stack = require("./");

test("respond with 404 if no mid. provided", function (t) {
  Stack()(null, testRes400(t));
});

test("respond with 404 if last mid. calls next()", function (t) {
  Stack(function (req, res, next) {
    next();
  })(null, testRes400(t));
});

test("respond with 500 if any mid. calls next(Error)", function (t) {
  Stack(function (req, res, next) {
    next(new Error());
  })(null, testRes500(t));
});

test("respond with 500 if any mid. throws Error", function (t) {
  Stack(function () {
    throw new Error();
  })(null, testRes500(t));
});

test("mid. will be called in order when next() called", function (t) {
  t.plan(2);
  Stack(function (req, res, next) {
    t.equal(0, req.ctr++);
    next();
  }, function (req) {
    t.equal(1, req.ctr);
  })({ctr: 0});
});

test("compose with no layers is a noop middleware", function (t) {
  t.plan(1);
  Stack(Stack.compose(), function () {
    t.pass();
  })();
});

test("compose with one layers is equiv. to the layer", function (t) {
  t.plan(1);
  Stack(Stack.compose(function () {
    t.pass();
  }))();
});

test("respond with 500 if any compose mid. calls next(Error)", function (t) {
  Stack(Stack.compose(function (req, res, next) {
    next();
  }, function (req, res, next) {
    next(new Error());
  }))(null, testRes500(t));
});

test("respond with 500 if any compose mid. throws Error", function (t) {
  Stack(Stack.compose(function (req, res, next) {
    next();
  }, function () {
    throw new Error();
  }))(null, testRes500(t));
});

test("composed layers are called in order", function (t) {
  t.plan(4);
  var composition = Stack.compose(function (req, res, next) {
    t.equal(1, req.ctr++);
    next();
  }, function (req, res, next) {
    t.equal(2, req.ctr++);
    next();
  });
  Stack(function (req, res, next) {
    t.equal(0, req.ctr++);
    next();
  }, composition, function (req) {
    t.equal(3, req.ctr);
  })({ctr: 0});
});

test("respond with 400 if mount path not found", function (t) {
  Stack(Stack.mount("/home", function () {
    // empty
  }))({url: "/nothome"}, testRes400(t));
});

test("mount a stack on a path", function (t) {
  t.plan(1);
  Stack(Stack.mount("/", function () {
    t.pass();
  }))({url: "/"});
});

test("mount with no stack is a noop mid.", function (t) {
  t.plan(1);
  Stack.mount("/")({url: "test"}, null, function () {
    t.pass();
  });
});

test("mount next() on last mounted stack will call next layer", function (t) {
  t.plan(2);
  Stack(Stack.mount("/", function (req, res, next) {
    t.pass();
    next();
  }), function () {
    t.pass();
  })({url: "/"});
});

test("mount supports mountpoints w/ & w/o trailing slash", function (t) {
  t.plan(2);
  Stack(Stack.mount("/test", function () {
    t.pass();
  }))({url: "/test/"});
  Stack(Stack.mount("/test/", function () {
    t.pass();
  }))({url: "/test/"});
});

test("mounted url becomes root ('/'); orig. url is req.realUrl", function (t) {
  t.plan(2);
  Stack(Stack.mount("/test/", function (req) {
    t.equal(req.url, "/");
    t.equal(req.realUrl, "/test/");
  }))({url: "/test/"});
});

test("mounted won't update the req.realUrl if provided", function (t) {
  t.plan(1);
  Stack(Stack.mount("/test/", function (req) {
    t.equal(req.realUrl, "/unreal");
  }))({url: "/test/", realUrl: "/unreal"});
});

test("mounted uri is parsed if provided", function (t) {
  t.plan(1);
  Stack(Stack.mount("/test/", function (req) {
    t.equal(req.uri.path, "/");
  }))({url: "/test/", uri: "/test/"});
});

function testRes400(t) {
  t.plan(2);
  return {
    end: function () { t.pass(); },
    writeHead: function (code, msg) {
      t.equal(404, code);
    }
  };
};

function testRes500(t) {
  t.plan(2);
  return {
    end: function () { t.pass(); },
    writeHead: function (code, msg) {
      t.equal(500, code);
    }
  };
};
