declare module 'vers' {
  type VersionType = number | string;

  export interface VersOptions {
    /**
     * A function that accepts an object as its only argument, and returns either the current version identifier of the object as a number or string, or a Promise that resolves to the current version identifier. By default, Vers will use the object's version property if it exists, or 1 if it doesn't.
     * @param obj
     */
    getVersion?: (obj) => Promise<VersionType> | VersionType;

    /**
     * The latest version identifier available for this model. If not specified, Vers will detect the latest version by calling Math.max on each version specified in addConverter(). For string-based versions, this option should be specified.
     */
    latest?: VersionType;
  }

  declare interface ConvertFunc<T> {
    (obj: T): Promise<T> | T | undefined;
  }

  export class Vers<T> {
    /**
     * The current maximum version available.
     */
    public readonly _maxVersion: VersionType;

    constructor(options?: VersOptions);

    /**
     * Adds a converter to this instance that knows how to change an object from one version to another, and optionally, how to go back again. If you're using Vers to power a versioned REST API, then telling it how to go back again is essential. If your versioning scheme uses numbers, Vers will use Math.max to determine what your latest version is so you don't have to specify that in the constructor.
     * @param fromVer The version to convert from
     * @param toVer The version to convert to
     * @param forward A function that accepts an object to be converted, and moves it from fromVer to toVer.
     * @param back An optional function that accepts an object and moves it from toVer to fromVer.
     */
    addConverter(
      fromVer: VersionType,
      toVer: VersionType,
      forward: ConvertFunc<T>,
      back?: ConvertFunc<T>,
    ): void;

    /**
     * Converts an object from one version to another, using the provided fromVer as the current version instead of trying to detect it. The result is passed on in the form of a Promise that resolves with the object in its target version.
     * @param fromVer The starting version
     * @param toVer The target version
     * @param obj The object to be converted
     */
    fromTo(
      fromVer: VersionType,
      toVer: VersionType,
      obj: T,
    ): Promise<T>;

    /**
     * Converts an object from its current version to the latest version available, using the provided fromVer as the current version instead of trying to detect it. The result is passed on in the form of a Promise that resolves with the object in its target version.
     * @param fromVer The starting version
     * @param obj The object to be converted
     */
    fromToLatest(
      fromVer: VersionType,
      obj: T,
    ): Promise<T>;

    /**
     * Converts an object from its auto-detected current version to the toVer version. The result is passed on in the form of a Promise that resolves with the object in its target version.
     * @param toVer The target version
     * @param obj The object to be converted
     */
    to(
      toVer: VersionType,
      obj: T,
    ): Promise<T>;

    /**
     * Converts an object from its auto-detected current version to the latest version available. The result is passed on in the form of a Promise that resolves with the object in its target version.
     * @param obj
     */
    toLatest(obj: T): Promise<T>;
  }

  export = Vers;
}
