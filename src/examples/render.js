const { render } = require('../')

async function test () {
  const data = {
    id: 'test-render',

    credentials: [{
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY
    }],

    template: {
      path: 'UserName/Template',
      aepName: 'project.aep',
      composition: 'Composition'
    },

    layers: [{
      relativePath: '/(Footage)/_Project Files/Images/logo.png',
      resource: {
        fetchMethod: 'http',
        url: 'https://fakeimg.pl/1500x1500/ffffff,0/ccc,255/?text=Logo'
      }
    }, {
      name: 'Layer Name',
      value: 'The Text'
    }],

    output: {
      name: 'CineForm',
      resolution: {
        width: 1920,
        height: 1080
      }
    },

    upload: {
      credentialsIndex: 0,
      endpoint: 'ams3.digitaloceanspaces.com',
      bucket: 'OutputBucket'
    }
  }

  const { uri, error } = await render(data)

  if (error) {
    return console.error(`failed rendering: ${error}`)
  }

  console.log(`uploaded to: ${uri}`)
}

test().catch(console.error)
