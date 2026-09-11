import re, sys
def check(path):
    t = open(path, encoding='utf-8').read()
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', t, re.DOTALL)
    for idx, s in enumerate(scripts):
        depth_p = 0
        depth_b = 0
        i = 0
        n = len(s)
        while i < n:
            c = s[i]
            if c == '/' and i+1 < n and s[i+1] == '/':
                j = s.find('\n', i)
                i = (j if j > 0 else n) + 1
                continue
            if c == '/' and i+1 < n and s[i+1] == '*':
                j = s.find('*/', i+2)
                i = (j+2 if j > 0 else n)
                continue
            if c in ('"', "'", '`'):
                q = c
                i += 1
                while i < n and s[i] != q:
                    if s[i] == '\\':
                        i += 2
                        continue
                    i += 1
                i += 1
                continue
            if c == '(':
                depth_p += 1
            elif c == ')':
                depth_p -= 1
            elif c == '{':
                depth_b += 1
            elif c == '}':
                depth_b -= 1
            i += 1
        print(f'{path} script{idx}: parens={depth_p}, braces={depth_b}')

if __name__ == '__main__':
    for p in sys.argv[1:]:
        check(p)
