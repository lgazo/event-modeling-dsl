grammar EventModeling

entry Model:
    'eventmodeling'
    (frames+=Frame | modelEntities+=ModelEntity | dataEntities+=DataEntity | noteEntities+=NoteEntity | gwts+=Gwt)*;

ModelEntityType returns string:
    'rmo' | 'scn' | 'cmd' | 'evt' | 'job';

ModelEntity:
    'entity' name=EID;

DataEntity:
    'data' name=EID DataBlock;

NoteEntity:
    'note' sourceFrame=[Frame:FI] DataBlock;

Gwt:
    'gwt' sourceFrame=[Frame:FI] '{' statements+=GwtStatement+ '}';

GwtStatement:
    ModelEntityType entityIdentifier=[ModelEntity:EID] DataBlock;
   
fragment DataBlock: ('`' dataType=('json' | 'jsobj' | 'figma' | 'salt' | 'uri') '`' dataValue=STRING_UNQ )?;

Frame:
    'tf' name=FI modelEntityType=ModelEntityType entityIdentifier=EID ('>t' sourceFrame=[Frame:FI])? ('[[' dataReference=[DataEntity:EID] ']]')? DataBlock;

EID returns string: ID;
FI returns string: FID;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal FID: /\d{1,3}/;

terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal STRING_UNQ: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*|\{(\\.|[^\\])*\}/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
