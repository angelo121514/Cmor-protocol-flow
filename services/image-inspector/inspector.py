"""Private image decoding/canonicalization and ClamAV gateway. No user files persist."""
import hashlib,hmac,io,json,multiprocessing,os,socket,struct,time,warnings
from datetime import datetime,timezone
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from threading import BoundedSemaphore
from PIL import Image,ImageFile,ImageOps,UnidentifiedImageError

MAX_BYTES=2*1024*1024
MAX_PIXELS=16_000_000
Image.MAX_IMAGE_PIXELS=MAX_PIXELS
ImageFile.LOAD_TRUNCATED_IMAGES=False
FORMATS={"PNG":"image/png","JPEG":"image/jpeg","WEBP":"image/webp"}
class InvalidImage(Exception):pass
class UnsafeImage(Exception):pass
class ScannerUnavailable(Exception):pass

def canonicalize(data,declared):
 if not 0<len(data)<=MAX_BYTES:raise InvalidImage()
 with warnings.catch_warnings():
  warnings.simplefilter("error",Image.DecompressionBombWarning)
  try:
   with Image.open(io.BytesIO(data)) as probe:
    if probe.format not in FORMATS or FORMATS[probe.format]!=declared:raise InvalidImage()
    if not 0<probe.width<=4096 or not 0<probe.height<=4096 or probe.width*probe.height>MAX_PIXELS or getattr(probe,"n_frames",1)!=1:raise InvalidImage()
    probe.verify()
   with Image.open(io.BytesIO(data)) as image:
    image.load() # Decode actual pixels, not only the header.
    image=ImageOps.exif_transpose(image)
    mode="RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB"
    clean=Image.new(mode,image.size);clean.paste(image.convert(mode))
    output=io.BytesIO();clean.save(output,format="PNG",optimize=False)
    encoded=output.getvalue()
    if len(encoded)>MAX_BYTES:raise InvalidImage()
    return encoded,clean.width,clean.height
  except (UnidentifiedImageError,OSError,SyntaxError,ValueError,Image.DecompressionBombWarning,Image.DecompressionBombError) as error:raise InvalidImage() from error

def _decode_worker(pipe,data,declared):
 try:
  if os.name!="nt":
   import resource
   resource.setrlimit(resource.RLIMIT_AS,(384*1024*1024,384*1024*1024))
  pipe.send((True,canonicalize(data,declared)))
 except Exception:pipe.send((False,None))
 finally:pipe.close()

def decode_bounded(data,declared):
 parent,child=multiprocessing.Pipe(duplex=False)
 worker=multiprocessing.Process(target=_decode_worker,args=(child,data,declared),daemon=True)
 try:
  worker.start();child.close()
  if not parent.poll(8):raise InvalidImage()
  ok,result=parent.recv()
  if not ok:raise InvalidImage()
  return result
 except (EOFError,MemoryError) as error:raise InvalidImage() from error
 finally:
  parent.close();child.close()
  if worker.pid:
   worker.join(timeout=0.2)
   if worker.is_alive():worker.kill();worker.join(timeout=1)

class ClamAV:
 def __init__(self,host,port):self.host=host;self.port=port
 def _call(self,command,data=None):
  try:
   with socket.create_connection((self.host,self.port),timeout=8) as connection:
    connection.settimeout(8);connection.sendall(b"z"+command+b"\0")
    if data is not None:connection.sendall(struct.pack("!I",len(data))+data+bytes(4))
    result=b""
    while not result.endswith(b"\0") and len(result)<4096:
     part=connection.recv(4096)
     if not part:break
     result+=part
    return result.decode("ascii",errors="strict").strip("\0\r\n ")
  except (OSError,UnicodeError) as error:raise ScannerUnavailable() from error
 def version(self):
  result=self._call(b"VERSION")
  try:
   stamp=result.rsplit("/",1)[1]
   built=datetime.strptime(stamp,"%a %b %d %H:%M:%S %Y").replace(tzinfo=timezone.utc)
   age=(datetime.now(timezone.utc)-built).total_seconds()
   if not -86400<=age<=7*86400:raise ScannerUnavailable()
  except (IndexError,ValueError) as error:raise ScannerUnavailable() from error
  return result
 def scan(self,data):
  result=self._call(b"INSTREAM",data)
  if result.endswith(" FOUND"):raise UnsafeImage()
  if result!="stream: OK":raise ScannerUnavailable()

SLOTS=BoundedSemaphore(2)
class Handler(BaseHTTPRequestHandler):
 server_version="CMORImageInspector"
 def log_message(self,*args):pass # No payload, URLs, credentials or scanner detection details in logs.
 def reply(self,status,data):
  encoded=json.dumps(data).encode();self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(encoded)));self.end_headers();self.wfile.write(encoded)
 def do_GET(self):
  if self.path!="/health":return self.reply(404,{"error":"not_found"})
  try:
   if len(os.environ.get("IMAGE_INSPECTION_SECRET",""))<32:raise ScannerUnavailable()
   self.server.scanner.version();return self.reply(200,{"ready":True})
  except ScannerUnavailable:return self.reply(503,{"ready":False})
 def do_POST(self):
  if self.path!="/inspect":return self.reply(404,{"error":"not_found"})
  secret=os.environ.get("IMAGE_INSPECTION_SECRET","")
  if len(secret)<32:return self.reply(503,{"error":"inspection_unconfigured"})
  if not hmac.compare_digest(self.headers.get("Authorization",""),"Bearer "+secret):return self.reply(403,{"error":"forbidden"})
  if not SLOTS.acquire(blocking=False):return self.reply(503,{"error":"inspection_busy"})
  try:
   self.connection.settimeout(10)
   if self.headers.get("Transfer-Encoding"):return self.reply(400,{"error":"invalid_length"})
   try:length=int(self.headers.get("Content-Length","0"))
   except ValueError:return self.reply(400,{"error":"invalid_length"})
   if not 0<length<=MAX_BYTES:return self.reply(413,{"error":"invalid_size"})
   data=self.rfile.read(length)
   if len(data)!=length:return self.reply(400,{"error":"invalid_length"})
   version=self.server.scanner.version();self.server.scanner.scan(data)
   canonical,width,height=decode_bounded(data,self.headers.get("X-Image-Type",""))
   self.server.scanner.scan(canonical)
   self.send_response(200);self.send_header("Content-Type","image/png");self.send_header("Content-Length",str(len(canonical)))
   self.send_header("X-Input-SHA256",hashlib.sha256(data).hexdigest());self.send_header("X-Image-Width",str(width));self.send_header("X-Image-Height",str(height));self.send_header("X-Scan-Engine",version);self.end_headers();self.wfile.write(canonical)
  except UnsafeImage:self.reply(400,{"error":"unsafe_image_content"})
  except InvalidImage:self.reply(400,{"error":"invalid_image_content"})
  except (ScannerUnavailable,TimeoutError,OSError):self.reply(503,{"error":"image_inspection_unavailable"})
  finally:SLOTS.release()

if __name__=="__main__":
 multiprocessing.freeze_support()
 server=ThreadingHTTPServer((os.environ.get("IMAGE_INSPECTION_BIND","127.0.0.1"),int(os.environ.get("IMAGE_INSPECTION_PORT","58081"))),Handler)
 server.scanner=ClamAV(os.environ.get("CLAMAV_HOST","127.0.0.1"),int(os.environ.get("CLAMAV_PORT","56310")))
 server.serve_forever()
