<a href="http://promisesaplus.com/">
    <img src="https://promises-aplus.github.io/promises-spec/assets/logo-small.png"
         align="right" valign="top" alt="Promises/A+ logo" />
</a>
# Vers [![Build Status](https://travis-ci.org/TechnologyAdvice/Vers.svg?branch=master)](https://travis-ci.org/TechnologyAdvice/Vers) [![Code Climate](https://codeclimate.com/github/TechnologyAdvice/Vers/badges/gpa.svg)](https://codeclimate.com/github/TechnologyAdvice/Vers) [![Test Coverage](https://codeclimate.com/github/TechnologyAdvice/Vers/badges/coverage.svg)](https://codeclimate.com/github/TechnologyAdvice/Vers)
Powerful data model versioning for Javascript and Node.js

## Why do I need model versioning?
- Support versioned REST APIs without cluttering your API code with an endpoint
for every individual version
- Only code against the latest version of your data -- no messy if-statements
throughout your codebase to check for earlier versions or properties in
different places
- Roll out new SQL schemas and update your code for the new changes
independently, without coordinating a precise rollout, and with no downtime
- For the love of all things holy _stop trying to update every record in your
noSQL store every time you update your data model._ Every time you pull a new
record from your database, just call `toLatest` on it. Done. If you save it,
it saves as the new version. If you don't, it stays the old version and saves
you the bandwidth/request time. Your code only ever deals with the latest
version and you never scan through and update your entire database ever again.
Doesn't that feel better?

## Quick start
```javascript
var vers = require('vers')();
var user = {
  version: 1,
  firstName: 'Doug',
  lastName: 'Funnie'
};

// Tell Vers how to convert from version 1 to version 2, and back again.
// We could also use "1.0.1" to "2.4.3", 100 to 200, or "cow" to "chicken"
vers.addConverter(1, 2, function(obj) {
  // Version 2 has user initials
  obj.version = 2;
  obj.initials = obj.firstName[0] + obj.lastName[0];
}, function(obj) {
  // Version 1 does not
  obj.version = 1;
  delete obj.initials;
});

// And now to go from version 2 to version 3 and back
vers.addConverter(2, 3, function(obj) {
  // Version 3 combines the names into a single name field 
  obj.version = 3;
  obj.name = obj.firstName + ' ' + obj.lastName;
  delete obj.firstName;
  delete obj.lastName;
}, function(obj) {
  // To go back to version 2, we'd need to split them up again
  obj.version = 2;
  var names = obj.name.split(' ');
  obj.firstName = names[0];
  obj.lastName = names.pop();
  delete obj.name;
});

vers.toLatest(user).then(function(user) {
  // user is now:
  // {
  //   version: 3,
  //   initials: 'DF',
  //   name: 'Doug Funnie'
  // }
  return vers.to(1, user);
}).then(function(user) {
  // user is back to the original version
});
```

## Installation
Vers requires an environment that supports the
[Promise/A+](https://promisesaplus.com/) specification as standardized in ES6.
Node.js version 0.12.0 and up is great right out of the box (no --harmony flag
necessary), as well as the latest versions of many browsers. To support older
browsers, just include a Promise library such as
[Bluebird](https://github.com/petkaantonov/bluebird).

Using callbacks instead of Promises? Promises are first-class in Vers, but you
can convert back to callbacks with Bluebird's [asCallback](https://github.com/petkaantonov/bluebird/blob/master/API.md#ascallbackfunction-callback--object-options---promise)
function. With Promises so integral to Vers' function, callbacks are not baked
in. Give Promises a try!

For Node.js, type this in your project folder:

    npm install vers --save

For the frontend, drop `dist/vers.min.js` into your project, or add it with
bower:

    bower install vers --save

Then include it on your page with:

    <script src="path/to/vers.min.js"></script>

Now the `Vers` constructor is available!

    var vers = new Vers();
    // OR:
    var vers = Vers();

## API

### Vers({Object} [options]) _or_ new Vers({Object} [options])
Constructs a new instance of Vers. Each data model should have one instance to
define all of its versions. The options object is optional. The available
options are:

#### {Function} options.getVersion
A function that accepts your object as its only argument, and returns either
the current version identifier of the object as a number or string, or a
Promise that resolves to the current version identifier. By default, Vers
will use the object's `version` property if it exists, or `1` if it doesn't.

#### {number|string} options.latest
The latest version identifier available for this model. If not specified, Vers
will detect the latest version by calling

### addConverter({number|string} fromVer, {number|string} toVer, {Function} forward, {Function} [back])
Adds a converter to this instance that knows how to change an object from one
version to another, and optionally, how to go back again. If you're using Vers
to power a versioned REST API, then telling it how to go back again is
essential. If your versioning scheme uses numbers, Vers will use `Math.max` to
determine what your latest version is so you don't have to specify that in the
constructor.

Vers is smart: if you need to upgrade from Version 1 to Version 5, it will
upgrade from 1 to 2, then from 2 to 3, and so on up to 5, assuming that you've
added converters for each of those. However, if you add a converter that
shortcuts that in any way to jump over some of those versions, Vers will always
find the shortest path possible to the target -- even if that means upgrading
from 1 to 6, then downgrading to 5. 

Note that the `forward` and `back` functions are called with the object to be
converted as their only argument. These functions can:
- modify the object directly and return nothing
- return a new object
- return a Promise that resolves with the modified or new object

Any method is fine! But keep in mind: modifying the object directly _will_ also
modify the source object. Vers doesn't clone your objects.

### {Promise.\<Object\>} fromTo({number|string} fromVer, {number|string} toVer, {Object} obj)
Converts an object from one version to another, using the provided `fromVer` as
the current version instead of trying to detect it. The result is passed on
in the form of a Promise that resolves with the object in its target version.

### {Promise.\<Object\>} fromToLatest({number|string} fromVer, {Object} obj)
Converts an object from its current version to the latest version available,
using the provided `fromVer` as the current version instead of trying to detect
it. The result is passed on in the form of a Promise that resolves with the
object in its target version.

### {Promise.\<Object\>} to({number|string} toVer, {Object} obj)
Converts an object from its auto-detected current version to the `toVer`
version. The result is passed on in the form of a Promise that resolves with
the object in its target version.

### {Promise.\<Object\>} toLatest({Object} obj)
Converts an object from its auto-detected current version to the latest version
available. The result is passed on in the form of a Promise that resolves with
the object in its target version.

## License
Vers is licensed under the MIT license. Please see `LICENSE.txt` for full
details.

## Credits
Vers was designed and created at
[TechnologyAdvice](http://technologyadvice.com).
