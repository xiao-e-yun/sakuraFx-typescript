import { Vector3, Matrix44, Vec3 } from "./webgl"

import pointVs from "./point.vs?raw" //點花頂點程式
import pointFs from "./point.fs?raw" //點花像素程式

import finalVs from "./final.vs?raw" //最後頂點程式
import finalFs from "./final.fs?raw" //最後像素程式

import commonVs from "./common.vs?raw" //共用頂點程式
import brightbufFs from "./brightbuf.fs?raw" //亮緩衝區像素程式
import dirblurFs from "./dirblur.fs?raw" //模糊像素程式

export default function (canvas: HTMLCanvasElement): (()=>void) | undefined {
  console.debug("[sakura] 分叉 gryng02 的 \"SAKURA\"")
  console.debug("[sakura] TypeScript 版本來自 xiaoeyun")

  try { gl = canvas.getContext("webgl") as WebGLRenderingContext } //創建一個webgl上下文
  catch { return console.error("[sakura] WebGL not supported") as undefined } //如果不支持webgl，則提示錯誤 

  setViewports() //設定視窗大小
  createScene() //創建場景
  initScene() //初始化場景

  timeInfo.start = new Date().getTime() //設定起始時間
  timeInfo.prev = timeInfo.start //設定上一次時間
  return render() as undefined || render //執行並返回渲染函數
}

function render() {
  const curdate = new Date().getTime() //當前時間
  timeInfo.elapsed = (curdate - timeInfo.start) / 1000
  timeInfo.delta = (curdate - timeInfo.prev) / 1000
  timeInfo.prev = curdate
  renderScene()
}

/** 時間資訊 */
const timeInfo = {
  /** 原始日期 */
  "start": 0,
  /** 上次日期 */
  "prev": 0,
  /** 上一次到現在的秒 */
  "delta": 0,
  /** 原始到現在的秒 */
  "elapsed": 0
}

let gl: WebGLRenderingContext
/** 渲染設置 */
type RenderSpec = {
  /** 點大小 */ pointSize:{ min: number, max: number },
  /** 寬度 */ width: number,
  /** 一半寬度 */ halfWidth: number,
  /** 高度 */ height: number,
  /** 一半高度 */
  halfHeight: number,
  /** 長寬比 */
  aspect: number,
  /** [長,寬,長寬比] 向量 */
  array: Float32Array,
  /** [一半長,一半寬,長寬比] 向量 */
  halfArray:Float32Array,
  /** 設置渲染大小 */
  setSize(w:number, h:number):void
} & Record<"mainRT"|"wFullRT0"|"wFullRT1"|"wHalfRT0"|"wHalfRT1",RenderTarget>
const renderSpec = {
  pointSize:{ min: -1, max: -1 },
  /** 寬度 */
  width: 0,
  /** 一半寬度 */
  halfWidth: 0,

  /** 高度 */
  height: 0,
  /** 一半高度 */
  halfHeight: 0,

  /** 長寬比 */
  aspect: 1,
  /** [長,寬,長寬比] 向量 */
  array: new Float32Array(3),
  /** [一半長,一半寬,長寬比] 向量 */
  halfArray: new Float32Array(3),
  /** 設置渲染大小 */
  setSize(w:number, h:number) {
    this.width = w
    this.height = h
    this.aspect = this.width / this.height
    this.array[0] = this.width
    this.array[1] = this.height
    this.array[2] = this.aspect
  
    this.halfWidth = Math.floor(w / 2)
    this.halfHeight = Math.floor(h / 2)
    this.halfArray[0] = this.halfWidth
    this.halfArray[1] = this.halfHeight
    this.halfArray[2] = this.halfWidth / this.halfHeight
  }
} as RenderSpec

/** 編譯渲染器 */
function compileShader(shtype:WebGL2RenderingContext["SHADER_TYPE"], shsrc:string) {
  const retsh = gl.createShader(shtype) as WebGLShader //創建一個渲染器

  gl.shaderSource(retsh, shsrc) //設定渲染器源碼
  gl.compileShader(retsh) //編譯渲染器

  if (gl.getShaderParameter(retsh, gl.COMPILE_STATUS)) return retsh //如果編譯成功，則返回渲染器
  const errlog = gl.getShaderInfoLog(retsh) //如果編譯失敗，則返回錯誤訊息
  gl.deleteShader(retsh) //刪除渲染器
  console.error("[sakura] ",errlog) //顯示錯誤訊息
  return null //如果編譯失敗，則返回null
}

