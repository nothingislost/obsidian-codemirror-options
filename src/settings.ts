/* eslint-disable @typescript-eslint/ban-ts-comment */
import ObsidianCodeMirrorOptionsPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class ObsidianCodeMirrorOptionsSettings {
  dynamicCursor = false;
  markSelection = false;
  activeLineOnSelect = false;
  enableCMinPreview = false;
  enablePrismJSStyling = false;
}

export class ObsidianCodeMirrorOptionsSettingsTab extends PluginSettingTab {
  plugin: ObsidianCodeMirrorOptionsPlugin;

  constructor(app: App, plugin: ObsidianCodeMirrorOptionsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "CodeMirror Options" });

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
          this.plugin.applyCodeMirrorOptions();
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
          this.plugin.applyCodeMirrorOptions();
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
          this.plugin.applyCodeMirrorOptions();
        })
      );
    if (
      //@ts-ignore
      this.app.plugins.plugins["cm-editor-syntax-highlight-obsidian"]
    ) {
      new Setting(containerEl)
        .setName("Use CodeMirror for syntax highlighting in preview mode")
        .setDesc(
          `This setting creates consistent highlighting between edit and preview by using CodeMirror to highlight in both modes. 
           Note: This setting requires the "Editor Syntax Highlight" plugin to function properly.`
        )
        .addToggle(toggle =>
          toggle.setValue(this.plugin.settings.enableCMinPreview).onChange(value => {
            this.plugin.settings.enableCMinPreview = value;
            this.plugin.saveData(this.plugin.settings);
            // TODO: make this toggle styling properly
            this.plugin.toggleHighlighting();
          })
        );
    } else {
      new Setting(containerEl)
        .setName("Use CodeMirror for syntax highlighting in preview mode")
        .setDesc('Warning: Install the plugin "Editor Syntax Highlight" in order to use this feature')
        .setClass("cm-warning");
    }

    new Setting(containerEl)
      .setName("Fallback: Unify the default prism.js code block styling")
      .setDesc(
        `This setting is a fallback option if you do not want to inject CM into preview mode. 
         It will try and unify the prism.js colors to match CM as close as possible.`
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.enablePrismJSStyling).onChange(value => {
          this.plugin.settings.enablePrismJSStyling = value;
          this.plugin.saveData(this.plugin.settings);
          // TODO: make this toggle styling properly
          this.plugin.applyCodeMirrorOptions();
        })
      );
    containerEl.createEl("h4", {
      text: `To customize the syntax highlighting theme, 
             install the Style Settings plugin and explore the "CodeMirror Options" section`,
    });
  }
}
