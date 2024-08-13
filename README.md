# Sketchy Effect

An Sketchy Effect effect for THREE.js and post-processing (using vanilla THREE.js).

Take a peek at [last scene](https://isladjan.com/)

This effect is based on the work of [mayacoda/pencil-lines](https://github.com/mayacoda/pencil-lines)
<br />

# Requirements
To run this project, you'll need the following:
- three.js
- [postprocessing](https://github.com/pmndrs/postprocessing)
<br />


# Installation
``` 
npm install

//run example
npx vite
npx vite build
npx vite preview
```
<br />


# How to use
Grab sketchyEffect.js and set it up according to the example in index.html.
```javascript
import { EffectComposer, RenderPass, EffectPass } from "postprocessing";
import { SketchyEffectPass } from '../sketchyEffect'

const renderPass = new RenderPass(this.scene, this.camera)
const sketchyEffectPass = new SketchyEffectPass(this)

const composer = new EffectComposer(this.renderer)
composer.addPass(renderPass)
composer.addPass(sketchyEffectPass)
```
<br />

# License
This project is licensed under the MIT License.