<script lang="ts">
  import { Sweater } from "./sweater-vest-suede";
  import { Root, File } from "../../release";

  class Pocket {
    root = new Root.Model();
    fontSize = 14;
  }

  class WithID extends File.Model {
    id = Math.random().toString(36).substring(2, 10);
  }
</script>

<Sweater
  body={async ({ set }) => {
    const root = Root.Model.Initialize(
      {
        root: (Ctor) => new Ctor({ readonly: false }),
      },
      "example.txt",
      [
        "Documents",
        [
          "a.txt",
          "notes.md",
          ["Photos", ["image.png"]],
          [
            "Videos",
            [
              "video.mp4",
              [
                "Clips",
                ["clip.avi", "clip2.avi", ["subs", ["sub1.srt", "sub2.srt"]]],
              ],
            ],
          ],
        ],
      ],
      "todo.txt",
      ["Music", ["song.mp3"]],
      ["Music", ["song.mp3"]],
      ["Music", ["song.mp3", ["Album", ["track1.mp3", "track2.mp3"]]]],
    );

    set({ root });
    root.subscribe({
      "child add finalized": (entry) => {
        console.log("Added:", entry.name);
        if (entry.is("file")) entry.fire("request focus toggle");
      },
      "child clicked": (child) => {
        if (child.is("folder")) child.fire("request expansion toggle", "local");
        else if (child.is("file")) {
          child.fire("request focus toggle");
        }
      },
    });
  }}
>
  {#snippet vest({ root }: { root: Root.Model })}
    <div style="display: flex; flex-direction: row; align-items: flex-start;">
      <div
        style="width: 100px; height: 200px; margin: 8px; border: 1px solid black;"
      >
        <Root.DefaultStyle
          model={root}
          --color="grey"
          --background-color="white"
          --font-size={"1rem"}
        />
      </div>
      <div
        style="width: 100px; margin: 8px; height: 100px; background-color: blue;"
      >
        <button onclick={() => root.add(new WithID({ parent: root }))}></button>
      </div>
    </div>
  {/snippet}
</Sweater>
