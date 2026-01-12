<script lang="ts" module>
  import { TooltipSingleton } from "../utils/tooltip";
  import Overflow, { type Props as OverflowProps } from "./Overflow.svelte";
  import { Classes as rowClasses } from "../utils/Row.svelte";
  import type Self from "./Input.svelte";
  import type { MouseEventHandler } from "svelte/elements";

  const Classes = (classify: Classify) =>
    classified(classify, {
      input: "name-input",
      snapshot: "name-snapshot",
      highlighted: "name-highlighted",
    });

  export const rename = (self: Self, detail: number, override?: string) => {
    self.highlight();
    self.edit(true, detail, override);
  };

  const tooltip = new TooltipSingleton(Overflow);

  const remapEvent = (event: MouseEvent, target: EventTarget) => {
    event.preventDefault();
    event.stopPropagation();
    target.dispatchEvent(
      new MouseEvent(event.type, {
        clientX: event.clientX,
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
  };

  type Properties = Pick<
    OverflowProps,
    "backgroundColor" | "fontSize" | "color"
  >;

  const isPopulated = (obj: Partial<Properties>): obj is Properties =>
    Boolean(obj.backgroundColor && obj.fontSize && obj.color);

  const heightDelta = (a: Element, b: Element): number =>
    a.getBoundingClientRect().height - b.getBoundingClientRect().height;

  const getClosestProperties = (
    element: HTMLElement | null,
    acc: Partial<Properties> = {}
  ): Properties | null => {
    if (!element) return null;

    if (isPopulated(acc)) return acc;

    const { fontSize, color, backgroundColor } = getComputedStyle(element);

    acc.fontSize ??= fontSize;
    acc.color ??= color;

    const isVisible =
      backgroundColor &&
      backgroundColor !== "rgba(0, 0, 0, 0)" &&
      backgroundColor !== "transparent";

    if (isVisible) acc.backgroundColor ??= backgroundColor;

    return isPopulated(acc)
      ? acc
      : getClosestProperties(element.parentElement, acc);
  };

  export const tryCreateOverflowTooltipFactory =
    (classify: Classify) =>
    (element: HTMLSpanElement, onMouseEnter?: () => void) => {
      if (!isEllipsisActive(element)) return;
      const style = getClosestProperties(element);
      if (!style) return;

      const { name, "overflow-hover": hover } = rowClasses(classify);

      const rowName = element.closest(`.${name}`)! as HTMLElement;

      const paddingY = heightDelta(rowName, element) / 2;

      const instance = tooltip.mount(
        fixToTopLeftCorner(element, { top: -paddingY }),
        {
          ...style,
          classify:
            typeof classify === "function" ? classify : classify?.classify,
          paddingY,
          name: element.textContent || "",
          onclick: () => {
            element.click();
            tick().then(() => {
              const style = getClosestProperties(element);
              if (style)
                instance.component.setBackground(style.backgroundColor);
            });
          },
          ondblclick: async (event) => {
            instance.destroy();
            remapEvent(event, element);
          },
          onmouseenter: () => {
            onMouseEnter?.();
            rowName.classList.add(hover);
          },
          onmouseleave: () => {
            rowName.classList.remove(hover);
            instance.destroy();
          },
          oncontextmenu: (event) => remapEvent(event, element),
        }
      );

      return instance;
    };

  export type Props = { model: File.Model | Folder.Model } & WithClassify;
</script>

<script lang="ts">
  import {
    fixToTopLeftCorner,
    isEllipsisActive,
    mouseEventToCaretIndex,
  } from "../utils";
  import type { File, Folder } from "..";
  import type { Events } from "../models.svelte";
  import { tick } from "svelte";
  import { classified, type Classify, type WithClassify } from "../Root.svelte";

  let { model, classify }: Props = $props();

  const name = $derived(model.name);
  const classes = $derived(Classes(classify));
  const tryCreateOverflowTooltip = $derived(
    tryCreateOverflowTooltipFactory(classify)
  );

  let editing = $state(false);
  let input = $state<HTMLInputElement>();
  let snapshot = $state<HTMLSpanElement>();
  let caretIndex = $state(-1);
  let scrollLeft = $state(-1);
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
    scrollLeft = -1;
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

  export const tryShowNameOverflow = (onMouseEnter: () => void) => {
    if (!snapshot) return;
    return tryCreateOverflowTooltip(snapshot, onMouseEnter);
  };

  $effect(() => {
    if (!input) return;
    input.value = editableNameOverride ?? name;
    input.focus();
    if (caretIndex >= 0) input.setSelectionRange(caretIndex, caretIndex);
    if (scrollLeft >= 0) input.scrollLeft = scrollLeft;
  });
</script>

{#if editing}
  <input
    bind:this={input}
    class={classes.input}
    style:width="100%"
    type="text"
    style:font-size="inherit"
    style:color="inherit"
    onblur={({ currentTarget: { value } }) => edit(false, value)}
    onkeydown={({ key, currentTarget }) =>
      key !== "Enter" || currentTarget.blur()}
    onclick={(event) => {
      event.stopPropagation();
    }}
  />
{:else}
  <span
    bind:this={snapshot}
    class={highlighted
      ? `${classes.highlighted} ${classes.snapshot}`
      : classes.snapshot}
    style:width="100%"
    role="button"
    style:font-size="inherit"
    style:color="inherit"
    tabindex="0"
    ondblclick={(event) => {
      const result = mouseEventToCaretIndex(event, name);
      edit(true, result.caretIndex);
      scrollLeft = event.offsetX - result.approxCharacterWidth;
    }}
    onmouseenter={({ currentTarget }) =>
      tryCreateOverflowTooltip(currentTarget)}
  >
    <!-- child span used to ensure `mouseEventToCaretIndex` works correctly when the name is overflowing -->
    <span style:width="fit-content"> {name} </span>
  </span>
{/if}

<style>
  span {
    width: 100%;
    position: relative;
    flex-grow: 1;
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    outline-style: solid;
    outline-color: transparent;
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
