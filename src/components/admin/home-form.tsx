"use client";

import { useState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { HomeTilesField, type PhotoOption, type UploadPhoto, type UploadResult } from "@/components/admin/home-tiles-field";
import { LinkField, type LinkDraft, type LinkTarget } from "@/components/admin/link-field";
import { SwatchField } from "@/components/admin/swatch-field";
import { UnsavedChanges } from "@/components/admin/unsaved-changes";
import { ui } from "@/lib/brand/ui";
import { bannerGrounds, bannerInks, bannerStyle, inkFor } from "@/lib/home/colours";
import { BAND_MAX, BANNER_MAX, type HomeErrors, type HomePageContent } from "@/lib/home/content";
import { linkChoice } from "@/lib/home/links";
import type { LoadedTile } from "@/lib/home/tiles";
import { useActionForm } from "@/lib/forms/action-form";
import { shrinkPhoto } from "@/lib/images/shrink";

export type { PhotoOption, UploadPhoto, UploadResult };

export interface HomeState {
  errors: HomeErrors;
  saved?: boolean;
}

export type HomeAction = (state: HomeState, formData: FormData) => Promise<HomeState>;

export interface HomeFormContent extends HomePageContent {
  tiles: LoadedTile[];
}

const EMPTY: HomeState = { errors: {} };
const NO_TILE_ERRORS = {};

/**
 * The whole home page, top to bottom as the shop shows it: the badges, the
 * banner, the photo tiles, the band above the pieces and the button beneath.
 */
export function HomeForm({
  content,
  categories,
  photos,
  automatic,
  action,
  upload,
  prepare = shrinkPhoto,
  initialState = EMPTY,
}: {
  content: HomeFormContent;
  categories: LinkTarget[];
  photos: PhotoOption[];
  automatic: Record<string, string>;
  action: HomeAction;
  upload: UploadPhoto;
  prepare?: (file: File) => Promise<File>;
  initialState?: HomeState;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(
    action,
    initialState,
    (result) => Object.keys(result.errors).length > 0,
  );
  const [cta, setCta] = useState<LinkDraft>({
    choice: linkChoice(content.ctaLink),
    address: content.ctaLink.kind === "address" ? content.ctaLink.href : "",
  });
  const [banner, setBanner] = useState({ text: content.bannerText, ground: content.bannerGround, ink: content.bannerInk });

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="mt-8 flex max-w-5xl flex-col gap-10">
      {state.saved ? (
        <p role="status" className={`rounded-md border px-3 py-2 text-sm ${ui.card} ${ui.rule}`}>
          Saved. The shop shows it now.
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Badges</legend>
        <label className="mt-1 flex items-center gap-2 text-sm">
          <input type="checkbox" name="showBadges" defaultChecked={content.showBadges} className={ui.checkbox} />
          Show the badges under the header
        </label>
        <p className={`text-xs ${ui.mutedOnPage}`}>
          The seven round badges, from Small family business to Moments to memories since 2009. Their words are part of
          the artwork, so they are shown or not rather than edited.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium">Banner</legend>

        <Field
          label="Banner"
          name="bannerText"
          error={state.errors.bannerText}
          hint={`The band beneath the badges, in capitals. Up to ${BANNER_MAX} characters; leave it empty to take the band off.`}
        >
          {(props) => (
            <input
              {...props}
              type="text"
              value={banner.text}
              onChange={(event) => setBanner({ ...banner, text: event.target.value })}
              className={inputClass}
            />
          )}
        </Field>

        <SwatchField
          label="Colour of the banner"
          name="bannerGround"
          options={bannerGrounds()}
          value={banner.ground}
          // Words that would not read on the new colour give way to ones that do.
          onChange={(ground) => setBanner({ ...banner, ground, ink: inkFor(ground, banner.ink) })}
          error={state.errors.bannerColour}
        />

        <SwatchField
          label="Colour of the banner's words"
          name="bannerInk"
          options={bannerInks(banner.ground)}
          value={banner.ink}
          onChange={(ink) => setBanner({ ...banner, ink })}
          hint="Only the colours that can be read on the banner's are offered."
        />

        {banner.text.trim() ? (
          <p
            style={bannerStyle(banner.ground, banner.ink)}
            className="rounded-md px-4 py-6 text-center text-lg leading-tight tracking-[0.08em] uppercase"
          >
            {banner.text}
          </p>
        ) : (
          <p className={`text-xs ${ui.mutedOnPage}`}>No words, so no banner on the page.</p>
        )}
      </fieldset>

      <HomeTilesField
        initial={content.tiles}
        categories={categories}
        photos={photos}
        automatic={automatic}
        upload={upload}
        prepare={prepare}
        problem={state.errors.tiles}
        errors={state.errors.tile ?? NO_TILE_ERRORS}
      />

      <Field
        label="Band above the pieces"
        name="bandText"
        error={state.errors.bandText}
        hint={`Up to ${BAND_MAX} characters; leave it empty to take the band off. The pieces beneath are the ones marked featured on the product, or the newest eight.`}
      >
        {(props) => <textarea {...props} rows={2} defaultValue={content.bandText} className={inputClass} />}
      </Field>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium">The button beneath the pieces</legend>
        <input type="hidden" name="ctaLink" value={cta.choice} />
        <input type="hidden" name="ctaAddress" value={cta.choice === "other" ? cta.address : ""} />

        <Field label="Button words" name="ctaLabel" error={state.errors.ctaLabel}>
          {(props) => <input {...props} type="text" defaultValue={content.ctaLabel} required className={inputClass} />}
        </Field>

        <LinkField label="Button leads to" value={cta} onChange={setCta} categories={categories} error={state.errors.ctaLink} />
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className={`self-start rounded-md px-4 py-2.5 text-sm font-medium ${ui.buttonPrimary}`}
      >
        {isPending ? "Saving…" : "Save"}
      </button>

      <UnsavedChanges formRef={formRef} saved={state.saved ? state : null} />
    </form>
  );
}
