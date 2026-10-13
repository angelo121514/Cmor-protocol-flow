import io,unittest
from PIL import Image,PngImagePlugin
from inspector import canonicalize,InvalidImage
class DecodeTests(unittest.TestCase):
 def encoded(self,format="PNG",**kwargs):
  stream=io.BytesIO();Image.new("RGB",(2,2),(10,20,30)).save(stream,format=format,**kwargs);return stream.getvalue()
 def test_real_formats_decode_to_canonical_png(self):
  for fmt,mime in [("PNG","image/png"),("JPEG","image/jpeg"),("WEBP","image/webp")]:
   out,width,height=canonicalize(self.encoded(fmt),mime);self.assertEqual((width,height),(2,2))
   with Image.open(io.BytesIO(out)) as image:image.verify();self.assertEqual(image.format,"PNG")
 def test_rejects_truncated_headers_and_spoofed_mime(self):
  for value,mime in [(self.encoded()[:35],"image/png"),(self.encoded(),"image/jpeg"),(b"\x89PNG\r\n\x1a\n"+bytes(40),"image/png")]:
   with self.assertRaises(InvalidImage):canonicalize(value,mime)
 def test_strips_metadata_and_trailing_payload(self):
  meta=PngImagePlugin.PngInfo();meta.add_text("private","Synthetic secret metadata")
  original=self.encoded(pnginfo=meta)+b"UNTRUSTED_TRAILING_PAYLOAD";clean,_,_=canonicalize(original,"image/png")
  self.assertNotIn(b"Synthetic secret",clean);self.assertNotIn(b"UNTRUSTED_TRAILING_PAYLOAD",clean)
 def test_bounds_dimensions(self):
  data=io.BytesIO();Image.new("RGB",(4097,1)).save(data,format="PNG")
  with self.assertRaises(InvalidImage):canonicalize(data.getvalue(),"image/png")
 def test_preserves_display_orientation_without_retaining_exif(self):
  data=io.BytesIO();exif=Image.Exif();exif[274]=6;Image.new('RGB',(2,3),'white').save(data,format='JPEG',exif=exif)
  clean,width,height=canonicalize(data.getvalue(),'image/jpeg');self.assertEqual((width,height),(3,2))
  with Image.open(io.BytesIO(clean)) as image:self.assertFalse(image.getexif())
if __name__=="__main__":unittest.main()
