import "./runmode";
import "./colorize";
import "./mark-selection";
import {
  App,
  MarkdownView,
  MarkdownPreviewRenderer,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import * as codemirror from "codemirror";

declare module "codemirror" {
  // These typescript definitions were pulled from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/codemirror
  // I couldn't get the direct TS imports of these working without having the entire CodeMirror code ending up in main.js

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
      this.applyCodeMirrorOptions();
      this.toggleHighlighting();

      if (this.settings.enableCMinPreview) {
        this.toggleHighlighting();
        // we wait 1 second here since prism.js rendering of code blocks is delayed on load
        // this will force the CM injection only on startup
        setTimeout(() => {
          // this is here due to https://github.com/mgmeyers/obsidian-style-settings/issues/22
          // triggering css-change ensures our settings show up in Style Settings
          this.app.workspace.trigger("css-change");
          this.app.workspace.iterateRootLeaves((leaf) => {
            this.injectCM(leaf.view.containerEl);
          });
        }, 1000);
      }
    });

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.applyCodeMirrorOptions();
      })
    );
  } // close onload

  mdProcessor = (el: HTMLElement) => {
    setTimeout(() => {
      this.injectCM(el);
    }, 0);
  };

  injectCM(el: any) {
    let elements = el.querySelectorAll("pre[class*=language-]:not(.cm-s-obsidian)");
    if (elements.length) {
      elements.forEach((element: HTMLElement) => {
        element.classList.forEach((className: string) => {
          if (className.startsWith("language-")) {
            element.setAttribute(
              "data-lang",
              className.replace("language-", "")
            );
          }
        });
      });
      //@ts-ignore
      CodeMirror.colorize(elements);
    }
  }

  toggleHighlighting() {
    if (this.settings.enableCMinPreview) {
      document.body.addClass("unified-cm-highlighting");
      this.registerMarkdownPostProcessor(this.mdProcessor);
      this.refreshPanes();
    } else {
      document.body.removeClass("unified-cm-highlighting");
      MarkdownPreviewRenderer.unregisterPostProcessor(this.mdProcessor);
      this.refreshPanes();
    }
  }

  applyCodeMirrorOptions() {
    this.setCodeMirrorOption("styleSelectedText", this.settings.markSelection);
    this.setCodeMirrorOption(
      "singleCursorHeightPerLine",
      this.settings.dynamicCursor
    );
    this.setCodeMirrorOption(
      "styleActiveLine",
      this.settings.activeLineOnSelect
    );
    if (this.settings.activeLineOnSelect) {
      document.body.addClass("style-active-selection");
    } else {
      document.body.removeClass("style-active-selection");
    }
    if (this.settings.enablePrismJSStyling) {
      document.body.addClass("fallback-highlighting");
    } else {
      document.body.removeClass("fallback-highlighting");
    }
  }

  unsetCodeMirrorOptions() {
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

  refreshPanes() {
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      if (leaf.getViewState().state.mode.includes("preview"))
        //@ts-ignore
        leaf.view.previewMode.rerender(true);
    });
  }

  getCmEditor(): codemirror.Editor {
    let view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) return view.sourceMode?.cmEditor;
    return null;
  }

  setCodeMirrorOption(optionKey: any, optionValue: any) {
    var cmEditor = this.getCmEditor();
    // styleActiveLine requires an object to set the behavior we want
    if (optionKey === "styleActiveLine") {
      optionValue = optionValue === true ? { nonEmpty: true } : true;
    }
    // we want to pass the opposite boolean to what is chosen in settings
    if (optionKey === "singleCursorHeightPerLine") optionValue = !optionValue;

    if (cmEditor && cmEditor.getOption(optionKey) != optionValue) {
      cmEditor.setOption(optionKey, optionValue);
    }
  }

  onunload() {
    console.log("unloading Obsidian CodeMirror Options plugin");
    this.unsetCodeMirrorOptions();
    MarkdownPreviewRenderer.unregisterPostProcessor(this.mdProcessor);
    this.refreshPanes();
  }
}

class ObsidianCodeMirrorOptionsSettings {
  dynamicCursor: boolean = false;
  markSelection: boolean = false;
  activeLineOnSelect: boolean = false;
  enableCMinPreview: boolean = false;
  enablePrismJSStyling: boolean = false;
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
        "When enabled, the cursor height will be determined by the max height of the entire line. When disabled, the cursor's height is based on the height of the adjacent reference character."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.dynamicCursor)
          .onChange((value) => {
            this.plugin.settings.dynamicCursor = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.applyCodeMirrorOptions();
          })
      );

    new Setting(containerEl)
      .setName("Style active selection")
      .setDesc(
        "When enabled, selected text will be marked with the CSS class .CodeMirror-selectedtext. Useful to force the styling of selected text when ::selection is not sufficient."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.markSelection)
          .onChange((value) => {
            this.plugin.settings.markSelection = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.applyCodeMirrorOptions();
          })
      );

    new Setting(containerEl)
      .setName("Retain active line on selection")
      .setDesc(
        "When enabled, text selection will not remove the .active-line class on the current line. When disabled text selection on the active line will remove the .active-line class."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.activeLineOnSelect)
          .onChange((value) => {
            this.plugin.settings.activeLineOnSelect = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.applyCodeMirrorOptions();
          })
      );
    if (
      (this.app as any).plugins.plugins[
        "cm-editor-syntax-highlight-obsidian"
      ]
    ) {
      new Setting(containerEl)
        .setName("Use CodeMirror for syntax highlighting in preview mode")
        .setDesc(
          'This setting creates consistent highlighting between edit and preview by using CodeMirror to highlight in both modes. Note: This setting requires the "Editor Syntax Highlight" plugin to function properly.'
        )
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.enableCMinPreview)
            .onChange((value) => {
              this.plugin.settings.enableCMinPreview = value;
              this.plugin.saveData(this.plugin.settings);
              // TODO: make this toggle styling properly
              this.plugin.toggleHighlighting();
            })
        );
    } else {
      new Setting(containerEl)
        .setName("Use CodeMirror for syntax highlighting in preview mode")
        .setDesc(
          'Warning: Install the plugin "Editor Syntax Highlight" in order to use this feature'
        )
        .setClass('cm-warning');
    }

    new Setting(containerEl)
      .setName("Fallback: Unify the default prism.js code block styling")
      .setDesc(
        "This setting is a fallback option if you do not want to inject CM into preview mode. It will try and unify the prism.js colors to match CM as close as possible."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enablePrismJSStyling)
          .onChange((value) => {
            this.plugin.settings.enablePrismJSStyling = value;
            this.plugin.saveData(this.plugin.settings);
            // TODO: make this toggle styling properly
            this.plugin.applyCodeMirrorOptions();
          })
      );
    containerEl.createEl("h4", {
      text: 'To customize the syntax highlighting theme, install the Style Settings plugin and explore the "CodeMirror Options" section',
    });
  }
}
