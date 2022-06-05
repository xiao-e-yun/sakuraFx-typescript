import './style.scss'
import sakura from "sakurafx-typescript";

//get canvas
const canvas = document.getElementById("sakura") as HTMLCanvasElement

let id = ""
let resizing = setTimeout(render);
window.onresize = ()=>{
  clearTimeout(resizing);
  resizing = setTimeout(render, 100);
}

function render() {
  const curr = id = Math.random().toString(36).substring(7)

  //set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  //initialization and get render
  const render = sakura(canvas) as () => void
  
  if(render) {
    //creat animation callback
    function callback(){
      if(id !== curr) return
      render() //render
      requestAnimationFrame(callback) //call self in next frame
    }
  
    callback()
  }
}