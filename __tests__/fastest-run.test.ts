import { QUICK_MS, fastestRun } from "./helpers/fastest-run";

/** A clock on which each run takes the time given, and a call to count the runs. */
function runsTaking(...durations: number[]) {
  let now = 0;
  const left = [...durations];
  const run = jest.fn(() => {
    now += left.shift() ?? 0;
  });
  jest.spyOn(performance, "now").mockImplementation(() => now);
  return run;
}

afterEach(() => jest.restoreAllMocks());

describe("fastestRun", () => {
  it("stops at the first quick run, so a test that passes costs one", () => {
    const run = runsTaking(2, 5000, 5000);

    expect(fastestRun(run)).toBe(2);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("tries again after a slow run, which may only have been a busy machine", () => {
    const run = runsTaking(400, 3);

    expect(fastestRun(run)).toBe(3);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("gives up after three, so what is really slow still fails, by the fastest it managed", () => {
    const run = runsTaking(6000, 5500, 5800, 1);

    const fastest = fastestRun(run);

    expect(fastest).toBe(5500);
    expect(fastest).not.toBeLessThan(QUICK_MS);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("does not count a run of exactly the budget as quick", () => {
    const run = runsTaking(QUICK_MS, 1);

    expect(fastestRun(run)).toBe(1);
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe("QUICK_MS", () => {
  // The old pattern took 5,500ms on 100,000 dots and what is there now under
  // 4ms, loaded: the budget has to stay well clear of both.
  it("sits far from both a backtracking pattern and a busy machine", () => {
    expect(QUICK_MS).toBeGreaterThanOrEqual(40);
    expect(QUICK_MS).toBeLessThanOrEqual(500);
  });
});
