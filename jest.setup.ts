import "@testing-library/jest-dom";

// jsdom 26 has no Blob.arrayBuffer(), which every browser the admin runs in
// has had since 2019-20. The photo upload reads a file's first bytes with it
// to check what the file really is. Filled in from jsdom's own FileReader, so
// the bytes are real; only where jsdom lacks it.
if (typeof Blob !== "undefined" && typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}
