import {
	Extension,
	IProperty,
	ReaderContext,
	WriterContext,
	Nullable,
	ExtensionProperty,
	PropertyType,
	GLTF, Node
} from '@gltf-transform/core';
import {MappingList, Variant} from "./khr-materials-variants";
import INode = GLTF.INode;

const NAME = "MSFT_lod";
const ExtensionName ="MSFT_screencoverage";
const extraName = "MSFT_screencoverage";

 interface ILODList extends IProperty {
	levels: Node[]
 }

 interface LODListDef {
	 ids:number[]
 }

 export class LODList extends ExtensionProperty<ILODList>{
	 public static EXTENSION_NAME = NAME;
	 public declare extensionName: typeof NAME;
	 public declare propertyType: 'NodeList';
	 public declare parentTypes: [PropertyType.NODE];

	 protected init(): void {
		 this.extensionName = NAME;
		 this.propertyType = 'NodeList';
		 this.parentTypes = [PropertyType.NODE];
	 }

	 protected getDefaults(): Nullable<ILODList> {
		 return Object.assign(super.getDefaults() as IProperty, {levels:[]});
	 }

	 public addLOD(node:Node):this {
		 return this.addRef('levels',node);
	 }

	 public removeLOD(node:Node):this {
		 return this.removeRef('levels',node);
	 }

	 public listLOD(): Node[] {
		 return this.listRefs('levels');
	 }

}

export class MSFT_LOD extends Extension {
	extensionName = NAME;
	static EXTENSION_NAME = NAME;

	dispose() {
		super.dispose();
	}

	public createLODList(){
		return new LODList(this.document.getGraph());
	}

	read(readerContext: ReaderContext): this {
		const jsonDoc = readerContext.jsonDoc;
		//test if extension exist
		if ((!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME]) && (!jsonDoc.json.extensionsUsed || !jsonDoc.json.extensionsUsed.find(a => a === NAME))) return this;
		const nodeDefs = jsonDoc.json.nodes || [];
		//parse nodes
		nodeDefs.forEach((nodeDef:INode,nodeIndex:number)=>{
			const node = readerContext.nodes[nodeIndex];
			//skip nodes without extensions
			if (!nodeDef.extensions || !nodeDef.extensions[NAME]) {
				return;
			}

			//fill the LOD list with nodes that represent different levels
			const lodList = this.createLODList();
			const lodListDef = nodeDef.extensions[NAME] as LODListDef;
			for (const level of lodListDef.ids){
				lodList.addLOD(readerContext.nodes[level]);
			}

			//apply found lods
			node.setExtension(NAME,lodList);
		})

		return this;
	}

	write(writerContext: WriterContext): this {
		const jsonDoc = writerContext.jsonDoc;
		const nodeList = this.document.getRoot().listNodes();
		nodeList.forEach((node:Node,nodeIndex:number)=>{
			const lodList = node.getExtension<LODList>(NAME);
			if (!lodList) return;

			const lodListDef:LODListDef = { ids : lodList.listLOD().map(node =>nodeList.indexOf(node))}

			//console.log(lodListDef);

			const nodedef = jsonDoc.json.nodes[nodeIndex];
			nodedef.extensions = nodedef.extensions || {};
			nodedef.extensions[NAME] = lodListDef;
		})

		jsonDoc.json.extensions = jsonDoc.json.extensions || {};
		jsonDoc.json.extensions[NAME] = {};

		return this;
	}
}