interface Prog extends WebGLProgram {
  uniforms : Record<string, WebGLUniformLocation | null>;
  attributes : Record<string, number>;
}

function createShader(vtxsrc:string, frgsrc:string, uniformlist?:string[], attrlist?:string[]) {
  const vsh = compileShader(gl.VERTEX_SHADER, vtxsrc) //編譯頂點渲染器
  const fsh = compileShader(gl.FRAGMENT_SHADER, frgsrc) //編譯片段渲染器

  if (vsh == null || fsh == null) return null //如果編譯失敗，則返回null

  const prog = gl.createProgram() as Prog //創建一個渲染器程序
  gl.attachShader(prog, vsh) //附加頂點渲染器
  gl.attachShader(prog, fsh) //附加片段渲染器

  gl.deleteShader(vsh) //刪除頂點渲染器
  gl.deleteShader(fsh) //刪除渲染器

  gl.linkProgram(prog) //連結渲染器程序
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { //如果連結失敗，則返回null
    const errlog = gl.getProgramInfoLog(prog) //取得錯誤訊息
    console.error("[sakura] ",errlog) //顯示錯誤訊息
    return null //返回null
  }

  if (uniformlist) { //如果有設定uniform
    prog.uniforms = {} //創建uniform設定
    for (const i in uniformlist)  //對每個uniform
      prog.uniforms[uniformlist[i]] = gl.getUniformLocation(prog, uniformlist[i]) //取得uniform位置
  }

  if (attrlist) {
    prog.attributes = {} //創建attribute設定
    for (const attr of attrlist) //對每個attribute
      prog.attributes[attr] = gl.getAttribLocation(prog, attr) //取得attribute位置
  }

  return prog //返回渲染器程序
}

function useShader(prog:Prog) { //使用渲染器程序
  gl.useProgram(prog) //使用渲染器程序
  for (const attr in prog.attributes) //對每個attribute
    gl.enableVertexAttribArray(prog.attributes[attr]) //啟用attribute
}

function unuseShader(prog:Prog) { //停用渲染器程序
  for (const attr in prog.attributes) //對每個attribute
    gl.disableVertexAttribArray(prog.attributes[attr]) //停用attribute
  gl.useProgram(null) //停用渲染器程序
}

const projection = { //投影矩陣
  "angle": 60, //角度
  "nearfar": new Float32Array([0.1, 100]), //近/遠面
  "matrix": Matrix44.createIdentity() //矩陣
}
const camera = { //攝影機
  "position": Vector3.create(0, 0, 100), //位置
  "lookat": Vector3.create(0, 0, 0), //注視點
  "up": Vector3.create(0, 1, 0), //上方向
  "dof": Vector3.create(10, 4, 8), //焦距
  "matrix": Matrix44.createIdentity() //矩陣
}
const pointFlower = {} as PointFlower //點花
class BlossomParticle { //點花粒子
  /** 速度 */
  velocity: number[]
  /** 旋轉 */
  rotation: number[]
  /** 位置 */
  position: number[]
  /** 角度 */
  euler: number[]
  /** 大小 */
  size: number
  /** 透明度 */
  alpha: number
  /** Z值 */
  zkey: number
  constructor() {
    this.velocity = new Array(3) //速度
    this.rotation = new Array(3) //旋轉
    this.position = new Array(3) //位置
    this.euler = new Array(3) //角度
    this.alpha = 1 //透明度
    this.size = 1 //大小
    this.zkey = 0 //Z值
  }
  /** 設定速度 */
  setVelocity(vx:number, vy:number, vz:number) {
    this.velocity[0] = vx //設定X速度
    this.velocity[1] = vy //設定Y速度
    this.velocity[2] = vz //設定Z速度
  }
  /** 設定旋轉 */
  setRotation(rx:number, ry:number, rz:number) {
    this.rotation[0] = rx //設定X旋轉
    this.rotation[1] = ry //設定Y旋轉
    this.rotation[2] = rz //設定Z旋轉
  }
  /** 設定位置 */
  setPosition(nx:number, ny:number, nz:number) {
    this.position[0] = nx //設定X位置
    this.position[1] = ny //設定Y位置
    this.position[2] = nz //設定Z位置
  }
  /** 設定角度 */
  setEulerAngles(rx:number, ry:number, rz:number) {
    this.euler[0] = rx //設定X角度
    this.euler[1] = ry //設定Y角度
    this.euler[2] = rz //設定Z角度
  }
  /** 設定大小 */
  setSize(s:number) {
    this.size = s //設定大小
  }
  /** 更新 */
  update(dt:number) {
    this.position[0] += this.velocity[0] * dt //更新X位置
    this.position[1] += this.velocity[1] * dt //更新Y位置
    this.position[2] += this.velocity[2] * dt //更新Z位置

    this.euler[0] += this.rotation[0] * dt //更新X角度
    this.euler[1] += this.rotation[1] * dt //更新Y角度
    this.euler[2] += this.rotation[2] * dt //更新Z角度
  }
}
interface PointFlower {
  program: Prog | null;
  offset:Float32Array,
  fader:Vec3,
  numFlowers:number,
  particles:BlossomParticle[],
  dataArray:Float32Array,
  miscArrayOffset: number,
  eulerArrayOffset: number,
  positionArrayOffset: number,
  buffer:WebGLBuffer | null,
  area:Vec3,
}

