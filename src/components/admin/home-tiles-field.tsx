"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { LinkField, type LinkDraft, type LinkTarget } from "@/components/admin/link-field";
import { PhotoField } from "@/components/admin/photo-field";
import type { ChooserItem } from "@/components/admin/photo-chooser";
import { ui } from "@/lib/brand/ui";
import { firstTileWithProblem, type TileErrors } from "@/lib/home/content";
import { linkChoice } from "@/lib/home/links";
import { blocksOf, MAX_BLOCKS, photoChoice, TILE_LABEL_MAX, TILES_PER_BLOCK, type LoadedTile } from "@/lib/home/tiles";
import { validateImageUpload } from "@/lib/images/validate";

/** A photo the tiles can use: one of the shop's, or one uploaded for the page. */
export interface PhotoOption {
  /** As posted: "image:<id>" or "upload:<id>". */
  choice: string;
  title: string;
  details: string[];
  url: string;
  searchText: string;
}

export type UploadResult = { ok: true; photo: { id: string; url: string } } | { ok: false; error: string };
export type UploadPhoto = (formData: FormData) => Promise<UploadResult>;

interface TileDraft {
  key: string;
  label: string;
  link: LinkDraft;
  /** As posted: "" for automatic, else a PhotoOption's choice. */
  photo: string;
}

const SNIFF_BYTES = 16;

function draftOf(tile: LoadedTile, key: string): TileDraft {
  return {
    key,
    label: tile.label,
    link: { choice: linkChoice(tile.link), address: tile.link.kind === "address" ? tile.link.href : "" },
    photo: photoChoice(tile.photo),
  };
}

function tileName(index: number): string {
  const place = index % TILES_PER_BLOCK;
  const block = Math.floor(index / TILES_PER_BLOCK) + 1;
  return `${place === 0 ? "the large tile" : `small tile ${place}`} in block ${block}`;
}

/** The order a block is laid out in, row by row: the large tile on the right of every other block. */
function laidOut(start: number, count: number, blockIndex: number): number[] {
  const indexes = Array.from({ length: count }, (_, offset) => start + offset);
  if (blockIndex % 2 === 0 || count < 3) return indexes;
  const [large, ...small] = indexes;
  return [small[0], small[1], large, ...small.slice(2)];
}

/**
 * The home page's photo tiles: a picture of the mosaic as the shop lays it
 * out, each tile a button that opens it below - its words, where it leads,
 * its photo. Tiles come and go five at a time, which is what a block is.
 *
 * Every tile posts its fields as hidden inputs, in order, so the tile being
 * edited is the only one on screen while all of them are saved.
 */
