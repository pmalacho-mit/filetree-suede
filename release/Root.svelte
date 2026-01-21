<script lang="ts" module>
  import "overlayscrollbars/overlayscrollbars.css";

  import {
    classified,
    type Classify,
    type WithClassify,
  } from "./utils/classes";

  export const Classes = (classify?: Classify) =>
    classified(classify, {
      container: "root-container",
    });

  export type Props = { model: Root.Model } & WithClassify;

  export { renameIcon, rename };

  class HeightBinder {
    total = $state(0);
    heights = new Array<number>();

    at(index: number) {
      const self = this;
      return {
        get value() {
          return self.heights[index] ?? 0;
        },
        set value(value: number) {
          const current = self.heights[index] ?? 0;
          self.total += value - current;
          self.heights[index] = value;
        },
      };
    }

    trim(length: number) {
      while (this.heights.length > length) {
        const current = this.heights.pop() ?? 0;
        this.total -= current;
      }
    }
  }

  const normalizeWheelDeltaY = (
    { deltaY, deltaMode }: WheelEvent,
    clientHeight: number
  ) => {
    if (deltaMode === 1) deltaY *= 16;
    else if (deltaMode === 2) deltaY *= clientHeight;
    return deltaY;
  };

  type ScrollInstance = ReturnType<ReturnType<typeof useOverlayScrollbars>[1]>;
  const scrollOffset = (instance: ScrollInstance) =>
    instance?.elements().scrollOffsetElement;
  const scrollTop = (instance: ScrollInstance) =>
    scrollOffset(instance)?.scrollTop ?? 0;
</script>

<script lang="ts">
  import { slide } from "svelte/transition";
  import { type Root, Folder, File } from "./";
  import { px } from "./utils";
  import { onMount } from "svelte";
  import { useOverlayScrollbars } from "overlayscrollbars-svelte";

  let { model, classify }: Props = $props();

  const classes = $derived(Classes(classify));

  $effect(() => model.sort());
  $effect(() => model.propagate(model));

  const binder = new HeightBinder();
  $effect(() => binder.trim(model.children.length));

  let container = $state<HTMLElement>();
  let scroll = $state<HTMLElement>();

  let transform = $state(0);
  let containerHeight = $state(0);

  const scrollActive = $derived(binder.total > containerHeight);

  const [initialize, instance] = useOverlayScrollbars(() => ({
    events: {
      scroll: (instance) => (transform = scrollTop(instance)),
    },
  }));

  onMount(() => {
    initialize(scroll!);
  });
</script>

<div
  style:position="relative"
  style:height="100%"
  style:width="100%"
  style:overflow-y="clip"
>
  <button
    bind:this={container}
    bind:clientHeight={containerHeight}
    class={classes.container}
    style:transform={`translateY(${px(-transform)})`}
    style:height="100%"
    style:width="100%"
    style:will-change="transform"
    style:overflow-x="visible"
    style:display="flex"
    style:flex-direction="column"
    style:padding="0rem"
    style:outline="none"
    style:border="none"
    style:z-index="1000"
    oncontextmenu={(event) => {
      event.preventDefault();
    }}
    onwheel={(event) =>
      scrollOffset(instance())?.scrollBy({
        top: normalizeWheelDeltaY(event, containerHeight),
      })}
  >
    {#each model.children as child, index}
      {@const height = binder.at(index)}
      <div
        transition:slide={{ duration: 300 }}
        bind:clientHeight={height.value}
      >
        {#if child.is("folder")}
          <Folder.Component model={child} {classify} />
        {:else}
          <File.Component model={child} {classify} />
        {/if}
      </div>
    {/each}
  </button>

  <div
    bind:this={scroll}
    style:top="0"
    style:left="-4px"
    style:position="absolute"
    style:overflow-y="auto"
    style:overflow-x="visible"
    style:height="100%"
    style:width={scrollActive ? "8px" : "6px"}
    style:transition="opacity 200ms ease-in-out"
    style:opacity={scrollActive ? "1" : "0"}
    style:z-index="0"
    style:direction="rtl"
  >
    <div style:height={px(binder.total)}></div>
  </div>
</div>

{#snippet renameIcon()}
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40974 4.40973 4.7157 4.21799 5.09202C4 5.51985 4 6.0799 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.0799 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V12.5M15.5 5.5L18.3284 8.32843M10.7627 10.2373L17.411 3.58902C18.192 2.80797 19.4584 2.80797 20.2394 3.58902C21.0205 4.37007 21.0205 5.6364 20.2394 6.41745L13.3774 13.2794C12.6158 14.0411 12.235 14.4219 11.8012 14.7247C11.4162 14.9936 11.0009 15.2162 10.564 15.3882C10.0717 15.582 9.54378 15.6885 8.48793 15.9016L8 16L8.04745 15.6678C8.21536 14.4925 8.29932 13.9048 8.49029 13.3561C8.65975 12.8692 8.89125 12.4063 9.17906 11.9786C9.50341 11.4966 9.92319 11.0768 10.7627 10.2373Z"
      stroke="var(--color, currentColor)"
      stroke-width="var(--stroke-width, 1.4)"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/snippet}

{#snippet rename()}
  {@render renameIcon()} Rename
{/snippet}
