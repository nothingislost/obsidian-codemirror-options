// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `AdmonitionRenderer` for FoldCode addon
import { Component } from "obsidian";
import gte from "semver/functions/gte";

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.FoldCode);
})(function (require, exports, CodeMirror, fold_1, fold_code_1) {
  "use strict";
  var dependencyCheck = function () {
    const plugin = window.app.plugins.getPlugin("obsidian-admonition");
    return plugin?._loaded && gte(plugin?.manifest.version, "6.3.6") ? true : false;
  };
  var AdmonitionRenderer = function (code, info) {
    const adType = info.lang.substring(3);
    var el = document.createElement("div");
    var asyncRenderer;
    var ctx = new Component();
    ctx.sourcePath = info.editor.state.fileName;
    if (dependencyCheck()) {
      asyncRenderer = async () => {
        try {
          window.app.plugins.getPlugin("obsidian-admonition").postprocessor(adType, code, el, ctx);
          ctx.load();
        } catch (error) {
          el.innerText = "Failed to render Admonition: " + error;
        }
        function unload() {
          ctx._children[0].unload();
          ctx.unload();
          ctx._children[0] = null;
          ctx._children = null;
        }
        info.unload = unload;
      };
    } else {
      el.innerText = "Error: Unable to find the Admonitions plugin or Admonition version not 6.3.6 or higher";
    }
    return {
      element: el,
      asyncRenderer: asyncRenderer,
    };
  };
  exports.AdmonitionRenderer = AdmonitionRenderer;

  CodeMirror.defineOption("admonition", null, function (cm) {
    fold_code_1.getAddon(cm).clear("admonition");
    fold_1.getAddon(cm).startFold();
  });
  fold_code_1.registerRenderer({
    name: "admonition",
    pattern: /^ad-(?:[a-z]+)$/i,
    renderer: exports.AdmonitionRenderer,
    suggested: false,
  });
});
