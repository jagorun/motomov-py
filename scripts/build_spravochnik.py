#!/usr/bin/env python3
"""Собирает data/spravochnik.json: справочник Python для начинающих.
Примеры выполняются здесь же, а вывод записывается как есть, поэтому «Вывод» всегда настоящий.
Запуск: python3 scripts/build_spravochnik.py
"""
import contextlib, io, json, os, pathlib, sys, tempfile, textwrap

D = "https://docs.python.org/ru/3.14/"
F = D + "library/functions.html#"
S = D + "library/stdtypes.html#"
GROUPS = [
 ("builtins", "Встроенные функции", "Работают сразу, без import."),
 ("types", "Типы и преобразования", "Создают значения нужного типа или проверяют тип."),
 ("str", "Методы строк (str)", "Строка неизменяема: метод возвращает новую строку."),
 ("list", "Методы списков (list)", "Список изменяемый: большинство методов меняют его на месте и возвращают None."),
 ("tuple", "Методы кортежей (tuple)", "Кортеж неизменяем, методов всего два."),
 ("dict", "Методы словарей (dict)", "Пары «ключ: значение»."),
 ("set", "Методы множеств (set)", "Набор уникальных значений без порядка."),
 ("file", "Работа с файлами", "Объект файла, который возвращает open()."),
 ("math", "Модуль math", "import math"),
 ("random", "Модуль random", "import random"),
 ("datetime", "Модуль datetime", "from datetime import date, datetime, timedelta"),
 ("pathlib", "Модули os и pathlib", "Пути и папки."),
 ("json", "Модуль json", "import json"),
]
E = []
def e(g, name, sig, text, code, note="", url=""):
    E.append(dict(group=g, name=name, sig=sig, text=text, code=textwrap.dedent(code).strip("\n"), note=note, url=url))

# ---------- встроенные функции ----------
e("builtins","print","print(*objects, sep=' ', end='\\n', file=None, flush=False)",
 "Выводит значения на экран через пробел и переводит строку. sep задаёт разделитель, end — что поставить в конце.",
 """print("Привет", "мир")\nprint(1, 2, 3, sep="-")\nprint("без перевода строки", end="!\\n")""",
 "print ничего не возвращает (None). Чтобы получить строку, используйте f-строку или str().", F+"print")
e("builtins","len","len(object, /)","Возвращает длину: число символов строки, элементов списка, ключей словаря.",
 """print(len("кот"))\nprint(len([10, 20, 30, 40]))\nprint(len({"a": 1, "b": 2}))""","", F+"len")
e("builtins","range","range(stop)\nrange(start, stop, step=1)",
 "Последовательность целых чисел от start до stop, не включая stop. Чаще всего нужна в цикле for.",
 """print(list(range(5)))\nprint(list(range(2, 10, 3)))\nprint(list(range(5, 0, -1)))""",
 "stop не входит в результат: range(5) — это 0…4.", D+"library/stdtypes.html#range")
e("builtins","enumerate","enumerate(iterable, start=0)","Даёт пары (номер, элемент). Удобно, когда в цикле нужен и номер, и значение.",
 """for i, fruit in enumerate(["яблоко", "груша"], start=1):\n    print(i, fruit)""","", F+"enumerate")
e("builtins","zip","zip(*iterables, strict=False)","Склеивает несколько последовательностей попарно. Останавливается на самой короткой (с strict=True — ошибка при разной длине).",
 """names = ["Аня", "Боря"]\nages = [30, 25]\nprint(list(zip(names, ages)))\nprint(dict(zip(names, ages)))""","", F+"zip")
e("builtins","map","map(function, iterable, /, *iterables, strict=False)","Применяет функцию к каждому элементу. Возвращает «ленивый» объект — оберните в list(), чтобы увидеть.",
 """print(list(map(int, ["1", "2", "3"])))\nprint(list(map(str.upper, ["a", "b"])))""",
 "Часто понятнее списковое включение: [int(x) for x in items].", F+"map")
e("builtins","filter","filter(function, iterable, /)","Оставляет элементы, для которых функция вернула истину. Если function=None, убирает «ложные» значения (0, '', None).",
 """print(list(filter(lambda x: x > 2, [1, 2, 3, 4])))\nprint(list(filter(None, [0, 1, "", "a", None])))""","", F+"filter")
e("builtins","sorted","sorted(iterable, /, *, key=None, reverse=False)","Возвращает новый отсортированный список, исходный не меняется. key — функция, по которой сравнивать.",
 """words = ["груша", "Яблоко", "банан"]\nprint(sorted([3, 1, 2]))\nprint(sorted(words, key=len))\nprint(sorted([3, 1, 2], reverse=True))""",
 "Не путать с list.sort(): тот меняет сам список и возвращает None.", F+"sorted")
e("builtins","sum","sum(iterable, /, start=0)","Складывает числа. start прибавляется к результату.",
 """print(sum([1, 2, 3]))\nprint(sum([0.5, 0.25], start=10))""","Строки так не склеить — для них ''.join(...).", F+"sum")
