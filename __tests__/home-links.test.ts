import { addressProblem, hrefFor, linkChoice, linkFromRow, linkToRow, readLink, SHOP_PAGES } from "@/lib/home/links";

describe("addressProblem", () => {
  it.each(["/shop", "/shop/christmas-cards", "/product/let-it-snow", "/contact#ask", "/shop?q=bookmark"])(
    "takes %s, a page on the shop",
    (address) => {
      expect(addressProblem(address)).toBeNull();
    },
  );

  it("takes another website, over https", () => {
    expect(addressProblem("https://www.notonthehighstreet.com/nyokihandmade")).toBeNull();
  });

  it("asks for an address when there is none", () => {
    expect(addressProblem("")).toMatch(/address/i);
  });

  it("refuses an address that does not say where it is, rather than guess", () => {
    expect(addressProblem("shop/cards")).toMatch(/start it with \//i);
  });

  it.each(["//evil.example", "/\\evil.example"])("refuses %s, which a browser reads as another website", (address) => {
    expect(addressProblem(address)).not.toBeNull();
  });

  it.each(["javascript:alert(1)", "http://example.com", "mailto:hello@nyoki.co.uk", "data:text/html,hi"])(
    "refuses %s: only pages and https websites can be linked",
    (address) => {
      expect(addressProblem(address)).not.toBeNull();
    },
  );

  it("refuses spaces, which no address holds", () => {
    expect(addressProblem("/shop/christmas cards")).not.toBeNull();
  });
});

describe("readLink", () => {
  it("reads a category", () => {
    expect(readLink("category:c1", "")).toEqual({ ok: true, link: { kind: "category", categoryId: "c1" } });
  });

  it("reads a page offered by name", () => {
    expect(readLink("page:/about", "")).toEqual({ ok: true, link: { kind: "address", href: "/about" } });
  });

  it("refuses a page that is not one of those offered", () => {
    expect(readLink("page:/admin", "").ok).toBe(false);
  });

  it("reads an address typed in, trimmed", () => {
    expect(readLink("other", "  /product/let-it-snow ")).toEqual({
      ok: true,
      link: { kind: "address", href: "/product/let-it-snow" },
    });
  });

  it("says what is wrong with an address typed in", () => {
    const result = readLink("other", "javascript:alert(1)");

    expect(result.ok === false && result.error).toBeTruthy();
  });

  it("asks for a choice when there is none", () => {
    const result = readLink("", "");

    expect(result.ok === false && result.error).toMatch(/where it leads/i);
  });
});

describe("linkChoice", () => {
  it("chooses the category for a category", () => {
    expect(linkChoice({ kind: "category", categoryId: "c1" })).toBe("category:c1");
  });

  it("chooses a page by name when the address is one of them", () => {
    expect(linkChoice({ kind: "address", href: "/shop" })).toBe("page:/shop");
  });

  it("chooses somewhere else for any other address", () => {
    expect(linkChoice({ kind: "address", href: "/product/let-it-snow" })).toBe("other");
  });

  it("goes back and forth with readLink", () => {
    for (const page of SHOP_PAGES) {
      const link = { kind: "address" as const, href: page.href };
      expect(readLink(linkChoice(link), "")).toEqual({ ok: true, link });
    }
  });
});

describe("storing a link", () => {
  it("keeps a category by its id, so renaming its address cannot break the link", () => {
    expect(linkToRow({ kind: "category", categoryId: "c1" })).toEqual({ categoryId: "c1", href: null });
    expect(linkFromRow({ categoryId: "c1", href: null })).toEqual({ kind: "category", categoryId: "c1" });
  });

  it("keeps an address as it was typed", () => {
    expect(linkToRow({ kind: "address", href: "/contact" })).toEqual({ categoryId: null, href: "/contact" });
    expect(linkFromRow({ categoryId: null, href: "/contact" })).toEqual({ kind: "address", href: "/contact" });
  });

  it("leads to the whole shop once the category it led to has been deleted", () => {
    // The category is SetNull on delete, which leaves neither half.
    expect(linkFromRow({ categoryId: null, href: null })).toEqual({ kind: "address", href: "/shop" });
  });
});

describe("hrefFor", () => {
  const slugs = new Map([["c1", "christmas-cards"]]);

  it("leads to a category's page by its address as it stands now", () => {
    expect(hrefFor({ kind: "category", categoryId: "c1" }, slugs)).toBe("/shop/christmas-cards");
  });

  it("leads to the whole shop when the category is not there to lead to", () => {
    expect(hrefFor({ kind: "category", categoryId: "gone" }, slugs)).toBe("/shop");
  });

  it("leads to an address as it was typed", () => {
    expect(hrefFor({ kind: "address", href: "https://example.com/x" }, slugs)).toBe("https://example.com/x");
  });
});
