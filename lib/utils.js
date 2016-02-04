/**
 *	@author: baotong.wang
 *	@lastModify：2015-12-02
 *	@lastModiftDate: 2015-12-04
 *	@fileoverview: 工具里面的文件操作部分，将分析结果写入指定文件
 *	@dependence：依赖关系，需要***文件，没有无
 *	@other：文件、目录操作目前都是同步操作
 			分析结果文件会被写入result文件夹内
 */

var filesys = require('fs');
var pathsys = require('path');

var Utils = function() {}

Utils.prototype.fileOperator = {
	existsSync: function(filePath) {
		return filesys.existsSync(filePath);
	},
	readFileSync: function(filePath, contentType) {
		if(filesys.existsSync(filePath) === false) {
			return null;
		}

		return filesys.readFileSync(filePath, contentType || 'utf-8');
	},
	readFileJSONSync: function(filePath, contentType) {
		var content = this.readFileSync(filePath, contentType);

		return content ? JSON.parse(content) : content;
	},
	write: function(path, fileName, content) {
		var filePath = pathsys.resolve(path, fileName);

		if(filesys.existsSync(filePath) === false) {
			filesys.mkdirSync(config.root);
		}

		try {
			filesys.writeFileSync(filePath, content);
		} catch(e) {
			console.log('文件保存失败');
			console.log(e.message);
		}
	},
	append: function(filePath, content) {
		filesys.appendFileSync(filePath, content, function(er) {
			if(err) {
				console.log('增量添加文件失败');
			} else {
				console.log('增量添加文件成功');
			}
		})
	}
}

module.exports = new Utils();