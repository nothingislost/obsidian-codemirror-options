/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ObsidianCodeMirrorOptionsSettings, ObsidianCodeMirrorOptionsSettingsTab } from "./settings";
import "./runmode";
import "./colorize";
import "./mark-selection";
import "./active-line";
import { MarkdownView, MarkdownPreviewRenderer, Plugin } from "obsidian";
// import * as codemirror from "codemirror";
import type codemirror from "codemirror";
import { EditorConfiguration } from "codemirror";

declare module "codemirror" {
  // These typescript definitions were pulled from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/codemirror
  // I couldn't get the direct TS imports of these working without having the entire CodeMirror library ending up in main.js

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
  function colorize(collection?: ArrayLike<Element>, defaultMode?: string): void;
}

export default class ObsidianCodeMirrorOptionsPlugin extends Plugin {
  settings: ObsidianCodeMirrorOptionsSettings;

  async onload() {
    // load settings
    this.settings = (await this.loadData()) || new ObsidianCodeMirrorOptionsSettings();

    // add the settings tab
    this.addSettingTab(new ObsidianCodeMirrorOptionsSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.applyCodeMirrorOptions();
      this.toggleHighlighting();

      if (this.settings.enableCMinPreview) {
        this.toggleHighlighting();
        setTimeout(() => {
          // we wait 1 second here since the prism.js rendering of code blocks is delayed on load
          // this will force the CM injection after 1 second, only on startup
          this.app.workspace.iterateRootLeaves(leaf => {
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
    });
  };

  injectCM(el: HTMLElement) {
    // only get code block elements with a language but not any that have already been colorized
    const elements = el.querySelectorAll("pre[class*=language-]:not(.cm-s-obsidian)");
    if (elements.length) {
      elements.forEach((element: HTMLElement) => {
        element.classList.forEach((className: string) => {
          if (className.startsWith("language-")) {
            // set data-lang to the code block language for easier colorize usage
            element.setAttribute("data-lang", className.replace("language-", ""));
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
    this.setCodeMirrorOption("singleCursorHeightPerLine", this.settings.dynamicCursor);
    this.setCodeMirrorOption("styleActiveLine", this.settings.activeLineOnSelect);
    if (this.settings.markSelection) {
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
    this.app.workspace.iterateCodeMirrors(cm => {
      // revert CodeMirror options back to the CM/Obsidian defaults
      cm.setOption("styleSelectedText", false);
      cm.setOption("singleCursorHeightPerLine", true);
      cm.setOption("styleActiveLine", true);
    });
  }

  refreshPanes() {
    this.app.workspace.getLeavesOfType("markdown").forEach(leaf => {
      if (leaf.view instanceof MarkdownView && leaf.view.getMode() === 'preview') {
        leaf.view.previewMode.rerender(true);
      }
    });
  }

  getCmEditor(): codemirror.Editor {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) return view.sourceMode?.cmEditor;
    return null;
  }

  setCodeMirrorOption(optionKey: keyof EditorConfiguration, optionValue: boolean | Record<string, unknown>) {
    const cmEditor = this.getCmEditor();
    // styleActiveLine requires an object to set the behavior we want
    if (optionKey === "styleActiveLine") optionValue = optionValue === true ? { nonEmpty: true } : true;
    // we want to pass the opposite boolean to what is chosen in settings
    if (optionKey === "singleCursorHeightPerLine") optionValue = !optionValue;
    if (cmEditor && cmEditor.getOption(optionKey) != optionValue) {
      cmEditor.setOption(optionKey, optionValue);
    }
  }

  onunload() {
    this.unsetCodeMirrorOptions();
    MarkdownPreviewRenderer.unregisterPostProcessor(this.mdProcessor);
    this.refreshPanes();
  }
}
