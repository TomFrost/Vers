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
