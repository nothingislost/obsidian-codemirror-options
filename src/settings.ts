/* eslint-disable @typescript-eslint/ban-ts-comment */
import ObsidianCodeMirrorOptionsPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { onRenderLine } from "./container-attributes";

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
  tokenList: string;
  containerAttributes: boolean;
  syntaxHighlighting: boolean;
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
  containerAttributes: false,
  syntaxHighlighting: false,
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
          // hide the token list if the hide tokens setting is disabled
          this.plugin.settings.editModeHideTokens
            ? tokenSettings.settingEl.removeClass("setting-disabled")
            : tokenSettings.settingEl.addClass("setting-disabled");
        })
      );

    const tokenSettings = new Setting(this.containerEl)
      .setName("⚠️ Token List")
      .setDesc(
        `These markdown token types will be hidden. The default value will hide all currently supported tokens.
         Values must be pipe delimted with no spaces. Available options are: em|strong|strikethrough|code|linkText|task|internalLink|highlight`
      )
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
          this.plugin.updateCodeMirrorOption("hmdFold", this.plugin.settings.foldLinks ? { link: true } : false);
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
    containerEl.createEl("h3", {
      text: "Visual Styling",
    });
    new Setting(containerEl)
      .setName("Enable Container Attributes")
      .setDesc(
        `Apply data attributes to the CodeMirror line div elements that describe the contained child elements. Think of
      this like Contextual Typography for Edit Mode.`
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.containerAttributes).onChange(value => {
          this.plugin.settings.containerAttributes = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.updateCodeMirrorHandlers("renderLine", onRenderLine, value, true);
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

    containerEl.createEl("h3", {
      text: "Syntax Highlighting",
    });
    let lineNums, copyButton, copyButtonPre;
    if (
      //@ts-ignore
      this.app.plugins.plugins["cm-editor-syntax-highlight-obsidian"]
    ) {
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
    } else {
      new Setting(containerEl)
        .setName("Use CodeMirror for syntax highlighting in preview mode")
        .setDesc('⚠️ Install the plugin "Editor Syntax Highlight" in order to use this feature')
        .setClass("info");
    }
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
      ? tokenSettings.settingEl.removeClass("setting-disabled")
      : tokenSettings.settingEl.addClass("setting-disabled");
    this.plugin.settings.enableCMinPreview
      ? (lineNums?.settingEl.removeClass("setting-disabled"),
        copyButton?.settingEl.removeClass("setting-disabled"),
        copyButtonPre?.settingEl.removeClass("setting-disabled"))
      : (lineNums?.settingEl.addClass("setting-disabled"),
        copyButton?.settingEl.addClass("setting-disabled"),
        copyButtonPre?.settingEl.addClass("setting-disabled"));
  }
}
