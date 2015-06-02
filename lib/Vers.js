/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

/**
 * Vers is an object model upgrade/downgrade utility, enabling an application
 * to only deal with the most recent data schemas while still being able to
 * load outdated versions from data stores or APIs, or give downgraded
 * versions in API responses.
 *
 * Versions are traversed by allowing translators to be defined that convert
 * an object from one version to another, and optionally back again. Define
 * translators that step between each sequential version, skip over unnecessary
 * processing by defining translators that skip over multiple versions, and
 * Vers will calculate the shortest path to get from one version to the next--
 * even if it discovers a shortcut to upgrade to a higher version and downgrade
 * from there.
 *
 * Any/all versioning schemes are supported. Use numeric integer values, the
 * semvers standard, or name your versions 'catfish', 'artichoke', and 'fred'.
 * Vers will figure it out.
 *
 * For convenience, Vers can also infer the version of the object passed in
 * to prevent needing to inform it of the version the object is currently at
 * each time Vers is called.
 *
 * One Vers instance should be created per data type to be versioned. It can
 * be instantiated using the `new` keyword, or by simply calling `Vers()` as a
 * function.
 * @param {Object} [options] An optional options object map
 * @param {Function} [options.getVersion] A function that, when called with
 *    an object that's been provided to the {@link #to} or {@link #toLatest}
 *    methods, will return either the object's current version, or a Promise
 *    that resolves to the object's version. If not specified, Vers will look
 *    at the object's `version` property, or use '1' if that's not found.
 * @param {number|string} [options.latest] The latest version to be used when
 *    the {@link #toLatest} or {@link #fromToLatest} functions are called.
 *    If not specified, Vers will attempt to discover the latest version by
 *    calling `Math.max()` on each of the versions submitted to the
 *    {@link #translate} function.
 * @constructor
 */
function Vers(options) {
  if (!(this instanceof Vers)) {
    return new Vers(options);
  }
  this._opts = options || {};
  this._maxVersion = this._opts.latest || -Infinity;
  this._pathCache = {};
  this._translators = {};
  this._getVersion = this._opts.getVersion || function(obj) {
      return obj.version || 1;
    };
}

/**
 * Converts an object from the given starting version to the given target
 * version.
 * @param {number|string} current The current version of the object
 * @param {number|string} target The target version to which the object
 *    should be converted
 * @param {Object} obj The object to be converted
 * @returns {Promise.<Object>} Resolves with the converted object.
 */
Vers.prototype.fromTo = function(current, target, obj) {
  return new Promise(function(resolve) {
    if (current === target) {
      resolve(obj);
    } else {
      var path = this._getPath(current, target);
      var conversionChain = Promise.resolve(obj);
      path.forEach(function(func) {
        conversionChain = conversionChain.then(func);
      });
      resolve(conversionChain);
    }
  }.bind(this));
};

/**
 * Converts the given object from the provided current version to the latest
 * version.
 * @param {number|string} current The current version of the given object. This
 *    is used in place of version inference.
 * @param {Object} obj The object to be converted.
 * @returns {Promise.<Object>} Resolves to the converted object
 */
Vers.prototype.fromToLatest = function(current, obj) {
  return this.fromTo(current, this._maxVersion, obj);
};

/**
 * Converts the given object to the specified target version, using version
 * inference to find the object's current version.
 * @param {number|string} target The target version to which the object should
 *    be converted
 * @param {Object} obj The object to be converted
 * @returns {Promise.<Object>} Resolves to the converted object
 */
Vers.prototype.to = function(target, obj) {
  return Promise.resolve().then(function() {
    return this._getVersion(obj);
  }.bind(this)).then(function(current) {
    if (!current && current !== 0) {
      throw new Error('Could not determine the current version');
    }
    return this.fromTo(current, target, obj);
  }.bind(this));
};

/**
 * Converts the given object to the latest version, using version inference to
 * find the object's current version.
 * @param {Object} obj The object to be converted
 * @return {Promise<Object>} Resolves to the converted object
 */
Vers.prototype.toLatest = function(obj) {
  return this.to(this._maxVersion, obj);
};

