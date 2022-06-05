var U=Object.defineProperty;var O=(e,t,o)=>t in e?U(e,t,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[t]=o;var y=(e,t,o)=>(O(e,typeof t!="symbol"?t+"":t,o),o);const L=function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))l(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const s of n.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&l(s)}).observe(document,{childList:!0,subtree:!0});function o(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerpolicy&&(n.referrerPolicy=i.referrerpolicy),i.crossorigin==="use-credentials"?n.credentials="include":i.crossorigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function l(i){if(i.ep)return;i.ep=!0;const n=o(i);fetch(i.href,n)}};L();var m={create(e,t,o){return{x:e,y:t,z:o}},dot:(e,t)=>e.x*t.x+e.y*t.y+e.z*t.z,cross(e,t,o){e.x=t.y*o.z-t.z*o.y,e.y=t.z*o.x-t.x*o.z,e.z=t.x*o.y-t.y*o.x},normalize(e){let t=e.x*e.x+e.y*e.y+e.z*e.z;t<=1e-5||(t=1/Math.sqrt(t),e.x*=t,e.y*=t,e.z*=t)},arrayForm(e){return e.array?e.array=[e.x,e.y,e.z]:e.array=new Float32Array([e.x,e.y,e.z]),e.array}},A={createIdentity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),loadProjection(e,t,o,l,i){let n=l*Math.tan(o*Math.PI/180*.5)*2,s=n*t;e[0]=2*l/s,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=2*l/n,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=-(i+l)/(i-l),e[11]=-1,e[12]=0,e[13]=0,e[14]=-2*i*l/(i-l),e[15]=0},loadLookAt(e,t,o,l){let i=m.create(t.x-o.x,t.y-o.y,t.z-o.z);m.normalize(i);let n=m.create(1,0,0);m.cross(n,l,i),m.normalize(n);let s=m.create(1,0,0);m.cross(s,i,n),m.normalize(s),e[0]=n.x,e[1]=s.x,e[2]=i.x,e[3]=0,e[4]=n.y,e[5]=s.y,e[6]=i.y,e[7]=0,e[8]=n.z,e[9]=s.z,e[10]=i.z,e[11]=0,e[12]=-(t.x*e[0]+t.y*e[4]+t.z*e[8]),e[13]=-(t.x*e[1]+t.y*e[5]+t.z*e[9]),e[14]=-(t.x*e[2]+t.y*e[6]+t.z*e[10]),e[15]=1}},I=`uniform mat4 uProjection;
uniform mat4 uModelview;
uniform vec3 uResolution;
uniform vec3 uOffset;
uniform vec3 uDOF;  //x:focus distance, y:focus radius, z:max radius
uniform vec3 uFade; //x:start distance, y:half distance, z:near fade start

attribute vec3 aPosition;
attribute vec3 aEuler;
attribute vec2 aMisc; //x:size, y:fade

varying vec3 pposition;
varying float psize;
varying float palpha;
varying float pdist;

//varying mat3 rotMat;
varying vec3 normX;
varying vec3 normY;
varying vec3 normZ;
varying vec3 normal;

varying float diffuse;
varying float specular;
varying float rstop;
varying float distancefade;

void main(void) {
    // Projection is based on vertical angle
    vec4 pos = uModelview * vec4(aPosition + uOffset, 1.0);
    gl_Position = uProjection * pos;
    gl_PointSize = aMisc.x * uProjection[1][1] / -pos.z * uResolution.y * 0.5;
    
    pposition = pos.xyz;
    psize = aMisc.x;
    pdist = length(pos.xyz);
    palpha = smoothstep(0.0, 1.0, (pdist - 0.1) / uFade.z);
    
    vec3 elrsn = sin(aEuler);
    vec3 elrcs = cos(aEuler);
    mat3 rotx = mat3(
        1.0, 0.0, 0.0,
        0.0, elrcs.x, elrsn.x,
        0.0, -elrsn.x, elrcs.x
    );
    mat3 roty = mat3(
        elrcs.y, 0.0, -elrsn.y,
        0.0, 1.0, 0.0,
        elrsn.y, 0.0, elrcs.y
    );
    mat3 rotz = mat3(
        elrcs.z, elrsn.z, 0.0, 
        -elrsn.z, elrcs.z, 0.0,
        0.0, 0.0, 1.0
    );
    mat3 rotmat = rotx * roty * rotz;
    normal = rotmat[2];
    
    mat3 trrotm = mat3(
        rotmat[0][0], rotmat[1][0], rotmat[2][0],
        rotmat[0][1], rotmat[1][1], rotmat[2][1],
        rotmat[0][2], rotmat[1][2], rotmat[2][2]
    );
    normX = trrotm[0];
    normY = trrotm[1];
    normZ = trrotm[2];
    
    const vec3 lit = vec3(0.6917144638660746, 0.6917144638660746, -0.20751433915982237);
    
    float tmpdfs = dot(lit, normal);
    if(tmpdfs < 0.0) {
        normal = -normal;
        tmpdfs = dot(lit, normal);
    }
    diffuse = 0.4 + tmpdfs;
    
    vec3 eyev = normalize(-pos.xyz);
    if(dot(eyev, normal) > 0.0) {
        vec3 hv = normalize(eyev + lit);
        specular = pow(max(dot(hv, normal), 0.0), 20.0);
    }
    else {
        specular = 0.0;
    }
    
    rstop = clamp((abs(pdist - uDOF.x) - uDOF.y) / uDOF.z, 0.0, 1.0);
    rstop = pow(rstop, 0.5);
    //-0.69315 = ln(0.5)
    distancefade = min(1.0, exp((uFade.x - pdist) * 0.69315 / uFade.y));
}`,N=`#ifdef GL_ES
//precision mediump float;
precision lowp float;
#endif

const vec3 fadeCol = vec3(0.08, 0.03, 0.06);

varying float palpha;

//varying mat3 rotMat;
varying vec3 normX;
varying vec3 normY;
varying vec3 normZ;

varying float diffuse;
varying float specular;
varying float rstop;
varying float distancefade;

float ellipse(vec2 p, vec2 o, vec2 r) {
    vec2 lp = (p - o) / r;
    return length(lp) - 1.0;
}

void main(void) {
    vec3 p = vec3(gl_PointCoord - vec2(0.5, 0.5), 0.0) * 2.0;
    vec3 d = vec3(0.0, 0.0, -1.0);
    float nd = normZ.z; //dot(-normZ, d);
    if(abs(nd) < 0.0001) discard;
    
    float np = dot(normZ, p);
    vec3 tp = p + d * np / nd;
    vec2 coord = vec2(dot(normX, tp), dot(normY, tp));
    
    //angle = 15 degree
    const float flwrsn = 0.258819045102521;
    const float flwrcs = 0.965925826289068;
    mat2 flwrm = mat2(flwrcs, -flwrsn, flwrsn, flwrcs);
    vec2 flwrp = vec2(abs(coord.x), coord.y) * flwrm;
    
    float r;
    if(flwrp.x < 0.0) {
        r = ellipse(flwrp, vec2(0.065, 0.024) * 0.5, vec2(0.36, 0.96) * 0.5);
    }
    else {
        r = ellipse(flwrp, vec2(0.065, 0.024) * 0.5, vec2(0.58, 0.96) * 0.5);
    }
    
    if(r > rstop) discard;
    
    vec3 col = mix(vec3(1.0, 0.8, 0.75), vec3(1.0, 0.9, 0.87), r);
    float grady = mix(0.0, 1.0, pow(coord.y * 0.5 + 0.5, 0.35));
    col *= vec3(1.0, grady, grady);
    col *= mix(0.8, 1.0, pow(abs(coord.x), 0.3));
    col = col * diffuse + specular;
    
    col = mix(fadeCol, col, distancefade);
    
    float alpha = (rstop > 0.001)? (0.5 - r / (rstop * 2.0)) : 1.0;
    alpha = smoothstep(0.0, 1.0, alpha) * palpha;
    
    gl_FragColor = vec4(col * 0.5, alpha * 0.4);
}`,H=`uniform vec3 uResolution;
attribute vec2 aPosition;
varying vec2 texCoord;
varying vec2 screenCoord;
void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    texCoord = aPosition.xy * 0.5 + vec2(0.5, 0.5);
    screenCoord = aPosition.xy * vec2(uResolution.z, 1.0);
}`,k=`#ifdef GL_ES
//precision mediump float;
precision lowp float;
#endif
uniform sampler2D uSrc;
uniform sampler2D uBloom;
varying vec2 texCoord;
void main(void) {
    vec4 srccol = texture2D(uSrc, texCoord) * 2.0;
    vec4 bloomcol = texture2D(uBloom, texCoord);
    vec4 col;
    col = srccol + bloomcol * (vec4(1.0) + srccol);
    col *= smoothstep(1.0, 0.0, pow(length((texCoord - vec2(0.5)) * 2.0), 1.2) * 0.5);
    col = pow(col, vec4(0.45454545454545)); //(1.0 / 2.2)
    
    gl_FragColor = vec4(col.rgb, 0);
}`,B=`uniform vec3 uResolution;
attribute vec2 aPosition;

varying vec2 texCoord;
varying vec2 screenCoord;

void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    texCoord = aPosition.xy * 0.5 + vec2(0.5, 0.5);
    screenCoord = aPosition.xy * vec2(uResolution.z, 1.0);
}`,X=`#ifdef GL_ES
//precision mediump float;
precision lowp float;
#endif
uniform sampler2D uSrc;
varying vec2 texCoord;

void main(void) {
    vec4 col = texture2D(uSrc, texCoord);
    gl_FragColor = vec4(col.rgb * 2.0 - vec3(0.5), 1.0);
}`,Y=`#ifdef GL_ES
//precision mediump float;
precision lowp float;
#endif
uniform sampler2D uSrc;
uniform vec2 uDelta;
uniform vec4 uBlurDir; //dir(x, y), stride(z, w)

varying vec2 texCoord;

void main(void) {
    vec4 col = texture2D(uSrc, texCoord);
    col = col + texture2D(uSrc, texCoord + uBlurDir.xy * uDelta);
    col = col + texture2D(uSrc, texCoord - uBlurDir.xy * uDelta);
    col = col + texture2D(uSrc, texCoord + (uBlurDir.xy + uBlurDir.zw) * uDelta);
    col = col + texture2D(uSrc, texCoord - (uBlurDir.xy + uBlurDir.zw) * uDelta);
    gl_FragColor = col / 5.0;
}`;function G(e){console.debug('[sakura] \u5206\u53C9 gryng02 \u7684 "SAKURA"'),console.debug("[sakura] TypeScript \u7248\u672C\u4F86\u81EA xiaoeyun");try{r=e.getContext("webgl")}catch{return console.error("[sakura] WebGL not supported")}return rr(),J(),Q(),h.start=new Date().getTime(),h.prev=h.start,_()||_}function _(){let e=new Date().getTime();h.elapsed=(e-h.start)/1e3,h.delta=(e-h.prev)/1e3,h.prev=e,$()}var h={start:0,prev:0,delta:0,elapsed:0},r,f={pointSize:{min:-1,max:-1},width:0,halfWidth:0,height:0,halfHeight:0,aspect:1,array:new Float32Array(3),halfArray:new Float32Array(3),setSize(e,t){this.width=e,this.height=t,this.aspect=this.width/this.height,this.array[0]=this.width,this.array[1]=this.height,this.array[2]=this.aspect,this.halfWidth=Math.floor(e/2),this.halfHeight=Math.floor(t/2),this.halfArray[0]=this.halfWidth,this.halfArray[1]=this.halfHeight,this.halfArray[2]=this.halfWidth/this.halfHeight}};function z(e,t){let o=r.createShader(e);if(r.shaderSource(o,t),r.compileShader(o),r.getShaderParameter(o,r.COMPILE_STATUS))return o;let l=r.getShaderInfoLog(o);return r.deleteShader(o),console.error("[sakura] ",l),null}function S(e,t,o,l){let i=z(r.VERTEX_SHADER,e),n=z(r.FRAGMENT_SHADER,t);if(i==null||n==null)return null;let s=r.createProgram();if(r.attachShader(s,i),r.attachShader(s,n),r.deleteShader(i),r.deleteShader(n),r.linkProgram(s),!r.getProgramParameter(s,r.LINK_STATUS)){let u=r.getProgramInfoLog(s);return console.error("[sakura] ",u),null}if(o){s.uniforms={};for(let u in o)s.uniforms[o[u]]=r.getUniformLocation(s,o[u])}if(l){s.attributes={};for(let u of l)s.attributes[u]=r.getAttribLocation(s,u)}return s}function F(e){r.useProgram(e);for(let t in e.attributes)r.enableVertexAttribArray(e.attributes[t])}function T(e){for(let t in e.attributes)r.disableVertexAttribArray(e.attributes[t]);r.useProgram(null)}var v={angle:60,nearfar:new Float32Array([.1,100]),matrix:A.createIdentity()},p={position:m.create(0,0,100),lookat:m.create(0,0,0),up:m.create(0,1,0),dof:m.create(10,4,8),matrix:A.createIdentity()},a={},W=class{constructor(){y(this,"velocity");y(this,"rotation");y(this,"position");y(this,"euler");y(this,"size");y(this,"alpha");y(this,"zkey");this.velocity=new Array(3),this.rotation=new Array(3),this.position=new Array(3),this.euler=new Array(3),this.alpha=1,this.size=1,this.zkey=0}setVelocity(e,t,o){this.velocity[0]=e,this.velocity[1]=t,this.velocity[2]=o}setRotation(e,t,o){this.rotation[0]=e,this.rotation[1]=t,this.rotation[2]=o}setPosition(e,t,o){this.position[0]=e,this.position[1]=t,this.position[2]=o}setEulerAngles(e,t,o){this.euler[0]=e,this.euler[1]=t,this.euler[2]=o}setSize(e){this.size=e}update(e){this.position[0]+=this.velocity[0]*e,this.position[1]+=this.velocity[1]*e,this.position[2]+=this.velocity[2]*e,this.euler[0]+=this.rotation[0]*e,this.euler[1]+=this.rotation[1]*e,this.euler[2]+=this.rotation[2]*e}};function j(){let e=r.getParameter(r.ALIASED_POINT_SIZE_RANGE);f.pointSize={min:e[0],max:e[1]},a.program=S(I,N,["uProjection","uModelview","uResolution","uOffset","uDOF","uFade"],["aPosition","aEuler","aMisc"]),a.program&&F(a.program),a.offset=new Float32Array([0,0,0]),a.fader=m.create(0,10,0),a.numFlowers=300,a.particles=new Array(a.numFlowers).fill(void 0),a.dataArray=new Float32Array(a.numFlowers*(3+3+2)),a.positionArrayOffset=0,a.eulerArrayOffset=a.numFlowers*3,a.miscArrayOffset=a.numFlowers*6,a.buffer=r.createBuffer(),r.bindBuffer(r.ARRAY_BUFFER,a.buffer),r.bufferData(r.ARRAY_BUFFER,a.dataArray,r.DYNAMIC_DRAW),r.bindBuffer(r.ARRAY_BUFFER,null),a.program&&T(a.program),a.particles=a.particles.map(()=>new W)}function Z(){a.area=m.create(20,20,20),a.area.x=a.area.y*f.aspect;let e=a.fader;e.x=10,e.y=a.area.z,e.z=.1;let t=Math.PI*2,o=m.create(0,0,0),l=0;function i(){return Math.random()*2-1}for(let n of a.particles)o.x=i()*.3+.8,o.y=i()*.2-1,o.z=i()*.3+.5,m.normalize(o),l=2+Math.random()*1,n.setVelocity(o.x*l,o.y*l,o.z*l),n.setRotation(i()*t*.5,i()*t*.5,i()*t*.5),n.setPosition(i()*a.area.x,i()*a.area.y,i()*a.area.z),n.setEulerAngles(Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2),n.setSize(.9+Math.random()*.1)}function V(){let e=Math.PI*2;function t(u,c,E){Math.abs(u.position[c])-u.size*.5>E&&(u.position[c]+=E*2*(u.position[c]>0?-1:1))}function o(u,c){u.euler[c]=u.euler[c]%e,u.euler[c]<0&&(u.euler[c]+=e)}for(let u=0;u<a.numFlowers;u++){let c=a.particles[u];c.update(h.delta),t(c,0,a.area.x),t(c,1,a.area.y),t(c,2,a.area.z),o(c,0),o(c,1),o(c,2),c.alpha=1,c.zkey=p.matrix[2]*c.position[0]+p.matrix[6]*c.position[1]+p.matrix[10]*c.position[2]+p.matrix[14]}a.particles.sort(function(u,c){return u.zkey-c.zkey});let l=a.positionArrayOffset,i=a.eulerArrayOffset,n=a.miscArrayOffset;for(let u of a.particles)a.dataArray[l]=u.position[0],a.dataArray[l+1]=u.position[1],a.dataArray[l+2]=u.position[2],l+=3,a.dataArray[i]=u.euler[0],a.dataArray[i+1]=u.euler[1],a.dataArray[i+2]=u.euler[2],i+=3,a.dataArray[n]=u.size,a.dataArray[n+1]=u.alpha,n+=2;r.enable(r.BLEND),r.blendFunc(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA);let s=a.program;if(s){F(s),r.uniformMatrix4fv(s.uniforms.uProjection,!1,v.matrix),r.uniformMatrix4fv(s.uniforms.uModelview,!1,p.matrix),r.uniform3fv(s.uniforms.uResolution,f.array),r.uniform3fv(s.uniforms.uDOF,m.arrayForm(p.dof)),r.uniform3fv(s.uniforms.uFade,m.arrayForm(a.fader)),r.bindBuffer(r.ARRAY_BUFFER,a.buffer),r.bufferData(r.ARRAY_BUFFER,a.dataArray,r.DYNAMIC_DRAW),r.vertexAttribPointer(s.attributes.aPosition,3,r.FLOAT,!1,0,a.positionArrayOffset*Float32Array.BYTES_PER_ELEMENT),r.vertexAttribPointer(s.attributes.aEuler,3,r.FLOAT,!1,0,a.eulerArrayOffset*Float32Array.BYTES_PER_ELEMENT),r.vertexAttribPointer(s.attributes.aMisc,2,r.FLOAT,!1,0,a.miscArrayOffset*Float32Array.BYTES_PER_ELEMENT);for(let u=1;u<2;u++){let c=u*-2;for(let[E,C]of[[1,1],[1,-1],[-1,1],[-1,-1]])a.offset[0]=a.area.x*E,a.offset[1]=a.area.y*C,a.offset[2]=a.area.z*c,r.uniform3fv(s.uniforms.uOffset,a.offset),r.drawArrays(r.POINTS,0,a.numFlowers)}a.offset[0]=a.offset[1]=a.offset[2]=0,r.uniform3fv(s.uniforms.uOffset,a.offset),r.drawArrays(r.POINTS,0,a.numFlowers),r.bindBuffer(r.ARRAY_BUFFER,null),T(s),r.enable(r.DEPTH_TEST),r.disable(r.BLEND)}}function w(e,t,o,l){let i=["aPosition"],n=["uResolution","uSrc","uDelta"];o&&(n=n.concat(o)),l&&(i=i.concat(l));let s=new Float32Array([-1,-1,1,-1,-1,1,1,1]),u={program:S(e,t,n,i),buffer:r.createBuffer(),dataArray:s};if(u.program)return F(u.program),r.bindBuffer(r.ARRAY_BUFFER,u.buffer),r.bufferData(r.ARRAY_BUFFER,u.dataArray,r.STATIC_DRAW),r.bindBuffer(r.ARRAY_BUFFER,null),T(u.program),u}function R(e,t){let o=e.program;F(o),r.uniform3fv(o.uniforms.uResolution,f.array),t!==null&&(r.uniform2fv(o.uniforms.uDelta,t.dtxArray),r.uniform1i(o.uniforms.uSrc,0),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,t.texture))}function g(e){r.bindBuffer(r.ARRAY_BUFFER,e.buffer),r.vertexAttribPointer(e.program.attributes.aPosition,2,r.FLOAT,!1,0,0),r.drawArrays(r.TRIANGLE_STRIP,0,4)}function x(e){T(e.program)}var d={};function q(){let e=w(B,X,null,null);e&&(d.mkBrightBuf=e);let t=w(B,Y,["uBlurDir"],null);t&&(d.dirBlur=t);let o=w(H,k,["uBlurDir"],null);o&&(d.finalComp=o)}function K(){r.disable(r.DEPTH_TEST);function e(t){r.bindFramebuffer(r.FRAMEBUFFER,t.frameBuffer),r.viewport(0,0,t.width,t.height),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT|r.DEPTH_BUFFER_BIT)}e(f.wHalfRT0),R(d.mkBrightBuf,f.mainRT),g(d.mkBrightBuf),x(d.mkBrightBuf);for(let t=0;t<2;t++){let o=1.5+1*t,l=2+1*t;e(f.wHalfRT1),R(d.dirBlur,f.wHalfRT0),r.uniform4f(d.dirBlur.program.uniforms.uBlurDir,o,0,l,0),g(d.dirBlur),x(d.dirBlur),e(f.wHalfRT0),R(d.dirBlur,f.wHalfRT1),r.uniform4f(d.dirBlur.program.uniforms.uBlurDir,0,o,0,l),g(d.dirBlur),x(d.dirBlur)}r.bindFramebuffer(r.FRAMEBUFFER,null),r.viewport(0,0,f.width,f.height),r.clear(r.COLOR_BUFFER_BIT|r.DEPTH_BUFFER_BIT),R(d.finalComp,f.mainRT),r.uniform1i(d.finalComp.program.uniforms.uBloom,1),r.activeTexture(r.TEXTURE1),r.bindTexture(r.TEXTURE_2D,f.wHalfRT0.texture),g(d.finalComp),x(d.finalComp),r.enable(r.DEPTH_TEST)}function J(){q(),j()}function Q(){Z(),p.position.z=a.area.z+v.nearfar[0],v.angle=Math.atan2(a.area.y,p.position.z+a.area.z)*180/Math.PI*2,A.loadProjection(v.matrix,f.aspect,v.angle,v.nearfar[0],v.nearfar[1])}function $(){A.loadLookAt(p.matrix,p.position,p.lookat,p.up);let e=f.mainRT;r.enable(r.DEPTH_TEST),r.bindFramebuffer(r.FRAMEBUFFER,e.frameBuffer),r.viewport(0,0,e.width,e.height),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT|r.DEPTH_BUFFER_BIT),V(),K()}function rr(){f.setSize(r.canvas.width,r.canvas.height),r.clearColor(0,0,0,0),r.viewport(0,0,f.width,f.height);function e(l,i,n){let s=f[l];s&&o(s),f[l]=t(i,n)}e("mainRT",f.width,f.height),e("wFullRT0",f.width,f.height),e("wFullRT1",f.width,f.height),e("wHalfRT0",f.halfWidth,f.halfHeight),e("wHalfRT1",f.halfWidth,f.halfHeight);function t(l,i){let n={width:l,height:i,sizeArray:new Float32Array([l,i,l/i]),dtxArray:new Float32Array([1/l,1/i]),frameBuffer:r.createFramebuffer(),renderBuffer:r.createRenderbuffer(),texture:r.createTexture()};return r.bindTexture(r.TEXTURE_2D,n.texture),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,l,i,0,r.RGBA,r.UNSIGNED_BYTE,null),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.bindFramebuffer(r.FRAMEBUFFER,n.frameBuffer),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,n.texture,0),r.bindRenderbuffer(r.RENDERBUFFER,n.renderBuffer),r.renderbufferStorage(r.RENDERBUFFER,r.DEPTH_COMPONENT16,l,i),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.RENDERBUFFER,n.renderBuffer),r.bindTexture(r.TEXTURE_2D,null),r.bindRenderbuffer(r.RENDERBUFFER,null),r.bindFramebuffer(r.FRAMEBUFFER,null),n}function o(l){r.deleteFramebuffer(l.frameBuffer),r.deleteRenderbuffer(l.renderBuffer),r.deleteTexture(l.texture)}}const b=document.getElementById("sakura");let D="",P=setTimeout(M);window.onresize=()=>{clearTimeout(P),P=setTimeout(M,100)};function M(){const e=D=Math.random().toString(36).substring(7);b.width=window.innerWidth,b.height=window.innerHeight;const t=G(b);if(t){let o=function(){D===e&&(t(),requestAnimationFrame(o))};o()}}
