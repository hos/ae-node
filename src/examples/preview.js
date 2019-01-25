const { preview } = require('../')

const previewRequest = {
  template: {
    path: 'UserName/Template',
    aeps: [{
      fileName: 'project.aep',
      compositions: [{
        name: 'Composition',
        outputs: [{
          omTemplate: 'JPEG',
          startFrame: 3 * 30,
          endFrame: 3 * 30
        }, {
          name: 'Composition',
          omTemplate: 'CineForm',
          increment: 30
        }]
      }]
    }]
  },
  resolutions: [{
    height: 1080,
    width: 1920
  }]
}

preview(previewRequest)
  .then((output) => {
    console.log(JSON.stringify(output, null, 2))
  })
  .catch(console.error)
