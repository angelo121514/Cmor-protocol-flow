"""Real local ClamAV prerequisite. EICAR stays in memory; no infected files are written."""
import os,unittest,threading,urllib.request,urllib.error,json
from inspector import ClamAV,UnsafeImage,ScannerUnavailable,Handler,ThreadingHTTPServer

class ScannerTests(unittest.TestCase):
 def test_real_engine_clean_and_eicar(self):
  scanner=ClamAV('127.0.0.1',int(os.environ.get('CLAMAV_PORT','56310')))
  self.assertTrue(scanner.version().startswith('ClamAV '))
  scanner.scan(b'CMOR synthetic clean fixture')
  sample=b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$'+b'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
  with self.assertRaises(UnsafeImage):scanner.scan(sample)
 def test_unavailable_engine_rejects(self):
  with self.assertRaises(ScannerUnavailable):ClamAV('127.0.0.1',1).scan(b'fixture')
 def test_http_rejects_real_signature_before_decoding(self):
  previous=os.environ.get('IMAGE_INSPECTION_SECRET');secret='local-synthetic-inspection-test-'+'x'*32;os.environ['IMAGE_INSPECTION_SECRET']=secret
  server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.scanner=ClamAV('127.0.0.1',int(os.environ.get('CLAMAV_PORT','56310')))
  thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   sample=b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$'+b'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
   request=urllib.request.Request('http://127.0.0.1:'+str(server.server_port)+'/inspect',data=sample,headers={'Authorization':'Bearer '+secret,'X-Image-Type':'image/png'})
   with self.assertRaises(urllib.error.HTTPError) as failed:urllib.request.urlopen(request,timeout=15)
   self.assertEqual(failed.exception.code,400);self.assertEqual(json.load(failed.exception)['error'],'unsafe_image_content')
  finally:
   server.shutdown();server.server_close();thread.join(timeout=2)
   if previous is None:os.environ.pop('IMAGE_INSPECTION_SECRET',None)
   else:os.environ['IMAGE_INSPECTION_SECRET']=previous

if __name__=='__main__':unittest.main()
