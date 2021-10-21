// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `DataviewRenderer` for FoldCode addon

import { Component } from "obsidian";

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.FoldCode);
})(function (require, exports, CodeMirror, fold_1, fold_code_1) {
  "use strict";
  var dependencyCheck = function () {
    return window.app.plugins.getPlugin("dataview")?._loaded;
  };
  var DataviewRenderer = function (code, info) {
    var el = document.createElement("div");
    var ctx = new Component();
    ctx.sourcePath = info.editor.filePath;
    if (dependencyCheck()) {
      if (info.lang === "dataview") {
        window.app.plugins.getPlugin("dataview").dataview(code, el, ctx, ctx.sourcePath);
      } else if (info.lang === "dataviewjs") {
        window.app.plugins.getPlugin("dataview").dataviewjs(code, el, ctx, ctx.sourcePath);
      }
      ctx.load();
      el = ctx._children[0].containerEl;
      setTimeout(() => {
        ctx._children[0].unload();
        ctx.unload();
      }, 500);
      return {
        element: el,
        asyncRenderer: null,
      };
    } else {
      el.innerText = "Error: Unable to find the Dataview plugin";
    }

    return {
      element: el,
      asyncRenderer: null,
    };
  };
  exports.DataviewRenderer = DataviewRenderer;
  CodeMirror.defineOption("dataview", null, function (cm) {
    fold_code_1.getAddon(cm).clear("dataview");
    fold_1.getAddon(cm).startFold();
  });
  fold_code_1.registerRenderer({
    name: "dataview",
    pattern: /^dataview(js)?$/i,
    renderer: exports.DataviewRenderer,
    suggested: false,
  });
});
