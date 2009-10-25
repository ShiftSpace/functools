// ==Builder==
// @required
// @package           FuncTools
// ==/Builder==

/*
  Function: $identity
    A function that simply returns the value given to it.
    
  Parameters:
    v - a value.
    
  Returns:
    The passed in value.
    
  (start code)
  $identity(5); // returns 5
  (end)
*/
function $identity(v) { return v; };

/*
  Function: $eq
    For testing equality when composing functions. Return
    a function which tests equality against the passed
    in value.
    
  Parameters:
    a - a value.
    
  Return:
    boolean.
    
  (start code)
  var fn = $eq(5);
  [1, 2, 3, 4, 5].some($eq(5)); // true
  (end)
*/
function $eq(a) { return function(b) { return a == b; }};

/*
  Function: $callable
    Check whether a value is non-null and a function.
    
  Paramters:
    v - a value.
    
  Returns:
    A function which returns boolean.
*/
function $callable(v) { return v && $type(v) == 'function'; }

/*
  Function: $not
    Returns the complement of a function. Useful when composing
    functions.
    
  Parameters:
    fn - a function.
    
  Returns:
    A function which return a boolean value.
*/
function $not(fn) {
  return function() {
    return !fn.apply(this, $A(arguments));
  }
};

/*
  Function: $range
    Returns a array of integer values.
  
  Parameters:
    a - an integer value.
    b - an integer, must be greater than a.
  
  Returns:
    An array.
    
  (start code)
  $range(1, 10) // [1, 2, 3, 4, 5, 6, 7, 8, 9]
  (end)
*/
function $range(a, b) {
  var start = (b && a) || 0, end = b || a;
  return $repeat(end-start, function() { return start++; });
};

/*
  Function: $isnull
    Function for checking whether a value is null. Useful
    in function composition.
    
  Parameters:
    v - a value.
    
  Returns:
    boolean.
*/
function $isnull(v) { return v === null; };

/*
  Function: $notnull
    Complement to $isnull
    
  Parameters:
    v - a value.
    
  Returns:
    boolean.
*/
function $notnull(v) { return v !== null; };

/*
  Function: $iterate
    Repeats a function generating an array of values
    from calling this function n times.
  
  Parameters:
    n - an integer.
    fn - a function.
  
  Returns:
    An array.
    
  (start code)
  var ints = (function() { var n = 0; return function() { return n++; }})();
  $iterate(10, ints); // [1, 2, 3, 4, 5, 6, 7, 8, 9]
  (end)
*/
function $iterate(n, fn) {
  var result = [];
  (n).times(function() {
    result.push(fn());
  });
  return result;
};

/*
  Function: $repeat
    Used to repeat a value. Returns an array of the value repeated
    n times.
  
  Parameters:
    n - a integer.
    v - a value.
    
  Returns:
    An array.
    
  (start code)
  $repeat(10, 'x'); // ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x"]
  (end)
*/
function $repeat(n, v) {
  return $iterate(n, $lambda(v));
};

/*
  Function: $arglist
    Get the arglist of a function. Return an array of
    the names of function's parameters.
  
  Parameters:
    fn - a function.
    
  Returns:
    An array of strings.
    
  See Also:
    $arity
    
  (start code)
  function add(a, b, c) { return a + b + c; };
  $arglist(add) // ["a", " b", " c"]
  (end)
*/
function $arglist(fn) {
  return fn._arglist || fn.toString().match(/function \S*\((.*?)\)/)[1].split(',');
};

/*
  Function: $arity
    Support for function dispatch on arity.
    
  Parameters:
    This function takes any number of functions as it's parameters.
    Each function should take a unique number of parameters.
    
  See Also:
    $reduce
    
  (start code)
  var sum = $arity(
    function(a) { return a; },
    function(a, b) { return a + b }
  );
  sum(5); // 5
  sum(5, 10); // 15
  (end)
*/
function $arity() {
  var fns = $A(arguments);
  var dispatch = [];
  fns.each(function(fn) {
    var arglist = $arglist(fn);
    dispatch[arglist.length] = fn;
  });
  return function () {
    var args = $A(arguments).filter($notnull);
    return dispatch[args.length].apply(this, args);
  }
};

