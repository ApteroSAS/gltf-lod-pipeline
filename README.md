# Transfom 3D models in a MSFT_lod ready model.

The goal of this pipeline is to transform one model into multiple LOD and merge them as MSFT_LOD using GLTF-Transform.

The current state of the project is to import multiple pre-made LODs ans convert them into one model supporting MSFT_LOD.

## Project structure :
````
/dist : output
/src  : main code
  /extensions : custom extension folder with khr-materials-variants as reference
  /models     : original input models
    /sphere-prelod : temporary files that were merged
````

## Packages used :

@gltf-transform/* : all tools from https://gltf-transform.donmccurdy.com

@ts-node : typescript runtime for node

## Working process :
- One : Merge models with the CLI
 `$ gltf-transform merge .\src\models\Psphere_LOD_0.gltf .\src\models\Psphere_LOD_1.gltf .\src\models\Psphere_LOD_2.gltf .\src\models\sphere-prelod\sphereOutput.gltf --vertex-layout separate --partition true`
- Two : Transform the merged file into a MSFT_LOD ready one : `npx ts-node ./src/lodGenerator.ts src/models/sphere-prelod/sphereOutput.gltf`

(src/sphere-prelod folder contains only temporary files)

This workflow is represented by the `merge` and `go` script.
The terminal is used for merge as the script function seemed to not have as many options as the CLI. (have to be tested)


Other scripts are not ready yet.


## Tree merging and LOD
``
gltf-transform merge .\src\models\arbre_lod\LOD0Arbre2.gltf .\src\models\arbre_lod\LOD1Arbre2.gltf .\src\models\arbre_lod\LOD2Arbre2.gltf .\src\models\arbre_lod\LOD3Arbre2.gltf .\src\models\arbre_lod\LOD4Arbre2.gltf .\src\models\prelod\arbre_output.gltf --vertex-layout separate --partition true
``
