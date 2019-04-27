# ae-node

This project only exports high level public API. There is no interface for advanced `Ae` usage, which means that low level interfaces not recommended for using, though they can be called by requiring files directly. <br>

### Installation

* Node.js >= 12.0.0
* After Effects
* rclone (tested on v1.44)

* As of node 12.0.0 you need to use flags [`--experimental-modules`](https://nodejs.org/dist/latest-v12.x/docs/api/esm.html#esm_enabling) and 
[`--es-module-specifier-resolution=node`](https://nodejs.org/dist/latest-v12.x/docs/api/esm.html#esm_customizing_esm_specifier_resolution_algorithm)

- The OMTemplate which must be used, first must be installed. See how to configure
  output module in [docs](https://adobe.ly/23CcygY).
- If there is no `Ae` license installed, better to use [render only mode](https://adobe.ly/2c854g3).
- Set required [environment variables](/docs/environment-variables.md).

### Methods

The API description is provided in examples. This will let to have
working examples and docs in one place, without code duplication.

<hr>

#### [render(data)](./src/examples/render.js)

```js
// the output
const output = { uri: "s3/path/to/output-file" };
```

#### [analyze(data)](./src/examples/analyze.js)

```js
// the output
const output = [
  // each element is a single .aep file
  {
    // path to project can be nested like 'category/project.aep'
    project: "/project.aep",
    // each element is for single composition
    compositions: [
      {
        // the composition name which will be used to render
        name: "Composition",

        // the composition's original resolution
        height: 2304,
        width: 4096,

        // duration of the composition
        duration: 5.37203870537204,

        // the FPS
        frameRate: 29.9700012207031,

        // text, image and video layers found in composition
        layers: [
          {
            name: "logo.png",
            // path relative to template's root
            // will be used to replace it
            relativePath: "/(Footage)/_Project Files/Images/logo.png",

            // height and width of the footage
            height: 1237,
            width: 1200,

            // media type (text, image, video)
            mediaType: "image"
          },
          {
            // text layer
            // the name which will be used to replace the value
            name: "What a Story",
            // media type (text, image, video)
            mediaType: "text"
          }
        ]
      }
    ]
  }
];
```

#### [preview(data)](./src/examples/preview.js)

```js
// the output
const output = [
  // each element is a single composition
  {
    name: "Composition",
    // each element is a output request like:
    previews: [
      // this we get using `omTemplate: 'CineForm'`, which is video
      "UserName/Template/_preview/Composition/1080x1920.mov",
      // this is for `omTemplate: 'JPEG'`, the 90th frame (0090)
      "UserName/Template/_preview/Composition/1080x1920_0090.jpg"
    ]
  }
];
```
