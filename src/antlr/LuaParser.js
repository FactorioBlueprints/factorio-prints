// Generated from Lua.g4 by ANTLR 4.6
// jshint ignore: start
/* eslint-disable */
var antlr4 = require('antlr4/index');
var LuaVisitor = require('./LuaVisitor').LuaVisitor;

var grammarFileName = "Lua.g4";

var serializedATN = ["\u0003\u0430\ud6d1\u8206\uad2d\u4417\uaef1\u8d80\uaadd",
    "\u0003\u0013F\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004\t",
    "\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t\u0007\u0004",
    "\b\t\b\u0004\t\t\t\u0004\n\t\n\u0003\u0002\u0003\u0002\u0003\u0002\u0003",
    "\u0002\u0007\u0002\u0019\n\u0002\f\u0002\u000e\u0002\u001c\u000b\u0002",
    "\u0003\u0002\u0003\u0002\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0007\u0003$\n\u0003\f\u0003\u000e\u0003\'\u000b\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0004\u0003\u0004\u0003\u0004\u0003\u0004\u0003\u0005",
    "\u0003\u0005\u0003\u0005\u0003\u0005\u0003\u0005\u0005\u00054\n\u0005",
    "\u0003\u0006\u0003\u0006\u0003\u0006\u0003\u0006\u0003\u0006\u0003\u0006",
    "\u0005\u0006<\n\u0006\u0003\u0007\u0003\u0007\u0003\b\u0003\b\u0003",
    "\t\u0003\t\u0003\n\u0003\n\u0003\n\u0002\u0002\u000b\u0002\u0004\u0006",
    "\b\n\f\u000e\u0010\u0012\u0002\u0005\u0003\u0002\n\u000b\u0003\u0002",
    "\u000f\u0012\u0003\u0002\r\u000eD\u0002\u0014\u0003\u0002\u0002\u0002",
    "\u0004\u001f\u0003\u0002\u0002\u0002\u0006*\u0003\u0002\u0002\u0002",
    "\b3\u0003\u0002\u0002\u0002\n;\u0003\u0002\u0002\u0002\f=\u0003\u0002",
    "\u0002\u0002\u000e?\u0003\u0002\u0002\u0002\u0010A\u0003\u0002\u0002",
    "\u0002\u0012C\u0003\u0002\u0002\u0002\u0014\u0015\u0007\u0003\u0002",
    "\u0002\u0015\u001a\u0005\u0006\u0004\u0002\u0016\u0017\u0007\u0004\u0002",
    "\u0002\u0017\u0019\u0005\u0006\u0004\u0002\u0018\u0016\u0003\u0002\u0002",
    "\u0002\u0019\u001c\u0003\u0002\u0002\u0002\u001a\u0018\u0003\u0002\u0002",
    "\u0002\u001a\u001b\u0003\u0002\u0002\u0002\u001b\u001d\u0003\u0002\u0002",
    "\u0002\u001c\u001a\u0003\u0002\u0002\u0002\u001d\u001e\u0007\u0005\u0002",
    "\u0002\u001e\u0003\u0003\u0002\u0002\u0002\u001f \u0007\u0003\u0002",
    "\u0002 %\u0005\n\u0006\u0002!\"\u0007\u0004\u0002\u0002\"$\u0005\n\u0006",
    "\u0002#!\u0003\u0002\u0002\u0002$\'\u0003\u0002\u0002\u0002%#\u0003",
    "\u0002\u0002\u0002%&\u0003\u0002\u0002\u0002&(\u0003\u0002\u0002\u0002",
    "\'%\u0003\u0002\u0002\u0002()\u0007\u0005\u0002\u0002)\u0005\u0003\u0002",
    "\u0002\u0002*+\u0005\b\u0005\u0002+,\u0007\u0006\u0002\u0002,-\u0005",
    "\n\u0006\u0002-\u0007\u0003\u0002\u0002\u0002./\u0007\u0007\u0002\u0002",
    "/0\u0005\u0012\n\u000201\u0007\b\u0002\u000214\u0003\u0002\u0002\u0002",
    "24\u0007\f\u0002\u00023.\u0003\u0002\u0002\u000232\u0003\u0002\u0002",
    "\u00024\t\u0003\u0002\u0002\u00025<\u0005\f\u0007\u00026<\u0005\u000e",
    "\b\u00027<\u0005\u0010\t\u00028<\u0005\u0012\n\u00029<\u0005\u0004\u0003",
    "\u0002:<\u0005\u0002\u0002\u0002;5\u0003\u0002\u0002\u0002;6\u0003\u0002",
    "\u0002\u0002;7\u0003\u0002\u0002\u0002;8\u0003\u0002\u0002\u0002;9\u0003",
    "\u0002\u0002\u0002;:\u0003\u0002\u0002\u0002<\u000b\u0003\u0002\u0002",
    "\u0002=>\u0007\t\u0002\u0002>\r\u0003\u0002\u0002\u0002?@\t\u0002\u0002",
    "\u0002@\u000f\u0003\u0002\u0002\u0002AB\t\u0003\u0002\u0002B\u0011\u0003",
    "\u0002\u0002\u0002CD\t\u0004\u0002\u0002D\u0013\u0003\u0002\u0002\u0002",
    "\u0006\u001a%3;"].join("");


var atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

var decisionsToDFA = atn.decisionToState.map( function(ds, index) { return new antlr4.dfa.DFA(ds, index); });

var sharedContextCache = new antlr4.PredictionContextCache();

var literalNames = [ null, "'{'", "','", "'}'", "'='", "'['", "']'", "'nil'",
                     "'true'", "'false'" ];

var symbolicNames = [ null, null, null, null, null, null, null, null, null,
                      null, "NAME", "NORMALSTRING", "CHARSTRING", "INT",
                      "HEX", "FLOAT", "HEX_FLOAT", "WS" ];

var ruleNames =  [ "dictionary", "array", "field", "key", "value", "nil",
                   "bool", "number", "string" ];

function LuaParser (input) {
	antlr4.Parser.call(this, input);
    this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
    this.ruleNames = ruleNames;
    this.literalNames = literalNames;
    this.symbolicNames = symbolicNames;
    return this;
}

LuaParser.prototype = Object.create(antlr4.Parser.prototype);
LuaParser.prototype.constructor = LuaParser;

Object.defineProperty(LuaParser.prototype, "atn", {
	get : function() {
		return atn;
	}
});

LuaParser.EOF = antlr4.Token.EOF;
LuaParser.T__0 = 1;
LuaParser.T__1 = 2;
LuaParser.T__2 = 3;
LuaParser.T__3 = 4;
LuaParser.T__4 = 5;
LuaParser.T__5 = 6;
LuaParser.T__6 = 7;
LuaParser.T__7 = 8;
LuaParser.T__8 = 9;
LuaParser.NAME = 10;
LuaParser.NORMALSTRING = 11;
LuaParser.CHARSTRING = 12;
LuaParser.INT = 13;
LuaParser.HEX = 14;
LuaParser.FLOAT = 15;
LuaParser.HEX_FLOAT = 16;
LuaParser.WS = 17;

LuaParser.RULE_dictionary = 0;
LuaParser.RULE_array = 1;
LuaParser.RULE_field = 2;
LuaParser.RULE_key = 3;
LuaParser.RULE_value = 4;
LuaParser.RULE_nil = 5;
LuaParser.RULE_bool = 6;
LuaParser.RULE_number = 7;
LuaParser.RULE_string = 8;

function DictionaryContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_dictionary;
    return this;
}

DictionaryContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
DictionaryContext.prototype.constructor = DictionaryContext;

DictionaryContext.prototype.field = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(FieldContext);
    } else {
        return this.getTypedRuleContext(FieldContext,i);
    }
};

DictionaryContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitDictionary(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.DictionaryContext = DictionaryContext;

LuaParser.prototype.dictionary = function() {

    var localctx = new DictionaryContext(this, this._ctx, this.state);
    this.enterRule(localctx, 0, LuaParser.RULE_dictionary);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 18;
        this.match(LuaParser.T__0);
        this.state = 19;
        this.field();
        this.state = 24;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===LuaParser.T__1) {
            this.state = 20;
            this.match(LuaParser.T__1);
            this.state = 21;
            this.field();
            this.state = 26;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 27;
        this.match(LuaParser.T__2);
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function ArrayContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_array;
    return this;
}

ArrayContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ArrayContext.prototype.constructor = ArrayContext;

ArrayContext.prototype.value = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(ValueContext);
    } else {
        return this.getTypedRuleContext(ValueContext,i);
    }
};

ArrayContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitArray(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.ArrayContext = ArrayContext;

LuaParser.prototype.array = function() {

    var localctx = new ArrayContext(this, this._ctx, this.state);
    this.enterRule(localctx, 2, LuaParser.RULE_array);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 29;
        this.match(LuaParser.T__0);
        this.state = 30;
        this.value();
        this.state = 35;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===LuaParser.T__1) {
            this.state = 31;
            this.match(LuaParser.T__1);
            this.state = 32;
            this.value();
            this.state = 37;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 38;
        this.match(LuaParser.T__2);
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function FieldContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_field;
    return this;
}

FieldContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FieldContext.prototype.constructor = FieldContext;

FieldContext.prototype.key = function() {
    return this.getTypedRuleContext(KeyContext,0);
};

FieldContext.prototype.value = function() {
    return this.getTypedRuleContext(ValueContext,0);
};

FieldContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitField(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.FieldContext = FieldContext;

LuaParser.prototype.field = function() {

    var localctx = new FieldContext(this, this._ctx, this.state);
    this.enterRule(localctx, 4, LuaParser.RULE_field);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 40;
        this.key();
        this.state = 41;
        this.match(LuaParser.T__3);
        this.state = 42;
        this.value();
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function KeyContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_key;
    return this;
}

KeyContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
KeyContext.prototype.constructor = KeyContext;

KeyContext.prototype.string = function() {
    return this.getTypedRuleContext(StringContext,0);
};

KeyContext.prototype.NAME = function() {
    return this.getToken(LuaParser.NAME, 0);
};

KeyContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitKey(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.KeyContext = KeyContext;

LuaParser.prototype.key = function() {

    var localctx = new KeyContext(this, this._ctx, this.state);
    this.enterRule(localctx, 6, LuaParser.RULE_key);
    try {
        this.state = 49;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case LuaParser.T__4:
            this.enterOuterAlt(localctx, 1);
            this.state = 44;
            this.match(LuaParser.T__4);
            this.state = 45;
            this.string();
            this.state = 46;
            this.match(LuaParser.T__5);
            break;
        case LuaParser.NAME:
            this.enterOuterAlt(localctx, 2);
            this.state = 48;
            this.match(LuaParser.NAME);
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function ValueContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_value;
    return this;
}

ValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ValueContext.prototype.constructor = ValueContext;

ValueContext.prototype.nil = function() {
    return this.getTypedRuleContext(NilContext,0);
};

ValueContext.prototype.bool = function() {
    return this.getTypedRuleContext(BoolContext,0);
};

ValueContext.prototype.number = function() {
    return this.getTypedRuleContext(NumberContext,0);
};

ValueContext.prototype.string = function() {
    return this.getTypedRuleContext(StringContext,0);
};

ValueContext.prototype.array = function() {
    return this.getTypedRuleContext(ArrayContext,0);
};

ValueContext.prototype.dictionary = function() {
    return this.getTypedRuleContext(DictionaryContext,0);
};

ValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.ValueContext = ValueContext;

LuaParser.prototype.value = function() {

    var localctx = new ValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 8, LuaParser.RULE_value);
    try {
        this.state = 57;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,3,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 51;
            this.nil();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 52;
            this.bool();
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 53;
            this.number();
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 54;
            this.string();
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 55;
            this.array();
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 56;
            this.dictionary();
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function NilContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_nil;
    return this;
}

NilContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
NilContext.prototype.constructor = NilContext;


NilContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitNil(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.NilContext = NilContext;

LuaParser.prototype.nil = function() {

    var localctx = new NilContext(this, this._ctx, this.state);
    this.enterRule(localctx, 10, LuaParser.RULE_nil);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 59;
        this.match(LuaParser.T__6);
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function BoolContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_bool;
    return this;
}

BoolContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
BoolContext.prototype.constructor = BoolContext;


BoolContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitBool(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.BoolContext = BoolContext;

LuaParser.prototype.bool = function() {

    var localctx = new BoolContext(this, this._ctx, this.state);
    this.enterRule(localctx, 12, LuaParser.RULE_bool);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 61;
        _la = this._input.LA(1);
        if(!(_la===LuaParser.T__7 || _la===LuaParser.T__8)) {
        this._errHandler.recoverInline(this);
        }
        else {
        	this._errHandler.reportMatch(this);
            this.consume();
        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function NumberContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_number;
    return this;
}

NumberContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
NumberContext.prototype.constructor = NumberContext;

NumberContext.prototype.INT = function() {
    return this.getToken(LuaParser.INT, 0);
};

NumberContext.prototype.HEX = function() {
    return this.getToken(LuaParser.HEX, 0);
};

NumberContext.prototype.FLOAT = function() {
    return this.getToken(LuaParser.FLOAT, 0);
};

NumberContext.prototype.HEX_FLOAT = function() {
    return this.getToken(LuaParser.HEX_FLOAT, 0);
};

NumberContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitNumber(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.NumberContext = NumberContext;

LuaParser.prototype.number = function() {

    var localctx = new NumberContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, LuaParser.RULE_number);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 63;
        _la = this._input.LA(1);
        if(!((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << LuaParser.INT) | (1 << LuaParser.HEX) | (1 << LuaParser.FLOAT) | (1 << LuaParser.HEX_FLOAT))) !== 0))) {
        this._errHandler.recoverInline(this);
        }
        else {
        	this._errHandler.reportMatch(this);
            this.consume();
        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function StringContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = LuaParser.RULE_string;
    return this;
}

StringContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
StringContext.prototype.constructor = StringContext;

StringContext.prototype.NORMALSTRING = function() {
    return this.getToken(LuaParser.NORMALSTRING, 0);
};

StringContext.prototype.CHARSTRING = function() {
    return this.getToken(LuaParser.CHARSTRING, 0);
};

StringContext.prototype.accept = function(visitor) {
    if ( visitor instanceof LuaVisitor ) {
        return visitor.visitString(this);
    } else {
        return visitor.visitChildren(this);
    }
};




LuaParser.StringContext = StringContext;

LuaParser.prototype.string = function() {

    var localctx = new StringContext(this, this._ctx, this.state);
    this.enterRule(localctx, 16, LuaParser.RULE_string);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 65;
        _la = this._input.LA(1);
        if(!(_la===LuaParser.NORMALSTRING || _la===LuaParser.CHARSTRING)) {
        this._errHandler.recoverInline(this);
        }
        else {
        	this._errHandler.reportMatch(this);
            this.consume();
        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


exports.LuaParser = LuaParser;
