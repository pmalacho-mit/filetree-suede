<script lang="ts" module>
  import { File, Folder } from "..";
  import { ContextMenu } from "../context";
  import { type Snippet } from "svelte";
  import { EditableName } from "../name";
  import { type WithClassify, type Classify, classified } from "../Root.svelte";

  type Props = {
    model: File.Model | Folder.Model;
    depth: number;
    icon: Snippet;
    children?: Snippet;
    focused?: boolean;
    nameView?: EditableName;
  } & WithClassify;

  export const Classes = (classify?: Classify) =>
    classified(classify, {
      container: "row-container",
      name: "row-name",
      "overflow-hover": "row-name-overflow-hover",
      focused: "row-focused",
      icon: "row-icon",
      children: "row-children",
      indentation: "row-indentation",
      track: "row-inner-track",
      depth: <T extends number>(n: T) => `row-depth-${n}` as const,
    });
</script>

<script lang="ts">
  import type { Events } from "../models.svelte";
  import type { MouseEventHandler } from "svelte/elements";

  let {
    model,
    depth,
    icon,
    children,
    focused = $bindable(),
    nameView = $bindable(),
    classify,
  }: Props = $props();

  const classes = $derived(Classes(classify));
  let container = $state<HTMLElement>();

  $effect(() =>
    (model as Events.WithItemEvents).subscribe({
      "request focus toggle": () => (focused = !focused),
    })
  );
</script>

<ContextMenu
  {model}
  target={container}
  highlight={(condition) => nameView?.highlight(condition)}
  beforeAction={() => nameView?.edit(false, model.name)}
/>

<div
  class={classes.container}
  style:width="100%"
  style:display="flex"
  style:flex-direction="column"
  style:--depth={depth}
>
  {#if children}
    <div
      class={`${classes.children} ${classes.depth(depth)}`}
      style:position="relative"
      style:height="fit-content"
      style:width="100%"
      style:padding="0"
      style:margin="0"
      style:order="2"
    >
      {#if depth > 0}
        {@render psuedoBorder(depth)}
      {/if}
      {@render children()}
    </div>
  {/if}
  <button
    class={focused ? `${classes.focused} ${classes.name}` : classes.name}
    onclick={() => (model as Events.WithItemEvents).fire("clicked", model)}
    style:order="1"
    style:width="100%"
    style:margin="0"
    style:border="none"
    style:font-size="inherit"
    style:padding={`0 0 0 ${depth * 0.5}rem`}
    onmouseenter={({ currentTarget: target }) => {
      let instance: ReturnType<EditableName["tryShowNameOverflow"]>;
      const destroy: MouseEventHandler<HTMLButtonElement> = (event) => {
        if (event.relatedTarget !== instance?.component.element())
          instance?.destroy();
      };
      target.addEventListener("mouseleave", destroy as any, {
        once: true,
      });
      instance = nameView?.tryShowNameOverflow(() =>
        target.removeEventListener("mouseleave", destroy as any)
      );
    }}
  >
    <span
      class={classes.indentation}
      class:force-no-border={depth === 0}
      style:position="relative"
      style:display="flex"
      style:background-color="transparent"
      style:flex-direction="row"
      style:align-items="center"
    >
      <span
        class={`${classes.icon} row-icon`}
        style:display="flex"
        style:align-items="center"
        style:flex-shrink="0"
        style:height="100%"
      >
        {@render icon()}
      </span>
      <EditableName {model} {classify} bind:this={nameView} />
    </span>
  </button>
</div>

{#snippet psuedoBorder(depth: number)}
  <div
    class={classes.track}
    style:padding="0"
    style:margin="0"
    style:position="absolute"
    style:height="100%"
    style:left={`${depth * 0.5}rem`}
    style:z-index="2"
  ></div>
{/snippet}

<style>
  button {
    background-color: inherit;
  }
  .force-no-border {
    border-left: none !important;
  }
  .row-icon :global(svg) {
    will-change: transform, opacity;
    backface-visibility: hidden;
    width: var(--size, 1.5rem);
    height: var(--size, 1.5rem);
  }
</style>
