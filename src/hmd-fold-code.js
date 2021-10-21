// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Turn code blocks into flow charts / playground sandboxes etc.
//

(function (mod) {
  mod(null, (HyperMD.FoldCode = HyperMD.FoldCode || {}), CodeMirror, HyperMD, HyperMD.Fold);
})(function (require, exports, CodeMirror, core_1, fold_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getAddon =
    exports.convertNumberToString =
    exports.FoldCode =
    exports.suggestedOption =
    exports.defaultOption =
    exports.CodeFolder =
    exports.registerRenderer =
    exports.rendererRegistry =
      void 0;
  CodeMirror = __importStar(CodeMirror);
  exports.rendererRegistry = {};
  /**
   * Add a CodeRenderer to the System CodeRenderer Registry
   *
   * @param lang
   * @param folder
   * @param suggested enable this folder in suggestedEditorConfig
   * @param force if a folder with same name is already exists, overwrite it. (dangerous)
   */
  function registerRenderer(info, force) {
    if (!info || !info.name || !info.renderer) return;
    var name = info.name;
    var pattern = info.pattern;
    var registry = exports.rendererRegistry;
    if (name in registry) {
      if (!force) {
        throw new Error("CodeRenderer " + name + " already exists");
      }
    }
    if (typeof pattern === "string") {
      var t_1 = pattern.toLowerCase();
      pattern = function (lang) {
        return lang.toLowerCase() === t_1;
      };
    } else if (pattern instanceof RegExp) {
      pattern = function (lang) {
        return info.pattern.test(lang);
      };
    }
    var newInfo = {
      name: name,
      suggested: !!info.suggested,
      pattern: pattern,
      renderer: info.renderer,
    };
    registry[name] = newInfo;
    exports.defaultOption[name] = false;
    exports.suggestedOption[name] = newInfo.suggested;
  }
  exports.registerRenderer = registerRenderer;
  //#endregion
  //#region FolderFunc for Addon/Fold -----------------------------------------------------
  /** the FolderFunc for Addon/Fold */
  var CodeFolder = function (stream, token) {
    if (
      token.start !== 0 ||
      !token.type ||
      token.type.indexOf("HyperMD-codeblock-begin") === -1 ||
      !/([-\w]+)(\s*|\s+\{.+\}\s*)$/.test(token.string)
    ) {
      return null;
    }
    return exports.getAddon(stream.cm).fold(stream, token);
  };
  exports.CodeFolder = CodeFolder;
  fold_1.registerFolder("code", exports.CodeFolder, true);
  exports.defaultOption = {
    /* will be populated by registerRenderer() */
  };
  exports.suggestedOption = {
    /* will be populated by registerRenderer() */
  };
  core_1.suggestedEditorConfig.hmdFoldCode = exports.suggestedOption;
  CodeMirror.defineOption("hmdFoldCode", exports.defaultOption, function (cm, newVal) {
    ///// convert newVal's type to `Record<string, boolean>`, if it is not.
    if (!newVal || typeof newVal === "boolean") {
      newVal = newVal ? exports.suggestedOption : exports.defaultOption;
    }
    ///// apply config
    var inst = exports.getAddon(cm);
    for (var type in exports.rendererRegistry) {
      inst.setStatus(type, newVal[type]);
    }
    // then, folding task will be queued by setStatus()
  });
  var FoldCode = /** @class */ (function () {
    function FoldCode(cm) {
      this.cm = cm;
      /**
       * stores renderer status for current editor
       * @private To enable/disable renderer, use `setStatus()`
       */
      this._enabled = {};
      /** renderers' output goes here */
      this.folded = {};
    }
    /** enable/disable one kind of renderer, in current editor */
    FoldCode.prototype.setStatus = function (type, enabled) {
      if (!(type in exports.rendererRegistry)) return;
      if (!this._enabled[type] !== !enabled) {
        this._enabled[type] = !!enabled;
        if (enabled) fold_1.getAddon(this.cm).startFold();
        else this.clear(type);
      }
    };
    /** Clear one type of rendered TextMarkers */
    FoldCode.prototype.clear = function (type) {
      var folded = this.folded[type];
      if (!folded || !folded.length) return;
      var info;
      while ((info = folded.pop())) info.marker.clear();
    };
    FoldCode.prototype.fold = function (stream, token) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var _this = this;
      if (token.start !== 0 || !token.type || token.type.indexOf("HyperMD-codeblock-begin") === -1) {
        return null;
      }
      var tmp = /([-\w]+)(\s*|\s+\{.+\}\s*)$/.exec(token.string);
      var lang = tmp && tmp[1].toLowerCase();
      var attributesStr = tmp && tmp[2] && tmp[2].trim();
      var attributes = {};
      if (attributesStr && attributesStr.length) {
        attributes = fold_1.parseAttributes(attributesStr);
        try {
        } catch (error) {
          attributes = {};
        }
      }
      if (!lang) return null;
      var renderer;
      var type;
      var cm = this.cm,
        registry = exports.rendererRegistry,
        _enabled = this._enabled;
      for (var type_i in registry) {
        var r = registry[type_i];
        if (!_enabled[type_i]) continue;
        if (!r.pattern(lang)) continue;
        type = type_i;
        renderer = r.renderer;
        break;
      }
      if (!type) return null;
      var from = { line: stream.lineNo, ch: 0 };
      var to = null;
      // find the end of code block
      var lastLineCM = cm.lastLine();
      var endLine = stream.lineNo + 1;
      do {
        var s = cm.getTokenAt({ line: endLine, ch: 1 });
        if (s && s.type && s.type.indexOf("HyperMD-codeblock-end") !== -1) {
          //FOUND END!
          to = { line: endLine, ch: s.end };
          break;
        }
      } while (++endLine < lastLineCM);
      if (!to) return null;
      // request the range
      var rngReq = stream.requestRange(from, to);
      if (rngReq !== fold_1.RequestRangeResult.OK) return null;
      // now we can call renderer
      var code = cm.getRange({ line: from.line + 1, ch: 0 }, { line: to.line, ch: 0 });
      var info = {
        editor: cm,
        lang: lang,
        attributes: attributes,
        marker: null,
        lineWidget: null,
        el: null,
        break: undefined_function,
        changed: undefined_function,
      };
      var _a = renderer(code, info),
        element = _a.element,
        asyncRenderer = _a.asyncRenderer;
      info.el = element;
      var el = element;
      if (!el) {
        info.marker.clear();
        return null;
      }
      //-----------------------------

      var $wrapper = document.createElement("div");
      $wrapper.className = contentClass + type;
      $wrapper.style.minHeight = "1em";
      $wrapper.appendChild(el);

      var lineWidget = (info.lineWidget = cm.addLineWidget(to.line, $wrapper, {
        above: false,
        coverGutter: false,
        handleMouseEvents: false,
        className: "rendered-code-block rendered-widget",
        noHScroll: false,
        showIfHidden: false,
      }));
      if (asyncRenderer) {
        asyncRenderer();
      }
      var wrapperLine = stream.lineNo;

      cm.addLineClass(wrapperLine, "wrap", "rendered-code-block-wrapper");
      cm.addLineClass(wrapperLine, "wrap", `rendered-${type}-wrapper`);
      // watch for any changes to the widget wrapper or its children
      // so that we can call widget.changed() to remeasure the element
      // and prevent any cursor placement issues
      // this allows our widget to shrink or grow to any size we want
      this.widgetChanged = core_1.debounce(() => {
        // console.log("widget change detected: " + this.lineWidget.node.className);
        try {
          this.lineWidget.changed();
        } catch {
          // console.log("widget change failed");
        }
      }, 250);
      // we're using MutationObserver rather than ResizeObserver here
      // due to ResizeObserver causing a memory leak due to holding refs
      const observer = new MutationObserver((mutations, observer) => {
        // mutations.forEach(el => {
        //   console.log(el.target.classList.value);
        // });
        this.lineWidget = lineWidget;
        this.widgetChanged();
      });
      observer.observe(el, { childList: true, subtree: true, attributes: true });
      //-----------------------------
      var $stub = document.createElement("span");
      $stub.className = stubClass + type;
      $stub.textContent = "<CODE>";
      var marker = (info.marker = cm.markText(from, to, {
        replacedWith: $stub,
      }));
      //-----------------------------
      var highlightON = function () {
        return ($stub.className = stubClassHighlight + type);
      };
      var highlightOFF = function () {
        return ($stub.className = stubClass + type);
      };
      // $wrapper.addEventListener("mouseenter", highlightON, false);
      // $wrapper.addEventListener("mouseleave", highlightOFF, false);
      info.changed = function () {
        lineWidget.changed();
      };
      info.break = function () {
        observer.disconnect();
        fold_1.breakMark(cm, marker);
      };
      $stub.addEventListener("click", info.break, false);
      marker.on("clear", function () {
        var markers = _this.folded[type];
        var idx;
        if (markers && (idx = markers.indexOf(info)) !== -1) markers.splice(idx, 1);
        if (typeof info.onRemove === "function") info.onRemove(info);
        cm.addLineClass(wrapperLine, "wrap", `rendered-${type}-wrapper`);
        cm.removeLineClass(wrapperLine, "wrap", "rendered-code-block-wrapper");
        observer.disconnect();
        lineWidget.clear();
      });
      if (!(type in this.folded)) this.folded[type] = [info];
      else this.folded[type].push(info);
      return marker;
    };
    return FoldCode;
  })();
  exports.FoldCode = FoldCode;
  //#endregion
  // End
  var contentClass = "hmd-fold-code-content hmd-fold-code-"; // + renderer_type
  var stubClass = "hmd-fold-code-stub hmd-fold-code-"; // + renderer_type
  var stubClassHighlight = "hmd-fold-code-stub highlight hmd-fold-code-"; // + renderer_type
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  var undefined_function = function () {};
  /** ADDON GETTER (Singleton Pattern): a editor can have only one FoldCode instance */
  exports.getAddon = core_1.Addon.Getter("FoldCode", FoldCode, exports.defaultOption /** if has options */);
});
