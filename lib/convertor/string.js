var patterns = {
	// remove Enter and Tab
	enter: /[\r\n|\n|\t]*/img,
	singleQuote: /'/mg,
	fileName: /([\w|-|_|\.]+)\.\w/
}

module.exports = function (source, fileName) {
    //string中存放的是纯文本，这里直接将其编译成js语法格式返回即可
    source = source.replace(patterns.enter, '').replace(patterns.singleQuote, '"');
    source = 'String(\'' + source + '\')';

    var result = 'window.QTMPL=window.QTMPL||{};window.QTMPL=window.QTMPL||{};window.QTMPL[\'' + fileName + '\']=' + source + ';module.exports=window.QTMPL[\'' + fileName + '\'];';
    return result;
}