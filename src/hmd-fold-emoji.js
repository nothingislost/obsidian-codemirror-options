// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold and render emoji :smile:
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getApi } = require("@aidenlx/obsidian-icon-shortcodes");
(function (mod) {
  //[HyperMD] UMD patched!
  /*plain env*/ mod(
    null,
    (HyperMD.FoldEmoji = HyperMD.FoldEmoji || {}),
    CodeMirror,
    HyperMD,
    HyperMD.Fold
  );
})(function (require, exports, CodeMirror, core_1, fold_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.defaultDict =
    exports.defaultChecker =
    exports.defaultRenderer =
    exports.suggestedOption =
    exports.EmojiFolder =
    exports.getAddon =
    exports.defaultOption =
    exports.FoldEmoji =
      void 0;
  /********************************************************************************** */
  //#region Folder
  /**
   * Detect if a token is emoji and fold it
   *
   * @see FolderFunc in ./fold.ts
   */
  const EmojiPattern = /\+1|-1|[\w-]+/,
    AllowedChar = /^[\w-+]+$/;

  exports.EmojiFolder = function (stream, token) {
    if (token.string !== ":") return;
    const nextColon = stream.findNext((t) => t.string === ":", false),
      nextToken = stream.findNext(() => true);

    // if nearest colon is next token, it's not an emoji
    if (!nextToken || !nextColon || nextColon.i_token <= nextToken.i_token)
      return;

    const tokenType = token.type;
    let name = "";
    for (let i = stream.i_token + 1; i < nextColon.i_token; i++) {
      const t = stream.lineTokens[i];
      // if type of warpped tokens not the same as leading colon,
      // it's not an emoji
      if (t.type !== tokenType || !AllowedChar.test(t.string)) return;
      name += t.string;
    }
    // filter text that is too long to be shortcode
    if (name.length > 55) return;
    // filter using common shortcode pattern
    if (!EmojiPattern.test(name)) return;

    var cm = stream.cm;
    var addon = exports.getAddon(cm);
    if (!addon.isEmoji(name)) return null;

    var from = {
      line: stream.lineNo,
      ch: token.start,
    };
    var end = nextColon.token.end;
    var to = { line: stream.lineNo, ch: end };

    var reqAns = stream.requestRange(from, to);
    if (reqAns !== fold_1.RequestRangeResult.OK) return null;
    // now we are ready to fold and render!
    var marker = addon.foldEmoji(name, from, to);
    return marker;
  };
  //#endregion
  fold_1.registerFolder("emoji", exports.EmojiFolder, true);
  exports.defaultRenderer = (text) => {
    const icon = getApi()?.getIcon(text);
    if (!icon) {
      return null;
    } else if (typeof icon === "string") {
      return createSpan({ text: icon });
    } else {
      return icon;
    }
  };
  exports.defaultChecker = (text) => getApi()?.hasIcon(text) === true;
  exports.defaultOption = {
    myEmoji: {},
    emojiRenderer: exports.defaultRenderer,
    emojiChecker: exports.defaultChecker,
  };
  exports.suggestedOption = {};
  core_1.suggestedEditorConfig.hmdFoldEmoji = exports.suggestedOption;
  CodeMirror.defineOption(
    "hmdFoldEmoji",
    exports.defaultOption,
    function (cm, newVal) {
      ///// convert newVal's type to `Partial<Options>`, if it is not.
      if (!newVal) {
        newVal = {};
      }
      ///// apply config and write new values into cm
      var inst = exports.getAddon(cm);
      for (var k in exports.defaultOption) {
        inst[k] = k in newVal ? newVal[k] : exports.defaultOption[k];
      }
    }
  );
  //#endregion
  /********************************************************************************** */
  //#region Addon Class
  var FoldEmoji = /** @class */ (function (str) {
    function FoldEmoji(cm) {
      this.cm = cm;
      // options will be initialized to defaultOption when constructor is finished
    }
    FoldEmoji.prototype.isEmoji = function (text) {
      return text in this.myEmoji || this.emojiChecker(text);
    };
    FoldEmoji.prototype.foldEmoji = function (text, from, to) {
      var cm = this.cm;
      var el =
        (text in this.myEmoji && this.myEmoji[text](text)) ||
        this.emojiRenderer(text);
      if (!el || !el.tagName) return null;
      if (el.className.indexOf("hmd-emoji") === -1)
        el.className += " hmd-emoji";
      var marker = cm.markText(from, to, {
        replacedWith: el,
      });
      el.addEventListener(
        "click",
        fold_1.breakMark.bind(this, cm, marker, 1),
        false
      );
      if (el.tagName.toLowerCase() === "img") {
        el.addEventListener(
          "load",
          function () {
            return marker.changed();
          },
          false
        );
        el.addEventListener(
          "dragstart",
          function (ev) {
            return ev.preventDefault();
          },
          false
        );
      }
      return marker;
    };
    return FoldEmoji;
  })();
  exports.FoldEmoji = FoldEmoji;
  //#endregion
  /** ADDON GETTER (Singleton Pattern): a editor can have only one FoldEmoji instance */
  exports.getAddon = core_1.Addon.Getter(
    "FoldEmoji",
    FoldEmoji,
    exports.defaultOption /** if has options */
  );
});
//#endregion
