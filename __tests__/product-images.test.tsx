import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductImages } from "@/components/admin/product-images";

const actions = {
  upload: async () => ({ error: null }),
  remove: async () => {},
  move: async () => {},
};

const images = [
  { id: "img_1", url: "/uploads/products/p1/one.jpg", alt: "Front of the mug", position: 0 },
  { id: "img_2", url: "/uploads/products/p1/two.jpg", alt: null, position: 1 },
  { id: "img_3", url: "/uploads/products/p1/three.jpg", alt: "Base stamp", position: 2 },
];

describe("ProductImages", () => {
  it("explains what to do when there are no photos", () => {
    render(<ProductImages productId="p1" images={[]} actions={actions} />);

    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
  });

  it("renders every image with its alt text", () => {
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    expect(screen.getByRole("img", { name: "Front of the mug" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Base stamp" })).toBeInTheDocument();
  });

  it("gives an image with no alt text an empty alt, not a missing one", () => {
    // alt="" marks the image decorative; a missing alt makes screen readers
    // read the filename aloud.
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    const imgs = screen.getAllByRole("presentation");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", "/uploads/products/p1/two.jpg");
  });

  it("marks the first image as the main photo", () => {
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    expect(screen.getByText(/main photo/i)).toBeInTheDocument();
  });

  it("cannot move the first image up or the last image down", () => {
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    const ups = screen.getAllByRole("button", { name: /move up/i });
    const downs = screen.getAllByRole("button", { name: /move down/i });

    expect(ups[0]).toBeDisabled();
    expect(ups[2]).toBeEnabled();
    expect(downs[2]).toBeDisabled();
    expect(downs[0]).toBeEnabled();
  });

  it("accepts several image files at once", () => {
    render(<ProductImages productId="p1" images={[]} actions={actions} />);

    const input = screen.getByLabelText(/add photos/i);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });

  it("announces an upload error", () => {
    render(
      <ProductImages
        productId="p1"
        images={[]}
        actions={actions}
        initialUploadState={{ error: "mug.gif is not an image we can use." }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("mug.gif is not an image we can use.");
  });

  it("offers photos to choose in an area that looks like one, not a bare browser control", () => {
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    expect(screen.getByText("Choose photos")).toBeInTheDocument();
    expect(screen.getByText(/or drag them here/i)).toBeInTheDocument();
  });

  it("waits for photos before offering to upload, then says how many", async () => {
    render(<ProductImages productId="p1" images={images} actions={actions} />);
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: /upload/i })).toBeDisabled();

    await user.upload(screen.getByLabelText(/add photos/i), [
      new File(["x"], "front.jpg", { type: "image/jpeg" }),
      new File(["x"], "back.jpg", { type: "image/jpeg" }),
    ]);

    expect(screen.getByRole("button", { name: "Upload 2 photos" })).toBeEnabled();
  });
});

describe("ProductImages, uploading", () => {
  const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const photo = (name: string, bytes = JPEG) => new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });

  /** Each call's files, by name - one list per request. */
  const sent = (upload: jest.Mock) => upload.mock.calls.map(([, form]: [unknown, FormData]) => form.getAll("files").map((file) => (file as File).name));

  async function choose(files: File[], upload: jest.Mock, existing = images) {
    render(<ProductImages productId="p1" images={existing} actions={{ ...actions, upload }} />);
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText(/add photos/i), files);
    return user;
  }

  it("sends each photo as prepared for sending - shrunk, when it is too large for Vercel", async () => {
    const upload = jest.fn(async () => ({ error: null }));
    const prepare = jest.fn(async (file: File) => new File([file], `small-${file.name}`, { type: file.type }));
    render(<ProductImages productId="p1" images={images} actions={{ ...actions, upload }} prepare={prepare} />);
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText(/add photos/i), [photo("front.jpg"), photo("back.jpg")]);

    await user.click(screen.getByRole("button", { name: "Upload 2 photos" }));

    await screen.findByRole("button", { name: "Upload" });
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(sent(upload)).toEqual([["small-front.jpg"], ["small-back.jpg"]]);
  });

  it("prepares nothing when the batch fails its check", async () => {
    const upload = jest.fn(async () => ({ error: null }));
    const prepare = jest.fn(async (file: File) => file);
    render(<ProductImages productId="p1" images={images} actions={{ ...actions, upload }} prepare={prepare} />);
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText(/add photos/i), [photo("front.jpg"), photo("animated.jpg", GIF)]);

    await user.click(screen.getByRole("button", { name: "Upload 2 photos" }));

    await screen.findByRole("alert");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("sends the photos one at a time, each in a request of its own", async () => {
    // One request holding several phone photos broke the server's size limit.
    const upload = jest.fn(async () => ({ error: null }));
    const user = await choose([photo("front.jpg"), photo("side.jpg"), photo("back.jpg")], upload);

    await user.click(screen.getByRole("button", { name: "Upload 3 photos" }));

    await screen.findByRole("button", { name: "Upload" });
    expect(sent(upload)).toEqual([["front.jpg"], ["side.jpg"], ["back.jpg"]]);
    expect(screen.queryByText(/chosen:/)).not.toBeInTheDocument();
  });

  it("checks every photo before sending any, so one bad file adds none", async () => {
    const upload = jest.fn(async () => ({ error: null }));
    const user = await choose([photo("front.jpg"), photo("animated.jpg", GIF)], upload);

    await user.click(screen.getByRole("button", { name: "Upload 2 photos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("animated.jpg is not an image we can use");
    expect(upload).not.toHaveBeenCalled();
  });

  it("will not go past ten photos, before sending anything", async () => {
    const upload = jest.fn(async () => ({ error: null }));
    const nine = Array.from({ length: 9 }, (_, i) => ({ id: `img_${i}`, url: `/u/${i}.jpg`, alt: null, position: i }));
    const user = await choose([photo("a.jpg"), photo("b.jpg")], upload, nine);

    await user.click(screen.getByRole("button", { name: "Upload 2 photos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("up to 10 photos");
    expect(upload).not.toHaveBeenCalled();
  });

  it("says how far it got when the server turns one down", async () => {
    const upload = jest.fn().mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: "Storage is unavailable." });
    const user = await choose([photo("front.jpg"), photo("side.jpg"), photo("back.jpg")], upload);

    await user.click(screen.getByRole("button", { name: "Upload 3 photos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("1 of 3 uploaded. side.jpg: Storage is unavailable.");
    expect(sent(upload)).toEqual([["front.jpg"], ["side.jpg"]]);
  });

  it("shows how far along it is", async () => {
    let finish: (value: { error: null }) => void = () => {};
    const upload = jest.fn(() => new Promise<{ error: null }>((resolve) => (finish = resolve)));
    const user = await choose([photo("front.jpg"), photo("side.jpg")], upload);

    await user.click(screen.getByRole("button", { name: "Upload 2 photos" }));

    expect(await screen.findByRole("button", { name: "Uploading 1 of 2…" })).toBeDisabled();
    await act(async () => finish({ error: null }));
    expect(await screen.findByRole("button", { name: "Uploading 2 of 2…" })).toBeDisabled();
    await act(async () => finish({ error: null }));
  });
});