/*
  Function: $reduce
    Uses a function to reduce a list of values to a single value.
  
  Parameters:
    fn - a function.
    ary - an array.
  
  Returns:
    A value.
    
  (start code)
  var ary = $repeat(10, 1);
  var sum = $arity(
    function(a) { return a; },
    function(a, b) { return a + b.first(); }
  );
  var total = $reduce(sum, ary);
  (end)
*/
function $reduce(fn, ary) {
  ary = $A(ary);
  var result = ary.first();
  while(ary.rest().length != 0) {
    var rest = ary.rest();
    result = fn(result, rest);
    ary = rest;
  }
  return result;
};

/*
  Function: $get
    Get the value from an object. Allows avoiding annoying
    if statements of the form if(object && object.foo && object.bar) fn(object.foo.bar);
    If any of the properties are undefined/null returns right away.
    
  Parameters:
    The first parameters is an object, the following parameters are the properties
    you want to access.
    
  Returns:
    A value.
    
  (start code)
  var obj = {"foo": {"bar": {"baz":42}}};
  $get(obj, "foo", "bar", "baz"); // 42
  $get(obj, "foo", "baj", "baz"); // null
  (end)
*/
function $get(first, prop) {
  var args = $A(arguments), rest = args.rest(2), next;
  if(rest.length == 0) return first[prop];
  if(['object', 'array'].contains($type(first))) next = first[prop];
  if($type(next) == 'function') next = first[prop]();
  return (next == null) ? null : $get.apply(null, [next].concat(rest));
};

/*
  Function: $acc
    Returns a function that applies $get an object. Useful
    in function composition.
    
  Parameters:
    A variable list of properties you wish to access in an object.
    
  Returns:
    A value.
    
  (start code)
  var objects = $repeat(5, {"foo":{"bar":{"baz":42}}});
  objects.map($acc("foo", "bar", "baz")); // [42, 42, 42, 42, 42]
  (end)
*/
function $acc() {
  var args = $A(arguments);
  return function(obj) {
    return $get.apply(null, [obj].combine(args));
  };
};

/*
  Constant: _
    To denote a value to be filled in curried function.
  
  See Also:
    <curry>
*/
var _ = {};
(function() {
function argmerge(a, b) {
  var result = [];
  for(var i = 0, len = Math.max(a.length, b.length); i < len; i++) {
    result[i] = (b[i] == _) ? a[i] || _ : (b[i] !== undefined && b[i]) || a[i];
  }
  return result;
};
Function.implement({
  /*
    Function: Function.decorate
      Decorate a function. Takes a list of decorators and applies
      them to the function.
      
    Parameters:
      A variable list of functions.
      
    Returns:
      The decorated function.
      
    (start code)
    var fib = function (n) {
      return n < 2 ? n : fib(n-1) + fib(n-2);
    }.decorate(memoize);
    fib(100);
    (end)
  */
  decorate: function() {
    var decorators = $A(arguments), orig = resultFn = this, decorator;
    while(decorator = decorators.pop()) resultFn = decorator(resultFn);
    resultFn._arglist = $arglist(orig);
    resultFn._decorated = orig;
    return resultFn;
  },

  /*
    Function: Function.comp
      Compose any number of functions.
      
    Parameters:
      A variable list of functions.
      
    Returns:
      A function.
      
    (start code)
    var objects = $repeat(5, {"foo":{"bar":{"baz":42}}});
    objects.map(Function.comp($acc("foo", "bar", "baz"), $eq(42))); // [true, true, true, true, true]
    (end)
  */
  comp: function() {
    var fns = $A(arguments), self = this;
    return function() {
      var temp = $A(fns);
      var args = $A(arguments), result = (self && $type(self) == 'function') ? self.apply(this, args) : null, fn;
      while(fn = temp.shift()) result = fn.apply(null, (result && [result]) || args);
      return result;
    }
  },
  
  /*
    Function: Function.partial
      A simple form of currying. Takes a function and you can bind
      in order the arguments to a function.
      
    Parameters:
      Take a variable list of arguments. The first is the bind
      parameter.
    
    Returns:
      A function.
      
    (start code)
    function abc(a, b, c) { return a + b + c; };
    var partial = abc.partial(null, 1, 2);
    partial(3) // 6
    (end)
  */
  partial: function(bind) {
    var self = this;
    args = $A(arguments).rest();
    return function() {
      return self.apply(bind, args.concat($A(arguments)));
    };
  },
  
  /*
    Function: Function.curry
      A much more powerful version of currying. Any argument may
      supplied.
      
    (start code)
    function abc(a, b, c) { return a + b + c; };
    var curried = abc.curry(null, _, _, 3);
    curried = curried(1);
    curried(_, 2); // 6
    (end)
  */
  curry: function(bind) {
    var self = this, arglist = $arglist(this), args = $A(arguments).rest();
    args = argmerge($repeat(arglist.length, _), args);
    return function() {
      var fargs = argmerge(args, $A(arguments));
      if(fargs.length == arglist.length && fargs.every($not($eq(_)))) {
        return self.apply(bind, fargs);
      } else {
        return self.curry.apply(self, [bind].extend(fargs));
      }
    };
  }
});
})();
/*
  Function: $comp
    Shorthand for Function.comp
    
  See Also:
    <Function.comp>
*/
var $comp = Function.comp;

