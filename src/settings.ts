/* eslint-disable @typescript-eslint/ban-ts-comment */
import ObsidianCodeMirrorOptionsPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { init_math_preview, unload_math_preview } from "./math-preview";

export class ObsidianCodeMirrorOptionsSettings {
  dynamicCursor: boolean;
  markSelection: boolean;
  activeLineOnSelect: boolean;
  enableCMinPreview: boolean;
  enablePrismJSStyling: boolean;
  editModeHideTokens: boolean;
  editModeClickHandler: boolean;
  showLineNums: boolean;
  copyButton: boolean;
  copyButtonOnPRE: boolean;
  enableOpenMD: boolean;
  cursorBlinkRate: number;
  foldLinks: boolean;
  foldImages: boolean;
  tokenList: string;
  containerAttributes: boolean;
  syntaxHighlighting: boolean;
  autoAlignTables: boolean;
  renderHTML: boolean;
  renderCode: boolean;
  renderChart: boolean;
  renderAdmonition: boolean;
  renderQuery: boolean;
  renderDataview: boolean;
  renderMath: boolean;
  renderMathPreview: boolean;
  renderBanner: boolean;
  renderTasks: boolean;
  renderEmbeds: boolean;
  renderEmoji: boolean;
  showBacklinks: boolean;
  styleCheckBox: boolean;
  allowedYamlKeys: string;
}

export const DEFAULT_SETTINGS: ObsidianCodeMirrorOptionsSettings = {
  dynamicCursor: false,
  markSelection: false,
  activeLineOnSelect: false,
  enableCMinPreview: false,
  enablePrismJSStyling: false,
  editModeHideTokens: false,
  editModeClickHandler: false,
  showLineNums: false,
  copyButton: false,
  copyButtonOnPRE: false,
  enableOpenMD: false,
  cursorBlinkRate: 530,
  foldLinks: false,
  foldImages: false,
  containerAttributes: false,
  syntaxHighlighting: false,
  autoAlignTables: false,
  renderCode: false,
  renderHTML: false,
  renderChart: false,
  renderAdmonition: false,
  renderQuery: false,
  renderDataview: false,
  renderMath: false,
  renderMathPreview: false,
  renderBanner: false,
  renderEmbeds: false,
  renderEmoji: false,
  renderTasks: false,
  showBacklinks: false,
  styleCheckBox: true,
  allowedYamlKeys: "document-font-size",
  tokenList: "em|strong|strikethrough|code|linkText|task|internalLink|highlight",
};

export class ObsidianCodeMirrorOptionsSettingsTab extends PluginSettingTab {
  plugin: ObsidianCodeMirrorOptionsPlugin;

