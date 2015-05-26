/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

function Vers(versionGetter) {
  this._versionGetter = versionGetter;
  this._maxVersion = -Infinity;
  this._translators = {};
  this._translatorsVisited = {};
}

Vers.prototype._findPath = function(cur, target, prevCur) {
  if (!this._translators[cur]) {
    return null;
  } else if (this._translators[cur][target]) {
    return [this._translators[cur][target]];
  }
  // Check if prevCur exists to see if we are in a resursive loop. Further check to see if this path has been visited. If not, update visited path.
  if (prevCur && !this._translatorsVisited[prevCur]) {
    this._translatorsVisited[prevCur] = {};
    this._translatorsVisited[prevCur][cur] = this._translators[prevCur][cur];
  }
  else if (prevCur && !this._translatorsVisited[prevCur][cur]) {
    this._translatorsVisited[prevCur][cur] = this._translators[prevCur][cur];
  }
  // Path has been visited already, so return null to avoid infinite looping
  else if(prevCur)
  {
    return null;
  }
  var possibilities = Object.keys(this._translators[cur]);
  var paths = possibilities.map(function(test) {
    // Recursively attempt to find full path to target
    var funcs = this._findPath(test, target, cur);
    if (!funcs)
      return null;
    funcs.push(this._translators[cur][test]);
    return funcs;
  }, this);
  var path = paths.reduce(function(e1, e2) {
    if (!e1) {
      return e2;
    } else if (!e2) {
      return e1;
    }
    return e1.length > e2.length ? e2 : e1;
  });
  return path;
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

Vers.prototype.to = function(version, obj) {
  return Promise.resolve({});
};

/**
 * Converts the given object to the latest version.
 * @param {Object} obj The object to be converted
 * @return {Promise<Object>} Resolves to the converted object
 */
Vers.prototype.toLatest = function(obj) {
  return this.to(this._maxVersion, obj);
};

module.exports = Vers;
