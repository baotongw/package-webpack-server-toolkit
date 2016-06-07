var Hogan = require('hogan.js');

module.exports = function (source, fileName) {
    var compiledTxt = Hogan.compile(source, {
            asString: 1
        }),
        compiled = ';window.QTMPL=window.QTMPL||{}; window.QTMPL["' + fileName + '"] = new window.Hogan.Template(' + compiledTxt + ');';
    
    var mustacheOutput = compiled + '\nif(typeof module !== "undefined") module.exports = window.QTMPL["' + fileName + '"]';

    return mustacheOutput;
}