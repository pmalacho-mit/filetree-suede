<script lang="ts" module>
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
    map = new WeakMap<File.Model | Folder.Model, number>();
    for(model: File.Model | Folder.Model) {
      const self = this;
      return {
        get value() {
          return self.map.get(model) ?? 0;
        },
        set value(value: number) {
          const current = self.map.get(model) ?? 0;
          self.total += value - current;
          self.map.set(model, value);
        },
      };
    }
  }
</script>

<script lang="ts">
  import { slide } from "svelte/transition";
  import { type Root, Folder, File } from "./";
  import { px } from "./utils";
  import { onDestroy, tick, untrack } from "svelte";

  let { model, classify }: Props = $props();

  const classes = $derived(Classes(classify));

  $effect(() => model.sort());
  $effect(() => model.propagate(model));

  let container = $state<HTMLElement>();
  let scroll = $state<HTMLElement>();

  const binder = new HeightBinder();
  let containerHeight = $state(0);
  let scrollChildWidth = $state(0);
  let widthCandidate = $state(0);

  let scrollSetting = false;

  const expandUntilVisible = async () => {
    let max = 1000;
    let iteration = 0;
    while (scrollChildWidth === 0) {
      widthCandidate++;
      await new Promise(requestAnimationFrame);
      if (iteration++ >= max) break;
    }
  };

  $effect(() => {
    const scrollActive = binder.total > containerHeight;
    if (scrollSetting === scrollActive) return;
    if (scrollActive) {
      untrack(expandUntilVisible);
      scrollSetting = true;
    } else {
      widthCandidate = 0;
      scrollSetting = false;
    }
  });

  let transform = $state(0);

  const clamp = (scroll: number) =>
    Math.max(0, Math.min(scroll, Math.max(0, binder.total - containerHeight)));

  const normalizeWheelDeltaY = ({ deltaY, deltaMode }: WheelEvent) => {
    switch (deltaMode) {
      case 1: // lines
        deltaY *= 16;
        break;
      case 2: // pages
        deltaY *= containerHeight;
        break;
    }
    return deltaY;
  };

  let raf = 0;
  const startSmoothScroll = (target: number) => {
    if (raf) return;

    const step = () => {
      raf = 0;
      if (!scroll) return;

      const current = scroll.scrollTop;
      const diff = target - current;

      // stop when very close
      if (Math.abs(diff) < 0.5) {
        scroll.scrollTop = target;
        return;
      }

      // ease: move a fraction each frame (tweak 0.18–0.35)
      scroll.scrollTop = current + diff * 0.22;

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
  };

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf);
  });

  let scheduled = false;

  const scheduleNativeSmoothScroll = (targetTop: number) => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scroll?.scrollTo({ top: targetTop, behavior: "smooth" });
    });
  };
</script>

<div
  style:height="100%"
  style:width="100%"
  style:position="relative"
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
    onwheel={(event) => {
      const deltaY = normalizeWheelDeltaY(event);
      if (!scroll) return;
      scheduleNativeSmoothScroll(clamp(scroll!.scrollTop + deltaY));
    }}
  >
    {#each model.children as child}
      {@const height = binder.for(child)}
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
    style:left={scrollChildWidth > 0 ? px(-widthCandidate / 2) : "0px"}
    style:position="absolute"
    style:overflow-y="auto"
    style:width={binder.total > containerHeight ? px(widthCandidate) : "0px"}
    style:height="100%"
    style:transition="opacity 100ms ease-in-out"
    style:opacity={scrollChildWidth > 0 ? "1" : "0"}
    style:z-index="0"
    style:direction="rtl"
    onscroll={(event) => (transform = event.currentTarget.scrollTop)}
  >
    <div
      style:height={px(binder.total)}
      bind:clientWidth={scrollChildWidth}
    ></div>
  </div>
</div>

{binder.total}

{scrollChildWidth}

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
