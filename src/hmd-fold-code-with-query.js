// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `QueryRenderer` for FoldCode addon

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.FoldCode);
})(function (require, exports, CodeMirror, fold_1, fold_code_1) {
  "use strict";
  var dependencyCheck = function () {
    return window.app.internalPlugins.getPluginById("global-search")?._loaded;
  };
  const purifySettings = {
    ALLOW_UNKNOWN_PROTOCOLS: true,
    IN_PLACE: true,
    // RETURN_DOM_FRAGMENT: true,
    // RETURN_DOM_IMPORT: true,
    FORBID_TAGS: ["style"],
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["frameborder", "allowfullscreen", "allow", "aria-label-position"],
  };
  var QueryRenderer = function (code, info) {
    // Welcome to the very hacky query renderer code
    // Here we pretend to be a preview mode section and steal the rendered element
    var queryEl = document.createElement("div");
    if (dependencyCheck()) {
      var promises = [];
      const previewMode = window.app.workspace.activeLeaf.view.previewMode,
        renderer = previewMode.renderer;
      queryEl.innerHTML = `<pre><code class="language-query">${code}</code></pre>`;
      // Sanitize the HTML to make sure there's no funny business
      window.DOMPurify.sanitize(queryEl, purifySettings);
      renderer.owner.postProcess({ el: queryEl }, promises, renderer.frontmatter);
      var targetChild;
      Array.from(renderer.owner._children).forEach(child => {
        if (child.containerEl === queryEl.firstChild) {
          targetChild = child;
        }
      });
      // But wait... we have to clean up after ourselves so that we don't cause a memory leak
      // We do so by removing the node we just created from the preview mode's child list
      function unload() {
        previewMode.removeChild(targetChild);
        renderer.owner._children.remove(targetChild);
        targetChild.unload();
        targetChild = null;
      }
      info.unload = unload;
      // we naively wait here because search query results are async
      // if we clean up too fast, we don't get results
    } else {
      queryEl.innerText = "Error: Unable to find the Global Search plugin";
    }
    return {
      element: queryEl,
      asyncRenderer: null,
    };
  };
  exports.QueryRenderer = QueryRenderer;

  CodeMirror.defineOption("query", null, function (cm) {
    fold_code_1.getAddon(cm).clear("query");
    fold_1.getAddon(cm).startFold();
  });
  fold_code_1.registerRenderer({
    name: "query",
    pattern: /^query$/i,
    renderer: exports.QueryRenderer,
    suggested: false,
  });
});
