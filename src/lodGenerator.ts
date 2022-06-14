import {JSONDocument, NodeIO, Document, Node, Scene} from '@gltf-transform/core';
import {inspect} from '@gltf-transform/functions';
import {MSFT_LOD, LODList} from "./extensions/MSFT_LOD";
import {exit} from 'process';

(async function () {

//console.log(process.argv);


    if (process.argv.length <= 2 || process.argv[2] === "-h") {
        console.log(`
	parameters :
		command [space separated LOD file path (order not important)]
		
	`)
        exit();
    }

    const inputPath: string = process.argv[2];
    const outputPath: string = inputPath.replace("src", "dist")
    const io = new NodeIO().registerExtensions([MSFT_LOD]);
    let document: Document, jsonDocument: JSONDocument;

    //If we only have a premerged file
    if (process.argv.length === 3) {

        document = await io.read(inputPath);
        jsonDocument = await io.readAsJSON(inputPath);
        const MFST_lod = document.createExtension(MSFT_LOD);

        if ((jsonDocument.json.extensions && jsonDocument.json.extensions["MSFT_lod"]) || (jsonDocument.json.extensionsUsed && jsonDocument.json.extensionsUsed.find(a => a === "MSFT_lod"))) {
            console.log("Extension already detected")
            exit()
        }

        const root = document.getRoot();
        let nodelist = root.listNodes();
        let scenelist = root.listScenes();
        const accessorlist = root.listAccessors();

        //sort models per size using accessor data

        let nodeIndexSize = [];//list of all accessor identifying a unique model with it's vertex count as size.
        let previouslyfound = [];//list of previously found accessors to prevent duplicates, as a 3D model may have multiple
        // VEC3 accessors
        let j = 0;//valid accessor index
        for (let i = 0; i < accessorlist.length; i++) {
            let accessor = accessorlist[i];
            //there may be multiple occurrences of VEC3 for a specific asset
            if (accessor.getType() === 'VEC3' && previouslyfound.indexOf(accessor.getCount()) === -1) {
                previouslyfound.push(accessor.getCount());
                nodeIndexSize.push({id: j++, size: accessor.getCount()})
            }
        }

        function sortAccessorBySize(a, b) {
            //models[x].accessors[0].count is vertex count
            if (a.size > b.size) return -1;
            if (a.size < b.size) return 1;
            return 0;
        }
        nodeIndexSize.sort(sortAccessorBySize);

        //Generate LOD metadata

        //Each individual scene represent a LOD, nodelist is not a good representation as some LOD may have childs node not in order
        const LOD0 = scenelist[nodeIndexSize[0].id].listChildren()[0]
        const lodList = MFST_lod.createLODList();
        let screenCoverage = [];

        for (let i = 0; i < nodeIndexSize.length; i++) {
            //Main LOD is the first node of each scene
            let node = scenelist[nodeIndexSize[i].id].listChildren()[0];
            //console.log(node.getName(),nodeIndexSize[i].size);

            if (i != 0) {
                lodList.addLOD(node);
                //We use the ratio as screen coverage data
                //TODO : consider performance with vertex per pixel calculations for determining LOD distance per level
                screenCoverage.push(nodeIndexSize[i].size / nodeIndexSize[0].size)
            }
            if (i == scenelist.length - 1) {
                //push a second value for the last one
                screenCoverage.push(1 / nodeIndexSize[i].size / nodeIndexSize[0].size)
            }
        }
        LOD0.setExtension("MSFT_lod", lodList);
        LOD0.setExtras({"MSFT_screencoverage": screenCoverage})

        //Handle Scenes
        //We replace every non-level0 levels in the scenes
        //then delete all duplicate scene

        function getSceneDepth(scene:Scene):number{
            let childhoods = 0;
            scene.traverse((e) => {
                ++childhoods;
            })
            return childhoods;
        }
        function hotswap(oldNode:Node, newNode:Node) {
            //console.log("old", oldNode.getName(), "new",newNode.getName())
            //We only swap scene related data
            //parent
            const parent = oldNode.getParent() as Node;
            parent.swap(oldNode,newNode);
            //transform
            //newNode.setMatrix(oldNode.getMatrix());
            //childs // Must not be swap!!!
            // while(oldNode.listChildren().length != 0){
            //     newNode.addChild(oldNode.listChildren()[0])
            //     oldNode.removeChild(oldNode.listChildren()[0])
            // }
        }
        function sortSceneByDeepChildCount(a:Scene, b:Scene) {
            const SDA = getSceneDepth(a), SDB =  getSceneDepth(b);
            if (SDA > SDB) return -1;
            if (SDA < SDB) return 1;
            return 0;
        }

        //replacing non-LOD0 elements
        for (let i = 0; i < scenelist.length; i++) {
            const scene = scenelist[i];
            //console.log("next Scene")
            scene.traverse((node:Node) => {
                //is in lodList yet not being LOD0
                if (lodList.listLOD().indexOf(node) != -1 && LOD0 !== node) {
                    hotswap(node, LOD0)
                }
            })
        }
        //Order scenes to make duplicates adjacent
        const sortedSceneList = scenelist.sort(sortSceneByDeepChildCount);
        let duplicatedScenes = [];

        //Then extract duplicates
        for (let i = 0; i < sortedSceneList.length-1; i++) {
            if(sortedSceneList[i].equals(sortedSceneList[i+1])) {
                duplicatedScenes.push(sortedSceneList[i])
            }
        }
        //delete all duplicate scene
        duplicatedScenes.forEach(scene => scene.dispose())
        scenelist = root.listScenes();

        //update the default scene if required
        if(root.getDefaultScene() || root.getDefaultScene().isDisposed())
            root.setDefaultScene(scenelist[0])
    }

    await io.write(outputPath, document);

})();