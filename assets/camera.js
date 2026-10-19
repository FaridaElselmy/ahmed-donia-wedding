export function createCamera({onCapture,onNative,getRemaining=()=>null}){
 const dialog=document.createElement('dialog');dialog.className='film-camera';dialog.setAttribute('aria-label','Wedding disposable camera');
 dialog.innerHTML=`<div class="camera-top"><button class="camera-close" aria-label="Close camera">×</button><span>Ahmed &amp; Donia</span><button class="camera-flip" aria-label="Switch front and back cameras">↻</button></div><div class="camera-viewport"><video playsinline autoplay muted></video><div class="camera-grid"></div><div class="camera-flash"></div><p class="camera-countdown" hidden></p><div class="camera-offline" hidden><p>Your phone's camera is waiting.</p><span>Allow camera access, or use your phone's camera below.</span><button>Use phone camera</button></div><span class="camera-frame-number"></span><span class="camera-record-time" hidden>● 00:00</span></div><div class="camera-zoom-controls" aria-label="Camera zoom"><button type="button" class="camera-zoom-out" aria-label="Zoom out">−</button><output class="camera-zoom-label" aria-live="off">1.0×</output><button type="button" class="camera-zoom-in" aria-label="Zoom in">+</button></div><p class="camera-message" role="status">One little moment, yours to keep.</p><div class="camera-modes"><button data-mode="photo" class="active">Photo</button><button data-mode="video">Film</button></div><div class="camera-controls"><button class="camera-timer" aria-label="Toggle three-second timer">3s</button><button class="camera-shutter" aria-label="Take photograph"><span></span></button><button class="camera-tone" aria-label="Toggle warm film colour">Warm</button></div><p class="camera-footnote">Your view. Our day.</p>`;
 // Zoom controls and pinch gestures apply ONLY to the camera preview, not the page.
 const zoomStyle=document.createElement('style');
 zoomStyle.textContent=`
 .film-camera .camera-viewport{touch-action:none;user-select:none;-webkit-user-select:none}
 .film-camera .camera-zoom-controls{display:flex;align-items:center;justify-content:center;gap:18px;padding:9px 0 2px;color:#e8d6ad}
 .film-camera .camera-zoom-controls button{border:1px solid #786848;border-radius:50%;width:39px;height:39px;font:23px/1 system-ui,sans-serif;color:#e8d6ad;touch-action:manipulation}
 .film-camera .camera-zoom-controls output{font:600 15px/1 system-ui,sans-serif;min-width:49px;text-align:center}
 .film-camera .camera-viewport video{transform-origin:center center;will-change:transform}
 `;
 document.head.append(zoomStyle);
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),video=$('video');let stream=null,facing='environment',mode='photo',warm=false,timer=false,recorder=null,chunks=[],recordStart=0,interval=null,watchdog=null,previousOverflow='',previousFocus=null,generation=0,zoom=1,zoomMax=3,hardwareZoom=false,videoCanvasStop=null,digitalRecording=false;
 const supported=()=>navigator.mediaDevices?.getUserMedia;
 function count(){const left=getRemaining();$('.camera-frame-number').textContent=left===null?'A & D · 20.11.26':String(left).padStart(2,'0')+' photographs left';$('.camera-shutter').disabled=mode==='photo'&&left===0;}
 const viewport=$('.camera-viewport');
 const getTrack=()=>stream?.getVideoTracks()?.[0];
 const hardwareRange=()=>{try{return getTrack()?.getCapabilities?.()?.zoom}catch{return null}};
 function paintZoom(){
  $('.camera-zoom-label').textContent=zoom.toFixed(1)+'×';
  $('.camera-zoom-out').disabled=zoom<=1.01;
  $('.camera-zoom-in').disabled=zoom>=zoomMax-.01;
  video.style.transform=(facing==='user'?'scaleX(-1) ':'')+(!hardwareZoom?'scale('+zoom.toFixed(3)+')':'');
 }
 async function setZoom(value){
  if(recorder?.state==='recording' && !hardwareZoom && !digitalRecording){
   $('.camera-message').textContent='For zoom while filming, use your phone camera.';return;
  }
  zoom=Math.min(zoomMax,Math.max(1,Math.round(value*10)/10));
  if(hardwareZoom){
   try{await getTrack().applyConstraints({advanced:[{zoom}]});}
   catch{hardwareZoom=false;zoomMax=3;zoom=Math.min(zoom,zoomMax);}
  }
  paintZoom();
 }
 // With browsers that don't expose hardware zoom, a 3× digital crop is used for photos.
 // During video, recording uses a canvas stream for digital zoom where supported.
 function videoCropRect(){
  const w=video.videoWidth,h=video.videoHeight,ratio=.75;
  if(!w||!h)return null;
  let sw=w,sh=h,sx=0,sy=0;
  if(w/h>ratio){sw=h*ratio;sx=(w-sw)/2}else{sh=w/ratio;sy=(h-sh)/2}
  if(!hardwareZoom){sx+=(sw-sw/zoom)/2;sy+=(sh-sh/zoom)/2;sw/=zoom;sh/=zoom}
  return {sx,sy,sw,sh};
 }
 function stopTracks(){if(stream)for(const track of stream.getTracks())track.stop();stream=null;video.srcObject=null;}
 function stopVideoCanvas(){if(videoCanvasStop){videoCanvasStop();videoCanvasStop=null;}}

 async function start(){
  $('.camera-tone').disabled=mode==='video';video.style.filter=mode==='photo'&&warm?'sepia(.16) saturate(.9) contrast(1.03)':'';
  const myGeneration=++generation;stopTracks();$('.camera-offline').hidden=true;$('.camera-message').textContent='Opening your camera…';count();
  if(!supported()){fallback();return;}
  try{
   let next;
   try{next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1080},height:{ideal:1440},aspectRatio:{ideal:.75}},audio:mode==='video'});}
   catch(e){if(mode==='video'){next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:false});$('.camera-message').textContent='Filming without sound. Allow microphone access for audio.';}else throw e;}
   if(!dialog.open||myGeneration!==generation){next.getTracks().forEach(t=>t.stop());return;}
   stream=next;video.srcObject=stream;await video.play();
   zoom=1;const zr=hardwareRange();hardwareZoom=!!(zr&&Number.isFinite(zr.max)&&zr.max>1&&getTrack()?.applyConstraints);
   zoomMax=hardwareZoom?Math.min(4,zr.max):3;paintZoom();
   if(mode==='photo')$('.camera-message').textContent=getRemaining()===0?'Your roll is full. Thank you for capturing our day.':'One little moment, yours to keep.';
   else if(stream.getAudioTracks().length)$('.camera-message').textContent='Little films, up to 60 seconds.';
  }catch{if(dialog.open&&myGeneration===generation)fallback();}
 }
 function fallback(){$('.camera-offline').hidden=false;$('.camera-message').textContent='You can still capture with your phone’s camera.';$('.camera-shutter').disabled=true;}
 function close(){stopVideoCanvas();digitalRecording=false;if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}clearInterval(interval);clearTimeout(watchdog);generation++;stopTracks();dialog.close();document.body.style.overflow=previousOverflow;previousFocus?.focus?.();$('.camera-shutter').classList.remove('recording');$('.camera-record-time').hidden=true;$('.camera-countdown').hidden=true;}
 async function take(){
  if(!stream||$('.camera-shutter').disabled)return;
  if(mode==='video'){if(recorder?.state==='recording'){recorder.stop();return;}await record();return;}
  $('.camera-shutter').disabled=true;
  try{
   if(timer)for(let i=3;i>0;i--){if(!dialog.open)return;$('.camera-countdown').textContent=i;$('.camera-countdown').hidden=false;await new Promise(r=>setTimeout(r,1000));}
   $('.camera-countdown').hidden=true;if(!dialog.open||!video.videoWidth)return;
   const canvas=document.createElement('canvas');const ratio=.75;let sw=video.videoWidth,sh=video.videoHeight,sx=0,sy=0;
   if(sw/sh>ratio){const cropped=sh*ratio;sx=(sw-cropped)/2;sw=cropped;}else{const cropped=sw/ratio;sy=(sh-cropped)/2;sh=cropped;}
   if(!hardwareZoom && zoom>1){sx+=(sw-sw/zoom)/2;sy+=(sh-sh/zoom)/2;sw/=zoom;sh/=zoom;}
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
   let recordingStream=stream;digitalRecording=false;
   if(!hardwareZoom && typeof HTMLCanvasElement.prototype.captureStream==='function'){
    const c=document.createElement('canvas');c.width=720;c.height=960;
    const ctx=c.getContext('2d');let frameID=0,active=true;
    const draw=()=>{
     if(!active)return;
     const crop=videoCropRect();
     if(crop){ctx.save();if(facing==='user'){ctx.translate(c.width,0);ctx.scale(-1,1)}
       ctx.drawImage(video,crop.sx,crop.sy,crop.sw,crop.sh,0,0,c.width,c.height);ctx.restore();}
     frameID=requestAnimationFrame(draw);
    };
    draw();
    recordingStream=c.captureStream(24);digitalRecording=true;
    for(const t of stream.getAudioTracks())recordingStream.addTrack(t);
    videoCanvasStop=()=>{active=false;cancelAnimationFrame(frameID);recordingStream.getVideoTracks().forEach(t=>t.stop());};
   }else if(!hardwareZoom && zoom>1){
    close();onNative('video');return;
   }
   recorder=new MediaRecorder(recordingStream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:2500000,audioBitsPerSecond:96000});chunks=[];recordStart=Date.now();let size=0;
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
 $('.camera-zoom-out').onclick=()=>setZoom(zoom-.5);
 $('.camera-zoom-in').onclick=()=>setZoom(zoom+.5);
 let pinch=null;
 const distance=ts=>Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY);
 viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){pinch={d:distance(e.touches),zoom};e.preventDefault();}},{passive:false});
 viewport.addEventListener('touchmove',e=>{if(e.touches.length===2){if(!pinch)pinch={d:distance(e.touches),zoom};e.preventDefault();setZoom(pinch.zoom*distance(e.touches)/Math.max(1,pinch.d));}},{passive:false});
 viewport.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{passive:true});
 viewport.addEventListener('touchcancel',()=>pinch=null,{passive:true});
 viewport.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
 viewport.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open&&recorder?.state==='recording')recorder.stop();});
 window.addEventListener('pagehide',stopTracks);
 return {open,close,updateCount:count};
}
