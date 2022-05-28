#ifdef GL_ES
//precision mediump float;
precision lowp float;
#endif
uniform sampler2D uSrc;
varying vec2 texCoord;

void main(void) {
    vec4 col = texture2D(uSrc, texCoord);
    gl_FragColor = vec4(col.rgb * 2.0 - vec3(0.5), 1.0);
}