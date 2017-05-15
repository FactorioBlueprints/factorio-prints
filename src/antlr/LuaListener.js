// Generated from Lua.g4 by ANTLR 4.6
// jshint ignore: start
/* eslint-disable */
var antlr4 = require('antlr4/index');

// This class defines a complete listener for a parse tree produced by LuaParser.
function LuaListener() {
	antlr4.tree.ParseTreeListener.call(this);
	return this;
}

LuaListener.prototype = Object.create(antlr4.tree.ParseTreeListener.prototype);
LuaListener.prototype.constructor = LuaListener;

// Enter a parse tree produced by LuaParser#entry.
LuaListener.prototype.enterEntry = function(ctx) {
};

// Exit a parse tree produced by LuaParser#entry.
LuaListener.prototype.exitEntry = function(ctx) {
};


// Enter a parse tree produced by LuaParser#dictionary.
LuaListener.prototype.enterDictionary = function(ctx) {
};

// Exit a parse tree produced by LuaParser#dictionary.
LuaListener.prototype.exitDictionary = function(ctx) {
};


// Enter a parse tree produced by LuaParser#array.
LuaListener.prototype.enterArray = function(ctx) {
};

// Exit a parse tree produced by LuaParser#array.
LuaListener.prototype.exitArray = function(ctx) {
};


// Enter a parse tree produced by LuaParser#field.
LuaListener.prototype.enterField = function(ctx) {
};

// Exit a parse tree produced by LuaParser#field.
LuaListener.prototype.exitField = function(ctx) {
};


// Enter a parse tree produced by LuaParser#key.
LuaListener.prototype.enterKey = function(ctx) {
};

// Exit a parse tree produced by LuaParser#key.
LuaListener.prototype.exitKey = function(ctx) {
};


// Enter a parse tree produced by LuaParser#value.
LuaListener.prototype.enterValue = function(ctx) {
};

// Exit a parse tree produced by LuaParser#value.
LuaListener.prototype.exitValue = function(ctx) {
};


// Enter a parse tree produced by LuaParser#nil.
LuaListener.prototype.enterNil = function(ctx) {
};

// Exit a parse tree produced by LuaParser#nil.
LuaListener.prototype.exitNil = function(ctx) {
};


// Enter a parse tree produced by LuaParser#bool.
LuaListener.prototype.enterBool = function(ctx) {
};

// Exit a parse tree produced by LuaParser#bool.
LuaListener.prototype.exitBool = function(ctx) {
};


// Enter a parse tree produced by LuaParser#number.
LuaListener.prototype.enterNumber = function(ctx) {
};

// Exit a parse tree produced by LuaParser#number.
LuaListener.prototype.exitNumber = function(ctx) {
};


// Enter a parse tree produced by LuaParser#string.
LuaListener.prototype.enterString = function(ctx) {
};

// Exit a parse tree produced by LuaParser#string.
LuaListener.prototype.exitString = function(ctx) {
};



exports.LuaListener = LuaListener;
