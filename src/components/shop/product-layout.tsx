/**
 * The product page's photos and details.
 *
 * On a phone they stack in reading order: the main photo, then the details -
 * name and description first - then the rest of the photos, so the words come
 * straight after the first picture rather than after every one of them.
 *
 * From md up the photos run down the left and the details sit on the right
 * across both rows, staying in view as the photos scroll past. Any height the
 * details have beyond the photos goes to the last row (auto_1fr): shared
 * between the rows, it opened a gap between the first two photos.
 */
export function ProductLayout({
  mainPhoto,
  morePhotos,
  children,
}: {
  mainPhoto: React.ReactNode;
  morePhotos?: React.ReactNode;
  /** The details: name, price, description and the rest. */
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 grid gap-y-8 md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-10 md:gap-y-3">
      <div className="md:col-start-1 md:row-start-1">{mainPhoto}</div>
      <div className="md:sticky md:top-40 md:col-start-2 md:row-span-2 md:row-start-1 md:self-start">{children}</div>
      {morePhotos ? <div className="md:col-start-1 md:row-start-2">{morePhotos}</div> : null}
    </div>
  );
}
