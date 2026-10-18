import { Fragment } from "react";

import { parseRichText, type Line, type Span } from "@/lib/rich-text/parse";

function Formatted({ text, bold, italic }: Span) {
  const content = italic ? <em>{text}</em> : text;
  return bold ? <strong>{content}</strong> : content;
}

function Lines({ lines }: { lines: Line[] }) {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 ? <br /> : null}
      {line.map((span, j) => (
        <Formatted key={j} {...span} />
      ))}
    </Fragment>
  ));
}

/**
 * CMS text as Njomza formatted it: paragraphs, line breaks, bold, italic and
 * bullets. Built as elements, never as HTML, so nothing typed can break out.
 */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {parseRichText(text).map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Lines lines={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Lines lines={block.lines} />
          </p>
        ),
      )}
    </div>
  );
}
