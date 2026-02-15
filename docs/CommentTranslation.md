# Comment Translation to English

## Scope

Project comments were translated from Russian to English across:

- Backend source files in `src/`
- Frontend source files in `src/assets/js/`
- Test files in `test/`
- Fixture and module helper files in `fixture/` and `modules/`
- Code snippets in documentation where inline code comments were still in Russian

## Validation

To verify that no Russian comments remain, run:

```bash
rg -n --pcre2 --hidden --glob '!.git' --glob '!node_modules' --glob '!dist' '(//[^\n]*[А-Яа-яЁё])|(\/\*[^\n]*[А-Яа-яЁё][^\n]*\*\/)|(^\s*\*[^\n]*[А-Яа-яЁё])'
```

Expected result: no matches.
