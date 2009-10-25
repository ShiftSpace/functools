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
  var add = $arity(
    function(a) { return a; },
    function(a, b) { return a + b.first(); }
  );
  var sum = $reduce(add, ary);
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

function $get(first, prop) {
  var args = $A(arguments), rest = args.rest(2), next;
  if(rest.length == 0) return first[prop];
  if(['object', 'array'].contains($type(first))) next = first[prop];
  if($type(next) == 'function') next = first[prop]();
  return (next == null) ? null : $get.apply(null, [next].concat(rest));
};

function $acc() {
  var args = $A(arguments);
  return function(obj) {
    return $get.apply(null, [obj].combine(args));
  };
};

var $_ = {};
(function() {
function argmerge(a, b) {
  var result = [];
  for(var i = 0, len = a.length; i < len; i++) result[i] = (b[i] == $_) ? a[i] : b[i];
  return result;
};
Function.implement({
  decorate: function() {
    var decorators = $A(arguments), orig = resultFn = this, decorator;
    while(decorator = decorators.pop()) resultFn = decorator(resultFn);
    resultFn._arglist = $arglist(orig);
    resultFn._decorated = orig;
    return resultFn;
  },

  comp: function() {
    var fns = $A(arguments), self = this;
    return function() {
      var temp = $A(fns);
      var args = $A(arguments), result = (self && $type(self) == 'function') ? self.apply(this, args) : null, fn;
      while(fn = temp.shift()) result = fn.apply(null, (result && [result]) || args);
      return result;
    }
  },
  
  partial: function(bind) {
    var self = this;
    args = $A(arguments).rest();
    return function() {
      return self.apply(bind, args.concat($A(arguments)));
    };
  },
  
  curry: function(bind) {
    var self = this, arglist = $arglist(this), args = $A(arguments).rest();
    return function() {
      var fargs = argmerge(args, $A(arguments));
      if(fargs.length == arglist.length && fargs.every($not($eq($_)))) {
        return self.apply(bind, fargs);
      } else {
        return self.curry(bind, fargs);
      }
    };
  }
});
})();
var $comp = Function.comp;

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

function pre(conditions, error) {
  error = error || false;
  return function preDecorator(fn) {
    return function() {
      var args = $A(arguments);
      var i = 0;
      var passed = conditions.map(function(afn) {
        var result = afn(args[i]);
        i++;
        return result;
      });
      if(passed.indexOf(false) == -1) {
        return fn.apply(this, args);
      } else {
        if($type(error) == 'boolean' && error) {
          var err = new Error("Arguments did not match pre conditions.");
          err.args = args;
          err.conditions = conditions;
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
  first: function() { return this[0]; },
  rest: function(n) { return this.slice(n || 1, this.length); },
  drop: function(n) { return this.slice(0, this.length-n); },
  tail: function(n) { return this.slice(n, this.length); },
  head: function(n) { return this.slice(0, n) },
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
  asFn: function() {
    var self = this;
    return function (idx) {
      return self[idx];
    }
  }
});

Hash.implement({
  asFn: function() {
    var self = this;
    return function(k) {
      return self[k];
    };
  }
})

function $msg(methodName) {
  var rest = $A(arguments).rest();
  return function(obj) {
    var method = obj[methodName];
    if(method && $type(method) == 'function') return method.apply(obj, rest);
  };
}