/** 創建點花 */
function createPointFlowers(): void {
  const prm = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as number[] //取得點花最小/最大大小
  renderSpec.pointSize = { "min": prm[0], "max": prm[1] } //設定最小/最大大小

  pointFlower.program = createShader( //創建程式
    pointVs, pointFs, //頂點/片段程式
    ["uProjection", "uModelview", "uResolution", "uOffset", "uDOF", "uFade"], //變數
    ["aPosition", "aEuler", "aMisc"] //頂點屬性
  )

  
  if(pointFlower.program) useShader(pointFlower.program) //使用程式
  pointFlower.offset = new Float32Array([0, 0, 0]) //設定偏移
  pointFlower.fader = Vector3.create(0, 10, 0) //設定淡出

  //** */
  pointFlower.numFlowers = 300 //設定點花數量
  pointFlower.particles = new Array(pointFlower.numFlowers).fill(undefined) as BlossomParticle[] //創建點花粒子
  pointFlower.dataArray = new Float32Array(pointFlower.numFlowers * (3 + 3 + 2)) //創建點花陣列
  pointFlower.positionArrayOffset = 0 //位置陣列偏移
  pointFlower.eulerArrayOffset = pointFlower.numFlowers * 3 //角度陣列偏移
  pointFlower.miscArrayOffset = pointFlower.numFlowers * 6 //附加陣列偏移

  pointFlower.buffer = gl.createBuffer() //創建緩衝
  gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer) //綁定緩衝
  gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW) //設定緩衝
  gl.bindBuffer(gl.ARRAY_BUFFER, null) //解除綁定

  if(pointFlower.program) unuseShader(pointFlower.program) //解除使用程式

  pointFlower.particles = pointFlower.particles.map(()=>new BlossomParticle())
}

/** 初始化點花 */
function initPointFlowers() {
  //區域
  pointFlower.area = Vector3.create(20, 20, 20) //設定區域
  pointFlower.area.x = pointFlower.area.y * renderSpec.aspect //設定X區域

  const fader = pointFlower.fader as Vec3 //設定淡出
  fader.x = 10 //env fade start
  fader.y = pointFlower.area.z //env fade half
  fader.z = 0.1  //near fade start

  //
  const PI2 = Math.PI * 2
  const tmpv3 = Vector3.create(0, 0, 0) //創建暫存點
  let tmpv = 0 //創建暫存值
  function symmetryrand(){ return (Math.random() * 2 - 1) } //創建隨機值
  for (const tmpprtcl of pointFlower.particles) {
    //速度
    tmpv3.x = symmetryrand() * 0.3 + 0.8
    tmpv3.y = symmetryrand() * 0.2 - 1
    tmpv3.z = symmetryrand() * 0.3 + 0.5
    Vector3.normalize(tmpv3) 
    tmpv = 2 + Math.random() * 1
    tmpprtcl.setVelocity(tmpv3.x * tmpv, tmpv3.y * tmpv, tmpv3.z * tmpv)

    //旋轉
    tmpprtcl.setRotation(
      symmetryrand() * PI2 * 0.5,
      symmetryrand() * PI2 * 0.5,
      symmetryrand() * PI2 * 0.5
    )

    //位置
    tmpprtcl.setPosition(
      symmetryrand() * pointFlower.area.x,
      symmetryrand() * pointFlower.area.y,
      symmetryrand() * pointFlower.area.z
    )

    //角度
    tmpprtcl.setEulerAngles(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )

    //大小
    tmpprtcl.setSize(0.9 + Math.random() * 0.1)
  }
}

