t = open('IconMaker.html', encoding='utf-8').read()
idx = t.find('[data-theme="light"]')
print('LIGHT L', t[:idx].count('\n')+1)
print(t[idx:idx+1200])
print()
for kw in ['dlPng','dlJpg','dlSvg','dlIco','drawPreset','presetExport','presetImport']:
    ii = t.find('"'+kw+'"')
    jj = t.find(kw+'.addEventListener')
    print(f'{kw}: idL={ii} bindL={jj}')