e("builtins","min / max","min(iterable, /, *, key=None)\nmin(iterable, /, *, default, key=None)\nmin(arg1, arg2, /, *args, key=None)",
 "Наименьшее (max — наибольшее) значение. default возвращается для пустой последовательности вместо ошибки.",
 """print(min(4, 2, 8))\nprint(max(["кот", "слон", "ёж"], key=len))\nprint(max([], default=0))""","", F+"min")
e("builtins","abs","abs(number, /)","Модуль числа: убирает минус.","""print(abs(-7))\nprint(abs(3.5))""","", F+"abs")
e("builtins","round","round(number, ndigits=None)","Округляет. Без ndigits — до целого (int), с ndigits — до стольких знаков после запятой.",
 """print(round(3.7))\nprint(round(3.14159, 2))\nprint(round(2.5), round(3.5))""",
 "Половины округляются к чётному: round(2.5) == 2. Это «банковское» округление.", F+"round")
e("builtins","divmod","divmod(a, b, /)","Сразу целая часть и остаток от деления — как (a // b, a % b).","""print(divmod(17, 5))""","", F+"divmod")
e("builtins","pow","pow(base, exp, mod=None)","Возведение в степень, как base ** exp. С mod — остаток от деления результата.","""print(pow(2, 10))\nprint(pow(2, 10, 7))""","", F+"pow")
e("builtins","input","input()\ninput(prompt, /)","Ждёт, пока пользователь введёт строку и нажмёт Enter. Всегда возвращает str.",
 """# age = input("Сколько лет? ")   # ввели 30\nage = "30"\nprint(int(age) + 1)""",
 "Результат — строка: для арифметики сначала int() или float().", F+"input")
e("builtins","type","type(object, /)","Показывает тип значения.","""print(type(5))\nprint(type("5"))\nprint(type([1]) is list)""",
 "Для проверки типа лучше isinstance(): он учитывает наследование.", F+"type")
e("builtins","isinstance","isinstance(object, classinfo, /)","Проверяет, относится ли значение к типу (или к одному из типов в кортеже).",
 """print(isinstance(5, int))\nprint(isinstance(5.0, (int, float)))\nprint(isinstance("5", int))""","", F+"isinstance")
e("builtins","any / all","any(iterable, /)\nall(iterable, /)","any — есть ли хоть одно истинное значение; all — все ли истинны. all([]) == True.",
 """nums = [3, 0, 7]\nprint(any(n > 5 for n in nums))\nprint(all(n > 0 for n in nums))\nprint(all([]))""","", F+"any")
e("builtins","reversed","reversed(object, /)","Перебирает последовательность с конца. Возвращает итератор, исходник не меняется.",
 """print(list(reversed([1, 2, 3])))\nprint("".join(reversed("кот")))""","Не путать с list.reverse(): тот переворачивает сам список.", F+"reversed")
e("builtins","open","open(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)",
 "Открывает файл. mode: 'r' — читать, 'w' — записать заново, 'a' — дописать, 'b' — двоичный. Для текста всегда указывайте encoding='utf-8'.",
 """with open("заметка.txt", "w", encoding="utf-8") as f:\n    f.write("первая строка\\n")\nwith open("заметка.txt", encoding="utf-8") as f:\n    print(f.read())""",
 "'w' стирает файл, если он был. Чтобы дописать — 'a'. with сам закроет файл.", F+"open")
e("builtins","id","id(object, /)","Уникальный номер объекта, пока он существует. Помогает понять, один это объект или копия.",
 """a = [1]\nb = a\nc = [1]\nprint(id(a) == id(b), id(a) == id(c))""","", F+"id")
e("builtins","dir","dir()\ndir(object, /)","Список имён (методов и атрибутов) объекта. Удобно, чтобы узнать, что умеет значение.",
 """print([m for m in dir("") if m.startswith("st")])""","", F+"dir")
e("builtins","help","help()\nhelp(request)","Показывает встроенную справку по функции или типу (в интерактивном режиме).","""# help(len)\nprint(len.__doc__.splitlines()[0])""","", F+"help")
e("builtins","chr / ord","chr(codepoint, /)\nord(character, /)","ord — код символа, chr — символ по коду (Unicode).","""print(ord("A"), chr(65))\nprint(ord("я"))""","", F+"ord")
e("builtins","hash","hash(object, /)","Число-отпечаток значения; используется словарями и множествами. Есть только у неизменяемых объектов.",
 """print(hash(42))\ntry:\n    hash([1, 2])\nexcept TypeError as err:\n    print(err)""","", F+"hash")
e("builtins","iter / next","iter(iterable, /)\nnext(iterator, /)\nnext(iterator, default, /)","iter делает итератор, next берёт из него следующий элемент. default — что вернуть, когда элементы кончились.",
 """it = iter([1, 2])\nprint(next(it), next(it), next(it, "конец"))""","", F+"next")
e("builtins","getattr / hasattr / setattr","getattr(object, name, /)\ngetattr(object, name, default, /)\nhasattr(object, name, /)\nsetattr(object, name, value, /)",
 "Читают, проверяют и задают атрибут по имени-строке.","""class Box: pass\nb = Box()\nsetattr(b, "size", 3)\nprint(hasattr(b, "size"), getattr(b, "color", "нет"))""","", F+"getattr")
