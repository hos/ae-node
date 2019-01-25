
/**
 * Lab is Adobe's extendscript file, which must be
 * loaded in After Effects environment to run successfully.
 * All functions will be assign to global 'Lab' object.
 * Don't use node.js environments specific names
 * like: console, global, process...
 * to keep code visually different which will let easily identify environment.
 */

var Lab = {}
var conn = new Socket()

/**
 * All execution specific properties,
 * must be passed as Lab.ctx.
 */
Lab.ctx = {
  host: null,
  logPath: null,
  outputPath: null,
  port: null
}

/**
 * Export object will be saved as json,
 * in 'Lab.ctx.outputPath' path.
 */
Lab.export = {
  _error: null,
  _return: {},
  _logs: []
}

/**
 * @param {Error} err
 * @description Alert with line number.
 */
Lab.alert = function (err) {
  alert(err.message + ('[' + err.line + ']'))
}

/**
 * @param {...Array} params
 * @description Add msg to into _logs
 * array and if TCP connection is open,
 * send message using socket.
 */
Lab.log = function () {
  var length = arguments.length
  var msg = ''

  for (var i = 0; i < length; i++) {
    var arg = arguments[i]
    if (typeof arg === 'string') {
      msg = msg + arg
    } else {
      msg = msg + (arg || '').toString()
    }
  }

  msg = msg + '\n'

  Lab.export._logs.push(msg)

  if (Lab.write) {
    Lab.write('' + msg)
  }
}

/**
 * @description If provided host and port in Lab.ctx
 * try to open TCP connection.
 */
Lab.connect = function () {
  try {
    if (!conn.connected && Lab.ctx.host && Lab.ctx.port) {
      if (conn.open(Lab.ctx.host + ':' + Lab.ctx.port)) {
        Lab.write = function (msg) {
          conn.write(msg)
        }
      }
    }
  } catch (err) {
    alert('failed connecting to the chat server: ' + err.message)
  }
}

/**
 * @description Open a project.
 */
Lab.openProject = function (filePath) {
  var file = new File(filePath)
  if (file.exists) {
    var opened = app.open(file)
    if (!opened) {
      throw Error('failed to open aep file ' + filePath)
    } else {
      return file
    }
  }
}

/**
 * @param {Error} err
 * @description Ensure that 'err' is instance
 * of object and not an error to write
 * in output file as 'json'.
 */
Lab.normalizeError = function (err) {
  if (err instanceof Error) {
    var stack = [].concat(
      [$.fileName + ('[' + err.line + ']')],
      (err.stack || '').split('\n').slice(1)
    )
    return {
      message: err.message,
      stack: stack
    }
  }

  if (typeof err === 'string') {
    return Error(err)
  }

  if (err instanceof Object) {
    return err
  }

  return new Error('error is undefined')
}

/**
 * @param {Error} err
 * @description Set _error in export object.
 */
Lab.setError = function (err) {
  var errObj = Lab.normalizeError(err)
  Lab.export._error = errObj
}

/**
 * @param {*} any
 * @param {string} key
 * @description Assigns 'any' to export._return[key].
 */
Lab.saveAs = function (any, key) {
  if (typeof key === 'string') {
    Lab.export._return[key] = any
  } else {
    Lab.export._return = any
  }
}

/**
 * @description Write logs to Lab.ctx.logPath.
 */
Lab.writeLog = function () {
  try {
    var file = new File(Lab.ctx.logPath)
    file.encoding = 'utf8'
    file.open('w')
    file.write(Lab.export._logs.join(''))
    file.close()
    Lab.logs = []
  } catch (err) {
    app.endSuppressDialogs(true)
    Lab.alert(err)
  }
}

/**
 * @description Writes Lab.export to Lab.outputPath
 * as .js file. Starting with `module.exports = ...`.
 */
Lab.writeOutput = function () {
  try {
    var file = new File(Lab.ctx.outputPath)
    file.encoding = 'utf8'
    file.open('w')
    var str = 'module.exports = ' + Lab.export.toSource()
    file.write(str)
    file.close()
  } catch (err) {
    app.endSuppressDialogs(true)
    Lab.alert(err)
  }
}

