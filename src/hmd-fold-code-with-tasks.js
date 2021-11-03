// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `TasksRenderer` for FoldCode addon

import { Component } from "obsidian";
import gte from "semver/functions/gte";

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.FoldCode);
})(function (require, exports, CodeMirror, fold_1, fold_code_1) {
  "use strict";
  var dependencyCheck = function () {
    const plugin = window.app.plugins.getPlugin("obsidian-tasks-plugin");
    return plugin?._loaded && gte(plugin?.manifest.version, "1.4.0") ? true : false;
  };
  var TasksRenderer = function (code, info) {
    var el = document.createElement("div");
    var ctx = new Component();
    ctx.sourcePath = info.editor.filePath;
    if (dependencyCheck()) {
      const renderer = window.app.plugins.getPlugin("obsidian-tasks-plugin").queryRenderer.addQueryRenderChild;
      renderer(code, el, ctx);
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
      el.innerText = "Error: Unable to find the Tasks plugin or version not 1.4.0 or greater";
    }

    return {
      element: el,
      asyncRenderer: null,
    };
  };
  exports.TasksRenderer = TasksRenderer;
  CodeMirror.defineOption("tasks", null, function (cm) {
    fold_code_1.getAddon(cm).clear("tasks");
    fold_1.getAddon(cm).startFold();
  });
  fold_code_1.registerRenderer({
    name: "tasks",
    pattern: /^tasks$/i,
    renderer: exports.TasksRenderer,
    suggested: false,
  });
});
