# Obsidian CodeMirror Options

This plugin adds configurable options to customize the behavior of Obsidian's edit mode.

## Disclaimer
- The features in this plugin all rely on CodeMirror 5 and will not be compatible with CodeMirror 6. Once Obsidian enables CodeMirror 6 and native WYSIWYG mode on desktop, this plugin will not be compatible with the new mode.
- We do not have any word from the Obsidian devs regarding when we can expect CodeMirror 6 on desktop but once it happens, I will do my best to replicate any of these features that are not implemented natively by Obsidian WYSIWYG.

## Features

### WYSIWYG Functionality
- Much of the WYSIWYG functionality is achieved by incorporating components from the open source HyperMD project. Obsidian only uses a subset of HyperMD by default and this plugin adds in many of the missing HyperMD features.
- The WYSIWYG features in this plugin can be resource intensive in certain situations. If you notice performance issues, it it recommended to turn off the settings under the Code Rendering section and see if that improves things.

#### Markdown Parsing

##### Hide Markdown Tokens

This enables WYSIWYG like functionality in edit mode by hiding markdown tokens once you leave the marked up element

Token hiding currently supports *em*, **strong**, ~~strikethrough~~, ==highlight==, `inline code`, 

- [[internal link in list]]
- ##### Headers in Lists
- [x] checkboxes

This feature also hides certain markup based on active line rather than active element such as: 

###### Headers
Tables:

| left aligned | center aligned | right aligned |
|:------------ |:--------------:| -------------:|
| left         |     center     |         right |
| left         |     center     |         right |
| left         |     center     |         right |

Horizontal Rule (HR)
***

> block quote
>  > nested block quote

#### Code Rendering
##### HTML Rendering
- HTML tags will be passed through DOMPurify and then rendered inline. You can click into the rendered element to see and edit the HTML source.
- The stock Obsidian DOMPurify settings are enforced and this plugin should render the same subset of HTML that is supported, natively, by preview mode.
##### Code Rendering
###### Charts
- Renders chart blocks in edit mode using the Obsidian Charts plugin
###### Admonitions
- Renders Admonition blocks in edit mode using the Admonitions plugin
###### Dataview
- Renders Dataview blocks in edit mode using the Admonitions plugin
- **Limitations**
  - Embedded query results are only calculated at initial render time. They will not continue to update over time like they do in preview mode. If you want to refresh a query, you can click into the query and back out to force a refresh.
###### Embedded Search Queries
- Renders
- **Limitations**
	- Embedded query results are only calculated at initial render time. They will not continue to update over time like they do in preview mode. If you want to refresh a query, you can click into the query and back out to force a refresh.

#### Visual Styling
### Inline Images
This adds support for inline images in edit mode, similar to Ozan's Image in Editor plugin. The main difference with this implementation is that it renders the image inline, and hides the source text. When clicking on the image, the image will collapse back down to its source text.

This implementation also allows for multiple images on a single line as well as support for Obsidian's image size syntax.

### Templater Syntax Support
OpenMD does not play nicely with Templater's built-in syntax highlighting. To work around this, OpenMD now supports Templater syntax natively. 

You'll need to make sure you disable Templater's native syntax highlighting option to avoid any conflicts.

The syntax highlighting theme can be changed or customized using Style Settings.

### Headers in Lists
The Markdown syntax supports headers inside of list items but the default edit mode parser does not render them. 

- # h1
	- ## h2
		- ### h3
			- #### h4
				- ##### h5
					- ###### h6

### Table Improvements
#### Single Column Support

The default Obsidian Markdown parser does not support formatting single column tables in edit mode. Support for this has now been added to OpenMD.

| single column support |
|:---------------------:|
|          row          |

#### Auto Align Tables

This feature is similar to the Advanced Tables plugin and will automatically align your tables as you type. The main difference is that this setting will auto align as you type where as Advances Tables will do a reformat on tab/enter.

This setting can coexist nicely with Advanced Tables and it is recommended to use both since Advanced Tables adds additional features like tab/enter key handling and a number of other useful table features.

### Syntax Highlighting

<img src="https://user-images.githubusercontent.com/89109712/132953836-bac79ab0-581c-469b-a971-6c2dcde2773f.gif" width=70% height=70%>

