import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";

export interface MentionCandidate {
  id: string;
  label: string;
}

// Renders the "@" autocomplete dropdown for the Mention extension using
// plain DOM (no React) to keep the editor self-contained.
export function createMentionSuggestion(
  getCandidates: () => MentionCandidate[]
): Omit<SuggestionOptions<MentionCandidate>, "editor"> {
  return {
    items: ({ query }) => {
      const q = query.toLowerCase();
      return getCandidates()
        .filter((c) => c.label.toLowerCase().includes(q))
        .slice(0, 8);
    },
    render: () => {
      let container: HTMLDivElement;
      let popup: TippyInstance[];
      let selectedIndex = 0;
      let currentItems: MentionCandidate[] = [];
      let currentCommand: ((item: MentionCandidate) => void) | null = null;

      function renderList() {
        container.innerHTML = "";
        if (currentItems.length === 0) {
          const empty = document.createElement("div");
          empty.className = "px-3 py-2 text-sm text-muted-foreground";
          empty.textContent = "No matches";
          container.appendChild(empty);
          return;
        }
        currentItems.forEach((item, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = item.label;
          button.className = [
            "block w-full text-left px-3 py-1.5 text-sm rounded-sm",
            index === selectedIndex ? "bg-muted" : "hover:bg-muted/60",
          ].join(" ");
          button.addEventListener("mousedown", (e) => {
            e.preventDefault();
            currentCommand?.(item);
          });
          container.appendChild(button);
        });
      }

      return {
        onStart: (props) => {
          currentItems = props.items;
          currentCommand = props.command;
          container = document.createElement("div");
          container.className =
            "z-50 min-w-[10rem] rounded-md border bg-popover p-1 shadow-md";
          renderList();

          if (!props.clientRect) return;
          popup = tippy("body", {
            getReferenceClientRect: () => props.clientRect!() as DOMRect,
            appendTo: () => document.body,
            content: container,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },
        onUpdate: (props) => {
          currentItems = props.items;
          currentCommand = props.command;
          selectedIndex = 0;
          renderList();
          if (props.clientRect) {
            popup?.[0]?.setProps({
              getReferenceClientRect: () => props.clientRect!() as DOMRect,
            });
          }
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          if (props.event.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % Math.max(currentItems.length, 1);
            renderList();
            return true;
          }
          if (props.event.key === "ArrowUp") {
            selectedIndex =
              (selectedIndex - 1 + Math.max(currentItems.length, 1)) %
              Math.max(currentItems.length, 1);
            renderList();
            return true;
          }
          if (props.event.key === "Enter") {
            const item = currentItems[selectedIndex];
            if (item) currentCommand?.(item);
            return true;
          }
          return false;
        },
        onExit: () => {
          popup?.[0]?.destroy();
          container?.remove();
        },
      };
    },
  };
}