/*
  Function: memoize
    A memoize decorator. Creates a hash of seen arguments and the
    return values.
    
  Parameters:
    fn - a function.
    
  Returns:
    A function.
    
  (start code)
  var fib = function (n) {
    return n < 2 ? n : fib(n-1) + fib(n-2);
  }.decorate(memoize);
  fib(100);
  (end)
*/
function memoize(fn) {
  var table = {};
  return function memoized() {
    var args = $A(arguments);
    var enc = JSON.encode(args);
    if(!table[enc]) {
      var result = fn.apply(this, args);
      table[enc] = result;
      return result;
    } else {
      return table[enc];
    }
  };
}

/*
  Function: pre
    A decorator for support pre-conditions for a function. A predicate
    can be supplied for each argument.
    
  Parameters:
    conditions - an array of predicate functions.
    error - a boolean or function. If boolean will throw an exception
      on a failed predicate. If a function will call it as an error
      handler with the array containing the list of passed and failed
      predicates.
  
  Returns:
    A function.
    
  (start code)
  var isEven = function(n) { return n % 2 == 0; };
  var isOdd = $not(isEven);
  var add = function(a, b) { return a + b; }.decorate(pre([isEven, isOdd], true));
  add(2, 3); // 5
  add(2, 2); // throws exception
  (code)
*/
function pre(conditions, error) {
  error = error || false;
  return function preDecorator(fn) {
    return function() {
      var args = $A(arguments);
      var passed = conditions.map(function(afn, i) {
        var result = afn(args[i]);
        return result;
      });
      if(passed.indexOf(false) == -1) {
        return fn.apply(this, args);
      } else {
        if($type(error) == 'boolean' && error) {
          var err = new Error("Arguments did not match pre conditions.");
          err.args = args;
          err.passed = passed;
          err.source = fn.toString();
          throw err;
        } else if($type(error) == 'function') {
          error(passed);
        }
      }
    }
  }
}

// We need a backreference to wrapper to support decorator usage from within classes - David
Class.extend({
  wrap: function(self, key, method) {
    if (method._origin) method = method._origin;
    var wrapper = function() {
      if (method._protected && this._current == null) throw new Error('The method "' + key + '" cannot be called.');
      var caller = this.caller, current = this._current;
      this.caller = current; this._current = arguments.callee;
      var result = method.apply(this, arguments);
      this._current = current; this.caller = caller;
      return result;
    }.extend({_owner: self, _origin: method, _name: key});
    method._wrapper = wrapper;
    return wrapper;
  }
});

