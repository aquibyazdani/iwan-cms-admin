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

/* The blog editor. TipTap because it is headless, so the chrome is ours and
   uses the same design tokens as everything else.

   ⚠ NOTHING IN THIS FILE IS A SECURITY CONTROL. The output is rendered on the
   public site with `dangerouslySetInnerHTML`, and the API's sanitiser
   (src/lib/html.js) is the only thing between a pasted payload and a stored
   XSS. What the toolbar can insert is a usability decision — a paste or a
   hand-sent request bypasses it entirely.

   ⚠ No h1: the post's title is the page's h1, and the API strips it anyway. */

/* ⚠ Matched to the API's allowlist in src/lib/html.js. If one gains a tag the
   other must, or an editor gets a button whose output is stripped on save. */
const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    /* The API allows <pre>, but a code block in a community post is likelier
       an accident than an intention. Inline `code` stays. */
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      /* Mirrors the server-side rule, so the preview matches what is
         stored. */
      protocols: ["http", "https", "mailto", "tel"],
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    },
  }),
  Image.configure({
    /* Base64 would put megabytes of image into the post body and every API
       response carrying it. Images stay URLs until there is an upload. */
    allowBase64: false,
    HTMLAttributes: { loading: "lazy" },
  }),
  Placeholder.configure({ placeholder: "Write the post…" }),
];

function ToolbarButton({ onClick, active, disabled, label, icon: Icon }) {
  return (
    <button
      type="button"
      /* ⚠ `onMouseDown` with preventDefault, not onClick: a click moves focus
         to the button first, collapsing the selection, so "make this bold"
         would apply to nothing. */
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

export function RichText({ value, onChange, invalid, readOnly = false }) {
  const editor = useEditor({
    /* ⚠ A contenteditable is not a form control, so a <fieldset disabled>
       around it does nothing — this is what freezes it. */
    editable: !readOnly,
    extensions: EXTENSIONS,
    content: value ?? "",
    editorProps: {
      attributes: {
        class: "rich-text focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  /* Keeps the editor in step when the value changes from OUTSIDE — Discard, or
     a save returning sanitised HTML. ⚠ Guarded on the content actually
     differing, or every keystroke round-trips through the parent and resets the
     document, destroying the cursor position on each character. */
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

    /* Cancel leaves it alone; clearing the box removes the link. A falsy
       check would conflate the two. */
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

  /* From the plain text rather than TipTap's CharacterCount extension — one
     line against a whole extension. */
  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;

  return (
    <div
      className={cx(
        "overflow-hidden rounded border transition-[border-color] duration-150",
        invalid ? "border-danger" : "border-line focus-within:border-accent"
      )}
    >
      {/* `sticky`, so a long post does not scroll the toolbar away. */}
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

      {/* ⚠ A plain <div>, NOT a <button>, despite the mouse handler: the
          editor is a contenteditable, and nesting it in a button suppresses
          text selection, leaving Bold nothing to apply to. The contenteditable
          is the real control; this only widens the click target. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        onMouseDown={(e) => {
          /* Only the padding — a click on text must fall through so the caret
             lands where it was aimed. */
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
