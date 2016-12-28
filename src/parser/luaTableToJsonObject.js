import antlr4 from 'antlr4';
import LuaLexer from '../antlr/LuaLexer';
import LuaParser from '../antlr/LuaParser';
import LuaTableToJsonVisitor from './LuaTableToJsonVisitor';

const luaTableToJsonObject = (luaTable) =>
{
	const chars  = new antlr4.InputStream(luaTable);
	const lexer  = new LuaLexer.LuaLexer(chars);
	const tokens    = new antlr4.CommonTokenStream(lexer);
	const parser = new LuaParser.LuaParser(tokens);
	parser.buildParseTrees = true;
	const tree   = parser.dictionary();
	const visitor = new LuaTableToJsonVisitor();
	return visitor.visit(tree);
};

export default luaTableToJsonObject;