Array.implement({
  /*
    Function: Array.first
      Returns the first item.
  */
  first: function() { return this[0]; },
  
  /*
    Function: Array.rest
      Returns everything but the first item. If the
      Array is empty returns the array.
      
    Parameters:
      n - integer, the start index.
      
    Returns:
      An array.
  */
  rest: function(n) { return this.slice(n || 1, this.length); },
  
  /*
    Function: Array.drop
      Drop n items from the end of an array. Defaults to dropping 1 item.
    
    Parameters:
      n - integer, the number of items to drop.
      
    Returns:
      An array.
  */
  drop: function(n) { return this.slice(0, this.length-(n || 1)); },
  
  /*
    Function: Array.tail
      Returns the tail of the array. If no n specified returns the
      whole array.
      
    Parameters:
      n - integer.
      
    Returns:
      An array.
  */
  tail: function(n) { return this.slice((n || 0), this.length); },
  
  /*
    Function: Array.head
      Returns the head of the array. If no n specified returns the
      whole array.
      
    Parameters:
      n - an integer.
      
    Returns:
      An array.
  */
  head: function(n) { return this.slice(0, (n || this.length)) },
  
  /*
    Function: Array.partition
      Partition an array into an array of subarrays.
    
    Parameters:
      n - the size of the partition.
      
    Returns:
      An array
      
    (start code)
    var ary = $range(10);
    ary.partition(2); // [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]]
    (end)
  */
  partition: function(n) {
    if(this.length % n != 0) throw Error("The length of this array is not a multiple of " + n);
    var result = [];
    var ary = this;
    while(ary.length > 0) {
      var sub = ary.head(n);
      result.push(sub);
      ary = ary.tail(n);
    }
    return result;
  },
  
  /*
    Function: Array.asFn
      Return a function that takes an index and returns
      that item in the array. Useful when composing functions.
      
    Returns:
      A function.
      
    (start code)
    var ary = ['cat', 'dog', 'bird', 'zebra', 'lion'];
    [1, 3, 2].map(ary.asFn()); // ['dog', 'zebra', 'bird']
    (end)
  */
  asFn: function() {
    var self = this;
    return function (idx) {
      return self[idx];
    }
  }
});

Hash.implement({
  /*
    Function: Hash.asFn
      Return a function that takes string and returns
      the corresponding value from the hash. Useful
      when composing functions.
      
    Returns:
      A function.
      
    (start code)
    var address = {
       "city": "New York", 
       "state": "New York", 
       "zip": 100018, 
       "street": "350 5th Avenue",
       "building": "Empire State",
       "floor": 32
    };
    ["building", "street", "city"].map($H(address).asFn()); // ["Empire State", "350 5th Avenue", "New York"]
    (end)
  */
  asFn: function() {
    var self = this;
    return function(k) {
      return self[k];
    };
  },
  
  /*
    Function: Hash.extract
      Get a new Hash of only the specified keys.
      
    Parameters:
      keys - an array of keys to extract
      clean - if true, returns a plain object.
      
    Returns:
      hash or object.
  */
  extract: function(keys, clean) {
    var result = keys.map(this.asFn()).associate(keys);
    return (clean) ? result : $H(result);
  }
})

/*
  Function: $msg
    Call a method on an object. Useful when composing functions.
    
  Parameters:
    The method name to call.
    
  Returns:
    A function.
    
  (start code)
  var MyClass = new Class({
    initialize: function(name) { this.name = name; },
    sayHello: function() {
      console.log("Hello from " + this.name)
    }
  });
  var ctorfn = function(name) { return new MyClass(name); };
  ["John", "Mary", "Bob"].map($comp(ctorfn, $msg("sayHello")));
  (end)
*/
function $msg(methodName) {
  var rest = $A(arguments).rest();
  return function(obj) {
    var method = obj[methodName];
    if($callable(method)) {
      return method.apply(obj, rest);
    } else {
      return obj.methodName;
    }
  };
}