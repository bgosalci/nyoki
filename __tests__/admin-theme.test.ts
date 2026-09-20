import {
  THEME_BOOTSTRAP,
  THEME_CHOICES,
  THEME_STORAGE_KEY,
  resolvedTheme,
  themeAttribute,
  themeChoiceFrom,
} from "@/lib/admin/theme";

describe("theme choices", () => {
  it("offers following the system as well as the two themes", () => {
    expect([...THEME_CHOICES]).toEqual(["light", "dark", "system"]);
  });

  it("follows the system when nothing has been chosen", () => {
    expect(themeChoiceFrom(null)).toBe("system");
    expect(themeChoiceFrom("")).toBe("system");
  });

  it("ignores a stored value it does not recognise", () => {
    expect(themeChoiceFrom("neon")).toBe("system");
  });

  it("keeps a choice that was stored", () => {
    expect(themeChoiceFrom("dark")).toBe("dark");
    expect(themeChoiceFrom("light")).toBe("light");
  });
});

describe("resolvedTheme", () => {
  it("asks the browser what it prefers when following the system", () => {
    expect(resolvedTheme("system", true)).toBe("dark");
    expect(resolvedTheme("system", false)).toBe("light");
  });

  it("overrules the browser when a theme was chosen outright", () => {
    expect(resolvedTheme("light", true)).toBe("light");
    expect(resolvedTheme("dark", false)).toBe("dark");
  });
});

describe("themeAttribute", () => {
  it("marks the page with an outright choice", () => {
    expect(themeAttribute("dark")).toBe("dark");
    expect(themeAttribute("light")).toBe("light");
  });

  it("marks the page with nothing at all when following the system", () => {
    // The absence of the attribute is what hands the decision back to the
    // prefers-color-scheme query, which needs no JavaScript to answer.
    expect(themeAttribute("system")).toBeNull();
  });
});

describe("the stored key", () => {
  it("is namespaced to this app, since a browser shares storage per origin", () => {
    expect(THEME_STORAGE_KEY).toMatch(/^nyoki-/);
  });
});

describe("THEME_BOOTSTRAP", () => {
  // The script that runs inline, before React, so a chosen theme is already
  // on the page at first paint rather than snapping into place after it.
  const run = () => new Function(THEME_BOOTSTRAP)();

  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("marks the page with a stored choice", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    run();

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("leaves the page unmarked when the choice is to follow the machine", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    run();

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("leaves the page unmarked when nothing was ever chosen", () => {
    run();

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("ignores a stored value it does not recognise", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "neon");
    run();

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("survives a browser that refuses to hand over storage at all", () => {
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(run).not.toThrow();
    getItem.mockRestore();
  });
});
