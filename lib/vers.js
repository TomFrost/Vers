/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

function Vers(versionGetter) {
  this._versionGetter = versionGetter;
  this._maxVersion = -Infinity;
  this._translators = {};
}

Vers.prototype._findPath = function(cur, target, visited, prefix) {
  var pre = prefix || '';
  var logKey = pre + '[' + cur + '->' + target + '] ';
  console.log(logKey + 'Starting');
  var visits = visited || {};
  if (!this._translators[cur] || visits[cur]) {
    console.log(logKey + '  - returning null: ' + cur + ' already visited');
    return null;
  } else if (this._translators[cur][target]) {
    console.log(logKey + '  - returning direct path');
    return [this._translators[cur][target]];
  }
  visits[cur] = true;
  console.log(logKey + '  - visit state: ' + Object.keys(visits));
  var possibilities = Object.keys(this._translators[cur]);
  console.log(logKey + '  <START POSSIBILITY CHECK>');
  var paths = possibilities.map(function(test) {
    // TODO: Evaluate if cloning visits is necessary for each of these calls
    var pathToEnd = this._findPath(test, target, visits, pre + '  ');
    if (!pathToEnd) {
      return null;
    }
    pathToEnd.push(this._translators[cur][test]);
    return pathToEnd;
  }, this);
  console.log(logKey + '  <END POSSIBILITY CHECK>');
  console.log(logKey + '  - found ' + paths.length + ' paths (might be null)');
  var res = paths.reduce(function(e1, e2) {
    if (!e1) {
      return e2;
    } else if (!e2) {
      return e1;
    }
    return e1.length > e2.length ? e2 : e1;
  });
  console.log(logKey + '  - reduced paths and found ' + (res || 'null'));
  return res;
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
