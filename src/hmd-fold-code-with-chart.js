// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `ChartRenderer` for FoldCode addon
import { Component } from "obsidian";

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.FoldCode);
})(function (require, exports, CodeMirror, fold_1, fold_code_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ChartRenderer = void 0;
  var dependencyCheck = function () {
    return window.app.plugins.getPlugin("obsidian-charts")?._loaded ? true : false;
  };
  var ChartRenderer = function (code, info) {
    var el = document.createElement("div");
    var ctx = new Component();
    if (dependencyCheck()) {
      var asyncRenderer = () => {
        try {
          window.app.plugins.getPlugin("obsidian-charts").postprocessor(code, el, ctx);
          ctx.load();
          // el = ctx._children[0].containerEl;
        } catch (error) {
          el.innerText = "Failed to render Chart: " + error;
        }
      };
    } else {
      el.innerText = "Error: Unable to find the Obsidian Charts plugin";
    }
    // charts have an element detach listener that causes charts to disappear when they leave
    // the codemirror viewport. this redraw function forces them to redraw once they're back
    // in the visible viewport
    info.redraw = function () {
      try {
        ctx._children[0].chart.attached = true;
        ctx._children[0].chart.resize();
      } catch {}
    };
    function unload() {
      ctx._children[0].unload();
      ctx.unload();
      ctx._children[0] = null;
      ctx._children = null;
    }
    info.unload = unload;
    return {
      element: el,
      asyncRenderer: asyncRenderer,
    };
  };
  exports.ChartRenderer = ChartRenderer;
  if (true) {
    CodeMirror.defineOption("chart", null, function (cm) {
      fold_code_1.getAddon(cm).clear("chart");
      fold_1.getAddon(cm).startFold();
    });
    fold_code_1.registerRenderer({
      name: "chart",
      pattern: /^chart$/i,
      renderer: exports.ChartRenderer,
      suggested: true,
    });
  }
});
