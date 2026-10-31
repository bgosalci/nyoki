/**
 * A piece as the admin's choose-by-photo fields show it: its name and first
 * photo. The home page's main photo was chosen through a picker built on
 * this; the photo tiles that replaced it choose from every photo instead.
 */
export interface PickerProduct {
  id: string;
  name: string;
  image: { url: string; alt: string | null } | null;
}
