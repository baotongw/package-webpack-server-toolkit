var pathsys = require('path'),
	md5 = require('md5'),
	urlsys = require('url'),
	utils = require('./utils.js'),
	fileOps = utils.fileOperator;

var contentBase = null,
	projectName;

// 用来缓存不同工程的配置文件
var projectMapping = {};
// // 用来缓存每个请求对应的依赖关系，对已经分析过的
var requireListCache = {};
var combine = false;

var config = {
	encodeType: 'utf-8',
	responseHeader: {
		'Content-Type': "text/html;charset=UTF-8"
	},
	consts: {
		RequestConst: 'RequestConst'
	}
}

// todo.. 封装各文件成一个模块
var generateModule = {

}

// todo .. 生成各个文件的返回结果
// no_combine: 不需要合并的话，返回document.wirte（各文件地址）
// combine: 合并文件然后返回
var generateResponse = {
	handle: function(guid, content) {

	},
	getResponse: function() {

	}
}

var requireAnalysis = {
	patterns: {
		requirePattern: /require\(['|"].*?['|"]\)/igm,
		pathPattern: /require\(['|"](.*?)['|"]\)/ig,
		// 匹配第一个单词，然后和alias配置匹配，如果有就替换为alias对应的完整路径
		aliasPattern: /(.+?)(?:\/|\\)/,
		modulePattern: /[\w-_]+/
	},
	readFile: function(rootPath) {
		var result,
			activePath;

		if (Array.isArray(rootPath)) {
			for (var i = 0; i < rootPath.length; i++) {
				result = fileOps.readFileSync(rootPath[i]);

				if (result) {
					activePath = rootPath[i];
					break;
				}
			}
		} else {
			activePath = rootPath;
			result = fileOps.readFileSync(rootPath);
		}

		return {
			path: activePath,
			content: result
		};
	},
	readThirdPartyModule: function(moduleName) {
		var moduleDirectories = projectMapping[projectName]['moduleDirectories'];

		var modulePath = pathsys.resolve(contentBase, projectName, moduleName);

		// var
	},
	//对于没有包含后缀名的文件，同时检测js和css
	checkExtensionName: function(filePath) {
		var types = ['.js', '.css'],
			fileExist,
			possiblePath,
			i;

		if (pathsys.extname(filePath) === '') {
			for (i = 0; i < types.length; i++) {
				possiblePath = filePath + types[i];

				if (fileOps.existsSync(possiblePath)) {
					return possiblePath;
				}
			}
		}

		return filePath;
	},
	//检测前缀是否包含alias，如果包含替换成完整路径
	checkPrefix: function(filePath, parentPath) {
		var matches = filePath.match(this.patterns.aliasPattern),
			prefix = parentPath === config.consts.RequestConst ? contentBase : '',
			alias;

		if (matches && matches.length === 2) {
			alias = matches[1];
		}

		// 匹配到了alias的存在，替换成完整路径
		if (projectMapping[projectName]['alias'][alias]) {
			filePath = filePath.replace(this.patterns.aliasPattern, projectMapping[projectName]['alias'][alias] + '/');

			filePath = pathsys.join(contentBase, projectName, filePath);
		} else {
			//请求的链接地址，包含工程名
			if (filePath.indexOf(projectName) !== -1) {
				filePath = pathsys.join(prefix, filePath);
			} else {
				//相对于父文件的相对路径
				filePath = pathsys.join(parentPath || '', filePath);
			}
		}

		return filePath;
	},
	getReferences: function(filePath, parent, requireList) {
		requireList = requireList || [];

		filePath = requireAnalysis.checkPrefix(filePath, parent);
		filePath = requireAnalysis.checkExtensionName(filePath);

		var encyptPath = md5(filePath);

		var fileContent = requireAnalysis.readFile(filePath),
			parentPath = pathsys.dirname(filePath),
			returnFilePath = null;

		if (requireListCache[filePath]) {
			return null;
		}

		var obj = {
			filePath: filePath,
			key: encyptPath
		}

		requireListCache[filePath] = 1;

		if (!fileContent.content) {
			return {
				filePath: filePath,
				error: 'file not found'
			};
		}

		var imports = fileContent.content.match(requireAnalysis.patterns.requirePattern);

		if (!imports) {
			return obj;
		}

		for (var i = 0, item, subFile = null, tempPath = null; i < imports.length; i++) {
			imports[i].match(requireAnalysis.patterns.pathPattern);

			tempPath = RegExp.$1;
			item = this.getReferences(tempPath, parentPath, requireList);

			item && requireList.push(item);
		}		

		if (parent === config.consts.RequestConst) {
			requireList.push(obj);
			console.log('getReferences: return the require list');
			return requireList;
		}

		return obj;
	}
}

var readWebpackConfig = function() {
	//contentBase = 工程根目录，我本地叫qzz
	var config = pathsys.join(contentBase, projectName || '', 'webpack.config.js');

	var webpackConfig = require(config);

	return {
		alias: webpackConfig.resolve.alias,
		moduleDirectories: webpackConfig.resolve.modulesDirectories
	}
}

module.exports = function(options) {
	var md5Pattern = /@.+?\./i,
		onlinePattern = /prd/,
		projectNamePattern = /(?:\\|\/)?(.+?)(?:\\|\/)/,
		isCss = /\.css/;

	contentBase = options.contentBase;

	combine = false;
    
    return function(req, res, next) {
        if(onlinePattern.test(req.url)) {
        	//过滤掉线上的工程名和prd路径，保持请求路径和exports下的路径一直
            req.url = req.url.replace(md5Pattern, '.').replace(projectNamePattern, '').replace(onlinePattern, '');
            console.log('request url')
            console.log(req.url)
        }
        
        next();
    }
}