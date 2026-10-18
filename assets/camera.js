export function createCamera({onCapture,onNative,getRemaining=()=>null}){
 const dialog=document.createElement('dialog');dialog.className='film-camera';dialog.setAttribute('aria-label','Wedding disposable camera');
 dialog.innerHTML=`<div class="camera-top"><button class="camera-close" aria-label="Close camera">×</button><span>Ahmed &amp; Donia</span><button class="camera-flip" aria-label="Switch front and back cameras">↻</button></div><div class="camera-viewport"><video playsinline autoplay muted></video><div class="camera-grid"></div><div class="camera-flash"></div><p class="camera-countdown" hidden></p><div class="camera-offline" hidden><p>Your phone's camera is waiting.</p><span>Allow camera access, or use your phone's camera below.</span><button>Use phone camera</button></div><span class="camera-frame-number"></span><span class="camera-record-time" hidden>● 00:00</span></div><p class="camera-message" role="status">One little moment, yours to keep.</p><div class="camera-modes"><button data-mode="photo" class="active">Photo</button><button data-mode="video">Film</button></div><div class="camera-controls"><button class="camera-timer" aria-label="Toggle three-second timer">3s</button><button class="camera-shutter" aria-label="Take photograph"><span></span></button><button class="camera-tone" aria-label="Toggle warm film colour">Warm</button></div><p class="camera-footnote">Your view. Our day.</p>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),video=$('video');let stream=null,facing='environment',mode='photo',warm=false,timer=false,recorder=null,chunks=[],recordStart=0,interval=null,watchdog=null,previousOverflow='',previousFocus=null,generation=0;
 const supported=()=>navigator.mediaDevices?.getUserMedia;
 function count(){const left=getRemaining();$('.camera-frame-number').textContent=left===null?'A & D · 20.11.26':String(left).padStart(2,'0')+' photographs left';$('.camera-shutter').disabled=mode==='photo'&&left===0;}
 function stopTracks(){if(stream)for(const track of stream.getTracks())track.stop();stream=null;video.srcObject=null;}
 async function start(){
  $('.camera-tone').disabled=mode==='video';video.style.filter=mode==='photo'&&warm?'sepia(.16) saturate(.9) contrast(1.03)':'';
  const myGeneration=++generation;stopTracks();$('.camera-offline').hidden=true;$('.camera-message').textContent='Opening your camera…';count();
  if(!supported()){fallback();return;}
  try{
   let next;
   try{next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1080},height:{ideal:1440},aspectRatio:{ideal:.75}},audio:mode==='video'});}
   catch(e){if(mode==='video'){next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:false});$('.camera-message').textContent='Filming without sound. Allow microphone access for audio.';}else throw e;}
   if(!dialog.open||myGeneration!==generation){next.getTracks().forEach(t=>t.stop());return;}
   stream=next;video.srcObject=stream;video.style.transform=facing==='user'?'scaleX(-1)':'';await video.play();
   if(mode==='photo')$('.camera-message').textContent=getRemaining()===0?'Your roll is full. Thank you for capturing our day.':'One little moment, yours to keep.';
   else if(stream.getAudioTracks().length)$('.camera-message').textContent='Little films, up to 60 seconds.';
  }catch{if(dialog.open&&myGeneration===generation)fallback();}
 }
 function fallback(){$('.camera-offline').hidden=false;$('.camera-message').textContent='You can still capture with your phone’s camera.';$('.camera-shutter').disabled=true;}
 function close(){if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}clearInterval(interval);clearTimeout(watchdog);generation++;stopTracks();dialog.close();document.body.style.overflow=previousOverflow;previousFocus?.focus?.();$('.camera-shutter').classList.remove('recording');$('.camera-record-time').hidden=true;$('.camera-countdown').hidden=true;}
 async function take(){
  if(!stream||$('.camera-shutter').disabled)return;
  if(mode==='video'){if(recorder?.state==='recording'){recorder.stop();return;}await record();return;}
  $('.camera-shutter').disabled=true;
  try{
   if(timer)for(let i=3;i>0;i--){if(!dialog.open)return;$('.camera-countdown').textContent=i;$('.camera-countdown').hidden=false;await new Promise(r=>setTimeout(r,1000));}
   $('.camera-countdown').hidden=true;if(!dialog.open||!video.videoWidth)return;
   const canvas=document.createElement('canvas');const ratio=.75;let sw=video.videoWidth,sh=video.videoHeight,sx=0,sy=0;
   if(sw/sh>ratio){const cropped=sh*ratio;sx=(sw-cropped)/2;sw=cropped;}else{const cropped=sw/ratio;sy=(sh-cropped)/2;sh=cropped;}
   canvas.width=Math.min(1800,Math.round(sw));canvas.height=Math.round(canvas.width/ratio);const context=canvas.getContext('2d');
   if(facing==='user'){context.translate(canvas.width,0);context.scale(-1,1);}if(warm)context.filter='sepia(.16) saturate(.9) contrast(1.03)';context.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
   $('.camera-flash').classList.add('flash');setTimeout(()=>$('.camera-flash').classList.remove('flash'),180);
   const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.92));if(!blob)throw new Error('The photograph could not be captured.');
   const file=new File([blob],'our-day-'+Date.now()+'.jpg',{type:'image/jpeg'});close();await onCapture(file);
  }catch(e){$('.camera-message').textContent=e.message;}finally{$('.camera-shutter').disabled=false;}
 }
 async function record(){
  if(!window.MediaRecorder){close();onNative('video');return;}
  const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  try{
   recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:2500000,audioBitsPerSecond:96000});chunks=[];recordStart=Date.now();let size=0;
   recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;if(size>42*1024*1024&&recorder.state==='recording')recorder.stop();}};
   recorder.onstop=async()=>{
    clearInterval(interval);clearTimeout(watchdog);const type=recorder.mimeType.startsWith('video/mp4')?'video/mp4':'video/webm';const file=new File(chunks,'our-day-'+Date.now()+(type==='video/mp4'?'.mp4':'.webm'),{type});
    file.recordedDuration=Math.min(60,(Date.now()-recordStart)/1000);close();if(file.size)await onCapture(file);
   };
   recorder.onerror=()=>{$('.camera-message').textContent='Recording stopped. Try your phone camera instead.';};
   recorder.start(500);$('.camera-shutter').classList.add('recording');$('.camera-record-time').hidden=false;$('.camera-flip').disabled=true;
   interval=setInterval(()=>{const s=Math.floor((Date.now()-recordStart)/1000);$('.camera-record-time').textContent='● 00:'+String(s).padStart(2,'0');},250);
   watchdog=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},59000);
  }catch{close();onNative('video');}
 }
 async function open(nextMode='photo'){
  mode=nextMode;previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();$('.camera-flip').disabled=false;
  for(const b of dialog.querySelectorAll('[data-mode]'))b.classList.toggle('active',b.dataset.mode===mode);$('.camera-shutter').setAttribute('aria-label',mode==='photo'?'Take photograph':'Start or stop film');$('.camera-shutter').classList.toggle('video-mode',mode==='video');await start();
 }
 $('.camera-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});$('.camera-shutter').onclick=take;
 $('.camera-flip').onclick=()=>{if(recorder?.state==='recording')return;facing=facing==='environment'?'user':'environment';start();};
 $('.camera-offline button').onclick=()=>{const nativeMode=mode;close();onNative(nativeMode);};
 $('.camera-tone').onclick=()=>{warm=!warm;$('.camera-tone').classList.toggle('active',warm);video.style.filter=warm?'sepia(.16) saturate(.9) contrast(1.03)':'';};
 $('.camera-timer').onclick=()=>{timer=!timer;$('.camera-timer').classList.toggle('active',timer);};
 for(const button of dialog.querySelectorAll('[data-mode]'))button.onclick=()=>{if(recorder?.state==='recording')return;mode=button.dataset.mode;for(const b of dialog.querySelectorAll('[data-mode]'))b.classList.toggle('active',b===button);$('.camera-shutter').classList.toggle('video-mode',mode==='video');$('.camera-shutter').setAttribute('aria-label',mode==='photo'?'Take photograph':'Start or stop film');start();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open&&recorder?.state==='recording')recorder.stop();});
 window.addEventListener('pagehide',stopTracks);
 return {open,close,updateCount:count};
}
