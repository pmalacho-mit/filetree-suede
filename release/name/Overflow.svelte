<script lang="ts" module>
  import { classified, type Classify, type WithClassify } from "../Root.svelte";

  type EventHandlers = Record<
    | "onmouseleave"
    | "onmouseenter"
    | "onclick"
    | "ondblclick"
    | "oncontextmenu",
    MouseEventHandler<HTMLElement>
  >;

  /**
   * Style props are only those that are required to ensure the overflow tooltip
   * aligns visually with the name input.
   *
   * NOTE: This may need to be expanded in the future (e.g. for font-family, font-weight, etc.)
   */
  type Style = {
    backgroundColor: string;
    fontSize: string;
    color: string;
    paddingY: number;
  };

  export type Props = {
    name: string;
  } & Style &
    EventHandlers &
    WithClassify;

  export const Classes = (classify?: Classify) =>
    classified(classify, {
      element: "name-overflow-tooltip",
    });
</script>

<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import { px } from "../utils";

  let {
    name,
    onmouseenter,
    onmouseleave,
    onclick,
    ondblclick,
    oncontextmenu,
    classify,
    ...style
  }: Props = $props();

  let _element = $state<HTMLElement>();
  const classes = $derived(Classes(classify));
  let background = $derived(style.backgroundColor);

  export const element = () => _element;
  export const setBackground = (bg: string) => (background = bg);
</script>

<button
  bind:this={_element}
  class={classes.element}
  style:whitespace="nowrap"
  style:border="none"
  style:outline="none"
  style:padding-left="0"
  style:margin="0"
  style:background-color={background}
  style:color={style.color}
  style:font-size={style.fontSize}
  style:padding-top={px(style.paddingY)}
  style:padding-bottom={px(style.paddingY)}
  {oncontextmenu}
  {onmouseenter}
  {onmouseleave}
  {onclick}
  {ondblclick}
>
  {name}
</button>