e("builtins","eval","eval(source, /, globals=None, locals=None)","Вычисляет строку как выражение Python.","""print(eval("2 + 3 * 4"))""",
 "Никогда не передавайте в eval ввод пользователя — это дыра в безопасности. Для чисел — int()/float(), для данных — json.loads.", F+"eval")

# ---------- типы ----------
e("types","int","int(number=0, /)\nint(string, /, base=10)","Целое число. Из строки — только если там цифры; из float — отбрасывает дробную часть.",
 """print(int("42") + 1)\nprint(int(3.9))\nprint(int("ff", 16))""","int(3.9) == 3 — это отбрасывание, не округление. Округление — round().", F+"int")
e("types","float","float(number=0.0, /)","Дробное число.","""print(float("3.5"))\nprint(0.1 + 0.2)""","0.1 + 0.2 не равно точно 0.3 — так устроены дробные числа в компьютере. Сравнивайте через math.isclose.", F+"float")
e("types","str","str(object='')","Строковое представление значения.","""print(str(42) + "!")\nprint(str([1, 2]))""","", F+"func-str")
e("types","bool","bool(object=False, /)","Истинность значения. Ложны: 0, 0.0, '', [], {}, set(), None, False. Всё остальное истинно.",
 """print(bool(0), bool(""), bool([]))\nprint(bool("0"), bool([0]))""","Строка \"0\" и список [0] — истинны: они не пустые.", F+"bool")
e("types","list","list(iterable=())","Список — изменяемая последовательность.","""print(list("кот"))\nprint(list(range(3)))""","", F+"func-list")
e("types","tuple","tuple(iterable=())","Кортеж — неизменяемая последовательность. Хорош как ключ словаря и для «пачки» значений.",
 """t = tuple([1, 2])\nprint(t)\nprint((5,))   # кортеж из одного элемента — с запятой""","(5) — это просто число 5, кортеж — (5,).", F+"func-tuple")
e("types","dict","dict(**kwargs)\ndict(mapping, **kwargs)\ndict(iterable, **kwargs)","Словарь из пар или именованных аргументов.",
 """print(dict(a=1, b=2))\nprint(dict([("x", 10), ("y", 20)]))""","", F+"func-dict")
e("types","set","set(iterable=())","Множество: убирает повторы.","""print(sorted(set([3, 1, 3, 2, 1])))\nprint(set())   # пустое множество""",
 "{} — это пустой словарь, не множество. Пустое множество — только set().", F+"func-set")
e("types","frozenset","frozenset(iterable=())","Неизменяемое множество; может быть ключом словаря.","""fs = frozenset([1, 2])\nprint(2 in fs)""","", F+"func-frozenset")

# ---------- str ----------
def sm(name, sig, text, code, note=""):
    e("str", "str."+name, sig, text, code, note, S+"str."+name)
sm("upper","str.upper()","Все буквы — заглавные.","""print("Привет".upper())""")
sm("lower","str.lower()","Все буквы — строчные. Удобно для сравнения без учёта регистра.","""print("ПрИвЕт".lower())""","Для сравнения разных языков надёжнее casefold().")
sm("casefold","str.casefold()","Как lower, но агрессивнее; лучший способ сравнивать без учёта регистра.","""print("Straße".casefold() == "STRASSE".casefold())""")
sm("capitalize","str.capitalize()","Первая буква заглавная, остальные строчные.","""print("пРИВЕТ мир".capitalize())""")
sm("title","str.title()","Каждое слово с заглавной.","""print("иван петров".title())""")
sm("strip","str.strip(chars=None, /)","Убирает пробелы (или символы из chars) с обоих краёв. lstrip — слева, rstrip — справа.",
 """print("[" + "  текст \\n".strip() + "]")\nprint("--привет--".strip("-"))""",
 "chars — набор символов, а не подстрока. Чтобы убрать конкретное окончание, используйте removesuffix().")
sm("removeprefix","str.removeprefix(prefix, /)","Убирает приставку, если строка с неё начинается.","""print("report_2026.txt".removeprefix("report_"))""")
sm("removesuffix","str.removesuffix(suffix, /)","Убирает окончание, если строка им заканчивается.","""print("text.txt".removesuffix(".txt"))\nprint("text.txt".rstrip(".txt"))""","Сравните: rstrip(\".txt\") удаляет любые из символов . t x — получилось \"te\".")
sm("split","str.split(sep=None, maxsplit=-1)","Режет строку на список. Без sep — по любым пробелам, лишние пробелы игнорируются.",
 """print("a  b c".split())\nprint("2026-10-12".split("-"))\nprint("a,b,c".split(",", maxsplit=1))""","Обратная операция — \",\".join(список).")
sm("rsplit","str.rsplit(sep=None, maxsplit=-1)","Как split, но режет справа — важно вместе с maxsplit.","""print("архив.tar.gz".rsplit(".", maxsplit=1))""")
sm("splitlines","str.splitlines(keepends=False)","Режет текст на строки по переводам строк.","""print("первая\\nвторая\\n".splitlines())""")
sm("join","str.join(iterable, /)","Склеивает список строк, вставляя между ними саму строку.","""print(", ".join(["кот", "пёс"]))\nprint("".join(["a", "b", "c"]))""",
 "Все элементы должны быть строками: \", \".join(map(str, [1, 2])).")
