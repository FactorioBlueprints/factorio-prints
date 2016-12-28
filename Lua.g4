grammar Lua;

dictionary: '{' field (',' field)* '}' ;

array: '{' value (',' value)* '}' ;

field: key '=' value;

key: '[' string ']' | NAME ;

value: nil | bool | number | string | array | dictionary;

nil: 'nil';
bool: 'true' | 'false';
number: INT | HEX | FLOAT | HEX_FLOAT ;
string: NORMALSTRING | CHARSTRING ;

NAME: [a-zA-Z_][a-zA-Z_0-9]* ;

NORMALSTRING: '"' ( EscapeSequence | ~('\\'|'"') )* '"' ;

CHARSTRING: '\'' ( EscapeSequence | ~('\''|'\\') )* '\'' ;

INT: '-'? Digit+ ;
HEX: '-'? '0' [xX] HexDigit+ ;

FLOAT
    : '-'? Digit+ '.' Digit* ExponentPart?
    | '-'? '.' Digit+ ExponentPart?
    | '-'? Digit+ ExponentPart
    ;

HEX_FLOAT
    : '-'? '0' [xX] HexDigit+ '.' HexDigit* HexExponentPart?
    | '-'? '0' [xX] '.' HexDigit+ HexExponentPart?
    | '-'? '0' [xX] HexDigit+ HexExponentPart
    ;

fragment ExponentPart: [eE] [+-]? Digit+ ;
fragment HexExponentPart: [pP] [+-]? Digit+ ;

fragment EscapeSequence
    : '\\' [abfnrtvz"'\\]
    | '\\' '\r'? '\n'
    | DecimalEscape
    | HexEscape
    | UtfEscape
    ;

fragment DecimalEscape
    : '\\' Digit
    | '\\' Digit Digit
    | '\\' [0-2] Digit Digit
    ;

fragment HexEscape: '\\' 'x' HexDigit HexDigit ;
fragment UtfEscape: '\\' 'u{' HexDigit+ '}' ;
fragment Digit: [0-9] ;
fragment HexDigit: [0-9a-fA-F] ;

WS: [ \t\u000C\r\n]+ -> skip ;
