import {execFileSync} from 'node:child_process';
const image='clamav/clamav@sha256:ebec5bc138401b36ae987caa1a3fa3c3b2a21ed3d51f0bfa5852825e663e67b0';
const name='cmor-flow-open-source-image-validation-clamav',volume='cmor-flow-open-source-image-validation-db',network='cmor-flow-open-source-image-validation';
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:600000});
function existing(kind,id){try{return JSON.parse(docker([kind,'inspect',id]))[0];}catch{return null;}}
function owned(kind,id){const found=existing(kind,id);if(found&&(found.Config?.Labels??found.Labels)?.['cmor.validation']!=='image-inspector')throw new Error(`Refusing to modify unowned ${kind}: ${id}`);return found;}
if(!existing('image',image))throw new Error(`Install the pinned software dependency first: docker pull ${image}`);
if(!owned('volume',volume))docker(['volume','create','--label','cmor.validation=image-inspector',volume]);
if(!owned('network',network))docker(['network','create','--internal','--label','cmor.validation=image-inspector',network]);
const current=owned('container',name);
if(process.argv.includes('--update')){
 if(current?.State.Running)throw new Error('Stop this validation scanner before updating its signature volume.');
 // Explicit dependency update only; test runs themselves have no external destination.
 docker(['run','--rm','--name','cmor-flow-open-source-image-signature-update','--label','cmor.validation=image-inspector','--memory','768m','-v',`${volume}:/var/lib/clamav`,image,'freshclam','--foreground','--stdout']);
}
if(current){if(!current.State.Running)docker(['start',name]);}
else docker(['run','-d','--name',name,'--label','cmor.validation=image-inspector','--network','bridge','-p','127.0.0.1:56310:3310','--memory','3g','--cpus','2','-e','CLAMAV_NO_FRESHCLAMD=true','-e','CLAMD_CONF_MaxThreads=2','-v',`${volume}:/var/lib/clamav`,image]);
console.log('Owned local scanner started; validation requires fresh signatures and a real EICAR verdict.');
