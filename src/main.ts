/* eslint-disable @typescript-eslint/ban-ts-comment */
import assertNever from "assert-never";
import { ObsidianCodeMirrorOptionsSettings, ObsidianCodeMirrorOptionsSettingsTab } from "./settings";
import "./runmode";
import "./colorize";
import "./mark-selection";
import "./active-line";

import "./hmd-core";
import "./hmd-click";
import "./hmd-hide-token";
import "./hmd-mode";
import "./hmd-fold";
import "./hmd-fold-link";
import "./hmd-fold-image";
import "./hmd-fold-code";
import "./hmd-fold-html";
import "./hmd-fold-code-with-admonition";
import "./hmd-fold-code-with-chart";
import "./hmd-fold-code-with-query";
import "./hmd-fold-code-with-dataview";
import "./hmd-fold-code-with-tasks";
import "./hmd-fold-embed";
import "./hmd-fold-emoji";
import "./hmd-fold-math";
import "./hmd-table-align";

import { init_math_preview, unload_math_preview } from "./math-preview";
import { onRenderLine } from "./container-attributes";
import { DEFAULT_SETTINGS } from "./settings";
import {
  MarkdownView,
  MarkdownPreviewRenderer,
  Plugin,
  Menu,
  TFile,
  EditorPosition,
  debounce,
  MarkdownSourceView,
} from "obsidian";

import type codemirror from "codemirror";
import { EditorConfiguration } from "codemirror";
import { around } from "monkey-around";

declare module "obsidian" {
  interface MarkdownSourceView {
    attachDomEvents(): void;
  }
  export interface Workspace extends Events {
    on(name: "initial-file-load", callback: (file, contentEl, editor, leaf) => any): EventRef;
    on(name: "editor-close", callback: (file, contentEl, editor, leaf) => any): EventRef;
    on(name: "file-unload", callback: (file, contentEl, editor, leaf) => any): EventRef;
  }
}

declare module "codemirror" {
  // These typescript definitions were pulled from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/codemirror
  // I couldn't get the direct TS imports of these working without having the entire CodeMirror library ending up in main.js

  interface StyleActiveLine {
    /**
     * Controls whether single-line selections, or just cursor selections, are styled. Defaults to false (only cursor selections).
     */
    nonEmpty: boolean;
  }
  interface LineHandle {
    text: string;
    lineNo: () => number;
    styleClasses: { textClass: string };
    styles: any[];
    markedSpans: string | any[];
    stateAfter: { listStack: string | any[] };
  }
  interface TextMarker {
    lines: any;
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
    hmdFold?: any;
    hmdHideToken?: boolean | string | undefined;
    hmdTableAlign?: boolean | string | undefined;
    hmdFoldCode?: any;
    /**
     * When enabled gives the wrapper of the line that contains the cursor the class CodeMirror-activeline,
     * adds a background with the class CodeMirror-activeline-background, and adds the class CodeMirror-activeline-gutter to the line's gutter space is enabled.
     */
    styleActiveLine?: StyleActiveLine | boolean | undefined;
  }
  interface Editor extends Doc {
    foldCode(pos: EditorPosition, options, force: string): void;
    breakMark(cm: CodeMirror.Editor, marker: CodeMirror.MarkerRange, chOffset?: number): void;
    editor: CodeMirror.Editor;
    marker: CodeMirror.MarkerRange;
  }
  function colorize(collection?: ArrayLike<Element>, defaultMode?: string, showLineNums?: boolean): void;
}

export default class ObsidianCodeMirrorOptionsPlugin extends Plugin {
  settings: ObsidianCodeMirrorOptionsSettings;

