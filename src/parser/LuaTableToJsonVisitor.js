import {LuaVisitor} from '../antlr/LuaVisitor';

class LuaTableToJsonVisitor extends LuaVisitor {
	visitDictionary = (ctx) =>
	{
		const result = {};
		ctx.field().forEach((field) =>
		{
			const key   = this.visit(field.key());
			const value = this.visit(field.value());
			result[key] = value;
		});
		return result;
	};

	visitArray  = ctx => ctx.value().map(eachValue => this.visit(eachValue))
	visitKey    = ctx => ctx.string() ? ctx.string().getText() : ctx.NAME().getText();
	visitValue  = ctx => this.visit(ctx.children[0]);
	visitNil    = ctx => null;
	visitBool   = ctx => true;
	visitNumber = ctx => Number(ctx.children[0].getText());

	visitString = (ctx) =>
	{
		const quotedString = ctx.children[0].getText();
		return quotedString.substr(1, quotedString.length - 2);
	};
}

export default LuaTableToJsonVisitor;
