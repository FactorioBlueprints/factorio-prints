import {LuaVisitor} from '../antlr/LuaVisitor';

class LuaTableToJsonVisitor extends LuaVisitor
{
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

	visitArray  = ctx => ctx.value().map(eachValue => this.visit(eachValue));
	visitValue  = ctx => this.visit(ctx.children[0]);
	visitNil    = () => null;
	visitBool   = () => true;
	visitNumber = ctx => Number(ctx.children[0].getText());

	visitKey = (ctx) =>
	{
		if (ctx.string())
		{
			const number = Number(this.visit(ctx.string()));
			if (!Number.isNaN(number))
			{
				return number;
			}
			return ctx.string().getText();
		}
		if (ctx.number())
		{
			return ctx.number().getText();
		}
		return ctx.NAME().getText();
	};

	visitString = (ctx) =>
	{
		const quotedString = ctx.children[0].getText();
		return quotedString.substr(1, quotedString.length - 2);
	};
}

export default LuaTableToJsonVisitor;
