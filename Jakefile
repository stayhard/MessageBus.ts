var exec = require('child_process').exec,
	fs = require('fs'),
	Mocha = require('mocha');

task('default', {async: true}, function () {

	var getScripts = function(dir) {
	    var results = [];
	    var list = fs.readdirSync(dir);
	    list.forEach(function(file) {
	        file = dir + '/' + file;
	        var stat = fs.statSync(file);
	        if (stat && stat.isDirectory()) {
	        	results = results.concat(getScripts(file));
	        }
	        else if (file.indexOf('.ts', file.length - 3) !== -1) {
	        	results.push(file);
	        }
	    })
	    return results
	}

	var files = ['MessageBus.ts', 'MessageBus.tests.ts'];
	files = files.concat(getScripts('definitions'));


	var args = [
		'tsc',
		'--out work/all.js',
		files.join(' ')
		];

	console.log('Building project...');

	console.log();
	var child = exec(args.join(' '),
	                function(error, stdout, stderr) {
	                    if (stderr) {
	                      console.log(stderr);
	                      console.log();
	                      console.log('Build failed.')
	                    }
	                    else {

	                    	console.log('Built ' + files.length + ' files successfully.');

	                    	console.log('Running test');

	                    	var mocha = new Mocha;

							mocha.addFile('work/all.js');
							mocha.addFile(require.resolve('should'));

							mocha.run(function(failures){
								process.on('exit', function () {
									process.exit(failures);

									complete();
								});
							});
	                    }
	                });
	
});

/**
 * Creates all directories in a path if any or all of them don't exist.
 */
function mkpathSync(path) {
	var currentPath = "";
	var parts = path.split('/');
	for (var i = 0; i < parts.length; i++) {
		currentPath = currentPath + parts[i] + "/";

		if (!fs.existsSync(currentPath)) {
			console.log("create " + currentPath);
			fs.mkdir(currentPath);
		}	
	}
}

task('nuget', function () {
	
	var package = JSON.parse(fs.readFileSync('package.json'));

	mkpathSync("work/nuget/Content/Scripts");
	mkpathSync("work/nuget/tools");

	var file = [
	'<?xml version="1.0"?>',
	'<package>',
	'  <metadata>',
    '    <id>' + package.name + '</id>',
    '    <version>' + package.version + '</version>',
    '    <authors>' + package.author + '</authors>',
    '    <projectUrl>' + package.homepage + '</projectUrl>',
    '    <requireLicenseAcceptance>false</requireLicenseAcceptance>',
    '    <description>' + package.description + '</description>',
    '    <copyright>Copyright 2014 Stayhard AB</copyright>',
    '    <licenseUrl>https://github.com/stayhard/MessageBus.ts/blob/master/LICENSE</licenseUrl>',
    '  </metadata>',
    '</package>'];
	fs.writeFileSync('work/nuget/MessageBus.ts.nuspec', file.join('\r\n'));

	file = [
	'param($installPath, $toolsPath, $package, $project)',
	'Write-Host "Setting Build Action of Scripts/MessageBus.ts to \'TypeScriptCompile\'"',
	'$project.ProjectItems.Item("Scripts").ProjectItems.Item("MessageBus.ts").Properties.Item("ItemType").Value = "TypeScriptCompile"'
	];
	fs.writeFileSync('work/nuget/tools/install.ps1', file.join('\r\n'));

	fs.createReadStream('MessageBus.ts').pipe(fs.createWriteStream('work/nuget/Content/Scripts/MessageBus.ts'));

	exec('nuget pack work/nuget/MessageBus.ts.nuspec -OutputDirectory work',
        function(error, stdout, stderr) {
            if (stderr) {
              console.log(stderr);
              console.log();
              console.log('NuGet packaging failed.')
            }
            else {
            	console.log(stdout);
            }
        });

});


jake.addListener('complete', function () {
  
});