sm("replace","str.replace(old, new, /, count=-1)","Заменяет подстроку. count — сколько замен максимум.","""print("2026.10.12".replace(".", "-"))\nprint("ааа".replace("а", "б", 2))""")
sm("find","str.find(sub[, start[, end]])","Индекс первого вхождения или -1, если не найдено. rfind ищет с конца.","""print("молоко".find("ок"))\nprint("молоко".find("я"))""",
 "Чтобы просто проверить наличие, используйте in: \"ок\" in \"молоко\".")
sm("index","str.index(sub[, start[, end]])","Как find, но если не нашёл — ошибка ValueError.","""print("молоко".index("л"))""")
sm("count","str.count(sub[, start[, end]])","Сколько раз подстрока встречается (без перекрытий).","""print("банан".count("а"))""")
sm("startswith","str.startswith(prefix[, start[, end]])","Начинается ли строка с prefix (можно кортеж вариантов). endswith — заканчивается ли.",
 """print("photo.jpg".endswith((".jpg", ".png")))\nprint("Привет".startswith("При"))""")
sm("isdigit","str.isdigit()","Состоит ли строка только из цифр (и не пустая). Удобно перед int().","""print("123".isdigit(), "12.5".isdigit(), "-5".isdigit())""",
 "Минус и точка — не цифры: для таких чисел надёжнее try: float(s).")
sm("isalpha","str.isalpha()","Только буквы, не пустая строка.","""print("кот".isalpha(), "кот1".isalpha())""")
sm("isspace","str.isspace()","Только пробельные символы.","""print("  \\t".isspace(), "".isspace())""")
sm("format","str.format(*args, **kwargs)","Подставляет значения в {}. В новом коде обычно удобнее f-строки.","""print("{} + {} = {}".format(2, 3, 5))\nx = 3.14159\nprint(f"{x:.2f}")""")
sm("center","str.center(width, fillchar=' ', /)","Выравнивает по центру в поле ширины width. ljust/rjust — по левому/правому краю.","""print("[" + "кот".center(9, "*") + "]")\nprint("7".rjust(3, "0"))""")
sm("zfill","str.zfill(width, /)","Дополняет число нулями слева до ширины.","""print("42".zfill(5))""")
sm("partition","str.partition(sep, /)","Делит на три части: до разделителя, сам разделитель, после.","""print("ключ=значение=ещё".partition("="))""")
sm("encode","str.encode(encoding='utf-8', errors='strict')","Превращает строку в байты.","""print("Я".encode("utf-8"))""","Обратно — bytes.decode(\"utf-8\").")

# ---------- list ----------
L = S + "typesseq-mutable"
def lm(name, sig, text, code, note="", url=None):
    e("list", "list."+name, sig, text, code, note, url or S+"list."+name)
lm("append","list.append(x)","Добавляет один элемент в конец.","""a = [1, 2]\na.append(3)\nprint(a)""","append([4, 5]) добавит один элемент-список. Чтобы добавить много — extend.")
lm("extend","list.extend(iterable)","Добавляет все элементы из другой последовательности.","""a = [1, 2]\na.extend([3, 4])\nprint(a)""")
lm("insert","list.insert(i, x)","Вставляет элемент перед позицией i.","""a = ["a", "c"]\na.insert(1, "b")\nprint(a)""")
lm("remove","list.remove(x)","Удаляет первый элемент, равный x. Если нет — ValueError.","""a = [1, 2, 1]\na.remove(1)\nprint(a)""")
lm("pop","list.pop(i=-1)","Удаляет и возвращает элемент (по умолчанию последний).","""a = [10, 20, 30]\nprint(a.pop())\nprint(a.pop(0), a)""")
lm("clear","list.clear()","Удаляет все элементы.","""a = [1, 2]\na.clear()\nprint(a)""")
lm("index","list.index(x[, start[, end]])","Позиция первого элемента, равного x. Если нет — ValueError.","""print(["a", "b", "c"].index("b"))""",url=S+"list.index")
lm("count","list.count(x)","Сколько раз x встречается.","""print([1, 2, 1, 1].count(1))""",url=S+"list.index")
lm("sort","list.sort(*, key=None, reverse=False)","Сортирует сам список на месте и возвращает None.","""a = [3, 1, 2]\na.sort()\nprint(a)\nprint(a.sort())""",
 "Частая ошибка: a = a.sort() превращает a в None. Новый список даёт sorted(a).", S+"list.sort")
lm("reverse","list.reverse()","Переворачивает сам список на месте.","""a = [1, 2, 3]\na.reverse()\nprint(a)""")
lm("copy","list.copy()","Поверхностная копия списка (то же, что a[:]).","""a = [1, 2]\nb = a.copy()\nb.append(3)\nprint(a, b)""",
 "b = a — это не копия, а второе имя того же списка.")
e("list","Срезы a[start:stop:step]","seq[i:j:k]","Берёт часть последовательности; работает для списков, строк и кортежей. stop не входит.",
 """a = [0, 1, 2, 3, 4, 5]\nprint(a[1:4], a[:2], a[-2:])\nprint(a[::2], a[::-1])""","", S+"common-sequence-operations")