/** 渲染點花 */
function renderPointFlowers() {
  const PI2 = Math.PI * 2 //PI2
  function repeatPos(prt:BlossomParticle, cmp:number, limit:number) {
    if (!(Math.abs(prt.position[cmp]) - prt.size * 0.5 > limit)) return //如果沒超出邊界
    prt.position[cmp] += limit * 2 * (prt.position[cmp] > 0 ? -1 : 1) //區域外
  }
  function repeatEuler(prt:BlossomParticle, cmp:number) { //重複角度
    prt.euler[cmp] = prt.euler[cmp] % PI2
    if (prt.euler[cmp] < 0) prt.euler[cmp] += PI2
  }

  for (let i = 0; i < pointFlower.numFlowers; i++) {
    const prtcl = pointFlower.particles[i]
    prtcl.update(timeInfo.delta)
    repeatPos(prtcl, 0, pointFlower.area.x)
    repeatPos(prtcl, 1, pointFlower.area.y)
    repeatPos(prtcl, 2, pointFlower.area.z)
    repeatEuler(prtcl, 0)
    repeatEuler(prtcl, 1)
    repeatEuler(prtcl, 2)

    prtcl.alpha = 1 //(pointFlower.area.z - prtcl.position[2]) * 0.5;

    prtcl.zkey = (camera.matrix[2] * prtcl.position[0]
      + camera.matrix[6] * prtcl.position[1]
      + camera.matrix[10] * prtcl.position[2]
      + camera.matrix[14])
  }

  pointFlower.particles.sort(function (p0, p1) { return p0.zkey - p1.zkey }) //分類

  // 更新資料
  let ipos = pointFlower.positionArrayOffset
  let ieuler = pointFlower.eulerArrayOffset //角度偏移
  let imisc = pointFlower.miscArrayOffset //附加偏移
  for (const prtcl of pointFlower.particles) {
    pointFlower.dataArray[ipos] = prtcl.position[0]
    pointFlower.dataArray[ipos + 1] = prtcl.position[1]
    pointFlower.dataArray[ipos + 2] = prtcl.position[2]
    ipos += 3
    pointFlower.dataArray[ieuler] = prtcl.euler[0]
    pointFlower.dataArray[ieuler + 1] = prtcl.euler[1]
    pointFlower.dataArray[ieuler + 2] = prtcl.euler[2]
    ieuler += 3
    pointFlower.dataArray[imisc] = prtcl.size
    pointFlower.dataArray[imisc + 1] = prtcl.alpha
    imisc += 2
  }

  gl.enable(gl.BLEND) //繪製
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA) //設定混合模式

  const prog = pointFlower.program //設定程式
  if(!prog) return //如果沒有程式

  useShader(prog)

  //設定變量
  gl.uniformMatrix4fv(prog.uniforms.uProjection, false, projection.matrix)
  gl.uniformMatrix4fv(prog.uniforms.uModelview, false, camera.matrix)
  gl.uniform3fv(prog.uniforms.uResolution, renderSpec.array)
  gl.uniform3fv(prog.uniforms.uDOF, Vector3.arrayForm(camera.dof))
  gl.uniform3fv(prog.uniforms.uFade, Vector3.arrayForm(pointFlower.fader))

  //綁定資料
  gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW)

  //設定屬性
  gl.vertexAttribPointer(prog.attributes.aPosition, 3, gl.FLOAT, false, 0, pointFlower.positionArrayOffset * Float32Array.BYTES_PER_ELEMENT)
  gl.vertexAttribPointer(prog.attributes.aEuler, 3, gl.FLOAT, false, 0, pointFlower.eulerArrayOffset * Float32Array.BYTES_PER_ELEMENT)
  gl.vertexAttribPointer(prog.attributes.aMisc, 2, gl.FLOAT, false, 0, pointFlower.miscArrayOffset * Float32Array.BYTES_PER_ELEMENT)

  //增量
  for (let i = 1; i < 2; i++) {
    const zpos = i * -2
    for (const [x,y] of [
      [1,1],
      [1,-1],
      [-1,1],
      [-1,-1]
    ]) {
      pointFlower.offset[0] = pointFlower.area.x * x
      pointFlower.offset[1] = pointFlower.area.y * y
      pointFlower.offset[2] = pointFlower.area.z * zpos
      gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset)
      gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers)
    }
  }

  //主核心
  pointFlower.offset[0] = pointFlower.offset[1] = pointFlower.offset[2] = 0 //設定偏移
  gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset) //設定偏移
  gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers)  //繪製

  gl.bindBuffer(gl.ARRAY_BUFFER, null) //解除綁定
  unuseShader(prog) //解除程式

  gl.enable(gl.DEPTH_TEST) //啟用深度測試
  gl.disable(gl.BLEND) //停用混合
}

