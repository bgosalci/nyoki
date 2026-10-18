import { paragraphs } from "@/lib/storefront/paragraphs";

/**
 * CMS text typed into a plain box, shown exactly as typed: a blank line
 * starts a paragraph and a line break is kept, but nothing in it is read as
 * formatting - an asterisk, a dash or a backslash is just that character.
 * For text from the formatting editor, use RichText.
 */
export function PlainText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {paragraphs(text).map((paragraph, i) => (
        <p key={i} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
