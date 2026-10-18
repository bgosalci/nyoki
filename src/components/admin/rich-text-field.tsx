"use client";

import { ListItem } from "@tiptap/extension-list";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useState } from "react";

import { labelIdFor } from "@/components/admin/field";
import { RichText } from "@/components/shop/rich-text";
import { ui } from "@/lib/brand/ui";
import { fromEditorDoc, toEditorDoc } from "@/lib/rich-text/editor-doc";

/**
 * Only what the shop shows: paragraphs, line breaks, bold, italic and
 * bullets. Anything else pasted in - headings, links, tables - is reduced to
 * those, so what is in the box is what goes on the shop.
 */
const EXTENSIONS = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    link: false,
    listItem: false,
    orderedList: false,
    strike: false,
    trailingNode: false,
    underline: false,
  }),
  // Paragraphs only, so no list inside a list: Tab moves on to the next field
  // instead of indenting. "+" rather than one, because turning several
  // paragraphs into bullets first wraps them all in one item, then splits it.
  ListItem.extend({ content: "paragraph+" }),
];

// The box the text sits in, shared by the editor and the preview shown before
// it starts. The spacing is the shop's: RichText spaces the preview itself, so
// only the editor gets the rules for spacing its own paragraphs and bullets -
// given both, the preview's gaps came out double and jumped when it started.
const BOX_CLASS = "min-h-32 px-3 py-2 text-sm leading-relaxed outline-none";
const EDITOR_CLASS = `${BOX_CLASS} [&_li+li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5 [&>*+*]:mt-3`;

const BUTTON_CLASS =
  "inline-flex size-8 items-center justify-center rounded text-sm hover:bg-nyoki-beige aria-pressed:bg-nyoki-accent-beige disabled:opacity-50 dark:hover:bg-nyoki-night-rule dark:aria-pressed:bg-nyoki-night-rule";

function ToolButton({
  label,
  keys,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  keys: string;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={`${label} (${keys})`}
      disabled={disabled}
      // Keep the cursor where it is in the text while the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={BUTTON_CLASS}
    >
      {children}
    </button>
  );
}

/**
 * A description-sized box with bold, italic and bullets. What it holds is
 * posted as text (see lib/rich-text/parse.ts) in a hidden field, so the form
 * saves, restores and checks for unsaved changes as it does any other field.
 */
export function RichTextField({
  id,
  name,
  defaultValue,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: {
  id: string;
  name: string;
  defaultValue: string;
  "aria-invalid"?: "true";
  "aria-describedby"?: string;
}) {
  // What was saved, posted untouched until the text is changed: rewriting it
  // on arrival would count as a change nobody made.
  const [value, setValue] = useState(defaultValue);
  // Read once. Built afresh on every render - every key typed - the editor
  // took it for new settings and applied them all again.
  const [content] = useState(() => toEditorDoc(defaultValue));
  // The saved text as the editor would write it. A change undone comes back
  // to this, and the saved text itself is posted again, exactly: the editor's
  // own spelling of it - a \r\n tidied, a "* " bullet made "- " - would count
  // as an unsaved change and ask before leaving.
  const [unchanged] = useState(() => fromEditorDoc(content));

  // New only when the field's error does, so an error arriving after a
  // rejected save still marks the box, and typing changes nothing here.
  const editorProps = useMemo(
    () => ({
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelIdFor(id),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": invalid } : {}),
        class: EDITOR_CLASS,
      },
    }),
    [id, describedBy, invalid],
  );

  const editor = useEditor({
    extensions: EXTENSIONS,
    content,
    // Rendered on the server too; the editor itself only exists in the browser.
    immediatelyRender: false,
    editorProps,
    onUpdate: ({ editor: changed }) => {
      const written = fromEditorDoc(changed.getJSON());
      setValue(written === unchanged ? defaultValue : written);
    },
  });

  // A label's htmlFor is answered only by form elements, so clicking
  // "Description" did nothing. The label is looked for when it is clicked,
  // not found in advance, so nothing depends on what React has drawn yet.
  useEffect(() => {
    if (!editor) return;
    const onClick = (event: MouseEvent) => {
      const label = event.target instanceof Element ? event.target.closest("label") : null;
      if (label?.htmlFor === id) editor.commands.focus();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [editor, id]);

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      list: current?.isActive("bulletList") ?? false,
    }),
  });

  return (
    <div
      className={`flex flex-col rounded-md border ${ui.input} focus-within:border-nyoki-navy has-[[aria-invalid]]:border-red-400 dark:focus-within:border-nyoki-beige`}
    >
      <div role="group" aria-label="Formatting" className={`flex gap-1 border-b px-1.5 py-1 ${ui.rule}`}>
        <ToolButton
          label="Bold"
          keys="Ctrl+B or ⌘B"
          pressed={active?.bold ?? false}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolButton>
        <ToolButton
          label="Italic"
          keys="Ctrl+I or ⌘I"
          pressed={active?.italic ?? false}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <span className="font-serif italic">I</span>
        </ToolButton>
        <ToolButton
          label="Bullet list"
          keys="start a line with - and a space"
          pressed={active?.list ?? false}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-5">
            <path d="M9 6h11M9 12h11M9 18h11" strokeLinecap="round" />
            <circle cx="4.5" cy="6" r="1" fill="currentColor" />
            <circle cx="4.5" cy="12" r="1" fill="currentColor" />
            <circle cx="4.5" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolButton>
      </div>

      {/* Until the editor has started in the browser, the text as it will look. */}
      {editor ? null : <RichText text={defaultValue} className={BOX_CLASS} />}
      <EditorContent editor={editor} />

      <input type="hidden" name={name} value={value} />
    </div>
  );
}