  async onload() {
    // patch the default Obsidian methods, ASAP
    //@ts-ignore
    if (this.app.vault.getConfig("legacyEditor")) this.applyMonkeyPatches();

    // load settings
    await this.loadSettings();

    // add the settings tab
    this.addSettingTab(new ObsidianCodeMirrorOptionsSettingsTab(this.app, this));
    //@ts-ignore
    if (this.app.vault.getConfig("legacyEditor")) {
      // initial-file-load is a custom event emitted by a patched MarkdownView.onLoadFile
      this.registerEvent(this.app.workspace.on("initial-file-load", this.onFileLoad));

      // file-unload is a custom event emitted by a patched MarkdownView.onUnloadFile
      this.registerEvent(this.app.workspace.on("file-unload", this.onFileUnload));

      // editor-close is a custom event emitted by a patched MarkdownView.onClose
      this.registerEvent(this.app.workspace.on("editor-close", this.onEditorClose));

      this.app.workspace.onLayoutReady(() => {
        this.registerCodeMirrorSettings();
        this.registerCommands();
        setTimeout(() => {
          // workaround to ensure our plugin registers properly with Style Settings
          this.app.workspace.trigger("css-change");
        }, 1000);
      });
      document.on("contextmenu", `img.hmd-image`, this.onImageContextMenu, false);
      document.on("contextmenu", `.rendered-widget img:not(.hmd-image)`, this.onImageContextMenu, false);
    }
    this.app.workspace.onLayoutReady(() => {
      this.applyBodyClasses();
      setTimeout(() => {
        // workaround to ensure our plugin registers properly with Style Settings
        this.app.workspace.trigger("css-change");
      }, 1000);
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  onImageContextMenu = (event: MouseEvent, target: HTMLElement) => {
    // the "editor-menu" event does not include the MouseEvent or the target HTMLElement
    // so instead, we create this stanadard context menu event handler and hook it into
    // the "editor-menu" event temporarily
    const boundFunc = this.onEditorMenu.bind(this, target);
    this.app.workspace.on("editor-menu", boundFunc);
    setTimeout(() => {
      this.app.workspace.off("editor-menu", boundFunc);
    }, 100);
  };

  onEditorMenu = (target: HTMLElement, menu: Menu) => {
    let file;
    if (target.dataset.path) {
      file = this.app.vault.getAbstractFileByPath(target.dataset.path);
      if (!(file instanceof TFile)) return;
    } else if (/^http/i.test(target.getAttribute("src"))) {
      file = target.getAttribute("src");
    }
    if (file) this.addContextMenuItem(menu, file);
  };

  addContextMenuItem = (menu: Menu, imageFile: TFile | string) => {
    menu.addItem(menuItem => {
      menuItem.setTitle("Copy Image to Clipboard");
      menuItem.setIcon("image-file");
      menuItem.onClick(async () => {
        let blob: Blob;
        if (imageFile instanceof TFile) {
          const buffer = await this.app.vault.adapter.readBinary(imageFile.path);
          const arr = new Uint8Array(buffer);
          blob = new Blob([arr], { type: "image/png" });
        } else {
          blob = await (await fetch(imageFile)).blob();
        }
        //@ts-ignore
        const item = new ClipboardItem({ "image/png": blob });
        //@ts-ignore
        window.navigator.clipboard.write([item]);
      });
    });
  };

  onFileLoad = (file, contentEl, editor, leaf) => {
    editor.state.fileName = file.path;
    if (this.settings.showBacklinks) {
      this.addBackLinks(file, editor, leaf);
    }
  };

  onFileUnload = (file, contentEl, editor, leaf) => {
    try {
      this.resetCodeMirrorState(file, contentEl, editor);
      editor.doc.clearHistory();
      editor.clearGutter("CodeMirror-foldgutter");
      this.hideMathPreview();
    } catch {
      // console.log("unable to clear editor");
    }
  };

  onEditorClose = (file, contentEl, editor, leaf) => {
    this.removeBackLinks(editor);
    this.unsetCodeMirrorOptions(editor);
    setTimeout(() => {
      try {
        editor.display.renderedView = [];
        editor.display.lineDiv?.empty();
        editor.display.currentWheelTarget?.empty();
        editor.display = null;
        editor.blockHTMLObserver.disconnect();
        editor.blockHTMLObserver = null;
        Object.keys(editor._handlers).forEach(handler => (editor._handlers[handler] = null));
      } catch {}
    }, 500);
  };

  resetCodeMirrorState(file, contentEl, editor) {
    // remove any attributes and styles created by the Container Attributes feature
    if (contentEl) {
      Object.keys(contentEl.dataset).forEach(el => contentEl.removeAttribute("data-" + el));
      contentEl.style = null;
    }
    // add the current file path to the CodeMirror state for access by native CM methods
    editor.hmd.Fold.clearAll();
    editor.hmd.FoldCode.clearAll();
  }

  removeBackLinks(editor) {
    if (editor.backlinksWidget) {
      editor.backlinksWidget.unload();
      editor.display.lineDiv.parentElement.removeChild(editor.backlinksWidget.contentEl);
      editor.backlinksWidget = null;
    }
  }

  removeBacklinksImmediately() {
    try {
      //@ts-ignore
      this.app.workspace.iterateRootLeaves(leaf => this.removeBackLinks(leaf.view.editor.cm));
    } catch (err) {
      // console.log(err);
    }
  }

  addBacklinksImmediately() {
    try {
      //@ts-ignore
      this.app.workspace.iterateRootLeaves(leaf => this.addBackLinks(leaf.view.file, leaf.view.editor.cm, leaf));
    } catch {}
  }

  addBackLinks(file, editor, leaf) {
    if (!editor.backlinksWidget) {
      //@ts-ignore
      editor.backlinksWidget = this.app.viewRegistry.getViewCreatorByType("backlink")(leaf);
      (editor.backlinksWidget.contentEl as HTMLElement).setAttribute("cm-ignore-events", "true");
      editor.display.lineDiv.parentElement.appendChild(editor.backlinksWidget.contentEl);
    }
    editor.backlinksWidget.backlink.update = function () {
      const e = file;
      this.backlinkFile !== e && this.recomputeBacklink(e), this.unlinkedFile !== e && this.recomputeUnlinked(e);
      this.updateHeaderTooltip(this.backlinkHeaderEl, this.backlinkCollapsed),
        this.updateHeaderTooltip(this.unlinkedHeaderEl, this.unlinkedCollapsed);
    };
    if (!editor.backlinksWidget._loaded) {
      editor.backlinksWidget.load();
    }
  }

  hideMathPreview() {
    const previewEl = document.querySelector("#math-preview") as HTMLElement;
    if (previewEl && !previewEl.hasClass("float-win-hidden")) {
      previewEl.addClass("float-win-hidden");
    }
  }

  applyMonkeyPatches() {
    // patching onLoadFile to clear CM specific state in order to avoid fold related memory leaks
    // we also add the current file name to the CM state so that CM native actions have a reference
    const patchFileLifecycle = around(MarkdownView.prototype, {
      onLoadFile(old) {
        return function (file) {
          try {
            this.app.workspace.trigger("initial-file-load", file, this.contentEl, this.editor.cm, this.leaf);
          } catch {}
          return old.call(this, file);
        };
      },
      // @ts-ignore
      onUnloadFile(old) {
        return function (file) {
          const result = old.call(this);
          try {
            this.app.workspace.trigger("file-unload", this.file, this.contentEl, this.editor.cm, this.leaf);
          } catch {}
          return result;
        };
      },
      // @ts-ignore
      onClose(old) {
        return function () {
          try {
            this.app.workspace.trigger("editor-close", this.file, this.contentEl, this.editor.cm, this.leaf);
          } catch {}
          return old.call(this);
        };
      },
    });
    this.register(patchFileLifecycle);

    // patch the preview mode click handlers so that we get preview context menus on edit mode rendered widgets
    const patchSourceView = around(MarkdownSourceView.prototype, {
      attachDomEvents(old) {
        return function () {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          const _this = this,
            editorEl = this.editorEl;
          editorEl.addEventListener("mousedown", this.onCodeMirrorMousedown.bind(this)),
            editorEl.addEventListener(
              "contextmenu",
              function (event) {
                if (
                  event &&
                  event.path.length &&
                  event.path.filter(el => el.hasClass && el.hasClass("rendered-widget")).length &&
                  event.path[0].tagName !== "IMG"
                ) {
                  return;
                }
                return _this.clipboardManager.onContextMenu(event);
              },
              { capture: true }
            ),
            editorEl.on("mouseover", ".cm-hmd-internal-link", this.onInternalLinkMouseover.bind(this));
        };
      },
    });
    this.register(patchSourceView);
    const patchRenderer = around(MarkdownPreviewRenderer.prototype, {
      onInternalLinkContextMenu(old) {
        return function (event, el) {
          const href = this.getInternalLinkHref(el);
          href && this.owner.onInternalLinkRightClick(event, el, href);
        };
      },
      onResize(old) {
        return function () {
          setTimeout(() => {
            const editor = this.owner.app.workspace.activeLeaf?.view?.sourceMode?.editorEl;
            if (editor && !this.widgetHandlersRegistered && this.owner.type === "preview") {
              this.widgetHandlersRegistered = true;
              editor.on("click", ".rendered-widget a.internal-link", this.onInternalLinkClick.bind(this));
              editor.on("auxclick", ".rendered-widget a.internal-link", this.onInternalLinkClick.bind(this));
              editor.on("contextmenu", ".rendered-widget a.internal-link", this.onInternalLinkContextMenu.bind(this));
              // editor.on("mouseover", ".rendered-widget a.internal-link", this.onInternalLinkMouseover.bind(this));
              editor.on("click", ".rendered-widget a.external-link", this.onExternalLinkClick.bind(this));
              editor.on("click", ".rendered-widget a.footnote-link", this.onFootnoteLinkClick.bind(this));
              editor.on("click", ".rendered-widget .task-list-item-checkbox", this.onCheckboxClick.bind(this));
              editor.on("click", ".rendered-widget a.tag", this.onTagClick.bind(this));
              editor.on("click", ".rendered-widget a.internal-query", this.onInternalQueryClick.bind(this));
              editor.on(
                "click",
                ".rendered-widget .heading-collapse-indicator",
                this.onHeadingCollapseClick.bind(this)
              );
              editor.on("click", ".rendered-widget li > .list-collapse-indicator", this.onListCollapseClick.bind(this));
              // editor.on("click", ".rendered-widget img", this.onImageClick.bind(this));
            }
          }, 100);
          return old.call(this);
        };
      },
      belongsToMe(old) {
        return function (el) {
          // save the original element so we can pass it to the original method
          const _el = el;
          // check to see if the element is a sibling of a rendered widget
          for (; el; ) {
            if (el.hasClass("rendered-widget") && el.tagName !== "IMG") {
              return true;
            }
            const parentEl = el.parentElement;
            if (!parentEl) return old.call(this, _el);
            el = parentEl;
          }
        };
      },
    });
    this.register(patchRenderer);
  }

  getHmdOptions(type: "hmdFold" | "hmdFoldCode") {
    switch (type) {
      case "hmdFold":
        return {
          image: this.settings.foldImages,
          link: this.settings.foldLinks,
          html: this.settings.renderHTML,
          code: this.settings.renderCode,
          math: this.settings.renderMath,
          embed: this.settings.renderEmbeds,
          emoji: this.settings.renderEmoji,
        };
      case "hmdFoldCode":
        return {
          admonition: this.settings.renderAdmonition,
          chart: this.settings.renderChart,
          query: this.settings.renderQuery,
          dataview: this.settings.renderDataview,
          tasks: this.settings.renderTasks,
        };
      default:
        assertNever(type);
    }
  }
  updateHmdOptions(type: Parameters<typeof this["getHmdOptions"]>[0]) {
    return this.updateCodeMirrorOption(type, this.getHmdOptions(type));
  }

  registerCommands() {
    this.addCommand({
      id: "toggle-openmd",
      name: "Toggle OpenMD Mode",
      callback: () => {
        this.settings.enableOpenMD = !this.settings.enableOpenMD;
        this.saveData(this.settings);
        this.updateCodeMirrorOption("mode", this.settings.enableOpenMD ? "openmd" : "hypermd");
      },
    });
    this.addCommand({
      id: "toggle-hide-tokens",
      name: "Toggle Hide Markdown Tokens",
      callback: () => {
        this.settings.editModeHideTokens = !this.settings.editModeHideTokens;
        this.saveData(this.settings);
        this.updateCodeMirrorOption("hmdHideToken", this.settings.editModeHideTokens ? this.settings.tokenList : false);
        this.applyBodyClasses();
      },
    });
    this.addCommand({
      id: "toggle-click-handler",
      name: "Toggle Edit Mode Click Handler",
      callback: () => {
        this.settings.editModeClickHandler = !this.settings.editModeClickHandler;
        this.saveData(this.settings);
        this.updateCodeMirrorOption("hmdClick", this.settings.editModeClickHandler);
      },
    });

    this.addCommand({
      id: "toggle-collapse-links",
      name: "Toggle Collapse External Links",
      callback: () => {
        this.settings.foldLinks = !this.settings.foldLinks;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFold");
      },
    });
    this.addCommand({
      id: "toggle-render-images-inline",
      name: "Toggle Render Images Inline",
      callback: () => {
        this.settings.foldImages = !this.settings.foldImages;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFold");
      },
    });
    this.addCommand({
      id: "toggle-render-html",
      name: "Toggle Render HTML",
      callback: () => {
        this.settings.renderHTML = !this.settings.renderHTML;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFold");
      },
    });
    this.addCommand({
      id: "toggle-render-embeds",
      name: "Toggle Render Embeds",
      callback: () => {
        this.settings.renderEmbeds = !this.settings.renderEmbeds;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFold");
      },
    });
    this.addCommand({
      id: "toggle-render-math",
      name: "Toggle Render Math",
      callback: () => {
        this.settings.renderMath = !this.settings.renderMath;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFold");
      },
    });
    this.addCommand({
      id: "toggle-render-math-preview",
      name: "Toggle Render Math Preview",
      callback: () => {
        this.settings.renderMathPreview = !this.settings.renderMathPreview;
        this.saveData(this.settings);
        this.applyBodyClasses();
        if (this.settings.renderMathPreview) {
          this.app.workspace.iterateCodeMirrors(cm => {
            init_math_preview(cm);
          });
        } else {
          const previewEl = document.querySelector("#math-preview");
          if (previewEl) {
            document.querySelector("#math-preview").detach();
          }
          this.app.workspace.iterateCodeMirrors(cm => {
            unload_math_preview(cm);
          });
        }
      },
    });
    this.addCommand({
      id: "toggle-render-code",
      name: "Toggle Render Code",
      callback: () => {
        this.settings.renderCode = !this.settings.renderCode;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFold");
      },
    });
    this.addCommand({
      id: "toggle-render-dataview",
      name: "Toggle Render Dataview",
      callback: () => {
        this.settings.renderDataview = !this.settings.renderDataview;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFoldCode");
      },
    });
    this.addCommand({
      id: "toggle-render-chart",
      name: "Toggle Render Charts",
      callback: () => {
        this.settings.renderChart = !this.settings.renderChart;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFoldCode");
      },
    });
    this.addCommand({
      id: "toggle-render-admonition",
      name: "Toggle Render Admonitions",
      callback: () => {
        this.settings.renderAdmonition = !this.settings.renderAdmonition;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFoldCode");
      },
    });
    this.addCommand({
      id: "toggle-render-query",
      name: "Toggle Render Search Queries",
      callback: () => {
        this.settings.renderQuery = !this.settings.renderQuery;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFoldCode");
      },
    });
    this.addCommand({
      id: "toggle-render-tasks",
      name: "Toggle Render Tasks",
      callback: () => {
        this.settings.renderTasks = !this.settings.renderTasks;
        this.saveData(this.settings);
        this.applyBodyClasses();
        this.updateHmdOptions("hmdFoldCode");
      },
    });
    this.addCommand({
      id: "toggle-backlinks-in-editor",
      name: "Toggle Backlinks in Editor",
      callback: () => {
        this.settings.showBacklinks = !this.settings.showBacklinks;
        this.saveData(this.settings);
        this.settings.showBacklinks ? this.addBacklinksImmediately() : this.removeBacklinksImmediately();
      },
    });
    this.addCommand({
      id: "toggle-container-attributes",
      name: "Toggle Container Attributes",
      callback: () => {
        this.settings.containerAttributes = !this.settings.containerAttributes;
        this.saveData(this.settings);
        this.updateCodeMirrorHandlers("renderLine", this.onRenderLineBound, this.settings.containerAttributes, true);
      },
    });
    this.addCommand({
      id: "toggle-dynamic-cursor-size",
      name: "Toggle Dynamic Cursor Size",
      callback: () => {
        this.settings.dynamicCursor = !this.settings.dynamicCursor;
        this.saveData(this.settings);
        this.updateCodeMirrorOption("singleCursorHeightPerLine", !this.settings.dynamicCursor);
      },
    });
    this.addCommand({
      id: "toggle-style-active-selection",
      name: "Toggle Style Active Selection",
      callback: () => {
        this.settings.markSelection = !this.settings.markSelection;
        this.saveData(this.settings);
        this.updateCodeMirrorOption("styleSelectedText", this.settings.markSelection);
        this.applyBodyClasses();
      },
    });
    this.addCommand({
      id: "toggle-retain-active-line",
      name: "Toggle Retain Active Line on Selection",
      callback: () => {
        this.settings.activeLineOnSelect = !this.settings.activeLineOnSelect;
        this.saveData(this.settings);
        this.updateCodeMirrorOption("styleActiveLine", this.settings.activeLineOnSelect ? { nonEmpty: true } : true);
      },
    });
    this.addCommand({
      id: "toggle-edit-mode-syntax",
      name: "Toggle Edit Mode Syntax Highlighting",
      callback: () => {
        this.settings.syntaxHighlighting = !this.settings.syntaxHighlighting;
        this.saveData(this.settings);
        this.applyBodyClasses(true);
      },
    });
    this.addCommand({
      id: "toggle-preview-mode-syntax",
      name: "Toggle Preview Mode Syntax Highlighting",
      callback: () => {
        this.settings.enablePrismJSStyling = !this.settings.enablePrismJSStyling;
        this.saveData(this.settings);
        this.applyBodyClasses(true);
      },
    });
    this.addCommand({
      id: "toggle-codemirror-in-preview-mode",
      name: "Toggle CodeMirror in Preview Mode",
      callback: () => {
        this.settings.enableCMinPreview = !this.settings.enableCMinPreview;
        this.saveData(this.settings);
        this.applyBodyClasses(true);
      },
    });
    this.addCommand({
      id: "toggle-cm-line-numbers-in-preview-mode",
      name: "Toggle CM Line Numbers in Preview Mode",
      callback: () => {
        this.settings.showLineNums = !this.settings.showLineNums;
        this.saveData(this.settings);
        this.applyBodyClasses(true);
      },
    });
    this.addCommand({
      id: "toggle-cm-copy-button-in-preview-mode",
      name: "Toggle Copy Button in Preview Mode",
      callback: () => {
        this.settings.copyButton = !this.settings.copyButton;
        this.saveData(this.settings);
        this.applyBodyClasses(true);
      },
    });
    this.addCommand({
      id: "toggle-auto-align-table",
      name: "Toggle Auto Align Tables",
      callback: () => {
        this.settings.autoAlignTables = !this.settings.autoAlignTables;
        this.saveData(this.settings);
        this.updateCodeMirrorOption("hmdTableAlign", this.settings.autoAlignTables);
      },
    });
  }

  mdProcessor = async (el: HTMLElement) => {
    setTimeout(() => {
      this.injectCM(el);
    }, 100);
  };

  injectCM(el: HTMLElement) {
    // only get code block elements with a language but not any that have already been colorized
    const preElement = el.firstChild as HTMLElement;
    const codeElement = el.firstChild?.firstChild as HTMLElement;
    if (!codeElement) return;
    if (codeElement.tagName !== "CODE") return;
    // TODO: Add an option to configure excluded languages
    if (codeElement.hasClass("language-mermaid")) return;
    if (!codeElement.classList.value.includes("language-")) {
      if (this.settings.copyButtonOnPRE) {
        this.addCopyButton(preElement);
      }
      return;
    }
    if (preElement.classList.value.includes("cm-s-obsidian")) return;
    codeElement.classList.forEach((className: string) => {
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
        codeElement.setAttribute("data-lang", language);
      }
    });
    //@ts-ignore
    CodeMirror.colorize([codeElement], null, this.settings.showLineNums);
    preElement.querySelector(".copy-code-button").remove();
    this.addCopyButton(preElement);
  }

  addCopyButton(element: HTMLElement) {
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
        const codeText = clone.textContent.trim();
        window.navigator.clipboard.writeText(codeText);
        copyButton.innerText = "Copied";
        setTimeout(function () {
          copyButton.innerText = "Copy";
        }, 4000);
      });
    }
  }

  registerCodeMirrorSettings() {
    this.registerCodeMirror(cm => {
      cm.setOption("styleSelectedText", this.settings.markSelection);
      cm.setOption("singleCursorHeightPerLine", !this.settings.dynamicCursor);
      cm.setOption("styleActiveLine", this.settings.activeLineOnSelect ? { nonEmpty: true } : true);
      if (this.settings.enableOpenMD) cm.setOption("mode", "openmd");
      cm.setOption("hmdHideToken", this.settings.editModeHideTokens ? this.settings.tokenList : false);
      cm.setOption("hmdClick", this.settings.editModeClickHandler);
      cm.setOption("hmdTableAlign", this.settings.autoAlignTables);
      cm.setOption("cursorBlinkRate", this.settings.cursorBlinkRate);
      cm.setOption("hmdFold", this.getHmdOptions("hmdFold"));
      cm.setOption("hmdFoldCode", this.getHmdOptions("hmdFoldCode"));
      if (this.settings.renderMathPreview) init_math_preview(cm);
      if (this.settings.containerAttributes)
        this.updateCodeMirrorHandlers("renderLine", this.onRenderLineBound, true, true);
    });
  }

  onRenderLineBound = onRenderLine.bind(this);

  onImageClick = args => {
    args.breakMark(args.editor, args.marker);
  };

  applyBodyClasses(refresh = false) {
    this.settings.editModeHideTokens
      ? !document.body.hasClass("hide-tokens")
        ? document.body.addClass("hide-tokens")
        : null
      : document.body.removeClass("hide-tokens");
    this.settings.styleCheckBox
      ? !document.body.hasClass("style-check-box")
        ? document.body.addClass("style-check-box")
        : null
      : document.body.removeClass("style-check-box");
    this.settings.markSelection
      ? !document.body.hasClass("style-active-selection")
        ? document.body.addClass("style-active-selection")
        : null
      : document.body.removeClass("style-active-selection");
    this.settings.enablePrismJSStyling
      ? !document.body.hasClass("fallback-highlighting")
        ? document.body.addClass("fallback-highlighting")
        : null
      : document.body.removeClass("fallback-highlighting");
    this.settings.showLineNums
      ? !document.body.hasClass("cm-show-line-nums")
        ? document.body.addClass("cm-show-line-nums")
        : null
      : document.body.removeClass("cm-show-line-nums");
    this.settings.copyButtonOnPRE
      ? !document.body.hasClass("cm-show-copy-button-on-pre")
        ? document.body.addClass("cm-show-copy-button-on-pre")
        : null
      : document.body.removeClass("cm-show-copy-button-on-pre");
    this.settings.syntaxHighlighting
      ? !document.body.hasClass("unified-cm-highlighting")
        ? document.body.addClass("unified-cm-highlighting")
        : null
      : document.body.removeClass("unified-cm-highlighting");
    this.settings.foldImages
      ? !document.body.hasClass("cm-render-images-inline")
        ? document.body.addClass("cm-render-images-inline")
        : null
      : document.body.removeClass("cm-render-images-inline");
    this.settings.foldLinks
      ? !document.body.hasClass("cm-collapse-external-links")
        ? document.body.addClass("cm-collapse-external-links")
        : null
      : document.body.removeClass("cm-collapse-external-links");
    this.settings.renderBanner
      ? !document.body.hasClass("cm-render-banners")
        ? document.body.addClass("cm-render-banners")
        : null
      : document.body.removeClass("cm-render-banners");
    this.settings.enableCMinPreview
      ? this.registerMarkdownPostProcessor(this.mdProcessor)
      : MarkdownPreviewRenderer.unregisterPostProcessor(this.mdProcessor);
    if (refresh) this.refreshPanes();
  }

  unsetCodeMirrorOptions(cm) {
    cm.setOption("styleSelectedText", false);
    cm.setOption("singleCursorHeightPerLine", true);
    cm.setOption("styleActiveLine", true);
    cm.setOption("mode", "hypermd");
    cm.setOption("hmdHideToken", false);
    cm.setOption("hmdFold", { image: false, link: false, html: false, code: false, math: false, emoji: false });
    cm.setOption("hmdTableAlign", false);
    cm.setOption("hmdClick", false);
    cm.setOption("cursorBlinkRate", 530);
    cm.off("renderLine", this.onRenderLineBound);
    unload_math_preview(cm);
    // cm.off("imageClicked", this.onImageClick);
    cm.refresh();
  }

  unsetAllCodeMirrorOptions() {
    this.app.workspace.iterateCodeMirrors(cm => {
      // revert CodeMirror options back to the CM/Obsidian defaults
      try {
        //@ts-ignore
        cm.hmd.Fold.clearAll();
        //@ts-ignore
        cm.hmd.FoldCode.clearAll();
      } catch {}
      this.unsetCodeMirrorOptions(cm);
    });
    document.body.classList.remove("style-active-selection", "style-check-box", "hide-tokens", "fallback-highlighting");
    document.body.classList.remove("cm-render-banners", "cm-collapse-external-links", "cm-render-images-inline");
    document.body.classList.remove("unified-cm-highlighting", "cm-show-copy-button-on-pre", "cm-show-line-nums");
  }

  refreshPanes() {
    this.app.workspace.getLeavesOfType("markdown").forEach(leaf => {
      if (leaf.view instanceof MarkdownView) {
        leaf.view.previewMode.rerender(true);
      }
    });
  }

  getActiveCmEditor(): codemirror.Editor {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    //@ts-ignore
    if (view) return view.sourceMode?.cmEditor;
    return null;
  }

  updateCodeMirrorOption = debounce(
    (optionKey: keyof EditorConfiguration, optionValue: any, refresh = false) => {
      this.app.workspace.iterateCodeMirrors(cm => {
        if (cm && cm.getOption(optionKey) != optionValue) {
          cm.setOption(optionKey, optionValue);
          if (refresh) cm.refresh();
        }
      });
    },
    400,
    true
  );

  updateCodeMirrorHandlers = debounce(
    (eventType: string, callback: any, enable = true, refresh = false) => {
      this.app.workspace.iterateCodeMirrors(cm => {
        if (enable) cm.on(eventType, callback);
        else cm.off(eventType, callback);
        if (refresh) cm.refresh();
      });
    },
    0,
    true
  );

  onunload() {
    this.unsetAllCodeMirrorOptions();
    MarkdownPreviewRenderer.unregisterPostProcessor(this.mdProcessor);
    this.refreshPanes();
    document.off("contextmenu", `img.hmd-image`, this.onImageContextMenu, false);
    document.off("contextmenu", `.rendered-widget img:not(.hmd-image)`, this.onImageContextMenu, false);
  }
}
