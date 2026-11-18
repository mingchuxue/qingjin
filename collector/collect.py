#!/usr/bin/env python3
"""Finite metadata-only discovery. Network opt-in; never writes app production data."""
import argparse, contextlib, datetime as dt, email.utils, fcntl, hashlib, html.parser, json, os, pathlib, re, time, unicodedata
import urllib.error, urllib.parse, urllib.request, urllib.robotparser
ROOT=pathlib.Path(__file__).resolve().parent
AGENT='QingjinResourceCollector/1.0'
def now():return dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).isoformat(timespec='seconds')
def canonical(url,hosts):
 p=urllib.parse.urlsplit(url)
 if p.scheme not in ('http','https') or p.username or p.password or p.hostname not in hosts or p.port not in (None,80,443):raise ValueError('URL不在公开来源白名单')
 if any(k.lower().startswith(('token','key','auth','session','api_key')) for k,v in urllib.parse.parse_qsl(p.query)):raise ValueError('来源URL不得含认证参数')
 query=urllib.parse.urlencode(sorted((k,v) for k,v in urllib.parse.parse_qsl(p.query) if not k.lower().startswith(('utm_','token','key','auth','session'))))
 return urllib.parse.urlunsplit((p.scheme,p.netloc.lower(),p.path or '/',query,''))
def fingerprint(text):return hashlib.sha256(re.sub(r'\s+','',unicodedata.normalize('NFKC',text)).encode()).hexdigest()
def atomic(path,obj):
 path=pathlib.Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 tmp=path.with_name(path.name+'.tmp-'+str(os.getpid()))
 try:
  with tmp.open('w',encoding='utf-8') as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
  os.replace(tmp,path)
 finally:
  if tmp.exists():tmp.unlink()
@contextlib.contextmanager
def locked(path):
 path.parent.mkdir(parents=True,exist_ok=True)
 with path.open('a') as f:
  try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
  except BlockingIOError:raise RuntimeError('已有收集进程运行，本次不并发')
  try:yield
  finally:fcntl.flock(f,fcntl.LOCK_UN)
class Redirect(urllib.request.HTTPRedirectHandler):
 def __init__(self,hosts):self.hosts=hosts
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  old=urllib.parse.urlsplit(req.full_url);new=urllib.parse.urlsplit(newurl)
  canonical(newurl,{old.hostname})
  if old.scheme=='https' and new.scheme!='https':raise ValueError('禁止HTTPS降级重定向')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