// 效果
// 常用工具
type EffectProgram = {
  program: Prog | null;
  buffer: WebGLBuffer | null;
  dataArray: Float32Array;
} | undefined

/** 創建效果程序 */
function createEffectProgram(vtxsrc:string, frgsrc:string, exunifs:string[]|null, exattrs:string[]|null) {
  let attrs = ["aPosition"] //初始化
  let unifs = ["uResolution", "uSrc", "uDelta"] //初始化
  if (exunifs) unifs = unifs.concat(exunifs) //串接
  if (exattrs) attrs = attrs.concat(exattrs) //串接
  
  const dataArray = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1
  ])
  
  const ret = {
    program:createShader(vtxsrc, frgsrc, unifs, attrs) as Prog,
    buffer:gl.createBuffer(),
    dataArray, 
  }
  
  if(!ret.program) return
  useShader(ret.program)
  gl.bindBuffer(gl.ARRAY_BUFFER, ret.buffer)
  gl.bufferData(gl.ARRAY_BUFFER, ret.dataArray, gl.STATIC_DRAW)

  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  unuseShader(ret.program)

  return ret
}

// basic usage
// useEffect(prog, srctex({'texture':texid, 'dtxArray':(f32)[dtx, dty]})); //basic initialize
// gl.uniform**(...); //additional uniforms
// drawEffect()
// unuseEffect(prog)
// TEXTURE0 makes src
type Fxobj = EffectProgram & { program:Prog }
function useEffect(fxobj:Fxobj, srctex:RenderTarget) {
  const prog = fxobj.program
  useShader(prog)
  gl.uniform3fv(prog.uniforms.uResolution, renderSpec.array)

  if (srctex !== null) {
    gl.uniform2fv(prog.uniforms.uDelta, srctex.dtxArray)
    gl.uniform1i(prog.uniforms.uSrc, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, srctex.texture)
  }
}
function drawEffect(fxobj:Fxobj) {
  gl.bindBuffer(gl.ARRAY_BUFFER, fxobj.buffer)
  gl.vertexAttribPointer(fxobj.program.attributes.aPosition, 2, gl.FLOAT, false, 0, 0)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
function unuseEffect(fxobj:Fxobj) {
  unuseShader(fxobj.program)
}

const effectLib = {} as Record<"mkBrightBuf"|"dirBlur"|"finalComp",Fxobj>
function createEffectLib() {
  // make brightpixels buffer
  const mkb = createEffectProgram(commonVs, brightbufFs, null, null)
  if(mkb) effectLib.mkBrightBuf = mkb

  // direction blur
  const db = createEffectProgram(commonVs, dirblurFs, ["uBlurDir"], null)
  if(db) effectLib.dirBlur = db

  //final composite
  const fc = createEffectProgram(finalVs, finalFs, ["uBlurDir"], null)
  if(fc) effectLib.finalComp = fc
}

// post process
function renderPostProcess() {
  gl.disable(gl.DEPTH_TEST)
  function bindRT(rt:RenderTarget) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, rt.frameBuffer)
    gl.viewport(0, 0, rt.width, rt.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }

  //make bright buff
  bindRT(renderSpec.wHalfRT0)
  useEffect(effectLib.mkBrightBuf, renderSpec.mainRT)
  drawEffect(effectLib.mkBrightBuf)
  unuseEffect(effectLib.mkBrightBuf)

  // make bloom
  for (let i = 0; i < 2; i++) {
    const p = 1.5 + 1 * i
    const s = 2 + 1 * i
    bindRT(renderSpec.wHalfRT1)
    useEffect(effectLib.dirBlur, renderSpec.wHalfRT0)
    gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir, p, 0, s, 0)
    drawEffect(effectLib.dirBlur)
    unuseEffect(effectLib.dirBlur)

    bindRT(renderSpec.wHalfRT0)
    useEffect(effectLib.dirBlur, renderSpec.wHalfRT1)
    gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir, 0, p, 0, s)
    drawEffect(effectLib.dirBlur)
    unuseEffect(effectLib.dirBlur)
  }

  //display
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, renderSpec.width, renderSpec.height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  useEffect(effectLib.finalComp, renderSpec.mainRT)
  gl.uniform1i(effectLib.finalComp.program.uniforms.uBloom, 1)
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, renderSpec.wHalfRT0.texture)
  drawEffect(effectLib.finalComp)
  unuseEffect(effectLib.finalComp)

  gl.enable(gl.DEPTH_TEST)
}

