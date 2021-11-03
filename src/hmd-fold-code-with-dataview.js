// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `DataviewRenderer` for FoldCode addon

import { Component } from "obsidian";
import gte from "semver/functions/gte";

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.FoldCode);
})(function (require, exports, CodeMirror, fold_1, fold_code_1) {
  "use strict";
  var dependencyCheck = function () {
    const plugin = window.app.plugins.getPlugin("dataview");
    return plugin?._loaded && gte(plugin?.manifest.version, "0.4.17") ? true : false;
  };
  var DataviewRenderer = function (code, info) {
    var el = document.createElement("div");
    var ctx = new Component();
    ctx.sourcePath = info.editor.state.fileName;
    if (dependencyCheck()) {
      if (info.lang === "dataview") {
        window.app.plugins.getPlugin("dataview").dataview(code, el, ctx, ctx.sourcePath);
      } else if (info.lang === "dataviewjs") {
        window.app.plugins.getPlugin("dataview").dataviewjs(code, el, ctx, ctx.sourcePath);
      }
      ctx.load();
      el = ctx._children[0].containerEl;
      function unload() {
        ctx._children[0].unload();
        ctx.unload();
        ctx._children[0] = null;
        ctx._children = null;
      }
      info.unload = unload;
      return {
        element: el,
        asyncRenderer: null,
      };
    } else {
      el.innerText = "Error: Unable to find the Dataview plugin or version not 0.4.17 or greater";
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
