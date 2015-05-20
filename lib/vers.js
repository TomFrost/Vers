/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

function Vers(versionGetter) {
  this._versionGetter = versionGetter;
  this._maxVersion = -Infinity;
  this._translators = {};
}

Vers.prototype._findPath = function(cur, target, upgrading) {
  if (!this._translators[cur] ||
      ((cur > target) && upgrading) ||
      ((cur < target) && !upgrading)) {
    return null;
  } else if (this._translators[cur][target]) {
    return [this._translators[cur][target]];
  }
  var possibilities = Object.keys(this._translators[cur]);
  var paths = possibilities.map(function(test) {
    var funcs = this._findPath(test, target, true);
    if (!funcs)
      return null;
    funcs.push(this._translators[cur][test]);
    return funcs;
  }, this);
  var path = paths.reduce(function(e1, e2) {
    if (!e1)
      return e2;
    if (!e2)
      return e1;
    return e1.length > e2.length ? e2 : e1;
  });
  return path;
};

Vers.prototype.translate = function(fromVer, toVer, fromFunc, toFunc) {
  // Versions can be passed in any order. Determine how to upgrade/downgrade.
  var lowVer = Math.min(fromVer, toVer);
  var highVer = Math.max(fromVer, toVer);
  var upgrader = lowVer === fromVer ? fromFunc : toFunc;
  var downgrader = lowVer === fromVer ? toFunc : fromFunc;

  // Store the max version and index the upgraders/downgraders
  this._maxVersion = Math.max(this._maxVersion, highVer);

  if (!this._translators[lowVer])
    this._translators[lowVer] = {};
  this._translators[lowVer][highVer] = upgrader;

  if (!this._translators[highVer])
    this._translators[highVer] = {};
  this._translators[highVer][lowVer] = downgrader;
};

Vers.prototype.to = function(version, obj) {
  return Promise.resolve({});
};

Vers.prototype.toLatest = function(obj) {
  this.to(this._maxVersion, obj);
};

module.exports = Vers;
