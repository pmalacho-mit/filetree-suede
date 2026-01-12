<script lang="ts" module>
  import { File, Folder } from "..";
  import { ContextMenu } from "../context";
  import { type Snippet } from "svelte";
  import { EditableName } from "../name";
  import { type WithClassify, type Classify, classified } from "../Root.svelte";
  import type { MouseEventHandler } from "svelte/elements";

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

  class Elements {
    container = $state<HTMLElement>();
    name = $state<HTMLElement>();
    children = $state<HTMLElement>();
    overflow = $state<HTMLElement>();
  }

  const tryCreateOverflowTooltip = (
    { children, name }: Pick<Elements, "children" | "name">,
    nameView: EditableName
  ) => {
    let instance: ReturnType<EditableName["tryShowNameOverflow"]>;
    const destroy: MouseEventHandler<HTMLButtonElement> = (event) => {
      if (event.relatedTarget !== instance?.component.element())
        instance?.destroy();
    };
    name!.addEventListener("mouseleave", destroy as any, {
      once: true,
    });
    instance = nameView.tryShowNameOverflow(
      () => {
        children?.classList.add(Classes()["overflow-hover"]);
      },
      () => {
        children?.classList.remove(Classes()["overflow-hover"]);
      }
    );
  };
</script>

<script lang="ts">
  import type { Events } from "../models.svelte";

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

  const elements = new Elements();
  let container = $state<HTMLElement>();

  $effect(() =>
    (model as Events.WithItemEvents).subscribe({
      "request focus toggle": () => (focused = !focused),
    })
  );
</script>

<ContextMenu
  {model}
  target={elements.container}
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
      bind:this={elements.children}
      class={`${classes.children} ${classes.depth(depth)}`}
      style:position="relative"
      style:height="fit-content"
      style:width="100%"
      style:overflow-x="visible"
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
    bind:this={elements.name}
    class={focused ? `${classes.focused} ${classes.name}` : classes.name}
    onclick={() => (model as Events.WithItemEvents).fire("clicked", model)}
    style:order="1"
    style:position="relative"
    style:width="100%"
    style:margin="0"
    style:padding="0"
    style:border="none"
    style:font-size="inherit"
    onmouseenter={() => tryCreateOverflowTooltip(elements, nameView!)}
  >
    <span
      class={classes.indentation}
      class:force-no-border={depth === 0}
      style:position="relative"
      style:display="flex"
      style:background-color="transparent"
      style:flex-direction="row"
      style:align-items="center"
      style:margin={`0 0 0 ${depth * 0.5}rem`}
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
      <EditableName
        bind:this={nameView}
        {model}
        {classify}
        overflowCreationTarget={elements.overflow}
      />
    </span>
    <div bind:this={elements.overflow} style:position="absolute"></div>
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
  .row-name:hover {
    min-width: 100% !important;
    width: fit-content !important;
  }

  .row-name:hover + .row-children {
    overflow-x: visible !important;
    width: fit-content !important;
  }

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
