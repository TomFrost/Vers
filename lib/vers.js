/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

function Vers(versionGetter) {
  this._maxVersion = -Infinity;
  this._pathCache = {};
  this._translators = {};
  this._versionGetter = versionGetter || function(obj) {
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
        conversionChain.then(func);
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
    return this._versionGetter(obj);
  }.bind(this)).then(function(current) {
    return this.fromTo(current, target, obj);
  });
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
 *    or a Promise that resolves to the converted object
 * @param {Function} [back] Optionally, a function that, given an object at the
 *    version specified by toVer, will return either an object converted to
 *    fromVer or a Promise that resolves to the converted object
 */
Vers.prototype.translate = function(fromVer, toVer, forward, back) {
  this._pathCache = {};
  // Store the forward direction
  if (!this._translators[fromVer]) {
    this._translators[fromVer] = {};
  }
  this._translators[fromVer][toVer] = forward;
  // Store the back direction, if specified
  if (back) {
    if (!this._translators[toVer]) {
      this._translators[toVer] = {};
    }
    this._translators[toVer][fromVer] = back;
  }
  this._maxVersion = Math.max(this._maxVersion, fromVer, toVer);
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
    // TODO: Evaluate if cloning visits is necessary here
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

module.exports = Vers;
