// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Click to open links / jump to footnotes / toggle TODOs, and more.
//
// With custom ClickHandler supported
//

(function (mod) {
  //[HyperMD] UMD patched!
  /*plain env*/ mod(null, (HyperMD.Click = HyperMD.Click || {}), CodeMirror, HyperMD);
})(function (require, exports, CodeMirror, core_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getAddon =
    exports.Click =
    exports.suggestedOption =
    exports.defaultOption =
    exports.defaultClickHandler =
      void 0;
  //#endregion
  /********************************************************************************** */
  //#region defaultClickHandler
  var defaultClickHandler = function (info, cm) {
    var text = info.text,
      type = info.type,
      url = info.url,
      pos = info.pos;
    if (type === "todo") {
      var _a = core_1.expandRange(cm, pos, "formatting-task"),
        from = _a.from,
        to = _a.to;
      var text_1 = cm.getRange(from, to);
      text_1 = text_1 === "[ ]" ? "[x]" : "[ ]";
      cm.replaceRange(text_1, from, to);
    }
  };
  exports.defaultClickHandler = defaultClickHandler;

  exports.defaultOption = {
    enabled: false,
    handler: null,
  };
  exports.suggestedOption = {
    enabled: true,
  };
  core_1.suggestedEditorConfig.hmdClick = exports.suggestedOption;
  CodeMirror.defineOption("hmdClick", exports.defaultOption, function (cm, newVal) {
    ///// convert newVal's type to `Partial<Options>`, if it is not.
    if (!newVal || typeof newVal === "boolean") {
      newVal = { enabled: !!newVal };
    } else if (typeof newVal === "function") {
      newVal = { enabled: true, handler: newVal };
    }
    ///// apply config and write new values into cm
    var inst = exports.getAddon(cm);
    for (var k in exports.defaultOption) {
      inst[k] = k in newVal ? newVal[k] : exports.defaultOption[k];
    }
  });
  //#endregion
  /********************************************************************************** */
  //#region Addon Class
  var Click = /** @class */ (function () {
    function Click(cm) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var _this = this;
      this.cm = cm;
      /** remove modifier className to editor DOM */
      this._mouseMove_keyDetect = function (ev) {
        var el = _this.el;
        var className = el.className,
          newClassName = className;
        var metaClass = "HyperMD-with-meta";
        var altClass = "HyperMD-with-alt";
        var ctrlClass = "HyperMD-with-ctrl";
        if (!ev.altKey && className.indexOf(altClass) >= 0) {
          newClassName = className.replace(altClass, "");
        }
        if (!ev.ctrlKey && className.indexOf(ctrlClass) >= 0) {
          newClassName = className.replace(ctrlClass, "");
        }
        if (!ev.metaKey && className.indexOf(metaClass) >= 0) {
          newClassName = className.replace(metaClass, "");
        }
        if (!ev.altKey && !ev.ctrlKey && !ev.metaKey) {
          _this._KeyDetectorActive = false;
          el.removeEventListener("mousemove", _this._mouseMove_keyDetect, false);
        }
        if (className != newClassName) el.className = newClassName.trim();
      };
      /** add modifier className to editor DOM */
      this._keyDown = function (ev) {
        var kc = ev.keyCode || ev.which;
        var className = "";
        if (kc == 91 || kc == 92 || kc == 224) className = "HyperMD-with-meta";
        if (kc == 17) className = "HyperMD-with-ctrl";
        if (kc == 18) className = "HyperMD-with-alt";
        var el = _this.el;
        if (className && el.className.indexOf(className) == -1) {
          el.className += " " + className;
        }
        if (!_this._KeyDetectorActive) {
          _this._KeyDetectorActive = true;
          _this.el.addEventListener("mousemove", _this._mouseMove_keyDetect, false);
        }
      };
      /**
       * Unbind _mouseUp, then call ClickHandler if mouse not bounce
       */
      this._mouseUp = function (ev) {
        var cinfo = _this._cinfo;
        _this.lineDiv.removeEventListener("mouseup", _this._mouseUp, false);
        if (Math.abs(ev.clientX - cinfo.clientX) > 5 || Math.abs(ev.clientY - cinfo.clientY) > 5) return;
        if (typeof _this.handler === "function" && _this.handler(cinfo, _this.cm) === false) return;
        exports.defaultClickHandler(cinfo, _this.cm);
      };
      /**
       * Try to construct ClickInfo and bind _mouseUp
       */
      this._mouseDown = function (ev) {
        var button = ev.button,
          clientX = ev.clientX,
          clientY = ev.clientY,
          ctrlKey = ev.ctrlKey,
          altKey = ev.altKey,
          shiftKey = ev.shiftKey;
        var cm = _this.cm;
        if (ev.target.tagName === "PRE") return;
        var pos = cm.coordsChar({ left: clientX, top: clientY }, "window");
        var range;
        var token = cm.getTokenAt(pos);
        var state = token.state;
        var styles = " " + token.type + " ";
        var mat;
        var type = null;
        var text, url;
        if (styles.match(/\sformatting-task\s/)) {
          ev.preventDefault(); // prevent the cursor from moving into the checkbox
          // TO-DO checkbox
          type = "todo";
          range = core_1.expandRange(cm, pos, "formatting-task");
          range.to.ch = cm.getLine(pos.line).length;
          text = cm.getRange(range.from, range.to);
          url = null;
        }
        if (type !== null) {
          _this._cinfo = {
            type: type,
            text: text,
            url: url,
            pos: pos,
            button: button,
            clientX: clientX,
            clientY: clientY,
            ctrlKey: ctrlKey,
            altKey: altKey,
            shiftKey: shiftKey,
          };
          _this.lineDiv.addEventListener("mouseup", _this._mouseUp, false);
        }
      };
      this.lineDiv = cm.display.lineDiv;
      var el = (this.el = cm.getWrapperElement());
      new core_1.FlipFlop(
        /* ON  */ function () {
          _this.lineDiv.addEventListener("mousedown", _this._mouseDown, false);
          el.addEventListener("keydown", _this._keyDown, false);
        },
        /* OFF */ function () {
          _this.lineDiv.removeEventListener("mousedown", _this._mouseDown, false);
          el.removeEventListener("keydown", _this._keyDown, false);
        }
      ).bind(this, "enabled", true);
    }
    return Click;
  })();
  exports.Click = Click;
  //#endregion
  /** ADDON GETTER (Singleton Pattern): a editor can have only one Click instance */
  exports.getAddon = core_1.Addon.Getter("Click", Click, exports.defaultOption /** if has options */);
});
