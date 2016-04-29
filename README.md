# package-webpack-server-toolkit
This repository host the toolkit for webpack dev server, custom-made by qunar package team. It contain some middlewares which will used by the express site to handle the specify request like the .vm file (velocity) and other custom request operations

## 插件说明
本插件是webpack-dev-server的一个功能定制插件，主要共package团队使用。
提供的功能有：
	1. 支持velocity文件的解析展示，基于velocityjs
	2. 支持对请求的js、css文件做require分解，将require到的文件提取，包装成commonJS支持的格式，逐个返回到浏览器端，便于调试。此功能为默认功能，如果需要使用webpack本身的功能，需要启动时指定-c参数（combine）
	3. 目前只支持到单个工程的调试，后续会添加多个工程