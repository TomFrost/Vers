/*
 * Vers
 * Copyright (c) 2017 Tom Shawver
 */

'use strict'

/**
 * Vers is an object model upgrade/downgrade utility, enabling an application
 * to only deal with the most recent data schemas while still being able to
 * load outdated versions from data stores or APIs, or give downgraded
 * versions in API responses.
 *
 * Versions are traversed by allowing converters to be defined that translate
 * an object from one version to another, and optionally back again. Define
 * converters that step between each sequential version, skip over unnecessary
 * processing by defining converters that skip over multiple versions, and
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
 */
class Vers {
  /**
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
   *    {@link #addConverter} function.
   * @constructor
   */
  constructor (options) {
    this._opts = options || {}
    this._maxVersion = this._opts.latest || -Infinity
    this._pathCache = {}
    this._converters = {}
    this._getVersion = this._opts.getVersion || function (obj) {
      return obj.hasOwnProperty('version') ? obj.version : 1
    }
  }

  /**
   * Stores a converter that can translate from one version to another, and,
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
  addConverter (fromVer, toVer, forward, back) {
    this._pathCache = {}
    // Store the forward direction
    if (!this._converters[fromVer]) {
      this._converters[fromVer] = {}
    }
    this._converters[fromVer][toVer] = this._wrapConverter(forward)
    // Store the back direction, if specified
    if (back) {
      if (!this._converters[toVer]) {
        this._converters[toVer] = {}
      }
      this._converters[toVer][fromVer] = this._wrapConverter(back)
    }
    if (!this._opts.latest) {
      this._maxVersion = Math.max(this._maxVersion, fromVer, toVer)
    }
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
  fromTo (current, target, obj) {
    return Promise.resolve().then(() => {
      if (current === target) return obj
      const path = this._getPath(current, target)
      let conversionChain = Promise.resolve(obj)
      path.forEach(function (func) {
        conversionChain = conversionChain.then(func)
      })
      return conversionChain
    })
  }

  /**
   * Converts the given object from the provided current version to the latest
   * version.
   * @param {number|string} current The current version of the given object. This
   *    is used in place of version inference.
   * @param {Object} obj The object to be converted.
   * @returns {Promise.<Object>} Resolves to the converted object
   */
  fromToLatest (current, obj) {
    return this.fromTo(current, this._maxVersion, obj)
  }

  /**
   * Converts the given object to the specified target version, using version
   * inference to find the object's current version.
   * @param {number|string} target The target version to which the object should
   *    be converted
   * @param {Object} obj The object to be converted
   * @returns {Promise.<Object>} Resolves to the converted object
   */
  to (target, obj) {
    return Promise.resolve().then(() => {
      return this._getVersion(obj)
    }).then(current => {
      if (!current && current !== 0) {
        throw new Error('Could not determine the current version')
      }
      return this.fromTo(current, target, obj)
    })
  }

  /**
   * Converts the given object to the latest version, using version inference to
   * find the object's current version.
   * @param {Object} obj The object to be converted
   * @return {Promise<Object>} Resolves to the converted object
   */
  toLatest (obj) {
    return this.to(this._maxVersion, obj)
  }

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
   *    been checked for shortest path by this algorithm. This should not be used
   *    in external calls; this is only useful in recursion.
   * @returns {Array<Function>|null} An array of translation functions
   *    (as provided to the {@link #addConverter} call) to be called in reverse
   *    order, or null if no path to the target exists.
   * @private
   */
  _findPath (cur, target, visited) {
    const visits = visited || {}
    if (!this._converters[cur] || visits[cur]) {
      return null
    } else if (this._converters[cur][target]) {
      return [this._converters[cur][target]]
    }
    visits[cur] = true
    const possibilities = Object.keys(this._converters[cur])
    const paths = possibilities.map(test => {
      const pathToEnd = this._findPath(test, target, visits)
      if (pathToEnd) {
        pathToEnd.push(this._converters[cur][test])
      }
      return pathToEnd
    })
    return paths.reduce((e1, e2) => {
      if (!e1) return e2
      else if (!e2) return e1
      return e1.length > e2.length ? e2 : e1
    })
  }

  /**
   * Gets an array of functions that, when called iteratively in order from
   * first to last, will convert an object from the given starting version to
   * the given ending version. This function employs a cache to ensure the full
   * pathfinding algorithm is run as minimally as possible. This cache is only
   * cleared when {@link #addConverter} is called.
   * @param {number|string} start The starting version
   * @param {number|string} end The ending version
   * @returns {Array<Function>} An array of functions as provided to
   *    {@link #addConverter} that define the path from the starting to ending
   *    version.
   * @throws {Error} if no path between the two versions is found.
   * @private
   */
  _getPath (start, end) {
    if (!this._pathCache[start]) {
      this._pathCache[start] = {}
    }
    if (!this._pathCache[start][end]) {
      const path = this._findPath(start, end)
      if (!path) {
        throw new Error('No translation path found to convert ' + start +
          ' to ' + end)
      }
      path.reverse()
      this._pathCache[start][end] = path
    }
    return this._pathCache[start][end]
  }

  /**
   * Wraps a translation function in a way that will return a Promise resolving
   * to either the translation's return value, or the original object if the
   * translation didn't return anything.
   * @param {Function} func The translation function to be wrapped
   * @returns {Function} The wrapped translation function.
   * @private
   */
  _wrapConverter (func) {
    return obj => {
      return Promise.resolve(func(obj)).then(res => {
        return res || obj
      })
    }
  }
}

module.exports = Vers
