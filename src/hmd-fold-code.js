// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Turn code blocks into flow charts / playground sandboxes etc.
//

import { debounce } from "obsidian";

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
    FoldCode.prototype.clearAll = function () {
      var debug = false;
      if (debug) console.log("clear all invoked");
      fold_1.getAddon(this.cm).startFold.stop();
      for (var type in this.folded) {
        var folded = this.folded[type];
        var info;
        while ((info = folded.pop())) {
          if (debug) console.log("clearing widget: " + info.lineWidget.id);
          info.marker.explicitlyCleared = false;
          info.marker.clear();
          info.marker = null;
          info = null;
        }
      }
    };
    FoldCode.prototype.fold = function (stream, token) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var _this = this;
      var debug = false;
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
      if (debug) lineWidget.id = cm.state.fileName + ":" + info.lang + ":" + Math.floor(Math.random() * 1000);
      if (debug) console.log("created line widget: " + lineWidget.id);
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

      function updateWidget(widget) {
        if (debug) console.log("debounced widget change: " + widget.id);
        try {
          widget.changed();
        } catch (err) {
          if (debug) console.log(err);
        }
      }

      var widgetChanged = debounce(updateWidget, 250);

      let observer = new ResizeObserver((mutations, observer) => {
        try {
          widgetChanged(lineWidget);
        } catch {}
      });

      observer.observe($wrapper);

      var $stub = document.createElement("span");
      $stub.className = stubClass + type;
      $stub.textContent = "<CODE>";
      var marker = (info.marker = cm.markText(from, to, {
        replacedWith: $stub,
        inclusiveLeft: true,
        inclusiveRight: true,
      }));
      if (debug) console.log("created widget marker: " + lineWidget.id + ":" + marker.id);

      info.changed = function () {
        if (debug) console.log("info invoked widget change: " + lineWidget.id);
        try {
          lineWidget.changed();
        } catch (err) {
          if (debug) console.log("widget update failure", err);
        }
      };
      info.break = function () {
        if (debug) console.log("info invoked widget break: " + lineWidget.id);
        observer.disconnect();
        observer = null;
        fold_1.breakMark(cm, marker);
      };
      $stub.addEventListener("click", info.break, false);
      var redraw = info.redraw;
      if (redraw) {
        lineWidget.on("redraw", info.redraw);
      }
      function onCodeBlockClear() {
        if (redraw) {
          lineWidget.off("redraw", info.redraw);
        }
        marker.off("clear", onCodeBlockClear);
        if (debug) console.log("clear invoked on widget: " + lineWidget.id);
        $stub.removeEventListener("click", info.break);
        if (info.unload) {
          try {
            info.unload();
            info.unload = null;
            info = null;
            if (debug) console.log("info invoked widget unload: " + lineWidget.id);
          } catch (err) {
            if (debug) console.log("failed info invoked widget unload: ", err);
          }
        }
        var markers = _this.folded[type];
        var idx;
        if (markers && (idx = markers.indexOf(info)) !== -1) markers.splice(idx, 1);
        cm.removeLineClass(wrapperLine, "wrap", `rendered-${type}-wrapper`);
        cm.removeLineClass(wrapperLine, "wrap", "rendered-code-block-wrapper");
        if (observer) observer.disconnect();
        lineWidget.clear();
        if (debug) console.log("info invoked widget clear: " + lineWidget.id);
        lineWidget = null;
        observer = null;
        marker.replacedWith = null;
        marker.widgetNode = null;
        marker = null;
      }
      marker.on("clear", onCodeBlockClear);
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
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  var undefined_function = function () {};
  /** ADDON GETTER (Singleton Pattern): a editor can have only one FoldCode instance */
  exports.getAddon = core_1.Addon.Getter("FoldCode", FoldCode, exports.defaultOption /** if has options */);
});
