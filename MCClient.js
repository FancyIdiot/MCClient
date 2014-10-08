#!/usr/bin/env node

var program = require('commander');
var Beautifier = require('node-js-beautify');

program.version('0.0.1')
	   	.option('-l --list', 'list all key')
		.option('-d --delete [key]', 'delete key', extract)
		.option('-f --flush', 'flush all')
		.option('-g --get [key]', 'get value by key')
		.option('-p --prefix [prefix]', 'delete key by prefix', extract)
		.option('-s --set [key:value]', 'set key value', extractKV)
		.parse(process.argv);

function extract(val) {
	return val;
}

function extractKV(val) {
	console.log('val:' + val);
	return val.split(/\:/); 
}

/**初始化MC**/
var Memcached = require('memcached');
var colors = require('colors');
Memcached.config.poolSize = 5;

/** close the connection if idle**/
Memcached.config.timeout= 2000;  
var memcached = new Memcached('127.0.0.1:11511');

/**
 * 执行逻辑判断
 */
if(program.prefix) {
	var prefix = program.prefix;
	iterator(function(key){
		if(key.indexOf(prefix) == 0) {
			del(key);	
		}	
	});
}
if(program.get) {
	var key = program.get;
	get(key);
}

if(program.delete) {
	del(program.delete);		
}
if(program.list) {
	var dateUtils = require('date-utils');
	var date = parseInt(new Date().getTime()/1000);
	console.log('date:'+date);
	iterator(function(item){
		if (date < item['s']) {
			expireDate = new Date(item['s']*1000);
			console.log('key:' + item['key'].blue + '[expire:'.red + + ',size:'.red+item['b']+']');	
		}
	});
}
if(program.flush) {
	flushAll();	
}
if(program.set) {
	var kv = program.set;
	if (!kv || kv.length < 2) {
		console.log ('set kv error');
	} else {
		set(kv[0], kv[1]);
	}
}


/**
 * 遍历所有的slab,并执行回调
 */
function iterator(callback) {
	memcached.slabs(function(err, data){

		data.forEach(function(itemSet){
			var keys = Object.keys(itemSet);
			keys.forEach(function(stats){
				memcached.cachedump(itemSet.server, parseInt(stats) , 0, function( err, response ){
					if (response) {
						if(response instanceof Array ) {
							response.forEach(function(cacheItem){
								callback(cacheItem);
							});
						} else {
							callback(response);
						}
					} 
				})
			});
		});

	});

}
/**
 * 按key取值
 */
function get (key) {
	memcached.get(key, function(err, data) {
		var b = new Beautifier();
		console.log('key: ' + key.red);
		console.log(b.beautify_js(data.toString()).blue);
	});		
}
/**
 *删除key
 */
function del(key) {
	memcached.del(key, function(){
		console.log('del key:'+ key.red);
	});	
}
/**
 * 设置key value
 */
function set(key, value) {
	memcached.set(key, value, 10000, function(){
		console.log('set key:'+ key.red);
	});	
}
/**
 * 清缓存
 */
function flushAll() {
	memcached.flush(function(){
		console.log('already flush all'.red);
	}); 
}
