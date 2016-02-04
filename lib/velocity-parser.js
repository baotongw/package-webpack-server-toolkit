var velocity = require('velocityjs');
var pathsys = require('path');
var filesys = require('fs');
// var urlrouter = require('urlrouter');

var contentType = {
	'Content-Type': "text/html;charset=UTF-8"
};

module.exports = function(options) {
	var contentBase = options.contentBase,
		format = 'utf-8',
		compiled = null,
		vmFolderRoot = null;

	var macros = {
		load: function(path) {
			// 这里调用velocity本身的jsmacros.parse，
			// 但是这里的parse内部调用是我们自己定义的
			return this.jsmacros.parse.call(this, path);
		},
		parse: function(path) {
			return parseVM(path, false);
		},
		ver: function(path) {
			return '';
		}
	}

	function parseVM(vmPath, isClientRequest) {
		if (isClientRequest) {
			vmPath = pathsys.join(contentBase, vmPath);			
		} else {
			vmPath = pathsys.join(contentBase, vmFolderRoot, vmPath);
		}

		var vmSource, vmJSON, vmJsonPath = vmPath.replace(/\.vm/, '.json');

		if (filesys.existsSync(vmPath)) {
			vmSource = filesys.readFileSync(vmPath, format);
		} else {
			// return '<p>The file ' + vmPath + ' is not exits</p>';
		}

		var asts = velocity.parse(vmSource);

		if (compiled !== null) {
			//如果是内部parse调用的模板，这里直接调用velocity内部的_render方法来渲染模板
			//这就就能使用内部已存在的context，macros
			return compiled._render(asts);
		}

		compiled = new velocity.Compile(asts);

		if (filesys.existsSync(vmJsonPath)) {
			vmJSON = filesys.readFileSync(vmJsonPath, format);
		} else {
			vmJSON = null;
		}

		return compiled.render(JSON.parse(vmJSON), macros);
	}

	var pattern = /\.vm|\.vmhtml/,
		projectNamePattern = /(.+?)(?:\\|\/)/;

	return function(req, res, next) {
		compiled = null;
		req.url.match(projectNamePattern);
		vmFolderRoot = RegExp.$1;

		if (pattern.test(req.url)) {
			res.writeHead(200, contentType);
			res.end(parseVM(req.path, true));
		} else {
			next();
		}
	}
}