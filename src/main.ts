/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ObsidianCodeMirrorOptionsSettings, ObsidianCodeMirrorOptionsSettingsTab } from "./settings";
import "./runmode";
import "./colorize";
import "./mark-selection";
import "./active-line";

import "./hmd-core";
import "./hmd-click";
import "./hmd-hide-token";

import { MarkdownView, MarkdownPreviewRenderer, Plugin } from "obsidian";
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
    hmdClick?: boolean | string | undefined;
    hmdHideToken?: boolean | string | undefined;
    /**
     * When enabled gives the wrapper of the line that contains the cursor the class CodeMirror-activeline,
     * adds a background with the class CodeMirror-activeline-background, and adds the class CodeMirror-activeline-gutter to the line's gutter space is enabled.
     */
    styleActiveLine?: StyleActiveLine | boolean | undefined;
  }
  function colorize(collection?: ArrayLike<Element>, defaultMode?: string, showLineNums?: boolean): void;
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
      this.toggleCodeBlockSettings();

      if (this.settings.enableCMinPreview) {
        setTimeout(() => {
          // we wait 1 second here since the prism.js rendering of code blocks is delayed on load
          // this will force the CM injection after 1 second, only on startup
          this.refreshPanes();
        }, 1000);
      }
    });

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.applyCodeMirrorOptions();
      })
    );
  } // close onload

  mdProcessor = async (el: HTMLElement) => {
    setTimeout(() => {
      this.injectCM(el);
    }, 0);
  };

  injectCM(el: HTMLElement) {
    // only get code block elements with a language but not any that have already been colorized
    const element = el.firstChild as HTMLElement;
    if (!element) return;
    if (element.tagName !== "PRE") return;
    if (!element.classList.value.includes("language-")) return;
    if (element.classList.value.includes("cm-s-obsidian")) return;
    element.classList.forEach((className: string) => {
      if (className.startsWith("language-")) {
        // set data-lang to the code block language for easier colorize usage
        let language = className.replace("language-", "");
        switch (language) {
          case "html":
            language = "htmlmixed";
            break;
          case "js":
            language = "javascript";
            break;
          case "json":
            language = "javascript";
            break;
        }
        element.setAttribute("data-lang", language);
      }
    });
    //@ts-ignore
    CodeMirror.colorize([element], null, this.settings.showLineNums);
    if (this.settings.copyButton) {
      const codeBlock = element;
      const copyButton = document.createElement("button");
      copyButton.className = "copy";
      copyButton.type = "button";
      // copyButton.ariaLabel = 'Copy code to clipboard';
      copyButton.innerText = "Copy";
      codeBlock.append(copyButton);
      copyButton.addEventListener("click", function () {
        // exclude line numbers when copying code to clipboard
        const code = codeBlock.querySelector("code");
        const clone = code.cloneNode(true) as HTMLElement;
        clone.findAll("span.cm-linenumber").forEach(e => e.remove());
        const codeText = clone.textContent;
        window.navigator.clipboard.writeText(codeText);
        copyButton.innerText = "Copied";
        setTimeout(function () {
          copyButton.innerText = "Copy";
        }, 4000);
      });
    }
  }

  toggleCodeBlockSettings() {
    if (this.settings.showLineNums) {
      document.body.addClass("cm-show-line-nums");
      this.refreshPanes();
    } else {
      document.body.removeClass("cm-show-line-nums");
      this.refreshPanes();
    }
    if (this.settings.copyButton) {
      this.refreshPanes();
    } else {
      this.refreshPanes();
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
    this.setCodeMirrorOption("hmdHideToken", this.settings.editModeHideTokens);
    this.setCodeMirrorOption("hmdClick", this.settings.editModeClickHandler);
    if (this.settings.editModeHideTokens) {
      document.body.addClass("hide-tokens");
    } else {
      document.body.removeClass("hide-tokens");
    }
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
      cm.setOption("hmdHideToken", false);
      cm.setOption("hmdClick", false);
    });
  }

  refreshPanes() {
    this.app.workspace.getLeavesOfType("markdown").forEach(leaf => {
      if (leaf.view instanceof MarkdownView) {
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
