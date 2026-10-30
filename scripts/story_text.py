"""Conservative English sentence boundaries shared by scene and voice planning."""
import re
ABBREVIATION=re.compile(r'(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St|Sr|Jr|vs|e\.g|i\.e)|\b[A-Z])\.$',re.I)
def sentence_units(text):
 text=re.sub(r'\s+',' ',str(text or '')).strip()
 raw=re.findall(r'.+?(?:[.!?]+[\"\u201d\u2019\x27)\]]*(?=\s|$)|$)',text)
 output=[]
 for part in raw:
  part=part.strip()
  if not part:continue
  if output and ABBREVIATION.search(output[-1]):output[-1]+=' '+part
  else:output.append(part)
 return output
