fun! s:CheckForJonquil()
    if getline(1) =~# '\v^##jonquil'
        set filetype=jonquil
    endif
endfun
au BufNewFile,BufRead *.txt call s:CheckForJonquil()
