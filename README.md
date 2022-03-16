# sakuraFx-typescript
It is [Sakura](https://codepen.io/wikyware-net/details/poRgJge) for TypeScript version.  
fork from [gryng02](https://qiita.com/gryng02)

In html

    <canvas id="sakura"></canvas>
 
In TypeScript

    //import
    import sakura from ./sakura;
    
    //get canvas
    const canvas = document.getElementById("sakura")
    //initialization and get render
    const render = sakura(canvas)
    
    //creat animation callback
    function callback(){
      render() //render
      requestAnimationFrame(callback) //call self in next frame
    }
    callback()
