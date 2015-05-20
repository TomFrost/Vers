/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

function Vers(versionGetter) {
  this._versionGetter = versionGetter;
  this._maxVersion = -Infinity;
  this._translators = {};
}

Vers.prototype._findPath = function(cur, target) {
  if (!this._translators[cur]) {
    return null;
  } else if (this._translators[cur][target]) {
    return [this._translators[cur][target]];
  }
  var possibilities = Object.keys(this._translators[cur]);
  var paths = possibilities.map(function(test) {
    // Return null to avoid infinite recursive loops
    if (cur < target && test < cur || cur > target && test > cur)
      return null;
    var funcs = this._findPath(test, target);
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

Vers.prototype.translate = function(fromVer, toVer, fromFunc, toFunc) {
  // To make upgrading/downloading bi-directional set BOTH options so that bi-directional key/value pairs exist
  // Create first level of object before trying to set 1st/2nd level together
  if (!this._translators[fromVer]) {
    this._translators[fromVer] = {};
  }
  this._translators[fromVer][toVer] = fromFunc;
  // Create first level of object before trying to set 1st/2nd level together
  if (!this._translators[toVer]) {
    this._translators[toVer] = {};
  }
  this._translators[toVer][fromVer] = toFunc;
  // Store the max version
  this._maxVersion = Math.max(this._maxVersion, fromVer, toVer);
};

Vers.prototype.to = function(version, obj) {
  return Promise.resolve({});
};

Vers.prototype.toLatest = function(obj) {
  this.to(this._maxVersion, obj);
};

module.exports = Vers;