When enabled, this plugin will apply a consistent syntax highlighting theme to code blocks in both edit and preview modes.

By default, the plugin applies the theme "Material: Palenight" to both light and dark modes.

If you'd like to customize the syntax highlighting theme, install Style Settings and explore the CodeMirror Options section within the Style Settings Plugin Options.

This plugin currently includes 4 theme options out of the box:

- Solarized Light
- Material Palenight
- Dracula
- Custom

When using the custom theme, you can customize any of the available syntax highlighting colors. You can also use the custom theme option to import your own themes using the Style Settings import function.

Here's an example of importing the Dracula theme for use in dark mode only:

```json
{
"CodeMirror Options@@cm-background@@dark": "#282a36",
"CodeMirror Options@@cm-foreground@@dark": "#f8f8f2",
"CodeMirror Options@@cm-comment@@dark": "#6272a4",
"CodeMirror Options@@cm-string@@dark": "#f1fa8c",
"CodeMirror Options@@cm-string-2@@dark": "#f1fa8c",
"CodeMirror Options@@cm-number@@dark": "#bd93f9",
"CodeMirror Options@@cm-variable@@dark": "#50fa7b",
"CodeMirror Options@@cm-variable-2@@dark": "#ffffff",
"CodeMirror Options@@cm-def@@dark": "#50fa7b",
"CodeMirror Options@@cm-operator@@dark": "#ff79c6",
"CodeMirror Options@@cm-keyword@@dark": "#ff79c6",
"CodeMirror Options@@cm-atom@@dark": "#bd93f9",
"CodeMirror Options@@cm-meta@@dark": "#f8f8f2",
"CodeMirror Options@@cm-tag@@dark": "#ff79c6",
"CodeMirror Options@@cm-attribute@@dark": "#50fa7b",
"CodeMirror Options@@cm-qualifier@@dark": "#50fa7b",
"CodeMirror Options@@cm-property@@dark": "#66d9ef",
"CodeMirror Options@@cm-builtin@@dark": "#50fa7b",
"CodeMirror Options@@cm-variable-3@@dark": "#ffb86c",
"CodeMirror Options@@cm-type@@dark": "#ffb86c",
"CodeMirror Options@@cm-activeline-background@@dark": "#414458",
"CodeMirror Options@@cm-matchingbracket@@dark": "#ffffff"
}
```

Similarly, you can import a theme for use in light mode by using @@light:

```json
{
"CodeMirror Options@@cm-background@@light": "#282a36",
"CodeMirror Options@@cm-foreground@@light": "#f8f8f2",
"CodeMirror Options@@cm-comment@@light": "#6272a4",
"CodeMirror Options@@cm-string@@light": "#f1fa8c",
"CodeMirror Options@@cm-string-2@@light": "#f1fa8c",
"CodeMirror Options@@cm-number@@light": "#bd93f9",
"CodeMirror Options@@cm-variable@@light": "#50fa7b",
"CodeMirror Options@@cm-variable-2@@light": "#ffffff",
"CodeMirror Options@@cm-def@@light": "#50fa7b",
"CodeMirror Options@@cm-operator@@light": "#ff79c6",
"CodeMirror Options@@cm-keyword@@light": "#ff79c6",
"CodeMirror Options@@cm-atom@@light": "#bd93f9",
"CodeMirror Options@@cm-meta@@light": "#f8f8f2",
"CodeMirror Options@@cm-tag@@light": "#ff79c6",
"CodeMirror Options@@cm-attribute@@light": "#50fa7b",
"CodeMirror Options@@cm-qualifier@@light": "#50fa7b",
"CodeMirror Options@@cm-property@@light": "#66d9ef",
"CodeMirror Options@@cm-builtin@@light": "#50fa7b",
"CodeMirror Options@@cm-variable-3@@light": "#ffb86c",
"CodeMirror Options@@cm-type@@light": "#ffb86c",
"CodeMirror Options@@cm-activeline-background@@light": "#414458",
"CodeMirror Options@@cm-matchingbracket@@light": "#ffffff"
}
```

The CSS properties match closely to the standard properties used by CodeMirror. You can find more theme colors here https://codemirror.net/theme/ and adapt them to this import format.

## Settings

### Dynamic Cursor Sizing