export function HomeTilesField({
  initial,
  categories,
  photos,
  automatic,
  upload,
  prepare,
  problem,
  errors,
}: {
  initial: readonly LoadedTile[];
  categories: readonly LinkTarget[];
  photos: readonly PhotoOption[];
  /** The photo a category's tile takes when none is chosen, by category id. */
  automatic: Readonly<Record<string, string>>;
  upload: UploadPhoto;
  /** Shrinks a large photo before it is sent; see shrinkPhoto. */
  prepare: (file: File) => Promise<File>;
  problem?: string;
  errors: Readonly<Record<number, TileErrors>>;
}) {
  const [tiles, setTiles] = useState<TileDraft[]>(() => initial.map((tile, index) => draftOf(tile, `t${index}`)));
  const [selected, setSelected] = useState(() => firstTileWithProblem({ tile: errors }) ?? 0);
  const [uploads, setUploads] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<{ key: string; message: string } | null>(null);
  const nextKey = useRef(0);

  // A rejected save opens the first tile it found a problem with.
  const [seenErrors, setSeenErrors] = useState(errors);
  if (errors !== seenErrors) {
    setSeenErrors(errors);
    const first = firstTileWithProblem({ tile: errors });
    if (first !== null) setSelected(first);
  }

  const paths = useMemo(() => new Map(categories.map((category) => [category.id, category.path])), [categories]);

  const items: ChooserItem[] = useMemo(
    () => [
      ...uploads.map((photo) => ({
        id: `upload:${photo.id}`,
        title: "Uploaded photo",
        details: [],
        imageUrl: photo.url,
        searchText: "uploaded",
      })),
      ...photos.map((photo) => ({
        id: photo.choice,
        title: photo.title,
        details: photo.details,
        imageUrl: photo.url,
        searchText: photo.searchText,
      })),
    ],
    [photos, uploads],
  );

  const urls = useMemo(() => {
    const known = new Map<string, string>();
    for (const tile of initial) if (tile.photo && tile.photoUrl) known.set(photoChoice(tile.photo), tile.photoUrl);
    for (const item of items) if (item.imageUrl) known.set(item.id, item.imageUrl);
    return known;
  }, [initial, items]);

  function categoryOf(tile: TileDraft): string | null {
    return tile.link.choice.startsWith("category:") ? tile.link.choice.slice("category:".length) : null;
  }

  function photoUrlOf(tile: TileDraft): string | null {
    if (tile.photo) return urls.get(tile.photo) ?? null;
    const category = categoryOf(tile);
    return category ? (automatic[category] ?? null) : null;
  }

  function update(index: number, change: Partial<TileDraft>) {
    setTiles((current) => current.map((tile, at) => (at === index ? { ...tile, ...change } : tile)));
  }

  function addBlock() {
    const added = Array.from({ length: TILES_PER_BLOCK }, () => ({
      key: `n${nextKey.current++}`,
      label: "",
      link: { choice: "", address: "" },
      photo: "",
    }));
    setSelected(tiles.length);
    setTiles((current) => [...current, ...added]);
  }

  function removeBlock(blockIndex: number) {
    const start = blockIndex * TILES_PER_BLOCK;
    setTiles((current) => current.filter((_, index) => index < start || index >= start + TILES_PER_BLOCK));
    setSelected((current) => (current >= start ? Math.max(0, start - TILES_PER_BLOCK) : current));
  }

  async function uploadFor(index: number, file: File) {
    const key = tiles[index].key;
    setUploadError(null);

    const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
    const check = validateImageUpload({ name: file.name, type: file.type, size: file.size, head, existingCount: 0 });
    if (!check.ok) {
      setUploadError({ key, message: check.error });
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.set("photo", await prepare(file));
      const result = await upload(data);
      if (result.ok) {
        setUploads((current) => [...current, result.photo]);
        setTiles((current) => current.map((tile) => (tile.key === key ? { ...tile, photo: `upload:${result.photo.id}` } : tile)));
      } else {
        setUploadError({ key, message: result.error });
      }
    } catch {
      setUploadError({ key, message: "The photo could not be uploaded. Try again." });
    } finally {
      setUploading(false);
    }
  }

  const open = tiles[selected] ?? tiles[0];
  const openIndex = tiles[selected] ? selected : 0;
  const openErrors = errors[openIndex] ?? {};
  const openCategory = open ? categoryOf(open) : null;
  const blocks = blocksOf(tiles);

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-medium">Photo tiles</legend>
      <p className={`-mt-2 text-xs ${ui.mutedOnPage}`}>
        As the shop lays them out. Choose a tile to change its words, where it leads and its photo.
      </p>

      {tiles.map((tile) => (
        <div key={tile.key} hidden>
          <input type="hidden" name="tileLabel" value={tile.label} />
          <input type="hidden" name="tileLink" value={tile.link.choice} />
          <input type="hidden" name="tileAddress" value={tile.link.choice === "other" ? tile.link.address : ""} />
          <input type="hidden" name="tilePhoto" value={tile.photo} />
        </div>
      ))}

      {problem ? <p className="text-sm text-red-600 dark:text-red-400">{problem}</p> : null}

      {/* The tile being edited stays beside the picture on a wide screen,
          rather than a long scroll beneath it. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          {blocks.map((block, blockIndex) => {
            const start = blockIndex * TILES_PER_BLOCK;
            return (
              <div key={block[0].key} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`text-xs ${ui.mutedOnPage}`}>
                    Block {blockIndex + 1} · large tile on the {blockIndex % 2 === 0 ? "left" : "right"}
                  </p>
                  {blocks.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeBlock(blockIndex)}
                      className={`text-xs underline underline-offset-4 ${ui.mutedOnPage}`}
                    >
                      Remove block {blockIndex + 1}
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {laidOut(start, block.length, blockIndex).map((index) => {
                    const tile = tiles[index];
                    const url = photoUrlOf(tile);
                    const large = index % TILES_PER_BLOCK === 0;
                    const flagged = errors[index] !== undefined;
                    return (
                      <button
                        key={tile.key}
                        type="button"
                        aria-pressed={index === openIndex}
                        onClick={() => setSelected(index)}
                        className={`relative aspect-square overflow-hidden rounded-md text-left ${large ? "col-span-2 row-span-2" : ""} ${ui.shopTilePlain} ${index === openIndex ? ui.tileChosen : ""} ${flagged ? "outline-2 outline-red-500" : ""}`}
                      >
                        {url ? (
                          <>
                            <Image src={url} alt="" fill sizes="(min-width: 768px) 20rem, 45vw" className="object-cover" />
                            <span className={`absolute inset-0 ${ui.shopTileFade}`} aria-hidden="true" />
                          </>
                        ) : null}
                        <span
                          className={`absolute bottom-2 left-0 max-w-[calc(100%-0.5rem)] border-b pr-2 pb-1 pl-3 leading-tight font-medium tracking-[0.12em] uppercase ${
                            url ? ui.shopTileLabel : ""
                          } ${large ? "text-sm sm:text-base" : "text-[0.625rem] sm:text-xs"}`}
                        >
                          {tile.label || "New tile"}
                        </span>
                        {flagged ? <span className="sr-only"> (needs a look)</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {tiles.length < MAX_BLOCKS * TILES_PER_BLOCK ? (
            <button type="button" onClick={addBlock} className={`self-start rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}>
              Add five more tiles
            </button>
          ) : null}
        </div>

        {open ? (
          <div
            key={open.key}
            role="group"
            aria-label={`Editing ${tileName(openIndex)}`}
            className={`flex flex-col gap-4 rounded-md border p-4 lg:sticky lg:top-20 ${ui.rule}`}
          >
            <p className="text-sm font-medium first-letter:uppercase">{tileName(openIndex)}</p>

            <Field label="Words on the tile" name="tileWords" error={openErrors.label} hint={`Up to ${TILE_LABEL_MAX} characters.`}>
              {(props) => (
                <input
                  {...props}
                  name={undefined}
                  type="text"
                  value={open.label}
                  onChange={(event) => update(openIndex, { label: event.target.value })}
                  className={inputClass}
                />
              )}
            </Field>

            <LinkField
              label="Leads to"
              value={open.link}
              onChange={(link) => update(openIndex, { link })}
              categories={categories}
              error={openErrors.link}
            />

            <PhotoField
              label="Photo"
              items={items}
              value={open.photo || null}
              onChange={(choice) => update(openIndex, { photo: choice ?? "" })}
              emptyLabel={
                openCategory
                  ? `Automatic: the first piece's photo in ${paths.get(openCategory) ?? "that category"}`
                  : "No photo yet"
              }
              missingLabel="A photo no longer there"
              chooserTitle="Choose a photo for the tile"
              error={openErrors.photo ?? (uploadError?.key === open.key ? uploadError.message : undefined)}
              extra={
                <label
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-sm focus-within:outline-2 ${ui.buttonSecondary} ${
                    uploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {uploading ? "Uploading…" : "Upload a photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void uploadFor(openIndex, file);
                    }}
                  />
                </label>
              }
            />
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
