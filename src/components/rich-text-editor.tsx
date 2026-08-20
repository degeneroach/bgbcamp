"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
import { marked } from "marked";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  ImagePlus,
  Loader2,
  Smile,
  TextQuote,
  Minus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createMentionSuggestion, type MentionCandidate } from "@/lib/tiptap-mention-suggestion";
import { Video } from "@/lib/tiptap-video";
import { useImageLightbox } from "@/components/image-lightbox";
import { EMOJIS } from "@/lib/emojis";
import { canCompressVideo, compressVideo } from "@/lib/compress-video";
import { toast } from "sonner";

function EmojiPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        aria-label="Insert emoji"
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute left-0 top-9 z-50 grid w-max grid-cols-4 gap-1 rounded-lg border bg-popover p-2 shadow-md">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji.char}
              type="button"
              title={emoji.label}
              aria-label={emoji.label}
              className="flex h-9 w-9 items-center justify-center rounded-md text-xl leading-none hover:bg-muted"
              onClick={() => {
                editor.chain().focus().insertContent(emoji.char).run();
                setOpen(false);
              }}
            >
              {emoji.char}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Heuristic: does pasted plain text read as Markdown? Requires at least two
// distinct signals so ordinary prose with a stray dash isn't converted.
function looksLikeMarkdown(text: string): boolean {
  const signals = [
    /^#{1,6}\s/m, // headings
    /^\s*[-*]\s+\S/m, // bullet lists
    /^\s*\d+\.\s+\S/m, // ordered lists
    /\*\*[^*\n]+\*\*/, // bold
    /^\|.+\|\s*$/m, // tables
    /^>\s/m, // blockquotes
    /^-{3,}\s*$/m, // horizontal rules
    /\[[^\]]+\]\([^)]+\)/, // links
  ];
  return signals.filter((re) => re.test(text)).length >= 2;
}

// Quote only what's highlighted: TipTap's toggleBlockquote wraps whole
// blocks, so quoting one selected line inside a paragraph (common when lines
// are Shift+Enter breaks) would swallow the entire comment. For a partial
// selection, carve the selection out into its own blockquote instead.
function toggleQuoteOnSelection(editor: Editor) {
  if (editor.isActive("blockquote")) {
    editor.chain().focus().toggleBlockquote().run();
    return;
  }

  const { state } = editor;
  const { empty, $from, $to } = state.selection;
  const wholeBlock =
    empty ||
    ($from.sameParent($to) &&
      $from.parentOffset === 0 &&
      $to.parentOffset === $to.parent.content.size);

  if (wholeBlock) {
    editor.chain().focus().toggleBlockquote().run();
    return;
  }

  const content = state.selection.content().content.toJSON();
  if (!content) {
    editor.chain().focus().toggleBlockquote().run();
    return;
  }

  editor
    .chain()
    .focus()
    .deleteSelection()
    .insertContent({ type: "blockquote", content })
    .run();
}