/** 創建場景 */
function createScene() {
  createEffectLib() // 創建特效
  createPointFlowers() // 創建粒子
}

/** 初始化場景 */
function initScene() {
  initPointFlowers() // 初始化粒子

  //* camera.position.z = 17.320508;
  camera.position.z = pointFlower.area.z + projection.nearfar[0] // 遠近補正
  projection.angle = Math.atan2(pointFlower.area.y, camera.position.z + pointFlower.area.z) * 180 / Math.PI * 2 // 設定視角
  Matrix44.loadProjection(projection.matrix, renderSpec.aspect, projection.angle, projection.nearfar[0], projection.nearfar[1]) // 設定投影矩陣
}

type RenderTarget = {
  width: number,
  height: number,
  sizeArray: Float32Array,
  dtxArray: Float32Array,
  frameBuffer: WebGLFramebuffer | null,
  renderBuffer: WebGLRenderbuffer | null,
  texture: WebGLTexture | null,
}

/** 渲染場景 */
function renderScene() { 
  Matrix44.loadLookAt(camera.matrix, camera.position, camera.lookat, camera.up) //渲染

  const mainRT = renderSpec.mainRT
  gl.enable(gl.DEPTH_TEST) //開啟深度測試
  gl.bindFramebuffer(gl.FRAMEBUFFER, mainRT.frameBuffer)
  gl.viewport(0, 0, mainRT.width, mainRT.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  renderPointFlowers()
  renderPostProcess()
}

/** 設置視口 */
function setViewports() {
  renderSpec.setSize(gl.canvas.width, gl.canvas.height) // 設置渲染變數

  gl.clearColor(0,0,0,0) // 設置清除顏色
  gl.viewport(0, 0, renderSpec.width, renderSpec.height) // 設置視口
  

  /** 渲染目標 */
  function rtfn(rtname:"mainRT"|"wFullRT0"|"wFullRT1"|"wHalfRT0"|"wHalfRT1", rtw:number, rth:number) {  
    const rt = renderSpec[rtname] // 設置渲染目標
    if (rt) deleteRenderTarget(rt) // 刪除渲染目標
    renderSpec[rtname] = createRenderTarget(rtw, rth) // 建立渲染目標
  }
  rtfn("mainRT", renderSpec.width, renderSpec.height)
  rtfn("wFullRT0", renderSpec.width, renderSpec.height)
  rtfn("wFullRT1", renderSpec.width, renderSpec.height)
  rtfn("wHalfRT0", renderSpec.halfWidth, renderSpec.halfHeight)
  rtfn("wHalfRT1", renderSpec.halfWidth, renderSpec.halfHeight)

  // 創建渲染目標
  function createRenderTarget(w:number, h:number) {
    const ret = {
      width: w,
      height: h,
      sizeArray: new Float32Array([w, h, w / h]),
      dtxArray: new Float32Array([1 / w, 1 / h]),
      frameBuffer: gl.createFramebuffer(),
      renderBuffer: gl.createRenderbuffer(),
      texture: gl.createTexture(),
    }
  
    //設置
    gl.bindTexture(gl.TEXTURE_2D, ret.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  
    gl.bindFramebuffer(gl.FRAMEBUFFER, ret.frameBuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ret.texture, 0)
  
    gl.bindRenderbuffer(gl.RENDERBUFFER, ret.renderBuffer)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, ret.renderBuffer)
  
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  
    return ret // 返回渲染目標
  }

  /** 刪除渲染目標 */
  function deleteRenderTarget(rt:RenderTarget) {
    gl.deleteFramebuffer(rt.frameBuffer)
    gl.deleteRenderbuffer(rt.renderBuffer)
    gl.deleteTexture(rt.texture)
  }
}