# ---------- tuple ----------
e("tuple","tuple.count","tuple.count(x)","Сколько раз x встречается в кортеже.","""print((1, 2, 2).count(2))""","",S+"common-sequence-operations")
e("tuple","tuple.index","tuple.index(x[, start[, end]])","Позиция первого x.","""print(("a", "b").index("b"))""","",S+"common-sequence-operations")
e("tuple","Распаковка","a, b = (1, 2)","Раскладывает кортеж (или список) по переменным; * собирает «остаток».",
 """x, y = (3, 4)\nfirst, *rest = [1, 2, 3, 4]\nprint(x, y, first, rest)\na, b = 1, 2\na, b = b, a\nprint(a, b)""","", D+"tutorial/datastructures.html#tuples-and-sequences")

# ---------- dict ----------
def dm(name, sig, text, code, note=""):
    e("dict", "dict."+name, sig, text, code, note, S+"dict."+name)
dm("get","dict.get(key, default=None, /)","Значение по ключу; если ключа нет — default вместо ошибки.","""d = {"a": 1}\nprint(d.get("a"), d.get("b"), d.get("b", 0))""",
 "d[\"b\"] при отсутствии ключа вызывает KeyError, а get — нет.")
dm("keys","dict.keys()","Все ключи (живое «представление» словаря).","""d = {"a": 1, "b": 2}\nprint(list(d.keys()))""")
dm("values","dict.values()","Все значения.","""print(list({"a": 1, "b": 2}.values()))""")
dm("items","dict.items()","Пары (ключ, значение) — удобно в цикле.","""for k, v in {"a": 1, "b": 2}.items():\n    print(k, v)""")
dm("update","dict.update([other], **kwargs)","Добавляет/перезаписывает пары из другого словаря.","""d = {"a": 1}\nd.update({"a": 10, "b": 2})\nprint(d)\nprint({"x": 1} | {"y": 2})""","Оператор | (Python 3.9+) делает новый объединённый словарь.")
dm("pop","dict.pop(key, /)\ndict.pop(key, default, /)","Удаляет ключ и возвращает значение. Без default и без ключа — KeyError.","""d = {"a": 1, "b": 2}\nprint(d.pop("a"), d)\nprint(d.pop("z", "нет"))""")
dm("popitem","dict.popitem()","Удаляет и возвращает последнюю добавленную пару.","""d = {"a": 1, "b": 2}\nprint(d.popitem(), d)""")
dm("setdefault","dict.setdefault(key, default=None, /)","Если ключа нет — кладёт default и возвращает его; если есть — возвращает текущее значение.",
 """groups = {}\ngroups.setdefault("фрукты", []).append("яблоко")\nprint(groups)""")
dm("fromkeys","dict.fromkeys(iterable, value=None, /)","Новый словарь с заданными ключами и одним значением.","""print(dict.fromkeys(["a", "b"], 0))""",
 "Не передавайте изменяемое значение ([]): оно будет одно на все ключи.")
dm("clear","dict.clear()","Удаляет все пары.","""d = {"a": 1}\nd.clear()\nprint(d)""")
dm("copy","dict.copy()","Поверхностная копия.","""d = {"a": 1}\nc = d.copy()\nc["a"] = 2\nprint(d, c)""")
e("dict","in (проверка ключа)","key in d","Проверяет наличие ключа (не значения!).","""d = {"a": 1}\nprint("a" in d, 1 in d)""","",S+"mapping-types-dict")

# ---------- set ----------
def stm(name, sig, text, code, note=""):
    e("set", "set."+name, sig, text, code, note, (S+"set."+name if name in ("add","remove","discard","pop","update") else S+"frozenset."+name))
stm("add","set.add(elem, /)","Добавляет элемент (если уже есть — ничего не меняется).","""s = {1, 2}\ns.add(2); s.add(3)\nprint(sorted(s))""")
stm("remove","set.remove(elem, /)","Удаляет элемент; если его нет — KeyError.","""s = {1, 2}\ns.remove(1)\nprint(s)""","discard делает то же, но без ошибки.")
stm("discard","set.discard(elem, /)","Удаляет элемент, если он есть; ошибок не бывает.","""s = {1, 2}\ns.discard(5)\nprint(s)""")
stm("pop","set.pop()","Удаляет и возвращает какой-то элемент (какой — не гарантируется).","""s = {7}\nprint(s.pop(), s)""")
stm("union","set.union(*others)","Объединение: все элементы из обоих. То же — оператор |.","""a, b = {1, 2}, {2, 3}\nprint(sorted(a.union(b)), sorted(a | b))""")
stm("intersection","set.intersection(*others)","Пересечение: только общие. Оператор &.","""print({1, 2, 3} & {2, 3, 4})""")
stm("difference","set.difference(*others)","Разность: есть в первом, нет во втором. Оператор -.","""print({1, 2, 3} - {2})""")
stm("symmetric_difference","set.symmetric_difference(other, /)","Есть ровно в одном из двух. Оператор ^.","""print(sorted({1, 2} ^ {2, 3}))""")
stm("issubset","set.issubset(other, /)","Все ли элементы входят в other (оператор <=). issuperset — наоборот.","""print({1, 2}.issubset({1, 2, 3}))""")
stm("update","set.update(*others)","Добавляет элементы из других наборов на месте.","""s = {1}\ns.update([2, 3], {4})\nprint(sorted(s))""")

