<script lang="ts">
  import { Sweater } from "./sweater-vest-suede";
  import { File, Folder, Root } from "../../release";

  class Pocket {
    root = new Root.Model();
    fontSize = 14;
  }
</script>

<Sweater
  body={async ({ set }) => {
    const root = Root.Model.From(
      "example.txt",
      [
        "Documents",
        [
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
      ["Music", ["song.mp3"]]
    );

    set({ root });
    root.subscribe({
      "child clicked": (child) => {
        if (child.is("folder")) child.fire("request expansion toggle", "local");
        else if (child.is("file") || child.is("symlink")) {
          child.fire("request focus toggle");
        }
      },
    });
  }}
>
  {#snippet vest({ root }: { root: Root.Model })}
    <div style="display: flex; flex-direction: row; align-items: flex-start;">
      <div style="width: 100px; margin: 8px; border: 1px solid black;">
        <Root.DefaultStyle
          model={root}
          --background-color="white"
          --text-color="black"
          --font-size={"1rem"}
        />
      </div>
      <div
        style="width: 100px; margin: 8px; height: 100px; background-color: blue;"
      ></div>
    </div>
  {/snippet}
</Sweater>
