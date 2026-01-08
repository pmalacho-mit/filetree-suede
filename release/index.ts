import FileComponent from "./File.svelte";
import FolderComponent from "./Folder.svelte";
import RootComponent from "./Root.svelte";
import {
  Root as RootModel,
  File as FileModel,
  Symlink as SymlinkModel,
  Folder as FolderModel,
} from "./models.svelte";

export const File = {
  Component: FileComponent,
  Models: {
    File: FileModel,
    Symlink: SymlinkModel,
  },
};

export namespace File {
  export type Model = SymlinkModel | FileModel;
}

export const Folder = {
  Model: FolderModel,
  Component: FolderComponent,
};

export namespace Folder {
  export type Model = FolderModel;
}

export const Root = {
  Model: RootModel,
  Component: RootComponent,
};

export namespace Root {
  export type Model = RootModel;
}
