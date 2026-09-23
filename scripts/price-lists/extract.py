"""
Read Njomza's Numbers price lists into plain JSON for `pnpm prices:import`.

    python3 -m venv .venv-prices && .venv-prices/bin/pip install -r scripts/price-lists/requirements.txt
    .venv-prices/bin/python scripts/price-lists/extract.py \
        --out /tmp/price-lists --catalogue public/uploads/products \
        "CARDS - Price List_2023 .numbers" "ACCESSORIES - Price List_2023.numbers" \
        "CLOTHES - Price List_2023.numbers"

Writes <out>/price-lists.json and the photos to <out>/photos/.

Two layouts, told apart by their header. Cards and accessories: a label row
(the photo in A, material names in C..H) above a cost row (pack size in B,
costs in C..J, price inc VAT in N), with the VAT rate in T2. Clothes: one row
per piece - yarn kind, price and skeins, then trims, P&P and making, price inc
VAT in M - with the VAT rate in S2.

Every piece is identified by its photograph alone, so each photo is saved and
perceptually hashed, and so is every photo in the catalogue, for the importer
to match the two.
"""
import argparse
import io
import json
import os
import warnings

warnings.filterwarnings("ignore")  # numbers-parser warns about untested Numbers versions

import imagehash
from numbers_parser import Document
from PIL import Image

# Sheets that are copies of another; importing them twice would offer every
# row twice.
DUPLICATE_SHEETS = {"Brooches-1"}


def num(value):
    return float(value) if isinstance(value, (int, float)) else 0.0


def text(value):
    return value.strip() if isinstance(value, str) else ""


def photo(table, row):
    return getattr(table.cell(row, 0).style, "bg_image", None)


def card_layout(file, sheet, table):
    header = [text(table.cell(0, c).value).replace("\n", " ") for c in range(table.num_cols)]
    vat = num(table.cell(1, 19).value)  # T2
    for r in range(2, table.num_rows):
        qty = table.cell(r, 1).value
        if not isinstance(qty, (int, float)) or not qty:
            continue
        labels = r - 1
        lines = []
        for c in range(2, 10):  # C..J
            amount = num(table.cell(r, c).value)
            if amount > 0:
                lines.append({"label": text(table.cell(labels, c).value) or header[c], "amount": amount, "quantity": 1})
        yield dict(file=file, sheet=sheet, row=r, vat=vat, qty=qty, lines=lines,
                   price=num(table.cell(r, 13).value),
                   note=text(table.cell(labels, 0).value) or text(table.cell(r, 0).value),
                   image=photo(table, labels) or photo(table, r))


def clothes_layout(file, sheet, table):
    vat = num(table.cell(1, 18).value)  # S2
    for r in range(2, table.num_rows):
        price = num(table.cell(r, 12).value)
        yarn_price = num(table.cell(r, 2).value)
        if price <= 0 and yarn_price <= 0:
            continue
        lines = []
        yarn = text(table.cell(r, 1).value)
        if yarn_price > 0:
            lines.append({"label": f"Yarn - {yarn}" if yarn else "Yarn", "amount": yarn_price,
                          "quantity": num(table.cell(r, 3).value) or 1})
        for c, label in ((5, "Buttons"), (6, "Ribbons"), (7, "Flowers"), (8, "Tags inside & out"),
                         (9, "Post & packaging"), (10, "Making cost")):
            amount = num(table.cell(r, c).value)
            if amount > 0:
                lines.append({"label": label, "amount": amount, "quantity": 1})
        yield dict(file=file, sheet=sheet, row=r, vat=vat, qty=1, lines=lines, price=price,
                   note=text(table.cell(r, 0).value), image=photo(table, r) or photo(table, r - 1))


def layout_for(table):
    return clothes_layout if "yarn" in text(table.cell(0, 1).value).lower() else card_layout


def phash(data):
    return str(imagehash.phash(Image.open(io.BytesIO(data)).convert("RGB")))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+")
    parser.add_argument("--out", required=True)
    parser.add_argument("--catalogue", help="Directory of catalogue photos to hash, e.g. public/uploads/products")
    args = parser.parse_args()

    photos = os.path.join(args.out, "photos")
    os.makedirs(photos, exist_ok=True)

    rows = []
    for path in args.files:
        file = os.path.basename(path).split(" - ")[0].strip()
        for sheet in Document(path).sheets:
            if sheet.name in DUPLICATE_SHEETS:
                continue
            for table in sheet.tables:
                rows.extend(layout_for(table)(file, sheet.name, table))

    for i, row in enumerate(rows):
        image = row.pop("image")
        if image is None:
            row["photo"] = row["phash"] = row["filename"] = None
            continue
        ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
        name = f"{row['file'].lower()}-{i:03d}{ext}"
        with open(os.path.join(photos, name), "wb") as handle:
            handle.write(image.data)
        row["photo"], row["phash"], row["filename"] = name, phash(image.data), image.filename

    # Keyed by file name, which is unique (a UUID) and survives a move to Blob.
    catalogue = {}
    if args.catalogue:
        for folder, _dirs, names in os.walk(args.catalogue):
            for name in names:
                try:
                    with open(os.path.join(folder, name), "rb") as handle:
                        catalogue[name] = phash(handle.read())
                except Exception:
                    pass  # not an image this can read; it simply will not match

    with open(os.path.join(args.out, "price-lists.json"), "w") as handle:
        json.dump({"rows": rows, "catalogue": catalogue}, handle)

    print(f"{len(rows)} rows ({sum(1 for r in rows if r['photo'])} with a photo), "
          f"{len(catalogue)} catalogue photos hashed -> {args.out}")


if __name__ == "__main__":
    main()
