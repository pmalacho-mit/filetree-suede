<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import { fade } from "svelte/transition";

  type EventHandlers = Record<
    "onmouseleave" | "onclick" | "ondblclick" | "oncontextmenu",
    MouseEventHandler<HTMLElement>
  >;

  type Style = Record<"background" | "font-size" | "color", string>;

  let {
    name,
    onmouseleave,
    onclick,
    ondblclick,
    oncontextmenu,
    ...style
  }: { name: string } & Style & EventHandlers = $props();

  let background = $derived(style.background);

  export const setBackground = (bg: string) => {
    background = bg;
  };
</script>

<button
  style:background-color={background}
  style:color={style["color"]}
  style:font-size={style["font-size"]}
  transition:fade={{ duration: 100 }}
  {oncontextmenu}
  {onmouseleave}
  {onclick}
  {ondblclick}
>
  {name}
</button>

<style>
  button {
    font-size: var(--font-size);
    border: none;
    outline: none;
    border-radius: 0.25rem;
    padding: 0;
    margin: 0;
    /* padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem; */
    /* font-weight: 700; */
    color: black;
  }
</style>