function Toolbar({
  editor,
  onUploadImage,
  isUploading,
}: {
  editor: Editor | null;
  onUploadImage?: () => void;
  isUploading?: boolean;
}) {
  if (!editor) return null;

  function setLink() {
    const previousUrl = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    // Sticky so the toolbar follows you down long documents; top-20 clears
    // the sticky app header + favorites bar. Needs an opaque background and
    // its own z so content scrolling underneath doesn't bleed through.
    <div className="sticky top-20 z-20 flex flex-wrap items-center gap-0.5 rounded-t-md border-b bg-card p-1">
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive("link")} onPressedChange={setLink} aria-label="Link">
        <LinkIcon className="h-4 w-4" />
      </Toggle>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => toggleQuoteOnSelection(editor)}
        aria-label="Quote"
      >
        <TextQuote className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={false}
        onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
        aria-label="Divider line"
      >
        <Minus className="h-4 w-4" />
      </Toggle>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <EmojiPicker editor={editor} />
      {onUploadImage && (
        <>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={isUploading}
            onClick={onUploadImage}
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            Add media
          </Button>
        </>
      )}
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write something...",
  className,
  minHeight = "8rem",
  projectId,
  enableImages = false,
  mentionCandidates,
  onEnterSubmit,
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Required when enableImages is true — scopes the storage upload path. */
  projectId?: string;
  /** Adds an "Add Image" toolbar button that uploads to the attachments bucket. */
  enableImages?: boolean;
  /** Enables "@name" mention autocomplete sourced from this list. */
  mentionCandidates?: MentionCandidate[];
  /**
   * When set, plain Enter submits (Shift+Enter still inserts a new line).
   * Ignored while the @mention popup is open or inside a list.
   */
  onEnterSubmit?: () => void;
}) {
  const candidatesRef = useRef<MentionCandidate[]>(mentionCandidates ?? []);
  useEffect(() => {
    candidatesRef.current = mentionCandidates ?? [];
  }, [mentionCandidates]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The paste/drop handlers below live inside editorProps, which TipTap
  // captures once at editor creation. Read the latest props/editor through
  // refs so those handlers always see current values.
  const editorRef = useRef<Editor | null>(null);
  const uploadCtxRef = useRef({ projectId, enableImages });
  useEffect(() => {
    uploadCtxRef.current = { projectId, enableImages };
  }, [projectId, enableImages]);
  const onEnterSubmitRef = useRef(onEnterSubmit);
  useEffect(() => {
    onEnterSubmitRef.current = onEnterSubmit;
  }, [onEnterSubmit]);

  const uploadMediaFile = useCallback(async (file: File) => {
    const activeEditor = editorRef.current;
    const ctx = uploadCtxRef.current;
    if (!activeEditor || !ctx.enableImages || !ctx.projectId) return;
    const isImage = file.type.startsWith("image/");
    // Windows drag-and-drop sometimes hands over files with an empty MIME
    // type, so recognize videos by extension as well.
    const isVideo =
      file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|mkv)$/i.test(file.name);
    const MB = 1024 * 1024;
    if (file.size > 50 * MB && !(isVideo && canCompressVideo())) {
      window.alert(`"${file.name}" is over the 50MB limit.`);
      return;
    }

    setIsUploading(true);
    try {
      let uploadFile = file;
      // Big videos get re-encoded in the browser (720p-class MP4) before
      // upload, so a 200MB screen recording doesn't eat storage or take a
      // million years to load for whoever opens the SOP.
      if (isVideo && file.size > 8 * MB && canCompressVideo()) {
        const toastId = toast.loading(`Compressing ${file.name}… 0%`);
        try {
          uploadFile = await compressVideo(file, (fraction) => {
            toast.loading(
              `Compressing ${file.name}… ${Math.round(fraction * 100)}%`,
              { id: toastId }
            );
          });
          toast.success(
            `Compressed ${file.name}: ${Math.round(file.size / MB)}MB → ${Math.max(1, Math.round(uploadFile.size / MB))}MB`,
            { id: toastId }
          );
        } catch {
          // Compression can fail on exotic codecs — upload the original if
          // it fits, otherwise there's nothing valid to send.
          toast.dismiss(toastId);
          if (file.size > 50 * MB) {
            toast.error(
              `Couldn't compress ${file.name}, and it's over the 50MB upload limit.`
            );
            return;
          }
          uploadFile = file;
        }
        if (uploadFile.size > 50 * MB) {
          toast.error(
            `${file.name} is still over the 50MB upload limit after compression — try trimming it down.`
          );
          return;
        }
      }

      const supabase = createClient();
      const ext = uploadFile.name.split(".").pop();
      const path = `${ctx.projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      const { error } = await supabase.storage
        .from("attachments")
        .upload(path, uploadFile, {
          contentType: uploadFile.type || "application/octet-stream",
        });
      if (error) {
        window.alert(`Could not upload ${file.name}: ${error.message}`);
        return;
      }
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      // Insert AFTER the current selection rather than over it — a freshly
      // inserted video/image stays node-selected, and plain insertContent
      // would replace it, so a second video used to swallow the first.
      const insertPos = activeEditor.state.selection.to;
      if (isVideo) {
        activeEditor
          .chain()
          .focus()
          .insertContentAt(insertPos, [
            { type: "video", attrs: { src: data.publicUrl } },
            { type: "paragraph" },
          ])
          .run();
      } else if (isImage) {
        activeEditor
          .chain()
          .focus()
          .insertContentAt(insertPos, { type: "image", attrs: { src: data.publicUrl } })
          .run();
      } else {
        // Any other file type becomes a paperclip link chip.
        activeEditor
          .chain()
          .focus()
          .insertContentAt(insertPos, [
            {
              type: "text",
              text: `📎 ${file.name}`,
              marks: [{ type: "link", attrs: { href: data.publicUrl } }],
            },
            { type: "text", text: " " },
          ])
          .run();
      }
    } finally {
      setIsUploading(false);
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      TiptapImage.configure({ HTMLAttributes: { class: "rounded-md max-w-full" } }),
      Video,
      TableKit,
      ...(mentionCandidates
        ? [
            Mention.extend({
              renderHTML({ node, HTMLAttributes }) {
                return [
                  "span",
                  {
                    ...HTMLAttributes,
                    "data-type": "mention",
                    "data-mention-id": node.attrs.id,
                    class: "mention rounded bg-primary/10 px-1 py-0.5 font-medium text-primary",
                  },
                  `@${node.attrs.label ?? node.attrs.id}`,
                ];
              },
            }).configure({
              suggestion: {
                char: "@",
                // Editor extensions are built once at mount (useEditor deps
                // are []); this closure is only invoked later from TipTap's
                // own suggestion plugin event handlers, never during render.
                // eslint-disable-next-line react-hooks/refs
                ...createMentionSuggestion(() => candidatesRef.current),
                command: ({ editor, range, props }) => {
                  const candidate = props as MentionCandidate;
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(range, [
                      { type: "mention", attrs: { id: candidate.id, label: candidate.label } },
                      { type: "text", text: " " },
                    ])
                    .run();
                },
              },
            }),
          ]
        : []),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none dark:prose-invert [&_p]:my-1.5 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:mt-2.5 [&_h3]:mb-1 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_img]:my-1.5 [&_blockquote]:my-1.5 [&_hr]:my-2.5",
        style: `min-height: ${minHeight}`,
      },
      handleKeyDown: (_view, event) => {
        if (
          event.key !== "Enter" ||
          event.shiftKey ||
          event.isComposing ||
          !onEnterSubmitRef.current
        ) {
          return false;
        }
        // Let Enter keep its native meaning while the @mention popup is open
        // (it selects the highlighted person), inside a list (new item), or
        // inside a quote (new quoted line).
        if (document.querySelector("[data-tippy-root]")) return false;
        const active = editorRef.current;
        if (
          active?.isActive("bulletList") ||
          active?.isActive("orderedList") ||
          active?.isActive("blockquote")
        ) {
          return false;
        }
        event.preventDefault();
        onEnterSubmitRef.current();
        return true;
      },
      handlePaste: (_view, event) => {
        // Plain-text paste that looks like Markdown (SOPs written elsewhere,
        // AI output, etc.) converts to rich content — tables included.
        const plain = event.clipboardData?.getData("text/plain") ?? "";
        const richHtml = event.clipboardData?.getData("text/html") ?? "";
        if (plain && !richHtml && looksLikeMarkdown(plain)) {
          event.preventDefault();
          const html = marked.parse(plain, { async: false, gfm: true }) as string;
          editorRef.current?.chain().focus().insertContent(html).run();
          return true;
        }

        const ctx = uploadCtxRef.current;
        if (!ctx.enableImages || !ctx.projectId) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        const media: File[] = [];
        for (const item of Array.from(items)) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) media.push(file);
          }
        }
        if (media.length === 0) return false;
        event.preventDefault();
        void (async () => {
          for (const file of media) await uploadMediaFile(file);
        })();
        return true;
      },
      handleDrop: (_view, event) => {
        const ctx = uploadCtxRef.current;
        if (!ctx.enableImages || !ctx.projectId) return false;
        const dropEvent = event as DragEvent;
        const files = dropEvent.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        event.preventDefault();
        const dropped = Array.from(files);
        void (async () => {
          for (const file of dropped) await uploadMediaFile(file);
        })();
        return true;
      },
      // Clicking an image in the editor sets/edits its caption.
      handleClickOn: (_view, _pos, node, nodePos, _event, direct) => {
        if (!direct || node.type.name !== "image") return false;
        const current = (node.attrs.alt as string | null) ?? "";
        const caption = window.prompt("Caption for this image (leave empty for none):", current);
        if (caption === null) return true;
        editorRef.current
          ?.chain()
          .command(({ tr }) => {
            tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, alt: caption.trim() });
            return true;
          })
          .run();
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  }, []);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    return () => editor?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void (async () => {
      for (const file of files) await uploadMediaFile(file);
    })();
  }

  return (
    <div className={className}>
      <div className="rounded-md border">
        <Toolbar
          editor={editor}
          onUploadImage={enableImages ? () => fileInputRef.current?.click() : undefined}
          isUploading={isUploading}
        />
        <div className="px-2.5 py-1.5">
          <EditorContent editor={editor} />
        </div>
      </div>
      {enableImages && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}

// Wraps runs of 2+ consecutive images (TipTap emits them as sibling blocks,
// sometimes inside bare <p> tags) in a gallery container so they render as a
// compact thumbnail row instead of stacked full-width images. Also stamps
// every image with lazy-loading hints so comment threads full of screenshots
// don't block initial render.
function groupConsecutiveImages(html: string): string {
  return (
    html
      .replace(
        /(?:(?:<p>\s*)?<img[^>]*\/?>(?:\s*<\/p>)?\s*){2,}/g,
        (match) => `<div data-rte-gallery>${match}</div>`
      )
      .replace(/<img(?![^>]*loading=)/g, '<img loading="lazy" decoding="async"')
      // Images with an alt text (set by clicking the image in the editor)
      // render as a figure with a visible caption underneath.
      .replace(/<img([^>]*?)alt="([^"]+)"([^>]*?)\/?>/g, (match, pre, alt, post) =>
        alt.trim()
          ? `<figure data-rte-fig><img${pre}alt="${alt}"${post}><figcaption>${alt}</figcaption></figure>`
          : match
      )
  );
}

// Google Drive links render as pill chips with a per-product icon (styled
// via .prose a[data-gdoc] rules in globals.css). Inline 14px SVGs, stroke
// follows the chip color via currentColor.
const GDOC_SVG_OPEN =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const GDOC_TYPES: { match: RegExp; kind: string; label: string; icon: string }[] = [
  {
    match: /docs\.google\.com\/document/,
    kind: "doc",
    label: "Google Doc",
    icon: `${GDOC_SVG_OPEN}<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M15 2v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`,
  },
  {
    match: /docs\.google\.com\/spreadsheets/,
    kind: "sheet",
    label: "Google Sheet",
    icon: `${GDOC_SVG_OPEN}<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>`,
  },
  {
    match: /docs\.google\.com\/presentation/,
    kind: "slides",
    label: "Google Slides",
    icon: `${GDOC_SVG_OPEN}<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/></svg>`,
  },
  {
    match: /docs\.google\.com\/forms/,
    kind: "form",
    label: "Google Form",
    icon: `${GDOC_SVG_OPEN}<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9.5 1.5 1.5L13 8.5"/><line x1="15" y1="10" x2="17" y2="10"/><path d="m9 15.5 1.5 1.5 2.5-2.5"/><line x1="15" y1="16" x2="17" y2="16"/></svg>`,
  },
  {
    match: /drive\.google\.com/,
    kind: "drive",
    label: "Google Drive file",
    icon: `${GDOC_SVG_OPEN}<path d="M12 2v8"/><path d="m16 6-4 4-4-4"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/></svg>`,
  },
];

function decorateGoogleLinks(html: string): string {
  return html.replace(
    /<a\s+([^>]*href="(https:\/\/(?:docs|drive)\.google\.com\/[^"]*)"[^>]*)>([\s\S]*?)<\/a>/g,
    (match, attrs: string, href: string, inner: string) => {
      const type = GDOC_TYPES.find((t) => t.match.test(href));
      if (!type) return match;
      // A raw pasted URL as the link text becomes the product name with the
      // URL in muted text beside it; hand-written link text is kept as-is.
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!/^https?:\/\//i.test(text)) {
        return `<a ${attrs} data-gdoc="${type.kind}">${type.icon}<span>${inner}</span></a>`;
      }
      const displayUrl = href.replace(/^https:\/\//, "");
      return `<a ${attrs} data-gdoc="${type.kind}">${type.icon}<span>${type.label}</span><span data-gdoc-url>${displayUrl}</span></a>`;
    }
  );
}

const CAPTION_STYLES =
  "[&_figure[data-rte-fig]]:my-2 [&_figure[data-rte-fig]]:w-fit [&_figure[data-rte-fig]_img]:my-0 [&_figcaption]:mt-1.5 [&_figcaption]:px-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:italic [&_figcaption]:leading-snug [&_figcaption]:text-muted-foreground [&_[data-rte-gallery]_figure]:m-0 [&_[data-rte-gallery]_figure]:w-28 [&_[data-rte-gallery]_figcaption]:truncate";

const GALLERY_STYLES =
  "[&_[data-rte-gallery]]:my-2 [&_[data-rte-gallery]]:flex [&_[data-rte-gallery]]:flex-wrap [&_[data-rte-gallery]]:gap-2 [&_[data-rte-gallery]_p]:m-0 [&_[data-rte-gallery]_img]:m-0 [&_[data-rte-gallery]_img]:h-28 [&_[data-rte-gallery]_img]:w-28 [&_[data-rte-gallery]_img]:rounded-md [&_[data-rte-gallery]_img]:border [&_[data-rte-gallery]_img]:object-cover";

export function RichTextContent({ html, className }: { html: string; className?: string }) {
  const lightbox = useImageLightbox();

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG" && lightbox) {
      const img = target as HTMLImageElement;
      // Gather every image in this block (comment/description) so the
      // lightbox can arrow through them, starting from the one clicked.
      const all = Array.from(e.currentTarget.querySelectorAll("img"));
      const items = all.map((el) => ({ src: el.currentSrc || el.src, alt: el.alt }));
      const index = all.indexOf(img);
      lightbox.openGallery(items, Math.max(0, index));
    }
  }

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert [&_img]:cursor-zoom-in [&_img]:rounded-md [&_img]:max-h-96 [&_video]:my-2 [&_video]:max-h-96 [&_video]:rounded-md [&_hr]:my-4 [&_hr]:border-border ${GALLERY_STYLES} ${CAPTION_STYLES} ${className ?? ""}`}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: decorateGoogleLinks(groupConsecutiveImages(html)) }}
    />
  );
}
