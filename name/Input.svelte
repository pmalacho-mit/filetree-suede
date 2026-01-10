<script lang="ts" module>
  import { TooltipSingleton } from "../utils/tooltip";
  import Overflow from "./Overflow.svelte";
  import Self from "./Input.svelte";
  import { cssvar, type Vars } from "../Root.svelte";

  const tooltip = new TooltipSingleton(Overflow);

  export const rename = (self: Self, detail: number, override?: string) => {
    self.highlight();
    self.edit(true, detail, override);
  };

  export type SupportedVars =
    | "--text-color"
    | "--font-size"
    | "--focus-background-color"
    | "--background-color"
    | "--editing-outline-color";

  const _var = cssvar<SupportedVars>();
</script>

<script lang="ts">
  import {
    fixToTopLeftCorner,
    isEllipsisActive,
    mouseEventToCaretIndex,
  } from "../utils";
  import type { File, Folder } from "..";
  import type { Events } from "../models.svelte";

  let {
    model,
    focused,
  }: {
    model: File.Model | Folder.Model;
    focused?: boolean;
  } & Vars<SupportedVars> = $props();

  const name = $derived(model.name);

  let editing = $state(false);
  let input = $state<HTMLInputElement>();
  let caretIndex = $state(-1);
  let highlighted = $state(false);
  let editableNameOverride: string | undefined;

  export const edit = <
    Condition extends true | false,
    Detail extends Condition extends true ? typeof caretIndex : string,
  >(
    condition: Condition,
    detail: Detail,
    override?: string
  ) => {
    editing = condition;
    editableNameOverride = override;
    if (condition) caretIndex = detail as number;
    else {
      highlight(false);
      model.name = detail as string;
      (model as Pick<Events.WithItemEvents, "fire">).fire("renamed", model);
    }
  };

  export const highlight = (setting?: boolean) => {
    setting ??= !highlighted;
    highlighted = setting;
  };

  $effect(() => {
    if (!input) return;
    input.value = editableNameOverride ?? name;
    input.focus();
    if (caretIndex >= 0) input.setSelectionRange(caretIndex, caretIndex);
  });
</script>

{#if editing}
  <input
    bind:this={input}
    type="text"
    style:--highlight-color={_var("editing-outline-color")}
    style:color={_var("text-color")}
    style:font-size={_var("font-size")}
    style:width="calc(100% - var(--icon-size, 1.25rem))"
    onblur={({ currentTarget: { value } }) => edit(false, value)}
    onkeydown={({ key, currentTarget }) =>
      key !== "Enter" || currentTarget.blur()}
    onclick={(event) => {
      event.stopPropagation();
    }}
  />
{:else}
  <span
    role="button"
    style:color={_var("text-color")}
    style:font-size={_var("font-size")}
    class:highlighted
    tabindex="0"
    ondblclick={(event) => edit(true, mouseEventToCaretIndex(event, name))}
    onmouseenter={({ currentTarget: current }) => {
      if (!isEllipsisActive(current)) return;
      const background = () =>
        focused ? _var("focus-background-color") : _var("background-color");
      const { destroy, component } = tooltip.mount(
        fixToTopLeftCorner(current, { zIndex: "10000" }),
        {
          name,
          color: _var("text-color"),
          "font-size": _var("font-size"),
          background: background(),
          onclick: () => {
            current.click();
            component.setBackground(background());
          },
          ondblclick: async (event) => {
            edit(true, mouseEventToCaretIndex(event, name, false));
            destroy();
          },
          onmouseleave: () => destroy(),
          oncontextmenu: (event) => {
            event.preventDefault();
            event.stopPropagation();
            current.dispatchEvent(
              new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
                view: window,
              })
            );
          },
        }
      );
    }}
  >
    <span style:width="fit-content">
      {name}
    </span>
  </span>
{/if}

<style>
  span {
    position: relative;
    flex-grow: 1;
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    outline-style: solid;
    outline-color: transparent;
  }
  .highlighted,
  input:focus {
    outline-color: var(--highlight-color);
  }
  input {
    border: none;
    padding: 0;
    margin: 0;
    overflow: hidden;
    background-color: transparent;
    outline-style: solid;
    outline-color: transparent;
    border-radius: 0.125rem;
  }
</style>
