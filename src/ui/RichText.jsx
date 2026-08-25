import { useCallback, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconH2,
  IconH3,
  IconH4,
  IconList,
  IconListNumbers,
  IconQuote,
  IconLink,
  IconLinkOff,
  IconPhoto,
  IconMinus,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconClearFormatting,
} from "@tabler/icons-react";
import { cx } from "../lib/cx.js";

/* The blog editor. TipTap (ProseMirror) because it is headless — the chrome is
   ours, styled with the same design tokens as everything else, rather than an
   editor theme fighting the admin's.

   ⚠ What comes out of here is HTML that will be rendered on the public site
   with `dangerouslySetInnerHTML`. Nothing in this file is a security control:
   the API sanitises on write (src/lib/html.js) and that is the only thing
   standing between a pasted payload and a stored XSS. The toolbar limiting what
   an editor can *insert* is a usability decision, not a safety one — a paste,
   or a request sent by hand, bypasses it entirely.

   ⚠ No h1. The post's own title is the page's h1; a second one breaks the
   document outline, and the API strips it anyway. */

/* Matched to the API's allowlist in src/lib/html.js. If one gains a tag the
   other has to, or an editor gets a button whose output is silently stripped on
   save — which reads as the editor losing their work. */
const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    /* The API allows <pre>, but a code block in a community blog post is far
       more likely to be an accident than an intention. Inline `code` stays. */
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      /* Mirrors what sanitize-html enforces server-side, so the preview here
         matches what is stored. */
      protocols: ["http", "https", "mailto", "tel"],
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    },
  }),
  Image.configure({
    /* Base64 pasted straight into the document would put megabytes of image
       into the post body and into every API response that carries it. Images
       are URLs until there is somewhere to upload them to. */
    allowBase64: false,
    HTMLAttributes: { loading: "lazy" },
  }),
  Placeholder.configure({ placeholder: "Write the post…" }),
];

function ToolbarButton({ onClick, active, disabled, label, icon: Icon }) {
  return (
    <button
      type="button"
      /* ⚠ `onMouseDown` with preventDefault, not onClick. A click moves focus to
         the button first, which collapses the editor's selection — so "make
         this bold" would apply to nothing. Preventing the default keeps the
         caret and the selection exactly where they were. */
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cx(
        "grid h-7 w-7 place-items-center rounded transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-30",
        active ? "bg-fg text-fg-invert" : "text-fg-muted hover:bg-muted hover:text-fg"
      )}
    >
      <Icon size={15} stroke={1.9} />
    </button>
  );
}

const Divider = () => <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />;

export function RichText({ value, onChange, invalid }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value ?? "",
    editorProps: {
      attributes: {
        class: "rich-text focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  /* Keeps the editor in step when the value changes from OUTSIDE it — the form's
     Discard button, or a save that returns the sanitised HTML.

     ⚠ Guarded on the content actually differing. Without that, every keystroke
     round-trips through the parent's state, comes back here, and resets the
     document — which destroys the cursor position on every character typed. */
  useEffect(() => {
    if (!editor) return;
    const next = value ?? "";
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previous = editor.getAttributes("link").href ?? "";
    // eslint-disable-next-line no-alert
    const url = window.prompt("Link to:", previous);

    /* Cancel leaves the document alone; clearing the box removes the link.
       Those are different intentions and a single "falsy" check would conflate
       them. */
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    // eslint-disable-next-line no-alert
    const url = window.prompt("Image URL:");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  const can = editor.can().chain().focus();

  /* Counted from the editor's plain text rather than by adding TipTap's
     CharacterCount extension — one line against a whole extension, and the
     document is re-read on each render anyway. */
  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;

  return (
    <div
      className={cx(
        "overflow-hidden rounded border transition-[border-color] duration-150",
        invalid ? "border-danger" : "border-line focus-within:border-accent"
      )}
    >
      {/* `sticky` so the toolbar stays reachable in a long post rather than
          scrolling away at the top of it. */}
      <div className="sticky top-0 z-[1] flex flex-wrap items-center gap-0.5 border-b border-line bg-canvas px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          icon={IconBold}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          icon={IconItalic}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Underline"
          icon={IconUnderline}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="Strikethrough"
          icon={IconStrikethrough}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <Divider />

        {[2, 3, 4].map((level) => (
          <ToolbarButton
            key={level}
            label={`Heading ${level}`}
            icon={{ 2: IconH2, 3: IconH3, 4: IconH4 }[level]}
            active={editor.isActive("heading", { level })}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          />
        ))}

        <Divider />

        <ToolbarButton
          label="Bullet list"
          icon={IconList}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Numbered list"
          icon={IconListNumbers}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Quote"
          icon={IconQuote}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />

        <Divider />

        <ToolbarButton
          label="Add or edit link"
          icon={IconLink}
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <ToolbarButton
          label="Remove link"
          icon={IconLinkOff}
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        />
        <ToolbarButton label="Insert image" icon={IconPhoto} onClick={addImage} />
        <ToolbarButton
          label="Divider"
          icon={IconMinus}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <Divider />

        <ToolbarButton
          label="Clear formatting"
          icon={IconClearFormatting}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        />
        <ToolbarButton
          label="Undo"
          icon={IconArrowBackUp}
          disabled={!can.undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          label="Redo"
          icon={IconArrowForwardUp}
          disabled={!can.redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      {/* ⚠ A plain <div>, NOT a <button>, even though it has a mouse handler.
          The editor is a contenteditable — wrapping it in a button nests
          interactive content, and the browser then suppresses text selection
          inside it, so a toolbar action like Bold has nothing to apply to. The
          real control here is the contenteditable, which is already focusable
          and already carries its own semantics; this element only widens the
          click target to the padding around it. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        onMouseDown={(e) => {
          /* Only when the padding itself is clicked — a click on the text must
             fall through so the caret lands where it was aimed. */
          if (e.target === e.currentTarget) {
            e.preventDefault();
            editor.commands.focus("end");
          }
        }}
        className="cursor-text bg-surface p-4"
      >
        <EditorContent editor={editor} />
      </div>

      <div className="border-t border-line bg-canvas px-3 py-1.5 text-[11.5px] text-fg-subtle">
        <span className="whitespace-nowrap">{words} words</span>
      </div>
    </div>
  );
}

export default RichText;
