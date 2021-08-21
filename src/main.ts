// Not ready to roll these out yet
// import "./runmode";
// import "./colorize";
import "./mark-selection";
import {
  App,
  Editor,
  MarkdownView,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import * as codemirror from "codemirror";

// These typescript definitions were pulled from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/codemirror
// I couldn't get the direct TS imports of these working without having the entire CodeMirror code ending up in main.js

declare module "codemirror" {
  interface StyleActiveLine {
    /**
     * Controls whether single-line selections, or just cursor selections, are styled. Defaults to false (only cursor selections).
     */
    nonEmpty: boolean;
  }
  interface EditorConfiguration {
    /**
     * If set to true (the default), will keep the cursor height constant for an entire line (or wrapped part of a line).
     * When false, the cursor's height is based on the height of the adjacent reference character.
     */
    singleCursorHeightPerLine?: boolean;
    /**
     * Causes the selected text to be marked with the CSS class CodeMirror-selectedtext or a custom class when the styleSelectedText option is enabled.
     * Useful to change the colour of the selection (in addition to the background).
     */
    styleSelectedText?: boolean | string | undefined;
    /**
     * When enabled gives the wrapper of the line that contains the cursor the class CodeMirror-activeline,
     * adds a background with the class CodeMirror-activeline-background, and adds the class CodeMirror-activeline-gutter to the line's gutter space is enabled.
     */
    styleActiveLine?: StyleActiveLine | boolean | undefined;
  }
  function colorize(
    collection?: ArrayLike<Element>,
    defaultMode?: string
  ): void;
}

export default class ObsidianCodeMirrorOptionsPlugin extends Plugin {
  settings: ObsidianCodeMirrorOptionsSettings;

  async onload() {
    console.log("loading Obsidian CodeMirror Options plugin");

    // load settings
    this.settings =
      (await this.loadData()) || new ObsidianCodeMirrorOptionsSettings();

    // add the settings tab
    this.addSettingTab(
      new ObsidianCodeMirrorOptionsSettingsTab(this.app, this)
    );

    this.app.workspace.onLayoutReady(() => {
      this.setCodeMirrorOption(
        "styleSelectedText",
        this.settings.markSelection
      );
      this.setCodeMirrorOption(
        "singleCursorHeightPerLine",
        this.settings.dynamicCursor
      );
      this.setCodeMirrorOption(
        "styleActiveLine",
        this.settings.activeLineOnSelect
      );
    });
  }

  onunload() {
    console.log("unloading RTL plugin");
    this.app.workspace.iterateCodeMirrors((cm) => {
      cm.setOption(
        "styleSelectedText",
		// @ts-ignore
        CodeMirror.defaults["styleSelectedText"]
      );
      cm.setOption(
        "singleCursorHeightPerLine",
      	// @ts-ignore
		CodeMirror.defaults["singleCursorHeightPerLine"]
      );
      cm.setOption("styleActiveLine", true);
    });
  }

  getObsidianEditor(): Editor {
    let view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) return view.editor;
    return null;
  }

  getCmEditor(): codemirror.Editor {
    let view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) return view.sourceMode?.cmEditor;
    return null;
  }

  // TODO: fix the gross conditionals in here
  setCodeMirrorOption(optionKey: any, optionValue: any) {
    var cmEditor = this.getCmEditor();
    // styleActiveLine requires an object to set the behavior we want
    if (optionKey === "styleActiveLine") {
      if (optionValue === true) {
        optionValue = { nonEmpty: true };
      } else {
        // @ts-ignore
        optionValue = true;
      }
    }
    // we want to pass the opposite boolean to what is chosen in settings
    if (optionKey === "singleCursorHeightPerLine") {
      if (optionValue === true) {
        optionValue = false;
      } else {
        optionValue = true;
      }
    }
    if (cmEditor && cmEditor.getOption(optionKey) != optionValue) {
      cmEditor.setOption(optionKey, optionValue);
    }
  }
}

class ObsidianCodeMirrorOptionsSettings {
  dynamicCursor: boolean = true;
  markSelection: boolean = true;
  activeLineOnSelect: boolean = true;
  enableCMinPreview: boolean = true;
}

class ObsidianCodeMirrorOptionsSettingsTab extends PluginSettingTab {
  plugin: ObsidianCodeMirrorOptionsPlugin;

  constructor(app: App, plugin: ObsidianCodeMirrorOptionsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "CodeMirror Options" });

    new Setting(containerEl)
      .setName("Dynamic cursor size")
      .setDesc(
        "When set to false (the default), the cursor height will be determined by the max height of the entire line. When true, the cursor's height is based on the height of the adjacent reference character."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.dynamicCursor)
          .onChange((value) => {
            this.plugin.settings.dynamicCursor = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.setCodeMirrorOption("singleCursorHeightPerLine", value);
          })
      );

    new Setting(containerEl)
      .setName("Style active selection")
      .setDesc(
        "Causes the selected text to be marked with the CSS class CodeMirror-selectedtext when the styleSelectedText option is enabled. Useful to change the colour of the selection (in addition to the background)."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.markSelection)
          .onChange((value) => {
            this.plugin.settings.markSelection = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.setCodeMirrorOption("styleSelectedText", value);
          })
      );

    new Setting(containerEl)
      .setName("Maintain active line on select")
      .setDesc(
        "When set to false, selecting text on the active line will remove the .active-line class. When set to true, text selection will not remove the .active-line class."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.activeLineOnSelect)
          .onChange((value) => {
            this.plugin.settings.activeLineOnSelect = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.setCodeMirrorOption("styleActiveLine", value);
          })
      );

	// COMING SOON
    // new Setting(containerEl)
    //   .setName("CM in Preview")
    //   .setDesc("Foo")
    //   .addToggle((toggle) =>
    //     toggle
    //       .setValue(this.plugin.settings.enableCMinPreview)
    //       .onChange((value) => {
    //         this.plugin.settings.enableCMinPreview = value;
    //         this.plugin.saveData(this.plugin.settings);
    //         this.plugin.setCodeMirrorOption("singleCursorHeightPerLine", value);
    //       })
    //   );
  }
}
