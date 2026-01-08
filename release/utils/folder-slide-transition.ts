import { defer, type Deferred } from ".";

const easeInOut = {
  id: "ease-in-out",
  t: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

const easeOut = {
  id: "ease-out",
  t: (t: number) => 1 - Math.pow(1 - t, 3),
};

const linear = {
  id: "linear",
  t: (t: number) => t,
};

export default class FolderSlideTransition {
  private version = Number.MIN_SAFE_INTEGER;
  private inflight?: number;

  get height() {
    const { children, scrollHeight } = this.element;
    return children[0]?.getBoundingClientRect().height ?? scrollHeight;
  }

  constructor(private element: HTMLElement) {
    this.element = element;
    const { style } = this.element;
    style.willChange = "max-height";
    style.overflow = "hidden";
  }

  initialHeight(opening: boolean) {
    const { height, inflight } = this;
    const now = performance.now();
    this.inflight = now;

    if (inflight === undefined) return opening ? 0 : height;

    const delta = now - inflight;
    const elapsedRatio = Math.min(delta / FolderSlideTransition.DurationMs, 1);
    const t = easeInOut.t(elapsedRatio);

    return opening ? height * (1 - t) : height * t;
  }

  fire<Condition extends boolean>(
    opening: Condition,
    deferred?: Deferred<void>,
    recursive = false as never
  ): Deferred {
    deferred ??= defer<void>();
    const { style, children } = this.element;
    if (!children[0] && !recursive) {
      requestAnimationFrame(() => this.fire(opening, deferred, true as never));
      return deferred;
    }

    const version = ++this.version;
    style.maxHeight = `${this.initialHeight(opening)}px`;
    style.transition = "none";
    const desired = opening ? children[0].getBoundingClientRect().height : 0;
    requestAnimationFrame(() => {
      style.transition = FolderSlideTransition.Transition;
      style.maxHeight = `${desired}px`;
    });

    if (opening) {
      const unset = () => {
        if (this.version === version) style.maxHeight = "none";
        this.element.removeEventListener("transitionend", unset);
        deferred.resolve();
      };
      this.element.addEventListener("transitionend", unset);
    } else deferred.resolve();

    return deferred;
  }

  public static DurationMs = 1000;
  private static Transition = `max-height ${FolderSlideTransition.DurationMs}ms ${easeInOut.id}`;
}