# ---------- файлы ----------
IO = D + "library/io.html#"
e("file","file.read","f.read(size=-1)","Читает весь файл (или size символов) в одну строку.",
 """with open("t.txt", "w", encoding="utf-8") as f:\n    f.write("раз\\nдва\\n")\nwith open("t.txt", encoding="utf-8") as f:\n    print(repr(f.read()))""","",IO+"io.TextIOBase.read")
e("file","file.readline","f.readline(size=-1)","Читает одну строку вместе с \\n. В конце файла — пустая строка.","""with open("t.txt", encoding="utf-8") as f:\n    print(repr(f.readline()))""","",IO+"io.TextIOBase.readline")
e("file","file.readlines","f.readlines(hint=-1)","Список всех строк файла.","""with open("t.txt", encoding="utf-8") as f:\n    print(f.readlines())""","",IO+"io.IOBase.readlines")
e("file","for line in f","for line in f: …","Самый удобный способ читать файл построчно, не загружая его целиком.",
 """with open("t.txt", encoding="utf-8") as f:\n    for line in f:\n        print(line.strip())""","В строке остаётся \\n — уберите strip() или rstrip(\"\\n\").",IO+"io.IOBase")
e("file","file.write","f.write(s)","Пишет строку в файл и возвращает число записанных символов. Перевод строки сам не добавляет.",
 """with open("t2.txt", "w", encoding="utf-8") as f:\n    n = f.write("привет\\n")\nprint(n)""","",IO+"io.TextIOBase.write")
e("file","file.writelines","f.writelines(lines)","Пишет список строк подряд; \\n не добавляет.","""with open("t2.txt", "w", encoding="utf-8") as f:\n    f.writelines(["a\\n", "b\\n"])\nprint(open("t2.txt", encoding="utf-8").read().split())""","",IO+"io.IOBase.writelines")
e("file","with","with open(...) as f: …","Гарантирует, что файл закроется, даже если внутри произошла ошибка.",
 """with open("t.txt", encoding="utf-8") as f:\n    pass\nprint(f.closed)""","",D+"reference/compound_stmts.html#the-with-statement")

# ---------- math ----------
M = D + "library/math.html#math."
for name, sig, text, code in [
 ("sqrt","math.sqrt(x)","Квадратный корень (float).","import math\nprint(math.sqrt(16))"),
 ("floor","math.floor(x)","Округление вниз до целого.","import math\nprint(math.floor(3.7), math.floor(-3.2))"),
 ("ceil","math.ceil(x)","Округление вверх до целого.","import math\nprint(math.ceil(3.2), math.ceil(-3.7))"),
 ("pi","math.pi","Число π.","import math\nprint(round(math.pi, 5))"),
 ("isclose","math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)","Приблизительное равенство дробных чисел.","import math\nprint(0.1 + 0.2 == 0.3, math.isclose(0.1 + 0.2, 0.3))"),

 ("prod","math.prod(iterable, *, start=1)","Произведение всех элементов.","import math\nprint(math.prod([2, 3, 4]))"),
 ("gcd","math.gcd(*integers)","Наибольший общий делитель.","import math\nprint(math.gcd(12, 18))"),
 ("log","math.log(x[, base])","Логарифм (по умолчанию натуральный).","import math\nprint(math.log(100, 10), math.log2(8))"),
]:
    e("math", "math."+name, sig, text, code, "", M+name)

# ---------- random ----------
R = D + "library/random.html#random."
for name, sig, text, code, note in [
 ("seed","random.seed(a=None, version=2)","Фиксирует «зерно», чтобы случайные числа повторялись — удобно для тестов.","import random\nrandom.seed(1); a = random.random()\nrandom.seed(1); b = random.random()\nprint(a == b)",""),
 ("random","random.random()","Случайное дробное число от 0.0 (включительно) до 1.0 (не включая).","import random\nx = random.random()\nprint(0 <= x < 1)",""),
 ("randint","random.randint(a, b)","Случайное целое от a до b, оба конца включены.","import random\nn = random.randint(1, 6)\nprint(1 <= n <= 6)","В отличие от range, b здесь входит."),
 ("choice","random.choice(seq)","Случайный элемент последовательности.",'import random\nprint(random.choice(["орёл", "решка"]) in ("орёл", "решка"))',""),
 ("sample","random.sample(population, k, *, counts=None)","k разных случайных элементов (без повторов), новый список.","import random\nprint(len(random.sample(range(100), 3)))",""),
 ("shuffle","random.shuffle(x)","Перемешивает список на месте, возвращает None.",'import random\na = [1, 2, 3]\nrandom.shuffle(a)\nprint(sorted(a))',"Для шифров и паролей — модуль secrets, а не random."),
]:
    e("random", "random."+name, sig, text, code, note, R+name)

