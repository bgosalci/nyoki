/**
 * @jest-environment jsdom
 */
import { formSnapshot, linkLeavingPage } from "@/lib/forms/leaving";

const HERE = "http://localhost/admin/products/p2/price";

/** A click as the window sees it, on whatever the HTML puts first. */
function clickOn(html: string, init: MouseEventInit = {}) {
  document.body.innerHTML = html;
  const target = document.body.querySelector("[data-click]") ?? document.body.firstElementChild!;
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  Object.defineProperty(event, "target", { value: target });
  return event;
}

describe("linkLeavingPage", () => {
  it("finds the link a click is about to leave the page by", () => {
    const anchor = linkLeavingPage(clickOn('<a href="/admin/products/p3/price">Next</a>'), HERE);
    expect(anchor?.getAttribute("href")).toBe("/admin/products/p3/price");
  });

  it("finds it from anything inside the link, like its arrow", () => {
    const anchor = linkLeavingPage(clickOn('<a href="/admin/products"><span data-click>←</span> Back</a>'), HERE);
    expect(anchor?.getAttribute("href")).toBe("/admin/products");
  });

  it("counts another tab of the same piece as leaving, since the form goes with the page", () => {
    expect(linkLeavingPage(clickOn('<a href="/admin/products/p2">Details</a>'), HERE)).not.toBeNull();
  });

  it("leaves alone a click that opens somewhere else and keeps this page open", () => {
    const link = '<a href="/admin/products/p3">Next</a>';
    expect(linkLeavingPage(clickOn(link, { metaKey: true }), HERE)).toBeNull();
    expect(linkLeavingPage(clickOn(link, { ctrlKey: true }), HERE)).toBeNull();
    expect(linkLeavingPage(clickOn(link, { shiftKey: true }), HERE)).toBeNull();
    expect(linkLeavingPage(clickOn(link, { button: 1 }), HERE)).toBeNull();
    expect(linkLeavingPage(clickOn('<a href="/admin/products/p3" target="_blank">Next</a>'), HERE)).toBeNull();
    expect(linkLeavingPage(clickOn('<a href="/report.csv" download>Report</a>'), HERE)).toBeNull();
  });

  it("leaves another site to the browser's own warning", () => {
    expect(linkLeavingPage(clickOn('<a href="https://www.notonthehighstreet.com/">NOTHS</a>'), HERE)).toBeNull();
  });

  it("ignores a link to where you already are", () => {
    expect(linkLeavingPage(clickOn('<a href="/admin/products/p2/price">Price</a>'), HERE)).toBeNull();
    expect(linkLeavingPage(clickOn('<a href="#costs">Costs</a>'), HERE)).toBeNull();
  });

  it("ignores clicks that are not on a link", () => {
    expect(linkLeavingPage(clickOn("<button>Save</button>"), HERE)).toBeNull();
    expect(linkLeavingPage(clickOn("<a>No address</a>"), HERE)).toBeNull();
  });
});

describe("formSnapshot", () => {
  function form(html: string) {
    document.body.innerHTML = `<form>${html}</form>`;
    return document.querySelector("form")!;
  }

  it("reads the same for a form as it was", () => {
    const f = form('<input name="name" value="Card"><input type="checkbox" name="featured">');
    expect(formSnapshot(f)).toBe(formSnapshot(f));
  });

  it("changes when anything that would be saved changes", () => {
    const f = form('<input name="name" value="Card"><input type="checkbox" name="featured"><select name="status"><option>DRAFT</option><option>ACTIVE</option></select>');
    const before = formSnapshot(f);

    f.querySelector<HTMLInputElement>("[name=featured]")!.checked = true;
    expect(formSnapshot(f)).not.toBe(before);
  });

  it("changes when a row is taken away, though every field left is as it was", () => {
    const f = form('<input name="lineLabel" value="Card"><input name="lineLabel" value="Bag">');
    const before = formSnapshot(f);

    f.querySelectorAll("input")[1].remove();
    expect(formSnapshot(f)).not.toBe(before);
  });

  it("leaves out fields that are only there to work things out", () => {
    const f = form('<input name="price" value="8.50"><input name="margin" value="">');
    const before = formSnapshot(f, ["margin"]);

    f.querySelector<HTMLInputElement>("[name=margin]")!.value = "40";
    expect(formSnapshot(f, ["margin"])).toBe(before);
  });
});
