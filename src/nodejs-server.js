/* NodeJS File Server with echo3D for Web AR apps */
var http = require("http"),
	https = require('follow-redirects').https,
	url = require("url"),
	path = require("path"),
	fs = require("fs"),
	request = require('request'),
	port = process.argv[2] || 8887;

/* Constants */
var apiKey = 'silent-haze-3427';
var echo3Dserver = 'https://api.echo3D.co/query?'
var fileRequest = echo3Dserver + 'key=' + apiKey + '&file=';

/* Variables */
var entries = [ ];

/* Download Funtion */
var download = function(url, dest, entry, callback){
    request.get(url)
    .on('error', function(err) {console.log(err)} )
    .pipe(fs.createWriteStream(dest))
    .on('close', function() {callback(entry)});
};

/* Create Server */
http.createServer(function(request, response) {

	var uri = url.parse(request.url).pathname
		, filenamePath = path.join(process.cwd(), uri);

  	var contentTypesByExtension = {
		'.html': "text/html",
		'.css':  "text/css",
		'.js':   "text/javascript"
  	};

	/* Download and Parse Database */
	var json = "";
	var request = https.get(echo3Dserver + 'key=' + apiKey , function(responseJSON) {
		responseJSON.on('data', function(d)  {
		  json += d;
	  	});
		responseJSON.on('end', function()  {
			var obj = JSON.parse(json);
			for (var entry in obj.db) {
				var filenameDownloadList = [ ];
				var storageIDDownloadList = [ ];
				/* Save Entry */
				var entryObject = obj.db[entry];
				entries.push(entryObject);
				/* Get Target Downloadables */
				if (entryObject.target.type == 'IMAGE_TARGET') {
					filenameDownloadList.push(entryObject.target.filename);
					storageIDDownloadList.push(entryObject.target.storageID)
				}
				/* Get Holograms Downloadables */
				filenameDownloadList.push(entryObject.hologram.filename);
				storageIDDownloadList.push(entryObject.hologram.storageID);
				if (entryObject.hologram.type == 'MODEL_HOLOGRAM') {
					for (var textureFilename in entryObject.hologram.textureFilenames){
						filenameDownloadList.push(entryObject.hologram.textureFilenames[textureFilename]);
					}
					for (var textureStorageID in entryObject.hologram.textureStorageIDs){
						storageIDDownloadList.push(entryObject.hologram.textureStorageIDs[textureStorageID]);
					}
					filenameDownloadList.push(entryObject.hologram.materialFilename);
					storageIDDownloadList.push(entryObject.hologram.materialStorageID);
				}
				/* Get Additional Data Downloadables (for AR.js) */
				if (entryObject.additionalData.arjsTargetStorageID) {
					filenameDownloadList.push(entryObject.additionalData.arjsTargetStorageFilename);
					storageIDDownloadList.push(entryObject.additionalData.arjsTargetStorageID);
				}
				/* Download Assets */
				var i = 0;
				var filesDownloaded = 0;
                storageIDDownloadList.forEach(function(storageID) {
	                var filename = filenameDownloadList[i++];
					var url = fileRequest + storageID;
	                console.log('\nDownloading ' + filename);
                    console.log('Calling ' + url + '\n');
					/* Call download */
					download(url, filename, entryObject, function(entry){
                        console.log('Finished Downloading ' + filename);
						filesDownloaded++;
						if (filesDownloaded >= storageIDDownloadList.length){
							console.log('All files of entry ' + entry.id + ' finished downloading.');

							/* --------------------- */
							/* INSERT YOUR CODE HERE */
							/* --------------------- */
							/* E.g., Redirect to index.html, or error if does not exist
							fs.exists(filenamePath, function(exists) {
								if (!exists) {
									response.writeHead(404, {"Content-Type": "text/plain"});
									response.write("404 Not Found\n");
									response.end();
									return;
						        }
								if (fs.statSync(filenamePath).isDirectory()) filenamePath += '/index.html';
								fs.readFile(filenamePath, "binary", function(err, file) {
									if (err) {
										response.writeHead(500, {"Content-Type": "text/plain"});
										response.write(err + "\n");
										response.end();
										return;
									}
									var headers = {};
									var contentType = contentTypesByExtension[path.extname(filenamePath)];
									if (contentType) headers["Content-Type"] = contentType;
									response.writeHead(200, headers);
									response.write(file, "binary");
									response.end();
								});
							});
							*/
						}
					});
                });
            }
		});
   });
}).listen(parseInt(port, 10));

console.log("Server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
