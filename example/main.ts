import "./style.css";
import sakura from "sakurafx-typescript";

//get canvas
const canvas = document.getElementById("sakura") as HTMLCanvasElement;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//initialization and get render
const render = sakura(canvas)

//creat animation callback
function callback(){
  render() //render
  requestAnimationFrame(callback) //call self in next frame
}
callback()