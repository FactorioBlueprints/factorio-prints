// Generated from Lua.g4 by ANTLR 4.6
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete generic visitor for a parse tree produced by LuaParser.

function LuaVisitor() {
	antlr4.tree.ParseTreeVisitor.call(this);
	return this;
}

LuaVisitor.prototype = Object.create(antlr4.tree.ParseTreeVisitor.prototype);
LuaVisitor.prototype.constructor = LuaVisitor;

// Visit a parse tree produced by LuaParser#dictionary.
LuaVisitor.prototype.visitDictionary = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by LuaParser#array.
LuaVisitor.prototype.visitArray = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by LuaParser#field.
LuaVisitor.prototype.visitField = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by LuaParser#key.
LuaVisitor.prototype.visitKey = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by LuaParser#value.
LuaVisitor.prototype.visitValue = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by LuaParser#nil.
LuaVisitor.prototype.visitNil = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by LuaParser#bool.
LuaVisitor.prototype.visitBool = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by LuaParser#number.
LuaVisitor.prototype.visitNumber = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by LuaParser#string.
LuaVisitor.prototype.visitString = function(ctx) {
  return this.visitChildren(ctx);
};



exports.LuaVisitor = LuaVisitor;