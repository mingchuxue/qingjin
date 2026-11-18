#!/usr/bin/env python3
"""Validate manual evidence; output isolated staging, never production data."""
import argparse, datetime, hashlib, json, pathlib, re
from collect import atomic, canonical, fingerprint
ROOT=pathlib.Path(__file__).resolve().parent
SUBJECTS={'chinese','math','english','physics','chemistry','biology','politics','history','geography'}
RIGHTS={'public-domain','licensed','written-permission','original-explanation'}
def validate(item):
 errors=[]
 if not isinstance(item,dict):return ['候选必须是JSON对象']
 answer_source=item.get('answerSource') if isinstance(item.get('answerSource'),dict) else {}
 rights=item.get('rights') if isinstance(item.get('rights'),dict) else {}
 for key in ['pageUrl','year','region','subject','questionNumber','retrievedAt','contentHash','stem','answer','steps','reviewer','reviewedAt']:
  if not item.get(key):errors.append('缺少 '+key)
 if item.get('subject') not in SUBJECTS:errors.append('学科不合法')
 if not isinstance(item.get('year'),int) or not 1900<=item.get('year',0)<=datetime.datetime.now().year:errors.append('年份不合法')
 if item.get('originalVerified') is not True or item.get('answerVerified') is not True:errors.append('原题及答案必须分别核验')
 if not re.fullmatch(r'[0-9a-f]{64}',item.get('contentHash','')):errors.append('缺有效原件SHA256')
 if not answer_source.get('url'):errors.append('缺答案出处URL')
 for kind in ('question','explanation'):
  right=rights.get(kind,{})
  if not isinstance(right,dict) or right.get('status') not in RIGHTS or not right.get('evidenceUrl'):errors.append(kind+'版权/许可证据未核清')
  if kind=='question' and isinstance(right,dict) and right.get('status')=='original-explanation':errors.append('原创解析不能作为原题使用许可')
 for u in [item.get('pageUrl',''),answer_source.get('url','')]:
  try:
   from urllib.parse import urlsplit
   canonical(u,{source['host'] for source in json.loads((ROOT/'sources.json').read_text())['sources']})
  except Exception:errors.append('来源URL无效或含认证参数')
 if not isinstance(item.get('steps'),list) or not item.get('steps') or not all(isinstance(s,str) and s.strip() for s in item.get('steps',[])):errors.append('缺完整解析步骤')
 for k in ['stem','answer','region','reviewer','reviewedAt','retrievedAt']:
  if not isinstance(item.get(k),str):errors.append(k+'必须为文本')
 return errors

def stage(item,out):
 errors=validate(item)
 if errors:raise ValueError('；'.join(errors))
 out=pathlib.Path(out).resolve()
 if not out.is_relative_to(ROOT/'reviewed') and not out.is_relative_to(ROOT/'exports'):raise ValueError('仅允许输出collector/reviewed或exports，不写生产库')
 normalized=fingerprint(item['stem']);record={**item,'normalizedQuestionHash':normalized,'reviewStatus':'ready-for-manual-import','sourceKind':'verified-exam'}
 for f in (ROOT/'reviewed').glob('*.json'):
  prior=json.loads(f.read_text())
  if fingerprint(prior.get('stem',''))==normalized and f.resolve()!=out:raise ValueError('规范化题干重复，停止暂存')
 atomic(out,record);return record
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('candidate',type=pathlib.Path);ap.add_argument('--out',type=pathlib.Path,required=True);a=ap.parse_args()
 try:r=stage(json.loads(a.candidate.read_text()),a.out);print('校验通过，仅暂存待人工入库：'+str(a.out))
 except ValueError as e:raise SystemExit(str(e))