<img src="https://user-images.githubusercontent.com/89109712/132953850-c2b4b791-9a7a-47fa-845f-62d72208c2e4.gif" width=50% height=50%>

When enabled, the cursor height will be determined by the max height of the entire line. When disabled, the cursor's height is based on the height of the adjacent reference character.

### Retain Active Line on Selection

<img src="https://user-images.githubusercontent.com/89109712/132953861-07d4c5ed-3e81-4a5c-b630-88bcb4168697.gif" width=50% height=50%>

When enabled, text selection will not remove the .active-line class on the current line. When disabled text selection on the active line will remove the .active-line class.

### Mark Selected Text with a CSS class

<img src="https://user-images.githubusercontent.com/89109712/132953864-82bab013-ed55-4226-a8e7-738fb387155e.gif" width=50% height=50%>

When enabled, selected text will be marked with the CSS class .CodeMirror-selectedtext. This replaces the default CodeMirror selection functionality which mimics a selection by painting a background layer behind the text. This new option grants more styling flexibility and avoids issues when selecting items that have defined backgrounds.

### Use CodeMirror for syntax highlighting in preview mode

This setting creates consistent highlighting between edit and preview by using CodeMirror to highlight in both modes. **Note**: This setting requires the "Editor Syntax Highlight" plugin to function.

### Fallback: Unify the default prism.js code block styling

This setting is a fallback option if you do not want to inject CM into preview mode. It will try and unify the prism.js colors to match the CodeMirror theme as close as possible.

## Known Issues

- This plugin leverages the CM5 API directly which is a deprecated option. Obsidian will be moving to CM6 soon and this plugin will break. I'm not sure yet if I'll be able to make these same tweaks on CM6.
- Multiple aspects of this plugin will break if the Templater plugin's "Syntax Highlighting" feature is turned on. It is recommended to disable Templater's "Syntax Highlighting" and enable "OpenMD Mode" within CodeMirror Options which enables support for Templater syntax.

## Installation

### Obsidian Community Plugin Browser

This plugin is available directly within the Obsidian app by navigating to Settings->Community Plugins->Browse