/**
 * @property {function} propertyValueType
 * @property {function} propertyType
 * @description Use to process values with
 * functions when stringify called. Each value
 * will be processed by key if specified in Translator.
 */
var Translator = {}

Translator.propertyValueType = function (type) {
  switch (type) {
    case PropertyValueType.NO_VALUE:
      return 'NO_VALUE'
    case PropertyValueType.ThreeD_SPATIAL:
      return 'ThreeD_SPATIAL'
    case PropertyValueType.ThreeD:
      return 'ThreeD'
    case PropertyValueType.TwoD_SPATIAL:
      return 'TwoD_SPATIAL'
    case PropertyValueType.TwoD:
      return 'TwoD'
    case PropertyValueType.OneD:
      return 'OneD'
    case PropertyValueType.COLOR:
      return 'COLOR'
    case PropertyValueType.CUSTOM_VALUE:
      return 'CUSTOM_VALUE'
    case PropertyValueType.MARKER:
      return 'MARKER'
    case PropertyValueType.LAYER_INDEX:
      return 'LAYER_INDEX'
    case PropertyValueType.MASK_INDEX:
      return 'MASK_INDEX'
    case PropertyValueType.SHAPE:
      return 'SHAPE'
    case PropertyValueType.TEXT_DOCUMENT:
      return 'TEXT_DOCUMENT'
    default:
      return type
  }
}

Translator.propertyType = function (type) {
  switch (type) {
    case PropertyType.PROPERTY:
      return 'PROPERTY'
    case PropertyType.INDEXED_GROUP:
      return 'INDEXED_GROUP'
    case PropertyType.NAMED_GROUP:
      return 'NAMED_GROUP'
    default:
      return type
  }
}

/**
 * @param {string} layerName
 * @param {*} value
 * @description Replace text value in text document prop,
 * in layer with provided layer name.
 */
Lab.replaceText = function (layerName, value) {
  aeq('layer[name="' + layerName + '"] prop[propertyValueType="' + PropertyValueType.TEXT_DOCUMENT + '"]')
    .forEach(function (prop) {
      prop.setValue(value)
    })
}

/**
 * @param {string} filePathToMatch
 * @param {string} newFilePath
 * @description Replace footage file.
 */
Lab.replaceAsset = function (filePathToMatch, newFilePath) {
  aeq('item').forEach(function (item) {
    if (item instanceof FootageItem && item.file) {
      if (item.file.fullName.indexOf(filePathToMatch) > -1) {
        var file = new File(newFilePath)
        item.replace(file)
      }
    }
  })
}

Lab.isTrue = function (o) {
  return !!o
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
Lab.isImg = function (filePath) {
  var imgTypes = [
    'ai', 'bmp', 'bw',
    'cin', 'cr2', 'crw',
    'dcr', 'dng', 'dib',
    'dpx', 'eps', 'erf',
    'exr', 'gif', 'hdr',
    'icb', 'iff', 'jpe',
    'jpeg', 'jpg', 'mos',
    'mrw', 'nef', 'orf',
    'pbm', 'pef', 'pct',
    'pcx', 'pdf', 'pic',
    'pict', 'png', 'ps',
    'psd', 'pxr', 'raf',
    'raw', 'rgb', 'rgbe',
    'rla', 'rle', 'rpf',
    'sgi', 'srf', 'tdi',
    'tga', 'tif', 'tiff',
    'vda', 'vst', 'x3f',
    'xyze'
  ]

  var ext = filePath.substr(
    filePath.lastIndexOf('.') + 1,
    filePath.length
  ).toLowerCase()

  return ext.match(
    new RegExp('(' + imgTypes.join('|') + ')', 'i')
  )
}

Lab.getLayerType = function (footageObject) {
  if (
    footageObject &&
    footageObject.mainSource &&
    footageObject.hasVideo
  ) {
    var filePath = File.decode(footageObject.mainSource.file)

    if (
      footageObject.mainSource.isStill ||
      Lab.isImg(filePath)
    ) {
      return 'image'
    } else {
      return 'video'
    }
  }
}
