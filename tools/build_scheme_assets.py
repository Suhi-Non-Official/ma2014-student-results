"""Render the marking scheme into sections aligned with the grading columns.
Crop coordinates are PDF points (page, top, bottom); all crops preserve x=70..550.
"""
from pathlib import Path
import json
import subprocess
from contextlib import nullcontext
import pdfplumber
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'site' / 'schemes'
POPPLER = Path('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')

# Each question has its full prompt, followed by one crop group per graded part.
LAYOUT = {
 1: [{'prompt':[(1,232,298)], 'parts':[[(2,70,727)]]},
     {'prompt':[(1,302,394)], 'parts':[[(3,70,715)]]}],
 2: [{'prompt':[(1,232,372)], 'parts':[
      [(2,70,383)], [(2,384,709),(3,70,154)], [(3,154,244)], [(3,246,717)]]}],
 3: [{'prompt':[(1,232,357)], 'parts':[
      [(2,70,141)], [(2,141,261)], [(2,261,481)], [(2,481,632)],
      [(2,632,731),(3,70,126)], [(3,126,297)], [(3,297,380)]]}],
 4: [{'prompt':[(1,232,332)], 'parts':[
      [(2,70,308)], [(2,308,393)], [(2,393,460)], [(2,460,517)],
      [(2,517,584)], [(2,584,651)], [(2,651,708)]]},
     {'prompt':[(1,334,400)], 'parts':[
      [(3,70,244)], [(3,244,419)], [(3,419,502)], [(3,502,625)],
      [(3,625,730),(4,70,89)], [(4,89,288)]]}],
 5: [{'prompt':[(1,232,340)], 'parts':[
      [(2,70,223)], [(2,223,292)], [(2,292,474)], [(2,474,684)]]},
     {'prompt':[(1,343,407)], 'parts':[
      [(3,70,188)], [(3,188,346)], [(3,346,419)], [(3,419,547)]]}],
}

MAKEUP_LAYOUT = {
 1: [{'prompt':[(1,232,298)], 'parts':[
      [(2,144,278)],[(2,279,376)],[(2,377,501)],[(2,502,563)]]},
     {'prompt':[(1,303,395)], 'parts':[
      [(2,663,715),(3,70,282)],[(3,283,442)],[(3,443,523)],[(3,524,612)]]}],
 2: [{'prompt':[(1,232,344)], 'parts':[
      [(2,70,202)],[(2,203,730)],[(3,70,164)],[(3,168,437)]]}],
 3: LAYOUT[3],
 5: [{'prompt':[(1,232,283)], 'parts':[
      [(2,70,193)],[(2,194,392)],[(2,393,465)]]},
     {'prompt':[(1,290,357)], 'parts':[
      [(2,466,624)],[(2,625,731),(3,70,90)],[(3,91,273)]]}],
}

def build(makeup=False):
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    working = ROOT / '.local' / 'scheme-pages'
    working.mkdir(parents=True, exist_ok=True)
    with nullcontext(str(working)) as temporary:
        for quiz, questions in (MAKEUP_LAYOUT if makeup else LAYOUT).items():
            source = ROOT / 'Marking Schemes' / (f'Makeup Quiz {quiz}.pdf' if makeup else f'quiz {quiz} marking scheme.pdf')
            label = f'makeup-quiz-{quiz}' if makeup else f'quiz-{quiz}'
            prefix = Path(temporary) / label
            subprocess.run([str(POPPLER) if POPPLER.exists() else 'pdftoppm', '-scale-to','2200','-png',str(source),str(prefix)],check=True,capture_output=True)
            with pdfplumber.open(source) as pdf:
                pages = {i+1:Image.open(Path(str(prefix)+f'-{i+1}.png')) for i in range(len(pdf.pages))}
                def crop_regions(regions, name):
                    assets=[]
                    for i,(page,top,bottom) in enumerate(regions,1):
                        image=pages[page];geometry=pdf.pages[page-1]
                        sx=image.width/geometry.width;sy=image.height/geometry.height
                        crop=image.crop((round(70*sx),round(top*sy),round(550*sx),round(bottom*sy)))
                        filename=f'{name}-{i}.webp';crop.save(OUT/filename,'WEBP',quality=92,method=6)
                        assets.append({'src':'schemes/'+filename,'width':crop.width,'height':crop.height})
                    return assets
                results=[]
                for q,question in enumerate(questions,1):
                    name=f'{label}-question-{q}'
                    results.append({'prompt':crop_regions(question['prompt'],name+'-prompt'),
                        'parts':[crop_regions(regions,name+f'-part-{p}') for p,regions in enumerate(question['parts'],1)]})
                manifest[quiz]=results
                for image in pages.values():image.close()
    filename = 'makeup-scheme-sections.js' if makeup else 'scheme-sections.js'
    variable = 'makeupSchemeSections' if makeup else 'markingSchemeSections'
    (ROOT/'site'/filename).write_text('window.'+variable+' = '+json.dumps(manifest,separators=(',',':'))+';\n',encoding='utf8')
    print('Rendered '+('makeup' if makeup else 'original')+' marking-scheme sections.')

if __name__=='__main__':
    import sys
    build(makeup='--makeup' in sys.argv)
