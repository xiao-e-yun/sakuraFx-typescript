# sakuraFx-typescript
Animation based on WebGL.

It is [Sakura](https://codepen.io/wikyware-net/details/poRgJge) for TypeScript version.  
fork from [gryng02](https://qiita.com/gryng02)

Install `pnpm add -D sakurafx-typescript`

In html

    <canvas id="sakura"></canvas>
 
In TypeScript

    //import
    import sakura from "sakurafx-typescript";
    
    //get canvas
    const canvas = document.getElementById("sakura")
    
    //set canvas size
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
