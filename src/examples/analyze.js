const { analyze } = require('../')

async function test () {
  const data = {
    id: 'test-analyze',

    template: {
      path: 'UserName/Template'
    }
  }

  const analyzes = await analyze(data)

  console.log(JSON.stringify(analyzes, null, 2))
}

test().catch(console.error)
