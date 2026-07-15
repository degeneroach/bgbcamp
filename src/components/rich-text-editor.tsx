"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
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
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createMentionSuggestion, type MentionCandidate } from "@/lib/tiptap-mention-suggestion";
import { useImageLightbox } from "@/components/image-lightbox";
import { EMOJIS } from "@/lib/emojis";

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
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
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
            Add Image
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

  const uploadImageFile = useCallback(async (file: File) => {
    const activeEditor = editorRef.current;
    const ctx = uploadCtxRef.current;
    if (!activeEditor || !ctx.enableImages || !ctx.projectId) return;
    if (!file.type.startsWith("image/")) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${ctx.projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      const { error } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type });
      if (error) {
        window.alert(`Could not upload image: ${error.message}`);
        return;
      }
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      activeEditor.chain().focus().setImage({ src: data.publicUrl }).run();
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
        class: "prose prose-sm max-w-none focus:outline-none dark:prose-invert",
        style: `min-height: ${minHeight}`,
      },
      handlePaste: (_view, event) => {
        const ctx = uploadCtxRef.current;
        if (!ctx.enableImages || !ctx.projectId) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        const images: File[] = [];
        for (const item of Array.from(items)) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) images.push(file);
          }
        }
        if (images.length === 0) return false;
        event.preventDefault();
        images.forEach((file) => void uploadImageFile(file));
        return true;
      },
      handleDrop: (_view, event) => {
        const ctx = uploadCtxRef.current;
        if (!ctx.enableImages || !ctx.projectId) return false;
        const dropEvent = event as DragEvent;
        const files = dropEvent.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (images.length === 0) return false;
        event.preventDefault();
        images.forEach((file) => void uploadImageFile(file));
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
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadImageFile(file);
  }

  return (
    <div className={className}>
      <div className="rounded-md border">
        <Toolbar
          editor={editor}
          onUploadImage={enableImages ? () => fileInputRef.current?.click() : undefined}
          isUploading={isUploading}
        />
        <div className="px-3 py-2">
          <EditorContent editor={editor} />
        </div>
      </div>
      {enableImages && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
  return html
    .replace(
      /(?:(?:<p>\s*)?<img[^>]*\/?>(?:\s*<\/p>)?\s*){2,}/g,
      (match) => `<div data-rte-gallery>${match}</div>`
    )
    .replace(/<img(?![^>]*loading=)/g, '<img loading="lazy" decoding="async"');
}

const GALLERY_STYLES =
  "[&_[data-rte-gallery]]:my-2 [&_[data-rte-gallery]]:flex [&_[data-rte-gallery]]:flex-wrap [&_[data-rte-gallery]]:gap-2 [&_[data-rte-gallery]_p]:m-0 [&_[data-rte-gallery]_img]:m-0 [&_[data-rte-gallery]_img]:h-28 [&_[data-rte-gallery]_img]:w-28 [&_[data-rte-gallery]_img]:rounded-md [&_[data-rte-gallery]_img]:border [&_[data-rte-gallery]_img]:object-cover";

export function RichTextContent({ html, className }: { html: string; className?: string }) {
  const lightbox = useImageLightbox();

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG" && lightbox) {
      const img = target as HTMLImageElement;
      lightbox.open(img.currentSrc || img.src, img.alt);
    }
  }

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert [&_img]:cursor-zoom-in [&_img]:rounded-md [&_img]:max-h-96 ${GALLERY_STYLES} ${className ?? ""}`}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: groupConsecutiveImages(html) }}
    />
  );
}
