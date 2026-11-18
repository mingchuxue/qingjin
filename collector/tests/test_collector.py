import contextlib, copy, io, json, pathlib, sys, tempfile, unittest, urllib.error
from unittest.mock import patch
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from collect import Client, Redirect, canonical, fingerprint, locked, atomic, retry_seconds, run
from review import validate,stage
CONFIG=json.loads((ROOT/'sources.json').read_text());CONFIG={**CONFIG,'sources':[CONFIG['sources'][0]],'minIntervalSeconds':0}
URL=CONFIG['sources'][0]['url']
class Response(io.BytesIO):
 def __init__(self,data,url=URL,typ='text/html; charset=utf-8'):super().__init__(data);self.headers={'Content-Type':typ};self.url=url
 def geturl(self):return self.url
class Opener:
 def __init__(self,items):self.items=list(items);self.calls=[]
 def open(self,req,timeout):
  self.calls.append(req.full_url)
  item=self.items.pop(0)
  if isinstance(item,Exception):raise item
  return item

def client(items,config=CONFIG):return Client(copy.deepcopy(config),Opener(items),lambda _:None)
def error(code,headers=None):return urllib.error.HTTPError(URL,code,'mock',headers or {},None)
def candidate():return {'pageUrl':URL,'year':2025,'region':'测试地区','subject':'math','questionNumber':'1','retrievedAt':'2026-11-18','contentHash':'a'*64,'stem':'仅在测试中构造的题干','answer':'1','steps':['独立核验步骤'],'reviewer':'本地测试审校','reviewedAt':'2026-11-18','originalVerified':True,'answerVerified':True,'answerSource':{'url':URL},'rights':{'question':{'status':'public-domain','evidenceUrl':URL},'explanation':{'status':'original-explanation','evidenceUrl':URL}}}
class CollectorTest(unittest.TestCase):
 def test_default_offline_no_request_and_seed_only(self):
  with tempfile.TemporaryDirectory() as d:
   c=client([]);r=run(CONFIG,d,False,c);self.assertEqual(r['requests'],0);self.assertEqual(r['candidateCount'],1);self.assertEqual(c.opener.calls,[])
 def test_success_robots404_hash_metadata_not_body_and_dedup(self):
  with tempfile.TemporaryDirectory() as d:
   body=b'<html><title>public</title><p>do-not-archive-body</p><a href="/xhtml1/report/123/1.htm">r</a><a href="/xhtml1/report/123/1.htm">r</a><a href="/html1/folder/nav.htm">nav</a></html>'
   r=run(CONFIG,d,True,client([error(404),Response(body)]));state=json.loads((pathlib.Path(d)/'state.json').read_text());self.assertEqual(r['requests'],2);self.assertEqual(r['candidateCount'],2);self.assertNotIn('do-not-archive-body',json.dumps(state));self.assertEqual(r['fetchedCandidateCount'],1)
   r=run(CONFIG,d,True,client([]));self.assertEqual(r['requests'],0);self.assertEqual(r['candidateCount'],2)
 def test_robots_deny_no_page_fetch(self):
  with tempfile.TemporaryDirectory() as d:
   c=client([Response(b'User-agent: *\nDisallow: /',typ='text/plain')]);r=run(CONFIG,d,True,c);self.assertEqual(r['requests'],1);self.assertEqual(r['events'][0]['status'],'robots-denied')
 def test_robots_html_fails_closed(self):
  c=client([Response(b'<html>not rules</html>')]);self.assertFalse(c.allowed(URL)[0])
 def test_429_persistent_backoff_without_retry_flood(self):
  with tempfile.TemporaryDirectory() as d:
   r=run(CONFIG,d,True,client([error(429,{'Retry-After':'120'})]));self.assertEqual(r['events'][0]['retryAfterSeconds'],120);self.assertEqual(run(CONFIG,d,True,client([]))['requests'],0)
 def test_timeout_preserves_last_good_and_atomic_failure(self):
  with tempfile.TemporaryDirectory() as d:
   run(CONFIG,d,True,client([error(404),Response(b'<html>ok</html>')]))
   p=pathlib.Path(d)/'state.json';s=json.loads(p.read_text());next(iter(s['sources'].values()))['nextEligibleAt']=0;atomic(p,s);before=next(iter(s['candidates'].values()))['contentHash'];r=run(CONFIG,d,True,client([TimeoutError()]));self.assertEqual(r['events'][0]['status'],'failed');self.assertEqual(next(iter(json.loads(p.read_text())['candidates'].values()))['contentHash'],before)
   text=p.read_text()
   with patch('collect.os.replace',side_effect=OSError('mock crash')):
    with self.assertRaises(OSError):atomic(p,{'bad':1})
   self.assertEqual(p.read_text(),text);self.assertFalse(list(pathlib.Path(d).glob('*.tmp-*')))
 def test_lock_prevents_concurrent_run(self):
  with tempfile.TemporaryDirectory() as d:
   with locked(pathlib.Path(d)/'.collector.lock'):
    with self.assertRaises(RuntimeError):run(CONFIG,d)
 def test_limit_size_and_redirect_host_or_downgrade(self):
  with self.assertRaises(ValueError):client([Response(b'x'*50)],{**CONFIG,'maxBodyBytes':10}).get(URL)
  with self.assertRaises(RuntimeError):client([],{**CONFIG,'maxRequests':0}).get(URL)
  import urllib.request
  redirect=Redirect({'gaokao.neea.edu.cn'})
  for url in ['https://evil.example/x','http://gaokao.neea.edu.cn/unsafe']:
   with self.assertRaises(ValueError):redirect.redirect_request(urllib.request.Request(URL),None,302,'',{},url)
 def test_normalization_and_credential_rejection(self):
  self.assertEqual(fingerprint(' Ａ ＝ １\n'),fingerprint('A=1'))
  for url in [URL+'?api_key=secret','https://u:p@gaokao.neea.edu.cn/x','file:///tmp/foo','https://127.0.0.1/x']:
   with self.assertRaises(ValueError):canonical(url,{'gaokao.neea.edu.cn'})
  self.assertEqual(retry_seconds('1'),60);self.assertEqual(retry_seconds('n/a'),3600)
 def test_review_gates_schema_rights_answers_and_stage_isolation(self):
  valid=candidate();self.assertEqual(validate(valid),[])
  for change in [{'originalVerified':False},{'answerVerified':False},{'answerSource':None},{'rights':{}},{'rights':'unknown'},{'steps':'not-list'},{'subject':'fake'},{'pageUrl':'file:///x'},{'pageUrl':URL+'?key=secret'}]:self.assertTrue(validate({**valid,**change}),change)
  with self.assertRaises(ValueError):stage(valid,ROOT.parent/'data'/'must-not-write.json')
  with tempfile.TemporaryDirectory(dir=ROOT/'reviewed',prefix='.test-') as d:
   p=pathlib.Path(d)/'item.json';r=stage(valid,p);self.assertEqual(r['reviewStatus'],'ready-for-manual-import');self.assertTrue(p.exists());self.assertEqual(r['normalizedQuestionHash'],fingerprint(valid['stem']))
if __name__=='__main__':unittest.main(verbosity=2)