# ---------- datetime ----------
DT = D + "library/datetime.html#datetime."
e("datetime","date","datetime.date(year, month, day)","Дата без времени. date.today() — сегодня.","""from datetime import date\nd = date(2026, 10, 12)\nprint(d, d.year, d.weekday())""","weekday(): понедельник = 0.",DT+"date")
e("datetime","datetime","datetime.datetime(year, month, day, hour=0, minute=0, second=0, microsecond=0, tzinfo=None, *, fold=0)","Дата и время. datetime.now() — сейчас.",
 """from datetime import datetime\nt = datetime(2026, 10, 12, 20, 30)\nprint(t)""","",DT+"datetime")
e("datetime","timedelta","datetime.timedelta(days=0, seconds=0, microseconds=0, milliseconds=0, minutes=0, hours=0, weeks=0)","Промежуток времени; можно прибавлять к датам и получать как разность дат.",
 """from datetime import date, timedelta\nd = date(2026, 10, 12)\nprint(d + timedelta(days=30))\nprint(date(2026, 12, 31) - d)""","",DT+"timedelta")
e("datetime","strftime","datetime.strftime(format)","Дата → строка по шаблону: %d день, %m месяц, %Y год, %H:%M часы и минуты.",
 """from datetime import datetime\nt = datetime(2026, 10, 12, 20, 30)\nprint(t.strftime("%d.%m.%Y %H:%M"))""","Обратное — strptime.",DT+"datetime.strftime")
e("datetime","strptime","datetime.strptime(date_string, format)","Строка → datetime по шаблону.",
 """from datetime import datetime\nt = datetime.strptime("12.10.2026", "%d.%m.%Y")\nprint(t.date())""","",DT+"datetime.strptime")
e("datetime","isoformat / fromisoformat","date.isoformat()\ndate.fromisoformat(date_string)","Стандартный вид ГГГГ-ММ-ДД, удобный для JSON и имён файлов.",
 """from datetime import date\nd = date.fromisoformat("2026-10-12")\nprint(d.isoformat(), d.month)""","",DT+"date.fromisoformat")

# ---------- os / pathlib ----------
P = D + "library/pathlib.html#pathlib."
e("pathlib","Path","pathlib.Path(*pathsegments)","Путь к файлу как объект. Оператор / склеивает части пути.",
 """from pathlib import Path\np = Path("data") / "report.txt"\nprint(p.name, p.stem, p.suffix, p.parent)""","",P+"Path")
e("pathlib","Path.exists","Path.exists(*, follow_symlinks=True)","Существует ли файл или папка. is_file()/is_dir() уточняют, что это.",
 """from pathlib import Path\nprint(Path("t.txt").exists(), Path("t.txt").is_file())""","",P+"Path.exists")
e("pathlib","Path.read_text / write_text","Path.read_text(encoding=None, errors=None, newline=None)\nPath.write_text(data, encoding=None, errors=None, newline=None)","Прочитать или записать файл одной строкой кода.",
 """from pathlib import Path\np = Path("t3.txt")\np.write_text("привет", encoding="utf-8")\nprint(p.read_text(encoding="utf-8"))""","",P+"Path.read_text")
e("pathlib","Path.glob","Path.glob(pattern, *, case_sensitive=None, recurse_symlinks=False)","Ищет файлы по шаблону: *.txt — в папке, **/*.txt — во всех подпапках.",
 """from pathlib import Path\nprint(sorted(p.name for p in Path(".").glob("t*.txt")))""","",P+"Path.glob")
e("pathlib","Path.mkdir","Path.mkdir(mode=0o777, parents=False, exist_ok=False)","Создаёт папку. parents=True — с промежуточными, exist_ok=True — без ошибки, если уже есть.",
 """from pathlib import Path\nPath("out/2026").mkdir(parents=True, exist_ok=True)\nprint(Path("out/2026").is_dir())""","",P+"Path.mkdir")
e("pathlib","os.listdir","os.listdir(path='.')","Список имён в папке (без пути).","""import os\nos.makedirs("box", exist_ok=True)\nopen("box/a.txt", "w").close()\nprint(os.listdir("box"))""","",D+"library/os.html#os.listdir")
e("pathlib","os.getcwd","os.getcwd()","Текущая рабочая папка — от неё считаются относительные пути.","""import os\nprint(os.path.isabs(os.getcwd()))""","",D+"library/os.html#os.getcwd")
e("pathlib","os.environ","os.environ","Переменные окружения как словарь. Так читают ключи API, не вписывая их в код.",
 """import os\nkey = os.environ.get("MY_API_KEY", "не задан")\nprint(key)""","Используйте .get(), чтобы не получить KeyError.",D+"library/os.html#os.environ")
e("pathlib","os.path.join","os.path.join(path, *paths)","Склеивает части пути правильным разделителем (старый способ; новый — Path и /).",
 """import os\nprint(os.path.join("data", "report.txt"))""","",D+"library/os.path.html#os.path.join")

# ---------- json ----------
J = D + "library/json.html#json."
e("json","json.dumps","json.dumps(obj, *, skipkeys=False, ensure_ascii=True, check_circular=True, allow_nan=True, cls=None, indent=None, separators=None, default=None, sort_keys=False, **kw)",
 "Python-объект → JSON-строка. Для русского текста ставьте ensure_ascii=False, для читаемости indent=2.",
 """import json\nd = {"имя": "Аня", "оценки": [5, 4]}\nprint(json.dumps(d))\nprint(json.dumps(d, ensure_ascii=False))""","",J+"dumps")
