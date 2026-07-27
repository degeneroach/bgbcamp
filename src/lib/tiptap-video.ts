import { Node, mergeAttributes } from "@tiptap/core";

// Minimal block-level video node: renders a native <video controls> player.
// Inserted by the editor when a video file is dropped/pasted/picked.
export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "video" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(
        {
          controls: "true",
          preload: "metadata",
          playsinline: "true",
          class: "rounded-md max-w-full",
        },
        HTMLAttributes
      ),
    ];
  },
});