  constructor(app: App, plugin: ObsidianCodeMirrorOptionsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("codemirror-options-settings");
    let tokenSettings;

    if (!(this.app.vault as any).getConfig("legacyEditor")) {
      containerEl.createEl("h3", {
        text: "⚠️ Notice: Most of this plugin does not function when Live Preview mode is enabled.",
      });
    }

    if ((this.app.vault as any).getConfig("legacyEditor")) {
      containerEl.createEl("h3", {
        text: "Markdown Parsing",
      });
      new Setting(containerEl)
        .setName("⚠️ Hide Markdown Tokens")
        .setDesc(
          `Emulate WYSIWYG while editing by hiding markdown tokens. Markdown tokens will automatically hide once the cursor leaves the element.
         This mode will apply the class .hmd-inactive-line to all inactive lines and the class .hmd-hidden-token to all hidden tokens.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.editModeHideTokens).onChange(value => {
            this.plugin.settings.editModeHideTokens = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption(
              "hmdHideToken",
              this.plugin.settings.editModeHideTokens ? this.plugin.settings.tokenList : false
            );
            this.plugin.applyBodyClasses();
            // hide the token list if the hide tokens setting is disabled
            this.plugin.settings.editModeHideTokens
              ? tokenSettings.settingEl.removeClass("setting-disabled")
              : tokenSettings.settingEl.addClass("setting-disabled");
          })
        );

      tokenSettings = new Setting(this.containerEl)
        .setName("⚠️ Token List")
        .setDesc(
          `These markdown token types will be hidden. The default value will hide all currently supported tokens.
         Values must be pipe delimted with no spaces. Available options are: em|strong|strikethrough|code|linkText|task|internalLink|highlight`
        )
        .setClass("token-list-setting")
        .addText(textfield => {
          textfield.setPlaceholder(String("em|strong|strikethrough|code|linkText|task|internalLink|highlight"));
          textfield.inputEl.type = "text";
          textfield.setValue(String(this.plugin.settings.tokenList));
          textfield.onChange(async value => {
            this.plugin.settings.tokenList = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption(
              "hmdHideToken",
              this.plugin.settings.editModeHideTokens ? this.plugin.settings.tokenList : false,
              true
            );
          });
        });

      new Setting(containerEl)
        .setName("⚠️ Enable OpenMD Mode")
        .setDesc(
          `Completely replace the HyperMD CodeMirror mode with a modified version of HyperMD that aims to
                replicate the default Obsidian edit mode parser while adding additional functionality such as
                improved internal link parsing.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.enableOpenMD).onChange(value => {
            this.plugin.settings.enableOpenMD = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption("mode", this.plugin.settings.enableOpenMD ? "openmd" : "hypermd");
          })
        );

      new Setting(containerEl)
        .setName("⚠️ Collapse External Links")
        .setDesc(
          `This will collapse external links in edit mode so that the URL is hidden and only the link text is shown. 
                The full URL will display once you click into the link text.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.foldLinks).onChange(value => {
            this.plugin.settings.foldLinks = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.applyBodyClasses();
            this.plugin.updateHmdOptions("hmdFold");
          })
        );

      new Setting(containerEl)
        .setName("⚠️ Render Images Inline")
        .setDesc(
          `This will render images in edit mode inline. Clicking on the image will collapse the image down to its source view.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.foldImages).onChange(value => {
            this.plugin.settings.foldImages = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.applyBodyClasses();
            this.plugin.updateHmdOptions("hmdFold");
          })
        );
      new Setting(containerEl)
        .setName("Edit Mode Click Handler")
        .setDesc(`Allow mouse clicks to toggle checkboxes in edit mode.`)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.editModeClickHandler).onChange(value => {
            this.plugin.settings.editModeClickHandler = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption("hmdClick", this.plugin.settings.editModeClickHandler);
          })
        );
      new Setting(containerEl)
        .setName("Style Checkboxes")
        .setDesc(
          `Disable this if you want to do your own styling of edit mode checkboxes. This setting does nothing if Hide Markdown Tokens is disabled`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.styleCheckBox).onChange(value => {
            this.plugin.settings.styleCheckBox = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.applyBodyClasses();
          })
        );
      containerEl.createEl("h3", {
        text: "Edit Mode Code Rendering",
      });
      new Setting(containerEl)
        .setName("⚠️⚠️ Render Embeds")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderEmbeds).onChange(value => {
            this.plugin.settings.renderEmbeds = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFold");
          })
        );
      new Setting(containerEl)
        .setName("Render HTML")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderHTML).onChange(value => {
            this.plugin.settings.renderHTML = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFold");
          })
        );
      new Setting(containerEl)
        .setName("Render Math")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderMath).onChange(value => {
            this.plugin.settings.renderMath = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFold");
          })
        );
      new Setting(containerEl)
        .setName("Render Math Preview")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderMathPreview).onChange(value => {
            this.plugin.settings.renderMathPreview = value;
            this.plugin.saveData(this.plugin.settings);
            if (this.plugin.settings.renderMathPreview) {
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
          })
        );
      new Setting(containerEl)
        .setName("Render Emoji/Icon Shortcodes")
        .setDesc(
          createFragment(el => {
            el.appendText(`Render emoji/icon `);
            el.createEl("code", { text: ":shortcodes:" });
            el.appendText(` inline.`);
            el.createEl("br");
            el.createEl("a", {
              href: "https://github.com/aidenlx/obsidian-icon-shortcodes",
              text: "Icon Shortcodes v0.4.1+",
            });
            el.appendText(" Required. ");
          })
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderEmoji).onChange(value => {
            this.plugin.settings.renderEmoji = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.applyBodyClasses();
            this.app.workspace.iterateCodeMirrors(cm => {
              cm.refresh();
            });
          })
        );
      new Setting(containerEl)
        .setName("Render Code Blocks")
        .setDesc(`If this is disabled, none of the options below will do anything`)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderCode).onChange(value => {
            this.plugin.settings.renderCode = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFold");
          })
        );
      new Setting(containerEl)
        .setName("Render Admonitions")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderAdmonition).onChange(value => {
            this.plugin.settings.renderAdmonition = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFoldCode");
          })
        );
      new Setting(containerEl)
        .setName("Render Charts")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderChart).onChange(value => {
            this.plugin.settings.renderChart = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFoldCode");
          })
        );
      new Setting(containerEl)
        .setName("Render Embedded Search")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderQuery).onChange(value => {
            this.plugin.settings.renderQuery = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFoldCode");
          })
        );
      new Setting(containerEl)
        .setName("Render Dataview")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderDataview).onChange(value => {
            this.plugin.settings.renderDataview = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFoldCode");
          })
        );
      new Setting(containerEl)
        .setName("Render Tasks")
        .setDesc(``)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderTasks).onChange(value => {
            this.plugin.settings.renderTasks = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateHmdOptions("hmdFoldCode");
          })
        );
      new Setting(containerEl)
        .setName("Render Banners")
        .setDesc(`This settings requires that the "Container Attributes" setting is enabled`)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.renderBanner).onChange(value => {
            this.plugin.settings.renderBanner = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.applyBodyClasses();
            this.app.workspace.iterateCodeMirrors(cm => {
              cm.refresh();
            });
          })
        );

      containerEl.createEl("h3", {
        text: "Visual Styling",
      });
      new Setting(containerEl)
        .setName("Show Backlinks in Editor")
        .setDesc(`Append a backlinks component to the footer of edit mode documents`)
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.showBacklinks).onChange(value => {
            this.plugin.settings.showBacklinks = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.settings.showBacklinks
              ? this.plugin.addBacklinksImmediately()
              : this.plugin.removeBacklinksImmediately();
            // this.plugin.updateCodeMirrorHandlers("renderLine", this.plugin.onRenderLineBound, value, true);
          })
        );
      new Setting(containerEl)
        .setName("Container Attributes")
        .setDesc(
          `Apply data attributes to the CodeMirror line div elements that describe the contained child elements. Think of
      this like Contextual Typography for Edit Mode.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.containerAttributes).onChange(value => {
            this.plugin.settings.containerAttributes = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorHandlers("renderLine", this.plugin.onRenderLineBound, value, true);
          })
        );
      const frontMatterValuesSettings = new Setting(this.containerEl)
        .setName("⚠️ Allowed Front Matter Keys")
        .setDesc(
          `A comma seperated list of front matter keys to turn into CSS variables and data attributes. This setting requires that the Container Attributes setting is enabled.`
        )
        .setClass("frontmatter-key-list-setting")
        .addText(textfield => {
          textfield.setPlaceholder(String(""));
          textfield.inputEl.type = "text";
          textfield.setValue(String(this.plugin.settings.allowedYamlKeys));
          textfield.onChange(async value => {
            this.plugin.settings.allowedYamlKeys = value;
            this.plugin.saveData(this.plugin.settings);
          });
        });
      new Setting(containerEl)
        .setName("Auto Align Tables")
        .setDesc(
          `Automatically align markdown tables as they are being built. Note: This setting currently requires that OpenMD Mode be enabled.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.autoAlignTables).onChange(value => {
            this.plugin.settings.autoAlignTables = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption("hmdTableAlign", this.plugin.settings.autoAlignTables);
          })
        );

      new Setting(containerEl)
        .setName("Dynamic cursor size")
        .setDesc(
          `When enabled, the cursor height will be determined by the max height of the entire line. 
         When disabled, the cursor's height is based on the height of the adjacent reference character.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.dynamicCursor).onChange(value => {
            this.plugin.settings.dynamicCursor = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption("singleCursorHeightPerLine", !this.plugin.settings.dynamicCursor);
          })
        );

      new Setting(containerEl)
        .setName("Style active selection")
        .setDesc(
          `When enabled, selected text will be marked with the CSS class .CodeMirror-selectedtext. 
         Useful to force the styling of selected text when ::selection is not sufficient.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.markSelection).onChange(value => {
            this.plugin.settings.markSelection = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption("styleSelectedText", this.plugin.settings.markSelection);
            this.plugin.applyBodyClasses();
          })
        );

      new Setting(containerEl)
        .setName("Retain active line on selection")
        .setDesc(
          `When enabled, text selection will not remove the .active-line class on the current line. 
         When disabled text selection on the active line will remove the .active-line class.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.activeLineOnSelect).onChange(value => {
            this.plugin.settings.activeLineOnSelect = value;
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption(
              "styleActiveLine",
              this.plugin.settings.activeLineOnSelect ? { nonEmpty: true } : true
            );
          })
        );

      new Setting(containerEl)
        .setName("Cursor Blink Rate")
        .setDesc(`Value is in milliseconds. Default is 530. Set to 0 to disable blinking.`)
        .addText(textfield => {
          textfield.setPlaceholder(String(530));
          textfield.inputEl.type = "number";
          textfield.setValue(String(this.plugin.settings.cursorBlinkRate));
          textfield.onChange(async value => {
            this.plugin.settings.cursorBlinkRate = Number(value);
            this.plugin.saveData(this.plugin.settings);
            this.plugin.updateCodeMirrorOption("cursorBlinkRate", this.plugin.settings.cursorBlinkRate);
          });
        });
    }
    containerEl.createEl("h3", {
      text: "Syntax Highlighting",
    });
    let lineNums, copyButton, copyButtonPre;

    new Setting(containerEl)
      .setName("Enable Edit Mode Syntax Highlighting Themes")
      .setDesc(
        `Apply syntax highlighting themes to code blocks in edit mode. The default theme is Material Pale Night
                but additional themes are available via the Style Settings plugin`
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.syntaxHighlighting).onChange(value => {
          this.plugin.settings.syntaxHighlighting = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.applyBodyClasses(true);
        })
      );
    new Setting(containerEl)
      .setName("Enable Preview Mode Syntax Highlighting Themes")
      .setDesc(
        `Apply syntax highlighting themes to code blocks in preview mode. The default theme is Material Pale Night
        but additional themes are available via the Style Settings plugin`
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.enablePrismJSStyling).onChange(value => {
          this.plugin.settings.enablePrismJSStyling = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.applyBodyClasses(true);
        })
      );
    new Setting(containerEl)
      .setName("Use CodeMirror for syntax highlighting in preview mode")
      .setDesc(
        `This setting creates consistent highlighting between edit and preview by using CodeMirror to highlight code in both modes.`
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.enableCMinPreview).onChange(value => {
          this.plugin.settings.enableCMinPreview = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.applyBodyClasses(true);
          this.plugin.settings.enableCMinPreview
            ? (lineNums.settingEl.removeClass("setting-disabled"),
              copyButton.settingEl.removeClass("setting-disabled"),
              copyButtonPre.settingEl.removeClass("setting-disabled"))
            : (lineNums.settingEl.addClass("setting-disabled"),
              copyButton.settingEl.addClass("setting-disabled"),
              copyButtonPre.settingEl.addClass("setting-disabled"));
        })
      );
    lineNums = new Setting(containerEl)
      .setName("⚠️ Show line numbers for code blocks in preview mode")
      .setDesc(`This setting will add line numbers to code blocks in preview mode.`)
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.showLineNums).onChange(value => {
          this.plugin.settings.showLineNums = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.applyBodyClasses(true);
        })
      );
    copyButton = new Setting(containerEl)
      .setName("Enable copy button to code blocks in preview mode")
      .setDesc(
        `This setting will add a copy button to the bottom left corner of code blocks in preview mode. The button will show up on code block hover.`
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.copyButton).onChange(value => {
          this.plugin.settings.copyButton = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.applyBodyClasses(true);
        })
      );
    copyButtonPre = new Setting(containerEl)
      .setName("⚠️ Enable copy button to all PRE blocks in preview mode")
      .setDesc(
        `This setting will add a copy button to any PRE element. This could negatively impact certain plugins that render PRE blocks.`
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.copyButtonOnPRE).onChange(value => {
          this.plugin.settings.copyButtonOnPRE = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.applyBodyClasses(true);
        })
      );
    containerEl.createEl("h3", {
      text: "Syntax Highlighting Theme",
    });
    new Setting(containerEl)
      .setName("Refer to the Style Settings plugin")
      .setDesc(
        `To customize the syntax highlighting theme, 
    install the Style Settings plugin and expand the "CodeMirror Options" section`
      )
      .setClass("info");

    // update dynamic setting visibility
    this.plugin.settings.editModeHideTokens
      ? tokenSettings?.settingEl.removeClass("setting-disabled")
      : tokenSettings?.settingEl.addClass("setting-disabled");
    this.plugin.settings.enableCMinPreview
      ? (lineNums?.settingEl.removeClass("setting-disabled"),
        copyButton?.settingEl.removeClass("setting-disabled"),
        copyButtonPre?.settingEl.removeClass("setting-disabled"))
      : (lineNums?.settingEl.addClass("setting-disabled"),
        copyButton?.settingEl.addClass("setting-disabled"),
        copyButtonPre?.settingEl.addClass("setting-disabled"));
  }
}
