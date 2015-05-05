" Vim syntax file
" Language: Last Hour for a Flower scripting language

if exists("b:current_syntax")
    finish
endif

syntax keyword jonquilKeyword async exhaustive entry noprogress
syntax match jonquilJS "\v\$.*$"
syntax match jonquilChar "\v^.*:"
syntax match jonquilHeader "\v\[.*\]"
syntax match jonquilOperator "\v\{"
syntax match jonquilOperator "\v\}"
syntax match jonquilChoice "\v\*.*$"
syntax match jonquilComment "\v\#.*$"

highlight link jonquilKeyword Keyword
highlight link jonquilJS PreProc
highlight link jonquilChar Type
highlight link jonquilHeader Underlined
highlight link jonquilOperator Operator
highlight link jonquilChoice String
highlight link jonquilComment Comment

let b:current_syntax = "jonquil"

