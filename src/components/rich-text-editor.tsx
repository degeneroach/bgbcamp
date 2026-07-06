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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createMentionSuggestion, type MentionCandidate } from "@/lib/tiptap-mention-suggestion";

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
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  }, []);

  useEffect(() => {
    return () => editor?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor || !projectId) return;
    if (!file.type.startsWith("image/")) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      const { error } = await supabase.storage.from("attachments").upload(path, file);
      if (error) {
        window.alert(`Could not upload image: ${error.message}`);
        return;
      }
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      editor.chain().focus().setImage({ src: data.publicUrl }).run();
    } finally {
      setIsUploading(false);
    }
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

export function RichTextContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
