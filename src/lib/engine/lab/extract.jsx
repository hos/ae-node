function appendExtractMeta (_lab) {
  function extractAVLayer (layer) {
    var type = _lab.getLayerType(layer.source)
    var file = layer.source.mainSource && layer.source.mainSource.file

    var filePath = file && file.fsName.replace(_lab.ctx.templatePath || '', '')

    if (filePath && type) {
      return {
        name: layer.name,
        relativePath: filePath,
        height: layer.height,
        width: layer.width,
        mediaType: _lab.getLayerType(layer.source)
      }
    }
  }

  function isUnusedComp (comp) {
    return !comp.usedIn.length
  }

  function extractTextLayer (layer) {
    return {
      name: layer.name,
      mediaType: 'text'
    }
  }

  function matchByFolderName (match) {
    var _match = typeof match === 'string' ? new RegExp(match) : match
    return function (item) {
      if (aeq.isFolderItem(item)) {
        if (!_match) {
          return true
        }
        return _match.test(item.name)
      }
      return false
    }
  }

  function getFolderComps (folder) {
    return aeq.getCompositions(folder, true)
  }

  function getRootComps () {
    return aeq.getComps().filter(function (comp) {
      return comp.parentFolder.name === 'Root'
    })
  }

  function extractLayer (layer) {
    if (aeq.isTextLayer(layer)) {
      return extractTextLayer(layer)
    } else if (aeq.isAVLayer(layer)) {
      return extractAVLayer(layer)
    }
  }

  function _compUsedInDeep (comp, comps) {
    return aeq.arrayEx(comps).find(function (_comp) {
      if (_comp.id === comp.id) {
        return true
      }
      if (_comp.usedIn.length > 0) {
        return _compUsedInDeep(comp, _comp.usedIn)
      }
    })
  }

  function _layerUsedInDeep (comp) {
    return function (layer) {
      return _compUsedInDeep(comp, layer.containingComp.usedIn)
    }
  }

  function isLayerMarkedAsReplaceable (layer) {
    return layer.comment.indexOf('$replace$') > -1
  }

  /**
   * @param {Object} opts
   * @param {string} opts.folderRegExp The folder paths.
   * @param {string} opts.flags The folder paths.
   * @param {string} opts.onlyUnused The folder paths.
   * @description Extarct composition metadata
   * and the layers used in specified composition.
   */
  _lab.extractMeta = function (opts) {
    function _extractComp (comp) {
      var layers = aeq('layer')
        .filter(isLayerMarkedAsReplaceable)
        .filter(_layerUsedInDeep(comp))
        .map(extractLayer)
        .filter(Lab.isTrue)

      if (layers.length) {
        return {
          name: comp.name,
          height: comp.height,
          width: comp.width,
          duration: comp.duration,
          frameRate: comp.frameRate,
          layers: layers
        }
      }
    }

    var regexp = new RegExp(opts.folderRegExp, opts.flags)

    var comps = aeq
      .getItems()
      .filter(matchByFolderName(regexp))
      .map(getFolderComps)
      // to get top level compositions
      .concat(getRootComps())

    var flat = [].concat.apply([], comps)
    if (opts.onlyUnused) {
      flat = flat.filter(isUnusedComp)
    }

    return flat.map(_extractComp).filter(_lab.isTrue)
  }
}

appendExtractMeta(Lab)
