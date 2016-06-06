"use strict";

var sysFs = require('fs');
var jsVm = require('vm');
var sysUtil = require('util');
var sysPath = require('path');

var request = require('request')
var urlParser = require('url');
var queryString = require('querystring');
var _ = require('underscore');
var async = require('async');

var mockManager = {
    respFuncMap:{
        "proxy_pass":function(confResp,context,done){

            var mockUrlObj = urlParser.parse(confResp);
            var mockQueryStringObj = queryString.parse(mockUrlObj.query);

            var req = context.req;
            var reqUrlObj = urlParser.parse(req.url);
            var reqQueryStringObj = queryString.parse(reqUrlObj.query);

            mockUrlObj.query = queryString.stringify({},mockQueryStringObj,reqQueryStringObj);
            mockUrlObj.search = '?' + mockUrlObj.query;

            var proxyOptions = {
                url:confResp,
                set_header:{}
            };
            proxyOptions.url = urlParser.format(reqUrlObj);
            proxyOptions.headers = _.extend({},req.headers,{
                host:mockUrlObj.host
            });

            var result,reqMethod = req.method.toUpperCase();
            if(reqMethod === 'GET'){
                result = request.get(proxyOptions).pipe(context.resp);
            }else if(reqMethod === 'POST'){
                result = request.post(proxyOptions).pipe(context.resp);
            }
            return result.on('end',function(){
                return done();
            })
        },
        "raw":function(confResp,context,done){
            var jsonp = context.rule.jsonp || 'callback';
            var queryObj = context.req.query;
            var callback;
            for(var key in queryObj){
                if(key === jsonp){
                    callback = queryObj[key];
                }
            }

            var resp = context.resp;
            var jsonString = mockManager.getContent(confResp);
            if(callback){
                resp.setHeader('Content-Type','application/x-javascript');
                jsonString = [callback,'(',jsonString.trim(),')'].join('');
            }else{
                resp.setHeader('Content-Type','application/json');
            }
            resp.write(jsonString);

            return done();
        },
        "action":function(confResp,context,done){
            if(!sysUtil.isFunction(confResp)){
                var content = mockManager.getContent(confResp);
                var mockRespBuffer = {
                    module:{}
                };
                var baseObj;
                try{
                    vm.runInNewContext(content,mockRespBuffer);
                    baseObj = mockRespBuffer.module;
                    if(sysUtil.isFunction(baseObj.exports)){
                        baseObj.exports(context.req,context.resp,context);
                    }
                }catch(e){
                    console.log('执行',confResp,'失败');
                }
            }else{
                confResp(contex.req,context.resp,context);
            }
            return done();
        }
    },
    init: function (mockConf) {
        var confFileStat = sysFs.statSync(mockConf);

        this.mockConf = mockConf;
        this.mockConfMtime = confFileStat.mtime;
        this.mockRules = [];
        this.checkInterval = 1000;
        this.doUpdate();
        this.lastCheckTime = new Date();
    },
    getMockRule: function (url) {
        var mockRules = this.mockRules;
        var i, mockConfs, tmpRule, result;

        for (var i = 0, mockConfs = mockRules.length; i < mockConfs; i++) {
            tmpRule = mockRules[i];
            if (sysUtil.isRegExp(tmpRule.pattern)) {
                result = url.match(tmpRule.pattern);
            } else {
                result = url.indexOf(tmpRule.pattern) === 0;
            }

            if (result) {
                return tmpRule;
            }
        }

        return null;
    },
    doResponse: function (mockRule, req, resp, options) {
        var mockResp = mockRule.respondwith;
        var actionKey = "action";
        if(typeof mockResp === 'string'){
            actionKey = this.getActionKey(mockResp);
        }

        var respFunc = this.respFuncMap[actionKey];
        var respTasks = [function(seriesCallback){
            return respFunc(mockResp,{
                req:req,
                resp:resp,
                rule:mockRule,
                options:options
            },seriesCallback);
        }];

        return async.series(respTasks,function(err){
            if(err){
                console.log(err);
                return resp.end(err);
            }else{
                return resp.end();
            }
        });
    },
    getActionKey:function(mockResp){
        var extName = sysPath.extname(mockResp);
        if(/https?:\/\//.test(mockResp)){
            return "proxy_pass";
        }else{
            switch(extName){
                case '.json':
                    return "raw";
                case '.js':
                    return "action";
                default:
                    return "action"
            }
        }
    },
    doUpdate: function () {
        var self = this;
        var nowMs = new Date();
        if (nowMs - this.lastCheckTime >= self.checkInterval) {
            var checkFileStat = sysFs.statSync(self.mockConf);
            if (checkFileStat.mtime !== self.mockConfMtime) {
                try {
                    var mockConfBuffer = {
                        module:{}
                    };
                    var content = sysFs.readFileSync(this.mockConf, 'utf-8');
                    jsVm.runInNewContext(content, mockConfBuffer);

                    var configObj = mockConfBuffer.module.exports;
                    var tmpRules = configObj.rules || [];
                    var tmpKey, tmpAction;

                    delete configObj.rules;

                    for (tmpKey in configObj) {
                        tmpAction = configObj[tmpKey];
                        tmpRules.push({
                            pattern: tmpKey,
                            respondwith: tmpAction
                        });
                    }

                    self.mockRules = tmpRules;

                } catch (e) {
                    console.log('mock配置文件出错：', e.toString())
                }
            }
        }
    },
    getContent:function(relativePath){
        var dirname = sysPath.dirname(this.mockConf);
        return sysFs.readFileSync(sysPath.join(dirname,relativePath),'utf-8');
    }
}

function noMock(req, resp, next) {
    return next();
}

module.exports = function (options) {
    var mockConf = options.mock;
    if (mockConf) {
        if (!sysFs.existsSync(mockConf)) {
            console.log('mock 配置', mockConf, '不存在');
            return noMock;
        }
    } else {
        return noMock;
    }

    mockManager.init(options.mock);

    return function (req, resp, next) {

        mockManager.doUpdate();

        var mockRule = mockManager.getMockRule(req.url);
        if (mockRule) {
            return mockManager.doResponse(mockRule, req, resp, options);
        } else {
            return next();
        }
    }
}