e("json","json.loads","json.loads(s, *, cls=None, object_hook=None, parse_float=None, parse_int=None, parse_constant=None, object_pairs_hook=None, **kw)",
 "JSON-строка → Python (dict, list, str, int, float, bool, None).","""import json\nd = json.loads('{"ok": true, "n": null}')\nprint(d)""","В JSON true/false/null, в Python True/False/None.",J+"loads")
e("json","json.dump / json.load","json.dump(obj, fp, …)\njson.load(fp, …)","То же, но сразу в файл / из файла.",
 """import json\nwith open("d.json", "w", encoding="utf-8") as f:\n    json.dump({"a": 1}, f)\nwith open("d.json", encoding="utf-8") as f:\n    print(json.load(f))""","Без s — работа с файлом; с s (dumps/loads) — со строкой.",J+"dump")

def run_all():
    cwd = os.getcwd(); tmp = tempfile.mkdtemp(); os.chdir(tmp)
    os.environ.pop("MY_API_KEY", None)
    try:
        for it in E:
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                exec(compile(it["code"], it["name"], "exec"), {"__name__": "__main__"})
            it["out"] = buf.getvalue().rstrip("\n")
    finally:
        os.chdir(cwd)

if __name__ == "__main__":
    run_all()
    root = pathlib.Path(__file__).resolve().parent.parent
    data = {"python": "3.14", "checked_with": sys.version.split()[0], "groups": [dict(id=g, title=t, hint=h) for g, t, h in GROUPS], "entries": E}
    (root / "data" / "spravochnik.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print("OK entries:", len(E))

# ---------- страница spravochnik.html (оболочка; содержимое рисует JS из data/spravochnik.json) ----------
import re as _re
def build_page(root, n):
    src = (root / "novosti.html").read_text(encoding="utf-8")
    h = _re.search(r'<header class="site-header">.*?</header>', src, _re.S).group(0)
    h = h.replace(' class="active" aria-current="page"', "")
    h = h.replace('<a href="spravochnik.html">', '<a class="active" aria-current="page" href="spravochnik.html">')
    h = h.replace('<details class="nav-more">', '<details class="nav-more has-active">')
    ver = _re.search(r'styles\.css\?v=([\w.-]+)', src).group(1) + "-sp1"
    page = f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Справочник Python · py.motomov.ru</title>
  <meta name="description" content="Справочник Python для начинающих: встроенные функции, методы str, list, dict, set, файлы, math, random, datetime, pathlib, json — с примерами и выводом.">
  <meta name="theme-color" content="#f3efe6">
  <link rel="icon" href="https://www.motomov.ru/favicon.png" type="image/png">
  <link rel="canonical" href="https://py.motomov.ru/spravochnik">
  <link rel="stylesheet" href="styles.css?v={ver}">
  <script>try{{var d=document.documentElement,s=localStorage;if(s.getItem("moto-theme")==="dark")d.dataset.theme="dark";var f=s.getItem("moto-fs");if(f&&f!=="1")d.dataset.fs=f;if(s.getItem("moto-comfy")==="1")d.dataset.comfy="1"}}catch(e){{}}</script>
</head>
<body>
  <div class="bg-grid" aria-hidden="true"></div>
  <div class="wrap">
    {h}
    <section class="page-intro">
      <h1>Справочник Python</h1>
      <p class="bio">{n} функций и методов простыми словами: что делает, когда нужно, пример с настоящим выводом и ссылка на официальную документацию Python 3.14. Нажмите на строку, чтобы раскрыть.</p>
    </section>
    <div class="sp-search"><input type="search" id="sp-q" placeholder="Поиск: split, сортировка, файл…" autocomplete="off" aria-label="Поиск по справочнику"><span id="sp-count"></span></div>
    <details class="m-toc" id="m-toc"><summary>Содержание</summary><ol id="sp-toc"></ol></details>
    <div id="sp-root"><div class="empty">Загрузка справочника…</div></div>
    <div class="m-fab" id="m-fab" hidden><button type="button" id="m-top">↑ Содержание</button><button type="button" id="m-sec" aria-expanded="false" aria-controls="m-panel">☰ Разделы</button></div>
    <div class="m-panel" id="m-panel" hidden role="dialog" aria-label="Разделы справочника"><div class="m-panel-head"><b>Разделы</b><button type="button" id="m-pclose" aria-label="Закрыть">✕</button></div><ol id="sp-panel"></ol></div>
    <footer class="site"><a href="https://docs.python.org/ru/3.14/">Официальная документация Python</a> · <a href="https://github.com/jagorun/motomov-py">репозиторий</a></footer>
  </div>
  <script src="js/app.js?v={ver}" defer></script>
  <script src="js/spravochnik.js?v={ver}" defer></script>
</body>
</html>
'''
    (root / "spravochnik.html").write_text(page, encoding="utf-8")

if __name__ == "__main__":
    build_page(pathlib.Path(__file__).resolve().parent.parent, len(E))