/**
 * Stores a translator that can convert from one version to another, and,
 * optionally, the reverse direction as well.
 * @param {string|number} fromVer The starting version
 * @param {string|number} toVer The ending version
 * @param {Function} forward A function that, given an object at the version
 *    specified by fromVer, will return either an object converted to toVer
 *    or a Promise that resolves to the converted object. The function can
 *    also modify the object directly and not return anything, and the object
 *    will be passed on implicitly.
 * @param {Function} [back] Optionally, a function that converts between the
 *    two versions in the opposite direction. It works the same way as the
 *    'forward' function.
 */
Vers.prototype.translate = function(fromVer, toVer, forward, back) {
  this._pathCache = {};
  // Store the forward direction
  if (!this._translators[fromVer]) {
    this._translators[fromVer] = {};
  }
  this._translators[fromVer][toVer] = this._wrapTranslation(forward);
  // Store the back direction, if specified
  if (back) {
    if (!this._translators[toVer]) {
      this._translators[toVer] = {};
    }
    this._translators[toVer][fromVer] = this._wrapTranslation(back);
  }
  if (!this._opts.latest) {
    this._maxVersion = Math.max(this._maxVersion, fromVer, toVer);
  }
};

/**
 * Finds the shortest path from one version to another, in the form of an array
 * of functions that, when executed on an object sequentially, will transform
 * it into the target version.
 *
 * Note that, for algorithm performance and to reduce space complexity,
 * functions are returned in reverse order. They should be executed by popping
 * the functions from the array sequentially or looping through from last to
 * first, rather than first to last.
 * @param {number|string} cur The starting version
 * @param {number|string} target The target version
 * @param {{}} [visited] An object mapping showing which versions have already
 *    been checked for shortest path by this algorithm. This should used
 *    in external calls; this is only useful in recursion.
 * @returns {Array<Function>|null} An array of translation functions
 *    (as provided to the {@link #translate} call) to be called in reverse
 *    order, or null if no path to the target exists.
 * @private
 */
Vers.prototype._findPath = function(cur, target, visited) {
  var visits = visited || {};
  if (!this._translators[cur] || visits[cur]) {
    return null;
  } else if (this._translators[cur][target]) {
    return [this._translators[cur][target]];
  }
  visits[cur] = true;
  var possibilities = Object.keys(this._translators[cur]);
  var paths = possibilities.map(function(test) {
    var pathToEnd = this._findPath(test, target, visits);
    if (!pathToEnd) {
      return null;
    }
    pathToEnd.push(this._translators[cur][test]);
    return pathToEnd;
  }, this);
  return paths.reduce(function(e1, e2) {
    if (!e1) {
      return e2;
    } else if (!e2) {
      return e1;
    }
    return e1.length > e2.length ? e2 : e1;
  });
};

/**
 * Gets an array of functions that, when called iteratively in order from
 * first to last, will convert an object from the given starting version to
 * the given ending version. This function employs a cache to ensure the full
 * pathfinding algorithm is run as minimally as possible. This cache is only
 * cleared when {@link #translate} is called.
 * @param {number|string} start The starting version
 * @param {number|string} end The ending version
 * @returns {Array<Function>} An array of functions as provided to
 *    {@link #translate} that define the path from the starting to ending
 *    version.
 * @throws {Error} if no path between the two versions is found.
 * @private
 */
Vers.prototype._getPath = function(start, end) {
  if (!this._pathCache[start]) {
    this._pathCache[start] = {};
  }
  if (!this._pathCache[start][end]) {
    var path = this._findPath(start, end);
    if (!path) {
      throw new Error('No translation path found to convert ' + start +
        ' to ' + end);
    }
    path.reverse();
    this._pathCache[start][end] = path;
  }
  return this._pathCache[start][end];
};

/**
 * Wraps a translation function in a way that will return a Promise resolving
 * to either the translation's return value, or the original object if the
 * translation didn't return anything.
 * @param {Function} func The translation function to be wrapped
 * @returns {Function} The wrapped translation function.
 * @private
 */
Vers.prototype._wrapTranslation = function(func) {
  return function(obj) {
    return Promise.resolve(func(obj)).then(function(res) {
      return res || obj;
    });
  };
};

// Support frontend or CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Vers;
}
