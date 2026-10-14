/**
 * Moves `Date` and `Date.now` to `fixedMs`, still ticking from there, so every capture shows the
 * same week. Self-contained: Playwright also injects it into the booking site by `toString()`.
 */
export function installClock(fixedMs: number): void {
  const RealDate = Date
  const offset = fixedMs - RealDate.now()
  const now = () => RealDate.now() + offset

  function ShowcaseDate(this: unknown, ...args: unknown[]) {
    // Called without `new`, Date returns a string.
    if (!new.target) return new RealDate(now()).toString()
    return Reflect.construct(RealDate, args.length ? args : [now()], new.target)
  }
  ShowcaseDate.prototype = RealDate.prototype
  ShowcaseDate.now = now
  ShowcaseDate.parse = RealDate.parse
  ShowcaseDate.UTC = RealDate.UTC

  globalThis.Date = ShowcaseDate as unknown as DateConstructor
}
