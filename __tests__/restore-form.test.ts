/**
 * @jest-environment jsdom
 */
import { restoreFormValues } from "@/lib/forms/restore";

function form(html: string) {
  document.body.innerHTML = `<form>${html}</form>`;
  return document.querySelector("form")!;
}

/** What was submitted, then the form reset under it - as React does after an action. */
function submitThenReset(f: HTMLFormElement) {
  const submitted = new FormData(f);
  f.reset();
  return submitted;
}

const input = (f: HTMLFormElement, name: string, i = 0) => f.querySelectorAll<HTMLInputElement>(`[name="${name}"]`)[i];

describe("restoreFormValues", () => {
  it("puts back text, a textarea and a choice from a list", () => {
    const f = form(`
      <input name="name" value="Mug">
      <textarea name="description">Old</textarea>
      <select name="status"><option value="DRAFT" selected>Draft</option><option value="ACTIVE">Active</option></select>`);
    input(f, "name").value = "Mug - Blue";
    f.querySelector("textarea")!.value = "New words";
    f.querySelector("select")!.value = "ACTIVE";

    restoreFormValues(f, submitThenReset(f));

    expect(input(f, "name").value).toBe("Mug - Blue");
    expect(f.querySelector("textarea")!.value).toBe("New words");
    expect(f.querySelector("select")!.value).toBe("ACTIVE");
  });

  it("puts back ticks, both the ones added and the ones taken away", () => {
    const f = form(`
      <input type="checkbox" name="categoryIds" value="cards" checked>
      <input type="checkbox" name="categoryIds" value="clothes">
      <input type="checkbox" name="featured">`);
    input(f, "categoryIds", 0).checked = false;
    input(f, "categoryIds", 1).checked = true;
    input(f, "featured").checked = true;

    restoreFormValues(f, submitThenReset(f));

    expect(input(f, "categoryIds", 0).checked).toBe(false);
    expect(input(f, "categoryIds", 1).checked).toBe(true);
    expect(input(f, "featured").checked).toBe(true);
  });

  it("puts back the chosen one of a set of radio buttons", () => {
    const f = form(`
      <input type="radio" name="type" value="PERCENTAGE" checked>
      <input type="radio" name="type" value="FIXED">`);
    input(f, "type", 1).checked = true;

    restoreFormValues(f, submitThenReset(f));

    expect(input(f, "type", 1).checked).toBe(true);
    expect(input(f, "type", 0).checked).toBe(false);
  });

  it("puts back fields sharing a name in their order - the three promises", () => {
    const f = form(`<input name="promise" value="a"><input name="promise" value="b"><input name="promise" value="c">`);
    input(f, "promise", 0).value = "Made by hand";
    input(f, "promise", 2).value = "Posted in two days";

    restoreFormValues(f, submitThenReset(f));

    expect([0, 1, 2].map((i) => input(f, "promise", i).value)).toEqual(["Made by hand", "b", "Posted in two days"]);
  });

  it("leaves passwords cleared, as a sign-in or password form expects after a failure", () => {
    const f = form(`<input name="email" value=""><input type="password" name="password" value="">`);
    input(f, "email").value = "njomza@nyoki.co.uk";
    input(f, "password").value = "wrong-password";

    restoreFormValues(f, submitThenReset(f));

    expect(input(f, "email").value).toBe("njomza@nyoki.co.uk");
    expect(input(f, "password").value).toBe("");
  });

  it("leaves alone what it cannot or need not set: files, hidden values, fields without a name", () => {
    const f = form(`<input type="file" name="photo"><input type="hidden" name="id" value="p1"><input value="loose">`);
    const loose = f.querySelectorAll("input")[2];
    loose.value = "typed";
    const submitted = new FormData(f);
    f.reset();

    expect(() => restoreFormValues(f, submitted)).not.toThrow();
    expect(input(f, "id").value).toBe("p1");
    expect(loose.value).toBe("loose");
  });
});