### Beta Installation
Occasionally, pre-releases will be available for testing prior to official release. These can be installed using the [Obsidian42 BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.

To install a pre-release, download and enable the BRAT plugin, add the beta repository `nothingislost/obsidian-codemirror-options`, and then have BRAT check for updates.

### Manual Installation
To manually install
 1. download the latest `zip`from the [latest Github Release](https://github.com/nothingislost/obsidian-codemirror-options/releases/latest)
 1. unzip the contents into the `.plugins/obsidian-codemirror-options` subdirectory of your vault.
 1. reload obsidian
 1. go into settings > third party plugins and activate obsidian-codemirror-options

For details see [the forums](https://forum.obsidian.md/t/plugins-mini-faq/7737).

## Changelog

### 0.5.2

- Additional fixes to Math formatting and layout
- Updated the `<HTML>` and `<CODE>` button behavior to be less obtrusive
- Fixed a bug that caused rendered HTML elements to be duplicated in some circumstances
- The math preview will now properly close when the active expression is deleted
- Added support for image sizing in markdown images `[100]()`
- Allowed rendering of images over the plain HTTP:// protocol
- HTML and Code blocks will no longer collapse when moving the cursor into or near them
  - The only way to break a HTML or Code block is to click the `<HTML>` or `<CODE>` button

### 0.5.1

- Added an option to not style rendered edit mode checkboxes
- Added a new data attribute to edit mode checkboxes `data-task` which will contain the character inside of the task `[ ]` brackets
  - `<span class="cm-formatting cm-formatting-task cm-property hmd-hidden-token" data-task="?">[?]</span>`

- Fixed a bug that was preventing Mathjax from being rendered as a block
- Fixed a bug that was causing math to not be styled correctly

### 0.5.0

# Shiny new things
- Inline Mathjax Rendering
  - Mathjax inside of `$ $` or `$$ $$` will now render directly in edit mode. Click into the rendered element to edit it
  - Rendering is done by the built-in Obsidian Mathjax renderer and has all of the same features and settings
- Mathjax Preview
  - When editing a Mathjax element, a draggable preview modal will appear showing you what the rendered Mathjax will look like

# Bug fixes
- Fixed an issue that was preventing the current file path from being passed to edit-mode rendered Dataview blocks
  - This was preventing calls like `dv.current()` from working

### 0.4.2

- Added "Copy Image to Clipboard" to the editor context menu, when clicking on inline rendered images. This only triggers if the IMG has the class "hmd-image", which is set on all inline rendered images by default.
  - The "Copy Image to Clipboard" option will also show on any images displayed inside of a rendered code block
  - "Copy Image to Clipboard" supports internal and external images

### 0.4.1

- Fix a bug that was causing custom views, like Kanban, to not be able to load files

### 0.4.0

# Shiny new things
- HTML Rendering
  - HTML tags will be passed through DOMPurify and then rendered inline. You can click into the rendered element to see and edit the HTML source.
  - HTML tags at the beginning of a line will be treated as a full line block
  - HTML tags placed inline will be treated as inline-blocks
- Code Rendering
  - Charts
    - Renders chart blocks in edit mode using the Obisidian Charts plugin
  - Admonitions
    - Renders Admonition blocks in edit mode using the Admonitions plugin
  - Dataview
    - Renders Dataview blocks in edit mode using the Admonitions plugin
    - Limitations
      - Rendered Dataview content is only calculated at initial render time. They will not continue to update on an interval like they do in preview mode. If you want to refresh a view, you can click into the query and back out to force a refresh.
  - Embedded Search Queries
	  - Limitations
		  - Embedded query results are only calculated at initial render time. They will not continue to update over time like they do in preview mode. If you want to refresh a query, you can click into the query and back out to force a refresh.
# Improvements
- Added `.cm-collapse-external-links` body class for Collapse External Links feature
- Fixed overly aggressive inline latex regex in OpenMD Mode
# Known Issues
- Multiple aspects of this plugin will break if the Templater plugin's "Syntax Highlighting " feature is turned on. It is recommended to disable Templater's "Syntax Highlighting" and enable "OpenMD Mode" within CodeMirror Options which enables support for Templater syntax.
- Some themes alter the z-index in a way that causes the `<CODE>` button widget to not display on top of the rendered element. The theme designers will need to address this but in the mean time, you can force the code to display by creating a selection into the element.

### 0.3.1

- Further improved the performance of Collapse External Links and Render Images Inline
- Fixed a bug which was preventing images from rendering when initially inserted into the document

### 0.3.0

#### Shiny new things
- OpenMD
	- Added Single Column Table Support
	- Added native Templater Syntax Support
	- Added support for Headers in Lists
- Added the Auto Align Tables feature
- Added the Render Images Inline feature
#### Improvements
- Removing "task" from the Token List option will now properly remove the CSS styled check box
- The Token List setting to allows text selection
	- This is to allow copy/pasting the default token list
- Fixed a performance related issue with Collapse External Links & Render Images Inline
	- These settings were doing way more work than needed which caused noticeable lag when working on large documents. In addition, turning the settings off did not properly unload the CodeMirror event handlers.
	- These settings may be unstable as the performance tweaks are ironed out. If you notice lag, disable both of these options and see if things improve.
#### Known Issues
- Selecting inline images can cause an image to not render after the selection is cleared. Making a change anywhere in the editor will fix this for now.

### 0.2.1

- Bug fixes related to the 0.2.0 release

### 0.2.0

- This is a major release which adds/changes quite a few things
- **Updated:** Hide Markdown Tokens
  - Further stabilization improvements
    - Removed all usage of `display: none` in edit mode due to the fact that this hiding method breaks cursor placement
    - All token hiding should be done with `font-family: monospace;font-size: 1px !important; letter-spacing: -1ch;color: transparent;`
    - If you have a theme or CSS snippet that is using `display:none` on elements inside of a CodeMirror block, it is advised to disable those styles in favor of the token hiding provided by this plugin.
  - Added the ability to enable/disable each token type individually
  - Added hiding support for additional token types
    - Highlight/Mark
    - Internal link URL & Ref
- **New:** Container Attributes
  - This new option applies data attributes to all CodeMirror line divs that describe the child elements contained within the line
  - Think of this like Contextual Typography for Edit Mode
  - This option currently applies the following attributes to each CodeMirror line
    - [data-tag-name="<html_element_type>"]
      - Currently supported HTML tags: ol, ul, h1-h6, code, frontmatter
    - [data-heading="<the_full_text_of_any_heading_found>"]
    - [data-hashtags="<space_delimited_list_of_all_tags_found>"]
- **New:** OpenMD Mode
  - This new option replaces Obsidian's HyperMD mode with a modified version which enables new functionality
  - The new mode is forked from [official HyperMD mode](https://github.com/laobubu/HyperMD/blob/master/src/mode/hypermd.ts) and tries to replicate any Obsidian specific customizations
  - **Warning:** This new mode could have missing features or differences in parsing behavior when compared to the default Obsidian mode. Please raise an issue for any regressions or bugs encountered.
  - New functionality provided by this mode:
    - Enhanced parsing of internal links to split up file name, reference, and alias into distinct spans. This allows for proper hiding of internal link tokens when using the "Hide Markdown Tokens" feature
    - Fixed the handling of hashtags that include underscores
- **New:** Collapse External Links
  - This features collapses external links (in edit mode) so that they only show the link name. The full link text will expand when clicking into the link.
- **Updated:** Edit Mode Click Handler
  - This option has been updated to add a class to the div.cm-s-obsidian element whenever a modifier key is pressed
    - Currently supports ctrl (.HyperMD-with-ctrl), alt (.HyperMD-with-alt), meta (.HyperMD-with-meta)
    - This feature allows you to apply conditional CSS like changing the cursor to a pointer when hovering a link and also pressing ctrl/cmd
- **New:** Set cursor blink rate
  
### 0.1.4

- Fixed a bug which would cause "can't read property 'length' of undefined" randomly, when opening files
- Changed the code block copy button handling to account for the new default Obsidian copy button
- Fixed a bug which would prevent CodeMirror options from applying to all open panes
- Fixed a bug which would cause syntax highlighting to not apply sometimes in preview mode
- Added highlight tokens (==) to the list of tokens hidden by the "Hide Tokens" feature
- Stabilize Hide Markdown Tokens
  - The cursor placement logic has been replaced with a hopefully more stable method which prevents the scroll position from jumping up and down on click
  - The only outstanding cursor bug that I'm aware of is when placing the cursor to the right of the fold widget on a folded line

### 0.1.3

- Move copy button to top right and reduce size
- Remove trailing line breaks from copied text
- Add option to include copy button on all PRE blocks in preview

### 0.1.2

- More bug fixes to syntax highlighting logic

### 0.1.1

- Bug fixes to the line number and copy button handling
- Add highlighting support for `js` `html` and `json`

### 0.1.0

- Add an option to show line numbers in preview mode
- Add a copy button to code blocks in preview mode
- Fix the default font size for code blocks to 16px. This can be overridden using Style Settings
- In preview mode, wrap code blocks in a `<code>` element to better mimic the original prism.js DOM structure.
  - The structure is now `<div><pre><code></code></pre></div>`
  - This change should hopefully be transparent for most use cases

### 0.0.8

- This is the stable(ish) release of the features introduced in the 0.0.7 pre-release.
- This release adds two HyperMD features
  - Hide Markdown Syntax
  - Click Handling for Checkboxes
- Adds syntax highlighting support for plugins like Obsidian Plaintext & CodeView

### 0.0.7 (pre-release)

- This release adds two HyperMD features
  1. Hide Markdown Syntax
  2. Click Handling for Checkboxes

### 0.0.6

- Changed the method used for marking multiple lines with .active-line which should resolve a few bugs
- Previously .active-line would start behaving strangely after having 8 lines selected
- The previous method was also not efficient and applied the .active-lines class too often
- Previously, the "Style Active Selection" and "Mark Active Lines" settings were too intermingled. You can now set each feature on or off without impacting each other.

### 0.0.5

- Fixed a bug in the "Style Active Selection" option which was causing an undefined variable error on file load

### 0.0.4

- Updated "Retain Active Line on Selection" to support multi-cursor selection

### 0.0.3

- Updated "Retain Active Line on Selection" to support multi-line selection

### 0.0.2

- Code cleanup
- Added Syntax Highlighting options

### 0.0.1

- Initial release
  - Enabled toggles for:
    - Dynamic Cursor Sizing
    - Retain Active Line on Selection
    - Mark Selected Text with a CSS class