class Page(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.title=[];self.inTitle=False;self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag=='title':self.inTitle=True
  if tag=='a':
   for k,v in attrs:
    if k=='href' and v:self.links.append(v)
 def handle_endtag(self,tag):
  if tag=='title':self.inTitle=False
 def handle_data(self,data):
  if self.inTitle:self.title.append(data)
def retry_seconds(value,clock=time.time):
 try:return min(86400,max(60,int(value)))
 except (ValueError,TypeError):
  try:return min(86400,max(60,int(email.utils.parsedate_to_datetime(value).timestamp()-clock())))
  except (ValueError,TypeError,AttributeError):return 3600
class Client:
 def __init__(self,config,opener=None,pause=time.sleep):
  self.config=config;self.hosts={s['host'] for s in config['sources']};self.opener=opener or urllib.request.build_opener(Redirect(self.hosts));self.pause=pause;self.calls=0;self.last=0;self.events=[]
 def get(self,url):
  url=canonical(url,self.hosts)
  if self.calls>=self.config['maxRequests']:raise RuntimeError('已到单轮请求上限')
  wait=self.config['minIntervalSeconds']-(time.monotonic()-self.last)
  if wait>0:self.pause(wait)
  self.calls+=1;self.last=time.monotonic()
  req=urllib.request.Request(url,headers={'User-Agent':AGENT,'Accept':'text/html,text/plain,application/pdf;q=0.5','Accept-Encoding':'identity'})
  with self.opener.open(req,timeout=self.config['timeoutSeconds']) as response:
   canonical(response.geturl(),self.hosts)
   body=response.read(self.config['maxBodyBytes']+1)
   if len(body)>self.config['maxBodyBytes']:raise ValueError('资源超过大小上限')
   return body,response.headers.get('Content-Type',''),response.geturl()
 def allowed(self,url):
  p=urllib.parse.urlsplit(url);robots=urllib.parse.urlunsplit((p.scheme,p.netloc,'/robots.txt','',''))
  try:
   raw,typ,_=self.get(robots)
   text=raw.decode('utf-8','replace')
   if '<html' in text.lower() or not re.search(r'^\s*(user-agent|disallow|allow)\s*:',text,re.M|re.I):return False,'robots无法解析，保守跳过'
   parser=urllib.robotparser.RobotFileParser();parser.parse(text.splitlines())
   crawl=parser.crawl_delay(AGENT) or parser.crawl_delay('*')
   if crawl and crawl>30:return False,'robots间隔超过单轮等待上限，本轮保守跳过（非网站拒绝）'
   if crawl and crawl>self.config['minIntervalSeconds']:self.config={**self.config,'minIntervalSeconds':crawl}
   return parser.can_fetch(AGENT,url),'robots规则'
  except urllib.error.HTTPError as e:
   if e.code in (404,410):return True,'robots不存在（404/410），仍仅索引元数据'
   raise

def run(config,state_dir,network=False,client=None):
 state_dir=pathlib.Path(state_dir)
 with locked(state_dir/'.collector.lock'):
  p=state_dir/'state.json';state=json.loads(p.read_text()) if p.exists() else {'schemaVersion':1,'sources':{},'candidates':{}}
  report={'startedAt':now(),'network':network,'requests':0,'events':[],'candidateCount':0,'contentPolicy':'只保留元数据/链接/哈希；不保存网页正文或PDF，不改生产库'}
  c=client or Client(config)
  for source in config['sources']:
   url=canonical(source['url'],{source['host']});key=hashlib.sha256(url.encode()).hexdigest()[:20]
   candidate=state['candidates'].setdefault(key,{**source,'id':key,'pageUrl':url,'discoveredAt':now(),'lastSeenAt':now(),'reviewStatus':'candidate','originalVerified':False,'answerVerified':False,'contentHash':None,'answerSource':None,'questionNumber':None})
   for field in ('pdfUrl','pdfVerification'):
    if source.get(field):candidate[field]=source[field]
   prior=state['sources'].get(source['id'],{})
   if not network:report['events'].append({'sourceId':source['id'],'status':'offline','message':'未启用网络，保留已有状态'});continue
   if prior.get('nextEligibleAt',0)>time.time():report['events'].append({'sourceId':source['id'],'status':'deferred','message':'退避窗口内，未发请求'});continue
   event={'sourceId':source['id'],'at':now()}
   try:
    allowed,rule=c.allowed(url)
    if not allowed:event.update(status='robots-denied',message=rule)
    else:
     body,typ,final=c.get(url);digest=hashlib.sha256(body).hexdigest();event.update(status='fetched',httpStatus=200,bytes=len(body),contentHash=digest,robots=rule)
     prior_hashes={v.get('contentHash') for k,v in state['candidates'].items() if k!=key};duplicate=next((k for k,v in state['candidates'].items() if k!=key and v.get('contentHash')==digest),None)
     if duplicate:candidate.update(duplicateOf=duplicate,reviewStatus='duplicate')
     elif candidate.get('reviewStatus')=='duplicate':candidate.pop('duplicateOf',None);candidate['reviewStatus']='candidate'
     candidate.update(retrievedAt=now(),lastSeenAt=now(),contentHash=digest,duplicateContent=digest in prior_hashes,fetchStatus='fetched',mime=typ)
     if 'html' in typ:
      charset=re.search(r'charset=([^;\s]+)',typ,re.I)
      try:text=body.decode(charset.group(1) if charset else 'utf-8','replace')
      except LookupError:text=body.decode('utf-8','replace')
      page=Page();page.feed(text);candidate['observedTitle']=' '.join(page.title).strip()[:300]
      # Link-only discovery is bounded and same-host; links are not fetched this run.
      links=[]
      for link in page.links:
       if len(links)>=8:break
       try:v=canonical(urllib.parse.urljoin(final,link),{source['host']})
       except ValueError:continue
       if source.get('discoveryPathPattern') and not re.search(source['discoveryPathPattern'],v,re.I):continue
       if v==url or re.search(r'login|signup|logout|pay|search|javascript:',v,re.I):continue
       if not re.search(r'\.(?:s?html?|pdf)(?:\?|$)',v,re.I):continue
       if v in links:continue
       links.append(v);lk=hashlib.sha256(v.encode()).hexdigest()[:20]
       state['candidates'].setdefault(lk,{'id':lk,'name':'待审公开资源链接','pageUrl':v,'sourceType':source['sourceType'],'resourceType':'未核对链接','discoveredFrom':url,'discoveredAt':now(),'year':None,'region':None,'subject':None,'questionNumber':None,'rights':{'question':'unknown','explanation':'unknown'},'answerSource':None,'reviewStatus':'candidate','originalVerified':False,'answerVerified':False,'contentHash':None,'fetchStatus':'not-fetched'})
      event['discoveredLinks']=len(links)
     prior['failures']=0;prior['nextEligibleAt']=time.time()+86400
    if event['status']=='robots-denied':prior['nextEligibleAt']=time.time()+86400
    prior.update(lastAttemptAt=now(),lastStatus=event['status'])
   except Exception as e:
    status=getattr(e,'code',None);backoff=retry_seconds(e.headers.get('Retry-After')) if isinstance(e,urllib.error.HTTPError) and status in (429,503) else min(86400,3600*(2**min(prior.get('failures',0),4)))
    event.update(status='failed',httpStatus=status,errorType=type(e).__name__,message='网络/策略失败，保留最后成功内容；详见错误类型',retryAfterSeconds=backoff)
    prior.update(nextEligibleAt=time.time()+backoff,failures=prior.get('failures',0)+1,lastAttemptAt=now(),lastStatus='failed')
   state['sources'][source['id']]=prior;report['events'].append(event)
   atomic(p,state) # each completed source checkpoint survives later failure
  report.update(finishedAt=now(),requests=c.calls,candidateCount=len(state['candidates']),uniqueCandidateCount=sum(v.get('reviewStatus')!='duplicate' for v in state['candidates'].values()),fetchedCandidateCount=sum(bool(x.get('retrievedAt')) for x in state['candidates'].values()))
  atomic(p,state);atomic(state_dir/'last-run.json',report)
  return report
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--network',action='store_true');ap.add_argument('--config',type=pathlib.Path,default=ROOT/'sources.json');ap.add_argument('--state-dir',type=pathlib.Path,default=ROOT/'state');args=ap.parse_args()
 print(json.dumps(run(json.loads(args.config.read_text()),args.state_dir,args.network),ensure_ascii=False,indent=2))
